


// ResetPasswordScreen.js

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import axios from 'axios';

const ResetPasswordScreen = ({ navigation }) => {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

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
                'http://192.168.0.169:4000/accounts/reset-password', // 👈 Replace with your actual base URL
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
        <View style={styles.container}>
            <Text style={styles.title}>Reset Password</Text>

            <TextInput
                style={styles.input}
                placeholder="Enter 6-digit Code"
                keyboardType="numeric"
                value={token}
                onChangeText={setToken}
            />

            <TextInput
                style={styles.input}
                placeholder="New Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
        color: '#333',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 6,
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#581845',
        paddingVertical: 15,
        borderRadius: 6,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
});
