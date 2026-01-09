const express = require('express');
const VenueBookingController = require('../controllers/VenueBookingController');
const AuthController = require('../controllers/AuthController');
const Venue = require('../models/Venue');

const router = express.Router();

// Test endpoint to check venues in database
router.get('/test-venues', async (req, res) => {
  try {
    const venues = await Venue.getAll();
    res.json({ count: venues.length, venues });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to check existing bookings
router.get('/test-bookings', async (req, res) => {
  try {
    const { data, error } = await require('../config/supabase')
      .from('venue_bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ count: data?.length || 0, bookings: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UC-07: Submit Venue Booking - Check venue availability
// GET /api/venue-bookings/availability?start_datetime=...&end_datetime=...&min_capacity=...&faculty_id=...
router.get('/availability', AuthController.verifyToken, VenueBookingController.checkAvailability);

// UC-07: Submit Venue Booking - Get user's own bookings
// GET /api/venue-bookings/my-bookings
router.get('/my-bookings', AuthController.verifyToken, VenueBookingController.getMyBookings);

// UC-11: Review Venue Booking Requests - Get faculty's booking requests
// GET /api/venue-bookings/faculty/requests?status=pending&venue_id=...&search=...&sort_by=...&sort_order=...
router.get('/faculty/requests', AuthController.verifyToken, VenueBookingController.getFacultyBookingRequests);

// UC-07: Submit Venue Booking - Get bookings for specific event
// GET /api/venue-bookings/event/:eventId
router.get('/event/:eventId', AuthController.verifyToken, VenueBookingController.getBookingsByEvent);

// UC-07: Submit Venue Booking - Get all bookings (admin/faculty manager)
// GET /api/venue-bookings
router.get('/', AuthController.verifyToken, VenueBookingController.getVenueBookings);

// UC-07: Submit Venue Booking - Get booking by ID
// GET /api/venue-bookings/:id
router.get('/:id', AuthController.verifyToken, VenueBookingController.getVenueBookingById);

// UC-11: Review Venue Booking Requests - Get detailed booking request
// GET /api/venue-bookings/:id/details
router.get('/:id/details', AuthController.verifyToken, VenueBookingController.getBookingRequestDetails);

// UC-07: Submit Venue Booking - Create new booking
// POST /api/venue-bookings
router.post('/', AuthController.verifyToken, VenueBookingController.createVenueBooking);

// UC-07: Submit Venue Booking Package - Create multiple venue bookings as one package
// POST /api/venue-bookings/package
router.post('/package', AuthController.verifyToken, VenueBookingController.createVenueBookingPackage);

// UC-07: Submit Venue Booking - Update booking
// PUT /api/venue-bookings/:id
router.put('/:id', AuthController.verifyToken, VenueBookingController.updateVenueBooking);

// UC-07: Submit Venue Booking - Cancel booking
// POST /api/venue-bookings/:id/cancel
router.post('/:id/cancel', AuthController.verifyToken, VenueBookingController.cancelVenueBooking);

// UC-07: Submit Venue Booking - Approve booking (admin/faculty manager)
// POST /api/venue-bookings/:id/approve
router.post('/:id/approve', AuthController.verifyToken, VenueBookingController.approveVenueBooking);

// UC-11: Review Venue Booking Requests - Approve booking request
// POST /api/venue-bookings/:id/approve-request
router.post('/:id/approve-request', AuthController.verifyToken, VenueBookingController.approveBookingRequest);

// UC-07: Submit Venue Booking - Reject booking (admin/faculty manager)
// POST /api/venue-bookings/:id/reject
router.post('/:id/reject', AuthController.verifyToken, VenueBookingController.rejectVenueBooking);

// UC-11: Review Venue Booking Requests - Reject booking request
// POST /api/venue-bookings/:id/reject-request
router.post('/:id/reject-request', AuthController.verifyToken, VenueBookingController.rejectBookingRequest);

// UC-18: Admin - Get all booking requests (all faculties)
// GET /api/venue-bookings/admin/all-requests
router.get('/admin/all-requests', AuthController.verifyToken, VenueBookingController.getAllBookingRequests);

// UC-18: Admin - Override booking request (approve/reject/modify)
// POST /api/venue-bookings/admin/:id/override
router.post('/admin/:id/override', AuthController.verifyToken, VenueBookingController.adminOverrideBooking);

module.exports = router;
