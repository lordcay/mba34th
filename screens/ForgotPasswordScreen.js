import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Missing Email', 'Please enter your registered email.');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post('https://three4th-street-backend.onrender.com/accounts/forgot-password', {
                email,
            });

            Alert.alert('Success', 'Check your email for reset instructions.');
            setEmail('');
            navigation.navigate('ResetPasswordScreen'); // or wherever you want to take them next
        } catch (error) {
            console.error('Forgot password error:', error);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#171717', '#2c2c2c']}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.inner}
            >
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.description}>
                    Enter your email and we’ll send you a link to reset your password.
                </Text>

                <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor="#aaa"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    // onChangeText={setEmail}
                    onChangeText={(text) => setEmail(text.toLowerCase())}
                    value={email}
                />

                <TouchableOpacity style={styles.button} onPress={handleForgotPassword} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Send Reset Link</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back to Login</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        color: '#ccc',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#333',
        color: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#581845',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    backText: {
        color: '#999',
        textAlign: 'center',
        fontSize: 14,
        marginTop: 10,
    },
});

export default ForgotPasswordScreen;
