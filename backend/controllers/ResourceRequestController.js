const ResourceRequest = require('../models/ResourceRequest');
const Resource = require('../models/Resource');
const VenueBooking = require('../models/VenueBooking');
const Event = require('../models/Event');
const SystemSetting = require('../models/SystemSetting');

class ResourceRequestController {
  // Get all resource requests (faculty staff only)
  getResourceRequests = async (req, res) => {
    try {
      const userRole = req.user.role;

      if (userRole !== 'faculty_staff') {
        return res.status(403).json({ error: 'Only faculty staff can view all resource requests' });
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
        userRole !== 'faculty_staff' &&
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
        userRole !== 'faculty_staff' &&
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

      // Check advance booking restrictions (UC-17)
      const settings = await SystemSetting.getSettingsObject();
      const minAdvanceDays = parseInt(settings.min_advance_booking_days) || 3;
      const maxAdvanceDays = parseInt(settings.max_advance_booking_days) || 30;
      
      const resourceStartDate = new Date(requestData.usage_start_datetime);
      const now = new Date();
      const daysInAdvance = Math.floor((resourceStartDate - now) / (1000 * 60 * 60 * 24));
      
      if (daysInAdvance < minAdvanceDays) {
        return res.status(400).json({ 
          error: `Resource must be requested at least ${minAdvanceDays} days in advance` 
        });
      }
      
      if (daysInAdvance > maxAdvanceDays) {
        return res.status(400).json({ 
          error: `Resource cannot be requested more than ${maxAdvanceDays} days in advance` 
        });
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

      if (userRole !== 'faculty_staff') {
        return res.status(403).json({ error: 'Only faculty staff can approve resource requests' });
      }

      const request = await ResourceRequest.getById(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      // Check if the associated event is cancelled or completed
      if (request.event_id) {
        const event = await Event.getById(request.event_id);
        if (event && (event.status === 'cancelled' || event.status === 'completed')) {
          return res.status(400).json({ 
            error: `Cannot modify resource request for ${event.status} events`,
            eventStatus: event.status
          });
        }
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

      if (userRole !== 'faculty_staff') {
        return res.status(403).json({ error: 'Only faculty staff can reject resource requests' });
      }

      if (!rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const request = await ResourceRequest.getById(requestId);
      
      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      // Check if the associated event is cancelled or completed
      if (request.event_id) {
        const event = await Event.getById(request.event_id);
        if (event && (event.status === 'cancelled' || event.status === 'completed')) {
          return res.status(400).json({ 
            error: `Cannot modify resource request for ${event.status} events`,
            eventStatus: event.status
          });
        }
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

  // UC-18: Admin get all resource requests (across all resources)
  getAllResourceRequests = async (req, res) => {
    try {
      const userRole = req.user.role;

      // Only administrators can access this
      if (userRole !== 'administrator') {
        return res.status(403).json({ error: 'Only administrators can access all resource requests' });
      }

      // Get filters from query params
      const filters = {
        status: req.query.status,
        resource_id: req.query.resource_id,
        event_id: req.query.event_id,
        search: req.query.search,
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'desc'
      };

      const requests = await ResourceRequest.getAllWithFilters(filters);

      res.json({
        success: true,
        count: requests.length,
        requests
      });
    } catch (error) {
      console.error('Get all resource requests error:', error);
      res.status(500).json({ error: 'Failed to get resource requests' });
    }
  }

  // UC-18: Admin override resource request (approve, reject, or modify)
  adminOverrideRequest = async (req, res) => {
    try {
      const requestId = req.params.id;
      const userId = req.user.userId;
      const userRole = req.user.role;



      // Only administrators can override
      if (userRole !== 'administrator') {
        return res.status(403).json({ error: 'Only administrators can override resource requests' });
      }

      const {
        action, // 'approve', 'reject', 'modify'
        status, // new status if modifying
        approval_notes,
        rejection_reason,
        requested_quantity,
        usage_start_datetime,
        usage_end_datetime
      } = req.body;

      // Get current request
      const request = await ResourceRequest.getById(requestId);

      if (!request) {
        return res.status(404).json({ error: 'Resource request not found' });
      }

      // Check if request was cancelled by requester
      if (request.status === 'cancelled') {
        return res.status(400).json({ error: 'Cannot override a cancelled request' });
      }

      let result;

      if (action === 'approve') {
        // Admin can approve even if already approved/rejected (override)
        const finalQuantity = requested_quantity || request.requested_quantity;
        const finalStartTime = usage_start_datetime || request.usage_start_datetime;
        const finalEndTime = usage_end_datetime || request.usage_end_datetime;

        // Check resource availability (required rule)
        const availability = await Resource.checkAvailableQuantity(
          request.resource_id,
          finalStartTime,
          finalEndTime,
          requestId
        );

        if (availability.available < finalQuantity) {
          return res.status(409).json({ 
            error: 'Insufficient resource quantity available',
            available: availability.available,
            requested: finalQuantity
          });
        }

        result = await ResourceRequest.approve(requestId, userId, approval_notes);

      } else if (action === 'reject') {

        // Admin can reject even if already approved (override)
        if (!rejection_reason) {
          return res.status(400).json({ error: 'Rejection reason is required' });
        }

        result = await ResourceRequest.reject(requestId, userId, rejection_reason);


      } else if (action === 'modify') {
        // Admin can modify request details
        const updateData = {};

        if (status) updateData.status = status;
        if (approval_notes) updateData.approval_notes = approval_notes;
        if (rejection_reason) updateData.rejection_reason = rejection_reason;
        if (requested_quantity !== undefined) updateData.requested_quantity = requested_quantity;
        if (usage_start_datetime) updateData.usage_start_datetime = usage_start_datetime;
        if (usage_end_datetime) updateData.usage_end_datetime = usage_end_datetime;

        // Validate resource availability if quantity or time changed
        if (requested_quantity || usage_start_datetime || usage_end_datetime) {
          const finalQuantity = requested_quantity || request.requested_quantity;
          const finalStartTime = usage_start_datetime || request.usage_start_datetime;
          const finalEndTime = usage_end_datetime || request.usage_end_datetime;

          const availability = await Resource.checkAvailableQuantity(
            request.resource_id,
            finalStartTime,
            finalEndTime,
            requestId
          );

          if (availability.available < finalQuantity) {
            return res.status(409).json({ 
              error: 'Insufficient resource quantity available',
              available: availability.available,
              requested: finalQuantity
            });
          }
        }

        updateData.approved_by = userId;
        updateData.approved_at = new Date().toISOString();

        result = await ResourceRequest.update(requestId, updateData);

      } else {
        return res.status(400).json({ error: 'Invalid action. Must be approve, reject, or modify' });
      }

      res.json({
        success: true,
        message: `Resource request ${action}d successfully by administrator`,
        request: result
      });
    } catch (error) {
      console.error('Admin override resource request error:', error);
      res.status(500).json({ error: 'Failed to override resource request' });
    }
  }

  // Create resource request package (multiple resources as one request)
  createResourceRequestPackage = async (req, res) => {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const packageData = req.body;

      // Check if user can create resource requests
      if (userRole === 'administrator') {
        return res.status(403).json({ error: 'Administrators cannot create resource requests' });
      }

      // Validate required fields
      if (!packageData.event_id || !packageData.venue_booking_id) {
        return res.status(400).json({ error: 'Missing event_id or venue_booking_id' });
      }

      if (!packageData.resources || !Array.isArray(packageData.resources) || packageData.resources.length === 0) {
        return res.status(400).json({ error: 'No resources selected' });
      }

      if (!packageData.usage_start_datetime || !packageData.usage_end_datetime) {
        return res.status(400).json({ error: 'Missing usage datetime' });
      }

      // Get event to verify ownership
      const Event = require('../models/Event');
      const event = await Event.getById(packageData.event_id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.organizer_id !== userId) {
        return res.status(403).json({ error: 'Only the event organizer can request resources' });
      }

      // Get venue booking to verify it exists and is approved
      const VenueBooking = require('../models/VenueBooking');
      const venueBooking = await VenueBooking.getById(packageData.venue_booking_id);
      
      if (!venueBooking) {
        return res.status(404).json({ error: 'Venue booking not found' });
      }

      if (venueBooking.event_id !== packageData.event_id) {
        return res.status(400).json({ error: 'Venue booking does not belong to this event' });
      }

      if (venueBooking.status !== 'approved') {
        return res.status(400).json({ error: 'Venue booking must be approved before requesting resources' });
      }

      // Generate package ID
      const { v4: uuidv4 } = require('uuid');
      const packageId = uuidv4();

      // Validate all resources and check availability
      const ResourceType = require('../models/Resource');
      const unavailableResources = [];
      const insufficientQuantityResources = [];

      for (const item of packageData.resources) {
        if (!item.resource_id || !item.requested_quantity) {
          return res.status(400).json({ error: 'Each resource must have resource_id and requested_quantity' });
        }

        // Check if resource exists
        const resource = await ResourceType.getById(item.resource_id);
        if (!resource || resource.status !== 'active') {
          return res.status(404).json({ error: `Resource ${item.resource_id} not found or inactive` });
        }

        // Check quantity availability
        const availableQty = await ResourceType.getAvailableQuantity(
          item.resource_id,
          packageData.usage_start_datetime,
          packageData.usage_end_datetime
        );

        if (availableQty < item.requested_quantity) {
          insufficientQuantityResources.push(`${resource.name} (available: ${availableQty}, requested: ${item.requested_quantity})`);
        }
      }

      if (insufficientQuantityResources.length > 0) {
        return res.status(409).json({ 
          error: `Insufficient quantity for: ${insufficientQuantityResources.join(', ')}` 
        });
      }

      // Create request for each resource with same package_id
      const ResourceRequest = require('../models/ResourceRequest');
      const createdRequests = [];
      
      for (const item of packageData.resources) {
        const requestData = {
          event_id: packageData.event_id,
          venue_booking_id: packageData.venue_booking_id,
          resource_id: item.resource_id,
          package_id: packageId,
          requester_user_id: userId,
          requested_quantity: item.requested_quantity,
          usage_start_datetime: packageData.usage_start_datetime,
          usage_end_datetime: packageData.usage_end_datetime,
          setup_instructions: packageData.setup_instructions || null,
          status: 'pending'
        };

        const newRequest = await ResourceRequest.create(requestData);
        createdRequests.push(newRequest);
      }

      // Get complete requests with relations
      const completeRequests = await Promise.all(
        createdRequests.map(r => ResourceRequest.getById(r.id))
      );

      res.status(201).json({
        success: true,
        message: `Resource package with ${createdRequests.length} resources submitted successfully`,
        package_id: packageId,
        requests: completeRequests
      });
    } catch (error) {
      console.error('Create resource request package error:', error);
      res.status(500).json({ error: 'Failed to create resource request package' });
    }
  }
}

module.exports = new ResourceRequestController();

