const Venue = require('../models/Venue');
const Faculty = require('../models/Faculty');

class VenueController {
  // Get all venues with filters (admin only for management)
  static async getAllVenues(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can manage venues.' 
        });
      }

      const filters = {
        status: req.query.status,
        facultyId: req.query.facultyId,
        search: req.query.search
      };

      const venues = await Venue.getAll(filters);
      res.json({ success: true, venues });
    } catch (error) {
      console.error('Error getting all venues:', error);
      res.status(500).json({ message: 'Failed to get venues' });
    }
  }

  // Get venue by ID
  static async getVenueById(req, res) {
    try {
      const { id } = req.params;
      const venue = await Venue.getById(id);

      if (!venue) {
        return res.status(404).json({ message: 'Venue not found' });
      }

      res.json(venue);
    } catch (error) {
      console.error('Get venue by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch venue' });
    }
  }

  // Create new venue (admin only)
  static async createVenue(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can create venues.' 
        });
      }

      const { faculty_id, code, name, location, capacity } = req.body;

      // Validate required fields
      if (!faculty_id || !code || !name) {
        return res.status(400).json({ 
          message: 'Faculty, venue code, and name are required.' 
        });
      }

      // Validate code format (alphanumeric, uppercase, hyphens allowed, 2-20 chars)
      const codeRegex = /^[A-Z0-9-]{2,20}$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({ 
          message: 'Venue code must be 2-20 uppercase alphanumeric characters (hyphens allowed).' 
        });
      }

      // Validate capacity if provided
      if (capacity !== undefined && capacity !== null) {
        const capacityNum = parseInt(capacity);
        if (isNaN(capacityNum) || capacityNum < 1) {
          return res.status(400).json({ 
            message: 'Capacity must be a positive number.' 
          });
        }
      }

      // Check if faculty exists and is active
      const faculty = await Faculty.findById(faculty_id);
      if (!faculty) {
        return res.status(400).json({ 
          message: 'Faculty not found.' 
        });
      }
      if (faculty.status !== 'active') {
        return res.status(400).json({ 
          message: 'Cannot create venue for inactive faculty.' 
        });
      }

      // Check for duplicate code
      const existing = await Venue.findByCode(code);
      if (existing) {
        return res.status(400).json({ 
          message: `Venue code '${code}' already exists. Code must be unique.` 
        });
      }

      // Create venue
      const venue = await Venue.create({ 
        faculty_id, 
        code, 
        name, 
        location, 
        capacity: capacity ? parseInt(capacity) : null 
      });
      
      res.status(201).json(venue);
    } catch (error) {
      console.error('Error creating venue:', error);
      res.status(500).json({ message: 'Failed to create venue' });
    }
  }

  // Update venue (admin only)
  static async updateVenue(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can update venues.' 
        });
      }

      const { id } = req.params;
      const { faculty_id, code, name, location, capacity } = req.body;

      // Check if venue exists
      const venue = await Venue.getById(id);
      if (!venue) {
        return res.status(404).json({ message: 'Venue not found' });
      }

      // Validate code if provided
      if (code) {
        const codeRegex = /^[A-Z0-9-]{2,20}$/;
        if (!codeRegex.test(code)) {
          return res.status(400).json({ 
            message: 'Venue code must be 2-20 uppercase alphanumeric characters (hyphens allowed).' 
          });
        }

        // Check for duplicate code (only if code is changing)
        if (code !== venue.code) {
          const existing = await Venue.findByCode(code);
          if (existing) {
            return res.status(400).json({ 
              message: `Venue code '${code}' already exists. Code must be unique.` 
            });
          }
        }
      }

      // Validate capacity if provided
      if (capacity !== undefined && capacity !== null) {
        const capacityNum = parseInt(capacity);
        if (isNaN(capacityNum) || capacityNum < 1) {
          return res.status(400).json({ 
            message: 'Capacity must be a positive number.' 
          });
        }
      }

      // Check if faculty exists and is active (if changing faculty)
      if (faculty_id && faculty_id !== venue.faculty_id) {
        const faculty = await Faculty.findById(faculty_id);
        if (!faculty) {
          return res.status(400).json({ 
            message: 'Faculty not found.' 
          });
        }
        if (faculty.status !== 'active') {
          return res.status(400).json({ 
            message: 'Cannot assign venue to inactive faculty.' 
          });
        }
      }

      // Update venue
      const updatedVenue = await Venue.update(id, { 
        faculty_id, 
        code, 
        name, 
        location, 
        capacity: capacity ? parseInt(capacity) : null 
      });
      
      res.json(updatedVenue);
    } catch (error) {
      console.error('Error updating venue:', error);
      res.status(500).json({ message: 'Failed to update venue' });
    }
  }

  // Update venue status (admin only)
  static async updateVenueStatus(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can update venue status.' 
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Validate status (only active/inactive, no maintenance)
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ 
          message: 'Status must be either "active" or "inactive".' 
        });
      }

      // Check if venue exists
      const venue = await Venue.getById(id);
      if (!venue) {
        return res.status(404).json({ message: 'Venue not found' });
      }

      // If deactivating, check for upcoming bookings
      if (status === 'inactive') {
        const hasUpcoming = await Venue.hasUpcomingBookings(id);
        if (hasUpcoming) {
          return res.status(400).json({ 
            message: 'Cannot deactivate venue with upcoming approved bookings. Please cancel or complete the bookings first.' 
          });
        }
      }

      // Update status
      const updatedVenue = await Venue.update(id, { status });
      res.json(updatedVenue);
    } catch (error) {
      console.error('Error updating venue status:', error);
      res.status(500).json({ message: 'Failed to update venue status' });
    }
  }

  // Legacy method for other parts of the system (kept for compatibility)
  static async getVenues(req, res) {
    try {
      const { role, facultyId } = req.user;

      let venues;

      // If faculty manager, only show their faculty's venues
      if (role === 'faculty_manager' && facultyId) {
        const allVenues = await Venue.getAll({ status: 'active' });
        venues = allVenues.filter(venue => venue.faculty_id === facultyId);
      } else {
        // For other roles, show all active venues
        venues = await Venue.getAll({ status: 'active' });
      }

      res.json({
        success: true,
        venues
      });
    } catch (error) {
      console.error('Get venues error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch venues'
      });
    }
  }
}

module.exports = VenueController;
