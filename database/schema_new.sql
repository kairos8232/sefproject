-- database/schema_new.sql
-- Reordered schema copy created from database/schema.ordered.sql
-- Generated: 2026-01-11 (copy for deployment/testing)
-- This file is a reordered/topologically-correct schema suitable for deterministic
-- creation of the database. It was generated from the ordered DDL in
-- database/schema.ordered.sql and includes the representative sample data appended
-- for smoke tests. Do not edit data manually if you require exact parity with
-- database/schema.sql; instead use the canonical file as the source of truth.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

SET TIME ZONE 'Asia/Singapore';

-- Drop existing tables (safe to run)
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
-- Core tables
-- ========================================

CREATE TABLE resource_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_categories_code ON resource_categories(code);
CREATE INDEX idx_resource_categories_status ON resource_categories(status);

CREATE TABLE faculties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_faculties_code ON faculties(code);
CREATE INDEX idx_faculties_status ON faculties(status);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student',
    faculty_id UUID,
    staff_id VARCHAR(50) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_staff_id ON users(staff_id);

ALTER TABLE users
    ADD CONSTRAINT fk_users_faculty
    FOREIGN KEY (faculty_id)
    REFERENCES faculties(id)
    ON DELETE SET NULL;

CREATE INDEX idx_users_faculty_id ON users(faculty_id);

CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    capacity INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_venues_code ON venues(code);
CREATE INDEX idx_venues_faculty_id ON venues(faculty_id);
CREATE INDEX idx_venues_status ON venues(status);
CREATE INDEX idx_venues_capacity ON venues(capacity);

CREATE TABLE resource_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES resource_categories(id) ON DELETE RESTRICT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    managed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_types_category_id ON resource_types(category_id);
CREATE INDEX idx_resource_types_code ON resource_types(code);
CREATE INDEX idx_resource_types_status ON resource_types(status);
CREATE INDEX idx_resource_types_managed_by ON resource_types(managed_by);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    description TEXT,
    visibility VARCHAR(50) NOT NULL DEFAULT 'campuswide',
    event_type VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
    registration_status VARCHAR(20) NOT NULL DEFAULT 'open',
    expected_attendees INTEGER,
    registration_limit INTEGER,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_visibility ON events(visibility);
CREATE INDEX idx_events_start_datetime ON events(start_datetime);

CREATE TABLE venue_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    package_id UUID,
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    approved_start_datetime TIMESTAMP WITH TIME ZONE,
    approved_end_datetime TIMESTAMP WITH TIME ZONE,
    setup_time INTEGER,
    teardown_time INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    rejection_reason TEXT,
    cancellation_reason TEXT,
    remarks TEXT,
    expected_attendees INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_venue_bookings_event_id ON venue_bookings(event_id);
CREATE INDEX idx_venue_bookings_venue_id ON venue_bookings(venue_id);
CREATE INDEX idx_venue_bookings_requester_user_id ON venue_bookings(requester_user_id);
CREATE INDEX idx_venue_bookings_status ON venue_bookings(status);
CREATE INDEX idx_venue_bookings_requested_start ON venue_bookings(requested_start_datetime);
CREATE INDEX idx_venue_bookings_requested_end ON venue_bookings(requested_end_datetime);
CREATE INDEX idx_venue_bookings_approved_user_id ON venue_bookings(approved_user_id);
CREATE INDEX idx_venue_bookings_package_id ON venue_bookings(package_id);

CREATE TABLE event_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_invitations_event_id ON event_invitations(event_id);
CREATE INDEX idx_event_invitations_user_id ON event_invitations(user_id);
CREATE INDEX idx_event_invitations_invited_by ON event_invitations(invited_by);
CREATE INDEX idx_event_invitations_status ON event_invitations(status);

CREATE TABLE event_participation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'registered',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    check_in_datetime TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_participation_event_id ON event_participation(event_id);
CREATE INDEX idx_event_participation_user_id ON event_participation(user_id);
CREATE INDEX idx_event_participation_status ON event_participation(status);
CREATE INDEX idx_event_participation_registered_at ON event_participation(registered_at);

CREATE TABLE event_registration_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    field_type VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    help_text TEXT,
    is_required BOOLEAN NOT NULL DEFAULT false,
    options JSONB,
    validation_rules JSONB,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registration_fields_event_id ON event_registration_fields(event_id);
CREATE INDEX idx_registration_fields_order ON event_registration_fields(event_id, order_index);

CREATE TABLE event_registration_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participation_id UUID NOT NULL REFERENCES event_participation(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES event_registration_fields(id) ON DELETE CASCADE,
    response_value TEXT,
    response_values JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participation_id, field_id)
);

CREATE INDEX idx_registration_responses_participation_id ON event_registration_responses(participation_id);
CREATE INDEX idx_registration_responses_field_id ON event_registration_responses(field_id);

CREATE TABLE resource_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    venue_booking_id UUID NOT NULL REFERENCES venue_bookings(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resource_types(id) ON DELETE CASCADE,
    package_id UUID,
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_quantity INTEGER NOT NULL,
    usage_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    usage_end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    setup_instructions TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    rejection_reason TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resource_requests_event_id ON resource_requests(event_id);
CREATE INDEX idx_resource_requests_venue_booking_id ON resource_requests(venue_booking_id);
CREATE INDEX idx_resource_requests_resource_id ON resource_requests(resource_id);
CREATE INDEX idx_resource_requests_requester_user_id ON resource_requests(requester_user_id);
CREATE INDEX idx_resource_requests_status ON resource_requests(status);
CREATE INDEX idx_resource_requests_usage_start ON resource_requests(usage_start_datetime);
CREATE INDEX idx_resource_requests_usage_end ON resource_requests(usage_end_datetime);
CREATE INDEX idx_resource_requests_approved_by ON resource_requests(approved_by);
CREATE INDEX idx_resource_requests_package_id ON resource_requests(package_id);

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

CREATE INDEX idx_venue_availability_blocks_venue_id ON venue_availability_blocks(venue_id);
CREATE INDEX idx_venue_availability_blocks_datetime ON venue_availability_blocks(blocked_start_datetime, blocked_end_datetime);
CREATE INDEX idx_venue_availability_blocks_created_by ON venue_availability_blocks(created_by);

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

CREATE INDEX idx_event_feedbacks_event_id ON event_feedbacks(event_id);
CREATE INDEX idx_event_feedbacks_user_id ON event_feedbacks(user_id);
CREATE INDEX idx_event_feedbacks_created_at ON event_feedbacks(created_at);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes')
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculties_updated_at
BEFORE UPDATE ON faculties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at
BEFORE UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_bookings_updated_at
BEFORE UPDATE ON venue_bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_invitations_updated_at
BEFORE UPDATE ON event_invitations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_participation_updated_at
BEFORE UPDATE ON event_participation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_requests_updated_at
BEFORE UPDATE ON resource_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

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

-- Enable RLS
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
ALTER TABLE resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend can read all users" ON users
    FOR SELECT
    USING (true);

CREATE POLICY "Backend can insert users" ON users
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Backend can update users" ON users
    FOR UPDATE
    USING (true);

CREATE POLICY "Backend can read all sessions" ON sessions
    FOR SELECT
    USING (true);

CREATE POLICY "Backend can insert sessions" ON sessions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Backend can delete sessions" ON sessions
    FOR DELETE
    USING (true);

-- Representative sample data (from ordered file)
INSERT INTO faculties (id, code, name, description, status)
VALUES ('f_sample_00000000-0000-0000-0000-000000000001', 'FSAMP', 'Sample Faculty', 'Faculty for sample data', 'active');

INSERT INTO users (id, email, name, password, role, faculty_id, staff_id, status)
VALUES
    ('u_sample_org_00000000-0000-0000-0000-000000000002', 'org.sample@univ.edu', 'Org Sample', 'PLACEHOLDER_HASH', 'event_organizer', 'f_sample_00000000-0000-0000-0000-000000000001', 'EO-SAMP-01', 'active'),
    ('u_sample_mgr_00000000-0000-0000-0000-000000000003', 'fm.sample@univ.edu', 'FM Sample', 'PLACEHOLDER_HASH', 'faculty_manager', 'f_sample_00000000-0000-0000-0000-000000000001', 'FM-SAMP-01', 'active');

INSERT INTO venues (id, faculty_id, code, name, location, capacity, status)
VALUES ('v_sample_00000000-0000-0000-0000-000000000004', 'f_sample_00000000-0000-0000-0000-000000000001', 'VSAMP-01', 'Sample Hall', 'Block S, Level 1', 120, 'active');

INSERT INTO resource_categories (id, code, name, description, status)
VALUES ('rc_sample_00000000-0000-0000-0000-000000000005', 'AVS', 'AudioVisual Sample', 'AV test resources', 'active');

INSERT INTO resource_types (id, category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by)
VALUES ('rt_sample_00000000-0000-0000-0000-000000000006', 'rc_sample_00000000-0000-0000-0000-000000000005', 'PROJ-SAMP', 'Sample Projector', 'Test projector', 2, 2, 'units', 'active', 'u_sample_mgr_00000000-0000-0000-0000-000000000003');

-- Insert full set of resource categories and types early to satisfy later resource requests
INSERT INTO resource_categories (id, code, name, description, status, created_at, updated_at)
VALUES 
        ('77777777-7777-7777-7777-777777777777', 'AV', 'Audio/Visual', 'Audio visual equipment', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('88888888-8888-8888-8888-888888888888', 'FURN', 'Furniture', 'Tables, chairs, etc.', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('99999999-9999-9999-9999-999999999999', 'IT', 'IT Equipment', 'Computers, routers, etc.', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Core resource types used throughout sample data (placed early)
INSERT INTO resource_types (id, category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, created_at, updated_at)
VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 'PROJ-HD', 'HD Projector', 'High definition projector with HDMI', 10, 10, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('bbbbbbbb-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777', 'MIC-WL', 'Wireless Microphone', 'Professional wireless microphone system', 20, 20, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cccccccc-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888', 'CHR-STD', 'Standard Chair', 'Stackable event chairs', 500, 500, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('dddddddd-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', 'WB-MOB', 'Mobile Whiteboard', 'Portable whiteboard with stand', 15, 15, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('eeeeeeee-5555-5555-5555-555555555555', '77777777-7777-7777-7777-777777777777', 'PROJ-LCD', 'LCD Projector', 'LCD projector with VGA/HDMI', 8, 8, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('ffffffff-6666-6666-6666-666666666666', '88888888-8888-8888-8888-888888888888', 'CHAIR-FOLD', 'Folding Chair', 'Folding chairs for events', 200, 200, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('11111111-7777-7777-7777-111111111111', '77777777-7777-7777-7777-777777777777', 'LAPTOP-PRES', 'Presentation Laptop', 'Laptop configured for presenter use', 10, 10, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('22222222-8888-8888-8888-222222222222', '77777777-7777-7777-7777-777777777777', 'LED-SCREEN', 'LED Screen', 'Large LED screen for events', 2, 2, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('33333333-9999-9999-9999-333333333333', '88888888-8888-8888-8888-888888888888', 'TABLE-6FT', '6ft Table', 'Standard 6ft folding table', 50, 50, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('44444444-aaaa-aaaa-aaaa-444444444444', '88888888-8888-8888-8888-888888888888', 'SNACK-PKG', 'Snack Package', 'Pre-packaged snack boxes for events', 200, 200, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('55555555-bbbb-bbbb-bbbb-555555555555', '88888888-8888-8888-8888-888888888888', 'WB-MOBILE', 'Mobile Whiteboard (alt)', 'Alternate mobile whiteboard code used in sample', 10, 10, 'units', 'active', '22222222-2222-2222-2222-222222222222', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Additional resource type referenced later: PA system for large venues
INSERT INTO resource_types (id, category_id, code, name, description, total_quantity, available_quantity, unit, status, managed_by, created_at, updated_at)
VALUES (
    '66666666-7777-8888-9999-666666666666',
    '77777777-7777-7777-7777-777777777777',
    'SOUND-PA',
    'PA System',
    'Portable PA system with mixers and speakers',
    5,
    5,
    'units',
    'active',
    '22222222-2222-2222-2222-222222222222',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
 
-- Additional test venues referenced by canonical sample-data
INSERT INTO venues (id, faculty_id, code, name, location, capacity, status, created_at, updated_at)
VALUES
    ('v_labcs_00000000-0000-0000-0000-000000010001', '33333333-3333-3333-3333-333333333333', 'LAB-CS-01', 'Computer Lab 1', 'Block C Level 1', 40, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v_labcs_00000000-0000-0000-0000-000000010002', '33333333-3333-3333-3333-333333333333', 'LAB-CS-02', 'Computer Lab 2', 'Block C Level 1', 40, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v_ltfci_00000000-0000-0000-0000-000000010003', '33333333-3333-3333-3333-333333333333', 'LT-FCI-01', 'Lecture Theatre FCI 1', 'Block A Level 3', 150, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v_studio_fac_00000000-0000-0000-0000-000000010004', '33333333-3333-3333-3333-333333333333', 'STUDIO-FAC-01', 'Faculty Studio', 'Block B Level 2', 60, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v_crfob_00000000-0000-0000-0000-000000010005', '33333333-3333-3333-3333-333333333333', 'CR-FOB-01', 'Collaboration Room FOB 1', 'Block D Level 1', 20, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v_srfom_00000000-0000-0000-0000-000000010006', '33333333-3333-3333-3333-333333333333', 'SR-FOM-01', 'Seminar Room FOM 1', 'Block E Level 1', 80, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, expected_attendees, registration_limit, start_datetime, end_datetime)
VALUES ('e_sample_00000000-0000-0000-0000-000000000007', 'u_sample_org_00000000-0000-0000-0000-000000000002', 'Sample Meetup', 'Small sample meetup', 'campuswide', 'meetup', 'upcoming', 50, 60, '2026-02-01 10:00:00+08', '2026-02-01 13:00:00+08');

INSERT INTO venue_bookings (id, event_id, venue_id, requester_user_id, requested_start_datetime, requested_end_datetime, status, expected_attendees)
VALUES ('vb_sample_00000000-0000-0000-0000-000000000008', 'e_sample_00000000-0000-0000-0000-000000000007', 'v_sample_00000000-0000-0000-0000-000000000004', 'u_sample_org_00000000-0000-0000-0000-000000000002', '2026-02-01 10:00:00+08', '2026-02-01 13:00:00+08', 'approved', 50);

INSERT INTO resource_requests (id, event_id, venue_booking_id, resource_id, requester_user_id, requested_quantity, usage_start_datetime, usage_end_datetime, status)
VALUES ('rr_sample_00000000-0000-0000-0000-000000000009', 'e_sample_00000000-0000-0000-0000-000000000007', 'vb_sample_00000000-0000-0000-0000-000000000008', 'rt_sample_00000000-0000-0000-0000-000000000006', 'u_sample_org_00000000-0000-0000-0000-000000000002', 1, '2026-02-01 09:30:00+08', '2026-02-01 13:30:00+08', 'approved');

INSERT INTO event_participation (event_id, user_id, status, registered_at)
VALUES
    ('e_sample_00000000-0000-0000-0000-000000000007', 'u_sample_org_00000000-0000-0000-0000-000000000002', 'registered', CURRENT_TIMESTAMP),
    ('e_sample_00000000-0000-0000-0000-000000000007', 'u_sample_mgr_00000000-0000-0000-0000-000000000003', 'registered', CURRENT_TIMESTAMP);

-- Appended canonical sample data from database/schema.sql
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

    -- Update users with faculty assignments
    UPDATE users SET faculty_id = 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1' WHERE id IN ('66666666-6666-6666-6666-666666666666', '77777777-7777-7777-7777-777777777777', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ffffffff-ffff-ffff-ffff-ffffffffffff');
    UPDATE users SET faculty_id = 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2' WHERE id IN ('88888888-8888-8888-8888-888888888888', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
    UPDATE users SET faculty_id = 'f3f3f3f3-f3f3-f3f3-f3f3-f3f3f3f3f3f3' WHERE id IN ('99999999-9999-9999-9999-999999999999', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '10101010-1010-1010-1010-101010101010');
    UPDATE users SET faculty_id = 'f4f4f4f4-f4f4-f4f4-f4f4-f4f4f4f4f4f4' WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '20202020-2020-2020-2020-202020202020');

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

    -- STEP 2: Create Test Faculty (moved up to satisfy dependent SELECTs)
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
-- Ensure "Annual Sports Day" event exists for registration-field references
INSERT INTO events (id, organizer_id, event_name, description, visibility, event_type, status, expected_attendees, registration_limit, start_datetime, end_datetime, created_at)
VALUES (
    'e3e3e3e3-e3e3-e3e3-e3e3-e3e3e3e3e3e3',
    (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
    'Annual Sports Day',
    'Annual sports day with multiple sporting events and competitions',
    'campuswide',
    'sports',
    'completed',
    500,
    600,
    '2025-10-10 08:00:00+08',
    '2025-10-10 18:00:00+08',
    CURRENT_TIMESTAMP
);

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
-- STEP 2: Create Test Faculty (moved earlier in file)
-- original block removed to avoid duplication

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

-- (Resource categories and types inserted earlier in file to satisfy dependent INSERTs)

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
-- (Migrations already included inline in CREATE TABLE definitions above)

-- End of appended canonical sample data

-- End of schema_new.sql

-- ========================================
-- BULK TEST DATA: additional venues, users, participations, and feedbacks
-- Large completed event with many participants and rich feedback for QA
-- Generated: 2026-01-11
-- ========================================

-- Create a completed event for heavy participation testing
INSERT INTO events (
    id, organizer_id, event_name, description, visibility, event_type, status, registration_status,
    expected_attendees, registration_limit, start_datetime, end_datetime, created_at, updated_at
)
VALUES (
    'faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff',
    (SELECT id FROM users WHERE role = 'event_organizer' LIMIT 1),
    'Campus Tech Expo 2025',
    'A large campus expo showcasing student projects, talks and workshops. Used to test heavy participation and feedback flows.',
    'campuswide',
    'expo',
    'completed',
    'closed',
    1000,
    1200,
    '2025-11-18 09:00:00+08',
    '2025-11-18 18:00:00+08',
    '2025-10-01 09:00:00+08',
    '2025-11-19 09:00:00+08'
);

-- Add many additional venues across the faculty for capacity/stress testing
INSERT INTO venues (id, faculty_id, code, name, location, capacity, status, created_at, updated_at)
VALUES
    ('v1000000-0000-4000-8000-000000000001', '33333333-3333-3333-3333-333333333333', 'EXPO-HALL-01', 'Expo Hall A', 'Block A Ground', 800, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000002', '33333333-3333-3333-3333-333333333333', 'EXPO-HALL-02', 'Expo Hall B', 'Block A Ground', 600, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000003', '33333333-3333-3333-3333-333333333333', 'WORKSHOP-1', 'Workshop Room 1', 'Block B Level 1', 80, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000004', '33333333-3333-3333-3333-333333333333', 'WORKSHOP-2', 'Workshop Room 2', 'Block B Level 1', 60, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000005', '33333333-3333-3333-3333-333333333333', 'STAGE-OUT', 'Outdoor Stage', 'North Lawn', 1200, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000006', '33333333-3333-3333-3333-333333333333', 'LT-EXPO-01', 'Lecture Theatre Expo 1', 'Block C Level 3', 300, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000007', '33333333-3333-3333-3333-333333333333', 'LT-EXPO-02', 'Lecture Theatre Expo 2', 'Block C Level 3', 250, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000008', '33333333-3333-3333-3333-333333333333', 'POP-UP-1', 'Pop-up Space 1', 'Block D Level 1', 40, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000009', '33333333-3333-3333-3333-333333333333', 'POP-UP-2', 'Pop-up Space 2', 'Block D Level 1', 40, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('v1000000-0000-4000-8000-000000010', '33333333-3333-3333-3333-333333333333', 'MEDIA-LOUNGE', 'Media Lounge', 'Block E Level 2', 120, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Bulk create 50+ test user accounts (students, volunteers, staff)
INSERT INTO users (id, email, name, password, role, faculty_id, staff_id, status, created_at, updated_at)
VALUES
    ('u1000000-0000-4000-8000-000000000001', 'participant1@student.edu', 'Participant One', '$2b$10$examplehashparticipant0000000000000000000000001', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000002', 'participant2@student.edu', 'Participant Two', '$2b$10$examplehashparticipant0000000000000000000000002', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000003', 'participant3@student.edu', 'Participant Three', '$2b$10$examplehashparticipant0000000000000000000000003', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000004', 'participant4@student.edu', 'Participant Four', '$2b$10$examplehashparticipant0000000000000000000000004', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000005', 'participant5@student.edu', 'Participant Five', '$2b$10$examplehashparticipant0000000000000000000000005', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000006', 'participant6@student.edu', 'Participant Six', '$2b$10$examplehashparticipant0000000000000000000000006', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000007', 'participant7@student.edu', 'Participant Seven', '$2b$10$examplehashparticipant0000000000000000000000007', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000008', 'participant8@student.edu', 'Participant Eight', '$2b$10$examplehashparticipant0000000000000000000000008', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000009', 'participant9@student.edu', 'Participant Nine', '$2b$10$examplehashparticipant0000000000000000000000009', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-00000000000a', 'participant10@student.edu', 'Participant Ten', '$2b$10$examplehashparticipant00000000000000000000000a', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-00000000000b', 'volunteer1@university.edu', 'Volunteer One', '$2b$10$examplehashvolunteer00000000000000000000b', 'volunteer', '33333333-3333-3333-3333-333333333333', 'VOL001', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-00000000000c', 'volunteer2@university.edu', 'Volunteer Two', '$2b$10$examplehashvolunteer00000000000000000000c', 'volunteer', '33333333-3333-3333-3333-333333333333', 'VOL002', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-00000000000d', 'staff1@university.edu', 'Staff One', '$2b$10$examplehashstaff00000000000000000000d', 'staff', '33333333-3333-3333-3333-333333333333', 'STF001', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-00000000000e', 'staff2@university.edu', 'Staff Two', '$2b$10$examplehashstaff00000000000000000000e', 'staff', '33333333-3333-3333-3333-333333333333', 'STF002', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-00000000000f', 'sponsor1@company.com', 'Sponsor Rep', '$2b$10$examplehashexternal00000000000000000000f', 'external', NULL, NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000010', 'participant11@student.edu', 'Participant Eleven', '$2b$10$examplehashparticipant000000000000000000000010', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000011', 'participant12@student.edu', 'Participant Twelve', '$2b$10$examplehashparticipant000000000000000000000011', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000012', 'participant13@student.edu', 'Participant Thirteen', '$2b$10$examplehashparticipant000000000000000000000012', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000013', 'participant14@student.edu', 'Participant Fourteen', '$2b$10$examplehashparticipant000000000000000000000013', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000014', 'participant15@student.edu', 'Participant Fifteen', '$2b$10$examplehashparticipant000000000000000000000014', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000015', 'participant16@student.edu', 'Participant Sixteen', '$2b$10$examplehashparticipant000000000000000000000015', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000016', 'participant17@student.edu', 'Participant Seventeen', '$2b$10$examplehashparticipant000000000000000000000016', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000017', 'participant18@student.edu', 'Participant Eighteen', '$2b$10$examplehashparticipant000000000000000000000017', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000018', 'participant19@student.edu', 'Participant Nineteen', '$2b$10$examplehashparticipant000000000000000000000018', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('u1000000-0000-4000-8000-000000000019', 'participant20@student.edu', 'Participant Twenty', '$2b$10$examplehashparticipant000000000000000000000019', 'student', '33333333-3333-3333-3333-333333333333', NULL, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Register many participants to the completed event (Campus Tech Expo 2025)
INSERT INTO event_participation (event_id, user_id, status, registered_at)
SELECT 'faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', id, 'attended', (TIMESTAMP '2025-11-18 09:00:00+08' + (random()*3600)::int * '1 second'::interval)
FROM users
WHERE email LIKE 'participant%student.edu' OR role = 'volunteer'
LIMIT 120;

-- Add more participants by referencing explicit user IDs to increase variability
INSERT INTO event_participation (event_id, user_id, status, registered_at)
VALUES
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000001', 'attended', '2025-11-18 08:50:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000002', 'attended', '2025-11-18 08:55:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000003', 'attended', '2025-11-18 09:05:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000004', 'attended', '2025-11-18 09:10:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000005', 'attended', '2025-11-18 09:12:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000006', 'attended', '2025-11-18 09:15:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000007', 'attended', '2025-11-18 09:20:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000008', 'attended', '2025-11-18 09:22:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000009', 'attended', '2025-11-18 09:25:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-00000000000a', 'attended', '2025-11-18 09:30:00+08');

-- Bulk generate feedbacks from a subset of participants and volunteers/staff
INSERT INTO event_feedbacks (event_id, user_id, venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating, comments, suggestions, created_at)
SELECT
    ep.event_id,
    ep.user_id,
    (3 + (random()*2)::int),
    (3 + (random()*2)::int),
    (3 + (random()*2)::int),
    (3 + (random()*2)::int),
    CASE WHEN (random() < 0.6) THEN 'Great event with engaging demos and talks. Loved the lineup.' ELSE 'Good event but some queues at registration and food stalls took long.' END,
    CASE WHEN (random() < 0.5) THEN 'Add more poster sessions and longer Q&A slots.' ELSE 'Improve signage and crowd flow near entrance.' END,
    (TIMESTAMP '2025-11-18 12:00:00+08' + (random()*36000)::int * '1 second'::interval)
FROM event_participation ep
WHERE ep.event_id = 'faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff'
AND (ep.user_id IN (
        'u1000000-0000-4000-8000-000000000001',
        'u1000000-0000-4000-8000-000000000002',
        'u1000000-0000-4000-8000-000000000003',
        'u1000000-0000-4000-8000-000000000004',
        'u1000000-0000-4000-8000-000000000005',
        'u1000000-0000-4000-8000-000000000006',
        'u1000000-0000-4000-8000-000000000007',
        'u1000000-0000-4000-8000-000000000008',
        'u1000000-0000-4000-8000-000000000009',
        'u1000000-0000-4000-8000-00000000000a'))
LIMIT 80;

-- Add targeted detailed feedback entries to exercise comment parsing and reporting
INSERT INTO event_feedbacks (event_id, user_id, venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating, comments, suggestions, created_at)
VALUES
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000001', 5, 5, 5, 5, 'Incredible showcase of student work. AV and registration were flawless.', 'Keep the same registration flow; add more charging stations.', '2025-11-18 11:45:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000002', 4, 4, 4, 4, 'Well organized. Some workshops were overcrowded.', 'Limit workshop slots or move to bigger rooms.', '2025-11-18 12:10:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000003', 3, 4, 3, 3, 'Good overall, but queues at food stalls were long.', 'Add more food vendors and queue managers.', '2025-11-18 13:20:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-000000000004', 5, 5, 5, 5, 'Excellent experience. The outdoor stage had great energy!', 'Consider adding more seating near the outdoor stage.', '2025-11-18 14:00:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-00000000000b', 4, 5, 4, 5, 'Volunteering was smooth and roles were clear. Well-run event.', 'Provide volunteer t-shirts earlier at check-in.', '2025-11-18 15:00:00+08'),
    ('faaaaaaaaaaa-ffff-ffff-ffff-ffffffffffff', 'u1000000-0000-4000-8000-00000000000c', 4, 4, 4, 4, 'Great sponsor booths. Networking was fruitful.', 'Have a dedicated networking zone with seating.', '2025-11-18 16:30:00+08');

-- End of bulk test data block

