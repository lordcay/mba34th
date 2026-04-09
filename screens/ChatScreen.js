import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Animated,
} from 'react-native';
import axios from 'axios';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import { socket } from '../socket';
import api from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendConnectionRequest, cancelConnectionRequest, removeConnection, getConnectionStatus, getConnectionCount } from '../services/connection.service';
import { playPing, showTopToast } from '../utils/notify';
import OnboardingOverlay from '../components/OnboardingOverlay';


const BASE_URL = 'http://192.168.100.28:4000';
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const ChatScreen = () => {
  const [conversations, setConversations] = useState([]);

  // pull auth + unread control from context
  const { token, user, setUnreadCount } = useContext(AuthContext);
  const { state: unreadState, dispatch: unreadDispatch } = useUnread();
  const currentUserId = user?._id || user?.id || null;

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  // Connection state maps (userId -> status/count)
  const [connectionStatuses, setConnectionStatuses] = useState({});
  const [connectionCounts, setConnectionCounts] = useState({});

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/messages/conversations/list`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('Fetching conversations with token:', token);

      const fresh = Array.isArray(res.data) ? res.data.slice() : [];
      fresh.sort(
        (a, b) =>
          new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      );

      setConversations((prev) => {
        const prevMap = new Map(
          prev.map((c) => [String(c.userId || c._id), c])
        );
        const merged = fresh.map((item) => {
          const key = String(item.userId || item._id);
          const old = prevMap.get(key);
          const unreadCount = Math.max(
            item.unreadCount || 0,
            old?.unreadCount || 0
          );
          return { ...item, unreadCount };
        });
        merged.sort(
          (a, b) =>
            new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
        );
        return merged;
      });
    } catch (err) {
      console.error('❌ Failed to fetch conversations:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Update total unread for tab badge
  useEffect(() => {
    const total = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );
    setUnreadCount?.(total);
  }, [conversations, setUnreadCount]);

  // Listen for "message:read" → clear unread for that conversation
  useEffect(() => {
    const onMessageRead = ({ readerId, otherId }) => {
      if (!currentUserId) return;
      if (String(readerId) !== String(currentUserId)) return;

      setConversations((prev) =>
        prev.map((c) =>
          String(c.userId || c._id) === String(otherId)
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
    };

    socket.on('message:read', onMessageRead);
    return () => socket.off('message:read', onMessageRead);
  }, [currentUserId]);

  // Listen for conversation:update → keep list live
  useEffect(() => {
    if (!currentUserId) return;

    const onConvUpdate = (payload) => {
      if (!payload) return;
      const {
        peerA,
        peerB,
        lastMessage,
        timestamp,
        unreadBumpFor,
        unreadResetFor,
      } = payload;

      const otherUserId =
        String(peerA) === String(currentUserId)
          ? String(peerB)
          : String(peerA);

      setConversations((prev) => {
        let found = false;

        const updated = prev.map((c) => {
          if (String(c.userId || c._id) !== otherUserId) return c;
          found = true;

          let unreadCount = c.unreadCount || 0;
          if (
            unreadBumpFor &&
            String(unreadBumpFor) === String(currentUserId)
          ) {
            unreadCount = unreadCount + 1;
          }
          if (
            unreadResetFor &&
            String(unreadResetFor) === String(currentUserId)
          ) {
            unreadCount = 0;
          }

          return {
            ...c,
            lastMessage: lastMessage ?? c.lastMessage,
            timestamp: timestamp ?? c.timestamp,
            unreadCount,
          };
        });

        // If conversation wasn’t there yet, create a minimal row
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
                  unreadBumpFor &&
                  String(unreadBumpFor) === String(currentUserId)
                    ? 1
                    : 0,
              },
              ...updated,
            ];

        result.sort(
          (a, b) =>
            new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
        );
        return result;
      });
    };

    socket.on('conversation:update', onConvUpdate);
    return () => socket.off('conversation:update', onConvUpdate);
  }, [currentUserId]);

  // Refetch when screen focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchConversations);
    return unsubscribe;
  }, [navigation, fetchConversations]);

  // Fetch connection statuses & counts for all conversations
  useEffect(() => {
    if (conversations.length === 0) return;
    const fetchAllStatuses = async () => {
      const statusMap = {};
      const countMap = {};
      await Promise.all(
        conversations.map(async (c) => {
          const uid = String(c.userId || c._id);
          try {
            const [status, count] = await Promise.all([
              getConnectionStatus(uid),
              getConnectionCount(uid),
            ]);
            statusMap[uid] = status === 'received' ? 'none' : status;
            countMap[uid] = count;
          } catch {
            statusMap[uid] = 'none';
            countMap[uid] = 0;
          }
        })
      );
      setConnectionStatuses(statusMap);
      setConnectionCounts(countMap);
    };
    fetchAllStatuses();
  }, [conversations]);

  // Socket listeners for real-time connection updates
  useEffect(() => {
    const handleConnectionAccepted = (data) => {
      const otherUserId = data?.fromUserId || data?.toUserId || data?.userId || data?.targetUserId;
      if (otherUserId) {
        playPing();
        showTopToast('Connection accepted! 🎉');
        setConnectionStatuses(prev => ({ ...prev, [otherUserId]: 'connected' }));
        setConnectionCounts(prev => ({ ...prev, [otherUserId]: (prev[otherUserId] || 0) + 1 }));
      }
    };
    const handleConnectionRemoved = (data) => {
      const otherUserId = data?.fromUserId || data?.toUserId || data?.userId;
      if (otherUserId) {
        setConnectionStatuses(prev => ({ ...prev, [otherUserId]: 'none' }));
        setConnectionCounts(prev => ({ ...prev, [otherUserId]: Math.max(0, (prev[otherUserId] || 0) - 1) }));
      }
    };

    socket.on('connection:accepted', handleConnectionAccepted);
    socket.on('connection:removed', handleConnectionRemoved);

    return () => {
      socket.off('connection:accepted', handleConnectionAccepted);
      socket.off('connection:removed', handleConnectionRemoved);
    };
  }, []);

  // Connection handlers
  const handleConnect = async (targetUser) => {
    const uid = String(targetUser.id || targetUser.userId || targetUser._id);
    const currentStatus = connectionStatuses[uid] || 'none';
    try {
      if (currentStatus === 'none') {
        setConnectionStatuses(prev => ({ ...prev, [uid]: 'pending' }));
        await sendConnectionRequest(uid);
      } else if (currentStatus === 'pending') {
        setConnectionStatuses(prev => ({ ...prev, [uid]: 'none' }));
        await cancelConnectionRequest(uid);
      }
    } catch {
      setConnectionStatuses(prev => ({ ...prev, [uid]: currentStatus }));
    }
  };

  const getConnectionDisplay = (status) => {
    switch (status) {
      case 'connected':
        return { icon: 'checkmark-circle', label: 'Connected', color: '#581845' };
      case 'pending':
        return { icon: 'time-outline', label: 'Pending', color: '#9a6b8c' };
      default:
        return { icon: 'person-add-outline', label: 'Connect', color: '#581845' };
    }
  };

  const getPhotoUri = (photo) =>
    photo
      ? photo.startsWith('http')
        ? photo
        : `${BASE_URL}${photo}`
      : 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=2342&auto=format&fit=crop';

  const formatSchoolFromEmail = (email) => {
    const raw = email?.split('@')[1]?.split('.')[0];
    if (!raw) return 'Unknown';
    return raw
      .replace(/[-_]/g, ' ')
      .trim()
      .split(/\s+/)
      .map(
        (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join(' ');
  };


//   const toAbs = (p) =>
//   p && typeof p === "string" && !p.startsWith("http")
//     ? `${BASE_URL}${p}`
//     : p;

// const normalizeUser = (raw) => {
//   if (!raw) return null;
//   const photos = Array.isArray(raw.photos)
//     ? raw.photos.map(toAbs)
//     : [];

//   return {
//     ...raw,
//     id: raw.id || raw._id,
//     _id: raw._id || raw.id,
//     photos,
//     avatarUrl: photos[0] || toAbs(raw.avatarUrl),
//   };
// };


//   // 🔑 Open DM, fetch full profile safely, then navigate
//   const openDM = async (userObj) => {
//     const targetId = String(
//       userObj.id || userObj.userId || userObj._id
//     );

//     if (!targetId) return;

//     // Optimistically clear unread count for this conversation
//     setConversations((prev) =>
//       prev.map((c) =>
//         String(c.userId || c._id) === targetId
//           ? { ...c, unreadCount: 0 }
//           : c
//       )
//     );

//     try {
//       const res = await axios.get(
//         `${BASE_URL}/accounts/${targetId}`,
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       // Handle both possible backend formats:
//       // { user: { ... } }  OR  { ...userFields }
//       // const fullUser = res.data?.user || res.data;

//       // navigation.navigate('PrivateChat', { user: fullUser });

// const apiUser = res.data?.user || res.data;
// const fullUser = normalizeUser(apiUser);

// navigation.navigate('PrivateChat', { user: fullUser });


//     } catch (err) {
//       console.error('❌ Failed to fetch full profile:', err);
//       // Still navigate with partial data if fetch fails
//       navigation.navigate('PrivateChat', { user: userObj });
//     }
//   };


const toAbs = (p) =>
  p && typeof p === 'string' && !p.startsWith('http')
    ? `${BASE_URL}${p}`
    : p;

const normalizeUser = (raw) => {
  if (!raw) return null;
  const photos = Array.isArray(raw.photos)
    ? raw.photos.map(toAbs)
    : [];
  return {
    ...raw,
    id: raw.id || raw._id || raw.userId,
    _id: raw._id || raw.id || raw.userId,
    photos,
    avatarUrl: photos[0] || toAbs(raw.avatarUrl),
  };
};

// 🔑 Open DM, fetch full profile safely, then navigate
const openDM = async (userObj) => {
  const targetId = String(
    userObj.id || userObj.userId || userObj._id
  );

  if (!targetId) return;

  // Optimistically clear unread count for this conversation (local state)
  setConversations((prev) =>
    prev.map((c) =>
      String(c.userId || c._id) === targetId
        ? { ...c, unreadCount: 0 }
        : c
    )
  );

  // Also clear unread count in UnreadContext (HomeScreen badge sync)
  unreadDispatch({ type: 'clear-dm', otherUserId: targetId });

  try {
    // ✅ Use the same api instance as ChatRoomScreen
    const res = await api.get(`/accounts/${targetId}`);

    const apiUser = res.data?.user || res.data;
    const fullUser = normalizeUser(apiUser);

    navigation.navigate('PrivateChat', { user: fullUser });
  } catch (err) {
    console.error('❌ Failed to fetch full profile (DM open):', err?.response?.data || err.message);
    // Still navigate with partial data if fetch fails
    navigation.navigate('PrivateChat', { user: normalizeUser(userObj) });
  }
};

  const renderItem = ({ item }) => {
    const school = formatSchoolFromEmail(item.email);

    const userX = {
      id: item.userId || item._id,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      photos: item.photos || [],
    };

    const profileUri = getPhotoUri(userX.photos?.[0]);
    const uid = String(userX.id);
    const status = connectionStatuses[uid] || 'none';
    const count = connectionCounts[uid] || 0;
    const display = getConnectionDisplay(status);

    // Get unread count from UnreadContext (synced with App.js dm:new listener)
    const contextUnread = unreadState?.dmByUserId?.[String(userX.id)] || 0;
    // Use the higher of local or context unread count
    const displayUnread = Math.max(item.unreadCount || 0, contextUnread);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDM(userX)}
      >
        <Image source={{ uri: profileUri }} style={styles.avatar} />
        <View style={styles.chatDetails}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {userX.firstName} {userX.lastName}
            </Text>
            {status !== 'connected' && (
              <TouchableOpacity
                style={styles.connectIconBtn}
                onPress={() => handleConnect(userX)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={status === 'pending' ? 'time-outline' : 'person-add'} 
                  size={18} 
                  color={status === 'pending' ? '#9a6b8c' : '#581845'} 
                />
              </TouchableOpacity>
            )}
            {status === 'connected' && (
              <Ionicons name="checkmark-circle" size={16} color="#581845" style={{ marginLeft: 6 }} />
            )}
            {displayUnread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{displayUnread}</Text>
              </View>
            )}
            <Text style={styles.timestamp}>
              {item.timestamp ? moment(item.timestamp).fromNow() : ''}
            </Text>
          </View>
          <Text style={styles.message} numberOfLines={1}>
            {item.lastMessage || 'No messages yet.'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.school}>{school}</Text>
            <View style={styles.connectionInfo}>
              <Ionicons name="people-outline" size={11} color="#888" />
              <Text style={styles.connectionCount}>{count}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Tab filter
  const byTab = conversations.filter((c) => {
    if (activeTab === 'Unread') {
      // Check both local unreadCount AND UnreadContext
      const userId = String(c.userId || c._id);
      const contextUnread = unreadState?.dmByUserId?.[userId] || 0;
      const displayUnread = Math.max(c.unreadCount || 0, contextUnread);
      return displayUnread > 0;
    }
    if (activeTab === 'Recent') {
      const t = c.timestamp
        ? new Date(c.timestamp).getTime()
        : 0;
      return t > 0 && Date.now() - t <= RECENT_WINDOW_MS;
    }
    return true; // "All"
  });

  // Search on top of tab filter
  const bySearch = byTab.filter((c) => {
    if (!search) return true;
    const hay = `${c.firstName || ''} ${c.lastName || ''} ${
      c.email || ''
    }`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  const finalList = bySearch
    .slice()
    .sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );

  return (
    <OnboardingOverlay screenName="Chat">
    <View style={styles.container}>
      <View style={[styles.topBar, { marginTop: insets.top + 10 }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#581845" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Messages</Text>
          <Text style={styles.subtitle}>
            Connect with verified members
          </Text>
        </View>

        {/* Spacer to balance layout */}
        <View style={styles.spacer} />
      </View>

      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={20}
          color="#666"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Search..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.tabsContainer}>
        {['All', 'Unread', 'Recent'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              activeTab === tab && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={finalList}
        keyExtractor={(item) => String(item.userId || item._id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
    </OnboardingOverlay>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 15 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f0f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  spacer: {
    width: 40,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#581845' },
  subtitle: { fontSize: 14, color: '#888', marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  searchInput: { flex: 1, height: 40, fontSize: 16 },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  activeTab: { backgroundColor: '#581845' },
  tabText: { fontSize: 14, color: '#444' },
  activeTabText: { color: '#fff', fontWeight: 'bold' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdfdfd',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#ccc',
  },
  chatDetails: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  connectIconBtn: {
    marginLeft: 8,
    padding: 2,
  },
  message: { fontSize: 14, color: '#666', marginTop: 4 },
  school: { fontSize: 12, color: '#aaa' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  connectionCount: {
    fontSize: 11,
    color: '#888',
  },
  timestamp: { fontSize: 11, color: '#aaa', marginLeft: 'auto', paddingLeft: 8 },
  unreadBadge: {
    backgroundColor: '#581845',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
























// import React, { useEffect, useState, useContext, useCallback } from 'react';
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

//   // ✨ Move this ABOVE currentUserId so 'user' exists
//   const { token, user, setUnreadCount } = useContext(AuthContext);

//   // ✨ Now it's safe to read user
//   const currentUserId = user?._id || user?.id || null;

//   const navigation = useNavigation();
//   const [search, setSearch] = useState('');
//   const [activeTab, setActiveTab] = useState('All');

//   // --- Tab filtering + search + sorting
// const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

//   const fetchConversations = useCallback(async () => {
//     try {
//       const res = await axios.get('http://192.168.100.28:4000/messages/conversations/list', {
//         headers: { Authorization: `Bearer ${token}` }

//       });
//         console.log('Fetching user with token:', token);

//       const fresh = Array.isArray(res.data) ? res.data.slice() : [];
//       fresh.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

//       setConversations((prev) => {
//         const prevMap = new Map(prev.map((c) => [String(c.userId || c._id), c]));
//         const merged = fresh.map((item) => {
//           const key = String(item.userId || item._id);
//           const old = prevMap.get(key);
//           const unreadCount = Math.max(item.unreadCount || 0, old?.unreadCount || 0);
//           return { ...item, unreadCount };
//         });
//         merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
//         return merged;
//       });
//     } catch (err) {
//       console.error('❌ Failed to fetch conversations:', err);
//     }
//   }, [token]);

//   useEffect(() => { fetchConversations(); }, [fetchConversations]);

//   // 🔔 Publish total unread to context → Tab badge uses this
//   useEffect(() => {
//     // ✨ Fix: add the missing '+' in reduce
//     const total = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
//     setUnreadCount?.(total);
//   }, [conversations, setUnreadCount]);

//   // ✅ Listen for messages marked as read (server emits 'message:read')
//   useEffect(() => {
//     const onMessageRead = ({ readerId, otherId }) => {
//       if (!currentUserId) return;
//       if (String(readerId) !== String(currentUserId)) return;
//       setConversations(prev =>
//         prev.map(c =>
//           String(c.userId || c._id) === String(otherId)
//             ? { ...c, unreadCount: 0 }
//             : c
//         )
//       );
//     };
//     socket.on('message:read', onMessageRead);
//     return () => socket.off('message:read', onMessageRead);
//   }, [currentUserId]);

//   // ✅ Listen for conversation:update → update row WITHOUT refetching
//   useEffect(() => {
//     if (!currentUserId) return;

//     const onConvUpdate = (payload) => {
//       if (!payload) return;
//       const { peerA, peerB, lastMessage, timestamp, unreadBumpFor, unreadResetFor } = payload;

//       const otherUserId = String(peerA) === String(currentUserId)
//         ? String(peerB)
//         : String(peerA);

//       setConversations((prev) => {
//         let found = false;

//         const updated = prev.map((c) => {
//           if (String(c.userId || c._id) !== otherUserId) return c;
//           found = true;

//           let unreadCount = c.unreadCount || 0;
//           if (unreadBumpFor && String(unreadBumpFor) === String(currentUserId)) {
//             unreadCount = unreadCount + 1;
//           }
//           if (unreadResetFor && String(unreadResetFor) === String(currentUserId)) {
//             unreadCount = 0;
//           }

//           return {
//             ...c,
//             lastMessage: lastMessage ?? c.lastMessage,
//             timestamp: timestamp ?? c.timestamp,
//             unreadCount,
//           };
//         });

//         const result = found
//           ? updated
//           : [
//               {
//                 userId: otherUserId,
//                 firstName: '',
//                 lastName: '',
//                 email: '',
//                 photos: [],
//                 lastMessage: lastMessage || '',
//                 timestamp: timestamp || Date.now(),
//                 unreadCount:
//                   unreadBumpFor && String(unreadBumpFor) === String(currentUserId) ? 1 : 0,
//               },
//               ...updated,
//             ];

//         result.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
//         return result;
//       });
//     };

//     socket.on('conversation:update', onConvUpdate);
//     return () => socket.off('conversation:update', onConvUpdate);
//   }, [currentUserId]);

//   useEffect(() => {
//     const unsubscribe = navigation.addListener('focus', fetchConversations);
//     return unsubscribe;
//   }, [navigation, fetchConversations]);

//   const getPhotoUri = (photo) =>
//     photo
//       ? (photo.startsWith('http') ? photo : `http://192.168.100.28:4000${photo}`)
//       : 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=2342&auto=format&fit=crop';

//   const formatSchoolFromEmail = (email) => {
//     const raw = email?.split('@')[1]?.split('.')[0];
//     if (!raw) return 'Unknown';
//     return raw.replace(/[-_]/g, ' ')
//               .trim()
//               .split(/\s+/)
//               .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//               .join(' ');
//   };

// const openDM = async (userObj) => {
//   const targetId = String(userObj.id || userObj.userId || userObj._id);
  
//   // Reset unread count optimistically
//   setConversations(prev =>
//     prev.map(c =>
//       String(c.userId || c._id) === targetId ? { ...c, unreadCount: 0 } : c
//     )
//   );

//   try {
//     const res = await axios.get(`http://192.168.100.28:4000/accounts/${targetId}`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });

//    const fullUser = res.data.user || res.data;
// navigation.navigate('PrivateChat', { user: fullUser });

//   } catch (err) {
//     console.error('❌ Failed to fetch full profile:', err);
//     // Optional: still navigate with partial data
//     navigation.navigate('PrivateChat', { user: userObj });
//   }
// };



//   const renderItem = ({ item }) => {
//     const school = formatSchoolFromEmail(item.email);

//     const userX = {
//       id: item.userId || item._id,
//       firstName: item.firstName,
//       lastName: item.lastName,
//       nickName: item.nickName,
//       gender: item.gender,
//       email: item.email,
//       bio: item.bio,
//       photos: item.photos || [],
     
      
//     };

//     const profileUri = getPhotoUri(userX.photos?.[0]);

//     return (
//       <TouchableOpacity style={styles.card} onPress={() => openDM(userX)}>
//         <Image source={{ uri: profileUri }} style={styles.avatar} />
//         <View style={styles.chatDetails}>
//           <View style={styles.row}>
//             <Text style={styles.name}>{userX.firstName} {userX.lastName}</Text>
//             <Text style={styles.timestamp}>{item.timestamp ? moment(item.timestamp).fromNow() : ''}</Text>
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

//   const byTab = conversations.filter((c) => {
//   if (activeTab === 'Unread') {
//     return (c.unreadCount || 0) > 0;
//   }
//   if (activeTab === 'Recent') {
//     const t = c.timestamp ? new Date(c.timestamp).getTime() : 0;
//     return t > 0 && (Date.now() - t) <= RECENT_WINDOW_MS;
//   }
//   // 'All'
//   return true;
// });

// // Search on top of tab filter
// const bySearch = byTab.filter((c) => {
//   if (!search) return true;
//   const hay = `${c.firstName || ''} ${c.lastName || ''} ${c.email || ''}`.toLowerCase();
//   return hay.includes(search.toLowerCase());
// });

// // Sort (explicit for clarity)
// const finalList = bySearch.slice().sort((a, b) => {
//   const ta = new Date(a.timestamp || 0).getTime();
//   const tb = new Date(b.timestamp || 0).getTime();
//   // Newest first for Unread & Recent; All is already in that order but keep consistent
//   return tb - ta;
// });

//   // const [search, setSearch] = useState(''); // (kept above originally)

 

//   return (
//     <View style={styles.container}>
//       <View className="topBar" style={styles.topBar}>
//         <View>
//           <Text style={styles.title}>Messages</Text>
//           <Text style={styles.subtitle}>Connect with verified members</Text>
//         </View>
//         <TouchableOpacity>
//           <Ionicons name="person-circle" size={36} color="#581845" />
//         </TouchableOpacity>
//       </View>

//       <View style={styles.searchContainer}>
//         <Feather name="search" size={20} color="#666" style={{ marginRight: 8 }} />
//         <TextInput
//           placeholder="Search..."
//           style={styles.searchInput}
//           value={search}
//           onChangeText={setSearch}
//         />
//       </View>

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

//       <FlatList
//         data={finalList}
//         keyExtractor={item => String(item.userId || item._id)}
//         renderItem={renderItem}
//         contentContainerStyle={{ paddingBottom: 30 }}
//       />
//     </View>
//   );
// };

// export default ChatScreen;

// // …styles unchanged


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
//   unreadBadge: { backgroundColor: '#581845', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
//   unreadText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
// });



// import React, { useEffect, useState, useContext, useCallback } from 'react';
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
//   const { token, user } = useContext(AuthContext);          // NEW: pull user from context
//   const currentUserId = user?._id || user?.id || null;      // NEW: normalized id
//   const navigation = useNavigation();
//   const [search, setSearch] = useState('');
//   const [activeTab, setActiveTab] = useState('All');

//   const fetchConversations = useCallback(async () => {
//     try {
//       const res = await axios.get('http://192.168.100.28:4000/messages/conversations/list', {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       // sort newest first (helps when socket updates arrive)
//       const list = Array.isArray(res.data) ? res.data.slice() : [];
//       list.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
//       setConversations(list);
//     } catch (err) {
//       console.error('❌ Failed to fetch conversations:', err);
//     }
//   }, [token]);

//   useEffect(() => { fetchConversations(); }, [fetchConversations]);

//   // ✅ Listen for messages marked as read

//   // ✅ Listen for messages marked as read (server emits 'message:read')
// useEffect(() => {
//   const onMessageRead = ({ readerId, otherId }) => {
//     // If I am the reader, clear unread on the row with otherId
//     if (!currentUserId) return;
//     if (String(readerId) !== String(currentUserId)) return;
//     setConversations(prev =>
//       prev.map(c =>
//         String(c.userId || c._id) === String(otherId)
//           ? { ...c, unreadCount: 0 }
//           : c
//       )
//     );
//   };
//   socket.on('message:read', onMessageRead);
//   return () => socket.off('message:read', onMessageRead);
// }, [currentUserId]);


//   // ✅ Listen for conversation:update → update the correct row WITHOUT refetching (NEW)
//   useEffect(() => {
//     if (!currentUserId) return;

//     const onConvUpdate = (payload) => {
//       if (!payload) return;
//       const { peerA, peerB, lastMessage, timestamp, unreadBumpFor, unreadResetFor } = payload;

//       // Find the OTHER user in this pair
//       const otherUserId = String(peerA) === String(currentUserId)
//         ? String(peerB)
//         : String(peerA);

//       setConversations((prev) => {
//         let found = false;

//         const updated = prev.map((c) => {
//           if (String(c.userId || c._id) !== otherUserId) return c;
//           found = true;

//           // unread count logic
//           let unreadCount = c.unreadCount || 0;
//           if (unreadBumpFor && String(unreadBumpFor) === String(currentUserId)) {
//             unreadCount = unreadCount + 1;
//           }
//           if (unreadResetFor && String(unreadResetFor) === String(currentUserId)) {
//             unreadCount = 0;
//           }

//           return {
//             ...c,
//             lastMessage: lastMessage ?? c.lastMessage,
//             timestamp: timestamp ?? c.timestamp,
//             unreadCount,
//           };
//         });

//         // If conversation isn’t present yet, add a minimal row so UI updates immediately
//         const result = found
//           ? updated
//           : [
//               {
//                 userId: otherUserId,
//                 firstName: '',
//                 lastName: '',
//                 email: '',
//                 photos: [],
//                 lastMessage: lastMessage || '',
//                 timestamp: timestamp || Date.now(),
//                 unreadCount:
//                   unreadBumpFor && String(unreadBumpFor) === String(currentUserId) ? 1 : 0,
//               },
//               ...updated,
//             ];

//         // keep newest first
//         result.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
//         return result;
//       });
//     };

//     socket.on('conversation:update', onConvUpdate);
//     return () => socket.off('conversation:update', onConvUpdate);
//   }, [currentUserId]);

//   // ✅ Refresh when navigating back to ChatScreen
//   useEffect(() => {
//     const unsubscribe = navigation.addListener('focus', fetchConversations);
//     return unsubscribe;
//   }, [navigation, fetchConversations]);

//   const getPhotoUri = (photo) => {
//     if (!photo)
//       return 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=2342&auto=format&fit=crop';
//     return photo.startsWith('http') ? photo : `http://192.168.100.28:4000${photo}`;
//   };

//   const formatSchoolFromEmail = (email) => {
//     const raw = email?.split('@')[1]?.split('.')[0];
//     if (!raw) return 'Unknown';
//     return raw
//       .replace(/[-_]/g, ' ')
//       .trim()
//       .split(/\s+/)
//       .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//       .join(' ');
//   };

//   // (NEW) Optimistically clear unread when opening a DM
//   const openDM = (userObj) => {
//     const targetId = String(userObj.id || userObj.userId || userObj._id);
//     setConversations(prev =>
//       prev.map(c =>
//         String(c.userId || c._id) === targetId ? { ...c, unreadCount: 0 } : c
//       )
//     );
//     navigation.navigate('PrivateChat', { user: userObj });
//   };

//   const renderItem = ({ item }) => {
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
//         onPress={() => openDM(user)} // NEW: uses optimistic badge clear
//       >
//         <Image source={{ uri: profileUri }} style={styles.avatar} />
//         <View style={styles.chatDetails}>
//           <View style={styles.row}>
//             <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
//             <Text style={styles.timestamp}>{item.timestamp ? moment(item.timestamp).fromNow() : ''}</Text>
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

//   // Optional: simple search filter on client
//   const filtered = conversations.filter(c => {
//     if (!search) return true;
//     const hay = `${c.firstName || ''} ${c.lastName || ''} ${c.email || ''}`.toLowerCase();
//     return hay.includes(search.toLowerCase());
//   });

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
//         data={filtered}
//         keyExtractor={item => String(item.userId || item._id)}  // safer key
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
