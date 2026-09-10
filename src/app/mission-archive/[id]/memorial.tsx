import * as Clipboard from 'expo-clipboard';
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import {
  getMemorialSettings,
  getSubject,
  listAnswers,
  listAssets,
  listMemorialPhotos,
  listTestimonies,
  memorialPhotoUrl,
  publishPhotoToMemorial,
  removeMemorialPhoto,
  saveMemorialSettings,
  type MemorialPhoto,
  type MissionAnswer,
  type MissionAsset,
  type MissionSubject,
  type MissionTestimony,
} from '@/db/missionArchive';
import { Field, MissionCard, PrimaryButton } from '@/features/mission/ui';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { isValidSlug, memorialReadiness, slugify } from '@/lib/missionArchive';

/**
 * 디지털 기념관 만들기 (기획서 §4·§15).
 *
 * 이 앱에서 **밖으로 열리는 유일한 문**이라, 여는 절차를 일부러 여러 걸음으로
 * 두었다. 주소를 정하고, 사진을 하나씩 「공개하겠다」고 누르고, 마지막에
 * 「기념관 열기」를 켠다. 그 전까지는 아무것도 나가지 않는다.
 *
 * 나가는 것은 **「공개」로 표시한 것뿐**이다. 기본값이 「교회 내부」라 손대지
 * 않으면 기념관은 비어 있다 — 실수로 새는 쪽이 아니라 실수로 비는 쪽으로
 * 기울여 두었고, 비었을 때 왜 비었는지를 아래에 적어 준다.
 */
export default function MissionMemorialAdminScreen() {
  const theme = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ownerId = session?.user.id ?? null;

  const [subject, setSubject] = useState<MissionSubject | null>(null);
  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [testimonies, setTestimonies] = useState<MissionTestimony[]>([]);
  const [assets, setAssets] = useState<MissionAsset[]>([]);
  const [photos, setPhotos] = useState<MemorialPhoto[]>([]);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!ownerId || !id) {
      setLoading(false);
      return;
    }
    try {
      const [one, settings, answerList, testimonyList, assetList, photoList] = await Promise.all([
        getSubject(id),
        getMemorialSettings(id),
        listAnswers(id),
        listTestimonies(id),
        listAssets(id),
        listMemorialPhotos(id),
      ]);
      setSubject(one);
      setAnswers(answerList);
      setTestimonies(testimonyList);
      setAssets(assetList);
      setPhotos(photoList);
      if (settings) {
        setSlug(settings.slug);
        setTitle(settings.title);
        setIntro(settings.intro);
        setPublished(settings.published);
      } else if (one) {
        setSlug(slugify(one.church || one.name) || '');
        setTitle(`${one.name} 사역 기념관`);
      }
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

  function memorialLink(): string {
    const base =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : 'https://dicipleofjx-bible.vercel.app';
    return `${base}/memorial/${slug}`;
  }

  const notes = useMemo(
    () => memorialReadiness(answers, testimonies, photos.length),
    [answers, testimonies, photos.length],
  );
  const photoAssets = useMemo(() => assets.filter((a) => a.kind === 'photo' && a.path), [assets]);

  async function save(nextPublished: boolean) {
    if (!ownerId || !id) return;
    if (!isValidSlug(slug)) {
      setMessage('주소는 영문 소문자·숫자·붙임표로 4자 이상이어야 합니다. 예) saebudae-kim');
      return;
    }
    setBusy(true);
    try {
      await saveMemorialSettings(ownerId, id, { slug, title, intro, published: nextPublished });
      setPublished(nextPublished);
      setMessage(nextPublished ? '기념관을 열었습니다.' : '기념관을 닫았습니다.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '저장하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function hang(asset: MissionAsset) {
    if (!ownerId || !id) return;
    setBusy(true);
    const { error } = await publishPhotoToMemorial(ownerId, id, asset, photos.length);
    setBusy(false);
    if (error) setMessage(error);
    else await load();
  }

  async function unhang(photo: MemorialPhoto) {
    setBusy(true);
    try {
      await removeMemorialPhoto(photo.id, photo.path);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '내리지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={Type.screenTitle}>디지털 기념관</ThemedText>
          <ThemedText themeColor="textSecondary" style={Type.itemDescription}>
            연표·이야기·증언·사진을 한 장으로 엮어 누구나 볼 수 있게 엽니다. 「공개」로 표시한
            것만 나갑니다.
          </ThemedText>

          {loading ? (
            <ActivityIndicator style={styles.loading} color={theme.accent} />
          ) : subject?.security_mode ? (
            <MissionCard style={{ borderColor: theme.accent }}>
              <ThemedText style={Type.itemTitle}>보안 지역 기록은 기념관을 열 수 없습니다</ThemedText>
              <ThemedText style={Type.body}>
                이 사역자는 보안 모드로 표시되어 있습니다. 사람의 안전이 출판보다 앞섭니다. 기념관이
                필요하시면 사역 기록 홈에서 보안 모드를 먼저 끄고, 지명과 실명이 본문에 남아 있지
                않은지 직접 확인해 주세요.
              </ThemedText>
            </MissionCard>
          ) : (
            <>
              <MissionCard>
                <Field
                  label="기념관 주소"
                  value={slug}
                  onChangeText={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="saebudae-kim"
                  hint={`영문 소문자·숫자·붙임표. 주소: ${memorialLink()}`}
                />
                <Field label="제목" value={title} onChangeText={setTitle} />
                <Field label="여는 글" value={intro} onChangeText={setIntro} multiline />
                <PrimaryButton
                  label={busy ? '저장 중…' : published ? '고친 내용 저장' : '저장하기'}
                  onPress={() => save(published)}
                  disabled={busy}
                />
                <PrimaryButton
                  label={published ? '기념관 닫기' : '기념관 열기'}
                  tone={published ? 'quiet' : 'accent'}
                  onPress={() => save(!published)}
                  disabled={busy}
                />
                {published ? (
                  <Pressable
                    onPress={async () => {
                      await Clipboard.setStringAsync(memorialLink());
                      setMessage('주소를 복사했습니다.');
                    }}>
                    <ThemedText style={[Type.caption, { color: theme.accent }]}>주소 복사</ThemedText>
                  </Pressable>
                ) : null}
              </MissionCard>

              {notes.length > 0 ? (
                <MissionCard style={{ borderColor: theme.accent }}>
                  <ThemedText style={Type.itemTitle}>지금 기념관에 나갈 것이 적습니다</ThemedText>
                  {notes.map((note) => (
                    <ThemedText key={note} style={Type.body}>
                      · {note}
                    </ThemedText>
                  ))}
                </MissionCard>
              ) : null}

              <MissionCard>
                <ThemedText style={Type.itemTitle}>기념관에 건 사진 {photos.length}장</ThemedText>
                <View style={styles.photos}>
                  {photos.map((photo) => (
                    <View key={photo.id} style={styles.photo}>
                      <Image source={{ uri: memorialPhotoUrl(photo.path) }} style={styles.thumb} />
                      <ThemedText themeColor="textSecondary" style={Type.caption} numberOfLines={1}>
                        {photo.caption || '설명 없음'}
                      </ThemedText>
                      <Pressable onPress={() => unhang(photo)} disabled={busy}>
                        <ThemedText style={[Type.caption, { color: theme.accent }]}>내리기</ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </View>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  자료실의 사진을 눌러 걸면 공개 보관함으로 옮겨집니다. 한 번 걸면 주소를 아는 누구나
                  볼 수 있으니, 현지 성도의 얼굴이 담긴 사진은 본인 동의를 받은 것만 걸어 주세요.
                </ThemedText>
                {photoAssets.map((asset) => (
                  <Pressable key={asset.id} onPress={() => hang(asset)} disabled={busy}>
                    <ThemedText style={[Type.body, { color: theme.accent }]}>
                      + {asset.title || '(제목 없음)'}
                      {asset.year ? ` (${asset.year})` : ''}
                    </ThemedText>
                  </Pressable>
                ))}
                {photoAssets.length === 0 ? (
                  <ThemedText themeColor="textSecondary" style={Type.body}>
                    자료실에 사진이 없습니다.
                  </ThemedText>
                ) : null}
              </MissionCard>
            </>
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
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photo: { width: 110, gap: 2 },
  thumb: { width: 110, height: 110, borderRadius: 10 },
});
