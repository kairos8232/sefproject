import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import resourceRequestService from '../services/resourceRequestService';
import { formatDateTime } from '../utils/dateUtils';
import './MyResourceRequestsPage.css';

function MyResourceRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [eventSearch, setEventSearch] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all');
  const [resourceSearch, setResourceSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [resourceCategories, setResourceCategories] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const loadMyRequests = useCallback(async () => {
    document.title = 'My Resource Requests - CESMS';
    try {
      setLoading(true);
      setError('');

      const data = await resourceRequestService.getMyRequests();
      let allRequests = data.requests || [];
      
      console.log('All requests:', allRequests);
      console.log('Resource type filter:', resourceTypeFilter);
      if (allRequests.length > 0) {
        console.log('Sample request:', allRequests[0]);
        console.log('Sample resource:', allRequests[0].resource);
        console.log('Sample category:', allRequests[0].resource?.category);
      }
      
      // Apply event name filter
      if (eventSearch.trim()) {
        allRequests = allRequests.filter(r => 
          r.event?.event_name?.toLowerCase().includes(eventSearch.toLowerCase())
        );
      }
      
      // Apply resource type filter (match by category name)
      if (resourceTypeFilter !== 'all') {
        console.log('Filtering by category:', resourceTypeFilter);
        allRequests = allRequests.filter(r => {
          const categoryName = r.resource?.category?.name;
          console.log(`Request ${r.id}: category = ${categoryName}, matches = ${categoryName === resourceTypeFilter}`);
          return categoryName === resourceTypeFilter;
        });
        console.log('After type filter:', allRequests.length, 'requests');
      }
      
      // Apply resource search filter
      if (resourceSearch.trim()) {
        allRequests = allRequests.filter(r => 
          r.resource?.name?.toLowerCase().includes(resourceSearch.toLowerCase())
        );
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
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5001/api/resource-categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setResourceCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to load resource categories:', err);
      }
    };
    loadResourceCategories();
  }, []);

  useEffect(() => {
    console.log('useEffect triggered - filters changed');
    loadMyRequests();

    // Check for success message from navigation
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(''), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [filter, location, loadMyRequests]);

  const handleCancelRequest = async (requestId, resourceName) => {
    if (!window.confirm(`Are you sure you want to cancel the request for "${resourceName}"?`)) {
      return;
    }

    try {
      await resourceRequestService.cancel(requestId);
      setSuccessMessage('Resource request cancelled successfully');
      loadMyRequests();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel request');
    }
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

      {successMessage && (
        <div className="mrr-success-notification">
          ✅ {successMessage}
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
            Showing {requests.length} request{requests.length !== 1 ? 's' : ''}
          </div>
          <div className="mrr-requests-table-container">
            <table className="mrr-requests-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Quantity</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <>
                    <tr key={request.id}>
                      <td className="mrr-event-cell">
                        <div className="mrr-event-name">{request.event?.event_name || 'Unknown Event'}</div>
                        <div className="mrr-venue-info">
                          {typeof request.venue_booking?.venue === 'object' 
                            ? `${request.venue_booking?.venue?.name || 'Unknown'} (${request.venue_booking?.venue?.code || 'N/A'})` 
                            : request.venue_booking?.venue || 'Unknown Venue'}
                        </div>
                      </td>
                      <td className="mrr-resource-cell">
                        <div className="mrr-resource-name">{request.resource?.name}</div>
                        <span className="mrr-resource-category">
                          {getCategoryLabel(request.resource?.category)}
                        </span>
                      </td>
                      <td>
                        <strong>{request.requested_quantity}</strong> {typeof request.resource?.unit === 'object' ? request.resource?.unit?.name || 'units' : request.resource?.unit || 'units'}
                      </td>
                      <td className="mrr-datetime-cell">
                        <div>{formatDateTime(request.usage_start_datetime)}</div>
                        <div className="mrr-datetime-to">to</div>
                        <div>{formatDateTime(request.usage_end_datetime)}</div>
                      </td>
                      <td>
                        <span className={`mrr-status-badge ${getStatusBadgeClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="mrr-actions-cell">
                        <button 
                          onClick={() => navigate(`/resource-requests/${request.id}`)}
                          className="mrr-action-button mrr-view-button"
                          title="View Details"
                        >
                          👁️
                        </button>
                        {request.status === 'pending' && (
                          <button
                            onClick={() => handleCancelRequest(request.id, request.resource?.name)}
                            className="mrr-action-button mrr-cancel-button"
                            title="Cancel Request"
                          >
                            ✖️
                          </button>
                        )}
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default MyResourceRequestsPage;
