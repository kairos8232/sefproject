import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import resourceRequestService from '../services/resourceRequestService';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime } from '../utils/dateUtils';
import './FacultyResourceRequestsPage.css';
import authService from '../services/authService';

const FacultyResourceRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [eventSearch, setEventSearch] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await resourceRequestService.getAll();
      let filtered = data.requests || [];

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === statusFilter);
      }

      // Apply event search
      if (eventSearch.trim()) {
        filtered = filtered.filter(r => 
          r.event?.event_name?.toLowerCase().includes(eventSearch.toLowerCase())
        );
      }

      // Apply resource search
      if (resourceSearch.trim()) {
        filtered = filtered.filter(r => 
          r.resource?.name?.toLowerCase().includes(resourceSearch.toLowerCase()) ||
          r.resource?.code?.toLowerCase().includes(resourceSearch.toLowerCase())
        );
      }

      setRequests(filtered);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to load resource requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, eventSearch, resourceSearch, showError]);

  useEffect(() => {
    document.title = 'Resource Request Approval - CESMS';
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      await resourceRequestService.approve(selectedRequest.id, approvalNotes || null);
      showSuccess('Resource request approved successfully');
      closeModal();
      loadRequests();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      showError('Rejection reason is required');
      return;
    }

    if (rejectionReason.trim().length < 10) {
      showError('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setProcessing(true);
      await resourceRequestService.reject(selectedRequest.id, rejectionReason);
      showSuccess('Resource request rejected');
      closeModal();
      loadRequests();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const openApproveModal = (request) => {
    setSelectedRequest(request);
    setIsRejecting(false);
    setApprovalNotes('');
    setShowModal(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setIsRejecting(true);
    setRejectionReason('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setIsRejecting(false);
    setApprovalNotes('');
    setRejectionReason('');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'frrp-status-pending';
      case 'approved': return 'frrp-status-approved';
      case 'rejected': return 'frrp-status-rejected';
      case 'cancelled': return 'frrp-status-cancelled';
      default: return '';
    }
  };

  if (loading) {
    return <div className="frrp-container"><div className="frrp-loading">Loading resource requests...</div></div>;
  }

  return (
    <div className="frrp-container">
      <div className="frrp-header">
        <div>
          <h1>📦 Resource Request Approval</h1>
          <p>Review and approve resource requests for your faculty</p>
        </div>
        <button onClick={async () => {
          // Attempt to refresh the session before navigating home
          try { await authService.refreshAccessToken(); } catch (e) {}
          navigate('/home');
        }} className="frrp-back-button">
          Back to Home
        </button>
      </div>

      {/* Filters */}
      <div className="frrp-filters">
        <div className="frrp-filter-group">
          <label>Status:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="frrp-filter-group">
          <label>Event:</label>
          <input
            type="text"
            placeholder="Search event name..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
          />
        </div>

        <div className="frrp-filter-group">
          <label>Resource:</label>
          <input
            type="text"
            placeholder="Search resource..."
            value={resourceSearch}
            onChange={(e) => setResourceSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Requests Table */}
      {requests.length === 0 ? (
        <div className="frrp-no-data">No resource requests found.</div>
      ) : (
        <>
          <div className="frrp-count">
            Showing {requests.length} request{requests.length !== 1 ? 's' : ''}
          </div>
          <div className="frrp-table-container">
            <table className="frrp-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Quantity</th>
                  <th>Usage Period</th>
                  <th>Requester</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
                  <tr key={request.id}>
                    <td>
                      <div className="frrp-event-name">{request.event?.event_name || 'N/A'}</div>
                    </td>
                    <td>
                      <div className="frrp-resource-info">
                        <div className="frrp-resource-name">{request.resource?.name || 'N/A'}</div>
                        <div className="frrp-resource-code">{request.resource?.code || ''}</div>
                      </div>
                    </td>
                    <td>
                      <strong>{request.requested_quantity}</strong> {request.resource?.unit}
                    </td>
                    <td>
                      <div className="frrp-datetime">
                        <div>{formatDateTime(request.usage_start_datetime)}</div>
                        <div className="frrp-to">to</div>
                        <div>{formatDateTime(request.usage_end_datetime)}</div>
                      </div>
                    </td>
                    <td>
                      <div className="frrp-requester">{request.requester?.name || 'N/A'}</div>
                    </td>
                    <td>
                      <span className={`frrp-status-badge ${getStatusBadgeClass(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="frrp-actions">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => openApproveModal(request)}
                            className="frrp-btn-approve"
                            title="Approve"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => openRejectModal(request)}
                            className="frrp-btn-reject"
                            title="Reject"
                          >
                            ❌
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Approval/Rejection Modal */}
      {showModal && selectedRequest && (
        <div className="frrp-modal-overlay" onClick={closeModal}>
          <div className="frrp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="frrp-modal-header">
              <h2>{isRejecting ? '❌ Reject Request' : '✅ Approve Request'}</h2>
              <button onClick={closeModal} className="frrp-modal-close">×</button>
            </div>

            <div className="frrp-modal-content">
              <div className="frrp-modal-info">
                <p><strong>Event:</strong> {selectedRequest.event?.event_name}</p>
                <p><strong>Resource:</strong> {selectedRequest.resource?.name} ({selectedRequest.resource?.code})</p>
                <p><strong>Quantity:</strong> {selectedRequest.requested_quantity} {selectedRequest.resource?.unit}</p>
                <p><strong>Requester:</strong> {selectedRequest.requester?.name}</p>
              </div>

              {isRejecting ? (
                <div className="frrp-form-group">
                  <label>Rejection Reason *</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a reason for rejection (minimum 10 characters)..."
                    rows="4"
                    required
                  />
                </div>
              ) : (
                <div className="frrp-form-group">
                  <label>Approval Notes (optional)</label>
                  <textarea
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Add any notes or instructions..."
                    rows="3"
                  />
                </div>
              )}
            </div>

            <div className="frrp-modal-actions">
              <button onClick={closeModal} className="frrp-btn-cancel" disabled={processing}>
                Cancel
              </button>
              <button
                onClick={isRejecting ? handleReject : handleApprove}
                className={isRejecting ? 'frrp-btn-reject' : 'frrp-btn-approve'}
                disabled={processing || (isRejecting && !rejectionReason.trim())}
              >
                {processing ? 'Processing...' : (isRejecting ? 'Reject Request' : 'Approve Request')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyResourceRequestsPage;
