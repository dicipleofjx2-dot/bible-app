"""성경맥잡기 — 사도행전 도식 두 장 (SVG)

1) acts-18.svg   : 행 1:8 의 세 무대를 따라 복음이 퍼져 나간 길 (핍박과 「말씀이 흥왕」)
2) saul-path.svg : 사울의 회심에서 안디옥 교회 파송까지 (행 9–13장, 갈 1장)
실행: python3 scripts/bible-flow/acts-flow.py  (PNG 는 node + playwright 로 굽는다)
"""
import os, html

OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED = '#2A211B', '#6B5C52'
Z = ['#B5532F', '#9A6510', '#2F7466']  # 예루살렘 · 유대와 사마리아 · 땅 끝
ZS = ['#F6E1D8', '#F3E7D2', '#D9EAE6']
DARK = '#4A3F38'
GROW = '#3E8E5A'


class Svg:
    def __init__(self, w, h):
        self.w, self.h, self.s = w, h, []
        self.s.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="{FONT}">')
        self.rect(0, 0, w, h, '#FFFFFF', 0)

    def rect(self, x, y, w, h, fill, rx=8, stroke='none', sw=0):
        self.s.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

    def text(self, x, y, t, size=15, color=INK, weight=400, anchor='start'):
        self.s.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(t)}</text>')

    def lines(self, x, y, rows, size=13, color=INK, weight=400, anchor='start', lh=1.38):
        for i, r in enumerate(rows):
            self.text(x, y + i * size * lh, r, size, color, weight, anchor)

    def arrow(self, x1, y, x2, color, w=3):
        self.s.append(f'<line x1="{x1:.1f}" y1="{y:.1f}" x2="{x2 - 9:.1f}" y2="{y:.1f}" stroke="{color}" stroke-width="{w}"/>')
        self.s.append(f'<path d="M{x2:.1f},{y:.1f} L{x2 - 11:.1f},{y - 6:.1f} L{x2 - 11:.1f},{y + 6:.1f} Z" fill="{color}"/>')

    def save(self, name):
        self.s.append('</svg>')
        os.makedirs(OUT, exist_ok=True)
        p = os.path.join(OUT, name)
        open(p, 'w', encoding='utf-8').write('\n'.join(self.s))
        print('wrote', p)


# ---------------------------------------------------------------- 1) 행 1:8
# (무대, 장, 제목, 설명 줄들, 핍박?, 「말씀이 흥왕」 구절)
EVENTS = [
    (1, '8장', '핍박 →|사마리아', ['「큰 핍박이', '나서 … 흩어지', '니라」(8:1)', '빌립이 사마리아로'], True, None),
    (1, '9장', '사울의|회심', ['다메섹 길의 빛', '「택한', '나의 그릇」', '(9:15)'], False, None),
    (1, '9장', '베드로의|온 유대 사역', ['룻다 · 욥바', '애니아', '다비다'], False, '9:31'),
    (1, '10장', '고넬료의|집', ['이방 선교의', '신학이 서다', '「이방인에게도', '생명 얻는 회개」', '(11:18)'], False, None),
    (1, '11장', '안디옥|교회', ['처음으로', '「그리스도인」', '(11:26)'], False, None),
    (1, '12장', '야고보의|순교', ['베드로 투옥', '헤롯의 죽음'], True, '12:24'),
    (2, '13장', '바나바와|사울 파송', ['안디옥 교회가', '금식하고', '안수하여', '보내다(13:3)'], False, None),
    (2, '13–21장', '세 번의|전도여행', ['소아시아', '→ 유럽'], True, '16:5 · 19:20'),
    (2, '21–28장', '체포와|로마', ['「담대히 …', '금하는 사람이', '없었더라」', '(28:31)'], True, '28:31'),
]
JERUSALEM = [('1장', '승천과 맛디아'), ('2장', '성령 강림 · 3천 명'), ('3장', '앉은뱅이 치유'), ('4장', '핍박과 부흥 · 5천 명'),
             ('5장', '아나니아와 삽비라'), ('6장', '일곱 사람(집사) 세움'), ('7장', '스데반의 설교와 순교')]
ZONES = [('예루살렘', '1–7장'), ('온 유대와 사마리아', '8–12장'), ('땅 끝까지', '13–28장')]

W, H = 1600, 900
v = Svg(W, H)
v.text(60, 68, '사도행전 1:8 — 복음이 퍼져 나간 길', 34, INK, 700)
v.text(60, 104, '「오직 성령이 너희에게 임하시면 너희가 권능을 받고 예루살렘과 온 유대와 사마리아 땅 끝까지 이르러 내 증인이 되리라」', 17, MUTED)

X0, X1 = 60, 1540
n = len(EVENTS)
gap = 10
JW = 250  # 예루살렘 칸 폭
cw = (X1 - X0 - JW - gap * n) / n
cx = lambda i: X0 + JW + gap + i * (cw + gap)

# 무대 띠
ZY = 140
for z, (name, chs) in enumerate(ZONES):
    if z == 0:
        a, b = X0, X0 + JW
    else:
        idx = [i for i, e in enumerate(EVENTS) if e[0] == z]
        a, b = cx(idx[0]), cx(idx[-1]) + cw
    v.rect(a, ZY, b - a, 64, Z[z], 10)
    v.text((a + b) / 2, ZY + 30, name, 22, '#FFFFFF', 700, 'middle')
    v.text((a + b) / 2, ZY + 53, chs, 14, '#FFFFFF', 400, 'middle')
    v.rect(a, ZY + 74, b - a, 532, ZS[z], 10)

# 흐름 화살표
AY = ZY + 104
v.arrow(X0 + 6, AY, X1 - 4, MUTED, 3)
v.s.append(f'<circle cx="{X0 + JW / 2:.1f}" cy="{AY}" r="9" fill="{Z[0]}" stroke="#FFFFFF" stroke-width="3"/>')
v.rect(X0 + 8, AY + 22, JW - 16, 404, '#FFFFFF', 10)
for k, (ch, title) in enumerate(JERUSALEM):
    yy = AY + 58 + k * 52
    v.rect(X0 + 20, yy - 20, 46, 28, DARK if ch in ('4장', '7장') else Z[0], 14)  # 어두운 장 = 핍박
    v.text(X0 + 43, yy - 1, ch, 13, '#FFFFFF', 700, 'middle')
    v.text(X0 + 76, yy, title, 15, INK, 700)
gy = AY + 448
v.rect(X0 + 40, gy, JW - 80, 46, GROW, 10)
v.text(X0 + JW / 2, gy + 20, '말씀이 흥왕', 13, '#FFFFFF', 700, 'middle')
v.text(X0 + JW / 2, gy + 38, '6:7', 12, '#FFFFFF', 400, 'middle')

for i, (z, ch, title, rows, persecution, grow) in enumerate(EVENTS):
    x = cx(i)
    # 장 표시 원
    v.s.append(f'<circle cx="{x + cw / 2:.1f}" cy="{AY}" r="9" fill="{Z[z]}" stroke="#FFFFFF" stroke-width="3"/>')
    v.text(x + cw / 2, AY + 34, ch, 14, Z[z], 700, 'middle')
    # 카드
    cy = AY + 48
    v.rect(x + 4, cy, cw - 8, 220, '#FFFFFF', 10)
    t1, t2 = title.split('|')
    v.text(x + cw / 2, cy + 30, t1, 16, INK, 700, 'middle')
    v.text(x + cw / 2, cy + 52, t2, 16, INK, 700, 'middle')
    v.lines(x + cw / 2, cy + 84, rows, 12, MUTED, 400, 'middle')
    if persecution:
        v.rect(x + cw / 2 - 30, cy + 180, 60, 26, DARK, 13)
        v.text(x + cw / 2, cy + 198, '핍박', 13, '#FFFFFF', 700, 'middle')
    if grow:
        gy = AY + 448
        v.rect(x + 8, gy, cw - 16, 46, GROW, 10)
        v.text(x + cw / 2, gy + 20, '말씀이 흥왕', 13, '#FFFFFF', 700, 'middle')
        v.text(x + cw / 2, gy + 38, grow, 12, '#FFFFFF', 400, 'middle')

# 아래 설명
v.rect(X0, 760, X1 - X0, 96, '#F2F0EE', 12)
v.rect(X0 + 24, 786, 54, 26, DARK, 13)
v.text(X0 + 51, 804, '핍박', 13, '#FFFFFF', 700, 'middle')
v.text(X0 + 92, 805, '(예루살렘 칸의 어두운 장도 핍박) 핍박이 올 때마다 복음은 다음 무대로 넘어갔다 — 스데반의 순교가 사마리아로, 야고보의 순교 뒤에 땅 끝으로.', 16, INK)
v.rect(X0 + 24, 822, 54, 26, GROW, 13)
v.text(X0 + 51, 840, '흥왕', 13, '#FFFFFF', 700, 'middle')
v.text(X0 + 92, 841, '누가는 무대가 바뀔 때마다 「말씀이 흥왕하였다」로 매듭짓는다 — 6:7 · 9:31 · 12:24 · 16:5 · 19:20 · 28:31', 16, INK)
v.save('acts-18.svg')

# ---------------------------------------------------------------- 2) 사울의 길
STEPS = [
    ('다메섹 길', '회심', ['하늘의 빛', '「사울아 사울아」', '아나니아의 안수', '「택한 나의 그릇」'], '행 9:1–19', 'AD 33–35 무렵'),
    ('다메섹', '첫 전도', ['「즉시로 각 회당에서', '예수의 하나님의', '아들이심을', '전파하니」'], '행 9:20–22', ''),
    ('아라비아', '물러남', ['사도행전에는 없다', '바울이 직접 말한다', '「아라비아로', '갔다가」'], '갈 1:17', ''),
    ('다메섹', '광주리 탈출', ['유대인들이', '죽이려 하여', '밤에 광주리를 타고', '성벽을 내려가다'], '행 9:23–25', '고후 11:32–33'),
    ('예루살렘', '바나바의 소개', ['제자들이', '다 두려워함', '바나바가 사도들에게', '데려감 · 게바와 15일'], '행 9:26–29 · 갈 1:18', '회심 3년 뒤'),
    ('다소', '숨은 세월', ['헬라파 유대인이', '죽이려 하자', '형제들이 고향', '다소로 보냄'], '행 9:30 · 갈 1:21', '약 10년 가까이'),
    ('안디옥', '바나바가 찾아옴', ['「사울을 찾으러', '다소에 가서」', '1년 동안 가르침', '흉년 구제금 전달'], '행 11:25–30', 'AD 44–45 무렵'),
    ('안디옥', '파송', ['선지자 · 교사', '명단에 「및 사울」', '(13:1)', '금식하고 안수하여'], '행 13:1–3', 'AD 46–47 무렵'),
]
W2, H2 = 1600, 900
s = Svg(W2, H2)
s.text(60, 68, '회심에서 파송까지 — 사울의 길', 34, INK, 700)
s.text(60, 104, '사도행전 9–13장 · 갈라디아서 1장 · 연대는 모두 「약」', 17, MUTED)
n = len(STEPS)
gap = 26
cw = (X1 - X0 - gap * (n - 1)) / n
PLACE = {'다메섹 길': Z[1], '다메섹': Z[1], '아라비아': '#8C7B6E', '예루살렘': Z[0], '다소': '#5B6B7F', '안디옥': Z[2]}
for i, (place, what, rows, ref, when) in enumerate(STEPS):
    x = X0 + i * (cw + gap)
    c = PLACE[place]
    s.rect(x, 150, cw, 92, c, 12)
    s.text(x + cw / 2, 186, place, 21, '#FFFFFF', 700, 'middle')
    s.text(x + cw / 2, 214, what, 15, '#FFFFFF', 400, 'middle')
    s.s.append(f'<circle cx="{x + cw / 2:.1f}" cy="150" r="17" fill="#FFFFFF" stroke="{c}" stroke-width="3"/>')
    s.text(x + cw / 2, 156, str(i + 1), 16, c, 700, 'middle')
    if i < n - 1:
        s.arrow(x + cw + 3, 196, x + cw + gap - 3, MUTED, 2.5)
    s.rect(x, 258, cw, 230, '#F2F0EE', 12)
    s.lines(x + 12, 292, rows, 13, INK, 400, 'start', 1.55)
    s.text(x + 12, 410, ref, 12, c, 700)
    if when:
        s.rect(x + 12, 430, cw - 24, 32, '#FFFFFF', 16)
        s.text(x + cw / 2, 451, when, 13, MUTED, 700, 'middle')

# 바나바 강조
s.rect(X0, 520, X1 - X0, 150, '#F3E7D2', 14)
s.text(X0 + 30, 562, '두 번 길을 열어 준 사람 — 바나바', 22, Z[1], 700)
s.lines(X0 + 30, 600, [
    '① 예루살렘에서 모두 사울을 두려워할 때 「바나바가 데리고 사도들에게 가서」 그의 회심을 증언했다(행 9:27).',
    '② 다소에 묻혀 있던 사울을 「찾으러 다소에 가서」 안디옥 교회로 데려왔다(행 11:25–26). 그렇게 이방 선교의 사도가 준비되었다.',
], 16, INK, 400, 'start', 1.7)
s.rect(X0, 692, X1 - X0, 130, '#D9EAE6', 14)
s.text(X0 + 30, 734, '왜 안디옥인가', 22, Z[2], 700)
s.lines(X0 + 30, 772, [
    '스데반의 일로 흩어진 이들이 안디옥에 이르러 헬라인에게도 전했고(행 11:19–21), 제자들이 거기서 처음 「그리스도인」이라 불렸다(11:26).',
    '예루살렘이 아니라 유대인과 이방인이 함께 모인 이 교회가, 땅 끝을 향한 첫 선교사를 보냈다.',
], 16, INK, 400, 'start', 1.7)
s.save('saul-path.svg')
