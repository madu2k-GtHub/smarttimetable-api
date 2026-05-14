const { Pool } = require('pg');

// Build connection config — try DATABASE_URL first, then individual vars
function buildConfig() {
  // Railway injects DATABASE_URL when a Postgres service is linked
  if (process.env.DATABASE_URL) {
    console.log('🗄️  Using DATABASE_URL for database connection');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  }
  // Fall back to individual variables (development or manual setup)
  console.log(`🗄️  Connecting to ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'smarttimetable_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

const pool = new Pool(buildConfig());

/**
 * Query helper for convenience
 * Usage: const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};