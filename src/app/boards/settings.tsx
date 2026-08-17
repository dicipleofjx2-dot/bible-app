import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin } from '@/db/profile';
import { createBoard, deleteBoard, getBoards, updateBoard, type Board } from '@/db/boards';

const EMPTY = { name: '', description: '', writeAccess: 'member' as 'member' | 'admin' };

export default function BoardSettingsScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getBoards()
      .then(setBoards)
      .catch((e) => setError(e?.message ?? String(e)));
  }, [session]);

  useFocusEffect(load);

  async function run(fn: () => Promise<{ error?: string }>) {
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = await fn();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    load();
  }

  if (loading) return null;

  if (!session || isAdmin === false) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText themeColor="textSecondary">
          {session ? '관리자만 접근할 수 있어요.' : '마이페이지에서 로그인해주세요.'}
        </ThemedText>
      </ThemedView>
    );
  }

  if (isAdmin === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            게시판 관리
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            게시판을 만들고, 누가 글을 쓸 수 있는지 정합니다. 여기서 만든 게시판은 교회
            홈페이지에도 함께 생깁니다.
          </ThemedText>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          <Pressable
            onPress={() => setAdding((v) => !v)}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              {adding ? '닫기' : '+ 게시판 추가'}
            </ThemedText>
          </Pressable>

          {adding && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={draft.name}
                onChangeText={(t) => setDraft({ ...draft, name: t })}
                placeholder="게시판 이름 (예: 청년부 나눔)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
              <TextInput
                value={draft.description}
                onChangeText={(t) => setDraft({ ...draft, description: t })}
                placeholder="설명 (선택)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
              <AccessPicker
                value={draft.writeAccess}
                onChange={(v) => setDraft({ ...draft, writeAccess: v })}
                theme={theme}
              />
              <Pressable
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    const result = await createBoard(draft);
                    if (!result.error) {
                      setDraft(EMPTY);
                      setAdding(false);
                    }
                    return result;
                  })
                }
                style={[styles.primaryButton, { backgroundColor: theme.backgroundSelected, opacity: busy ? 0.5 : 1 }]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {busy ? '저장 중...' : '추가'}
                </ThemedText>
              </Pressable>
            </View>
          )}

          {boards.map((board) => {
            const editing = editingId === board.id;
            return (
              <View key={board.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                {editing ? (
                  <>
                    <TextInput
                      value={edit.name}
                      onChangeText={(t) => setEdit({ ...edit, name: t })}
                      style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                    />
                    <TextInput
                      value={edit.description}
                      onChangeText={(t) => setEdit({ ...edit, description: t })}
                      style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                    />
                    <AccessPicker
                      value={edit.writeAccess}
                      onChange={(v) => setEdit({ ...edit, writeAccess: v })}
                      theme={theme}
                    />
                    <View style={styles.row}>
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          run(async () => {
                            const result = await updateBoard(board.id, edit);
                            if (!result.error) setEditingId(null);
                            return result;
                          })
                        }
                        style={[styles.smallButton, { backgroundColor: theme.backgroundSelected }]}>
                        <ThemedText type="small" style={styles.primaryButtonText}>
                          저장
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => setEditingId(null)}
                        style={[styles.smallButton, { backgroundColor: theme.background }]}>
                        <ThemedText type="small">취소</ThemedText>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Pressable
                      onPress={() => {
                        setEditingId(board.id);
                        setEdit({
                          name: board.name,
                          description: board.description,
                          writeAccess: board.writeAccess,
                        });
                      }}>
                      <ThemedText type="smallBold">
                        {board.name}
                        {board.isActive ? '' : ' · 숨김'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {board.writeAccess === 'member' ? '교인 누구나' : '관리자만'} · 홈페이지 /boards/
                        {board.slug}
                      </ThemedText>
                    </Pressable>
                    <View style={styles.row}>
                      <Pressable
                        disabled={busy}
                        onPress={() => run(() => updateBoard(board.id, { isActive: !board.isActive }))}
                        style={[styles.smallButton, { backgroundColor: theme.background }]}>
                        <ThemedText type="small">{board.isActive ? '숨기기' : '다시 쓰기'}</ThemedText>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => run(() => deleteBoard(board.id))}
                        style={[styles.smallButton, { backgroundColor: theme.background }]}>
                        <ThemedText type="small" style={styles.errorText}>
                          지우기
                        </ThemedText>
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            );
          })}

          <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
            게시판 주소는 만들 때 정해지고 바뀌지 않습니다. 홈페이지의 옛 글과 이어 주는
            열쇠라서, 바뀌면 그동안 쌓인 글과 끊깁니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function AccessPicker({
  value,
  onChange,
  theme,
}: {
  value: 'member' | 'admin';
  onChange: (v: 'member' | 'admin') => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.row}>
      {(['member', 'admin'] as const).map((v) => (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={[
            styles.smallButton,
            { backgroundColor: value === v ? theme.backgroundSelected : theme.background },
          ]}>
          <ThemedText type="small" style={value === v ? styles.primaryButtonText : undefined}>
            {v === 'member' ? '교인 누구나 씀' : '관리자만 씀'}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', width: '100%' },
  safeArea: { flex: 1, width: '100%' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: { fontSize: 26 },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.two },
  input: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
  primaryButton: { borderRadius: Spacing.three, paddingVertical: Spacing.three, alignItems: 'center' },
  primaryButtonText: { color: '#fff' },
  smallButton: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  errorText: { color: '#e03131' },
  footnote: { marginTop: Spacing.two, lineHeight: 19 },
});
