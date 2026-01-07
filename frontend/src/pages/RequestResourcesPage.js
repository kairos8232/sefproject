import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import resourceRequestService from '../services/resourceRequestService';
import { formatDateTime } from '../utils/dateUtils';
import './RequestResourcesPage.css';

function RequestResourcesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { event, venueBooking } = location.state || {};

  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [setupInstructions, setSetupInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadAvailableResources = useCallback(async () => {
    if (!venueBooking) return;

    try {
      setLoading(true);
      setError('');

      const response = await resourceRequestService.checkAvailability(
        venueBooking.approved_start_datetime || venueBooking.requested_start_datetime,
        venueBooking.approved_end_datetime || venueBooking.requested_end_datetime,
        categoryFilter === 'all' ? null : categoryFilter
      );

      setResources(response.resources || []);
    } catch (err) {
      setError('Failed to load available resources');
      console.error('Load resources error:', err);
    } finally {
      setLoading(false);
    }
  }, [venueBooking, categoryFilter]);

  useEffect(() => {
    if (!event || !venueBooking) {
      navigate('/my-events');
      return;
    }

    loadAvailableResources();
  }, [event, venueBooking, navigate, loadAvailableResources]);

  const handleResourceSelect = (resource) => {
    setSelectedResource(resource);
    setQuantity(1); // Reset quantity when selecting new resource
    setSetupInstructions('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedResource) {
      alert('Please select a resource');
      return;
    }

    if (quantity < 1) {
      alert('Quantity must be at least 1');
      return;
    }

    if (quantity > selectedResource.availableQuantity) {
      alert(`Only ${selectedResource.availableQuantity} ${selectedResource.unit} available`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const requestData = {
        event_id: event.id,
        venue_booking_id: venueBooking.id,
        resource_id: selectedResource.id,
        requested_quantity: parseInt(quantity),
        usage_start_datetime: venueBooking.approved_start_datetime || venueBooking.requested_start_datetime,
        usage_end_datetime: venueBooking.approved_end_datetime || venueBooking.requested_end_datetime,
        setup_instructions: setupInstructions || null,
      };

      await resourceRequestService.create(requestData);

      // Show success message and navigate
      navigate('/my-resource-requests', {
        state: { message: 'Resource request submitted successfully!' }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit resource request');
      console.error('Submit request error:', err);
    } finally {
      setSubmitting(false);
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

  if (!event || !venueBooking) {
    return null;
  }

  return (
    <div className="request-resources-page">
      <div className="request-resources-header">
        <div>
          <h1>Request Resources</h1>
          <p>Select resources for your event</p>
          <div className="event-info">
            <strong>Event:</strong> {event.event_name}
          </div>
          <div className="event-info">
            <strong>Venue:</strong> {typeof venueBooking.venue === 'object' 
              ? `${venueBooking.venue?.name || 'Unknown'} (${venueBooking.venue?.code || 'N/A'})` 
              : venueBooking.venue || 'Unknown Venue'}
          </div>
          <div className="event-info">
            <strong>Time:</strong> {formatDateTime(venueBooking.approved_start_datetime || venueBooking.requested_start_datetime)} - {formatDateTime(venueBooking.approved_end_datetime || venueBooking.requested_end_datetime)}
          </div>
        </div>
        <button onClick={() => navigate('/my-events')} className="back-button">
          Back to My Events
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="request-resources-container">
        {/* Resource Selection Section */}
        <div className="resource-selection-section">
          <h2>Available Resources</h2>

          <div className="category-filter">
            <label>Filter by category:</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="audio_visual">Audio/Visual</option>
              <option value="furniture">Furniture</option>
              <option value="it_equipment">IT Equipment</option>
              <option value="catering">Catering</option>
              <option value="other">Other</option>
            </select>
          </div>

          {loading ? (
            <div className="loading">Loading resources...</div>
          ) : resources.length === 0 ? (
            <div className="no-resources">
              <p>No resources available for the selected category and time period.</p>
            </div>
          ) : (
            <div className="resources-grid">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className={`resource-card ${selectedResource?.id === resource.id ? 'selected' : ''} ${resource.availableQuantity === 0 ? 'unavailable' : ''}`}
                  onClick={() => resource.availableQuantity > 0 && handleResourceSelect(resource)}
                >
                  <div className="resource-header">
                    <h3>{resource.name}</h3>
                    <span className="resource-category">{getCategoryLabel(resource.category)}</span>
                  </div>
                  <div className="resource-details">
                    {resource.description && <p>{resource.description}</p>}
                    <p>
                      <strong>Available:</strong> {resource.availableQuantity} / {resource.total_quantity} {typeof resource.unit === 'object' ? resource.unit?.name || resource.unit?.code || 'units' : resource.unit || 'units'}
                    </p>
                    {resource.availableQuantity < resource.total_quantity && (
                      <p className="allocated-info">
                        ({resource.allocatedQuantity} {typeof resource.unit === 'object' ? resource.unit?.name || resource.unit?.code || 'units' : resource.unit || 'units'} already allocated)
                      </p>
                    )}
                    {resource.notes && (
                      <p className="resource-notes">
                        <strong>Note:</strong> {resource.notes}
                      </p>
                    )}
                  </div>
                  {selectedResource?.id === resource.id && (
                    <div className="selected-badge">Selected</div>
                  )}
                  {resource.availableQuantity === 0 && (
                    <div className="unavailable-badge">Unavailable</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request Form Section */}
        {selectedResource && (
          <div className="request-form-section">
            <h2>Request Details</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Selected Resource</label>
                <input
                  type="text"
                  value={selectedResource.name}
                  readOnly
                  className="readonly-field"
                />
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedResource.availableQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                <small>Maximum available: {selectedResource.availableQuantity} {typeof selectedResource.unit === 'object' ? selectedResource.unit?.name || selectedResource.unit?.code || 'units' : selectedResource.unit || 'units'}</small>
              </div>

              <div className="form-group">
                <label>Usage Period (Locked to Venue Booking)</label>
                <input
                  type="text"
                  value={`${formatDateTime(venueBooking.approved_start_datetime || venueBooking.requested_start_datetime)} - ${formatDateTime(venueBooking.approved_end_datetime || venueBooking.requested_end_datetime)}`}
                  readOnly
                  className="readonly-field"
                />
                <small>Resource usage time matches your approved venue booking</small>
              </div>

              <div className="form-group">
                <label>Setup Instructions (Optional)</label>
                <textarea
                  rows="4"
                  value={setupInstructions}
                  onChange={(e) => setSetupInstructions(e.target.value)}
                  placeholder="Any special setup requirements or instructions..."
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => navigate('/my-events')}
                  className="cancel-button"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>

              <p className="submit-note">
                Note: Your request will be reviewed by faculty managers. You'll be able to track its status in "My Resource Requests".
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default RequestResourcesPage;
