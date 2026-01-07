const supabase = require('../config/supabase');

class Faculty {
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('faculties')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all faculties:', error);
      throw error;
    }
  }

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
}

module.exports = Faculty;
