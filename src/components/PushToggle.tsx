import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  isPushOn,
  isPushSupported,
  needsHomeScreen,
  turnPushOff,
  turnPushOn,
} from '@/db/push';

/**
 * 알림 받기 켜고 끄기.
 *
 * 목자의 편지와 알림마당에 새 글이 올라오면 폰 알림창에 띄운다. 앱을 열어 두지
 * 않아도 온다.
 *
 * **웹에서만 보인다.** 폰 앱(네이티브)에는 이 기능이 통째로 없다 — 브라우저가
 * 대신 전해 주는 방식이라 그렇다. 없는 자리에 단추만 두면 눌러도 아무 일이
 * 안 일어나므로 아예 감춘다.
 */
export function PushToggle() {
  const theme = useTheme();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [homeNeeded, setHomeNeeded] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const ok = isPushSupported();
    setSupported(ok);
    setHomeNeeded(needsHomeScreen());
    if (ok) isPushOn().then(setOn);
  }, []);

  const toggle = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    const result = on ? await turnPushOff() : await turnPushOn();
    setBusy(false);
    if (result.error) setMessage(result.error);
    else setOn(!on);
  }, [on]);

  if (supported === null || !supported) {
    // 아이폰 사파리는 홈 화면에 추가해야 이 기능들이 생긴다. 그 사실을 안
    // 알려 주면 "왜 알림이 안 오지"가 된다.
    if (homeNeeded) {
      return (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">🔔 알림을 받으시려면</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            아이폰은 홈 화면에 추가해야 알림이 옵니다. 사파리 아래 공유 단추를 누르고 「홈 화면에
            추가」를 고른 뒤, 홈 화면의 데이빗바이블을 열어 여기서 켜 주세요.
          </ThemedText>
        </View>
      );
    }
    return null;
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <ThemedText type="smallBold">🔔 {on ? '알림을 받고 있어요' : '새 글 알림 받기'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            목자의 편지와 알림마당에 새 글이 올라오면 알려 드려요.
          </ThemedText>
        </View>
        <Pressable
          disabled={busy}
          onPress={toggle}
          style={[
            styles.button,
            {
              backgroundColor: on ? 'transparent' : theme.backgroundSelected,
              borderColor: theme.border,
              borderWidth: on ? 1 : 0,
              opacity: busy ? 0.5 : 1,
            },
          ]}>
          {busy ? (
            <ActivityIndicator size="small" />
          ) : (
            <ThemedText type="smallBold">{on ? '끄기' : '켜기'}</ThemedText>
          )}
        </Pressable>
      </View>
      {message ? (
        <ThemedText type="small" themeColor="support">
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Spacing.three, padding: Spacing.four, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  textCol: { flex: 1, gap: Spacing.one },
  button: {
    minHeight: 44,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
});
