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
      <View style={[styles.bottomGroup, { top: height * 0.58 }]}>
        <Pressable
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
          <Text style={styles.startButtonText}>시작하기 →</Text>
        </Pressable>
        <Text style={styles.captionText}>
          모라비안 선교사 죠셉 스미스가 제네덴달에서 선교하던 때에 마을 사람들에게 성경말씀에
          순종하도록 가르쳤던 배나무(Pear Tree)입니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: '#1E3350',
  },
  bottomGroup: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    zIndex: 10,
    alignItems: 'center',
  },
  startButton: {
    alignSelf: 'stretch',
    marginHorizontal: '10%',
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
  captionText: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pressed: {
    opacity: 0.7,
  },
});
