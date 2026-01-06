const Event = require('../models/Event');

class EventController {
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
      // Default: Get all upcoming and ongoing events
      else {
        events = await Event.getAll();
      }

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

    const filteredEvents = events.filter(event => {
      // Administrators can see all events
      if (userRole === 'administrator') {
        return true;
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

      // Set default visibility to campuswide if not specified
      if (!eventData.visibility) {
        eventData.visibility = 'campuswide';
      }

      // Only event_organizer can set custom visibility
      if (userRole !== 'event_organizer' && userRole !== 'administrator') {
        eventData.visibility = 'campuswide';
      }

      // Set default status to upcoming
      if (!eventData.status) {
        eventData.status = 'upcoming';
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

      res.json({
        success: true,
        count: events.length,
        events
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
          error: 'Event not found or not in your faculty\'s venues' 
        });
      }

      res.json({
        success: true,
        event: eventDetails
      });
    } catch (error) {
      console.error('Get faculty event details error:', error);
      res.status(500).json({ 
        error: 'An error occurred while fetching event details' 
      });
    }
  }}

module.exports = new EventController();
