import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLetterById, type ShepherdLetterWithParagraphs } from '@/db/shepherdLetters';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function ShepherdLetterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [letter, setLetter] = useState<ShepherdLetterWithParagraphs | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      getLetterById(id).then(setLetter).catch(() => setLetter(null));
    }, [id]),
  );

  if (!letter) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">편지를 찾을 수 없어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: letter.title }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {letter.coverUrl ? (
            <Image source={{ uri: letter.coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : null}

          <ThemedText type="subtitle">{letter.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(letter.createdAt)}
          </ThemedText>

          <View style={styles.body}>
            {letter.paragraphs.map((paragraph, i) => (
              <ThemedText key={i} style={styles.paragraph}>
                {paragraph}
              </ThemedText>
            ))}
          </View>

          {letter.imageUrls.length > 0 && (
            <View style={styles.gallery}>
              {letter.imageUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={[styles.galleryImage, { backgroundColor: theme.backgroundElement }]} resizeMode="cover" />
              ))}
            </View>
          )}
        </ScrollView>
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
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  body: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  paragraph: {
    lineHeight: 26,
  },
  gallery: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  galleryImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
  },
});
