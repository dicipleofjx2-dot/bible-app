import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

export function AuthForm() {
  const theme = useTheme();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedUpMessage, setSignedUpMessage] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else if (mode === 'signUp') {
      setSignedUpMessage(true);
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">{mode === 'signIn' ? '로그인' : '회원가입'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        커뮤니티 기능을 사용하려면 로그인이 필요합니다.
      </ThemedText>

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
        placeholder="비밀번호 (6자 이상)"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
      {signedUpMessage && (
        <ThemedText type="small" themeColor="textSecondary">
          가입 확인 이메일을 보냈습니다. 메일함을 확인해주세요.
        </ThemedText>
      )}

      <Pressable
        onPress={submit}
        disabled={busy || !email || password.length < 6}
        style={[
          styles.submitButton,
          { backgroundColor: theme.backgroundSelected, opacity: busy ? 0.6 : 1 },
        ]}>
        <ThemedText type="smallBold">{mode === 'signIn' ? '로그인' : '가입하기'}</ThemedText>
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
        <ThemedText type="link" themeColor="textSecondary">
          {mode === 'signIn' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </ThemedText>
      </Pressable>
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
  submitButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
});
