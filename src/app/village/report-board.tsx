import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Btn, Card, Empty, formatMeetDay, RoomScreen, SectionTitle } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCellRoom } from '@/hooks/use-cell-room';
import { getReportBoard, type ReportBoardRow } from '@/db/cell';

/**
 * 목장 보고 현황판 — 교회 전체 목장이 그 주(월~일) 모임 보고를 올렸나.
 *
 * 올렸으면 불이 켜지고, 안 올렸으면 꺼진 채로 둔다. 기본은 **지난주**다 —
 * 이번 주 모임은 아직 안 끝났을 수 있다. 본문은 서버가 돌려주지 않는다
 * (cell_report_board, 0097). 남의 목장 보고는 여전히 그 목장 안에서만 읽힌다.
 */

const LAMP_ON = '#F5C542';

/** 'YYYY-MM-DD' 에 날을 더한다. Date 파싱의 UTC 함정을 피해 로컬로 만든다. */
function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, m - 1, d + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function thisMonday(): string {
  const t = new Date();
  const back = (t.getDay() + 6) % 7; // 월=0
  const m = new Date(t.getFullYear(), t.getMonth(), t.getDate() - back);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

export default function ReportBoardScreen() {
  const theme = useTheme();
  const { room, loading } = useCellRoom();
  const lastWeek = addDays(thisMonday(), -7);
  const [week, setWeek] = useState(lastWeek);
  const [rows, setRows] = useState<ReportBoardRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const churchId = room?.churchId ?? null;

  const load = useCallback(async () => {
    if (!churchId) return;
    setBusy(true);
    setError('');
    try {
      setRows(await getReportBoard(churchId, week));
    } catch {
      setError('현황을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.');
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [churchId, week]);

  useEffect(() => {
    load();
  }, [load]);

  const on = rows.filter((r) => r.reported).length;
  const weekLabel =
    week === lastWeek ? '지난주' : week === thisMonday() ? '이번 주' : `${formatMeetDay(week)} 주`;

  return (
    <RoomScreen title="목장 보고 현황판" emoji="💡" subtitle="보고를 올린 목장에 불이 켜집니다">
      {loading ? (
        <Empty text="여는 중입니다…" />
      ) : !room ? (
        <Empty text="로그인하면 현황판이 열립니다." />
      ) : !churchId ? (
        <Empty text="마이페이지에서 교회에 들어오면 현황판이 열립니다." />
      ) : (
        <>
          <Card>
            <View style={styles.weekRow}>
              <Btn label="‹ 앞 주" tone="ghost" small onPress={() => setWeek((w) => addDays(w, -7))} />
              <View style={styles.weekMid}>
                <ThemedText style={styles.big}>{weekLabel}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatMeetDay(week)} ~ {formatMeetDay(addDays(week, 6))}
                </ThemedText>
              </View>
              <Btn
                label="다음 주 ›"
                tone="ghost"
                small
                disabled={week >= thisMonday()}
                onPress={() => setWeek((w) => addDays(w, 7))}
              />
            </View>
            {rows.length > 0 ? (
              <ThemedText themeColor="accent" style={styles.center}>
                {rows.length}개 목장 중 {on}곳 보고 완료
              </ThemedText>
            ) : null}
          </Card>

          {error ? (
            <Empty text={error} />
          ) : busy && rows.length === 0 ? (
            <Empty text="불을 켜는 중입니다…" />
          ) : rows.length === 0 ? (
            <Empty text="이 교회에 등록된 목장이 없거나, 아직 볼 수 있는 목장이 없어요." />
          ) : (
            <>
              <SectionTitle hint="모임 보고 기준">목장별</SectionTitle>
              <View style={styles.grid}>
                {rows.map((r) => (
                  <View
                    key={r.cellId}
                    accessibilityLabel={`${r.cellName} ${r.reported ? '보고 완료' : '보고 전'}`}
                    style={[
                      styles.tile,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: r.reported ? LAMP_ON : theme.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.lamp,
                        r.reported
                          ? { backgroundColor: LAMP_ON, boxShadow: `0 0 16px 4px ${LAMP_ON}` }
                          : { backgroundColor: theme.border, opacity: 0.6 },
                      ]}>
                      <ThemedText style={styles.lampIcon}>{r.reported ? '💡' : ''}</ThemedText>
                    </View>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {r.cellName}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {r.reported && r.reportedOn
                        ? `${formatMeetDay(r.reportedOn)} 보고`
                        : `보고 전${r.leaderName ? ` · 목자 ${r.leaderName}` : ''}`}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  center: { textAlign: 'center', marginTop: Spacing.two },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekMid: { alignItems: 'center', flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tile: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  lamp: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  lampIcon: { fontSize: 22, lineHeight: 28 },
});
