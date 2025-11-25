
import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    ImageBackground,
    Modal,
    Animated,
    Easing,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useUnread } from '../context/UnreadContext';
// ── API ────────────────────────────────────────────────────────────
const API_URL = 'https://three4th-street-backend.onrender.com/chatrooms';

// ── Local Images (make sure these files exist in /assets) ─────────
import IMG_VILLAGE from '../assets/2.jpg';
import IMG_INTCH from '../assets/3.jpg';
import IMG_ALU from '../assets/1.jpg';
import IMG_OPP from '../assets/4.jpg';
import IMG_EV from '../assets/5.jpg';
import IMG_FH from '../assets/6.jpg';

const CHATROOM_IMAGES = {
    'The Village Drum': IMG_VILLAGE,
    'Internship Chronicles': IMG_INTCH,
    'Alumni Moves': IMG_ALU,            // (spelling kept as provided)
    'Opportunity Market': IMG_OPP,
    'Events & Vibes': IMG_EV,
    'Founders’ Hut': IMG_FH,
};

// ── House Rules (provided) ────────────────────────────────────────
const HOUSE_RULES = [
    'Respect the Village – Treat every member with respect, regardless of opinion, background, or location.',
    'Keep the Fire Burning – Share value: knowledge, opportunities, and updates that uplift the community.',
    'No Smoke Without Fire – Avoid fake news, rumors, or unverified info. Confirm before you post.',
    'Mind the Drumbeat – Stay on topic for each group. Off-topic gist belongs in the Village Drum.',
    'Build, Don’t Break – No hate speech, discrimination, or negativity that divides us.',
    'No Market in the Chief’s Hut – Keep direct self-promotion or spam out unless it’s relevant and approved.',
    'Protect the Circle – What’s shared here, stays here, unless the owner agrees to share it outside.',
];

const roomDescriptions = {
    "The Village Drum": `Welcome to the heart of the street! This is where gist travels fast, news is fresh, and everyone listens in. Share what matters, join the beat, and keep the village informed.`,

    "Internship Chronicles": `A space to share your internship journeys — the wins, the lessons, the culture shocks — so future interns can walk your path with more wisdom and fewer stumbles.`,

    "Alumni Moves": `This is where the real talk begins — the hustle, the moves, the transitions. This is where we keep it real about what comes after the cap and gown. No sugarcoating, just lessons, laughter, and hustle.`,

    "Opportunity Market": `You’re now in the community’s opportunity well. A trusted space to share job openings, gigs, and opportunities — giving our African family the first shot, and where possible, guiding with referrals and application tips.`,

    "Events & Vibes": `This is the village’s pulse, your space for sharing event details, concerts, conferences, and sports gist that keep the community alive. Keep it timely, keep it relevant, and and don’t let your people miss out on the action.`,

    "Founders’ Hut": `Every big venture starts with a spark. This is your hut of builders, dreamers, and doers, a space to share business ideas, side hustles, and bold launches. Find collaborators, get feedback, and let the village help you grow what you’ve started.`
};

// ── Animated Card Component ───────────────────────────────────────
function ChatRoomCard({ item, index, onOpenRoom, onShowRules, count  = 0 }) {
    const translateY = useRef(new Animated.Value(16)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Staggered fade/slide-in
        const delay = index * 90;
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 360,
                easing: Easing.out(Easing.quad),
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 360,
                easing: Easing.out(Easing.quad),
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index, opacity, translateY]);

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.97,
            useNativeDriver: true,
            friction: 6,
            tension: 120,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 6,
            tension: 120,
        }).start();
    };

    const imageSource = CHATROOM_IMAGES[item.name] || IMG_VILLAGE;

    return (
        <Animated.View style={{ transform: [{ translateY }, { scale }], opacity, flex: 1 }}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onOpenRoom(item)}
                style={styles.cardWrapper}
            >
                <ImageBackground
                    source={imageSource}
                    style={styles.cardImage}
                    imageStyle={{ borderRadius: 14 }}
                    resizeMode="cover"
                >
                    <Pressable
                        style={styles.rulesIcon}
                        onPress={() => onShowRules(item)}
                        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true }}
                    >
                        <Ionicons name="information-circle-outline" size={22} color="#fff" />
                    </Pressable>

                     {/* 🔴 unread badge (top-right) */}
          {count > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8 + 26, // shift left of info icon
                backgroundColor: '#ff3b30',
                minWidth: 18,
                height: 18,
                paddingHorizontal: 5,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {count > 99 ? '99+' : count}
              </Text>
            </View>
          )}

                    <View style={styles.overlay}>
                        <Text style={styles.roomName} numberOfLines={1}>
                            {item.name}
                        </Text>

                       
                        {/* {item.description ? (
                            <Text style={styles.roomDescription} numberOfLines={2}>
                                {item.description}
                            </Text>
                        ) : null} */}
                    </View>
                </ImageBackground>
            </Pressable>
        </Animated.View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ChatRoomsListScreen({ navigation, route }) {
    const [chatrooms, setChatrooms] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [activeRoomName, setActiveRoomName] = useState('');
    const [activeExtraRules, setActiveExtraRules] = useState('');

    const { state, dispatch } = useUnread();
const roomById = state?.roomById || {};

    // Modal content animation
    const modalTranslateY = useRef(new Animated.Value(24)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;
    // const { state, dispatch } = useUnread();


    const animateModalIn = () => {
        modalTranslateY.setValue(24);
        modalOpacity.setValue(0);
        Animated.parallel([
            Animated.timing(modalTranslateY, {
                toValue: 0,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 260,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const animateModalOut = (onDone) => {
        Animated.parallel([
            Animated.timing(modalTranslateY, {
                toValue: 24,
                duration: 200,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 0,
                duration: 200,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => finished && onDone && onDone());
    };

    useEffect(() => {
        const fetchChatrooms = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const res = await axios.get(API_URL, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setChatrooms(res.data || []);
            } catch (err) {
                console.error('Error fetching chat rooms:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchChatrooms();
    }, []);

   const openRoom = (item) => {
  // ✅ optimistic clear of this room’s unread
  dispatch({ type: 'clear-room', roomId: String(item._id) });
  navigation.navigate('ChatRoomScreen', {
    chatroomId: item._id,
    chatroomName: item.name,
  });
};


    // const openRoom = (item) => {
    //        dispatch({ type: 'room-clear', roomId: String(room._id) }); // optimistic clear

    //     navigation.navigate('ChatRoomScreen', { chatroomId: item._id, chatroomName: item.name, });
    // };




    const showRules = (item) => {
        setActiveRoomName(item?.name || 'Chatroom Rules');
        // If your API returns per-room rules, append them under "Additional Rules".
        setActiveExtraRules(
            typeof item?.rules === 'string' && item.rules.trim().length > 0 ? item.rules : ''
        );
        setModalVisible(true);
        // Animate content in
        requestAnimationFrame(animateModalIn);
    };

    const closeRules = () => {
        animateModalOut(() => setModalVisible(false));
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#581845" />
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <FlatList
                data={chatrooms}
                keyExtractor={(item) => item._id || item.name}
                renderItem={({ item, index }) => (
                    <ChatRoomCard
                        item={item}
                        index={index}
                        unread={(roomById[String(item._id)] || 0)}
                        onOpenRoom={openRoom}
                        onShowRules={showRules}
                        // count={(roomById && roomById[String(item._id)]) || 0}   // ✅ stringify key
                        count={(roomById && roomById[String(item._id)]) || 0}
                            //   count={(roomById && roomById[item._id]) || 0}   // 👈 add this

                    />
                )}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                contentContainerStyle={{ paddingBottom: 16 }}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text>No chat rooms found.</Text>
                    </View>
                }
            />

            {/* Rules Modal with Blur + Animated content */}
            <Modal transparent animationType="none" visible={modalVisible} onRequestClose={closeRules}>
                <BlurView intensity={60} tint="dark" style={styles.modalBackground}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            { opacity: modalOpacity, transform: [{ translateY: modalTranslateY }] },
                        ]}
                    >

                        <Text style={styles.modalTitle}>{activeRoomName} </Text>
                        <Text style={styles.roomDescriptions}>
                            {roomDescriptions[activeRoomName] || ''}
                        </Text>
                        <Text style={styles.modalTitle}> House Rules</Text>

                        {/* House Rules List */}
                        <View style={styles.rulesList}>
                            {HOUSE_RULES.map((rule, idx) => (
                                <View key={idx} style={styles.ruleRow}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.ruleText}>{rule}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Optional extra rules from API */}
                        {activeExtraRules ? (
                            <>
                                <Text style={styles.subHeading}>Additional Rules</Text>
                                <Text style={styles.extraRulesText}>{activeExtraRules}</Text>
                            </>
                        ) : null}

                        <Pressable style={styles.closeButton} onPress={closeRules}>
                            <Text style={styles.closeButtonText}>I Understand</Text>
                        </Pressable>
                    </Animated.View>
                </BlurView>
            </Modal>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: {
        flex: 1,
        padding: 8,
        backgroundColor: '#f7f7fb',
    },
    cardWrapper: {
        flex: 1,
        marginBottom: 12,
        marginHorizontal: 4,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#eaeaea',
        elevation: 2, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },
    cardImage: {
        height: 190,
        justifyContent: 'flex-end',
    },
    overlay: {
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    roomName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 20,
    },
    roomDescriptions: {
        fontSize: 14,
        color: '#000',
        marginTop: 3,
        // fontWeight: 'bold',
        marginBottom: 5
    },
    roomDescription: {
        fontSize: 16,
        color: '#fff',
        marginTop: 3,
        fontWeight: 'bold',
        marginBottom: 5
    },

    rulesIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingVertical: 6,
        paddingHorizontal: 7,
        borderRadius: 20,
        zIndex: 2,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Modal
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 14,
        width: '100%',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 14,
        width: '94%',
        maxWidth: 520,
        elevation: 6,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 10,
        color: '#1b1b1f',
    },
    rulesList: {
        marginBottom: 12,
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#581845',
        marginTop: 7,
        marginRight: 8,
    },
    ruleText: {
        flex: 1,
        fontSize: 12,
        color: '#444',
        lineHeight: 20,
    },
    subHeading: {
        fontWeight: '700',
        fontSize: 14,
        marginTop: 6,
        marginBottom: 6,
        color: '#222',
    },
    extraRulesText: {
        fontSize: 13,
        color: '#555',
        lineHeight: 19,
        marginBottom: 14,
    },
    closeButton: {
        backgroundColor: '#581845',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 6,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    roomBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: '#ff3b30',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});


// import React, { useEffect, useState, useRef } from 'react';
// import {
//     View,
//     Text,
//     FlatList,
//     Pressable,
//     StyleSheet,
//     ActivityIndicator,
//     ImageBackground,
//     Modal,
//     Animated,
//     Easing,
// } from 'react-native';
// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Ionicons } from '@expo/vector-icons';
// import { BlurView } from 'expo-blur';

// // ── API ────────────────────────────────────────────────────────────
// const API_URL = 'https://three4th-street-backend.onrender.com/chatrooms';

// // ── Local Images (make sure these files exist in /assets) ─────────
// import IMG_VILLAGE from '../assets/2.jpg';
// import IMG_INTCH from '../assets/3.jpg';
// import IMG_ALU from '../assets/1.jpg';
// import IMG_OPP from '../assets/4.jpg';
// import IMG_EV from '../assets/5.jpg';
// import IMG_FH from '../assets/6.jpg';

// const CHATROOM_IMAGES = {
//     'The Village Drum': IMG_VILLAGE,
//     'Internship Chronicles': IMG_INTCH,
//     'Alumni Moves': IMG_ALU,            // (spelling kept as provided)
//     'Opportunity Market': IMG_OPP,
//     'Events & Vibes': IMG_EV,
//     'Founders’ Hut': IMG_FH,
// };

// // ── House Rules (provided) ────────────────────────────────────────
// const HOUSE_RULES = [
//     'Respect the Village – Treat every member with respect, regardless of opinion, background, or location.',
//     'Keep the Fire Burning – Share value: knowledge, opportunities, and updates that uplift the community.',
//     'No Smoke Without Fire – Avoid fake news, rumors, or unverified info. Confirm before you post.',
//     'Mind the Drumbeat – Stay on topic for each group. Off-topic gist belongs in the Village Drum.',
//     'Build, Don’t Break – No hate speech, discrimination, or negativity that divides us.',
//     'No Market in the Chief’s Hut – Keep direct self-promotion or spam out unless it’s relevant and approved.',
//     'Protect the Circle – What’s shared here, stays here, unless the owner agrees to share it outside.',
// ];

// const roomDescriptions = {
//     "The Village Drum": `Welcome to the heart of the street! This is where gist travels fast, news is fresh, and everyone listens in. Share what matters, join the beat, and keep the village informed.`,

//     "Internship Chronicles": `A space to share your internship journeys — the wins, the lessons, the culture shocks — so future interns can walk your path with more wisdom and fewer stumbles.`,

//     "Alumni Moves": `This is where the real talk begins — the hustle, the moves, the transitions. This is where we keep it real about what comes after the cap and gown. No sugarcoating, just lessons, laughter, and hustle.`,

//     "Opportunity Market": `You’re now in the community’s opportunity well. A trusted space to share job openings, gigs, and opportunities — giving our African family the first shot, and where possible, guiding with referrals and application tips.`,

//     "Events & Vibes": `This is the village’s pulse, your space for sharing event details, concerts, conferences, and sports gist that keep the community alive. Keep it timely, keep it relevant, and and don’t let your people miss out on the action.`,

//     "Founders’ Hut": `Every big venture starts with a spark. This is your hut of builders, dreamers, and doers, a space to share business ideas, side hustles, and bold launches. Find collaborators, get feedback, and let the village help you grow what you’ve started.`
// };

// // ── Animated Card Component ───────────────────────────────────────
// function ChatRoomCard({ item, index, onOpenRoom, onShowRules }) {
//     const translateY = useRef(new Animated.Value(16)).current;
//     const opacity = useRef(new Animated.Value(0)).current;
//     const scale = useRef(new Animated.Value(1)).current;

//     useEffect(() => {
//         // Staggered fade/slide-in
//         const delay = index * 90;
//         Animated.parallel([
//             Animated.timing(translateY, {
//                 toValue: 0,
//                 duration: 360,
//                 easing: Easing.out(Easing.quad),
//                 delay,
//                 useNativeDriver: true,
//             }),
//             Animated.timing(opacity, {
//                 toValue: 1,
//                 duration: 360,
//                 easing: Easing.out(Easing.quad),
//                 delay,
//                 useNativeDriver: true,
//             }),
//         ]).start();
//     }, [index, opacity, translateY]);

//     const handlePressIn = () => {
//         Animated.spring(scale, {
//             toValue: 0.97,
//             useNativeDriver: true,
//             friction: 6,
//             tension: 120,
//         }).start();
//     };

//     const handlePressOut = () => {
//         Animated.spring(scale, {
//             toValue: 1,
//             useNativeDriver: true,
//             friction: 6,
//             tension: 120,
//         }).start();
//     };

//     const imageSource = CHATROOM_IMAGES[item.name] || IMG_VILLAGE;

//     return (
//         <Animated.View style={{ transform: [{ translateY }, { scale }], opacity, flex: 1 }}>
//             <Pressable
//                 onPressIn={handlePressIn}
//                 onPressOut={handlePressOut}
//                 onPress={() => onOpenRoom(item)}
//                 style={styles.cardWrapper}
//             >
//                 <ImageBackground
//                     source={imageSource}
//                     style={styles.cardImage}
//                     imageStyle={{ borderRadius: 14 }}
//                     resizeMode="cover"
//                 >
//                     <Pressable
//                         style={styles.rulesIcon}
//                         onPress={() => onShowRules(item)}
//                         android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true }}
//                     >
//                         <Ionicons name="information-circle-outline" size={22} color="#fff" />
//                     </Pressable>

//                     <View style={styles.overlay}>
//                         <Text style={styles.roomName} numberOfLines={1}>
//                             {item.name}
//                         </Text>
//                         {/* {item.description ? (
//                             <Text style={styles.roomDescription} numberOfLines={2}>
//                                 {item.description}
//                             </Text>
//                         ) : null} */}
//                     </View>
//                 </ImageBackground>
//             </Pressable>
//         </Animated.View>
//     );
// }

// // ── Main Screen ───────────────────────────────────────────────────
// export default function ChatRoomsListScreen({ navigation, route }) {
//     const [chatrooms, setChatrooms] = useState([]);
//     const [loading, setLoading] = useState(true);

//     const [modalVisible, setModalVisible] = useState(false);
//     const [activeRoomName, setActiveRoomName] = useState('');
//     const [activeExtraRules, setActiveExtraRules] = useState('');

//     // Modal content animation
//     const modalTranslateY = useRef(new Animated.Value(24)).current;
//     const modalOpacity = useRef(new Animated.Value(0)).current;
//     // const { state, dispatch } = useUnread();


//     const animateModalIn = () => {
//         modalTranslateY.setValue(24);
//         modalOpacity.setValue(0);
//         Animated.parallel([
//             Animated.timing(modalTranslateY, {
//                 toValue: 0,
//                 duration: 260,
//                 easing: Easing.out(Easing.cubic),
//                 useNativeDriver: true,
//             }),
//             Animated.timing(modalOpacity, {
//                 toValue: 1,
//                 duration: 260,
//                 easing: Easing.out(Easing.cubic),
//                 useNativeDriver: true,
//             }),
//         ]).start();
//     };

//     const animateModalOut = (onDone) => {
//         Animated.parallel([
//             Animated.timing(modalTranslateY, {
//                 toValue: 24,
//                 duration: 200,
//                 easing: Easing.in(Easing.cubic),
//                 useNativeDriver: true,
//             }),
//             Animated.timing(modalOpacity, {
//                 toValue: 0,
//                 duration: 200,
//                 easing: Easing.in(Easing.cubic),
//                 useNativeDriver: true,
//             }),
//         ]).start(({ finished }) => finished && onDone && onDone());
//     };

//     useEffect(() => {
//         const fetchChatrooms = async () => {
//             try {
//                 const token = await AsyncStorage.getItem('token');
//                 const res = await axios.get(API_URL, {
//                     headers: { Authorization: `Bearer ${token}` },
//                 });
//                 setChatrooms(res.data || []);
//             } catch (err) {
//                 console.error('Error fetching chat rooms:', err);
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchChatrooms();
//     }, []);

//     const openRoom = (item) => {
//         navigation.navigate('ChatRoomScreen', { chatroomId: item._id, chatroomName: item.name, });
//     };

//     const showRules = (item) => {
//         setActiveRoomName(item?.name || 'Chatroom Rules');
//         // If your API returns per-room rules, append them under "Additional Rules".
//         setActiveExtraRules(
//             typeof item?.rules === 'string' && item.rules.trim().length > 0 ? item.rules : ''
//         );
//         setModalVisible(true);
//         // Animate content in
//         requestAnimationFrame(animateModalIn);
//     };

//     const closeRules = () => {
//         animateModalOut(() => setModalVisible(false));
//     };

//     if (loading) {
//         return (
//             <View style={styles.center}>
//                 <ActivityIndicator size="large" color="#581845" />
//             </View>
//         );
//     }

//     return (
//         <View style={styles.screen}>
//             <FlatList
//                 data={chatrooms}
//                 keyExtractor={(item) => item._id || item.name}
//                 renderItem={({ item, index }) => (
//                     <ChatRoomCard
//                         item={item}
//                         index={index}
//                         onOpenRoom={openRoom}
//                         onShowRules={showRules}
//                     />
//                 )}
//                 numColumns={2}
//                 columnWrapperStyle={{ justifyContent: 'space-between' }}
//                 contentContainerStyle={{ paddingBottom: 16 }}
//                 ListEmptyComponent={
//                     <View style={styles.center}>
//                         <Text>No chat rooms found.</Text>
//                     </View>
//                 }
//             />

//             {/* Rules Modal with Blur + Animated content */}
//             <Modal transparent animationType="none" visible={modalVisible} onRequestClose={closeRules}>
//                 <BlurView intensity={60} tint="dark" style={styles.modalBackground}>
//                     <Animated.View
//                         style={[
//                             styles.modalContent,
//                             { opacity: modalOpacity, transform: [{ translateY: modalTranslateY }] },
//                         ]}
//                     >

//                         <Text style={styles.modalTitle}>{activeRoomName} </Text>
//                         <Text style={styles.roomDescriptions}>
//                             {roomDescriptions[activeRoomName] || ''}
//                         </Text>
//                         <Text style={styles.modalTitle}> House Rules</Text>

//                         {/* House Rules List */}
//                         <View style={styles.rulesList}>
//                             {HOUSE_RULES.map((rule, idx) => (
//                                 <View key={idx} style={styles.ruleRow}>
//                                     <View style={styles.bullet} />
//                                     <Text style={styles.ruleText}>{rule}</Text>
//                                 </View>
//                             ))}
//                         </View>

//                         {/* Optional extra rules from API */}
//                         {activeExtraRules ? (
//                             <>
//                                 <Text style={styles.subHeading}>Additional Rules</Text>
//                                 <Text style={styles.extraRulesText}>{activeExtraRules}</Text>
//                             </>
//                         ) : null}

//                         <Pressable style={styles.closeButton} onPress={closeRules}>
//                             <Text style={styles.closeButtonText}>I Understand</Text>
//                         </Pressable>
//                     </Animated.View>
//                 </BlurView>
//             </Modal>
//         </View>
//     );
// }

// // ── Styles ────────────────────────────────────────────────────────
// const styles = StyleSheet.create({
//     screen: {
//         flex: 1,
//         padding: 8,
//         backgroundColor: '#f7f7fb',
//     },
//     cardWrapper: {
//         flex: 1,
//         marginBottom: 12,
//         marginHorizontal: 4,
//         borderRadius: 14,
//         overflow: 'hidden',
//         backgroundColor: '#eaeaea',
//         elevation: 2, // Android shadow
//         shadowColor: '#000', // iOS shadow
//         shadowOpacity: 0.12,
//         shadowRadius: 6,
//         shadowOffset: { width: 0, height: 3 },
//     },
//     cardImage: {
//         height: 190,
//         justifyContent: 'flex-end',
//     },
//     overlay: {
//         backgroundColor: 'rgba(0,0,0,0.45)',
//         paddingVertical: 10,
//         paddingHorizontal: 10,
//     },
//     roomName: {
//         fontSize: 16,
//         fontWeight: '700',
//         color: '#fff',
//         lineHeight: 20,
//     },
//     roomDescriptions: {
//         fontSize: 14,
//         color: '#000',
//         marginTop: 3,
//         // fontWeight: 'bold',
//         marginBottom: 5
//     },
//     roomDescription: {
//         fontSize: 16,
//         color: '#fff',
//         marginTop: 3,
//         fontWeight: 'bold',
//         marginBottom: 5
//     },

//     rulesIcon: {
//         position: 'absolute',
//         top: 8,
//         right: 8,
//         backgroundColor: 'rgba(0,0,0,0.45)',
//         paddingVertical: 6,
//         paddingHorizontal: 7,
//         borderRadius: 20,
//         zIndex: 2,
//     },
//     center: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },

//     // Modal
//     modalBackground: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         padding: 14,
//         width: '100%',
//     },
//     modalContent: {
//         backgroundColor: '#fff',
//         padding: 18,
//         borderRadius: 14,
//         width: '94%',
//         maxWidth: 520,
//         elevation: 6,
//     },
//     modalTitle: {
//         fontSize: 18,
//         fontWeight: '800',
//         marginBottom: 10,
//         color: '#1b1b1f',
//     },
//     rulesList: {
//         marginBottom: 12,
//     },
//     ruleRow: {
//         flexDirection: 'row',
//         alignItems: 'flex-start',
//         marginBottom: 8,
//     },
//     bullet: {
//         width: 6,
//         height: 6,
//         borderRadius: 3,
//         backgroundColor: '#581845',
//         marginTop: 7,
//         marginRight: 8,
//     },
//     ruleText: {
//         flex: 1,
//         fontSize: 12,
//         color: '#444',
//         lineHeight: 20,
//     },
//     subHeading: {
//         fontWeight: '700',
//         fontSize: 14,
//         marginTop: 6,
//         marginBottom: 6,
//         color: '#222',
//     },
//     extraRulesText: {
//         fontSize: 13,
//         color: '#555',
//         lineHeight: 19,
//         marginBottom: 14,
//     },
//     closeButton: {
//         backgroundColor: '#581845',
//         paddingVertical: 12,
//         borderRadius: 10,
//         alignItems: 'center',
//         marginTop: 6,
//     },
//     closeButtonText: {
//         color: '#fff',
//         fontWeight: '700',
//         letterSpacing: 0.3,
//     },
// });

