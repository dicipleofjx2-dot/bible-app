import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth';
import { useT } from '@/lib/i18n';
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
  const t = useT();
  const scheme = useColorScheme();
  const theme = PALETTE[scheme === 'dark' ? 'dark' : 'light'];
  const [step, setStep] = useState(0);
  const { session } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function start() {
    if (!session) {
      router.push('/profile');
      return;
    }
    if (starting) return;
    setError(null);
    setStarting(true);
    try {
      await setStartDate(session.user.id, todayDateString());
      router.replace('/reading-helper');
    } catch {
      // 여기서 실패하는 거의 유일한 이유는 로그인이 만료된 것이다. 앱에는 아직
      // 로그인한 것처럼 보이지만 서버가 거부한다. 예전에는 아무 말 없이 이
      // 화면에 머물러서, 눌러도 안 넘어가는 것처럼만 보였다.
      setError(t('ob.sessionExpired'));
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {step === 0 && <WelcomeStep theme={theme} />}
          {step === 1 && <HowItWorksStep theme={theme} />}
          {step === 2 && <StartStep theme={theme} onStart={start} loggedIn={!!session} />}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => router.push('/profile')} style={styles.errorButton}>
                <Text style={styles.errorButtonText}>{t('ob.goToMyPage')}</Text>
              </Pressable>
            </View>
          )}
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
              <Text style={[styles.primaryButtonText, { color: '#fff' }]}>{step === 0 ? t('ob.start') : t('ob.next')}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

type Palette = (typeof PALETTE)['light'];

function WelcomeStep({ theme }: { theme: Palette }) {
  const t = useT();
  return (
    <View style={styles.centered}>
      <View style={[styles.glowOuter, { backgroundColor: theme.glow }]}>
        <View style={[styles.glowInner, { backgroundColor: theme.card }]}>
          <Text style={styles.welcomeEmoji}>🙏</Text>
        </View>
      </View>
      <Text style={[styles.title, { color: theme.title }]}>{t('ob.welcome')}</Text>
      <Text style={[styles.subtitle, { color: theme.subtitle }]}>{t('ob.welcomeBody')}</Text>
    </View>
  );
}

function HowItWorksStep({ theme }: { theme: Palette }) {
  const t = useT();
  // key 는 문구가 아니라 고정된 이름으로. 문구를 열쇠로 쓰면 말을 바꿀
  // 때마다 목록이 통째로 새로 그려진다.
  const items = [
    { icon: '📖', iconBg: '#fdebd3', key: 'daily', title: t('ob.dailyTitle'), description: t('ob.dailyDesc') },
    { icon: '🧩', iconBg: '#e4defa', key: 'quiz', title: t('ob.quizTitle'), description: t('ob.quizDesc') },
    { icon: '⏰', iconBg: '#dbeafe', key: 'reset', title: t('ob.resetTitle'), description: t('ob.resetDesc') },
  ];
  return (
    <View style={styles.centeredWide}>
      <Text style={[styles.title, { color: theme.title }]}>{t('ob.howTitle')}</Text>
      <View style={styles.cardList}>
        {items.map((item) => (
          <View key={item.key} style={[styles.card, { backgroundColor: theme.card }]}>
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
  const t = useT();
  return (
    <View style={styles.centered}>
      <Text style={[styles.title, { color: theme.title }]}>{t('ob.beginTitle')}</Text>

      <Pressable
        onPress={onStart}
        style={({ pressed }) => [styles.startBadge, { backgroundColor: theme.navyDeep }, pressed && styles.pressed]}>
        <Text style={[styles.startBadgeCross, { color: '#f3d9a4' }]}>✝</Text>
        <Text style={[styles.startBadgeText, { color: '#fff' }]}>{t('ob.beginBadge')}</Text>
        <Text style={[styles.startBadgeSub, { color: '#cddaea' }]}>(Day 1)</Text>
      </Pressable>

      <Text style={[styles.subtitle, { color: theme.subtitle }]}>
        {loggedIn ? t('ob.readyIn') : t('ob.readyOut')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  errorBox: { marginTop: 16, gap: 10, alignItems: 'center' },
  errorText: { color: '#e8590c', textAlign: 'center', lineHeight: 21 },
  errorButton: { borderRadius: 999, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#e8590c' },
  errorButtonText: { color: '#fff', fontWeight: '700' },
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  centered: { alignItems: 'center', gap: 16 },
  centeredWide: { alignItems: 'center', gap: 20 },
  title: { fontWeight: '700', fontSize: 22, textAlign: 'center', lineHeight: 32 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  glowOuter: { width: 176, height: 176, borderRadius: 88, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  glowInner: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  welcomeEmoji: { fontSize: 56 },

  cardList: { width: '100%', gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14 },
  cardIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardIconEmoji: { fontSize: 24 },
  cardTextCol: { flex: 1, gap: 2 },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  cardDescription: { fontSize: 12.5, lineHeight: 17 },

  startBadge: { width: 168, height: 168, borderRadius: 84, alignItems: 'center', justifyContent: 'center', gap: 4 },
  startBadgeCross: { fontSize: 22, marginBottom: 2 },
  startBadgeText: { fontWeight: '700', fontSize: 16, textAlign: 'center', lineHeight: 22 },
  startBadgeSub: {  fontSize: 12 },

  footer: { paddingHorizontal: 24, paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  primaryButton: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { fontWeight: '700', fontSize: 16 },
  pressed: { opacity: 0.85 },
});
