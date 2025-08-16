import React, { useEffect, useState, useContext, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import axios from 'axios';

const socket = io('https://three4th-street-backend.onrender.com'); // ✅ Replace with your IP

const ChatRoomDetailScreen = ({ route }) => {
    const { chatroomId } = route.params;
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const flatListRef = useRef();

    // Join chatroom on mount
    useEffect(() => {
        socket.emit('joinRoom', chatroomId);

        // Listen for messages
        socket.on('newChatroomMessage', (msg) => {
            if (msg.chatroomId === chatroomId) {
                setMessages((prev) => [...prev, msg]);
                flatListRef.current?.scrollToEnd({ animated: true });
            }
        });

        return () => {
            socket.off('newChatroomMessage');
        };
    }, []);

    // Fetch previous messages
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`https://three4th-street-backend.onrender.com/api/chatroom-messages/${chatroomId}/messages`);
                setMessages(res.data);
            } catch (err) {
                console.error('❌ Failed to fetch messages', err);
            }
        };
        fetchMessages();
    }, []);

    const handleSend = async () => {
        if (!message.trim()) return;

        const msgObj = {
            chatroomId: chatroomId,
            senderId: user.id,
            message: message.trim(),
        };

        // Send via socket
        socket.emit('sendChatroomMessage', msgObj);
        setMessage('');
    };

    const renderItem = ({ item }) => {
        const isMyMessage =
            item.senderId === user.id || item.senderId?._id === user.id;

        return (
            <View
                style={[
                    styles.messageContainer,
                    isMyMessage ? styles.myMessage : styles.otherMessage,
                ]}
            >
                <Text style={styles.sender}>
                    {item.senderId?.firstName || 'You'}
                </Text>
                <Text>{item.message}</Text>
            </View>
        );
    };


    // const renderItem = ({ item }) => (
    //     <View
    //         style={[
    //             styles.messageContainer,
    //             item.senderId._id === user.id ? styles.myMessage : styles.otherMessage,
    //         ]}
    //     >
    //         <Text style={styles.sender}>{item.senderId.firstName}</Text>
    //         <Text>{item.message}</Text>
    //     </View>
    // );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <FlatList
                data={messages}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                ref={flatListRef}
                contentContainerStyle={{ paddingBottom: 60 }}
            />
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={message}
                    onChangeText={setMessage}
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default ChatRoomDetailScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    messageContainer: {
        padding: 10,
        marginVertical: 5,
        marginHorizontal: 10,
        borderRadius: 8,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#dcf8c6',
        alignSelf: 'flex-end',
    },
    otherMessage: {
        backgroundColor: '#eee',
        alignSelf: 'flex-start',
    },
    sender: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 0,
        padding: 10,
        backgroundColor: '#fff',
        width: '100%',
        borderTopWidth: 1,
        borderColor: '#ddd',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
    },
    sendButton: {
        backgroundColor: '#581845',
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
});
