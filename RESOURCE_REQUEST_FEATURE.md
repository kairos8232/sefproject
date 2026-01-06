# Resource Request System

## Overview
The Resource Request System allows event organizers to request campus resources (equipment, furniture, catering, etc.) for their events after their venue booking has been approved.

## Features Implemented

### Backend
1. **Models**
   - `Resource.js` - Manages campus resources with availability tracking
   - `ResourceRequest.js` - Handles resource request CRUD operations

2. **Controller**
   - `ResourceRequestController.js` - 14 endpoints with role-based authorization
   - Availability checking with quantity management
   - Approve/Reject/Cancel workflows

3. **Routes**
   - `/api/resource-requests/*` - All resource request endpoints
   - Integrated with existing authentication middleware

4. **Database**
   - `resources` table - Stores available campus resources
   - `resource_requests` table - Tracks all resource requests
   - Sample data: 10 different resource types (projectors, chairs, tables, sound systems, etc.)

### Frontend
1. **Services**
   - `resourceRequestService.js` - API integration with JWT authentication

2. **Pages**
   - `RequestResourcesPage.js` - Resource selection and request submission
   - `MyResourceRequestsPage.js` - View and manage submitted requests

3. **Integration**
   - Added "Request Resources" button (📦) to My Events page
   - Only shows for events with approved venue bookings
   - Added "My Resource Requests" card to HomePage

## User Flow

### Request Resources
1. Go to **My Events**
2. Click event with approved venue booking
3. Click **📦 Request Resources** button
4. Select resource category (optional filter)
5. Click on a resource card to select it
6. Specify quantity (system shows available quantity)
7. Add setup instructions (optional)
8. Submit request

### Track Requests
1. Go to **My Resource Requests** from homepage or direct navigation
2. View all requests with status: pending, approved, rejected, cancelled
3. Filter by status
4. Cancel pending or approved requests

### Faculty Manager Approval
- Faculty managers can approve/reject requests
- System enforces availability checking
- Approval notes and rejection reasons tracked

## Key Features

### Availability Management
- **Real-time availability**: System calculates available quantity by checking overlapping approved requests
- **Example**: If 200 chairs exist and Event A has 50 approved for Jan 1 15:00-17:00, Event B can request up to 150 for the same time

### Request Rules
1. **Single resource per request** - Easier to manage approvals/rejections
2. **Venue booking required** - Must have approved venue first
3. **Time locked to venue booking** - Usage period matches approved venue times
4. **Only event organizer can request** - Requester must be event owner
5. **Administrators cannot request** - Admin role is for management only

### Status Workflow
- **Pending** → **Approved** ✅ (by faculty manager)
- **Pending** → **Rejected** ❌ (by faculty manager with reason)
- **Pending/Approved** → **Cancelled** 🚫 (by requester)

## Resource Categories
- **Audio/Visual**: Projectors, microphones, PA systems, LED screens, cameras
- **Furniture**: Chairs, tables, whiteboards
- **IT Equipment**: Laptops, presentation equipment
- **Catering**: Snack packages (with advance notice requirements)
- **Other**: Custom resources

## Technical Implementation

### Database Schema
```sql
resources:
- id, name, category, description
- total_quantity, available_quantity, unit
- status, managed_by, notes

resource_requests:
- id, event_id, venue_booking_id, resource_id
- requester_user_id, requested_quantity
- usage_start_datetime, usage_end_datetime
- setup_instructions, status
- approved_by, approval_notes, rejection_reason
```

### API Endpoints
- `GET /api/resource-requests` - Get all (faculty managers only)
- `GET /api/resource-requests/my-requests` - User's requests
- `GET /api/resource-requests/availability` - Check available resources
- `GET /api/resource-requests/:id` - Get specific request
- `POST /api/resource-requests` - Create new request
- `PUT /api/resource-requests/:id` - Update pending request
- `POST /api/resource-requests/:id/approve` - Approve (faculty manager)
- `POST /api/resource-requests/:id/reject` - Reject (faculty manager)
- `POST /api/resource-requests/:id/cancel` - Cancel request
- `DELETE /api/resource-requests/:id` - Delete pending request

### Authorization
- **Students, Event Organizers, Faculty Managers**: Can create requests
- **Administrators**: Cannot create requests (admin functions only)
- **Faculty Managers**: Can approve/reject all requests
- **Requesters**: Can cancel/delete own pending requests

## UI/UX Features
- **Visual resource cards** with availability indicators
- **Category filtering** for easy resource browsing
- **Real-time quantity validation** 
- **Unavailable resources** clearly marked
- **Status badges** with color coding
- **Responsive design** for mobile/tablet
- **Consistent styling** matching venue booking pages

## Future Enhancements
- Category-based access restrictions (e.g., Video Camera Kit for FAC students only)
- Resource calendar view
- Bulk resource requests
- Email notifications for status changes
- Resource usage history and analytics
- QR code for resource check-in/check-out
