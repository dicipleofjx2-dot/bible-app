import { Pressable, StyleSheet, View, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import type { Category, ChoreRow, Member, Task } from '@/db/household';
import { Badge, usePalette } from '@/features/home/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime, statusLabel } from '@/lib/chores';

/**
 * 일감 한 줄. 오늘·배치·확인함이 같이 쓴다.
 *
 * 한 줄에서 읽혀야 하는 것은 넷이다 — **언제 · 무엇을 · 누가 · 어떻게 됐나.**
 * 그래서 왼쪽에 시각을 세로로 세워 두고(시간순 목록에서 눈이 그 기둥을 타고
 * 내려간다), 가운데에 제목과 분류, 오른쪽에 상태를 둔다.
 */
export function TaskRow({
  task,
  chore,
  category,
  member,
  mine,
  highlight,
  onPress,
  right,
}: {
  task: Task;
  chore: ChoreRow | undefined;
  category: Category | undefined;
  member: Member | undefined;
  mine?: boolean;
  /** 시간이 겹쳤다는 표시. 배치 화면에서 쓴다. */
  highlight?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const palette = usePalette();
  const status = statusLabel(task.status, chore?.needs_review ?? false);
  const late = (task.late_minutes ?? 0) > 0;
  const done = task.status === 'done' || task.status === 'approved';

  const body = (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: highlight ? palette.clay : mine ? theme.accent : theme.border,
          borderWidth: highlight || mine ? 2 : 1,
        },
      ]}>
      <View style={styles.time}>
        <ThemedText style={[Type.caption, { color: theme.textSecondary } as TextStyle]}>
          {formatTime(task.at_time).split(' ')[0]}
        </ThemedText>
        <ThemedText style={styles.clock}>{formatTime(task.at_time).split(' ')[1]}</ThemedText>
      </View>

      <View style={styles.main}>
        <ThemedText
          style={[Type.itemTitle, done ? { textDecorationLine: 'line-through', opacity: 0.6 } : null]}
          numberOfLines={2}>
          {category?.emoji ? `${category.emoji} ` : ''}
          {chore?.title ?? '(지워진 집안일)'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={Type.caption} numberOfLines={1}>
          {member ? `${member.emoji} ${member.display_name}` : '담당자 없음'}
          {chore ? ` · ${chore.minutes}분 · 난이도 ${chore.difficulty}` : ''}
          {task.points > 0 ? ` · ${task.points}점` : ''}
        </ThemedText>
        <View style={styles.badges}>
          <Badge label={status.label} tone={status.tone} />
          {late ? <Badge label={`${task.late_minutes}분 늦음`} tone="alert" emoji="⏰" /> : null}
          {task.quality ? <Badge label={`★${task.quality}`} tone="warn" /> : null}
          {highlight ? <Badge label="시간 겹침" tone="alert" emoji="⚠️" /> : null}
        </View>
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
      {body}
    </Pressable>
  );
}

/** 「했어요」 단추. 누르는 자리를 크게 잡았다 — 하루에 몇 번씩 누른다. */
export function CheckButton({
  done,
  onPress,
  disabled,
}: {
  done: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const palette = usePalette();
  // 어두운 모드의 초록은 밝은 연둣빛이다. 그 위에 흰 ✓ 를 얹으면 대비가 2:1 도
  // 안 나와 「했음」과 「아직」이 같아 보인다 — 밝은 바탕엔 어두운 글자를 얹는다.
  const dark = useColorScheme() === 'dark';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={done ? '안 한 것으로 되돌리기' : '했어요'}
      style={({ pressed }) => [
        styles.check,
        {
          backgroundColor: done ? palette.green : theme.accentSoft,
          borderColor: done ? palette.green : theme.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText
        style={[styles.checkMark, { color: done ? (dark ? '#141A18' : '#FFFFFF') : theme.accent } as TextStyle]}>
        ✓
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 16,
    padding: Spacing.three,
  },
  time: { width: 54, alignItems: 'center' },
  clock: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  main: { flex: 1, gap: Spacing.one },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  right: { alignItems: 'center' },
  check: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
});
