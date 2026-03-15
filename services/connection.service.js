// services/connection.service.js
// Connection Management Service for 34th Street
// Handles connection requests, accepts, declines, and listing connections

import api from './api';

/**
 * Send a connection request to another user
 * @param {string} targetUserId - The ID of the user to connect with
 * @returns {Promise} - API response
 */
export const sendConnectionRequest = async (targetUserId) => {
  const response = await api.post('/connections/request', { targetUserId });
  return response.data;
};

/**
 * Cancel a pending connection request
 * @param {string} targetUserId - The ID of the user whose request to cancel
 * @returns {Promise} - API response
 */
export const cancelConnectionRequest = async (targetUserId) => {
  const response = await api.delete(`/connections/request/${targetUserId}`);
  return response.data;
};

/**
 * Accept a connection request from another user
 * @param {string} requesterId - The ID of the user who sent the request
 * @returns {Promise} - API response
 */
export const acceptConnectionRequest = async (requesterId) => {
  const response = await api.post(`/connections/accept/${requesterId}`);
  return response.data;
};

/**
 * Decline a connection request from another user
 * @param {string} requesterId - The ID of the user who sent the request
 * @returns {Promise} - API response
 */
export const declineConnectionRequest = async (requesterId) => {
  const response = await api.post(`/connections/decline/${requesterId}`);
  return response.data;
};

/**
 * Remove an existing connection
 * @param {string} userId - The ID of the connected user to remove
 * @returns {Promise} - API response
 */
export const removeConnection = async (userId) => {
  const response = await api.delete(`/connections/${userId}`);
  return response.data;
};

/**
 * Get all pending connection requests received by the current user
 * @returns {Promise} - Array of pending requests
 */
export const getPendingRequests = async () => {
  try {
    const response = await api.get('/connections/requests/pending');
    return response.data;
  } catch (error) {
    console.error('Get pending requests failed:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all sent connection requests (pending outgoing)
 * @returns {Promise} - Array of sent requests
 */
export const getSentRequests = async () => {
  try {
    const response = await api.get('/connections/requests/sent');
    return response.data;
  } catch (error) {
    console.error('Get sent requests failed:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all connections for the current user
 * @returns {Promise} - Array of connections
 */
export const getMyConnections = async () => {
  try {
    const response = await api.get('/connections');
    return response.data;
  } catch (error) {
    console.error('Get connections failed:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get connection status with a specific user
 * @param {string} userId - The ID of the user to check
 * @returns {Promise} - Connection status: 'none' | 'pending' | 'connected' | 'received'
 */
export const getConnectionStatus = async (userId) => {
  try {
    const response = await api.get(`/connections/status/${userId}`);
    return response.data.status;
  } catch (error) {
    console.error('Get connection status failed:', error.response?.data || error.message);
    return 'none'; // Default to none if error
  }
};

/**
 * Get connection count for a user
 * @param {string} userId - The ID of the user (optional, defaults to current user)
 * @returns {Promise} - Number of connections
 */
export const getConnectionCount = async (userId = null) => {
  try {
    const url = userId ? `/connections/count/${userId}` : '/connections/count';
    const response = await api.get(url);
    return response.data.count;
  } catch (error) {
    console.error('Get connection count failed:', error.response?.data || error.message);
    return 0;
  }
};

export default {
  sendConnectionRequest,
  cancelConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  removeConnection,
  getPendingRequests,
  getSentRequests,
  getMyConnections,
  getConnectionStatus,
  getConnectionCount,
};
