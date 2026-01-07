const supabase = require('../config/supabase');

class SystemSetting {
  /**
   * Get all system settings
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('system_settings')
      .select(`
        *,
        updater:users!system_settings_updated_by_fkey(id, name, email)
      `)
      .order('setting_key', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Get a specific setting by key
   */
  static async getByKey(key) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', key)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a setting (creates if doesn't exist)
   */
  static async update(key, value, updatedBy) {
    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value.toString(),
        updated_by: updatedBy
      }, {
        onConflict: 'setting_key'
      })
      .select(`
        *,
        updater:users!system_settings_updated_by_fkey(id, name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update multiple settings at once
   */
  static async updateMultiple(settings, updatedBy) {
    const updates = [];
    
    for (const [key, value] of Object.entries(settings)) {
      const data = await this.update(key, value, updatedBy);
      updates.push(data);
    }

    return updates;
  }

  /**
   * Get settings as a key-value object
   */
  static async getSettingsObject() {
    const settings = await this.getAll();
    const settingsObj = {};
    
    settings.forEach(setting => {
      // Try to parse as number if possible
      const numValue = Number(setting.setting_value);
      settingsObj[setting.setting_key] = isNaN(numValue) 
        ? setting.setting_value 
        : numValue;
    });

    return settingsObj;
  }
}

module.exports = SystemSetting;
