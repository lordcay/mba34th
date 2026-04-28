import React, { useState, useContext, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Pressable,
  StatusBar,
  Switch,
  ActionSheetIOS,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from 'react-native-modal';
import { ImageBackground } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons'; // For image delete icon
// import { useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingOverlay from '../components/OnboardingOverlay';
import { setLocationSharingEnabled, refreshAndUpdateLocation, hasLocationPermission, requestLocationPermission } from '../services/location.service';
import { API_BASE_URL } from '../config';
import api from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  isBiometricSupported,
  isBiometricEnabled,
  getBiometricTypeName,
  authenticateWithBiometrics,
  saveBiometricCredentials,
  clearBiometricCredentials,
} from '../services/biometric.service';
import { checkProfileCompletion, getProfileMissingFields, getLiveCompletionProgress } from '../utils/checkProfileCompletion';
import RecoveryEmailModal from '../components/RecoveryEmailModal';
// add this with your other imports
// import { Linking } from 'react-native';




const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/de2wocs21/image/upload';
// const CLOUDINARY_URL = 'cloudinary://742569622718158:5vorQLQ6D7p_HMnTyNuaqkKGpz0@de2wocs21'
const UPLOAD_PRESET = 'unsigned_upload'; // or your configured preset
const PROFILE_REQUEST_TIMEOUT_MS = 20000;


const nukeLocal = async () => {
  await AsyncStorage.clear();
  Alert.alert("Cleared", "AsyncStorage cleared. Reload the app.");
};




const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser, } = useContext(AuthContext);
  // const navigation = useNavigation();

  const isProfileForced = !checkProfileCompletion(user);
  const missingFields = isProfileForced ? getProfileMissingFields(user) : [];
  const isAlumni = (user?.type || '').toLowerCase() === 'alumni';


  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [origin, setOrigin] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [nickname, setNickname] = useState('');
  const [dob, setDob] = useState('');
  const [languages, setLanguages] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [industry, setIndustry] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [funFact, setFunFact] = useState('');
  const [rship, setRship] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // const [showGradYearPicker, setShowGradYearPicker] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [showRshipPicker, setShowRshipPicker] = useState(false);
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [industrySearch, setIndustrySearch] = useState('');

  // 📍 Location settings state
  const [locationSharingOn, setLocationSharingOn] = useState(true);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // 🔒 Biometric settings state
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricTypeName, setBiometricTypeName] = useState('Biometrics');

  // Recovery email
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Track initial values for change detection
  const initialValues = useRef(null);
  // Prevent re-initializing form fields when user context updates (e.g. from toggles)
  const hasInitialized = useRef(false);



  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [originSearch, setOriginSearch] = useState('');


  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [confirmDeleteText, setConfirmDeleteText] = useState('');
const [deleting, setDeleting] = useState(false);




useEffect(() => {
  console.log("NAV STATE", navigation.getState());
}, []);

useEffect(() => {
  console.log("PARENT STATE", navigation.getParent()?.getState());
}, []);

// Initialize biometric settings
useEffect(() => {
  (async () => {
    const { supported } = await isBiometricSupported();
    setBiometricSupported(supported);
    if (supported) {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
      const typeName = await getBiometricTypeName();
      setBiometricTypeName(typeName);
    }
  })();
}, []);

const handleBiometricToggle = async (value) => {
  if (value) {
    // Enabling — require biometric authentication first
    const authResult = await authenticateWithBiometrics(
      `Enable ${biometricTypeName} login`
    );
    if (!authResult.success) return;

    // Get current credentials from AsyncStorage
    const token = await AsyncStorage.getItem('token');
    const storedUserId = await AsyncStorage.getItem('userId');
    const storedUser = await AsyncStorage.getItem('user');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    const userEmail = parsedUser?.email || '';

    if (!token || !storedUserId || !userEmail) {
      Alert.alert('Error', 'Unable to set up biometric login. Please sign in again.');
      return;
    }

    const saved = await saveBiometricCredentials(userEmail, token, storedUserId);
    if (saved) {
      setBiometricEnabled(true);
      Toast.show({
        type: 'success',
        text1: `${biometricTypeName} Login Enabled`,
        text2: `You can now use ${biometricTypeName} to sign in`,
      });
    } else {
      Alert.alert('Error', 'Failed to enable biometric login');
    }
  } else {
    // Disabling
    await clearBiometricCredentials();
    setBiometricEnabled(false);
    Toast.show({
      type: 'info',
      text1: 'Biometric Login Disabled',
      text2: 'You will need to use your email and password to sign in',
    });
  }
};



  // Format a Date object to YYYY-MM-DD using UTC to avoid timezone drift
  const toLocalYYYYMMDD = (dateObj) => {
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate() ).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Parse incoming values safely (handles "YYYY-MM-DD", ISO strings, Date)
  // Uses UTC-only methods so the date never shifts across timezones
  const parseDobToDate = (val) => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val)) return val;
    if (typeof val === 'string') {
      const onlyDate = val.split('T')[0]; // strip time/tz from ISO strings
      const [y, m, d] = onlyDate.split('-').map(Number);
      if (!y || !m || !d) return null;
      // Create date using UTC to prevent any timezone offset
      return new Date(Date.UTC(y, m - 1, d));
    }
    const d = new Date(val);
    return isNaN(d) ? null : d;
  };

  const prettyDate = (val) => {
    const d = parseDobToDate(val);
    if (!d) return '';
    // Use UTC methods so the displayed date matches the stored YYYY-MM-DD
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  };

  // iOS DOB modal temp selection
  const [showDobModal, setShowDobModal] = useState(false);
  const [pendingDob, setPendingDob] = useState(null);





  useEffect(() => {
    // Only initialize the form once. Subsequent updates to the user context
    // (e.g. from the location-sharing or biometric toggle) must NOT reset form
    // fields — the user may have unsaved changes in progress.
    if (!user || hasInitialized.current) return;
    hasInitialized.current = true;
    {
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setOrigin(user.origin || '');
      setBio(user.bio || '');
      setNickname(user.nickname || '');
      // Accept multiple backend keys and normalize
      const rawDob = user?.DOB ?? user?.dob ?? user?.dateOfBirth ?? '';
      if (rawDob) {
        const parsed = parseDobToDate(rawDob);
        setDob(parsed ? toLocalYYYYMMDD(parsed) : '');
      } else {
        setDob('');
      }

      // setDob(user.dob || '');
      setLanguages(Array.isArray(user.languages) ? user.languages.join(', ') : user.languages || '');

      // setLanguages(user.languages || '');
      setFieldOfStudy(user.fieldOfStudy || '');
      setGraduationYear(user.graduationYear || '');
      setIndustry(user.industry || '');
      setCurrentRole(user.currentRole || '');
      setLinkedIn(user.linkedIn || '');
      setFunFact(user.funFact || '');
      setRship(user.rship || '');
      setInterests(user.interests || []);
      setPhotos(user.photos || []);
      
      // 📍 Initialize location sharing preference
      setLocationSharingOn(user.locationSharingEnabled !== false);

      // Snapshot initial values for change detection
      initialValues.current = {
        phone: user.phone || '',
        origin: user.origin || '',
        bio: user.bio || '',
        nickname: user.nickname || '',
        dob: rawDob ? (parseDobToDate(rawDob) ? toLocalYYYYMMDD(parseDobToDate(rawDob)) : '') : '',
        languages: Array.isArray(user.languages) ? user.languages.join(', ') : user.languages || '',
        fieldOfStudy: user.fieldOfStudy || '',
        graduationYear: user.graduationYear || '',
        industry: user.industry || '',
        currentRole: user.currentRole || '',
        linkedIn: user.linkedIn || '',
        funFact: user.funFact || '',
        rship: user.rship || '',
        interests: JSON.stringify((user.interests || []).slice().sort()),
        photos: JSON.stringify(user.photos || []),
      };
    }
  }, [user]);

  const hasChanges = useMemo(() => {
    if (!initialValues.current) return false;
    const iv = initialValues.current;
    return (
      phone !== iv.phone ||
      origin !== iv.origin ||
      bio !== iv.bio ||
      nickname !== iv.nickname ||
      dob !== iv.dob ||
      languages !== iv.languages ||
      fieldOfStudy !== iv.fieldOfStudy ||
      graduationYear !== iv.graduationYear ||
      industry !== iv.industry ||
      currentRole !== iv.currentRole ||
      linkedIn !== iv.linkedIn ||
      funFact !== iv.funFact ||
      rship !== iv.rship ||
      JSON.stringify(interests.slice().sort()) !== iv.interests ||
      JSON.stringify(photos) !== iv.photos
    );
  }, [phone, origin, bio, nickname, dob, languages, fieldOfStudy, graduationYear, industry, currentRole, linkedIn, funFact, rship, interests, photos]);

  // ─── Live completion progress (updates in real-time as user fills fields) ───
  const completionProgress = useMemo(() => {
    if (!isProfileForced) return 1;
    return getLiveCompletionProgress(
      { origin, fieldOfStudy, graduationYear, currentRole, industry, bio, interests, photos },
      user?.type
    );
  }, [isProfileForced, origin, fieldOfStudy, graduationYear, currentRole, industry, bio, interests, photos, user?.type]);

  const liveMissingLabels = useMemo(() => {
    if (!isProfileForced) return [];
    const hasText = (v) => typeof v === 'string' && v.trim().length > 0;
    const hasArray = (v) => Array.isArray(v) && v.length > 0;
    const missing = [];
    if (!hasText(origin)) missing.push('Country of Origin');
    if (!isAlumni && !hasText(fieldOfStudy)) missing.push('Field of Study');
    if (!isAlumni && !hasText(String(graduationYear || ''))) missing.push('Graduation Year');
    if (!hasText(currentRole)) missing.push('Current / Previous Role');
    if (!hasText(industry)) missing.push('Industry');
    if (!hasText(bio)) missing.push('Bio');
    if (!hasArray(interests)) missing.push('Interests');
    if (!hasArray(photos)) missing.push('Photos');
    return missing;
  }, [isProfileForced, isAlumni, origin, fieldOfStudy, graduationYear, currentRole, industry, bio, interests, photos]);



  // small util: full local sign-out + data wipe
const hardSignOut = async () => {
  try {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userId');
  } catch {}
  // if you store other keys, also clear them here
  if (updateUser) updateUser(null);
  navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
};


const handleDeleteAccount = async () => {
  if (confirmDeleteText.trim().toUpperCase() !== 'DELETE') return;

  try {
    setDeleting(true);
    const userId = await AsyncStorage.getItem('userId');

    await api.delete(`/accounts/${userId}`, {
      params: { hard: true }
    });

    setShowDeleteModal(false);
    Alert.alert('Account deleted', 'Your account and personal data have been removed.');
    await hardSignOut();
  } catch (err) {
    console.error('Delete account error:', err?.response || err?.message || err);
    Alert.alert('Unable to delete', 'Please check your connection and try again.');
  } finally {
    setDeleting(false);
    setConfirmDeleteText('');
  }
};



  // Upload states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const requestPhotoPermission = async () => {
    let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow photo access to upload a profile picture.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return false;
    }
    return true;
  };

  const uploadToCloudinary = async (uri) => {
    const data = new FormData();
    data.append('file', {
      uri,
      name: `profile_${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
    data.append('upload_preset', UPLOAD_PRESET);
    const uploadRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: data });
    const json = await uploadRes.json();
    if (json.secure_url) {
      return json.secure_url;
    }
    throw new Error(json?.error?.message || 'Upload failed');
  };

  const launchPickerAndUpload = async (allowsEditing) => {
    const pickerOptions = {
      allowsEditing,
      quality: 1,
      exif: false,
    };
    if (allowsEditing) {
      pickerOptions.aspect = [1, 1];
    }
    if (ImagePicker?.MediaType?.Image) {
      pickerOptions.mediaTypes = [ImagePicker.MediaType.Image];
    } else if (ImagePicker?.MediaTypeOptions?.Images) {
      pickerOptions.mediaTypes = ImagePicker.MediaTypeOptions.Images;
    }

    const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setUploadingPhoto(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      const url = await uploadToCloudinary(manipulated.uri);
      setPhotos(prev => [...prev, url]);
      Toast.show({ type: 'success', text1: 'Photo uploaded!' });
    } catch (e) {
      Alert.alert('Upload failed', String(e?.message || e));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPhotoPermission();
    if (!hasPermission) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Crop to Square', 'Upload Original'],
          cancelButtonIndex: 0,
          title: 'Choose upload style',
          message: 'Cropped photos look best as profile pictures',
        },
        (index) => {
          if (index === 1) launchPickerAndUpload(true);
          else if (index === 2) launchPickerAndUpload(false);
        }
      );
    } else {
      Alert.alert(
        'Choose upload style',
        'Cropped photos look best as profile pictures',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Crop to Square', onPress: () => launchPickerAndUpload(true) },
          { text: 'Upload Original', onPress: () => launchPickerAndUpload(false) },
        ]
      );
    }
  };

  const setAsProfilePhoto = (index) => {
    if (index === 0) return;
    const updated = [...photos];
    const [picked] = updated.splice(index, 1);
    updated.unshift(picked);
    setPhotos(updated);
  };


  const handleRemovePhoto = (index) => {
    Alert.alert('Delete Photo', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        onPress: () => {
          const updated = [...photos];
          updated.splice(index, 1);
          setPhotos(updated);
        },
      },
    ]);
  };


  useEffect(() => {
    const startYear = 1980;
    const endYear = 2035;
    const years = [];

    for (let year = endYear; year >= startYear; year--) {
      years.push(year.toString());
    }

    setAvailableYears(years);
  }, []);



  const tags = [
    'Afrobeats', 'Fashion', 'Sports', 'Media', 'Dance', 'Photography', 'Beauty', 'Art', 'Storytelling', 'Spoken Word', 'Movies', 'Cooking', 'DIY', 'Podcasting', 'Mental Health', 'Faith', 'Fitness', 'Plant Parent Life', 'Romanticizing Life', 'Country/City-Hopping', 'Gaming', 'Reading', 'Impact Work'
  ];

  const relationshipOptions = [
    'Single',
    'Married',
    'Engaged',
    'Ready to Mingle',
    'Eyes Rolling'
  ];

  const africanCountries = [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros', 'Rep. of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
  ];





  const industryOptions = [
    { icon: '💻', label: 'Tech' },
    { icon: '💼', label: 'Business / Consulting' },
    { icon: '🏦', label: 'Finance' },
    { icon: '🏥', label: 'Healthcare' },
    { icon: '🎓', label: 'Education' },
    { icon: '🎬', label: 'Media & Entertainment' },
    { icon: '⚖️', label: 'Law' },
    { icon: '📊', label: 'Venture Capital / Private Equity' },
    { icon: '🏛', label: 'Government & Public Sector' },
    { icon: '🚀', label: 'Entrepreneurship / Startups' },
    { icon: '🏠', label: 'Real Estate' },
    { icon: '📣', label: 'Marketing & Advertising' },
    { icon: '🛠', label: 'Engineering' },
    { icon: '🛍', label: 'Retail & E-Commerce' },
    { icon: '⛽️', label: 'Energy / Oil & Gas' },
    { icon: '🌾', label: 'Agriculture' },
    { icon: '👗', label: 'Fashion & Beauty' },
    { icon: '✈️', label: 'Travel & Tourism' },
    { icon: '🏋️', label: 'Sports & Wellness' },
    { icon: '🔧', label: 'Other' },
  ];

  const selectedIndustryOption = industryOptions.find(
    (option) => option.label === industry || `${option.icon} ${option.label}` === industry
  );

  const filteredIndustries = industryOptions.filter((option) => {
    const query = industrySearch.trim().toLowerCase();
    if (!query) return true;

    return `${option.icon} ${option.label}`.toLowerCase().includes(query);
  }).sort((left, right) => {
    const leftSelected = left.label === industry;
    const rightSelected = right.label === industry;

    if (leftSelected && !rightSelected) return -1;
    if (!leftSelected && rightSelected) return 1;

    return left.label.localeCompare(right.label);
  });



  const toggleInterest = (tag) => {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]
    );
  };



  const handleGraduationYearChange = (event, selectedDate) => {
    setShowGradYearPicker(false);

    if (event.type === 'set' && selectedDate) {
      const selectedYear = selectedDate.getFullYear();
      setGraduationYear(selectedYear.toString());
    }
  };


  // helpers (accent/diacritics-insensitive search)
  const strip = (s = '') =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredCountries = africanCountries.filter(c =>
    strip(c).includes(strip(originSearch))
  );




  const handleSave = async () => {

    let missingFields = [];
    // if (!nickname) missingFields.push('Nickname');
    if (!email) missingFields.push('Email');
    if (!origin) missingFields.push('Country of Origin');
    // if (!dob) missingFields.push('Date of Birth');
    if (!fieldOfStudy) missingFields.push('Field of Study');
    if (!graduationYear) missingFields.push('Graduation Year');
    if (!currentRole) missingFields.push('Previous / Current Role');
    // if (!linkedIn) missingFields.push('LinkedIn');
    if (!industry) missingFields.push('industry');
    if (!bio) missingFields.push('Bio');
    if (interests.length === 0) missingFields.push('At least one Interest');
    if (photos.length === 0) missingFields.push('At least one Photo');

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Required Fields',
        `Please complete: ${missingFields.join(', ')}`
      );
      return;
    }



    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('userId');

      const payload = {
        email,
        phone,
        origin,
        bio,
         nickname,
        // Only include DOB if the user has one selected; omitting it preserves
        // any existing DB value rather than overwriting it with null.
        ...(dob ? { DOB: dob } : {}),
        languages: languages.split(',').map(lang => lang.trim()),
        graduationYear,
        industry: industry.replace(/^[^\w]+ /, ''),
        currentRole,
         linkedIn,
        funFact,
        rship,
        fieldOfStudy,
        interests,
        photos,
      };

      const res = await api.put(
        `/accounts/${userId}`,
        payload,
        {
          timeout: PROFILE_REQUEST_TIMEOUT_MS,
        }
      );

      if (!res.data?.user) {
        throw new Error('Profile update did not return a user object');
      }

      await updateUser(res.data.user);
      Toast.show({
        type: 'success',
        text1: 'Profile updated!',
        text2: 'Your changes were saved.',
      });

      initialValues.current = {
        phone,
        origin,
        bio,
        nickname,
        dob,
        languages,
        fieldOfStudy,
        graduationYear,
        industry,
        currentRole,
        linkedIn,
        funFact,
        rship,
        interests: JSON.stringify(interests.slice().sort()),
        photos: JSON.stringify(photos),
      };

      // If profile was forced (incomplete), the navigator auto-switches
      // to the full app stack once updateUser triggers re-render
      if (!isProfileForced) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }


//         navigation.getParent()?.reset({
//   index: 0,
//   routes: [{ name: 'MainTabs' }], // whatever your parent route is called
// });


//         navigation.reset({
//   index: 0,
//   routes: [{ name: 'Home' }], // adjust to your actual main route
// });

    }  catch (error) {
  const status = error?.response?.status;
  const msg = error?.response?.data?.message || error?.message;

  console.error('❌ Profile update failed:', error?.response || error);

  if (status === 401) {
    Alert.alert(
      'Session expired',
      'Please log in again to continue.',
      [
        {
          text: 'OK',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userId');
            if (updateUser) updateUser(null);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
    return;
  }

  Alert.alert('Error', msg || 'Failed to update profile. Try again.');
} finally {
  setLoading(false);
}}

    
    
  //   catch (error) {
  //     console.error('❌ Profile update failed:', error.response || error.message);
  //     Alert.alert('Error', 'Failed to update profile. Try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };


  return (
<OnboardingOverlay screenName="EditProfile">
<SafeAreaView style={styles.container}>
     
    <View style={styles.headerRow}>
  {!isProfileForced && (
    <TouchableOpacity
      onPress={() => {
        if (navigation.canGoBack()) navigation.goBack();
        else navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }}
      style={styles.backButton}
    >
      <Ionicons name="chevron-back-outline" size={22} color="#581845" />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>
  )}
  {isProfileForced && <View style={{ width: 60 }} />}
  <Text numberOfLines={1} style={styles.headerTitle}>
    {isProfileForced ? 'Complete Your Profile' : 'Edit Your Profile'}
  </Text>
  <TouchableOpacity
    style={[styles.headerSaveBtn, !hasChanges && !loading && styles.headerSaveBtnDisabled]}
    onPress={handleSave}
    disabled={loading || !hasChanges}
    activeOpacity={0.7}
  >
    {loading ? (
      <ActivityIndicator size={16} color="#fff" />
    ) : (
      <Ionicons name="checkmark" size={20} color={hasChanges ? '#fff' : 'rgba(255,255,255,0.5)'} />
    )}
  </TouchableOpacity>
</View>

    {isProfileForced && (
      <View style={styles.progressCard}>
        <View style={styles.progressCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.progressCardTitle}>
              {completionProgress >= 1 ? 'Ready to save!' : 'Complete your profile'}
            </Text>
            <Text style={styles.progressCardSubtitle}>
              {Math.round(completionProgress * 100)}% complete
              {liveMissingLabels.length > 0 ? ` · ${liveMissingLabels.length} step${liveMissingLabels.length !== 1 ? 's' : ''} left` : ''}
            </Text>
          </View>
          {completionProgress >= 1 ? (
            <View style={styles.progressDoneCircle}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </View>
          ) : (
            <Text style={styles.progressPercent}>{Math.round(completionProgress * 100)}%</Text>
          )}
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${Math.min(Math.round(completionProgress * 100), 100)}%` },
            ]}
          />
        </View>
        {liveMissingLabels.length > 0 && (
          <Text style={styles.progressMissing} numberOfLines={2}>
            Still needed: {liveMissingLabels.join(' · ')}
          </Text>
        )}
      </View>
    )}
    
    <ScrollView showsVerticalScrollIndicator={false}>

      {/* ═══════ PHOTOS SECTION (TOP) ═══════ */}
      <Text style={styles.sectionLabel}>Your Photos <Text style={styles.required}>*</Text></Text>
      <Text style={styles.sectionHint}>First photo is your profile picture. Tap another to set it as profile.</Text>
      <View style={styles.photoGrid}>
        {photos.map((uri, idx) => (
          <View key={idx} style={styles.photoWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (idx !== 0) {
                  setSelectedPhotoIndex(idx);
                  setShowConfirmModal(true);
                }
              }}
            >
              <Image source={{ uri }} style={[styles.photo, idx === 0 && styles.firstPhotoBorder]} />
              {idx === 0 && (
                <View style={styles.profileBadge}>
                  <Ionicons name="star" size={10} color="#fff" />
                  <Text style={styles.profileBadgeText}>Profile</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemovePhoto(idx)}>
              <Ionicons name="close-circle" size={22} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 6 && (
          <TouchableOpacity onPress={pickImage} style={styles.addPhotoBtn} disabled={uploadingPhoto}>
            {uploadingPhoto ? (
              <ActivityIndicator color="#581845" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={28} color="#581845" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {showConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>Set this as your profile photo?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => {
                  setShowConfirmModal(false);
                  setAsProfilePhoto(selectedPhotoIndex);
                }}
              >
                <Text style={styles.modalBtnText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ccc' }]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ═══════ PERSONAL INFO ═══════ */}
      <Text style={styles.sectionLabel}>Personal Info</Text>

      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="Nickname"
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+1234567890"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Country of Origin <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={[styles.input, !origin && styles.invalidInput]}
        onPress={() => setShowOriginPicker(true)}
      >
        <Text style={{ color: origin ? '#000' : '#999' }}>
          {origin || 'Select your country of origin'}
        </Text>
      </TouchableOpacity>

      <Modal
        isVisible={showOriginPicker}
        onBackdropPress={() => { setShowOriginPicker(false); setOriginSearch(''); }}
        onBackButtonPress={() => { setShowOriginPicker(false); setOriginSearch(''); }}
        style={styles.originModal}
        backdropOpacity={0.35}
        useNativeDriver
        useNativeDriverForBackdrop
        statusBarTranslucent
        avoidKeyboard
      >
        <View style={styles.originCard}>
          {/* Header */}
          <View style={styles.originHeader}>
            <Text style={styles.originTitle}>Select Country</Text>
            <TouchableOpacity
              onPress={() => { setShowOriginPicker(false); setOriginSearch(''); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.originSearchRow}>
            <Ionicons name="search" size={18} color="#888" style={{ marginHorizontal: 8 }} />
            <TextInput
              style={styles.originSearchInput}
              placeholder="Search country..."
              value={originSearch}
              onChangeText={setOriginSearch}
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
            />
          </View>

          {/* List */}
          <ScrollView
            style={styles.originList}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {(filteredCountries.length ? filteredCountries : africanCountries).map((country, i) => {
              const selected = country === origin;
              return (
                <TouchableOpacity
                  key={`${country}-${i}`}
                  style={[styles.originItem, selected && styles.originItemSelected]}
                  onPress={() => {
                    setOrigin(country);
                    setShowOriginPicker(false);
                    setOriginSearch('');
                  }}
                >
                  <Text style={[styles.originItemText, selected && styles.originItemTextSelected]}>
                    {country}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color="#581845" />}
                </TouchableOpacity>
              );
            })}

            {filteredCountries.length === 0 && (
              <Text style={styles.originEmpty}>No matches</Text>
            )}
          </ScrollView>
        </View>
      </Modal>


      <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => {
          const base = dob ? parseDobToDate(dob) : new Date(2000, 0, 1);

          // const base = dob ? new Date(dob) : new Date(2000, 0, 1); // default to Jan 1, 2000
          if (Platform.OS === 'ios') {
            setPendingDob(base);
            setShowDobModal(true);
          } else {
            setPendingDob(base);
            setShowDatePicker(true); // Android native dialog has OK/Cancel already
          }
        }}
      >
        <Text style={{ color: dob ? '#000' : '#999' }}>
          {dob ? prettyDate(dob) : 'Select your birth date'}
        </Text>
      </TouchableOpacity>

      {/* ANDROID: system date dialog with OK/Cancel */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDob || (dob ? parseDobToDate(dob) : new Date(2000, 0, 1))}

          // value={pendingDob || (dob ? new Date(dob) : new Date(2000, 0, 1))}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={(event, selected) => {
            // Android emits 'set' on confirm and 'dismissed' on cancel
            setShowDatePicker(false);
            if (event.type === 'set' && selected) {
              setDob(toLocalYYYYMMDD(selected)); // save in local time -> fixes "day after"
            }
          }}
        />
      )}

      {/* iOS: elegant modal with Cancel / Done */}
      <Modal
        isVisible={showDobModal}
        onBackdropPress={() => setShowDobModal(false)}
        onBackButtonPress={() => setShowDobModal(false)}
        style={styles.dobModal}
        backdropOpacity={0.35}
        useNativeDriver
        useNativeDriverForBackdrop
        statusBarTranslucent
        avoidKeyboard
      >
        <View style={styles.dobCard}>
          <View style={styles.dobHeader}>
            <TouchableOpacity onPress={() => setShowDobModal(false)} style={styles.dobBtn}>
              <Text style={[styles.dobBtnText, { color: '#666' }]}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.dobTitle}>Select Date of Birth</Text>

            <TouchableOpacity
              onPress={() => {
                if (pendingDob) setDob(toLocalYYYYMMDD(pendingDob)); // save in local time
                setShowDobModal(false);
              }}
              style={styles.dobBtn}
            >
              <Text style={[styles.dobBtnText, { color: '#581845', fontWeight: '700' }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dobPickerWrap}>
            <DateTimePicker
              value={pendingDob || (dob ? parseDobToDate(dob) : new Date(2000, 0, 1))}

              // value={pendingDob || (dob ? new Date(dob) : new Date(2000, 0, 1))}
              mode="date"
              display="spinner"               // iOS inline wheel
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              onChange={(_, selected) => {
                // iOS emits continuously while scrolling—just cache, don’t save
                if (selected) setPendingDob(selected);
              }}
              themeVariant="light"
              textColor="#000"
              style={{ alignSelf: 'center' }}
            />
          </View>

          {/* Live preview under the wheel */}
          <Text style={styles.dobPreview}>
            {pendingDob ? prettyDate(pendingDob) : prettyDate(dob || new Date(2000, 0, 1))}
          </Text>
        </View>
      </Modal>


      <Text style={styles.label}>Languages Spoken</Text>
      <TextInput
        style={styles.input}
        value={languages}
        onChangeText={setLanguages}
        placeholder="e.g. English, Spanish, French"
      />

      {/* Alumni school — read-only banner for alumni users */}
      {(user?.type || '').toLowerCase() === 'alumni' && user?.schoolGraduatedFrom && (
        <View style={{ marginBottom: 4 }}>
          <Text style={styles.label}>Alumni School</Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#f5edf8',
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: '#e5d5ec',
            marginBottom: 8,
          }}>
            <Ionicons name="school-outline" size={18} color="#581845" />
            <Text style={{ flex: 1, fontSize: 15, color: '#581845', fontWeight: '600' }}>
              {user.schoolGraduatedFrom}
            </Text>
            <View style={{ backgroundColor: '#581845', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>ALUMNI</Text>
            </View>
          </View>
        </View>
      )}

      <Text style={styles.label}>
        {(user?.type || '').toLowerCase() === 'alumni' ? 'Degree Held' : 'Field of Study'}
        {' '}<Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        style={styles.input}
        value={fieldOfStudy}
        onChangeText={setFieldOfStudy}
        placeholder={(user?.type || '').toLowerCase() === 'alumni' ? 'e.g. MBA, MSc Finance, PhD' : "What's your area of concentration?"}
      />


      <Text style={styles.label}>Graduation Year <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        onPress={() => setShowYearModal(true)}
        style={styles.dropdownField}
        activeOpacity={0.85}
      >
        <View style={styles.dropdownFieldContent}>
          <View style={styles.dropdownFieldIcon}>
            <Ionicons name="school-outline" size={18} color="#581845" />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.dropdownValueText, !graduationYear && styles.dropdownPlaceholderText]}
          >
            {graduationYear || 'Select your graduation year'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#7b5873" />
      </TouchableOpacity>

      <Modal
        isVisible={showYearModal}
        onBackdropPress={() => setShowYearModal(false)}
        onBackButtonPress={() => setShowYearModal(false)}
        style={styles.dropdownModal}
        backdropOpacity={0.35}
        useNativeDriver
        useNativeDriverForBackdrop
        statusBarTranslucent
      >
        <View style={styles.dropdownCard}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Graduation Year</Text>
            <TouchableOpacity
              onPress={() => setShowYearModal(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.dropdownList}
            contentContainerStyle={styles.yearGrid}
            showsVerticalScrollIndicator={false}
          >
            {availableYears.map((year) => {
              const selected = year === graduationYear;

              return (
                <TouchableOpacity
                  key={year}
                  onPress={() => {
                    setGraduationYear(year);
                    setShowYearModal(false);
                  }}
                  style={[styles.yearChip, selected && styles.yearChipSelected]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.yearChipText, selected && styles.yearChipTextSelected]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>





      <Text style={styles.label}>Industry <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity
        style={styles.industryTrigger}
        onPress={() => setShowIndustryPicker(true)}
        activeOpacity={0.85}
      >
        <View style={styles.industryTriggerContent}>
          <View style={styles.industryTriggerIcon}>
            {selectedIndustryOption ? (
              <Text style={styles.dropdownEmoji}>{selectedIndustryOption.icon}</Text>
            ) : (
              <Ionicons name="briefcase-outline" size={18} color="#581845" />
            )}
          </View>
          <View style={styles.industryTriggerTextWrap}>
            <Text style={styles.industryTriggerEyebrow}>Professional focus</Text>
            <Text
              numberOfLines={1}
              style={[styles.industryTriggerValue, !industry && styles.industryTriggerPlaceholder]}
            >
              {selectedIndustryOption?.label || industry || 'Select your industry'}
            </Text>
          </View>
        </View>
        <View style={styles.industryTriggerChevron}>
          <Ionicons name="chevron-down" size={18} color="#7b5873" />
        </View>
      </TouchableOpacity>


      <Modal
        isVisible={showIndustryPicker}
        onBackdropPress={() => {
          setShowIndustryPicker(false);
          setIndustrySearch('');
        }}
        onBackButtonPress={() => {
          setShowIndustryPicker(false);
          setIndustrySearch('');
        }}
        style={styles.industryModal}
        backdropOpacity={0.35}
        useNativeDriver
        useNativeDriverForBackdrop
        statusBarTranslucent
        avoidKeyboard
      >
        <View style={styles.industrySheet}>
          <View style={styles.industryHandle} />

          <View style={styles.industrySheetHeader}>
            <View style={styles.industrySheetHeaderTextWrap}>
              <Text style={styles.industrySheetTitle}>Choose your industry</Text>
              <Text style={styles.industrySheetSubtitle}>
                This helps shape how your profile is presented.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowIndustryPicker(false);
                setIndustrySearch('');
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.industrySearchRow}>
            <Ionicons name="search" size={18} color="#888" style={{ marginHorizontal: 8 }} />
            <TextInput
              style={styles.industrySearchInput}
              placeholder="Search industry..."
              value={industrySearch}
              onChangeText={setIndustrySearch}
              autoCorrect={false}
              autoCapitalize="words"
              keyboardAppearance="light"
              returnKeyType="search"
              autoFocus
            />
          </View>

          <ScrollView
            style={styles.industryList}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.industryListContent}
          >
            {filteredIndustries.map((option) => {
              const selected = option.label === industry || `${option.icon} ${option.label}` === industry;

              return (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.industryOption, selected && styles.industryOptionSelected]}
                  onPress={() => {
                    setIndustry(option.label);
                    setShowIndustryPicker(false);
                    setIndustrySearch('');
                  }}
                >
                  <View style={styles.industryOptionContent}>
                    <View style={[styles.industryOptionIcon, selected && styles.industryOptionIconSelected]}>
                      <Text style={styles.dropdownEmoji}>{option.icon}</Text>
                    </View>
                    <View style={styles.industryOptionTextWrap}>
                      <Text style={[styles.industryOptionTitle, selected && styles.industryOptionTitleSelected]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.industryOptionMeta, selected && styles.industryOptionMetaSelected]}>
                        {selected ? 'Selected industry' : 'Tap to choose'}
                      </Text>
                    </View>
                  </View>
                  {selected ? (
                    <View style={styles.industryOptionCheck}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color="#b0a1ab" />
                  )}
                </TouchableOpacity>
              );
            })}

            {filteredIndustries.length === 0 && (
              <Text style={styles.industryEmpty}>No industry matches your search.</Text>
            )}
          </ScrollView>
        </View>
      </Modal>



      <Text style={styles.label}>Previous / Current Role <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={currentRole}
        onChangeText={setCurrentRole}
        placeholder="Job title@ company name"
      />
      <Text style={styles.label}>LinkedIn Profile</Text>
      <TextInput
        style={styles.input}
        value={linkedIn}
        onChangeText={setLinkedIn}
        placeholder="https://www.linkedin.com/in/"
      />
      <Text style={styles.label}>Fun Fact</Text>
      <TextInput
        style={styles.input}
        value={funFact}
        onChangeText={setFunFact}
        placeholder="Tell us something interesting about you !"
      />
      <Text style={styles.label}>Relationship Status</Text>
      <TouchableOpacity onPress={() => setShowRshipPicker(true)} style={styles.input}>
        <Text style={{ color: rship ? '#000' : '#999' }}>
          {rship || 'Select your relationship status'}
        </Text>
      </TouchableOpacity>

      <Modal
        isVisible={showRshipPicker}
        onBackdropPress={() => setShowRshipPicker(false)}
        onBackButtonPress={() => setShowRshipPicker(false)}
        style={styles.bottomModal}
      >
        <View style={styles.modalContent}>
          {relationshipOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.modalOption}
              onPress={() => {
                setRship(option);
                setShowRshipPicker(false);
              }}
            >
              <Text style={styles.modalOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setShowRshipPicker(false)} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ═══════ ABOUT YOU ═══════ */}
      <Text style={styles.sectionLabel}>About You</Text>

      <Text style={styles.label}>Bio / About Me <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell us about yourself..."
        multiline
        numberOfLines={5}
        maxLength={700}
      />

      <Text style={styles.label}>Interests <Text style={styles.required}>*</Text></Text>
      <View style={styles.tagsWrapper}>
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.tag, interests.includes(tag) && styles.tagSelected]}
            onPress={() => toggleInterest(tag)}>
            <Text style={[styles.tagText, interests.includes(tag) && styles.tagTextSelected]}>{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══════ SETTINGS CARDS — only shown after profile is complete ═══════ */}
      {!isProfileForced && (
      <>
      <Text style={styles.sectionLabel}>Settings</Text>

      {/* Recovery Email Section */}
      <View style={styles.settingsCard}>
        <View style={styles.settingsCardHeader}>
          <Ionicons name="shield-checkmark" size={20} color="#581845" />
          <Text style={styles.settingsCardTitle}>Recovery Email</Text>
        </View>
        <Text style={styles.recoveryDesc}>
          Add a personal email so you can log in after graduation when your school email expires.
        </Text>
        {user?.recoveryEmailVerified && user?.recoveryEmail ? (
          <View style={styles.recoveryVerified}>
            <Ionicons name="checkmark-circle" size={18} color="#27ae60" />
            <Text style={styles.recoveryVerifiedText}>{user.recoveryEmail}</Text>
            <TouchableOpacity onPress={() => setShowRecoveryModal(true)}>
              <Text style={styles.recoveryChangeLink}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.recoveryAddBtn}
            onPress={() => setShowRecoveryModal(true)}
          >
            <Ionicons name="add-circle-outline" size={18} color="#581845" />
            <Text style={styles.recoveryAddText}>Set up recovery email</Text>
          </TouchableOpacity>
        )}
      </View>

      <RecoveryEmailModal
        visible={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
      />

      {/* 📍 Location Settings */}
      <View style={styles.settingsCard}>
        <View style={styles.settingsCardHeader}>
          <Ionicons name="location" size={20} color="#581845" />
          <Text style={styles.settingsCardTitle}>Location Settings</Text>
        </View>
        
        <View style={styles.locationPreviewRow}>
          <View style={styles.locationIconCircle}>
            <Ionicons name="navigate" size={18} color="#581845" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationCityLabel}>
              {user?.currentCity || 'Location not set'}
            </Text>
            {user?.locationUpdatedAt && (
              <Text style={styles.locationTimeLabel}>
                Last updated: {new Date(user.locationUpdatedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.refreshLocationBtn}
            onPress={async () => {
              try {
                setUpdatingLocation(true);
                const hasPermission = await hasLocationPermission();
                if (!hasPermission) {
                  const granted = await requestLocationPermission();
                  if (!granted) {
                    Alert.alert(
                      'Permission Required',
                      'Location permission is needed to update your location.'
                    );
                    return;
                  }
                }
                const result = await refreshAndUpdateLocation();
                if (result) {
                  updateUser(result);
                  Toast.show({
                    type: 'success',
                    text1: 'Location Updated',
                    text2: result.currentCity || 'Your location has been refreshed',
                  });
                }
              } catch (err) {
                Alert.alert('Error', 'Failed to update location');
              } finally {
                setUpdatingLocation(false);
              }
            }}
            disabled={updatingLocation}
          >
            {updatingLocation ? (
              <ActivityIndicator size={16} color="#581845" />
            ) : (
              <Ionicons name="refresh" size={18} color="#581845" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleLabel}>Show My City to Others</Text>
            <Text style={styles.toggleDescription}>
              When enabled, other members can see your current city and approximate distance
            </Text>
          </View>
          <Switch
            value={locationSharingOn}
            onValueChange={async (value) => {
              setLocationSharingOn(value);
              try {
                const result = await setLocationSharingEnabled(value);
                if (result?.user) {
                  updateUser(result.user);
                }
              } catch (err) {
                setLocationSharingOn(!value);
                Alert.alert('Error', 'Failed to update setting');
              }
            }}
            trackColor={{ false: '#ddd', true: '#f0e7ef' }}
            thumbColor={locationSharingOn ? '#581845' : '#999'}
          />
        </View>
      </View>

      {/* 🔒 Security Settings */}
      {biometricSupported && (
      <View style={styles.settingsCard}>
        <View style={styles.settingsCardHeader}>
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#581845" />
          <Text style={styles.settingsCardTitle}>Security</Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
            <View style={styles.biometricIconCircle}>
              <MaterialCommunityIcons
                name={biometricTypeName === 'Face ID' ? 'face-recognition' : 'fingerprint'}
                size={22}
                color="#581845"
              />
            </View>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleLabel}>Biometric Login</Text>
              <Text style={styles.toggleDescription}>
                Use {biometricTypeName} to sign in quickly and securely
              </Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            trackColor={{ false: '#ddd', true: '#f0e7ef' }}
            thumbColor={biometricEnabled ? '#581845' : '#999'}
          />
        </View>
      </View>
      )}
      </>
      )}{/* end !isProfileForced settings gate */}

      <TouchableOpacity
        style={[styles.saveButton, !hasChanges && !loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading || !hasChanges}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </TouchableOpacity>

{/* <TouchableOpacity onPress={nukeLocal} style={{ padding: 12, backgroundColor: "#eee", borderRadius: 8, marginBottom: 10 }}>
  <Text>RESET APP (Dev)</Text>
</TouchableOpacity> */}


      {/* ===== Danger Zone ===== */}
<View style={dangerStyles.section}>
  <View style={dangerStyles.sectionHeader}>
    <MaterialCommunityIcons name="shield-alert-outline" size={18} color="#b00020" />
    <Text style={dangerStyles.sectionTitle}>Danger Zone</Text>
  </View>
  <Text style={dangerStyles.sectionSubtitle}>
    Permanently delete your account and all associated data. This cannot be undone.
  </Text>
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={() => setShowDeleteModal(true)}
    style={dangerStyles.deleteButton}
  >
    <MaterialCommunityIcons name="delete-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
    <Text style={dangerStyles.deleteButtonText}>Delete My Account</Text>
  </TouchableOpacity>
</View>

{/* Delete confirmation bottom sheet */}
<Modal
  isVisible={showDeleteModal}
  onBackdropPress={() => !deleting && setShowDeleteModal(false)}
  onBackButtonPress={() => !deleting && setShowDeleteModal(false)}
  style={{ justifyContent: 'flex-end', margin: 0 }}
  useNativeDriver
  useNativeDriverForBackdrop
  backdropOpacity={0.5}
  backdropColor="#000"
  swipeDirection={deleting ? undefined : 'down'}
  onSwipeComplete={() => !deleting && setShowDeleteModal(false)}
  propagateSwipe
>
  <View style={dangerStyles.sheet}>
    {/* drag handle */}
    <View style={dangerStyles.dragHandle} />

    {/* icon + heading */}
    <View style={dangerStyles.sheetIconWrap}>
      <LinearGradient
        colors={['#ff4040', '#b00020']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={dangerStyles.sheetIconCircle}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={28} color="#fff" />
      </LinearGradient>
    </View>
    <Text style={dangerStyles.sheetTitle}>Delete Account?</Text>
    <Text style={dangerStyles.sheetBody}>
      This will permanently erase your profile, posts, and all data.{`\n`}There is <Text style={{ fontWeight: '800', color: '#b00020' }}>no recovery</Text> after this.
    </Text>

    {/* confirmation input */}
    <View style={dangerStyles.inputWrapper}>
      <TextInput
        style={dangerStyles.confirmInput}
        value={confirmDeleteText}
        onChangeText={setConfirmDeleteText}
        placeholder="Type DELETE to confirm"
        placeholderTextColor="#aaa"
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!deleting}
      />
    </View>

    {/* actions */}
    <View style={dangerStyles.sheetActions}>
      <TouchableOpacity
        disabled={deleting}
        onPress={() => { setShowDeleteModal(false); setConfirmDeleteText(''); }}
        style={dangerStyles.cancelBtn}
        activeOpacity={0.8}
      >
        <Text style={dangerStyles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={confirmDeleteText.trim().toUpperCase() !== 'DELETE' || deleting}
        onPress={handleDeleteAccount}
        activeOpacity={0.85}
        style={{ flex: 1 }}
      >
        <LinearGradient
          colors={
            confirmDeleteText.trim().toUpperCase() === 'DELETE'
              ? ['#ff4040', '#b00020']
              : ['#f0a0a0', '#e0c0c0']
          }
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={dangerStyles.confirmBtn}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="trash-can" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={dangerStyles.confirmBtnText}>Delete Forever</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>

    <Text style={dangerStyles.warningFooter}>
      You will be signed out immediately after deletion.
    </Text>
  </View>
</Modal>

    </ScrollView>
    </SafeAreaView>
</OnboardingOverlay>
  );
};

export default EditProfileScreen;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const dangerStyles = StyleSheet.create({
  section: {
    marginTop: 10,
    marginBottom: 30,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fce4e4',
    backgroundColor: '#fff9f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b00020',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b00020',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#b00020',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  // Bottom sheet
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    marginBottom: 20,
  },
  sheetIconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  sheetBody: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    marginBottom: 20,
    overflow: 'hidden',
  },
  confirmInput: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1a1a1a',
    letterSpacing: 1,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
    color: '#444',
    fontSize: 15,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 15,
  },
  warningFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#aaa',
    letterSpacing: 0.1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', marginTop: 20, },
  headerRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  // paddingHorizontal: 3,
  height: 30,
},

backButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: 4,
  paddingVertical: 4,
  minWidth: 60,
},

backText: {
  fontSize: 18,
  color: '#581845',
},

headerSaveBtn: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#581845',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 4,
},
headerSaveBtnDisabled: {
  backgroundColor: '#c4a8bc',
},
saveButtonDisabled: {
  backgroundColor: '#c4a8bc',
},

headerTitle: {
  flex: 1,
  textAlign: 'center',
  fontSize: 20,
  fontWeight: '700',
  color: '#581845',
  paddingHorizontal: 8,
},

completionBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#581845',
  borderRadius: 12,
  padding: 14,
  marginTop: 12,
  marginBottom: 4,
},
bannerTitle: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '700',
  marginBottom: 2,
},
bannerText: {
  color: 'rgba(255,255,255,0.9)',
  fontSize: 13,
  lineHeight: 18,
},

// ─── Modern completion progress card ───
progressCard: {
  backgroundColor: '#581845',
  borderRadius: 16,
  padding: 16,
  marginTop: 12,
  marginBottom: 8,
},
progressCardTop: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},
progressCardTitle: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
  marginBottom: 1,
},
progressCardSubtitle: {
  color: 'rgba(255,255,255,0.75)',
  fontSize: 12,
},
progressPercent: {
  color: '#fff',
  fontSize: 20,
  fontWeight: '800',
  marginLeft: 8,
},
progressDoneCircle: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#27ae60',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
},
progressTrack: {
  height: 6,
  backgroundColor: 'rgba(255,255,255,0.25)',
  borderRadius: 3,
  overflow: 'hidden',
  marginBottom: 10,
},
progressFill: {
  height: 6,
  backgroundColor: '#fff',
  borderRadius: 3,
},
progressMissing: {
  color: 'rgba(255,255,255,0.8)',
  fontSize: 12,
  lineHeight: 17,
},


  label: {
    marginTop: 15,
    marginBottom: 5,
    fontWeight: '600'
  },

  // Recovery email section
  recoverySection: {
    marginTop: 20,
    backgroundColor: '#faf5f8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0e0eb',
  },
  recoverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  recoverySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#581845',
  },
  recoveryDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  recoveryVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0faf0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recoveryVerifiedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recoveryChangeLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#581845',
  },
  recoveryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#581845',
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  recoveryAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#581845',
  },

  input: {


    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    justifyContent: 'center'
  },
  dropdownField: {
    borderWidth: 1,
    borderColor: '#d9c5d4',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fcf9fb',
    shadowColor: '#581845',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  dropdownFieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownFieldIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3e7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dropdownEmoji: {
    fontSize: 14,
  },
  dropdownValueText: {
    flex: 1,
    fontSize: 16,
    color: '#1f1f1f',
    fontWeight: '500',
  },
  dropdownPlaceholderText: {
    color: '#8d8692',
    fontWeight: '400',
  },
  industryTrigger: {
    borderWidth: 1,
    borderColor: '#d9c5d4',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fcf9fb',
    shadowColor: '#581845',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  industryTriggerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  industryTriggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3e7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  industryTriggerTextWrap: {
    flex: 1,
  },
  industryTriggerEyebrow: {
    fontSize: 12,
    color: '#7d6578',
    marginBottom: 3,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  industryTriggerValue: {
    fontSize: 16,
    color: '#1f1f1f',
    fontWeight: '600',
  },
  industryTriggerPlaceholder: {
    color: '#8d8692',
    fontWeight: '400',
  },
  industryTriggerChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f7f1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top'
  },
  profileLabel: { fontSize: 12, color: '#581845', textAlign: 'center', marginTop: 4 },

  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 20,
    margin: 5
  },
  deleteIcon: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    zIndex: 10,
  },

  tagSelected: {
    backgroundColor: '#581845'
  },
  tagText: {
    fontSize: 14,
    color: '#555'
  },
  tagTextSelected: {
    color: '#fff'
  },
  photoContainer: {
    position: 'relative',
    margin: 5,
  },

  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  photoWrapper: {
    position: 'relative',
    margin: 10,
  },

  firstPhotoBorder: {
    borderColor: '#581845',
    borderWidth: 2,
  },

  addPhotoBtn: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center'
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#581845', borderRadius: 8 },
  modalBtnText: { color: '#fff', fontWeight: '600' },

  saveButton: {
    backgroundColor: '#581845',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    // marginBottom:80,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999
  },
  modalBox: {
    backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%', alignItems: 'center',
  },
  yearItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  modalText: { fontSize: 16, marginBottom: 20, textAlign: 'center' },

  yearText: {
    fontSize: 18,
    textAlign: 'center'
  },


  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    elevation: 10,
  },
  invalidInput: {
    borderColor: 'red',
    borderWidth: 1,
  },

  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  modalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },

  modalCancel: {
    marginTop: 10,
    paddingVertical: 12,
    backgroundColor: '#ddd',
    borderRadius: 8,
  },

  modalCancelText: {
    textAlign: 'center',
    color: '#555',
    fontWeight: '600',
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },

  modalContent: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
  },

  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  modalOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },



  modalCancel: {
    marginTop: 15,
    backgroundColor: '#eee',
    paddingVertical: 14,
    borderRadius: 10,
  },

  modalCancelText: {
    textAlign: 'center',
    color: '#555',
    fontWeight: '600',
  },


  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    maxHeight: '60%',
  },

  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },

  modalCancel: {
    marginTop: 10,
    backgroundColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 8,
  },

  modalCancelText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#333',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  removeText: { color: 'red', fontSize: 14, fontWeight: 'bold' },

  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },



  removeText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
  },
  required: {
    color: 'red',
  },

  originModal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  originCard: {
    width: '88%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  originHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  originTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  originSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f7',
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 44,
  },
  originSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  originList: {
    paddingHorizontal: 6,
  },
  originItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  originItemSelected: {
    backgroundColor: '#f7eef5', // subtle accent
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
  },
  originItemText: {
    fontSize: 16,
    color: '#222',
  },
  originItemTextSelected: {
    color: '#581845',
    fontWeight: '600',
  },
  originEmpty: {
    textAlign: 'center',
    paddingVertical: 16,
    color: '#888',
  },
  dropdownModal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownCard: {
    width: '88%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ece7eb',
  },
  dropdownTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  dropdownSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: '#f6f3f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efe6ec',
    height: 48,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f1f1f',
    paddingRight: 12,
  },
  dropdownList: {
    maxHeight: 360,
  },
  dropdownListContent: {
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f0e6ec',
    backgroundColor: '#fff',
  },
  dropdownItemSelected: {
    borderColor: '#581845',
    backgroundColor: '#f8eef5',
  },
  dropdownItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  dropdownOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f3f5',
    marginRight: 12,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    color: '#222',
  },
  dropdownItemTextSelected: {
    color: '#581845',
    fontWeight: '700',
  },
  dropdownEmpty: {
    textAlign: 'center',
    color: '#8d8692',
    paddingVertical: 22,
    fontSize: 14,
  },
  industryModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  industrySheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 16,
    minHeight: 430,
    maxHeight: '78%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -6 },
    elevation: 18,
  },
  industryHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#dbcdd6',
    marginBottom: 14,
  },
  industrySheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  industrySheetHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  industrySheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  industrySheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7d6578',
  },
  industrySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6f3f5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#efe6ec',
    height: 50,
    marginBottom: 14,
  },
  industrySearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f1f1f',
    paddingRight: 14,
  },
  industryList: {
    flex: 1,
  },
  industryListContent: {
    paddingBottom: 14,
  },
  industryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#fcfafb',
    borderWidth: 1,
    borderColor: '#efe6ec',
  },
  industryOptionSelected: {
    backgroundColor: '#f8eef5',
    borderColor: '#581845',
  },
  industryOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  industryOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3e7ef',
    marginRight: 12,
  },
  industryOptionIconSelected: {
    backgroundColor: '#f1d9ea',
  },
  industryOptionTextWrap: {
    flex: 1,
  },
  industryOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  industryOptionTitleSelected: {
    color: '#581845',
  },
  industryOptionMeta: {
    fontSize: 12,
    color: '#8d8692',
  },
  industryOptionMetaSelected: {
    color: '#7d6578',
  },
  industryOptionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
  },
  industryEmpty: {
    textAlign: 'center',
    color: '#8d8692',
    paddingVertical: 22,
    fontSize: 14,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  yearChip: {
    width: '30%',
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f7f4f6',
    borderWidth: 1,
    borderColor: '#ece2e8',
  },
  yearChipSelected: {
    backgroundColor: '#581845',
    borderColor: '#581845',
  },
  yearChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  yearChipTextSelected: {
    color: '#fff',
  },

  dobModal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dobCard: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  dobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  dobBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    minWidth: 64,
    alignItems: 'center',
  },
  dobBtnText: {
    fontSize: 16,
  },
  dobPickerWrap: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dobPreview: {
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },

  // 📍 Location Settings Styles
  locationSettingsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  locationPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  locationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0e7ef',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationCityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  locationTimeLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  refreshLocationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0e7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 14,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  toggleDescription: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },

  // ═══ Settings Card Styles ═══
  settingsCard: {
    backgroundColor: '#faf5f8',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f0e0eb',
  },
  settingsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  settingsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#581845',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginTop: 28,
    marginBottom: 4,
  },
  biometricIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(88, 24, 69, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileBadge: {
    position: 'absolute',
    bottom: 6,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(88,24,69,0.85)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  profileBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

});



// import React, { useState, useContext, useEffect, useLayoutEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Image,
//   Alert,
//   ActivityIndicator,
//   Pressable,
//   StatusBar
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import { Linking, Platform } from 'react-native';
// // import * as ImagePicker from 'expo-image-picker';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { AuthContext } from '../context/AuthContext';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import Modal from 'react-native-modal';
// import { ImageBackground } from 'react-native';
// import * as ImageManipulator from 'expo-image-manipulator';
// import { Ionicons } from '@expo/vector-icons'; // For image delete icon
// // import { useContext } from 'react';
// import { useNavigation } from '@react-navigation/native';
// import Toast from 'react-native-toast-message';
// import { SafeAreaView } from 'react-native-safe-area-context';
// // add this with your other imports
// // import { Linking } from 'react-native';




// const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/de2wocs21/image/upload';
// // const CLOUDINARY_URL = 'cloudinary://742569622718158:5vorQLQ6D7p_HMnTyNuaqkKGpz0@de2wocs21'
// const UPLOAD_PRESET = 'unsigned_upload'; // or your configured preset




// const EditProfileScreen = ({ navigation }) => {
//   const { user, updateUser, } = useContext(AuthContext);
//   // const navigation = useNavigation();


//   const [email, setEmail] = useState('');
//   const [phone, setPhone] = useState('');
//   const [origin, setOrigin] = useState('');
//   const [bio, setBio] = useState('');
//   const [interests, setInterests] = useState([]);
//   const [photos, setPhotos] = useState([]);
//   const [nickname, setNickname] = useState('');
//   const [dob, setDob] = useState('');
//   const [languages, setLanguages] = useState('');
//   const [fieldOfStudy, setFieldOfStudy] = useState('');
//   const [graduationYear, setGraduationYear] = useState('');
//   const [industry, setIndustry] = useState('');
//   const [currentRole, setCurrentRole] = useState('');
//   const [linkedIn, setLinkedIn] = useState('');
//   const [funFact, setFunFact] = useState('');
//   const [rship, setRship] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   // const [showGradYearPicker, setShowGradYearPicker] = useState(false);
//   const [showYearModal, setShowYearModal] = useState(false);
//   const [availableYears, setAvailableYears] = useState([]);
//   const [showRshipPicker, setShowRshipPicker] = useState(false);
//   const [showOriginPicker, setShowOriginPicker] = useState(false);
//   const [showIndustryPicker, setShowIndustryPicker] = useState(false);
//   const [industrySearch, setIndustrySearch] = useState('');



//   const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
//   const [showConfirmModal, setShowConfirmModal] = useState(false);
//   const [originSearch, setOriginSearch] = useState('');


//   const [showDeleteModal, setShowDeleteModal] = useState(false);
// const [confirmDeleteText, setConfirmDeleteText] = useState('');
// const [deleting, setDeleting] = useState(false);








//   // Keep these where your other helpers/states are
//   const toLocalYYYYMMDD = (dateObj) => {
//     const y = dateObj.getFullYear();
//     const m = String(dateObj.getMonth() + 1).padStart(2, '0');
//     const d = String(dateObj.getDate()).padStart(2, '0');
//     return `${y}-${m}-${d}`;
//   };

//   // Parse incoming values safely (handles "YYYY-MM-DD", ISO strings, Date)
//   const parseDobToDate = (val) => {
//     if (!val) return null;
//     if (val instanceof Date) return val;
//     if (typeof val === 'string') {
//       const onlyDate = val.split('T')[0]; // take date part if ISO
//       // force local midnight to avoid timezone shifts
//       return new Date(`${onlyDate}T00:00:00`);
//     }
//     // fallback for numbers or other serializable types
//     const d = new Date(val);
//     return isNaN(d) ? null : d;
//   };

//   const prettyDate = (val) => {
//     const d = parseDobToDate(val);
//     return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
//   };

//   // iOS DOB modal temp selection
//   const [showDobModal, setShowDobModal] = useState(false);
//   const [pendingDob, setPendingDob] = useState(null);





//   useEffect(() => {
//     if (user) {
//       setEmail(user.email || '');
//       setPhone(user.phone || '');
//       setOrigin(user.origin || '');
//       setBio(user.bio || '');
//       setNickname(user.nickname || '');
//       // NEW — accept multiple backend keys and normalize
//       const rawDob = user?.DOB ?? user?.dob ?? user?.dateOfBirth ?? '';
//       if (rawDob) {
//         const parsed = parseDobToDate(rawDob);
//         setDob(parsed ? toLocalYYYYMMDD(parsed) : '');
//       } else {
//         setDob('');
//       }

//       // setDob(user.dob || '');
//       setLanguages(Array.isArray(user.languages) ? user.languages.join(', ') : user.languages || '');

//       // setLanguages(user.languages || '');
//       setFieldOfStudy(user.fieldOfStudy || '');
//       setGraduationYear(user.graduationYear || '');
//       setIndustry(user.industry || '');
//       setCurrentRole(user.currentRole || '');
//       setLinkedIn(user.linkedIn || '');
//       setFunFact(user.funFact || '');
//       setRship(user.rship || '');
//       setInterests(user.interests || []);
//       setPhotos(user.photos || []);

//       // Note: You can load user.photos here if needed.
//     }
//   }, [user]);



//   // small util: full local sign-out + data wipe
// const hardSignOut = async () => {
//   try {
//     await AsyncStorage.removeItem('token');
//     await AsyncStorage.removeItem('userId');
//   } catch {}
//   // if you store other keys, also clear them here
//   if (updateUser) updateUser(null);
//   navigation.reset({ index: 0, routes: [{ name: 'Auth' }] }); // or your login route
// };


// const handleDeleteAccount = async () => {
//   if (confirmDeleteText.trim().toUpperCase() !== 'DELETE') return;

//   try {
//     setDeleting(true);
//     const token = await AsyncStorage.getItem('token');
//     const userId = await AsyncStorage.getItem('userId');

//     // IMPORTANT: Your backend should perform irreversible deletion of the account
//     // and associated personal data (or queue it for deletion), then return 200.
//     await axios.delete(`http://192.168.14.134:4000/accounts/${userId}`, {
//       headers: { Authorization: `Bearer ${token}` },
//       // If your backend supports soft vs hard deletes, pass a flag:
//       params: { hard: true }
//     });

//     setShowDeleteModal(false);
//     Alert.alert('Account deleted', 'Your account and personal data have been removed.');
//     await hardSignOut();
//   } catch (err) {
//     console.error('Delete account error:', err?.response || err?.message || err);
//     Alert.alert('Unable to delete', 'Please check your connection and try again.');
//   } finally {
//     setDeleting(false);
//     setConfirmDeleteText('');
//   }
// };



//   const pickImage = async () => {
//     try {
//       // 1) Permissions – no options argument here (avoids the TestFlight crash)
//       let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
//       if (!perm.granted) {
//         perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); // <-- no args
//       }

//       if (!perm.granted) {
//         Alert.alert(
//           'Permission needed',
//           'Please allow photo access to upload a profile picture.',
//           [
//             { text: 'Open Settings', onPress: () => Linking.openSettings?.() },
//             { text: 'Cancel', style: 'cancel' }
//           ]
//         );
//         return;
//       }

//       // 2) Picker options (backwards/forwards compatible)
//       const pickerOptions = {
//         allowsEditing: true,
//         quality: 1,
//         exif: false,
//       };

//       if (ImagePicker?.MediaType?.Image) {
//         // Newer SDKs
//         pickerOptions.mediaTypes = [ImagePicker.MediaType.Image];
//       } else if (ImagePicker?.MediaTypeOptions?.Images) {
//         // Older SDKs
//         pickerOptions.mediaTypes = ImagePicker.MediaTypeOptions.Images;
//       }

//       const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
//       if (result.canceled) return;

//       const asset = result.assets?.[0];
//       if (!asset?.uri) {
//         Alert.alert('Error', 'No image selected.');
//         return;
//       }

//       // 3) Resize/compress for faster uploads
//       const manipulated = await ImageManipulator.manipulateAsync(
//         asset.uri,
//         [{ resize: { width: 1000 } }],
//         { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
//       );

//       // 4) Upload to Cloudinary via FormData (safer than base64)
//       const data = new FormData();
//       data.append('file', {
//         uri: manipulated.uri,
//         name: `profile_${Date.now()}.jpg`,
//         type: 'image/jpeg',
//       });
//       // Make sure UPLOAD_PRESET has no slashes/spaces and is configured for unsigned uploads
//       data.append('upload_preset', UPLOAD_PRESET);
//       // If your unsigned preset ALLOWS specifying a folder, you can uncomment this:
//       // data.append('folder', '34thstreet_profile');

//       const uploadRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: data });
//       const json = await uploadRes.json();
//       console.log('Cloudinary response:', json);

//       if (json.secure_url) {
//         setPhotos(prev => [...prev, json.secure_url]);
//       } else {
//         Alert.alert('Upload failed', json?.error?.message || 'Try again.');
//       }
//     } catch (e) {
//       console.log('pickImage error:', e);
//       Alert.alert('Could not open gallery', String(e?.message || e));
//     }
//   };

//   const setAsProfilePhoto = (index) => {
//     if (index === 0) return;
//     const updated = [...photos];
//     const [picked] = updated.splice(index, 1);
//     updated.unshift(picked);
//     setPhotos(updated);
//   };


//   const handleRemovePhoto = (index) => {
//     Alert.alert('Delete Photo', 'Are you sure?', [
//       { text: 'Cancel', style: 'cancel' },
//       {
//         text: 'Delete',
//         onPress: () => {
//           const updated = [...photos];
//           updated.splice(index, 1);
//           setPhotos(updated);
//         },
//       },
//     ]);
//   };


//   useEffect(() => {
//     const startYear = 1980;
//     const endYear = 2030;
//     const years = [];

//     for (let year = endYear; year >= startYear; year--) {
//       years.push(year.toString());
//     }

//     setAvailableYears(years);
//   }, []);



//   const tags = [
//     'Afrobeats', 'Fashion', 'Sports', 'Media', 'Dance', 'Photography', 'Beauty', 'Art', 'Storytelling', 'Spoken Word', 'Movies', 'Cooking', 'DIY', 'Podcasting', 'Mental Health', 'Faith', 'Fitness', 'Plant Parent Life', 'Romanticizing Life', 'Country/City-Hopping', 'Gaming', 'Reading', 'Impact Work'
//   ];

//   const relationshipOptions = [
//     'Single',
//     'Married',
//     'Engaged',
//     'Ready to Mingle',
//     'Eyes Rolling'
//   ];

//   const africanCountries = [
//     'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon', 'Central African Republic', 'Chad', 'Comoros', 'Rep. of the Congo', 'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
//   ];





//   const industryOptions = [
//     '💻 Tech',
//     '💼 Business / Consulting',
//     '🏦 Finance',
//     '🏥 Healthcare',
//     '🎓 Education',
//     '🎬 Media & Entertainment',
//     '⚖️ Law',
//     '📊 Venture Capital / Private Equity',
//     '🏛 Government & Public Sector',
//     '🚀 Entrepreneurship / Startups',
//     '🏠 Real Estate',
//     '📣 Marketing & Advertising',
//     '🛠 Engineering',
//     '🛍 Retail & E-Commerce',
//     '⛽️ Energy / Oil & Gas',
//     '🌾 Agriculture',
//     '👗 Fashion & Beauty',
//     '✈️ Travel & Tourism',
//     '🏋️ Sports & Wellness',
//     '🔧 Other',
//   ];

//   const filteredIndustries = industryOptions.filter((item) =>
//     item.toLowerCase().includes(industrySearch.toLowerCase())
//   );



//   const toggleInterest = (tag) => {
//     setInterests(prev =>
//       prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]
//     );
//   };



//   const handleGraduationYearChange = (event, selectedDate) => {
//     setShowGradYearPicker(false);

//     if (event.type === 'set' && selectedDate) {
//       const selectedYear = selectedDate.getFullYear();
//       setGraduationYear(selectedYear.toString());
//     }
//   };


//   // helpers (accent/diacritics-insensitive search)
//   const strip = (s = '') =>
//     s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

//   const filteredCountries = africanCountries.filter(c =>
//     strip(c).includes(strip(originSearch))
//   );




//   const handleSave = async () => {

//     let missingFields = [];
//     // if (!nickname) missingFields.push('Nickname');
//     if (!email) missingFields.push('Email');
//     if (!origin) missingFields.push('Country of Origin');
//     // if (!dob) missingFields.push('Date of Birth');
//     if (!fieldOfStudy) missingFields.push('Field of Study');
//     if (!graduationYear) missingFields.push('Graduation Year');
//     if (!currentRole) missingFields.push('Previous / Current Role');
//     // if (!linkedIn) missingFields.push('LinkedIn');
//     if (!industry) missingFields.push('industry');
//     if (!bio) missingFields.push('Bio');
//     if (interests.length === 0) missingFields.push('At least one Interest');
//     if (photos.length === 0) missingFields.push('At least one Photo');

//     if (missingFields.length > 0) {
//       Alert.alert(
//         'Missing Required Fields',
//         `Please complete: ${missingFields.join(', ')}`
//       );
//       return;
//     }



//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem('token');
//       const userId = await AsyncStorage.getItem('userId');

//       const payload = {
//         email,
//         phone,
//         origin,
//         bio,
//         // nickname,
//         DOB: dob,
//         dob: dob,
//         languages: languages.split(',').map(lang => lang.trim()),
//         graduationYear,
//         industry: industry.replace(/^[^\w]+ /, ''),
//         currentRole,
//         // linkedIn,
//         funFact,
//         rship,
//         fieldOfStudy,
//         interests,
//         photos,
//       };

//       const res = await axios.put(
//         `http://192.168.14.134:4000/accounts/${userId}`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       if (res.data?.user) {
//         await updateUser(res.data.user);
//         // Alert.alert('Success', 'Profile updated successfully!');
//         Toast.show({
//           type: 'success',
//           text1: 'Profile updated!',
//           text2: 'Your changes were saved.',
//         });
//         navigation.navigate({
//           index: 0,
//           routes: [{ name: 'Home' }],
//         });
//       }
//     } catch (error) {
//       console.error('❌ Profile update failed:', error.response || error.message);
//       Alert.alert('Error', 'Failed to update profile. Try again.');
//     } finally {
//       setLoading(false);
//     }
//   };


//   return (
// <SafeAreaView style={styles.container}>
     
//     <View style={styles.headerRow}>
//   <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//     <Ionicons name="chevron-back-outline" size={22} color="#581845" />
//     <Text style={styles.backText}>Back</Text>
//   </TouchableOpacity>
//   <Text numberOfLines={1} style={styles.headerTitle}>Edit Your Profile</Text>

//   {/* Spacer to balance layout */}
//   <View style={{ width: 60 }} />
// </View>
    
//     <ScrollView >
//        {/* <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//            <Ionicons name="arrow-back" size={24} color="#000" />
//          </TouchableOpacity>
//       <Text style={styles.header}>Edit Your Profile</Text>  */}

     

//       <Text style={styles.label}>Nickname </Text>
//       <TextInput
//         style={styles.input}
//         value={nickname}
//         onChangeText={setNickname}
//         placeholder="Ambassador"
//       />


//       <Text style={styles.label}>Phone Number</Text>
//       <TextInput
//         style={styles.input}
//         value={phone}
//         onChangeText={setPhone}
//         placeholder="+1234567890"
//         keyboardType="phone-pad"
//       />

//       <Text style={styles.label}>Country of Origin <Text style={styles.required}>*</Text></Text>
//       <TouchableOpacity
//         style={[styles.input, !origin && styles.invalidInput]}
//         onPress={() => setShowOriginPicker(true)}
//       >
//         <Text style={{ color: origin ? '#000' : '#999' }}>
//           {origin || 'Select your country of origin'}
//         </Text>
//       </TouchableOpacity>

//       <Modal
//         isVisible={showOriginPicker}
//         onBackdropPress={() => { setShowOriginPicker(false); setOriginSearch(''); }}
//         onBackButtonPress={() => { setShowOriginPicker(false); setOriginSearch(''); }}
//         style={styles.originModal}
//         backdropOpacity={0.35}
//         useNativeDriver
//         useNativeDriverForBackdrop
//         statusBarTranslucent
//         avoidKeyboard
//       >
//         <View style={styles.originCard}>
//           {/* Header */}
//           <View style={styles.originHeader}>
//             <Text style={styles.originTitle}>Select Country</Text>
//             <TouchableOpacity
//               onPress={() => { setShowOriginPicker(false); setOriginSearch(''); }}
//               hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
//             >
//               <Ionicons name="close" size={22} color="#333" />
//             </TouchableOpacity>
//           </View>

//           {/* Search */}
//           <View style={styles.originSearchRow}>
//             <Ionicons name="search" size={18} color="#888" style={{ marginHorizontal: 8 }} />
//             <TextInput
//               style={styles.originSearchInput}
//               placeholder="Search country..."
//               value={originSearch}
//               onChangeText={setOriginSearch}
//               autoCorrect={false}
//               autoFocus
//               returnKeyType="search"
//             />
//           </View>

//           {/* List */}
//           <ScrollView
//             style={styles.originList}
//             keyboardShouldPersistTaps="handled"
//             contentContainerStyle={{ paddingBottom: 8 }}
//           >
//             {(filteredCountries.length ? filteredCountries : africanCountries).map((country, i) => {
//               const selected = country === origin;
//               return (
//                 <TouchableOpacity
//                   key={`${country}-${i}`}
//                   style={[styles.originItem, selected && styles.originItemSelected]}
//                   onPress={() => {
//                     setOrigin(country);
//                     setShowOriginPicker(false);
//                     setOriginSearch('');
//                   }}
//                 >
//                   <Text style={[styles.originItemText, selected && styles.originItemTextSelected]}>
//                     {country}
//                   </Text>
//                   {selected && <Ionicons name="checkmark" size={18} color="#581845" />}
//                 </TouchableOpacity>
//               );
//             })}

//             {filteredCountries.length === 0 && (
//               <Text style={styles.originEmpty}>No matches</Text>
//             )}
//           </ScrollView>
//         </View>
//       </Modal>


//       <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
//       <TouchableOpacity
//         style={styles.input}
//         onPress={() => {
//           const base = dob ? parseDobToDate(dob) : new Date(2000, 0, 1);

//           // const base = dob ? new Date(dob) : new Date(2000, 0, 1); // default to Jan 1, 2000
//           if (Platform.OS === 'ios') {
//             setPendingDob(base);
//             setShowDobModal(true);
//           } else {
//             setPendingDob(base);
//             setShowDatePicker(true); // Android native dialog has OK/Cancel already
//           }
//         }}
//       >
//         <Text style={{ color: dob ? '#000' : '#999' }}>
//           {dob ? prettyDate(dob) : 'Select your birth date'}
//         </Text>
//       </TouchableOpacity>

//       {/* ANDROID: system date dialog with OK/Cancel */}
//       {showDatePicker && Platform.OS === 'android' && (
//         <DateTimePicker
//           value={pendingDob || (dob ? parseDobToDate(dob) : new Date(2000, 0, 1))}

//           // value={pendingDob || (dob ? new Date(dob) : new Date(2000, 0, 1))}
//           mode="date"
//           display="calendar"
//           maximumDate={new Date()}
//           minimumDate={new Date(1900, 0, 1)}
//           onChange={(event, selected) => {
//             // Android emits 'set' on confirm and 'dismissed' on cancel
//             setShowDatePicker(false);
//             if (event.type === 'set' && selected) {
//               setDob(toLocalYYYYMMDD(selected)); // save in local time -> fixes "day after"
//             }
//           }}
//         />
//       )}

//       {/* iOS: elegant modal with Cancel / Done */}
//       <Modal
//         isVisible={showDobModal}
//         onBackdropPress={() => setShowDobModal(false)}
//         onBackButtonPress={() => setShowDobModal(false)}
//         style={styles.dobModal}
//         backdropOpacity={0.35}
//         useNativeDriver
//         useNativeDriverForBackdrop
//         statusBarTranslucent
//         avoidKeyboard
//       >
//         <View style={styles.dobCard}>
//           <View style={styles.dobHeader}>
//             <TouchableOpacity onPress={() => setShowDobModal(false)} style={styles.dobBtn}>
//               <Text style={[styles.dobBtnText, { color: '#666' }]}>Cancel</Text>
//             </TouchableOpacity>

//             <Text style={styles.dobTitle}>Select Date of Birth</Text>

//             <TouchableOpacity
//               onPress={() => {
//                 if (pendingDob) setDob(toLocalYYYYMMDD(pendingDob)); // save in local time
//                 setShowDobModal(false);
//               }}
//               style={styles.dobBtn}
//             >
//               <Text style={[styles.dobBtnText, { color: '#581845', fontWeight: '700' }]}>Done</Text>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.dobPickerWrap}>
//             <DateTimePicker
//               value={pendingDob || (dob ? parseDobToDate(dob) : new Date(2000, 0, 1))}

//               // value={pendingDob || (dob ? new Date(dob) : new Date(2000, 0, 1))}
//               mode="date"
//               display="spinner"               // iOS inline wheel
//               maximumDate={new Date()}
//               minimumDate={new Date(1900, 0, 1)}
//               onChange={(_, selected) => {
//                 // iOS emits continuously while scrolling—just cache, don’t save
//                 if (selected) setPendingDob(selected);
//               }}
//               themeVariant="light"
//               textColor="#000"
//               style={{ alignSelf: 'center' }}
//             />
//           </View>

//           {/* Live preview under the wheel */}
//           <Text style={styles.dobPreview}>
//             {pendingDob ? prettyDate(pendingDob) : prettyDate(dob || new Date(2000, 0, 1))}
//           </Text>
//         </View>
//       </Modal>


//       <Text style={styles.label}>Languages Spoken</Text>
//       <TextInput
//         style={styles.input}
//         value={languages}
//         onChangeText={setLanguages}
//         placeholder="English, yoruba"
//       />



//       <Text style={styles.label}>Field of Study <Text style={styles.required}>*</Text></Text>
//       <TextInput
//         style={styles.input}
//         value={fieldOfStudy}
//         onChangeText={setFieldOfStudy}
//         placeholder="ICT"
//       />


//       <Text style={styles.label}>Graduation Year <Text style={styles.required}>*</Text></Text>
//       <TouchableOpacity onPress={() => setShowYearModal(true)} style={styles.input}>
//         <Text style={{ color: graduationYear ? '#000' : '#999' }}>
//           {graduationYear || 'Select your graduation year'}
//         </Text>
//       </TouchableOpacity>

//       {showYearModal && (
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalBox}>
//             <ScrollView style={{ maxHeight: 300 }}>
//               {availableYears.map((year) => (
//                 <TouchableOpacity
//                   key={year}
//                   onPress={() => {
//                     setGraduationYear(year);
//                     setShowYearModal(false);
//                   }}
//                   style={styles.yearItem}
//                 >
//                   <Text style={styles.yearText}>{year}</Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//           </View>
//         </View>
//       )}





//       <Text style={styles.label}>Industry <Text style={styles.required}>*</Text></Text>
//       <TouchableOpacity
//         style={styles.input}
//         onPress={() => setShowIndustryPicker(true)}
//       >
//         <Text style={{ color: industry ? '#000' : '#999' }}>
//           {industry || 'Select your industry'}
//         </Text>
//       </TouchableOpacity>


//       {showIndustryPicker && (
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <TextInput
//               style={[styles.input, { marginBottom: 10 }]}
//               placeholder="Search industry..."
//               value={industrySearch}
//               onChangeText={setIndustrySearch}
//             />

//             <ScrollView style={{ maxHeight: 300 }}>
//               {filteredIndustries.map((option, index) => (
//                 <TouchableOpacity
//                   key={index}
//                   style={styles.modalOption}
//                   onPress={() => {
//                     setIndustry(option);
//                     setShowIndustryPicker(false);
//                     setIndustrySearch('');
//                   }}
//                 >
//                   <Text style={styles.modalOptionText}>{option}</Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>

//             <TouchableOpacity
//               onPress={() => {
//                 setShowIndustryPicker(false);
//                 setIndustrySearch('');
//               }}
//               style={styles.modalCancel}
//             >
//               <Text style={styles.modalCancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}



//       <Text style={styles.label}>Previous / Current Role <Text style={styles.required}>*</Text></Text>
//       <TextInput
//         style={styles.input}
//         value={currentRole}
//         onChangeText={setCurrentRole}
//         placeholder="Job title@ company name"
//       />
//       <Text style={styles.label}>LinkedIn Profile</Text>
//       <TextInput
//         style={styles.input}
//         value={linkedIn}
//         onChangeText={setLinkedIn}
//         placeholder="https://www.linkedin.com/in/"
//       />
//       <Text style={styles.label}>Fun Fact</Text>
//       <TextInput
//         style={styles.input}
//         value={funFact}
//         onChangeText={setFunFact}
//         placeholder="Tell us something interesting about you !"
//       />
//       <Text style={styles.label}>Relationship Status</Text>
//       <TouchableOpacity onPress={() => setShowRshipPicker(true)} style={styles.input}>
//         <Text style={{ color: rship ? '#000' : '#999' }}>
//           {rship || 'Select your relationship status'}
//         </Text>
//       </TouchableOpacity>

//       <Modal
//         isVisible={showRshipPicker}
//         onBackdropPress={() => setShowRshipPicker(false)}
//         onBackButtonPress={() => setShowRshipPicker(false)}
//         style={styles.bottomModal}
//       >
//         <View style={styles.modalContent}>
//           {relationshipOptions.map((option, index) => (
//             <TouchableOpacity
//               key={index}
//               style={styles.modalOption}
//               onPress={() => {
//                 setRship(option);
//                 setShowRshipPicker(false);
//               }}
//             >
//               <Text style={styles.modalOptionText}>{option}</Text>
//             </TouchableOpacity>
//           ))}
//           <TouchableOpacity onPress={() => setShowRshipPicker(false)} style={styles.modalCancel}>
//             <Text style={styles.modalCancelText}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       </Modal>






//       <Text style={styles.label}>Bio / About Me <Text style={styles.required}>*</Text></Text>
//       <TextInput
//         style={[styles.input, styles.textArea]}
//         value={bio}
//         onChangeText={setBio}
//         placeholder="Tell us about yourself..."
//         multiline
//         numberOfLines={5}
//         maxLength={700}
//       />

//       <Text style={styles.label}>Interests <Text style={styles.required}>*</Text></Text>
//       <View style={styles.tagsWrapper}>
//         {tags.map((tag) => (
//           <TouchableOpacity
//             key={tag}
//             style={[styles.tag, interests.includes(tag) && styles.tagSelected]}
//             onPress={() => toggleInterest(tag)}>
//             <Text style={[styles.tagText, interests.includes(tag) && styles.tagTextSelected]}>{tag}</Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       <Text style={styles.label}>Upload Photos <Text style={styles.required}>*</Text></Text>
//       <View style={styles.photoGrid}>
//         {photos.map((uri, idx) => (
//           <View key={idx} style={styles.photoWrapper}>
//             <TouchableOpacity
//               onPress={() => {
//                 if (idx !== 0) {
//                   setSelectedPhotoIndex(idx);
//                   setShowConfirmModal(true);
//                 }
//               }}
//             >
//               <Image
//                 source={{ uri }}
//                 style={[styles.photo, idx === 0 && styles.firstPhotoBorder]}
//               />
//               {idx === 0 && <Text style={styles.profileLabel}>Profile Photo</Text>}
//             </TouchableOpacity>
//             <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemovePhoto(idx)}>
//               <Text style={styles.removeText}>✕</Text>
//             </TouchableOpacity>
//           </View>
//         ))}
//         {photos.length < 6 && (
//           <TouchableOpacity onPress={pickImage} style={styles.addPhotoBtn}>
//             <Text style={styles.addPhotoText}>+ Add Photo</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {showConfirmModal && (
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalBox}>
//             <Text style={styles.modalText}>Set this as your profile photo?</Text>
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 style={styles.modalBtn}
//                 onPress={() => {
//                   setShowConfirmModal(false);
//                   setAsProfilePhoto(selectedPhotoIndex);
//                 }}
//               >
//                 <Text style={styles.modalBtnText}>Yes</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalBtn, { backgroundColor: '#ccc' }]}
//                 onPress={() => setShowConfirmModal(false)}
//               >
//                 <Text style={styles.modalBtnText}>Cancel</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}

//       <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
//         {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
//       </TouchableOpacity>



//       {/* ===== Danger Zone ===== */}
// <View style={{ marginTop: 10, marginBottom:30, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee' }}>
//   <Text style={{ fontSize: 16, fontWeight: '700', color: '#b00020', marginBottom: 8 }}>
//     Danger Zone
//   </Text>
//   <Text style={{ color: '#555', marginBottom: 12 }}>
//     Permanently delete your account and all associated data.
//   </Text>

//   <TouchableOpacity
//     onPress={() => setShowDeleteModal(true)}
//     style={{
//       backgroundColor: '#b00020',
//       paddingVertical: 14,
//       borderRadius: 10,
//       alignItems: 'center'
//     }}
//   >
//     <Text style={{ color: '#fff', fontWeight: '700' }}>Delete Account</Text>
//   </TouchableOpacity>
// </View>

// {/* Delete confirmation modal */}
// <Modal
//   isVisible={showDeleteModal}
//   onBackdropPress={() => !deleting && setShowDeleteModal(false)}
//   onBackButtonPress={() => !deleting && setShowDeleteModal(false)}
//   style={{ justifyContent: 'center', margin: 0 }}
//   useNativeDriver
//   useNativeDriverForBackdrop
//   backdropOpacity={0.35}
// >
//   <View style={{ backgroundColor:'#fff', marginHorizontal:20, borderRadius:12, padding:16 }}>
//     <Text style={{ fontSize:18, fontWeight:'700', marginBottom:6 }}>Delete Account?</Text>
//     <Text style={{ color:'#555' }}>
//       This action is permanent and cannot be undone. To confirm, type <Text style={{ fontWeight:'700' }}>DELETE</Text> below.
//     </Text>

//     <TextInput
//       style={[styles.input, { marginTop: 12 }]}
//       value={confirmDeleteText}
//       onChangeText={setConfirmDeleteText}
//       placeholder="Type DELETE to confirm"
//       autoCapitalize="characters"
//       autoCorrect={false}
//     />

//     <View style={{ flexDirection:'row', justifyContent:'flex-end', gap:10, marginTop:14 }}>
//       <TouchableOpacity
//         disabled={deleting}
//         onPress={() => setShowDeleteModal(false)}
//         style={{ paddingVertical:12, paddingHorizontal:16, borderRadius:8, backgroundColor:'#eee' }}
//       >
//         <Text style={{ fontWeight:'600', color:'#333' }}>Cancel</Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         disabled={confirmDeleteText.trim().toUpperCase() !== 'DELETE' || deleting}
//         onPress={handleDeleteAccount}
//         style={{
//           paddingVertical:12, paddingHorizontal:16, borderRadius:8,
//           backgroundColor: (confirmDeleteText.trim().toUpperCase() === 'DELETE' ? '#b00020' : '#e9a8b1')
//         }}
//       >
//         <Text style={{ fontWeight:'700', color:'#fff' }}>
//           {deleting ? 'Deleting…' : 'Confirm'}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   </View>
// </Modal>

//     </ScrollView>
//     </SafeAreaView>
//   );
// };

// export default EditProfileScreen;


// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: '#fff', marginTop: 20, },
//   headerRow: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   justifyContent: 'space-between',
//   // paddingHorizontal: 3,
//   height: 30,
// },

// backButton: {
//   flexDirection: 'row',
//   alignItems: 'center',
//   gap: 4,
//   paddingHorizontal: 4,
//   paddingVertical: 4,
//   minWidth: 60,
// },

// backText: {
//   fontSize: 18,
//   color: '#581845',
// },

// headerTitle: {
//   flex: 1,
//   textAlign: 'center',
//   fontSize: 20,
//   fontWeight: '700',
//   color: '#581845',
//   paddingHorizontal: 8,
// },


//   label: {
//     marginTop: 15,
//     marginBottom: 5,
//     fontWeight: '600'
//   },
//   input: {


//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     justifyContent: 'center'
//   },
//   textArea: {
//     height: 120,
//     textAlignVertical: 'top'
//   },
//   profileLabel: { fontSize: 12, color: '#581845', textAlign: 'center', marginTop: 4 },

//   tagsWrapper: {
//     flexDirection: 'row',
//     flexWrap: 'wrap'
//   },
//   tag: {
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     backgroundColor: '#eee',
//     borderRadius: 20,
//     margin: 5
//   },
//   deleteIcon: {
//     position: 'absolute',
//     top: -5,
//     right: -5,
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     zIndex: 10,
//   },

//   tagSelected: {
//     backgroundColor: '#581845'
//   },
//   tagText: {
//     fontSize: 14,
//     color: '#555'
//   },
//   tagTextSelected: {
//     color: '#fff'
//   },
//   photoContainer: {
//     position: 'relative',
//     margin: 5,
//   },

//   photo: {
//     width: 100,
//     height: 100,
//     borderRadius: 8,
//   },
//   photoWrapper: {
//     position: 'relative',
//     margin: 10,
//   },

//   firstPhotoBorder: {
//     borderColor: '#581845',
//     borderWidth: 2,
//   },

//   addPhotoBtn: {
//     width: 100,
//     height: 100,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   addPhotoText: {
//     fontSize: 12,
//     color: '#555',
//     textAlign: 'center'
//   },
//   modalActions: { flexDirection: 'row', gap: 10 },
//   modalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#581845', borderRadius: 8 },
//   modalBtnText: { color: '#fff', fontWeight: '600' },

//   saveButton: {
//     backgroundColor: '#581845',
//     paddingVertical: 15,
//     borderRadius: 10,
//     marginTop: 20,
//     // marginBottom:80,
//     alignItems: 'center'
//   },
//   saveButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//     textAlign: 'center'
//   },
//   modalOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 999
//   },
//   modalBox: {
//     backgroundColor: '#fff', padding: 20, borderRadius: 10, width: '80%', alignItems: 'center',
//   },
//   yearItem: {
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderColor: '#eee'
//   },
//   modalText: { fontSize: 16, marginBottom: 20, textAlign: 'center' },

//   yearText: {
//     fontSize: 18,
//     textAlign: 'center'
//   },


//   modalContainer: {
//     width: '80%',
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     padding: 20,
//     elevation: 10,
//   },
//   invalidInput: {
//     borderColor: 'red',
//     borderWidth: 1,
//   },

//   modalOption: {
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },

//   modalOptionText: {
//     fontSize: 16,
//     color: '#333',
//     textAlign: 'center',
//   },

//   modalCancel: {
//     marginTop: 10,
//     paddingVertical: 12,
//     backgroundColor: '#ddd',
//     borderRadius: 8,
//   },

//   modalCancelText: {
//     textAlign: 'center',
//     color: '#555',
//     fontWeight: '600',
//   },
//   bottomModal: {
//     justifyContent: 'flex-end',
//     margin: 0,
//   },

//   modalContent: {
//     backgroundColor: '#fff',
//     paddingTop: 20,
//     paddingBottom: 30,
//     paddingHorizontal: 20,
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 6,
//     elevation: 10,
//   },

//   modalOption: {
//     paddingVertical: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },

//   modalOptionText: {
//     fontSize: 16,
//     color: '#333',
//     textAlign: 'center',
//   },



//   modalCancel: {
//     marginTop: 15,
//     backgroundColor: '#eee',
//     paddingVertical: 14,
//     borderRadius: 10,
//   },

//   modalCancelText: {
//     textAlign: 'center',
//     color: '#555',
//     fontWeight: '600',
//   },


//   modalContainer: {
//     width: '85%',
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     padding: 15,
//     maxHeight: '60%',
//   },

//   modalOption: {
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },

//   modalOptionText: {
//     fontSize: 16,
//     color: '#333',
//   },

//   modalCancel: {
//     marginTop: 10,
//     backgroundColor: '#ddd',
//     paddingVertical: 12,
//     borderRadius: 8,
//   },

//   modalCancelText: {
//     textAlign: 'center',
//     fontWeight: '600',
//     color: '#333',
//   },
//   photoGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//     marginTop: 10,
//   },
//   removeText: { color: 'red', fontSize: 14, fontWeight: 'bold' },

//   removeBtn: {
//     position: 'absolute',
//     top: -8,
//     right: -8,
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     width: 20,
//     height: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     zIndex: 10,
//   },



//   removeText: {
//     color: 'red',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   required: {
//     color: 'red',
//   },

//   originModal: {
//     margin: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   originCard: {
//     width: '88%',
//     maxHeight: '70%',
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOpacity: 0.15,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 6 },
//     elevation: 10,
//   },
//   originHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#eee',
//   },
//   originTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111',
//   },
//   originSearchRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginHorizontal: 12,
//     marginTop: 12,
//     marginBottom: 8,
//     backgroundColor: '#f5f5f7',
//     borderRadius: 10,
//     paddingHorizontal: 6,
//     height: 44,
//   },
//   originSearchInput: {
//     flex: 1,
//     fontSize: 16,
//   },
//   originList: {
//     paddingHorizontal: 6,
//   },
//   originItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//     paddingHorizontal: 10,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#eee',
//   },
//   originItemSelected: {
//     backgroundColor: '#f7eef5', // subtle accent
//     borderLeftWidth: 3,
//     borderLeftColor: '#581845',
//   },
//   originItemText: {
//     fontSize: 16,
//     color: '#222',
//   },
//   originItemTextSelected: {
//     color: '#581845',
//     fontWeight: '600',
//   },
//   originEmpty: {
//     textAlign: 'center',
//     paddingVertical: 16,
//     color: '#888',
//   },

//   dobModal: {
//     margin: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   dobCard: {
//     width: '88%',
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOpacity: 0.15,
//     shadowRadius: 12,
//     shadowOffset: { width: 0, height: 6 },
//     elevation: 10,
//   },
//   dobHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#eee',
//   },
//   dobTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111',
//   },
//   dobBtn: {
//     paddingVertical: 6,
//     paddingHorizontal: 6,
//     minWidth: 64,
//     alignItems: 'center',
//   },
//   dobBtnText: {
//     fontSize: 16,
//   },
//   dobPickerWrap: {
//     paddingVertical: 8,
//     paddingHorizontal: 8,
//   },
//   dobPreview: {
//     textAlign: 'center',
//     paddingVertical: 12,
//     fontSize: 16,
//     color: '#333',
//     borderTopWidth: StyleSheet.hairlineWidth,
//     borderTopColor: '#eee',
//   }



// });



