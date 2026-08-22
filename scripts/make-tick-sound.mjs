/**
 * 3초 카운트다운에 쓸 「틱」 소리를 만든다.
 *
 * 소리 파일을 어디서 받아 오지 않고 여기서 만드는 이유는, 출처와 사용 조건이
 * 분명한 파일만 앱에 넣기 위해서다. 사인파 한 줄이면 되는 소리에 남의 저작물을
 * 끌어올 일이 아니다.
 *
 *   node scripts/make-tick-sound.mjs
 *
 * assets/sounds/tick.wav 를 새로 쓴다. 한 번 만들어 두면 다시 돌릴 일은 없다.
 */

import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 22050;
const DURATION = 0.06; // 60ms — 초를 세는 소리라 짧아야 한다
const FREQ = 1180; // 말소리보다 위, 귀에 거슬리지 않는 자리

const frameCount = Math.floor(SAMPLE_RATE * DURATION);
const pcm = Buffer.alloc(frameCount * 2);

for (let i = 0; i < frameCount; i++) {
  const t = i / SAMPLE_RATE;
  // 앞은 아주 짧게 올리고(딸깍 소리 방지) 뒤는 빠르게 죽인다.
  const attack = Math.min(1, t / 0.004);
  const decay = Math.exp(-t * 55);
  const sample = Math.sin(2 * Math.PI * FREQ * t) * attack * decay * 0.55;
  pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sample * 32767))), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // fmt 청크 크기
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // 모노
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // 초당 바이트
header.writeUInt16LE(2, 32); // 프레임당 바이트
header.writeUInt16LE(16, 34); // 비트 깊이
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const out = path.join(process.cwd(), 'assets', 'sounds', 'tick.wav');
fs.writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`${out} — ${(header.length + pcm.length) / 1024} KB`);
