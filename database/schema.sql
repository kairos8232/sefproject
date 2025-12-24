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
  ('student@example.com', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active'),
  ('admin@example.com', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'admin', 'active'),
  ('blocked@example.com', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'blocked'),
  ('inactive@example.com', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'inactive');

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

-- ========================================
-- Table: events
-- UC-03: Browse Events
-- ========================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(50) NOT NULL DEFAULT 'campuswide', -- 'facultyonly', 'campuswide', 'inviteonly'
  event_type VARCHAR(100), -- e.g., 'seminar', 'workshop', 'sports', 'cultural'
  status VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_visibility ON events(visibility);
CREATE INDEX idx_events_start_datetime ON events(start_datetime);

-- RLS Policies for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can view campus-wide events
CREATE POLICY "Anyone can view campuswide events" ON events
  FOR SELECT
  USING (visibility = 'campuswide');

-- Backend can manage all events
CREATE POLICY "Backend can read all events" ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert events" ON events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update events" ON events
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete events" ON events
  FOR DELETE
  USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE events IS 'Stores campus events information';
COMMENT ON COLUMN events.visibility IS 'Event visibility: facultyonly, campuswide, inviteonly';
COMMENT ON COLUMN events.status IS 'Event status: upcoming, ongoing, completed, cancelled';

-- ========================================
-- Sample Events Data for Testing
-- ========================================
INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
  'Campus Tech Workshop',
  'Learn about the latest web technologies and frameworks. Open to all students and faculty.',
  'campuswide',
  'workshop',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '3 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
  'Annual Sports Day',
  'Inter-department sports competition. All students welcome!',
  'campuswide',
  'sports',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP + INTERVAL '14 days' + INTERVAL '8 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
  'Faculty Development Seminar',
  'Professional development workshop for faculty members only.',
  'facultyonly',
  'seminar',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '5 days',
  CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'student@example.com' LIMIT 1),
  'Cultural Night 2025',
  'Celebrate diversity with performances, food, and cultural exhibitions from around the world.',
  'campuswide',
  'cultural',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '21 days',
  CURRENT_TIMESTAMP + INTERVAL '21 days' + INTERVAL '5 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'student@example.com');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'student@example.com' LIMIT 1),
  'Hackathon 2025',
  'Join us for a 24-hour coding challenge! Build innovative solutions and win prizes.',
  'campuswide',
  'workshop',
  'ongoing',
  CURRENT_TIMESTAMP - INTERVAL '2 hours',
  CURRENT_TIMESTAMP + INTERVAL '22 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'student@example.com');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
  'Career Fair',
  'Meet recruiters from top companies. Bring your resume!',
  'campuswide',
  'career',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '10 days',
  CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '6 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'student@example.com' LIMIT 1),
  'Alumni Meetup',
  'Private networking event for selected alumni and current students.',
  'inviteonly',
  'networking',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '30 days' + INTERVAL '4 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'student@example.com');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
  'Orientation Week',
  'Welcome new students! Campus tours, registration assistance, and meet your peers.',
  'campuswide',
  'orientation',
  'completed',
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  CURRENT_TIMESTAMP - INTERVAL '25 days'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@example.com');

