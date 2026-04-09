// ============================================
// BACKEND FIX: Sender Name in Push Notifications
// ============================================
// 
// The issue is that push notifications show "Someone" instead of the actual sender name.
// This happens because the backend doesn't properly include senderName in the push payload.
//
// ============================================

// ==========================================
// FIX 1: messages/message.controller.js
// ==========================================
// 
// In the sendMessage function, make sure you're fetching the sender's name
// and including it in the push notification:

async function sendMessage(req, res, next) {
  try {
    const senderId = req.user.id;
    const { recipientId, message } = req.body;

    // ... content filter and block check ...

    // Save message
    const created = await messageService.create({ senderId, recipientId, message });
    const saved = await messageService.findByIdPopulated(created._id);

    // ✅ FIX: Get sender name - check multiple sources
    let senderName = [req.user?.firstName, req.user?.lastName]
      .filter(Boolean).join(' ').trim();
    
    // If req.user doesn't have name, fetch from database
    if (!senderName || senderName === '') {
      const db = require('_helpers/db');
      const senderAccount = await db.Account.findById(senderId).select('firstName lastName').lean();
      senderName = [senderAccount?.firstName, senderAccount?.lastName]
        .filter(Boolean).join(' ').trim() || 'Someone';
    }

    const preview = (message || '').toString().slice(0, 80);

    // Socket notifications
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    
    const recipientSocketId = connectedUsers?.[recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newMessage', {
        message: saved,
        // ✅ Include sender info in wrapper
        sender: {
          id: String(senderId),
          firstName: senderName.split(' ')[0] || senderName,
        },
        meta: {
          kind: 'dm',
          senderId: String(senderId),
          senderName,  // ✅ Include here too
          preview,
        },
      });
    }

    // ... conversation:update emit ...

    // ✅ Push notification with proper sender name
    try {
      const db = require('_helpers/db');
      const recipient = await db.Account.findById(recipientId)
        .select('expoPushToken firstName')
        .lean();
      
      if (recipient?.expoPushToken) {
        const { sendExpoPush } = require('./utils/push');
        await sendExpoPush({
          to: recipient.expoPushToken,
          sound: 'default',
          title: `New message from ${senderName}`,  // ✅ Uses actual name
          body: preview,
          channelId: 'messages',
          priority: 'high',
          data: {
            kind: 'dm',
            senderId: String(senderId),
            senderName,  // ✅ Include in data payload
            otherUserId: String(senderId),
            preview,
          },
        });
        console.log(`✅ Push sent to ${recipient.firstName} from ${senderName}`);
      }
    } catch (pushError) {
      console.error('Push notification error:', pushError?.message);
    }

    res.json(saved);
  } catch (err) {
    next(err);
  }
}


// ==========================================
// FIX 2: _middleware/authorize.js
// ==========================================
// 
// Make sure the authorize middleware populates the user's name in req.user
// Many times req.user only has { id, sub } from JWT but not firstName/lastName
//
// Update your authorize.js to fetch full user:

/*
// In your authorize.js, after verifying JWT, add:

const db = require('_helpers/db');

async function authorize(roles = []) {
    return [
        jwt({ secret: config.JWT_SECRET, algorithms: ['HS256'] }),
        async (req, res, next) => {
            // ... existing role check logic ...

            // ✅ Fetch full user data including name
            const account = await db.Account.findById(req.user.id)
                .select('firstName lastName email role');
            
            if (!account) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            // ✅ Attach full user info to req.user
            req.user = {
                ...req.user,
                firstName: account.firstName,
                lastName: account.lastName,
                email: account.email,
                role: account.role,
            };

            next();
        }
    ];
}
*/


// ==========================================
// FIX 3: Quick Fix - Add firstName to JWT token
// ==========================================
// 
// In accounts/account.service.js, update generateJwtToken:

/*
function generateJwtToken(account) {
    return jwt.sign(
        { 
            sub: account.id, 
            id: account.id,
            firstName: account.firstName,  // ✅ Add this
            lastName: account.lastName,    // ✅ Add this
        },
        config.JWT_SECRET,
        { expiresIn: '90d' }
    );
}
*/

// Then in authorize middleware, req.user will have firstName and lastName


// ==========================================
// FIX 4: Group Messages in server.js
// ==========================================
// 
// For chatroom messages, ensure senderName is passed to push notifications:

/*
socket.on('sendChatroomMessage', async ({ chatroomId, senderId, message, media, senderName, avatarUrl }) => {
  // ... save message ...

  // When sending push notifications to group members:
  await sendGroupNotification({
    memberTokens,
    chatroomId,
    chatroomName: chatroom.name || 'Group chat',
    senderName: senderName || 'Someone',  // ✅ Use the senderName from client
    senderId,
    message
  });
});
*/

// The client should send senderName when emitting 'sendChatroomMessage'
// Check your ChatRoomScreen.js or PrivateChatScreen.js to ensure
// the user's firstName is included when sending messages


// ==========================================
// SUMMARY: What to check/update
// ==========================================
// 
// 1. In message.controller.js - fetch sender's firstName from DB if not in req.user
// 2. In authorize.js - populate req.user with firstName/lastName from database
// 3. OR in account.service.js - include firstName in JWT token payload
// 4. In server.js chatroom handler - ensure senderName is passed to push service
// 
// The main issue is that req.user typically only contains { id, sub } 
// from the JWT, not the user's name. You need to either:
// - Include firstName in the JWT when generating it
// - OR fetch it from the database in the authorize middleware
// - OR fetch it when sending the notification
