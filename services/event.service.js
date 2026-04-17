// services/event.service.js
import api from './api';

const eventService = {
  // Get all events (with optional filters)
  getEvents: async (page = 1, limit = 15, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      const response = await api.get(`/events?${params}`);
      return {
        success: true,
        data: response.data?.data || response.data?.events || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching events:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get upcoming events
  getUpcomingEvents: async (page = 1, limit = 15) => {
    try {
      const response = await api.get(`/events/upcoming?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || response.data?.events || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching upcoming events:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get events created by the user
  getMyEvents: async (page = 1, limit = 15) => {
    try {
      const response = await api.get(`/events/my-events?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || response.data?.events || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching my events:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get events user is attending
  getAttendingEvents: async (page = 1, limit = 15) => {
    try {
      const response = await api.get(`/events/attending?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || response.data?.events || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching attending events:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get single event details
  getEventById: async (eventId) => {
    try {
      const response = await api.get(`/events/${eventId}`);
      return {
        success: true,
        data: response.data?.data || response.data?.event || null,
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      return { success: false, error: error.message };
    }
  },

  // Create a new event
  // Create a new event (photos are already Cloudinary URLs)
  createEvent: async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      return { success: true, data: response.data?.event || response.data };
    } catch (error) {
      console.error('Error creating event:', error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Update an event
  updateEvent: async (eventId, eventData) => {
    try {
      const response = await api.put(`/events/${eventId}`, eventData);
      return { success: true, data: response.data?.event || response.data };
    } catch (error) {
      console.error('Error updating event:', error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Delete an event
  deleteEvent: async (eventId) => {
    try {
      await api.delete(`/events/${eventId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting event:', error);
      return { success: false, error: error.message };
    }
  },

  // RSVP to an event
  rsvpEvent: async (eventId, status = 'going', visibility = 'everyone') => {
    try {
      const response = await api.post(`/events/${eventId}/rsvp`, { status, visibility });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      return { success: false, error: error.message };
    }
  },

  // Cancel RSVP
  cancelRsvp: async (eventId) => {
    try {
      const response = await api.post(`/events/${eventId}/rsvp`, { status: 'not_going' });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error cancelling RSVP:', error);
      return { success: false, error: error.message };
    }
  },

  // Get event attendees
  getAttendees: async (eventId, page = 1, limit = 20) => {
    try {
      const response = await api.get(`/events/${eventId}/attendees?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || response.data?.attendees || [],
      };
    } catch (error) {
      console.error('Error fetching attendees:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Search events
  searchEvents: async (query, page = 1, limit = 15) => {
    try {
      const response = await api.get(`/events/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || response.data?.events || [],
      };
    } catch (error) {
      console.error('Error searching events:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get past events (for reviews/trustworthiness)
  getPastEvents: async (page = 1, limit = 15) => {
    try {
      const response = await api.get(`/events/past?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching past events:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Add a comment to an event
  addComment: async (eventId, text, rating) => {
    try {
      const body = { text };
      if (rating) body.rating = rating;
      const response = await api.post(`/events/${eventId}/comments`, body);
      return { success: true, data: response.data?.data || response.data };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Get comments for an event
  getComments: async (eventId, page = 1, limit = 20) => {
    try {
      const response = await api.get(`/events/${eventId}/comments?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || [],
        averageRating: response.data?.averageRating || 0,
        total: response.data?.total || 0,
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching comments:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Delete a comment
  deleteComment: async (eventId, commentId) => {
    try {
      await api.delete(`/events/${eventId}/comments/${commentId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting comment:', error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
};

export default eventService;
