


// import { createContext, useEffect, useState } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';

// const AuthContext = createContext();

// const AuthProvider = ({ children }) => {
//   const [token, setToken] = useState('');
//   const [userId, setUserId] = useState('');
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);

//   const login = async (tokenValue, userIdValue) => {
//     try {
//       await AsyncStorage.setItem('token', tokenValue);
//       await AsyncStorage.setItem('userId', userIdValue);
//       setToken(tokenValue);
//       setUserId(userIdValue);

//       const res = await axios.get(`http://192.168.0.169:4000/accounts/${userIdValue}`, {
//         headers: { Authorization: `Bearer ${tokenValue}` },
//       });

//       if (res.data?.user) {
//         setUser(res.data.user); // ✅ set actual user
//         await AsyncStorage.setItem('user', JSON.stringify(res.data.user)); // ✅ store unwrapped user
//       } else {
//         console.warn("⚠️ No user data returned in login response");
//       }
//     } catch (err) {
//       console.error("❌ Error in login or fetching user data:", err?.response?.data || err.message);
//     }
//   };

//   const logout = async () => {
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
//         setUser(JSON.parse(storedUser)); // ✅ restored correctly
//       } else if (storedToken && storedUserId) {
//         const res = await axios.get(`http://192.168.0.169:4000/accounts/${storedUserId}`, {
//           headers: { Authorization: `Bearer ${storedToken}` },
//         });

//         if (res.data?.user) {
//           setUser(res.data.user);
//           await AsyncStorage.setItem('user', JSON.stringify(res.data.user)); // ✅ fixed
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
//         updateUser: (newUserData) => {
//           setUser((prevUser) => {
//             const updated = { ...prevUser, ...newUserData };
//             AsyncStorage.setItem('user', JSON.stringify(updated)); // ✅ persist updated user
//             return updated;
//           });
//         },
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export { AuthContext, AuthProvider };


// import { createContext, useEffect, useState } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { socket } from '../socket'; // adjust path based on your folder structure


// const AuthContext = createContext();

// const AuthProvider = ({ children }) => {
//   const [token, setToken] = useState('');
//   const [userId, setUserId] = useState('');
//   const [user, setUser] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [profileComplete, setProfileComplete] = useState(false); // Track if profile is completed

//   // Utility to determine if the user profile has been sufficiently filled
//   const isProfileComplete = (user) => {
//     return (
//       !!user?.bio &&
//       !!user?.phone &&
//       !!user?.origin &&
//       Array.isArray(user?.interests) && user.interests.length > 0 &&
//       Array.isArray(user?.photos) && user.photos.length > 0
//     );
//   };

//   // const isProfileComplete = (user) => {
//   //   return (
//   //     user?.bio &&
//   //     user?.phone &&
//   //     user?.origin &&
//   //     user?.interests?.length > 0
//   //     // &&
//   //     // user?.photos?.length > 0
//   //   );
//   // };



//   const login = async (token, userId) => {
//     try {
//       // Store credentials in local storage
//       await AsyncStorage.setItem('token', token);
//       await AsyncStorage.setItem('userId', userId);
//       setToken(token);
//       setUserId(userId);

//       // Fetch full user profile from backend
//       const res = await axios.get(`http://192.168.0.169:4000/accounts/${userId}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data?.user) {
//         setUser(res.data.user);
//         await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
//         setProfileComplete(isProfileComplete(res.data.user)); // Evaluate if profile is complete
//         socket.emit('register', userId); // Register the user to socket after login

//       }
//       else {
//         console.warn("⚠️ Login response didn't include user data");
//       }
//     } catch (err) {
//       console.error("❌ Login or user fetch failed:", err?.response?.data || err.message);
//     }
//   };


//   // const login = async (token, userId) => {
//   //   try {
//   //     await AsyncStorage.setItem('token', token);
//   //     await AsyncStorage.setItem('userId', userId);
//   //     setToken(token);
//   //     setUserId(userId);

//   //     const res = await axios.get(`http://192.168.0.169:4000/accounts/${userId}`, {
//   //       headers: { Authorization: `Bearer ${token}` },
//   //     });

//   //     if (res.data?.user) {
//   //       setUser(res.data.user);
//   //       await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
//   //       socket.emit('register', userId); // ✅ Register user to Socket.IO

//   //     } else {
//   //       console.warn("⚠️ Login response didn't include user data");
//   //     }
//   //   } catch (err) {
//   //     console.error("❌ Login or user fetch failed:", err?.response?.data || err.message);
//   //   }
//   // };

//   const logout = async () => {
//     socket.disconnect(); // ✅ Disconnect socket

//     try {
//       await AsyncStorage.multiRemove(['token', 'userId', 'user']);
//       setToken('');
//       setUserId('');
//       setUser(null);
//       setProfileComplete(false);
//       socket.disconnect(); // ✅ disconnect on logout

//     } catch (error) {
//       console.error('❌ Logout failed:', error);
//     }
//   };

//   // Check if the user is already logged in (e.g., app restart)

//   const isLoggedIn = async () => {
//     try {
//       setIsLoading(true);
//       // Get stored credentials from AsyncStorage
//       const storedToken = await AsyncStorage.getItem('token');
//       const storedUserId = await AsyncStorage.getItem('userId');
//       const storedUser = await AsyncStorage.getItem('user');

//       if (storedToken) setToken(storedToken);
//       if (storedUserId) setUserId(storedUserId);

//       if (storedUser) {
//         const parsedUser = JSON.parse(storedUser);
//         setUser(parsedUser);
//         setProfileComplete(isProfileComplete(parsedUser)); // Evaluate profile completeness
//       } else if (storedToken && storedUserId) {
//         const res = await axios.get(`http://192.168.0.169:4000/accounts/${storedUserId}`, {
//           headers: { Authorization: `Bearer ${storedToken}` },
//         });

//         if (res.data?.user) {
//           setUser(res.data.user);
//           setProfileComplete(isProfileComplete(res.data.user));

//           await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
//         }
//       }
//     } catch (error) {
//       console.error('❌ Error checking login status:', error?.response?.data || error.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Check login status on mount

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
//         setProfileComplete,
//         updateUser: async (newUserData) => {
//           try {
//             const updatedUser = { ...user, ...newUserData };

//             // Update local state
//             setUser(updatedUser);

//             // Recalculate profile completeness
//             const completed = isProfileComplete(updatedUser);
//             setProfileComplete(completed);

//             // Persist updated user to AsyncStorage
//             await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
//           } catch (err) {
//             console.error('❌ Failed to update user in context:', err);
//           }
//         },

//         // updateUser: (newUserData) => {
//         //   // Update the user context and profile completion status
//         //   setUser((prevUser) => {
//         //     const updatedUser = { ...prevUser, ...newUserData };
//         //     AsyncStorage.setItem('user', JSON.stringify(updatedUser));
//         //     setProfileComplete(isProfileComplete(updatedUser));

//         //     return updatedUser;
//         //   });
//         // },
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export { AuthContext, AuthProvider };


import { createContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { socket } from '../socket';

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
