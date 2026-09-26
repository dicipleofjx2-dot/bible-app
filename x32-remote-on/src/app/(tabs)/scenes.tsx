import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HoldButton, report } from '@/components/ui';
import { C, MIN_TOUCH } from '@/constants/theme';
import { loadScene, restoreSnapshot, takeSnapshot, type Snapshot } from '@/lib/actions';
import { useMixer, useStore } from '@/lib/store';

/**
 * X32 에 저장된 장면 호출(§5.4). 저장·덮어쓰기는 앱에서 하지 않는다 — 방송실에서만.
 * 부르기 전 지켜보던 채널 값을 폰에 찍어 두어, 잘못 불렀을 때 되돌릴 수 있게 한다.
 */
export default function Scenes() {
  const store = useStore();
  const m = useMixer();
  const [picked, setPicked] = useState<number | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const list = Object.entries(m.scenes)
    .map(([n, name]) => ({ n: Number(n), name: store.config.sceneAliases[Number(n)] || name }))
    .filter((x) => x.name)
    .sort((a, b) => a.n - b.n);
  const syncing = Date.now() < m.syncingUntil;

  return (
    <ScrollView contentContainerStyle={s.page}>
      {syncing && <Text style={s.syncing}>⏳ 장면을 불러와 믹서 값을 다시 읽는 중 — 잠시 조작이 잠깁니다</Text>}
      {snap && (
        <HoldButton holdMs={1000} onFire={() => report(restoreSnapshot(store, snap))} style={[s.item, s.undo]}>
          <Text style={s.title}>↩ 「{snap.label}」 부르기 전으로 되돌리기</Text>
          <Text style={s.sub}>1초 길게 누르기 · 지켜보던 채널 {Object.keys(snap.channels).length}개의 음량·음소거</Text>
        </HoldButton>
      )}
      {list.length === 0 && <Text style={s.sub}>믹서에서 장면 이름을 읽지 못했습니다. 연결을 확인하세요.</Text>}
      {list.map((x) =>
        picked === x.n ? (
          <View key={x.n} style={[s.item, { borderColor: C.warn }]}>
            <Text style={s.title}>{String(x.n).padStart(2, '0')} · {x.name}</Text>
            <Text style={s.sub}>채널 음량·음소거·DCA 가 이 장면 값으로 한꺼번에 바뀝니다.</Text>
            <View style={s.row}>
              <Pressable onPress={() => setPicked(null)} style={[s.btn, { borderColor: C.line }]}>
                <Text style={s.btnText}>취소</Text>
              </Pressable>
              <HoldButton
                holdMs={1000}
                fill="rgba(245,197,66,0.4)"
                onFire={() => {
                  const sn = takeSnapshot(store, x.name);
                  const r = loadScene(store, x.n);
                  report(r);
                  if (r.ok) {
                    setSnap(sn);
                    setPicked(null);
                  }
                }}
                style={[s.btn, { borderColor: C.warn, flex: 2 }]}
              >
                <Text style={[s.btnText, { color: C.warn }]}>1초 길게 눌러 호출</Text>
              </HoldButton>
            </View>
          </View>
        ) : (
          <Pressable key={x.n} onPress={() => setPicked(x.n)} style={s.item}>
            <Text style={s.title}>{String(x.n).padStart(2, '0')} · {x.name}</Text>
          </Pressable>
        ),
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 12, gap: 10, paddingBottom: 32 },
  item: { minHeight: MIN_TOUCH, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card, padding: 14, justifyContent: 'center', gap: 6, overflow: 'hidden' },
  undo: { borderColor: C.accent },
  title: { color: C.text, fontSize: 19, fontWeight: '800' },
  sub: { color: C.sub, fontSize: 14 },
  syncing: { color: C.warn, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1, minHeight: 56, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  btnText: { color: C.text, fontSize: 17, fontWeight: '800' },
});
