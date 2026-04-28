import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, Vibration, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { socket } from '../socket';
import { AuthContext } from './AuthContext';
import { navigationRef } from '../navigation/RootNavigation';
import { Audio } from 'expo-av';

const CallContext = createContext();
export const useCall = () => useContext(CallContext);

// Mirror of CALL_TIMEOUT in CallScreen — auto-dismiss stale call notification
const CALL_NOTIF_TIMEOUT_MS = 45000;

export const CallProvider = ({ children }) => {
  const { userId, user } = useContext(AuthContext);
  const [incomingCall, setIncomingCall]   = useState(null);
  const [activeCall,   setActiveCall]     = useState(null);
  const ringtoneRef       = useRef(null);
  const appStateRef       = useRef(AppState.currentState);
  // identifier returned by scheduleNotificationAsync — used to dismiss the notification
  const callNotifIdRef    = useRef(null);
  // auto-dismiss timeout reference
  const callTimeoutRef    = useRef(null);

  // Keep appStateRef in sync so the socket handler always sees the current value
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const onIncomingCall = async (callData) => {
      console.log('📞 Incoming call:', callData);

      // Busy: reject immediately if already on a call
      if (activeCall) {
        socket.emit('call:busy', { callerId: callData.callerId, calleeId: userId });
        return;
      }

      setIncomingCall(callData);
      setActiveCall({ callId: callData.callId, peerId: callData.callerId });

      if (appStateRef.current === 'active' && navigationRef.isReady()) {
        // ── Foreground path ──────────────────────────────────────────────
        // Navigate directly; CallScreen handles ringtone + UI.
        navigationRef.navigate('Call', {
          isIncoming:           true,
          callType:             callData.callType,
          callerId:             callData.callerId,
          callerName:           callData.callerName,
          callerPhoto:          callData.callerPhoto,
          isConference:         callData.isConference || false,
          conferenceId:         callData.conferenceId || null,
          existingParticipants: callData.existingParticipants || [],
        });
      } else {
        // ── Background path ──────────────────────────────────────────────
        // App is suspended — show a system call notification.
        // The notification's sound (incoming.wav via the 'calls' channel on Android,
        // or bundled file on iOS) acts as the ringtone visible from the lock screen.
        await scheduleCallNotification(callData);
      }

      // Auto-dismiss the notification once the ring window closes (no answer)
      clearCallTimeout();
      callTimeoutRef.current = setTimeout(() => {
        dismissCallNotification();
        setActiveCall(null);
        setIncomingCall(null);
      }, CALL_NOTIF_TIMEOUT_MS);
    };

    socket.on('call:incoming', onIncomingCall);

    return () => {
      socket.off('call:incoming', onIncomingCall);
      stopRingtone();
    };
  }, [userId, activeCall]);

  // ─── Schedule a local call notification (background / killed) ────────────

  const scheduleCallNotification = async (callData) => {
    try {
      const callTypeLabel = callData.callType === 'video' ? 'Video' : 'Voice';

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Incoming ${callTypeLabel} Call`,
          body:  `${callData.callerName} is calling…`,
          // iOS: play incoming.wav bundled via app.json expo-notifications "sounds" array.
          // Android: the 'calls' channel sound (incoming.wav) takes precedence — 'default'
          // here is a safe fallback that prevents the channel sound from being overridden.
          sound: Platform.OS === 'ios' ? 'incoming.wav' : 'default',
          // iOS: show "Accept" and "Decline" buttons on the notification (lock screen / banner).
          categoryIdentifier: 'incoming_call',
          data: {
            kind:                 'call',
            callerId:             callData.callerId,
            callerName:           callData.callerName,
            callerPhoto:          callData.callerPhoto  || null,
            callType:             callData.callType     || 'audio',
            isConference:         callData.isConference || false,
            conferenceId:         callData.conferenceId || null,
            existingParticipants: callData.existingParticipants || [],
          },
          // Android: route to the calls channel which has bypassDnd + incoming.wav
          ...(Platform.OS === 'android' && { channelId: 'calls' }),
        },
        trigger: null, // fire immediately
      });

      callNotifIdRef.current = notifId;
    } catch (error) {
      console.log('Call notification scheduling error:', error);
    }
  };

  // ─── Dismiss the active call notification ────────────────────────────────

  const dismissCallNotification = useCallback(async () => {
    if (callNotifIdRef.current) {
      try {
        await Notifications.dismissNotificationAsync(callNotifIdRef.current);
      } catch {}
      callNotifIdRef.current = null;
    }
  }, []);

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // ─── Ringtone (used by CallScreen for the foreground path) ───────────────

  const playRingtone = async () => {
    try {
      if (ringtoneRef.current) return;
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.m4r'),
        { isLooping: true }
      );
      ringtoneRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('Ringtone error:', error);
    }
  };

  const stopRingtone = async () => {
    if (ringtoneRef.current) {
      try {
        await ringtoneRef.current.stopAsync();
        await ringtoneRef.current.unloadAsync();
        ringtoneRef.current = null;
      } catch (error) {
        console.log('Stop ringtone error:', error);
      }
    }
    Vibration.cancel();
  };

  // ─── Public API ──────────────────────────────────────────────────────────

  const setCurrentCall = useCallback((call) => setActiveCall(call), []);

  const clearCall = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
    stopRingtone();
    dismissCallNotification();
    clearCallTimeout();
  }, [dismissCallNotification]);

  return (
    <CallContext.Provider value={{ incomingCall, activeCall, setCurrentCall, clearCall }}>
      {children}
    </CallContext.Provider>
  );
};

export default CallContext;
