const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const User = require('../models/User');
const Session = require('../models/Session');
const RefreshToken = require('../models/RefreshToken');

const getCookieValue = (req, name) => {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;
  const cookies = rawCookie.split(';').map(part => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
};

const getRefreshTokenExpiry = () => {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10);
  const effectiveDays = Number.isNaN(days) ? 7 : days;
  return new Date(Date.now() + effectiveDays * 24 * 60 * 60 * 1000);
};

class AuthController {
  // Login method
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validate input
      if (!email || !password) {
        return res.status(400).json({ 
          error: 'Email and password are required' 
        });
      }

      // Find user by email
      const user = await User.findByEmail(email);

      // Check if user exists (null check)
      if (!user) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          error: 'Invalid email or password' 
        });
      }

      // Check if account is inactive or blocked
      if (user.status !== 'active') {
        return res.status(403).json({ 
          error: 'Account inactive/blocked' 
        });
      }

      // Generate JWT token with unique nonce to prevent duplicates
      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          facultyId: user.faculty_id || null,
          nonce: crypto.randomBytes(16).toString('hex') // Ensures token uniqueness
        },
        process.env.JWT_SECRET,
        // Default JWT lifetime: 15 minutes for browser sessions
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const decodedToken = jwt.decode(token);
      const expiresAt = decodedToken?.exp ? new Date(decodedToken.exp * 1000) : null;

      // Create session in database aligned with JWT expiry
      // The createSession method in Session model already handles cleanup of old sessions
      try {
        await Session.createSession(user.id, user.role, token, expiresAt);
      } catch (sessionError) {
        console.error('Error creating session:', sessionError);
        // If session creation fails, still continue but log the error
      }

      const refreshToken = crypto.randomBytes(64).toString('hex');
      const refreshExpiresAt = getRefreshTokenExpiry();
      
      console.log('Creating refresh token for user:', user.id);
      console.log('Refresh token expires at:', refreshExpiresAt);
      
      try {
        const refreshTokenData = await RefreshToken.createToken({
          userId: user.id,
          token: refreshToken,
          expiresAt: refreshExpiresAt,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || req.connection?.remoteAddress || null
        });
        console.log('Refresh token created successfully:', refreshTokenData?.id);
      } catch (refreshError) {
        console.error('Error creating refresh token:', refreshError);
        console.error('Error details:', refreshError.message);
        console.error('Error code:', refreshError.code);
        // Don't fail login if refresh token creation fails
      }

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshExpiresAt.getTime() - Date.now(),
        path: '/api/auth'
      });

      // Get faculty details if user has faculty_id (for students and faculty staff)
      let facultyDetails = null;
      if (user.faculty_id && (user.role === 'student' || user.role === 'faculty_staff')) {
        try {
          const { data: faculty } = await supabase
            .from('faculties')
            .select('id, code, name')
            .eq('id', user.faculty_id)
            .single();
          
          if (faculty) {
            facultyDetails = faculty;
          }
        } catch (facultyError) {
          console.error('Error fetching faculty details:', facultyError);
          // Don't fail login if faculty fetch fails
        }
      }

      // Return success response
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facultyId: user.faculty_id,
          faculty: facultyDetails
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        error: 'An error occurred during login' 
      });
    }
  }

  // Logout method
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const refreshToken = getCookieValue(req, 'refresh_token');
      
      if (token) {
        await Session.deleteSession(token);
      }

      if (refreshToken) {
        await RefreshToken.revokeToken(refreshToken);
      }

      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth'
      });

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'An error occurred during logout' });
    }
  }

  // Refresh access token using refresh token cookie
  async refresh(req, res) {
    try {
      const refreshToken = getCookieValue(req, 'refresh_token');
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      const storedToken = await RefreshToken.findValidToken(refreshToken);
      if (!storedToken) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      const user = await User.findById(storedToken.user_id);
      if (!user || user.status !== 'active') {
        await RefreshToken.revokeToken(refreshToken);
        return res.status(401).json({ error: 'Invalid user' });
      }

      await RefreshToken.revokeToken(refreshToken);

      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          facultyId: user.faculty_id || null,
          nonce: crypto.randomBytes(16).toString('hex') // Ensures token uniqueness
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      const decodedToken = jwt.decode(token);
      const expiresAt = decodedToken?.exp ? new Date(decodedToken.exp * 1000) : null;
      
      // Try to create session, but continue if it fails (graceful degradation)
      try {
        await Session.createSession(user.id, user.role, token, expiresAt);
      } catch (sessionError) {
        console.error('Error creating session in refresh:', sessionError);
        // Session creation failed but we can still return the token
        // The JWT itself is valid and can be used for authentication
      }

      const newRefreshToken = crypto.randomBytes(64).toString('hex');
      const refreshExpiresAt = getRefreshTokenExpiry();
      await RefreshToken.createToken({
        userId: user.id,
        token: newRefreshToken,
        expiresAt: refreshExpiresAt,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || req.connection?.remoteAddress || null
      });

      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: refreshExpiresAt.getTime() - Date.now(),
        path: '/api/auth'
      });

      res.json({ success: true, token });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Failed to refresh session' });
    }
  }

  // Verify token middleware
  async verifyToken(req, res, next) {
    try {
      // Allow OPTIONS requests (CORS preflight) to pass through
      if (req.method === 'OPTIONS') {
        return next();
      }

      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if session exists in database
      const session = await Session.findByToken(token);
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Update profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
      }

      // Check if email is already taken by another user
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      // Update user
      const updatedUser = await User.update(userId, { name, email });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json({
        success: true,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: 'Current password and new password are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: 'New password must be at least 6 characters' 
        });
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Current password is incorrect' 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await User.update(userId, { password: hashedPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  }

  // Get current user profile with full details
  async getCurrentUserProfile(req, res) {
    try {
      const userId = req.user.userId;

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      // Get faculty details if user has faculty_id
      let facultyDetails = null;
      if (user.faculty_id && (user.role === 'student' || user.role === 'faculty_staff')) {
        try {
          const { data: faculty } = await supabase
            .from('faculties')
            .select('id, code, name')
            .eq('id', user.faculty_id)
            .single();
          
          if (faculty) {
            facultyDetails = faculty;
          }
        } catch (facultyError) {
          console.error('Error fetching faculty details:', facultyError);
          // Don't fail request if faculty fetch fails
        }
      }

      res.json({
        success: true,
        user: {
          ...userWithoutPassword,
          faculty: facultyDetails
        }
      });
    } catch (error) {
      console.error('Get current user profile error:', error);
      res.status(500).json({ message: 'Failed to get user profile' });
    }
  }
}

module.exports = new AuthController();
