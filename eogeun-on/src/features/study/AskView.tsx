import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { Button, Card, Row } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { grade, stripBrackets, type Grading, type Question } from '@/lib/questions';
import { speak } from '@/lib/speech';
import { REASON_LABEL, SLOW_MS, type Outcome } from '@/lib/srs';
import type { Word } from '@/lib/types';

const KIND_TITLE: Record<Question['kind'], string> = {
  en2ko: '뜻을 떠올려 보세요',
  ko2en: '영어로 떠올려 보세요',
  listen: '듣고 단어를 찾으세요',
  cloze: '빈칸에 알맞은 말은?',
};

/**
 * 한 화면 한 문제(§5-4).
 *
 * - 영어→뜻은 **먼저 떠올린 뒤** 「보기 열기」를 눌러야 보기가 나온다. 시간도
 *   그때부터 잰다 — 떠올리는 데 쓴 시간을 「느림」으로 치지 않는다.
 * - 힌트를 열면 맞혀도 「도움 받음」으로 기록된다(예약 칸이 오르지 않는다).
 * - 답하면 **그 자리에서** 맞고 틀림을 보여 주고, 틀렸으면 카드 내용을 다시 보인다.
 */
export function AskView({
  q,
  word,
  onRecord,
  onNext,
}: {
  q: Question;
  word: Word;
  onRecord: (o: Outcome) => void;
  onNext: (ok: boolean, reason?: Outcome['reason']) => void;
}) {
  const theme = useTheme();
  const [opened, setOpened] = useState(q.kind !== 'en2ko');
  const [hinted, setHinted] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState<(Grading & { given: string }) | null>(null);
  const started = useRef(Date.now());

  useEffect(() => {
    started.current = Date.now();
    if (q.kind === 'listen') speak(word.en);
  }, [q, word.en]);

  function submit(given: string) {
    if (result) return;
    const g = grade(q, word, given);
    const ms = Date.now() - started.current;
    setResult({ ...g, given });
    onRecord({ kind: q.kind, ok: g.ok, hinted, ms, slow: ms > SLOW_MS[q.mode], reason: g.reason });
    if (!g.ok || q.kind !== 'listen') speak(g.ok ? word.en : q.answer);
  }

  function open() {
    setOpened(true);
    started.current = Date.now();
  }

  return (
    <View style={{ gap: Spacing.three }}>
      <ThemedText themeColor="textSecondary" style={Type.sectionTitle}>{KIND_TITLE[q.kind]}</ThemedText>

      <Card style={{ gap: Spacing.two, alignItems: 'center', paddingVertical: Spacing.four }}>
        {q.kind === 'listen' ? (
          <Row style={{ justifyContent: 'center' }}>
            <Button big label="🔊 다시 듣기" onPress={() => speak(word.en)} />
            <Button variant="secondary" label="🐢 천천히" onPress={() => speak(word.en, true)} />
          </Row>
        ) : q.kind === 'cloze' ? (
          <ThemedText style={{ fontSize: 22, lineHeight: 34, fontWeight: '600', textAlign: 'center' }}>{q.prompt}</ThemedText>
        ) : (
          <ThemedText style={{ fontSize: q.kind === 'en2ko' ? 40 : 26, lineHeight: q.kind === 'en2ko' ? 48 : 36, fontWeight: '800', textAlign: 'center' }}>
            {q.prompt}
          </ThemedText>
        )}
        {q.kind === 'en2ko' ? <Button variant="ghost" label="🔊" onPress={() => speak(word.en)} /> : null}
        {hinted && q.hint ? (
          <ThemedText themeColor="textSecondary" style={[Type.body, { textAlign: 'center' }]}>💡 {q.hint}</ThemedText>
        ) : null}
      </Card>

      {!result ? (
        <>
          {!opened ? (
            <>
              <ThemedText themeColor="textSecondary" style={[Type.body, { textAlign: 'center' }]}>
                머릿속으로 뜻을 먼저 말해 보고, 보기를 여세요.
              </ThemedText>
              <Button big label="떠올렸어요 · 보기 열기" onPress={open} />
            </>
          ) : q.mode === 'choice' && q.options ? (
            <View style={{ gap: Spacing.two }}>
              {q.options.map((o) => (
                <Button key={o} big variant="secondary" label={o} onPress={() => submit(o)} />
              ))}
            </View>
          ) : (
            <View style={{ gap: Spacing.two }}>
              <TextInput
                value={text}
                onChangeText={setText}
                onSubmitEditing={() => submit(text)}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                placeholder="영어로 입력"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                style={{
                  borderWidth: 2,
                  borderColor: theme.accent,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 22,
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  textAlign: 'center',
                }}
              />
              <Button big label="확인" onPress={() => submit(text)} disabled={!text.trim()} />
            </View>
          )}
          <Row style={{ justifyContent: 'center' }}>
            {q.hint && !hinted && opened ? <Button variant="ghost" label="💡 힌트 보기" onPress={() => setHinted(true)} /> : null}
            <Button variant="ghost" label="모르겠어요" onPress={() => submit('')} />
          </Row>
        </>
      ) : (
        <View style={{ gap: Spacing.three }}>
          <Card tone={result.ok ? 'good' : 'bad'}>
            <ThemedText style={[Type.itemTitle, { color: result.ok ? theme.good : theme.bad }]}>
              {result.ok ? (hinted ? '⭕ 맞았어요 (힌트 사용)' : '⭕ 맞았어요!') : '✖ 아쉬워요'}
            </ThemedText>
            {!result.ok ? (
              <>
                <ThemedText style={Type.body}>
                  정답: <ThemedText style={{ fontWeight: '800' }}>{q.answer}</ThemedText>
                  {result.given ? `  (내 답: ${result.given})` : ''}
                </ThemedText>
                {result.reason ? <ThemedText themeColor="textSecondary" style={Type.caption}>틀린 까닭: {REASON_LABEL[result.reason]}</ThemedText> : null}
                {result.note ? <ThemedText style={Type.itemDescription}>{result.note}</ThemedText> : null}
                <ThemedText style={Type.body}>
                  {word.en} — {word.ko.split(';').map((s) => s.trim()).join(' · ')}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                  {stripBrackets(word.example)} / {word.exampleKo}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={Type.caption}>조금 뒤에 다른 방식으로 다시 물어볼게요.</ThemedText>
              </>
            ) : (
              <ThemedText themeColor="textSecondary" style={Type.body}>
                {word.en} — {word.ko.split(';')[0]}
              </ThemedText>
            )}
          </Card>
          <Button big label="다음 →" onPress={() => onNext(result.ok, result.reason)} />
        </View>
      )}
    </View>
  );
}
