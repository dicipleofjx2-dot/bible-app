"""성경맥잡기 — 위키미디어 공용(Commons)에서 교재 사진 받기
퍼블릭 도메인 · CC 사진만 받는다. 저작자 · 라이선스는 photos/credits.json 에 남긴다(교재 끝 「사진 출처」에 쓴다).
실행: python3 scripts/bible-flow/fetch-photos.py
"""
import json, os, re, time, urllib.parse, urllib.request

OUT = os.path.join(os.path.dirname(__file__), '../../content/bible-flow/photos')
UA = 'BibleFlowTextbook/1.0 (https://github.com/dicipleofjx2-dot/bible-app; educational)'
API = 'https://commons.wikimedia.org/w/api.php'
# 키: (검색어, 한국어 설명)
WANT = {
    'arch-titus-relief': ('Arch of Titus spoils of Jerusalem relief menorah', '티투스 개선문 안쪽 부조 — 예루살렘 성전의 등잔대(메노라)를 메고 가는 로마 병사들'),
    'arch-titus': ('Arch of Titus Via Sacra Rome', '로마 포룸의 티투스 개선문'),
    'colosseum': ('Colosseum Rome exterior', '콜로세움(플라비우스 원형경기장)'),
    'western-wall': ('Western Wall Kotel prayer Jerusalem', '예루살렘 통곡의 벽 — 헤롯이 쌓은 성전산 옹벽'),
    'temple-model': ('Holyland Model of Jerusalem Second Temple', '헤롯 성전 모형 (이스라엘 박물관, 1:50)'),
    'caesarea-aqueduct': ('Caesarea aqueduct beach Israel', '가이사랴의 수도교 — 헤롯이 세운 항구 도시'),
    'pilate-stone': ('Pilate stone', '빌라도 비문 — 본디오 빌라도의 이름이 새겨진 돌 (가이사랴 출토)'),
    'herodium': ('Herodium aerial', '헤로디움 — 헤롯이 산을 깎아 만든 요새 궁전'),
    'masada': ('Masada aerial view', '마사다 — 헤롯의 절벽 요새, AD 73–74 마지막 항전지'),
    'caiaphas-ossuary': ('Caiaphas ossuary', '가야바의 이름이 새겨진 유골함'),
    'tiberius-denarius': ('Tiberius denarius', '티베리우스의 데나리온 은화'),
    'augustus': ('Statue Augustus Prima Porta Vatican', '아우구스투스 상 (프리마 포르타)'),
    'patmos': ('Patmos island aerial monastery Saint John', '밧모 섬'),
    'durer-candlesticks': ('Dürer Apocalypse Saint John and the seven candlesticks', '뒤러 「요한과 일곱 촛대」 (1498 목판화)'),
    'durer-horsemen': ('Durer Four Riders Apocalypse', '뒤러 「네 기사」 (1498 목판화) — 계 6장'),
    'papyrus46': ('Papyrus 46 Hebrews', '파피루스 46 — 가장 오래된 바울서신 사본'),
    'ephesus-theatre': ('Ephesus great theatre', '에베소 대극장 (행 19:29)'),
    'corinth': ('Temple of Apollo Ancient Corinth Greece', '고린도 아폴로 신전 터'),
    'philippi': ('Philippi archaeological site', '빌립보 유적'),
    'galilee': ('Sea of Galilee shore view', '갈릴리 바다'),
    'mount-of-olives': ('Mount of Olives view Jerusalem', '감람산 — 마태복음 24장 종말 강화의 자리'),
}
OK = re.compile(r'(public domain|^pd|cc0|cc[- ]by)', re.I)


def get(params):
    q = API + '?' + urllib.parse.urlencode({**params, 'format': 'json'})
    for _ in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(q, headers={'User-Agent': UA}), timeout=30) as r:
                return json.load(r)
        except Exception:
            time.sleep(6)
    return {}


def strip(h):
    return re.sub(r'<[^>]+>', '', h or '').strip()


os.makedirs(OUT, exist_ok=True)
credits_path = os.path.join(OUT, 'credits.json')
credits = json.load(open(credits_path)) if os.path.exists(credits_path) else {}
for key, (query, ko) in WANT.items():
    if key in credits and os.path.exists(os.path.join(OUT, credits[key]['file'])):
        continue
    res = get({'action': 'query', 'list': 'search', 'srsearch': query, 'srnamespace': 6, 'srlimit': 8})
    titles = [h['title'] for h in res.get('query', {}).get('search', []) if re.search(r'\.jpe?g$', h['title'], re.I)]
    got = None
    for title in titles:
        info = get({'action': 'query', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|mime', 'iiurlwidth': 960})
        page = next(iter(info.get('query', {}).get('pages', {}).values()), {})
        ii = (page.get('imageinfo') or [{}])[0]
        meta = ii.get('extmetadata', {})
        lic = strip(meta.get('LicenseShortName', {}).get('value'))
        if not OK.search(lic):
            continue
        # upload.wikimedia.org 는 자주 429 를 내므로 commons 의 thumb.php(표준 폭 960)로 받는다
        url = 'https://commons.wikimedia.org/w/thumb.php?' + urllib.parse.urlencode({'f': title.split(':', 1)[1], 'w': 960})
        ext = '.jpg'
        fn = key + ext
        data = None
        for _ in range(10):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                    data = r.read(); break
            except Exception:
                time.sleep(20)
        if not data:
            continue
        open(os.path.join(OUT, fn), 'wb').write(data)
        got = {'file': fn, 'title': title, 'ko': ko, 'license': lic,
               'artist': strip(meta.get('Artist', {}).get('value'))[:120],
               'source': 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'))}
        break
    print(key, '→', got['title'] + ' [' + got['license'] + ']' if got else '없음')
    if got:
        credits[key] = got
        json.dump(credits, open(credits_path, 'w'), ensure_ascii=False, indent=1)
    time.sleep(6)
