import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height } = Dimensions.get('window');
const CARD_MARGIN_H = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN_H * 2;
const IMAGE_HEIGHT = height * 0.35;

const FallbackImage = require('../assets/fff.jpg');

// Filter categories - like LinkedIn's People, Posts, Jobs, etc.
const FILTER_CATEGORIES = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'name', label: 'Name', icon: 'person-outline' },
  { key: 'school', label: 'School', icon: 'school-outline' },
  { key: 'industry', label: 'Industry', icon: 'briefcase-outline' },
  { key: 'country', label: 'Country', icon: 'globe-outline' },
  { key: 'program', label: 'Program', icon: 'ribbon-outline' },
  { key: 'sex', label: 'Gender', icon: 'people-outline' },
];

const SearchScreen = ({ route }) => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef(null);
  
  // Auto-focus passed from HomeScreen
  const autoFocus = route?.params?.autoFocus ?? true;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showResults, setShowResults] = useState(false);

  // Load users on mount
  useEffect(() => {
    fetchVerifiedUsers();
    loadRecentSearches();
  }, []);

  // Auto-focus search input
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const fetchVerifiedUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/accounts/verified');
      const myId = String(user?._id || user?.id || '');
      const filtered = (Array.isArray(response.data) ? response.data : [])
        .filter((u) => String(u._id || u.id) !== myId)
        .filter(hasProfilePhoto);
      setVerifiedUsers(filtered);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const hasProfilePhoto = (u) => {
    if (!u) return false;
    const photos = Array.isArray(u.photos) ? u.photos : [];
    const first = photos[0];
    return Boolean(first && String(first).trim().length > 0);
  };

  // Recent searches
  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentSearches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (err) {
      console.log('Failed to load recent searches');
    }
  };

  const saveRecentSearch = async (query) => {
    if (!query.trim()) return;
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
      setRecentSearches(updated);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
    } catch (err) {
      console.log('Failed to save recent search');
    }
  };

  const clearRecentSearches = async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem('recentSearches');
  };

  const removeRecentSearch = async (query) => {
    const updated = recentSearches.filter(s => s !== query);
    setRecentSearches(updated);
    await AsyncStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Filtering logic
  const normalize = (v = '') => String(v).trim().toLowerCase();

  const getSchoolName = (email) => {
    if (!email || !email.includes('@')) return '';
    const domain = email.split('@')[1] || '';
    const base = domain.split('.')[0] || '';
    if (!base) return '';
    return base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const normalizeIndustry = (industry = '') => {
    return String(industry).replace(/^[^\w]+?\s*/, '').trim();
  };

  // Filter options derived from data
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

    return {
      sexes: Array.from(sexes).sort(),
      countries: Array.from(countries).sort(),
      schools: Array.from(schools).sort(),
      industries: Array.from(industries).sort(),
      programs: Array.from(programs).sort(),
    };
  }, [verifiedUsers]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim() && activeFilter === 'all') {
      return verifiedUsers;
    }

    const q = normalize(searchQuery);
    
    return verifiedUsers.filter((u) => {
      const fullName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim();
      const gender = u?.gender || '';
      const origin = u?.origin || '';
      const school = getSchoolName(u?.email);
      const industry = normalizeIndustry(u?.industry || '');
      const program = u?.type || '';

      // If there's a search query, check if it matches based on active filter
      if (q) {
        switch (activeFilter) {
          case 'name':
            return normalize(fullName).includes(q);
          case 'school':
            return normalize(school).includes(q);
          case 'industry':
            return normalize(industry).includes(q);
          case 'country':
            return normalize(origin).includes(q);
          case 'program':
            return normalize(program).includes(q);
          case 'sex':
            return normalize(gender).includes(q);
          case 'all':
          default:
            // Search across all fields
            return (
              normalize(fullName).includes(q) ||
              normalize(school).includes(q) ||
              normalize(industry).includes(q) ||
              normalize(origin).includes(q) ||
              normalize(program).includes(q) ||
              normalize(gender).includes(q)
            );
        }
      }
      
      return true;
    });
  }, [verifiedUsers, searchQuery, activeFilter]);

  // Quick filter suggestions based on active filter
  const quickSuggestions = useMemo(() => {
    switch (activeFilter) {
      case 'school':
        return filterOptions.schools.slice(0, 8);
      case 'industry':
        return filterOptions.industries.slice(0, 8);
      case 'country':
        return filterOptions.countries.slice(0, 8);
      case 'program':
        return filterOptions.programs.slice(0, 8);
      case 'sex':
        return filterOptions.sexes;
      default:
        return [];
    }
  }, [activeFilter, filterOptions]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      setShowResults(true);
      Keyboard.dismiss();
    }
  };

  const handleRecentSearchTap = (query) => {
    setSearchQuery(query);
    setShowResults(true);
    Keyboard.dismiss();
  };

  const handleSuggestionTap = (suggestion) => {
    setSearchQuery(suggestion);
    setShowResults(true);
    Keyboard.dismiss();
  };

  // Render filter chip
  const renderFilterChip = ({ item }) => {
    const isActive = activeFilter === item.key;
    return (
      <TouchableOpacity
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => setActiveFilter(item.key)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={item.icon} 
          size={16} 
          color={isActive ? '#fff' : '#666'} 
        />
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render recent search item
  const renderRecentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.recentItem} 
      onPress={() => handleRecentSearchTap(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="time-outline" size={20} color="#666" />
      <Text style={styles.recentText}>{item}</Text>
      <TouchableOpacity 
        onPress={() => removeRecentSearch(item)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render suggestion item
  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.suggestionItem} 
      onPress={() => handleSuggestionTap(item)}
      activeOpacity={0.7}
    >
      <Ionicons name="search-outline" size={18} color="#666" />
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  // Render user result card (compact)
  const renderUserResult = ({ item: u }) => {
    const photoUri = u.photos?.[0]
      ? (u.photos[0].startsWith('http') ? u.photos[0] : `http://192.168.100.4:4000${u.photos[0]}`)
      : null;

    const schoolName = getSchoolName(u.email);

    return (
      <TouchableOpacity 
        style={styles.resultCard}
        onPress={() => navigation.navigate('UserProfile', { user: u })}
        activeOpacity={0.8}
      >
        <Image
          source={photoUri ? { uri: photoUri } : FallbackImage}
          style={styles.resultAvatar}
        />
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={1}>
            {u.firstName} {u.lastName}
          </Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {schoolName.toUpperCase()} • {u.type}
          </Text>
          <Text style={styles.resultMeta} numberOfLines={1}>
            {u.industry} • {u.origin}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.connectBtn}
          onPress={() => navigation.navigate('PrivateChat', { user: u })}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={18} color="#581845" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const showSearchResults = searchQuery.trim().length > 0 || showResults;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search members..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.trim()) setShowResults(true);
            }}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setShowResults(false);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Filter Chips - LinkedIn Style */}
      <View style={styles.filterChipsContainer}>
        <FlatList
          data={FILTER_CATEGORIES}
          keyExtractor={(item) => item.key}
          renderItem={renderFilterChip}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsList}
        />
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#581845" />
        </View>
      ) : showSearchResults ? (
        /* Search Results */
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderUserResult}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsContainer}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredResults.length} {filteredResults.length === 1 ? 'member' : 'members'} found
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try a different search term or filter
              </Text>
            </View>
          }
        />
      ) : (
        /* Recent Searches & Suggestions */
        <ScrollView 
          style={styles.suggestionsContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent</Text>
                <TouchableOpacity onPress={clearRecentSearches}>
                  <Text style={styles.showAllText}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.slice(0, 5).map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.recentItem} 
                  onPress={() => handleRecentSearchTap(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <Text style={styles.recentText}>{item}</Text>
                  <TouchableOpacity 
                    onPress={() => removeRecentSearch(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={18} color="#999" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Suggestions based on active filter */}
          {quickSuggestions.length > 0 && (
            <View style={styles.suggestionsSection}>
              <Text style={styles.sectionTitle}>
                Try searching for
              </Text>
              {quickSuggestions.map((item, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.suggestionItem} 
                  onPress={() => handleSuggestionTap(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search-outline" size={18} color="#666" />
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular filters when on "All" */}
          {activeFilter === 'all' && (
            <View style={styles.popularSection}>
              <Text style={styles.sectionTitle}>Browse by category</Text>
              <View style={styles.categoryGrid}>
                {FILTER_CATEGORIES.slice(1).map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={styles.categoryCard}
                    onPress={() => setActiveFilter(cat.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.categoryIconWrap}>
                      <Ionicons name={cat.icon} size={24} color="#581845" />
                    </View>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Search Header
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  backBtn: {
    padding: 6,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: 0,
  },

  // Filter Chips
  filterChipsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterChipsList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#581845',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Results
  resultsContainer: {
    paddingBottom: 20,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  resultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#444',
    marginBottom: 2,
  },
  resultMeta: {
    fontSize: 12,
    color: '#888',
  },
  connectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },

  // Suggestions
  suggestionsContainer: {
    flex: 1,
  },
  recentSection: {
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  showAllText: {
    fontSize: 14,
    color: '#581845',
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  recentText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },

  suggestionsSection: {
    paddingTop: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },

  // Category Browse
  popularSection: {
    paddingTop: 24,
    paddingBottom: 40,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 48) / 3,
    alignItems: 'center',
    paddingVertical: 16,
    margin: 4,
    backgroundColor: '#f9f5f8',
    borderRadius: 12,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
