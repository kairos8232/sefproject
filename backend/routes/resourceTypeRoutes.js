const express = require('express');
const router = express.Router();
const ResourceTypeController = require('../controllers/ResourceTypeController');
const AuthController = require('../controllers/AuthController');

/**
 * @route   GET /api/resource-types
 * @desc    Get all resource types with optional filters
 * @access  Admin only
 */
router.get('/', AuthController.verifyToken, ResourceTypeController.getAllTypes);

/**
 * @route   POST /api/resource-types
 * @desc    Create a new resource type
 * @access  Admin only
 */
router.post('/', AuthController.verifyToken, ResourceTypeController.createType);

/**
 * @route   PUT /api/resource-types/:id
 * @desc    Update a resource type
 * @access  Admin only
 */
router.put('/:id', AuthController.verifyToken, ResourceTypeController.updateType);

/**
 * @route   PUT /api/resource-types/:id/status
 * @desc    Update resource type status (activate/deactivate)
 * @access  Admin only
 */
router.put('/:id/status', AuthController.verifyToken, ResourceTypeController.updateTypeStatus);

module.exports = router;
