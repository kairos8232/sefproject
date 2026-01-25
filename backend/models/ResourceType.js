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

  /**
   * Check available quantity for a specific date/time range
   * @param {string} resourceId - Resource type ID
   * @param {string} startDatetime - Start time
   * @param {string} endDatetime - End time
   * @param {string} excludeRequestId - Optional request ID to exclude from calculation
   */
  static async checkAvailableQuantity(resourceId, startDatetime, endDatetime, excludeRequestId = null) {
    try {
      // Get the resource's total quantity
      const resource = await this.findById(resourceId);
      if (!resource) {
        throw new Error('Resource not found');
      }

      // Get all approved requests that overlap with the requested time
      let query = supabase
        .from('resource_requests')
        .select('requested_quantity')
        .eq('resource_id', resourceId)
        .eq('status', 'approved')
        .lt('usage_start_datetime', endDatetime)
        .gt('usage_end_datetime', startDatetime);

      // Exclude a specific request (useful for updates)
      if (excludeRequestId) {
        query = query.neq('id', excludeRequestId);
      }

      const { data: overlappingRequests, error } = await query;

      if (error) {
        console.error('Error checking available quantity:', error);
        throw error;
      }

      // Calculate total quantity already allocated
      const allocatedQuantity = overlappingRequests.reduce(
        (sum, req) => sum + (req.requested_quantity || 0),
        0
      );

      // Calculate available quantity
      const availableQuantity = resource.total_quantity - allocatedQuantity;

      return {
        total: resource.total_quantity,
        allocated: allocatedQuantity,
        available: Math.max(0, availableQuantity)
      };
    } catch (error) {
      console.error('Error checking available quantity:', error);
      throw error;
    }
  }

  /**
   * Get available resource types for a specific time range with quantities
   * @param {string} startDatetime - Start time
   * @param {string} endDatetime - End time
   * @param {string} categoryCodeOrId - Optional category code or ID to filter
   */
  static async getAvailableForTimeRange(startDatetime, endDatetime, categoryCodeOrId = null) {
    try {
      console.log('[ResourceType] getAvailableForTimeRange called with:', { startDatetime, endDatetime, categoryCodeOrId });
      
      // Get all active resource types
      let query = supabase
        .from('resource_types')
        .select(`
          *,
          resource_categories!inner(id, code, name)
        `)
        .eq('status', 'active');

      // First check if filtering by UUID (can be done in query)
      let filterByCode = null;
      if (categoryCodeOrId) {
        console.log('[ResourceType] Filtering by category:', categoryCodeOrId);
        const isUUID = categoryCodeOrId.includes('-');
        if (isUUID) {
          query = query.eq('category_id', categoryCodeOrId);
        } else {
          // For category code, we'll filter after fetching
          filterByCode = categoryCodeOrId;
        }
      }

      const { data: resources, error } = await query.order('name', { ascending: true });

      if (error) {
        console.error('Error fetching resources:', error);
        throw error;
      }

      // Filter by category code if needed (after query)
      let filteredResources = resources;
      if (filterByCode && resources) {
        // Debug: Log all category codes to see what we have
        const categoryCodes = resources.map(r => r.resource_categories?.code).filter(Boolean);
        console.log(`[ResourceType] Available category codes in results:`, categoryCodes);
        console.log(`[ResourceType] Looking for category code:`, filterByCode);
        
        filteredResources = resources.filter(r => r.resource_categories?.code === filterByCode);
        console.log(`[ResourceType] Filtered ${resources.length} resources to ${filteredResources.length} matching code: ${filterByCode}`);
        
        // If no matches, show first resource's category for debugging
        if (filteredResources.length === 0 && resources.length > 0) {
          console.log(`[ResourceType] Sample resource category:`, resources[0].resource_categories);
        }
      }

      if (!filteredResources || filteredResources.length === 0) {
        return [];
      }

      // Check availability for each resource
      const availabilityChecks = await Promise.all(
        filteredResources.map(async (resource) => {
          const availability = await this.checkAvailableQuantity(resource.id, startDatetime, endDatetime);
          return { 
            ...resource,
            category_id: resource.resource_categories?.id,
            category_code: resource.resource_categories?.code,
            category_name: resource.resource_categories?.name,
            availableQuantity: availability.available,
            allocatedQuantity: availability.allocated
          };
        })
      );

      return availabilityChecks;
    } catch (error) {
      console.error('Error getting available resources:', error);
      throw error;
    }
  }
}

module.exports = ResourceType;
