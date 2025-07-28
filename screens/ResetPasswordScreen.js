// import React, { useState } from 'react';
// import {
//     View,
//     Text,
//     TextInput,
//     StyleSheet,
//     TouchableOpacity,
//     Alert,
//     KeyboardAvoidingView,
//     Platform,
//     ScrollView,
// } from 'react-native';
// import axios from 'axios';
// import { useNavigation } from '@react-navigation/native';

// const ResetPasswordScreen = () => {
//     const [code, setCode] = useState('');
//     const [password, setPassword] = useState('');
//     const [confirmPassword, setConfirmPassword] = useState('');
//     const navigation = useNavigation();

//     const handleReset = async () => {
//         if (code.length !== 6 || !/^\d+$/.test(code)) {
//             return Alert.alert('Invalid Code', 'Please enter a valid 6-digit code.');
//         }

//         if (password !== confirmPassword) {
//             return Alert.alert('Mismatch', 'Passwords do not match.');
//         }

//         if (password.length < 6) {
//             return Alert.alert('Weak Password', 'Password should be at least 6 characters.');
//         }

//         try {
//             const response = await axios.post('https://three4th-street-backend.onrender.com/accounts/reset-password', {
//                 token: code,
//                 password,
//             });

//             Alert.alert('Success', 'Password reset successfully. You can now log in.', [
//                 { text: 'OK', onPress: () => navigation.navigate('Login') },
//             ]);
//         } catch (error) {
//             console.error(error);
//             Alert.alert('Error', error?.response?.data?.message || 'Reset failed. Please check the code and try again.');
//         }
//     };

//     return (
//         <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding' })}>
//             <ScrollView contentContainerStyle={styles.scroll}>
//                 <Text style={styles.title}>Reset Your Password</Text>
//                 <Text style={styles.subtitle}>Enter the 6-digit code sent to your email and create a new password.</Text>

//                 <TextInput
//                     style={styles.input}
//                     placeholder="6-digit code"
//                     keyboardType="number-pad"
//                     value={code}
//                     maxLength={6}
//                     onChangeText={setCode}
//                 />

//                 <TextInput
//                     style={styles.input}
//                     placeholder="New Password"
//                     secureTextEntry
//                     value={password}
//                     onChangeText={setPassword}
//                 />

//                 <TextInput
//                     style={styles.input}
//                     placeholder="Confirm New Password"
//                     secureTextEntry
//                     value={confirmPassword}
//                     onChangeText={setConfirmPassword}
//                 />

//                 <TouchableOpacity style={styles.button} onPress={handleReset}>
//                     <Text style={styles.buttonText}>Reset Password</Text>
//                 </TouchableOpacity>
//             </ScrollView>
//         </KeyboardAvoidingView>
//     );
// };

// export default ResetPasswordScreen;


// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#fff',
//     },
//     scroll: {
//         flexGrow: 1,
//         padding: 24,
//         justifyContent: 'center',
//     },
//     title: {
//         fontSize: 24,
//         fontWeight: '700',
//         textAlign: 'center',
//         marginBottom: 8,
//     },
//     subtitle: {
//         fontSize: 14,
//         color: '#666',
//         textAlign: 'center',
//         marginBottom: 24,
//     },
//     input: {
//         borderWidth: 1,
//         borderColor: '#ccc',
//         borderRadius: 10,
//         padding: 12,
//         marginBottom: 16,
//         fontSize: 16,
//     },
//     button: {
//         backgroundColor: '#1e88e5',
//         padding: 14,
//         borderRadius: 10,
//         alignItems: 'center',
//         marginTop: 10,
//     },
//     buttonText: {
//         color: '#fff',
//         fontSize: 16,
//         fontWeight: '600',
//     },
// });






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
                'https://three4th-street-backend.onrender.com/accounts/reset-password', // 👈 Replace with your actual base URL
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
