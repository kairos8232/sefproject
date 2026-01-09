const express = require('express');
const router = express.Router();
const FacultyController = require('../controllers/FacultyController');
const AuthController = require('../controllers/AuthController');

// Public route - Get all faculties (no auth required)
router.get('/public', FacultyController.getPublicFaculties);

// Admin routes (authentication required)
router.get('/', AuthController.verifyToken, FacultyController.getAllFaculties);
router.post('/', AuthController.verifyToken, FacultyController.createFaculty);
router.put('/:id', AuthController.verifyToken, FacultyController.updateFaculty);
router.put('/:id/status', AuthController.verifyToken, FacultyController.updateFacultyStatus);
router.get('/:id', FacultyController.getFacultyById);

module.exports = router;
