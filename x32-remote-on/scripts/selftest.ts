// 장비 없이 돌리는 검사. npm test
import assert from 'node:assert/strict';
import { decode, encode, f, i, s } from '../src/osc/codec';
import { dbToFader, faderToDb, formatDb } from '../src/x32/levels';
import { faderAddr, onAddr, parseAddr, parseTargetKey } from '../src/x32/targets';
import { ease } from '../src/x32/fade';
import { sanitizeConfig, DEFAULT_CONFIG, watchedTargets } from '../src/x32/config';
import { X32Client } from '../src/x32/client';
import { SimMixer, createSimTransport } from '../src/x32/simMixer';
import { startEmulator } from './x32-emulator';
import { createNodeUdpTransport } from './nodeUdpTransport';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
const ok = (name: string, fn: () => void | Promise<void>) =>
  (async () => {
    await fn();
    n++;
    console.log('  ✓', name);
  })();

await ok('OSC 왕복: 문자열·정수·실수·빈 인자', () => {
  const m = { address: '/ch/01/config/name', args: [s('설교 마이크'), i(-3), f(0.75)] };
  const d = decode(encode(m))!;
  assert.equal(d.address, m.address);
  assert.deepEqual(d.args.map((a) => a.v), ['설교 마이크', -3, 0.75]);
  assert.equal(encode(m).length % 4, 0);
  assert.deepEqual(decode(encode({ address: '/info', args: [] })), { address: '/info', args: [] });
});

await ok('OSC 깨진 패킷은 null (수신 루프가 죽지 않음)', () => {
  assert.equal(decode(new Uint8Array([1, 2, 3])), null);
  assert.equal(decode(new Uint8Array(0)), null);
  const good = encode({ address: '/a', args: [f(1)] });
  assert.equal(decode(good.subarray(0, good.length - 2)), null);
});

await ok('실제 X32 바이트와 같다 (/ch/01/mix/fader ,f 0.75)', () => {
  const hex = Buffer.from(encode({ address: '/ch/01/mix/fader', args: [f(0.75)] })).toString('hex');
  assert.equal(hex, Buffer.concat([Buffer.from('/ch/01/mix/fader\0\0\0\0,f\0\0'), Buffer.from([0x3f, 0x40, 0, 0])]).toString('hex'));
});

await ok('페이더↔dB: 0.75=0dB, 0.5=-10dB, 1=+10dB, 0=-∞', () => {
  assert.equal(faderToDb(0.75), 0);
  assert.equal(faderToDb(0.5), -10);
  assert.equal(faderToDb(1), 10);
  assert.equal(faderToDb(0), -Infinity);
  assert.equal(formatDb(0), '-∞');
  for (const db of [-80, -60, -45, -30, -20, -10, -5, 0, 5, 10]) assert.ok(Math.abs(faderToDb(dbToFader(db)) - db) < 0.5, `${db}dB`);
});

await ok('주소 표: DCA 는 mix/ 가 없고 메인은 /main/st', () => {
  assert.equal(faderAddr({ kind: 'ch', n: 2 }), '/ch/02/mix/fader');
  assert.equal(onAddr({ kind: 'dca', n: 1 }), '/dca/1/on');
  assert.equal(faderAddr({ kind: 'main', n: 1 }), '/main/st/mix/fader');
  assert.deepEqual(parseAddr('/dca/3/fader'), { target: { kind: 'dca', n: 3 }, field: 'fader' });
  assert.equal(parseTargetKey('ch:33'), null);
  assert.equal(parseTargetKey('dca:0'), null);
});

await ok('페이드 곡선은 0→0, 1→1, 단조 증가', () => {
  for (const c of ['linear', 'scurve', 'fastStart', 'slowEnd'] as const) {
    assert.equal(ease(c, 0), 0);
    assert.equal(ease(c, 1), 1);
    for (let p = 0; p < 1; p += 0.1) assert.ok(ease(c, p + 0.1) >= ease(c, p));
  }
});

await ok('설정 복원: 이상한 값은 버린다', () => {
  const c = sanitizeConfig({ host: 'x; rm -rf', port: 99999, roles: { sermonMic: 'ch:99', bgm: 'ch:20' }, fadeSeconds: 900, maxFader: { 'main:1': 5, 'ch:1': 0.5 }, quickMixer: Array(20).fill('ch:1') });
  assert.equal(c.host, DEFAULT_CONFIG.host);
  assert.equal(c.port, 10023);
  assert.equal(c.roles.sermonMic, 'ch:2');
  assert.equal(c.roles.bgm, 'ch:20');
  assert.equal(c.fadeSeconds, 30);
  assert.deepEqual(c.maxFader, { 'ch:1': 0.5 });
  assert.equal(c.quickMixer.length, 8);
  assert.ok(watchedTargets(DEFAULT_CONFIG).length >= 16);
});

// ── 클라이언트 × 시뮬레이터 ─────────────────────────
const mixer = new SimMixer();
const tr = createSimTransport(mixer, { latencyMs: 6 });
const c = new X32Client(tr);
const sermon = { kind: 'ch' as const, n: 2 };
const bgm = { kind: 'ch' as const, n: 19 };
c.start(watchedTargets(DEFAULT_CONFIG));

await ok('연결되면 믹서 값·이름·장면을 읽어 온다', async () => {
  await sleep(150);
  assert.equal(c.state.status, 'connected');
  assert.equal(c.state.channels['ch:2'].name, '설교');
  assert.equal(c.state.channels['ch:2'].on, true);
  assert.equal(c.state.scenes[0], '주일예배');
  assert.ok(c.state.latencyMs !== null && c.state.latencyMs < 100);
});

await ok('음소거: 회신이 와야 화면 상태가 바뀐다', async () => {
  assert.ok(c.setOn(sermon, false));
  assert.equal(c.state.channels['ch:2'].on, true, '보내자마자 확정하지 않음');
  await sleep(40);
  assert.equal(c.state.channels['ch:2'].on, false);
  assert.equal((mixer.values.get('/ch/02/mix/on') as any).v, 0);
});

await ok('믹서 앞에서 바꾼 값이 앱에 들어온다(xremote)', async () => {
  mixer.pushFromDesk('/ch/02/mix/on', i(1));
  await sleep(30);
  assert.equal(c.state.channels['ch:2'].on, true);
});

await ok('페이드 아웃 0.4초 → 0, 끝나면 음소거', async () => {
  assert.ok(c.fade(bgm, 0, 400, 'scurve', { muteAfter: true }));
  assert.ok(c.state.fades['ch:19']);
  await sleep(250);
  const mid = (mixer.values.get('/ch/19/mix/fader') as any).v;
  assert.ok(mid > 0 && mid < 0.6, `중간값 ${mid}`);
  await sleep(300);
  assert.equal((mixer.values.get('/ch/19/mix/fader') as any).v, 0);
  assert.equal((mixer.values.get('/ch/19/mix/on') as any).v, 0);
  assert.equal(c.state.fades['ch:19'], undefined);
});

await ok('페이드 인: 음소거를 풀고 0 에서 목표까지', async () => {
  assert.ok(c.fade(bgm, 0.6, 300, 'linear', { fromZero: true }));
  await sleep(450);
  assert.equal((mixer.values.get('/ch/19/mix/on') as any).v, 1);
  assert.ok(Math.abs((mixer.values.get('/ch/19/mix/fader') as any).v - 0.6) < 1e-6);
});

await ok('페이드 중 사람이 페이더를 잡으면 멈춘다', async () => {
  c.fade(bgm, 0, 1000, 'linear');
  await sleep(200);
  mixer.pushFromDesk('/ch/19/mix/fader', f(0.9));
  await sleep(100);
  assert.equal(c.state.fades['ch:19'], undefined);
  await sleep(100);
  assert.ok(Math.abs((mixer.values.get('/ch/19/mix/fader') as any).v - 0.9) < 1e-6, '잡은 값을 덮어쓰지 않음');
});

await ok('끊기면: 3초 안에 lost, 페이드 중단, 명령 거절, 재연결 뒤 몰아치기 없음', async () => {
  c.fade(bgm, 0, 8000, 'linear');
  tr.drop = true;
  await sleep(4200);
  assert.equal(c.state.status, 'lost');
  assert.deepEqual(c.state.fades, {});
  assert.equal(c.setOn(sermon, false), false);
  assert.equal(c.setFader(sermon, 0.1), false);
  const before = (mixer.values.get('/ch/19/mix/fader') as any).v;
  tr.drop = false;
  await sleep(1300);
  assert.equal(c.state.status, 'connected');
  await sleep(100);
  assert.equal((mixer.values.get('/ch/02/mix/on') as any).v, 1, '끊겼을 때 누른 음소거가 나중에 가지 않음');
  assert.equal((mixer.values.get('/ch/19/mix/fader') as any).v, before, '페이드가 되살아나지 않음');
});

await ok('장면 호출: 호출 직후 조작 잠금 → 다시 읽은 값으로 풀림', async () => {
  assert.ok(c.loadScene(1));
  assert.equal(c.canOperate, false);
  assert.equal(c.setOn(sermon, true), false);
  await sleep(1600);
  assert.equal(c.canOperate, true);
  assert.equal(c.state.channels['ch:2'].on, false);
  assert.ok(Math.abs((c.state.channels['dca:1'].fader ?? 0) - 0.55) < 1e-6);
});
c.stop();

await ok('진짜 UDP 로 에뮬레이터에 붙는다', async () => {
  const emu = await startEmulator(0);
  const u = new X32Client(createNodeUdpTransport('127.0.0.1', emu.port));
  u.start([sermon]);
  await sleep(200);
  assert.equal(u.state.status, 'connected');
  assert.equal(u.state.info?.model, 'X32');
  u.setFader(sermon, dbToFader(-10));
  await sleep(50);
  assert.equal(faderToDb(u.state.channels['ch:2'].fader!).toFixed(1), '-10.0');
  u.stop();
  emu.close();
});

console.log(`\n${n}개 통과`);
