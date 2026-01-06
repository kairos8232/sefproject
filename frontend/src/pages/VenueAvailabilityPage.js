import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBlockedSlots, createBlock, updateBlock, deleteBlock } from '../services/venueAvailabilityService';
import axios from 'axios';
import './VenueAvailabilityPage.css';

function VenueAvailabilityPage() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    venue_id: '',
    blocked_start_datetime: '',
    blocked_end_datetime: '',
    reason: ''
  });

  const loadVenues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/venues', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setVenues(response.data.venues);
      }
    } catch (err) {
      console.error('Error loading venues:', err);
    }
  };

  const loadBlocks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getBlockedSlots();
      setBlocks(response.blocks || []);
    } catch (err) {
      console.error('Error loading blocks:', err);
      setError(err.response?.data?.error || 'Failed to load blocked time slots');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
    loadBlocks();
  }, [loadBlocks]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingBlock) {
        await updateBlock(editingBlock.id, formData);
        setSuccess('Time slot updated successfully');
      } else {
        await createBlock(formData);
        setSuccess('Time slot blocked successfully');
      }
      
      // Reset form
      setFormData({
        venue_id: '',
        blocked_start_datetime: '',
        blocked_end_datetime: '',
        reason: ''
      });
      setShowForm(false);
      setEditingBlock(null);
      loadBlocks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save blocked time slot');
    }
  };

  const handleEdit = (block) => {
    setEditingBlock(block);
    setFormData({
      venue_id: block.venue_id,
      blocked_start_datetime: block.blocked_start_datetime,
      blocked_end_datetime: block.blocked_end_datetime,
      reason: block.reason || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (blockId) => {
    if (!window.confirm('Are you sure you want to remove this blocked time slot?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      await deleteBlock(blockId);
      setSuccess('Blocked time slot removed successfully');
      loadBlocks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove blocked time slot');
    }
  };

  const handleCancel = () => {
    setFormData({
      venue_id: '',
      blocked_start_datetime: '',
      blocked_end_datetime: '',
      reason: ''
    });
    setShowForm(false);
    setEditingBlock(null);
    setError('');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVenueName = (venueId) => {
    const venue = venues.find(v => v.id === venueId);
    return venue ? `${venue.name} (${venue.code})` : 'Unknown Venue';
  };

  // Group blocks by venue
  const blocksByVenue = blocks.reduce((acc, block) => {
    const venueId = block.venue_id;
    if (!acc[venueId]) {
      acc[venueId] = [];
    }
    acc[venueId].push(block);
    return acc;
  }, {});

  return (
    <div className="venue-availability-page">
      <div className="page-header">
        <div>
          <h1>🔒 Venue Availability Management</h1>
          <p>Block and unblock time slots for your faculty's venues</p>
        </div>
        <button onClick={() => navigate('/home')} className="back-button">
          ← Back to Home
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Add Block Button */}
      {!showForm && (
        <div className="action-bar">
          <button onClick={() => setShowForm(true)} className="btn-add">
            + Block Time Slot
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="block-form-card">
          <h2>{editingBlock ? 'Edit Blocked Time Slot' : 'Block New Time Slot'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Venue *</label>
                <select
                  value={formData.venue_id}
                  onChange={(e) => handleInputChange('venue_id', e.target.value)}
                  required
                  disabled={editingBlock}
                >
                  <option value="">Select a venue</option>
                  {venues.map(venue => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} ({venue.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.blocked_start_datetime}
                  onChange={(e) => handleInputChange('blocked_start_datetime', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.blocked_end_datetime}
                  onChange={(e) => handleInputChange('blocked_end_datetime', e.target.value)}
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Reason (Optional)</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="E.g., Maintenance, Faculty event, etc."
                  rows="3"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingBlock ? 'Update Block' : 'Block Time Slot'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-cancel">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading">Loading blocked time slots...</div>
      ) : (
        <>
          {/* Blocked Slots List */}
          {blocks.length === 0 ? (
            <div className="no-data">
              <p>No blocked time slots found.</p>
              <p>Click "Block Time Slot" to create one.</p>
            </div>
          ) : (
            <div className="venues-section">
              {Object.entries(blocksByVenue).map(([venueId, venueBlocks]) => (
                <div key={venueId} className="venue-card">
                  <h3>{getVenueName(venueId)}</h3>
                  <div className="blocks-list">
                    {venueBlocks.map(block => (
                      <div key={block.id} className="block-item">
                        <div className="block-info">
                          <div className="block-time">
                            <strong>From:</strong> {formatDateTime(block.blocked_start_datetime)}
                            <br />
                            <strong>To:</strong> {formatDateTime(block.blocked_end_datetime)}
                          </div>
                          {block.reason && (
                            <div className="block-reason">
                              <strong>Reason:</strong> {block.reason}
                            </div>
                          )}
                          <div className="block-meta">
                            <small>Created on {formatDateTime(block.created_at)}</small>
                          </div>
                        </div>
                        <div className="block-actions">
                          <button onClick={() => handleEdit(block)} className="btn-edit">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(block.id)} className="btn-delete">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default VenueAvailabilityPage;
