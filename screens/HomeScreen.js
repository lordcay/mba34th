


import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  FlatList,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Animated } from 'react-native';


const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const { user } = useContext(AuthContext);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = new Animated.Value(0);



  const fetchVerifiedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/accounts/verified');
      const filtered = response.data.filter(u => u.id !== user.id);
      setVerifiedUsers(filtered);
      setError('');
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVerifiedUsers();
    }, [])
  );

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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Meet Verified Students</Text>

      <FlatList
        data={verifiedUsers}
        keyExtractor={item => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}

        renderItem={({ item: u }) => (


          <View style={styles.cardContainer}>
            {/* Image Gallery */}
            <Animated.ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              style={styles.imageScroll}
            >
              {u.photos && u.photos.length > 0 ? (
                u.photos.map((photo, idx) => (
                  <Image
                    key={idx}
                    source={{
                      uri: photo.startsWith('http')
                        ? photo
                        : `http://192.168.0.169:4000${photo}`,
                    }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ))
              ) : (
                <Image
                  source={require('../assets/fff.jpg')}
                  style={styles.image}
                  resizeMode="cover"
                />
              )}
            </Animated.ScrollView>



            <View style={styles.dotsContainer}>
              {u.photos && u.photos.length > 1 &&
                u.photos.map((_, i) => {
                  const inputRange = [
                    (i - 1) * width,
                    i * width,
                    (i + 1) * width
                  ];

                  const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });

                  const dotScale = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.8, 1.2, 0.8],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          opacity: dotOpacity,
                          transform: [{ scale: dotScale }],
                        },
                      ]}
                    />
                  );
                })}
            </View>



            {/* Action Buttons directly under image */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.iconButton]}
                onPress={() => navigation.navigate('UserProfile', { user: u })}
              >
                <Feather name="info" size={22} color="#581845" />
                <Text style={{ marginLeft: 8, color: '#581845', fontWeight: '600' }}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: '#fff0f5', borderWidth: 1, borderColor: '#581845' }]}
                onPress={() => navigation.navigate('PrivateChat', { user: u })}
              >
                <Ionicons name="chatbubble-ellipses" size={22} color="#581845" />
                <Text style={{ marginLeft: 8, color: '#581845', fontWeight: '600' }}>Message</Text>
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
                  ?.replace(/\b\w/g, c => c.toUpperCase())}{' '}
                ({u.type} '{String(u.graduationYear).slice(-2)}) • {u.industry}
              </Text>

              {u.bio && (
                <>
                  <Text style={styles.sectionTitle}>About me</Text>
                  <Text style={styles.sectionText}>{u.bio}</Text>
                </>
              )}

              {u.fieldOfStudy && (
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

              {u.location && (
                <Text style={styles.location}>
                  <Ionicons name="location-sharp" size={16} color="#581845" /> {u.location}
                </Text>
              )}
            </View>
          </View>
        )}



      />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#581845',
    textAlign: 'center',
    marginVertical: 16,
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  cardContainer: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
    backgroundColor: '#fefefe',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  imageScroll: {
    backgroundColor: '#eee',
  },
  image: {
    width: width,
    height: height * 0.45,
  },
  infoBox: {
    padding: 5,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  schName: {
    fontSize: 16,
    color: '#444',
    marginBottom: 10,
  },
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
    lineHeight: 20,
  },
  interestList: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  location: {
    fontSize: 14,
    color: '#555',
    marginTop: 10,
  },
  extraInfo: {
    fontSize: 14,
    fontWeight: '400',
    color: '#777',
  },

  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    paddingVertical: 12,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  // buttonsRow: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-around',
  //   paddingVertical: 10,
  //   paddingHorizontal: 16,
  //   backgroundColor: '#fff',
  //   borderBottomWidth: 0.5,
  //   borderColor: '#eee',
  // },
  // iconButton: {
  //   backgroundColor: '#fafafa',
  //   padding: 10,
  //   borderRadius: 30,
  //   elevation: 2,
  // },

  error: {
    fontSize: 14,
    color: 'red',
    textAlign: 'center',
  },
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
  activeDot: {
    backgroundColor: '#581845',
    width: 10,
    height: 10,
  },

});

