const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const AuthController = require('../controllers/AuthController');

// All routes require authentication and admin role (checked in controller)
router.get('/event-summary', AuthController.verifyToken, ReportController.getEventSummary);
router.get('/venue-utilization', AuthController.verifyToken, ReportController.getVenueUtilization);
router.get('/booking-statistics', AuthController.verifyToken, ReportController.getBookingStatistics);
router.get('/resource-usage', AuthController.verifyToken, ReportController.getResourceUsage);
router.get('/participation-trends', AuthController.verifyToken, ReportController.getParticipationTrends);

module.exports = router;
