// 방탈출에 쓸 소리 두 개를 만든다. 밖에서 받아 오지 않고 만드는 이유는
// 저작권을 따질 일이 없고 파일이 아주 작아서다(각 20~40KB).
//
//   unlock.wav — 자물쇠가 열릴 때. 짧은 두 음(도→솔).
//   escape.wav — 방에서 나왔을 때. 도-미-솔-도 올라가는 네 음.
//
// 다시 만들 일이 있으면: node scripts/make-arena-sounds.mjs
import { writeFileSync } from 'node:fs';

const RATE = 22050; // 말소리가 아니라 짧은 알림음이라 이 정도로 충분하다

/** 사인파 한 음. 앞뒤를 부드럽게 여닫아 「딱」 하는 잡음을 없앤다. */
function tone(freq, seconds, gain = 0.35) {
  const n = Math.floor(RATE * seconds);
  const out = new Float32Array(n);
  const fade = Math.floor(RATE * 0.006);
  for (let i = 0; i < n; i++) {
    let a = gain;
    if (i < fade) a *= i / fade;
    if (i > n - fade) a *= (n - i) / fade;
    out[i] = Math.sin((2 * Math.PI * freq * i) / RATE) * a;
  }
  return out;
}

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

writeFileSync('assets/sounds/unlock.wav', wav(concat([tone(C5, 0.075), tone(G5, 0.13)])));
writeFileSync(
  'assets/sounds/escape.wav',
  wav(concat([tone(C5, 0.11), tone(E5, 0.11), tone(G5, 0.11), tone(C6, 0.3)]))
);
console.log('assets/sounds/unlock.wav, escape.wav 를 만들었습니다');
