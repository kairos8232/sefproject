const supabase = require('../config/supabase');

class Resource {
  // Get all active resource types
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .select(`
          *,
          category:resource_categories!inner(id, code, name),
          manager:users!managed_by(id, name, email)
        `)
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // Transform data to include category info at top level
      return (data || []).map(item => ({
        ...item,
        category_id: item.category?.id,
        category_code: item.category?.code,
        category_name: item.category?.name
      }));
    } catch (error) {
      console.error('Error getting resources:', error);
      throw error;
    }
  }

  // Get resource type by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .select(`
          *,
          category:resource_categories!inner(id, code, name),
          manager:users!managed_by(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        category_id: data.category?.id,
        category_code: data.category?.code,
        category_name: data.category?.name
      };
    } catch (error) {
      console.error('Error getting resource by ID:', error);
      throw error;
    }
  }

  // Get resource types by category ID
  static async getByCategory(categoryId) {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .select(`
          *,
          category:resource_categories!inner(id, code, name),
          manager:users!managed_by(id, name, email)
        `)
        .eq('status', 'active')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        category_id: item.category?.id,
        category_code: item.category?.code,
        category_name: item.category?.name
      }));
    } catch (error) {
      console.error('Error getting resources by category:', error);
      throw error;
    }
  }

  // Check available quantity for a specific date/time range
  static async checkAvailableQuantity(resourceId, startDatetime, endDatetime, excludeRequestId = null) {
    try {
      // Get the resource's total quantity
      const resource = await this.getById(resourceId);
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

  // Get available resource types for a specific time range with quantities
  static async getAvailableResources(startDatetime, endDatetime, categoryCodeOrId = null) {
    try {
      console.log('[Resource] getAvailableResources called with:', { startDatetime, endDatetime, categoryCodeOrId });
      
      // Get all active resource types
      let query = supabase
        .from('resource_types')
        .select(`
          *,
          category:resource_categories!inner(id, code, name),
          manager:users!managed_by(id, name, email)
        `)
        .eq('status', 'active');

      // First check if filtering by UUID (can be done in query)
      let filterByCode = null;
      if (categoryCodeOrId) {
        console.log('[Resource] Filtering by category:', categoryCodeOrId);
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
        const categoryCodes = resources.map(r => r.category?.code).filter(Boolean);
        console.log(`[Resource] Available category codes in results:`, categoryCodes);
        console.log(`[Resource] Looking for category code:`, filterByCode);
        
        filteredResources = resources.filter(r => r.category?.code === filterByCode);
        console.log(`[Resource] Filtered ${resources.length} resources to ${filteredResources.length} matching code: ${filterByCode}`);
        
        // If no matches, show first resource's category for debugging
        if (filteredResources.length === 0 && resources.length > 0) {
          console.log(`[Resource] Sample resource category:`, resources[0].category);
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
            category_id: resource.category?.id,
            category_code: resource.category?.code,
            category_name: resource.category?.name,
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

module.exports = Resource;
