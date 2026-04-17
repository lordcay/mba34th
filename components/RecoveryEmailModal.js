import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import Modal from 'react-native-modal';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const STEPS = { EMAIL: 'email', OTP: 'otp', SUCCESS: 'success' };
const OTP_LENGTH = 6;
const COOLDOWN_SECONDS = 30;
const DISMISS_KEY = 'recovery_email_dismissed_at';

const RecoveryEmailModal = ({ visible, onClose, isReminder = false }) => {
  const { user, updateUser } = useContext(AuthContext);
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(STEPS.EMAIL);
      setEmail('');
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      setCooldown(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    // Don't allow school email as recovery
    if (user?.email && trimmed === user.email.toLowerCase()) {
      setError('Recovery email must be different from your school email');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/accounts/recovery-email/send-otp', { recoveryEmail: trimmed });
      setStep(STEPS.OTP);
      setCooldown(COOLDOWN_SECONDS);
      Toast.show({ type: 'success', text1: 'OTP sent!', text2: `Check ${trimmed} for the verification code` });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    // Handle paste of full OTP
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      digits.forEach((d, i) => { if (i < OTP_LENGTH) newOtp[i] = d; });
      setOtp(newOtp);
      const lastIdx = Math.min(digits.length, OTP_LENGTH) - 1;
      inputRefs.current[lastIdx]?.focus();
      return;
    }
    newOtp[index] = text.replace(/\D/g, '');
    setOtp(newOtp);
    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await api.post('/accounts/recovery-email/verify-otp', { otp: code });
      if (res.data?.user) {
        await updateUser(res.data.user);
      }
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/accounts/recovery-email/send-otp', { recoveryEmail: email.trim().toLowerCase() });
      setCooldown(COOLDOWN_SECONDS);
      Toast.show({ type: 'success', text1: 'OTP resent!' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await api.post('/accounts/recovery-email/dismiss');
      await AsyncStorage.setItem(DISMISS_KEY, new Date().toISOString());
      if (updateUser) {
        updateUser({ recoveryEmailDismissedAt: new Date().toISOString() });
      }
    } catch {}
    onClose();
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={isReminder ? handleDismiss : onClose}
      onBackButtonPress={isReminder ? handleDismiss : onClose}
      style={styles.modal}
      backdropOpacity={0.5}
      useNativeDriver
      useNativeDriverForBackdrop
      avoidKeyboard
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={step === STEPS.SUCCESS ? 'checkmark-circle' : 'shield-checkmark'}
                size={32}
                color="#fff"
              />
            </View>
            <Text style={styles.title}>
              {step === STEPS.EMAIL && 'Set Up Recovery Email'}
              {step === STEPS.OTP && 'Verify Your Email'}
              {step === STEPS.SUCCESS && 'All Set!'}
            </Text>
            <Text style={styles.subtitle}>
              {step === STEPS.EMAIL &&
                'Add a personal email so you can still log in after graduation when your school email expires.'}
              {step === STEPS.OTP &&
                `We sent a 6-digit code to ${email}. Check your inbox (and spam folder).`}
              {step === STEPS.SUCCESS &&
                `Your recovery email has been verified. You can now use ${email} to log in anytime.`}
            </Text>
          </View>

          {/* Step: Email */}
          {step === STEPS.EMAIL && (
            <View style={styles.body}>
              <Text style={styles.inputLabel}>Personal Email</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="your.personal@email.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              {isReminder && (
                <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
                  <Text style={styles.dismissText}>Remind me later</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Step: OTP */}
          {step === STEPS.OTP && (
            <View style={styles.body}>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => (inputRefs.current[i] = ref)}
                    style={[styles.otpInput, digit ? styles.otpFilled : null, error ? styles.otpError : null]}
                    value={digit}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={(e) => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={i === 0}
                  />
                ))}
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendOtp}
                disabled={cooldown > 0}
              >
                <Text style={[styles.resendText, cooldown > 0 && { color: '#aaa' }]}>
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => { setStep(STEPS.EMAIL); setOtp(Array(OTP_LENGTH).fill('')); setError(''); }}
              >
                <Text style={styles.changeText}>Change email</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step: Success */}
          {step === STEPS.SUCCESS && (
            <View style={styles.body}>
              <View style={styles.successCard}>
                <Ionicons name="mail-outline" size={20} color="#581845" />
                <Text style={styles.successEmail}>{email}</Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleDone}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  keyboardView: {
    width: '100%',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 28,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 4,
  },
  primaryBtn: {
    backgroundColor: '#581845',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  dismissText: {
    color: '#888',
    fontSize: 14,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpInput: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    backgroundColor: '#f9f9f9',
  },
  otpFilled: {
    borderColor: '#581845',
    backgroundColor: '#faf5f8',
  },
  otpError: {
    borderColor: '#e74c3c',
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  resendText: {
    color: '#581845',
    fontSize: 14,
    fontWeight: '600',
  },
  changeBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  changeText: {
    color: '#888',
    fontSize: 13,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f0f3',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  successEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#581845',
    flex: 1,
  },
});

export default RecoveryEmailModal;
