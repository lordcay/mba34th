

import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
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
import SchoolNotListedScreen from '../screens/SchoolNotListedScreen';
import AlumniScreen from '../screens/AlumniScreen';
import Toast from 'react-native-toast-message';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import { navigationRef } from './RootNavigation';
import SupportWebScreen from '../screens/SupportWebScreen';
import CallScreen from '../screens/CallScreen';
import EventsScreen from '../screens/EventsScreen';
import ServicesScreen from '../screens/ServicesScreen';
import CreateServiceScreen from '../screens/CreateServiceScreen';
import SearchScreen from '../screens/SearchScreen';
import ConnectionRequestsScreen from '../screens/ConnectionRequestsScreen';
import ChatRoomsListScreen from '../screens/ChatRoomsListScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import ConnectionsScreen from '../screens/ConnectionsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import ServiceDetailScreen from '../screens/ServiceDetailScreen';


const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, isLoading, checkProfileCompletion } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
<NavigationContainer ref={navigationRef}>

      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 500 } },
            close: { animation: 'timing', config: { duration: 400 } },
          },
        }}
      >
      {user ? (
  checkProfileCompletion && !checkProfileCompletion(user) ? (
    <>
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="SupportWeb" component={SupportWebScreen} />
    </>
  ) : (
    <>
      <Stack.Screen name="Home" component={TabNavigator} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="ConnectionRequests" component={ConnectionRequestsScreen} />
      <Stack.Screen name="ConnectionsScreen" component={ConnectionsScreen} />
      <Stack.Screen name="ChatRoomsListScreen" component={ChatRoomsListScreen} />
      <Stack.Screen name="ChatRoomScreen" component={ChatRoomScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="Services" component={ServicesScreen} />
      <Stack.Screen name="CreateService" component={CreateServiceScreen} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="SupportWeb" component={SupportWebScreen} />
      <Stack.Screen name="Call" component={CallScreen} options={{ headerShown: false, gestureEnabled: false, cardStyleInterpolator: CardStyleInterpolators.forFadeFromCenter }} />
    </>
  )
) : (
          // ✅ No user → Auth stack
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
            <Stack.Screen name="SchoolNotListed" component={SchoolNotListedScreen} />
            <Stack.Screen name="Alumni" component={AlumniScreen} />
            <Stack.Screen name="SupportWeb" component={SupportWebScreen} />

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
// import UserProfileScreen from '../screens/UserProfileScreen';
// import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
// import ResetPasswordScreen from '../screens/ResetPasswordScreen';
// import { navigationRef } from './RootNavigation';



// const Stack = createNativeStackNavigator();

// const AppNavigator = () => {
//   const { user, isLoading, checkProfileCompletion } = useContext(AuthContext);

//   if (isLoading) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//         <ActivityIndicator size="large" />
//       </View>
//     );
//   }

//   return (
// <NavigationContainer ref={navigationRef}>

//       <Stack.Navigator
//         screenOptions={{
//           headerShown: false,
//           gestureEnabled: true,
//           cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
//           transitionSpec: {
//             open: { animation: 'timing', config: { duration: 500 } },
//             close: { animation: 'timing', config: { duration: 400 } },
//           },
//         }}
//       >
//         {user ? (
//           checkProfileCompletion && !checkProfileCompletion(user) ? (
//             // ✅ Has user, but incomplete profile → Force to EditProfileScreen
//             <Stack.Screen name="EditProfile" component={EditProfileScreen} />
//           ) : (
//             // ✅ Has user, profile is complete → Full app
//             <>
//               <Stack.Screen name="Home" component={TabNavigator} />
//               <Stack.Screen name="UserProfile" component={UserProfileScreen} />
//               <Stack.Screen name="EditProfile" component={EditProfileScreen} />
//               <Stack.Screen name="Profile" component={ProfileScreen} />
//               <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
//             </>
//           )
//         ) : (
//           // ✅ No user → Auth stack
//           <>
//             <Stack.Screen name="Onboarding" component={OnboardingScreen} />
//             <Stack.Screen name="Login" component={LoginScreen} />
//             <Stack.Screen name="Register" component={RegisterScreen} />
//             <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
//             <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
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

