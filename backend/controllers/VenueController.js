const Venue = require('../models/Venue');

class VenueController {
  // Get all venues or filter by faculty
  getVenues = async (req, res) => {
    try {
      const { role, facultyId } = req.user;

      let venues;

      // If faculty manager, only show their faculty's venues
      if (role === 'faculty_manager' && facultyId) {
        const allVenues = await Venue.getAll();
        venues = allVenues.filter(venue => venue.faculty_id === facultyId);
      } else {
        // For other roles, show all venues
        venues = await Venue.getAll();
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
  };

  // Get venue by ID
  getVenueById = async (req, res) => {
    try {
      const { id } = req.params;
      const venue = await Venue.getById(id);

      if (!venue) {
        return res.status(404).json({
          success: false,
          error: 'Venue not found'
        });
      }

      res.json({
        success: true,
        venue
      });
    } catch (error) {
      console.error('Get venue by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch venue'
      });
    }
  };
}

module.exports = new VenueController();
