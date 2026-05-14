const { Pool } = require('pg');

// Use individual database config for development, or DATABASE_URL for production
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'smarttimetable_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Fallback to DATABASE_URL if connection params not available
  connectionString: (!process.env.DB_HOST && process.env.DATABASE_URL) ? process.env.DATABASE_URL : undefined,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Query helper for convenience
 * Usage: const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};