"""성경맥잡기 — 비바울서신 9권, 시기별로 (SVG)
실행: python3 scripts/bible-flow/general-letters.py → content/bible-flow/out/general-letters.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED = '#2A211B', '#6B5C52'
# (시기, 때, 색, [(책, 쓴 이, 쓴 곳, 받는 이, 근거)], 아래 설명)
COLS = [
    ('가장 이른 편지', '약 AD 45–49 (견해)', '#9A6510',
     [('야고보서', '주의 형제 야고보', '예루살렘', '「흩어져 있는 열 두 지파」(약 1:1)', '살아 있는 믿음은 행함으로 드러난다 — 시험을 이기는 믿음, 혀를 다스림, 부자에게 경고')],
     '바울서신보다 앞섰을 수 있다'),
    ('네로 박해 무렵', '약 AD 62–68', '#952B38',
     [('베드로전서', '사도 베드로', '로마 — 「바벨론」(벧전 5:13)', '본도 · 갈라디아 · 갑바도기아 · 아시아 · 비두니아의 나그네(1:1)', '흩어진 나그네에게 — 고난 속의 산 소망, 선한 행실로 하나님을 영화롭게 하라'),
      ('베드로후서', '사도 베드로', '로마 (전통)', '같은 교회들 — 「이 둘째 편지」(3:1)', '거짓 교사를 조심하라 — 주의 날은 반드시 온다, 더딤은 오래 참으심이다')],
     '전통에 따르면 베드로는 이 무렵 로마에서 순교'),
    ('성전 파괴 전후', '약 AD 64–80', '#4A3F38',
     [('히브리서', '저자 미상', '미상 — 「이달리야에서 온 자들」(13:24)', '유대인 그리스도인들', '예수는 천사 · 모세 · 제사장보다 더 나으신 분 — 옛 제사로 돌아가지 말고 믿음으로 견디라(11장)'),
      ('유다서', '주의 형제 유다', '미상', '「부르심을 입은 자」들(1:1)', '은밀히 들어온 거짓 교사를 경계하고 믿음의 도를 위하여 힘써 싸우라')],
     '히브리서는 성전 제사가 아직 있는 듯 말해 AD 70 전으로 보는 견해가 많다'),
    ('요한의 말년', '약 AD 90–95', '#2F7466',
     [('요한일서 · 이서 · 삼서', '장로 요한 (전통)', '에베소 (전통)', '아시아의 교회들 · 「택하심을 입은 부녀」 · 가이오', '하나님은 빛이시고 사랑이시다 — 육체로 오신 예수를 고백하고 서로 사랑하라 · 진리 안의 대접'),
      ('요한계시록', '요한', '밧모 섬 (계 1:9)', '아시아의 일곱 교회(1:11)', '일곱 교회에 주신 말씀과 하늘 보좌의 환상 — 어린양이 이기시고 새 하늘과 새 땅이 온다')],
     '신약의 마지막 책들'),
]
W, H = 1600, 900
s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">', f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
def t(x, y, txt, size, color=INK, weight=400, anchor='start'):
    s.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(txt)}</text>')
def wrap(txt, n):
    out, line = [], ''
    for w in txt.split(' '):
        if len(line) + len(w) + 1 > n and line:
            out.append(line); line = w
        else:
            line = (line + ' ' + w).strip()
    out.append(line); return out
t(60, 68, '비바울서신 9권 — 언제, 어디서, 누구에게', 34, INK, 700)
t(60, 104, '연대는 모두 「약」 · 쓴 곳이 본문에 없는 책은 (전통) · 미상으로 밝힘', 17, MUTED)
X0, X1, G = 60, 1540, 18
cw = (X1 - X0 - G * 3) / 4
s.append(f'<line x1="{X0}" y1="150" x2="{X1 - 12}" y2="150" stroke="{MUTED}" stroke-width="3"/><path d="M{X1},150 L{X1 - 14},143 L{X1 - 14},157 Z" fill="{MUTED}"/>')
for i, (title, when, c, books, foot) in enumerate(COLS):
    x = X0 + i * (cw + G)
    s.append(f'<circle cx="{x + cw / 2:.1f}" cy="150" r="10" fill="{c}" stroke="#FFFFFF" stroke-width="3"/>')
    s.append(f'<rect x="{x:.1f}" y="176" width="{cw:.1f}" height="74" rx="12" fill="{c}"/>')
    t(x + cw / 2, 208, title, 21, '#FFFFFF', 700, 'middle')
    t(x + cw / 2, 234, when, 14, '#FFFFFF', 400, 'middle')
    y = 268
    for name, who, place, to, note in books:
        rows = [('쓴 이', who), ('쓴 곳', place), ('받는 이', to)]
        lines = [(k, ln) for k, v in rows for ln in wrap(v, 22)]
        nl = wrap(note, 26)
        h = 62 + 21 * len(lines) + 20 * len(nl) + 12
        s.append(f'<rect x="{x:.1f}" y="{y}" width="{cw:.1f}" height="{h}" rx="12" fill="#F2F0EE"/>')
        ex, ey = x + 16, y + 20
        s.append(f'<rect x="{ex}" y="{ey}" width="22" height="15" rx="2" fill="{c}"/><path d="M{ex},{ey} L{ex + 11},{ey + 9} L{ex + 22},{ey}" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>')
        t(ex + 32, y + 34, name, 19, INK, 700)
        yy = y + 62
        prev = None
        for k, ln in lines:
            if k != prev:
                t(x + 16, yy, k, 12.5, c, 700)
            t(x + 76, yy, ln, 13.5, INK)
            prev = k
            yy += 21
        yy += 4
        for ln in nl:
            t(x + 16, yy + 2, ln, 13.5, INK, 700)
            yy += 20
        y += h + 12
    for k, ln in enumerate(wrap(foot, 26)):
        t(x + 4, 846 + k * 19, ln, 12.5, MUTED)
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'general-letters.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote general-letters.svg')
