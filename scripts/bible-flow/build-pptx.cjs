/**
 * 성경맥잡기 1단계 신약편 — 과마다 PPT(.pptx) 하나씩
 * 원고: content/bible-flow/nt.cjs  ·  발표자 메모에 원고 본문과 질문 답이 들어간다.
 *
 * 색은 테마 색이 아니라 hex 로 직접 쓴다 — 다른 컴퓨터에서 다시 구워도
 * 테마 적용 단계 없이 같은 색이 나오게 하려고.
 */
const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const { META, BOOKS, LESSONS, CANON } = require('../../content/bible-flow/nt.cjs');
const { FONT, INK, MUTED, TINT, LESSON_COLORS, soft } = require('./theme.cjs');

const SW = 10, SH = 5.625; // LAYOUT_16x9
const X0 = 0.5, CW = 9; // 본문 폭
const TOP = 1.45, BOTTOM = 4.95; // 본문 세로 범위

const color = (no) => LESSON_COLORS[no - 1];
const genre = (no) => {
  const g = CANON.find((c) => c.lesson === no);
  return g ? (g.count > 1 ? `${g.group} ${g.count}권` : BOOKS[g.books[0]].name) : '중간기';
};

function buildDeck(lesson, outFile) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = META.byline;
  pres.title = `${META.series} ${META.title} ${lesson.no}과 ${lesson.title}`;
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  const c = color(lesson.no);
  let objId = 0;
  const id = (name) => `${name}-${++objId}`;

  pres.defineSlideMaster({
    title: 'DARK',
    background: { color: INK },
  });
  pres.defineSlideMaster({
    title: 'CONTENT',
    background: { color: 'FFFFFF' },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: X0, y: 0.32, w: CW, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: INK, valign: 'middle', align: 'left', margin: 0 }, text: '' } },
      { text: { text: `${META.series} · ${META.title}  |  ${lesson.no}과 ${lesson.title}`, options: { x: X0, y: 5.2, w: 7, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, margin: 0 } } },
    ],
    slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontFace: FONT, fontSize: 9, color: MUTED, align: 'right' },
  });

  const text = (s, t, o) => s.addText(t, { isTextBox: true, fontFace: FONT, margin: 0, objectName: id('text'), ...o });
  const box = (s, o) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { rectRadius: 0.08, line: { type: 'none' }, objectName: id('card'), ...o });
  const circle = (s, x, y, d, fill, label, size, labelColor = 'FFFFFF') => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: 'none' }, objectName: id('dot') });
    if (label != null) text(s, String(label), { x, y, w: d, h: d, fontSize: size, bold: true, color: labelColor, align: 'center', valign: 'middle' });
  };
  const content = (title, lead) => {
    const s = pres.addSlide({ masterName: 'CONTENT' });
    s.addText(title, { placeholder: 'title' });
    if (lead) text(s, lead, { x: X0, y: 0.92, w: CW, h: 0.4, fontSize: 15, color: c, bold: true });
    return s;
  };

  // 1. 표지
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    text(s, `${META.series} · ${META.title}`, { x: X0 + 0.1, y: 0.55, w: 8, h: 0.4, fontSize: 14, color: soft(c, 0.45), bold: true });
    circle(s, 0.65, 1.75, 1.55, c, null);
    text(s, [{ text: String(lesson.no), options: { fontSize: 54, bold: true, breakLine: true } }, { text: '과', options: { fontSize: 14 } }], {
      x: 0.65, y: 1.78, w: 1.55, h: 1.5, color: 'FFFFFF', align: 'center', valign: 'middle', lineSpacingMultiple: 0.85,
    });
    text(s, lesson.title, { x: 2.55, y: 1.7, w: 7, h: 0.85, fontSize: 40, bold: true, color: 'FFFFFF', valign: 'middle' });
    text(s, lesson.subtitle, { x: 2.55, y: 2.6, w: 7, h: 0.5, fontSize: 18, color: soft(c, 0.55) });
    text(s, lesson.range, { x: 2.55, y: 3.1, w: 7, h: 0.4, fontSize: 12, color: 'B8ADA4' });
    text(s, META.byline, { x: X0 + 0.1, y: 4.85, w: 6, h: 0.3, fontSize: 11, color: 'B8ADA4' });
    s.addNotes(lesson.intro.join('\n\n'));
  }

  // 2. 여섯 맥 지도
  {
    const s = content(`여섯 맥 — 지금 ${lesson.no}번째 맥`, null);
    const y = 2.05, step = 1.6, x1 = 1.0;
    s.addShape(pres.shapes.LINE, { x: x1, y, w: step * 5, h: 0, line: { color: 'D9D2CB', width: 2 }, objectName: id('line') });
    LESSONS.forEach((l, i) => {
      const cur = l.no === lesson.no;
      const d = cur ? 1.0 : 0.66;
      const cx = x1 + step * i;
      circle(s, cx - d / 2, y - d / 2, d, cur ? color(l.no) : soft(color(l.no), 0.72), l.no, cur ? 26 : 18, cur ? 'FFFFFF' : color(l.no));
      text(s, l.short, { x: cx - 0.78, y: y + 0.62, w: 1.56, h: 0.36, fontSize: 14, bold: true, align: 'center', color: cur ? color(l.no) : INK });
      text(s, genre(l.no), { x: cx - 0.78, y: y + 0.96, w: 1.56, h: 0.3, fontSize: 11, align: 'center', color: MUTED });
    });
    box(s, { x: X0, y: 3.85, w: CW, h: 0.85, fill: { color: soft(c, 0.88) } });
    text(s, [{ text: '이번 과  ', options: { bold: true, color: c } }, { text: lesson.subtitle, options: { color: INK } }], { x: X0 + 0.35, y: 3.85, w: CW - 0.7, h: 0.85, fontSize: 17, valign: 'middle' });
    s.addNotes(LESSONS.map((l) => `${l.no}과 ${l.title} — ${l.subtitle}`).join('\n'));
  }

  // 3. 큰 그림 (흐름)
  {
    const big = lesson.big;
    const s = content(big.title, null);
    const n = big.items.length;
    const dense = n >= 5;
    const g = dense ? 0.2 : 0.3;
    const w = (CW - g * (n - 1)) / n;
    const y = 1.2, h = big.footnote ? 3.35 : 3.6;
    // 가장 긴 제목이 한 줄에 들어가는 크기 (한글 한 자 ≈ 글자 크기만큼의 폭)
    const maxLen = Math.max(...big.items.map((it) => it.title.length));
    const titleSize = Math.min(dense ? 14 : 17, Math.floor(((w - 0.3) * 72) / maxLen));
    big.items.forEach((it, i) => {
      const x = X0 + i * (w + g);
      box(s, { x, y, w, h, fill: { color: TINT } });
      const numbered = !/^\d/.test(it.title);
      circle(s, x + 0.18, y + 0.2, 0.44, c, numbered ? i + 1 : null, 15);
      text(s, it.title, { x: x + 0.15, y: y + 0.75, w: w - 0.3, h: dense ? 0.62 : 0.45, fontSize: titleSize, bold: true, color: INK, valign: 'top' });
      text(s, it.tag, { x: x + 0.15, y: y + (dense ? 1.37 : 1.22), w: w - 0.3, h: dense ? 0.45 : 0.32, fontSize: 11, color: c, bold: true, valign: 'top' });
      const by = y + (dense ? 1.85 : 1.62);
      if (it.chips) {
        it.chips.forEach((chip, k) => {
          box(s, { x: x + 0.08, y: by + k * 0.42, w: w - 0.16, h: 0.34, fill: { color: c }, rectRadius: 0.17 });
          text(s, chip, { x: x + 0.08, y: by + k * 0.42, w: w - 0.16, h: 0.34, fontSize: dense ? 10 : 12, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
        });
      } else {
        text(s, it.body, { x: x + 0.15, y: by, w: w - 0.3, h: y + h - by - 0.12, fontSize: dense ? 12 : 13, color: INK, valign: 'top' });
      }
      if (i < n - 1) {
        s.addShape(pres.shapes.ISOSCELES_TRIANGLE, { x: x + w + 0.08, y: y + h / 2 - 0.08, w: 0.14, h: 0.16, rotate: 90, fill: { color: soft(c, 0.4) }, line: { type: 'none' }, objectName: id('arrow') });
      }
    });
    if (big.footnote) text(s, big.footnote, { x: X0, y: 4.62, w: CW, h: 0.45, fontSize: 10, color: MUTED, valign: 'top' });
    s.addNotes(big.items.map((it, i) => `${i + 1}. ${it.title} (${it.tag}) — ${it.body || it.chips.join(', ')}`).join('\n') + (big.footnote ? `\n\n${big.footnote}` : ''));
  }

  // 한 권짜리 과(사도행전·계시록)는 책 카드를 큰 그림 다음에 둔다
  const singleBook = (s, bid) => {
    const b = BOOKS[bid];
    const y = TOP, h = BOTTOM - TOP;
    box(s, { x: X0, y, w: 3.1, h, fill: { color: c } });
    text(s, b.name, { x: X0 + 0.3, y: y + 0.3, w: 2.5, h: 0.6, fontSize: 26, bold: true, color: 'FFFFFF' });
    text(s, b.line, { x: X0 + 0.3, y: y + 0.95, w: 2.5, h: 0.9, fontSize: 15, color: 'FFFFFF', valign: 'top' });
    text(s, [{ text: b.author, options: { breakLine: true } }, { text: b.date }], { x: X0 + 0.3, y: y + h - 1.0, w: 2.5, h: 0.8, fontSize: 11, color: soft(c, 0.7), valign: 'bottom' });
    const rx = X0 + 3.4, rw = CW - 3.4;
    text(s, b.key.ref, { x: rx, y: y + 0.1, w: rw, h: 0.35, fontSize: 14, bold: true, color: c });
    text(s, b.key.text, { x: rx, y: y + 0.5, w: rw, h: 1.45, fontSize: 16, color: INK, valign: 'top' });
    b.keywords.forEach((k, i) => {
      const kw = 1.7;
      box(s, { x: rx + i * (kw + 0.15), y: y + 2.1, w: kw, h: 0.4, fill: { color: soft(c, 0.85) }, rectRadius: 0.2 });
      text(s, k, { x: rx + i * (kw + 0.15), y: y + 2.1, w: kw, h: 0.4, fontSize: 12, bold: true, color: c, align: 'center', valign: 'middle' });
    });
    text(s, b.note, { x: rx, y: y + 2.7, w: rw, h: 0.75, fontSize: 13, color: MUTED, valign: 'top' });
  };
  if (lesson.bookCard) {
    const b = BOOKS[lesson.bookCard];
    const s = content(`${b.name} 한눈에`, b.line);
    singleBook(s, lesson.bookCard);
    s.addNotes(`${b.name}: ${b.line}\n${b.author} · ${b.date}\n${b.note}`);
  }

  // 4. 꼭지마다 한 장
  for (const sec of lesson.sections) {
    const s = content(sec.heading, sec.lead);
    const area = { y: TOP, h: BOTTOM - TOP };
    if (sec.books && sec.books.length === 1) {
      singleBook(s, sec.books[0]);
    } else if (sec.books) {
      const n = sec.books.length, g = 0.25;
      const w = (CW - g * (n - 1)) / n;
      sec.books.forEach((bid, i) => {
        const b = BOOKS[bid];
        const x = X0 + i * (w + g);
        box(s, { x, y: area.y, w, h: area.h, fill: { color: TINT } });
        box(s, { x, y: area.y, w, h: 0.62, fill: { color: c } });
        text(s, b.name, { x: x + 0.15, y: area.y, w: w - 0.3, h: 0.62, fontSize: n >= 4 ? 15 : 17, bold: true, color: 'FFFFFF', valign: 'middle' });
        const wide = n <= 3;
        text(s, b.line, { x: x + 0.15, y: area.y + 0.75, w: w - 0.3, h: 0.7, fontSize: wide ? 15 : 13, bold: true, color: INK, valign: 'top' });
        text(s, b.keywords.join(' · '), { x: x + 0.15, y: area.y + 1.5, w: w - 0.3, h: 0.45, fontSize: 11, color: c, bold: true, valign: 'top' });
        text(s, [{ text: b.key.ref, options: { bold: true, color: INK, fontSize: 12, breakLine: true } }, { text: b.date, options: { color: MUTED, fontSize: 10 } }], { x: x + 0.15, y: area.y + 2.0, w: w - 0.3, h: 0.6, valign: 'top' });
        if (wide) text(s, b.note, { x: x + 0.15, y: area.y + 2.65, w: w - 0.3, h: 0.8, fontSize: 11, color: INK, valign: 'top' });
      });
    } else if (sec.points && sec.points.length <= 3) {
      const n = sec.points.length, g = 0.3;
      const w = (CW - g * (n - 1)) / n;
      sec.points.forEach((pt, i) => {
        const x = X0 + i * (w + g);
        box(s, { x, y: area.y, w, h: area.h, fill: { color: TINT } });
        circle(s, x + 0.25, area.y + 0.25, 0.5, c, i + 1, 16);
        text(s, pt.label, { x: x + 0.25, y: area.y + 0.9, w: w - 0.5, h: 0.5, fontSize: 22, bold: true, color: c });
        text(s, pt.tag, { x: x + 0.25, y: area.y + 1.42, w: w - 0.5, h: 0.35, fontSize: 12, color: MUTED, bold: true });
        text(s, pt.text, { x: x + 0.25, y: area.y + 1.9, w: w - 0.5, h: area.h - 2.05, fontSize: 15, color: INK, valign: 'top' });
      });
    } else if (sec.points) {
      const n = sec.points.length, g = 0.1;
      const rh = (area.h - g * (n - 1)) / n;
      sec.points.forEach((pt, i) => {
        const y = area.y + i * (rh + g);
        box(s, { x: X0, y, w: CW, h: rh, fill: { color: TINT } });
        circle(s, X0 + 0.15, y + (rh - 0.4) / 2, 0.4, c, i + 1, 13);
        text(s, pt.label, { x: X0 + 0.7, y: y + rh / 2 - 0.3, w: 2.35, h: 0.3, fontSize: 14, bold: true, color: c, valign: 'bottom' });
        text(s, pt.tag, { x: X0 + 0.7, y: y + rh / 2 + 0.02, w: 2.35, h: 0.26, fontSize: 10, color: MUTED, valign: 'top' });
        text(s, pt.text, { x: X0 + 3.15, y, w: CW - 3.35, h: rh, fontSize: 13, color: INK, valign: 'middle' });
      });
    } else {
      box(s, { x: X0, y: area.y, w: CW, h: area.h, fill: { color: soft(c, 0.9) } });
      circle(s, X0 + 0.45, area.y + area.h / 2 - 0.5, 1.0, c, '→', 30);
      text(s, sec.body.join('\n\n'), { x: X0 + 1.85, y: area.y + 0.3, w: CW - 2.3, h: area.h - 0.6, fontSize: 18, color: INK, valign: 'middle' });
    }
    s.addNotes(sec.body.join('\n\n') + (sec.points ? '\n\n' + sec.points.map((pt) => `· ${pt.label} (${pt.tag}): ${pt.text}`).join('\n') : '') + (sec.books ? '\n\n' + sec.books.map((bid) => `· ${BOOKS[bid].name}: ${BOOKS[bid].note}`).join('\n') : ''));
  }

  // 5. 핵심 구절
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    text(s, '핵심 구절', { x: 1.0, y: 0.75, w: 8, h: 0.4, fontSize: 14, bold: true, color: soft(c, 0.45) });
    text(s, lesson.keyVerse.text, { x: 1.0, y: 1.3, w: 8, h: 2.7, fontSize: 24, color: 'FFFFFF', valign: 'middle', lineSpacingMultiple: 1.2 });
    text(s, `${lesson.keyVerse.ref}  (${META.translation})`, { x: 1.0, y: 4.2, w: 8, h: 0.4, fontSize: 15, bold: true, color: soft(c, 0.45), align: 'right' });
  }

  // 6. 확인 질문 (답은 메모에)
  {
    const s = content('확인 질문', '답은 발표자 메모에 있습니다');
    const n = lesson.questions.length, g = 0.18;
    const rh = (BOTTOM - TOP - g * (n - 1)) / n;
    lesson.questions.forEach((q, i) => {
      const y = TOP + i * (rh + g);
      box(s, { x: X0, y, w: CW, h: rh, fill: { color: TINT } });
      circle(s, X0 + 0.25, y + (rh - 0.55) / 2, 0.55, c, i + 1, 18);
      text(s, q.q, { x: X0 + 1.1, y, w: CW - 1.4, h: rh, fontSize: 18, color: INK, valign: 'middle' });
    });
    s.addNotes(lesson.questions.map((q, i) => `${i + 1}. ${q.q}\n→ ${q.a}`).join('\n\n'));
  }

  // 7. 다음 시간
  {
    const s = pres.addSlide({ masterName: 'DARK' });
    const next = LESSONS.find((l) => l.no === lesson.no + 1);
    if (next) {
      text(s, '다음 시간', { x: 1.0, y: 1.2, w: 8, h: 0.4, fontSize: 16, bold: true, color: 'B8ADA4' });
      circle(s, 1.0, 1.9, 1.2, color(next.no), `${next.no}과`, 22);
      text(s, next.title, { x: 2.5, y: 1.85, w: 6.5, h: 0.75, fontSize: 34, bold: true, color: 'FFFFFF' });
      text(s, next.subtitle, { x: 2.5, y: 2.6, w: 6.5, h: 0.5, fontSize: 17, color: soft(color(next.no), 0.5) });
    } else {
      text(s, '신약의 맥을 다 잡았습니다', { x: 1.0, y: 1.3, w: 8, h: 0.8, fontSize: 34, bold: true, color: 'FFFFFF', align: 'center' });
      LESSONS.forEach((l, i) => circle(s, 2.15 + i * 1.0, 2.55, 0.7, color(l.no), l.no, 18));
      text(s, `${META.series} · ${META.title}`, { x: 1.0, y: 3.6, w: 8, h: 0.4, fontSize: 14, color: 'B8ADA4', align: 'center' });
    }
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  return pres.writeFile({ fileName: outFile });
}

async function build(outDir) {
  const files = [];
  for (const l of LESSONS) {
    const f = path.join(outDir, `성경맥잡기1-신약-${l.no}과-${l.short.replace(/\s/g, '')}.pptx`);
    await buildDeck(l, f);
    files.push(f);
    console.log('wrote', f);
  }
  return files;
}

module.exports = { build };
if (require.main === module) build(process.argv[2] || path.join(__dirname, '../../content/bible-flow/out'));
