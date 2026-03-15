// ============================================
// Backend Connection Feature Implementation
// File: backend-updates/connections/connection.routes.js
// Add these routes to your Express backend
// ============================================

const express = require('express');
const router = express.Router();
const connectionController = require('./connection.controller');
const { authenticate } = require('../middleware/auth'); // Your auth middleware

// All routes require authentication
router.use(authenticate);

// Send a connection request
router.post('/request', connectionController.sendRequest);

// Cancel a sent connection request
router.delete('/request/:targetUserId', connectionController.cancelRequest);

// Accept a connection request
router.post('/accept/:requesterId', connectionController.acceptRequest);

// Decline a connection request
router.post('/decline/:requesterId', connectionController.declineRequest);

// Remove an existing connection
router.delete('/:userId', connectionController.removeConnection);

// Get pending requests received
router.get('/requests/pending', connectionController.getPendingRequests);

// Get sent requests (outgoing)
router.get('/requests/sent', connectionController.getSentRequests);

// Get all connections
router.get('/', connectionController.getConnections);

// Get connection status with a specific user
router.get('/status/:userId', connectionController.getStatus);

// Get connection count
router.get('/count', connectionController.getCount);
router.get('/count/:userId', connectionController.getCountForUser);

module.exports = router;

// ============================================
// Add to your main app.js or server.js:
// const connectionRoutes = require('./connections/connection.routes');
// app.use('/connections', connectionRoutes);
// ============================================
