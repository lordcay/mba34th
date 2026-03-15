// ============================================
// Backend Connection Model
// File: backend-updates/connections/connection.model.js
// Mongoose schema for user connections
// ============================================

const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  // User who sent the connection request
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // User who received the connection request
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Connection status
  status: {
    type: String,
    enum: ['pending', 'connected', 'declined'],
    default: 'pending',
    index: true
  },
  
  // When the request was sent
  requestedAt: {
    type: Date,
    default: Date.now
  },
  
  // When the connection was accepted (null if pending)
  connectedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
connectionSchema.index({ requester: 1, target: 1 }, { unique: true });
connectionSchema.index({ requester: 1, status: 1 });
connectionSchema.index({ target: 1, status: 1 });

// Static method to check if two users are connected
connectionSchema.statics.areConnected = async function(userId1, userId2) {
  const connection = await this.findOne({
    $or: [
      { requester: userId1, target: userId2, status: 'connected' },
      { requester: userId2, target: userId1, status: 'connected' }
    ]
  });
  return !!connection;
};

// Static method to get connection status between two users
connectionSchema.statics.getStatus = async function(currentUserId, otherUserId) {
  const connection = await this.findOne({
    $or: [
      { requester: currentUserId, target: otherUserId },
      { requester: otherUserId, target: currentUserId }
    ]
  });
  
  if (!connection) return 'none';
  if (connection.status === 'connected') return 'connected';
  
  // Check direction for pending
  if (String(connection.requester) === String(currentUserId)) {
    return 'pending'; // Current user sent the request
  }
  return 'received'; // Current user received the request
};

const Connection = mongoose.model('Connection', connectionSchema);

module.exports = Connection;
