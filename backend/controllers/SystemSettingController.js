const SystemSetting = require('../models/SystemSetting');

class SystemSettingController {
  /**
   * Get all system settings
   */
  static async getAllSettings(req, res) {
    try {
      const settings = await SystemSetting.getAll();
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system settings'
      });
    }
  }

  /**
   * Get settings as key-value object
   */
  static async getSettingsObject(req, res) {
    try {
      const settings = await SystemSetting.getSettingsObject();
      
      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch system settings'
      });
    }
  }

  /**
   * Update system settings
   */
  static async updateSettings(req, res) {
    try {
      const { settings } = req.body;
      const userId = req.user.id;

      // Validate settings object
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid settings data'
        });
      }

      // Validate booking days settings if present
      if (settings.min_advance_booking_days !== undefined || 
          settings.max_advance_booking_days !== undefined) {
        
        // Get current values
        const currentSettings = await SystemSetting.getSettingsObject();
        const minDays = settings.min_advance_booking_days !== undefined 
          ? Number(settings.min_advance_booking_days)
          : currentSettings.min_advance_booking_days;
        const maxDays = settings.max_advance_booking_days !== undefined
          ? Number(settings.max_advance_booking_days)
          : currentSettings.max_advance_booking_days;

        // Validation
        if (isNaN(minDays) || isNaN(maxDays)) {
          return res.status(400).json({
            success: false,
            error: 'Booking days must be valid numbers'
          });
        }

        if (minDays < 0 || maxDays < 0) {
          return res.status(400).json({
            success: false,
            error: 'Booking days cannot be negative'
          });
        }

        if (minDays >= maxDays) {
          return res.status(400).json({
            success: false,
            error: 'Minimum advance booking days must be less than maximum advance booking days'
          });
        }
      }

      // Update settings
      const updatedSettings = await SystemSetting.updateMultiple(settings, userId);

      res.json({
        success: true,
        message: 'System settings updated successfully',
        settings: updatedSettings
      });
    } catch (error) {
      console.error('Error updating system settings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update system settings'
      });
    }
  }
}

module.exports = SystemSettingController;
