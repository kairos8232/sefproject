// Event Feedback Service
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Get all feedbacks for an event (for faculty viewing all feedbacks)
export const getFeedbacksForEvent = async (eventId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/event-feedbacks/event/${eventId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get feedbacks');
  }

  return response.json();
};

// Get user's own feedback for a specific event
export const getUserFeedbackForEvent = async (eventId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/event-feedbacks/event/${eventId}/my-feedback`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get feedback');
  }

  return response.json();
};

// Create new feedback
export const createFeedback = async (feedbackData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/event-feedbacks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedbackData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit feedback');
  }

  return response.json();
};

// Update existing feedback
export const updateFeedback = async (feedbackId, feedbackData) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/event-feedbacks/${feedbackId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedbackData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to update feedback');
  }

  return response.json();
};

// Delete feedback
export const deleteFeedback = async (feedbackId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/event-feedbacks/${feedbackId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete feedback');
  }

  return response.json();
};

const feedbackService = {
  getFeedbacksForEvent,
  getUserFeedbackForEvent,
  createFeedback,
  updateFeedback,
  deleteFeedback
};

export default feedbackService;
