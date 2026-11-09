/**
 * 성경맥잡기 1단계 신약편 — 전자책(.docx, A5) 만들기
 * 원고: content/bible-flow/nt.cjs
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, AlignmentType, HeadingLevel, PageBreak, Footer, PageNumber, LevelFormat, VerticalAlign,
} = require('docx');
const { META, BOOKS, LESSONS, CANON } = require('../../content/bible-flow/nt.cjs');
const { FONT, INK, MUTED, TINT, LINE, LESSON_COLORS, soft } = require('./theme.cjs');

// A5 (148×210mm) · DXA
const PAGE = { width: 8391, height: 11906 };
const MARGIN = { top: 1100, bottom: 1100, left: 1000, right: 1000 };
const W = PAGE.width - MARGIN.left - MARGIN.right; // 6391

const color = (no) => LESSON_COLORS[no - 1];
const lessonOfBook = (id) => CANON.find((c) => c.books.includes(id)).lesson;

// ---------- 작은 조각 ----------
const run = (text, o = {}) => new TextRun({ text, font: FONT, ...o });
// KEEP 가 켜진 동안 만든 문단은 다음 문단과 같은 쪽에 붙는다 — 카드·표가 쪽 사이로 갈리지 않게.
let KEEP = false;
function keep(fn) { const was = KEEP; KEEP = true; try { return fn(); } finally { KEEP = was; } }
const p = (children, o = {}) =>
  new Paragraph({ children: typeof children === 'string' ? [run(children)] : children, ...(KEEP ? { keepNext: true } : {}), ...o });
const body = (text) => p(text, { style: 'Body' });
const gap = (after = 120) => new Paragraph({ children: [], spacing: { after } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const thin = (c = LINE) => ({ style: BorderStyle.SINGLE, size: 4, color: c });
const borders = (b) => ({ top: b, bottom: b, left: b, right: b });

function cell(children, { width, fill, span, valign } = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: width, type: WidthType.DXA },
    columnSpan: span,
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    margins: { top: 90, bottom: 90, left: 140, right: 140 },
    verticalAlign: valign || VerticalAlign.TOP,
  });
}

function table(columnWidths, rows, b = thin()) {
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths,
    borders: { ...borders(b), insideHorizontal: b, insideVertical: b },
    rows,
  });
}

const small = (text, o = {}) => p([run(text, { size: 17, color: MUTED, ...o })], { spacing: { after: 0 } });
const cellText = (text, o = {}) => p([run(text, { size: 19, color: INK, ...o })], { spacing: { after: 0, line: 300 } });

// ---------- 덩어리 ----------
function bookCard(id) {
  const b = BOOKS[id];
  const c = color(lessonOfBook(id));
  const L = 1300, R = W - L;
  const row = (label, value) =>
    new TableRow({
      children: [
        cell(cellText(label, { bold: true, color: MUTED, size: 17 }), { width: L, fill: TINT }),
        cell(Array.isArray(value) ? value : cellText(value), { width: R }),
      ],
    });
  const rows = keep(() => [
    new TableRow({
      cantSplit: true,
      children: [
        cell(
          [
            p([run(b.name, { bold: true, size: 24, color: 'FFFFFF' })], { spacing: { after: 20 } }),
            p([run(b.line, { size: 19, color: 'FFFFFF' })], { spacing: { after: 0 } }),
          ],
          { width: W, fill: c, span: 2 },
        ),
      ],
    }),
    row('쓴 사람', b.author),
    row('시기', b.date),
    ...(b.reader ? [row('처음 독자', b.reader)] : []),
    row('키워드', b.keywords.join(' · ')),
    row('핵심 구절', [cellText(b.key.ref, { bold: true, color: c }), cellText(b.key.text)]),
  ]);
  rows.push(row('덧붙임', b.note));
  return [table([L, R], rows), gap(200)];
}

function flowTable(lesson) {
  const c = color(lesson.no);
  const L = 1900, R = W - L;
  const n = lesson.big.items.length;
  const rows = lesson.big.items.map((it, i) => (i < n - 1 ? keep : (f) => f())(() =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(
            [
              p([run(/^\d/.test(it.title) ? it.title : `${i + 1}  ${it.title}`, { bold: true, size: 19, color: 'FFFFFF' })], { spacing: { after: 20 } }),
              p([run(it.tag, { size: 16, color: 'FFFFFF' })], { spacing: { after: 0 } }),
            ],
            { width: L, fill: c, valign: VerticalAlign.CENTER },
          ),
          cell(cellText(it.chips ? it.chips.join(' · ') : it.body, it.chips ? { bold: true } : {}), {
            width: R,
            fill: soft(c, 0.9),
            valign: VerticalAlign.CENTER,
          }),
        ],
      })),
  );
  const out = [table([L, R], rows, thin('FFFFFF'))];
  if (lesson.big.footnote) out.push(p([run(lesson.big.footnote, { size: 16, color: MUTED })], { spacing: { before: 80, after: 0 } }));
  out.push(gap(200));
  return out;
}

function pointsTable(points, c) {
  const L = 1900, R = W - L;
  const rows = points.map((pt, i) => (i < points.length - 1 ? keep : (f) => f())(() =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(
            [
              p([run(pt.label, { bold: true, size: 19, color: c })], { spacing: { after: 20 } }),
              p([run(pt.tag, { size: 16, color: MUTED })], { spacing: { after: 0 } }),
            ],
            { width: L, fill: TINT },
          ),
          cell(cellText(pt.text), { width: R }),
        ],
      })),
  );
  return [table([L, R], rows), gap(200)];
}

function verseBox(v, c) {
  return keep(() => [
    table(
      [W],
      [
        new TableRow({
          cantSplit: true,
          children: [
            cell(
              [
                p([run('핵심 구절', { bold: true, size: 16, color: c })], { spacing: { after: 60 } }),
                p([run(v.text, { size: 21, color: INK })], { spacing: { after: 60, line: 320 } }),
                p([run(`— ${v.ref} (${META.translation})`, { size: 17, color: MUTED })], { alignment: AlignmentType.RIGHT, spacing: { after: 0 } }),
              ],
              { width: W, fill: soft(c, 0.9) },
            ),
          ],
        }),
      ],
      thin(soft(c, 0.6)),
    ),
    gap(200),
  ]);
}

// ---------- 쪽 ----------
function cover() {
  return [
    gap(2400),
    p([run(META.series, { size: 26, bold: true, color: LESSON_COLORS[1] })], { alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
    p([run(META.title, { size: 64, bold: true, color: INK })], { alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
    p([run(META.subtitle, { size: 24, color: MUTED })], { alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
    p(
      LESSONS.map((l, i) => run(i ? '  ●' : '●', { size: 28, color: color(l.no) })),
      { alignment: AlignmentType.CENTER, spacing: { after: 2400 } },
    ),
    p([run(META.byline, { size: 20, color: MUTED })], { alignment: AlignmentType.CENTER }),
    pageBreak(),
  ];
}

function frontMatter() {
  const out = [
    p('일러두기', { heading: HeadingLevel.HEADING_2 }),
    body(`성경 본문은 ${META.translation}을 따랐다.`),
    body('연대는 모두 대략이다(「약」). 본문이 직접 말하지 않고 교회의 전통이나 학자들의 견해에 기대는 것은 (전통)·(견해)로 밝혔다.'),
    body('학설이 갈리는 곳은 한쪽을 단정하지 않고 갈린다고 적었다.'),
    body('각 과 끝의 확인 질문 답은 책 맨 뒤 부록에 있다.'),
    gap(240),
    p('차례', { heading: HeadingLevel.HEADING_2 }),
    p([run('들어가며 — 신약 한눈에', { size: 20 })], { spacing: { after: 80 } }),
  ];
  for (const l of LESSONS) {
    out.push(
      p([run(`${l.no}과  `, { bold: true, size: 20, color: color(l.no) }), run(l.title, { size: 20, bold: true }), run(`  ${l.subtitle}`, { size: 17, color: MUTED })], {
        spacing: { after: 80 },
      }),
    );
  }
  out.push(p([run('부록 — 신약 27권 한 장 요약 · 확인 질문 답', { size: 20 })], { spacing: { after: 80 } }));
  out.push(pageBreak());
  return out;
}

function overview() {
  const out = [
    p('들어가며 — 신약 한눈에', { heading: HeadingLevel.HEADING_1 }),
    body('신약은 27권이다. 성경에 실린 순서는 종류별로 묶은 것이라, 그대로 읽으면 흐름이 끊긴다. 이 책은 27권을 여섯 맥으로 다시 묶어 흐름의 순서대로 따라간다. 특히 바울서신은 사도행전의 시간표 위에 다시 놓는다.'),
    p('성경에 실린 순서', { heading: HeadingLevel.HEADING_3 }),
  ];
  const a = 1300, b = 900, c2 = W - a - b;
  out.push(
    table(
      [a, b, c2],
      [
        new TableRow({
          tableHeader: true,
          children: [
            cell(cellText('분류', { bold: true }), { width: a, fill: TINT }),
            cell(cellText('권수', { bold: true }), { width: b, fill: TINT }),
            cell(cellText('책', { bold: true }), { width: c2, fill: TINT }),
          ],
        }),
        ...CANON.map(
          (g) =>
            new TableRow({
              children: [
                cell(cellText(g.group, { bold: true, color: color(g.lesson) }), { width: a }),
                cell(cellText(`${g.count}권`), { width: b }),
                cell(cellText(g.books.map((id) => BOOKS[id].name).join(', ')), { width: c2 }),
              ],
            }),
        ),
      ],
    ),
    gap(240),
    p('이 책이 따라가는 여섯 맥', { heading: HeadingLevel.HEADING_3 }),
  );
  const x = 700, y = 1700, z = W - x - y;
  out.push(
    table(
      [x, y, z],
      LESSONS.map(
        (l) =>
          new TableRow({
            cantSplit: true,
            children: [
              cell(cellText(`${l.no}과`, { bold: true, color: 'FFFFFF' }), { width: x, fill: color(l.no), valign: VerticalAlign.CENTER }),
              cell(cellText(l.title, { bold: true }), { width: y, valign: VerticalAlign.CENTER }),
              cell([cellText(l.subtitle), small(l.range)], { width: z }),
            ],
          }),
      ),
    ),
  );
  return out;
}

function lessonPages(l, qRef) {
  const c = color(l.no);
  const out = [
    p([run(`${l.no}과`, { color: c })], { style: 'Kicker', pageBreakBefore: true }),
    p([run(l.title, { color: INK })], { heading: HeadingLevel.HEADING_1 }),
    p([run(l.subtitle, { size: 22, color: c, bold: true })], { spacing: { after: 60 } }),
    small(l.range),
    gap(200),
    ...l.intro.map(body),
  ];
  if (l.bookCard) out.push(gap(80), ...bookCard(l.bookCard));
  out.push(p([run(l.big.title, { color: c })], { heading: HeadingLevel.HEADING_2 }), ...flowTable(l));
  for (const s of l.sections) {
    out.push(p([run(s.heading, { color: c })], { heading: HeadingLevel.HEADING_2 }));
    s.body.forEach((t) => out.push(body(t)));
    if (s.points) out.push(...pointsTable(s.points, c));
    if (s.books) s.books.forEach((id) => out.push(...bookCard(id)));
  }
  out.push(...verseBox(l.keyVerse, c));
  out.push(p([run('확인 질문', { color: c })], { heading: HeadingLevel.HEADING_3 }));
  l.questions.forEach((q, i) => out.push(new Paragraph({ style: 'Body', keepNext: i < l.questions.length - 1, numbering: { reference: qRef, level: 0, instance: l.no }, children: [run(q.q)] })));
  return out;
}

function appendix() {
  const out = [p('부록 1 — 신약 27권 한 장 요약', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true })];
  const a = 1750, d = 1200, b = W - a - d;
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        cell(cellText('책', { bold: true }), { width: a, fill: TINT }),
        cell(cellText('한 줄', { bold: true }), { width: b, fill: TINT }),
        cell(cellText('핵심 구절', { bold: true }), { width: d, fill: TINT }),
      ],
    }),
  ];
  for (const g of CANON) {
    const c = color(g.lesson);
    rows.push(
      new TableRow({
        children: [cell(cellText(`${g.group} (${g.count}권) — ${g.lesson}과`, { bold: true, color: 'FFFFFF', size: 17 }), { width: W, fill: c, span: 3 })],
      }),
    );
    for (const id of g.books) {
      const bk = BOOKS[id];
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            cell(cellText(bk.name, { bold: true }), { width: a }),
            cell(cellText(bk.line), { width: b }),
            cell(cellText(bk.key.ref, { color: c }), { width: d }),
          ],
        }),
      );
    }
  }
  out.push(table([a, b, d], rows));

  out.push(p('부록 2 — 확인 질문 답', { heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
  for (const l of LESSONS) {
    out.push(p([run(`${l.no}과 ${l.title}`, { color: color(l.no) })], { heading: HeadingLevel.HEADING_3 }));
    l.questions.forEach((q, i) => {
      out.push(p([run(`${i + 1}. ${q.q}`, { size: 19, bold: true })], { spacing: { after: 20 }, keepNext: true }));
      out.push(p([run(q.a, { size: 19 })], { spacing: { after: 120 }, indent: { left: 280 } }));
    });
  }
  return out;
}

// ---------- 문서 ----------
async function build(outFile) {
  const Q = 'questions';
  const doc = new Document({
    creator: META.byline,
    title: `${META.series} ${META.title}`,
    styles: {
      default: { document: { run: { font: { ascii: FONT, eastAsia: FONT, hAnsi: FONT }, size: 20, color: INK } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 36, bold: true, color: INK }, paragraph: { spacing: { before: 0, after: 120 }, keepNext: true, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 280, after: 120 }, keepNext: true, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 21, bold: true }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true, outlineLevel: 2 } },
        { id: 'Body', name: 'Body', basedOn: 'Normal', run: { font: FONT, size: 20 }, paragraph: { spacing: { after: 120, line: 340 }, alignment: AlignmentType.BOTH } },
        { id: 'Kicker', name: 'Kicker', basedOn: 'Normal', run: { font: FONT, size: 22, bold: true }, paragraph: { spacing: { before: 0, after: 40 }, keepNext: true } },
      ],
    },
    numbering: {
      config: [{ reference: Q, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] }],
    },
    sections: [
      {
        properties: { page: { size: PAGE, margin: MARGIN } },
        footers: {
          default: new Footer({
            children: [p([run('', {}), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED })], { alignment: AlignmentType.CENTER })],
          }),
        },
        children: [...cover(), ...frontMatter(), ...overview(), ...LESSONS.flatMap((l) => lessonPages(l, Q)), ...appendix()],
      },
    ],
  });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, await Packer.toBuffer(doc));
  console.log('wrote', outFile);
}

module.exports = { build };
if (require.main === module) build(process.argv[2] || path.join(__dirname, '../../content/bible-flow/out/성경맥잡기1-신약편.docx'));
