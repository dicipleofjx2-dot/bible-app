import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Lock } from '@/lib/arena/escapeTypes';

/** 자물쇠 하나를 여는 판. 네 종류(숫자·글자·객관식·순서)를 한 곳에서 그린다.
 *
 * 판정은 여기서 하고 결과만 위로 올린다 — 정답이 화면 컴포넌트로 새어 나가면
 * 「정답이 어디에 있는가」가 여러 곳이 되어 고치기 어려워진다. */

type Props = {
  lock: Lock;
  onCorrect: () => void;
  onWrong: () => void;
};

/** 표기 차이로 아는 사람이 틀리지 않게 — 공백을 지우고 대소문자를 맞춘다.
 * 한글에는 대소문자가 없지만 영어 답(올리브)도 받으므로 함께 처리한다. */
function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function LockPanel({ lock, onCorrect, onWrong }: Props) {
  const theme = useTheme();
  const spec = lock.spec;

  // ── 숫자 자물쇠 ───────────────────────────────────────────────
  const [digits, setDigits] = useState('');

  // ── 글자 자물쇠 ───────────────────────────────────────────────
  const [word, setWord] = useState('');

  // ── 순서 자물쇠 ───────────────────────────────────────────────
  // 데이터는 정답 순서로 적혀 있고 섞는 것은 여기서 한다. 방을 다시 들어와도
  // 같은 순서로 나오면 외워 버리므로 들어올 때마다 섞는다.
  const shuffled = useMemo(
    () => (spec.type === 'order' ? shuffle(spec.items.map((text, i) => ({ text, answerIndex: i }))) : []),
    // lock.id 가 바뀔 때만 다시 섞는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lock.id]
  );
  const [picked, setPicked] = useState<number[]>([]);

  /** 키를 누르면 **덧붙이기만** 한다. 판정은 아래 효과가 한다.
   *
   * 예전에는 누르는 자리에서 `digits + k` 로 다음 값을 만들어 판정까지 했는데,
   * 빠르게 이어 누르면 아직 다시 그려지지 않은 옛 `digits` 를 보고 앞 자리가
   * 통째로 씹혔다(300 을 누르면 0 만 남았다). **시간이 곧 점수인 게임이라
   * 사람들은 최대한 빨리 누른다** — 연타가 예외가 아니라 기본 동작이다. */
  function pressDigit(k: string) {
    if (spec.type !== 'number') return;
    const max = spec.digits;
    setDigits((d) => (d.length >= max ? d : d + k));
  }

  // 숫자 자물쇠 판정 — 칸이 다 찼을 때 한 번.
  useEffect(() => {
    if (spec.type !== 'number' || digits.length < spec.digits) return;
    if (Number(digits) === spec.answer) onCorrect();
    else {
      setDigits('');
      onWrong();
    }
    // onCorrect/onWrong 은 부모가 매번 새로 만드는 함수라 넣으면 효과가 매
    // 렌더마다 돈다. 판정을 부르는 것은 digits 가 바뀔 때뿐이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  function judgeWord() {
    if (spec.type !== 'word') return;
    const given = normalize(word);
    if (!given) return;
    if (spec.accepted.some((a) => normalize(a) === given)) onCorrect();
    else {
      setWord('');
      onWrong();
    }
  }

  function judgeChoice(i: number) {
    if (spec.type !== 'choice') return;
    if (i === spec.correctIndex) onCorrect();
    else onWrong();
  }

  /** 숫자 자물쇠와 같은 이유로 담기만 한다 — 순서 맞추기도 연타로 누른다. */
  function pickOrder(shuffledIdx: number) {
    setPicked((p) => (p.includes(shuffledIdx) ? p : [...p, shuffledIdx]));
  }

  // 순서 자물쇠 판정 — 다 골랐을 때 한 번
  useEffect(() => {
    if (spec.type !== 'order' || shuffled.length === 0 || picked.length < shuffled.length) return;
    const correct = picked.every((s, position) => shuffled[s].answerIndex === position);
    if (correct) onCorrect();
    else {
      setPicked([]);
      onWrong();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  if (spec.type === 'number') {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '지우기', '0', ''];
    return (
      <View style={styles.wrap}>
        <View style={styles.digitRow}>
          {Array.from({ length: spec.digits }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.digitBox,
                { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                digits.length === i && { borderColor: theme.accent },
              ]}>
              <ThemedText type="subtitle">{digits[i] ?? ''}</ThemedText>
            </View>
          ))}
          {spec.unit && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
              {spec.unit}
            </ThemedText>
          )}
        </View>
        <View style={styles.keypad}>
          {keys.map((k, i) =>
            k === '' ? (
              <View key={i} style={styles.key} />
            ) : (
              <Pressable
                key={i}
                onPress={() => (k === '지우기' ? setDigits((d) => d.slice(0, -1)) : pressDigit(k))}
                style={({ pressed }) => [
                  styles.key,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type={k === '지우기' ? 'small' : 'subtitle'}>{k}</ThemedText>
              </Pressable>
            )
          )}
        </View>
      </View>
    );
  }

  if (spec.type === 'word') {
    return (
      <View style={styles.wrap}>
        {spec.firstLetter && (
          <ThemedText type="small" themeColor="textSecondary">
            첫 글자: {spec.firstLetter}
          </ThemedText>
        )}
        <TextInput
          value={word}
          onChangeText={setWord}
          onSubmitEditing={judgeWord}
          returnKeyType="done"
          placeholder="답을 적으세요"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text },
          ]}
        />
        <Pressable
          onPress={judgeWord}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.onAccent}>
            열기
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  if (spec.type === 'choice') {
    return (
      <View style={styles.wrap}>
        {spec.choices.map((c, i) => (
          <Pressable
            key={i}
            onPress={() => judgeChoice(i)}
            style={({ pressed }) => [
              styles.choice,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={styles.choiceText}>
              {c}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    );
  }

  // order
  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary">
        일어난 차례대로 눌러 주세요 ({picked.length}/{shuffled.length})
      </ThemedText>
      {shuffled.map((item, i) => {
        const at = picked.indexOf(i);
        const taken = at >= 0;
        return (
          <Pressable
            key={i}
            onPress={() => pickOrder(i)}
            style={({ pressed }) => [
              styles.orderRow,
              { backgroundColor: theme.backgroundElement, borderColor: taken ? theme.accent : theme.border },
              taken && styles.orderTaken,
              pressed && styles.pressed,
            ]}>
            <View
              style={[
                styles.orderNum,
                { borderColor: taken ? theme.accent : theme.border },
                taken && { backgroundColor: theme.accent },
              ]}>
              <ThemedText type="smallBold" style={taken ? styles.onAccent : undefined}>
                {taken ? at + 1 : ''}
              </ThemedText>
            </View>
            <ThemedText type="small" style={styles.orderText}>
              {item.text}
            </ThemedText>
          </Pressable>
        );
      })}
      {picked.length > 0 && (
        <Pressable onPress={() => setPicked([])} hitSlop={8} style={styles.clearRow}>
          <ThemedText type="small" themeColor="textSecondary">
            다시 고르기
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, marginTop: Spacing.two },
  digitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  digitBox: {
    width: 48,
    height: 58,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unit: { marginLeft: 4 },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.two,
  },
  key: {
    width: 76,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17 },
  primaryButton: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  onAccent: { color: '#fff' },
  choice: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  choiceText: { lineHeight: 21 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  orderTaken: { opacity: 0.85 },
  orderNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: { flex: 1, minWidth: 0, lineHeight: 20 },
  clearRow: { alignSelf: 'flex-end', paddingVertical: 4 },
  pressed: { opacity: 0.7 },
});
