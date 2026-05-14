const nodemailer = require('nodemailer');

// Initialize transporter
// Port 465 requires SSL (secure: true)
// Port 587 uses STARTTLS (secure: false, but upgrades to TLS)
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,  // true for 465 (SSL), false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  connectionTimeout: 30000,    // 30 seconds
  greetingTimeout: 30000,
  socketTimeout: 30000,
  tls: {
    rejectUnauthorized: false  // Allow self-signed certs
  }
});

console.log(`📧 SMTP configured: ${process.env.SMTP_HOST}:${smtpPort} (secure=${smtpPort === 465})`);

/**
 * Send OTP verification email
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} username - User's username
 * @returns {Promise<object>} Result with success and messageId
 */
const sendOTPEmail = async (email, otp, username) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .otp-box { background: white; border: 2px dashed #4CAF50; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #4CAF50; font-family: monospace; }
          .warning { color: #d32f2f; font-size: 12px; margin-top: 10px; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SmartTimetable</h1>
            <p>Email Verification</p>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>Thank you for registering with SmartTimetable. To complete your account setup, please verify your email address using the code below.</p>

            <div class="otp-box">
              <p style="margin: 0; color: #999; font-size: 12px;">Your verification code:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">This code expires in 10 minutes</p>
            </div>

            <p>Enter this code in the app to verify your email address.</p>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong> Never share this code with anyone. SmartTimetable support will never ask for this code.
            </div>

            <p style="margin-top: 30px; color: #999; font-size: 12px;">
              If you did not request this verification code, please ignore this email. Your account will not be created unless you verify your email.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 SmartTimetable. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const plainText = `
SmartTimetable Email Verification

Hello ${username},

Thank you for registering with SmartTimetable. To complete your account setup, please verify your email address using the code below.

Your verification code: ${otp}

This code expires in 10 minutes.

Enter this code in the app to verify your email address.

SECURITY NOTICE: Never share this code with anyone. SmartTimetable support will never ask for this code.

If you did not request this verification code, please ignore this email. Your account will not be created unless you verify your email.

© 2026 SmartTimetable. All rights reserved.
    `;

    const result = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'SmartTimetable Verification Code',
      text: plainText,
      html: htmlContent
    });

    console.log(`✅ OTP email sent to ${email} (Message ID: ${result.messageId})`);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
    throw error;
  }
};

/**
 * Send welcome email after successful verification
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @returns {Promise<object>} Result with success and messageId
 */
const sendWelcomeEmail = async (email, username) => {
  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; border-radius: 3px; }
          .feature strong { color: #4CAF50; }
          .cta-button { display: inline-block; background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SmartTimetable!</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>Your email has been verified successfully! 🎉</p>

            <p>You can now access all the features of SmartTimetable:</p>

            <div class="feature">
              <strong>📅 Smart Scheduling</strong> - Create and manage profiles and daily activities
            </div>

            <div class="feature">
              <strong>⏱️ Focus Timer</strong> - Stay productive with built-in focus sessions
            </div>

            <div class="feature">
              <strong>🎯 Tasks & Rewards</strong> - Track tasks and earn rewards for completion
            </div>

            <div class="feature">
              <strong>📊 Statistics</strong> - Monitor your progress and completion rates
            </div>

            <div class="feature">
              <strong>🌙 Customization</strong> - Dark mode, kid mode, and more personalization options
            </div>

            <p style="margin-top: 30px;">
              <a href="https://smarttimetable.com" class="cta-button">Open SmartTimetable →</a>
            </p>

            <p style="margin-top: 30px; color: #999; font-size: 12px;">
              If you have any questions or need help, please contact our support team.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 SmartTimetable. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const plainText = `
Welcome to SmartTimetable!

Hello ${username},

Your email has been verified successfully!

You can now access all the features of SmartTimetable including:
- Smart Scheduling
- Focus Timer
- Tasks & Rewards
- Statistics
- Customization (Dark mode, Kid mode, and more)

Open SmartTimetable: https://smarttimetable.com

If you have any questions or need help, please contact our support team.

© 2026 SmartTimetable. All rights reserved.
    `;

    const result = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: 'Welcome to SmartTimetable!',
      text: plainText,
      html: htmlContent
    });

    console.log(`✅ Welcome email sent to ${email} (Message ID: ${result.messageId})`);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${email}:`, error.message);
    throw error;
  }
};

/**
 * Test email connection
 * @returns {Promise<boolean>} True if connection successful
 */
const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  testEmailConnection
};
