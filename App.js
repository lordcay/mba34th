


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
import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, AppState, Platform } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';

import AppNavigator from './navigation/AppNavigator';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { socket } from './socket';
import { showTopToast, playPing } from './utils/notify';

// ---------- Notification handler (foreground behavior) ----------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // show system alert if we schedule while app is foreground
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setupNotificationsOnce() {
  // Ask for permission (iOS); Android just needs channel
  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  return status;
}

// Schedules a local notification (used if app is background/inactive)
async function scheduleMessageNotification({ title, body }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: null, // fire immediately
  });
}

const WithSocketListener = ({ children }) => {
  const { userId } = useContext(AuthContext);
  const appState = useRef(AppState.currentState);
  const [ready, setReady] = useState(false);

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

  // Register the socket with your userId whenever it’s available / reconnects
  useEffect(() => {
    if (!userId) return;

    const onConnect = () => {
      socket.emit('register', userId);
    };
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
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

  // 🧠 figure out the sender
  const senderIdFromMsg = msg.senderId;                 // room emit shape
  const senderIdFromWrapper = payload?.sender?.id;      // legacy direct emit shape
  const actualSenderId = senderIdFromMsg ?? senderIdFromWrapper;

  // 🚫 if it's me, ignore (don't toast or ping)
  if (String(actualSenderId) === String(userId)) return;

  const senderName =
    payload?.sender?.firstName ||
    payload?.senderName ||
    msg?.senderName ||
    'Someone';

  const preview = (msg?.message || '').toString().slice(0, 80);

  playPing();
  showTopToast(`New message from ${senderName}`, preview);

  if (AppState.currentState !== 'active') {
    scheduleMessageNotification({
      title: `New message from ${senderName}`,
      body: preview,
    }).catch(() => {});
  }
};

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

  // senderId can be:
  // - primitive id (msg.senderId)
  // - populated object (msg.senderId._id)
  const senderId =
    (msg.senderId && (msg.senderId._id || msg.senderId.id || msg.senderId)) || null;

  // 🚫 if it's my own message, ignore
  if (senderId && String(senderId) === String(userId)) return;

  const senderName =
    msg.senderName ||
    msg.sender?.firstName ||
    (msg.senderId && (msg.senderId.firstName || msg.senderId.name)) ||
    'Someone';

  const groupLabel = msg.chatroomName || 'Group chat';
  const preview = (msg.message || '').toString().slice(0, 80);

  playPing();
  showTopToast(`New message in ${groupLabel}`, `${senderName}: ${preview}`);

  if (AppState.currentState !== 'active') {
    scheduleMessageNotification({
      title: `New in ${groupLabel}`,
      body: `${senderName}: ${preview}`,
    }).catch(() => {});
  }
};

    // const onGroupNew = (msg) => {
    //   if (!msg) return;
    //   const senderName =
    //     msg.senderName ||
    //     msg.sender?.firstName ||
    //     (msg.senderId && (msg.senderId.firstName || msg.senderId.name)) ||
    //     'Someone';

    //   const groupLabel = msg.chatroomName || 'Group chat';
    //   const preview = (msg.message || '').toString().slice(0, 80);

    //   playPing();
    //   showTopToast(`New message in ${groupLabel}`, `${senderName}: ${preview}`);

    //   if (!isForeground()) {
    //     scheduleMessageNotification({
    //       title: `New in ${groupLabel}`,
    //       body: `${senderName}: ${preview}`,
    //     }).catch(() => {});
    //   }
    // };

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
    // Example: route to the right screen using your navigator
    // if (data.kind === 'dm' && data.otherUserId) {
    //   navigationRef.navigate('PrivateChat', { userId: data.otherUserId });
    // }
    // if (data.kind === 'group' && data.chatroomId) {
    //   navigationRef.navigate('ChatRoom', { chatroomId: data.chatroomId, chatroomName: data.groupName });
    // }
  });
  // const subResponse = Notifications.addNotificationResponseReceivedListener((_response) => {
  //   // If you want to navigate to a screen based on data, do it here.
  //   // const data = _response.notification.request.content.data;
  //   // e.g. navigate to PrivateChatScreen or ChatRoomScreen
  // });

  return () => {
    subReceived?.remove();
    subResponse?.remove();
  };
}, []);


  return children;
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <WithSocketListener>
        <AppNavigator />
        <Toast />
      </WithSocketListener>
    </AuthProvider>
  );
}
