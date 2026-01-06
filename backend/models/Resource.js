const supabase = require('../config/supabase');

class Resource {
  // Get all active resources
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          manager:users!managed_by(id, name, email)
        `)
        .eq('status', 'active')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting resources:', error);
      throw error;
    }
  }

  // Get resource by ID
  static async getById(id) {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          manager:users!managed_by(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting resource by ID:', error);
      throw error;
    }
  }

  // Get resources by category
  static async getByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          manager:users!managed_by(id, name, email)
        `)
        .eq('status', 'active')
        .eq('category', category)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
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

  // Get available resources for a specific time range with quantities
  static async getAvailableResources(startDatetime, endDatetime, category = null) {
    try {
      // Get all active resources
      let query = supabase
        .from('resources')
        .select(`
          *,
          manager:users!managed_by(id, name, email)
        `)
        .eq('status', 'active');

      if (category) {
        query = query.eq('category', category);
      }

      const { data: resources, error } = await query.order('category', { ascending: true }).order('name', { ascending: true });

      if (error) throw error;

      if (!resources || resources.length === 0) {
        return [];
      }

      // Check availability for each resource
      const availabilityChecks = await Promise.all(
        resources.map(async (resource) => {
          const availability = await this.checkAvailableQuantity(resource.id, startDatetime, endDatetime);
          return { 
            ...resource, 
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
