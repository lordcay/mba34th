import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const chatRooms = [
    'Live Update (School Gist)',
    'Green Card Gist',
    'Conference',
    'Business Spot',
    'Internship Era',
    'Post Graduate Hustle',
    'Sport Madness',
    'Referral Request',
    'Consulting Hero’s',
    'Finance Dragons',
    'Tech Lords',
    'Business Drivers',
    'Entrepreneur Adventures',
    'Events'
  ];

const ChatRoomScreen = () => {
  return (
    <View style={styles.container}>
    <Text style={styles.header}>Explore Chat Rooms</Text>
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {chatRooms.map((room, index) => (
        <TouchableOpacity
          key={index}
          style={styles.card}
          onPress={() => navigation.navigate('ChatRoomDetail', { roomName: room })}
        >
          <View style={styles.avatarWrapper}>
            <Ionicons name="chatbubbles" size={28} color="#fff" />
          </View>
          <Text style={styles.roomText}>{room}</Text>
          <Ionicons name="chevron-forward" size={20} color="#aaa" style={styles.arrow} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
  )
}

export default ChatRoomScreen

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
      paddingHorizontal: 16,
      paddingTop: 60
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#581845',
      marginBottom: 20,
      textAlign: 'center'
    },
    scrollContainer: {
      paddingBottom: 30
    },
    card: {
      backgroundColor: '#f8f8f8',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3
    },
    avatarWrapper: {
      backgroundColor: '#581845',
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12
    },
    roomText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#333',
      flex: 1
    },
    arrow: {
      marginLeft: 8
    }
  });
  