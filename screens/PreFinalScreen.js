

import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import React, { useContext, useEffect, useLayoutEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';
import { getRegistrationProgress } from '../registrationUtils';
// import CheckBox from '@react-native-community/checkbox'; // run: expo install @react-native-community/checkbox
import Checkbox from 'expo-checkbox';

const PreFinalScreen = () => {
  const navigation = useNavigation();
  const { token, setToken } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
    const [agree, setAgree] = useState(false);


     useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,     // Cleaner look
      headerTitle: '',
      headerBackTitle: 'Back',
      headerBackTitleVisible: true,
      headerStyle: {
        backgroundColor: '#ffffff',   // Top bar background
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#581845',     // Back icon color
      headerShadowVisible: false,
    });
  }, [navigation]);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    loadToken();
    getAllUserData();
  }, []);

  const getAllUserData = async () => {
    const screens = ['Name', 'Email', 'Password', 'Gender', 'Birth', 'Type'];
    let data = {};
    for (const screen of screens) {
      const part = await getRegistrationProgress(screen);
      if (part) data = { ...data, ...part };
    }
    if (data.birth) {
      const [d, m, y] = data.birth.split('/');
      data.birth = `${y}-${m}-${d}`;
    }
    setUserData(data);
  };

  const clearAllScreenData = async () => {
    const keys = ['Name', 'Email', 'Password', 'Gender', 'Birth', 'Type'].map(
      key => `registration_progress_${key}`
    );
    await AsyncStorage.multiRemove(keys);
  };

  const registerUser = async () => {
    if (!agree) {
      alert('Please agree to the Terms & Privacy Policy before joining.');
      return;
    }

    setLoading(true);
    try {
      if (!userData?.email) return;
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
      const res = await axios.post('https://three4th-street-backend.onrender.com/accounts/register', payload);
      const { userId } = res.data;
      navigation.navigate('VerifyOTPScreen', { userId, email: userData.email });
      clearAllScreenData();
    } catch (err) {
      console.error('Registration error:', err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <LottieView
          source={require('../assets/globe.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <LottieView
          source={require('../assets/globe.json')}
          autoPlay
          loop={false}
          style={styles.animation}
        />
        <Text style={styles.header}>You're All Set!</Text>
        <Text style={styles.subtext}>
          Getting your profile set to meet your verified village people.
        </Text>

{/* --- Policy Agreement Section --- */}
        <View style={styles.checkboxContainer}>
          <Checkbox
            value={agree}
            onValueChange={setAgree}
            tintColors={{ true: '#581845', false: '#581845' }}
          />
          <Text style={styles.checkboxText}>
            I agree to the{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://34thstreet.net')}>
              Terms & Conditions
            </Text>{' '}
            and{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://34thstreet.net')}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>

        <TouchableOpacity style={[styles.btn, { opacity: agree ? 1 : 0.5 }]}
         onPress={registerUser} 
         disabled={!agree}
         >
          <Text style={styles.btnText}>Join 34th Street</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PreFinalScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  animation: {
    height: 130,
    marginBottom: 25,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  btn: {
    marginTop: 30,
    backgroundColor: '#581845',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loader: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxContainer: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginTop: 25,
  marginBottom: 10,
  paddingHorizontal: 10,
},

checkboxText: {
  flex: 1,
  fontSize: 14,
  color: '#333',
  marginLeft: 8,
  lineHeight: 20,
},

// 👇🏾 This one adds the "clickable link" look
link: {
  color: '#581845', // your brand color
  fontWeight: '700',
  textDecorationLine: 'underline',
  textDecorationColor: '#581845',
},

});
