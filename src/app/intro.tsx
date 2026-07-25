import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

// A real Stack screen (not an overlay toggled by local state) — every
// launch redirects here first (see _layout.tsx), and "시작하기" leaves the
// same way any other in-app link does, router.replace('/'), rather than a
// boolean flip that has to un-render this screen from underneath itself.
export default function IntroScreen() {
  const [hiddenNativeSplash, setHiddenNativeSplash] = useState(false);
  const { width, height } = useWindowDimensions();

  return (
    <View
      style={[styles.container, { width, height }]}
      onLayout={() => {
        if (!hiddenNativeSplash) {
          setHiddenNativeSplash(true);
          SplashScreen.hideAsync().catch(() => {});
        }
      }}>
      <Image
        style={{ width, height }}
        resizeMode="cover"
        source={require('@/assets/images/intro-background.jpg')}
      />
      {/* Sits in the empty gap between screen-middle and the "새부대교회"
          text baked into the photo below it. */}
      <Pressable
        onPress={() => router.replace('/')}
        style={({ pressed }) => [
          styles.startButton,
          { top: height * 0.58 },
          pressed && styles.pressed,
        ]}>
        <Text style={styles.startButtonText}>시작하기 →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#1E3350',
  },
  startButton: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    zIndex: 10,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E3350',
  },
  pressed: {
    opacity: 0.7,
  },
});
