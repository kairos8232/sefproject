const ResourceCategory = require('../models/ResourceCategory');

class ResourceCategoryController {
  /**
   * Get all resource categories (admin only)
   */
  static async getAllCategories(req, res) {
    try {
      const { status, search } = req.query;
      const filters = {};

      if (status) filters.status = status;
      if (search) filters.search = search;

      const categories = await ResourceCategory.getAll(filters);

      // Add type counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const typeCount = await ResourceCategory.countTypes(category.id);
          return {
            ...category,
            type_count: typeCount
          };
        })
      );

      res.status(200).json(categoriesWithCounts);
    } catch (error) {
      console.error('Error getting resource categories:', error);
      res.status(500).json({ error: 'Failed to fetch resource categories' });
    }
  }

  /**
   * Create a new resource category (admin only)
   */
  static async createCategory(req, res) {
    try {
      const { code, name, description } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ error: 'Code and name are required' });
      }

      // Validate code format (2-10 uppercase alphanumeric characters)
      const codeRegex = /^[A-Z0-9]{2,10}$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({
          error: 'Code must be 2-10 uppercase alphanumeric characters'
        });
      }

      // Check for duplicate code
      const existingCategory = await ResourceCategory.findByCode(code);
      if (existingCategory) {
        return res.status(409).json({ error: 'A category with this code already exists' });
      }

      // Create category
      const newCategory = await ResourceCategory.create({
        code,
        name: name.trim(),
        description: description?.trim() || null
      });

      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating resource category:', error);
      res.status(500).json({ error: 'Failed to create resource category' });
    }
  }

  /**
   * Update a resource category (admin only)
   */
  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { code, name, description } = req.body;

      // Validate required fields
      if (!code || !name) {
        return res.status(400).json({ error: 'Code and name are required' });
      }

      // Validate code format
      const codeRegex = /^[A-Z0-9]{2,10}$/;
      if (!codeRegex.test(code)) {
        return res.status(400).json({
          error: 'Code must be 2-10 uppercase alphanumeric characters'
        });
      }

      // Check if category exists
      const category = await ResourceCategory.findById(id);
      if (!category) {
        return res.status(404).json({ error: 'Resource category not found' });
      }

      // Check for duplicate code (excluding current category)
      const existingCategory = await ResourceCategory.findByCode(code);
      if (existingCategory && existingCategory.id !== id) {
        return res.status(409).json({ error: 'Another category with this code already exists' });
      }

      // Update category
      const updatedCategory = await ResourceCategory.update(id, {
        code,
        name: name.trim(),
        description: description?.trim() || null
      });

      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error('Error updating resource category:', error);
      res.status(500).json({ error: 'Failed to update resource category' });
    }
  }

  /**
   * Update category status (activate/deactivate) (admin only)
   */
  static async updateCategoryStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: 'Status must be either "active" or "inactive"' });
      }

      // Check if category exists
      const category = await ResourceCategory.findById(id);
      if (!category) {
        return res.status(404).json({ error: 'Resource category not found' });
      }

      // Prevent deactivation if category has active resource types
      if (status === 'inactive') {
        const hasActiveTypes = await ResourceCategory.hasActiveTypes(id);
        if (hasActiveTypes) {
          return res.status(409).json({
            error: 'Cannot deactivate category with active resource types. Please deactivate all resource types first.'
          });
        }
      }

      // Update status
      const updatedCategory = await ResourceCategory.updateStatus(id, status);

      res.status(200).json(updatedCategory);
    } catch (error) {
      console.error('Error updating category status:', error);
      res.status(500).json({ error: 'Failed to update category status' });
    }
  }
}

module.exports = ResourceCategoryController;
