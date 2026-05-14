// routes/auth.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const { authValidators, emailVerificationValidators, handleValidationErrors } = require('../middleware/validators');
const { registerStep1, verifyOTP, resendOTP, login } = require('../controllers/authController');

const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth routes are working' });
});

/**
 * POST /api/auth/register
 * Step 1: Send OTP to email for verification
 */
router.post('/register',
  ...authValidators.register,
  handleValidationErrors,
  registerStep1
);

/**
 * POST /api/auth/verify-otp
 * Step 2: Verify OTP and create account
 */
router.post('/verify-otp',
  ...emailVerificationValidators.verifyOTP,
  handleValidationErrors,
  verifyOTP
);

/**
 * POST /api/auth/resend-otp
 * Resend OTP with cooldown
 */
router.post('/resend-otp',
  ...emailVerificationValidators.resendOTP,
  handleValidationErrors,
  resendOTP
);

/**
 * POST /api/auth/login
 * Login user with email verification requirement
 */
router.post('/login',
  ...authValidators.login,
  handleValidationErrors,
  login
);

/**
 * GET /api/auth/me
 * Get current authenticated user information
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.username, u.profile_id, u.created_at
       FROM users u
       WHERE u.id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user information'
    });
  }
});

module.exports = router;
