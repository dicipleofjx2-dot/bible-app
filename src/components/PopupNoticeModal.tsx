import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getActivePopupNotice, type PopupNotice } from '@/db/popupNotices';

const DISMISS_KEY_PREFIX = 'popup-dismissed:';

/** 오늘 날짜(기기 시간 기준) — "오늘 하루 안 보기"를 재는 데 쓴다. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 앱을 열자마자 한 번 보여 주는 알림 팝업.
 *
 * 기간이 지났는지는 여기서 따지지 않는다 — 가져오는 쪽(getActivePopupNotice)이
 * 서버 시계로 이미 걸러서 준다. 기기 시계는 쓰지 않는다. 시계가 틀어진 폰에서
 * 지난 공지가 되살아나기 때문이다.
 *
 * "오늘 하루 보지 않기"는 기기에만 남긴다. 사람마다 기기가 다르고, 서버에
 * 둘 만큼 중요한 기록도 아니다. 공지마다 따로 기억한다 — 어제 본 공지 때문에
 * 오늘 올라온 새 공지를 못 보면 안 된다.
 */
export function PopupNoticeModal() {
  const theme = useTheme();
  const [notice, setNotice] = useState<PopupNotice | null>(null);
  const [visible, setVisible] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const found = await getActivePopupNotice();
      if (!found) return;
      const dismissed = await AsyncStorage.getItem(DISMISS_KEY_PREFIX + found.id);
      if (dismissed === today()) return;
      setNotice(found);
      setVisible(true);
    } catch {
      // 팝업 하나 때문에 앱이 멈추면 안 된다. 조용히 넘어간다.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 그림의 가로세로 비율을 그림에게 물어본다.
   *
   * 높이를 220 으로 박아 두었더니 세로 포스터가 그 안에 다 들어가느라 글씨가
   * 깨알만 해졌다 — 포스터를 올리는 뜻이 사라진다. 비율을 알면 폭을 꽉 채우고
   * 높이는 그림이 정하게 할 수 있다. 넘치는 만큼은 카드 안에서 스크롤된다.
   */
  useEffect(() => {
    const url = notice?.imageUrl;
    if (!url) return;
    let alive = true;
    Image.getSize(
      url,
      (w, h) => {
        if (alive && h > 0) setRatio(w / h);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [notice?.imageUrl]);

  function close() {
    setVisible(false);
  }

  async function dismissToday() {
    if (notice) await AsyncStorage.setItem(DISMISS_KEY_PREFIX + notice.id, today()).catch(() => {});
    setVisible(false);
  }

  function openLink() {
    if (!notice?.linkUrl) return;
    setVisible(false);
    // 앱 안 경로면 앱 안에서 연다. 바깥 주소를 router에 넣으면 아무 일도 안 난다.
    if (notice.linkUrl.startsWith('/')) router.push(notice.linkUrl as never);
    else void Linking.openURL(notice.linkUrl);
  }

  if (!notice) return null;

  // 포스터 한 장에 할 말이 다 적혀 있는 공지가 있다. 그 위에 제목을 또 얹으면
  // 같은 말이 두 번 나오고, 폰에서는 큰 글씨가 두 줄로 접혀 포스터를 밀어낸다.
  // 그래서 **그림이 있고 쓴 글이 없으면 그림만** 보여 준다.
  const pictureOnly = !!notice.imageUrl && !notice.body;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            {notice.imageUrl ? (
              <Image
                source={{ uri: notice.imageUrl }}
                // 비율을 아직 모를 때는 세로 포스터 쪽으로 잡아 둔다. 거의 다
                // 세로이고, 틀려도 잘라내지 않으므로 잠깐 여백이 생길 뿐이다.
                style={[styles.image, { aspectRatio: ratio ?? 3 / 4 }]}
                // 잘라내지 않는다. 잘라내면 안내문의 글씨가 잘려 나간다.
                resizeMode="contain"
              />
            ) : null}

            {pictureOnly ? null : (
              <ThemedText type="subtitle" style={styles.title}>
                {notice.title}
              </ThemedText>
            )}

            {notice.body ? (
              <ThemedText style={styles.body} themeColor="textSecondary">
                {notice.body}
              </ThemedText>
            ) : null}

            {notice.linkUrl ? (
              <Pressable
                onPress={openLink}
                style={[styles.linkButton, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{notice.linkLabel || '자세히 보기'}</ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Pressable onPress={dismissToday} style={styles.footerButton}>
              <ThemedText type="small" themeColor="textSecondary">
                오늘 하루 보지 않기
              </ThemedText>
            </Pressable>
            <Pressable onPress={close} style={styles.footerButton}>
              <ThemedText type="smallBold">닫기</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    // 긴 안내문이 와도 화면을 넘지 않게. 넘치는 만큼은 안에서 스크롤된다.
    maxHeight: '88%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  cardContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  image: {
    width: '100%',
    // 높이는 aspectRatio 가 정한다 — 그림이 스스로 키를 말한다.
    borderRadius: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    lineHeight: 22,
  },
  linkButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
