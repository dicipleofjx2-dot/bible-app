/**
 * 성경맥잡기 — 도식 SVG 를 「입체 · 다양한 글씨체」로 다듬어 PNG 로 굽는다.
 *  - 글씨체: 큰 제목(26px 이상) = Noto Serif KR · 「인용」 = 나눔명조 · 나머지 = Noto Sans KR
 *  - 입체: 카드(둥근 사각형)에 그림자, 색 띠에 위→아래 밝기 차
 * 실행: npm i --no-save @fontsource/noto-sans-kr@5 @fontsource/noto-serif-kr@5 @fontsource/nanum-myeongjo@5
 *       node scripts/bible-flow/render.cjs [이름…]   (이름 없으면 out/*.svg 전부)
 * 원본 SVG 는 그대로 두고 out/png/<이름>.png 를 만든다.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '../../content/bible-flow/out');
const FONTS = path.dirname(require.resolve('@fontsource/noto-sans-kr/package.json')).replace(/noto-sans-kr$/, '');
const css = ['noto-sans-kr/400.css', 'noto-sans-kr/700.css', 'noto-serif-kr/700.css', 'noto-serif-kr/900.css', 'nanum-myeongjo/400.css', 'nanum-myeongjo/700.css']
  .map((f) => `@import url('file://${FONTS}${f}');`).join('\n');

function dress(svg) {
  const defs = `<defs><style>${css}
    text { font-family: 'Noto Sans KR', sans-serif; }
    text.ti { font-family: 'Noto Serif KR', serif; font-weight: 900; }
    text.qt { font-family: 'Nanum Myeongjo', serif; font-weight: 700; }
  </style>
  <filter id="lift" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#2A211B" flood-opacity="0.18"/></filter>
  <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.10"/></linearGradient></defs>`;
  svg = svg.replace(/(<svg[^>]*>)/, `$1${defs}`);
  // 글씨체 역할
  svg = svg.replace(/<text([^>]*)font-size="([\d.]+)"([^>]*)>([^<]*)<\/text>/g, (m, a, size, b, body) => {
    let cls = '';
    if (+size >= 26) cls = 'ti';
    else if (/^[「『]/.test(body.trim()) || /「[^」]{8,}」/.test(body)) cls = 'qt';
    return `<text${a}font-size="${size}"${b}${cls ? ` class="${cls}"` : ''}>${body}</text>`;
  });
  svg = svg.replace(/ font-family="[^"]*"/, ''); // 최상위 font-family 를 지우고 CSS 가 정한다
  // 입체: 카드 그림자 + 색 칸 광택
  let first = true;
  svg = svg.replace(/<rect([^>]*?)\/>/g, (m, attrs) => {
    if (first && /width="1600"/.test(attrs)) { first = false; return m; }   // 배경
    const w = +(attrs.match(/width="([\d.]+)"/) || [])[1] || 0;
    const h = +(attrs.match(/height="([\d.]+)"/) || [])[1] || 0;
    const rx = +(attrs.match(/rx="([\d.]+)"/) || [])[1] || 0;
    const fill = (attrs.match(/fill="([^"]+)"/) || [])[1] || '';
    if (w < 40 || h < 24 || rx < 6 || fill === 'none') return m;
    const dark = /^#[0-9A-Fa-f]{6}$/.test(fill) && (parseInt(fill.slice(1, 3), 16) * 0.3 + parseInt(fill.slice(3, 5), 16) * 0.59 + parseInt(fill.slice(5, 7), 16) * 0.11) < 170;
    const shadow = `<rect${attrs} filter="url(#lift)"/>`;
    return dark ? shadow + `<rect${attrs.replace(/fill="[^"]+"/, 'fill="url(#gloss)"')} pointer-events="none"/>` : shadow;
  });
  return svg;
}

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(OUT).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
  fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
  const tmp = path.join(OUT, 'png', '.tmp');
  fs.mkdirSync(tmp, { recursive: true });
  const b = await chromium.launch();
  for (const n of names) {
    const src = fs.readFileSync(path.join(OUT, n + '.svg'), 'utf8');
    const [, w, h] = src.match(/width="(\d+)" height="(\d+)"/);
    const file = path.join(tmp, n + '.svg');
    fs.writeFileSync(file, dress(src));
    const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
    await p.goto('file://' + file);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, 'png', n + '.png') });
    await p.close();
    console.log('png', n);
  }
  await b.close();
  fs.rmSync(tmp, { recursive: true, force: true });
})();
