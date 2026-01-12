-- ========================================
-- Event Management System - Database Schema
-- ========================================
-- Tables:
-- 1. users - User accounts
-- 2. sessions - Active sessions
-- 3. faculties - Faculty/department information
-- 4. venues - Venue/room information
-- 5. events - Event information
-- 6. venue_bookings - Venue booking requests
-- 7. event_invitations - Event invitation management
-- 8. event_participation - Event participation/registration tracking
-- 9. event_registration_fields - Custom registration form fields for events
-- 10. event_registration_responses - Participant responses to custom fields
-- 12. resource_requests - Resource requests for events
-- 13. venue_availability_blocks - Venue blocked time slots
-- 14. event_feedbacks - Feedback from faculty staff on completed events
-- ========================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set database timezone to UTC+8 (Asia/Singapore, Asia/Kuala_Lumpur, etc.)
SET TIME ZONE 'Asia/Singapore';

-- ========================================
-- Drop existing tables (in reverse order of dependencies)
-- ========================================
DROP TABLE IF EXISTS event_feedbacks CASCADE;
DROP TABLE IF EXISTS venue_availability_blocks CASCADE;
DROP TABLE IF EXISTS resource_requests CASCADE;
DROP TABLE IF EXISTS resource_types CASCADE;
DROP TABLE IF EXISTS resource_categories CASCADE;
DROP TABLE IF EXISTS event_registration_responses CASCADE;
DROP TABLE IF EXISTS event_registration_fields CASCADE;
DROP TABLE IF EXISTS event_participation CASCADE;
DROP TABLE IF EXISTS event_invitations CASCADE;
DROP TABLE IF EXISTS venue_bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- ========================================
-- Table: users
-- Stores user account information
-- ========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password TEXT NOT NULL, -- Hashed with bcrypt
  role VARCHAR(50) NOT NULL DEFAULT 'student', -- 'student', 'event_organizer', 'administrator', 'faculty_manager'
  faculty_id UUID, -- Foreign key to faculties (only for faculty_manager and students)
  staff_id VARCHAR(50) UNIQUE, -- Student ID (matric number), Staff ID for organizers/admins/faculty managers
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups (used in findByEmail)
CREATE INDEX idx_users_email ON users(email);

-- Index for status checks
CREATE INDEX idx_users_status ON users(status);

-- Index for staff_id lookups
CREATE INDEX idx_users_staff_id ON users(staff_id);

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
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes')
);

-- Index for faster token lookups
CREATE INDEX idx_sessions_token ON sessions(token);

-- Index for user sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Index for expired session cleanup
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ========================================
-- Table: refresh_tokens
-- Stores refresh tokens for sliding sessions
-- ========================================
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of refresh token
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ========================================
-- Table: faculties
-- Stores faculty/department information
-- ========================================
CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'FCI', 'FOM', 'FOB', 'FAC'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster code lookups
CREATE INDEX idx_faculties_code ON faculties(code);

-- Index for status checks
CREATE INDEX idx_faculties_status ON faculties(status);

-- ========================================
-- Table: venues
-- Stores venue/room information managed by faculties
-- ========================================
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'LT-FCI-01', 'LAB-CS-01'
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255), -- e.g., 'Level 2', 'Ground Floor'
  capacity INTEGER, -- Maximum number of people
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster code lookups
CREATE INDEX idx_venues_code ON venues(code);

-- Index for faculty lookups
CREATE INDEX idx_venues_faculty_id ON venues(faculty_id);

-- Index for status checks
CREATE INDEX idx_venues_status ON venues(status);

-- Index for capacity filtering
CREATE INDEX idx_venues_capacity ON venues(capacity);

-- ========================================
-- Table: events
-- Stores campus events information
-- Visibility rules:
-- - 'campuswide': All logged-in users can see
-- - 'facultyonly': Only users with same faculty_id as organizer can see
-- - 'inviteonly': Only invited users can see (requires event_invitations table)
-- ========================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  description TEXT,
  visibility VARCHAR(50) NOT NULL DEFAULT 'campuswide', -- 'facultyonly', 'campuswide', 'inviteonly'
  event_type VARCHAR(100), -- e.g., 'seminar', 'workshop', 'sports', 'cultural'
  status VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'ongoing', 'completed', 'cancelled'
  registration_status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'closed'
  expected_attendees INTEGER, -- Expected number of attendees for the event
  registration_limit INTEGER, -- Optional limit for event registrations. If NULL, uses venue capacity
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

-- ========================================
-- Table: venue_bookings
-- Stores venue booking requests for events
-- ========================================
CREATE TABLE venue_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  package_id UUID, -- Groups multiple venue bookings into one package (NULL for legacy single bookings)
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  requested_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  approved_start_datetime TIMESTAMP WITH TIME ZONE,
  approved_end_datetime TIMESTAMP WITH TIME ZONE,
  setup_time INTEGER, -- Minutes needed before event for setup
  teardown_time INTEGER, -- Minutes needed after event for cleanup
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  approved_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT, -- Comments from approver
  rejection_reason TEXT, -- Why it was rejected
  cancellation_reason TEXT, -- Why it was cancelled
  remarks TEXT, -- Purpose/notes about the booking
  expected_attendees INTEGER, -- For capacity verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_venue_bookings_event_id ON venue_bookings(event_id);
CREATE INDEX idx_venue_bookings_venue_id ON venue_bookings(venue_id);
CREATE INDEX idx_venue_bookings_requester_user_id ON venue_bookings(requester_user_id);
CREATE INDEX idx_venue_bookings_status ON venue_bookings(status);
CREATE INDEX idx_venue_bookings_requested_start ON venue_bookings(requested_start_datetime);
CREATE INDEX idx_venue_bookings_requested_end ON venue_bookings(requested_end_datetime);
CREATE INDEX idx_venue_bookings_approved_user_id ON venue_bookings(approved_user_id);
-- Index for package queries (added by migration)
CREATE INDEX idx_venue_bookings_package_id ON venue_bookings(package_id);

-- ========================================
-- Table: event_invitations
-- Stores user invitations for invite-only events
-- Event organizers can select specific users to invite
-- ========================================
CREATE TABLE event_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Who sent the invitation
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id) -- Prevent duplicate invitations
);

-- Indexes for faster queries
CREATE INDEX idx_event_invitations_event_id ON event_invitations(event_id);
CREATE INDEX idx_event_invitations_user_id ON event_invitations(user_id);
CREATE INDEX idx_event_invitations_invited_by ON event_invitations(invited_by);
CREATE INDEX idx_event_invitations_status ON event_invitations(status);

-- ========================================
-- Table: event_participation
-- Stores user participation/registration for events
-- Simple tracking of who registered for which events
-- ========================================
CREATE TABLE event_participation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'registered', -- 'registered', 'cancelled', 'attended'
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  check_in_datetime TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id) -- Prevent duplicate registrations
);

-- Indexes for faster queries
CREATE INDEX idx_event_participation_event_id ON event_participation(event_id);
CREATE INDEX idx_event_participation_user_id ON event_participation(user_id);
CREATE INDEX idx_event_participation_status ON event_participation(status);
CREATE INDEX idx_event_participation_registered_at ON event_participation(registered_at);

-- ========================================
-- Table: event_registration_fields
-- Stores custom registration form fields for events
-- ========================================
CREATE TABLE event_registration_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  field_type VARCHAR(50) NOT NULL, -- 'text', 'textarea', 'number', 'email', 'phone', 'dropdown', 'radio', 'checkbox', 'date'
  label VARCHAR(255) NOT NULL,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- For dropdown, radio, checkbox - array of option strings
  validation_rules JSONB, -- e.g., {"min_length": 5, "max_length": 100, "min": 1, "max": 10}
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX idx_registration_fields_event_id ON event_registration_fields(event_id);
CREATE INDEX idx_registration_fields_order ON event_registration_fields(event_id, order_index);

-- ========================================
-- Table: event_registration_responses
-- Stores participant responses to custom registration fields
-- ========================================
CREATE TABLE event_registration_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participation_id UUID NOT NULL REFERENCES event_participation(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES event_registration_fields(id) ON DELETE CASCADE,
  response_value TEXT, -- For text, textarea, number, email, phone, date - stored as text
  response_values JSONB, -- For checkbox (multiple selections) - array of strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(participation_id, field_id) -- One response per field per participation
);

-- Indexes for faster queries
CREATE INDEX idx_registration_responses_participation_id ON event_registration_responses(participation_id);
CREATE INDEX idx_registration_responses_field_id ON event_registration_responses(field_id);

-- ========================================
-- Table: resource_categories
-- Stores resource categories (Audio Visual, Furniture, IT Equipment, etc.)
-- ========================================
CREATE TABLE resource_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'AV', 'FURN', 'IT'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for resource_categories
CREATE INDEX idx_resource_categories_code ON resource_categories(code);
CREATE INDEX idx_resource_categories_status ON resource_categories(status);

-- ========================================
-- Table: resource_types
-- Stores resource types (Projector, Microphone, Tables, etc.)
-- ========================================
CREATE TABLE resource_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES resource_categories(id) ON DELETE RESTRICT,
  code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'PROJ-HD', 'MIC-WL', 'TBL-RND'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0, -- Total number available
  available_quantity INTEGER NOT NULL DEFAULT 0, -- Currently available
  unit VARCHAR(50), -- 'pieces', 'sets', 'units'
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
  managed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Faculty manager or admin
  notes TEXT, -- Usage restrictions, special instructions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for resource_types
CREATE INDEX idx_resource_types_category_id ON resource_types(category_id);
CREATE INDEX idx_resource_types_code ON resource_types(code);
CREATE INDEX idx_resource_types_status ON resource_types(status);
CREATE INDEX idx_resource_types_managed_by ON resource_types(managed_by);

-- ========================================
-- Table: resources (LEGACY - kept for backward compatibility)
-- Stores available campus resources (equipment, furniture, etc.)
-- ========================================

-- ========================================
CREATE TABLE resource_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_booking_id UUID NOT NULL REFERENCES venue_bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
  package_id UUID, -- Groups multiple resource requests into one package (NULL for legacy single requests)
  requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_quantity INTEGER NOT NULL,
  usage_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  usage_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  setup_instructions TEXT, -- Special instructions for setup
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  rejection_reason TEXT,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for resource_requests
CREATE INDEX idx_resource_requests_event_id ON resource_requests(event_id);
CREATE INDEX idx_resource_requests_venue_booking_id ON resource_requests(venue_booking_id);
CREATE INDEX idx_resource_requests_resource_id ON resource_requests(resource_id);
CREATE INDEX idx_resource_requests_requester_user_id ON resource_requests(requester_user_id);
CREATE INDEX idx_resource_requests_status ON resource_requests(status);
CREATE INDEX idx_resource_requests_usage_start ON resource_requests(usage_start_datetime);
CREATE INDEX idx_resource_requests_usage_end ON resource_requests(usage_end_datetime);
CREATE INDEX idx_resource_requests_approved_by ON resource_requests(approved_by);
-- Index for package queries (added by migration)
CREATE INDEX idx_resource_requests_package_id ON resource_requests(package_id);

-- ========================================
-- Row Level Security (RLS)
-- ========================================
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;

-- Backend can manage all users
CREATE POLICY "Backend can read all users" ON users
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert users" ON users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update users" ON users
  FOR UPDATE
  USING (true);

-- Backend can manage all sessions
CREATE POLICY "Backend can read all sessions" ON sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert sessions" ON sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can delete sessions" ON sessions
  FOR DELETE
  USING (true);

-- Backend can manage all refresh_tokens
CREATE POLICY "Backend can read all refresh_tokens" ON refresh_tokens
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert refresh_tokens" ON refresh_tokens
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update refresh_tokens" ON refresh_tokens
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete refresh_tokens" ON refresh_tokens
  FOR DELETE
  USING (true);

-- Backend can manage all faculties
CREATE POLICY "Backend can read all faculties" ON faculties
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert faculties" ON faculties
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update faculties" ON faculties
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete faculties" ON faculties
  FOR DELETE
  USING (true);

-- Backend can manage all venues
CREATE POLICY "Backend can read all venues" ON venues
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert venues" ON venues
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update venues" ON venues
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete venues" ON venues
  FOR DELETE
  USING (true);

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

-- Backend can manage all venue_bookings
CREATE POLICY "Backend can read all venue_bookings" ON venue_bookings
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert venue_bookings" ON venue_bookings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update venue_bookings" ON venue_bookings
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete venue_bookings" ON venue_bookings
  FOR DELETE
  USING (true);

-- Backend can manage all event_participation
CREATE POLICY "Backend can read all event_participation" ON event_participation
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert event_participation" ON event_participation
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update event_participation" ON event_participation
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete event_participation" ON event_participation
  FOR DELETE
  USING (true);

-- Backend can manage all event_registration_fields
CREATE POLICY "Backend can read all event_registration_fields" ON event_registration_fields
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert event_registration_fields" ON event_registration_fields
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update event_registration_fields" ON event_registration_fields
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete event_registration_fields" ON event_registration_fields
  FOR DELETE
  USING (true);

-- Backend can manage all event_registration_responses
CREATE POLICY "Backend can read all event_registration_responses" ON event_registration_responses
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert event_registration_responses" ON event_registration_responses
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update event_registration_responses" ON event_registration_responses
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete event_registration_responses" ON event_registration_responses
  FOR DELETE
  USING (true);

-- Backend can manage all event_invitations
CREATE POLICY "Backend can read all event_invitations" ON event_invitations
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert event_invitations" ON event_invitations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update event_invitations" ON event_invitations
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete event_invitations" ON event_invitations
  FOR DELETE
  USING (true);

-- Backend can manage all resource_categories
CREATE POLICY "Backend can read all resource_categories" ON resource_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert resource_categories" ON resource_categories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update resource_categories" ON resource_categories
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete resource_categories" ON resource_categories
  FOR DELETE
  USING (true);

-- Backend can manage all resource_types
CREATE POLICY "Backend can read all resource_types" ON resource_types
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert resource_types" ON resource_types
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update resource_types" ON resource_types
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete resource_types" ON resource_types
  FOR DELETE
  USING (true);


-- Backend can manage all resource_requests
CREATE POLICY "Backend can read all resource_requests" ON resource_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert resource_requests" ON resource_requests
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update resource_requests" ON resource_requests
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete resource_requests" ON resource_requests
  FOR DELETE
  USING (true);

-- ========================================
-- Sample Data for Testing
-- Password for all sample users: "password123"
-- Hashed using bcrypt with salt rounds = 10
-- Roles: student, event_organizer, administrator, faculty_manager
-- NOTE: Students, Faculty Managers, and Event Organizers CAN create and manage events
--       Only Administrators CANNOT create/manage events (admin functions only)
-- ========================================

-- Get the current timestamp for calculations (will be used as reference point)
-- All datetime values below are explicit timestamps based on 2026-01-15 00:00:00 as reference

-- Sample Users with staff_id
INSERT INTO users (id, email, name, password, role, status, staff_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'john.student@student.edu', 'John Student', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S001'),
  ('22222222-2222-2222-2222-222222222222', 'admin@university.edu', 'System Administrator', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'administrator', 'active', 'ADM001'),
  ('33333333-3333-3333-3333-333333333333', 'sarah.organizer@university.edu', 'Sarah Organizer', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'event_organizer', 'active', 'EO001'),
  ('44444444-4444-4444-4444-444444444444', 'blocked.user@student.edu', 'Blocked User', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'blocked', 'S002'),
  ('55555555-5555-5555-5555-555555555555', 'inactive.user@student.edu', 'Inactive User', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'inactive', 'S003'),
  ('66666666-6666-6666-6666-666666666666', 'alice.wong@fci.edu', 'Dr. Alice Wong', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active', 'FM001'),
  ('77777777-7777-7777-7777-777777777777', 'david.tan@fci.edu', 'Dr. David Tan', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active', 'FM002'),
  ('88888888-8888-8888-8888-888888888888', 'robert.chen@fom.edu', 'Dr. Robert Chen', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active', 'FM003'),
  ('99999999-9999-9999-9999-999999999999', 'maria.garcia@fob.edu', 'Dr. Maria Garcia', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active', 'FM004'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'james.lee@fac.edu', 'Dr. James Lee', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active', 'FM005'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'emily.tan@student.edu', 'Emily Tan', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S004'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'michael.kumar@student.edu', 'Michael Kumar', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S005'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'lisa.chong@student.edu', 'Lisa Chong', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S006'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'david.lim@student.edu', 'David Lim', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S007'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'amy.chen@student.edu', 'Amy Chen', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S008'),
  ('10101010-1010-1010-1010-101010101010', 'ryan.tan@student.edu', 'Ryan Tan', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S009'),
  ('20202020-2020-2020-2020-202020202020', 'olivia.lee@student.edu', 'Olivia Lee', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S010'),
  ('30303030-3030-3030-3030-303030303030', 'kevin.wong@student.edu', 'Kevin Wong', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active', 'S011');

-- Sample Faculties Data
INSERT INTO faculties (id, code, name, description, status) VALUES
  ('f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', 'FCI', 'Faculty of Computing and Informatics', 'Specializes in computer science, software engineering, information systems, and data analytics.', 'active'),
  ('f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', 'FOM', 'Faculty of Management', 'Focuses on business management, leadership, human resource management, and organizational behavior.', 'active'),
  ('f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3', 'FOB', 'Faculty of Business', 'Covers accounting, finance, marketing, and entrepreneurship.', 'active'),
  ('f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4', 'FAC', 'Faculty of Applied Communication', 'Specializes in media studies, public relations, journalism, and digital communication.', 'active');

-- Add foreign key constraint for users.faculty_id (after faculties table exists)
ALTER TABLE users 
ADD CONSTRAINT fk_users_faculty 
FOREIGN KEY (faculty_id) 
REFERENCES faculties(id) 
ON DELETE SET NULL;

-- Create index on faculty_id for faster lookups
CREATE INDEX idx_users_faculty_id ON users(faculty_id);

-- Update users with faculty assignments
UPDATE users SET faculty_id = 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1' WHERE id IN ('66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ffffffff-ffff-ffff-ffff-ffffffffffff');
UPDATE users SET faculty_id = 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2' WHERE id IN ('88888888-8888-8888-8888-888888888888', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
UPDATE users SET faculty_id = 'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3' WHERE id IN ('99999999-9999-9999-9999-999999999999', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '10101010-1010-1010-1010-101010101010');
UPDATE users SET faculty_id = 'f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4' WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '20202020-2020-2020-2020-202020202020');

-- Sample Venues Data (using explicit IDs and references)
INSERT INTO venues (id, faculty_id, code, name, location, capacity, status) VALUES
  ('v1v1v1v1-v1v1-v1v1-v1v1-v1v1v1v1v1v1', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', 'LT-FCI-01', 'Lecture Theatre 1', 'Level 2', 150, 'active'),
  ('v2v2v2v2-v2v2-v2v2-v2v2-v2v2v2v2v2v2', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', 'LAB-CS-01', 'Computer Lab 1', 'Level 3', 40, 'active'),
  ('v3v3v3v3-v3v3-v3v3-v3v3-v3v3v3v3v3v3', 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', 'SR-FOM-01', 'Seminar Room 1', 'Level 1', 30, 'active'),
  ('v4v4v4v4-v4v4-v4v4-v4v4-v4v4v4v4v4v4', 'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3', 'CR-FOB-01', 'Business Case Room', 'Level 2', 25, 'active'),
  ('v5v5v5v5-v5v5-v5v5-v5v5-v5v5v5v5v5v5', 'f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4', 'STUDIO-FAC-01', 'Media Production Studio', 'Ground Floor', 20, 'active'),
  ('v6v6v6v6-v6v6-v6v6-v6v6-v6v6v6v6v6v6', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', 'LAB-CS-02', 'Computer Lab 2', 'Level 3', 40, 'maintenance'),
  ('v7v7v7v7-v7v7-v7v7-v7v7-v7v7v7v7v7v7', 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', 'AUD-FCI-01', 'FCI Auditorium', 'Ground Floor', 300, 'active'),
  ('v8v8v8v8-v8v8-v8v8-v8v8-v8v8v8v8v8v8', 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', 'CR-FOM-01', 'Conference Room', 'Level 3', 50, 'active'),
  ('v9v9v9v9-v9v9-v9v9-v9v9-v9v9v9v9v9v9', 'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3', 'TR-FOB-01', 'Trading Room', 'Level 4', 35, 'active'),
  ('vavavava-vava-vava-vava-vavavavavava', 'f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4', 'EDIT-FAC-01', 'Editing Suite', 'Level 2', 15, 'active');

-- Sample Events Data (20 events with various statuses)
-- Reference: 2026-01-15 00:00:00+08 as base time
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, expected_attendees, registration_limit, start_datetime, end_datetime) VALUES
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', '33333333-3333-3333-3333-333333333333', 'AI & Machine Learning Workshop', 'Hands-on workshop on ML fundamentals using Python and TensorFlow', 'campuswide', 'workshop', 'upcoming', 100, 80, '2026-01-22 09:00:00+08', '2026-01-22 17:00:00+08'),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', '33333333-3333-3333-3333-333333333333', 'Annual Sports Day 2026', 'Inter-faculty sports competition with multiple events', 'campuswide', 'sports', 'upcoming', 250, NULL, '2026-01-29 08:00:00+08', '2026-01-29 18:00:00+08'),
  ('e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', '66666666-6666-6666-6666-666666666666', 'FCI Research Symposium', 'Faculty research presentations and discussions', 'facultyonly', 'seminar', 'upcoming', 40, 45, '2026-01-20 14:00:00+08', '2026-01-20 17:00:00+08'),
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cybersecurity Hackathon 2026', '24-hour security challenge with prizes', 'campuswide', 'competition', 'ongoing', 35, 30, '2026-01-14 18:00:00+08', '2026-01-15 18:00:00+08'),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '33333333-3333-3333-3333-333333333333', 'Career Fair 2026', 'Meet top employers and explore career opportunities', 'campuswide', 'career', 'upcoming', 300, NULL, '2026-01-25 10:00:00+08', '2026-01-25 17:00:00+08'),
  ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', '33333333-3333-3333-3333-333333333333', 'Alumni Networking Night', 'Exclusive networking event for invited alumni and students', 'inviteonly', 'networking', 'upcoming', 20, 25, '2026-02-14 19:00:00+08', '2026-02-14 22:00:00+08'),
  ('e7e7e7e7-e7e7-e7e7-e7e7-e7e7e7e7e7e7', '33333333-3333-3333-3333-333333333333', 'New Student Orientation', 'Welcome new students to campus', 'campuswide', 'orientation', 'completed', 200, NULL, '2025-12-20 09:00:00+08', '2025-12-23 17:00:00+08'),
  ('e8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Business Plan Competition', 'Present your startup ideas to win seed funding', 'campuswide', 'competition', 'upcoming', 60, 50, '2026-02-05 13:00:00+08', '2026-02-05 18:00:00+08'),
  ('e9e9e9e9-e9e9-e9e9-e9e9-e9e9e9e9e9e9', '88888888-8888-8888-8888-888888888888', 'Leadership Development Workshop', 'Management skills for future leaders', 'facultyonly', 'workshop', 'upcoming', 30, 30, '2026-01-28 09:00:00+08', '2026-01-28 16:00:00+08'),
  ('eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Cultural Night 2026', 'Celebrate diversity through food, music, and performances', 'campuswide', 'cultural', 'upcoming', 200, 180, '2026-02-08 18:00:00+08', '2026-02-08 22:00:00+08'),
  ('ebebebeb-ebeb-ebeb-ebeb-ebebebebebeb', '66666666-6666-6666-6666-666666666666', 'Blockchain Technology Seminar', 'Introduction to blockchain and cryptocurrency', 'campuswide', 'seminar', 'upcoming', 80, 100, '2026-01-27 14:00:00+08', '2026-01-27 16:30:00+08'),
  ('ecececec-ecec-ecec-ecec-ecececececec', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Mobile App Development Boot camp', 'Learn iOS and Android development in 3 days', 'campuswide', 'workshop', 'upcoming', 40, 35, '2026-02-10 09:00:00+08', '2026-02-12 17:00:00+08'),
  ('edededed-eded-eded-eded-edededededed', '99999999-9999-9999-9999-999999999999', 'FOB Industry Panel Discussion', 'Business leaders share insights on industry trends', 'facultyonly', 'seminar', 'upcoming', 25, NULL, '2026-01-23 15:00:00+08', '2026-01-23 17:00:00+08'),
  ('eeeeeeee-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Digital Media Showcase', 'Student projects and creative works exhibition', 'campuswide', 'exhibition', 'upcoming', 100, NULL, '2026-02-01 10:00:00+08', '2026-02-01 18:00:00+08'),
  ('eeeeeeee-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Wellness Week Yoga Session', 'Free yoga and mindfulness session for students', 'campuswide', 'wellness', 'upcoming', 50, 40, '2026-01-30 07:00:00+08', '2026-01-30 08:30:00+08'),
  ('eeeeeeee-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Game Development Jam', '48-hour game creation competition', 'campuswide', 'competition', 'upcoming', 45, 40, '2026-02-07 18:00:00+08', '2026-02-09 18:00:00+08'),
  ('eeeeeeee-4444-4444-4444-444444444444', '10101010-1010-1010-1010-101010101010', 'Finance Investment Workshop', 'Learn about stock market and investment strategies', 'campuswide', 'workshop', 'upcoming', 55, 60, '2026-01-26 14:00:00+08', '2026-01-26 17:00:00+08'),
  ('eeeeeeee-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Environmental Awareness Campaign', 'Sustainability initiatives and campus cleanup', 'campuswide', 'social', 'upcoming', 120, NULL, '2026-02-03 09:00:00+08', '2026-02-03 12:00:00+08'),
  ('eeeeeeee-6666-6666-6666-666666666666', '20202020-2020-2020-2020-202020202020', 'Public Speaking Competition', 'Showcase your oratory skills and win prizes', 'campuswide', 'competition', 'upcoming', 30, 25, '2026-02-06 13:00:00+08', '2026-02-06 17:00:00+08'),
  ('eeeeeeee-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Music Festival 2026', 'Student bands and performers showcase', 'campuswide', 'cultural', 'cancelled', 280, NULL, '2026-01-31 17:00:00+08', '2026-01-31 22:00:00+08');

-- ========================================
-- Sample Venue Bookings Data
-- ========================================
INSERT INTO venue_bookings (id, event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, approved_start_datetime, approved_end_datetime, setup_time, teardown_time, status, approved_user_id, approved_at, remarks, expected_attendees) VALUES
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'v1v1v1v1-v1v1-v1v1-v1v1-v1v1v1v1v1v1', '33333333-3333-3333-3333-333333333333', '2026-01-22 09:00:00+08', '2026-01-22 17:00:00+08', '2026-01-22 09:00:00+08', '2026-01-22 17:00:00+08', 30, 30, 'approved', '66666666-6666-6666-6666-666666666666', '2026-01-10 10:00:00+08', 'AI workshop in lecture theatre', 100),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2', 'e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'v7v7v7v7-v7v7-v7v7-v7v7-v7v7v7v7v7v7', '33333333-3333-3333-3333-333333333333', '2026-01-29 08:00:00+08', '2026-01-29 18:00:00+08', NULL, NULL, 120, 60, 'pending', NULL, NULL, 'Sports day ceremony venue', 250),
  ('b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3', 'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', 'v2v2v2v2-v2v2-v2v2-v2v2-v2v2v2v2v2v2', '66666666-6666-6666-6666-666666666666', '2026-01-20 14:00:00+08', '2026-01-20 17:00:00+08', '2026-01-20 14:00:00+08', '2026-01-20 17:00:00+08', 15, 15, 'approved', '77777777-7777-7777-7777-777777777777', '2026-01-12 15:00:00+08', 'FCI research symposium', 40),
  ('b4b4b4b4-b4b4-b4b4-b4b4-b4b4b4b4b4b4', 'e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'v2v2v2v2-v2v2-v2v2-v2v2-v2v2v2v2v2v2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-01-14 18:00:00+08', '2026-01-15 18:00:00+08', '2026-01-14 18:00:00+08', '2026-01-15 18:00:00+08', 120, 60, 'approved', '66666666-6666-6666-6666-666666666666', '2026-01-08 11:00:00+08', '24-hour hackathon', 35),
  ('b5b5b5b5-b5b5-b5b5-b5b5-b5b5b5b5b5b5', 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'v7v7v7v7-v7v7-v7v7-v7v7-v7v7v7v7v7v7', '33333333-3333-3333-3333-333333333333', '2026-01-25 10:00:00+08', '2026-01-25 17:00:00+08', NULL, NULL, 60, 30, 'pending', NULL, NULL, 'Career fair venue', 300),
  ('b6b6b6b6-b6b6-b6b6-b6b6-b6b6b6b6b6b6', 'e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', 'v4v4v4v4-v4v4-v4v4-v4v4-v4v4v4v4v4v4', '33333333-3333-3333-3333-333333333333', '2026-02-14 19:00:00+08', '2026-02-14 22:00:00+08', '2026-02-14 19:00:00+08', '2026-02-14 22:00:00+08', 30, 20, 'approved', '99999999-9999-9999-9999-999999999999', '2026-01-11 09:30:00+08', 'Alumni networking in business room', 20),
  ('b7b7b7b7-b7b7-b7b7-b7b7-b7b7b7b7b7b7', 'e8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8', 'v8v8v8v8-v8v8-v8v8-v8v8-v8v8v8v8v8v8', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-02-05 13:00:00+08', '2026-02-05 18:00:00+08', '2026-02-05 13:00:00+08', '2026-02-05 18:00:00+08', 30, 20, 'approved', '88888888-8888-8888-8888-888888888888', '2026-01-13 14:00:00+08', 'Business plan competition', 60),
  ('b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8b8', 'e9e9e9e9-e9e9-e9e9-e9e9-e9e9e9e9e9e9', 'v3v3v3v3-v3v3-v3v3-v3v3-v3v3v3v3v3v3', '88888888-8888-8888-8888-888888888888', '2026-01-28 09:00:00+08', '2026-01-28 16:00:00+08', '2026-01-28 09:00:00+08', '2026-01-28 16:00:00+08', 20, 15, 'approved', '88888888-8888-8888-8888-888888888888', '2026-01-10 12:00:00+08', 'Leadership workshop for FOM', 30),
  ('b9b9b9b9-b9b9-b9b9-b9b9-b9b9b9b9b9b9', 'eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', 'v1v1v1v1-v1v1-v1v1-v1v1-v1v1v1v1v1v1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '2026-02-08 18:00:00+08', '2026-02-08 22:00:00+08', '2026-02-08 18:00:00+08', '2026-02-08 22:00:00+08', 120, 45, 'approved', '66666666-6666-6666-6666-666666666666', '2026-01-09 16:00:00+08', 'Cultural night performances', 200),
  ('babababa-baba-baba-baba-babababababa', 'ebebebeb-ebeb-ebeb-ebeb-ebebebebebeb', 'v1v1v1v1-v1v1-v1v1-v1v1-v1v1v1v1v1v1', '66666666-6666-6666-6666-666666666666', '2026-01-27 14:00:00+08', '2026-01-27 16:30:00+08', '2026-01-27 14:00:00+08', '2026-01-27 16:30:00+08', 20, 15, 'approved', '77777777-7777-7777-7777-777777777777', '2026-01-12 10:00:00+08', 'Blockchain seminar', 80),
  ('bbbbbbbb-1111-1111-1111-111111111111', 'ecececec-ecec-ecec-ecec-ecececececec', 'v2v2v2v2-v2v2-v2v2-v2v2-v2v2v2v2v2v2', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '2026-02-10 09:00:00+08', '2026-02-12 17:00:00+08', '2026-02-10 09:00:00+08', '2026-02-12 17:00:00+08', 60, 30, 'approved', '66666666-6666-6666-6666-666666666666', '2026-01-11 13:00:00+08', '3-day mobile dev bootcamp', 40),
  ('bbbbbbbb-2222-2222-2222-222222222222', 'edededed-eded-eded-eded-edededededed', 'v4v4v4v4-v4v4-v4v4-v4v4-v4v4v4v4v4v4', '99999999-9999-9999-9999-999999999999', '2026-01-23 15:00:00+08', '2026-01-23 17:00:00+08', '2026-01-23 15:00:00+08', '2026-01-23 17:00:00+08', 15, 10, 'approved', '99999999-9999-9999-9999-999999999999', '2026-01-14 11:00:00+08', 'FOB industry panel', 25),
  ('bbbbbbbb-3333-3333-3333-333333333333', 'eeeeeeee-1111-1111-1111-111111111111', 'v5v5v5v5-v5v5-v5v5-v5v5-v5v5v5v5v5v5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-02-01 10:00:00+08', '2026-02-01 18:00:00+08', '2026-02-01 10:00:00+08', '2026-02-01 18:00:00+08', 90, 30, 'approved', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-13 09:00:00+08', 'Digital media showcase', 100),
  ('bbbbbbbb-4444-4444-4444-444444444444', 'eeeeeeee-2222-2222-2222-222222222222', 'v3v3v3v3-v3v3-v3v3-v3v3-v3v3v3v3v3v3', '33333333-3333-3333-3333-333333333333', '2026-01-30 07:00:00+08', '2026-01-30 08:30:00+08', '2026-01-30 07:00:00+08', '2026-01-30 08:30:00+08', 15, 10, 'approved', '88888888-8888-8888-8888-888888888888', '2026-01-14 15:00:00+08', 'Morning yoga session', 50),
  ('bbbbbbbb-5555-5555-5555-555555555555', 'eeeeeeee-3333-3333-3333-333333333333', 'v2v2v2v2-v2v2-v2v2-v2v2-v2v2v2v2v2v2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-02-07 18:00:00+08', '2026-02-09 18:00:00+08', '2026-02-07 18:00:00+08', '2026-02-09 18:00:00+08', 120, 60, 'approved', '66666666-6666-6666-6666-666666666666', '2026-01-10 14:00:00+08', '48-hour game jam', 45),
  ('bbbbbbbb-6666-6666-6666-666666666666', 'eeeeeeee-4444-4444-4444-444444444444', 'v9v9v9v9-v9v9-v9v9-v9v9-v9v9v9v9v9v9', '10101010-1010-1010-1010-101010101010', '2026-01-26 14:00:00+08', '2026-01-26 17:00:00+08', '2026-01-26 14:00:00+08', '2026-01-26 17:00:00+08', 20, 15, 'approved', '99999999-9999-9999-9999-999999999999', '2026-01-12 16:00:00+08', 'Investment workshop in trading room', 55),
  ('bbbbbbbb-7777-7777-7777-777777777777', 'eeeeeeee-5555-5555-5555-555555555555', 'v7v7v7v7-v7v7-v7v7-v7v7-v7v7v7v7v7v7', '33333333-3333-3333-3333-333333333333', '2026-02-03 09:00:00+08', '2026-02-03 12:00:00+08', NULL, NULL, 30, 20, 'pending', NULL, NULL, 'Environment campaign gathering point', 120),
  ('bbbbbbbb-8888-8888-8888-888888888888', 'eeeeeeee-6666-6666-6666-666666666666', 'vavavava-vava-vava-vava-vavavavavava', '20202020-2020-2020-2020-202020202020', '2026-02-06 13:00:00+08', '2026-02-06 17:00:00+08', '2026-02-06 13:00:00+08', '2026-02-06 17:00:00+08', 30, 15, 'approved', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-11 10:00:00+08', 'Public speaking competition', 30),
  ('bbbbbbbb-9999-9999-9999-999999999999', 'eeeeeeee-7777-7777-7777-777777777777', 'v7v7v7v7-v7v7-v7v7-v7v7-v7v7v7v7v7v7', '33333333-3333-3333-3333-333333333333', '2026-01-31 17:00:00+08', '2026-01-31 22:00:00+08', NULL, NULL, 120, 45, 'cancelled', NULL, NULL, 'Music festival - event cancelled', 280);

-- ========================================
-- Sample Event Participation Data (with explicit IDs and varied statuses)
-- ========================================
INSERT INTO event_participation (event_id, user_id, status, registered_at, check_in_datetime, cancelled_at) VALUES
  -- AI Workshop (e1) - 52 registrations (registration limit 80)
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-11 10:00:00+08', NULL, NULL),
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-11 11:30:00+08', NULL, NULL),
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'registered', '2026-01-11 14:00:00+08', NULL, NULL),
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'registered', '2026-01-12 09:00:00+08', NULL, NULL),
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'registered', '2026-01-12 15:30:00+08', NULL, NULL),
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', '10101010-1010-1010-1010-101010101010', 'registered', '2026-01-13 10:00:00+08', NULL, NULL),
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', '20202020-2020-2020-2020-202020202020', 'registered', '2026-01-13 16:00:00+08', NULL, NULL),
  ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'cancelled', '2026-01-11 12:00:00+08', NULL, '2026-01-14 10:00:00+08'),
  
  -- Sports Day (e2) - 87 registrations
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-10 09:00:00+08', NULL, NULL),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'registered', '2026-01-10 13:00:00+08', NULL, NULL),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'registered', '2026-01-11 08:00:00+08', NULL, NULL),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', '10101010-1010-1010-1010-101010101010', 'registered', '2026-01-11 14:30:00+08', NULL, NULL),
  ('e2e2e2e2-e2e2-e2e2-e2e2-e2e2e2e2e2e2', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'cancelled', '2026-01-11 16:00:00+08', NULL, '2026-01-13 09:00:00+08'),
  
  -- FCI Symposium (e3) - 18 registrations (registration limit 45)
  ('e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-13 10:00:00+08', NULL, NULL),
  ('e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'registered', '2026-01-13 11:00:00+08', NULL, NULL),
  
  -- Hackathon (e4) - 28 registrations, 22 attended (registration limit 30, ongoing event)
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'attended', '2026-01-08 10:00:00+08', '2026-01-14 17:45:00+08', NULL),
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'attended', '2026-01-08 11:30:00+08', '2026-01-14 17:50:00+08', NULL),
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'attended', '2026-01-09 09:00:00+08', '2026-01-14 17:55:00+08', NULL),
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', '11111111-1111-1111-1111-111111111111', 'attended', '2026-01-09 14:00:00+08', '2026-01-14 18:10:00+08', NULL),
  ('e4e4e4e4-e4e4-e4e4-e4e4-e4e4e4e4e4e4', '20202020-2020-2020-2020-202020202020', 'registered', '2026-01-10 10:00:00+08', NULL, NULL),
  
  -- Career Fair (e5) - 145 registrations
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-12 08:00:00+08', NULL, NULL),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-12 09:30:00+08', NULL, NULL),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'registered', '2026-01-12 10:00:00+08', NULL, NULL),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'registered', '2026-01-12 11:00:00+08', NULL, NULL),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'registered', '2026-01-13 09:00:00+08', NULL, NULL),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'registered', '2026-01-13 14:00:00+08', NULL, NULL),
  ('e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5', '10101010-1010-1010-1010-101010101010', 'registered', '2026-01-14 08:30:00+08', NULL, NULL),
  
  -- Business Plan Competition (e8) - 32 registrations (registration limit 50)
  ('e8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'registered', '2026-01-14 10:00:00+08', NULL, NULL),
  ('e8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8', '10101010-1010-1010-1010-101010101010', 'registered', '2026-01-14 11:30:00+08', NULL, NULL),
  ('e8e8e8e8-e8e8-e8e8-e8e8-e8e8e8e8e8e8', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'registered', '2026-01-14 13:00:00+08', NULL, NULL),
  
  -- Cultural Night (ea) - 115 registrations (registration limit 180)
  ('eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-10 14:00:00+08', NULL, NULL),
  ('eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-10 15:00:00+08', NULL, NULL),
  ('eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'registered', '2026-01-11 09:00:00+08', NULL, NULL),
  ('eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'registered', '2026-01-11 13:00:00+08', NULL, NULL),
  ('eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'registered', '2026-01-12 08:00:00+08', NULL, NULL),
  ('eaeaeaea-eaea-eaea-eaea-eaeaeaeaeaea', '20202020-2020-2020-2020-202020202020', 'registered', '2026-01-12 10:00:00+08', NULL, NULL),
  
  -- Blockchain Seminar (eb) - 63 registrations (registration limit 100)
  ('ebebebeb-ebeb-ebeb-ebeb-ebebebebebeb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-13 09:00:00+08', NULL, NULL),
  ('ebebebeb-ebeb-ebeb-ebeb-ebebebebebeb', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'registered', '2026-01-13 11:00:00+08', NULL, NULL),
  ('ebebebeb-ebeb-ebeb-ebeb-ebebebebebeb', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-13 15:00:00+08', NULL, NULL),
  
  -- Mobile Dev Bootcamp (ec) - 34 registrations (registration limit 35, almost full!)
  ('ecececec-ecec-ecec-ecec-ecececececec', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-12 10:00:00+08', NULL, NULL),
  ('ecececec-ecec-ecec-ecec-ecececececec', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'registered', '2026-01-12 14:00:00+08', NULL, NULL),
  ('ecececec-ecec-ecec-ecec-ecececececec', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-13 08:00:00+08', NULL, NULL),
  ('ecececec-ecec-ecec-ecec-ecececececec', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'registered', '2026-01-13 09:30:00+08', NULL, NULL),
  
  -- Yoga Session (e2222) - 37 registrations (registration limit 40)
  ('eeeeeeee-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-14 10:00:00+08', NULL, NULL),
  ('eeeeeeee-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-14 11:00:00+08', NULL, NULL),
  ('eeeeeeee-2222-2222-2222-222222222222', '20202020-2020-2020-2020-202020202020', 'registered', '2026-01-14 12:00:00+08', NULL, NULL),
  
  -- Game Jam (e3333) - 39 registrations (registration limit 40, almost full!)
  ('eeeeeeee-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'registered', '2026-01-11 09:00:00+08', NULL, NULL),
  ('eeeeeeee-3333-3333-3333-333333333333', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'registered', '2026-01-11 10:30:00+08', NULL, NULL),
  ('eeeeeeee-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'registered', '2026-01-11 14:00:00+08', NULL, NULL),
  ('eeeeeeee-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-12 09:00:00+08', NULL, NULL),
  
  -- Investment Workshop (e4444) - 47 registrations (registration limit 60)
  ('eeeeeeee-4444-4444-4444-444444444444', '10101010-1010-1010-1010-101010101010', 'registered', '2026-01-13 10:00:00+08', NULL, NULL),
  ('eeeeeeee-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'registered', '2026-01-13 11:30:00+08', NULL, NULL),
  ('eeeeeeee-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'registered', '2026-01-13 13:00:00+08', NULL, NULL),
  
  -- Public Speaking Competition (e6666) - 23 registrations (registration limit 25, almost full!)
  ('eeeeeeee-6666-6666-6666-666666666666', '20202020-2020-2020-2020-202020202020', 'registered', '2026-01-12 09:00:00+08', NULL, NULL),
  ('eeeeeeee-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'registered', '2026-01-12 10:00:00+08', NULL, NULL),
  ('eeeeeeee-6666-6666-6666-666666666666', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'registered', '2026-01-12 11:30:00+08', NULL, NULL);

-- ========================================
-- Sample Event Invitations Data
-- Alumni Meetup is invite-only, so we create specific invitations
-- ========================================
INSERT INTO event_invitations (event_id, user_id, invited_by, status, invited_at, responded_at) VALUES
  ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted', '2026-01-10 09:00:00+08', '2026-01-11 10:00:00+08'),
  ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'accepted', '2026-01-10 09:00:00+08', '2026-01-11 14:00:00+08'),
  ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'pending', '2026-01-10 09:00:00+08', NULL),
  ('e6e6e6e6-e6e6-e6e6-e6e6-e6e6e6e6e6e6', '66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'declined', '2026-01-10 09:00:00+08', '2026-01-11 11:00:00+08');

-- ========================================
-- Sample Resource Categories Data
-- ========================================
INSERT INTO resource_categories (code, name, description, status) VALUES
  ('AV', 'Audio Visual Equipment', 'Projectors, microphones, speakers, and other presentation equipment', 'active'),
  ('FURN', 'Furniture', 'Tables, chairs, and other furniture items', 'active'),
  ('IT', 'IT Equipment', 'Laptops, computers, and other IT devices', 'active'),
  ('CATER', 'Catering', 'Food and beverage services', 'active'),
  ('OTHER', 'Other Resources', 'Miscellaneous resources', 'active');

-- ========================================
-- Sample Resource Types Data
-- ========================================
INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'AV' LIMIT 1),
  'PROJ-LCD',
  'LCD Projector',
  'Full HD projector with HDMI and VGA inputs',
  10,
  10,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'AV');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'AV' LIMIT 1),
  'MIC-WL',
  'Wireless Microphone Set',
  'Wireless microphone with receiver and batteries',
  8,
  8,
  'sets',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'AV');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'AV' LIMIT 1),
  'SOUND-PA',
  'PA Sound System',
  'Complete sound system with speakers and mixer',
  4,
  4,
  'sets',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'AV');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'AV' LIMIT 1),
  'LED-SCREEN',
  'Portable LED Screen',
  'Large LED display screen for outdoor events',
  2,
  2,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'AV');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, notes)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'AV' LIMIT 1),
  'CAM-VIDEO',
  'Video Camera Kit',
  'Professional video camera with tripod',
  3,
  3,
  'kits',
  'active',
  (SELECT id FROM users WHERE email = 'james.lee@fac.edu' LIMIT 1),
  'FAC students only - requires training certification'
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'AV');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'FURN' LIMIT 1),
  'CHAIR-FOLD',
  'Folding Chairs',
  'Portable folding chairs for events',
  200,
  200,
  'pieces',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'FURN');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'FURN' LIMIT 1),
  'TABLE-6FT',
  'Folding Tables (6ft)',
  '6-foot folding tables',
  50,
  50,
  'pieces',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'FURN');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'FURN' LIMIT 1),
  'WB-MOBILE',
  'Whiteboard (Mobile)',
  'Large mobile whiteboard with markers',
  15,
  15,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'FURN');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'IT' LIMIT 1),
  'LAPTOP-PRES',
  'Laptop (Presentation)',
  'Laptop pre-loaded with presentation software',
  5,
  5,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'IT');

INSERT INTO resource_types (category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, notes)
SELECT 
  (SELECT id FROM resource_categories WHERE code = 'CATER' LIMIT 1),
  'SNACK-PKG',
  'Catering Package (Snacks)',
  'Light refreshments package for events',
  20,
  20,
  'packages',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  'Requires 48 hours advance notice'
WHERE EXISTS (SELECT 1 FROM resource_categories WHERE code = 'CATER');

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

-- Trigger to auto-update updated_at on faculties table
CREATE TRIGGER update_faculties_updated_at
BEFORE UPDATE ON faculties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on venues table
CREATE TRIGGER update_venues_updated_at
BEFORE UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on events table
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on venue_bookings table
CREATE TRIGGER update_venue_bookings_updated_at
BEFORE UPDATE ON venue_bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on event_invitations table
CREATE TRIGGER update_event_invitations_updated_at
BEFORE UPDATE ON event_invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on event_participation table
CREATE TRIGGER update_event_participation_updated_at
BEFORE UPDATE ON event_participation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-update updated_at on resource_requests table
CREATE TRIGGER update_resource_requests_updated_at
BEFORE UPDATE ON resource_requests
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
COMMENT ON TABLE faculties IS 'Stores faculty/department information';
COMMENT ON TABLE venues IS 'Stores venue/room information managed by faculties';
COMMENT ON TABLE events IS 'Stores campus events information';
COMMENT ON TABLE venue_bookings IS 'Stores venue booking requests for events';
COMMENT ON TABLE event_invitations IS 'Stores user invitations for invite-only events';
COMMENT ON TABLE event_participation IS 'Stores user participation/registration for events';
COMMENT ON TABLE resource_requests IS 'Stores resource requests for events';

COMMENT ON COLUMN users.role IS 'User role: student (can create events), event_organizer (can create events with custom visibility), administrator (admin functions only, cannot create events), faculty_manager (can create events and manage venues)';
COMMENT ON COLUMN users.status IS 'User account status: active, inactive, or blocked';
COMMENT ON COLUMN sessions.token IS 'JWT token for authentication';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration timestamp';
COMMENT ON COLUMN faculties.code IS 'Short code for faculty (e.g., FCI, FOM, FOB, FAC)';
COMMENT ON COLUMN faculties.status IS 'Faculty status: active or inactive';
COMMENT ON COLUMN venues.code IS 'Unique code for venue (e.g., LT-FCI-01, LAB-CS-01)';
COMMENT ON COLUMN venues.location IS 'Floor or room location (e.g., Level 2, Ground Floor)';
COMMENT ON COLUMN venues.capacity IS 'Maximum number of people the venue can accommodate';
COMMENT ON COLUMN venues.status IS 'Venue status: active, inactive, maintenance';
COMMENT ON COLUMN events.visibility IS 'Event visibility: campuswide (all users), facultyonly (same faculty as organizer), inviteonly (explicitly invited users only)';
COMMENT ON COLUMN events.event_type IS 'Event type: seminar, workshop, sports, cultural, career, orientation, networking, general, or custom value when Other is selected';
COMMENT ON COLUMN events.status IS 'Event status: upcoming (before start), ongoing (currently happening, can still register), completed (finished), cancelled';
COMMENT ON COLUMN venue_bookings.status IS 'Booking status: pending, approved, rejected, cancelled';
COMMENT ON COLUMN resource_requests.status IS 'Request status: pending, approved, rejected, cancelled';
COMMENT ON COLUMN venue_bookings.setup_time IS 'Minutes needed before event for setup';
COMMENT ON COLUMN venue_bookings.teardown_time IS 'Minutes needed after event for cleanup';
COMMENT ON COLUMN venue_bookings.expected_attendees IS 'Expected number of attendees for capacity verification';
COMMENT ON COLUMN venue_bookings.remarks IS 'Purpose and notes about the booking';
COMMENT ON COLUMN event_invitations.status IS 'Invitation status: pending, accepted, declined';
COMMENT ON COLUMN event_invitations.invited_by IS 'User ID of who sent the invitation (usually event organizer)';
COMMENT ON COLUMN event_participation.status IS 'Participation status: registered (active registration, can register for ongoing events), cancelled (user cancelled), attended (checked in at event)';
COMMENT ON COLUMN event_participation.registered_at IS 'When user registered for the event';
COMMENT ON COLUMN event_participation.cancelled_at IS 'When user cancelled their registration (can re-register after cancellation)';
COMMENT ON COLUMN event_participation.check_in_datetime IS 'When user checked in at the event (for attendance tracking)';

-- ========================================
-- Table: venue_availability_blocks
-- Stores blocked time slots for venues (faculty manager maintenance)
-- ========================================
CREATE TABLE venue_availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  blocked_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  blocked_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_time_range CHECK (blocked_end_datetime > blocked_start_datetime)
);

-- Indexes for better performance
CREATE INDEX idx_venue_availability_blocks_venue_id ON venue_availability_blocks(venue_id);
CREATE INDEX idx_venue_availability_blocks_datetime ON venue_availability_blocks(blocked_start_datetime, blocked_end_datetime);
CREATE INDEX idx_venue_availability_blocks_created_by ON venue_availability_blocks(created_by);

-- Comments
COMMENT ON TABLE venue_availability_blocks IS 'Blocked time slots for venues managed by faculty managers';
COMMENT ON COLUMN venue_availability_blocks.reason IS 'Optional reason for blocking the time slot (e.g., Maintenance, Faculty event)';
COMMENT ON COLUMN venue_availability_blocks.created_by IS 'Faculty manager who created this block';

-- ========================================
-- Table: event_feedbacks
-- Stores feedback from faculty staff on completed events
-- ========================================
CREATE TABLE event_feedbacks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_condition_rating INTEGER CHECK (venue_condition_rating >= 1 AND venue_condition_rating <= 5),
  event_organization_rating INTEGER CHECK (event_organization_rating >= 1 AND event_organization_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  comments TEXT NOT NULL,
  suggestions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_feedback_per_user_event UNIQUE(event_id, user_id)
);

-- Indexes for better performance
CREATE INDEX idx_event_feedbacks_event_id ON event_feedbacks(event_id);
CREATE INDEX idx_event_feedbacks_user_id ON event_feedbacks(user_id);
CREATE INDEX idx_event_feedbacks_created_at ON event_feedbacks(created_at);

-- Comments
COMMENT ON TABLE event_feedbacks IS 'Feedback provided by faculty staff on completed events held in their faculty venues';
COMMENT ON COLUMN event_feedbacks.venue_condition_rating IS 'Rating 1-5 for venue condition';
COMMENT ON COLUMN event_feedbacks.event_organization_rating IS 'Rating 1-5 for event organization';
COMMENT ON COLUMN event_feedbacks.cleanliness_rating IS 'Rating 1-5 for cleanliness';
COMMENT ON COLUMN event_feedbacks.overall_rating IS 'Rating 1-5 for overall experience';
COMMENT ON COLUMN event_feedbacks.comments IS 'Required feedback comments';
COMMENT ON COLUMN event_feedbacks.suggestions IS 'Optional suggestions for improvement';

-- ========================================
-- Table: system_settings
-- Stores system-wide configuration settings
-- ========================================
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- Create index for faster lookups
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Trigger to auto-update updated_at on system_settings table
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique key for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'Value of the setting (stored as text)';
COMMENT ON COLUMN system_settings.updated_by IS 'User who last updated this setting';

-- Insert initial system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('min_advance_booking_days', '3', 'Minimum number of days in advance required to book a venue'),
  ('max_advance_booking_days', '30', 'Maximum number of days in advance a venue can be booked');

-- ========================================
-- Row Level Security for venue_availability_blocks and event_feedbacks
-- ========================================
ALTER TABLE venue_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Backend can manage all venue_availability_blocks
CREATE POLICY "Backend can read all venue_availability_blocks" ON venue_availability_blocks
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert venue_availability_blocks" ON venue_availability_blocks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update venue_availability_blocks" ON venue_availability_blocks
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete venue_availability_blocks" ON venue_availability_blocks
  FOR DELETE
  USING (true);

-- Backend can manage all event_feedbacks
CREATE POLICY "Backend can read all event_feedbacks" ON event_feedbacks
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert event_feedbacks" ON event_feedbacks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update event_feedbacks" ON event_feedbacks
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete event_feedbacks" ON event_feedbacks
  FOR DELETE
  USING (true);

-- Backend can manage all system_settings
CREATE POLICY "Backend can read all system_settings" ON system_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert system_settings" ON system_settings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update system_settings" ON system_settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Backend can delete system_settings" ON system_settings
  FOR DELETE
  USING (true);

-- ========================================
-- TEST DATA
-- This section adds sample data for testing
-- Date reference: January 7, 2026
-- ========================================

-- ========================================
-- Additional Test Events with Various Statuses
-- ========================================

-- COMPLETED EVENT 1 (November 2025 - within 3 months)
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  'Web Development Workshop',
  'Hands-on workshop covering HTML, CSS, and JavaScript fundamentals',
  'campuswide',
  'workshop',
  'completed',
  '2025-11-15 09:00:00+08',
  '2025-11-15 17:00:00+08',
  '2025-11-01 10:00:00+08'
);

-- COMPLETED EVENT 2 (December 2025 - within 3 months)
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  'AI & Machine Learning Seminar',
  'Expert talks on latest trends in AI and ML',
  'facultyonly',
  'seminar',
  'completed',
  '2025-12-10 14:00:00+08',
  '2025-12-10 16:30:00+08',
  '2025-11-20 08:00:00+08'
);

-- COMPLETED EVENT 3 (Late December 2025 - 2 day event)
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  'Year-End Hackathon 2025',
  '48-hour coding marathon with prizes',
  'campuswide',
  'competition',
  'completed',
  '2025-12-20 08:00:00+08',
  '2025-12-22 08:00:00+08',
  '2025-12-01 10:00:00+08'
);

-- COMPLETED EVENT 4 (Early January 2026 - just completed)
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'a4444444-4444-4444-4444-444444444444',
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  'New Year Tech Talk',
  'Technology predictions for 2026',
  'campuswide',
  'seminar',
  'completed',
  '2026-01-03 10:00:00+08',
  '2026-01-03 12:00:00+08',
  '2025-12-15 09:00:00+08'
);

-- ONGOING EVENT (Currently happening)
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'a5555555-5555-5555-5555-555555555555',
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  'Week-Long Design Sprint',
  'Intensive design thinking workshop',
  'facultyonly',
  'workshop',
  'ongoing',
  '2026-01-06 09:00:00+08',
  '2026-01-10 18:00:00+08',
  '2025-12-20 11:00:00+08'
);

-- UPCOMING EVENTS
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'a6666666-6666-6666-6666-666666666666',
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  'Cybersecurity Workshop',
  'Learn about protecting digital assets',
  'campuswide',
  'workshop',
  'upcoming',
  '2026-01-20 13:00:00+08',
  '2026-01-20 17:00:00+08',
  '2026-01-02 14:00:00+08'
);

INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'a7777777-7777-7777-7777-777777777777',
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  'Mobile App Development Bootcamp',
  'Build your first mobile app in React Native',
  'campuswide',
  'workshop',
  'upcoming',
  '2026-02-05 09:00:00+08',
  '2026-02-07 17:00:00+08',
  '2026-01-05 10:00:00+08'
);

-- ========================================
-- Venue Bookings for the events above
-- ========================================

-- Booking for Web Development Workshop (APPROVED)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id, 
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  status, approved_user_id, approved_at,
  approval_notes, expected_attendees
)
VALUES (
  'b1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2025-11-15 09:00:00+08',
  '2025-11-15 17:00:00+08',
  '2025-11-15 08:30:00+08',
  '2025-11-15 17:30:00+08',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-11-05 14:00:00+08',
  'Approved with extra setup/teardown time',
  50
);

-- Booking for AI Seminar (APPROVED)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  status, approved_user_id, approved_at,
  expected_attendees
)
VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2025-12-10 14:00:00+08',
  '2025-12-10 16:30:00+08',
  '2025-12-10 14:00:00+08',
  '2025-12-10 16:30:00+08',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-11-25 09:00:00+08',
  30
);

-- Booking for Hackathon (APPROVED) - Multi-day
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  status, approved_user_id, approved_at,
  approval_notes, expected_attendees
)
VALUES (
  'b3333333-3333-3333-3333-333333333333',
  'a3333333-3333-3333-3333-333333333333',
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2025-12-20 08:00:00+08',
  '2025-12-22 08:00:00+08',
  '2025-12-20 08:00:00+08',
  '2025-12-22 08:00:00+08',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-12-05 16:00:00+08',
  'Approved for full 48-hour access',
  100
);

-- Booking for Tech Talk (APPROVED)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  status, approved_user_id, approved_at,
  expected_attendees
)
VALUES (
  'b4444444-4444-4444-4444-444444444444',
  'a4444444-4444-4444-4444-444444444444',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2026-01-03 10:00:00+08',
  '2026-01-03 12:00:00+08',
  '2026-01-03 10:00:00+08',
  '2026-01-03 12:00:00+08',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-12-18 11:00:00+08',
  40
);

-- Booking for Design Sprint (APPROVED - ongoing)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  status, approved_user_id, approved_at,
  expected_attendees
)
VALUES (
  'b5555555-5555-5555-5555-555555555555',
  'a5555555-5555-5555-5555-555555555555',
  (SELECT id FROM venues WHERE code LIKE '%LAB%' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2026-01-06 09:00:00+08',
  '2026-01-10 18:00:00+08',
  '2026-01-06 09:00:00+08',
  '2026-01-10 18:00:00+08',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-12-22 15:00:00+08',
  25
);

-- Booking for Cybersecurity Workshop (APPROVED - upcoming)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  status, approved_user_id, approved_at,
  expected_attendees
)
VALUES (
  'b6666666-6666-6666-6666-666666666666',
  'a6666666-6666-6666-6666-666666666666',
  (SELECT id FROM venues WHERE code LIKE '%CR%' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2026-01-20 13:00:00+08',
  '2026-01-20 17:00:00+08',
  '2026-01-20 13:00:00+08',
  '2026-01-20 17:00:00+08',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2026-01-04 10:00:00+08',
  30
);

-- Booking for Mobile App Bootcamp (PENDING - upcoming)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  status, expected_attendees
)
VALUES (
  'b7777777-7777-7777-7777-777777777777',
  'a7777777-7777-7777-7777-777777777777',
  (SELECT id FROM venues ORDER BY capacity DESC LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2026-02-05 09:00:00+08',
  '2026-02-07 17:00:00+08',
  'pending',
  60
);

-- ========================================
-- Additional Test Bookings for Faculty Review
-- ========================================

-- Pending booking request #1 (FCI venue)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time, teardown_time,
  status, remarks, expected_attendees
)
VALUES (
  'b8888888-8888-8888-8888-888888888888',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2026-01-15 14:00:00+08',
  '2026-01-15 16:00:00+08',
  30,
  15,
  'pending',
  'Need projector and sound system for technical presentation',
  150
);

-- Pending booking request #2 (FCI venue - different event)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time, teardown_time,
  status, remarks, expected_attendees
)
VALUES (
  'b9999999-9999-9999-9999-999999999999',
  'a2222222-2222-2222-2222-222222222222',
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  '2026-01-20 09:00:00+08',
  '2026-01-20 12:00:00+08',
  15,
  10,
  'pending',
  'Workshop requires computers for all participants',
  30
);

-- Pending booking request #3 (FCI venue - urgent)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time,
  status, remarks, expected_attendees
)
VALUES (
  'ba000000-a000-a000-a000-a00000000000',
  'a3333333-3333-3333-3333-333333333333',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
  '2026-01-12 13:00:00+08',
  '2026-01-12 17:00:00+08',
  45,
  'pending',
  'Annual CS Department networking event - high priority',
  200
);

-- Approved booking (for comparison)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  setup_time, teardown_time,
  status, approved_user_id, approved_at,
  approval_notes, remarks, expected_attendees
)
VALUES (
  'bb111111-b111-b111-b111-b11111111111',
  'a4444444-4444-4444-4444-444444444444',
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  '2026-01-18 10:00:00+08',
  '2026-01-18 12:00:00+08',
  '2026-01-18 10:00:00+08',
  '2026-01-18 12:00:00+08',
  20,
  10,
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' AND faculty_id = (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1) LIMIT 1),
  '2026-01-05 09:30:00+08',
  'Approved. Please ensure lab safety protocols are followed.',
  'Coding competition for students',
  25
);

-- Rejected booking (for comparison)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time,
  status, approved_user_id, approved_at,
  rejection_reason, remarks, expected_attendees
)
VALUES (
  'bc222222-c222-c222-c222-c22222222222',
  'a5555555-5555-5555-5555-555555555555',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'lisa.chong@student.edu' LIMIT 1),
  '2026-01-11 14:00:00+08',
  '2026-01-11 16:00:00+08',
  15,
  'rejected',
  (SELECT id FROM users WHERE role = 'faculty_manager' AND faculty_id = (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1) LIMIT 1),
  '2026-01-04 14:20:00+08',
  'The requested time slot conflicts with a scheduled faculty meeting. Please choose an alternative time or venue.',
  'Study group session',
  20
);

-- ========================================
-- Sample Event Participants
-- ========================================

-- Participants for Web Development Workshop
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  'a1111111-1111-1111-1111-111111111111',
  id,
  'attended',
  ('2025-11-10 ' || (10 + (random() * 13)::int) || ':' || (random() * 59)::int || ':00+08')::TIMESTAMP WITH TIME ZONE
FROM users 
WHERE role IN ('student', 'event_organizer')
LIMIT 15;

-- Participants for AI Seminar
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  'a2222222-2222-2222-2222-222222222222',
  id,
  'attended',
  ('2025-12-05 ' || (9 + (random() * 11)::int) || ':' || (random() * 59)::int || ':00+08')::TIMESTAMP WITH TIME ZONE
FROM users 
WHERE role IN ('student', 'event_organizer')
LIMIT 10;

-- Participants for Hackathon
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  'a3333333-3333-3333-3333-333333333333',
  id,
  'attended',
  ('2025-12-15 ' || (10 + (random() * 9)::int) || ':' || (random() * 59)::int || ':00+08')::TIMESTAMP WITH TIME ZONE
FROM users 
WHERE role IN ('student', 'event_organizer')
LIMIT 25;

-- Participants for Tech Talk
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  'a4444444-4444-4444-4444-444444444444',
  id,
  'attended',
  ('2025-12-28 ' || (11 + (random() * 9)::int) || ':' || (random() * 59)::int || ':00+08')::TIMESTAMP WITH TIME ZONE
FROM users 
WHERE role IN ('student', 'event_organizer')
LIMIT 12;

-- ========================================
-- Sample Feedbacks (for completed events)
-- ========================================

-- Feedback 1 for Web Development Workshop
INSERT INTO event_feedbacks (
  event_id, user_id,
  venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating,
  comments, suggestions,
  created_at
)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  5, 4, 5, 5,
  'Excellent workshop! The venue was in perfect condition and the event was well-organized. Students were very engaged throughout the session.',
  'Consider providing more power outlets for students to charge their laptops.',
  '2025-11-16 10:30:00+08'
);

-- Feedback 2 for AI Seminar (different faculty manager)
INSERT INTO event_feedbacks (
  event_id, user_id,
  venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating,
  comments, suggestions,
  created_at
)
VALUES (
  'a2222222-2222-2222-2222-222222222222',
  (SELECT id FROM users WHERE role = 'faculty_manager' OFFSET 1 LIMIT 1),
  4, 5, 4, 4,
  'Great seminar with excellent speakers. The venue audio system worked perfectly. A few minor issues with temperature control but overall very good.',
  'Would recommend scheduling similar events in the afternoon - better attendance.',
  '2025-12-11 09:00:00+08'
);

-- Feedback 3 for Hackathon
INSERT INTO event_feedbacks (
  event_id, user_id,
  venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating,
  comments, suggestions,
  created_at
)
VALUES (
  'a3333333-3333-3333-3333-333333333333',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  3, 4, 3, 4,
  'The 48-hour event was challenging to manage. Venue held up well but cleanliness became an issue by day 2. Organizers did a good job managing the large crowd.',
  'For future multi-day events, schedule cleaning breaks. Also need better waste management.',
  '2025-12-23 14:00:00+08'
);

-- Feedback 4 for Tech Talk (recent - within 24hr edit window)
INSERT INTO event_feedbacks (
  event_id, user_id,
  venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating,
  comments, suggestions,
  created_at
)
VALUES (
  'a4444444-4444-4444-4444-444444444444',
  (SELECT id FROM users WHERE role = 'faculty_manager' OFFSET 1 LIMIT 1),
  5, 5, 5, 5,
  'Perfect way to start the new year! Everything was excellent - venue was spotless, AV equipment worked flawlessly, and the event ran right on schedule.',
  'No suggestions - this was a model event!',
  '2026-01-06 08:00:00+08'
);

-- ========================================
-- Additional Venue Availability Blocks
-- ========================================

-- Maintenance block
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  '2026-01-25 00:00:00+08',
  '2026-01-27 23:59:00+08',
  'Annual maintenance and equipment upgrade',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1)
);

-- ========================================
-- Additional Test Data for Record Attendance Feature (UC-12)
-- ========================================

-- Additional participants for "Campus Tech Workshop" (e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1)
-- Already have participations in main data section above, skipping duplicates

-- Additional participants for "Annual Sports Day" (e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3)
-- Already have participations in main data section above, skipping duplicates

-- Faculty event block
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  '2026-02-10 08:00:00+08',
  '2026-02-12 18:00:00+08',
  'Faculty retreat and planning session',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1)
);
-- ========================================
-- Sample Custom Registration Fields for Testing
-- ========================================

-- Add custom fields to "Annual Sports Day" event
INSERT INTO event_registration_fields (event_id, field_type, label, help_text, is_required, options, order_index)
VALUES 
  (
    (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
    'dropdown',
    'T-Shirt Size',
    'Select your preferred T-shirt size for the event',
    true,
    '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb,
    0
  ),
  (
    (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
    'checkbox',
    'Sports Interested In',
    'Select all sports you would like to participate in',
    true,
    '["Basketball", "Football", "Badminton", "Table Tennis", "Volleyball"]'::jsonb,
    1
  ),
  (
    (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
    'text',
    'Emergency Contact Name',
    'Full name of emergency contact person',
    true,
    null,
    2
  ),
  (
    (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
    'phone',
    'Emergency Contact Number',
    'Phone number of emergency contact person',
    true,
    null,
    3
  ),
  (
    (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
    'textarea',
    'Medical Conditions',
    'Please list any medical conditions we should be aware of (or write "None")',
    false,
    null,
    4
  );

-- ========================================
-- ADDITIONAL TEST DATA FOR CALENDAR VIEW
-- Testing venue bookings and resource requests with various statuses
-- Date reference: January 8, 2026
-- ========================================

-- ========================================
-- More Test Events for Calendar
-- ========================================

-- Event for January 2026 (this month)
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'Python Programming Workshop',
  'Introduction to Python for beginners',
  'campuswide',
  'workshop',
  'upcoming',
  '2026-01-22 09:00:00+08',
  '2026-01-22 17:00:00+08',
  '2026-01-02 10:00:00+08'
);

INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'c2222222-2222-2222-2222-222222222222',
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  'Cloud Computing Seminar',
  'AWS and Azure platform overview',
  'facultyonly',
  'seminar',
  'upcoming',
  '2026-01-28 14:00:00+08',
  '2026-01-28 17:00:00+08',
  '2026-01-03 11:00:00+08'
);

INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'Student Orientation 2026',
  'Welcome new semester students',
  'campuswide',
  'orientation',
  'upcoming',
  '2026-02-01 08:00:00+08',
  '2026-02-03 18:00:00+08',
  '2026-01-05 09:00:00+08'
);

-- Multi-day event
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'c4444444-4444-4444-4444-444444444444',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  'Data Science Conference 2026',
  '3-day conference on data science and analytics',
  'campuswide',
  'seminar',
  'upcoming',
  '2026-02-15 08:00:00+08',
  '2026-02-17 18:00:00+08',
  '2026-01-05 14:00:00+08'
);

INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime, created_at)
VALUES (
  'c5555555-5555-5555-5555-555555555555',
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  'Game Development Workshop',
  'Unity and Unreal Engine basics',
  'campuswide',
  'workshop',
  'upcoming',
  '2026-01-30 13:00:00+08',
  '2026-01-30 17:00:00+08',
  '2026-01-06 10:00:00+08'
);

-- ========================================
-- Venue Bookings with Different Statuses (January - February 2026)
-- ========================================

-- APPROVED: Python Workshop at Media Production Studio (FCI venue)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  setup_time, teardown_time,
  status, approved_user_id, approved_at,
  approval_notes, remarks, expected_attendees
)
VALUES (
  '1b111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  (SELECT id FROM venues WHERE code = 'STUDIO-FAC-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  '2026-01-22 09:00:00+08',
  '2026-01-22 17:00:00+08',
  '2026-01-22 08:30:00+08',
  '2026-01-22 17:30:00+08',
  30,
  30,
  'approved',
  (SELECT id FROM users WHERE email = 'james.lee@fac.edu' LIMIT 1),
  '2026-01-04 15:00:00+08',
  'Approved with extended setup time for equipment',
  'Full-day programming workshop with hands-on coding',
  50
);

-- PENDING: Cloud Computing Seminar at Computer Lab 1 (FCI venue)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time, teardown_time,
  status, remarks, expected_attendees
)
VALUES (
  '1b222222-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  '2026-01-28 14:00:00+08',
  '2026-01-28 17:00:00+08',
  15,
  10,
  'pending',
  'Need all computers updated with latest cloud SDKs',
  35
);

-- APPROVED: Student Orientation (Multi-day) at Lecture Theatre 1
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  setup_time, teardown_time,
  status, approved_user_id, approved_at,
  approval_notes, remarks, expected_attendees
)
VALUES (
  '1b333333-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  '2026-02-01 08:00:00+08',
  '2026-02-03 18:00:00+08',
  '2026-02-01 07:00:00+08',
  '2026-02-03 19:00:00+08',
  60,
  60,
  'approved',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  '2026-01-06 10:00:00+08',
  'Approved for 3-day orientation. Ensure AV equipment is ready.',
  'New student orientation program with presentations and activities',
  200
);

-- REJECTED: Game Dev Workshop at Business Case Room (wrong faculty)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time, teardown_time,
  status, approved_user_id, approved_at,
  rejection_reason, remarks, expected_attendees
)
VALUES (
  '1b444444-4444-4444-4444-444444444444',
  'c5555555-5555-5555-5555-555555555555',
  (SELECT id FROM venues WHERE code = 'CR-FOB-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  '2026-01-30 13:00:00+08',
  '2026-01-30 17:00:00+08',
  20,
  15,
  'rejected',
  (SELECT id FROM users WHERE email = 'maria.garcia@fob.edu' LIMIT 1),
  '2026-01-07 09:00:00+08',
  'This venue is not suitable for technical workshops. Please book a computer lab instead.',
  'Game development hands-on workshop',
  30
);

-- PENDING: Game Dev Workshop (resubmitted) at Computer Lab 1
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time, teardown_time,
  status, remarks, expected_attendees
)
VALUES (
  '1b445555-5555-5555-5555-555555555555',
  'c5555555-5555-5555-5555-555555555555',
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  '2026-01-30 13:00:00+08',
  '2026-01-30 17:00:00+08',
  20,
  15,
  'pending',
  'Resubmitted with correct venue - game development workshop with Unity',
  30
);

-- APPROVED: Data Science Conference Day 1 at Lecture Theatre 1
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  setup_time, teardown_time,
  status, approved_user_id, approved_at,
  approval_notes, remarks, expected_attendees
)
VALUES (
  '1b555555-5555-5555-5555-555555555555',
  'c4444444-4444-4444-4444-444444444444',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  '2026-02-15 08:00:00+08',
  '2026-02-15 18:00:00+08',
  '2026-02-15 07:00:00+08',
  '2026-02-15 19:00:00+08',
  60,
  60,
  'approved',
  (SELECT id FROM users WHERE email = 'david.tan@fci.edu' LIMIT 1),
  '2026-01-07 11:00:00+08',
  'Approved. Conference will need dedicated IT support staff.',
  'Day 1: Opening keynote and morning sessions',
  150
);

-- CANCELLED: Data Science Conference Day 2 (moved to virtual)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  setup_time, teardown_time,
  status, approved_user_id, approved_at,
  cancellation_reason, remarks, expected_attendees
)
VALUES (
  '1b666666-6666-6666-6666-666666666666',
  'c4444444-4444-4444-4444-444444444444',
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  '2026-02-16 08:00:00+08',
  '2026-02-16 18:00:00+08',
  '2026-02-16 07:00:00+08',
  '2026-02-16 19:00:00+08',
  60,
  60,
  'cancelled',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  '2026-01-07 11:00:00+08',
  'Day 2 sessions moved to online format due to speaker availability',
  'Day 2: Technical workshops (now virtual)',
  120
);

-- PENDING: Additional workshop at Seminar Room 1 (FOM venue)
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  setup_time, teardown_time,
  status, remarks, expected_attendees
)
VALUES (
  '1b777777-7777-7777-7777-777777777777',
  'a6666666-6666-6666-6666-666666666666',
  (SELECT id FROM venues WHERE code = 'SR-FOM-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  '2026-02-20 09:00:00+08',
  '2026-02-20 12:00:00+08',
  15,
  10,
  'pending',
  'Cross-faculty collaboration workshop',
  40
);

-- APPROVED: Quick meeting at Computer Lab 2
INSERT INTO venue_bookings (
  id, event_id, venue_id, requester_user_id,
  requested_start_datetime, requested_end_datetime,
  approved_start_datetime, approved_end_datetime,
  setup_time, teardown_time,
  status, approved_user_id, approved_at,
  remarks, expected_attendees
)
VALUES (
  '1b888888-8888-8888-8888-888888888888',
  'a1111111-1111-1111-1111-111111111111',
  (SELECT id FROM venues WHERE code = 'LAB-CS-02' LIMIT 1),
  (SELECT id FROM users WHERE email = 'john.student@student.edu' LIMIT 1),
  '2026-01-16 10:00:00+08',
  '2026-01-16 12:00:00+08',
  '2026-01-16 10:00:00+08',
  '2026-01-16 12:00:00+08',
  10,
  5,
  'approved',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  '2026-01-08 08:00:00+08',
  'Quick project team meeting',
  15
);

-- ========================================
-- Resource Requests (linked to venue bookings above)
-- ========================================

-- Resource request for Python Workshop (APPROVED venue)
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, approval_notes, setup_instructions
)
VALUES (
  '12111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  '1b111111-1111-1111-1111-111111111111',
  (SELECT id FROM resource_types WHERE code = 'PROJ-LCD' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  2,
  '2026-01-22 08:30:00+08',
  '2026-01-22 17:30:00+08',
  'approved',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  '2026-01-05 10:00:00+08',
  'Approved. Projectors will be set up before event.',
  'Need projectors for dual-screen coding demonstrations'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, setup_instructions
)
VALUES (
  '12112222-2222-2222-2222-222222222222',
  'c1111111-1111-1111-1111-111111111111',
  '1b111111-1111-1111-1111-111111111111',
  (SELECT id FROM resource_types WHERE code = 'MIC-WL' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  1,
  '2026-01-22 08:30:00+08',
  '2026-01-22 17:30:00+08',
  'approved',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  '2026-01-05 10:00:00+08',
  'Wireless microphone for instructor'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, setup_instructions
)
VALUES (
  '12113333-3333-3333-3333-333333333333',
  'c1111111-1111-1111-1111-111111111111',
  '1b111111-1111-1111-1111-111111111111',
  (SELECT id FROM resource_types WHERE code = 'SNACK-PKG' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  2,
  '2026-01-22 10:00:00+08',
  '2026-01-22 15:00:00+08',
  'pending',
  'Morning and afternoon break refreshments for 50 people'
);

-- Resource requests for Cloud Computing Seminar (PENDING venue)
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, setup_instructions
)
VALUES (
  '12221111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  '1b222222-2222-2222-2222-222222222222',
  (SELECT id FROM resource_types WHERE code = 'PROJ-LCD' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  1,
  '2026-01-28 14:00:00+08',
  '2026-01-28 17:00:00+08',
  'pending',
  'Projector for presentation slides'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, setup_instructions
)
VALUES (
  '12222222-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  '1b222222-2222-2222-2222-222222222222',
  (SELECT id FROM resource_types WHERE code = 'WB-MOBILE' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  1,
  '2026-01-28 14:00:00+08',
  '2026-01-28 17:00:00+08',
  'pending',
  'Whiteboard for architecture diagrams'
);

-- Resource requests for Student Orientation (Multi-day, APPROVED venue)
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, approval_notes, setup_instructions
)
VALUES (
  '12331111-1111-1111-1111-111111111111',
  'c3333333-3333-3333-3333-333333333333',
  '1b333333-3333-3333-3333-333333333333',
  (SELECT id FROM resource_types WHERE code = 'SOUND-PA' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  1,
  '2026-02-01 07:00:00+08',
  '2026-02-03 19:00:00+08',
  'approved',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  '2026-01-06 14:00:00+08',
  'PA system approved for entire 3-day event',
  'Full PA system for large audience presentations'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, setup_instructions
)
VALUES (
  '12332222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  '1b333333-3333-3333-3333-333333333333',
  (SELECT id FROM resource_types WHERE code = 'PROJ-LCD' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  2,
  '2026-02-01 07:00:00+08',
  '2026-02-03 19:00:00+08',
  'approved',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  '2026-01-06 14:00:00+08',
  'Two projectors for dual screen presentation'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, setup_instructions
)
VALUES (
  '12333333-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  '1b333333-3333-3333-3333-333333333333',
  (SELECT id FROM resource_types WHERE code = 'CHAIR-FOLD' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  50,
  '2026-02-01 07:00:00+08',
  '2026-02-03 19:00:00+08',
  'approved',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  '2026-01-06 14:00:00+08',
  'Extra seating for overflow crowd'
);

-- Resource request for Game Dev Workshop resubmitted (PENDING venue)
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, setup_instructions
)
VALUES (
  '12551111-1111-1111-1111-111111111111',
  'c5555555-5555-5555-5555-555555555555',
  '1b445555-5555-5555-5555-555555555555',
  (SELECT id FROM resource_types WHERE code = 'PROJ-LCD' LIMIT 1),
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  1,
  '2026-01-30 13:00:00+08',
  '2026-01-30 17:00:00+08',
  'pending',
  'Projector for Unity demo and tutorials'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, setup_instructions
)
VALUES (
  '12552222-2222-2222-2222-222222222222',
  'c5555555-5555-5555-5555-555555555555',
  '1b445555-5555-5555-5555-555555555555',
  (SELECT id FROM resource_types WHERE code = 'MIC-WL' LIMIT 1),
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  1,
  '2026-01-30 13:00:00+08',
  '2026-01-30 17:00:00+08',
  'pending',
  'Wireless mic for presenter'
);

-- Resource requests for Data Science Conference Day 1 (APPROVED venue)
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, approval_notes, setup_instructions
)
VALUES (
  '12661111-1111-1111-1111-111111111111',
  'c4444444-4444-4444-4444-444444444444',
  '1b555555-5555-5555-5555-555555555555',
  (SELECT id FROM resource_types WHERE code = 'SOUND-PA' LIMIT 1),
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  1,
  '2026-02-15 07:00:00+08',
  '2026-02-15 19:00:00+08',
  'approved',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  '2026-01-07 13:00:00+08',
  'Premium PA system reserved for conference',
  'High-quality sound system for keynote speakers'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, setup_instructions
)
VALUES (
  '12662222-2222-2222-2222-222222222222',
  'c4444444-4444-4444-4444-444444444444',
  '1b555555-5555-5555-5555-555555555555',
  (SELECT id FROM resource_types WHERE code = 'LAPTOP-PRES' LIMIT 1),
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  2,
  '2026-02-15 07:00:00+08',
  '2026-02-15 19:00:00+08',
  'approved',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  '2026-01-07 13:00:00+08',
  'Backup laptops for speakers'
);

-- REJECTED resource request (excessive quantity)
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, approved_by, approved_at, rejection_reason, setup_instructions
)
VALUES (
  '12663333-3333-3333-3333-333333333333',
  'c4444444-4444-4444-4444-444444444444',
  '1b555555-5555-5555-5555-555555555555',
  (SELECT id FROM resource_types WHERE code = 'CHAIR-FOLD' LIMIT 1),
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  150,
  '2026-02-15 07:00:00+08',
  '2026-02-15 19:00:00+08',
  'rejected',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  '2026-01-07 13:00:00+08',
  'Venue capacity is only 120 people. Requested quantity exceeds safety limits. Please reduce to maximum 20 extra chairs.',
  'Extra chairs for overflow seating'
);

-- CANCELLED resource request
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, cancellation_reason, setup_instructions
)
VALUES (
  '12771111-1111-1111-1111-111111111111',
  'c3333333-3333-3333-3333-333333333333',
  '1b333333-3333-3333-3333-333333333333',
  (SELECT id FROM resource_types WHERE code = 'LED-SCREEN' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  1,
  '2026-02-01 07:00:00+08',
  '2026-02-03 19:00:00+08',
  'cancelled',
  'Changed to use venue''s built-in screens instead',
  'LED screen for outdoor signage'
);

-- Additional pending requests
INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, setup_instructions
)
VALUES (
  '12881111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  '1b111111-1111-1111-1111-111111111111',
  (SELECT id FROM resource_types WHERE code = 'TABLE-6FT' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  10,
  '2026-01-22 08:30:00+08',
  '2026-01-22 17:30:00+08',
  'pending',
  'Tables for hands-on coding stations'
);

INSERT INTO resource_requests (
  id, event_id, venue_booking_id, resource_id, requester_user_id,
  requested_quantity, usage_start_datetime, usage_end_datetime,
  status, setup_instructions
)
VALUES (
  '12882222-2222-2222-2222-222222222222',
  'a6666666-6666-6666-6666-666666666666',
  '1b888888-8888-8888-8888-888888888888',
  (SELECT id FROM resource_types WHERE code = 'WB-MOBILE' LIMIT 1),
  (SELECT id FROM users WHERE email = 'john.student@student.edu' LIMIT 1),
  1,
  '2026-01-16 10:00:00+08',
  '2026-01-16 12:00:00+08',
  'pending',
  'Whiteboard for brainstorming session'
);

-- ========================================
-- More Venue Availability Blocks for Calendar Testing
-- ========================================

-- Block during January (current month)
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  '2026-01-18 08:00:00+08',
  '2026-01-18 12:00:00+08',
  'Emergency AV equipment upgrade',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1)
);

-- Block for cleaning
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'LAB-CS-02' LIMIT 1),
  '2026-01-24 18:00:00+08',
  '2026-01-25 08:00:00+08',
  'Deep cleaning and maintenance',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1)
);

-- Multi-day block
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'CR-FOB-01' LIMIT 1),
  '2026-02-08 00:00:00+08',
  '2026-02-10 23:59:00+08',
  'Faculty strategic planning retreat',
  (SELECT id FROM users WHERE email = 'maria.garcia@fob.edu' LIMIT 1)
);

-- Block for different venue
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'SR-FOM-01' LIMIT 1),
  '2026-02-14 00:00:00+08',
  '2026-02-14 23:59:00+08',
  'Valentine''s Day staff event',
  (SELECT id FROM users WHERE email = 'robert.chen@fom.edu' LIMIT 1)
);

-- Block for renovation
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'STUDIO-FAC-01' LIMIT 1),
  '2026-01-20 14:00:00+08',
  '2026-01-20 18:00:00+08',
  'Studio equipment upgrade',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1)
);

-- Block for exam preparation
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  '2026-01-27 00:00:00+08',
  '2026-01-27 23:59:00+08',
  'Exam materials setup',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1)
);

-- Multi-day conference block
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'CR-FOB-01' LIMIT 1),
  '2026-02-20 08:00:00+08',
  '2026-02-22 18:00:00+08',
  'International business summit',
  (SELECT id FROM users WHERE email = 'maria.garcia@fob.edu' LIMIT 1)
);

-- Block for maintenance
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'LAB-CS-02' LIMIT 1),
  '2026-02-05 12:00:00+08',
  '2026-02-05 15:00:00+08',
  'Network infrastructure upgrade',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1)
);

-- Block for special event
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'SR-FOM-01' LIMIT 1),
  '2026-01-15 10:00:00+08',
  '2026-01-15 16:00:00+08',
  'Dean''s meeting with department heads',
  (SELECT id FROM users WHERE email = 'robert.chen@fom.edu' LIMIT 1)
);

-- ========================================
-- APPENDED TEST DATA: package booking sample (from test_data/complete_package_test_data.sql)
-- Note: verification queries omitted to keep schema file focused on data
-- ========================================

-- STEP 1: Create Test Users
INSERT INTO users (id, email, name, password, role, staff_id, status, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'organizer@university.edu',
  'John Organizer',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP',
  'event_organizer',
  'ORG001',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO users (id, email, name, password, role, faculty_id, staff_id, status, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'fmanager@university.edu',
  'Sarah Faculty Manager',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP',
  'faculty_manager',
  '33333333-3333-3333-3333-333333333333',
  'FM001',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- STEP 2: Create Test Faculty
INSERT INTO faculties (id, code, name, description, status, created_at, updated_at)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'FCI',
  'Faculty of Computing and Informatics',
  'Faculty managing computing and IT programs',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- STEP 3: Create Test Venues
INSERT INTO venues (id, faculty_id, code, name, location, capacity, status, created_at, updated_at)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  'AUD-FCI-01',
  'Main Auditorium',
  'Ground Floor, Block A',
  300,
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO venues (id, faculty_id, code, name, location, capacity, status, created_at, updated_at)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  'LH-FCI-01',
  'Lecture Hall 1',
  'Level 2, Block A',
  100,
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO venues (id, faculty_id, code, name, location, capacity, status, created_at, updated_at)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '33333333-3333-3333-3333-333333333333',
  'LH-FCI-02',
  'Lecture Hall 2',
  'Level 2, Block A',
  100,
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- STEP 4: Create Resource Categories
INSERT INTO resource_categories (id, code, name, description, status, created_at, updated_at)
VALUES 
  ('77777777-7777-7777-7777-777777777777', 'AV', 'Audio/Visual', 'Audio visual equipment', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('88888888-8888-8888-8888-888888888888', 'FURN', 'Furniture', 'Tables, chairs, etc.', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('99999999-9999-9999-9999-999999999999', 'IT', 'IT Equipment', 'Computers, routers, etc.', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- STEP 5: Create Resource Types
INSERT INTO resource_types (id, category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, created_at, updated_at)
VALUES (
  'aaaaaaaa-1111-1111-1111-111111111111',
  '77777777-7777-7777-7777-777777777777',
  'PROJ-HD',
  'HD Projector',
  'High definition projector with HDMI',
  10,
  10,
  'units',
  'active',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO resource_types (id, category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, created_at, updated_at)
VALUES (
  'bbbbbbbb-2222-2222-2222-222222222222',
  '77777777-7777-7777-7777-777777777777',
  'MIC-WL',
  'Wireless Microphone',
  'Professional wireless microphone system',
  20,
  20,
  'units',
  'active',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO resource_types (id, category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, created_at, updated_at)
VALUES (
  'cccccccc-3333-3333-3333-333333333333',
  '88888888-8888-8888-8888-888888888888',
  'CHR-STD',
  'Standard Chair',
  'Stackable event chairs',
  500,
  500,
  'units',
  'active',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT INTO resource_types (id, category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, created_at, updated_at)
VALUES (
  'dddddddd-4444-4444-4444-444444444444',
  '88888888-8888-8888-8888-888888888888',
  'WB-MOB',
  'Mobile Whiteboard',
  'Portable whiteboard with stand',
  15,
  15,
  'units',
  'active',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- STEP 6: Create Test Event
INSERT INTO events (
  id,
  organizer_id,
  event_name,
  description,
  visibility,
  event_type,
  status,
  registration_status,
  expected_attendees,
  registration_limit,
  start_datetime,
  end_datetime,
  created_at,
  updated_at
) VALUES (
  'eeeeeeee-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'Annual Tech Conference 2026',
  'A large-scale technology conference requiring multiple venues and resources. This event demonstrates the package booking feature with 3 venue bookings and 4 resource requests.',
  'public',
  'conference',
  'upcoming',
  'open',
  250,
  300,
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ========================================
-- MIGRATIONS MERGED: 2026-01-09 .. 2026-01-10
-- 1) Add `staff_id` to users
-- 2) Add `registration_limit` to events
-- 3) Ensure `package_id` support for venue_bookings and resource_requests (idempotent)
-- ========================================

-- Migration: Add staff_id column to users table
-- Description: Student ID (matric number) and Staff ID for organizers/managers/admins
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id VARCHAR(50) UNIQUE;

-- Add index for staff_id lookups
CREATE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id);

-- Add comment to explain the field
COMMENT ON COLUMN users.staff_id IS 'Student ID (matric number) for students, Staff ID for event organizers/administrators/faculty managers';

-- Migration: Add registration_limit column to events table
-- Purpose: Allow event organizers to set optional registration limits
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_limit INTEGER;
COMMENT ON COLUMN events.registration_limit IS 'Optional limit for event registrations. If NULL, uses venue capacity from approved booking.';

-- Migration: Add package support for venue bookings and resource requests
-- Purpose: Allow multiple venues and resources to be requested as a single package
ALTER TABLE venue_bookings ADD COLUMN IF NOT EXISTS package_id UUID;
ALTER TABLE resource_requests ADD COLUMN IF NOT EXISTS package_id UUID;

-- Create indexes for package queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_venue_bookings_package_id ON venue_bookings(package_id);
CREATE INDEX IF NOT EXISTS idx_resource_requests_package_id ON resource_requests(package_id);

-- Add comments
COMMENT ON COLUMN venue_bookings.package_id IS 'Groups multiple venue bookings into one package request. NULL for legacy single bookings.';
COMMENT ON COLUMN resource_requests.package_id IS 'Groups multiple resource requests into one package request. NULL for legacy single requests.';
