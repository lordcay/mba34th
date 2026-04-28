import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  Animated,
  Vibration,
  FlatList,
  TextInput,
  ActivityIndicator,
  ActionSheetIOS,
  ScrollView,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { socket } from '../socket';
import { AuthContext } from '../context/AuthContext';
import { Audio } from 'expo-av';
import api from '../services/api';

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

// ICE configuration — TURN listed first so restricted networks (symmetric NAT) get relay
// immediately instead of wasting time on STUN candidates that will fail.
// sdpSemantics: unified-plan is required by modern WebRTC and react-native-webrtc.
// bundlePolicy: max-bundle forces all media onto one 5-tuple → lower overhead.
// iceCandidatePoolSize: pre-gather 10 candidates so the offer is ready faster.
const ICE_SERVERS = {
  iceServers: [
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:80?transport=tcp',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ],
  sdpSemantics: 'unified-plan',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 10,
};

const CALL_TIMEOUT = 45000; // 45 seconds ring timeout
const RECONNECT_TIMEOUT = 30000; // 30 seconds reconnect window

// ─── Audio output modes ───────────────────────────────────────────────────
const AUDIO_OUTPUT = {
  EARPIECE:  'earpiece',
  SPEAKER:   'speaker',
  BLUETOOTH: 'bluetooth',
};

const AUDIO_OUTPUT_META = {
  earpiece:  { label: 'Earpiece',  icon: 'phone-portrait-outline' },
  speaker:   { label: 'Speaker',   icon: 'volume-high' },
  bluetooth: { label: 'Bluetooth', icon: 'bluetooth' },
};

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
    // Conference params (set when joining an existing call)
    isConference = false,
    conferenceId: routeConfId = null,
    existingParticipants = [],
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
  // audioOutput: replaces the old boolean isSpeakerOn
  const [audioOutput, setAudioOutput] = useState(
    callType === 'video' ? AUDIO_OUTPUT.SPEAKER : AUDIO_OUTPUT.EARPIECE
  );
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [endReason, setEndReason] = useState('');

  // Conference participants state
  // Each entry: { id, name, photo, stream, muted, videoEnabled, connected, calling }
  const [participants, setParticipants] = useState([]);
  const [showAddPeople, setShowAddPeople] = useState(false);
  const [myConnections, setMyConnections] = useState([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsFetchError, setConnectionsFetchError] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState('');

  // Refs
  const peerConnectionRef = useRef(null);             // 1:1 primary peer connection
  const confPeerConnectionsRef = useRef(new Map());   // conference: Map<userId, RTCPeerConnection>
  const localStreamRef = useRef(null);                // always-current local stream ref
  const conferenceIdRef = useRef(                     // unique ID for this conference room
    routeConfId || `conf_${Date.now()}_${userId}`
  );
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  // ICE candidate queue: buffer remote candidates that arrive before setRemoteDescription.
  // Without this, candidates dropped during signaling cause connection failures on slow links.
  const iceCandidateQueueRef = useRef([]);
  const remoteDescriptionSetRef = useRef(false);

  // Per-participant ICE queues for conference mode
  const confIceCandidateQueuesRef = useRef(new Map()); // Map<userId, RTCIceCandidate[]>
  const confRemoteDescSetRef = useRef(new Set());       // tracks which conf peers have remote desc

  // Invite timeout timers — auto-remove "calling" badge if invitee doesn't respond in 30s
  const inviteTimersRef = useRef(new Map()); // Map<userId, TimeoutID>
  // Cache flag so we don't re-fetch connections every time the modal opens
  const connectionsFetchedRef = useRef(false);

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
    // Conference events
    socket.on('call:invite:accepted',        handleInviteAccepted);
    socket.on('call:participant:joined',     handleParticipantJoined);
    socket.on('call:participant:left',       handleParticipantLeft);
    socket.on('call:conference:offer',       handleConferenceOffer);
    socket.on('call:conference:answer',      handleConferenceAnswer);
    socket.on('call:conference:ice-candidate', handleConferenceIce);
    socket.on('call:conference:peer:ready',  handleConferencePeerReady);

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
      socket.off('call:invite:accepted');
      socket.off('call:participant:joined');
      socket.off('call:participant:left');
      socket.off('call:conference:offer');
      socket.off('call:conference:answer');
      socket.off('call:conference:ice-candidate');
      socket.off('call:conference:peer:ready');
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
  // AUDIO OUTPUT ROUTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Apply an audio output mode.
   * iOS: leverages AVAudioSession.  Speaker = overrideOutputAudioPort(.speaker).
   *      Bluetooth / Earpiece = let OS pick automatically (prefers BT if connected).
   * Android: playThroughEarpieceAndroid controls earpiece vs speaker/BT.
   */
  const applyAudioOutput = useCallback(async (mode) => {
    try {
      switch (mode) {
        case AUDIO_OUTPUT.EARPIECE:
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            playThroughEarpieceAndroid: true,
            shouldDuckAndroid: false,
          });
          break;
        case AUDIO_OUTPUT.SPEAKER:
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            playThroughEarpieceAndroid: false,
            shouldDuckAndroid: false,
          });
          break;
        case AUDIO_OUTPUT.BLUETOOTH:
          // Set to non-earpiece so the OS routes to either BT or speaker.
          // If a BT audio device is connected the OS will prefer it over the speaker.
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            playThroughEarpieceAndroid: false,
            shouldDuckAndroid: false,
          });
          break;
      }
      setAudioOutput(mode);
    } catch (error) {
      console.error('Audio output routing error:', error);
    }
  }, []);

  /**
   * Show a native ActionSheet (iOS) or custom modal (Android) to pick audio output.
   * Long-pressing the speaker button triggers this; tapping cycles modes.
   */
  const openAudioOutputPicker = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Audio Output',
          options: ['Cancel', '📱 Earpiece', '🔊 Speaker', '🎧 Bluetooth'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) applyAudioOutput(AUDIO_OUTPUT.EARPIECE);
          else if (buttonIndex === 2) applyAudioOutput(AUDIO_OUTPUT.SPEAKER);
          else if (buttonIndex === 3) applyAudioOutput(AUDIO_OUTPUT.BLUETOOTH);
        }
      );
    } else {
      setShowAudioPicker(true);
    }
  }, [applyAudioOutput]);

  /** Tap: cycle through earpiece → speaker → bluetooth */
  const cycleAudioOutput = useCallback(() => {
    const order = [AUDIO_OUTPUT.EARPIECE, AUDIO_OUTPUT.SPEAKER, AUDIO_OUTPUT.BLUETOOTH];
    const nextMode = order[(order.indexOf(audioOutput) + 1) % order.length];
    applyAudioOutput(nextMode);
  }, [audioOutput, applyAudioOutput]);

  const configureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: callType === 'audio',
        shouldDuckAndroid: false,
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
        // Explicit audio constraints enable hardware EC/NS/AGC — critical for voice clarity
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: callType === 'video' ? {
          facingMode: 'user',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        } : false,
      });

      setLocalStream(stream);
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('call:ice-candidate', {
            peerId: remoteUserId,
            candidate: event.candidate,
          });
        }
      };

      // ICE state is more granular than connection state — use it as primary signal.
      // 'disconnected' is transient (normal on mobile network handoffs); wait 4s then restart.
      // 'failed' means ICE gave up completely — attempt restart immediately.
      pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', pc.iceConnectionState);
        switch (pc.iceConnectionState) {
          case 'checking':
            setCallState('connecting');
            break;
          case 'connected':
          case 'completed':
            setCallState('connected');
            stopRingtone();
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            break;
          case 'disconnected':
            setCallState('reconnecting');
            // Give the browser 4s to self-heal before forcing an ICE restart
            if (!reconnectTimeoutRef.current) {
              reconnectTimeoutRef.current = setTimeout(() => {
                reconnectTimeoutRef.current = null;
                if (peerConnectionRef.current?.iceConnectionState !== 'connected' &&
                    peerConnectionRef.current?.iceConnectionState !== 'completed') {
                  tryIceRestart(peerConnectionRef.current);
                }
              }, 4000);
            }
            break;
          case 'failed':
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
            tryIceRestart(pc);
            break;
          case 'closed':
            handleCallEnded({ reason: 'Connection closed' });
            break;
        }
      };

      // Connection state confirms DTLS/SRTP is up — use it only for final 'connected' confirmation
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallState('connected');
          stopRingtone();
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        }
      };

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

  // Flush ICE candidates that arrived before setRemoteDescription was called.
  // Must be called right after every successful setRemoteDescription.
  const flushIceCandidates = async (pc) => {
    const queue = iceCandidateQueueRef.current;
    iceCandidateQueueRef.current = [];
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Queued ICE candidate error:', err);
      }
    }
  };

  const tryIceRestart = async (pc) => {
    try {
      // Only the call initiator sends the restart offer to avoid glare
      if (!isInitiator) return;
      if (!pc || pc.signalingState === 'closed') return;

      console.log('Attempting ICE restart...');
      setCallState('reconnecting');

      // Stable state required before creating a new offer
      if (pc.signalingState !== 'stable') {
        console.warn('ICE restart skipped — not in stable state:', pc.signalingState);
        return;
      }

      // Reset ICE queue so stale candidates from the old path are discarded
      iceCandidateQueueRef.current = [];
      remoteDescriptionSetRef.current = false;

      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);

      socket.emit('call:offer', { calleeId: remoteUserId, offer });

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (peerConnectionRef.current?.iceConnectionState !== 'connected' &&
            peerConnectionRef.current?.iceConnectionState !== 'completed') {
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

      // Guard: must be in stable state before creating an offer
      if (pc.signalingState !== 'stable') {
        console.warn('Offer skipped — not stable:', pc.signalingState);
        return;
      }

      // Reset queue so candidates from a previous attempt are discarded
      iceCandidateQueueRef.current = [];
      remoteDescriptionSetRef.current = false;

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);

      socket.emit('call:offer', { calleeId, offer });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const handleOffer = async ({ offer }) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      // Offer collision: if we're not stable the remote sent an offer while we were negotiating.
      // As the non-initiator (polite peer) we always accept the remote offer.
      if (pc.signalingState !== 'stable') {
        console.warn('Offer received in non-stable state — rolling back:', pc.signalingState);
        await pc.setLocalDescription({ type: 'rollback' });
      }

      remoteDescriptionSetRef.current = false;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      remoteDescriptionSetRef.current = true;

      // Flush any ICE candidates that arrived before the remote description
      await flushIceCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', { callerId: remoteUserId, answer });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async ({ answer }) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      // Ignore if we're already stable (duplicate answer)
      if (pc.signalingState === 'stable') {
        console.warn('Answer ignored — already stable');
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      remoteDescriptionSetRef.current = true;

      // Flush candidates queued while waiting for the answer
      await flushIceCandidates(pc);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async ({ candidate }) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc || !candidate) return;

      // Buffer candidates until the remote description is set — adding them before
      // setRemoteDescription silently fails and the connection never completes on bad networks.
      if (!remoteDescriptionSetRef.current) {
        iceCandidateQueueRef.current.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
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

    if (isConference) {
      // Conference invite: don't use the normal 1:1 call:accept path.
      // Announce acceptance to the inviter + all existing participants.
      socket.emit('call:invite:accept', {
        conferenceId:   conferenceIdRef.current,
        accepterId:     userId,
        accepterName:   [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown',
        accepterPhoto:  user?.photos?.[0] || null,
        inviterId:      callerId,
        participantIds: existingParticipants.map(p => p.id),
      });
      // Establish peer links to everyone already on the call
      connectToExistingParticipants();
    } else {
      socket.emit('call:accept', {
        callerId: remoteUserId,
        calleeId: userId,
      });
    }
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
    if (participants.length > 0) {
      // Conference: notify everyone we're leaving
      const remainingIds = [
        remoteUserId,
        ...participants.map(p => p.id),
      ].filter(id => id && id !== userId);

      socket.emit('call:participant:left', {
        conferenceId:         conferenceIdRef.current,
        leaverId:             userId,
        remainingParticipantIds: remainingIds,
      });
    }
    // Always send 1:1 end to the primary peer for backward-compat
    socket.emit('call:end', {
      peerId:   remoteUserId,
      endedBy:  userId,
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

  const toggleSpeaker = () => cycleAudioOutput();

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
  // CONFERENCE CALL — MESH WebRTC
  // Each remote participant gets its own RTCPeerConnection stored in
  // confPeerConnectionsRef (Map<userId, RTCPeerConnection>).
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create (or retrieve existing) peer connection to a conference participant.
   * @param {string} participantId  Remote user ID
   * @param {boolean} asInitiator  true = we create the SDP offer
   */
  const createConferencePeerConnection = useCallback(async (participantId, asInitiator) => {
    if (!RTCPeerConnection) return null;

    // Reuse existing connection if still healthy
    if (confPeerConnectionsRef.current.has(participantId)) {
      return confPeerConnectionsRef.current.get(participantId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    confPeerConnectionsRef.current.set(participantId, pc);

    // Share all local tracks
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    // Receive remote stream → mark participant as connected
    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        setParticipants(prev =>
          prev.map(p =>
            p.id === participantId ? { ...p, stream: event.streams[0], connected: true } : p
          )
        );
      }
    };

    // Trickle ICE — relay local candidates to the remote peer via signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:conference:ice-candidate', {
          targetId: participantId,
          fromId: userId,
          candidate: event.candidate,
          conferenceId: conferenceIdRef.current,
        });
      }
    };

    // ICE state drives the connected/reconnecting/failed UI for each participant
    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case 'connected':
        case 'completed':
          setParticipants(prev =>
            prev.map(p => p.id === participantId ? { ...p, connected: true } : p)
          );
          break;
        case 'disconnected':
          setParticipants(prev =>
            prev.map(p => p.id === participantId ? { ...p, connected: false } : p)
          );
          break;
        case 'failed':
          // Remove stale ICE state for this peer so a fresh offer can be negotiated
          confRemoteDescSetRef.current.delete(participantId);
          confIceCandidateQueuesRef.current.delete(participantId);
          setParticipants(prev =>
            prev.map(p => p.id === participantId ? { ...p, connected: false } : p)
          );
          break;
        case 'closed':
          confPeerConnectionsRef.current.delete(participantId);
          setParticipants(prev => prev.filter(p => p.id !== participantId));
          break;
      }
    };

    if (asInitiator) {
      try {
        // Guard: only create an offer if the connection is in a negotiable state
        if (pc.signalingState !== 'stable') {
          console.warn('Conference offer skipped — not stable:', pc.signalingState);
          return pc;
        }

        // Reset the ICE queue for this peer before starting a fresh negotiation
        confRemoteDescSetRef.current.delete(participantId);
        confIceCandidateQueuesRef.current.delete(participantId);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);
        socket.emit('call:conference:offer', {
          targetId: participantId,
          fromId: userId,
          offer,
          conferenceId: conferenceIdRef.current,
        });
      } catch (err) {
        console.error('Conference offer error:', err);
      }
    }

    return pc;
  }, [userId, callType]);

  // ─── Conference event handlers ────────────────────────────────

  /** Someone we invited accepted the call */
  const handleInviteAccepted = useCallback(async ({ accepterId, accepterName, accepterPhoto }) => {
    // Cancel the "no-answer" timeout for this participant
    if (inviteTimersRef.current.has(accepterId)) {
      clearTimeout(inviteTimersRef.current.get(accepterId));
      inviteTimersRef.current.delete(accepterId);
    }

    setParticipants(prev => {
      const exists = prev.find(p => p.id === accepterId);
      if (!exists) {
        return [...prev, {
          id: accepterId, name: accepterName, photo: accepterPhoto,
          stream: null, muted: false, videoEnabled: true, connected: false, calling: false,
        }];
      }
      return prev.map(p => p.id === accepterId ? { ...p, calling: false } : p);
    });

    await createConferencePeerConnection(accepterId, true);
  }, [createConferencePeerConnection]);

  /** An existing participant's backend relay: new person joined */
  const handleParticipantJoined = useCallback(async ({ participantId, participantName, participantPhoto }) => {
    setParticipants(prev => {
      if (prev.find(p => p.id === participantId)) return prev;
      return [...prev, {
        id: participantId, name: participantName, photo: participantPhoto,
        stream: null, muted: false, videoEnabled: true, connected: false, calling: false,
      }];
    });
    // We initiate the connection to the new participant
    await createConferencePeerConnection(participantId, true);
  }, [createConferencePeerConnection]);

  /** Someone left the conference */
  const handleParticipantLeft = useCallback(({ leaverId }) => {
    const pc = confPeerConnectionsRef.current.get(leaverId);
    if (pc) { try { pc.close(); } catch {} confPeerConnectionsRef.current.delete(leaverId); }
    setParticipants(prev => prev.filter(p => p.id !== leaverId));
  }, []);

  // Flush per-participant ICE candidate queue after setRemoteDescription succeeds.
  const flushConfIceCandidates = async (participantId, pc) => {
    const queue = confIceCandidateQueuesRef.current.get(participantId) || [];
    confIceCandidateQueuesRef.current.delete(participantId);
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Queued conference ICE candidate error:', err);
      }
    }
  };

  /** Receive SDP offer from a conference peer */
  const handleConferenceOffer = useCallback(async ({ fromId, offer }) => {
    if (!RTCPeerConnection) return;
    let pc = confPeerConnectionsRef.current.get(fromId);
    if (!pc) pc = await createConferencePeerConnection(fromId, false);
    try {
      // Clear remote-desc flag so buffered candidates aren't applied early
      confRemoteDescSetRef.current.delete(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      confRemoteDescSetRef.current.add(fromId);

      // Flush any ICE candidates that arrived before this remote description
      await flushConfIceCandidates(fromId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:conference:answer', {
        targetId: fromId, fromId: userId, answer,
        conferenceId: conferenceIdRef.current,
      });
    } catch (err) { console.error('Conference offer handling error:', err); }
  }, [createConferencePeerConnection, userId]);

  /** Receive SDP answer from a conference peer */
  const handleConferenceAnswer = useCallback(async ({ fromId, answer }) => {
    const pc = confPeerConnectionsRef.current.get(fromId);
    if (!pc) return;
    try {
      // Guard: ignore if already stable (duplicate answer)
      if (pc.signalingState === 'stable') return;
      confRemoteDescSetRef.current.delete(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      confRemoteDescSetRef.current.add(fromId);
      await flushConfIceCandidates(fromId, pc);
    } catch (err) { console.error('Conference answer error:', err); }
  }, []);

  /** Receive ICE candidate from a conference peer — buffer until remote desc is set */
  const handleConferenceIce = useCallback(async ({ fromId, candidate }) => {
    if (!candidate) return;
    const pc = confPeerConnectionsRef.current.get(fromId);

    if (!pc || !confRemoteDescSetRef.current.has(fromId)) {
      // Queue the candidate — it will be flushed after setRemoteDescription
      if (!confIceCandidateQueuesRef.current.has(fromId)) {
        confIceCandidateQueuesRef.current.set(fromId, []);
      }
      confIceCandidateQueuesRef.current.get(fromId).push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) { console.error('Conference ICE error:', err); }
  }, []);

  /**
   * Existing participants notify us that we should initiate a connection to
   * the newly joined peer (when joining an already-active conference).
   */
  const handleConferencePeerReady = useCallback(async ({ newParticipantId, newParticipantName, newParticipantPhoto }) => {
    setParticipants(prev => {
      if (prev.find(p => p.id === newParticipantId)) return prev;
      return [...prev, {
        id: newParticipantId, name: newParticipantName, photo: newParticipantPhoto,
        stream: null, muted: false, videoEnabled: true, connected: false, calling: false,
      }];
    });
    await createConferencePeerConnection(newParticipantId, true);
  }, [createConferencePeerConnection]);

  /**
   * Called when joining an existing conference.
   * Announces presence to all current participants.
   */
  const connectToExistingParticipants = useCallback(() => {
    if (!isConference || existingParticipants.length === 0) return;

    // Pre-populate participant list  
    setParticipants(existingParticipants.map(p => ({
      id: p.id, name: p.name, photo: p.photo,
      stream: null, muted: false, videoEnabled: true, connected: false, calling: false,
    })));

    // Tell all existing participants we're here → they create offers to us
    socket.emit('call:conference:joined', {
      conferenceId: conferenceIdRef.current,
      joinerId: userId,
      joinerName: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown',
      joinerPhoto: user?.photos?.[0] || null,
      participantIds: existingParticipants.map(p => p.id),
    });
  }, [isConference, existingParticipants, userId, user]);

  /** Invite a connection (must be in the user's connections list) to this call */
  const inviteToCall = useCallback(async (connection) => {
    const connId    = String(connection.id || connection._id);
    const connName  = [connection.firstName, connection.lastName].filter(Boolean).join(' ') || 'Unknown';
    const connPhoto = connection.photos?.[0] || null;

    // Show "calling" badge on the participant strip immediately for optimistic feedback
    setParticipants(prev => {
      if (prev.find(p => String(p.id) === connId)) return prev;
      return [...prev, {
        id: connId, name: connName, photo: connPhoto,
        stream: null, muted: false, videoEnabled: true, connected: false, calling: true,
      }];
    });
    setShowAddPeople(false);

    // Auto-remove the "calling" badge after 30 s if the invitee doesn't respond
    const noAnswerTimer = setTimeout(() => {
      setParticipants(prev => {
        const entry = prev.find(p => String(p.id) === connId);
        // Only remove if still in "calling" state (not yet connected)
        if (entry?.calling) return prev.filter(p => String(p.id) !== connId);
        return prev;
      });
      inviteTimersRef.current.delete(connId);
    }, 30_000);
    inviteTimersRef.current.set(connId, noAnswerTimer);

    // Build the full participant snapshot for the invitee so they can connect to everyone.
    // Deduplicate using a Set to prevent the same userId appearing twice.
    const seen = new Set();
    const allCurrentParticipants = [
      { id: userId,       name: [user?.firstName, user?.lastName].filter(Boolean).join(' '), photo: user?.photos?.[0] || null },
      { id: remoteUserId, name: remoteName, photo: remotePhoto },
      ...participants.map(p => ({ id: p.id, name: p.name, photo: p.photo })),
    ].filter(p => {
      if (!p.id || seen.has(String(p.id))) return false;
      seen.add(String(p.id));
      return true;
    });

    socket.emit('call:invite', {
      conferenceId:        conferenceIdRef.current,
      inviterId:           userId,
      inviterName:         [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown',
      inviterPhoto:        user?.photos?.[0] || null,
      inviteeId:           connId,
      callType,
      existingParticipants: allCurrentParticipants,
    });
  }, [userId, user, remoteUserId, remoteName, remotePhoto, participants, callType]);

  /** Load the user's connected contacts for the Add People picker */
  const fetchConnections = useCallback(async (forceRefresh = false) => {
    // Skip if already cached, unless caller explicitly requests a refresh
    if (connectionsFetchedRef.current && !forceRefresh) return;

    setConnectionsLoading(true);
    setConnectionsFetchError(false);
    try {
      const res = await api.get('/connections');
      const raw = res.data?.connections || res.data || [];

      // Normalize each connection entry to the "other" participant.
      // Use String() comparison to handle mixed ObjectId / string types from the API.
      const connected = raw.map(c => {
        const isRequester = String(c.requester?._id || c.requester?.id || c.requester) === String(userId);
        const other = isRequester ? c.target : c.requester;
        // Normalise the id field so downstream code has a consistent `id` property
        if (other && !other.id && other._id) other.id = String(other._id);
        return other || null;
      }).filter(Boolean);

      setMyConnections(connected);
      connectionsFetchedRef.current = true;
    } catch (err) {
      console.error('Fetch connections error:', err);
      setConnectionsFetchError(true);
    } finally {
      setConnectionsLoading(false);
    }
  }, [userId]);

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

    // Use ref (always current) instead of localStream state which may be stale in a closure
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Close all conference peer connections
    confPeerConnectionsRef.current.forEach(pc => {
      try { pc.close(); } catch {}
    });
    confPeerConnectionsRef.current.clear();

    // Reset all ICE queues so stale candidates from the previous session don't leak
    iceCandidateQueueRef.current = [];
    remoteDescriptionSetRef.current = false;
    confIceCandidateQueuesRef.current.clear();
    confRemoteDescSetRef.current.clear();

    // Cancel any pending invite timers
    inviteTimersRef.current.forEach(t => clearTimeout(t));
    inviteTimersRef.current.clear();
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: ADD PEOPLE MODAL
  // ═══════════════════════════════════════════════════════════════

  const renderAddPeopleModal = () => {
    // Filter using String() comparison so ObjectId / string mismatches don't leak
    // random users — only verified connections are ever shown in this list.
    const alreadyInCallIds = new Set([
      String(remoteUserId),
      String(userId),
      ...participants.map(p => String(p.id)),
    ]);

    const filtered = myConnections.filter(c => {
      const cId = String(c.id || c._id);
      if (alreadyInCallIds.has(cId)) return false;
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ').toLowerCase();
      return name.includes(connectionSearch.toLowerCase());
    });

    const alreadyCallingIds = new Set(
      participants.filter(p => p.calling).map(p => String(p.id))
    );

    return (
      <Modal
        visible={showAddPeople}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPeople(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addPeopleSheet}>

            {/* ── Header ─────────────────────────────── */}
            <View style={styles.addPeopleHeader}>
              <View>
                <Text style={styles.addPeopleTitle}>Add to call</Text>
                <Text style={styles.addPeopleSubtitle}>Your connections only</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddPeople(false)}
                style={styles.addPeopleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {/* ── Search bar ─────────────────────────── */}
            <View style={styles.addPeopleSearch}>
              <Ionicons name="search" size={16} color="#999" style={{ marginRight: 6 }} />
              <TextInput
                value={connectionSearch}
                onChangeText={setConnectionSearch}
                placeholder="Search connections…"
                placeholderTextColor="#bbb"
                style={styles.addPeopleSearchInput}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>

            {/* ── Body ───────────────────────────────── */}
            {connectionsLoading ? (
              <View style={styles.addPeopleEmpty}>
                <ActivityIndicator color="#581845" size="large" />
                <Text style={[styles.addPeopleEmptyText, { marginTop: 12 }]}>
                  Loading connections…
                </Text>
              </View>
            ) : connectionsFetchError ? (
              <View style={styles.addPeopleEmpty}>
                <Ionicons name="wifi-outline" size={40} color="#ef4444" />
                <Text style={[styles.addPeopleEmptyText, { color: '#ef4444', marginTop: 10 }]}>
                  Couldn't load connections
                </Text>
                <TouchableOpacity
                  style={styles.addPeopleRetryBtn}
                  onPress={() => fetchConnections(true)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="refresh" size={15} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.addPeopleRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.addPeopleEmpty}>
                <Ionicons
                  name={connectionSearch ? 'search-outline' : 'people-outline'}
                  size={42}
                  color="#ccc"
                />
                <Text style={styles.addPeopleEmptyText}>
                  {connectionSearch
                    ? 'No connections match your search'
                    : myConnections.length === 0
                    ? 'No connections yet'
                    : 'All your connections are already on this call'}
                </Text>
                {!connectionSearch && myConnections.length === 0 && (
                  <Text style={styles.addPeopleEmptyHint}>
                    Connect with people on 34th Street to invite them to calls
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => String(item._id || item.id)}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const itemId = String(item.id || item._id);
                  const isCalling = alreadyCallingIds.has(itemId);
                  const displayName = [item.firstName, item.lastName].filter(Boolean).join(' ') || 'Unknown';

                  return (
                    <TouchableOpacity
                      style={[styles.addPeopleRow, isCalling && styles.addPeopleRowCalling]}
                      onPress={() => !isCalling && inviteToCall(item)}
                      activeOpacity={isCalling ? 1 : 0.7}
                    >
                      {/* Avatar */}
                      {item.photos?.[0] ? (
                        <Image source={{ uri: item.photos[0] }} style={styles.addPeopleAvatar} />
                      ) : (
                        <View style={[styles.addPeopleAvatar, styles.addPeopleAvatarPlaceholder]}>
                          <Ionicons name="person" size={22} color="#fff" />
                        </View>
                      )}

                      {/* Name + role */}
                      <View style={styles.addPeopleInfo}>
                        <Text style={styles.addPeopleName} numberOfLines={1}>
                          {displayName}
                        </Text>
                        {item.currentRole ? (
                          <Text style={styles.addPeopleRole} numberOfLines={1}>
                            {item.currentRole}
                          </Text>
                        ) : null}
                      </View>

                      {/* Action button */}
                      {isCalling ? (
                        <View style={styles.addPeopleCallingBadge}>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.addPeopleCallingText}>Calling…</Text>
                        </View>
                      ) : (
                        <View style={styles.addPeopleCallBtn}>
                          <Ionicons name="call" size={18} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: AUDIO OUTPUT PICKER MODAL (Android)
  // ═══════════════════════════════════════════════════════════════

  const renderAudioPickerModal = () => (
    <Modal
      visible={showAudioPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAudioPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAudioPicker(false)}
      >
        <View style={styles.audioPickerSheet}>
          <Text style={styles.audioPickerTitle}>Audio Output</Text>
          {Object.entries(AUDIO_OUTPUT_META).map(([mode, meta]) => (
            <TouchableOpacity
              key={mode}
              style={[styles.audioPickerRow, audioOutput === mode && styles.audioPickerRowSelected]}
              onPress={() => { applyAudioOutput(mode); setShowAudioPicker(false); }}
            >
              <Ionicons
                name={meta.icon}
                size={22}
                color={audioOutput === mode ? '#581845' : '#333'}
                style={{ marginRight: 14 }}
              />
              <Text style={[styles.audioPickerRowText, audioOutput === mode && { color: '#581845', fontWeight: '700' }]}>
                {meta.label}
              </Text>
              {audioOutput === mode && (
                <Ionicons name="checkmark" size={20} color="#581845" style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
        <StatusBar style="light" translucent />
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
        <StatusBar style="light" translucent />
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
      <>
      <View style={styles.container}>
        <StatusBar style="light" translucent />

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
            {callState === 'connected' && (
            <TouchableOpacity onPress={switchCamera} style={styles.flipCameraBtn}>
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          </View>
        </View>

        {/* Bottom Controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={[styles.videoControls, { paddingBottom: insets.bottom + 20 }]}
        >
          {/* Conference participant strip */}
          {participants.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.videoParticipantStrip} contentContainerStyle={styles.participantStripContent}>
              {participants.map(p => (
                <View key={p.id} style={styles.participantChip}>
                  {p.photo ? (
                    <Image source={{ uri: p.photo }} style={styles.participantChipAvatar} />
                  ) : (
                    <View style={[styles.participantChipAvatar, styles.participantAvatarPlaceholder]}>
                      <Ionicons name="person" size={16} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                  {p.calling && <View style={styles.callingBadge}><ActivityIndicator size={8} color="#fff" /></View>}
                  {p.connected && <View style={styles.connectedBadge} />}
                  <Text style={styles.participantChipName} numberOfLines={1}>{p.name?.split(' ')[0]}</Text>
                </View>
              ))}
            </ScrollView>
          )}

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

            {/* Audio Output cycling button */}
            <TouchableOpacity
              style={[styles.controlBtn, audioOutput !== AUDIO_OUTPUT.EARPIECE && styles.controlBtnActive]}
              onPress={cycleAudioOutput}
              onLongPress={openAudioOutputPicker}
              delayLongPress={400}
            >
              <Ionicons name={AUDIO_OUTPUT_META[audioOutput]?.icon || 'volume-low'} size={24} color="#fff" />
            </TouchableOpacity>

            {/* Add People */}
            {callState === 'connected' ? (
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={() => { fetchConnections(); setShowAddPeople(true); }}
              >
                <Ionicons name="person-add" size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.controlBtn} onPress={switchCamera}>
                <Ionicons name="camera-reverse" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
      {renderAddPeopleModal()}
      {renderAudioPickerModal()}
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: AUDIO CALL
  // ═══════════════════════════════════════════════════════════════

  return (
    <>
    <View style={styles.container}>
      <StatusBar style="light" translucent />
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

          {/* ─── Conference participant avatars ─── */}
          {participants.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.participantStrip} contentContainerStyle={styles.participantStripContent}>
              {participants.map(p => (
                <View key={p.id} style={styles.participantChip}>
                  {p.photo ? (
                    <Image source={{ uri: p.photo }} style={styles.participantChipAvatar} />
                  ) : (
                    <View style={[styles.participantChipAvatar, styles.participantAvatarPlaceholder]}>
                      <Ionicons name="person" size={16} color="rgba(255,255,255,0.7)" />
                    </View>
                  )}
                  {p.calling && (
                    <View style={styles.callingBadge}>
                      <ActivityIndicator size={8} color="#fff" />
                    </View>
                  )}
                  {p.connected && (
                    <View style={styles.connectedBadge} />
                  )}
                  <Text style={styles.participantChipName} numberOfLines={1}>
                    {p.name?.split(' ')[0]}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.controlsGrid}>
            {/* Audio Output (Speaker/BT/Earpiece) */}
            <View style={styles.controlItem}>
              <TouchableOpacity
                style={[styles.controlBtn, audioOutput !== AUDIO_OUTPUT.EARPIECE && styles.controlBtnActive]}
                onPress={cycleAudioOutput}
                onLongPress={openAudioOutputPicker}
                delayLongPress={400}
              >
                <Ionicons
                  name={AUDIO_OUTPUT_META[audioOutput]?.icon || 'volume-low'}
                  size={24} color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.controlLabel}>
                {AUDIO_OUTPUT_META[audioOutput]?.label || 'Speaker'}
              </Text>
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

            {/* Add People (only when connected) */}
            {callState === 'connected' && (
              <View style={styles.controlItem}>
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={() => { fetchConnections(); setShowAddPeople(true); }}
                >
                  <Ionicons name="person-add" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.controlLabel}>Add</Text>
              </View>
            )}
          </View>

          <View style={styles.endCallCenter}>
            <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
              <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
    {renderAddPeopleModal()}
    {renderAudioPickerModal()}
    </>
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

  // ═══ Conference Participant Strip ═══
  participantStrip: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  videoParticipantStrip: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  participantStripContent: {
    gap: 12,
    paddingHorizontal: 4,
  },
  participantChip: {
    alignItems: 'center',
    width: 58,
  },
  participantChipAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  participantAvatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantChipName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 5,
    fontWeight: '500',
  },
  callingBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedBadge: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#1a1a2e',
  },

  // ═══ Add People Modal ═══
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  addPeopleSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '75%',
  },
  addPeopleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  addPeopleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  addPeopleClose: {
    padding: 4,
  },
  addPeopleSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addPeopleSearchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a2e',
  },
  addPeopleEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  addPeopleEmptyText: {
    color: '#999',
    fontSize: 15,
  },
  addPeopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  addPeopleAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  addPeopleAvatarPlaceholder: {
    backgroundColor: '#581845',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPeopleInfo: {
    flex: 1,
  },
  addPeopleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  addPeopleRole: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  addPeopleCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPeopleSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontWeight: '400',
  },
  addPeopleRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#581845',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
    marginTop: 14,
  },
  addPeopleRetryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addPeopleEmptyHint: {
    color: '#bbb',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  addPeopleRowCalling: {
    opacity: 0.6,
  },
  addPeopleCallingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  addPeopleCallingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ═══ Audio Output Picker Modal (Android) ═══
  audioPickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },
  audioPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 16,
    textAlign: 'center',
  },
  audioPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  audioPickerRowSelected: {
    backgroundColor: 'rgba(88, 24, 69, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  audioPickerRowText: {
    fontSize: 16,
    color: '#333',
  },
});

export default CallScreen;
