import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import systemSettingService from '../services/systemSettingService';
import { formatDateTime } from '../utils/dateUtils';
import './SystemConfigurationPage.css';

const SystemConfigurationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState([]);
  const [formData, setFormData] = useState({
    min_advance_booking_days: 3,
    max_advance_booking_days: 30
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadSettings = useCallback(async () => {
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
        setError('Access denied. Only administrators can configure system settings.');
        setLoading(false);
        return;
      }

      const data = await systemSettingService.getAllSettings();
      setSettings(data);

      // Populate form data
      const minSetting = data.find(s => s.setting_key === 'min_advance_booking_days');
      const maxSetting = data.find(s => s.setting_key === 'max_advance_booking_days');

      if (minSetting) {
        setFormData(prev => ({ ...prev, min_advance_booking_days: Number(minSetting.setting_value) }));
        if (minSetting.updated_at) {
          setLastUpdated({
            timestamp: minSetting.updated_at,
            updater: minSetting.updater
          });
        }
      }
      if (maxSetting) {
        setFormData(prev => ({ ...prev, max_advance_booking_days: Number(maxSetting.setting_value) }));
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err.response?.data?.error || 'Failed to load system settings');
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      // Client-side validation
      const minDays = Number(formData.min_advance_booking_days);
      const maxDays = Number(formData.max_advance_booking_days);

      if (isNaN(minDays) || isNaN(maxDays)) {
        setError('Please enter valid numbers for booking days');
        return;
      }

      if (minDays < 0 || maxDays < 0) {
        setError('Booking days cannot be negative');
        return;
      }

      if (minDays >= maxDays) {
        setError('Minimum advance booking days must be less than maximum');
        return;
      }

      await systemSettingService.updateSettings(formData);
      setSuccess('System settings updated successfully!');
      loadSettings(); // Reload to get updated timestamp
    } catch (err) {
      console.error('Error updating settings:', err);
      setError(err.response?.data?.error || 'Failed to update system settings');
    }
  };

  const handleReset = () => {
    const minSetting = settings.find(s => s.setting_key === 'min_advance_booking_days');
    const maxSetting = settings.find(s => s.setting_key === 'max_advance_booking_days');

    setFormData({
      min_advance_booking_days: minSetting ? Number(minSetting.setting_value) : 3,
      max_advance_booking_days: maxSetting ? Number(maxSetting.setting_value) : 30
    });
    setError('');
    setSuccess('');
  };

  if (loading) {
    return <div className="system-config-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="system-config-container">
      <div className="page-header">
        <div>
          <h1>⚙️ System Configuration</h1>
          <p>Configure system-wide booking rules and settings</p>
        </div>
        <button className="back-button" onClick={() => navigate('/home')}>
          Back to Home
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="config-content">
        <div className="config-section">
          <div className="section-header">
            <h2>📅 Booking Rules</h2>
            <p className="section-description">
              Configure advance booking requirements for events, venues, and resources
            </p>
          </div>

          <form onSubmit={handleSubmit} className="config-form">
            <div className="form-row">
              <div className="form-group">
                <label>
                  Minimum Advance Booking Days *
                  <span className="label-hint">Minimum notice required to book a venue</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_advance_booking_days}
                  onChange={(e) => setFormData({ ...formData, min_advance_booking_days: e.target.value })}
                  required
                />
                <small className="field-description">
                  Users must book at least {formData.min_advance_booking_days} day(s) in advance
                </small>
              </div>

              <div className="form-group">
                <label>
                  Maximum Advance Booking Days *
                  <span className="label-hint">How far ahead bookings can be made</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_advance_booking_days}
                  onChange={(e) => setFormData({ ...formData, max_advance_booking_days: e.target.value })}
                  required
                />
                <small className="field-description">
                  Users can book up to {formData.max_advance_booking_days} day(s) in advance
                </small>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-reset" onClick={handleReset}>
                Reset to Current
              </button>
              <button type="submit" className="btn-save">
                💾 Save Settings
              </button>
            </div>
          </form>

          {lastUpdated && (
            <div className="last-updated">
              <p>
                <strong>Last Updated:</strong> {formatDateTime(lastUpdated.timestamp)}
                {lastUpdated.updater && ` by ${lastUpdated.updater.name}`}
              </p>
            </div>
          )}
        </div>

        <div className="info-section">
          <h3>ℹ️ Important Notes</h3>
          <p><strong>These settings affect 3 key areas:</strong></p>
          <ul>
            <li><strong>Event Creation</strong> - Events must be scheduled within these advance booking limits</li>
            <li><strong>Venue Bookings</strong> - Venue reservations must comply with these day restrictions</li>
            <li><strong>Resource Requests</strong> - Resource requests must follow these advance notice rules</li>
          </ul>
          <p><strong>Additional rules:</strong></p>
          <ul>
            <li>Existing bookings/events will not be affected by these changes</li>
            <li>The minimum advance booking days must be less than the maximum</li>
            <li>Both values must be greater than 0</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigurationPage;
