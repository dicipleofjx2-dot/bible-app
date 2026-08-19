import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Bookmark } from '@/db/userData';

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
 * 몇 절이었는지까지는 알 수 없다(그러려면 절마다 화면 위치를 재야 하는데 웹에서
 * 그 신호가 오지 않는다). 그래서 "몇 절"이라고 지어내지 않고, 아는 만큼만 —
 * 장의 어느 쯤이었는지만 — 적는다. 돌아가는 자리 자체는 정확하다.
 */
export function positionText(scrollY: number, contentHeight: number): string {
  if (scrollY <= 8) return '첫머리';
  // 전체 길이를 모르면 어디쯤인지도 알 수 없다. 모르면서 "첫머리"라고 적으면
  // 틀린 말을 하게 되므로, 이럴 땐 아무 말도 덧붙이지 않는다.
  if (contentHeight <= 0) return '';
  const ratio = scrollY / contentHeight;
  if (ratio < 0.3) return '앞부분';
  if (ratio < 0.6) return '중간쯤';
  return '뒷부분';
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* 안쪽을 눌렀을 때 창이 닫히지 않도록 누름을 여기서 멈춘다. */}
        <Pressable onPress={() => {}}>
          <ThemedView type="background" style={[styles.sheet, { borderColor: theme.backgroundElement }]}>
            <ThemedText type="subtitle">책갈피</ThemedText>

            {currentBookmark ? (
              <Pressable
                onPress={() => onDelete(currentBookmark)}
                style={[styles.addButton, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">🔖 이 장의 책갈피 빼기</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={onAdd}
                style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">🔖 지금 이 자리에 꽂기 · {currentLabel}</ThemedText>
              </Pressable>
            )}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {bookmarks.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  아직 꽂아 둔 책갈피가 없습니다. 위 단추로 지금 보고 있는 자리를 꽂아 두면,
                  나중에 여기서 바로 그 자리로 올 수 있어요.
                </ThemedText>
              ) : (
                bookmarks.map((b) => (
                  <View key={b.id} style={[styles.row, { borderColor: theme.backgroundElement }]}>
                    <Pressable style={styles.rowMain} onPress={() => onJump(b)}>
                      <ThemedText type="smallBold">
                        {b.bookName} {b.chapter}장
                        {positionText(b.scroll_y, b.content_height)
                          ? ` · ${positionText(b.scroll_y, b.content_height)}`
                          : ''}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatDate(b.created_at)}
                      </ThemedText>
                    </Pressable>
                    <Pressable hitSlop={10} style={styles.removeButton} onPress={() => onDelete(b)}>
                      <ThemedText type="small" themeColor="textSecondary">
                        빼기
                      </ThemedText>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable onPress={onClose} style={styles.closeButton}>
              <ThemedText type="link" themeColor="textSecondary">
                닫기
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
