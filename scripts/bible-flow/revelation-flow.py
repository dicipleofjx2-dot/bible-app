"""성경맥잡기 — 마태복음 24장 종말 강화의 흐름으로 본 요한계시록 (+ 다니엘) (SVG)
실행: python3 scripts/bible-flow/revelation-flow.py → content/bible-flow/out/revelation-flow.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED = '#2A211B', '#6B5C52'
STAGES = [
    ('재난의 징조', '#9A6510', '6–7장 일곱 인'),
    ('대환난 (후 3년 반)', '#952B38', '8–18장'),
    ('재림', '#2F7466', '19장'),
    ('휴거 (모으심)', '#5B6B7F', '14:14–16'),
    ('천년왕국', '#C7A15A', '20:1–6'),
    ('최후 심판', '#4A3F38', '20:7–15'),
    ('새 하늘과 새 땅', '#64457F', '21–22장'),
]
ROWS = [
    ('마태복음', '24–25장\n감람산 강화', [
        ('24:4–14', '「이 모든 것이 재난의 시작이니라」(24:8) — 거짓 그리스도 · 전쟁 · 기근 · 지진 · 박해'),
        ('24:15–28', '「멸망의 가증한 것」(24:15) · 「그 때에 큰 환난이 있겠음이라」(24:21)'),
        ('24:29–30', '「그 날 환난 후에 즉시」 해 · 달 · 별 — 「인자가 구름을 타고 … 오는 것을 보리라」'),
        ('24:31, 40', '「택하신 자들을 … 사방에서 모으리라」 · 「하나는 데려감을 당하고」 (살전 4:17 「구름 속으로 끌어올려」)'),
        ('(19:28)', '24–25장에는 따로 없음 — 「인자가 자기 영광의 보좌에 앉을 때에 … 너희도 열 두 보좌에 앉아」'),
        ('25:31–46', '「영광의 보좌에 앉으리니」 — 양과 염소를 분별'),
        ('24:35', '「천지는 없어지겠으나 내 말은 없어지지 아니하리라」'),
    ]),
    ('요한계시록', '1–5장 서론 뒤\n6–22장', [
        ('일곱 인 6–8:1', '재난의 징조 — 흰 말 · 붉은 말(전쟁) · 검은 말(기근) · 청황색 말(사망) · 순교자 · 해와 달과 별(6:12–13)'),
        ('나팔 → 대접 → 음녀', '나팔(8–11장) = 후 3년 반의 시작 신호 · 대접(15–16장) = 후 3년 반 · 음녀 바벨론 심판(17–18장)'),
        ('19장', '백마 탄 이 「만왕의 왕이요 만주의 주」 · 짐승과 거짓 선지자를 유황불 못에(19:20)'),
        ('14:14–16', '「구름 위에 사람의 아들과 같은 이」가 낫을 들고 땅의 곡식을 거두다'),
        ('20:1–6', '사단을 천 년 결박 · 「첫째 부활」 · 「그리스도로 더불어 천년 동안 왕노릇」(20:6)'),
        ('20:7–15', '천 년 뒤 사단이 놓였다가 불과 유황 못에(20:10) → 크고 흰 보좌 · 생명책(20:12)'),
        ('21–22장', '「새 하늘과 새 땅」(21:1) · 새 예루살렘 · 생명나무'),
    ]),
    ('다니엘', '2 · 7 · 9 · 12장', [
        ('7:3', '바다에서 나온 네 짐승 — 세상 나라들이 일어나고 무너진다'),
        ('9:27 · 7:25 · 12:1', '이레의 절반 · 「미운 물건」 · 「한 때와 두 때와 반 때」 · 「개국 이래로 … 없던 환난」'),
        ('7:13', '「인자 같은 이가 하늘 구름을 타고」'),
        ('12:1–2', '「책에 기록된 모든 자가 구원을」 · 「자는 자 중에 많이 깨어 영생을」'),
        ('7:22 · 7:18', '「때가 이르매 성도가 나라를 얻었더라」'),
        ('7:9–10', '「옛적부터 항상 계신 이가 좌정」 · 「책들이 펴 놓였더라」'),
        ('7:27', '「그의 나라는 영원한 나라이라」'),
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

t(60, 62, '요한계시록의 흐름 — 마태복음 24장 · 다니엘서와 함께', 32, INK, 700)
t(60, 94, '예수님의 종말 강화(감람산 강화)가 보여 준 순서 그대로 — 재난의 징조 → 대환난 → 재림 → 휴거 → 천년왕국 → 최후 심판 → 새 하늘과 새 땅', 16, MUTED)
LX, X0, X1 = 60, 230, 1540
G = 8
cw = (X1 - X0 - G * 6) / 7
# 단계 머리
HY = 118
s.append(f'<line x1="{X0}" y1="{HY + 30}" x2="{X1 - 10}" y2="{HY + 30}" stroke="{MUTED}" stroke-width="2"/>')
for i, (name, c, chs) in enumerate(STAGES):
    x = X0 + i * (cw + G)
    rect(x, HY, cw, 60, c, 10)
    t(x + cw / 2, HY + 27, name, 17 if len(name) < 8 else 15, '#FFFFFF', 700, 'middle')
    t(x + cw / 2, HY + 49, '계 ' + chs, 13, '#FFFFFF', 400, 'middle')
    if i < 6:
        s.append(f'<path d="M{x + cw + 1},{HY + 22} L{x + cw + G - 1},{HY + 30} L{x + cw + 1},{HY + 38} Z" fill="{MUTED}"/>')
rect(LX, HY, X0 - LX - 14, 60, '#F2F0EE', 10)
t(LX + (X0 - LX - 14) / 2, HY + 27, '계 1–5장 서론', 14, INK, 700, 'middle')
t(LX + (X0 - LX - 14) / 2, HY + 47, '그리스도 · 교회 · 보좌', 12, MUTED, 400, 'middle')
# 행
RY, RH = 192, 204
for r, (name, sub, cells) in enumerate(ROWS):
    y = RY + r * (RH + 10)
    rect(LX, y, X0 - LX - 14, RH, ['#F3E7D2', '#D9EAE6', '#E6E1EC'][r], 10)
    t(LX + 14, y + 36, name, 21, INK, 700)
    for k, ln in enumerate(sub.split('\n')):
        t(LX + 14, y + 62 + k * 20, ln, 13, MUTED)
    for i, (ref, body) in enumerate(cells):
        x = X0 + i * (cw + G)
        c = STAGES[i][1]
        rect(x, y, cw, RH, '#FFFFFF', 10, '#E3DDD7')
        rect(x, y, cw, 6, c, 3)
        t(x + 10, y + 30, ref, 14, c, 700)
        for k, ln in enumerate(wrap(body, 13)[:8]):
            t(x + 10, y + 56 + k * 19, ln, 12.5, INK)
t(60, 870, '후 3년 반 = 「마흔 두 달」(11:2, 13:5) = 「일천 이백 육십 일」(11:3, 12:6) = 「한 때와 두 때와 반 때」(12:14 · 단 7:25) — 다니엘의 「한 이레의 절반」(단 9:27)', 13, MUTED)
t(60, 890, '인 · 나팔 · 대접을 차례로 이어지는 일로 보는 해석을 따랐다(같은 일을 세 번 다른 각도로 본다는 해석도 있다). 휴거의 때는 마태복음 24장의 순서(24:29–31)를 따랐다.', 13, MUTED)
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'revelation-flow.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote revelation-flow.svg')
