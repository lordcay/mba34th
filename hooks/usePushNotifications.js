// hooks/usePushNotifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, PermissionsAndroid } from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hardcoded project ID from app.json (fallback if Constants doesn't work)
const PROJECT_ID = '5cc31987-a7a7-41aa-9925-8c33fe13f8af';

/**
 * Configure notification handler for foreground AND background
 * This is critical for showing notifications when app is in background
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

/**
 * Request Android 13+ POST_NOTIFICATIONS permission
 */
async function requestAndroid13Permission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }
  
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: '34th Street Notifications',
        message: 'Enable notifications to receive messages and updates',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.log('Android 13 permission request error:', err);
    return false;
  }
}

/**
 * Register iOS notification categories for incoming call action buttons.
 * "Accept" opens the app to the CallScreen; "Decline" rejects without opening.
 * Must be called once at startup (after login).
 */
export async function setupNotificationCategories() {
  try {
    await Notifications.setNotificationCategoryAsync('incoming_call', [
      {
        identifier: 'accept_call',
        buttonTitle: 'Accept',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'decline_call',
        buttonTitle: 'Decline',
        options: { isDestructive: true, opensAppToForeground: false },
      },
    ]);
    console.log('✅ Call notification categories set up');
  } catch (error) {
    console.log('Notification category setup error:', error);
  }
}

/**
 * Create Android notification channels with proper settings
 * These channels control sound, vibration, and importance for notifications
 */
async function createNotificationChannels() {
  if (Platform.OS !== 'android') return;

  // Main messages channel - MAX importance for heads-up notifications
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    description: 'Direct and group message notifications',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#581845',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });

  // Group messages channel
  await Notifications.setNotificationChannelAsync('group-messages', {
    name: 'Group Messages',
    description: 'Chatroom and group notifications',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#581845',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  // Default channel as fallback
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    description: 'General app notifications',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#581845',
    showBadge: true,
  });

  // Connections channel for connection requests
  await Notifications.setNotificationChannelAsync('connections', {
    name: 'Connection Requests',
    description: 'Notifications for connection requests and acceptances',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#581845',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  // Mentions channel for @ mentions in posts and comments
  await Notifications.setNotificationChannelAsync('mentions', {
    name: 'Mentions',
    description: 'Notifications when someone mentions you in posts or comments',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 300, 100, 300],
    lightColor: '#581845',
    enableVibrate: true,
    enableLights: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  // Incoming calls channel — MAX importance, bypasses DND (like WhatsApp).
  // 'incoming' references res/raw/incoming.wav, which is bundled via app.json
  // "sounds": ["./assets/sounds/incoming.wav"] in the expo-notifications plugin.
  await Notifications.setNotificationChannelAsync('calls', {
    name: 'Incoming Calls',
    description: 'Audio and video call notifications',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'incoming',
    vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
    lightColor: '#22c55e',
    enableVibrate: true,
    enableLights: true,
    showBadge: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  console.log('✅ Android notification channels created');
}

/**
 * Register for push notifications and return the Expo push token.
 * Also creates the required Android notification channels.
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  // Create Android notification channels first
  await createNotificationChannels();

  if (!Device.isDevice) {
    console.log('⚠️ Push notifications require a physical device');
    return null;
  }

  try {
    // Request Android 13+ specific permission first
    if (Platform.OS === 'android') {
      const android13Granted = await requestAndroid13Permission();
      if (!android13Granted) {
        console.log('❌ Android 13+ notification permission denied');
      }
    }

    // Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permission denied');
      return null;
    }

    // Get the Expo push token with project ID
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    });
    token = tokenResponse.data;

    console.log('✅ Expo Push Token:', token);

    // Store token locally for reference
    await AsyncStorage.setItem('expoPushToken', token);
  } catch (error) {
    console.error('❌ Error getting push token:', error);
  }

  return token;
}

/**
 * Send the push token to the backend so it can send push notifications
 * even when the app is closed.
 */
export async function savePushTokenToBackend(expoPushToken) {
  if (!expoPushToken) {
    console.log('⚠️ No push token to save');
    return false;
  }

  try {
    await api.post('/accounts/push-token', { expoPushToken });
    console.log('✅ Push token saved to backend');
    return true;
  } catch (error) {
    console.error('❌ Failed to save push token:', error?.response?.data || error?.message);
    return false;
  }
}

/**
 * Combined function: register for push and save token to backend.
 * Call this after user logs in.
 */
export async function setupPushNotifications() {
  const token = await registerForPushNotificationsAsync();
  if (token) {
    await savePushTokenToBackend(token);
  }
  return token;
}

/**
 * Subscribe to Expo push token changes.
 * Tokens can rotate after app reinstalls or OS-level resets.
 * Call this ONCE at app startup (after login) and keep the subscription alive.
 * Returns a subscription object — call `.remove()` to unsubscribe.
 */
export function subscribeToPushTokenRefresh() {
  const subscription = Notifications.addPushTokenListener(async ({ data: newToken }) => {
    if (!newToken) return;
    console.log('🔄 Push token rotated — updating backend…', newToken.slice(0, 35));
    try {
      await AsyncStorage.setItem('expoPushToken', newToken);
      await savePushTokenToBackend(newToken);
    } catch (err) {
      console.warn('⚠️ Failed to update rotated push token:', err?.message);
    }
  });
  return subscription;
}

/**
 * Get stored push token
 */
export async function getStoredPushToken() {
  try {
    return await AsyncStorage.getItem('expoPushToken');
  } catch {
    return null;
  }
}
