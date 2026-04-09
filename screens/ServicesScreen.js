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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import serviceService from '../services/service.service';
import Colors from '../constants/Colors';
import { navigate } from '../navigation/RootNavigation';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const ACCENT = Colors.primary || '#581845';

const SERVICE_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid' },
  { id: 'consulting', name: 'Consulting', icon: 'briefcase' },
  { id: 'tutoring', name: 'Tutoring', icon: 'school' },
  { id: 'design', name: 'Design', icon: 'palette' },
  { id: 'tech', name: 'Tech', icon: 'laptop' },
  { id: 'fitness', name: 'Fitness', icon: 'dumbbell' },
  { id: 'creative', name: 'Creative', icon: 'palette' },
  { id: 'business', name: 'Business', icon: 'trending-up' },
];

const TAB_SECTIONS = [
  { id: 'browse', label: 'Browse Services', icon: 'storefront', library: 'material' },
  { id: 'dashboard', label: 'My Dashboard', icon: 'briefcase', library: 'material' },
];

const MY_SERVICE_STATUSES = [
  { id: 'all', label: 'All', color: '#666' },
  { id: 'pending', label: 'Pending', color: '#F59E0B' },
  { id: 'approved', label: 'Approved', color: '#10B981' },
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

  const handleApply = () => {
    onApply({
      category: category === 'all' ? undefined : category,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.filterContainer}>
        <View style={styles.filterHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.filterTitle}>Filters</Text>
          <TouchableOpacity onPress={handleApply}>
            <Text style={styles.filterApplyBtn}>Apply</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SERVICE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={16}
                    color={category === cat.id ? '#fff' : Colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Max Price (USD)</Text>
            <TextInput
              style={styles.filterInput}
              placeholder="e.g., 100"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              value={maxPrice}
              onChangeText={setMaxPrice}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== SERVICE CARD ====================
const ServiceCard = ({ service, onPress, onEdit, onDelete, showActions = false }) => {
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { color: '#F59E0B', icon: 'clock-outline' },
      approved: { color: '#10B981', icon: 'checkmark-circle' },
      rejected: { color: '#EF4444', icon: 'close-circle' },
    };
    return statusMap[status] || { color: '#666', icon: 'help-circle-outline' };
  };

  const statusInfo = getStatusInfo(service.status);

  return (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleSection}>
          <Text style={styles.serviceTitle} numberOfLines={2}>
            {service.title}
          </Text>
          {showActions && (
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Ionicons name={statusInfo.icon} size={12} color="#fff" />
              <Text style={styles.statusText}>{service.status}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {service.description}
      </Text>

      <View style={styles.cardFooter}>
        <View>
          {service.hourlyRate && (
            <Text style={styles.price}>${service.hourlyRate}/hr</Text>
          )}
          {service.basePrice && (
            <Text style={styles.price}>${service.basePrice}</Text>
          )}
        </View>
        <View style={styles.location}>
          <Ionicons name="location" size={12} color={Colors.textSecondary} />
          <Text style={styles.locationText}>{service.city}</Text>
        </View>
      </View>

      {showActions && service.status === 'rejected' && service.rejectionReason && (
        <View style={styles.rejectionBox}>
          <Ionicons name="warning" size={12} color="#EF4444" />
          <Text style={styles.rejectionText} numberOfLines={1}>{service.rejectionReason}</Text>
        </View>
      )}

      {showActions && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => onEdit(service)}
          >
            <Ionicons name="pencil" size={14} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => onDelete(service._id)}
          >
            <Ionicons name="trash" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ==================== MAIN COMPONENT ====================
const ServicesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  const [servicesState, dispatch] = useReducer(servicesReducer, initialState);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMyStatus, setSelectedMyStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [currentFilters, setCurrentFilters] = useState({});

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
    fetchBrowseServices(1);
  };

  // ==================== RENDER BROWSE SECTION ====================

  const renderBrowseHeader = () => (
    <View style={styles.browseHeader}>
      <Text style={styles.sectionSubtitle}>Discover Services</Text>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={() => setFilterVisible(true)}>
          <Ionicons name="filter" size={20} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTabs}
      >
        {SERVICE_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryTab,
              selectedCategory === cat.id && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <MaterialCommunityIcons
              name={cat.icon}
              size={16}
              color={selectedCategory === cat.id ? '#fff' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === cat.id && styles.categoryTabTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderBrowseServices = () => (
    <FlatList
      data={servicesState.browseServices}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <ServiceCard
          service={item}
          onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id })}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={servicesState.browseRefreshing}
          onRefresh={() => fetchBrowseServices(1, true)}
        />
      }
      onEndReached={() => {
        if (!servicesState.browseLoading && servicesState.browseHasMore) {
          fetchBrowseServices(servicesState.browsePage + 1);
        }
      }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        !servicesState.browseLoading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="briefcase-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No services available</Text>
          </View>
        ) : null
      }
      ListHeaderComponent={renderBrowseHeader}
      ListFooterComponent={
        servicesState.browseLoading && servicesState.browseServices.length > 0 ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 16 }} />
        ) : null
      }
    />
  );

  // ==================== RENDER DASHBOARD SECTION ====================

  const renderDashboardHeader = () => (
    <View style={styles.dashboardHeader}>
      <View style={styles.dashboardTitleRow}>
        <Text style={styles.sectionSubtitle}>Your Services</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateService')}
        >
          <LinearGradient
            colors={[ACCENT, '#900C3F']}
            style={styles.createBtnGradient}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusTabs}
      >
        {MY_SERVICE_STATUSES.map((status) => (
          <TouchableOpacity
            key={status.id}
            style={[
              styles.statusTab,
              selectedMyStatus === status.id && styles.statusTabActive,
            ]}
            onPress={() => setSelectedMyStatus(status.id)}
          >
            <Text
              style={[
                styles.statusTabText,
                selectedMyStatus === status.id && styles.statusTabTextActive,
              ]}
            >
              {status.label}
            </Text>
          </TouchableOpacity>
        ))}
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
          showActions={true}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
          onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id })}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={servicesState.myRefreshing}
          onRefresh={() => fetchMyServices(1, true)}
        />
      }
      onEndReached={() => {
        if (!servicesState.myLoading && servicesState.myHasMore) {
          fetchMyServices(servicesState.myPage + 1);
        }
      }}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        !servicesState.myLoading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="briefcase-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {selectedMyStatus === 'all' ? 'No services yet' : `No ${selectedMyStatus} services`}
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => navigation.navigate('CreateService')}
            >
              <Text style={styles.emptyCreateBtnText}>Create Service</Text>
            </TouchableOpacity>
          </View>
        ) : null
      }
      ListHeaderComponent={renderDashboardHeader}
      ListFooterComponent={
        servicesState.myLoading && servicesState.myServices.length > 0 ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 16 }} />
        ) : null
      }
    />
  );

  // ==================== MAIN RENDER ====================

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['top']}>
      {/* Header with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Tab Navigation */}
      <View style={styles.mainTabBar}>
        {TAB_SECTIONS.map((tab) => {
          const IconComponent = tab.library === 'material' ? MaterialCommunityIcons : Ionicons;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.mainTab,
                activeTab === tab.id && styles.mainTabActive,
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <IconComponent
                name={tab.icon}
                size={20}
                color={activeTab === tab.id ? '#fff' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.mainTabText,
                  activeTab === tab.id && styles.mainTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {activeTab === 'browse' ? renderBrowseServices() : renderDashboardServices()}

      {/* Filter Modal */}
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
        currentFilters={currentFilters}
      />

      {/* Error Banner */}
      {servicesState.error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#fff" />
          <Text style={styles.errorText}>{servicesState.error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ServicesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#f8f7f5',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  backBtn: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  mainTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    padding: 8,
    gap: 8,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  mainTabActive: {
    backgroundColor: ACCENT,
  },
  mainTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  mainTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Browse Section Styles
  browseHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    marginHorizontal: 8,
  },
  categoryTabs: {
    paddingBottom: 8,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  categoryTabActive: {
    backgroundColor: ACCENT,
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryTabTextActive: {
    color: '#fff',
  },

  // Dashboard Section Styles
  dashboardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  dashboardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  createBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  createBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTabs: {
    gap: 8,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  statusTabActive: {
    backgroundColor: ACCENT,
    borderBottomColor: ACCENT,
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  statusTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Service Card Styles
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardHeader: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleSection: {
    marginBottom: 6,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  description: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 16,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  rejectionBox: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  rejectionText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#3B82F6',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },

  // List Styles
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptyCreateBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: ACCENT,
    borderRadius: 8,
  },
  emptyCreateBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },

  // Filter Styles
  filterContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    backgroundColor: '#fff',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  filterApplyBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: ACCENT,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  filterInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.text,
  },

  // Error Styles
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});
