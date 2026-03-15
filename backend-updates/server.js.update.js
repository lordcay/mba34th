// ============================================
// SERVER.JS UPDATE - Group Message Push Notifications
// ============================================
// 
// INSTRUCTIONS: Add these changes to your existing server.js
// This adds push notifications for chatroom/group messages
// which is currently missing from your backend
//
// ============================================

// 1. Add this import at the top of server.js (after other requires)
// --------------------------------------------
const { sendGroupNotification } = require('./services/pushNotification.service');


// 2. Replace your existing 'sendChatroomMessage' socket handler with this:
// --------------------------------------------
// Find this section in your server.js and replace it:

socket.on('sendChatroomMessage', async ({ chatroomId, senderId, message, media, senderName, avatarUrl }) => {
  try {
    // 🔥 1. OBJECTIONABLE CONTENT FILTER (same as DM logic)
    const containsObjectionableContent = require('./utils/filterObjectionableContent');
    if (message && containsObjectionableContent(message)) {
      return io.to(socket.id).emit('chatroom:error', {
        message: 'Message contains inappropriate content.',
      });
    }

    // 2. Save message to database
    const newMessage = await ChatroomMessage.create({
      chatroomId, 
      senderId, 
      message, 
      media, 
      readBy: [senderId], 
      senderName, 
      avatarUrl
    });

    const payload = {
      ...newMessage.toObject(),
      senderName: senderName || 'Someone'
    };

    // 3. Emit to all users in the chatroom room
    io.to(chatroomId).emit('newChatroomMessage', payload);

    // 4. Global notify for badge updates
    io.emit('chatroom:notify', {
      chatroomId,
      senderId,
      messageId: newMessage._id,
    });

    console.log(`💬 Message sent to chatroom ${chatroomId}`);

    // =============================================
    // 5. 🔔 PUSH NOTIFICATIONS FOR GROUP MESSAGES
    // This is the NEW code that sends push notifications
    // to members not currently connected via socket
    // =============================================
    try {
      // Get chatroom with members
      const Chatroom = require('./chatroom/chatroom.model');
      const Account = require('./accounts/account.model');
      
      const chatroom = await Chatroom.findById(chatroomId)
        .populate('members', '_id expoPushToken')
        .lean();

      if (chatroom && chatroom.members) {
        // Get all members' push tokens (excluding sender)
        const memberTokens = chatroom.members
          .filter(member => {
            // Exclude the sender
            if (String(member._id) === String(senderId)) return false;
            // Only include members with valid push tokens
            if (!member.expoPushToken) return false;
            // Check if member is NOT currently connected via socket
            // (If they're connected, they'll get the socket event)
            const memberSocketId = connectedUsers[String(member._id)];
            // Still send push even if connected - they may have app backgrounded
            return true;
          })
          .map(member => ({
            token: member.expoPushToken,
            recipientId: member._id
          }));

        if (memberTokens.length > 0) {
          await sendGroupNotification({
            memberTokens,
            chatroomId,
            chatroomName: chatroom.name || 'Group chat',
            senderName: senderName || 'Someone',
            senderId,
            message
          });
          console.log(`📤 Sent push to ${memberTokens.length} chatroom members`);
        }
      }
    } catch (pushError) {
      // Don't fail the message send if push fails
      console.error('❌ Failed to send group push notifications:', pushError.message);
    }
    // =============================================

  } catch (err) {
    console.error('❌ Error sending chatroom message:', err);
  }
});


// ============================================
// 3. ALTERNATIVE: If you want to send push from the HTTP endpoint
//    instead of (or in addition to) the socket handler
// ============================================
// Add this to chatroomMessage.controller.js in the sendMessage function:

/*
// After saving the message and emitting socket events, add:

try {
  const Chatroom = require('../chatroom/chatroom.model');
  const { sendGroupNotification } = require('../services/pushNotification.service');
  
  const chatroom = await Chatroom.findById(chatroomId)
    .populate('members', '_id expoPushToken firstName')
    .lean();

  if (chatroom && chatroom.members) {
    const memberTokens = chatroom.members
      .filter(m => m.expoPushToken && String(m._id) !== String(senderId))
      .map(m => ({ token: m.expoPushToken, recipientId: m._id }));

    if (memberTokens.length > 0) {
      await sendGroupNotification({
        memberTokens,
        chatroomId,
        chatroomName: chatroom.name,
        senderName: req.user?.firstName || 'Someone',
        senderId,
        message
      });
    }
  }
} catch (pushErr) {
  console.error('Push notification error:', pushErr.message);
}
*/
