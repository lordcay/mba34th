


// // App.js
// import * as Notifications from 'expo-notifications';

// import React, { useContext, useEffect } from 'react';
// import { View, Text, Alert } from 'react-native';
// import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
// import AppNavigator from './navigation/AppNavigator';
// import { AuthProvider, AuthContext } from './context/AuthContext';
// import { socket } from './socket';
// import Toast from 'react-native-toast-message';
// import { Audio } from 'expo-av';




// const WithSocketListener = ({ children }) => {
//   const { userId } = useContext(AuthContext);


//   useEffect(() => {
//     if (!userId) return;

//     socket.on('newMessage', async ({ message, sender }) => {
//       console.log('📥 New message received:', message);


//       // 🔔 Show Toast
//       Toast.show({
//         type: 'success',
//         text1: `New message from ${sender.firstName}`,
//         text2: message,
//         position: 'top',
//         visibilityTime: 3000,
//       });
//     });

//     return () => {
//       socket.off('newMessage');
//     };
//   }, [userId]);

//   return children;
// };

// export default function App() {
//   const [fontsLoaded] = useFonts({
//     Poppins_400Regular,
//     Poppins_700Bold,
//   });

//   if (!fontsLoaded) {
//     return (
//       <View>
//         <Text>Loading fonts...</Text>
//       </View>
//     );
//   }

//   return (
//     <AuthProvider>
//       <WithSocketListener>
//         <AppNavigator />
//         <Toast />
//       </WithSocketListener>
//     </AuthProvider>
//   );
// }


// App.js
import React, { useContext, useEffect, useRef, useState, Component } from 'react';
import { View, Text, AppState, Platform, StyleSheet as RNStyleSheet } from 'react-native';
import * as Font from 'expo-font';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';

import AppNavigator from './navigation/AppNavigator';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { socket } from './socket';
import { showTopToast, playPing } from './utils/notify';
import { UnreadProvider } from './context/UnreadContext';
import { navigate } from './navigation/RootNavigation';
import { useUnread } from './context/UnreadContext';
import { setupPushNotifications } from './hooks/usePushNotifications';
import { CallProvider } from './context/CallContext';
import { OnboardingProvider } from './context/OnboardingContext';

// Keep splash screen visible until we explicitly hide it
SplashScreen.preventAutoHideAsync().catch(() => {});

// Global Error Boundary — prevents React 19 from unmounting entire tree on error
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.emoji}>⚠️</Text>
          <Text style={ebStyles.title}>Something went wrong</Text>
          <Text style={ebStyles.message}>Please close and reopen the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = RNStyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 32 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#581845', marginBottom: 8 },
  message: { fontSize: 15, color: '#666', textAlign: 'center' },
});




function openFromPushData(data) {
  if (!data) return;

  if (data.kind === 'dm' && data.otherUserId) {
    // Minimal route params (you can fetch full user later)
    navigate('PrivateChat', { user: { id: data.otherUserId, firstName: data.senderName } });
    return;
  }

  if (data.kind === 'group' && data.chatroomId) {
    navigate('ChatRoom', { chatroomId: data.chatroomId, chatroomName: data.chatroomName || 'Group' });
    return;
  }

  // Handle mention notifications - navigate to the post
  if (data.type === 'mention' && data.postId) {
    navigate('PostDetail', { postId: data.postId });
    return;
  }
}

// ---------- Notification handler (foreground behavior) ----------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // show system alert if we schedule while app is foreground
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

async function setupNotificationsOnce() {
  // Ask for permission (iOS); Android just needs channel
  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    // Main messages channel - HIGH importance for heads-up notifications
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#581845',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  return status;
}

// Schedules a local notification (used if app is background/inactive)
async function scheduleMessageNotification({ title, body, data = {} }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data,
      // Android specific
      ...(Platform.OS === 'android' && {
        channelId: 'messages',
        priority: 'max',
      }),
    },
    trigger: null, // fire immediately
  });
}

const WithSocketListener = ({ children }) => {
  const { userId } = useContext(AuthContext);
  const appState = useRef(AppState.currentState);
  const [ready, setReady] = useState(false);
  const { dispatch } = useUnread();


  // keep an Audio.Sound preloaded (optional; playPing in utils already works too)
  const pingRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await setupNotificationsOnce();
        if (!mounted) return;

        // (optional) preload a sound; you can just rely on playPing() if you prefer
        pingRef.current = new Audio.Sound();
        // If you bundled a sound, load it here. Otherwise playPing() from utils is fine.
        setReady(true);
      } catch {
        setReady(true);
      }
    })();

    const sub = AppState.addEventListener('change', nextState => {
      appState.current = nextState;
    });

    return () => {
      mounted = false;
      sub.remove();
      if (pingRef.current) {
        pingRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // ✅ Presence tracking based on app state
  useEffect(() => {
    if (!userId) return;

    // 🔴 Track previous state to detect state changes properly
    let previousState = AppState.currentState;

    const presenceSub = AppState.addEventListener('change', nextState => {
      console.log('📱 App state change:', previousState, '->', nextState);
      
      if (nextState === 'active' && previousState !== 'active') {
        // App came to foreground - set online
        console.log('✅ Setting presence: ONLINE');
        socket.emit('presence:active', userId);
      } else if ((nextState === 'background' || nextState === 'inactive') && previousState === 'active') {
        // App went to background - set inactive/away
        console.log('💤 Setting presence: INACTIVE');
        socket.emit('presence:inactive', userId);
      }
      
      // Update previous state AFTER processing
      previousState = nextState;
    });

    // 🔴 Set online when this effect runs (user just logged in or app opened)
    if (AppState.currentState === 'active') {
      console.log('✅ Initial presence: ONLINE');
      socket.emit('presence:active', userId);
    }

    return () => {
      presenceSub.remove();
    };
  }, [userId]);

  // ✅ Register push token with backend when user logs in
  useEffect(() => {
    if (!userId) return;
    
    // Setup push notifications and send token to backend
    setupPushNotifications().catch((err) => {
      console.log('Push notification setup error:', err);
    });
  }, [userId]);


  useEffect(() => {
  // 1) User taps a notification while app is foreground/background
  const subResponse = Notifications.addNotificationResponseReceivedListener(resp => {
    try { 
      const data = resp?.notification?.request?.content?.data;
      openFromPushData(data); 
    } catch {}
  });

  // 2) Notification received while app is foreground
  // We let the system show the notification (shouldShowAlert: true above)
  // but also play our custom sound
  const subReceive = Notifications.addNotificationReceivedListener(notif => {
    // Play sound when notification arrives in foreground
    playPing();
  });

  return () => {
    subResponse.remove();
    subReceive.remove();
  };
}, []);


  // Register the socket with your userId whenever it’s available / reconnects
  useEffect(() => {
    if (!userId) return;

    const onConnect = () => {
      socket.emit('register', userId);
      // 🔴 Also emit presence:active when socket reconnects (if app is in foreground)
      if (AppState.currentState === 'active') {
        socket.emit('presence:active', userId);
      }
    };
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    // ✅ Send activity heartbeat every 2 minutes to maintain online status
    const activityInterval = setInterval(() => {
      if (appState.current === 'active') {
        socket.emit('presence:activity', userId);
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      socket.off('connect', onConnect);
      clearInterval(activityInterval);
    };
  }, [userId]);

  // Global listeners: DM + Group
  useEffect(() => {
    if (!userId) return;

    const isForeground = () => appState.current === 'active';

    // ----- Direct Message (two shapes supported) -----

    const onDmNew = (payload) => {
  const msg = payload?.message || payload;
  if (!msg) return;

  const senderIdFromMsg = msg.senderId?._id || msg.senderId?.id || msg.senderId;
  const senderIdFromWrapper = payload?.sender?.id || payload?.sender?._id || payload?.meta?.senderId;
  const actualSenderId = senderIdFromMsg ?? senderIdFromWrapper;

  // 🚫 Do not notify myself
  if (String(actualSenderId) === String(userId)) return;

  // Extract sender name from various possible locations in the payload
  const senderName =
    // From populated senderId object
    msg?.senderId?.firstName ||
    // From sender wrapper object
    payload?.sender?.firstName ||
    // From meta object
    payload?.meta?.senderName ||
    // Direct on message
    msg?.senderName ||
    // Fallback
    'Someone';

  const otherUserId =
    (msg.senderId && String(msg.senderId?._id || msg.senderId) !== String(userId)) 
      ? (msg.senderId?._id || msg.senderId) 
      : msg.recipientId;

  const preview = (msg?.message || payload?.meta?.preview || '').toString().slice(0, 80);

  // 🔴 Increment unread count for this sender
  if (otherUserId) dispatch({ type: 'bump-dm', otherUserId });

  // in-app toast + sound
  playPing();
  showTopToast(`New message from ${senderName}`, preview);

  // if background, show push (local)
  if (AppState.currentState !== 'active') {
    scheduleMessageNotification({
      title: `New message from ${senderName}`,
      body: preview,
    }).catch(() => {});
  }
};


//     const onDmNew = (payload) => {
//   const msg = payload?.message || payload;
//   if (!msg) return;

//   // 🧠 figure out the sender
//   const senderIdFromMsg = msg.senderId;                 // room emit shape
//   const senderIdFromWrapper = payload?.sender?.id;      // legacy direct emit shape
//   const actualSenderId = senderIdFromMsg ?? senderIdFromWrapper;

//   // 🚫 if it's me, ignore (don't toast or ping)
//   if (String(actualSenderId) === String(userId)) return;

//   const senderName =
//     payload?.sender?.firstName ||
//     payload?.senderName ||
//     msg?.senderName ||
//     'Someone';

//   const preview = (msg?.message || '').toString().slice(0, 80);

//   playPing();
//   showTopToast(`New message from ${senderName}`, preview);

//   if (AppState.currentState !== 'active') {
//     scheduleMessageNotification({
//       title: `New message from ${senderName}`,
//       body: preview,
//     }).catch(() => {});
//   }
// };

    // const onDmNew = (payload) => {
    //   const msg = payload?.message || payload;
    //   if (!msg) return;

    //   const senderName =
    //     payload?.sender?.firstName ||
    //     payload?.senderName ||
    //     msg?.senderName ||
    //     'Someone';

    //   const preview = (msg?.message || '').toString().slice(0, 80);

    //   // in-app toast + ping
    //   playPing();
    //   showTopToast(`New message from ${senderName}`, preview);

    //   // background push if app not foreground
    //   if (!isForeground()) {
    //     scheduleMessageNotification({
    //       title: `New message from ${senderName}`,
    //       body: preview,
    //     }).catch(() => {});
    //   }
    // };

    // The server emits *either* "newMessage" (direct to socketId) or "message:new" (room)
    socket.on('newMessage', onDmNew);
    socket.on('message:new', onDmNew);

    // ----- Group message -----


const onGroupNew = (msg) => {
  if (!msg) return;

  const senderId =
    (msg.senderId && (msg.senderId._id || msg.senderId.id || msg.senderId)) || null;
  if (senderId && String(senderId) === String(userId)) return; // 🚫 myself

  const senderName =
    msg.senderName ||
    msg.sender?.firstName ||
    (msg.senderId && (msg.senderId.firstName || msg.senderId.name)) ||
    'Someone';

  const groupLabel = msg.chatroomName || 'Group chat';
  const preview = (msg.message || '').toString().slice(0, 80);

  // unread++
  if (msg.chatroomId) dispatch({ type: 'inc-group', chatroomId: msg.chatroomId });

  playPing();
  showTopToast(`New message in ${groupLabel}`, `${senderName}: ${preview}`);

  if (AppState.currentState !== 'active') {
    scheduleMessageNotification({
      title: `New in ${groupLabel}`,
      body: `${senderName}: ${preview}`,
    }).catch(() => {});
  }
};


    socket.on('newChatroomMessage', onGroupNew);

    return () => {
      socket.off('newMessage', onDmNew);
      socket.off('message:new', onDmNew);
      socket.off('newChatroomMessage', onGroupNew);
    };
  }, [userId]);




  // App.js (inside WithSocketListener)
useEffect(() => {
  // Fires when a push arrives while the app is foregrounded
  const subReceived = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body, data } = notification.request?.content || {};

    // Optional: read extra fields you include in your push payload
    const kind = data?.kind;                 // 'dm' | 'group' | ...
    const senderName = data?.senderName;     // e.g. "Ada Lovelace"
    const groupName  = data?.groupName;      // e.g. "The Village Drum"
    const preview    = data?.preview;        // short message text

    // Build a nice title/body if not provided
    const toastTitle =
      title ||
      (kind === 'group'
        ? `New message in ${groupName || 'Group chat'}`
        : `New message from ${senderName || 'Someone'}`);

    const toastBody = body || preview || '';

    // In-app toast + sound
    playPing();
    showTopToast(toastTitle, toastBody);
  });

  // (Optional) when user taps the notification (foreground/background)

   const subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    // Navigate to the appropriate screen when user taps notification
    openFromPushData(data);
  });


  return () => {
    subReceived?.remove();
    subResponse?.remove();
  };
}, []);


  return children;
};

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts with a timeout safety net
        await Promise.race([
          Font.loadAsync({
            Poppins_400Regular,
            Poppins_700Bold,
          }),
          new Promise((resolve) => setTimeout(resolve, 5000)), // 5s max wait
        ]);
      } catch (e) {
        console.warn('Font loading failed, continuing anyway:', e);
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
  <ErrorBoundary>
    <UnreadProvider>
      <AuthProvider>
        <CallProvider>
          <OnboardingProvider>
            <WithSocketListener>
              <AppNavigator />
              <Toast />
            </WithSocketListener>
          </OnboardingProvider>
        </CallProvider>
      </AuthProvider>
    </UnreadProvider>
  </ErrorBoundary>
);


  // return (
  //   <AuthProvider>
  //     <UnreadProvider>
  //     <WithSocketListener>
  //       <AppNavigator />
  //       <Toast />
  //     </WithSocketListener>
  //     </UnreadProvider>
  //   </AuthProvider>
  // );
}
