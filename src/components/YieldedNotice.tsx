import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { reclaimHere } from '@/lib/tabPresence';

/**
 * 자리를 내주고 물러난 탭이 보는 화면.
 *
 * 웹에서 이 앱은 브라우저 저장소를 한 탭만 잡을 수 있다. 다른 탭에서 앱을 열면
 * 이 탭이 스스로 물러난다 — 사용자가 지금 보고 있는 탭이 이기는 것이 옳기
 * 때문이다.
 *
 * 다만 물러난 탭을 빈 화면으로 두지는 않는다. 돌아올 길을 남긴다. 이 단추를
 * 누르면 반대로 저쪽이 물러나고 여기서 다시 열린다.
 *
 * 여기서 DB를 열지 않는 것이 중요하다. 물러난 탭이 다시 잡으러 들면 두 탭이
 * 서로 뺏느라 새로고침만 반복한다.
 */
export function YieldedNotice() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="smallBold" style={styles.title}>
          다른 탭에서 열었어요
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
          데이빗바이블은 한 번에 한 탭에서만 열립니다. 방금 연 탭으로 자리를 넘겼어요.
          여기서 계속 보시려면 아래를 눌러 주세요.
        </ThemedText>
        <Pressable onPress={reclaimHere} style={styles.button}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            여기서 열기
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  card: { gap: Spacing.three, maxWidth: 360, alignItems: 'center' },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', lineHeight: 20 },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#1e2a4a',
  },
  buttonText: { color: '#ffffff' },
});
