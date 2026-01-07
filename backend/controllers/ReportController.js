const Report = require('../models/Report');

class ReportController {
  // Get Event Summary Report
  getEventSummary = async (req, res) => {
    try {
      console.log('=== GET EVENT SUMMARY REPORT ===');
      console.log('User:', req.user);
      const { role } = req.user;
      
      // Only administrators can access reports
      if (role !== 'administrator') {
        console.log('Access denied - role:', role);
        return res.status(403).json({
          error: 'Only administrators can access reports'
        });
      }
      
      const { startDate, endDate, facultyId, eventType } = req.query;
      console.log('Query params:', { startDate, endDate, facultyId, eventType });
      
      const events = await Report.getEventSummary({
        startDate,
        endDate,
        facultyId,
        eventType
      });
      
      console.log('Events fetched:', events.length);
      res.json({ success: true, events });
    } catch (error) {
      console.error('Error fetching event summary:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to fetch event summary' });
    }
  };
  
  // Get Venue Utilization Report
  getVenueUtilization = async (req, res) => {
    try {
      console.log('=== GET VENUE UTILIZATION REPORT ===');
      const { role } = req.user;
      
      if (role !== 'administrator') {
        console.log('Access denied - role:', role);
        return res.status(403).json({
          error: 'Only administrators can access reports'
        });
      }
      
      const { startDate, endDate, facultyId, venueId } = req.query;
      console.log('Query params:', { startDate, endDate, facultyId, venueId });
      
      const data = await Report.getVenueUtilization({
        startDate,
        endDate,
        facultyId,
        venueId
      });
      
      console.log('Bookings:', data.bookings?.length, 'Blocks:', data.blocks?.length);
      res.json({ success: true, ...data });
    } catch (error) {
      console.error('Error fetching venue utilization:', error);
      console.error('Error details:', error.message);
      res.status(500).json({ error: 'Failed to fetch venue utilization' });
    }
  };
  
  // Get Booking Statistics Report
  getBookingStatistics = async (req, res) => {
    try {
      console.log('=== GET BOOKING STATISTICS REPORT ===');
      const { role } = req.user;
      
      if (role !== 'administrator') {
        console.log('Access denied - role:', role);
        return res.status(403).json({
          error: 'Only administrators can access reports'
        });
      }
      
      const { startDate, endDate, facultyId } = req.query;
      console.log('Query params:', { startDate, endDate, facultyId });
      
      const bookings = await Report.getBookingStatistics({
        startDate,
        endDate,
        facultyId
      });
      
      console.log('Bookings fetched:', bookings.length);
      res.json({ success: true, bookings });
    } catch (error) {
      console.error('Error fetching booking statistics:', error);
      console.error('Error details:', error.message);
      res.status(500).json({ error: 'Failed to fetch booking statistics' });
    }
  };
  
  // Get Resource Usage Report
  getResourceUsage = async (req, res) => {
    try {
      const { role } = req.user;
      
      if (role !== 'administrator') {
        return res.status(403).json({
          error: 'Only administrators can access reports'
        });
      }
      
      const { startDate, endDate, facultyId, resourceTypeId } = req.query;
      
      const requests = await Report.getResourceUsage({
        startDate,
        endDate,
        facultyId,
        resourceTypeId
      });
      
      res.json({ success: true, requests });
    } catch (error) {
      console.error('Error fetching resource usage:', error);
      res.status(500).json({ error: 'Failed to fetch resource usage' });
    }
  };
  
  // Get Participation Trends Report
  getParticipationTrends = async (req, res) => {
    try {
      const { role } = req.user;
      
      if (role !== 'administrator') {
        return res.status(403).json({
          error: 'Only administrators can access reports'
        });
      }
      
      const { startDate, endDate, facultyId } = req.query;
      
      const participations = await Report.getParticipationTrends({
        startDate,
        endDate,
        facultyId
      });
      
      res.json({ success: true, participations });
    } catch (error) {
      console.error('Error fetching participation trends:', error);
      res.status(500).json({ error: 'Failed to fetch participation trends' });
    }
  };
}

module.exports = new ReportController();
