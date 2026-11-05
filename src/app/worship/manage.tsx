import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Btn, Card, ChipRow, Empty, Field, RoomScreen, SectionTitle, Tag } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  CONGREGATIONS,
  addDefaultMeetings,
  canWriteWorship,
  getMeetings,
  removeMeeting,
  saveMeeting,
  type Congregation,
  type WorshipMeeting,
} from '@/db/worship';

/**
 * 예배 관리 — 예배 칸을 더하고 링크를 건다. **관리자 이상**만.
 *
 * 화면에서 막는 것은 안내일 뿐이다. 실제로는 DB 정책(`can_write_worship`,
 * 0098)이 막으므로 주소를 직접 쳐도 저장되지 않는다.
 *
 * 여기 적는 링크는 **늘 같은 것**이다 — 생중계 주소·재생목록·유튜브 채널.
 * 그 주 영상은 보고서에 적는다(예배 → 보고서 쓰기).
 */
export default function WorshipManageScreen() {
  const { session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [meetings, setMeetings] = useState<WorshipMeeting[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // 넣기와 고치기가 같은 칸을 쓴다 — 고칠 때 화면이 바뀌면 무엇을 고치는지 잃는다.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [congregation, setCongregation] = useState<Congregation>('adult');
  const [name, setName] = useState('');
  const [meetsAt, setMeetsAt] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(() => {
    getMeetings(true)
      .then(setMeetings)
      .catch(() => setMeetings([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setAllowed(false);
        return;
      }
      canWriteWorship()
        .then((v) => {
          setAllowed(v);
          if (v) load();
        })
        .catch(() => setAllowed(false));
    }, [session, load]),
  );

  function reset() {
    setEditingId(null);
    setName('');
    setMeetsAt('');
    setLinkUrl('');
    setLinkLabel('');
    setSortOrder('');
    setIsActive(true);
    setMessage('');
  }

  function edit(m: WorshipMeeting) {
    setEditingId(m.id);
    setCongregation(m.congregation);
    setName(m.name);
    setMeetsAt(m.meetsAt);
    setLinkUrl(m.linkUrl);
    setLinkLabel(m.linkLabel);
    setSortOrder(String(m.sortOrder));
    setIsActive(m.isActive);
    setMessage('');
  }

  async function save() {
    setBusy(true);
    setMessage('');
    const result = await saveMeeting(editingId, {
      congregation,
      name,
      meetsAt,
      linkUrl,
      linkLabel,
      sortOrder: Number(sortOrder.trim()) || 0,
      isActive,
    });
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    reset();
    load();
  }

  async function putDefaults() {
    setBusy(true);
    setMessage('');
    const result = await addDefaultMeetings();
    setBusy(false);
    setMessage(
      result.error
        ? result.error
        : result.added === 0
          ? '더 넣을 것이 없어요 — 이미 다 들어 있습니다.'
          : `${result.added}개를 넣었어요. 이름과 시각은 고치면 됩니다.`,
    );
    load();
  }

  async function hide(m: WorshipMeeting) {
    setBusy(true);
    const result = await removeMeeting(m.id);
    setBusy(false);
    if (result.error) setMessage(result.error);
    if (editingId === m.id) reset();
    load();
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/worship' as Href));

  if (allowed === null) {
    return (
      <RoomScreen title="예배 관리" emoji="⛪" onBack={back}>
        <Empty text="여는 중입니다…" />
      </RoomScreen>
    );
  }

  if (!allowed) {
    return (
      <RoomScreen title="예배 관리" emoji="⛪" onBack={back}>
        <Empty text="관리자 이상만 쓸 수 있는 화면입니다." />
      </RoomScreen>
    );
  }

  return (
    <RoomScreen title="예배 관리" emoji="⛪" subtitle="예배 칸과 늘 같은 링크" onBack={back}>
      <Card>
        <SectionTitle hint={editingId ? '고치는 중' : undefined}>
          {editingId ? '예배 고치기' : '예배 더하기'}
        </SectionTitle>
        <ChipRow
          options={CONGREGATIONS.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))}
          value={congregation}
          onChange={setCongregation}
        />
        <Field label="예배 이름" value={name} onChangeText={setName} placeholder="주일 2부 예배" />
        <Field
          label="언제"
          value={meetsAt}
          onChangeText={setMeetsAt}
          placeholder="주일 오전 11:00"
          hint="사람이 읽는 대로 적습니다. 「셋째 주만」처럼 적어도 됩니다."
        />
        <Field
          label="늘 같은 링크"
          value={linkUrl}
          onChangeText={setLinkUrl}
          placeholder="https://www.youtube.com/@Newwineskin_Church"
          hint="생중계 주소·재생목록·채널. 그 주 영상은 보고서에 적습니다."
        />
        <Field label="링크 이름" value={linkLabel} onChangeText={setLinkLabel} placeholder="생중계 보기 (비워도 됩니다)" />
        <Field
          label="순서"
          value={sortOrder}
          onChangeText={setSortOrder}
          placeholder="10"
          hint="작은 수가 위로 옵니다. 비우면 0."
        />
        <ChipRow
          options={[
            { value: 'on', label: '성도에게 보임' },
            { value: 'off', label: '숨김' },
          ]}
          value={isActive ? 'on' : 'off'}
          onChange={(v) => setIsActive(v === 'on')}
        />
        <Btn label={editingId ? '이대로 고치기' : '예배 넣기'} onPress={() => void save()} disabled={busy} />
        {editingId ? <Btn label="그만두기" tone="ghost" small onPress={reset} /> : null}
        {message ? (
          <ThemedText type="small" themeColor="accent">
            {message}
          </ThemedText>
        ) : null}
      </Card>

      {meetings.length === 0 ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            흔히 드리는 예배 한 벌을 한 번에 넣을 수 있어요. 이름·시각·링크는 넣은 뒤에 고치면 됩니다.
          </ThemedText>
          <Btn label="기본 예배 한 번에 넣기" tone="quiet" onPress={() => void putDefaults()} disabled={busy} />
        </Card>
      ) : null}

      {CONGREGATIONS.map((group) => {
        const rows = meetings.filter((m) => m.congregation === group.value);
        if (rows.length === 0) return null;
        return (
          <View key={group.value} style={styles.group}>
            <SectionTitle>
              {group.emoji} {group.label}
            </SectionTitle>
            {rows.map((m) => (
              <Card key={m.id} style={styles.row}>
                <View style={styles.rowHead}>
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">{m.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {m.meetsAt || '시각을 안 적었습니다'}
                      {m.linkUrl ? ' · 링크 있음' : ' · 링크 없음'}
                    </ThemedText>
                  </View>
                  {m.isActive ? null : <Tag label="숨김" tone="warn" />}
                </View>
                <View style={styles.rowButtons}>
                  <Btn label="고치기" tone="ghost" small onPress={() => edit(m)} style={styles.grow} />
                  <Btn
                    label="보고서"
                    tone="ghost"
                    small
                    onPress={() => router.push(`/worship/${m.id}` as Href)}
                    style={styles.grow}
                  />
                  {/* 지우면 줄은 남는다 — 딸린 보고서를 함께 잃지 않기 위해서다. */}
                  <Btn label="내리기" tone="ghost" small onPress={() => void hide(m)} style={styles.grow} />
                </View>
              </Card>
            ))}
          </View>
        );
      })}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two, marginBottom: Spacing.two },
  row: { gap: Spacing.two },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowText: { flex: 1, gap: 2 },
  rowButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  grow: { flexGrow: 1, flexBasis: 96 },
});
