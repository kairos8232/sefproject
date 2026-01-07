import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../services/userService';
import facultyService from '../services/facultyService';
import './UserManagementPage.css';

function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: ''
  });

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    faculty_id: ''
  });

  const [originalRole, setOriginalRole] = useState('');

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get current user from token
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);

        // Check if user is admin
        if (payload.role !== 'administrator') {
          setError('Access denied. Only administrators can manage users.');
          setLoading(false);
          return;
        }
      }

      // Load users and faculties
      const [usersData, facultiesData] = await Promise.all([
        userService.getAllUsers(filters),
        facultyService.getAllFaculties()
      ]);

      setUsers(usersData);
      setFaculties(facultiesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      // Validate faculty requirement
      if ((formData.role === 'student' || formData.role === 'faculty_manager') && !formData.faculty_id) {
        setError('Faculty is required for students and faculty managers.');
        return;
      }

      await userService.createUser(formData);
      setSuccess('User created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', role: 'student', faculty_id: '' });
      loadData();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      // Validate faculty requirement for current role
      if ((formData.role === 'student' || formData.role === 'faculty_manager') && !formData.faculty_id) {
        setError('Faculty is required for students and faculty managers.');
        return;
      }

      // Update basic info first
      await userService.updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        faculty_id: formData.faculty_id || null
      });

      // If role changed, update role separately
      if (formData.role !== originalRole) {
        await userService.updateUserRole(selectedUser.id, formData.role, formData.faculty_id || null);
        setSuccess('User updated successfully! Role changed.');
      } else {
        setSuccess('User updated successfully!');
      }

      setShowEditModal(false);
      setSelectedUser(null);
      loadData();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleStatusToggle = async (user) => {
    try {
      setError('');
      setSuccess('');

      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await userService.updateUserStatus(user.id, newStatus);
      setSuccess(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (passwordData.password !== passwordData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (passwordData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      await userService.resetPassword(selectedUser.id, passwordData.password);
      setSuccess('Password reset successfully!');
      setShowPasswordModal(false);
      setPasswordData({ password: '', confirmPassword: '' });
      setSelectedUser(null);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setOriginalRole(user.role);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      faculty_id: user.faculty_id || ''
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordData({ password: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'administrator': return 'role-badge admin';
      case 'event_organizer': return 'role-badge organizer';
      case 'faculty_manager': return 'role-badge faculty';
      case 'student': return 'role-badge student';
      default: return 'role-badge';
    }
  };

  const getStatusBadgeClass = (status) => {
    return status === 'active' ? 'status-badge active' : 'status-badge inactive';
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'administrator': return 'Administrator';
      case 'event_organizer': return 'Event Organizer';
      case 'faculty_manager': return 'Faculty Manager';
      case 'student': return 'Student';
      default: return role;
    }
  };

  if (loading) {
    return <div className="user-management-container"><div className="loading">Loading...</div></div>;
  }

  if (!currentUser || currentUser.role !== 'administrator') {
    return (
      <div className="user-management-container">
        <div className="error-message">Access denied. Only administrators can manage users.</div>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="page-header">
        <div>
          <h1>👥 User Management</h1>
          <p>Create and manage user accounts and roles</p>
        </div>
        <div className="header-actions">
          <button className="create-user-button" onClick={() => setShowCreateModal(true)}>
            ➕ Create New User
          </button>
          <button className="back-button" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Filters */}
      <div className="filters-section">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by name or email..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        
        <select
          className="filter-select"
          value={filters.role}
          onChange={(e) => handleFilterChange('role', e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="administrator">Administrator</option>
          <option value="event_organizer">Event Organizer</option>
          <option value="faculty_manager">Faculty Manager</option>
          <option value="student">Student</option>
        </select>

        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Faculty</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={getRoleBadgeClass(user.role)}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </td>
                  <td>{user.faculty ? user.faculty.name : '-'}</td>
                  <td>
                    <span className={getStatusBadgeClass(user.status)}>
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-edit"
                        onClick={() => openEditModal(user)}
                        title="Edit user"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-password"
                        onClick={() => openPasswordModal(user)}
                        title="Reset password"
                      >
                        🔑
                      </button>
                      <button
                        className={`btn-status ${user.status === 'active' ? 'deactivate' : 'activate'}`}
                        onClick={() => handleStatusToggle(user)}
                        disabled={user.id === currentUser.id || user.role === 'administrator'}
                        title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {user.status === 'active' ? '🚫' : '✅'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value="student">Student</option>
                  <option value="event_organizer">Event Organizer</option>
                  <option value="administrator">Administrator</option>
                  <option value="faculty_manager">Faculty Manager</option>
                </select>
              </div>

              {(formData.role === 'student' || formData.role === 'faculty_manager') && (
                <div className="form-group">
                  <label>Faculty</label>
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
              )}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit User</h2>
            <form onSubmit={handleEditUser}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                  disabled={selectedUser.id === currentUser.id}
                >
                  <option value="student">Student</option>
                  <option value="event_organizer">Event Organizer</option>
                  <option value="administrator">Administrator</option>
                  <option value="faculty_manager">Faculty Manager</option>
                </select>
                {selectedUser.id === currentUser.id && (
                  <small className="form-hint">You cannot change your own role</small>
                )}
              </div>

              {(formData.role === 'student' || formData.role === 'faculty_manager') && (
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
              )}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reset Password for {selectedUser.name}</h2>
            <form onSubmit={handleResetPassword}>
              <div className="form-group">
                <label>New Password *</label>
                <input
                  type="password"
                  value={passwordData.password}
                  onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength="6"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementPage;
