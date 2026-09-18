import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { createOrg, listOrgs, summaryRows, type InvOrg, type SummaryRow } from '@/db/inventory';
import { usePhotoUrls } from '@/features/inventory/photos';
import {
  ChipRow,
  EmptyNote,
  Field,
  Hero,
  InvCard,
  PhotoFrame,
  PrimaryButton,
  SectionTitle,
  StatLine,
} from '@/features/inventory/ui';
import { useAuth } from '@/lib/auth';
import { ORG_KINDS, summarize, summaryLine, type OrgKind } from '@/lib/inventory';

/**
 * 물품관리ON 첫 화면 — 어느 공간을 관리할지 고른다(기획서 §3.1).
 *
 * 교회 물품과 집 물품을 한 목록에 섞지 않는다. 섞는 순간 교회 봉사자가 그 집
 * 안방 사진을 보게 된다. 공간을 고르고 들어가는 이 한 걸음이 그 경계다.
 */
export default function InventoryScreen() {
  const { session, loading: authLoading } = useAuth();
  const ownerId = session?.user.id ?? null;

  const [orgs, setOrgs] = useState<InvOrg[]>([]);
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrgKind>('church');

  const load = useCallback(async () => {
    // 로그인 전에도 이 함수가 한 번 지난다. 그냥 돌아가면 돌림표가 영영 돈다.
    if (!ownerId) {
      setLoading(false);
      return;
    }
    try {
      const [nextOrgs, nextRows] = await Promise.all([listOrgs(), summaryRows()]);
      setOrgs(nextOrgs);
      setRows(nextRows);
      setMessage('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const photos = usePhotoUrls(orgs.map((o) => o.cover_path));

  async function submit() {
    if (!ownerId || !name.trim()) return;
    setBusy(true);
    try {
      const id = await createOrg(ownerId, { name: name.trim(), kind });
      setName('');
      setFormOpen(false);
      router.push(`/inventory/${id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return null;
  if (!session) return <Redirect href="/profile" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Hero
            emoji="📦"
            title="물품관리ON"
            subtitle="교회와 가정을 한눈에 정리하는 사진형 물품관리"
          />

          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : (
            <>
              <SectionTitle title="관리 공간" />
              {orgs.length === 0 ? (
                <InvCard>
                  <EmptyNote
                    emoji="🏠"
                    text={'아직 관리 공간이 없습니다.\n교회나 집을 하나 만들고 사진부터 찍어 보세요.'}
                  />
                </InvCard>
              ) : (
                <View style={styles.grid}>
                  {orgs.map((org) => {
                    const meta = ORG_KINDS.find((k) => k.id === org.kind);
                    const summary = summarize(rows.filter((r) => r.org_id === org.id));
                    return (
                      <InvCard
                        key={org.id}
                        style={styles.orgCard}
                        onPress={() => router.push(`/inventory/${org.id}`)}>
                        <PhotoFrame
                          url={org.cover_path ? photos[org.cover_path] : undefined}
                          emoji={meta?.emoji ?? '📦'}
                          caption={org.name}
                        />
                        <View style={styles.orgFoot}>
                          <ThemedText themeColor="textSecondary" style={Type.caption}>
                            {meta?.label ?? ''}
                          </ThemedText>
                          <StatLine text={summaryLine(summary)} />
                        </View>
                      </InvCard>
                    );
                  })}
                </View>
              )}

              {formOpen ? (
                <InvCard>
                  <SectionTitle title="새 관리 공간" />
                  <Field
                    label="이름"
                    value={name}
                    onChangeText={setName}
                    placeholder="새부대교회 / 우리 집"
                  />
                  <ChipRow
                    label="유형"
                    options={ORG_KINDS.map((k) => ({ id: k.id, label: `${k.emoji} ${k.label}` }))}
                    value={kind}
                    onChange={setKind}
                  />
                  <ThemedText themeColor="textSecondary" style={Type.caption}>
                    {ORG_KINDS.find((k) => k.id === kind)?.hint}
                  </ThemedText>
                  <View style={styles.row}>
                    <PrimaryButton
                      label="취소"
                      tone="quiet"
                      onPress={() => setFormOpen(false)}
                      style={styles.flex}
                    />
                    <PrimaryButton
                      label={busy ? '만드는 중…' : '만들기'}
                      onPress={submit}
                      disabled={busy || !name.trim()}
                      style={styles.flex}
                    />
                  </View>
                </InvCard>
              ) : (
                <PrimaryButton label="＋ 관리 공간 만들기" onPress={() => setFormOpen(true)} />
              )}

              <InvCard>
                <ThemedText themeColor="textSecondary" style={Type.caption}>
                  여기 올리는 사진은 초대한 사람만 볼 수 있습니다. 주소를 아는 것만으로는 열리지
                  않도록 사진을 비공개 보관함에 담고, 볼 때마다 짧게 살아 있는 주소를 새로 받습니다.
                </ThemedText>
              </InvCard>
            </>
          )}

          {message ? (
            <ThemedText themeColor="textSecondary" style={Type.caption}>
              {message}
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  grid: { gap: Spacing.three },
  orgCard: { padding: Spacing.two, gap: Spacing.two },
  orgFoot: { paddingHorizontal: Spacing.two, paddingBottom: Spacing.one, gap: 2 },
  row: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
