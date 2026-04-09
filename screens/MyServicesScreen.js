import React, { useEffect, useState, useContext, useCallback, useMemo, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import serviceService from '../services/service.service';
import Colors from '../constants/Colors';

const FallbackImage = require('../assets/icon.png');

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;
const ACCENT = Colors.primary || '#581845';

const SERVICE_STATUSES = [
  { id: 'all', label: 'All Services', color: '#666' },
  { id: 'pending', label: 'Pending', color: '#F59E0B' },
  { id: 'approved', label: 'Approved', color: '#10B981' },
  { id: 'rejected', label: 'Rejected', color: '#EF4444' },
];

// ==================== STATE REDUCER ====================
const servicesReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SERVICES':
      return { ...state, services: action.payload, hasMore: action.hasMore || false };
    case 'APPEND_SERVICES':
      return { ...state, services: [...state.services, ...action.payload], hasMore: action.hasMore || false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'RESET':
      return { services: [], page: 1, loading: false, refreshing: false, error: null, hasMore: false };
    default:
      return state;
  }
};

const initialState = {
  services: [],
  page: 1,
  loading: false,
  refreshing: false,
  error: null,
  hasMore: false,
};

// ==================== MAIN COMPONENT ====================
const MyServicesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  
  const [servicesState, dispatch] = useReducer(servicesReducer, initialState);
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Fetch services
  const fetchServices = useCallback(async (page = 1, isRefresh = false) => {
    if (isRefresh) {
      dispatch({ type: 'SET_REFRESHING', payload: true });
    } else {
      dispatch({ type: 'SET_LOADING', payload: true });
    }

    try {
      const status = selectedStatus === 'all' ? undefined : selectedStatus;
      const result = await serviceService.getMyServices(page, 15, status);

      if (result.success) {
        if (page === 1) {
          dispatch({ type: 'SET_SERVICES', payload: result.data, hasMore: result.pagination?.hasNext || false });
        } else {
          dispatch({ type: 'APPEND_SERVICES', payload: result.data, hasMore: result.pagination?.hasNext || false });
        }
        dispatch({ type: 'SET_PAGE', payload: page });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error });
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch services' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, [selectedStatus]);

  // Fetch on mount and when status changes
  useFocusEffect(
    useCallback(() => {
      dispatch({ type: 'RESET' });
      fetchServices(1, false);
    }, [selectedStatus])
  );

  // Handle status tab change
  const handleStatusChange = (status) => {
    setSelectedStatus(status);
  };

  // Handle refresh
  const handleRefresh = () => {
    dispatch({ type: 'RESET' });
    fetchServices(1, true);
  };

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!servicesState.loading && servicesState.hasMore) {
      fetchServices(servicesState.page + 1, false);
    }
  }, [servicesState.page, servicesState.loading, servicesState.hasMore, fetchServices]);

  // Handle edit service
  const handleEditService = (service) => {
    navigation.navigate('CreateService', { service });
  };

  // Handle delete service
  const handleDeleteService = (serviceId) => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const result = await serviceService.deleteService(serviceId);
              if (result.success) {
                Alert.alert('Success', 'Service deleted successfully');
                handleRefresh();
              } else {
                Alert.alert('Error', result.error);
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

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'approved':
        return '#10B981';
      case 'rejected':
        return '#EF4444';
      default:
        return '#666';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'approved':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      default:
        return 'information';
    }
  };

  // Render service card
  const renderServiceCard = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleSection}>
          <Text style={styles.serviceTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Ionicons name={getStatusIcon(item.status)} size={14} color="#fff" />
            <Text style={styles.statusText}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
          </View>
        </View>
        <Text style={styles.category}>{item.category}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.priceSection}>
          {item.hourlyRate && (
            <Text style={styles.price}>${item.hourlyRate}/hr</Text>
          )}
          {item.basePrice && (
            <Text style={styles.price}>${item.basePrice}</Text>
          )}
        </View>
        <View style={styles.locationSection}>
          <Ionicons name="location" size={12} color={Colors.textSecondary} />
          <Text style={styles.location}>{item.city}, {item.state}</Text>
        </View>
      </View>

      {item.status === 'rejected' && item.rejectionReason && (
        <View style={styles.rejectionBox}>
          <Ionicons name="warning" size={14} color="#EF4444" />
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => handleEditService(item)}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteService(item._id)}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Delete</Text>
        </TouchableOpacity>

        {item.status !== 'approved' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.infoBtn]}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: item._id })}
          >
            <Ionicons name="information" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>View</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  // Status tabs
  const renderStatusTabs = () => (
    <View style={styles.tabsContainer}>
      <FlatList
        data={SERVICE_STATUSES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.tab,
              selectedStatus === item.id && [styles.tabActive, { borderBottomColor: ACCENT }]
            ]}
            onPress={() => handleStatusChange(item.id)}
          >
            <Text
              style={[
                styles.tabText,
                selectedStatus === item.id && styles.tabTextActive
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled
      />
    </View>
  );

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="briefcase-outline" size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>
        {selectedStatus === 'all' ? 'No Services Yet' : `No ${selectedStatus} Services`}
      </Text>
      <Text style={styles.emptyText}>
        {selectedStatus === 'all'
          ? 'Create your first service to get started'
          : `You don't have any ${selectedStatus} services yet`}
      </Text>
      {selectedStatus === 'all' && (
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateService')}
        >
          <Text style={styles.createBtnText}>Create Service</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (servicesState.loading && servicesState.services.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity
          style={styles.createHeaderBtn}
          onPress={() => navigation.navigate('CreateService')}
        >
          <LinearGradient
            colors={[ACCENT, '#900C3F']}
            style={styles.createHeaderBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="add" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      {renderStatusTabs()}

      {/* Services List */}
      <FlatList
        data={servicesState.services}
        keyExtractor={(item) => item._id}
        renderItem={renderServiceCard}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={servicesState.refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={!servicesState.loading ? renderEmptyState() : null}
        ListFooterComponent={
          servicesState.loading && servicesState.services.length > 0 ? (
            <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 16 }} />
          ) : null
        }
      />

      {/* Error message */}
      {servicesState.error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#fff" />
          <Text style={styles.errorText}>{servicesState.error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#f8f7f5',
  },
  header: {
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
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  createHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  createHeaderBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: ACCENT,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  titleSection: {
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  category: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
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
  priceSection: {
    flex: 1,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  rejectionBox: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  rejectionText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: '#3B82F6',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  infoBtn: {
    backgroundColor: ACCENT,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  createBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: ACCENT,
    borderRadius: 8,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});

export default MyServicesScreen;
