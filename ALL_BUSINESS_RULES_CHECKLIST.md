# Event, Venue Booking & Registration Business Rules Checklist

This document enumerates all business rules and validation conditions for the Event + Venue Booking + Registration system. Each rule includes: name, description, trigger, user-facing message, severity, and suggested enforcement locations (UI validation, API validation, DB constraint). Test cases (Given/When/Then) are provided for important rules.

---

## 1) Event Creation & Editing

- **Rule Name:** Event Title Required
  - Description: Every event must have a non-empty title.
  - Trigger: Creating or updating an event (save/draft/publish).
  - User message: "Event title is required"
  - Severity: BLOCK
  - Suggested enforcement: UI (form validation), API (controller validation), DB (NOT NULL / CHECK length > 0)
  - Test cases:
    - Given an empty title, When creating, Then API returns 400 and UI shows "Event title is required".

- **Rule Name:** Description Optional (max length)
  - Description: Description may be optional but should be capped (e.g., 5000 chars) to prevent abuse.
  - Trigger: Create/update
  - User message: "Description must be at most 5000 characters"
  - Severity: WARN
  - Suggested enforcement: UI (client-side length check), API (validate length), DB (CHECK length <= 5000 or TEXT column and rely on API)
  - Test cases:
    - Given description > limit, When submitting, Then API returns 400 and UI displays validation.

- **Rule Name:** Expected Attendees is optional and non-negative integer
  - Description: `expected_attendees` is an estimate; must be integer >= 0 when provided.
  - Trigger: Create/update
  - Message: "Expected attendees must be a non-negative integer"
  - Severity: WARN
  - Enforcement: UI, API, DB (CHECK >= 0)
  - Test: negative value -> validation error.

- **Rule Name:** Registration Limit optional; if present must be >= 1
  - Description: `registration_limit` constrains registrations; must be integer >=1 when set.
  - Trigger: Create/update/publish
  - Message: "Registration limit must be at least 1"
  - Severity: BLOCK (if invalid)
  - Enforcement: UI, API, DB (CHECK registration_limit IS NULL OR registration_limit >= 1)
  - Test: 0 or negative -> block save/publish.

- **Rule Name:** Venue can be optional until approval
  - Description: `venue_id` may be unset while booking pending; once booking approved, it becomes authoritative for capacity.
  - Trigger: Event creation; venue booking approval
  - Message: N/A (informational) or "Venue required to finalize capacity checks"
  - Severity: WARN
  - Enforcement: UI (allow empty), API (allow null), DB (FK allows NULL)
  - Test: Create event with no venue -> success.

---

## 2) Date/Time Rules

- **Rule Name:** End after Start
  - Description: `end_datetime` must be strictly after `start_datetime`.
  - Trigger: Create/update event or booking
  - Message: "End date must be after start date"
  - Severity: BLOCK
  - Enforcement: UI (prevent submission), API (validate and return 400), DB (CHECK end_datetime > start_datetime)
  - Implemented: Present in `frontend/src/pages/CreateEventPage.js` and `VenueBookingPage.js`; API controllers validate before processing.
  - Test:
    - Given start 2026-01-10 10:00 and end 2026-01-10 09:00, When submit, Then API returns 400.

- **Rule Name:** Start cannot be in the past when publishing
  - Description: When moving to Published status, `start_datetime` must be >= now (or a configurable policy allowing immediate publishes).
  - Trigger: Publish event
  - Message: "Start date cannot be in the past"
  - Severity: BLOCK
  - Enforcement: UI (warning on publish), API (validate at publish endpoint), DB (not enforceable strictly because time passes)
  - Implemented: CreateEventPage has check preventing start < now when publishing.
  - Test: Publish event with start < now -> block.

- **Rule Name:** Edits restricted for ongoing events
  - Description: When event status is `ongoing` (current time between start and end), restrict certain edits (changing start/end, visibility, organizer).
  - Trigger: Edit attempt while event is ongoing
  - Message: "Cannot change event time while event is ongoing"
  - Severity: BLOCK/WARN (changes may be partially allowed depending on field)
  - Enforcement: API (strong), UI (disable fields)
  - Test: Attempt to change start during event -> API responds 400.

- **Rule Name:** Start/End timezone normalization
  - Description: All datetimes must be saved in UTC with timezone-aware stamps; client ensures timezone conversion.
  - Trigger: Any date/time submit
  - Message: Internal error if invalid timezone
  - Severity: BLOCK
  - Enforcement: UI date utilities, API parsing, DB TIMESTAMP WITH TIME ZONE
  - Test: Submit with local timezone -> saved in UTC.

---

## 3) Venue Booking Rules

- **Rule Name:** Venue booking required fields
  - Description: Booking requires `event_id`, `venue_id`, `requested_start_datetime`, `requested_end_datetime`.
  - Trigger: Create booking/package
  - Message: "Missing required fields"
  - Severity: BLOCK
  - Enforcement: API (controller checks), UI (form validation)
  - Implemented: Present in `VenueBookingController.createVenueBooking` and package endpoint.

- **Rule Name:** Advance booking window (min/max days)
  - Description: Bookings must be made at least `minAdvanceDays` and no more than `maxAdvanceDays` in advance (configurable via SystemSetting; defaults 3–30).
  - Trigger: Create/update booking
  - Message: "Venue must be booked at least X days in advance" / "cannot be booked more than Y days"
  - Severity: BLOCK
  - Enforcement: API (controller uses SystemSetting), UI (optional warning)
  - Implemented: Present in `VenueBookingController`.
  - Test: Book 1 day ahead -> 400; Book 60 days ahead -> 400 if > max.

- **Rule Name:** Venue must be active
  - Description: Bookings only allowed for venues with `status = active`.
  - Trigger: Create/update booking
  - Message: "Venue not found or inactive"
  - Severity: BLOCK
  - Enforcement: API, DB (FK + status check recommended)
  - Implemented: `Venue.getById` + status check.

- **Rule Name:** Overlap detection (setup/teardown included)
  - Description: Booking conflicts if existing booking actual start (requested_start - setup) < requested_end AND actual end (requested_end + teardown) > requested_start. Only pending/approved bookings are considered.
  - Trigger: Create/update/approve booking
  - Message: "Venue is not available for the requested time"
  - Severity: BLOCK
  - Enforcement: API and Venue model (`checkAvailability`), DB cannot easily check complex overlaps alone.
  - Implemented: `backend/models/Venue.checkAvailability` includes setup/teardown arithmetic and filters by status [`pending`, `approved`].
  - Test:
    - Given an approved booking 10:00–12:00 with 30min setup/teardown, When new booking requested 11:50–13:00, Then conflict (overlap) -> 409.

- **Rule Name:** Package bookings must be same faculty
  - Description: A venue booking package (multiple venues) must contain venues from the same faculty.
  - Trigger: Create package
  - Message: "Cannot book venues from multiple faculties in the same package"
  - Severity: BLOCK
  - Enforcement: API (package creation checks), DB (difficult across rows)
  - Implemented: `createVenueBookingPackage` enforces this.

- **Rule Name:** Approved bookings lock venue icon/UI
  - Description: When an event has approved venue booking(s), the venue-booking icon should be hidden or display locked state (prevent re-requesting).
  - Trigger: Rendering My Events list and similar views
  - Message: Button hidden or tooltip: "Venue booking locked (approved)"
  - Severity: WARN (UX) / BLOCK (prevent duplicate bookings)
  - Enforcement: UI (conditional rendering), API (prevent duplicate active bookings when creating)
  - Implemented: `MyEventsPage` conditionally hides 📍 when `eventBookings[event.id]` exists.
  - Test: Approve booking -> MyEvents should not show booking button.

- **Rule Name:** Re-request after rejection/cancellation
  - Description: If booking is rejected or cancelled, organizer should be allowed to submit a new booking.
  - Trigger: After booking status becomes `rejected` or `cancelled`
  - Message: N/A (allow booking)
  - Severity: INFO
  - Enforcement: API allows creating bookings; UI shows button when no active approved/pending bookings.
  - Implemented: Controller allows creating new booking when previous bookings are not pending/approved.

---

## 4) Registration & Capacity Rules

- **Rule Name:** Effective registration limit (effective_limit)
  - Description: Effective limit = min(venue_capacity, registration_limit if set else venue_capacity). Registrations cannot exceed effective_limit.
  - Trigger: User registering for event, admin changing venue or registration_limit
  - Message: "Event is full" or "Registration limited to X seats"
  - Severity: BLOCK
  - Enforcement: API (atomic check + reserve), UI (disable register button + show "Full"), DB (transactions, unique seat allocation table; consider CHECK and triggers)
  - Implemented: Capacity checks exist in controllers; needs atomic enforcement (see concurrency section).
  - Test:
    - Given venue capacity 100 and registration_limit 80 -> effective 80. When 80 confirmed registrations exist, Then 81st registration is blocked.

- **Rule Name:** One registration = one seat
  - Description: Each registration increments confirmed seat count by 1.
  - Trigger: Successful registration
  - Message: "Registration complete" or "Added to waitlist"
  - Severity: BLOCK
  - Enforcement: API (create registration record), DB (registrations table with FK to event and user)
  - Test: New registration increases count by 1.

- **Rule Name:** Never exceed venue capacity
  - Description: Even with concurrent requests, confirmed registrations must never exceed venue.capacity.
  - Trigger: Registration attempts
  - Message: "Event is full; you have been placed on the waitlist"
  - Severity: BLOCK
  - Enforcement: API (use DB transaction/row-level locks, SELECT FOR UPDATE, or an atomic counter), DB (enforce via constrained seats table and triggers) — see Concurrency section.
  - Test: Simulate many concurrent registrations and assert confirmed_count <= effective_limit.

- **Rule Name:** Full event behavior (no waitlist)
  - Description: This codebase does not implement a waitlist. When effective_limit is reached, new registration attempts are blocked and the user should see "Event is full". If a waitlist feature is desired, see Extras/Optional features below.
  - Trigger: Registration when event at effective_limit
  - Message: "Event is full"
  - Severity: BLOCK
  - Enforcement: API (return 409 or 400), UI (disable register button + show "Full")
  - Test: Register after full -> API returns 409 and UI shows "Event is full".

- **Rule Name:** Organizer changes venue — re-check capacity
  - Description: If organizer changes event venue (after registrations exist), recalculate effective_limit. If new capacity < confirmed registrations show warning/block new signups and require organizer action to reduce confirmed registrations or migrate attendees.
  - Trigger: Event venue update
  - Message: "New venue capacity (X) is below current confirmed registrations (Y). New registrations are blocked until resolved."
  - Severity: BLOCK for new signups / WARN for organizer
  - Enforcement: API (on venue change, compute numbers and set registration_status to closed or limited), UI (show prominent warning to organizer), DB (store confirmed_count)
  - Test:
    - Given 50 confirmed, change venue capacity to 40 -> system blocks new signups and alerts organizer.

- **Rule Name:** Expected attendees is advisory only
  - Description: `expected_attendees` helps suggest venues but does not enforce registration capacity.
  - Trigger: Venue suggestion and approvals
  - Message: N/A
  - Severity: INFO
  - Enforcement: UI (used by venue search), API (used in capacity checks to warn but not block unless explicit)

---

## 5) Role / Permission Rules

- **Rule Name:** Only organizers can book venue for their event
  - Description: Only the event `organizer_id` may create bookings for that event (administrators/faculty staff manage approvals but should not create event-level bookings for other organizers).
  - Trigger: Create booking
  - Message: "Only the event organizer can book venues"
  - Severity: BLOCK
  - Enforcement: API (controller checks), UI (hide booking action for non-organizers)
  - Implemented: Present in `createVenueBooking`.

- **Rule Name:** Admins cannot create venue bookings
  - Description: Administrators are prevented from creating bookings (they approve/reject/admin override instead).
  - Trigger: Create booking
  - Message: "Administrators cannot create venue bookings"
  - Severity: BLOCK
  - Enforcement: API (controller), UI (hide create actions for admins)
  - Implemented: Controller blocks administrators from creating bookings.

- **Rule Name:** Only faculty staff & admins can approve/reject
  - Description: Only `faculty_staff` (for their faculty) or `administrator` may approve/reject booking requests.
  - Trigger: Approve/reject actions
  - Message: "Not authorized to approve bookings"
  - Severity: BLOCK
  - Enforcement: API (controller role checks), UI (hide approval UI)
  - Implemented: Controller enforces roles and faculty ownership.

- **Rule Name:** Only requester can cancel pending/approved bookings
  - Description: The booking requester may cancel their `pending` or `approved` bookings.
  - Trigger: Cancel booking
  - Message: "Not authorized to cancel this booking"
  - Severity: BLOCK
  - Enforcement: API
  - Implemented: Controller enforces this.

---

## 6) Status Transition Rules (Draft→Published→Ongoing→Completed/Cancelled)

- **Rule Name:** Valid status transitions
  - Description: Only allowed transitions: Draft -> Published, Published -> Ongoing (when start reached), Ongoing -> Completed (when end reached), Any -> Cancelled (by organizer/admin). Disallow reverting Completed to Ongoing.
  - Trigger: Status change requests
  - Message: "Invalid status transition"
  - Severity: BLOCK
  - Enforcement: API (implement state machine in controller/model), UI (disable invalid actions)
  - Test: Attempt Completed -> Published -> rejected by API.

- **Rule Name:** Publishing requires minimal validity
  - Description: To publish, event must have title, start/end valid, organizer, and optionally registration policy.
  - Trigger: Publish action
  - Message: "Cannot publish: {reasons}"
  - Severity: BLOCK
  - Enforcement: API + UI checks

- **Rule Name:** Automatic Ongoing/Completed transitions
  - Description: Background job or read-time logic marks events ongoing/completed based on current time.
  - Trigger: Time passing
  - Message: N/A
  - Severity: INFO
  - Enforcement: Cron job or computed status in queries

---

## 7) UI Visibility / Enablement Rules

- **Rule Name:** Hide/disable venue-booking icon when approved booking exists
  - Description: On organizer event list, the venue booking button (📍) is hidden when there is an approved booking for the event.
  - Trigger: Render My Events
  - Message: Tooltip: "Venue booking locked (approved)"
  - Severity: WARN (UX)
  - Enforcement: UI (conditional rendering), API (return bookings grouped by event). Implemented in `MyEventsPage.js`.
  - Test: Event with approved booking should not show 📍 button.

- **Rule Name:** Disable edit of critical date fields when ongoing
  - Description: While an event is ongoing, disable start/end editing in the UI.
  - Trigger: Event status = ongoing
  - Message: "Cannot edit event time while ongoing"
  - Severity: BLOCK
  - Enforcement: UI + API

- **Rule Name:** Show registration state and counts
  - Description: Show current registered_count and effective_limit in event UI; disable register button if full.
  - Trigger: Event detail / listing
  - Message: "Full" or "X seats remaining"
  - Severity: WARN/BLOCK
  - Enforcement: UI; API provides counts

---

## 8) Notifications / Emails

- **Rule Name:** Notify organizer on booking approval/rejection
  - Description: Send email/notification when booking is approved/rejected with notes and next steps.
  - Trigger: Approve/reject actions
  - Message: N/A (email body)
  - Severity: INFO
  - Enforcement: Backend job / notification service triggered by controller after status change.
  - Test: Approve booking -> organizer receives notification.

- **Rule Name:** Notify registrants when event is cancelled or venue changed
  - Description: If event status = cancelled or venue/time change affects registrants, notify and provide options.
  - Trigger: Status change / venue/time modification
  - Message: Email content includes reason and actions.
  - Severity: WARN
  - Enforcement: Backend notification service; consider batching.

---

## 9) Database Constraints & Indexes

- **Constraint:** Events table
  - `id` PRIMARY KEY
  - `start_datetime` TIMESTAMP WITH TIME ZONE NOT NULL
  - `end_datetime` TIMESTAMP WITH TIME ZONE NOT NULL
  - CHECK (end_datetime > start_datetime)
  - `registration_limit` INTEGER NULL CHECK (registration_limit >= 1)
  - `expected_attendees` INTEGER CHECK (expected_attendees >= 0)
  - Indexes: idx_events_start_datetime

- **Constraint:** Venues table
  - `capacity` INTEGER CHECK (capacity >= 0) NULLABLE
  - `status` enum or CHECK ('active','inactive')
  - Indexes: idx_venues_capacity

- **Constraint:** Venue_bookings table
  - `requested_start_datetime` & `requested_end_datetime` NOT NULL
  - `status` in ('pending','approved','rejected','cancelled')
  - Indexes on requested_start_datetime, requested_end_datetime for availability queries
  - FK `venue_id` -> venues(id) (nullable? usually NOT NULL)

- **Constraint:** Registrations table
  - `event_id` FK -> events(id)
  - Unique constraint per user per event (user cannot register multiple times unless allowed)
  - Index on (`event_id`, `status`) to quickly compute confirmed_count

---

## 10) Concurrency / Race Conditions (atomic seat allocation)

- **Problem:** Multiple users registering concurrently may cause overbooking unless handled atomically.

- **Recommended Solutions:**
  1. DB-level transaction with SELECT ... FOR UPDATE on an event seat counter row; verify confirmed_count < effective_limit then insert registration and increment counter in same transaction.
  2. Use an allocation table holding seat tokens; allocate a token atomically (INSERT into seats with event_id and unique token) and confirm registration.
  3. Use advisory locks (Postgres pg_advisory_xact_lock) on event_id to serialize registration logic.
  4. Use optimistic concurrency control with retries (compare-and-swap on a counter column).

- **Implementation recommendation:** Use method (1) or pg_advisory_xact_lock to guarantee no overbooking; enforce final check before commit and return 409 on conflict.

- **Test cases:**
  - Simulate 200 concurrent registration requests when effective_limit=100 — assert at most 100 confirmed; rest waitlist/409.
  - Simulate race when organizer reduces venue capacity concurrently with registration attempts — ensure either registrations fail or organizer action blocks new signups until reconciled.

---

## Extras: Missing/Recommended Rules (not fully implemented or to strengthen system)

- **Rule:** Atomic registration API (explicit)
  - Description: Ensure registration endpoint uses DB transactions and locks to prevent overbooking.
  - Suggested enforcement: API + DB; add tests to simulate concurrency.

- **Rule:** Enforce unique registration per user per event
  - Description: Prevent duplicate registrations by same user.
  - Suggested enforcement: DB UNIQUE (user_id, event_id) with API-friendly error mapping.

- **Rule:** Booking time validation against event time
  - Description: Approved booking time should overlap or fit inside event start/end, or system must document allowed offsets.
  - Suggested enforcement: API when approving booking, warn/validate if booking is outside event window.

- **Rule:** Blocking new signups when effective_limit < confirmed registrations
  - Description: When organizer reduces capacity/changes venue to a smaller capacity, block new signups and surface a remediation workflow.
  - Suggested enforcement: API + UI warning; consider automatic switching of surplus confirmed to waitlist only after explicit organizer action.

---

## Test Cases (selected, concise)

- Given event start 2026-01-12 10:00 and end 2026-01-12 09:00, When creating event, Then API returns 400 with "End date must be after start date".
- Given venue capacity 50 and registration_limit NULL, When 51st registration arrives (concurrent), Then at most 50 succeed and others receive 409 or are placed on waitlist.
- Given booking A approved 10:00–12:00 with 30m setup/teardown, When booking B requests 09:45–10:15, Then conflict -> 409.
- Given event has approved booking, When rendering MyEvents, Then venue-booking button is hidden.
- Given organizer attempts to edit start during ongoing, When submit, Then API returns 400.

---

## Practical Next Steps / Recommendations

1. Add DB-level atomic registration enforcement (pg_advisory_xact_lock or SELECT FOR UPDATE pattern).
2. Add DB CHECK constraints where possible (end > start, registration_limit >= 1, capacity >=0).
3. Add integration tests for concurrency and overlapping booking scenarios.
4. Ensure notification hooks exist in booking approve/reject and event-cancel flows.

---

## Scanned code locations (for traceability)
- backend/models/Venue.js (`checkAvailability`)
- backend/controllers/VenueBookingController.js (create/update/approve/reject/advanced admin override)
- frontend/src/pages/CreateEventPage.js (date validation)
- frontend/src/pages/VenueBookingPage.js (date validation)
- frontend/src/pages/MyEventsPage.js (UI visibility for booking icon)
- database/schema.sql (table schemas, indexes)

---

If you want, I can:
- Generate a CSV/table of rules mapped to code locations for traceability.
- Add DB CHECK constraint patches and a small migration.
- Implement atomic registration endpoint with tests.
