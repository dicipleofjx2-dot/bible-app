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
import {
  createLetterSeries,
  deleteLetterSeries,
  getLetterSeries,
  updateLetterSeries,
  type LetterSeries,
} from '@/db/letterSeries';

const EMPTY = { name: '', author: '', description: '' };

export default function LetterSeriesScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [list, setList] = useState<LetterSeries[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState(EMPTY);

  const load = useCallback(() => {
    if (!session) return;
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
    getLetterSeries()
      .then(setList)
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
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.centered}>
          <ThemedText themeColor="textSecondary">
            {session ? '관리자만 접근할 수 있어요.' : '마이페이지에서 로그인해주세요.'}
          </ThemedText>
        </SafeAreaView>
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
            연재 관리
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            목자편지를 연재별로 묶습니다. 여기서 만든 연재는 교회 홈페이지 게시판에도 그대로
            나타나고, 옛 글 뒤에 새 글이 이어집니다.
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
              {adding ? '닫기' : '+ 연재 추가'}
            </ThemedText>
          </Pressable>

          {adding && (
            <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
              <Field label="연재 이름" theme={theme}>
                <TextInput
                  value={draft.name}
                  onChangeText={(t) => setDraft({ ...draft, name: t })}
                  placeholder="예: 선교지에서 온 편지"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
              </Field>
              <Field label="글쓴이" theme={theme}>
                <TextInput
                  value={draft.author}
                  onChangeText={(t) => setDraft({ ...draft, author: t })}
                  placeholder="예: 김지혜"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
              </Field>
              <Field label="소개 (선택)" theme={theme}>
                <TextInput
                  value={draft.description}
                  onChangeText={(t) => setDraft({ ...draft, description: t })}
                  multiline
                  style={[styles.textarea, { color: theme.text, backgroundColor: theme.background }]}
                />
              </Field>
              <Pressable
                disabled={busy}
                onPress={() =>
                  run(async () => {
                    const result = await createLetterSeries(draft);
                    if (!result.error) {
                      setDraft(EMPTY);
                      setAdding(false);
                    }
                    return result;
                  })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.backgroundSelected, opacity: busy ? 0.5 : 1 },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.primaryButtonText}>
                  {busy ? '저장 중...' : '추가'}
                </ThemedText>
              </Pressable>
            </View>
          )}

          {list.map((series) => {
            const editing = editingId === series.id;
            return (
              <View key={series.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                {editing ? (
                  <>
                    <Field label="연재 이름" theme={theme}>
                      <TextInput
                        value={edit.name}
                        onChangeText={(t) => setEdit({ ...edit, name: t })}
                        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                      />
                    </Field>
                    <Field label="글쓴이" theme={theme}>
                      <TextInput
                        value={edit.author}
                        onChangeText={(t) => setEdit({ ...edit, author: t })}
                        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                      />
                    </Field>
                    <Field label="소개" theme={theme}>
                      <TextInput
                        value={edit.description}
                        onChangeText={(t) => setEdit({ ...edit, description: t })}
                        multiline
                        style={[styles.textarea, { color: theme.text, backgroundColor: theme.background }]}
                      />
                    </Field>
                    <View style={styles.row}>
                      <Pressable
                        disabled={busy}
                        onPress={() =>
                          run(async () => {
                            const result = await updateLetterSeries(series.id, edit);
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
                        setEditingId(series.id);
                        setEdit({
                          name: series.name,
                          author: series.author,
                          description: series.description,
                        });
                      }}>
                      <ThemedText type="smallBold">
                        {series.name}
                        {series.isActive ? '' : ' · 숨김'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {series.author ? `${series.author} · ` : ''}
                        홈페이지 주소 /boards/{series.slug}
                      </ThemedText>
                      {series.description ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {series.description}
                        </ThemedText>
                      ) : null}
                    </Pressable>
                    <View style={styles.row}>
                      <Pressable
                        disabled={busy}
                        onPress={() => run(() => updateLetterSeries(series.id, { isActive: !series.isActive }))}
                        style={[styles.smallButton, { backgroundColor: theme.background }]}>
                        <ThemedText type="small">{series.isActive ? '숨기기' : '다시 쓰기'}</ThemedText>
                      </Pressable>
                      <Pressable
                        disabled={busy}
                        onPress={() => run(() => deleteLetterSeries(series.id))}
                        style={[styles.smallButton, { backgroundColor: theme.background }]}>
                        <ThemedText type="small" style={styles.dangerText}>
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
            연재 주소(slug)는 만들 때 정해지고 바뀌지 않습니다. 홈페이지 게시판의 옛 글과 이어
            주는 열쇠라서, 바뀌면 그동안 쓴 글과 끊깁니다.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {children}
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
  field: { gap: Spacing.one },
  input: { borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  textarea: {
    minHeight: 70,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
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
  dangerText: { color: '#e03131' },
  footnote: { marginTop: Spacing.two, lineHeight: 19 },
});
