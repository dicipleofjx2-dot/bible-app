(() => {
'use strict';
const C = ShortsCore;
const $ = (id) => document.getElementById(id);
const W = 1080, H = 1920;
const cv = $('cv'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
const aud = $('aud');
const st = { sents: [], dur: 0, sel: null, tap: null, exporting: false, audioFile: null, bgImg: null, bgVid: null };

const THEMES = { night: ['#0b1020', '#23358a'], dawn: ['#3b0d0d', '#e8871e'], forest: ['#06241a', '#2f7d5b'], royal: ['#1b0b3a', '#7a3fd1'], ink: ['#000', '#1c1c1c'] };
const FONTS = { sans: ['900', '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif'], han: ['400', '"Black Han Sans","Noto Sans KR",sans-serif'], serif: ['900', '"Noto Serif KR",serif'] };
const MIX = ['karaoke', 'pop', 'keyword', 'slide', 'type'];
const STYLE_NAMES = { auto: '자동', karaoke: '노래방', pop: '한 단어 팝', keyword: '키워드', type: '타자기', slide: '슬라이드', card: '구절 카드' };

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const setStatus = (m) => { $('status').textContent = m; };

/* ---------- 옵션 ---------- */
let O;
const layoutCache = new Map();
function readOpts() {
  return { style: $('styleSel').value, font: $('fontSel').value, theme: $('themeSel').value, accent: $('accent').value,
    size: +$('size').value, dim: +$('dim').value / 100, foot: $('foot').value.trim(), fg: '#ffffff' };
}
async function onOpts() {
  O = readOpts(); layoutCache.clear();
  const [wt, fam] = FONTS[O.font];
  try { await document.fonts.load(`${wt} 80px ${fam}`, '가나다라 성경 Abc'); layoutCache.clear(); } catch {}
}
['styleSel', 'fontSel', 'themeSel', 'accent', 'size', 'dim', 'foot'].forEach((id) => $(id).addEventListener('input', onOpts));
O = readOpts(); onOpts();

const setFont = (px) => { const [wt, fam] = FONTS[O.font]; ctx.font = `${wt} ${px}px ${fam}`; };

/* ---------- 레이아웃 ---------- */
function keywordSet(sent, style) {
  const set = new Set();
  sent.words.forEach((w, i) => { if (w.k) set.add(i); });
  if (style === 'keyword' && !set.size) {
    let best = 0, bl = -1;
    sent.words.forEach((w, i) => { const l = C.chars(w.t).length; if (l > bl) { bl = l; best = i; } });
    set.add(best);
  }
  return set;
}
function layout(si, style, mul) {
  const key = [si, style, mul, O.size, O.font, st.sents[si].words.map((w) => w.t + (w.k ? '*' : '')).join(' ')].join('|');
  const hit = layoutCache.get(key); if (hit) return hit;
  const sent = st.sents[si], base = O.size * mul, kws = keywordSet(sent, style), kwMul = style === 'keyword' ? 1.45 : 1;
  const items = sent.words.map((w, wi) => {
    const sz = base * (kws.has(wi) ? kwMul : 1); setFont(sz);
    return { wi, sz, w: ctx.measureText(w.t).width, k: kws.has(wi) };
  });
  const gap = base * 0.3, maxW = W - 220, lines = [];
  let line = { items: [], w: 0, h: 0 };
  items.forEach((it) => {
    if (line.items.length && line.w + gap + it.w > maxW) { lines.push(line); line = { items: [], w: 0, h: 0 }; }
    line.w += (line.items.length ? gap : 0) + it.w; line.h = Math.max(line.h, it.sz * 1.3); line.items.push(it);
  });
  if (line.items.length) lines.push(line);
  lines.forEach((l) => { let x = (W - l.w) / 2; l.items.forEach((it) => { it.x = x; x += it.w + gap; }); });
  const out = { lines, h: lines.reduce((a, l) => a + l.h, 0) };
  layoutCache.set(key, out); return out;
}

/* ---------- 그리기 ---------- */
const curIdx = (sent, t) => { let r = -1; for (let i = 0; i < sent.words.length; i++) { if (sent.words[i].s <= t) r = i; else break; } return r; };
function activeSentence(t) {
  let a = -1;
  for (let i = 0; i < st.sents.length; i++) { if (st.sents[i].words[0].s - 0.25 <= t) a = i; else break; }
  if (a < 0) return -1;
  const ws = st.sents[a].words, nx = st.sents[a + 1];
  if (t > ws[ws.length - 1].e + 1.0 && (!nx || nx.words[0].s - 0.25 > t)) return -1;
  return a;
}
function wordParams(style, item, sent, idx, t) {
  const w = sent.words[item.wi], dt = t - w.s, spoken = item.wi <= idx, cur = item.wi === idx;
  const p = { a: 1, sc: 1, dy: 0, color: O.fg, text: null };
  switch (style) {
    case 'karaoke': case 'card':
      p.a = spoken ? 1 : 0.32;
      if (cur) { p.color = O.accent; if (style === 'karaoke') p.sc = 1 + 0.16 * (1 - clamp01(dt / 0.25)); }
      else if (spoken && w.k) p.color = O.accent;
      break;
    case 'keyword':
      if (!spoken) p.a = 0;
      else { const k = clamp01(dt / 0.18); p.a = k; p.dy = (1 - k) * 36; p.sc = item.k ? 0.6 + 0.4 * back(dt / 0.3) : 0.9 + 0.1 * k; if (item.k) p.color = O.accent; }
      break;
    case 'type':
      if (!spoken) p.a = 0;
      else if (cur) {
        const cs = Array.from(w.t), f = clamp01(dt / Math.max(0.12, (w.e - w.s) * 0.9));
        p.text = cs.slice(0, Math.max(1, Math.ceil(cs.length * f))).join(''); p.color = O.accent;
      } else if (w.k) p.color = O.accent;
      break;
    case 'slide':
      p.a = spoken ? 1 : 0.5; if (cur) p.color = O.accent; else if (spoken && w.k) p.color = O.accent;
      break;
  }
  return p;
}
function strokeFill(text, x, sz, color) {
  ctx.lineJoin = 'round'; ctx.lineWidth = sz * 0.14; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.strokeText(text, x, 0); ctx.fillStyle = color; ctx.fillText(text, x, 0);
}
function drawSentence(si, t, style, mul, cy, alpha = 1, yShift = 0) {
  const sent = st.sents[si], L = layout(si, style, mul), idx = curIdx(sent, t);
  let y = cy - L.h / 2 + yShift;
  ctx.textBaseline = 'middle';
  L.lines.forEach((line) => {
    const yc = y + line.h / 2;
    line.items.forEach((it) => {
      const p = wordParams(style, it, sent, idx, t); if (p.a <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp01(p.a * alpha);
      ctx.translate(it.x + it.w / 2, yc + p.dy); ctx.scale(p.sc, p.sc); setFont(it.sz);
      if (p.text !== null) { ctx.textAlign = 'left'; strokeFill(p.text, -it.w / 2, it.sz, p.color); }
      else { ctx.textAlign = 'center'; strokeFill(sent.words[it.wi].t, 0, it.sz, p.color); }
      if (style === 'slide' && it.wi === idx) { ctx.fillStyle = O.accent; ctx.fillRect(-it.w / 2, it.sz * 0.52, it.w, 8); }
      ctx.restore();
    });
    y += line.h;
  });
}
function drawPop(si, t, cy) {
  const sent = st.sents[si], idx = curIdx(sent, t);
  if (idx >= 0) {
    const w = sent.words[idx], dt = t - w.s;
    let sz = O.size * 1.9; setFont(sz);
    const tw = ctx.measureText(w.t).width; if (tw > W - 160) sz *= (W - 160) / tw;
    ctx.save(); ctx.translate(W / 2, cy); ctx.scale(0.55 + 0.45 * back(dt / 0.22), 0.55 + 0.45 * back(dt / 0.22));
    ctx.globalAlpha = clamp01(dt / 0.06 + 0.2); setFont(sz); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    strokeFill(w.t, 0, sz, w.k ? O.accent : O.fg); ctx.restore();
  }
  drawSentence(si, t, 'karaoke', 0.5, H * 0.74);
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawCard(si, t, cy) {
  const sent = st.sents[si], L = layout(si, 'card', 0.9), a = easeOut((t - (sent.words[0].s - 0.25)) / 0.35);
  const ch = L.h + 260, cx0 = 70, cw = W - 140, top = cy - ch / 2;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, cy); ctx.scale(0.94 + 0.06 * a, 0.94 + 0.06 * a); ctx.translate(-W / 2, -cy);
  roundRect(cx0, top, cw, ch, 36); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = O.accent; ctx.stroke();
  if (sent.ref) { setFont(54); ctx.fillStyle = O.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sent.ref, W / 2, top + 90); }
  ctx.restore();
  drawSentence(si, t, 'card', 0.9, cy + 40, a);
}
function drawBg(t) {
  const [c1, c2] = THEMES[O.theme], g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const el = st.bgVid || st.bgImg;
  if (el) {
    const w = el.videoWidth || el.naturalWidth, h = el.videoHeight || el.naturalHeight;
    if (w && h) {
      const z = (st.bgImg && !st.bgVid ? 1 + 0.06 * (t / Math.max(1, st.dur)) : 1) * Math.max(W / w, H / h);
      ctx.drawImage(el, (W - w * z) / 2, (H - h * z) / 2, w * z, h * z);
    }
    ctx.fillStyle = `rgba(0,0,0,${O.dim})`; ctx.fillRect(0, 0, W, H);
  } else {
    const r = ctx.createRadialGradient(W / 2 + Math.sin(t * 0.4) * 220, H * 0.3, 20, W / 2, H * 0.4, 900);
    r.addColorStop(0, 'rgba(255,255,255,.14)'); r.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
  }
}
const styleFor = (si) => {
  const s = st.sents[si];
  if (s.style !== 'auto') return s.style;
  if (O.style !== 'mix') return O.style;
  return s.ref ? 'card' : MIX[si % MIX.length];
};
function render(t) {
  drawBg(t);
  const si = st.sents.length ? activeSentence(t) : -1, cy = H * 0.46;
  if (si >= 0) {
    const style = styleFor(si);
    if (style === 'pop') drawPop(si, t, cy);
    else if (style === 'card') drawCard(si, t, cy);
    else if (style === 'slide') { const a = easeOut((t - (st.sents[si].words[0].s - 0.25)) / 0.35); drawSentence(si, t, 'slide', 1, cy, a, (1 - a) * 90); }
    else drawSentence(si, t, style, 1, cy);
  }
  if (st.dur) { ctx.fillStyle = O.accent; ctx.fillRect(0, 0, W * clamp01(t / st.dur), 10); }
  if (O.foot) { ctx.save(); ctx.globalAlpha = 0.75; setFont(44); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; strokeFill(O.foot, W / 2, 44, '#fff'); ctx.restore(); }
}

/* ---------- 재생 루프 ---------- */
let seeking = false, lastChip = '';
function frame() {
  const t = aud.currentTime || 0;
  if (st.bgVid && !st.exporting && Math.abs(st.bgVid.currentTime - (t % (st.bgVid.duration || 1))) > 0.5) st.bgVid.currentTime = t % (st.bgVid.duration || 1);
  render(t);
  $('timeLbl').textContent = `${fmt(t)} / ${fmt(st.dur)}`;
  if (!seeking && st.dur) $('seek').value = Math.round((t / st.dur) * 1000);
  $('btnPlay').textContent = aud.paused ? '▶' : '⏸';
  if (st.exporting) $('expStatus').textContent = `녹화 중… ${Math.round((t / st.dur) * 100)}% — 탭을 닫거나 숨기지 마세요`;
  const si = st.sents.length ? activeSentence(t) : -1, wi = si >= 0 ? curIdx(st.sents[si], t) : -1, key = si + ':' + wi;
  if (key !== lastChip) {
    document.querySelectorAll('.w.on').forEach((e) => e.classList.remove('on'));
    const el = document.querySelector(`.w[data-si="${si}"][data-wi="${wi}"]`); if (el) el.classList.add('on');
    lastChip = key;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

let actx, srcNode, dest;
async function ensureAudio() {
  if (!actx) { actx = new AudioContext(); srcNode = actx.createMediaElementSource(aud); dest = actx.createMediaStreamDestination(); srcNode.connect(actx.destination); }
  if (actx.state === 'suspended') await actx.resume();
}
async function togglePlay() {
  if (!st.dur) return;
  await ensureAudio();
  if (aud.paused) { if (aud.ended) aud.currentTime = 0; await aud.play(); if (st.bgVid) st.bgVid.play().catch(() => {}); }
  else { aud.pause(); if (st.bgVid) st.bgVid.pause(); }
}
$('btnPlay').onclick = togglePlay;
$('seek').addEventListener('input', (e) => { seeking = true; aud.currentTime = (e.target.value / 1000) * st.dur; });
$('seek').addEventListener('change', () => { seeking = false; });
addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && e.target.type !== 'range') return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); st.tap ? tapNow() : togglePlay(); }
});

/* ---------- 입력 ---------- */
aud.addEventListener('loadedmetadata', () => { st.dur = aud.duration; if (st.sents.length && !st.sents[0].words[0].e) { C.evenSync(st.sents, 0, st.dur); buildTimeline(); } });
$('audioFile').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  st.audioFile = f; aud.src = URL.createObjectURL(f); setStatus(`녹음 불러옴: ${f.name}`);
};
$('bgFile').onchange = (e) => {
  const f = e.target.files[0]; if (!f) return;
  const url = URL.createObjectURL(f); st.bgImg = st.bgVid = null;
  if (f.type.startsWith('video')) { const v = document.createElement('video'); v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.onloadeddata = () => { st.bgVid = v; }; }
  else { const i = new Image(); i.onload = () => { st.bgImg = i; }; i.src = url; }
};
function applyScript() {
  const prev = C.flat(st.sents), next = C.parseScript($('script').value);
  if (!next.length) { st.sents = []; buildTimeline(); return false; }
  const nw = C.flat(next);
  st.sents = next;
  if (prev.length === nw.length && prev.length) nw.forEach((w, i) => { w.s = prev[i].s; w.e = prev[i].e; });
  else if (st.dur) C.evenSync(st.sents, 0, st.dur);
  layoutCache.clear(); buildTimeline(); return true;
}
$('script').addEventListener('change', applyScript);

$('btnEven').onclick = () => {
  if (!applyScript() || !st.dur) return setStatus('대본과 녹음을 먼저 넣어 주세요.');
  C.evenSync(st.sents, 0, st.dur); buildTimeline(); setStatus('균등 배분했습니다. 탭 싱크나 아래 보정으로 맞추세요.');
};
$('btnSilent').onclick = () => {
  if (!applyScript()) return setStatus('대본을 넣어 주세요.');
  const secs = Math.max(3, C.flat(st.sents).reduce((a, w) => a + C.chars(w.t).length + 0.6, 0) / 5.5 + 1);
  const rate = 8000, n = Math.floor(rate * secs), buf = new DataView(new ArrayBuffer(44 + n * 2));
  const wr = (o, s) => [...s].forEach((c, i) => buf.setUint8(o + i, c.charCodeAt(0)));
  wr(0, 'RIFF'); buf.setUint32(4, 36 + n * 2, true); wr(8, 'WAVEfmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true);
  buf.setUint16(22, 1, true); buf.setUint32(24, rate, true); buf.setUint32(28, rate * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true);
  wr(36, 'data'); buf.setUint32(40, n * 2, true);
  aud.src = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })); st.audioFile = null;
  aud.addEventListener('loadedmetadata', () => { C.evenSync(st.sents, 0.3, st.dur); buildTimeline(); setStatus(`무음 ${secs.toFixed(0)}초로 만들었습니다(읽기 속도 추정).`); }, { once: true });
};

/* ---------- 탭 싱크 ---------- */
$('btnTap').onclick = async () => {
  if (!applyScript() || !st.dur) return setStatus('대본과 녹음을 먼저 넣어 주세요.');
  const s = st.sel || { si: 0, wi: 0 };
  st.tap = { si: s.si, wi: s.wi };
  aud.currentTime = Math.max(0, st.sents[s.si].words[s.wi].s - 0.8);
  await ensureAudio(); await aud.play();
  setStatus(`탭 싱크: 말하는 순간 스페이스 / 엔터. 다음 → "${st.sents[s.si].words[s.wi].t}"`);
};
function tapNow() {
  const { si, wi } = st.tap, w = st.sents[si].words[wi];
  w.s = aud.currentTime; w.e = w.s + Math.min(0.9, 0.12 * C.chars(w.t).length + 0.2);
  let nsi = si, nwi = wi + 1;
  if (nwi >= st.sents[si].words.length) { nsi++; nwi = 0; }
  if (nsi >= st.sents.length) { st.tap = null; aud.pause(); C.fixEnds(st.sents, st.dur); buildTimeline(); return setStatus('탭 싱크 완료.'); }
  st.tap = { si: nsi, wi: nwi };
  C.fixEnds(st.sents, st.dur); refreshChip(si, wi);
  setStatus(`탭 싱크: 다음 → "${st.sents[nsi].words[nwi].t}"`);
}

/* ---------- Whisper ---------- */
let asr, asrModel;
async function decode16k(file) {
  const ac = new AudioContext({ sampleRate: 16000 });
  const buf = await ac.decodeAudioData(await file.arrayBuffer()); ac.close();
  const out = new Float32Array(buf.length);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) out[i] += d[i] / buf.numberOfChannels; }
  return out;
}
$('btnWhisper').onclick = async () => {
  if (!st.audioFile) return setStatus('녹음 파일을 먼저 넣어 주세요.');
  const btn = $('btnWhisper'); btn.disabled = true;
  try {
    setStatus('오디오 해석 중…');
    const pcm = await decode16k(st.audioFile);
    const model = $('modelSel').value;
    if (!asr || asrModel !== model) {
      setStatus('Whisper 모델 불러오는 중… (처음엔 내려받느라 오래 걸립니다)');
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1');
      asr = await pipeline('automatic-speech-recognition', model, {
        dtype: 'q8',
        progress_callback: (p) => { if (p.status === 'progress') setStatus(`모델 내려받는 중… ${Math.round(p.progress)}%`); },
      });
      asrModel = model;
    }
    setStatus('받아쓰며 단어 시각을 찾는 중… (녹음 길이의 1~3배 걸릴 수 있습니다)');
    const out = await asr(pcm, { language: 'korean', task: 'transcribe', return_timestamps: 'word', chunk_length_s: 30, stride_length_s: 5 });
    const rec = (out.chunks || []).map((c) => ({ t: c.text.trim(), s: c.timestamp[0], e: c.timestamp[1] ?? c.timestamp[0] + 0.3 })).filter((r) => r.t);
    if (!rec.length) throw new Error('인식된 단어가 없습니다.');
    if (!$('script').value.trim()) {
      st.sents = C.scriptFromRec(rec); C.fixEnds(st.sents, st.dur);
      $('script').value = st.sents.map((s) => s.words.map((w) => w.t).join(' ')).join('\n');
      setStatus(`녹음을 받아써서 ${st.sents.length}절을 만들었습니다. 오타는 대본 칸에서 고친 뒤 "AI로 자동 맞춤"을 다시 누르세요.`);
    } else {
      applyScript();
      const r = C.alignToScript(st.sents, rec, st.dur);
      if (r < 0) { C.evenSync(st.sents, 0, st.dur); setStatus('맞추지 못해 균등 배분했습니다.'); }
      else setStatus(`자동 맞춤 완료 — 대본 글자 ${Math.round(r * 100)}% 일치.${r < 0.5 ? ' 대본이 녹음과 많이 달라 보입니다. 아래에서 보정하세요.' : ' 어긋난 곳만 아래에서 보정하세요.'}`);
    }
    layoutCache.clear(); buildTimeline();
  } catch (err) {
    console.error(err); setStatus('실패: ' + (err.message || err) + ' — 인터넷 연결을 확인하거나 "탭 싱크"를 쓰세요.');
  } finally { btn.disabled = false; }
};

/* ---------- 타임라인 보정 UI ---------- */
function chipLabel(w) { return `${w.t}<small>${w.s.toFixed(2)}</small>`; }
function refreshChip(si, wi) {
  const el = document.querySelector(`.w[data-si="${si}"][data-wi="${wi}"]`), w = st.sents[si].words[wi];
  if (el) { el.innerHTML = chipLabel(w); el.classList.toggle('k', w.k); }
}
function select(si, wi, seek = true) {
  st.sel = { si, wi };
  if (seek) aud.currentTime = st.sents[si].words[wi].s;
  document.querySelectorAll('.w.sel').forEach((e) => e.classList.remove('sel'));
  const el = document.querySelector(`.w[data-si="${si}"][data-wi="${wi}"]`); if (el) el.classList.add('sel');
  renderSel();
}
function shift(si, wi, d, rest) {
  const ws = C.flat(st.sents), start = ws.indexOf(st.sents[si].words[wi]);
  for (let i = start; i < (rest ? ws.length : start + 1); i++) { ws[i].s = Math.max(0, ws[i].s + d); ws[i].e = Math.max(ws[i].s + 0.08, ws[i].e + d); }
  C.fixEnds(st.sents, st.dur); buildTimeline(); select(si, wi, false);
}
function renderSel() {
  const box = $('selp');
  if (!st.sel) { box.textContent = '단어를 선택하세요.'; return; }
  const { si, wi } = st.sel, w = st.sents[si].words[wi];
  box.innerHTML = `<div class="row"><b>${w.t}</b>
    <label>시작 <input type="number" id="selS" step="0.01" min="0" value="${w.s.toFixed(2)}" style="width:80px"></label>
    ${[-0.2, -0.05, 0.05, 0.2].map((d) => `<button data-d="${d}">${d > 0 ? '+' : ''}${d}</button>`).join('')}
    <label><input type="checkbox" id="selRest"> 이후 전체 이동</label>
    <button id="selNow">현재 재생 위치로</button><button id="selKey">${w.k ? '키워드 해제' : '키워드로'}</button></div>`;
  const rest = () => $('selRest').checked;
  $('selS').onchange = (e) => shift(si, wi, +e.target.value - w.s, rest());
  box.querySelectorAll('button[data-d]').forEach((b) => { b.onclick = () => shift(si, wi, +b.dataset.d, rest()); });
  $('selNow').onclick = () => shift(si, wi, aud.currentTime - w.s, rest());
  $('selKey').onclick = () => { w.k = !w.k; layoutCache.clear(); buildTimeline(); select(si, wi, false); };
}
function buildTimeline() {
  const box = $('timeline'); box.innerHTML = '';
  st.sents.forEach((s, si) => {
    const d = document.createElement('div'); d.className = 'sent';
    const opts = Object.entries(STYLE_NAMES).map(([k, v]) => `<option value="${k}"${s.style === k ? ' selected' : ''}>${v}</option>`).join('');
    d.innerHTML = `<div class="hd"><span>${si + 1}절${s.ref ? ' · ' + s.ref : ''} · ${s.words[0].s.toFixed(1)}s</span><select>${opts}</select></div><div class="chips"></div>`;
    d.querySelector('select').onchange = (e) => { s.style = e.target.value; layoutCache.clear(); };
    const chips = d.querySelector('.chips');
    s.words.forEach((w, wi) => {
      const b = document.createElement('button'); b.className = 'w' + (w.k ? ' k' : ''); b.dataset.si = si; b.dataset.wi = wi; b.innerHTML = chipLabel(w);
      b.onclick = () => select(si, wi);
      b.ondblclick = () => { w.k = !w.k; layoutCache.clear(); refreshChip(si, wi); };
      chips.appendChild(b);
    });
    box.appendChild(d);
  });
  lastChip = '';
}

/* ---------- 내보내기 ---------- */
const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
$('btnSrt').onclick = () => { if (!st.sents.length) return; download(new Blob([C.toSRT(st.sents, st.dur)], { type: 'text/plain;charset=utf-8' }), 'shorts.srt'); };
$('btnExport').onclick = async () => {
  if (!st.dur || !st.sents.length) return ($('expStatus').textContent = '대본과 녹음(또는 글만으로)을 먼저 준비하세요.');
  if (typeof MediaRecorder === 'undefined') return ($('expStatus').textContent = '이 브라우저는 영상 녹화를 지원하지 않습니다. PC 크롬을 쓰세요.');
  const btn = $('btnExport'); btn.disabled = true;
  try {
    await ensureAudio(); await onOpts();
    const stream = cv.captureStream(30);
    dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10e6, audioBitsPerSecond: 192e3 });
    const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const stopped = new Promise((r) => { rec.onstop = r; });
    aud.pause(); aud.currentTime = 0;
    await new Promise((r) => setTimeout(r, 150));
    srcNode.disconnect(); srcNode.connect(dest); // 녹화 중에는 스피커로 내보내지 않는다
    st.exporting = true;
    if (st.bgVid) { st.bgVid.currentTime = 0; st.bgVid.play().catch(() => {}); }
    rec.start(250);
    const ended = new Promise((r) => aud.addEventListener('ended', r, { once: true }));
    await aud.play(); await ended;
    await new Promise((r) => setTimeout(r, 500));
    rec.stop(); await stopped;
    srcNode.disconnect(); srcNode.connect(actx.destination);
    download(new Blob(chunks, { type: mime.split(';')[0] }), 'shorts.' + (mime.startsWith('video/mp4') ? 'mp4' : 'webm'));
    $('expStatus').textContent = '완료. 파일이 내려받아졌습니다.';
  } catch (err) {
    console.error(err); $('expStatus').textContent = '실패: ' + (err.message || err);
  } finally { st.exporting = false; btn.disabled = false; if (st.bgVid) st.bgVid.pause(); }
};

window.__shorts = { st, render, C };
})();
