


// import React, { useState, useContext } from 'react';
// import {
//   StyleSheet,
//   Text,
//   View,
//   SafeAreaView,
//   TextInput,
//   TouchableOpacity,
//   KeyboardAvoidingView,
//   Platform,
//   Alert,
//   Keyboard,
//   TouchableWithoutFeedback,
//   ScrollView,
//   Image,
// } from 'react-native';
// import Entypo from 'react-native-vector-icons/Entypo';
// import AntDesign from 'react-native-vector-icons/AntDesign';
// import FontAwesome from 'react-native-vector-icons/FontAwesome';
// import LottieView from 'lottie-react-native';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import { useNavigation } from '@react-navigation/native';
// import logo2 from '../assets/logo1.png';
// import AsyncStorage from '@react-native-async-storage/async-storage';


// const LoginScreen = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [secureText, setSecureText] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const navigation = useNavigation();
//   // const { login } = useContext(AuthContext);
//   const { login, checkProfileCompletion } = useContext(AuthContext);


//   const signInUser = async () => {
//     setLoading(true);
//     if (!email || !password) {
//       Alert.alert('Fill all fields');
//       setLoading(false);
//       return;
//     }

//     try {
//       const response = await axios.post(
//         'http://192.168.14.134:4000/accounts/authenticate',
//         { email: email.trim(), password: password.trim() }
//       );
//       const { token, id, user } = response.data;
//       const finalId = id || user?._id;   // fallback if backend returns _id


//       // 1️⃣ Login & store user
//       await login(token,finalId, user);

//       // 2️⃣ Get stored user back from AsyncStorage
//       const storedUser = await AsyncStorage.getItem('user');
//       const parsedUser = JSON.parse(storedUser);

//       // 3️⃣ Check profile completion
//       if (checkProfileCompletion(parsedUser)) {
//         // Profile is complete, go to full app
//         navigation.reset({ index: 0, routes: [{ name: 'MainStack' }] });
//       } else {
//         // Incomplete — force to EditProfileScreen
//         navigation.reset({ index: 0, routes: [{ name: 'EditProfileScreen' }] });
//       }
//     } catch (error) {
//       Alert.alert('Login failed', error?.response?.data?.message || 'Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };




//   return (
//     <SafeAreaView style={styles.container}>
//       <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//         <View style={styles.innerContainer}>
//           <View style={styles.topArea}>
//             <Image source={logo2} style={styles.logo} resizeMode="contain" />
//             {/* <Text style={styles.welcomeText}>Welcome to 34TH STREET</Text> */}
//             <Text style={styles.subText}>Rooted in Africa, Rising Worldwide</Text>
//           </View>

//           <KeyboardAvoidingView
//             behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//             style={{ flex: 1 }}
//           >
//             <ScrollView
//               contentContainerStyle={styles.formContainer}
//               keyboardShouldPersistTaps="handled"
//               showsVerticalScrollIndicator={false}
//             >
//               <View style={styles.inputCard}>
//                 <FontAwesome name="envelope-o" size={20} color="#581845" />
//                 <TextInput
//                   placeholder="Email address"
//                   placeholderTextColor="#999"
//                   style={styles.input}
//                   value={email}
//                   onChangeText={(text) => setEmail(text.toLowerCase())}

//                   // onChangeText={setEmail}
//                   keyboardType="email-address"
//                   returnKeyType="next"
//                 />
//               </View>

//               <View style={styles.inputCard}>
//                 <AntDesign name="lock" size={22} color="#581845" />
//                 <TextInput
//                   placeholder="Password"
//                   placeholderTextColor="#999"
//                   style={styles.input}
//                   value={password}
//                   onChangeText={setPassword}
//                   secureTextEntry={secureText}
//                   returnKeyType="go"
//                   onSubmitEditing={signInUser}
//                 />
//                 <TouchableOpacity onPress={() => setSecureText(!secureText)}>
//                   <Entypo name={secureText ? 'eye' : 'eye-with-line'} size={22} color="#aaa" />
//                 </TouchableOpacity>
//               </View>

//               <TouchableOpacity onPress={signInUser} style={styles.loginButton}>
//                 <Text style={styles.loginText}>Sign In</Text>
//               </TouchableOpacity>

//               <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
//                 <Text style={styles.forgotText}>Forgot Password?</Text>
//               </TouchableOpacity>

//               <TouchableOpacity onPress={() => navigation.navigate('NameScreen')}>
//                 <Text style={styles.registerLink}>Don’t have an account? Register</Text>
//               </TouchableOpacity>
//             </ScrollView>
//           </KeyboardAvoidingView>

//           {loading && (
//             <View style={styles.loadingOverlay}>
//               <LottieView
//                 source={require('../assets/globe.json')}
//                 autoPlay
//                 loop
//                 style={{ width: 180, height: 180 }}
//               />
//             </View>
//           )}
//         </View>
//       </TouchableWithoutFeedback>
//     </SafeAreaView>
//   );
// };

// export default LoginScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   innerContainer: { flex: 1, backgroundColor: '#fff' },
//   topArea: {
//     marginTop: '10%',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//   },
//   logo: {
//     width: 120,
//     height: 80,
//     marginBottom: 10,
//   },
//   welcomeText: {
//     color: '#581845',
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginTop: 10,
//   },
//   subText: {
//     color: '#333',
//     fontSize: 14,
//     marginTop: 4,
//     fontStyle: 'italic',
//   },
//   formContainer: {
//     flexGrow: 1,
//     marginTop: 30,
//     paddingHorizontal: 30,
//     paddingBottom: 40,
//   },
//   inputCard: {
//     backgroundColor: '#fff',
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderRadius: 30,
//     paddingHorizontal: 18,
//     paddingVertical: 12,
//     marginBottom: 20,
//     elevation: 4,
//   },
//   input: {
//     flex: 1,
//     marginLeft: 12,
//     color: '#222',
//   },
//   loginButton: {
//     backgroundColor: '#581845',
//     paddingVertical: 15,
//     borderRadius: 30,
//     marginTop: 10,
//     elevation: 4,
//   },
//   loginText: {
//     color: '#fff',
//     textAlign: 'center',
//     fontWeight: '600',
//     fontSize: 18,
//   },
//   forgotText: {
//     color: '#581845',
//     textAlign: 'right',
//     marginTop: 10,
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   registerLink: {
//     textAlign: 'center',
//     color: '#581845',
//     marginTop: 20,
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   loadingOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 999,
//   },
// });



import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import LottieView from 'lottie-react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import logo2 from '../assets/logo1.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../config';
import {
  isBiometricSupported,
  isBiometricEnabled,
  getBiometricCredentials,
  getBiometricTypeName,
  authenticateWithBiometrics,
  saveBiometricCredentials,
} from '../services/biometric.service';


const normalizeAuthUser = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const source = payload.user ?? payload;
  if (!source || typeof source !== 'object') return null;

  const {
    token: _token,
    jwtToken: _jwtToken,
    refreshToken: _refreshToken,
    ...user
  } = source;

  return user?.id || user?._id || user?.email ? user : null;
};

const NETWORK_REQUEST_TIMEOUT_MS = 20000;



const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometrics');
  const biometricGlow = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef(null);
  const navigation = useNavigation();
  const { login, checkProfileCompletion } = useContext(AuthContext);

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  // Glow pulse animation for biometric card
  useEffect(() => {
    if (!biometricAvailable) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(biometricGlow, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(biometricGlow, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [biometricAvailable, biometricGlow]);

  const checkBiometricAvailability = async () => {
    const { supported } = await isBiometricSupported();
    const enabled = await isBiometricEnabled();
    const creds = await getBiometricCredentials();
    if (supported && enabled && creds) {
      setBiometricAvailable(true);
      const typeName = await getBiometricTypeName();
      setBiometricType(typeName);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);

      const authResult = await authenticateWithBiometrics(
        `Sign in with ${biometricType}`
      );

      if (!authResult.success) {
        setLoading(false);
        return;
      }

      // Get stored credentials from Secure Store
      const creds = await getBiometricCredentials();
      if (!creds) {
        Alert.alert('Biometric Login', 'No saved credentials found. Please sign in with your email and password.');
        setLoading(false);
        return;
      }

      // Verify stored token is still valid by calling user endpoint
      const verifyRes = await axios.get(
        `${API_BASE_URL}/accounts/${creds.userId}`,
        {
          headers: { Authorization: `Bearer ${creds.token}` },
          timeout: NETWORK_REQUEST_TIMEOUT_MS,
        }
      ).catch(() => null);

      if (!verifyRes?.data?.user) {
        Alert.alert(
          'Session Expired',
          'Your saved session has expired. Please sign in with your email and password.',
        );
        setLoading(false);
        return;
      }

      // Token is still valid — log in directly
      const verifiedUser = normalizeAuthUser(verifyRes.data);
      const loggedInUser = await login(creds.token, creds.userId, creds.email, verifiedUser);

      if (checkProfileCompletion(loggedInUser)) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'EditProfile' }] });
      }
    } catch (error) {
      Alert.alert('Login Failed', 'Biometric login failed. Please try with email and password.');
    } finally {
      setLoading(false);
    }
  };

  const openSupport = () => {
    navigation.navigate('SupportWeb', {
      title: 'Support',
      url: 'https://34thstreet.net/app-support/',
    });
  };


  const signInUser = async () => {
    setLoading(true);
    if (!email || !password) {
      Alert.alert('Fill all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        API_BASE_URL + '/accounts/authenticate',
        { email: email.trim(), password: password.trim() },
        { timeout: NETWORK_REQUEST_TIMEOUT_MS }
      );
      const { token } = response.data;
      const authUser = normalizeAuthUser(response.data);
      const resolvedUserId = response.data?.id || authUser?.id || authUser?._id;

      // 1️⃣ Login & store user (pass email for biometric credential update)
      const loggedInUser = await login(token, resolvedUserId, email.trim(), authUser);

      // 3️⃣ Offer biometric setup if device supports it and not yet enabled
      const { supported } = await isBiometricSupported();
      const bioEnabled = await isBiometricEnabled();
      if (supported && !bioEnabled) {
        const typeName = await getBiometricTypeName();
        Alert.alert(
          `Enable ${typeName} Login?`,
          `Sign in faster next time using ${typeName}. You can change this later in your profile settings.`,
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async () => {
                const authResult = await authenticateWithBiometrics(`Enable ${typeName}`);
                if (authResult.success) {
                  await saveBiometricCredentials(email.trim(), token, String(resolvedUserId));
                }
              },
            },
          ]
        );
      }

      // 4️⃣ Check profile completion
      if (checkProfileCompletion(loggedInUser)) {
        // Profile is complete, go to full app
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        // Incomplete — force to EditProfile
        navigation.reset({ index: 0, routes: [{ name: 'EditProfile' }] });
      }
    } catch (error) {
      Alert.alert('Login failed', error?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };




  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          <View style={styles.topArea}>
            <Image source={logo2} style={styles.logo} resizeMode="contain" />
            {/* <Text style={styles.welcomeText}>Welcome to 34TH STREET</Text> */}
            <Text style={styles.subText}>Rooted in Africa, Rising Worldwide</Text>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.formContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputCard}>
                <FontAwesome name="envelope-o" size={20} color="#581845" />
                <TextInput
                  placeholder="School or recovery email"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => setEmail(text.toLowerCase())}
                  keyboardType="email-address"
                  returnKeyType="next"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardAppearance="light"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputCard}>
                <AntDesign name="lock" size={22} color="#581845" />
                <TextInput
                  ref={passwordRef}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                  returnKeyType="go"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  keyboardAppearance="light"
                  onSubmitEditing={signInUser}
                />
                <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                  <Entypo name={secureText ? 'eye' : 'eye-with-line'} size={22} color="#aaa" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={signInUser} style={styles.loginButton}>
                <Text style={styles.loginText}>Sign In</Text>
              </TouchableOpacity>

              {/* Biometric Login — Modern Card Design */}
              {biometricAvailable && (
                <View style={styles.biometricSection}>
                  {/* Divider */}
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or continue with</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  {/* Biometric Card */}
                  <TouchableOpacity
                    onPress={handleBiometricLogin}
                    activeOpacity={0.85}
                    style={styles.biometricCardOuter}
                  >
                    <Animated.View
                      style={[
                        styles.biometricGlowRing,
                        {
                          borderColor: biometricGlow.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['rgba(88,24,69,0.15)', 'rgba(88,24,69,0.55)'],
                          }),
                          shadowOpacity: biometricGlow.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.08, 0.28],
                          }),
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={['#ffffff', '#fdf3f9']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.biometricCardInner}
                      >
                        {/* Icon */}
                        <View style={styles.biometricIconRing}>
                          <LinearGradient
                            colors={['#7b2d6a', '#581845']}
                            style={styles.biometricIconGradient}
                          >
                            <MaterialCommunityIcons
                              name={biometricType === 'Face ID' ? 'face-recognition' : 'fingerprint'}
                              size={28}
                              color="#fff"
                            />
                          </LinearGradient>
                        </View>

                        {/* Label */}
                        <View style={styles.biometricLabelCol}>
                          <Text style={styles.biometricTitle}>Sign in with {biometricType}</Text>
                          <Text style={styles.biometricSubtitle}>Fast & secure authentication</Text>
                        </View>

                        {/* Arrow */}
                        <Ionicons name="chevron-forward" size={18} color="#c084b6" />
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('NameScreen')}>
                <Text style={styles.registerLink}>Don't have an account? Register</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={openSupport} style={styles.supportRow}>
                <Ionicons name="help-circle-outline" size={18} color="#581845" />
                <Text style={styles.supportText}>
                  Need help? Visit our Support Center
                </Text>
              </TouchableOpacity>

            </ScrollView>
          </KeyboardAvoidingView>

          {loading && (
            <View style={styles.loadingOverlay}>
              <LottieView
                source={require('../assets/globe.json')}
                autoPlay
                loop
                style={{ width: 180, height: 180 }}
              />
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  innerContainer: { flex: 1, backgroundColor: '#fff' },
  topArea: {
    marginTop: '10%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 10,
  },
  welcomeText: {
    color: '#581845',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subText: {
    color: '#333',
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  formContainer: {
    flexGrow: 1,
    marginTop: 30,
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  inputCard: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#581845',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(88,24,69,0.08)',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: '#222',
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: '#581845',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#581845',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  forgotText: {
    color: '#581845',
    textAlign: 'right',
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  registerLink: {
    textAlign: 'center',
    color: '#581845',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  biometricSection: {
    marginTop: 28,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e8d8e5',
  },
  dividerText: {
    color: '#9e7090',
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 12,
    letterSpacing: 0.3,
  },
  biometricCardOuter: {
    borderRadius: 18,
  },
  biometricGlowRing: {
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#581845',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: '#fff',
  },
  biometricCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  biometricIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
  },
  biometricIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricLabelCol: {
    flex: 1,
  },
  biometricTitle: {
    color: '#2d0a22',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  biometricSubtitle: {
    color: '#9e7090',
    fontSize: 12,
    fontWeight: '400',
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    gap: 8,
  },
  supportText: {
    color: '#581845',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
