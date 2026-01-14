const VenueAvailability = require('../models/VenueAvailability');
const Venue = require('../models/Venue');

class VenueAvailabilityController {
  // Get all blocked slots for venues in faculty staff's faculty
  getBlockedSlots = async (req, res) => {
    try {
      const { role, facultyId } = req.user;
      const { venue_id } = req.query;

      // Only faculty staff can access this
      if (role !== 'faculty_staff') {
        return res.status(403).json({
          error: 'Only faculty staff can manage venue availability'
        });
      }

      if (!facultyId) {
        return res.status(400).json({
          error: 'Faculty staff must have an assigned faculty'
        });
      }

      let blocks;
      if (venue_id) {
        // Verify the venue belongs to the faculty
        const venue = await Venue.getById(venue_id);
        if (!venue || venue.faculty_id !== facultyId) {
          return res.status(403).json({
            error: 'You can only manage venues in your faculty'
          });
        }
        blocks = await VenueAvailability.getBlockedSlots(venue_id);
      } else {
        blocks = await VenueAvailability.getFacultyBlockedSlots(facultyId);
      }

      res.json({
        success: true,
        blocks
      });
    } catch (error) {
      console.error('Get blocked slots error:', error);
      res.status(500).json({
        error: 'Failed to fetch blocked time slots'
      });
    }
  };

  // Get all blocked slots across all faculties (admin only)
  getAllBlocks = async (req, res) => {
    try {
      const { role } = req.user;

      // Only admins can access all blocks
      if (role !== 'admin' && role !== 'administrator') {
        return res.status(403).json({
          error: 'Only admins can view all venue availability blocks'
        });
      }

      const blocks = await VenueAvailability.getAllBlocks();

      res.json({
        success: true,
        blocks
      });
    } catch (error) {
      console.error('Get all blocked slots error:', error);
      res.status(500).json({
        error: 'Failed to fetch blocked time slots'
      });
    }
  };

  // Create a new blocked time slot
  createBlock = async (req, res) => {
    try {
      const { role, facultyId, userId } = req.user;
      const { venue_id, blocked_start_datetime, blocked_end_datetime, reason } = req.body;

      // Only faculty staff can access this
      if (role !== 'faculty_staff') {
        return res.status(403).json({
          error: 'Only faculty staff can manage venue availability'
        });
      }

      if (!facultyId) {
        return res.status(400).json({
          error: 'Faculty staff must have an assigned faculty'
        });
      }

      // Validate required fields
      if (!venue_id || !blocked_start_datetime || !blocked_end_datetime) {
        return res.status(400).json({
          error: 'Venue ID, start datetime, and end datetime are required'
        });
      }

      // Verify the venue belongs to the faculty
      const venue = await Venue.getById(venue_id);
      if (!venue || venue.faculty_id !== facultyId) {
        return res.status(403).json({
          error: 'You can only manage venues in your faculty'
        });
      }

      // Check if the time range is valid
      const startTime = new Date(blocked_start_datetime);
      const endTime = new Date(blocked_end_datetime);
      if (startTime >= endTime) {
        return res.status(400).json({
          error: 'End time must be after start time'
        });
      }

      // Check for conflicts with existing blocks
      const hasBlockConflict = await VenueAvailability.checkConflict(
        venue_id,
        blocked_start_datetime,
        blocked_end_datetime
      );

      if (hasBlockConflict) {
        return res.status(409).json({
          error: 'This time slot conflicts with an existing blocked period'
        });
      }

      // Check for conflicts with approved bookings
      const hasBookingConflict = await VenueAvailability.checkBookingConflict(
        venue_id,
        blocked_start_datetime,
        blocked_end_datetime
      );

      if (hasBookingConflict) {
        return res.status(409).json({
          error: 'This time slot conflicts with an existing approved booking'
        });
      }

      // Create the block
      const block = await VenueAvailability.createBlock({
        venue_id,
        blocked_start_datetime,
        blocked_end_datetime,
        reason,
        created_by: userId
      });

      res.status(201).json({
        success: true,
        message: 'Time slot blocked successfully',
        block
      });
    } catch (error) {
      console.error('Create block error:', error);
      res.status(500).json({
        error: 'Failed to block time slot'
      });
    }
  };

  // Update an existing blocked time slot
  updateBlock = async (req, res) => {
    try {
      const { role, facultyId } = req.user;
      const { id } = req.params;
      const { blocked_start_datetime, blocked_end_datetime, reason } = req.body;

      // Only faculty staff can access this
      if (role !== 'faculty_staff') {
        return res.status(403).json({
          error: 'Only faculty staff can manage venue availability'
        });
      }

      if (!facultyId) {
        return res.status(400).json({
          error: 'Faculty staff must have an assigned faculty'
        });
      }

      // Get the existing block
      const existingBlocks = await VenueAvailability.getBlockedSlots(null);
      const existingBlock = existingBlocks.find(b => b.id === id);

      if (!existingBlock) {
        return res.status(404).json({
          error: 'Blocked time slot not found'
        });
      }

      // Verify the venue belongs to the faculty
      const venue = await Venue.getById(existingBlock.venue_id);
      if (!venue || venue.faculty_id !== facultyId) {
        return res.status(403).json({
          error: 'You can only manage venues in your faculty'
        });
      }

      // Check if the time range is valid
      const startTime = new Date(blocked_start_datetime);
      const endTime = new Date(blocked_end_datetime);
      if (startTime >= endTime) {
        return res.status(400).json({
          error: 'End time must be after start time'
        });
      }

      // Check for conflicts with other blocks (excluding this one)
      const hasBlockConflict = await VenueAvailability.checkConflict(
        existingBlock.venue_id,
        blocked_start_datetime,
        blocked_end_datetime,
        id
      );

      if (hasBlockConflict) {
        return res.status(409).json({
          error: 'This time slot conflicts with another blocked period'
        });
      }

      // Check for conflicts with approved bookings
      const hasBookingConflict = await VenueAvailability.checkBookingConflict(
        existingBlock.venue_id,
        blocked_start_datetime,
        blocked_end_datetime
      );

      if (hasBookingConflict) {
        return res.status(409).json({
          error: 'This time slot conflicts with an existing approved booking'
        });
      }

      // Update the block
      const updatedBlock = await VenueAvailability.updateBlock(id, {
        blocked_start_datetime,
        blocked_end_datetime,
        reason
      });

      res.json({
        success: true,
        message: 'Blocked time slot updated successfully',
        block: updatedBlock
      });
    } catch (error) {
      console.error('Update block error:', error);
      res.status(500).json({
        error: 'Failed to update blocked time slot'
      });
    }
  };

  // Delete a blocked time slot
  deleteBlock = async (req, res) => {
    try {
      const { role, facultyId } = req.user;
      const { id } = req.params;

      // Only faculty staff can access this
      if (role !== 'faculty_staff') {
        return res.status(403).json({
          error: 'Only faculty staff can manage venue availability'
        });
      }

      if (!facultyId) {
        return res.status(400).json({
          error: 'Faculty staff must have an assigned faculty'
        });
      }

      // Get the existing block (we need to fetch all to find this one)
      const allBlocks = await VenueAvailability.getFacultyBlockedSlots(facultyId);
      const existingBlock = allBlocks.find(b => b.id === id);

      if (!existingBlock) {
        return res.status(404).json({
          error: 'Blocked time slot not found or does not belong to your faculty'
        });
      }

      // Delete the block
      await VenueAvailability.deleteBlock(id);

      res.json({
        success: true,
        message: 'Blocked time slot removed successfully'
      });
    } catch (error) {
      console.error('Delete block error:', error);
      res.status(500).json({
        error: 'Failed to remove blocked time slot'
      });
    }
  };
}

module.exports = new VenueAvailabilityController();
