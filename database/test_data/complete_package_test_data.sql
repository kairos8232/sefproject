-- ============================================
-- Test Data for Package Booking Feature
-- Date: 2026-01-10
-- Purpose: Complete test data with packages (no external dependencies)
-- ============================================

-- ============================================
-- STEP 1: Create Test Users
-- ============================================

-- Event Organizer User
INSERT INTO users (id, email, name, password, role, staff_id, status, created_at, updated_at)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'organizer@university.edu',
  'John Organizer',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP', -- bcrypt hash placeholder
  'event_organizer',
  'ORG001',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Faculty Manager User
INSERT INTO users (id, email, name, password, role, faculty_id, staff_id, status, created_at, updated_at)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'fmanager@university.edu',
  'Sarah Faculty Manager',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP',
  'faculty_manager',
  '33333333-3333-3333-3333-333333333333', -- Will reference faculty below
  'FM001',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 2: Create Test Faculty
-- ============================================

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

-- ============================================
-- STEP 3: Create Test Venues
-- ============================================

-- Venue 1: Main Auditorium
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

-- Venue 2: Lecture Hall 1
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

-- Venue 3: Lecture Hall 2
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

-- ============================================
-- STEP 4: Create Resource Categories
-- ============================================

INSERT INTO resource_categories (id, code, name, description, status, created_at, updated_at)
VALUES 
  ('77777777-7777-7777-7777-777777777777', 'AV', 'Audio/Visual', 'Audio visual equipment', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('88888888-8888-8888-8888-888888888888', 'FURN', 'Furniture', 'Tables, chairs, etc.', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('99999999-9999-9999-9999-999999999999', 'IT', 'IT Equipment', 'Computers, routers, etc.', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================
-- STEP 5: Create Resource Types
-- ============================================

-- Resource 1: Projectors
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

-- Resource 2: Wireless Microphones
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

-- Resource 3: Chairs
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

-- Resource 4: Whiteboards
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

-- ============================================
-- STEP 6: Create Test Event
-- ============================================

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

-- ============================================
-- STEP 7: Create Venue Package (3 venues, 1 package)
-- Package ID: ffffffff-6666-6666-6666-666666666666
-- ============================================

-- Venue Booking 1: Main Auditorium
INSERT INTO venue_bookings (
  id,
  event_id,
  venue_id,
  package_id,
  requester_user_id,
  requested_start_datetime,
  requested_end_datetime,
  approved_start_datetime,
  approved_end_datetime,
  setup_time,
  teardown_time,
  status,
  approved_user_id,
  approved_at,
  approval_notes,
  remarks,
  expected_attendees,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'eeeeeeee-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'ffffffff-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  30,
  30,
  'approved',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Approved as part of venue package. Main auditorium for keynote sessions.',
  'Main conference venue for opening ceremony and keynote speeches. Requires stage setup.',
  250,
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Venue Booking 2: Lecture Hall 1
INSERT INTO venue_bookings (
  id,
  event_id,
  venue_id,
  package_id,
  requester_user_id,
  requested_start_datetime,
  requested_end_datetime,
  approved_start_datetime,
  approved_end_datetime,
  setup_time,
  teardown_time,
  status,
  approved_user_id,
  approved_at,
  approval_notes,
  remarks,
  expected_attendees,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  'eeeeeeee-5555-5555-5555-555555555555',
  '55555555-5555-5555-5555-555555555555',
  'ffffffff-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  30,
  30,
  'approved',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Approved as part of venue package. Breakout room for parallel sessions.',
  'Breakout room for workshop sessions - Track A (AI & Machine Learning)',
  80,
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Venue Booking 3: Lecture Hall 2
INSERT INTO venue_bookings (
  id,
  event_id,
  venue_id,
  package_id,
  requester_user_id,
  requested_start_datetime,
  requested_end_datetime,
  approved_start_datetime,
  approved_end_datetime,
  setup_time,
  teardown_time,
  status,
  approved_user_id,
  approved_at,
  approval_notes,
  remarks,
  expected_attendees,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  'eeeeeeee-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  'ffffffff-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  30,
  30,
  'approved',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Approved as part of venue package. Second breakout room.',
  'Breakout room for technical demonstrations - Track B (Cloud Computing)',
  80,
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- ============================================
-- STEP 8: Create Resource Package (4 resources, 1 package)
-- Package ID: 11111111-7777-7777-7777-777777777777
-- ============================================

-- Resource Request 1: Projectors (5 units)
INSERT INTO resource_requests (
  id,
  event_id,
  venue_booking_id,
  resource_id,
  package_id,
  requester_user_id,
  requested_quantity,
  usage_start_datetime,
  usage_end_datetime,
  setup_instructions,
  status,
  approved_by,
  approved_at,
  approval_notes,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  'eeeeeeee-5555-5555-5555-555555555555',
  '10000000-0000-0000-0000-000000000001',
  'aaaaaaaa-1111-1111-1111-111111111111',
  '11111111-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  5,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  'Need 2 projectors in main auditorium (main + backup), 1 in each breakout room, and 1 spare. All must support 1080p HDMI.',
  'approved',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package. All projectors tested and ready.',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '12 hours'
);

-- Resource Request 2: Wireless Microphones (10 units)
INSERT INTO resource_requests (
  id,
  event_id,
  venue_booking_id,
  resource_id,
  package_id,
  requester_user_id,
  requested_quantity,
  usage_start_datetime,
  usage_end_datetime,
  setup_instructions,
  status,
  approved_by,
  approved_at,
  approval_notes,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  'eeeeeeee-5555-5555-5555-555555555555',
  '10000000-0000-0000-0000-000000000001',
  'bbbbbbbb-2222-2222-2222-222222222222',
  '11111111-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  10,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  'Distribute 6 mics to main auditorium, 2 to each breakout room. All must be fully charged and tested before event.',
  'approved',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package. Microphones will be charged overnight.',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '12 hours'
);

-- Resource Request 3: Chairs (200 units)
INSERT INTO resource_requests (
  id,
  event_id,
  venue_booking_id,
  resource_id,
  package_id,
  requester_user_id,
  requested_quantity,
  usage_start_datetime,
  usage_end_datetime,
  setup_instructions,
  status,
  approved_by,
  approved_at,
  approval_notes,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000003',
  'eeeeeeee-5555-5555-5555-555555555555',
  '10000000-0000-0000-0000-000000000001',
  'cccccccc-3333-3333-3333-333333333333',
  '11111111-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  200,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  '150 chairs in main auditorium (theater style, 10 rows of 15), 25 chairs in each breakout room (classroom style with tables).',
  'approved',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package. Setup crew will arrange per specifications.',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '12 hours'
);

-- Resource Request 4: Whiteboards (3 units)
INSERT INTO resource_requests (
  id,
  event_id,
  venue_booking_id,
  resource_id,
  package_id,
  requester_user_id,
  requested_quantity,
  usage_start_datetime,
  usage_end_datetime,
  setup_instructions,
  status,
  approved_by,
  approved_at,
  approval_notes,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000004',
  'eeeeeeee-5555-5555-5555-555555555555',
  '10000000-0000-0000-0000-000000000001',
  'dddddddd-4444-4444-4444-444444444444',
  '11111111-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  3,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  'One mobile whiteboard with full set of markers (black, blue, red) and eraser in each venue. Position near speaker area.',
  'approved',
  '22222222-2222-2222-2222-222222222222',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package. Markers and erasers included.',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '12 hours'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all test data summary
SELECT 'Test Data Summary' as info;

SELECT 
  'Users Created' as type,
  COUNT(*) as count 
FROM users 
WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

SELECT 
  'Faculties Created' as type,
  COUNT(*) as count 
FROM faculties 
WHERE id = '33333333-3333-3333-3333-333333333333';

SELECT 
  'Venues Created' as type,
  COUNT(*) as count 
FROM venues 
WHERE faculty_id = '33333333-3333-3333-3333-333333333333';

SELECT 
  'Resource Categories Created' as type,
  COUNT(*) as count 
FROM resource_categories 
WHERE id IN ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999');

SELECT 
  'Resource Types Created' as type,
  COUNT(*) as count 
FROM resource_types 
WHERE category_id IN ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888');

SELECT 
  'Events Created' as type,
  COUNT(*) as count 
FROM events 
WHERE id = 'eeeeeeee-5555-5555-5555-555555555555';

-- View Venue Package Details
SELECT 
  'VENUE PACKAGE' as package_type,
  vb.package_id,
  v.name as venue_name,
  v.code as venue_code,
  vb.status,
  vb.remarks
FROM venue_bookings vb
JOIN venues v ON vb.venue_id = v.id
WHERE vb.package_id = 'ffffffff-6666-6666-6666-666666666666'
ORDER BY vb.created_at;

-- View Resource Package Details
SELECT 
  'RESOURCE PACKAGE' as package_type,
  rr.package_id,
  rt.name as resource_name,
  rr.requested_quantity,
  rt.unit,
  rr.status,
  rr.setup_instructions
FROM resource_requests rr
JOIN resource_types rt ON rr.resource_id = rt.id
WHERE rr.package_id = '11111111-7777-7777-7777-777777777777'
ORDER BY rr.created_at;

-- View Complete Event Summary
SELECT 
  e.event_name,
  e.start_datetime,
  e.status,
  COUNT(DISTINCT vb.id) as venue_bookings,
  COUNT(DISTINCT rr.id) as resource_requests,
  COUNT(DISTINCT vb.package_id) as venue_packages,
  COUNT(DISTINCT rr.package_id) as resource_packages
FROM events e
LEFT JOIN venue_bookings vb ON e.id = vb.event_id
LEFT JOIN resource_requests rr ON e.id = rr.event_id
WHERE e.id = 'eeeeeeee-5555-5555-5555-555555555555'
GROUP BY e.event_name, e.start_datetime, e.status;
