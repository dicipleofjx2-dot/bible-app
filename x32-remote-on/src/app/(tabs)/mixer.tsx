import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Fader } from '@/components/Fader';
import { Chip } from '@/components/ui';
import { useStore } from '@/lib/store';
import { parseTargetKey, type Target } from '@/x32/targets';

const DCAS: Target[] = Array.from({ length: 8 }, (_, k) => ({ kind: 'dca', n: k + 1 }));

/** 고른 채널 8개 / DCA 1~8 (§5.2) */
export default function Mixer() {
  const { config } = useStore();
  const [page, setPage] = useState<'quick' | 'dca'>('quick');
  const targets = page === 'quick' ? config.quickMixer.map(parseTargetKey).filter((t): t is Target => !!t) : DCAS;
  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabs}>
        <Chip label="내 채널 8" active={page === 'quick'} onPress={() => setPage('quick')} />
        <Chip label="DCA 1~8" active={page === 'dca'} onPress={() => setPage('dca')} />
      </View>
      <ScrollView horizontal contentContainerStyle={s.row}>
        {targets.map((t) => (
          <View key={`${t.kind}${t.n}`} style={{ width: 88 }}>
            <Fader target={t} height={380} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  row: { gap: 8, paddingHorizontal: 12, paddingBottom: 16, alignItems: 'flex-start' },
});
