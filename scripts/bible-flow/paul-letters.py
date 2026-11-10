"""성경맥잡기 — 바울서신 13권, 시기별로 (SVG)
1차 · 2차 · 3차 전도여행 · 로마 감옥 · 로마 감옥 이후
실행: python3 scripts/bible-flow/paul-letters.py → content/bible-flow/out/paul-letters.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED = '#2A211B', '#6B5C52'
COLS = [
    ('1차 전도여행 뒤', '약 AD 48–49', '#B5532F', [('갈라디아서', '안디옥 (돌아와서)', '다른 복음은 없다 — 율법의 행위가 아니라 믿음으로 의롭게 되고, 성령을 따라 자유롭게 산다')], '남갈라디아설을 따름 — 예루살렘 회의(행 15장) 전'),
    ('2차 전도여행', '약 AD 50–51', '#2F7466', [('데살로니가전서', '고린도', '박해 속 젊은 교회를 격려 — 주님이 다시 오실 때 죽은 성도도 일어난다, 거룩하게 살라'), ('데살로니가후서', '고린도', '「주의 날이 벌써 왔다」는 말에 흔들리지 말고 일하며 선을 행하라')], '고린도에 1년 6개월 머물 때(행 18:11)'),
    ('3차 전도여행', '약 AD 55–57', '#64457F', [('고린도전서', '에베소', '분쟁 · 음행 · 소송 · 결혼 · 은사 문제에 답하고 사랑(13장)과 부활(15장)을 가르친다'), ('고린도후서', '마게도냐', '약함 속에 나타나는 하나님의 능력 — 사도직을 변호하고 화해의 직분과 연보를 말한다'), ('로마서', '고린도', '복음의 체계 — 모두가 죄인, 믿음으로 의롭다 하심, 성령 안의 새 삶, 이스라엘, 삶의 예배')], '에베소 3년 · 헬라 석 달'),
    ('로마 감옥', '약 AD 60–62', '#952B38', [('에베소서', '로마', '그리스도 안에서 받은 복(1–3장)과 그에 합당한 삶(4–6장) — 하나 된 교회, 전신갑주'), ('빌립보서', '로마', '감옥에서 쓴 기쁨의 편지 — 그리스도의 겸손을 본받고 주 안에서 항상 기뻐하라'), ('골로새서', '로마', '그리스도만으로 충분하다 — 만물의 으뜸이신 그리스도, 헛된 철학과 규례를 경계'), ('빌레몬서', '로마', '도망친 종 오네시모를 사랑받는 형제로 받아 달라는 부탁')], '옥중서신 — 셋집 2년(행 28:30)'),
    ('로마 감옥 이후', '약 AD 62–67 (전통)', '#4A3F38', [('디모데전서', '마게도냐 무렵', '거짓 교훈을 막고 예배와 직분(감독 · 집사)으로 하나님의 집을 바르게 세우라'), ('디도서', '풀려난 뒤', '그레데 교회에 장로를 세우라 — 은혜받은 사람은 선한 일에 힘쓴다'), ('디모데후서', '로마 (다시 갇힘)', '순교를 앞둔 마지막 당부 — 고난을 받으며 말씀을 전파하라, 「선한 싸움을 싸우고」')], '목회서신 — 사도행전 이후, 전통에 기댐'),
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
t(60, 68, '바울서신 13권 — 언제, 어디서 썼나', 34, INK, 700)
t(60, 104, '전도여행과 감옥을 따라 · 카드 오른쪽 위 = 쓴 곳 · 연대는 모두 「약」 · 성경에 실린 순서가 아니라 쓴 순서', 17, MUTED)
X0, X1, G = 60, 1540, 16
cw = (X1 - X0 - G * 4) / 5
# 시간 화살표
s.append(f'<line x1="{X0}" y1="150" x2="{X1 - 12}" y2="150" stroke="{MUTED}" stroke-width="3"/><path d="M{X1},150 L{X1 - 14},143 L{X1 - 14},157 Z" fill="{MUTED}"/>')
for i, (title, when, c, letters, foot) in enumerate(COLS):
    x = X0 + i * (cw + G)
    s.append(f'<circle cx="{x + cw / 2:.1f}" cy="150" r="10" fill="{c}" stroke="#FFFFFF" stroke-width="3"/>')
    s.append(f'<rect x="{x:.1f}" y="176" width="{cw:.1f}" height="74" rx="12" fill="{c}"/>')
    t(x + cw / 2, 208, title, 21, '#FFFFFF', 700, 'middle')
    t(x + cw / 2, 234, when, 14, '#FFFFFF', 400, 'middle')
    s.append(f'<text x="{x + cw / 2:.1f}" y="278" font-size="15" fill="{c}" font-weight="700" text-anchor="middle">{len(letters)}권</text>')
    y = 292
    for name, place, note in letters:
        lines = wrap(note, 20)
        h = 72 + 20 * len(lines)
        s.append(f'<rect x="{x:.1f}" y="{y}" width="{cw:.1f}" height="{h}" rx="12" fill="#F2F0EE"/>')
        ex, ey = x + 16, y + 18
        s.append(f'<rect x="{ex}" y="{ey}" width="22" height="15" rx="2" fill="{c}"/><path d="M{ex},{ey} L{ex + 11},{ey + 9} L{ex + 22},{ey}" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>')
        t(ex + 32, y + 32, name, 18, INK, 700)
        t(x + cw - 14, y + 32, place, 12.5, c, 700, 'end')
        for k, ln in enumerate(lines):
            t(x + 16, y + 60 + k * 20, ln, 13.5, INK)
        y += h + 8
    for k, ln in enumerate(wrap(foot, 19)):
        t(x + 4, 840 + k * 19, ln, 12.5, MUTED)
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'paul-letters.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote paul-letters.svg')
