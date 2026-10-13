# 방주 목장 동물 모델 (선택)

여기에 `.glb` 파일을 넣으면 `public/ranch.html` 이 직접 그린 동물 대신 그 모델을 씁니다.
파일이 없으면 코드로 그린 동물이 그대로 나옵니다.

- 품종 이름이 먼저입니다: `merino.glb`, `holstein.glb`, `jindo.glb` …
  (품종 이름은 `src/lib/ranch.ts` 의 `BREEDS[].key`)
- 품종 파일이 없으면 종 이름을 찾습니다: `sheep.glb`, `cow.glb`, `goat.glb`, `dog.glb`, `cat.glb`
- 크기는 자동으로 맞춥니다. 모델은 **앞이 +Z**, 발이 바닥 쪽이면 됩니다.
- 애니메이션 이름에 `walk`/`run` 이 있으면 걸을 때, `idle`/`eat`/`graze`/`stand` 가 있으면 설 때 틉니다.
  없으면 위아래로만 흔들립니다.
- 라이선스(CC0 · 상업적 사용 가능)를 꼭 확인하고, 파일은 5MB 안쪽으로 줄이세요.
