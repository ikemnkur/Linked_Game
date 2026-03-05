import bcrypt from 'bcryptjs';


/**
 * Hash a plain text password using bcrypt
 * @param {string} plainPassword - The plain text password to hash
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} The hashed password
 */
export async function hashPassword(plainPassword, saltRounds = 12) {
    try {
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Password hashing failed');
    }
}

/**
 * Compare a plain text password with a hashed password
 * @param {string} plainPassword - The plain text password
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */
export async function comparePassword(plainPassword, hashedPassword) {
    try {
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        return isMatch;
    } catch (error) {
        console.error('Error comparing password:', error);
        throw new Error('Password comparison failed');
    }
}

// Example usage:
// const passwordHash = await hashPassword('myPassword123');
// const isValid = await comparePassword('myPassword123', passwordHash);