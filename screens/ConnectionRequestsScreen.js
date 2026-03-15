// screens/ConnectionRequestsScreen.js
// Screen to view and manage incoming connection requests

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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import {
  getPendingRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
} from '../services/connection.service';

const FallbackImage = require('../assets/fff.jpg');

const ConnectionRequestsScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getPendingRequests();
      setRequests(Array.isArray(data) ? data : data.requests || []);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      // For demo, show empty state
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests(true);
  };

  const handleAccept = async (requesterId, requesterName) => {
    setProcessingIds(prev => new Set(prev).add(requesterId));
    try {
      await acceptConnectionRequest(requesterId);
      // Remove from list
      setRequests(prev => prev.filter(r => (r.requester?._id || r.requester?.id || r._id || r.id) !== requesterId));
      Alert.alert(
        'Connected!',
        `You are now connected with ${requesterName}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to accept connection. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requesterId);
        return newSet;
      });
    }
  };

  const handleDecline = (requesterId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this connection request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingIds(prev => new Set(prev).add(requesterId));
            try {
              await declineConnectionRequest(requesterId);
              setRequests(prev => prev.filter(r => (r.requester?._id || r.requester?.id || r._id || r.id) !== requesterId));
            } catch (error) {
              Alert.alert('Error', 'Failed to decline connection. Please try again.');
            } finally {
              setProcessingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(requesterId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  const handleViewProfile = (requester) => {
    navigation.navigate('UserProfile', { user: requester });
  };

  const getProfileImage = (u) => {
    const photo = u?.photos?.[0];
    if (!photo) return null;
    return photo.startsWith('http') ? photo : `http://192.168.100.4:4000${photo}`;
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

  const renderRequest = ({ item }) => {
    // Handle both flat user object and nested requester object
    const requester = item.requester || item;
    const requesterId = requester._id || requester.id;
    const fullName = `${requester.firstName || ''} ${requester.lastName || ''}`.trim() || 'Unknown';
    const profileImage = getProfileImage(requester);
    const isProcessing = processingIds.has(requesterId);
    const timeAgo = getTimeAgo(item.createdAt || item.requestedAt);

    const schoolName = requester.email
      ?.split('@')[1]
      ?.split('.')[0]
      ?.replace(/-/g, ' ')
      ?.replace(/\b\w/g, (c) => c.toUpperCase()) || '';

    return (
      <View style={styles.requestCard}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => handleViewProfile(requester)}
          activeOpacity={0.7}
        >
          <Image
            source={profileImage ? { uri: profileImage } : FallbackImage}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{fullName}</Text>
            {schoolName ? (
              <Text style={styles.userSchool}>{schoolName.toUpperCase()}</Text>
            ) : null}
            {requester.industry ? (
              <Text style={styles.userIndustry}>{requester.industry}</Text>
            ) : null}
            {timeAgo ? <Text style={styles.timeAgo}>{timeAgo}</Text> : null}
          </View>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleAccept(requesterId, fullName)}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.acceptBtnText}>Accept</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={() => handleDecline(requesterId)}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color="#666" />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connection Requests</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#581845" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Connection Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Requests Count */}
      {requests.length > 0 && (
        <View style={styles.countBar}>
          <Ionicons name="people-outline" size={18} color="#581845" />
          <Text style={styles.countText}>
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Requests List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.requester?._id || item.requester?.id || item._id || item.id)}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#581845']}
            tintColor="#581845"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyText}>
              When someone wants to connect with you, their request will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default ConnectionRequestsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f7eef5',
    gap: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#581845',
  },
  listContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f0f0f0',
  },
  userDetails: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  userSchool: {
    fontSize: 12,
    fontWeight: '600',
    color: '#581845',
    marginBottom: 2,
  },
  userIndustry: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  acceptBtn: {
    backgroundColor: '#581845',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  declineBtn: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  declineBtnText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
});
