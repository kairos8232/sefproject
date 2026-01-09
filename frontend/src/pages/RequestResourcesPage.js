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
  const [selectedResources, setSelectedResources] = useState([]);
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

      // Only pass category if it's not 'all' and is a valid category name
      const categoryParam = (categoryFilter && categoryFilter !== 'all') ? categoryFilter : null;
      
      console.log('[RequestResources] Checking availability with category:', categoryParam);

      const response = await resourceRequestService.checkAvailability(
        venueBooking.approved_start_datetime || venueBooking.requested_start_datetime,
        venueBooking.approved_end_datetime || venueBooking.requested_end_datetime,
        categoryParam
      );
      
      console.log('[RequestResources] Available resources:', response.resources?.length || 0);

      setResources(response.resources || []);
    } catch (err) {
      setError('Failed to load available resources');
      console.error('Load resources error:', err);
    } finally {
      setLoading(false);
    }
  }, [venueBooking, categoryFilter]);

  useEffect(() => {
    document.title = 'Request Resources - CESMS';
    if (!event || !venueBooking) {
      navigate('/my-events');
      return;
    }

    loadAvailableResources();
  }, [event, venueBooking, navigate, loadAvailableResources]);

  const handleResourceToggle = (resource) => {
    setSelectedResources(prev => {
      const existing = prev.find(r => r.resource.id === resource.id);
      if (existing) {
        // Remove from selection
        return prev.filter(r => r.resource.id !== resource.id);
      } else {
        // Add to selection with default quantity 1
        return [...prev, { resource, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (resourceId, newQuantity) => {
    setSelectedResources(prev =>
      prev.map(item =>
        item.resource.id === resourceId
          ? { ...item, quantity: parseInt(newQuantity) || 1 }
          : item
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedResources.length === 0) {
      alert('Please select at least one resource');
      return;
    }

    // Validate quantities
    for (const item of selectedResources) {
      if (item.quantity < 1) {
        alert(`Quantity for ${item.resource.name} must be at least 1`);
        return;
      }
      if (item.quantity > item.resource.availableQuantity) {
        alert(`Only ${item.resource.availableQuantity} ${item.resource.unit} of ${item.resource.name} available`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const packageData = {
        event_id: event.id,
        venue_booking_id: venueBooking.id,
        resources: selectedResources.map(item => ({
          resource_id: item.resource.id,
          requested_quantity: item.quantity
        })),
        usage_start_datetime: venueBooking.approved_start_datetime || venueBooking.requested_start_datetime,
        usage_end_datetime: venueBooking.approved_end_datetime || venueBooking.requested_end_datetime,
        setup_instructions: setupInstructions || null,
      };

      await resourceRequestService.createPackage(packageData);

      // Show success message and navigate back to my events
      navigate('/my-events', {
        state: { message: 'Resource package submitted successfully!' }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit resource package');
      console.error('Submit request error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      AV: 'Audio/Visual',
      FURN: 'Furniture',
      IT: 'IT Equipment',
      CATER: 'Catering',
      OTHER: 'Other',
      // Legacy support for old codes
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
              <option value="AV">Audio/Visual</option>
              <option value="FURN">Furniture</option>
              <option value="IT">IT Equipment</option>
              <option value="CATER">Catering</option>
              <option value="OTHER">Other</option>
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
              {resources.map((resource) => {
                const isSelected = selectedResources.some(r => r.resource.id === resource.id);
                return (
                  <div
                    key={resource.id}
                    className={`resource-card ${isSelected ? 'selected' : ''} ${resource.availableQuantity === 0 ? 'unavailable' : ''}`}
                    onClick={() => resource.availableQuantity > 0 && handleResourceToggle(resource)}
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
                    {isSelected && (
                      <div className="selected-badge">✓ Selected</div>
                    )}
                    {resource.availableQuantity === 0 && (
                      <div className="unavailable-badge">Unavailable</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Request Form Section */}
        {selectedResources.length > 0 && (
          <div className="request-form-section">
            <h2>Request Details</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Selected Resources ({selectedResources.length})</label>
                <div className="selected-resources-list">
                  {selectedResources.map((item, index) => (
                    <div key={item.resource.id} className="selected-resource-item">
                      <div className="resource-item-header">
                        <span className="resource-number">{index + 1}.</span>
                        <span className="resource-name">{item.resource.name}</span>
                        <button
                          type="button"
                          className="remove-resource-btn"
                          onClick={() => handleResourceToggle(item.resource)}
                          title="Remove from selection"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="resource-item-quantity">
                        <label htmlFor={`qty-${item.resource.id}`}>Quantity:</label>
                        <input
                          type="number"
                          id={`qty-${item.resource.id}`}
                          min="1"
                          max={item.resource.availableQuantity}
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.resource.id, e.target.value)}
                        />
                        <span className="unit-label">
                          {typeof item.resource.unit === 'object' 
                            ? item.resource.unit?.name || item.resource.unit?.code || 'units' 
                            : item.resource.unit || 'units'}
                        </span>
                        <span className="available-info">
                          (Max: {item.resource.availableQuantity})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Usage Period (Locked to Venue Booking)</label>
                <input
                  type="text"
                  value={`${formatDateTime(venueBooking.approved_start_datetime || venueBooking.requested_start_datetime)} - ${formatDateTime(venueBooking.approved_end_datetime || venueBooking.requested_end_datetime)}`}
                  readOnly
                  className="readonly-field"
                />
                <small style={{ display: 'block', marginTop: '5px', color: '#667eea', fontStyle: 'italic' }}>
                  ℹ️ Resource usage time automatically includes setup and teardown periods from your venue booking
                </small>
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
