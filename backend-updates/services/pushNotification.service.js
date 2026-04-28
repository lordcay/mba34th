// services/pushNotification.service.js
// ============================================
// Centralized Push Notification Service for 34th Street Backend
// This handles all Expo push notifications for DMs and Group chats
// ============================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a single push notification via Expo
 * @param {Object} options - Notification options
 * @param {string} options.to - Expo push token
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body text
 * @param {string} [options.sound='default'] - Sound to play
 * @param {Object} [options.data={}] - Extra data payload
 * @param {string} [options.channelId='messages'] - Android channel ID
 * @param {number} [options.badge] - Badge count (iOS)
 * @param {string} [options.priority='high'] - Notification priority
 */
async function sendExpoPush({ 
  to, 
  title, 
  body, 
  sound = 'default', 
  data = {},
  channelId = 'messages',
  badge,
  priority = 'high'
}) {
  if (!to) {
    console.log('⚠️ No push token provided, skipping notification');
    return null;
  }

  // Validate Expo push token format
  if (!to.startsWith('ExponentPushToken[') && !to.startsWith('ExpoPushToken[')) {
    console.log('⚠️ Invalid Expo push token format:', to);
    return null;
  }

  const payload = {
    to,
    sound,
    title,
    body,
    data,
    priority,
    channelId, // Android notification channel
    ...(badge !== undefined && { badge }),
  };

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Expo push failed:', response.status, result);
      return null;
    }

    // Check for individual ticket errors
    if (result.data?.[0]?.status === 'error') {
      console.error('❌ Expo push ticket error:', result.data[0].message);
      // Handle invalid tokens - you may want to remove them from DB
      if (result.data[0].details?.error === 'DeviceNotRegistered') {
        console.log('🗑️ Token is no longer valid, should be removed from database');
        return { success: false, error: 'DeviceNotRegistered', shouldRemoveToken: true };
      }
      return null;
    }

    console.log('✅ Push notification sent successfully');
    return result;
  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);
    return null;
  }
}

/**
 * Send push notifications to multiple recipients
 * @param {Array} messages - Array of notification objects
 */
async function sendBatchExpoPush(messages) {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Filter out messages without valid tokens
  const validMessages = messages.filter(msg => {
    if (!msg.to) return false;
    if (!msg.to.startsWith('ExponentPushToken[') && !msg.to.startsWith('ExpoPushToken[')) {
      return false;
    }
    return true;
  });

  if (validMessages.length === 0) {
    console.log('⚠️ No valid push tokens in batch');
    return [];
  }

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validMessages),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Batch push failed:', response.status, result);
      return [];
    }

    console.log(`✅ Batch push sent: ${validMessages.length} notifications`);
    return result.data || [];
  } catch (error) {
    console.error('❌ Error sending batch push:', error.message);
    return [];
  }
}

/**
 * Send DM notification
 * @param {Object} options
 * @param {string} options.recipientToken - Recipient's Expo push token
 * @param {string} options.senderName - Name of the sender
 * @param {string} options.message - Message preview
 * @param {string} options.senderId - Sender's user ID
 */
async function sendDMNotification({ recipientToken, senderName, message, senderId }) {
  const preview = (message || '').toString().slice(0, 100);
  
  return sendExpoPush({
    to: recipientToken,
    title: `New message from ${senderName}`,
    body: preview,
    channelId: 'messages',
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
}

/**
 * Send Group/Chatroom notification to all members
 * @param {Object} options
 * @param {Array} options.memberTokens - Array of { token, recipientId } for each member
 * @param {string} options.chatroomId - Chatroom ID
 * @param {string} options.chatroomName - Name of the chatroom
 * @param {string} options.senderName - Name of the sender
 * @param {string} options.senderId - Sender's user ID
 * @param {string} options.message - Message preview
 */
async function sendGroupNotification({ 
  memberTokens, 
  chatroomId, 
  chatroomName, 
  senderName, 
  senderId,
  message 
}) {
  if (!memberTokens || memberTokens.length === 0) {
    console.log('⚠️ No member tokens for group notification');
    return [];
  }

  const preview = (message || '').toString().slice(0, 80);
  const groupLabel = chatroomName || 'Group chat';

  // Build batch messages for all members except sender
  const notifications = memberTokens
    .filter(m => m.token && String(m.recipientId) !== String(senderId))
    .map(({ token, recipientId }) => ({
      to: token,
      sound: 'default',
      title: `New in ${groupLabel}`,
      body: `${senderName}: ${preview}`,
      channelId: 'group-messages',
      priority: 'high',
      data: {
        kind: 'group',
        chatroomId: String(chatroomId),
        chatroomName: groupLabel,
        senderId: String(senderId),
        senderName,
        preview,
        timestamp: Date.now(),
      },
    }));

  if (notifications.length === 0) {
    return [];
  }

  console.log(`📤 Sending group notification to ${notifications.length} members`);
  return sendBatchExpoPush(notifications);
}

/**
 * Send a generic notification (for likes, follows, etc.)
 */
async function sendGenericNotification({ token, title, body, data = {} }) {
  return sendExpoPush({
    to: token,
    title,
    body,
    channelId: 'default',
    priority: 'default',
    data: {
      ...data,
      kind: 'general',
      timestamp: Date.now(),
    },
  });
}

/**
 * Send an incoming call push notification to a user whose app is backgrounded or killed.
 *
 * On Android: routes to the 'calls' channel which has bypassDnd + incoming.wav ringtone.
 * On iOS:     uses 'incoming.wav' (bundled via app.json) as the notification sound and
 *             the 'incoming_call' category which shows Accept/Decline action buttons.
 *
 * Usage in your backend call handler (e.g. when 'call:initiate' socket event is received):
 *
 *   const pushService = require('./services/pushNotification.service');
 *
 *   // Look up the callee's push token from your DB
 *   const callee = await User.findById(calleeId).select('expoPushToken');
 *
 *   // Send always — even if socket is connected — so the device rings on lock screen.
 *   await pushService.sendCallPushNotification({
 *     recipientToken:      callee.expoPushToken,
 *     callerId,
 *     callerName,
 *     callerPhoto,
 *     callType,            // 'audio' | 'video'
 *     callId,
 *     isConference:        false,
 *     conferenceId:        null,
 *     existingParticipants: [],
 *   });
 *
 * @param {Object}   options
 * @param {string}   options.recipientToken      - Callee's Expo push token
 * @param {string}   options.callerId            - Caller's user ID
 * @param {string}   options.callerName          - Caller's display name
 * @param {string}   [options.callerPhoto]       - Caller's avatar URL
 * @param {string}   [options.callType='audio']  - 'audio' | 'video'
 * @param {string}   [options.callId]            - Unique call identifier
 * @param {boolean}  [options.isConference]      - Conference call flag
 * @param {string}   [options.conferenceId]      - Conference room ID
 * @param {Array}    [options.existingParticipants] - Participants already on the call
 */
async function sendCallPushNotification({
  recipientToken,
  callerId,
  callerName,
  callerPhoto,
  callType = 'audio',
  callId,
  isConference = false,
  conferenceId = null,
  existingParticipants = [],
}) {
  if (!recipientToken) {
    console.log('⚠️  No push token for callee — skipping call push');
    return null;
  }

  const callTypeLabel = callType === 'video' ? 'Video' : 'Voice';

  return sendExpoPush({
    to:        recipientToken,
    title:     `Incoming ${callTypeLabel} Call`,
    body:      `${callerName} is calling…`,
    // 'incoming' references res/raw/incoming.wav on Android (via the 'calls' channel).
    // The channel sound overrides this on Android; on iOS the content sound is used.
    sound:     'incoming',
    channelId: 'calls',
    priority:  'high',
    badge:     0, // don't increment badge for calls
    data: {
      kind:                 'call',
      callId:               callId    ? String(callId)    : null,
      callerId:             callerId  ? String(callerId)  : null,
      callerName,
      callerPhoto:          callerPhoto || null,
      callType:             callType || 'audio',
      isConference,
      conferenceId:         conferenceId || null,
      existingParticipants: existingParticipants || [],
      timestamp:            Date.now(),
    },
  });
}

module.exports = {
  sendExpoPush,
  sendBatchExpoPush,
  sendDMNotification,
  sendGroupNotification,
  sendGenericNotification,
  sendCallPushNotification,
};
