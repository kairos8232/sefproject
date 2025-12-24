import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import './HomePage.css';

function HomePage() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
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
  }, [navigate, location.state]);

  const handleLogout = async () => {
    // UC-02: Logout from System
    await authService.logout();
    navigate('/login', { state: { message: 'Logged out successfully' } });
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="home-container">
      <div className="home-box">
        <h1>Welcome to the System</h1>
        
        {message && (
          <div className="info-message">
            {message}
          </div>
        )}
        
        <div className="user-info">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Status:</strong> <span className="status-active">Active</span></p>
        </div>

        <div className="action-buttons">
          <button onClick={() => navigate('/events')} className="events-button">
            Browse Events
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
