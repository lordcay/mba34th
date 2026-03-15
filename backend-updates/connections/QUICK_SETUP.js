// ============================================
// CONNECTION FEATURE - QUICK SETUP FOR YOUR BACKEND
// ============================================
// 
// STEP 1: Create a new file called "Connection.js" in your models folder
// STEP 2: Copy this entire code block to your server.js (or routes file)
// STEP 3: Restart your backend server
//
// ============================================

// ===========================================
// STEP 1: ADD THIS MODEL (models/Connection.js)
// ===========================================
/*
const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'connected'], default: 'pending' },
  requestedAt: { type: Date, default: Date.now },
  connectedAt: { type: Date, default: null }
});

connectionSchema.index({ requester: 1, target: 1 }, { unique: true });

module.exports = mongoose.model('Connection', connectionSchema);
*/

// ===========================================
// STEP 2: ADD THESE ROUTES TO YOUR SERVER.JS
// ===========================================
// (Add after your other routes, before app.listen)

// First, add this require at the top of server.js:
// const Connection = require('./models/Connection');

// Then add these routes:

// ---- SEND CONNECTION REQUEST ----
app.post('/connections/request', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const requesterId = req.user._id || req.user.id;

    if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
    if (targetUserId === String(requesterId)) return res.status(400).json({ error: 'Cannot connect with yourself' });

    // Check existing
    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, target: targetUserId },
        { requester: targetUserId, target: requesterId }
      ]
    });

    if (existing) {
      if (existing.status === 'connected') return res.status(400).json({ error: 'Already connected' });
      if (existing.status === 'pending') return res.status(400).json({ error: 'Request already pending' });
    }

    const connection = await Connection.create({
      requester: requesterId,
      target: targetUserId,
      status: 'pending'
    });

    // Send push notification to target user
    const requester = await User.findById(requesterId).select('firstName lastName');
    const targetUser = await User.findById(targetUserId).select('pushToken');
    const requesterName = `${requester?.firstName || ''} ${requester?.lastName || ''}`.trim();

    if (targetUser?.pushToken) {
      // Use your existing push notification function
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetUser.pushToken,
          title: 'New Connection Request',
          body: `${requesterName} wants to connect with you`,
          data: { type: 'connection_request', requesterId: String(requesterId) }
        })
      });
    }

    res.status(201).json({ message: 'Request sent', connectionId: connection._id });
  } catch (err) {
    console.error('Send connection request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// ---- CANCEL CONNECTION REQUEST ----
app.delete('/connections/request/:targetUserId', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const requesterId = req.user._id || req.user.id;

    await Connection.findOneAndDelete({ requester: requesterId, target: targetUserId, status: 'pending' });
    res.json({ message: 'Request cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// ---- ACCEPT CONNECTION REQUEST ----
app.post('/connections/accept/:requesterId', authenticateToken, async (req, res) => {
  try {
    const { requesterId } = req.params;
    const targetId = req.user._id || req.user.id;

    const connection = await Connection.findOneAndUpdate(
      { requester: requesterId, target: targetId, status: 'pending' },
      { status: 'connected', connectedAt: new Date() },
      { new: true }
    );

    if (!connection) return res.status(404).json({ error: 'No pending request' });

    // Notify requester
    const target = await User.findById(targetId).select('firstName lastName');
    const requester = await User.findById(requesterId).select('pushToken');
    const targetName = `${target?.firstName || ''} ${target?.lastName || ''}`.trim();

    if (requester?.pushToken) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: requester.pushToken,
          title: 'Connection Accepted! 🎉',
          body: `${targetName} accepted your connection request`,
          data: { type: 'connection_accepted', targetUserId: String(targetId) }
        })
      });
    }

    res.json({ message: 'Connected!', connection });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept' });
  }
});

// ---- DECLINE CONNECTION REQUEST ----
app.post('/connections/decline/:requesterId', authenticateToken, async (req, res) => {
  try {
    const { requesterId } = req.params;
    const targetId = req.user._id || req.user.id;

    await Connection.findOneAndDelete({ requester: requesterId, target: targetId, status: 'pending' });
    res.json({ message: 'Declined' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline' });
  }
});

// ---- REMOVE CONNECTION ----
app.delete('/connections/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id || req.user.id;

    await Connection.findOneAndDelete({
      $or: [
        { requester: currentUserId, target: userId, status: 'connected' },
        { requester: userId, target: currentUserId, status: 'connected' }
      ]
    });
    res.json({ message: 'Disconnected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ---- GET PENDING REQUESTS (received) ----
app.get('/connections/requests/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const requests = await Connection.find({ target: userId, status: 'pending' })
      .populate('requester', 'firstName lastName email photos industry type graduationYear origin')
      .sort({ requestedAt: -1 });

    res.json({ requests: requests.map(r => ({ ...r.toObject(), createdAt: r.requestedAt })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get requests' });
  }
});

// ---- GET SENT REQUESTS ----
app.get('/connections/requests/sent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const requests = await Connection.find({ requester: userId, status: 'pending' })
      .populate('target', 'firstName lastName email photos')
      .sort({ requestedAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
});

// ---- GET ALL CONNECTIONS ----
app.get('/connections', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const connections = await Connection.find({
      $or: [
        { requester: userId, status: 'connected' },
        { target: userId, status: 'connected' }
      ]
    })
    .populate('requester', 'firstName lastName email photos industry')
    .populate('target', 'firstName lastName email photos industry')
    .sort({ connectedAt: -1 });

    const formatted = connections.map(c => {
      const isRequester = String(c.requester._id) === String(userId);
      return { connectionId: c._id, user: isRequester ? c.target : c.requester, connectedAt: c.connectedAt };
    });

    res.json({ connections: formatted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

// ---- GET CONNECTION STATUS ----
app.get('/connections/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id || req.user.id;

    const connection = await Connection.findOne({
      $or: [
        { requester: currentUserId, target: userId },
        { requester: userId, target: currentUserId }
      ]
    });

    if (!connection) return res.json({ status: 'none' });
    if (connection.status === 'connected') return res.json({ status: 'connected' });
    
    // Check direction
    if (String(connection.requester) === String(currentUserId)) {
      return res.json({ status: 'pending' });
    }
    return res.json({ status: 'received' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ===========================================
// DONE! Restart your server after adding these
// ===========================================
