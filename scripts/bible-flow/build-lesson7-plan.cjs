/** 신약맥잡기 7강 강의안 .docx — content/bible-flow/lesson7/plan.cjs + verses.json */
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType, HeadingLevel, Footer, PageNumber } = require('docx');
const DIR = path.join(__dirname, '../../content/bible-flow/lesson7');
const PLAN = require(path.join(DIR, 'plan.cjs'));
const VERSES = JSON.parse(fs.readFileSync(path.join(DIR, 'verses.json'), 'utf8'));
const SANS = '맑은 고딕', SERIF = '바탕', INK = '2A211B', MUTED = '6B5C52', C = '4A3F38', V = 'FBF7EE', VB = 'E8D9B5';
const PW = 11906 - 2268;
const run = (text, o = {}) => new TextRun({ text, font: { ascii: o.serif ? SERIF : SANS, eastAsia: o.serif ? SERIF : SANS, hAnsi: o.serif ? SERIF : SANS }, ...o, serif: undefined });
const P = (children, o = {}) => new Paragraph({ children, ...o });
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const box = (children, fill, border) => { const b = { style: BorderStyle.SINGLE, size: 8, color: border || fill };
  return new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: [PW], borders: { top: b, bottom: b, left: b, right: b, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ children: [new TableCell({ width: { size: PW, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill }, margins: { top: 120, bottom: 120, left: 200, right: 200 }, children })] })] }); };
const gap = (n = 100) => P([], { spacing: { after: n } });
const clean = (t) => t.replace(/'/g, '').replace(/\s*!\s*$/, '').trim();
const short = (ref) => ref.replace('사도행전', '행').replace('디모데후서', '딤후').replace('갈라디아서', '갈').replace('빌레몬서', '몬');
function verse(ref, label) {
  const vs = VERSES[ref]; if (!vs) throw new Error('구절 없음: ' + ref);
  return [box([
    ...(label ? [P([run(label, { bold: true, size: 17, color: C })], { spacing: { after: 60 } })] : []),
    ...vs.map(([n, t]) => P([run(`${n} `, { size: 15, color: MUTED, superScript: true }), run(clean(t), { serif: true, size: 22 })], { spacing: { after: 40, line: 330 } })),
    P([run(`— ${ref} (개역한글)`, { size: 16, color: MUTED })], { alignment: AlignmentType.RIGHT })], V, VB), gap(120)];
}
const kids = [];
kids.push(P([run('성경맥잡기 1단계 · 신약편', { bold: true, size: 20, color: MUTED })], { spacing: { after: 80 } }),
  P([run(PLAN.title, { serif: true, bold: true, size: 40 })], { spacing: { after: 60 } }),
  box([P([run('맥점', { bold: true, size: 17, color: 'FFFFFF' })], { spacing: { after: 20 } }), P([run(PLAN.maek, { serif: true, bold: true, size: 40, color: 'FFFFFF' })])], C),
  P([run(PLAN.sub, { size: 20, color: MUTED })], { spacing: { before: 100, after: 200 } }));
const h2 = (t) => P([run(t, { serif: true, bold: true, size: 28, color: C })], { spacing: { before: 240, after: 100 }, keepNext: true });
kids.push(h2('강의 목표'), ...PLAN.goals.map((g, i) => P([run(`${i + 1}. ${g}`, { size: 20 })], { spacing: { after: 60 } })));
kids.push(h2('준비물'), ...PLAN.prep.map((g) => P([run(`· ${g}`, { size: 20 })], { spacing: { after: 40 } })));
kids.push(h2('시간 배분 (약 60분)'));
const tw = [PW - 1400, 1400];
kids.push(new Table({ width: { size: PW, type: WidthType.DXA }, columnWidths: tw, rows: PLAN.time.map(([a, b], i) => new TableRow({ children: [a, b].map((x, j) => new TableCell({ width: { size: tw[j], type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: i % 2 ? 'FFFFFF' : 'F4F0EC' }, margins: { top: 60, bottom: 60, left: 120, right: 120 }, children: [P([run(x, { size: 19, bold: j === 1 })], { alignment: j ? AlignmentType.CENTER : AlignmentType.LEFT })] })) })) }));
kids.push(h2('핵심 구절'), ...verse(PLAN.key));
kids.push(P([run('표기 — ', { bold: true, size: 17, color: MUTED }), run('🗣 선생님이 할 말 · 📖 성경 본문 · 🖥 화면 · ❓ 질문 · ✎ 근거 · 견해 메모', { size: 17, color: MUTED })], { spacing: { before: 200 } }));
for (const part of PLAN.parts) {
  kids.push(P([run(part.h, { serif: true, bold: true, size: 30 })], { pageBreakBefore: true, spacing: { after: 40 }, keepNext: true }),
    P([run(`⏱ ${part.t}`, { size: 18, bold: true, color: C })], { spacing: { after: 160 } }));
  for (const b of part.blocks) {
    if (b.say) kids.push(P([run('🗣 ', { size: 20 }), run(b.say, { size: 21 })], { spacing: { after: 120, line: 340 } }));
    else if (b.v) kids.push(...verse(b.v, b.label));
    else if (b.show) kids.push(P([run('🖥 화면  ', { bold: true, size: 18, color: '1F5FA8' }), run(b.show, { size: 18, color: '1F5FA8' })], { spacing: { after: 100 } }));
    else if (b.ask) kids.push(box([P([run('❓ ', { size: 19 }), run(b.ask, { size: 19, bold: true })])], 'EEF3F8', 'C9D6E3'), gap(100));
    else if (b.note) kids.push(P([run('✎ ', { size: 18, color: MUTED }), run(b.note, { size: 18, color: MUTED })], { spacing: { after: 120, line: 300 }, indent: { left: 200 } }));
    else if (b.list) kids.push(...b.list.map((x) => P([run(`· ${x}`, { size: 19 })], { spacing: { after: 50 }, indent: { left: 200 } })), gap(80));
  }
}
kids.push(P([run('자주 나오는 질문', { serif: true, bold: true, size: 30 })], { pageBreakBefore: true, spacing: { after: 160 } }));
for (const [q, a] of PLAN.faq) kids.push(P([run('Q. ' + q, { bold: true, size: 20 })], { spacing: { after: 40 }, keepNext: true }), P([run(a, { size: 19 })], { spacing: { after: 160, line: 320 }, indent: { left: 240 } }));
const used = new Set(); for (const p of PLAN.parts) for (const b of p.blocks) if (b.v) used.add(b.v);
const missing = Object.keys(VERSES).filter((k) => !used.has(k) && k !== PLAN.key);
const doc = new Document({ creator: '새부대교회', title: PLAN.title,
  styles: { default: { document: { run: { font: { ascii: SANS, eastAsia: SANS, hAnsi: SANS }, size: 20, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    footers: { default: new Footer({ children: [P([run('신약맥잡기 7강 강의안 · ', { size: 15, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], size: 15, color: MUTED })], { alignment: AlignmentType.CENTER })] }) },
    children: kids }] });
const out = process.argv[2] || path.join(__dirname, '../../content/bible-flow/out/신약맥잡기-7강-강의안.docx');
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out, '안 쓴 구절:', missing.join(', ') || '없음'); });
