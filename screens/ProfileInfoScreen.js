

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { saveRegistrationProgress } from '../registrationUtils';

const ProfileInfoScreen = () => {
  const navigation = useNavigation();

  const [gender, setGender] = useState('');
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [origin, setOrigin] = useState('');
  const [cityCountry, setCityCountry] = useState('');
  const [degree, setDegree] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');

  const handleNext = async () => {
    if (!gender || !dob || !origin || !cityCountry || !degree || !gradYear || !bio.trim()) {
      setError('Please complete all fields.');
      return;
    }

    const formattedDOB = dob.toISOString().split('T')[0];

    const payload = {
      gender,
      birth: formattedDOB,
      origin,
      location: cityCountry,
      type: degree,
      gradYear,
      bio,
    };

    try {
      await saveRegistrationProgress('ProfileInfo', payload);
      navigation.navigate('PreFinalScreen');
    } catch (err) {
      console.error('Failed to save profile info:', err);
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: '60%' }]} />
          </View>

          <Text style={styles.title}>Tell us about yourself</Text>

          <Text style={styles.label}>Sex</Text>
          <Picker
            selectedValue={gender}
            onValueChange={(value) => setGender(value)}
            style={styles.picker}
          >
            <Picker.Item label="Select sex" value="" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>

          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{dob.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={dob}
              mode="date"
              display="default"
              onChange={(e, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDob(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>Origin</Text>
          <TextInput
            value={origin}
            onChangeText={setOrigin}
            placeholder="e.g., Nigeria"
            style={styles.input}
          />

          <Text style={styles.label}>City & Country of Study</Text>
          <TextInput
            value={cityCountry}
            onChangeText={setCityCountry}
            placeholder="e.g., Durham, USA"
            style={styles.input}
          />

          <Text style={styles.label}>Degree</Text>
          <Picker
            selectedValue={degree}
            onValueChange={setDegree}
            style={styles.picker}
          >
            <Picker.Item label="Select Degree" value="" />
            <Picker.Item label="Bachelor’s" value="Bachelor" />
            <Picker.Item label="Master’s" value="Master" />
            <Picker.Item label="MBA" value="MBA" />
            <Picker.Item label="PhD" value="PhD" />
          </Picker>

          <Text style={styles.label}>Graduation Year</Text>
          <TextInput
            value={gradYear}
            onChangeText={setGradYear}
            placeholder="e.g., 2026"
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.label}>Bio / About Me</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Write something about yourself (100 words max)"
            multiline
            numberOfLines={4}
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          />

          {error ? <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfileInfoScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { padding: 24 },
  progressContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#eee',
    borderRadius: 4,
    marginBottom: 30,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#581845',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#581845',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  picker: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
  },
  button: {
    backgroundColor: '#581845',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});
