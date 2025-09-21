// navigation/TabNavigator.js
import React, { useEffect, useRef, useState, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

import ChatRoomsListScreen from '../screens/ChatRoomsListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';

import { Ionicons } from '@expo/vector-icons';
import { View, Text, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { useUnread } from '../context/UnreadContext';
import { AuthContext } from '../context/AuthContext';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatRoomsList"
        component={ChatRoomsListScreen}
        options={{ title: 'Chat Rooms' }}
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

  const { unreadCount } = useContext(AuthContext); // ← from ChatScreen publish

    // Pick the most reliable number available at any moment
  const effectiveUnread = Math.max(Number(unreadCount || 0), Number(totalUnread || 0));


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
          else if (route.name === 'Chat') iconName = 'chatbubble';
          else if (route.name === 'ChatRooms') iconName = 'chatbubbles';
          else if (route.name === 'Profile') iconName = 'person';

          // // Only badge the Chat tab
          // if (route.name !== 'Chat') {
          //   return <Ionicons name={iconName} size={size} color={color} />;
          // }

           // Badge logic per tab
         const isChatTab      = route.name === 'Chat';
         const isChatRoomsTab = route.name === 'ChatRooms';
         const count = isChatTab ? effectiveUnread
                      : isChatRoomsTab ? roomUnread
                      : 0;
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
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen
        name="ChatRooms"
        component={ChatStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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

