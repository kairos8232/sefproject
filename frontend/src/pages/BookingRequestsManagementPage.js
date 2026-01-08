import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminOverrideService from '../services/adminOverrideService';
import { formatDateTime, toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/dateUtils';
import CalendarView from '../components/CalendarView';
import './BookingRequestsManagementPage.css';

const BookingRequestsManagementPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('venue'); // 'venue' or 'resource'
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'calendar'
  const [venueBookings, setVenueBookings] = useState([]);
  const [resourceRequests, setResourceRequests] = useState([]);
  const [venues, setVenues] = useState([]);
  const [resources, setResources] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [venueBlocks, setVenueBlocks] = useState([]); // Venue availability blocks
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  
  // Venue-specific filters
  const [venueSearchQuery, setVenueSearchQuery] = useState('');
  const [venueEventSearch, setVenueEventSearch] = useState('');
  const [venuePeriodFilter, setVenuePeriodFilter] = useState('all');
  const [venueCustomStartDate, setVenueCustomStartDate] = useState('');
  const [venueCustomEndDate, setVenueCustomEndDate] = useState('');
  const [venueStatusFilter, setVenueStatusFilter] = useState('all');
  
  // Resource-specific filters
  const [resourceEventSearch, setResourceEventSearch] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [resourcePeriodFilter, setResourcePeriodFilter] = useState('all');
  const [resourceCustomStartDate, setResourceCustomStartDate] = useState('');
  const [resourceCustomEndDate, setResourceCustomEndDate] = useState('');
  const [resourceStatusFilter, setResourceStatusFilter] = useState('all');

  // Modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [modalData, setModalData] = useState({});

  const loadVenueBookings = useCallback(async () => {
    try {
      setLoading(true);
      // Don't send search filter to backend (doesn't work with nested fields)
      const { search, ...backendFilters } = filters;
      const data = await adminOverrideService.getAllVenueBookings(backendFilters);
      setVenueBookings(data.bookings || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load venue bookings');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadResourceRequests = useCallback(async () => {
    try {
      setLoading(true);
      // Don't send search filter to backend (doesn't work with nested fields)
      const { search, ...backendFilters } = filters;
      const data = await adminOverrideService.getAllResourceRequests(backendFilters);
      setResourceRequests(data.requests || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load resource requests');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'venue') {
      loadVenueBookings();
    } else {
      loadResourceRequests();
    }
  }, [activeTab, loadVenueBookings, loadResourceRequests]);

  // Load venues and resources for calendar dropdowns
  useEffect(() => {
    const loadVenuesAndResources = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Load faculties first
        const facultiesResponse = await fetch('http://localhost:5001/api/faculties', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const facultiesData = await facultiesResponse.json();
        setFaculties(facultiesData || []);
        if (facultiesData && facultiesData.length > 0 && !selectedFaculty) {
          setSelectedFaculty(facultiesData[0].id);
        }
        
        const venuesResponse = await fetch('http://localhost:5001/api/venues', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const venuesData = await venuesResponse.json();
        setVenues(venuesData.venues || []);
        if (venuesData.venues && venuesData.venues.length > 0 && !selectedVenue) {
          // Set first venue of selected faculty as default
          const currentFacultyId = selectedFaculty || facultiesData[0]?.id;
          const facultyVenues = venuesData.venues.filter(v => v.faculty_id === currentFacultyId);
          if (facultyVenues.length > 0) {
            setSelectedVenue(facultyVenues[0].id);
          } else {
            setSelectedVenue(venuesData.venues[0].id);
          }
        }

        const resourcesResponse = await fetch('http://localhost:5001/api/resource-types', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const resourcesData = await resourcesResponse.json();
        setResources(resourcesData.resourceTypes || []);
        if (resourcesData.resourceTypes && resourcesData.resourceTypes.length > 0 && !selectedResource) {
          setSelectedResource(resourcesData.resourceTypes[0].id);
        }
      } catch (err) {
        console.error('Failed to load venues/resources:', err);
      }
    };

    if (viewMode === 'calendar') {
      loadVenuesAndResources();
      // Reload bookings without status filter for calendar view
      if (activeTab === 'venue') {
        loadVenueBookings();
        // Load venue availability blocks
        const loadVenueBlocks = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/venue-availability/blocks', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
              setVenueBlocks(data.blocks || []);
            }
          } catch (err) {
            console.error('Failed to load venue blocks:', err);
          }
        };
        loadVenueBlocks();
      } else {
        loadResourceRequests();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, activeTab, loadVenueBookings, loadResourceRequests]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const openModal = (item, action) => {
    setSelectedItem(item);
    setModalAction(action);
    setShowModal(true);
    
    // Initialize modal data based on action
    if (action === 'approve') {
      if (activeTab === 'venue') {
        setModalData({
          action: 'approve',
          approval_notes: '',
          approved_start_datetime: toDateTimeLocalInput(item.requested_start_datetime),
          approved_end_datetime: toDateTimeLocalInput(item.requested_end_datetime),
          setup_time: item.setup_time || 0,
          teardown_time: item.teardown_time || 0,
          expected_attendees: item.expected_attendees || 0
        });
      } else {
        setModalData({
          action: 'approve',
          approval_notes: ''
        });
      }
    } else if (action === 'reject') {
      setModalData({
        action: 'reject',
        rejection_reason: ''
      });
    } else if (action === 'modify') {
      if (activeTab === 'venue') {
        const startDateTime = item.approved_start_datetime || item.requested_start_datetime;
        const endDateTime = item.approved_end_datetime || item.requested_end_datetime;
        
        setModalData({
          action: 'modify',
          status: item.status,
          approval_notes: item.approval_notes || '',
          approved_start_datetime: toDateTimeLocalInput(startDateTime),
          approved_end_datetime: toDateTimeLocalInput(endDateTime),
          setup_time: item.setup_time || 0,
          teardown_time: item.teardown_time || 0,
          expected_attendees: item.expected_attendees || 0
        });
      } else {
        setModalData({
          action: 'modify',
          status: item.status,
          approval_notes: item.approval_notes || '',
          requested_quantity: item.requested_quantity,
          usage_start_datetime: toDateTimeLocalInput(item.usage_start_datetime),
          usage_end_datetime: toDateTimeLocalInput(item.usage_end_datetime)
        });
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setModalAction('');
    setModalData({});
  };

  const handleSubmitOverride = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Convert datetime-local input values back to ISO format for the API
      const submissionData = { ...modalData };
      
      if (activeTab === 'venue') {
        if (submissionData.approved_start_datetime) {
          submissionData.approved_start_datetime = fromDateTimeLocalInput(submissionData.approved_start_datetime);
        }
        if (submissionData.approved_end_datetime) {
          submissionData.approved_end_datetime = fromDateTimeLocalInput(submissionData.approved_end_datetime);
        }
        await adminOverrideService.overrideVenueBooking(selectedItem.id, submissionData);
        setSuccess('Venue booking updated successfully');
        loadVenueBookings();
      } else {
        if (submissionData.usage_start_datetime) {
          submissionData.usage_start_datetime = fromDateTimeLocalInput(submissionData.usage_start_datetime);
        }
        if (submissionData.usage_end_datetime) {
          submissionData.usage_end_datetime = fromDateTimeLocalInput(submissionData.usage_end_datetime);
        }
        await adminOverrideService.overrideResourceRequest(selectedItem.id, submissionData);
        setSuccess('Resource request updated successfully');
        loadResourceRequests();
      }
      closeModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update request');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="booking-mgmt-container">
      <div className="booking-mgmt-header">
        <div>
          <h1>📋 Booking & Requests Management</h1>
          <p>Review and override venue bookings and resource requests</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'venue' ? 'active' : ''}`}
          onClick={() => setActiveTab('venue')}
        >
          🏛️ Venue Bookings
        </button>
        <button
          className={`tab ${activeTab === 'resource' ? 'active' : ''}`}
          onClick={() => setActiveTab('resource')}
        >
          📦 Resource Requests
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="view-mode-toggle">
        <button
          className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          📋 Table View
        </button>
        <button
          className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 Calendar View
        </button>
      </div>

      {/* Filters - only show in table view */}
      {viewMode === 'table' && (
        <div className="filters-section">
          {activeTab === 'venue' ? (
            // Venue Booking Filters
            <>
              <div className="filter-group">
                <label>Event Name:</label>
                <input
                  type="text"
                  placeholder="Search event name..."
                  value={venueEventSearch}
                  onChange={(e) => setVenueEventSearch(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
                />
              </div>
              
              <div className="filter-group">
                <label>Venue:</label>
                <input
                  type="text"
                  placeholder="Search venue..."
                  value={venueSearchQuery}
                  onChange={(e) => setVenueSearchQuery(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
                />
              </div>
              
              <div className="filter-group">
                <label>Period:</label>
                <select
                  value={venuePeriodFilter}
                  onChange={(e) => setVenuePeriodFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              
              {venuePeriodFilter === 'custom' && (
                <>
                  <div className="filter-group">
                    <label>From:</label>
                    <input
                      type="date"
                      value={venueCustomStartDate}
                      onChange={(e) => setVenueCustomStartDate(e.target.value)}
                      style={{ padding: '5px' }}
                    />
                  </div>
                  <div className="filter-group">
                    <label>To:</label>
                    <input
                      type="date"
                      value={venueCustomEndDate}
                      onChange={(e) => setVenueCustomEndDate(e.target.value)}
                      style={{ padding: '5px' }}
                    />
                  </div>
                </>
              )}
              
              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={venueStatusFilter}
                  onChange={(e) => setVenueStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </>
          ) : (
            // Resource Request Filters
            <>
              <div className="filter-group">
                <label>Event Name:</label>
                <input
                  type="text"
                  placeholder="Search event name..."
                  value={resourceEventSearch}
                  onChange={(e) => setResourceEventSearch(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
                />
              </div>
              
              <div className="filter-group">
                <label>Type:</label>
                <select
                  value={resourceTypeFilter}
                  onChange={(e) => setResourceTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Resource:</label>
                <input
                  type="text"
                  placeholder="Search resource..."
                  value={resourceSearchQuery}
                  onChange={(e) => setResourceSearchQuery(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
                />
              </div>
              
              <div className="filter-group">
                <label>Period:</label>
                <select
                  value={resourcePeriodFilter}
                  onChange={(e) => setResourcePeriodFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              
              {resourcePeriodFilter === 'custom' && (
                <>
                  <div className="filter-group">
                    <label>From:</label>
                    <input
                      type="date"
                      value={resourceCustomStartDate}
                      onChange={(e) => setResourceCustomStartDate(e.target.value)}
                      style={{ padding: '5px' }}
                    />
                  </div>
                  <div className="filter-group">
                    <label>To:</label>
                    <input
                      type="date"
                      value={resourceCustomEndDate}
                      onChange={(e) => setResourceCustomEndDate(e.target.value)}
                      style={{ padding: '5px' }}
                    />
                  </div>
                </>
              )}
              
              <div className="filter-group">
                <label>Status:</label>
                <select
                  value={resourceStatusFilter}
                  onChange={(e) => setResourceStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : viewMode === 'table' ? (
        <>
          {activeTab === 'venue' ? (
            <VenueBookingsTable
              bookings={venueBookings.filter(b => {
                // Event name filter
                if (venueEventSearch && !b.event?.event_name?.toLowerCase().includes(venueEventSearch.toLowerCase())) {
                  return false;
                }
                
                // Venue filter
                if (venueSearchQuery && !b.venue?.name?.toLowerCase().includes(venueSearchQuery.toLowerCase())) {
                  return false;
                }
                
                // Status filter
                if (venueStatusFilter !== 'all' && b.status !== venueStatusFilter) {
                  return false;
                }
                
                // Period filter
                if (venuePeriodFilter !== 'all') {
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const todayEnd = new Date(today);
                  todayEnd.setHours(23, 59, 59, 999);
                  const weekEnd = new Date(today);
                  weekEnd.setDate(weekEnd.getDate() + 7);
                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                  
                  const requestStart = new Date(b.requested_start_datetime);
                  const requestEnd = new Date(b.requested_end_datetime);
                  
                  if (venuePeriodFilter === 'today') {
                    if (!(requestStart <= todayEnd && requestEnd >= today)) return false;
                  } else if (venuePeriodFilter === 'this-week') {
                    if (!(requestStart < weekEnd && requestEnd >= today)) return false;
                  } else if (venuePeriodFilter === 'this-month') {
                    if (!(requestStart <= monthEnd && requestEnd >= monthStart)) return false;
                  } else if (venuePeriodFilter === 'custom') {
                    if (venueCustomStartDate || venueCustomEndDate) {
                      if (venueCustomStartDate && venueCustomEndDate) {
                        const rangeStart = new Date(venueCustomStartDate);
                        const rangeEnd = new Date(venueCustomEndDate);
                        rangeEnd.setHours(23, 59, 59, 999);
                        if (!(requestStart <= rangeEnd && requestEnd >= rangeStart)) return false;
                      } else if (venueCustomStartDate) {
                        const rangeStart = new Date(venueCustomStartDate);
                        if (requestEnd < rangeStart) return false;
                      } else if (venueCustomEndDate) {
                        const rangeEnd = new Date(venueCustomEndDate);
                        rangeEnd.setHours(23, 59, 59, 999);
                        if (requestStart > rangeEnd) return false;
                      }
                    }
                  }
                }
                
                return true;
              })}
              onAction={openModal}
              getStatusBadgeClass={getStatusBadgeClass}
            />
          ) : (
            <ResourceRequestsTable
              requests={resourceRequests.filter(r => {
                // Event name filter
                if (resourceEventSearch && !r.event?.event_name?.toLowerCase().includes(resourceEventSearch.toLowerCase())) {
                  return false;
                }
                
                // Resource type filter
                if (resourceTypeFilter !== 'all' && r.resource_type_id !== parseInt(resourceTypeFilter)) {
                  return false;
                }
                
                // Resource search filter
                if (resourceSearchQuery && !r.resource_type?.name?.toLowerCase().includes(resourceSearchQuery.toLowerCase())) {
                  return false;
                }
                
                // Status filter
                if (resourceStatusFilter !== 'all' && r.status !== resourceStatusFilter) {
                  return false;
                }
                
                // Period filter (usage period)
                if (resourcePeriodFilter !== 'all') {
                  const now = new Date();
                  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                  const todayEnd = new Date(today);
                  todayEnd.setHours(23, 59, 59, 999);
                  const weekEnd = new Date(today);
                  weekEnd.setDate(weekEnd.getDate() + 7);
                  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                  
                  const usageStart = new Date(r.usage_start_datetime);
                  const usageEnd = new Date(r.usage_end_datetime);
                  
                  if (resourcePeriodFilter === 'today') {
                    if (!(usageStart <= todayEnd && usageEnd >= today)) return false;
                  } else if (resourcePeriodFilter === 'this-week') {
                    if (!(usageStart < weekEnd && usageEnd >= today)) return false;
                  } else if (resourcePeriodFilter === 'this-month') {
                    if (!(usageStart <= monthEnd && usageEnd >= monthStart)) return false;
                  } else if (resourcePeriodFilter === 'custom') {
                    if (resourceCustomStartDate || resourceCustomEndDate) {
                      if (resourceCustomStartDate && resourceCustomEndDate) {
                        const rangeStart = new Date(resourceCustomStartDate);
                        const rangeEnd = new Date(resourceCustomEndDate);
                        rangeEnd.setHours(23, 59, 59, 999);
                        if (!(usageStart <= rangeEnd && usageEnd >= rangeStart)) return false;
                      } else if (resourceCustomStartDate) {
                        const rangeStart = new Date(resourceCustomStartDate);
                        if (usageEnd < rangeStart) return false;
                      } else if (resourceCustomEndDate) {
                        const rangeEnd = new Date(resourceCustomEndDate);
                        rangeEnd.setHours(23, 59, 59, 999);
                        if (usageStart > rangeEnd) return false;
                      }
                    }
                  }
                }
                
                return true;
              })}
              onAction={openModal}
              getStatusBadgeClass={getStatusBadgeClass}
            />
          )}
        </>
      ) : (
        <>
          {activeTab === 'venue' ? (
            <CalendarView
              type="venue"
              bookings={venueBookings.filter(b => b.venue_id === selectedVenue)}
              venueBlocks={venueBlocks.filter(b => b.venue_id === selectedVenue)}
              faculties={faculties}
              selectedFaculty={selectedFaculty}
              setSelectedFaculty={setSelectedFaculty}
              selectedId={selectedVenue}
              setSelectedId={setSelectedVenue}
              items={venues}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              getStatusBadgeClass={getStatusBadgeClass}
            />
          ) : (
            <CalendarView
              type="resource"
              bookings={resourceRequests.filter(r => r.resource_id === selectedResource)}
              venueBlocks={venueBlocks}
              selectedId={selectedResource}
              setSelectedId={setSelectedResource}
              items={resources}
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              getStatusBadgeClass={getStatusBadgeClass}
            />
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <OverrideModal
          item={selectedItem}
          action={modalAction}
          type={activeTab}
          data={modalData}
          setData={setModalData}
          onSubmit={handleSubmitOverride}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

// Venue Bookings Table Component
const VenueBookingsTable = ({ bookings, onAction, getStatusBadgeClass }) => {
  if (bookings.length === 0) {
    return <div className="no-data">No venue bookings found</div>;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Venue</th>
            <th>Requested By</th>
            <th>Requested Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(booking => (
            <tr key={booking.id}>
              <td>
                <strong>{booking.event?.event_name}</strong>
              </td>
              <td>
                {booking.venue?.name}<br />
                <small>{booking.venue?.faculty?.name}</small>
              </td>
              <td>{booking.requester?.name}</td>
              <td>
                {formatDateTime(booking.requested_start_datetime)}
                <br />
                to
                <br />
                {formatDateTime(booking.requested_end_datetime)}
                {(booking.setup_time || booking.teardown_time) && (
                  <>
                    <br />
                    <small>
                      ({booking.setup_time || 0}min setup, {booking.teardown_time || 0}min teardown)
                    </small>
                  </>
                )}
              </td>
              <td>
                <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                  {booking.status}
                </span>
              </td>
              <td className="actions-cell">
                <div className="action-buttons">
                  <button
                    className="btn-approve"
                    onClick={() => onAction(booking, 'approve')}
                    disabled={booking.status === 'cancelled'}
                    title="Approve"
                  >
                    ✅
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => onAction(booking, 'reject')}
                    disabled={booking.status === 'cancelled'}
                    title="Reject"
                  >
                    ❌
                  </button>
                  <button
                    className="btn-modify"
                    onClick={() => onAction(booking, 'modify')}
                    disabled={booking.status === 'cancelled'}
                    title="Modify"
                  >
                    ✏️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Resource Requests Table Component
const ResourceRequestsTable = ({ requests, onAction, getStatusBadgeClass }) => {
  if (requests.length === 0) {
    return <div className="no-data">No resource requests found</div>;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Resource</th>
            <th>Quantity</th>
            <th>Requested By</th>
            <th>Usage Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map(request => (
            <tr key={request.id}>
              <td>
                <strong>{request.event?.event_name}</strong>
              </td>
              <td>
                {request.resource?.name}<br />
                <small>{request.resource?.category?.name}</small>
              </td>
              <td>{request.requested_quantity}</td>
              <td>{request.requester?.name}</td>
              <td>
                {formatDateTime(request.usage_start_datetime)}
                <br />
                to 
                <br />
                {formatDateTime(request.usage_end_datetime)}
              </td>
              <td>
                <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                  {request.status}
                </span>
              </td>
              <td className="actions-cell">
                <div className="action-buttons">
                  <button
                    className="btn-approve"
                    onClick={() => onAction(request, 'approve')}
                    disabled={request.status === 'cancelled'}
                    title="Approve"
                  >
                    ✅
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => onAction(request, 'reject')}
                    disabled={request.status === 'cancelled'}
                    title="Reject"
                  >
                    ❌
                  </button>
                  <button
                    className="btn-modify"
                    onClick={() => onAction(request, 'modify')}
                    disabled={request.status === 'cancelled'}
                    title="Modify"
                  >
                    ✏️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Override Modal Component
const OverrideModal = ({ item, action, type, data, setData, onSubmit, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {action === 'approve' && '✓ Approve Request'}
            {action === 'reject' && '✗ Reject Request'}
            {action === 'modify' && '✎ Modify Request'}
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {/* Display item details */}
            <div className="item-details">
              <h3>Request Details</h3>
              {type === 'venue' ? (
                <>
                  <p><strong>Event:</strong> {item.event?.event_name}</p>
                  <p><strong>Venue:</strong> {item.venue?.name}</p>
                  <p><strong>Requested By:</strong> {item.requester?.name}</p>
                  <p><strong>Current Status:</strong> {item.status}</p>
                </>
              ) : (
                <>
                  <p><strong>Event:</strong> {item.event?.event_name}</p>
                  <p><strong>Resource:</strong> {item.resource?.name}</p>
                  <p><strong>Quantity:</strong> {item.requested_quantity}</p>
                  <p><strong>Requested By:</strong> {item.requester?.name}</p>
                  <p><strong>Current Status:</strong> {item.status}</p>
                </>
              )}
            </div>

            {/* Action-specific fields */}
            {action === 'approve' && (
              <>
                <div className="form-group">
                  <label>Approval Notes (Optional)</label>
                  <textarea
                    rows="3"
                    value={data.approval_notes || ''}
                    onChange={(e) => setData({ ...data, approval_notes: e.target.value })}
                    placeholder="Add any notes or conditions..."
                  />
                </div>

                {type === 'venue' && (
                  <>
                    <div className="form-group">
                      <label>Approved Start Time</label>
                      <input
                        type="datetime-local"
                        value={data.approved_start_datetime?.slice(0, 16) || ''}
                        onChange={(e) => setData({ ...data, approved_start_datetime: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Approved End Time</label>
                      <input
                        type="datetime-local"
                        value={data.approved_end_datetime?.slice(0, 16) || ''}
                        onChange={(e) => setData({ ...data, approved_end_datetime: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Setup Time (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={data.setup_time || 0}
                        onChange={(e) => setData({ ...data, setup_time: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Teardown Time (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={data.teardown_time || 0}
                        onChange={(e) => setData({ ...data, teardown_time: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Expected Attendees</label>
                      <input
                        type="number"
                        min="0"
                        value={data.expected_attendees || 0}
                        onChange={(e) => setData({ ...data, expected_attendees: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {action === 'reject' && (
              <div className="form-group">
                <label>Rejection Reason *</label>
                <textarea
                  rows="4"
                  value={data.rejection_reason || ''}
                  onChange={(e) => setData({ ...data, rejection_reason: e.target.value })}
                  placeholder="Please provide a clear reason for rejection..."
                  required
                />
              </div>
            )}

            {action === 'modify' && (
              <>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={data.status || ''}
                    onChange={(e) => setData({ ...data, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    rows="3"
                    value={data.approval_notes || ''}
                    onChange={(e) => setData({ ...data, approval_notes: e.target.value })}
                  />
                </div>

                {type === 'venue' ? (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Setup Time (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={data.setup_time || ''}
                          onChange={(e) => setData({ ...data, setup_time: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="form-group">
                        <label>Teardown Time (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={data.teardown_time || ''}
                          onChange={(e) => setData({ ...data, teardown_time: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Expected Attendees</label>
                      <input
                        type="number"
                        min="1"
                        value={data.expected_attendees || ''}
                        onChange={(e) => setData({ ...data, expected_attendees: parseInt(e.target.value) })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={data.requested_quantity || ''}
                      onChange={(e) => setData({ ...data, requested_quantity: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {action === 'approve' && 'Approve'}
              {action === 'reject' && 'Reject'}
              {action === 'modify' && 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingRequestsManagementPage;
