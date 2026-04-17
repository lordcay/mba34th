import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');
const ACCENT = Colors.primary || '#581845';
const ACCENT_DARK = Colors.primaryDark || '#3D1030';
const ACCENT_LIGHT = Colors.primarySoft || '#F5EDF8';

const VISIBILITY_OPTIONS = [
  {
    key: 'everyone',
    icon: 'globe-outline',
    title: 'Everyone',
    description: 'All event attendees can see you',
  },
  {
    key: 'connections',
    icon: 'people-outline',
    title: 'Connections Only',
    description: 'Only your connections can see you',
  },
  {
    key: 'private',
    icon: 'lock-closed-outline',
    title: 'Private',
    description: 'Only the host can see you attending',
  },
];

const RsvpVisibilityModal = ({ visible, onClose, onConfirm, eventTitle, loading }) => {
  const [selected, setSelected] = useState('everyone');

  const handleConfirm = () => {
    onConfirm(selected);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerContent}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="shield-checkmark" size={24} color={ACCENT} />
              </View>
              <Text style={styles.headerTitle}>RSVP Privacy</Text>
              <Text style={styles.headerSubtitle}>
                Choose who can see you're attending
              </Text>
            </View>
          </View>

          {/* Event title pill */}
          <View style={styles.eventPill}>
            <Ionicons name="calendar" size={14} color={ACCENT} />
            <Text style={styles.eventPillText} numberOfLines={1}>
              {eventTitle || 'This event'}
            </Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {VISIBILITY_OPTIONS.map((option) => {
              const isSelected = selected === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => setSelected(option.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionIconWrap, isSelected && styles.optionIconWrapSelected]}>
                    <Ionicons
                      name={option.icon}
                      size={22}
                      color={isSelected ? '#fff' : ACCENT}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                      {option.title}
                    </Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[ACCENT, '#900C3F']}
                style={styles.confirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.confirmText}>Confirm RSVP</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: ACCENT_LIGHT,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 6,
    maxWidth: width - 80,
  },
  eventPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT_DARK,
    flexShrink: 1,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  optionCardSelected: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}08`,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ACCENT_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionIconWrapSelected: {
    backgroundColor: ACCENT,
  },
  optionText: {
    flex: 1,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: ACCENT_DARK,
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: ACCENT,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT,
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 10,
  },
  confirmBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

export default RsvpVisibilityModal;
