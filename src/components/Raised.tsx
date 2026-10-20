import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 바탕에서 한 겹 띄운 판.
 *
 * **밝은 모드와 어두운 모드가 서로 다른 방법으로 높이를 만든다.** 어두운 바탕에
 * 검은 그림자는 보이지 않는다 — 그래서 어두울 때는 그림자 대신 **받침을 바탕보다
 * 밝게** 하고 위쪽 테두리에 흰 실선을 한 줄 둔다(빛이 위에서 온 것처럼 보인다).
 * 밝을 때는 반대로 옅은 그림자를 깐다.
 *
 * 홈 화면의 바둑판이 이미 같은 방식을 쓰고 있다(`(tabs)/index.tsx` 의 padColors).
 * 그 규칙을 여기 한 곳에 모아 두어, 화면마다 그림자 값을 따로 적다가 서로
 * 달라지는 일을 막는다.
 *
 * shadow* 낱개 속성은 RN 0.86 에서 deprecated 라 boxShadow 한 줄로 쓴다.
 */
export function useRaise() {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';

  return {
    isDark,
    /** 판의 바탕. 위에서 아래로 아주 옅게 기운다. */
    colors: (isDark
      ? ['#3C2A23', theme.backgroundElement]
      : ['#FFFFFF', theme.backgroundElement]) as readonly [string, string],
    /** 위쪽 테두리에 올리는 빛 한 줄. */
    rim: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.90)',
    /** 밝은 모드에서만 깔리는 그림자. 어두운 모드에서는 null. */
    shadow: isDark ? null : ({ boxShadow: '0px 4px 10px rgba(74, 55, 48, 0.14)' } as ViewStyle),
    /** 강조색 판(단추)에 쓰는 더 짙은 그림자. */
    strongShadow: isDark
      ? ({ boxShadow: '0px 2px 10px rgba(0,0,0,0.35)' } as ViewStyle)
      : ({ boxShadow: '0px 6px 14px rgba(74, 55, 48, 0.22)' } as ViewStyle),
  };
}

/** 한 겹 띄운 카드. 안쪽 여백은 쓰는 쪽에서 정한다. */
export function Raised({
  children,
  style,
  radius = 18,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
}) {
  const { colors, rim, shadow } = useRaise();
  return (
    <View style={[{ borderRadius: radius }, shadow, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.pad, { borderRadius: radius, borderColor: rim }]}>
        {children}
      </LinearGradient>
    </View>
  );
}

/**
 * 동그란 받침 — 이모지 하나를 올려 둔다.
 *
 * 글자만 있을 때보다 「누를 것」으로 읽힌다. 홈 바둑판과 같은 모양이라 처음 보는
 * 화면에서도 같은 것으로 알아본다.
 */
export function RaisedBadge({
  children,
  size = 52,
  /** 받침 색. 주면 그 색으로 칠한다(사역마다 다른 색을 쓰는 자리). */
  tint,
}: {
  children: ReactNode;
  size?: number;
  tint?: string;
}) {
  const theme = useTheme();
  const { isDark, rim, shadow } = useRaise();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: rim,
          backgroundColor: tint ?? (isDark ? '#55392E' : theme.accentSoft),
          alignItems: 'center',
          justifyContent: 'center',
        },
        shadow,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
