





// import React, { useEffect, useState, useContext } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   Image,
//   TextInput
// } from 'react-native';
// import axios from 'axios';
// import moment from 'moment';
// import { useNavigation } from '@react-navigation/native';
// import { AuthContext } from '../context/AuthContext';
// import { Ionicons, Feather } from '@expo/vector-icons';
// import { socket } from '../socket';

// const ChatScreen = () => {
//   const [conversations, setConversations] = useState([]);
//   const { token } = useContext(AuthContext);
//   const navigation = useNavigation();
//   const [search, setSearch] = useState('');
//   const [activeTab, setActiveTab] = useState('All');

//   const fetchConversations = async () => {
//     try {
//       const res = await axios.get('http://192.168.0.169:4000/messages/conversations/list', {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setConversations(res.data);
//     } catch (err) {
//       console.error('❌ Failed to fetch conversations:', err);
//     }
//   };

//   useEffect(() => {
//     fetchConversations();
//   }, []);

//   // ✅ Listen for messages marked as read
//   useEffect(() => {
//     socket.on('messagesRead', ({ from }) => {
//       console.log(`✅ Messages from ${from} marked as read in real-time`);
//     });

//     return () => {
//       socket.off('messagesRead');
//     };
//   }, []);

//   // ✅ Listen for new messages → refresh conversations
//   useEffect(() => {
//     const handleNewMessage = ({ message }) => {
//       console.log('📥 ChatScreen received new message:', message);
//       fetchConversations(); // Refresh chat list
//     };

//     socket.on('newMessage', handleNewMessage);

//     return () => {
//       socket.off('newMessage', handleNewMessage);
//     };
//   }, []);

//   // ✅ Refresh when navigating back to ChatScreen
//   useEffect(() => {
//     const unsubscribe = navigation.addListener('focus', () => {
//       fetchConversations();
//     });

//     return unsubscribe;
//   }, [navigation]);

//   const getPhotoUri = (photo) => {
//     if (!photo)
//       return 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=2342&auto=format&fit=crop';
//     return photo.startsWith('http') ? photo : `http://192.168.0.169:4000${photo}`;
//   };

//   const formatSchoolFromEmail = (email) => {
//     const raw = email?.split('@')[1]?.split('.')[0];
//     if (!raw) return 'Unknown';
//     return raw
//       .replace(/[-_]/g, ' ')          // turn hyphens/underscores into spaces
//       .trim()
//       .split(/\s+/)
//       .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//       .join(' ');
//   };


//   const renderItem = ({ item }) => {
//     // const school = item.email?.split('@')[1]?.split('.')[0] || 'Unknown';
//     const school = formatSchoolFromEmail(item.email);

//     const user = {
//       id: item.userId || item._id,
//       firstName: item.firstName,
//       lastName: item.lastName,
//       email: item.email,
//       photos: item.photos || [],
//     };

//     const profileUri = getPhotoUri(user.photos?.[0]);

//     return (
//       <TouchableOpacity
//         style={styles.card}
//         onPress={() => navigation.navigate('PrivateChat', { user })}
//       >
//         <Image source={{ uri: profileUri }} style={styles.avatar} />
//         <View style={styles.chatDetails}>
//           <View style={styles.row}>
//             <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
//             <Text style={styles.timestamp}>{moment(item.timestamp).fromNow()}</Text>
//             {item.unreadCount > 0 && (
//               <View style={styles.unreadBadge}>
//                 <Text style={styles.unreadText}>{item.unreadCount}</Text>
//               </View>
//             )}
//           </View>
//           <Text style={styles.message} numberOfLines={1}>
//             {item.lastMessage || 'No messages yet.'}
//           </Text>
//           <Text style={styles.school}>{school}</Text>
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.topBar}>
//         <View>
//           <Text style={styles.title}>Messages</Text>
//           <Text style={styles.subtitle}>Connect with verified members</Text>
//         </View>
//         <TouchableOpacity>
//           <Ionicons name="person-circle" size={36} color="#581845" />
//         </TouchableOpacity>
//       </View>

//       {/* Search */}
//       <View style={styles.searchContainer}>
//         <Feather name="search" size={20} color="#666" style={{ marginRight: 8 }} />
//         <TextInput
//           placeholder="Search..."
//           style={styles.searchInput}
//           value={search}
//           onChangeText={setSearch}
//         />
//       </View>

//       {/* Tabs */}
//       <View style={styles.tabsContainer}>
//         {['All', 'Unread', 'Recent'].map(tab => (
//           <TouchableOpacity
//             key={tab}
//             style={[styles.tabButton, activeTab === tab && styles.activeTab]}
//             onPress={() => setActiveTab(tab)}
//           >
//             <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       {/* Chat List */}
//       <FlatList
//         data={conversations}
//         keyExtractor={item => item._id}
//         renderItem={renderItem}
//         contentContainerStyle={{ paddingBottom: 30 }}
//       />
//     </View>
//   );
// };

// export default ChatScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 15 },
//   topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, marginTop: 50 },
//   title: { fontSize: 24, fontWeight: 'bold', color: '#581845' },
//   subtitle: { fontSize: 14, color: '#888', marginTop: 2 },
//   searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f1f1', paddingHorizontal: 10, borderRadius: 10, marginVertical: 10 },
//   searchInput: { flex: 1, height: 40, fontSize: 16 },
//   tabsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
//   tabButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#eee' },
//   activeTab: { backgroundColor: '#581845' },
//   tabText: { fontSize: 14, color: '#444' },
//   activeTabText: { color: '#fff', fontWeight: 'bold' },
//   card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdfdfd', padding: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
//   avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: '#ccc' },
//   chatDetails: { flex: 1 },
//   row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   name: { fontSize: 16, fontWeight: 'bold', color: '#222' },
//   message: { fontSize: 14, color: '#666', marginTop: 4 },
//   school: { fontSize: 12, color: '#aaa', marginTop: 2 },
//   timestamp: { fontSize: 12, color: '#aaa' },
//   unreadBadge: { backgroundColor: '#ff4444', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
//   unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
// });




import React, { useEffect, useState, useContext, useCallback } from 'react';
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
  const { token, user } = useContext(AuthContext);          // NEW: pull user from context
  const currentUserId = user?._id || user?.id || null;      // NEW: normalized id
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get('http://192.168.0.169:4000/messages/conversations/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // sort newest first (helps when socket updates arrive)
      const list = Array.isArray(res.data) ? res.data.slice() : [];
      list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setConversations(list);
    } catch (err) {
      console.error('❌ Failed to fetch conversations:', err);
    }
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // ✅ Listen for messages marked as read

  // ✅ Listen for messages marked as read (server emits 'message:read')
useEffect(() => {
  const onMessageRead = ({ readerId, otherId }) => {
    // If I am the reader, clear unread on the row with otherId
    if (!currentUserId) return;
    if (String(readerId) !== String(currentUserId)) return;
    setConversations(prev =>
      prev.map(c =>
        String(c.userId || c._id) === String(otherId)
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  };
  socket.on('message:read', onMessageRead);
  return () => socket.off('message:read', onMessageRead);
}, [currentUserId]);
  // useEffect(() => {
  //   const onMessagesRead = ({ from }) => {
  //     console.log(`✅ Messages from ${from} marked as read in real-time`);
  //   };
  //   socket.on('messagesRead', onMessagesRead);
  //   return () => socket.off('messagesRead', onMessagesRead);
  // }, []);

  // ✅ Listen for new messages → (you already refetch here)
  // useEffect(() => {
  //   const handleNewMessage = ({ message }) => {
  //     console.log('📥 ChatScreen received new message:', message);
  //     fetchConversations(); // keep this if you want a guaranteed refresh on new direct messages
  //   };
  //   socket.on('newMessage', handleNewMessage);
  //   return () => socket.off('newMessage', handleNewMessage);
  // }, [fetchConversations]);

  // ✅ Listen for conversation:update → update the correct row WITHOUT refetching (NEW)
  useEffect(() => {
    if (!currentUserId) return;

    const onConvUpdate = (payload) => {
      if (!payload) return;
      const { peerA, peerB, lastMessage, timestamp, unreadBumpFor, unreadResetFor } = payload;

      // Find the OTHER user in this pair
      const otherUserId = String(peerA) === String(currentUserId)
        ? String(peerB)
        : String(peerA);

      setConversations((prev) => {
        let found = false;

        const updated = prev.map((c) => {
          if (String(c.userId || c._id) !== otherUserId) return c;
          found = true;

          // unread count logic
          let unreadCount = c.unreadCount || 0;
          if (unreadBumpFor && String(unreadBumpFor) === String(currentUserId)) {
            unreadCount = unreadCount + 1;
          }
          if (unreadResetFor && String(unreadResetFor) === String(currentUserId)) {
            unreadCount = 0;
          }

          return {
            ...c,
            lastMessage: lastMessage ?? c.lastMessage,
            timestamp: timestamp ?? c.timestamp,
            unreadCount,
          };
        });

        // If conversation isn’t present yet, add a minimal row so UI updates immediately
        const result = found
          ? updated
          : [
              {
                userId: otherUserId,
                firstName: '',
                lastName: '',
                email: '',
                photos: [],
                lastMessage: lastMessage || '',
                timestamp: timestamp || Date.now(),
                unreadCount:
                  unreadBumpFor && String(unreadBumpFor) === String(currentUserId) ? 1 : 0,
              },
              ...updated,
            ];

        // keep newest first
        result.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        return result;
      });
    };

    socket.on('conversation:update', onConvUpdate);
    return () => socket.off('conversation:update', onConvUpdate);
  }, [currentUserId]);

  // ✅ Refresh when navigating back to ChatScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchConversations);
    return unsubscribe;
  }, [navigation, fetchConversations]);

  const getPhotoUri = (photo) => {
    if (!photo)
      return 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=2342&auto=format&fit=crop';
    return photo.startsWith('http') ? photo : `http://192.168.0.169:4000${photo}`;
  };

  const formatSchoolFromEmail = (email) => {
    const raw = email?.split('@')[1]?.split('.')[0];
    if (!raw) return 'Unknown';
    return raw
      .replace(/[-_]/g, ' ')
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // (NEW) Optimistically clear unread when opening a DM
  const openDM = (userObj) => {
    const targetId = String(userObj.id || userObj.userId || userObj._id);
    setConversations(prev =>
      prev.map(c =>
        String(c.userId || c._id) === targetId ? { ...c, unreadCount: 0 } : c
      )
    );
    navigation.navigate('PrivateChat', { user: userObj });
  };

  const renderItem = ({ item }) => {
    const school = formatSchoolFromEmail(item.email);

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
        onPress={() => openDM(user)} // NEW: uses optimistic badge clear
      >
        <Image source={{ uri: profileUri }} style={styles.avatar} />
        <View style={styles.chatDetails}>
          <View style={styles.row}>
            <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.timestamp}>{item.timestamp ? moment(item.timestamp).fromNow() : ''}</Text>
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

  // Optional: simple search filter on client
  const filtered = conversations.filter(c => {
    if (!search) return true;
    const hay = `${c.firstName || ''} ${c.lastName || ''} ${c.email || ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

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
        data={filtered}
        keyExtractor={item => String(item.userId || item._id)}  // safer key
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
