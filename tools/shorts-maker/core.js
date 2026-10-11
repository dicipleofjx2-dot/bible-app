/* 대본 파싱 · 녹음-대본 정렬 · SRT. 화면과 무관한 순수 함수 (node 로도 검사 가능). */
(function (root) {
  'use strict';
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const chars = (s) => Array.from(norm(s));

  // 한 줄 = 한 절. 한 줄뿐이면 문장부호로 쪼갠다. "[요 3:16] ..." 은 구절 카드용 출처, *단어* 는 키워드.
  function parseScript(text) {
    let lines = text.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 1) lines = lines[0].split(/(?<=[.!?。…])\s+/).filter(Boolean);
    let inKey = false;
    return lines.map((line) => {
      let ref = '';
      const m = line.match(/^\[([^\]]+)\]\s*/);
      if (m) { ref = m[1]; line = line.slice(m[0].length); }
      const words = line.split(/\s+/).filter(Boolean).map((w) => {
        const k = inKey || w.includes('*');
        if ((w.match(/\*/g) || []).length % 2 === 1) inKey = !inKey;
        return { t: w.replace(/\*/g, ''), k, s: 0, e: 0 };
      }).filter((w) => w.t);
      return { ref, style: 'auto', words };
    }).filter((s) => s.words.length);
  }

  const flat = (sents) => sents.flatMap((s) => s.words);

  function fixEnds(sents, total) {
    const ws = flat(sents);
    let prev = 0;
    ws.forEach((w) => { if (w.s < prev) w.s = prev; prev = w.s; });
    ws.forEach((w, i) => {
      const next = i + 1 < ws.length ? ws[i + 1].s : total;
      w.e = Math.min(Math.max(w.e, w.s + 0.08), Math.max(next, w.s + 0.04));
    });
  }

  // 글자 수 비례로 start~total 에 고르게 나눈다 (탭 싱크 전 초기값 / 정렬 실패 대비).
  function evenSync(sents, start, total) {
    const ws = flat(sents);
    const wt = ws.map((w) => Math.max(1, chars(w.t).length) + 0.6);
    const sum = wt.reduce((a, b) => a + b, 0);
    const span = Math.max(0.5, total - start);
    let t = start;
    ws.forEach((w, i) => { const d = (span * wt[i]) / sum; w.s = t; w.e = t + d * 0.9; t += d; });
    fixEnds(sents, total);
  }

  /* 인식 결과 rec=[{t,s,e}] 를 대본 글자 단위로 정렬(Needleman-Wunsch).
     어절 띄어쓰기가 달라도, 몇 글자 잘못 들어도 버틴다. 반환: 일치율(0~1) 또는 -1(실패). */
  function alignToScript(sents, rec, total) {
    const ws = flat(sents);
    const sch = [], swi = [];
    ws.forEach((w, wi) => chars(w.t).forEach((c) => { sch.push(c); swi.push(wi); }));
    const rch = [], rs = [], re = [];
    rec.forEach((r) => {
      const cs = chars(r.t); const n = cs.length; const d = r.e - r.s;
      cs.forEach((c, i) => { rch.push(c); rs.push(r.s + (d * i) / n); re.push(r.s + (d * (i + 1)) / n); });
    });
    const n = sch.length, m = rch.length;
    if (!n || !m || n * m > 5e7) return -1;
    const M = m + 1;
    const dir = new Uint8Array((n + 1) * M); // 1 대각 · 2 위(대본 글자 건너뜀) · 3 왼(인식 글자 건너뜀)
    let prev = new Int32Array(M), cur = new Int32Array(M);
    for (let j = 1; j <= m; j++) { prev[j] = -j; dir[j] = 3; }
    for (let i = 1; i <= n; i++) {
      cur[0] = -i; dir[i * M] = 2;
      for (let j = 1; j <= m; j++) {
        const d = prev[j - 1] + (sch[i - 1] === rch[j - 1] ? 2 : -1);
        const u = prev[j] - 1, l = cur[j - 1] - 1;
        if (d >= u && d >= l) { cur[j] = d; dir[i * M + j] = 1; }
        else if (u >= l) { cur[j] = u; dir[i * M + j] = 2; }
        else { cur[j] = l; dir[i * M + j] = 3; }
      }
      [prev, cur] = [cur, prev];
    }
    const cs = new Array(n).fill(null), ce = new Array(n).fill(null);
    let matched = 0;
    for (let i = n, j = m; i > 0 || j > 0;) {
      const d = dir[i * M + j];
      if (i > 0 && j > 0 && d === 1) {
        if (sch[i - 1] === rch[j - 1]) { cs[i - 1] = rs[j - 1]; ce[i - 1] = re[j - 1]; matched++; }
        i--; j--;
      } else if (i > 0 && (d === 2 || j === 0)) i--;
      else j--;
    }
    // 단어별: 처음/마지막으로 맞은 글자의 시각
    const anchor = ws.map(() => null);
    let ci = 0;
    ws.forEach((w, wi) => {
      const len = chars(w.t).length; let s = null, e = null;
      for (let k = 0; k < len; k++) {
        if (cs[ci + k] !== null) { if (s === null) s = cs[ci + k]; e = ce[ci + k]; }
      }
      ci += len;
      if (s !== null) { w.s = s; w.e = e; anchor[wi] = true; }
    });
    if (!anchor.some(Boolean)) return -1;
    // 못 맞은 단어는 이웃 기준점 사이를 글자 수로 나눈다
    const RATE = 0.17; // 초/글자
    for (let i = 0; i < ws.length;) {
      if (anchor[i]) { i++; continue; }
      let j = i; while (j < ws.length && !anchor[j]) j++;
      const run = ws.slice(i, j);
      const wt = run.map((w) => Math.max(1, chars(w.t).length));
      const sum = wt.reduce((a, b) => a + b, 0);
      let lo = i > 0 ? ws[i - 1].e : Math.max(0, (j < ws.length ? ws[j].s : total) - sum * RATE);
      let hi = j < ws.length ? ws[j].s : Math.min(total, lo + sum * RATE);
      if (hi < lo) hi = lo;
      let t = lo;
      run.forEach((w, k) => { const d = ((hi - lo) * wt[k]) / sum; w.s = t; w.e = t + d; t += d; });
      i = j;
    }
    fixEnds(sents, total);
    return matched / n;
  }

  // 인식 결과만 있을 때 (대본 없음): 문장부호 또는 9어절마다 끊어 절로 만든다.
  function scriptFromRec(rec) {
    const sents = []; let words = [];
    const push = () => { if (words.length) sents.push({ ref: '', style: 'auto', words }); words = []; };
    rec.forEach((r) => {
      if (!r.t) return;
      words.push({ t: r.t, k: false, s: r.s, e: r.e });
      if (/[.!?。…]$/.test(r.t) || words.length >= 9) push();
    });
    push();
    return sents;
  }

  const pad = (n, l) => String(n).padStart(l, '0');
  function stamp(sec) {
    const ms = Math.max(0, Math.round(sec * 1000));
    return `${pad(Math.floor(ms / 3600000), 2)}:${pad(Math.floor(ms / 60000) % 60, 2)}:${pad(Math.floor(ms / 1000) % 60, 2)},${pad(ms % 1000, 3)}`;
  }
  function toSRT(sents, total) {
    return sents.map((s, i) => {
      const a = s.words[0].s;
      const nextA = i + 1 < sents.length ? sents[i + 1].words[0].s : total;
      const b = Math.min(s.words[s.words.length - 1].e + 0.3, Math.max(nextA, a + 0.2));
      return `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${s.words.map((w) => w.t).join(' ')}\n`;
    }).join('\n');
  }

  const api = { parseScript, flat, fixEnds, evenSync, alignToScript, scriptFromRec, toSRT, norm, chars };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShortsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
