

// import React, { useEffect, useState, useContext, useCallback } from 'react';
// import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
// import axios from 'axios';
// import moment from 'moment';
// import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
// import { AuthContext } from '../context/AuthContext';
// import { Ionicons, Feather } from '@expo/vector-icons';
// import { TextInput } from 'react-native';



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



//   const filterChats = () => {
//     let chats = conversations.filter(chat =>
//       `${chat.firstName} ${chat.lastName}`.toLowerCase().includes(search.toLowerCase())
//     );

//     if (activeTab === 'Unread') {
//       chats = chats.filter(chat => !chat.lastMessage?.read);
//     } else if (activeTab === 'Recent') {
//       chats = chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
//     }

//     setFilteredChats(chats);
//   };

//   const renderItem = ({ item }) => {
//     const school = item.email?.split('@')[1]?.split('.')[0] || 'Unknown';

//     const user = {
//       id: item.userId || item._id,
//       firstName: item.firstName,
//       lastName: item.lastName,
//       email: item.email,
//       // photos: ['/uploads/test.jpg'], // ⛳️ Hardcoded to prove display logic works

//       photos: item.photos || [],
//     };

//     const profileUri =
//       user?.photos?.[0]?.startsWith('http')
//         ? user.photos[0]
//         : user.photos?.[0]
//           ? `http://192.168.0.169:4000/${user.photos[0].replace(/^\/?/, '')}`
//           : 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

//     return (
//       <TouchableOpacity
//         style={styles.chatCard}
//         onPress={() => navigation.navigate('PrivateChat', { user })}
//       >



//         <Image source={{ uri: profileUri }} style={styles.avatar} />
//         <View style={styles.chatContent}>
//           <View style={styles.chatTop}>
//             <Text style={styles.chatName}>{user.firstName} {user.lastName}</Text>
//             <Text style={styles.chatTime}>{moment(item.timestamp).fromNow()}</Text>
//           </View>
//           <Text style={styles.chatMessage} numberOfLines={1}>
//             {item.lastMessage?.text || 'No messages yet'}
//           </Text>
//           <Text style={styles.chatSchool}>{school}</Text>
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   // const renderItem = ({ item }) => {
//   //   const school = item.email?.split('@')[1]?.split('.')[0] || 'Unknown';

//   //   const user = {
//   //     id: item.userId || item._id,
//   //     firstName: item.firstName,
//   //     lastName: item.lastName,
//   //     email: item.email,
//   //     photos: item.photos || [], // 👈 Add this line

//   //   };

//   //   const profileUri =
//   //     user?.photos?.[0]?.startsWith('http')
//   //       ? user.photos[0]
//   //       : user.photos?.[0]
//   //         ? `http://192.168.0.169:4000${user.photos[0]}`
//   //         : 'https://unsplash.com/photos/brown-and-black-desk-globe-vYGR3b_naPA';


//   //   return (
//   //     <TouchableOpacity
//   //       style={styles.card}
//   //       onPress={() => navigation.navigate('PrivateChat', { user })}
//   //     >
//   //       <Image source={{ uri: profileUri }} style={styles.avatar} />

//   //       <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
//   //       <Text style={styles.message}>{item.lastMessage}</Text>
//   //       <View style={styles.footer}>
//   //         <Text style={styles.school}>{school}</Text>
//   //         <Text style={styles.timestamp}>{moment(item.timestamp).fromNow()}</Text>
//   //       </View>
//   //     </TouchableOpacity>
//   //   );
//   // };

//   return (
//     <View style={styles.container}>
//       {/* ✅ Header */}


//       {/* Top Bar */}
//       <View style={styles.topBar}>
//         <View>
//           <Text style={styles.title}>Messages</Text>
//           <Text style={styles.subtitle}>Connect with verified members</Text>
//         </View>
//         <TouchableOpacity>
//           <Ionicons name="person-circle" size={36} color="#581845" />
//         </TouchableOpacity>
//       </View>

//       {/* Search Bar */}
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

//       <FlatList
//         data={conversations}
//         keyExtractor={item => item._id}
//         renderItem={renderItem}
//         contentContainerStyle={{ padding: 10 }}
//       />
//     </View>
//   );
// };

// export default ChatScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     paddingHorizontal: 15,
//   },
//   topBar: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 20,
//     marginTop: 50,
//   },
//   title: {
//     marginLeft: 10,
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#581845',
//   },
//   subtitle: {
//     marginLeft: 10,
//     fontSize: 14,
//     color: '#888',
//     marginTop: 2,
//   },
//   searchContainer: {
//     marginLeft: 10,
//     marginRight: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f1f1f1',
//     paddingHorizontal: 10,
//     borderRadius: 10,
//     marginBottom: 10,
//   },
//   searchInput: {
//     flex: 1,
//     height: 40,
//     fontSize: 16,
//   },

//   tabsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 10,
//   },
//   tabButton: {
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     borderRadius: 20,
//     backgroundColor: '#eee',
//   },
//   activeTab: {
//     backgroundColor: '#581845',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#444',
//   },
//   activeTabText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: '#581845',
//     padding: 15,
//     paddingTop: 50,
//   },
//   logoContainer: {
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   logo: {
//     width: 30,
//     height: 30,
//     resizeMode: 'contain',
//   },
//   headerText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   card: {
//     backgroundColor: '#f8f8f8',
//     padding: 10,
//     borderRadius: 10,
//     marginBottom: 10,
//     elevation: 2,
//   },
//   name: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#000',
//   },
//   message: {
//     fontSize: 14,
//     color: '#444',
//     marginTop: 5,
//   },
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 8,
//   },
//   school: {
//     fontSize: 12,
//     color: '#999',
//   },
//   timestamp: {
//     fontSize: 12,
//     color: '#999',
//   },
//   chatCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     padding: 12,
//     marginBottom: 10,
//     borderRadius: 12,
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   avatar: {
//     width: 50,
//     height: 50,
//     borderRadius: 25,
//     marginRight: 12,
//     backgroundColor: '#ccc',
//   },
//   chatContent: {
//     flex: 1,
//     justifyContent: 'center',
//   },

//   chatTop: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   chatName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#333',
//   },
//   chatTime: {
//     fontSize: 12,
//     color: '#999',
//   },

//   chatMessage: {
//     fontSize: 14,
//     color: '#555',
//     marginTop: 4,
//   },

//   chatSchool: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 2,
//   },

// });


import React, { useEffect, useState, useContext } from 'react';
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
import { socket } from '../socket'; // already added


const ChatScreen = () => {
  const [conversations, setConversations] = useState([]);
  const { token } = useContext(AuthContext);
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const fetchConversations = async () => {
    try {
      const res = await axios.get('http://192.168.0.169:4000/messages/conversations/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(res.data);
    } catch (err) {
      console.error('❌ Failed to fetch conversations:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    socket.on('messagesRead', ({ from }) => {
      console.log(`✅ Messages from ${from} marked as read in real-time`);
      // Optionally update state to show ✓✓
    });

    return () => {
      socket.off('messagesRead');
    };
  }, []);


  const getPhotoUri = (photo) => {
    if (!photo) return 'https://images.unsplash.com/photo-1626695436755-3e288720849c?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
    return photo.startsWith('http') ? photo : `http://192.168.0.169:4000${photo}`;
  };

  const renderItem = ({ item }) => {
    const school = item.email?.split('@')[1]?.split('.')[0] || 'Unknown';

    const user = {
      id: item.userId || item._id,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      photos: item.photos || [], // very important!
    };

    const profileUri = getPhotoUri(user.photos?.[0]);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PrivateChat', { user })}
      >
        <Image source={{ uri: profileUri }} style={styles.avatar} />
        <View style={styles.chatDetails}>
          <View style={styles.row}>
            <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
            <Text style={styles.timestamp}>{moment(item.timestamp).fromNow()}</Text>
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

      {/* Search Bar */}
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
        data={conversations}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#581845',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    paddingHorizontal: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
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
  activeTab: {
    backgroundColor: '#581845',
  },
  tabText: {
    fontSize: 14,
    color: '#444',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
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
  chatDetails: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  school: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#aaa',
  },
  unreadBadge: {
    backgroundColor: '#ff4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 4
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },

});









// import React, { useEffect, useState, useContext } from 'react';
// import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
// import axios from 'axios';
// import moment from 'moment';
// import { useNavigation } from '@react-navigation/native';
// import { AuthContext } from '../context/AuthContext';
// import { Ionicons, Feather } from '@expo/vector-icons';
// import { TextInput } from 'react-native';


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



//   const filterChats = () => {
//     let chats = conversations.filter(chat =>
//       `${chat.firstName} ${chat.lastName}`.toLowerCase().includes(search.toLowerCase())
//     );

//     if (activeTab === 'Unread') {
//       chats = chats.filter(chat => !chat.lastMessage?.read);
//     } else if (activeTab === 'Recent') {
//       chats = chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
//     }

//     setFilteredChats(chats);
//   };

//   const renderItem = ({ item }) => {
//     const school = item.email?.split('@')[1]?.split('.')[0] || 'Unknown';

//     const user = {
//       id: item.userId || item._id,
//       firstName: item.firstName,
//       lastName: item.lastName,
//       email: item.email,
//       photos: item.photos || [], // 👈 Add this line

//     };

//     const profileUri =
//       user?.photos?.[0]?.startsWith('http')
//         ? user.photos[0]
//         : user.photos?.[0]
//           ? `http://192.168.0.169:4000${user.photos[0]}`
//           : 'https://unsplash.com/photos/brown-and-black-desk-globe-vYGR3b_naPA';


//     return (
//       <TouchableOpacity
//         style={styles.card}
//         onPress={() => navigation.navigate('PrivateChat', { user })}
//       >
//         <Image source={{ uri: profileUri }} style={styles.avatar} />

//         <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
//         <Text style={styles.message}>{item.lastMessage}</Text>
//         <View style={styles.footer}>
//           <Text style={styles.school}>{school}</Text>
//           <Text style={styles.timestamp}>{moment(item.timestamp).fromNow()}</Text>
//         </View>
//       </TouchableOpacity>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       {/* ✅ Header */}


//       {/* Top Bar */}
//       <View style={styles.topBar}>
//         <View>
//           <Text style={styles.title}>Messages</Text>
//           <Text style={styles.subtitle}>Connect with verified members</Text>
//         </View>
//         <TouchableOpacity>
//           <Ionicons name="person-circle" size={36} color="#581845" />
//         </TouchableOpacity>
//       </View>

//       {/* Search Bar */}
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

//       <FlatList
//         data={conversations}
//         keyExtractor={item => item._id}
//         renderItem={renderItem}
//         contentContainerStyle={{ padding: 10 }}
//       />
//     </View>
//   );
// };

// export default ChatScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//     paddingHorizontal: 15,
//   },
//   topBar: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 20,
//     marginTop: 50,
//   },
//   title: {
//     marginLeft: 10,
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#581845',
//   },
//   subtitle: {
//     marginLeft: 10,
//     fontSize: 14,
//     color: '#888',
//     marginTop: 2,
//   },
//   searchContainer: {
//     marginLeft: 10,
//     marginRight: 10,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f1f1f1',
//     paddingHorizontal: 10,
//     borderRadius: 10,
//     marginBottom: 10,
//   },
//   searchInput: {
//     flex: 1,
//     height: 40,
//     fontSize: 16,
//   },

//   tabsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     marginBottom: 10,
//   },
//   tabButton: {
//     paddingVertical: 6,
//     paddingHorizontal: 12,
//     borderRadius: 20,
//     backgroundColor: '#eee',
//   },
//   activeTab: {
//     backgroundColor: '#581845',
//   },
//   tabText: {
//     fontSize: 14,
//     color: '#444',
//   },
//   activeTabText: {
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     backgroundColor: '#581845',
//     padding: 15,
//     paddingTop: 50,
//   },
//   logoContainer: {
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   logo: {
//     width: 30,
//     height: 30,
//     resizeMode: 'contain',
//   },
//   headerText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   card: {
//     backgroundColor: '#f8f8f8',
//     padding: 10,
//     borderRadius: 10,
//     marginBottom: 10,
//     elevation: 2,
//   },
//   name: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#000',
//   },
//   message: {
//     fontSize: 14,
//     color: '#444',
//     marginTop: 5,
//   },
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 8,
//   },
//   school: {
//     fontSize: 12,
//     color: '#999',
//   },
//   timestamp: {
//     fontSize: 12,
//     color: '#999',
//   },
// });







