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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { socket } from '../socket';
import { AuthContext } from '../context/AuthContext';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Conditional WebRTC import for Expo Go compatibility
let RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, RTCView, mediaDevices;
try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCView = webrtc.RTCView;
  mediaDevices = webrtc.mediaDevices;
} catch (e) {
  console.log('WebRTC not available (Expo Go)');
}

// Enhanced ICE configuration with STUN + TURN for reliable NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // TURN servers for NAT traversal reliability
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

const CALL_TIMEOUT = 45000; // 45 seconds ring timeout
const RECONNECT_TIMEOUT = 30000; // 30 seconds reconnect window

const CallScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId, user } = useContext(AuthContext);

  // Route params
  const {
    isIncoming = false,
    callType = 'audio',
    callerId,
    callerName,
    callerPhoto,
    calleeId,
    calleeName,
    calleePhoto,
  } = route.params || {};

  const isInitiator = !isIncoming;
  const remoteUserId = isIncoming ? callerId : calleeId;
  const remoteName = isIncoming ? callerName : calleeName;
  const remotePhoto = isIncoming ? callerPhoto : calleePhoto;

  // States
  const [callState, setCallState] = useState(isIncoming ? 'incoming' : 'calling');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === 'video');
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [endReason, setEndReason] = useState('');

  // Refs
  const peerConnectionRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringPulse1 = useRef(new Animated.Value(0)).current;
  const ringPulse2 = useRef(new Animated.Value(0)).current;
  const ringPulse3 = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ═══════════════════════════════════════════════════════════════
  // SETUP & LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    // Entry fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Configure audio session
    configureAudio();

    // Set up socket listeners
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleCallRejected);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:video-toggled', ({ videoEnabled }) => setIsRemoteVideoEnabled(videoEnabled));
    socket.on('call:audio-toggled', ({ audioEnabled }) => {});
    socket.on('call:busy', handleBusy);
    socket.on('call:unavailable', handleUnavailable);

    if (RTCPeerConnection) {
      setupCall();
    } else {
      Alert.alert(
        'WebRTC Not Available',
        'Video/audio calls require a development build. They are not supported in Expo Go.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }

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
      cleanup();
    };
  }, []);

  // Pulse animation for incoming call with concentric rings
  useEffect(() => {
    if (callState === 'incoming') {
      // Avatar pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

      // Concentric ring animations
      const createRingAnim = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      };
      createRingAnim(ringPulse1, 0).start();
      createRingAnim(ringPulse2, 700).start();
      createRingAnim(ringPulse3, 1400).start();

      // Vibration pattern
      Vibration.vibrate([0, 1000, 1000], true);
    } else if (callState === 'calling' || callState === 'connecting') {
      // Subtle pulse for outgoing call
      const createRingAnim = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      };
      createRingAnim(ringPulse1, 0).start();
      createRingAnim(ringPulse2, 700).start();
    } else {
      Vibration.cancel();
    }

    return () => Vibration.cancel();
  }, [callState]);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  // Call timeout — auto-end after 45s if not answered
  useEffect(() => {
    if (callState === 'calling') {
      callTimeoutRef.current = setTimeout(() => {
        handleCallTimeout();
      }, CALL_TIMEOUT);
    }
    return () => {
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    };
  }, [callState]);

  // Navigate back after end state (show summary for 2s)
  useEffect(() => {
    if (callState === 'ended' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      cleanup();
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    }
  }, [callState]);

  // ═══════════════════════════════════════════════════════════════
  // AUDIO CONFIGURATION
  // ═══════════════════════════════════════════════════════════════

  const configureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: callType === 'audio',
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.log('Audio config error:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // WEBRTC SETUP
  // ═══════════════════════════════════════════════════════════════

  const setupCall = async () => {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video' ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false,
      });

      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
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

      // Enhanced connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setCallState('connected');
            stopRingtone();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            break;
          case 'disconnected':
            // Brief disconnection — try to wait for reconnect
            setCallState('reconnecting');
            reconnectTimeoutRef.current = setTimeout(() => {
              if (pc.connectionState !== 'connected') {
                handleCallEnded({ reason: 'Connection lost' });
              }
            }, RECONNECT_TIMEOUT);
            break;
          case 'failed':
            // Try ICE restart before giving up
            tryIceRestart(pc);
            break;
          case 'closed':
            handleCallEnded({ reason: 'Connection closed' });
            break;
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'checking') {
          setCallState('connecting');
        }
      };

      // Start or wait for call
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

  const tryIceRestart = async (pc) => {
    try {
      console.log('Attempting ICE restart...');
      setCallState('reconnecting');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socket.emit('call:offer', {
        calleeId: remoteUserId,
        offer,
      });

      reconnectTimeoutRef.current = setTimeout(() => {
        if (pc.connectionState !== 'connected') {
          handleCallEnded({ reason: 'Could not reconnect' });
        }
      }, RECONNECT_TIMEOUT);
    } catch (error) {
      console.error('ICE restart failed:', error);
      handleCallEnded({ reason: 'Connection failed' });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // CALL SIGNALING
  // ═══════════════════════════════════════════════════════════════

  const initiateCall = async () => {
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
      stopRingtone();
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      setCallState('connecting');

      const pc = peerConnectionRef.current;
      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

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

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

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

  // ═══════════════════════════════════════════════════════════════
  // CALL STATE HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const handleCallRejected = ({ reason }) => {
    stopRingtone();
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    setEndReason('Declined');
    setCallState('ended');
  };

  const handleCallEnded = ({ reason }) => {
    stopRingtone();
    setEndReason(reason || 'Call ended');
    setCallState('ended');
  };

  const handleCallTimeout = () => {
    stopRingtone();
    socket.emit('call:end', {
      peerId: remoteUserId,
      endedBy: userId,
    });
    setEndReason('No answer');
    setCallState('ended');
  };

  const handleBusy = () => {
    stopRingtone();
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    setEndReason('User busy');
    setCallState('ended');
  };

  const handleUnavailable = ({ reason }) => {
    stopRingtone();
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    setEndReason(reason || 'Unavailable');
    setCallState('ended');
  };

  // ═══════════════════════════════════════════════════════════════
  // CALL ACTIONS
  // ═══════════════════════════════════════════════════════════════

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

    setEndReason('Call ended');
    setCallState('ended');
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
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: isSpeakerOn,
        shouldDuckAndroid: true,
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

  // ═══════════════════════════════════════════════════════════════
  // RINGTONE & CLEANUP
  // ═══════════════════════════════════════════════════════════════

  const playRingtone = async (type) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/notification.m4r'),
        {
          isLooping: true,
          volume: type === 'outgoing' ? 0.3 : 1.0,
        }
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

    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case 'incoming':
        return `Incoming ${callType === 'video' ? 'video' : 'voice'} call`;
      case 'calling':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(callDuration);
      case 'reconnecting':
        return 'Reconnecting...';
      case 'ended':
        return endReason || 'Call ended';
      default:
        return '';
    }
  };

  const renderRingPulse = (anim) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5],
    });
    const opacity = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0],
    });
    return (
      <Animated.View
        style={[
          styles.ringPulse,
          { transform: [{ scale }], opacity },
        ]}
      />
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: INCOMING CALL
  // ═══════════════════════════════════════════════════════════════

  if (callState === 'incoming') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View style={[styles.incomingContainer, { opacity: fadeAnim }]}>
          {/* Encryption badge */}
          <View style={styles.encryptionBadge}>
            <Ionicons name="lock-closed" size={12} color="#a3e635" />
            <Text style={styles.encryptionText}>End-to-end encrypted</Text>
          </View>

          <Text style={styles.incomingLabel}>
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>

          {/* Pulsing avatar with concentric rings */}
          <View style={styles.avatarRingContainer}>
            {renderRingPulse(ringPulse1)}
            {renderRingPulse(ringPulse2)}
            {renderRingPulse(ringPulse3)}
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              {remotePhoto ? (
                <Image source={{ uri: remotePhoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={60} color="#fff" />
                </View>
              )}
            </Animated.View>
          </View>

          <Text style={styles.callerName}>{remoteName || 'Unknown'}</Text>
          <Text style={styles.callingSubtext}>Incoming call</Text>

          {/* Accept / Reject buttons */}
          <View style={styles.incomingActions}>
            <View style={styles.actionBtnGroup}>
              <TouchableOpacity style={styles.rejectButton} onPress={rejectCall}>
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Decline</Text>
            </View>

            <View style={styles.actionBtnGroup}>
              <TouchableOpacity style={styles.acceptButton} onPress={acceptCall}>
                <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={32} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.actionLabel}>Accept</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: CALL ENDED (summary screen)
  // ═══════════════════════════════════════════════════════════════

  if (callState === 'ended') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.endedContainer}>
          {remotePhoto ? (
            <Image source={{ uri: remotePhoto }} style={styles.avatarLarge} />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: 100, height: 100, borderRadius: 50 }]}>
              <Ionicons name="person" size={50} color="#fff" />
            </View>
          )}
          <Text style={styles.callerNameLarge}>{remoteName || 'Unknown'}</Text>

          <View style={styles.endedInfo}>
            <Ionicons
              name={endReason === 'Declined' || endReason === 'User busy' ? 'call' : 'time-outline'}
              size={18}
              color="#ef4444"
              style={endReason === 'Declined' ? { transform: [{ rotate: '135deg' }] } : {}}
            />
            <Text style={styles.endedText}>{endReason || 'Call ended'}</Text>
          </View>

          {callDuration > 0 && (
            <Text style={styles.endedDuration}>{formatDuration(callDuration)}</Text>
          )}
        </View>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: VIDEO CALL
  // ═══════════════════════════════════════════════════════════════

  if (callType === 'video') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

        {/* Remote Video (Full Screen) */}
        {remoteStream && isRemoteVideoEnabled && RTCView ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f3460']}
              style={StyleSheet.absoluteFill}
            />
            {remotePhoto ? (
              <Image source={{ uri: remotePhoto }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarPlaceholder, { width: 120, height: 120, borderRadius: 60 }]}>
                <Ionicons name="person" size={60} color="#fff" />
              </View>
            )}
            <Text style={styles.remoteNameLarge}>{remoteName}</Text>
            {!isRemoteVideoEnabled && callState === 'connected' && (
              <Text style={styles.cameraOffText}>Camera is off</Text>
            )}
            {callState === 'reconnecting' && (
              <Text style={styles.reconnectingText}>Reconnecting...</Text>
            )}
          </View>
        )}

        {/* Local Video (PIP) */}
        {localStream && isVideoEnabled && RTCView && (
          <View style={[styles.localVideoContainer, { top: insets.top + 60 }]}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              mirror={isFrontCamera}
            />
          </View>
        )}

        {/* Top Bar */}
        <View style={[styles.videoTopBar, { paddingTop: insets.top + 10 }]}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity onPress={endCall} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.topBarCenter}>
            <View style={styles.encryptionBadgeSmall}>
              <Ionicons name="lock-closed" size={10} color="#a3e635" />
              <Text style={styles.encryptionTextSmall}>Encrypted</Text>
            </View>
            <Text style={styles.videoStatusText}>{getStatusText()}</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={switchCamera} style={styles.flipCameraBtn}>
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={[styles.videoControls, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, !isVideoEnabled && styles.controlBtnActive]}
              onPress={toggleVideo}
            >
              <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={toggleMute}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
              <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
              onPress={toggleSpeaker}
            >
              <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: AUDIO CALL
  // ═══════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.audioCallContainer, { opacity: fadeAnim }]}>
        {/* Top section */}
        <View style={[styles.audioTopSection, { paddingTop: insets.top + 20 }]}>
          <View style={styles.encryptionBadge}>
            <Ionicons name="lock-closed" size={12} color="#a3e635" />
            <Text style={styles.encryptionText}>End-to-end encrypted</Text>
          </View>
        </View>

        {/* Center section — Avatar & info */}
        <View style={styles.audioCenterSection}>
          <View style={styles.audioAvatarContainer}>
            {(callState === 'calling' || callState === 'connecting') && (
              <>
                {renderRingPulse(ringPulse1)}
                {renderRingPulse(ringPulse2)}
              </>
            )}
            {remotePhoto ? (
              <Image source={{ uri: remotePhoto }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarPlaceholder, { width: 140, height: 140, borderRadius: 70 }]}>
                <Ionicons name="person" size={70} color="#fff" />
              </View>
            )}
          </View>

          <Text style={styles.callerNameLarge}>{remoteName || 'Unknown'}</Text>
          <Text style={styles.audioStatusText}>{getStatusText()}</Text>

          {callState === 'connected' && (
            <View style={styles.connectedIndicator}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          )}

          {callState === 'reconnecting' && (
            <View style={styles.reconnectingBadge}>
              <MaterialCommunityIcons name="wifi-off" size={16} color="#fbbf24" />
              <Text style={styles.reconnectingBadgeText}>Poor connection</Text>
            </View>
          )}
        </View>

        {/* Bottom controls */}
        <View style={[styles.audioControls, { paddingBottom: insets.bottom + 30 }]}>
          <View style={styles.controlsGrid}>
            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
                onPress={toggleSpeaker}
              >
                <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>Speaker</Text>
            </View>

            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                onPress={toggleMute}
              >
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </View>

            <View style={styles.controlItem}>
              <TouchableOpacity style={styles.controlBtn} onPress={() => {}}>
                <Ionicons name="keypad" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>Keypad</Text>
            </View>
          </View>

          <View style={styles.endCallCenter}>
            <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
              <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },

  // ═══ Encryption Badge ═══
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(163, 230, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  encryptionText: {
    color: '#a3e635',
    fontSize: 11,
    fontWeight: '500',
  },
  encryptionBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  encryptionTextSmall: {
    color: '#a3e635',
    fontSize: 10,
    fontWeight: '500',
  },

  // ═══ Incoming Call ═══
  incomingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  incomingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
  },
  avatarRingContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  ringPulse: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarWrapper: {},
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  callingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 80,
  },
  incomingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
  },
  actionBtnGroup: {
    alignItems: 'center',
  },
  rejectButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 10,
    fontWeight: '500',
  },

  // ═══ Call Ended ═══
  endedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  endedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  endedText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  endedDuration: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },

  // ═══ Audio Call ═══
  audioCallContainer: {
    flex: 1,
  },
  audioTopSection: {
    paddingHorizontal: 20,
  },
  audioCenterSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  audioAvatarContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callerNameLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  audioStatusText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    fontWeight: '500',
  },
  connectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  connectedText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '500',
  },
  reconnectingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  reconnectingBadgeText: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '500',
  },
  audioControls: {
    paddingHorizontal: 30,
  },
  controlsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 40,
  },
  controlItem: {
    alignItems: 'center',
  },

  // ═══ Video Call ═══
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteNameLarge: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  cameraOffText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
  },
  reconnectingText: {
    fontSize: 14,
    color: '#fbbf24',
    marginTop: 8,
    fontWeight: '500',
  },
  localVideoContainer: {
    position: 'absolute',
    right: 16,
    width: 110,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  localVideo: {
    flex: 1,
  },
  videoTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBarLeft: {
    flex: 1,
  },
  topBarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  topBarRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  backBtn: {
    padding: 4,
  },
  flipCameraBtn: {
    padding: 4,
  },
  videoStatusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  videoControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },

  // ═══ Shared Controls ═══
  controlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 8,
    fontWeight: '500',
  },
  endCallBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  endCallCenter: {
    alignItems: 'center',
  },

  // ═══ Status ═══
  statusText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
});

export default CallScreen;
