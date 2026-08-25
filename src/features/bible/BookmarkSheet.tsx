import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Bookmark } from '@/db/userData';
import { useT } from '@/lib/i18n';
import type { StringKey } from '@/constants/strings';

/** 문구를 그 언어로 바꾸는 함수. 화면 밖 순수 함수에는 이것을 넘겨 준다. */
type Translate = (key: StringKey, params?: Record<string, string | number>) => string;

/** 목록에 뿌리기 좋게 책 이름을 붙인 책갈피. */
export type BookmarkWithBook = Bookmark & { bookName: string };

type Props = {
  visible: boolean;
  /** 지금 화면에 열려 있는 자리 — "여기 꽂기"가 가리키는 곳. */
  currentLabel: string;
  /** 이 장에 이미 꽂혀 있으면 그 책갈피. 있으면 꽂기 대신 빼기를 보여 준다. */
  currentBookmark: BookmarkWithBook | null;
  bookmarks: BookmarkWithBook[];
  onAdd: () => void;
  onJump: (bookmark: BookmarkWithBook) => void;
  onDelete: (bookmark: BookmarkWithBook) => void;
  onClose: () => void;
};

function formatDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/**
 * 장 안에서 어디쯤이었는지를 말로 적는다.
 *
 * 절 번호를 알면 그걸 쓰고(→ positionLabel), 못 쟀을 때 여기로 내려온다.
 * 그럴 땐 "몇 절"이라고 지어내지 않고 아는 만큼만 — 장의 어느 쯤이었는지만 —
 * 적는다. 돌아가는 자리 자체는 어느 쪽이든 정확하다.
 */
export function positionText(t: Translate, scrollY: number, contentHeight: number): string {
  if (scrollY <= 8) return t('bm.atStart');
  // 전체 길이를 모르면 어디쯤인지도 알 수 없다. 모르면서 "첫머리"라고 적으면
  // 틀린 말을 하게 되므로, 이럴 땐 아무 말도 덧붙이지 않는다.
  if (contentHeight <= 0) return '';
  const ratio = scrollY / contentHeight;
  if (ratio < 0.3) return t('bm.nearStart');
  if (ratio < 0.6) return t('bm.middle');
  return t('bm.nearEnd');
}

/**
 * 목록 한 줄에 적을 이름. "창세기 3장 12절" 또는 "창세기 3장 · 뒷부분".
 *
 * 절 번호가 있으면 그게 훨씬 나은 이름이다 — 사람은 "뒷부분"이 아니라 "몇 절"로
 * 자기 자리를 기억한다. 다만 절 번호는 화면을 그려야 잴 수 있어서 없을 수도
 * 있고(예전에 꽂아 둔 책갈피, 측정이 늦은 기기), 그럴 땐 원래대로 적는다.
 */
export function positionLabel(
  t: Translate,
  bookName: string,
  chapter: number,
  verse: number | null,
  scrollY: number,
  contentHeight: number
): string {
  // 「창세기 3장 12절」과 "Genesis 3:12" 는 이어 붙이는 방식이 아예 다르다.
  // 머리말을 만들어 뒤에 덧붙이는 식으로는 어느 한쪽이 반드시 어색해진다.
  if (verse != null && verse > 0) {
    return t('bm.refVerse', { book: bookName, chapter, verse });
  }
  const where = positionText(t, scrollY, contentHeight);
  return where
    ? t('bm.refWhere', { book: bookName, chapter, where })
    : t('read.bookChapter', { book: bookName, chapter });
}

export function BookmarkSheet({
  visible,
  currentLabel,
  currentBookmark,
  bookmarks,
  onAdd,
  onJump,
  onDelete,
  onClose,
}: Props) {
  const theme = useTheme();
  const t = useT();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 안쪽을 눌렀을 때 창이 닫히지 않도록 누름을 여기서 멈춘다. */}
        <Pressable onPress={() => {}}>
          <ThemedView type="background" style={[styles.sheet, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">{t('bm.title')}</ThemedText>

            {currentBookmark ? (
              <Pressable
                onPress={() => onDelete(currentBookmark)}
                style={[styles.addButton, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{t('bm.remove')}</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={onAdd}
                style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{t('bm.add', { label: currentLabel })}</ThemedText>
              </Pressable>
            )}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {bookmarks.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  {t('bm.empty')}
                </ThemedText>
              ) : (
                bookmarks.map((b) => (
                  <View key={b.id} style={[styles.row, { borderColor: theme.backgroundElement }]}>
                    <Pressable style={styles.rowMain} onPress={() => onJump(b)}>
                      <ThemedText type="smallBold">
                        {positionLabel(t, b.bookName, b.chapter, b.verse, b.scroll_y, b.content_height)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatDate(b.created_at)}
                      </ThemedText>
                    </Pressable>
                    <Pressable hitSlop={10} style={styles.removeButton} onPress={() => onDelete(b)}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('bm.delete')}
                      </ThemedText>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <ThemedText type="link" themeColor="textSecondary">
                {t('bm.close')}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  addButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  list: {
    marginTop: Spacing.one,
    // 창 전체 높이를 %로 묶으면 부모에 정해진 높이가 없어 목록이 납작하게
    // 눌려 버린다. 목록 자체에 상한을 두면 책갈피가 적을 땐 딱 그만큼만
    // 차지하고, 많아지면 이 안에서 굴러간다.
    maxHeight: 320,
    flexGrow: 0,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: 1,
    paddingBottom: Spacing.two,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  removeButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  closeButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
});
