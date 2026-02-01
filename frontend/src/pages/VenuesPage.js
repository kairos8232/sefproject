import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import venueService from '../services/venueService';
import facultyService from '../services/facultyService';
import { useToast } from '../contexts/ToastContext';
import './VenuesPage.css';

const VenuesPage = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [venues, setVenues] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: 'active',
    facultyId: '',
    search: ''
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);

  const [formData, setFormData] = useState({
    faculty_id: '',
    code: '',
    name: '',
    location: '',
    capacity: ''
  });

  useEffect(() => {
    loadData();
    loadFaculties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user from token
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Decode token to check role
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'administrator') {
        showError('Access denied. Only administrators can manage venues.');
        setLoading(false);
        return;
      }

      const data = await venueService.getAllVenues(filters);
      setVenues(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading venues:', err);
      showError(err.response?.data?.message || 'Failed to load venues');
      setLoading(false);
    }
  };

  const loadFaculties = async () => {
    try {
      const data = await facultyService.getAllFaculties({ status: 'active' });
      setFaculties(data);
    } catch (err) {
      console.error('Error loading faculties:', err);
    }
  };

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    try {
      await venueService.createVenue(formData);
      showSuccess('Venue created successfully!');
      setShowCreateModal(false);
      setFormData({ faculty_id: '', code: '', name: '', location: '', capacity: '' });
      loadData();
    } catch (err) {
      console.error('Error creating venue:', err);
      showError(err.response?.data?.message || 'Failed to create venue');
    }
  };

  const handleEditClick = (venue) => {
    setSelectedVenue(venue);
    setFormData({
      faculty_id: venue.faculty?.id || venue.faculty_id,
      code: venue.code,
      name: venue.name,
      location: venue.location || '',
      capacity: venue.capacity || ''
    });
    setShowEditModal(true);
  };

  const handleEditVenue = async (e) => {
    e.preventDefault();
    try {
      await venueService.updateVenue(selectedVenue.id, formData);
      showSuccess('Venue updated successfully!');
      setShowEditModal(false);
      setSelectedVenue(null);
      setFormData({ faculty_id: '', code: '', name: '', location: '', capacity: '' });
      loadData();
    } catch (err) {
      console.error('Error updating venue:', err);
      showError(err.response?.data?.message || 'Failed to update venue');
    }
  };

  const handleStatusToggle = async (venue) => {
    try {
      const newStatus = venue.status === 'active' ? 'inactive' : 'active';
      await venueService.updateVenueStatus(venue.id, newStatus);
      showSuccess(`Venue ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      showError(err.response?.data?.message || 'Failed to update venue status');
    }
  };

  if (loading) {
    return <div className="venues-container"><p>Loading venues...</p></div>;
  }

  return (
    <div className="venues-container">
      <div className="venues-header">
        <div>
          <h1>Manage Venues</h1>
          <p>Create and manage campus venues</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/home')}>
            ← Back
          </button>
          <button className="btn-create" onClick={() => setShowCreateModal(true)}>
            + Create Venue
          </button>
        </div>
      </div>

      <div className="venues-filters">
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>Faculty</label>
          <select
            value={filters.facultyId}
            onChange={(e) => setFilters({ ...filters, facultyId: e.target.value })}
          >
            <option value="">All Faculties</option>
            {faculties.map(faculty => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name} ({faculty.code})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="venues-table-container">
        <table className="venues-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Faculty</th>
              <th>Location</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {venues.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>No venues found</td>
              </tr>
            ) : (
              venues.map((venue) => (
                <tr key={venue.id}>
                  <td><strong>{venue.code}</strong></td>
                  <td>{venue.name}</td>
                  <td>
                    {venue.faculty ? (
                      <span className="faculty-badge">
                        {venue.faculty.code}
                      </span>
                    ) : '-'}
                  </td>
                  <td>{venue.location || '-'}</td>
                  <td>{venue.capacity || '-'}</td>
                  <td>
                    <span className={`status-badge status-${venue.status}`}>
                      {venue.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => handleEditClick(venue)}
                        title="Edit venue"
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn-status ${venue.status === 'active' ? 'deactivate' : 'activate'}`}
                        onClick={() => handleStatusToggle(venue)}
                        title={venue.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {venue.status === 'active' ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Venue Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Venue</h2>
            <form onSubmit={handleCreateVenue}>
              <div className="form-group">
                <label>Faculty *</label>
                <select
                  value={formData.faculty_id}
                  onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
                  required
                >
                  <option value="">Select Faculty</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name} ({faculty.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Venue Code * (e.g., LT-FCI-01)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength="20"
                  placeholder="LT-FCI-01"
                  pattern="[A-Z0-9-]{2,20}"
                  title="2-20 uppercase alphanumeric characters (hyphens allowed)"
                />
              </div>

              <div className="form-group">
                <label>Venue Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Lecture Theatre 1"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Level 2, Block A"
                />
              </div>

              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  min="1"
                  placeholder="100"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Venue Modal */}
      {showEditModal && selectedVenue && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Venue</h2>
            <form onSubmit={handleEditVenue}>
              <div className="form-group">
                <label>Faculty *</label>
                <select
                  value={typeof formData.faculty_id === 'object' ? formData.faculty_id?.id || '' : formData.faculty_id || ''}
                  onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
                  required
                >
                  <option value="">Select Faculty</option>
                  {faculties.map(faculty => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name} ({faculty.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Venue Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength="20"
                  pattern="[A-Z0-9-]{2,20}"
                  title="2-20 uppercase alphanumeric characters (hyphens allowed)"
                />
              </div>

              <div className="form-group">
                <label>Venue Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  min="1"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Update Venue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenuesPage;
