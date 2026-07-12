import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getPlans, type ReadingPlan } from '@/db/plans';

export default function PlansScreen() {
  const theme = useTheme();
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getPlans()
      .then(setPlans)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Supabase가 아직 설정되지 않았습니다.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator style={styles.centerText} />
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                {error ? '읽기 계획을 불러오지 못했습니다.' : '아직 등록된 읽기 계획이 없습니다.'}
              </ThemedText>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/plans/${item.slug}`)}
              style={({ pressed }) => [
                styles.planRow,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              {item.description && (
                <ThemedText type="small" themeColor="textSecondary">
                  {item.description}
                </ThemedText>
              )}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  listContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  planRow: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
