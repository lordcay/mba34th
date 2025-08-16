// PasswordScreen.js
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

const LocationScreen = () => {
  const navigation = useNavigation();

  const [region, setRegion] = useState({
    latitude: 37.7749, // Default to San Francisco
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [location, setLocation] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    (async () => {
      // Request location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert('Permission Denied', 'Enable location permissions to proceed.');
        return;
      }

      // Get the current location
      let currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;

      // Update region and marker
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });

      // Reverse geocode to get human-readable location
      let reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverseGeocode.length > 0) {
        const { city, country } = reverseGeocode[0];
        const formattedLocation = `${capitalizeFirst(city)}, ${capitalizeFirst(country)}`;
        setLocation(formattedLocation);
      }


    })();
  }, []);


  const handleMarkerDragEnd = async (coordinate) => {
    const { latitude, longitude } = coordinate;
    setRegion({ ...region, latitude, longitude });

    // Reverse geocode the new location
    let reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (reverseGeocode.length > 0) {
      const { city, country } = reverseGeocode[0];
      const formattedLocation = `${capitalizeFirst(city)}, ${capitalizeFirst(country)}`;
      setLocation(formattedLocation);
    }


  };

  const handleNext = () => {
    saveRegistrationProgress('Location', { location });
    // Navigate to the next screen
    navigation.navigate('Type');
  };
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.innerContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Fontisto name="email" size={30} color="white" />
            <Text style={styles.headerTitle}>Join 34TH STREET</Text>
            <Text style={styles.headerSubtitle}>Connect across top universities</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '70%' }]} />
            </View>
          </View>


          <MapView
            region={region}
            style={styles.map}
            showsUserLocation
            showsMyLocationButton
            onRegionChangeComplete={setRegion}
          >
            <Marker
              // onDragEnd={e => handleMarkerDragEnd(e.nativeEvent.coordinate)}
              draggable
              coordinate={{ latitude: region.latitude, longitude: region.longitude }}
              onDragEnd={(e) => handleMarkerDragEnd(e.nativeEvent.coordinate)}
            >
              <View style={styles.marker}>
                <Text style={styles.markerText}>{location || 'Loading...'}</Text>
              </View>
            </Marker>
          </MapView>

          {/* Next Button */}
          <TouchableOpacity style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default LocationScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  headerText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 23,
    fontFamily: 'GeezaPro-Bold',
    color: 'white',
  },
  scrollContainer: { padding: 20 },
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
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
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
});