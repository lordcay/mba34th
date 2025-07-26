


// import { createContext, useEffect, useState } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { socket } from '../socket';

// const AuthContext = createContext();

// const AuthProvider = ({ children }) => {
//   const [token, setToken] = useState('');
//   const [userId, setUserId] = useState('');
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);

//   const login = async (token, userId) => {
//     try {
//       await AsyncStorage.setItem('token', token);
//       await AsyncStorage.setItem('userId', userId);
//       setToken(token);
//       setUserId(userId);

//       const res = await axios.get(`http://192.168.0.169:4000/accounts/${userId}`, {
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
//         const res = await axios.get(`http://192.168.0.169:4000/accounts/${storedUserId}`, {
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
//         updateUser: async (newUserData) => {
//           try {
//             const updatedUser = { ...user, ...newUserData };
//             setUser(updatedUser);
//             await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
//           } catch (err) {
//             console.error('❌ Failed to update user in context:', err);
//           }
//         },
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export { AuthContext, AuthProvider };



// context/AuthContext.js





import { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { socket } from '../socket';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';
import { registerForPushNotificationsAsync } from '../hooks/usePushNotifications';
import * as Notifications from 'expo-notifications';
// import * as Permissions from 'expo-permissions';
// 

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);


  const login = async (token, userId) => {
    try {
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', userId);
      setToken(token);
      setUserId(userId);

      const res = await axios.get(`http://192.168.0.169:4000/accounts/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.user) {
        setUser(res.data.user);
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        socket.emit('register', userId);
      } else {
        console.warn("⚠️ Login response didn't include user data");
      }
    } catch (err) {
      console.error("❌ Login or user fetch failed:", err?.response?.data || err.message);
    }
  };

  const logout = async () => {
    socket.disconnect();
    try {
      await AsyncStorage.multiRemove(['token', 'userId', 'user']);
      setToken('');
      setUserId('');
      setUser(null);
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      const storedToken = await AsyncStorage.getItem('token');
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken) setToken(storedToken);
      if (storedUserId) setUserId(storedUserId);

      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } else if (storedToken && storedUserId) {
        const res = await axios.get(`http://192.168.0.169:4000/accounts/${storedUserId}`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.data?.user) {
          setUser(res.data.user);
          await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
        }
      }
    } catch (error) {
      console.error('❌ Error checking login status:', error?.response?.data || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  useEffect(() => {
    if (!user?._id) return;

    // 1️⃣ Register for Socket.IO
    socket.emit('register', user._id);

    // 2️⃣ Register for push notifications
    const registerForPushNotificationsAsync = async () => {
      let token;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('🚫 Push notification permission denied');
        return;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('✅ Expo Push Token:', token);

      // 👉 Optionally: Save this token to your backend linked to user._id
    };

    registerForPushNotificationsAsync();

    // 3️⃣ Handle new messages
    const handleNewMessage = async ({ message, sender }) => {
      console.log('📥 New message received:', message);

      // Local toast
      Toast.show({
        type: 'success',
        text1: `New message from ${sender.firstName}`,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
      });

      // Local sound
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/notification.mp3')
        );
        await sound.playAsync();
      } catch (err) {
        console.warn('🔇 Failed to play notification sound', err);
      }

      // Local push notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Message from ${sender.firstName}`,
          body: message,
        },
        trigger: null, // Deliver immediately
      });
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [user]);

  // useEffect(() => {
  //   if (!user?._id) return;

  //   socket.emit('register', user._id); // Register for Socket.IO

  //   const handleNewMessage = async ({ message, sender }) => {
  //     console.log('📥 New message received:', message);

  //     // ✅ Play sound
  //     try {
  //       const { sound } = await Audio.Sound.createAsync(
  //         require('./assets/notification.mp3') // You’ll add this file shortly
  //       );
  //       await sound.playAsync();
  //     } catch (err) {
  //       console.warn('🔇 Failed to play notification sound', err);
  //     }

  //     // ✅ Show toast
  //     Toast.show({
  //       type: 'success',
  //       text1: `New message from ${sender.firstName}`,
  //       text2: message,
  //       position: 'top',
  //       visibilityTime: 3000,
  //     });
  //   };

  //   socket.on('newMessage', handleNewMessage);

  //   return () => {
  //     socket.off('newMessage', handleNewMessage);
  //   };
  // }, [user]);


  // useEffect(() => {
  //   if (!userId) return;

  //   socket.on('newMessage', (data) => {
  //     console.log('📥 New message via socket:', data);
  //     setUnreadCount(prev => prev + 1); // You must define `unreadCount` and `setUnreadCount` above
  //   });

  //   socket.on('messagesRead', ({ from }) => {
  //     console.log(`✅ Messages from ${from} marked as read`);
  //     setUnreadCount(prev => (prev > 0 ? prev - 1 : 0)); // Optional logic
  //   });

  //   return () => {
  //     socket.off('newMessage');
  //     socket.off('messagesRead');
  //   };
  // }, [userId]);


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
            const updatedUser = { ...user, ...newUserData };
            setUser(updatedUser);
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (err) {
            console.error('❌ Failed to update user in context:', err);
          }
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

//       const res = await axios.get(`http://192.168.0.169:4000/accounts/${userId}`, {
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
//         const res = await axios.get(`http://192.168.0.169:4000/accounts/${storedUserId}`, {
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

//     socket.emit('register', user._id); // Register for Socket.IO

//     const handleNewMessage = async ({ message, sender }) => {
//       console.log('📥 New message received:', message);

//       // ✅ Play sound
//       try {
//         const { sound } = await Audio.Sound.createAsync(
//           require('./assets/notification.mp3') // You’ll add this file shortly
//         );
//         await sound.playAsync();
//       } catch (err) {
//         console.warn('🔇 Failed to play notification sound', err);
//       }

//       // ✅ Show toast
//       Toast.show({
//         type: 'success',
//         text1: `New message from ${sender.firstName}`,
//         text2: message,
//         position: 'top',
//         visibilityTime: 3000,
//       });
//     };

//     socket.on('newMessage', handleNewMessage);

//     return () => {
//       socket.off('newMessage', handleNewMessage);
//     };
//   }, [user]);


//   // useEffect(() => {
//   //   if (!userId) return;

//   //   socket.on('newMessage', (data) => {
//   //     console.log('📥 New message via socket:', data);
//   //     setUnreadCount(prev => prev + 1); // You must define `unreadCount` and `setUnreadCount` above
//   //   });

//   //   socket.on('messagesRead', ({ from }) => {
//   //     console.log(`✅ Messages from ${from} marked as read`);
//   //     setUnreadCount(prev => (prev > 0 ? prev - 1 : 0)); // Optional logic
//   //   });

//   //   return () => {
//   //     socket.off('newMessage');
//   //     socket.off('messagesRead');
//   //   };
//   // }, [userId]);


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
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export { AuthContext, AuthProvider };
