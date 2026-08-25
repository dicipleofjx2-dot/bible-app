import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { pingCheckin } from '@/db/r2m';
import { getAllGratitudeEntries, getGratitudeEntry, upsertGratitudeEntry, type GratitudeEntry } from '@/db/userData';

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function GratitudeScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const { session } = useAuth();
  const today = todayDateString();

  const [item1, setItem1] = useState('');
  const [item2, setItem2] = useState('');
  const [item3, setItem3] = useState('');
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<GratitudeEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      getGratitudeEntry(today).then((entry) => {
        setItem1(entry?.item1 ?? '');
        setItem2(entry?.item2 ?? '');
        setItem3(entry?.item3 ?? '');
        setSaved(false);
      });
      getAllGratitudeEntries().then(setHistory);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [today]),
  );

  async function save() {
    await upsertGratitudeEntry({ date: today, item1, item2, item3 });
    setSaved(true);
    getAllGratitudeEntries().then(setHistory);
    if (session && (item1.trim() || item2.trim() || item3.trim())) {
      pingCheckin(session.user.id, today, { gratitude: true }).catch(() => {});
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            {t('r2m.gratitude.title')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('r2m.gratitude.subtitle')}
          </ThemedText>

          <View style={styles.form}>
            {[
              { value: item1, setter: setItem1, placeholder: t('r2m.gratitude.placeholder', { n: 1 }) },
              { value: item2, setter: setItem2, placeholder: t('r2m.gratitude.placeholder', { n: 2 }) },
              { value: item3, setter: setItem3, placeholder: t('r2m.gratitude.placeholder', { n: 3 }) },
            ].map((row, i) => (
              <TextInput
                key={i}
                value={row.value}
                onChangeText={(v) => {
                  row.setter(v);
                  setSaved(false);
                }}
                placeholder={row.placeholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
            ))}
            <Pressable
              onPress={save}
              style={[styles.saveButton, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={styles.saveButtonText}>
                {saved ? t('r2m.gratitude.saved') : t('r2m.gratitude.save')}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.historySection}>
            <ThemedText type="smallBold">{t('r2m.gratitude.past')}</ThemedText>
            {history
              .filter((e) => e.date !== today)
              .map((entry) => (
                <View key={entry.id} style={[styles.historyRow, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {entry.date}
                  </ThemedText>
                  {[entry.item1, entry.item2, entry.item3].filter(Boolean).map((item, i) => (
                    <ThemedText key={i} type="small">
                      • {item}
                    </ThemedText>
                  ))}
                </View>
              ))}
            {history.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {t('r2m.gratitude.empty')}
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
  },
  form: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    marginTop: Spacing.one,
  },
  saveButtonText: {
    color: '#ffffff',
  },
  historySection: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  historyRow: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
