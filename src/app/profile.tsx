import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin, getProfile, updateUsername } from '@/db/profile';
import { AuthForm } from '@/features/auth/AuthForm';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!session) return;
    getProfile(session.user.id).then((profile) => {
      if (profile?.username) setUsername(profile.username);
    });
    getIsAdmin(session.user.id)
      .then(setIsAdmin)
      .catch(() => setIsAdmin(false));
  }, [session]);

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

            {isAdmin && (
              <View style={styles.adminLinkGroup}>
                <Pressable
                  onPress={() => router.push('/payments/admin')}
                  style={[styles.adminLinkButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">💰 입금확인</ThemedText>
                </Pressable>
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
