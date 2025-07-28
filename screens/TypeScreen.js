import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../registrationUtils';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { ScrollView } from 'react-native';
import { Pressable } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import logo2 from '../assets/logo1.png';


const TypeScreen = () => {
  const [type, setType] = useState('');
  const navigation = useNavigation();
  const [error, setError] = useState('');



  useEffect(() => {
    getRegistrationProgress('Type').then(progressData => {
      if (progressData) {
        setType(progressData.type || '');
      }
    });
  }, []);


  const handleNext = () => {
    if (!type) {
      setError('Please select your degree program.');
      return;
    }

    saveRegistrationProgress('Type', { type });
    navigation.navigate('PreFinal');
  };


  // const handleNext = () => {
  //   if (type.trim() !== '') {
  //     // Save the current progress data including the name
  //     saveRegistrationProgress('Type', { type });
  //   }
  //   // Navigate to the next screen
  //   navigation.navigate('PreFinal');
  // };
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image source={logo2} style={styles.logo} resizeMode="contain" />
            </View>
            {/* <Text style={styles.headerTitle}>Join 34TH STREET</Text> */}
            <Text style={styles.headerSubtitle}>Connect across top universities</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '90%' }]} />
            </View>
          </View>

          {/* Title */}
          {/* <Text style={styles.title}>Set a Secure Password</Text>
      <Text style={styles.subtitle}>Create a strong password for your account</Text> */}

          {/* Password Input */}
          <View style={styles.section}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                fontFamily: 'GeezaPro-Bold',
                marginTop: 15,
                color: '#581845',
              }}>
              Select your degree program
            </Text>

            {/* <Text style={{marginTop: 30, fontSize: 15, color: 'gray'}}>
          34th Street users are matched based on these three gender 
        </Text> */}

            <View style={{ marginTop: 30, flexDirection: 'column', gap: 12 }}>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={{ fontWeight: '500', fontSize: 15 }}>Bachelors </Text>
                <Pressable onPress={() => setType('Bachelors')}>
                  <FontAwesome
                    name="circle"
                    size={26}
                    color={type == 'Bachelors' ? '#581845' : '#F0F0F0'}
                  />
                </Pressable>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={{ fontWeight: '500', fontSize: 15 }}>Masters </Text>
                <Pressable onPress={() => setType('Masters')}>
                  <FontAwesome
                    name="circle"
                    size={26}
                    color={type == 'Masters' ? '#581845' : '#F0F0F0'}
                  />
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={{ fontWeight: '500', fontSize: 15 }}>PHD</Text>
                <Pressable onPress={() => setType('PHD')}>
                  <FontAwesome
                    name="circle"
                    size={26}
                    color={type == 'PHD' ? '#581845' : '#F0F0F0'}
                  />
                </Pressable>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={{ fontWeight: '500', fontSize: 15 }}>MBA</Text>
                <Pressable onPress={() => setType('MBA')}>
                  <FontAwesome
                    name="circle"
                    size={26}
                    color={type == 'MBA' ? '#581845' : '#F0F0F0'}
                  />
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <Text style={{ fontWeight: '500', fontSize: 15 }}>Others</Text>

                <Pressable onPress={() => setType('Degree')}>
                  <FontAwesome
                    name="circle"
                    size={26}
                    color={type == 'Degree' ? '#581845' : '#F0F0F0'}
                  />
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}


            {/* Next Button */}
            <TouchableOpacity style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default TypeScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    backgroundColor: '#581845',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    padding: 40,
    alignItems: 'center',
  },
  logoWrapper: {
    backgroundColor: 'white', // Contrast layer
    padding: 12,
    borderRadius: 80, // Makes it circular (assuming round logo)
    elevation: 4, // Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 10,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 10,
  },
  section: {
    marginTop: 40,
    padding: 20,
  },
  headerText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 23,
    fontFamily: 'GeezaPro-Bold',
    color: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  progressContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffb60a',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  headerSubtitle: { fontSize: 14, color: '#ffb60a', marginTop: 5 },
  subHeaderText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'GeezaPro-Bold',
    color: '#ffb60a',
    fontWeight: 'bold',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#000' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 30 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#581845', },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 12,
  },
  nextButton: {
    backgroundColor: '#581845',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  nextButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  map: { width: '100%', height: 400, marginTop: 20, borderRadius: 5 },
  marker: { backgroundColor: 'black', padding: 8, borderRadius: 5 },
  markerText: { color: 'white', fontSize: 14, fontWeight: '500' },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 12,
  },

});
