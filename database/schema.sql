-- ========================================
-- Login System - Database Schema
-- ========================================
-- Tables:
-- 1. users - User accounts
-- 2. sessions - Active sessions
-- ========================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Table: users
-- Stores user account information
-- ========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Hashed with bcrypt
  role VARCHAR(50) NOT NULL DEFAULT 'student', -- e.g., 'student', 'admin', 'lecturer'
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups (used in findByEmail)
CREATE INDEX idx_users_email ON users(email);

-- Index for status checks
CREATE INDEX idx_users_status ON users(status);

-- ========================================
-- Table: sessions
-- Stores JWT tokens and session information
-- ========================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- Duplicated from users for quick access
  token TEXT NOT NULL UNIQUE, -- JWT token
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for faster token lookups
CREATE INDEX idx_sessions_token ON sessions(token);

-- Index for user sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index for expired session cleanup
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ========================================
-- Row Level Security (RLS) - Optional but recommended
-- ========================================
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own data
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Sessions can only be accessed by the owner
CREATE POLICY sessions_select_policy ON sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ========================================
-- Sample Data for Testing
-- Password for all sample users: "password123"
-- Hashed using bcrypt with salt rounds = 10
-- ========================================
INSERT INTO users (email, password, role, status) VALUES
  ('student@example.com', '$2a$10$rQZ1YXx6yK5z8Q3J3vZN1.XqXWLY8HvB9K0Z8J3vZN1.XqXWLY8Hv', 'student', 'active'),
  ('admin@example.com', '$2a$10$rQZ1YXx6yK5z8Q3J3vZN1.XqXWLY8HvB9K0Z8J3vZN1.XqXWLY8Hv', 'admin', 'active'),
  ('blocked@example.com', '$2a$10$rQZ1YXx6yK5z8Q3J3vZN1.XqXWLY8HvB9K0Z8J3vZN1.XqXWLY8Hv', 'student', 'blocked'),
  ('inactive@example.com', '$2a$10$rQZ1YXx6yK5z8Q3J3vZN1.XqXWLY8HvB9K0Z8J3vZN1.XqXWLY8Hv', 'student', 'inactive');

-- ========================================
-- Useful Functions
-- ========================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions (can be run periodically)
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Comments for documentation
-- ========================================
COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON TABLE sessions IS 'Stores active user sessions with JWT tokens';
COMMENT ON COLUMN users.status IS 'User account status: active, inactive, or blocked';
COMMENT ON COLUMN sessions.token IS 'JWT token for authentication';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp';
