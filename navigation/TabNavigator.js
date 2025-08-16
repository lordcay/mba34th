// // navigation/TabNavigator.js
// import React, { useContext, useEffect, useRef, useState } from 'react';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// import HomeScreen from '../screens/HomeScreen';
// import ChatScreen from '../screens/ChatScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ChatRoomScreen from '../screens/ChatRoomScreen';
// import { Ionicons } from '@expo/vector-icons';
// import { AuthContext } from '../context/AuthContext';
// import { View, Text, Animated } from 'react-native';
// import { Audio } from 'expo-av';
// import * as Animatable from 'react-native-animatable';
// // import { Audio } from 'expo-av';


// const Tab = createBottomTabNavigator();

// const TabNavigator = () => {
//   const { unreadCount } = useContext(AuthContext);
//   const bounceAnim = useRef(new Animated.Value(1)).current;
//   const [sound, setSound] = useState();

//   // Play sound on new message
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

//   // Animate Chat tab icon on unread messages
//   useEffect(() => {
//     if (unreadCount > 0) {
//       Animated.sequence([
//         Animated.timing(bounceAnim, {
//           toValue: 1.2,
//           duration: 200,
//           useNativeDriver: true
//         }),
//         Animated.timing(bounceAnim, {
//           toValue: 1,
//           duration: 200,
//           useNativeDriver: true
//         })
//       ]).start();
//       playNotificationSound();
//     }
//   }, [unreadCount]);





//   return (
//     <Tab.Navigator
//       screenOptions={({ route }) => ({
//         tabBarIcon: ({ color, size }) => {
//           let iconName;
//           if (route.name === 'Home') iconName = 'home';
//           else if (route.name === 'Chat') iconName = 'chatbubble';
//           else if (route.name === 'ChatRooms') iconName = 'chatbubbles';
//           else if (route.name === 'Profile') iconName = 'person';

//           return (
//             <View>
//               <Ionicons name={iconName} size={size} color={color} />
//               {route.name === 'Chat' && unreadCount > 0 && (
//                 <View
//                   style={{
//                     position: 'absolute',
//                     top: -4,
//                     right: -6,
//                     backgroundColor: '#ff3b30',
//                     borderRadius: 10,
//                     paddingHorizontal: 5,
//                     minWidth: 16,
//                     height: 16,
//                     justifyContent: 'center',
//                     alignItems: 'center',
//                   }}
//                 >
//                   <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
//                     {unreadCount > 9 ? '9+' : unreadCount}
//                   </Text>
//                 </View>
//               )}
//             </View>
//           );
//         },
//         tabBarActiveTintColor: '#581845',
//         tabBarInactiveTintColor: 'gray',
//         headerShown: false,
//       })}
//     >
//       <Tab.Screen name="Home" component={HomeScreen} />
//       <Tab.Screen name="Chat" component={ChatScreen} />
//       <Tab.Screen name="ChatRooms" component={ChatRoomScreen} />
//       <Tab.Screen name="Profile" component={ProfileScreen} />
//     </Tab.Navigator>
//   );
// };

// export default TabNavigator;



// navigation/TabNavigator.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';

import ChatRoomsListScreen from '../screens/ChatRoomsListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';

import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { View, Text, Animated } from 'react-native';
import { Audio } from 'expo-av';

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
  const { unreadCount } = useContext(AuthContext);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const [sound, setSound] = useState();

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
    if (unreadCount > 0) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      playNotificationSound();
    }
  }, [unreadCount]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Chat') iconName = 'chatbubble';
          else if (route.name === 'ChatRooms') iconName = 'chatbubbles';
          else if (route.name === 'Profile') iconName = 'person';

          return (
            <View>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Chat' && unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    backgroundColor: '#ff3b30',
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
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
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
