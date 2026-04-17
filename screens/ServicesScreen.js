import React, { useEffect, useState, useContext, useCallback, useReducer, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import serviceService from '../services/service.service';
import { getCurrentLocation } from '../services/location.service';
import Slider from '@react-native-community/slider';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');
const ACCENT = Colors.primary;
const ACCENT_DARK = Colors.primaryDark;
const ACCENT_LIGHT = Colors.primarySoft;

// Haversine distance calculation
const calcDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const SERVICE_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'view-grid', emoji: '🔥' },
  { id: 'consulting', name: 'Consulting', icon: 'briefcase-variant', emoji: '💼' },
  { id: 'tutoring', name: 'Tutoring', icon: 'school', emoji: '📚' },
  { id: 'design', name: 'Design', icon: 'palette', emoji: '🎨' },
  { id: 'tech', name: 'Tech', icon: 'laptop', emoji: '💻' },
  { id: 'fitness', name: 'Fitness', icon: 'dumbbell', emoji: '💪' },
  { id: 'creative', name: 'Creative', icon: 'brush', emoji: '🎭' },
  { id: 'business', name: 'Business', icon: 'chart-line', emoji: '📊' },
  { id: 'trade', name: 'Trade', icon: 'wrench', emoji: '🔧' },
  { id: 'event', name: 'Events', icon: 'party-popper', emoji: '🎉' },
];

const MY_SERVICE_STATUSES = [
  { id: 'all', label: 'All', color: '#6B7280' },
  { id: 'pending', label: 'Pending', color: '#F59E0B' },
  { id: 'approved', label: 'Approved', color: '#10B981' },
  { id: 'updated', label: 'Updated', color: '#3B82F6' },
  { id: 'rejected', label: 'Rejected', color: '#EF4444' },
];

// ==================== STATE REDUCER ====================
const servicesReducer = (state, action) => {
  switch (action.type) {
    case 'SET_BROWSE_SERVICES':
      return { ...state, browseServices: action.payload, browseHasMore: action.hasMore };
    case 'APPEND_BROWSE_SERVICES':
      return { ...state, browseServices: [...state.browseServices, ...action.payload], browseHasMore: action.hasMore };
    case 'SET_MY_SERVICES':
      return { ...state, myServices: action.payload, myHasMore: action.hasMore };
    case 'APPEND_MY_SERVICES':
      return { ...state, myServices: [...state.myServices, ...action.payload], myHasMore: action.hasMore };
    case 'SET_BROWSE_LOADING':
      return { ...state, browseLoading: action.payload };
    case 'SET_MY_LOADING':
      return { ...state, myLoading: action.payload };
    case 'SET_BROWSE_REFRESHING':
      return { ...state, browseRefreshing: action.payload };
    case 'SET_MY_REFRESHING':
      return { ...state, myRefreshing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_BROWSE_PAGE':
      return { ...state, browsePage: action.payload };
    case 'SET_MY_PAGE':
      return { ...state, myPage: action.payload };
    case 'RESET_BROWSE':
      return { ...state, browseServices: [], browsePage: 1, browseLoading: false };
    case 'RESET_MY':
      return { ...state, myServices: [], myPage: 1, myLoading: false };
    default:
      return state;
  }
};

const initialState = {
  browseServices: [],
  myServices: [],
  browsePage: 1,
  myPage: 1,
  browseLoading: false,
  myLoading: false,
  browseRefreshing: false,
  myRefreshing: false,
  browseHasMore: false,
  myHasMore: false,
  error: null,
};

// ==================== FILTER MODAL ====================
const FilterModal = ({ visible, onClose, onApply, currentFilters }) => {
  const [category, setCategory] = useState(currentFilters.category || 'all');
  const [maxPrice, setMaxPrice] = useState(currentFilters.maxPrice || '');
  const [maxDistance, setMaxDistance] = useState(currentFilters.maxDistance || 0);

  const handleApply = () => {
    onApply({
      category: category === 'all' ? undefined : category,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      maxDistance: maxDistance > 0 ? maxDistance : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.filterOverlay}>
        <View style={styles.filterContainer}>
          <View style={styles.filterHandle} />
          <View style={styles.filterHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.filterTitle}>Filters</Text>
            <TouchableOpacity onPress={handleApply}>
              <Text style={styles.filterApplyBtn}>Apply</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Category</Text>
              <View style={styles.filterCategoryGrid}>
                {SERVICE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterCategoryItem,
                      category === cat.id && styles.filterCategoryItemActive,
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text style={styles.filterCategoryEmoji}>{cat.emoji}</Text>
                    <Text
                      style={[
                        styles.filterCategoryLabel,
                        category === cat.id && styles.filterCategoryLabelActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Maximum Budget (USD)</Text>
              <View style={styles.filterInputWrapper}>
                <Text style={styles.filterInputPrefix}>$</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g. 200"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                />
              </View>
            </View>

            {/* Distance Filter (Tinder-style) */}
            <View style={styles.filterSection}>
              <View style={styles.filterDistanceHeader}>
                <Text style={styles.filterSectionTitle}>Distance</Text>
                <View style={styles.filterDistanceBadge}>
                  <Text style={styles.filterDistanceBadgeText}>
                    {maxDistance === 0 ? 'Anywhere' : `${maxDistance} km`}
                  </Text>
                </View>
              </View>
              <View style={styles.filterSliderContainer}>
                <Slider
                  style={styles.filterSlider}
                  minimumValue={0}
                  maximumValue={200}
                  step={5}
                  value={maxDistance}
                  onValueChange={setMaxDistance}
                  minimumTrackTintColor={ACCENT}
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor={ACCENT}
                />
                <View style={styles.filterSliderLabels}>
                  <Text style={styles.filterSliderLabel}>Anywhere</Text>
                  <Text style={styles.filterSliderLabel}>200 km</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.filterResetBtn}
              onPress={() => { setCategory('all'); setMaxPrice(''); setMaxDistance(0); }}
            >
              <Feather name="refresh-cw" size={14} color={Colors.textSecondary} />
              <Text style={styles.filterResetText}>Reset Filters</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ==================== SERVICE CARD (Modern) ====================
const ServiceCard = ({ service, onPress, onEdit, onDelete, showActions = false, userLocation }) => {
  const getStatusConfig = (status) => {
    const map = {
      pending: { color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline', label: 'Pending' },
      approved: { color: '#10B981', bg: '#D1FAE5', icon: 'checkmark-circle', label: 'Approved' },
      updated: { color: '#3B82F6', bg: '#DBEAFE', icon: 'refresh-outline', label: 'Updated' },
      rejected: { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle', label: 'Rejected' },
      suspended: { color: '#6B7280', bg: '#F3F4F6', icon: 'ban', label: 'Suspended' },
    };
    return map[status] || { color: '#6B7280', bg: '#F3F4F6', icon: 'help-circle-outline', label: status };
  };

  const statusConfig = getStatusConfig(service.status);
  const provider = service.provider || {};
  const providerName = [provider.firstName, provider.lastName].filter(Boolean).join(' ') || 'Provider';
  const rating = service.averageRating || 0;
  const reviewCount = service.reviewCount || 0;
  const isVerified = service.status === 'approved';
  const pricing = service.pricing || (service.hourlyRate ? `$${service.hourlyRate}/hr` : service.basePrice ? `$${service.basePrice}` : null);
  const location = service.serviceLocation || [service.city, service.state].filter(Boolean).join(', ') || '';

  const serviceCoords = service.coordinates?.coordinates;
  const distanceKm = userLocation && serviceCoords && serviceCoords[0] !== 0 && serviceCoords[1] !== 0
    ? calcDistance(userLocation.latitude, userLocation.longitude, serviceCoords[1], serviceCoords[0])
    : null;
  const distanceText = distanceKm !== null
    ? `${distanceKm < 1 ? distanceKm.toFixed(1) : Math.round(distanceKm)} km away`
    : 'Distance N/A';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[ACCENT, '#4A2080', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradientHeader}
      >
        <MaterialCommunityIcons name="briefcase-outline" size={36} color="rgba(255,255,255,0.85)" />
        {showActions && (
          <View style={[styles.cardStatusChip, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={10} color={statusConfig.color} />
            <Text style={[styles.cardStatusChipText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Card Body */}
      <View style={styles.cardBody}>
        {/* Title Row */}
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>{service.title}</Text>
          {isVerified && !showActions && (
            <View style={styles.cardVerifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={ACCENT} />
              <Text style={styles.cardVerifiedText}>Verified</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <Text style={styles.cardDescription} numberOfLines={2}>{service.description}</Text>

        {/* Provider */}
        <Text style={styles.cardProvider}>By {providerName}</Text>

        {/* Location */}
        {location ? (
          <View style={styles.cardLocationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.cardLocationText} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}

        {/* Rating */}
        <View style={styles.cardRatingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.round(rating) ? 'star' : 'star-outline'}
              size={14}
              color={star <= Math.round(rating) ? ACCENT : '#D1D5DB'}
            />
          ))}
          {rating > 0 && (
            <Text style={styles.cardRatingValue}>{rating.toFixed(1)}</Text>
          )}
          <Text style={styles.cardRatingCount}>
            {reviewCount > 0 ? `(${reviewCount})` : 'No ratings'}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Bottom: Pricing + Distance */}
        <View style={styles.cardFooterRow}>
          {pricing ? (
            <Text style={styles.cardPricing}>{pricing}</Text>
          ) : (
            <Text style={styles.cardPricingMuted}>Contact for pricing</Text>
          )}
          <View style={styles.cardDistanceRow}>
            <Ionicons name="location" size={13} color={ACCENT} />
            <Text style={styles.cardDistanceText}>{distanceText}</Text>
          </View>
        </View>
      </View>

      {/* Rejection Reason */}
      {showActions && service.status === 'rejected' && service.rejectionReason && (
        <View style={styles.cardRejectionBox}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.cardRejectionText} numberOfLines={2}>{service.rejectionReason}</Text>
        </View>
      )}

      {/* Owner Action Buttons */}
      {showActions && (
        <View style={styles.cardActionsRow}>
          <TouchableOpacity style={styles.cardEditBtn} onPress={() => onEdit(service)} activeOpacity={0.7}>
            <Feather name="edit-2" size={14} color={ACCENT_DARK} />
            <Text style={styles.cardEditText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardDeleteBtn} onPress={() => onDelete(service._id)} activeOpacity={0.7}>
            <Feather name="trash-2" size={14} color="#DC2626" />
            <Text style={styles.cardDeleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ==================== MAIN COMPONENT ====================
const ServicesScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const [servicesState, dispatch] = useReducer(servicesReducer, initialState);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMyStatus, setSelectedMyStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});
  const [userLocation, setUserLocation] = useState(null);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      try {
        const loc = await getCurrentLocation();
        if (loc) setUserLocation({ latitude: loc.latitude, longitude: loc.longitude });
      } catch (e) {
        console.warn('Could not get user location:', e);
      }
    })();
  }, []);

  // ==================== FETCH METHODS ====================

  const fetchBrowseServices = useCallback(async (page = 1, isRefresh = false) => {
    if (isRefresh) {
      dispatch({ type: 'SET_BROWSE_REFRESHING', payload: true });
    } else if (page === 1) {
      dispatch({ type: 'SET_BROWSE_LOADING', payload: true });
    }

    try {
      const filters = { ...currentFilters };
      if (selectedCategory !== 'all') filters.category = selectedCategory;

      const result = await serviceService.getApprovedServices(page, 15, filters);

      if (result.success) {
        if (page === 1) {
          dispatch({ type: 'SET_BROWSE_SERVICES', payload: result.data, hasMore: result.pagination?.hasNext });
        } else {
          dispatch({ type: 'APPEND_BROWSE_SERVICES', payload: result.data, hasMore: result.pagination?.hasNext });
        }
        dispatch({ type: 'SET_BROWSE_PAGE', payload: page });
      }
    } catch (error) {
      console.error('Error fetching browse services:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load services' });
    } finally {
      dispatch({ type: 'SET_BROWSE_LOADING', payload: false });
      dispatch({ type: 'SET_BROWSE_REFRESHING', payload: false });
    }
  }, [selectedCategory, currentFilters]);

  const fetchMyServices = useCallback(async (page = 1, isRefresh = false) => {
    if (isRefresh) {
      dispatch({ type: 'SET_MY_REFRESHING', payload: true });
    } else if (page === 1) {
      dispatch({ type: 'SET_MY_LOADING', payload: true });
    }

    try {
      const status = selectedMyStatus === 'all' ? undefined : selectedMyStatus;
      const result = await serviceService.getMyServices(page, 15, status);

      if (result.success) {
        if (page === 1) {
          dispatch({ type: 'SET_MY_SERVICES', payload: result.data, hasMore: result.pagination?.hasNext });
        } else {
          dispatch({ type: 'APPEND_MY_SERVICES', payload: result.data, hasMore: result.pagination?.hasNext });
        }
        dispatch({ type: 'SET_MY_PAGE', payload: page });
      }
    } catch (error) {
      console.error('Error fetching my services:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load your services' });
    } finally {
      dispatch({ type: 'SET_MY_LOADING', payload: false });
      dispatch({ type: 'SET_MY_REFRESHING', payload: false });
    }
  }, [selectedMyStatus]);

  // ==================== EFFECTS ====================

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'RESET_BROWSE' });
      fetchBrowseServices(1);
    }, [selectedCategory, currentFilters])
  );

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'dashboard') {
        dispatch({ type: 'RESET_MY' });
        fetchMyServices(1);
      }
    }, [activeTab, selectedMyStatus])
  );

  // ==================== HANDLERS ====================

  const handleDeleteService = (serviceId) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const result = await serviceService.deleteService(serviceId);
              if (result.success) {
                Alert.alert('Success', 'Service deleted');
                fetchMyServices(1, true);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete service');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleEditService = (service) => {
    navigation.navigate('CreateService', { service });
  };

  const handleApplyFilters = (filters) => {
    setCurrentFilters(filters);
    dispatch({ type: 'RESET_BROWSE' });
  };

  // Client-side distance filtering
  const filteredBrowseServices = useMemo(() => {
    const maxDist = currentFilters.maxDistance;
    if (!maxDist || !userLocation) return servicesState.browseServices;

    return servicesState.browseServices.filter((service) => {
      const coords = service.coordinates?.coordinates;
      if (!coords || (coords[0] === 0 && coords[1] === 0)) return false;
      const dist = calcDistance(userLocation.latitude, userLocation.longitude, coords[1], coords[0]);
      return dist !== null && dist <= maxDist;
    });
  }, [servicesState.browseServices, currentFilters.maxDistance, userLocation]);

  // ==================== RENDER BROWSE SECTION ====================
  const renderBrowseHeader = () => (
    <View style={styles.browseHeaderContainer}>
      <LinearGradient
        colors={[ACCENT, ACCENT_DARK, '#2A0A1F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Discover Services</Text>
          <Text style={styles.heroSubtitle}>Find the perfect service provider for your needs</Text>
        </View>
        <View style={styles.heroIconContainer}>
          <MaterialCommunityIcons name="briefcase-search" size={48} color="rgba(255,255,255,0.2)" />
        </View>
      </LinearGradient>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, skills..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setFilterVisible(true)}>
            <Feather name="sliders" size={18} color={ACCENT_DARK} />
            {currentFilters.maxDistance > 0 && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {SERVICE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(cat.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryPillEmoji}>{cat.emoji}</Text>
            <Text style={[styles.categoryPillText, selectedCategory === cat.id && styles.categoryPillTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderBrowseServices = () => (
    <FlatList
      data={filteredBrowseServices}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <ServiceCard service={item} userLocation={userLocation} onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id })} />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={servicesState.browseRefreshing} onRefresh={() => fetchBrowseServices(1, true)} tintColor={ACCENT} colors={[ACCENT]} />}
      onEndReached={() => {
        if (!servicesState.browseLoading && servicesState.browseHasMore) fetchBrowseServices(servicesState.browsePage + 1);
      }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        !servicesState.browseLoading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={56} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Services Found</Text>
            <Text style={styles.emptySubtitle}>
              {currentFilters.maxDistance > 0
                ? `No services within ${currentFilters.maxDistance} km. Try increasing the distance.`
                : selectedCategory !== 'all'
                ? 'Try a different category or clear your filters'
                : 'Check back later for new services'}
            </Text>
          </View>
        ) : null
      }
      ListHeaderComponent={renderBrowseHeader}
      ListFooterComponent={
        servicesState.browseLoading && servicesState.browseServices.length > 0 ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 20 }} />
        ) : null
      }
    />
  );

  // ==================== RENDER DASHBOARD SECTION ====================
  const renderDashboardHeader = () => (
    <View style={styles.dashboardHeaderContainer}>
      <View style={styles.dashboardTopRow}>
        <View>
          <Text style={styles.dashboardTitle}>My Services</Text>
          <Text style={styles.dashboardSubtitle}>
            {servicesState.myServices.length} service{servicesState.myServices.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.createFab} onPress={() => navigation.navigate('CreateService')} activeOpacity={0.8}>
          <LinearGradient colors={[ACCENT, ACCENT_DARK]} style={styles.createFabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScrollContent}>
        {MY_SERVICE_STATUSES.map((status) => {
          const isActive = selectedMyStatus === status.id;
          return (
            <TouchableOpacity
              key={status.id}
              style={[styles.statusPill, isActive && { backgroundColor: status.color }]}
              onPress={() => setSelectedMyStatus(status.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.statusPillText, isActive && styles.statusPillTextActive]}>{status.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderDashboardServices = () => (
    <FlatList
      data={servicesState.myServices}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <ServiceCard
          service={item}
          showActions
          userLocation={userLocation}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
          onPress={() => navigation.navigate('ServiceDetail', { service: item })}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={servicesState.myRefreshing} onRefresh={() => fetchMyServices(1, true)} tintColor={ACCENT} colors={[ACCENT]} />}
      onEndReached={() => {
        if (!servicesState.myLoading && servicesState.myHasMore) fetchMyServices(servicesState.myPage + 1);
      }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        !servicesState.myLoading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <MaterialCommunityIcons name="plus-circle-outline" size={56} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedMyStatus === 'all' ? 'No Services Yet' : `No ${selectedMyStatus} services`}
            </Text>
            <Text style={styles.emptySubtitle}>Create your first service and start earning</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => navigation.navigate('CreateService')} activeOpacity={0.8}>
              <LinearGradient colors={[ACCENT, ACCENT_DARK]} style={styles.emptyCreateGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyCreateText}>Create Service</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : null
      }
      ListHeaderComponent={renderDashboardHeader}
      ListFooterComponent={
        servicesState.myLoading && servicesState.myServices.length > 0 ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 20 }} />
        ) : null
      }
    />
  );

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'browse' && styles.tabActive]} onPress={() => setActiveTab('browse')} activeOpacity={0.7}>
          <Feather name="compass" size={18} color={activeTab === 'browse' ? ACCENT_DARK : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'browse' && styles.tabTextActive]}>Browse</Text>
          {activeTab === 'browse' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]} onPress={() => setActiveTab('dashboard')} activeOpacity={0.7}>
          <Feather name="briefcase" size={18} color={activeTab === 'dashboard' ? ACCENT_DARK : Colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>My Services</Text>
          {activeTab === 'dashboard' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {activeTab === 'browse' ? renderBrowseServices() : renderDashboardServices()}

      <FilterModal visible={filterVisible} onClose={() => setFilterVisible(false)} onApply={handleApplyFilters} currentFilters={currentFilters} />

      {servicesState.error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#fff" />
          <Text style={styles.errorText}>{servicesState.error}</Text>
          <TouchableOpacity onPress={() => dispatch({ type: 'SET_ERROR', payload: null })}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ServicesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, position: 'relative' },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: ACCENT_DARK, fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 3, backgroundColor: ACCENT, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  browseHeaderContainer: { marginBottom: 8 },
  heroBanner: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 24, flexDirection: 'row', overflow: 'hidden' },
  heroContent: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  heroIconContainer: { justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  searchWrapper: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1.5, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 2 } }) },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, marginHorizontal: 10 },
  filterIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: ACCENT_LIGHT, justifyContent: 'center', alignItems: 'center' },
  categoryScrollContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1.5, borderColor: '#F3F4F6' },
  categoryPillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  categoryPillEmoji: { fontSize: 14 },
  categoryPillText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  categoryPillTextActive: { color: '#fff' },
  dashboardHeaderContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  dashboardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dashboardTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  dashboardSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  createFab: { borderRadius: 14, overflow: 'hidden', ...Platform.select({ ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }) },
  createFabGradient: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statusScrollContent: { gap: 8, paddingBottom: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  statusPillText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  statusPillTextActive: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 }, android: { elevation: 3 } }) },
  cardGradientHeader: { paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  cardStatusChip: { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardStatusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  cardBody: { padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3, lineHeight: 22, flex: 1 },
  cardVerifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT_LIGHT, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardVerifiedText: { fontSize: 10, fontWeight: '700', color: ACCENT_DARK },
  cardDescription: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 8 },
  cardProvider: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  cardLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  cardLocationText: { fontSize: 12, color: Colors.textSecondary, flex: 1 },
  cardRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 12 },
  cardRatingValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginLeft: 4 },
  cardRatingCount: { fontSize: 12, color: Colors.textSecondary },
  cardDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPricing: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardPricingMuted: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  cardDistanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardDistanceText: { fontSize: 12, fontWeight: '600', color: ACCENT_DARK },
  cardRejectionBox: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  cardRejectionText: { flex: 1, fontSize: 12, color: '#991B1B', lineHeight: 17 },
  cardActionsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cardEditBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: ACCENT_LIGHT },
  cardEditText: { fontSize: 13, fontWeight: '600', color: ACCENT_DARK },
  cardDeleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FEF2F2' },
  cardDeleteText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrapper: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyCreateBtn: { marginTop: 24, borderRadius: 12, overflow: 'hidden' },
  emptyCreateGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  emptyCreateText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  filterOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  filterContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' },
  filterHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  filterApplyBtn: { fontSize: 15, fontWeight: '700', color: ACCENT_DARK },
  filterContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  filterSection: { marginBottom: 28 },
  filterSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  filterCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterCategoryItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1.5, borderColor: '#F3F4F6' },
  filterCategoryItemActive: { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT },
  filterCategoryEmoji: { fontSize: 16 },
  filterCategoryLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterCategoryLabelActive: { color: ACCENT_DARK, fontWeight: '700' },
  filterInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1.5, borderColor: '#F3F4F6', paddingHorizontal: 14, height: 48 },
  filterInputPrefix: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary, marginRight: 4 },
  filterInput: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  filterResetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  filterResetText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  // Distance slider styles
  filterDistanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  filterDistanceBadge: { backgroundColor: ACCENT_LIGHT, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  filterDistanceBadgeText: { fontSize: 13, fontWeight: '700', color: ACCENT_DARK },
  filterSliderContainer: { paddingHorizontal: 4 },
  filterSlider: { width: '100%', height: 40 },
  filterSliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  filterSliderLabel: { fontSize: 11, color: Colors.textMuted },
  // Active filter indicator
  filterActiveDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  errorBanner: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#DC2626', borderRadius: 14, ...Platform.select({ ios: { shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 8 } }) },
  errorText: { flex: 1, fontSize: 13, color: '#fff', fontWeight: '600' },
});
