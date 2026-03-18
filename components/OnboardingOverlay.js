/**
 * OnboardingOverlay.js
 * 
 * A wrapper component that provides onboarding functionality for any screen.
 * Simply wrap your screen content with this component and provide the screen name.
 * 
 * Usage:
 * ```jsx
 * import OnboardingOverlay from '../components/OnboardingOverlay';
 * 
 * function MyScreen() {
 *   return (
 *     <OnboardingOverlay screenName="Home">
 *       {// Your screen content //}
 *     </OnboardingOverlay>
 *   );
 * }
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useOnboarding, ONBOARDING_STEPS } from '../context/OnboardingContext';
import CoachMark from './CoachMark';

const OnboardingOverlay = ({ 
  screenName, 
  children,
  delay = 500, // Delay before showing onboarding (allows screen to render)
}) => {
  const {
    isOnboardingActive,
    activeScreen,
    currentStepIndex,
    startScreenOnboarding,
    getCurrentStep,
    nextStep,
    skipOnboarding,
    completeScreenOnboarding,
    isScreenCompleted,
    onboardingEnabled,
  } = useOnboarding();

  // Get steps for this screen
  const steps = ONBOARDING_STEPS[screenName] || [];
  const totalSteps = steps.length;
  const currentStep = getCurrentStep();

  // Start onboarding when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Only start if this screen has steps and hasn't been completed
      if (steps.length > 0 && !isScreenCompleted(screenName) && onboardingEnabled) {
        const timer = setTimeout(() => {
          startScreenOnboarding(screenName);
        }, delay);
        return () => clearTimeout(timer);
      }
    }, [screenName, isScreenCompleted, onboardingEnabled, delay])
  );

  // Handle next step
  const handleNext = useCallback(() => {
    nextStep();
  }, [nextStep]);

  // Handle skip
  const handleSkip = useCallback(() => {
    skipOnboarding();
  }, [skipOnboarding]);

  // Handle complete
  const handleComplete = useCallback(() => {
    completeScreenOnboarding(screenName);
  }, [completeScreenOnboarding, screenName]);

  // Determine if this screen's onboarding should show
  const shouldShowCoachMark = 
    isOnboardingActive && 
    activeScreen === screenName && 
    currentStep !== null;

  return (
    <>
      {children}
      <CoachMark
        visible={shouldShowCoachMark}
        step={currentStep}
        totalSteps={totalSteps}
        currentIndex={currentStepIndex}
        onNext={handleNext}
        onSkip={handleSkip}
        onComplete={handleComplete}
        position={currentStep?.position || 'center'}
      />
    </>
  );
};

export default OnboardingOverlay;
