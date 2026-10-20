import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';

import { Raised, RaisedBadge, useRaise } from '@/components/Raised';
import { RevivalAngelsMark } from '@/components/RevivalAngelsMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  REVIVAL_MINISTRIES,
  formatMeetsOn,
  getUpcomingSessions,
  isAppAdmin,
  type RevivalSession,
} from '@/db/revival';

/**
 * 부흥의 천사들 — 네 사역의 문.
 *
 * 사역은 넷이고 바뀌지 않는다. 바뀌는 것은 **언제 하는가**다. 그래서 각 칸에
 * 다음 날짜를 함께 적는다 — 날짜가 없으면 들어가 봐야 신청할 자리가 없다.
 */
export default function RevivalHomeScreen() {
  const theme = useTheme();
  const { strongShadow } = useRaise();
  const { session } = useAuth();
  const [sessions, setSessions] = useState<RevivalSession[]>([]);
  const [admin, setAdmin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getUpcomingSessions()
        .then((rows) => {
          if (!cancelled) setSessions(rows);
        })
        .catch(() => {
          /* 일정을 못 읽어도 사역 칸은 보여야 한다 */
        });
      if (session) {
        isAppAdmin(session.user.id)
          .then((v) => {
            if (!cancelled) setAdmin(v);
          })
          .catch(() => setAdmin(false));
      } else {
        setAdmin(false);
      }
      return () => {
        cancelled = true;
      };
    }, [session]),
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/*
            머리 띠 — 밤하늘에 천사 표식 하나.
            ⚠️ 전에는 사진 한 장을 깔고 있었는데, 그 파일은 포스터가 아니라
            **브라우저 창을 찍은 화면**이었다(북마크와 탭 이름까지 들어 있었다).
            앱에 실려 그대로 공개되고 있어서 걷어냈다. 종이 포스터를 받으면
            그때 다시 깔면 된다 — 지금은 홈 아이콘과 같은 그림으로 세운다.
          */}
          <View style={styles.hero}>
            <LinearGradient
              colors={['#17326E', '#0B1D45']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroSky}
            />
            <View style={styles.heroMark}>
              <RevivalAngelsMark size={132} />
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(7,18,40,0.55)', 'rgba(7,18,40,0.92)']}
              style={styles.heroShade}>
              <ThemedText style={styles.heroTitle}>부흥의 천사들</ThemedText>
              <ThemedText style={styles.heroSub}>
                말씀과 예언 · 치유와 축사 · 찬양과 경배 · 천국의 재정
              </ThemedText>
            </LinearGradient>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            네 가지 사역으로 섬깁니다. 날짜를 보시고 들어가 기도를 신청하세요.
          </ThemedText>

          {REVIVAL_MINISTRIES.map((m) => {
            // 그 사역의 가장 가까운 날. 일정은 이미 날짜순으로 와 있다.
            const next = sessions.find((s) => s.kind === m.kind);
            return (
              <Pressable
                key={m.kind}
                onPress={() => router.push(`/revival/${m.kind}`)}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Raised>
                  <View style={styles.cardHead}>
                    <RaisedBadge tint={m.color}>
                      <ThemedText style={styles.emoji}>{m.emoji}</ThemedText>
                    </RaisedBadge>
                    <View style={styles.cardTitleWrap}>
                      <ThemedText type="smallBold">{m.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {m.summary}
                      </ThemedText>
                    </View>
                  </View>
                  {/* 날짜는 띠로 띄운다 — 「언제 하는가」가 이 칸에서 가장 먼저 읽혀야 한다. */}
                  {next ? (
                    <View
                      style={[styles.whenPill, { backgroundColor: m.color }]}>
                      <ThemedText type="smallBold" style={styles.whenText}>
                        {formatMeetsOn(next.meetsOn)}
                        {next.place ? ` · ${next.place}` : ''}
                      </ThemedText>
                    </View>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary" style={styles.when}>
                      다음 날짜가 아직 정해지지 않았습니다
                    </ThemedText>
                  )}
                </Raised>
              </Pressable>
            );
          })}

          {admin && (
            <Pressable
              onPress={() => router.push('/revival/admin')}
              style={({ pressed }) => [
                styles.adminButton,
                { backgroundColor: theme.backgroundSelected },
                strongShadow,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.adminText}>
                사역 관리 — 날짜 정하기 · 신청자 보기
              </ThemedText>
            </Pressable>
          )}

          {!session && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
              기도를 신청하시려면 먼저 로그인해 주세요.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  title: { fontSize: 26 },
  hero: { height: 190, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  heroSky: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // 표식은 가운데 위쪽에. 아래는 글씨 자리라 비워 둔다.
  heroMark: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' },
  heroShade: { paddingHorizontal: Spacing.four, paddingTop: Spacing.five, paddingBottom: Spacing.three, gap: 2 },
  heroTitle: { color: '#ffffff', fontSize: 26, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12 },
  whenText: { color: '#ffffff' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardTitleWrap: { flex: 1, gap: 2 },
  emoji: { fontSize: 26 },
  when: { marginTop: Spacing.one },
  whenPill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
  },
  adminButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    alignItems: 'center',
  },
  adminText: { color: '#ffffff' },
  footnote: { textAlign: 'center', marginTop: Spacing.three },
  pressed: { opacity: 0.7 },
});
