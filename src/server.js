const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
// Load .env only in development mode
// In production (Railway), environment variables are injected automatically
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({
    path: path.join(__dirname, '..', '.env.development')
  });
}

const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profileRoutes');
const taskRoutes = require('./routes/taskRoutes');
const routineRoutes = require('./routes/routineRoutes');
const errorHandler = require('./middleware/errorHandler');
const { setupDatabase } = require('./utils/setupDatabase');
const { testEmailConnection } = require('./services/emailService');

const app = express();

// Security & Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api', indexRoutes);
app.use('/api/auth', authRoutes);           // Authentication routes
app.use('/api/profiles', profileRoutes);     // Profile routes
app.use('/api/tasks', taskRoutes);           // Task CRUD routes
app.use('/api/routines', routineRoutes);     // Routine CRUD routes

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Temporary debug endpoint - shows DB config (remove after fixing)
app.get('/debug-db', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    has_DATABASE_URL: !!process.env.DATABASE_URL,
    DATABASE_URL_preview: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 30) + '...' : 'NOT SET',
    DB_HOST: process.env.DB_HOST || 'NOT SET',
    DB_PORT: process.env.DB_PORT || 'NOT SET',
    DB_NAME: process.env.DB_NAME || 'NOT SET',
    DB_USER: process.env.DB_USER || 'NOT SET',
    has_DB_PASSWORD: !!process.env.DB_PASSWORD
  });
});

// Temporary admin endpoint - resets database schema
// Drops all tables and recreates them with the correct schema
app.post('/admin/reset-db/:secret', async (req, res) => {
  if (req.params.secret !== 'reset-smarttimetable-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { pool } = require('./config/db');
  const { setupDatabase } = require('./utils/setupDatabase');
  try {
    const client = await pool.connect();
    console.log('🗑️  Dropping all tables...');
    await client.query(`
      DROP TABLE IF EXISTS verification_logs CASCADE;
      DROP TABLE IF EXISTS phone_verifications CASCADE;
      DROP TABLE IF EXISTS email_verifications CASCADE;
      DROP TABLE IF EXISTS payment_methods CASCADE;
      DROP TABLE IF EXISTS profile_syncs CASCADE;
      DROP TABLE IF EXISTS achievements CASCADE;
      DROP TABLE IF EXISTS rewards CASCADE;
      DROP TABLE IF EXISTS routine_logs CASCADE;
      DROP TABLE IF EXISTS routines CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS user_stats CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS profiles CASCADE;
    `);
    client.release();
    console.log('✅ All tables dropped');
    console.log('🏗️  Recreating tables...');
    await setupDatabase();
    res.json({ success: true, message: 'Database reset and recreated successfully' });
  } catch (error) {
    console.error('❌ DB reset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error Handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SmartTimetable API running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);

  // Setup database schema (non-blocking)
  setupDatabase()
    .catch(error => {
      console.error('⚠️ Database setup error:', error.message);
      console.log('⚠️ Continuing without full database setup...');
    });

  // Test email connection (non-blocking)
  testEmailConnection()
    .catch(error => {
      console.error('⚠️ SMTP connection error:', error.message);
      console.log('⚠️ Email OTP verification will not work until SMTP is configured');
    });
});// Force redeploy Thu May 14 19:53:13 WCAST 2026

