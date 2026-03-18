/**
 * CoachMark.js
 * 
 * A beautiful, modern coach mark component for onboarding walkthroughs.
 * Inspired by apps like Slack, Notion, Figma, and Airbnb.
 * 
 * Features:
 * - Spotlight effect with configurable positions
 * - Smooth animations
 * - Progress indicators
 * - Skip and Next actions
 * - Responsive positioning
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Brand colors
const ACCENT_COLOR = '#581845';
const ACCENT_LIGHT = '#9b4d8a';

const CoachMark = ({
  visible,
  step,
  totalSteps,
  currentIndex,
  onNext,
  onSkip,
  onComplete,
  position = 'center', // 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  spotlightPosition = null, // { x, y, width, height } for highlighting specific UI elements
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isLastStep = currentIndex === totalSteps - 1;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for the spotlight
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Progress animation
      Animated.timing(progressAnim, {
        toValue: (currentIndex + 1) / totalSteps,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible, currentIndex]);

  // Get card position based on the position prop
  const getCardStyle = () => {
    const cardWidth = Math.min(SCREEN_WIDTH - 48, 340);
    const baseStyle = {
      width: cardWidth,
      maxWidth: 340,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          top: insets.top + 80,
          alignSelf: 'center',
        };
      case 'top-left':
        return {
          ...baseStyle,
          top: insets.top + 80,
          left: 24,
        };
      case 'top-right':
        return {
          ...baseStyle,
          top: insets.top + 80,
          right: 24,
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: insets.bottom + 120,
          alignSelf: 'center',
        };
      case 'bottom-left':
        return {
          ...baseStyle,
          bottom: insets.bottom + 120,
          left: 24,
        };
      case 'bottom-right':
        return {
          ...baseStyle,
          bottom: insets.bottom + 120,
          right: 24,
        };
      case 'center':
      default:
        return {
          ...baseStyle,
          alignSelf: 'center',
          top: SCREEN_HEIGHT / 2 - 120,
        };
    }
  };

  // Get arrow/pointer direction based on position
  const getPointerStyle = () => {
    switch (position) {
      case 'top':
      case 'top-left':
      case 'top-right':
        return styles.pointerDown;
      case 'bottom':
      case 'bottom-left':
      case 'bottom-right':
        return styles.pointerUp;
      default:
        return null;
    }
  };

  if (!visible || !step) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Backdrop with blur effect */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBackdrop]} />
        )}

        {/* Spotlight circle (if position provided) */}
        {spotlightPosition && (
          <Animated.View
            style={[
              styles.spotlight,
              {
                transform: [{ scale: pulseAnim }],
                left: spotlightPosition.x - 10,
                top: spotlightPosition.y - 10,
                width: spotlightPosition.width + 20,
                height: spotlightPosition.height + 20,
                borderRadius: (spotlightPosition.width + 20) / 2,
              },
            ]}
          />
        )}

        {/* Coach card */}
        <Animated.View
          style={[
            styles.card,
            getCardStyle(),
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Pointer/Arrow */}
          {getPointerStyle() && <View style={getPointerStyle()} />}

          {/* Icon/Emoji header */}
          <View style={styles.iconContainer}>
            {step.title.includes('🎉') || step.title.includes('Welcome') ? (
              <View style={styles.emojiCircle}>
                <Text style={styles.emoji}>👋</Text>
              </View>
            ) : (
              <View style={styles.iconCircle}>
                <Ionicons 
                  name={getStepIcon(step.id)} 
                  size={24} 
                  color="#fff" 
                />
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{cleanTitle(step.title)}</Text>

          {/* Description */}
          <Text style={styles.description}>{step.description}</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentIndex + 1} of {totalSteps}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip all</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={isLastStep ? onComplete : onNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? 'Got it!' : 'Next'}
              </Text>
              {!isLastStep && (
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Step dots indicator */}
          <View style={styles.dotsContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                  index < currentIndex && styles.dotCompleted,
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Helper function to get icon based on step ID
const getStepIcon = (stepId) => {
  const iconMap = {
    home: 'home',
    connect: 'people',
    profile: 'person',
    drawer: 'menu',
    feed: 'newspaper',
    vote: 'checkmark-circle',
    comment: 'chatbubble',
    rooms: 'chatbubbles',
    info: 'information-circle',
    enter: 'enter',
    chatroom: 'chatbox',
    reply: 'arrow-undo',
    compose: 'create',
    dm: 'lock-closed',
    call: 'call',
    edit: 'create',
    photos: 'camera',
    search: 'search',
    filters: 'filter',
    conn: 'git-network',
    message: 'chatbubble-ellipses',
    posts: 'document-text',
    create: 'add-circle',
    interact: 'heart',
    notif: 'notifications',
    tabs: 'albums',
  };

  // Find matching icon from step ID
  for (const [key, icon] of Object.entries(iconMap)) {
    if (stepId.includes(key)) {
      return icon;
    }
  }
  return 'bulb'; // Default icon
};

// Helper to remove emojis from title for cleaner display
const cleanTitle = (title) => {
  return title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  androidBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  spotlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: ACCENT_COLOR,
    backgroundColor: 'transparent',
  },
  card: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    paddingTop: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    marginHorizontal: 24,
  },
  pointerDown: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  pointerUp: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#fff',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f0f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e5e5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: ACCENT_COLOR,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
  },
  dotActive: {
    width: 20,
    backgroundColor: ACCENT_COLOR,
  },
  dotCompleted: {
    backgroundColor: ACCENT_LIGHT,
  },
});

export default CoachMark;
