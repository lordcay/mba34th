



import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  StatusBar,
  FlatList,
  TextInput,
  Pressable,
  Modal as RNModal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';
import api from '../services/api';
import { sendConnectionRequest, cancelConnectionRequest, removeConnection, getConnectionStatus } from '../services/connection.service';
import { refreshAndUpdateLocation, shouldRefreshLocation, formatDistance } from '../services/location.service';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { socket } from '../socket';
import { playPing, showTopToast } from '../utils/notify';
import DrawerContent from '../components/DrawerContent';
import OnboardingOverlay from '../components/OnboardingOverlay';
import RecoveryEmailModal from '../components/RecoveryEmailModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_MARGIN_H = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.45;

const FallbackImage = require('../assets/fff.jpg');
import { API_BASE_URL } from '../config';

const HomeScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const { state: unreadState } = useUnread();
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Recovery email reminder
  const [showRecoveryReminder, setShowRecoveryReminder] = useState(false);

  // Get unread DM count for badge
  const dmUnreadCount = Object.values(unreadState?.dmByUserId || {}).reduce((a, b) => a + b, 0);

  // Map of userId -> connection status for real-time updates from socket
  const [connectionStatusUpdates, setConnectionStatusUpdates] = useState({});
  
  // 🔴 Map of userId -> presence status for real-time online/offline updates
  const [presenceUpdates, setPresenceUpdates] = useState({});

  // Scroll to top button
  const flatListRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopOpacity = useRef(new Animated.Value(0)).current;

  // 🔴 Real-time socket listener for connection status updates
  useEffect(() => {
    const handleConnectionAccepted = (data) => {
      console.log('✅ Connection accepted:', data);
      // Play notification sound
      playPing();
      // Show toast notification
      showTopToast('Connection Accepted! 🎉', `${data.targetName || 'Someone'} accepted your request`);
      
      // 🔴 Update connection status for the user who accepted
      if (data.targetUserId) {
        setConnectionStatusUpdates(prev => ({
          ...prev,
          [data.targetUserId]: 'connected'
        }));
      }
    };

    // 🔴 Handle connection removed - update UI on BOTH sides in real-time
    const handleConnectionRemoved = (data) => {
      console.log('🔌 Connection removed:', data);
      // Update connection status to 'none' for the disconnected user
      if (data.userId) {
        setConnectionStatusUpdates(prev => ({
          ...prev,
          [data.userId]: 'none'
        }));
      }
    };

    // 🔴 Handle real-time presence updates (online/away/offline)
    const handlePresenceUpdate = ({ userId, status, lastSeen }) => {
      console.log('👤 Presence update:', userId, status);
      setPresenceUpdates(prev => ({
        ...prev,
        [userId]: { status, lastSeen }
      }));
    };

    socket.on('connection:accepted', handleConnectionAccepted);
    socket.on('connection:removed', handleConnectionRemoved);
    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      socket.off('connection:accepted', handleConnectionAccepted);
      socket.off('connection:removed', handleConnectionRemoved);
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, []);

  // User profile image
  const userProfileImage = user?.photos?.[0] 
    ? (user.photos[0].startsWith('http') 
        ? user.photos[0] 
        : `${API_BASE_URL}${user.photos[0]}`)
    : null;


  // ----------------------------
  // Filters state
  // ----------------------------
  const [showFilters, setShowFilters] = useState(false);

 const [filters, setFilters] = useState({
  name: '',        // ✅ NEW: search by name
  sex: null,
  country: null,
  school: null,
  industry: null,
  program: null,
});


  // Search text inside modal lists
  const [search, setSearch] = useState({
    country: '',
    school: '',
    industry: '',
    program: '',
  });

  const resetFilters = () => {
setFilters({ name: '', sex: null, country: null, school: null, industry: null, program: null });
    setSearch({ country: '', school: '', industry: '', program: '' });
  };

const activeFilterCount = Object.values(filters).filter((v) => {
  if (typeof v === 'string') return v.trim().length > 0;
  return Boolean(v);
}).length;

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const NEW_WINDOW_DAYS = 14;

  const hasProfilePhoto = (u) => {
  if (!u) return false;

  const photos = Array.isArray(u.photos) ? u.photos : [];
  const first = photos[0];

  return Boolean(first && String(first).trim().length > 0);
};


  const fetchVerifiedUsers = async ({ silent = false } = {}) => {
  if (silent) setRefreshing(true);
  else setLoading(true);

  try {
    const response = await api.get('/accounts/verified');

    const myId = String(user?._id || user?.id || '');
    const filtered = (Array.isArray(response.data) ? response.data : [])
  .filter((u) => String(u._id || u.id) !== myId)
  .filter(hasProfilePhoto); // ✅ remove users without profile photo

    // 📍 Debug: Log location data from API
    console.log('📍 Users with location data:', 
      filtered.map(u => ({
        name: u.firstName,
        currentCity: u.currentCity,
        distance: u.distance,
        locationSharingEnabled: u.locationSharingEnabled,
        hasCoords: !!(u.location?.coordinates?.length)
      }))
    );

    // const filtered = (Array.isArray(response.data) ? response.data : [])
    //   .filter((u) => String(u._id || u.id) !== myId);

    const now = Date.now();
    const hasCreatedAt = filtered.some((u) => u?.createdAt);

    if (!hasCreatedAt) {
      setVerifiedUsers(shuffle(filtered));
      setError('');
      return;
    }

    const isNew = (u) => {
      const t = new Date(u.createdAt).getTime();
      if (!Number.isFinite(t)) return false;
      return now - t <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    };

    const newUsers = [];
    const oldUsers = [];
    for (const u of filtered) (isNew(u) ? newUsers : oldUsers).push(u);

    const randomized = [...shuffle(newUsers), ...shuffle(oldUsers)];
    setVerifiedUsers(randomized);
    setError('');
  } catch (err) {
    setError('Failed to fetch users');
  } finally {
    if (silent) setRefreshing(false);
    else setLoading(false);
  }
};


  // const fetchVerifiedUsers = async () => {
  //   setLoading(true);
  //   try {
  //     const response = await api.get('/accounts/verified');

  //     const myId = String(user?._id || user?.id || '');
  //     const filtered = (Array.isArray(response.data) ? response.data : [])
  //       .filter((u) => String(u._id || u.id) !== myId);

  //     const now = Date.now();
  //     const hasCreatedAt = filtered.some((u) => u?.createdAt);

  //     if (!hasCreatedAt) {
  //       setVerifiedUsers(shuffle(filtered));
  //       setError('');
  //       return;
  //     }

  //     const isNew = (u) => {
  //       const t = new Date(u.createdAt).getTime();
  //       if (!Number.isFinite(t)) return false;
  //       return now - t <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  //     };

  //     const newUsers = [];
  //     const oldUsers = [];
  //     for (const u of filtered) (isNew(u) ? newUsers : oldUsers).push(u);

  //     const randomized = [...shuffle(newUsers), ...shuffle(oldUsers)];
  //     setVerifiedUsers(randomized);
  //     setError('');
  //   } catch (err) {
  //     setError('Failed to fetch users');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // useFocusEffect(useCallback(() => { fetchVerifiedUsers(); }, []));

  useEffect(() => {
    fetchVerifiedUsers();
    
    // 📍 Update location on app open (Tinder-style auto location update)
    const updateLocation = async () => {
      try {
        const needsRefresh = await shouldRefreshLocation();
        console.log('📍 Location needs refresh:', needsRefresh, 'Platform:', Platform.OS);
        
        if (needsRefresh) {
          const result = await refreshAndUpdateLocation();
          console.log('📍 Location update result:', result ? 'Success' : 'Failed');
          
          // Re-fetch users after location update so distances are calculated
          if (result) {
            fetchVerifiedUsers({ silent: true });
          }
        }
      } catch (err) {
        console.log('📍 Location update skipped:', err?.message);
      }
    };
    
    // Slight delay for Android to ensure permissions dialog doesn't interfere
    const timeoutId = setTimeout(updateLocation, Platform.OS === 'android' ? 1500 : 500);
    return () => clearTimeout(timeoutId);
  }, []);

  // Recovery email 7-day reminder for students
  useEffect(() => {
    if (!user) return;
    // Skip if alumni or already verified
    if (user.recoveryEmailVerified) return;
    // Check type - alumni don't need this (they already use personal email)
    const userType = (user.type || '').toLowerCase();
    if (userType === 'alumni' || userType === 'professional') return;

    const checkReminder = async () => {
      // Check local dismiss timestamp first (faster than relying on server)
      const localDismissed = await AsyncStorage.getItem('recovery_email_dismissed_at');
      const serverDismissed = user.recoveryEmailDismissedAt;
      const lastDismissed = localDismissed || serverDismissed;

      if (lastDismissed) {
        const daysSince = (Date.now() - new Date(lastDismissed).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return; // Not yet 7 days
      }

      // Show the reminder after a short delay so it doesn't feel jarring
      setTimeout(() => setShowRecoveryReminder(true), 2000);
    };

    checkReminder();
  }, [user?.recoveryEmailVerified, user?.recoveryEmailDismissedAt]);


  // ----------------------------
  // Helpers for filtering
  // ----------------------------
  const normalize = (v = '') => String(v).trim().toLowerCase();

  const getSchoolName = (email) => {
    if (!email || !email.includes('@')) return '';
    const domain = email.split('@')[1] || '';
    const base = domain.split('.')[0] || ''; // duke, harvard, etc.
    if (!base) return '';
    return base
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const normalizeIndustry = (industry = '') => {
    // your industry options sometimes include emoji prefix; backend likely stores plain text
    // We'll strip leading non-letters/numbers + spaces.
    return String(industry).replace(/^[^\w]+?\s*/, '').trim();
  };

  // Options derived from dataset (so the filter lists always match actual users)
  const filterOptions = useMemo(() => {
    const sexes = new Set();
    const countries = new Set();
    const schools = new Set();
    const industries = new Set();
    const programs = new Set();

    for (const u of verifiedUsers) {
      if (u?.gender) sexes.add(String(u.gender));
      if (u?.origin) countries.add(String(u.origin));
      const sch = getSchoolName(u?.email);
if (sch) schools.add(String(sch).toUpperCase());
      if (u?.industry) industries.add(normalizeIndustry(u.industry));
      if (u?.type) programs.add(String(u.type));
    }

    const sortAlpha = (a, b) => a.localeCompare(b);

    return {
      sexes: Array.from(sexes).sort(sortAlpha),
      countries: Array.from(countries).sort(sortAlpha),
      schools: Array.from(schools).sort(sortAlpha),
      industries: Array.from(industries).sort(sortAlpha),
      programs: Array.from(programs).sort(sortAlpha),
    };
  }, [verifiedUsers]);

  // Apply filters locally
  const filteredUsers = useMemo(() => {
    if (!verifiedUsers?.length) return [];

   return verifiedUsers.filter((u) => {
  const fullName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();

  const gender = u?.gender || '';
  const origin = u?.origin || '';
  const school = getSchoolName(u?.email);
  const industry = normalizeIndustry(u?.industry || '');
  const program = u?.type || '';

  if (filters.name && !normalize(fullName).includes(normalize(filters.name))) return false; // ✅ NEW
  if (filters.sex && normalize(gender) !== normalize(filters.sex)) return false;
  if (filters.country && normalize(origin) !== normalize(filters.country)) return false;
  if (filters.school && normalize(school) !== normalize(filters.school)) return false;
  if (filters.industry && normalize(industry) !== normalize(filters.industry)) return false;
  if (filters.program && normalize(program) !== normalize(filters.program)) return false;

  return true;
});

  }, [verifiedUsers, filters]);

  // Quick remove a single filter chip
  const clearOne = (key) => setFilters((prev) => ({ ...prev, [key]: null }));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#581845" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={60} color="#dc3545" style={{ marginBottom: 16 }} />
        <Text style={styles.error}>{error}</Text>
        <Text style={{ color: '#666', fontSize: 14, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
          This may be due to an expired session. Try refreshing or log out and log back in.
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 24, gap: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#581845',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}
            onPress={() => fetchVerifiedUsers()}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              backgroundColor: '#f8f9fa',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#dee2e6',
            }}
            onPress={async () => {
              await logout();
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }}
          >
            <Text style={{ color: '#581845', fontWeight: '600' }}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const androidTopPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <OnboardingOverlay screenName="Home">
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* LinkedIn-style Top Bar */}
      <View style={styles.topBar}>
        {/* Profile Avatar - Left (Opens Drawer) */}
        <TouchableOpacity 
          style={styles.profileAvatarBtn}
          onPress={() => setIsDrawerOpen(true)}
          activeOpacity={0.8}
        >
          <Image
            source={userProfileImage ? { uri: userProfileImage } : FallbackImage}
            style={styles.profileAvatar}
          />
          <View style={styles.onlineIndicator} />
        </TouchableOpacity>

        {/* Center - Tappable Search Bar */}
        <TouchableOpacity 
          style={styles.searchBarBtn}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.9}
        >
          <Ionicons name="search-outline" size={18} color="#999" />
          <Text style={styles.searchBarPlaceholder}>Search members...</Text>
        </TouchableOpacity>

        {/* Chat Icon - Right */}
        <TouchableOpacity 
          style={styles.chatIconBtn}
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={26} color="#581845" />
          {dmUnreadCount > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={verifiedUsers}
        keyExtractor={(item) => String(item._id || item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 20 }]}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          if (offsetY > 400 && !showScrollTop) {
            setShowScrollTop(true);
            Animated.timing(scrollTopOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
          } else if (offsetY <= 400 && showScrollTop) {
            Animated.timing(scrollTopOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => setShowScrollTop(false));
          }
        }}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <UserCard 
            u={item} 
            navigation={navigation} 
            socketStatusUpdate={connectionStatusUpdates[item._id || item.id]}
            presenceUpdate={presenceUpdates[item._id || item.id]}
          />
        )}

        refreshing={refreshing}
        onRefresh={() => fetchVerifiedUsers({ silent: true })}
  
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No members yet</Text>
            <Text style={styles.emptyText}>Check back later for new members.</Text>
          </View>
        }
      />

      {/* Scroll to Top Floating Button */}
      {showScrollTop && (
        <Animated.View style={[styles.scrollTopBtn, { opacity: scrollTopOpacity }]}>
          <TouchableOpacity
            onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
            activeOpacity={0.8}
            style={styles.scrollTopInner}
          >
            <Ionicons name="chevron-up" size={24} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* LinkedIn-style Drawer */}
      <Modal
        isVisible={isDrawerOpen}
        onBackdropPress={() => setIsDrawerOpen(false)}
        onSwipeComplete={() => setIsDrawerOpen(false)}
        swipeDirection={['left']}
        swipeThreshold={50}
        animationIn="slideInLeft"
        animationOut="slideOutLeft"
        animationInTiming={280}
        animationOutTiming={220}
        backdropTransitionInTiming={280}
        backdropTransitionOutTiming={180}
        backdropOpacity={0.7}
        style={styles.drawerModal}
        propagateSwipe={true}
        useNativeDriverForBackdrop={true}
        hideModalContentWhileAnimating={true}
        coverScreen={true}
        statusBarTranslucent={true}
        deviceHeight={Dimensions.get('screen').height}
      >
        <DrawerContent 
          onClose={() => setIsDrawerOpen(false)} 
          navigation={navigation}
        />
      </Modal>

      <RecoveryEmailModal
        visible={showRecoveryReminder}
        onClose={() => setShowRecoveryReminder(false)}
        isReminder
      />
    </SafeAreaView>
    </OnboardingOverlay>
  );
};

const Chip = ({ label, onRemove }) => (
  <View style={styles.chip}>
    <Text numberOfLines={1} style={styles.chipText}>{label}</Text>
    <Pressable onPress={onRemove} hitSlop={10} style={styles.chipX}>
      <Ionicons name="close" size={14} color="#581845" />
    </Pressable>
  </View>
);

const FilterSheet = ({
  visible,
  onClose,
  filters,
  setFilters,
  search,
  setSearch,
  options,
  resetFilters,
}) => {
  const setOne = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const filterList = (list, q) => {
    const qq = (q || '').trim().toLowerCase();
    if (!qq) return list;
    return list.filter((x) => String(x).toLowerCase().includes(qq));
  };

  const countries = filterList(options.countries, search.country);
  const schools = filterList(options.schools, search.school);
  const industries = filterList(options.industries, search.industry);
  const programs = filterList(options.programs, search.program);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.sheetModal}
      backdropOpacity={0.35}
      useNativeDriver
      useNativeDriverForBackdrop
      avoidKeyboard
    >
      <View style={styles.sheet}>
        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#111" />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={[{ key: 'content' }]}
          keyExtractor={(i) => i.key}
          renderItem={() => (
            <View style={{ paddingBottom: 10 }}>
          {/* Name */}
<Text style={styles.sheetSectionTitle}>Name</Text>
<View style={styles.searchRow}>
  <Ionicons name="search-outline" size={18} color="#777" />
  <TextInput
    value={filters.name}
    onChangeText={(t) => setOne('name', t)}
    placeholder="Search by name..."
    placeholderTextColor="#999"
    style={styles.searchInput}
    autoCorrect={false}
    returnKeyType="search"
  />
  {!!filters.name?.trim() && (
    <Pressable onPress={() => setOne('name', '')} hitSlop={10}>
      <Ionicons name="close-circle" size={18} color="#999" />
    </Pressable>
  )}
</View>

              {/* Sex */}
              <Text style={styles.sheetSectionTitle}>Sex</Text>
              <View style={styles.pillsRow}>
                {options.sexes.length ? options.sexes : ['Male', 'Female'].map(() => null)}
               {(options.sexes?.length ? options.sexes : ['Male', 'Female']).map((s) => {
  const active = filters.sex === s;
  return (
    <TouchableOpacity
      key={s}
      onPress={() => setOne('sex', active ? null : s)}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{s}</Text>
    </TouchableOpacity>
  );
})}

              </View>
              

              {/* Country */}
              <SectionList
                title="Country"
                value={filters.country}
                searchValue={search.country}
                onSearch={(t) => setSearch((p) => ({ ...p, country: t }))}
                data={countries}
                onSelect={(v) => setOne('country', filters.country === v ? null : v)}
              />

              {/* School */}
              <SectionList
                title="School"
                value={filters.school}
                searchValue={search.school}
                onSearch={(t) => setSearch((p) => ({ ...p, school: t }))}
                data={schools}
                onSelect={(v) => setOne('school', filters.school === v ? null : v)}
              />

              {/* Industry */}
              <SectionList
                title="Industry"
                value={filters.industry}
                searchValue={search.industry}
                onSearch={(t) => setSearch((p) => ({ ...p, industry: t }))}
                data={industries}
                onSelect={(v) => setOne('industry', filters.industry === v ? null : v)}
              />

              {/* Program */}
              <SectionList
                title="Program"
                value={filters.program}
                searchValue={search.program}
                onSearch={(t) => setSearch((p) => ({ ...p, program: t }))}
                data={programs}
                onSelect={(v) => setOne('program', filters.program === v ? null : v)}
              />

              {/* Footer buttons */}
              <View style={styles.sheetFooter}>
                <TouchableOpacity onPress={resetFilters} style={styles.footerBtnGhost}>
                  <Text style={styles.footerBtnGhostText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.footerBtnPrimary}>
                  <Text style={styles.footerBtnPrimaryText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
};

const SectionList = ({ title, value, searchValue, onSearch, data, onSelect }) => {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.sheetSectionTitle}>{title}</Text>

      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color="#777" />
        <TextInput
          value={searchValue}
          onChangeText={onSearch}
          placeholder={`Search ${title.toLowerCase()}...`}
          placeholderTextColor="#999"
          style={styles.searchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!searchValue && (
          <Pressable onPress={() => onSearch('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </Pressable>
        )}
      </View>

      <View style={styles.optionWrap}>
        {data.slice(0, 20).map((v) => {
          const active = value === v;
          return (
            <TouchableOpacity
              key={v}
              style={[styles.optionRow, active && styles.optionRowActive]}
              onPress={() => onSelect(v)}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{v}</Text>
              {active && <Ionicons name="checkmark" size={18} color="#581845" />}
            </TouchableOpacity>
          );
        })}

        {!data.length && (
          <Text style={styles.emptySmall}>No matches</Text>
        )}

        {data.length > 20 && (
          <Text style={styles.hintText}>Showing first 20. Refine your search.</Text>
        )}
      </View>
    </View>
  );
};

const UserCard = ({ u, navigation, socketStatusUpdate, presenceUpdate }) => {
  const { user: currentUser } = useContext(AuthContext);
  const photos = u.photos && u.photos.length > 0 ? u.photos : [null];
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // Connection state: 'none' | 'pending' | 'connected'
  const [connectionStatus, setConnectionStatus] = useState('none');
  const [loadingStatus, setLoadingStatus] = useState(true);
  
  // 🔴 Disconnect confirmation modal state
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // 📷 Fullscreen photo viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Fetch real connection status from backend on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const targetUserId = u._id || u.id;
        const status = await getConnectionStatus(targetUserId);
        // 'received' means they sent us a request, show as 'none' so we can accept from requests screen
        setConnectionStatus(status === 'received' ? 'none' : status);
      } catch (error) {
        console.error('Failed to fetch connection status:', error);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchStatus();
  }, [u._id, u.id]);

  // 🔴 Listen for real-time socket status updates
  useEffect(() => {
    if (socketStatusUpdate) {
      console.log('🔄 Real-time status update for', u._id || u.id, ':', socketStatusUpdate);
      setConnectionStatus(socketStatusUpdate);
    }
  }, [socketStatusUpdate, u._id, u.id]);

  // 🔴 Get user online status display (real data only, no simulation)
  const getOnlineStatus = () => {
    // Use real-time socket update if available, otherwise use API data
    const status = presenceUpdate?.status || u.onlineStatus || u.status;
    const lastSeen = presenceUpdate?.lastSeen || u.lastSeen;
    
    // 🔴 Use actual status from backend/socket - NO random simulation
    if (status === 'online') {
      return { status: 'online', dotColor: '#22c55e', bgColor: 'rgba(0, 0, 0, 0.7)', label: 'Online' };
    } else if (status === 'away' || status === 'inactive') {
      return { status: 'away', dotColor: '#f59e0b', bgColor: 'rgba(0, 0, 0, 0.7)', label: 'Away' };
    }
    
    // Default to offline if no status or explicitly offline
    return { status: 'offline', dotColor: '#9ca3af', bgColor: 'rgba(0, 0, 0, 0.7)', label: 'Offline' };
  };

  const onlineStatus = getOnlineStatus();

  // Get connection button display based on status
  const getConnectionDisplay = () => {
    switch (connectionStatus) {
      case 'pending':
        return { 
          icon: 'hourglass-outline', 
          label: 'Pending', 
          color: '#9a6b8c',
          activeColor: '#9a6b8c'
        };
      case 'connected':
        return { 
          icon: 'checkmark-done', 
          label: 'Connected', 
          color: '#581845',
          activeColor: '#581845'
        };
      default: // 'none'
        return { 
          icon: 'person-add-outline', 
          label: 'Connect', 
          color: '#6B4C5A',
          activeColor: '#6B4C5A'
        };
    }
  };

  const connectionDisplay = getConnectionDisplay();

  const handleConnect = async () => {
    const targetUserId = u._id || u.id;
    const previousStatus = connectionStatus;
    
    try {
      if (connectionStatus === 'none') {
        // Send connection request
        setConnectionStatus('pending');
        await sendConnectionRequest(targetUserId);
        // Target user will receive push notification
      } else if (connectionStatus === 'pending') {
        // Cancel pending request
        setConnectionStatus('none');
        await cancelConnectionRequest(targetUserId);
      } else if (connectionStatus === 'connected') {
        // 🔴 Show disconnect confirmation modal instead of immediate disconnect
        setShowDisconnectModal(true);
        return; // Don't proceed, wait for modal confirmation
      }
    } catch (error) {
      // Revert on error
      setConnectionStatus(previousStatus);
      console.error('Connection action failed:', error);
    }
  };

  // 🔴 Handle confirmed disconnect
  const handleConfirmDisconnect = async () => {
    const targetUserId = u._id || u.id;
    setDisconnecting(true);
    
    try {
      await removeConnection(targetUserId);
      setConnectionStatus('none');
      setShowDisconnectModal(false);
    } catch (error) {
      console.error('Disconnect failed:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleProfile = () => {
    // Navigate to user profile
    navigation.navigate('UserProfile', { user: u });
  };

  const handleSend = () => {
    // Navigate to private chat
    navigation.navigate('PrivateChat', { user: u });
  };

  const resolvePhotoUri = (photo) =>
    photo ? (photo.startsWith('http') ? photo : `${API_BASE_URL}${photo}`) : null;

  const renderSlide = ({ item: photo, index }) => {
    const uri = resolvePhotoUri(photo);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          setViewerIndex(index);
          setViewerVisible(true);
        }}
      >
        <Image
          source={uri ? { uri } : FallbackImage}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const schoolName =
    u.email
      ?.split('@')[1]
      ?.split('.')[0]
      ?.replace(/-/g, ' ')
      ?.replace(/\b\w/g, (c) => c.toUpperCase()) || '';

  return (
    <View style={styles.cardContainer}>
      {/* Photo Section with overlay elements */}
      <View style={styles.photoSection}>
        <Animated.FlatList
          data={photos}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          snapToInterval={CARD_WIDTH}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: CARD_WIDTH,
            offset: CARD_WIDTH * index,
            index,
          })}
        />

        {/* 📍 Location Badge - Top Right of Photo (Compact Design) */}
        {(u.currentCity || (u.distance !== null && u.distance !== undefined)) && u.locationSharingEnabled !== false ? (
          <View style={styles.locationBadgePhoto}>
            <Ionicons name="location" size={10} color="#fff" />
            <Text style={styles.locationBadgeText} numberOfLines={1}>
              {u.distance !== null && u.distance !== undefined 
                ? (u.distanceDisplay || formatDistance(u.distance))
                : u.currentCity}
            </Text>
          </View>
        ) : null}

        {/* Online Status Badge - Top Left of Photo */}
        <View style={[styles.onlineStatusBadge, { backgroundColor: onlineStatus.bgColor }]}>
          <View style={[styles.onlineStatusDot, { backgroundColor: onlineStatus.dotColor }]} />
          <Text style={styles.onlineStatusText}>
            {onlineStatus.label}
          </Text>
        </View>

        {photos.length > 1 && (
          <View style={styles.dotsContainer}>
            {photos.map((_, i) => {
              const inputRange = [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH];
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.8, 1.2, 0.8],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { opacity, transform: [{ scale }] }]}
                />
              );
            })}
          </View>
        )}
      </View>

      {/* LinkedIn-style Action Bar - Below Photo */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.actionBtn} 
          onPress={handleConnect} 
          activeOpacity={0.7}
          disabled={loadingStatus}
        >
          {loadingStatus ? (
            <ActivityIndicator size={16} color="#666" />
          ) : (
            <Ionicons 
              name={connectionDisplay.icon} 
              size={20} 
              color={connectionDisplay.color} 
            />
          )}
          <Text style={[
            styles.actionLabel, 
            connectionStatus !== 'none' && { color: connectionDisplay.activeColor }
          ]}>
            {loadingStatus ? '...' : connectionDisplay.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleProfile} activeOpacity={0.7}>
          <Ionicons name="person-outline" size={20} color="#6B4C5A" />
          <Text style={styles.actionLabel}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleSend} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#6B4C5A" />
          <Text style={styles.actionLabel}>Message</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        {/* Name with extra info */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {u.firstName} {u.lastName}
          </Text>
          <Text style={styles.extraInfo}>({u.gender}, {u.origin})</Text>
        </View>

        <Text style={styles.schName}>
          {schoolName.toUpperCase()} ({u.type} '{String(u.graduationYear).slice(-2)}) • {u.industry}
        </Text>

        {!!u.bio && (
          <>
            <Text style={styles.sectionTitle}>About me</Text>
            <Text style={styles.sectionText}>{u.bio}</Text>
          </>
        )}

        {!!u.fieldOfStudy && (
          <>
            <Text style={styles.sectionTitle}>Current / Previous Role</Text>
            <Text style={styles.sectionText}>{u.currentRole}</Text>
          </>
        )}

        {u.interests && u.interests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Interests</Text>
            <Text style={styles.interestList}>{u.interests.join(' • ')}</Text>
          </>
        )}

        {/* Location info now shown on photo badge - removed from here for cleaner design */}
      </View>

      {/* � Fullscreen Photo Viewer */}
      <RNModal
        visible={viewerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={viewerStyles.overlay}>
          <StatusBar barStyle="light-content" />

          {/* Top bar */}
          <View style={[viewerStyles.topBar, { paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 10 }]}>
            <TouchableOpacity onPress={() => setViewerVisible(false)} style={viewerStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={viewerStyles.counter}>
              {photos.length > 1 ? `${viewerIndex + 1} / ${photos.length}` : ''}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Swipeable photos */}
          <FlatList
            data={photos}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewerIndex(idx);
            }}
            renderItem={({ item: photo }) => {
              const uri = resolvePhotoUri(photo);
              return (
                <View style={viewerStyles.slide}>
                  <Image
                    source={uri ? { uri } : FallbackImage}
                    style={viewerStyles.fullImage}
                    resizeMode="contain"
                  />
                </View>
              );
            }}
          />

          {/* Bottom dots */}
          {photos.length > 1 && (
            <View style={viewerStyles.dotsRow}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    viewerStyles.dot,
                    i === viewerIndex && viewerStyles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </RNModal>

      {/* �🔴 Disconnect Confirmation Modal */}
      <Modal
        isVisible={showDisconnectModal}
        onBackdropPress={() => !disconnecting && setShowDisconnectModal(false)}
        onBackButtonPress={() => !disconnecting && setShowDisconnectModal(false)}
        backdropOpacity={0.5}
        animationIn="fadeIn"
        animationOut="fadeOut"
        useNativeDriver
        style={{ margin: 0, justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={styles.disconnectModal}>
          {/* User Avatar */}
          <View style={styles.disconnectAvatarContainer}>
            <Image
              source={
                u.photos?.[0]
                  ? { uri: u.photos[0].startsWith('http') ? u.photos[0] : `${API_BASE_URL}${u.photos[0]}` }
                  : FallbackImage
              }
              style={styles.disconnectAvatar}
            />
            <View style={styles.disconnectIconOverlay}>
              <Ionicons name="link-outline" size={16} color="#fff" />
            </View>
          </View>

          {/* Modal Content */}
          <Text style={styles.disconnectTitle}>Disconnect from {u.firstName}?</Text>
          <Text style={styles.disconnectMessage}>
            You will no longer be connected with {u.firstName} {u.lastName}. To reconnect, you'll need to send a new request.
          </Text>

          {/* Action Buttons */}
          <View style={styles.disconnectActions}>
            <TouchableOpacity
              style={styles.disconnectCancelBtn}
              onPress={() => setShowDisconnectModal(false)}
              disabled={disconnecting}
              activeOpacity={0.7}
            >
              <Text style={styles.disconnectCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.disconnectConfirmBtn, disconnecting && styles.disconnectBtnDisabled]}
              onPress={handleConfirmDisconnect}
              disabled={disconnecting}
              activeOpacity={0.7}
            >
              {disconnecting ? (
                <ActivityIndicator size={18} color="#fff" />
              ) : (
                <Text style={styles.disconnectConfirmText}>Disconnect</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreen;

// ==================== FULLSCREEN PHOTO VIEWER STYLES ====================
const viewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.5,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  dotsRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
    borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Drawer Modal - Full screen coverage on both platforms
  drawerModal: {
    margin: 0,
    padding: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },

  // LinkedIn-style Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileAvatarBtn: {
    position: 'relative',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#581845',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#fff',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#581845',
    letterSpacing: 0.5,
  },
  searchBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 10,
    gap: 8,
  },
  searchBarPlaceholder: {
    fontSize: 15,
    color: '#999',
    flex: 1,
  },
  chatIconBtn: {
    position: 'relative',
    padding: 6,
  },
  chatBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },

  // Filter bar
  filterBar: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#f7eef5',
    borderWidth: 1,
    borderColor: '#e8d6e6',
  },
  filterBtnText: { color: '#581845', fontWeight: '700' },
  refreshBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#eee',
  },
  badge: {
    marginLeft: 'auto',
    backgroundColor: '#581845',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  chipRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    paddingVertical: 7,
    paddingLeft: 10,
    paddingRight: 6,
    borderRadius: 999,
    backgroundColor: '#f4f4f4',
    borderWidth: 1,
    borderColor: '#eee',
  },
  chipText: { color: '#333', fontSize: 12, fontWeight: '600', maxWidth: 220 },
  chipX: { marginLeft: 6 },

  clearAllBtn: { paddingVertical: 6, paddingHorizontal: 6 },
  clearAllText: { color: '#581845', fontWeight: '700' },

  scrollContainer: { paddingBottom: 30 },

  cardContainer: {
    marginBottom: 30,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: CARD_MARGIN_H,
    backgroundColor: '#fefefe',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  image: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
  },

  photoSection: {
    position: 'relative',
  },

  // 📍 Location Badge on Photo (Compact Design - matches online status)
  locationBadgePhoto: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: '45%',
  },
  locationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  // Achievement Badge on Photo
  achievementBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Online Status Badge
  onlineStatusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },
  onlineStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  onlineStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // LinkedIn-style Action Bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B4C5A',
    marginTop: 2,
  },
  actionLabelActive: {
    color: '#581845',
  },
  actionLabelFavorited: {
    color: '#f39c12',
  },
  actionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  // Name Row with Badges
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  verifiedInline: {
    marginLeft: 6,
    marginRight: 4,
  },

  infoBox: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 14 : 10,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#222' },
  extraInfo: { fontSize: 14, fontWeight: '400', color: '#777' },
  schName: { fontSize: 16, color: '#444', marginBottom: 10 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#555',
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  interestList: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
    lineHeight: Platform.OS === 'android' ? 22 : 20,
  },
  location: { fontSize: 14, color: '#555', marginTop: 10 },

  // 📍 Location Container Styles - Modern Tinder-inspired Design
  locationContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7eef5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationInfo: {
    flex: 1,
  },
  locationCity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  locationDistance: {
    fontSize: 13,
    color: '#581845',
    fontWeight: '500',
    marginTop: 2,
  },
  locationHidden: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2,
  },

  error: { fontSize: 14, color: 'red', textAlign: 'center' },

  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },

  // Empty list
  emptyWrap: {
    padding: 30,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginTop: 6 },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center' },
  emptyBtn: {
    marginTop: 10,
    backgroundColor: '#581845',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontWeight: '800' },

  // Scroll to top button
  scrollTopBtn: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 100,
  },
  scrollTopInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },

  // Bottom Sheet modal
  sheetModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    maxHeight: '88%',
  },
  sheetHeader: {
    paddingBottom: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#ddd',
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#111' },

  sheetSectionTitle: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '800',
    color: '#222',
  },

  // Pills (Sex)
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#f4f4f4',
    borderWidth: 1,
    borderColor: '#eee',
  },
  pillActive: {
    backgroundColor: '#f7eef5',
    borderColor: '#581845',
  },
  pillText: { color: '#333', fontWeight: '700', fontSize: 13 },
  pillTextActive: { color: '#581845' },

  // Search row + options list
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111' },

  optionWrap: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  optionRowActive: {
    backgroundColor: '#f7eef5',
  },
  optionText: { color: '#222', fontWeight: '600' },
  optionTextActive: { color: '#581845', fontWeight: '800' },

  emptySmall: { textAlign: 'center', paddingVertical: 14, color: '#777' },
  hintText: { textAlign: 'center', paddingVertical: 10, color: '#777', fontSize: 12 },

  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingBottom: 4,
  },
  footerBtnGhost: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  footerBtnGhostText: { color: '#333', fontWeight: '800' },
  footerBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#581845',
  },
  footerBtnPrimaryText: { color: '#fff', fontWeight: '900' },

  // 🔴 Disconnect Confirmation Modal Styles
  disconnectModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: SCREEN_WIDTH - 48,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  disconnectAvatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  disconnectAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#f0f0f0',
  },
  disconnectIconOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#581845',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  disconnectTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 10,
  },
  disconnectMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  disconnectActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  disconnectCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  disconnectConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  disconnectBtnDisabled: {
    opacity: 0.7,
  },
});




// import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   Dimensions,
//   TouchableOpacity,
//   Image,
//   Animated,
//   Platform,
//   StatusBar,
//   FlatList,
//   TextInput,
//   Pressable,
// } from 'react-native';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { AuthContext } from '../context/AuthContext';
// import api from '../services/api';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import Feather from 'react-native-vector-icons/Feather';
// import { useNavigation, useFocusEffect } from '@react-navigation/native';
// import Modal from 'react-native-modal';

// const { width: SCREEN_WIDTH, height } = Dimensions.get('window');
// const CARD_MARGIN_H = 20;
// const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
// const IMAGE_HEIGHT = height * 0.45;

// const FallbackImage = require('../assets/fff.jpg');

// const HomeScreen = () => {
//   const { user } = useContext(AuthContext);
//   const [verifiedUsers, setVerifiedUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');
//   const navigation = useNavigation();
//   const insets = useSafeAreaInsets();

//   // ----------------------------
//   // Filters state
//   // ----------------------------
//   const [showFilters, setShowFilters] = useState(false);

//   const [filters, setFilters] = useState({
//     sex: null,       // maps to u.gender
//     country: null,   // maps to u.origin
//     school: null,    // derived from email domain
//     industry: null,  // maps to u.industry
//     program: null,   // maps to u.type
//   });

//   // Search text inside modal lists
//   const [search, setSearch] = useState({
//     country: '',
//     school: '',
//     industry: '',
//     program: '',
//   });

//   const resetFilters = () => {
//     setFilters({ sex: null, country: null, school: null, industry: null, program: null });
//     setSearch({ country: '', school: '', industry: '', program: '' });
//   };

//   const activeFilterCount = Object.values(filters).filter(Boolean).length;

//   const shuffle = (arr) => {
//     const a = arr.slice();
//     for (let i = a.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [a[i], a[j]] = [a[j], a[i]];
//     }
//     return a;
//   };

//   const NEW_WINDOW_DAYS = 14;

//   const fetchVerifiedUsers = async () => {
//     setLoading(true);
//     try {
//       const response = await api.get('/accounts/verified');

//       const myId = String(user?._id || user?.id || '');
//       const filtered = (Array.isArray(response.data) ? response.data : [])
//         .filter((u) => String(u._id || u.id) !== myId);

//       const now = Date.now();
//       const hasCreatedAt = filtered.some((u) => u?.createdAt);

//       if (!hasCreatedAt) {
//         setVerifiedUsers(shuffle(filtered));
//         setError('');
//         return;
//       }

//       const isNew = (u) => {
//         const t = new Date(u.createdAt).getTime();
//         if (!Number.isFinite(t)) return false;
//         return now - t <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
//       };

//       const newUsers = [];
//       const oldUsers = [];
//       for (const u of filtered) (isNew(u) ? newUsers : oldUsers).push(u);

//       const randomized = [...shuffle(newUsers), ...shuffle(oldUsers)];
//       setVerifiedUsers(randomized);
//       setError('');
//     } catch (err) {
//       setError('Failed to fetch users');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useFocusEffect(useCallback(() => { fetchVerifiedUsers(); }, []));

//   // ----------------------------
//   // Helpers for filtering
//   // ----------------------------
//   const normalize = (v = '') => String(v).trim().toLowerCase();

//   const getSchoolName = (email) => {
//     if (!email || !email.includes('@')) return '';
//     const domain = email.split('@')[1] || '';
//     const base = domain.split('.')[0] || ''; // duke, harvard, etc.
//     if (!base) return '';
//     return base
//       .replace(/-/g, ' ')
//       .replace(/\b\w/g, (c) => c.toUpperCase());
//   };

//   const normalizeIndustry = (industry = '') => {
//     // your industry options sometimes include emoji prefix; backend likely stores plain text
//     // We'll strip leading non-letters/numbers + spaces.
//     return String(industry).replace(/^[^\w]+?\s*/, '').trim();
//   };

//   // Options derived from dataset (so the filter lists always match actual users)
//   const filterOptions = useMemo(() => {
//     const sexes = new Set();
//     const countries = new Set();
//     const schools = new Set();
//     const industries = new Set();
//     const programs = new Set();

//     for (const u of verifiedUsers) {
//       if (u?.gender) sexes.add(String(u.gender));
//       if (u?.origin) countries.add(String(u.origin));
//       const sch = getSchoolName(u?.email);
//       if (sch) schools.add(sch);
//       if (u?.industry) industries.add(normalizeIndustry(u.industry));
//       if (u?.type) programs.add(String(u.type));
//     }

//     const sortAlpha = (a, b) => a.localeCompare(b);

//     return {
//       sexes: Array.from(sexes).sort(sortAlpha),
//       countries: Array.from(countries).sort(sortAlpha),
//       schools: Array.from(schools).sort(sortAlpha),
//       industries: Array.from(industries).sort(sortAlpha),
//       programs: Array.from(programs).sort(sortAlpha),
//     };
//   }, [verifiedUsers]);

//   // Apply filters locally
//   const filteredUsers = useMemo(() => {
//     if (!verifiedUsers?.length) return [];

//     return verifiedUsers.filter((u) => {
//       const gender = u?.gender || '';
//       const origin = u?.origin || '';
//       const school = getSchoolName(u?.email);
//       const industry = normalizeIndustry(u?.industry || '');
//       const program = u?.type || '';

//       if (filters.sex && normalize(gender) !== normalize(filters.sex)) return false;
//       if (filters.country && normalize(origin) !== normalize(filters.country)) return false;
//       if (filters.school && normalize(school) !== normalize(filters.school)) return false;
//       if (filters.industry && normalize(industry) !== normalize(filters.industry)) return false;
//       if (filters.program && normalize(program) !== normalize(filters.program)) return false;

//       return true;
//     });
//   }, [verifiedUsers, filters]);

//   // Quick remove a single filter chip
//   const clearOne = (key) => setFilters((prev) => ({ ...prev, [key]: null }));

//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#581845" />
//       </View>
//     );
//   }

//   if (error) {
//     return (
//       <View style={styles.center}>
//         <Text style={styles.error}>{error}</Text>
//       </View>
//     );
//   }

//   const androidTopPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

//   return (
//     <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
//       {/* Header */}
//       <View
//         style={[
//           styles.header,
//           { paddingBottom: 6, marginTop: 10 },
//         ]}
//       >
//         <Text style={styles.heading}>Meet Verified Members</Text>

//         {/* Filter Bar */}
//         <View style={styles.filterBar}>
//           <TouchableOpacity
//             style={styles.filterBtn}
//             onPress={() => setShowFilters(true)}
//           >
//             <Ionicons name="options-outline" size={18} color="#581845" />
//             <Text style={styles.filterBtnText}>Filters</Text>
//             {activeFilterCount > 0 && (
//               <View style={styles.badge}>
//                 <Text style={styles.badgeText}>{activeFilterCount}</Text>
//               </View>
//             )}
//           </TouchableOpacity>

//           <TouchableOpacity
//             style={styles.refreshBtn}
//             onPress={fetchVerifiedUsers}
//           >
//             <Ionicons name="refresh-outline" size={18} color="#581845" />
//           </TouchableOpacity>
//         </View>

//         {/* Active filter chips */}
//         {activeFilterCount > 0 && (
//           <View style={styles.chipRow}>
//             {filters.sex && (
//               <Chip label={`Sex: ${filters.sex}`} onRemove={() => clearOne('sex')} />
//             )}
//             {filters.country && (
//               <Chip label={`Country: ${filters.country}`} onRemove={() => clearOne('country')} />
//             )}
//             {filters.school && (
//               <Chip label={`School: ${filters.school}`} onRemove={() => clearOne('school')} />
//             )}
//             {filters.industry && (
//               <Chip label={`Industry: ${filters.industry}`} onRemove={() => clearOne('industry')} />
//             )}
//             {filters.program && (
//               <Chip label={`Program: ${filters.program}`} onRemove={() => clearOne('program')} />
//             )}

//             <TouchableOpacity onPress={resetFilters} style={styles.clearAllBtn}>
//               <Text style={styles.clearAllText}>Clear all</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>

//       <FlatList
//         data={filteredUsers}
//         // ✅ IMPORTANT: use _id or id consistently
//         keyExtractor={(item) => String(item._id || item.id)}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 20 }]}
//         renderItem={({ item }) => <UserCard u={item} navigation={navigation} />}
//         ListEmptyComponent={
//           <View style={styles.emptyWrap}>
//             <Ionicons name="search-outline" size={20} color="#777" />
//             <Text style={styles.emptyTitle}>No matches</Text>
//             <Text style={styles.emptyText}>Try adjusting your filters.</Text>
//             <TouchableOpacity onPress={resetFilters} style={styles.emptyBtn}>
//               <Text style={styles.emptyBtnText}>Reset filters</Text>
//             </TouchableOpacity>
//           </View>
//         }
//       />

//       {/* Filter Sheet */}
//       <FilterSheet
//         visible={showFilters}
//         onClose={() => setShowFilters(false)}
//         filters={filters}
//         setFilters={setFilters}
//         search={search}
//         setSearch={setSearch}
//         options={filterOptions}
//         resetFilters={resetFilters}
//       />
//     </SafeAreaView>
//   );
// };

// const Chip = ({ label, onRemove }) => (
//   <View style={styles.chip}>
//     <Text numberOfLines={1} style={styles.chipText}>{label}</Text>
//     <Pressable onPress={onRemove} hitSlop={10} style={styles.chipX}>
//       <Ionicons name="close" size={14} color="#581845" />
//     </Pressable>
//   </View>
// );

// const FilterSheet = ({
//   visible,
//   onClose,
//   filters,
//   setFilters,
//   search,
//   setSearch,
//   options,
//   resetFilters,
// }) => {
//   const setOne = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

//   const filterList = (list, q) => {
//     const qq = (q || '').trim().toLowerCase();
//     if (!qq) return list;
//     return list.filter((x) => String(x).toLowerCase().includes(qq));
//   };

//   const countries = filterList(options.countries, search.country);
//   const schools = filterList(options.schools, search.school);
//   const industries = filterList(options.industries, search.industry);
//   const programs = filterList(options.programs, search.program);

//   return (
//     <Modal
//       isVisible={visible}
//       onBackdropPress={onClose}
//       onBackButtonPress={onClose}
//       style={styles.sheetModal}
//       backdropOpacity={0.35}
//       useNativeDriver
//       useNativeDriverForBackdrop
//       avoidKeyboard
//     >
//       <View style={styles.sheet}>
//         {/* Sheet header */}
//         <View style={styles.sheetHeader}>
//           <View style={styles.sheetHandle} />
//           <View style={styles.sheetHeaderRow}>
//             <Text style={styles.sheetTitle}>Filters</Text>
//             <Pressable onPress={onClose} hitSlop={10}>
//               <Ionicons name="close" size={22} color="#111" />
//             </Pressable>
//           </View>
//         </View>

//         <FlatList
//           data={[{ key: 'content' }]}
//           keyExtractor={(i) => i.key}
//           renderItem={() => (
//             <View style={{ paddingBottom: 10 }}>
//               {/* Sex */}
//               <Text style={styles.sheetSectionTitle}>Sex</Text>
//               <View style={styles.pillsRow}>
//                 {options.sexes.length ? options.sexes : ['Male', 'Female'].map(() => null)}
//                {(options.sexes?.length ? options.sexes : ['Male', 'Female']).map((s) => {
//   const active = filters.sex === s;
//   return (
//     <TouchableOpacity
//       key={s}
//       onPress={() => setOne('sex', active ? null : s)}
//       style={[styles.pill, active && styles.pillActive]}
//     >
//       <Text style={[styles.pillText, active && styles.pillTextActive]}>{s}</Text>
//     </TouchableOpacity>
//   );
// })}

//               </View>
              

//               {/* Country */}
//               <SectionList
//                 title="Country"
//                 value={filters.country}
//                 searchValue={search.country}
//                 onSearch={(t) => setSearch((p) => ({ ...p, country: t }))}
//                 data={countries}
//                 onSelect={(v) => setOne('country', filters.country === v ? null : v)}
//               />

//               {/* School */}
//               <SectionList
//                 title="School"
//                 value={filters.school}
//                 searchValue={search.school}
//                 onSearch={(t) => setSearch((p) => ({ ...p, school: t }))}
//                 data={schools}
//                 onSelect={(v) => setOne('school', filters.school === v ? null : v)}
//               />

//               {/* Industry */}
//               <SectionList
//                 title="Industry"
//                 value={filters.industry}
//                 searchValue={search.industry}
//                 onSearch={(t) => setSearch((p) => ({ ...p, industry: t }))}
//                 data={industries}
//                 onSelect={(v) => setOne('industry', filters.industry === v ? null : v)}
//               />

//               {/* Program */}
//               <SectionList
//                 title="Program"
//                 value={filters.program}
//                 searchValue={search.program}
//                 onSearch={(t) => setSearch((p) => ({ ...p, program: t }))}
//                 data={programs}
//                 onSelect={(v) => setOne('program', filters.program === v ? null : v)}
//               />

//               {/* Footer buttons */}
//               <View style={styles.sheetFooter}>
//                 <TouchableOpacity onPress={resetFilters} style={styles.footerBtnGhost}>
//                   <Text style={styles.footerBtnGhostText}>Reset</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity onPress={onClose} style={styles.footerBtnPrimary}>
//                   <Text style={styles.footerBtnPrimaryText}>Apply</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}
//           showsVerticalScrollIndicator={false}
//         />
//       </View>
//     </Modal>
//   );
// };

// const SectionList = ({ title, value, searchValue, onSearch, data, onSelect }) => {
//   return (
//     <View style={{ marginTop: 14 }}>
//       <Text style={styles.sheetSectionTitle}>{title}</Text>

//       <View style={styles.searchRow}>
//         <Ionicons name="search-outline" size={18} color="#777" />
//         <TextInput
//           value={searchValue}
//           onChangeText={onSearch}
//           placeholder={`Search ${title.toLowerCase()}...`}
//           placeholderTextColor="#999"
//           style={styles.searchInput}
//           autoCorrect={false}
//           returnKeyType="search"
//         />
//         {!!searchValue && (
//           <Pressable onPress={() => onSearch('')} hitSlop={10}>
//             <Ionicons name="close-circle" size={18} color="#999" />
//           </Pressable>
//         )}
//       </View>

//       <View style={styles.optionWrap}>
//         {data.slice(0, 20).map((v) => {
//           const active = value === v;
//           return (
//             <TouchableOpacity
//               key={v}
//               style={[styles.optionRow, active && styles.optionRowActive]}
//               onPress={() => onSelect(v)}
//             >
//               <Text style={[styles.optionText, active && styles.optionTextActive]}>{v}</Text>
//               {active && <Ionicons name="checkmark" size={18} color="#581845" />}
//             </TouchableOpacity>
//           );
//         })}

//         {!data.length && (
//           <Text style={styles.emptySmall}>No matches</Text>
//         )}

//         {data.length > 20 && (
//           <Text style={styles.hintText}>Showing first 20. Refine your search.</Text>
//         )}
//       </View>
//     </View>
//   );
// };

// const UserCard = ({ u, navigation }) => {
//   const photos = u.photos && u.photos.length > 0 ? u.photos : [null];
//   const scrollX = useRef(new Animated.Value(0)).current;

//   const renderSlide = ({ item: photo }) => {
//     const uri = photo
//       ? (photo.startsWith('http') ? photo : `http://192.168.14.134:4000${photo}`)
//       : null;

//     return (
//       <Image
//         source={uri ? { uri } : FallbackImage}
//         style={styles.image}
//         resizeMode="cover"
//       />
//     );
//   };

//   const schoolName =
//     u.email
//       ?.split('@')[1]
//       ?.split('.')[0]
//       ?.replace(/-/g, ' ')
//       ?.replace(/\b\w/g, (c) => c.toUpperCase()) || '';

//   return (
//     <View style={styles.cardContainer}>
//       <Animated.FlatList
//         data={photos}
//         keyExtractor={(_, idx) => String(idx)}
//         renderItem={renderSlide}
//         horizontal
//         pagingEnabled
//         snapToInterval={CARD_WIDTH}
//         snapToAlignment="start"
//         decelerationRate="fast"
//         disableIntervalMomentum
//         showsHorizontalScrollIndicator={false}
//         bounces={false}
//         nestedScrollEnabled
//         onScroll={Animated.event(
//           [{ nativeEvent: { contentOffset: { x: scrollX } } }],
//           { useNativeDriver: false }
//         )}
//         scrollEventThrottle={16}
//         getItemLayout={(_, index) => ({
//           length: CARD_WIDTH,
//           offset: CARD_WIDTH * index,
//           index,
//         })}
//       />

//       {photos.length > 1 && (
//         <View style={styles.dotsContainer}>
//           {photos.map((_, i) => {
//             const inputRange = [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH];
//             const opacity = scrollX.interpolate({
//               inputRange,
//               outputRange: [0.3, 1, 0.3],
//               extrapolate: 'clamp',
//             });
//             const scale = scrollX.interpolate({
//               inputRange,
//               outputRange: [0.8, 1.2, 0.8],
//               extrapolate: 'clamp',
//             });
//             return (
//               <Animated.View
//                 key={i}
//                 style={[styles.dot, { opacity, transform: [{ scale }] }]}
//               />
//             );
//           })}
//         </View>
//       )}

//       <View style={styles.buttonsRow}>
//         <TouchableOpacity
//           style={[styles.iconButton]}
//           onPress={() => navigation.navigate('UserProfile', { user: u })}
//         >
//           <Feather name="info" size={22} color="#581845" />
//           <Text style={styles.actionText}>Profile</Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={[styles.iconButton, styles.primaryOutline]}
//           onPress={() => navigation.navigate('PrivateChat', { user: u })}
//         >
//           <Ionicons name="chatbubble-ellipses" size={22} color="#581845" />
//           <Text style={styles.actionText}>Message</Text>
//         </TouchableOpacity>
//       </View>

//       <View style={styles.infoBox}>
//         <Text style={styles.name}>
//           {u.firstName} {u.lastName}{' '}
//           <Text style={styles.extraInfo}>({u.gender}, {u.origin})</Text>
//         </Text>

//         <Text style={styles.schName}>
//           {schoolName} ({u.type} '{String(u.graduationYear).slice(-2)}) • {u.industry}
//         </Text>

//         {!!u.bio && (
//           <>
//             <Text style={styles.sectionTitle}>About me</Text>
//             <Text style={styles.sectionText}>{u.bio}</Text>
//           </>
//         )}

//         {!!u.fieldOfStudy && (
//           <>
//             <Text style={styles.sectionTitle}>Current / Previous Role</Text>
//             <Text style={styles.sectionText}>{u.currentRole}</Text>
//           </>
//         )}

//         {u.interests && u.interests.length > 0 && (
//           <>
//             <Text style={styles.sectionTitle}>Interests</Text>
//             <Text style={styles.interestList}>{u.interests.join(' • ')}</Text>
//           </>
//         )}

//         {!!u.location && (
//           <Text style={styles.location}>
//             <Ionicons name="location-sharp" size={16} color="#581845" /> {u.location}
//           </Text>
//         )}
//       </View>
//     </View>
//   );
// };

// export default HomeScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },

//   header: {
//     paddingHorizontal: 20,
//     paddingBottom: 10,
//   },

//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//   heading: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#581845',
//     textAlign: 'center',
//   },

//   // Filter bar
//   filterBar: {
//     marginTop: 10,
//     flexDirection: 'row',
//     gap: 10,
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   filterBtn: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     borderRadius: 14,
//     backgroundColor: '#f7eef5',
//     borderWidth: 1,
//     borderColor: '#e8d6e6',
//   },
//   filterBtnText: { color: '#581845', fontWeight: '700' },
//   refreshBtn: {
//     width: 46,
//     height: 46,
//     borderRadius: 14,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#f7f7f7',
//     borderWidth: 1,
//     borderColor: '#eee',
//   },
//   badge: {
//     marginLeft: 'auto',
//     backgroundColor: '#581845',
//     borderRadius: 999,
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//   },
//   badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

//   chipRow: {
//     marginTop: 10,
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     alignItems: 'center',
//   },
//   chip: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     maxWidth: '90%',
//     paddingVertical: 7,
//     paddingLeft: 10,
//     paddingRight: 6,
//     borderRadius: 999,
//     backgroundColor: '#f4f4f4',
//     borderWidth: 1,
//     borderColor: '#eee',
//   },
//   chipText: { color: '#333', fontSize: 12, fontWeight: '600', maxWidth: 220 },
//   chipX: { marginLeft: 6 },

//   clearAllBtn: { paddingVertical: 6, paddingHorizontal: 6 },
//   clearAllText: { color: '#581845', fontWeight: '700' },

//   scrollContainer: { paddingBottom: 30 },

//   cardContainer: {
//     marginBottom: 30,
//     borderRadius: 20,
//     overflow: 'hidden',
//     marginHorizontal: CARD_MARGIN_H,
//     backgroundColor: '#fefefe',
//     elevation: 4,
//     shadowColor: '#000',
//     shadowOpacity: 0.12,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 4 },
//   },

//   image: {
//     width: CARD_WIDTH,
//     height: IMAGE_HEIGHT,
//   },

//   buttonsRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     paddingVertical: Platform.OS === 'android' ? 14 : 12,
//     paddingHorizontal: 20,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderColor: '#f0f0f0',
//     borderBottomLeftRadius: 16,
//     borderBottomRightRadius: 16,
//     gap: 15,
//   },
//   iconButton: {
//     flex: 1,
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#f9f9f9',
//     paddingVertical: Platform.OS === 'android' ? 12 : 10,
//     borderRadius: 14,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.1,
//     shadowRadius: 3,
//   },
//   primaryOutline: {
//     backgroundColor: '#fff0f5',
//     borderWidth: 1,
//     borderColor: '#581845',
//   },
//   actionText: { marginLeft: 8, color: '#581845', fontWeight: '600' },

//   infoBox: {
//     paddingHorizontal: 16,
//     paddingVertical: Platform.OS === 'android' ? 14 : 10,
//   },
//   name: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 6 },
//   extraInfo: { fontSize: 14, fontWeight: '400', color: '#777' },
//   schName: { fontSize: 16, color: '#444', marginBottom: 10 },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#333',
//     marginTop: 12,
//     marginBottom: 4,
//   },
//   sectionText: {
//     fontSize: 14,
//     color: '#555',
//     lineHeight: Platform.OS === 'android' ? 22 : 20,
//   },
//   interestList: {
//     fontSize: 14,
//     color: '#555',
//     marginTop: 4,
//     lineHeight: Platform.OS === 'android' ? 22 : 20,
//   },
//   location: { fontSize: 14, color: '#555', marginTop: 10 },

//   error: { fontSize: 14, color: 'red', textAlign: 'center' },

//   dotsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 10,
//     marginBottom: 10,
//   },
//   dot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#581845',
//     marginHorizontal: 5,
//   },

//   // Empty list
//   emptyWrap: {
//     padding: 30,
//     alignItems: 'center',
//     gap: 6,
//   },
//   emptyTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginTop: 6 },
//   emptyText: { fontSize: 13, color: '#666', textAlign: 'center' },
//   emptyBtn: {
//     marginTop: 10,
//     backgroundColor: '#581845',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 12,
//   },
//   emptyBtnText: { color: '#fff', fontWeight: '800' },

//   // Bottom Sheet modal
//   sheetModal: {
//     margin: 0,
//     justifyContent: 'flex-end',
//   },
//   sheet: {
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 22,
//     borderTopRightRadius: 22,
//     paddingHorizontal: 16,
//     paddingTop: 10,
//     paddingBottom: 14,
//     maxHeight: '88%',
//   },
//   sheetHeader: {
//     paddingBottom: 8,
//   },
//   sheetHandle: {
//     alignSelf: 'center',
//     width: 44,
//     height: 5,
//     borderRadius: 999,
//     backgroundColor: '#ddd',
//     marginBottom: 10,
//   },
//   sheetHeaderRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//   },
//   sheetTitle: { fontSize: 18, fontWeight: '900', color: '#111' },

//   sheetSectionTitle: {
//     marginTop: 6,
//     marginBottom: 8,
//     fontSize: 14,
//     fontWeight: '800',
//     color: '#222',
//   },

//   // Pills (Sex)
//   pillsRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
//   pill: {
//     paddingVertical: 10,
//     paddingHorizontal: 14,
//     borderRadius: 999,
//     backgroundColor: '#f4f4f4',
//     borderWidth: 1,
//     borderColor: '#eee',
//   },
//   pillActive: {
//     backgroundColor: '#f7eef5',
//     borderColor: '#581845',
//   },
//   pillText: { color: '#333', fontWeight: '700', fontSize: 13 },
//   pillTextActive: { color: '#581845' },

//   // Search row + options list
//   searchRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     borderWidth: 1,
//     borderColor: '#eee',
//     backgroundColor: '#fafafa',
//     borderRadius: 14,
//     paddingHorizontal: 12,
//     height: 44,
//   },
//   searchInput: { flex: 1, fontSize: 14, color: '#111' },

//   optionWrap: {
//     marginTop: 10,
//     borderWidth: 1,
//     borderColor: '#eee',
//     borderRadius: 14,
//     overflow: 'hidden',
//     backgroundColor: '#fff',
//   },
//   optionRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//     paddingHorizontal: 12,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#eee',
//   },
//   optionRowActive: {
//     backgroundColor: '#f7eef5',
//   },
//   optionText: { color: '#222', fontWeight: '600' },
//   optionTextActive: { color: '#581845', fontWeight: '800' },

//   emptySmall: { textAlign: 'center', paddingVertical: 14, color: '#777' },
//   hintText: { textAlign: 'center', paddingVertical: 10, color: '#777', fontSize: 12 },

//   sheetFooter: {
//     flexDirection: 'row',
//     gap: 10,
//     marginTop: 16,
//     paddingBottom: 4,
//   },
//   footerBtnGhost: {
//     flex: 1,
//     borderRadius: 14,
//     paddingVertical: 12,
//     borderWidth: 1,
//     borderColor: '#eee',
//     alignItems: 'center',
//     backgroundColor: '#fafafa',
//   },
//   footerBtnGhostText: { color: '#333', fontWeight: '800' },
//   footerBtnPrimary: {
//     flex: 1,
//     borderRadius: 14,
//     paddingVertical: 12,
//     alignItems: 'center',
//     backgroundColor: '#581845',
//   },
//   footerBtnPrimaryText: { color: '#fff', fontWeight: '900' },
// });
