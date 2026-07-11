import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getProfile, updateUsername } from '@/db/profile';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) return;
    getProfile(session.user.id).then((profile) => {
      if (profile?.username) setUsername(profile.username);
    });
  }, [session]);

  if (!session) return null;

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

        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <ThemedText type="link" style={styles.signOutText}>
            로그아웃
          </ThemedText>
        </Pressable>
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
  signOutButton: {
    marginTop: Spacing.four,
  },
  signOutText: {
    color: '#e03131',
  },
});
