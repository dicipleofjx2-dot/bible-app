import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Btn,
  Card,
  ChipRow,
  Empty,
  Field,
  formatMeetDay,
  RoomScreen,
  SectionTitle,
  Tag,
} from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { nameOf, useCellRoom } from '@/hooks/use-cell-room';
import {
  createMinistry,
  getMinistries,
  proposeVillagePost,
  takeRole,
  updateMinistry,
  type Ministry,
} from '@/db/village';

/**
 * 사역실.
 *
 * 사역 카드 하나에 기획서 §2 가 적은 일곱 가지가 다 들어간다 — 목적·날짜·담당자·
 * 역할·준비물·결과·다음 행동.
 *
 * **역할을 비워 두는 것이 이 화면의 핵심이다.** 담당자를 미리 다 적어 두면
 * 화면은 공지가 되고, 비워 두면 「내가 할게요」가 된다.
 *
 * 마을로 보내는 길은 한 방향이다: 여기서 제안 → 마을장이 승인 → 광장에 선다.
 * 이 화면이 마을에 직접 쓰지 않는다.
 */

const STATUS_LABEL: Record<Ministry['status'], string> = {
  planned: '준비 중',
  doing: '하는 중',
  done: '마침',
  cancelled: '접음',
};

export default function MinistryRoomScreen() {
  const { room, loading } = useCellRoom();
  const cellId = room?.cell?.id ?? null;

  const [rows, setRows] = useState<Ministry[]>([]);
  const [mode, setMode] = useState<'view' | 'new'>('view');
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [serveOn, setServeOn] = useState('');
  const [place, setPlace] = useState('');
  const [supplies, setSupplies] = useState('');
  const [roles, setRoles] = useState('');

  const [resultFor, setResultFor] = useState<string | null>(null);
  const [result, setResult] = useState('');

  const load = useCallback(async () => {
    if (!cellId) return;
    setRows(await getMinistries(cellId).catch(() => [] as Ministry[]));
  }, [cellId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!cellId || !room || busy || !title.trim()) return;
    setBusy(true);
    const { error } = await createMinistry({
      cellId,
      createdBy: room.userId,
      title: title.trim(),
      purpose,
      serveOn: serveOn.trim() || null,
      place,
      supplies,
      roleNames: roles.split(',').map((r) => r.trim()),
    });
    setBusy(false);
    if (!error) {
      setTitle('');
      setPurpose('');
      setServeOn('');
      setPlace('');
      setSupplies('');
      setRoles('');
      setMode('view');
      await load();
    }
  }

  async function share(m: Ministry) {
    if (!room?.churchId || !cellId) return;
    const { error } = await proposeVillagePost({
      churchId: room.churchId,
      villageId: room.village.id,
      cellId,
      authorId: room.userId,
      kind: 'ministry',
      title: m.title,
      body: [m.purpose, m.result].filter(Boolean).join('\n\n') || m.title,
    });
    if (!error) setShared(m.id);
  }

  return (
    <RoomScreen title="사역실" emoji="🛠️" subtitle={room?.cell?.name ?? ''}>
      {loading ? (
        <Empty text="불러오는 중입니다…" />
      ) : !cellId ? (
        <Empty text="목장이 정해지면 사역실이 열립니다." />
      ) : mode === 'new' ? (
        <>
          <SectionTitle>사역 만들기</SectionTitle>
          <Field label="무엇을" value={title} onChangeText={setTitle} placeholder="독거 어르신 반찬 나눔" />
          <Field label="왜" value={purpose} onChangeText={setPurpose} multiline placeholder="이 사역으로 바라는 것" />
          <Field label="언제 (YYYY-MM-DD)" value={serveOn} onChangeText={setServeOn} />
          <Field label="어디서" value={place} onChangeText={setPlace} />
          <Field label="준비물" value={supplies} onChangeText={setSupplies} />
          <Field
            label="필요한 역할"
            value={roles}
            onChangeText={setRoles}
            placeholder="운전, 요리, 사진, 기도"
            hint="쉼표로 나눠 적으면 한 칸씩 지원 단추가 생깁니다. 비워 두면 역할 없이 만들어집니다."
          />
          <Btn label={busy ? '만드는 중…' : '사역 만들기'} onPress={create} disabled={busy} />
          <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
        </>
      ) : (
        <>
          <Btn label="사역 만들기" onPress={() => setMode('new')} />

          {rows.length === 0 ? (
            <Empty text="아직 사역 카드가 없어요." />
          ) : (
            rows.map((m) => (
              <Card key={m.id}>
                <View style={styles.rowBetween}>
                  <ThemedText style={styles.big}>{m.title}</ThemedText>
                  <Tag label={STATUS_LABEL[m.status]} tone={m.status === 'done' ? 'done' : 'soft'} />
                </View>
                {m.serveOn ? (
                  <ThemedText themeColor="accent">
                    📅 {formatMeetDay(m.serveOn)}
                    {m.place ? ` · ${m.place}` : ''}
                  </ThemedText>
                ) : null}
                {m.purpose ? <ThemedText>{m.purpose}</ThemedText> : null}
                {m.supplies ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    준비물 · {m.supplies}
                  </ThemedText>
                ) : null}

                {m.roles.length > 0 ? (
                  <>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      역할
                    </ThemedText>
                    <View style={styles.roleWrap}>
                      {m.roles.map((r) => {
                        const mineRole = r.takenBy === room?.userId;
                        const label = r.takenBy
                          ? `${r.name} · ${nameOf(room?.names ?? new Map(), r.takenBy)}`
                          : `${r.name} · 비어 있음`;
                        return (
                          <Btn
                            key={r.id}
                            small
                            label={mineRole ? `${label} (내려놓기)` : label}
                            tone={r.takenBy ? 'quiet' : 'primary'}
                            disabled={Boolean(r.takenBy) && !mineRole}
                            onPress={async () => {
                              if (!room) return;
                              await takeRole(r.id, mineRole ? null : room.userId);
                              await load();
                            }}
                          />
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {m.result ? (
                  <ThemedText type="small" themeColor="support">
                    결과 · {m.result}
                  </ThemedText>
                ) : null}

                {resultFor === m.id ? (
                  <>
                    <Field label="하고 나서" value={result} onChangeText={setResult} multiline />
                    <View style={styles.row}>
                      <Btn
                        label="저장"
                        style={styles.grow}
                        onPress={async () => {
                          await updateMinistry(m.id, { status: 'done', result: result.trim() || null });
                          setResultFor(null);
                          setResult('');
                          await load();
                        }}
                      />
                      <Btn label="취소" tone="ghost" style={styles.grow} onPress={() => setResultFor(null)} />
                    </View>
                  </>
                ) : (
                  <View style={styles.row}>
                    <ChipRow
                      options={(['planned', 'doing', 'done'] as const).map((s) => ({
                        value: s,
                        label: STATUS_LABEL[s],
                      }))}
                      value={m.status}
                      onChange={async (s) => {
                        if (s === 'done') {
                          setResultFor(m.id);
                          setResult(m.result ?? '');
                          return;
                        }
                        await updateMinistry(m.id, { status: s });
                        await load();
                      }}
                    />
                  </View>
                )}

                {m.status === 'done' ? (
                  shared === m.id ? (
                    <ThemedText type="small" themeColor="support">
                      마을에 올려 달라고 보냈어요. 마을장이 확인하면 광장에 뜹니다.
                    </ThemedText>
                  ) : (
                    <Btn label="마을 광장에 나누기" tone="quiet" small onPress={() => share(m)} />
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
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  roleWrap: { gap: Spacing.two },
  grow: { flex: 1 },
});
