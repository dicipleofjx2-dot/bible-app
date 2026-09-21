const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";          // 13.33 x 7.5
pres.author = "새부대교회";
pres.title = "클로드와 개발 용어 첫걸음";

const F = "맑은 고딕";
const DARK="2B2118", LIGHT="FBF7F1", LIGHT2="F2EBE1", CARD="FFFDF9",
      ACC="C4643A", ACC_L="E08A5E", SAGE="3E6B5A", BODY="5A4F45",
      MUTED="8A7B6D", BORDER="E5DACB", ONDARK="D8C7B6", DARKCARD="3A2C21";

const M = 0.7, W = 13.33 - M*2;        // 11.93
let page = 0;
let FOOTER = "클로드 수업 1강 · 개발 용어 첫걸음";
function setFooter(t) { FOOTER = t; page = 0; }

function footer(s, dark) {
  page++;
  if (page === 1) return;
  const c = dark ? "9C8C7C" : MUTED;
  s.addText(FOOTER, {
    x:M, y:6.95, w:6, h:0.3, isTextBox:true, margin:0,
    fontFace:F, fontSize:9.5, color:c, valign:"middle" });
  s.addText(String(page), {
    x:13.33-M-1, y:6.95, w:1, h:0.3, isTextBox:true, margin:0,
    fontFace:F, fontSize:9.5, color:c, align:"right", valign:"middle" });
}

function heading(s, eyebrow, title, opts) {
  const o = opts || {};
  let y = 0.6;
  if (eyebrow) {
    s.addText(eyebrow, { x:M, y:y, w:W, h:0.3, isTextBox:true, margin:0,
      fontFace:F, fontSize:11.5, bold:true, charSpacing:2,
      color:o.dark ? ACC_L : "A94E28", valign:"middle" });
    y += 0.36;
  }
  s.addText(title, { x:M, y:y, w:W, h:0.62, isTextBox:true, margin:0,
    fontFace:F, fontSize:31, bold:true, color:o.dark ? LIGHT : DARK, valign:"middle" });
  return y + 0.62 + 0.3;
}

// ── strip: a tinted note block at the bottom of a light slide
function note(s, text, o) {
  o = o || {};
  const y = o.y, h = o.h || 0.72;
  s.addShape(pres.ShapeType.roundRect, {
    x:M, y:y, w:W, h:h, rectRadius:0.08,
    fill:{ color:o.fill || LIGHT2 }, line:{ type:"none" } });
  s.addText(text, { x:M+0.35, y:y, w:W-0.7, h:h, isTextBox:true, margin:0,
    fontFace:F, fontSize:13, color:o.color || BODY, valign:"middle", lineSpacing:20 });
}

function numCircle(s, x, y, d, label, fill, textColor) {
  s.addShape(pres.ShapeType.ellipse, { x:x, y:y, w:d, h:d,
    fill:{ color:fill }, line:{ type:"none" } });
  s.addText(label, { x:x, y:y, w:d, h:d, isTextBox:true, margin:0,
    fontFace:F, fontSize:d*36, bold:true, color:textColor,
    align:"center", valign:"middle" });
}

// ── slide builders ───────────────────────────────────────────────
function sectionSlide(num, title, sub, notes) {
  const s = pres.addSlide();
  s.background = { color: DARK };
  numCircle(s, M, 1.75, 1.25, num, ACC, LIGHT);
  s.addText(title, { x:M, y:3.25, w:10.5, h:0.95, isTextBox:true, margin:0,
    fontFace:F, fontSize:40, bold:true, color:LIGHT, valign:"middle" });
  s.addText(sub, { x:M, y:4.35, w:10.2, h:0.9, isTextBox:true, margin:0,
    fontFace:F, fontSize:16, color:ONDARK, lineSpacing:26 });
  s.addNotes(notes);
  footer(s, true);
  return s;
}

function cardsSlide(cfg) {
  const s = pres.addSlide();
  s.background = { color: cfg.bg || LIGHT };
  const top = heading(s, cfg.eyebrow, cfg.title);
  const n = cfg.cards.length, gap = 0.25;
  const cw = (W - gap*(n-1)) / n;
  const hasNote = !!cfg.note;
  const ch = hasNote ? 3.55 : 4.35;
  cfg.cards.forEach((c, i) => {
    const x = M + i*(cw+gap);
    s.addShape(pres.ShapeType.roundRect, { x:x, y:top, w:cw, h:ch, rectRadius:0.1,
      fill:{ color:CARD }, line:{ color:BORDER, width:1 } });
    let cy = top + 0.3;
    if (c.num) { numCircle(s, x+0.28, cy, 0.5, c.num, i < n/2 ? ACC : SAGE, LIGHT); cy += 0.72; }
    if (c.kicker) {
      s.addText(c.kicker, { x:x+0.28, y:cy, w:cw-0.56, h:0.28, isTextBox:true, margin:0,
        fontFace:F, fontSize:11, bold:true, color:i < n/2 ? ACC : SAGE, valign:"middle" });
      cy += 0.34;
    }
    s.addText(c.h, { x:x+0.28, y:cy, w:cw-0.56, h:0.62, isTextBox:true, margin:0,
      fontFace:F, fontSize:16.5, bold:true, color:DARK, valign:"top", lineSpacing:23 });
    cy += 0.68;
    s.addText(c.p, { x:x+0.28, y:cy, w:cw-0.56, h:ch-(cy-top)-0.25, isTextBox:true, margin:0,
      fontFace:F, fontSize:12, color:BODY, valign:"top", lineSpacing:19 });
  });
  if (hasNote) note(s, cfg.note, { y: top + ch + 0.28, h:0.78, fill: cfg.bg === LIGHT2 ? CARD : LIGHT2 });
  s.addNotes(cfg.notes);
  footer(s);
  return s;
}

function tableSlide(cfg) {
  const s = pres.addSlide();
  s.background = { color: cfg.bg || LIGHT };
  const top = heading(s, cfg.eyebrow, cfg.title);
  const head = cfg.head.map(t => ({ text:t,
    options:{ bold:true, color:LIGHT, fill:{ color:DARK }, fontSize:12.5 } }));
  const rows = [head].concat(cfg.rows.map((r, i) => r.map((cell, j) => ({
    text:cell,
    options:{ bold: j===0, color: j===0 ? DARK : BODY,
      fill:{ color: i%2 ? (cfg.bg===LIGHT2 ? "FAF4EC" : "F5EFE6") : CARD } } }))));
  const hasNote = !!cfg.note;
  s.addTable(rows, { x:M, y:top, w:W, colW:cfg.colW,
    fontFace:F, fontSize:12.5, color:BODY, valign:"middle",
    rowH: cfg.rowH || 0.46, margin:[6,10,6,10],
    border:{ type:"solid", color:BORDER, pt:0.75 } });
  if (hasNote) note(s, cfg.note, { y: 6.05, h:0.78, fill: cfg.bg===LIGHT2 ? CARD : LIGHT2 });
  s.addNotes(cfg.notes);
  footer(s);
  return s;
}

function twoColSlide(cfg) {
  const s = pres.addSlide();
  s.background = { color: cfg.bg || LIGHT };
  const top = heading(s, cfg.eyebrow, cfg.title);
  const gap = 0.35, cw = (W - gap)/2;
  const ch = cfg.note ? 3.7 : 4.5;
  cfg.cols.forEach((c, i) => {
    const x = M + i*(cw+gap);
    s.addShape(pres.ShapeType.roundRect, { x:x, y:top, w:cw, h:ch, rectRadius:0.1,
      fill:{ color: c.fill }, line: c.line ? { color:c.line, width:1 } : { type:"none" } });
    s.addText(c.h, { x:x+0.4, y:top+0.3, w:cw-0.8, h:0.45, isTextBox:true, margin:0,
      fontFace:F, fontSize:18, bold:true, color:c.hColor, valign:"middle" });
    if (c.items) {
      s.addText(c.items.map((t, k) => ({ text:t,
        options:{ bullet:true, breakLine: k < c.items.length-1 } })), {
        x:x+0.4, y:top+0.92, w:cw-0.8, h:ch-1.2, isTextBox:true, margin:0,
        fontFace:F, fontSize:13.5, color:c.color, paraSpaceAfter:8, lineSpacing:21 });
    } else {
      s.addText(c.p, { x:x+0.4, y:top+0.92, w:cw-0.8, h:ch-1.2, isTextBox:true, margin:0,
        fontFace:F, fontSize:14, color:c.color, lineSpacing:24 });
    }
  });
  if (cfg.note) note(s, cfg.note, { y: top+ch+0.28, h:0.78, fill: cfg.noteFill || LIGHT2 });
  s.addNotes(cfg.notes);
  footer(s);
  return s;
}

function rowsSlide(cfg) {
  const s = pres.addSlide();
  s.background = { color: cfg.bg || LIGHT };
  const top = heading(s, cfg.eyebrow, cfg.title);
  const n = cfg.rows.length, gap = 0.16;
  const rh = (6.75 - top - gap*(n-1)) / n;
  cfg.rows.forEach((r, i) => {
    const y = top + i*(rh+gap);
    s.addShape(pres.ShapeType.roundRect, { x:M, y:y, w:W, h:rh, rectRadius:0.08,
      fill:{ color:CARD }, line:{ color: cfg.bg === LIGHT2 ? "E0D3C2" : BORDER, width:1 } });
    numCircle(s, M+0.3, y+(rh-0.46)/2, 0.46, String(i+1), i < 2 ? ACC : SAGE, LIGHT);
    s.addText(r, { x:M+1.0, y:y, w:W-1.4, h:rh, isTextBox:true, margin:0,
      fontFace:F, fontSize:15, color:DARK, valign:"middle", lineSpacing:22 });
  });
  s.addNotes(cfg.notes);
  footer(s);
  return s;
}
module.exports = { pres, setFooter, F, DARK, LIGHT, LIGHT2, CARD, ACC, ACC_L, SAGE, BODY, MUTED,
  BORDER, ONDARK, DARKCARD, M, W, heading, note, numCircle, footer,
  sectionSlide, cardsSlide, tableSlide, twoColSlide, rowsSlide };
