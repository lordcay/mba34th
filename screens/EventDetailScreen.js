// screens/EventDetailScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Calendar from 'expo-calendar';
import { AuthContext } from '../context/AuthContext';
import eventService from '../services/event.service';
import Colors from '../constants/Colors';

const { width, height } = Dimensions.get('window');
const ACCENT = Colors.primary || '#581845';
const FallbackImage = require('../assets/fff.jpg');

// Attendee Avatar Component (for preview row)
const AttendeeAvatar = ({ attendee, index, isLast, remaining, onPress }) => (
  <TouchableOpacity 
    style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -10 : 0, zIndex: 10 - index }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {isLast && remaining > 0 ? (
      <View style={styles.moreAttendeesCircle}>
        <Text style={styles.moreAttendeesText}>+{remaining}</Text>
      </View>
    ) : attendee?.profilePicture || attendee?.profileImage || attendee?.avatar ? (
      <Image 
        source={{ uri: attendee.profilePicture || attendee.profileImage || attendee.avatar }} 
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

// Attendee List Item Component (for full list with actions)
const AttendeeListItem = ({ attendee, onViewProfile, onMessage, onConnect, showActions }) => {
  const user = attendee?.user || attendee;
  return (
    <View style={styles.attendeeListItem}>
      <TouchableOpacity style={styles.attendeeListLeft} onPress={onViewProfile} activeOpacity={0.7}>
        {user?.profilePicture || user?.profileImage || user?.avatar ? (
          <Image 
            source={{ uri: user.profilePicture || user.profileImage || user.avatar }} 
            style={styles.attendeeListAvatar}
          />
        ) : (
          <View style={[styles.attendeeListAvatar, styles.attendeeListAvatarPlaceholder]}>
            <Text style={styles.attendeeListInitial}>
              {(user?.firstName?.charAt(0) || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.attendeeListInfo}>
          <Text style={styles.attendeeListName}>
            {user?.firstName || 'Unknown'} {user?.lastName || ''}
          </Text>
          <Text style={styles.attendeeListStatus}>Going</Text>
        </View>
      </TouchableOpacity>
      {showActions && (
        <View style={styles.attendeeActions}>
          <TouchableOpacity style={styles.attendeeActionBtn} onPress={onMessage}>
            <Ionicons name="chatbubble-outline" size={18} color={ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attendeeActionBtn} onPress={onConnect}>
            <Ionicons name="person-add-outline" size={18} color={ACCENT} />
          </TouchableOpacity>
        </View>
      )}
    </View>
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

  const currentUserId = user?._id || user?.id;
  const isOrganizer = event?.organizer?._id === currentUserId || 
                      event?.organizer?.id === currentUserId ||
                      event?.createdBy?._id === currentUserId ||
                      event?.createdBy?.id === currentUserId ||
                      event?.createdBy === currentUserId;
  const isAttending = event?.isAttending || event?.rsvpStatus === 'going';

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
    setRsvpLoading(true);
    try {
      if (isAttending) {
        const result = await eventService.cancelRsvp(event._id || event.id);
        if (result.success) {
          setEvent(prev => ({
            ...prev,
            isAttending: false,
            rsvpStatus: null,
            attendeeCount: Math.max(0, (prev.attendeeCount || 1) - 1),
          }));
        }
      } else {
        const result = await eventService.rsvpEvent(event._id || event.id, 'going');
        if (result.success) {
          setEvent(prev => ({
            ...prev,
            isAttending: true,
            rsvpStatus: 'going',
            attendeeCount: (prev.attendeeCount || 0) + 1,
          }));
        }
      }
    } catch (error) {
      console.log('RSVP error:', error);
      Alert.alert('Error', 'Failed to update RSVP. Please try again.');
    } finally {
      setRsvpLoading(false);
    }
  };

  // Add to calendar
  const addToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Calendar permission is needed to add this event.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(
        cal => cal.allowsModifications && (cal.source.name === 'Default' || cal.isPrimary)
      ) || calendars.find(cal => cal.allowsModifications);

      if (!defaultCalendar) {
        Alert.alert('Error', 'No writable calendar found.');
        return;
      }

      const eventConfig = {
        title: event.title || event.name,
        startDate: eventDate,
        endDate: endDate || new Date(eventDate.getTime() + 2 * 60 * 60 * 1000),
        location: event.isOnline ? event.meetingLink : (event.location || event.venue),
        notes: event.description,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      await Calendar.createEventAsync(defaultCalendar.id, eventConfig);
      Alert.alert('Success', 'Event added to your calendar!');
    } catch (error) {
      console.log('Calendar error:', error);
      Alert.alert('Error', 'Failed to add event to calendar.');
    }
  };

  // Share event
  const shareEvent = async () => {
    try {
      const message = `Check out this event: ${event.title || event.name}\n\n` +
        `📅 ${formatFullDate(eventDate)} at ${formatTime(eventDate)}\n` +
        `📍 ${event.isOnline ? 'Online Event' : (event.location || event.venue || 'TBD')}\n\n` +
        `${event.description?.substring(0, 200)}...`;

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
    const location = encodeURIComponent(event.location || event.venue || '');
    const url = Platform.select({
      ios: `maps:0,0?q=${location}`,
      android: `geo:0,0?q=${location}`,
    });
    Linking.openURL(url);
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
          <Image
            source={event.image || event.imageUrl ? { uri: event.image || event.imageUrl } : FallbackImage}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.heroGradient}
            locations={[0, 0.3, 1]}
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
          {(event.organizer || event.createdBy) && (
            <TouchableOpacity 
              style={styles.organizerRow}
              onPress={() => {
                const organizer = event.organizer || event.createdBy;
                const organizerId = organizer._id || organizer.id;
                if (organizerId && organizerId !== currentUserId) {
                  navigation.navigate('UserProfile', { userId: organizerId });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.organizerLabel}>Hosted by</Text>
              <View style={styles.organizerInfo}>
                {(event.organizer || event.createdBy)?.profilePicture || 
                 (event.organizer || event.createdBy)?.profileImage || 
                 (event.organizer || event.createdBy)?.avatar ? (
                  <Image 
                    source={{ uri: (event.organizer || event.createdBy).profilePicture || 
                              (event.organizer || event.createdBy).profileImage || 
                              (event.organizer || event.createdBy).avatar }}
                    style={styles.organizerAvatar}
                  />
                ) : (
                  <View style={[styles.organizerAvatar, styles.organizerAvatarPlaceholder]}>
                    <Ionicons name="person" size={14} color={ACCENT} />
                  </View>
                )}
                <Text style={styles.organizerName}>
                  {(event.organizer || event.createdBy)?.firstName} {(event.organizer || event.createdBy)?.lastName}
                </Text>
                {!isOrganizer && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 4 }} />
                )}
              </View>
            </TouchableOpacity>
          )}

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
              <InfoRow
                icon="location"
                label="Location"
                value={event.location || event.venue || 'TBD'}
                onPress={(event.location || event.venue) ? openInMaps : undefined}
                isLink={!!(event.location || event.venue)}
              />
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
                          navigation.navigate('UserProfile', { userId });
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
                        showActions={isOrganizer && userId !== currentUserId}
                        onViewProfile={() => {
                          if (userId && userId !== currentUserId) {
                            navigation.navigate('UserProfile', { userId });
                          }
                        }}
                        onMessage={() => {
                          if (userId) {
                            navigation.navigate('PrivateChat', { 
                              recipientId: userId,
                              recipientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                            });
                          }
                        }}
                        onConnect={() => {
                          if (userId) {
                            // Navigate to user profile where they can send connection request
                            navigation.navigate('UserProfile', { userId, action: 'connect' });
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

          {/* Calendar Button */}
          <TouchableOpacity style={styles.calendarButton} onPress={addToCalendar}>
            <Ionicons name="calendar-outline" size={20} color={ACCENT} />
            <Text style={styles.calendarButtonText}>Add to Calendar</Text>
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
        <TouchableOpacity
          style={[styles.rsvpButton, isAttending && styles.rsvpButtonActive]}
          onPress={handleRsvp}
          disabled={rsvpLoading}
        >
          <LinearGradient
            colors={isAttending ? ['#10B981', '#059669'] : [ACCENT, '#900C3F']}
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
      </View>
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
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
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
    color: Colors.success,
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
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
  },
  attendeeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  attendeeListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attendeeListAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  attendeeListAvatarPlaceholder: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeListInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  attendeeListInfo: {
    flex: 1,
  },
  attendeeListName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  attendeeListStatus: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 2,
  },
  attendeeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendeeActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${ACCENT}15`,
    alignItems: 'center',
    justifyContent: 'center',
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
});

export default EventDetailScreen;
