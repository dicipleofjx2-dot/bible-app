import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type ComingSoonProps = {
  emoji: string;
  title: string;
  description?: string;
  /** ISO date (YYYY-MM-DD), e.g. passed in from the 달력 screen's linked-date actions. */
  date?: string;
};

export function ComingSoon({ emoji, title, description, date }: ComingSoonProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <ThemedText style={styles.emoji}>{emoji}</ThemedText>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {description ?? '이 기능은 아직 준비 중입니다. 곧 만나보실 수 있어요!'}
          </ThemedText>
          {date && (
            <ThemedText type="small" themeColor="textSecondary">
              {date} 항목이 준비되는 대로 여기에서 볼 수 있어요.
            </ThemedText>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emoji: {
    fontSize: 48,
  },
  description: {
    textAlign: 'center',
  },
});
