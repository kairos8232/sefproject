# Page-by-Page Validation Audit

This audit confirms which validations are present on each important frontend page and whether corresponding server-side and DB validations exist. It also highlights missing validations that should be added.

## Summary of high-priority gaps
- Missing atomic registration under concurrency (risk of overbooking).
- `EventController.updateEvent` lacks server-side re-validation for date ranges, advance-booking and time conflicts (UI validates but server does not).
- DB CHECK constraints missing for end>start, registration_limit and capacity.

---

## Per-page findings

- `frontend/src/pages/CreateEventPage.js`
  - UI: required fields, end>start, start not in past, expected_attendees (required), registration_limit min.
  - Server: `EventController.createEvent` enforces required fields, advance booking window, and time conflict check.
  - DB: no CHECK on end>start or registration_limit.
  - Recommendation: add DB CHECK and ensure server explicitly rejects start < now when publishing.

- `frontend/src/pages/EditEventPage.js`
  - UI: validates end>start.
  - Server: `EventController.updateEvent` checks ownership/status but does NOT re-validate dates/conflicts.
  - Gap: add server-side validation on update (end>start, conflict, advance window when changing start).

- `frontend/src/pages/EventDetailsPage.js`
  - UI: registration flow checks (pre-check for custom fields), shows registered counts and capacity.
  - Server: `ParticipationController.register` enforces registration_status, event status, duplicate registration, time conflicts, and capacity limit.
  - DB: `event_participation` has UNIQUE(event_id,user_id) to prevent duplicates.
  - Gap: backend needs atomic seat allocation to avoid race conditions.

- `frontend/src/pages/EventsPage.js`
  - UI: client filtering, visibility rules; students only see events with approved venue bookings.
  - Server: `EventController.filterEventsByVisibility` enforces visibility rules server-side.

- `frontend/src/pages/MyEventsPage.js`
  - UI: hides venue-booking icon when approved booking exists; confirms delete actions.
  - Server: controllers enforce ownership and authorization.

- `frontend/src/pages/VenueBookingPage.js`
  - UI: required start/end, end>start, setup/teardown handled in availability search.
  - Server: `VenueBookingController.createVenueBooking` validates required fields, advance window, venue active, availability (via `Venue.checkAvailability`), capacity.

- `frontend/src/pages/VenueBookingDetailsPage.js`
  - UI: display only; server enforces access.

- `frontend/src/pages/RequestResourcesPage.js`
  - UI: ensures selection and validates quantities against `availableQuantity`.
  - Server: resource controllers validate availability.

- `frontend/src/pages/CustomizeRegistrationFormPage.js`
  - UI: field label required, choice fields require options, editing disabled when registrations exist.
  - Server: registrationField endpoints enforce `hasRegistrations` and prevent modifications.

---

## Recommended fixes (short)
1. Implement atomic registration (DB transaction or advisory lock). Location: `ParticipationController.register` + `Participation.register`.
2. Add server-side re-validation on event updates in `EventController.updateEvent`.
3. Add DB CHECK constraints for `events` (end>start, registration_limit), `venues` (capacity >=0).
4. Optionally: validate approved booking times vs event time during approval.

---

## Backend validation mapping (per page)

- **CreateEventPage**: Server: [backend/controllers/EventController.js](backend/controllers/EventController.js#L187) (`createEvent`) enforces required fields, advance-booking window (lines ~223) and time-conflict check via [backend/models/Participation.js](backend/models/Participation.js#L153) (`checkTimeConflict`).

- **EditEventPage**: Server: [backend/controllers/EventController.js](backend/controllers/EventController.js#L274) (`updateEvent`) enforces ownership/status but does NOT re-validate dates/conflicts — add validation here.

- **EventDetailsPage (registration)**: Server: [backend/controllers/ParticipationController.js](backend/controllers/ParticipationController.js#L6) (`register`) enforces registration_status, event status, duplicate prevention and capacity checks (count before insert at [backend/controllers/ParticipationController.js](backend/controllers/ParticipationController.js#L44)). Conflict detection is delegated to [backend/models/Participation.js](backend/models/Participation.js#L153) (`checkTimeConflict`). Participant counts come from [backend/models/Participation.js](backend/models/Participation.js#L262) (`getEventParticipationCount`).

- **EventsPage**: Server visibility enforcement: [backend/controllers/EventController.js](backend/controllers/EventController.js#L78) (`filterEventsByVisibility`) and [backend/controllers/EventController.js](backend/controllers/EventController.js#L146) (`checkEventAccess`).

- **MyEventsPage**: Server ownership & bookings: [backend/controllers/EventController.js](backend/controllers/EventController.js#L6) (`getEvents`) and venue booking lookups via [backend/controllers/VenueBookingController.js](backend/controllers/VenueBookingController.js#L63) (`getBookingsByEvent`).

- **VenueBookingPage**: Server: availability and booking creation handled by [backend/controllers/VenueBookingController.js](backend/controllers/VenueBookingController.js#L115) (`checkAvailability`) and [backend/controllers/VenueBookingController.js](backend/controllers/VenueBookingController.js#L141) (`createVenueBooking`). Availability algorithm lives in [backend/models/Venue.js](backend/models/Venue.js#L167) (`checkAvailability`).

- **VenueBookingDetailsPage**: Server access and details via [backend/controllers/VenueBookingController.js](backend/controllers/VenueBookingController.js#L30) (`getVenueBookingById`) and approval flows at [backend/controllers/VenueBookingController.js](backend/controllers/VenueBookingController.js#L508) (`approveBookingRequest`).

- **RequestResourcesPage**: Server availability checks in [backend/controllers/ResourceRequestController.js](backend/controllers/ResourceRequestController.js#L113) and related resource models.

- **CustomizeRegistrationFormPage**: Server prevents edits when registrations exist via [backend/controllers/RegistrationFieldController.js](backend/controllers/RegistrationFieldController.js#L25) calling [backend/models/RegistrationField.js](backend/models/RegistrationField.js#L125) (`eventHasRegistrations`).

---

If you want I can implement any of the above (I recommend starting with atomic registration). Which should I do next?
