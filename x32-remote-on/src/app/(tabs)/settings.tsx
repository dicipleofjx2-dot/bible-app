import { useState, type ReactNode } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Chip, HoldButton } from '@/components/ui';
import { C } from '@/constants/theme';
import { IS_WEB, useMixer, useStore } from '@/lib/store';
import { CURVE_LABEL, type Curve } from '@/x32/fade';
import { ROLE_LABEL, sanitizeConfig, type AppConfig, type Role } from '@/x32/config';
import { dbToFader, faderToDb } from '@/x32/levels';
import { parseTargetKey, TARGET_RANGE, targetKey, targetLabel, type TargetKind } from '@/x32/targets';

const KINDS: [TargetKind, string][] = [['ch', 'CH'], ['auxin', 'AUX'], ['bus', 'BUS'], ['dca', 'DCA']];

/** "1,2,17 dca3 main" 처럼 적은 것을 대상 키로. 숫자만 쓰면 채널. */
function parseKeys(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.toLowerCase().match(/^(ch|auxin|aux|bus|dca)?:?(\d+)$/);
      if (w.toLowerCase() === 'main') return 'main:1';
      if (!m) return '';
      const kind = m[1] === 'aux' ? 'auxin' : (m[1] ?? 'ch');
      return `${kind}:${Number(m[2])}`;
    })
    .filter((k) => !!parseTargetKey(k));
}
const showKeys = (keys: string[]) => keys.map((k) => (k.startsWith('ch:') ? k.slice(3) : k === 'main:1' ? 'main' : k.replace(':', ''))).join(', ');

export default function Settings() {
  const store = useStore();
  const m = useMixer();
  const { config, saveConfig } = store;
  const up = (patch: Partial<AppConfig>) => saveConfig({ ...config, ...patch });
  const [host, setHost] = useState(config.host);
  const [restore, setRestore] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <Section title="① 믹서 연결">
        {IS_WEB ? (
          <Text style={s.note}>브라우저는 X32 에 직접 붙을 수 없어(UDP) 시뮬레이터로만 동작합니다. 실제 제어는 안드로이드 앱에서 하세요.</Text>
        ) : (
          <>
            <Row label="시뮬레이터(장비 없이 연습)">
              <Chip label={config.simulator ? '켜짐' : '꺼짐'} active={config.simulator} onPress={() => up({ simulator: !config.simulator })} />
            </Row>
            <Text style={s.label}>X32 IP 주소 (공유기에서 고정해 두세요)</Text>
            <View style={s.inline}>
              <TextInput value={host} onChangeText={setHost} keyboardType="numbers-and-punctuation" autoCapitalize="none" style={[s.input, { flex: 1, minWidth: 0 }]} placeholder="192.168.0.64" placeholderTextColor={C.sub} />
              <Chip label="저장·연결" onPress={() => up({ host: host.trim(), simulator: false })} />
            </View>
          </>
        )}
        <Text style={s.note}>
          {m.info ? `장비: ${m.info.name} · ${m.info.model} · 펌웨어 ${m.info.firmware}` : '장비 정보 없음'}
          {m.latencyMs !== null ? ` · 응답 ${m.latencyMs}ms` : ''}
        </Text>
        <Chip label="다시 연결" onPress={store.reconnect} />
      </Section>

      <Section title="② 버튼이 움직일 채널">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <TargetPicker key={r} label={ROLE_LABEL[r]} value={config.roles[r]} onChange={(k) => up({ roles: { ...config.roles, [r]: k } })}
            alias={config.aliases[config.roles[r]] ?? ''} mixerName={m.channels[config.roles[r]]?.name}
            onAlias={(a) => up({ aliases: { ...config.aliases, [config.roles[r]]: a } })} />
        ))}
        <KeysField label="긴급 음소거가 끄는 마이크 (예: 1, 2, 3, 4, 5)" value={config.emergencyMics} onSave={(k) => up({ emergencyMics: k })} />
        <KeysField label="빠른믹서 채널 8개 (예: 1, 2, 9, dca1, main)" value={config.quickMixer} onSave={(k) => up({ quickMixer: k.slice(0, 8) })} />
      </Section>

      <Section title="③ 배경음악 페이드">
        <Row label="시간">
          {[3, 5, 10].map((n) => <Chip key={n} label={`${n}초`} active={config.fadeSeconds === n} onPress={() => up({ fadeSeconds: n })} />)}
        </Row>
        <Row label="곡선">
          {(Object.keys(CURVE_LABEL) as Curve[]).map((c) => <Chip key={c} label={CURVE_LABEL[c]} active={config.fadeCurve === c} onPress={() => up({ fadeCurve: c })} />)}
        </Row>
        <DbStepper label="페이드 인 목표 음량" value={config.bgmLevel} onChange={(v) => up({ bgmLevel: v })} />
      </Section>

      <Section title="④ 안전 한도">
        <DbStepper label="메인 LR 최대" value={config.maxFader['main:1'] ?? 1} onChange={(v) => up({ maxFader: { ...config.maxFader, 'main:1': v } })} />
        <Row label="설교 마이크 켤 때 0.5초 길게 누르기">
          <Chip label={config.sermonHoldToUnmute ? '켜짐' : '꺼짐'} active={config.sermonHoldToUnmute} onPress={() => up({ sermonHoldToUnmute: !config.sermonHoldToUnmute })} />
        </Row>
        {store.admin ? (
          <Chip label="관리자 모드 끄기" active onPress={() => store.setAdmin(false)} />
        ) : (
          <HoldButton holdMs={2000} onFire={() => store.setAdmin(true)} style={s.adminBtn}>
            <Text style={s.adminText}>🔑 2초 길게 눌러 관리자 모드 (메인 LR 조절)</Text>
          </HoldButton>
        )}
        <Text style={s.note}>관리자 모드는 앱이 뒤로 가면 저절로 꺼집니다.</Text>
      </Section>

      <Section title="⑤ 설정 백업·복원">
        <Chip label="설정 내보내기(공유)" onPress={() => Share.share({ message: JSON.stringify(config) }).catch(() => {})} />
        <TextInput value={restore} onChangeText={setRestore} multiline placeholder="다른 폰에서 내보낸 설정을 여기에 붙여넣기" placeholderTextColor={C.sub} style={[s.input, { minHeight: 80 }]} />
        <Chip
          label="붙여넣은 설정으로 바꾸기"
          onPress={() => {
            try {
              const c = sanitizeConfig(JSON.parse(restore));
              saveConfig(c);
              setHost(c.host);
              setRestore('');
              setMsg('설정을 바꿨습니다');
            } catch {
              setMsg('설정 형식이 아닙니다');
            }
          }}
        />
        {msg && <Text style={s.note}>{msg}</Text>}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.h}>{title}</Text>
      {children}
    </View>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.wrap}>{children}</View>
    </View>
  );
}

function TargetPicker(p: { label: string; value: string; onChange: (k: string) => void; alias: string; mixerName?: string; onAlias: (a: string) => void }) {
  const t = parseTargetKey(p.value) ?? { kind: 'ch' as const, n: 1 };
  const [lo, hi] = TARGET_RANGE[t.kind];
  const step = (d: number) => p.onChange(targetKey({ kind: t.kind, n: Math.min(hi, Math.max(lo, t.n + d)) }));
  return (
    <View style={s.picker}>
      <Text style={s.pickerTitle}>{p.label} → {targetLabel(t)}{p.mixerName ? ` (믹서 이름: ${p.mixerName})` : ''}</Text>
      <View style={s.wrap}>
        {KINDS.map(([k, l]) => <Chip key={k} label={l} active={t.kind === k} onPress={() => p.onChange(targetKey({ kind: k, n: TARGET_RANGE[k][0] }))} />)}
      </View>
      <View style={s.inline}>
        <Chip label="−" onPress={() => step(-1)} />
        <Text style={s.num}>{t.n}</Text>
        <Chip label="+" onPress={() => step(1)} />
        <TextInput value={p.alias} onChangeText={p.onAlias} placeholder="화면에 보일 이름" placeholderTextColor={C.sub} maxLength={20} style={[s.input, { flex: 1, minWidth: 0 }]} />
      </View>
    </View>
  );
}

function KeysField({ label, value, onSave }: { label: string; value: string[]; onSave: (k: string[]) => void }) {
  const [text, setText] = useState(showKeys(value));
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inline}>
        <TextInput value={text} onChangeText={setText} autoCapitalize="none" style={[s.input, { flex: 1, minWidth: 0 }]} />
        <Chip label="저장" onPress={() => { const k = parseKeys(text); onSave(k); setText(showKeys(k)); }} />
      </View>
    </View>
  );
}

function DbStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const db = Math.round(faderToDb(value));
  const set = (d: number) => onChange(dbToFader(Math.max(-60, Math.min(10, (isFinite(db) ? db : -60) + d))));
  return (
    <View style={s.inline}>
      <Text style={[s.label, { flex: 1 }]}>{label}</Text>
      <Chip label="−3" onPress={() => set(-3)} />
      <Text style={s.num}>{isFinite(db) ? `${db > 0 ? '+' : ''}${db}dB` : '-∞'}</Text>
      <Chip label="+3" onPress={() => set(3)} />
    </View>
  );
}

const s = StyleSheet.create({
  page: { padding: 12, gap: 14, paddingBottom: 48 },
  section: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, gap: 10 },
  h: { color: C.text, fontSize: 19, fontWeight: '800' },
  label: { color: C.sub, fontSize: 15 },
  note: { color: C.sub, fontSize: 13 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, color: C.text, paddingHorizontal: 10, fontSize: 16 },
  picker: { gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line },
  pickerTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  num: { color: C.text, fontSize: 17, fontWeight: '800', minWidth: 56, textAlign: 'center' },
  adminBtn: { minHeight: 56, borderRadius: 12, borderWidth: 1.5, borderColor: C.warn, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  adminText: { color: C.warn, fontSize: 16, fontWeight: '800' },
});
