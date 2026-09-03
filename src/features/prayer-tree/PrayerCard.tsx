import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { fruitPhotoUrl, type PrayerFruit, type PrayerTopic } from '@/db/prayerTree';
import { useTheme } from '@/hooks/use-theme';
import { fruitLook, ripenessLabel } from '@/lib/prayerTree';

export type PrayerCardProps = {
  fruit: PrayerFruit | null;
  onClose: () => void;
  onToggleAnswered: (topic: PrayerTopic, answered: boolean) => void;
  onAddTopic: (body: string) => void;
  onDeleteTopic: (topic: PrayerTopic) => void;
  /** 저장이 도는 동안 두 번 눌리지 않게 */
  busy?: boolean;
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 열매를 누르면 나오는 기도카드.
 *
 * 테두리를 그린 종이 한 장처럼 보이게 두었다 — 열매의 익은 색이 카드 테두리와
 * 머리에 그대로 이어져야, 「이 열매가 그 카드」라는 것이 설명 없이 읽힌다.
 */
export function PrayerCard({
  fruit,
  onClose,
  onToggleAnswered,
  onAddTopic,
  onDeleteTopic,
  busy = false,
}: PrayerCardProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  if (!fruit) return null;

  const answered = fruit.topics.filter((t) => t.answered).length;
  const look = fruitLook(fruit.topics.length, answered);
  const photo = fruitPhotoUrl(fruit.photo_path);

  function submit() {
    const body = draft.trim();
    if (!body) return;
    onAddTopic(body);
    setDraft('');
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 카드 안을 눌러도 닫히지 않게 — 바깥 Pressable 로 눌림이 올라가는 것을 막는다 */}
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.backgroundElement, borderColor: look.outline },
          ]}
          onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.cardBody} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: look.color, borderColor: look.outline },
                ]}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatarPhoto} />
                ) : (
                  <ThemedText style={styles.avatarInitial}>
                    {fruit.name.trim().slice(0, 1) || '?'}
                  </ThemedText>
                )}
              </View>
              <View style={styles.headerText}>
                <ThemedText type="subtitle">{fruit.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {ripenessLabel(fruit.topics.length, answered)}
                </ThemedText>
              </View>
            </View>

            {fruit.memo ? (
              <ThemedText type="small" style={styles.memo} themeColor="textSecondary">
                {fruit.memo}
              </ThemedText>
            ) : null}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {fruit.topics.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                아직 기도제목이 없어요. 아래에 적어 주세요.
              </ThemedText>
            ) : (
              fruit.topics.map((topic) => (
                <View key={topic.id} style={styles.topicRow}>
                  <Pressable
                    onPress={() => onToggleAnswered(topic, !topic.answered)}
                    disabled={busy}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: topic.answered }}
                    style={[
                      styles.check,
                      {
                        borderColor: topic.answered ? theme.done : theme.border,
                        backgroundColor: topic.answered ? theme.done : 'transparent',
                      },
                    ]}>
                    {topic.answered ? <ThemedText style={styles.checkMark}>✓</ThemedText> : null}
                  </Pressable>
                  <View style={styles.topicText}>
                    <ThemedText
                      style={topic.answered ? styles.topicAnswered : undefined}
                      themeColor={topic.answered ? 'textSecondary' : 'text'}>
                      {topic.body}
                    </ThemedText>
                    {topic.answered ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        🙌 응답 {formatDate(topic.answered_at)}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => onDeleteTopic(topic)}
                    disabled={busy}
                    accessibilityLabel="기도제목 지우기"
                    style={styles.topicDelete}>
                    <ThemedText type="small" themeColor="textSecondary">
                      ✕
                    </ThemedText>
                  </Pressable>
                </View>
              ))
            )}

            <View style={styles.addRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="기도제목 추가"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
              <Pressable
                onPress={submit}
                disabled={busy || !draft.trim()}
                style={[
                  styles.addButton,
                  { backgroundColor: theme.accent, opacity: busy || !draft.trim() ? 0.5 : 1 },
                ]}>
                <ThemedText type="smallBold" style={styles.addButtonText}>
                  추가
                </ThemedText>
              </Pressable>
            </View>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <ThemedText type="link" themeColor="textSecondary">
                닫기
              </ThemedText>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,14,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 18,
    borderWidth: 3,
    overflow: 'hidden',
  },
  cardBody: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPhoto: { width: 44, height: 44, borderRadius: 22 },
  avatarInitial: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerText: { flex: 1 },
  memo: { marginTop: 2 },
  divider: { height: 1, marginVertical: Spacing.one },
  empty: { paddingVertical: Spacing.two },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: 6,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  topicText: { flex: 1 },
  topicAnswered: { textDecorationLine: 'line-through' },
  topicDelete: { padding: 4 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: { color: '#FFFFFF' },
  closeButton: { alignItems: 'center', paddingTop: Spacing.two },
});
