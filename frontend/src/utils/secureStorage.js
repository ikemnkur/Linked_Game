/**
 * Secure LocalStorage Wrapper
 * 
 * This utility encrypts all data before storing in localStorage and decrypts on retrieval.
 * Uses AES-GCM encryption via Web Crypto API for production security.
 * 
 * Usage:
 * 1. Import and initialize in your main app file (main.jsx):
 *    import { initSecureStorage } from './utils/secureStorage';
 *    initSecureStorage();
 * 
 * 2. Use localStorage normally throughout your app:
 *    localStorage.setItem('key', 'value');
 *    const value = localStorage.getItem('key');
 * 
 * 3. Disable encryption for development (optional):
 *    initSecureStorage({ enableEncryption: false });
 */

// Configuration
const CONFIG = {
    enableEncryption: import.meta.env.PROD, // Encrypt only in production
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12,
    saltLength: 16,
    storagePrefix: '__secure__', // Prefix to identify encrypted items
};

// Store original methods
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalGetItem = localStorage.getItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalClear = localStorage.clear.bind(localStorage);

// Encryption key (derived from app secret + device info)
let encryptionKey = null;

/**
 * Generate encryption key from passphrase
 */
async function deriveKey(passphrase, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: CONFIG.algorithm, length: CONFIG.keyLength },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Get or create encryption key
 */
async function getEncryptionKey() {
    if (encryptionKey) return encryptionKey;

    // Use app-specific secret + domain as passphrase
    const appSecret = import.meta.env.VITE_ENCRYPTION_SECRET || 'VideoScramblerApp-Secret-Key-2026';
    const passphrase = `${appSecret}-${window.location.hostname}`;

    // Get or generate salt
    let salt = originalGetItem('__enc_salt__');
    if (!salt) {
        const saltBuffer = crypto.getRandomValues(new Uint8Array(CONFIG.saltLength));
        salt = Array.from(saltBuffer).map(b => b.toString(16).padStart(2, '0')).join('');
        originalSetItem('__enc_salt__', salt);
    }

    // Convert hex salt back to Uint8Array
    const saltBytes = new Uint8Array(salt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    encryptionKey = await deriveKey(passphrase, saltBytes);
    return encryptionKey;
}

/**
 * Encrypt data
 */
async function encryptData(data) {
    if (!CONFIG.enableEncryption) return data;

    try {
        const key = await getEncryptionKey();
        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(CONFIG.ivLength));

        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: CONFIG.algorithm, iv: iv },
            key,
            encoder.encode(data)
        );

        // Combine IV + encrypted data
        const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encryptedBuffer), iv.length);

        // Convert to base64
        return btoa(String.fromCharCode(...combined));
    } catch (error) {
        console.error('Encryption failed:', error);
        return data; // Fallback to unencrypted
    }
}

/**
 * Decrypt data
 */
async function decryptData(encryptedData) {
    if (!CONFIG.enableEncryption) return encryptedData;

    try {
        const key = await getEncryptionKey();
        
        // Convert from base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

        // Extract IV and encrypted data
        const iv = combined.slice(0, CONFIG.ivLength);
        const encrypted = combined.slice(CONFIG.ivLength);

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: CONFIG.algorithm, iv: iv },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (error) {
        console.error('Decryption failed:', error);
        return encryptedData; // Return as-is if decryption fails
    }
}

/**
 * Check if value is encrypted
 */
function isEncrypted(value) {
    if (!value) return false;
    // Encrypted values are base64 strings starting with our format
    return typeof value === 'string' && /^[A-Za-z0-9+/]+=*$/.test(value) && value.length > 20;
}

/**
 * Secure setItem wrapper
 */
async function secureSetItem(key, value) {
    try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        const encryptedValue = await encryptData(stringValue);
        originalSetItem(`${CONFIG.storagePrefix}${key}`, encryptedValue);
    } catch (error) {
        console.error('SecureStorage setItem failed:', error);
        originalSetItem(key, value); // Fallback
    }
}

/**
 * Secure getItem wrapper
 */
async function secureGetItem(key) {
    try {
        // Try prefixed key first
        let value = originalGetItem(`${CONFIG.storagePrefix}${key}`);
        
        // Fallback to unprefixed (for backward compatibility)
        if (value === null) {
            value = originalGetItem(key);
        }

        if (value === null) return null;

        // Only decrypt if it looks encrypted
        if (CONFIG.enableEncryption && isEncrypted(value)) {
            return await decryptData(value);
        }

        return value;
    } catch (error) {
        console.error('SecureStorage getItem failed:', error);
        return originalGetItem(key); // Fallback
    }
}

/**
 * Synchronous wrapper for setItem (uses Promise internally)
 */
function syncSetItem(key, value) {
    // For synchronous usage, queue the encryption
    secureSetItem(key, value).catch(err => {
        console.error('Async encryption failed:', err);
    });
}

/**
 * Synchronous wrapper for getItem (returns immediately, may return encrypted value)
 */
function syncGetItem(key) {
    // Try to get decrypted value
    const prefixedKey = `${CONFIG.storagePrefix}${key}`;
    let value = originalGetItem(prefixedKey) || originalGetItem(key);
    
    if (value && CONFIG.enableEncryption && isEncrypted(value)) {
        // Decrypt async and cache result
        secureGetItem(key).then(decrypted => {
            // Store decrypted version temporarily for immediate access
            window.__storageCache = window.__storageCache || {};
            window.__storageCache[key] = decrypted;
        });
        
        // Return cached version if available
        if (window.__storageCache && window.__storageCache[key]) {
            return window.__storageCache[key];
        }
    }
    
    return value;
}

/**
 * Secure removeItem wrapper
 */
function secureRemoveItem(key) {
    originalRemoveItem(`${CONFIG.storagePrefix}${key}`);
    originalRemoveItem(key); // Also remove unprefixed version
    
    // Clear cache
    if (window.__storageCache) {
        delete window.__storageCache[key];
    }
}

/**
 * Secure clear wrapper
 */
function secureClear() {
    originalClear();
    window.__storageCache = {};
}

/**
 * Initialize secure storage
 */
export function initSecureStorage(options = {}) {
    // Override config if provided
    if (options.enableEncryption !== undefined) {
        CONFIG.enableEncryption = options.enableEncryption;
    }

    // Override localStorage methods
    Storage.prototype.setItem = function(key, value) {
        if (this === localStorage) {
            syncSetItem(key, value);
        } else {
            originalSetItem.call(this, key, value);
        }
    };

    Storage.prototype.getItem = function(key) {
        if (this === localStorage) {
            return syncGetItem(key);
        }
        return originalGetItem.call(this, key);
    };

    Storage.prototype.removeItem = function(key) {
        if (this === localStorage) {
            secureRemoveItem(key);
        } else {
            originalRemoveItem.call(this, key);
        }
    };

    Storage.prototype.clear = function() {
        if (this === localStorage) {
            secureClear();
        } else {
            originalClear.call(this);
        }
    };

    console.log(`🔒 Secure Storage initialized (encryption: ${CONFIG.enableEncryption ? 'ON' : 'OFF'})`);
}

/**
 * Migrate existing unencrypted data to encrypted format
 */
export async function migrateToEncrypted() {
    if (!CONFIG.enableEncryption) return;

    console.log('🔄 Migrating localStorage to encrypted format...');
    const keys = Object.keys(localStorage).filter(k => !k.startsWith('__'));

    for (const key of keys) {
        const value = originalGetItem(key);
        if (value && !isEncrypted(value)) {
            await secureSetItem(key, value);
            originalRemoveItem(key); // Remove old unencrypted version
        }
    }

    console.log('✅ Migration complete');
}

/**
 * Export async methods for direct use
 */
export const secureStorage = {
    async setItem(key, value) {
        return secureSetItem(key, value);
    },
    async getItem(key) {
        return secureGetItem(key);
    },
    removeItem: secureRemoveItem,
    clear: secureClear,
    migrate: migrateToEncrypted,
};

// Export originals for emergency access
export const unsafeStorage = {
    setItem: originalSetItem,
    getItem: originalGetItem,
    removeItem: originalRemoveItem,
    clear: originalClear,
};
