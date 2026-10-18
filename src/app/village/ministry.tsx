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
  normalizeDate,
  RoomScreen,
  SectionTitle,
  Tag,
} from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { nameOf, useCellRoom } from '@/hooks/use-cell-room';
import {
  createMinistry,
  createMinistryNote,
  getMinistries,
  getMinistryNotes,
  removeMinistryNote,
  proposeVillagePost,
  takeRole,
  updateMinistry,
  type Ministry,
  type MinistryNote,
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
  const [notes, setNotes] = useState<Map<string, MinistryNote[]>>(new Map());
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteKind, setNoteKind] = useState<MinistryNote['kind']>('grace');
  const [noteBody, setNoteBody] = useState('');
  const [noteError, setNoteError] = useState('');
  const [mode, setMode] = useState<'view' | 'new'>('view');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
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
    const list = await getMinistries(cellId).catch(() => [] as Ministry[]);
    setRows(list);
    setNotes(await getMinistryNotes(list.map((m) => m.id)));
  }, [cellId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!cellId || !room || busy) return;
    if (!title.trim()) {
      setFormError('「무엇을」 칸에 사역 이름을 적어 주세요.');
      return;
    }
    let date: string | null = null;
    if (serveOn.trim()) {
      date = normalizeDate(serveOn);
      if (!date) {
        setFormError('날짜를 2026-10-20 처럼 적어 주세요. 날짜를 모르면 비워 두세요.');
        return;
      }
    }
    setFormError('');
    setBusy(true);
    const { error } = await createMinistry({
      cellId,
      createdBy: room.userId,
      title: title.trim(),
      purpose,
      serveOn: date,
      place,
      supplies,
      roleNames: roles.split(',').map((r) => r.trim()),
    });
    setBusy(false);
    if (error) {
      setFormError(
        /row-level security|permission/i.test(error)
          ? '이 목장에 사역을 올릴 권한이 없어요. 목장이 맞는지 확인해 주세요.'
          : `사역을 만들지 못했어요. ${error}`,
      );
      return;
    }
    {
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
          <Field label="언제 (예: 2026-10-20)" value={serveOn} onChangeText={setServeOn} />
          <Field label="어디서" value={place} onChangeText={setPlace} />
          <Field label="준비물" value={supplies} onChangeText={setSupplies} />
          <Field
            label="필요한 역할"
            value={roles}
            onChangeText={setRoles}
            placeholder="운전, 요리, 사진, 기도"
            hint="쉼표로 나눠 적으면 한 칸씩 지원 단추가 생깁니다. 비워 두면 역할 없이 만들어집니다."
          />
          {formError ? (
            <ThemedText type="small" themeColor="support">
              {formError}
            </ThemedText>
          ) : null}
          <Btn label={busy ? '만드는 중…' : '사역 만들기'} onPress={create} disabled={busy} />
          <Btn label="취소" tone="ghost" onPress={() => setMode('view')} />
        </>
      ) : (
        <>
          <Card>
            <ThemedText style={styles.big}>우리 목장이 감당하는 사역</ThemedText>
            <ThemedText>
              목장이 이웃과 교회를 섬기려고 맡은 일들을 소개하는 곳입니다. 마음이 가는 사역에서
              비어 있는 역할을 찾아 함께해 주세요.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ① 사역 카드에서 무엇을, 언제, 어디서 하는지 읽습니다.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ② 「필요한 역할」 단추를 눌러 참여합니다. 다시 누르면 내려놓을 수 있어요.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ③ 마친 뒤에는 「사역 나눔」에 은혜와 아쉬움을 남기고, 결과를 적어 다음 사역에 이어 갑니다.
            </ThemedText>
          </Card>
          <Btn label="사역 만들기" onPress={() => setMode('new')} />

          {rows.length === 0 ? (
            <Empty text="아직 소개된 사역이 없어요. 「사역 만들기」로 목장이 맡은 일을 알려 주세요." />
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

                {/* ── 사역 나눔: 같이 섬긴 사람들의 은혜와 아쉬움 ──────── */}
                <ThemedText type="smallBold" themeColor="textSecondary">
                  사역 나눔 {(notes.get(m.id) ?? []).length > 0 ? `(${(notes.get(m.id) ?? []).length})` : ''}
                </ThemedText>
                {(notes.get(m.id) ?? []).map((n) => (
                  <View key={n.id} style={styles.noteBox}>
                    <ThemedText type="smallBold" themeColor={n.kind === 'grace' ? 'accent' : 'support'}>
                      {n.kind === 'grace' ? '🌱 은혜·감사' : '💡 아쉬움·제안'} ·{' '}
                      {nameOf(room?.names ?? new Map(), n.authorId)}
                    </ThemedText>
                    <ThemedText>{n.body}</ThemedText>
                    {n.authorId === room?.userId ? (
                      <Btn
                        label="지우기"
                        small
                        tone="ghost"
                        onPress={async () => {
                          await removeMinistryNote(n.id);
                          await load();
                        }}
                      />
                    ) : null}
                  </View>
                ))}
                {noteFor === m.id ? (
                  <>
                    <ChipRow
                      options={[
                        { value: 'grace', label: '은혜·감사' },
                        { value: 'improve', label: '아쉬움·제안' },
                      ]}
                      value={noteKind}
                      onChange={setNoteKind}
                    />
                    <Field
                      label="사역은 어땠나요?"
                      value={noteBody}
                      onChangeText={setNoteBody}
                      multiline
                      placeholder={
                        noteKind === 'grace' ? '받은 은혜, 감사했던 일' : '다음에는 이렇게 하면 좋겠어요'
                      }
                    />
                    {noteError ? (
                      <ThemedText type="small" themeColor="support">
                        {noteError}
                      </ThemedText>
                    ) : null}
                    <View style={styles.row}>
                      <Btn
                        label="나눔 올리기"
                        style={styles.grow}
                        onPress={async () => {
                          if (!room) return;
                          if (!noteBody.trim()) {
                            setNoteError('나눔 내용을 적어 주세요.');
                            return;
                          }
                          const { error } = await createMinistryNote({
                            ministryId: m.id,
                            authorId: room.userId,
                            kind: noteKind,
                            body: noteBody.trim(),
                          });
                          if (error) {
                            setNoteError(`나눔을 올리지 못했어요. ${error}`);
                            return;
                          }
                          setNoteBody('');
                          setNoteError('');
                          setNoteFor(null);
                          await load();
                        }}
                      />
                      <Btn label="취소" tone="ghost" style={styles.grow} onPress={() => setNoteFor(null)} />
                    </View>
                  </>
                ) : (
                  <Btn
                    label="사역 나눔 쓰기"
                    tone="quiet"
                    small
                    onPress={() => {
                      setNoteFor(m.id);
                      setNoteBody('');
                      setNoteError('');
                    }}
                  />
                )}

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
  noteBox: { gap: 2, paddingVertical: Spacing.one },
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  row: { flexDirection: 'row', gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  roleWrap: { gap: Spacing.two },
  grow: { flex: 1 },
});
