import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import facultyService from '../services/facultyService';
import venueService from '../services/venueService';
import './FacultyVenueManagementPage.css';

const FacultyVenueManagementPage = () => {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    document.title = 'Faculty & Venue Management - CESMS';
  }, []);
  
  // Faculty state
  const [faculties, setFaculties] = useState([]);
  const [allFaculties, setAllFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [showCreateFacultyModal, setShowCreateFacultyModal] = useState(false);
  const [showEditFacultyModal, setShowEditFacultyModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  
  // Venue state
  const [venues, setVenues] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [showCreateVenueModal, setShowCreateVenueModal] = useState(false);
  const [showEditVenueModal, setShowEditVenueModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);
  
  // Common state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [facultyFilters, setFacultyFilters] = useState({
    status: '',
    search: ''
  });
  
  const [venueFilters, setVenueFilters] = useState({
    status: '',
    search: ''
  });
  
  // Form data
  const [facultyFormData, setFacultyFormData] = useState({
    code: '',
    name: '',
    description: ''
  });
  
  const [venueFormData, setVenueFormData] = useState({
    faculty_id: '',
    code: '',
    name: '',
    location: '',
    capacity: ''
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter faculties client-side when search changes
  useEffect(() => {
    const filtered = allFaculties.filter(faculty =>
      (facultyFilters.status === '' || faculty.status === facultyFilters.status) &&
      (facultyFilters.search === '' ||
        faculty.name.toLowerCase().includes(facultyFilters.search.toLowerCase()) ||
        faculty.code.toLowerCase().includes(facultyFilters.search.toLowerCase()))
    );
    setFaculties(filtered);
  }, [allFaculties, facultyFilters]);

  // Filter venues client-side when faculty selected
  useEffect(() => {
    console.log('Filtering venues - selectedFacultyId:', selectedFacultyId);
    console.log('All venues:', allVenues.length, allVenues);
    
    if (selectedFacultyId) {
      const filtered = allVenues.filter(venue => 
        venue.faculty_id === selectedFacultyId &&
        (venueFilters.status === '' || venue.status === venueFilters.status) &&
        (venueFilters.search === '' || 
          venue.name.toLowerCase().includes(venueFilters.search.toLowerCase()) ||
          venue.code.toLowerCase().includes(venueFilters.search.toLowerCase()))
      );
      console.log('Filtered venues for faculty', selectedFacultyId, ':', filtered.length, filtered);
      setVenues(filtered);
    } else {
      const filtered = allVenues.filter(venue => 
        (venueFilters.status === '' || venue.status === venueFilters.status) &&
        (venueFilters.search === '' || 
          venue.name.toLowerCase().includes(venueFilters.search.toLowerCase()) ||
          venue.code.toLowerCase().includes(venueFilters.search.toLowerCase()))
      );
      console.log('Showing all venues (no faculty filter):', filtered.length);
      setVenues(filtered);
    }
  }, [selectedFacultyId, allVenues, venueFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'administrator') {
        setError('Access denied. Only administrators can manage faculties and venues.');
        setLoading(false);
        return;
      }
      
      // Load all faculties and venues for client-side filtering
      const [facultiesResponse, venuesResponse] = await Promise.all([
        facultyService.getAllFaculties({}),
        venueService.getAllVenues({})
      ]);
      
      const facultiesData = facultiesResponse.faculties || [];
      const venuesData = venuesResponse.venues || [];
      
      console.log('Loaded faculties:', facultiesData.length, facultiesData);
      console.log('Loaded venues:', venuesData.length, venuesData);
      
      setAllFaculties(facultiesData);
      setAllVenues(venuesData);
      
      // Apply initial filter
      if (selectedFacultyId) {
        setVenues(venuesData.filter(v => v.faculty_id === selectedFacultyId));
      } else {
        setVenues(venuesData);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      setLoading(false);
    }
  };

  // Faculty handlers
  const handleFacultySelect = (facultyId) => {
    setSelectedFacultyId(facultyId === selectedFacultyId ? null : facultyId);
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await facultyService.createFaculty(facultyFormData);
      setSuccess('Faculty created successfully!');
      setShowCreateFacultyModal(false);
      setFacultyFormData({ code: '', name: '', description: '' });
      loadData();
    } catch (err) {
      console.error('Error creating faculty:', err);
      setError(err.response?.data?.message || 'Failed to create faculty');
    }
  };

  const handleEditFacultyClick = (faculty) => {
    setSelectedFaculty(faculty);
    setFacultyFormData({
      code: faculty.code,
      name: faculty.name,
      description: faculty.description || ''
    });
    setShowEditFacultyModal(true);
  };

  const handleEditFaculty = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await facultyService.updateFaculty(selectedFaculty.id, facultyFormData);
      setSuccess('Faculty updated successfully!');
      setShowEditFacultyModal(false);
      setSelectedFaculty(null);
      setFacultyFormData({ code: '', name: '', description: '' });
      loadData();
    } catch (err) {
      console.error('Error updating faculty:', err);
      setError(err.response?.data?.message || 'Failed to update faculty');
    }
  };

  const handleFacultyStatusToggle = async (faculty) => {
    try {
      setError('');
      setSuccess('');
      const newStatus = faculty.status === 'active' ? 'inactive' : 'active';
      await facultyService.updateFacultyStatus(faculty.id, newStatus);
      setSuccess(`Faculty ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error updating faculty status:', err);
      setError(err.response?.data?.message || 'Failed to update faculty status');
    }
  };

  // Venue handlers
  const handleCreateVenue = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await venueService.createVenue(venueFormData);
      setSuccess('Venue created successfully!');
      setShowCreateVenueModal(false);
      setVenueFormData({ faculty_id: '', code: '', name: '', location: '', capacity: '' });
      loadData();
    } catch (err) {
      console.error('Error creating venue:', err);
      setError(err.response?.data?.message || 'Failed to create venue');
    }
  };

  const handleEditVenueClick = (venue) => {
    setSelectedVenue(venue);
    setVenueFormData({
      faculty_id: venue.faculty?.id || venue.faculty_id,
      code: venue.code,
      name: venue.name,
      location: venue.location || '',
      capacity: venue.capacity || ''
    });
    setShowEditVenueModal(true);
  };

  const handleEditVenue = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await venueService.updateVenue(selectedVenue.id, venueFormData);
      setSuccess('Venue updated successfully!');
      setShowEditVenueModal(false);
      setSelectedVenue(null);
      setVenueFormData({ faculty_id: '', code: '', name: '', location: '', capacity: '' });
      loadData();
    } catch (err) {
      console.error('Error updating venue:', err);
      setError(err.response?.data?.message || 'Failed to update venue');
    }
  };

  const handleVenueStatusToggle = async (venue) => {
    try {
      setError('');
      setSuccess('');
      const newStatus = venue.status === 'active' ? 'inactive' : 'active';
      await venueService.updateVenueStatus(venue.id, newStatus);
      setSuccess(`Venue ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error updating venue status:', err);
      setError(err.response?.data?.message || 'Failed to update venue status');
    }
  };

  if (loading) {
    return <div className="fvm-faculty-venue-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="fvm-faculty-venue-container">
      <div className="page-header">
        <div>
          <h1>🏛️ Faculty & Venue Management</h1>
          <p>Manage faculties and their campus venues</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="fvm-management-sections">
        {/* ======================================== */}
        {/* Faculties Section - LEFT SIDE */}
        {/* ======================================== */}
        <div className="fvm-management-section fvm-faculties-section">
          <div className="fvm-section-header">
            <div className="fvm-section-title">
              <h2>Faculties</h2>
              <span className="fvm-section-count">({faculties.length})</span>
            </div>
            <div className="header-actions">
              <button 
                className="fvm-btn fvm-btn-primary"
                onClick={() => setShowCreateFacultyModal(true)}
              >
                ➕ Create Faculty
              </button>
            </div>
          </div>

          <div className="fvm-section-filters">
            <input
              type="text"
              className="fvm-filter-input"
              placeholder="🔍 Search faculties..."
              value={facultyFilters.search}
              onChange={(e) => setFacultyFilters({ ...facultyFilters, search: e.target.value })}
            />
            <select
              className="fvm-filter-select"
              value={facultyFilters.status}
              onChange={(e) => setFacultyFilters({ ...facultyFilters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="faculty-cards">
            {faculties.length === 0 ? (
              <p className="no-data">No faculties found</p>
            ) : (
              faculties.map((faculty) => (
                <div
                  key={faculty.id}
                  className={`faculty-card ${selectedFacultyId === faculty.id ? 'selected' : ''}`}
                  onClick={() => handleFacultySelect(faculty.id)}
                >
                  <div className="faculty-card-header">
                    <span className="faculty-code">{faculty.code}</span>
                    <span className={`status-badge ${faculty.status}`}>
                      {faculty.status}
                    </span>
                  </div>
                  <h3 className="faculty-name">{faculty.name}</h3>
                  {faculty.description && (
                    <p className="faculty-description">{faculty.description}</p>
                  )}
                  <div className="faculty-footer">
                    <span className="venue-count">
                      {allVenues.filter(v => v.faculty_id === faculty.id).length} venues
                    </span>
                    <div className="faculty-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleEditFacultyClick(faculty)}
                        title="Edit faculty"
                      >
                        ✏️
                      </button>
                      <button
                        className={`btn-icon ${faculty.status === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
                        onClick={() => handleFacultyStatusToggle(faculty)}
                        title={faculty.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {faculty.status === 'active' ? '🚫' : '✅'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ======================================== */}
        {/* Venues Section - RIGHT SIDE */}
        {/* ======================================== */}
        <div className="fvm-management-section fvm-venues-section">
          <div className="fvm-section-header">
            <div className="fvm-section-title">
              <h2>Venues</h2>
              <span className="fvm-section-count">({venues.length})</span>
              {selectedFacultyId && (
                <span className="filter-indicator">
                  • Filtered by faculty
                </span>
              )}
            </div>
            <div className="header-actions">
              {selectedFacultyId && (
                <button 
                  className="fvm-btn fvm-btn-secondary"
                  onClick={() => setSelectedFacultyId(null)}
                >
                  Clear Filter
                </button>
              )}
              <button 
                className="fvm-btn fvm-btn-primary"
                onClick={() => {
                  if (selectedFacultyId) {
                    setVenueFormData({ ...venueFormData, faculty_id: selectedFacultyId });
                  }
                  setShowCreateVenueModal(true);
                }}
              >
                ➕ Create Venue
              </button>
            </div>
          </div>

          <div className="fvm-section-filters">
            <input
              type="text"
              className="fvm-filter-input"
              placeholder="🔍 Search venues..."
              value={venueFilters.search}
              onChange={(e) => setVenueFilters({ ...venueFilters, search: e.target.value })}
            />
            <select
              className="fvm-filter-select"
              value={venueFilters.status}
              onChange={(e) => setVenueFilters({ ...venueFilters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="venues-list">
            {venues.length === 0 ? (
              <p className="no-data">No venues found</p>
            ) : (
              <table className="data-table">
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
                  {venues.map((venue) => (
                    <tr key={venue.id}>
                      <td><code>{venue.code}</code></td>
                      <td>{venue.name}</td>
                      <td>
                        <span className="faculty-badge">
                          {venue.faculty?.code || '-'}
                        </span>
                      </td>
                      <td>{venue.location || '-'}</td>
                      <td>{venue.capacity || '-'}</td>
                      <td>
                        <span className={`status-badge ${venue.status}`}>
                          {venue.status}
                        </span>
                      </td>
                      <td>
                        <div className="fvm-action-buttons">
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => handleEditVenueClick(venue)}
                            title="Edit venue"
                          >
                            ✏️
                          </button>
                          <button
                            className={`btn-icon ${venue.status === 'active' ? 'btn-deactivate' : 'btn-activate'}`}
                            onClick={() => handleVenueStatusToggle(venue)}
                            title={venue.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {venue.status === 'active' ? '🚫' : '✅'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Faculty Modal */}
      {showCreateFacultyModal && (
        <div className="modal-overlay" onClick={() => setShowCreateFacultyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Faculty</h2>
            <form onSubmit={handleCreateFaculty}>
              <div className="form-group">
                <label>Faculty Code * (e.g., FCI, FOM, FOB)</label>
                <input
                  type="text"
                  value={facultyFormData.code}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength="10"
                  placeholder="FCI"
                  pattern="[A-Z0-9]{2,10}"
                  title="2-10 uppercase alphanumeric characters"
                />
              </div>

              <div className="form-group">
                <label>Faculty Name *</label>
                <input
                  type="text"
                  value={facultyFormData.name}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, name: e.target.value })}
                  required
                  placeholder="Faculty of Computing and Informatics"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={facultyFormData.description}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, description: e.target.value })}
                  rows="3"
                  placeholder="Optional description..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateFacultyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {showEditFacultyModal && selectedFaculty && (
        <div className="modal-overlay" onClick={() => setShowEditFacultyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Faculty</h2>
            <form onSubmit={handleEditFaculty}>
              <div className="form-group">
                <label>Faculty Code *</label>
                <input
                  type="text"
                  value={facultyFormData.code}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength="10"
                  pattern="[A-Z0-9]{2,10}"
                  title="2-10 uppercase alphanumeric characters"
                />
              </div>

              <div className="form-group">
                <label>Faculty Name *</label>
                <input
                  type="text"
                  value={facultyFormData.name}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={facultyFormData.description}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditFacultyModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Update Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Venue Modal */}
      {showCreateVenueModal && (
        <div className="modal-overlay" onClick={() => setShowCreateVenueModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Venue</h2>
            <form onSubmit={handleCreateVenue}>
              <div className="form-group">
                <label>Faculty *</label>
                <select
                  value={typeof venueFormData.faculty_id === 'object' ? venueFormData.faculty_id?.id || '' : venueFormData.faculty_id || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, faculty_id: e.target.value })}
                  required
                >
                  <option value="">Select Faculty</option>
                  {faculties.filter(f => f.status === 'active').map(faculty => (
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
                  value={venueFormData.code}
                  onChange={(e) => setVenueFormData({ ...venueFormData, code: e.target.value.toUpperCase() })}
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
                  value={venueFormData.name}
                  onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                  required
                  placeholder="Lecture Theatre 1"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={venueFormData.location}
                  onChange={(e) => setVenueFormData({ ...venueFormData, location: e.target.value })}
                  placeholder="Level 2, Block A"
                />
              </div>

              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  value={venueFormData.capacity}
                  onChange={(e) => setVenueFormData({ ...venueFormData, capacity: e.target.value })}
                  min="1"
                  placeholder="100"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateVenueModal(false)}>
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
      {showEditVenueModal && selectedVenue && (
        <div className="modal-overlay" onClick={() => setShowEditVenueModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Venue</h2>
            <form onSubmit={handleEditVenue}>
              <div className="form-group">
                <label>Faculty *</label>
                <select
                  value={typeof venueFormData.faculty_id === 'object' ? venueFormData.faculty_id?.id || '' : venueFormData.faculty_id || ''}
                  onChange={(e) => setVenueFormData({ ...venueFormData, faculty_id: e.target.value })}
                  required
                >
                  <option value="">Select Faculty</option>
                  {faculties.filter(f => f.status === 'active').map(faculty => (
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
                  value={venueFormData.code}
                  onChange={(e) => setVenueFormData({ ...venueFormData, code: e.target.value.toUpperCase() })}
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
                  value={venueFormData.name}
                  onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={venueFormData.location}
                  onChange={(e) => setVenueFormData({ ...venueFormData, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="number"
                  value={venueFormData.capacity}
                  onChange={(e) => setVenueFormData({ ...venueFormData, capacity: e.target.value })}
                  min="1"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditVenueModal(false)}>
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

export default FacultyVenueManagementPage;
