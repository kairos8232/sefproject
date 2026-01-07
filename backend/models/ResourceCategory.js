const supabase = require('../config/supabase');

class ResourceCategory {
  /**
   * Get all resource categories with optional filters
   * @param {Object} filters - { status, search }
   */
  static async getAll(filters = {}) {
    try {
      let query = supabase
        .from('resource_categories')
        .select('*');

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply search filter (code or name)
      if (filters.search) {
        query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in ResourceCategory.getAll:', error);
      throw error;
    }
  }

  /**
   * Find a category by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('resource_categories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in ResourceCategory.findById:', error);
      throw error;
    }
  }

  /**
   * Find a category by code
   */
  static async findByCode(code) {
    try {
      const { data, error } = await supabase
        .from('resource_categories')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in ResourceCategory.findByCode:', error);
      throw error;
    }
  }

  /**
   * Create a new resource category
   */
  static async create(categoryData) {
    try {
      const { code, name, description, status = 'active' } = categoryData;

      const { data, error } = await supabase
        .from('resource_categories')
        .insert([{ code, name, description, status }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in ResourceCategory.create:', error);
      throw error;
    }
  }

  /**
   * Update a resource category
   */
  static async update(id, updateData) {
    try {
      const { code, name, description } = updateData;

      const { data, error } = await supabase
        .from('resource_categories')
        .update({ code, name, description, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in ResourceCategory.update:', error);
      throw error;
    }
  }

  /**
   * Update category status
   */
  static async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('resource_categories')
        .update({ status, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in ResourceCategory.updateStatus:', error);
      throw error;
    }
  }

  /**
   * Check if category has active resource types
   */
  static async hasActiveTypes(categoryId) {
    try {
      const { count, error } = await supabase
        .from('resource_types')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId)
        .eq('status', 'active');

      if (error) throw error;
      return count > 0;
    } catch (error) {
      console.error('Error in ResourceCategory.hasActiveTypes:', error);
      throw error;
    }
  }

  /**
   * Count resource types in this category
   */
  static async countTypes(categoryId) {
    try {
      const { count, error } = await supabase
        .from('resource_types')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error in ResourceCategory.countTypes:', error);
      throw error;
    }
  }
}

module.exports = ResourceCategory;
