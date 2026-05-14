const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { generateOTP, hashOTP, verifyOTP: verifyOTPHash, getOTPExpiry } = require('../utils/otp');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

/**
 * POST /api/auth/register
 * Step 1: Send OTP to email
 */
const registerStep1 = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔄 Register Step 1 - Sending OTP');
    console.log('Email:', req.body.email);
    console.log('Username:', req.body.username);

    await client.query('BEGIN');

    const { email, username, password } = req.body;

    console.log('📝 Checking if email already registered...');
    // Check if email already registered
    const emailExists = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailExists.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('❌ Email already registered');
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    console.log('✅ Email not registered yet');

    console.log('📝 Checking if username already taken...');
    // Check if username already taken
    const usernameExists = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (usernameExists.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('❌ Username already taken');
      return res.status(400).json({
        success: false,
        error: 'Username already taken'
      });
    }
    console.log('✅ Username available');

    // Check if there's a pending verification (cooldown check)
    const existingVerification = await client.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND verified = false',
      [email]
    );

    if (existingVerification.rows.length > 0) {
      const existing = existingVerification.rows[0];
      const lastCreated = new Date(existing.created_at);
      const now = new Date();
      const secondsSinceLastOTP = (now - lastCreated) / 1000;
      const cooldownSeconds = 30;

      if (secondsSinceLastOTP < cooldownSeconds) {
        const secondsToWait = Math.ceil(cooldownSeconds - secondsSinceLastOTP);
        await client.query('ROLLBACK');
        return res.status(429).json({
          success: false,
          error: `Please wait ${secondsToWait} seconds before requesting another OTP`
        });
      }

      // Delete old verification if cooldown passed
      await client.query(
        'DELETE FROM email_verifications WHERE email = $1',
        [email]
      );
    }

    console.log('🔐 Generating OTP...');
    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = getOTPExpiry(10);
    console.log('OTP Generated:', otp);

    console.log('💾 Storing OTP in database...');
    // Store OTP hash in database
    await client.query(
      `INSERT INTO email_verifications (email, otp_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [email, otpHash, expiresAt]
    );
    console.log('✅ OTP stored in database');

    // Store temporary registration data (for later use after OTP verification)
    // We'll store password_hash and username in a temp table or session
    // For now, we'll just send the OTP

    await client.query('COMMIT');

    // Send OTP email
    try {
      console.log(`📧 Sending OTP to ${email}...`);
      await sendOTPEmail(email, otp, username);
      console.log(`✅ OTP email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      console.error('Stack:', emailError.stack);
      // Rollback the verification record if email fails
      await pool.query(
        'DELETE FROM email_verifications WHERE email = $1',
        [email]
      );
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email. ' + emailError.message
      });
    }

    res.status(200).json({
      success: true,
      message: `OTP sent to ${email}`,
      expires_in: 600
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in registerStep1:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP: ' + error.message
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/auth/verify-otp
 * Step 2: Verify OTP and create user account
 */
const verifyOTP = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { email, otp, username, password } = req.body;

    // Get verification record
    const verificationResult = await client.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND verified = false',
      [email]
    );

    if (verificationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'No pending verification for this email'
      });
    }

    const verification = verificationResult.rows[0];

    // Check if OTP expired
    if (new Date() > new Date(verification.expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Request a new one.'
      });
    }

    // Check attempts
    if (verification.attempts >= verification.max_attempts) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Too many failed attempts. Request a new OTP.'
      });
    }

    // Verify OTP
    if (!verifyOTPHash(otp, verification.otp_hash)) {
      // Increment attempts
      const newAttempts = verification.attempts + 1;
      const attemptsRemaining = verification.max_attempts - newAttempts;

      await client.query(
        'UPDATE email_verifications SET attempts = $1 WHERE email = $2',
        [newAttempts, email]
      );

      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Invalid OTP. ${attemptsRemaining} attempts remaining`
      });
    }

    // OTP is correct - create user account
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create profile first - explicitly generate UUID
    const profileResult = await client.query(
      `INSERT INTO profiles (id, created_at, updated_at)
       VALUES (gen_random_uuid(), NOW(), NOW())
       RETURNING id`
    );
    const profileId = profileResult.rows[0].id;

    // Create user with email_verified = true
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, username, profile_id, email_verified, email_verified_at)
       VALUES ($1, $2, $3, $4, true, NOW())
       RETURNING id, email, username, profile_id`,
      [email, passwordHash, username, profileId]
    );

    const user = userResult.rows[0];

    // Create user stats
    await client.query(
      'INSERT INTO user_stats (profile_id) VALUES ($1) ON CONFLICT (profile_id) DO NOTHING',
      [profileId]
    );

    // Mark verification as complete
    await client.query(
      'UPDATE email_verifications SET verified = true, verified_at = NOW() WHERE email = $1',
      [email]
    );

    // Log verification attempt
    await client.query(
      `INSERT INTO verification_logs (user_id, verification_type, status, created_at)
       VALUES ($1, 'email', 'success', NOW())`,
      [user.id]
    );

    await client.query('COMMIT');

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(email, username);
    } catch (emailError) {
      console.error('Welcome email send failed (non-blocking):', emailError);
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, profileId: profileId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile_id: profileId,
        email_verified: true
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in verifyOTP:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/auth/resend-otp
 * Resend OTP with cooldown
 */
const resendOTP = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { email } = req.body;

    // Get existing verification
    const verificationResult = await client.query(
      'SELECT * FROM email_verifications WHERE email = $1 AND verified = false',
      [email]
    );

    if (verificationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'No pending verification for this email'
      });
    }

    const verification = verificationResult.rows[0];
    const lastCreated = new Date(verification.created_at);
    const now = new Date();
    const secondsSinceLastOTP = (now - lastCreated) / 1000;
    const cooldownSeconds = 30;

    if (secondsSinceLastOTP < cooldownSeconds) {
      const secondsToWait = Math.ceil(cooldownSeconds - secondsSinceLastOTP);
      await client.query('ROLLBACK');
      return res.status(429).json({
        success: false,
        error: `Please wait ${secondsToWait} seconds before requesting another OTP`
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = getOTPExpiry(10);

    // Update verification record
    await client.query(
      `UPDATE email_verifications
       SET otp_hash = $1, attempts = 0, expires_at = $2, created_at = NOW()
       WHERE email = $3`,
      [otpHash, expiresAt, email]
    );

    await client.query('COMMIT');

    // Send OTP email
    try {
      // Get username from request if available
      const { username } = req.body;
      await sendOTPEmail(email, otp, username || 'User');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email'
      });
    }

    res.status(200).json({
      success: true,
      message: `New OTP sent to ${email}`,
      expires_in: 600
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in resendOTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend OTP'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/auth/login
 * Login with email verification requirement
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified. Please verify your email first.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, profileId: user.profile_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        profile_id: user.profile_id,
        email_verified: user.email_verified
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

/**
 * POST /api/auth/forgot-password
 * Send password reset OTP to email
 */
const forgotPassword = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔄 Forgot Password - Sending reset OTP');

    await client.query('BEGIN');

    const { email } = req.body;

    // Check if user exists
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'No account found with this email'
      });
    }

    // Check cooldown: is there a recent unused reset request?
    const existingReset = await client.query(
      'SELECT * FROM password_resets WHERE email = $1 AND used = false',
      [email]
    );

    if (existingReset.rows.length > 0) {
      const existing = existingReset.rows[0];
      const lastCreated = new Date(existing.created_at);
      const now = new Date();
      const secondsSinceLastOTP = (now - lastCreated) / 1000;
      const cooldownSeconds = 30;

      if (secondsSinceLastOTP < cooldownSeconds) {
        const secondsToWait = Math.ceil(cooldownSeconds - secondsSinceLastOTP);
        await client.query('ROLLBACK');
        return res.status(429).json({
          success: false,
          error: `Please wait ${secondsToWait} seconds before requesting another reset code`
        });
      }
    }

    // Delete old unused reset records for this email
    await client.query(
      'DELETE FROM password_resets WHERE email = $1',
      [email]
    );

    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = getOTPExpiry(10);

    // Store in password_resets table
    await client.query(
      `INSERT INTO password_resets (email, otp_hash, expires_at, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [email, otpHash, expiresAt]
    );

    await client.query('COMMIT');

    // Send password reset email
    try {
      console.log(`📧 Sending password reset OTP to ${email}...`);
      await sendPasswordResetEmail(email, otp);
      console.log(`✅ Password reset email sent successfully to ${email}`);
    } catch (emailError) {
      console.error('❌ Password reset email sending failed:', emailError.message);
      // Clean up the reset record if email fails
      await pool.query(
        'DELETE FROM password_resets WHERE email = $1',
        [email]
      );
      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email. ' + emailError.message
      });
    }

    res.status(200).json({
      success: true,
      message: `Password reset code sent to ${email}`,
      data: {
        email,
        expiresIn: 600,
        resendCooldown: 30
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in forgotPassword:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/auth/reset-password
 * Verify OTP and set new password
 */
const resetPassword = async (req, res) => {
  const client = await pool.connect();

  try {
    console.log('🔄 Reset Password - Verifying OTP and updating password');

    await client.query('BEGIN');

    const { email, otp, newPassword } = req.body;

    // Get password reset record
    const resetResult = await client.query(
      'SELECT * FROM password_resets WHERE email = $1 AND used = false',
      [email]
    );

    if (resetResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'No pending password reset for this email'
      });
    }

    const resetRecord = resetResult.rows[0];

    // Check if OTP expired
    if (new Date() > new Date(resetRecord.expires_at)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Reset code has expired. Request a new one.'
      });
    }

    // Check attempts
    if (resetRecord.attempts >= resetRecord.max_attempts) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Too many failed attempts. Request a new reset code.'
      });
    }

    // Verify OTP
    if (!verifyOTPHash(otp, resetRecord.otp_hash)) {
      // Increment attempts
      const newAttempts = resetRecord.attempts + 1;
      const attemptsRemaining = resetRecord.max_attempts - newAttempts;

      await client.query(
        'UPDATE password_resets SET attempts = $1 WHERE id = $2',
        [newAttempts, resetRecord.id]
      );

      await client.query('COMMIT');
      return res.status(400).json({
        success: false,
        error: `Invalid reset code. ${attemptsRemaining} attempts remaining`
      });
    }

    // OTP is valid - hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update user's password
    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [passwordHash, email]
    );

    // Mark password reset as used
    await client.query(
      'UPDATE password_resets SET used = true, used_at = NOW() WHERE id = $1',
      [resetRecord.id]
    );

    // Delete all password_resets for this email
    await client.query(
      'DELETE FROM password_resets WHERE email = $1',
      [email]
    );

    // Get user id for logging
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length > 0) {
      // Log in verification_logs
      await client.query(
        `INSERT INTO verification_logs (user_id, verification_type, status, created_at)
         VALUES ($1, 'password_reset', 'success', NOW())`,
        [userResult.rows[0].id]
      );
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in resetPassword:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  registerStep1,
  verifyOTP,
  resendOTP,
  login,
  forgotPassword,
  resetPassword
};
