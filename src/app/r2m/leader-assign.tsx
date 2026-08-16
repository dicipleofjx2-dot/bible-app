import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import { assignMemberToLeader, getMembersForAssignment, setLeader, type AppMember } from '@/db/r2m';

export default function R2MLeaderAssignScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [members, setMembers] = useState<AppMember[]>([]);
  const [query, setQuery] = useState('');
  // 어느 멤버의 소속을 고르는 중인지 — 리더 목록을 그 카드 아래에만 펼친다.
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getMembersForAssignment()
      .then(setMembers)
      .catch((e) => setError(e?.message ?? String(e)));
  }, [session]);

  useFocusEffect(load);

  const leaders = useMemo(() => members.filter((m) => m.isLeader), [members]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.username.toLowerCase().includes(q));
  }, [members, query]);

  async function toggleLeader(member: AppMember) {
    if (!session || busyId) return;
    setError(null);
    setBusyId(member.userId);
    const result = await setLeader(member.userId, !member.isLeader, session.user.id);
    setBusyId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  async function assign(memberId: string, leaderId: string | null) {
    if (!session || busyId) return;
    setError(null);
    setBusyId(memberId);
    const result = await assignMemberToLeader(memberId, leaderId, session.user.id);
    setBusyId(null);
    setPickingFor(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  if (loading) return null;

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">마이페이지에서 로그인해주세요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isAdmin === false) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">관리자만 접근할 수 있어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            리더 지정 · 멤버 배정
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            회원에게 리더 자격을 주면 그분도 리더관리 화면을 볼 수 있어요. 배정된 멤버의 훈련
            완료 여부만 보이고, 다른 리더의 멤버는 보이지 않습니다.
          </ThemedText>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              리더 {leaders.length}명 · 소속된 멤버 {members.filter((m) => m.leaderId).length}명 · 전체 회원{' '}
              {members.length}명
            </ThemedText>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="이름으로 찾기"
            placeholderTextColor={theme.textSecondary}
            style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />

          {visible.map((m) => {
            const busy = busyId === m.userId;
            const picking = pickingFor === m.userId;
            return (
              <View key={m.userId} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.cardHeader}>
                  <ThemedText type="smallBold">
                    {m.username}
                    {m.isLeader ? ' · 리더' : ''}
                  </ThemedText>
                  <Pressable
                    disabled={busy}
                    onPress={() => toggleLeader(m)}
                    style={({ pressed }) => [
                      styles.chip,
                      { borderColor: theme.accent, opacity: busy ? 0.5 : 1 },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small">{m.isLeader ? '리더 자격 빼기' : '리더로 지정'}</ThemedText>
                  </Pressable>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={() => setPickingFor(picking ? null : m.userId)}
                  style={({ pressed }) => [styles.leaderRow, pressed && styles.pressed]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    소속 리더: {m.leaderName ?? '없음'} {picking ? '▲' : '▼'}
                  </ThemedText>
                </Pressable>

                {picking && (
                  <View style={styles.pickerList}>
                    <Pressable
                      onPress={() => assign(m.userId, null)}
                      style={({ pressed }) => [
                        styles.pickerItem,
                        { backgroundColor: theme.background },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText type="small">소속 없음</ThemedText>
                    </Pressable>
                    {leaders
                      .filter((l) => l.userId !== m.userId)
                      .map((l) => (
                        <Pressable
                          key={l.userId}
                          onPress={() => assign(m.userId, l.userId)}
                          style={({ pressed }) => [
                            styles.pickerItem,
                            {
                              backgroundColor: l.userId === m.leaderId ? theme.backgroundSelected : theme.background,
                            },
                            pressed && styles.pressed,
                          ]}>
                          <ThemedText type="small">{l.username}</ThemedText>
                        </Pressable>
                      ))}
                    {leaders.filter((l) => l.userId !== m.userId).length === 0 && (
                      <ThemedText type="small" themeColor="textSecondary">
                        먼저 누군가를 리더로 지정해 주세요.
                      </ThemedText>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {visible.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              찾는 회원이 없어요.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
  },
  errorText: {
    color: '#e03131',
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  search: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  leaderRow: {
    paddingVertical: Spacing.one,
  },
  pickerList: {
    gap: Spacing.one,
  },
  pickerItem: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
