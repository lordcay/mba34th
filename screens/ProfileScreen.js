


import React, { useContext, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api';
import { RefreshControl } from 'react-native';
import { Linking } from 'react-native';
import { refreshAndUpdateLocation, hasLocationPermission, requestLocationPermission } from '../services/location.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../config';
import PhotoViewer from '../components/PhotoViewer';




// Timezone-safe DOB display — always shows the stored date regardless of timezone
const formatDobDisplay = (dobStr) => {
  if (!dobStr) return null;
  const dateOnly = String(dobStr).split('T')[0];
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (!y || !m || !d) return null;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
};

const ProfileScreen = () => {
  const { user, logout, updateUser, userId } = useContext(AuthContext);
  const navigation = useNavigation();
  const isAlumni = (user?.type || '').toLowerCase() === 'alumni';
  const school = isAlumni && user?.schoolGraduatedFrom
    ? user.schoolGraduatedFrom
    : (user?.email?.split('@')[1]?.split('.')[0] || 'Unknown School');
  const insets = useSafeAreaInsets();

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);





  useFocusEffect(
    useCallback(() => {
      console.log('🔁 Updated user:', user);
    }, [user])
  );

 


  const setAsProfilePhoto = async (index) => {
    if (index === 0) return; // already the profile photo

    const reordered = [...user.photos];
    const [selected] = reordered.splice(index, 1); // remove selected
    reordered.unshift(selected); // add to front

    try {
      const res = await api.put(`/accounts/${userId}`, { photos: reordered });

      if (res.data?.user) {
        updateUser(res.data.user); // refresh context
        Alert.alert('Updated', 'Profile photo changed!');
      }
    } catch (err) {
      console.error('❌ Failed to set profile photo:', err);
      Alert.alert('Error', 'Could not update profile photo.');
    }
  };


  const openLinkedIn = () => {
  const url = user.linkedIn?.trim();

  if (!url) {
    Alert.alert('No LinkedIn profile', 'You have not added a LinkedIn link yet.');
    return;
  }

  let finalUrl = url;
  if (!/^https?:\/\//i.test(url)) {
    finalUrl = 'https://' + url; // ensure it’s a proper URL
  }

  Linking.canOpenURL(finalUrl)
    .then((supported) => {
      if (supported) {
        Linking.openURL(finalUrl);
      } else {
        Alert.alert(
          'Unable to open link',
          'Please check your LinkedIn URL or open it manually.'
        );
      }
    })
    .catch((err) => console.error('Error opening LinkedIn:', err));
};



  const photoUris = (user.photos || []).map((p) =>
    p.startsWith('http') ? p : `${API_BASE_URL}${p}`
  );

  const openPhotoViewer = (index) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  return (
    <ScrollView style={styles.container} >
      <View style={[styles.topNav, { paddingTop: insets.top + 10 }]}>
        {navigation.canGoBack() ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#581845" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <Text style={styles.topNavTitle}>Profile</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>
      {/* Profile Picture Section */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => { if (photoUris.length > 0) openPhotoViewer(0); }}
        >
          <Image
            source={{
              uri: photoUris.length > 0 ? photoUris[0] : 'https://via.placeholder.com/150',
            }}
            style={styles.profilePic}
            fadeDuration={300}
          />
        </TouchableOpacity>
        <Text style={styles.fullName}>
          {user.firstName} {user.lastName}
        </Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Photo Gallery */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gallery</Text>
        {user.photos && user.photos.length > 0 ? (
          <FlatList
            data={user.photos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.galleryList}

            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => openPhotoViewer(index)}
                onLongPress={() => {
                  if (index !== 0) {
                    setSelectedPhotoIndex(index);
                    setShowConfirmModal(true);
                  }
                }}
                style={{ alignItems: 'center', marginRight: 12 }}
              >
                <Image
                  source={{ uri: photoUris[index] }}
                  style={[
                    styles.galleryImage,
                    index === 0 && styles.profileHighlight,
                  ]}
                />
                {index === 0 && (
                  <Text style={styles.profilePhotoLabel}>Profile Photo</Text>
                )}
              </TouchableOpacity>


            )}


          />



        ) : (
          <Text style={styles.placeholderText}>No photos uploaded yet.</Text>
        )}

        {showConfirmModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalText}>
                Set this photo as your profile picture?
              </Text>
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

      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <InfoRow label="Nickname" value={user.nickname} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Phone Number" value={user.phone} />
        <InfoRow label="Gender" value={user.gender} />
        <InfoRow label="Date of Birth" value={formatDobDisplay(user.DOB) || 'N/A'} />
        <InfoRow label="Languages Spoken" value={parseLanguages(user.languages)} />
        <InfoRow label="Origin" value={user.origin} />

      </View>

      {/* 📍 Location Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TouchableOpacity 
            onPress={async () => {
              try {
                const hasPermission = await hasLocationPermission();
                if (!hasPermission) {
                  const granted = await requestLocationPermission();
                  if (!granted) {
                    Alert.alert(
                      'Location Permission',
                      'Please enable location permissions in your device settings to update your location.'
                    );
                    return;
                  }
                }
                const result = await refreshAndUpdateLocation();
                if (result) {
                  updateUser(result);
                  Alert.alert('Success', 'Your location has been updated!');
                }
              } catch (err) {
                Alert.alert('Error', 'Failed to update location. Please try again.');
              }
            }}
            style={styles.updateLocationBtn}
          >
            <Ionicons name="refresh" size={16} color="#581845" />
            <Text style={styles.updateLocationText}>Update</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.locationCard}>
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={24} color="#581845" />
          </View>
          <View style={styles.locationDetails}>
            <Text style={styles.locationCityText}>
              {user?.currentCity || 'Location not set'}
            </Text>
            {user?.locationUpdatedAt && (
              <Text style={styles.locationUpdatedText}>
                Updated {moment(user.locationUpdatedAt).fromNow()}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Academic Info */}
      <View style={styles.section}>

        <Text style={styles.sectionTitle}>Academic Details</Text>
        <View style={styles.infoRowWrap}>
          <Text style={styles.infoLabel}>{isAlumni ? 'Alumni School' : 'University'}</Text>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <Text style={styles.infoValue}>{school.toUpperCase()}</Text>
            {isAlumni && (
              <View style={{ backgroundColor: '#581845', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>ALUMNI</Text>
              </View>
            )}
          </View>
        </View>
        <InfoRow label="Degree / Field of Study" value={user?.fieldOfStudy || 'N/A'} />
        {!isAlumni && <InfoRow label=" Program of Study" value={user?.type || 'N/A'} />}
        {!isAlumni && <InfoRow label="Graduation Year" value={user?.graduationYear || 'N/A'} />}
        <View style={styles.infoRowWrap}>
  <Text style={styles.infoLabel}>LinkedIn</Text>
  {user.linkedIn ? (
    <TouchableOpacity onPress={openLinkedIn} style={{ flex: 1 }}>
      <Text style={styles.linkText} numberOfLines={0}>
        {user.linkedIn}
      </Text>
    </TouchableOpacity>
  ) : (
    <Text style={styles.infoValue}>Not provided</Text>
  )}
</View>

      </View>

     

      {/* Bio & Interests */}
      <View style={styles.section}>

        
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.sectionContent}>{user.bio || 'No bio available.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        {user.interests && user.interests.length > 0 ? (
          <View style={styles.interestsContainer}>
            {user.interests.map((interest, index) => (
              <View key={index} style={styles.interestPill}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.placeholderText}>No interests added yet.</Text>
        )}
      </View>

      {/* Other Info */}
      <View style={styles.section}>
        <InfoRow label="Fun Fact" value={user.funFact} />
        <InfoRow label="Relationship Status" value={user.rship} />
        <InfoRow label="Joined" value={moment(user.created).format('LL')} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <PhotoViewer
        visible={viewerVisible}
        photos={photoUris}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </ScrollView>
  );
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const parseLanguages = (languages) => {
  try {
    if (Array.isArray(languages)) return languages.join(', ');
    if (typeof languages === 'string') return JSON.parse(languages).join(', ');
    return 'N/A';
  } catch (error) {
    return 'N/A';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  topNavTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: '25%',
    paddingVertical: 30,
    backgroundColor: '#f1f3f6',
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#581845',
  },
  fullName: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 12,
    color: '#333',
  },
  editBtn: {
    marginTop: 10,
    backgroundColor: '#581845',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#222',
  },
  sectionContent: {
    fontSize: 14,
    color: '#555',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#666',
    fontSize: 14,
    flex: 1,
  },
  infoValue: {
    color: '#222',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  galleryList: {
    paddingVertical: 10,
  },
  galleryImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  interestPill: {
    backgroundColor: '#581845',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    color: '#fff',
    fontSize: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  logoutBtn: {
    backgroundColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    margin: 20,
    alignItems: 'center',
  },
  logoutText: {
    fontWeight: '600',
    color: '#000',
  },
  profilePhotoLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#581845',
    fontWeight: '600',
  },

  profileHighlight: {
    borderWidth: 2,
    borderColor: '#581845',
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
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#581845',
    borderRadius: 8,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
linkText: {
  color: '#581845',
  textDecorationLine: 'underline',
  fontWeight: '600',
  textAlign: 'right',
},

infoRowWrap: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 10,
},

infoLabel: {
  color: '#666',
  fontSize: 14,
  flexShrink: 0,
  width: '35%', // keeps the label width fixed and aligned
},

linkText: {
  flex: 1,
  color: '#581845',
  textDecorationLine: 'underline',
  fontWeight: '600',
  textAlign: 'right',
  flexWrap: 'wrap', // ensures long text wraps
  lineHeight: 18,
},

// 📍 Location Section Styles
sectionHeaderRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
updateLocationBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f7eef5',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  gap: 4,
},
updateLocationText: {
  fontSize: 13,
  color: '#581845',
  fontWeight: '600',
},
locationCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#faf5f9',
  borderRadius: 12,
  padding: 14,
},
locationIconContainer: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: '#f0e7ef',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 14,
},
locationDetails: {
  flex: 1,
},
locationCityText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#333',
},
locationUpdatedText: {
  fontSize: 12,
  color: '#888',
  marginTop: 4,
},

});

export default ProfileScreen;
