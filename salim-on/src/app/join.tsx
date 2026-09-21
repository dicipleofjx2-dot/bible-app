import * as Clipboard from 'expo-clipboard';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import * as db from '@/db/household';
import { Card, Field, Hero, PrimaryButton, SectionTitle } from '@/features/home/ui';
import { useAuth } from '@/lib/auth';
import { useHousehold } from '@/lib/household';

/**
 * 집 만들기 · 초대코드로 들어가기 · 집 고르기.
 *
 * **아무 집에나 들어가는 길을 두지 않는다.** 집 목록을 보여 주고 고르게 하면
 * 그건 남의 집 살림을 들여다보는 길이다(데이빗바이블이 교회 목록에서 겪은
 * 그 자리다). 들어가는 문은 초대코드 하나뿐이다.
 */
export default function JoinScreen() {
  const { session } = useAuth();
  const { households, current, pick, reloadHouseholds, loading } = useHousehold();
  const [name, setName] = useState('');
  const [myName, setMyName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  if (!session && !loading) return <Redirect href="/sign-in" />;

  async function run(work: () => Promise<string>) {
    setBusy(true);
    setMessage('');
    try {
      const id = await work();
      await reloadHouseholds();
      await pick(id);
      router.replace('/');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero emoji="🏡" title="우리 집" subtitle="집을 새로 만들거나, 초대코드로 들어옵니다" />

          {households.length > 0 ? (
            <Card>
              <SectionTitle title="내가 속한 집" />
              {households.map((h) => (
                <PrimaryButton
                  key={h.id}
                  label={`${h.id === current?.id ? '✓ ' : ''}${h.name}`}
                  tone={h.id === current?.id ? 'accent' : 'quiet'}
                  onPress={async () => {
                    await pick(h.id);
                    router.replace('/');
                  }}
                />
              ))}
            </Card>
          ) : null}

          {current ? (
            <Card>
              <SectionTitle title="초대코드" />
              <ThemedText style={styles.code}>{current.invite_code}</ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                식구에게 이 여섯 글자를 알려 주세요. 헷갈리는 글자(0·O·1·I)는 아예 들어가지 않습니다.
              </ThemedText>
              <PrimaryButton
                label={copied ? '복사했습니다' : '초대코드 복사'}
                tone="quiet"
                onPress={async () => {
                  await Clipboard.setStringAsync(current.invite_code);
                  setCopied(true);
                }}
              />
            </Card>
          ) : null}

          <Card>
            <SectionTitle title="집 새로 만들기" />
            <Field label="집 이름" value={name} onChangeText={setName} placeholder="우리 집" />
            <Field label="내 이름" value={myName} onChangeText={setMyName} placeholder="엄마" />
            <PrimaryButton
              label={busy ? '기다려 주세요…' : '만들기'}
              disabled={busy}
              onPress={() => run(() => db.createHousehold(name, myName))}
            />
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              만든 사람이 관리자가 됩니다. 분류 여덟 가지(청소·요리·설거지·세탁·정리·쓰레기·장보기·돌봄)가
              같이 들어갑니다.
            </ThemedText>
          </Card>

          <Card>
            <SectionTitle title="초대코드로 들어가기" />
            <Field
              label="초대코드"
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="ABC234"
              autoCapitalize="characters"
            />
            <Field label="내 이름" value={myName} onChangeText={setMyName} placeholder="첫째" />
            <PrimaryButton
              label={busy ? '기다려 주세요…' : '들어가기'}
              disabled={busy || !code.trim()}
              onPress={() => run(() => db.joinHousehold(code, myName))}
            />
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              관리자가 이미 같은 이름으로 식구를 적어 두었다면, 그 자리에 계정이 붙습니다 —
              여태 쌓은 점수가 그대로 이어집니다.
            </ThemedText>
          </Card>

          {message ? (
            <Card>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                {message}
              </ThemedText>
            </Card>
          ) : null}

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
  code: { fontSize: 34, lineHeight: 42, fontWeight: '700', letterSpacing: 6 },
});
