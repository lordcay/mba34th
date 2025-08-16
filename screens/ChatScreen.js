





import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput
} from 'react-native';
import axios from 'axios';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import { socket } from '../socket';

const ChatScreen = () => {
  const [conversations, setConversations] = useState([]);
  const { token } = useContext(AuthContext);
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const fetchConversations = async () => {
    try {
      const res = await axios.get('https://three4th-street-backend.onrender.com/messages/conversations/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (err) {
      console.error('❌ Failed to fetch conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // ✅ Listen for messages marked as read
  useEffect(() => {
    socket.on('messagesRead', ({ from }) => {
      console.log(`✅ Messages from ${from} marked as read in real-time`);
    });

    return () => {
      socket.off('messagesRead');
    };
  }, []);

  // ✅ Listen for new messages → refresh conversations
  useEffect(() => {
    const handleNewMessage = ({ message }) => {
      console.log('📥 ChatScreen received new message:', message);
      fetchConversations(); // Refresh chat list
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, []);

  // ✅ Refresh when navigating back to ChatScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchConversations();
    });

    return unsubscribe;
  }, [navigation]);

  const getPhotoUri = (photo) => {
    if (!photo)
      return 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=2342&auto=format&fit=crop';
    return photo.startsWith('http') ? photo : `https://three4th-street-backend.onrender.com${photo}`;
  };

  const renderItem = ({ item }) => {
    const school = item.email?.split('@')[1]?.split('.')[0] || 'Unknown';

    const user = {
      id: item.userId || item._id,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      photos: item.photos || [],
    };

    const profileUri = getPhotoUri(user.photos?.[0]);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PrivateChat', { user })}
      >
        <Image source={{ uri: profileUri }} style={styles.avatar} />
        <View style={styles.chatDetails}>
          <View style={styles.row}>
            <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.timestamp}>{moment(item.timestamp).fromNow()}</Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.message} numberOfLines={1}>
            {item.lastMessage || 'No messages yet.'}
          </Text>
          <Text style={styles.school}>{school}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>Connect with verified members</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="person-circle" size={36} color="#581845" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#666" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Search..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['All', 'Unread', 'Recent'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat List */}
      <FlatList
        data={conversations}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 15 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, marginTop: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#581845' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f1f1', paddingHorizontal: 10, borderRadius: 10, marginVertical: 10 },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  tabsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  tabButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#eee' },
  activeTab: { backgroundColor: '#581845' },
  tabText: { fontSize: 14, color: '#444' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdfdfd', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#ccc' },
  chatDetails: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  message: { fontSize: 14, color: '#666', marginTop: 4 },
  school: { fontSize: 12, color: '#aaa', marginTop: 2 },
  timestamp: { fontSize: 12, color: '#aaa' },
  unreadBadge: { backgroundColor: '#ff4444', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});


