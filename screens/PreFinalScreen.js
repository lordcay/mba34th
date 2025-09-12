

import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';
import { getRegistrationProgress } from '../registrationUtils';

const PreFinalScreen = () => {
  const navigation = useNavigation();
  const { token, setToken } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

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
      const res = await axios.post('http://192.168.0.169:4000/accounts/register', payload);
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
          Getting your profile set to meet your verified villager people.
        </Text>


        <TouchableOpacity style={styles.btn} onPress={registerUser}>
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
});
