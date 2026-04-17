import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';
import { getMyConnections } from '../services/connection.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCREEN_HEIGHT = Dimensions.get('screen').height; // Use screen height to include nav bars
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

// Get Android status bar height for full screen coverage
const ANDROID_STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

// Subtle accent color
const ACCENT_PURPLE = '#7b2d62';

// Modern dark transparent palette
const DARK_BASE = 'rgba(8, 8, 12, 0.97)';
const DARK_MID = 'rgba(18, 18, 24, 0.95)';
const DARK_SUBTLE = 'rgba(28, 26, 32, 0.92)';
const PURPLE_HINT = 'rgba(88, 24, 69, 0.15)';
const WHITE_GLOW = 'rgba(255, 255, 255, 0.03)';

const FallbackImage = require('../assets/fff.jpg');
import { API_BASE_URL } from '../config';

const DrawerContent = ({ onClose, navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { state: unreadState } = useUnread();
  const insets = useSafeAreaInsets();
  
  // DM unread count for badge
  const dmUnreadCount = Object.values(unreadState?.dmByUserId || {}).reduce((a, b) => a + b, 0);
  
  // Connections state — cache-first to avoid "0" flash
  const [connectionsCount, setConnectionsCount] = useState(null);
  
  useEffect(() => {
    let cancelled = false;

    // 1. Load cached count instantly
    AsyncStorage.getItem('drawer_connections_count')
      .then(cached => {
        if (!cancelled && cached !== null) setConnectionsCount(Number(cached));
      })
      .catch(() => {});

    // 2. Fetch fresh count from API
    const fetchConnectionsCount = async () => {
      try {
        const connectionsData = await getMyConnections();
        const connectionsList = Array.isArray(connectionsData) 
          ? connectionsData 
          : connectionsData?.connections || [];
        const count = connectionsList.length;
        if (!cancelled) {
          setConnectionsCount(count);
          AsyncStorage.setItem('drawer_connections_count', String(count)).catch(() => {});
        }
      } catch (error) {
        console.log('Error fetching connections:', error);
        if (!cancelled && connectionsCount === null) setConnectionsCount(0);
      }
    };
    
    fetchConnectionsCount();
    return () => { cancelled = true; };
  }, []);

  // Extract user info
  const firstName = user?.firstName || 'User';
  const lastName = user?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const isVerified = user?.isVerified || user?.verified || false;
  
  // Bio/profession from user fields
  const profession = user?.program || user?.profession || user?.industry || '';
  const school = user?.email?.split('@')[1]?.split('.')[0] || '';
  const formattedSchool = school
    ? school.replace(/[-_]/g, ' ').trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    : '';
  
  // Safely normalize location - handle both string and object (GeoJSON) formats
  const normalizeLocation = (loc) => {
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object') {
      if (loc.coordinates && loc.type) {
        const coords = Array.isArray(loc.coordinates) ? loc.coordinates.join(', ') : String(loc.coordinates);
        return `Location: ${coords}`;
      }
      if (loc.city) return loc.city;
      if (loc.name) return loc.name;
      return '';
    }
    return String(loc);
  };
  
  const country = user?.currentCity || user?.country || normalizeLocation(user?.location) || '';

  // Profile image
  const userProfileImage = user?.photos?.[0]
    ? (user.photos[0].startsWith('http')
        ? user.photos[0]
        : `${API_BASE_URL}${user.photos[0]}`)
    : null;

  const handleLogout = () => {
    onClose();
    logout();
  };

  const navigateTo = (screen, params = {}) => {
    onClose();
    navigation.navigate(screen, params);
  };

  const MenuItem = ({ icon, iconType = 'ionicon', label, onPress, rightContent, badge }) => {
    const IconComponent = iconType === 'material' ? MaterialCommunityIcons : 
                         iconType === 'feather' ? Feather : Ionicons;
    
    return (
      <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        {/* Subtle Icon Container */}
        <View style={styles.menuIconOuter}>
          <LinearGradient
            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.menuIconGradient}
          >
            <IconComponent name={icon} size={20} color="rgba(255,255,255,0.85)" style={styles.icon3D} />
          </LinearGradient>
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
        {badge > 0 && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
        {rightContent}
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.25)" />
      </TouchableOpacity>
    );
  };

  // Calculate proper top padding for both platforms
  const topPadding = Platform.OS === 'android' 
    ? ANDROID_STATUSBAR_HEIGHT + 12 
    : insets.top + 8;

  return (
    <View style={styles.drawerWrapper}>
      {/* Base dark layer - deep charcoal */}
      <LinearGradient
        colors={[
          DARK_BASE,
          DARK_MID,
          DARK_SUBTLE,
          DARK_MID,
          DARK_BASE,
        ]}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.15, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Very subtle purple hint at top corner */}
      <LinearGradient
        colors={[
          PURPLE_HINT,
          'rgba(88, 24, 69, 0.05)',
          'transparent',
        ]}
        locations={[0, 0.3, 0.6]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 0.4 }}
        style={styles.purpleHint}
      />
      
      {/* Subtle white shimmer for glass effect */}
      <LinearGradient
        colors={[
          WHITE_GLOW,
          'transparent',
          WHITE_GLOW,
          'transparent',
        ]}
        locations={[0, 0.3, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Subtle bottom purple accent */}
      <LinearGradient
        colors={[
          'transparent',
          'rgba(88, 24, 69, 0.08)',
        ]}
        start={{ x: 0, y: 0.7 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Edge glow for depth */}
      <View style={styles.edgeGlow} />
      
      {/* Main content container */}
      <View style={[styles.container, { paddingTop: topPadding }]}>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={() => navigateTo('Profile')}
          activeOpacity={0.8}
        >
          <View style={styles.profileImageWrapper}>
            <Image
              source={userProfileImage ? { uri: userProfileImage } : FallbackImage}
              style={styles.profileImage}
            />
            {/* Online indicator */}
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.nameRow}>
            <Text style={styles.profileName} numberOfLines={1}>{fullName}</Text>
            {isVerified && (
              <View style={styles.verifiedBadgeWrapper}>
                <Ionicons name="checkmark-circle" size={20} color="#a78bba" />
              </View>
            )}
          </View>
          
          {profession ? (
            <Text style={styles.professionText} numberOfLines={2}>{profession}</Text>
          ) : null}
          
          {country ? (
            <Text style={styles.locationText}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.5)" /> {country}
            </Text>
          ) : null}
          
          {formattedSchool ? (
            <View style={styles.schoolRow}>
              <View style={styles.schoolBadge}>
                <Ionicons name="school" size={12} color="rgba(167,139,186,0.9)" />
              </View>
              <Text style={styles.schoolText} numberOfLines={1}>{formattedSchool}</Text>
              {/* Connections count inline - clickable */}
              <Text style={styles.connectionsDot}>•</Text>
              <TouchableOpacity 
                onPress={() => navigateTo('ConnectionsScreen')}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 5, right: 10 }}
              >
                {connectionsCount === null ? (
                  <View style={styles.connectionsShimmer} />
                ) : (
                  <Text style={styles.connectionsInline}>
                    {connectionsCount} {connectionsCount === 1 ? 'connection' : 'connections'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Show connections even without school - clickable
            <TouchableOpacity 
              style={styles.connectionsOnlyRow}
              onPress={() => navigateTo('ConnectionsScreen')}
              activeOpacity={0.7}
            >
              <Ionicons name="people" size={12} color="rgba(167,139,186,0.8)" style={{ marginRight: 4 }} />
              {connectionsCount === null ? (
                <View style={styles.connectionsShimmer} />
              ) : (
                <Text style={styles.connectionsInline}>
                  {connectionsCount} {connectionsCount === 1 ? 'connection' : 'connections'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="chatbubble-ellipses-outline"
            label="Messages"
            badge={dmUnreadCount}
            onPress={() => navigateTo('Chat')}
          />
          
          <MenuItem
            icon="chatbubbles-outline"
            label="Chat Rooms"
            onPress={() => navigateTo('ChatRoomsListScreen')}
          />
          
          <MenuItem
            icon="people-outline"
            label="Connections"
            onPress={() => navigateTo('ConnectionsScreen')}
          />
          
          <MenuItem
            icon="calendar-outline"
            label="Events"
            onPress={() => navigateTo('Events')}
          />
          
          <MenuItem
            icon="briefcase-outline"
            label="Services"
            onPress={() => navigateTo('Services')}
          />

          <MenuItem
            icon="person-outline"
            label="My Profile"
            onPress={() => navigateTo('Profile')}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Settings & Logout */}
        <View style={styles.bottomSection}>
          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => navigateTo('EditProfile')}
          />
          
          <TouchableOpacity style={styles.logoutItem} onPress={handleLogout} activeOpacity={0.7}>
            <View style={styles.logoutIconOuter}>
              <LinearGradient
                colors={['rgba(255,100,100,0.15)', 'rgba(255,80,80,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.menuIconGradient}
              >
                <Ionicons name="log-out-outline" size={20} color="#ff7b7b" style={styles.icon3D} />
              </LinearGradient>
            </View>
            <Text style={styles.logoutLabel}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

        {/* Premium Button */}
        <View style={[styles.premiumSection, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
          <TouchableOpacity style={styles.premiumButton} activeOpacity={0.8}>
            <LinearGradient
              colors={['rgba(88,24,69,0.5)', 'rgba(123,45,98,0.4)', 'rgba(88,24,69,0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.premiumGradient}
            >
              <View style={styles.premiumStarWrapper}>
                <Ionicons name="star" size={18} color="#e8c547" style={styles.icon3D} />
              </View>
              <Text style={styles.premiumText}>Try Premium for free</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default DrawerContent;

const styles = StyleSheet.create({
  drawerWrapper: {
    width: DRAWER_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
    // Deep shadow for 3D depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 30,
      },
    }),
  },
  container: {
    flex: 1,
    width: DRAWER_WIDTH,
  },
  accentOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  purpleHint: {
    ...StyleSheet.absoluteFillObject,
  },
  edgeGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Profile Section
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 16,
    // Subtle lift effect
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(30,30,35,0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CD964',
    borderWidth: 3,
    borderColor: 'rgba(8,8,12,0.95)',
    // Subtle glow
    ...Platform.select({
      ios: {
        shadowColor: '#4CD964',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
      },
    }),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flexShrink: 1,
    // Subtle text shadow
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  verifiedBadgeWrapper: {
    marginLeft: 8,
    backgroundColor: 'rgba(167,139,186,0.15)',
    borderRadius: 12,
    padding: 2,
  },
  professionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    lineHeight: 20,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  schoolBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  schoolText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    flexShrink: 1,
  },
  // Inline connections - shown next to school
  connectionsDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 8,
  },
  connectionsInline: {
    fontSize: 13,
    color: 'rgba(167,139,186,0.9)',
    fontWeight: '500',
  },
  connectionsShimmer: {
    width: 90,
    height: 13,
    borderRadius: 4,
    backgroundColor: 'rgba(167,139,186,0.15)',
  },
  connectionsOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  // Menu Section
  menuSection: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  // Subtle Icon Container
  menuIconOuter: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 14,
    // Subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  menuIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  icon3D: {
    // Subtle icon effect
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
    letterSpacing: 0.2,
  },
  menuBadge: {
    backgroundColor: ACCENT_PURPLE,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom Section
  bottomSection: {
    paddingVertical: 8,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  logoutIconOuter: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoutLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ff7b7b',
    flex: 1,
    letterSpacing: 0.2,
  },

  // Subtle divider
  divider: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Premium Section
  premiumSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  premiumButton: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(88,24,69,0.3)',
    // Subtle lift
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  premiumStarWrapper: {
    marginRight: 10,
  },
  premiumText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.3,
  },
});
