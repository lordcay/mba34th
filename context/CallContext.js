import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Alert, AppState, Vibration } from 'react-native';
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

    // Listen for incoming calls
    socket.on('call:incoming', handleIncomingCall);

    // Listen for call rejection (when we're the caller)
    socket.on('call:rejected', handleCallRejected);

    // Listen for call end
    socket.on('call:ended', handleCallEnded);

    // When other user is busy
    socket.on('call:busy', handleBusy);

    // User unavailable
    socket.on('call:unavailable', handleUnavailable);

    return () => {
      socket.off('call:incoming');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('call:busy');
      socket.off('call:unavailable');
      stopRingtone();
    };
  }, [userId]);

  const handleIncomingCall = async (callData) => {
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

  const handleCallRejected = ({ reason }) => {
    console.log('Call rejected:', reason);
    setActiveCall(null);
    setIncomingCall(null);
    stopRingtone();
  };

  const handleCallEnded = ({ reason }) => {
    console.log('Call ended:', reason);
    setActiveCall(null);
    setIncomingCall(null);
    stopRingtone();
  };

  const handleBusy = () => {
    console.log('User is busy');
    setActiveCall(null);
    stopRingtone();
  };

  const handleUnavailable = ({ reason }) => {
    console.log('User unavailable:', reason);
    setActiveCall(null);
    stopRingtone();
  };

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

  const setCurrentCall = (call) => {
    setActiveCall(call);
  };

  const clearCall = () => {
    setActiveCall(null);
    setIncomingCall(null);
    stopRingtone();
  };

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
