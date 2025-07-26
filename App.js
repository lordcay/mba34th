// import React from 'react';
// import AppNavigator from './navigation/AppNavigator';
// import { AuthProvider } from './context/AuthContext';


// import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
// import { Text, View } from 'react-native';


// export default function App() {
//   let [fontsLoaded] = useFonts({
//     Poppins_400Regular,
//     Poppins_700Bold,
//   });

//   if (!fontsLoaded) {
//     return <View><Text>Loading...</Text></View>;
//   }

//   return (
//     <AuthProvider>
//       <AppNavigator />
//     </AuthProvider>
//   );
// }




// import React, { useContext, useEffect } from 'react';
// import { View, Text, Alert } from 'react-native';
// import AppNavigator from './navigation/AppNavigator';
// import { AuthProvider, AuthContext } from './context/AuthContext';
// import { socket } from './socket';
// import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';

// const WithSocketListener = ({ children }) => {
//   const { userId } = useContext(AuthContext);

//   useEffect(() => {
//     if (!userId) return;

//     socket.on('newMessage', ({ message, sender }) => {
//       console.log('📥 New message received:', message);
//       // You can enhance this with a toast or modal
//       Alert.alert(
//         `Message from ${sender.firstName}`,
//         message.message,
//         [{ text: 'View', onPress: () => { } }, { text: 'Close' }]
//       );
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
//       </WithSocketListener>
//     </AuthProvider>
//   );
// }



// App.js

import React, { useContext, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { socket } from './socket';
import Toast from 'react-native-toast-message';
import { Audio } from 'expo-av';


const WithSocketListener = ({ children }) => {
  const { userId } = useContext(AuthContext);

  // useEffect(() => {
  //   if (!userId) return;

  //   socket.on('newMessage', ({ message, sender }) => {
  //     Alert.alert(`Message from ${sender.firstName}`, message.message);
  //   });

  //   return () => {
  //     socket.off('newMessage');
  //   };
  // }, [userId]);

  useEffect(() => {
    if (!userId) return;

    socket.on('newMessage', async ({ message, sender }) => {
      console.log('📥 New message received:', message);

      // 🔊 Play sound
      // const { sound } = await Audio.Sound.createAsync(require('./assets/notification.mp3'));
      // await sound.playAsync();

      // 🔔 Show Toast
      Toast.show({
        type: 'success',
        text1: `New message from ${sender.firstName}`,
        text2: message,
        position: 'top',
        visibilityTime: 3000,
      });
    });

    return () => {
      socket.off('newMessage');
    };
  }, [userId]);

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
