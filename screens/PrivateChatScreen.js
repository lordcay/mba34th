




import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import moment from 'moment';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'react-native';
import { socket } from '../socket'; // adjust path based on your folder structure



const PrivateChatScreen = () => {
  const { token, userId } = useContext(AuthContext);
  const navigation = useNavigation();


  const route = useRoute();
  const { user } = route.params;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);


  const schoolFromEmail = user.email.split('@')[1]?.split('.')[0] || 'Unknown School';

  useEffect(() => {
    socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    socket.on('messagesRead', ({ from }) => {
      console.log(`✅ Messages from ${from} marked as read`);
    });

    return () => {
      socket.off('connect');
      socket.off('messagesRead');
    };
  }, []);


  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (userId && user?.id) {
      socket.emit('readMessages', {
        readerId: userId,
        senderId: user.id
      });
    }
  }, []);


  const fetchMessages = async () => {
    try {
      const res = await axios.get(`https://three4th-street-backend.onrender.com/messages/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data.reverse()); // show most recent at bottom
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessage = {
      senderId: userId,
      recipientId: user.id,
      message: input
    };

    try {
      const res = await axios.post('https://three4th-street-backend.onrender.com/messages', newMessage, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([res.data, ...messages]); // add new message
      setInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };



  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.senderId !== user.id ? styles.incoming : styles.outgoing
    ]}>
      <Text style={styles.messageText}>{item.message}</Text>
      <Text style={styles.timestamp}>
        {moment(item.timestamp).format('h:mm A')} {item.read ? '✓✓' : '✓'}
      </Text>


    </View>
  );




  return (
    <SafeAreaView style={styles.container}>
      {/* 🔝 Top bar */}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>



        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user })}>
          <Image
            source={{
              uri:
                user?.photos?.[0]?.startsWith('http')
                  ? user.photos[0]
                  : `https://three4th-street-backend.onrender.com${user.photos?.[0]}` || 'https://via.placeholder.com/150',
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




      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.messages}
          inverted
        />

        {/* 💬 Input */}
        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={text => {
              setInput(text);
              setIsTyping(text.length > 0);
            }}
            placeholder="Type a message..."
            style={styles.input}
          />
          {isTyping && (
            <Text style={styles.typingIndicator}>
              You’re typing...
            </Text>
          )}

          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PrivateChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 10,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfo: {
    flexDirection: 'column',
  },


  topBarName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  topBarSchool: {
    fontSize: 14,
    color: '#000'
  },
  messages: {
    padding: 10,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },



  incoming: {
    backgroundColor: '#f8f8f8',
    alignSelf: 'flex-end',
    color: '#000',
  },
  outgoing: {
    backgroundColor: '#f8f8f8',
    alignSelf: 'flex-start',
  },


  messageText: {
    color: '#000',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    color: '#000',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  sendButton: {
    backgroundColor: '#581845',
    borderRadius: 25,
    padding: 10,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
