"""성경맥잡기 — 로마 황제들의 왕조 가계도 (SVG)
율리우스–클라우디우스 · 플라비우스 · 오현제. 실선 = 낳음, 점선 = 양자, 두 줄 = 혼인.
실행: python3 scripts/bible-flow/rome-dynasty.py → content/bible-flow/out/rome-dynasty.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED, EMP, BIBLE, LINE = '#2A211B', '#6B5C52', '#952B38', '#2F7466', '#8C7B6E'
FLAV = '#5B6B7F'
W, H = 1600, 900
s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">', f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
def t(x, y, txt, size, color=INK, weight=400, anchor='middle'):
    s.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{html.escape(txt)}</text>')
def line(x1, y1, x2, y2, dash=False, color=LINE, w=2.2):
    d = ' stroke-dasharray="7 5"' if dash else ''
    s.append(f'<path d="M{x1},{y1} L{x2},{y2}" stroke="{color}" stroke-width="{w}" fill="none"{d}/>')
def elbow(x1, y1, x2, y2, dash=False, color=LINE):
    my = (y1 + y2) / 2
    d = ' stroke-dasharray="7 5"' if dash else ''
    s.append(f'<path d="M{x1},{y1} L{x1},{my} L{x2},{my} L{x2},{y2}" stroke="{color}" stroke-width="2.2" fill="none"{d}/>')
def marry(x1, x2, y):
    s.append(f'<path d="M{x1},{y - 3} L{x2},{y - 3} M{x1},{y + 3} L{x2},{y + 3}" stroke="{LINE}" stroke-width="1.6"/>')

NW, NH = 168, 58
def node(x, y, name, sub='', emp=None, color=EMP, bible='', w=NW):
    if emp:
        s.append(f'<rect x="{x - w / 2}" y="{y - NH / 2}" width="{w}" height="{NH}" rx="12" fill="{color}"/>')
        s.append(f'<circle cx="{x - w / 2 + 2}" cy="{y - NH / 2 + 2}" r="15" fill="#FFFFFF" stroke="{color}" stroke-width="3"/>')
        t(x - w / 2 + 2, y - NH / 2 + 8, str(emp), 15, color, 700)
        t(x, y - 3, name, 18, '#FFFFFF', 700)
        t(x, y + 18, sub, 12, '#FFFFFF')
    else:
        s.append(f'<rect x="{x - w / 2}" y="{y - NH / 2}" width="{w}" height="{NH}" rx="12" fill="#FFFFFF" stroke="{LINE}" stroke-width="1.8"/>')
        t(x, y - 3, name, 16, INK, 700)
        t(x, y + 17, sub, 11.5, MUTED)
    if bible:
        t(x, y + NH / 2 + 18, bible, 12.5, BIBLE, 700)

t(60, 60, '로마 황제들의 왕조 — 가계도', 32, INK, 700, 'start')
t(60, 92, '붉은 칸 = 황제(번호 = 즉위 순서) · 실선 = 낳음 · 점선 = 양자 · 두 줄 = 혼인 · 초록 = 신약과 닿는 곳', 15, MUTED, 400, 'start')

# ---------------- 율리우스–클라우디우스 (왼쪽)
s.append(f'<rect x="40" y="112" width="1010" height="770" rx="16" fill="#FBF7F4"/>')
t(60, 142, '율리우스–클라우디우스 왕조  BC 27 – AD 68', 20, EMP, 700, 'start')
t(60, 164, '율리우스(카이사르) 집안 + 클라우디우스(리비아의 첫 남편) 집안이 혼인과 입양으로 얽힘', 13, MUTED, 400, 'start')

Y1, Y2, Y3, Y4, Y5, Y6 = 215, 330, 450, 575, 700, 815
# 1대
node(200, Y1, '율리우스 카이사르', '독재관 · BC 44 암살')
# 2대
node(200, Y2, '아우구스투스', 'BC 27 – AD 14', 1, bible='눅 2:1 예수님 탄생')
line(200, Y1 + NH / 2, 200, Y2 - NH / 2, dash=True)
t(212, (Y1 + Y2) / 2 + 4, '양자 (누이의 손자)', 12, MUTED, 400, 'start')
node(500, Y2, '리비아', '아우구스투스의 아내')
marry(200 + NW / 2, 500 - NW / 2, Y2)
node(800, Y2, '티베리우스 클라우디우스 네로', '리비아의 첫 남편', w=230)
marry(500 + NW / 2, 800 - 115, Y2)
# 3대
node(110, Y3, '율리아', '아우구스투스의 딸', w=150)
elbow(140, Y2 + NH / 2, 110, Y3 - NH / 2)
node(290, Y3, '아그리파', '아우구스투스의 측근', w=150)
marry(110 + 75, 290 - 75, Y3)
node(560, Y3, '티베리우스', 'AD 14 – 37', 2, bible='눅 3:1 세례 요한 · 십자가')
elbow(650, Y2 + NH / 2, 560, Y3 - NH / 2)          # 리비아 · 첫 남편 → 티베리우스
line(200 + NW / 2, Y2 + 12, 560 - 60, Y3 - NH / 2, dash=True)   # 아우구스투스 → 티베리우스 양자
t(420, Y3 - 66, '양자', 12, MUTED)
node(790, Y3, '대 드루수스', '티베리우스의 동생', w=150)
elbow(650, Y2 + NH / 2, 790, Y3 - NH / 2)
node(960, Y3, '안토니아', '안토니우스의 딸', w=150)
marry(790 + 75, 960 - 75, Y3)
# 4대
node(200, Y4, '대 아그리피나', '아우구스투스의 손녀')
elbow(200, Y3 + NH / 2, 200, Y4 - NH / 2)
node(520, Y4, '게르마니쿠스', '티베리우스의 조카 · 양자')
elbow(875, Y3 + NH / 2, 520, Y4 - NH / 2)
line(560, Y3 + NH / 2 + 26, 560, Y4 - NH / 2, dash=True)
t(572, Y4 - NH / 2 - 8, '양자', 12, MUTED, 400, 'start')
marry(200 + NW / 2, 520 - NW / 2, Y4)
node(900, Y4, '클라우디우스', 'AD 41 – 54', 4, bible='행 11:28 흉년 · 18:2 유대인 추방')
elbow(875, Y3 + NH / 2, 900, Y4 - NH / 2)
# 5대
node(250, Y5, '칼리굴라', 'AD 37 – 41', 3, bible='(신약에 나오지 않음)')
elbow(360, Y4 + NH / 2, 250, Y5 - NH / 2)
node(560, Y5, '소 아그리피나', '네로의 어머니')
elbow(360, Y4 + NH / 2, 560, Y5 - NH / 2)
marry(560 + NW / 2, 1030, Y5)
line(1030, Y5 + 3, 1030, Y4, color=LINE, w=1.6)
line(1030, Y4, 900 + NW / 2, Y4, color=LINE, w=1.6)
t(700, Y5 - 10, '재혼 (숙부와)', 12, MUTED)
# 6대
node(560, Y6, '네로', 'AD 54 – 68', 5, bible='행 25:11 「가이사께 호소」 · 박해')
line(560, Y5 + NH / 2, 560, Y6 - NH / 2)
line(1010, Y5 + 8, 560 + NW / 2, Y6 - 6, dash=True)
t(880, Y6 - 30, '클라우디우스의 양자', 12, MUTED, 400, 'start')
t(60, 872, 'AD 68 네로가 죽으며 핏줄이 끊김 → AD 69 「네 황제의 해」', 13, MUTED, 400, 'start')

# ---------------- 오른쪽: 네 황제의 해 · 플라비우스 · 오현제
RX = 1075
s.append(f'<rect x="{RX}" y="112" width="485" height="190" rx="16" fill="#F2F0EE"/>')
t(RX + 20, 142, '네 황제의 해  AD 69', 18, INK, 700, 'start')
xs = [RX + 70, RX + 185, RX + 300, RX + 415]
for i, (n, sub) in enumerate([('갈바', '7개월'), ('오토', '3개월'), ('비텔리우스', '8개월'), ('베스파시아누스', '승리')]):
    x = xs[i]
    c = FLAV if i == 3 else '#FFFFFF'
    s.append(f'<rect x="{x - 52}" y="170" width="104" height="52" rx="10" fill="{c}" stroke="{LINE}" stroke-width="1.5"/>')
    t(x, 193, n, 14 if len(n) < 6 else 12.5, '#FFFFFF' if i == 3 else INK, 700)
    t(x, 212, sub, 11.5, '#FFFFFF' if i == 3 else MUTED)
    if i < 3:
        s.append(f'<path d="M{x + 54},196 L{x + 61},196" stroke="{MUTED}" stroke-width="2"/>')
t(RX + 20, 252, '한 해에 황제가 넷 — 내전 끝에', 13, MUTED, 400, 'start')
t(RX + 20, 272, '유대 전쟁을 지휘하던 베스파시아누스가 이김', 13, MUTED, 400, 'start')

s.append(f'<rect x="{RX}" y="318" width="485" height="300" rx="16" fill="#EEF1F5"/>')
t(RX + 20, 348, '플라비우스 왕조  AD 69 – 96', 18, FLAV, 700, 'start')
t(RX + 20, 368, '베스파시아누스의 집안 이름 — 아버지와 두 아들', 13, MUTED, 400, 'start')
node(RX + 242, 420, '베스파시아누스', 'AD 69 – 79', 6, FLAV, bible='콜로세움 착공', w=190)
node(RX + 125, 545, '티투스', 'AD 79 – 81 (큰아들)', 7, FLAV, bible='AD 70 성전 파괴', w=190)
node(RX + 360, 545, '도미티아누스', 'AD 81 – 96 (작은아들)', 8, FLAV, bible='요한계시록 (전통)', w=190)
elbow(RX + 242, 420 + NH / 2 + 24, RX + 125, 545 - NH / 2)
elbow(RX + 242, 420 + NH / 2 + 24, RX + 360, 545 - NH / 2)

s.append(f'<rect x="{RX}" y="634" width="485" height="248" rx="16" fill="#F3E7D2"/>')
t(RX + 20, 664, '오현제 (네르바–안토니누스)  AD 96 – 180', 18, '#9A6510', 700, 'start')
t(RX + 20, 684, '핏줄이 아니라 유능한 사람을 양자로 — 제국의 전성기', 13, MUTED, 400, 'start')
five = [('네르바', '96–98'), ('트라야누스', '98–117'), ('하드리아누스', '117–138'), ('안토니누스 피우스', '138–161'), ('마르쿠스 아우렐리우스', '161–180')]
for i, (n, yr) in enumerate(five):
    y = 712 + i * 32
    s.append(f'<rect x="{RX + 30}" y="{y}" width="300" height="26" rx="8" fill="#FFFFFF" stroke="#C7A15A"/>')
    t(RX + 44, y + 18, n, 14, INK, 700, 'start')
    t(RX + 320, y + 18, 'AD ' + yr, 12.5, MUTED, 400, 'end')
    if i < 4:
        line(RX + 345, y + 13, RX + 345, y + 32 + 13, dash=True, color='#9A6510')
t(RX + 360, 780, '모두 양자로', 13, '#9A6510', 700, 'start')
t(RX + 360, 800, '이어짐', 13, '#9A6510', 700, 'start')
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'rome-dynasty.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote rome-dynasty.svg')
