const EventFeedback = require('../models/EventFeedback');
const Event = require('../models/Event');
const VenueBooking = require('../models/VenueBooking');

class EventFeedbackController {
  // Get events eligible for feedback (completed events from last 3 months in user's faculty venues)
  getEligibleEvents = async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const facultyId = req.user.facultyId;

      // Only faculty staff can provide feedback
      if (userRole !== 'faculty_staff') {
        return res.status(403).json({ error: 'Only faculty staff can provide feedback' });
      }

      if (!facultyId) {
        return res.status(400).json({ error: 'Faculty ID not found for user' });
      }

      // Get completed events from last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const now = new Date();

      // Get all events in user's faculty
      const events = await Event.getFacultyEvents(facultyId, {});

      // Filter for completed events in the last 3 months with approved bookings
      const eligibleEvents = events.filter(event => {
        const eventEnd = new Date(event.end_datetime);
        const hasApprovedBooking = event.venue_bookings && 
          event.venue_bookings.some(booking => booking.status === 'approved');
        return eventEnd < now && eventEnd > threeMonthsAgo && hasApprovedBooking;
      });

      // For each eligible event, check if user already provided feedback
      const eventsWithFeedbackStatus = await Promise.all(
        eligibleEvents.map(async (event) => {
          const existingFeedback = await EventFeedback.getUserFeedbackForEvent(userId, event.id);
          return {
            ...event,
            has_feedback: !!existingFeedback,
            feedback_id: existingFeedback?.id || null,
            can_edit: existingFeedback ? EventFeedback.canEdit(existingFeedback.created_at) : false
          };
        })
      );

      res.json({
        success: true,
        events: eventsWithFeedbackStatus
      });
    } catch (error) {
      console.error('Get eligible events error:', error);
      res.status(500).json({ error: 'Failed to get eligible events' });
    }
  }

  // Create feedback
  createFeedback = async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const facultyId = req.user.facultyId;
      
      const {
        event_id,
        venue_condition_rating,
        event_organization_rating,
        cleanliness_rating,
        overall_rating,
        comments,
        suggestions
      } = req.body;

      console.log('=== createFeedback called ===');
      console.log('Event ID:', event_id);
      console.log('User ID:', userId);
      console.log('User role:', userRole);
      console.log('User facultyId:', facultyId);

      // Validate user is faculty staff
      if (userRole !== 'faculty_staff') {
        console.log('❌ Not a faculty staff');
        return res.status(403).json({ error: 'Only faculty staff can provide feedback' });
      }

      // Validate required fields
      if (!event_id || !comments) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ error: 'Event ID and comments are required' });
      }

      // Validate ratings are within range
      const ratings = [venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating];
      for (const rating of ratings) {
        if (rating && (rating < 1 || rating > 5)) {
          console.log('❌ Invalid rating:', rating);
          return res.status(400).json({ error: 'Ratings must be between 1 and 5' });
        }
      }

      // Get event and verify it's completed and in user's faculty
      const event = await Event.getById(event_id);
      console.log('Event found:', event ? event.event_name : 'No');
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if event is completed
      const eventEnd = new Date(event.end_datetime);
      console.log('Event end date:', eventEnd);
      console.log('Is completed:', eventEnd < new Date());
      if (eventEnd >= new Date()) {
        console.log('❌ Event not completed yet');
        return res.status(400).json({ error: 'Cannot provide feedback for ongoing or future events' });
      }

      // Check if event is within last 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (eventEnd < threeMonthsAgo) {
        console.log('❌ Event too old');
        return res.status(400).json({ error: 'Feedback period has expired (only last 3 months)' });
      }

      // Verify event is in user's faculty (check venue bookings)
      const venueBookings = await VenueBooking.getByEventId(event_id);
      console.log('Venue bookings found:', venueBookings.length);
      console.log('Venue bookings data:', JSON.stringify(venueBookings, null, 2));
      
      if (venueBookings.length === 0) {
        console.log('❌ No venue bookings');
        return res.status(400).json({ error: 'No venue bookings found for this event' });
      }

      // Check if any venue belongs to user's faculty
      const isInUserFaculty = venueBookings.some(booking => {
        console.log('Checking booking:', {
          id: booking.id,
          venue: booking.venue,
          venue_faculty_id: booking.venue?.faculty_id,
          user_faculty_id: facultyId,
          match: booking.venue?.faculty_id === facultyId
        });
        return booking.venue && booking.venue.faculty_id === facultyId;
      });

      console.log('Is in user faculty:', isInUserFaculty);

      if (!isInUserFaculty) {
        console.log('❌ Not in user faculty venues');
        return res.status(403).json({ error: 'Can only provide feedback for events in your faculty venues' });
      }

      // Check if user already provided feedback
      const existingFeedback = await EventFeedback.getUserFeedbackForEvent(userId, event_id);
      if (existingFeedback) {
        console.log('❌ Feedback already exists');
        return res.status(400).json({ 
          error: 'You have already provided feedback for this event',
          feedback_id: existingFeedback.id
        });
      }

      // Create feedback
      const feedbackData = {
        event_id,
        user_id: userId,
        venue_condition_rating: venue_condition_rating || null,
        event_organization_rating: event_organization_rating || null,
        cleanliness_rating: cleanliness_rating || null,
        overall_rating: overall_rating || null,
        comments,
        suggestions: suggestions || null
      };

      const feedback = await EventFeedback.create(feedbackData);

      res.status(201).json({
        success: true,
        feedback
      });
    } catch (error) {
      console.error('Create feedback error:', error);
      if (error.code === '23505') {
        // Duplicate entry
        return res.status(400).json({ error: 'You have already provided feedback for this event' });
      }
      res.status(500).json({ error: 'Failed to create feedback' });
    }
  }

  // Update feedback (only within 24 hours)
  updateFeedback = async (req, res) => {
    try {
      const feedbackId = req.params.id;
      const userId = req.user.userId;
      
      const {
        venue_condition_rating,
        event_organization_rating,
        cleanliness_rating,
        overall_rating,
        comments,
        suggestions
      } = req.body;

      // Get existing feedback
      const existingFeedback = await EventFeedback.getById(feedbackId);
      if (!existingFeedback) {
        return res.status(404).json({ error: 'Feedback not found' });
      }

      // Check ownership
      if (existingFeedback.user_id !== userId) {
        return res.status(403).json({ error: 'You can only update your own feedback' });
      }

      // Check if feedback can be edited (within 24 hours)
      if (!EventFeedback.canEdit(existingFeedback.created_at)) {
        return res.status(403).json({ error: 'Feedback can only be edited within 24 hours of submission' });
      }

      // Validate required fields
      if (!comments) {
        return res.status(400).json({ error: 'Comments are required' });
      }

      // Validate ratings
      const ratings = [venue_condition_rating, event_organization_rating, cleanliness_rating, overall_rating];
      for (const rating of ratings) {
        if (rating && (rating < 1 || rating > 5)) {
          return res.status(400).json({ error: 'Ratings must be between 1 and 5' });
        }
      }

      // Update feedback
      const feedbackData = {
        venue_condition_rating: venue_condition_rating || null,
        event_organization_rating: event_organization_rating || null,
        cleanliness_rating: cleanliness_rating || null,
        overall_rating: overall_rating || null,
        comments,
        suggestions: suggestions || null,
        updated_at: new Date().toISOString()
      };

      const updatedFeedback = await EventFeedback.update(feedbackId, feedbackData);

      res.json({
        success: true,
        feedback: updatedFeedback
      });
    } catch (error) {
      console.error('Update feedback error:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  }

  // Get all feedbacks for an event (for event organizer)
  getFeedbacksForEvent = async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Get event
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check permission: only event organizer, admins, or faculty staff can view feedbacks
      if (
        userRole !== 'administrator' &&
        event.organizer_id !== userId &&
        userRole !== 'faculty_staff'
      ) {
        return res.status(403).json({ error: 'Not authorized to view feedbacks for this event' });
      }

      // Get all feedbacks
      const feedbacks = await EventFeedback.getByEventId(eventId);

      res.json({
        success: true,
        feedbacks
      });
    } catch (error) {
      console.error('Get feedbacks for event error:', error);
      res.status(500).json({ error: 'Failed to get feedbacks' });
    }
  }

  // Get user's feedback for a specific event
  getUserFeedback = async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const userId = req.user.userId;

      const feedback = await EventFeedback.getUserFeedbackForEvent(userId, eventId);

      if (!feedback) {
        return res.json({
          success: true,
          feedback: null,
          has_feedback: false
        });
      }

      res.json({
        success: true,
        feedback,
        has_feedback: true,
        can_edit: EventFeedback.canEdit(feedback.created_at)
      });
    } catch (error) {
      console.error('Get user feedback error:', error);
      res.status(500).json({ error: 'Failed to get feedback' });
    }
  }

  // Get all feedbacks submitted by user
  getMyFeedbacks = async (req, res) => {
    try {
      const userId = req.user.userId;

      const feedbacks = await EventFeedback.getByUserId(userId);

      res.json({
        success: true,
        feedbacks
      });
    } catch (error) {
      console.error('Get my feedbacks error:', error);
      res.status(500).json({ error: 'Failed to get feedbacks' });
    }
  }
}

module.exports = new EventFeedbackController();
