
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    RefreshControl,
    Dimensions,
    ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useUnread } from '../context/UnreadContext';
import { LinearGradient } from 'expo-linear-gradient';
import OnboardingOverlay from '../components/OnboardingOverlay';

// ── API ────────────────────────────────────────────────────────────
const API_URL = 'http://192.168.100.4:4000/chatrooms';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
// Room icons for visual variety
const ROOM_ICONS = {
    'The Village Drum': 'megaphone',
    'Internship Chronicles': 'briefcase',
    'Alumni Moves': 'school',
    'Opportunity Market': 'trending-up',
    'Events & Vibes': 'calendar',
    "Founders' Hut": 'bulb',
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

// Short descriptions for cards
const SHORT_DESCRIPTIONS = {
    "The Village Drum": "Community gist & news",
    "Internship Chronicles": "Share your intern journey",
    "Alumni Moves": "Life after graduation",
    "Opportunity Market": "Jobs & opportunities",
    "Events & Vibes": "Events & happenings",
    "Founders' Hut": "Business & startups",
};

// ── Modern Animated Card Component ───────────────────────────────────────
function ChatRoomCard({ item, index, onOpenRoom, onShowRules, count = 0, isFullWidth = false }) {
    const translateY = useRef(new Animated.Value(20)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const delay = index * 80;
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.back(1.2)),
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 350,
                easing: Easing.out(Easing.quad),
                delay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [index, opacity, translateY]);

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.96,
            useNativeDriver: true,
            friction: 5,
            tension: 100,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            friction: 5,
            tension: 100,
        }).start();
    };

    const imageSource = CHATROOM_IMAGES[item.name] || IMG_VILLAGE;
    const roomIcon = ROOM_ICONS[item.name] || 'chatbubbles';
    const shortDesc = SHORT_DESCRIPTIONS[item.name] || item.description?.slice(0, 40) || '';
    const memberCount = item.members?.length || 0;

    return (
        <Animated.View style={[
            { transform: [{ translateY }, { scale }], opacity },
            isFullWidth ? styles.fullWidthCard : styles.halfWidthCard
        ]}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onOpenRoom(item)}
                style={[styles.cardWrapper, isFullWidth && styles.cardWrapperFull]}
            >
                <ImageBackground
                    source={imageSource}
                    style={[styles.cardImage, isFullWidth && styles.cardImageFull]}
                    imageStyle={{ borderRadius: 16 }}
                    resizeMode="cover"
                >
                    {/* Gradient overlay for better text readability */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
                        style={styles.gradientOverlay}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    >
                        {/* Info button */}
                        <Pressable
                            style={styles.infoButton}
                            onPress={(e) => {
                                e.stopPropagation();
                                onShowRules(item);
                            }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="information-circle-outline" size={22} color="#fff" />
                        </Pressable>

                        {/* Unread badge */}
                        {count > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>
                                    {count > 99 ? '99+' : count}
                                </Text>
                            </View>
                        )}

                        {/* Card content */}
                        <View style={styles.cardContent}>
                            {/* Room icon */}
                            <View style={styles.iconContainer}>
                                <Ionicons name={roomIcon} size={18} color="#fff" />
                            </View>
                            
                            {/* Room name */}
                            <Text style={styles.roomName} numberOfLines={2}>
                                {item.name}
                            </Text>
                            
                            {/* Short description */}
                            <Text style={styles.roomShortDesc} numberOfLines={1}>
                                {shortDesc}
                            </Text>

                            {/* Footer with member count */}
                            {memberCount > 0 && (
                                <View style={styles.cardFooter}>
                                    <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.memberCount}>
                                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </ImageBackground>
            </Pressable>
        </Animated.View>
    );
}

// ── Featured Room Card (Full Width) ───────────────────────────────
function FeaturedRoomCard({ item, onOpenRoom, onShowRules, count = 0 }) {
    const scale = useRef(new Animated.Value(1)).current;
    const imageSource = CHATROOM_IMAGES[item.name] || IMG_VILLAGE;
    const roomIcon = ROOM_ICONS[item.name] || 'chatbubbles';

    const handlePressIn = () => {
        Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, friction: 5 }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    };

    return (
        <Animated.View style={[styles.featuredCard, { transform: [{ scale }] }]}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => onOpenRoom(item)}
            >
                <ImageBackground
                    source={imageSource}
                    style={styles.featuredImage}
                    imageStyle={{ borderRadius: 20 }}
                    resizeMode="cover"
                >
                    <LinearGradient
                        colors={['rgba(88,24,69,0.3)', 'rgba(88,24,69,0.8)', 'rgba(88,24,69,0.95)']}
                        style={styles.featuredGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    >
                        {/* Featured badge */}
                        <View style={styles.featuredBadge}>
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={styles.featuredBadgeText}>FEATURED</Text>
                        </View>

                        {/* Info button */}
                        <Pressable
                            style={styles.featuredInfoBtn}
                            onPress={(e) => {
                                e.stopPropagation();
                                onShowRules(item);
                            }}
                        >
                            <Ionicons name="information-circle-outline" size={24} color="#fff" />
                        </Pressable>

                        {/* Unread badge */}
                        {count > 0 && (
                            <View style={styles.featuredUnreadBadge}>
                                <Text style={styles.unreadBadgeText}>
                                    {count > 99 ? '99+' : count}
                                </Text>
                            </View>
                        )}

                        {/* Content */}
                        <View style={styles.featuredContent}>
                            <View style={styles.featuredIconContainer}>
                                <Ionicons name={roomIcon} size={24} color="#fff" />
                            </View>
                            <Text style={styles.featuredRoomName}>{item.name}</Text>
                            <Text style={styles.featuredDesc} numberOfLines={2}>
                                {roomDescriptions[item.name]?.slice(0, 100)}...
                            </Text>
                            <View style={styles.featuredCTA}>
                                <Text style={styles.featuredCTAText}>Join the conversation</Text>
                                <Ionicons name="arrow-forward" size={16} color="#fff" />
                            </View>
                        </View>
                    </LinearGradient>
                </ImageBackground>
            </Pressable>
        </Animated.View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ChatRoomsListScreen({ navigation, route }) {
    const [chatrooms, setChatrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [activeRoomName, setActiveRoomName] = useState('');
    const [activeExtraRules, setActiveExtraRules] = useState('');

    const { state, dispatch } = useUnread();
    const roomById = state?.roomById || {};

    // Modal content animation
    const modalTranslateY = useRef(new Animated.Value(24)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;


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

    const fetchChatrooms = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            const token = await AsyncStorage.getItem('token');
            const res = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setChatrooms(res.data || []);
        } catch (err) {
            console.error('Error fetching chat rooms:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchChatrooms();
    }, [fetchChatrooms]);

    const onRefresh = useCallback(() => {
        fetchChatrooms(true);
    }, [fetchChatrooms]);

   const openRoom = (item) => {
  // ✅ optimistic clear of this room's unread
  dispatch({ type: 'clear-room', roomId: String(item._id) });
  navigation.navigate('ChatRoomScreen', {
    chatroomId: item._id,
    chatroomName: item.name,
  });
};

    const showRules = (item) => {
        setActiveRoomName(item?.name || 'Chatroom Rules');
        setActiveExtraRules(
            typeof item?.rules === 'string' && item.rules.trim().length > 0 ? item.rules : ''
        );
        setModalVisible(true);
        requestAnimationFrame(animateModalIn);
    };

    const closeRules = () => {
        animateModalOut(() => setModalVisible(false));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <LinearGradient
                    colors={['#581845', '#900C3F', '#C70039']}
                    style={styles.loadingGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Loading Rooms...</Text>
                </LinearGradient>
            </View>
        );
    }

    // Get featured room (first one or "The Village Drum")
    const featuredRoom = chatrooms.find(r => r.name === 'The Village Drum') || chatrooms[0];
    const otherRooms = chatrooms.filter(r => r._id !== featuredRoom?._id);
    const totalUnread = Object.values(roomById || {}).reduce((sum, val) => sum + val, 0);

    return (
        <OnboardingOverlay screenName="ChatRoomsList">
        <View style={styles.screen}>
            {/* Gradient Header Background */}}
            <LinearGradient
                colors={['#581845', '#3d1130', '#2a0b22']}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>Community</Text>
                            <Text style={styles.headerTitleBold}>Rooms</Text>
                        </View>
                        {totalUnread > 0 && (
                            <View style={styles.totalUnreadBadge}>
                                <Ionicons name="notifications" size={14} color="#fff" />
                                <Text style={styles.totalUnreadText}>{totalUnread}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.headerSubtitle}>
                        Connect, share, and grow with the community
                    </Text>
                    
                    {/* Quick Stats */}
                    <View style={styles.quickStats}>
                        <View style={styles.statItem}>
                            <Ionicons name="chatbubbles" size={18} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.statNumber}>{chatrooms.length}</Text>
                            <Text style={styles.statLabel}>Rooms</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="people" size={18} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.statNumber}>
                                {chatrooms.reduce((sum, r) => sum + (r.members?.length || 0), 0)}
                            </Text>
                            <Text style={styles.statLabel}>Members</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Ionicons name="pulse" size={18} color="#4ade80" />
                            <Text style={[styles.statNumber, { color: '#4ade80' }]}>Live</Text>
                            <Text style={styles.statLabel}>Status</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#581845']}
                        tintColor="#581845"
                    />
                }
                style={styles.scrollView}
            >
                {/* Featured Room Card */}
                {featuredRoom && (
                    <View style={styles.featuredSection}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionHeaderLeft}>
                                <Ionicons name="flame" size={18} color="#f97316" />
                                <Text style={styles.sectionTitleFeatured}>Featured</Text>
                            </View>
                            <View style={styles.liveDot} />
                        </View>
                        <FeaturedRoomCard
                            item={featuredRoom}
                            onOpenRoom={openRoom}
                            onShowRules={showRules}
                            count={(roomById && roomById[String(featuredRoom._id)]) || 0}
                        />
                    </View>
                )}

                {/* Section Title */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Explore Rooms</Text>
                    <View style={styles.roomCountBadge}>
                        <Text style={styles.roomCountText}>{otherRooms.length}</Text>
                    </View>
                </View>

                {/* Room Grid */}
                <View style={styles.gridContainer}>
                    {otherRooms.map((item, index) => (
                        <ChatRoomCard
                            key={item._id || item.name}
                            item={item}
                            index={index}
                            onOpenRoom={openRoom}
                            onShowRules={showRules}
                            count={(roomById && roomById[String(item._id)]) || 0}
                        />
                    ))}
                </View>

                {chatrooms.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="chatbubbles-outline" size={56} color="#581845" />
                        </View>
                        <Text style={styles.emptyTitle}>No Rooms Yet</Text>
                        <Text style={styles.emptyText}>Check back soon for community rooms</Text>
                    </View>
                )}
                
                {/* Bottom Spacer */}
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Rules Modal with Blur + Animated content */}
            <Modal transparent animationType="none" visible={modalVisible} onRequestClose={closeRules}>
                <BlurView intensity={80} tint="dark" style={styles.modalBackground}>
                    <Animated.View
                        style={[
                            styles.modalContent,
                            { opacity: modalOpacity, transform: [{ translateY: modalTranslateY }] },
                        ]}
                    >
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <LinearGradient
                                colors={['#581845', '#900C3F']}
                                style={styles.modalIconContainer}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name={ROOM_ICONS[activeRoomName] || 'chatbubbles'} size={24} color="#fff" />
                            </LinearGradient>
                            <Pressable style={styles.modalCloseIcon} onPress={closeRules}>
                                <Ionicons name="close" size={24} color="#666" />
                            </Pressable>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                            <Text style={styles.modalTitle}>{activeRoomName}</Text>
                            <Text style={styles.roomDescriptions}>
                                {roomDescriptions[activeRoomName] || ''}
                            </Text>
                            
                            <View style={styles.rulesDivider} />
                            
                            <View style={styles.rulesHeader}>
                                <Ionicons name="shield-checkmark" size={18} color="#581845" />
                                <Text style={styles.rulesHeaderText}>House Rules</Text>
                            </View>

                            {/* House Rules List */}
                            <View style={styles.rulesList}>
                                {HOUSE_RULES.map((rule, idx) => (
                                    <View key={idx} style={styles.ruleRow}>
                                        <View style={styles.ruleNumber}>
                                            <Text style={styles.ruleNumberText}>{idx + 1}</Text>
                                        </View>
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
                        </ScrollView>

                        <Pressable style={styles.closeButton} onPress={closeRules}>
                            <LinearGradient
                                colors={['#581845', '#900C3F']}
                                style={styles.closeButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.closeButtonText}>I Understand</Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </BlurView>
            </Modal>
        </View>
        </OnboardingOverlay>
    );
}

// ── Styles ────────────────────────────────────────────────────────
const CARD_WIDTH = (SCREEN_WIDTH - 32) / 2;

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#f8f9fb',
    },
    scrollView: {
        flex: 1,
        marginTop: -20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: '#f8f9fb',
    },
    scrollContent: {
        paddingTop: 8,
        paddingBottom: 24,
    },
    
    // Loading
    loadingContainer: {
        flex: 1,
    },
    loadingGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    
    // Header Gradient
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    headerContent: {
        
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    headerTitleBold: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        marginTop: -2,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
    },
    totalUnreadBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    totalUnreadText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    
    // Quick Stats
    quickStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(0,0,0,0.15)',
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 16,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        marginTop: 4,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 11,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    
    // Featured Section
    featuredSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sectionTitleFeatured: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22c55e',
    },
    
    // Section header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    roomCountBadge: {
        backgroundColor: '#581845',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roomCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    
    // Grid container
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    
    // Regular Card
    halfWidthCard: {
        width: CARD_WIDTH,
    },
    fullWidthCard: {
        width: '100%',
        paddingHorizontal: 4,
    },
    cardWrapper: {
        marginBottom: 12,
        marginHorizontal: 4,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 5,
        shadowColor: '#581845',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
    },
    cardWrapperFull: {
        marginHorizontal: 0,
    },
    cardImage: {
        height: 180,
        justifyContent: 'flex-end',
    },
    cardImageFull: {
        height: 160,
    },
    gradientOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 14,
        borderRadius: 18,
    },
    infoButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    unreadBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#ef4444',
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
        borderWidth: 2,
        borderColor: '#fff',
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    cardContent: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    roomName: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
        lineHeight: 21,
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    roomShortDesc: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    memberCount: {
        fontSize: 11,
        color: '#fff',
        marginLeft: 4,
        fontWeight: '600',
    },
    
    // Featured Card
    featuredCard: {
        borderRadius: 22,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#581845',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
    },
    featuredImage: {
        height: 220,
        justifyContent: 'flex-end',
    },
    featuredGradient: {
        flex: 1,
        padding: 18,
        justifyContent: 'flex-end',
        borderRadius: 22,
    },
    featuredBadge: {
        position: 'absolute',
        top: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    featuredBadgeText: {
        color: '#581845',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    featuredInfoBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    featuredUnreadBadge: {
        position: 'absolute',
        top: 16,
        right: 66,
        backgroundColor: '#ef4444',
        minWidth: 26,
        height: 26,
        borderRadius: 13,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    featuredContent: {
        marginTop: 'auto',
    },
    featuredIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    featuredRoomName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    featuredDesc: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 20,
        marginBottom: 14,
    },
    featuredCTA: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        alignSelf: 'flex-start',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 6,
    },
    featuredCTAText: {
        color: '#581845',
        fontSize: 14,
        fontWeight: '700',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(88,24,69,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9ca3af',
    },

    // Loading / Center
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
        padding: 16,
        width: '100%',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 24,
        width: '94%',
        maxWidth: 520,
        maxHeight: '85%',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 10,
        color: '#1a1a2e',
    },
    roomDescriptions: {
        fontSize: 15,
        color: '#4b5563',
        lineHeight: 24,
        marginBottom: 16,
    },
    rulesDivider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },
    rulesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    rulesHeaderText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    rulesList: {
        marginBottom: 12,
    },
    ruleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    ruleNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#581845',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    ruleNumberText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    ruleText: {
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 22,
    },
    subHeading: {
        fontWeight: '700',
        fontSize: 15,
        marginTop: 10,
        marginBottom: 8,
        color: '#1a1a2e',
    },
    extraRulesText: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 22,
        marginBottom: 14,
    },
    closeButton: {
        overflow: 'hidden',
        borderRadius: 14,
        marginTop: 12,
    },
    closeButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.3,
    },
});