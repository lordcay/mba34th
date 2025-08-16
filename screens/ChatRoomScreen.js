
// ChatRoomScreen.js (hotfix)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import axios from 'axios';
import EmojiSelector from 'react-native-emoji-selector';
import { Picker } from 'emoji-mart-native';

const BASE_URL = 'https://three4th-street-backend.onrender.com';
const API_MESSAGES_URL = `${BASE_URL}/api/chatroom-messages`;
const SOCKET_SERVER_URL = BASE_URL;

export default function ChatRoomScreen({ route }) {
  const chatroomId = route?.params?.chatroomId;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false); // start as false so UI isn't blocked
  const [typingStatus, setTypingStatus] = useState('');
  const socketRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  // Load user (don’t block UI)
  useEffect(() => {
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          setCurrentUserId(u._id);
        }
      } catch (err) {
        console.error('Load user error', err);
      }
    })();
  }, []);

  // Fetch + socket: do NOT wait for currentUserId; fetch as soon as we have chatroomId
  useEffect(() => {
    if (!chatroomId) return;

    let cancelled = false;

    const init = async () => {
      // fetch messages
      await fetchMessages();

      if (cancelled) return;

      // connect socket
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
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [chatroomId]);

  // Fetch messages from API (never leave loading stuck)
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
      // still allow UI
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

  const handleEmojiSelect = (emoji) => {
    const val = emoji?.native || emoji;
    setText((prev) => prev + (val || ''));
  };

  const handleReply = (message) => setReplyTo(message);
  const cancelReply = () => setReplyTo(null);

  const getSenderId = (item) => {
    if (!item) return null;
    if (item.senderId && typeof item.senderId === 'object') return item.senderId._id || item.senderId;
    if (item.senderId) return item.senderId;
    if (item.sender && typeof item.sender === 'object') return item.sender._id || item.sender;
    return null;
  };

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
        senderId: sender._id,
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

      // Clear input immediately for UX
      setText('');
      setReplyTo(null);

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

      // Optional: if the server *doesn’t* broadcast, you could emit saved here
      // socketRef.current?.emit('sendChatroomMessage', saved);
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
    const senderIdFromItem = getSenderId(item);
    const isMyMessage = currentUserId && String(senderIdFromItem) === String(currentUserId);

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
          {/* Avatar and name for other users */}
          {!isMyMessage && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
              {item.avatarUrl && <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />}
              <Text style={styles.sender}>{item.senderName || 'Unknown'}:</Text>
            </View>
          )}

          {/* Reply box */}
          {item.replyTo && (
            <View
              style={[
                styles.replyBox,
                isMyMessage ? styles.replyBoxMine : styles.replyBoxOther
              ]}
            >
              <Text style={styles.replyName}>{item.replyTo.senderName} said:</Text>
              <Text style={styles.replyText}>{item.replyTo.message}</Text>
            </View>
          )}

          {/* Main message */}
          <Text>{item.message}</Text>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
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

      <View style={styles.inputContainer}>
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
      </View>

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

      {/* non-blocking loading overlay */}
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
  messageContainer: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    maxWidth: '85%',
  },
  myMessage: {
    backgroundColor: '#d1c4e9',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
  sender: { fontWeight: 'bold', marginBottom: 3 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#581845',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timestamp: { fontSize: 10, color: '#888', marginTop: 5 },
  avatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  typing: { fontStyle: 'italic', marginLeft: 10, marginBottom: 5, color: '#666' },
  replyPreview: {
    backgroundColor: '#eee',
    padding: 8,
    borderLeftColor: '#581845',
    borderLeftWidth: 4,
    marginHorizontal: 10,
    marginBottom: 5,
    borderRadius: 5,
  },
  replyLabel: { fontWeight: 'bold' },
  cancelReply: { position: 'absolute', top: 4, right: 8, fontSize: 18, color: '#888' },
  replyBox: {
    backgroundColor: '#dcdcdc',
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#581845',
    marginBottom: 5,
    borderRadius: 5,
    maxWidth: '90%',

  },
  replyName: { fontWeight: 'bold', fontSize: 12 },
  replyText: { fontSize: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reactions: { flexDirection: 'row', marginLeft: 10 },
  reactionEmoji: { marginLeft: 3, fontSize: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyBoxMine: {
    backgroundColor: '#c5b6e0', // lighter purple for my replies
    alignSelf: 'flex-end',
  },
  replyBoxOther: {
    backgroundColor: '#ddd', // lighter grey for others' replies
    alignSelf: 'flex-start',
  },
});

