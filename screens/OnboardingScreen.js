




import React, { useContext } from 'react';
import Onboarding from 'react-native-onboarding-swiper';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Platform,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

/* ------------ Tiny UI pieces ------------ */
const Dots = ({ selected }) => (
  <View
    style={{
      width: selected ? 12 : 6,
      height: 6,
      borderRadius: 3,
      marginHorizontal: 4,
      backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.45)',
    }}
  />
);

const ButtonBase = ({ label, style, textStyle, ...props }) => (
  <TouchableOpacity
    style={[styles.barBtn, style]}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    {...props}
  >
    <Text style={[styles.barBtnText, textStyle]}>{label}</Text>
  </TouchableOpacity>
);

const Skip = (props) => <ButtonBase label="Skip" {...props} />;
const Next = (props) => <ButtonBase label="Next" {...props} />;
const Done = (props) => <ButtonBase label="Done" {...props} />;

/* ------------ Screen ------------ */
const OnboardingScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { markOnboardingDone } = useContext(AuthContext);

  const handleComplete = async () => {
    // Persist the "seen" flag via context (which also updates AuthContext state
    // so AppNavigator will route to Login on the next cold launch automatically).
    await markOnboardingDone();
    navigation.replace('Login');
  };

  // Lift the whole bottom control bar up on Android to avoid nav buttons
  const BASE_BAR = 64;
  const ANDROID_NAV_LIFT = 88; // tweak if needed (72–96 range)
  const IOS_EXTRA = 12;

  const bottomBarHeight =
    Platform.OS === 'android'
      ? BASE_BAR + ANDROID_NAV_LIFT
      : BASE_BAR + Math.max(IOS_EXTRA, insets.bottom);

  const pages = [
    {
      backgroundImage: require('../assets/yy.jpg'),
      title: 'It starts here.',
      subtitle:
        'A continent full of brilliance, now mapped across the world. Join the global network where Africans connect, grow, and shine.',
    },
    {
      backgroundImage: require('../assets/jjjjjj.jpg'),
      title: 'Rooted. Resilient. Rising.',
      subtitle:
        'Build lasting connections with fellow dreamers, thinkers, and leaders from top schools around the globe.',
    },
    {
      backgroundImage: require('../assets/j.jpg'),
      title: 'Journey together.',
      subtitle:
        'From solo hustles to shared paths. Join live Rooms, swap stories, and find real support on every step of the journey.',
    },
    {
      backgroundImage: require('../assets/kkk.jpg'),
      title: 'You have arrived!',
      subtitle:
        'This is your street. Your people. Your future circle. Tap in, let’s build greatness.',
    },
  ];

  return (
    <Onboarding
      // Controls
      SkipButtonComponent={Skip}
      NextButtonComponent={Next}
      DoneButtonComponent={Done}
      DotComponent={Dots}
      onSkip={handleComplete}
      onDone={handleComplete}
      bottomBarHighlight={false}
      bottomBarColor="transparent"
      bottomBarHeight={bottomBarHeight}
      containerStyles={{
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'android' ? 8 : insets.bottom + 4,
      }}
      // Pages
      pages={pages.map((page) => ({
        backgroundColor: '#000',
        image: (
          <ImageBackground
            source={page.backgroundImage}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.overlay} />
            <Animatable.View
              animation="fadeInUp"
              delay={400}
              duration={800}
              style={[
                styles.textWrapper,
                { bottom: Platform.OS === 'android' ? 200 : 160 }, // nudged up to balance taller bar
              ]}
            >
              <Animatable.Text animation="fadeInDown" delay={500} style={styles.title}>
                {page.title}
              </Animatable.Text>
              <Animatable.Text animation="fadeInUp" delay={700} style={styles.subtitle}>
                {page.subtitle}
              </Animatable.Text>
            </Animatable.View>
          </ImageBackground>
        ),
        title: '',
        subtitle: '',
      }))}
    />
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  textWrapper: {
    position: 'absolute',
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 16,
    color: '#ddd',
    textAlign: 'center',
    lineHeight: 22,
  },
  barBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  barBtnText: {
    fontSize: 16,
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default OnboardingScreen;

