"""성경맥잡기 — 요한계시록 장별 구조 (SVG)
실행: python3 scripts/bible-flow/revelation.py → content/bible-flow/out/revelation-chapters.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED = '#2A211B', '#6B5C52'

# 묶음 (이름, 장 범위, 색, 1:19 의 어느 부분)
GROUPS = [
    ('네가 본 것', 1, 1, '#9A6510'),
    ('일곱 교회', 2, 3, '#B5532F'),
    ('하늘 보좌와 어린양', 4, 5, '#2F7466'),
    ('일곱 인 — 재난의 징조', 6, 7, '#C7A15A'),
    ('일곱 나팔 — 후 3년 반의 시작', 8, 11, '#B5532F'),
    ('용과 두 짐승', 12, 14, '#8C7B6E'),
    ('일곱 대접 — 후 3년 반', 15, 16, '#64457F'),
    ('심판 — 음녀 · 짐승 · 거짓 선지자 · 사단', 17, 20, '#4A3F38'),
    ('새 하늘과 새 땅', 21, 22, '#5B6B7F'),
]
# 장, 제목, 덧붙임, 표시(인/나팔/대접/막간)
CH = [
    (1, '영광의 그리스도', '일곱 금 촛대 사이 · 「알파와 오메가」(1:8)', ''),
    (2, '에베소 · 서머나 · 버가모 · 두아디라', '「처음 사랑을 버렸느니라」(2:4) · 「죽도록 충성하라」(2:10)', ''),
    (3, '사데 · 빌라델비아 · 라오디게아', '「열린 문」(3:8) · 「문 밖에 서서 두드리노니」(3:20)', ''),
    (4, '하늘 보좌', '「이리로 올라 오라」(4:1) · 네 생물과 이십사 장로', ''),
    (5, '일곱 인 봉한 책과 어린양', '「일찍 죽임을 당한 것 같더라」(5:6) — 어린양만 책을 펴신다', ''),
    (6, '여섯 인 — 재난의 징조', '흰 말 · 붉은 말(전쟁) · 검은 말(기근) · 청황색 말(사망) · 순교자 · 큰 지진', '인'),
    (7, '인 맞은 14만 4천 · 흰 옷 입은 큰 무리', '심판 사이에 보호받는 하나님의 백성', '막간'),
    (8, '일곱째 인 → 네 나팔', '후 3년 반이 시작된다는 신호 — 땅 · 바다 · 강 · 해의 3분의 1', '나팔'),
    (9, '다섯째 · 여섯째 나팔', '무저갱의 황충 · 유브라데의 네 천사', '나팔'),
    (10, '작은 책', '「다시 예언하여야 하리라」(10:11)', '막간'),
    (11, '두 증인 · 일곱째 나팔', '「세상 나라가 우리 주와 그 그리스도의 나라가 되어」(11:15)', '나팔'),
    (12, '여자와 붉은 용', '용이 하늘에서 쫓겨나다 — 「옛 뱀 곧 마귀」(12:9)', '막간'),
    (13, '바다 짐승 · 땅 짐승', '짐승의 표 · 666', '막간'),
    (14, '어린양과 14만 4천 · 추수', '영원한 복음 · 「바벨론이 무너졌도다」', '막간'),
    (15, '일곱 대접을 가진 천사', '모세의 노래와 어린양의 노래', '대접'),
    (16, '일곱 대접', '후 3년 반에 쏟아지는 「마지막 재앙」(15:1) · 아마겟돈 · 「되었다」', '대접'),
    (17, '큰 음녀 바벨론', '「큰 음녀의 받을 심판을 네게 보이리라」(17:1)', '심판'),
    (18, '바벨론의 멸망', '「무너졌도다 무너졌도다 큰 성 바벨론이여」(18:2)', '심판'),
    (19, '재림 — 백마 탄 이', '「만왕의 왕이요 만주의 주」(19:16) · 짐승과 거짓 선지자가 유황불 못에(19:20)', '재림'),
    (20, '사단의 심판 · 크고 흰 보좌', '천 년 결박(20:2) → 불과 유황 못(20:10) · 생명책(20:12)', '심판'),
    (21, '새 하늘과 새 땅 · 새 예루살렘', '「하나님의 장막이 사람들과 함께」(21:3) · 눈물도 사망도 없다', ''),
    (22, '생명수 강과 생명나무', '「나는 알파와 오메가요」(22:13) · 「주 예수여 오시옵소서」(22:20)', ''),
]
BADGE = {'인': '#C7A15A', '나팔': '#B5532F', '대접': '#64457F', '막간': '#8C7B6E', '심판': '#4A3F38', '재림': '#2F7466'}
group_of = lambda n: next(g for g in GROUPS if g[1] <= n <= g[2])

W, H = 1600, 900
s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">', f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
def t(x, y, txt, size, color=INK, weight=400, anchor='start'):
    s.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(txt)}</text>')
def rect(x, y, w, h, fill, rx=8):
    s.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}"/>')

t(60, 64, '요한계시록 — 장별 구조', 34, INK, 700)
t(60, 98, '「네가 본 것과 이제 있는 일과 장차 될 일을 기록하라」(계 1:19)', 17, MUTED)

# 1:19 띠 (장 수 비례)
BX0, BX1, BY = 60, 1540, 120
u = (BX1 - BX0) / 22
parts = [('네가 본 것', 1, 1, '#9A6510'), ('이제 있는 일', 2, 3, '#B5532F'), ('장차 될 일', 4, 22, '#2F7466')]
for name, a, b, c in parts:
    x = BX0 + (a - 1) * u
    w = (b - a + 1) * u - 4
    rect(x, BY, w, 44, c, 10)
    t(x + w / 2, BY + 22, name, 16 if w > 100 else 13, '#FFFFFF', 700, 'middle')
    t(x + w / 2, BY + 38, f'{a}장' if a == b else f'{a}–{b}장', 12, '#FFFFFF', 400, 'middle')

# 장 목록 — 두 칸
ROW, TOP = 56, 186
for half in range(2):
    X = 60 + half * 750
    chs = CH[half * 11:(half + 1) * 11]
    # 묶음 막대
    for gname, ga, gb, gc in GROUPS:
        rows = [k for k, c in enumerate(chs) if ga <= c[0] <= gb]
        if not rows:
            continue
        y0, y1 = TOP + rows[0] * ROW, TOP + rows[-1] * ROW + ROW - 6
        rect(X, y0, 8, y1 - y0, gc, 4)
    for k, (n, title, sub, badge) in enumerate(chs):
        y = TOP + k * ROW
        gname, ga, gb, gc = group_of(n)
        rect(X + 16, y, 714, ROW - 6, '#F7F4F1' if k % 2 else '#F2EEEA', 8)
        s.append(f'<circle cx="{X + 44}" cy="{y + (ROW - 6) / 2}" r="17" fill="{gc}"/>')
        t(X + 44, y + (ROW - 6) / 2 + 6, str(n), 16, '#FFFFFF', 700, 'middle')
        t(X + 74, y + 22, title, 17, INK, 700)
        t(X + 74, y + 43, sub, 12.5, MUTED)
        if badge:
            bc = BADGE[badge]
            bw = 22 + len(badge) * 14
            rect(X + 714 - bw, y + 9, bw, 24, bc, 12)
            t(X + 714 - bw / 2, y + 26, badge, 13, '#FFFFFF', 700, 'middle')
        # 묶음 이름 — 그 묶음의 첫 장 위에
        if n == ga or (k == 0 and half == 1 and ga < n):
            pass

# 묶음 범례
lx, ly = 60, 832
for gi, (gname, ga, gb, gc) in enumerate(GROUPS):
    if gi == 5:
        lx, ly = 60, ly + 22
    rect(lx, ly, 14, 14, gc, 4)
    lab = f'{gname} ({ga}–{gb}장)' if ga != gb else f'{gname} ({ga}장)'
    t(lx + 20, ly + 12, lab, 12.5, INK, 700)
    lx += 30 + len(lab) * 12.3
ly2 = 890
lx = 60
t(lx, ly2, '세 번의 일곱 심판:', 13, MUTED, 700)
lx += 120
for b in ['인', '나팔', '대접', '막간', '심판']:
    bw = 22 + len(b) * 14
    rect(lx, ly2 - 15, bw, 20, BADGE[b], 10)
    t(lx + bw / 2, ly2, b, 12, '#FFFFFF', 700, 'middle')
    lx += bw + 8
t(lx + 6, ly2, '일곱 인 = 재난의 징조 → 일곱 나팔 = 후 3년 반의 시작 신호 → 일곱 대접 = 후 3년 반 → 심판 · 「막간」(7장, 10–11:14, 12–14장)은 그 사이 하나님의 백성', 12.5, MUTED)
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'revelation-chapters.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote revelation-chapters.svg')
