// messages/utils/push.js
// ============================================
// Updated Push Utility for DM Messages
// ============================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification via Expo Push API
 * @param {Object} options
 * @param {string} options.to - Expo push token
 * @param {string} [options.sound='default'] - Sound to play
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} [options.data={}] - Extra data payload
 * @param {string} [options.channelId='messages'] - Android channel ID
 * @param {string} [options.priority='high'] - Priority level
 */
async function sendExpoPush({ 
  to, 
  sound = 'default', 
  title, 
  body, 
  data = {},
  channelId = 'messages',
  priority = 'high'
}) {
  if (!to) throw new Error('Missing Expo push token `to`');
  
  // Validate token format
  if (!to.startsWith('ExponentPushToken[') && !to.startsWith('ExpoPushToken[')) {
    console.log('⚠️ Invalid Expo push token format:', to);
    throw new Error('Invalid Expo push token format');
  }

  const payload = { 
    to, 
    sound, 
    title, 
    body, 
    data,
    channelId,
    priority,
    // Android specific settings
    _displayInForeground: true,
  };

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let json = null;
  try { 
    json = await res.json(); 
  } catch {}

  if (!res.ok) {
    throw new Error(`Expo push failed: ${res.status} ${JSON.stringify(json)}`);
  }

  // Check for ticket-level errors
  if (json?.data?.[0]?.status === 'error') {
    const errorDetails = json.data[0];
    console.error('Expo push ticket error:', errorDetails.message);
    
    // Handle specific errors
    if (errorDetails.details?.error === 'DeviceNotRegistered') {
      // Token is no longer valid - should be removed from DB
      const error = new Error('DeviceNotRegistered');
      error.shouldRemoveToken = true;
      throw error;
    }
    throw new Error(errorDetails.message);
  }

  console.log('✅ Push notification sent via messages/utils/push.js');
  return json;
}

module.exports = { sendExpoPush };
