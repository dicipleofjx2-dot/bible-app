import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  getIsAdmin,
  getProfile,
  updateUsername,
  getMyChurch,
  redeemInviteCode,
  type ChurchOption,
} from '@/db/profile';
import { AuthForm } from '@/features/auth/AuthForm';

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const [username, setUsername] = useState('');
  const [church, setChurch] = useState<ChurchOption | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
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
    getMyChurch(churchId)
      .then(setChurch)
      .catch(() => setChurch(null));
  }, [churchId]);

  async function joinWithCode() {
    if (!session || joining) return;
    setJoinError(null);
    setJoining(true);
    const result = await redeemInviteCode(inviteCode);
    setJoining(false);
    if (result.error) {
      setJoinError(result.error);
      return;
    }
    setInviteCode('');
    // 소속이 바뀌었으니 프로필을 다시 읽는다 — churchId가 바뀌면 위 effect가
    // 교회 이름도 새로 가져온다.
    const profile = await getProfile(session.user.id);
    setChurchId(profile?.church_id ?? null);
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
      {/* 스크롤이 없어서 화면이 넘치면 아래쪽에 손이 닿지 않았다. 관리자에게는
          관리 버튼이 다섯 개 더 붙는데, 맨 아래가 로그아웃이라 관리자일수록
          로그아웃을 못 했다. */}
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
                예전에는 교회 목록에서 아무 교회나 고를 수 있었다. 교회가 하나일
                때는 편했지만 여러 교회가 들어오면 남의 교회 글을 읽는 길이 되어
                초대 코드로만 들어오도록 바꿨다. */}
            <View style={styles.section}>
              <ThemedText type="small" themeColor="textSecondary">
                소속 교회
              </ThemedText>

              {church ? (
                <View style={[styles.churchItem, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold">{church.name}</ThemedText>
                </View>
              ) : (
                <ThemedText type="small" style={styles.warnText}>
                  아직 소속 교회가 없어요. 교회에서 받은 초대 코드를 넣으면 목자의 편지·공지사항·게시판이 보입니다.
                </ThemedText>
              )}

              <View style={styles.inviteRow}>
                <TextInput
                  value={inviteCode}
                  onChangeText={(t) => setInviteCode(t.toUpperCase())}
                  placeholder="초대 코드 (예: KQ7M2XPD)"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    styles.inviteInput,
                    { color: theme.text, borderColor: theme.backgroundElement },
                  ]}
                />
                <Pressable
                  onPress={joinWithCode}
                  disabled={joining || !inviteCode.trim()}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: theme.backgroundSelected,
                      opacity: joining || !inviteCode.trim() ? 0.5 : 1,
                    },
                  ]}>
                  <ThemedText type="smallBold">{joining ? '확인 중' : church ? '교회 옮기기' : '들어가기'}</ThemedText>
                </Pressable>
              </View>

              {joinError ? (
                <ThemedText type="small" style={styles.warnText}>
                  {joinError}
                </ThemedText>
              ) : null}
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
                  onPress={() => router.push('/popup-notices/admin')}
                  style={[styles.adminLinkButton, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="smallBold">🔔 알림 팝업 관리</ThemedText>
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
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.four,
    // 맨 아래 로그아웃이 화면 끝에 딱 붙지 않게 여유를 둔다.
    paddingBottom: Spacing.six,
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
  churchItem: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  warnText: { color: '#e8590c' },
  // 코드 칸과 단추를 한 줄에. 칸이 늘어나고 단추는 제 크기를 지킨다.
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  inviteInput: { flex: 1, borderWidth: 1, letterSpacing: 2 },
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
