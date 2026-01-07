import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import participationService from '../services/participationService';
import eventService from '../services/eventService';
import { formatDateTime } from '../utils/dateUtils';
import './HomePage.css';

function HomePage() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({
    registeredEvents: 0,
    myEvents: 0,
    upcomingRegistrations: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for session expired message
    if (location.state?.message) {
      setMessage(location.state.message);
    }

    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    // Get current user info
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadDashboardData(currentUser);
  }, [navigate, location.state]);

  const loadDashboardData = async (currentUser) => {
    try {
      setLoading(true);
      
      // Get registered events count and upcoming events
      const participations = await participationService.getMyParticipations();
      const registered = participations.filter(p => p.status === 'registered');
      
      // Filter upcoming events - event is directly in participation object
      const upcoming = registered
        .filter(p => {
          if (!p.event || !p.event.start_datetime) return false;
          return new Date(p.event.start_datetime) > new Date();
        })
        .sort((a, b) => new Date(a.event.start_datetime) - new Date(b.event.start_datetime))
        .slice(0, 3); // Get next 3 upcoming events
      
      let myEventsCount = 0;
      if (currentUser.role === 'student' || currentUser.role === 'faculty_manager' || currentUser.role === 'event_organizer') {
        const myEvents = await eventService.getAllEvents();
        myEventsCount = myEvents.events?.filter(e => e.organizer_id === currentUser.id).length || 0;
      }
      
      setStats({
        registeredEvents: registered.length,
        myEvents: myEventsCount,
        upcomingRegistrations: upcoming
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // UC-02: Logout from System
    await authService.logout();
    navigate('/login', { state: { message: 'Logged out successfully' } });
  };

  const getRoleBasedFeatures = () => {
    const role = user?.role;
    
    const commonFeatures = [
      {
        title: 'Browse Events',
        description: 'Explore all campus events',
        icon: '🎯',
        path: '/events',
        color: '#007bff'
      },
      {
        title: 'My Registrations',
        description: 'View events you registered for',
        icon: '📅',
        action: () => navigate('/events', { state: { filter: 'registered' } }),
        color: '#28a745'
      }
    ];

    const adminFeatures = [
      {
        title: 'Manage Users',
        description: 'Create and manage user accounts',
        icon: '👥',
        path: '/admin/users',
        color: '#e67e22'
      },
      {
        title: 'Browse Events',
        description: 'View all campus events',
        icon: '🗂️',
        path: '/events',
        color: '#9b59b6'
      },
      {
        title: 'Venue Availability',
        description: 'Manage venue availability',
        icon: '🔒',
        path: '/venue-availability',
        color: '#3498db'
      }
    ];

    const facultyManagerFeatures = [
      {
        title: 'Approve Bookings',
        description: 'Review venue requests',
        icon: '✔️',
        path: '/faculty/bookings',
        color: '#27ae60'
      },
      {
        title: 'Faculty Events',
        description: 'Review events in your faculty\'s venues',
        icon: '🏛️',
        path: '/faculty-events',
        color: '#8e44ad'
      },
      {
        title: 'Venue Availability',
        description: 'Manage venue availability and blocked time slots',
        icon: '🔒',
        path: '/venue-availability',
        color: '#e67e22'
      }
    ];

    // Event creation features (for student, faculty_manager, event_organizer)
    const eventCreationFeatures = [
      {
        title: 'My Events',
        description: 'Manage your created events',
        icon: '🎪',
        path: '/my-events',
        color: '#ff6b6b'
      },
      {
        title: 'Create Event',
        description: 'Organize a new event',
        icon: '➕',
        path: '/create-event',
        color: '#6c5ce7'
      },
      {
        title: 'My Venue Requests',
        description: 'Submit and track venue bookings',
        icon: '📝',
        path: '/my-venue-requests',
        color: '#f39c12'
      },
      {
        title: 'My Resource Requests',
        description: 'Request and track campus resources',
        icon: '📦',
        path: '/my-resource-requests',
        color: '#4CAF50'
      }
    ];

    if (role === 'administrator') {
      return [...commonFeatures, ...adminFeatures];
    } else if (role === 'event_organizer') {
      return [...commonFeatures, ...eventCreationFeatures];
    } else if (role === 'faculty_manager') {
      return [...commonFeatures, ...eventCreationFeatures, ...facultyManagerFeatures];
    } else if (role === 'student') {
      return [...commonFeatures, ...eventCreationFeatures];
    } else {
      return commonFeatures;
    }
  };

  if (!user) {
    return <div className="loading-screen">Loading...</div>;
  }

  const features = getRoleBasedFeatures();

  return (
    <div className="home-container">
      {/* Header */}
      <div className="home-header">
        <div>
          <h1>Welcome back, {user.name}! 👋</h1>
          <p className="role-badge">{user.role.replace('_', ' ').toUpperCase()}</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {message && (
        <div className="info-message">
          {message}
        </div>
      )}

      {/* Quick Stats */}
      {!loading && (
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{stats.registeredEvents}</div>
              <div className="stat-label">Registered Events</div>
            </div>
          </div>
          {(user.role === 'student' || user.role === 'faculty_manager' || user.role === 'event_organizer') && (
            <div className="stat-card">
              <div className="stat-icon">🎪</div>
              <div className="stat-content">
                <div className="stat-value">{stats.myEvents}</div>
                <div className="stat-label">My Events</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Events Preview */}
      {!loading && stats.upcomingRegistrations.length > 0 && (
        <div className="upcoming-section">
          <h2>Your Upcoming Events</h2>
          <div className="upcoming-list">
            {stats.upcomingRegistrations.map((participation) => (
              <div 
                key={participation.event.id} 
                className="upcoming-item"
                onClick={() => navigate(`/events/${participation.event.id}`)}
              >
                <div className="upcoming-date">
                  {formatDateTime(participation.event.start_datetime)}
                </div>
                <div className="upcoming-details">
                  <h4>{participation.event.event_name}</h4>
                  <span className="event-type-badge">{participation.event.event_type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <div className="features-section">
        <h2>Quick Actions</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="feature-card"
              onClick={() => {
                if (feature.path) {
                  if (feature.path === '/create-event') {
                    navigate(feature.path, { state: { from: 'home' } });
                  } else {
                    navigate(feature.path);
                  }
                } else {
                  feature.action();
                }
              }}
              style={{ borderLeft: `4px solid ${feature.color}` }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
