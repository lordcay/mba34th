import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { AppState, Vibration } from 'react-native';
import { socket } from '../socket';
import { AuthContext } from './AuthContext';
import { navigationRef } from '../navigation/RootNavigation';
import { Audio } from 'expo-av';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
  const { userId, user } = useContext(AuthContext);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const ringtoneRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!userId) return;

    // Only listen for incoming calls here — all other call events
    // (rejected, ended, busy, unavailable) are handled by CallScreen
    // to avoid duplicate socket listener conflicts.
    const onIncomingCall = (callData) => {
      console.log('📞 Incoming call:', callData);

      // Check if we're already on a call
      if (activeCall) {
        socket.emit('call:busy', {
          callerId: callData.callerId,
          calleeId: userId,
        });
        return;
      }

      setIncomingCall(callData);
      setActiveCall({ callId: callData.callId, peerId: callData.callerId });

      // Navigate to CallScreen
      if (navigationRef.isReady()) {
        navigationRef.navigate('Call', {
          isIncoming: true,
          callType: callData.callType,
          callerId: callData.callerId,
          callerName: callData.callerName,
          callerPhoto: callData.callerPhoto,
        });
      }
    };

    socket.on('call:incoming', onIncomingCall);

    return () => {
      socket.off('call:incoming', onIncomingCall);
      stopRingtone();
    };
  }, [userId, activeCall]);

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

  const setCurrentCall = useCallback((call) => {
    setActiveCall(call);
  }, []);

  const clearCall = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
    stopRingtone();
  }, []);

  const value = {
    incomingCall,
    activeCall,
    setCurrentCall,
    clearCall,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};

export default CallContext;
