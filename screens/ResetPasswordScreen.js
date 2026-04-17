


// ResetPasswordScreen.js

import React, { useLayoutEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { API_BASE_URL } from '../config';

const { width: SCREEN_W } = Dimensions.get('window');
const scale = (size) => Math.round((SCREEN_W / 375) * size);

const ResetPasswordScreen = ({ navigation }) => {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

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
          headerTintColor: '#581845',
          headerShadowVisible: false,
        });
      }, [navigation]);

    const handleResetPassword = async () => {
        if (!token || !password || !confirmPassword) {
            Alert.alert('All fields are required');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Passwords do not match');
            return;
        }

        try {
            setLoading(true);

            const response = await axios.post(
                API_BASE_URL + '/accounts/reset-password',
                {
                    token,
                    password,
                    confirmPassword,
                }
            );

            Alert.alert('Success', response.data.message, [
                { text: 'OK', onPress: () => navigation.navigate('Login') },
            ]);
        } catch (error) {
            console.error(error?.response?.data || error.message);
            Alert.alert(
                'Error',
                error.response?.data?.message || 'Reset failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        Enter the 6-digit code sent to your email and choose a new password.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit Code"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={token}
                        onChangeText={setToken}
                        maxLength={6}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        placeholderTextColor="#999"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        placeholderTextColor="#999"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleResetPassword}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Reset Password</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(24),
        paddingBottom: scale(30),
    },
    title: {
        fontSize: scale(24),
        fontWeight: 'bold',
        marginBottom: scale(8),
        textAlign: 'center',
        color: '#333',
    },
    subtitle: {
        fontSize: scale(14),
        color: '#777',
        textAlign: 'center',
        marginBottom: scale(28),
        lineHeight: scale(20),
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        paddingHorizontal: scale(16),
        paddingVertical: scale(14),
        borderRadius: scale(10),
        marginBottom: scale(16),
        fontSize: scale(16),
        backgroundColor: '#fafafa',
        color: '#333',
    },
    button: {
        backgroundColor: '#581845',
        paddingVertical: scale(16),
        borderRadius: scale(10),
        alignItems: 'center',
        marginTop: scale(8),
    },
    buttonText: {
        color: '#fff',
        fontSize: scale(16),
        fontWeight: '600',
    },
});
