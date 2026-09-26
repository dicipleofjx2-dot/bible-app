import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '@/constants/theme';
import { IS_WEB, useMixer, useStore } from '@/lib/store';

/** 항상 보이는 맨 위 줄: 연결 · 주소 · 지연 · 조작 잠금(§5.1) */
export function StatusHeader() {
  const { config, locked, setLocked, admin, connectError, reconnect } = useStore();
  const m = useMixer();
  const sim = IS_WEB || config.simulator;
  const [color, bg, label] =
    connectError ? [C.off, C.offBg, '연결 불가']
    : m.status === 'connected' ? [C.on, C.onBg, sim ? '시뮬레이터 연결됨' : 'X32 연결됨']
    : m.status === 'lost' ? [C.off, C.offBg, '연결 끊김 — 조작 잠김']
    : [C.warn, C.warnBg, '연결 중…'];
  return (
    <View style={s.wrap}>
      <Pressable onPress={m.status === 'connected' ? undefined : reconnect} style={[s.conn, { backgroundColor: bg, borderColor: color }]}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[s.connText, { color }]} numberOfLines={1}>{label}</Text>
          <Text style={s.sub} numberOfLines={1}>
            {connectError ?? `${sim ? '장비 없음' : `${config.host}:${config.port}`}${m.latencyMs !== null ? ` · 지연 ${m.latencyMs}ms` : ''}${admin ? ' · 관리자' : ''}`}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: locked }}
        onPress={() => setLocked(!locked)}
        style={[s.lock, locked && { backgroundColor: C.warnBg, borderColor: C.warn }]}
      >
        <Text style={s.lockIcon}>{locked ? '🔒' : '🔓'}</Text>
        <Text style={[s.lockText, locked && { color: C.warn }]}>{locked ? '잠김' : '잠금'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  conn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  connText: { fontSize: 17, fontWeight: '800' },
  sub: { color: C.sub, fontSize: 13, marginTop: 2 },
  lock: { width: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card },
  lockIcon: { fontSize: 20 },
  lockText: { color: C.sub, fontSize: 13, fontWeight: '700' },
});
