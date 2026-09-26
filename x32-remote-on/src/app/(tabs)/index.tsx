import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Fader, useDisplayName } from '@/components/Fader';
import { HoldButton, report } from '@/components/ui';
import { C, MIN_TOUCH } from '@/constants/theme';
import { cancelFade, fadeRole, muteGroup, toggleMute } from '@/lib/actions';
import { useMixer, useStore } from '@/lib/store';
import { roleTarget } from '@/x32/config';
import { targetKey, type Target } from '@/x32/targets';

/** 새부대교회 권장 기본 화면(§15): 큰 버튼 6개 + 미니 페이더 4개 */
export default function Home() {
  const store = useStore();
  const m = useMixer();
  const { config } = store;
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const sermon = roleTarget(config, 'sermonMic');
  const yt = roleTarget(config, 'youtube');
  const bgm = roleTarget(config, 'bgm');
  const praise = roleTarget(config, 'praise');
  const on = (t: Target) => m.channels[targetKey(t)]?.on;
  const bgmFading = m.fades[targetKey(bgm)];
  const sec = config.fadeSeconds;
  const disabled = store.locked || m.status !== 'connected';

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={[s.grid, wide && { flexWrap: 'wrap', flexDirection: 'row' }]}>
        <ToggleButton
          target={sermon}
          on={on(sermon)}
          holdToOn={config.sermonHoldToUnmute ? 500 : 0}
          disabled={disabled}
          onFire={() => report(toggleMute(store, sermon))}
          wide={wide}
        />
        <ToggleButton target={yt} on={on(yt)} holdToOn={0} disabled={disabled} onFire={() => report(toggleMute(store, yt))} wide={wide} />
        {/* 페이드 중에도 버튼 수·자리를 바꾸지 않는다. 바뀌면 아래 버튼이 손가락 밑으로 밀려 온다. */}
        {(['out', 'in'] as const).map((dir) => {
          const mine = bgmFading && (bgmFading.to > bgmFading.from ? 'in' : 'out') === dir;
          if (mine) {
            const left = Math.max(0, Math.ceil((bgmFading.durationMs - (Date.now() - bgmFading.startedAt)) / 1000));
            return (
              <HoldButton key={dir} holdMs={0} onFire={() => cancelFade(store, bgm)} style={[s.big, s.warn, wide && s.half]}>
                <Text style={[s.bigTitle, { color: C.warn }]}>⏹ 페이드 멈추기</Text>
                <Text style={s.bigSub}>배경음악 {dir === 'in' ? '올리는' : '줄이는'} 중 · 약 {left}초 남음 · 누르면 그 자리에서 멈춤</Text>
              </HoldButton>
            );
          }
          return (
            <HoldButton key={dir} holdMs={0} disabled={disabled || !!bgmFading} onFire={() => report(fadeRole(store, 'bgm', dir))} style={[s.big, wide && s.half]}>
              <Text style={s.bigTitle}>{dir === 'out' ? `🎵↘ 배경음악 ${sec}초 페이드 아웃` : `🎵↗ 배경음악 ${sec}초 페이드 인`}</Text>
              <Text style={s.bigSub}>{dir === 'out' ? '끝나면 음소거' : '저장한 음량까지'}</Text>
            </HoldButton>
          );
        })}
        <ToggleButton target={praise} on={on(praise)} holdToOn={0} disabled={disabled} onFire={() => report(toggleMute(store, praise))} wide={wide} suffix="전체" />
        <HoldButton
          holdMs={2000}
          disabled={disabled}
          fill="rgba(240,80,74,0.45)"
          onFire={() => report(muteGroup(store, config.emergencyMics))}
          style={[s.big, s.danger, wide && s.half]}
          accessibilityLabel="긴급 마이크 전체 음소거, 2초 길게 누르기"
        >
          <Text style={[s.bigTitle, { color: C.off }]}>🚨 긴급: 마이크 전체 음소거</Text>
          <Text style={s.bigSub}>2초 길게 누르기 · 지정 마이크 {config.emergencyMics.length}개만</Text>
        </HoldButton>
      </View>

      <View style={s.faders}>
        <Fader target={sermon} height={220} />
        <Fader target={praise} height={220} />
        <Fader target={yt} height={220} />
        <Fader target={{ kind: 'main', n: 1 }} height={220} />
      </View>
    </ScrollView>
  );
}

function ToggleButton(p: { target: Target; on: boolean | undefined; holdToOn: number; disabled: boolean; onFire: () => void; wide: boolean; suffix?: string }) {
  const name = useDisplayName(p.target);
  const unknown = p.on === undefined;
  const hold = p.on === false ? p.holdToOn : 0;
  return (
    <HoldButton
      holdMs={hold}
      disabled={p.disabled || unknown}
      onFire={p.onFire}
      fill={p.on === false ? 'rgba(47,191,113,0.4)' : undefined}
      style={[s.big, unknown ? null : p.on ? s.on : s.off, p.wide && s.half]}
      accessibilityLabel={`${name} ${p.on ? '켜짐, 누르면 끔' : '꺼짐, 누르면 켬'}`}
    >
      <View style={s.row}>
        <Text style={s.bigTitle} numberOfLines={1}>{name}{p.suffix ? ` ${p.suffix}` : ''}</Text>
        <Text style={[s.state, { color: unknown ? C.sub : p.on ? C.on : C.off }]}>{unknown ? '…' : p.on ? '🔊 켜짐' : '🔇 꺼짐'}</Text>
      </View>
      <Text style={s.bigSub}>{unknown ? '믹서 값을 읽는 중' : p.on ? '누르면 끕니다' : hold ? `${hold / 1000}초 길게 눌러 켭니다` : '누르면 켭니다'}</Text>
    </HoldButton>
  );
}

const s = StyleSheet.create({
  page: { padding: 12, gap: 14, paddingBottom: 32 },
  grid: { gap: 10 },
  big: { minHeight: MIN_TOUCH + 12, borderRadius: 16, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center', overflow: 'hidden' },
  half: { width: '49%' },
  on: { borderColor: C.on, backgroundColor: C.onBg },
  off: { borderColor: C.off, backgroundColor: C.offBg },
  warn: { borderColor: C.warn, backgroundColor: C.warnBg },
  danger: { borderColor: C.off, backgroundColor: '#2A1014' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bigTitle: { color: C.text, fontSize: 21, fontWeight: '800', flexShrink: 1 },
  state: { fontSize: 18, fontWeight: '800' },
  bigSub: { color: C.sub, fontSize: 14, marginTop: 4 },
  faders: { flexDirection: 'row', gap: 8 },
});
