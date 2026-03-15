# 34th Street - Push Notification Fix

## Overview
This update fixes background push notifications so users receive message alerts and sounds when the app is closed or in the background.

## Changes Made

### Frontend (React Native App)
The following files have been automatically updated:

1. **`android/app/src/main/AndroidManifest.xml`** - Added required permissions:
   - `RECEIVE_BOOT_COMPLETED` - Restart notification services after device reboot
   - `WAKE_LOCK` - Handle notifications when device is asleep
   - `POST_NOTIFICATIONS` - Required for Android 13+
   - `FOREGROUND_SERVICE` - Background service support
   - `SCHEDULE_EXACT_ALARM` - Precise notification timing

2. **`app.json`** - Updated Expo configuration:
   - Added top-level `notification` config
   - Added iOS `UIBackgroundModes` for remote notifications
   - Added Android `useNextNotificationsApi` flag
   - Added `defaultChannel` and `enableBackgroundRemoteNotifications` to expo-notifications plugin
   - Added Android permissions array

3. **`hooks/usePushNotifications.js`** - Improved push notification setup:
   - Added Android 13+ permission request
   - Added proper notification channels with correct importance levels
   - Added token storage in AsyncStorage
   - Added notification handler configuration for background

---

## Backend Changes (Manual Steps Required)

### Step 1: Copy Push Notification Service
Copy the file from:
```
backend-updates/services/pushNotification.service.js
```
To your backend repo:
```
34TH-STREET-BACKEND/services/pushNotification.service.js
```

### Step 2: Update messages/utils/push.js
Replace your existing `messages/utils/push.js` with the updated version from:
```
backend-updates/messages/utils/push.js
```

### Step 3: Add Group Message Push Notifications (Critical!)
This is the main fix - your backend currently only sends push notifications for DMs, not group messages.

Open your `server.js` and find the `sendChatroomMessage` socket handler. 

1. Add this import at the top of the file:
```javascript
const { sendGroupNotification } = require('./services/pushNotification.service');
```

2. Add the push notification code inside the `sendChatroomMessage` handler, after `io.emit('chatroom:notify', ...)`:

```javascript
// 🔔 PUSH NOTIFICATIONS FOR GROUP MESSAGES
try {
  const Chatroom = require('./chatroom/chatroom.model');
  
  const chatroom = await Chatroom.findById(chatroomId)
    .populate('members', '_id expoPushToken')
    .lean();

  if (chatroom && chatroom.members) {
    const memberTokens = chatroom.members
      .filter(member => {
        if (String(member._id) === String(senderId)) return false;
        if (!member.expoPushToken) return false;
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
  console.error('❌ Failed to send group push notifications:', pushError.message);
}
```

See `backend-updates/server.js.update.js` for the complete code with context.

### Step 4: Verify Account Model Has expoPushToken Field
Ensure your `accounts/account.model.js` has the `expoPushToken` field:

```javascript
const schema = new mongoose.Schema({
  // ... other fields
  expoPushToken: { type: String },
  // ... other fields
});
```

### Step 5: Deploy Backend Changes
After making all changes:
1. Commit and push to your backend repo
2. Deploy to your server
3. Restart the backend service

---

## Frontend Rebuild Required

After the app.json and Android manifest changes, you MUST rebuild your app:

### For Development:
```bash
npx expo prebuild --clean
npx expo run:android
```

### For Production (EAS Build):
```bash
eas build --platform android
```

**Important:** The app.json changes won't take effect without a fresh build!

---

## Testing

1. **Test DM Notifications:**
   - Log in on Device A
   - Send message from Device B (or web/different device)
   - Device A should show notification with sound even when app is closed

2. **Test Group Notifications:**
   - Join a chatroom on Device A
   - Send message to chatroom from Device B
   - Device A should show notification even when app is closed

3. **Test Background Behavior:**
   - Close the app completely (not just minimize)
   - Send a message
   - Should receive push notification with sound and pop-up

---

## Troubleshooting

### No notifications at all:
- Check that push token is saved: Look for "✅ Push token saved to backend" in console
- Verify token format: Should start with `ExponentPushToken[` or `ExpoPushToken[`
- Check backend logs for push errors

### Notifications arrive but no sound:
- Check notification channel settings in Android Settings > Apps > 34th Street > Notifications
- Ensure "Messages" channel has sound enabled
- Try uninstalling and reinstalling the app

### Notifications work in foreground only:
- Make sure you rebuilt the app after app.json changes
- Check Android battery optimization - disable for 34th Street
- Verify `expo-notifications` plugin has `enableBackgroundRemoteNotifications: true`

### Group notifications not working:
- Verify the server.js changes were deployed
- Check backend logs for "📤 Sent push to X chatroom members"
- Ensure chatroom members have valid expoPushToken

---

## Files Changed Summary

### Frontend (Auto-applied):
- `android/app/src/main/AndroidManifest.xml` ✅
- `app.json` ✅  
- `hooks/usePushNotifications.js` ✅

### Backend (Manual):
- `services/pushNotification.service.js` - NEW FILE
- `messages/utils/push.js` - UPDATE
- `server.js` - ADD GROUP PUSH CODE
- `accounts/account.model.js` - VERIFY expoPushToken field

---

## Architecture Overview

```
User sends message
        │
        ▼
┌───────────────────┐
│   Backend Server  │
│                   │
│   1. Save to DB   │
│   2. Socket emit  │◄─── Real-time for active users
│   3. Push notify  │◄─── For background/closed app
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Expo Push Server │
│ (exp.host/push)   │
└───────────────────┘
        │
        ▼
┌───────────────────┐     ┌───────────────────┐
│     FCM/APNs      │────►│   User's Device   │
│(Google/Apple Push)│     │   Shows Alert!    │
└───────────────────┘     └───────────────────┘
```
