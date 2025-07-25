



// import {
//     StyleSheet,
//     Text,
//     View,
//     SafeAreaView,
//     Image,
//     TextInput,
//     TouchableOpacity,
//     TouchableWithoutFeedback,
//     Keyboard,
//   } from 'react-native';
//   import React, { useEffect, useState } from 'react';
//   import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
//   import { useNavigation } from '@react-navigation/native';
//   import { getRegistrationProgress, saveRegistrationProgress } from '../registrationUtils';
// import { KeyboardAvoidingView } from 'react-native';
// import { Platform } from 'react-native';
// import { ScrollView } from 'react-native';
// import Fontisto from 'react-native-vector-icons/Fontisto';


//   const NameScreen = () => {
//     const [firstName, setFirstName] = useState('');
//     const [lastName, setLastName] = useState('');
//     const [errorMessage, setErrorMessage] = useState('');
//     const navigation = useNavigation();

//     useEffect(() => {
//       getRegistrationProgress('Name').then(progressData => {
//         if (progressData) {
//           setFirstName(progressData.firstName || '');
//           setLastName(progressData.lastName || '');
//         }
//       });
//     }, []);

//     const handleNext = () => {
//       if (firstName.trim() === '' || lastName.trim() === '') {
//         setErrorMessage('All fields are required.');
//         return;
//       }

//       // Save registration progress
//       saveRegistrationProgress('Name', { firstName, lastName });

//       // Clear error message if validation passes
//       setErrorMessage('');

//       // Navigate to the next screen
//       navigation.navigate('EmailScreen');
//     };

//     return (
//       <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//       <SafeAreaView style={styles.container}>
//          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
//              <ScrollView contentContainerStyle={styles.scrollContainer}>
//                 <View style={styles.header}> 
//                             <Fontisto name="email" size={30} color="white" />
//                             <Text style={styles.headerTitle}>Join 34TH STREET</Text>
//                             <Text style={styles.headerSubtitle}>Let's get to meet you</Text>

//                             {/* Progress Bar */}
//                             <View style={styles.progressContainer}>
//                               <View style={[styles.progressBar, { width: '20%' }]} />
//                             </View>
//                           </View>
//         {/* <View
//           style={{
//             height: 200,
//             backgroundColor: '#581845',
//             width: '100%',
//             borderBottomLeftRadius: 100,
//             borderBottomRightRadius: 100,
//             top: -50,
//           }}>
//           <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 25 }}>
//             <Image
//               style={{ width: 150, height: 80, resizeMode: 'contain', top: 20 }}
//               source={{ uri: 'https://cdn-icons-png.flaticon.com/128/4310/4310217.png' }}
//             />
//           </View>
//           <Text style={styles.headerText}>34TH STREET</Text>
//           <Text style={styles.subHeaderText}>build bonds across schools.</Text>
//         </View> */}

//         <View style={{ marginTop: 1, marginHorizontal: 20 }}>
//           {/* <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//             <View style={styles.iconContainer}>
//               <MaterialCommunityIcons name="newspaper-variant-outline" size={26} color="#ffb60a" />
//             </View>
//             <Image
//               style={{ width: 100, height: 40 }}
//               source={{ uri: 'https://cdn-icons-png.flaticon.com/128/10613/10613685.png' }}
//             />
//           </View> */}

//           <View style={{ marginTop: 30 }}>
//             <Text style={styles.titleText}>Let's get to meet you!</Text>

//             {/* First Name Input */}
//             <TextInput
//               autoFocus
//               value={firstName}
//               onChangeText={(text) => {
//                 setFirstName(text);
//                 setErrorMessage('');
//               }}
//               style={styles.inputField}
//               placeholder="First name (required)"
//               placeholderTextColor={'#BEBEBE'}
//             />

//             {/* Last Name Input */}
//             <TextInput
//               value={lastName}
//               onChangeText={(text) => {
//                 setLastName(text);
//                 setErrorMessage('');
//               }}
//               style={styles.inputField}
//               placeholder="Last name (required)"
//               placeholderTextColor={'#BEBEBE'}
//             />

//             {/* Error Message */}
//             {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
//           </View>

//           {/* Next Button */}
//           <TouchableOpacity onPress={handleNext} activeOpacity={0.8} style={{ marginTop: 30, marginLeft: 'auto' }}>
//             <MaterialCommunityIcons name="arrow-right-circle" size={45} color="#581845" />
//           </TouchableOpacity>
//         </View>
//         </ScrollView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>
//       </TouchableWithoutFeedback>
//     );
//   };

//   export default NameScreen;

//   const styles = StyleSheet.create({
//     container: { flex: 1, backgroundColor: '#fff' },

//     headerText: {
//       marginTop: 20,
//       textAlign: 'center',
//       fontSize: 23,
//       fontFamily: 'GeezaPro-Bold',
//       color: 'white',
//     },
//     scrollContainer: { padding: 20 },
//   header: {
//     backgroundColor: '#581845',
//     borderBottomLeftRadius: 100,
//     borderBottomRightRadius: 100,
//     alignItems: 'center',
//     padding: 40,
//   },
//   progressContainer: {
//     height: 8,
//     width: '100%',
//     backgroundColor: '#eee',
//     borderRadius: 4,
//     marginTop: 20,
//     overflow: 'hidden',
//   },
//   progressBar: {
//     height: '100%',
//     backgroundColor: '#ffb60a',
//   },
//   headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 10 },
//   headerSubtitle: { fontSize: 14, color: '#ffb60a', marginTop: 5 },
//     subHeaderText: {
//       marginTop: 10,
//       textAlign: 'center',
//       fontSize: 18,
//       fontFamily: 'GeezaPro-Bold',
//       color: '#ffb60a',
//       fontWeight: 'bold',
//     },
//     iconContainer: {
//       width: 44,
//       height: 44,
//       borderRadius: 22,
//       borderColor: '#581845',
//       borderWidth: 2,
//       justifyContent: 'center',
//       alignItems: 'center',
//     },
//     titleText: {
//       fontSize: 25,
//       fontWeight: 'bold',
//       fontFamily: 'GeezaPro-Bold',
//     },
//     inputField: {
//       width: 340,
//       marginVertical: 10,
//       fontSize: 22,
//       marginTop: 25,
//       borderBottomColor: 'black',
//       borderBottomWidth: 1,
//       paddingBottom: 10,
//       fontFamily: 'GeezaPro-Bold',
//     },
//     errorText: {
//       color: 'red',
//       fontSize: 14,
//       marginTop: 5,
//     },
//   });


import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { getRegistrationProgress, saveRegistrationProgress } from '../registrationUtils';
import logo2 from '../assets/logo1.png';
import { Image } from 'react-native';


const NameScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigation = useNavigation();

  useEffect(() => {
    getRegistrationProgress('Name').then(progressData => {
      if (progressData) {
        setFirstName(progressData.firstName || '');
        setLastName(progressData.lastName || '');
      }
    });
  }, []);

  const handleNext = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Both fields are required.');
      return;
    }

    saveRegistrationProgress('Name', { firstName, lastName });
    setErrorMessage('');
    navigation.navigate('EmailScreen');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <Image source={logo2} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.headerTitle}>Let’s get to know you</Text>
              <Text style={styles.headerSubtitle}>Meet Africans from Elite Schools around the World</Text>
              {/* <Text style={styles.headerSubtitle}>Your name helps us personalize your experience</Text> */}

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '20%' }]} />
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formWrapper}>
              <Text style={styles.inputLabel}>First Name</Text>
              <View style={styles.inputCard}>
                <MaterialIcons name="person-outline" size={22} color="#581845" />
                <TextInput
                  value={firstName}
                  onChangeText={text => {
                    setFirstName(text);
                    setErrorMessage('');
                  }}
                  style={styles.input}
                  placeholder="Enter first name"
                  placeholderTextColor="#aaa"
                />
              </View>

              <Text style={styles.inputLabel}>Last Name</Text>
              <View style={styles.inputCard}>
                <MaterialIcons name="person-outline" size={22} color="#581845" />
                <TextInput
                  value={lastName}
                  onChangeText={text => {
                    setLastName(text);
                    setErrorMessage('');
                  }}
                  style={styles.input}
                  placeholder="Enter last name"
                  placeholderTextColor="#aaa"
                />
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <TouchableOpacity onPress={handleNext} activeOpacity={0.8} style={styles.nextButton}>
                <Text style={styles.nextText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default NameScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  scrollContainer: {
    flexGrow: 1,
  },

  header: {
    backgroundColor: '#581845',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    padding: 40,
    alignItems: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 10,
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
  headerSubtitle: {
    color: '#ffb60a',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 10,
  },
  progressContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 4,
    marginTop: 20,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#ffb60a',
    borderRadius: 4,
  },

  formWrapper: {
    paddingHorizontal: 30,
    marginTop: 40,
  },

  inputLabel: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
    marginTop: 20,
    fontWeight: '500',
  },

  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 3,
  },

  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#222',
  },

  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },

  nextButton: {
    backgroundColor: '#581845',
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 40,
    elevation: 4,
  },

  nextText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 18,
  },
});
