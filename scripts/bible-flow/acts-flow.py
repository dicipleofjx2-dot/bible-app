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
# 무대 폭 = 그 무대의 절 수 (앱 성경 DB) — 분량을 눈으로 보이게 한다
import sqlite3
_db = sqlite3.connect(os.path.join(os.path.dirname(__file__), '../../assets/bible-data/bible.db'))
_vc = dict(_db.execute("select chapter, count(*) from verses v join books b on b.id=v.book_id "
                       "where b.name_ko='사도행전' and translation='krv' group by chapter").fetchall())
ZONES = [('예루살렘', 1, 7), ('온 유대와 사마리아', 8, 12), ('땅 끝까지', 13, 28)]
ZV = [sum(_vc[c] for c in range(a, b + 1)) for _, a, b in ZONES]

# (장, 제목, 덧붙임, 핍박?)
ROWS = [
    [('1장', '승천과 맛디아', '「땅 끝까지 … 내 증인」', False),
     ('2장', '성령 강림', '하루에 3천 명', False),
     ('3장', '앉은뱅이 치유', '미문 앞', False),
     ('4장', '핍박과 부흥', '5천 명 회심', True),
     ('5장', '아나니아와 삽비라', '', False),
     ('6장', '일곱 사람(집사) 세움', '', False),
     ('7장', '스데반의 설교와 순교', '', True)],
    [('8장', '핍박 → 사마리아', '빌립 · 에디오피아 내시', True),
     ('9장', '사울의 회심', '베드로의 온 유대 사역', False),
     ('10장', '고넬료의 집', '이방 선교의 신학', False),
     ('11장', '안디옥 교회', '처음 「그리스도인」', False),
     ('12장', '야고보의 순교', '베드로 투옥 · 헤롯의 죽음', True)],
    [('13장', '안디옥 교회의 파송', '바나바와 사울', False),
     ('13–14장', '1차 전도여행', '구브로 · 갈라디아 — 루스드라에서 돌에 맞음', True),
     ('15장', '예루살렘 회의', '이방인은 할례 없이 믿음으로', False),
     ('16–18장', '2차 전도여행 — 유럽으로', '빌립보 투옥 · 데살로니가 · 아덴 · 고린도', True),
     ('19–21장', '3차 전도여행', '에베소 3년 · 예루살렘으로', False),
     ('21–26장', '체포와 변론', '벨릭스 · 베스도 · 아그립바 앞에서', True),
     ('27–28장', '로마로', '난파 · 셋집 2년 · 「금하는 사람이 없었더라」', False)],
]
GROWS = [['6:7'], ['9:31', '12:24'], ['16:5', '19:20', '28:31']]

W, H = 1600, 900
v = Svg(W, H)
v.text(60, 68, '사도행전 1:8 — 복음이 퍼져 나간 길', 34, INK, 700)
v.text(60, 104, '「예루살렘과 온 유대와 사마리아 땅 끝까지 이르러 내 증인이 되리라」 · 칸의 폭 = 분량(절 수)', 17, MUTED)

X0, X1 = 60, 1540
gap = 14
avail = X1 - X0 - gap * 2
xs = []
x = X0
for z in range(3):
    w = avail * ZV[z] / sum(ZV)
    xs.append((x, x + w))
    x += w + gap

ZY = 140
for z, (name, a, b) in enumerate(ZONES):
    l, r = xs[z]
    pct = round(ZV[z] / sum(ZV) * 100)
    v.rect(l, ZY, r - l, 74, Z[z], 10)
    v.text((l + r) / 2, ZY + 32, name, 22, '#FFFFFF', 700, 'middle')
    v.text((l + r) / 2, ZY + 58, f'{a}–{b}장 · {ZV[z]}절 · 전체의 {pct}%', 14, '#FFFFFF', 400, 'middle')
    v.rect(l, ZY + 84, r - l, 610, ZS[z], 10)
    rows = ROWS[z]
    rh = 66
    for k, (ch, title, sub, pers) in enumerate(rows):
        y = ZY + 102 + k * (rh + 8)
        v.rect(l + 10, y, r - l - 20, rh, '#FFFFFF', 10)
        pw = 64 if len(ch) > 3 else 46
        v.rect(l + 22, y + 19, pw, 28, DARK if pers else Z[z], 14)
        v.text(l + 22 + pw / 2, y + 38, ch, 13, '#FFFFFF', 700, 'middle')
        tx = l + 22 + pw + 12
        if sub:
            v.text(tx, y + 29, title, 16, INK, 700)
            v.text(tx, y + 50, sub, 12.5, MUTED)
        else:
            v.text(tx, y + 40, title, 16, INK, 700)
    gx = l + 10
    gw = (r - l - 20 - 8 * (len(GROWS[z]) - 1)) / len(GROWS[z])
    for k, ref in enumerate(GROWS[z]):
        v.rect(gx + k * (gw + 8), ZY + 640, gw, 42, GROW, 10)
        v.text(gx + k * (gw + 8) + gw / 2, ZY + 667, f'말씀이 흥왕 {ref}', 13, '#FFFFFF', 700, 'middle')

v.rect(X0, 846, X1 - X0, 40, '#F2F0EE', 10)
v.rect(X0 + 16, 853, 46, 26, DARK, 13)
v.text(X0 + 39, 871, '장', 13, '#FFFFFF', 700, 'middle')
v.text(X0 + 74, 872, '어두운 장 = 핍박. 핍박이 올 때마다 복음은 다음 무대로 넘어갔다 · 누가는 무대마다 「말씀이 흥왕하였다」로 매듭짓는다', 15, INK)
v.save('acts-18.svg')

# ---------------------------------------------------------------- 2) 사울의 길
STEPS = [
    ('다메섹 길', '회심', ['하늘의 빛', '「사울아 사울아」', '아나니아의 안수', '「택한 나의 그릇」'], '행 9:1–19', '사흘 (9:9)'),
    ('다메섹', '첫 전도', ['「즉시로 각 회당에서', '예수의 하나님의', '아들이심을', '전파하니」'], '행 9:20–22', '며칠 (9:19)'),
    ('아라비아', '물러남', ['사도행전에는 없다', '바울이 직접 말한다', '「아라비아로', '갔다가」'], '갈 1:17', '기간 미상'),
    ('다메섹', '광주리 탈출', ['유대인들이', '죽이려 하여', '밤에 광주리를 타고', '성벽을 내려가다'], '행 9:23–25 · 고후 11:32–33', '여러 날 (9:23)'),
    ('예루살렘', '바나바의 소개', ['제자들이', '다 두려워함', '바나바가 사도들에게', '데려감 · 게바와 15일'], '행 9:26–29 · 갈 1:18', '15일 (갈 1:18)'),
    ('다소', '숨은 세월', ['헬라파 유대인이', '죽이려 하자', '형제들이 고향', '다소로 보냄'], '행 9:30 · 갈 1:21', '약 8–10년'),
    ('안디옥', '바나바가 찾아옴', ['「사울을 찾으러', '다소에 가서」', '1년 동안 가르침', '흉년 구제금 전달'], '행 11:25–30', '1년 (11:26)'),
    ('안디옥', '파송', ['선지자 · 교사', '명단에 「및 사울」', '(13:1)', '금식하고 안수하여'], '행 13:1–3', 'AD 46–47'),
]
X0, X1 = 60, 1540
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
    s.rect(x, 258, cw, 214, '#F2F0EE', 12)
    s.lines(x + 12, 292, rows, 13, INK, 400, 'start', 1.55)
    s.text(x + 12, 398, ref, 12, c, 700)
    s.rect(x + 12, 418, cw - 24, 34, c, 17)
    s.text(x + cw / 2, 440, when, 14, '#FFFFFF', 700, 'middle')

# 연도 막대
Y0Y, Y1Y = 32, 48
yx = lambda y: X0 + (y - Y0Y) / (Y1Y - Y0Y) * (X1 - X0)
BY = 500
s.text(X0, BY + 4, '기간 (AD, 약)', 15, MUTED, 700)
for y in range(Y0Y, Y1Y + 1, 2):
    s.s.append(f'<line x1="{yx(y):.1f}" y1="{BY + 14}" x2="{yx(y):.1f}" y2="{BY + 76}" stroke="#E3DDD7" stroke-width="1"/>')
    s.text(yx(y), BY + 96, f'AD {y}', 12, MUTED, 400, 'middle')
BAR = [
    (33, 36, '다메섹 · 아라비아 · 다메섹', '약 3년 (갈 1:18 「삼년만에」)', Z[1]),
    (36, 36.4, '', '', Z[0]),
    (36.4, 44, '다소 — 숨은 세월', '약 8–10년 — 사도행전이 침묵하는 시간', '#5B6B7F'),
    (44, 46, '안디옥', '1년 가르침 · 구제 (11:26, 30)', Z[2]),
    (46, 47, '', '', '#1E5247'),
]
for a, b, label, sub, c in BAR:
    s.rect(yx(a), BY + 22, yx(b) - yx(a) - 2, 46, c, 8)
    if label:
        s.text((yx(a) + yx(b)) / 2, BY + 42, label, 14, '#FFFFFF', 700, 'middle')
        s.text((yx(a) + yx(b)) / 2, BY + 60, sub, 11.5, '#FFFFFF', 400, 'middle')
s.text(yx(36.2), BY + 14, '예루살렘 15일', 12, Z[0], 700, 'middle')
s.text(yx(46.5), BY + 14, '파송', 12, '#1E5247', 700, 'middle')

# 바나바 강조
s.rect(X0, 620, X1 - X0, 120, '#F3E7D2', 14)
s.text(X0 + 30, 656, '두 번 길을 열어 준 사람 — 바나바', 20, Z[1], 700)
s.lines(X0 + 30, 690, [
    '① 예루살렘에서 모두 사울을 두려워할 때 「바나바가 데리고 사도들에게 가서」 그의 회심을 증언했다(행 9:27).',
    '② 다소에 묻혀 있던 사울을 「찾으러 다소에 가서」 안디옥 교회로 데려왔다(행 11:25–26). 그렇게 이방 선교의 사도가 준비되었다.',
], 15, INK, 400, 'start', 1.7)
s.rect(X0, 756, X1 - X0, 120, '#D9EAE6', 14)
s.text(X0 + 30, 792, '왜 안디옥인가', 20, Z[2], 700)
s.lines(X0 + 30, 826, [
    '스데반의 일로 흩어진 이들이 안디옥에 이르러 헬라인에게도 전했고(행 11:19–21), 제자들이 거기서 처음 「그리스도인」이라 불렸다(11:26).',
    '예루살렘이 아니라 유대인과 이방인이 함께 모인 이 교회가, 땅 끝을 향한 첫 선교사를 보냈다.',
], 15, INK, 400, 'start', 1.7)
s.save('saul-path.svg')
