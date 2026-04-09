


import React, { useState, useEffect, useRef, useContext, useLayoutEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
  PanResponder, Keyboard, ScrollView, Modal, Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import io from 'socket.io-client';
import { socket } from '../socket';
import axios from 'axios';
import EmojiSelector from 'react-native-emoji-selector';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';

// import { useNavigation, useRoute } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { showTopToast, playPing } from '../utils/notify';
 import { useUnread } from '../context/UnreadContext';
 import containsObjectionableContent from '../utils/filterObjectionableContent'; // adjust path if needed
 import { 
   getMyConnections, 
   getConnectionStatus, 
   getConnectionCount, 
   sendConnectionRequest, 
   cancelConnectionRequest 
 } from '../services/connection.service';
import OnboardingOverlay from '../components/OnboardingOverlay';




import {
  SafeAreaView as SASafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const BASE_URL = 'https://three4th-street-backend.onrender.com';
const API_MESSAGES_URL = `${BASE_URL}/api/chatroom-messages`;
const SOCKET_SERVER_URL = BASE_URL;

const HEADER_HEIGHT_FALLBACK = 56;
const MIN_INPUT_HEIGHT = 40;
const MAX_INPUT_HEIGHT = 140;

// Fallback avatar
const FallbackImage = require('../assets/icon.png');

export default function ChatRoomScreen({ route }) {
  const routeHook = useRoute();
  const navigation = useNavigation();
  const headerHeightFromNav = useHeaderHeight?.() || HEADER_HEIGHT_FALLBACK;
  //  const { dispatch } = useUnread();
   const unreadCtx = useUnread();
  const dispatch = unreadCtx?.dispatch;
  const isFocused = useIsFocused();



  const chatroomName =
    route?.params?.chatroomName ||
    routeHook?.params?.chatroomName ||
    route?.params?.room?.name ||
    routeHook?.params?.room?.name ||
    'Chat';


useLayoutEffect(() => {
  navigation.setOptions({
    title: chatroomName,
    headerBackTitle: 'Back',
    headerBackTitleVisible: true,      // hide back text
    headerTintColor: '#581845',         // icon tint
    headerTitleStyle: { color: '#222' },
    headerLeft: undefined,              // 👈 restores NATIVE button
  });
}, [navigation, chatroomName]);

    
 

  const chatroomId = route?.params?.chatroomId;

  const { user } = useContext(AuthContext);
  const [currentUserId, setCurrentUserId] = useState(null);

  // 👇 Who am I? (used for "<name> is typing…")
const [displayName, setDisplayName] = useState('Someone');

useEffect(() => {
  // Prefer AuthContext name
  const nameFromCtx = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (nameFromCtx) {
    setDisplayName(nameFromCtx);
    return;
  }
  // Fallback to whatever is in AsyncStorage
  (async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      if (!raw) return;
      const u = JSON.parse(raw);
      const nameFromStore = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
      if (nameFromStore) setDisplayName(nameFromStore);
    } catch {}
  })();
}, [user?.firstName, user?.lastName]);


  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingStatus, setTypingStatus] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  // @ Mention autocomplete state
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Message actions state
  const [selectedMessage, setSelectedMessage] = useState(null);
  const highlightAnim = useRef(new Animated.Value(0)).current;

  // Flash highlight animation for scroll-to-message
  const flashHighlight = (msgId) => {
    setSelectedMessage(msgId);
    highlightAnim.setValue(1);
    Animated.sequence([
      Animated.timing(highlightAnim, { toValue: 0.3, duration: 300, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 0.3, duration: 300, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.timing(highlightAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start(() => setSelectedMessage(null));
  };
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({}); // Track which messages have replies expanded
  
  // Connection status per user: { odId: { status: 'none'|'pending'|'connected', count: number, loading: boolean } }
  const [userConnectionData, setUserConnectionData] = useState({});
  const fetchedConnectionUsers = useRef(new Set());
  
  // Store message refs for scrolling to replied messages
  const messageRefs = useRef({});

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingMessage, setReportingMessage] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  
  const REPORT_REASONS = [
    'Spam or misleading',
    'Hate speech or harassment', 
    'Violence or dangerous content',
    'Nudity or sexual content',
    'False information',
    'Other',
  ];
  const initialScrollDone = useRef(false);

  // const socketRef = useRef(null);
  const flatListRef = useRef(null);
  
  // Floating button visibility (show when scrolled up)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Track scroll position to show/hide FAB
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    // Show FAB when user scrolls more than 200px from bottom
    setShowScrollToBottom(distanceFromBottom > 200);
  };
  
  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  // --- Keyboard state (for spacing)
  const insets = useSafeAreaInsets();
  const [kbVisible, setKbVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      setKbVisible(true);
      if (e?.endCoordinates?.height) setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => {
      setKbVisible(false);
      setKeyboardHeight(0);
    };

    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => { s1.remove(); s2.remove(); };
  }, []);



  // Minimal internal padding; safe area is applied by SASafeAreaView.
  const composerBottomPad = kbVisible
    ? (Platform.OS === 'ios' ? 4 : 2)     // while typing: tiny cushion
    : (Platform.OS === 'ios' ? 2 : 2);    // idle: keep it tight (safe area still applies on iOS)

  // Adaptive Android lift during typing so TextInput is fully visible on all keyboards.
  const ANDROID_KEYBOARD_BUMP =
    Platform.OS === 'android' && kbVisible
      ? Math.min(36, Math.max(18, Math.round((keyboardHeight || 280) * 0.12)))
      : 0;

  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const inputRef = useRef(null);

  const typingTimeoutRef = useRef(null);
const lastTypedAtRef = useRef(0);



  // ------- helpers (same logic as yours)
  const verifiedCache = useRef(new Map());
  const verifiedLoaded = useRef(false);

  const toAbs = (p) => (p && typeof p === 'string' && !p.startsWith('http') ? `${BASE_URL}${p}` : p);
  const normalizeUser = (raw) => {
    if (!raw) return null;
    const photos = Array.isArray(raw.photos) ? raw.photos.map(toAbs) : [];
    return { ...raw, id: raw.id || raw._id, _id: raw._id || raw.id, photos, avatarUrl: photos?.[0] || toAbs(raw.avatarUrl) };
  };
  const getSenderObject = (item) => (item?.senderId && typeof item.senderId === 'object') ? item.senderId
    : (item?.sender && typeof item.sender === 'object') ? item.sender : null;
  const getSenderId = (item) => {
    if (!item) return null;
    if (item.senderId && typeof item.senderId === 'object') return item.senderId._id || item.senderId.id;
    if (item.senderId) return item.senderId;
    if (item.sender && typeof item.sender === 'object') return item.sender._id || item.sender.id;
    return null;
  };
  const myIdSet = () => {
    const ids = [];
    if (user?.id) ids.push(String(user.id));
    if (user?._id) ids.push(String(user._id));
    if (currentUserId) ids.push(String(currentUserId));
    return new Set(ids.filter(Boolean));
  };
  const isSelfMessage = (item) => {
    const mine = myIdSet();
    const senderId = getSenderId(item);
    const embedded = getSenderObject(item);
    const embeddedId = embedded?._id || embedded?.id;
    return (senderId && mine.has(String(senderId))) || (embeddedId && mine.has(String(embeddedId)));
  };
  const ensureVerifiedCache = async () => {
    if (verifiedLoaded.current && verifiedCache.current.size > 0) return;
    try {
      const res = await api.get('/accounts/verified');
      const list = Array.isArray(res?.data) ? res.data : [];
      list.forEach((u) => {
        const n = normalizeUser(u);
        if (!n?.id) return;
        verifiedCache.current.set(String(n.id), n);
        verifiedCache.current.set(String(n._id), n);
      });
      verifiedLoaded.current = true;
    } catch { verifiedLoaded.current = true; }
  };
  const openUserProfile = async (item) => {
    if (isSelfMessage(item)) return;
    try {
      const embedded = normalizeUser(getSenderObject(item));
      const senderId = embedded?.id || getSenderId(item);
      await ensureVerifiedCache();
      const fromCache = verifiedCache.current.get(String(senderId));
      const nav = (u) => {
        const parent = navigation.getParent?.();
        (parent || navigation).navigate('UserProfile', { user: u });
      };
      if (fromCache) return nav(fromCache);
      const res = await api.get(`/accounts/${senderId}`).catch(() => null);
      const full = normalizeUser(res?.data?.user || res?.data);
      return nav(full || (embedded || normalizeUser({ _id: senderId, firstName: item?.senderName || 'Unknown' })));
    } catch {}
  };

  // ========== @ MENTION AUTOCOMPLETE LOGIC ==========
  
  // Fetch connections when screen mounts
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    if (connections.length > 0) return; // Already loaded
    
    setLoadingConnections(true);
    try {
      const result = await getMyConnections();
      let connectionList = [];
      
      console.log('Connections API response:', JSON.stringify(result, null, 2));
      
      // Handle different API response formats (same as CreatePostModal)
      if (result.connections && Array.isArray(result.connections)) {
        // Backend returns { connections: [{ user: {...}, connectionId, connectedAt }] }
        connectionList = result.connections.map(c => ({
          ...(c.user || c),
          _id: c.user?._id || c.user?.id || c._id || c.id,
          connectionId: c.connectionId || c._id
        }));
      } else if (result.success && result.data) {
        connectionList = result.data;
      } else if (Array.isArray(result)) {
        connectionList = result;
      } else if (result.data && Array.isArray(result.data)) {
        connectionList = result.data;
      }
      
      console.log('Parsed connections:', connectionList.length, 'items');
      setConnections(connectionList);
    } catch (error) {
      console.log('Failed to fetch connections for mentions:', error?.message || error);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Filter connections based on mention search
  const filteredConnections = connections.filter(conn => {
    if (!mentionSearch) return true;
    const fullName = `${conn.firstName || ''} ${conn.lastName || ''}`.toLowerCase();
    return fullName.includes(mentionSearch.toLowerCase());
  }).slice(0, 5); // Limit to 5 suggestions

  // Handle text change to detect @ mentions
  const handleTextChange = (newText) => {
    setText(newText);
    
    // Find if there's an active @ mention being typed
    const atPattern = /@(\w*)$/;
    const match = newText.match(atPattern);
    
    if (match) {
      setMentionSearch(match[1] || '');
      setMentionStartIndex(newText.length - match[0].length);
      setShowMentionSuggestions(true);
      return;
    }
    
    // Check for @ in middle of text
    const lastAtIndex = newText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = newText.slice(lastAtIndex + 1);
      const spaceIndex = textAfterAt.search(/[\s\n]/);
      if (spaceIndex === -1) {
        const charBefore = lastAtIndex > 0 ? newText[lastAtIndex - 1] : ' ';
        if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
          setMentionSearch(textAfterAt);
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          return;
        }
      }
    }
    
    setShowMentionSuggestions(false);
    setMentionSearch('');
    setMentionStartIndex(-1);
  };

  // Insert selected mention
  const handleSelectMention = (connection) => {
    const mentionText = `@${connection.firstName}_${connection.lastName}`;
    const beforeMention = text.slice(0, mentionStartIndex);
    const newText = beforeMention + mentionText + ' ';
    setText(newText);
    setShowMentionSuggestions(false);
    setMentionSearch('');
    setMentionStartIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ========== CONNECTION STATUS LOGIC ==========
  
  // Fetch connection data for all unique senders when messages change
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    
    const myIds = myIdSet();
    const uniqueSenders = new Set();
    
    // Collect unique sender IDs (excluding self)
    messages.forEach(msg => {
      const senderId = getSenderId(msg);
      if (senderId && !myIds.has(String(senderId)) && !fetchedConnectionUsers.current.has(String(senderId))) {
        uniqueSenders.add(String(senderId));
      }
    });
    
    if (uniqueSenders.size === 0) return;
    
    // Fetch connection data for each new sender
    const fetchConnectionData = async () => {
      for (const userId of uniqueSenders) {
        try {
          fetchedConnectionUsers.current.add(userId);
          const [status, count] = await Promise.all([
            getConnectionStatus(userId),
            getConnectionCount(userId)
          ]);
          setUserConnectionData(prev => ({
            ...prev,
            [userId]: { status: status || 'none', count: count || 0, loading: false }
          }));
        } catch (err) {
          console.log('Failed to fetch connection data for', userId);
          setUserConnectionData(prev => ({
            ...prev,
            [userId]: { status: 'none', count: 0, loading: false }
          }));
        }
      }
    };
    
    fetchConnectionData();
  }, [messages, currentUserId, user?.id]);
  
  // Socket listeners for real-time connection updates
  useEffect(() => {
    const onConnectionAccepted = (data) => {
      const otherUserId = String(data.userId || data.targetUserId || data.requesterId);
      if (userConnectionData[otherUserId]) {
        setUserConnectionData(prev => ({
          ...prev,
          [otherUserId]: { 
            ...prev[otherUserId], 
            status: 'connected',
            count: (prev[otherUserId]?.count || 0) + 1 
          }
        }));
      }
    };
    
    const onConnectionRemoved = (data) => {
      const otherUserId = String(data.userId || data.targetUserId);
      if (userConnectionData[otherUserId]) {
        setUserConnectionData(prev => ({
          ...prev,
          [otherUserId]: { 
            ...prev[otherUserId], 
            status: 'none',
            count: Math.max(0, (prev[otherUserId]?.count || 0) - 1)
          }
        }));
      }
    };
    
    socket.on('connection:accepted', onConnectionAccepted);
    socket.on('connection:removed', onConnectionRemoved);
    
    return () => {
      socket.off('connection:accepted', onConnectionAccepted);
      socket.off('connection:removed', onConnectionRemoved);
    };
  }, [userConnectionData]);
  
  // Handle connect/cancel request
  const handleConnectUser = async (userId) => {
    if (!userId) return;
    const userIdStr = String(userId);
    const currentData = userConnectionData[userIdStr] || { status: 'none', count: 0 };
    
    if (currentData.status === 'connected') return; // Already connected
    
    const previousStatus = currentData.status;
    
    // Optimistic update
    setUserConnectionData(prev => ({
      ...prev,
      [userIdStr]: { ...currentData, status: previousStatus === 'pending' ? 'none' : 'pending', loading: true }
    }));
    
    try {
      if (previousStatus === 'none') {
        await sendConnectionRequest(userId);
      } else if (previousStatus === 'pending') {
        await cancelConnectionRequest(userId);
      }
      
      setUserConnectionData(prev => ({
        ...prev,
        [userIdStr]: { ...prev[userIdStr], loading: false }
      }));
    } catch (err) {
      // Revert on error
      setUserConnectionData(prev => ({
        ...prev,
        [userIdStr]: { ...currentData, loading: false }
      }));
      console.log('Connection action failed:', err?.message);
    }
  };
  
  // Get connection display info for a user
  const getConnectionDisplay = (userId) => {
    const data = userConnectionData[String(userId)] || { status: 'none', count: 0 };
    switch (data.status) {
      case 'pending':
        return { icon: 'hourglass-outline', color: '#9a6b8c', label: 'Pending', bgColor: '#f5f0f3' };
      case 'connected':
        return { icon: 'checkmark-circle', color: '#581845', label: 'Connected', bgColor: '#e8dce5' };
      default:
        return { icon: 'person-add-outline', color: '#6B4C5A', label: 'Connect', bgColor: '#f5f0f3' };
    }
  };

  // ========== LIKE MESSAGE LOGIC ==========
  
  const toggleMessageLike = async (messageId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.post(
        `${API_MESSAGES_URL}/${messageId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success) {
        setMessages(prev => prev.map(m => 
          m._id === messageId 
            ? { ...m, likes: res.data.likes, likeCount: res.data.likeCount }
            : m
        ));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  // Check if current user liked a message
  const hasLikedMessage = (message) => {
    const myIds = myIdSet();
    return message.likes?.some(id => myIds.has(String(id?._id || id)));
  };

  // ========== NESTED REPLIES LOGIC ==========
  
  const toggleRepliesExpanded = (messageId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  // ========== FLAT MESSAGES (WhatsApp style - no threading) ==========
  // All messages displayed flat, replies show quoted preview inside message bubble
  const sortedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    // Build a lookup of all messages by ID for finding reply targets
    const msgById = new Map();
    messages.forEach(msg => msgById.set(String(msg._id), msg));
    
    // Sort chronologically
    const sorted = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    // Attach full reply target data if available
    return sorted.map(msg => {
      if (msg.replyTo?.messageId) {
        const replyTarget = msgById.get(String(msg.replyTo.messageId));
        return {
          ...msg,
          replyTargetFull: replyTarget || null, // Full message object if found
        };
      }
      return msg;
    });
  }, [messages]);

  const normalizeMessageText = (messageText) => {
    if (messageText == null) return '';
    if (typeof messageText === 'string') return messageText;
    if (typeof messageText === 'number' || typeof messageText === 'boolean') return String(messageText);
    if (Array.isArray(messageText)) {
      return messageText.map((item) => normalizeMessageText(item)).join(', ');
    }
    if (typeof messageText === 'object') {
      if (messageText.coordinates && messageText.type) {
        const coords = Array.isArray(messageText.coordinates)
          ? messageText.coordinates.join(', ')
          : normalizeMessageText(messageText.coordinates);
        return `Location: ${coords}`;
      }
      if (messageText.text != null) return normalizeMessageText(messageText.text);
      if (messageText.message != null) return normalizeMessageText(messageText.message);
      try {
        return JSON.stringify(messageText);
      } catch {
        return String(messageText);
      }
    }
    return String(messageText);
  };

  // Render message text with @mentions and #hashtags highlighted
  const renderFormattedText = (messageText) => {
    const normalized = normalizeMessageText(messageText);
    if (!normalized) return null;

    // Pattern to match @mentions and #hashtags
    const pattern = /(@\w+(?:_\w+)?|#\w+)/g;
    const parts = String(normalized).split(pattern);

    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          const display = part == null ? '' : String(part);
          if (display.startsWith('@')) {
            return (
              <Text key={index} style={styles.mentionText}>
                {display}
              </Text>
            );
          } else if (display.startsWith('#')) {
            return (
              <Text key={index} style={styles.hashtagText}>
                {display}
              </Text>
            );
          }
          return <Text key={index}>{display}</Text>;
        })}
      </Text>
    );
  };


   // 🔔 Mark this chatroom as active while focused, and clear unread
 useEffect(() => {
   if (!chatroomId) return;
   if (isFocused) {
     dispatch?.({ type: 'set-active-room', roomId: String(chatroomId) });
     dispatch?.({ type: 'clear-room', roomId: String(chatroomId) });
   } else {
     dispatch?.({ type: 'unset-active-room', roomId: String(chatroomId) });
   }
   return () => {
     // safety: if screen unmounts while focused, unset active
     dispatch?.({ type: 'unset-active-room', roomId: String(chatroomId) });
   };
 }, [isFocused, chatroomId, dispatch]);



  // Load current user id (backup to AuthContext)
  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) setCurrentUserId(JSON.parse(userStr)._id || JSON.parse(userStr).id);
      } catch {}
    })();
  }, []);

  // Fetch + socket
useEffect(() => {
  if (!chatroomId) return;
  let cancelled = false;
  initialScrollDone.current = false; // Reset for new chatroom

  // ✅ mark this room as active and clear its unread
  // dispatch?.({ type: 'set-active-room', roomId: String(chatroomId) });
  // dispatch?.({ type: 'clear-room', roomId: String(chatroomId) });

  const init = async () => {
    await fetchMessages();
    if (cancelled) return;

    // ✅ join the correct server-side room
    socket.emit('joinChatroom', { chatroomId, userId: currentUserId || user?.id });
   
// ✅ new messages from server
const onNew = (msg) => {
  if (!msg || String(msg.chatroomId) !== String(chatroomId)) return;

  // Debug: log incoming message to check replyTo structure
  console.log('📩 New message received:', {
    _id: msg._id,
    message: msg.message,
    replyTo: msg.replyTo,
    hasReplyTo: !!msg.replyTo,
    replyToMessageId: msg.replyTo?.messageId,
  });

  setMessages(prev => {
    const exists = prev.some(m => String(m._id) === String(msg._id));
    if (exists) return prev;
    const combined = [...prev, msg].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    return combined;
  });

  // While focused in this room, make sure any stray bumps stay cleared
    dispatch?.({ type: 'clear-room', roomId: String(chatroomId) });

  // 🔔 In-app sound + toast (only for messages from others)
  const myId = currentUserId || user?.id;
  const isFromMe =
    String(msg.senderId?._id || msg.senderId) === String(myId);

  if (!isFromMe) {
    // try to get a nice display name
    const senderDisplay =
      msg.senderName ||
      msg.sender?.firstName ||
      (msg.senderId && (msg.senderId.firstName || msg.senderId.name)) ||
      'Someone';

    // short preview
    const preview = (msg.message || '').toString().slice(0, 60);

    // play sound + show toast
    playPing();
    showTopToast(
      `New message in ${chatroomName}`,
      `${senderDisplay}: ${preview}`
    );
  }

  // keep list scrolled to bottom for active chat
  requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
};

    // ✅ typing indicators (server emits these)

    const onUserTyping = ({ userId: uid, senderName }) => {
  const name = senderName || 'Someone';
  setTypingStatus(`${name} is typing…`);
  setTimeout(() => setTypingStatus(''), 2500);
};

const onUserStoppedTyping = ({ userId: uid, senderName }) => {
  setTypingStatus('');
};

  

    // (optional) membership events
    const onUserJoined = () => {};
    const onUserLeft = () => {};
    
    // Handle message deletion from other clients
    const onMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    socket.on('newChatroomMessage', onNew);
    socket.on('userTyping', onUserTyping);
    socket.on('userStoppedTyping', onUserStoppedTyping);
    socket.on('userJoined', onUserJoined);
    socket.on('userLeft', onUserLeft);
    socket.on('messageDeleted', onMessageDeleted);

    return () => {
      socket.emit('leaveChatroom', { chatroomId, userId: currentUserId || user?.id });
      socket.off('newChatroomMessage', onNew);
      socket.off('userTyping', onUserTyping);
      socket.off('userStoppedTyping', onUserStoppedTyping);
      socket.off('userJoined', onUserJoined);
      socket.off('userLeft', onUserLeft);
      socket.off('messageDeleted', onMessageDeleted);
    };
  };

  init();
  return () => { cancelled = true; };
  // socket.emit('leaveChatroom', { chatroomId, userId: currentUserId || user?.id });
    // ✅ unset active on leave
    // dispatch?.({ type: 'set-active-room', roomId: null });
  
}, [chatroomId, currentUserId, user?.id, dispatch]);

useEffect(() => {
  if (!chatroomId) return;

  // record the latest keystroke time
  lastTypedAtRef.current = Date.now();

  // only emit "typing" when there is text
  if (text && text.trim().length > 0) {
    socket.emit('typing', {
      chatroomId,
      userId: currentUserId || user?.id,
      senderName: displayName,   // ✅ send the name
    });
  }

  // debounce "stopTyping"
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    // if there were no new keystrokes in the last 1.2s, stop typing
    if (Date.now() - lastTypedAtRef.current >= 1200) {
      socket.emit('stopTyping', {
        chatroomId,
        userId: currentUserId || user?.id,
        senderName: displayName, // ✅ send the name (optional but nice)
      });
    }
  }, 1200);

  // cleanup: just clear the timer
  return () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };
}, [text, chatroomId, currentUserId, user?.id, displayName]);



  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get(`${API_MESSAGES_URL}/${chatroomId}/messages`, { headers });
      const sorted = (res.data || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(sorted);
    } catch (err) {
      console.error('Fetch messages error:', err?.response?.data || err.message);
    } finally { setLoading(false); }
  };

  // Scroll to a specific message (for reply-to navigation) - WhatsApp style
  const scrollToMessage = (messageId) => {
    if (!messageId) return;
    const targetId = String(messageId);
    
    // Find message in flat sorted list
    const messageIndex = sortedMessages.findIndex(m => String(m._id) === targetId);
    
    if (messageIndex !== -1 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({ 
          index: messageIndex, 
          animated: true,
          viewPosition: 0.3
        });
      } catch (e) {
        flatListRef.current.scrollToOffset({
          offset: messageIndex * 100,
          animated: true,
        });
      }
      setTimeout(() => flashHighlight(targetId), 350);
    }
  };

  // Handle scrollToIndex failure (virtualized lists)
  const onScrollToIndexFailed = (info) => {
    const wait = new Promise(resolve => setTimeout(resolve, 300));
    wait.then(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({ 
          index: info.index, 
          animated: true 
        });
      }
    });
  };

  const handleReply = (m) => setReplyTo(m);
  const cancelReply = () => setReplyTo(null);

  const sendMessage = async () => {
  if (!text.trim()) return;
  

  try {
    const userStr = await AsyncStorage.getItem('user');
    if (!userStr) return;
    const sender = JSON.parse(userStr);

    const payload = {
      chatroomId,
      message: text.trim(),
      senderId: sender._id || sender.id,
      senderName: sender.firstName,
      avatarUrl: sender.photos?.[0]?.startsWith('http') ? sender.photos[0] : `${BASE_URL}${sender.photos?.[0] || ''}`,
      media: [],
      replyTo: replyTo
        ? {
            messageId: replyTo._id,
            senderId: replyTo.senderId?._id || replyTo.senderId,
            senderName: replyTo.senderName,
            message: replyTo.message,
          }
        : null,
    };

    // Debug: log the payload being sent
    console.log('📤 Sending message payload:', {
      message: payload.message,
      replyTo: payload.replyTo,
      replyingToMessageId: payload.replyTo?.messageId,
    });

    setText('');
    setReplyTo(null);
    setInputHeight(MIN_INPUT_HEIGHT);

    if (socket.connected) {
      // ✅ Server will persist + broadcast; our onNew listener will append
      socket.emit('sendChatroomMessage', payload);
    } else {
      // Fallback: REST (server should also broadcast if you added the emit in service)
      const token = await AsyncStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.post(`${API_MESSAGES_URL}/`, payload, { headers });
      const saved = res.data;
      setMessages(prev => {
        const exists = prev.some(m => String(m._id) === String(saved._id));
        if (exists) return prev;
        const combined = [...prev, saved].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        return combined;
      });
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    }
  } catch {
    Alert.alert('Failed to send message');

     // ⛔️ Detect objectionable content rejection
        const serverMsg = err?.response?.data?.message;
    
        if (serverMsg === 'Message contains inappropriate content.') {
          Alert.alert('Message not sent', 'This message includes inappropriate language and cannot be delivered.');  // fallback
        } else {
          Alert.alert('Failed to send message');  // fallback
        }
  }
};


  

  const addReaction = (messageId, emoji) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;
        if (!m.reactions) return { ...m, reactions: [emoji] };
        if (m.reactions.includes(emoji)) return m;
        return { ...m, reactions: [...m.reactions, emoji] };
      })
    );
  };

  const showMessageActionsAlert = (item) => {
    const isLiked = hasLikedMessage(item);
    const isMyMessage = isSelfMessage(item);
    
    // Build options array
    const actionButtons = [];
    
    // Like/Unlike
    actionButtons.push({ 
      text: isLiked ? '💔 Unlike' : '❤️ Like', 
      onPress: () => toggleMessageLike(item._id) 
    });
    
    // Reply
    actionButtons.push({ 
      text: '💬 Reply', 
      onPress: () => handleReply(item) 
    });
    
    // Delete for own messages
    if (isMyMessage) {
      actionButtons.push({
        text: '🗑️ Delete',
        style: 'destructive',
        onPress: () => confirmDeleteMessage(item),
      });
    } else {
      // Report for others' messages
      actionButtons.push({
        text: '🚩 Report',
        onPress: () => openReportModal(item),
      });
    }
    
    // Cancel button - always add at the end
    // On Android, style: 'cancel' doesn't do anything special
    // but having it as the last button works well
    actionButtons.push({ 
      text: 'Cancel', 
      style: 'cancel',
      onPress: () => {} // Explicit empty handler for Android
    });
    
    Alert.alert(
      'Message Options', 
      'What would you like to do?',
      actionButtons,
      { cancelable: true } // Allow dismissing by tapping outside on Android
    );
  };

  // Delete message
  const confirmDeleteMessage = (item) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMessage(item._id),
        },
      ]
    );
  };

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/api/chatroom-messages/${messageId}`);
      
      // Remove from local state
      setMessages(prev => prev.filter(m => m._id !== messageId));
      
      // Emit socket event so others see the deletion
      socket.emit('deleteMessage', { chatroomId, messageId });
      
      showTopToast('Message deleted', 'success');
    } catch (error) {
      console.error('Delete message error:', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    }
  };

  // Report message
  const openReportModal = (item) => {
    setReportingMessage(item);
    setReportReason('');
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason) {
      Alert.alert('Select Reason', 'Please select a reason for reporting.');
      return;
    }
    
    setReportLoading(true);
    try {
      await api.post('/reports', {
        reportType: 'chatroom_message',
        reportedItemId: reportingMessage._id,
        reportedUserId: reportingMessage.senderId || reportingMessage.userId,
        reason: reportReason,
        chatroomId,
        messageContent: reportingMessage.message?.substring(0, 200),
      });
      
      setShowReportModal(false);
      setReportingMessage(null);
      setReportReason('');
      
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review this report.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Report error:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  const renderItem = ({ item, index }) => {
    const isMyMessage = isSelfMessage(item);
    const isLiked = hasLikedMessage(item);
    const likeCount = item.likes?.length || item.likeCount || 0;
    const isHighlighted = String(selectedMessage) === String(item._id);

    // Date separator logic
    const msgDate = new Date(item.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isSameDay = (d1, d2) => 
      d1.getFullYear() === d2.getFullYear() && 
      d1.getMonth() === d2.getMonth() && 
      d1.getDate() === d2.getDate();
    
    let showDateSeparator = false;
    let dateLabel = '';
    
    if (index === 0) {
      showDateSeparator = true;
    } else {
      const prevDate = new Date(sortedMessages[index - 1]?.createdAt);
      if (!isSameDay(msgDate, prevDate)) {
        showDateSeparator = true;
      }
    }
    
    if (showDateSeparator) {
      if (isSameDay(msgDate, today)) {
        dateLabel = 'Today';
      } else if (isSameDay(msgDate, yesterday)) {
        dateLabel = 'Yesterday';
      } else {
        dateLabel = msgDate.toLocaleDateString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric', year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
        });
      }
    }

    // Animated highlight for scroll-to-message
    const animatedStyle = isHighlighted ? {
      backgroundColor: highlightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['transparent', 'rgba(88, 24, 69, 0.2)']
      }),
    } : {};
    
    // Swipe to reply
    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 20,
      onPanResponderRelease: () => handleReply(item),
    });

    // WhatsApp-style quoted reply info
    const hasReply = item.replyTo?.messageId;
    const replyToName = item.replyTo?.senderName || 'Someone';
    const replyToMessage = item.replyTo?.message || '';
    const replyToMessageId = item.replyTo?.messageId;

    return (
      <View style={styles.messageWrapper}>
        {/* Date separator */}
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateSeparatorLine} />
            <View style={styles.dateSeparatorBadge}>
              <Text style={styles.dateSeparatorText}>{dateLabel}</Text>
            </View>
            <View style={styles.dateSeparatorLine} />
          </View>
        )}

        {/* Message bubble */}
        <View style={{ alignItems: isMyMessage ? 'flex-end' : 'flex-start' }}>
          <Animated.View style={[isHighlighted && { borderRadius: 14, overflow: 'hidden' }, animatedStyle]}>
            <TouchableOpacity
              onLongPress={() => showMessageActionsAlert(item)}
              style={[
                styles.messageBubble, 
                isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                isHighlighted && styles.messageHighlighted,
              ]}
              {...panResponder.panHandlers}
              activeOpacity={0.8}
            >
              {/* Sender info (only for others' messages) */}
              {!isMyMessage && (() => {
                const senderId = getSenderId(item);
                const connData = userConnectionData[String(senderId)] || { status: 'none', count: 0, loading: false };
                const connDisplay = getConnectionDisplay(senderId);
                
                return (
                  <TouchableOpacity
                    style={styles.senderHeader}
                    onPress={() => openUserProfile(item)}
                    activeOpacity={0.7}
                  >
                    {/* Avatar */}
                    <Image 
                      source={item.avatarUrl ? { uri: toAbs(item.avatarUrl) } : FallbackImage} 
                      style={styles.senderAvatar} 
                    />
                    
                    {/* Name */}
                    <Text style={styles.senderName} numberOfLines={1}>
                      {item.senderName || 'Unknown'}
                    </Text>
                    
                    {/* Connection count */}
                    {connData.count > 0 && (
                      <View style={styles.connCountBadge}>
                        <Text style={styles.connCountText}>{connData.count}</Text>
                        <Ionicons name="people" size={11} color="#581845" />
                      </View>
                    )}
                    
                    {/* Verified/Connected badge */}
                    {connData.status === 'connected' && (
                      <Ionicons name="checkmark-circle" size={16} color="#581845" style={{ marginLeft: 4 }} />
                    )}
                    
                    {/* Connect button (if not connected) */}
                    {connData.status !== 'connected' && (
                      <TouchableOpacity 
                        style={[styles.miniConnectBtn, connData.status === 'pending' && styles.miniConnectBtnPending]}
                        onPress={(e) => { e.stopPropagation(); handleConnectUser(senderId); }}
                        disabled={connData.loading}
                        activeOpacity={0.7}
                      >
                        {connData.loading ? (
                          <ActivityIndicator size={10} color="#581845" />
                        ) : (
                          <Ionicons name={connDisplay.icon} size={12} color={connDisplay.color} />
                        )}
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })()}

              {/* WhatsApp-style quoted reply box */}
              {hasReply && (
                <TouchableOpacity 
                  style={[styles.quotedReplyBox, isMyMessage && styles.quotedReplyBoxMine]}
                  onPress={() => scrollToMessage(replyToMessageId)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quotedReplyBar, isMyMessage && styles.quotedReplyBarMine]} />
                  <View style={styles.quotedReplyContent}>
                    <Text style={[styles.quotedReplyName, isMyMessage && styles.quotedReplyNameMine]} numberOfLines={1}>
                      {replyToName}
                    </Text>
                    <Text style={styles.quotedReplyText} numberOfLines={2}>
                      {normalizeMessageText(replyToMessage)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Message text */}
              {renderFormattedText(item.message)}

              {/* Footer: time + actions */}
              <View style={styles.messageFooter}>
                <Text style={styles.messageTime}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                
                <View style={styles.messageActions}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => toggleMessageLike(item._id)}
                  >
                    <Ionicons 
                      name={isLiked ? 'heart' : 'heart-outline'} 
                      size={14} 
                      color={isLiked ? '#581845' : '#888'} 
                    />
                    {likeCount > 0 && (
                      <Text style={[styles.actionCount, isLiked && styles.likedCount]}>
                        {likeCount}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => handleReply(item)}
                  >
                    <Ionicons name="arrow-undo-outline" size={14} color="#888" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  };

  if (!chatroomId) {
    return <View style={styles.center}><Text>Error: Chatroom ID not provided.</Text></View>;
  }

  return (
    <OnboardingOverlay screenName="ChatRoom">
    <SASafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // iOS: use real header height so there’s no overlap or gap
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeightFromNav : 0}
      >
        <FlatList
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          ref={flatListRef}
          data={sortedMessages}
          keyExtractor={(item) => item._id || item.createdAt || Math.random().toString()}
          renderItem={renderItem}
          onScrollToIndexFailed={onScrollToIndexFailed}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          contentContainerStyle={{
            padding: 10,
            paddingBottom: kbVisible ? 8 + ANDROID_KEYBOARD_BUMP : 8,
          }}
          onContentSizeChange={() => {
            if (!initialScrollDone.current && sortedMessages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
                initialScrollDone.current = true;
              }, 100);
            }
          }}
          onLayout={() => {
            if (!initialScrollDone.current && sortedMessages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 150);
            }
          }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Text>No messages yet. Say hi 👋</Text>
            </View>
          }
        />

        {/* Floating scroll to bottom button */}
        {showScrollToBottom && (
          <TouchableOpacity
            style={[
              styles.floatingBtn,
              { bottom: kbVisible ? (Platform.OS === 'ios' ? 70 : keyboardHeight + 70) : 140 }
            ]}
            onPress={scrollToBottom}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
        )}

        {replyTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewBar} />
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewName}>Replying to {replyTo.senderName}</Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>{normalizeMessageText(replyTo.message)}</Text>
            </View>
            <TouchableOpacity style={styles.replyPreviewClose} onPress={cancelReply}>
              <Ionicons name="close" size={20} color="#888" />
            </TouchableOpacity>
          </View>
        )}

        {typingStatus ? <Text style={styles.typing}>{typingStatus}</Text> : null}

        {/* @ Mention suggestions dropdown */}
        {showMentionSuggestions && (
          <View style={styles.mentionSuggestions}>
            {/* Header */}
            <View style={styles.mentionHeader}>
              <Ionicons name="at" size={16} color="#581845" />
              <Text style={styles.mentionHeaderText}>
                Mention a connection {mentionSearch ? `"${mentionSearch}"` : ''}
              </Text>
            </View>
            
            {loadingConnections ? (
              <View style={styles.mentionLoading}>
                <ActivityIndicator size="small" color="#581845" />
                <Text style={styles.mentionLoadingText}>Loading connections...</Text>
              </View>
            ) : connections.length === 0 ? (
              <View style={styles.mentionEmpty}>
                <Ionicons name="people-outline" size={24} color="#999" />
                <Text style={styles.mentionEmptyText}>No connections to mention</Text>
                <Text style={[styles.mentionEmptyText, { fontSize: 12, marginTop: 4 }]}>
                  Connect with people to mention them
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredConnections}
                keyExtractor={(item) => item._id || item.id || String(Math.random())}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                style={{ maxHeight: 180 }}
                ListEmptyComponent={
                  <View style={styles.mentionEmpty}>
                    <Text style={styles.mentionEmptyText}>No matches for "{mentionSearch}"</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.mentionItem}
                    onPress={() => handleSelectMention(item)}
                    activeOpacity={0.7}
                  >
                    <Image
                      source={
                        item.photos?.[0] 
                          ? { uri: item.photos[0].startsWith('http') ? item.photos[0] : `${BASE_URL}${item.photos[0]}` }
                          : FallbackImage
                      }
                      style={styles.mentionAvatar}
                    />
                    <View style={styles.mentionInfo}>
                      <Text style={styles.mentionName}>
                        {item.firstName || ''} {item.lastName || ''}
                      </Text>
                      {item.currentRole && (
                        <Text style={styles.mentionRole} numberOfLines={1}>
                          {item.currentRole}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="add-circle" size={24} color="#581845" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* Composer inside bottom safe area */}
        <SASafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
          <View
            style={[
              styles.composerBar,
              { paddingBottom: composerBottomPad, marginBottom: ANDROID_KEYBOARD_BUMP },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.inputWrapper}
              onPress={() => inputRef.current?.focus()}
            >
              <TextInput
                ref={inputRef}
                style={styles.composerInput}
                value={text}
                onChangeText={handleTextChange}
                placeholder="Message (use @ to mention)"
                placeholderTextColor="#999"
                selectionColor="#581845"
                underlineColorAndroid="transparent"
                multiline
                textAlignVertical="top"
                onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
                scrollEnabled={inputHeight > (MAX_INPUT_HEIGHT - 4)}
                blurOnSubmit={false}
                returnKeyType="default"
                autoCorrect
                autoCapitalize="sentences"
                keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!text.trim()}
              style={[styles.sendFab, !text.trim() && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SASafeAreaView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#581845" />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalContent}>
            {/* Header */}
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>Report Message</Text>
              <TouchableOpacity 
                onPress={() => setShowReportModal(false)}
                style={styles.reportModalClose}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Message preview */}
            {reportingMessage && (
              <View style={styles.reportMessagePreview}>
                <Text style={styles.reportMessageAuthor}>
                  {reportingMessage.senderName || 'Unknown'}
                </Text>
                <Text style={styles.reportMessageText} numberOfLines={2}>
                  {reportingMessage.message}
                </Text>
              </View>
            )}

            {/* Reason selection */}
            <Text style={styles.reportReasonLabel}>Why are you reporting this?</Text>
            <ScrollView style={styles.reportReasonsList}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reportReasonItem,
                    reportReason === reason && styles.reportReasonItemSelected,
                  ]}
                  onPress={() => setReportReason(reason)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.reportReasonRadio,
                    reportReason === reason && styles.reportReasonRadioSelected,
                  ]}>
                    {reportReason === reason && (
                      <View style={styles.reportReasonRadioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.reportReasonText,
                    reportReason === reason && styles.reportReasonTextSelected,
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.reportSubmitBtn,
                !reportReason && styles.reportSubmitBtnDisabled,
              ]}
              onPress={submitReport}
              disabled={!reportReason || reportLoading}
              activeOpacity={0.8}
            >
              {reportLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.reportSubmitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SASafeAreaView>
    </OnboardingOverlay>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // WhatsApp-style message wrapper
  messageWrapper: {
    marginBottom: 2,
  },

  // Message bubble - WhatsApp style
  messageBubble: { 
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 12, 
    maxWidth: '80%',
    minWidth: 80,
  },
  myMessageBubble: { 
    backgroundColor: '#f5f0f5', // Light purple for own messages
    borderTopRightRadius: 4,
    alignSelf: 'flex-end',
  },
  otherMessageBubble: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  messageHighlighted: {
    borderWidth: 2,
    borderColor: '#581845',
  },

  // Sender header - Clean single row layout
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderAvatar: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    marginRight: 6,
  },
  senderName: { 
    fontWeight: '700', 
    color: '#581845', 
    fontSize: 13,
    marginRight: 6,
  },
  
  // Connection count badge
  connCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 24, 69, 0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  connCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#581845',
    marginRight: 3,
  },
  
  // Mini connect button
  miniConnectBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(88, 24, 69, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  miniConnectBtnPending: {
    backgroundColor: 'rgba(88, 24, 69, 0.05)',
  },

  // WhatsApp-style quoted reply box
  quotedReplyBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  quotedReplyBoxMine: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  quotedReplyBar: {
    width: 4,
    backgroundColor: '#581845',
  },
  quotedReplyBarMine: {
    backgroundColor: '#9b4d8a', // Medium purple
  },
  quotedReplyContent: {
    flex: 1,
    padding: 6,
    paddingLeft: 8,
  },
  quotedReplyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#581845',
    marginBottom: 2,
  },
  quotedReplyNameMine: {
    color: '#9b4d8a', // Medium purple
  },
  quotedReplyText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },

  // Message text
  messageText: { 
    fontSize: 15, 
    color: '#222', 
    lineHeight: 20,
  },
  mentionText: { 
    color: '#581845', 
    fontWeight: '600',
  },
  hashtagText: { 
    color: '#1a73e8', 
    fontWeight: '500',
  },

  // Message footer
  messageFooter: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageTime: { 
    fontSize: 11, 
    color: '#888',
  },
  messageActions: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 3,
  },
  actionCount: { 
    fontSize: 11, 
    color: '#888',
  },
  likedCount: { 
    color: '#581845',
  },

  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 10,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dateSeparatorBadge: {
    backgroundColor: '#e1f2fa',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  typing: { fontStyle: 'italic', marginLeft: 10, marginBottom: 5, color: '#666' },

  // Reply preview bar (when composing reply) - Modern design
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#581845',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  replyPreviewBar: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: '#581845',
  },
  replyPreviewContent: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  replyPreviewName: { 
    fontWeight: '700', 
    color: '#581845', 
    fontSize: 12,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 17,
  },
  replyPreviewClose: { 
    padding: 10,
    marginRight: 2,
  },

  // @ Mention suggestions styles
  mentionSuggestions: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#581845',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: 220,
    shadowColor: '#581845',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    marginHorizontal: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(88, 24, 69, 0.1)',
  },
  mentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'rgba(88, 24, 69, 0.05)',
  },
  mentionHeaderText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#581845',
  },
  mentionLoading: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionLoadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  mentionEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  mentionEmptyText: {
    color: '#999',
    fontSize: 14,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  mentionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#eee',
    borderWidth: 2,
    borderColor: '#581845',
  },
  mentionInfo: {
    flex: 1,
  },
  mentionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  mentionRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Composer
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 160,
  },
  composerInput: {
    minHeight: 40,
    maxHeight: 140,
    fontSize: 16,
    lineHeight: 22,
    padding: 0,
    color: '#111',
    includeFontPadding: false,
  },
  sendFab: {
    backgroundColor: '#581845',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Floating scroll to bottom button
  floatingBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#581845',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },

  // Report Modal styles
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  reportModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  reportModalClose: {
    padding: 4,
  },
  reportMessagePreview: {
    backgroundColor: '#f8f6f8',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
    marginBottom: 16,
  },
  reportMessageAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#581845',
    marginBottom: 4,
  },
  reportMessageText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  reportReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reportReasonsList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  reportReasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#f8f8f8',
  },
  reportReasonItemSelected: {
    backgroundColor: 'rgba(88, 24, 69, 0.1)',
  },
  reportReasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportReasonRadioSelected: {
    borderColor: '#581845',
  },
  reportReasonRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#581845',
  },
  reportReasonText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  reportReasonTextSelected: {
    color: '#581845',
    fontWeight: '600',
  },
  reportSubmitBtn: {
    backgroundColor: '#581845',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  reportSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});




// import React, { useState, useEffect, useRef, useContext, useLayoutEffect } from 'react';
// import {
//   View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
//   KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
//   PanResponder, Keyboard
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// // import io from 'socket.io-client';
// import { socket } from '../socket';
// import axios from 'axios';
// import EmojiSelector from 'react-native-emoji-selector';
// import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';

// // import { useNavigation, useRoute } from '@react-navigation/native';
// import { useHeaderHeight } from '@react-navigation/elements';
// import { AuthContext } from '../context/AuthContext';
// import api from '../services/api';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { showTopToast, playPing } from '../utils/notify';
//  import { useUnread } from '../context/UnreadContext';



// import {
//   SafeAreaView as SASafeAreaView,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';

// const BASE_URL = 'https://three4th-street-backend.onrender.com';
// const API_MESSAGES_URL = `${BASE_URL}/api/chatroom-messages`;
// const SOCKET_SERVER_URL = BASE_URL;

// const HEADER_HEIGHT_FALLBACK = 56;
// const MIN_INPUT_HEIGHT = 40;
// const MAX_INPUT_HEIGHT = 140;

// export default function ChatRoomScreen({ route }) {
//   const routeHook = useRoute();
//   const navigation = useNavigation();
//   const headerHeightFromNav = useHeaderHeight?.() || HEADER_HEIGHT_FALLBACK;
//    const { dispatch } = useUnread();
//   const isFocused = useIsFocused();



//   const chatroomName =
//     route?.params?.chatroomName ||
//     routeHook?.params?.chatroomName ||
//     route?.params?.room?.name ||
//     routeHook?.params?.room?.name ||
//     'Chat';

//   useLayoutEffect(() => {
//     navigation.setOptions({
//       title: chatroomName,
//       headerBackTitleVisible: false,
//       headerBackTitle: '',
//       headerLeft: () => (
//         <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
//           <Ionicons name="chevron-back" size={26} color="#581845" />
//         </TouchableOpacity>
//       ),
//       headerTitleStyle: { color: '#222' },
//     });
//   }, [navigation, chatroomName]);

//   const chatroomId = route?.params?.chatroomId;

//   const { user } = useContext(AuthContext);
//   const [currentUserId, setCurrentUserId] = useState(null);

//   // 👇 Who am I? (used for "<name> is typing…")
// const [displayName, setDisplayName] = useState('Someone');

// useEffect(() => {
//   // Prefer AuthContext name
//   const nameFromCtx = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
//   if (nameFromCtx) {
//     setDisplayName(nameFromCtx);
//     return;
//   }
//   // Fallback to whatever is in AsyncStorage
//   (async () => {
//     try {
//       const raw = await AsyncStorage.getItem('user');
//       if (!raw) return;
//       const u = JSON.parse(raw);
//       const nameFromStore = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim();
//       if (nameFromStore) setDisplayName(nameFromStore);
//     } catch {}
//   })();
// }, [user?.firstName, user?.lastName]);


//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [typingStatus, setTypingStatus] = useState('');
//   const [replyTo, setReplyTo] = useState(null);

//   // const socketRef = useRef(null);
//   const flatListRef = useRef(null);

//   // --- Keyboard state (for spacing)
//   const insets = useSafeAreaInsets();
//   const [kbVisible, setKbVisible] = useState(false);
//   const [keyboardHeight, setKeyboardHeight] = useState(0);

//   useEffect(() => {
//     const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
//     const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

//     const onShow = (e) => {
//       setKbVisible(true);
//       if (e?.endCoordinates?.height) setKeyboardHeight(e.endCoordinates.height);
//     };
//     const onHide = () => {
//       setKbVisible(false);
//       setKeyboardHeight(0);
//     };

//     const s1 = Keyboard.addListener(showEvt, onShow);
//     const s2 = Keyboard.addListener(hideEvt, onHide);
//     return () => { s1.remove(); s2.remove(); };
//   }, []);



//   // Minimal internal padding; safe area is applied by SASafeAreaView.
//   const composerBottomPad = kbVisible
//     ? (Platform.OS === 'ios' ? 4 : 2)     // while typing: tiny cushion
//     : (Platform.OS === 'ios' ? 2 : 2);    // idle: keep it tight (safe area still applies on iOS)

//   // Adaptive Android lift during typing so TextInput is fully visible on all keyboards.
//   const ANDROID_KEYBOARD_BUMP =
//     Platform.OS === 'android' && kbVisible
//       ? Math.min(36, Math.max(18, Math.round((keyboardHeight || 280) * 0.12)))
//       : 0;

//   const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
//   const inputRef = useRef(null);

//   const typingTimeoutRef = useRef(null);
// const lastTypedAtRef = useRef(0);



//   // ------- helpers (same logic as yours)
//   const verifiedCache = useRef(new Map());
//   const verifiedLoaded = useRef(false);

//   const toAbs = (p) => (p && typeof p === 'string' && !p.startsWith('http') ? `${BASE_URL}${p}` : p);
//   const normalizeUser = (raw) => {
//     if (!raw) return null;
//     const photos = Array.isArray(raw.photos) ? raw.photos.map(toAbs) : [];
//     return { ...raw, id: raw.id || raw._id, _id: raw._id || raw.id, photos, avatarUrl: photos?.[0] || toAbs(raw.avatarUrl) };
//   };
//   const getSenderObject = (item) => (item?.senderId && typeof item.senderId === 'object') ? item.senderId
//     : (item?.sender && typeof item.sender === 'object') ? item.sender : null;
//   const getSenderId = (item) => {
//     if (!item) return null;
//     if (item.senderId && typeof item.senderId === 'object') return item.senderId._id || item.senderId.id;
//     if (item.senderId) return item.senderId;
//     if (item.sender && typeof item.sender === 'object') return item.sender._id || item.sender.id;
//     return null;
//   };
//   const myIdSet = () => {
//     const ids = [];
//     if (user?.id) ids.push(String(user.id));
//     if (user?._id) ids.push(String(user._id));
//     if (currentUserId) ids.push(String(currentUserId));
//     return new Set(ids.filter(Boolean));
//   };
//   const isSelfMessage = (item) => {
//     const mine = myIdSet();
//     const senderId = getSenderId(item);
//     const embedded = getSenderObject(item);
//     const embeddedId = embedded?._id || embedded?.id;
//     return (senderId && mine.has(String(senderId))) || (embeddedId && mine.has(String(embeddedId)));
//   };
//   const ensureVerifiedCache = async () => {
//     if (verifiedLoaded.current && verifiedCache.current.size > 0) return;
//     try {
//       const res = await api.get('/accounts/verified');
//       const list = Array.isArray(res?.data) ? res.data : [];
//       list.forEach((u) => {
//         const n = normalizeUser(u);
//         if (!n?.id) return;
//         verifiedCache.current.set(String(n.id), n);
//         verifiedCache.current.set(String(n._id), n);
//       });
//       verifiedLoaded.current = true;
//     } catch { verifiedLoaded.current = true; }
//   };
//   const openUserProfile = async (item) => {
//     if (isSelfMessage(item)) return;
//     try {
//       const embedded = normalizeUser(getSenderObject(item));
//       const senderId = embedded?.id || getSenderId(item);
//       await ensureVerifiedCache();
//       const fromCache = verifiedCache.current.get(String(senderId));
//       const nav = (u) => {
//         const parent = navigation.getParent?.();
//         (parent || navigation).navigate('UserProfile', { user: u });
//       };
//       if (fromCache) return nav(fromCache);
//       const res = await api.get(`/accounts/${senderId}`).catch(() => null);
//       const full = normalizeUser(res?.data?.user || res?.data);
//       return nav(full || (embedded || normalizeUser({ _id: senderId, firstName: item?.senderName || 'Unknown' })));
//     } catch {}
//   };



//   // Load current user id (backup to AuthContext)
//   useEffect(() => {
//     (async () => {
//       try {
//         const userStr = await AsyncStorage.getItem('user');
//         if (userStr) setCurrentUserId(JSON.parse(userStr)._id || JSON.parse(userStr).id);
//       } catch {}
//     })();
//   }, []);

//   // Fetch + socket
// useEffect(() => {
//   if (!chatroomId) return;
//   let cancelled = false;

//   const init = async () => {
//     await fetchMessages();
//     if (cancelled) return;

//     // ✅ join the correct server-side room
//     socket.emit('joinChatroom', { chatroomId, userId: currentUserId || user?.id });
//     // 🔔 clear local unread & badge for this group
//     // dispatch({ type: 'clear-room', roomId: String(chatroomId) });
//    dispatch({ type: 'clear-group', chatroomId });

//     // ✅ new messages from server
// // ✅ new messages from server
// const onNew = (msg) => {
//   if (!msg || String(msg.chatroomId) !== String(chatroomId)) return;

//   setMessages(prev => {
//     const exists = prev.some(m => String(m._id) === String(msg._id));
//     if (exists) return prev;
//     const combined = [...prev, msg].sort(
//       (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
//     );
//     return combined;
//   });

//   // 🔔 In-app sound + toast (only for messages from others)
//   const myId = currentUserId || user?.id;
//   const isFromMe =
//     String(msg.senderId?._id || msg.senderId) === String(myId);

//   if (!isFromMe) {
//     // try to get a nice display name
//     const senderDisplay =
//       msg.senderName ||
//       msg.sender?.firstName ||
//       (msg.senderId && (msg.senderId.firstName || msg.senderId.name)) ||
//       'Someone';

//     // short preview
//     const preview = (msg.message || '').toString().slice(0, 60);

//     // play sound + show toast
//     playPing();
//     showTopToast(
//       `New message in ${chatroomName}`,
//       `${senderDisplay}: ${preview}`
//     );
//   }

//   // keep list scrolled to bottom for active chat
//   requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
// };


 

//     // ✅ typing indicators (server emits these)

//     const onUserTyping = ({ userId: uid, senderName }) => {
//   const name = senderName || 'Someone';
//   setTypingStatus(`${name} is typing…`);
//   setTimeout(() => setTypingStatus(''), 2500);
// };

// const onUserStoppedTyping = ({ userId: uid, senderName }) => {
//   setTypingStatus('');
// };

  

//     // (optional) membership events
//     const onUserJoined = () => {};
//     const onUserLeft = () => {};

//     socket.on('newChatroomMessage', onNew);
//     socket.on('userTyping', onUserTyping);
//     socket.on('userStoppedTyping', onUserStoppedTyping);
//     socket.on('userJoined', onUserJoined);
//     socket.on('userLeft', onUserLeft);

//     return () => {
//       socket.emit('leaveChatroom', { chatroomId, userId: currentUserId || user?.id });
//       socket.off('newChatroomMessage', onNew);
//       socket.off('userTyping', onUserTyping);
//       socket.off('userStoppedTyping', onUserStoppedTyping);
//       socket.off('userJoined', onUserJoined);
//       socket.off('userLeft', onUserLeft);
//     };
//   };

//   init();
//   return () => { cancelled = true; };
// }, [chatroomId, currentUserId, user?.id]);

// useEffect(() => {
//   if (!chatroomId) return;

//   // record the latest keystroke time
//   lastTypedAtRef.current = Date.now();

//   // only emit "typing" when there is text
//   if (text && text.trim().length > 0) {
//     socket.emit('typing', {
//       chatroomId,
//       userId: currentUserId || user?.id,
//       senderName: displayName,   // ✅ send the name
//     });
//   }

//   // debounce "stopTyping"
//   if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//   typingTimeoutRef.current = setTimeout(() => {
//     // if there were no new keystrokes in the last 1.2s, stop typing
//     if (Date.now() - lastTypedAtRef.current >= 1200) {
//       socket.emit('stopTyping', {
//         chatroomId,
//         userId: currentUserId || user?.id,
//         senderName: displayName, // ✅ send the name (optional but nice)
//       });
//     }
//   }, 1200);

//   // cleanup: just clear the timer
//   return () => {
//     if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
//   };
// }, [text, chatroomId, currentUserId, user?.id, displayName]);



//   const fetchMessages = async () => {
//     try {
//       setLoading(true);
//       const token = await AsyncStorage.getItem('token');
//       const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
//       const res = await axios.get(`${API_MESSAGES_URL}/${chatroomId}/messages`, { headers });
//       const sorted = (res.data || []).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
//       setMessages(sorted);
//     } catch (err) {
//       console.error('Fetch messages error:', err?.response?.data || err.message);
//     } finally { setLoading(false); }
//   };

//   const handleReply = (m) => setReplyTo(m);
//   const cancelReply = () => setReplyTo(null);

//   const sendMessage = async () => {
//   if (!text.trim()) return;

//   try {
//     const userStr = await AsyncStorage.getItem('user');
//     if (!userStr) return;
//     const sender = JSON.parse(userStr);

//     const payload = {
//       chatroomId,
//       message: text.trim(),
//       senderId: sender._id || sender.id,
//       senderName: sender.firstName,
//       avatarUrl: sender.photos?.[0]?.startsWith('http') ? sender.photos[0] : `${BASE_URL}${sender.photos?.[0] || ''}`,
//       media: [],
//       replyTo: replyTo
//         ? {
//             messageId: replyTo._id,
//             senderId: replyTo.senderId?._id || replyTo.senderId,
//             senderName: replyTo.senderName,
//             message: replyTo.message,
//           }
//         : null,
//     };

//     setText('');
//     setReplyTo(null);
//     setInputHeight(MIN_INPUT_HEIGHT);

//     if (socket.connected) {
//       // ✅ Server will persist + broadcast; our onNew listener will append
//       socket.emit('sendChatroomMessage', payload);
//     } else {
//       // Fallback: REST (server should also broadcast if you added the emit in service)
//       const token = await AsyncStorage.getItem('token');
//       const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
//       const res = await axios.post(`${API_MESSAGES_URL}/`, payload, { headers });
//       const saved = res.data;
//       setMessages(prev => {
//         const exists = prev.some(m => String(m._id) === String(saved._id));
//         if (exists) return prev;
//         const combined = [...prev, saved].sort(
//           (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
//         );
//         return combined;
//       });
//       requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
//     }
//   } catch {
//     Alert.alert('Failed to send message');
//   }
// };


  

//   const addReaction = (messageId, emoji) => {
//     setMessages((prev) =>
//       prev.map((m) => {
//         if (m._id !== messageId) return m;
//         if (!m.reactions) return { ...m, reactions: [emoji] };
//         if (m.reactions.includes(emoji)) return m;
//         return { ...m, reactions: [...m.reactions, emoji] };
//       })
//     );
//   };

//   const showMessageActions = (item) => {
//     Alert.alert('Message Options', '', [
//       { text: '❤️ React', onPress: () => addReaction(item._id, '❤️') },
//       { text: 'Reply', onPress: () => handleReply(item) },
//       { text: 'Cancel', style: 'cancel' },
//     ]);
//   };

//   const renderItem = ({ item }) => {
//     const isMyMessage = isSelfMessage(item);
//     const panResponder = PanResponder.create({
//       onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 20,
//       onPanResponderRelease: () => handleReply(item),
//     });

//     return (
//       <View style={{ alignItems: isMyMessage ? 'flex-end' : 'flex-start' }}>
//         <TouchableOpacity
//           onLongPress={() => showMessageActions(item)}
//           style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}
//           {...panResponder.panHandlers}
//         >
//           {!isMyMessage && (
//             <TouchableOpacity
//               style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}
//               onPress={() => openUserProfile(item)}
//             >
//               {item.avatarUrl && <Image source={{ uri: toAbs(item.avatarUrl) }} style={styles.avatar} />}
//               <Text style={styles.sender}>{item.senderName || 'Unknown'}:</Text>
//             </TouchableOpacity>
//           )}

//           {item.replyTo && (
//             <View style={[styles.replyBox, isMyMessage ? styles.replyBoxMine : styles.replyBoxOther]}>
//               <Text style={styles.replyName}>{item.replyTo.senderName} said:</Text>
//               <Text style={styles.replyText}>{item.replyTo.message}</Text>
//             </View>
//           )}

//           <Text>{item.message}</Text>

//           <View style={styles.footerRow}>
//             <Text style={styles.timestamp}>
//               {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//             </Text>
//             {item.reactions && (
//               <View style={styles.reactions}>
//                 {item.reactions.map((emoji, idx) => (
//                   <Text key={idx} style={styles.reactionEmoji}>{emoji}</Text>
//                 ))}
//               </View>
//             )}
//           </View>
//         </TouchableOpacity>
//       </View>
//     );
//   };

//   if (!chatroomId) {
//     return <View style={styles.center}><Text>Error: Chatroom ID not provided.</Text></View>;
//   }

//   return (
//     <SASafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         // iOS: use real header height so there’s no overlap or gap
//         keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeightFromNav : 0}
//       >
//         <FlatList
//           keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
//           keyboardShouldPersistTaps="handled"
//           ref={flatListRef}
//           data={messages}
//           keyExtractor={(item) => item._id || item.createdAt || Math.random().toString()}
//           renderItem={renderItem}
//           contentContainerStyle={{
//             padding: 10,
//             // keep last message visible under lifted composer
//             paddingBottom: kbVisible ? 8 + ANDROID_KEYBOARD_BUMP : 8,
//           }}
//           onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
//           ListEmptyComponent={
//             <View style={{ paddingVertical: 24, alignItems: 'center' }}>
//               <Text>No messages yet. Say hi 👋</Text>
//             </View>
//           }
//         />

//         {replyTo && (
//           <View style={styles.replyPreview}>
//             <Text style={styles.replyLabel}>Replying to {replyTo.senderName}</Text>
//             <Text numberOfLines={1}>{replyTo.message}</Text>
//             <TouchableOpacity onPress={cancelReply}><Text style={styles.cancelReply}>✕</Text></TouchableOpacity>
//           </View>
//         )}

//         {typingStatus ? <Text style={styles.typing}>{typingStatus}</Text> : null}

//         {/* Composer inside bottom safe area */}
//         <SASafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
//           <View
//             style={[
//               styles.composerBar,
//               { paddingBottom: composerBottomPad, marginBottom: ANDROID_KEYBOARD_BUMP },
//             ]}
//           >
//             <TouchableOpacity
//               activeOpacity={1}
//               style={styles.inputWrapper}
//               onPress={() => inputRef.current?.focus()}
//             >
//               <TextInput
//                 ref={inputRef}
//                 style={styles.composerInput}
//                 value={text}
//                 onChangeText={setText}
//                 placeholder="Message"
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
//               onPress={sendMessage}
//               disabled={!text.trim()}
//               style={[styles.sendFab, !text.trim() && { opacity: 0.4 }]}
//               accessibilityRole="button"
//               accessibilityLabel="Send message"
//             >
//               <Ionicons name="send" size={18} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </SASafeAreaView>

//         {loading && (
//           <View style={styles.loadingOverlay}>
//             <ActivityIndicator size="large" color="#581845" />
//           </View>
//         )}
//       </KeyboardAvoidingView>
//     </SASafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },

//   messageContainer: { marginBottom: 10, padding: 10, borderRadius: 10, maxWidth: '85%' },
//   myMessage: { backgroundColor: '#eee', alignSelf: 'flex-end' },
//   otherMessage: { backgroundColor: '#eee', alignSelf: 'flex-start' },

//   sender: { fontWeight: 'bold', marginBottom: 3 },

//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//   timestamp: { fontSize: 10, color: '#888', marginTop: 5, marginRight: 6 },
//   avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },

//   typing: { fontStyle: 'italic', marginLeft: 10, marginBottom: 5, color: '#666' },

//   replyPreview: {
//     backgroundColor: '#eee',
//     padding: 8,
//     borderLeftColor: '#581845',
//     borderLeftWidth: 4,
//     marginHorizontal: 10,
//     marginBottom: 5,
//     borderRadius: 5,
//   },
//   replyLabel: { fontWeight: 'bold' },
//   cancelReply: { position: 'absolute', top: 4, right: 8, fontSize: 18, color: '#888' },

//   replyBox: {
//     backgroundColor: '#dcdcdc',
//     padding: 5,
//     borderLeftWidth: 3,
//     borderLeftColor: '#581845',
//     marginBottom: 5,
//     borderRadius: 5,
//     maxWidth: '90%',
//   },
//   replyName: { fontWeight: 'bold', fontSize: 12 },
//   replyText: { fontSize: 12 },

//   footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
//   reactions: { flexDirection: 'row', marginLeft: 10 },
//   reactionEmoji: { marginLeft: 3, fontSize: 16 },

//   loadingOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(255,255,255,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   replyBoxMine: { backgroundColor: '#dcdcdc', alignSelf: 'flex-end' },
//   replyBoxOther: { backgroundColor: '#ddd', alignSelf: 'flex-start' },

//   // Composer
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

