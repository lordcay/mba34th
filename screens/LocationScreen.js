import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../registrationUtils';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { ScrollView } from 'react-native';

const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const LocationScreen = () => {
  const navigation = useNavigation();

  const [location, setLocation] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [manualEdit, setManualEdit] = useState(false);

  const detectCity = async () => {
    try {
      setDetecting(true);
      setErrorMsg(null);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. You can type your city manually.');
        setManualEdit(true);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (reverseGeocode.length > 0) {
        const geo = reverseGeocode[0];
        const city = geo.city || geo.subregion || geo.district || geo.name || '';
        const country = geo.country || '';
        const formatted = [capitalizeFirst(city), capitalizeFirst(country)].filter(Boolean).join(', ');
        setLocation(formatted || 'Unknown Location');
        setDetected(true);
      } else {
        setErrorMsg('Could not detect your city. Please type it manually.');
        setManualEdit(true);
      }
    } catch (error) {
      console.error('Location error:', error);
      setErrorMsg('Failed to detect location. Please type your city manually.');
      setManualEdit(true);
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    detectCity();
  }, []);

  const handleNext = () => {
    if (!location.trim()) {
      setErrorMsg('Please provide your city to continue.');
      return;
    }
    saveRegistrationProgress('Location', { location: location.trim() });
    navigation.navigate('Type');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Fontisto name="email" size={30} color="white" />
            <Text style={styles.headerTitle}>Join 34TH STREET</Text>
            <Text style={styles.headerSubtitle}>Connect across top universities</Text>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '70%' }]} />
            </View>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Your City</Text>
            <Text style={styles.subtitle}>
              We only capture your city — never your exact address or coordinates.
            </Text>

            <View style={styles.cityCard}>
              <View style={styles.cityIconCircle}>
                <Ionicons
                  name={detected ? 'location' : 'location-outline'}
                  size={32}
                  color={detected ? '#581845' : '#999'}
                />
              </View>

              {detecting ? (
                <View style={styles.detectingRow}>
                  <ActivityIndicator size="small" color="#581845" />
                  <Text style={styles.detectingText}>Detecting your city...</Text>
                </View>
              ) : detected && !manualEdit ? (
                <View style={styles.cityResultRow}>
                  <Text style={styles.cityText}>{location}</Text>
                  <TouchableOpacity onPress={() => setManualEdit(true)}>
                    <Text style={styles.changeLink}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.manualInputRow}>
                  <TextInput
                    style={styles.cityInput}
                    placeholder="e.g. New York, United States"
                    placeholderTextColor="#999"
                    value={location}
                    onChangeText={setLocation}
                    autoCapitalize="words"
                  />
                </View>
              )}
            </View>

            {!detecting && !detected && !manualEdit && (
              <TouchableOpacity style={styles.retryBtn} onPress={detectCity}>
                <Ionicons name="refresh" size={18} color="#581845" />
                <Text style={styles.retryText}>Try detecting again</Text>
              </TouchableOpacity>
            )}

            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <View style={styles.privacyBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#581845" />
              <Text style={styles.privacyText}>
                Your exact location is never stored or shown. Only your city name is visible to other members. You can hide it anytime in settings.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.nextButton, !location.trim() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!location.trim()}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LocationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  header: {
    backgroundColor: '#581845',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    alignItems: 'center',
    padding: 40,
  },
  progressContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#ffb60a' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  headerSubtitle: { fontSize: 14, color: '#ffb60a', marginTop: 5 },
  content: { marginTop: 30 },
  title: { fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  cityCard: {
    backgroundColor: '#faf5f9',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0e7ef',
  },
  cityIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0e7ef',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detectingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detectingText: { fontSize: 15, color: '#666' },
  cityResultRow: { alignItems: 'center', gap: 8 },
  cityText: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center' },
  changeLink: { fontSize: 14, color: '#581845', fontWeight: '600', textDecorationLine: 'underline' },
  manualInputRow: { width: '100%' },
  cityInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#222',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  retryText: { fontSize: 14, color: '#581845', fontWeight: '600' },
  errorText: { color: '#dc3545', fontSize: 13, marginTop: 12, textAlign: 'center' },
  privacyBox: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    padding: 14,
    backgroundColor: '#faf5f9',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
  },
  privacyText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },
  nextButton: {
    backgroundColor: '#581845',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 30,
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});