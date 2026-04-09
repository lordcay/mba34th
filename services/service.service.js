// services/service.service.js
import api from './api';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://three4th-street-backend.onrender.com';

const serviceService = {
  // ===== PUBLIC SERVICES =====
  
  // Get all approved services (public browse)
  getApprovedServices: async (page = 1, limit = 15, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: 'approved',
        ...filters,
      });
      const response = await api.get(`/services?${params}`);
      return {
        success: true,
        data: response.data?.data || response.data?.services || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching approved services:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get services by category
  getServicesByCategory: async (category, page = 1, limit = 15, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        category,
        status: 'approved',
        ...filters,
      });
      const response = await api.get(`/services/category/${category}?${params}`);
      return {
        success: true,
        data: response.data?.data || response.data?.services || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching services by category:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Search services
  searchServices: async (query, filters = {}) => {
    try {
      const params = new URLSearchParams({
        q: query,
        status: 'approved',
        ...filters,
      });
      const response = await api.get(`/services/search?${params}`);
      return {
        success: true,
        data: response.data?.data || response.data?.services || [],
      };
    } catch (error) {
      console.error('Error searching services:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Get single service details
  getServiceDetail: async (serviceId) => {
    try {
      const response = await api.get(`/services/${serviceId}`);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error) {
      console.error('Error fetching service details:', error);
      return { success: false, error: error.message };
    }
  },

  // ===== USER SERVICES =====

  // Get current user's services (all statuses)
  getMyServices: async (page = 1, limit = 15, status = undefined) => {
    try {
      let url = `/services/my-services?page=${page}&limit=${limit}`;
      if (status && status !== 'all') {
        url += `&status=${status}`;
      }
      const response = await api.get(url);
      return {
        success: true,
        data: response.data?.data || response.data?.services || [],
        pagination: response.data?.pagination || { hasNext: false, hasPrev: false },
      };
    } catch (error) {
      console.error('Error fetching my services:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Create a new service
  createService: async (serviceData) => {
    try {
      const response = await api.post('/services', {
        title: serviceData.title,
        description: serviceData.description,
        category: serviceData.category,
        subcategory: serviceData.subcategory,
        hourlyRate: serviceData.hourlyRate || null,
        basePrice: serviceData.basePrice || null,
        currency: 'USD',
        location: serviceData.location || {},
        city: serviceData.city || '',
        state: serviceData.state || '',
        availability: serviceData.availability || [],
        experience: serviceData.experience || '',
        skills: serviceData.skills || [],
        images: serviceData.images || [],
        duration: serviceData.duration || null, // in hours
        maxClients: serviceData.maxClients || null,
        minNotice: serviceData.minNotice || '24h', // advance booking required
        tags: serviceData.tags || [],
        verified: false,
        status: 'pending', // pending → admin review → approved/rejected
      });

      return {
        success: true,
        data: response.data?.data || response.data,
        message: 'Service created successfully. Awaiting admin approval.',
      };
    } catch (error) {
      console.error('Error creating service:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // Update service (only if pending)
  updateService: async (serviceId, updates) => {
    try {
      const response = await api.put(`/services/${serviceId}`, updates);
      return {
        success: true,
        data: response.data?.data || response.data,
        message: 'Service updated successfully.',
      };
    } catch (error) {
      console.error('Error updating service:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // Delete service
  deleteService: async (serviceId) => {
    try {
      await api.delete(`/services/${serviceId}`);
      return { success: true, message: 'Service deleted successfully.' };
    } catch (error) {
      console.error('Error deleting service:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // ===== ADMIN FUNCTIONS =====

  // Get pending services for admin review
  getPendingServices: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/services/admin/pending?page=${page}&limit=${limit}`);
      return {
        success: true,
        data: response.data?.data || response.data?.services || [],
        pagination: response.data?.pagination || { hasMore: false },
      };
    } catch (error) {
      console.error('Error fetching pending services:', error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Approve service (admin only)
  approveService: async (serviceId, notes = '') => {
    try {
      const response = await api.post(`/services/${serviceId}/approve`, { notes });
      return {
        success: true,
        data: response.data?.data || response.data,
        message: 'Service approved successfully.',
      };
    } catch (error) {
      console.error('Error approving service:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  // Reject service (admin only)
  rejectService: async (serviceId, reason) => {
    try {
      const response = await api.post(`/services/${serviceId}/reject`, { reason });
      return {
        success: true,
        data: response.data?.data || response.data,
        message: 'Service rejected.',
      };
    } catch (error) {
      console.error('Error rejecting service:', error);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  },
};

export default serviceService;
