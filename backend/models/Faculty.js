const supabase = require('../config/supabase');

class Faculty {
  // Get all faculties with optional filters
  static async getAll(filters = {}) {
    try {
      let query = supabase
        .from('faculties')
        .select('*');

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply search filter (name or code)
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all faculties:', error);
      throw error;
    }
  }

  // Get faculty by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding faculty:', error);
      throw error;
    }
  }

  // Find faculty by code (for duplicate checking)
  static async findByCode(code) {
    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .eq('code', code)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data;
    } catch (error) {
      console.error('Error finding faculty by code:', error);
      throw error;
    }
  }

  // Create new faculty
  static async create(facultyData) {
    try {
      const { data, error } = await supabase
        .from('faculties')
        .insert([{
          code: facultyData.code,
          name: facultyData.name,
          description: facultyData.description || null,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating faculty:', error);
      throw error;
    }
  }

  // Update faculty
  static async update(id, updates) {
    try {
      const updateData = {
        updated_at: new Date().toISOString()
      };

      if (updates.code !== undefined) updateData.code = updates.code;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = updates.status;

      const { data, error } = await supabase
        .from('faculties')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating faculty:', error);
      throw error;
    }
  }

  // Check if faculty has active venues
  static async hasActiveVenues(facultyId) {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('id')
        .eq('faculty_id', facultyId)
        .eq('status', 'active')
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking active venues:', error);
      throw error;
    }
  }

  // Count venues for a faculty
  static async countVenues(facultyId) {
    try {
      const { count, error } = await supabase
        .from('venues')
        .select('id', { count: 'exact', head: true })
        .eq('faculty_id', facultyId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error counting venues:', error);
      throw error;
    }
  }
}

module.exports = Faculty;
