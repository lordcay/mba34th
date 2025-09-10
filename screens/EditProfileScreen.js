import React, { useState, useContext, useEffect } from 'react';
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
} from 'react-native';
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
// add this with your other imports
// import { Linking } from 'react-native';




const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/de2wocs21/image/upload';
// const CLOUDINARY_URL = 'cloudinary://742569622718158:5vorQLQ6D7p_HMnTyNuaqkKGpz0@de2wocs21'
const UPLOAD_PRESET = 'unsigned_upload'; // or your configured preset




const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser, } = useContext(AuthContext);
  // const navigation = useNavigation();


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



  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [originSearch, setOriginSearch] = useState('');


  // const toLocalYYYYMMDD = (dateObj) => {
  //   const y = dateObj.getFullYear();
  //   const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  //   const d = String(dateObj.getDate()).padStart(2, '0');
  //   return `${y}-${m}-${d}`;
  // };

  // const prettyDate = (val) => {
  //   if (!val) return '';
  //   const d = typeof val === 'string' ? new Date(val) : val;
  //   // Localized nice string (e.g., January 12, 1995)
  //   return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  // };


  // // --- DOB state
  // const [showDobModal, setShowDobModal] = useState(false);   // iOS modal
  // const [pendingDob, setPendingDob] = useState(null);        // temp selection for iOS

  // Keep these where your other helpers/states are
  const toLocalYYYYMMDD = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Parse incoming values safely (handles "YYYY-MM-DD", ISO strings, Date)
  const parseDobToDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      const onlyDate = val.split('T')[0]; // take date part if ISO
      // force local midnight to avoid timezone shifts
      return new Date(`${onlyDate}T00:00:00`);
    }
    // fallback for numbers or other serializable types
    const d = new Date(val);
    return isNaN(d) ? null : d;
  };

  const prettyDate = (val) => {
    const d = parseDobToDate(val);
    return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  };

  // iOS DOB modal temp selection
  const [showDobModal, setShowDobModal] = useState(false);
  const [pendingDob, setPendingDob] = useState(null);





  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setOrigin(user.origin || '');
      setBio(user.bio || '');
      setNickname(user.nickname || '');
      // NEW — accept multiple backend keys and normalize
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

      // Note: You can load user.photos here if needed.
    }
  }, [user]);





  const pickImage = async () => {
    try {
      // 1) Permissions – no options argument here (avoids the TestFlight crash)
      let perm = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); // <-- no args
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
        return;
      }

      // 2) Picker options (backwards/forwards compatible)
      const pickerOptions = {
        allowsEditing: true,
        quality: 1,
        exif: false,
      };

      if (ImagePicker?.MediaType?.Image) {
        // Newer SDKs
        pickerOptions.mediaTypes = [ImagePicker.MediaType.Image];
      } else if (ImagePicker?.MediaTypeOptions?.Images) {
        // Older SDKs
        pickerOptions.mediaTypes = ImagePicker.MediaTypeOptions.Images;
      }

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'No image selected.');
        return;
      }

      // 3) Resize/compress for faster uploads
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 4) Upload to Cloudinary via FormData (safer than base64)
      const data = new FormData();
      data.append('file', {
        uri: manipulated.uri,
        name: `profile_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
      // Make sure UPLOAD_PRESET has no slashes/spaces and is configured for unsigned uploads
      data.append('upload_preset', UPLOAD_PRESET);
      // If your unsigned preset ALLOWS specifying a folder, you can uncomment this:
      // data.append('folder', '34thstreet_profile');

      const uploadRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: data });
      const json = await uploadRes.json();
      console.log('Cloudinary response:', json);

      if (json.secure_url) {
        setPhotos(prev => [...prev, json.secure_url]);
      } else {
        Alert.alert('Upload failed', json?.error?.message || 'Try again.');
      }
    } catch (e) {
      console.log('pickImage error:', e);
      Alert.alert('Could not open gallery', String(e?.message || e));
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
    const endYear = 2030;
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
    '💻 Tech',
    '💼 Business / Consulting',
    '🏦 Finance',
    '🏥 Healthcare',
    '🎓 Education',
    '🎬 Media & Entertainment',
    '⚖️ Law',
    '📊 Venture Capital / Private Equity',
    '🏛 Government & Public Sector',
    '🚀 Entrepreneurship / Startups',
    '🏠 Real Estate',
    '📣 Marketing & Advertising',
    '🛠 Engineering',
    '🛍 Retail & E-Commerce',
    '⛽️ Energy / Oil & Gas',
    '🌾 Agriculture',
    '👗 Fashion & Beauty',
    '✈️ Travel & Tourism',
    '🏋️ Sports & Wellness',
    '🔧 Other',
  ];

  const filteredIndustries = industryOptions.filter((item) =>
    item.toLowerCase().includes(industrySearch.toLowerCase())
  );



  const toggleInterest = (tag) => {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(i => i !== tag) : [...prev, tag]
    );
  };

  // const handleDateChange = (event, selectedDate) => {
  //   const currentDate = selectedDate || new Date(dob || Date.now());
  //   setShowDatePicker(false);
  //   const formattedDate = currentDate.toISOString().split('T')[0]; // "yyyy-mm-dd"
  //   setDob(formattedDate);
  // };

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
    if (!nickname) missingFields.push('Nickname');
    if (!email) missingFields.push('Email');
    if (!origin) missingFields.push('Country of Origin');
    // if (!dob) missingFields.push('Date of Birth');
    if (!fieldOfStudy) missingFields.push('Field of Study');
    if (!graduationYear) missingFields.push('Graduation Year');
    if (!currentRole) missingFields.push('Previous / Current Role');
    if (!linkedIn) missingFields.push('LinkedIn');
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
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      const payload = {
        email,
        phone,
        origin,
        bio,
        nickname,
        DOB: dob,
        dob: dob,
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

      const res = await axios.put(
        `https://three4th-street-backend.onrender.com/accounts/${userId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data?.user) {
        await updateUser(res.data.user);
        // Alert.alert('Success', 'Profile updated successfully!');
        Toast.show({
          type: 'success',
          text1: 'Profile updated!',
          text2: 'Your changes were saved.',
        });
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (error) {
      console.error('❌ Profile update failed:', error.response || error.message);
      Alert.alert('Error', 'Failed to update profile. Try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Edit Your Profile</Text>

      <Text style={styles.label}>Nickname <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="Ambassador"
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


      {/* {showOriginPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView style={{ maxHeight: 300 }}>
              {africanCountries.map((country, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => {
                    setOrigin(country);
                    setShowOriginPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{country}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowOriginPicker(false)}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )} */}

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



      {/* <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
        <Text style={{ color: dob ? '#000' : '#999' }}>
          {dob ? dob : 'Select your birth date'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dob ? new Date(dob) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )} */}




      <Text style={styles.label}>Languages Spoken</Text>
      <TextInput
        style={styles.input}
        value={languages}
        onChangeText={setLanguages}
        placeholder="English, yoruba"
      />



      <Text style={styles.label}>program of Study <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={fieldOfStudy}
        onChangeText={setFieldOfStudy}
        placeholder="ICT"
      />


      <Text style={styles.label}>Graduation Year <Text style={styles.required}>*</Text></Text>
      <TouchableOpacity onPress={() => setShowYearModal(true)} style={styles.input}>
        <Text style={{ color: graduationYear ? '#000' : '#999' }}>
          {graduationYear || 'Select your graduation year'}
        </Text>
      </TouchableOpacity>

      {showYearModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView style={{ maxHeight: 300 }}>
              {availableYears.map((year) => (
                <TouchableOpacity
                  key={year}
                  onPress={() => {
                    setGraduationYear(year);
                    setShowYearModal(false);
                  }}
                  style={styles.yearItem}
                >
                  <Text style={styles.yearText}>{year}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}





      <Text style={styles.label}>Industry</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowIndustryPicker(true)}
      >
        <Text style={{ color: industry ? '#000' : '#999' }}>
          {industry || 'Select your industry'}
        </Text>
      </TouchableOpacity>
      {showIndustryPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TextInput
              style={[styles.input, { marginBottom: 10 }]}
              placeholder="Search industry..."
              value={industrySearch}
              onChangeText={setIndustrySearch}
            />

            <ScrollView style={{ maxHeight: 300 }}>
              {filteredIndustries.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => {
                    setIndustry(option);
                    setShowIndustryPicker(false);
                    setIndustrySearch('');
                  }}
                >
                  <Text style={styles.modalOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setShowIndustryPicker(false);
                setIndustrySearch('');
              }}
              style={styles.modalCancel}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}



      <Text style={styles.label}>Previous / Current Role <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={currentRole}
        onChangeText={setCurrentRole}
        placeholder="Job title@ company name"
      />
      <Text style={styles.label}>LinkedIn Profile <Text style={styles.required}>*</Text></Text>
      <TextInput
        style={styles.input}
        value={linkedIn}
        onChangeText={setLinkedIn}
        placeholder="Consulting"
      />
      <Text style={styles.label}>Fun Fact</Text>
      <TextInput
        style={styles.input}
        value={funFact}
        onChangeText={setFunFact}
        placeholder="Consulting"
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

      <Text style={styles.label}>Upload Photos <Text style={styles.required}>*</Text></Text>
      <View style={styles.photoGrid}>
        {photos.map((uri, idx) => (
          <View key={idx} style={styles.photoWrapper}>
            <TouchableOpacity
              onPress={() => {
                if (idx !== 0) {
                  setSelectedPhotoIndex(idx);
                  setShowConfirmModal(true);
                }
              }}
            >
              <Image
                source={{ uri }}
                style={[styles.photo, idx === 0 && styles.firstPhotoBorder]}
              />
              {idx === 0 && <Text style={styles.profileLabel}>Profile Photo</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemovePhoto(idx)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 6 && (
          <TouchableOpacity onPress={pickImage} style={styles.addPhotoBtn}>
            <Text style={styles.addPhotoText}>+ Add Photo</Text>
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

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditProfileScreen;


const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', marginTop: 20, },
  header: { fontSize: 24, fontWeight: '700', color: '#581845', marginBottom: 20, marginTop: 60, },

  label: {
    marginTop: 15,
    marginBottom: 5,
    fontWeight: '600'
  },
  input: {


    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    justifyContent: 'center'
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
  }



});



