import React, {
  useEffect,
  useState,
  useContext,
  useRef,
  useLayoutEffect,
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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


const BASE_URL = 'https://three4th-street-backend.onrender.com';

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

  useLayoutEffect(() => {
  const schoolFromEmail = formatSchoolFromEmail(peer?.email);

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
        <Image
          source={{
            uri:
              userData?.photos?.[0] ||
              (peer?.photos?.[0] ? toAbs(peer.photos[0]) : 'https://via.placeholder.com/150'),
          }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            marginRight: 10,
            backgroundColor: '#eee',
          }}
        />
        <View style={{ maxWidth: 220 }}>
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
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, color: '#666' }}
          >
            {schoolFromEmail}
          </Text>
        </View>
      </TouchableOpacity>
    ),
  });
}, [navigation, userData, peer]);



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

    socket.on('message:new', onNew);
    socket.on('newMessage', onNew);
    socket.on('message:read', onRead);
    socket.on('dm:userTyping', onTyping);
    socket.on('dm:userStoppedTyping', onStoppedTyping);

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
  if (!input.trim() || !peerId) return;

  const payload = {
    senderId: userId,
    recipientId: peerId,
    message: input.trim(),
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

    setInput('');
    setInputHeight(MIN_INPUT_HEIGHT);

  } catch (err) {
    console.error('❌ Failed to send DM message:', err?.response?.data || err);

    // ⛔️ Detect objectionable content rejection
    const serverMsg = err?.response?.data?.message;

    if (serverMsg === 'Message contains inappropriate content.') {
      Alert.alert('Message not sent', 'This message includes inappropriate language and cannot be delivered.');  // fallback
    } else {
      Alert.alert('Failed to send message');  // fallback
    }
  }
};


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

  const renderMessage = ({ item }) => {
    const isMine =
      asId(item.senderId) === String(userId);
    return (
      <View
        style={[
          styles.messageBubble,
          isMine ? styles.outgoing : styles.incoming,
        ]}
      >
        <Text style={styles.messageText}>
          {item.message}
        </Text>
        <Text style={styles.timestamp}>
          {moment(item.timestamp).format('h:mm A')}{' '}
          {item.read ? '✓✓' : '✓'}
        </Text>
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
          />

          {typingStatus ? (
            <Text style={styles.typing}>
              {typingStatus}
            </Text>
          ) : null}

<View
  style={[
    styles.composerBar,
    { paddingBottom: composerBottomPad },
  ]}
>
  <View style={styles.inputWrapper}>
    <ScrollView
      ref={scrollRef}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      showsVerticalScrollIndicator={false}
      style={{ maxHeight: 140 }}
    >


      <TextInput
  ref={inputRef}
  style={[
  styles.composerInput,
  { minHeight: MIN_INPUT_HEIGHT, maxHeight: MAX_INPUT_HEIGHT }
]}

  // style={[styles.composerInput, { height: inputHeight }]}
  value={input}
  onChangeText={setInput}
  placeholder="Type a message…"
  placeholderTextColor="#999"
  multiline
  textAlignVertical="top"
  onContentSizeChange={(e) => {
    if (!e?.nativeEvent?.contentSize) return;   // safety check
    const height = e.nativeEvent.contentSize.height;
    setInputHeight(
      Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, height))
    );
  }}
/>

      {/* <TextInput
        ref={inputRef}
        style={styles.composerInput}
        value={input}
        onChangeText={setInput}
        placeholder="Type a message…"
        placeholderTextColor="#999"
        multiline

        onContentSizeChange={(e) => {
  const height = e.nativeEvent.contentSize.height;
  setInputHeight(Math.min(height, MAX_INPUT_HEIGHT));
}}

        // onChange={(e) => {
        //   const height = e.nativeEvent.contentSize.height;
        //   setInputHeight(Math.min(height, MAX_INPUT_HEIGHT));
        // }}
        textAlignVertical="top"
        autoCorrect
      /> */}
    </ScrollView>
  </View>

  <TouchableOpacity
    onPress={handleSend}
    disabled={!input.trim()}
    style={[
      styles.sendFab,
      !input.trim() && { opacity: 0.4 },
    ]}
  >
    <Ionicons name="send" size={18} color="#fff" />
  </TouchableOpacity>
</View>



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

  messageText: { color: '#000', fontSize: 16 },
  timestamp: {
    fontSize: 10,
    color: '#000',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  composerBar: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  paddingHorizontal: 10,
  paddingTop: 6,
  paddingBottom: 8,
  borderTopWidth: 1,
  borderTopColor: '#eee',
  backgroundColor: '#fff',
},

inputWrapper: {
  flex: 1,
  backgroundColor: '#f1f1f1',
  borderRadius: 24,
  paddingHorizontal: 12,
  maxHeight: 140,
},

composerInput: {
  fontSize: 16,
  paddingVertical: 8,
  lineHeight: 22,
  color: '#111',
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
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typing: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    color: '#666',
    fontStyle: 'italic',
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

// const api = axios.create({ baseURL: 'https://three4th-street-backend.onrender.com' });

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
//           `https://three4th-street-backend.onrender.com/accounts/${userData.id || userData._id}`,
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
// //           `https://three4th-street-backend.onrender.com/accounts/${users.id || users._id}`,
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
//           `https://three4th-street-backend.onrender.com/accounts/${userData.id || userData._id}`,
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
//           : `https://three4th-street-backend.onrender.com${userData?.photos?.[0] || ''}`,
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
//       const res = await axios.get(`https://three4th-street-backend.onrender.com/messages/${user.id}`, {
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
//       const res = await axios.post('https://three4th-street-backend.onrender.com/messages', payload, {
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
//               : `https://three4th-street-backend.onrender.com${user?.photos?.[0] || ''}`,
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
//       const res = await axios.get(`https://three4th-street-backend.onrender.com/messages/${user.id}`, {
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
//       const res = await axios.post('https://three4th-street-backend.onrender.com/messages', payload, {
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
//       const res = await axios.get(`https://three4th-street-backend.onrender.com/messages/${user.id}`, {
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
//     await axios.post('https://three4th-street-backend.onrender.com/messages', payload, {
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
//                 : `https://three4th-street-backend.onrender.com${user.photos?.[0]}` || 'https://via.placeholder.com/150',
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
