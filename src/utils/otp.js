const crypto = require('crypto');

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP using SHA-256
 * @param {string} otp - Plain text OTP
 * @returns {string} SHA-256 hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verify OTP by comparing hashes
 * @param {string} otp - Plain text OTP
 * @param {string} hash - Stored hash
 * @returns {boolean} True if OTP matches hash
 */
const verifyOTP = (otp, hash) => {
  const computedHash = hashOTP(otp);
  return computedHash === hash;
};

/**
 * Get OTP expiry time (10 minutes from now)
 * @param {number} minutes - Minutes until expiry (default 10)
 * @returns {Date} Expiry date/time
 */
const getOTPExpiry = (minutes = 10) => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  getOTPExpiry
};
