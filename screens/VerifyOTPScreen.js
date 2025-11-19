
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext'; // Ensure this is correctly imported
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import LottieView from 'lottie-react-native';

import axios from 'axios';


const VerifyOTPScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { setToken } = useContext(AuthContext); // Get setToken from context
  const { userId, email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);


  const verifyOTP = async () => {
    setLoading(true); // Start loader
    console.log(`🔎 Sending verification code to backend: ${otp}`);

    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://192.168.0.169:4000/accounts/verify-email', { token: otp });

      console.log("✅ Verification Response:", response.data);

      if (response.data.token) {
        await AsyncStorage.setItem('token', response.data.token);
        setToken(response.data.token); // ✅ This will trigger re-render and switch to MainStack
      }

      Alert.alert('Success', 'Your account has been verified!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('❌ Verification Error:', error?.response?.data || error.message);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    }
    finally {
      setLoading(false); // Stop loader
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <LottieView
          source={require('../assets/globe.json')}
          autoPlay
          loop
          style={{ width: 200, height: 200 }}
        />
        <Text style={styles.loaderText}>Verifying your code...</Text>
      </View>
    );
  }





  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Your Verification Code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>

      <TextInput
        style={styles.otpInput}
        placeholder="Enter OTP"
        keyboardType="numeric"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />

      <TouchableOpacity onPress={verifyOTP} style={styles.button}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>
    </View>
  );
};

export default VerifyOTPScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20 },
  otpInput: {
    width: '80%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 20
  },
  button: { backgroundColor: '#581845', padding: 15, width: '80%', borderRadius: 8 },
  buttonText: { textAlign: 'center', color: 'white', fontWeight: 'bold', fontSize: 16 },
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
  loaderText: {
    marginTop: 20,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },


});