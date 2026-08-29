import { useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/db/profile';
import {
  createCellNotice,
  createCellReport,
  getCellContext,
  getCellMeeting,
  getCellNotices,
  getCellReports,
  getMyVisitRequests,
  removeCellNotice,
  removeCellReport,
  requestVisit,
  type Cell,
  type CellMeeting,
  type CellNotice,
  type CellReport,
  type VisitRequest,
} from '@/db/cell';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function CellRoomScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [cells, setCells] = useState<Cell[]>([]);
  const [cell, setCell] = useState<Cell | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const [churchId, setChurchId] = useState<string | null>(null);

  const [meeting, setMeeting] = useState<CellMeeting | null>(null);
  const [notices, setNotices] = useState<CellNotice[]>([]);
  const [reports, setReports] = useState<CellReport[]>([]);
  const [visits, setVisits] = useState<VisitRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 쓰기 칸
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [reportBody, setReportBody] = useState('');
  const [visitReason, setVisitReason] = useState('');
  const [visitWhen, setVisitWhen] = useState('');
  const [busy, setBusy] = useState(false);

  const loadRoom = useCallback(async (target: Cell) => {
    const [m, n, r, v] = await Promise.all([
      getCellMeeting(target.id),
      getCellNotices(target.id).catch(() => []),
      getCellReports(target.id).catch(() => []),
      getMyVisitRequests(target.id).catch(() => []),
    ]);
    setMeeting(m);
    setNotices(n);
    setReports(r);
    setVisits(v);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx = await getCellContext();
      setCells(ctx.allCells);
      setCanSeeAll(ctx.canSeeAll);
      setIsLeader(ctx.isLeader);
      const target = ctx.cell ?? ctx.allCells[0] ?? null;
      setCell(target);
      if (userId) getProfile(userId).then((p) => setChurchId(p?.church_id ?? null));
      if (target) await loadRoom(target);
    } catch {
      setError('목장 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId, loadRoom]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function pickCell(next: Cell) {
    setCell(next);
    await loadRoom(next);
  }

  async function submitNotice(whole: boolean) {
    if (!noticeTitle.trim() || !noticeBody.trim() || !cell) return;
    setBusy(true);
    const { error: e } = await createCellNotice({
      cellId: whole ? null : cell.id,
      title: noticeTitle.trim(),
      body: noticeBody.trim(),
      authorId: userId,
    });
    setBusy(false);
    if (e) return setError(e);
    setNoticeTitle('');
    setNoticeBody('');
    await loadRoom(cell);
  }

  async function submitReport(kind: 'report' | 'note') {
    if (!reportBody.trim() || !cell) return;
    setBusy(true);
    const { error: e } = await createCellReport({
      cellId: cell.id,
      authorId: userId,
      kind,
      metOn: today(),
      body: reportBody.trim(),
    });
    setBusy(false);
    if (e) return setError(e);
    setReportBody('');
    await loadRoom(cell);
  }

  async function submitVisit() {
    if (!visitReason.trim() || !cell || !churchId) return;
    setBusy(true);
    const { error: e } = await requestVisit({
      churchId,
      cellId: cell.id,
      requesterId: userId,
      reason: visitReason.trim(),
      preferredWhen: visitWhen.trim(),
    });
    setBusy(false);
    if (e) return setError(e);
    setVisitReason('');
    setVisitWhen('');
    await loadRoom(cell);
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="textSecondary">불러오는 중…</ThemedText>
      </ThemedView>
    );
  }

  // 교적에 목장이 없으면 아무 방도 없다. 이 경우가 실제로 많아서(84명 중 39명만
  // 계정과 목장이 둘 다 이어져 있다) 빈 화면 대신 왜 안 보이는지 적어 준다.
  if (!cell) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="subtitle">아직 목장이 연결되지 않았습니다</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          교적에 목장이 정해지면 여기에 우리 목장방이 열립니다.{'\n'}
          교회 관리자에게 말씀해 주세요.
        </ThemedText>
      </ThemedView>
    );
  }

  const canWriteNotice = isLeader || canSeeAll;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">{cell.name}</ThemedText>

          {canSeeAll && cells.length > 1 && (
            <View style={styles.chipRow}>
              {cells.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => pickCell(c)}
                  style={[
                    styles.chip,
                    { backgroundColor: c.id === cell.id ? theme.accent : theme.backgroundElement },
                  ]}>
                  <ThemedText
                    type="small"
                    style={c.id === cell.id ? { color: '#ffffff' } : undefined}>
                    {c.name}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          {error && (
            <ThemedText type="small" style={{ color: '#e03131' }}>
              {error}
            </ThemedText>
          )}

          {/* ── 이번 주 모임 ── */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold" themeColor="accent">
              이번 주 모임
            </ThemedText>
            {meeting ? (
              <>
                <ThemedText type="default">
                  {meeting.weekdays.map((w) => WEEKDAY[w]).join('·') || '요일 미정'}요일{' '}
                  {meeting.startTime}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {meeting.location ?? '장소 미정'}
                </ThemedText>
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                아직 정기모임이 등록되지 않았습니다. 주보의 「모임 관리」에서 목장 모임을
                등록하면 여기와 교회 캘린더에 함께 뜹니다.
              </ThemedText>
            )}
          </ThemedView>

          {/* ── 공지 ── */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            공지
          </ThemedText>
          {canWriteNotice && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <TextInput
                value={noticeTitle}
                onChangeText={setNoticeTitle}
                placeholder="공지 제목"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
              />
              <TextInput
                value={noticeBody}
                onChangeText={setNoticeBody}
                placeholder="내용"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.inputTall, { color: theme.text, backgroundColor: theme.background }]}
              />
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={() => submitNotice(false)}
                  disabled={busy}
                  style={[styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.5 : 1 }]}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    우리 목장에 올리기
                  </ThemedText>
                </Pressable>
                {canSeeAll && (
                  <Pressable
                    onPress={() => submitNotice(true)}
                    disabled={busy}
                    style={[styles.buttonOutline, { borderColor: theme.accent }]}>
                    <ThemedText type="smallBold" themeColor="accent">
                      전체 공지
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </ThemedView>
          )}
          {notices.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              아직 공지가 없습니다.
            </ThemedText>
          )}
          {notices.map((n) => (
            <ThemedView key={n.id} type="backgroundElement" style={styles.card}>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold">
                  {n.cellId === null ? '📢 전체 · ' : ''}
                  {n.title}
                </ThemedText>
                {n.authorId === userId && (
                  <Pressable
                    onPress={async () => {
                      await removeCellNotice(n.id);
                      await loadRoom(cell);
                    }}
                    hitSlop={8}>
                    <ThemedText type="small" themeColor="textSecondary">
                      삭제
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <ThemedText type="small">{n.body}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {shortDate(n.createdAt)}
              </ThemedText>
            </ThemedView>
          ))}

          {/* ── 보고와 상황 ── */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            보고와 상황
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.card}>
            <TextInput
              value={reportBody}
              onChangeText={setReportBody}
              placeholder="목장에서 있었던 일을 나눠 주세요"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.inputTall, { color: theme.text, backgroundColor: theme.background }]}
            />
            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => submitReport('note')}
                disabled={busy}
                style={[styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.5 : 1 }]}>
                <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                  올리기
                </ThemedText>
              </Pressable>
              {isLeader && (
                <Pressable
                  onPress={() => submitReport('report')}
                  disabled={busy}
                  style={[styles.buttonOutline, { borderColor: theme.accent }]}>
                  <ThemedText type="smallBold" themeColor="accent">
                    모임 보고로
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </ThemedView>
          {reports.map((r) => (
            <ThemedView key={r.id} type="backgroundElement" style={styles.card}>
              <View style={styles.rowBetween}>
                <ThemedText type="smallBold" themeColor={r.kind === 'report' ? 'accent' : 'text'}>
                  {r.kind === 'report' ? '모임 보고' : '나눔'} · {r.metOn}
                </ThemedText>
                {r.authorId === userId && (
                  <Pressable
                    onPress={async () => {
                      await removeCellReport(r.id);
                      await loadRoom(cell);
                    }}
                    hitSlop={8}>
                    <ThemedText type="small" themeColor="textSecondary">
                      삭제
                    </ThemedText>
                  </Pressable>
                )}
              </View>
              <ThemedText type="small">{r.body}</ThemedText>
            </ThemedView>
          ))}

          {/* ── 심방 신청 (목자만) ── */}
          {isLeader && (
            <>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                심방 신청
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="small" themeColor="textSecondary">
                  담임목사님께 전해집니다. 목원에게는 보이지 않습니다.
                </ThemedText>
                <TextInput
                  value={visitReason}
                  onChangeText={setVisitReason}
                  placeholder="어떤 일로 심방이 필요한지"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  style={[styles.inputTall, { color: theme.text, backgroundColor: theme.background }]}
                />
                <TextInput
                  value={visitWhen}
                  onChangeText={setVisitWhen}
                  placeholder="언제쯤이 좋은지 (예: 주중 저녁)"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                />
                <Pressable
                  onPress={submitVisit}
                  disabled={busy || !churchId}
                  style={[
                    styles.button,
                    { backgroundColor: theme.accent, opacity: busy || !churchId ? 0.5 : 1 },
                  ]}>
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                    심방 신청하기
                  </ThemedText>
                </Pressable>
              </ThemedView>
              {visits.map((v) => (
                <ThemedView key={v.id} type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">
                    {v.status === 'open'
                      ? '기다리는 중'
                      : v.status === 'scheduled'
                        ? '일정 잡힘'
                        : v.status === 'done'
                          ? '심방 마침'
                          : '취소됨'}{' '}
                    · {shortDate(v.createdAt)}
                  </ThemedText>
                  <ThemedText type="small">{v.reason}</ThemedText>
                  {v.handlerNote && (
                    <ThemedText type="small" themeColor="accent">
                      {v.handlerNote}
                    </ThemedText>
                  )}
                </ThemedView>
              ))}
            </>
          )}

          {/* 기도제목은 여기 두지 않는다 — 샬롬기도단이 따로 있다. */}
          <Pressable onPress={() => router.push('/prayer-group')} style={styles.linkRow}>
            <ThemedText type="link" themeColor="accent">
              🙏 기도제목은 샬롬기도단에서 나눠 주세요 →
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  centerText: { textAlign: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  sectionTitle: { marginTop: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Spacing.two },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  input: { borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15 },
  inputTall: { borderRadius: Spacing.two, padding: Spacing.two, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  button: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
  buttonOutline: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, borderWidth: 1, alignItems: 'center' },
  linkRow: { marginTop: Spacing.four, alignItems: 'center' },
});
