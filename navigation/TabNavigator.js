// navigation/TabNavigator.js
import React, { useEffect, useRef, useState, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';

import ChatRoomsListScreen from '../screens/ChatRoomsListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';

import FeedScreen from "../screens/FeedScreen";
import PostsFeedScreen from "../screens/PostsFeedScreen";
import NotificationsScreen from "../screens/NotificationsScreen";

// import { Ionicons } from "@expo/vector-icons";


import { Ionicons } from '@expo/vector-icons';
import { View, Text, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { useUnread } from '../context/UnreadContext';
import { AuthContext } from '../context/AuthContext';
import { socket } from '../socket';
import { getPendingRequests } from '../services/connection.service';
import notificationService from '../services/notification.service';
import { notificationEvents } from '../utils/notificationEvents';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatRoomsList"
        component={ChatRoomsListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatRoomScreen"
        component={ChatRoomScreen}
        options={{ title: 'Chat Room' }}
      />
    </Stack.Navigator>
  );
}

const TabNavigator = () => {
  // 🔔 Use global unread totals from UnreadContext
  const { state } = useUnread(); // { total, dmByUserId, roomById }
  // const totalUnread = state?.total || 0;
  //  const { unreadCount } = useContext(AuthContext);
  const totalUnread = state?.total || 0;
   const roomUnread  = Object.values(state?.roomById || {}).reduce((a, b) => a + b, 0);

  const { unreadCount, userId } = useContext(AuthContext); // 🔴 Get unreadCount and userId

    // Pick the most reliable number available at any moment
  const effectiveUnread = Math.max(Number(unreadCount || 0), Number(totalUnread || 0));

  // 🔔 Notification counts
  const [connectionRequestCount, setConnectionRequestCount] = useState(0);
  const [otherNotificationCount, setOtherNotificationCount] = useState(0);
  
  // Combined notification count for the badge
  const notificationCount = connectionRequestCount + otherNotificationCount;

  // Fetch connection request count
  const fetchConnectionRequestCount = async () => {
    try {
      const data = await getPendingRequests();
      const count = data?.requests?.length || 0;
      setConnectionRequestCount(count);
    } catch (error) {
      console.error('Failed to fetch connection request count:', error);
    }
  };

  // Fetch other notification count (mentions, comments, likes, etc.)
  const fetchNotificationCount = async () => {
    try {
      const data = await notificationService.getUnreadCount();
      const count = data?.unreadCount || 0;
      setOtherNotificationCount(count);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  };

  // Fetch all counts
  const fetchAllNotificationCounts = async () => {
    await Promise.all([
      fetchConnectionRequestCount(),
      fetchNotificationCount()
    ]);
  };

  // Fetch on mount and listen for socket events
  useEffect(() => {
    fetchAllNotificationCounts();

    const handleConnectionRequest = () => {
      setConnectionRequestCount(prev => prev + 1);
      // Play notification sound
      playNotificationSound();
    };

    const handleConnectionCancelled = () => {
      setConnectionRequestCount(prev => Math.max(0, prev - 1));
    };

    // 🔴 When connection is accepted, only decrement for the ACCEPTER (not the requester)
    const handleConnectionAccepted = (data) => {
      // Only decrement if current user is the accepter (they had the pending request)
      if (data?.accepterId === userId) {
        setConnectionRequestCount(prev => Math.max(0, prev - 1));
      }
    };

    // 🔔 Handle new notification (mentions, comments, likes, replies)
    const handleNewNotification = (notification) => {
      setOtherNotificationCount(prev => prev + 1);
      playNotificationSound();
    };

    socket.on('connection:request', handleConnectionRequest);
    socket.on('connection:cancelled', handleConnectionCancelled);
    socket.on('connection:accepted', handleConnectionAccepted);
    socket.on('notification:new', handleNewNotification);

    // Listen for badge update events from NotificationsScreen
    const onBadgeUpdate = () => fetchNotificationCount();
    const onConnUpdate = () => fetchConnectionRequestCount();
    notificationEvents.on('badgeUpdate', onBadgeUpdate);
    notificationEvents.on('connectionUpdate', onConnUpdate);

    return () => {
      socket.off('connection:request', handleConnectionRequest);
      socket.off('connection:cancelled', handleConnectionCancelled);
      socket.off('connection:accepted', handleConnectionAccepted);
      socket.off('notification:new', handleNewNotification);
      notificationEvents.off('badgeUpdate', onBadgeUpdate);
      notificationEvents.off('connectionUpdate', onConnUpdate);
    };
  }, [userId]);


  // bounce + sound
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const [sound, setSound] = useState();
   const prevTotalRef = useRef(effectiveUnread);

  // const prevTotalRef = useRef(totalUnread);

  const playNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3')
      );
      setSound(sound);
      await sound.playAsync();
    } catch (err) {
      console.error('🔊 Failed to play sound', err);
    }
  };

  useEffect(() => {
    // Only animate/ping when the total goes UP
    if (effectiveUnread > (prevTotalRef.current || 0)) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      playNotificationSound();
    }
     prevTotalRef.current = effectiveUnread;
  }, [effectiveUnread]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Feed') iconName = 'albums';
          else if (route.name === 'Gist') iconName = 'newspaper';
          else if (route.name === 'Notifications') iconName = 'notifications';
          else if (route.name === 'ChatRooms') iconName = 'chatbubbles';

           // Badge logic for ChatRooms tab
         const isChatRoomsTab = route.name === 'ChatRooms';
         const isNotificationsTab = route.name === 'Notifications';
         
         let count = 0;
         if (isChatRoomsTab) count = roomUnread;
         if (isNotificationsTab) count = notificationCount;
         
         const display = count > 99 ? '99+' : count;
          // const displayCount = effectiveUnread > 99 ? '99+' : effectiveUnread;

          // const displayCount = totalUnread > 99 ? '99+' : totalUnread;

          return (
            <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
              <Ionicons name={iconName} size={size} color={color} />
              {count > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    backgroundColor: '#581845',
                    borderRadius: 10,
                    paddingHorizontal: 5,
                    minWidth: 16,
                    height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}
                  >
                    {display}
                  </Text>
                </View>
              )}
            </Animated.View>
          );
        },
        tabBarActiveTintColor: '#581845',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Feed" component={PostsFeedScreen} />
      <Tab.Screen name="Gist" component={FeedScreen} />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        listeners={{
          focus: () => {
            // Refresh counts when tab is focused
            fetchAllNotificationCounts();
          },
        }}
      />
      <Tab.Screen
        name="ChatRooms"
        component={ChatStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;

// // navigation/TabNavigator.js
// import React, { useEffect, useRef, useState, useContext } from 'react';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';

// import HomeScreen from '../screens/HomeScreen';
// import ChatScreen from '../screens/ChatScreen';
// import ProfileScreen from '../screens/ProfileScreen';

// import ChatRoomsListScreen from '../screens/ChatRoomsListScreen';
// import ChatRoomScreen from '../screens/ChatRoomScreen';

// import { Ionicons } from '@expo/vector-icons';
// import { View, Text, Animated } from 'react-native';
// import { Audio } from 'expo-av';
// import { useUnread } from '../context/UnreadContext';
// import { AuthContext } from '../context/AuthContext';


// const Tab = createBottomTabNavigator();
// const Stack = createNativeStackNavigator();

// function ChatStack() {
//   return (
//     <Stack.Navigator>
//       <Stack.Screen
//         name="ChatRoomsList"
//         component={ChatRoomsListScreen}
//         options={{ title: 'Chat Rooms' }}
//       />
//       <Stack.Screen
//         name="ChatRoomScreen"
//         component={ChatRoomScreen}
//         options={{ title: 'Chat Room' }}
//       />
//     </Stack.Navigator>
//   );
// }

// const TabNavigator = () => {
//   // 🔔 Use global unread totals from UnreadContext
//   const { state } = useUnread(); // { total, dmByUserId, roomById }
//   // const totalUnread = state?.total || 0;
//   //  const { unreadCount } = useContext(AuthContext);
//   const totalUnread = state?.total || 0;
//   const { unreadCount } = useContext(AuthContext); // ← from ChatScreen publish

//     // Pick the most reliable number available at any moment
//   const effectiveUnread = Math.max(Number(unreadCount || 0), Number(totalUnread || 0));


//   // bounce + sound
//   const bounceAnim = useRef(new Animated.Value(1)).current;
//   const [sound, setSound] = useState();
//    const prevTotalRef = useRef(effectiveUnread);

//   // const prevTotalRef = useRef(totalUnread);

//   const playNotificationSound = async () => {
//     try {
//       const { sound } = await Audio.Sound.createAsync(
//         require('../assets/notification.mp3')
//       );
//       setSound(sound);
//       await sound.playAsync();
//     } catch (err) {
//       console.error('🔊 Failed to play sound', err);
//     }
//   };

//   useEffect(() => {
//     // Only animate/ping when the total goes UP
//     if (effectiveUnread > (prevTotalRef.current || 0)) {
//       Animated.sequence([
//         Animated.timing(bounceAnim, {
//           toValue: 1.2,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//         Animated.timing(bounceAnim, {
//           toValue: 1,
//           duration: 180,
//           useNativeDriver: true,
//         }),
//       ]).start();
//       playNotificationSound();
//     }
//      prevTotalRef.current = effectiveUnread;
//   }, [effectiveUnread]);

//   return (
//     <Tab.Navigator
//       screenOptions={({ route }) => ({
//         tabBarIcon: ({ color, size }) => {
//           let iconName;
//           if (route.name === 'Home') iconName = 'home';
//           else if (route.name === 'Chat') iconName = 'chatbubble';
//           else if (route.name === 'ChatRooms') iconName = 'chatbubbles';
//           else if (route.name === 'Profile') iconName = 'person';

//           // Only badge the Chat tab
//           if (route.name !== 'Chat') {
//             return <Ionicons name={iconName} size={size} color={color} />;
//           }
//           const displayCount = effectiveUnread > 99 ? '99+' : effectiveUnread;

//           // const displayCount = totalUnread > 99 ? '99+' : totalUnread;

//           return (
//             <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
//               <Ionicons name={iconName} size={size} color={color} />
//               {effectiveUnread > 0 && (
//                 <View
//                   style={{
//                     position: 'absolute',
//                     top: -4,
//                     right: -6,
//                     backgroundColor: '#581845',
//                     borderRadius: 10,
//                     paddingHorizontal: 5,
//                     minWidth: 16,
//                     height: 16,
//                     justifyContent: 'center',
//                     alignItems: 'center',
//                   }}
//                 >
//                   <Text
//                     style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}
//                   >
//                     {displayCount}
//                   </Text>
//                 </View>
//               )}
//             </Animated.View>
//           );
//         },
//         tabBarActiveTintColor: '#581845',
//         tabBarInactiveTintColor: 'gray',
//         headerShown: false,
//       })}
//     >
//       <Tab.Screen name="Home" component={HomeScreen} />
//       <Tab.Screen name="Chat" component={ChatScreen} />
//       <Tab.Screen
//         name="ChatRooms"
//         component={ChatStack}
//         options={{ headerShown: false }}
//       />
//       <Tab.Screen name="Profile" component={ProfileScreen} />
//     </Tab.Navigator>
//   );
// };

// export default TabNavigator;

