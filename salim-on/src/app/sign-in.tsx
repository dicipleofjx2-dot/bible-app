import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { Card, Field, Hero, PrimaryButton } from '@/features/home/ui';
import { useAuth } from '@/lib/auth';

/**
 * 로그인.
 *
 * 데이빗바이블과 **같은 계정**이다(같은 Supabase 프로젝트를 쓴다). 그래서
 * 「새로 가입하세요」를 앞세우지 않고, 쓰던 이메일로 들어오는 칸을 먼저 둔다.
 */
export default function SignInScreen() {
  const { session, loading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');

  async function submit() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setMessage('');
    if (mode === 'in') {
      const { error } = await signIn(email.trim(), password);
      if (error) setMessage(error);
      else router.replace('/');
    } else {
      const { error, needsConfirm } = await signUp(email.trim(), password);
      if (error) setMessage(error);
      else if (needsConfirm) setMessage('가입했습니다. 메일함에서 확인 편지를 열어 주세요.');
      else router.replace('/');
    }
    setBusy(false);
  }

  if (loading) return null;
  if (session) return <Redirect href="/" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero emoji="🧺" title="살림ON" subtitle="집안일을 나누고, 시간을 정하고, 확인하고, 점수를 쌓습니다" />

          <Card>
            <Field label="이메일" value={email} onChangeText={setEmail} placeholder="name@example.com" />
            <Field label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
            <PrimaryButton
              label={busy ? '기다려 주세요…' : mode === 'in' ? '들어가기' : '가입하기'}
              onPress={submit}
              disabled={busy || !email.trim() || !password}
            />
            <PrimaryButton
              label={mode === 'in' ? '계정이 없습니다 · 가입하기' : '이미 계정이 있습니다 · 들어가기'}
              tone="quiet"
              onPress={() => {
                setMode(mode === 'in' ? 'up' : 'in');
                setMessage('');
              }}
            />
            {message ? (
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                {message}
              </ThemedText>
            ) : null}
          </Card>

          <Card>
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              데이빗바이블을 쓰고 계시면 같은 이메일과 비밀번호로 그대로 들어오시면 됩니다.
              계정이 따로 필요하지 않습니다.
            </ThemedText>
          </Card>

          <View style={{ height: Spacing.six }} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
