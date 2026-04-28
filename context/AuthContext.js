import { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { socket } from '../socket';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { checkProfileCompletion } from '../utils/checkProfileCompletion';
import { useUnread } from '../context/UnreadContext';
import { Platform } from 'react-native';
import { navigationRef } from '../navigation/RootNavigation';
import { registerAuthLogoutHandler } from '../services/api';
import { API_BASE_URL } from '../config';
import {
  saveBiometricCredentials,
  updateBiometricToken,
  isBiometricEnabled,
} from '../services/biometric.service';

// Bump this whenever a stored user schema changes between releases.
// On first launch after an update the old cached user is cleared so fresh data
// is fetched from the API — prevents stale-schema freezes after updates.
const APP_CACHE_VERSION = Constants.expoConfig?.version || '2.0.0';


const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const AUTH_REQUEST_TIMEOUT_MS = 15000;

  const normalizeUserPayload = (candidate) => {
    if (!candidate || typeof candidate !== 'object') return null;
    const source = candidate.user ?? candidate;
    if (!source || typeof source !== 'object') return null;

    const {
      token: _token,
      jwtToken: _jwtToken,
      refreshToken: _refreshToken,
      ...normalized
    } = source;

    return normalized?.id || normalized?._id || normalized?.email ? normalized : null;
  };

  const safeParseStoredUser = (rawUser) => {
    if (!rawUser) return null;
    try {
      const parsedUser = JSON.parse(rawUser);
      return parsedUser && typeof parsedUser === 'object' ? parsedUser : null;
    } catch (error) {
      console.warn('[AuthContext] Failed to parse stored user:', error?.message || error);
      return null;
    }
  };

  const getTokenExpiryMs = (jwt) => {
    if (!jwt) return null;
    try {
      const decoded = jwtDecode(jwt);
      return decoded?.exp ? decoded.exp * 1000 : null;
    } catch (err) {
      return null;
    }
  };

  const isTokenExpired = (jwt) => {
    const expiryMs = getTokenExpiryMs(jwt);
    return expiryMs ? Date.now() >= expiryMs : false;
  };

  const shouldExpireSoon = (jwt, withinMs = 24 * 60 * 60 * 1000) => {
    const expiryMs = getTokenExpiryMs(jwt);
    return expiryMs ? expiryMs - Date.now() <= withinMs : false;
  };
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  // null = not yet read from storage (loading), false = not seen, true = seen
  const [onboardingDone, setOnboardingDone] = useState(false);

  // ✅ Properly use UnreadContext
  const unreadCtx = useUnread();                 // may be null if not wrapped
  const unreadState = unreadCtx?.state ?? null;  // null-safe
  const unreadDispatch = unreadCtx?.dispatch;    // null-safe

  const login = async (nextToken, nextUserId, email, initialUser = null) => {
    try {
      const resolvedUserId = String(nextUserId || initialUser?.id || initialUser?._id || '');
      if (!nextToken || !resolvedUserId) {
        throw new Error('Missing authentication token or user id');
      }

      await AsyncStorage.multiSet([
        ['token', nextToken],
        ['userId', resolvedUserId],
      ]);
      setToken(nextToken);
      setUserId(resolvedUserId);

      let resolvedUser = normalizeUserPayload(initialUser);

      if (!resolvedUser) {
        const res = await axios.get(`${API_BASE_URL}/accounts/${resolvedUserId}`, {
          headers: { Authorization: `Bearer ${nextToken}` },
          timeout: AUTH_REQUEST_TIMEOUT_MS,
        });
        resolvedUser = normalizeUserPayload(res.data);
      }

      if (!resolvedUser) {
        throw new Error('Authenticated user payload was missing');
      }

      setUser(resolvedUser);
      await AsyncStorage.setItem('user', JSON.stringify(resolvedUser));
      socket.emit('register', resolvedUserId);

      const bioEnabled = await isBiometricEnabled();
      if (bioEnabled && email) {
        await saveBiometricCredentials(email, nextToken, resolvedUserId);
      }

      return resolvedUser;
    } catch (err) {
      console.error("❌ Login or user fetch failed:", err?.response?.data || err.message);
      await AsyncStorage.multiRemove(['token', 'userId', 'user']);
      setToken('');
      setUserId('');
      setUser(null);
      throw err;
    }
  };

  const logout = async () => {
    socket.disconnect();
    try {
      await AsyncStorage.multiRemove(['token', 'userId', 'user']);
      setToken('');
      setUserId('');
      setUser(null);

      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  useEffect(() => {
    registerAuthLogoutHandler(logout);
  }, [logout]);


  const isLoggedIn = async () => {
    console.log('[AuthContext] isLoggedIn() called');
    try {
      setIsLoading(true);
      setAuthError(null);

      // ── User schema cache: clear stale user object on app version change ─
      // Only clears the `user` object — does NOT touch the onboarding flag.
      try {
        const storedCacheVersion = await AsyncStorage.getItem('appCacheVersion');
        if (storedCacheVersion !== APP_CACHE_VERSION) {
          console.log(`[AuthContext] App updated ${storedCacheVersion} → ${APP_CACHE_VERSION}. Clearing stale user cache.`);
          await AsyncStorage.removeItem('user');
          await AsyncStorage.setItem('appCacheVersion', APP_CACHE_VERSION);
        }
      } catch (verErr) {
        console.warn('[AuthContext] User cache version check failed (non-fatal):', verErr?.message);
      }

      // ── Onboarding reset: separate key so it can be controlled independently ─
      // 'onboardingCacheV' was never stored on any device before this code ran,
      // so the first time this executes it will always clear @onboarding_slides_complete,
      // guaranteeing every existing user sees the Onboarding screen once after update.
      // To force another reset in a future release, bump ONBOARDING_CACHE_VERSION.
      const ONBOARDING_CACHE_VERSION = '1';
      try {
        const storedOnboardingV = await AsyncStorage.getItem('onboardingCacheV');
        if (storedOnboardingV !== ONBOARDING_CACHE_VERSION) {
          console.log('[AuthContext] Onboarding cache version mismatch — resetting onboarding flag.');
          await AsyncStorage.removeItem('@onboarding_slides_complete');
          await AsyncStorage.setItem('onboardingCacheV', ONBOARDING_CACHE_VERSION);
        }
      } catch (obErr) {
        console.warn('[AuthContext] Onboarding cache version check failed (non-fatal):', obErr?.message);
      }
      // ─────────────────────────────────────────────────────────────────────
      // Read onboarding flag in the same batch as the auth token check.
      const [storedToken, storedUserId, rawStoredUser, onboardingFlag] =
        await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('userId'),
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('@onboarding_slides_complete'),
        ]);
      setOnboardingDone(onboardingFlag === 'true');
      const parsedStoredUser = safeParseStoredUser(rawStoredUser);
      if (rawStoredUser && !parsedStoredUser) {
        await AsyncStorage.removeItem('user');
      }
      console.log('[AuthContext] Got from storage:', {
        hasToken: Boolean(storedToken),
        storedUserId,
        hasStoredUser: Boolean(parsedStoredUser),
      });

      if (storedToken && isTokenExpired(storedToken)) {
        await AsyncStorage.multiRemove(['token', 'userId', 'user']);
        setToken('');
        setUserId('');
        setUser(null);
        setAuthError('Session expired. Please log in again.');
        return;
      }

      if (storedToken) setToken(storedToken);
      if (storedUserId) setUserId(storedUserId);

      if (storedToken && shouldExpireSoon(storedToken)) {
        console.log('⚠️ Token is expiring soon. Keep session active using backend refresh or longer TTL.');
      }

      if (parsedStoredUser) {
        setUser(parsedStoredUser);
        console.log('[AuthContext] Loaded user from storage:', parsedStoredUser);
      } else if (storedToken && storedUserId) {
        try {
          const res = await axios.get(`${API_BASE_URL}/accounts/${storedUserId}`, {
            headers: { Authorization: `Bearer ${storedToken}` },
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          });
          const resolvedUser = normalizeUserPayload(res.data);
          if (resolvedUser) {
            setUser(resolvedUser);
            await AsyncStorage.setItem('user', JSON.stringify(resolvedUser));
            console.log('[AuthContext] Loaded user from API:', resolvedUser);
          }
        } catch (err) {
          setAuthError('Failed to fetch user from API: ' + (err?.message || 'Unknown error'));
          console.error('[AuthContext] Failed to fetch user from API:', err);
        }
      }
    } catch (error) {
      setAuthError('Error checking login status: ' + (error?.message || 'Unknown error'));
      console.error('[AuthContext] Error checking login status:', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] isLoading set to false');
    }
  };

  useEffect(() => {
    let didTimeout = false;
    const timeout = setTimeout(() => {
      if (isLoading) {
        didTimeout = true;
        setIsLoading(false);
        setAuthError('Login check timed out. Please check your network or API.');
        console.error('[AuthContext] Login check timed out');
      }
    }, 10000); // 10 seconds
    isLoggedIn().finally(() => {
      if (!didTimeout) clearTimeout(timeout);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Normalize id values that might be strings or populated objects
  const asId = (val) => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return String(val._id || val.id || '');
    return String(val);
  };

  useEffect(() => {
    if (!user?._id) return;

    // 1) Register my socket id
    socket.emit('register', user._id);

    // --- DM list bumps: conversation:update
    const onConvUpdate = (p) => {
      if (!p || !unreadDispatch) return;
      const me = String(user._id);
      const { peerA, peerB, unreadBumpFor, unreadResetFor } = p;
      const otherId = String(peerA) === me ? String(peerB) : String(peerA);
      if (unreadBumpFor && String(unreadBumpFor) === me) {
        unreadDispatch({ type: 'bump-dm', otherUserId: otherId });
      }
      if (unreadResetFor && String(unreadResetFor) === me) {
        unreadDispatch({ type: 'reset-dm', otherUserId: otherId });
      }
    };

    // explicit read events
    const onMessageRead = ({ readerId, otherId }) => {
      if (!unreadDispatch) return;
      if (String(readerId) === String(user._id)) {
        unreadDispatch({ type: 'reset-dm', otherUserId: String(otherId) });
      }
    };

    // --- Chatroom bumps: newChatroomMessage
    const onRoomMessage = (payload) => {
  try {
    if (!unreadDispatch) return;
    const me = asId(user._id);
    const roomId = asId(payload?.chatroomId || payload?.chatroom?._id);
    const sender = asId(payload?.senderId);
    if (!roomId) return;
    if (sender && me && sender === me) return; // my own message → no bump
    const active = String(unreadState?.activeRoomId || '');
    if (active && String(active) === String(roomId)) return; // reading this room → no bump
    unreadDispatch({ type: 'bump-room', roomId: String(roomId) });
  } catch {}
};

 // --- Chatroom global notify (works when you're *not* in the room)
 const onRoomNotify = ({ chatroomId, senderId }) => {
   try {
     if (!unreadDispatch) return;
     if (!chatroomId) return;
     const me = asId(user._id);
     if (me && senderId && String(me) === String(senderId)) return; // ignore my own
     const active = String(unreadState?.activeRoomId || '');
     if (active && String(active) === String(chatroomId)) return;   // actively viewing → no bump
     unreadDispatch({ type: 'bump-room', roomId: String(chatroomId) });
   } catch {}
 };

    // Push token registration is handled centrally in App.js (WithSocketListener).
    // Removed duplicate doPushSetup() here to prevent racing with the App.js handler.

    // --- Legacy direct DM toast/sound (kept)
    const handleNewMessage = async ({ message, sender }) => {
      Toast.show({
        type: 'success',
        text1: `New message from ${sender.firstName}`,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
      });
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/notification.mp3')
        );
        await sound.playAsync();
      } catch {}
      await Notifications.scheduleNotificationAsync({
        content: { title: `Message from ${sender.firstName}`, body: message },
        trigger: null,
      });
    };

    // Wire listeners
    socket.on('conversation:update', onConvUpdate);
    socket.on('message:read', onMessageRead);
    socket.on('newChatroomMessage', onRoomMessage);
    socket.on('newMessage', handleNewMessage);
    socket.on('chatroom:notify', onRoomNotify);

    // ✅ single cleanup return
    return () => {
      socket.off('conversation:update', onConvUpdate);
      socket.off('message:read', onMessageRead);
      socket.off('newChatroomMessage', onRoomMessage);
      socket.off('chatroom:notify', onRoomNotify);
      socket.off('newMessage', handleNewMessage);
    };
  // include unreadDispatch & activeRoomId so handler sees latest
  }, [user, unreadDispatch, unreadState?.activeRoomId]);

  return (
    <AuthContext.Provider
      value={{
        token,
        userId,
        user,
        isLoading,
        login,
        logout,
        setToken,
        setUser,
        unreadCount,
        setUnreadCount,
        updateUser: async (newUserData) => {
          try {
            const incoming = newUserData?.user ?? newUserData; // supports both shapes
            setUser((prev) => {
              const updatedUser = { ...(prev || {}), ...(incoming || {}) };
              AsyncStorage.setItem('user', JSON.stringify(updatedUser)).catch(() => {});
              return updatedUser;
            });
          } catch (err) {
            console.error('❌ Failed to update user in context:', err);
          }
        },
        checkProfileCompletion,
        authError,
        onboardingDone,
        markOnboardingDone: async () => {
          try {
            await AsyncStorage.setItem('@onboarding_slides_complete', 'true');
          } catch {}
          setOnboardingDone(true);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };




// import { createContext, useEffect, useState } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { socket } from '../socket';
// import { Audio } from 'expo-av';
// import Toast from 'react-native-toast-message';
// import { registerForPushNotificationsAsync } from '../hooks/usePushNotifications';
// import * as Notifications from 'expo-notifications';
// import { checkProfileCompletion } from '../utils/checkProfileCompletion';

// // import * as Permissions from 'expo-permissions';
// // 

// const AuthContext = createContext();

// const AuthProvider = ({ children }) => {
//   const [token, setToken] = useState('');
//   const [userId, setUserId] = useState('');
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [unreadCount, setUnreadCount] = useState(0);


//   const login = async (token, userId) => {
//     try {
//       await AsyncStorage.setItem('token', token);
//       await AsyncStorage.setItem('userId', userId);
//       setToken(token);
//       setUserId(userId);

//       const res = await axios.get(`http://192.168.14.134:4000/accounts/${userId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data?.user) {
//         setUser(res.data.user);
//         await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
//         socket.emit('register', userId);
//       } else {
//         console.warn("⚠️ Login response didn't include user data");
//       }
//     } catch (err) {
//       console.error("❌ Login or user fetch failed:", err?.response?.data || err.message);
//     }
//   };

//   const logout = async () => {
//     socket.disconnect();
//     try {
//       await AsyncStorage.multiRemove(['token', 'userId', 'user']);
//       setToken('');
//       setUserId('');
//       setUser(null);
//     } catch (error) {
//       console.error('❌ Logout failed:', error);
//     }
//   };

//   const isLoggedIn = async () => {
//     try {
//       setIsLoading(true);
//       const storedToken = await AsyncStorage.getItem('token');
//       const storedUserId = await AsyncStorage.getItem('userId');
//       const storedUser = await AsyncStorage.getItem('user');

//       if (storedToken) setToken(storedToken);
//       if (storedUserId) setUserId(storedUserId);

//       if (storedUser) {
//         const parsedUser = JSON.parse(storedUser);
//         setUser(parsedUser);
//       } else if (storedToken && storedUserId) {
//         const res = await axios.get(`http://192.168.14.134:4000/accounts/${storedUserId}`, {
//           headers: { Authorization: `Bearer ${storedToken}` },
//         });

//         if (res.data?.user) {
//           setUser(res.data.user);
//           await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
//         }
//       }
//     } catch (error) {
//       console.error('❌ Error checking login status:', error?.response?.data || error.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     isLoggedIn();
//   }, []);

//   useEffect(() => {
//     if (!user?._id) return;

//      // Hook into UnreadContext
//  const { dispatch } = require('../context/UnreadContext').useUnread?.() || {};
//  if (!dispatch) return;

//     // 1️⃣ Register for Socket.IO
//     socket.emit('register', user._id);

//     // 2️⃣ Register for push notifications
//     const registerForPushNotificationsAsync = async () => {
//       let token;
//       if (Platform.OS === 'android') {
//         await Notifications.setNotificationChannelAsync('default', {
//           name: 'default',
//           importance: Notifications.AndroidImportance.MAX,
//         });
//       }

//       const { status: existingStatus } = await Notifications.getPermissionsAsync();
//       let finalStatus = existingStatus;

//       if (existingStatus !== 'granted') {
//         const { status } = await Notifications.requestPermissionsAsync();
//         finalStatus = status;
//       }

//       if (finalStatus !== 'granted') {
//         console.warn('🚫 Push notification permission denied');
//         return;
//       }

//       token = (await Notifications.getExpoPushTokenAsync()).data;
//       console.log('✅ Expo Push Token:', token);

//       // 👉 Optionally: Save this token to your backend linked to user._id
//     };

//     registerForPushNotificationsAsync();

//     // 3️⃣ Handle new messages
//     const handleNewMessage = async ({ message, sender }) => {
//       console.log('📥 New message received:', message);

//       // Local toast
//       Toast.show({
//         type: 'success',
//         text1: `New message from ${sender.firstName}`,
//         text2: message,
//         position: 'top',
//         visibilityTime: 3000,
//       });

//       // Local sound
//       try {
//         const { sound } = await Audio.Sound.createAsync(
//           require('../assets/notification.mp3')
//         );
//         await sound.playAsync();
//       } catch (err) {
//         console.warn('🔇 Failed to play notification sound', err);
//       }

//       // Local push notification
//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title: `Message from ${sender.firstName}`,
//           body: message,
//         },
//         trigger: null, // Deliver immediately
//       });
//     };

//     socket.on('newMessage', handleNewMessage);

//     return () => {
//       socket.off('newMessage', handleNewMessage);
//     };
//   }, [user]);


//   return (
//     <AuthContext.Provider
//       value={{
//         token,
//         userId,
//         user,
//         isLoading,
//         login,
//         logout,
//         setToken,
//         setUser,
//         unreadCount,
//         setUnreadCount,
//         updateUser: async (newUserData) => {
//           try {
//             const updatedUser = { ...user, ...newUserData };
//             setUser(updatedUser);
//             await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
//           } catch (err) {
//             console.error('❌ Failed to update user in context:', err);
//           }
//         },
//         checkProfileCompletion, // ✅ NEW: make it available!

//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export { AuthContext, AuthProvider };
