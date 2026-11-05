import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
/*
 * 화면 부품은 목장마을ON 과 같은 것을 쓴다(`components/village/kit`). 폴더
 * 이름은 마을이지만 안에 든 것은 카드·단추·입력칸뿐이라 어느 화면에나 맞는다.
 * 같은 모양을 따로 또 적으면 여백과 글씨 크기가 조금씩 어긋난다.
 */
import { Btn, Card, Empty, formatMeetDay, RoomScreen, SectionTitle } from '@/components/village/kit';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { APP_WINDOW, openAppWindow } from '@/lib/openExternal';
import {
  CONGREGATIONS,
  canWriteWorship,
  getLastReportDates,
  getMeetings,
  type WorshipMeeting,
} from '@/db/worship';

/**
 * 예배 — 홈 바둑판 첫 칸(2026-11-05 사장님 요청).
 *
 * 교회가 성도에게 가장 먼저 바라는 것이 예배다. 그래서 첫 칸이고, 안에서는
 * **장년 · 다음세대 · 청년** 세 덩이로 나뉜다. 한 줄로 늘어놓으면 주일학교
 * 예배를 찾는 부모가 장년 예배 다섯 줄을 지나야 한다.
 *
 * 예배 칸에 걸린 링크는 **늘 같은 것**(생중계·재생목록)이고, 그 주 영상은
 * 보고서에 붙는다. 매주 한 자리를 갈아 끼우면 지난주 영상으로 가는 길이
 * 사라진다.
 *
 * 로그인하지 않으면 예배 목록이 비어 보인다 — 자료가 교회로 갈려 있고, 어느
 * 교회 사람인지는 로그인해야 알 수 있다(`lib/churchScope.ts`). 그때는 교회
 * 유튜브 채널 하나를 대신 건다. 눌렀는데 아무것도 없는 것이 가장 나쁘다.
 */
export default function WorshipScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [meetings, setMeetings] = useState<WorshipMeeting[]>([]);
  const [lastReports, setLastReports] = useState<Map<string, string>>(new Map());
  const [canWrite, setCanWrite] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setMeetings([]);
        setCanWrite(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      (async () => {
        setMeetings(await getMeetings().catch(() => []));
        setLastReports(await getLastReportDates().catch(() => new Map<string, string>()));
        setCanWrite(await canWriteWorship().catch(() => false));
        setLoading(false);
      })();
    }, [session]),
  );

  return (
    <RoomScreen
      title="예배"
      emoji="⛪"
      subtitle="매주 예배와 예배별 보고서"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      {!session ? (
        <>
          <Empty text="로그인하면 우리 교회 예배가 보입니다." />
          <Card>
            <ThemedText type="smallBold">📺 새부대 방송</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              주일예배 · 새벽기도 생중계와 지난 설교
            </ThemedText>
            <Btn
              label="유튜브로 보기 ↗"
              onPress={() =>
                openAppWindow('https://www.youtube.com/@Newwineskin_Church', APP_WINDOW.churchBroadcast)
              }
            />
          </Card>
        </>
      ) : loading ? (
        <Empty text="예배를 불러오는 중입니다…" />
      ) : (
        <>
          {canWrite ? (
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                예배 칸을 더하고 링크를 걸 수 있습니다. 보고서는 예배를 눌러 안에서 씁니다.
              </ThemedText>
              <Btn label="예배 관리" onPress={() => router.push('/worship/manage' as Href)} />
            </Card>
          ) : null}

          {meetings.length === 0 ? (
            <Empty
              text={
                canWrite
                  ? '아직 등록된 예배가 없어요. 「예배 관리」에서 넣어 주세요.'
                  : '아직 등록된 예배가 없어요.'
              }
            />
          ) : (
            CONGREGATIONS.map((group) => {
              const rows = meetings.filter((m) => m.congregation === group.value);
              if (rows.length === 0) return null;
              return (
                <View key={group.value} style={styles.group}>
                  <SectionTitle hint={`${rows.length}개`}>
                    {group.emoji} {group.label}
                  </SectionTitle>
                  {rows.map((m) => {
                    const last = lastReports.get(m.id);
                    return (
                      <Card key={m.id} style={styles.row}>
                        {/* 칸 전체가 보고서로 가는 문이다 — 영상은 그 안에도 또 있다. */}
                        <View style={styles.rowHead}>
                          <View style={styles.rowText}>
                            <ThemedText type="smallBold">{m.name}</ThemedText>
                            {m.meetsAt ? (
                              <ThemedText type="small" themeColor="textSecondary">
                                {m.meetsAt}
                              </ThemedText>
                            ) : null}
                            <ThemedText type="small" themeColor="textSecondary">
                              {last ? `마지막 보고 — ${formatMeetDay(last)}` : '보고서가 아직 없어요'}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.rowButtons}>
                          {m.linkUrl ? (
                            <Btn
                              label={`${m.linkLabel || '영상 보기'} ↗`}
                              small
                              onPress={() => openAppWindow(m.linkUrl, APP_WINDOW.worship)}
                              style={styles.grow}
                            />
                          ) : null}
                          <Btn
                            label="보고서"
                            tone="ghost"
                            small
                            onPress={() => router.push(`/worship/${m.id}` as Href)}
                            style={styles.grow}
                          />
                        </View>
                      </Card>
                    );
                  })}
                </View>
              );
            })
          )}

          {/* 예배 칸에 링크가 안 걸린 교회도 방송은 늘 그 자리에 있다. */}
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              찾는 예배가 없으면 교회 방송에서 지난 영상을 볼 수 있어요.
            </ThemedText>
            <Btn
              label="📺 새부대 방송 ↗"
              tone="ghost"
              onPress={() =>
                openAppWindow('https://www.youtube.com/@Newwineskin_Church', APP_WINDOW.churchBroadcast)
              }
            />
          </Card>

          <ThemedText type="small" themeColor="textSecondary" style={[styles.footer, { color: theme.textSecondary }]}>
            보고서는 관리자 이상만 씁니다. 대표관리자만 보는 부분은 성도 화면에 나가지 않습니다.
          </ThemedText>
        </>
      )}
    </RoomScreen>
  );
}

const styles = StyleSheet.create({
  group: { gap: Spacing.two, marginBottom: Spacing.two },
  row: { gap: Spacing.two },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowText: { flex: 1, gap: 2 },
  rowButtons: { flexDirection: 'row', gap: Spacing.two },
  grow: { flexGrow: 1, flexBasis: 120 },
  footer: { textAlign: 'center', marginTop: Spacing.two },
});
