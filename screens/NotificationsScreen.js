// screens/NotificationsScreen.js
// LinkedIn-style Notifications Screen showing all app notifications

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { socket } from '../socket';
import {
  getPendingRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
} from '../services/connection.service';
import { playPing } from '../utils/notify';

const FallbackImage = require('../assets/fff.jpg');

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingIds, setProcessingIds] = useState(new Set());

  // Fetch all notifications
  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch connection requests
      const connectionData = await getPendingRequests();
      const connectionRequests = (connectionData?.requests || []).map(req => ({
        id: req.id || req._id,
        type: 'connection_request',
        user: req.requester,
        message: 'wants to connect with you',
        timestamp: req.requestedAt || req.createdAt,
        data: req,
      }));

      // Combine all notification types (can add more later like mentions, likes, etc.)
      const allNotifications = [
        ...connectionRequests,
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch on focus
  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  // Listen for real-time notifications
  useEffect(() => {
    const handleNewConnectionRequest = (data) => {
      console.log('📩 New connection request in notifications:', data);
      
      // 🔴 Prevent duplicates: Check if this request already exists
      setNotifications(prev => {
        const existingIndex = prev.findIndex(
          n => n.type === 'connection_request' && 
               (n.user?._id === data.requesterId || n.user?.id === data.requesterId)
        );
        
        const newNotification = {
          id: data.connectionId || `conn-${Date.now()}`,
          type: 'connection_request',
          user: {
            _id: data.requesterId,
            firstName: data.requesterName?.split(' ')[0] || 'Someone',
            lastName: data.requesterName?.split(' ').slice(1).join(' ') || '',
          },
          message: 'wants to connect with you',
          timestamp: data.timestamp || new Date().toISOString(),
          data: data,
        };
        
        if (existingIndex >= 0) {
          // Replace the existing notification (update timestamp)
          const updated = [...prev];
          updated[existingIndex] = newNotification;
          // Move to top by removing and adding to front
          updated.splice(existingIndex, 1);
          return [newNotification, ...updated];
        }
        
        // Add new notification to top
        return [newNotification, ...prev];
      });
    };

    // 🔴 NEW: Handle cancelled connection requests - remove from notifications
    const handleConnectionCancelled = (data) => {
      console.log('🚫 Connection request cancelled:', data);
      // Remove the notification from this requester
      setNotifications(prev => 
        prev.filter(n => 
          !(n.type === 'connection_request' && 
            (n.user?._id === data.requesterId || n.user?.id === data.requesterId))
        )
      );
    };

    socket.on('connection:request', handleNewConnectionRequest);
    socket.on('connection:cancelled', handleConnectionCancelled);

    return () => {
      socket.off('connection:request', handleNewConnectionRequest);
      socket.off('connection:cancelled', handleConnectionCancelled);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const handleAccept = async (notification) => {
    const requesterId = notification.user?._id || notification.user?.id;
    if (!requesterId) return;

    setProcessingIds(prev => new Set(prev).add(notification.id));
    try {
      await acceptConnectionRequest(requesterId);
      // Remove from list
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      playPing();
    } catch (error) {
      console.error('Failed to accept:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  const handleDecline = async (notification) => {
    const requesterId = notification.user?._id || notification.user?.id;
    if (!requesterId) return;

    setProcessingIds(prev => new Set(prev).add(notification.id));
    try {
      await declineConnectionRequest(requesterId);
      // Remove from list
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
      console.error('Failed to decline:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notification.id);
        return newSet;
      });
    }
  };

  const handleNotificationPress = (notification) => {
    if (notification.type === 'connection_request') {
      // Navigate to user profile
      if (notification.user) {
        navigation.navigate('UserProfile', { user: notification.user });
      }
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'connection_request':
        return { name: 'person-add', color: '#581845' };
      case 'connection_accepted':
        return { name: 'checkmark-circle', color: '#22c55e' };
      case 'message':
        return { name: 'chatbubble', color: '#3b82f6' };
      case 'like':
        return { name: 'heart', color: '#ef4444' };
      default:
        return { name: 'notifications', color: '#581845' };
    }
  };

  const renderNotification = ({ item }) => {
    const isProcessing = processingIds.has(item.id);
    const iconInfo = getNotificationIcon(item.type);
    
    const userPhoto = item.user?.photos?.[0];
    const photoUri = userPhoto
      ? (userPhoto.startsWith('http') ? userPhoto : `http://192.168.100.4:4000${userPhoto}`)
      : null;

    const userName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.trim() || 'Someone';

    return (
      <TouchableOpacity
        style={styles.notificationItem}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* User Photo with Icon Overlay */}
        <View style={styles.avatarContainer}>
          <Image
            source={photoUri ? { uri: photoUri } : FallbackImage}
            style={styles.avatar}
          />
          <View style={[styles.iconOverlay, { backgroundColor: iconInfo.color }]}>
            <Ionicons name={iconInfo.name} size={12} color="#fff" />
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.notificationText}>
            <Text style={styles.userName}>{userName}</Text>
            {' '}{item.message}
          </Text>
          <Text style={styles.timeText}>{getTimeAgo(item.timestamp)}</Text>

          {/* Action Buttons for Connection Requests */}
          {item.type === 'connection_request' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.acceptBtn, isProcessing && styles.disabledBtn]}
                onPress={() => handleAccept(item)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size={14} color="#fff" />
                ) : (
                  <Text style={styles.acceptBtnText}>Accept</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.declineBtn, isProcessing && styles.disabledBtn]}
                onPress={() => handleDecline(item)}
                disabled={isProcessing}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#581845" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity style={styles.markReadBtn}>
            <Ionicons name="checkmark-done" size={20} color="#581845" />
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#581845']}
            tintColor="#581845"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              When you get notifications, they'll show up here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  markReadBtn: {
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f0f0f0',
  },
  iconOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  userName: {
    fontWeight: '600',
    color: '#111',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  acceptBtn: {
    backgroundColor: '#581845',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  declineBtn: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  declineBtnText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default NotificationsScreen;
