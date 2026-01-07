const express = require('express');
const router = express.Router();
const ResourceCategoryController = require('../controllers/ResourceCategoryController');
const AuthController = require('../controllers/AuthController');

/**
 * @route   GET /api/resource-categories
 * @desc    Get all resource categories with optional filters
 * @access  Admin only
 */
router.get('/', AuthController.verifyToken, ResourceCategoryController.getAllCategories);

/**
 * @route   POST /api/resource-categories
 * @desc    Create a new resource category
 * @access  Admin only
 */
router.post('/', AuthController.verifyToken, ResourceCategoryController.createCategory);

/**
 * @route   PUT /api/resource-categories/:id
 * @desc    Update a resource category
 * @access  Admin only
 */
router.put('/:id', AuthController.verifyToken, ResourceCategoryController.updateCategory);

/**
 * @route   PUT /api/resource-categories/:id/status
 * @desc    Update resource category status (activate/deactivate)
 * @access  Admin only
 */
router.put('/:id/status', AuthController.verifyToken, ResourceCategoryController.updateCategoryStatus);

module.exports = router;
