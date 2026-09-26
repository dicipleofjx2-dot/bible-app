// 교회마다 다른 채널 배치를 담는 설정. 폰에만 저장한다(외부 서버 없음, §9 비상 원칙).
import type { Curve } from './fade';
import { parseTargetKey, type Target } from './targets';

export type Role = 'sermonMic' | 'youtube' | 'bgm' | 'praise';
export const ROLE_LABEL: Record<Role, string> = {
  sermonMic: '설교 마이크',
  youtube: '유튜브·영상',
  bgm: '배경음악',
  praise: '찬양팀 전체',
};

export type AppConfig = {
  version: 1;
  host: string;
  port: number;
  /** 장비 없이 연습·시연. 웹에서는 항상 켜진다. */
  simulator: boolean;
  roles: Record<Role, string>; // targetKey
  /** 긴급 음소거가 끄는 마이크들 — 메인이나 전체가 아니라 지정한 마이크만(§5.1) */
  emergencyMics: string[];
  quickMixer: string[];
  /** 대상별 최대 페이더(0~1). 없으면 +10dB 까지 */
  maxFader: Record<string, number>;
  /** 한글 별칭. 비우면 믹서의 채널 이름을 쓴다 */
  aliases: Record<string, string>;
  sceneAliases: Record<number, string>;
  fadeSeconds: number;
  fadeCurve: Curve;
  /** 배경음악 페이드 인 목표 */
  bgmLevel: number;
  /** 설교 마이크를 켤 때도 길게 누르게 할지 */
  sermonHoldToUnmute: boolean;
};

export const DEFAULT_CONFIG: AppConfig = {
  version: 1,
  host: '192.168.0.64',
  port: 10023,
  simulator: true,
  roles: { sermonMic: 'ch:2', youtube: 'ch:17', bgm: 'ch:19', praise: 'dca:1' },
  emergencyMics: ['ch:1', 'ch:2', 'ch:3', 'ch:4', 'ch:5'],
  quickMixer: ['ch:1', 'ch:2', 'ch:3', 'ch:9', 'ch:11', 'ch:17', 'ch:19', 'main:1'],
  maxFader: { 'main:1': 0.75 },
  aliases: { 'ch:17': '유튜브·맥북' },
  sceneAliases: {},
  fadeSeconds: 5,
  fadeCurve: 'scurve',
  bgmLevel: 0.6,
  sermonHoldToUnmute: true,
};

export function roleTarget(c: AppConfig, r: Role): Target {
  return parseTargetKey(c.roles[r]) ?? parseTargetKey(DEFAULT_CONFIG.roles[r])!;
}

export function watchedTargets(c: AppConfig): Target[] {
  const keys = new Set<string>([...Object.values(c.roles), ...c.emergencyMics, ...c.quickMixer, 'main:1']);
  for (let n = 1; n <= 8; n++) keys.add(`dca:${n}`);
  return [...keys].map(parseTargetKey).filter((t): t is Target => !!t);
}

/** 복원한 JSON 을 믿지 않는다. 모르는 칸은 버리고 빠진 칸은 기본값으로 채운다. */
export function sanitizeConfig(raw: unknown): AppConfig {
  const c = { ...DEFAULT_CONFIG };
  if (!raw || typeof raw !== 'object') return c;
  const r = raw as Record<string, any>;
  const key = (k: unknown) => (typeof k === 'string' && parseTargetKey(k) ? k : null);
  const keys = (a: unknown) => (Array.isArray(a) ? a.map(key).filter((k): k is string => !!k) : null);
  if (typeof r.host === 'string' && /^[\w.-]{1,253}$/.test(r.host)) c.host = r.host;
  if (Number.isInteger(r.port) && r.port > 0 && r.port < 65536) c.port = r.port;
  if (typeof r.simulator === 'boolean') c.simulator = r.simulator;
  if (r.roles && typeof r.roles === 'object') {
    c.roles = { ...c.roles };
    for (const role of Object.keys(ROLE_LABEL) as Role[]) c.roles[role] = key(r.roles[role]) ?? c.roles[role];
  }
  c.emergencyMics = keys(r.emergencyMics) ?? c.emergencyMics;
  c.quickMixer = (keys(r.quickMixer) ?? c.quickMixer).slice(0, 8);
  const numMap = (o: unknown) =>
    Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([k, v]) => key(k) && typeof v === 'number' && v >= 0 && v <= 1));
  const strMap = (o: unknown) =>
    Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, (v as string).slice(0, 20)]));
  if (r.maxFader) c.maxFader = numMap(r.maxFader);
  if (r.aliases) c.aliases = Object.fromEntries(Object.entries(strMap(r.aliases)).filter(([k]) => key(k)));
  if (r.sceneAliases) c.sceneAliases = strMap(r.sceneAliases);
  if (typeof r.fadeSeconds === 'number') c.fadeSeconds = Math.min(30, Math.max(0.5, r.fadeSeconds));
  if (['linear', 'scurve', 'fastStart', 'slowEnd'].includes(r.fadeCurve)) c.fadeCurve = r.fadeCurve;
  if (typeof r.bgmLevel === 'number') c.bgmLevel = Math.min(1, Math.max(0, r.bgmLevel));
  if (typeof r.sermonHoldToUnmute === 'boolean') c.sermonHoldToUnmute = r.sermonHoldToUnmute;
  return c;
}

export function maxFaderOf(c: AppConfig, key: string): number {
  return c.maxFader[key] ?? 1;
}
