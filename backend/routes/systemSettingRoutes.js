const express = require('express');
const router = express.Router();
const SystemSettingController = require('../controllers/SystemSettingController');
const AuthController = require('../controllers/AuthController');

// All routes require authentication and admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'administrator') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.'
    });
  }
  next();
};

// Get all settings
router.get('/', 
  AuthController.verifyToken, 
  requireAdmin,
  SystemSettingController.getAllSettings
);

// Get settings as object
router.get('/object', 
  AuthController.verifyToken, 
  requireAdmin,
  SystemSettingController.getSettingsObject
);

// Update settings
router.put('/', 
  AuthController.verifyToken, 
  requireAdmin,
  SystemSettingController.updateSettings
);

module.exports = router;
