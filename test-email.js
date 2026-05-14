require('dotenv').config({ path: '.env.development' });
const nodemailer = require('nodemailer');

console.log('🔧 Testing SMTP configuration...\n');
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '***hidden***' : 'NOT SET');
console.log('');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ SMTP Connection Failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!');
    console.log('Server ready to send emails from:', process.env.SMTP_FROM_EMAIL);
    process.exit(0);
  }
});
