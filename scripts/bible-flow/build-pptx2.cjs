/**
 * 성경맥잡기 1단계 신약편 (맥점 순서판) — 8과를 PPT 한 파일로 (16:9, 과마다 구역)
 * 원고 content/bible-flow/nt2.cjs · 도식 out/png · 사진 photos/
 * 글씨: 제목 · 맥점 · 성경 구절 = 바탕(명조) · 본문 = 맑은 고딕 · 카드 = 그림자로 입체감
 */
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const { META, LESSONS, SUMMARY } = require('../../content/bible-flow/nt2.cjs');

const ROOT = path.join(__dirname, '../../content/bible-flow');
const SANS = '맑은 고딕', SERIF = '바탕';
const INK = '2A211B', MUTED = '6B5C52', TINT = 'F4F0EC', DARK = '1F2433';
const COLORS = ['9A6510', 'B5532F', '5B6B7F', '2F7466', '952B38', '64457F', '4A3F38', 'B8862B'];
const credits = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'photos/credits.json'), 'utf8')); } catch { return {}; } })();
const shadow = () => ({ type: 'outer', blur: 8, offset: 3, angle: 90, color: '000000', opacity: 0.22 });

function imgSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) { const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) }; i += 2 + len; }
  return { w: 4, h: 3 };
}

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.title = `${META.series} ${META.title}`;
pres.theme = { headFontFace: SERIF, bodyFontFace: SANS };

// 책 표지 + 차례(맥점 여덟)
function front() {
  pres.addSection({ title: '표지 · 차례' });
  const add = () => pres.addSlide({ sectionTitle: '표지 · 차례' });
  const T = (s, txt, o) => s.addText(txt, { isTextBox: true, fontFace: SANS, color: INK, margin: 0, ...o });
  {
    const s = add(); s.background = { color: DARK };
    T(s, META.series, { x: 0.8, y: 1.3, w: 8.4, h: 0.5, fontSize: 18, bold: true, color: 'C9B98F' });
    T(s, META.title, { x: 0.8, y: 1.9, w: 8.4, h: 1.1, fontFace: SERIF, fontSize: 48, bold: true, color: 'FFFFFF' });
    T(s, '맥점 여덟 개로 신약 27권을 잡는다', { x: 0.8, y: 3.1, w: 8.4, h: 0.5, fontSize: 18, color: 'E9DCC0' });
    T(s, META.byline, { x: 0.8, y: 4.8, w: 8.4, h: 0.3, fontSize: 11, color: 'B8ADA4' });
  }
  {
    const s = add(); s.background = { color: 'FFFFFF' };
    T(s, '차례 — 맥점 여덟', { x: 0.5, y: 0.28, w: 9, h: 0.6, fontFace: SERIF, fontSize: 24, bold: true });
    LESSONS.forEach((l, i) => {
      const col = i < 4 ? 0 : 1, row = i % 4, x = 0.5 + col * 4.6, y = 1.1 + row * 1.0;
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 0.75, h: 0.75, rectRadius: 0.1, fill: { color: COLORS[i] }, line: { type: 'none' }, shadow: shadow() });
      T(s, `${l.no}과`, { x, y, w: 0.75, h: 0.75, fontSize: 15, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: SERIF });
      T(s, [{ text: l.maek, options: { fontFace: SERIF, fontSize: 16, bold: true, breakLine: true } }, { text: l.title, options: { fontSize: 11, color: MUTED } }], { x: x + 0.9, y, w: 3.6, h: 0.75, valign: 'middle' });
    });
  }
}

function deck(l) {
  const sec = `${l.no}과 ${l.title}`;
  pres.addSection({ title: sec });
  const add = () => pres.addSlide({ sectionTitle: sec });
  const c = COLORS[l.no - 1];
  const T = (s, txt, o) => s.addText(txt, { isTextBox: true, fontFace: SANS, color: INK, margin: 0, ...o });
  const card = (s, x, y, w, h, fill = 'FFFFFF', line) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: line ? { color: line, width: 1.5 } : { type: 'none' }, shadow: shadow() });
  const foot = (s) => T(s, `${META.series} · ${l.no}과 ${l.title}`, { x: 0.5, y: 5.25, w: 8, h: 0.25, fontSize: 9, color: MUTED });
  const head = (s, txt) => { s.background = { color: 'FFFFFF' }; s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: c }, line: { type: 'none' } }); T(s, txt, { x: 0.5, y: 0.28, w: 9, h: 0.6, fontFace: SERIF, fontSize: 24, bold: true }); foot(s); };

  // 표지
  {
    const s = add(); s.background = { color: DARK };
    T(s, `${META.series} · ${META.title}`, { x: 0.6, y: 0.5, w: 8, h: 0.4, fontSize: 14, bold: true, color: 'C9B98F' });
    card(s, 0.6, 1.35, 1.6, 1.6, c);
    T(s, [{ text: String(l.no), options: { fontSize: 54, bold: true, breakLine: true } }, { text: '과', options: { fontSize: 15 } }], { x: 0.6, y: 1.4, w: 1.6, h: 1.5, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: SERIF });
    T(s, l.maek, { x: 2.5, y: 1.3, w: 7, h: 0.9, fontFace: SERIF, fontSize: 38, bold: true, color: 'FFFFFF' });
    T(s, l.title, { x: 2.5, y: 2.2, w: 7, h: 0.5, fontSize: 22, bold: true, color: 'E9DCC0' });
    T(s, l.subtitle, { x: 2.5, y: 2.75, w: 7, h: 0.5, fontSize: 15, color: 'B8ADA4' });
    T(s, META.byline, { x: 0.6, y: 4.9, w: 6, h: 0.3, fontSize: 11, color: 'B8ADA4' });
  }
  for (const b of l.blocks) {
    if (b.t === 'say') {
      const s = add(); head(s, '선생님 말씀');
      card(s, 0.6, 1.05, 8.8, 3.95, 'FFFFFF', c);
      T(s, '“', { x: 0.8, y: 0.95, w: 1, h: 1, fontFace: SERIF, fontSize: 60, color: c, bold: true });
      T(s, b.p.map((p, i) => ({ text: p, options: { breakLine: i < b.p.length - 1, paraSpaceAfter: 10 } })), { x: 1.3, y: 1.25, w: 7.8, h: 3.55, fontSize: b.p.join('').length > 160 ? 17 : 20, bold: true, valign: 'middle', lineSpacingMultiple: 1.15 });
      s.addNotes(b.p.join('\n'));
    } else if (b.t === 'text') {
      const s = add(); head(s, b.h || l.title);
      card(s, 0.6, 1.1, 8.8, 3.9, TINT);
      T(s, b.p.join('\n\n'), { x: 0.9, y: 1.3, w: 8.2, h: 3.5, fontSize: 18, valign: 'middle', lineSpacingMultiple: 1.2 });
    } else if (b.t === 'table') {
      const s = add(); head(s, b.h || l.title);
      const n = b.cols.length;
      const len = b.cols.map((h, i) => Math.max(h.length, ...b.rows.map((r) => String(r[i] || '').length)));
      const tot = len.reduce((a, x) => a + Math.min(x, 34) + 3, 0);
      const colW = len.map((x) => ((Math.min(x, 34) + 3) / tot) * 9);
      const dense = b.rows.length > 6 || len.reduce((a, x) => a + x, 0) > 90;
      const rows = [b.cols.map((h) => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: c }, fontFace: SANS } })),
        ...b.rows.map((r, k) => r.map((v, i) => ({ text: String(v), options: { bold: i === 0, fill: { color: k % 2 ? 'FFFFFF' : TINT } } })))];
      s.addTable(rows, { x: 0.5, y: 1.05, w: 9, colW, fontFace: SANS, fontSize: dense ? 11 : 13, color: INK, border: { type: 'solid', pt: 0.75, color: 'D9D2CB' }, valign: 'middle', margin: 0.06, autoPage: true, autoPageRepeatHeader: true, autoPageSlideStartY: 1.05, newSlideStartY: 1.05 });
    } else if (b.t === 'verse') {
      const s = add(); s.background = { color: DARK };
      T(s, '성경', { x: 1, y: 0.7, w: 8, h: 0.4, fontSize: 14, bold: true, color: 'C9B98F' });
      T(s, b.text, { x: 1, y: 1.3, w: 8, h: 2.7, fontFace: SERIF, fontSize: 26, color: 'FFFFFF', valign: 'middle', lineSpacingMultiple: 1.25 });
      T(s, `${b.ref} (${META.translation})`, { x: 1, y: 4.2, w: 8, h: 0.4, fontSize: 15, bold: true, color: 'C9B98F', align: 'right' });
    } else if (b.t === 'note') {
      const s = add(); head(s, b.h ? `덧붙임 — ${b.h}` : '덧붙임');
      card(s, 0.6, 1.1, 8.8, 3.9, 'FBF7EE', 'E8D9B5');
      T(s, b.p.join('\n\n'), { x: 0.9, y: 1.3, w: 8.2, h: 3.5, fontSize: 16, color: INK, valign: 'middle', lineSpacingMultiple: 1.2 });
    } else if (b.t === 'fig') {
      const f = path.join(ROOT, 'out', b.file);
      if (!fs.existsSync(f)) continue;
      const s = add(); s.background = { color: 'FFFFFF' };
      s.addImage({ path: f, x: 0, y: 0, w: 10, h: 5.625, altText: b.h });
      s.addNotes(b.h);
    } else if (b.t === 'photo') {
      const cr = credits[b.key];
      const f = cr && path.join(ROOT, 'photos', cr.file);
      const s = add(); s.background = { color: DARK };
      if (f && fs.existsSync(f)) {
        const { w, h } = imgSize(f);
        const maxW = 6.2, maxH = 4.6;
        const k = Math.min(maxW / w, maxH / h);
        const iw = w * k, ih = h * k;
        s.addImage({ path: f, x: 0.5 + (maxW - iw) / 2, y: 0.5 + (maxH - ih) / 2, w: iw, h: ih, altText: cr.ko, shadow: shadow() });
        T(s, `${cr.title.replace(/^File:/, '')} · ${cr.artist || '작자 미상'} · ${cr.license} · Wikimedia Commons`, { x: 0.5, y: 5.2, w: 9, h: 0.25, fontSize: 8, color: '8C8579' });
      } else {
        s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.5, w: 6.2, h: 4.6, rectRadius: 0.1, fill: { color: '2E3446' }, line: { color: '5B6B7F', width: 1, dashType: 'dash' } });
        T(s, `사진 자리\n${b.key}`, { x: 0.5, y: 0.5, w: 6.2, h: 4.6, fontSize: 18, color: 'B8ADA4', align: 'center', valign: 'middle' });
      }
      T(s, (cr && cr.ko) || '', { x: 7.0, y: 0.7, w: 2.6, h: 0.9, fontSize: 13, bold: true, color: 'C9B98F', valign: 'top' });
      T(s, b.cap || '', { x: 7.0, y: 1.7, w: 2.6, h: 3.3, fontSize: 14, color: 'FFFFFF', valign: 'top', lineSpacingMultiple: 1.15 });
      s.addNotes(b.cap || '');
    }
  }
  // 핵심 구절
  {
    const s = add(); s.background = { color: DARK };
    T(s, '핵심 구절', { x: 1, y: 0.7, w: 8, h: 0.4, fontSize: 14, bold: true, color: 'C9B98F' });
    T(s, l.keyVerse.text, { x: 1, y: 1.3, w: 8, h: 2.7, fontFace: SERIF, fontSize: 26, color: 'FFFFFF', valign: 'middle', lineSpacingMultiple: 1.25 });
    T(s, `${l.keyVerse.ref} (${META.translation})`, { x: 1, y: 4.2, w: 8, h: 0.4, fontSize: 15, bold: true, color: 'C9B98F', align: 'right' });
  }
  // 확인 질문
  {
    const s = add(); head(s, '확인 질문');
    const n = l.questions.length, g = 0.16, rh = (3.95 - g * (n - 1)) / n;
    l.questions.forEach((q, i) => {
      const y = 1.05 + i * (rh + g);
      card(s, 0.6, y, 8.8, rh, TINT);
      s.addShape(pres.shapes.OVAL, { x: 0.8, y: y + (rh - 0.5) / 2, w: 0.5, h: 0.5, fill: { color: c }, line: { type: 'none' } });
      T(s, String(i + 1), { x: 0.8, y: y + (rh - 0.5) / 2, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
      T(s, q.q, { x: 1.5, y, w: 7.7, h: rh, fontSize: 17, valign: 'middle' });
    });
    s.addNotes(l.questions.map((q, i) => `${i + 1}. ${q.q}\n→ ${q.a}`).join('\n\n'));
  }
  // 다음 시간 / 맥점 한 장
  {
    const next = LESSONS.find((x) => x.no === l.no + 1);
    if (next) {
      const s = add(); s.background = { color: DARK };
      T(s, '다음 시간', { x: 1, y: 1.2, w: 8, h: 0.4, fontSize: 16, bold: true, color: 'B8ADA4' });
      card(s, 1, 1.9, 1.3, 1.3, COLORS[next.no - 1]);
      T(s, `${next.no}과`, { x: 1, y: 1.9, w: 1.3, h: 1.3, fontSize: 22, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fontFace: SERIF });
      T(s, next.maek, { x: 2.6, y: 1.85, w: 7, h: 0.75, fontFace: SERIF, fontSize: 32, bold: true, color: 'FFFFFF' });
      T(s, `${next.title} — ${next.subtitle}`, { x: 2.6, y: 2.65, w: 7, h: 0.5, fontSize: 16, color: 'E9DCC0' });
    } else {
      const s = add();
      s.addImage({ path: path.join(ROOT, 'out', SUMMARY.file), x: 0, y: 0, w: 10, h: 5.625, altText: SUMMARY.h });
    }
  }
}

(async () => {
  const outDir = process.argv[2] || path.join(ROOT, 'out');
  front();
  LESSONS.forEach(deck);
  const f = path.join(outDir, '성경맥잡기1-신약편.pptx');
  await pres.writeFile({ fileName: f });
  console.log('wrote', f);
})();
