const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserController {
  // Get all users (admin only)
  static async getAllUsers(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can manage users.' 
        });
      }

      const filters = {
        role: req.query.role,
        status: req.query.status,
        facultyId: req.query.facultyId,
        search: req.query.search
      };

      const users = await User.getAll(filters);

      // Remove password from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Error getting all users:', error);
      res.status(500).json({ message: 'Failed to get users' });
    }
  }

  // Create new user (admin only)
  static async createUser(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can create users.' 
        });
      }

      const { name, email, password, role, faculty_id, staff_id } = req.body;

      // Validate required fields
      if (!name || !email || !password || !role || !staff_id) {
        return res.status(400).json({ 
          message: 'Name, email, password, role, and staff ID are required.' 
        });
      }

      // Validate role
      const validRoles = ['student', 'event_organizer', 'administrator', 'faculty_staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role. Must be one of: student, event_organizer, administrator, faculty_staff' 
        });
      }

      // Validate faculty_id requirement for students and faculty_staff
      if ((role === 'student' || role === 'faculty_staff') && !faculty_id) {
        return res.status(400).json({ 
          message: `Faculty is required for ${role}s.` 
        });
      }

      // Check for duplicate email
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ 
          message: 'A user with this email already exists.' 
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userData = {
        name,
        email,
        password: hashedPassword,
        role,
        staff_id,  // Required field
        status: 'active'
      };

      if (faculty_id) {
        userData.faculty_id = faculty_id;
      }

      const newUser = await User.create(userData);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;

      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  }

  // Update user (admin only)
  static async updateUser(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can update users.' 
        });
      }

      const { id } = req.params;
      const { name, email, faculty_id } = req.body;

      // Get existing user
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If email is being changed, check for duplicates
      if (email && email !== existingUser.email) {
        const duplicateUser = await User.findByEmail(email);
        if (duplicateUser) {
          return res.status(400).json({ 
            message: 'A user with this email already exists.' 
          });
        }
      }

      // Validate faculty_id requirement
      const role = existingUser.role;
      if ((role === 'student' || role === 'faculty_staff') && !faculty_id) {
        return res.status(400).json({ 
          message: `Faculty is required for ${role}s.` 
        });
      }

      // Update user
      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (faculty_id !== undefined) updates.faculty_id = faculty_id;

      const updatedUser = await User.update(id, updates);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  }

  // Update user status (admin only)
  static async updateUserStatus(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can update user status.' 
        });
      }

      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ 
          message: 'Status must be either "active" or "inactive".' 
        });
      }

      // Get user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent deactivating current user
      if (id === req.user.id && status === 'inactive') {
        return res.status(400).json({ 
          message: 'You cannot deactivate your own account.' 
        });
      }

      // Prevent deactivating administrators
      if (user.role === 'administrator' && status === 'inactive') {
        return res.status(400).json({ 
          message: 'Administrators cannot be deactivated.' 
        });
      }

      // If deactivating, check for ongoing/future events and participations
      if (status === 'inactive') {
        const hasEvents = await User.hasOngoingOrFutureEvents(id);
        if (hasEvents) {
          return res.status(400).json({ 
            message: 'Cannot deactivate user with ongoing or future events. Please reassign or cancel the events first.' 
          });
        }

        const hasParticipations = await User.hasFutureParticipations(id);
        if (hasParticipations) {
          return res.status(400).json({ 
            message: 'Cannot deactivate user with future event participations. Please cancel their registrations first.' 
          });
        }
      }

      // Update status
      const updatedUser = await User.update(id, { status });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  }

  // Update user role (admin only)
  static async updateUserRole(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can update user roles.' 
        });
      }

      const { id } = req.params;
      const { role, faculty_id } = req.body;

      // Validate role
      const validRoles = ['student', 'event_organizer', 'administrator', 'faculty_staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          message: 'Invalid role. Must be one of: student, event_organizer, administrator, faculty_staff' 
        });
      }

      // Get user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent changing own role
      if (id === req.user.id) {
        return res.status(400).json({ 
          message: 'You cannot change your own role.' 
        });
      }

      // If user is currently an admin and is being demoted
      if (user.role === 'administrator' && role !== 'administrator') {
        // Check if this is the last admin
        const adminCount = await User.countAdministrators();
        if (adminCount <= 1) {
          return res.status(400).json({ 
            message: 'Cannot change role of the last administrator. Assign another administrator first.' 
          });
        }
      }

      // Check for ongoing/future events and participations before role change
      const hasEvents = await User.hasOngoingOrFutureEvents(id);
      if (hasEvents) {
        return res.status(400).json({ 
          message: 'Cannot change role of user with ongoing or future events. Please reassign or cancel the events first.' 
        });
      }

      const hasParticipations = await User.hasFutureParticipations(id);
      if (hasParticipations) {
        return res.status(400).json({ 
          message: 'Cannot change role of user with future event participations. Please cancel their registrations first.' 
        });
      }

      // Validate faculty_id requirement for new role
      if ((role === 'student' || role === 'faculty_staff') && !faculty_id && !user.faculty_id) {
        return res.status(400).json({ 
          message: `Faculty is required for ${role}s. Please provide a faculty_id.` 
        });
      }

      // Update role
      const updates = { role };
      if (faculty_id !== undefined) {
        updates.faculty_id = faculty_id;
      }

      const updatedUser = await User.update(id, updates);

      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  }

  // Reset user password (admin only)
  static async resetPassword(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can reset passwords.' 
        });
      }

      const { id } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required.' });
      }

      // Get user
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password
      await User.update(id, { password: hashedPassword });

      res.json({ message: 'Password reset successfully.' });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  }
}

module.exports = UserController;
