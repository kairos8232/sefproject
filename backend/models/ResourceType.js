const supabase = require('../config/supabase');

class ResourceType {
  /**
   * Get all resource types with optional filters
   * @param {Object} filters - { category_id, status, search }
   */
  static async getAll(filters = {}) {
    try {
      let query = supabase
        .from('resource_types')
        .select(`
          *,
          resource_categories!inner(name, code)
        `);

      // Apply category filter
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform data to include category info at top level
      return (data || []).map(item => ({
        ...item,
        category_name: item.resource_categories?.name,
        category_code: item.resource_categories?.code
      }));
    } catch (error) {
      console.error('Error in ResourceType.getAll:', error);
      throw error;
    }
  }

  /**
   * Find a resource type by ID
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .select(`
          *,
          resource_categories!inner(name, code)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        category_name: data.resource_categories?.name,
        category_code: data.resource_categories?.code
      };
    } catch (error) {
      console.error('Error in ResourceType.findById:', error);
      throw error;
    }
  }

  /**
   * Find a resource type by code
   */
  static async findByCode(code) {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .select(`
          *,
          resource_categories!inner(name, code)
        `)
        .eq('code', code)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        category_name: data.resource_categories?.name,
        category_code: data.resource_categories?.code
      };
    } catch (error) {
      console.error('Error in ResourceType.findByCode:', error);
      throw error;
    }
  }

  /**
   * Create a new resource type
   */
  static async create(typeData) {
    try {
      const {
        category_id,
        code,
        name,
        description,
        total_quantity = 0,
        unit,
        status = 'active',
        notes
      } = typeData;

      const { data, error } = await supabase
        .from('resource_types')
        .insert([{
          category_id,
          code,
          name,
          description,
          total_quantity,
          unit,
          status,
          notes
        }])
        .select()
        .single();

      if (error) throw error;
      return await ResourceType.findById(data.id);
    } catch (error) {
      console.error('Error in ResourceType.create:', error);
      throw error;
    }
  }

  /**
   * Update a resource type
   */
  static async update(id, updateData) {
    try {
      const {
        category_id,
        code,
        name,
        description,
        total_quantity,
        unit,
        notes
      } = updateData;

      const { data, error } = await supabase
        .from('resource_types')
        .update({
          category_id,
          code,
          name,
          description,
          total_quantity,
          unit,
          notes,
          updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return await ResourceType.findById(data.id);
    } catch (error) {
      console.error('Error in ResourceType.update:', error);
      throw error;
    }
  }

  /**
   * Update resource type status
   */
  static async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .update({ status, updated_at: new Date() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return await ResourceType.findById(data.id);
    } catch (error) {
      console.error('Error in ResourceType.updateStatus:', error);
      throw error;
    }
  }

  /**
   * Check if resource type has pending requests
   * (Prevents deactivation if there are pending resource requests)
   */
  static async hasPendingRequests(typeId) {
    try {
      const { count, error } = await supabase
        .from('resource_requests')
        .select('*', { count: 'exact', head: true })
        .eq('resource_id', typeId)
        .eq('status', 'pending');

      if (error) throw error;
      return count > 0;
    } catch (error) {
      console.error('Error in ResourceType.hasPendingRequests:', error);
      throw error;
    }
  }
}

module.exports = ResourceType;
