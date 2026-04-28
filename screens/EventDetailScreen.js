// screens/EventDetailScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  Dimensions,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import eventService from '../services/event.service';
import { sendConnectionRequest } from '../services/connection.service';
import { getCurrentLocation, hasLocationPermission, formatDistance, calculateDistance } from '../services/location.service';
import RsvpVisibilityModal from '../components/RsvpVisibilityModal';
import PhotoViewer from '../components/PhotoViewer';
import Colors from '../constants/Colors';
import { API_BASE_URL as IMG_BASE } from '../config';

const { width, height } = Dimensions.get('window');
const ACCENT = Colors.primary || '#581845';
const ACCENT_DARK = Colors.primaryDark || '#3D1030';
const ACCENT_LIGHT = Colors.primarySoft || '#F5EDF8';
// Using IMG_BASE from config.js
const FallbackImage = require('../assets/logo1.png');

// Resolve photo URL from photos array (backend stores relative paths)
const toPhotoUrl = (photos) => {
  if (!photos || !Array.isArray(photos) || photos.length === 0) return null;
  const p = photos[0];
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return `${IMG_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
};

// Attendee Avatar Component (for preview row)
const AttendeeAvatar = ({ attendee, index, isLast, remaining, onPress }) => {
  const photoUri = toPhotoUrl(attendee?.photos);
  return (
    <TouchableOpacity 
      style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -10 : 0, zIndex: 10 - index }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {isLast && remaining > 0 ? (
        <View style={styles.moreAttendeesCircle}>
          <Text style={styles.moreAttendeesText}>+{remaining}</Text>
        </View>
      ) : photoUri ? (
        <Image 
          source={{ uri: photoUri }} 
          style={styles.attendeeImage}
        />
      ) : (
        <View style={[styles.attendeeImage, styles.attendeePlaceholder]}>
          <Text style={styles.attendeeInitial}>
            {(attendee?.firstName?.charAt(0) || attendee?.name?.charAt(0) || '?').toUpperCase()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Attendee List Item Component — Modern design with connection info
const AttendeeListItem = ({ attendee, onViewProfile, onConnect, currentUserId }) => {
  const user = attendee?.user || attendee;
  const photoUri = toPhotoUrl(user?.photos);
  const userId = user?._id || user?.id;
  const isSelf = userId && String(userId) === String(currentUserId);
  const connectionStatus = attendee?.connectionStatus || 'none';
  const connectionCount = attendee?.connectionCount ?? 0;
  const isConnected = connectionStatus === 'connected';

  return (
    <TouchableOpacity 
      style={styles.attendeeListItem}
      onPress={onViewProfile}
      activeOpacity={0.7}
    >
      {/* Avatar with connection dot */}
      <View style={styles.attendeeAvatarWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.attendeeListAvatar} />
        ) : (
          <View style={[styles.attendeeListAvatar, styles.attendeeListAvatarPlaceholder]}>
            <Text style={styles.attendeeListInitial}>
              {(user?.firstName?.charAt(0) || '?').toUpperCase()}
            </Text>
          </View>
        )}
        {!isSelf && (
          <View style={[
            styles.connectionDot,
            isConnected ? styles.connectionDotConnected : styles.connectionDotNone,
          ]} />
        )}
      </View>

      {/* Name + connection count */}
      <View style={styles.attendeeListInfo}>
        <Text style={styles.attendeeListName} numberOfLines={1}>
          {user?.firstName || 'Unknown'} {user?.lastName || ''}
          {isSelf ? ' (You)' : ''}
        </Text>
        <View style={styles.attendeeMetaRow}>
          <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.attendeeMetaText}>
            {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
          </Text>
          {isConnected && (
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={ACCENT} />
              <Text style={styles.connectedBadgeText}>Connected</Text>
            </View>
          )}
        </View>
      </View>

      {/* Connect button — only for non-self, non-connected users */}
      {!isSelf && connectionStatus === 'none' && (
        <TouchableOpacity 
          style={styles.connectBtn}
          onPress={(e) => { e.stopPropagation?.(); onConnect(userId); }}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add" size={16} color="#fff" />
        </TouchableOpacity>
      )}
      {!isSelf && connectionStatus === 'pending' && (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={14} color={ACCENT} />
          <Text style={styles.pendingBadgeText}>Pending</Text>
        </View>
      )}
      {!isSelf && isConnected && (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
    </TouchableOpacity>
  );
};

// Info Row Component
const InfoRow = ({ icon, label, value, onPress, isLink }) => (
  <TouchableOpacity 
    style={styles.infoRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.infoIconWrapper}>
      <Ionicons name={icon} size={20} color={ACCENT} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, isLink && styles.infoValueLink]} numberOfLines={2}>
        {value}
      </Text>
    </View>
    {onPress && (
      <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
    )}
  </TouchableOpacity>
);

// Main Event Detail Screen
const EventDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  const { eventId, event: initialEvent } = route.params || {};

  const [event, setEvent] = useState(initialEvent || null);
  const [loading, setLoading] = useState(!initialEvent);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [calendarEventId, setCalendarEventId] = useState(null);
  const [distanceDisplay, setDistanceDisplay] = useState(null);
  const [rsvpModalVisible, setRsvpModalVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [commentTotal, setCommentTotal] = useState(0);

  const heroFlatListRef = useRef(null);

  const currentUserId = user?._id || user?.id;
  const isOrganizer = event?.organizer?._id === currentUserId || 
                      event?.organizer?.id === currentUserId ||
                      event?.createdBy?._id === currentUserId ||
                      event?.createdBy?.id === currentUserId ||
                      event?.createdBy === currentUserId;
  const isAttending = event?.isAttending || event?.rsvpStatus === 'going';
  const isPast = event?.date ? new Date(event.date) < new Date() : false;

  // Fetch event details
  const fetchEventDetails = useCallback(async () => {
    if (!eventId && !initialEvent?._id) return;
    
    try {
      setLoading(true);
      const result = await eventService.getEventById(eventId || initialEvent._id);
      if (result.success && result.data) {
        setEvent(result.data);
        // If event has inline attendees, use them
        if (Array.isArray(result.data.attendees)) {
          setAttendees(result.data.attendees);
        }
      }

      // Fetch attendees separately
      setLoadingAttendees(true);
      const attendeesResult = await eventService.getAttendees(eventId || initialEvent._id);
      if (attendeesResult.success && Array.isArray(attendeesResult.data)) {
        setAttendees(attendeesResult.data);
      }
    } catch (error) {
      console.log('Error fetching event:', error);
      setAttendees([]); // Ensure attendees is always an array
    } finally {
      setLoading(false);
      setLoadingAttendees(false);
    }
  }, [eventId, initialEvent]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  // Calculate distance from user to event
  useEffect(() => {
    const calcDistance = async () => {
      try {
        const coords = event?.coordinates?.coordinates;
        if (!coords || coords.length < 2) return;
        const [eventLng, eventLat] = coords; // GeoJSON is [lng, lat]
        
        const hasPermission = await hasLocationPermission();
        if (!hasPermission) return;
        
        const userLocation = await getCurrentLocation();
        if (!userLocation?.coordinates?.latitude || !userLocation?.coordinates?.longitude) return;
        
        const dist = calculateDistance(
          userLocation.coordinates.latitude,
          userLocation.coordinates.longitude,
          eventLat,
          eventLng
        );
        if (dist !== null) {
          setDistanceDisplay(formatDistance(dist));
        }
      } catch (e) {
        console.log('Distance calc error:', e);
      }
    };
    if (event) calcDistance();
  }, [event]);

  // Format dates
  const eventDate = event?.date || event?.startDate ? new Date(event.date || event.startDate) : null;
  const endDate = event?.endDate ? new Date(event.endDate) : null;

  const formatFullDate = (d) => d?.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formatTime = (d) => d?.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Handle RSVP
  const handleRsvp = async () => {
    if (isAttending) {
      // Cancel RSVP
      setRsvpLoading(true);
      try {
        const result = await eventService.cancelRsvp(event._id || event.id);
        if (result.success) {
          setEvent(prev => ({
            ...prev,
            isAttending: false,
            rsvpStatus: null,
            attendeeCount: Math.max(0, (prev.attendeeCount || 1) - 1),
          }));
        }
      } catch (error) {
        console.log('RSVP error:', error);
        Alert.alert('Error', 'Failed to update RSVP. Please try again.');
      } finally {
        setRsvpLoading(false);
      }
    } else {
      // Show visibility modal
      setRsvpModalVisible(true);
    }
  };

  // Confirm RSVP with visibility
  const handleRsvpConfirm = async (visibility) => {
    setRsvpLoading(true);
    try {
      const result = await eventService.rsvpEvent(event._id || event.id, 'going', visibility);
      if (result.success) {
        setEvent(prev => ({
          ...prev,
          isAttending: true,
          rsvpStatus: 'going',
          attendeeCount: (prev.attendeeCount || 0) + 1,
        }));
      }
    } catch (error) {
      console.log('RSVP error:', error);
      Alert.alert('Error', 'Failed to RSVP. Please try again.');
    } finally {
      setRsvpLoading(false);
      setRsvpModalVisible(false);
    }
  };

  // Toggle calendar (add/remove)
  const toggleCalendar = async () => {
    let Calendar;
    try {
      Calendar = require('expo-calendar');
    } catch (error) {
      console.log('Calendar module load error:', error);
      Alert.alert('Error', 'Calendar is not available right now. Please try again later.');
      return;
    }

    // Remove from calendar
    if (calendarAdded && calendarEventId) {
      try {
        await Calendar.deleteEventAsync(calendarEventId);
        setCalendarAdded(false);
        setCalendarEventId(null);
        Alert.alert('Removed', 'Event has been removed from your calendar.');
      } catch (error) {
        console.log('Calendar remove error:', error);
        // If event was already deleted externally, just reset state
        setCalendarAdded(false);
        setCalendarEventId(null);
      }
      return;
    }

    // Add to calendar
    if (!eventDate || isNaN(eventDate.getTime())) {
      Alert.alert('Error', 'This event does not have a valid date set.');
      return;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Calendar permission is needed to add this event.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(
        cal => cal.allowsModifications && (cal.source?.name === 'Default' || cal.isPrimary)
      ) || calendars.find(cal => cal.allowsModifications);

      if (!defaultCalendar) {
        Alert.alert('Error', 'No writable calendar found on this device.');
        return;
      }

      const locationDisplay = event.isOnline 
        ? (event.meetingLink || 'Online Event')
        : (event.venueName || event.fullAddress || event.location || '');

      const eventConfig = {
        title: event.title || event.name || 'Event',
        startDate: eventDate,
        endDate: endDate || new Date(eventDate.getTime() + 2 * 60 * 60 * 1000),
        location: locationDisplay,
        notes: event.description || '',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const newCalendarEventId = await Calendar.createEventAsync(defaultCalendar.id, eventConfig);
      setCalendarEventId(newCalendarEventId);
      setCalendarAdded(true);
      Alert.alert('Added!', 'Event has been added to your calendar.', [{ text: 'OK' }]);
    } catch (error) {
      console.log('Calendar error:', error);
      Alert.alert('Error', 'Failed to add event to calendar. Please try again.');
    }
  };

  // Share event
  const shareEvent = async () => {
    try {
      const locationDisplay = event.isOnline 
        ? 'Online Event' 
        : (event.venueName || event.fullAddress || event.location || 'TBD');

      const message = `Check out this event: ${event.title || event.name}\n\n` +
        `📅 ${formatFullDate(eventDate) || 'Date TBD'} at ${formatTime(eventDate) || 'Time TBD'}\n` +
        `📍 ${locationDisplay}\n\n` +
        `${(event.description || '').substring(0, 200)}${event.description?.length > 200 ? '...' : ''}`;

      await Share.share({
        message,
        title: event.title || event.name,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  // Open meeting link
  const openMeetingLink = () => {
    if (event.meetingLink) {
      Linking.openURL(event.meetingLink);
    }
  };

  // Open location in maps
  const openInMaps = () => {
    const location = event.venueName || event.fullAddress || event.location || '';
    if (!location) return;
    const encoded = encodeURIComponent(location);
    const url = Platform.select({
      ios: `maps:0,0?q=${encoded}`,
      android: `geo:0,0?q=${encoded}`,
    });
    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    });
  };

  // Edit event
  const handleEdit = () => {
    navigation.navigate('CreateEvent', { event });
  };

  // Delete event
  const handleDelete = () => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await eventService.deleteEvent(event._id || event.id);
              if (result.success) {
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to delete event.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event.');
            }
          },
        },
      ]
    );
  };

  // Fetch comments
  const fetchComments = useCallback(async () => {
    const eid = event?._id || event?.id || eventId || initialEvent?._id;
    if (!eid) return;
    try {
      setLoadingComments(true);
      const result = await eventService.getComments(eid, 1, 50);
      if (result.success) {
        setComments(result.data || []);
        setAvgRating(result.averageRating || 0);
        setCommentTotal(result.total || 0);
      }
    } catch (error) {
      console.log('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [event?._id, event?.id, eventId, initialEvent?._id]);

  useEffect(() => {
    if (event) fetchComments();
  }, [event?._id, fetchComments]);

  // Add comment
  const handleAddComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please write a comment.');
      return;
    }
    if (commentRating === 0) {
      Alert.alert('Required', 'Please select a star rating.');
      return;
    }
    try {
      setSubmittingComment(true);
      const eid = event._id || event.id;
      const result = await eventService.addComment(eid, trimmed, commentRating);
      if (result.success) {
        // Optimistically append the new comment with full user data
        const newComment = result.data?.comment || result.data || {};
        const optimisticComment = {
          _id: newComment._id || `temp-${Date.now()}`,
          text: trimmed,
          rating: commentRating,
          createdAt: newComment.createdAt || new Date().toISOString(),
          userId: {
            _id: currentUserId,
            firstName: user?.firstName || user?.name?.split(' ')[0] || '',
            lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
            photos: user?.photos || [],
          },
        };
        setComments(prev => [optimisticComment, ...prev]);
        setCommentText('');
        setCommentRating(0);
        // Re-fetch to sync with server in background
        fetchComments();
      } else {
        Alert.alert('Error', result.message || 'Failed to add comment.');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = (commentId) => {
    Alert.alert('Delete Comment', 'Are you sure you want to remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const eid = event._id || event.id;
            const result = await eventService.deleteComment(eid, commentId);
            if (result.success) {
              fetchComments();
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete comment.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.errorText}>Event not found</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const attendeeCount = event.attendeeCount || (Array.isArray(attendees) ? attendees.length : 0) || 0;
  const safeAttendees = Array.isArray(attendees) ? attendees : [];

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {(() => {
            const eventPhotos = event.photos?.length > 0
              ? event.photos
              : (event.image || event.imageUrl) ? [event.image || event.imageUrl] : [];
            
            if (eventPhotos.length > 0) {
              return (
                <>
                  <FlatList
                    ref={heroFlatListRef}
                    data={eventPhotos}
                    keyExtractor={(_, i) => String(i)}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    style={{ width, height: height * 0.35 }}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                      setHeroPhotoIndex(idx);
                    }}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          setPhotoViewerIndex(index);
                          setPhotoViewerVisible(true);
                        }}
                      >
                        <Image
                          source={{ uri: item }}
                          style={{ width, height: height * 0.35 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}
                    getItemLayout={(_, index) => ({
                      length: width,
                      offset: width * index,
                      index,
                    })}
                  />
                  {/* Dots indicator */}
                  {eventPhotos.length > 1 && (
                    <View style={styles.heroDotsRow}>
                      {eventPhotos.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.heroDot,
                            i === heroPhotoIndex && styles.heroDotActive,
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </>
              );
            }
            return (
              <LinearGradient
                colors={[ACCENT, '#900C3F']}
                style={styles.heroImage}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={FallbackImage}
                  style={styles.heroLogoFallback}
                  resizeMode="contain"
                />
              </LinearGradient>
            );
          })()}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
            locations={[0, 0.3, 1]}
            pointerEvents="none"
          />

          {/* Back Button */}
          <TouchableOpacity 
            style={[styles.headerButton, { top: insets.top + 10, left: 16 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={[styles.headerActions, { top: insets.top + 10 }]}>
            <TouchableOpacity style={styles.headerButton} onPress={shareEvent}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
            {isOrganizer && (
              <TouchableOpacity style={[styles.headerButton, { marginLeft: 10 }]} onPress={handleEdit}>
                <Ionicons name="create-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Badge */}
          {event.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
              </Text>
            </View>
          )}

          {/* Date Badge */}
          {eventDate && (
            <View style={styles.hereDateBadge}>
              <Text style={styles.hereDateMonth}>
                {eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
              </Text>
              <Text style={styles.hereDateDay}>{eventDate.getDate()}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{event.title || event.name}</Text>

          {/* Organizer/Host - Show createdBy */}
          {(event.organizer || event.createdBy) && (() => {
            const organizer = event.organizer || event.createdBy;
            const organizerPhoto = toPhotoUrl(organizer?.photos);
            return (
              <TouchableOpacity 
                style={styles.organizerRow}
                onPress={() => {
                  const organizerId = organizer._id || organizer.id;
                  if (organizerId && organizerId !== currentUserId) {
                    navigation.navigate('UserProfile', { user: organizer });
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.organizerLabel}>Hosted by</Text>
                <View style={styles.organizerInfo}>
                  {organizerPhoto ? (
                    <Image 
                      source={{ uri: organizerPhoto }}
                      style={styles.organizerAvatar}
                    />
                  ) : (
                    <View style={[styles.organizerAvatar, styles.organizerAvatarPlaceholder]}>
                      <Ionicons name="person" size={14} color={ACCENT} />
                    </View>
                  )}
                  <Text style={styles.organizerName}>
                    {organizer?.firstName} {organizer?.lastName}
                  </Text>
                  {!isOrganizer && (
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 4 }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* Info Cards */}
          <View style={styles.infoCard}>
            <InfoRow
              icon="calendar"
              label="Date"
              value={formatFullDate(eventDate) || 'TBD'}
            />
            <InfoRow
              icon="time"
              label="Time"
              value={
                eventDate && endDate
                  ? `${formatTime(eventDate)} - ${formatTime(endDate)}`
                  : formatTime(eventDate) || 'TBD'
              }
            />
            {event.isOnline ? (
              <InfoRow
                icon="videocam"
                label="Online Event"
                value={event.meetingLink ? 'Join Meeting' : 'Link will be shared'}
                onPress={event.meetingLink ? openMeetingLink : undefined}
                isLink={!!event.meetingLink}
              />
            ) : (
              <>
                <InfoRow
                  icon="location"
                  label="Location"
                  value={event.venueName || event.fullAddress || event.location || 'TBD'}
                  onPress={(event.venueName || event.fullAddress || event.location) ? openInMaps : undefined}
                  isLink={!!(event.venueName || event.fullAddress || event.location)}
                />
                {distanceDisplay && (
                  <View style={styles.distanceBadgeRow}>
                    <View style={styles.distanceBadge}>
                      <Ionicons name="navigate-outline" size={14} color="#fff" />
                      <Text style={styles.distanceBadgeText}>{distanceDisplay} away</Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Attendees Section */}
          <View style={styles.attendeesSection}>
            <View style={styles.attendeesHeader}>
              <Text style={styles.sectionTitle}>
                {attendeeCount} {attendeeCount === 1 ? 'Attendee' : 'Attendees'}
              </Text>
              <View style={styles.attendeesHeaderRight}>
                {event.maxAttendees && (
                  <Text style={styles.maxAttendeesText}>
                    {event.maxAttendees - attendeeCount} spots left
                  </Text>
                )}
                {safeAttendees.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setShowAllAttendees(!showAllAttendees)}
                    style={styles.seeAllBtn}
                  >
                    <Text style={styles.seeAllText}>
                      {showAllAttendees ? 'Show Less' : 'See All'}
                    </Text>
                    <Ionicons 
                      name={showAllAttendees ? 'chevron-up' : 'chevron-down'} 
                      size={16} 
                      color={ACCENT} 
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Attendee Avatar Preview Row */}
            {!showAllAttendees && (
              <View style={styles.attendeesList}>
                {safeAttendees.slice(0, 5).map((attendee, index) => {
                  const user = attendee?.user || attendee;
                  const userId = user?._id || user?.id;
                  return (
                    <AttendeeAvatar
                      key={attendee._id || userId || index}
                      attendee={user}
                      index={index}
                      isLast={index === 4 && safeAttendees.length > 5}
                      remaining={safeAttendees.length - 5}
                      onPress={() => {
                        if (index === 4 && safeAttendees.length > 5) {
                          setShowAllAttendees(true);
                        } else if (userId && userId !== currentUserId) {
                          navigation.navigate('UserProfile', { user });
                        }
                      }}
                    />
                  );
                })}
                {safeAttendees.length === 0 && (
                  <Text style={styles.noAttendeesText}>Be the first to RSVP!</Text>
                )}
              </View>
            )}

            {/* Full Attendees List (Expanded) */}
            {showAllAttendees && (
              <View style={styles.attendeesFullList}>
                {loadingAttendees ? (
                  <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 20 }} />
                ) : safeAttendees.length > 0 ? (
                  safeAttendees.map((attendee, index) => {
                    const user = attendee?.user || attendee;
                    const userId = user?._id || user?.id;
                    return (
                      <AttendeeListItem
                        key={attendee._id || userId || index}
                        attendee={attendee}
                        currentUserId={currentUserId}
                        onViewProfile={() => {
                          if (userId) {
                            navigation.navigate('UserProfile', { user });
                          }
                        }}
                        onConnect={async (targetId) => {
                          try {
                            await sendConnectionRequest(targetId);
                            // Update local state to show pending
                            setAttendees(prev => prev.map(a => {
                              const aUserId = (a?.user?._id || a?.user?.id || a?._id);
                              if (String(aUserId) === String(targetId)) {
                                return { ...a, connectionStatus: 'pending' };
                              }
                              return a;
                            }));
                            Alert.alert('Request Sent', 'Connection request sent successfully!');
                          } catch (error) {
                            Alert.alert('Error', error?.response?.data?.message || 'Failed to send connection request.');
                          }
                        }}
                      />
                    );
                  })
                ) : (
                  <Text style={styles.noAttendeesText}>No attendees yet</Text>
                )}
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description || 'No description provided.'}</Text>
          </View>

          {/* Reviews & Comments Section */}
          <View style={styles.reviewsSection}>
            {/* Section Header */}
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews & Comments</Text>
              {commentTotal > 0 && (
                <View style={styles.reviewsSummaryBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.reviewsSummaryRating}>{avgRating.toFixed(1)}</Text>
                  <Text style={styles.reviewsSummaryCount}>({commentTotal})</Text>
                </View>
              )}
            </View>

            {/* Average Rating Display */}
            {commentTotal > 0 && (
              <View style={styles.avgRatingCard}>
                <Text style={styles.avgRatingNumber}>{avgRating.toFixed(1)}</Text>
                <View style={styles.avgRatingStars}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons
                      key={star}
                      name={star <= Math.round(avgRating) ? 'star' : star - 0.5 <= avgRating ? 'star-half' : 'star-outline'}
                      size={18}
                      color="#F59E0B"
                    />
                  ))}
                </View>
                <Text style={styles.avgRatingLabel}>
                  Based on {commentTotal} {commentTotal === 1 ? 'review' : 'reviews'}
                </Text>
              </View>
            )}

            {/* Comment Input (only for users who attended this event) */}
            {isAttending && (
              <View style={styles.commentInputCard}>
                <Text style={styles.commentInputTitle}>Leave a Review</Text>
                {/* Star Rating Selector */}
                <View style={styles.starSelector}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setCommentRating(star)}
                      activeOpacity={0.7}
                      style={styles.starTouchable}
                    >
                      <Ionicons
                        name={star <= commentRating ? 'star' : 'star-outline'}
                        size={28}
                        color={star <= commentRating ? '#F59E0B' : '#D1D5DB'}
                      />
                    </TouchableOpacity>
                  ))}
                  {commentRating > 0 && (
                    <Text style={styles.starLabel}>
                      {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][commentRating]}
                    </Text>
                  )}
                </View>
                {/* Text Input */}
                <TextInput
                  style={styles.commentInput}
                  placeholder="Share your experience..."
                  placeholderTextColor={Colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitCommentBtn, (!commentText.trim() || commentRating === 0) && styles.submitCommentBtnDisabled]}
                  onPress={handleAddComment}
                  disabled={submittingComment || !commentText.trim() || commentRating === 0}
                  activeOpacity={0.7}
                >
                  {submittingComment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#fff" />
                      <Text style={styles.submitCommentText}>Post Review</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Comment List */}
            {loadingComments ? (
              <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 20 }} />
            ) : comments.length > 0 ? (
              <View style={styles.commentsList}>
                {comments.map((comment) => {
                  // Handle both populated objects and raw string IDs
                  const rawUser = comment.userId || comment.user || {};
                  const commenter = (typeof rawUser === 'object' && rawUser !== null) ? rawUser : {};
                  const commenterId = commenter._id || commenter.id || (typeof rawUser === 'string' ? rawUser : null);
                  const isOwnComment = commenterId && String(commenterId) === String(currentUserId);
                  const canDelete = isOwnComment || isOrganizer;
                  const commentDate = comment.createdAt ? new Date(comment.createdAt) : null;

                  // Resolve names — use commenter data, or fall back to current user if own comment
                  const firstName = commenter.firstName || (isOwnComment ? (user?.firstName || user?.name?.split(' ')[0]) : '') || '';
                  const lastName = commenter.lastName || (isOwnComment ? (user?.lastName || user?.name?.split(' ').slice(1).join(' ')) : '') || '';
                  const firstInitial = (firstName.charAt(0) || '').toUpperCase();
                  const lastInitial = (lastName.charAt(0) || '').toUpperCase();
                  const initials = firstInitial + lastInitial || '?';

                  // Resolve commenter photo
                  const commenterPhotos = commenter.photos || (isOwnComment ? user?.photos : null);
                  const commenterPhotoUri = toPhotoUrl(commenterPhotos);

                  return (
                    <View key={comment._id} style={styles.commentItem}>
                      {/* Comment Header */}
                      <View style={styles.commentHeader}>
                        <View style={styles.commentUser}>
                          {commenterPhotoUri ? (
                            <Image
                              source={{ uri: commenterPhotoUri }}
                              style={styles.commentAvatar}
                            />
                          ) : (
                            <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]}>
                              <Text style={styles.commentAvatarInitial}>{initials}</Text>
                            </View>
                          )}
                          <View style={styles.commentUserInfo}>
                            <Text style={styles.commentUserName} numberOfLines={1}>
                              {firstInitial && lastInitial ? `${firstInitial}.${lastInitial}.` : initials}
                              {isOwnComment ? ' (You)' : ''}
                            </Text>
                            {commentDate && (
                              <Text style={styles.commentDate}>
                                {commentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </Text>
                            )}
                          </View>
                        </View>
                        {/* Rating + Delete */}
                        <View style={styles.commentActions}>
                          {comment.rating > 0 && (
                            <View style={styles.commentRatingBadge}>
                              <Ionicons name="star" size={12} color="#F59E0B" />
                              <Text style={styles.commentRatingText}>{comment.rating}</Text>
                            </View>
                          )}
                          {canDelete && (
                            <TouchableOpacity
                              onPress={() => handleDeleteComment(comment._id)}
                              style={styles.deleteCommentBtn}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {/* Comment Text */}
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.noCommentsContainer}>
                <Ionicons name="chatbubble-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.noCommentsText}>No reviews yet</Text>
                <Text style={styles.noCommentsSubtext}>
                  {isAttending
                    ? 'Be the first to share your experience!'
                    : 'Reviews from attendees will appear here.'}
                </Text>
              </View>
            )}
          </View>

          {/* Calendar Button */}
          <TouchableOpacity 
            style={[styles.calendarButton, calendarAdded && styles.calendarButtonAdded]} 
            onPress={toggleCalendar}
          >
            <Ionicons 
              name={calendarAdded ? "checkmark-circle" : "calendar-outline"} 
              size={20} 
              color={calendarAdded ? '#fff' : ACCENT} 
            />
            <Text style={[styles.calendarButtonText, calendarAdded && styles.calendarButtonTextAdded]}>
              {calendarAdded ? 'Added to Calendar' : 'Add to Calendar'}
            </Text>
          </TouchableOpacity>

          {/* Delete Button (organizer only) */}
          {isOrganizer && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteButtonText}>Delete Event</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {isPast ? (
          <View style={styles.pastEventBar}>
            <Ionicons name="time-outline" size={20} color={Colors.textMuted} />
            <Text style={styles.pastEventBarText}>This event has ended</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.rsvpButton, isAttending && styles.rsvpButtonActive]}
            onPress={handleRsvp}
            disabled={rsvpLoading}
          >
            <LinearGradient
              colors={isAttending ? [ACCENT, '#900C3F'] : [ACCENT, '#900C3F']}
              style={styles.rsvpGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {rsvpLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={isAttending ? 'checkmark-circle' : 'add-circle'}
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.rsvpButtonText}>
                    {isAttending ? "You're Going!" : 'RSVP Now'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>

      {/* RSVP Visibility Modal */}
      <RsvpVisibilityModal
        visible={rsvpModalVisible}
        onClose={() => setRsvpModalVisible(false)}
        onConfirm={handleRsvpConfirm}
        eventTitle={event?.title || event?.name}
        loading={rsvpLoading}
      />

      {/* Fullscreen Photo Viewer */}
      <PhotoViewer
        visible={photoViewerVisible}
        photos={
          event?.photos?.length > 0
            ? event.photos
            : (event?.image || event?.imageUrl) ? [event.image || event.imageUrl] : []
        }
        initialIndex={photoViewerIndex}
        onClose={() => setPhotoViewerVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: Colors.textSecondary,
  },
  backLink: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: ACCENT,
    borderRadius: 20,
  },
  backLinkText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },

  // Hero Section
  heroContainer: {
    height: height * 0.35,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoFallback: {
    width: 120,
    height: 120,
    opacity: 0.9,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroDotsRow: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    zIndex: 5,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  headerButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hereDateBadge: {
    position: 'absolute',
    bottom: -30,
    right: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  hereDateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
    letterSpacing: 0.5,
  },
  hereDateDay: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: -4,
  },

  // Content
  content: {
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: 12,
    paddingRight: 60,
  },
  organizerRow: {
    marginBottom: 20,
  },
  organizerLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  organizerAvatarPlaceholder: {
    backgroundColor: `${ACCENT}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${ACCENT}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  infoValueLink: {
    color: ACCENT,
  },

  // Attendees
  attendeesSection: {
    marginBottom: 24,
  },
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attendeesHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  maxAttendeesText: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '500',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '500',
    marginRight: 2,
  },
  attendeesList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: Colors.background,
    overflow: 'hidden',
  },
  attendeeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  attendeePlaceholder: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  moreAttendeesCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreAttendeesText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  noAttendeesText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // Full Attendees List
  attendeesFullList: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 4,
    marginTop: 8,
  },
  attendeeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  attendeeAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  attendeeListAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  attendeeListAvatarPlaceholder: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeListInitial: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  connectionDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.backgroundSecondary,
  },
  connectionDotConnected: {
    backgroundColor: ACCENT,
  },
  connectionDotNone: {
    backgroundColor: '#D1D5DB',
  },
  attendeeListInfo: {
    flex: 1,
  },
  attendeeListName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  attendeeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  connectedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: ACCENT,
  },
  connectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
  },

  // Description
  descriptionSection: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginTop: 8,
  },

  // Calendar Button
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: `${ACCENT}10`,
    borderWidth: 1,
    borderColor: `${ACCENT}30`,
    marginBottom: 16,
  },
  calendarButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
    marginLeft: 8,
  },
  calendarButtonAdded: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  calendarButtonTextAdded: {
    color: '#fff',
  },

  // Distance Badge
  distanceBadgeRow: {
    flexDirection: 'row',
    paddingLeft: 40,
    marginTop: -4,
    marginBottom: 8,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  distanceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Delete Button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    color: Colors.error,
    marginLeft: 6,
  },

  // Reviews & Comments
  reviewsSection: {
    marginBottom: 24,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  reviewsSummaryRating: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  reviewsSummaryCount: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  avgRatingCard: {
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  avgRatingNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  avgRatingStars: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 6,
  },
  avgRatingLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  commentInputCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  commentInputTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  starSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  starTouchable: {
    padding: 2,
  },
  starLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
    marginLeft: 8,
  },
  commentInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 80,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 12,
  },
  submitCommentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  submitCommentBtnDisabled: {
    opacity: 0.5,
  },
  submitCommentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  commentsList: {
    gap: 0,
  },
  commentItem: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  commentAvatarPlaceholder: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  commentUserInfo: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  commentDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  commentRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  deleteCommentBtn: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  noCommentsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noCommentsText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  noCommentsSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  rsvpButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  rsvpButtonActive: {},
  rsvpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  rsvpButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  pastEventBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14,
    gap: 8,
  },
  pastEventBarText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textMuted,
  },
});

export default EventDetailScreen;
