import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = 'Login - CESMS';
    // Check for session expired from URL
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setInfo('Your session has expired.');
      // Clear URL params
      window.history.replaceState({}, '', '/login');
      // Auto-dismiss after 3 seconds
      setTimeout(() => setInfo(''), 3000);
    }
    
    // Check for logout message
    if (location.state?.message) {
      setInfo(location.state.message);
      // Clear state so refresh doesn't show it again
      window.history.replaceState({}, '');
      // Auto-dismiss after 3 seconds
      setTimeout(() => setInfo(''), 3000);
    }
  }, [location]);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError(''); // Clear error when user types
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError(''); // Clear error when user types
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email format
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      // Call login API
      await authService.login(email, password);
      
      // Redirect to home on success
      navigate('/home');
    } catch (err) {
      // Show error message
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Login to System</h1>
        <p className="subtitle">Authentication System</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {/* Info message */}
          {info && (
            <div className="info-message">
              {info}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
