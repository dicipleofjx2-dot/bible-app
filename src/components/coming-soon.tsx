import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type ComingSoonProps = {
  emoji: string;
  title: string;
  description?: string;
};

export function ComingSoon({ emoji, title, description }: ComingSoonProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <ThemedText style={styles.emoji}>{emoji}</ThemedText>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {description ?? '이 기능은 아직 준비 중입니다. 곧 만나보실 수 있어요!'}
          </ThemedText>
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
