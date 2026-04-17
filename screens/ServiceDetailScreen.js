import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
  Platform,
  Dimensions,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import serviceService from '../services/service.service';
import { getCurrentLocation } from '../services/location.service';
import Colors from '../constants/Colors';
import { API_BASE_URL as IMG_BASE } from '../config';

// Using IMG_BASE from config.js
const toPhotoUrl = (p) => (p && typeof p === 'string' ? (p.startsWith('http') ? p : `${IMG_BASE}${p}`) : null);

const { width } = Dimensions.get('window');
const ACCENT = Colors.primary;
const ACCENT_DARK = Colors.primaryDark;
const ACCENT_LIGHT = Colors.primarySoft;

// ==================== STAR RATING DISPLAY ====================
const StarRating = ({ rating = 0, size = 16, showValue = true, count }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={star <= Math.round(rating) ? 'star' : 'star-outline'}
        size={size}
        color={star <= Math.round(rating) ? ACCENT : '#D1D5DB'}
      />
    ))}
    {showValue && rating > 0 && (
      <Text style={{ fontSize: size - 2, fontWeight: '700', color: Colors.textPrimary, marginLeft: 4 }}>
        {rating.toFixed(1)}
      </Text>
    )}
    {count !== undefined && (
      <Text style={{ fontSize: size - 3, color: Colors.textSecondary, marginLeft: 2 }}>
        {count > 0 ? `(${count} ${count === 1 ? 'rating' : 'ratings'})` : 'No ratings yet'}
      </Text>
    )}
  </View>
);

// ==================== STAR INPUT ====================
const StarInput = ({ value, onChange, size = 32 }) => (
  <View style={{ flexDirection: 'row', gap: 6 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
        <Ionicons
          name={star <= value ? 'star' : 'star-outline'}
          size={size}
          color={star <= value ? ACCENT : '#D1D5DB'}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// ==================== REVIEW MODAL ====================
const ReviewModal = ({ visible, onClose, onSubmit, submitting }) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setRating(0);
      setText('');
    }
  }, [visible]);

  const handleSubmit = () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    onSubmit(rating, text);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Write a Review</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Your Rating</Text>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <StarInput value={rating} onChange={setRating} />
            </View>

            <Text style={styles.modalLabel}>Your Review (optional)</Text>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience with this service..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={1000}
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitReviewBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={submitting}
            >
              <LinearGradient
                colors={[ACCENT, '#4A2080', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitReviewGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitReviewText}>Submit Review</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ==================== INFO GRID ITEM ====================
const InfoItem = ({ icon, iconColor, label, value, onPress, isLink }) => (
  <View style={styles.infoItem}>
    <View style={[styles.infoItemIcon, { backgroundColor: `${iconColor || ACCENT}15` }]}>
      <Ionicons name={icon} size={18} color={iconColor || ACCENT} />
    </View>
    <Text style={styles.infoItemLabel}>{label}</Text>
    {onPress ? (
      <TouchableOpacity onPress={onPress}>
        <Text style={[styles.infoItemValue, isLink && { color: ACCENT }]} numberOfLines={2}>{value}</Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.infoItemValue} numberOfLines={2}>{value}</Text>
    )}
  </View>
);

// ==================== SOCIAL CHIP ====================
const SocialChip = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={[styles.socialChip, { borderColor: color }]} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.socialChipText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// ==================== REVIEW CARD (Facebook-style) ====================
const ReviewCard = ({ review, onPressUser }) => {
  const reviewer = review.reviewer || {};
  const name = [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ') || 'User';
  const initials = [reviewer.firstName?.[0], reviewer.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const photoUrl = toPhotoUrl(reviewer.photos?.[0]);
  const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const connectionCount = review.connectionCount ?? 0;
  const connectionStatus = review.connectionStatus || 'none';
  const isSelf = connectionStatus === 'self';
  const isConnected = connectionStatus === 'connected';

  return (
    <View style={rcStyles.card}>
      {/* Reviewer Info Row */}
      <TouchableOpacity
        style={rcStyles.userRow}
        onPress={() => onPressUser?.(reviewer)}
        activeOpacity={0.65}
      >
        {/* Avatar — always show photo like Facebook comments */}
        <View style={rcStyles.avatarWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={rcStyles.avatar} />
          ) : (
            <View style={[rcStyles.avatar, rcStyles.avatarFallback]}>
              <Text style={rcStyles.avatarInitials}>{initials}</Text>
            </View>
          )}
          {/* Connection status dot overlay */}
          {!isSelf && (
            <View style={[rcStyles.statusDot, isConnected ? rcStyles.dotConnected : rcStyles.dotNotConnected]}>
              <Ionicons
                name={isConnected ? 'checkmark' : 'add'}
                size={8}
                color="#fff"
              />
            </View>
          )}
        </View>

        {/* Name + Meta */}
        <View style={rcStyles.userInfo}>
          <Text style={rcStyles.name} numberOfLines={1}>{name}</Text>
          <View style={rcStyles.metaRow}>
            <Ionicons name="people-outline" size={11} color={Colors.textMuted} />
            <Text style={rcStyles.metaText}>
              {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
            </Text>
            <Text style={rcStyles.metaDot}>·</Text>
            <Text style={rcStyles.metaText}>{date}</Text>
          </View>
        </View>

        {/* Star Rating */}
        <StarRating rating={review.rating} size={13} showValue={false} />
      </TouchableOpacity>

      {/* Review Text */}
      {review.text ? <Text style={rcStyles.text}>{review.text}</Text> : null}
    </View>
  );
};

// ==================== HAVERSINE DISTANCE ====================
const calcDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
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

// ==================== AMAZON-STYLE RATING DISTRIBUTION ====================
const RatingDistribution = ({ stats, totalReviews }) => {
  if (!stats || totalReviews === 0) return null;

  const bayesianRating = stats.bayesianAverage || stats.average || 0;

  return (
    <View style={ratingStyles.container}>
      {/* Left: Big average + stars */}
      <View style={ratingStyles.leftCol}>
        <Text style={ratingStyles.bigRating}>{bayesianRating.toFixed(1)}</Text>
        <StarRating rating={bayesianRating} size={14} showValue={false} />
        <Text style={ratingStyles.totalText}>{totalReviews} {totalReviews === 1 ? 'rating' : 'ratings'}</Text>
      </View>

      {/* Right: Star bars */}
      <View style={ratingStyles.rightCol}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.distribution?.[star] || 0;
          const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <View key={star} style={ratingStyles.barRow}>
              <Text style={ratingStyles.starLabel}>{star}</Text>
              <Ionicons name="star" size={10} color={ACCENT} />
              <View style={ratingStyles.barTrack}>
                <View style={[ratingStyles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={ratingStyles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
const ServiceDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);

  const serviceFromRoute = route?.params?.service;
  const [service, setService] = useState(serviceFromRoute);
  const [loading, setLoading] = useState(!serviceFromRoute);
  const [isOwner, setIsOwner] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [reviewStats, setReviewStats] = useState(null);

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

  // Load review stats when service is available
  useEffect(() => {
    const id = service?._id || route?.params?.serviceId;
    if (id) {
      serviceService.getReviewStats(id).then((result) => {
        if (result.success) setReviewStats(result.data);
      }).catch(() => {});
    }
  }, [service?._id, reviews.length]);

  useEffect(() => {
    if (service && user) {
      const serviceProviderId = typeof service.provider === 'string'
        ? service.provider
        : (service.provider?._id || service.createdBy?._id);
      const currentUserId = user.id || user._id;
      setIsOwner(String(serviceProviderId) === String(currentUserId));
    }
  }, [service, user]);

  useEffect(() => {
    if (!serviceFromRoute && route?.params?.serviceId) {
      loadServiceDetail();
    }
  }, [route?.params?.serviceId]);

  useEffect(() => {
    const id = service?._id || route?.params?.serviceId;
    if (id) loadReviews(id);
  }, [service?._id]);

  const loadServiceDetail = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const serviceId = service?._id || route?.params?.serviceId;
      if (!serviceId) return;
      // Try public endpoint first (approved services)
      let result = await serviceService.getServiceDetail(serviceId);
      // If 404 (non-approved), try authenticated owner endpoint
      if (!result.success) {
        result = await serviceService.getMyServiceDetail(serviceId);
      }
      if (result.success) {
        setService(result.data);
      }
    } catch (error) {
      console.error('Error reloading service:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadReviews = async (serviceId) => {
    try {
      setReviewsLoading(true);
      const result = await serviceService.getServiceReviews(serviceId);
      if (result.success) setReviews(result.data);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSubmitReview = async (rating, text) => {
    try {
      setSubmittingReview(true);
      const result = await serviceService.submitReview(service._id, rating, text);
      if (result.success) {
        setReviewModalVisible(false);
        // Immediately update rating from response if available
        if (result.data?.serviceRating) {
          setService((prev) => ({
            ...prev,
            averageRating: result.data.serviceRating.averageRating,
            reviewCount: result.data.serviceRating.reviewCount,
          }));
        }
        loadReviews(service._id);
        // Also refresh full service data in background (no loader)
        loadServiceDetail(false);
        Alert.alert('Success', 'Review submitted!');
      } else {
        Alert.alert('Error', result.error || 'Failed to submit review');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleContact = () => {
    const provider = service?.provider || service?.createdBy || {};
    navigation.navigate('PrivateChat', { user: provider });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this service: ${service.title}\n\nPosted by ${service.provider?.firstName || 'A user'}\n\n${service.description}`,
        title: service.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEdit = () => navigation.navigate('CreateService', { service });

  const handleDelete = () => {
    Alert.alert('Delete Service', 'Are you sure you want to delete this service?', [
      { text: 'No' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const result = await serviceService.deleteService(service._id);
            if (result.success) {
              Alert.alert('Success', 'Service deleted', [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } else {
              Alert.alert('Error', result.error);
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete service');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  // ==================== LOADING / ERROR STATES ====================
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.errorText}>Service not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const provider = service.provider || service.createdBy || {};
  const providerName = [provider.firstName, provider.lastName].filter(Boolean).join(' ') || 'Provider';
  const rating = service.averageRating || 0;
  const reviewCount = service.reviewCount || 0;
  const isVerified = service.status === 'approved';
  const pricing = service.pricing || (service.hourlyRate ? `$${service.hourlyRate}/hr` : service.basePrice ? `$${service.basePrice}` : null);
  const location = service.serviceLocation || [service.city, service.state].filter(Boolean).join(', ') || '';
  const hasSocials = service.website || service.instagram || service.facebook || service.twitter || service.linkedin;

  // Calculate distance from user to service
  const serviceCoords = service.coordinates?.coordinates; // [lng, lat]
  const distanceKm = userLocation && serviceCoords && serviceCoords[0] !== 0 && serviceCoords[1] !== 0
    ? calcDistance(userLocation.latitude, userLocation.longitude, serviceCoords[1], serviceCoords[0])
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Details</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Feather name="share-2" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ====== GRADIENT BANNER ====== */}
        <LinearGradient
          colors={[ACCENT, '#4A2080', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <MaterialCommunityIcons name="briefcase-outline" size={48} color="rgba(255,255,255,0.85)" />
        </LinearGradient>

        {/* ====== TITLE SECTION ====== */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{service.title}</Text>
          <View style={styles.providerRow}>
            <Text style={styles.providerText}>by {providerName}</Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={13} color={ACCENT} />
                <Text style={styles.verifiedText}>Verified Provider</Text>
              </View>
            )}
          </View>
          <StarRating rating={rating} size={16} count={reviewCount} />
        </View>

        {/* ====== INFO GRID ====== */}
        <View style={styles.infoGrid}>
          <View style={styles.infoGridRow}>
            <InfoItem
              icon="grid-outline"
              label="Category"
              value={service.category ? service.category.charAt(0).toUpperCase() + service.category.slice(1) : '—'}
            />
            <InfoItem
              icon="pricetag-outline"
              iconColor={ACCENT}
              label="Pricing"
              value={pricing || 'Contact for pricing'}
            />
          </View>

          <View style={styles.infoGridRow}>
            <View style={[styles.infoItem, { flex: 1 }]}>
              <View style={[styles.infoItemIcon, { backgroundColor: `${ACCENT}15` }]}>
                <Ionicons name="location-outline" size={18} color={ACCENT} />
              </View>
              <Text style={styles.infoItemLabel}>Location</Text>
              <Text style={styles.infoItemValue} numberOfLines={1}>{location || '—'}</Text>
              {service.fullAddress && (
                <Text style={styles.infoItemSubValue} numberOfLines={2}>{service.fullAddress}</Text>
              )}
              <Text style={styles.distanceText}>
                {distanceKm !== null
                  ? `${distanceKm < 1 ? distanceKm.toFixed(1) : Math.round(distanceKm)}km away`
                  : 'Distance unavailable'}
              </Text>
            </View>
          </View>

          <View style={styles.infoGridRow}>
            {service.contactEmail && (
              <InfoItem
                icon="mail-outline"
                iconColor={ACCENT}
                label="Email"
                value={service.contactEmail}
                onPress={() => Linking.openURL(`mailto:${service.contactEmail}`)}
                isLink
              />
            )}
            {service.contactPhone && (
              <InfoItem
                icon="call-outline"
                iconColor={ACCENT}
                label="Phone"
                value={service.contactPhone}
                onPress={() => Linking.openURL(`tel:${service.contactPhone}`)}
                isLink
              />
            )}
          </View>
        </View>

        {/* ====== ABOUT THIS SERVICE ====== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>About this service</Text>
          <Text style={styles.description}>{service.description}</Text>

          {service.skills && service.skills.length > 0 && (
            <View style={styles.skillsRow}>
              {service.skills.map((skill, index) => (
                <View key={index} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ====== CONNECT ONLINE ====== */}
        {hasSocials && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Connect Online</Text>
            <View style={styles.socialsRow}>
              {service.website && (
                <SocialChip
                  icon="globe-outline"
                  label="Website"
                  color="#6B7280"
                  onPress={() => Linking.openURL(service.website.startsWith('http') ? service.website : `https://${service.website}`)}
                />
              )}
              {service.instagram && (
                <SocialChip
                  icon="logo-instagram"
                  label={`@${service.instagram.replace('@', '')}`}
                  color="#E1306C"
                  onPress={() => Linking.openURL(`https://instagram.com/${service.instagram.replace('@', '')}`)}
                />
              )}
              {service.facebook && (
                <SocialChip
                  icon="logo-facebook"
                  label={service.facebook}
                  color="#1877F2"
                  onPress={() => Linking.openURL(`https://facebook.com/${service.facebook}`)}
                />
              )}
              {service.twitter && (
                <SocialChip
                  icon="logo-twitter"
                  label={`@${service.twitter.replace('@', '')}`}
                  color="#1DA1F2"
                  onPress={() => Linking.openURL(`https://twitter.com/${service.twitter.replace('@', '')}`)}
                />
              )}
              {service.linkedin && (
                <SocialChip
                  icon="logo-linkedin"
                  label={service.linkedin}
                  color="#0A66C2"
                  onPress={() => Linking.openURL(`https://linkedin.com/in/${service.linkedin}`)}
                />
              )}
            </View>
          </View>
        )}

        {/* ====== CONTACT PROVIDER BUTTON ====== */}
        {!isOwner && (
          <TouchableOpacity style={styles.contactBtnWrapper} onPress={handleContact} activeOpacity={0.8}>
            <LinearGradient
              colors={[ACCENT, '#4A2080', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.contactBtnGradient}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Contact Provider</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ====== OWNER ACTIONS ====== */}
        {isOwner && (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.ownerEditBtn} onPress={handleEdit} activeOpacity={0.8}>
              <LinearGradient
                colors={[ACCENT, ACCENT_DARK]}
                style={styles.ownerEditGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.ownerEditText}>Edit Service</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ownerDeleteBtn} onPress={handleDelete} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={styles.ownerDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ====== RATINGS & REVIEWS ====== */}
        <View style={styles.sectionCard}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Ratings & Reviews ({reviewCount})</Text>
            {!isOwner && user && (
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => setReviewModalVisible(true)}
                activeOpacity={0.7}
              >
                <Feather name="edit-3" size={14} color={ACCENT_DARK} />
                <Text style={styles.writeReviewText}>Write a Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Amazon-style Rating Distribution */}
          <RatingDistribution stats={reviewStats} totalReviews={reviewCount} />

          {reviewsLoading ? (
            <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 20 }} />
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                onPressUser={(reviewer) => {
                  if (reviewer?._id) {
                    navigation.navigate('UserProfile', { user: reviewer });
                  }
                }}
              />
            ))
          ) : (
            <View style={styles.noReviews}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>Be the first to share your experience</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleSubmitReview}
        submitting={submittingReview}
      />
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Banner
  banner: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Title Section
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  providerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT_DARK,
  },

  // Info Grid
  infoGrid: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  infoGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoItemLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  infoItemSubValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT_DARK,
    marginTop: 2,
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#fff',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  skillBadge: {
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 12,
    color: ACCENT_DARK,
    fontWeight: '600',
  },

  // Social Chips
  socialsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: '#fff',
  },
  socialChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Contact Button
  contactBtnWrapper: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  contactBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  contactBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },

  // Owner Actions
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  ownerEditBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ownerEditGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  ownerEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  ownerDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  ownerDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Reviews Section
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  writeReviewText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT_DARK,
  },
  reviewCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reviewDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  reviewText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  noReviewsText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  noReviewsSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Review Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  reviewInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 100,
    marginBottom: 20,
  },
  submitReviewBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitReviewGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitReviewText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

// ==================== RATING DISTRIBUTION STYLES ====================
const ratingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 16,
  },
  leftCol: {
    alignItems: 'center',
    minWidth: 70,
  },
  bigRating: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  totalText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  rightCol: {
    flex: 1,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 12,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: ACCENT,
    borderRadius: 4,
  },
  barCount: {
    fontSize: 11,
    color: Colors.textMuted,
    width: 22,
    textAlign: 'right',
  },
});

// ==================== REVIEW CARD STYLES ====================
const rcStyles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  avatarFallback: {
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT_DARK,
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  dotConnected: {
    backgroundColor: ACCENT,
  },
  dotNotConnected: {
    backgroundColor: ACCENT_DARK,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  text: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    marginLeft: 54,
  },
});

export default ServiceDetailScreen;
