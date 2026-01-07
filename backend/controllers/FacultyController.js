const Faculty = require('../models/Faculty');

class FacultyController {
  // Get all faculties with optional filters (admin only)
  static async getAllFaculties(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can manage faculties.' 
        });
      }

      const filters = {
        status: req.query.status,
        search: req.query.search
      };

      const faculties = await Faculty.getAll(filters);
      res.json(faculties);
    } catch (error) {
      console.error('Error getting all faculties:', error);
      res.status(500).json({ message: 'Failed to get faculties' });
    }
  }

  // Get faculty by ID
  static async getFacultyById(req, res) {
    try {
      const { id } = req.params;
      const faculty = await Faculty.findById(id);
      
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
      }

      res.json(faculty);
    } catch (error) {
      console.error('Error getting faculty:', error);
      res.status(500).json({ message: 'Failed to get faculty' });
    }
  }

  // Create new faculty (admin only)
  static async createFaculty(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can create faculties.' 
        });
      }

      const { code, name, description } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ 
          message: 'Faculty code and name are required.' 
        });
      }

      // Validate code format (alphanumeric, uppercase, 2-10 chars)
      const codeRegex = /^[A-Z0-9]{2,10}$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({ 
          message: 'Faculty code must be 2-10 uppercase alphanumeric characters.' 
        });
      }

      // Check for duplicate code
      const existing = await Faculty.findByCode(code);
      if (existing) {
        return res.status(400).json({ 
          message: `Faculty code '${code}' already exists. Code must be unique.` 
        });
      }

      // Create faculty
      const faculty = await Faculty.create({ code, name, description });
      res.status(201).json(faculty);
    } catch (error) {
      console.error('Error creating faculty:', error);
      res.status(500).json({ message: 'Failed to create faculty' });
    }
  }

  // Update faculty (admin only)
  static async updateFaculty(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can update faculties.' 
        });
      }

      const { id } = req.params;
      const { code, name, description } = req.body;

      // Check if faculty exists
      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
      }

      // Validate code if provided
      if (code) {
        const codeRegex = /^[A-Z0-9]{2,10}$/;
        if (!codeRegex.test(code)) {
          return res.status(400).json({ 
            message: 'Faculty code must be 2-10 uppercase alphanumeric characters.' 
          });
        }

        // Check for duplicate code (only if code is changing)
        if (code !== faculty.code) {
          const existing = await Faculty.findByCode(code);
          if (existing) {
            return res.status(400).json({ 
              message: `Faculty code '${code}' already exists. Code must be unique.` 
            });
          }
        }
      }

      // Update faculty
      const updatedFaculty = await Faculty.update(id, { code, name, description });
      res.json(updatedFaculty);
    } catch (error) {
      console.error('Error updating faculty:', error);
      res.status(500).json({ message: 'Failed to update faculty' });
    }
  }

  // Update faculty status (admin only)
  static async updateFacultyStatus(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'administrator') {
        return res.status(403).json({ 
          message: 'Access denied. Only administrators can update faculty status.' 
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

      // Check if faculty exists
      const faculty = await Faculty.findById(id);
      if (!faculty) {
        return res.status(404).json({ message: 'Faculty not found' });
      }

      // If deactivating, check for active venues
      if (status === 'inactive') {
        const hasActiveVenues = await Faculty.hasActiveVenues(id);
        if (hasActiveVenues) {
          return res.status(400).json({ 
            message: 'Cannot deactivate faculty with active venues. Please deactivate all venues first.' 
          });
        }
      }

      // Update status
      const updatedFaculty = await Faculty.update(id, { status });
      res.json(updatedFaculty);
    } catch (error) {
      console.error('Error updating faculty status:', error);
      res.status(500).json({ message: 'Failed to update faculty status' });
    }
  }
}

module.exports = FacultyController;
