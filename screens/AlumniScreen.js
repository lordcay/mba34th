import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import logo2 from '../assets/logo1.png';
import { getRegistrationProgress } from '../registrationUtils';

const ACCENT = '#581845';
const ACCENT_LIGHT = '#f5edf8';
const GOLD = '#ffb60a';

const DEGREE_OPTIONS = [
  'Bachelor of Arts (BA)',
  'Bachelor of Science (BSc)',
  'Bachelor of Engineering (BEng)',
  'Bachelor of Commerce (BCom)',
  'Bachelor of Laws (LLB)',
  'Bachelor of Education (BEd)',
  'Bachelor of Medicine (MBBS)',
  'Master of Business Administration (MBA)',
  'Master of Science (MSc)',
  'Master of Arts (MA)',
  'Master of Engineering (MEng)',
  'Master of Laws (LLM)',
  'Master of Finance (MFin)',
  'Master of Public Health (MPH)',
  'Master of Public Policy (MPP)',
  'Master of Information Systems (MIS)',
  'Doctor of Philosophy (PhD)',
  'Doctor of Medicine (MD)',
  'Doctor of Business Administration (DBA)',
  'Postgraduate Diploma (PGDip)',
  'Higher National Diploma (HND)',
  'Associate Degree',
  'Other',
];

const AlumniScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  // Name from NameScreen (read-only, sourced from registration progress)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameLoaded, setNameLoaded] = useState(false);

  // Form state
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [schoolGraduatedFrom, setSchoolGraduatedFrom] = useState('');
  const [degreeHeld, setDegreeHeld] = useState('');
  const [linkedIn, setLinkedIn] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [degreeModalVisible, setDegreeModalVisible] = useState(false);
  const [degreeSearch, setDegreeSearch] = useState('');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Password visibility
  const [secureEntry, setSecureEntry] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,
      headerTitle: '',
      headerBackTitle: 'Back',
      headerBackTitleVisible: true,
      headerStyle: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: ACCENT,
      headerShadowVisible: false,
    });
  }, [navigation]);

  // Load firstName/lastName from NameScreen registration progress
  useEffect(() => {
    getRegistrationProgress('Name').then((data) => {
      if (data?.firstName) setFirstName(data.firstName);
      if (data?.lastName) setLastName(data.lastName);
      setNameLoaded(true);
    }).catch(() => setNameLoaded(true));
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Field validation
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    delete newErrors[field];

    switch (field) {
      case 'gender':
        if (!value) newErrors.gender = 'Gender is required';
        break;
      case 'phone':
        if (!value.trim()) newErrors.phone = 'Phone number is required';
        break;
      case 'personalEmail':
        if (!value.trim()) newErrors.personalEmail = 'Personal email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          newErrors.personalEmail = 'Enter a valid email address';
        break;
      case 'workEmail':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          newErrors.workEmail = 'Enter a valid email address';
        break;
      case 'schoolGraduatedFrom':
        if (!value.trim()) newErrors.schoolGraduatedFrom = 'School is required';
        break;
      case 'degreeHeld':
        if (!value.trim()) newErrors.degreeHeld = 'Degree is required';
        break;
      case 'linkedIn':
        if (!value.trim()) newErrors.linkedIn = 'LinkedIn URL is required';
        else if (!value.includes('linkedin.com'))
          newErrors.linkedIn = 'Enter a valid LinkedIn URL';
        break;
      case 'password':
        if (!value) newErrors.password = 'Password is required';
        else if (value.length < 6) newErrors.password = 'Password must be at least 6 characters';
        break;
      case 'confirmPassword':
        if (!value) newErrors.confirmPassword = 'Please confirm your password';
        else if (value !== password) newErrors.confirmPassword = 'Passwords do not match';
        break;
    }

    setErrors(newErrors);
    return !newErrors[field];
  };

  const validateAll = () => {
    let valid = true;
    const newErrors = {};

    if (!gender) { newErrors.gender = 'Gender is required'; valid = false; }
    if (!phone.trim()) { newErrors.phone = 'Phone number is required'; valid = false; }
    if (!personalEmail.trim()) { newErrors.personalEmail = 'Personal email is required'; valid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalEmail)) { newErrors.personalEmail = 'Enter a valid email'; valid = false; }
    if (workEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) { newErrors.workEmail = 'Enter a valid email'; valid = false; }
    if (!schoolGraduatedFrom.trim()) { newErrors.schoolGraduatedFrom = 'School is required'; valid = false; }
    if (!degreeHeld.trim()) { newErrors.degreeHeld = 'Degree is required'; valid = false; }
    if (!linkedIn.trim()) { newErrors.linkedIn = 'LinkedIn URL is required'; valid = false; }
    else if (!linkedIn.includes('linkedin.com')) { newErrors.linkedIn = 'Enter a valid LinkedIn URL'; valid = false; }
    if (!password) { newErrors.password = 'Password is required'; valid = false; }
    else if (password.length < 6) { newErrors.password = 'Must be at least 6 characters'; valid = false; }
    if (!confirmPassword) { newErrors.confirmPassword = 'Please confirm your password'; valid = false; }
    else if (confirmPassword !== password) { newErrors.confirmPassword = 'Passwords do not match'; valid = false; }

    setErrors(newErrors);
    return valid;
  };

  // Submit — validate, send OTP, show modal
  const handleSubmit = async () => {
    if (!validateAll()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields correctly.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    Keyboard.dismiss();
    setOtpLoading(true);
    try {
      await api.post('/alumni-requests/send-otp', {
        personalEmail: personalEmail.trim(),
        firstName: firstName.trim(),
      });
      setOtpSent(true);
      setOtpCode('');
      setOtpTimer(60);
      setOtpModalVisible(true);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to send verification code.';
      Alert.alert('Error', msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Verify OTP then submit full application
  const handleOtpVerifyAndSubmit = async () => {
    if (otpCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setOtpLoading(true);
    try {
      const verifyRes = await api.post('/alumni-requests/verify-otp', {
        personalEmail: personalEmail.trim(),
        otp: otpCode,
      });

      if (!verifyRes.data?.verified) {
        Alert.alert('Verification Failed', 'Could not verify the code. Please try again.');
        return;
      }

      setOtpVerified(true);
      setSubmitting(true);

      await api.post('/alumni-requests/submit', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        phone: phone.trim(),
        personalEmail: personalEmail.trim(),
        workEmail: workEmail.trim(),
        schoolGraduatedFrom: schoolGraduatedFrom.trim(),
        degreeHeld: degreeHeld.trim(),
        linkedIn: linkedIn.trim(),
        password,
        confirmPassword,
      });

      setOtpModalVisible(false);
      setSubmitSuccess(true);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Verification failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setOtpLoading(false);
      setSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setOtpLoading(true);
    try {
      await api.post('/alumni-requests/send-otp', {
        personalEmail: personalEmail.trim(),
        firstName: firstName.trim(),
      });
      setOtpCode('');
      setOtpTimer(60);
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to resend code.';
      Alert.alert('Error', msg);
    } finally {
      setOtpLoading(false);
    }
  };

  // Success screen
  if (submitSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={80} color={ACCENT} />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successText}>
            Thank you for your interest in joining 34th Street as an alumni/professional. Our team will review your profile within{' '}
            <Text style={{ fontWeight: '700' }}>3–5 working days</Text>.
          </Text>
          <Text style={styles.successSubtext}>
            A confirmation email has been sent to your personal email address. Once approved, you'll receive
            instructions to activate your account.
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.successButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderInput = (label, value, onChangeText, placeholder, options = {}) => {
    const { field, keyboardType, autoCapitalize, secureTextEntry, toggleSecure, multiline, optional } = options;
    const hasError = field && errors[field];

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>
          {label}{' '}
          {optional
            ? <Text style={styles.optionalTag}>(Optional)</Text>
            : <Text style={styles.requiredStar}>*</Text>}
        </Text>
        <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
          <TextInput
            value={value}
            onChangeText={(text) => {
              onChangeText(text);
              if (field && errors[field]) {
                const ne = { ...errors };
                delete ne[field];
                setErrors(ne);
              }
            }}
            onBlur={() => field && validateField(field, value)}
            placeholder={placeholder}
            placeholderTextColor="#999"
            style={[styles.input, multiline && styles.inputMultiline]}
            keyboardType={keyboardType || 'default'}
            autoCapitalize={autoCapitalize || 'sentences'}
            secureTextEntry={secureTextEntry}
            multiline={multiline}
          />
          {toggleSecure && (
            <TouchableOpacity onPress={toggleSecure} style={styles.eyeButton}>
              <Ionicons name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
        {hasError && <Text style={styles.fieldError}>{errors[field]}</Text>}
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <Image source={logo2} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.headerTitle}>Alumni / Professional</Text>
              <Text style={styles.headerSubtitle}>Apply to join 34th Street</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '40%' }]} />
              </View>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={ACCENT} />
              <Text style={styles.infoBannerText}>
                Graduated students and professionals can apply here. Our team will review your application
                within 3–5 working days.
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Personal Info Section */}
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={18} color={ACCENT} />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              {/* Name pulled from NameScreen — shown as confirmation tag */}
              <View style={styles.nameTag}>
                <Ionicons name="person-circle-outline" size={20} color={ACCENT} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.nameTagLabel}>Your Name (from previous step)</Text>
                  <Text style={styles.nameTagValue}>
                    {nameLoaded
                      ? (firstName || lastName
                          ? `${firstName} ${lastName}`.trim()
                          : 'Not found — please go back and enter your name')
                      : 'Loading...'}
                  </Text>
                </View>
              </View>

              {/* Gender Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Gender <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, styles.selectorWrapper, errors.gender && styles.inputWrapperError]}
                  onPress={() => setGenderModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.selectorText, !gender && styles.selectorPlaceholder]}>
                    {gender || 'Select gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#888" />
                </TouchableOpacity>
                {errors.gender && <Text style={styles.fieldError}>{errors.gender}</Text>}
              </View>

              {renderInput('Phone Number', phone, setPhone, 'Enter your phone number', {
                field: 'phone',
                keyboardType: 'phone-pad',
              })}

              {/* Email Section */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="mail-outline" size={18} color={ACCENT} />
                <Text style={styles.sectionTitle}>Email</Text>
              </View>

              {renderInput('Personal Email', personalEmail, setPersonalEmail, 'your.name@gmail.com', {
                field: 'personalEmail',
                keyboardType: 'email-address',
                autoCapitalize: 'none',
              })}

              {renderInput('Alumni / Work Email', workEmail, setWorkEmail, 'your.name@company.com', {
                field: 'workEmail',
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                optional: true,
              })}

              {/* Academic Section */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="school-outline" size={18} color={ACCENT} />
                <Text style={styles.sectionTitle}>Academic & Professional</Text>
              </View>

              {renderInput('School Graduated From', schoolGraduatedFrom, setSchoolGraduatedFrom, 'e.g., Harvard Business School', {
                field: 'schoolGraduatedFrom',
              })}

              {/* Degree Held — modern dropdown */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Degree Held <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, styles.selectorWrapper, errors.degreeHeld && styles.inputWrapperError]}
                  onPress={() => { setDegreeSearch(''); setDegreeModalVisible(true); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.selectorText, !degreeHeld && styles.selectorPlaceholder]}>
                    {degreeHeld || 'Select degree'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#888" />
                </TouchableOpacity>
                {errors.degreeHeld && <Text style={styles.fieldError}>{errors.degreeHeld}</Text>}
              </View>
              {renderInput('LinkedIn Profile URL', linkedIn, setLinkedIn, 'https://linkedin.com/in/your-profile', {
                field: 'linkedIn',
                keyboardType: 'url',
                autoCapitalize: 'none',
              })}

              {/* Password Section */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={ACCENT} />
                <Text style={styles.sectionTitle}>Create Password</Text>
              </View>

              {renderInput('Password', password, setPassword, 'Min 6 characters', {
                field: 'password',
                secureTextEntry: secureEntry,
                toggleSecure: () => setSecureEntry(!secureEntry),
              })}
              {renderInput('Confirm Password', confirmPassword, setConfirmPassword, 'Re-enter your password', {
                field: 'confirmPassword',
                secureTextEntry: secureConfirm,
                toggleSecure: () => setSecureConfirm(!secureConfirm),
              })}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, otpLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={otpLoading}
                activeOpacity={0.8}
              >
                {otpLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Application</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.footerNote}>
                Already have an account?{' '}
                <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
                  Sign In
                </Text>
              </Text>
            </View>
          </ScrollView>

          {/* OTP Verification Modal */}
          <Modal
            visible={otpModalVisible}
            animationType="fade"
            transparent
            onRequestClose={() => {
              if (!submitting) setOtpModalVisible(false);
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.otpModalOverlay}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.otpModalCard}>
                  <View style={styles.otpModalHeader}>
                    <View style={styles.otpModalIconWrap}>
                      <Ionicons name="shield-checkmark-outline" size={32} color={ACCENT} />
                    </View>
                    <Text style={styles.otpModalTitle}>Verify Your Email</Text>
                    <Text style={styles.otpModalSubtitle}>
                      We've sent a 6-digit code to{' '}
                      <Text style={{ fontWeight: '700', color: ACCENT }}>{personalEmail}</Text>
                    </Text>
                  </View>

                  <TextInput
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="000000"
                    placeholderTextColor="#ccc"
                    style={styles.otpModalInput}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />

                  <TouchableOpacity
                    style={[styles.otpModalVerifyBtn, (otpLoading || submitting) && styles.otpButtonDisabled]}
                    onPress={handleOtpVerifyAndSubmit}
                    disabled={otpLoading || submitting}
                    activeOpacity={0.8}
                  >
                    {otpLoading || submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.otpModalVerifyBtnText}>Verify & Submit</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={otpTimer > 0 || otpLoading}
                    activeOpacity={0.7}
                    style={styles.otpModalResendBtn}
                  >
                    <Text style={[styles.resendText, otpTimer > 0 && styles.resendTextDisabled]}>
                      {otpTimer > 0 ? `Resend code in ${otpTimer}s` : 'Resend verification code'}
                    </Text>
                  </TouchableOpacity>

                  {!submitting && (
                    <TouchableOpacity
                      onPress={() => setOtpModalVisible(false)}
                      activeOpacity={0.7}
                      style={styles.otpModalCancelBtn}
                    >
                      <Text style={styles.otpModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </Modal>

          {/* Gender Modal */}
          <Modal visible={genderModalVisible} animationType="slide" transparent onRequestClose={() => setGenderModalVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setGenderModalVisible(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={[styles.modalCard, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.modalTopRow}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                <TouchableOpacity onPress={() => setGenderModalVisible(false)}>
                  <Text style={styles.modalCancel}>Done</Text>
                </TouchableOpacity>
              </View>
              {['Male', 'Female', 'Non-binary'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.genderOption, gender === option && styles.genderOptionSelected]}
                  onPress={() => {
                    setGender(option);
                    setErrors((prev) => { const e = { ...prev }; delete e.gender; return e; });
                    setGenderModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genderOptionText, gender === option && styles.genderOptionTextSelected]}>
                    {option}
                  </Text>
                  {gender === option && <Ionicons name="checkmark" size={20} color={ACCENT} />}
                </TouchableOpacity>
              ))}
            </View>
          </Modal>

          {/* Degree Held Modal */}
          <Modal visible={degreeModalVisible} animationType="slide" transparent onRequestClose={() => setDegreeModalVisible(false)}>
            <TouchableWithoutFeedback onPress={() => setDegreeModalVisible(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={[styles.degreeSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.modalTopRow}>
                <Text style={styles.modalTitle}>Select Degree</Text>
                <TouchableOpacity onPress={() => setDegreeModalVisible(false)}>
                  <Text style={styles.modalCancel}>Done</Text>
                </TouchableOpacity>
              </View>
              {/* Search */}
              <View style={styles.degreeSearchWrap}>
                <Ionicons name="search-outline" size={16} color="#999" style={{ marginRight: 8 }} />
                <TextInput
                  value={degreeSearch}
                  onChangeText={setDegreeSearch}
                  placeholder="Search degree..."
                  placeholderTextColor="#bbb"
                  style={styles.degreeSearchInput}
                  autoCapitalize="none"
                />
                {degreeSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setDegreeSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color="#ccc" />
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={DEGREE_OPTIONS.filter(d => d.toLowerCase().includes(degreeSearch.toLowerCase()))}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.degreeOption, degreeHeld === item && styles.degreeOptionSelected]}
                    onPress={() => {
                      setDegreeHeld(item);
                      setErrors((prev) => { const e = { ...prev }; delete e.degreeHeld; return e; });
                      setDegreeModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.degreeOptionText, degreeHeld === item && styles.degreeOptionTextSelected]}>
                      {item}
                    </Text>
                    {degreeHeld === item && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f5f5f5' }} />}
              />
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default AlumniScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, paddingBottom: 40 },

  header: {
    backgroundColor: ACCENT,
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    padding: 36,
    alignItems: 'center',
  },
  logoWrapper: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 60,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: 8,
  },
  logo: { width: 100, height: 65, marginBottom: 5 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 4 },
  headerSubtitle: { fontSize: 13, color: GOLD, marginTop: 3 },
  progressContainer: {
    height: 6,
    width: '80%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: GOLD, borderRadius: 3 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ACCENT_LIGHT,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  infoBannerText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },

  formContainer: { paddingHorizontal: 20, paddingTop: 8 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: ACCENT },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  requiredStar: { color: '#e11d48', fontSize: 13 },
  optionalTag: { fontSize: 12, fontWeight: '400', color: '#999' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    paddingHorizontal: 14,
  },
  inputWrapperError: { borderColor: '#e11d48', backgroundColor: '#fef2f2' },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
  },
  inputMultiline: { minHeight: 60, textAlignVertical: 'top' },
  eyeButton: { paddingLeft: 8, paddingVertical: 8 },
  fieldError: { fontSize: 12, color: '#e11d48', marginTop: 4, marginLeft: 2 },

  selectorWrapper: {
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
  },
  selectorText: { fontSize: 15, color: '#111', flex: 1 },
  selectorPlaceholder: { color: '#999' },

  // OTP Modal
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  otpModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  otpModalHeader: { alignItems: 'center', marginBottom: 24 },
  otpModalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpModalTitle: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 8 },
  otpModalSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  otpModalInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#fafafa',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 13,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    color: ACCENT,
    marginBottom: 20,
  },
  otpModalVerifyBtn: {
    width: '100%',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  otpModalVerifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  otpModalResendBtn: { marginTop: 16 },
  otpModalCancelBtn: { marginTop: 12, paddingVertical: 8 },
  otpModalCancelText: { fontSize: 15, fontWeight: '600', color: '#999' },
  otpButtonDisabled: { opacity: 0.6 },
  resendText: { fontSize: 13, color: ACCENT, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  resendTextDisabled: { color: '#999' },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  footerNote: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 16 },
  footerLink: { color: ACCENT, fontWeight: '700' },

  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIconWrap: { marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '700', color: ACCENT, marginBottom: 12, textAlign: 'center' },
  successText: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  successSubtext: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  successButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  modalCancel: { color: ACCENT, fontWeight: '800', fontSize: 14 },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1.5,
    borderColor: '#f0f0f0',
  },
  genderOptionSelected: { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT },
  genderOptionText: { fontSize: 16, fontWeight: '600', color: '#333' },
  genderOptionTextSelected: { color: ACCENT },

  // Name tag (shows name read from NameScreen)
  nameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5d5ec',
  },
  nameTagLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
  nameTagValue: { fontSize: 15, fontWeight: '700', color: ACCENT },

  // Degree dropdown sheet
  degreeSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  degreeSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  degreeSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  degreeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  degreeOptionSelected: { backgroundColor: ACCENT_LIGHT, borderRadius: 8, paddingHorizontal: 10 },
  degreeOptionText: { fontSize: 15, color: '#333', flex: 1 },
  degreeOptionTextSelected: { color: ACCENT, fontWeight: '700' },
});
