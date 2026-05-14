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

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error Handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 SmartTimetable API running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);

  // Setup database schema
  try {
    await setupDatabase();
  } catch (error) {
    console.error('⚠️ Database setup error:', error.message);
    console.log('⚠️ Continuing despite database error...');
  }

  // Test email connection
  try {
    await testEmailConnection();
  } catch (error) {
    console.error('⚠️ SMTP connection error:', error.message);
    console.log('⚠️ Email OTP verification will not work until SMTP is configured');
  }
});