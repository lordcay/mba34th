

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
//   SafeAreaView
// } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useRoute } from '@react-navigation/native';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import moment from 'moment';
// import { useNavigation } from '@react-navigation/native';
// import { Image } from 'react-native';
// import { socket } from '../socket'; // adjust path based on your folder structure



// const PrivateChatScreen = () => {
//   const { token, userId } = useContext(AuthContext);
//   const navigation = useNavigation();


//   const route = useRoute();
//   const { user } = route.params;

//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [isTyping, setIsTyping] = useState(false);

//   const MIN_INPUT_HEIGHT = 40;
//   const MAX_INPUT_HEIGHT = 140;
//   const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
//   const inputRef = useRef(null);

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


//   // const schoolFromEmail = user.email.split('@')[1]?.split('.')[0] || 'Unknown School';


//   const schoolFromEmail = formatSchoolFromEmail(user?.email);




//   useEffect(() => {
//     socket.on('connect', () => {
//       console.log('🔌 Socket connected');
//     });

//     socket.on('messagesRead', ({ from }) => {
//       console.log(`✅ Messages from ${from} marked as read`);
//     });

//     return () => {
//       socket.off('connect');
//       socket.off('messagesRead');
//     };
//   }, []);


//   useEffect(() => {
//     fetchMessages();
//   }, []);

//   useEffect(() => {
//     if (userId && user?.id) {
//       socket.emit('readMessages', {
//         readerId: userId,
//         senderId: user.id
//       });
//     }
//   }, []);


//   const fetchMessages = async () => {
//     try {
//       const res = await axios.get(`http://192.168.0.169:4000/messages/${user.id}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setMessages(res.data.reverse()); // show most recent at bottom
//     } catch (err) {
//       console.error('Failed to fetch messages:', err);
//     }
//   };




//   const handleSend = async () => {
//     if (!input.trim()) return;

//     const newMessage = {
//       senderId: userId,
//       recipientId: user.id,
//       message: input
//     };

//     try {
//       const res = await axios.post('http://192.168.0.169:4000/messages', newMessage, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setMessages([res.data, ...messages]); // add new message
//       setInput('');
//       setInputHeight(MIN_INPUT_HEIGHT);

//     } catch (err) {
//       console.error('Failed to send message:', err);
//     }
//   };



//   const renderMessage = ({ item }) => (
//     <View style={[
//       styles.messageBubble,
//       item.senderId !== user.id ? styles.incoming : styles.outgoing
//     ]}>
//       <Text style={styles.messageText}>{item.message}</Text>
//       <Text style={styles.timestamp}>
//         {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
//       </Text>


//     </View>
//   );




//   return (
//     <SafeAreaView style={styles.container}>
//       {/* 🔝 Top bar */}

//       <View style={styles.topBar}>
//         <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#000" />
//         </TouchableOpacity>



//         <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user })}>
//           <Image
//             source={{
//               uri:
//                 user?.photos?.[0]?.startsWith('http')
//                   ? user.photos[0]
//                   : `http://192.168.0.169:4000${user.photos?.[0]}` || 'https://via.placeholder.com/150',
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




//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         keyboardVerticalOffset={90}
//       >
//         <FlatList
//           keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}

//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={(item, index) => index.toString()}
//           contentContainerStyle={styles.messages}
//           inverted
//         />

//         {/* 💬 Input */}

//         {/* {isTyping ? <Text style={styles.typingHint}>You’re typing…</Text> : null} */}

//         <View style={styles.composerBar}>
//           {/* Focus the field when wrapper is tapped (Android nicety) */}
//           <TouchableOpacity
//             activeOpacity={1}
//             style={styles.inputWrapper}
//             onPress={() => inputRef.current?.focus()}
//           >
//             <TextInput
//               ref={inputRef}
//               style={styles.composerInput}          // ⬅️ no fixed height
//               value={input}
//               onChangeText={(t) => {
//                 setInput(t);
//                 setIsTyping(t.length > 0);
//               }}
//               placeholder="Type a message…"
//               placeholderTextColor="#999"
//               selectionColor="#581845"
//               underlineColorAndroid="transparent"
//               multiline
//               textAlignVertical="top"
//               onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
//               scrollEnabled={inputHeight > (MAX_INPUT_HEIGHT - 4)}   // inner scroll when tall
//               blurOnSubmit={false}
//               returnKeyType="default"
//               autoCorrect
//               autoCapitalize="sentences"
//               keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
//             />
//           </TouchableOpacity>

//           <TouchableOpacity
//             onPress={handleSend}
//             disabled={!input.trim()}
//             style={[styles.sendFab, !input.trim() && { opacity: 0.4 }]}
//           >
//             <Ionicons name="send" size={18} color="#fff" />
//           </TouchableOpacity>
//         </View>



//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// export default PrivateChatScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   topBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ddd',
//     backgroundColor: '#fff',
//   },
//   backButton: {
//     marginRight: 10,
//   },
//   profileImage: {
//     width: 40,
//     height: 40,
//     borderRadius: 20,
//     marginRight: 10,
//   },
//   userInfo: {
//     flexDirection: 'column',
//   },


//   topBarName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#000',
//   },
//   topBarSchool: {
//     fontSize: 14,
//     color: '#000'
//   },
//   messages: {
//     padding: 10,
//   },
//   messageBubble: {
//     maxWidth: '75%',
//     padding: 10,
//     borderRadius: 15,
//     marginBottom: 10,
//   },



//   incoming: {
//     backgroundColor: '#f8f8f8',
//     alignSelf: 'flex-end',
//     color: '#000',
//   },
//   outgoing: {
//     backgroundColor: '#f8f8f8',
//     alignSelf: 'flex-start',
//   },


//   messageText: {
//     color: '#000',
//     fontSize: 16,
//   },
//   timestamp: {
//     fontSize: 10,
//     color: '#000',
//     marginTop: 5,
//     alignSelf: 'flex-end',
//   },
//   inputContainer: {
//     flexDirection: 'row',
//     padding: 10,
//     borderTopColor: '#ccc',
//     borderTopWidth: 1,
//     backgroundColor: '#fff',
//   },
//   input: {
//     flex: 1,
//     height: 45,
//     borderColor: '#ccc',
//     borderWidth: 1,
//     borderRadius: 20,
//     paddingHorizontal: 15,
//   },
//   sendButton: {
//     backgroundColor: '#581845',
//     borderRadius: 25,
//     padding: 10,
//     marginLeft: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   typingHint: {
//     marginLeft: 12,
//     marginBottom: 4,
//     color: '#666',
//     fontStyle: 'italic',
//   },


//   composerBar: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',              // keeps send aligned when input grows
//     paddingHorizontal: 10,
//     paddingTop: 8,
//     paddingBottom: Platform.OS === 'ios' ? 16 : 8,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//     backgroundColor: '#fff',
//     gap: 8,
//   },
//   iconBtn: {
//     padding: 6,
//   },
//   inputWrapper: {
//     flex: 1,
//     backgroundColor: '#f5f5f7',
//     borderRadius: 22,
//     borderWidth: 1,
//     borderColor: '#eee',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     maxHeight: 160, // visual cap; actual cap enforced by MAX_INPUT_HEIGHT
//   },
//   composerInput: {
//     fontSize: 16,
//     lineHeight: 22,
//     // TextInput will get dynamic height; ensure it can shrink/grow nicely
//     padding: 0,      // we already padded the wrapper
//     color: '#111',
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
// } from 'react-native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import { useRoute, useNavigation } from '@react-navigation/native';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import moment from 'moment';
// import { socket } from '../socket';

// // ✅ Use safe-area-context (works on Android & iOS)
// import {
//   SafeAreaView as SASafeAreaView,
//   useSafeAreaInsets,
// } from 'react-native-safe-area-context';

// const PrivateChatScreen = () => {
//   const { token, userId } = useContext(AuthContext);
//   const navigation = useNavigation();
//   const route = useRoute();
//   const { user } = route.params;

//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [isTyping, setIsTyping] = useState(false);

//   const MIN_INPUT_HEIGHT = 40;
//   const MAX_INPUT_HEIGHT = 140;
//   const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
//   const inputRef = useRef(null);

//   // Safe area insets
//   const insets = useSafeAreaInsets();
//   const composerBottomPad =
//     Platform.OS === 'ios'
//       ? Math.max(12, insets.bottom)         // comfy above home indicator
//       : Math.max(12, insets.bottom + 10);   // push up above Android nav bar

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

//   useEffect(() => {
//     socket.on('connect', () => {
//       console.log('🔌 Socket connected');
//     });
//     socket.on('messagesRead', ({ from }) => {
//       console.log(`✅ Messages from ${from} marked as read`);
//     });
//     return () => {
//       socket.off('connect');
//       socket.off('messagesRead');
//     };
//   }, []);

//   useEffect(() => {
//     fetchMessages();
//   }, []);

//   useEffect(() => {
//     if (userId && user?.id) {
//       socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     }
//   }, []);

//   const fetchMessages = async () => {
//     try {
//       const res = await axios.get(
//         `http://192.168.0.169:4000/messages/${user.id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setMessages(res.data.reverse()); // most recent at bottom (inverted list)
//     } catch (err) {
//       console.error('Failed to fetch messages:', err);
//     }
//   };

//   const handleSend = async () => {
//     if (!input.trim()) return;

//     const newMessage = {
//       senderId: userId,
//       recipientId: user.id,
//       message: input,
//     };

//     try {
//       const res = await axios.post(
//         'http://192.168.0.169:4000/messages',
//         newMessage,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setMessages([res.data, ...messages]); // add new message
//       setInput('');
//       setInputHeight(MIN_INPUT_HEIGHT);
//     } catch (err) {
//       console.error('Failed to send message:', err);
//     }
//   };

//   const renderMessage = ({ item }) => (
//     <View
//       style={[
//         styles.messageBubble,
//         item.senderId !== user.id ? styles.incoming : styles.outgoing,
//       ]}
//     >
//       <Text style={styles.messageText}>{item.message}</Text>
//       <Text style={styles.timestamp}>
//         {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
//       </Text>
//     </View>
//   );

//   return (
//     // Top-level safe area: left/right only, we’ll handle bottom on the composer
//     <SASafeAreaView style={styles.container} edges={['left', 'right']}>
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
//                 : `http://192.168.0.169:4000${user.photos?.[0]}` || 'https://via.placeholder.com/150',
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

//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         keyboardVerticalOffset={90}
//       >
//         <FlatList
//           keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={(item, index) => index.toString()}
//           contentContainerStyle={styles.messages}
//           inverted
//         />

//         {/* Composer wrapped in bottom safe area so it sits above nav bars */}
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
//                 onChangeText={(t) => {
//                   setInput(t);
//                   setIsTyping(t.length > 0);
//                 }}
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
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },

//   topBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#ddd',
//     backgroundColor: '#fff',
//   },
//   backButton: { marginRight: 10 },
//   profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
//   userInfo: { flexDirection: 'column' },
//   topBarName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
//   topBarSchool: { fontSize: 14, color: '#000' },

//   messages: { padding: 10 },

//   messageBubble: {
//     maxWidth: '75%',
//     padding: 10,
//     borderRadius: 15,
//     marginBottom: 10,
//   },
//   incoming: {
//     backgroundColor: '#f8f8f8',
//     alignSelf: 'flex-end',
//     color: '#000',
//   },
//   outgoing: {
//     backgroundColor: '#f8f8f8',
//     alignSelf: 'flex-start',
//   },
//   messageText: { color: '#000', fontSize: 16 },
//   timestamp: { fontSize: 10, color: '#000', marginTop: 5, alignSelf: 'flex-end' },

//   // Modern composer
//   composerBar: {
//     flexDirection: 'row',
//     alignItems: 'flex-end',       // keeps send aligned with bottom of input
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
//     maxHeight: 160,               // visual cap; internal scroll kicks in above this
//   },
//   composerInput: {
//     minHeight: 40,                // = MIN_INPUT_HEIGHT
//     maxHeight: 140,               // = MAX_INPUT_HEIGHT
//     fontSize: 16,
//     lineHeight: 22,
//     padding: 0,                   // wrapper provides padding
//     color: '#111',
//     includeFontPadding: false,    // Android caret/baseline nicety
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

// const HEADER_HEIGHT = 56; // your top bar height (approx)

// const PrivateChatScreen = () => {
//   const { token, userId } = useContext(AuthContext);
//   const navigation = useNavigation();
//   const route = useRoute();
//   const { user } = route.params;

//   const [messages, setMessages] = useState([]);
//   const [input, setInput] = useState('');
//   const [isTyping, setIsTyping] = useState(false);

//   const MIN_INPUT_HEIGHT = 40;
//   const MAX_INPUT_HEIGHT = 140;
//   const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
//   const inputRef = useRef(null);

//   const insets = useSafeAreaInsets();
//   const [kbVisible, setKbVisible] = useState(false);

//   // Bottom padding logic:
//   // - When keyboard is hidden, respect bottom safe area (so we stay above nav bars).
//   // - When keyboard is visible, use a small padding so there's no giant gap on iOS.
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
//     return () => {
//       subShow.remove();
//       subHide.remove();
//     };
//   }, []);

//   useEffect(() => {
//     socket.on('connect', () => console.log('🔌 Socket connected'));
//     socket.on('messagesRead', ({ from }) => console.log(`✅ Messages from ${from} marked as read`));
//     return () => {
//       socket.off('connect');
//       socket.off('messagesRead');
//     };
//   }, []);

//   useEffect(() => { fetchMessages(); }, []);

//   useEffect(() => {
//     if (userId && user?.id) {
//       socket.emit('readMessages', { readerId: userId, senderId: user.id });
//     }
//   }, []);

//   const fetchMessages = async () => {
//     try {
//       const res = await axios.get(`http://192.168.0.169:4000/messages/${user.id}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setMessages(res.data.reverse());
//     } catch (err) {
//       console.error('Failed to fetch messages:', err);
//     }
//   };

//   const handleSend = async () => {
//     if (!input.trim()) return;
//     const newMessage = { senderId: userId, recipientId: user.id, message: input };

//     try {
//       const res = await axios.post('http://192.168.0.169:4000/messages', newMessage, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       setMessages([res.data, ...messages]);
//       setInput('');
//       setInputHeight(MIN_INPUT_HEIGHT);
//     } catch (err) {
//       console.error('Failed to send message:', err);
//     }
//   };

//   const renderMessage = ({ item }) => (
//     <View
//       style={[
//         styles.messageBubble,
//         item.senderId !== user.id ? styles.incoming : styles.outgoing,
//       ]}
//     >
//       <Text style={styles.messageText}>{item.message}</Text>
//       <Text style={styles.timestamp}>
//         {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
//       </Text>
//     </View>
//   );

//   return (
//     // Top/Left/Right safe areas only at root; bottom is managed by composer logic
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
//                 : `http://192.168.0.169:4000${user.photos?.[0]}` || 'https://via.placeholder.com/150',
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

//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + HEADER_HEIGHT : 0}
//       >
//         <FlatList
//           keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
//           data={messages}
//           renderItem={renderMessage}
//           keyExtractor={(item, index) => index.toString()}
//           contentContainerStyle={{ padding: 10, paddingBottom: 8 }}
//           inverted
//         />

//         {/* Composer */}
//         <View style={[styles.composerBar, { paddingBottom: composerBottomPad }]}>
//           <TouchableOpacity
//             activeOpacity={1}
//             style={styles.inputWrapper}
//             onPress={() => inputRef.current?.focus()}
//           >
//             <TextInput
//               ref={inputRef}
//               style={styles.composerInput}
//               value={input}
//               onChangeText={(t) => {
//                 setInput(t);
//                 setIsTyping(t.length > 0);
//               }}
//               placeholder="Type a message…"
//               placeholderTextColor="#999"
//               selectionColor="#581845"
//               underlineColorAndroid="transparent"
//               multiline
//               textAlignVertical="top"
//               onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
//               scrollEnabled={inputHeight > (MAX_INPUT_HEIGHT - 4)}
//               blurOnSubmit={false}
//               returnKeyType="default"
//               autoCorrect
//               autoCapitalize="sentences"
//               keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
//             />
//           </TouchableOpacity>

//           <TouchableOpacity
//             onPress={handleSend}
//             disabled={!input.trim()}
//             style={[styles.sendFab, !input.trim() && { opacity: 0.4 }]}
//           >
//             <Ionicons name="send" size={18} color="#fff" />
//           </TouchableOpacity>
//         </View>
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

//   messages: { padding: 10 },

//   messageBubble: {
//     maxWidth: '75%',
//     padding: 10,
//     borderRadius: 15,
//     marginBottom: 10,
//   },
//   incoming: { backgroundColor: '#f8f8f8', alignSelf: 'flex-end', color: '#000' },
//   outgoing: { backgroundColor: '#f8f8f8', alignSelf: 'flex-start' },
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
//     // marginBottom:-90,
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



import React, { useEffect, useState, useContext, useRef } from 'react';
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
import { socket } from '../socket';

import {
  SafeAreaView as SASafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const HEADER_HEIGHT = 56;
const MIN_INPUT_HEIGHT = 40;
const MAX_INPUT_HEIGHT = 140;

const PrivateChatScreen = () => {
  const { token, userId } = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const inputRef = useRef(null);

  const insets = useSafeAreaInsets();
  const [kbVisible, setKbVisible] = useState(false);

  const composerBottomPad = kbVisible
    ? 8
    : Platform.OS === 'ios'
      ? Math.max(12, insets.bottom)
      : Math.max(12, insets.bottom + 10);

  const formatSchoolFromEmail = (email) => {
    const raw = email?.split('@')[1]?.split('.')[0];
    if (!raw) return 'Unknown School';
    return raw
      .replace(/[-_]/g, ' ')
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };
  const schoolFromEmail = formatSchoolFromEmail(user?.email);

  // keyboard visibility -> only to toggle tiny bottom padding on iOS
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, () => setKbVisible(true));
    const subHide = Keyboard.addListener(hideEvt, () => setKbVisible(false));
    return () => { subShow.remove(); subHide.remove(); };
  }, []);

  useEffect(() => {
    socket.on('connect', () => console.log('🔌 Socket connected'));
    socket.on('messagesRead', ({ from }) => console.log(`✅ Messages from ${from} marked as read`));
    return () => { socket.off('connect'); socket.off('messagesRead'); };
  }, []);

  useEffect(() => { fetchMessages(); }, []);

  useEffect(() => {
    if (userId && user?.id) {
      socket.emit('readMessages', { readerId: userId, senderId: user.id });
    }
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`http://192.168.0.169:4000/messages/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.reverse());
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessage = { senderId: userId, recipientId: user.id, message: input };

    try {
      const res = await axios.post('http://192.168.0.169:4000/messages', newMessage, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([res.data, ...messages]);
      setInput('');
      setInputHeight(MIN_INPUT_HEIGHT);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.senderId !== user.id ? styles.incoming : styles.outgoing,
      ]}
    >
      <Text style={styles.messageText}>{item.message}</Text>
      <Text style={styles.timestamp}>
        {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
      </Text>
    </View>
  );

  return (
    // Root safe area (no bottom here)
    <SASafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user })}>
          <Image
            source={{
              uri: user?.photos?.[0]?.startsWith('http')
                ? user.photos[0]
                : `http://192.168.0.169:4000${user.photos?.[0]}` || 'https://via.placeholder.com/150',
            }}
            style={styles.profileImage}
          />
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user })}>
            <Text style={styles.topBarName}>{user.firstName} {user.lastName}</Text>
          </TouchableOpacity>
          <Text style={styles.topBarSchool}>{schoolFromEmail}</Text>
        </View>
      </View>

      {/* IMPORTANT: iOS offset = 0 to remove the gap */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ padding: 10, paddingBottom: 8 }}
          inverted
        />

        {/* Bottom safe area only for the composer */}
        <SASafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
          <View style={[styles.composerBar, { paddingBottom: composerBottomPad }]}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.inputWrapper}
              onPress={() => inputRef.current?.focus()}
            >
              <TextInput
                ref={inputRef}
                style={styles.composerInput}
                value={input}
                onChangeText={setInput}
                placeholder="Type a message…"
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
              onPress={handleSend}
              disabled={!input.trim()}
              style={[styles.sendFab, !input.trim() && { opacity: 0.4 }]}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </SASafeAreaView>
      </KeyboardAvoidingView>
    </SASafeAreaView>
  );
};

export default PrivateChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  backButton: { marginRight: 10 },
  profileImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  userInfo: { flexDirection: 'column' },
  topBarName: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  topBarSchool: { fontSize: 14, color: '#000' },

  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },
  incoming: { backgroundColor: '#f8f8f8', alignSelf: 'flex-end', color: '#000' },
  outgoing: { backgroundColor: '#f8f8f8', alignSelf: 'flex-start' },
  messageText: { color: '#000', fontSize: 16 },
  timestamp: { fontSize: 10, color: '#000', marginTop: 5, alignSelf: 'flex-end' },

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
});
