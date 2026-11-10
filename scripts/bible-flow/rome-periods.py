"""성경맥잡기 — 로마의 세 시대: 왕정 · 공화정 · 제정 (SVG)
시대 폭 = 기간 비례. 연대는 모두 「약」.
실행: python3 scripts/bible-flow/rome-periods.py → content/bible-flow/out/rome-periods.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED, BIBLE = '#2A211B', '#6B5C52', '#2F7466'
# (시대, 시작, 끝, 색, 한 줄, 다스림, [(연도, 사건, 설명, 성경 연결)])
P = [
    ('왕정', -753, -509, '#8C7B6E', '왕이 다스리던 작은 도시', '일곱 왕', [
        ('BC 753', '로마 건국 (전설)', '로물루스가 세웠다고 전한다', '같은 무렵 이사야 · 호세아'),
        ('BC 700–509', '일곱 왕 시대', '북쪽 에트루리아의 영향을 받으며 자람', '북이스라엘 멸망 722 · 남유다 멸망 586'),
        ('BC 509', '마지막 왕 추방', '타르퀴니우스를 쫓아내고 왕정을 끝냄', '포로 귀환 538 · 성전 재건 516'),
    ]),
    ('공화정', -509, -27, '#5B6B7F', '원로원과 집정관이 다스림 — 지중해의 패자로', '원로원 · 집정관 2명', [
        ('BC 509', '공화정 시작', '해마다 뽑는 집정관 두 명 · 원로원', ''),
        ('BC 450', '12표법', '로마 최초의 성문법 — 로마법의 출발', '에스라 · 느헤미야 · 말라기 무렵'),
        ('BC 264–146', '포에니 전쟁', '카르타고(한니발)를 꺾고 지중해를 손에 넣음 · 146 카르타고 · 고린도 파괴', '중간기 — 헬라 시대'),
        ('BC 63', '폼페이우스, 예루살렘 점령', '유대가 로마의 손 아래 들어옴', '유대가 로마 지배로'),
        ('BC 49–44', '율리우스 카이사르', '루비콘 강을 건너 권력을 쥐고 종신 독재관이 되었다가 암살됨', ''),
        ('BC 37', '헤롯, 유대의 왕', '로마 원로원이 세운 왕 — 로마군과 예루살렘 차지', '헤롯 가문의 유대 통치 시작'),
        ('BC 31', '악티움 해전', '옥타비아누스가 안토니우스 · 클레오파트라를 꺾음 → 내전 끝', ''),
    ]),
    ('제정', -27, 476, '#952B38', '황제가 다스리는 제국 — 신약의 무대', '황제', [
        ('BC 27', '아우구스투스, 첫 황제', '「로마의 평화」(팍스 로마나) 시작', '「가이사 아구스도」 호적령 — 예수님 탄생(눅 2:1)'),
        ('AD 14–37', '티베리우스', '두 번째 황제', '「디베료 가이사」 15년 — 세례 요한 · 십자가(눅 3:1)'),
        ('AD 49', '클라우디우스, 유대인 추방', '로마에서 유대인을 내쫓음', '아굴라 · 브리스길라가 고린도로(행 18:2)'),
        ('AD 64', '로마 대화재 · 네로 박해', '그리스도인에게 화재 책임을 씌움', '전통 — 베드로 · 바울 순교'),
        ('AD 70', '예루살렘 성전 파괴', '티투스가 유대 반란을 진압', '「돌 하나도 돌 위에 남지 않고」(마 24:2)'),
        ('AD 80 · 81', '콜로세움 · 티투스 개선문', '전쟁의 전리품으로 세운 기념물', ''),
        ('AD 81–96', '도미티아누스', '황제 숭배 강요', '요한이 밧모 섬에서 요한계시록(계 1:9)'),
        ('AD 96–180', '오현제 시대', '제국의 전성기 — 교회가 제국 곳곳으로', ''),
        ('AD 303', '디오클레티아누스 대박해', '로마 최후 · 최대의 박해', ''),
        ('AD 313 · 380', '밀라노 칙령 · 국교', '콘스탄티누스가 공인, 테오도시우스가 국교로', '박해받던 교회가 제국의 종교로'),
        ('AD 395 · 476', '동서 분열 · 서로마 멸망', '476 서로마 멸망 (동로마는 1453년까지)', ''),
    ]),
]
W, H = 1600, 900
s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">', f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
def t(x, y, txt, size, color=INK, weight=400, anchor='start'):
    s.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(txt)}</text>')
def rect(x, y, w, h, fill, rx=8, stroke='none'):
    s.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}"/>')
def wrap(txt, n):
    out, line = [], ''
    for w in txt.split(' '):
        if len(line) + len(w) + 1 > n and line:
            out.append(line); line = w
        else:
            line = (line + ' ' + w).strip()
    out.append(line); return out

t(60, 62, '로마의 세 시대 — 왕정 · 공화정 · 제정', 32, INK, 700)
t(60, 94, '시대의 폭 = 실제 기간 · 연대는 모두 「약」 · 초록 글씨 = 성경과 닿는 곳', 16, MUTED)
X0, X1, G = 60, 1540, 14
span = sum(b - a for _, a, b, *_ in P)
# 최소 폭 보정: 왕정은 카드 한 줄이 들어가게
widths = [(b - a) / span * (X1 - X0 - 2 * G) for _, a, b, *_ in P]
widths[0] = max(widths[0], 300); rest = (X1 - X0 - 2 * G) - widths[0]
tot12 = widths[1] + widths[2]; widths[1] = rest * widths[1] / tot12; widths[2] = rest * widths[2] / tot12
x = X0
for (name, a, b, c, one, rule, ev), w in zip(P, widths):
    yrs = b - a
    rect(x, 118, w, 92, c, 12)
    t(x + 18, 152, name, 26, '#FFFFFF', 700)
    t(x + w - 16, 150, f'BC {-a} – ' + (f'BC {-b}' if b < 0 else f'AD {b}'), 15, '#FFFFFF', 700, 'end')
    t(x + 18, 178, one, 14, '#FFFFFF')
    t(x + 18, 198, f'다스림: {rule} · 약 {yrs}년', 12.5, '#FFFFFF')
    cols = 1 if w < 400 else 2
    cw = (w - (cols - 1) * 10) / cols
    per = (len(ev) + cols - 1) // cols
    nchar = int((cw - 20) / 13)
    ys = [224] * cols
    for k, (yr, title, sub, bible) in enumerate(ev):
        col = 0 if k < len(ev) // cols else min(1, cols - 1)
        cx = x + col * (cw + 10)
        sl, bl = wrap(sub, nchar)[:3], (wrap(bible, nchar)[:3] if bible else [])
        ch = 62 + 17 * (len(sl) + len(bl)) + (4 if bl else 0)
        if cols == 1:
            ch = max(ch, 150)
        cy = ys[col]
        rect(cx, cy, cw, ch, '#F7F4F1', 10, '#E3DDD7')
        t(cx + 12, cy + 24, yr, 14, c, 700)
        t(cx + 12, cy + 46, title, 16, INK, 700)
        yy = cy + 66
        for ln in sl:
            t(cx + 12, yy, ln, 12.5, MUTED); yy += 17
        for ln in bl:
            t(cx + 12, yy + 2, ln, 12.5, BIBLE, 700); yy += 17
        ys[col] += ch + 8
    x += w + G
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'rome-periods.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote rome-periods.svg')
