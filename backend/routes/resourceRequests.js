const express = require('express');
const router = express.Router();
const resourceRequestController = require('../controllers/ResourceRequestController');
const AuthController = require('../controllers/AuthController');

// All routes require authentication
router.use(AuthController.verifyToken);

// Check resource availability
router.get('/availability', resourceRequestController.checkAvailability);

// Get all resource requests (faculty staff only)
router.get('/', resourceRequestController.getResourceRequests);

// Get user's own resource requests
router.get('/my-requests', resourceRequestController.getMyRequests);

// Get resource requests by event
router.get('/event/:eventId', resourceRequestController.getRequestsByEvent);

// Get resource request by ID
router.get('/:id', resourceRequestController.getResourceRequestById);

// Create resource request
router.post('/', resourceRequestController.createResourceRequest);

// Create resource request package (multiple resources)
router.post('/package', resourceRequestController.createResourceRequestPackage);

// Update resource request
router.put('/:id', resourceRequestController.updateResourceRequest);

// Approve resource request (faculty staff only)
router.post('/:id/approve', resourceRequestController.approveResourceRequest);

// Reject resource request (faculty staff only)
router.post('/:id/reject', resourceRequestController.rejectResourceRequest);

// Cancel resource request
router.post('/:id/cancel', resourceRequestController.cancelResourceRequest);

// Delete resource request
router.delete('/:id', resourceRequestController.deleteResourceRequest);

// UC-18: Admin - Get all resource requests
router.get('/admin/all-requests', resourceRequestController.getAllResourceRequests);

// UC-18: Admin - Override resource request (approve/reject/modify)
router.post('/admin/:id/override', resourceRequestController.adminOverrideRequest);

module.exports = router;
