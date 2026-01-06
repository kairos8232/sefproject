const ResourceRequest = require('../models/ResourceRequest');
const Resource = require('../models/Resource');
const VenueBooking = require('../models/VenueBooking');
const Event = require('../models/Event');

class ResourceRequestController {
  // Get all resource requests (faculty managers only)
  getResourceRequests = async (req, res) => {
    try {
      const userRole = req.user.role;

      if (userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Only faculty managers can view all resource requests' });
      }

      const requests = await ResourceRequest.getAll();

      res.json({
        success: true,
        requests
      });
    } catch (error) {
      console.error('Get resource requests error:', error);
      res.status(500).json({ error: 'Failed to get resource requests' });
    }
  }

  // Get resource request by ID
  getResourceRequestById = async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const request = await ResourceRequest.getById(requestId);

      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      // Check if user has permission to view this request
      if (
        userRole !== 'faculty_manager' &&
        request.requester_user_id !== userId &&
        request.event.organizer_id !== userId
      ) {
        return res.status(403).json({ error: 'Not authorized to view this request' });
      }

      res.json({
        success: true,
        request
      });
    } catch (error) {
      console.error('Get resource request by ID error:', error);
      res.status(500).json({ error: 'Failed to get resource request' });
    }
  }

  // Get resource requests for a specific event
  getRequestsByEvent = async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Get event to check ownership
      const event = await Event.getById(eventId);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Check if user can view these requests
      if (
        userRole !== 'faculty_manager' &&
        event.organizer_id !== userId
      ) {
        return res.status(403).json({ error: 'Not authorized to view requests for this event' });
      }

      const requests = await ResourceRequest.getByEventId(eventId);

      res.json({
        success: true,
        requests
      });
    } catch (error) {
      console.error('Get requests by event error:', error);
      res.status(500).json({ error: 'Failed to get event resource requests' });
    }
  }

  // Get user's own resource requests
  getMyRequests = async (req, res) => {
    try {
      const userId = req.user.userId;

      const requests = await ResourceRequest.getByUserId(userId);

      res.json({
        success: true,
        requests
      });
    } catch (error) {
      console.error('Get my requests error:', error);
      res.status(500).json({ error: 'Failed to get your resource requests' });
    }
  }

  // Check resource availability
  checkAvailability = async (req, res) => {
    try {
      const { start_datetime, end_datetime, category } = req.query;

      if (!start_datetime || !end_datetime) {
        return res.status(400).json({ error: 'Start and end datetime are required' });
      }

      const availableResources = await Resource.getAvailableResources(
        start_datetime,
        end_datetime,
        category || null
      );

      res.json({
        success: true,
        resources: availableResources
      });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ error: 'Failed to check resource availability' });
    }
  }

  // Create resource request
  createResourceRequest = async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const requestData = req.body;

      // Check if user can create resource requests
      if (userRole === 'administrator') {
        return res.status(403).json({ error: 'Administrators cannot create resource requests' });
      }

      // Validate required fields
      if (!requestData.event_id || !requestData.venue_booking_id || !requestData.resource_id || 
          !requestData.requested_quantity || !requestData.usage_start_datetime || 
          !requestData.usage_end_datetime) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get event to verify ownership
      const event = await Event.getById(requestData.event_id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Only event organizer can request resources for their event
      if (event.organizer_id !== userId) {
        return res.status(403).json({ error: 'Only the event organizer can request resources' });
      }

      // Get venue booking to verify it exists and is approved
      const venueBooking = await VenueBooking.getById(requestData.venue_booking_id);
      
      if (!venueBooking) {
        return res.status(404).json({ error: 'Venue booking not found' });
      }

      if (venueBooking.status !== 'approved') {
        return res.status(400).json({ error: 'Venue booking must be approved before requesting resources' });
      }

      // Verify venue booking belongs to the event
      if (venueBooking.event_id !== requestData.event_id) {
        return res.status(400).json({ error: 'Venue booking does not belong to this event' });
      }

      // Check if resource exists and is active
      const resource = await Resource.getById(requestData.resource_id);
      
      if (!resource || resource.status !== 'active') {
        return res.status(404).json({ error: 'Resource not found or inactive' });
      }

      // Check resource availability
      const availability = await Resource.checkAvailableQuantity(
        requestData.resource_id,
        requestData.usage_start_datetime,
        requestData.usage_end_datetime
      );

      if (availability.available < requestData.requested_quantity) {
        return res.status(409).json({ 
          error: 'Insufficient resource quantity available',
          available: availability.available,
          requested: requestData.requested_quantity
        });
      }

      // Set requester_user_id
      requestData.requester_user_id = userId;

      // Set default status
      requestData.status = 'pending';

      // Create request
      const newRequest = await ResourceRequest.create(requestData);

      // Get complete request with relations
      const completeRequest = await ResourceRequest.getById(newRequest.id);

      res.status(201).json({
        success: true,
        message: 'Resource request submitted successfully',
        request: completeRequest
      });
    } catch (error) {
      console.error('Create resource request error:', error);
      res.status(500).json({ error: 'Failed to create resource request' });
    }
  }

  // Update resource request
  updateResourceRequest = async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.userId;
      const updateData = req.body;

      // Get request to check ownership
      const request = await ResourceRequest.getById(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      // Only requester can update pending requests
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only update pending requests' });
      }

      if (request.requester_user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this request' });
      }

      // If updating quantity or time, check availability
      if (updateData.requested_quantity || updateData.usage_start_datetime || updateData.usage_end_datetime) {
        const resourceId = request.resource_id;
        const startTime = updateData.usage_start_datetime || request.usage_start_datetime;
        const endTime = updateData.usage_end_datetime || request.usage_end_datetime;
        const quantity = updateData.requested_quantity || request.requested_quantity;

        const availability = await Resource.checkAvailableQuantity(resourceId, startTime, endTime, requestId);

        if (availability.available < quantity) {
          return res.status(409).json({ 
            error: 'Insufficient resource quantity available',
            available: availability.available,
            requested: quantity
          });
        }
      }

      // Update request
      const updatedRequest = await ResourceRequest.update(requestId, updateData);

      // Get complete request with relations
      const completeRequest = await ResourceRequest.getById(updatedRequest.id);

      res.json({
        success: true,
        message: 'Resource request updated successfully',
        request: completeRequest
      });
    } catch (error) {
      console.error('Update resource request error:', error);
      res.status(500).json({ error: 'Failed to update resource request' });
    }
  }

  // Approve resource request (faculty managers only)
  approveResourceRequest = async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { approval_notes } = req.body;

      if (userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Only faculty managers can approve resource requests' });
      }

      const request = await ResourceRequest.getById(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only approve pending requests' });
      }

      // Check availability one more time
      const availability = await Resource.checkAvailableQuantity(
        request.resource_id,
        request.usage_start_datetime,
        request.usage_end_datetime,
        requestId
      );

      if (availability.available < request.requested_quantity) {
        return res.status(409).json({ 
          error: 'Insufficient resource quantity available',
          available: availability.available,
          requested: request.requested_quantity
        });
      }

      const approvedRequest = await ResourceRequest.approve(requestId, userId, approval_notes);

      // Get complete request with relations
      const completeRequest = await ResourceRequest.getById(approvedRequest.id);

      res.json({
        success: true,
        message: 'Resource request approved successfully',
        request: completeRequest
      });
    } catch (error) {
      console.error('Approve resource request error:', error);
      res.status(500).json({ error: 'Failed to approve resource request' });
    }
  }

  // Reject resource request (faculty managers only)
  rejectResourceRequest = async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { rejection_reason } = req.body;

      if (userRole !== 'faculty_manager') {
        return res.status(403).json({ error: 'Only faculty managers can reject resource requests' });
      }

      if (!rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const request = await ResourceRequest.getById(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only reject pending requests' });
      }

      const rejectedRequest = await ResourceRequest.reject(requestId, userId, rejection_reason);

      // Get complete request with relations
      const completeRequest = await ResourceRequest.getById(rejectedRequest.id);

      res.json({
        success: true,
        message: 'Resource request rejected',
        request: completeRequest
      });
    } catch (error) {
      console.error('Reject resource request error:', error);
      res.status(500).json({ error: 'Failed to reject resource request' });
    }
  }

  // Cancel resource request (requester only)
  cancelResourceRequest = async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.userId;
      const { cancellation_reason } = req.body;

      const request = await ResourceRequest.getById(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      // Only requester can cancel
      if (request.requester_user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this request' });
      }

      // Can only cancel pending or approved requests
      if (request.status !== 'pending' && request.status !== 'approved') {
        return res.status(400).json({ error: 'Can only cancel pending or approved requests' });
      }

      const cancelledRequest = await ResourceRequest.cancel(requestId, cancellation_reason || 'Cancelled by requester');

      // Get complete request with relations
      const completeRequest = await ResourceRequest.getById(cancelledRequest.id);

      res.json({
        success: true,
        message: 'Resource request cancelled successfully',
        request: completeRequest
      });
    } catch (error) {
      console.error('Cancel resource request error:', error);
      res.status(500).json({ error: 'Failed to cancel resource request' });
    }
  }

  // Delete resource request (only if pending and owned by requester)
  deleteResourceRequest = async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.userId;

      const request = await ResourceRequest.getById(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      // Only requester can delete
      if (request.requester_user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this request' });
      }

      // Can only delete pending requests
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only delete pending requests' });
      }

      await ResourceRequest.delete(requestId);

      res.json({
        success: true,
        message: 'Resource request deleted successfully'
      });
    } catch (error) {
      console.error('Delete resource request error:', error);
      res.status(500).json({ error: 'Failed to delete resource request' });
    }
  }
}

module.exports = new ResourceRequestController();
