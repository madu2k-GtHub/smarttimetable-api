'CREATE TABLE IF NOT EXISTS profiles ( ... );

'CREATE TABLE IF NOT EXISTS users ( ... );

'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- FULL DATABASE SCHEMA (UUID COMPATIBLE)
-- ============================================

-- 2. USERS (authentication layer)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    profile_id    UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username      VARCHAR(100) UNIQUE NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. USER STATS (points, streaks, progress)
-- ============================================
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

-- 4. TASKS
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id           SERIAL PRIMARY KEY,
    profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    status       VARCHAR(50)  DEFAULT 'pending',
    priority     INTEGER      DEFAULT 0,
    points_value INTEGER      DEFAULT 10,
    due_date     TIMESTAMP,
    completed_at TIMESTAMP,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 5. ROUTINES
-- ============================================
CREATE TABLE IF NOT EXISTS routines (
    id           SERIAL PRIMARY KEY,
    profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    frequency    VARCHAR(50)  DEFAULT 'daily',
    time_of_day  TIME,
    days_of_week INTEGER[]    DEFAULT '{1,2,3,4,5}',
    is_active    BOOLEAN      DEFAULT true,
    points_value INTEGER      DEFAULT 5,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 6. ROUTINE LOGS (track when routines are completed)
-- ============================================
CREATE TABLE IF NOT EXISTS routine_logs (
    id           SERIAL PRIMARY KEY,
    routine_id   INTEGER REFERENCES routines(id) ON DELETE CASCADE,
    profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes        TEXT
);

-- 7. REWARDS
-- ============================================
CREATE TABLE IF NOT EXISTS rewards (
    id              SERIAL PRIMARY KEY,
    profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    points_required INTEGER NOT NULL,
    is_claimed      BOOLEAN   DEFAULT false,
    claimed_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    id           SERIAL PRIMARY KEY,
    profile_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    category     VARCHAR(50),
    badge_icon   VARCHAR(100),
    is_unlocked  BOOLEAN   DEFAULT false,
    unlocked_at  TIMESTAMP,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. PROFILE SYNCS (track mobile app syncs to cloud)
-- ============================================
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

-- ============================================
-- INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_profile           ON users(profile_id);
CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email);
CREATE INDEX IF NOT EXISTS idx_tasks_profile           ON tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status            ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_routines_profile        ON routines(profile_id);
CREATE INDEX IF NOT EXISTS idx_routine_logs_profile    ON routine_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_rewards_profile         ON rewards(profile_id);
CREATE INDEX IF NOT EXISTS idx_achievements_profile    ON achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_syncs_profile   ON profile_syncs(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_syncs_timestamp ON profile_syncs(synced_at);

