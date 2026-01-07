const Faculty = require('../models/Faculty');

class FacultyController {
  // Get all faculties
  static async getAllFaculties(req, res) {
    try {
      const faculties = await Faculty.getAll();
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
}

module.exports = FacultyController;
