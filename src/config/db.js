const { Pool } = require('pg');

// Database configuration
// In production (Railway), use DATABASE_URL if available
// In development, use individual env variables
const pool = new Pool(
  process.env.NODE_ENV === 'production' && process.env.DATABASE_URL
    ? {
        // Production: Use Railway's DATABASE_URL
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        // Development: Use individual variables
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'smarttimetable_dev',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: false
      }
);

/**
 * Query helper for convenience
 * Usage: const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};