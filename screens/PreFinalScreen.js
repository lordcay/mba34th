import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import axios from 'axios';
import jwtDecode from 'jwt-decode'; // Import this!
import { AuthContext } from '../context/AuthContext';
import { getRegistrationProgress } from '../registrationUtils';
import { TouchableOpacity } from 'react-native';

const PreFinalScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, setToken } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      console.log('Loaded token from AsyncStorage:', storedToken);
      setToken(storedToken);
    };

    loadToken();
  }, []);


  useEffect(() => {
    getAllUserData();
  }, []);

  useEffect(() => {
    if (token) {
      navigation.replace('MainStack', { screen: 'Main' });
    }
  }, [token, navigation]);



  const getAllUserData = async () => {
    try {
      const screens = ['Name', 'Email', 'Password', 'Gender', 'Birth', 'Type'];
      let userData = {};

      for (const screen of screens) {
        const data = await getRegistrationProgress(screen);
        if (data) {
          userData = { ...userData, ...data };
        }
      }

      // ✅ Convert birth date format before sending
      if (userData.birth) {
        const [day, month, year] = userData.birth.split('/');
        userData.birth = `${year}-${month}-${day}`; // Convert to YYYY-MM-DD
      }

      setUserData(userData);
    } catch (error) {
      console.error('Error retrieving user data:', error);
    }
  };

  const clearAllScreenData = async () => {
    try {
      const screens = ['Name', 'Email', 'Password', 'Gender', 'Birth', 'Type'];
      const keys = screens.map(screen => `registration_progress_${screen}`);
      await AsyncStorage.multiRemove(keys);
      console.log('All screen data cleared successfully');
    } catch (error) {
      console.error('Error clearing screen data:', error);
    }
  };




  // const registerUser = async () => {
  //   setLoading(true); // Start loader
  //   try {
  //       if (!userData?.email) {
  //           console.error("Email is missing!");
  //           setLoading(false);

  //           return;
  //       }

  //       console.log('Attempting to register user with data:', userData);

  //       const response = await axios.post('http://192.168.0.169:4000/accounts/register', userData);
  //       console.log('Register response:', response.data);

  //       const { token, userId } = response.data;

  //       if (!userId) {
  //           console.error("User ID is missing from the response!");
  //           setLoading(false);

  //           return;
  //       }

  //       //  Do NOT store token yet
  //       console.log("Navigating to VerifyOTP with:", userId, userData.email);

  //       //  Navigate to OTP verification screen
  //       navigation.navigate('VerifyOTPScreen', { userId, email: userData.email });

  //       // Clear temporary registration data
  //       clearAllScreenData();
  //   } catch (error) {
  //       console.error('Error registering user:', error?.response?.data || error.message);
  //   }  finally {
  //     setLoading(false); // Stop loader
  //   }
  // };

  const registerUser = async () => {
    setLoading(true); // Start loader

    try {
      if (!userData?.email) {
        console.error("Email is missing!");
        setLoading(false);
        return;
      }

      // ✅ Log and validate required fields
      console.log("🧾 Final userData before register POST:", JSON.stringify(userData, null, 2));

      const requiredFields = ['email', 'password', 'firstName', 'lastName', 'gender', 'type'];
      for (const field of requiredFields) {
        if (!userData[field]) {
          console.error(`❌ Missing required field: ${field}`);
          Alert.alert('Error', `Missing required field: ${field}`);
          setLoading(false);
          return;
        }
      }

      // ✅ Clean payload (optional but recommended)
      const payload = {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        gender: userData.gender,
        type: userData.type,
        origin: userData.origin || '',
        bio: userData.bio || '',
        interests: userData.interests || [],
      };

      const response = await axios.post('http://192.168.0.169:4000/accounts/register', payload);
      console.log('Register response:', response.data);

      const { token, userId } = response.data;

      if (!userId) {
        console.error("User ID is missing from the response!");
        setLoading(false);
        return;
      }

      console.log("Navigating to VerifyOTP with:", userId, userData.email);
      navigation.navigate('VerifyOTPScreen', { userId, email: userData.email });
      clearAllScreenData();
    } catch (error) {
      console.error('Error registering user:', error?.response?.data || error.message);
    } finally {
      setLoading(false); // Stop loader
    }
  };


  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        console.log("Token is missing, waiting for token...");
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        if (!decodedToken?.userId) {
          console.error("Invalid token, redirecting to Login");
          await AsyncStorage.removeItem('token');
          setToken(null);
          navigation.navigate('Login');
          return;
        }

        // ✅ Check if the user is verified before auto-login
        const userId = decodedToken.userId;
        console.log('Decoded Token User ID:', userId);

        const response = await axios.get(`http://192.168.0.169:4000/users/${userId}`);

        if (!response.data.user || !response.data.user.isVerified) {
          console.log('User not verified. Redirecting to VerifyOTP.');
          navigation.navigate('VerifyOTPScreen', { userId, email: response.data.user.email });
          return;
        }

        console.log('User verified, navigating to MainStack');
        navigation.navigate('MainStack', { screen: 'Main' });

      } catch (error) {
        console.error('User verification failed:', error?.response?.data || error.message);
        await AsyncStorage.removeItem('token');
        setToken(null);
        navigation.navigate('Register');
      }
    };

    if (token) {
      verifyUser();
    }
  }, [token, navigation]);


  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <LottieView
          source={require('../assets/loader.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All set to register</Text>
        <Text style={styles.subtitle}>Setting up your profile...</Text>
      </View>

      <LottieView
        source={require('../assets/set.json')}
        autoPlay
        loop
        style={styles.animation}
      />

      <TouchableOpacity style={styles.nextButton}
        onPress={registerUser}
      >
        <Text style={styles.nextButtonText}>Let's step in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PreFinalScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { marginTop: 80, marginLeft: 20 },
  title: { fontSize: 35, fontWeight: 'bold', fontFamily: 'GeezaPro-Bold' },
  subtitle: { fontSize: 33, fontWeight: 'bold', fontFamily: 'GeezaPro-Bold', marginTop: 10 },
  animation: { height: 260, width: 300, alignSelf: 'center', marginTop: 40 },
  button: { backgroundColor: '#900C3F', padding: 15, marginTop: 'auto' },
  buttonText: { textAlign: 'center', color: 'white', fontWeight: '600', fontSize: 15 },
  loaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  nextButton: {
    backgroundColor: '#581845',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 120,
    marginRight: 30,
    marginLeft: 30,
  },
  nextButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

});