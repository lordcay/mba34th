

// import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   Dimensions,
//   TouchableOpacity,
//   SafeAreaView,
//   Image,
//   FlatList,
//   Animated,
// } from 'react-native';
// import { AuthContext } from '../context/AuthContext';
// import api from '../services/api';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import Feather from 'react-native-vector-icons/Feather';
// import { useNavigation, useFocusEffect } from '@react-navigation/native';

// const { width: SCREEN_WIDTH, height } = Dimensions.get('window');
// const CARD_MARGIN_H = 20;
// const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
// const IMAGE_HEIGHT = height * 0.45;

// const FallbackImage = require('../assets/fff.jpg');

// const HomeScreen = () => {
//   const { user } = useContext(AuthContext);
//   const [verifiedUsers, setVerifiedUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const navigation = useNavigation();

//   const fetchVerifiedUsers = async () => {
//     setLoading(true);
//     try {
//       const response = await api.get('/accounts/verified');
//       const filtered = response.data.filter(u => u.id !== user.id);
//       setVerifiedUsers(filtered);
//       setError('');
//     } catch (err) {
//       setError('Failed to fetch users');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useFocusEffect(useCallback(() => { fetchVerifiedUsers(); }, []));

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#581845" />
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={styles.center}>
//         <Text style={styles.error}>{error}</Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <Text style={styles.heading}>Meet Verified Members</Text>

//       <FlatList
//         data={verifiedUsers}
//         keyExtractor={item => String(item.id)}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.scrollContainer}
//         renderItem={({ item }) => <UserCard u={item} navigation={navigation} />}
//       />
//     </SafeAreaView>
//   );
// };

// const UserCard = ({ u, navigation }) => {
//   const photos = (u.photos && u.photos.length > 0) ? u.photos : [null];
//   const scrollX = useRef(new Animated.Value(0)).current;

//   const renderSlide = ({ item: photo }) => {
//     const uri = photo
//       ? (photo.startsWith('http') ? photo : `http://192.168.0.169:4000${photo}`)
//       : null;

//     return (
//       <Image
//         source={uri ? { uri } : FallbackImage}
//         style={styles.image}
//         resizeMode="cover"
//       />
//     );
//   };

//   return (
//     <View style={styles.cardContainer}>
//       {/* Image carousel */}
//       <Animated.FlatList
//         data={photos}
//         keyExtractor={(_, idx) => String(idx)}
//         renderItem={renderSlide}
//         horizontal
//         pagingEnabled
//         snapToInterval={CARD_WIDTH}
//         snapToAlignment="start"
//         decelerationRate="fast"
//         disableIntervalMomentum
//         showsHorizontalScrollIndicator={false}
//         bounces={false}
//         nestedScrollEnabled
//         onScroll={Animated.event(
//           [{ nativeEvent: { contentOffset: { x: scrollX } } }],
//           { useNativeDriver: false }
//         )}
//         scrollEventThrottle={16}
//         getItemLayout={(_, index) => ({
//           length: CARD_WIDTH,
//           offset: CARD_WIDTH * index,
//           index,
//         })}
//       />

//       {/* Dots */}
//       {photos.length > 1 && (
//         <View style={styles.dotsContainer}>
//           {photos.map((_, i) => {
//             const inputRange = [
//               (i - 1) * CARD_WIDTH,
//               i * CARD_WIDTH,
//               (i + 1) * CARD_WIDTH,
//             ];
//             const opacity = scrollX.interpolate({
//               inputRange,
//               outputRange: [0.3, 1, 0.3],
//               extrapolate: 'clamp',
//             });
//             const scale = scrollX.interpolate({
//               inputRange,
//               outputRange: [0.8, 1.2, 0.8],
//               extrapolate: 'clamp',
//             });
//             return (
//               <Animated.View
//                 key={i}
//                 style={[styles.dot, { opacity, transform: [{ scale }] }]}
//               />
//             );
//           })}
//         </View>
//       )}

//       {/* Action Buttons */}
//       <View style={styles.buttonsRow}>
//         <TouchableOpacity
//           style={[styles.iconButton]}
//           onPress={() => navigation.navigate('UserProfile', { user: u })}
//         >
//           <Feather name="info" size={22} color="#581845" />
//           <Text style={{ marginLeft: 8, color: '#581845', fontWeight: '600' }}>Profile</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[styles.iconButton, { backgroundColor: '#fff0f5', borderWidth: 1, borderColor: '#581845' }]}
//           onPress={() => navigation.navigate('PrivateChat', { user: u })}
//         >
//           <Ionicons name="chatbubble-ellipses" size={22} color="#581845" />
//           <Text style={{ marginLeft: 8, color: '#581845', fontWeight: '600' }}>Message</Text>
//         </TouchableOpacity>
//       </View>

//       {/* User Info */}
//       <View style={styles.infoBox}>
//         <Text style={styles.name}>
//           {u.firstName} {u.lastName}{' '}
//           <Text style={styles.extraInfo}>({u.gender}, {u.origin})</Text>
//         </Text>

//         <Text style={styles.schName}>
//           {u.email
//             ?.split('@')[1]
//             ?.split('.')[0]
//             ?.replace(/-/g, ' ')
//             ?.replace(/\b\w/g, c => c.toUpperCase())}{' '}
//           ({u.type} '{String(u.graduationYear).slice(-2)}) • {u.industry}
//         </Text>

//         {!!u.bio && (
//           <>
//             <Text style={styles.sectionTitle}>About me</Text>
//             <Text style={styles.sectionText}>{u.bio}</Text>
//           </>
//         )}

//         {!!u.fieldOfStudy && (
//           <>
//             <Text style={styles.sectionTitle}>Current / Previous Role</Text>
//             <Text style={styles.sectionText}>{u.fieldOfStudy}</Text>
//           </>
//         )}

//         {u.interests && u.interests.length > 0 && (
//           <>
//             <Text style={styles.sectionTitle}>Interests</Text>
//             <Text style={styles.interestList}>{u.interests.join(' • ')}</Text>
//           </>
//         )}

//         {!!u.location && (
//           <Text style={styles.location}>
//             <Ionicons name="location-sharp" size={16} color="#581845" /> {u.location}
//           </Text>
//         )}
//       </View>
//     </View>
//   );
// };

// export default HomeScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   heading: {
//     fontSize: 24, fontWeight: '700', color: '#581845',
//     textAlign: 'center', marginVertical: 16,
//   },
//   scrollContainer: { paddingBottom: 30 },

//   cardContainer: {
//     marginBottom: 30,
//     borderRadius: 20,
//     overflow: 'hidden',
//     marginHorizontal: CARD_MARGIN_H,
//     backgroundColor: '#fefefe',
//     elevation: 4,
//     shadowColor: '#000',
//     shadowOpacity: 0.12,
//     shadowRadius: 8,
//   },

//   // carousel viewport is CARD_WIDTH wide
//   image: {
//     width: CARD_WIDTH,
//     height: IMAGE_HEIGHT,
//   },

//   infoBox: { padding: 5 },
//   name: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 6 },
//   schName: { fontSize: 16, color: '#444', marginBottom: 10 },
//   sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 4 },
//   sectionText: { fontSize: 14, color: '#555', lineHeight: 20 },
//   interestList: { fontSize: 14, color: '#555', marginTop: 4 },
//   location: { fontSize: 14, color: '#555', marginTop: 10 },
//   extraInfo: { fontSize: 14, fontWeight: '400', color: '#777' },

//   buttonsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderColor: '#f0f0f0',
//     borderBottomLeftRadius: 16,
//     borderBottomRightRadius: 16,
//     gap: 15,
//   },
//   iconButton: {
//     flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
//     backgroundColor: '#f9f9f9', paddingVertical: 12, borderRadius: 14,
//     elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1, shadowRadius: 3,
//   },

//   error: { fontSize: 14, color: 'red', textAlign: 'center' },

//   dotsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 10,
//     marginBottom: 10,
//   },
//   dot: {
//     width: 8, height: 8, borderRadius: 4, backgroundColor: '#581845', marginHorizontal: 5,
//   },
// });


import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height } = Dimensions.get('window');
const CARD_MARGIN_H = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
const IMAGE_HEIGHT = height * 0.45;

const FallbackImage = require('../assets/fff.jpg');

const HomeScreen = () => {
  const { user } = useContext(AuthContext);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const fetchVerifiedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/accounts/verified');
      const filtered = response.data.filter((u) => u.id !== user.id);
      setVerifiedUsers(filtered);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchVerifiedUsers(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#581845" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  // Lift content below status bar on Android (accounts for devices without cutouts)
  const androidTopPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']} // bottom can scroll under; header honors top inset
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            //  paddingTop: Math.max(insets.top, androidTopPad) + (Platform.OS === 'android' ? 6 : 2),
      paddingBottom: 4, // was 8

            // paddingTop: Math.max(insets.top, androidTopPad) + (Platform.OS === 'android' ? 12 : 4),
          },
        ]}
      >
        <Text style={styles.heading}>Meet Verified Members</Text>
      </View>

      <FlatList
        data={verifiedUsers}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: insets.bottom + 20 },
        ]}
        renderItem={({ item }) => <UserCard u={item} navigation={navigation} />}
      />
    </SafeAreaView>
  );
};

const UserCard = ({ u, navigation }) => {
  const photos = u.photos && u.photos.length > 0 ? u.photos : [null];
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderSlide = ({ item: photo }) => {
    const uri = photo
      ? (photo.startsWith('http') ? photo : `http://192.168.0.169:4000${photo}`)
      : null;

    return (
      <Image
        source={uri ? { uri } : FallbackImage}
        style={styles.image}
        resizeMode="cover"
      />
    );
  };

  return (
    <View style={styles.cardContainer}>
      {/* Image carousel */}
      <Animated.FlatList
        data={photos}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        snapToInterval={CARD_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        bounces={false}
        nestedScrollEnabled
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH,
          offset: CARD_WIDTH * index,
          index,
        })}
      />

      {/* Dots */}
      {photos.length > 1 && (
        <View style={styles.dotsContainer}>
          {photos.map((_, i) => {
            const inputRange = [
              (i - 1) * CARD_WIDTH,
              i * CARD_WIDTH,
              (i + 1) * CARD_WIDTH,
            ];
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.8, 1.2, 0.8],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { opacity, transform: [{ scale }] }]}
              />
            );
          })}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.iconButton]}
          onPress={() => navigation.navigate('UserProfile', { user: u })}
        >
          <Feather name="info" size={22} color="#581845" />
          <Text style={styles.actionText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, styles.primaryOutline]}
          onPress={() => navigation.navigate('PrivateChat', { user: u })}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color="#581845" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.infoBox}>
        <Text style={styles.name}>
          {u.firstName} {u.lastName}{' '}
          <Text style={styles.extraInfo}>({u.gender}, {u.origin})</Text>
        </Text>

        <Text style={styles.schName}>
          {u.email
            ?.split('@')[1]
            ?.split('.')[0]
            ?.replace(/-/g, ' ')
            ?.replace(/\b\w/g, (c) => c.toUpperCase())}{' '}
          ({u.type} '{String(u.graduationYear).slice(-2)}) • {u.industry}
        </Text>

        {!!u.bio && (
          <>
            <Text style={styles.sectionTitle}>About me</Text>
            <Text style={styles.sectionText}>{u.bio}</Text>
          </>
        )}

        {!!u.fieldOfStudy && (
          <>
            <Text style={styles.sectionTitle}>Current / Previous Role</Text>
            <Text style={styles.sectionText}>{u.fieldOfStudy}</Text>
          </>
        )}

        {u.interests && u.interests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Interests</Text>
            <Text style={styles.interestList}>{u.interests.join(' • ')}</Text>
          </>
        )}

        {!!u.location && (
          <Text style={styles.location}>
            <Ionicons name="location-sharp" size={16} color="#581845" /> {u.location}
          </Text>
        )}
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    marginTop:10,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#581845',
    textAlign: 'center',
  },

  scrollContainer: { paddingBottom: 30 },

  cardContainer: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: CARD_MARGIN_H,
    backgroundColor: '#fefefe',
    elevation: 4, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  image: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
  },

  // --- Buttons row ---
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 14 : 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    gap: 15,
  },
  iconButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  primaryOutline: {
    backgroundColor: '#fff0f5',
    borderWidth: 1,
    borderColor: '#581845',
  },
  actionText: { marginLeft: 8, color: '#581845', fontWeight: '600' },

  // --- Info block (extra Android padding/line-height) ---
  infoBox: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 14 : 10,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 6 },
  extraInfo: { fontSize: 14, fontWeight: '400', color: '#777' },
  schName: { fontSize: 16, color: '#444', marginBottom: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  interestList: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  location: { fontSize: 14, color: '#555', marginTop: 10 },

  error: { fontSize: 14, color: 'red', textAlign: 'center' },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#581845',
    marginHorizontal: 5,
  },
});
