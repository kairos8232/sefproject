import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import resourceRequestService from '../services/resourceRequestService';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime } from '../utils/dateUtils';
import './FacultyResourceRequestsPage.css';
import authService from '../services/authService';

const FacultyResourceRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
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
      const fetched = data.requests || [];
      setAllRequests(fetched);
      setRequests(fetched);
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to load resource requests');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    document.title = 'Resource Request Approval - CESMS';
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    let filtered = allRequests;

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (eventSearch.trim()) {
      const search = eventSearch.toLowerCase();
      filtered = filtered.filter(r =>
        r.event?.event_name?.toLowerCase().includes(search)
      );
    }

    if (resourceSearch.trim()) {
      const search = resourceSearch.toLowerCase();
      filtered = filtered.filter(r =>
        r.resource?.name?.toLowerCase().includes(search) ||
        r.resource?.code?.toLowerCase().includes(search)
      );
    }

    setRequests(filtered);
  }, [allRequests, statusFilter, eventSearch, resourceSearch]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      // If selectedRequest is an array (group), approve all
      const requests = Array.isArray(selectedRequest) ? selectedRequest : [selectedRequest];
      for (const req of requests) {
        await resourceRequestService.approve(req.id, approvalNotes || null);
      }
      showSuccess(`${requests.length} resource request(s) approved successfully`);
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
      // If selectedRequest is an array (group), reject all
      const requests = Array.isArray(selectedRequest) ? selectedRequest : [selectedRequest];
      for (const req of requests) {
        await resourceRequestService.reject(req.id, rejectionReason);
      }
      showSuccess(`${requests.length} resource request(s) rejected`);
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

  const handleViewDetails = (request) => {
    navigate(`/resource-requests/${request[0].id}`, { state: { fromResourceRequests: true } });
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

  const getRoleColorClass = (role) => {
    if (!role) return 'frrp-role-default';
    switch (role.toLowerCase()) {
      case 'student':
        return 'frrp-role-student';
      case 'faculty_staff':
        return 'frrp-role-faculty';
      case 'event_organizer':
        return 'frrp-role-organizer';
      default:
        return 'frrp-role-default';
    }
  };

  const groupedRequests = useMemo(() => {
    const groups = {};
    requests.forEach(r => {
      const key = r.package_id || r.event_id || r.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.values(groups);
  }, [requests]);

  if (loading) {
    return <div className="frrp-container"><div className="frrp-loading">Loading resource requests...</div></div>;
  }

  return (
    <div className="frrp-container">
      <div className="fbrp-page-header">
        <div>
          <h1>📦 Resource Request Approval</h1>
          <p>Review and approve resource requests for your faculty</p>
        </div>
        <button onClick={async () => {
          // Attempt to refresh the session before navigating home
          try { await authService.refreshAccessToken(); } catch (e) {}
          navigate('/home');
        }} className="fbrp-back-button">
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
          <div className="fbrp-count">
            Showing {groupedRequests.length} group{groupedRequests.length !== 1 ? 's' : ''}
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
                {groupedRequests.map(group => {
                  const first = group[0];
                  const statuses = group.map(r => r.status);
                  const allSame = statuses.every(s => s === statuses[0]);
                  const groupStatus = allSame ? statuses[0] : 'mixed';

                  return (
                    <tr key={first.id}>
                      <td>
                        <div className="frrp-event-name">{first.event?.event_name || 'N/A'}</div>
                      </td>
                      <td>
                        <div className="frrp-resource-list">
                          {group.map((request, idx) => (
                            <div key={request.id} className="frrp-resource-row">
                              <div className="frrp-resource-info">
                                <div className="frrp-resource-name">
                                  {idx + 1}. {request.resource?.name || 'N/A'}
                                </div>
                                {request.resource?.code && (
                                  <div className="frrp-resource-code">{request.resource.code}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="frrp-quantity-list">
                          {group.map(request => (
                            <div key={request.id} className="frrp-quantity-row">
                              <strong>{request.requested_quantity}</strong> {request.resource?.unit}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="frrp-datetime">
                          <div>{formatDateTime(first.usage_start_datetime)}</div>
                          <div className="frrp-to">to</div>
                          <div>{formatDateTime(first.usage_end_datetime)}</div>
                        </div>
                      </td>
                      <td>
                        <div className="frrp-requester-info">
                          <div className="frrp-requester-name">{first.requester?.name || 'N/A'}</div>
                          {first.requester?.role && (
                            <div className={`frrp-requester-role ${getRoleColorClass(first.requester.role)}`}>
                              {first.requester.role.replace('_', ' ').split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`frrp-status-badge ${getStatusBadgeClass(groupStatus)}`}>
                          {groupStatus}
                        </span>
                      </td>
                      <td className="frrp-actions-cell">
                        <div className="frrp-actions-row">
                          <button
                            className="frrp-action-button frrp-view-button"
                            onClick={() => handleViewDetails(group)}
                            title="View Request Details"
                          >
                            👁️
                          </button>
                          {groupStatus === 'pending' && (
                            <>
                              <button
                                className="frrp-action-button frrp-approve-button"
                                onClick={() => openApproveModal(group)}
                                title={`Approve all resources in this group`}
                              >
                                ✅
                              </button>
                              <button
                                className="frrp-action-button frrp-reject-button"
                                onClick={() => openRejectModal(group)}
                                title={`Reject all resources in this group`}
                              >
                                ❌
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <p><strong>Event:</strong> {Array.isArray(selectedRequest) ? selectedRequest[0]?.event?.event_name : selectedRequest?.event?.event_name}</p>
                {Array.isArray(selectedRequest) ? (
                  <>
                    <p><strong>Resources in this group:</strong></p>
                    <ul style={{ marginLeft: '20px' }}>
                      {selectedRequest.map((req, idx) => (
                        <li key={req.id}>
                          {idx + 1}. {req.resource?.name} ({req.resource?.code}) - {req.requested_quantity} {req.resource?.unit}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p><strong>Resource:</strong> {selectedRequest?.resource?.name} ({selectedRequest?.resource?.code})</p>
                    <p><strong>Quantity:</strong> {selectedRequest?.requested_quantity} {selectedRequest?.resource?.unit}</p>
                  </>
                )}
                <p><strong>Requester:</strong> {Array.isArray(selectedRequest) ? selectedRequest[0]?.requester?.name : selectedRequest?.requester?.name}</p>
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
                className={isRejecting ? 'frrp-btn-confirm-reject' : 'frrp-btn-approve'}
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
