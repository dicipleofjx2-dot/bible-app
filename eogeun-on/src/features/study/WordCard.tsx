import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { Badge, Button, Card, Row } from '@/features/ui';
import { useTheme } from '@/hooks/use-theme';
import { KIND_LABEL } from '@/lib/roots';
import { speak } from '@/lib/speech';
import { stripBrackets } from '@/lib/questions';
import type { Word } from '@/lib/types';

const POS: Record<Word['pos'], string> = { n: '명사', v: '동사', adj: '형용사', adv: '부사', phr: '표현' };

export function SpeakButton({ text, label = '🔊 듣기' }: { text: string; label?: string }) {
  return (
    <Row>
      <Button variant="secondary" label={label} onPress={() => speak(text)} />
      <Button variant="ghost" label="🐢 천천히" onPress={() => speak(text, true)} />
    </Row>
  );
}

/** 형태소 분해 — 조각마다 뜻을 달고, 종류(접두사·어근…)를 작게 붙인다. */
export function MorphLine({ word }: { word: Word }) {
  const theme = useTheme();
  if (!word.morph) return null;
  return (
    <Row style={{ alignItems: 'center' }}>
      {word.morph.map((m, i) => (
        <View key={m.part + i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          {i > 0 ? <ThemedText themeColor="textSecondary">+</ThemedText> : null}
          <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
            <ThemedText style={{ fontWeight: '700', fontSize: 17 }}>{m.part}</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.caption}>{m.meaning}</ThemedText>
            <ThemedText themeColor="textSecondary" style={{ fontSize: 11 }}>{KIND_LABEL[m.kind]}</ThemedText>
          </View>
        </View>
      ))}
    </Row>
  );
}

/**
 * 단어 카드(§5-3). `infer` 면 분해를 먼저 보여 주고 뜻을 예상하게 한 뒤에
 * 뜻을 연다(§4.3 「rewrite 의 뜻을 예상하게 한 뒤 예문에서 확인」).
 */
export function WordCard({
  word,
  revealed = true,
  onReveal,
  autoSpeak = true,
}: {
  word: Word;
  revealed?: boolean;
  onReveal?: () => void;
  autoSpeak?: boolean;
}) {
  useEffect(() => {
    if (autoSpeak) speak(word.en);
  }, [word.en, autoSpeak]);

  return (
    <Card style={{ gap: Spacing.three }}>
      <View style={{ gap: Spacing.one }}>
        <Row style={{ alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 40, lineHeight: 48, fontWeight: '800' }}>{word.en}</ThemedText>
          <Badge label={POS[word.pos]} />
        </Row>
        <SpeakButton text={word.en} />
      </View>

      {word.morph ? (
        <View style={{ gap: Spacing.two }}>
          <MorphLine word={word} />
          {!revealed ? (
            <>
              <ThemedText style={Type.body}>조각의 뜻을 합치면 무슨 뜻일까요? 머릿속으로 예상해 보세요.</ThemedText>
              <Button label="뜻 확인하기" onPress={() => onReveal?.()} />
            </>
          ) : null}
        </View>
      ) : null}

      {revealed ? (
        <>
          <ThemedText style={{ fontSize: 24, lineHeight: 32, fontWeight: '700' }}>{word.ko.split(';').map((s) => s.trim()).join(' · ')}</ThemedText>
          <Pressable onPress={() => speak(word.example)} accessibilityRole="button" accessibilityLabel="예문 듣기">
            <ThemedText style={[Type.body, { fontSize: 18 }]}>🔈 {stripBrackets(word.example)}</ThemedText>
            <ThemedText themeColor="textSecondary" style={Type.body}>{word.exampleKo}</ThemedText>
          </Pressable>
          {word.caution ? (
            <Card tone="gold" style={{ padding: Spacing.two }}>
              <ThemedText style={Type.itemDescription}>⚠️ {word.caution}</ThemedText>
            </Card>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
