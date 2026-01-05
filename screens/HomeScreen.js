


// import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
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
// } from 'react-native';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { AuthContext } from '../context/AuthContext';
// import api from '../services/api';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import Feather from 'react-native-vector-icons/Feather';
// import { useNavigation, useFocusEffect } from '@react-navigation/native';

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

//   const shuffle = (arr) => {
//   const a = arr.slice();
//   for (let i = a.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [a[i], a[j]] = [a[j], a[i]];
//   }
//   return a;
// };

// const NEW_WINDOW_DAYS = 14;

// const fetchVerifiedUsers = async () => {
//   setLoading(true);
//   try {
//     const response = await api.get('/accounts/verified');

//     // exclude me (cover both id styles)
//     const myId = String(user?._id || user?.id || '');
//     const filtered = (Array.isArray(response.data) ? response.data : [])
//       .filter((u) => String(u._id || u.id) !== myId);

//     // If we have createdAt, prioritize "new", otherwise just shuffle everyone
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

//     // Shuffle both groups so order changes every refresh
//     const randomized = [...shuffle(newUsers), ...shuffle(oldUsers)];
//     setVerifiedUsers(randomized);
//     setError('');
//   } catch (err) {
//     setError('Failed to fetch users');
//   } finally {
//     setLoading(false);
//   }
// };

//   // const fetchVerifiedUsers = async () => {
//   //   setLoading(true);
//   //   try {
//   //     const response = await api.get('/accounts/verified');
//   //     const filtered = response.data.filter((u) => u.id !== user.id);
//   //     setVerifiedUsers(filtered);
//   //     setError('');
//   //   } catch (err) {
//   //     setError('Failed to fetch users');
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };

//   useFocusEffect(useCallback(() => { fetchVerifiedUsers(); }, []));

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

//   // Lift content below status bar on Android (accounts for devices without cutouts)
//   const androidTopPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

//   return (
//     <SafeAreaView
//       style={styles.container}
//       edges={['top', 'left', 'right']} // bottom can scroll under; header honors top inset
//     >
//       {/* Header */}
//       <View
//         style={[
//           styles.header,
//           {
//             //  paddingTop: Math.max(insets.top, androidTopPad) + (Platform.OS === 'android' ? 6 : 2),
//       paddingBottom: 4, // was 8

//             // paddingTop: Math.max(insets.top, androidTopPad) + (Platform.OS === 'android' ? 12 : 4),
//           },
//         ]}
//       >
//         <Text style={styles.heading}>Meet Verified Members</Text>
//       </View>

//       <FlatList
//         data={verifiedUsers}
//         keyExtractor={(item) => String(item.id)}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={[
//           styles.scrollContainer,
//           { paddingBottom: insets.bottom + 20 },
//         ]}
//         renderItem={({ item }) => <UserCard u={item} navigation={navigation} />}
//       />
//     </SafeAreaView>
//   );
// };

// const UserCard = ({ u, navigation }) => {
//   const photos = u.photos && u.photos.length > 0 ? u.photos : [null];
//   const scrollX = useRef(new Animated.Value(0)).current;

//   const renderSlide = ({ item: photo }) => {
//     const uri = photo
//       ? (photo.startsWith('http') ? photo : `https://three4th-street-backend.onrender.com${photo}`)
//       : null;

//     return (
//       <Image
//         source={uri ? { uri } : FallbackImage}
//         style={styles.image}
//         resizeMode="cover"
//       />
//     );
//   };

//   return (
//     <View style={styles.cardContainer}>
//       {/* Image carousel */}
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

//       {/* Dots */}
//       {photos.length > 1 && (
//         <View style={styles.dotsContainer}>
//           {photos.map((_, i) => {
//             const inputRange = [
//               (i - 1) * CARD_WIDTH,
//               i * CARD_WIDTH,
//               (i + 1) * CARD_WIDTH,
//             ];
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

//       {/* Action Buttons */}
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

//       {/* User Info */}
//       <View style={styles.infoBox}>
//         <Text style={styles.name}>
//           {u.firstName} {u.lastName}{' '}
//           <Text style={styles.extraInfo}>({u.gender}, {u.origin})</Text>
//         </Text>

//         <Text style={styles.schName}>
//           {u.email
//             ?.split('@')[1]
//             ?.split('.')[0]
//             ?.replace(/-/g, ' ')
//             ?.replace(/\b\w/g, (c) => c.toUpperCase())}{' '}
//           ({u.type} '{String(u.graduationYear).slice(-2)}) • {u.industry}
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
//     marginTop:10,
//   },

//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//   heading: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#581845',
//     textAlign: 'center',
//   },

//   scrollContainer: { paddingBottom: 30 },

//   cardContainer: {
//     marginBottom: 30,
//     borderRadius: 20,
//     overflow: 'hidden',
//     marginHorizontal: CARD_MARGIN_H,
//     backgroundColor: '#fefefe',
//     elevation: 4, // Android shadow
//     shadowColor: '#000', // iOS shadow
//     shadowOpacity: 0.12,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 4 },
//   },

//   image: {
//     width: CARD_WIDTH,
//     height: IMAGE_HEIGHT,
//   },

//   // --- Buttons row ---
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

//   // --- Info block (extra Android padding/line-height) ---
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
// });




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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';

const { width: SCREEN_WIDTH, height } = Dimensions.get('window');
const CARD_MARGIN_H = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
const IMAGE_HEIGHT = height * 0.45;

const FallbackImage = require('../assets/fff.jpg');

const HomeScreen = () => {
  const { user } = useContext(AuthContext);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // ----------------------------
  // Filters state
  // ----------------------------
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    sex: null,       // maps to u.gender
    country: null,   // maps to u.origin
    school: null,    // derived from email domain
    industry: null,  // maps to u.industry
    program: null,   // maps to u.type
  });

  // Search text inside modal lists
  const [search, setSearch] = useState({
    country: '',
    school: '',
    industry: '',
    program: '',
  });

  const resetFilters = () => {
    setFilters({ sex: null, country: null, school: null, industry: null, program: null });
    setSearch({ country: '', school: '', industry: '', program: '' });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const NEW_WINDOW_DAYS = 14;

  const fetchVerifiedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/accounts/verified');

      const myId = String(user?._id || user?.id || '');
      const filtered = (Array.isArray(response.data) ? response.data : [])
        .filter((u) => String(u._id || u.id) !== myId);

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
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchVerifiedUsers(); }, []));

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
      if (sch) schools.add(sch);
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
      const gender = u?.gender || '';
      const origin = u?.origin || '';
      const school = getSchoolName(u?.email);
      const industry = normalizeIndustry(u?.industry || '');
      const program = u?.type || '';

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
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const androidTopPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingBottom: 6, marginTop: 10 },
        ]}
      >
        <Text style={styles.heading}>Meet Verified Members</Text>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={18} color="#581845" />
            <Text style={styles.filterBtnText}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchVerifiedUsers}
          >
            <Ionicons name="refresh-outline" size={18} color="#581845" />
          </TouchableOpacity>
        </View>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <View style={styles.chipRow}>
            {filters.sex && (
              <Chip label={`Sex: ${filters.sex}`} onRemove={() => clearOne('sex')} />
            )}
            {filters.country && (
              <Chip label={`Country: ${filters.country}`} onRemove={() => clearOne('country')} />
            )}
            {filters.school && (
              <Chip label={`School: ${filters.school}`} onRemove={() => clearOne('school')} />
            )}
            {filters.industry && (
              <Chip label={`Industry: ${filters.industry}`} onRemove={() => clearOne('industry')} />
            )}
            {filters.program && (
              <Chip label={`Program: ${filters.program}`} onRemove={() => clearOne('program')} />
            )}

            <TouchableOpacity onPress={resetFilters} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={filteredUsers}
        // ✅ IMPORTANT: use _id or id consistently
        keyExtractor={(item) => String(item._id || item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 20 }]}
        renderItem={({ item }) => <UserCard u={item} navigation={navigation} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={20} color="#777" />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyText}>Try adjusting your filters.</Text>
            <TouchableOpacity onPress={resetFilters} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Reset filters</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filter Sheet */}
      <FilterSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={setFilters}
        search={search}
        setSearch={setSearch}
        options={filterOptions}
        resetFilters={resetFilters}
      />
    </SafeAreaView>
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

const UserCard = ({ u, navigation }) => {
  const photos = u.photos && u.photos.length > 0 ? u.photos : [null];
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderSlide = ({ item: photo }) => {
    const uri = photo
      ? (photo.startsWith('http') ? photo : `https://three4th-street-backend.onrender.com${photo}`)
      : null;

    return (
      <Image
        source={uri ? { uri } : FallbackImage}
        style={styles.image}
        resizeMode="cover"
      />
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

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.iconButton]}
          onPress={() => navigation.navigate('UserProfile', { user: u })}
        >
          <Feather name="info" size={22} color="#581845" />
          <Text style={styles.actionText}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconButton, styles.primaryOutline]}
          onPress={() => navigation.navigate('PrivateChat', { user: u })}
        >
          <Ionicons name="chatbubble-ellipses" size={22} color="#581845" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.name}>
          {u.firstName} {u.lastName}{' '}
          <Text style={styles.extraInfo}>({u.gender}, {u.origin})</Text>
        </Text>

        <Text style={styles.schName}>
          {schoolName} ({u.type} '{String(u.graduationYear).slice(-2)}) • {u.industry}
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

        {!!u.location && (
          <Text style={styles.location}>
            <Ionicons name="location-sharp" size={16} color="#581845" /> {u.location}
          </Text>
        )}
      </View>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#581845',
    textAlign: 'center',
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

  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'android' ? 14 : 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    gap: 15,
  },
  iconButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  primaryOutline: {
    backgroundColor: '#fff0f5',
    borderWidth: 1,
    borderColor: '#581845',
  },
  actionText: { marginLeft: 8, color: '#581845', fontWeight: '600' },

  infoBox: {
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 14 : 10,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 6 },
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

  error: { fontSize: 14, color: 'red', textAlign: 'center' },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#581845',
    marginHorizontal: 5,
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
});
