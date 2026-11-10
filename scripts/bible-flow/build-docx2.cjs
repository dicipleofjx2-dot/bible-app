/**
 * 성경맥잡기 1단계 신약편 (맥점 순서판) — 전자책 .docx
 * 원고 content/bible-flow/nt2.cjs · 도식 out/png · 사진 photos/
 * 본문은 A4 세로, 도식은 A4 가로 쪽에 한 장씩 크게.
 * 글씨: 제목 = 바탕(명조) · 본문 = 맑은 고딕 · 성경 구절 = 바탕
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, HeadingLevel, Footer, PageNumber, ImageRun, PageOrientation, VerticalAlign,
} = require('docx');
const { META, LESSONS, SUMMARY } = require('../../content/bible-flow/nt2.cjs');

const ROOT = path.join(__dirname, '../../content/bible-flow');
const SANS = '맑은 고딕', SERIF = '바탕';
const INK = '2A211B', MUTED = '6B5C52', TINT = 'F4F0EC', LINE = 'D9D2CB';
const COLORS = ['9A6510', 'B5532F', '5B6B7F', '2F7466', '952B38', '64457F', '4A3F38', 'B8862B'];
const A4 = { width: 11906, height: 16838 };
const MARGIN = { top: 1134, bottom: 1134, left: 1134, right: 1134 };
const PW = A4.width - 2268; // 세로 본문 폭 (DXA)
const credits = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'photos/credits.json'), 'utf8')); } catch { return {}; } })();

const run = (text, o = {}) => new TextRun({ text, font: { ascii: o.serif ? SERIF : SANS, eastAsia: o.serif ? SERIF : SANS, hAnsi: o.serif ? SERIF : SANS }, ...o, serif: undefined });
const P = (children, o = {}) => new Paragraph({ children, ...o });
const gap = (n = 120) => P([], { spacing: { after: n } });
const shade = (fill) => ({ type: ShadingType.CLEAR, color: 'auto', fill });
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function imgSize(file) {
  const b = fs.readFileSync(file);
  if (b[0] === 0x89) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) {
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xc3) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) };
    i += 2 + len;
  }
  return { w: 4, h: 3 };
}
const image = (file, wpx) => {
  const { w, h } = imgSize(file);
  return new ImageRun({ type: file.endsWith('.png') ? 'png' : 'jpg', data: fs.readFileSync(file), transformation: { width: wpx, height: Math.round((wpx * h) / w) } });
};

function box(children, fill, border) {
  const b = { style: BorderStyle.SINGLE, size: 8, color: border || fill };
  return new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: [PW],
    borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ children: [new TableCell({ width: { size: PW, type: WidthType.DXA }, shading: shade(fill), margins: { top: 160, bottom: 160, left: 220, right: 220 }, children })] })],
  });
}

function table(cols, rows, c) {
  const len = cols.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] || '').length)));
  const tot = len.reduce((a, b) => a + Math.min(b, 40) + 4, 0);
  const widths = len.map((l) => Math.round(((Math.min(l, 40) + 4) / tot) * PW));
  widths[widths.length - 1] += PW - widths.reduce((a, b) => a + b, 0);
  const cell = (text, w, o = {}) => new TableCell({
    width: { size: w, type: WidthType.DXA }, shading: o.fill ? shade(o.fill) : undefined, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [P([run(String(text), { size: 19, bold: o.bold, color: o.color || INK })], { spacing: { after: 0, line: 290 } })],
  });
  const b = { style: BorderStyle.SINGLE, size: 4, color: LINE };
  return new Table({
    width: { size: PW, type: WidthType.DXA }, columnWidths: widths,
    borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: b, insideVertical: b },
    rows: [
      new TableRow({ tableHeader: true, children: cols.map((h, i) => cell(h, widths[i], { fill: c, bold: true, color: 'FFFFFF' })) }),
      ...rows.map((r, k) => new TableRow({ cantSplit: true, children: r.map((v, i) => cell(v, widths[i], { fill: k % 2 ? 'FFFFFF' : TINT, bold: i === 0 })) })),
    ],
  });
}

function heading(text, c, level = HeadingLevel.HEADING_2) {
  return P([run(text, { serif: true, bold: true, size: level === HeadingLevel.HEADING_2 ? 28 : 24, color: c })], { heading: level, spacing: { before: 280, after: 120 }, keepNext: true });
}

// ---------------- 섹션 모으기 (세로 본문 / 가로 도식)
const sections = [];
let cur = [];
const portrait = () => ({ page: { size: A4, margin: MARGIN } });
const landscape = () => ({ page: { size: { ...A4, orientation: PageOrientation.LANDSCAPE }, margin: { top: 700, bottom: 700, left: 900, right: 900 } } });
const footer = { default: new Footer({ children: [P([new TextRun({ children: [PageNumber.CURRENT], font: SANS, size: 16, color: MUTED })], { alignment: AlignmentType.CENTER })] }) };
function flush() { if (cur.length) sections.push({ properties: portrait(), footers: footer, children: cur }); cur = []; }
function figPage(file, h, c) {
  flush();
  const f = path.join(ROOT, 'out', file);
  if (!fs.existsSync(f)) return;
  sections.push({ properties: landscape(), footers: footer, children: [
    P([run(h, { serif: true, bold: true, size: 26, color: c })], { spacing: { after: 100 } }),
    P([image(f, 960)], { alignment: AlignmentType.CENTER }),
  ] });
}

// 표지
cur.push(gap(3000),
  P([run(META.series, { bold: true, size: 30, color: COLORS[1] })], { alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  P([run(META.title, { serif: true, bold: true, size: 80, color: INK })], { alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
  P([run(META.subtitle, { size: 26, color: MUTED })], { alignment: AlignmentType.CENTER, spacing: { after: 900 } }),
  P(COLORS.map((c, i) => run(i ? '  ●' : '●', { size: 30, color: c })), { alignment: AlignmentType.CENTER, spacing: { after: 3600 } }),
  P([run(META.byline, { size: 22, color: MUTED })], { alignment: AlignmentType.CENTER }),
);
flush();
// 차례
cur.push(P([run('차례 — 여덟 개의 맥점', { serif: true, bold: true, size: 36 })], { spacing: { after: 300 } }));
for (const l of LESSONS) {
  const c = COLORS[l.no - 1];
  cur.push(P([run(`${l.no}과  `, { bold: true, size: 24, color: c }), run(l.maek, { serif: true, bold: true, size: 26, color: c }), run(`   ${l.title}`, { bold: true, size: 22 })], { spacing: { after: 40 } }),
    P([run(l.subtitle, { size: 18, color: MUTED })], { spacing: { after: 180 }, indent: { left: 600 } }));
}
cur.push(P([run('맥점 한 장 정리 · 확인 질문 답 · 사진 출처', { size: 20, color: MUTED })], { spacing: { before: 200 } }));
flush();

// 과
const pendingCredits = new Set();
for (const l of LESSONS) {
  const c = COLORS[l.no - 1];
  cur.push(
    P([run(`${l.no}과`, { bold: true, size: 26, color: c })], { spacing: { after: 60 } }),
    P([run(l.title, { serif: true, bold: true, size: 44 })], { heading: HeadingLevel.HEADING_1, spacing: { after: 80 } }),
    P([run(l.subtitle, { size: 22, color: MUTED })], { spacing: { after: 240 } }),
    box([P([run('맥점', { bold: true, size: 18, color: 'FFFFFF' })], { spacing: { after: 40 } }), P([run(l.maek, { serif: true, bold: true, size: 48, color: 'FFFFFF' })], { spacing: { after: 0 } })], c),
    gap(200),
  );
  for (const b of l.blocks) {
    if (b.t === 'say') {
      cur.push(box([P([run('선생님 말씀', { bold: true, size: 17, color: c })], { spacing: { after: 60 } }), ...b.p.map((t) => P([run(t, { bold: true, size: 21, color: INK })], { spacing: { after: 80, line: 340 } }))], 'FFFFFF', c), gap(160));
    } else if (b.t === 'text') {
      if (b.h) cur.push(heading(b.h, c));
      b.p.forEach((t) => cur.push(P([run(t, { size: 20 })], { spacing: { after: 120, line: 340 }, alignment: AlignmentType.BOTH })));
    } else if (b.t === 'table') {
      if (b.h) cur.push(heading(b.h, c, HeadingLevel.HEADING_3));
      cur.push(table(b.cols, b.rows, c), gap(160));
    } else if (b.t === 'verse') {
      cur.push(box([P([run(b.text, { serif: true, size: 23 })], { spacing: { after: 60, line: 340 } }), P([run(`— ${b.ref} (${META.translation})`, { size: 17, color: MUTED })], { alignment: AlignmentType.RIGHT })], 'FBF7EE', 'E8D9B5'), gap(160));
    } else if (b.t === 'note') {
      cur.push(P([run(b.h ? `덧붙임 — ${b.h}` : '덧붙임', { bold: true, size: 18, color: MUTED })], { spacing: { after: 40 }, keepNext: true }));
      b.p.forEach((t) => cur.push(P([run(t, { size: 18, color: MUTED })], { spacing: { after: 80, line: 300 }, indent: { left: 240 } })));
      cur.push(gap(100));
    } else if (b.t === 'photo') {
      const cr = credits[b.key];
      const f = cr && path.join(ROOT, 'photos', cr.file);
      if (f && fs.existsSync(f)) {
        pendingCredits.add(b.key);
        cur.push(P([image(f, 600)], { alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 }, keepNext: true }));
      } else {
        cur.push(box([P([run(`사진 자리 — ${b.key}`, { bold: true, size: 18, color: MUTED })], { alignment: AlignmentType.CENTER })], 'EEEAE6', 'D9D2CB'));
      }
      cur.push(P([run(b.cap || (cr && cr.ko) || '', { size: 18, color: INK })], { spacing: { after: 220 }, alignment: AlignmentType.CENTER }));
    } else if (b.t === 'fig') {
      figPage(b.file, b.h, c);
    }
  }
  cur.push(box([P([run('핵심 구절', { bold: true, size: 17, color: c })], { spacing: { after: 60 } }), P([run(l.keyVerse.text, { serif: true, size: 24 })], { spacing: { after: 60, line: 340 } }), P([run(`— ${l.keyVerse.ref}`, { size: 17, color: MUTED })], { alignment: AlignmentType.RIGHT })], 'FBF7EE', c), gap(200));
  cur.push(heading('확인 질문', c, HeadingLevel.HEADING_3));
  l.questions.forEach((q, i) => cur.push(P([run(`${i + 1}. ${q.q}`, { size: 20 })], { spacing: { after: 100 } })));
  flush();
}
// 맥점 한 장
figPage(SUMMARY.file, SUMMARY.h, INK);
// 답
cur.push(P([run('확인 질문 답', { serif: true, bold: true, size: 36 })], { spacing: { after: 240 } }));
for (const l of LESSONS) {
  cur.push(P([run(`${l.no}과 ${l.title}`, { serif: true, bold: true, size: 24, color: COLORS[l.no - 1] })], { spacing: { before: 200, after: 80 }, keepNext: true }));
  l.questions.forEach((q, i) => {
    cur.push(P([run(`${i + 1}. ${q.q}`, { bold: true, size: 19 })], { spacing: { after: 20 }, keepNext: true }));
    cur.push(P([run(q.a, { size: 19 })], { spacing: { after: 100 }, indent: { left: 280 } }));
  });
}
flush();
// 사진 출처
if (pendingCredits.size) {
  cur.push(P([run('사진 출처', { serif: true, bold: true, size: 32 })], { spacing: { after: 200 } }),
    P([run('모든 사진은 위키미디어 공용(Wikimedia Commons)의 퍼블릭 도메인 · CC 라이선스 자료다.', { size: 18, color: MUTED })], { spacing: { after: 200 } }));
  for (const k of pendingCredits) {
    const cr = credits[k];
    cur.push(P([run(cr.ko, { bold: true, size: 18 })], { spacing: { after: 20 } }),
      P([run(`${cr.title} · ${cr.artist || '작자 미상'} · ${cr.license}`, { size: 16, color: MUTED })], { spacing: { after: 20 } }),
      P([run(cr.source, { size: 15, color: MUTED })], { spacing: { after: 120 } }));
  }
  flush();
}
flush();

const doc = new Document({
  creator: META.byline, title: `${META.series} ${META.title}`,
  styles: { default: { document: { run: { font: { ascii: SANS, eastAsia: SANS, hAnsi: SANS }, size: 20, color: INK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', run: { font: SERIF, size: 44, bold: true }, paragraph: { spacing: { before: 0, after: 80 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', run: { font: SERIF, size: 28, bold: true }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', run: { font: SERIF, size: 24, bold: true }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 2 } },
    ] },
  sections,
});
const out = process.argv[2] || path.join(ROOT, 'out/성경맥잡기1-신약편.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out, `${sections.length} sections`); });
