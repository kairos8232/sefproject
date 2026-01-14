const Event = require('../models/Event');
const SystemSetting = require('../models/SystemSetting');

class EventController {
  // Helper: Calculate event status based on current time
  calculateEventStatus = (event) => {
    // Don't override cancelled status
    if (event.status === 'cancelled') {
      return 'cancelled';
    }

    const now = new Date();
    const startTime = new Date(event.start_datetime);
    const endTime = new Date(event.end_datetime);

    if (now < startTime) {
      return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  }

  // UC-03: Browse Events - Get list of events
  getEvents = async (req, res) => {
    try {
      const { status, visibility } = req.query;
      const currentUser = req.user; // From verifyToken middleware

      let events;

      // Filter by status if provided
      if (status) {
        events = await Event.getByStatus(status);
      }
      // Filter by visibility if provided
      else if (visibility) {
        events = await Event.getByVisibility(visibility);
      }
      // Default: Get all events
      else {
        events = await Event.getAll();
      }

      // Update event status based on current time for non-cancelled events
      events = events.map(event => ({
        ...event,
        status: this.calculateEventStatus(event)
      }));

      // Filter events based on visibility rules
      const filteredEvents = await this.filterEventsByVisibility(events, currentUser);

      res.json({
        success: true,
        count: filteredEvents.length,
        events: filteredEvents
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ 
        error: 'An error occurred while fetching events' 
      });
    }
  }

  // UC-03: Browse Events - Get event details
  getEventById = async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      const event = await Event.getById(id);

      if (!event) {
        return res.status(404).json({ 
          error: 'Event not found' 
        });
      }

      // Check if user has access to this event
      const hasAccess = await this.checkEventAccess(event, currentUser);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'You do not have permission to view this event' 
        });
      }

      // Update event status based on current time
      event.status = this.calculateEventStatus(event);

      res.json({
        success: true,
        event: event
      });
    } catch (error) {
      console.error('Get event by ID error:', error);
      res.status(500).json({ 
        error: 'An error occurred while fetching event details' 
      });
    }
  }

  // Helper: Filter events based on visibility rules
  filterEventsByVisibility = async (events, currentUser) => {
    const userId = currentUser.userId;
    const userRole = currentUser.role;
    const userFacultyId = currentUser.facultyId;

    // Get user's event invitations
    const invitedEventIds = await Event.getUserInvitations(userId);

    // Get venue bookings for approved venue check
    const supabase = require('../config/supabase');
    const { data: approvedBookings } = await supabase
      .from('venue_bookings')
      .select('event_id')
      .eq('status', 'approved');
    const approvedEventIds = new Set(approvedBookings?.map(b => b.event_id) || []);

    const filteredEvents = events.filter(event => {
      // Administrators can see all events (with or without approved venue)
      if (userRole === 'administrator') {
        return true;
      }

      // Event organizers can see their own events (for My Events page)
      if (event.organizer_id === userId) {
        return true;
      }

      // For browse events: Only show events with approved venue bookings
      // Faculty managers, students, and other event organizers should only see public events with venues
      if (!approvedEventIds.has(event.id)) {
        return false;
      }

      // Campus-wide events: Everyone can see
      if (event.visibility === 'campuswide') {
        return true;
      }

      // Faculty-only events: Only users from same faculty as organizer
      if (event.visibility === 'facultyonly') {
        // Event organizers can see all faculty-only events (for management)
        if (userRole === 'event_organizer') {
          return true;
        }
        
        // Check if user's faculty matches organizer's faculty
        return userFacultyId && event.organizer?.faculty_id && 
               userFacultyId === event.organizer.faculty_id;
      }

      // Invite-only events: Only invited users
      if (event.visibility === 'inviteonly') {
        // Event organizer can see their own events
        if (event.organizer_id === userId) {
          return true;
        }
        
        // Check if user is invited
        return invitedEventIds.includes(event.id);
      }

      return false;
    });

    return filteredEvents;
  }

  // Helper: Check if user has access to a specific event
  checkEventAccess = async (event, currentUser) => {
    const userId = currentUser.userId;
    const userRole = currentUser.role;
    const userFacultyId = currentUser.facultyId;

    // Administrators can access all events
    if (userRole === 'administrator') {
      return true;
    }

    // Event organizer can access their own event
    if (event.organizer_id === userId) {
      return true;
    }

    // Campus-wide events: Everyone can access
    if (event.visibility === 'campuswide') {
      return true;
    }

    // Faculty-only events: Check faculty match
    if (event.visibility === 'facultyonly') {
      // Event organizers can access all faculty-only events
      if (userRole === 'event_organizer') {
        return true;
      }
      
      return userFacultyId && event.organizer?.faculty_id && 
             userFacultyId === event.organizer.faculty_id;
    }

    // Invite-only events: Check invitation
    if (event.visibility === 'inviteonly') {
      const invitedEventIds = await Event.getUserInvitations(userId);
      return invitedEventIds.includes(event.id);
    }

    return false;
  }

  // Create new event
  createEvent = async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const eventData = req.body;

      // Check if user can create events
      if (userRole === 'administrator') {
        return res.status(403).json({ error: 'Administrators cannot create events' });
      }

      // Validate required fields
      if (!eventData.event_name || !eventData.start_datetime || !eventData.end_datetime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Set organizer_id to current user
      eventData.organizer_id = userId;

      // Convert empty strings to null for optional integer fields
      if (eventData.registration_limit === '') eventData.registration_limit = null;
      if (eventData.expected_attendees === '') eventData.expected_attendees = null;
      if (eventData.max_participants === '') eventData.max_participants = null;

      // Set default visibility to campuswide if not specified
      if (!eventData.visibility) {
        eventData.visibility = 'campuswide';
      }

      // Only event_organizer, faculty_manager, and administrator can set custom visibility
      if (userRole !== 'event_organizer' && userRole !== 'faculty_manager' && userRole !== 'administrator') {
        eventData.visibility = 'campuswide';
      }

      // Set default status to upcoming
      if (!eventData.status) {
        eventData.status = 'upcoming';
      }

      // Check advance booking restrictions (UC-17)
      const settings = await SystemSetting.getSettingsObject();
      const minAdvanceDays = parseInt(settings.min_advance_booking_days) || 3;
      const maxAdvanceDays = parseInt(settings.max_advance_booking_days) || 30;
      
      const eventStartDate = new Date(eventData.start_datetime);
      const now = new Date();
      const daysInAdvance = Math.floor((eventStartDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysInAdvance < minAdvanceDays) {
        return res.status(400).json({ 
          error: `Event must be scheduled at least ${minAdvanceDays} days in advance` 
        });
      }
      
      if (daysInAdvance > maxAdvanceDays) {
        return res.status(400).json({ 
          error: `Event cannot be scheduled more than ${maxAdvanceDays} days in advance` 
        });
      }

      // Check for time conflicts (organizer automatically participates once venue is approved)
      const Participation = require('../models/Participation');
      const conflictCheck = await Participation.checkTimeConflict(
        userId, 
        eventData.start_datetime, 
        eventData.end_datetime
      );
      if (conflictCheck.hasConflict) {
        const conflict = conflictCheck.conflictingEvent;
        const conflictType = conflict.type === 'participation' 
          ? 'you are participating in' 
          : 'you have created with venue request';
        
        // Format dates without seconds and in a cleaner format
        const startDate = new Date(conflict.start);
        const endDate = new Date(conflict.end);
        const formatOptions = {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        };
        const startFormatted = startDate.toLocaleString('en-US', formatOptions);
        const endFormatted = endDate.toLocaleString('en-US', formatOptions);
        
        return res.status(409).json({ 
          error: `Time conflict: ${conflictType} "${conflict.name}" (${startFormatted} - ${endFormatted})`
        });
      }

      // Create event
      const newEvent = await Event.create(eventData);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event: newEvent
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Failed to create event' });
    }
  }

  // Update event
  updateEvent = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const eventData = req.body;

      // Convert empty strings to null for optional integer fields
      if (eventData.registration_limit === '') eventData.registration_limit = null;
      if (eventData.expected_attendees === '') eventData.expected_attendees = null;
      if (eventData.max_participants === '') eventData.max_participants = null;

      // Auto-close registration when event status changes to completed
      if (eventData.status === 'completed') {
        eventData.registration_status = 'closed';
      }

      // Get existing event
      const event = await Event.getById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if user is the organizer
      if (event.organizer_id !== userId) {
        return res.status(403).json({ error: 'Only the event organizer can edit this event' });
      }

      // Don't allow updating completed or cancelled events
      if (event.status === 'completed' || event.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot edit completed or cancelled events' });
      }

      // Update event
      const updatedEvent = await Event.update(id, eventData);

      res.json({
        success: true,
        message: 'Event updated successfully',
        event: updatedEvent
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Failed to update event' });
    }
  }

  // Cancel event (update status to cancelled)
  cancelEvent = async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const supabase = require('../config/supabase');

      // Get event to check ownership
      const event = await Event.getById(eventId);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only organizer or administrator can cancel event
      if (event.organizer_id !== userId && userRole !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to cancel this event' });
      }

      // Check if already cancelled
      if (event.status === 'cancelled') {
        return res.status(400).json({ error: 'Event is already cancelled' });
      }

      // Begin transaction-like operations with error tracking
      const errors = [];

      // 1. Cancel event
      try {
        await Event.cancel(eventId);
      } catch (error) {
        console.error('Failed to cancel event:', error);
        return res.status(500).json({ 
          error: 'Failed to cancel event',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }

      // 2. Cancel all associated venue bookings
      try {
        const { error: venueError } = await supabase
          .from('venue_bookings')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('event_id', eventId)
          .in('status', ['pending', 'approved']);

        if (venueError) throw venueError;
      } catch (error) {
        console.error('Error cancelling venue bookings:', error);
        errors.push('Some venue bookings could not be cancelled');
      }

      // 3. Cancel all associated resource requests
      try {
        const { error: resourceError } = await supabase
          .from('resource_requests')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('event_id', eventId)
          .in('status', ['pending', 'approved']);

        if (resourceError) throw resourceError;
      } catch (error) {
        console.error('Error cancelling resource requests:', error);
        errors.push('Some resource requests could not be cancelled');
      }

      // Return success with any warnings
      const message = errors.length > 0
        ? `Event cancelled with warnings: ${errors.join(', ')}`
        : 'Event cancelled successfully. All associated venue bookings and resource requests have been cancelled.';

      res.json({
        success: true,
        message,
        warnings: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Cancel event error:', error);
      res.status(500).json({ 
        error: 'Failed to cancel event',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Delete event
  deleteEvent = async (req, res) => {
    try {
      const eventId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Get event to check ownership
      const event = await Event.getById(eventId);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only organizer or administrator can delete event
      if (event.organizer_id !== userId && userRole !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to delete this event' });
      }

      // Delete event
      await Event.delete(eventId);

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }

  // UC: Review Faculty Events - Get events in faculty's venues
  getFacultyEvents = async (req, res) => {
    try {
      const { role, facultyId } = req.user;

      // Only faculty managers can access this
      if (role !== 'faculty_manager') {
        return res.status(403).json({ 
          error: 'Only faculty managers can access faculty events' 
        });
      }

      if (!facultyId) {
        return res.status(400).json({ 
          error: 'Faculty manager must have an assigned faculty' 
        });
      }

      const { status, venue_id, booking_status, start_date, end_date } = req.query;

      // Get events with venue bookings in this faculty
      const events = await Event.getFacultyEvents(facultyId, {
        status,
        venue_id,
        booking_status,
        start_date,
        end_date
      });

      // Enrich events with user feedback
      const userId = req.user.userId;
      const EventFeedback = require('../models/EventFeedback');
      
      const eventsWithFeedback = await Promise.all(
        events.map(async (event) => {
          try {
            const feedback = await EventFeedback.getUserFeedbackForEvent(userId, event.id);
            return {
              ...event,
              user_feedback: feedback || null
            };
          } catch (err) {
            console.error(`[Event ${event.id}] Error fetching feedback:`, err);
            return {
              ...event,
              user_feedback: null
            };
          }
        })
      );

      res.json({
        success: true,
        count: eventsWithFeedback.length,
        events: eventsWithFeedback
      });
    } catch (error) {
      console.error('Get faculty events error:', error);
      res.status(500).json({ 
        error: 'An error occurred while fetching faculty events' 
      });
    }
  }

  // UC: Review Faculty Events - Get detailed event info for faculty
  getFacultyEventById = async (req, res) => {
    try {
      const { id } = req.params;
      const { role, facultyId } = req.user;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        console.error('Invalid event ID format:', id);
        return res.status(400).json({ 
          error: `Invalid event ID format: ${id}` 
        });
      }

      // Only faculty managers can access this
      if (role !== 'faculty_manager') {
        return res.status(403).json({ 
          error: 'Only faculty managers can access faculty events' 
        });
      }

      if (!facultyId) {
        return res.status(400).json({ 
          error: 'Faculty manager must have an assigned faculty' 
        });
      }

      // Get full event details including venue bookings and resources
      const eventDetails = await Event.getFacultyEventDetails(id, facultyId);

      if (!eventDetails) {
        return res.status(404).json({ 
          error: 'Can only provide feedback for events in your faculty venues' 
        });
      }

      res.json({
        success: true,
        event: eventDetails
      });
    } catch (error) {
      console.error('Get faculty event details error:', error);
      res.status(500).json({ 
        error: error.message || 'An error occurred while fetching event details' 
      });
    }
  }

  // Toggle registration status (open/close)
  toggleRegistrationStatus = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Get event
      const event = await Event.getById(id);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check authorization
      if (event.organizer_id !== userId && userRole !== 'administrator') {
        return res.status(403).json({ error: 'Not authorized to modify this event' });
      }

      const newStatus = event.registration_status === 'open' ? 'closed' : 'open';

      // If reopening, check venue capacity
      if (newStatus === 'open') {
        // Get approved venue booking
        const supabase = require('../config/supabase');
        const { data: venueBooking } = await supabase
          .from('venue_bookings')
          .select('venue:venues(capacity)')
          .eq('event_id', id)
          .eq('status', 'approved')
          .single();

        // Get current registration count
        const { count: registeredCount } = await supabase
          .from('event_participation')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id)
          .eq('status', 'registered');

        const venueCapacity = venueBooking?.venue?.capacity;

        // Block reopening if venue capacity is full
        if (venueCapacity && registeredCount >= venueCapacity) {
          return res.status(400).json({ 
            error: 'Cannot reopen - venue capacity full',
            registered: registeredCount,
            capacity: venueCapacity
          });
        }
      }

      // Update registration status
      const updatedEvent = await Event.update(id, { registration_status: newStatus });

      res.json({
        success: true,
        message: `Registration ${newStatus === 'open' ? 'opened' : 'closed'} successfully`,
        event: updatedEvent
      });
    } catch (error) {
      console.error('Toggle registration status error:', error);
      res.status(500).json({ 
        error: 'An error occurred while updating registration status' 
      });
    }
  }
}

module.exports = new EventController();
