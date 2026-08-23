import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

/** 카카오가 정한 색이다. 다른 색을 쓰면 사람들이 카카오 단추로 못 알아본다. */
const KAKAO_YELLOW = '#FEE500';
const KAKAO_LABEL = '#191600';

/**
 * 로그인 화면.
 *
 * **카카오를 위에 두고, 이메일은 아래에 남긴다.**
 *
 * 스마트주보는 카카오 하나로 줄였는데 여기는 이메일 가입만 받고 있었다. 그래서
 * 카카오로 쓰던 분이 이 앱에 오면 **계정을 새로 만드는 수밖에 없었고**, 그러면
 * 교적도 권한도 기록도 없는 빈 계정으로 들어가 "내 계정이 사라졌다"가 된다
 * (실제로 2026-08-23 에 일어났다).
 *
 * 그렇다고 이메일을 통째로 없앨 수는 없다 — 이메일로만 들어오는 계정이 34개고
 * 대부분 이번 주에도 쓰고 있다. 그분들이 갇힌다.
 *
 * 그래서 **가입만 막고 로그인은 남긴다.** 새로 오는 사람은 카카오 하나로
 * 모이고, 쓰던 분은 그대로 들어온다.
 */
export function AuthForm() {
  const theme = useTheme();
  const { signIn, signInWithKakao } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/');
  }

  async function kakao() {
    setError(null);
    setBusy(true);
    const result = await signInWithKakao();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    // 웹은 이 줄에 닿기 전에 카카오로 넘어간다. 앱은 여기서 돌아온다.
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">로그인</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        스마트주보와 같은 계정입니다. 카카오로 들어오시면 교적과 권한이 그대로 이어집니다.
      </ThemedText>

      <Pressable
        onPress={kakao}
        disabled={busy}
        style={[styles.kakaoButton, { opacity: busy ? 0.6 : 1 }]}>
        <ThemedText type="smallBold" style={styles.kakaoLabel}>
          카카오로 시작하기
        </ThemedText>
      </Pressable>

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.backgroundElement }]} />
        <ThemedText type="small" themeColor="textSecondary">
          이메일로 쓰시던 분
        </ThemedText>
        <View style={[styles.dividerLine, { backgroundColor: theme.backgroundElement }]} />
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="비밀번호"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      <Pressable
        onPress={submit}
        disabled={busy || !email || password.length < 6}
        style={[
          styles.submitButton,
          { backgroundColor: theme.backgroundElement, opacity: busy ? 0.6 : 1 },
        ]}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          이메일로 로그인
        </ThemedText>
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary">
        처음 오셨다면 카카오로 시작해 주세요. 이메일 가입은 더 받지 않습니다 — 한 사람이 계정을 둘 갖게 되기
        때문입니다.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  error: {
    color: '#e03131',
  },
  kakaoButton: {
    backgroundColor: KAKAO_YELLOW,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  kakaoLabel: {
    color: KAKAO_LABEL,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  submitButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
});
