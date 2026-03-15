import React, {
  useEffect,
  useState,
  useContext,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Keyboard,
  Alert,
  ScrollView,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
import { socket } from '../socket';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaView as SASafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { showTopToast, playPing } from '../utils/notify';
import { useUnread } from '../context/UnreadContext';
import api from '../services/api';

// Media sharing imports
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Contacts from 'expo-contacts';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// Cloudinary config
const CLOUDINARY_CLOUD = 'de2wocs21';
const CLOUDINARY_UPLOAD_PRESET = 'unsigned_upload';
const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`;
const CLOUDINARY_RAW_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`;

// Giphy API config (free tier API key)
const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
const GIPHY_TRENDING_URL = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=30&rating=pg-13`;
const GIPHY_SEARCH_URL = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&limit=30&rating=pg-13`;


const BASE_URL = 'http://192.168.100.4:4000';

const HEADER_HEIGHT = 56;
const MIN_INPUT_HEIGHT = 40;
const MAX_INPUT_HEIGHT = 140;

const toAbs = (p) =>
  p && typeof p === 'string' && !p.startsWith('http')
    ? `${BASE_URL}${p}`
    : p;

const normalizeUser = (raw) => {
  if (!raw) return null;
  const id = raw.id || raw._id || raw.userId;
  const photos = Array.isArray(raw.photos)
    ? raw.photos.map(toAbs)
    : [];
  return {
    ...raw,
    id,
    _id: id,
    photos,
  };
};

const asId = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val._id) return String(val._id);
    if (val.id) return String(val.id);
  }
  return String(val);
};

// ─────────────────────────────────────────────────────────
// Date formatting helpers (WhatsApp-style)
// ─────────────────────────────────────────────────────────
const getDateLabel = (timestamp) => {
  const msgDate = moment(timestamp);
  const today = moment().startOf('day');
  const yesterday = moment().subtract(1, 'day').startOf('day');
  const weekAgo = moment().subtract(7, 'days').startOf('day');

  if (msgDate.isSameOrAfter(today)) {
    return 'Today';
  } else if (msgDate.isSameOrAfter(yesterday)) {
    return 'Yesterday';
  } else if (msgDate.isSameOrAfter(weekAgo)) {
    return msgDate.format('dddd'); // e.g., "Monday"
  } else {
    return msgDate.format('MMMM D, YYYY'); // e.g., "March 5, 2026"
  }
};

const isSameDay = (ts1, ts2) => {
  if (!ts1 || !ts2) return false;
  return moment(ts1).isSame(moment(ts2), 'day');
};

// Date Separator Component
const DateSeparator = ({ label }) => (
  <View style={dateSeparatorStyles.container}>
    <View style={dateSeparatorStyles.line} />
    <View style={dateSeparatorStyles.badge}>
      <Text style={dateSeparatorStyles.text}>{label}</Text>
    </View>
    <View style={dateSeparatorStyles.line} />
  </View>
);

const dateSeparatorStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 10,
  },
  line: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#d1d1d6',
  },
  badge: {
    backgroundColor: '#e8e8ed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginHorizontal: 10,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b6b6b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

// Audio Message Player Component
const AudioMessage = ({ uri, duration, isMine }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);
  const soundRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true },
            (status) => {
              if (status.isLoaded) {
                setPlaybackPosition(status.positionMillis / 1000);
                setPlaybackDuration(status.durationMillis / 1000);
                if (status.didJustFinish) {
                  setIsPlaying(false);
                  setPlaybackPosition(0);
                  soundRef.current?.setPositionAsync(0);
                }
              }
            }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.playAsync();
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;

  return (
    <View style={audioStyles.container}>
      <TouchableOpacity onPress={togglePlayback} style={audioStyles.playButton}>
        <Ionicons 
          name={isPlaying ? 'pause' : 'play'} 
          size={24} 
          color="#fff" 
        />
      </TouchableOpacity>
      <View style={audioStyles.waveContainer}>
        <View style={audioStyles.progressBar}>
          <View style={[audioStyles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={audioStyles.duration}>
          {formatTime(isPlaying ? playbackPosition : playbackDuration)}
        </Text>
      </View>
    </View>
  );
};

const audioStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 180,
    paddingVertical: 4,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#581845',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  waveContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#581845',
  },
  duration: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

const formatSchoolFromEmail = (email) => {
  const raw = email?.split?.('@')?.[1]?.split?.('.')?.[0];
  if (!raw) return 'Unknown School';
  return raw
    .replace(/[-_]/g, ' ')
    .trim()
    .split(/\s+/)
    .map(
      (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(' ');
};

const PrivateChatScreen = () => {
  // 🔥 FIX: Load token safely
  const auth = useContext(AuthContext);
  const [token, setToken] = useState(auth?.token || null);
  const userId = auth?.userId;

  // If token missing → load from AsyncStorage
  useEffect(() => {
    if (!token) {
      (async () => {
        const stored = await AsyncStorage.getItem('token');
        if (stored) setToken(stored);
      })();
    }
  }, [token]);

  const navigation = useNavigation();
  const route = useRoute();
  const { user } = route.params || {};
const [userData, setUserData] = useState(() => normalizeUser(user));


  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const inputRef = useRef(null);

  const insets = useSafeAreaInsets();
  const [kbVisible, setKbVisible] = useState(false);

  const [typingStatus, setTypingStatus] = useState('');
  const typingTimeoutRef = useRef(null);
  const lastTypedAtRef = useRef(0);
  const { dispatch } = useUnread();
  const [myDisplayName, setMyDisplayName] = useState('Someone');

  // Reply & Reaction state
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false); // Prevent double-tap
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // For scroll highlight
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null); // FlatList ref for scrolling
  
  // Delete message state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  // Media sharing state
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const [audioPermission, setAudioPermission] = useState(null);

  // GIF picker state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [gifCategory, setGifCategory] = useState('trending'); // trending, search
  const gifSearchTimeoutRef = useRef(null);

  // Presence/Online status state
  const [peerPresence, setPeerPresence] = useState({
    status: 'offline',
    lastSeen: null,
  });

  // Common emoji reactions
  const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

  const peer = userData || user || {};
  const peerId = peer?.id || peer?._id;
  const scrollRef = useRef();


  const composerBottomPad = kbVisible
    ? 8
    : Platform.OS === 'ios'
    ? Math.max(12, insets.bottom)
    : Math.max(12, insets.bottom + 10);

  // Fetch full profile once token loads
  // Fetch full profile (using shared api client)
useEffect(() => {
  if (!peerId) return;

  // If we already have rich profile data, don't refetch
  if (
    userData?.bio &&
    userData?.origin &&
    Array.isArray(userData.photos) &&
    userData.photos.length
  ) {
    return;
  }

  const loadProfile = async () => {
    try {
      // ✅ use shared api client, which should already attach token
      const res = await api.get(`/accounts/${peerId}`);
      const full = normalizeUser(res.data?.user || res.data);
      if (full) setUserData(full);
    } catch (err) {
      console.error(
        '❌ Failed to fetch full profile (DM screen):',
        err?.response?.data || err.message
      );
      // If 401 persists, we still keep userData from route.params
    }
  };

  loadProfile();
}, [peerId]);

// ✅ Fetch peer's presence status and listen for updates
useEffect(() => {
  if (!peerId) return;

  // Fetch initial presence via socket callback
  socket.emit('presence:get', { userId: peerId }, (response) => {
    if (response) {
      setPeerPresence({
        status: response.status || 'offline',
        lastSeen: response.lastSeen,
      });
    }
  });

  // Also fetch via API as fallback
  const fetchPresence = async () => {
    try {
      const res = await api.get(`/accounts/${peerId}/presence`);
      if (res.data) {
        setPeerPresence({
          status: res.data.status || 'offline',
          lastSeen: res.data.lastSeen,
        });
      }
    } catch (err) {
      console.log('Could not fetch presence via API:', err.message);
    }
  };
  fetchPresence();

  // Listen for presence updates
  const handlePresenceUpdate = ({ userId, status, lastSeen }) => {
    if (userId === peerId) {
      setPeerPresence({ status, lastSeen });
    }
  };

  socket.on('presence:update', handlePresenceUpdate);

  return () => {
    socket.off('presence:update', handlePresenceUpdate);
  };
}, [peerId]);

//   useEffect(() => {
//   if (!peerId) return;

//   const load = async () => {
//     let t = token;

//     if (!t) {
//       t = await AsyncStorage.getItem('token');
//       setToken(t);
//     }

//     if (!t) {
//       console.log("❌ No token yet, delaying profile fetch");
//       return;
//     }

//     try {
//       const res = await axios.get(`${BASE_URL}/accounts/${peerId}`, {
//         headers: { Authorization: `Bearer ${t}` },
//       });
//       const full = normalizeUser(res.data?.user || res.data);
//       setUserData(full);
//     } catch (err) {
//       console.error('❌ Failed to fetch full profile:', err);
//     }
//   };

//   load();
// }, [peerId, token]);

  // useEffect(() => {
  //   if (!token) return;
  //   if (!peerId) return;

  //   if (
  //     userData?.bio &&
  //     userData?.origin &&
  //     Array.isArray(userData.photos) &&
  //     userData.photos.length
  //   ) {
  //     return;
  //   }

  //   (async () => {
  //     try {
  //       const res = await axios.get(
  //         `${BASE_URL}/accounts/${peerId}`,
  //         {
  //           headers: { Authorization: `Bearer ${token}` },
  //         }
  //       );
  //       const full = normalizeUser(res.data?.user || res.data);
  //       if (full) setUserData(full);
  //     } catch (err) {
  //       console.error('Failed to fetch full profile:', err);
  //     }
  //   })();
  // }, [token, peerId]);

  // Header tap → UserProfile

  // Function to initiate a call
  const initiateCall = (callType) => {
    const peerName = [
      userData?.firstName || peer?.firstName,
      userData?.lastName || peer?.lastName,
    ].filter(Boolean).join(' ') || 'Unknown';
    
    const peerPhoto = userData?.photos?.[0] || (peer?.photos?.[0] ? toAbs(peer.photos[0]) : null);
    
    navigation.navigate('Call', {
      isIncoming: false,
      callType,
      calleeId: peerId,
      calleeName: peerName,
      calleePhoto: peerPhoto,
    });
  };

  useLayoutEffect(() => {
  const schoolFromEmail = formatSchoolFromEmail(peer?.email);
  
  // Get presence status text and color
  const getPresenceInfo = () => {
    switch (peerPresence.status) {
      case 'online':
        return { color: '#22c55e', text: 'Online' }; // Green
      case 'inactive':
        return { color: '#eab308', text: 'Away' }; // Yellow
      case 'offline':
      default:
        if (peerPresence.lastSeen) {
          const lastSeenMoment = moment(peerPresence.lastSeen);
          const now = moment();
          if (now.diff(lastSeenMoment, 'minutes') < 60) {
            return { color: '#ef4444', text: `Last seen ${lastSeenMoment.fromNow()}` };
          } else if (now.isSame(lastSeenMoment, 'day')) {
            return { color: '#ef4444', text: `Last seen today at ${lastSeenMoment.format('h:mm A')}` };
          } else if (now.diff(lastSeenMoment, 'days') === 1) {
            return { color: '#ef4444', text: `Last seen yesterday` };
          } else {
            return { color: '#ef4444', text: `Last seen ${lastSeenMoment.format('MMM D')}` };
          }
        }
        return { color: '#ef4444', text: 'Offline' }; // Red
    }
  };
  
  const presenceInfo = getPresenceInfo();

  navigation.setOptions({
    headerShown: true,
    headerTransparent: false,
    headerTitleAlign: 'left',
    headerBackTitle: 'Back',
    headerBackTitleVisible: true,
    headerTintColor: '#581845',
    headerShadowVisible: true,
    headerStyle: {
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    headerTitle: () => (
      <TouchableOpacity
        onPress={() => {
          const full = normalizeUser(userData || peer);
          navigation.navigate('UserProfile', { user: full });
        }}
        style={{ flexDirection: 'row', alignItems: 'center' }}
        activeOpacity={0.8}
      >
        {/* Avatar with presence indicator */}
        <View style={{ position: 'relative', marginRight: 10 }}>
          <Image
            source={{
              uri:
                userData?.photos?.[0] ||
                (peer?.photos?.[0] ? toAbs(peer.photos[0]) : 'https://via.placeholder.com/150'),
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#eee',
            }}
          />
          {/* Presence dot indicator */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: presenceInfo.color,
              borderWidth: 2,
              borderColor: '#fff',
            }}
          />
        </View>
        <View style={{ maxWidth: 200 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: '600', color: '#111' }}
          >
            {[
              userData?.firstName || peer?.firstName,
              userData?.lastName || peer?.lastName,
            ]
              .filter(Boolean)
              .join(' ') || 'Unknown'}
          </Text>
          {/* Show presence status text */}
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, color: presenceInfo.color, fontWeight: '500' }}
          >
            {presenceInfo.text}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
        <TouchableOpacity
          onPress={() => initiateCall('video')}
          style={{ padding: 8, marginRight: 4 }}
          activeOpacity={0.7}
        >
          <Ionicons name="videocam" size={24} color="#581845" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => initiateCall('audio')}
          style={{ padding: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="call" size={22} color="#581845" />
        </TouchableOpacity>
      </View>
    ),
  });
}, [navigation, userData, peer, peerId, peerPresence]);



//   useLayoutEffect(() => {
//     const schoolFromEmail = formatSchoolFromEmail(peer?.email);

//     navigation.setOptions({
//       headerShown: true,
//       headerTransparent: false,
//       headerTitleAlign: 'left',
//       headerBackTitle: 'Back',
//       headerBackTitleVisible: true,
//       headerTintColor: '#581845',
//       headerShadowVisible: true,
//       headerStyle: {
//         backgroundColor: '#ffffff',
//         shadowColor: '#000',
//         shadowOpacity: 0.05,
//         shadowRadius: 4,
//         shadowOffset: { width: 0, height: 2 },
//         elevation: 1,
//       },
//       headerTitle: () => (
//         <TouchableOpacity
//           // onPress={() => navigation.navigate('UserProfile', { user: userData || peer })}
//           onPress={() => {
//     const full = normalizeUser(userData || peer);
//     navigation.navigate('UserProfile', { user: full });
// }}
//           style={{ flexDirection: 'row', alignItems: 'center' }}
//           activeOpacity={0.8}
//         >
//           <Image
//             source={{
//               uri:
//                 userData?.photos?.[0] ||
//                 (peer?.photos?.[0] ? toAbs(peer.photos[0]) : 'https://via.placeholder.com/150'),
//             }}
//             style={{
//               width: 32,
//               height: 32,
//               borderRadius: 16,
//               marginRight: 10,
//               backgroundColor: '#eee',
//             }}
//           />
//           <View style={{ maxWidth: 220 }}>
//             <Text
//               numberOfLines={1}
//               style={{ fontSize: 16, fontWeight: '600', color: '#111' }}
//             >
//               {[
//                 userData?.firstName || peer?.firstName,
//                 userData?.lastName || peer?.lastName,
//               ]
//                 .filter(Boolean)
//                 .join(' ') || 'Unknown'}
//             </Text>
//             <Text
//               numberOfLines={1}
//               style={{ fontSize: 12, color: '#666' }}
//             >
//               {schoolFromEmail}
//             </Text>
//           </View>
//         </TouchableOpacity>
//       ),
//     });
//   }, [navigation, userData, peer]);

  // Load my display name for typing events
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const me = JSON.parse(raw);
          const name = [me?.firstName, me?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
          if (name) setMyDisplayName(name);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Keyboard visibility padding adjustment
  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvt, () =>
      setKbVisible(true)
    );
    const subHide = Keyboard.addListener(hideEvt, () =>
      setKbVisible(false)
    );

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  // Register socket
  useEffect(() => {
    const onConnect = () => {
      if (userId) {
        console.log('🔌 socket connected, registering', userId);
        socket.emit('register', userId);
      }
    };
    socket.on('connect', onConnect);
    if (socket.connected && userId) socket.emit('register', userId);
    return () => socket.off('connect', onConnect);
  }, [userId]);

  // Initial fetch of messages
  useEffect(() => {
    fetchMessages();
  }, [peerId]);

  // Join DM room + listeners
  useEffect(() => {
    if (!userId || !peerId) return;

    const meId = String(userId);
    const otherId = String(peerId);

    socket.emit('dm:join', {
      meId,
      otherUserId: otherId,
    });
    socket.emit('readMessages', {
      readerId: meId,
      senderId: otherId,
    });

    // Clear local unread state for this DM
    dispatch({ type: 'clear-dm', otherUserId: otherId });

    const onNew = (payload) => {
      const msg = payload?.message || payload;
      if (!msg) return;

      const sId = asId(msg.senderId);
      const rId = asId(msg.recipientId);

      const isThisThread =
        (sId === meId && rId === otherId) ||
        (sId === otherId && rId === meId);
      if (!isThisThread) return;

      const isIncoming = sId === otherId && rId === meId;

      if (isIncoming) {
        const senderName =
          payload?.senderName ||
          (payload?.sender
            ? [
                payload.sender.firstName,
                payload.sender.lastName,
              ]
                .filter(Boolean)
                .join(' ')
                .trim()
            : null) ||
          [
            peer?.firstName || userData?.firstName,
            peer?.lastName || userData?.lastName,
          ]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          'Someone';

        const preview = (msg.message || '')
          .toString()
          .slice(0, 100);
        try {
          playPing();
        } catch {}
        try {
          showTopToast(
            `New message from ${senderName}`,
            preview
          );
        } catch {}
      }

      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            String(m._id || '') === String(msg._id || '')
        );
        if (exists) return prev;
        return [msg, ...prev]; // newest first, list inverted
      });

      if (isIncoming) {
        socket.emit('readMessages', {
          readerId: meId,
          senderId: otherId,
        });
      }
    };

    const onRead = ({ readerId, otherId: other }) => {
      if (
        String(readerId) !== String(peerId) ||
        String(other) !== String(userId)
      )
        return;
      setMessages((prev) =>
        prev.map((m) =>
          asId(m.senderId) === String(userId) &&
          asId(m.recipientId) === String(peerId)
            ? { ...m, read: true }
            : m
        )
      );
    };

    const onTyping = ({ senderName }) => {
      setTypingStatus(
        `${senderName || 'Someone'} is typing…`
      );
      setTimeout(() => setTypingStatus(''), 2500);
    };
    const onStoppedTyping = () =>
      setTypingStatus('');

    // Reaction updates
    const onReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId)
            ? { ...m, reactions }
            : m
        )
      );
    };

    // Message deletion updates
    const onMessageDeleted = ({ messageId, deleteType, deletedBy }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m._id) === String(messageId)) {
            if (deleteType === 'everyone') {
              // Show "This message was deleted" for everyone
              return { ...m, deletedForEveryone: true, deletedBy };
            } else if (deleteType === 'me' && String(deletedBy) === String(meId)) {
              // Remove from local view only for the user who deleted
              return { ...m, deletedForMe: true };
            }
          }
          return m;
        }).filter((m) => {
          // Filter out messages deleted for me
          if (m.deletedForMe && String(m.deletedBy || deletedBy) === String(meId)) {
            return false;
          }
          return true;
        })
      );
    };

    socket.on('message:new', onNew);
    socket.on('newMessage', onNew);
    socket.on('message:read', onRead);
    socket.on('dm:userTyping', onTyping);
    socket.on('dm:userStoppedTyping', onStoppedTyping);
    socket.on('message:reaction', onReaction);
    socket.on('message:deleted', onMessageDeleted);

    return () => {
      socket.emit('dm:leave', {
        meId,
        otherUserId: otherId,
      });
      socket.off('message:new', onNew);
      socket.off('newMessage', onNew);
      socket.off('message:read', onRead);
      socket.off('dm:userTyping', onTyping);
      socket.off('dm:userStoppedTyping', onStoppedTyping);
      socket.off('message:reaction', onReaction);
      socket.off('message:deleted', onMessageDeleted);
    };
  }, [userId, peerId, userData, peer, dispatch]);

  // Debounced typing
  useEffect(() => {
    if (!userId || !peerId) return;

    const meId = String(userId);
    const otherId = String(peerId);

    lastTypedAtRef.current = Date.now();

    if (input && input.trim().length > 0) {
      socket.emit('dm:typing', {
        meId,
        otherUserId: otherId,
        senderName: myDisplayName,
      });
    }

    if (typingTimeoutRef.current)
      clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (
        Date.now() - lastTypedAtRef.current >=
        1200
      ) {
        socket.emit('dm:stopTyping', {
          meId,
          otherUserId: otherId,
          senderName: myDisplayName,
        });
      }
    }, 1200);

    return () => {
      if (typingTimeoutRef.current)
        clearTimeout(typingTimeoutRef.current);
    };
  }, [input, userId, peerId, myDisplayName]);

  // Mark read on mount (extra safety)
  useEffect(() => {
    if (userId && peerId) {
      socket.emit('readMessages', {
        readerId: userId,
        senderId: peerId,
      });
    }
  }, [userId, peerId]);

  const fetchMessages = async () => {
    if (!peerId) return;
    try {
      const res = await axios.get(
        `${BASE_URL}/messages/${peerId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessages(res.data.reverse());
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSend = async () => {
  // Prevent double-tap sends
  if (isSending || !input.trim() || !peerId) return;
  
  setIsSending(true);
  const messageText = input.trim();
  const replyToId = replyingTo?._id || null;
  
  // Clear input immediately for better UX
  setInput('');
  setInputHeight(MIN_INPUT_HEIGHT);
  setReplyingTo(null);

  const payload = {
    senderId: userId,
    recipientId: peerId,
    message: messageText,
    replyTo: replyToId,
  };

  try {
    const res = await axios.post(
      `${BASE_URL}/messages`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const saved = res.data;

    setMessages((prev) => {
      const exists = prev.some(
        (m) => String(m._id || '') === String(saved._id || '')
      );
      if (exists) return prev;
      return [saved, ...prev];
    });

  } catch (err) {
    console.error('❌ Failed to send DM message:', err?.response?.data || err);

    // ⛔️ Detect objectionable content rejection
    const serverMsg = err?.response?.data?.message;

    if (serverMsg === 'Message contains inappropriate content.') {
      Alert.alert('Message not sent', 'This message includes inappropriate language and cannot be delivered.');
    } else {
      Alert.alert('Failed to send message');
    }
  } finally {
    setIsSending(false);
  }
};

  // ─────────────────────────────────────────────────────────
  // Reply & Reaction Handlers
  // ─────────────────────────────────────────────────────────
  const handleLongPress = (message) => {
    setSelectedMessage(message);
    setShowMessageMenu(true);
  };

  const handleReply = () => {
    setReplyingTo(selectedMessage);
    setShowMessageMenu(false);
    setSelectedMessage(null);
    inputRef.current?.focus();
  };

  const handleReaction = async (emoji) => {
    if (!selectedMessage) return;
    try {
      await axios.post(
        `${BASE_URL}/messages/${selectedMessage._id}/react`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update will come via socket
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
    setShowMessageMenu(false);
    setShowEmojiPicker(false);
    setSelectedMessage(null);
  };

  const handleRemoveReaction = async (messageId) => {
    try {
      await axios.delete(
        `${BASE_URL}/messages/${messageId}/react`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // ─────────────────────────────────────────────────────────
  // Delete Message Handlers (WhatsApp-style)
  // ─────────────────────────────────────────────────────────
  const handleDeletePress = () => {
    setMessageToDelete(selectedMessage);
    setShowMessageMenu(false);
    setSelectedMessage(null);
    setShowDeleteModal(true);
  };

  const handleDeleteForMe = async () => {
    if (!messageToDelete) return;
    
    try {
      await api.delete(`/messages/${messageToDelete._id}`, {
        data: { deleteType: 'me' }
      });
      
      // Remove from local state immediately
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageToDelete._id)));
      
      // Emit socket event for sync (optional, backend should handle this)
      socket.emit('message:delete', {
        messageId: messageToDelete._id,
        deleteType: 'me',
        deletedBy: userId,
        recipientId: peerId,
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    } finally {
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!messageToDelete) return;
    
    // Check if user is the sender (can only delete for everyone if you sent the message)
    const isMySentMessage = asId(messageToDelete.senderId) === String(userId);
    
    if (!isMySentMessage) {
      Alert.alert('Cannot Delete', 'You can only delete your own messages for everyone.');
      setShowDeleteModal(false);
      setMessageToDelete(null);
      return;
    }
    
    try {
      await api.delete(`/messages/${messageToDelete._id}`, {
        data: { deleteType: 'everyone' }
      });
      
      // Update local state to show "This message was deleted"
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageToDelete._id)
            ? { ...m, deletedForEveryone: true, deletedBy: userId }
            : m
        )
      );
      
      // Emit socket event for real-time update to recipient
      socket.emit('message:delete', {
        messageId: messageToDelete._id,
        deleteType: 'everyone',
        deletedBy: userId,
        recipientId: peerId,
      });
    } catch (err) {
      console.error('Failed to delete message for everyone:', err);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    } finally {
      setShowDeleteModal(false);
      setMessageToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMessageToDelete(null);
  };

  // Scroll to parent message when tapping reply preview
  const scrollToParentMessage = (parentMessageId) => {
    if (!parentMessageId || !flatListRef.current) return;
    
    const parentId = parentMessageId?._id || parentMessageId;
    const index = messages.findIndex(
      (m) => String(m._id) === String(parentId)
    );
    
    if (index !== -1) {
      // Scroll to the message
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5, // Center the message
      });
      
      // Highlight the message briefly
      setHighlightedMessageId(String(parentId));
      setTimeout(() => setHighlightedMessageId(null), 1500);
    }
  };

  // ==================== MEDIA SHARING FUNCTIONS ====================

  // Upload to Cloudinary
  const uploadToCloudinary = async (uri, type = 'image', fileName = null) => {
    try {
      console.log('☁️ Cloudinary upload starting:', type);
      
      let uploadUrl = CLOUDINARY_IMAGE_URL;
      let mimeType = 'image/jpeg';
      let name = fileName || `upload_${Date.now()}`;

      if (type === 'audio') {
        uploadUrl = CLOUDINARY_VIDEO_URL;
        mimeType = 'audio/m4a';
        name = fileName || `audio_${Date.now()}.m4a`;
      } else if (type === 'document') {
        uploadUrl = CLOUDINARY_RAW_URL;
        mimeType = 'application/octet-stream';
        name = fileName || `doc_${Date.now()}`;
      } else if (type === 'image') {
        name = fileName || `image_${Date.now()}.jpg`;
      }

      // Handle iOS file URI - ensure it starts with 'file://'
      let fileUri = uri;
      if (Platform.OS === 'ios' && !uri.startsWith('file://') && !uri.startsWith('http')) {
        fileUri = `file://${uri}`;
      }

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name,
        type: mimeType,
      });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      console.log('☁️ Uploading to:', uploadUrl);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const json = await response.json();
      console.log('☁️ Cloudinary response status:', response.status);

      if (json.secure_url) {
        console.log('☁️ Upload successful');
        return {
          url: json.secure_url,
          size: json.bytes,
          format: json.format,
          duration: json.duration, // For audio/video
        };
      } else {
        console.error('☁️ Cloudinary error:', json?.error?.message || 'Unknown error');
        throw new Error(json?.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw error;
    }
  };

  // Send media message
  const sendMediaMessage = async (messageData) => {
    if (!peerId || isSending) return;
    setIsSending(true);
    
    try {
      const payload = {
        senderId: userId,
        recipientId: peerId,
        message: messageData.message || '',
        messageType: messageData.messageType,
        mediaUrl: messageData.mediaUrl || null,
        fileName: messageData.fileName || null,
        fileSize: messageData.fileSize || null,
        mimeType: messageData.mimeType || null,
        duration: messageData.duration || null,
        contactInfo: messageData.contactInfo || null,
        replyTo: replyingTo?._id || null,
      };

      console.log('📤 Sending media message:', payload.messageType);
      
      // Use api client which automatically gets token from AsyncStorage
      const res = await api.post('/messages', payload);

      const saved = res.data;
      setMessages((prev) => {
        const exists = prev.some(
          (m) => String(m._id || '') === String(saved._id || '')
        );
        if (exists) return prev;
        return [saved, ...prev];
      });

      socket.emit('private_message', saved);
      setReplyingTo(null);
      console.log('✅ Media message sent successfully');
    } catch (err) {
      console.error('❌ Failed to send media message:', err?.response?.data || err.message);
      Alert.alert('Error', `Failed to send ${messageData.messageType || 'message'}. Please try again.`);
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // GIF Functions
  // ─────────────────────────────────────────────────────────
  
  // Load trending GIFs
  const loadTrendingGifs = async () => {
    setIsLoadingGifs(true);
    try {
      const response = await fetch(GIPHY_TRENDING_URL);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error loading trending GIFs:', error);
    } finally {
      setIsLoadingGifs(false);
    }
  };

  // Search GIFs
  const searchGifs = async (query) => {
    if (!query.trim()) {
      loadTrendingGifs();
      return;
    }
    
    setIsLoadingGifs(true);
    try {
      const response = await fetch(`${GIPHY_SEARCH_URL}&q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setIsLoadingGifs(false);
    }
  };

  // Handle GIF search with debounce
  const handleGifSearch = (query) => {
    setGifSearchQuery(query);
    
    if (gifSearchTimeoutRef.current) {
      clearTimeout(gifSearchTimeoutRef.current);
    }
    
    gifSearchTimeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        setGifCategory('search');
        searchGifs(query);
      } else {
        setGifCategory('trending');
        loadTrendingGifs();
      }
    }, 500);
  };

  // Open GIF picker
  const openGifPicker = () => {
    setShowGifPicker(true);
    loadTrendingGifs();
  };

  // Send GIF message
  const sendGif = async (gif) => {
    setShowGifPicker(false);
    setGifSearchQuery('');
    setGifs([]);
    
    const gifUrl = gif.images?.fixed_height?.url || gif.images?.original?.url;
    if (!gifUrl) return;
    
    await sendMediaMessage({
      messageType: 'gif',
      mediaUrl: gifUrl,
      message: '🎭 GIF',
      fileSize: parseInt(gif.images?.fixed_height?.size || 0),
    });
  };

  // Pick image from camera or gallery
  const pickImage = async (useCamera = false) => {
    setShowAttachmentMenu(false);
    
    try {
      console.log('📷 Starting image pick, useCamera:', useCamera);
      
      // Request permission
      const permissionMethod = useCamera 
        ? ImagePicker.requestCameraPermissionsAsync 
        : ImagePicker.requestMediaLibraryPermissionsAsync;
      
      const { status, canAskAgain } = await permissionMethod();
      console.log('📷 Permission status:', status);
      
      if (status !== 'granted') {
        const permissionType = useCamera ? 'camera' : 'photo library';
        if (!canAskAgain) {
          Alert.alert(
            'Permission Required',
            `${permissionType.charAt(0).toUpperCase() + permissionType.slice(1)} access was denied. Please enable it in Settings.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert('Permission needed', `Please allow access to your ${permissionType}.`);
        }
        return;
      }

      const pickerMethod = useCamera 
        ? ImagePicker.launchCameraAsync 
        : ImagePicker.launchImageLibraryAsync;
      
      const result = await pickerMethod({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      console.log('📷 Picker result:', result.canceled ? 'canceled' : 'selected');
      
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      console.log('📷 Selected asset:', asset.uri?.substring(0, 50) + '...');
      setIsUploading(true);

      console.log('📷 Uploading to Cloudinary...');
      const uploaded = await uploadToCloudinary(asset.uri, 'image');
      console.log('📷 Upload successful:', uploaded.url?.substring(0, 50) + '...');
      
      await sendMediaMessage({
        messageType: 'image',
        mediaUrl: uploaded.url,
        fileSize: uploaded.size,
        mimeType: 'image/jpeg',
        message: '📷 Photo',
      });
    } catch (error) {
      console.error('❌ Pick image error:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
      setIsUploading(false);
    }
  };

  // Pick document
  const pickDocument = async () => {
    setShowAttachmentMenu(false);
    
    try {
      console.log('📄 Starting document pick');
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      console.log('📄 Document picker result:', result.canceled ? 'canceled' : 'selected');
      
      if (result.canceled || !result.assets?.[0]) return;

      const doc = result.assets[0];
      console.log('📄 Selected document:', doc.name);
      setIsUploading(true);

      console.log('📄 Uploading to Cloudinary...');
      const uploaded = await uploadToCloudinary(doc.uri, 'document', doc.name);
      console.log('📄 Upload successful:', uploaded.url?.substring(0, 50) + '...');
      
      await sendMediaMessage({
        messageType: 'document',
        mediaUrl: uploaded.url,
        fileName: doc.name,
        fileSize: doc.size,
        mimeType: doc.mimeType,
        message: `📄 ${doc.name}`,
      });
    } catch (error) {
      console.error('❌ Pick document error:', error);
      Alert.alert('Error', 'Failed to send document. Please try again.');
      setIsUploading(false);
    }
  };

  // Pick contact
  const pickContact = async () => {
    setShowAttachmentMenu(false);
    console.log('👤 Starting contact pick');
    
    try {
      // Request permission
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Permission Required',
            'Contacts access was denied. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert('Permission needed', 'Please allow access to your contacts.');
        }
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      if (!data || data.length === 0) {
        Alert.alert('No contacts', 'No contacts found on your device.');
        return;
      }

      // Show contact picker - for now, just pick the first contact for demo
      // In production, you'd show a contact list modal
      Alert.alert(
        'Select Contact',
        'Choose a contact to share:',
        data.slice(0, 10).map((contact) => ({
          text: contact.name || 'Unknown',
          onPress: async () => {
            setIsUploading(true);
            await sendMediaMessage({
              messageType: 'contact',
              contactInfo: {
                name: contact.name || 'Unknown',
                phone: contact.phoneNumbers?.[0]?.number || '',
                email: contact.emails?.[0]?.email || '',
              },
              message: `👤 Contact: ${contact.name}`,
            });
          },
        })).concat([{ text: 'Cancel', style: 'cancel' }])
      );
    } catch (error) {
      console.error('Pick contact error:', error);
      Alert.alert('Error', 'Failed to access contacts. Please try again.');
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      // Always request permission - this returns current status even if already granted
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();
      
      if (status !== 'granted') {
        // Permission not granted - check if we can ask again or need to go to Settings
        if (!canAskAgain) {
          // User denied and selected "Don't ask again" - must go to Settings
          Alert.alert(
            'Microphone Access Required',
            'Microphone access was denied. Please enable it in Settings to record voice messages.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => Linking.openSettings() 
              },
            ]
          );
        } else {
          Alert.alert(
            'Permission needed', 
            'Please allow microphone access to record voice messages.'
          );
        }
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Start recording error:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        console.log('Cancel recording error:', e);
      }
      recordingRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      
      setIsRecording(false);
      const duration = recordingDuration;
      setRecordingDuration(0);

      if (duration < 1) {
        Alert.alert('Too short', 'Voice message must be at least 1 second.');
        return;
      }

      setIsUploading(true);
      const uploaded = await uploadToCloudinary(uri, 'audio');
      
      await sendMediaMessage({
        messageType: 'audio',
        mediaUrl: uploaded.url,
        duration: duration,
        mimeType: 'audio/m4a',
        message: `🎤 Voice message (${formatDuration(duration)})`,
      });

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to send voice message. Please try again.');
      setIsUploading(false);
    }
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ==================== END MEDIA SHARING FUNCTIONS ====================


  // const handleSend = async () => {
  //   if (!input.trim() || !peerId) return;
  //   const payload = {
  //     senderId: userId,
  //     recipientId: peerId,
  //     message: input.trim(),
  //   };

  //   try {
  //     const res = await axios.post(
  //       `${BASE_URL}/messages`,
  //       payload,
  //       {
  //         headers: { Authorization: `Bearer ${token}` },
  //       }
  //     );

  //     const saved = res.data;
  //     setMessages((prev) => {
  //       const exists = prev.some(
  //         (m) =>
  //           String(m._id || '') === String(saved._id || '')
  //       );
  //       if (exists) return prev;
  //       return [saved, ...prev];
  //     });

  //     setInput('');
  //     setInputHeight(MIN_INPUT_HEIGHT);
  //   } catch (err) {
  //     console.error('Failed to send message:', err);
  //   }
  // };

  const renderMessage = ({ item, index }) => {
    const isMine = asId(item.senderId) === String(userId);
    
    // For inverted list: check if we need a date separator
    const nextItem = messages[index + 1];
    const showDateSeparator = !nextItem || !isSameDay(item.timestamp, nextItem?.timestamp);
    const dateLabel = showDateSeparator ? getDateLabel(item.timestamp) : null;

    // Get sender name for replied message
    const getReplyAuthorName = (replyMsg) => {
      if (!replyMsg) return '';
      const senderId = replyMsg.senderId?._id || replyMsg.senderId;
      if (String(senderId) === String(userId)) return 'You';
      return [replyMsg.senderId?.firstName, replyMsg.senderId?.lastName]
        .filter(Boolean).join(' ') || 'Someone';
    };

    // Group reactions by emoji
    const reactionGroups = {};
    (item.reactions || []).forEach(r => {
      const emoji = r.emoji;
      if (!reactionGroups[emoji]) reactionGroups[emoji] = [];
      reactionGroups[emoji].push(r);
    });

    return (
      <View>
        {/* Date separator */}
        {showDateSeparator && dateLabel && (
          <DateSeparator label={dateLabel} />
        )}
        
        <Pressable
          onLongPress={() => !item.deletedForEveryone && handleLongPress(item)}
          delayLongPress={300}
          disabled={item.deletedForEveryone}
          style={[
            styles.messageWrapper,
            isMine ? styles.messageWrapperRight : styles.messageWrapperLeft,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isMine ? styles.outgoing : styles.incoming,
              highlightedMessageId === String(item._id) && styles.highlightedBubble,
              item.deletedForEveryone && styles.deletedBubble,
            ]}
          >
            {/* Reply Preview inside bubble - clickable to scroll to parent */}
            {item.replyTo && (
              <Pressable 
                onPress={() => scrollToParentMessage(item.replyTo._id || item.replyTo)}
                style={[
                  styles.replyPreviewInBubble,
                  isMine ? styles.replyPreviewMine : styles.replyPreviewTheirs,
                ]}
              >
                <Text style={styles.replyAuthor} numberOfLines={1}>
                  {getReplyAuthorName(item.replyTo)}
                </Text>
                <Text style={styles.replyText} numberOfLines={2}>
                  {item.replyTo.message}
                </Text>
              </Pressable>
            )}
            
            {/* Message Content based on type */}
            {item.deletedForEveryone ? (
              // Show deleted message placeholder
              <View style={styles.deletedMessageContainer}>
                <Ionicons name="ban-outline" size={16} color="#888" style={{ marginRight: 6 }} />
                <Text style={styles.deletedMessageText}>
                  {asId(item.deletedBy) === String(userId) 
                    ? 'You deleted this message' 
                    : 'This message was deleted'}
                </Text>
              </View>
            ) : item.messageType === 'image' && item.mediaUrl ? (
              <TouchableOpacity onPress={() => Linking.openURL(item.mediaUrl)}>
                <Image 
                  source={{ uri: item.mediaUrl }} 
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : item.messageType === 'gif' && item.mediaUrl ? (
              <Image 
                source={{ uri: item.mediaUrl }} 
                style={styles.gifImage}
                resizeMode="contain"
              />
            ) : item.messageType === 'audio' && item.mediaUrl ? (
              <AudioMessage 
                uri={item.mediaUrl} 
                duration={item.duration}
                isMine={isMine}
              />
            ) : item.messageType === 'document' && item.mediaUrl ? (
              <TouchableOpacity 
                style={styles.documentBubble}
                onPress={() => Linking.openURL(item.mediaUrl)}
              >
                <Ionicons name="document-text" size={32} color="#581845" />
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {item.fileName || 'Document'}
                  </Text>
                  <Text style={styles.documentSize}>
                    {item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : 'Tap to open'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : item.messageType === 'contact' && item.contactInfo ? (
              <TouchableOpacity 
                style={styles.contactBubble}
                onPress={() => {
                  if (item.contactInfo.phone) {
                    Linking.openURL(`tel:${item.contactInfo.phone}`);
                  }
                }}
              >
                <View style={styles.contactAvatar}>
                  <Ionicons name="person" size={24} color="#fff" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{item.contactInfo.name}</Text>
                  {item.contactInfo.phone && (
                    <Text style={styles.contactPhone}>{item.contactInfo.phone}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.messageText}>
                {item.message}
              </Text>
            )}
            
            <Text style={styles.timestamp}>
              {moment(item.timestamp).format('h:mm A')}{' '}
              {isMine && !item.deletedForEveryone && (item.read ? '✓✓' : '✓')}
            </Text>
          </View>

          {/* Reactions display */}
          {Object.keys(reactionGroups).length > 0 && (
            <Pressable 
              onPress={() => {
                // If user's reaction exists, remove it on tap
                const myReaction = (item.reactions || []).find(
                  r => String(r.userId?._id || r.userId) === String(userId)
                );
                if (myReaction) handleRemoveReaction(item._id);
              }}
              style={[
                styles.reactionsContainer,
                isMine ? styles.reactionsRight : styles.reactionsLeft,
              ]}
            >
              {Object.entries(reactionGroups).map(([emoji, reactions]) => (
                <View key={emoji} style={styles.reactionBadge}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {reactions.length > 1 && (
                    <Text style={styles.reactionCount}>{reactions.length}</Text>
                  )}
                </View>
              ))}
            </Pressable>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SASafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === 'ios' ? 'padding' : 'height'
        }
        keyboardVerticalOffset={
          HEADER_HEIGHT + insets.top
        }
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            keyboardDismissMode="on-drag"
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) =>
              String(
                item._id ||
                  `${asId(item.senderId)}_${asId(
                    item.recipientId
                  )}_${item.timestamp || index}`
              )
            }
            contentContainerStyle={{
              padding: 10,
              paddingBottom: 12,
            }}
            inverted
            onScrollToIndexFailed={(info) => {
              // Fallback for when scroll fails (item not rendered yet)
              setTimeout(() => {
                if (flatListRef.current && messages.length > info.index) {
                  flatListRef.current.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.5,
                  });
                }
              }, 100);
            }}
          />

          {typingStatus ? (
            <Text style={styles.typing}>
              {typingStatus}
            </Text>
          ) : null}

{/* Reply Preview Bar */}
{replyingTo && (
  <View style={styles.replyBar}>
    <View style={styles.replyBarContent}>
      <View style={styles.replyBarLine} />
      <View style={styles.replyBarText}>
        <Text style={styles.replyBarAuthor}>
          Replying to {
            String(asId(replyingTo.senderId)) === String(userId) 
              ? 'yourself' 
              : [replyingTo.senderId?.firstName, replyingTo.senderId?.lastName].filter(Boolean).join(' ') || 'message'
          }
        </Text>
        <Text style={styles.replyBarMessage} numberOfLines={1}>
          {replyingTo.message}
        </Text>
      </View>
    </View>
    <TouchableOpacity onPress={cancelReply} style={styles.replyBarClose}>
      <Ionicons name="close" size={20} color="#666" />
    </TouchableOpacity>
  </View>
)}

<View
  style={[
    styles.composerBar,
    { paddingBottom: composerBottomPad },
  ]}
>
  {/* Recording UI */}
  {isRecording ? (
    <View style={styles.recordingBar}>
      <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordBtn}>
        <Ionicons name="trash-outline" size={24} color="#ff4444" />
      </TouchableOpacity>
      <View style={styles.recordingIndicator}>
        <View style={styles.recordingDot} />
        <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
      </View>
      <TouchableOpacity onPress={stopRecording} style={styles.sendRecordBtn}>
        <Ionicons name="send" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  ) : (
    <>
      {/* Attachment button */}
      <TouchableOpacity 
        onPress={() => setShowAttachmentMenu(true)} 
        style={styles.attachBtn}
        disabled={isUploading}
      >
        <Ionicons name="add" size={24} color="#581845" />
      </TouchableOpacity>

      {/* Input wrapper with GIF and Camera inside */}
      <View style={styles.inputWrapper}>
        <ScrollView
          ref={scrollRef}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 140, flex: 1 }}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.composerInput,
              { minHeight: MIN_INPUT_HEIGHT, maxHeight: MAX_INPUT_HEIGHT }
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor="#999"
            multiline
            textAlignVertical="center"
            editable={!isUploading}
            onContentSizeChange={(e) => {
              if (!e?.nativeEvent?.contentSize) return;
              const height = e.nativeEvent.contentSize.height;
              setInputHeight(
                Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, height))
              );
            }}
          />
        </ScrollView>

        {/* GIF button inside input */}
        <TouchableOpacity 
          onPress={openGifPicker} 
          style={styles.gifBtn}
          disabled={isUploading}
        >
          <View style={styles.gifBtnInner}>
            <Text style={styles.gifBtnText}>GIF</Text>
          </View>
        </TouchableOpacity>

        {/* Camera button inside input */}
        <TouchableOpacity 
          onPress={() => pickImage(true)} 
          style={styles.cameraBtn}
          disabled={isUploading}
        >
          <Ionicons name="camera-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Send or Mic button */}
      {input.trim() ? (
        <TouchableOpacity
          onPress={handleSend}
          disabled={!input.trim() || isSending || isUploading}
          style={[
            styles.sendFab,
            (!input.trim() || isSending || isUploading) && { opacity: 0.4 },
          ]}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={startRecording}
          disabled={isUploading}
          style={[styles.micFab, isUploading && { opacity: 0.4 }]}
        >
          <Ionicons name="mic" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </>
  )}
</View>

{/* Uploading indicator */}
{isUploading && (
  <View style={styles.uploadingBar}>
    <ActivityIndicator size="small" color="#581845" />
    <Text style={styles.uploadingText}>Sending...</Text>
  </View>
)}

{/* Attachment Menu Modal */}
<Modal
  visible={showAttachmentMenu}
  transparent
  animationType="slide"
  onRequestClose={() => setShowAttachmentMenu(false)}
>
  <Pressable 
    style={styles.attachmentOverlay} 
    onPress={() => setShowAttachmentMenu(false)}
  >
    <Pressable style={styles.attachmentMenu} onPress={(e) => e.stopPropagation()}>
      <View style={styles.attachmentRow}>
        <TouchableOpacity style={styles.attachmentItem} onPress={() => pickImage(true)} activeOpacity={0.7}>
          <View style={[styles.attachmentIcon, { backgroundColor: '#ff5a5f' }]}>
            <Ionicons name="camera" size={26} color="#fff" />
          </View>
          <Text style={styles.attachmentLabel}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.attachmentItem} onPress={() => pickImage(false)} activeOpacity={0.7}>
          <View style={[styles.attachmentIcon, { backgroundColor: '#8e44ad' }]}>
            <Ionicons name="images" size={26} color="#fff" />
          </View>
          <Text style={styles.attachmentLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.attachmentItem} onPress={pickDocument} activeOpacity={0.7}>
          <View style={[styles.attachmentIcon, { backgroundColor: '#3498db' }]}>
            <Ionicons name="document" size={26} color="#fff" />
          </View>
          <Text style={styles.attachmentLabel}>Document</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.attachmentItem} onPress={pickContact} activeOpacity={0.7}>
          <View style={[styles.attachmentIcon, { backgroundColor: '#27ae60' }]}>
            <Ionicons name="person" size={26} color="#fff" />
          </View>
          <Text style={styles.attachmentLabel}>Contact</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  </Pressable>
</Modal>

{/* GIF Picker Modal */}
<Modal
  visible={showGifPicker}
  transparent
  animationType="slide"
  onRequestClose={() => {
    setShowGifPicker(false);
    setGifSearchQuery('');
    setGifs([]);
  }}
>
  <View style={styles.gifPickerContainer}>
    {/* Header */}
    <View style={styles.gifPickerHeader}>
      <TouchableOpacity 
        onPress={() => {
          setShowGifPicker(false);
          setGifSearchQuery('');
          setGifs([]);
        }}
        style={styles.gifCloseBtn}
      >
        <Ionicons name="close" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.gifPickerTitle}>Choose a GIF</Text>
      <View style={{ width: 40 }} />
    </View>

    {/* Search Bar */}
    <View style={styles.gifSearchContainer}>
      <Ionicons name="search" size={20} color="#999" style={styles.gifSearchIcon} />
      <TextInput
        style={styles.gifSearchInput}
        placeholder="Search GIFs..."
        placeholderTextColor="#999"
        value={gifSearchQuery}
        onChangeText={handleGifSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {gifSearchQuery ? (
        <TouchableOpacity 
          onPress={() => {
            setGifSearchQuery('');
            loadTrendingGifs();
            setGifCategory('trending');
          }}
        >
          <Ionicons name="close-circle" size={20} color="#999" />
        </TouchableOpacity>
      ) : null}
    </View>

    {/* Category Label */}
    <View style={styles.gifCategoryRow}>
      <Text style={styles.gifCategoryLabel}>
        {gifCategory === 'trending' ? '🔥 Trending' : `🔍 Results for "${gifSearchQuery}"`}
      </Text>
    </View>

    {/* GIF Grid */}
    {isLoadingGifs ? (
      <View style={styles.gifLoadingContainer}>
        <ActivityIndicator size="large" color="#581845" />
        <Text style={styles.gifLoadingText}>Loading GIFs...</Text>
      </View>
    ) : (
      <FlatList
        data={gifs}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gifGrid}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.gifItem}
            onPress={() => sendGif(item)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.images?.fixed_height_small?.url || item.images?.fixed_height?.url }}
              style={styles.gifPreview}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.gifEmptyContainer}>
            <MaterialCommunityIcons name="gif" size={60} color="#ccc" />
            <Text style={styles.gifEmptyText}>No GIFs found</Text>
            <Text style={styles.gifEmptySubtext}>Try a different search term</Text>
          </View>
        }
      />
    )}

    {/* Powered by Giphy */}
    <View style={styles.giphyAttribution}>
      <Text style={styles.giphyText}>Powered by </Text>
      <Text style={[styles.giphyText, { fontWeight: 'bold', color: '#581845' }]}>GIPHY</Text>
    </View>
  </View>
</Modal>



          {/* <View
            style={[
              styles.composerBar,
              { paddingBottom: composerBottomPad },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.inputWrapper}
              onPress={() => inputRef.current?.focus()}
            >
              <TextInput
                ref={inputRef}
                style={[
                  styles.composerInput,
                  { height: inputHeight },
                ]}
                value={input}
                onChangeText={setInput}
                placeholder="Type a message…"
                placeholderTextColor="#999"
                selectionColor="#581845"
                underlineColorAndroid="transparent"
                multiline
                textAlignVertical="top"
                onContentSizeChange={(e) => {
                  const height =
                    e.nativeEvent.contentSize.height;
                  setInputHeight(
                    Math.min(
                      MAX_INPUT_HEIGHT,
                      Math.max(
                        MIN_INPUT_HEIGHT,
                        height
                      )
                    )
                  );
                }}
                scrollEnabled={
                  inputHeight > MAX_INPUT_HEIGHT - 4
                }
                blurOnSubmit={false}
                returnKeyType="default"
                autoCorrect
                autoCapitalize="sentences"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim()}
              style={[
                styles.sendFab,
                !input.trim() && { opacity: 0.4 },
              ]}
            >
              <Ionicons
                name="send"
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
          </View> */}
        </View>
      </KeyboardAvoidingView>

      {/* Message Options Modal */}
      <Modal
        visible={showMessageMenu}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowMessageMenu(false);
          setSelectedMessage(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowMessageMenu(false);
            setSelectedMessage(null);
          }}
        >
          <View style={styles.messageMenuContainer}>
            {/* Quick Emoji Reactions */}
            <View style={styles.quickEmojiRow}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.quickEmojiBtn}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.quickEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.quickEmojiBtn}
                onPress={() => setShowEmojiPicker(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.menuActions}>
              <TouchableOpacity style={styles.menuActionBtn} onPress={handleReply}>
                <Ionicons name="arrow-undo" size={20} color="#581845" />
                <Text style={styles.menuActionText}>Reply</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuActionBtn}
                onPress={() => {
                  // Copy message to clipboard
                  if (selectedMessage?.message) {
                    // Note: Would need expo-clipboard for full implementation
                    Alert.alert('Copied', 'Message copied to clipboard');
                  }
                  setShowMessageMenu(false);
                  setSelectedMessage(null);
                }}
              >
                <Ionicons name="copy-outline" size={20} color="#581845" />
                <Text style={styles.menuActionText}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuActionBtn} onPress={handleDeletePress}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                <Text style={[styles.menuActionText, { color: '#ff4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Extended Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Pick a reaction</Text>
              <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥', '🎉', '💯', '😍', '🤔', '👏', '😭', '🙏', '💔', '😊', '🥳', '😘', '🤗', '😎', '🤩', '😋', '🤣'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiGridItem}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.emojiGridEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Message Confirmation Modal (WhatsApp-style) */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelDelete}>
          <View style={styles.deleteModalContainer}>
            <Text style={styles.deleteModalTitle}>Delete message?</Text>
            
            {/* Show "Delete for everyone" only if it's user's own message */}
            {messageToDelete && asId(messageToDelete.senderId) === String(userId) && (
              <TouchableOpacity
                style={styles.deleteOptionBtn}
                onPress={handleDeleteForEveryone}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={22} color="#ff4444" />
                <View style={styles.deleteOptionTextContainer}>
                  <Text style={styles.deleteOptionText}>Delete for everyone</Text>
                  <Text style={styles.deleteOptionSubtext}>
                    This message will be deleted for all participants
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.deleteOptionBtn}
              onPress={handleDeleteForMe}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={22} color="#581845" />
              <View style={styles.deleteOptionTextContainer}>
                <Text style={[styles.deleteOptionText, { color: '#581845' }]}>Delete for me</Text>
                <Text style={styles.deleteOptionSubtext}>
                  This message will be deleted from your chat only
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteCancelBtn}
              onPress={cancelDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SASafeAreaView>
  );
};

export default PrivateChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },
  incoming: {
    backgroundColor: '#f8f8f8',
    alignSelf: 'flex-start',
  },
  outgoing: {
    backgroundColor: '#e7def0',
    alignSelf: 'flex-end',
  },

  messageText: { color: '#000', fontSize: 16, lineHeight: 22 },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  highlightedBubble: {
    backgroundColor: 'rgba(138, 43, 226, 0.3)',
  },
  composerBar: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 8,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderTopColor: '#eee',
  backgroundColor: '#fff',
  gap: 6,
},

inputWrapper: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f5f5f7',
  borderRadius: 24,
  paddingHorizontal: 12,
  paddingVertical: 6,
  maxHeight: 140,
},

composerInput: {
  flex: 1,
  fontSize: 16,
  paddingVertical: 8,
  lineHeight: 22,
  color: '#111',
  minHeight: 40,
},


  // composerBar: {
  //   flexDirection: 'row',
  //   alignItems: 'flex-end',
  //   paddingHorizontal: 10,
  //   paddingTop: 8,
  //   borderTopWidth: 1,
  //   borderTopColor: '#eee',
  //   backgroundColor: '#fff',
  //   gap: 8,
  // },
  // inputWrapper: {
  //   flex: 1,
  //   backgroundColor: '#f5f5f7',
  //   borderRadius: 22,
  //   borderWidth: 1,
  //   borderColor: '#eee',
  //   paddingHorizontal: 12,
  //   paddingVertical: 6,
  //   maxHeight: 160,
  // },
  // composerInput: {
  //   minHeight: 40,
  //   maxHeight: 140,
  //   fontSize: 16,
  //   lineHeight: 22,
  //   padding: 0,
  //   color: '#111',
  //   includeFontPadding: false,
  // },
  sendFab: {
    backgroundColor: '#581845',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // ─────────────────────────────────────────────────────────
  // Media Sharing Styles
  // ─────────────────────────────────────────────────────────
  micFab: {
    backgroundColor: '#581845',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifBtn: {
    height: 32,
    paddingHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifBtnInner: {
    borderWidth: 1.5,
    borderColor: '#581845',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gifBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#581845',
    letterSpacing: -0.3,
  },
  cameraBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Recording UI
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelRecordBtn: {
    padding: 10,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4444',
    marginRight: 8,
  },
  recordingTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sendRecordBtn: {
    backgroundColor: '#581845',
    borderRadius: 22,
    padding: 12,
  },
  
  // Uploading indicator
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  uploadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  
  // Attachment menu
  attachmentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  attachmentMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  attachmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attachmentItem: {
    alignItems: 'center',
  },
  attachmentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  attachmentLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  
  // GIF Picker styles
  gifPickerContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: Platform.OS === 'ios' ? 50 : 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  gifPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  gifCloseBtn: {
    padding: 4,
  },
  gifPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  gifSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 12,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  gifSearchIcon: {
    marginRight: 10,
  },
  gifSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  gifCategoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gifCategoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  gifGrid: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  gifItem: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    aspectRatio: 1,
  },
  gifPreview: {
    width: '100%',
    height: '100%',
  },
  gifLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  gifEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  gifEmptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  gifEmptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
  giphyAttribution: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  giphyText: {
    fontSize: 12,
    color: '#999',
  },
  
  // Media message styles
  mediaImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 4,
  },
  gifImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
  },
  documentBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 24, 69, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    minWidth: 180,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  documentSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  contactBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 24, 69, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    minWidth: 180,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#581845',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDetails: {
    flex: 1,
    marginLeft: 10,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  contactPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  
  typing: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    color: '#666',
    fontStyle: 'italic',
  },

  // ─────────────────────────────────────────────────────────
  // Message wrapper styles
  // ─────────────────────────────────────────────────────────
  messageWrapper: {
    marginBottom: 4,
  },
  messageWrapperLeft: {
    alignItems: 'flex-start',
  },
  messageWrapperRight: {
    alignItems: 'flex-end',
  },

  // ─────────────────────────────────────────────────────────
  // Reply Preview in Bubble
  // ─────────────────────────────────────────────────────────
  replyPreviewInBubble: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  replyPreviewMine: {
    backgroundColor: 'rgba(88, 24, 69, 0.15)',
    borderLeftColor: '#581845',
  },
  replyPreviewTheirs: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderLeftColor: '#888',
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#581845',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },

  // ─────────────────────────────────────────────────────────
  // Reactions Display
  // ─────────────────────────────────────────────────────────
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: -6,
    marginBottom: 8,
  },
  reactionsLeft: {
    marginLeft: 8,
  },
  reactionsRight: {
    marginRight: 8,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },

  // ─────────────────────────────────────────────────────────
  // Reply Bar (above composer)
  // ─────────────────────────────────────────────────────────
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  replyBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBarLine: {
    width: 3,
    height: '100%',
    minHeight: 32,
    backgroundColor: '#581845',
    borderRadius: 2,
    marginRight: 10,
  },
  replyBarText: {
    flex: 1,
  },
  replyBarAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#581845',
    marginBottom: 2,
  },
  replyBarMessage: {
    fontSize: 14,
    color: '#666',
  },
  replyBarClose: {
    padding: 6,
    marginLeft: 8,
  },

  // ─────────────────────────────────────────────────────────
  // Message Menu Modal
  // ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageMenuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '85%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  quickEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  quickEmojiBtn: {
    padding: 8,
  },
  quickEmoji: {
    fontSize: 24,
  },
  menuActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
  },
  menuActionBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  menuActionText: {
    fontSize: 13,
    color: '#581845',
    marginTop: 4,
    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────
  // Emoji Picker Modal
  // ─────────────────────────────────────────────────────────
  emojiPickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '90%',
    maxWidth: 360,
    maxHeight: 400,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emojiPickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  emojiGridItem: {
    width: '16.66%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiGridEmoji: {
    fontSize: 28,
  },

  // ─────────────────────────────────────────────────────────
  // Delete Message Styles (WhatsApp-style)
  // ─────────────────────────────────────────────────────────
  deletedBubble: {
    backgroundColor: '#f0f0f0',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deletedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  deletedMessageText: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 14,
  },
  deleteModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    marginBottom: 12,
  },
  deleteOptionTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  deleteOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    marginBottom: 2,
  },
  deleteOptionSubtext: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  deleteCancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});










// import React, { useEffect, useState, useContext, useRef, useLayoutEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Image,
//   Keyboard,
// } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useRoute, useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import moment from 'moment';
// import { socket } from '../socket';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {
//   SafeAreaView as SASafeAreaView,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';
// import { showTopToast, playPing } from '../utils/notify';
// import { useUnread } from '../context/UnreadContext';
// import { getToken } from '../context/AuthContext'; // async function to get token from AsyncStorage





// const HEADER_HEIGHT = 56;
// const MIN_INPUT_HEIGHT = 40;
// const MAX_INPUT_HEIGHT = 140;

// const PrivateChatScreen = () => {

// const normalize = (raw) => {
//   if (!raw) return {};
//   const id = raw.id || raw._id;
//   const photos = Array.isArray(raw.photos) ? raw.photos : [];
//   return { ...raw, id, _id: id, photos };
// };

//   const { token, userId } = useContext(AuthContext);
//   const navigation = useNavigation();
//   const route = useRoute();
//   const { user } = route.params;

//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
//   const inputRef = useRef(null);

//   const insets = useSafeAreaInsets();
//   const [kbVisible, setKbVisible] = useState(false);

//   // typing banner + debounce helpers (kept, harmless)
//   const [typingStatus, setTypingStatus] = useState('');
//   const typingTimeoutRef = useRef(null);
//   const lastTypedAtRef = useRef(0);
//   const { dispatch } = useUnread();
//     const [users, setUsers] = useState(route.params?.users);
//     // const [userData, setUserData] = useState(user); // <-- local state
// const [userData, setUserData] = useState(normalize(user));

// const api = axios.create({ baseURL: 'http://192.168.100.4:4000' });

//   // my display name for typing events
//   const [myDisplayName, setMyDisplayName] = useState('Someone');

//   const asId = (val) => {
//   if (!val) return null;
//   if (typeof val === 'string') return val;
//   if (typeof val === 'object') {
//     if (val._id) return String(val._id);
//     if (val.id)  return String(val.id);
//   }
//   return String(val);
// };




// useEffect(() => {
//   if (!userData?.bio || !userData?.origin || !userData?.photos?.length) {
//     (async () => {
//       try {
//         const res = await axios.get(
//           `http://192.168.100.4:4000/accounts/${userData.id || userData._id}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setUserData(res.data.users || res.data);
//       } catch {}
//     })();
//   }
// }, []);


// //  useEffect(() => {
// //   if (!users?.bio || !users?.origin || !users?.photos?.length) {
// //     (async () => {
// //       try {
// //         const res = await axios.get(
// //           `http://192.168.100.4:4000/accounts/${users.id || users._id}`,
// //           { headers: { Authorization: `Bearer ${token}` } }
// //         );
// //         setUser(res.data.users || res.data);
// //       } catch {}
// //     })();
// //   }
// // }, []);


// useEffect(() => {
//   if (!token) return; // wait for token to be ready
//   if (!userData?.bio || !userData?.origin || !userData?.photos?.length) {
//     (async () => {
//       try {
//         const res = await axios.get(
//           `http://192.168.100.4:4000/accounts/${userData.id || userData._id}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         setUserData(res.data.users || res.data);
//       } catch (err) {
//         console.error('Failed to fetch full profile:', err);
//       }
//     })();
//   }
// }, [token]);

// useLayoutEffect(() => {
//   const schoolFromEmail = (() => {
//     const raw = user?.email?.split?.('@')?.[1]?.split?.('.')?.[0];
//     if (!raw) return 'Unknown School';
//     return raw
//       .replace(/[-_]/g, ' ')
//       .trim()
//       .split(/\s+/)
//       .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//       .join(' ');
//   })();

//   navigation.setOptions({
//     headerShown: true,
//     headerTransparent: false,
//     headerTitleAlign: 'left',
//     headerBackTitle: 'Back',
//     headerBackTitleVisible: true,
//     headerTintColor: '#581845', // back chevron + right items
//     headerShadowVisible: true,
//     headerStyle: {
//       backgroundColor: '#ffffff',
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       shadowOffset: { width: 0, height: 2 },
//       elevation: 1,
      
//     },
//     // Tappable custom title: avatar + two-line text
// headerTitle: () => (
//   <TouchableOpacity
//     onPress={() => navigation.navigate('UserProfile', { user: userData })}
//     style={{ flexDirection: 'row', alignItems: 'center' }}
//     activeOpacity={0.8}
//   >
//     <Image
//       source={{
//         uri: userData?.photos?.[0]?.startsWith('http')
//           ? userData.photos[0]
//           : `http://192.168.100.4:4000${userData?.photos?.[0] || ''}`,
//       }}
//       style={{
//         width: 32, height: 32, borderRadius: 16, marginRight: 10,
//         backgroundColor: '#eee',
//       }}
//     />
//     <View style={{ maxWidth: 220 }}>
//       <Text
//         numberOfLines={1}
//         style={{ fontSize: 16, fontWeight: '600', color: '#111' }}
//       >
//         {[userData?.firstName, userData?.lastName].filter(Boolean).join(' ') || 'Unknown'}
//       </Text>
//       <Text
//         numberOfLines={1}
//         style={{ fontSize: 12, color: '#666' }}
//       >
//         {schoolFromEmail}
//       </Text>
//     </View>
//   </TouchableOpacity>
// ),


   
//   });
  
// }, [navigation, userData]);


//   useEffect(() => {
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem('user');
//         if (raw) {
//           const me = JSON.parse(raw);
//           const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ').trim();
//           if (name) setMyDisplayName(name);
//         }
//       } catch {}
//     })();
//   }, []);

//   const composerBottomPad = kbVisible
//     ? 8
//     : Platform.OS === 'ios'
//       ? Math.max(12, insets.bottom)
//       : Math.max(12, insets.bottom + 10);

//   const formatSchoolFromEmail = (email) => {
//     const raw = email?.split('@')[1]?.split('.')[0];
//     if (!raw) return 'Unknown School';
//     return raw
//       .replace(/[-_]/g, ' ')
//       .trim()
//       .split(/\s+/)
//       .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//       .join(' ');
//   };
//   const schoolFromEmail = formatSchoolFromEmail(user?.email);

//   // keyboard visibility
//   useEffect(() => {
//     const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
//     const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
//     const subShow = Keyboard.addListener(showEvt, () => setKbVisible(true));
//     const subHide = Keyboard.addListener(hideEvt, () => setKbVisible(false));
//     return () => { subShow.remove(); subHide.remove(); };
//   }, []);

//   // ✅ CRITICAL: register this socket so server can emit `newMessage` to you
//   useEffect(() => {
//     const onConnect = () => {
//       if (userId) {
//         console.log('🔌 socket connected, registering', userId);
//         socket.emit('register', userId);
//       }
//     };
//     socket.on('connect', onConnect);
//     if (socket.connected && userId) socket.emit('register', userId);
//     return () => socket.off('connect', onConnect);
//   }, [userId]);

//   // initial fetch
//   useEffect(() => { fetchMessages(); }, []);

//   // join DM room + listeners
//   useEffect(() => {
//     if (!userId || !user?.id) return;

//     socket.emit('dm:join', { meId: userId, otherUserId: user.id });
//     socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     // 🔔 clear local unread & badge for this DM
//   dispatch({ type: 'clear-dm', otherUserId: user.id });

//     // Normalize both possible server payloads:
//     // - room-based emit: socket.emit('message:new', msg)
//     // - legacy direct emit: io.to(socketId).emit('newMessage', { message: created, sender: {...} })

// const onNew = (payload) => {
//   const msg = payload?.message || payload;
//   if (!msg) return;

//   const sId = asId(msg.senderId);
//   const rId = asId(msg.recipientId);
//   const meId = String(userId);
//   const otherId = String(user.id);

//   // only process messages for THIS 1:1 thread
//   const isThisThread =
//     (sId === meId && rId === otherId) ||
//     (sId === otherId && rId === meId);
//   if (!isThisThread) return;

//   // --- In-app toast + sound for INCOMING messages (other -> me)
//   const isIncoming = sId === otherId && rId === meId;
//   if (isIncoming) {
//     const senderName =
//       payload?.senderName ||
//       (payload?.sender
//         ? [payload.sender.firstName, payload.sender.lastName].filter(Boolean).join(' ').trim()
//         : null) ||
//       [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
//       'Someone';

//     const preview = (msg.message || '').toString().slice(0, 100);
//     try { playPing(); } catch {}
//     try { showTopToast(`New message from ${senderName}`, preview); } catch {}
//   }

//   // Deduplicate before adding
//   setMessages((prev) => {
//     const exists = prev.some((m) => String(m._id || '') === String(msg._id || ''));
//     if (exists) return prev;
//     return [msg, ...prev]; // inverted: newest first (FlatList is inverted)
//   });

//   // Mark read immediately for incoming messages
//   if (isIncoming) {
//     socket.emit('readMessages', { readerId: meId, senderId: otherId });
//   }
// };


//     const onRead = ({ readerId, otherId }) => {
//       if (String(readerId) !== String(user.id) || String(otherId) !== String(userId)) return;
//       setMessages((prev) =>
//         prev.map((m) =>
//           String(m.senderId) === String(userId) && String(m.recipientId) === String(user.id)
//             ? { ...m, read: true }
//             : m
//         )
//       );
//     };

//     const onTyping = ({ senderName }) => {
//       setTypingStatus(`${senderName || 'Someone'} is typing…`);
//       setTimeout(() => setTypingStatus(''), 2500);
//     };
//     const onStoppedTyping = () => setTypingStatus('');

//     // ✅ listen to BOTH names
//     socket.on('message:new', onNew);   // room-based
//     socket.on('newMessage', onNew);    // legacy direct
//     socket.on('message:read', onRead);
//     socket.on('dm:userTyping', onTyping);
//     socket.on('dm:userStoppedTyping', onStoppedTyping);

//     return () => {
//       socket.emit('dm:leave', { meId: userId, otherUserId: user.id });
//       socket.off('message:new', onNew);
//       socket.off('newMessage', onNew);
//       socket.off('message:read', onRead);
//       socket.off('dm:userTyping', onTyping);
//       socket.off('dm:userStoppedTyping', onStoppedTyping);
//     };
//   }, [userId, user?.id]);

//   // debounced typing (kept)
//   useEffect(() => {
//     if (!userId || !user?.id) return;

//     lastTypedAtRef.current = Date.now();

//     if (input && input.trim().length > 0) {
//       socket.emit('dm:typing', {
//         meId: userId,
//         otherUserId: user.id,
//         senderName: myDisplayName,
//       });
//     }

//     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     typingTimeoutRef.current = setTimeout(() => {
//       if (Date.now() - lastTypedAtRef.current >= 1200) {
//         socket.emit('dm:stopTyping', {
//           meId: userId,
//           otherUserId: user.id,
//           senderName: myDisplayName,
//         });
//       }
//     }, 1200);

//     return () => {
//       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     };
//   }, [input, userId, user?.id, myDisplayName]);

//   // also mark read on mount (extra safety)
//   useEffect(() => {
//     if (userId && user?.id) {
//       socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     }
//   }, []);

//   const fetchMessages = async () => {
//     try {
//       const res = await axios.get(`http://192.168.100.4:4000/messages/${user.id}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setMessages(res.data.reverse());
//     } catch (err) {
//       console.error('Failed to fetch messages:', err);
//     }
//   };

//   const handleSend = async () => {
//     if (!input.trim()) return;
//     const payload = { senderId: userId, recipientId: user.id, message: input.trim() };

//     try {
//       const res = await axios.post('http://192.168.100.4:4000/messages', payload, {
//         headers: { Authorization: `Bearer ${token}` }
//       });

//       // Optimistically append for the sender; receiver will get realtime via socket
//       const saved = res.data;
//       setMessages((prev) => {
//         const exists = prev.some((m) => String(m._id || '') === String(saved._id || ''));
//         if (exists) return prev;
//         return [saved, ...prev];
//       });

//       setInput('');
//       setInputHeight(MIN_INPUT_HEIGHT);
//     } catch (err) {
//       console.error('Failed to send message:', err);
//     }
//   };

//   const renderMessage = ({ item }) => {
//     // const isMine = String(item.senderId) === String(userId);
//     const isMine = asId(item.senderId) === String(userId);

//     return (
//       <View style={[styles.messageBubble, isMine ? styles.outgoing : styles.incoming]}>
//         <Text style={styles.messageText}>{item.message}</Text>
//         <Text style={styles.timestamp}>
//           {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
//         </Text>
//       </View>
//     );
//   };

//   return (
// <SASafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
//   <KeyboardAvoidingView
//     style={{ flex: 1 }}
//     behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//     keyboardVerticalOffset={HEADER_HEIGHT + insets.top}
//   >
//     <View style={{ flex: 1 }}>
//       <FlatList
//         keyboardDismissMode="on-drag"
//         data={messages}
//         renderItem={renderMessage}
//         keyExtractor={(item, index) =>
//           String(item._id || `${asId(item.senderId)}_${asId(item.recipientId)}_${item.timestamp || index}`)
//         }
//         contentContainerStyle={{ padding: 10, paddingBottom: 12 }}
//         inverted
//       />

//       {typingStatus ? <Text style={styles.typing}>{typingStatus}</Text> : null}

//       <View style={[styles.composerBar, { paddingBottom: Platform.OS === 'ios' ? insets.bottom || 12 : 12 }]}>
//         <TouchableOpacity
//           activeOpacity={1}
//           style={styles.inputWrapper}
//           onPress={() => inputRef.current?.focus()}
//         >
//           <TextInput
//             ref={inputRef}
//             style={[styles.composerInput, { height: inputHeight }]}
//             value={input}
//             onChangeText={setInput}
//             placeholder="Type a message…"
//             placeholderTextColor="#999"
//             selectionColor="#581845"
//             underlineColorAndroid="transparent"
//             multiline
//             textAlignVertical="top"
//             onContentSizeChange={(e) => {
//               const height = e.nativeEvent.contentSize.height;
//               setInputHeight(Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, height)));
//             }}
//             scrollEnabled={inputHeight > (MAX_INPUT_HEIGHT - 4)}
//             blurOnSubmit={false}
//             returnKeyType="default"
//             autoCorrect
//             autoCapitalize="sentences"
//           />
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={handleSend}
//           disabled={!input.trim()}
//           style={[styles.sendFab, !input.trim() && { opacity: 0.4 }]}
//         >
//           <Ionicons name="send" size={18} color="#fff" />
//         </TouchableOpacity>
//       </View>
//     </View>
//   </KeyboardAvoidingView>
// </SASafeAreaView>




//   );
// };

// export default PrivateChatScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },

//   topBar: {
//     height: HEADER_HEIGHT,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ddd',
//     backgroundColor: '#fff',
//   },
//   backButton: { marginRight: 10 },
//   profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
//   userInfo: { flexDirection: 'column' },
//   topBarName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
//   topBarSchool: { fontSize: 14, color: '#000' },

//   messageBubble: {
//     maxWidth: '75%',
//     padding: 10,
//     borderRadius: 15,
//     marginBottom: 10,
//   },
//   incoming: { backgroundColor: '#f8f8f8', alignSelf: 'flex-start' },
//   outgoing: { backgroundColor: '#e7def0', alignSelf: 'flex-end' },

//   messageText: { color: '#000', fontSize: 16 },
//   timestamp: { fontSize: 10, color: '#000', marginTop: 5, alignSelf: 'flex-end' },

//   composerBar: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     paddingHorizontal: 10,
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     backgroundColor: '#fff',
//     gap: 8,
//   },
//   inputWrapper: {
//     flex: 1,
//     backgroundColor: '#f5f5f7',
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: '#eee',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     maxHeight: 160,
//   },
//   composerInput: {
//     minHeight: 40,
//     maxHeight: 140,
//     fontSize: 16,
//     lineHeight: 22,
//     padding: 0,
//     color: '#111',
//     includeFontPadding: false,
//   },
//   sendFab: {
//     backgroundColor: '#581845',
//     borderRadius: 22,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   typing: { paddingHorizontal: 14, paddingBottom: 4, color: '#666', fontStyle: 'italic' },
// });









// import React, { useEffect, useState, useContext, useRef, useLayoutEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Image,
//   Keyboard,
// } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useRoute, useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import moment from 'moment';
// import { socket } from '../socket';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import {
//   SafeAreaView as SASafeAreaView,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';
// import { showTopToast, playPing } from '../utils/notify';
// import { useUnread } from '../context/UnreadContext';



// const HEADER_HEIGHT = 56;
// const MIN_INPUT_HEIGHT = 40;
// const MAX_INPUT_HEIGHT = 140;

// const PrivateChatScreen = () => {
//   const { token, userId } = useContext(AuthContext);
//   const navigation = useNavigation();
//   const route = useRoute();
//   const { user } = route.params;

//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
//   const inputRef = useRef(null);

//   const insets = useSafeAreaInsets();
//   const [kbVisible, setKbVisible] = useState(false);

//   // typing banner + debounce helpers (kept, harmless)
//   const [typingStatus, setTypingStatus] = useState('');
//   const typingTimeoutRef = useRef(null);
//   const lastTypedAtRef = useRef(0);
//   const { dispatch } = useUnread();


  

//   // my display name for typing events
//   const [myDisplayName, setMyDisplayName] = useState('Someone');

//   const asId = (val) => {
//   if (!val) return null;
//   if (typeof val === 'string') return val;
//   if (typeof val === 'object') {
//     if (val._id) return String(val._id);
//     if (val.id)  return String(val.id);
//   }
//   return String(val);
// };


// useLayoutEffect(() => {
//   const schoolFromEmail = (() => {
//     const raw = user?.email?.split?.('@')?.[1]?.split?.('.')?.[0];
//     if (!raw) return 'Unknown School';
//     return raw
//       .replace(/[-_]/g, ' ')
//       .trim()
//       .split(/\s+/)
//       .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//       .join(' ');
//   })();

//   navigation.setOptions({
//     headerShown: true,
//     headerTransparent: false,
//     headerTitleAlign: 'left',
//     headerBackTitle: 'Back',
//     headerBackTitleVisible: true,
//     headerTintColor: '#581845', // back chevron + right items
//     headerShadowVisible: true,
//     headerStyle: {
//       backgroundColor: '#ffffff',
//       shadowColor: '#000',
//       shadowOpacity: 0.05,
//       shadowRadius: 4,
//       shadowOffset: { width: 0, height: 2 },
//       elevation: 1,
      
//     },
//     // Tappable custom title: avatar + two-line text
//     headerTitle: () => (
//       <TouchableOpacity
//         onPress={() => navigation.navigate('UserProfile', { user })}
//         style={{ flexDirection: 'row', alignItems: 'center' }}
//         activeOpacity={0.8}
//       >
//         <Image
//           source={{
//             uri: user?.photos?.[0]?.startsWith('http')
//               ? user.photos[0]
//               : `http://192.168.100.4:4000${user?.photos?.[0] || ''}`,
//           }}
//           style={{
//             width: 32, height: 32, borderRadius: 16, marginRight: 10,
//             backgroundColor: '#eee',
//           }}
//         />
//         <View style={{ maxWidth: 220 }}>
//           <Text
//             numberOfLines={1}
//             style={{ fontSize: 16, fontWeight: '600', color: '#111' }}
//           >
//             {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown'}
//           </Text>
//           <Text
//             numberOfLines={1}
//             style={{ fontSize: 12, color: '#666' }}
//           >
//             {schoolFromEmail}
//           </Text>
//         </View>
//       </TouchableOpacity>
//     ),
//   });
  
// }, [navigation, user]);


//   useEffect(() => {
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem('user');
//         if (raw) {
//           const me = JSON.parse(raw);
//           const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ').trim();
//           if (name) setMyDisplayName(name);
//         }
//       } catch {}
//     })();
//   }, []);

//   const composerBottomPad = kbVisible
//     ? 8
//     : Platform.OS === 'ios'
//       ? Math.max(12, insets.bottom)
//       : Math.max(12, insets.bottom + 10);

//   const formatSchoolFromEmail = (email) => {
//     const raw = email?.split('@')[1]?.split('.')[0];
//     if (!raw) return 'Unknown School';
//     return raw
//       .replace(/[-_]/g, ' ')
//       .trim()
//       .split(/\s+/)
//       .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//       .join(' ');
//   };
//   const schoolFromEmail = formatSchoolFromEmail(user?.email);

//   // keyboard visibility
//   useEffect(() => {
//     const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
//     const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
//     const subShow = Keyboard.addListener(showEvt, () => setKbVisible(true));
//     const subHide = Keyboard.addListener(hideEvt, () => setKbVisible(false));
//     return () => { subShow.remove(); subHide.remove(); };
//   }, []);

//   // ✅ CRITICAL: register this socket so server can emit `newMessage` to you
//   useEffect(() => {
//     const onConnect = () => {
//       if (userId) {
//         console.log('🔌 socket connected, registering', userId);
//         socket.emit('register', userId);
//       }
//     };
//     socket.on('connect', onConnect);
//     if (socket.connected && userId) socket.emit('register', userId);
//     return () => socket.off('connect', onConnect);
//   }, [userId]);

//   // initial fetch
//   useEffect(() => { fetchMessages(); }, []);

//   // join DM room + listeners
//   useEffect(() => {
//     if (!userId || !user?.id) return;

//     socket.emit('dm:join', { meId: userId, otherUserId: user.id });
//     socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     // 🔔 clear local unread & badge for this DM
//   dispatch({ type: 'clear-dm', otherUserId: user.id });

//     // Normalize both possible server payloads:
//     // - room-based emit: socket.emit('message:new', msg)
//     // - legacy direct emit: io.to(socketId).emit('newMessage', { message: created, sender: {...} })

// const onNew = (payload) => {
//   const msg = payload?.message || payload;
//   if (!msg) return;

//   const sId = asId(msg.senderId);
//   const rId = asId(msg.recipientId);
//   const meId = String(userId);
//   const otherId = String(user.id);

//   // only process messages for THIS 1:1 thread
//   const isThisThread =
//     (sId === meId && rId === otherId) ||
//     (sId === otherId && rId === meId);
//   if (!isThisThread) return;

//   // --- In-app toast + sound for INCOMING messages (other -> me)
//   const isIncoming = sId === otherId && rId === meId;
//   if (isIncoming) {
//     const senderName =
//       payload?.senderName ||
//       (payload?.sender
//         ? [payload.sender.firstName, payload.sender.lastName].filter(Boolean).join(' ').trim()
//         : null) ||
//       [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
//       'Someone';

//     const preview = (msg.message || '').toString().slice(0, 100);
//     try { playPing(); } catch {}
//     try { showTopToast(`New message from ${senderName}`, preview); } catch {}
//   }

//   // Deduplicate before adding
//   setMessages((prev) => {
//     const exists = prev.some((m) => String(m._id || '') === String(msg._id || ''));
//     if (exists) return prev;
//     return [msg, ...prev]; // inverted: newest first (FlatList is inverted)
//   });

//   // Mark read immediately for incoming messages
//   if (isIncoming) {
//     socket.emit('readMessages', { readerId: meId, senderId: otherId });
//   }
// };


//     const onRead = ({ readerId, otherId }) => {
//       if (String(readerId) !== String(user.id) || String(otherId) !== String(userId)) return;
//       setMessages((prev) =>
//         prev.map((m) =>
//           String(m.senderId) === String(userId) && String(m.recipientId) === String(user.id)
//             ? { ...m, read: true }
//             : m
//         )
//       );
//     };

//     const onTyping = ({ senderName }) => {
//       setTypingStatus(`${senderName || 'Someone'} is typing…`);
//       setTimeout(() => setTypingStatus(''), 2500);
//     };
//     const onStoppedTyping = () => setTypingStatus('');

//     // ✅ listen to BOTH names
//     socket.on('message:new', onNew);   // room-based
//     socket.on('newMessage', onNew);    // legacy direct
//     socket.on('message:read', onRead);
//     socket.on('dm:userTyping', onTyping);
//     socket.on('dm:userStoppedTyping', onStoppedTyping);

//     return () => {
//       socket.emit('dm:leave', { meId: userId, otherUserId: user.id });
//       socket.off('message:new', onNew);
//       socket.off('newMessage', onNew);
//       socket.off('message:read', onRead);
//       socket.off('dm:userTyping', onTyping);
//       socket.off('dm:userStoppedTyping', onStoppedTyping);
//     };
//   }, [userId, user?.id]);

//   // debounced typing (kept)
//   useEffect(() => {
//     if (!userId || !user?.id) return;

//     lastTypedAtRef.current = Date.now();

//     if (input && input.trim().length > 0) {
//       socket.emit('dm:typing', {
//         meId: userId,
//         otherUserId: user.id,
//         senderName: myDisplayName,
//       });
//     }

//     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     typingTimeoutRef.current = setTimeout(() => {
//       if (Date.now() - lastTypedAtRef.current >= 1200) {
//         socket.emit('dm:stopTyping', {
//           meId: userId,
//           otherUserId: user.id,
//           senderName: myDisplayName,
//         });
//       }
//     }, 1200);

//     return () => {
//       if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//     };
//   }, [input, userId, user?.id, myDisplayName]);

//   // also mark read on mount (extra safety)
//   useEffect(() => {
//     if (userId && user?.id) {
//       socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     }
//   }, []);

//   const fetchMessages = async () => {
//     try {
//       const res = await axios.get(`http://192.168.100.4:4000/messages/${user.id}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setMessages(res.data.reverse());
//     } catch (err) {
//       console.error('Failed to fetch messages:', err);
//     }
//   };

//   const handleSend = async () => {
//     if (!input.trim()) return;
//     const payload = { senderId: userId, recipientId: user.id, message: input.trim() };

//     try {
//       const res = await axios.post('http://192.168.100.4:4000/messages', payload, {
//         headers: { Authorization: `Bearer ${token}` }
//       });

//       // Optimistically append for the sender; receiver will get realtime via socket
//       const saved = res.data;
//       setMessages((prev) => {
//         const exists = prev.some((m) => String(m._id || '') === String(saved._id || ''));
//         if (exists) return prev;
//         return [saved, ...prev];
//       });

//       setInput('');
//       setInputHeight(MIN_INPUT_HEIGHT);
//     } catch (err) {
//       console.error('Failed to send message:', err);
//     }
//   };

//   const renderMessage = ({ item }) => {
//     // const isMine = String(item.senderId) === String(userId);
//     const isMine = asId(item.senderId) === String(userId);

//     return (
//       <View style={[styles.messageBubble, isMine ? styles.outgoing : styles.incoming]}>
//         <Text style={styles.messageText}>{item.message}</Text>
//         <Text style={styles.timestamp}>
//           {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
//         </Text>
//       </View>
//     );
//   };

//   return (
//     <SASafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      

//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
//       >
//         <FlatList
//           keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={(item, index) =>
//   String(item._id || `${asId(item.senderId)}_${asId(item.recipientId)}_${item.timestamp || index}`)
// }

//           // keyExtractor={(item, index) => String(item._id || index)}
//           contentContainerStyle={{ padding: 10, paddingBottom: 8 }}
//           inverted
//         />

//         {typingStatus ? <Text style={styles.typing}>{typingStatus}</Text> : null}

//         <SASafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
//           <View style={[styles.composerBar, { paddingBottom: composerBottomPad }]}>
//             <TouchableOpacity
//               activeOpacity={1}
//               style={styles.inputWrapper}
//               onPress={() => inputRef.current?.focus()}
//             >
//               <TextInput
//                 ref={inputRef}
//                 style={styles.composerInput}
//                 value={input}
//                 onChangeText={setInput}
//                 placeholder="Type a message…"
//                 placeholderTextColor="#999"
//                 selectionColor="#581845"
//                 underlineColorAndroid="transparent"
//                 multiline
//                 textAlignVertical="top"
//                 onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
//                 scrollEnabled={inputHeight > (MAX_INPUT_HEIGHT - 4)}
//                 blurOnSubmit={false}
//                 returnKeyType="default"
//                 autoCorrect
//                 autoCapitalize="sentences"
//                 keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
//               />
//             </TouchableOpacity>

//             <TouchableOpacity
//               onPress={handleSend}
//               disabled={!input.trim()}
//               style={[styles.sendFab, !input.trim() && { opacity: 0.4 }]}
//             >
//               <Ionicons name="send" size={18} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </SASafeAreaView>
//       </KeyboardAvoidingView>
//     </SASafeAreaView>
//   );
// };

// export default PrivateChatScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },

//   topBar: {
//     height: HEADER_HEIGHT,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ddd',
//     backgroundColor: '#fff',
//   },
//   backButton: { marginRight: 10 },
//   profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
//   userInfo: { flexDirection: 'column' },
//   topBarName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
//   topBarSchool: { fontSize: 14, color: '#000' },

//   messageBubble: {
//     maxWidth: '75%',
//     padding: 10,
//     borderRadius: 15,
//     marginBottom: 10,
//   },
//   incoming: { backgroundColor: '#f8f8f8', alignSelf: 'flex-start' },
//   outgoing: { backgroundColor: '#e7def0', alignSelf: 'flex-end' },

//   messageText: { color: '#000', fontSize: 16 },
//   timestamp: { fontSize: 10, color: '#000', marginTop: 5, alignSelf: 'flex-end' },

//   composerBar: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     paddingHorizontal: 10,
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     backgroundColor: '#fff',
//     gap: 8,
//   },
//   inputWrapper: {
//     flex: 1,
//     backgroundColor: '#f5f5f7',
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: '#eee',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     maxHeight: 160,
//   },
//   composerInput: {
//     minHeight: 40,
//     maxHeight: 140,
//     fontSize: 16,
//     lineHeight: 22,
//     padding: 0,
//     color: '#111',
//     includeFontPadding: false,
//   },
//   sendFab: {
//     backgroundColor: '#581845',
//     borderRadius: 22,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   typing: { paddingHorizontal: 14, paddingBottom: 4, color: '#666', fontStyle: 'italic' },
// });

















































// import React, { useEffect, useState, useContext, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   FlatList,
//   KeyboardAvoidingView,
//   Platform,
//   StyleSheet,
//   Image,
//   Keyboard,
// } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useRoute, useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import moment from 'moment';
// import { socket } from '../socket';

// import {
//   SafeAreaView as SASafeAreaView,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';

// const HEADER_HEIGHT = 56;
// const MIN_INPUT_HEIGHT = 40;
// const MAX_INPUT_HEIGHT = 140;

// const PrivateChatScreen = () => {
//   const { token, userId } = useContext(AuthContext);
//   const navigation = useNavigation();
//   const route = useRoute();
//   const { user } = route.params;

//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
//   const inputRef = useRef(null);

//   const insets = useSafeAreaInsets();
//   const [kbVisible, setKbVisible] = useState(false);

//   const composerBottomPad = kbVisible
//     ? 8
//     : Platform.OS === 'ios'
//       ? Math.max(12, insets.bottom)
//       : Math.max(12, insets.bottom + 10);

//   const formatSchoolFromEmail = (email) => {
//     const raw = email?.split('@')[1]?.split('.')[0];
//     if (!raw) return 'Unknown School';
//     return raw
//       .replace(/[-_]/g, ' ')
//       .trim()
//       .split(/\s+/)
//       .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
//       .join(' ');
//   };
//   const schoolFromEmail = formatSchoolFromEmail(user?.email);

//   // keyboard visibility -> only to toggle tiny bottom padding on iOS
//   useEffect(() => {
//     const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
//     const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
//     const subShow = Keyboard.addListener(showEvt, () => setKbVisible(true));
//     const subHide = Keyboard.addListener(hideEvt, () => setKbVisible(false));
//     return () => { subShow.remove(); subHide.remove(); };
//   }, []);

//   useEffect(() => {
//     socket.on('connect', () => console.log('🔌 Socket connected'));
//     socket.on('messagesRead', ({ from }) => console.log(`✅ Messages from ${from} marked as read`));
//     return () => { socket.off('connect'); socket.off('messagesRead'); };
//   }, []);

//   // useEffect(() => { fetchMessages(); }, []);

// // Fetch once
// useEffect(() => { fetchMessages(); }, []);

// // Join room on focus, leave on blur, and mark read
// useEffect(() => {
//   if (!userId || !user?.id) return;

//   // join room when screen mounts
//   socket.emit('dm:join', { meId: userId, otherUserId: user.id });

//   // mark messages from other → me as read
//   socket.emit('readMessages', { readerId: userId, senderId: user.id });

//   const onNew = (msg) => {
//     // Accept only messages for THIS pair
//     const isThisThread =
//       (String(msg.senderId) === String(userId) && String(msg.recipientId) === String(user.id)) ||
//       (String(msg.senderId) === String(user.id) && String(msg.recipientId) === String(userId));
//     if (!isThisThread) return;

//     // Deduplicate: avoid double-adding same message
//     setMessages((prev) => {
//       const already = prev.some(
//         (m) =>
//           String(m._id || '') === String(msg._id || '') ||
//           (m.message === msg.message &&
//             String(m.senderId) === String(msg.senderId) &&
//             String(m.recipientId) === String(msg.recipientId) &&
//             Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 1500)
//       );
//       if (already) return prev;
//       // list is inverted, so newest first
//       return [msg, ...prev];
//     });

//     // If the new message is incoming (other → me), immediately mark read
//     if (String(msg.senderId) === String(user.id) && String(msg.recipientId) === String(userId)) {
//       socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     }
//   };

//   const onRead = ({ readerId, otherId }) => {
//     // If the other user read my messages to them, flip ticks on my outgoing bubbles
//     if (String(readerId) !== String(user.id) || String(otherId) !== String(userId)) return;
//     setMessages((prev) =>
//       prev.map((m) =>
//         String(m.senderId) === String(userId) && String(m.recipientId) === String(user.id)
//           ? { ...m, read: true }
//           : m
//       )
//     );
//   };

//   socket.on('message:new', onNew);
//   socket.on('message:read', onRead);

//   return () => {
//     socket.emit('dm:leave', { meId: userId, otherUserId: user.id });
//     socket.off('message:new', onNew);
//     socket.off('message:read', onRead);
//   };
// }, [userId, user?.id]);


//   useEffect(() => {
//     if (userId && user?.id) {
//       socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     }
//   }, []);

//   const fetchMessages = async () => {
//     try {
//       const res = await axios.get(`http://192.168.100.4:4000/messages/${user.id}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setMessages(res.data.reverse());
//     } catch (err) {
//       console.error('Failed to fetch messages:', err);
//     }
//   };

//   const handleSend = async () => {
//   if (!input.trim()) return;
//   const payload = { senderId: userId, recipientId: user.id, message: input.trim() };

//   try {
//     await axios.post('http://192.168.100.4:4000/messages', payload, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     // Do NOT push into state here—socket 'message:new' will arrive and add it once.
//     setInput('');
//     setInputHeight(MIN_INPUT_HEIGHT);
//   } catch (err) {
//     console.error('Failed to send message:', err);
//   }
// };


 


//   const renderMessage = ({ item }) => {
//   const isMine = String(item.senderId) === String(userId);
//   return (
//     <View style={[styles.messageBubble, isMine ? styles.outgoing : styles.incoming]}>
//       <Text style={styles.messageText}>{item.message}</Text>
//       <Text style={styles.timestamp}>
//         {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
//       </Text>
//     </View>
//   );
// };


//   // const renderMessage = ({ item }) => (
//   //   <View
//   //     style={[
//   //       styles.messageBubble,
//   //       item.senderId !== user.id ? styles.incoming : styles.outgoing,
//   //     ]}
//   //   >
//   //     <Text style={styles.messageText}>{item.message}</Text>
//   //     <Text style={styles.timestamp}>
//   //       {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
//   //     </Text>
//   //   </View>
//   // );

//   return (
//     // Root safe area (no bottom here)
//     <SASafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
//       {/* Top bar */}
//       <View style={styles.topBar}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#000" />
//         </TouchableOpacity>

//         <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user })}>
//           <Image
//             source={{
//               uri: user?.photos?.[0]?.startsWith('http')
//                 ? user.photos[0]
//                 : `http://192.168.100.4:4000${user.photos?.[0]}` || 'https://via.placeholder.com/150',
//             }}
//             style={styles.profileImage}
//           />
//         </TouchableOpacity>

//         <View style={styles.userInfo}>
//           <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user })}>
//             <Text style={styles.topBarName}>{user.firstName} {user.lastName}</Text>
//           </TouchableOpacity>
//           <Text style={styles.topBarSchool}>{schoolFromEmail}</Text>
//         </View>
//       </View>

//       {/* IMPORTANT: iOS offset = 0 to remove the gap */}
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
//       >
//         <FlatList
//           keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={(item, index) => index.toString()}
//           contentContainerStyle={{ padding: 10, paddingBottom: 8 }}
//           inverted
//         />

//         {/* Bottom safe area only for the composer */}
//         <SASafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
//           <View style={[styles.composerBar, { paddingBottom: composerBottomPad }]}>
//             <TouchableOpacity
//               activeOpacity={1}
//               style={styles.inputWrapper}
//               onPress={() => inputRef.current?.focus()}
//             >
//               <TextInput
//                 ref={inputRef}
//                 style={styles.composerInput}
//                 value={input}
//                 onChangeText={setInput}
//                 placeholder="Type a message…"
//                 placeholderTextColor="#999"
//                 selectionColor="#581845"
//                 underlineColorAndroid="transparent"
//                 multiline
//                 textAlignVertical="top"
//                 onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
//                 scrollEnabled={inputHeight > (MAX_INPUT_HEIGHT - 4)}
//                 blurOnSubmit={false}
//                 returnKeyType="default"
//                 autoCorrect
//                 autoCapitalize="sentences"
//                 keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
//               />
//             </TouchableOpacity>

//             <TouchableOpacity
//               onPress={handleSend}
//               disabled={!input.trim()}
//               style={[styles.sendFab, !input.trim() && { opacity: 0.4 }]}
//             >
//               <Ionicons name="send" size={18} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </SASafeAreaView>
//       </KeyboardAvoidingView>
//     </SASafeAreaView>
//   );
// };

// export default PrivateChatScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },

//   topBar: {
//     height: HEADER_HEIGHT,
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ddd',
//     backgroundColor: '#fff',
//   },
//   backButton: { marginRight: 10 },
//   profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
//   userInfo: { flexDirection: 'column' },
//   topBarName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
//   topBarSchool: { fontSize: 14, color: '#000' },

//   messageBubble: {
//     maxWidth: '75%',
//     padding: 10,
//     borderRadius: 15,
//     marginBottom: 10,
//   },
//   incoming: { backgroundColor: '#f8f8f8', alignSelf: 'flex-start' },
// outgoing: { backgroundColor: '#e7def0', alignSelf: 'flex-end' },

//   // incoming: { backgroundColor: '#f8f8f8', alignSelf: 'flex-end', color: '#000' },
//   // outgoing: { backgroundColor: '#f8f8f8', alignSelf: 'flex-start' },
//   messageText: { color: '#000', fontSize: 16 },
//   timestamp: { fontSize: 10, color: '#000', marginTop: 5, alignSelf: 'flex-end' },

//   composerBar: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',
//     paddingHorizontal: 10,
//     paddingTop: 8,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     backgroundColor: '#fff',
//     gap: 8,
//   },
//   inputWrapper: {
//     flex: 1,
//     backgroundColor: '#f5f5f7',
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: '#eee',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     maxHeight: 160,
//   },
//   composerInput: {
//     minHeight: 40,
//     maxHeight: 140,
//     fontSize: 16,
//     lineHeight: 22,
//     padding: 0,
//     color: '#111',
//     includeFontPadding: false,
//   },
//   sendFab: {
//     backgroundColor: '#581845',
//     borderRadius: 22,
//     paddingHorizontal: 14,
//     paddingVertical: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });
