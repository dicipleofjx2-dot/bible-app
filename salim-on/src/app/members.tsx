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
import { Badge, Card, ChipRow, Field, Hero, PrimaryButton, SectionTitle } from '@/features/home/ui';
import { useAuth } from '@/lib/auth';
import { useHousehold } from '@/lib/household';

/**
 * 식구.
 *
 * **계정이 없어도 식구가 된다.** 아이에게 이메일을 만들게 하지 않는다 —
 * 이름만 적어 두면 그 사람 앞으로 일감이 배정되고 점수가 쌓이고, 나중에
 * 초대코드로 들어오면 **같은 이름의 그 자리에 계정이 붙어** 여태 쌓은 점수가
 * 그대로 이어진다.
 *
 * 식구를 뺄 때도 줄을 지우지 않고 재운다. 지우면 그 사람이 한 일감의 담당자가
 * 통째로 비어, 지난 점수판이 유령이 된다.
 */
export default function MembersScreen() {
  const { signOut } = useAuth();
  const { current, members, isManager, me, refresh, loading } = useHousehold();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🙂');
  const [role, setRole] = useState<'manager' | 'member'>('member');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // **집을 다 읽기 전에는 아무 데로도 보내지 않는다.** 이 화면을 바로 열거나
  // 새로고침하면 current 가 잠깐 비어 있는데, 그때 곧장 /join 으로 보내면
  // 링크로 들어온 사람이 영영 이 화면을 못 본다.
  if (loading) return null;
  if (!current) return <Redirect href="/join" />;

  async function run(work: () => Promise<void>) {
    try {
      await work();
      await refresh();
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero
            emoji="👨‍👩‍👧"
            title="식구"
            subtitle={`${current.name} · ${members.filter((m) => m.active).length}명`}
          />

          <Card>
            <SectionTitle title="초대코드" />
            <ThemedText style={styles.code}>{current.invite_code}</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              식구가 이 여섯 글자로 들어옵니다. 아래에 적어 둔 이름과 같은 이름으로 들어오면 그 자리에
              계정이 붙어, 쌓아 둔 점수가 이어집니다.
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

          {members.map((member) => (
            <Card key={member.id}>
              <View style={styles.memberRow}>
                <ThemedText style={[Type.itemTitle, !member.active ? { opacity: 0.5 } : null]}>
                  {member.emoji} {member.display_name}
                </ThemedText>
                <View style={styles.badges}>
                  {member.role === 'manager' ? <Badge label="관리자" tone="good" emoji="🔑" /> : null}
                  {member.user_id ? (
                    <Badge label="계정 연결됨" tone="calm" />
                  ) : (
                    <Badge label="이름만" tone="warn" emoji="✏️" />
                  )}
                  {!member.active ? <Badge label="쉬는 중" tone="alert" /> : null}
                  {me?.id === member.id ? <Badge label="나" tone="good" /> : null}
                </View>
              </View>
              {isManager ? (
                <View style={styles.actions}>
                  <PrimaryButton
                    label={member.role === 'manager' ? '관리자에서 내리기' : '관리자로 올리기'}
                    tone="quiet"
                    style={styles.action}
                    onPress={() =>
                      run(() =>
                        db.updateMember(member.id, {
                          role: member.role === 'manager' ? 'member' : 'manager',
                        })
                      )
                    }
                  />
                  <PrimaryButton
                    label={member.active ? '쉬게 하기' : '다시 넣기'}
                    tone={member.active ? 'danger' : 'quiet'}
                    style={styles.action}
                    onPress={() => run(() => db.updateMember(member.id, { active: !member.active }))}
                  />
                </View>
              ) : null}
            </Card>
          ))}

          {isManager ? (
            <Card>
              <SectionTitle title="식구 더하기" />
              <Field label="이름" value={name} onChangeText={setName} placeholder="첫째" />
              <Field label="그림글자" value={emoji} onChangeText={setEmoji} placeholder="🐣" />
              <ChipRow
                label="역할"
                options={[
                  { id: 'member', label: '식구' },
                  { id: 'manager', label: '관리자' },
                ]}
                value={role}
                onChange={(v) => v && setRole(v)}
              />
              <PrimaryButton
                label="더하기"
                disabled={!name.trim()}
                onPress={() =>
                  run(async () => {
                    await db.addMember(current.id, name.trim(), emoji.trim() || '🙂', role);
                    setName('');
                    setEmoji('🙂');
                  })
                }
              />
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                관리자는 집안일을 만들고, 담당자를 배치하고, 끝낸 일을 확인합니다.
              </ThemedText>
            </Card>
          ) : null}

          <Card>
            <SectionTitle title="내 자리" />
            <PrimaryButton label="다른 집으로 · 집 만들기" tone="quiet" onPress={() => router.push('/join')} />
            <PrimaryButton
              label="로그아웃"
              tone="danger"
              onPress={async () => {
                await signOut();
                router.replace('/sign-in');
              }}
            />
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
  code: { fontSize: 30, lineHeight: 38, fontWeight: '700', letterSpacing: 5 },
  memberRow: { gap: Spacing.one },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  actions: { flexDirection: 'row', gap: Spacing.two },
  action: { flex: 1, paddingHorizontal: Spacing.two },
});
