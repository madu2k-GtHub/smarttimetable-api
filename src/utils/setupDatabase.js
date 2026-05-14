const { pool } = require('../config/db');

/**
 * Complete database setup - creates all tables in correct order
 */
const setupDatabase = async () => {
  const client = await pool.connect();

  try {
    console.log('\n🔧 Setting up SmartTimetable database...\n');

    // 1. Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension enabled');

    // 2. Create profiles table (referenced by users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name       VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created profiles table');

    // 3. Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                SERIAL PRIMARY KEY,
        profile_id        UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
        email             VARCHAR(255) UNIQUE NOT NULL,
        password_hash     VARCHAR(255) NOT NULL,
        username          VARCHAR(100) UNIQUE NOT NULL,
        email_verified    BOOLEAN DEFAULT false,
        email_verified_at TIMESTAMP,
        phone             VARCHAR(20),
        phone_verified    BOOLEAN DEFAULT false,
        phone_verified_at TIMESTAMP,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created users table');

    // 4. Create user_stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id                 SERIAL PRIMARY KEY,
        profile_id         UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
        total_points       INTEGER DEFAULT 0,
        tasks_completed    INTEGER DEFAULT 0,
        routines_completed INTEGER DEFAULT 0,
        current_streak     INTEGER DEFAULT 0,
        longest_streak     INTEGER DEFAULT 0,
        last_active_date   DATE,
        updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created user_stats table');

    // 5. Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id           SERIAL PRIMARY KEY,
        profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
        title        VARCHAR(255) NOT NULL,
        description  TEXT,
        status       VARCHAR(50) DEFAULT 'pending',
        priority     INTEGER DEFAULT 0,
        points_value INTEGER DEFAULT 10,
        due_date     TIMESTAMP,
        completed_at TIMESTAMP,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created tasks table');

    // 6. Create routines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS routines (
        id           SERIAL PRIMARY KEY,
        profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
        title        VARCHAR(255) NOT NULL,
        description  TEXT,
        frequency    VARCHAR(50) DEFAULT 'daily',
        time_of_day  TIME,
        days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}',
        is_active    BOOLEAN DEFAULT true,
        points_value INTEGER DEFAULT 5,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created routines table');

    // 7. Create routine_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS routine_logs (
        id           SERIAL PRIMARY KEY,
        routine_id   INTEGER REFERENCES routines(id) ON DELETE CASCADE,
        profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes        TEXT
      );
    `);
    console.log('✅ Created routine_logs table');

    // 8. Create rewards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        id              SERIAL PRIMARY KEY,
        profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
        title           VARCHAR(255) NOT NULL,
        description     TEXT,
        points_required INTEGER NOT NULL,
        is_claimed      BOOLEAN DEFAULT false,
        claimed_at      TIMESTAMP,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created rewards table');

    // 9. Create achievements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id          SERIAL PRIMARY KEY,
        profile_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
        title       VARCHAR(255) NOT NULL,
        description TEXT,
        category    VARCHAR(50),
        badge_icon  VARCHAR(100),
        is_unlocked BOOLEAN DEFAULT false,
        unlocked_at TIMESTAMP,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created achievements table');

    // 10. Create profile_syncs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profile_syncs (
        id                  SERIAL PRIMARY KEY,
        profile_id          UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
        sync_data           JSONB NOT NULL,
        sync_version        INTEGER DEFAULT 1,
        conflict_detected   BOOLEAN DEFAULT false,
        conflict_resolution VARCHAR(50) DEFAULT 'latest_wins',
        previous_sync_at    TIMESTAMP,
        synced_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        device_id           VARCHAR(255),
        device_name         VARCHAR(255),
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created profile_syncs table');

    // 11. Create email_verifications table (for OTP)
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

    // 12. Create verification_logs table (audit trail)
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

    // 13. Create phone_verifications table (for future use)
    await client.query(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
        phone        VARCHAR(20) NOT NULL,
        otp_hash     VARCHAR(255) NOT NULL,
        attempts     INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 5,
        expires_at   TIMESTAMP NOT NULL,
        verified     BOOLEAN DEFAULT false,
        verified_at  TIMESTAMP,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_phone_expires_gt_created CHECK (expires_at > created_at)
      );
    `);
    console.log('✅ Created phone_verifications table');

    // 14. Create payment_methods table (for future use)
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

    // 15. Create all indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_profile ON users(profile_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_profile ON tasks(profile_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_routines_profile ON routines(profile_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_routine_logs_profile ON routine_logs(profile_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rewards_profile ON rewards(profile_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_achievements_profile ON achievements(profile_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_syncs_profile ON profile_syncs(profile_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_profile_syncs_timestamp ON profile_syncs(synced_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verifications_verified ON email_verifications(verified);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id ON verification_logs(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at ON verification_logs(created_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
    `);

    console.log('✅ Created all indexes');

    console.log('\n✅ Database setup complete!\n');
    return true;
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { setupDatabase };
