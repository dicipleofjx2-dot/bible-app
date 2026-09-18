import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { Type } from '@/constants/typography';
import { listOrgsForChurch, type InvOrg } from '@/db/inventory';
import { EmptyNote, InvCard, PhotoFrame, SectionTitle } from '@/features/inventory/ui';
import { useAuth } from '@/lib/auth';

/**
 * 교회운영ON 이 거는 주소 — `/church/<슬러그>`.
 *
 * 저쪽은 우리 관리 공간의 id 를 모른다. 교회 슬러그(새부대교회 = `sbd` 처럼)만
 * 안다. 그래서 슬러그로 찾아 **하나면 그대로 들어가고, 여럿이면 고르게** 한다.
 *
 * 찾는 일은 정책이 한다. 그 교회 물품 공간의 구성원이 아니면 아무것도 나오지
 * 않는다 — 슬러그를 안다고 열리지 않는다.
 */
export default function ChurchEntryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session, loading: authLoading } = useAuth();
  const [orgs, setOrgs] = useState<InvOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!slug || !session) {
      setLoading(false);
      return;
    }
    listOrgsForChurch(slug)
      .then((rows) => {
        if (!alive) return;
        setOrgs(rows);
        setLoading(false);
        if (rows.length === 1) router.replace(`/${rows[0].id}`);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [session, slug]);

  if (authLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : orgs.length === 0 ? (
            <InvCard>
              <EmptyNote
                emoji="🔑"
                text={'이 교회의 물품 공간을 찾지 못했습니다.\n아직 만들지 않았거나, 아직 초대받지 않으셨습니다.'}
              />
            </InvCard>
          ) : (
            <>
              <SectionTitle title="관리 공간 고르기" />
              {orgs.map((org) => (
                <InvCard key={org.id} style={styles.card} onPress={() => router.push(`/${org.id}`)}>
                  <PhotoFrame emoji="⛪" caption={org.name} />
                </InvCard>
              ))}
              <ThemedText themeColor="textSecondary" style={Type.caption}>
                교회운영ON 에서 넘어오셨습니다.
              </ThemedText>
            </>
          )}
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
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  card: { padding: Spacing.two, gap: Spacing.two },
});
