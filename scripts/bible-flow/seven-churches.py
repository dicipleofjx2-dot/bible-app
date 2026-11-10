"""성경맥잡기 — 일곱 교회의 환상과 편지 (계 1–3장) (SVG)
실행: python3 scripts/bible-flow/seven-churches.py → content/bible-flow/out/seven-churches.svg
"""
import os, html, math
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED, GOLD = '#2A211B', '#6B5C52', '#B8860B'
PRAISE, REBUKE, PROMISE = '#2F7466', '#952B38', '#9A6510'
CH = [
    ('에베소', '일곱 별을 붙잡고 일곱 금촛대 사이에 다니시는 이(2:1)', '수고 · 인내 · 거짓 사도를 드러냄(2:2)', '「처음 사랑을 버렸느니라」(2:4)', '생명나무의 과실(2:7)'),
    ('서머나', '처음이요 나중이요 죽었다가 살아나신 이(2:8)', '「환난과 궁핍 … 실상은 네가 부요한 자」(2:9)', '없음 — 「죽도록 충성하라」(2:10)', '둘째 사망의 해를 받지 않음(2:11)'),
    ('버가모', '좌우에 날선 검을 가진 이(2:12)', '「사단의 위가 있는 데」서도 믿음을 지킴(2:13)', '발람의 교훈 · 우상의 제물(2:14)', '감추었던 만나 · 흰 돌 · 새 이름(2:17)'),
    ('두아디라', '눈이 불꽃 같은 하나님의 아들(2:18)', '「나중 행위가 처음 것보다 많도다」(2:19)', '「여자 이세벨을 네가 용납함」(2:20)', '만국을 다스리는 권세(2:26)'),
    ('사데', '하나님의 일곱 영과 일곱 별을 가진 이(3:1)', '옷을 더럽히지 않은 「몇 명」(3:4)', '「살았다 하는 이름은 가졌으나 죽은 자로다」(3:1)', '흰 옷 · 생명책에서 지우지 않음(3:5)'),
    ('빌라델비아', '다윗의 열쇠를 가지신 이(3:7)', '「적은 능력을 가지고도 내 말을 지키며」(3:8)', '없음 — 「열린 문」(3:8)', '하나님 성전의 기둥 · 새 예루살렘의 이름(3:12)'),
    ('라오디게아', '아멘이시요 충성되고 참된 증인(3:14)', '없음', '「차지도 아니하고 더웁지도 아니하도다」(3:15)', '「내 보좌에 함께 앉게」(3:21)'),
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

t(60, 60, '일곱 교회의 환상과 편지 — 요한계시록 1–3장', 32, INK, 700)
t(60, 92, '「네 본 것은 … 일곱 별은 일곱 교회의 사자요 일곱 촛대는 일곱 교회니라」(1:20)', 16, MUTED)

# ---- 환상 풀이
X = 60
rect(X, 112, 1480, 300, '#F7F4F1', 16)
t(X + 24, 148, '환상의 뜻', 20, INK, 700)
lines = [
    ('일곱 금 촛대', '= 일곱 교회 (1:20)'),
    ('일곱 별', '= 일곱 교회의 사자 (1:20)'),
    ('촛대 사이의 인자 같은 이', '= 영광의 그리스도 — 「처음이요 나중이니 곧 산 자라」(1:17–18)'),
]
y = 188
for a, b in lines:
    t(X + 24, y, a, 16, GOLD, 700)
    t(X + 270, y, b, 15, INK)
    y += 34
for k, ln in enumerate([
    '→ 영광의 그리스도께서 교회들 한가운데를 다니시며 교회를 붙들고 계신다.',
    '→ 하늘 보좌(4장)와 두루마리(5장)를 보기 전에, 먼저 땅의 교회를 살피시는 주님을 본다.',
    '→ 일곱 편지는 모두 1장 환상 속 그리스도의 모습 하나로 시작해, 이기는 자에게 주시는 약속으로 끝난다.',
]):
    t(X + 24, 310 + k * 30, ln, 15, INK, 700 if k == 0 else 400)

# ---- 일곱 편지 카드
X0, X1, G = 60, 1540, 10
cw = (X1 - X0 - G * 6) / 7
TOP = 432
labels = [('그리스도', '#B8860B'), ('칭찬', PRAISE), ('책망', REBUKE), ('이기는 자에게', PROMISE)]
for i, (name, christ, praise, rebuke, promise) in enumerate(CH):
    x = X0 + i * (cw + G)
    rect(x, TOP, cw, 446, '#F7F4F1', 12, '#E3DDD7')
    rect(x, TOP, cw, 44, '#2A2F3F', 12)
    rect(x, TOP + 30, cw, 14, '#2A2F3F', 0)
    s.append(f'<circle cx="{x + 22}" cy="{TOP + 22}" r="12" fill="{GOLD}"/>')
    t(x + 22, TOP + 27, str(i + 1), 13, '#2A2F3F', 700, 'middle')
    t(x + 42, TOP + 29, name, 17, '#FFFFFF', 700)
    y = TOP + 70
    for (lab, c), body in zip(labels, [christ, praise, rebuke, promise]):
        t(x + 12, y, lab, 12.5, c, 700)
        y += 20
        none = body.startswith('없음')
        for ln in wrap(body, 13)[:5]:
            t(x + 12, y, ln, 13, c if none else INK, 700 if none else 400)
            y += 18
        y += 14
t(60, 896, '책망이 없는 교회 둘(서머나 · 빌라델비아) · 칭찬이 없는 교회 하나(라오디게아) · 이기는 자에게 주신 약속(생명나무 · 새 이름 · 흰 옷 · 생명책 · 새 예루살렘 · 보좌)은 21–22장에서 이루어진다', 12.5, MUTED)
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'seven-churches.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote seven-churches.svg')
