const Event = require('../models/Event');

class EventController {
  // UC-03: Browse Events - Get list of events
  async getEvents(req, res) {
    try {
      const { status, visibility } = req.query;

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

      res.json({
        success: true,
        count: events.length,
        events: events
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({ 
        error: 'An error occurred while fetching events' 
      });
    }
  }

  // UC-03: Browse Events - Get event details
  async getEventById(req, res) {
    try {
      const { id } = req.params;

      const event = await Event.getById(id);

      if (!event) {
        return res.status(404).json({ 
          error: 'Event not found' 
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
}

module.exports = new EventController();
