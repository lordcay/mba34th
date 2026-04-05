// screens/CreateEventScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AuthContext } from '../context/AuthContext';
import eventService from '../services/event.service';
import Colors from '../constants/Colors';

const ACCENT = Colors.primary || '#581845';

// Input Field Component
const InputField = ({ 
  label, 
  icon, 
  multiline = false, 
  error, 
  required = false,
  helperText,
  ...props 
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>
      {icon && <Ionicons name={icon} size={14} color={Colors.textSecondary} />}
      {icon && ' '}{label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <View style={[styles.inputWrapper, error && styles.inputError, multiline && styles.multilineWrapper]}>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
    {helperText && <Text style={styles.helperText}>{helperText}</Text>}
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// Main Create Event Screen
const CreateEventScreen = ({ route }) => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  // Edit mode check
  const editEvent = route?.params?.event;
  const isEditMode = !!editEvent;

  // Form state
  const [title, setTitle] = useState(editEvent?.title || '');
  const [description, setDescription] = useState(editEvent?.description || '');
  const [venueName, setVenueName] = useState(editEvent?.venueName || editEvent?.venue || '');
  const [fullAddress, setFullAddress] = useState(editEvent?.fullAddress || editEvent?.location || '');
  const [expectedAttendees, setExpectedAttendees] = useState(editEvent?.expectedAttendees?.toString() || editEvent?.maxAttendees?.toString() || '');

  // Date & Time state
  const initialDate = editEvent?.date ? new Date(editEvent.date) : new Date();
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialDate);

  // Date/Time picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Form state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Format date for display
  const formatDateDisplay = (d) => {
    if (!d || isNaN(d.getTime())) return 'mm/dd/yyyy';
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  // Format time for display
  const formatTimeDisplay = (t) => {
    if (!t || isNaN(t.getTime())) return '--:-- --';
    return t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Handle date change
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Handle time change
  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Event title is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Please add a description';
    }
    if (!venueName.trim()) {
      newErrors.venueName = 'Venue name is required';
    }
    if (!fullAddress.trim()) {
      newErrors.fullAddress = 'Full address is required';
    }
    if (!expectedAttendees.trim()) {
      newErrors.expectedAttendees = 'Expected number of attendees is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!validateForm()) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      // Combine date and time
      const eventDateTime = new Date(date);
      eventDateTime.setHours(time.getHours());
      eventDateTime.setMinutes(time.getMinutes());

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: eventDateTime.toISOString(),
        startDate: eventDateTime.toISOString(),
        venueName: venueName.trim(),
        venue: venueName.trim(),
        fullAddress: fullAddress.trim(),
        location: fullAddress.trim(),
        expectedAttendees: parseInt(expectedAttendees, 10),
        maxAttendees: parseInt(expectedAttendees, 10),
      };

      let result;
      if (isEditMode) {
        result = await eventService.updateEvent(editEvent._id || editEvent.id, eventData);
      } else {
        result = await eventService.createEvent(eventData);
      }

      if (result.success) {
        Alert.alert(
          'Success',
          isEditMode ? 'Event updated successfully!' : 'Event created successfully!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to save event. Please try again.');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <Text style={styles.screenTitle}>Create New Event</Text>
            <Text style={styles.screenSubtitle}>Share your event with the 34th Street community</Text>

            {/* Form Card */}
            <View style={styles.formCard}>
              {/* Event Title */}
              <InputField
                label="Event Title"
                placeholder="e.g., Jazz Night at The Blue Room"
                value={title}
                onChangeText={setTitle}
                error={errors.title}
                required
                maxLength={100}
              />

              {/* Event Description */}
              <InputField
                label="Event Description"
                icon="document-text-outline"
                placeholder="Tell people what your event is about..."
                value={description}
                onChangeText={setDescription}
                error={errors.description}
                required
                multiline
                numberOfLines={4}
                maxLength={2000}
              />

              {/* Date & Time Row */}
              <View style={styles.dateTimeRow}>
                {/* Date */}
                <View style={styles.dateTimeField}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} /> Date <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity 
                    style={styles.dateTimeInput}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[
                      styles.dateTimeText,
                      (!date || formatDateDisplay(date) === 'mm/dd/yyyy') && styles.placeholderText
                    ]}>
                      {formatDateDisplay(date)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Time */}
                <View style={styles.dateTimeField}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="time-outline" size={14} color={Colors.textSecondary} /> Time <Text style={styles.required}>*</Text>
                  </Text>
                  <TouchableOpacity 
                    style={styles.dateTimeInput}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={[
                      styles.dateTimeText,
                      (!time || formatTimeDisplay(time) === '--:-- --') && styles.placeholderText
                    ]}>
                      {formatTimeDisplay(time)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Venue Name */}
              <InputField
                label="Venue Name"
                icon="location-outline"
                placeholder="e.g., The Blue Room"
                value={venueName}
                onChangeText={setVenueName}
                error={errors.venueName}
                required
              />

              {/* Full Address */}
              <InputField
                label="Full Address"
                placeholder="123 34th Street, New York, NY 10001"
                value={fullAddress}
                onChangeText={setFullAddress}
                error={errors.fullAddress}
                required
              />

              {/* Expected Number of Attendees */}
              <InputField
                label="Expected Number of Attendees"
                icon="people-outline"
                placeholder="e.g., 50"
                value={expectedAttendees}
                onChangeText={setExpectedAttendees}
                error={errors.expectedAttendees}
                required
                keyboardType="number-pad"
                helperText="This helps us manage RSVPs and waitlist capacity"
              />

              {/* Buttons */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isEditMode ? 'Update Event' : 'Create Event'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={time || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // Input Fields
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: '#C70039',
  },
  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: Colors.error,
  },
  multilineWrapper: {
    minHeight: 100,
  },
  input: {
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multilineInput: {
    minHeight: 90,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#1E88E5',
    marginTop: 6,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },

  // Date Time Row
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateTimeField: {
    flex: 1,
  },
  dateTimeInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateTimeText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  placeholderText: {
    color: Colors.textMuted,
  },

  // Buttons
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  submitButton: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#8B4A73',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CreateEventScreen;
