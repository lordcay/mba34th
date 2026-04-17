import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';
const BIOMETRIC_USER_ID_KEY = 'biometric_user_id';

/**
 * Check if the device supports biometric authentication (Face ID / Fingerprint).
 */
export const isBiometricSupported = async () => {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return { supported: false, reason: 'no_hardware' };

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return { supported: false, reason: 'not_enrolled' };

    return { supported: true };
  } catch {
    return { supported: false, reason: 'error' };
  }
};

/**
 * Get the available biometric type name for display.
 * Returns "Face ID", "Fingerprint", or "Biometrics".
 */
export const getBiometricTypeName = async () => {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    return 'Biometrics';
  } catch {
    return 'Biometrics';
  }
};

/**
 * Prompt the user for biometric authentication.
 */
export const authenticateWithBiometrics = async (promptMessage) => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Verify your identity',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });
    return result;
  } catch {
    return { success: false, error: 'authentication_failed' };
  }
};

/**
 * Save credentials securely after a successful login.
 * Credentials are encrypted at rest by the OS Keychain (iOS) / Keystore (Android).
 */
export const saveBiometricCredentials = async (email, token, userId) => {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(BIOMETRIC_USER_ID_KEY, userId, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error) {
    console.error('Failed to save biometric credentials:', error);
    return false;
  }
};

/**
 * Get stored biometric credentials.
 */
export const getBiometricCredentials = async () => {
  try {
    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const token = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    const userId = await SecureStore.getItemAsync(BIOMETRIC_USER_ID_KEY);
    if (!email || !token || !userId) return null;
    return { email, token, userId };
  } catch {
    return null;
  }
};

/**
 * Check if biometric login is enabled.
 */
export const isBiometricEnabled = async () => {
  try {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
};

/**
 * Clear all biometric credentials (disable biometric login).
 */
export const clearBiometricCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_USER_ID_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear biometric credentials:', error);
    return false;
  }
};

/**
 * Update the stored token (call after token refresh).
 */
export const updateBiometricToken = async (newToken) => {
  try {
    const enabled = await isBiometricEnabled();
    if (!enabled) return;
    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, newToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch (error) {
    console.error('Failed to update biometric token:', error);
  }
};
