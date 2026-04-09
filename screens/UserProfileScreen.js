

// UserProfileScreen.js
import React, { useEffect, useState, useContext, useMemo, useLayoutEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Linking } from 'react-native';
import LottieView from 'lottie-react-native';
import { AntDesign } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { sendConnectionRequest, cancelConnectionRequest, removeConnection, getConnectionStatus, getConnectionCount } from '../services/connection.service';
import { socket } from '../socket';
import { playPing, showTopToast } from '../utils/notify';
import OnboardingOverlay from '../components/OnboardingOverlay';




const BASE_URL = 'http://192.168.100.28:4000';

const toAbsolute = (p) => (p && typeof p === 'string' && !p.startsWith('http') ? `${BASE_URL}${p}` : p);

const normalizeUser = (raw) => {
    if (!raw) return null;
    const photos = Array.isArray(raw.photos) ? raw.photos.map(toAbsolute) : [];
    const userId = raw?.id || raw?._id;
    return {
        ...raw,
        id: userId,
        _id: userId,
        photos,
    };
};

const safeSchoolFromEmail = (email) => {
    const school =
        typeof email === 'string'
            ? email.split?.('@')?.[1]?.split?.('.')?.[0]
            : '';
    if (!school) return 'Unknown School';
    return school
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

const parseLanguages = (languages) => {
    try {
        if (Array.isArray(languages)) return languages.join(', ');
        if (typeof languages === 'string') return JSON.parse(languages).join(', ');
        return 'N/A';
    } catch {
        return 'N/A';
    }
};



const PlaceholderPhoto = 'https://via.placeholder.com/150';

const UserProfileScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user: currentUser } = useContext(AuthContext);
    const initialUser = normalizeUser(route.params?.user) || {};
    const [user, setUser] = useState(initialUser);
    const [loading, setLoading] = useState(true); // Start with loading true
    const [isBlocked, setIsBlocked] = useState(false);

    // Connection state
    const [connectionStatus, setConnectionStatus] = useState('none');
    const [loadingConnectionStatus, setLoadingConnectionStatus] = useState(true);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [connectionCount, setConnectionCount] = useState(0);
const [reportModalVisible, setReportModalVisible] = useState(false);
const [reportStep, setReportStep] = useState(1);
const [selectedReason, setSelectedReason] = useState('');
const [reportReason, setReportReason] = useState('');
const [selectedDetail, setSelectedDetail] = useState('');
const [reportComment, setReportComment] = useState('');
const [reportSuccess, setReportSuccess] = useState(false);

const reportReasons = [
  'Inappropriate content',
  'Harassment or bullying',
  'Spam or scam',
  'Impersonation',
  'Hate speech',
  'Other',
];




    // Fetch connection status and count on mount
    useEffect(() => {
        const targetUserId = user?.id || user?._id;
        if (!targetUserId) return;

        const fetchConnectionStatus = async () => {
            try {
                const status = await getConnectionStatus(targetUserId);
                setConnectionStatus(status === 'received' ? 'none' : status);
            } catch (error) {
                console.error('Failed to fetch connection status:', error);
            } finally {
                setLoadingConnectionStatus(false);
            }
        };

        const fetchConnectionCount = async () => {
            try {
                const count = await getConnectionCount(targetUserId);
                setConnectionCount(count);
            } catch (error) {
                console.error('Failed to fetch connection count:', error);
            }
        };

        fetchConnectionStatus();
        fetchConnectionCount();
    }, [user?.id, user?._id]);

    // Real-time socket listeners for connection updates
    useEffect(() => {
        const targetUserId = String(user?.id || user?._id || '');

        const handleConnectionAccepted = (data) => {
            if (String(data.targetUserId) === targetUserId) {
                playPing();
                showTopToast('Connection Accepted! 🎉', `${data.targetName || 'User'} accepted your request`);
                setConnectionStatus('connected');
                setConnectionCount(prev => prev + 1);
            }
        };

        const handleConnectionRemoved = (data) => {
            if (String(data.userId) === targetUserId) {
                setConnectionStatus('none');
                setConnectionCount(prev => Math.max(0, prev - 1));
            }
        };

        // Also listen for any connection change involving this user (for live count)
        const handleConnectionChanged = (data) => {
            if (String(data.userId) === targetUserId || String(data.targetUserId) === targetUserId) {
                getConnectionCount(targetUserId).then(c => setConnectionCount(c)).catch(() => {});
            }
        };

        socket.on('connection:accepted', handleConnectionAccepted);
        socket.on('connection:removed', handleConnectionRemoved);
        socket.on('connection:changed', handleConnectionChanged);

        return () => {
            socket.off('connection:accepted', handleConnectionAccepted);
            socket.off('connection:removed', handleConnectionRemoved);
            socket.off('connection:changed', handleConnectionChanged);
        };
    }, [user?.id, user?._id]);

    const getConnectionDisplay = () => {
        switch (connectionStatus) {
            case 'pending':
                return { icon: 'hourglass-outline', label: 'Pending', color: '#f39c12', bgColor: '#fef3e0' };
            case 'connected':
                return { icon: 'checkmark-done', label: 'Connected', color: '#581845', bgColor: '#f0e7ef' };
            default:
                return { icon: 'person-add-outline', label: 'Connect', color: '#581845', bgColor: '#581845' };
        }
    };

    const handleConnect = async () => {
        const targetUserId = user?.id || user?._id;
        const previousStatus = connectionStatus;

        try {
            if (connectionStatus === 'none') {
                setConnectionStatus('pending');
                await sendConnectionRequest(targetUserId);
            } else if (connectionStatus === 'pending') {
                setConnectionStatus('none');
                await cancelConnectionRequest(targetUserId);
            } else if (connectionStatus === 'connected') {
                setShowDisconnectModal(true);
                return;
            }
        } catch (error) {
            setConnectionStatus(previousStatus);
            console.error('Connection action failed:', error);
        }
    };

    const handleConfirmDisconnect = async () => {
        const targetUserId = user?.id || user?._id;
        setDisconnecting(true);
        try {
            await removeConnection(targetUserId);
            setConnectionStatus('none');
            setConnectionCount(prev => Math.max(0, prev - 1));
            setShowDisconnectModal(false);
        } catch (error) {
            console.error('Disconnect failed:', error);
        } finally {
            setDisconnecting(false);
        }
    };

     useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: false,     // Cleaner look
      headerTitle: '',
      headerBackTitle: 'Back',
      headerBackTitleVisible: true,
      headerStyle: {
        backgroundColor: '#ffffff',   // Top bar background
        borderBottomWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#581845',     // Back icon color
      headerShadowVisible: false,
    });
  }, [navigation]);

    // Always fetch full profile when screen loads (author data from posts is incomplete)
    useEffect(() => {
        const fetchFullProfile = async () => {
            const userId = initialUser?.id || initialUser?._id;
            if (!userId) {
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                const token = await AsyncStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
                
                // Try multiple endpoints to get full profile
                let fullUser = null;
                try {
                    const res = await axios.get(`${BASE_URL}/accounts/${userId}`, { headers });
                    fullUser = res.data?.user || res.data;
                } catch (e1) {
                    try {
                        const res = await axios.get(`${BASE_URL}/accounts/profile/${userId}`, { headers });
                        fullUser = res.data?.user || res.data;
                    } catch (e2) {
                        try {
                            const res = await axios.get(`${BASE_URL}/accounts/${userId}/profile`, { headers });
                            fullUser = res.data?.user || res.data;
                        } catch (e3) {
                            console.log('All profile fetch attempts failed');
                        }
                    }
                }
                
                if (fullUser) {
                    setUser(normalizeUser(fullUser));
                }
            } catch (e) {
                console.log('Profile fetch error:', e?.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchFullProfile();
    }, []);


    useEffect(() => {
  const checkBlockStatus = async () => {
    const userId = user?.id || user?._id;
    if (!userId) return; // Don't check if no valid user ID
    
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/blocks/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsBlocked(res.data?.isBlocked || false);
    } catch (error) {
      console.error('⚠️ Failed to check block status:', error?.response?.data || error.message);
    }
  };
  checkBlockStatus();
}, [user?.id, user?._id]);

    const avatar = useMemo(() => {
        if (user?.photos?.length > 0) return user.photos[0];
        if (user?.avatarUrl) return toAbsolute(user.avatarUrl);
        return PlaceholderPhoto;
    }, [user]);

    const school = useMemo(() => safeSchoolFromEmail(user?.email), [user?.email]);

    const goToChat = () => {
        // Pass the minimal shape your PrivateChat expects
        // Adjust keys if PrivateChat expects `_id` instead of `id`
        navigation.navigate('PrivateChat', {
            user: {
                id: user?.id || user?._id,
                _id: user?._id || user?.id,
                firstName: user?.firstName,
                lastName: user?.lastName,
                photos: user?.photos || [],
                avatarUrl: avatar,
                email: user?.email, // helpful if chat header shows domain/school
            },
        });
    };


    // --- LinkedIn helpers ---
const parseLinkedIn = (raw) => {
  if (!raw) return null;
  const val = String(raw).trim();

  // If user pasted only a handle, e.g. "john-doe" or "@john-doe"
  if (!val.includes('linkedin.com')) {
    const clean = val.replace(/^@/, '').replace(/\/+$/, '');
    if (!clean) return null;
    return { type: 'in', slug: clean, webUrl: `https://www.linkedin.com/in/${clean}` };
  }

  // Normalize a full URL
  let url = val;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);

    // Extract the first path segment after /in/ or /company/
    const path = u.pathname.replace(/^\/+/, ''); // remove leading "/"
    const parts = path.split('/');
    const section = parts[0]?.toLowerCase();
    const slug = parts[1]?.replace(/\/+$/, '');

    if (section === 'in' && slug) {
      return { type: 'in', slug, webUrl: `https://www.linkedin.com/in/${slug}` };
    }
    if (section === 'company' && slug) {
      return { type: 'company', slug, webUrl: `https://www.linkedin.com/company/${slug}` };
    }

    // If we can’t confidently parse, just use the URL
    return { type: 'url', slug: null, webUrl: u.toString() };
  } catch {
    return null;
  }
};

const getLinkedInAppUrl = ({ type, slug, webUrl }) => {
  if (type === 'in' && slug) return `linkedin://in/${slug}`;
  if (type === 'company' && slug) return `linkedin://company/${slug}`;
  // Fallback: some clients can still handle generic linkedin:// links
  return `linkedin://` || webUrl;
};


const openLinkedIn = async () => {
  const parsed = parseLinkedIn(user?.linkedIn);
  if (!parsed) {
    Alert.alert('No LinkedIn profile', 'LinkedIn link or handle is missing or invalid.');
    return;
  }

  const appUrl = getLinkedInAppUrl(parsed);
  const webUrl = parsed.webUrl;

  try {
    // Try the app first
    const canOpenApp = await Linking.canOpenURL(appUrl);
    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return;
    }

    // Fallback to web
    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return;
    }

    Alert.alert('Unable to open', 'Please check your LinkedIn link or open it manually.');
  } catch (e) {
    console.log('Error opening LinkedIn:', e);
    Alert.alert('Unable to open', 'Please check your LinkedIn link or open it manually.');
  }
};


// const handleReportUser = async () => {
// if (!reportReason.trim()) return alert('Please enter a reason.');
// try {
// const token = await AsyncStorage.getItem('token');
// await axios.post(
// `${BASE_URL}/reports`,
// { reportedUser: user.id, reason: reportReason },
// { headers: { Authorization: `Bearer ${token}` } }
// );
// setReportReason('');
// setReportModalVisible(false);
// alert('User has been reported. Thank you.');
// } catch (error) {
// console.error('❌ Report failed:', error?.response?.data || error.message);
// alert('Unable to report user.');
// }
// };

const handleReportUser = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    await axios.post(`${BASE_URL}/reports`, {
      reportedUser: user?.id,
      reason: reportReason,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setReportSuccess(true);
    setTimeout(() => {
      setReportModalVisible(false);
      setReportStep(1);
      setReportReason('');
      setReportSuccess(false);
    }, 2500);
  } catch (error) {
    console.error('❌ Report failed:', error?.response?.data || error.message);
    Alert.alert('Error', 'Could not report user. Please try again.');
  }
};


const handleBlockUser = async () => {
  const userId = user?.id || user?._id;
  if (!userId) {
    alert('Cannot identify user to block.');
    return;
  }
  
  try {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.post(`${BASE_URL}/blocks`, {
      blocked: userId
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const message = res?.data?.message || '';
    if (message.includes('unblocked')) {
      alert('User has been unblocked.');
      setIsBlocked(false); // 🟢 update UI
    } else if (message.includes('blocked')) {
      alert('User has been blocked.');
      setIsBlocked(true); // 🔴 update UI
    } else {
      alert('Action completed.');
    }

  } catch (error) {
    console.error('❌ Block/Unblock failed:', error?.response?.data || error.message);
    alert('Unable to toggle block status. Try again later.');
  }
};


const handleReportSubmit = async () => {
const userId = user?.id || user?._id;
if (!userId) {
  alert('Cannot identify user to report.');
  return;
}

try {
const token = await AsyncStorage.getItem('token');
await axios.post(`${BASE_URL}/reports`, {
reportedUser: userId,
reason: `${selectedReason} > ${selectedDetail}`,
comment: reportComment
}, {
headers: { Authorization: `Bearer ${token}` }
});
setReportModalVisible(false);
setSelectedReason('');
setSelectedDetail('');
setReportComment('');
setReportStep(1);
alert('User reported. Thank you.');
} catch (e) {
alert('Failed to report user.');
}
};

const renderReportModal = () => (

<Modal
  visible={reportModalVisible}
  animationType="slide"
  transparent
  onRequestClose={() => setReportModalVisible(false)}
>
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20
  }}>
    <View style={{
      
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 20,
      elevation: 6
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
  {/* Back Icon */}
  {reportStep > 1 && !reportSuccess && (
    <TouchableOpacity onPress={() => setReportStep((s) => s - 1)}>
      <AntDesign name="left" size={22} color="#581845" />
    </TouchableOpacity>
  )}

  {/* Cancel Icon (always visible) */}
  <TouchableOpacity onPress={() => {
    setReportModalVisible(false);
    setReportStep(1);
    setReportReason('');
    setReportSuccess(false);
  }}>
    <AntDesign name="close" size={22} color="#581845" />
  </TouchableOpacity>
</View>

      {/* Back icon */}
      

      {/* Step indicator */}
      {!reportSuccess && (
        <Text style={{ color: '#888', fontSize: 13, marginTop: 6, marginBottom: 10 }}>
          Step {reportStep} of 3
        </Text>
      )}

      {reportStep === 1 && (
        <>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
            Why are you reporting this user?
          </Text>
          {reportReasons.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: reportReason === reason ? '#f5e1f1' : '#f9f9f9',
                borderRadius: 10,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: reportReason === reason ? '#581845' : '#ddd',
              }}
              onPress={() => {
                setReportReason(reason);
                setReportStep(2);
              }}
            >
              <Text style={{ fontSize: 14, color: '#333' }}>{reason}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {reportStep === 2 && (
        <>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
            Add more details (optional)
          </Text>
          <TextInput
            style={{
              height: 100,
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 10,
              padding: 10,
              textAlignVertical: 'top',
            }}
            multiline
            placeholder="Add any additional details here..."
            value={reportReason}
            onChangeText={setReportReason}
          />
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: '#581845',
              padding: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={() => setReportStep(3)}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Continue</Text>
          </TouchableOpacity>
        </>
      )}

      {reportStep === 3 && !reportSuccess && (
        <>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12 }}>
            Submit Report
          </Text>
          <Text style={{ fontSize: 14, color: '#555', marginBottom: 20 }}>
            Are you sure you want to report this user?
          </Text>

         
          <TouchableOpacity
            style={{
              backgroundColor: '#dc3545',
              padding: 12,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={handleReportUser}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Yes, Report</Text>
          </TouchableOpacity>
        </>
      )}

      {reportSuccess && (
        <View style={{ alignItems: 'center', padding: 20 }}>
          <LottieView
            source={require('../assets/success.json')}
            autoPlay
            loop={false}
            style={{ width: 120, height: 120 }}
          />
          <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 10 }}>
            Report Submitted!
          </Text>
        </View>
      )}
    </View>
  </View>
</Modal>



);


    // Show full-screen loading when first loading user profile
    if (loading && (!user?.email || !user?.firstName)) {
        return (
            <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }]}>
                <ActivityIndicator size="large" color="#581845" />
                <Text style={{ marginTop: 16, color: '#666', fontSize: 16 }}>Loading profile...</Text>
            </View>
        );
    }


    return (
        <OnboardingOverlay screenName="UserProfile">
        <ScrollView style={styles.container}>
          
            {/* Profile Header */}
            <View style={styles.profileHeader}>
                
                <Image source={{ uri: avatar }} style={styles.profilePic} />
                <Text style={styles.fullName}>
                    {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown User'}
                </Text>

                {/* Connection count */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{connectionCount}</Text>
                        <Text style={styles.statLabel}>{connectionCount === 1 ? 'Connection' : 'Connections'}</Text>
                    </View>
                </View>

                {/* Connection + Chat buttons row */}
                <View style={styles.profileBtnRow}>
                    <TouchableOpacity
                        style={[
                            styles.connectBtn,
                            connectionStatus === 'connected' && styles.connectedBtn,
                            connectionStatus === 'pending' && styles.pendingBtn,
                        ]}
                        onPress={handleConnect}
                        disabled={loadingConnectionStatus}
                        activeOpacity={0.7}
                    >
                        {loadingConnectionStatus ? (
                            <ActivityIndicator size={16} color="#fff" />
                        ) : (
                            <>
                                <Ionicons
                                    name={getConnectionDisplay().icon}
                                    size={18}
                                    color={connectionStatus === 'none' ? '#fff' : getConnectionDisplay().color}
                                />
                                <Text style={[
                                    styles.connectBtnText,
                                    connectionStatus !== 'none' && { color: getConnectionDisplay().color },
                                ]}>
                                    {getConnectionDisplay().label}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.editBtn} onPress={goToChat}>
                        <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
                        <Text style={styles.editBtnText}> Chat</Text>
                    </TouchableOpacity>
                </View>

            </View>

            {loading && (
                <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#581845" />
                    <Text style={{ marginTop: 6, color: '#666' }}>Fetching full profile…</Text>
                </View>
            )}

            {/* Photo Gallery */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gallery</Text>
                {user?.photos && user.photos.length > 0 ? (
                    <FlatList
                        data={user.photos}
                        horizontal
                        keyExtractor={(_, index) => String(index)}
                        renderItem={({ item, index }) => (
                            <View style={{ alignItems: 'center', marginRight: 12 }}>
                                <Image source={{ uri: item }} style={styles.galleryImage} />
                                {index === 0 && <Text style={styles.profilePhotoLabel}>Profile Photo</Text>}
                            </View>
                        )}
                    />
                ) : (
                    <Text style={styles.placeholderText}>No photos uploaded yet.</Text>
                )}
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <InfoRow label="Nickname" value={user?.nickname || 'N/A'} />
                <InfoRow label="Gender" value={user?.gender || 'N/A'} />
                {/* <InfoRow label="Date of Birth" value={user?.DOB?.slice?.(0, 10) || 'N/A'} /> */}

                <InfoRow
  label="Date of Birth"
  value={
    user?.DOB
      ? moment(user.DOB).format("DD MMM") + " 🎉"

      // moment(user.DOB).format("DD MMMM")  // e.g. "12 March"
      : "N/A"
  }
/>

                <InfoRow label="Languages Spoken" value={parseLanguages(user?.languages)} />
                <InfoRow label="Origin" value={user?.origin || 'N/A'} />
            </View>

            {/* 📍 Location Section - Modern Tinder-inspired Design */}
            {(user?.currentCity || user?.distance !== null) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                <View style={styles.locationCard}>
                  <View style={styles.locationIconContainer}>
                    <Ionicons name="location" size={24} color="#581845" />
                  </View>
                  <View style={styles.locationDetails}>
                    {user?.currentCity && (
                      <Text style={styles.locationCityText}>{user.currentCity}</Text>
                    )}
                    {user?.distance !== null && user?.distance !== undefined ? (
                      <View style={styles.distanceBadge}>
                        <Ionicons name="navigate" size={14} color="#581845" />
                        <Text style={styles.distanceText}>
                          {user?.distanceDisplay || (
                            user.distance < 1 
                              ? 'Less than 1 km away' 
                              : user.distance < 10 
                                ? `${user.distance.toFixed(1)} km away`
                                : `${Math.round(user.distance)} km away`
                          )}
                        </Text>
                      </View>
                    ) : user?.locationSharingEnabled === false ? (
                      <Text style={styles.locationHiddenText}>Distance hidden by user</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            {/* Academic Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Academic Details</Text>
                <InfoRow label="University" value={school.toUpperCase()} />
                <InfoRow label="Program of Study" value={user?.fieldOfStudy || 'N/A'} />
                <InfoRow label="Field of Study" value={user?.type || 'N/A'} />
                <InfoRow label="Graduation Year" value={user?.graduationYear || 'N/A'} />
            </View>

            {/* Professional Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professional Information</Text>
                <InfoRow label="Industry" value={user?.industry || 'N/A'} />
                <InfoRow label="Current Role" value={user?.currentRole || 'N/A'} />
                {/* <InfoRow label="LinkedIn" value={user?.linkedIn || 'N/A'} /> */}
                 <View style={styles.infoRowWrap}>
 <Text style={styles.infoLabel}>LinkedIn</Text>
{user.linkedIn ? (
  <TouchableOpacity onPress={openLinkedIn} style={{ flex: 1 }}>
    <Text style={styles.linkText} numberOfLines={0}>
      {user.linkedIn}
    </Text>
  </TouchableOpacity>
) : (
  <Text style={styles.infoValue}>Not provided</Text>
)}

            </View>
</View>
            {/* Bio and Interests */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bio</Text>
                <Text style={styles.sectionContent}>{user?.bio || 'No bio available.'}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Interests</Text>
                {user?.interests && user.interests.length > 0 ? (
                    <View style={styles.interestsContainer}>
                        {user.interests.map((interest, index) => (
                            <View key={index} style={styles.interestPill}>
                                <Text style={styles.interestText}>{interest}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.placeholderText}>No interests added yet.</Text>
                )}
            </View>

            {/* Other Info */}
            <View style={styles.section}>
                <InfoRow label="Fun Fact" value={user?.funFact || 'N/A'} />
                <InfoRow label="Relationship Status" value={user?.rship || 'N/A'} />
                <InfoRow label="Joined" value={user?.created ? moment(user.created).format('LL') : 'N/A'} />

 
            </View>

            <View style={styles.profileHeaders}>
<TouchableOpacity
style={[styles.blockBtn, { backgroundColor: '#dc3545' }]}
onPress={() => setReportModalVisible(true)}
>
<Ionicons name="alert-circle-outline" size={20} color="#fff" />
<Text style={styles.editBtnText}> Report User</Text>
</TouchableOpacity>


<TouchableOpacity
style={[styles.blockBtn, { backgroundColor: isBlocked ? '#28a745' : '#6c757d' }]}
onPress={handleBlockUser }
>
<Ionicons name="ban-outline" size={20} color="#fff" />
<Text style={styles.editBtnText}> {isBlocked ? 'Unblock User' : 'Block User'} </Text>
</TouchableOpacity>
</View>

{renderReportModal()}

            {/* Disconnect Confirmation Modal */}
            <Modal
                visible={showDisconnectModal}
                transparent
                animationType="fade"
                onRequestClose={() => !disconnecting && setShowDisconnectModal(false)}
            >
                <View style={styles.disconnectOverlay}>
                    <View style={styles.disconnectModal}>
                        <Image
                            source={{ uri: avatar }}
                            style={styles.disconnectAvatar}
                        />
                        <Text style={styles.disconnectTitle}>Disconnect from {user?.firstName}?</Text>
                        <Text style={styles.disconnectMessage}>
                            You will no longer be connected with {user?.firstName} {user?.lastName}. To reconnect, you'll need to send a new request.
                        </Text>
                        <View style={styles.disconnectActions}>
                            <TouchableOpacity
                                style={styles.disconnectCancelBtn}
                                onPress={() => setShowDisconnectModal(false)}
                                disabled={disconnecting}
                            >
                                <Text style={styles.disconnectCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.disconnectConfirmBtn, disconnecting && { opacity: 0.6 }]}
                                onPress={handleConfirmDisconnect}
                                disabled={disconnecting}
                            >
                                {disconnecting ? (
                                    <ActivityIndicator size={18} color="#fff" />
                                ) : (
                                    <Text style={styles.disconnectConfirmText}>Disconnect</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            
        </ScrollView>
        </OnboardingOverlay>
    );
};

const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { backgroundColor: '#fff', flex: 1 },
    profileHeader: {
        alignItems: 'center',
        marginTop: '20%',
        paddingVertical: 30,
        backgroundColor: '#f1f3f6',
    },
    profileHeaders: {
        alignItems: 'center',
        marginTop: '0%',
        paddingVertical: 20,
        backgroundColor: '#f1f3f6',
    },
    infoRowWrap: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 10,
},
    profilePic: {
        width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#581845',
    },
    fullName: { fontSize: 22, fontWeight: '600', marginTop: 12, color: '#333' },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        marginBottom: 4,
        gap: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '800',
        color: '#581845',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
        fontWeight: '500',
    },
    profileBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    connectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#581845',
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 20,
        gap: 6,
    },
    connectedBtn: {
        backgroundColor: '#f0e7ef',
        borderWidth: 1,
        borderColor: '#581845',
    },
    pendingBtn: {
        backgroundColor: '#fef3e0',
        borderWidth: 1,
        borderColor: '#f39c12',
    },
    connectBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    editBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#581845', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
        gap: 6,
    },
    disconnectOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    disconnectModal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
    },
    disconnectAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#581845',
        marginBottom: 12,
    },
    disconnectTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#222',
        marginBottom: 8,
        textAlign: 'center',
    },
    disconnectMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    disconnectActions: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    disconnectCancelBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
    },
    disconnectCancelText: {
        fontWeight: '600',
        color: '#333',
    },
    disconnectConfirmBtn: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 10,
        backgroundColor: '#dc3545',
        alignItems: 'center',
    },
    disconnectConfirmText: {
        fontWeight: '600',
        color: '#fff',
    },
    blockBtn: {
flexDirection: 'row',
alignItems: 'center',
marginTop: 10,
paddingHorizontal: 20,
paddingVertical: 10,
borderRadius: 25,
},
    editBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
    section: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#222' },
    sectionContent: { fontSize: 14, color: '#555' },
    
    // 📍 Location Section Styles - Modern Design
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#faf5f9',
        borderRadius: 12,
        padding: 14,
        marginTop: 4,
    },
    locationIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f0e7ef',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    locationDetails: {
        flex: 1,
    },
    locationCityText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0e7ef',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 4,
    },
    distanceText: {
        fontSize: 13,
        color: '#581845',
        fontWeight: '500',
    },
    locationHiddenText: {
        fontSize: 13,
        color: '#999',
        fontStyle: 'italic',
    },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    infoLabel: { color: '#666', fontSize: 14, flex: 1 },
    infoValue: { color: '#222', fontSize: 14, flex: 1, textAlign: 'right' },
    galleryImage: { width: 100, height: 100, borderRadius: 8 },
    profilePhotoLabel: { marginTop: 4, fontSize: 12, color: '#581845', fontWeight: '600' },
    interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    interestPill: {
        backgroundColor: '#581845', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 15, marginRight: 8, marginBottom: 8,
    },
    interestText: { color: '#fff', fontSize: 12 },
    placeholderText: { fontSize: 14, color: '#aaa', marginTop: 5 },
      backButton: { marginRight: 10, marginLeft:30, marginVertical:30,  },
      linkText: {
  color: '#581845',        // LinkedIn blue
  textDecorationLine: 'underline',
  fontSize: 14,
},

modalBackdrop: {
flex: 1,
backgroundColor: 'rgba(0,0,0,0.5)',
justifyContent: 'center',
alignItems: 'center',
},
modalBox: {
width: '85%',
backgroundColor: '#fff',
borderRadius: 10,
padding: 20,
},
modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
textArea: {
height: 100,
borderColor: '#ccc',
borderWidth: 1,
padding: 10,
borderRadius: 6,
textAlignVertical: 'top',
marginBottom: 15,
},
modalActions: {
flexDirection: 'row',
justifyContent: 'flex-end',
},
cancelBtn: {
paddingVertical: 10,
paddingHorizontal: 15,
backgroundColor: '#6c757d',
borderRadius: 6,
marginRight: 10,
},
submitBtn: {
paddingVertical: 10,
paddingHorizontal: 15,
backgroundColor: '#581845',
borderRadius: 6,
},


});

export default UserProfileScreen;











// // UserProfileScreen.js
// import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     Image,
//     TouchableOpacity,
//     ScrollView,
//     FlatList,
//     ActivityIndicator,
//     Modal,
//     TextInput,
//     Alert,
// } from 'react-native';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import moment from 'moment';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { Linking } from 'react-native';
// import LottieView from 'lottie-react-native';
// import { AntDesign } from '@expo/vector-icons';




// const BASE_URL = 'http://192.168.100.28:4000';

// const toAbsolute = (p) => (p && typeof p === 'string' && !p.startsWith('http') ? `${BASE_URL}${p}` : p);

// const normalizeUser = (raw) => {
//     if (!raw) return null;
//     const photos = Array.isArray(raw.photos) ? raw.photos.map(toAbsolute) : [];
//     return {
//         ...raw,
//         id: raw?.id || raw?._id,
//         photos,
//     };
// };

// const safeSchoolFromEmail = (email) => {
//     const school =
//         typeof email === 'string'
//             ? email.split?.('@')?.[1]?.split?.('.')?.[0]
//             : '';
//     if (!school) return 'Unknown School';
//     return school
//         .replace(/-/g, ' ')
//         .replace(/\b\w/g, (c) => c.toUpperCase());
// };

// const parseLanguages = (languages) => {
//     try {
//         if (Array.isArray(languages)) return languages.join(', ');
//         if (typeof languages === 'string') return JSON.parse(languages).join(', ');
//         return 'N/A';
//     } catch {
//         return 'N/A';
//     }
// };

// const reportReasons = {
// Misleading: [
// 'Fake profile, scammer, not one person',
// 'Someone is selling something',
// 'Someone under 18 is involved'
// ],
// Harassment: [
// 'Nudity or something sexually explicit',
// 'Abusive/hateful/threatening behavior'
// ],
// Safety: [
// 'In person physical/sexual harm or stalking',
// 'Possible threat to themselves or others'
// ]
// };

// const PlaceholderPhoto = 'https://via.placeholder.com/150';

// const UserProfileScreen = () => {
//     const navigation = useNavigation();
//     const route = useRoute();
//     const initialUser = normalizeUser(route.params?.user) || {};
//     const [user, setUser] = useState(initialUser);
//     const [loading, setLoading] = useState(false);
//     const [isBlocked, setIsBlocked] = useState(false);
// const [reportModalVisible, setReportModalVisible] = useState(false);
// const [reportStep, setReportStep] = useState(1);
// const [selectedReason, setSelectedReason] = useState('');
// const [reportReason, setReportReason] = useState('');
// const [selectedDetail, setSelectedDetail] = useState('');
// const [reportComment, setReportComment] = useState('');


//      useLayoutEffect(() => {
//     navigation.setOptions({
//       headerShown: true,
//       headerTransparent: false,     // Cleaner look
//       headerTitle: '',
//       headerBackTitle: 'Back',
//       headerBackTitleVisible: true,
//       headerStyle: {
//         backgroundColor: '#ffffff',   // Top bar background
//         borderBottomWidth: 0,
//         elevation: 0,
//         shadowOpacity: 0,
//       },
//       headerTintColor: '#581845',     // Back icon color
//       headerShadowVisible: false,
//     });
//   }, [navigation]);

//     // If we don't have an email (or other important fields), fetch the full profile by id
//     useEffect(() => {
//         const maybeFetch = async () => {
//             if (user?.email || !user?.id) return;
//             try {
//                 setLoading(true);
//                 const token = await AsyncStorage.getItem('token');
//                 const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
//                 const res = await axios.get(`${BASE_URL}/accounts/${user.id}`, { headers });
//                 setUser(normalizeUser(res.data) || user); // keep old if normalize fails
//             } catch (e) {
//                 // keep initial user if fetch fails
//             } finally {
//                 setLoading(false);
//             }
//         };
//         maybeFetch();
//     }, [user?.id]);


//     useEffect(() => {
//   const checkBlockStatus = async () => {
//     try {
//       const token = await AsyncStorage.getItem('token');
//       const res = await axios.get(`${BASE_URL}/blocks/status/${user.id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setIsBlocked(res.data?.isBlocked || false);
//     } catch (error) {
//       console.error('⚠️ Failed to check block status:', error?.response?.data || error.message);
//     }
//   };
//   checkBlockStatus();
// }, [user.id]);

//     const avatar = useMemo(() => {
//         if (user?.photos?.length > 0) return user.photos[0];
//         if (user?.avatarUrl) return toAbsolute(user.avatarUrl);
//         return PlaceholderPhoto;
//     }, [user]);

//     const school = useMemo(() => safeSchoolFromEmail(user?.email), [user?.email]);

//     const goToChat = () => {
//         // Pass the minimal shape your PrivateChat expects
//         // Adjust keys if PrivateChat expects `_id` instead of `id`
//         navigation.navigate('PrivateChat', {
//             user: {
//                 id: user?.id || user?._id,
//                 _id: user?._id || user?.id,
//                 firstName: user?.firstName,
//                 lastName: user?.lastName,
//                 photos: user?.photos || [],
//                 avatarUrl: avatar,
//                 email: user?.email, // helpful if chat header shows domain/school
//             },
//         });
//     };


//     // --- LinkedIn helpers ---
// const parseLinkedIn = (raw) => {
//   if (!raw) return null;
//   const val = String(raw).trim();

//   // If user pasted only a handle, e.g. "john-doe" or "@john-doe"
//   if (!val.includes('linkedin.com')) {
//     const clean = val.replace(/^@/, '').replace(/\/+$/, '');
//     if (!clean) return null;
//     return { type: 'in', slug: clean, webUrl: `https://www.linkedin.com/in/${clean}` };
//   }

//   // Normalize a full URL
//   let url = val;
//   if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
//   try {
//     const u = new URL(url);

//     // Extract the first path segment after /in/ or /company/
//     const path = u.pathname.replace(/^\/+/, ''); // remove leading "/"
//     const parts = path.split('/');
//     const section = parts[0]?.toLowerCase();
//     const slug = parts[1]?.replace(/\/+$/, '');

//     if (section === 'in' && slug) {
//       return { type: 'in', slug, webUrl: `https://www.linkedin.com/in/${slug}` };
//     }
//     if (section === 'company' && slug) {
//       return { type: 'company', slug, webUrl: `https://www.linkedin.com/company/${slug}` };
//     }

//     // If we can’t confidently parse, just use the URL
//     return { type: 'url', slug: null, webUrl: u.toString() };
//   } catch {
//     return null;
//   }
// };

// const getLinkedInAppUrl = ({ type, slug, webUrl }) => {
//   if (type === 'in' && slug) return `linkedin://in/${slug}`;
//   if (type === 'company' && slug) return `linkedin://company/${slug}`;
//   // Fallback: some clients can still handle generic linkedin:// links
//   return `linkedin://` || webUrl;
// };


// const openLinkedIn = async () => {
//   const parsed = parseLinkedIn(user?.linkedIn);
//   if (!parsed) {
//     Alert.alert('No LinkedIn profile', 'LinkedIn link or handle is missing or invalid.');
//     return;
//   }

//   const appUrl = getLinkedInAppUrl(parsed);
//   const webUrl = parsed.webUrl;

//   try {
//     // Try the app first
//     const canOpenApp = await Linking.canOpenURL(appUrl);
//     if (canOpenApp) {
//       await Linking.openURL(appUrl);
//       return;
//     }

//     // Fallback to web
//     const canOpenWeb = await Linking.canOpenURL(webUrl);
//     if (canOpenWeb) {
//       await Linking.openURL(webUrl);
//       return;
//     }

//     Alert.alert('Unable to open', 'Please check your LinkedIn link or open it manually.');
//   } catch (e) {
//     console.log('Error opening LinkedIn:', e);
//     Alert.alert('Unable to open', 'Please check your LinkedIn link or open it manually.');
//   }
// };


// const handleReportUser = async () => {
// if (!reportReason.trim()) return alert('Please enter a reason.');
// try {
// const token = await AsyncStorage.getItem('token');
// await axios.post(
// `${BASE_URL}/reports`,
// { reportedUser: user.id, reason: reportReason },
// { headers: { Authorization: `Bearer ${token}` } }
// );
// setReportReason('');
// setReportModalVisible(false);
// alert('User has been reported. Thank you.');
// } catch (error) {
// console.error('❌ Report failed:', error?.response?.data || error.message);
// alert('Unable to report user.');
// }
// };

// const handleBlockUser = async () => {
//   try {
//     const token = await AsyncStorage.getItem('token');
//     const res = await axios.post(`${BASE_URL}/blocks`, {
//       blocked: user.id
//     }, {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     const message = res?.data?.message || '';
//     if (message.includes('unblocked')) {
//       alert('User has been unblocked.');
//       setIsBlocked(false); // 🟢 update UI
//     } else if (message.includes('blocked')) {
//       alert('User has been blocked.');
//       setIsBlocked(true); // 🔴 update UI
//     } else {
//       alert('Action completed.');
//     }

//   } catch (error) {
//     console.error('❌ Block/Unblock failed:', error?.response?.data || error.message);
//     alert('Unable to toggle block status. Try again later.');
//   }
// };


// const handleReportSubmit = async () => {
// try {
// const token = await AsyncStorage.getItem('token');
// await axios.post(`${BASE_URL}/reports`, {
// reportedUser: user.id,
// reason: `${selectedReason} > ${selectedDetail}`,
// comment: reportComment
// }, {
// headers: { Authorization: `Bearer ${token}` }
// });
// setReportModalVisible(false);
// setSelectedReason('');
// setSelectedDetail('');
// setReportComment('');
// setReportStep(1);
// alert('User reported. Thank you.');
// } catch (e) {
// alert('Failed to report user.');
// }
// };

// const renderReportModal = () => (
// <Modal visible={reportModalVisible} transparent animationType="slide">
// <View style={styles.modalBackdrop}>
// <View style={styles.modalBox}>
// <Text style={styles.modalTitle}>
// {reportStep === 1 ? 'What is your reason for reporting?' :
// reportStep === 2 ? 'Can you tell us what happened?' :
// 'Would you like to share any final details?'}
// </Text>


// {reportStep === 1 && Object.entries(reportReasons).map(([group, reasons]) => (
// <View key={group}>
// <Text style={styles.reasonGroup}>{group}</Text>
// {reasons.map(reason => (
// <TouchableOpacity key={reason} style={styles.reasonBtn} onPress={() => {
// setSelectedReason(reason);
// setReportStep(2);
// }}>
// <Text style={styles.reasonText}>{reason}</Text>
// </TouchableOpacity>
// ))}
// </View>
// ))}

// {reportStep === 2 && (
// <View>
// {['Nudity', 'Sexually explicit behavior', 'Sextortion'].map(detail => (
// <TouchableOpacity key={detail} style={styles.reasonBtn} onPress={() => {
// setSelectedDetail(detail);
// setReportStep(3);
// }}>
// <Text style={styles.reasonText}>{detail}</Text>
// </TouchableOpacity>
// ))}
// </View>
// )}


// {reportStep === 3 && (
// <>
// <TextInput
// placeholder="Add any details..."
// value={reportComment}
// onChangeText={setReportComment}
// multiline
// style={styles.textArea}
// />
// <TouchableOpacity onPress={handleReportSubmit} style={styles.submitBtn}>
// <Text style={{ color: '#fff' }}>Submit</Text>
// </TouchableOpacity>
// </>
// )}


// <TouchableOpacity onPress={() => setReportModalVisible(false)} style={styles.cancelBtn}>
// <Text style={{ color: '#fff' }}>Cancel</Text>
// </TouchableOpacity>
// </View>
// </View>
// </Modal>
// );





//     return (
//         <ScrollView style={styles.container}>
//             {/* <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//                           <Ionicons name="arrow-back" size={24} color="#000" />
//                         </TouchableOpacity> */}
//             {/* Profile Header */}
//             <View style={styles.profileHeader}>
                
//                 <Image source={{ uri: avatar }} style={styles.profilePic} />
//                 <Text style={styles.fullName}>
//                     {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown User'}
//                 </Text>

//                 <TouchableOpacity style={styles.editBtn} onPress={goToChat}>
//                     <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
//                     <Text style={styles.editBtnText}> Chat</Text>
//                 </TouchableOpacity>

//             </View>

//             {loading && (
//                 <View style={{ paddingVertical: 12, alignItems: 'center' }}>
//                     <ActivityIndicator size="small" color="#581845" />
//                     <Text style={{ marginTop: 6, color: '#666' }}>Fetching full profile…</Text>
//                 </View>
//             )}

//             {/* Photo Gallery */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Gallery</Text>
//                 {user?.photos && user.photos.length > 0 ? (
//                     <FlatList
//                         data={user.photos}
//                         horizontal
//                         keyExtractor={(_, index) => String(index)}
//                         renderItem={({ item, index }) => (
//                             <View style={{ alignItems: 'center', marginRight: 12 }}>
//                                 <Image source={{ uri: item }} style={styles.galleryImage} />
//                                 {index === 0 && <Text style={styles.profilePhotoLabel}>Profile Photo</Text>}
//                             </View>
//                         )}
//                     />
//                 ) : (
//                     <Text style={styles.placeholderText}>No photos uploaded yet.</Text>
//                 )}
//             </View>

//             {/* Basic Information */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Basic Information</Text>
//                 <InfoRow label="Nickname" value={user?.nickname || 'N/A'} />
//                 <InfoRow label="Gender" value={user?.gender || 'N/A'} />
//                 <InfoRow label="Date of Birth" value={user?.DOB?.slice?.(0, 10) || 'N/A'} />
//                 <InfoRow label="Languages Spoken" value={parseLanguages(user?.languages)} />
//                 <InfoRow label="Origin" value={user?.origin || 'N/A'} />
//             </View>

//             {/* Academic Info */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Academic Details</Text>
//                 <InfoRow label="University" value={school} />
//                 <InfoRow label="Program of Study" value={user?.fieldOfStudy || 'N/A'} />
//                 <InfoRow label="Field of Study" value={user?.type || 'N/A'} />
//                 <InfoRow label="Graduation Year" value={user?.graduationYear || 'N/A'} />
//             </View>

//             {/* Professional Info */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Professional Information</Text>
//                 <InfoRow label="Industry" value={user?.industry || 'N/A'} />
//                 <InfoRow label="Current Role" value={user?.currentRole || 'N/A'} />
//                 {/* <InfoRow label="LinkedIn" value={user?.linkedIn || 'N/A'} /> */}
//                  <View style={styles.infoRowWrap}>
//  <Text style={styles.infoLabel}>LinkedIn</Text>
// {user.linkedIn ? (
//   <TouchableOpacity onPress={openLinkedIn} style={{ flex: 1 }}>
//     <Text style={styles.linkText} numberOfLines={0}>
//       {user.linkedIn}
//     </Text>
//   </TouchableOpacity>
// ) : (
//   <Text style={styles.infoValue}>Not provided</Text>
// )}

//             </View>
// </View>
//             {/* Bio and Interests */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Bio</Text>
//                 <Text style={styles.sectionContent}>{user?.bio || 'No bio available.'}</Text>
//             </View>

//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Interests</Text>
//                 {user?.interests && user.interests.length > 0 ? (
//                     <View style={styles.interestsContainer}>
//                         {user.interests.map((interest, index) => (
//                             <View key={index} style={styles.interestPill}>
//                                 <Text style={styles.interestText}>{interest}</Text>
//                             </View>
//                         ))}
//                     </View>
//                 ) : (
//                     <Text style={styles.placeholderText}>No interests added yet.</Text>
//                 )}
//             </View>

//             {/* Other Info */}
//             <View style={styles.section}>
//                 <InfoRow label="Fun Fact" value={user?.funFact || 'N/A'} />
//                 <InfoRow label="Relationship Status" value={user?.rship || 'N/A'} />
//                 <InfoRow label="Joined" value={user?.created ? moment(user.created).format('LL') : 'N/A'} />

 
//             </View>

//             <View style={styles.profileHeaders}>
// <TouchableOpacity
// style={[styles.blockBtn, { backgroundColor: '#dc3545' }]}
// onPress={() => setReportModalVisible(true)}
// >
// <Ionicons name="alert-circle-outline" size={20} color="#fff" />
// <Text style={styles.editBtnText}> Report User</Text>
// </TouchableOpacity>


// <TouchableOpacity
// style={[styles.blockBtn, { backgroundColor: isBlocked ? '#28a745' : '#6c757d' }]}
// onPress={handleBlockUser }
// >
// <Ionicons name="ban-outline" size={20} color="#fff" />
// <Text style={styles.editBtnText}> {isBlocked ? 'Unblock User' : 'Block User'} </Text>
// </TouchableOpacity>
// </View>

// {renderReportModal()}
// {/* Report Modal */}
// {/* <Modal visible={reportModalVisible} transparent animationType="slide">
// <View style={styles.modalBackdrop}>
// <View style={styles.modalBox}>
// <Text style={styles.modalTitle}>Report User</Text>
// <TextInput
// placeholder="Enter reason..."
// multiline
// value={reportReason}
// onChangeText={setReportReason}
// style={styles.textArea}
// />
// <View style={styles.modalActions}>
// <TouchableOpacity onPress={() => setReportModalVisible(false)} style={styles.cancelBtn}>
// <Text style={{ color: '#fff' }}>Cancel</Text>
// </TouchableOpacity>
// <TouchableOpacity onPress={handleReportUser} style={styles.submitBtn}>
// <Text style={{ color: '#fff' }}>Submit</Text>
// </TouchableOpacity>
// </View>
// </View>
// </View>
// </Modal> */}
            
//         </ScrollView>
//     );
// };

// const InfoRow = ({ label, value }) => (
//     <View style={styles.infoRow}>
//         <Text style={styles.infoLabel}>{label}</Text>
//         <Text style={styles.infoValue}>{value}</Text>
//     </View>
// );

// const styles = StyleSheet.create({
//     container: { backgroundColor: '#fff', flex: 1 },
//     profileHeader: {
//         alignItems: 'center',
//         marginTop: '20%',
//         paddingVertical: 30,
//         backgroundColor: '#f1f3f6',
//     },
//     profileHeaders: {
//         alignItems: 'center',
//         marginTop: '0%',
//         paddingVertical: 20,
//         backgroundColor: '#f1f3f6',
//     },
//     infoRowWrap: {
//   flexDirection: 'row',
//   alignItems: 'flex-start',
//   marginBottom: 10,
// },
//     profilePic: {
//         width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#581845',
//     },
//     fullName: { fontSize: 22, fontWeight: '600', marginTop: 12, color: '#333' },
//     editBtn: {
//         flexDirection: 'row', alignItems: 'center', marginTop: 10,
//         backgroundColor: '#581845', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
//     },
//     blockBtn: {
// flexDirection: 'row',
// alignItems: 'center',
// marginTop: 10,
// paddingHorizontal: 20,
// paddingVertical: 10,
// borderRadius: 25,
// },
//     editBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
//     section: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
//     sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#222' },
//     sectionContent: { fontSize: 14, color: '#555' },
//     infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
//     infoLabel: { color: '#666', fontSize: 14, flex: 1 },
//     infoValue: { color: '#222', fontSize: 14, flex: 1, textAlign: 'right' },
//     galleryImage: { width: 100, height: 100, borderRadius: 8 },
//     profilePhotoLabel: { marginTop: 4, fontSize: 12, color: '#581845', fontWeight: '600' },
//     interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
//     interestPill: {
//         backgroundColor: '#581845', paddingHorizontal: 12, paddingVertical: 6,
//         borderRadius: 15, marginRight: 8, marginBottom: 8,
//     },
//     interestText: { color: '#fff', fontSize: 12 },
//     placeholderText: { fontSize: 14, color: '#aaa', marginTop: 5 },
//       backButton: { marginRight: 10, marginLeft:30, marginVertical:30,  },
//       linkText: {
//   color: '#581845',        // LinkedIn blue
//   textDecorationLine: 'underline',
//   fontSize: 14,
// },

// modalBackdrop: {
// flex: 1,
// backgroundColor: 'rgba(0,0,0,0.5)',
// justifyContent: 'center',
// alignItems: 'center',
// },
// modalBox: {
// width: '85%',
// backgroundColor: '#fff',
// borderRadius: 10,
// padding: 20,
// },
// modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
// textArea: {
// height: 100,
// borderColor: '#ccc',
// borderWidth: 1,
// padding: 10,
// borderRadius: 6,
// textAlignVertical: 'top',
// marginBottom: 15,
// },
// modalActions: {
// flexDirection: 'row',
// justifyContent: 'flex-end',
// },
// cancelBtn: {
// paddingVertical: 10,
// paddingHorizontal: 15,
// backgroundColor: '#6c757d',
// borderRadius: 6,
// marginRight: 10,
// },
// submitBtn: {
// paddingVertical: 10,
// paddingHorizontal: 15,
// backgroundColor: '#581845',
// borderRadius: 6,
// },


// });

// export default UserProfileScreen;





















// // UserProfileScreen.js
// import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
// import {
//     View,
//     Text,
//     StyleSheet,
//     Image,
//     TouchableOpacity,
//     ScrollView,
//     FlatList,
//     ActivityIndicator,
//     Modal,
//     TextInput,
// } from 'react-native';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import Ionicons from 'react-native-vector-icons/Ionicons';
// import moment from 'moment';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import axios from 'axios';
// import { Linking } from 'react-native';



// const BASE_URL = 'http://192.168.100.28:4000';

// const toAbsolute = (p) => (p && typeof p === 'string' && !p.startsWith('http') ? `${BASE_URL}${p}` : p);

// const normalizeUser = (raw) => {
//     if (!raw) return null;
//     const photos = Array.isArray(raw.photos) ? raw.photos.map(toAbsolute) : [];
//     return {
//         ...raw,
//         id: raw?.id || raw?._id,
//         photos,
//     };
// };

// const safeSchoolFromEmail = (email) => {
//     const school =
//         typeof email === 'string'
//             ? email.split?.('@')?.[1]?.split?.('.')?.[0]
//             : '';
//     if (!school) return 'Unknown School';
//     return school
//         .replace(/-/g, ' ')
//         .replace(/\b\w/g, (c) => c.toUpperCase());
// };

// const parseLanguages = (languages) => {
//     try {
//         if (Array.isArray(languages)) return languages.join(', ');
//         if (typeof languages === 'string') return JSON.parse(languages).join(', ');
//         return 'N/A';
//     } catch {
//         return 'N/A';
//     }
// };

// const PlaceholderPhoto = 'https://via.placeholder.com/150';

// const UserProfileScreen = () => {
//     const navigation = useNavigation();
//     const route = useRoute();
//     const initialUser = normalizeUser(route.params?.user) || {};
//     const [user, setUser] = useState(initialUser);
//     const [loading, setLoading] = useState(false);
//     const [isBlocked, setIsBlocked] = useState(false);
// const [reportModalVisible, setReportModalVisible] = useState(false);
// const [reportReason, setReportReason] = useState('');


//      useLayoutEffect(() => {
//     navigation.setOptions({
//       headerShown: true,
//       headerTransparent: false,     // Cleaner look
//       headerTitle: '',
//       headerBackTitle: 'Back',
//       headerBackTitleVisible: true,
//       headerStyle: {
//         backgroundColor: '#ffffff',   // Top bar background
//         borderBottomWidth: 0,
//         elevation: 0,
//         shadowOpacity: 0,
//       },
//       headerTintColor: '#581845',     // Back icon color
//       headerShadowVisible: false,
//     });
//   }, [navigation]);

//     // If we don't have an email (or other important fields), fetch the full profile by id
//     useEffect(() => {
//         const maybeFetch = async () => {
//             if (user?.email || !user?.id) return;
//             try {
//                 setLoading(true);
//                 const token = await AsyncStorage.getItem('token');
//                 const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
//                 const res = await axios.get(`${BASE_URL}/accounts/${user.id}`, { headers });
//                 setUser(normalizeUser(res.data) || user); // keep old if normalize fails
//             } catch (e) {
//                 // keep initial user if fetch fails
//             } finally {
//                 setLoading(false);
//             }
//         };
//         maybeFetch();
//     }, [user?.id]);


//     useEffect(() => {
//   const checkBlockStatus = async () => {
//     try {
//       const token = await AsyncStorage.getItem('token');
//       const res = await axios.get(`${BASE_URL}/blocks/status/${user.id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setIsBlocked(res.data?.isBlocked || false);
//     } catch (error) {
//       console.error('⚠️ Failed to check block status:', error?.response?.data || error.message);
//     }
//   };
//   checkBlockStatus();
// }, [user.id]);

//     const avatar = useMemo(() => {
//         if (user?.photos?.length > 0) return user.photos[0];
//         if (user?.avatarUrl) return toAbsolute(user.avatarUrl);
//         return PlaceholderPhoto;
//     }, [user]);

//     const school = useMemo(() => safeSchoolFromEmail(user?.email), [user?.email]);

//     const goToChat = () => {
//         // Pass the minimal shape your PrivateChat expects
//         // Adjust keys if PrivateChat expects `_id` instead of `id`
//         navigation.navigate('PrivateChat', {
//             user: {
//                 id: user?.id || user?._id,
//                 _id: user?._id || user?.id,
//                 firstName: user?.firstName,
//                 lastName: user?.lastName,
//                 photos: user?.photos || [],
//                 avatarUrl: avatar,
//                 email: user?.email, // helpful if chat header shows domain/school
//             },
//         });
//     };


//     // --- LinkedIn helpers ---
// const parseLinkedIn = (raw) => {
//   if (!raw) return null;
//   const val = String(raw).trim();

//   // If user pasted only a handle, e.g. "john-doe" or "@john-doe"
//   if (!val.includes('linkedin.com')) {
//     const clean = val.replace(/^@/, '').replace(/\/+$/, '');
//     if (!clean) return null;
//     return { type: 'in', slug: clean, webUrl: `https://www.linkedin.com/in/${clean}` };
//   }

//   // Normalize a full URL
//   let url = val;
//   if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
//   try {
//     const u = new URL(url);

//     // Extract the first path segment after /in/ or /company/
//     const path = u.pathname.replace(/^\/+/, ''); // remove leading "/"
//     const parts = path.split('/');
//     const section = parts[0]?.toLowerCase();
//     const slug = parts[1]?.replace(/\/+$/, '');

//     if (section === 'in' && slug) {
//       return { type: 'in', slug, webUrl: `https://www.linkedin.com/in/${slug}` };
//     }
//     if (section === 'company' && slug) {
//       return { type: 'company', slug, webUrl: `https://www.linkedin.com/company/${slug}` };
//     }

//     // If we can’t confidently parse, just use the URL
//     return { type: 'url', slug: null, webUrl: u.toString() };
//   } catch {
//     return null;
//   }
// };

// const getLinkedInAppUrl = ({ type, slug, webUrl }) => {
//   if (type === 'in' && slug) return `linkedin://in/${slug}`;
//   if (type === 'company' && slug) return `linkedin://company/${slug}`;
//   // Fallback: some clients can still handle generic linkedin:// links
//   return `linkedin://` || webUrl;
// };


// const openLinkedIn = async () => {
//   const parsed = parseLinkedIn(user?.linkedIn);
//   if (!parsed) {
//     Alert.alert('No LinkedIn profile', 'LinkedIn link or handle is missing or invalid.');
//     return;
//   }

//   const appUrl = getLinkedInAppUrl(parsed);
//   const webUrl = parsed.webUrl;

//   try {
//     // Try the app first
//     const canOpenApp = await Linking.canOpenURL(appUrl);
//     if (canOpenApp) {
//       await Linking.openURL(appUrl);
//       return;
//     }

//     // Fallback to web
//     const canOpenWeb = await Linking.canOpenURL(webUrl);
//     if (canOpenWeb) {
//       await Linking.openURL(webUrl);
//       return;
//     }

//     Alert.alert('Unable to open', 'Please check your LinkedIn link or open it manually.');
//   } catch (e) {
//     console.log('Error opening LinkedIn:', e);
//     Alert.alert('Unable to open', 'Please check your LinkedIn link or open it manually.');
//   }
// };


// const handleReportUser = async () => {
// if (!reportReason.trim()) return alert('Please enter a reason.');
// try {
// const token = await AsyncStorage.getItem('token');
// await axios.post(
// `${BASE_URL}/reports`,
// { reportedUser: user.id, reason: reportReason },
// { headers: { Authorization: `Bearer ${token}` } }
// );
// setReportReason('');
// setReportModalVisible(false);
// alert('User has been reported. Thank you.');
// } catch (error) {
// console.error('❌ Report failed:', error?.response?.data || error.message);
// alert('Unable to report user.');
// }
// };

// const handleBlockUser = async () => {
//   try {
//     const token = await AsyncStorage.getItem('token');
//     const res = await axios.post(`${BASE_URL}/blocks`, {
//       blocked: user.id
//     }, {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     const message = res?.data?.message || '';
//     if (message.includes('unblocked')) {
//       alert('User has been unblocked.');
//       setIsBlocked(false); // 🟢 update UI
//     } else if (message.includes('blocked')) {
//       alert('User has been blocked.');
//       setIsBlocked(true); // 🔴 update UI
//     } else {
//       alert('Action completed.');
//     }

//   } catch (error) {
//     console.error('❌ Block/Unblock failed:', error?.response?.data || error.message);
//     alert('Unable to toggle block status. Try again later.');
//   }
// };


//     return (
//         <ScrollView style={styles.container}>
//             {/* <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//                           <Ionicons name="arrow-back" size={24} color="#000" />
//                         </TouchableOpacity> */}
//             {/* Profile Header */}
//             <View style={styles.profileHeader}>
                
//                 <Image source={{ uri: avatar }} style={styles.profilePic} />
//                 <Text style={styles.fullName}>
//                     {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Unknown User'}
//                 </Text>

//                 <TouchableOpacity style={styles.editBtn} onPress={goToChat}>
//                     <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
//                     <Text style={styles.editBtnText}> Chat</Text>
//                 </TouchableOpacity>

//             </View>

//             {loading && (
//                 <View style={{ paddingVertical: 12, alignItems: 'center' }}>
//                     <ActivityIndicator size="small" color="#581845" />
//                     <Text style={{ marginTop: 6, color: '#666' }}>Fetching full profile…</Text>
//                 </View>
//             )}

//             {/* Photo Gallery */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Gallery</Text>
//                 {user?.photos && user.photos.length > 0 ? (
//                     <FlatList
//                         data={user.photos}
//                         horizontal
//                         keyExtractor={(_, index) => String(index)}
//                         renderItem={({ item, index }) => (
//                             <View style={{ alignItems: 'center', marginRight: 12 }}>
//                                 <Image source={{ uri: item }} style={styles.galleryImage} />
//                                 {index === 0 && <Text style={styles.profilePhotoLabel}>Profile Photo</Text>}
//                             </View>
//                         )}
//                     />
//                 ) : (
//                     <Text style={styles.placeholderText}>No photos uploaded yet.</Text>
//                 )}
//             </View>

//             {/* Basic Information */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Basic Information</Text>
//                 <InfoRow label="Nickname" value={user?.nickname || 'N/A'} />
//                 <InfoRow label="Gender" value={user?.gender || 'N/A'} />
//                 <InfoRow label="Date of Birth" value={user?.DOB?.slice?.(0, 10) || 'N/A'} />
//                 <InfoRow label="Languages Spoken" value={parseLanguages(user?.languages)} />
//                 <InfoRow label="Origin" value={user?.origin || 'N/A'} />
//             </View>

//             {/* Academic Info */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Academic Details</Text>
//                 <InfoRow label="University" value={school} />
//                 <InfoRow label="Program of Study" value={user?.fieldOfStudy || 'N/A'} />
//                 <InfoRow label="Field of Study" value={user?.type || 'N/A'} />
//                 <InfoRow label="Graduation Year" value={user?.graduationYear || 'N/A'} />
//             </View>

//             {/* Professional Info */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Professional Information</Text>
//                 <InfoRow label="Industry" value={user?.industry || 'N/A'} />
//                 <InfoRow label="Current Role" value={user?.currentRole || 'N/A'} />
//                 {/* <InfoRow label="LinkedIn" value={user?.linkedIn || 'N/A'} /> */}
//                  <View style={styles.infoRowWrap}>
//  <Text style={styles.infoLabel}>LinkedIn</Text>
// {user.linkedIn ? (
//   <TouchableOpacity onPress={openLinkedIn} style={{ flex: 1 }}>
//     <Text style={styles.linkText} numberOfLines={0}>
//       {user.linkedIn}
//     </Text>
//   </TouchableOpacity>
// ) : (
//   <Text style={styles.infoValue}>Not provided</Text>
// )}

//             </View>
// </View>
//             {/* Bio and Interests */}
//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Bio</Text>
//                 <Text style={styles.sectionContent}>{user?.bio || 'No bio available.'}</Text>
//             </View>

//             <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Interests</Text>
//                 {user?.interests && user.interests.length > 0 ? (
//                     <View style={styles.interestsContainer}>
//                         {user.interests.map((interest, index) => (
//                             <View key={index} style={styles.interestPill}>
//                                 <Text style={styles.interestText}>{interest}</Text>
//                             </View>
//                         ))}
//                     </View>
//                 ) : (
//                     <Text style={styles.placeholderText}>No interests added yet.</Text>
//                 )}
//             </View>

//             {/* Other Info */}
//             <View style={styles.section}>
//                 <InfoRow label="Fun Fact" value={user?.funFact || 'N/A'} />
//                 <InfoRow label="Relationship Status" value={user?.rship || 'N/A'} />
//                 <InfoRow label="Joined" value={user?.created ? moment(user.created).format('LL') : 'N/A'} />

 
//             </View>

//             <View style={styles.profileHeaders}>
// <TouchableOpacity
// style={[styles.blockBtn, { backgroundColor: '#dc3545' }]}
// onPress={() => setReportModalVisible(true)}
// >
// <Ionicons name="alert-circle-outline" size={20} color="#fff" />
// <Text style={styles.editBtnText}> Report User</Text>
// </TouchableOpacity>


// <TouchableOpacity
// style={[styles.blockBtn, { backgroundColor: isBlocked ? '#28a745' : '#6c757d' }]}
// onPress={handleBlockUser }
// >
// <Ionicons name="ban-outline" size={20} color="#fff" />
// <Text style={styles.editBtnText}> {isBlocked ? 'Unblock User' : 'Block User'} </Text>
// </TouchableOpacity>
// </View>


// {/* Report Modal */}
// <Modal visible={reportModalVisible} transparent animationType="slide">
// <View style={styles.modalBackdrop}>
// <View style={styles.modalBox}>
// <Text style={styles.modalTitle}>Report User</Text>
// <TextInput
// placeholder="Enter reason..."
// multiline
// value={reportReason}
// onChangeText={setReportReason}
// style={styles.textArea}
// />
// <View style={styles.modalActions}>
// <TouchableOpacity onPress={() => setReportModalVisible(false)} style={styles.cancelBtn}>
// <Text style={{ color: '#fff' }}>Cancel</Text>
// </TouchableOpacity>
// <TouchableOpacity onPress={handleReportUser} style={styles.submitBtn}>
// <Text style={{ color: '#fff' }}>Submit</Text>
// </TouchableOpacity>
// </View>
// </View>
// </View>
// </Modal>
            
//         </ScrollView>
//     );
// };

// const InfoRow = ({ label, value }) => (
//     <View style={styles.infoRow}>
//         <Text style={styles.infoLabel}>{label}</Text>
//         <Text style={styles.infoValue}>{value}</Text>
//     </View>
// );

// const styles = StyleSheet.create({
//     container: { backgroundColor: '#fff', flex: 1 },
//     profileHeader: {
//         alignItems: 'center',
//         marginTop: '20%',
//         paddingVertical: 30,
//         backgroundColor: '#f1f3f6',
//     },
//     profileHeaders: {
//         alignItems: 'center',
//         marginTop: '0%',
//         paddingVertical: 20,
//         backgroundColor: '#f1f3f6',
//     },
//     infoRowWrap: {
//   flexDirection: 'row',
//   alignItems: 'flex-start',
//   marginBottom: 10,
// },
//     profilePic: {
//         width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#581845',
//     },
//     fullName: { fontSize: 22, fontWeight: '600', marginTop: 12, color: '#333' },
//     editBtn: {
//         flexDirection: 'row', alignItems: 'center', marginTop: 10,
//         backgroundColor: '#581845', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
//     },
//     blockBtn: {
// flexDirection: 'row',
// alignItems: 'center',
// marginTop: 10,
// paddingHorizontal: 20,
// paddingVertical: 10,
// borderRadius: 25,
// },
//     editBtnText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
//     section: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
//     sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#222' },
//     sectionContent: { fontSize: 14, color: '#555' },
//     infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
//     infoLabel: { color: '#666', fontSize: 14, flex: 1 },
//     infoValue: { color: '#222', fontSize: 14, flex: 1, textAlign: 'right' },
//     galleryImage: { width: 100, height: 100, borderRadius: 8 },
//     profilePhotoLabel: { marginTop: 4, fontSize: 12, color: '#581845', fontWeight: '600' },
//     interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
//     interestPill: {
//         backgroundColor: '#581845', paddingHorizontal: 12, paddingVertical: 6,
//         borderRadius: 15, marginRight: 8, marginBottom: 8,
//     },
//     interestText: { color: '#fff', fontSize: 12 },
//     placeholderText: { fontSize: 14, color: '#aaa', marginTop: 5 },
//       backButton: { marginRight: 10, marginLeft:30, marginVertical:30,  },
//       linkText: {
//   color: '#581845',        // LinkedIn blue
//   textDecorationLine: 'underline',
//   fontSize: 14,
// },

// modalBackdrop: {
// flex: 1,
// backgroundColor: 'rgba(0,0,0,0.5)',
// justifyContent: 'center',
// alignItems: 'center',
// },
// modalBox: {
// width: '85%',
// backgroundColor: '#fff',
// borderRadius: 10,
// padding: 20,
// },
// modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
// textArea: {
// height: 100,
// borderColor: '#ccc',
// borderWidth: 1,
// padding: 10,
// borderRadius: 6,
// textAlignVertical: 'top',
// marginBottom: 15,
// },
// modalActions: {
// flexDirection: 'row',
// justifyContent: 'flex-end',
// },
// cancelBtn: {
// paddingVertical: 10,
// paddingHorizontal: 15,
// backgroundColor: '#6c757d',
// borderRadius: 6,
// marginRight: 10,
// },
// submitBtn: {
// paddingVertical: 10,
// paddingHorizontal: 15,
// backgroundColor: '#581845',
// borderRadius: 6,
// },


// });

// export default UserProfileScreen;
