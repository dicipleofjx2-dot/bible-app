import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  Btn,
  Card,
  ChipRow,
  Empty,
  Field,
  RoomScreen,
  SectionTitle,
  Tag,
  formatMeetDay,
  normalizeDate,
  todayString,
} from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';
import {
  canReadWorshipPrivate,
  canWriteWorship,
  congregationLabel,
  getMeeting,
  getPrivateParts,
  getReports,
  removeReport,
  saveReport,
  type WorshipMeeting,
  type WorshipReport,
  type WorshipReportPrivate,
} from '@/db/worship';

/** 가장 가까운 지난 주일(오늘이 주일이면 오늘). 보고서는 예배를 드린 뒤에 쓴다. */
function lastSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 예배 하나 — 그 주 영상과 보고서.
 *
 * ## 보고서가 두 겹인 까닭
 *
 * 성도가 읽는 부분과 **대표관리자만 읽는 부분**을 나눈다(사장님 요청). 자료도
 * 표를 갈라 담았다(0098) — 한 표에 칼럼으로 두면 RLS 는 줄 단위라, 보고서를
 * 읽을 수 있는 성도에게 그 칼럼이 함께 나간다. 화면만 가린 것은 가린 것이
 * 아니다.
 *
 * 쓰는 사람과 읽는 사람이 다를 수 있다 — 부서 관리자가 적고 대표가 읽는다.
 * 그래서 적은 사람에게만 자기 글을 되돌려 보여 준다. 남이 적은 비공개 부분을
 * 못 읽는 관리자가 보고서를 고칠 때는 그 칸을 **건드리지 않는다**(빈 칸을
 * 저장하면 보이지 않는 글을 지우게 된다 → `saveReport` 의 privateLoaded).
 */
export default function WorshipMeetingScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();

  const [meeting, setMeeting] = useState<WorshipMeeting | null>(null);
  const [reports, setReports] = useState<WorshipReport[]>([]);
  const [privateParts, setPrivateParts] = useState<Map<string, WorshipReportPrivate>>(new Map());
  const [canWrite, setCanWrite] = useState(false);
  const [canSeePrivate, setCanSeePrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // 보고서 쓰는 칸. editingId 가 있으면 고치는 중이다.
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [heldOn, setHeldOn] = useState('');
  const [preacher, setPreacher] = useState('');
  const [sermonTitle, setSermonTitle] = useState('');
  const [passage, setPassage] = useState('');
  const [attendance, setAttendance] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [body, setBody] = useState('');
  const [privateBody, setPrivateBody] = useState('');
  const [offeringNote, setOfferingNote] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setMeeting(await getMeeting(id).catch(() => null));
    const rows = await getReports(id).catch(() => [] as WorshipReport[]);
    setReports(rows);
    setPrivateParts(
      await getPrivateParts(rows.map((r) => r.id)).catch(() => new Map<string, WorshipReportPrivate>()),
    );
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setLoading(false);
        return;
      }
      (async () => {
        setCanWrite(await canWriteWorship().catch(() => false));
        setCanSeePrivate(await canReadWorshipPrivate().catch(() => false));
        await load();
      })();
    }, [session, load]),
  );

  function openNew() {
    setFormOpen(true);
    setEditingId(null);
    setHeldOn(lastSunday());
    setPreacher('');
    setSermonTitle('');
    setPassage('');
    setAttendance('');
    setVideoUrl('');
    setBody('');
    setPrivateBody('');
    setOfferingNote('');
    setMessage('');
  }

  function openEdit(r: WorshipReport) {
    const hidden = privateParts.get(r.id);
    setFormOpen(true);
    setEditingId(r.id);
    setHeldOn(r.heldOn);
    setPreacher(r.preacher);
    setSermonTitle(r.sermonTitle);
    setPassage(r.passage);
    setAttendance(r.attendance === null ? '' : String(r.attendance));
    setVideoUrl(r.videoUrl);
    setBody(r.body);
    setPrivateBody(hidden?.body ?? '');
    setOfferingNote(hidden?.offeringNote ?? '');
    setMessage('');
  }

  /** 비공개 부분을 읽은 채로 고치는가 — 못 읽으면 적은 것이 있을 때만 덮는다. */
  const privateLoaded = editingId ? canSeePrivate || privateParts.has(editingId) : true;

  async function save() {
    if (!id) return;
    const day = normalizeDate(heldOn);
    if (!day) {
      setMessage('예배 날짜를 「11-02」 처럼 적어 주세요.');
      return;
    }
    setBusy(true);
    setMessage('');
    const result = await saveReport(editingId, {
      meetingId: id,
      heldOn: day,
      videoUrl,
      preacher,
      sermonTitle,
      passage,
      attendance,
      body,
      privateBody,
      offeringNote,
      privateLoaded,
    });
    setBusy(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    await load();
  }

  const back = () => (router.canGoBack() ? router.back() : router.replace('/worship' as Href));

  if (!session) {
    return (
      <RoomScreen title="예배" emoji="⛪" onBack={back}>
        <Empty text="로그인하면 예배와 보고서가 보입니다." />
      </RoomScreen>
    );
  }

  if (loading && !meeting) {
    return (
      <RoomScreen title="예배" emoji="⛪" onBack={back}>
        <Empty text="여는 중입니다…" />
      </RoomScreen>
    );
  }

  if (!meeting) {
    return (
      <RoomScreen title="예배" emoji="⛪" onBack={back}>
        <Empty text="그 예배를 찾지 못했어요. 내려간 예배일 수 있습니다." />
      </RoomScreen>
    );
  }

  return (
    <RoomScreen
      title={meeting.name}
      emoji="⛪"
      subtitle={`${congregationLabel(meeting.congregation)}${meeting.meetsAt ? ` · ${meeting.meetsAt}` : ''}`}
      onBack={back}>
      {meeting.linkUrl ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            늘 같은 링크 — 생중계와 지난 영상이 여기 모입니다.
          </ThemedText>
          <Btn
            label={`${meeting.linkLabel || '영상 보기'} ↗`}
            onPress={() => openAppWindow(meeting.linkUrl, APP_WINDOW.worship)}
          />
        </Card>
      ) : null}

      {canWrite ? (
        formOpen ? (
          <Card>
            <SectionTitle hint={editingId ? '고치는 중' : undefined}>
              {editingId ? '보고서 고치기' : '보고서 쓰기'}
            </SectionTitle>

            <Field
              label="예배 날짜"
              value={heldOn}
              onChangeText={setHeldOn}
              placeholder="11-02"
              hint="한 예배의 한 날에 보고서는 하나입니다."
            />
            <ChipRow
              options={[
                { value: 'sunday', label: '지난 주일' },
                { value: 'today', label: '오늘' },
              ]}
              value={heldOn === lastSunday() ? 'sunday' : heldOn === todayString() ? 'today' : null}
              onChange={(v) => setHeldOn(v === 'today' ? todayString() : lastSunday())}
            />
            <Field label="설교자" value={preacher} onChangeText={setPreacher} placeholder="담임목사 (비워도 됩니다)" />
            <Field label="설교 제목" value={sermonTitle} onChangeText={setSermonTitle} placeholder="새 포도주는 새 부대에" />
            <Field label="본문" value={passage} onChangeText={setPassage} placeholder="마태복음 9:14-17" />
            <Field label="참석 인원" value={attendance} onChangeText={setAttendance} placeholder="숫자만 (비워도 됩니다)" />
            <Field
              label="그 주 영상"
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtu.be/… (비워도 됩니다)"
              hint="이 날 예배 영상. 비우면 위의 늘 같은 링크만 걸립니다."
            />

            <Field
              label="공개 보고 — 성도가 읽습니다"
              value={body}
              onChangeText={setBody}
              placeholder="예배 가운데 있었던 일, 함께 기억할 것"
              multiline
            />

            {/* 비공개 칸은 테두리로 따로 떼어 둔다 — 어디까지가 성도에게 나가는지
                적는 사람이 한눈에 알아야 한다. */}
            <View style={[styles.privateBox, { borderColor: theme.accent }]}>
              <View style={styles.privateHead}>
                <ThemedText type="smallBold" themeColor="accent">
                  대표관리자만 보는 부분
                </ThemedText>
                <Tag label="비공개" />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                성도 화면에도, 다른 관리자 화면에도 나가지 않습니다. 적은 분과 대표관리자만 봅니다.
              </ThemedText>
              <Field
                label="대표에게 올리는 보고"
                value={privateBody}
                onChangeText={setPrivateBody}
                placeholder="살펴야 할 일, 사람에 관한 것"
                multiline
              />
              <Field
                label="헌금"
                value={offeringNote}
                onChangeText={setOfferingNote}
                placeholder="주일헌금 ○○○원 (비워도 됩니다)"
              />
              {privateLoaded ? null : (
                <ThemedText type="small" themeColor="accent">
                  이 보고서의 비공개 부분은 다른 분이 적은 것이라 보이지 않습니다. 여기에 적으면
                  그것을 덮어씁니다. 비워 두면 그대로 둡니다.
                </ThemedText>
              )}
            </View>

            <Btn label={editingId ? '이대로 고치기' : '보고서 올리기'} onPress={() => void save()} disabled={busy} />
            <Btn
              label="그만두기"
              tone="ghost"
              small
              onPress={() => {
                setFormOpen(false);
                setEditingId(null);
                setMessage('');
              }}
            />
            {message ? (
              <ThemedText type="small" themeColor="accent">
                {message}
              </ThemedText>
            ) : null}
          </Card>
        ) : (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              보고서는 관리자 이상만 씁니다.
            </ThemedText>
            <Btn label="보고서 쓰기" onPress={openNew} />
            {message ? (
              <ThemedText type="small" themeColor="accent">
                {message}
              </ThemedText>
            ) : null}
          </Card>
        )
      ) : null}

      <SectionTitle hint={reports.length > 0 ? `${reports.length}개` : undefined}>보고서</SectionTitle>

      {reports.length === 0 ? (
        <Empty text="아직 보고서가 없어요." />
      ) : (
        reports.map((r) => {
          const hidden = privateParts.get(r.id);
          return (
            <Card key={r.id} style={styles.report}>
              <View style={styles.rowHead}>
                <ThemedText type="smallBold">{formatMeetDay(r.heldOn)}</ThemedText>
                {r.attendance !== null ? <Tag label={`${r.attendance}명`} /> : null}
              </View>

              {r.sermonTitle || r.passage || r.preacher ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {[r.sermonTitle, r.passage, r.preacher].filter(Boolean).join(' · ')}
                </ThemedText>
              ) : null}

              {r.body ? <ThemedText>{r.body}</ThemedText> : null}

              {r.videoUrl ? (
                <Btn
                  label="이 날 영상 보기 ↗"
                  tone="ghost"
                  small
                  onPress={() => openAppWindow(r.videoUrl, APP_WINDOW.worship)}
                />
              ) : null}

              {/* 비공개 부분은 **돌아온 것만** 그린다. 가려야 할 것은 DB 가
                  이미 걸러서 주므로(0098 정책), 여기서 다시 재지 않는다. */}
              {hidden && (hidden.body || hidden.offeringNote) ? (
                <View style={[styles.privateBox, { borderColor: theme.accent }]}>
                  <View style={styles.privateHead}>
                    <ThemedText type="smallBold" themeColor="accent">
                      대표관리자만
                    </ThemedText>
                    <Tag label="비공개" />
                  </View>
                  {hidden.body ? <ThemedText type="small">{hidden.body}</ThemedText> : null}
                  {hidden.offeringNote ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      헌금 — {hidden.offeringNote}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}

              {canWrite ? (
                <View style={styles.rowButtons}>
                  <Btn label="고치기" tone="ghost" small onPress={() => openEdit(r)} style={styles.grow} />
                  <Btn
                    label="내리기"
                    tone="ghost"
                    small
                    style={styles.grow}
                    onPress={async () => {
                      setBusy(true);
                      const result = await removeReport(r.id);
                      setBusy(false);
                      if (result.error) setMessage(result.error);
                      await load();
                    }}
                  />
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  report: { gap: Spacing.two },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowButtons: { flexDirection: 'row', gap: Spacing.two },
  grow: { flexGrow: 1, flexBasis: 96 },
  privateBox: {
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: 'dashed',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  privateHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
