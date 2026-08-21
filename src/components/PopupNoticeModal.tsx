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
 * 기간이 지났는지는 여기서 따지지 않는다 — DB 정책이 이미 걸러서 내려준다.
 * 화면에서 또 따지면 규칙이 두 군데가 되고, 기기 시계가 틀어졌을 때 지난
 * 공지가 뜬다.
 *
 * "오늘 하루 보지 않기"는 기기에만 남긴다. 사람마다 기기가 다르고, 서버에
 * 둘 만큼 중요한 기록도 아니다. 공지마다 따로 기억한다 — 어제 본 공지 때문에
 * 오늘 올라온 새 공지를 못 보면 안 된다.
 */
export function PopupNoticeModal() {
  const theme = useTheme();
  const [notice, setNotice] = useState<PopupNotice | null>(null);
  const [visible, setVisible] = useState(false);

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            {notice.imageUrl ? (
              <Image
                source={{ uri: notice.imageUrl }}
                style={styles.image}
                // 그림 비율을 모르므로 잘라내지 않고 통째로 보여 준다. 잘라내면
                // 안내문이 적힌 포스터의 글씨가 잘려 나간다.
                resizeMode="contain"
              />
            ) : null}

            <ThemedText type="subtitle" style={styles.title}>
              {notice.title}
            </ThemedText>

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
    maxHeight: '80%',
    borderRadius: Spacing.four,
    overflow: 'hidden',
  },
  cardContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  image: {
    width: '100%',
    height: 220,
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
