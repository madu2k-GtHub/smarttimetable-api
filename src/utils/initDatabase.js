const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * Initialize database schema for email verification
 * Runs ALTER and CREATE statements to add required tables
 */
const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('🔧 Initializing database schema...');

    // 1. Add email verification columns to users table
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
    `);
    console.log('✅ Added email_verified column to users');

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
    `);
    console.log('✅ Added email_verified_at column to users');

    // Add phone fields for future use
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    console.log('✅ Added phone column to users');

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
    `);
    console.log('✅ Added phone_verified column to users');

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;
    `);
    console.log('✅ Added phone_verified_at column to users');

    // 2. Create email_verifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id          SERIAL PRIMARY KEY,
        email       VARCHAR(255) UNIQUE NOT NULL,
        otp_hash    VARCHAR(255) NOT NULL,
        attempts    INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        expires_at  TIMESTAMP NOT NULL,
        verified    BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_expires_gt_created CHECK (expires_at > created_at)
      );
    `);
    console.log('✅ Created email_verifications table');

    // 3. Create verification_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_logs (
        id                  SERIAL PRIMARY KEY,
        user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
        verification_type   VARCHAR(50) NOT NULL,
        status              VARCHAR(50) NOT NULL,
        ip_address          VARCHAR(45),
        user_agent          TEXT,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created verification_logs table');

    // 4. Create phone_verifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone       VARCHAR(20) NOT NULL,
        otp_hash    VARCHAR(255) NOT NULL,
        attempts    INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        expires_at  TIMESTAMP NOT NULL,
        verified    BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_phone_expires_gt_created CHECK (expires_at > created_at)
      );
    `);
    console.log('✅ Created phone_verifications table');

    // 5. Create payment_methods table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id                      SERIAL PRIMARY KEY,
        user_id                 INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        payment_provider        VARCHAR(50) NOT NULL,
        provider_customer_id    VARCHAR(255) NOT NULL,
        email_verified          BOOLEAN DEFAULT false,
        phone_verified          BOOLEAN DEFAULT false,
        status                  VARCHAR(50) DEFAULT 'active',
        created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created payment_methods table');

    // 6. Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at
        ON email_verifications(expires_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verifications_email
        ON email_verifications(email);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verifications_verified
        ON email_verifications(verified);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id
        ON verification_logs(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at
        ON verification_logs(created_at);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id
        ON phone_verifications(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id
        ON payment_methods(user_id);
    `);

    console.log('✅ Created all indexes');

    console.log('\n✅ Database initialization complete!\n');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
