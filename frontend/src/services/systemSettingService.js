import apiClient from './apiClient';

const systemSettingService = {
  getAllSettings: async () => {
    const response = await apiClient.get('/system-settings');
    return response.data.settings;
  },

  getSettingsObject: async () => {
    const response = await apiClient.get('/system-settings/object');
    return response.data.settings;
  },

  updateSettings: async (settings) => {
    const response = await apiClient.put('/system-settings', { settings });
    return response.data;
  }
};

export default systemSettingService;
