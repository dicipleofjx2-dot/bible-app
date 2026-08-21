import * as ImagePicker from 'expo-image-picker';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateChooser } from '@/components/DateChooser';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getIsAdmin, getProfile } from '@/db/profile';
import {
  createPopupNotice,
  deletePopupNotice,
  listPopupNotices,
  updatePopupNotice,
  uploadPopupImage,
  type PopupNotice,
} from '@/db/popupNotices';

type Draft = {
  id: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string;
  linkLabel: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY: Draft = {
  id: null,
  title: '',
  body: '',
  imageUrl: null,
  linkUrl: '',
  linkLabel: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

/** 시점을 사람이 읽는 말로. 요일까지 붙여야 주일과 토요일을 헷갈리지 않는다. */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}/${d.getDate()}(${weekday}) ${ampm} ${h12}시`;
}

/** 기간과 켜짐을 사람 말로. 목록에서 지금 뜨는 것이 무엇인지 한눈에 알아야 한다. */
function statusOf(n: PopupNotice): string {
  if (!n.isActive) return '꺼둠';
  const now = Date.now();
  if (n.startsAt && new Date(n.startsAt).getTime() > now) return `${when(n.startsAt)}부터`;
  if (n.endsAt && new Date(n.endsAt).getTime() <= now) return '기간 지남';
  return n.endsAt ? `${when(n.endsAt)}까지 띄우는 중` : '띄우는 중';
}

/**
 * 알림 팝업 관리.
 *
 * 앱을 열자마자 뜨는 창이라 잘못 올리면 모두가 본다. 그래서 **기간**을 먼저
 * 정하게 했다. 사람이 잊고 안 내려도 끝나는 날이 지나면 저절로 사라진다 —
 * 지난 수련회 공지가 몇 달째 뜨는 것이 가장 나쁘다.
 */
export default function PopupNoticeAdminScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [items, setItems] = useState<PopupNotice[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listPopupNotices());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
    }
  }, []);

  useEffect(() => {
    if (!session) {
      setAllowed(false);
      return;
    }
    getIsAdmin(session.user.id)
      .then((v) => {
        setAllowed(v);
        if (v) void load();
      })
      .catch(() => setAllowed(false));
    getProfile(session.user.id)
      .then((p) => setChurchId(p?.church_id ?? null))
      .catch(() => setChurchId(null));
  }, [session, load]);

  async function pickImage() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setBusy(true);
    setMessage(null);
    const result = await uploadPopupImage(picked.assets[0].uri, picked.assets[0].mimeType);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setDraft((d) => ({ ...d, imageUrl: result.url ?? null }));
  }

  async function save() {
    if (!draft.title.trim()) {
      setMessage('제목을 적어 주세요.');
      return;
    }
    // 끝이 시작보다 앞이면 아무 때도 안 뜬다. 저장은 되는데 화면에는 영영
    // 안 나오는, 이유를 알 수 없는 상태가 된다.
    if (
      draft.startsAt &&
      draft.endsAt &&
      new Date(draft.endsAt).getTime() <= new Date(draft.startsAt).getTime()
    ) {
      setMessage('끝나는 때가 시작하는 때보다 앞섭니다.');
      return;
    }

    setBusy(true);
    setMessage(null);
    const input = {
      title: draft.title,
      body: draft.body,
      imageUrl: draft.imageUrl,
      linkUrl: draft.linkUrl,
      linkLabel: draft.linkLabel,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      isActive: draft.isActive,
    };
    const result = draft.id
      ? await updatePopupNotice(draft.id, input)
      : await createPopupNotice(churchId, input);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setDraft(EMPTY);
    setMessage(draft.id ? '고쳤습니다.' : '올렸습니다.');
    void load();
  }

  async function remove(id: string) {
    setBusy(true);
    const result = await deletePopupNotice(id);
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    if (draft.id === id) setDraft(EMPTY);
    void load();
  }

  if (allowed === false) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: '알림 팝업' }} />
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <ThemedText style={styles.center}>관리자만 들어올 수 있어요.</ThemedText>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">돌아가기</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: '알림 팝업' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <ThemedText type="small" themeColor="textSecondary">
            앱을 열면 바로 뜨는 창입니다. 기간이 끝나면 저절로 사라지니, 내리는 것을 잊어도
            됩니다.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{draft.id ? '고치기' : '새로 만들기'}</ThemedText>

            <TextInput
              value={draft.title}
              onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
              placeholder="제목 (예: 여름 수련회 신청 마감 안내)"
              placeholderTextColor={theme.textSecondary}
              style={inputStyle}
            />
            <TextInput
              value={draft.body}
              onChangeText={(v) => setDraft((d) => ({ ...d, body: v }))}
              placeholder="내용 (선택)"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[...inputStyle, styles.multiline]}
            />

            {draft.imageUrl ? (
              <Image source={{ uri: draft.imageUrl }} style={styles.preview} resizeMode="contain" />
            ) : null}
            <View style={styles.row}>
              <Pressable
                onPress={pickImage}
                disabled={busy}
                style={[styles.button, styles.grow, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">
                  {busy ? '올리는 중…' : draft.imageUrl ? '다른 그림으로' : '그림 넣기'}
                </ThemedText>
              </Pressable>
              {draft.imageUrl ? (
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, imageUrl: null }))}
                  style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small" style={styles.danger}>
                    빼기
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>

            {/* 날짜는 손으로 치지 않는다. 휴대폰에서 열한 자를 정확히 치는 것은
                번거롭고, 한 글자만 틀려도 저장이 막히거나 엉뚱한 날에 뜬다. */}
            <DateChooser
              title="띄우기 시작"
              value={draft.startsAt}
              onChange={(v) => setDraft((d) => ({ ...d, startsAt: v }))}
              hint="정하지 않으면 저장하는 즉시 뜹니다."
            />
            <DateChooser
              title="띄우기 끝"
              value={draft.endsAt}
              onChange={(v) => setDraft((d) => ({ ...d, endsAt: v }))}
              hint="정하지 않으면 끌 때까지 계속 뜹니다. 그 시각이 되면 사라집니다."
            />

            <ThemedText type="small" themeColor="textSecondary">
              눌렀을 때 갈 곳 (선택) — 앱 안이면 /notice-board 처럼
            </ThemedText>
            <TextInput
              value={draft.linkUrl}
              onChangeText={(v) => setDraft((d) => ({ ...d, linkUrl: v }))}
              placeholder="/notice-board 또는 https://..."
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              style={inputStyle}
            />
            {draft.linkUrl ? (
              <TextInput
                value={draft.linkLabel}
                onChangeText={(v) => setDraft((d) => ({ ...d, linkLabel: v }))}
                placeholder="버튼 이름 (비우면 '자세히 보기')"
                placeholderTextColor={theme.textSecondary}
                style={inputStyle}
              />
            ) : null}

            <View style={styles.switchRow}>
              <ThemedText type="small">띄우기</ThemedText>
              <Switch
                value={draft.isActive}
                onValueChange={(v) => setDraft((d) => ({ ...d, isActive: v }))}
              />
            </View>

            <View style={styles.row}>
              <Pressable
                onPress={save}
                disabled={busy}
                style={[styles.button, styles.grow, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">{busy ? '저장 중…' : '저장'}</ThemedText>
              </Pressable>
              {draft.id ? (
                <Pressable
                  onPress={() => setDraft(EMPTY)}
                  style={[styles.button, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="small">새로 만들기</ThemedText>
                </Pressable>
              ) : null}
            </View>

            {message ? (
              <ThemedText type="small" themeColor="textSecondary">
                {message}
              </ThemedText>
            ) : null}
          </View>

          <ThemedText type="smallBold">올린 것들</ThemedText>
          {items.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              아직 없습니다.
            </ThemedText>
          ) : (
            items.map((n) => (
              <View key={n.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">{n.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {statusOf(n)}
                </ThemedText>
                <View style={styles.row}>
                  <Pressable
                    onPress={() =>
                      setDraft({
                        id: n.id,
                        title: n.title,
                        body: n.body ?? '',
                        imageUrl: n.imageUrl,
                        linkUrl: n.linkUrl ?? '',
                        linkLabel: n.linkLabel ?? '',
                        startsAt: n.startsAt ?? '',
                        endsAt: n.endsAt ?? '',
                        isActive: n.isActive,
                      })
                    }
                    style={[styles.button, styles.grow, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="small">고치기</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => remove(n.id)} style={styles.button}>
                    <ThemedText type="small" style={styles.danger}>
                      지우기
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', width: '100%' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  center: { textAlign: 'center', padding: Spacing.four },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  input: {
    minHeight: 44,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  preview: { width: '100%', height: 160, borderRadius: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  grow: { flex: 1 },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  danger: { color: '#c92a2a' },
});
