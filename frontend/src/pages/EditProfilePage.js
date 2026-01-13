import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import './EditProfilePage.css';

function EditProfilePage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch user data from API to get fresh data including faculty
      const response = await authFetch('/auth/me');
      
      if (!response.ok) {
        throw new Error('Failed to load user data');
      }
      
      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      showError('Failed to load user data');
      console.error('Load user error:', err);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    document.title = 'Edit Profile - CESMS';
    loadUserData();
  }, [loadUserData]);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        showError('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        showError('New password must be at least 6 characters');
        return;
      }

      if (passwordData.newPassword === passwordData.currentPassword) {
        showError('New password must be different from current password');
        return;
      }

      const response = await authFetch('/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      showSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      showError(err.message || 'Failed to change password');
    }
  };

  const getRoleDisplayName = (role) => {
    const roleMap = {
      administrator: 'Administrator',
      event_organizer: 'Event Organizer',
      faculty_manager: 'Faculty Manager',
      student: 'Student'
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <div className="epp-container">
        <div className="epp-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="epp-container">
      <div className="epp-layout">
        {/* Left Panel - User Profile (Same as HomePage) */}
        <div className="epp-user-panel">
          <div className="epp-user-card">
            <div className="epp-user-avatar">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="epp-user-info">
              <h2>{user?.name}</h2>
              <div className="epp-user-role">
                {user?.faculty ? `${user.faculty.code} ${getRoleDisplayName(user?.role).toUpperCase()}` : getRoleDisplayName(user?.role).toUpperCase()}
              </div>
              <div className="epp-user-email">{user?.staff_id || 'N/A'}</div>
            </div> 
          </div>
        </div>

        {/* Right Panel - Edit Forms */}
        <div className="epp-content-panel">
          <div className="epp-header">
            <div>
              <h1>✏️ Edit Profile</h1>
              <p>Update your account information and password</p>
            </div>
            <button onClick={() => navigate('/home')} className="epp-back-button">
              Back to Home
            </button>
          </div>

          {/* Success and error messages now shown via toast */}

          <div className="epp-content epp-two-column">
            {/* Profile Information */}
            <div className="epp-section">
              <h2>📋 Profile Information</h2>
              <form>
                <div className="epp-form-group">
                  <label>ID</label>
                  <input
                    type="text"
                    value={user?.staff_id || '-'}
                    disabled
                    className="epp-disabled"
                  />
                </div>

                <div className="epp-form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                    className="epp-disabled"
                  />
                </div>

                <div className="epp-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="epp-disabled"
                  />
                </div>

                <div className="epp-form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    value={getRoleDisplayName(user?.role)}
                    disabled
                    className="epp-disabled"
                  />
                </div>

                {user?.faculty && (
                  <div className="epp-form-group">
                    <label>Faculty</label>
                    <input
                      type="text"
                      value={`${user.faculty.name} (${user.faculty.code})`}
                      disabled
                      className="epp-disabled"
                    />
                  </div>
                )}

                <div className="epp-info-text">
                  <p>Your profile information is managed by administrators. To request changes, please contact your system administrator.</p>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="epp-section">
              <h2>🔒 Change Password</h2>
              <form onSubmit={handleChangePassword}>
                <div className="epp-form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="epp-form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength="6"
                  />
                  <span className="epp-helper-text">Must be at least 6 characters</span>
                </div>

                <div className="epp-form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="epp-form-actions">
                  <button type="submit" className="epp-btn-primary">
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditProfilePage;
