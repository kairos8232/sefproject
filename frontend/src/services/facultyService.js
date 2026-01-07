import axios from 'axios';

const API_URL = 'http://localhost:5001/api/faculties';

const facultyService = {
  // Get all faculties
  getAllFaculties: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Get faculty by ID
  getFacultyById: async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },
};

export default facultyService;
