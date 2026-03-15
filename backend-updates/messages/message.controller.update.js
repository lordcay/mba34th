// ============================================
// message.controller.js - Updated DM Push Notification Section
// ============================================
// 
// This is an updated version of the sendMessage function
// with better push notification handling
//
// Replace the push notification section in your existing
// message.controller.js with this code
// ============================================

// At the top of the file, ensure you have:
const { sendExpoPush } = require('./utils/push');

// Find the sendMessage function and update the push notification section:

async function sendMessage(req, res, next) {
  try {
    const senderId = req.user.id;
    const { recipientId, message } = req.body;

    // 1) Content filter
    const containsObjectionableContent = require('../utils/filterObjectionableContent');
    if (message && containsObjectionableContent(message)) {
      return res.status(400).json({ message: 'Message contains inappropriate content.' });
    }

    // 2) Block check
    const Block = require('../blockUser/block.model');
    const blockExists = await Block.findOne({
      $or: [
        { blocker: senderId, blocked: recipientId },
        { blocker: recipientId, blocked: senderId }
      ]
    });
    if (blockExists) {
      return res.status(403).json({ message: 'You cannot message this user.' });
    }

    // 3) Save message
    const messageService = require('./message.service');
    const created = await messageService.create({ senderId, recipientId, message });
    const saved = await messageService.findByIdPopulated(created._id);

    // 4) Derive meta
    const senderName = [req.user?.firstName, req.user?.lastName]
      .filter(Boolean).join(' ').trim() || 'Someone';
    const preview = (message || '').toString().slice(0, 80);

    // 5) Socket notifications
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    
    // Emit to recipient
    const recipientSocketId = connectedUsers?.[recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newMessage', {
        message: saved,
        meta: {
          kind: 'dm',
          senderId: String(senderId),
          senderName,
          preview,
        },
      });
    }

    // Update conversation for both users
    const senderSocketId = connectedUsers?.[senderId];
    const conversationPayload = {
      peerA: String(senderId),
      peerB: String(recipientId),
      lastMessage: preview,
      timestamp: saved?.timestamp || Date.now(),
      unreadBumpFor: String(recipientId),
    };
    if (senderSocketId) io.to(senderSocketId).emit('conversation:update', conversationPayload);
    if (recipientSocketId) io.to(recipientSocketId).emit('conversation:update', conversationPayload);

    // =============================================
    // 6) 🔔 PUSH NOTIFICATION FOR DM
    // This sends push notification even when app is closed
    // =============================================
    try {
      const db = require('_helpers/db');
      const recipient = await db.Account.findById(recipientId)
        .select('expoPushToken firstName')
        .lean()
        .exec();
      
      const recipientPushToken = recipient?.expoPushToken;
      
      if (recipientPushToken) {
        await sendExpoPush({
          to: recipientPushToken,
          sound: 'default',
          title: `New message from ${senderName}`,
          body: preview,
          channelId: 'messages', // Important for Android
          priority: 'high',
          data: {
            kind: 'dm',
            senderId: String(senderId),
            senderName,
            otherUserId: String(senderId),
            preview,
            timestamp: Date.now(),
          },
        });
        console.log('✅ DM push notification sent to:', recipient?.firstName);
      } else {
        console.log('⚠️ Recipient has no push token');
      }
    } catch (pushError) {
      console.error('❌ Failed to send DM push notification:', pushError?.message);
      // Handle invalid token - optionally remove from database
      if (pushError.shouldRemoveToken) {
        try {
          const db = require('_helpers/db');
          await db.Account.findByIdAndUpdate(recipientId, { 
            $unset: { expoPushToken: 1 } 
          });
          console.log('🗑️ Removed invalid push token for user:', recipientId);
        } catch {}
      }
    }
    // =============================================

    // 7) Respond
    res.json(saved);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendMessage,
  getMessages: require('./message.controller').getMessages,
  getConversations: require('./message.controller').getConversations,
};
