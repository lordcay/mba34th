


// import {
//   StyleSheet,
//   Text,
//   View,
//   SafeAreaView,
//   TextInput,
//   TouchableOpacity,
//   TouchableWithoutFeedback,
//   Keyboard,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
// } from 'react-native';
// import React, { useEffect, useLayoutEffect, useState } from 'react';
// import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import FontAwesome from 'react-native-vector-icons/FontAwesome';
// import { useNavigation } from '@react-navigation/native';
// import { getRegistrationProgress, saveRegistrationProgress } from '../registrationUtils';
// import logo2 from '../assets/logo1.png';
// import { Image } from 'react-native';


// const NameScreen = () => {
//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [errorMessage, setErrorMessage] = useState('');
//   const navigation = useNavigation();
  

//      useLayoutEffect(() => {
//     navigation.setOptions({
//       headerShown: true,
//       headerTransparent: false,     // Cleaner look
//       headerTitle: '',
//       headerBackTitle: 'Back',
//       headerBackTitleVisible: true,
//       headerStyle: {
//         backgroundColor: '#ffffff',   // Top bar background
//         borderBottomWidth: 0,
//         elevation: 0,
//         shadowOpacity: 0,
//       },
//       headerTintColor: '#581845',     // Back icon color
//       headerShadowVisible: false,
//     });
//   }, [navigation]);

//   useEffect(() => {
//     getRegistrationProgress('Name').then(progressData => {
//       if (progressData) {
//         setFirstName(progressData.firstName || '');
//         setLastName(progressData.lastName || '');
//       }
//     });
//   }, []);

//   const handleNext = () => {
//     if (!firstName.trim() || !lastName.trim()) {
//       setErrorMessage('Both fields are required.');
//       return;
//     }

//     saveRegistrationProgress('Name', { firstName, lastName });
//     setErrorMessage('');
//     navigation.navigate('EmailScreen');
//   };

//   return (
//     <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
//       <SafeAreaView style={styles.container}>
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
//           style={{ flex: 1 }}
//         >
//           <ScrollView contentContainerStyle={styles.scrollContainer}>
//             {/* Header Section */}
//             <View style={styles.header}>
//               <View style={styles.logoWrapper}>
//                 <Image source={logo2} style={styles.logo} resizeMode="contain" />
//               </View>
//               <Text style={styles.headerTitle}>Let’s get to know you</Text>
//               <Text style={styles.headerSubtitle}>Meet Africans from Elite Schools around the World</Text>
//               {/* <Text style={styles.headerSubtitle}>Your name helps us personalize your experience</Text> */}

//               {/* Progress Bar */}
//               <View style={styles.progressContainer}>
//                 <View style={[styles.progressBar, { width: '20%' }]} />
//               </View>
//             </View>

//             {/* Form Section */}
//             <View style={styles.formWrapper}>
//               <Text style={styles.inputLabel}>First Name</Text>
//               <View style={styles.inputCard}>
//                 <MaterialIcons name="person-outline" size={22} color="#581845" />
//                 <TextInput
//                   value={firstName}
//                   onChangeText={text => {
//                     setFirstName(text);
//                     setErrorMessage('');
//                   }}
//                   style={styles.input}
//                   placeholder="Enter first name"
//                   placeholderTextColor="#aaa"
//                 />
//               </View>

//               <Text style={styles.inputLabel}>Last Name</Text>
//               <View style={styles.inputCard}>
//                 <MaterialIcons name="person-outline" size={22} color="#581845" />
//                 <TextInput
//                   value={lastName}
//                   onChangeText={text => {
//                     setLastName(text);
//                     setErrorMessage('');
//                   }}
//                   style={styles.input}
//                   placeholder="Enter last name"
//                   placeholderTextColor="#aaa"
//                 />
//               </View>

//               {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

//               <TouchableOpacity onPress={handleNext} activeOpacity={0.8} style={styles.nextButton}>
//                 <Text style={styles.nextText}>Continue</Text>
//               </TouchableOpacity>
//             </View>
//           </ScrollView>
//         </KeyboardAvoidingView>
//       </SafeAreaView>
//     </TouchableWithoutFeedback>
//   );
// };

// export default NameScreen;

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },

//   scrollContainer: {
//     flexGrow: 1,
//   },

//   header: {
//     backgroundColor: '#581845',
//     borderBottomLeftRadius: 100,
//     borderBottomRightRadius: 100,
//     padding: 40,
//     alignItems: 'center',
//   },

//   headerTitle: {
//     color: '#fff',
//     fontSize: 22,
//     fontWeight: '700',
//     marginTop: 10,
//   },
//   logoWrapper: {
//     backgroundColor: 'white', // Contrast layer
//     padding: 12,
//     borderRadius: 80, // Makes it circular (assuming round logo)
//     elevation: 4, // Android shadow
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     marginBottom: 10,
//   },
//   headerSubtitle: {
//     color: '#ffb60a',
//     fontSize: 14,
//     fontStyle: 'italic',
//     marginTop: 5,
//     textAlign: 'center',
//   },
//   logo: {
//     width: 120,
//     height: 80,
//     marginBottom: 10,
//   },
//   progressContainer: {
//     height: 8,
//     width: '100%',
//     backgroundColor: '#eee',
//     borderRadius: 4,
//     marginTop: 20,
//   },

//   progressBar: {
//     height: '100%',
//     backgroundColor: '#ffb60a',
//     borderRadius: 4,
//   },

//   formWrapper: {
//     paddingHorizontal: 30,
//     marginTop: 40,
//   },

//   inputLabel: {
//     fontSize: 14,
//     color: '#444',
//     marginBottom: 6,
//     marginTop: 20,
//     fontWeight: '500',
//   },

//   inputCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderRadius: 30,
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     elevation: 3,
//   },

//   input: {
//     flex: 1,
//     fontSize: 16,
//     marginLeft: 10,
//     color: '#222',
//   },

//   errorText: {
//     color: 'red',
//     marginTop: 10,
//     textAlign: 'center',
//   },

//   nextButton: {
//     backgroundColor: '#581845',
//     paddingVertical: 15,
//     borderRadius: 30,
//     marginTop: 40,
//     elevation: 4,
//   },

//   nextText: {
//     color: '#fff',
//     textAlign: 'center',
//     fontWeight: '600',
//     fontSize: 18,
//   },
// });





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
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { getRegistrationProgress, saveRegistrationProgress } from '../registrationUtils';
import logo2 from '../assets/logo1.png';
import { Image } from 'react-native';

const NameScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);
  const [firstY, setFirstY] = useState(0);
const [lastY, setLastY] = useState(0);


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

  useEffect(() => {
    getRegistrationProgress('Name').then(progressData => {
      if (progressData) {
        setFirstName(progressData.firstName || '');
        setLastName(progressData.lastName || '');
      }
    });
  }, []);

  // ✅ Track keyboard so we can add bottom padding and stop overlap
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
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

 const scrollToY = (y) => {
  setTimeout(() => {
    scrollRef.current?.scrollTo({ y: Math.max(y - 20, 0), animated: true });
  }, 150);
};


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} // ✅ helps with header height
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingBottom: Math.max(keyboardHeight, 24) + 40 }, // ✅ ensures button never hides
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="always"
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <Image source={logo2} style={styles.logo} resizeMode="contain" />
              </View>

              <Text style={styles.headerTitle}>Let’s get to know you</Text>
              <Text style={styles.headerSubtitle}>
                Meet Africans from Elite Schools around the World
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '20%' }]} />
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formWrapper}>
              {/* <Text style={styles.inputLabel}>First Name</Text> */}
              
             <Text style={styles.inputLabel}>First Name</Text>

<View
  onLayout={(e) => setFirstY(e.nativeEvent.layout.y)}
  style={styles.inputCard}
>
  <MaterialIcons name="person-outline" size={22} color="#581845" />
  <TextInput
    value={firstName}
    onChangeText={(text) => {
      setFirstName(text);
      setErrorMessage('');
    }}
    style={styles.input}
    placeholder="Enter first name"
    placeholderTextColor="#aaa"
    returnKeyType="next"
    blurOnSubmit={false}
    onFocus={() => scrollToY(firstY)}
    onSubmitEditing={() => lastNameRef.current?.focus()}
  />
</View>


             <Text style={styles.inputLabel}>Last Name</Text>

<View
  onLayout={(e) => setLastY(e.nativeEvent.layout.y)}
  style={styles.inputCard}
>
  <MaterialIcons name="person-outline" size={22} color="#581845" />
  <TextInput
    ref={lastNameRef}
    value={lastName}
    onChangeText={(text) => {
      setLastName(text);
      setErrorMessage('');
    }}
    style={styles.input}
    placeholder="Enter last name"
    placeholderTextColor="#aaa"
    returnKeyType="done"
    onFocus={() => scrollToY(lastY)}
    onSubmitEditing={handleNext}
  />
</View>


              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextButton}>
                <Text style={styles.nextText}>Continue</Text>
              </TouchableOpacity>

              {/* ✅ extra space so the button stays visible even with small screens */}
              <View style={{ height: 18 }} />
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
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 80,
    elevation: 4,
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
