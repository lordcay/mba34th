import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import serviceService from '../services/service.service';
import Colors from '../constants/Colors';

const ACCENT = Colors.primary || '#581845';
const FallbackImage = require('../assets/icon.png');

const ServiceDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const serviceFromRoute = route?.params?.service;
  const [service, setService] = useState(serviceFromRoute);
  const [loading, setLoading] = useState(!serviceFromRoute);
  const [isOwner, setIsOwner] = useState(false);

  // Check if current user is the service owner
  useEffect(() => {
    if (service && user) {
      const serviceProviderId = service.provider?._id || service.createdBy?._id;
      const currentUserId = user.id || user._id;
      setIsOwner(serviceProviderId === currentUserId);
    }
  }, [service, user]);

  // Load full service details if not provided
  useEffect(() => {
    if (!serviceFromRoute && route?.params?.serviceId) {
      loadServiceDetail();
    }
  }, [route?.params?.serviceId]);

  const loadServiceDetail = async () => {
    try {
      setLoading(true);
      const result = await serviceService.getServiceDetail(route?.params?.serviceId);
      if (result.success) {
        setService(result.data);
      } else {
        Alert.alert('Error', 'Failed to load service details');
      }
    } catch (error) {
      console.error('Error loading service:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
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

  const handleEdit = () => {
    navigation.navigate('CreateService', { service });
  };

  const handleDelete = () => {
    Alert.alert('Delete Service', 'Are you sure you want to delete this service?', [
      { text: 'No', onPress: () => {} },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const result = await serviceService.deleteService(service._id);
            if (result.success) {
              Alert.alert('Success', 'Service deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
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
  const providerAvatar = provider.profilePicture || provider.photos?.[0];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category & Status Badge */}
        <View style={styles.badgeContainer}>
          <LinearGradient
            colors={[ACCENT, '#900C3F']}
            style={styles.categoryBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialCommunityIcons name="briefcase" size={14} color="#fff" />
            <Text style={styles.categoryText}>{service.category}</Text>
          </LinearGradient>
          {service.status === 'approved' && (
            <View style={styles.approvedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
              <Text style={styles.approvedText}>Approved</Text>
            </View>
          )}
          {service.status === 'pending' && isOwner && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={16} color="#f59e0b" />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>

        {/* Service Title */}
        <Text style={styles.title}>{service.title}</Text>

        {/* Provider Info Card */}
        <View style={styles.providerCard}>
          <Image
            source={providerAvatar ? { uri: providerAvatar } : FallbackImage}
            style={styles.providerAvatar}
          />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.firstName} {provider.lastName}</Text>
            {provider.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#4ade80" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
            <Text style={styles.providerRole}>{provider.program || 'Service Provider'}</Text>
          </View>

          {/* Price Display */}
          {(service.hourlyRate || service.basePrice) && (
            <View style={styles.priceSection}>
              {service.hourlyRate && (
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>Hourly</Text>
                  <Text style={styles.price}>${service.hourlyRate}</Text>
                </View>
              )}
              {service.basePrice && (
                <View style={styles.priceBlock}>
                  <Text style={styles.priceLabel}>Base Price</Text>
                  <Text style={styles.price}>${service.basePrice}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Service</Text>
          <Text style={styles.description}>{service.description}</Text>
        </View>

        {/* Skills */}
        {service.skills && service.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills & Expertise</Text>
            <View style={styles.skillsList}>
              {service.skills.map((skill, index) => (
                <View key={index} style={styles.skillBadge}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location & Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="location-outline" size={20} color={ACCENT} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Service Location</Text>
              <Text style={styles.detailValue}>
                {service.city}, {service.state}
              </Text>
            </View>
          </View>

          {service.experience && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="time-outline" size={20} color={ACCENT} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{service.experience}</Text>
              </View>
            </View>
          )}

          {service.availability && service.availability.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={20} color={ACCENT} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Availability</Text>
                <Text style={styles.detailValue}>
                  {service.availability.join(', ')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Info Box */}
        {!isOwner && service.status === 'approved' && (
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={20} color={ACCENT} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Admin Verified</Text>
              <Text style={styles.infoText}>
                This service has been reviewed and approved by our admin team for quality and legitimacy.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        {isOwner ? (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.editBtn]}
              onPress={handleEdit}
            >
              <Ionicons name="create" size={18} color="#fff" />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={18} color="#fff" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.messageBtn]}
              onPress={handleContact}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.contactBtn]}
              onPress={handleContact}
            >
              <Ionicons name="call" size={18} color={ACCENT} />
              <Text style={styles.contactBtnText}>Contact</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#f8f7f5',
  },
  header: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
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
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  approvedText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  pendingText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
  },
  providerCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  providerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 12,
  },
  providerInfo: {
    marginBottom: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },
  providerRole: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priceSection: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    paddingTop: 12,
    marginTop: 12,
  },
  priceBlock: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: ACCENT,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: '#f0e8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0e8f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#f0e8f8',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT,
    marginBottom: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  editBtn: {
    backgroundColor: ACCENT,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  deleteBtn: {
    backgroundColor: '#e53e3e',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  messageBtn: {
    backgroundColor: ACCENT,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  contactBtn: {
    backgroundColor: '#f0e8f8',
    borderWidth: 1,
    borderColor: ACCENT,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
});

export default ServiceDetailScreen;
