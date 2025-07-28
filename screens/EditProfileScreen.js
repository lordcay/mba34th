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
  const [nickname, setNickname] = useState([]);
  const [dob, setDob] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [fieldOfStudy, setFieldOfStudy] = useState([]);
  const [graduationYear, setGraduationYear] = useState([]);
  const [industry, setIndustry] = useState([]);
  const [currentRole, setCurrentRole] = useState([]);
  const [linkedIn, setLinkedIn] = useState([]);
  const [funFact, setFunFact] = useState([]);
  const [rship, setRship] = useState([]);
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







  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setOrigin(user.origin || '');
      setBio(user.bio || '');
      setNickname(user.nickname || '');
      setDob(user.dob || '');
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
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri || result.uri;
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('file', {
        uri: manipulated.uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      });
      formData.append('upload_preset', UPLOAD_PRESET);

      try {
        const cloudRes = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const cloudData = await cloudRes.json();
        if (cloudData.secure_url) {
          setPhotos(prev => [...prev, cloudData.secure_url]);
        }
      } catch (err) {
        console.error('Upload error:', err);
        Alert.alert('Error', 'Image upload failed.');
      }
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
  // const africanCountries = [
  //   'Nigeria', 'Kenya', 'South Africa', 'Ghana', 'Egypt', 'Ethiopia', 'Morocco', 'Uganda',
  //   'Tanzania', 'Algeria', 'Angola', 'Zimbabwe', 'Cameroon', 'Rwanda', 'Senegal', 'Zambia',
  //   'Botswana', 'Namibia', 'Sudan', 'Somalia', 'Libya', 'Tunisia', 'Ivory Coast', 'Mali',
  //   'Burkina Faso', 'Benin', 'Niger', 'Chad', 'Mozambique', 'Malawi', 'Togo', 'Sierra Leone',
  //   'Liberia', 'Congo (DRC)', 'Congo (Republic)', 'Gabon', 'Equatorial Guinea', 'Gambia',
  //   'Mauritius', 'Lesotho', 'Swaziland (Eswatini)', 'Djibouti', 'Guinea', 'Guinea-Bissau',
  //   'Eritrea', 'Comoros', 'Seychelles', 'Cape Verde', 'Central African Republic'
  // ];




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

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || new Date(dob || Date.now());
    setShowDatePicker(false);
    const formattedDate = currentDate.toISOString().split('T')[0]; // "yyyy-mm-dd"
    setDob(formattedDate);
  };

  const handleGraduationYearChange = (event, selectedDate) => {
    setShowGradYearPicker(false);

    if (event.type === 'set' && selectedDate) {
      const selectedYear = selectedDate.getFullYear();
      setGraduationYear(selectedYear.toString());
    }
  };


  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri || result.uri;
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('file', {
        uri: manipulated.uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      });
      formData.append('upload_preset', UPLOAD_PRESET);

      try {
        const cloudRes = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const cloudData = await cloudRes.json();
        if (cloudData.secure_url) {
          setPhotos(prev => [...prev, cloudData.secure_url]);
        }
      } catch (err) {
        console.error('Upload error:', err);
        Alert.alert('Error', 'Image upload failed.');
      }
    }
  };








  const handleSave = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      // Combine new and existing photos, but limit to 6
      // const mergedPhotos = [...user.photos, ...photos].slice(0, 6);

      const payload = {
        email,
        phone,
        origin,
        bio,
        nickname,
        DOB: dob,
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
        const updatedUser = res.data?.user || user;
        await updateUser(updatedUser);
        Alert.alert('Success', 'Profile updated successfully!');
        // setProfileComplete(true); // <-- Add this line

        // updateUser(res.data.user); // ✅ updates context + AsyncStorage
        navigation.replace('Home'); // ✅ prevent going back to EditProfile
        // navigation.reset({
        //   index: 0,
        //   routes: [{ name: 'Home' }], // This loads the TabNavigator (which includes 'Profile')
        // });

        // navigation.navigate('Profile');

        // navigation.goBack();
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

      <Text style={styles.label}>Nickname</Text>
      <TextInput
        style={styles.input}
        value={nickname}
        onChangeText={setNickname}
        placeholder="Ambassador"
      />
      <Text style={styles.label}>Personal Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="example@domain.com"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+1234567890"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Country of Origin</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowOriginPicker(true)}
      >
        <Text style={{ color: origin ? '#000' : '#999' }}>
          {origin || 'Select your country of origin'}
        </Text>
      </TouchableOpacity>

      {showOriginPicker && (
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
      )}




      <Text style={styles.label}>Date of Birth</Text>
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
      )}




      <Text style={styles.label}>Languages Spoken</Text>
      <TextInput
        style={styles.input}
        value={languages}
        onChangeText={setLanguages}
        placeholder="English, yoruba"
      />



      <Text style={styles.label}>Field of Study</Text>
      <TextInput
        style={styles.input}
        value={fieldOfStudy}
        onChangeText={setFieldOfStudy}
        placeholder="ICT"
      />


      <Text style={styles.label}>Graduation Year</Text>
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



      <Text style={styles.label}>Current Role or Focus</Text>
      <TextInput
        style={styles.input}
        value={currentRole}
        onChangeText={setCurrentRole}
        placeholder="Consulting"
      />
      <Text style={styles.label}>LinkedIn Profile</Text>
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






      <Text style={styles.label}>Bio / About Me</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell us about yourself..."
        multiline
        numberOfLines={5}
        maxLength={700}
      />

      <Text style={styles.label}>Interests</Text>
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

      <Text style={styles.label}>Upload Photos</Text>
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
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: '700', color: '#581845', marginBottom: 20 },

  label: {
    marginTop: 15,
    marginBottom: 5,
    fontWeight: '600'
  },
  input: {
    // borderWidth: 1,
    // borderColor: '#ccc',
    // borderRadius: 8,
    // padding: 12,
    // fontSize: 16

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
  // photo: {
  //   // width: 80,
  //   // height: 80,
  //   // borderRadius: 8,
  //   // marginRight: 10,
  //   // marginBottom: 10
  // },
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

  // removeText: {
  //   color: 'red',
  //   fontSize: 16,
  //   fontWeight: 'bold',
  // },

  // removeBtn: {
  //   position: 'absolute',
  //   top: -5,
  //   right: -5,
  //   backgroundColor: 'rgba(0,0,0,0.7)',
  //   borderRadius: 12,
  //   width: 24,
  //   height: 24,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },

  removeText: {
    color: 'red',
    fontSize: 14,
    fontWeight: 'bold',
  },




});





// import React, { useState, useContext, useEffect } from 'react';
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
// } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
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







// const EditProfileScreen = ({ navigation }) => {
//   const { user, updateUser, } = useContext(AuthContext);
//   // const navigation = useNavigation();


//   const [email, setEmail] = useState('');
//   const [phone, setPhone] = useState('');
//   const [origin, setOrigin] = useState('');
//   const [bio, setBio] = useState('');
//   const [interests, setInterests] = useState([]);
//   const [photos, setPhotos] = useState([]);
//   const [nickname, setNickname] = useState([]);
//   const [dob, setDob] = useState([]);
//   const [languages, setLanguages] = useState([]);
//   const [fieldOfStudy, setFieldOfStudy] = useState([]);
//   const [graduationYear, setGraduationYear] = useState([]);
//   const [industry, setIndustry] = useState([]);
//   const [currentRole, setCurrentRole] = useState([]);
//   const [linkedIn, setLinkedIn] = useState([]);
//   const [funFact, setFunFact] = useState([]);
//   const [rship, setRship] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   // const [showGradYearPicker, setShowGradYearPicker] = useState(false);
//   const [showYearModal, setShowYearModal] = useState(false);
//   const [availableYears, setAvailableYears] = useState([]);
//   const [showRshipPicker, setShowRshipPicker] = useState(false);
//   const [showOriginPicker, setShowOriginPicker] = useState(false);
//   const [showIndustryPicker, setShowIndustryPicker] = useState(false);
//   const [industrySearch, setIndustrySearch] = useState('');

//   const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/de2wocs21/image/upload';
//   // const CLOUDINARY_URL = 'cloudinary://742569622718158:5vorQLQ6D7p_HMnTyNuaqkKGpz0@de2wocs21'
//   const UPLOAD_PRESET = 'unsigned_upload'; // or your configured preset

//   const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
//   const [showConfirmModal, setShowConfirmModal] = useState(false);







//   useEffect(() => {
//     if (user) {
//       setEmail(user.email || '');
//       setPhone(user.phone || '');
//       setOrigin(user.origin || '');
//       setBio(user.bio || '');
//       setNickname(user.nickname || '');
//       setDob(user.dob || '');
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
//       // Note: You can load user.photos here if needed.
//     }
//   }, [user]);



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
//     'Nigeria', 'Kenya', 'South Africa', 'Ghana', 'Egypt', 'Ethiopia', 'Morocco', 'Uganda',
//     'Tanzania', 'Algeria', 'Angola', 'Zimbabwe', 'Cameroon', 'Rwanda', 'Senegal', 'Zambia',
//     'Botswana', 'Namibia', 'Sudan', 'Somalia', 'Libya', 'Tunisia', 'Ivory Coast', 'Mali',
//     'Burkina Faso', 'Benin', 'Niger', 'Chad', 'Mozambique', 'Malawi', 'Togo', 'Sierra Leone',
//     'Liberia', 'Congo (DRC)', 'Congo (Republic)', 'Gabon', 'Equatorial Guinea', 'Gambia',
//     'Mauritius', 'Lesotho', 'Swaziland (Eswatini)', 'Djibouti', 'Guinea', 'Guinea-Bissau',
//     'Eritrea', 'Comoros', 'Seychelles', 'Cape Verde', 'Central African Republic'
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

//   const handleDateChange = (event, selectedDate) => {
//     const currentDate = selectedDate || new Date(dob || Date.now());
//     setShowDatePicker(false);
//     const formattedDate = currentDate.toISOString().split('T')[0]; // "yyyy-mm-dd"
//     setDob(formattedDate);
//   };

//   const handleGraduationYearChange = (event, selectedDate) => {
//     setShowGradYearPicker(false);

//     if (event.type === 'set' && selectedDate) {
//       const selectedYear = selectedDate.getFullYear();
//       setGraduationYear(selectedYear.toString());
//     }
//   };


//   const pickImages = async () => {
//     const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (!permission.granted) {
//       alert('Permission to access media library is required!');
//       return;
//     }

//     const result = await ImagePicker.launchImageLibraryAsync({
//       allowsEditing: true,
//       quality: 1,
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//     });

//     if (!result.canceled) {
//       const uri = result.assets?.[0]?.uri || result.uri;
//       const manipulated = await ImageManipulator.manipulateAsync(
//         uri,
//         [{ resize: { width: 800 } }],
//         { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
//       );

//       const formData = new FormData();
//       formData.append('file', {
//         uri: manipulated.uri,
//         type: 'image/jpeg',
//         name: 'upload.jpg',
//       });
//       formData.append('upload_preset', UPLOAD_PRESET);

//       try {
//         const cloudRes = await fetch(CLOUDINARY_URL, {
//           method: 'POST',
//           body: formData,
//           headers: { 'Content-Type': 'multipart/form-data' },
//         });

//         const cloudData = await cloudRes.json();
//         if (cloudData.secure_url) {
//           setPhotos(prev => [...prev, cloudData.secure_url]);
//         }
//       } catch (err) {
//         console.error('Upload error:', err);
//         Alert.alert('Error', 'Image upload failed.');
//       }
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

//   const handleSave = async () => {
//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem('token');
//       const userId = await AsyncStorage.getItem('userId');

//       // Combine new and existing photos, but limit to 6
//       const mergedPhotos = [...user.photos, ...photos].slice(0, 6);

//       const payload = {
//         email,
//         phone,
//         origin,
//         bio,
//         nickname,
//         DOB: dob,
//         languages: languages.split(',').map(lang => lang.trim()),
//         graduationYear,
//         industry: industry.replace(/^[^\w]+ /, ''),
//         currentRole,
//         linkedIn,
//         funFact,
//         rship,
//         fieldOfStudy,
//         interests,
//         photos: mergedPhotos,
//       };

//       const res = await axios.put(
//         `https://three4th-street-backend.onrender.com/accounts/${userId}`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         }
//       );

//       if (res.data?.user) {
//         const updatedUser = res.data?.user || user;
//         await updateUser(updatedUser);
//         Alert.alert('Success', 'Profile updated successfully!');
//         // setProfileComplete(true); // <-- Add this line

//         // updateUser(res.data.user); // ✅ updates context + AsyncStorage
//         navigation.replace('Home'); // ✅ prevent going back to EditProfile
//         // navigation.reset({
//         //   index: 0,
//         //   routes: [{ name: 'Home' }], // This loads the TabNavigator (which includes 'Profile')
//         // });

//         // navigation.navigate('Profile');

//         // navigation.goBack();
//       }
//     } catch (error) {
//       console.error('❌ Profile update failed:', error.response || error.message);
//       Alert.alert('Error', 'Failed to update profile. Try again.');
//     } finally {
//       setLoading(false);
//     }
//   };






//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.header}>Edit Your Profile</Text>

//       <Text style={styles.label}>Nickname</Text>
//       <TextInput
//         style={styles.input}
//         value={nickname}
//         onChangeText={setNickname}
//         placeholder="Ambassador"
//       />
//       <Text style={styles.label}>Personal Email</Text>
//       <TextInput
//         style={styles.input}
//         value={email}
//         onChangeText={setEmail}
//         placeholder="example@domain.com"
//         keyboardType="email-address"
//       />

//       <Text style={styles.label}>Phone Number</Text>
//       <TextInput
//         style={styles.input}
//         value={phone}
//         onChangeText={setPhone}
//         placeholder="+1234567890"
//         keyboardType="phone-pad"
//       />

//       <Text style={styles.label}>Country of Origin</Text>
//       <TouchableOpacity
//         style={styles.input}
//         onPress={() => setShowOriginPicker(true)}
//       >
//         <Text style={{ color: origin ? '#000' : '#999' }}>
//           {origin || 'Select your country of origin'}
//         </Text>
//       </TouchableOpacity>

//       {showOriginPicker && (
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContainer}>
//             <ScrollView style={{ maxHeight: 300 }}>
//               {africanCountries.map((country, index) => (
//                 <TouchableOpacity
//                   key={index}
//                   style={styles.modalOption}
//                   onPress={() => {
//                     setOrigin(country);
//                     setShowOriginPicker(false);
//                   }}
//                 >
//                   <Text style={styles.modalOptionText}>{country}</Text>
//                 </TouchableOpacity>
//               ))}
//             </ScrollView>
//             <TouchableOpacity
//               onPress={() => setShowOriginPicker(false)}
//               style={styles.modalCancel}
//             >
//               <Text style={styles.modalCancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}




//       <Text style={styles.label}>Date of Birth</Text>
//       <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
//         <Text style={{ color: dob ? '#000' : '#999' }}>
//           {dob ? dob : 'Select your birth date'}
//         </Text>
//       </TouchableOpacity>

//       {showDatePicker && (
//         <DateTimePicker
//           value={dob ? new Date(dob) : new Date()}
//           mode="date"
//           display="default"
//           onChange={handleDateChange}
//           maximumDate={new Date()}
//         />
//       )}




//       <Text style={styles.label}>Languages Spoken</Text>
//       <TextInput
//         style={styles.input}
//         value={languages}
//         onChangeText={setLanguages}
//         placeholder="English, yoruba"
//       />



//       <Text style={styles.label}>Field of Study</Text>
//       <TextInput
//         style={styles.input}
//         value={fieldOfStudy}
//         onChangeText={setFieldOfStudy}
//         placeholder="ICT"
//       />


//       <Text style={styles.label}>Graduation Year</Text>
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





//       <Text style={styles.label}>Industry</Text>
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



//       <Text style={styles.label}>Current Role or Focus</Text>
//       <TextInput
//         style={styles.input}
//         value={currentRole}
//         onChangeText={setCurrentRole}
//         placeholder="Consulting"
//       />
//       <Text style={styles.label}>LinkedIn Profile</Text>
//       <TextInput
//         style={styles.input}
//         value={linkedIn}
//         onChangeText={setLinkedIn}
//         placeholder="Consulting"
//       />
//       <Text style={styles.label}>Fun Fact</Text>
//       <TextInput
//         style={styles.input}
//         value={funFact}
//         onChangeText={setFunFact}
//         placeholder="Consulting"
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






//       <Text style={styles.label}>Bio / About Me</Text>
//       <TextInput
//         style={[styles.input, styles.textArea]}
//         value={bio}
//         onChangeText={setBio}
//         placeholder="Tell us about yourself..."
//         multiline
//         numberOfLines={5}
//         maxLength={700}
//       />

//       <Text style={styles.label}>Interests</Text>
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

//       <Text style={styles.label}>Upload Photos</Text>
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
//           <TouchableOpacity onPress={pickImages} style={styles.addPhotoBtn}>
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
//     </ScrollView>
//   );
// };

// export default EditProfileScreen;


// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     padding: 20,
//     backgroundColor: '#fff'
//   },
//   header: {
//     fontSize: 24,
//     fontWeight: '700',
//     marginTop: 20,
//     color: '#581845'
//   },
//   label: {
//     marginTop: 15,
//     marginBottom: 5,
//     fontWeight: '600'
//   },
//   input: {
//     // borderWidth: 1,
//     // borderColor: '#ccc',
//     // borderRadius: 8,
//     // padding: 12,
//     // fontSize: 16

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
//   // photo: {
//   //   // width: 80,
//   //   // height: 80,
//   //   // borderRadius: 8,
//   //   // marginRight: 10,
//   //   // marginBottom: 10
//   // },
//   photo: {
//     width: 100,
//     height: 100,
//     borderRadius: 8,
//   },
//   photoWrapper: {
//     position: 'relative',
//     margin: 5,
//   },

//   firstPhotoBorder: {
//     borderColor: '#581845',
//     borderWidth: 2,
//   },

//   addPhotoBtn: {
//     width: 80,
//     height: 80,
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 10
//   },
//   addPhotoText: {
//     fontSize: 12,
//     color: '#555',
//     textAlign: 'center'
//   },
//   saveButton: {
//     backgroundColor: '#581845',
//     paddingVertical: 15,
//     borderRadius: 10,
//     marginTop: 10
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
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     padding: 20,
//     width: '80%'
//   },
//   yearItem: {
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderColor: '#eee'
//   },
//   yearText: {
//     fontSize: 18,
//     textAlign: 'center'
//   },
//   modalOverlay: {
//     position: 'absolute',
//     top: 0,
//     bottom: 0,
//     left: 0,
//     right: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 999,
//   },

//   modalContainer: {
//     width: '80%',
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     padding: 20,
//     elevation: 10,
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
//   modalOverlay: {
//     position: 'absolute',
//     top: 0,
//     bottom: 0,
//     left: 0,
//     right: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 999,
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

//   // removeText: {
//   //   color: 'red',
//   //   fontSize: 16,
//   //   fontWeight: 'bold',
//   // },

//   // removeBtn: {
//   //   position: 'absolute',
//   //   top: -5,
//   //   right: -5,
//   //   backgroundColor: 'rgba(0,0,0,0.7)',
//   //   borderRadius: 12,
//   //   width: 24,
//   //   height: 24,
//   //   alignItems: 'center',
//   //   justifyContent: 'center',
//   // },

//   removeText: {
//     color: 'red',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },




// });





