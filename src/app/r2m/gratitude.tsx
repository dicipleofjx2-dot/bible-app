import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { pingCheckin } from '@/db/r2m';
import {
  deleteGratitudeEntryById,
  getGratitudeEntryFor,
  getMyGratitudeJournal,
  getSharedGratitudeFeed,
  GRATITUDE_MAX_PHOTOS,
  gratitudePhotoUrl,
  removeGratitudePhoto,
  saveGratitudeEntry,
  syncLocalGratitudeOnce,
  uploadGratitudePhoto,
  type GratitudeJournalEntry,
  type SharedGratitudeEntry,
} from '@/db/gratitude';

function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026-09-02" → "9월 2일 수요일" / "Sep 2" */
function prettyDate(date: string, lang: 'ko' | 'en') {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (lang === 'en') return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${m}월 ${d}일 ${WEEKDAYS_KO[dt.getDay()]}요일`;
}

type Tab = 'mine' | 'shared';

/**
 * 감사일기장.
 *
 * 예전에는 입력칸 셋과 지난 기록 목록이 전부였고, 기록은 **기기 안에만** 있었다.
 * 휴대폰을 바꾸면 통째로 사라지고 사진도 못 넣었다. 이제 서버(0072)에 담고
 * 사진을 붙이며, 원하면 「함께 나누기」로 교회 식구들과 나눈다.
 *
 * 기본은 **나만 본다.** 나눈 글만 「함께 나눈 감사」에 뜬다.
 */
export default function GratitudeScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const today = todayDateString();

  const [tab, setTab] = useState<Tab>('mine');
  const [item1, setItem1] = useState('');
  const [item2, setItem2] = useState('');
  const [item3, setItem3] = useState('');
  const [note, setNote] = useState('');
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [journal, setJournal] = useState<GratitudeJournalEntry[]>([]);
  const [feed, setFeed] = useState<SharedGratitudeEntry[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    // 기기에만 있던 예전 감사를 한 번 올려 준다. 실패해도 화면은 그대로 연다.
    await syncLocalGratitudeOnce(userId).catch(() => {});

    const [entry, mine] = await Promise.all([
      getGratitudeEntryFor(userId, today),
      getMyGratitudeJournal(userId),
    ]);
    setItem1(entry?.item1 ?? '');
    setItem2(entry?.item2 ?? '');
    setItem3(entry?.item3 ?? '');
    setNote(entry?.note ?? '');
    setPhotoPaths(entry?.photoPaths ?? []);
    setIsShared(entry?.isShared ?? false);
    setJournal(mine);
    setSaved(false);
  }, [userId, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      if (tab !== 'shared') return;
      getSharedGratitudeFeed().then(setFeed).catch(() => setFeed([]));
    }, [tab]),
  );

  const past = useMemo(() => journal.filter((e) => e.date !== today), [journal, today]);

  async function addPhoto() {
    if (!userId) return;
    if (photoPaths.length >= GRATITUDE_MAX_PHOTOS) {
      setMessage(t('r2m.gratitude.photoLimit', { n: GRATITUDE_MAX_PHOTOS }));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (picked.canceled || !picked.assets[0]) return;

    setBusy(true);
    setMessage(null);
    const result = await uploadGratitudePhoto(userId, picked.assets[0].uri, picked.assets[0].mimeType);
    setBusy(false);
    if (result.error || !result.path) {
      setMessage(result.error ?? t('r2m.gratitude.photoFailed'));
      return;
    }
    setPhotoPaths((prev) => [...prev, result.path!]);
    setSaved(false);
  }

  async function dropPhoto(path: string) {
    setPhotoPaths((prev) => prev.filter((p) => p !== path));
    setSaved(false);
    await removeGratitudePhoto(path);
  }

  async function save() {
    if (!userId) return;
    setBusy(true);
    setMessage(null);
    const result = await saveGratitudeEntry({
      userId, date: today, item1, item2, item3, note, photoPaths, isShared,
    });
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setSaved(true);
    getMyGratitudeJournal(userId).then(setJournal);
    // 경건훈련 체크는 예전처럼 불리언 하나만 보낸다 — 내용은 보내지 않는다.
    if (item1.trim() || item2.trim() || item3.trim() || note.trim()) {
      pingCheckin(userId, today, { gratitude: true }).catch(() => {});
    }
  }

  async function removeEntry(entry: GratitudeJournalEntry) {
    await deleteGratitudeEntryById(entry.id);
    for (const p of entry.photoPaths) await removeGratitudePhoto(p);
    if (userId) getMyGratitudeJournal(userId).then(setJournal);
  }

  if (!userId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <View style={styles.content}>
            <ThemedText type="title" style={styles.title}>{t('r2m.gratitude.title')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{t('r2m.needLogin')}</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>{t('r2m.gratitude.title')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{t('r2m.gratitude.subtitle')}</ThemedText>

          {/* 내 일기장 / 함께 나눈 감사 */}
          <View style={[styles.tabs, { backgroundColor: theme.accentSoft }]}>
            {(['mine', 'shared'] as Tab[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold" themeColor={tab === key ? 'text' : 'textSecondary'}>
                  {key === 'mine' ? t('r2m.gratitude.tabMine') : t('r2m.gratitude.tabShared')}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {tab === 'mine' ? (
            <>
              {/* ── 오늘 쓰기 ── */}
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <View style={[styles.ribbon, { backgroundColor: theme.accentSoft }]}>
                  <ThemedText type="smallBold" themeColor="accent">{prettyDate(today, lang)}</ThemedText>
                </View>

                {[
                  { value: item1, setter: setItem1, n: 1 },
                  { value: item2, setter: setItem2, n: 2 },
                  { value: item3, setter: setItem3, n: 3 },
                ].map((row) => (
                  <View key={row.n} style={styles.itemRow}>
                    <ThemedText type="smallBold" themeColor="accent" style={styles.itemNumber}>{row.n}</ThemedText>
                    <TextInput
                      value={row.value}
                      onChangeText={(v) => { row.setter(v); setSaved(false); }}
                      placeholder={t('r2m.gratitude.placeholder', { n: row.n })}
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                    />
                  </View>
                ))}

                <TextInput
                  value={note}
                  onChangeText={(v) => { setNote(v); setSaved(false); }}
                  placeholder={t('r2m.gratitude.notePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[styles.noteInput, { color: theme.text, backgroundColor: theme.background }]}
                />

                {photoPaths.length > 0 && (
                  <View style={styles.thumbRow}>
                    {photoPaths.map((path) => (
                      <View key={path}>
                        <Image source={{ uri: gratitudePhotoUrl(path) }} style={styles.thumb} />
                        <Pressable
                          onPress={() => dropPhoto(path)}
                          style={[styles.thumbRemove, { backgroundColor: theme.accent }]}>
                          <ThemedText type="smallBold" style={styles.thumbRemoveText}>×</ThemedText>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.cardActions}>
                  <Pressable
                    onPress={addPhoto}
                    disabled={busy}
                    style={[styles.photoButton, { borderColor: theme.border, backgroundColor: theme.background }]}>
                    <ThemedText type="smallBold" themeColor="accent">
                      📷 {t('r2m.gratitude.addPhoto')}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={save}
                    disabled={busy}
                    style={[styles.saveButton, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}>
                    {busy ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <ThemedText type="smallBold" style={styles.saveButtonText}>
                        {saved ? t('r2m.gratitude.saved') : t('r2m.gratitude.save')}
                      </ThemedText>
                    )}
                  </Pressable>
                </View>

                <View style={[styles.shareRow, { borderTopColor: theme.border }]}>
                  <View style={styles.shareText}>
                    <ThemedText type="smallBold">{t('r2m.gratitude.share')}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('r2m.gratitude.shareHint')}
                    </ThemedText>
                  </View>
                  <Switch
                    value={isShared}
                    onValueChange={(v) => { setIsShared(v); setSaved(false); }}
                    trackColor={{ true: theme.accent, false: theme.border }}
                  />
                </View>

                {message && (
                  <ThemedText type="small" themeColor="accent">{message}</ThemedText>
                )}
              </View>

              {/* ── 지난 일기 ── */}
              <ThemedText type="smallBold" style={styles.sectionTitle}>{t('r2m.gratitude.past')}</ThemedText>
              {past.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">{t('r2m.gratitude.empty')}</ThemedText>
              ) : (
                past.map((entry) => (
                  <JournalCard
                    key={entry.id}
                    date={prettyDate(entry.date, lang)}
                    items={[entry.item1, entry.item2, entry.item3]}
                    note={entry.note}
                    photoUrls={entry.photoUrls}
                    shared={entry.isShared}
                    sharedLabel={t('r2m.gratitude.sharedBadge')}
                    onDelete={() => removeEntry(entry)}
                    deleteLabel={t('r2m.gratitude.delete')}
                  />
                ))
              )}
            </>
          ) : (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
                {t('r2m.gratitude.sharedHint')}
              </ThemedText>
              {feed.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">{t('r2m.gratitude.sharedEmpty')}</ThemedText>
              ) : (
                feed.map((entry) => (
                  <JournalCard
                    key={entry.id}
                    date={`${entry.authorName} · ${prettyDate(entry.date, lang)}`}
                    items={[entry.item1, entry.item2, entry.item3]}
                    note={entry.note}
                    photoUrls={entry.photoUrls}
                  />
                ))
              )}
            </>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

/** 일기 한 장. 내 일기장과 함께 나눈 감사가 같은 카드를 쓴다. */
function JournalCard({
  date,
  items,
  note,
  photoUrls,
  shared,
  sharedLabel,
  onDelete,
  deleteLabel,
}: {
  date: string;
  items: string[];
  note: string;
  photoUrls: string[];
  shared?: boolean;
  sharedLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  const theme = useTheme();
  const filled = items.filter((i) => i.trim());

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.cardHead}>
        <View style={[styles.ribbon, { backgroundColor: theme.accentSoft }]}>
          <ThemedText type="smallBold" themeColor="accent">{date}</ThemedText>
        </View>
        {shared && sharedLabel ? (
          <View style={[styles.badge, { backgroundColor: theme.done }]}>
            <ThemedText type="smallBold" style={styles.badgeText}>{sharedLabel}</ThemedText>
          </View>
        ) : null}
      </View>

      {photoUrls.length > 0 && (
        <View style={styles.photoStack}>
          <Image source={{ uri: photoUrls[0] }} style={styles.photoBig} />
          {photoUrls.length > 1 && (
            <View style={styles.thumbRow}>
              {photoUrls.slice(1).map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.thumb} />
              ))}
            </View>
          )}
        </View>
      )}

      {filled.map((item, i) => (
        <View key={i} style={styles.itemRow}>
          <ThemedText type="smallBold" themeColor="accent" style={styles.itemNumber}>{i + 1}</ThemedText>
          <ThemedText style={styles.itemText}>{item}</ThemedText>
        </View>
      ))}

      {note.trim() ? <ThemedText type="small" style={styles.noteText}>{note}</ThemedText> : null}

      {onDelete && deleteLabel ? (
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <ThemedText type="small" themeColor="textSecondary">{deleteLabel}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, alignItems: 'center', width: '100%' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  title: { fontSize: 28 },

  tabs: { flexDirection: 'row', borderRadius: Spacing.five, padding: 4, gap: 4 },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.five,
  },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  ribbon: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Spacing.five,
  },
  badge: { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Spacing.five },
  badgeText: { color: '#ffffff' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  itemNumber: {
    width: 22,
    textAlign: 'center',
    fontSize: 15,
  },
  itemText: { flex: 1, fontSize: 16, lineHeight: 24 },
  input: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
  noteInput: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  noteText: { fontSize: 15, lineHeight: 23 },

  photoStack: { gap: Spacing.two },
  photoBig: { width: '100%', height: 200, borderRadius: Spacing.three },
  thumbRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  thumb: { width: 72, height: 72, borderRadius: Spacing.two },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: { color: '#ffffff', fontSize: 15 },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  photoButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#ffffff' },

  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  shareText: { flex: 1, gap: 2 },

  sectionTitle: { marginTop: Spacing.three },
  deleteButton: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.two },
});
