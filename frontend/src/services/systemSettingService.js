import axios from 'axios';

const API_URL = 'http://localhost:5001/api/system-settings';

const systemSettingService = {
  getAllSettings: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.settings;
  },

  getSettingsObject: async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/object`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.settings;
  },

  updateSettings: async (settings) => {
    const token = localStorage.getItem('token');
    const response = await axios.put(API_URL, 
      { settings },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default systemSettingService;
