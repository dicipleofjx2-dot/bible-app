import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import * as db from '@/db/household';
import { Badge, Card, EmptyNote, Field, Hero, PrimaryButton, SectionTitle } from '@/features/home/ui';
import { estimatePoints, formatTime, repeatLabel } from '@/lib/chores';
import { useHousehold } from '@/lib/household';

/**
 * 집안일 — **분류별로 묶어 보여 준다.**
 *
 * 「우리 집이 무슨 일을 하는가」를 한 장에 세워 두는 화면이다. 목록을 그냥
 * 시간순으로 늘어놓으면 스무 가지가 넘는 순간 아무도 못 읽는다. 청소·요리로
 * 묶어야 「설거지가 빠졌네」가 보인다.
 */
export default function ChoresScreen() {
  const { current, categories, chores, members, isManager, refresh, loading } = useHousehold();
  const [newCategory, setNewCategory] = useState('');
  const [newEmoji, setNewEmoji] = useState('🏠');
  const [message, setMessage] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  const memberName = useMemo(
    () => new Map(members.map((m) => [m.id, `${m.emoji} ${m.display_name}`])),
    [members]
  );

  /** 분류별로 묶는다. 분류가 지워진 집안일은 맨 뒤 「그 밖에」로 모은다. */
  const groups = useMemo(() => {
    const out = categories.map((category) => ({
      category,
      items: chores.filter((c) => c.category_id === category.id),
    }));
    const loose = chores.filter((c) => !c.category_id || !categories.some((k) => k.id === c.category_id));
    if (loose.length) out.push({ category: null as unknown as db.Category, items: loose });
    return out;
  }, [categories, chores]);

  // **집을 다 읽기 전에는 아무 데로도 보내지 않는다.** 이 화면을 바로 열거나
  // 새로고침하면 current 가 잠깐 비어 있는데, 그때 곧장 /join 으로 보내면
  // 링크로 들어온 사람이 영영 이 화면을 못 본다.
  if (loading) return null;
  if (!current) return <Redirect href="/join" />;

  async function addCategory() {
    if (!current || !newCategory.trim()) return;
    try {
      await db.addCategory(current.id, newCategory.trim(), newEmoji.trim() || '🏠', categories.length + 1);
      setNewCategory('');
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero
            emoji="🗂️"
            title="집안일"
            subtitle={`${chores.filter((c) => c.active).length}가지 · 분류 ${categories.length}가지`}
          />

          {isManager ? (
            <PrimaryButton label="＋ 집안일 만들기" onPress={() => router.push('/chore/new')} />
          ) : (
            <Card>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                집안일을 만들고 고치는 일은 관리자가 합니다. 무엇을 더 해야 할지는 관리자에게 말해
                주세요.
              </ThemedText>
            </Card>
          )}

          {chores.length === 0 ? (
            <Card>
              <EmptyNote emoji="🧹" text="아직 적어 둔 집안일이 없습니다. 매일 하는 것부터 하나씩 적어 주세요." />
            </Card>
          ) : null}

          {groups.map((group) => {
            if (!group.items.length) return null;
            const key = group.category?.id ?? 'loose';
            return (
              <View key={key} style={styles.group}>
                <SectionTitle
                  title={`${group.category?.emoji ?? '📦'} ${group.category?.name ?? '그 밖에'}`}
                  action={
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {group.items.length}가지
                    </ThemedText>
                  }
                />
                {group.items.map((chore) => (
                  <Card
                    key={chore.id}
                    onPress={isManager ? () => router.push(`/chore/${chore.id}`) : undefined}>
                    <ThemedText style={[Type.itemTitle, !chore.active ? { opacity: 0.5 } : null]}>
                      {chore.title}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {repeatLabel(chore)} · {formatTime(chore.at_time)} · {chore.minutes}분 · 난이도{' '}
                      {chore.difficulty} · 약 {estimatePoints(chore)}점
                    </ThemedText>
                    <View style={styles.badges}>
                      {chore.default_member_id ? (
                        <Badge
                          label={`고정 ${memberName.get(chore.default_member_id) ?? '?'}`}
                          tone="calm"
                          emoji="📌"
                        />
                      ) : (
                        <Badge label="자동 배정" tone="calm" emoji="🔀" />
                      )}
                      {chore.needs_review ? <Badge label="확인 필요" tone="warn" emoji="🔎" /> : null}
                      {!chore.active ? <Badge label="쉬는 중" tone="alert" /> : null}
                    </View>
                    {chore.notes ? (
                      <ThemedText themeColor="textSecondary" style={Type.caption}>
                        {chore.notes}
                      </ThemedText>
                    ) : null}
                  </Card>
                ))}
              </View>
            );
          })}

          {isManager ? (
            <Card>
              <SectionTitle
                title="분류 관리"
                action={
                  <PrimaryButton
                    label={showCategories ? '접기' : '펼치기'}
                    tone="quiet"
                    onPress={() => setShowCategories(!showCategories)}
                  />
                }
              />
              {showCategories ? (
                <>
                  {categories.map((category) => (
                    <View key={category.id} style={styles.categoryRow}>
                      <ThemedText style={Type.body}>
                        {category.emoji} {category.name}
                      </ThemedText>
                      <PrimaryButton
                        label="지우기"
                        tone="danger"
                        onPress={async () => {
                          // 분류를 지워도 집안일은 남는다(표에서 category_id 가
                          // null 로 풀린다). 분류 하나 지웠다고 그 안의 살림이
                          // 통째로 사라지면 안 된다.
                          await db.deleteCategory(category.id);
                          await refresh();
                        }}
                      />
                    </View>
                  ))}
                  <Field label="새 분류" value={newCategory} onChangeText={setNewCategory} placeholder="화분" />
                  <Field label="그림글자" value={newEmoji} onChangeText={setNewEmoji} placeholder="🌵" />
                  <PrimaryButton label="분류 더하기" onPress={addCategory} disabled={!newCategory.trim()} />
                </>
              ) : null}
            </Card>
          ) : null}

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
  group: { gap: Spacing.two },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
});
