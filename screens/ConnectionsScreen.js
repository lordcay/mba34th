// screens/ConnectionsScreen.js
// Screen to view connections and pending sent requests with tabs

import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import {
  getMyConnections,
  getSentRequests,
  cancelConnectionRequest,
  removeConnection,
} from '../services/connection.service';
import OnboardingOverlay from '../components/OnboardingOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND_PURPLE = '#581845';
const BRAND_PURPLE_LIGHT = '#7b2d62';

const FallbackImage = require('../assets/fff.jpg');

const ConnectionsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);
  
  const [activeTab, setActiveTab] = useState('connected'); // 'connected' | 'pending'
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [connectionsData, pendingData] = await Promise.all([
        getMyConnections(),
        getSentRequests(),
      ]);
      
      setConnections(Array.isArray(connectionsData) ? connectionsData : connectionsData.connections || []);
      setPendingRequests(Array.isArray(pendingData) ? pendingData : pendingData.requests || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setConnections([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleCancelRequest = async (targetId) => {
    setProcessingIds(prev => new Set(prev).add(targetId));
    try {
      await cancelConnectionRequest(targetId);
      setPendingRequests(prev => prev.filter(r => {
        const id = r.target?._id || r.target?.id || r.targetUserId || r._id || r.id;
        return id !== targetId;
      }));
    } catch (error) {
      console.error('Failed to cancel request:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetId);
        return newSet;
      });
    }
  };

  const handleViewProfile = (userObj) => {
    navigation.navigate('UserProfile', { user: userObj });
  };

  const handleMessage = (userObj) => {
    navigation.navigate('PrivateChat', { user: userObj });
  };

  const getProfileImage = (u) => {
    const photo = u?.photos?.[0];
    if (!photo) return null;
    return photo.startsWith('http') ? photo : `https://three4th-street-backend.onrender.com${photo}`;
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSchoolName = (email) => {
    if (!email) return '';
    const school = email.split('@')[1]?.split('.')[0] || '';
    return school
      .replace(/[-_]/g, ' ')
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Render connected user card
  const renderConnectionCard = ({ item }) => {
    // Handle both flat user object and nested connectedUser object
    const connectedUser = item.connectedUser || item.user || item;
    const userId = connectedUser._id || connectedUser.id;
    const fullName = `${connectedUser.firstName || ''} ${connectedUser.lastName || ''}`.trim() || 'Unknown';
    const profileImage = getProfileImage(connectedUser);
    const school = getSchoolName(connectedUser.email);
    const profession = connectedUser.program || connectedUser.profession || connectedUser.industry || '';
    const connectedAt = getTimeAgo(item.connectedAt || item.createdAt);

    return (
      <TouchableOpacity 
        style={styles.userCard}
        onPress={() => handleViewProfile(connectedUser)}
        activeOpacity={0.7}
      >
        <Image
          source={profileImage ? { uri: profileImage } : FallbackImage}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
            {connectedUser.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color={BRAND_PURPLE_LIGHT} />
            )}
          </View>
          {profession ? (
            <Text style={styles.userProfession} numberOfLines={1}>{profession}</Text>
          ) : null}
          {school ? (
            <Text style={styles.userSchool} numberOfLines={1}>{school}</Text>
          ) : null}
          <Text style={styles.connectedTime}>Connected {connectedAt}</Text>
        </View>
        <TouchableOpacity 
          style={styles.messageBtn}
          onPress={() => handleMessage(connectedUser)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={20} color={BRAND_PURPLE} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render pending request card (sent by current user)
  const renderPendingCard = ({ item }) => {
    // Handle both flat user object and nested target object
    const targetUser = item.target || item.targetUser || item;
    const targetId = targetUser._id || targetUser.id || item.targetUserId;
    const fullName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || 'Unknown';
    const profileImage = getProfileImage(targetUser);
    const school = getSchoolName(targetUser.email);
    const profession = targetUser.program || targetUser.profession || targetUser.industry || '';
    const sentAt = getTimeAgo(item.createdAt || item.requestedAt);
    const isProcessing = processingIds.has(targetId);

    return (
      <TouchableOpacity 
        style={styles.userCard}
        onPress={() => handleViewProfile(targetUser)}
        activeOpacity={0.7}
      >
        <Image
          source={profileImage ? { uri: profileImage } : FallbackImage}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
            {targetUser.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color={BRAND_PURPLE_LIGHT} />
            )}
          </View>
          {profession ? (
            <Text style={styles.userProfession} numberOfLines={1}>{profession}</Text>
          ) : null}
          {school ? (
            <Text style={styles.userSchool} numberOfLines={1}>{school}</Text>
          ) : null}
          <View style={styles.pendingRow}>
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={12} color="#f5a623" />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
            <Text style={styles.sentTime}>Sent {sentAt}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.cancelBtn, isProcessing && styles.btnDisabled]}
          onPress={() => handleCancelRequest(targetId)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#ff6b6b" />
          ) : (
            <Ionicons name="close" size={18} color="#ff6b6b" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const currentData = activeTab === 'connected' ? connections : pendingRequests;
  const emptyMessage = activeTab === 'connected' 
    ? "You haven't connected with anyone yet.\nStart connecting with members!"
    : "No pending requests.\nConnect with members to grow your network!";

  return (
    <OnboardingOverlay screenName="Connections">
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connections</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'connected' && styles.activeTab]}
          onPress={() => setActiveTab('connected')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'connected' && styles.activeTabText]}>
            Connected
          </Text>
          {connections.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'connected' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === 'connected' && styles.activeTabBadgeText]}>
                {connections.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
          {pendingRequests.length > 0 && (
            <View style={[styles.tabBadge, activeTab === 'pending' && styles.activeTabBadge]}>
              <Text style={[styles.tabBadgeText, activeTab === 'pending' && styles.activeTabBadgeText]}>
                {pendingRequests.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_PURPLE} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, index) => {
            const id = item._id || item.id || item.connectedUser?._id || item.target?._id;
            return id ? String(id) : `item-${index}`;
          }}
          renderItem={activeTab === 'connected' ? renderConnectionCard : renderPendingCard}
          contentContainerStyle={[
            styles.listContent,
            currentData.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={BRAND_PURPLE}
              colors={[BRAND_PURPLE]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons 
                  name={activeTab === 'connected' ? 'people-outline' : 'time-outline'} 
                  size={48} 
                  color={BRAND_PURPLE_LIGHT} 
                />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'connected' ? 'No connections yet' : 'No pending requests'}
              </Text>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
    </OnboardingOverlay>
  );
};

export default ConnectionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  headerRight: {
    width: 40,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeTab: {
    backgroundColor: BRAND_PURPLE,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeTabBadgeText: {
    color: '#fff',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },

  // User Card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    flexShrink: 1,
  },
  userProfession: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  userSchool: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  connectedTime: {
    fontSize: 11,
    color: '#aaa',
  },

  // Pending specific
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f5a623',
  },
  sentTime: {
    fontSize: 11,
    color: '#aaa',
  },

  // Buttons
  messageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(88, 24, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(88, 24, 69, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
