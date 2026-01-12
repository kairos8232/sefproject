const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const User = require('../models/User');
const Session = require('../models/Session');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const EmailService = require('../services/EmailService');

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

      // Check if 2FA is required (only for configured email)
      const allowed2FAEmail = process.env.ALLOWED_2FA_EMAIL;
      const requires2FA = allowed2FAEmail && email === allowed2FAEmail;

      if (requires2FA) {
        // Generate and send 2FA code via email
        const code = TwoFactorAuth.generateCode();
        await TwoFactorAuth.storeCode(user.id, code);
        
        // In development, optionally print the OTP to server logs
        if (process.env.DEV_SHOW_OTP === 'true') {
          console.log('OTP for', user.email, ':', code);
        }
        
        // Send OTP to user's email
        try {
          await EmailService.send2FACode(user.email, code, user.name);
        } catch (emailError) {
          // Continue anyway - code is stored, user can try to resend
        }

        // Return success response indicating OTP has been sent
        return res.json({
          success: true,
          requiresOTP: true,
          message: 'Verification code sent to your email',
          email: user.email
        });
      }

      // For other users, bypass 2FA and generate token immediately
      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          facultyId: user.faculty_id || null
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Create session
      await Session.createSession(user.id, user.role, token);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facultyId: user.faculty_id
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        error: 'An error occurred during login',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Logout method
  async logout(req, res) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (token) {
        await Session.deleteSession(token);
      }

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'An error occurred during logout' });
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

  // Send 2FA Code
  async send2FACode(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate and store 2FA code
      const code = TwoFactorAuth.generateCode();
      await TwoFactorAuth.storeCode(user.id, code);

      if (process.env.DEV_SHOW_OTP === 'true') {
        console.warn('🔔 DEV_SHOW_OTP enabled - OTP for', user.email, 'is:', code);
      }

      // Send email with 2FA code
      await EmailService.send2FACode(user.email, code, user.name);

      res.json({
        success: true,
        message: '2FA code sent to your email'
      });
    } catch (error) {
      console.error('Send 2FA code error:', error);
      res.status(500).json({ error: 'Failed to send 2FA code' });
    }
  }

  // Verify 2FA Code
  async verify2FACode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: 'Email and code are required' });
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify code
      const verification = await TwoFactorAuth.verifyCode(user.id, code);
      if (!verification.valid) {
        return res.status(401).json({ error: verification.message });
      }

      // Generate JWT token after successful 2FA
      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          facultyId: user.faculty_id || null
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      // Create session
      await Session.createSession(user.id, user.role, token);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          facultyId: user.faculty_id
        }
      });
    } catch (error) {
      console.error('Verify 2FA code error:', error);
      res.status(500).json({ error: 'Failed to verify 2FA code' });
    }
  }
}

module.exports = new AuthController();
