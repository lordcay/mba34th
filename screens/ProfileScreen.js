


// import React, { useContext } from 'react';
// import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
// import { AuthContext } from '../context/AuthContext';
// import { useNavigation } from '@react-navigation/native';
// import moment from 'moment';
// import { useFocusEffect } from '@react-navigation/native';
// import { useCallback } from 'react';


// const ProfileScreen = () => {
//   const { user, logout } = useContext(AuthContext);
//   const navigation = useNavigation();

//   const school = user?.email?.split('@')[1]?.split('.')[0] || 'Unknown School';



//   useFocusEffect(
//     useCallback(() => {
//       console.log("🔁 Updated user:", user);
//     }, [user])
//   );




//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.header}>





//         <View style={styles.section}>
//           <Text style={styles.names}>Photos</Text>

//           {user.photos && user.photos.length > 0 ? (

//             <>
//               <View style={styles.photoGrid}>
//                 {user.photos.map((photo, index) => (
//                   <Image
//                     key={index}
//                     source={{ uri: photo.startsWith('http') ? photo : `http://192.168.0.169:4000${photo}` }}
//                     style={[styles.photo, index === 0 && styles.profilePhoto]}
//                   />
//                 ))}
//               </View>
//             </>

//           ) : (

//             <Text style={styles.sectionContent}>No photos uploaded yet.</Text>

//           )}

//         </View>


//         <TouchableOpacity
//           style={styles.editBtn}
//           onPress={() => navigation.navigate('EditProfile')}
//         >
//           <Text style={styles.editBtnText}>Edit</Text>
//         </TouchableOpacity>
//       </View>




//       <View style={styles.section}>
//         <Text style={styles.names}>BASIC INFO</Text>

//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Full Name</Text>
//           <Text style={styles.nameValue}>{user.firstName} {user.lastName}</Text>
//         </View>


//       </View>

//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Nickname</Text>
//           <Text style={styles.nameValue}>{user.nickname}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Email</Text>
//           <Text style={styles.email}>{user.email}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Phone Number</Text>
//           <Text style={styles.nameValue}>{user.phone}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Gender</Text>
//           <Text style={styles.nameValue}>{user.gender}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Date of Birth</Text>
//           <Text style={styles.nameValue}>{user.DOB ? user.DOB.slice(0, 10) : 'N/A'} </Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Languages Spoken</Text>
//           <Text style={styles.nameValue}>
//             {(() => {
//               try {
//                 let languages = [];

//                 // Check if already array
//                 if (Array.isArray(user.languages)) {
//                   languages = user.languages;
//                 }
//                 // If it's a stringified array
//                 else if (typeof user.languages === 'string') {
//                   languages = JSON.parse(user.languages);
//                 }

//                 // Join to plain comma-separated string if not empty
//                 return languages.length > 0 ? languages.join(', ') : 'N/A';
//               } catch (error) {
//                 console.error('Failed to parse languages:', error);
//                 return 'N/A';
//               }
//             })()}
//           </Text>
//         </View>
//       </View>


//       {/* <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Languages Spoken</Text>
//           <Text style={styles.nameValue}>{user.languages}</Text>
//         </View>
//       </View> */}


//       <View style={styles.section}>
//         <Text style={styles.names}>ACADEMIC DETAILS</Text>
//       </View>

//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>University</Text>
//           <Text style={styles.nameValue}>{school}</Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Program of Study</Text>
//           <Text style={styles.nameValue}>{user.fieldOfStudy}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Field of Study</Text>
//           <Text style={styles.nameValue}>{user.type}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Graduation Year</Text>
//           <Text style={styles.nameValue}>{user.graduationYear}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <Text style={styles.names}>PROFESSIONAL INFO</Text>
//       </View>

//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Industry</Text>
//           <Text style={styles.nameValue}>{user.industry}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Current Role / Focus</Text>
//           <Text style={styles.nameValue}>{user.currentRole}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>LinkenIn Profile</Text>
//           <Text style={styles.nameValue}>{user.linkedIn}</Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.names}>SOCIAL & PERSONALITY</Text>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Bio</Text>
//         <Text style={styles.sectionContent}>{user.bio || 'No bio available yet.'}</Text>
//       </View>

//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Fun Fact</Text>
//           <Text style={styles.nameValue}>{user.funFact}</Text>
//         </View>
//       </View>
//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Relationship Status</Text>
//           <Text style={styles.nameValue}>{user.rship}</Text>
//         </View>
//       </View>

//       <View style={styles.section}>
//         <Text style={styles.sectionTitle}>Interests</Text>
//         {user.interests && user.interests.length > 0 ? (
//           <View style={styles.interestsWrapper}>
//             {user.interests.map((interest, i) => (
//               <View key={i} style={styles.interestTag}>
//                 <Text style={styles.interestText}>{interest}</Text>
//               </View>
//             ))}
//           </View>
//         ) : (
//           <Text style={styles.sectionContent}>No interests added yet.</Text>
//         )}
//       </View>



//       <View style={styles.section}>
//         <View style={styles.rowContainer}>
//           <Text style={styles.nameLabel}>Joined</Text>
//           <Text style={styles.date}>Joined {moment(user.created).format('LL')}</Text>
//         </View>


//       </View>



//       {/* <Text style={styles.school}>{school}</Text> */}


//       <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
//         <Text style={styles.logoutText}>Logout</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: '#fff',
//     flex: 1,
//     marginTop: '30%',

//   },
//   header: {
//     alignItems: 'center',
//     paddingVertical: 30,
//     backgroundColor: '#f7f7f7',
//   },
//   photoWrapper: {
//     position: 'relative',
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginTop: 20,
//     // marginBottom: 15,
//   },
//   // photo: {
//   //   width: 120,
//   //   height: 120,
//   //   borderRadius: 60,
//   //   borderWidth: 2,
//   //   borderColor: '#ccc',
//   // },
//   interestsWrapper: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//   },
//   interestTag: {
//     backgroundColor: '#581845',
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//     borderRadius: 15,
//     marginRight: 8,
//     marginBottom: 8,
//   },
//   interestText: {
//     color: '#fff',
//     fontSize: 12,
//   },

//   avatar: {
//     width: 100,
//     height: 100,
//     borderRadius: 50,
//     marginTop: 40,
//     marginBottom: 10,
//   },
//   name: {
//     fontSize: 22,
//     // fontWeight: 'bold',
//     color: '#000',
//     // padding: 40,
//   },
//   names: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#000',
//     marginBottom: 10,
//   },
//   school: {
//     fontSize: 14,
//     color: '#777',
//   },
//   email: {
//     fontSize: 14,
//     color: '#555',
//   },
//   date: {
//     fontSize: 12,
//     color: '#aaa',
//     marginTop: 5,
//   },
//   section: {
//     marginLeft: 40,
//     marginRight: 50,
//     padding: 5,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',

//   },
//   sectionTitle: {
//     fontSize: 16,
//     // fontWeight: 'bold',
//     marginBottom: 8,

//   },
//   sectionContent: {
//     fontSize: 14,
//     color: '#555',
//   },
//   editBtn: {
//     alignSelf: 'flex-end',
//     marginTop: 10,
//     paddingHorizontal: 16,
//     paddingVertical: 6,
//     backgroundColor: '#eee',
//     borderRadius: 16,
//     marginRight: 10,
//     // marginTop: -45,
//     // marginLeft: "20%",
//     // paddingHorizontal: 20,
//     // paddingVertical: 10,
//     // backgroundColor: '#eee',
//     // borderRadius: 20,
//   },
//   editBtnText: {
//     color: '#000',
//     fontWeight: 'bold',
//     fontSize: 18,
//   },
//   logoutBtn: {
//     margin: 20,
//     padding: 15,
//     backgroundColor: '#ddd',
//     borderRadius: 10,
//     alignItems: 'center',
//   },
//   logoutText: {
//     color: '#000',
//     fontWeight: 'bold',
//   },
//   rowContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 5,
//   },
//   nameLabel: {
//     fontSize: 16,
//     color: '#555',
//     fontWeight: '500',
//   },
//   // nameValue: {
//   //   fontSize: 18,
//   //   color: '#000',
//   //   fontWeight: '400',
//   // },
//   nameValue: {
//     fontSize: 16,
//     color: '#333',
//     flexShrink: 1,
//     flexWrap: 'wrap',
//     paddingTop: 5,
//   },
//   pillContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 6, // You can use `marginRight` & `marginBottom` if `gap` isn’t supported
//     marginTop: 4,
//   },

//   pill: {
//     backgroundColor: '#e0f0ff',
//     borderRadius: 20,
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     marginRight: 6,
//     marginBottom: 6,
//   },

//   pillText: {
//     fontSize: 14,
//     color: '#581845',
//     fontWeight: '500',
//   },

//   photoGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'center',
//     gap: 10,
//     marginTop: 10,
//     marginBottom: 20,
//   },

//   photo: {
//     width: 100,
//     height: 100,
//     borderRadius: 8,
//     margin: 5,
//   },

//   profilePhoto: {
//     borderWidth: 2,
//     borderColor: '#581845',
//   },

//   photoScroll: {
//     marginTop: 10,
//     marginBottom: 0, // 🧽 reduce space below photos
//     paddingBottom: 0,
//   },
//   photoItem: {
//     alignItems: 'center',
//     marginRight: 15,
//   },





// });

// export default ProfileScreen;



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
        `http://192.168.0.169:4000/accounts/${userId}`,
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
                  : `http://192.168.0.169:4000${user.photos[0]}`
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
                      : `http://192.168.0.169:4000${item}`,
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

              // <TouchableOpacity
              //   onPress={() => setAsProfilePhoto(index)}
              //   style={{ alignItems: 'center', marginRight: 12 }}
              // >
              //   <Image
              //     source={{
              //       uri: item.startsWith('http')
              //         ? item
              //         : `http://192.168.0.169:4000${item}`,
              //     }}
              //     style={[
              //       styles.galleryImage,
              //       index === 0 && styles.profileHighlight,
              //     ]}
              //   />
              //   {index === 0 && (
              //     <Text style={styles.profilePhotoLabel}>Profile Photo</Text>
              //   )}
              // </TouchableOpacity>
            )}

          // renderItem={({ item, index }) => (
          //   <View style={{ alignItems: 'center', marginRight: 12 }}>
          //     <Image
          //       source={{
          //         uri: item.startsWith('http')
          //           ? item
          //           : `http://192.168.0.169:4000${item}`,
          //       }}
          //       style={styles.galleryImage}
          //     />
          //     {index === 0 && (
          //       <Text style={styles.profilePhotoLabel}>Profile Photo</Text>
          //     )}
          //   </View>
          // )}

          // renderItem={({ item }) => (
          //   <Image
          //     source={{
          //       uri: item.startsWith('http')
          //         ? item
          //         : `http://192.168.0.169:4000${item}`,
          //     }}
          //     style={styles.galleryImage}
          //   />
          // )}
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
    marginTop: '10%',
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
