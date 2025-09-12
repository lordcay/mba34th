

import React from 'react';
import Onboarding from 'react-native-onboarding-swiper';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from 'react-native';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

const Dots = ({ selected }) => (
  <View
    style={{
      width: selected ? 12 : 6,
      height: 6,
      borderRadius: 3,
      marginHorizontal: 4,
      backgroundColor: selected ? '#fff' : 'rgba(255,255,255,0.5)',
    }}
  />
);

const Skip = ({ ...props }) => (
  <TouchableOpacity style={styles.skipBtn} {...props}>
    <Text style={styles.skipText}>Skip</Text>
  </TouchableOpacity>
);

const Next = ({ ...props }) => (
  <TouchableOpacity style={styles.nextBtn} {...props}>
    <Text style={styles.nextText}>Next</Text>
  </TouchableOpacity>
);

const Done = ({ ...props }) => (
  <TouchableOpacity style={styles.doneBtn} {...props}>
    <Text style={styles.doneText}>Done</Text>
  </TouchableOpacity>
);

const OnboardingScreen = ({ navigation }) => {
  const pages = [
    {
      backgroundImage: require('../assets/yy.jpg'),
      title: 'It starts here.',
      subtitle: 'A continent full of brilliance, now mapped across the world. Join the global network where Africans connect, grow, and shine.',
    },
    {
      backgroundImage: require('../assets/jjjjjj.jpg'),
      title: 'Rooted. Resilient. Rising.',
      subtitle: 'Build lasting connections with fellow dreamers, thinkers, and leaders from top schools around the globe.',
    },
    {
      backgroundImage: require('../assets/j.jpg'),
      title: 'Journey together.',
      subtitle: 'From solo hustles to shared paths. Join live Rooms, swap stories, and find real support on every step of the journey.',
    },
    {
      backgroundImage: require('../assets/kkk.jpg'),
      title: 'You have arrived!',
      subtitle: 'This is your street. Your people. Your future circle. Tap in, Let’s build greatness.',
    },
  ];

  return (
    <Onboarding
      SkipButtonComponent={Skip}
      NextButtonComponent={Next}
      DoneButtonComponent={Done}
      DotComponent={Dots}
      onSkip={() => navigation.replace('Login')}
      onDone={() => navigation.navigate('Login')}
      bottomBarHighlight={false}
      pages={pages.map(page => ({
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
              style={styles.textWrapper}
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
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  textWrapper: {
    position: 'absolute',
    bottom: 130,
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
  skipBtn: {
    marginHorizontal: 20,
    // marginBottom:40,
  },
  skipText: {
    fontSize: 16,
    color: '#fff',
  },
  nextBtn: {
    marginHorizontal: 12,
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
  },
  doneBtn: {
    marginHorizontal: 12,
  },
  doneText: {
    fontSize: 16,
    color: '#fff',
  },
});

export default OnboardingScreen;
