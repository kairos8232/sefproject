import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import adminOverrideService from '../services/adminOverrideService';
import { authFetch } from '../services/apiClient';
import { formatDateTime, toDateTimeLocalInput, fromDateTimeLocalInput } from '../utils/dateUtils';
import CalendarView from '../components/CalendarView';
import { useToast } from '../contexts/ToastContext';
import './BookingRequestsManagementPage.css';

const BookingRequestsManagementPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  React.useEffect(() => {
    document.title = 'Booking Requests Management - CESMS';
  }, []);
  
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
  
  // Venue-specific filters
  const [venueSearchQuery, setVenueSearchQuery] = useState('');
  const [venueEventSearch, setVenueEventSearch] = useState('');
  const [venuePeriodFilter, setVenuePeriodFilter] = useState('all');
  const [venueCustomStartDate, setVenueCustomStartDate] = useState('');
  const [venueCustomEndDate, setVenueCustomEndDate] = useState('');
  const [venueStatusFilter, setVenueStatusFilter] = useState('all');
  const [venueFacultyFilter, setVenueFacultyFilter] = useState('all');
  const [venueOrganizerFilter, setVenueOrganizerFilter] = useState('');
  const [venueRoleFilter, setVenueRoleFilter] = useState('all');
  
  // Resource-specific filters
  const [resourceEventSearch, setResourceEventSearch] = useState('');
  const [resourceSearchQuery, setResourceSearchQuery] = useState('');
  const [resourcePeriodFilter, setResourcePeriodFilter] = useState('all');
  const [resourceCustomStartDate, setResourceCustomStartDate] = useState('');
  const [resourceCustomEndDate, setResourceCustomEndDate] = useState('');
  const [resourceStatusFilter, setResourceStatusFilter] = useState('all');
  const [resourceFacultyFilter, setResourceFacultyFilter] = useState('all');
  const [resourceOrganizerFilter, setResourceOrganizerFilter] = useState('');
  const [resourceRoleFilter, setResourceRoleFilter] = useState('all');

  // Modal state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [modalData, setModalData] = useState({});

  const loadVenueBookings = useCallback(async () => {
    try {
      setLoading(true);
      // Don't send search filter to backend (doesn't work with nested fields)
      const data = await adminOverrideService.getAllVenueBookings({});
      setVenueBookings(data.bookings || []);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to load venue bookings');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  const loadResourceRequests = useCallback(async () => {
    try {
      setLoading(true);
      // Don't send search filter to backend (doesn't work with nested fields)
      const data = await adminOverrideService.getAllResourceRequests({});
      setResourceRequests(data.requests || []);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to load resource requests');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (activeTab === 'venue') {
      loadVenueBookings();
    } else {
      loadResourceRequests();
    }
  }, [activeTab, loadVenueBookings, loadResourceRequests]);

  // Load faculties always for filtering
  useEffect(() => {
    const loadFaculties = async () => {
      try {
        const facultiesResponse = await authFetch('/faculties');
        const facultiesData = await facultiesResponse.json();
        const facultiesArray = facultiesData.faculties || [];
        setFaculties(facultiesArray);
      } catch (err) {
        console.error('Failed to load faculties:', err);
      }
    };
    loadFaculties();
  }, []);

  // Load venues and resources for calendar dropdowns
  useEffect(() => {
    const loadVenuesAndResources = async () => {
      try {
        if (!selectedFaculty && faculties.length > 0) {
          setSelectedFaculty(faculties[0].id);
        }
        
        const venuesResponse = await authFetch('/venues');
        const venuesData = await venuesResponse.json();
        setVenues(venuesData.venues || []);
        if (venuesData.venues && venuesData.venues.length > 0 && !selectedVenue) {
          // Set first venue of selected faculty as default
          const currentFacultyId = selectedFaculty || (faculties.length > 0 ? faculties[0].id : null);
          if (currentFacultyId) {
            const facultyVenues = venuesData.venues.filter(v => v.faculty_id === currentFacultyId);
            if (facultyVenues.length > 0) {
              setSelectedVenue(facultyVenues[0].id);
            } else {
              setSelectedVenue(venuesData.venues[0].id);
            }
          } else {
            setSelectedVenue(venuesData.venues[0].id);
          }
        }

        const resourcesResponse = await authFetch('/resource-types');
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
            const response = await authFetch('/venue-availability/blocks');
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
        
        const actionMsg = submissionData.action === 'approve' ? 'approved' : 'rejected';
        showSuccess(`Venue booking ${actionMsg} successfully`);
        loadVenueBookings();
      } else {
        if (submissionData.usage_start_datetime) {
          submissionData.usage_start_datetime = fromDateTimeLocalInput(submissionData.usage_start_datetime);
        }
        if (submissionData.usage_end_datetime) {
          submissionData.usage_end_datetime = fromDateTimeLocalInput(submissionData.usage_end_datetime);
        }
        await adminOverrideService.overrideResourceRequest(selectedItem.id, submissionData);
        
        const actionMsg = submissionData.action === 'approve' ? 'approved' : 'rejected';
        showSuccess(`Resource request ${actionMsg} successfully`);
        loadResourceRequests();
      }
      closeModal();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to update request');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'brm-status-pending';
      case 'approved': return 'brm-status-approved';
      case 'rejected': return 'brm-status-rejected';
      case 'cancelled': return 'brm-status-cancelled';
      default: return '';
    }
  };

  return (
    <div className="brm-booking-mgmt-container">
      <div className="brm-booking-mgmt-header">
        <div>
          <h1>📋 Booking & Requests Management</h1>
          <p>Review and override venue bookings and resource requests</p>
        </div>
        <div className="brm-header-actions">
          <button className="brm-back-button" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>

      {/* Success and error messages now shown via toast */}

      {/* Tabs */}
      <div className="brm-tabs">
        <button
          className={`brm-tab ${activeTab === 'venue' ? 'active' : ''}`}
          onClick={() => setActiveTab('venue')}
        >
          🏛️ Venue Bookings
        </button>
        <button
          className={`brm-tab ${activeTab === 'resource' ? 'active' : ''}`}
          onClick={() => setActiveTab('resource')}
        >
          📦 Resource Requests
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="brm-view-mode-toggle">
        <button
          className={`brm-view-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          📋 Table View
        </button>
        <button
          className={`brm-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 Calendar View
        </button>
      </div>

      {/* Filters - only show in table view */}
      {viewMode === 'table' && (
        <div className="brm-filters-section">
          {activeTab === 'venue' ? (
            // Venue Booking Filters
            <>
              <div className="brm-filter-group">
                <label>Event Name:</label>
                <input
                  type="text"
                  placeholder="Search event name..."
                  value={venueEventSearch}
                  onChange={(e) => setVenueEventSearch(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
                />
              </div>
              
              <div className="brm-filter-group">
                <label>Venue:</label>
                <input
                  type="text"
                  placeholder="Search venue..."
                  value={venueSearchQuery}
                  onChange={(e) => setVenueSearchQuery(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
                />
              </div>

              <div className="brm-filter-group">
                <label>Faculty:</label>
                <select
                  value={venueFacultyFilter}
                  onChange={(e) => setVenueFacultyFilter(e.target.value)}
                >
                  <option value="all">All Faculties</option>
                  {Array.isArray(faculties) && faculties.map(f => (
                    <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                  ))}
                </select>
              </div>

              <div className="brm-filter-group">
                <label>Organizer:</label>
                <input
                  type="text"
                  placeholder="Name/ID/Email..."
                  value={venueOrganizerFilter}
                  onChange={(e) => setVenueOrganizerFilter(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
                />
              </div>

              <div className="brm-filter-group">
                <label>Role:</label>
                <select
                  value={venueRoleFilter}
                  onChange={(e) => setVenueRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="organizer">Organizer</option>
                </select>
              </div>
              
              <div className="brm-filter-group">
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
                  <div className="brm-filter-group">
                    <label>From:</label>
                    <input
                      type="date"
                      value={venueCustomStartDate}
                      onChange={(e) => setVenueCustomStartDate(e.target.value)}
                      style={{ padding: '5px' }}
                    />
                  </div>
                  <div className="brm-filter-group">
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
              
              <div className="brm-filter-group">
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
              <div className="brm-filter-group">
                <label>Event Name:</label>
                <input
                  type="text"
                  placeholder="Search event name..."
                  value={resourceEventSearch}
                  onChange={(e) => setResourceEventSearch(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
                />
              </div>
              
              <div className="brm-filter-group">
                <label>Resource:</label>
                <input
                  type="text"
                  placeholder="Search resource..."
                  value={resourceSearchQuery}
                  onChange={(e) => setResourceSearchQuery(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
                />
              </div>

              <div className="brm-filter-group">
                <label>Faculty:</label>
                <select
                  value={resourceFacultyFilter}
                  onChange={(e) => setResourceFacultyFilter(e.target.value)}
                >
                  <option value="all">All Faculties</option>
                  {Array.isArray(faculties) && faculties.map(f => (
                    <option key={f.id} value={f.id}>{f.code} - {f.name}</option>
                  ))}
                </select>
              </div>

              <div className="brm-filter-group">
                <label>Organizer:</label>
                <input
                  type="text"
                  placeholder="Name/ID/Email..."
                  value={resourceOrganizerFilter}
                  onChange={(e) => setResourceOrganizerFilter(e.target.value)}
                  style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
                />
              </div>

              <div className="brm-filter-group">
                <label>Role:</label>
                <select
                  value={resourceRoleFilter}
                  onChange={(e) => setResourceRoleFilter(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="organizer">Organizer</option>
                </select>
              </div>
              
              <div className="brm-filter-group">
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
                  <div className="brm-filter-group">
                    <label>From:</label>
                    <input
                      type="date"
                      value={resourceCustomStartDate}
                      onChange={(e) => setResourceCustomStartDate(e.target.value)}
                      style={{ padding: '5px' }}
                    />
                  </div>
                  <div className="brm-filter-group">
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
              
              <div className="brm-filter-group">
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
        <div className="brm-loading">Loading...</div>
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
                if (venueSearchQuery && !b.venue?.name?.toLowerCase().includes(venueSearchQuery.toLowerCase()) && !b.venue?.code?.toLowerCase().includes(venueSearchQuery.toLowerCase())) {
                  return false;
                }

                // Faculty filter
                if (venueFacultyFilter !== 'all' && String(b.venue?.faculty?.id) !== String(venueFacultyFilter)) {
                  return false;
                }

                // Organizer filter (name, email, or staff ID)
                if (venueOrganizerFilter) {
                  const organizer = b.requester;
                  const searchLower = venueOrganizerFilter.toLowerCase();
                  const matchesName = organizer?.name?.toLowerCase().includes(searchLower);
                  const matchesEmail = organizer?.email?.toLowerCase().includes(searchLower);
                  const matchesStaffId = organizer?.staff_id?.toLowerCase().includes(searchLower);
                  if (!(matchesName || matchesEmail || matchesStaffId)) {
                    return false;
                  }
                }

                // Role filter
                if (venueRoleFilter !== 'all' && !b.requester?.role?.toLowerCase().includes(venueRoleFilter.toLowerCase())) {
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
                
                // Resource search filter (search by name or code)
                if (resourceSearchQuery && !r.resource?.name?.toLowerCase().includes(resourceSearchQuery.toLowerCase()) && !r.resource?.code?.toLowerCase().includes(resourceSearchQuery.toLowerCase())) {
                  return false;
                }

                // Faculty filter
                if (resourceFacultyFilter !== 'all' && String(r.venue_booking?.venue?.faculty?.id) !== String(resourceFacultyFilter)) {
                  return false;
                }

                // Organizer filter (name, email, or staff ID)
                if (resourceOrganizerFilter) {
                  const organizer = r.requester;
                  const searchLower = resourceOrganizerFilter.toLowerCase();
                  const matchesName = organizer?.name?.toLowerCase().includes(searchLower);
                  const matchesEmail = organizer?.email?.toLowerCase().includes(searchLower);
                  const matchesStaffId = organizer?.staff_id?.toLowerCase().includes(searchLower);
                  if (!(matchesName || matchesEmail || matchesStaffId)) {
                    return false;
                  }
                }

                // Role filter
                if (resourceRoleFilter !== 'all' && !r.requester?.role?.toLowerCase().includes(resourceRoleFilter.toLowerCase())) {
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
              faculties={faculties}
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
    return <div className="brm-no-data">No venue bookings found</div>;
  }

  // Filter out cancelled bookings first to avoid confusion
  const activeBookings = bookings.filter(b => b.status !== 'cancelled');

  // Group bookings by event_id
  const groupedByEvent = {};
  activeBookings.forEach(booking => {
    const eventId = booking.event_id;
    if (!groupedByEvent[eventId]) {
      groupedByEvent[eventId] = [];
    }
    groupedByEvent[eventId].push(booking);
  });

  // Convert to array of groups
  const eventGroups = Object.values(groupedByEvent);

  return (
    <div className="brm-table-container">
      <table className="brm-data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Faculty</th>
            <th>Venues</th>
            <th>Organiser</th>
            <th>Requested Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {eventGroups.map(group => {
            const firstBooking = group[0];
            
            // Helper function to get role class
            const getRoleClass = (role) => {
              if (!role) return 'brm-role-default';
              const roleLower = role.toLowerCase();
              if (roleLower.includes('student')) return 'brm-role-student';
              if (roleLower.includes('faculty')) return 'brm-role-faculty';
              if (roleLower.includes('organizer')) return 'brm-role-organizer';
              return 'brm-role-default';
            };

            // Get faculty code from venue, not event organizer
            const facultyCode = firstBooking.venue?.faculty?.code || 'N/A';

            // Calculate start/end time including setup/teardown
            const setupMinutes = firstBooking.setup_time || 0;
            const teardownMinutes = firstBooking.teardown_time || 0;
            const startDate = new Date(firstBooking.requested_start_datetime);
            const endDate = new Date(firstBooking.requested_end_datetime);
            
            // Subtract setup time from start
            const displayStartDate = new Date(startDate.getTime() - (setupMinutes * 60 * 1000));
            // Add teardown time to end
            const displayEndDate = new Date(endDate.getTime() + (teardownMinutes * 60 * 1000));

            // Determine overall status for the group
            const statuses = group.map(b => b.status);
            const allSameStatus = statuses.every(s => s === statuses[0]);
            const groupStatus = allSameStatus ? statuses[0] : 'mixed';

            return (
            <tr key={firstBooking.id}>
              <td>
                <div className="brm-event-name">{firstBooking.event?.event_name || 'N/A'}</div>
                {(firstBooking.event?.description || firstBooking.event?.event_description) && (
                  <div className="brm-event-description">
                    {(firstBooking.event?.description || firstBooking.event?.event_description).substring(0, 50)}
                    {(firstBooking.event?.description || firstBooking.event?.event_description).length > 50 ? '...' : ''}
                  </div>
                )}
              </td>
              <td>
                <div className="brm-faculty-badge">{facultyCode}</div>
              </td>
              <td>
                <div className="brm-venues-list">
                  {group.map((booking, idx) => {
                    const setupMinutes = booking.setup_time || 0;
                    const teardownMinutes = booking.teardown_time || 0;
                    const startDate = new Date(booking.requested_start_datetime);
                    const endDate = new Date(booking.requested_end_datetime);
                    const displayStartDate = new Date(startDate.getTime() - (setupMinutes * 60 * 1000));
                    const displayEndDate = new Date(endDate.getTime() + (teardownMinutes * 60 * 1000));
                    
                    return (
                    <div key={booking.id} className="brm-venue-item">
                      <div className="brm-venue-info">
                        <div className="brm-venue-name">
                          {idx + 1}. {booking.venue?.name || 'N/A'}
                        </div>
                        <div className="brm-venue-code">{booking.venue?.code || 'N/A'}</div>
                        <div className="brm-venue-time">
                          {formatDateTime(displayStartDate)} - {formatDateTime(displayEndDate)}
                        </div>
                      </div>
                      <span className={`brm-status-badge ${getStatusBadgeClass(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  )})}
                </div>
              </td>
              <td>
                <div className="brm-organizer-info">
                  <div className="brm-organizer-name">{firstBooking.requester?.name || 'N/A'}</div>
                  {firstBooking.requester?.role && (
                    <div className={`brm-organizer-role ${getRoleClass(firstBooking.requester.role)}`}>
                      {firstBooking.requester.role.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div className="brm-datetime-info">
                  <div>{formatDateTime(displayStartDate)}</div>
                  <div className="brm-datetime-to">to</div>
                  <div>{formatDateTime(displayEndDate)}</div>
                </div>
              </td>
              <td>
                <span className={`brm-status-badge ${getStatusBadgeClass(groupStatus)}`}>
                  {groupStatus}
                </span>
              </td>
              <td className="brm-actions-cell">
                <div className="brm-action-buttons-group">
                  {group.map(booking => (
                    <div key={booking.id} className="brm-action-row">
                      <span className="brm-venue-label">{booking.venue?.code}</span>
                      <div className="brm-action-buttons">
                        <button
                          className="brm-btn-approve"
                          onClick={() => onAction(booking, 'approve')}
                          title={`Approve ${booking.venue?.code}`}
                        >
                          ✅
                        </button>
                        <button
                          className="brm-btn-reject"
                          onClick={() => onAction(booking, 'reject')}
                          title={`Reject ${booking.venue?.code}`}
                        >
                          ❌
                        </button>
                        <button
                          className="brm-btn-modify"
                          onClick={() => onAction(booking, 'modify')}
                          title={`Modify ${booking.venue?.code}`}
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
};

// Resource Requests Table Component
const ResourceRequestsTable = ({ requests, onAction, getStatusBadgeClass }) => {
  if (requests.length === 0) {
    return <div className="brm-no-data">No resource requests found</div>;
  }

  // Filter out cancelled requests first to avoid confusion
  const activeRequests = requests.filter(r => r.status !== 'cancelled');

  // Group requests by event_id
  const groupedByEvent = {};
  activeRequests.forEach(request => {
    const eventId = request.event_id;
    if (!groupedByEvent[eventId]) {
      groupedByEvent[eventId] = [];
    }
    groupedByEvent[eventId].push(request);
  });

  // Convert to array of groups
  const eventGroups = Object.values(groupedByEvent);

  return (
    <div className="brm-table-container">
      <table className="brm-data-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Faculty</th>
            <th>Resources</th>
            <th>Organiser</th>
            <th>Usage Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {eventGroups.map(group => {
            const firstRequest = group[0];
            
            // Helper function to get role class
            const getRoleClass = (role) => {
              if (!role) return 'brm-role-default';
              const roleLower = role.toLowerCase();
              if (roleLower.includes('student')) return 'brm-role-student';
              if (roleLower.includes('faculty')) return 'brm-role-faculty';
              if (roleLower.includes('organizer')) return 'brm-role-organizer';
              return 'brm-role-default';
            };

            // Get faculty code from venue booking associated with this request
            const facultyCode = firstRequest.venue_booking?.venue?.faculty?.code || 'N/A';

            // Determine overall status for the group
            const statuses = group.map(r => r.status);
            const allSameStatus = statuses.every(s => s === statuses[0]);
            const groupStatus = allSameStatus ? statuses[0] : 'mixed';

            return (
            <tr key={firstRequest.id}>
              <td>
                <div className="brm-event-name">{firstRequest.event?.event_name || 'N/A'}</div>
                {(firstRequest.event?.description || firstRequest.event?.event_description) && (
                  <div className="brm-event-description">
                    {(firstRequest.event?.description || firstRequest.event?.event_description).substring(0, 50)}
                    {(firstRequest.event?.description || firstRequest.event?.event_description).length > 50 ? '...' : ''}
                  </div>
                )}
              </td>
              <td>
                <div className="brm-faculty-badge">{facultyCode}</div>
              </td>
              <td>
                <div className="brm-venues-list">
                  {group.map((request, idx) => (
                    <div key={request.id} className="brm-venue-item">
                      <div className="brm-venue-info">
                        <div className="brm-venue-name">
                          {idx + 1}. {request.resource?.name || 'N/A'}
                        </div>
                        <div className="brm-venue-code">
                          {request.requested_quantity} {request.resource?.unit || 'units'} • {request.resource?.category?.name || ''}
                        </div>
                        <div className="brm-venue-time">
                          {formatDateTime(request.usage_start_datetime)} - {formatDateTime(request.usage_end_datetime)}
                        </div>
                      </div>
                      <span className={`brm-status-badge ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              </td>
              <td>
                <div className="brm-organizer-info">
                  <div className="brm-organizer-name">{firstRequest.requester?.name || 'N/A'}</div>
                  {firstRequest.requester?.role && (
                    <div className={`brm-organizer-role ${getRoleClass(firstRequest.requester.role)}`}>
                      {firstRequest.requester.role.replace('_', ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div className="brm-datetime-info">
                  <div>{formatDateTime(firstRequest.usage_start_datetime)}</div>
                  <div className="brm-datetime-to">to</div>
                  <div>{formatDateTime(firstRequest.usage_end_datetime)}</div>
                </div>
              </td>
              <td>
                <span className={`brm-status-badge ${getStatusBadgeClass(groupStatus)}`}>
                  {groupStatus}
                </span>
              </td>
              <td className="brm-actions-cell">
                <div className="brm-action-buttons-group">
                  {group.map(request => (
                    <div key={request.id} className="brm-action-row">
                      <span className="brm-venue-label">{request.resource?.code || request.resource?.name?.substring(0, 8)}</span>
                      <div className="brm-action-buttons">
                        <button
                          className="brm-btn-approve"
                          onClick={() => onAction(request, 'approve')}
                          title="Approve"
                        >
                          ✅
                        </button>
                        <button
                          className="brm-btn-reject"
                          onClick={() => onAction(request, 'reject')}
                          title="Reject"
                        >
                          ❌
                        </button>
                        <button
                          className="brm-btn-modify"
                          onClick={() => onAction(request, 'modify')}
                          title="Modify"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
};

// Override Modal Component
const OverrideModal = ({ item, action, type, data, setData, onSubmit, onClose }) => {
  return (
    <div className="brm-modal-overlay" onClick={onClose}>
      <div className="brm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="brm-modal-header">
          <h2>
            {action === 'approve' && '✓ Approve Request'}
            {action === 'reject' && '✗ Reject Request'}
            {action === 'modify' && '✎ Modify Request'}
          </h2>
          <button className="brm-close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="brm-modal-body">
            {/* Display item details */}
            <div className="brm-item-details">
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
                <div className="brm-form-group">
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
                    <div className="brm-form-group">
                      <label>Approved Start Time</label>
                      <input
                        type="datetime-local"
                        value={data.approved_start_datetime?.slice(0, 16) || ''}
                        onChange={(e) => setData({ ...data, approved_start_datetime: e.target.value })}
                        required
                      />
                    </div>

                    <div className="brm-form-group">
                      <label>Approved End Time</label>
                      <input
                        type="datetime-local"
                        value={data.approved_end_datetime?.slice(0, 16) || ''}
                        onChange={(e) => setData({ ...data, approved_end_datetime: e.target.value })}
                        required
                      />
                    </div>

                    <div className="brm-form-group">
                      <label>Setup Time (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={data.setup_time || 0}
                        onChange={(e) => setData({ ...data, setup_time: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="brm-form-group">
                      <label>Teardown Time (minutes)</label>
                      <input
                        type="number"
                        min="0"
                        value={data.teardown_time || 0}
                        onChange={(e) => setData({ ...data, teardown_time: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="brm-form-group">
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
              <div className="brm-form-group">
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
                <div className="brm-form-group">
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

                <div className="brm-form-group">
                  <label>Notes</label>
                  <textarea
                    rows="3"
                    value={data.approval_notes || ''}
                    onChange={(e) => setData({ ...data, approval_notes: e.target.value })}
                  />
                </div>

                {type === 'venue' ? (
                  <>
                    <div className="brm-form-row">
                      <div className="brm-form-group">
                        <label>Setup Time (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={data.setup_time || ''}
                          onChange={(e) => setData({ ...data, setup_time: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="brm-form-group">
                        <label>Teardown Time (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          value={data.teardown_time || ''}
                          onChange={(e) => setData({ ...data, teardown_time: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="brm-form-group">
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
                  <div className="brm-form-group">
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

          <div className="brm-modal-footer">
            <button type="button" className="brm-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="brm-btn-submit">
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
