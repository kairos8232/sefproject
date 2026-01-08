import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import participationService from '../services/participationService';
import eventService from '../services/eventService';
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
    document.title = 'Home - CESMS';
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
        title: 'Browse Events',
        description: 'Explore all campus events',
        icon: '🎯',
        path: '/events',
        color: '#007bff'
      },
      {
        title: 'Manage Users',
        description: 'Create and manage user accounts',
        icon: '👥',
        path: '/admin/users',
        color: '#e67e22'
      },
      {
        title: 'Faculties & Venues',
        description: 'Manage faculties and campus venues',
        icon: '🏛️',
        path: '/admin/faculties',
        color: '#9b59b6'
      },
      {
        title: 'Resource Catalogue',
        description: 'Manage resource categories and types',
        icon: '📦',
        path: '/admin/resources',
        color: '#16a085'
      },
      {
        title: 'System Configuration',
        description: 'Configure system-wide booking rules',
        icon: '⚙️',
        path: '/admin/system-configuration',
        color: '#95a5a6'
      },
      {
        title: 'Booking & Requests Management',
        description: 'Review and override all bookings and resource requests',
        icon: '📋',
        path: '/admin/booking-requests',
        color: '#e74c3c'
      },
      {
        title: 'Reports & Analytics',
        description: 'Generate comprehensive reports on events, venues, and resources',
        icon: '📊',
        path: '/admin/reports',
        color: '#9b59b6'
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
      return adminFeatures;
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

  // Group features by category
  const categorizeFeatures = () => {
    const categories = {
      events: [],
      booking: [],
      management: [],
      configuration: []
    };

    features.forEach(feature => {
      if (feature.title.includes('Event') || feature.title.includes('event')) {
        categories.events.push(feature);
      } else if (feature.title.includes('Booking') || feature.title.includes('Venue') || feature.title.includes('Resource')) {
        categories.booking.push(feature);
      } else if (feature.title.includes('User') || feature.title.includes('Faculties') || feature.title.includes('Catalogue') || feature.title.includes('Report')) {
        categories.management.push(feature);
      } else if (feature.title.includes('Configuration') || feature.title.includes('System')) {
        categories.configuration.push(feature);
      } else {
        categories.events.push(feature); // Default to events
      }
    });

    return categories;
  };

  const categorizedFeatures = categorizeFeatures();

  return (
    <div className="home-container">
      {message && (
        <div className="info-message">
          {message}
        </div>
      )}

      <div className="home-layout">
        {/* Left Side - User Profile Panel */}
        <div className="user-panel">
          <div className="user-card">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <h2>{user.name}</h2>
              <p className="user-role">{user.role.replace('_', ' ').toUpperCase()}</p>
              <p className="user-email">{user.email}</p>
            </div>
          </div>

          {/* Upcoming Events Preview */}
          {!loading && stats.upcomingRegistrations.length > 0 && user.role !== 'administrator' && (
            <div className="upcoming-preview">
              <h3>Upcoming Events</h3>
              <div className="upcoming-list">
                {stats.upcomingRegistrations.slice(0, 3).map((participation) => (
                  <div 
                    key={participation.event.id} 
                    className="upcoming-item"
                    onClick={() => navigate(`/events/${participation.event.id}`, { state: { fromHome: true } })}
                  >
                    <div className="upcoming-date">
                      {new Date(participation.event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="upcoming-details">
                      <h4>{participation.event.event_name}</h4>
                      <span className="event-type-badge">
                        {participation.event.event_type.charAt(0).toUpperCase() + participation.event.event_type.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {!loading && user.role !== 'administrator' && (
            <div className="user-stats">
              <h3>My Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item" onClick={() => navigate('/events', { state: { filter: 'registered' } })}>
                  <div className="stat-icon">📊</div>
                  <div className="stat-details">
                    <div className="stat-value">{stats.registeredEvents}</div>
                    <div className="stat-label">Registered Events</div>
                  </div>
                </div>
                {(user.role === 'student' || user.role === 'faculty_manager' || user.role === 'event_organizer') && (
                  <div className="stat-item" onClick={() => navigate('/my-events')}>
                    <div className="stat-icon">🎪</div>
                    <div className="stat-details">
                      <div className="stat-value">{stats.myEvents}</div>
                      <div className="stat-label">My Events</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* User Actions */}
          <div className="user-actions">
            <button className="btn-edit-profile" onClick={() => navigate('/profile')}>
              ✏️ Edit Profile
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Right Side - Quick Actions by Category */}
        <div className="actions-panel">
          {/* Events Section */}
          {categorizedFeatures.events.length > 0 && (
            <div className="home-action-section">
              <h2 className="home-section-title">🎯 Events</h2>
              <div className="home-features-grid">
                {categorizedFeatures.events.map((feature, index) => (
                  <div 
                    key={index}
                    className="home-feature-card"
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
                    <div className="home-feature-icon">{feature.icon}</div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking Section */}
          {categorizedFeatures.booking.length > 0 && (
            <div className="home-action-section">
              <h2 className="home-section-title">📅 Booking & Resources</h2>
              <div className="home-features-grid">
                {categorizedFeatures.booking.map((feature, index) => (
                  <div 
                    key={index}
                    className="home-feature-card"
                    onClick={() => {
                      if (feature.path) {
                        navigate(feature.path);
                      } else {
                        feature.action();
                      }
                    }}
                    style={{ borderLeft: `4px solid ${feature.color}` }}
                  >
                    <div className="home-feature-icon">{feature.icon}</div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Management Section */}
          {categorizedFeatures.management.length > 0 && (
            <div className="home-action-section">
              <h2 className="home-section-title">⚙️ Management</h2>
              <div className="home-features-grid">
                {categorizedFeatures.management.map((feature, index) => (
                  <div 
                    key={index}
                    className="home-feature-card"
                    onClick={() => {
                      if (feature.path) {
                        navigate(feature.path);
                      } else {
                        feature.action();
                      }
                    }}
                    style={{ borderLeft: `4px solid ${feature.color}` }}
                  >
                    <div className="home-feature-icon">{feature.icon}</div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Section */}
          {categorizedFeatures.configuration.length > 0 && (
            <div className="home-action-section">
              <h2 className="home-section-title">🔧 Configuration</h2>
              <div className="home-features-grid">
                {categorizedFeatures.configuration.map((feature, index) => (
                  <div 
                    key={index}
                    className="home-feature-card"
                    onClick={() => {
                      if (feature.path) {
                        navigate(feature.path);
                      } else {
                        feature.action();
                      }
                    }}
                    style={{ borderLeft: `4px solid ${feature.color}` }}
                  >
                    <div className="home-feature-icon">{feature.icon}</div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
