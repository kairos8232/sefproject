const express = require('express');
const router = express.Router();
const FacultyController = require('../controllers/FacultyController');

// Public routes (no authentication needed)
router.get('/', FacultyController.getAllFaculties);
router.get('/:id', FacultyController.getFacultyById);

module.exports = router;
