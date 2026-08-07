import { FontFamily } from '@/constants/typography';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { setStartDate } from '@/lib/readingHelper/db';
import { todayDateString } from '@/lib/readingHelper/readingPlan';

const STEPS = 3;

/** A warm, devotional palette scoped to onboarding only — deliberately not
 * merged into the app's skin system, since this screen only shows once per
 * user and isn't meant to match the rest of 데이빗바이블's look. */
const PALETTE = {
  light: {
    background: '#f7f1e6',
    card: '#ffffff',
    title: '#1b2a41',
    subtitle: '#5b6b7a',
    navy: '#3d5a80',
    navyDeep: '#2f4562',
    glow: '#f3d9a4',
    dotInactive: '#ddd3bf',
  },
  dark: {
    background: '#1c1913',
    card: '#2a2620',
    title: '#f2ead9',
    subtitle: '#b8ac97',
    navy: '#5b81ab',
    navyDeep: '#3d5a80',
    glow: '#4a3f28',
    dotInactive: '#453f31',
  },
};

export default function ReadingHelperOnboardingScreen() {
  const scheme = useColorScheme();
  const theme = PALETTE[scheme === 'dark' ? 'dark' : 'light'];
  const [step, setStep] = useState(0);
  const { session } = useAuth();

  async function start() {
    if (!session) {
      router.push('/profile');
      return;
    }
    await setStartDate(session.user.id, todayDateString());
    router.replace('/reading-helper');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {step === 0 && <WelcomeStep theme={theme} />}
          {step === 1 && <HowItWorksStep theme={theme} />}
          {step === 2 && <StartStep theme={theme} onStart={start} loggedIn={!!session} />}
        </View>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {Array.from({ length: STEPS }).map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i === step ? theme.navy : theme.dotInactive }]} />
            ))}
          </View>

          {step < STEPS - 1 && (
            <Pressable
              onPress={() => setStep(step + 1)}
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.navy }, pressed && styles.pressed]}>
              <Text style={[styles.primaryButtonText, { color: '#fff' }]}>{step === 0 ? '시작하기' : '다음'}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

type Palette = (typeof PALETTE)['light'];

function WelcomeStep({ theme }: { theme: Palette }) {
  return (
    <View style={styles.centered}>
      <View style={[styles.glowOuter, { backgroundColor: theme.glow }]}>
        <View style={[styles.glowInner, { backgroundColor: theme.card }]}>
          <Text style={styles.welcomeEmoji}>🙏</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: theme.title }]}>환영합니다!</Text>
      <Text style={[styles.subtitle, { color: theme.subtitle }]}>
        1년 1독 성경통독의 여정을 시작합니다.{'\n'}매일 말씀과 함께 성장하는 시간이 되기를 소망합니다.
      </Text>
    </View>
  );
}

function HowItWorksStep({ theme }: { theme: Palette }) {
  const items = [
    { icon: '📖', iconBg: '#fdebd3', title: '매일 진도', description: '평일 3장 / 주일 5장\n(자동 진도)' },
    { icon: '🧩', iconBg: '#e4defa', title: '퀴즈 & 암송', description: '성경 퀴즈 20문항\n& 암송 퍼즐 게임' },
    { icon: '⏰', iconBg: '#dbeafe', title: '오전 4시 갱신', description: '매일 오전 4시\n새로운 말씀 갱신' },
  ];
  return (
    <View style={styles.centeredWide}>
      <Text style={[styles.title, { color: theme.title }]}>성경통독 운영 방식</Text>
      <View style={styles.cardList}>
        {items.map((item) => (
          <View key={item.title} style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={[styles.cardIconCircle, { backgroundColor: item.iconBg }]}>
              <Text style={styles.cardIconEmoji}>{item.icon}</Text>
            </View>
            <View style={styles.cardTextCol}>
              <Text style={[styles.cardTitle, { color: theme.title }]}>{item.title}</Text>
              <Text style={[styles.cardDescription, { color: theme.subtitle }]}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function StartStep({ theme, onStart, loggedIn }: { theme: Palette; onStart: () => void; loggedIn: boolean }) {
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: theme.title }]}>통독 시작</Text>

      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.startBadge, { backgroundColor: theme.navyDeep }, pressed && styles.pressed]}>
        <Text style={[styles.startBadgeCross, { color: '#f3d9a4' }]}>✝</Text>
        <Text style={[styles.startBadgeText, { color: '#fff' }]}>첫째 날{'\n'}진도 시작하기</Text>
        <Text style={[styles.startBadgeSub, { color: '#cddaea' }]}>(Day 1)</Text>
      </Pressable>

      <Text style={[styles.subtitle, { color: theme.subtitle }]}>
        {loggedIn ? '준비되셨나요?\n지금 바로 시작하세요!' : '로그인 후 진행도를 저장할 수 있어요.\n버튼을 누르면 마이페이지로 이동합니다.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  centered: { alignItems: 'center', gap: 16 },
  centeredWide: { alignItems: 'center', gap: 20 },
  title: { fontFamily: FontFamily.display, fontSize: 22, textAlign: 'center', lineHeight: 32 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  glowOuter: { width: 176, height: 176, borderRadius: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  glowInner: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  welcomeEmoji: { fontSize: 56 },

  cardList: { width: '100%', gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14 },
  cardIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardIconEmoji: { fontSize: 24 },
  cardTextCol: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 15 },
  cardDescription: { fontSize: 12.5, lineHeight: 17 },

  startBadge: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center', gap: 4 },
  startBadgeCross: { fontSize: 22, marginBottom: 2 },
  startBadgeText: { fontFamily: FontFamily.bold, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  startBadgeSub: { fontFamily: FontFamily.regular, fontSize: 12 },

  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  primaryButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { fontFamily: FontFamily.bold, fontSize: 16 },
  pressed: { opacity: 0.85 },
});
