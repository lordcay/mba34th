


import React, { useState, useContext } from 'react';
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


const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  // const { login } = useContext(AuthContext);
  const { login, checkProfileCompletion } = useContext(AuthContext);


  const signInUser = async () => {
    setLoading(true);
    if (!email || !password) {
      Alert.alert('Fill all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        'http://192.168.0.169:4000/accounts/authenticate',
        { email: email.trim(), password: password.trim() }
      );
      const { token, id } = response.data;

      // 1️⃣ Login & store user
      await login(token, id);

      // 2️⃣ Get stored user back from AsyncStorage
      const storedUser = await AsyncStorage.getItem('user');
      const parsedUser = JSON.parse(storedUser);

      // 3️⃣ Check profile completion
      if (checkProfileCompletion(parsedUser)) {
        // Profile is complete, go to full app
        navigation.reset({ index: 0, routes: [{ name: 'MainStack' }] });
      } else {
        // Incomplete — force to EditProfileScreen
        navigation.reset({ index: 0, routes: [{ name: 'EditProfileScreen' }] });
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
                  placeholder="Email address"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={email}
                  onChangeText={(text) => setEmail(text.toLowerCase())}

                  // onChangeText={setEmail}
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputCard}>
                <AntDesign name="lock1" size={22} color="#581845" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureText}
                  returnKeyType="go"
                  onSubmitEditing={signInUser}
                />
                <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                  <Entypo name={secureText ? 'eye' : 'eye-with-line'} size={22} color="#aaa" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={signInUser} style={styles.loginButton}>
                <Text style={styles.loginText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPasswordScreen')}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('NameScreen')}>
                <Text style={styles.registerLink}>Don’t have an account? Register</Text>
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
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 20,
    elevation: 4,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: '#222',
  },
  loginButton: {
    backgroundColor: '#581845',
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 10,
    elevation: 4,
  },
  loginText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
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
});
