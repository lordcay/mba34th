


// ChatRoomScreen.js (hotfix)
import React, { useState, useEffect, useRef, useContext, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';
import EmojiSelector from 'react-native-emoji-selector';
import { Picker } from 'emoji-mart-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';


const BASE_URL = 'http://192.168.0.169:4000';
const API_MESSAGES_URL = `${BASE_URL}/api/chatroom-messages`;
const SOCKET_SERVER_URL = BASE_URL;





export default function ChatRoomScreen({ route }) {
  const routeHook = useRoute();
  const navigation = useNavigation();

  const MIN_INPUT_HEIGHT = 40;   // collapsed height
  const MAX_INPUT_HEIGHT = 140;  // cap before inner scroll
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const inputRef = useRef(null);


  const chatroomName =
    route?.params?.chatroomName ||
    routeHook?.params?.chatroomName ||
    route?.params?.room?.name ||
    routeHook?.params?.room?.name ||
    'Chat';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: chatroomName,
      // headerBackTitleVisible: false,
      // headerBackTitle: '',

      headerBackTitleVisible: false,
      headerBackTitle: '',
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
          <Ionicons name="chevron-back" size={26} color="#581845" />
        </TouchableOpacity>
      ),
      // (Optional) keep title color unchanged instead of inheriting tint
      headerTitleStyle: { color: '#222' },
    });
  }, [navigation, chatroomName]);

  const chatroomId = route?.params?.chatroomId;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingStatus, setTypingStatus] = useState('');
  const socketRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);
  const { user } = useContext(AuthContext);

  // cache of verified users keyed by id/_id
  const verifiedCache = useRef(new Map());
  const verifiedLoaded = useRef(false);

  const toAbs = (p) => (p && typeof p === 'string' && !p.startsWith('http') ? `${BASE_URL}${p}` : p);
  const normalizeUser = (raw) => {
    if (!raw) return null;
    const photos = Array.isArray(raw.photos) ? raw.photos.map(toAbs) : [];
    return {
      ...raw,
      id: raw.id || raw._id,
      _id: raw._id || raw.id,
      photos,
      avatarUrl: photos?.[0] || toAbs(raw.avatarUrl),
    };
  };

  const getSenderObject = (item) => {
    if (item?.senderId && typeof item.senderId === 'object') return item.senderId;
    if (item?.sender && typeof item.sender === 'object') return item.sender;
    return null;
  };

  const getSenderId = (item) => {
    if (!item) return null;
    if (item.senderId && typeof item.senderId === 'object') return item.senderId._id || item.senderId.id;
    if (item.senderId) return item.senderId;
    if (item.sender && typeof item.sender === 'object') return item.sender._id || item.sender.id;
    return null;
  };

  // Build a normalized set of "my" ids from AuthContext + AsyncStorage
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

  const navigateToUserProfile = (userObj) => {
    const parent = navigation.getParent?.();
    (parent || navigation).navigate('UserProfile', { user: userObj });
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
    } catch {
      verifiedLoaded.current = true;
    }
  };

  const openUserProfile = async (item) => {
    // ✅ Hard guard — do nothing if user taps their own header
    if (isSelfMessage(item)) return;

    setLoading(true);
    try {
      // Prefer embedded sender
      const embedded = normalizeUser(getSenderObject(item));
      const senderId = embedded?.id || getSenderId(item);
      if (!senderId) {
        setLoading(false);
        return Alert.alert('Profile unavailable', 'No sender id on this message.');
      }

      // 1) Try verified cache (same as HomeScreen source)
      await ensureVerifiedCache();
      const fromCache = verifiedCache.current.get(String(senderId));
      if (fromCache) {
        setLoading(false);
        return navigateToUserProfile(fromCache);
      }

      // 2) Try direct profile (may be restricted)
      try {
        const res = await api.get(`/accounts/${senderId}`);
        const raw = res?.data?.user || res?.data;
        const full = normalizeUser(raw);
        if (full?.id) {
          setLoading(false);
          return navigateToUserProfile(full);
        }
      } catch (err) {
        const code = err?.response?.status;
        if (code !== 401 && code !== 403) {
          console.log('openUserProfile /accounts/:id error', err?.response?.data || err.message);
        }
      }

      // 3) Fallback minimal object
      const fallback = embedded || normalizeUser({
        _id: senderId,
        firstName: item?.senderName || 'Unknown',
        photos: item?.avatarUrl ? [item.avatarUrl] : [],
        avatarUrl: item?.avatarUrl,
      });
      setLoading(false);
      return navigateToUserProfile(fallback);
    } catch (err) {
      console.error('Open profile error:', err?.response?.data || err.message);
      const fallback = normalizeUser({
        _id: getSenderId(item),
        firstName: item?.senderName || 'Unknown',
        photos: item?.avatarUrl ? [item.avatarUrl] : [],
        avatarUrl: item?.avatarUrl,
      });
      setLoading(false);
      return navigateToUserProfile(fallback);
    }
  };

  // Load current user id from storage (backup to AuthContext)
  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          setCurrentUserId(parsed._id || parsed.id);
        }
      } catch (err) {
        console.error('Load user error', err);
      }
    })();
  }, []);

  // Fetch + socket
  useEffect(() => {
    if (!chatroomId) return;
    let cancelled = false;

    const init = async () => {
      await fetchMessages();
      if (cancelled) return;

      socketRef.current = io(SOCKET_SERVER_URL, { transports: ['websocket'] });
      socketRef.current.emit('joinRoom', chatroomId);

      socketRef.current.on('newChatroomMessage', (msg) => {
        if (!msg) return;
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(msg._id));
          if (exists) return prev;
          const combined = [...prev, msg];
          combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return combined;
        });
      });

      socketRef.current.on('typing', (name) => {
        setTypingStatus(`${name} is typing...`);
        setTimeout(() => setTypingStatus(''), 3000);
      });
    };

    init();
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
  }, [chatroomId]);

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
    } finally {
      setLoading(false);
    }
  };

  const handleTyping = async () => {
    try {
      const user = await AsyncStorage.getItem('user');
      if (user && socketRef.current) {
        socketRef.current.emit('typing', JSON.parse(user).firstName);
      }
    } catch { }
  };

  const handleReply = (message) => setReplyTo(message);
  const cancelReply = () => setReplyTo(null);

  const sendMessage = async () => {
    if (!text.trim()) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const sender = JSON.parse(userStr);

      const payload = {
        chatroomId,
        message: text,
        senderId: sender._id || sender.id,
        senderName: sender.firstName,
        avatarUrl: sender.photos?.[0]?.startsWith('http')
          ? sender.photos[0]
          : `${BASE_URL}${sender.photos?.[0] || ''}`,
        replyTo: replyTo
          ? {
            messageId: replyTo._id,
            senderId: replyTo.senderId?._id || replyTo.senderId,
            senderName: replyTo.senderName,
            message: replyTo.message,
          }
          : null,
      };

      setText('');
      setReplyTo(null);
      setInputHeight(MIN_INPUT_HEIGHT);


      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.post(`${API_MESSAGES_URL}/`, payload, { headers });
      const saved = res.data;

      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(saved._id));
        if (exists) return prev;
        const combined = [...prev, saved];
        combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return combined;
      });
    } catch (err) {
      console.error('Send message error:', err?.response?.data || err.message);
      Alert.alert('Failed to send message');
    }
  };

  const addReaction = (messageId, emoji) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id !== messageId) return msg;
        if (!msg.reactions) return { ...msg, reactions: [emoji] };
        if (msg.reactions.includes(emoji)) return msg;
        return { ...msg, reactions: [...msg.reactions, emoji] };
      })
    );
  };

  const showMessageActions = (item) => {
    Alert.alert('Message Options', '', [
      { text: '❤️ React', onPress: () => addReaction(item._id, '❤️') },
      { text: 'Reply', onPress: () => handleReply(item) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }) => {
    const isMyMessage = isSelfMessage(item);

    const panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: () => handleReply(item),
    });

    return (
      <View style={{ alignItems: isMyMessage ? 'flex-end' : 'flex-start' }}>
        <TouchableOpacity
          onLongPress={() => showMessageActions(item)}
          style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.otherMessage]}
          {...panResponder.panHandlers}
        >
          {/* Only other users are tappable */}
          {!isMyMessage && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}
              onPress={() => openUserProfile(item)}
            >
              {item.avatarUrl && <Image source={{ uri: toAbs(item.avatarUrl) }} style={styles.avatar} />}
              <Text style={styles.sender}>{item.senderName || 'Unknown'}:</Text>
            </TouchableOpacity>
          )}

          {item.replyTo && (
            <View style={[styles.replyBox, isMyMessage ? styles.replyBoxMine : styles.replyBoxOther]}>
              <Text style={styles.replyName}>{item.replyTo.senderName} said:</Text>
              <Text style={styles.replyText}>{item.replyTo.message}</Text>
            </View>
          )}

          <Text>{item.message}</Text>

          <View style={styles.footerRow}>
            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {item.reactions && (
              <View style={styles.reactions}>
                {item.reactions.map((emoji, idx) => (
                  <Text key={idx} style={styles.reactionEmoji}>
                    {emoji}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (!chatroomId) {
    return (
      <View style={styles.center}>
        <Text>Error: Chatroom ID not provided.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id || item.createdAt || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text>No messages yet. Say hi 👋</Text>
          </View>
        }
      />

      {replyTo && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyLabel}>Replying to {replyTo.senderName}</Text>
          <Text numberOfLines={1}>{replyTo.message}</Text>
          <TouchableOpacity onPress={cancelReply}>
            <Text style={styles.cancelReply}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {typingStatus ? <Text style={styles.typing}>{typingStatus}</Text> : null}


      <View style={styles.composerBar}>
        {/* <TouchableOpacity
          onPress={() => setShowEmojiPicker((v) => !v)}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Toggle emoji picker"
        >
          <Ionicons name="happy-outline" size={24} color="#581845" />
        </TouchableOpacity> */}

        {/* Make the whole wrapper focus the input (helps Android). */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.inputWrapper}
          onPress={() => inputRef.current?.focus()}
        >
          <TextInput
            ref={inputRef}
            style={styles.composerInput}              // <-- no explicit height
            value={text}
            onChangeText={(val) => {
              setText(val);
              handleTyping();
            }}
            placeholder="Message"
            placeholderTextColor="#999"
            selectionColor="#581845"
            multiline
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            // Grow naturally, and once content is taller than MAX, let it scroll
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


      {/* Modern, auto-growing composer */}
      {/* <View style={styles.composerBar}>
        <TouchableOpacity
          onPress={() => setShowEmojiPicker((v) => !v)}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Toggle emoji picker"
        >
          <Ionicons name="happy-outline" size={24} color="#581845" />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.composerInput,
              { height: Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, inputHeight)) },
            ]}
            value={text}
            onChangeText={(val) => {
              setText(val);
              handleTyping();
            }}
            placeholder="Message"
            placeholderTextColor="#999"
            selectionColor="#581845"
            textAlignVertical="top"
            // multiline auto-grow
            multiline
            onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
            // allow inner scroll once capped
            scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
            blurOnSubmit={false}
            returnKeyType="default"
          />
        </View>

        <TouchableOpacity
          onPress={sendMessage}
          disabled={!text.trim()}
          style={[styles.sendFab, !text.trim() && { opacity: 0.4 }]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View> */}


      {/* <View style={styles.inputContainer}>
        <TouchableOpacity onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
          <Text style={{ fontSize: 24, marginRight: 5 }}>😊</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={(val) => {
            setText(val);
            handleTyping();
          }}
          placeholder="Type a message"
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Send</Text>
        </TouchableOpacity>
      </View> */}

      {showEmojiPicker && (
        <EmojiSelector
          onEmojiSelected={(emoji) => {
            setText((prev) => prev + (emoji.native || emoji));
            setShowEmojiPicker(false);
          }}
          showSearchBar={false}
          showTabs
          showHistory
          columns={8}
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#581845" />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  messageContainer: { marginBottom: 10, padding: 10, borderRadius: 10, maxWidth: '85%' },
  myMessage: { backgroundColor: '#eee', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#eee', alignSelf: 'flex-start' },
  sender: { fontWeight: 'bold', marginBottom: 3 },
  inputContainer: {
    flexDirection: 'row', padding: 10, borderTopColor: '#ccc', borderTopWidth: 1,
    backgroundColor: '#fff', alignItems: 'center',
  },
  input: { flex: 1, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 20, marginRight: 10 },
  sendButton: { backgroundColor: '#581845', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timestamp: { fontSize: 10, color: '#888', marginTop: 5, marginRight: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  typing: { fontStyle: 'italic', marginLeft: 10, marginBottom: 5, color: '#666' },
  replyPreview: {
    backgroundColor: '#eee', padding: 8, borderLeftColor: '#581845', borderLeftWidth: 4,
    marginHorizontal: 10, marginBottom: 5, borderRadius: 5,
  },
  replyLabel: { fontWeight: 'bold' },
  cancelReply: { position: 'absolute', top: 4, right: 8, fontSize: 18, color: '#888' },
  replyBox: {
    backgroundColor: '#dcdcdc', padding: 5, borderLeftWidth: 3, borderLeftColor: '#581845',
    marginBottom: 5, borderRadius: 5, maxWidth: '90%',
  },
  replyName: { fontWeight: 'bold', fontSize: 12 },
  replyText: { fontSize: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  reactions: { flexDirection: 'row', marginLeft: 10 },
  reactionEmoji: { marginLeft: 3, fontSize: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  replyBoxMine: { backgroundColor: '#dcdcdc', alignSelf: 'flex-end' },
  replyBoxOther: { backgroundColor: '#ddd', alignSelf: 'flex-start' },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',              // keeps send aligned when input grows
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f7',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxHeight: 160, // visual cap; actual cap enforced by MAX_INPUT_HEIGHT
  },
  composerInput: {
    fontSize: 16,
    lineHeight: 22,
    // TextInput will get dynamic height; ensure it can shrink/grow nicely
    padding: 0,      // we already padded the wrapper
    color: '#111',
  },
  sendFab: {
    backgroundColor: '#581845',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
