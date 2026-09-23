import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Btn, Card, Empty, Field, RoomScreen, SectionTitle } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { useCellRoom } from '@/hooks/use-cell-room';
import { createMission, getMissions, postVillagePrayer, type Mission } from '@/db/village';

/**
 * 선교실.
 *
 * **후원 계좌 칸을 두지 않았다.** 기획서 §2 가 "개인 계좌를 임의로 노출하지
 * 않는다"고 했는데, 칸이 있으면 언젠가 거기 계좌번호가 들어간다. 그래서 칸
 * 자체를 만들지 않고, 안내 문구만 적게 했다 — 후원은 교회가 승인한 길로 간다.
 *
 * 기도 요청은 마을 기도정원으로 보낸다. 선교는 한 목장이 다 감당하기 어려워서,
 * 함께 기도하는 것이 첫걸음이다.
 */
export default function MissionRoomScreen() {
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;

  const [rows, setRows] = useState<Mission[]>([]);
  const [mode, setMode] = useState<'view' | 'new'>('view');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

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

  return (
    <RoomScreen title="선교실" emoji="🌏" subtitle={room?.cell?.name ?? ''}>
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
                {m.prayerPoints ? (
                  sent === m.id ? (
                    <ThemedText type="small" themeColor="support">
                      마을 기도정원에 올렸어요.
                    </ThemedText>
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

const styles = StyleSheet.create({
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  block: { gap: 2, marginTop: Spacing.one },
});
