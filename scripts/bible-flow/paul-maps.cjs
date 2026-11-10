/**
 * 성경맥잡기 — 바울의 전도여행 지도 (SVG)
 * 해안선: world-atlas(Natural Earth 50m, 공개 데이터) · 지명은 개역한글 표기 · 위치는 대략
 * 실행: npm i --no-save world-atlas@2 topojson-client@3  →  node scripts/bible-flow/paul-maps.cjs
 * 결과: content/bible-flow/out/paul-0-all.svg, paul-1.svg … paul-4-rome.svg
 */
const fs = require('fs');
const path = require('path');
const topo = require('topojson-client');
const land = require('world-atlas/land-50m.json');

const OUT = path.join(__dirname, '../../content/bible-flow/out');
const FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif";
const INK = '#2A211B', MUTED = '#6B5C52';
const SEA = '#DCE8EE', LAND = '#F1EBE2', COAST = '#B9AE9F';

// 도시 [경도, 위도, 라벨 dx, dy, 정렬]
const C = {
  예루살렘: [35.23, 31.78, 10, 18, 'start'], 가이사랴: [34.89, 32.5, -10, 4, 'end'], 돌레마이: [35.08, 32.92, 10, 4, 'start'],
  두로: [35.2, 33.27, 10, 4, 'start'], 시돈: [35.37, 33.56, 10, 4, 'start'], 안디옥: [36.16, 36.2, 10, 4, 'start'],
  실루기아: [35.93, 36.12, -6, 20, 'end'], 다소: [34.9, 36.92, 0, -12, 'middle'], 살라미: [33.9, 35.18, 10, 4, 'start'],
  바보: [32.41, 34.76, -8, 16, 'end'], 버가: [30.85, 36.96, 6, -10, 'start'], 앗달리아: [30.7, 36.89, -6, 18, 'end'],
  '비시디아 안디옥': [31.19, 38.31, 0, -12, 'middle'], 이고니온: [32.49, 37.87, 10, -6, 'start'], 루스드라: [32.36, 37.58, -10, 16, 'end'],
  더베: [33.36, 37.36, 10, 14, 'start'], 드로아: [26.24, 39.75, -10, 4, 'end'], 앗소: [26.34, 39.49, 10, 12, 'start'],
  미둘레네: [26.55, 39.11, 10, 6, 'start'], 네압볼리: [24.41, 40.94, 6, 18, 'start'], 빌립보: [24.29, 41.01, 0, -12, 'middle'],
  암비볼리: [23.85, 40.82, -6, 18, 'end'], 데살로니가: [22.94, 40.64, -10, -8, 'end'], 베뢰아: [22.2, 40.52, -10, 14, 'end'],
  아덴: [23.73, 37.98, 10, 6, 'start'], 고린도: [22.88, 37.91, -10, -6, 'end'], 겐그레아: [22.99, 37.88, -8, 18, 'end'],
  에베소: [27.34, 37.94, 10, 4, 'start'], 밀레도: [27.28, 37.53, 10, 14, 'start'], 로도: [28.22, 36.43, 10, 12, 'start'],
  바다라: [29.32, 36.27, 0, 20, 'middle'], 무라: [29.99, 36.26, 4, 20, 'start'], 미항: [24.8, 34.93, 0, 22, 'middle'],
  멜리데: [14.4, 35.9, 0, 22, 'middle'], 수라구사: [15.29, 37.08, 10, 4, 'start'], 레기온: [15.65, 38.11, 10, 4, 'start'],
  보디올: [14.12, 40.82, 10, 12, 'start'], 로마: [12.5, 41.89, 0, -14, 'middle'],
};
const REGIONS = [
  ['마게도냐', 22.6, 41.5], ['아가야', 22.2, 38.6], ['아시아', 28.7, 38.9], ['갈라디아(로마 속주)', 32.9, 39.05],
  ['길리기아', 34.2, 37.4], ['수리아', 37.0, 34.9], ['구브로', 33.2, 35.5], ['그레데', 24.6, 35.45], ['유대', 35.5, 31.2],
  ['이달리야', 15.6, 41.0], ['시실리', 14.2, 37.6],
];

// 여정: 점 이름 목록, ~ 는 바닷길(점선)
const J = {
  1: { name: '1차 전도여행', ref: '행 13–14장 · 약 AD 46–48', color: '#B5532F',
    who: '바나바 · 사울(바울) · 마가 요한(버가에서 돌아감)',
    letters: [['안디옥', '갈라디아서 * (돌아와서)', '갈 *', -190, 40]],
    stays: { '비시디아 안디옥': [1, '두 안식일 넘게(13:44)'], 이고니온: [2, '「오래」(14:3)'], 안디옥: [2, '돌아와 「오래」(14:28)'] },
    route: ['안디옥', '실루기아', '~살라미', '바보', '~버가', '비시디아 안디옥', '이고니온', '루스드라', '더베', '루스드라', '이고니온', '비시디아 안디옥', '버가', '앗달리아', '~안디옥'],
    notes: ['실루기아에서 배로 구브로(바나바의 고향)', '바보 — 총독 서기오 바울이 믿음(13:12)', '비시디아 안디옥 회당 설교(13:16–41)', '루스드라 — 신으로 떠받들다 돌에 맞음(14:19)', '더베에서 왔던 길로 돌아가며 장로를 세움(14:23)'] },
  2: { name: '2차 전도여행', ref: '행 15:36–18:22 · 약 AD 50–52', color: '#2F7466',
    who: '바울 · 실라 · 디모데(루스드라에서 합류) · 누가(드로아부터, 「우리」)',
    letters: [['고린도', '데살로니가전서 · 후서', '살전 · 살후', -60, 60]],
    stays: { 빌립보: [1, '수일(16:12)'], 데살로니가: [1, '세 안식일(17:2)'], 고린도: [3, '1년 6개월(18:11)'], 에베소: [0, '잠시(18:19–21)'] },
    route: ['안디옥', '다소', '더베', '루스드라', '이고니온', '비시디아 안디옥', '드로아', '~네압볼리', '빌립보', '암비볼리', '데살로니가', '베뢰아', '~아덴', '고린도', '겐그레아', '~에베소', '~가이사랴', '예루살렘', '안디옥'],
    notes: ['마게도냐 사람의 환상 — 「건너와서 우리를 도우라」(16:9)', '빌립보 — 루디아, 감옥의 찬송(16장) · 유럽 첫 교회', '데살로니가 · 베뢰아 — 말씀을 상고함(17:11)', '아덴 — 아레오바고 설교(17:22–31)', '고린도 1년 6개월 — 데살로니가전후서를 씀'] },
  3: { name: '3차 전도여행', ref: '행 18:23–21:16 · 약 AD 53–57', color: '#64457F',
    who: '바울 · 디모데 · 누가 등',
    letters: [['에베소', '고린도전서', '고전', 30, 60], ['빌립보', '고린도후서', '고후', 40, -40], ['고린도', '로마서', '롬', -60, 60]],
    stays: { 에베소: [3, '3년(20:31)'], 고린도: [2, '헬라 석 달(20:3)'], 드로아: [1, '이레(20:6)'], 두로: [1, '이레(21:4)'], 가이사랴: [1, '여러 날(21:10)'] },
    route: ['안디옥', '다소', '더베', '루스드라', '이고니온', '비시디아 안디옥', '에베소', '드로아', '~빌립보', '데살로니가', '베뢰아', '고린도', '베뢰아', '데살로니가', '빌립보', '~드로아', '앗소', '~미둘레네', '~밀레도', '~로도', '~바다라', '~두로', '~돌레마이', '가이사랴', '예루살렘'],
    notes: ['에베소 약 3년 — 두란노 서원(19:9), 고린도전서', '마게도냐에서 고린도후서 · 고린도 석 달 — 로마서', '드로아 — 유두고를 살림(20:9)', '밀레도 — 에베소 장로들과의 눈물의 작별(20:17–38)', '예루살렘 — 체포(21장)'] },
  4: { name: '로마로 가는 길', ref: '행 27–28장 · 약 AD 59–60', color: '#952B38',
    who: '죄수 바울 · 누가 · 아리스다고 — 백부장 율리오',
    letters: [['로마', '에베소서 · 빌립보서 · 골로새서 · 빌레몬서 (옥중서신)', '엡 · 빌 · 골 · 몬', 40, 60]],
    stays: { 가이사랴: [3, '2년 구금(24:27)'], 미항: [1, '여러 날(27:9)'], 멜리데: [2, '석 달(28:11)'], 수라구사: [1, '사흘(28:12)'], 보디올: [1, '이레(28:14)'], 로마: [3, '셋집 2년(28:30)'] },
    route: ['가이사랴', '~시돈', '~무라', '~미항', '~멜리데', '~수라구사', '~레기온', '~보디올', '로마'],
    notes: ['가이사랴에서 2년 구금 뒤 「가이사께 호소」(25:11)', '미항에서 겨울을 나지 않고 떠나 유라굴로 광풍(27:14)', '14일 표류 끝에 멜리데 섬에 난파 — 276명 모두 구조(27:37, 44)', '보디올에서 육로로 로마(28:14)', '로마 셋집 2년 — 「담대히 … 금하는 사람이 없었더라」(28:31)'] },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function clipRing(ring, b) {
  // Sutherland–Hodgman 사각형 자르기 (경위도 공간)
  const edges = [
    (p) => p[0] >= b.lon0, (p) => p[0] <= b.lon1, (p) => p[1] >= b.lat0, (p) => p[1] <= b.lat1,
  ];
  const inter = [
    (a, c) => { const t = (b.lon0 - a[0]) / (c[0] - a[0]); return [b.lon0, a[1] + t * (c[1] - a[1])]; },
    (a, c) => { const t = (b.lon1 - a[0]) / (c[0] - a[0]); return [b.lon1, a[1] + t * (c[1] - a[1])]; },
    (a, c) => { const t = (b.lat0 - a[1]) / (c[1] - a[1]); return [a[0] + t * (c[0] - a[0]), b.lat0]; },
    (a, c) => { const t = (b.lat1 - a[1]) / (c[1] - a[1]); return [a[0] + t * (c[0] - a[0]), b.lat1]; },
  ];
  let out = ring;
  for (let e = 0; e < 4; e++) {
    const inp = out; out = [];
    if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
      const ci = edges[e](cur), pi = edges[e](prev);
      if (ci) { if (!pi) out.push(inter[e](prev, cur)); out.push(cur); } else if (pi) out.push(inter[e](prev, cur));
    }
  }
  return out;
}

const geo = topo.feature(land, land.objects.land);
const polys = geo.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));

// 지도 한 장을 box 안에 그린다 (s: svg 조각 배열)
function drawMap(s, { ext, box, journeys, labels = 'all', id = 'm' }) {
  const k = Math.cos(((ext.lat0 + ext.lat1) / 2) * Math.PI / 180);
  const sc = Math.min(box.w / ((ext.lon1 - ext.lon0) * k), box.h / (ext.lat1 - ext.lat0));
  const ox = box.x + (box.w - (ext.lon1 - ext.lon0) * k * sc) / 2;
  const oy = box.y + (box.h - (ext.lat1 - ext.lat0) * sc) / 2;
  const P = (lon, lat) => [ox + (lon - ext.lon0) * k * sc, oy + (ext.lat1 - lat) * sc];
  const t = (x, y, str, size, color, weight = 400, anchor = 'start', extra = '') =>
    s.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}"${extra}>${esc(str)}</text>`);
  const [mx0, my0] = P(ext.lon0, ext.lat1), [mx1, my1] = P(ext.lon1, ext.lat0);
  const small = box.w < 700;
  s.push(`<defs>${journeys.map((n) => `<marker id="${id}a${n}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="${J[n].color}"/></marker>`).join('')}<clipPath id="${id}clip"><rect x="${mx0}" y="${my0}" width="${mx1 - mx0}" height="${my1 - my0}" rx="10"/></clipPath></defs>`);
  s.push(`<g clip-path="url(#${id}clip)">`);
  s.push(`<rect x="${mx0}" y="${my0}" width="${mx1 - mx0}" height="${my1 - my0}" fill="${SEA}"/>`);
  let d = '';
  for (const poly of polys) for (const ring of poly) {
    const c = clipRing(ring, ext);
    if (c.length < 3) continue;
    d += 'M' + c.map(([lo, la]) => P(lo, la).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z';
  }
  s.push(`<path d="${d}" fill="${LAND}" stroke="${COAST}" stroke-width="1" fill-rule="evenodd"/>`);
  for (const [n, lo, la] of REGIONS) {
    if (lo < ext.lon0 || lo > ext.lon1 || la < ext.lat0 || la > ext.lat1) continue;
    const [x, y] = P(lo, la);
    t(x, y, n, small ? 12 : 17, '#A89C8F', 700, 'middle', ' letter-spacing="2"');
  }
  const used = new Set();
  for (const n of journeys) {
    const j = J[n];
    const pts = j.route.map((r) => ({ sea: r.startsWith('~'), name: r.replace('~', '') }));
    pts.forEach((p) => used.add(p.name));
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = P(C[pts[i - 1].name][0], C[pts[i - 1].name][1]);
      const [x2, y2] = P(C[pts[i].name][0], C[pts[i].name][1]);
      const back = pts.slice(0, i - 1).some((q, qi) => q.name === pts[i].name && pts[qi + 1] && pts[qi + 1].name === pts[i - 1].name);
      const off = back ? (small ? 3 : 5) : 0;
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
      const nx = (-dy / L) * off, ny = (dx / L) * off;
      const mx = (x1 + x2) / 2 + nx, my = (y1 + y2) / 2 + ny;
      s.push(`<path d="M${x1 + nx},${y1 + ny} L${mx},${my} L${x2 + nx},${y2 + ny}" fill="none" stroke="${j.color}" stroke-width="${small ? 3 : 4.5}" stroke-linecap="round" ${pts[i].sea ? `stroke-dasharray="${small ? '6 5' : '9 7'}"` : ''} marker-mid="url(#${id}a${n})"/>`);
    }
  }
  const MAJOR = new Set(['예루살렘', '안디옥', '에베소', '고린도', '빌립보', '아덴', '데살로니가', '드로아', '가이사랴', '로마', '멜리데', '미항', '바보', '루스드라', '더베', '비시디아 안디옥', '이고니온', '밀레도']);
  // 머문 기간 — 원의 크기 (0 지나감 · 1 며칠–두어 주 · 2 몇 주–몇 달 · 3 1년 이상)
  const R = [5, 9, 14, 21];
  const stayOf = (name) => {
    let best = null;
    for (const n of journeys) { const st = (J[n].stays || {})[name]; if (st && (!best || st[0] > best[0])) best = [...st, J[n].color]; }
    return best;
  };
  const order = [...used].sort((a, b) => ((stayOf(b) || [0])[0]) - ((stayOf(a) || [0])[0]));
  for (const name of order) {
    const st = stayOf(name);
    if (!st) continue;
    const [x, y] = P(C[name][0], C[name][1]);
    const r = R[st[0]] * (small ? 0.75 : 1);
    s.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${st[2]}" fill-opacity="${0.18 + st[0] * 0.17}" stroke="${st[2]}" stroke-width="2"/>`);
  }
  for (const name of used) {
    const [lo, la, dx, dy, an] = C[name];
    const [x, y] = P(lo, la);
    const big = name === '예루살렘' || name === '안디옥' || name === '로마';
    const st = stayOf(name);
    const label = labels === 'all' || MAJOR.has(name) || st;
    s.push(`<circle cx="${x}" cy="${y}" r="${label ? (big ? 6 : 4.5) : 3.5}" fill="#FFFFFF" stroke="${INK}" stroke-width="${label ? 2 : 1.5}"/>`);
    if (label) {
      const f = small ? 0.75 : 1;
      const push = st ? R[st[0]] * f - 4 : 0; // 큰 원 밖으로 이름을 민다
      const ex = dx === 0 ? 0 : Math.sign(dx) * push, ey = dy === 0 ? 0 : Math.sign(dy) * push;
      t(x + dx * f + ex, y + dy * f + ey, name, (big ? 17 : 14) * f, INK, big ? 700 : 600, an, ' paint-order="stroke" stroke="#FFFFFF" stroke-width="4"');
    }
  }
  // 편지 표시 — 이 여행 중 이 도시에서 쓴 편지
  for (const n of journeys) for (const [city, full, short, bx, by] of (J[n].letters || [])) {
    const [x, y] = P(C[city][0], C[city][1]);
    const label = small ? short : full;
    const fs2 = small ? 11 : 14;
    const w = label.length * fs2 * 0.92 + (small ? 34 : 44), h = small ? 22 : 30;
    const f = small ? 0.6 : 1;
    const X = x + bx * f, Y = y + by * f;
    s.push(`<line x1="${x}" y1="${y}" x2="${X + w / 2}" y2="${Y}" stroke="${INK}" stroke-width="1.5"/>`);
    s.push(`<rect x="${X}" y="${Y - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${INK}"/>`);
    // 봉투 그림
    const ex = X + (small ? 8 : 12), ey = Y - (small ? 4 : 6), ew = small ? 14 : 18, eh = small ? 9 : 12;
    s.push(`<rect x="${ex}" y="${ey}" width="${ew}" height="${eh}" fill="#FFFFFF" rx="1.5"/><path d="M${ex},${ey} L${ex + ew / 2},${ey + eh * 0.6} L${ex + ew},${ey}" fill="none" stroke="${INK}" stroke-width="1.3"/>`);
    t(ex + ew + 6, Y + fs2 * 0.36, label, fs2, '#FFFFFF', 700);
  }
  s.push('</g>');
  s.push(`<rect x="${mx0}" y="${my0}" width="${mx1 - mx0}" height="${my1 - my0}" rx="10" fill="none" stroke="${COAST}"/>`);
  return { t, mx0, my0, mx1, my1 };
}

function legend(s, x, y, f = 1, color = '#6B5C52') {
  const R = [5, 9, 14, 21];
  const L = ['지나감', '며칠–두어 주', '몇 주–몇 달', '1년 이상'];
  let cx = x;
  R.forEach((r, i) => {
    s.push(`<circle cx="${cx + r * f}" cy="${y}" r="${r * f}" fill="${color}" fill-opacity="${0.18 + i * 0.17}" stroke="${color}" stroke-width="1.5"/>`);
    s.push(`<text x="${cx + 2 * r * f + 6}" y="${y + 5}" font-size="${13 * f}" fill="${INK}">${L[i]}</text>`);
    cx += 2 * r * f + 6 + L[i].length * 13 * f + 18;
  });
}
function svgStart() {
  return [`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" font-family="${FONT}">`, '<rect width="1600" height="900" fill="#FFFFFF"/>'];
}
function save(s, file) {
  s.push('</svg>');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, file), s.join('\n'));
  console.log('wrote', file);
}

// 한 여정 지도 (설명판 + 지도)
function single(n, ext, file, title, sub) {
  const s = svgStart();
  const { t } = drawMap(s, { ext, box: { x: 520, y: 24, w: 1056, h: 852 }, journeys: [n], id: 'm' + n });
  const j = J[n];
  t(48, 78, title, 32, INK, 700);
  t(48, 110, sub, 15, MUTED);
  let y = 150;
  s.push(`<rect x="48" y="${y}" width="440" height="40" rx="10" fill="${j.color}"/>`);
  t(64, y + 27, j.name, 19, '#FFFFFF', 700);
  t(480, y + 26, j.ref, 13, '#FFFFFF', 400, 'end');
  y += 66;
  t(48, y, '함께한 사람', 14, j.color, 700); y += 24;
  t(48, y, j.who, 14, INK); y += 40;
  t(48, y, '꼭 짚을 장면', 14, j.color, 700); y += 28;
  for (const note of j.notes) { t(56, y, '· ' + note, 14, INK); y += 26; }
  y += 8;
  const stays = Object.entries(j.stays || {}).filter(([, v]) => v[0] > 0).sort((a, b) => b[1][0] - a[1][0]);
  if (stays.length) { t(48, y, '머문 기간', 14, j.color, 700); y += 26; for (const [c, v] of stays) { t(56, y, `· ${c} ${v[1]}`, 14, INK); y += 24; } y += 10; }
  if ((j.letters || []).length) {
    t(48, y, '이 길에서 쓴 편지', 14, j.color, 700); y += 26;
    for (const [city, full] of j.letters) { t(56, y, `· ${city}에서 — ${full}`, 14, INK, 700); y += 26; }
    if (n === 1) { t(56, y, '* 여행을 마치고 안디옥에 돌아와서(14:26) 쓴 것으로 보는 남갈라디아설.', 12, MUTED); y += 20; t(64, y, '세운 교회들(비시디아 안디옥 · 이고니온 · 루스드라 · 더베)이 로마의 갈라디아 속주', 12, MUTED); y += 20; t(64, y, '북갈라디아설이면 2·3차에 들른 북쪽 갈라디아(16:6, 18:23) — 3차 여행 중', 12, MUTED); y += 22; }
    y += 8;
  }
  t(48, 800, '원의 크기 = 머문 기간', 13, j.color, 700);
  legend(s, 48, 826, 0.85, j.color);
  t(48, 866, '실선 = 땅길 · 점선 = 바닷길 · 위치는 대략', 13, MUTED);
  save(s, file);
}

// 1 · 2 · 3차를 같은 크기로 나란히
function compare(file) {
  const s = svgStart();
  s.push(`<text x="48" y="70" font-size="32" fill="${INK}" font-weight="700">바울의 세 번의 전도여행 — 나란히 보기</text>`);
  s.push(`<text x="48" y="102" font-size="15" fill="${MUTED}">같은 지역 · 같은 크기 · 실선 = 땅길, 점선 = 바닷길 · 원의 크기 = 머문 기간</text>`);
  legend(s, 860, 96, 0.85);
  const W = 500, G = 26, X = (1600 - 3 * W - 2 * G) / 2;
  [1, 2, 3].forEach((n, i) => {
    const x = X + i * (W + G);
    const j = J[n];
    s.push(`<rect x="${x}" y="130" width="${W}" height="56" rx="12" fill="${j.color}"/>`);
    s.push(`<text x="${x + 18}" y="166" font-size="22" fill="#FFFFFF" font-weight="700">${esc(j.name)}</text>`);
    s.push(`<text x="${x + W - 16}" y="165" font-size="13" fill="#FFFFFF" text-anchor="end">${esc(j.ref)}</text>`);
    drawMap(s, { ext: EAST, box: { x, y: 196, w: W, h: 400 }, journeys: [n], labels: 'major', id: 'c' + n });
    let y = 630;
    const stays = Object.entries(j.stays || {}).filter(([, v]) => v[0] > 0).sort((a, b) => b[1][0] - a[1][0]);
    s.push(`<text x="${x + 6}" y="${y}" font-size="14" fill="${j.color}" font-weight="700">머문 기간</text>`); y += 24;
    for (const [c, v] of stays.slice(0, 3)) { s.push(`<text x="${x + 14}" y="${y}" font-size="14" fill="${INK}">${esc('· ' + c + ' ' + v[1])}</text>`); y += 24; }
    y += 10;
    s.push(`<text x="${x + 6}" y="${y}" font-size="14" fill="${j.color}" font-weight="700">이 길에서 쓴 편지</text>`); y += 24;
    for (const [city, full] of j.letters) { s.push(`<text x="${x + 14}" y="${y}" font-size="14" fill="${INK}" font-weight="700">${esc('· ' + city + '에서 — ' + full)}</text>`); y += 24; }
    if (n === 1) { s.push(`<text x="${x + 14}" y="${y}" font-size="12" fill="${MUTED}">* 이 여행에서 세운 교회들이 로마의 갈라디아 속주 — 남갈라디아설</text>`); s.push(`<text x="${x + 14}" y="${y + 20}" font-size="12" fill="${MUTED}">  북갈라디아설이면 3차 여행 중</text>`); }
  });
  save(s, file);
}

const EAST = { lon0: 19.6, lon1: 38.6, lat0: 30.9, lat1: 42.3 };
const ROME = { lon0: 9.5, lon1: 37.8, lat0: 30.4, lat1: 43.6 };
compare('paul-0-compare.svg');
single(1, EAST, 'paul-1.svg', '1차 전도여행', '안디옥에서 소아시아로');
single(2, EAST, 'paul-2.svg', '2차 전도여행', '복음이 유럽으로 건너가다');
single(3, EAST, 'paul-3.svg', '3차 전도여행', '에베소 3년, 그리고 예루살렘으로');
single(4, ROME, 'paul-4-rome.svg', '로마로 가는 길', '죄수의 몸으로 땅 끝(로마)까지');
