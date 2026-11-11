# 성경맥잡기 1단계 — 신약편 (맥점 순서판)

선생님이 불러 주신 **맥점 여덟 개가 곧 8과**다. 원천은 `teaching.md`(선생님 말씀 + 검토), 교재로 엮은 원고는 `nt2.cjs`.
전자책과 PPT 는 둘 다 이 원고 하나에서 굽는다 — **고칠 때는 `nt2.cjs`(와 도식 스크립트)만 고친다.**

| 결과물 | 파일 |
|---|---|
| 전자책 (A4, 본문 세로 · 도식 가로 쪽) | `out/성경맥잡기1-신약편.docx` |
| PPT 9개 — 전체 117장을 13장씩 (16:9, 발표자 메모 = 선생님 말씀 · 질문 답) | `out/성경맥잡기1-신약-01(1-13쪽).pptx` … `09(105-117쪽).pptx` |
| 도식 (입체 · 글씨체 입힌 PNG) | `out/png/*.png` (원본 SVG 는 `out/*.svg`) |
| 사진 (위키미디어 공용, 퍼블릭 도메인 · CC) | `photos/*.jpg` · 출처는 `photos/credits.json` → 전자책 끝 「사진 출처」 · PPT 사진 아래 |

| 과 | 맥점 | 내용 |
|---|---|---|
| 1 | 3 × 9 = 27 | 성경 전체 |
| 2 | 약(約) = 약속 | 성경의 중심 · BC/AD |
| 3 | 5 · 13 · 9 | 신약의 구조와 무대(로마 · 헤롯 · 누가복음 3장 · AD 70) |
| 4 | 스토리 청크 7 | 복음서 · 요한복음 절기 |
| 5 | 행 1:8 | 사도행전의 구조 · 사울의 길 |
| 6 | 예언의 성취 | 오순절 성령 강림 |
| 7 | 지도로 확인! | 바울의 선교여행 · 바울서신 시기 |
| 8 | 봉인된 두루마리가 열린다 | 요한계시록 |

## 글씨체와 입체감

- 도식 PNG: 큰 제목 = Noto Serif KR · 「인용」 = 나눔명조 · 본문 = Noto Sans KR, 카드에 그림자 · 색 칸에 광택 (`scripts/bible-flow/render.cjs`)
- 전자책 · PPT: 제목 · 맥점 · 성경 구절 = 바탕(명조), 본문 = 맑은 고딕 — 한국어 Windows 기본 글꼴이라 어디서 열어도 같다
- 그림은 직접 그리지 않는다 — 사진과 옛 그림(뒤러 판화)은 위키미디어 공용에서 받는다

## 다시 굽기

```bash
npm i --no-save docx@9 pptxgenjs@4 world-atlas@2 topojson-client@3 \
  @fontsource/noto-sans-kr@5 @fontsource/noto-serif-kr@5 @fontsource/nanum-myeongjo@5   # 앱 package.json 에는 넣지 않는다
python3 scripts/bible-flow/rome-periods.py   # …도식 스크립트들 (rome-timeline · rome-dynasty · gospel-chunks · acts-flow ·
                                             #  paul-letters · general-letters · revelation · revelation-flow · seven-churches · maekjeom)
node scripts/bible-flow/paul-maps.cjs        # 지도
node scripts/bible-flow/render.cjs           # out/*.svg → out/png/*.png (입체 · 글씨체)
python3 scripts/bible-flow/fetch-photos.py   # 사진 (이미 받은 것은 건너뜀) — commons.wikimedia.org 접속 필요
node scripts/bible-flow/build.cjs            # 전자책 + PPT 9개(13장씩, python-pptx 필요)
```

## 원고 규칙

- 본문은 **개역한글**(앱 DB `ko_ko` 에서 가져와 잡문자를 걷어냄). DB 의 `krv` 는 개역개정(저작권 있음)이라 쓰지 않는다.
- 연대는 모두 「약」. 학설이 갈리는 곳은 「덧붙임」에 밝힌다. 해석은 선생님 입장(남갈라디아설, 인·나팔·대접 차례 해석 등)을 따른다.
- 예전 6과판(`nt.cjs` · `build-docx.cjs` · `build-pptx.cjs`)은 참고용으로 남겨 두었다.
