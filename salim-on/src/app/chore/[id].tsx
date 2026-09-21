import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import * as db from '@/db/household';
import {
  Card,
  ChipRow,
  Field,
  Hero,
  PrimaryButton,
  SectionTitle,
  Stepper,
  Toggle,
  WeekdayPicker,
} from '@/features/home/ui';
import { basePoints, estimatePoints, minutesOfTime, todayInSeoul, type RepeatKind } from '@/lib/chores';
import { useHousehold } from '@/lib/household';

/**
 * 집안일 하나를 적는 화면. `/chore/new` 면 새로 만들고, id 를 주면 고친다.
 *
 * **점수를 아래에 미리 보여 준다.** 난이도와 시간을 올릴 때 점수가 같이
 * 움직이는 것이 보여야, 「화장실 청소는 왜 빨래 개기와 같은 점수냐」는 말이
 * 나오기 전에 집에서 조절할 수 있다.
 *
 * 바깥 껍데기는 **문지기만 한다.**
 *
 * 폼의 칸들은 useState 의 첫 값으로 채워지는데, 자료가 아직 안 온 첫 그림에서
 * 그 값을 잡아 버리면 **자료가 도착해도 칸이 빈 채로 굳는다.** `/chore/<id>`
 * 를 주소로 바로 열거나 새로고침하면 실제로 그렇게 됐다. 그래서 자료가 온
 * 뒤에야 안쪽 폼을 처음 그리고, key 를 걸어 다른 집안일로 옮길 때 새로 짓게
 * 한다.
 */
export default function ChoreEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { current, chores, isManager, loading } = useHousehold();
  const isNew = id === 'new';
  const existing = useMemo(() => chores.find((c) => c.id === id), [chores, id]);

  if (loading) return null;
  if (!current) return <Redirect href="/join" />;
  if (!isManager) return <Redirect href="/chores" />;
  if (!isNew && !existing) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: '집안일' }} />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.content}>
            <Card>
              <ThemedText style={Type.body}>그런 집안일이 없습니다.</ThemedText>
              <PrimaryButton label="목록으로" onPress={() => router.replace('/chores')} />
            </Card>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }
  return <ChoreForm key={existing?.id ?? 'new'} id={id} existing={existing} />;
}

function ChoreForm({ id, existing }: { id: string; existing: db.ChoreRow | undefined }) {
  const { current, categories, members, refresh } = useHousehold();
  const isNew = id === 'new';

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.category_id ?? null);
  const [minutes, setMinutes] = useState(existing?.minutes ?? 15);
  const [difficulty, setDifficulty] = useState(existing?.difficulty ?? 2);
  const [repeatKind, setRepeatKind] = useState<RepeatKind>(existing?.repeat_kind ?? 'weekly');
  const [weekdays, setWeekdays] = useState<number[]>(existing?.weekdays ?? [1]);
  const [monthDay, setMonthDay] = useState(existing?.month_day ?? 1);
  const [time, setTime] = useState((existing?.at_time ?? '09:00').slice(0, 5));
  const [startDate, setStartDate] = useState(existing?.start_date ?? todayInSeoul());
  const [defaultMember, setDefaultMember] = useState<string | null>(existing?.default_member_id ?? null);
  const [needsReview, setNeedsReview] = useState(existing?.needs_review ?? false);
  const [active, setActive] = useState(existing?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const timeOk = /^\d{1,2}:\d{2}$/.test(time) && minutesOfTime(time) < 24 * 60;
  const repeatOk =
    repeatKind === 'once' ||
    repeatKind === 'daily' ||
    (repeatKind === 'monthly' ? monthDay >= 1 && monthDay <= 31 : weekdays.length > 0);
  const canSave = title.trim().length > 0 && timeOk && repeatOk && !busy;

  async function save() {
    if (!current || !canSave) return;
    setBusy(true);
    setMessage('');
    try {
      await db.saveChore(
        current.id,
        {
          title: title.trim(),
          notes: notes.trim(),
          category_id: categoryId,
          minutes,
          difficulty,
          repeat_kind: repeatKind,
          // 쓰지 않는 칸은 비워 둔다. 「매일」인데 요일이 남아 있으면 나중에
          // 반복을 바꿨을 때 엉뚱한 요일이 되살아난다.
          weekdays: repeatKind === 'weekly' || repeatKind === 'biweekly' ? weekdays : [],
          month_day: repeatKind === 'monthly' ? monthDay : null,
          at_time: time,
          start_date: startDate,
          default_member_id: defaultMember,
          needs_review: needsReview,
          active,
        },
        isNew ? undefined : id
      );
      await refresh();
      router.replace('/chores');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={{ title: isNew ? '집안일 만들기' : '집안일 고치기' }} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero
            emoji="🧹"
            title={isNew ? '집안일 만들기' : '집안일 고치기'}
            subtitle={`정시에 별 셋이면 약 ${estimatePoints({ difficulty, minutes })}점`}
          />

          <Card>
            <Field label="무엇을 하나요" value={title} onChangeText={setTitle} placeholder="화장실 청소" />
            <Field
              label="메모"
              value={notes}
              onChangeText={setNotes}
              placeholder="변기·세면대·바닥까지"
              multiline
            />
            <ChipRow
              label="분류"
              options={categories.map((c) => ({ id: c.id, label: `${c.emoji} ${c.name}` }))}
              value={categoryId}
              onChange={setCategoryId}
              allowEmpty
            />
          </Card>

          <Card>
            <SectionTitle title="얼마나 드는 일인가" />
            <Stepper label="걸리는 시간" value={minutes} step={5} min={5} max={240} suffix="분" onChange={setMinutes} />
            <Stepper label="난이도" value={difficulty} min={1} max={5} suffix="1 쉬움 ~ 5 힘듦" onChange={setDifficulty} />
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              기본 {basePoints(difficulty, minutes)}점 · 제시간에 끝내면 +5점 · 별점에 따라 0.4~1.3배.
              실제 점수는 끝낸 시각을 서버가 재서 매깁니다.
            </ThemedText>
          </Card>

          <Card>
            <SectionTitle title="언제 하나" />
            <ChipRow
              label="반복"
              options={[
                { id: 'once', label: '한 번만' },
                { id: 'daily', label: '매일' },
                { id: 'weekly', label: '매주' },
                { id: 'biweekly', label: '격주' },
                { id: 'monthly', label: '매월' },
              ]}
              value={repeatKind}
              onChange={(v) => v && setRepeatKind(v)}
            />
            {repeatKind === 'weekly' || repeatKind === 'biweekly' ? (
              <WeekdayPicker value={weekdays} onChange={setWeekdays} />
            ) : null}
            {repeatKind === 'monthly' ? (
              <Stepper label="며칠에" value={monthDay} min={1} max={31} suffix="일" onChange={setMonthDay} />
            ) : null}
            <Field
              label="시각"
              value={time}
              onChangeText={setTime}
              placeholder="09:00"
              hint={timeOk ? '이 시각이 「정시」의 기준입니다.' : '09:00 처럼 적어 주세요.'}
            />
            <Field
              label="시작하는 날"
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-09-20"
              hint="이 날보다 앞선 날에는 펼쳐지지 않습니다."
            />
          </Card>

          <Card>
            <SectionTitle title="누가 하나" />
            <ChipRow
              label="고정 담당자 (비우면 자동 배정)"
              options={members
                .filter((m) => m.active)
                .map((m) => ({ id: m.id, label: `${m.emoji} ${m.display_name}` }))}
              value={defaultMember}
              onChange={setDefaultMember}
              allowEmpty
            />
            <Toggle
              label="끝내면 관리자가 확인해야 점수가 붙습니다"
              value={needsReview}
              onChange={setNeedsReview}
              hint="화장실 청소처럼 「했다」와 「됐다」가 다른 일에 켜 주세요."
            />
            <Toggle
              label="지금 하는 일입니다"
              value={active}
              onChange={setActive}
              hint="끄면 새 일감이 펼쳐지지 않습니다. 이미 펼쳐진 일감은 그대로 남습니다."
            />
          </Card>

          <PrimaryButton label={busy ? '저장하는 중…' : '저장하기'} onPress={save} disabled={!canSave} />

          {!isNew ? (
            <PrimaryButton
              label="이 집안일 지우기"
              tone="danger"
              onPress={async () => {
                // 지우면 이 집안일로 펼쳐진 일감도 같이 사라진다(표에서
                // on delete cascade). 지난 점수까지 지우고 싶지 않으면
                // 위의 「지금 하는 일입니다」를 끄는 쪽이 맞다 — 그래서
                // 그 스위치를 이 단추 위에 두었다.
                await db.deleteChore(id);
                await refresh();
                router.replace('/chores');
              }}
            />
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
});
