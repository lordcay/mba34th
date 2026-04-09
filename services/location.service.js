/**
 * Location Service - Tinder-style Location Management
 * Handles location permissions, tracking, and API updates
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = 'user_location_cache';
const LOCATION_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Request location permissions
 * @returns {Promise<boolean>} Whether permission was granted
 */
export const requestLocationPermission = async () => {
  try {
    // On Android, first check if location services are enabled
    if (Platform.OS === 'android') {
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        console.log('📍 Location services are disabled on Android');
        return false;
      }
    }

    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error requesting location permission:', error);
    return false;
  }
};

/**
 * Check if location permission is granted
 * @returns {Promise<boolean>}
 */
export const hasLocationPermission = async () => {
  try {
    // On Android, also check if location services are enabled
    if (Platform.OS === 'android') {
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        return false;
      }
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error checking location permission:', error);
    return false;
  }
};

/**
 * Get the current location coordinates and city name
 * @returns {Promise<Object|null>} Location object with coordinates and city
 */
export const getCurrentLocation = async () => {
  try {
    const hasPermission = await hasLocationPermission();
    if (!hasPermission) {
      console.log('📍 No location permission');
      return null;
    }

    // Platform-specific location options
    const locationOptions = Platform.select({
      android: {
        accuracy: Location.Accuracy.High, // Android works better with high accuracy
        timeInterval: 10000,
        mayShowUserSettingsDialog: true,
      },
      ios: {
        accuracy: Location.Accuracy.Balanced,
      },
    });

    // Get current position with platform-specific settings
    const position = await Location.getCurrentPositionAsync(locationOptions);

    const { latitude, longitude } = position.coords;
    console.log('📍 Got coordinates:', { latitude, longitude, platform: Platform.OS });

    // Reverse geocode to get city name
    let currentCity = '';
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      console.log('📍 Reverse geocode result:', JSON.stringify(reverseGeocode[0]));
      
      if (reverseGeocode.length > 0) {
        const geoData = reverseGeocode[0];
        // Android and iOS return slightly different structures
        // Try multiple fields to get the best city name
        const city = geoData.city || geoData.subregion || geoData.district || geoData.name;
        const region = geoData.region || geoData.subAdminArea;
        const country = geoData.country || geoData.isoCountryCode;
        
        currentCity = formatCityName(city, region, country);
        console.log('📍 Formatted city:', currentCity);
      }
    } catch (geoError) {
      console.warn('⚠️ Reverse geocoding failed:', geoError);
      // If geocoding fails, still save coordinates so distance can be calculated
    }

    const locationData = {
      latitude,
      longitude,
      currentCity: currentCity || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`, // Fallback to coords if no city
      timestamp: Date.now(),
    };

    // Cache the location
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(locationData));

    return locationData;
  } catch (error) {
    console.error('❌ Error getting current location:', error);
    return null;
  }
};

/**
 * Format city name for display
 */
const formatCityName = (city, region, country) => {
  const parts = [];
  
  if (city) {
    parts.push(capitalizeFirst(city));
  }
  
  if (country) {
    parts.push(capitalizeFirst(country));
  }

  return parts.join(', ') || 'Unknown Location';
};

/**
 * Capitalize first letter of each word
 */
const capitalizeFirst = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Update user location on the backend
 * @param {Object} locationData Location data to send
 * @returns {Promise<Object|null>} Updated user object
 */
export const updateLocationOnServer = async (locationData) => {
  try {
    if (!locationData?.currentCity) {
      console.log('📍 No location data to update');
      return null;
    }

    const response = await api.put('/accounts/me/location', {
      currentCity: locationData.currentCity,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      locationUpdatedAt: new Date().toISOString(),
    });

    console.log('✅ Location updated on server:', locationData.currentCity);
    return response.data?.user || null;
  } catch (error) {
    console.error('❌ Failed to update location on server:', error?.response?.data || error?.message);
    return null;
  }
};

/**
 * Get and update location in one call (convenience method)
 * @returns {Promise<Object|null>} Updated user object
 */
export const refreshAndUpdateLocation = async () => {
  try {
    const locationData = await getCurrentLocation();
    if (locationData) {
      return await updateLocationOnServer(locationData);
    }
    return null;
  } catch (error) {
    console.error('❌ Error refreshing location:', error);
    return null;
  }
};

/**
 * Check if location should be refreshed based on time interval
 * @returns {Promise<boolean>}
 */
export const shouldRefreshLocation = async () => {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return true;

    const { timestamp } = JSON.parse(cached);
    const elapsed = Date.now() - timestamp;
    return elapsed >= LOCATION_UPDATE_INTERVAL;
  } catch {
    return true;
  }
};

/**
 * Get cached location data
 * @returns {Promise<Object|null>}
 */
export const getCachedLocation = async () => {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

/**
 * Update location sharing preference
 * @param {boolean} enabled Whether location sharing should be enabled
 * @returns {Promise<Object|null>}
 */
export const setLocationSharingEnabled = async (enabled) => {
  try {
    const response = await api.put('/accounts/me/location-settings', {
      locationSharingEnabled: enabled,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to update location sharing setting:', error);
    return null;
  }
};

/**
 * Get current user's location settings from server
 * @returns {Promise<Object|null>}
 */
export const getMyLocationSettings = async () => {
  try {
    const response = await api.get('/accounts/me/location');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get location settings:', error);
    return null;
  }
};

/**
 * Format distance for display (Tinder-style)
 * @param {number} distanceKm Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) {
    return null;
  }

  if (distanceKm < 1) {
    return 'Less than 1 km';
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceKm)} km`;
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Geocode an address to get coordinates
 * @param {string} address The address to geocode
 * @returns {Promise<Object|null>} Object with latitude, longitude, or null if failed
 */
export const geocodeAddress = async (address) => {
  try {
    if (!address || typeof address !== 'string') return null;

    const geocodeResult = await Location.geocodeAsync(address);
    if (geocodeResult.length > 0) {
      const { latitude, longitude } = geocodeResult[0];
      return { latitude, longitude };
    }
    return null;
  } catch (error) {
    console.error('❌ Error geocoding address:', error);
    return null;
  }
};

export default {
  requestLocationPermission,
  hasLocationPermission,
  getCurrentLocation,
  updateLocationOnServer,
  refreshAndUpdateLocation,
  shouldRefreshLocation,
  getCachedLocation,
  setLocationSharingEnabled,
  getMyLocationSettings,
  formatDistance,
  calculateDistance,
  geocodeAddress,
};
