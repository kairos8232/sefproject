import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../services/apiClient';
import { useToast } from '../contexts/ToastContext';
import './RecordAttendancePage.css';

const RecordAttendancePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Track attendance state for each participant
  const [attendanceMap, setAttendanceMap] = useState({});

  const loadEventAndParticipants = useCallback(async () => {
    document.title = 'Record Attendance - CESMS';
    try {
      setLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }


      // Load event details
      const eventResponse = await authFetch(`/events/${eventId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });


      if (!eventResponse.ok) {
        const eventData = await eventResponse.json();
        throw new Error(eventData.error || 'Failed to load event');
      }

      const eventData = await eventResponse.json();
      setEvent(eventData.event);

      // Load participants
      const participantsResponse = await authFetch(
        `/participation/event/${eventId}/participants`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );


      if (!participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        console.error('[RecordAttendancePage] Participants error:', participantsData);
        throw new Error(participantsData.error || 'Failed to load participants');
      }

      const participantsData = await participantsResponse.json();
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
      showError(err.message);
      setLoading(false);
    }
  }, [eventId, navigate, showError]);

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
      
      // Prepare attendance updates
      const attendanceUpdates = Object.keys(attendanceMap).map(participationId => ({
        participationId,
        attended: attendanceMap[participationId]
      }));

      const response = await authFetch(
        `/participation/event/${eventId}/record-attendance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ attendanceUpdates })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save attendance');
      }

      showSuccess(`Attendance recorded successfully for ${data.updatedCount} participant(s)!`);
    } catch (err) {
      console.error('Error saving attendance:', err);
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter participants by search query
  const filteredParticipants = participants.filter(participant => {
    const searchLower = searchQuery.toLowerCase();
    return (
      participant.user?.name?.toLowerCase().includes(searchLower) ||
      participant.user?.staff_id?.toLowerCase().includes(searchLower) ||
      participant.user?.email?.toLowerCase().includes(searchLower) ||
      participant.user?.role?.toLowerCase().includes(searchLower)
    );
  });

  const attendedCount = Object.values(attendanceMap).filter(attended => attended).length;
  const totalCount = participants.length;

  if (loading) {
    return (
      <div className="record-attendance-page">
        <div className="ra-loading">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="record-attendance-page">
        <div className="ra-page-header">
          <div>
            <h1>Record Attendance</h1>
            <p>Mark participant attendance for your event</p>
          </div>
          <button onClick={() => navigate('/my-events')} className="ra-back-button">
            ← Back to My Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="record-attendance-page">
      <div className="ra-page-header">
        <div>
          <h1>📋 Record Attendance</h1>
          <p>Mark participant attendance for your event</p>
        </div>
        <button onClick={() => navigate('/my-events')} className="ra-back-button">
          ← Back to My Events
        </button>
      </div>

      {/* Event Information */}
      {event && (
        <div className="ra-event-info-section">
          <h2>{event.event_name}</h2>
          <div className="ra-event-meta">
            <span>📅 {new Date(event.start_datetime).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
            <span className={`ra-status-badge status-${event.status}`}>{event.status}</span>
          </div>
        </div>
      )}

      {/* Attendance Summary */}
      <div className="ra-attendance-summary">
        <div className="ra-summary-item">
          <div className="ra-summary-label">Total Registered</div>
          <div className="ra-summary-value">{totalCount}</div>
        </div>
        <div className="ra-summary-item">
          <div className="ra-summary-label">Marked Present</div>
          <div className="ra-summary-value ra-present">{attendedCount}</div>
        </div>
        <div className="ra-summary-item">
          <div className="ra-summary-label">Absent</div>
          <div className="ra-summary-value ra-absent">{totalCount - attendedCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="ra-controls-section">
        <div className="ra-search-box">
          <input
            type="text"
            placeholder="Search by name, ID, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ra-bulk-actions">
          <button onClick={handleSelectAll} className="ra-btn-select-all">
            ✓ Select All
          </button>
          <button onClick={handleDeselectAll} className="ra-btn-deselect-all">
            ✗ Deselect All
          </button>
        </div>
      </div>

      {/* Participants List */}
      <div className="ra-participants-section">
        {filteredParticipants.length === 0 ? (
          <div className="ra-no-participants">
            {searchQuery ? 'No participants match your search' : 'No participants registered yet'}
          </div>
        ) : (
          <div className="ra-participants-table">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Present</th>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Registered At</th>
                  <th>Current Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map(participant => (
                  <tr key={participant.id}>
                    <td className="ra-checkbox-cell">
                      <input
                        type="checkbox"
                        checked={attendanceMap[participant.id] || false}
                        onChange={() => handleCheckboxChange(participant.id)}
                      />
                    </td>
                    <td className="ra-participant-name">{participant.user?.name || 'N/A'}</td>
                    <td className="ra-participant-id">{participant.user?.staff_id || 'N/A'}</td>
                    <td className="ra-participant-email">{participant.user?.email || 'N/A'}</td>
                    <td>
                      <span className="ra-role-badge">{participant.user?.role || 'N/A'}</span>
                    </td>
                    <td className="ra-date-time">
                      {new Date(participant.registered_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <span className={`ra-status-badge status-${participant.status}`}>
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
        <div className="ra-save-section">
          <button 
            onClick={handleSaveAttendance} 
            className="ra-btn-save"
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
