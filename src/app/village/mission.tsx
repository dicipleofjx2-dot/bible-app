import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Btn, Card, Empty, Field, RoomScreen, SectionTitle, Tag } from '@/components/village/kit';
import { VillageVideo } from '@/components/village/VillageVideo';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCellRoom } from '@/hooks/use-cell-room';
import {
  addMissionMedia,
  createMission,
  getMissions,
  postVillagePrayer,
  removeMissionMedia,
  type Mission,
  type MissionSeedFields,
} from '@/db/village';
import { missionImagePrompt, missionVideoPrompt, openAiStudio } from '@/lib/missionPrompt';

/**
 * 선교실.
 *
 * **후원 계좌 칸을 두지 않았다.** 기획서 §2 가 "개인 계좌를 임의로 노출하지
 * 않는다"고 했는데, 칸이 있으면 언젠가 거기 계좌번호가 들어간다. 그래서 칸
 * 자체를 만들지 않고, 안내 문구만 적게 했다 — 후원은 교회가 승인한 길로 간다.
 *
 * 기도 요청은 마을 기도정원으로 보낸다. 선교는 한 목장이 다 감당하기 어려워서,
 * 함께 기도하는 것이 첫걸음이다.
 *
 * ── 사진·영상 ───────────────────────────────────────────────────────
 * 카드를 만든 **뒤에** 붙인다. 만들기 화면에서 먼저 고르게 하면 어디에 붙일지
 * 정해지지 않은 파일을 어딘가에 들고 있어야 하고, 만들기를 도중에 그만두면 그
 * 파일이 통에 남는다. 카드가 생긴 뒤에 붙이면 갈 곳이 늘 분명하다.
 *
 * ── AI 로 만들기 ────────────────────────────────────────────────────
 * 현장 사진은 다녀온 사람이 갖고 있다. AI 는 **분위기 그림**을 맡는다 —
 * 사람 얼굴을 지어내지 말라는 규칙까지 넘기는 글에 함께 실려 간다
 * (`@/lib/missionPrompt`).
 */
export default function MissionRoomScreen() {
  const theme = useTheme();
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;

  const [rows, setRows] = useState<Mission[]>([]);
  const [mode, setMode] = useState<'view' | 'new'>('view');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [field, setField] = useState('');
  const [partner, setPartner] = useState('');
  const [story, setStory] = useState('');
  const [prayer, setPrayer] = useState('');
  const [support, setSupport] = useState('');
  const [visit, setVisit] = useState('');

  const load = useCallback(async () => {
    if (!cellId) return;
    setRows(await getMissions(cellId).catch(() => [] as Mission[]));
  }, [cellId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!cellId || !room || busy || !field.trim()) return;
    setBusy(true);
    const { error } = await createMission({
      cellId,
      createdBy: room.userId,
      field: field.trim(),
      partner,
      story,
      prayerPoints: prayer,
      supportNote: support,
      visitPlan: visit,
    });
    setBusy(false);
    if (!error) {
      setField('');
      setPartner('');
      setStory('');
      setPrayer('');
      setSupport('');
      setVisit('');
      setMode('view');
      setMessage('선교 카드를 만들었어요. 이제 사진과 영상을 붙일 수 있습니다.');
      await load();
    }
  }

  async function toGarden(m: Mission) {
    if (!room?.churchId || !cellId || !m.prayerPoints) return;
    const { error } = await postVillagePrayer({
      churchId: room.churchId,
      villageId: room.village.id,
      cellId,
      authorId: room.userId,
      title: `${m.field} 선교 기도`,
      body: m.prayerPoints,
    });
    if (!error) setSent(m.id);
  }

  /**
   * 사진·영상 고르기.
   *
   * 영상은 고를 때부터 길이를 30초로 묶는다. 25MB 한도에 걸려 올린 뒤에 퇴짜를
   * 맞으면 큰 파일을 한 번 다 올리고 나서 버리는 셈이라, 데이터도 시간도 아깝다.
   */
  async function pick(m: Mission, kind: 'image' | 'video') {
    if (!room || busy) return;
    const picked = await ImagePicker.launchImageLibraryAsync(
      kind === 'image'
        ? { mediaTypes: ['images'], quality: 0.85 }
        : { mediaTypes: ['videos'], videoMaxDuration: 30 },
    );
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];

    setBusy(true);
    setMessage(null);
    const { error } = await addMissionMedia({
      missionId: m.id,
      userId: room.userId,
      uri: asset.uri,
      kind,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
    });
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    await load();
  }

  const seedOf = (m: MissionSeedFields) => ({
    field: m.field,
    partner: m.partner,
    story: m.story,
    prayerPoints: m.prayerPoints,
  });

  async function makeWithAi(seed: MissionSeedFields, kind: 'image' | 'video') {
    const prompt = kind === 'image' ? missionImagePrompt(seedOf(seed)) : missionVideoPrompt(seedOf(seed));
    // 소라는 물음을 미리 적어 둘 길이 없어 복사해 둔다. 챗지피티는 주소에 실려
    // 가지만, 복사해 두면 다시 쓰기도 편하다.
    await Clipboard.setStringAsync(prompt).catch(() => {});
    openAiStudio(kind, prompt);
    setMessage(
      kind === 'image'
        ? '챗지피티를 열었어요. 만든 그림을 내려받아 「사진 올리기」로 붙이시면 됩니다.'
        : '소라를 열었어요. 만들 내용을 복사해 두었으니 붙여 넣으세요. 만든 영상은 「영상 올리기」로 붙이시면 됩니다.',
    );
  }

  const draftSeed: MissionSeedFields = {
    field: field.trim() || '선교지',
    partner,
    story,
    prayerPoints: prayer,
  };

  return (
    <RoomScreen title="선교실" emoji="🌏" subtitle={room?.cell?.name ?? ''}>
      {message ? (
        <Card>
          <ThemedText themeColor="support">{message}</ThemedText>
        </Card>
      ) : null}

      {loading ? (
        <Empty text="불러오는 중입니다…" />
      ) : !cellId ? (
        <Empty text="목장이 정해지면 선교실이 열립니다." />
      ) : mode === 'new' ? (
        <>
          <SectionTitle>선교 카드 만들기</SectionTitle>
          <Field label="선교지" value={field} onChangeText={setField} placeholder="필리핀 민다나오" />
          <Field label="함께하는 분" value={partner} onChangeText={setPartner} placeholder="○○○ 선교사" />
          <Field label="소식" value={story} onChangeText={setStory} multiline />
          <Field label="기도 제목" value={prayer} onChangeText={setPrayer} multiline />
          <Field label="방문 계획" value={visit} onChangeText={setVisit} placeholder="내년 1월 단기선교" />
          <Field
            label="후원 안내"
            value={support}
            onChangeText={setSupport}
            placeholder="교회 재정부를 통해 함께합니다"
            hint="계좌번호는 적지 마세요. 후원은 교회가 안내하는 길로만 이어집니다."
          />

          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              그림이 없으면 AI로 만들어 보세요
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              위에 적은 내용이 그대로 실려 갑니다. 현장 사진이 있으면 그 사진이 늘 낫습니다.
            </ThemedText>
            <View style={styles.row}>
              <Btn
                small
                tone="quiet"
                style={styles.grow}
                label="🎨 그림 만들기"
                onPress={() => makeWithAi(draftSeed, 'image')}
              />
              <Btn
                small
                tone="quiet"
                style={styles.grow}
                label="🎬 영상 만들기"
                onPress={() => makeWithAi(draftSeed, 'video')}
              />
            </View>
          </Card>

          <Btn label={busy ? '만드는 중…' : '선교 카드 만들기'} onPress={create} disabled={busy} />
          <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
        </>
      ) : (
        <>
          <Btn label="선교 카드 만들기" onPress={() => setMode('new')} />
          {rows.length === 0 ? (
            <Empty text="아직 선교 카드가 없어요." />
          ) : (
            rows.map((m) => (
              <Card key={m.id}>
                <ThemedText style={styles.big}>🌏 {m.field}</ThemedText>
                {m.partner ? (
                  <ThemedText type="smallBold" themeColor="accent">
                    {m.partner}
                  </ThemedText>
                ) : null}

                {/* ── 사진·영상 ───────────────────────────────── */}
                {m.media.length > 0 ? (
                  <View style={styles.mediaWrap}>
                    {m.media.map((x) =>
                      x.kind === 'video' ? (
                        <View key={x.id} style={styles.mediaFull}>
                          <VillageVideo url={x.url} />
                          <RemoveMedia
                            onPress={async () => {
                              await removeMissionMedia(x.id, x.path);
                              await load();
                            }}
                          />
                        </View>
                      ) : (
                        <View key={x.id} style={styles.mediaThumb}>
                          <Image
                            source={{ uri: x.url }}
                            style={styles.thumbImage}
                            contentFit="cover"
                            transition={150}
                          />
                          <RemoveMedia
                            onPress={async () => {
                              await removeMissionMedia(x.id, x.path);
                              await load();
                            }}
                          />
                        </View>
                      ),
                    )}
                  </View>
                ) : null}

                {m.story ? <ThemedText>{m.story}</ThemedText> : null}
                {m.prayerPoints ? (
                  <View style={styles.block}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      기도 제목
                    </ThemedText>
                    <ThemedText>{m.prayerPoints}</ThemedText>
                  </View>
                ) : null}
                {m.visitPlan ? (
                  <ThemedText type="small" themeColor="support">
                    방문 계획 · {m.visitPlan}
                  </ThemedText>
                ) : null}
                {m.supportNote ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    후원 · {m.supportNote}
                  </ThemedText>
                ) : null}

                <View style={[styles.divider, { borderTopColor: theme.border }]} />

                <View style={styles.row}>
                  <Btn
                    small
                    tone="quiet"
                    style={styles.grow}
                    label={busy ? '올리는 중…' : '📷 사진 올리기'}
                    disabled={busy}
                    onPress={() => pick(m, 'image')}
                  />
                  <Btn
                    small
                    tone="quiet"
                    style={styles.grow}
                    label={busy ? '올리는 중…' : '🎥 영상 올리기'}
                    disabled={busy}
                    onPress={() => pick(m, 'video')}
                  />
                </View>
                <View style={styles.row}>
                  <Btn
                    small
                    tone="ghost"
                    style={styles.grow}
                    label="🎨 AI로 그림"
                    onPress={() => makeWithAi(m, 'image')}
                  />
                  <Btn
                    small
                    tone="ghost"
                    style={styles.grow}
                    label="🎬 AI로 영상"
                    onPress={() => makeWithAi(m, 'video')}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  영상은 25MB(30초쯤)까지 올라갑니다. 긴 영상은 유튜브에 올리고 소식에 주소를 적어
                  주세요.
                </ThemedText>

                {m.prayerPoints ? (
                  sent === m.id ? (
                    <Tag label="마을 기도정원에 올림" tone="done" />
                  ) : (
                    <Btn label="마을 기도정원에 올리기" tone="quiet" small onPress={() => toGarden(m)} />
                  )
                ) : null}
              </Card>
            ))
          )}
        </>
      )}
    </RoomScreen>
  );
}

/** 사진 모서리의 떼어내기 단추. 누르는 자리가 작으면 안 눌리므로 36px 로 둔다. */
function RemoveMedia({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="떼어내기"
      style={styles.removeBtn}>
      <ThemedText style={styles.removeText}>✕</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  block: { gap: 2, marginTop: Spacing.one },
  row: { flexDirection: 'row', gap: Spacing.two },
  grow: { flex: 1 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: Spacing.two, paddingTop: Spacing.one },
  mediaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  mediaFull: { width: '100%' },
  mediaThumb: { width: '48%', aspectRatio: 4 / 5, borderRadius: 12, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%', borderRadius: 12 },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  removeText: { color: '#FFFFFF', fontSize: 17, lineHeight: 22, fontWeight: '700' },
});
