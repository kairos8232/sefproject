import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './RecordAttendancePage.css';

const RecordAttendancePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track attendance state for each participant
  const [attendanceMap, setAttendanceMap] = useState({});

  const loadEventAndParticipants = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('[RecordAttendancePage] Loading event:', eventId);

      // Load event details
      const eventResponse = await fetch(`http://localhost:5001/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[RecordAttendancePage] Event response status:', eventResponse.status);

      if (!eventResponse.ok) {
        const eventData = await eventResponse.json();
        throw new Error(eventData.error || 'Failed to load event');
      }

      const eventData = await eventResponse.json();
      console.log('[RecordAttendancePage] Event loaded:', eventData.event?.event_name);
      setEvent(eventData.event);

      // Load participants
      const participantsUrl = `http://localhost:5001/api/participation/event/${eventId}/participants`;
      console.log('[RecordAttendancePage] Fetching participants from:', participantsUrl);
      
      const participantsResponse = await fetch(participantsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[RecordAttendancePage] Participants response status:', participantsResponse.status);

      if (!participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        console.error('[RecordAttendancePage] Participants error:', participantsData);
        throw new Error(participantsData.error || 'Failed to load participants');
      }

      const participantsData = await participantsResponse.json();
      console.log('[RecordAttendancePage] Participants loaded:', participantsData.participants?.length);
      setParticipants(participantsData.participants || []);

      // Initialize attendance map based on current status
      const initialAttendanceMap = {};
      (participantsData.participants || []).forEach(participant => {
        initialAttendanceMap[participant.id] = participant.status === 'attended';
      });
      setAttendanceMap(initialAttendanceMap);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    loadEventAndParticipants();
  }, [loadEventAndParticipants]);

  const handleCheckboxChange = (participationId) => {
    setAttendanceMap(prev => ({
      ...prev,
      [participationId]: !prev[participationId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = {};
    filteredParticipants.forEach(participant => {
      allSelected[participant.id] = true;
    });
    setAttendanceMap(prev => ({ ...prev, ...allSelected }));
  };

  const handleDeselectAll = () => {
    const allDeselected = {};
    filteredParticipants.forEach(participant => {
      allDeselected[participant.id] = false;
    });
    setAttendanceMap(prev => ({ ...prev, ...allDeselected }));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');

      // Prepare attendance updates
      const attendanceUpdates = Object.keys(attendanceMap).map(participationId => ({
        participationId,
        attended: attendanceMap[participationId]
      }));

      const response = await fetch(
        `http://localhost:5001/api/participation/event/${eventId}/record-attendance`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ attendanceUpdates })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save attendance');
      }

      setSuccess(`✅ Attendance recorded successfully for ${data.updatedCount} participant(s)!`);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter participants by search query
  const filteredParticipants = participants.filter(participant => {
    const searchLower = searchQuery.toLowerCase();
    return (
      participant.user?.name?.toLowerCase().includes(searchLower) ||
      participant.user?.email?.toLowerCase().includes(searchLower) ||
      participant.user?.role?.toLowerCase().includes(searchLower)
    );
  });

  const attendedCount = Object.values(attendanceMap).filter(attended => attended).length;
  const totalCount = participants.length;

  if (loading) {
    return (
      <div className="record-attendance-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="record-attendance-page">
        <div className="page-header">
          <div>
            <h1>Record Attendance</h1>
            <p>Mark participant attendance for your event</p>
          </div>
          <button onClick={() => navigate('/my-events')} className="back-button">
            ← Back to My Events
          </button>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="record-attendance-page">
      <div className="page-header">
        <div>
          <h1>📋 Record Attendance</h1>
          <p>Mark participant attendance for your event</p>
        </div>
        <button onClick={() => navigate('/my-events')} className="back-button">
          ← Back to My Events
        </button>
      </div>

      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Event Information */}
      {event && (
        <div className="event-info-section">
          <h2>{event.event_name}</h2>
          <div className="event-meta">
            <span>📅 {new Date(event.start_datetime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
            <span className={`status-badge status-${event.status}`}>{event.status}</span>
          </div>
        </div>
      )}

      {/* Attendance Summary */}
      <div className="attendance-summary">
        <div className="summary-item">
          <div className="summary-label">Total Registered</div>
          <div className="summary-value">{totalCount}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Marked Present</div>
          <div className="summary-value present">{attendedCount}</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">Absent</div>
          <div className="summary-value absent">{totalCount - attendedCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="bulk-actions">
          <button onClick={handleSelectAll} className="btn-select-all">
            ✓ Select All
          </button>
          <button onClick={handleDeselectAll} className="btn-deselect-all">
            ✗ Deselect All
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div className="participants-section">
        {filteredParticipants.length === 0 ? (
          <div className="no-participants">
            {searchQuery ? 'No participants match your search' : 'No participants registered yet'}
          </div>
        ) : (
          <div className="participants-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Present</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered At</th>
                  <th>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map(participant => (
                  <tr key={participant.id}>
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={attendanceMap[participant.id] || false}
                        onChange={() => handleCheckboxChange(participant.id)}
                      />
                    </td>
                    <td className="participant-name">{participant.user?.name || 'N/A'}</td>
                    <td className="participant-email">{participant.user?.email || 'N/A'}</td>
                    <td>
                      <span className="role-badge">{participant.user?.role || 'N/A'}</span>
                    </td>
                    <td className="date-time">
                      {new Date(participant.registered_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <span className={`status-badge status-${participant.status}`}>
                        {participant.status === 'attended' ? '✓ Attended' : 
                         participant.status === 'cancelled' ? '✗ Cancelled' : 
                         '○ Registered'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Button */}
      {filteredParticipants.length > 0 && (
        <div className="save-section">
          <button 
            onClick={handleSaveAttendance} 
            className="btn-save"
            disabled={saving}
          >
            {saving ? 'Saving...' : '💾 Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordAttendancePage;
