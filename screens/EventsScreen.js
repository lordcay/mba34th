import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TextInput,
  Keyboard,
  Platform,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import eventService from '../services/event.service';
import { getCurrentLocation, calculateDistance, formatDistance, hasLocationPermission, geocodeAddress } from '../services/location.service';
import RsvpVisibilityModal from '../components/RsvpVisibilityModal';
import Slider from '@react-native-community/slider';
import Colors from '../constants/Colors';
import { API_BASE_URL as IMG_BASE } from '../config';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const ACCENT = Colors.primary || '#581845';
const ACCENT_DARK = Colors.primaryDark || '#3D1030';
const ACCENT_LIGHT = Colors.primarySoft || '#F5EDF8';
// Using IMG_BASE from config.js

// Resolve photo URL from photos array
const toPhotoUrl = (photos) => {
  if (!photos || !Array.isArray(photos) || photos.length === 0) return null;
  const p = photos[0];
  if (!p) return null;
  if (p.startsWith('http')) return p;
  return `${IMG_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
};

// Haversine distance calculation (same as ServicesScreen)
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

// Tab options for filtering events
const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'attending', label: 'Attending' },
  { key: 'mine', label: 'My Events' },
];

// Event Card Component - Modern Design
const EventCard = ({ event, onPress, onRsvp }) => {
  const eventDate = new Date(event.date || event.startDate);
  const isValidDate = !isNaN(eventDate.getTime());
  const isPast = isValidDate && eventDate < new Date();
  
  const formattedDate = isValidDate 
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD';
  
  const formattedTime = isValidDate
    ? eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  const attendeeCount = event.attendeeCount || event.attendees?.length || 0;
  const maxAttendees = event.maxAttendees || event.expectedAttendees || 50;
  const slotsLeft = Math.max(0, maxAttendees - attendeeCount);
  const isAttending = event.isAttending || event.rsvpStatus === 'going';
  const commentCount = event.commentCount || 0;
  const averageRating = event.averageRating || 0;

  return (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => onPress(event)}
      activeOpacity={0.9}
    >
      {/* Header Band with Date */}
      <LinearGradient
        colors={[ACCENT, '#900C3F']}
        style={styles.cardHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerDateContainer}>
          <View style={styles.calendarIconWrapper}>
            <Ionicons name="calendar" size={20} color="#fff" />
          </View>
          <View style={styles.headerDateInfo}>
            <Text style={styles.headerDateText}>{formattedDate}</Text>
            {formattedTime && <Text style={styles.headerTimeText}>{formattedTime}</Text>}
          </View>
        </View>
        {event.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.category}</Text>
          </View>
        )}
      </LinearGradient>

      {/* Event Photo / Flyer */}
      {(() => {
        const photoUri = event.photos?.[0] || event.image || event.imageUrl;
        if (!photoUri || typeof photoUri !== 'string' || !photoUri.startsWith('http')) return null;
        return (
          <Image
            source={{ uri: photoUri }}
            style={styles.cardPhoto}
            resizeMode="cover"
          />
        );
      })()}

      {/* Card Content */}
      <View style={styles.cardBody}>
        {/* Title */}
        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title || event.name}
        </Text>

        {/* Host/Organizer Row */}
        {(event.organizer || event.createdBy) && (() => {
          const host = event.organizer || event.createdBy;
          const hostPhoto = toPhotoUrl(host?.photos);
          return (
            <View style={styles.hostRow}>
              {hostPhoto ? (
                <Image 
                  source={{ uri: hostPhoto }}
                  style={styles.hostAvatar}
                />
              ) : (
                <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder]}>
                  <Ionicons name="person" size={10} color={ACCENT} />
                </View>
              )}
              <Text style={styles.hostText}>
                Hosted by{' '}
                <Text style={styles.hostName}>
                  {host?.firstName || 'Unknown'}{' '}
                  {host?.lastName || ''}
                </Text>
              </Text>
            </View>
          );
        })()}

        {/* Description */}
        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        {/* Location Row */}
        {(event.location || event.venueName || event.fullAddress) && (
          <View style={styles.locationRow}>
            <View style={styles.locationInfo}>
              <Ionicons name="location-sharp" size={16} color={ACCENT} />
              <Text style={styles.locationText} numberOfLines={1}>
                {event.venueName || event.location || event.fullAddress}
              </Text>
            </View>
            {event.distanceDisplay ? (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={12} color={ACCENT} />
                <Text style={styles.distanceText}>
                  {event.distanceDisplay} away
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Footer with Attendees and Slots */}
        <View style={styles.cardFooter}>
          <View style={styles.attendeesInfo}>
            <View style={styles.avatarGroup}>
              {[...Array(Math.min(3, attendeeCount || 1))].map((_, i) => (
                <View key={i} style={[styles.avatarCircle, { marginLeft: i > 0 ? -10 : 0, zIndex: 3 - i }]}>
                  <Ionicons name="person" size={12} color="#fff" />
                </View>
              ))}
            </View>
            <Text style={styles.attendeeCountText}>{attendeeCount} attended{isPast ? '' : 'ing'}</Text>
          </View>

          {isPast ? (
            <View style={styles.reviewSummary}>
              {averageRating > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={13} color="#F5A623" />
                  <Text style={styles.ratingBadgeText}>{averageRating}</Text>
                </View>
              )}
              {commentCount > 0 && (
                <View style={styles.commentCountBadge}>
                  <Ionicons name="chatbubble-outline" size={13} color={ACCENT} />
                  <Text style={styles.commentCountText}>{commentCount}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.slotsContainer}>
              <View style={[styles.slotsBadge, slotsLeft <= 5 && styles.slotsBadgeLow]}>
                <Ionicons 
                  name={slotsLeft <= 5 ? "warning" : "ticket"} 
                  size={14} 
                  color={slotsLeft <= 5 ? "#E74C3C" : ACCENT} 
                />
                <Text style={[styles.slotsText, slotsLeft <= 5 && styles.slotsTextLow]}>
                  {slotsLeft} slots left
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* RSVP Button / Past Event Badge */}
        {isPast ? (
          <View style={styles.pastEventRow}>
            <View style={styles.pastBadge}>
              <Ionicons name="checkmark-done" size={16} color={ACCENT} />
              <Text style={styles.pastBadgeText}>Past Event</Text>
            </View>
            <Text style={styles.viewReviewsText}>View Reviews →</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.rsvpFullButton, isAttending && styles.rsvpFullButtonActive]}
            onPress={() => onRsvp(event)}
          >
            <Ionicons 
              name={isAttending ? "checkmark-circle" : "add-circle-outline"} 
              size={20} 
              color={isAttending ? '#fff' : ACCENT} 
            />
            <Text style={[styles.rsvpFullButtonText, isAttending && styles.rsvpFullButtonTextActive]}>
              {isAttending ? 'Going' : 'RSVP for this event'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Empty State Component
const EmptyState = ({ activeTab, onCreatePress }) => {
  const messages = {
    upcoming: {
      icon: 'calendar-outline',
      title: 'No upcoming events',
      subtitle: 'Be the first to create an event for the community!',
    },
    past: {
      icon: 'time-outline',
      title: 'No past events yet',
      subtitle: 'Past events will appear here so you can read reviews and build trust.',
    },
    attending: {
      icon: 'ticket-outline',
      title: 'Not attending any events',
      subtitle: 'Browse upcoming events and RSVP to join!',
    },
    mine: {
      icon: 'create-outline',
      title: 'No events created yet',
      subtitle: 'Create your first event and bring people together!',
    },
  };

  const msg = messages[activeTab] || messages.upcoming;

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Ionicons name={msg.icon} size={48} color={ACCENT} />
      </View>
      <Text style={styles.emptyTitle}>{msg.title}</Text>
      <Text style={styles.emptySubtitle}>{msg.subtitle}</Text>
      {activeTab !== 'attending' && (
        <TouchableOpacity style={styles.emptyButton} onPress={onCreatePress}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Create Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const EventsScreen = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationSharingEnabled, setLocationSharingEnabled] = useState(true);

  // Distance filter state
  const [maxDistanceKm, setMaxDistanceKm] = useState(0); // 0 = Anywhere
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);

  // RSVP visibility modal state
  const [rsvpModalVisible, setRsvpModalVisible] = useState(false);
  const [rsvpModalEvent, setRsvpModalEvent] = useState(null);
  const [rsvpModalLoading, setRsvpModalLoading] = useState(false);

  const flatListRef = useRef(null);
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  // Get user location and check permissions
  const initializeLocation = async () => {
    try {
      const hasPermission = await hasLocationPermission();
      const sharingEnabled = user?.locationSharingEnabled !== false; // Default to true if not set
      setLocationEnabled(hasPermission && sharingEnabled);
      setLocationSharingEnabled(sharingEnabled);

      if (hasPermission && sharingEnabled) {
        const location = await getCurrentLocation();
        if (location) {
          setUserLocation(location);
        }
      }
    } catch (error) {
      console.log('Error getting location:', error);
      setLocationEnabled(false);
    }
  };

  // Calculate distance for an event using stored GeoJSON coordinates
  const calculateEventDistance = (event) => {
    if (!userLocation) return null;

    // Use GeoJSON coordinates from DB: coordinates.coordinates = [lng, lat]
    const coords = event.coordinates?.coordinates;
    if (coords && coords.length === 2 && !(coords[0] === 0 && coords[1] === 0)) {
      return calcDistance(userLocation.latitude, userLocation.longitude, coords[1], coords[0]);
    }

    // Fallback: event-level lat/lng
    if (event.latitude && event.longitude) {
      return calcDistance(userLocation.latitude, userLocation.longitude, event.latitude, event.longitude);
    }

    return null;
  };

  // Add distance to events
  const processEventsWithDistance = (eventsList) => {
    return eventsList.map((event) => {
      const distance = calculateEventDistance(event);
      return {
        ...event,
        distance,
        distanceDisplay: distance !== null ? formatDistance(distance) : null,
      };
    });
  };

  // Fetch events based on active tab
  const fetchEvents = async (pageNum = 1, silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let result;
      switch (activeTab) {
        case 'attending':
          result = await eventService.getAttendingEvents(pageNum, 15);
          break;
        case 'mine':
          result = await eventService.getMyEvents(pageNum, 15);
          break;
        case 'past':
          result = await eventService.getPastEvents(pageNum, 15);
          break;
        default:
          result = await eventService.getUpcomingEvents(pageNum, 15);
      }

      if (result.success && result.data) {
        const eventsWithDistance = processEventsWithDistance(result.data);
        if (pageNum === 1) {
          setEvents(eventsWithDistance);
        } else {
          setEvents(prev => [...prev, ...eventsWithDistance]);
        }
        setHasMore(result.pagination?.hasMore ?? result.data.length === 15);
        setPage(pageNum);
      }
    } catch (err) {
      console.log('Error fetching events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch and tab change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchEvents(1);
  }, [activeTab]);

  // Initialize location on mount
  useEffect(() => {
    initializeLocation();
  }, [user]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchEvents(1, true);
    }, [activeTab])
  );

  // Tab indicator animation
  useEffect(() => {
    const tabIndex = TABS.findIndex(t => t.key === activeTab);
    Animated.spring(tabIndicatorAnim, {
      toValue: tabIndex,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  }, [activeTab]);

  // Search events
  const handleSearch = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }

    setIsSearching(true);
    setIsSearchActive(true);

    try {
      // Local filter first
      const localResults = events.filter(event => {
        const title = (event.title || event.name || '').toLowerCase();
        const location = (event.location || event.venue || '').toLowerCase();
        const description = (event.description || '').toLowerCase();
        const q = trimmed.toLowerCase();
        return title.includes(q) || location.includes(q) || description.includes(q);
      });
      setSearchResults(localResults);

      // API search
      const result = await eventService.searchEvents(trimmed);
      if (result.success && result.data.length > 0) {
        const existingIds = new Set(localResults.map(e => e._id));
        const newResults = result.data.filter(e => !existingIds.has(e._id));
        setSearchResults([...localResults, ...newResults]);
      }
    } catch (error) {
      console.log('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearchActive(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, events]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchActive(false);
    Keyboard.dismiss();
  };

  // Handle RSVP
  const handleRsvp = async (event) => {
    const isAttending = event.isAttending || event.rsvpStatus === 'going';
    
    try {
      if (isAttending) {
        Alert.alert(
          'Cancel RSVP',
          `Are you sure you want to cancel your RSVP for "${event.title || event.name}"?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                const result = await eventService.cancelRsvp(event._id || event.id);
                if (result.success) {
                  // Update local state
                  setEvents(prev => prev.map(e => 
                    (e._id || e.id) === (event._id || event.id)
                      ? { ...e, isAttending: false, rsvpStatus: null, attendeeCount: Math.max(0, (e.attendeeCount || 1) - 1) }
                      : e
                  ));
                }
              },
            },
          ]
        );
      } else {
        // Show visibility modal before RSVP
        setRsvpModalEvent(event);
        setRsvpModalVisible(true);
      }
    } catch (error) {
      console.log('RSVP error:', error);
      Alert.alert('Error', 'Failed to update RSVP. Please try again.');
    }
  };

  // Confirm RSVP with visibility
  const handleRsvpConfirm = async (visibility) => {
    if (!rsvpModalEvent) return;
    setRsvpModalLoading(true);
    try {
      const result = await eventService.rsvpEvent(rsvpModalEvent._id || rsvpModalEvent.id, 'going', visibility);
      if (result.success) {
        setEvents(prev => prev.map(e => 
          (e._id || e.id) === (rsvpModalEvent._id || rsvpModalEvent.id)
            ? { ...e, isAttending: true, rsvpStatus: 'going', attendeeCount: (e.attendeeCount || 0) + 1 }
            : e
        ));
      }
    } catch (error) {
      console.log('RSVP error:', error);
      Alert.alert('Error', 'Failed to RSVP. Please try again.');
    } finally {
      setRsvpModalLoading(false);
      setRsvpModalVisible(false);
      setRsvpModalEvent(null);
    }
  };

  // Navigate to event detail
  const goToEventDetail = (event) => {
    navigation.navigate('EventDetail', { eventId: event._id || event.id, event });
  };

  // Navigate to create event
  const goToCreateEvent = () => {
    navigation.navigate('CreateEvent');
  };

  // Load more
  const loadMore = () => {
    if (!loadingMore && hasMore && !isSearchActive) {
      fetchEvents(page + 1);
    }
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        {isSearching && (
          <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsContainer}>
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                transform: [{
                  translateX: tabIndicatorAnim.interpolate({
                    inputRange: [0, 1, 2, 3],
                    outputRange: [0, (width - 32) / 4, ((width - 32) / 4) * 2, ((width - 32) / 4) * 3],
                  }),
                }],
              },
            ]}
          />
        </View>
      </View>

      {/* Distance Filter Toggle */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.distanceFilterBtn}
          onPress={() => setShowDistanceFilter(!showDistanceFilter)}
          activeOpacity={0.7}
        >
          <Ionicons name="options-outline" size={16} color={ACCENT_DARK} />
          <Text style={styles.distanceFilterBtnText}>
            {maxDistanceKm > 0 ? `Within ${maxDistanceKm} km` : 'Distance'}
          </Text>
          {maxDistanceKm > 0 && <View style={styles.filterActiveDot} />}
        </TouchableOpacity>
        {maxDistanceKm > 0 && (
          <TouchableOpacity onPress={() => setMaxDistanceKm(0)} style={styles.filterClearBtn}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Distance Slider (Tinder-style) */}
      {showDistanceFilter && (
        <View style={styles.distanceSliderContainer}>
          <View style={styles.distanceSliderHeader}>
            <Text style={styles.distanceSliderTitle}>Distance</Text>
            <View style={styles.distanceSliderBadge}>
              <Text style={styles.distanceSliderBadgeText}>
                {maxDistanceKm === 0 ? 'Anywhere' : `${maxDistanceKm} km`}
              </Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={200}
            step={5}
            value={maxDistanceKm}
            onValueChange={setMaxDistanceKm}
            minimumTrackTintColor={ACCENT}
            maximumTrackTintColor="#E5E7EB"
            thumbTintColor={ACCENT}
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Anywhere</Text>
            <Text style={styles.sliderLabel}>200 km</Text>
          </View>
        </View>
      )}
    </View>
  );

  // Client-side distance filtering (same algorithm as ServicesScreen)
  const filteredEvents = useMemo(() => {
    const source = isSearchActive ? searchResults : events;
    if (!maxDistanceKm || !userLocation) return source;

    return source.filter((event) => {
      const coords = event.coordinates?.coordinates;
      if (!coords || (coords[0] === 0 && coords[1] === 0)) return false;
      const dist = calcDistance(userLocation.latitude, userLocation.longitude, coords[1], coords[0]);
      return dist !== null && dist <= maxDistanceKm;
    });
  }, [events, searchResults, isSearchActive, maxDistanceKm, userLocation]);

  // Display data
  const displayData = filteredEvents;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {navigation.canGoBack() ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={ACCENT} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity style={styles.createButton} onPress={goToCreateEvent}>
          <LinearGradient
            colors={[ACCENT, '#900C3F']}
            style={styles.createButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        ref={flatListRef}
        data={displayData}
        keyExtractor={(item) => item._id || item.id || String(Math.random())}
        renderItem={({ item }) => (
          <EventCard 
            event={item} 
            onPress={goToEventDetail}
            onRsvp={handleRsvp}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading && (
            maxDistanceKm > 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons name="location-outline" size={48} color={ACCENT} />
                </View>
                <Text style={styles.emptyTitle}>No events nearby</Text>
                <Text style={styles.emptySubtitle}>
                  No events found within {maxDistanceKm} km. Try increasing the distance.
                </Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => setMaxDistanceKm(0)}>
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Show All Events</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <EmptyState 
                activeTab={activeTab} 
                onCreatePress={goToCreateEvent}
              />
            )
          )
        }
        ListFooterComponent={
          loadingMore && (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={ACCENT} />
            </View>
          )
        }
        contentContainerStyle={[
          styles.listContent,
          displayData.length === 0 && !loading && { flex: 1 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEvents(1, true)}
            colors={[ACCENT]}
            tintColor={ACCENT}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      )}

      {/* RSVP Visibility Modal */}
      <RsvpVisibilityModal
        visible={rsvpModalVisible}
        onClose={() => {
          setRsvpModalVisible(false);
          setRsvpModalEvent(null);
        }}
        onConfirm={handleRsvpConfirm}
        eventTitle={rsvpModalEvent?.title || rsvpModalEvent?.name}
        loading={rsvpModalLoading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  createButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundSecondary,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  tabsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: (width - 32 - 8) / 4,
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 100,
  },

  // Event Card Styles - Modern Design
  eventCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardPhoto: {
    width: '100%',
    height: 180,
  },
  headerDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  calendarIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDateInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  headerTimeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  cardBody: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    lineHeight: 24,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hostAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  hostAvatarPlaceholder: {
    backgroundColor: `${ACCENT}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  hostName: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  eventDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    color: ACCENT_DARK,
    marginLeft: 4,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: 14,
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarGroup: {
    flexDirection: 'row',
    marginRight: 8,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  attendeeCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  slotsContainer: {
    alignItems: 'flex-end',
  },
  slotsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 24, 69, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  slotsBadgeLow: {
    backgroundColor: '#FFEBEE',
  },
  slotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
    marginLeft: 4,
  },
  slotsTextLow: {
    color: '#E74C3C',
  },
  rsvpFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: 'transparent',
  },
  rsvpFullButtonActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  rsvpFullButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: ACCENT,
    marginLeft: 8,
  },
  rsvpFullButtonTextActive: {
    color: '#fff',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(88, 24, 69, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },

  // Loading States
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // Distance Filter
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  distanceFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  distanceFilterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_DARK,
  },
  filterActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT,
    marginLeft: 2,
  },
  filterClearBtn: {
    padding: 4,
  },
  distanceSliderContainer: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  distanceSliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceSliderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  distanceSliderBadge: {
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceSliderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  sliderLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  pastEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  pastBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  viewReviewsText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  commentCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  commentCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
  },
});

export default EventsScreen;
