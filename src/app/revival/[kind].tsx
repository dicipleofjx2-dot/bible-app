import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Raised, RaisedBadge, useRaise } from '@/components/Raised';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  REVIVAL_KINDS,
  createRequest,
  getMyRequests,
  getUpcomingSessions,
  ministryOf,
  removeRequest,
  saveAfterNote,
  type RevivalKind,
  type RevivalRequest,
  formatMeetsOn,
  type RevivalSession,
} from '@/db/revival';


/**
 * 한 사역의 방 — 신청하고, 받은 뒤를 적는 자리.
 *
 * 세 가지가 한 화면에 있다.
 *   ① 언제 하는가
 *   ② 기도 신청하기 — 사역마다 묻는 것이 다르다(증상 / 묻고 싶은 것 / 막힌 것)
 *   ③ 내가 낸 신청과 **받은 뒤의 기록**
 *
 * ③ 이 이 화면의 핵심이다. 신청만 받고 끝나면 기도가 한 번의 행사로 끝난다.
 * 받은 뒤에 무엇이 달라졌는지 본인이 적어 두면, 그 자신에게도 기도한 사람에게도
 * 남는 것이 생긴다.
 */
export default function RevivalKindScreen() {
  const theme = useTheme();
  const { strongShadow } = useRaise();
  const { session } = useAuth();
  const { kind: raw } = useLocalSearchParams<{ kind: string }>();
  const kind = (REVIVAL_KINDS as readonly string[]).includes(raw ?? '')
    ? (raw as RevivalKind)
    : 'HEALING';
  const ministry = ministryOf(kind);

  const [sessions, setSessions] = useState<RevivalSession[]>([]);
  const [mine, setMine] = useState<RevivalRequest[]>([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // 지금 후기를 쓰고 있는 신청. 한 번에 하나만 연다.
  const [editing, setEditing] = useState<string | null>(null);
  const [afterText, setAfterText] = useState('');

  const load = useCallback(() => {
    getUpcomingSessions()
      .then((rows) => setSessions(rows.filter((s) => s.kind === kind)))
      .catch(() => setSessions([]));
    if (session) {
      getMyRequests(session.user.id)
        .then((rows) => setMine(rows.filter((r) => r.kind === kind)))
        .catch(() => setMine([]));
    } else {
      setMine([]);
    }
  }, [kind, session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function submit() {
    if (!session) {
      router.push('/profile');
      return;
    }
    if (body.trim().length < 2) {
      setMessage('내용을 조금만 더 적어 주세요.');
      return;
    }
    setBusy(true);
    setMessage(null);
    const result = await createRequest({
      kind,
      sessionId: sessions[0]?.id ?? null,
      userId: session.user.id,
      name,
      body,
    });
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setBody('');
    setMessage('신청했습니다. 기도로 함께하겠습니다.');
    load();
  }

  async function saveAfter(id: string) {
    setBusy(true);
    const result = await saveAfterNote(id, afterText);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setEditing(null);
    setAfterText('');
    load();
  }

  async function remove(id: string) {
    setBusy(true);
    await removeRequest(id);
    setBusy(false);
    load();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* 머리 띠 — 포스터 그림 위에 그 사역의 색을 얹는다. */}
          <ImageBackground
            source={require('@/assets/images/revival-angels.webp')}
            style={styles.hero}
            imageStyle={styles.heroImage}
            resizeMode="cover">
            <LinearGradient
              colors={[`${ministry.color}CC`, 'rgba(14,10,8,0.88)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroShade}>
              <RaisedBadge tint={ministry.color} size={46}>
                <ThemedText style={styles.heroEmoji}>{ministry.emoji}</ThemedText>
              </RaisedBadge>
              <View style={styles.heroTextWrap}>
                <ThemedText style={styles.heroTitle}>{ministry.name}</ThemedText>
                <ThemedText style={styles.heroSub}>{ministry.summary}</ThemedText>
              </View>
            </LinearGradient>
          </ImageBackground>

          {/* ── 언제 하는가 ── */}
          <Raised>
            <ThemedText type="smallBold">모이는 날</ThemedText>
            {sessions.length ? (
              sessions.map((s) => (
                <ThemedText key={s.id} type="small">
                  · {formatMeetsOn(s.meetsOn)}
                  {s.place ? ` · ${s.place}` : ''}
                  {s.note ? ` — ${s.note}` : ''}
                </ThemedText>
              ))
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                다음 날짜가 아직 정해지지 않았습니다. 신청은 지금 하셔도 됩니다.
              </ThemedText>
            )}
          </Raised>

          {/* ── 신청하기 ── */}
          <Raised>
            <ThemedText type="smallBold">기도 신청하기</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="이름 (비워 두셔도 됩니다)"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {ministry.askLabel}
            </ThemedText>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={ministry.askPlaceholder}
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[
                styles.input,
                styles.textarea,
                { color: theme.text, backgroundColor: theme.background },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary">
              적어 주신 내용은 본인과, 기도로 섬기는 관리자만 봅니다.
            </ThemedText>
            <Pressable
              onPress={() => void submit()}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: ministry.color, opacity: busy ? 0.6 : 1 },
                strongShadow,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.primaryText}>
                확인 — 신청하기
              </ThemedText>
            </Pressable>
            {message && (
              <ThemedText type="small" themeColor="accent">
                {message}
              </ThemedText>
            )}
          </Raised>

          {/* ── 내가 낸 신청 ── */}
          {mine.length > 0 && (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                내가 신청한 기도
              </ThemedText>
              {mine.map((r) => (
                <Raised key={r.id}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {r.createdAt.slice(0, 10)} 신청함
                  </ThemedText>
                  <ThemedText>{r.body}</ThemedText>

                  {r.afterNote ? (
                    <View style={[styles.afterBox, { borderColor: theme.border }]}>
                      <ThemedText type="small" themeColor="accent">
                        기도받은 뒤
                      </ThemedText>
                      <ThemedText type="small">{r.afterNote}</ThemedText>
                    </View>
                  ) : null}

                  {editing === r.id ? (
                    <>
                      <TextInput
                        value={afterText}
                        onChangeText={setAfterText}
                        placeholder="기도받은 뒤에 어떠셨는지 적어 주세요"
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        style={[
                          styles.input,
                          styles.textarea,
                          { color: theme.text, backgroundColor: theme.background },
                        ]}
                      />
                      <View style={styles.row}>
                        <Pressable
                          onPress={() => void saveAfter(r.id)}
                          disabled={busy}
                          style={({ pressed }) => [
                            styles.smallButton,
                            { backgroundColor: theme.backgroundSelected },
                            pressed && styles.pressed,
                          ]}>
                          <ThemedText type="smallBold" style={styles.primaryText}>
                            저장
                          </ThemedText>
                        </Pressable>
                        <Pressable onPress={() => setEditing(null)} hitSlop={8}>
                          <ThemedText type="small" themeColor="textSecondary">
                            그만두기
                          </ThemedText>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <View style={styles.row}>
                      <Pressable
                        onPress={() => {
                          setEditing(r.id);
                          setAfterText(r.afterNote ?? '');
                        }}
                        hitSlop={8}>
                        <ThemedText type="small" themeColor="accent">
                          {r.afterNote ? '받은 뒤 기록 고치기' : '기도받은 뒤 기록하기'}
                        </ThemedText>
                      </Pressable>
                      <Pressable onPress={() => void remove(r.id)} hitSlop={8} style={styles.pushRight}>
                        <ThemedText type="small" themeColor="textSecondary">
                          거두기
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </Raised>
              ))}
            </>
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
  title: { fontSize: 24 },
  hero: { height: 128, borderRadius: 18, overflow: 'hidden', justifyContent: 'flex-end' },
  heroImage: { borderRadius: 18 },
  heroShade: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  heroTextWrap: { flex: 1, gap: 2 },
  heroEmoji: { fontSize: 22 },
  heroTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  sectionTitle: { marginTop: Spacing.three },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  primaryButton: {
    marginTop: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  primaryText: { color: '#ffffff' },
  smallButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.one },
  pushRight: { marginLeft: 'auto' },
  afterBox: {
    borderLeftWidth: 2,
    paddingLeft: Spacing.three,
    gap: 2,
    marginTop: Spacing.one,
  },
  pressed: { opacity: 0.7 },
});
