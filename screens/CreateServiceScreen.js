import React, { useState, useContext, useRef, useReducer, useCallback, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import serviceService from '../services/service.service';
import Colors from '../constants/Colors';

const FallbackImage = require('../assets/icon.png');

const ACCENT = Colors.primary || '#581845';

// Service categories for dropdown
const SERVICE_CATEGORIES = [
  { value: 'consulting', label: 'Consulting' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'design', label: 'Design' },
  { value: 'tech', label: 'Tech & IT' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'creative', label: 'Creative' },
  { value: 'business', label: 'Business' },
  { value: 'trade', label: 'Trade' },
  { value: 'event', label: 'Event Services' },
];

// US States for location
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

// ==================== FORM VALIDATION HOOK ====================
const useFormValidation = () => {
  const validateField = useCallback((name, value, allValues = {}) => {
    const trimmed = value?.trim?.() || '';
    switch (name) {
      case 'title':
        return !trimmed ? 'Service title is required' : '';
      case 'description':
        return !trimmed ? 'Service description is required' : '';
      case 'category':
        return !value ? 'Category is required' : '';
      case 'city':
        return !trimmed ? 'City is required' : '';
      case 'state':
        return !value ? 'State is required' : '';
      case 'pricing':
        const hasHourly = allValues.hourlyRate && parseFloat(allValues.hourlyRate) > 0;
        const hasBase = allValues.basePrice && parseFloat(allValues.basePrice) > 0;
        return !hasHourly && !hasBase ? 'Please enter hourly rate or base price' : '';
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
    subcategory: editService?.subcategory || '',
    hourlyRate: editService?.hourlyRate?.toString() || '',
    basePrice: editService?.basePrice?.toString() || '',
    city: editService?.city || '',
    state: editService?.state || '',
    experience: editService?.experience || '',
    skills: editService?.skills || [],
  },
  errors: {},
  loading: false,
});

// ==================== MEMOIZED COMPONENTS ====================
const InputField = React.memo(({
  label,
  icon,
  multiline = false,
  error,
  required = false,
  helperText,
  ...props
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>
      {icon && <Ionicons name={icon} size={14} color={Colors.textSecondary} />}
      {icon && ' '}{label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View style={[styles.inputWrapper, error && styles.inputError, multiline && styles.multilineWrapper]}>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
    {helperText && <Text style={styles.helperText}>{helperText}</Text>}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
));
InputField.displayName = 'InputField';

const SelectField = React.memo(({ label, options, value, onValueChange, error, required = false }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <View style={styles.selectContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.selectField, error && styles.inputError]}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
          {value ? options.find((opt) => opt.value === value)?.label : `Select ${label}...`}
        </Text>
        <Ionicons
          name={showDropdown ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textSecondary}
        />
      </TouchableOpacity>

      {showDropdown && (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.dropdownItem, value === option.value && styles.dropdownItemActive]}
              onPress={() => {
                onValueChange(option.value);
                setShowDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  value === option.value && styles.dropdownItemTextActive,
                ]}
              >
                {option.label}
              </Text>
              {value === option.value && <Ionicons name="checkmark" size={20} color={ACCENT} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});
SelectField.displayName = 'SelectField';

const SkillsInput = React.memo(({ skills, onChange }) => {
  const [newSkill, setNewSkill] = useState('');

  const handleAddSkill = useCallback(() => {
    if (newSkill.trim() && skills.length < 10) {
      onChange([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  }, [newSkill, skills, onChange]);

  const handleRemoveSkill = useCallback((index) => {
    onChange(skills.filter((_, i) => i !== index));
  }, [skills, onChange]);

  return (
    <View style={styles.skillsContainer}>
      <Text style={styles.inputLabel}>Skills & Expertise</Text>
      <View style={styles.skillsInputRow}>
        <TextInput
          style={styles.skillsInput}
          placeholder="Add a skill..."
          placeholderTextColor={Colors.textMuted}
          value={newSkill}
          onChangeText={setNewSkill}
        />
        <TouchableOpacity
          style={styles.skillsAddBtn}
          onPress={handleAddSkill}
          disabled={!newSkill.trim()}
        >
          <Ionicons name="add" size={20} color={newSkill.trim() ? ACCENT : Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {skills.length > 0 && (
        <View style={styles.skillsList}>
          {skills.map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
              <TouchableOpacity onPress={() => handleRemoveSkill(index)}>
                <Ionicons name="close" size={16} color={ACCENT} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});
SkillsInput.displayName = 'SkillsInput';

// ==================== MAIN COMPONENT ====================
const CreateServiceScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const scrollRef = useRef(null);

  const editService = route?.params?.service;
  const isEditMode = !!editService;

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

    // Validate each field
    Object.keys(data).forEach((field) => {
      if (field === 'skills') return; // Skip skills array
      const error = validateField(field, data[field], data);
      if (error) newErrors[field] = error;
    });

    // Validate pricing separately
    const pricingError = validateField('pricing', '', data);
    if (pricingError) newErrors.pricing = pricingError;

    dispatch({ type: 'SET_ERRORS', errors: newErrors });
    return Object.keys(newErrors).length === 0;
  }, [formState, validateField]);

  const transformServiceData = useCallback(() => {
    const { data } = formState;
    return {
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      subcategory: data.subcategory,
      hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
      basePrice: data.basePrice ? parseFloat(data.basePrice) : null,
      city: data.city.trim(),
      state: data.state,
      experience: data.experience,
      skills: data.skills,
    };
  }, [formState]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      scrollRef.current?.scrollToPosition(0, 0, true);
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
          'Success',
          result.message || (isEditMode ? 'Service updated successfully' : 'Service created and pending admin approval'),
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('MyServices'),
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
  }, [validateForm, transformServiceData, isEditMode, editService, navigation]);

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
          <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Service' : 'Create Service'}
          </Text>
          <View style={styles.headerBtn} />
        </View>

        {/* Form */}
        <ScrollView
          ref={scrollRef}
          style={styles.form}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="information-circle" size={18} color={ACCENT} /> Basic Information
            </Text>

            <InputField
              label="Service Title"
              icon="briefcase"
              placeholder="e.g., Senior React Development Consulting"
              value={data.title}
              onChangeText={(value) => handleFieldChange('title', value)}
              error={errors.title}
              required
            />

            <InputField
              label="Description"
              icon="document-text"
              placeholder="Describe what your service includes, who it's for, and what results clients can expect..."
              value={data.description}
              onChangeText={(value) => handleFieldChange('description', value)}
              multiline
              numberOfLines={5}
              error={errors.description}
              required
            />
          </View>

          {/* Section: Category & Expertise */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="grid" size={18} color={ACCENT} /> Category & Expertise
            </Text>

            <SelectField
              label="Service Category"
              options={SERVICE_CATEGORIES}
              value={data.category}
              onValueChange={(value) => handleFieldChange('category', value)}
              error={errors.category}
              required
            />

            <InputField
              label="Years of Experience"
              icon="time"
              placeholder="e.g., 8 years"
              value={data.experience}
              onChangeText={(value) => handleFieldChange('experience', value)}
            />

            <SkillsInput 
              skills={data.skills} 
              onChange={(skills) => handleFieldChange('skills', skills)}
            />
          </View>

          {/* Section: Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="cash" size={18} color={ACCENT} /> Pricing
            </Text>

            <View style={styles.twoColumnRow}>
              <InputField
                label="Hourly Rate"
                icon="time"
                placeholder="$50"
                value={data.hourlyRate}
                onChangeText={(value) => handleFieldChange('hourlyRate', value)}
                keyboardType="decimal-pad"
              />
              <InputField
                label="Base Price"
                icon="pricetag"
                placeholder="$500"
                value={data.basePrice}
                onChangeText={(value) => handleFieldChange('basePrice', value)}
                keyboardType="decimal-pad"
              />
            </View>

            {errors.pricing && (
              <Text style={styles.errorText}>{errors.pricing}</Text>
            )}

            <Text style={styles.helperText}>
              Enter either hourly rate or base price (or both)
            </Text>
          </View>

          {/* Section: Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={18} color={ACCENT} /> Service Location
            </Text>

            <View style={styles.twoColumnRow}>
              <InputField
                label="City"
                icon="location"
                placeholder="e.g., New York"
                value={data.city}
                onChangeText={(value) => handleFieldChange('city', value)}
                error={errors.city}
                required
              />
              <SelectField
                label="State"
                options={useMemo(() => US_STATES.map((s) => ({ value: s, label: s })), [])}
                value={data.state}
                onValueChange={(value) => handleFieldChange('state', value)}
                error={errors.state}
                required
              />
            </View>
          </View>

          {/* Section: Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={ACCENT} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Admin Approval Required</Text>
              <Text style={styles.infoText}>
                Your service will be reviewed by our admin team before appearing on the public Services feed. You'll receive
                a notification once it's approved or if revisions are needed.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={[ACCENT, '#900C3F']}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isEditMode ? 'Update Service' : 'Create Service'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#f8f7f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  headerBtn: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: '#e53e3e',
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  multilineWrapper: {
    minHeight: 100,
    paddingVertical: 12,
  },
  input: {
    fontSize: 14,
    color: Colors.text,
  },
  multilineInput: {
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#e53e3e',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  selectContainer: {
    marginBottom: 16,
  },
  selectField: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectPlaceholder: {
    color: Colors.textMuted,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    marginTop: 0,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#f0e8f8',
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: ACCENT,
  },
  skillsContainer: {
    marginBottom: 16,
  },
  skillsInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  skillsInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.text,
    height: 44,
  },
  skillsAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skillText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
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
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  submitBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CreateServiceScreen;
