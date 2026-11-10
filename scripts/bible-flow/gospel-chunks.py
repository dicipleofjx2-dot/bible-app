"""성경맥잡기 — 스토리 청크로 본 네 복음서 (SVG)

막대 길이 = 절 수 (앱 성경 DB 에서 직접 센다). 청크 경계는 teaching.md 의 「스토리 청크별 4복음서 범위」 표와 같다.
실행: python3 scripts/bible-flow/gospel-chunks.py  → content/bible-flow/out/gospel-chunks.svg
PNG: node 로 playwright 를 써서 굽는다(README 참고).
"""
import os, sqlite3, html

ROOT = os.path.join(os.path.dirname(__file__), '../..')
OUT = os.path.join(ROOT, 'content/bible-flow/out')
DB = sqlite3.connect(os.path.join(ROOT, 'assets/bible-data/bible.db'))

CHUNKS = ['탄생', '세례 요한', '갈릴리 사역', '오병이어', '수난 예고', '예루살렘 사역', '십자가와 부활']
COLORS = ['#C7A15A', '#8C7B6E', '#5B8A72', '#3E7C9A', '#B5532F', '#64457F', '#952B38']
PROLOGUE = '#D9D2CB'

# (책, [(청크 번호 1–7 또는 0=서언, 시작 장, 시작 절), ...])
GOSPELS = [
    ('마태복음', [(1, 1, 1), (2, 3, 1), (3, 4, 12), (4, 14, 1), (5, 16, 13), (6, 21, 1), (7, 26, 36)]),
    ('마가복음', [(2, 1, 1), (3, 1, 14), (4, 6, 14), (5, 8, 27), (6, 11, 1), (7, 14, 32)]),
    ('누가복음', [(1, 1, 1), (2, 3, 1), (3, 4, 14), (4, 9, 10), (5, 9, 18), (6, 19, 28), (7, 22, 39)]),
    ('요한복음', [(0, 1, 1), (2, 1, 19), (3, 2, 1), (4, 6, 1), (5, 7, 1), (6, 12, 1), (7, 18, 1)]),
]


def verses(book):
    return DB.execute(
        "select chapter, verse from verses v join books b on b.id=v.book_id "
        "where b.name_ko=? and translation='krv' order by chapter, verse", (book,)).fetchall()


def segments(book, starts):
    vs = verses(book)
    idx = {cv: i for i, cv in enumerate(vs)}
    pos = [idx[(c, v)] for _, c, v in starts] + [len(vs)]
    return [(starts[i][0], pos[i + 1] - pos[i]) for i in range(len(starts))], len(vs)


data = [(name, *segments(name, st)) for name, st in GOSPELS]

W, H = 1600, 900
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
X0, X1 = 200, 1540
MAXV = max(total for _, _, total in data)
scale = (X1 - X0) / MAXV
s = []
a = s.append
esc = html.escape


def t(x, y, txt, size=16, color='#2A211B', weight=400, anchor='start'):
    a(f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{esc(txt)}</text>')


a(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">')
a(f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>')
t(60, 70, '스토리 청크로 본 네 복음서', 36, '#2A211B', 700)
t(60, 106, '막대 길이 = 절 수 · 칸 안의 숫자 = 그 복음서에서 차지하는 비율', 17, '#6B5C52')

# 범례
lx = 60
for i, name in enumerate(CHUNKS):
    a(f'<rect x="{lx}" y="140" width="26" height="26" rx="6" fill="{COLORS[i]}"/>')
    t(lx + 13, 159, str(i + 1), 15, '#FFFFFF', 700, 'middle')
    t(lx + 34, 159, name, 17, '#2A211B', 700)
    lx += 34 + len(name) * 17 + 36

ROW0, ROWH, BARH = 230, 160, 78
for r, (name, segs, total) in enumerate(data):
    y = ROW0 + r * ROWH
    t(60, y + BARH / 2 + 8, name, 24, '#2A211B', 700)
    t(60, y + BARH / 2 + 32, f'{total}절', 14, '#6B5C52')
    x = X0
    for chunk, n in segs:
        w = n * scale
        color = PROLOGUE if chunk == 0 else COLORS[chunk - 1]
        a(f'<rect x="{x:.1f}" y="{y}" width="{w - 2:.1f}" height="{BARH}" rx="6" fill="{color}"/>')
        pct = round(n / total * 100)
        if chunk and w > 46:
            t(x + w / 2 - 1, y + 34, str(chunk), 20, '#FFFFFF', 700, 'middle')
            t(x + w / 2 - 1, y + 58, f'{pct}%', 15, '#FFFFFF', 400, 'middle')
        elif chunk:
            t(x + w / 2 - 1, y + 46, str(chunk), 15, '#FFFFFF', 700, 'middle')
        x += w
    if name == '요한복음':
        # 서언 표시
        t(X0 + segs[0][1] * scale / 2, y + BARH + 22, '서언', 13, '#6B5C52', 400, 'middle')


def bracket(row, chunk_from, chunk_to, label, sub, color):
    name, segs, total = data[row]
    x = X0
    xs = xe = None
    n_sum = 0
    for chunk, n in segs:
        if chunk == chunk_from and xs is None:
            xs = x
        if chunk_from <= chunk <= chunk_to:
            n_sum += n
        x += n * scale
        if chunk == chunk_to:
            xe = x - 2
    y = ROW0 + row * ROWH + BARH + 12
    a(f'<path d="M{xs:.1f},{y} L{xs:.1f},{y + 10} L{xe:.1f},{y + 10} L{xe:.1f},{y}" fill="none" stroke="{color}" stroke-width="3"/>')
    pct = round(n_sum / total * 100)
    t((xs + xe) / 2, y + 34, label.format(pct=pct), 17, color, 700, 'middle')
    if sub:
        t((xs + xe) / 2, y + 53, sub.format(pct=pct), 13, '#6B5C52', 400, 'middle')


bracket(2, 5, 5, '누가의 특징 — 수난 예고 청크가 {pct}%', '9:51 부터 「예루살렘으로 올라가는 길」 · 선한 사마리아인 · 탕자 등 누가에만 있는 이야기', COLORS[4])
bracket(3, 6, 7, '요한의 특징 — 마지막 한 주간이 21장 중 10장', '12–21장 · 마지막 유월절 · 절 수로는 {pct}%', COLORS[5])

a('</svg>')
os.makedirs(OUT, exist_ok=True)
p = os.path.join(OUT, 'gospel-chunks.svg')
open(p, 'w', encoding='utf-8').write('\n'.join(s))
for name, segs, total in data:
    print(name, total, [(c, n, round(n / total * 100)) for c, n in segs])
print('wrote', p)
