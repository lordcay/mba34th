/**
 * OnboardingContext.js
 * 
 * A professional onboarding system inspired by apps like Slack, Notion, and Figma.
 * Provides coach marks, tooltips, and walkthrough functionality for first-time users.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const OnboardingContext = createContext();

// Storage key for local persistence
const ONBOARDING_STORAGE_KEY = '@onboarding_state';

// Define all onboarding steps for each screen
export const ONBOARDING_STEPS = {
  // Home Screen - User discovery
  Home: [
    {
      id: 'home_welcome',
      title: 'Welcome to 34th Street! 🎉',
      description: 'Discover amazing people from the African diaspora. Swipe through profiles to find connections.',
      position: 'center',
      targetRef: null,
    },
    {
      id: 'home_connect',
      title: 'Make Connections',
      description: 'Tap the connect button to send a connection request. Build your professional network!',
      position: 'bottom',
      highlight: 'connectButton',
    },
    {
      id: 'home_profile',
      title: 'View Full Profiles',
      description: 'Tap on any profile card to see more details about a person.',
      position: 'center',
      highlight: 'profileCard',
    },
    {
      id: 'home_drawer',
      title: 'Access Menu',
      description: 'Tap the menu icon to access your profile, settings, and more.',
      position: 'top-left',
      highlight: 'menuButton',
    },
  ],

  // Feed Screen - Daily gist
  Feed: [
    {
      id: 'feed_welcome',
      title: 'Daily Gist 📰',
      description: 'Every day brings a new topic! Vote on options and share your thoughts.',
      position: 'center',
    },
    {
      id: 'feed_vote',
      title: 'Cast Your Vote',
      description: 'Tap an option to vote. You can only vote once, so choose wisely!',
      position: 'center',
      highlight: 'voteOptions',
    },
    {
      id: 'feed_comment',
      title: 'Join the Conversation',
      description: 'Share your thoughts in the comments section below.',
      position: 'bottom',
      highlight: 'commentSection',
    },
  ],

  // Chat Rooms List
  ChatRoomsList: [
    {
      id: 'rooms_welcome',
      title: 'Community Chat Rooms 💬',
      description: 'Join themed rooms to discuss topics with the community.',
      position: 'center',
    },
    {
      id: 'rooms_info',
      title: 'Room Info',
      description: 'Tap the info icon to see room rules and description.',
      position: 'top-right',
      highlight: 'infoButton',
    },
    {
      id: 'rooms_enter',
      title: 'Enter a Room',
      description: 'Tap any room card to join the conversation.',
      position: 'center',
      highlight: 'roomCard',
    },
  ],

  // Chat Room (inside a room)
  ChatRoom: [
    {
      id: 'chatroom_welcome',
      title: 'Welcome to the Room! 🏠',
      description: 'This is where the magic happens. Chat with everyone in real-time.',
      position: 'center',
    },
    {
      id: 'chatroom_reply',
      title: 'Reply to Messages',
      description: 'Long-press any message to reply, report, or delete (your own).',
      position: 'center',
      highlight: 'messageArea',
    },
    {
      id: 'chatroom_compose',
      title: 'Send a Message',
      description: 'Type your message and tap send to share with the room.',
      position: 'bottom',
      highlight: 'composer',
    },
  ],

  // Private Chat
  PrivateChat: [
    {
      id: 'dm_welcome',
      title: 'Private Messages 🔒',
      description: 'This is a private conversation. Messages are only visible to you and this person.',
      position: 'center',
    },
    {
      id: 'dm_call',
      title: 'Voice & Video Calls',
      description: 'Tap the call icons to start a voice or video call with your connection.',
      position: 'top-right',
      highlight: 'callButtons',
    },
  ],

  // User Profile
  UserProfile: [
    {
      id: 'profile_view',
      title: 'Profile Details 👤',
      description: 'View detailed information about this person - their background, interests, and more.',
      position: 'center',
    },
    {
      id: 'profile_connect',
      title: 'Connect or Message',
      description: 'Send a connection request or message if you\'re already connected.',
      position: 'bottom',
      highlight: 'actionButtons',
    },
  ],

  // Posts Feed
  PostsFeed: [
    {
      id: 'posts_welcome',
      title: 'Community Posts 📝',
      description: 'See what the community is sharing. Like, comment, and engage!',
      position: 'center',
    },
    {
      id: 'posts_create',
      title: 'Create a Post',
      description: 'Tap the create button to share your thoughts, updates, or opportunities.',
      position: 'bottom-right',
      highlight: 'createButton',
    },
    {
      id: 'posts_interact',
      title: 'Engage with Posts',
      description: 'Like, comment, and share posts that resonate with you.',
      position: 'center',
      highlight: 'postActions',
    },
  ],

  // Notifications
  Notifications: [
    {
      id: 'notif_welcome',
      title: 'Stay Updated 🔔',
      description: 'All your notifications in one place - connection requests, messages, mentions, and more.',
      position: 'center',
    },
    {
      id: 'notif_tabs',
      title: 'Filter by Type',
      description: 'Switch between tabs to see specific notification types.',
      position: 'top',
      highlight: 'tabs',
    },
  ],

  // Edit Profile
  EditProfile: [
    {
      id: 'edit_welcome',
      title: 'Complete Your Profile ✨',
      description: 'A complete profile helps others know you better and increases your chances of making connections.',
      position: 'center',
    },
    {
      id: 'edit_photos',
      title: 'Add Photos',
      description: 'Upload your best photos. Profiles with photos get 10x more connections!',
      position: 'top',
      highlight: 'photoSection',
    },
  ],

  // Search
  Search: [
    {
      id: 'search_welcome',
      title: 'Find People 🔍',
      description: 'Search for people by name, location, industry, or interests.',
      position: 'center',
    },
    {
      id: 'search_filters',
      title: 'Use Filters',
      description: 'Narrow down results using filters to find exactly who you\'re looking for.',
      position: 'top',
      highlight: 'filterBar',
    },
  ],

  // Chat / DM List Screen
  Chat: [
    {
      id: 'chat_welcome',
      title: 'Your Conversations 💬',
      description: 'All your private conversations are here. Tap any chat to continue the conversation.',
      position: 'center',
    },
    {
      id: 'chat_search',
      title: 'Search Chats',
      description: 'Use the search bar to quickly find a conversation.',
      position: 'top',
      highlight: 'searchBar',
    },
  ],

  // Connections Screen
  Connections: [
    {
      id: 'conn_welcome',
      title: 'Your Network 🤝',
      description: 'See all your connections in one place. Start conversations with anyone.',
      position: 'center',
    },
    {
      id: 'conn_message',
      title: 'Start a Chat',
      description: 'Tap on any connection to start a private conversation.',
      position: 'center',
      highlight: 'connectionItem',
    },
  ],
};

// Provider Component
export const OnboardingProvider = ({ children }) => {
  // Track which screens/steps have been completed
  const [completedSteps, setCompletedSteps] = useState({});
  // Track the active screen's current step index
  const [activeScreen, setActiveScreen] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  // Control visibility of onboarding overlay
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  // First launch flag
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  // Global onboarding enabled flag
  const [onboardingEnabled, setOnboardingEnabled] = useState(true);

  // Load saved state on mount
  useEffect(() => {
    loadOnboardingState();
  }, []);

  // Load onboarding state from AsyncStorage and backend
  const loadOnboardingState = async () => {
    try {
      // Load local state first
      const savedState = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      let localCompleted = {};
      if (savedState) {
        const parsed = JSON.parse(savedState);
        localCompleted = parsed.completedSteps || {};
      }

      // Try to merge with backend state
      try {
        const response = await api.get('/accounts/me/onboarding');
        const backendScreens = response.data?.completedScreens || [];
        backendScreens.forEach(screen => {
          localCompleted[screen] = true;
        });
      } catch (err) {
        // Backend unavailable - use local state only
        console.log('Backend onboarding sync skipped:', err.message);
      }

      if (Object.keys(localCompleted).length > 0) {
        setCompletedSteps(localCompleted);
        saveOnboardingState(localCompleted);
        setIsFirstLaunch(false);
      } else {
        setIsFirstLaunch(true);
        setCompletedSteps({});
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save onboarding state to AsyncStorage
  const saveOnboardingState = async (newState) => {
    try {
      await AsyncStorage.setItem(
        ONBOARDING_STORAGE_KEY,
        JSON.stringify({ completedSteps: newState })
      );
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  };

  // Sync onboarding completion with backend
  const syncWithBackend = async (newCompletedSteps) => {
    try {
      await api.patch('/accounts/me/onboarding', {
        completedScreens: Object.keys(newCompletedSteps || completedSteps),
      });
    } catch (error) {
      // Silently fail - local storage is the source of truth
      console.log('Backend sync skipped:', error.message);
    }
  };

  // Start onboarding for a specific screen
  const startScreenOnboarding = useCallback((screenName) => {
    if (!onboardingEnabled) return;
    
    const steps = ONBOARDING_STEPS[screenName];
    if (!steps || steps.length === 0) return;

    // Check if this screen's onboarding has been completed
    const screenCompleted = completedSteps[screenName];
    if (screenCompleted) return;

    setActiveScreen(screenName);
    setCurrentStepIndex(0);
    setIsOnboardingActive(true);
  }, [completedSteps, onboardingEnabled]);

  // Get current step for active screen
  const getCurrentStep = useCallback(() => {
    if (!activeScreen) return null;
    const steps = ONBOARDING_STEPS[activeScreen];
    if (!steps || currentStepIndex >= steps.length) return null;
    return steps[currentStepIndex];
  }, [activeScreen, currentStepIndex]);

  // Move to next step or complete screen onboarding
  const nextStep = useCallback(() => {
    if (!activeScreen) return;
    
    const steps = ONBOARDING_STEPS[activeScreen];
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Complete this screen's onboarding
      completeScreenOnboarding(activeScreen);
    }
  }, [activeScreen, currentStepIndex]);

  // Skip all steps for current screen
  const skipOnboarding = useCallback(() => {
    if (activeScreen) {
      completeScreenOnboarding(activeScreen);
    }
  }, [activeScreen]);

  // Mark a screen's onboarding as complete
  const completeScreenOnboarding = useCallback((screenName) => {
    const newCompletedSteps = {
      ...completedSteps,
      [screenName]: true,
    };
    setCompletedSteps(newCompletedSteps);
    saveOnboardingState(newCompletedSteps);
    syncWithBackend(newCompletedSteps);
    setIsOnboardingActive(false);
    setActiveScreen(null);
    setCurrentStepIndex(0);
  }, [completedSteps]);

  // Check if a screen's onboarding is complete
  const isScreenCompleted = useCallback((screenName) => {
    return !!completedSteps[screenName];
  }, [completedSteps]);

  // Reset all onboarding (for testing or user request)
  const resetOnboarding = useCallback(async () => {
    setCompletedSteps({});
    setIsFirstLaunch(true);
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
  }, []);

  // Disable onboarding globally
  const disableOnboarding = useCallback(() => {
    setOnboardingEnabled(false);
    setIsOnboardingActive(false);
  }, []);

  // Enable onboarding globally
  const enableOnboarding = useCallback(() => {
    setOnboardingEnabled(true);
  }, []);

  // Get total progress
  const getProgress = useCallback(() => {
    const totalScreens = Object.keys(ONBOARDING_STEPS).length;
    const completedScreens = Object.keys(completedSteps).length;
    return {
      completed: completedScreens,
      total: totalScreens,
      percentage: totalScreens > 0 ? Math.round((completedScreens / totalScreens) * 100) : 0,
    };
  }, [completedSteps]);

  const value = {
    // State
    isOnboardingActive,
    isFirstLaunch,
    isLoading,
    activeScreen,
    currentStepIndex,
    completedSteps,
    onboardingEnabled,
    
    // Actions
    startScreenOnboarding,
    getCurrentStep,
    nextStep,
    skipOnboarding,
    completeScreenOnboarding,
    isScreenCompleted,
    resetOnboarding,
    disableOnboarding,
    enableOnboarding,
    getProgress,
    
    // Constants
    ONBOARDING_STEPS,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Custom hook to use onboarding context
export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingContext;
