import React, { useState, useEffect, useContext, useRef, useReducer, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
  Platform,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import serviceService from '../services/service.service';
import { getCurrentLocation } from '../services/location.service';
import Colors from '../constants/Colors';

const ACCENT = Colors.primary;
const ACCENT_DARK = Colors.primaryDark;
const ACCENT_LIGHT = Colors.primarySoft;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Service categories for dropdown
const SERVICE_CATEGORIES = [
  { value: 'consulting', label: 'Consulting', icon: 'people' },
  { value: 'tutoring', label: 'Tutoring', icon: 'school' },
  { value: 'design', label: 'Design', icon: 'color-palette' },
  { value: 'tech', label: 'Tech & IT', icon: 'code-slash' },
  { value: 'fitness', label: 'Fitness', icon: 'fitness' },
  { value: 'creative', label: 'Creative', icon: 'brush' },
  { value: 'business', label: 'Business', icon: 'briefcase' },
  { value: 'trade', label: 'Trade', icon: 'construct' },
  { value: 'event', label: 'Event Services', icon: 'calendar' },
];

// ==================== FORM VALIDATION HOOK ====================
const useFormValidation = () => {
  const validateField = useCallback((name, value) => {
    const trimmed = value?.trim?.() || '';
    switch (name) {
      case 'title':
        return !trimmed ? 'Service title is required' : '';
      case 'description':
        return !trimmed ? 'Service description is required' : '';
      case 'category':
        return !value ? 'Category is required' : '';
      case 'serviceLocation':
        return !trimmed ? 'Service location is required' : '';
      case 'fullAddress':
        return !trimmed ? 'Full address is required' : '';
      case 'contactEmail':
        if (!trimmed) return 'Contact email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Please enter a valid email';
        return '';
      default:
        return '';
    }
  }, []);

  return { validateField };
};

// ==================== FORM STATE REDUCER ====================
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        data: { ...state.data, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' },
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.field]: action.error },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'RESET':
      return action.initialState;
    default:
      return state;
  }
};

const createInitialState = (editService) => ({
  data: {
    title: editService?.title || '',
    description: editService?.description || '',
    category: editService?.category || '',
    pricing: editService?.pricing || '',
    serviceLocation: editService?.serviceLocation || '',
    fullAddress: editService?.fullAddress || '',
    contactEmail: editService?.contactEmail || '',
    contactPhone: editService?.contactPhone || '',
    website: editService?.website || '',
    instagram: editService?.instagram || '',
    facebook: editService?.facebook || '',
    twitter: editService?.twitter || '',
    linkedin: editService?.linkedin || '',
  },
  errors: {},
  loading: false,
});

// ==================== MEMOIZED COMPONENTS ====================

// Material-style Input with floating feel
const InputField = React.memo(({
  label,
  icon,
  multiline = false,
  error,
  required = false,
  helperText,
  ...props
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View style={[
      styles.fieldInputWrap,
      multiline && styles.fieldMultilineWrap,
      error && styles.fieldInputError,
      props.value?.length > 0 && styles.fieldInputFilled,
    ]}>
      {icon && (
        <View style={styles.fieldIconWrap}>
          <Ionicons name={icon} size={18} color={error ? Colors.error : (props.value?.length > 0 ? ACCENT : Colors.textMuted)} />
        </View>
      )}
      <TextInput
        style={[
          styles.fieldInput,
          icon && styles.fieldInputWithIcon,
          multiline && styles.fieldMultilineInput,
        ]}
        placeholderTextColor="#B0B0B0"
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
    {helperText && !error && (
      <View style={styles.helperRow}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.helperText}>{helperText}</Text>
      </View>
    )}
    {error && (
      <View style={styles.errorRow}>
        <Ionicons name="alert-circle" size={13} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
));
InputField.displayName = 'InputField';

// Modal-based Select — no overlap issues
const SelectField = React.memo(({ label, options, value, onValueChange, error, required = false }) => {
  const [visible, setVisible] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[
          styles.selectTrigger,
          error && styles.fieldInputError,
          value && styles.fieldInputFilled,
        ]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        {selectedOption?.icon && (
          <View style={styles.fieldIconWrap}>
            <Ionicons name={selectedOption.icon} size={18} color={ACCENT} />
          </View>
        )}
        <Text style={[styles.selectTriggerText, !value && styles.selectPlaceholder]}>
          {selectedOption ? selectedOption.label : `Select ${label.toLowerCase()}...`}
        </Text>
        <View style={styles.selectChevronWrap}>
          <Ionicons name="chevron-expand" size={18} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={13} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Bottom Sheet Modal */}
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalSheet}>
            {/* Handle Bar */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Select {label}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    value === item.value && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    onValueChange(item.value);
                    setVisible(false);
                  }}
                  activeOpacity={0.6}
                >
                  {item.icon && (
                    <View style={[
                      styles.modalOptionIcon,
                      value === item.value && styles.modalOptionIconActive,
                    ]}>
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={value === item.value ? '#fff' : ACCENT}
                      />
                    </View>
                  )}
                  <Text style={[
                    styles.modalOptionText,
                    value === item.value && styles.modalOptionTextActive,
                  ]}>
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <Ionicons name="checkmark-circle" size={22} color={ACCENT} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});
SelectField.displayName = 'SelectField';

// Section Card wrapper for visual grouping
const SectionCard = React.memo(({ title, icon, subtitle, children }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionCardHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={18} color={ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionCardTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionCardSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.sectionCardBody}>
      {children}
    </View>
  </View>
));

// ==================== MAIN COMPONENT ====================
const CreateServiceScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const scrollRef = useRef(null);

  const editService = route?.params?.service;
  const isEditMode = !!editService;
  const [serviceLimitReached, setServiceLimitReached] = useState(false);

  // Check service limit on mount (create mode only)
  useEffect(() => {
    if (!isEditMode) {
      serviceService.getMyServices(1, 1).then((result) => {
        if (result.success) {
          const total = result.pagination?.total || result.data?.length || 0;
          if (total >= 3) setServiceLimitReached(true);
        }
      });
    }
  }, [isEditMode]);

  // Initialize form state with reducer
  const initialState = useMemo(() => createInitialState(editService), [editService]);
  const [formState, dispatch] = useReducer(formReducer, initialState);
  const { validateField } = useFormValidation();

  // Memoized callbacks
  const handleFieldChange = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const validateForm = useCallback(() => {
    const { data } = formState;
    const newErrors = {};

      // Validate required fields
      const requiredFields = ['title', 'description', 'category', 'serviceLocation', 'fullAddress', 'contactEmail'];
      requiredFields.forEach((field) => {
        const error = validateField(field, data[field]);
        if (error) newErrors[field] = error;
      });

      dispatch({ type: 'SET_ERRORS', errors: newErrors });
      return Object.keys(newErrors).length === 0;
    }, [formState, validateField]);

    // Capture user coordinates on mount for service location
    const [userCoords, setUserCoords] = useState(null);
    useEffect(() => {
      (async () => {
        try {
          const loc = await getCurrentLocation();
          if (loc) setUserCoords({ latitude: loc.latitude, longitude: loc.longitude });
        } catch (e) {
          console.warn('Could not get location for service:', e);
        }
      })();
    }, []);

    const transformServiceData = useCallback(() => {
      const { data } = formState;
      const serviceData = {
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        pricing: data.pricing.trim(),
        serviceLocation: data.serviceLocation.trim(),
        fullAddress: data.fullAddress.trim(),
        contactEmail: data.contactEmail.trim(),
        contactPhone: data.contactPhone.trim(),
        website: data.website.trim(),
        instagram: data.instagram.trim(),
        facebook: data.facebook.trim(),
        twitter: data.twitter.trim(),
        linkedin: data.linkedin.trim(),
      };
      if (userCoords) {
        serviceData.latitude = userCoords.latitude;
        serviceData.longitude = userCoords.longitude;
      }
      return serviceData;
    }, [formState, userCoords]);

    const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      scrollRef.current?.scrollToPosition(0, 0, true);
      return;
    }

    // Client-side limit check (create mode only)
    if (!isEditMode && serviceLimitReached) {
      Alert.alert('Limit Reached', 'You can create a maximum of 3 services. Please delete an existing service first.');
      return;
    }

    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      Keyboard.dismiss();

      const serviceData = transformServiceData();
      let result;

      if (isEditMode) {
        result = await serviceService.updateService(editService._id, serviceData);
      } else {
        result = await serviceService.createService(serviceData);
      }

      if (result?.success) {
        Alert.alert(
          isEditMode ? 'Update Submitted for Review' : 'Service Submitted',
          isEditMode
            ? 'Your changes have been submitted and are now pending admin review. Once approved, your updates will be visible to all users.'
            : 'Your service has been submitted and is pending admin approval. You\'ll be notified once it\'s live.',
          [
            {
              text: 'View My Services',
              onPress: () => navigation.navigate('Services'),
            },
          ]
        );
      } else {
        Alert.alert('Error', result?.error || 'Failed to save service');
      }
    } catch (error) {
      console.error('Error submitting service:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [validateForm, transformServiceData, isEditMode, editService, navigation, serviceLimitReached]);

  const handleCancel = useCallback(() => {
    const hasContent = formState.data.title.trim() || formState.data.description.trim();
    if (hasContent) {
      Alert.alert('Discard Changes?', 'Are you sure you want to discard your changes?', [
        { text: 'No', onPress: () => {} },
        {
          text: 'Yes',
          onPress: () => navigation.goBack(),
          style: 'destructive',
        },
      ]);
    } else {
      navigation.goBack();
    }
  }, [formState.data, navigation]);

  // Extract form data for cleaner usage
  const { data, errors, loading } = formState;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Service' : 'New Listing'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isEditMode ? 'Update your service details' : 'Create a new service listing'}
            </Text>
          </View>
          <View style={styles.headerBtn} />
        </View>

        {/* Form */}
        <ScrollView
          ref={scrollRef}
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Service Limit Banner */}
          {!isEditMode && serviceLimitReached && (
            <View style={styles.limitBanner}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.limitBannerTitle}>Service Limit Reached</Text>
                <Text style={styles.limitBannerText}>You can create a maximum of 3 services. Delete an existing service to create a new one.</Text>
              </View>
            </View>
          )}

          {/* ── Section 1: Basic Info ── */}
          <SectionCard
            title="Basic Information"
            icon="document-text"
            subtitle="Tell us about your service"
          >
            <InputField
              label="Service Title"
              icon="briefcase"
              placeholder="e.g., Professional Photography Services"
              value={data.title}
              onChangeText={(value) => handleFieldChange('title', value)}
              error={errors.title}
              required
              maxLength={200}
            />

            <SelectField
              label="Category"
              options={SERVICE_CATEGORIES}
              value={data.category}
              onValueChange={(value) => handleFieldChange('category', value)}
              error={errors.category}
              required
            />

            <InputField
              label="Description"
              icon="reader"
              placeholder="Describe what your service includes, who it's for, and what results clients can expect..."
              value={data.description}
              onChangeText={(value) => handleFieldChange('description', value)}
              multiline
              numberOfLines={6}
              error={errors.description}
              helperText="Provide a detailed description (minimum 50 characters recommended)"
              required
              maxLength={5000}
            />

            <InputField
              label="Pricing"
              icon="pricetag"
              placeholder="e.g., $50/hour, $200-500/project, Free consultation"
              value={data.pricing}
              onChangeText={(value) => handleFieldChange('pricing', value)}
              helperText="Describe your pricing structure (optional but recommended)"
            />
          </SectionCard>

          {/* ── Section 2: Location ── */}
          <SectionCard
            title="Location & Address"
            icon="location"
            subtitle="Where can clients find you?"
          >
            <InputField
              label="Service Location"
              icon="business"
              placeholder="e.g., Manhattan Studio, Remote, Home visits"
              value={data.serviceLocation}
              onChangeText={(value) => handleFieldChange('serviceLocation', value)}
              error={errors.serviceLocation}
              helperText="Where do you provide this service?"
              required
            />

            <InputField
              label="Full Address"
              icon="map"
              placeholder="e.g., 123 34th Street, New York, NY 10001"
              value={data.fullAddress}
              onChangeText={(value) => handleFieldChange('fullAddress', value)}
              error={errors.fullAddress}
              helperText="Business address shown to members & used for distance"
              required
            />
          </SectionCard>

          {/* ── Section 3: Contact ── */}
          <SectionCard
            title="Contact Information"
            icon="call"
            subtitle="How can clients reach you?"
          >
            <InputField
              label="Contact Email"
              icon="mail"
              placeholder="your@email.com"
              value={data.contactEmail}
              onChangeText={(value) => handleFieldChange('contactEmail', value)}
              error={errors.contactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />

            <InputField
              label="Contact Phone"
              icon="call"
              placeholder="(555) 123-4567"
              value={data.contactPhone}
              onChangeText={(value) => handleFieldChange('contactPhone', value)}
              keyboardType="phone-pad"
              helperText="Optional — recommended for faster communication"
            />
          </SectionCard>

          {/* ── Section 4: Online Presence ── */}
          <SectionCard
            title="Online Presence"
            icon="globe"
            subtitle="Optional — help clients learn more about you"
          >
            <InputField
              label="Website"
              icon="globe-outline"
              placeholder="https://yourwebsite.com"
              value={data.website}
              onChangeText={(value) => handleFieldChange('website', value)}
              keyboardType="url"
              autoCapitalize="none"
            />

            <InputField
              label="Instagram"
              icon="logo-instagram"
              placeholder="@yourusername"
              value={data.instagram}
              onChangeText={(value) => handleFieldChange('instagram', value)}
              autoCapitalize="none"
            />

            <InputField
              label="Facebook"
              icon="logo-facebook"
              placeholder="facebook.com/yourpage"
              value={data.facebook}
              onChangeText={(value) => handleFieldChange('facebook', value)}
              autoCapitalize="none"
            />

            <InputField
              label="Twitter / X"
              icon="logo-twitter"
              placeholder="@yourhandle"
              value={data.twitter}
              onChangeText={(value) => handleFieldChange('twitter', value)}
              autoCapitalize="none"
            />

            <InputField
              label="LinkedIn"
              icon="logo-linkedin"
              placeholder="linkedin.com/in/yourprofile"
              value={data.linkedin}
              onChangeText={(value) => handleFieldChange('linkedin', value)}
              autoCapitalize="none"
            />
          </SectionCard>

          {/* ── Verification Info Box ── */}
          <View style={styles.infoBox}>
            <View style={styles.infoIconCircle}>
              <Ionicons name="shield-checkmark" size={20} color={ACCENT} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Verification Process</Text>
              <View style={styles.infoList}>
                <View style={styles.infoListRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.infoListItem}>Your service will be reviewed within 1–2 business days</Text>
                </View>
                <View style={styles.infoListRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.infoListItem}>We verify provider identity and service legitimacy</Text>
                </View>
                <View style={styles.infoListRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.infoListItem}>Once approved, your service will be visible to all members</Text>
                </View>
                <View style={styles.infoListRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.infoListItem}>You'll receive a notification when your listing is live</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom spacer */}
          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[ACCENT, ACCENT_DARK]}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>
                    {isEditMode ? 'Update Service' : 'Submit for Verification'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ─── Layout ──────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#F4F3F8',
  },
  keyboardAvoid: {
    flex: 1,
  },

  // ─── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text || '#1A1A2E',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // ─── Form Scroll ─────────────────────────────────────────
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },

  // ─── Section Cards ────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 4,
    gap: 12,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text || '#1A1A2E',
    letterSpacing: -0.2,
  },
  sectionCardSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  sectionCardBody: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
  },

  // ─── Field Group ──────────────────────────────────────────
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary || '#555',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  required: {
    color: Colors.error || '#DC2626',
    fontWeight: '700',
  },

  // ─── Text Input ───────────────────────────────────────────
  fieldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    minHeight: 48,
  },
  fieldMultilineWrap: {
    minHeight: 120,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  fieldInputFilled: {
    borderColor: `${ACCENT}40`,
    backgroundColor: '#FDFBFE',
  },
  fieldInputError: {
    borderColor: Colors.error || '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  fieldIconWrap: {
    width: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 0 : 2,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text || '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    lineHeight: 20,
  },
  fieldInputWithIcon: {
    paddingLeft: 0,
  },
  fieldMultilineInput: {
    textAlignVertical: 'top',
    minHeight: 100,
  },

  // ─── Helper / Error text ──────────────────────────────────
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
    paddingLeft: 2,
  },
  helperText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
    paddingLeft: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: Colors.error || '#DC2626',
    fontWeight: '500',
  },

  // ─── Select Trigger ───────────────────────────────────────
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    minHeight: 48,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text || '#1A1A2E',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectPlaceholder: {
    color: '#B0B0B0',
  },
  selectChevronWrap: {
    paddingRight: 14,
  },

  // ─── Modal Bottom Sheet ───────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text || '#1A1A2E',
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  modalOptionActive: {
    backgroundColor: ACCENT_LIGHT,
  },
  modalOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: `${ACCENT}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modalOptionIconActive: {
    backgroundColor: ACCENT,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text || '#1A1A2E',
    fontWeight: '500',
  },
  modalOptionTextActive: {
    fontWeight: '700',
    color: ACCENT,
  },

  // ─── Info Box ─────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    gap: 14,
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${ACCENT}25`,
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: ACCENT, shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 10,
  },
  infoList: {
    gap: 8,
  },
  infoListRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACCENT,
    marginTop: 6,
  },
  infoListItem: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary || '#555',
    lineHeight: 18,
  },

  // ─── Footer ───────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: -3 }, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
  cancelBtn: {
    flex: 0.4,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 0.6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  limitBanner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    marginBottom: 16,
  },
  limitBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  limitBannerText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 17,
  },
});

export default CreateServiceScreen;
