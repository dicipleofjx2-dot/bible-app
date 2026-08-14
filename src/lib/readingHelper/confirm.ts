import { Alert, Platform } from 'react-native';

/** 되돌릴 수 없는 동작을 하기 전 확인을 받는다.
 *
 * react-native의 Alert은 웹에서 신뢰할 수 없다(버튼이 안 뜨거나 조용히 무시된다).
 * 데이빗바이블은 웹에서도 그대로 쓰이므로, 웹에서는 브라우저 confirm을 쓴다.
 * 확인 없이 지워지는 사고를 막아야 하는 자리에만 쓸 것. */
export function confirmDestructive(title: string, message: string, confirmLabel = '확인'): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return Promise.resolve(false);
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
