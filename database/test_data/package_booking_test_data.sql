-- Test Data for Package Booking Feature
-- Date: 2026-01-10
-- Purpose: Test venue packages and resource packages

-- ============================================
-- STEP 1: Get existing IDs (run these queries first to get UUIDs)
-- ============================================
-- Get a user ID for event organizer (run this and copy the UUID):
-- SELECT id, username, role FROM users WHERE role = 'event_organizer' LIMIT 1;

-- Get faculty IDs (run this and copy UUIDs):
-- SELECT id, name FROM faculties WHERE status = 'active' LIMIT 2;

-- Get venue IDs from same faculty (run this and copy UUIDs):
-- SELECT id, name, code, faculty_id FROM venues WHERE status = 'active' LIMIT 5;

-- Get resource IDs (run this and copy UUIDs):
-- SELECT id, name, category_id FROM resource_types WHERE status = 'active' LIMIT 5;

-- ============================================
-- STEP 2: Replace UUIDs below with your actual values
-- ============================================

-- Replace these placeholder variables:
-- @organizer_user_id = your event organizer user ID
-- @faculty_manager_id = your faculty manager user ID
-- @faculty_id = your faculty ID
-- @venue_1_id, @venue_2_id, @venue_3_id = three venue IDs from same faculty
-- @resource_1_id, @resource_2_id, @resource_3_id = three resource IDs

-- ============================================
-- STEP 3: Create Test Event
-- ============================================

-- Insert a test event for package booking demonstration
INSERT INTO events (
  id,
  event_name,
  description,
  start_datetime,
  end_datetime,
  expected_attendees,
  organizer_id,
  visibility,
  status,
  registration_limit,
  registration_status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Annual Tech Conference 2026',
  'A large-scale technology conference requiring multiple venues and resources. This event will showcase the package booking feature with 3 classroom bookings and multiple resource requests.',
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  250,
  'REPLACE_WITH_ORGANIZER_USER_ID', -- Replace with actual organizer user ID
  'public',
  'upcoming',
  300,
  'open',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Get the event ID we just created (save this for next steps)
-- SELECT id, event_name FROM events WHERE event_name = 'Annual Tech Conference 2026';

-- ============================================
-- STEP 4: Create Venue Package (3 venues as one package)
-- ============================================

-- Generate a package ID for venue bookings
-- Use this UUID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa (or generate your own)

-- Venue Booking 1: Main Hall
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
  gen_random_uuid(),
  'REPLACE_WITH_EVENT_ID', -- Event ID from Step 3
  'REPLACE_WITH_VENUE_1_ID', -- Replace with first venue ID
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Package ID (same for all 3)
  'REPLACE_WITH_ORGANIZER_USER_ID',
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  30,
  30,
  'approved',
  'REPLACE_WITH_FACULTY_MANAGER_ID', -- Replace with faculty manager ID
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Approved as part of package: Main conference venue for keynote sessions.',
  'Main conference hall for keynote speeches and opening ceremony',
  250,
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Venue Booking 2: Breakout Room 1
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
  gen_random_uuid(),
  'REPLACE_WITH_EVENT_ID',
  'REPLACE_WITH_VENUE_2_ID', -- Replace with second venue ID
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Same package ID
  'REPLACE_WITH_ORGANIZER_USER_ID',
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  30,
  30,
  'approved',
  'REPLACE_WITH_FACULTY_MANAGER_ID',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Approved as part of package: Breakout session venue.',
  'Breakout room for workshop sessions',
  80,
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Venue Booking 3: Breakout Room 2
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
  gen_random_uuid(),
  'REPLACE_WITH_EVENT_ID',
  'REPLACE_WITH_VENUE_3_ID', -- Replace with third venue ID
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Same package ID
  'REPLACE_WITH_ORGANIZER_USER_ID',
  '2026-02-15 09:00:00+08',
  '2026-02-15 17:00:00+08',
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  30,
  30,
  'approved',
  'REPLACE_WITH_FACULTY_MANAGER_ID',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'Approved as part of package: Second breakout session venue.',
  'Breakout room for technical demonstrations',
  80,
  CURRENT_TIMESTAMP - INTERVAL '2 days',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- ============================================
-- STEP 5: Create Resource Package (4 resources as one package)
-- ============================================

-- Generate a package ID for resource requests
-- Use this UUID: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb (or generate your own)

-- Use the first venue booking ID from the package above
-- SELECT id FROM venue_bookings WHERE package_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' LIMIT 1;

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
  gen_random_uuid(),
  'REPLACE_WITH_EVENT_ID',
  'REPLACE_WITH_VENUE_BOOKING_1_ID', -- First venue booking ID
  'REPLACE_WITH_RESOURCE_1_ID', -- Replace with projector resource ID
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Package ID (same for all 4)
  'REPLACE_WITH_ORGANIZER_USER_ID',
  5,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  'Need 2 projectors in main hall, 1 in each breakout room, and 1 spare',
  'approved',
  'REPLACE_WITH_FACULTY_MANAGER_ID',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package',
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
  gen_random_uuid(),
  'REPLACE_WITH_EVENT_ID',
  'REPLACE_WITH_VENUE_BOOKING_1_ID',
  'REPLACE_WITH_RESOURCE_2_ID', -- Replace with microphone resource ID
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Same package ID
  'REPLACE_WITH_ORGANIZER_USER_ID',
  10,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  'Distribute across all three venues, ensure fully charged',
  'approved',
  'REPLACE_WITH_FACULTY_MANAGER_ID',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package',
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
  gen_random_uuid(),
  'REPLACE_WITH_EVENT_ID',
  'REPLACE_WITH_VENUE_BOOKING_1_ID',
  'REPLACE_WITH_RESOURCE_3_ID', -- Replace with chairs resource ID
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Same package ID
  'REPLACE_WITH_ORGANIZER_USER_ID',
  200,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  '150 chairs in main hall (theater style), 25 in each breakout room',
  'approved',
  'REPLACE_WITH_FACULTY_MANAGER_ID',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package',
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
  gen_random_uuid(),
  'REPLACE_WITH_EVENT_ID',
  'REPLACE_WITH_VENUE_BOOKING_1_ID',
  'REPLACE_WITH_RESOURCE_4_ID', -- Replace with whiteboard resource ID
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Same package ID
  'REPLACE_WITH_ORGANIZER_USER_ID',
  3,
  '2026-02-15 08:30:00+08',
  '2026-02-15 17:30:00+08',
  'One whiteboard with markers in each venue',
  'approved',
  'REPLACE_WITH_FACULTY_MANAGER_ID',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  'Approved as part of resource package',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '12 hours'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- After inserting, verify the data:

-- Check venue package (should show 3 venues with same package_id)
-- SELECT 
--   vb.id,
--   v.name as venue_name,
--   vb.package_id,
--   vb.status,
--   vb.remarks
-- FROM venue_bookings vb
-- JOIN venues v ON vb.venue_id = v.id
-- WHERE vb.package_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Check resource package (should show 4 resources with same package_id)
-- SELECT 
--   rr.id,
--   rt.name as resource_name,
--   rr.requested_quantity,
--   rr.package_id,
--   rr.status,
--   rr.setup_instructions
-- FROM resource_requests rr
-- JOIN resource_types rt ON rr.resource_id = rt.id
-- WHERE rr.package_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Check event with all bookings
-- SELECT 
--   e.event_name,
--   COUNT(DISTINCT vb.id) as venue_bookings,
--   COUNT(DISTINCT rr.id) as resource_requests
-- FROM events e
-- LEFT JOIN venue_bookings vb ON e.id = vb.event_id
-- LEFT JOIN resource_requests rr ON e.id = rr.event_id
-- WHERE e.event_name = 'Annual Tech Conference 2026'
-- GROUP BY e.event_name;

-- ============================================
-- INSTRUCTIONS FOR USE
-- ============================================

/*
1. First, run the SELECT queries in STEP 1 to get your existing UUIDs
2. Replace all REPLACE_WITH_* placeholders with actual UUIDs
3. Run the INSERT for the event
4. Get the event ID from the verification query
5. Run the 3 venue booking INSERTs
6. Get one venue booking ID
7. Run the 4 resource request INSERTs
8. Run verification queries to confirm

This will give you:
- 1 event with 3 venue bookings (package)
- The same event with 4 resource requests (package)
- All approved and ready to display in My Events page
*/
