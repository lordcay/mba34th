// /**
//  * OnboardingScreen.js
//  * 
//  * Modern, premium onboarding with African diaspora imagery.
//  * Features: Beautiful backgrounds, smooth transitions, brand theming.
//  */

// import React, { useRef, useState, useCallback } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Dimensions,
//   FlatList,
//   TouchableOpacity,
//   Animated,
//   Platform,
//   StatusBar,
//   ImageBackground,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { BlurView } from 'expo-blur';
// import { Ionicons } from '@expo/vector-icons';

// const { width, height } = Dimensions.get('window');

// // Brand Colors
// const BRAND_PRIMARY = '#581845';
// const BRAND_SECONDARY = '#900C3F';
// const BRAND_ACCENT = '#C70039';

// // Onboarding slides data with African imagery
// const SLIDES = [
//   {
//     id: '1',
//     title: 'It starts here.',
//     titleHighlight: '34th Street',
//     subtitle: 'A continent full of brilliance, now mapped across the world. Join the global network where Africans connect, grow, and shine.',
//     image: require('../assets/yy.jpg'),
//     icon: 'globe-outline',
//   },
//   {
//     id: '2',
//     title: 'Rooted. Resilient.',
//     titleHighlight: 'Rising.',
//     subtitle: 'Build lasting connections with fellow dreamers, thinkers, and leaders from top schools around the globe.',
//     image: require('../assets/jjjjjj.jpg'),
//     icon: 'people-outline',
//   },
//   {
//     id: '3',
//     title: 'Journey',
//     titleHighlight: 'Together.',
//     subtitle: 'From solo hustles to shared paths. Join live Rooms, swap stories, and find real support on every step of the journey.',
//     image: require('../assets/j.jpg'),
//     icon: 'chatbubbles-outline',
//   },
//   {
//     id: '4',
//     title: 'You have',
//     titleHighlight: 'Arrived!',
//     subtitle: 'This is your street. Your people. Your future circle. Tap in, let\'s build greatness.',
//     image: require('../assets/kkk.jpg'),
//     icon: 'heart-outline',
//     isLast: true,
//   },
// ];

// // Simple dot indicator (no animated width - fixes the error)
// const DotIndicator = ({ isActive }) => (
//   <View
//     style={[
//       styles.dot,
//       isActive ? styles.dotActive : styles.dotInactive,
//     ]}
//   />
// );

// // Individual slide component
// const OnboardingSlide = ({ item, index, scrollX }) => {
//   const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  
//   // Parallax effect for content (using only supported properties)
//   const translateY = scrollX.interpolate({
//     inputRange,
//     outputRange: [80, 0, -80],
//     extrapolate: 'clamp',
//   });

//   const opacity = scrollX.interpolate({
//     inputRange,
//     outputRange: [0, 1, 0],
//     extrapolate: 'clamp',
//   });

//   const scale = scrollX.interpolate({
//     inputRange,
//     outputRange: [0.9, 1, 0.9],
//     extrapolate: 'clamp',
//   });

//   return (
//     <View style={styles.slide}>
//       {/* Background Image */}
//       <ImageBackground
//         source={item.image}
//         style={styles.backgroundImage}
//         resizeMode="cover"
//       >
//         {/* Gradient Overlay for readability */}
//         <LinearGradient
//           colors={['rgba(0,0,0,0.15)', 'rgba(88,24,69,0.65)', 'rgba(88,24,69,0.92)']}
//           style={styles.gradientOverlay}
//           locations={[0, 0.45, 1]}
//         />
        
//         {/* Decorative elements */}
//         <View style={styles.decorCircle1} />
//         <View style={styles.decorCircle2} />

//         {/* Content */}
//         <Animated.View 
//           style={[
//             styles.contentContainer,
//             {
//               transform: [{ translateY }, { scale }],
//               opacity,
//             }
//           ]}
//         >
//           {/* Title */}
//           <View style={styles.titleContainer}>
//             <Text style={styles.title}>{item.title}</Text>
//             <Text style={styles.titleHighlight}>{item.titleHighlight}</Text>
//           </View>

//           {/* Subtitle */}
//           <Text style={styles.subtitle}>{item.subtitle}</Text>
//         </Animated.View>
//       </ImageBackground>
//     </View>
//   );
// };

// // Main Onboarding Screen
// const OnboardingScreen = ({ navigation }) => {
//   const insets = useSafeAreaInsets();
//   const flatListRef = useRef(null);
//   const scrollX = useRef(new Animated.Value(0)).current;
//   const [currentIndex, setCurrentIndex] = useState(0);

//   // Handle viewable items change
//   const onViewableItemsChanged = useCallback(({ viewableItems }) => {
//     if (viewableItems.length > 0) {
//       setCurrentIndex(viewableItems[0].index || 0);
//     }
//   }, []);

//   const viewabilityConfig = useRef({
//     itemVisiblePercentThreshold: 50,
//   }).current;

//   // Navigate to next slide
//   const goToNextSlide = () => {
//     if (currentIndex < SLIDES.length - 1) {
//       flatListRef.current?.scrollToIndex({
//         index: currentIndex + 1,
//         animated: true,
//       });
//     } else {
//       navigation.replace('Login');
//     }
//   };

//   // Skip onboarding
//   const skipOnboarding = () => {
//     navigation.replace('Login');
//   };

//   const isLastSlide = currentIndex === SLIDES.length - 1;

//   return (
//     <View style={styles.container}>
//       <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
//       {/* Slides */}
//       <Animated.FlatList
//         ref={flatListRef}
//         data={SLIDES}
//         keyExtractor={(item) => item.id}
//         horizontal
//         pagingEnabled
//         showsHorizontalScrollIndicator={false}
//         bounces={false}
//         onScroll={Animated.event(
//           [{ nativeEvent: { contentOffset: { x: scrollX } } }],
//           { useNativeDriver: true }
//         )}
//         scrollEventThrottle={16}
//         onViewableItemsChanged={onViewableItemsChanged}
//         viewabilityConfig={viewabilityConfig}
//         renderItem={({ item, index }) => (
//           <OnboardingSlide item={item} index={index} scrollX={scrollX} />
//         )}
//       />

//       {/* Bottom controls */}
//       <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
//         {Platform.OS === 'ios' ? (
//           <BlurView intensity={60} tint="dark" style={styles.blurContainer}>
//             <BottomControls
//               currentIndex={currentIndex}
//               isLastSlide={isLastSlide}
//               onNext={goToNextSlide}
//               onSkip={skipOnboarding}
//             />
//           </BlurView>
//         ) : (
//           <View style={[styles.blurContainer, styles.androidBlur]}>
//             <BottomControls
//               currentIndex={currentIndex}
//               isLastSlide={isLastSlide}
//               onNext={goToNextSlide}
//               onSkip={skipOnboarding}
//             />
//           </View>
//         )}
//       </View>
//     </View>
//   );
// };

// // Bottom controls component
// const BottomControls = ({ currentIndex, isLastSlide, onNext, onSkip }) => (
//   <View style={styles.controlsContent}>
//     {/* Dot indicators */}
//     <View style={styles.dotsContainer}>
//       {SLIDES.map((_, index) => (
//         <DotIndicator key={index} isActive={index === currentIndex} />
//       ))}
//     </View>

//     {/* Buttons */}
//     <View style={styles.buttonsContainer}>
//       {!isLastSlide && (
//         <TouchableOpacity 
//           style={styles.skipButton} 
//           onPress={onSkip}
//           activeOpacity={0.7}
//         >
//           <Text style={styles.skipText}>Skip</Text>
//         </TouchableOpacity>
//       )}

//       <TouchableOpacity 
//         style={[
//           styles.nextButton,
//           isLastSlide && styles.getStartedButton
//         ]} 
//         onPress={onNext}
//         activeOpacity={0.8}
//       >
//         <LinearGradient
//           colors={isLastSlide ? [BRAND_ACCENT, BRAND_PRIMARY] : ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
//           style={styles.buttonGradient}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 0 }}
//         >
//           <Text style={[styles.nextText, isLastSlide && styles.getStartedText]}>
//             {isLastSlide ? "Let's Go!" : 'Next'}
//           </Text>
//           <Ionicons 
//             name={isLastSlide ? "arrow-forward" : "chevron-forward"} 
//             size={20} 
//             color="#fff" 
//             style={{ marginLeft: 8 }}
//           />
//         </LinearGradient>
//       </TouchableOpacity>
//     </View>
//   </View>
// );

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: BRAND_PRIMARY,
//   },
//   slide: {
//     width,
//     height,
//   },
//   backgroundImage: {
//     flex: 1,
//     width: '100%',
//     height: '100%',
//   },
//   gradientOverlay: {
//     ...StyleSheet.absoluteFillObject,
//   },

//   // Decorative elements
//   decorCircle1: {
//     position: 'absolute',
//     width: 200,
//     height: 200,
//     borderRadius: 100,
//     backgroundColor: 'rgba(255,255,255,0.05)',
//     top: 60,
//     right: -60,
//   },
//   decorCircle2: {
//     position: 'absolute',
//     width: 150,
//     height: 150,
//     borderRadius: 75,
//     backgroundColor: 'rgba(255,255,255,0.03)',
//     top: height * 0.35,
//     left: -50,
//   },

//   // Content - positioned at bottom above controls
//   contentContainer: {
//     flex: 1,
//     justifyContent: 'flex-end',
//     alignItems: 'center',
//     paddingHorizontal: 28,
//     paddingBottom: 260,
//   },
//   titleContainer: {
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '400',
//     color: 'rgba(255,255,255,0.85)',
//     letterSpacing: 1.5,
//     textTransform: 'uppercase',
//     textAlign: 'center',
//   },
//   titleHighlight: {
//     fontSize: 42,
//     fontWeight: '800',
//     color: '#fff',
//     textAlign: 'center',
//     marginTop: 6,
//     letterSpacing: -0.5,
//     textShadowColor: 'rgba(0,0,0,0.3)',
//     textShadowOffset: { width: 0, height: 2 },
//     textShadowRadius: 4,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.85)',
//     textAlign: 'center',
//     lineHeight: 24,
//     paddingHorizontal: 8,
//   },

//   // Bottom container
//   bottomContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//   },
//   blurContainer: {
//     marginHorizontal: 16,
//     borderRadius: 24,
//     overflow: 'hidden',
//   },
//   androidBlur: {
//     backgroundColor: 'rgba(20,10,15,0.85)',
//   },
//   controlsContent: {
//     paddingHorizontal: 20,
//     paddingVertical: 24,
//   },

//   // Dots (no animation - fixes the error)
//   dotsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   dot: {
//     height: 10,
//     borderRadius: 5,
//     marginHorizontal: 6,
//   },
//   dotActive: {
//     width: 32,
//     backgroundColor: '#fff',
//     shadowColor: '#fff',
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.5,
//     shadowRadius: 6,
//     elevation: 4,
//   },
//   dotInactive: {
//     width: 10,
//     backgroundColor: 'rgba(255,255,255,0.35)',
//   },

//   // Buttons
//   buttonsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   skipButton: {
//     paddingVertical: 14,
//     paddingHorizontal: 20,
//   },
//   skipText: {
//     fontSize: 16,
//     color: 'rgba(255,255,255,0.75)',
//     fontWeight: '500',
//   },
//   nextButton: {
//     flex: 1,
//     marginLeft: 12,
//     borderRadius: 14,
//     overflow: 'hidden',
//   },
//   getStartedButton: {
//     marginLeft: 0,
//   },
//   buttonGradient: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 16,
//     paddingHorizontal: 24,
//     borderRadius: 14,
//   },
//   nextText: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '600',
//   },
//   getStartedText: {
//     fontSize: 18,
//     fontWeight: '700',
//   },
// });

// export default OnboardingScreen;






import React from 'react';
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
  const handleComplete = () => {
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
});

export default OnboardingScreen;

