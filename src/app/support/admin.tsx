import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  canManageSupport,
  getSupportSettingsFor,
  saveSupportSettings,
  type SupportScope,
  type SupportSettings,
} from '@/db/support';

const EMPTY_SETTINGS: SupportSettings = { coupangUrl: '', bankName: '', bankAccount: '', bankHolder: '' };

/**
 * 후원정보 관리 — 고치는 줄을 먼저 고른다.
 *
 * 우리 교회 줄과 모든 교회가 함께 쓰는 공용 줄이 따로 있다(0083). 어느 줄을
 * 고치는지 화면에 안 적으면, 쿠팡 링크를 우리 교회 줄에 적어 두고 「다른 교회에
 * 안 뜬다」고 하게 된다.
 *
 * 공용 줄은 전체 관리자만 고칠 수 있다 — 판정은 DB 에 맡긴다(`canManageSupport`).
 */
export default function SupportAdminScreen() {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const [canChurch, setCanChurch] = useState<boolean | null>(null);
  const [canShared, setCanShared] = useState(false);
  const [scope, setScope] = useState<SupportScope>('church');
  const [settings, setSettings] = useState<SupportSettings>(EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    Promise.all([canManageSupport('church'), canManageSupport('shared')])
      .then(([church, shared]) => {
        setCanChurch(church);
        setCanShared(shared);
        // 교회 줄을 못 고치는 분(전체 관리자인데 소속 교회가 없는 경우)은
        // 공용 줄에서 시작한다. 빈 화면을 보여 주고 끝낼 일이 아니다.
        if (!church && shared) setScope('shared');
      })
      .catch(() => {
        setCanChurch(false);
        setCanShared(false);
      });
  }, [session]);

  useFocusEffect(load);

  // 고치는 줄이 바뀌면 그 줄에 적혀 있는 대로 다시 읽는다. 덮은 값을 보여 주면
  // 공용에서 물려받은 것을 우리 교회 줄에 그대로 저장해 버린다.
  useEffect(() => {
    if (!session) return;
    setSaved(false);
    getSupportSettingsFor(scope)
      .then(setSettings)
      .catch(() => setSettings(EMPTY_SETTINGS));
  }, [session, scope]);

  function update<K extends keyof SupportSettings>(key: K, value: SupportSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const result = await saveSupportSettings(scope, settings);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  if (loading) return null;

  if (!session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">마이페이지에서 로그인해주세요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (canChurch === false && !canShared) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeAreaCentered}>
          <ThemedText themeColor="textSecondary">관리자만 접근할 수 있어요.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            후원정보 관리
          </ThemedText>

          {canShared && canChurch ? (
            <View style={styles.scopeRow}>
              {(
                [
                  { key: 'church', label: '우리 교회' },
                  { key: 'shared', label: '모든 교회 (공용)' },
                ] as const
              ).map((tab) => {
                const on = scope === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setScope(tab.key)}
                    style={[
                      styles.scopeTab,
                      {
                        backgroundColor: on ? theme.accentSoft : theme.backgroundElement,
                        borderColor: on ? theme.accent : theme.border,
                      },
                    ]}>
                    <ThemedText type={on ? 'smallBold' : 'small'}>{tab.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary">
            {scope === 'church'
              ? '우리 교회 성도에게만 보이는 값이에요. 빈 칸은 공용 값을 그대로 씁니다 — 계좌만 적으면 쿠팡 배너는 공용 링크로 그대로 뜹니다.'
              : '모든 교회에 함께 보이는 값이에요. 교회가 자기 값을 적어 두면 그 교회에서는 그것이 대신 보입니다.'}
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              쿠팡파트너스 링크
            </ThemedText>
            <TextInput
              value={settings.coupangUrl}
              onChangeText={(v) => update('coupangUrl', v)}
              placeholder="https://link.coupang.com/..."
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              은행명
            </ThemedText>
            <TextInput
              value={settings.bankName}
              onChangeText={(v) => update('bankName', v)}
              placeholder="예: 국민은행"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              계좌번호
            </ThemedText>
            <TextInput
              value={settings.bankAccount}
              onChangeText={(v) => update('bankAccount', v)}
              placeholder="000-0000-0000"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              예금주
            </ThemedText>
            <TextInput
              value={settings.bankHolder}
              onChangeText={(v) => update('bankHolder', v)}
              placeholder="예: 새부대교회"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>

          {error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          <Pressable
            disabled={saving}
            onPress={handleSave}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSelected, opacity: saving ? 0.5 : 1 }]}>
            <ThemedText type="smallBold">{saving ? '저장 중...' : saved ? '저장됨' : '저장'}</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  safeAreaCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.four,
  },
  title: {
    fontSize: 24,
  },
  section: {
    gap: Spacing.one,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  scopeTab: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  actionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  errorText: {
    color: '#e03131',
  },
});
