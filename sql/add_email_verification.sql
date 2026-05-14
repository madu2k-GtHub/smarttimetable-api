-- ============================================
-- EMAIL VERIFICATION SYSTEM SETUP
-- Add support for OTP-based email verification
-- ============================================

-- 1. ALTER users table to add email verification fields
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- If adding phone verification in future
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;

-- 2. CREATE email_verifications table
-- ============================================
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

-- 3. CREATE verification_logs table (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS verification_logs (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
    verification_type   VARCHAR(50) NOT NULL,  -- 'email', 'phone', 'payment'
    status              VARCHAR(50) NOT NULL,  -- 'success', 'failed', 'expired'
    ip_address          VARCHAR(45),           -- IPv4 or IPv6
    user_agent          TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREATE phone_verifications table (for future use)
-- ============================================
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

-- 5. CREATE payment_methods table (for future payment integration)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id                      SERIAL PRIMARY KEY,
    user_id                 INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    payment_provider        VARCHAR(50) NOT NULL,  -- 'stripe', 'paypal'
    provider_customer_id    VARCHAR(255) NOT NULL,
    email_verified          BOOLEAN DEFAULT false,
    phone_verified          BOOLEAN DEFAULT false,
    status                  VARCHAR(50) DEFAULT 'active',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. CREATE INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at
    ON email_verifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email
    ON email_verifications(email);

CREATE INDEX IF NOT EXISTS idx_email_verifications_verified
    ON email_verifications(verified);

CREATE INDEX IF NOT EXISTS idx_verification_logs_user_id
    ON verification_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at
    ON verification_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id
    ON phone_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id
    ON payment_methods(user_id);

-- 7. CLEANUP job for expired OTPs (run periodically)
-- ============================================
-- DELETE FROM email_verifications WHERE expires_at < CURRENT_TIMESTAMP AND verified = false;
-- This should be run as a scheduled job or cron task

-- ============================================
-- EMAIL VERIFICATION SYSTEM READY
-- ============================================
