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
-- 11. resources - Campus resources (equipment, furniture, etc.)
-- 12. resource_requests - Resource requests for events
-- 13. venue_availability_blocks - Venue blocked time slots
-- 14. event_feedbacks - Feedback from faculty staff on completed events
-- ========================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- Drop existing tables (in reverse order of dependencies)
-- ========================================
DROP TABLE IF EXISTS event_feedbacks CASCADE;
DROP TABLE IF EXISTS venue_availability_blocks CASCADE;
DROP TABLE IF EXISTS resource_requests CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
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
-- Table: resources
-- Stores available campus resources (equipment, furniture, etc.)
-- ========================================
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'audio_visual', 'furniture', 'it_equipment', 'catering', 'other'
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0, -- Total number available
  available_quantity INTEGER NOT NULL DEFAULT 0, -- Currently available
  unit VARCHAR(50), -- 'pieces', 'sets', 'units'
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
  managed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Faculty manager or admin
  notes TEXT, -- Usage restrictions, special instructions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for resources
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_managed_by ON resources(managed_by);

-- ========================================
-- Table: resource_requests
-- Stores resource requests for events
-- ========================================
CREATE TABLE resource_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_booking_id UUID NOT NULL REFERENCES venue_bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
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

-- ========================================
-- Row Level Security (RLS)
-- ========================================
-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
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

-- Backend can manage all resources
CREATE POLICY "Backend can read all resources" ON resources
  FOR SELECT
  USING (true);

CREATE POLICY "Backend can insert resources" ON resources
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Backend can update resources" ON resources
  FOR UPDATE
  USING (true);

CREATE POLICY "Backend can delete resources" ON resources
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
INSERT INTO users (email, name, password, role, status) VALUES
  ('john.student@student.edu', 'John Student', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active'),
  ('admin@university.edu', 'System Administrator', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'administrator', 'active'),
  ('sarah.organizer@university.edu', 'Sarah Organizer', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'event_organizer', 'active'),
  ('blocked.user@student.edu', 'Blocked User', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'blocked'),
  ('inactive.user@student.edu', 'Inactive User', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'inactive'),
  ('alice.wong@fci.edu', 'Dr. Alice Wong', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active'),
  ('david.tan@fci.edu', 'Dr. David Tan', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active'),
  ('robert.chen@fom.edu', 'Dr. Robert Chen', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active'),
  ('maria.garcia@fob.edu', 'Dr. Maria Garcia', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active'),
  ('james.lee@fac.edu', 'Dr. James Lee', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'faculty_manager', 'active'),
  ('emily.tan@student.edu', 'Emily Tan', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active'),
  ('michael.kumar@student.edu', 'Michael Kumar', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active'),
  ('lisa.chong@student.edu', 'Lisa Chong', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active'),
  ('david.lim@student.edu', 'David Lim', '$2a$10$g2ALFzfYf4jpTmp7bCIzd.5cael8S5xBTGOn8FEyda1Bnt/.ebzV2', 'student', 'active');

-- Sample Faculties Data
INSERT INTO faculties (code, name, description, status) VALUES
  ('FCI', 'Faculty of Computing and Informatics', 'Specializes in computer science, software engineering, information systems, and data analytics.', 'active'),
  ('FOM', 'Faculty of Management', 'Focuses on business management, leadership, human resource management, and organizational behavior.', 'active'),
  ('FOB', 'Faculty of Business', 'Covers accounting, finance, marketing, and entrepreneurship.', 'active'),
  ('FAC', 'Faculty of Applied Communication', 'Specializes in media studies, public relations, journalism, and digital communication.', 'active');

-- Add foreign key constraint for users.faculty_id (after faculties table exists)
ALTER TABLE users 
ADD CONSTRAINT fk_users_faculty 
FOREIGN KEY (faculty_id) 
REFERENCES faculties(id) 
ON DELETE SET NULL;

-- Create index on faculty_id for faster lookups
CREATE INDEX idx_users_faculty_id ON users(faculty_id);

-- Update users with faculty assignments (only faculty_managers and students from specific faculties)
UPDATE users SET faculty_id = (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1) WHERE email IN ('alice.wong@fci.edu', 'david.tan@fci.edu', 'emily.tan@student.edu');
UPDATE users SET faculty_id = (SELECT id FROM faculties WHERE code = 'FOM' LIMIT 1) WHERE email IN ('robert.chen@fom.edu', 'michael.kumar@student.edu');
UPDATE users SET faculty_id = (SELECT id FROM faculties WHERE code = 'FOB' LIMIT 1) WHERE email IN ('maria.garcia@fob.edu', 'lisa.chong@student.edu');
UPDATE users SET faculty_id = (SELECT id FROM faculties WHERE code = 'FAC' LIMIT 1) WHERE email IN ('james.lee@fac.edu', 'david.lim@student.edu');

-- Sample Venues Data
INSERT INTO venues (faculty_id, code, name, location, capacity, status)
SELECT 
  (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1),
  'LT-FCI-01',
  'Lecture Theatre 1',
  'Level 2',
  150,
  'active'
WHERE EXISTS (SELECT 1 FROM faculties WHERE code = 'FCI');

INSERT INTO venues (faculty_id, code, name, location, capacity, status)
SELECT 
  (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1),
  'LAB-CS-01',
  'Computer Lab 1',
  'Level 3',
  40,
  'active'
WHERE EXISTS (SELECT 1 FROM faculties WHERE code = 'FCI');

INSERT INTO venues (faculty_id, code, name, location, capacity, status)
SELECT 
  (SELECT id FROM faculties WHERE code = 'FOM' LIMIT 1),
  'SR-FOM-01',
  'Seminar Room 1',
  'Level 1',
  30,
  'active'
WHERE EXISTS (SELECT 1 FROM faculties WHERE code = 'FOM');

INSERT INTO venues (faculty_id, code, name, location, capacity, status)
SELECT 
  (SELECT id FROM faculties WHERE code = 'FOB' LIMIT 1),
  'CR-FOB-01',
  'Business Case Room',
  'Level 2',
  25,
  'active'
WHERE EXISTS (SELECT 1 FROM faculties WHERE code = 'FOB');

INSERT INTO venues (faculty_id, code, name, location, capacity, status)
SELECT 
  (SELECT id FROM faculties WHERE code = 'FAC' LIMIT 1),
  'STUDIO-FAC-01',
  'Media Production Studio',
  'Ground Floor',
  20,
  'active'
WHERE EXISTS (SELECT 1 FROM faculties WHERE code = 'FAC');

INSERT INTO venues (faculty_id, code, name, location, capacity, status)
SELECT 
  (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1),
  'LAB-CS-02',
  'Computer Lab 2',
  'Level 3',
  40,
  'maintenance'
WHERE EXISTS (SELECT 1 FROM faculties WHERE code = 'FCI');

-- Sample Events Data
-- Events can be created by students, faculty_managers, and event_organizers
-- Event types can include custom values (stored directly when 'Other' is selected)
-- Visibility: campuswide (all), facultyonly (same faculty), inviteonly (explicit invites)
INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'Campus Tech Workshop',
  'Learn about the latest web technologies and frameworks. Open to all students and faculty.',
  'campuswide',
  'workshop',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '3 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'sarah.organizer@university.edu');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'Annual Sports Day',
  'Inter-department sports competition. All students welcome!',
  'campuswide',
  'sports',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP + INTERVAL '14 days' + INTERVAL '8 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'sarah.organizer@university.edu');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  'FCI Faculty Development Seminar',
  'Professional development workshop for Faculty of Computing and Informatics members only.',
  'facultyonly',
  'seminar',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '5 days',
  CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'alice.wong@fci.edu');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'john.student@student.edu' LIMIT 1),
  'Cultural Night 2025',
  'Celebrate diversity with performances, food, and cultural exhibitions from around the world.',
  'campuswide',
  'cultural',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '21 days',
  CURRENT_TIMESTAMP + INTERVAL '21 days' + INTERVAL '5 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'john.student@student.edu');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  'Hackathon 2025',
  'Join us for a 24-hour coding challenge! Build innovative solutions and win prizes.',
  'campuswide',
  'workshop',
  'ongoing',
  CURRENT_TIMESTAMP - INTERVAL '2 hours',
  CURRENT_TIMESTAMP + INTERVAL '22 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'emily.tan@student.edu');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'Career Fair',
  'Meet recruiters from top companies. Bring your resume!',
  'campuswide',
  'career',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '10 days',
  CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '6 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'sarah.organizer@university.edu');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'Alumni Meetup',
  'Private networking event for selected alumni and current students.',
  'inviteonly',
  'networking',
  'upcoming',
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '30 days' + INTERVAL '4 hours'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'sarah.organizer@university.edu');

INSERT INTO events (organizer_id, event_name, description, visibility, event_type, status, start_datetime, end_datetime)
SELECT 
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'Orientation Week',
  'Welcome new students! Campus tours, registration assistance, and meet your peers.',
  'campuswide',
  'orientation',
  'completed',
  CURRENT_TIMESTAMP - INTERVAL '30 days',
  CURRENT_TIMESTAMP - INTERVAL '25 days'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'sarah.organizer@university.edu');

-- ========================================
-- Sample Venue Bookings Data
-- ========================================
INSERT INTO venue_bookings (event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, approved_start_datetime, approved_end_datetime, setup_time, teardown_time, status, approved_user_id, approved_at, remarks, expected_attendees)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Campus Tech Workshop' LIMIT 1),
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '3 hours',
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  CURRENT_TIMESTAMP + INTERVAL '7 days' + INTERVAL '3 hours',
  30, -- 30 min setup
  15, -- 15 min teardown
  'approved',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  'Web development workshop for all students',
  100
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Campus Tech Workshop');

INSERT INTO venue_bookings (event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, setup_time, status, remarks, expected_attendees)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
  (SELECT id FROM venues WHERE code = 'SR-FOM-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  CURRENT_TIMESTAMP + INTERVAL '14 days',
  CURRENT_TIMESTAMP + INTERVAL '14 days' + INTERVAL '8 hours',
  60, -- 1 hour setup
  'pending',
  'Sports day registration desk',
  250
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Annual Sports Day');

INSERT INTO venue_bookings (event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, approved_start_datetime, approved_end_datetime, setup_time, teardown_time, status, approved_user_id, approved_at, approval_notes, remarks, expected_attendees)
SELECT 
  (SELECT id FROM events WHERE event_name = 'FCI Faculty Development Seminar' LIMIT 1),
  (SELECT id FROM venues WHERE code = 'LT-FCI-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  CURRENT_TIMESTAMP + INTERVAL '5 days',
  CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '2 hours',
  CURRENT_TIMESTAMP + INTERVAL '5 days',
  CURRENT_TIMESTAMP + INTERVAL '5 days' + INTERVAL '2 hours',
  15,
  10,
  'approved',
  (SELECT id FROM users WHERE email = 'david.tan@fci.edu' LIMIT 1),
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Approved. Please coordinate with IT for projector setup.',
  'Professional development for FCI faculty',
  25
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'FCI Faculty Development Seminar');

INSERT INTO venue_bookings (event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, approved_start_datetime, approved_end_datetime, setup_time, teardown_time, status, approved_user_id, approved_at, remarks, expected_attendees)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Hackathon 2025' LIMIT 1),
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  CURRENT_TIMESTAMP - INTERVAL '2 hours',
  CURRENT_TIMESTAMP + INTERVAL '22 hours',
  CURRENT_TIMESTAMP - INTERVAL '2 hours',
  CURRENT_TIMESTAMP + INTERVAL '22 hours',
  120, -- 2 hours setup
  60, -- 1 hour cleanup
  'approved',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  '24-hour coding challenge',
  35
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Hackathon 2025');

INSERT INTO venue_bookings (event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, setup_time, status, rejection_reason, remarks, expected_attendees)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Career Fair' LIMIT 1),
  (SELECT id FROM venues WHERE code = 'LAB-CS-02' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  CURRENT_TIMESTAMP + INTERVAL '10 days',
  CURRENT_TIMESTAMP + INTERVAL '10 days' + INTERVAL '6 hours',
  90,
  'rejected',
  'Venue is under maintenance. Please select an alternative venue.',
  'Career fair with multiple company booths',
  200
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Career Fair');

INSERT INTO venue_bookings (event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, setup_time, status, cancellation_reason, remarks, expected_attendees)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Alumni Meetup' LIMIT 1),
  (SELECT id FROM venues WHERE code = 'CR-FOB-01' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  CURRENT_TIMESTAMP + INTERVAL '30 days' + INTERVAL '4 hours',
  30,
  'cancelled',
  'Event moved to online format due to scheduling conflicts',
  'Alumni networking event',
  20
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Alumni Meetup');

-- ========================================
-- Sample Event Participation Data
-- ========================================
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Campus Tech Workshop' LIMIT 1),
  (SELECT id FROM users WHERE email = 'john.student@student.edu' LIMIT 1),
  'registered',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Campus Tech Workshop');

INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Campus Tech Workshop' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  'registered',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Campus Tech Workshop');

INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  'registered',
  CURRENT_TIMESTAMP - INTERVAL '5 days'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Annual Sports Day');

INSERT INTO event_participation (event_id, user_id, status, registered_at, cancelled_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
  (SELECT id FROM users WHERE email = 'lisa.chong@student.edu' LIMIT 1),
  'cancelled',
  CURRENT_TIMESTAMP - INTERVAL '6 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Annual Sports Day');

INSERT INTO event_participation (event_id, user_id, status, registered_at, check_in_datetime)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Hackathon 2025' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  'attended',
  CURRENT_TIMESTAMP - INTERVAL '10 days',
  CURRENT_TIMESTAMP - INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Hackathon 2025');

INSERT INTO event_participation (event_id, user_id, status, registered_at, check_in_datetime)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Hackathon 2025' LIMIT 1),
  (SELECT id FROM users WHERE email = 'david.lim@student.edu' LIMIT 1),
  'attended',
  CURRENT_TIMESTAMP - INTERVAL '8 days',
  CURRENT_TIMESTAMP - INTERVAL '2 hours'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Hackathon 2025');

INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Career Fair' LIMIT 1),
  (SELECT id FROM users WHERE email = 'john.student@student.edu' LIMIT 1),
  'registered',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Career Fair');

-- ========================================
-- Sample Event Invitations Data
-- Alumni Meetup is invite-only, so we create specific invitations
-- ========================================
INSERT INTO event_invitations (event_id, user_id, invited_by, status, invited_at, responded_at)
SELECT
  (SELECT id FROM events WHERE event_name = 'Alumni Meetup' LIMIT 1),
  (SELECT id FROM users WHERE email = 'john.student@student.edu' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'accepted',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '4 days'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Alumni Meetup');

INSERT INTO event_invitations (event_id, user_id, invited_by, status, invited_at, responded_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Alumni Meetup' LIMIT 1),
  (SELECT id FROM users WHERE email = 'emily.tan@student.edu' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'accepted',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Alumni Meetup');

INSERT INTO event_invitations (event_id, user_id, invited_by, status, invited_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Alumni Meetup' LIMIT 1),
  (SELECT id FROM users WHERE email = 'michael.kumar@student.edu' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'pending',
  CURRENT_TIMESTAMP - INTERVAL '5 days'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Alumni Meetup');

INSERT INTO event_invitations (event_id, user_id, invited_by, status, invited_at, responded_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Alumni Meetup' LIMIT 1),
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1),
  (SELECT id FROM users WHERE email = 'sarah.organizer@university.edu' LIMIT 1),
  'declined',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  CURRENT_TIMESTAMP - INTERVAL '4 days'
WHERE EXISTS (SELECT 1 FROM events WHERE event_name = 'Alumni Meetup');

-- ========================================
-- Sample Resources Data
-- ========================================
INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'LCD Projector',
  'audio_visual',
  'Full HD projector with HDMI and VGA inputs',
  10,
  10,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'Wireless Microphone Set',
  'audio_visual',
  'Wireless microphone with receiver and batteries',
  8,
  8,
  'sets',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'Folding Chairs',
  'furniture',
  'Portable folding chairs for events',
  200,
  200,
  'pieces',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'Folding Tables (6ft)',
  'furniture',
  '6-foot folding tables',
  50,
  50,
  'pieces',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'Laptop (Presentation)',
  'it_equipment',
  'Laptop pre-loaded with presentation software',
  5,
  5,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'alice.wong@fci.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'alice.wong@fci.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'PA Sound System',
  'audio_visual',
  'Complete sound system with speakers and mixer',
  4,
  4,
  'sets',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by, notes)
SELECT 
  'Catering Package (Snacks)',
  'catering',
  'Light refreshments package for events',
  20,
  20,
  'packages',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1),
  'Requires 48 hours advance notice'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'Whiteboard (Mobile)',
  'furniture',
  'Large mobile whiteboard with markers',
  15,
  15,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by)
SELECT 
  'Portable LED Screen',
  'audio_visual',
  'Large LED display screen for outdoor events',
  2,
  2,
  'units',
  'active',
  (SELECT id FROM users WHERE email = 'admin@university.edu' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'admin@university.edu');

INSERT INTO resources (name, category, description, total_quantity, available_quantity, unit, status, managed_by, notes)
SELECT 
  'Video Camera Kit',
  'audio_visual',
  'Professional video camera with tripod',
  3,
  3,
  'kits',
  'active',
  (SELECT id FROM users WHERE email = 'james.lee@fac.edu' LIMIT 1),
  'FAC students only - requires training certification'
WHERE EXISTS (SELECT 1 FROM users WHERE email = 'james.lee@fac.edu');

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

-- Trigger to auto-update updated_at on resources table
CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON resources
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
COMMENT ON TABLE resources IS 'Stores available campus resources (equipment, furniture, etc.)';
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
COMMENT ON COLUMN resources.category IS 'Resource category: audio_visual, furniture, it_equipment, catering, other';
COMMENT ON COLUMN resources.total_quantity IS 'Total number of this resource available';
COMMENT ON COLUMN resources.available_quantity IS 'Currently available quantity (updated as requests are approved/returned)';
COMMENT ON COLUMN resources.status IS 'Resource status: active, inactive, maintenance';
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
-- Row Level Security for venue_availability_blocks and event_feedbacks
-- ========================================
ALTER TABLE venue_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_feedbacks ENABLE ROW LEVEL SECURITY;

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
  '2025-11-15 09:00:00+00',
  '2025-11-15 17:00:00+00',
  '2025-11-01 10:00:00+00'
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
  '2025-12-10 14:00:00+00',
  '2025-12-10 16:30:00+00',
  '2025-11-20 08:00:00+00'
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
  '2025-12-20 08:00:00+00',
  '2025-12-22 08:00:00+00',
  '2025-12-01 10:00:00+00'
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
  '2026-01-03 10:00:00+00',
  '2026-01-03 12:00:00+00',
  '2025-12-15 09:00:00+00'
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
  '2026-01-06 09:00:00+00',
  '2026-01-10 18:00:00+00',
  '2025-12-20 11:00:00+00'
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
  '2026-01-20 13:00:00+00',
  '2026-01-20 17:00:00+00',
  '2026-01-02 14:00:00+00'
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
  '2026-02-05 09:00:00+00',
  '2026-02-07 17:00:00+00',
  '2026-01-05 10:00:00+00'
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
  '2025-11-15 09:00:00+00',
  '2025-11-15 17:00:00+00',
  '2025-11-15 08:30:00+00',
  '2025-11-15 17:30:00+00',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-11-05 14:00:00+00',
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
  '2025-12-10 14:00:00+00',
  '2025-12-10 16:30:00+00',
  '2025-12-10 14:00:00+00',
  '2025-12-10 16:30:00+00',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-11-25 09:00:00+00',
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
  '2025-12-20 08:00:00+00',
  '2025-12-22 08:00:00+00',
  '2025-12-20 08:00:00+00',
  '2025-12-22 08:00:00+00',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-12-05 16:00:00+00',
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
  '2026-01-03 10:00:00+00',
  '2026-01-03 12:00:00+00',
  '2026-01-03 10:00:00+00',
  '2026-01-03 12:00:00+00',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-12-18 11:00:00+00',
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
  '2026-01-06 09:00:00+00',
  '2026-01-10 18:00:00+00',
  '2026-01-06 09:00:00+00',
  '2026-01-10 18:00:00+00',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2025-12-22 15:00:00+00',
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
  '2026-01-20 13:00:00+00',
  '2026-01-20 17:00:00+00',
  '2026-01-20 13:00:00+00',
  '2026-01-20 17:00:00+00',
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1),
  '2026-01-04 10:00:00+00',
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
  '2026-02-05 09:00:00+00',
  '2026-02-07 17:00:00+00',
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
  '2026-01-15 14:00:00+00',
  '2026-01-15 16:00:00+00',
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
  '2026-01-20 09:00:00+00',
  '2026-01-20 12:00:00+00',
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
  '2026-01-12 13:00:00+00',
  '2026-01-12 17:00:00+00',
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
  '2026-01-18 10:00:00+00',
  '2026-01-18 12:00:00+00',
  '2026-01-18 10:00:00+00',
  '2026-01-18 12:00:00+00',
  20,
  10,
  'approved',
  (SELECT id FROM users WHERE role = 'faculty_manager' AND faculty_id = (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1) LIMIT 1),
  '2026-01-05 09:30:00+00',
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
  '2026-01-11 14:00:00+00',
  '2026-01-11 16:00:00+00',
  15,
  'rejected',
  (SELECT id FROM users WHERE role = 'faculty_manager' AND faculty_id = (SELECT id FROM faculties WHERE code = 'FCI' LIMIT 1) LIMIT 1),
  '2026-01-04 14:20:00+00',
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
  ('2025-11-10 ' || (10 + (random() * 13)::int) || ':' || (random() * 59)::int || ':00+00')::TIMESTAMP WITH TIME ZONE
FROM users 
WHERE role IN ('student', 'event_organizer')
LIMIT 15;

-- Participants for AI Seminar
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  'a2222222-2222-2222-2222-222222222222',
  id,
  'attended',
  ('2025-12-05 ' || (9 + (random() * 11)::int) || ':' || (random() * 59)::int || ':00+00')::TIMESTAMP WITH TIME ZONE
FROM users 
WHERE role IN ('student', 'event_organizer')
LIMIT 10;

-- Participants for Hackathon
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  'a3333333-3333-3333-3333-333333333333',
  id,
  'attended',
  ('2025-12-15 ' || (10 + (random() * 9)::int) || ':' || (random() * 59)::int || ':00+00')::TIMESTAMP WITH TIME ZONE
FROM users 
WHERE role IN ('student', 'event_organizer')
LIMIT 25;

-- Participants for Tech Talk
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  'a4444444-4444-4444-4444-444444444444',
  id,
  'attended',
  ('2025-12-28 ' || (11 + (random() * 9)::int) || ':' || (random() * 59)::int || ':00+00')::TIMESTAMP WITH TIME ZONE
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
  '2025-11-16 10:30:00+00'
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
  '2025-12-11 09:00:00+00'
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
  '2025-12-23 14:00:00+00'
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
  '2026-01-06 08:00:00+00'
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
  '2026-01-25 00:00:00+00',
  '2026-01-27 23:59:00+00',
  'Annual maintenance and equipment upgrade',
  (SELECT id FROM users WHERE role = 'faculty_manager' LIMIT 1)
);

-- ========================================
-- Additional Test Data for Record Attendance Feature (UC-12)
-- ========================================

-- Add more participants to "Campus Tech Workshop" for testing attendance recording
-- This event is created by sarah.organizer@university.edu
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Campus Tech Workshop' LIMIT 1),
  id,
  'registered',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM users 
WHERE email IN (
  'michael.kumar@student.edu',
  'lisa.chong@student.edu',
  'david.lim@student.edu'
)
AND NOT EXISTS (
  SELECT 1 FROM event_participation ep
  WHERE ep.event_id = (SELECT id FROM events WHERE event_name = 'Campus Tech Workshop' LIMIT 1)
  AND ep.user_id = users.id
);

-- Add participants to "Annual Sports Day" (created by sarah.organizer@university.edu)
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 
  (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1),
  id,
  'registered',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM users 
WHERE email IN (
  'john.student@student.edu',
  'emily.tan@student.edu',
  'david.lim@student.edu'
)
AND NOT EXISTS (
  SELECT 1 FROM event_participation ep
  WHERE ep.event_id = (SELECT id FROM events WHERE event_name = 'Annual Sports Day' LIMIT 1)
  AND ep.user_id = users.id
);

-- Faculty event block
INSERT INTO venue_availability_blocks (
  venue_id, blocked_start_datetime, blocked_end_datetime,
  reason, created_by
)
VALUES (
  (SELECT id FROM venues WHERE code = 'LAB-CS-01' LIMIT 1),
  '2026-02-10 08:00:00+00',
  '2026-02-12 18:00:00+00',
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