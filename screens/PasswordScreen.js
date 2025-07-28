// PasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  getRegistrationProgress,
  saveRegistrationProgress,
} from '../registrationUtils';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { ScrollView } from 'react-native';
import logo2 from '../assets/logo1.png';
import { Image } from 'react-native';



const PasswordScreen = () => {
  const navigation = useNavigation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [secureText, setSecureText] = useState(true);



  const handleNext = () => {
    // Basic validations
    if (!password || !confirmPassword) {
      setError('Please enter and confirm your password.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // ✅ Passed validation: save progress & navigate
    saveRegistrationProgress('Password', { password });
    navigation.navigate('GenderScreen');
  };


  // const handleNext = () => {
  //   if (password.trim() !== '') {

  //     // Save the current progress data including the name
  //     saveRegistrationProgress('Password', { password });
  //   }
  //   // Navigate to the next screen
  //   navigation.navigate('GenderScreen');
  //   // navigation.navigate('Birth');
  // };



  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image source={logo2} style={styles.logo} resizeMode="contain" />
            </View>
            {/* <Text style={styles.headerTitle}>Join 34TH STREET</Text> */}
            <Text style={styles.headerSubtitle}>Connect across top universities</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '70%' }]} />
            </View>
          </View>



          {/* Password Input */}

          <View style={styles.section}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                secureTextEntry={!showPassword}
                autoFocus={true}
                onChangeText={text => setPassword(text)}

                value={password}
                // onChangeText={setPassword}
                style={styles.input}
                placeholder="Enter password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color="#888"
                />
              </TouchableOpacity>
            </View>


            {/* Confirm Password Input */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={styles.input}
                placeholder="Re-enter password"
              />
            </View>

            {/* Error Message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Next Button */}
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    backgroundColor: '#581845',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    padding: 40,
    alignItems: 'center',
  },
  logoWrapper: {
    backgroundColor: 'white', // Contrast layer
    padding: 12,
    borderRadius: 80, // Makes it circular (assuming round logo)
    elevation: 4, // Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 10,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 10,
  },
  scrollContainer: {
    flexGrow: 1,

  },
  headerText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 23,
    fontFamily: 'GeezaPro-Bold',
    color: 'white',
  },
  header: {
    backgroundColor: '#581845',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    alignItems: 'center',
    padding: 40,
  },
  progressContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ffb60a',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 10 },
  headerSubtitle: { fontSize: 14, color: '#ffb60a', marginTop: 5 },
  subHeaderText: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: 'GeezaPro-Bold',
    color: '#ffb60a',
    fontWeight: 'bold',
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#000' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 30 },
  section: {
    marginTop: 40,
    padding: 20,
  },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#581845', },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 12,
  },
  nextButton: {
    backgroundColor: '#581845',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  nextButtonText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
// // PasswordScreen.js
// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   SafeAreaView,
//   KeyboardAvoidingView,
//   Platform,
// } from 'react-native';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import { useNavigation } from '@react-navigation/native';
// import { saveRegistrationProgress } from '../registrationUtils';

// const PasswordScreen = () => {
//   const navigation = useNavigation();
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');

//   const handleNext = () => {
//     if (password.length < 8) {
//       setError('Password must be at least 8 characters.');
//       return;
//     }
//     if (password !== confirmPassword) {
//       setError('Passwords do not match.');
//       return;
//     }

//     setError('');
//     saveRegistrationProgress('Password', { password });
//     navigation.navigate('ProfileInfo');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//         style={styles.innerContainer}
//       >
//         {/* Progress Bar */}
//         <View style={styles.progressContainer}>
//           <View style={[styles.progressBar, { width: '40%' }]} />
//         </View>

//         {/* Title */}
//         <Text style={styles.title}>Set a Secure Password</Text>
//         <Text style={styles.subtitle}>Create a strong password for your account</Text>

//         {/* Password Input */}
//         <Text style={styles.label}>Password</Text>
//         <View style={styles.inputWrapper}>
//           <TextInput
//             secureTextEntry={!showPassword}
//             value={password}
//             onChangeText={setPassword}
//             style={styles.input}
//             placeholder="Enter password"
//           />
//           <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
//             <MaterialCommunityIcons
//               name={showPassword ? 'eye-off' : 'eye'}
//               size={24}
//               color="#888"
//             />
//           </TouchableOpacity>
//         </View>

//         {/* Confirm Password Input */}
//         <Text style={styles.label}>Confirm Password</Text>
//         <View style={styles.inputWrapper}>
//           <TextInput
//             secureTextEntry={!showPassword}
//             value={confirmPassword}
//             onChangeText={setConfirmPassword}
//             style={styles.input}
//             placeholder="Re-enter password"
//           />
//         </View>

//         {/* Error Message */}
//         {error ? <Text style={styles.errorText}>{error}</Text> : null}

//         {/* Next Button */}
//         <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
//           <Text style={styles.nextButtonText}>Next</Text>
//         </TouchableOpacity>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// export default PasswordScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   innerContainer: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
//   progressContainer: {
//     height: 8,
//     width: '100%',
//     backgroundColor: '#eee',
//     borderRadius: 4,
//     marginBottom: 30,
//     overflow: 'hidden',
//   },
//   progressBar: {
//     height: '100%',
//     backgroundColor: '#581845',
//   },
//   title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#000' },
//   subtitle: { fontSize: 14, color: '#555', marginBottom: 30 },
//   label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     marginBottom: 16,
//   },
//   input: {
//     flex: 1,
//     height: 48,
//     fontSize: 16,
//   },
//   errorText: {
//     color: 'red',
//     fontSize: 14,
//     marginBottom: 12,
//   },
//   nextButton: {
//     backgroundColor: '#581845',
//     paddingVertical: 14,
//     borderRadius: 8,
//     marginTop: 20,
//   },
//   nextButtonText: {
//     textAlign: 'center',
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });
