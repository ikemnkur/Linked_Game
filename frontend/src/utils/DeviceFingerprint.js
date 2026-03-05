/**
 * DeviceFingerprint.js - Device and Browser Fingerprinting Utility
 * 
 * Collects various browser and device information to create a unique fingerprint
 * for leak prevention and tracking. This data can be embedded as metadata in
 * unscrambled images to track the source of leaks.
 * 
 * Features:
 * - Browser information (name, version, user agent)
 * - Device information (platform, screen resolution, hardware)
 * - Network information (IP approximation, timezone)
 * - Canvas fingerprinting
 * - WebGL fingerprinting
 * - Audio context fingerprinting
 * - Timestamp and session tracking
 */

class DeviceFingerprint {
  constructor() {
    this.fingerprint = null;
  }

  /**
   * Generate a complete device fingerprint
   * @returns {Promise<Object>} Complete fingerprint data
   */
  async generate() {
    const fingerprint = {
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    // Browser Information
    try {
      fingerprint.browser = this.getBrowserInfo();
      //console.log('✓ Browser info collected');
    } catch (e) {
      //console.error('✗ Browser info failed:', e);
      fingerprint.browser = { error: e.message };
    }
    
    // Device Information
    try {
      fingerprint.device = this.getDeviceInfo();
      //console.log('✓ Device info collected');
    } catch (e) {
      //console.error('✗ Device info failed:', e);
      fingerprint.device = { error: e.message };
    }
    
    // Screen Information
    try {
      fingerprint.screen = this.getScreenInfo();
      //console.log('✓ Screen info collected');
    } catch (e) {
      //console.error('✗ Screen info failed:', e);
      fingerprint.screen = { error: e.message };
    }
    
    // Network Information
    try {
      fingerprint.network = await this.getNetworkInfo();
      //console.log('✓ Network info collected');
    } catch (e) {
      //console.error('✗ Network info failed:', e);
      fingerprint.network = { error: e.message };
    }
    
    // Hardware Information
    try {
      fingerprint.hardware = this.getHardwareInfo();
      //console.log('✓ Hardware info collected');
    } catch (e) {
      //console.error('✗ Hardware info failed:', e);
      fingerprint.hardware = { error: e.message };
    }
    
    // Canvas Fingerprint
    try {
      fingerprint.canvas = this.getCanvasFingerprint();
      //console.log('✓ Canvas fingerprint generated');
    } catch (e) {
      //console.error('✗ Canvas fingerprint failed:', e);
      fingerprint.canvas = 'error';
    }
    
    // WebGL Fingerprint
    try {
      fingerprint.webgl = this.getWebGLFingerprint();
      //console.log('✓ WebGL fingerprint generated');
    } catch (e) {
      //console.error('✗ WebGL fingerprint failed:', e);
      fingerprint.webgl = { error: e.message };
    }
    
    // Audio Fingerprint
    try {
      fingerprint.audio = await this.getAudioFingerprint();
      //console.log('✓ Audio fingerprint generated');
    } catch (e) {
      //console.error('✗ Audio fingerprint failed:', e);
      fingerprint.audio = { error: e.message };
    }
    
    // Plugins
    try {
      fingerprint.plugins = this.getPlugins();
      //console.log('✓ Plugins collected');
    } catch (e) {
      //console.error('✗ Plugins collection failed:', e);
      fingerprint.plugins = [];
    }
    
    // Features
    try {
      fingerprint.features = this.getFeatures();
      //console.log('✓ Features detected');
    } catch (e) {
      //console.error('✗ Features detection failed:', e);
      fingerprint.features = { error: e.message };
    }
    
    // Fonts
    try {
      fingerprint.fonts = this.getFonts();
      //console.log('✓ Fonts detected');
    } catch (e) {
      //console.error('✗ Fonts detection failed:', e);
      fingerprint.fonts = [];
    }
    
    // Battery
    try {
      fingerprint.battery = await this.getBatteryInfo();
      //console.log('✓ Battery info collected');
    } catch (e) {
      //console.error('✗ Battery info failed:', e);
      fingerprint.battery = { error: e.message };
    }
    
    // Timezone
    try {
      fingerprint.timezone = this.getTimezoneInfo();
      //console.log('✓ Timezone info collected');
    } catch (e) {
      //console.error('✗ Timezone info failed:', e);
      fingerprint.timezone = { error: e.message };
    }
    
    // Language
    try {
      fingerprint.language = this.getLanguageInfo();
      //console.log('✓ Language info collected');
    } catch (e) {
      //console.error('✗ Language info failed:', e);
      fingerprint.language = { error: e.message };
    }
    
    // Storage
    try {
      fingerprint.storage = this.getStorageInfo();
      //console.log('✓ Storage info collected');
    } catch (e) {
      //console.error('✗ Storage info failed:', e);
      fingerprint.storage = { error: e.message };
    }

    // Generate hash
    try {
      fingerprint.hash = await this.generateHash(fingerprint);
      fingerprint.shortHash = fingerprint.hash.substring(0, 16);
      //console.log('✓ Fingerprint hash generated');
    } catch (e) {
      //console.error('✗ Hash generation failed:', e);
      fingerprint.hash = 'error';
      fingerprint.shortHash = 'error';
    }

    this.fingerprint = fingerprint;
    return fingerprint;
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    const browser = {
      userAgent: ua,
      vendor: navigator.vendor || 'Unknown',
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages || [navigator.language],
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack || 'Not specified',
      maxTouchPoints: navigator.maxTouchPoints || 0
    };

    // Detect browser name and version
    if (ua.includes('Firefox/')) {
      browser.name = 'Firefox';
      browser.version = ua.split('Firefox/')[1]?.split(' ')[0];
    } else if (ua.includes('Chrome/')) {
      browser.name = 'Chrome';
      browser.version = ua.split('Chrome/')[1]?.split(' ')[0];
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      browser.name = 'Safari';
      browser.version = ua.split('Version/')[1]?.split(' ')[0];
    } else if (ua.includes('Edge/')) {
      browser.name = 'Edge';
      browser.version = ua.split('Edge/')[1]?.split(' ')[0];
    } else {
      browser.name = 'Unknown';
      browser.version = 'Unknown';
    }

    return browser;
  }

  /**
   * Get device information
   */
  getDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      type: this.getDeviceType(),
      platform: navigator.platform,
      oscpu: navigator.oscpu || 'Unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
      deviceMemory: navigator.deviceMemory || 'Unknown',
      isMobile: /Mobile|Android|iPhone|iPad|iPod/i.test(ua),
      isTablet: /iPad|Android/i.test(ua) && !/Mobile/i.test(ua),
      isDesktop: !/Mobile|Android|iPhone|iPad|iPod/i.test(ua)
    };
  }

  /**
   * Determine device type
   */
  getDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'Mobile';
    if (/iPad|Android/i.test(ua) && !/Mobile/i.test(ua)) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Get screen information
   */
  getScreenInfo() {
    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation?.type || 'Unknown',
      devicePixelRatio: window.devicePixelRatio || 1,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      outerWidth: window.outerWidth,
      outerHeight: window.outerHeight
    };
  }

  /**
   * Get network information
   */
  async getNetworkInfo() {
    const network = {
      connection: null,
      ipInfo: null
    };

    // Network Connection API
    if (navigator.connection || navigator.mozConnection || navigator.webkitConnection) {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      network.connection = {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData
      };
    }

    // Try to get IP info (this requires external service)
    try {
      const response = await fetch('https://api.ipify.org?format=json', { timeout: 3000 });
      const data = await response.json();
      network.ipInfo = data;
    } catch (e) {
      network.ipInfo = { error: 'Could not fetch IP' };
    }

    return network;
  }

  /**
   * Get hardware information
   */
  getHardwareInfo() {
    return {
      cores: navigator.hardwareConcurrency || 'Unknown',
      memory: navigator.deviceMemory || 'Unknown',
      maxTouchPoints: navigator.maxTouchPoints || 0,
      gpu: this.getGPUInfo()
    };
  }

  /**
   * Get GPU information from WebGL
   */
  getGPUInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          return {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          };
        }
      }
    } catch (e) {
      return { error: 'Could not detect GPU' };
    }
    return { error: 'WebGL not available' };
  }

  /**
   * Generate canvas fingerprint
   */
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');

      // Draw text with various styles
      ctx.textBaseline = 'top';
      ctx.font = '14px "Arial"';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('DeviceFingerprint 🔒', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('DeviceFingerprint 🔒', 4, 17);

      return canvas.toDataURL();
    } catch (e) {
      return 'Error generating canvas fingerprint';
    }
  }

  /**
   * Generate WebGL fingerprint
   */
  getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) return { error: 'WebGL not available' };

      const fingerprint = {
        version: gl.getParameter(gl.VERSION),
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
        extensions: gl.getSupportedExtensions()
      };

      return fingerprint;
    } catch (e) {
      return { error: 'Error generating WebGL fingerprint' };
    }
  }

  /**
   * Generate audio context fingerprint
   */
  async getAudioFingerprint() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return { error: 'AudioContext not available' };

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(0);
      
      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = (event) => {
          const output = event.outputBuffer.getChannelData(0);
          const hash = Array.from(output.slice(0, 30)).reduce((acc, val) => acc + Math.abs(val), 0);
          
          oscillator.stop();
          scriptProcessor.disconnect();
          context.close();
          
          resolve({
            hash: hash.toString(),
            sampleRate: context.sampleRate,
            state: context.state
          });
        };
      });
    } catch (e) {
      return { error: 'Error generating audio fingerprint' };
    }
  }

  /**
   * Get installed plugins
   */
  getPlugins() {
    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      plugins.push({
        name: plugin.name,
        description: plugin.description,
        filename: plugin.filename
      });
    }
    return plugins;
  }

  /**
   * Get browser features
   */
  getFeatures() {
    return {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      webgl: !!(window.WebGLRenderingContext),
      webgl2: !!(window.WebGL2RenderingContext),
      webRTC: !!(navigator.mediaDevices?.getUserMedia),
      geolocation: !!navigator.geolocation,
      bluetooth: !!navigator.bluetooth,
      usb: !!navigator.usb,
      vibrate: !!navigator.vibrate,
      notification: !!window.Notification,
      serviceWorker: !!navigator.serviceWorker,
      touchScreen: 'ontouchstart' in window,
      webAssembly: !!window.WebAssembly
    };
  }

  /**
   * Detect installed fonts
   */
  getFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana',
      'Helvetica', 'Comic Sans MS', 'Impact', 'Trebuchet MS', 'Arial Black',
      'Palatino', 'Garamond', 'Bookman', 'Courier', 'Tahoma'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '72px monospace';

    const installedFonts = [];

    testFonts.forEach(font => {
      const detected = baseFonts.some(baseFont => {
        ctx.font = `72px ${font}, ${baseFont}`;
        const testWidth = ctx.measureText('mmmmmmmmmmlli').width;
        ctx.font = `72px ${baseFont}`;
        const baseWidth = ctx.measureText('mmmmmmmmmmlli').width;
        return testWidth !== baseWidth;
      });
      
      if (detected) installedFonts.push(font);
    });

    return installedFonts;
  }

  /**
   * Get battery information
   */
  async getBatteryInfo() {
    try {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        return {
          charging: battery.charging,
          level: battery.level,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      }
    } catch (e) {
      return { error: 'Battery API not available' };
    }
    return { error: 'Battery API not available' };
  }

  /**
   * Get timezone information
   */
  getTimezoneInfo() {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale
    };
  }

  /**
   * Get language information
   */
  getLanguageInfo() {
    return {
      language: navigator.language,
      languages: navigator.languages || [navigator.language]
    };
  }

  /**
   * Get storage information
   */
  getStorageInfo() {
    const storage = {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false
    };

    try {
      storage.localStorage = !!window.localStorage;
      storage.sessionStorage = !!window.sessionStorage;
      storage.indexedDB = !!window.indexedDB;
    } catch (e) {
      // Storage blocked
    }

    return storage;
  }

  /**
   * Generate a session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate hash from fingerprint data
   */
  async generateHash(data) {
    const str = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(str);
    
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Fallback to simple hash
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * Get a compact fingerprint for embedding
   */
  async getCompactFingerprint(userInfo = {}) {
    const fp = await this.generate();
    
    return {
      // Essential identification
      hash: fp.shortHash,
      timestamp: fp.timestamp,
      
      // User info (from account)
      userId: userInfo.userId || 'guest',
      username: userInfo.username || 'unknown',
      email: userInfo.email || 'unknown',
      
      // Device essentials
      device: fp.device.type,
      browser: `${fp.browser.name} ${fp.browser.version}`,
      os: fp.browser.platform,
      
      // Screen signature
      screen: `${fp.screen.width}x${fp.screen.height}`,
      
      // Location hints
      timezone: fp.timezone.timezone,
      language: fp.language.language,
      
      // Network
      ip: fp.network.ipInfo?.ip || 'unknown',
      
      // Unique identifiers
      canvasHash: fp.canvas.substring(0, 32),
      webglHash: JSON.stringify(fp.webgl.renderer).substring(0, 32)
    };
  }

  /**
   * Encode fingerprint to base64 for embedding
   */
  encodeForEmbedding(compactFp) {
    try {
      const json = JSON.stringify(compactFp);
      return btoa(json);
    } catch (e) {
      console.error('Error encoding fingerprint:', e);
      return '';
    }
  }

  /**
   * Decode fingerprint from base64
   */
  decodeFromEmbedding(encoded) {
    try {
      const json = atob(encoded);
      return JSON.parse(json);
    } catch (e) {
      console.error('Error decoding fingerprint:', e);
      return null;
    }
  }
}

// Export singleton instance
export default new DeviceFingerprint();
