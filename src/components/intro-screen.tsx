import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

// Rendered as a native Modal (its own top-level window on Android/iOS, a
// separate root on web) rather than an absolutely-positioned sibling of the
// Stack navigator. The sibling approach let react-native-screens' native
// stack/tab gesture handlers sit in the same responder chain as this
// screen's own Pressable, which on Android silently ate the press (visible
// press-in feedback, onPress never fired) — a Modal is fully isolated from
// that responder tree, so its own touches are never intercepted.
export function IntroScreen({ onDismiss }: { onDismiss: () => void }) {
  const [hiddenNativeSplash, setHiddenNativeSplash] = useState(false);
  const { width, height } = useWindowDimensions();

  return (
    <Modal visible animationType="none" statusBarTranslucent presentationStyle="overFullScreen">
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
          onPress={onDismiss}
          hitSlop={12}
          style={({ pressed }) => [
            styles.startButton,
            { top: height * 0.58 },
            pressed && styles.pressed,
          ]}>
          <Text style={styles.startButtonText}>시작하기 →</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
