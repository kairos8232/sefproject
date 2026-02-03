const Participation = require('../models/Participation');
const Event = require('../models/Event');
const EventInvitation = require('../models/EventInvitation');

class ParticipationController {
  // Register for an event
  register = async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      // Check if event exists
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if registration is closed
      if (event.registration_status === 'closed') {
        return res.status(400).json({ error: 'Registration is closed for this event' });
      }

      // Check if event is still upcoming or ongoing
      if (event.status === 'completed' || event.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot register for completed or cancelled events' });
      }

      // Check if user already registered with active status
      const existingParticipation = await Participation.getUserEventParticipation(eventId, userId);
      
      if (existingParticipation && existingParticipation.status === 'registered') {
        return res.status(400).json({ error: 'You are already registered for this event' });
      }

      // Check for time conflicts with user's existing events/participations
      const conflictCheck = await Participation.checkTimeConflict(userId, event.start_datetime, event.end_datetime, eventId);
      if (conflictCheck.hasConflict) {
        return res.status(409).json({ 
          error: 'You have a time conflict with another event',
          conflictingEvent: conflictCheck.conflictingEvent
        });
      }

      // Check capacity limit before allowing registration
      const currentCount = await Participation.getEventParticipationCount(eventId, 'registered');
      let capacityLimit = null;

      // Priority 1: Use event's registration_limit if set
      if (event.registration_limit) {
        capacityLimit = event.registration_limit;
      } else {
        // Priority 2: Use venue capacity from approved booking
        const eventWithBookings = await Event.getByIdWithVenueBookings(eventId);
        const approvedBooking = eventWithBookings?.venue_bookings?.find(b => b.status === 'approved');
        if (approvedBooking?.venue?.capacity) {
          capacityLimit = approvedBooking.venue.capacity;
        }
      }

      // If capacity limit exists and is reached, reject registration
      if (capacityLimit && currentCount >= capacityLimit) {
        return res.status(400).json({ 
          error: 'Event is full',
          message: `This event has reached its maximum capacity of ${capacityLimit} participants.`,
          capacity: capacityLimit,
          currentCount
        });
      }

      // Register user (will update if previously cancelled, or insert if new)
      const participation = await Participation.register(eventId, userId);
      const message = existingParticipation ? 'Successfully re-registered for event' : 'Successfully registered for event';

      // Auto-close registration if limit reached
      const newCount = currentCount + 1;
      if (capacityLimit && newCount >= capacityLimit) {
        await Event.update(eventId, { registration_status: 'closed' });
      }

      res.status(201).json({
        message,
        participation
      });
    } catch (error) {
      console.error('Error in register:', error);
      
      // Handle duplicate registration (unique constraint violation)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'You are already registered for this event' });
      }
      
      res.status(500).json({ error: 'Failed to register for event' });
    }
  };

  // Cancel participation
  cancel = async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      // Check if user is registered
      const participation = await Participation.getUserEventParticipation(eventId, userId);
      
      if (!participation) {
        return res.status(404).json({ error: 'You are not registered for this event' });
      }

      if (participation.status === 'cancelled') {
        return res.status(400).json({ error: 'Your registration is already cancelled' });
      }

      if (participation.status === 'attended') {
        return res.status(400).json({ error: 'Cannot cancel after attending the event' });
      }

      // Cancel participation
      const updatedParticipation = await Participation.cancel(eventId, userId);

      res.status(200).json({
        message: 'Successfully cancelled registration',
        participation: updatedParticipation
      });
    } catch (error) {
      console.error('Error in cancel:', error);
      res.status(500).json({ error: 'Failed to cancel registration' });
    }
  };

  // Get user's participation status for an event
  getStatus = async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;
      let registeredCount = await Participation.getEventParticipationCount(eventId, 'registered');

      // Get event with booking info for capacity
      const event = await Event.getById(eventId);
      const eventWithBookings = await Event.getByIdWithVenueBookings(eventId);
      
      let capacityLimit = null;
      // Priority 1: Use event's registration_limit if set
      if (event?.registration_limit) {
        capacityLimit = event.registration_limit;
      } else {
        // Priority 2: Use venue capacity from approved booking
        const approvedBooking = eventWithBookings?.venue_bookings?.find(b => b.status === 'approved');
        if (approvedBooking?.venue?.capacity) {
          capacityLimit = approvedBooking.venue.capacity;
        }
      }
      
      // For invite-only events, count accepted invitations as participants
      if (event?.visibility === 'inviteonly') {
        const acceptedCount = await EventInvitation.getCountByStatus(eventId, 'accepted');
        registeredCount = acceptedCount;
      }

      // Get user's participation status
      const participation = await Participation.getUserEventParticipation(eventId, userId);
      const isRegistered = participation && participation.status === 'registered';

      res.status(200).json({
        isRegistered,
        status: participation?.status || null,
        registeredCount,
        capacityLimit,
        isFull: capacityLimit ? registeredCount >= capacityLimit : false
      });
    } catch (error) {
      console.error('Error in getStatus:', error);
      res.status(500).json({ error: 'Failed to get participation status' });
    }
  };

  // Get user's all participations
  getMyParticipations = async (req, res) => {
    try {
      const userId = req.user.userId;

      const participations = await Participation.getUserParticipations(userId);

      res.status(200).json({
        participations
      });
    } catch (error) {
      console.error('Error in getMyParticipations:', error);
      res.status(500).json({ error: 'Failed to get participations' });
    }
  };

  // Get event participants (for organizers/admins)
  getEventParticipants = async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Check if event exists
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer or administrator can view participants
      if (userRole !== 'administrator' && event.organizer_id !== userId) {
        return res.status(403).json({ error: 'You do not have permission to view participants' });
      }

      const participants = await Participation.getEventParticipants(eventId);
      const registeredCount = await Participation.getEventParticipationCount(eventId, 'registered');

      res.status(200).json({
        participants,
        registeredCount,
        totalCount: participants.length
      });
    } catch (error) {
      console.error('Error in getEventParticipants:', error);
      res.status(500).json({ error: 'Failed to get event participants' });
    }
  };

  // Record attendance for event participants
  recordAttendance = async (req, res) => {
    try {
      const { eventId } = req.params;
      const { attendanceUpdates } = req.body; // Array of { participationId, attended }
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Validate input
      if (!attendanceUpdates || !Array.isArray(attendanceUpdates) || attendanceUpdates.length === 0) {
        return res.status(400).json({ error: 'attendanceUpdates array is required' });
      }

      // Check if event exists
      const event = await Event.getById(eventId);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer can record attendance
      if (event.organizer_id !== userId) {
        return res.status(403).json({ error: 'Only the event organizer can record attendance' });
      }

      // Update attendance
      const updatedParticipations = await Participation.updateAttendance(attendanceUpdates);

      res.status(200).json({
        message: 'Attendance recorded successfully',
        updatedCount: updatedParticipations.length,
        participations: updatedParticipations
      });
    } catch (error) {
      console.error('Error in recordAttendance:', error);
      res.status(500).json({ error: 'Failed to record attendance' });
    }
  };

  // Get calendar data for user (participations + created events with approved venues)
  getCalendarData = async (req, res) => {
    try {
      const userId = req.user.userId;
      const { start, end, status, venueStatus } = req.query;

      // Get all user's participations
      const participations = await Participation.getUserParticipations(userId);
      
      // Get all events created by user
      const Event = require('../models/Event');
      const { data: createdEvents, error } = await require('../config/supabase')
        .from('events')
        .select(`
          id,
          event_name,
          description,
          event_type,
          status,
          start_datetime,
          end_datetime,
          venue_bookings (
            id,
            status,
            setup_time,
            teardown_time,
            requested_start_datetime,
            requested_end_datetime,
            venue:venue_id (
              id,
              name,
              code
            )
          )
        `)
        .eq('organizer_id', userId)
        .order('start_datetime', { ascending: true });

      if (error) throw error;

      // Process events
      const calendarEvents = [];

      // Add participating events (actual event time)
      participations.forEach(part => {
        if (!part.event || part.status === 'cancelled') return;
        
        const eventStatus = part.event.status;
        if (status && eventStatus !== status) return;

        const eventStart = new Date(part.event.start_datetime);
        const eventEnd = new Date(part.event.end_datetime);

        if (start && eventStart < new Date(start)) return;
        if (end && eventEnd > new Date(end)) return;

        calendarEvents.push({
          id: part.event.id,
          title: part.event.event_name,
          start: part.event.start_datetime,
          end: part.event.end_datetime,
          type: 'participation',
          eventType: part.event.event_type,
          status: eventStatus,
          description: part.event.description
        });
      });

      // Add created events with approved venues only (includes setup/teardown)
      createdEvents?.forEach(event => {
        if (event.status === 'cancelled') return;
        if (status && event.status !== status) return;

        const approvedBookings = event.venue_bookings?.filter(vb => {
          if (venueStatus) {
            return vb.status === venueStatus;
          }
          return vb.status === 'approved';
        }) || [];

        if (approvedBookings.length > 0) {
          // Use the first approved booking's time (they should all have same time)
          const booking = approvedBookings[0];
          const setupMinutes = booking.setup_time || 0;
          const teardownMinutes = booking.teardown_time || 0;
          
          const eventStart = new Date(new Date(booking.requested_start_datetime).getTime() - setupMinutes * 60000);
          const eventEnd = new Date(new Date(booking.requested_end_datetime).getTime() + teardownMinutes * 60000);

          if (start && eventStart < new Date(start)) return;
          if (end && eventEnd > new Date(end)) return;

          calendarEvents.push({
            id: event.id,
            title: event.event_name,
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            type: 'created',
            eventType: event.event_type,
            status: event.status,
            venueStatus: booking.status,
            description: event.description,
            venues: approvedBookings.map(b => b.venue).filter(v => v)
          });
        }
      });

      // Sort by start time
      calendarEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

      res.status(200).json({
        events: calendarEvents,
        count: calendarEvents.length
      });
    } catch (error) {
      console.error('Error in recordAttendance:', error);
      res.status(500).json({ error: 'Failed to record attendance' });
    }
  };
}

module.exports = new ParticipationController();
