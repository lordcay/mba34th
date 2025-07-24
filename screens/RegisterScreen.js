


// // RegisterScreen.js
// import React, { useState } from 'react';
// import {
//   StyleSheet,
//   Text,
//   View,
//   SafeAreaView,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   ScrollView,
//   KeyboardAvoidingView,
//   Platform
// } from 'react-native';
// import { Picker } from '@react-native-picker/picker';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import Fontisto from 'react-native-vector-icons/Fontisto';
// import { useNavigation } from '@react-navigation/native';

// const universities = [
//   { name: 'Choose a university', extension: '' },
//   { name: 'Duke University', extension: '@duke.edu' },
//   { name: 'Harvard University', extension: '@g.harvard.edu' },
//   { name: 'MIT', extension: '@mit.edu' },
//   { name: 'Stanford University', extension: '@stanford.edu' },
//   { name: 'Yale University', extension: '@yale.edu' },
//   { name: 'Columbia University', extension: '@columbia.edu' },
//   { name: 'Princeton University', extension: '@princeton.edu' },
//   { name: 'Cornell University', extension: '@cornell.edu' },
//   { name: 'UC Berkeley', extension: '@berkeley.edu' },
//   { name: 'UCLA', extension: '@ucla.edu' },
//   { name: 'NYU', extension: '@nyu.edu' },
// ];

// const RegisterScreen = () => {
//   const [emailUsername, setEmailUsername] = useState('');
//   const [selectedUniversity, setSelectedUniversity] = useState('');
//   const [fullName, setFullName] = useState('');
//   const [password, setPassword] = useState('');
//   const navigation = useNavigation();
//   const [errorMessage, setErrorMessage] = useState('');

//   const handleRegister = () => {
//     if (!fullName || !emailUsername || password || selectedUniversity === '' || selectedUniversity === 'Choose a university') {
//       setErrorMessage('All fields are required.');
//       return;
//     }

//     const selectedDomain = universities.find((uni) => uni.name === selectedUniversity)?.extension || '';
//     const fullEmail = `${emailUsername}${selectedDomain}`;

//     // Send to backend or navigate
//     Alert.alert('Registered!', `Name: ${fullName}\nEmail: ${fullEmail}`);
//      navigation.navigate('PasswordScreen');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
//         <ScrollView contentContainerStyle={styles.scrollContainer}>
//           <View style={styles.header}> 
//             <Fontisto name="email" size={30} color="white" />
//             <Text style={styles.headerTitle}>Join 34TH STREET</Text>
//             <Text style={styles.headerSubtitle}>Connect across top universities</Text>
//           </View>

//           <View style={styles.form}>
//             <Text style={styles.label}>Full Name</Text>
//             <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />

//             <Text style={styles.label}>Select University</Text>
//             <View style={styles.pickerContainer}>
//               <Picker selectedValue={selectedUniversity} onValueChange={setSelectedUniversity}>
//                 {universities.map((uni, index) => (
//                   <Picker.Item key={index} label={uni.name} value={uni.name} />
//                 ))}
//               </Picker>
//             </View>

//             <Text style={styles.label}>Email Username</Text>
//             <View style={styles.emailRow}>
//               <TextInput
//                 style={[styles.input, { flex: 1 }]}
//                 value={emailUsername}
//                 onChangeText={(text) => {
//                   setEmailUsername(text);
//                   if (text.trim()) setErrorMessage('');
//                 }}
//                 placeholder="your.id"
//               />
//               {selectedUniversity && selectedUniversity !== 'Choose a university' && (
//                 <Text style={styles.emailSuffix}>{universities.find((u) => u.name === selectedUniversity)?.extension}</Text>
//               )}
//             </View>

//             <Text style={styles.label}>Password</Text>
//             <TextInput
//               style={styles.input}
//               secureTextEntry
//               value={password}
//               onChangeText={setPassword}
//               placeholder="Create a password"
//             />

//             {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

//             <TouchableOpacity style={styles.button} onPress={handleRegister}>
//               <MaterialCommunityIcons name="arrow-right-circle" size={40} color="#fff" />
//             </TouchableOpacity>
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// };

// export default RegisterScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   scrollContainer: { padding: 20 },
//   header: {
//     backgroundColor: '#581845',
//     borderBottomLeftRadius: 100,
//     borderBottomRightRadius: 100,
//     alignItems: 'center',
//     padding: 40,
//   },
//   headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 10 },
//   headerSubtitle: { fontSize: 14, color: '#ffb60a', marginTop: 5 },
//   form: { marginTop: 30 },
//   label: { marginTop: 20, fontWeight: 'bold', color: '#581845' },
//   input: {
//     borderBottomWidth: 1,
//     borderBottomColor: '#ccc',
//     paddingVertical: 10,
//     fontSize: 16,
//     marginBottom: 10,
//   },
//   pickerContainer: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     overflow: 'hidden',
//     marginBottom: 10,
//   },
//   emailRow: { flexDirection: 'row', alignItems: 'center' },
//   emailSuffix: { fontSize: 16, color: '#555', marginLeft: 5 },
//   error: { color: 'red', marginTop: 5 },
//   button: {
//     backgroundColor: '#581845',
//     padding: 12,
//     alignItems: 'center',
//     borderRadius: 50,
//     marginTop: 30,
//   },
// });

// RegisterScreen.js
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { useNavigation } from '@react-navigation/native';

const universities = [
  { name: 'Choose a university', extension: '' },
  { name: 'Duke University', extension: '@duke.edu' },
  { name: 'Harvard University', extension: '@g.harvard.edu' },
  { name: 'MIT', extension: '@mit.edu' },
  { name: 'Stanford University', extension: '@stanford.edu' },
  { name: 'Yale University', extension: '@yale.edu' },
  { name: 'Columbia University', extension: '@columbia.edu' },
  { name: 'Princeton University', extension: '@princeton.edu' },
  { name: 'Cornell University', extension: '@cornell.edu' },
  { name: 'UC Berkeley', extension: '@berkeley.edu' },
  { name: 'UCLA', extension: '@ucla.edu' },
  { name: 'NYU', extension: '@nyu.edu' },
];

const RegisterScreen = () => {
  const [emailUsername, setEmailUsername] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [fullName, setFullName] = useState('');
  const navigation = useNavigation();
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = () => {
    if (!fullName || !emailUsername || selectedUniversity === '' || selectedUniversity === 'Choose a university') {
      setErrorMessage('All fields are required.');
      return;
    }

    const selectedDomain = universities.find((uni) => uni.name === selectedUniversity)?.extension || '';
    const fullEmail = `${emailUsername}${selectedDomain}`;

    // Send to backend or navigate
    Alert.alert('Email Created!', `Name: ${fullName}\nEmail: ${fullEmail}`);
    navigation.navigate('PasswordScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}> 
            <Fontisto name="email" size={30} color="white" />
            <Text style={styles.headerTitle}>Join 34TH STREET</Text>
            <Text style={styles.headerSubtitle}>Connect across top universities</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '30%' }]} />
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Enter your full name" />

            <Text style={styles.label}>Select University</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={selectedUniversity} onValueChange={setSelectedUniversity}>
                {universities.map((uni, index) => (
                  <Picker.Item key={index} label={uni.name} value={uni.name} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Email Username</Text>
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={emailUsername}
                onChangeText={(text) => {
                  setEmailUsername(text);
                  if (text.trim()) setErrorMessage('');
                }}
                placeholder="your.id"
              />
              {selectedUniversity && selectedUniversity !== 'Choose a university' && (
                <Text style={styles.emailSuffix}>{universities.find((u) => u.name === selectedUniversity)?.extension}</Text>
              )}
            </View>

            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleRegister}>
              <MaterialCommunityIcons name="arrow-right-circle" size={40} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 20 },
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
  form: { marginTop: 30 },
  label: { marginTop: 20, fontWeight: 'bold', color: '#581845' },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  emailRow: { flexDirection: 'row', alignItems: 'center' },
  emailSuffix: { fontSize: 16, color: '#555', marginLeft: 5 },
  error: { color: 'red', marginTop: 5 },
  button: {
    backgroundColor: '#581845',
    padding: 12,
    alignItems: 'center',
    borderRadius: 50,
    marginTop: 30,
  },
});
