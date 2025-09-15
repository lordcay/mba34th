

// import React from 'react';
// import Onboarding from 'react-native-onboarding-swiper';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ImageBackground,
//   Dimensions,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';

// const { width, height } = Dimensions.get('window');

// const Dots = ({ selected }) => (
//   <View
//     style={{
//       width: selected ? 12 : 6,
//       height: 6,
//       borderRadius: 3,
//       marginHorizontal: 4,
//       backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.5)',
//     }}
//   />
// );

// const Skip = ({ ...props }) => (
//   <TouchableOpacity style={styles.skipBtn} {...props}>
//     <Text style={styles.skipText}>Skip</Text>
//   </TouchableOpacity>
// );

// const Next = ({ ...props }) => (
//   <TouchableOpacity style={styles.nextBtn} {...props}>
//     <Text style={styles.nextText}>Next</Text>
//   </TouchableOpacity>
// );

// const Done = ({ ...props }) => (
//   <TouchableOpacity style={styles.doneBtn} {...props}>
//     <Text style={styles.doneText}>Done</Text>
//   </TouchableOpacity>
// );

// const OnboardingScreen = ({ navigation }) => {
//   const pages = [
//     {
//       backgroundImage: require('../assets/yy.jpg'),
//       title: 'It starts here.',
//       subtitle: 'A continent full of brilliance, now mapped across the world. Join the global network where Africans connect, grow, and shine.',
//     },
//     {
//       backgroundImage: require('../assets/jjjjjj.jpg'),
//       title: 'Rooted. Resilient. Rising.',
//       subtitle: 'Build lasting connections with fellow dreamers, thinkers, and leaders from top schools around the globe.',
//     },
//     {
//       backgroundImage: require('../assets/j.jpg'),
//       title: 'Journey together.',
//       subtitle: 'From solo hustles to shared paths. Join live Rooms, swap stories, and find real support on every step of the journey.',
//     },
//     {
//       backgroundImage: require('../assets/kkk.jpg'),
//       title: 'You have arrived!',
//       subtitle: 'This is your street. Your people. Your future circle. Tap in, Let’s build greatness.',
//     },
//   ];

//   return (
//     <Onboarding
//       SkipButtonComponent={Skip}
//       NextButtonComponent={Next}
//       DoneButtonComponent={Done}
//       DotComponent={Dots}
//       onSkip={() => navigation.replace('Login')}
//       onDone={() => navigation.navigate('Login')}
//       bottomBarHighlight={false}
//       pages={pages.map(page => ({
//         backgroundColor: '#000',
//         image: (
//           <ImageBackground
//             source={page.backgroundImage}
//             style={styles.backgroundImage}
//             resizeMode="cover"
//           >
//             <View style={styles.overlay} />
//             <Animatable.View
//               animation="fadeInUp"
//               delay={400}
//               duration={800}
//               style={styles.textWrapper}
//             >
//               <Animatable.Text animation="fadeInDown" delay={500} style={styles.title}>
//                 {page.title}
//               </Animatable.Text>
//               <Animatable.Text animation="fadeInUp" delay={700} style={styles.subtitle}>
//                 {page.subtitle}
//               </Animatable.Text>
//             </Animatable.View>
//           </ImageBackground>
//         ),
//         title: '',
//         subtitle: '',
//       }))}
//     />
//   );
// };

// const styles = StyleSheet.create({
//   backgroundImage: {
//     width: width,
//     height: height,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.45)',
//   },
//   textWrapper: {
//     position: 'absolute',
//     bottom: 130,
//     paddingHorizontal: 30,
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#fff',
//     textAlign: 'center',
//     marginBottom: 14,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#ddd',
//     textAlign: 'center',
//     lineHeight: 22,
//   },
//   skipBtn: {
//     marginHorizontal: 20,
//     // marginBottom:40,
//   },
//   skipText: {
//     fontSize: 16,
//     color: '#fff',
//   },
//   nextBtn: {
//     marginHorizontal: 12,
//   },
//   nextText: {
//     fontSize: 16,
//     color: '#fff',
//   },
//   doneBtn: {
//     marginHorizontal: 12,
//   },
//   doneText: {
//     fontSize: 16,
//     color: '#fff',
//   },
// });

// export default OnboardingScreen;





// // OnboardingScreen.js
// import React from 'react';
// import Onboarding from 'react-native-onboarding-swiper';

// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ImageBackground,
//   Dimensions,
//   Platform,
// } from 'react-native';
// import * as Animatable from 'react-native-animatable';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// const { width, height } = Dimensions.get('window');

// const Dots = ({ selected }) => (
//   <View
//     style={[
//       styles.dot,
//       selected ? styles.dotActive : styles.dotInactive
//     ]}
//   />
// );

// const Pill = ({ children, style, ...props }) => (
//   <TouchableOpacity
//     activeOpacity={0.8}
//     style={[styles.pill, style]}
//     hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//     {...props}
//   >
//     <Text style={styles.pillText}>{children}</Text>
//   </TouchableOpacity>
// );

// const Skip = (props) => <Pill style={{ backgroundColor: 'transparent' }} {...props}>Skip</Pill>;
// const Next = (props) => <Pill {...props}>Next</Pill>;
// const Done = (props) => <Pill {...props}>Done</Pill>;

// const OnboardingScreen = ({ navigation }) => {
//   const insets = useSafeAreaInsets();
//   const BOTTOM_GAP = Platform.OS === 'android' ? 28 : 12; // lift above Android nav buttons

//   const pages = [
//     {
//       backgroundImage: require('../assets/yy.jpg'),
//       title: 'It starts here.',
//       subtitle:
//         'A continent full of brilliance, now mapped across the world. Join the global network where Africans connect, grow, and shine.',
//     },
//     {
//       backgroundImage: require('../assets/jjjjjj.jpg'),
//       title: 'Rooted. Resilient. Rising.',
//       subtitle:
//         'Build lasting connections with fellow dreamers, thinkers, and leaders from top schools around the globe.',
//     },
//     {
//       backgroundImage: require('../assets/j.jpg'),
//       title: 'Journey together.',
//       subtitle:
//         'From solo hustles to shared paths. Join live Rooms, swap stories, and find real support on every step of the journey.',
//     },
//     {
//       backgroundImage: require('../assets/kkk.jpg'),
//       title: 'You have arrived!',
//       subtitle:
//         'This is your street. Your people. Your future circle. Tap in, Let’s build greatness.',
//     },
//   ];

//   return (
//     <Onboarding
//       SkipButtonComponent={Skip}
//       NextButtonComponent={Next}
//       DoneButtonComponent={Done}
//       DotComponent={Dots}
//       onSkip={() => navigation.replace('Login')}
//       onDone={() => navigation.navigate('Login')}
//       bottomBarHighlight={false}
//       bottomBarColor="transparent"
//       // ⬇️ This moves the whole bottom bar up on both iOS & Android
//       containerStyles={{
//         paddingBottom: insets.bottom + BOTTOM_GAP,
//         paddingHorizontal: 16,
//       }}
//       pages={pages.map((page) => ({
//         backgroundColor: '#000',
//         image: (
//           <ImageBackground
//             source={page.backgroundImage}
//             style={styles.backgroundImage}
//             resizeMode="cover"
//           >
//             <View style={styles.overlay} />
//             <Animatable.View
//               animation="fadeInUp"
//               delay={400}
//               duration={800}
//               style={styles.textWrapper}
//             >
//               <Animatable.Text animation="fadeInDown" delay={500} style={styles.title}>
//                 {page.title}
//               </Animatable.Text>
//               <Animatable.Text animation="fadeInUp" delay={700} style={styles.subtitle}>
//                 {page.subtitle}
//               </Animatable.Text>
//             </Animatable.View>
//           </ImageBackground>
//         ),
//         title: '',
//         subtitle: '',
//       }))}
//     />
//   );
// };

// const styles = StyleSheet.create({
//   backgroundImage: {
//     width,
//     height,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     // Slightly stronger at the bottom for readability
//     backgroundColor: 'rgba(0,0,0,0.45)',
//   },
//   textWrapper: {
//     position: 'absolute',
//     bottom: 150, // lifted a bit more since we moved the bar up
//     paddingHorizontal: 30,
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#fff',
//     textAlign: 'center',
//     marginBottom: 14,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#ddd',
//     textAlign: 'center',
//     lineHeight: 22,
//   },

//   // Modern pills for actions
//   pill: {
//     backgroundColor: 'rgba(255,255,255,0.14)',
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: 'rgba(255,255,255,0.25)',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//   },
//   pillText: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '600',
//   },

//   // Dots
//   dot: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     marginHorizontal: 4,
//   },
//   dotActive: { backgroundColor: '#fff' },
//   dotInactive: { backgroundColor: 'rgba(255,255,255,0.45)' },
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
      onSkip={() => navigation.replace('Login')}
      onDone={() => navigation.navigate('Login')}
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
