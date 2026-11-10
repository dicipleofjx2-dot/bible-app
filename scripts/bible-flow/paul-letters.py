"""성경맥잡기 — 바울서신 13권, 시기별로 (SVG)
1차 · 2차 · 3차 전도여행 · 로마 감옥 · 로마 감옥 이후
실행: python3 scripts/bible-flow/paul-letters.py → content/bible-flow/out/paul-letters.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED = '#2A211B', '#6B5C52'
COLS = [
    ('1차 전도여행 뒤', '약 AD 48–49', '#B5532F', [('갈라디아서 *', '안디옥', '복음의 자유 — 「다른 복음은 없다」')], '* 남갈라디아설. 북갈라디아설이면 3차 여행 중(에베소 · 마게도냐)'),
    ('2차 전도여행', '약 AD 50–51', '#2F7466', [('데살로니가전서', '고린도', '재림의 소망 — 디모데의 소식을 듣고(살전 3:6)'), ('데살로니가후서', '고린도', '재림을 기다리며 일상을 지키라')], '고린도에 1년 6개월 머물 때(행 18:11)'),
    ('3차 전도여행', '약 AD 55–57', '#64457F', [('고린도전서', '에베소', '「오순절까지 에베소에 유하려 함은」(고전 16:8)'), ('고린도후서', '마게도냐', '「마게도냐에 이르렀을 때에도」(고후 7:5)'), ('로마서', '고린도', '겐그레아의 뵈뵈를 천거(롬 16:1) · 행 20:2–3')], '에베소 3년 · 헬라 석 달'),
    ('로마 감옥', '약 AD 60–62', '#952B38', [('에베소서', '로마', '「쇠사슬에 매인 사신」(엡 6:20)'), ('빌립보서', '로마', '「가이사 집 사람 중 몇」(빌 4:22)'), ('골로새서', '로마', '두기고 · 오네시모 편에(골 4:7–9)'), ('빌레몬서', '로마', '「갇힌 자 되어」(몬 1:9)')], '옥중서신 — 셋집 2년(행 28:30)'),
    ('로마 감옥 이후', '약 AD 62–67 (전통)', '#4A3F38', [('디모데전서', '마게도냐 무렵', '풀려난 뒤 — 에베소의 디모데에게(딤전 1:3)'), ('디도서', '풀려난 뒤', '그레데의 디도에게 — 니고볼리에서 겨울을 나려 함(딛 3:12)'), ('디모데후서', '로마 (다시 갇힘)', '마지막 편지 — 「관제와 같이 … 떠날 기약이 가까왔도다」(딤후 4:6)')], '목회서신 — 사도행전 이후, 전통에 기댐'),
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
t(60, 104, '전도여행과 감옥을 따라 · 연대는 모두 「약」 · 성경에 실린 순서가 아니라 쓴 순서', 17, MUTED)
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
    s.append(f'<text x="{x + cw / 2:.1f}" y="282" font-size="15" fill="{c}" font-weight="700" text-anchor="middle">{len(letters)}권</text>')
    y = 300
    for name, place, note in letters:
        lines = wrap(note, 17)
        h = 76 + 19 * len(lines)
        s.append(f'<rect x="{x:.1f}" y="{y}" width="{cw:.1f}" height="{h}" rx="12" fill="#F2F0EE"/>')
        ex, ey = x + 16, y + 20
        s.append(f'<rect x="{ex}" y="{ey}" width="22" height="15" rx="2" fill="{c}"/><path d="M{ex},{ey} L{ex + 11},{ey + 9} L{ex + 22},{ey}" fill="none" stroke="#FFFFFF" stroke-width="1.6"/>')
        t(ex + 32, y + 34, name, 18, INK, 700)
        t(x + 16, y + 60, '📍 ' + place if False else '쓴 곳 — ' + place, 14, c, 700)
        for k, ln in enumerate(lines):
            t(x + 16, y + 84 + k * 19, ln, 13, MUTED)
        y += h + 10
    for k, ln in enumerate(wrap(foot, 19)):
        t(x + 4, 840 + k * 19, ln, 12.5, MUTED)
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'paul-letters.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote paul-letters.svg')
