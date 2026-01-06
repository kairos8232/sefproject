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
  const navigate = useNavigate();
  const location = useLocation();

  const loadMyRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await resourceRequestService.getMyRequests();
      let allRequests = data.requests || [];

      // Apply filter
      if (filter !== 'all') {
        allRequests = allRequests.filter(r => r.status === filter);
      }

      setRequests(allRequests);
    } catch (err) {
      setError('Failed to load resource requests');
      console.error('Load requests error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
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
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'cancelled':
        return 'status-cancelled';
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
    return labels[category] || category;
  };

  return (
    <div className="my-resource-requests-page">
      <div className="resource-requests-header">
        <div>
          <h1>My Resource Requests</h1>
          <p>View and manage your resource requests</p>
        </div>
        <button onClick={() => navigate('/my-events')} className="back-button">
          Back to My Events
        </button>
      </div>

      {successMessage && (
        <div className="success-notification">
          ✅ {successMessage}
        </div>
      )}

      <div className="filter-section">
        <label>Filter by status:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading your resource requests...</div>
      ) : requests.length === 0 ? (
        <div className="no-requests">
          {filter === 'all' ? (
            <p>You haven't made any resource requests yet.</p>
          ) : (
            <p>No {filter} requests found.</p>
          )}
        </div>
      ) : (
        <>
          <div className="requests-count">
            Showing {requests.length} request{requests.length !== 1 ? 's' : ''}
          </div>
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Quantity</th>
                  <th>Usage Period</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="event-cell">
                      <div className="event-name">{request.event?.event_name}</div>
                      <div className="venue-info">
                        {request.venue_booking?.venue?.name} ({request.venue_booking?.venue?.code})
                      </div>
                    </td>
                    <td className="resource-cell">
                      <div className="resource-name">{request.resource?.name}</div>
                      <span className="resource-category">
                        {getCategoryLabel(request.resource?.category)}
                      </span>
                    </td>
                    <td>
                      <strong>{request.requested_quantity}</strong> {request.resource?.unit}
                    </td>
                    <td className="datetime-cell">
                      <div>{formatDateTime(request.usage_start_datetime)}</div>
                      <div className="datetime-to">to</div>
                      <div>{formatDateTime(request.usage_end_datetime)}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                      {request.status === 'approved' && request.approver && (
                        <div className="approver-info">
                          By: {request.approver.name}
                        </div>
                      )}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="rejection-reason">
                          {request.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="actions-cell">
                      {(request.status === 'pending' || request.status === 'approved') && (
                        <button
                          onClick={() => handleCancelRequest(request.id, request.resource?.name)}
                          className="action-button cancel-button"
                          title="Cancel Request"
                        >
                          ✖️
                        </button>
                      )}
                    </td>
                  </tr>
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
