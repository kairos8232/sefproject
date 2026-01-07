const VenueBooking = require('../models/VenueBooking');
const Venue = require('../models/Venue');
const Event = require('../models/Event');
const SystemSetting = require('../models/SystemSetting');

class VenueBookingController {
  // Get all venue bookings (admin/faculty manager)
  getVenueBookings = async (req, res) => {
    try {
      const userRole = req.user.role;

      // Only administrators and faculty managers can view all bookings
      if (userRole !== 'administrator' && userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Not authorized to view all bookings' });
      }

      const bookings = await VenueBooking.getAll();

      res.json({
        success: true,
        bookings
      });
    } catch (error) {
      console.error('Get venue bookings error:', error);
      res.status(500).json({ error: 'Failed to get venue bookings' });
    }
  }

  // Get venue booking by ID
  getVenueBookingById = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const booking = await VenueBooking.getById(bookingId);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Check if user has permission to view this booking
      if (
        userRole !== 'administrator' &&
        userRole !== 'faculty_manager' &&
        booking.requester_user_id !== userId &&
        booking.event.organizer_id !== userId
      ) {
        return res.status(403).json({ error: 'Not authorized to view this booking' });
      }

      res.json({
        success: true,
        booking
      });
    } catch (error) {
      console.error('Get venue booking by ID error:', error);
      res.status(500).json({ error: 'Failed to get venue booking' });
    }
  }

  // Get venue bookings for a specific event
  getBookingsByEvent = async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Get event to check ownership
      const event = await Event.getById(eventId);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if user can view these bookings
      if (
        userRole !== 'administrator' &&
        userRole !== 'faculty_manager' &&
        event.organizer_id !== userId
      ) {
        return res.status(403).json({ error: 'Not authorized to view bookings for this event' });
      }

      const bookings = await VenueBooking.getByEventId(eventId);

      res.json({
        success: true,
        bookings
      });
    } catch (error) {
      console.error('Get bookings by event error:', error);
      res.status(500).json({ error: 'Failed to get event bookings' });
    }
  }

  // Get user's own venue bookings
  getMyBookings = async (req, res) => {
    try {
      const userId = req.user.userId;

      const bookings = await VenueBooking.getByUserId(userId);

      res.json({
        success: true,
        bookings
      });
    } catch (error) {
      console.error('Get my bookings error:', error);
      res.status(500).json({ error: 'Failed to get your bookings' });
    }
  }

  // Check venue availability
  checkAvailability = async (req, res) => {
    try {
      const { start_datetime, end_datetime, min_capacity, faculty_id } = req.query;

      if (!start_datetime || !end_datetime) {
        return res.status(400).json({ error: 'Start and end datetime are required' });
      }

      const availableVenues = await Venue.getAvailableVenues(
        start_datetime,
        end_datetime,
        min_capacity ? parseInt(min_capacity) : null,
        faculty_id || null
      );

      res.json({
        success: true,
        venues: availableVenues
      });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ error: 'Failed to check venue availability' });
    }
  }

  // Create venue booking
  createVenueBooking = async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const bookingData = req.body;

      // Check if user can create events/bookings
      if (userRole === 'administrator') {
        return res.status(403).json({ error: 'Administrators cannot create venue bookings' });
      }

      // Validate required fields
      if (!bookingData.event_id || !bookingData.venue_id || !bookingData.requested_start_datetime || !bookingData.requested_end_datetime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get event to verify ownership
      const event = await Event.getById(bookingData.event_id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer can book venues for their event
      if (event.organizer_id !== userId) {
        return res.status(403).json({ error: 'Only the event organizer can book venues' });
      }

      // Check if venue exists and is active
      const venue = await Venue.getById(bookingData.venue_id);
      
      if (!venue || venue.status !== 'active') {
        return res.status(404).json({ error: 'Venue not found or inactive' });
      }

      // Check advance booking restrictions (UC-17)
      const settings = await SystemSetting.getSettingsObject();
      const minAdvanceDays = parseInt(settings.min_advance_booking_days) || 3;
      const maxAdvanceDays = parseInt(settings.max_advance_booking_days) || 30;
      
      const requestedStartDate = new Date(bookingData.requested_start_datetime);
      const now = new Date();
      const daysInAdvance = Math.floor((requestedStartDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysInAdvance < minAdvanceDays) {
        return res.status(400).json({ 
          error: `Venue must be booked at least ${minAdvanceDays} days in advance` 
        });
      }
      
      if (daysInAdvance > maxAdvanceDays) {
        return res.status(400).json({ 
          error: `Venue cannot be booked more than ${maxAdvanceDays} days in advance` 
        });
      }

      // Check venue availability
      const isAvailable = await Venue.checkAvailability(
        bookingData.venue_id,
        bookingData.requested_start_datetime,
        bookingData.requested_end_datetime
      );

      if (!isAvailable) {
        return res.status(409).json({ error: 'Venue is not available for the requested time' });
      }

      // Validate capacity if provided
      if (bookingData.expected_attendees && venue.capacity < bookingData.expected_attendees) {
        return res.status(400).json({ 
          error: `Venue capacity (${venue.capacity}) is insufficient for expected attendees (${bookingData.expected_attendees})` 
        });
      }

      // Set requester_user_id
      bookingData.requester_user_id = userId;

      // Set default status
      bookingData.status = 'pending';

      // Create booking
      const newBooking = await VenueBooking.create(bookingData);

      // Get complete booking with relations
      const completeBooking = await VenueBooking.getById(newBooking.id);

      res.status(201).json({
        success: true,
        message: 'Venue booking submitted successfully',
        booking: completeBooking
      });
    } catch (error) {
      console.error('Create venue booking error:', error);
      res.status(500).json({ error: 'Failed to create venue booking' });
    }
  }

  // Update venue booking
  updateVenueBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const updateData = req.body;

      // Get booking to check ownership
      const booking = await VenueBooking.getById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Only requester can update pending bookings
      if (booking.status !== 'pending') {
        return res.status(400).json({ error: 'Can only update pending bookings' });
      }

      if (booking.requester_user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this booking' });
      }

      // If updating time/venue, check availability
      if (updateData.requested_start_datetime || updateData.requested_end_datetime || updateData.venue_id) {
        const venueId = updateData.venue_id || booking.venue_id;
        const startTime = updateData.requested_start_datetime || booking.requested_start_datetime;
        const endTime = updateData.requested_end_datetime || booking.requested_end_datetime;

        // Check advance booking restrictions (UC-17)
        const settings = await SystemSetting.getSettingsObject();
        const minAdvanceDays = parseInt(settings.min_advance_booking_days) || 3;
        const maxAdvanceDays = parseInt(settings.max_advance_booking_days) || 30;
        
        const requestedStartDate = new Date(startTime);
        const now = new Date();
        const daysInAdvance = Math.floor((requestedStartDate - now) / (1000 * 60 * 60 * 24));
        
        if (daysInAdvance < minAdvanceDays) {
          return res.status(400).json({ 
            error: `Venue must be booked at least ${minAdvanceDays} days in advance` 
          });
        }
        
        if (daysInAdvance > maxAdvanceDays) {
          return res.status(400).json({ 
            error: `Venue cannot be booked more than ${maxAdvanceDays} days in advance` 
          });
        }

        const isAvailable = await Venue.checkAvailability(venueId, startTime, endTime, bookingId);

        if (!isAvailable) {
          return res.status(409).json({ error: 'Venue is not available for the requested time' });
        }
      }

      updateData.updated_at = new Date().toISOString();

      const updatedBooking = await VenueBooking.update(bookingId, updateData);

      res.json({
        success: true,
        message: 'Booking updated successfully',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Update venue booking error:', error);
      res.status(500).json({ error: 'Failed to update venue booking' });
    }
  }

  // Cancel venue booking
  cancelVenueBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const { cancellation_reason } = req.body;

      // Get booking to check ownership
      const booking = await VenueBooking.getById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Only requester can cancel their bookings
      if (booking.requester_user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this booking' });
      }

      // Can only cancel pending or approved bookings
      if (booking.status !== 'pending' && booking.status !== 'approved') {
        return res.status(400).json({ error: 'Can only cancel pending or approved bookings' });
      }

      const cancelledBooking = await VenueBooking.cancel(bookingId, cancellation_reason);

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        booking: cancelledBooking
      });
    } catch (error) {
      console.error('Cancel venue booking error:', error);
      res.status(500).json({ error: 'Failed to cancel venue booking' });
    }
  }

  // Approve venue booking (admin/faculty manager)
  approveVenueBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { approval_notes } = req.body;

      // Only administrators and faculty managers can approve
      if (userRole !== 'administrator' && userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Not authorized to approve bookings' });
      }

      // Get booking
      const booking = await VenueBooking.getById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.status !== 'pending') {
        return res.status(400).json({ error: 'Can only approve pending bookings' });
      }

      // Double-check availability before approving
      const isAvailable = await Venue.checkAvailability(
        booking.venue_id,
        booking.requested_start_datetime,
        booking.requested_end_datetime,
        bookingId
      );

      if (!isAvailable) {
        return res.status(409).json({ error: 'Venue is no longer available for the requested time' });
      }

      const approvedBooking = await VenueBooking.approve(bookingId, userId, approval_notes);

      res.json({
        success: true,
        message: 'Booking approved successfully',
        booking: approvedBooking
      });
    } catch (error) {
      console.error('Approve venue booking error:', error);
      res.status(500).json({ error: 'Failed to approve venue booking' });
    }
  }

  // Reject venue booking (admin/faculty manager)
  rejectVenueBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { rejection_reason } = req.body;

      // Only administrators and faculty managers can reject
      if (userRole !== 'administrator' && userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Not authorized to reject bookings' });
      }

      if (!rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      // Get booking
      const booking = await VenueBooking.getById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      if (booking.status !== 'pending') {
        return res.status(400).json({ error: 'Can only reject pending bookings' });
      }

      const rejectedBooking = await VenueBooking.reject(bookingId, userId, rejection_reason);

      res.json({
        success: true,
        message: 'Booking rejected successfully',
        booking: rejectedBooking
      });
    } catch (error) {
      console.error('Reject venue booking error:', error);
      res.status(500).json({ error: 'Failed to reject venue booking' });
    }
  }

  // Get booking requests for faculty's venues
  getFacultyBookingRequests = async (req, res) => {
    try {
      const userRole = req.user.role;
      const facultyId = req.user.facultyId;

      // Only faculty managers can access this
      if (userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Only faculty managers can access booking requests' });
      }

      if (!facultyId) {
        return res.status(400).json({ error: 'Faculty ID not found for this user' });
      }

      // Get filters from query params
      const filters = {
        status: req.query.status || 'pending',
        venue_id: req.query.venue_id,
        search: req.query.search,
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'desc'
      };

      const bookings = await VenueBooking.getByFacultyId(facultyId, filters);

      res.json({
        success: true,
        bookings
      });
    } catch (error) {
      console.error('[VenueBookingController] Get faculty booking requests error:', error);
      res.status(500).json({ error: 'Failed to get booking requests' });
    }
  }

  // Get detailed booking request by ID
  getBookingRequestDetails = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userRole = req.user.role;
      const facultyId = req.user.facultyId;

      // Only faculty managers can access this
      if (userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Only faculty managers can access booking details' });
      }

      const booking = await VenueBooking.getByIdWithDetails(bookingId);

      if (!booking) {
        return res.status(404).json({ error: 'Booking request not found' });
      }

      // Verify the booking is for a venue in the faculty manager's faculty
      if (booking.venue.faculty_id !== facultyId) {
        return res.status(403).json({ error: 'This booking is not for a venue in your faculty' });
      }

      res.json({
        success: true,
        booking
      });
    } catch (error) {
      console.error('Get booking request details error:', error);
      res.status(500).json({ error: 'Failed to get booking details' });
    }
  }

  // Approve booking request
  approveBookingRequest = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const facultyId = req.user.facultyId;

      // Only faculty managers can approve
      if (userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Only faculty managers can approve bookings' });
      }

      // Get booking details to verify
      const booking = await VenueBooking.getByIdWithDetails(bookingId);

      if (!booking) {
        return res.status(404).json({ error: 'Booking request not found' });
      }

      // Verify the booking is for a venue in the faculty manager's faculty
      if (booking.venue.faculty_id !== facultyId) {
        return res.status(403).json({ error: 'This booking is not for a venue in your faculty' });
      }

      // Check if already processed
      if (booking.status !== 'pending') {
        const approverName = booking.approver ? booking.approver.name : 'another user';
        return res.status(400).json({ 
          error: `This booking has already been ${booking.status} by ${approverName}`,
          currentStatus: booking.status,
          processedBy: approverName,
          processedAt: booking.approved_at
        });
      }

      // Get adjustment data from request body
      const adjustments = {
        approval_notes: req.body.approval_notes,
        approved_start_datetime: req.body.approved_start_datetime,
        approved_end_datetime: req.body.approved_end_datetime
      };

      const approvedBooking = await VenueBooking.approveWithAdjustments(bookingId, userId, adjustments);

      res.json({
        success: true,
        message: 'Booking request approved successfully',
        booking: approvedBooking
      });
    } catch (error) {
      console.error('Approve booking request error:', error);
      
      if (error.message && error.message.includes('already')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to approve booking request' });
    }
  }

  // Reject booking request
  rejectBookingRequest = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const facultyId = req.user.facultyId;
      const { rejection_reason } = req.body;

      // Only faculty managers can reject
      if (userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Only faculty managers can reject bookings' });
      }

      if (!rejection_reason || rejection_reason.trim().length < 10) {
        return res.status(400).json({ error: 'Rejection reason must be at least 10 characters' });
      }

      // Get booking details to verify
      const booking = await VenueBooking.getByIdWithDetails(bookingId);

      if (!booking) {
        return res.status(404).json({ error: 'Booking request not found' });
      }

      // Verify the booking is for a venue in the faculty manager's faculty
      if (booking.venue.faculty_id !== facultyId) {
        return res.status(403).json({ error: 'This booking is not for a venue in your faculty' });
      }

      // Check if already processed
      if (booking.status !== 'pending') {
        const approverName = booking.approver ? booking.approver.name : 'another user';
        return res.status(400).json({ 
          error: `This booking has already been ${booking.status} by ${approverName}`,
          currentStatus: booking.status,
          processedBy: approverName,
          processedAt: booking.approved_at
        });
      }

      const rejectedBooking = await VenueBooking.rejectWithReason(bookingId, userId, rejection_reason);

      res.json({
        success: true,
        message: 'Booking request rejected successfully',
        booking: rejectedBooking
      });
    } catch (error) {
      console.error('Reject booking request error:', error);
      
      if (error.message && error.message.includes('already')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to reject booking request' });
    }
  }

  // UC-18: Admin get all booking requests (across all faculties)
  getAllBookingRequests = async (req, res) => {
    try {
      const userRole = req.user.role;

      // Only administrators can access this
      if (userRole !== 'administrator') {
        return res.status(403).json({ error: 'Only administrators can access all booking requests' });
      }

      // Get filters from query params
      const filters = {
        status: req.query.status,
        venue_id: req.query.venue_id,
        faculty_id: req.query.faculty_id,
        search: req.query.search,
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'desc'
      };

      const bookings = await VenueBooking.getAllWithFilters(filters);

      res.json({
        success: true,
        count: bookings.length,
        bookings
      });
    } catch (error) {
      console.error('Get all booking requests error:', error);
      res.status(500).json({ error: 'Failed to get booking requests' });
    }
  }

  // UC-18: Admin override booking request (approve, reject, or modify)
  adminOverrideBooking = async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Only administrators can override
      if (userRole !== 'administrator') {
        return res.status(403).json({ error: 'Only administrators can override bookings' });
      }

      const { 
        action, // 'approve', 'reject', 'modify'
        status, // new status if modifying
        approval_notes,
        rejection_reason,
        approved_start_datetime,
        approved_end_datetime,
        venue_id,
        setup_time,
        teardown_time,
        expected_attendees
      } = req.body;

      // Get current booking
      const booking = await VenueBooking.getById(bookingId);

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Check if booking was cancelled by requester
      if (booking.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot override a cancelled booking' });
      }

      let result;

      if (action === 'approve') {
        // Admin can approve even if already approved/rejected (override)
        const adjustments = {
          approval_notes,
          approved_start_datetime: approved_start_datetime || booking.requested_start_datetime,
          approved_end_datetime: approved_end_datetime || booking.requested_end_datetime
        };

        // Check venue availability (required rule)
        const finalVenueId = venue_id || booking.venue_id;
        const finalStartTime = approved_start_datetime || booking.requested_start_datetime;
        const finalEndTime = approved_end_datetime || booking.requested_end_datetime;

        const isAvailable = await Venue.checkAvailability(
          finalVenueId,
          finalStartTime,
          finalEndTime,
          bookingId
        );

        if (!isAvailable) {
          return res.status(409).json({ error: 'Venue is not available for the selected time' });
        }

        // Check venue capacity if expected_attendees provided (required rule)
        if (expected_attendees) {
          const venue = await Venue.getById(finalVenueId);
          if (venue && venue.capacity < expected_attendees) {
            return res.status(400).json({ 
              error: `Venue capacity (${venue.capacity}) is insufficient for expected attendees (${expected_attendees})` 
            });
          }
        }

        result = await VenueBooking.adminApproveWithAdjustments(bookingId, userId, adjustments);
        
      } else if (action === 'reject') {
        // Admin can reject even if already approved (override)
        if (!rejection_reason) {
          return res.status(400).json({ error: 'Rejection reason is required' });
        }

        result = await VenueBooking.rejectWithReason(bookingId, userId, rejection_reason);
        
      } else if (action === 'modify') {
        // Admin can modify booking details
        const updateData = {};

        if (status) updateData.status = status;
        if (approval_notes) updateData.approval_notes = approval_notes;
        if (rejection_reason) updateData.rejection_reason = rejection_reason;
        if (approved_start_datetime) updateData.approved_start_datetime = approved_start_datetime;
        if (approved_end_datetime) updateData.approved_end_datetime = approved_end_datetime;
        if (venue_id) updateData.venue_id = venue_id;
        if (setup_time !== undefined) updateData.setup_time = setup_time;
        if (teardown_time !== undefined) updateData.teardown_time = teardown_time;
        if (expected_attendees !== undefined) updateData.expected_attendees = expected_attendees;

        // Validate venue availability if venue or time changed
        if (venue_id || approved_start_datetime || approved_end_datetime) {
          const finalVenueId = venue_id || booking.venue_id;
          const finalStartTime = approved_start_datetime || booking.approved_start_datetime || booking.requested_start_datetime;
          const finalEndTime = approved_end_datetime || booking.approved_end_datetime || booking.requested_end_datetime;

          // Only check if venue or time actually changed
          const venueChanged = venue_id && venue_id !== booking.venue_id;
          const startChanged = approved_start_datetime && approved_start_datetime !== (booking.approved_start_datetime || booking.requested_start_datetime);
          const endChanged = approved_end_datetime && approved_end_datetime !== (booking.approved_end_datetime || booking.requested_end_datetime);

          if (venueChanged || startChanged || endChanged) {
            const isAvailable = await Venue.checkAvailability(
              finalVenueId,
              finalStartTime,
              finalEndTime,
              bookingId
            );

            if (!isAvailable) {
              return res.status(409).json({ error: 'Venue is not available for the selected time' });
            }
          }
        }

        // Check capacity if attendees or venue changed
        if (expected_attendees || venue_id) {
          const finalVenueId = venue_id || booking.venue_id;
          const finalAttendees = expected_attendees || booking.expected_attendees;
          
          if (finalAttendees) {
            const venue = await Venue.getById(finalVenueId);
            if (venue && venue.capacity < finalAttendees) {
              return res.status(400).json({ 
                error: `Venue capacity (${venue.capacity}) is insufficient for expected attendees (${finalAttendees})` 
              });
            }
          }
        }

        updateData.approved_user_id = userId;
        updateData.approved_at = new Date().toISOString();

        result = await VenueBooking.update(bookingId, updateData);
        
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or modify' });
      }

      res.json({
        success: true,
        message: `Booking ${action}d successfully by administrator`,
        booking: result
      });
    } catch (error) {
      console.error('Admin override booking error:', error);
      res.status(500).json({ error: 'Failed to override booking' });
    }
  }
}

module.exports = new VenueBookingController();
