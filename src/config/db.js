const { Pool } = require('pg');

// Build connection config — try DATABASE_URL first, then individual vars
function buildConfig() {
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const isInternal = url.includes('.railway.internal');
    console.log(`🗄️  Using DATABASE_URL (${isInternal ? 'Railway internal' : 'external'})`);
    return {
      connectionString: url,
      // Internal Railway connections don't need SSL
      ssl: isInternal ? false : { rejectUnauthorized: false }
    };
  }
  // Fall back to individual variables (development)
  console.log(`🗄️  Connecting to ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'smarttimetable_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: false
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