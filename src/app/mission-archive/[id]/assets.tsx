import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  addAsset,
  assetSignedUrl,
  deleteAsset,
  listAssets,
  uploadAssetFile,
  type MissionAsset,
} from '@/db/missionArchive';
import { ChipRow, Field, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  ASSET_KINDS,
  FACT_STATUS,
  VISIBILITY,
  assetKindLabel,
  repeatedWords,
  type AssetKind,
  type FactStatus,
  type Visibility,
} from '@/lib/missionArchive';

const EMPTY = {
  kind: 'photo' as AssetKind,
  title: '',
  year: '',
  place: '',
  people: '',
  note: '',
  body: '',
  fact: 'document' as FactStatus,
  visibility: 'church' as Visibility,
};

/**
 * 사역 자료실 (기획서 §9).
 *
 * 설교·사진·선교 편지·주보를 한자리에 모은다. 파일은 **비공개 통**에 담기므로
 * 볼 때마다 짧게 사는 서명 주소를 받아 연다(0080) — 이 통에는 현지 성도의 얼굴과
 * 파송장이 들어간다. 주소가 한 번 새면 되돌릴 길이 없다.
 *
 * 설교 원고나 편지 본문을 붙여 넣으면 아래 「반복해서 나온 말」이 자란다.
 * 뜻을 읽어 내는 것이 아니라 낱말을 세는 것이라, 사람에게 되묻는 형태로 둔다.
 */
export default function MissionAssetsScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [assets, setAssets] = useState<MissionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState<{ path: string; name: string } | null>(null);

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      setAssets(await listAssets(id));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function pickPhoto() {
    if (!ownerId) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    const file = picked.assets[0];
    const { path, error } = await uploadAssetFile(ownerId, file.uri, file.fileName ?? 'photo.jpg', file.mimeType ?? 'image/jpeg');
    setBusy(false);
    if (error || !path) {
      setMessage(error ?? '사진을 올리지 못했어요.');
      return;
    }
    setPending({ path, name: file.fileName ?? '사진' });
    setForm((f) => ({ ...f, kind: 'photo' }));
    setFormOpen(true);
  }

  async function pickFile() {
    if (!ownerId) return;
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    const file = picked.assets[0];
    const { path, error } = await uploadAssetFile(ownerId, file.uri, file.name, file.mimeType);
    setBusy(false);
    if (error || !path) {
      setMessage(error ?? '파일을 올리지 못했어요.');
      return;
    }
    setPending({ path, name: file.name });
    setForm((f) => ({ ...f, kind: 'document', title: f.title || file.name }));
    setFormOpen(true);
  }

  async function submit() {
    if (!ownerId || !id) return;
    if (!form.title.trim() && !pending) {
      setMessage('제목을 적거나 파일을 올려 주세요.');
      return;
    }
    setBusy(true);
    try {
      await addAsset(ownerId, id, {
        kind: form.kind,
        title: form.title.trim() || pending?.name || '',
        path: pending?.path ?? null,
        year: form.year ? Number(form.year) : null,
        month: null,
        place: form.place,
        people: form.people,
        note: form.note,
        body: form.body,
        fact_status: form.fact,
        visibility: form.visibility,
      });
      setForm(EMPTY);
      setPending(null);
      setFormOpen(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '담지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function open(asset: MissionAsset) {
    if (!asset.path) return;
    const url = await assetSignedUrl(asset.path);
    if (!url) {
      setMessage('주소를 받지 못했어요.');
      return;
    }
    await Linking.openURL(url);
  }

  async function remove(asset: MissionAsset) {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && !window.confirm('이 자료를 지울까요?')) return;
    setBusy(true);
    try {
      await deleteAsset(asset.id, asset.path);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '지우지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  // 설교와 편지에 실제로 담긴 글에서만 센다. 제목만으로는 아무 말도 못 한다.
  const themes = useMemo(
    () =>
      repeatedWords(
        assets.filter((a) => a.kind === 'sermon' || a.kind === 'letter').map((a) => `${a.title} ${a.body}`),
      ),
    [assets],
  );

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>사역 자료실</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            설교·사진·선교 편지·주보를 모읍니다. 올린 파일은 주소를 아는 사람이라도 열 수 없는
            비공개 보관함에 담기고, 볼 때마다 한 시간짜리 임시 주소로 엽니다.
          </ThemedText>

          <View style={styles.actions}>
            <PrimaryButton label={busy ? '올리는 중…' : '사진 올리기'} onPress={pickPhoto} disabled={busy} />
            <PrimaryButton label="파일 올리기" tone="quiet" onPress={pickFile} disabled={busy} />
            <PrimaryButton
              label={formOpen ? '입력 닫기' : '파일 없이 기록만 남기기'}
              tone="quiet"
              onPress={() => setFormOpen((v) => !v)}
            />
          </View>

          {formOpen ? (
            <MissionCard>
              {pending ? (
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  올린 파일: {pending.name}
                </ThemedText>
              ) : null}
              <ChipRow
                label="무엇입니까"
                options={ASSET_KINDS.map((k) => ({ id: k.id, label: k.label }))}
                value={form.kind}
                onChange={(v) => setForm({ ...form, kind: v })}
              />
              <Field label="제목" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
              <Field
                label="연도"
                value={form.year}
                onChangeText={(v) => setForm({ ...form, year: v.replace(/[^0-9]/g, '').slice(0, 4) })}
                keyboardType="number-pad"
              />
              <Field label="장소" value={form.place} onChangeText={(v) => setForm({ ...form, place: v })} />
              <Field label="관련 인물" value={form.people} onChangeText={(v) => setForm({ ...form, people: v })} />
              <Field
                label="본문 (설교 원고·편지 내용)"
                value={form.body}
                onChangeText={(v) => setForm({ ...form, body: v })}
                multiline
                hint="붙여 넣으면 아래 「반복해서 나온 말」에 함께 셉니다."
              />
              <Field label="메모" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />
              <ChipRow
                label="확인 상태"
                options={FACT_STATUS.map((f) => ({ id: f.id, label: f.short }))}
                value={form.fact}
                onChange={(v) => setForm({ ...form, fact: v })}
              />
              <ChipRow
                label="공개 범위"
                options={VISIBILITY.map((v) => ({ id: v.id, label: v.label }))}
                value={form.visibility}
                onChange={(v) => setForm({ ...form, visibility: v })}
              />
              <PrimaryButton label={busy ? '담는 중…' : '자료실에 담기'} onPress={submit} disabled={busy} />
            </MissionCard>
          ) : null}

          {themes.length > 0 ? (
            <MissionCard>
              <ThemedText style={Type.itemTitle}>설교와 편지에서 반복해서 나온 말</ThemedText>
              <ThemedText style={Type.body}>
                {themes.map((t) => `${t.word} (${t.count})`).join(' · ')}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                낱말을 센 것입니다. 이 가운데 목회철학이라 부를 만한 것이 있는지는 사역자께서
                골라 주셔야 합니다.
              </ThemedText>
            </MissionCard>
          ) : null}

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : (
            <View style={styles.list}>
              {assets.map((asset) => (
                <MissionCard key={asset.id}>
                  <ThemedText style={Type.itemTitle}>
                    [{assetKindLabel(asset.kind)}] {asset.title || '(제목 없음)'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
                    {[asset.year ? `${asset.year}년` : '', asset.place, asset.people].filter(Boolean).join(' · ') || '—'}
                  </ThemedText>
                  {asset.note ? (
                    <ThemedText themeColor="textSecondary" style={Type.caption}>
                      {asset.note}
                    </ThemedText>
                  ) : null}
                  <View style={styles.row}>
                    {asset.path ? (
                      <Pressable onPress={() => open(asset)}>
                        <ThemedText style={[Type.caption, { color: theme.accent }]}>파일 열기</ThemedText>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => remove(asset)} disabled={busy}>
                      <ThemedText style={[Type.caption, { color: theme.accent }]}>지우기</ThemedText>
                    </Pressable>
                  </View>
                </MissionCard>
              ))}
              {assets.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={Type.body}>
                  아직 담긴 자료가 없습니다.
                </ThemedText>
              ) : null}
            </View>
          )}

          {message ? <ThemedText style={[Type.caption, { color: theme.accent }]}>{message}</ThemedText> : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  loading: { marginVertical: Spacing.four },
  list: { gap: Spacing.two },
  actions: { gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.three },
});
