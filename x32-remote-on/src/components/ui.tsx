import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { C, MIN_TOUCH } from '@/constants/theme';
import type { Result } from '@/lib/actions';

// ── 알림 한 줄 ─────────────────────────────────────────
let push: ((m: string) => void) | null = null;
export function report(r: Result) {
  if (!r.ok) push?.(r.reason);
}
export function Toast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    push = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = setTimeout(() => setMsg(null), 2500);
    };
    return () => {
      push = null;
      clearTimeout(t);
    };
  }, []);
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={s.toast}>
      <Text style={s.toastText}>⚠ {msg}</Text>
    </View>
  );
}

// ── 길게 눌러야 실행되는 버튼 ─────────────────────────
// holdMs 가 0 이면 한 번 눌러 실행. 누르는 동안 바닥에서 채워지는 막대가 "얼마나 더"를 보여 준다.
export function HoldButton(props: {
  holdMs: number;
  onFire: () => void;
  style?: StyleProp<ViewStyle>;
  fill?: string;
  disabled?: boolean;
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  const { holdMs, onFire, disabled } = props;
  const p = useRef(new Animated.Value(0)).current;
  const fired = useRef(false);
  const start = () => {
    if (disabled || holdMs <= 0) return;
    fired.current = false;
    Animated.timing(p, { toValue: 1, duration: holdMs, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        fired.current = true;
        onFire();
      }
      p.setValue(0);
    });
  };
  const end = () => {
    p.stopAnimation();
    p.setValue(0);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      disabled={disabled}
      onPressIn={start}
      onPressOut={end}
      onPress={() => {
        if (holdMs <= 0) onFire();
      }}
      style={({ pressed }) => [props.style, pressed && { opacity: 0.85 }, disabled && { opacity: 0.4 }]}
    >
      {holdMs > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: props.fill ?? 'rgba(255,255,255,0.18)', width: p.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        />
      )}
      {props.children}
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: C.accent, borderColor: C.accent }]}>
      <Text style={[s.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, bottom: 90, backgroundColor: C.warnBg, borderColor: C.warn, borderWidth: 1, borderRadius: 12, padding: 14, zIndex: 10 },
  toastText: { color: C.warn, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipText: { color: C.sub, fontSize: 15, fontWeight: '600' },
});
export const ui = { MIN_TOUCH };
