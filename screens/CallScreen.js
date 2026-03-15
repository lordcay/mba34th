import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
  Animated,
  Vibration,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { socket } from '../socket';
import { AuthContext } from '../context/AuthContext';
import { Audio } from 'expo-av';

// Conditionally import WebRTC (won't work in Expo Go)
let RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView, mediaDevices;
let webrtcAvailable = false;

try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCView = webrtc.RTCView;
  mediaDevices = webrtc.mediaDevices;
  webrtcAvailable = true;
} catch (e) {
  console.log('WebRTC not available - requires development build');
}

const { width, height } = Dimensions.get('window');

// WebRTC Configuration (using free Google STUN servers + TURN for NAT traversal)
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

const CallScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user, userId } = useContext(AuthContext);

  // Check if WebRTC is available (not in Expo Go)
  useEffect(() => {
    if (!webrtcAvailable) {
      Alert.alert(
        'Feature Not Available',
        'Video/Audio calling requires a development build. Please run the app using "npx expo run:android" or "npx expo run:ios" instead of Expo Go.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, []);

  // Route params
  const {
    isIncoming = false,
    callType = 'audio', // 'audio' or 'video'
    callerId,
    callerName,
    callerPhoto,
    calleeId,
    calleeName,
    calleePhoto,
  } = route.params || {};

  // Determine remote user info based on who we are
  const isInitiator = !isIncoming;
  const remoteUserId = isIncoming ? callerId : calleeId;
  const remoteName = isIncoming ? callerName : calleeName;
  const remotePhoto = isIncoming ? callerPhoto : calleePhoto;

  // State
  const [callState, setCallState] = useState(isIncoming ? 'incoming' : 'calling'); // incoming, calling, connected, ended
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === 'video');
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(callType === 'video');

  // Refs
  const peerConnectionRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize call
  useEffect(() => {
    setupCall();
    
    return () => {
      cleanup();
    };
  }, []);

  // Socket listeners
  useEffect(() => {
    // When call is accepted
    socket.on('call:accepted', handleCallAccepted);
    
    // When we receive an offer (as callee)
    socket.on('call:offer', handleOffer);
    
    // When we receive an answer (as caller)
    socket.on('call:answer', handleAnswer);
    
    // ICE candidates
    socket.on('call:ice-candidate', handleIceCandidate);
    
    // Call rejected
    socket.on('call:rejected', handleCallRejected);
    
    // Call ended
    socket.on('call:ended', handleCallEnded);
    
    // Remote video toggled
    socket.on('call:video-toggled', ({ videoEnabled }) => {
      setIsRemoteVideoEnabled(videoEnabled);
    });
    
    // Remote audio toggled
    socket.on('call:audio-toggled', ({ audioEnabled }) => {
      // Could show visual indicator
    });
    
    // Busy
    socket.on('call:busy', handleBusy);
    
    // Unavailable
    socket.on('call:unavailable', handleUnavailable);

    return () => {
      socket.off('call:accepted');
      socket.off('call:offer');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
      socket.off('call:rejected');
      socket.off('call:ended');
      socket.off('call:video-toggled');
      socket.off('call:audio-toggled');
      socket.off('call:busy');
      socket.off('call:unavailable');
    };
  }, []);

  // Pulse animation for incoming call
  useEffect(() => {
    if (callState === 'incoming') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      // Vibrate for incoming call
      const vibrationPattern = [0, 500, 500];
      const interval = setInterval(() => {
        Vibration.vibrate(vibrationPattern);
      }, 2000);
      
      return () => {
        pulse.stop();
        clearInterval(interval);
        Vibration.cancel();
      };
    }
  }, [callState]);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState]);

  const setupCall = async () => {
    // Check if WebRTC is available (not in Expo Go)
    if (!webrtcAvailable) {
      return;
    }
    
    try {
      // Get local media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      });
      
      setLocalStream(stream);
      
      // Create peer connection
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;
      
      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:ice-candidate', {
            peerId: remoteUserId,
            candidate: event.candidate,
          });
        }
      };
      
      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState('connected');
          stopRingtone();
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          handleCallEnded({ reason: 'Connection lost' });
        }
      };
      
      // If we're the initiator, start the call
      if (isInitiator) {
        initiateCall();
        playRingtone('outgoing');
      } else {
        playRingtone('incoming');
      }
    } catch (error) {
      console.error('Error setting up call:', error);
      Alert.alert('Error', 'Failed to access camera/microphone. Please check permissions.');
      navigation.goBack();
    }
  };

  const initiateCall = async () => {
    // Emit call initiation
    socket.emit('call:initiate', {
      callerId: userId,
      callerName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown',
      callerPhoto: user?.photos?.[0] || null,
      calleeId: calleeId,
      callType,
    });
  };

  const handleCallAccepted = async ({ calleeId }) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Send offer to callee
      socket.emit('call:offer', {
        calleeId,
        offer,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async ({ offer }) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer back to caller
      socket.emit('call:answer', {
        callerId: remoteUserId,
        answer,
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async ({ answer }) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;
      
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async ({ candidate }) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const handleCallRejected = ({ reason }) => {
    stopRingtone();
    Alert.alert('Call Declined', reason || 'The call was declined');
    navigation.goBack();
  };

  const handleCallEnded = ({ reason }) => {
    stopRingtone();
    setCallState('ended');
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const handleBusy = () => {
    stopRingtone();
    Alert.alert('User Busy', 'The user is currently on another call');
    navigation.goBack();
  };

  const handleUnavailable = ({ reason }) => {
    stopRingtone();
    Alert.alert('Unavailable', reason || 'User is not available');
    navigation.goBack();
  };

  const acceptCall = async () => {
    setCallState('connecting');
    stopRingtone();
    Vibration.cancel();
    
    socket.emit('call:accept', {
      callerId: remoteUserId,
      calleeId: userId,
    });
  };

  const rejectCall = () => {
    stopRingtone();
    Vibration.cancel();
    
    socket.emit('call:reject', {
      callerId: remoteUserId,
      calleeId: userId,
      reason: 'Call declined',
    });
    
    cleanup();
    navigation.goBack();
  };

  const endCall = () => {
    socket.emit('call:end', {
      peerId: remoteUserId,
      endedBy: userId,
    });
    
    cleanup();
    navigation.goBack();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      
      socket.emit('call:toggle-audio', {
        peerId: remoteUserId,
        audioEnabled: isMuted,
      });
    }
  };

  const toggleSpeaker = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: isSpeakerOn,
      });
      setIsSpeakerOn(!isSpeakerOn);
    } catch (error) {
      console.error('Error toggling speaker:', error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
      
      socket.emit('call:toggle-video', {
        peerId: remoteUserId,
        videoEnabled: !isVideoEnabled,
      });
    }
  };

  const switchCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track._switchCamera();
      });
      setIsFrontCamera(!isFrontCamera);
    }
  };

  const playRingtone = async (type) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        type === 'incoming' 
          ? require('../assets/notification.m4r')
          : require('../assets/notification.m4r'),
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
  };

  const cleanup = () => {
    stopRingtone();
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case 'incoming':
        return `Incoming ${callType} call...`;
      case 'calling':
        return 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  // Render incoming call UI
  if (callState === 'incoming') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.incomingContainer}>
          <Text style={styles.incomingLabel}>
            Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
          </Text>
          
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
            {remotePhoto ? (
              <Image source={{ uri: remotePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={60} color="#fff" />
              </View>
            )}
          </Animated.View>
          
          <Text style={styles.callerName}>{remoteName || 'Unknown'}</Text>
          
          <View style={styles.incomingActions}>
            <TouchableOpacity style={styles.rejectButton} onPress={rejectCall}>
              <Ionicons name="close" size={36} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.acceptButton} onPress={acceptCall}>
              <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Render video call UI
  if (callType === 'video') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Remote Video (Full Screen) */}
        {remoteStream && isRemoteVideoEnabled && RTCView ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            {remotePhoto ? (
              <Image source={{ uri: remotePhoto }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarPlaceholder, { width: 120, height: 120 }]}>
                <Ionicons name="person" size={60} color="#fff" />
              </View>
            )}
            <Text style={styles.remoteNameLarge}>{remoteName}</Text>
            {!isRemoteVideoEnabled && callState === 'connected' && (
              <Text style={styles.cameraOffText}>Camera off</Text>
            )}
          </View>
        )}
        
        {/* Local Video (PIP) */}
        {localStream && isVideoEnabled && RTCView && (
          <View style={[styles.localVideoContainer, { top: insets.top + 20 }]}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror={isFrontCamera}
            />
            <TouchableOpacity style={styles.switchCameraBtn} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Top Info */}
        <View style={[styles.topInfo, { top: insets.top + 20 }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        
        {/* Bottom Controls */}
        <View style={[styles.controls, { bottom: insets.bottom + 30 }]}>
          <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={toggleMute}>
            <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]} onPress={toggleVideo}>
            <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
            <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]} onPress={toggleSpeaker}>
            <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={28} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render audio call UI
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={styles.audioCallContainer}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
        
        <View style={styles.avatarContainer}>
          {remotePhoto ? (
            <Image source={{ uri: remotePhoto }} style={styles.avatarLarge} />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: 120, height: 120 }]}>
              <Ionicons name="person" size={60} color="#fff" />
            </View>
          )}
        </View>
        
        <Text style={styles.callerNameLarge}>{remoteName || 'Unknown'}</Text>
        
        {callState === 'connected' && (
          <View style={styles.callInfo}>
            <Ionicons name="call" size={16} color="#4ade80" />
            <Text style={styles.callInfoText}>Connected</Text>
          </View>
        )}
      </View>
      
      {/* Bottom Controls */}
      <View style={[styles.controls, { bottom: insets.bottom + 50 }]}>
        <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnActive]} onPress={toggleMute}>
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={28} color="#fff" />
          <Text style={styles.controlLabel}>Mute</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
          <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]} onPress={toggleSpeaker}>
          <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={28} color="#fff" />
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  
  // Incoming call styles
  incomingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  incomingLabel: {
    fontSize: 18,
    color: '#999',
    marginBottom: 40,
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 60,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  rejectButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Audio call styles
  audioCallContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 150,
  },
  avatarLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callerNameLarge: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    marginTop: 24,
  },
  callInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  callInfoText: {
    color: '#4ade80',
    fontSize: 16,
  },
  
  // Video call styles
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteNameLarge: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  cameraOffText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  localVideoContainer: {
    position: 'absolute',
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: {
    flex: 1,
  },
  switchCameraBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Top info
  topInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  
  // Controls
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#581845',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
    position: 'absolute',
    bottom: -20,
  },
  endCallBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallScreen;
