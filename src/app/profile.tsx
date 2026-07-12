import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Skins, Spacing, type SkinId } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useSkin } from '@/lib/skin';
import { getProfile, updateUsername } from '@/db/profile';

export default function ProfileScreen() {
  const theme = useTheme();
  const { skinId, setSkinId } = useSkin();
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
            스킨
          </ThemedText>
          <View style={styles.skinRow}>
            {(Object.keys(Skins) as SkinId[]).map((id) => {
              const skin = Skins[id];
              const selected = id === skinId;
              return (
                <Pressable key={id} onPress={() => setSkinId(id)} style={styles.skinItem}>
                  <LinearGradient
                    colors={skin.gradient.light}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.skinSwatch,
                      selected && [styles.skinSwatchSelected, { borderColor: theme.text }],
                    ]}>
                    {selected && (
                      <ThemedText type="smallBold" style={styles.skinCheck}>
                        ✓
                      </ThemedText>
                    )}
                  </LinearGradient>
                  <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
                    {skin.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

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

            <Pressable onPress={handleSignOut} style={styles.signOutButton}>
              <ThemedText type="link" style={styles.signOutText}>
                로그아웃
              </ThemedText>
            </Pressable>
          </>
        )}

        {!session && (
          <ThemedText type="small" themeColor="textSecondary">
            계정 정보를 보려면 커뮤니티 탭에서 로그인해주세요.
          </ThemedText>
        )}
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
  skinRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  skinItem: {
    alignItems: 'center',
    gap: Spacing.one,
    width: 84,
  },
  skinSwatch: {
    width: 56,
    height: 56,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  skinSwatchSelected: {
    borderWidth: 3,
  },
  skinCheck: {
    color: '#ffffff',
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
