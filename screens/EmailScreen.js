



import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Fontisto from 'react-native-vector-icons/Fontisto';
import { useNavigation } from '@react-navigation/native';
import { getRegistrationProgress, saveRegistrationProgress } from '../registrationUtils';
import { Picker } from '@react-native-picker/picker';
import logo2 from '../assets/logo1.png';

const universities = [
  { name: 'Choose a university', extension: '' },
  { name: 'American Uni.', extension: '@american.edu' },
  { name: 'Arizona State', extension: '@asu.edu' },
  { name: 'Babson', extension: '@babson.edu' },
  { name: 'Bayes', extension: '@city.ac.uk' },
  { name: 'Boston University', extension: '@bu.edu' },
  { name: 'Cambridge', extension: '@cam.ac.uk' },
  { name: 'Canada West', extension: '@ucanada.ca' },
  { name: 'Carnegie Mellon', extension: '@cmu.edu' },
  { name: 'Chicago Booth', extension: '@chicagobooth.edu' },
  { name: 'Columbia', extension: '@columbia.edu' },
  { name: 'Cornell', extension: '@cornell.edu' },
  { name: 'Cranfield', extension: '@cranfield.ac.uk' },
  { name: 'Darden', extension: '@darden.virginia.edu' },
  { name: 'Duke', extension: '@duke.edu' },
  { name: 'Emory', extension: '@emory.edu' },
  { name: 'Georgetown Uni.', extension: '@georgetown.edu' },
  { name: 'Georgia Institute of Technology', extension: '@gatech.edu' },
  { name: 'Haas', extension: '@haas.berkeley.edu' },
  { name: 'Harvard', extension: '@hbs.edu' },
  { name: 'HEC', extension: '@hec.edu' },
  { name: 'IESE', extension: '@iese.edu' },
  { name: 'IMD', extension: '@imd.org' },
  { name: 'Imperial', extension: '@imperial.ac.uk' },
  { name: 'Indiana University', extension: '@iu.edu' },
  { name: 'INSEAD', extension: '@insead.edu' },
  { name: 'Johns Hopkins', extension: '@jhu.edu' },
  { name: 'Kellog', extension: '@kellogg.northwestern.edu' },
  { name: 'LBS', extension: '@london.edu' },
  { name: 'Leeds', extension: '@leeds.ac.uk' },
  { name: 'McGill', extension: '@mcgill.ca' },
  { name: 'Michigan State', extension: '@msu.edu' },
  { name: 'MIT', extension: '@mit.edu' },
  { name: 'NYU', extension: '@stern.nyu.edu' },
  { name: 'Ohio State', extension: '@osu.edu' },
  { name: 'Owen', extension: '@owen.vanderbilt.edu' },
  { name: 'Oxford', extension: '@ox.ac.uk' },
  { name: 'Purdue Uni', extension: '@purdue.edu' },
  { name: 'Queen’s Uni.', extension: '@queensu.ca' },
  { name: 'Rice', extension: '@rice.edu' },
  { name: 'Rotman', extension: '@utoronto.ca' },
  { name: 'Southwales', extension: '@students.southwales.ac.uk.' },
  { name: 'Temple', extension: '@temple.edu' },
  { name: 'Tuck', extension: '@tuck.dartmouth.edu' },
  { name: 'UCLA', extension: '@anderson.ucla.edu' },
  { name: 'UNC', extension: '@unc.edu' },
  { name: 'Uni. of California', extension: '@ucdavis.edu' },
  { name: 'Uni. of California', extension: '@uci.edu' },
  { name: 'Uni. of Louisville', extension: '@louisville.edu' },
  { name: 'Uni. of Maryland', extension: '@umd.edu' },
  { name: 'Uni. of Michigan', extension: '@umich.edu' },
  { name: 'Uni. of Notre Dame', extension: '@nd.edu' },
  { name: 'Uni. of Pittsburgh', extension: '@pitt.edu' },
  { name: 'Uni. of Rochester', extension: '@rochester.edu' },
  { name: 'Uni. of Rochester', extension: '@rochester.edu' },
  { name: 'Uni.of Cambridge', extension: '@jbs.cam.ac.uk' },
  { name: 'Uni.of Minnesota', extension: '@umn.edu' },
  { name: 'USC', extension: '@usc.edu' },
  { name: 'UT Austin', extension: '@utexas.edu' },
  { name: 'Vanderbilt', extension: '@vanderbilt.edu' },
  { name: 'Warwick', extension: '@wbs.ac.uk' },
  { name: 'WashU', extension: '@wustl.edu' },
  { name: 'Western Uni.', extension: '@uwo.ca' },
  { name: 'Wharton', extension: '@wharton.upenn.edu' },
  { name: 'William & Mary', extension: '@wm.edu' },
  { name: 'Yale', extension: '@yale.edu' },
  { name: 'York University', extension: '@schulich.yorku.ca' }
];



const EmailScreen = () => {
  const [emailUsername, setEmailUsername] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const navigation = useNavigation();
  const [errorMessage, setErrorMessage] = useState('');


  useEffect(() => {
    getRegistrationProgress('Email').then((progressData) => {
      if (progressData) {
        setEmailUsername(progressData.emailUsername || '');
        setSelectedUniversity(progressData.selectedUniversity || '');
      }
    });
  }, []);

  const handleNext = () => {
    if (!selectedUniversity || selectedUniversity === 'Choose a university') {
      setErrorMessage('All fields are required.');
      return;
    }
    if (emailUsername.trim() === '') {
      setErrorMessage('Please enter your email username.');
      return;
    }

    // Clear error message if validation passes
    setErrorMessage('');

    const selectedDomain =
      universities.find((uni) => uni.name === selectedUniversity)?.extension || '';
    const fullEmail = `${emailUsername.toLowerCase()}${selectedDomain}`;

    // const fullEmail = `${emailUsername}${selectedDomain}`;

    saveRegistrationProgress('Email', { email: fullEmail, selectedUniversity });

    navigation.navigate('PasswordScreen');
  };






  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <View style={styles.logoWrapper}>
                <Image source={logo2} style={styles.logo} resizeMode="contain" />
              </View>
              {/* <Text style={styles.headerTitle}>Join 34TH STREET</Text> */}
              <Text style={styles.headerSubtitle}>Connect across top universities</Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '40%' }]} />
              </View>
            </View>


            <View style={styles.formContainer}>
              \

              {/* University Picker */}
              <Text style={styles.label}>Select Your University</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedUniversity}
                  onValueChange={(itemValue) => setSelectedUniversity(itemValue)}
                >
                  {universities.map((uni, index) => (
                    <Picker.Item key={index} label={uni.name} value={uni.name} />
                  ))}
                </Picker>
              </View>

              {/* Email Username Input */}
              <Text style={styles.label}>Enter your school email </Text>
              <View style={styles.emailContainer}>
                <TextInput
                  autoFocus={true}
                  value={emailUsername}
                  onChangeText={(text) => {
                    setEmailUsername(text);
                    if (text.trim() !== '') {
                      setErrorMessage(''); // Clear error when user types
                    }
                  }}
                  style={styles.emailInput}
                  placeholder="your.username"
                  placeholderTextColor={'#BEBEBE'}
                />
                {selectedUniversity && selectedUniversity !== 'Choose a university' && (
                  <Text style={styles.emailSuffix}>
                    {universities.find((uni) => uni.name === selectedUniversity)?.extension || ''}
                  </Text>
                )}


              </View>
              {/* Error Message */}
              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Text style={styles.noteText}>Email verification helps us keep our community safe.</Text>

              {/* Next Button */}
              <TouchableOpacity onPress={handleNext} activeOpacity={0.8} style={styles.nextButton}>
                <MaterialCommunityIcons name="arrow-right-circle" size={45} color="#581845" />
              </TouchableOpacity>
            </View>


          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default EmailScreen;

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
  headerText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 23,
    fontFamily: 'GeezaPro-Bold',
    color: 'white',
  },
  scrollContainer: {
    flexGrow: 1,
  },

  progressContainer: {
    height: 8,
    width: '80%',
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
  keyboardView: { flex: 1 },

  logoContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  // logo: { width: 150, height: 80, resizeMode: 'contain', top: 20 },
  headerTitle: { marginTop: 20, textAlign: 'center', fontSize: 23, color: 'white', fontWeight: 'bold' },
  headerSubtitle: { marginTop: 10, textAlign: 'center', fontSize: 18, color: '#ffb60a', fontWeight: 'bold' },
  formContainer: { marginTop: 10, marginHorizontal: 20 },
  formContainer: { marginTop: 10, marginHorizontal: 20 },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: '#581845',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: { width: 100, height: 40 },
  inputTitle: { fontSize: 25, fontWeight: 'bold', marginTop: 15 },
  infoText: { marginTop: 30, fontSize: 15, color: 'gray' },
  noteText: { fontSize: 12, color: '#581845', fontStyle: 'italic' },
  learnMore: { color: '#581845', fontWeight: '500' },
  label: { marginTop: 20, fontSize: 16, fontWeight: 'bold', color: '#581845' },
  emailContainer: { flexDirection: 'row', alignItems: 'center', borderBottomColor: 'black', borderBottomWidth: 1, paddingBottom: 10, marginTop: 10, overflow: 'hidden' },
  emailInput: { flex: 1, fontSize: 22 },
  emailSuffix: { fontSize: 22, color: 'gray' },
  nextButton: { marginTop: 30, marginLeft: 'auto', alignSelf: 'center' },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
});



