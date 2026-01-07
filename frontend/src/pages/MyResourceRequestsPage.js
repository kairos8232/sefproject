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
        <button onClick={() => navigate('/my-events')} className="mrr-back-button">
          Back to My Events
        </button>
      </div>

      {successMessage && (
        <div className="mrr-success-notification">
          ✅ {successMessage}
        </div>
      )}

      <div className="mrr-filter-section">
        <label>Filter by status:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
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
                  <th>Usage Period</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
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
                      {request.status === 'approved' && request.approver && (
                        <div className="mrr-approver-info">
                          By: {typeof request.approver === 'object' ? request.approver?.name || 'Unknown' : request.approver}
                        </div>
                      )}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mrr-rejection-reason">
                          {request.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="mrr-actions-cell">
                      {(request.status === 'pending' || request.status === 'approved') && (
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
