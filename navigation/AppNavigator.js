

import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PasswordScreen from '../screens/PasswordScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PrivateChatScreen from '../screens/PrivateChatScreen';
import TabNavigator from './TabNavigator';
import { ActivityIndicator, View } from 'react-native';
import ProfileInfoScreen from '../screens/ProfileInfoScreen';
import PhotoUploadScreen from '../screens/PhotoUploadScreen';
import PreFinalScreen from '../screens/PreFinalScreen';
import NameScreen from '../screens/NameScreen';
import EmailScreen from '../screens/EmailScreen';
import GenderScreen from '../screens/GenderScreen';
import LocationScreen from '../screens/LocationScreen';
import TypeScreen from '../screens/TypeScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import Toast from 'react-native-toast-message';
import ProfileScreen from '../screens/ProfileScreen';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import UserProfileScreen from '../screens/UserProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';


const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS, // iOS-style slide-in
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 500 } },
            close: { animation: 'timing', config: { duration: 400 } },
          },
        }}
      >
        {user ? (
          // ✅ Authenticated → Go to full app
          <>
            <Stack.Screen name="Home" component={TabNavigator} />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />

            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
          </>
        ) : (
          // ✅ Not authenticated → Show auth flow
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
            <Stack.Screen name="NameScreen" component={NameScreen} />
            <Stack.Screen name="EmailScreen" component={EmailScreen} />
            <Stack.Screen name="PasswordScreen" component={PasswordScreen} />
            <Stack.Screen name="GenderScreen" component={GenderScreen} />
            <Stack.Screen name="Location" component={LocationScreen} />
            <Stack.Screen name="Type" component={TypeScreen} />
            <Stack.Screen name="ProfileInfo" component={ProfileInfoScreen} />
            <Stack.Screen name="PhotoUploadScreen" component={PhotoUploadScreen} />
            <Stack.Screen name="PreFinal" component={PreFinalScreen} />
            <Stack.Screen name="VerifyOTPScreen" component={VerifyOTPScreen} />
          </>
        )}
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
};

export default AppNavigator;


// import React, { useContext } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { AuthContext } from '../context/AuthContext';

// import OnboardingScreen from '../screens/OnboardingScreen';
// import LoginScreen from '../screens/LoginScreen';
// import RegisterScreen from '../screens/RegisterScreen';
// import PasswordScreen from '../screens/PasswordScreen';
// import EditProfileScreen from '../screens/EditProfileScreen';
// import PrivateChatScreen from '../screens/PrivateChatScreen';
// import TabNavigator from './TabNavigator';
// import { ActivityIndicator, View } from 'react-native';
// import ProfileInfoScreen from '../screens/ProfileInfoScreen';
// import PhotoUploadScreen from '../screens/PhotoUploadScreen';
// import PreFinalScreen from '../screens/PreFinalScreen';
// import NameScreen from '../screens/NameScreen';
// import EmailScreen from '../screens/EmailScreen';
// import GenderScreen from '../screens/GenderScreen';
// import LocationScreen from '../screens/LocationScreen';
// import TypeScreen from '../screens/TypeScreen';
// import VerifyOTPScreen from '../screens/VerifyOTPScreen';
// import Toast from 'react-native-toast-message';
// import ProfileScreen from '../screens/ProfileScreen';
// import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';


// const Stack = createNativeStackNavigator();

// const AppNavigator = () => {
//   const { user, isLoading } = useContext(AuthContext);

//   if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
//     <NavigationContainer>
//       <Stack.Navigator screenOptions={{ headerShown: false }}>
//         {user ? (
//           // ✅ Authenticated → Go to full app
//           <>
//             <Stack.Screen name="Home" component={TabNavigator} />
//             <Stack.Screen name="EditProfile" component={EditProfileScreen} />
//             <Stack.Screen name="Profile" component={ProfileScreen} />
//             <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
//           </>
//         ) : (
//           // ✅ Not authenticated → Show auth flow
//           <>
//             <Stack.Screen name="Onboarding" component={OnboardingScreen} />
//             <Stack.Screen name="Login" component={LoginScreen} />
//             <Stack.Screen name="Register" component={RegisterScreen} />
//             <Stack.Screen name="NameScreen" component={NameScreen} />
//             <Stack.Screen name="EmailScreen" component={EmailScreen} />
//             <Stack.Screen name="PasswordScreen" component={PasswordScreen} />
//             <Stack.Screen name="GenderScreen" component={GenderScreen} />
//             <Stack.Screen name="Location" component={LocationScreen} />
//             <Stack.Screen name="Type" component={TypeScreen} />
//             <Stack.Screen name="ProfileInfo" component={ProfileInfoScreen} />
//             <Stack.Screen name="PhotoUploadScreen" component={PhotoUploadScreen} />
//             <Stack.Screen name="PreFinal" component={PreFinalScreen} />
//             <Stack.Screen name="VerifyOTPScreen" component={VerifyOTPScreen} />
//           </>
//         )}
//       </Stack.Navigator>
//       <Toast />
//     </NavigationContainer>
//   );
// };

// export default AppNavigator;
