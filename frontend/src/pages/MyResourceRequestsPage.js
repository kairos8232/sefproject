import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import resourceRequestService from '../services/resourceRequestService';
import { authFetch } from '../services/apiClient';
import { formatDateTime } from '../utils/dateUtils';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import './MyResourceRequestsPage.css';

function MyResourceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [eventSearch, setEventSearch] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [resourceCategories, setResourceCategories] = useState([]);
  const [cancelModalRequest, setCancelModalRequest] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  const loadMyRequests = useCallback(async () => {
    document.title = 'My Resource Requests - CESMS';
    try {
      setLoading(true);
      setError('');

      const data = await resourceRequestService.getMyRequests();
      let allRequests = data.requests || [];
      
      if (allRequests.length > 0) {
      }
      
      // Build event IDs that match category/resource filters
      let eventIdsMatchingFilters = null;
      
      if (resourceTypeFilter !== 'all' || resourceSearch.trim()) {
        eventIdsMatchingFilters = new Set();
        
        allRequests.forEach(r => {
          let matches = true;
          
          // Check category filter
          if (resourceTypeFilter !== 'all') {
            const categoryName = r.resource?.category?.name;
            if (categoryName !== resourceTypeFilter) {
              matches = false;
            }
          }
          
          // Check resource search filter
          if (resourceSearch.trim()) {
            if (!r.resource?.name?.toLowerCase().includes(resourceSearch.toLowerCase())) {
              matches = false;
            }
          }
          
          // If this request matches, include its entire event
          if (matches) {
            const eventKey = `${r.event_id}_${r.venue_booking_id}`;
            eventIdsMatchingFilters.add(eventKey);
          }
        });
      }
      
      // Apply event name filter first
      if (eventSearch.trim()) {
        allRequests = allRequests.filter(r => 
          r.event?.event_name?.toLowerCase().includes(eventSearch.toLowerCase())
        );
      }
      
      // Apply event-level filter for categories/resources
      if (eventIdsMatchingFilters !== null) {
        allRequests = allRequests.filter(r => {
          const eventKey = `${r.event_id}_${r.venue_booking_id}`;
          return eventIdsMatchingFilters.has(eventKey);
        });
      }

      // Apply status filter
      if (filter !== 'all') {
        allRequests = allRequests.filter(r => r.status === filter);
      }
      
      // Apply period filter (usage period)
      if (periodFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        
        if (periodFilter === 'today') {
          allRequests = allRequests.filter(r => {
            const start = new Date(r.usage_start_datetime);
            const end = new Date(r.usage_end_datetime);
            return start <= todayEnd && end >= today;
          });
        } else if (periodFilter === 'this-week') {
          allRequests = allRequests.filter(r => {
            const start = new Date(r.usage_start_datetime);
            const end = new Date(r.usage_end_datetime);
            return start < weekEnd && end >= today;
          });
        } else if (periodFilter === 'this-month') {
          allRequests = allRequests.filter(r => {
            const start = new Date(r.usage_start_datetime);
            const end = new Date(r.usage_end_datetime);
            return start <= monthEnd && end >= monthStart;
          });
        } else if (periodFilter === 'custom') {
          if (customStartDate || customEndDate) {
            allRequests = allRequests.filter(r => {
              const usageStart = new Date(r.usage_start_datetime);
              const usageEnd = new Date(r.usage_end_datetime);
              
              if (customStartDate && customEndDate) {
                const rangeStart = new Date(customStartDate);
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                return usageStart <= rangeEnd && usageEnd >= rangeStart;
              } else if (customStartDate) {
                const rangeStart = new Date(customStartDate);
                return usageEnd >= rangeStart;
              } else if (customEndDate) {
                const rangeEnd = new Date(customEndDate);
                rangeEnd.setHours(23, 59, 59, 999);
                return usageStart <= rangeEnd;
              }
              return true;
            });
          }
        }
      }

      setRequests(allRequests);
    } catch (err) {
      setError('Failed to load resource requests');
      console.error('Load requests error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, eventSearch, resourceTypeFilter, resourceSearch, periodFilter, customStartDate, customEndDate]);

  useEffect(() => {
    // Load resource categories for dropdown
    const loadResourceCategories = async () => {
      try {
        const response = await authFetch('/resource-categories');
        const data = await response.json();
        setResourceCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to load resource categories:', err);
      }
    };
    loadResourceCategories();
  }, []);

  useEffect(() => {
    loadMyRequests();

    // Check for success message from navigation
    if (location.state?.message) {
      showSuccess(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [filter, location, loadMyRequests, showSuccess]);

  const handleCancelPackage = async (group) => {
    const pending = group.filter(r => r.status === 'pending');
    if (pending.length === 0) {
      showError('No pending requests to cancel in this package');
      setCancelModalRequest(null);
      return;
    }

    setCancelModalRequest(null);

    const idsToRemove = new Set(group.map(r => r.id));
    setRequests(requests.filter(r => !idsToRemove.has(r.id)));

    let undoTimeout;
    const resourceLabel = group[0]?.event?.event_name || 'resource request';
    showSuccess(`Resource package for "${resourceLabel}" cancelled`, {
      duration: 5000,
      onUndo: async () => {
        clearTimeout(undoTimeout);
        await loadMyRequests();
        showSuccess('Package restored');
      }
    });

    undoTimeout = setTimeout(async () => {
      try {
        for (const request of pending) {
          await resourceRequestService.cancel(request.id);
        }
        // Reload requests after successful cancellation
        await loadMyRequests();
      } catch (err) {
        showError(err.response?.data?.error || 'Failed to cancel package');
        await loadMyRequests();
      }
    }, 5000);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'mrr-status-pending';
      case 'approved':
        return 'mrr-status-approved';
      case 'rejected':
        return 'mrr-status-rejected';
      case 'cancelled':
        return 'mrr-status-cancelled';
      default:
        return '';
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      audio_visual: 'Audio/Visual',
      furniture: 'Furniture',
      it_equipment: 'IT Equipment',
      catering: 'Catering',
      other: 'Other'
    };
    // Handle category as object or string
    const categoryValue = typeof category === 'object' ? category?.code || category?.name : category;
    return labels[categoryValue] || categoryValue || 'Unknown';
  };

  const groupedRequests = useMemo(() => {
    const groups = {};
    requests.forEach(r => {
      // Group by package_id to show each submission separately
      const key = r.package_id || r.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.values(groups);
  }, [requests]);

  return (
    <div className="my-resource-requests-page">
      <div className="mrr-header">
        <div>
          <h1>My Resource Requests</h1>
          <p>View and manage your resource requests</p>
        </div>
        <button onClick={() => navigate('/home')} className="mrr-back-button">
          Back to Home
        </button>
      </div>

      {/* Success messages now shown via toast */}
      {false && (
        <div className="mrr-success-notification">
        </div>
      )}

      <div className="mrr-filter-section">
        <div className="mrr-filter-group">
          <label>Event Name:</label>
          <input
            type="text"
            placeholder="Search event name..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '180px' }}
          />
        </div>
        
        <div className="mrr-filter-group">
          <label>Type:</label>
          <select value={resourceTypeFilter} onChange={(e) => setResourceTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {resourceCategories.map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
        </div>
        
        <div className="mrr-filter-group">
          <label>Resource:</label>
          <input
            type="text"
            placeholder="Search resource..."
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '4px', border: '1px solid #ccc', width: '150px' }}
          />
        </div>
        
        <div className="mrr-filter-group">
          <label>Period:</label>
          <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        
        {periodFilter === 'custom' && (
          <>
            <div className="mrr-filter-group">
              <label>From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div className="mrr-filter-group">
              <label>To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
          </>
        )}
        
        <div className="mrr-filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && <div className="mrr-error-message">{error}</div>}

      {loading ? (
        <div className="mrr-loading">Loading your resource requests...</div>
      ) : requests.length === 0 ? (
        <div className="mrr-no-requests">
          {filter === 'all' ? (
            <p>You haven't made any resource requests yet.</p>
          ) : (
            <p>No {filter} requests found.</p>
          )}
        </div>
      ) : (
        <>
          <div className="mrr-requests-count">
            Showing {groupedRequests.length} package{groupedRequests.length !== 1 ? 's' : ''}
          </div>
          <div className="mrr-requests-table-container">
            <table className="mrr-requests-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resources</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedRequests.map(group => {
                  const first = group[0];
                  const statuses = group.map(r => r.status);
                  const allSame = statuses.every(s => s === statuses[0]);
                  const groupStatus = allSame ? statuses[0] : 'mixed';
                  const hasPending = group.some(r => r.status === 'pending');

                  return (
                  <tr key={first.id}>
                    <td className="mrr-event-cell">
                      <div className="mrr-event-name">{first.event?.event_name || 'Unknown Event'}</div>
                      <div className="mrr-venue-info">
                        {typeof first.venue_booking?.venue === 'object' 
                          ? `${first.venue_booking?.venue?.name || 'Unknown'} (${first.venue_booking?.venue?.code || 'N/A'})` 
                          : first.venue_booking?.venue || 'Unknown Venue'}
                      </div>
                    </td>
                    <td className="mrr-resource-cell">
                      <div className="mrr-resource-list">
                        {group.map((request, idx) => (
                          <div key={request.id} className="mrr-resource-row">
                            <div>
                              <div className="mrr-resource-name">{idx + 1}. {request.resource?.name}</div>
                              <span className="mrr-resource-category">{getCategoryLabel(request.resource?.category)}</span>
                              <div className="mrr-resource-qty"><strong>{request.requested_quantity}</strong> {typeof request.resource?.unit === 'object' ? request.resource?.unit?.name || 'units' : request.resource?.unit || 'units'}</div>
                            </div>
                            <span className={`mrr-status-badge ${getStatusBadgeClass(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="mrr-datetime-cell">
                      <div>{formatDateTime(first.usage_start_datetime)}</div>
                      <div className="mrr-datetime-to">to</div>
                      <div>{formatDateTime(first.usage_end_datetime)}</div>
                    </td>
                    <td>
                      <span className={`mrr-status-badge ${getStatusBadgeClass(groupStatus)}`}>
                        {groupStatus}
                      </span>
                    </td>
                    <td className="mrr-actions-cell">
                      <button 
                        onClick={() => navigate(`/resource-requests/${first.id}`)}
                        className="mrr-action-button mrr-view-button"
                        title="View Details"
                      >
                        👁️
                      </button>
                      {hasPending && (
                        <button
                          onClick={() => setCancelModalRequest(group)}
                          className="mrr-action-button mrr-cancel-button"
                          title="Cancel Pending Requests"
                        >
                          ✖️
                        </button>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </>
      )}

      {cancelModalRequest && (
        <ConfirmModal
          isOpen={true}
          title="Cancel Resource Requests"
          message={`Cancel all pending requests for "${cancelModalRequest[0]?.event?.event_name || 'this event'}"? Undo available for 5 seconds.`}
          onConfirm={() => handleCancelPackage(cancelModalRequest)}
          onClose={() => setCancelModalRequest(null)}
          danger
        />
      )}
    </div>
  );
}

export default MyResourceRequestsPage;
