import axios from 'axios';

const API_URL = 'http://localhost:5001/api/event-feedbacks';

// Get token helper
const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

// Get events eligible for feedback
export const getEligibleEvents = async () => {
  const response = await axios.get(`${API_URL}/eligible-events`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Create feedback
export const createFeedback = async (feedbackData) => {
  const response = await axios.post(API_URL, feedbackData, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Update feedback
export const updateFeedback = async (feedbackId, feedbackData) => {
  const response = await axios.put(`${API_URL}/${feedbackId}`, feedbackData, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get feedbacks for an event
export const getFeedbacksForEvent = async (eventId) => {
  const response = await axios.get(`${API_URL}/event/${eventId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get user's feedback for a specific event
export const getUserFeedbackForEvent = async (eventId) => {
  const response = await axios.get(`${API_URL}/user-feedback/${eventId}`, {
    headers: getAuthHeader()
  });
  return response.data;
};

// Get all feedbacks submitted by current user
export const getMyFeedbacks = async () => {
  const response = await axios.get(`${API_URL}/my-feedbacks`, {
    headers: getAuthHeader()
  });
  return response.data;
};
