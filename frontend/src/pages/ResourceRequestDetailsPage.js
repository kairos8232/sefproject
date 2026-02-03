import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import resourceRequestService from '../services/resourceRequestService';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime } from '../utils/dateUtils';
import './ResourceRequestDetailsPage.css';

function ResourceRequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showSuccess } = useToast();
  const [request, setRequest] = useState(null);
  const [groupedRequests, setGroupedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Determine where user came from
  const fromResourceRequests = location.state?.fromResourceRequests || false;
  const backPath = fromResourceRequests ? '/faculty/resource-requests' : '/my-resource-requests';
  const backText = fromResourceRequests ? 'Back to Resource Requests' : 'Back to My Requests';

  const loadRequestDetails = useCallback(async () => {
    try {
      setLoading(true);
      const result = await resourceRequestService.getById(id);
      setRequest(result.request);
      
      // If this request has a package_id, fetch all grouped requests
      if (result.request?.package_id) {
        try {
          const allResult = await resourceRequestService.getAll();
          const grouped = allResult.requests?.filter(r => r.package_id === result.request.package_id) || [result.request];
          setGroupedRequests(grouped);
        } catch (err) {
          // If getAll fails, try getByEvent or just show the single request
          if (result.request?.event_id) {
            try {
              const eventResult = await resourceRequestService.getByEvent(result.request.event_id);
              const grouped = eventResult.requests?.filter(r => r.package_id === result.request.package_id) || [result.request];
              setGroupedRequests(grouped);
            } catch (err2) {
              setGroupedRequests([result.request]);
            }
          } else {
            setGroupedRequests([result.request]);
          }
        }
      } else if (result.request?.event_id) {
        // If no package_id but has event_id, fetch all requests for that event
        try {
          const eventResult = await resourceRequestService.getByEvent(result.request.event_id);
          setGroupedRequests(eventResult.requests || [result.request]);
        } catch (err) {
          setGroupedRequests([result.request]);
        }
      } else {
        setGroupedRequests([result.request]);
      }
    } catch (err) {
      console.error('Load request error:', err);
      showError(err.response?.data?.error || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  const handleApprove = async () => {
    if (!request) return;

    try {
      setProcessing(true);
      await resourceRequestService.approve(request.id, approvalNotes);
      showSuccess('Resource request approved successfully');
      
      // Reset form
      setApprovalNotes('');
      loadRequestDetails();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request || !rejectionReason.trim()) {
      return;
    }

    try {
      setProcessing(true);
      await resourceRequestService.reject(request.id, rejectionReason);
      showSuccess('Resource request rejected');
      
      // Reset form
      setRejectionReason('');
      loadRequestDetails();
    } catch (err) {
      showError(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    document.title = 'Resource Request Details - CESMS';
    loadRequestDetails();
  }, [loadRequestDetails]);

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
    if (!category) return 'N/A';
    if (typeof category === 'object') {
      return category.name || 'Unknown Category';
    }
    return category;
  };

  if (loading) {
    return (
      <div className="request-details-container">
        <div className="rrd-loading">Loading request details...</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="request-details-container">
        <div className="rrd-error-message">Request not found</div>
        <button onClick={() => navigate(backPath)} className="rrd-back-button">
          {backText}
        </button>
      </div>
    );
  }

  return (
    <div className="request-details-container">
      <div className="request-details-header">
        <div>
          <h1>Resource Request Details</h1>
          <p>View your resource request status</p>
        </div>
        <button onClick={() => navigate(backPath)} className="rrd-back-button">
          {backText}
        </button>
      </div>

      <div className="request-details-content">
        {/* Status Badge */}
        <div className="rrd-request-header">
          <h2>Resource Request Details</h2>
          <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
            {request.status.toUpperCase()}
          </span>
        </div>

        {/* Event Information */}
        <div className="rrd-details-section">
          <h2>Event Information</h2>
          <div className="rrd-details-grid">
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Event Name:</span>
              <span className="rrd-detail-value">{request.event?.event_name || 'N/A'}</span>
            </div>
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Venue:</span>
              <span className="rrd-detail-value">
                {typeof request.venue_booking?.venue === 'object' 
                  ? `${request.venue_booking?.venue?.name || 'Unknown'} (${request.venue_booking?.venue?.code || 'N/A'})` 
                  : request.venue_booking?.venue || 'Unknown Venue'}
              </span>
            </div>
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Event Start:</span>
              <span className="rrd-detail-value">{formatDateTime(request.event?.start_datetime)}</span>
            </div>
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Event End:</span>
              <span className="rrd-detail-value">{formatDateTime(request.event?.end_datetime)}</span>
            </div>
          </div>
        </div>

        {/* Resource Information */}
        <div className="rrd-details-section">
          <h2>Resource Information</h2>
          {groupedRequests.length > 1 ? (
            <div className="rrd-resource-list">
              {groupedRequests.map((req, idx) => (
                <div key={idx} className="rrd-resource-row">
                  <div className="rrd-resource-info">
                    <div className="rrd-resource-name">{idx + 1}. {req.resource?.name || 'N/A'}</div>
                    <div className="rrd-resource-code">{req.resource?.code || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rrd-details-grid">
              <div className="rrd-detail-item">
                <span className="rrd-detail-label">Resource Name:</span>
                <span className="rrd-detail-value">{request.resource?.name || 'N/A'}</span>
              </div>
              <div className="rrd-detail-item">
                <span className="rrd-detail-label">Resource Code:</span>
                <span className="rrd-detail-value">{request.resource?.code || 'N/A'}</span>
              </div>
              <div className="rrd-detail-item">
                <span className="rrd-detail-label">Category:</span>
                <span className="rrd-detail-value">{getCategoryLabel(request.resource?.category)}</span>
              </div>
              <div className="rrd-detail-item">
                <span className="rrd-detail-label">Requested Quantity:</span>
                <span className="rrd-detail-value">
                  {request.requested_quantity}{' '}
                  {typeof request.resource?.unit === 'object' 
                    ? request.resource?.unit?.name || 'units' 
                    : request.resource?.unit || 'units'}
                </span>
              </div>
              {request.resource?.description && (
                <div className="rrd-detail-item rrd-full-width">
                  <span className="rrd-detail-label">Resource Description:</span>
                  <span className="rrd-detail-value">{request.resource.description}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Request Details */}
        <div className="rrd-details-section">
          <h2>Request Details</h2>
          <div className="rrd-details-grid">
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Usage Start:</span>
              <span className="rrd-detail-value">{formatDateTime(request.usage_start_datetime)}</span>
            </div>
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Usage End:</span>
              <span className="rrd-detail-value">{formatDateTime(request.usage_end_datetime)}</span>
            </div>
            {request.setup_instructions && (
              <div className="rrd-detail-item rrd-full-width">
                <span className="rrd-detail-label">Setup Instructions:</span>
                <span className="rrd-detail-value">{request.setup_instructions}</span>
              </div>
            )}
          </div>
        </div>

        {/* Requester Information */}
        <div className="rrd-details-section">
          <h2>Request Information</h2>
          <div className="rrd-details-grid">
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Requested By:</span>
              <span className="rrd-detail-value">{request.requester?.name || 'N/A'}</span>
            </div>
            <div className="rrd-detail-item">
              <span className="rrd-detail-label">Requested At:</span>
              <span className="rrd-detail-value">{formatDateTime(request.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Approval/Rejection Information */}
        {request.status === 'approved' && (
          <div className="details-section rrd-success-section">
            <h2>Approval Information</h2>
            <div className="rrd-details-grid">
              <div className="rrd-detail-item">
                <span className="rrd-detail-label">Approved By:</span>
                <span className="rrd-detail-value">{request.approver?.name || 'N/A'}</span>
              </div>
              <div className="rrd-detail-item">
                <span className="rrd-detail-label">Approved At:</span>
                <span className="rrd-detail-value">{formatDateTime(request.approved_at)}</span>
              </div>
              {request.approval_notes && (
                <div className="rrd-detail-item rrd-full-width">
                  <span className="rrd-detail-label">Approval Notes:</span>
                  <span className="rrd-detail-value">{request.approval_notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {request.status === 'rejected' && (
          <div className="details-section rrd-error-section">
            <h2>Rejection Information</h2>
            <div className="rrd-details-grid">
              {request.rejection_reason && (
                <div className="rrd-detail-item rrd-full-width">
                  <span className="rrd-detail-label">Rejection Reason:</span>
                  <span className="rrd-detail-value">{request.rejection_reason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {request.status === 'cancelled' && (
          <div className="rrd-details-section">
            <h2>Cancellation Information</h2>
            <div className="rrd-details-grid">
              {request.cancellation_reason && (
                <div className="rrd-detail-item rrd-full-width">
                  <span className="rrd-detail-label">Cancellation Reason:</span>
                  <span className="rrd-detail-value">{request.cancellation_reason}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Only show if pending */}
      {request.status === 'pending' && fromResourceRequests && (
        <div className="rrd-action-section">
          <div className="rrd-action-toggle">
            <button 
              className={`rrd-toggle-btn ${!isRejecting ? 'active' : ''}`}
              onClick={() => setIsRejecting(false)}
            >
              ✅ Approve Request
            </button>
            <button 
              className={`rrd-toggle-btn ${isRejecting ? 'active' : ''}`}
              onClick={() => setIsRejecting(true)}
            >
              ❌ Reject Request
            </button>
          </div>

          {!isRejecting ? (
            <form onSubmit={(e) => { e.preventDefault(); handleApprove(); }} className="rrd-action-form">
              <h3>Approve Resource Request</h3>
              
              <div className="rrd-form-group">
                <label>Approval Notes (Optional)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes or conditions for the approval..."
                  rows="4"
                />
              </div>

              <div className="rrd-form-actions">
                <button type="submit" className="rrd-btn-approve" disabled={processing}>
                  {processing ? 'Processing...' : '✅ Approve Request'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleReject(); }} className="rrd-action-form">
              <h3>Reject Resource Request</h3>
              
              <div className="rrd-form-group">
                <label>Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                  rows="5"
                  required
                />
                <small>{rejectionReason.length}/10 characters minimum</small>
              </div>

              <div className="rrd-form-actions">
                <button type="submit" className="rrd-btn-reject" disabled={processing}>
                  {processing ? 'Processing...' : '❌ Reject Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default ResourceRequestDetailsPage;
