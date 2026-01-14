import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import facultyService from '../services/facultyService';
import { useToast } from '../contexts/ToastContext';
import './FacultiesPage.css';

const FacultiesPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    status: 'active',
    search: ''
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    loadData();
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
        showError('Access denied. Only administrators can manage faculties.');
        setLoading(false);
        return;
      }

      const data = await facultyService.getAllFaculties(filters);
      setFaculties(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading faculties:', err);
      showError(err.response?.data?.message || 'Failed to load faculties');
      setLoading(false);
    }
  };

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      await facultyService.createFaculty(formData);
      showSuccess('Faculty created successfully!');
      setShowCreateModal(false);
      setFormData({ code: '', name: '', description: '' });
      loadData();
    } catch (err) {
      console.error('Error creating faculty:', err);
      showError(err.response?.data?.message || 'Failed to create faculty');
    }
  };

  const handleEditClick = (faculty) => {
    setSelectedFaculty(faculty);
    setFormData({
      code: faculty.code,
      name: faculty.name,
      description: faculty.description || ''
    });
    setShowEditModal(true);
  };

  const handleEditFaculty = async (e) => {
    e.preventDefault();
    try {
      await facultyService.updateFaculty(selectedFaculty.id, formData);
      showSuccess('Faculty updated successfully!');
      setShowEditModal(false);
      setSelectedFaculty(null);
      setFormData({ code: '', name: '', description: '' });
      loadData();
    } catch (err) {
      console.error('Error updating faculty:', err);
      showError(err.response?.data?.message || 'Failed to update faculty');
    }
  };

  const handleStatusToggle = async (faculty) => {
    try {
      const newStatus = faculty.status === 'active' ? 'inactive' : 'active';
      await facultyService.updateFacultyStatus(faculty.id, newStatus);
      showSuccess(`Faculty ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      showError(err.response?.data?.message || 'Failed to update faculty status');
    }
  };

  if (loading) {
    return <div className="faculties-container"><p>Loading faculties...</p></div>;
  }

  return (
    <div className="faculties-container">
      <div className="faculties-header">
        <div>
          <h1>Manage Faculties</h1>
          <p>Create and manage faculty records</p>
        </div>
        <div className="header-actions">
          <button className="back-button" onClick={() => navigate('/home')}>
            ← Back
          </button>
          <button className="fp-btn-create" onClick={() => setShowCreateModal(true)}>
            ➕ Create Faculty
          </button>
        </div>
      </div>

      <div className="fp-faculties-filters">
        <div className="fp-filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
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

      <div className="faculties-table-container">
        <table className="faculties-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {faculties.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No faculties found</td>
              </tr>
            ) : (
              faculties.map((faculty) => (
                <tr key={faculty.id}>
                  <td><strong>{faculty.code}</strong></td>
                  <td>{faculty.name}</td>
                  <td>{faculty.description || '-'}</td>
                  <td>
                    <span className={`fp-status-badge fp-status-${faculty.status}`}>
                      {faculty.status}
                    </span>
                  </td>
                  <td>
                    <div className="fp-action-buttons">
                      <button
                        className="fp-btn-edit"
                        onClick={() => handleEditClick(faculty)}
                        title="Edit faculty"
                      >
                        ✏️
                      </button>
                      <button
                        className={`fp-btn-status fp-${faculty.status === 'active' ? 'deactivate' : 'activate'}`}
                        onClick={() => handleStatusToggle(faculty)}
                        title={faculty.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {faculty.status === 'active' ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Faculty Modal */}
      {showCreateModal && (
        <div className="fp-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="fp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Faculty</h2>
            <form onSubmit={handleCreateFaculty}>
              <div className="fp-form-group">
                <label>Faculty Code * (e.g., FCI, FOM, FOB)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength="10"
                  placeholder="FCI"
                  pattern="[A-Z0-9]{2,10}"
                  title="2-10 uppercase alphanumeric characters"
                />
              </div>

              <div className="fp-form-group">
                <label>Faculty Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Faculty of Computing and Informatics"
                />
              </div>

              <div className="fp-form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Optional description..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
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
      {showEditModal && selectedFaculty && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Faculty</h2>
            <form onSubmit={handleEditFaculty}>
              <div className="form-group">
                <label>Faculty Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="fp-modal-actions">
                <button type="button" className="fp-btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="fp-btn-submit">
                  Update Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultiesPage;
