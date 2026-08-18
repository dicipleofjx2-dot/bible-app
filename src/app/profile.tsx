import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin, getProfile, updateUsername, getChurches, updateMyChurch, type ChurchOption } from '@/db/profile';
import { AuthForm } from '@/features/auth/AuthForm';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session) return;
    getProfile(session.user.id).then((profile) => {
      if (profile?.username) setUsername(profile.username);
      setChurchId(profile?.church_id ?? null);
    });
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [session]);

  useEffect(() => {
    getChurches()
      .then(setChurches)
      .catch(() => setChurches([]));
  }, []);

  async function pickChurch(id: string) {
    if (!session) return;
    const previous = churchId;
    setChurchId(id);
    const result = await updateMyChurch(session.user.id, id);
    // 실패하면 눌린 채로 두지 않는다 — 바뀐 줄 알고 넘어가면 내용이 안 보이는
    // 이유를 찾을 수 없다.
    if (result.error) setChurchId(previous);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await updateUsername(session!.user.id, username.trim());
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {session && (
          <>
            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                이메일
              </ThemedText>
              <ThemedText type="smallBold">{session.user.email}</ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                닉네임
              </ThemedText>
              <TextInput
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setSaved(false);
                }}
                placeholder="닉네임을 입력하세요"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
              <Pressable
                onPress={save}
                disabled={saving || !username.trim()}
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.backgroundSelected, opacity: saving || !username.trim() ? 0.5 : 1 },
                ]}>
                <ThemedText type="smallBold">{saved ? '저장됨' : '저장'}</ThemedText>
              </Pressable>
            </View>

            {/* 소속 교회 — 목자편지·공지사항·게시판이 이 값으로 갈린다.
                고르지 않으면 교회 내용이 하나도 안 보이므로 눈에 띄게 알린다. */}
            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                소속 교회
              </ThemedText>
              {churches.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  고를 수 있는 교회가 없어요.
                </ThemedText>
              ) : (
                <View style={styles.churchList}>
                  {churches.map((c) => {
                    const on = c.id === churchId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => pickChurch(c.id)}
                        style={[
                          styles.churchItem,
                          { backgroundColor: on ? theme.backgroundSelected : theme.backgroundElement },
                        ]}>
                        <ThemedText type="small" style={on ? styles.churchItemOn : undefined}>
                          {on ? '✓ ' : ''}
                          {c.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {!churchId && churches.length > 0 && (
                <ThemedText type="small" style={styles.warnText}>
                  교회를 고르셔야 목자의 편지·공지사항·게시판이 보여요.
                </ThemedText>
              )}
            </View>

            {isAdmin && (
              <View style={styles.adminLinkGroup}>
                <Pressable
                  onPress={() => router.push('/library/admin')}
                  style={[styles.adminLinkButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">📚 데이빗북스 관리</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/shepherd-letters/admin')}
                  style={[styles.adminLinkButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">✏️ 목자의 편지 관리</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/notice-board/admin')}
                  style={[styles.adminLinkButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">📢 알림마당 관리</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/support/admin')}
                  style={[styles.adminLinkButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">💝 후원정보 관리</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/r2m/courses/admin')}
                  style={[styles.adminLinkButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">🎯 R2M 훈련과정 관리</ThemedText>
                </Pressable>
              </View>
            )}

            <Pressable onPress={handleSignOut} style={styles.signOutButton}>
              <ThemedText type="link" style={styles.signOutText}>
                로그아웃
              </ThemedText>
            </Pressable>
          </>
        )}

        {!session && <AuthForm />}
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
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  churchList: { gap: 8 },
  churchItem: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  churchItemOn: { color: '#fff' },
  warnText: { color: '#e8590c' },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  adminLinkGroup: {
    gap: Spacing.two,
  },
  adminLinkButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  signOutButton: {
    marginTop: Spacing.four,
  },
  signOutText: {
    color: '#e03131',
  },
});
