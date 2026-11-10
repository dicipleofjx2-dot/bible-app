"""성경맥잡기 — 신약 맥점 한 장 정리 (SVG)
실행: python3 scripts/bible-flow/maekjeom.py → content/bible-flow/out/maekjeom-nt.svg
"""
import os, html
OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/out')
FONT = "'Malgun Gothic','맑은 고딕','Noto Sans KR','WenQuanYi Zen Hei',sans-serif"
INK, MUTED = '#2A211B', '#6B5C52'
M = [
    ('성경 전체', '3 × 9 = 27', '구약 39권 · 신약 27권 · 합 66권 — 구구단으로 외운다', '#9A6510'),
    ('성경의 중심', '약(約) = 약속', '구약 = 메시야가 오신다 · 신약 = 그분이 예수님이시고 다시 오신다 — 역사도 BC · AD 로 나뉜다', '#B5532F'),
    ('신약의 구조', '5 · 13 · 9', '역사서 5(4복음서 + 사도행전) · 바울서신 13(교리 2 · 옥중 4 · 목회 3 · 교회 4) · 비바울서신 9', '#5B6B7F'),
    ('복음서', '스토리 청크 7', '탄생 · 세례 요한 · 갈릴리 사역 · 오병이어 · 수난 예고 · 예루살렘 사역 · 십자가와 부활 (요한은 절기 중심)', '#2F7466'),
    ('사도행전 구조', '행 1:8', '예루살렘(1–7장) → 온 유대와 사마리아(8–12장) → 땅 끝(13–28장)', '#952B38'),
    ('오순절 성령 강림', '예언의 성취', '요엘을 비롯한 구약 선지자의 예언 · 세례 요한의 예언(성령과 불) · 예수님의 인용(행 1:5)이 행 2장에서 이루어짐', '#64457F'),
    ('바울의 선교여행', '지도로 확인!', '1 · 2 · 3차 여행과 로마행을 지도로 — 오래 머문 곳에서 편지가 나왔다(고린도 · 에베소 · 로마)', '#4A3F38'),
    ('요한계시록', '봉인된 두루마리가 열린다', '다니엘이 봉한 두루마리를 예수님이 떼신다 — 7인(징조) → 7나팔(시작) → 7대접(내용) → 재림 · 심판 · 천년왕국 · 백보좌 · 새 하늘과 새 땅', '#C7A15A'),
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
t(60, 64, '성경맥잡기 1단계 — 신약의 맥점', 34, INK, 700)
t(60, 98, '이 여덟 가지만 붙잡으면 신약 27권의 흐름이 잡힌다', 17, MUTED)
X0, X1, G = 60, 1540, 18
cw = (X1 - X0 - 3 * G) / 4
ch = 360
for i, (where, key, body, c) in enumerate(M):
    x = X0 + (i % 4) * (cw + G)
    y = 130 + (i // 4) * (ch + 20)
    s.append(f'<rect x="{x:.1f}" y="{y}" width="{cw:.1f}" height="{ch}" rx="16" fill="#F7F4F1" stroke="#E3DDD7"/>')
    s.append(f'<rect x="{x:.1f}" y="{y}" width="{cw:.1f}" height="118" rx="16" fill="{c}"/>')
    s.append(f'<rect x="{x:.1f}" y="{y + 100}" width="{cw:.1f}" height="18" fill="{c}"/>')
    s.append(f'<circle cx="{x + 34}" cy="{y + 36}" r="20" fill="#FFFFFF"/>')
    t(x + 34, y + 43, str(i + 1), 20, c, 700, 'middle')
    t(x + 66, y + 43, where, 18, '#FFFFFF', 700)
    t(x + 22, y + 92, key, 26 if len(key) <= 10 else 21, '#FFFFFF', 700)
    for k, ln in enumerate(wrap(body, 20)):
        t(x + 22, y + 156 + k * 27, ln, 16, INK)
s.append('</svg>')
os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'maekjeom-nt.svg'), 'w', encoding='utf-8').write('\n'.join(s))
print('wrote maekjeom-nt.svg')
