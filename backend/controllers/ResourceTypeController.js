const ResourceType = require('../models/ResourceType');
const ResourceCategory = require('../models/ResourceCategory');

class ResourceTypeController {
  /**
   * Get all resource types (admin only)
   */
  static async getAllTypes(req, res) {
    try {
      const { category_id, status, search } = req.query;
      const filters = {};

      if (category_id) filters.category_id = category_id;
      if (status) filters.status = status;
      if (search) filters.search = search;

      const types = await ResourceType.getAll(filters);

      res.status(200).json(types);
    } catch (error) {
      console.error('Error getting resource types:', error);
      res.status(500).json({ error: 'Failed to fetch resource types' });
    }
  }

  /**
   * Create a new resource type (admin only)
   */
  static async createType(req, res) {
    try {
      const {
        category_id,
        code,
        name,
        description,
        total_quantity,
        available_quantity,
        unit,
        managed_by,
        notes
      } = req.body;

      // Validate required fields
      if (!category_id || !code || !name) {
        return res.status(400).json({ error: 'Category, code, and name are required' });
      }

      // Validate code format (2-20 uppercase alphanumeric with hyphens)
      const codeRegex = /^[A-Z0-9-]{2,20}$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({
          error: 'Code must be 2-20 uppercase alphanumeric characters (hyphens allowed)'
        });
      }

      // Validate quantities
      if (total_quantity !== undefined && total_quantity < 0) {
        return res.status(400).json({ error: 'Total quantity cannot be negative' });
      }
      if (available_quantity !== undefined && available_quantity < 0) {
        return res.status(400).json({ error: 'Available quantity cannot be negative' });
      }
      if (available_quantity !== undefined && total_quantity !== undefined && 
          available_quantity > total_quantity) {
        return res.status(400).json({ error: 'Available quantity cannot exceed total quantity' });
      }

      // Check if category exists and is active
      const category = await ResourceCategory.findById(category_id);
      if (!category) {
        return res.status(404).json({ error: 'Resource category not found' });
      }
      if (category.status !== 'active') {
        return res.status(409).json({ error: 'Cannot add resource types to an inactive category' });
      }

      // Check for duplicate code
      const existingType = await ResourceType.findByCode(code);
      if (existingType) {
        return res.status(409).json({ error: 'A resource type with this code already exists' });
      }

      // Create resource type
      const newType = await ResourceType.create({
        category_id,
        code,
        name: name.trim(),
        description: description?.trim() || null,
        total_quantity: total_quantity || 0,
        available_quantity: available_quantity || 0,
        unit: unit?.trim() || null,
        managed_by: managed_by || null,
        notes: notes?.trim() || null
      });

      res.status(201).json(newType);
    } catch (error) {
      console.error('Error creating resource type:', error);
      res.status(500).json({ error: 'Failed to create resource type' });
    }
  }

  /**
   * Update a resource type (admin only)
   */
  static async updateType(req, res) {
    try {
      const { id } = req.params;
      const {
        category_id,
        code,
        name,
        description,
        total_quantity,
        available_quantity,
        unit,
        managed_by,
        notes
      } = req.body;

      // Validate required fields
      if (!category_id || !code || !name) {
        return res.status(400).json({ error: 'Category, code, and name are required' });
      }

      // Validate code format
      const codeRegex = /^[A-Z0-9-]{2,20}$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({
          error: 'Code must be 2-20 uppercase alphanumeric characters (hyphens allowed)'
        });
      }

      // Validate quantities
      if (total_quantity < 0) {
        return res.status(400).json({ error: 'Total quantity cannot be negative' });
      }
      if (available_quantity < 0) {
        return res.status(400).json({ error: 'Available quantity cannot be negative' });
      }
      if (available_quantity > total_quantity) {
        return res.status(400).json({ error: 'Available quantity cannot exceed total quantity' });
      }

      // Check if resource type exists
      const type = await ResourceType.findById(id);
      if (!type) {
        return res.status(404).json({ error: 'Resource type not found' });
      }

      // Check if category exists and is active
      const category = await ResourceCategory.findById(category_id);
      if (!category) {
        return res.status(404).json({ error: 'Resource category not found' });
      }
      if (category.status !== 'active') {
        return res.status(409).json({ error: 'Cannot assign to an inactive category' });
      }

      // Check for duplicate code (excluding current type)
      const existingType = await ResourceType.findByCode(code);
      if (existingType && existingType.id !== id) {
        return res.status(409).json({ error: 'Another resource type with this code already exists' });
      }

      // Update resource type
      const updatedType = await ResourceType.update(id, {
        category_id,
        code,
        name: name.trim(),
        description: description?.trim() || null,
        total_quantity,
        available_quantity,
        unit: unit?.trim() || null,
        managed_by: managed_by || null,
        notes: notes?.trim() || null
      });

      res.status(200).json(updatedType);
    } catch (error) {
      console.error('Error updating resource type:', error);
      res.status(500).json({ error: 'Failed to update resource type' });
    }
  }

  /**
   * Update resource type status (activate/deactivate) (admin only)
   */
  static async updateTypeStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either "active" or "inactive"' });
      }

      // Check if resource type exists
      const type = await ResourceType.findById(id);
      if (!type) {
        return res.status(404).json({ error: 'Resource type not found' });
      }

      // Prevent deactivation if resource type has pending requests
      if (status === 'inactive') {
        const hasPendingRequests = await ResourceType.hasPendingRequests(id);
        if (hasPendingRequests) {
          return res.status(409).json({
            error: 'Cannot deactivate resource type with pending requests. Please resolve all pending requests first.'
          });
        }
      }

      // Update status
      const updatedType = await ResourceType.updateStatus(id, status);

      res.status(200).json(updatedType);
    } catch (error) {
      console.error('Error updating resource type status:', error);
      res.status(500).json({ error: 'Failed to update resource type status' });
    }
  }
}

module.exports = ResourceTypeController;
