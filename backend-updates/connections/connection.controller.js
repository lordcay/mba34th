// ============================================
// Backend Connection Controller
// File: backend-updates/connections/connection.controller.js
// Handles all connection request logic with push notifications
// ============================================

const Connection = require('./connection.model'); // You'll need to create this model
const User = require('../models/User'); // Your existing User model
const { sendExpoPush } = require('../services/pushNotification.service');

/**
 * Send a connection request to another user
 */
exports.sendRequest = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const requesterId = req.user._id || req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    if (targetUserId === String(requesterId)) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    // Check if connection or request already exists
    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, target: targetUserId },
        { requester: targetUserId, target: requesterId }
      ]
    });

    if (existing) {
      if (existing.status === 'connected') {
        return res.status(400).json({ error: 'Already connected' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Request already pending' });
      }
    }

    // Create new connection request
    const connection = new Connection({
      requester: requesterId,
      target: targetUserId,
      status: 'pending',
      requestedAt: new Date()
    });

    await connection.save();

    // Get requester's info for notification
    const requester = await User.findById(requesterId).select('firstName lastName');
    const requesterName = `${requester.firstName || ''} ${requester.lastName || ''}`.trim();

    // Get target user's push token
    const targetUser = await User.findById(targetUserId).select('pushToken');

    // Send push notification to target user
    if (targetUser?.pushToken) {
      await sendExpoPush({
        to: targetUser.pushToken,
        title: 'New Connection Request',
        body: `${requesterName} wants to connect with you`,
        data: {
          type: 'connection_request',
          requesterId: String(requesterId),
          requesterName,
          screen: 'ConnectionRequests'
        },
        channelId: 'default'
      });
    }

    res.status(201).json({
      message: 'Connection request sent',
      connection: {
        id: connection._id,
        status: connection.status,
        targetUserId
      }
    });

  } catch (error) {
    console.error('Send connection request error:', error);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
};

/**
 * Cancel a sent connection request
 */
exports.cancelRequest = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const requesterId = req.user._id || req.user.id;

    const deleted = await Connection.findOneAndDelete({
      requester: requesterId,
      target: targetUserId,
      status: 'pending'
    });

    if (!deleted) {
      return res.status(404).json({ error: 'No pending request found' });
    }

    res.json({ message: 'Connection request cancelled' });

  } catch (error) {
    console.error('Cancel connection request error:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
};

/**
 * Accept a connection request
 */
exports.acceptRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const targetId = req.user._id || req.user.id;

    const connection = await Connection.findOne({
      requester: requesterId,
      target: targetId,
      status: 'pending'
    });

    if (!connection) {
      return res.status(404).json({ error: 'No pending request found' });
    }

    // Update connection status
    connection.status = 'connected';
    connection.connectedAt = new Date();
    await connection.save();

    // Get target's info for notification
    const target = await User.findById(targetId).select('firstName lastName');
    const targetName = `${target.firstName || ''} ${target.lastName || ''}`.trim();

    // Get requester's push token
    const requester = await User.findById(requesterId).select('pushToken');

    // Send push notification to requester
    if (requester?.pushToken) {
      await sendExpoPush({
        to: requester.pushToken,
        title: 'Connection Accepted! 🎉',
        body: `${targetName} accepted your connection request`,
        data: {
          type: 'connection_accepted',
          targetUserId: String(targetId),
          targetName,
          screen: 'UserProfile'
        },
        channelId: 'default'
      });
    }

    res.json({
      message: 'Connection accepted',
      connection: {
        id: connection._id,
        status: 'connected',
        connectedAt: connection.connectedAt
      }
    });

  } catch (error) {
    console.error('Accept connection request error:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
};

/**
 * Decline a connection request
 */
exports.declineRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const targetId = req.user._id || req.user.id;

    const deleted = await Connection.findOneAndDelete({
      requester: requesterId,
      target: targetId,
      status: 'pending'
    });

    if (!deleted) {
      return res.status(404).json({ error: 'No pending request found' });
    }

    res.json({ message: 'Connection request declined' });

  } catch (error) {
    console.error('Decline connection request error:', error);
    res.status(500).json({ error: 'Failed to decline request' });
  }
};

/**
 * Remove an existing connection
 */
exports.removeConnection = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id || req.user.id;

    const deleted = await Connection.findOneAndDelete({
      $or: [
        { requester: currentUserId, target: userId, status: 'connected' },
        { requester: userId, target: currentUserId, status: 'connected' }
      ]
    });

    if (!deleted) {
      return res.status(404).json({ error: 'No connection found' });
    }

    res.json({ message: 'Connection removed' });

  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
};

/**
 * Get pending requests received by current user
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const requests = await Connection.find({
      target: userId,
      status: 'pending'
    })
    .populate('requester', 'firstName lastName email photos industry type graduationYear origin')
    .sort({ requestedAt: -1 });

    res.json({
      requests: requests.map(r => ({
        id: r._id,
        requester: r.requester,
        requestedAt: r.requestedAt,
        createdAt: r.requestedAt
      }))
    });

  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
};

/**
 * Get sent requests (outgoing pending)
 */
exports.getSentRequests = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const requests = await Connection.find({
      requester: userId,
      status: 'pending'
    })
    .populate('target', 'firstName lastName email photos industry')
    .sort({ requestedAt: -1 });

    res.json({
      requests: requests.map(r => ({
        id: r._id,
        target: r.target,
        requestedAt: r.requestedAt
      }))
    });

  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
};

/**
 * Get all connections for current user
 */
exports.getConnections = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const connections = await Connection.find({
      $or: [
        { requester: userId, status: 'connected' },
        { target: userId, status: 'connected' }
      ]
    })
    .populate('requester', 'firstName lastName email photos industry type')
    .populate('target', 'firstName lastName email photos industry type')
    .sort({ connectedAt: -1 });

    // Format to return the "other" user
    const formatted = connections.map(c => {
      const isRequester = String(c.requester._id) === String(userId);
      const otherUser = isRequester ? c.target : c.requester;
      return {
        connectionId: c._id,
        user: otherUser,
        connectedAt: c.connectedAt
      };
    });

    res.json({ connections: formatted });

  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
};

/**
 * Get connection status with a specific user
 */
exports.getStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id || req.user.id;

    const connection = await Connection.findOne({
      $or: [
        { requester: currentUserId, target: userId },
        { requester: userId, target: currentUserId }
      ]
    });

    if (!connection) {
      return res.json({ status: 'none' });
    }

    if (connection.status === 'connected') {
      return res.json({ status: 'connected' });
    }

    // Check if current user sent the request or received it
    if (String(connection.requester) === String(currentUserId)) {
      return res.json({ status: 'pending' }); // Outgoing
    } else {
      return res.json({ status: 'received' }); // Incoming
    }

  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
};

/**
 * Get connection count for current user
 */
exports.getCount = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const count = await Connection.countDocuments({
      $or: [
        { requester: userId, status: 'connected' },
        { target: userId, status: 'connected' }
      ]
    });

    res.json({ count });

  } catch (error) {
    console.error('Get connection count error:', error);
    res.status(500).json({ error: 'Failed to get count' });
  }
};

/**
 * Get connection count for a specific user
 */
exports.getCountForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const count = await Connection.countDocuments({
      $or: [
        { requester: userId, status: 'connected' },
        { target: userId, status: 'connected' }
      ]
    });

    res.json({ count });

  } catch (error) {
    console.error('Get connection count for user error:', error);
    res.status(500).json({ error: 'Failed to get count' });
  }
};
