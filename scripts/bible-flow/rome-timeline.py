"""성경맥잡기 — 로마 역사 속 신약 시대 도식 (SVG → PNG)

위: 로마 역사 전체(왕정 · 공화정 · 제정)와 신약 시대가 차지하는 자리
아래: 그 자리를 확대 — 로마 황제 / 유대를 다스린 이 / 신약
연대는 모두 「약」. BC 는 음수로 계산한다(0년은 없지만 도식에서는 무시한다).

실행: python3 scripts/bible-flow/rome-timeline.py  → content/bible-flow/out/rome-timeline.svg (+ .png, playwright 있으면)
"""
import os, html

OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
W, H = 1600, 1000
FONT = "'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED, LINE = '#2A211B', '#6B5C52', '#D9D2CB'
ROME, ROME_SOFT = '#952B38', '#F1DCDF'
JUDEA, JUDEA_SOFT = '#9A6510', '#F3E7D2'
NT, NT_SOFT = '#2F7466', '#D9EAE6'
HEROD = '#C2410C'

X0, X1 = 170, 1560  # 그림 폭


def yr(y):
    return f'BC {-y}' if y < 0 else f'AD {y}'


svg = []
add = svg.append


def text(x, y, s, size=16, color=INK, weight=400, anchor='start', **kw):
    extra = ''.join(f' {k.replace("_", "-")}="{v}"' for k, v in kw.items())
    add(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}"{extra}>{html.escape(s)}</text>')


def rect(x, y, w, h, fill, rx=6, stroke='none', **kw):
    extra = ''.join(f' {k.replace("_", "-")}="{v}"' for k, v in kw.items())
    add(f'<rect x="{x:.1f}" y="{y:.1f}" width="{max(w, 1):.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}"{extra}/>')


def line(x1, y1, x2, y2, color=LINE, width=1.5, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    add(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{color}" stroke-width="{width}"{d}/>')


add(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">')
rect(0, 0, W, H, '#FFFFFF', rx=0)
text(40, 52, '로마의 역사와 신약 시대', 32, INK, 700)
text(40, 82, '연대는 모두 「약」 · 위는 로마 역사 전체, 아래는 그중 신약 시대를 확대한 것', 15, MUTED)

# ---------- 위: 로마 역사 전체 ----------
A0, A1 = -753, 476
ax = lambda y: X0 + (y - A0) / (A1 - A0) * (X1 - X0)
TY = 140
text(40, TY + 33, '로마 전체', 17, INK, 700)
periods = [(-753, -509, '왕정', '#B8ADA4'), (-509, -27, '공화정', '#8C7B6E'), (-27, 476, '제정 (황제 시대)', ROME)]
for a, b, label, c in periods:
    rect(ax(a), TY, ax(b) - ax(a) - 3, 50, c, rx=8)
    text((ax(a) + ax(b)) / 2, TY + 32, label, 18, '#FFFFFF', 700, 'middle')
for y, label in [(-753, 'BC 753 건국'), (-509, 'BC 509'), (-27, 'BC 27 첫 황제'), (313, 'AD 313 기독교 공인'), (476, 'AD 476 서로마 멸망')]:
    line(ax(y), TY + 50, ax(y), TY + 62, MUTED, 1.5)
    anchor = 'start' if y == -753 else ('end' if y == 476 else 'middle')
    text(ax(y), TY + 80, label, 13, MUTED, 400, anchor)
# 313 표시
line(ax(313), TY - 6, ax(313), TY + 50, '#FFFFFF', 2, '4 3')

# 확대 구간
Z0, Z1 = -70, 100
zx = lambda y: X0 + (y - Z0) / (Z1 - Z0) * (X1 - X0)
rect(ax(Z0), TY - 10, ax(Z1) - ax(Z0), 70, 'none', rx=4, stroke=NT, stroke_width=3)
text((ax(Z0) + ax(Z1)) / 2, TY - 18, '신약 시대', 15, NT, 700, 'middle')
ZT = 290
add(f'<path d="M{ax(Z0):.1f},{TY + 60} L{X0},{ZT - 40} L{X1},{ZT - 40} L{ax(Z1):.1f},{TY + 60} Z" fill="{NT_SOFT}" opacity="0.55"/>')

# ---------- 아래: 확대 ----------
# 눈금
for y in range(-70, 101, 10):
    if y == 0:
        continue
    line(zx(y), ZT - 12, zx(y), H - 70, '#EEE9E4', 1)
    text(zx(y), ZT - 18, yr(y), 12, MUTED, 400, 'middle')
line(zx(0), ZT - 12, zx(0), H - 70, MUTED, 1.5, '6 4')
text(zx(0), H - 50, 'BC | AD', 13, MUTED, 700, 'middle')


def row_label(y, title, color):
    text(40, y + 26, title, 17, color, 700)


def bar(a, b, y, h, fill, label='', color='#FFFFFF', size=14, weight=700, below=False):
    rect(zx(a), y, zx(b) - zx(a) - 2, h, fill, rx=5)
    if not label:
        return
    w = zx(b) - zx(a)
    if not below and w > len(label) * size * 1.0 + 10:
        text((zx(a) + zx(b)) / 2, y + h / 2 + size * 0.36, label, size, color, weight, 'middle')
    else:
        text((zx(a) + zx(b)) / 2, y + h + size + 4, label, size - 1, INK, weight, 'middle')


# 1) 로마 — 시대 / 왕조
R1 = ZT
row_label(R1, '로마', ROME)
bar(-70, -27, R1, 34, '#8C7B6E', '공화정 (BC 63 예루살렘 점령)')
bar(-27, 68, R1, 34, ROME, '율리우스–클라우디우스 왕조')
bar(68, 69, R1, 34, '#B8ADA4')
bar(69, 96, R1, 34, '#6E1F2A', '플라비우스 왕조')
bar(96, 100, R1, 34, '#B8ADA4')
# 황제
R2 = R1 + 46
emps = [(-27, 14, '아우구스투스'), (14, 37, '티베리우스'), (37, 41, '칼리굴라'), (41, 54, '클라우디우스'),
        (54, 68, '네로'), (69, 79, '베스파시아누스'), (79, 81, '티투스'), (81, 96, '도미티아누스')]
below_off = {'칼리굴라': (0, 0), '베스파시아누스': (-14, 0), '티투스': (14, 16)}
for i, (a, b, n) in enumerate(emps):
    if n in below_off:
        bar(a, b, R2, 30, ROME_SOFT if i % 2 else '#E7C3C8')
        dx, dy = below_off[n]
        text((zx(a) + zx(b)) / 2 + dx, R2 + 47 + dy, n, 12, ROME, 700, 'end' if dx < 0 else ('start' if dx > 0 else 'middle'))
    else:
        bar(a, b, R2, 30, ROME_SOFT if i % 2 else '#E7C3C8', n, ROME, 13, 700)
text(40, R2 + 21, '황제', 14, MUTED, 700)

# 2) 유대를 다스린 이
J1 = R2 + 88
row_label(J1, '유대 통치', JUDEA)
bar(-70, -63, J1, 34, '#C9B48A', '')
text(zx(-70) + 4, J1 - 6, '하스몬 왕조', 12, MUTED)
bar(-63, -37, J1, 34, '#C9B48A', '로마 아래 하스몬', INK, 13, 400)
bar(-37, -4, J1, 34, JUDEA, '헤롯 대왕')
bar(-4, 6, J1, 34, '#B98A3A', '아켈라오', '#FFFFFF', 13)
bar(6, 41, J1, 34, '#7A6A5E', '로마 총독 · 빌라도(26–36)', '#FFFFFF', 12)
bar(41, 44, J1, 34, JUDEA, '')
bar(44, 66, J1, 34, '#7A6A5E', '총독 벨릭스·베스도', '#FFFFFF', 12)
bar(66, 73, J1, 34, '#4A3F38', '전쟁', '#FFFFFF', 12)
bar(73, 100, J1, 34, '#B8ADA4', '로마 직할', INK, 12, 400)
J2 = J1 + 44
text(40, J2 + 20, '갈릴리 · 기타', 14, MUTED, 700)
bar(-4, 39, J2, 28, JUDEA_SOFT, '헤롯 안디바 (갈릴리) · 빌립 (북동쪽)', JUDEA, 13)
bar(41, 44, J2, 28, JUDEA, '')
text(zx(42.5), J2 + 46, '아그립바 1세 (행 12장)', 12, JUDEA, 700, 'middle')
bar(53, 93, J2, 28, JUDEA_SOFT, '아그립바 2세 (행 25–26장)', JUDEA, 13)

# 3) 신약
N1 = J2 + 96
row_label(N1, '신약', NT)
bar(-6, -4, N1, 34, NT, '')
text(zx(-5), N1 + 54, '예수님 탄생', 13, NT, 700, 'middle')
text(zx(-5), N1 + 70, 'BC 6–4', 12, MUTED, 400, 'middle')
bar(27, 30, N1, 34, NT, '')
text(zx(28.5), N1 + 54, '공생애 · 십자가 · 부활', 13, NT, 700, 'middle')
text(zx(28.5), N1 + 70, 'AD 27–30', 12, MUTED, 400, 'middle')
bar(30, 62, N1 + 0, 34, NT_SOFT, '사도행전 (AD 30–62)', NT, 13)
N2 = N1 + 90
text(40, N2 + 20, '신약이 쓰인 때', 14, MUTED, 700)
bar(48, 67, N2, 28, '#3E8E7D', '바울서신 13권', '#FFFFFF', 13)
bar(55, 95, N2 + 36, 28, '#7FB5A8', '복음서 · 공동서신', INK, 13, 400)
bar(93, 96, N2 + 72, 28, NT, '')
text(zx(93) - 8, N2 + 92, '요한계시록 AD 95', 13, NT, 700, 'end')

# ---------- 세로 기준선 ----------
def marker(y, title, sub, color, top=R1 - 4, bottom=N2 + 108, side='end'):
    line(zx(y), top, zx(y), bottom, color, 2.5, '7 4')
    bx = zx(y) + (-8 if side == 'end' else 8)
    text(bx, bottom + 22, title, 15, color, 700, side)
    text(bx, bottom + 40, sub, 12, MUTED, 400, side)


marker(-37, '헤롯 가문 유대 통치 시작 · BC 37', 'BC 40 로마 원로원이 「유대인의 왕」 임명 → BC 37 로마군과 예루살렘 차지', HEROD, side='start')
marker(70, 'AD 70 예루살렘 성전 파괴', '티투스 → 개선문(81) · 콜로세움 완공(80)', ROME, side='end')

# 헤롯 시작점 강조 원
add(f'<circle cx="{zx(-37):.1f}" cy="{J1 + 17}" r="11" fill="{HEROD}" stroke="#FFFFFF" stroke-width="3"/>')

add('</svg>')

os.makedirs(OUT, exist_ok=True)
svg_path = os.path.join(OUT, 'rome-timeline.svg')
with open(svg_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(svg))
print('wrote', svg_path)

try:
    from playwright.sync_api import sync_playwright
    png_path = os.path.join(OUT, 'rome-timeline.png')
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=2)
        pg.goto('file://' + os.path.abspath(svg_path))
        pg.screenshot(path=png_path)
        b.close()
    print('wrote', png_path)
except Exception as e:  # 파이썬 playwright 가 없으면 SVG 만
    print('png skipped:', e)
