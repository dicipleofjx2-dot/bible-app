// 화면의 버튼이 부르는 것. 잠금·한도·진동을 여기서 한 번에 건다 — 화면마다 따로 걸면 한 곳은 빠진다.
import * as Haptics from 'expo-haptics';
import type { X32Client } from '@/x32/client';
import { maxFaderOf, roleTarget, type AppConfig, type Role } from '@/x32/config';
import { parseTargetKey, targetKey, type Target } from '@/x32/targets';

export type Ctx = { client: X32Client | null; config: AppConfig; locked: boolean; admin: boolean };
export type Result = { ok: true } | { ok: false; reason: string };

const tap = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const strong = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
const fail = (reason: string): Result => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  return { ok: false, reason };
};

function guard(ctx: Ctx, t?: Target): Result | null {
  if (ctx.locked) return fail('조작 잠금 중입니다');
  if (!ctx.client?.connected) return fail('X32 에 연결되어 있지 않습니다');
  if (!ctx.client.canOperate) return fail('장면을 불러오는 중입니다. 잠시 뒤에 다시 누르세요');
  if (t?.kind === 'main' && !ctx.admin) return fail('메인 LR 은 관리자 모드에서만 바꿀 수 있습니다');
  return null;
}

export function toggleMute(ctx: Ctx, t: Target): Result {
  const g = guard(ctx, t);
  if (g) return g;
  const on = ctx.client!.state.channels[targetKey(t)]?.on;
  if (on === undefined) return fail('아직 믹서 값을 읽지 못했습니다');
  ctx.client!.setOn(t, !on);
  tap();
  return { ok: true };
}

export function setFader(ctx: Ctx, t: Target, v: number, confirm = true): Result {
  const g = guard(ctx, t);
  if (g) return g;
  const max = maxFaderOf(ctx.config, targetKey(t));
  ctx.client!.setFader(t, Math.min(v, max), { confirm });
  return { ok: true };
}

export function fadeRole(ctx: Ctx, role: Role, dir: 'in' | 'out'): Result {
  const t = roleTarget(ctx.config, role);
  const g = guard(ctx, t);
  if (g) return g;
  const ms = ctx.config.fadeSeconds * 1000;
  const to = Math.min(ctx.config.bgmLevel, maxFaderOf(ctx.config, targetKey(t)));
  const ok = dir === 'out'
    ? ctx.client!.fade(t, 0, ms, ctx.config.fadeCurve, { muteAfter: true })
    : ctx.client!.fade(t, to, ms, ctx.config.fadeCurve, { fromZero: true });
  if (!ok) return fail('보내지 못했습니다');
  tap();
  return { ok: true };
}

export function cancelFade(ctx: Ctx, t: Target) {
  ctx.client?.cancelFade(targetKey(t));
  tap();
}

/** 지정한 마이크만 끈다. 메인·반주는 건드리지 않는다. */
export function muteGroup(ctx: Ctx, keys: string[]): Result {
  const g = guard(ctx);
  if (g) return g;
  for (const k of keys) {
    const t = parseTargetKey(k);
    if (t && t.kind !== 'main') ctx.client!.setOn(t, false);
  }
  strong();
  return { ok: true };
}

export function loadScene(ctx: Ctx, n: number): Result {
  const g = guard(ctx);
  if (g) return g;
  if (!ctx.client!.loadScene(n)) return fail('보내지 못했습니다');
  strong();
  return { ok: true };
}

export type Snapshot = { at: number; label: string; channels: Record<string, { fader?: number; on?: boolean }> };

export function takeSnapshot(ctx: Ctx, label: string): Snapshot | null {
  if (!ctx.client) return null;
  const channels: Snapshot['channels'] = {};
  for (const [k, v] of Object.entries(ctx.client.state.channels)) channels[k] = { fader: v.fader, on: v.on };
  return { at: Date.now(), label, channels };
}

/** 장면 호출 전에 찍어 둔 값으로 되돌린다. 메인 LR 은 관리자일 때만. */
export function restoreSnapshot(ctx: Ctx, snap: Snapshot): Result {
  const g = guard(ctx);
  if (g) return g;
  for (const [k, v] of Object.entries(snap.channels)) {
    const t = parseTargetKey(k);
    if (!t || (t.kind === 'main' && !ctx.admin)) continue;
    if (v.fader !== undefined) ctx.client!.setFader(t, Math.min(v.fader, maxFaderOf(ctx.config, k)));
    if (v.on !== undefined) ctx.client!.setOn(t, v.on);
  }
  strong();
  return { ok: true };
}
