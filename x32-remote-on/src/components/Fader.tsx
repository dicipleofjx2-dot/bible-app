import { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '@/constants/theme';
import { setFader, toggleMute } from '@/lib/actions';
import { useMixer, useStore } from '@/lib/store';
import { maxFaderOf } from '@/x32/config';
import { dbToFader, formatDb } from '@/x32/levels';
import { targetKey, targetLabel, type Target } from '@/x32/targets';
import { report } from './ui';

const SEND_EVERY_MS = 50;

export function useDisplayName(t: Target) {
  const { config } = useStore();
  const m = useMixer();
  const k = targetKey(t);
  return config.aliases[k] || m.channels[k]?.name || targetLabel(t);
}

/** 세로 페이더 + 음소거. 끌어서 조절, 두 번 톡 치면 0dB 로 돌아간다(§5.2). */
export function Fader({ target, height = 260, readOnly }: { target: Target; height?: number; readOnly?: boolean }) {
  const store = useStore();
  const m = useMixer();
  const k = targetKey(target);
  const ch = m.channels[k];
  const name = useDisplayName(target);
  const max = maxFaderOf(store.config, k);
  const [drag, setDrag] = useState<number | null>(null);
  const lastSent = useRef(0);
  const lastTap = useRef(0);
  const startV = useRef(0);
  const ctxRef = useRef(store);
  ctxRef.current = store;
  const valueRef = useRef(0);
  valueRef.current = ch?.fader ?? 0;

  const isMain = target.kind === 'main';
  const blocked = readOnly || (isMain && !store.admin);
  const fading = !!m.fades[k];
  const v = drag ?? ch?.fader ?? 0;
  const muted = ch?.on === false;
  const trackH = height - 24;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
          report(setFader(ctxRef.current, target, dbToFader(0)));
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;
        startV.current = valueRef.current;
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dy) < 3) return;
        const nv = Math.min(maxFaderOf(ctxRef.current.config, k), Math.max(0, startV.current - g.dy / trackH));
        setDrag(nv);
        const now = Date.now();
        if (now - lastSent.current >= SEND_EVERY_MS) {
          lastSent.current = now;
          const r = setFader(ctxRef.current, target, nv, false);
          if (!r.ok) {
            report(r);
            setDrag(null);
          }
        }
      },
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dy) >= 3) {
          const nv = Math.min(maxFaderOf(ctxRef.current.config, k), Math.max(0, startV.current - g.dy / trackH));
          report(setFader(ctxRef.current, target, nv, true));
        }
        setDrag(null);
      },
      onPanResponderTerminate: () => setDrag(null),
    }),
  ).current;

  return (
    <View style={[s.col, muted && { borderColor: C.off }]}>
      <Text style={s.name} numberOfLines={2}>{name}</Text>
      <Text style={[s.db, fading && { color: C.warn }]}>{ch?.fader === undefined ? '…' : `${formatDb(v)}dB`}</Text>
      <View style={[s.track, { height: trackH }]} {...(blocked ? {} : pan.panHandlers)}>
        {max < 1 && <View style={[s.maxLine, { bottom: max * trackH }]} />}
        <View style={[s.zero, { bottom: 0.75 * trackH }]} />
        <View style={[s.fill, { height: v * trackH, backgroundColor: muted ? C.off : fading ? C.warn : C.accent }]} />
        <View style={[s.knob, { bottom: v * trackH - 12 }, blocked && { backgroundColor: C.line }]} />
      </View>
      {blocked ? (
        <Text style={s.readonly}>{isMain ? '🔒 관리자' : '보기 전용'}</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name} ${muted ? '음소거 해제' : '음소거'}`}
          onPress={() => report(toggleMute(store, target))}
          style={[s.mute, muted ? { backgroundColor: C.offBg, borderColor: C.off } : { backgroundColor: C.onBg, borderColor: C.on }]}
        >
          <Text style={[s.muteText, { color: muted ? C.off : C.on }]}>{muted ? '🔇 꺼짐' : '🔊 켜짐'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  col: { flex: 1, minWidth: 76, alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, padding: 6, gap: 4 },
  name: { color: C.text, fontSize: 15, fontWeight: '800', textAlign: 'center', minHeight: 36 },
  db: { color: C.sub, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { width: 44, backgroundColor: '#0A0E1C', borderRadius: 10, justifyContent: 'flex-end', overflow: 'visible' },
  fill: { width: '100%', borderRadius: 10, opacity: 0.55, position: 'absolute', bottom: 0 },
  knob: { position: 'absolute', left: -6, right: -6, height: 24, borderRadius: 6, backgroundColor: C.text },
  zero: { position: 'absolute', left: -8, right: -8, height: 2, backgroundColor: C.sub, opacity: 0.6 },
  maxLine: { position: 'absolute', left: -8, right: -8, height: 2, backgroundColor: C.off },
  mute: { alignSelf: 'stretch', minHeight: 52, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  muteText: { fontSize: 15, fontWeight: '800' },
  readonly: { color: C.sub, fontSize: 13, minHeight: 52, textAlignVertical: 'center', paddingTop: 16 },
});
