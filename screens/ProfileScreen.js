


import React, { useContext, useCallback, useState } from 'react';
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
import { AuthContext } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { RefreshControl } from 'react-native';



const ProfileScreen = () => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const navigation = useNavigation();
  const school = user?.email?.split('@')[1]?.split('.')[0] || 'Unknown School';

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);




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
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      const res = await axios.put(
        `https://three4th-street-backend.onrender.com/accounts/${userId}`,
        { photos: reordered },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data?.user) {
        updateUser(res.data.user); // refresh context
        Alert.alert('Updated', 'Profile photo changed!');
      }
    } catch (err) {
      console.error('❌ Failed to set profile photo:', err);
      Alert.alert('Error', 'Could not update profile photo.');
    }
  };


  return (
    <ScrollView style={styles.container} >
      {/* Profile Picture Section */}
      <View style={styles.profileHeader}>
        <Image
          source={{
            uri:
              user.photos && user.photos.length > 0
                ? user.photos[0].startsWith('http')
                  ? user.photos[0]
                  : `https://three4th-street-backend.onrender.com${user.photos[0]}`
                : 'https://via.placeholder.com/150',
          }}
          style={styles.profilePic}
          fadeDuration={300}

        />
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
                onPress={() => {
                  if (index !== 0) {
                    setSelectedPhotoIndex(index);
                    setShowConfirmModal(true);
                  }
                }}
                style={{ alignItems: 'center', marginRight: 12 }}
              >
                <Image
                  source={{
                    uri: item.startsWith('http')
                      ? item
                      : `https://three4th-street-backend.onrender.com${item}`,
                  }}
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
        <InfoRow label="Date of Birth" value={user.DOB?.slice(0, 10) || 'N/A'} />
        <InfoRow label="Languages Spoken" value={parseLanguages(user.languages)} />
        <InfoRow label="Origin" value={user.origin} />

      </View>

      {/* Academic Info */}
      <View style={styles.section}>

        <Text style={styles.sectionTitle}>Academic Details</Text>
        <InfoRow label="University" value={school} />
        <InfoRow label="Program of Study" value={user.fieldOfStudy} />
        <InfoRow label="Field of Study" value={user.type} />
        <InfoRow label="Graduation Year" value={user.graduationYear} />
      </View>

      {/* Professional Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Information</Text>
        <InfoRow label="Industry" value={user.industry} />
        <InfoRow label="Current Role" value={user.currentRole} />
        <InfoRow label="LinkedIn" value={user.linkedIn} />
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


});

export default ProfileScreen;
