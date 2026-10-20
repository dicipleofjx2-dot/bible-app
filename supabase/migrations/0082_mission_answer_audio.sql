-- 사명기록관 — 인터뷰 녹음 (기획서 §18 1단계 「음성 녹음 및 자동 녹취」).
--
-- ── 왜 글이 아니라 목소리를 남기는가 ────────────────────────────────
-- 은퇴를 앞둔 사역자에게 긴 이야기를 **타자로** 치게 하는 것은 사실상 기록하지
-- 말라는 말이다. 말로 하면 한 시간 할 이야기를 글로는 한 문단 쓰고 만다.
--
-- 그리고 받아쓴 글이 아무리 정확해도 **원본 음성은 지우지 않는다**(§21.9 —
-- 사역자의 목소리를 보존한다). 받아쓰기가 틀리면 글은 고치면 되지만, 목소리는
-- 다시 들을 수 없다. 목소리 자체가 손주에게 남길 유산이기도 하다.
--
-- 파일은 0080 의 **비공개** 통(mission-assets)에 담는다. 새 통을 만들지 않는
-- 이유는 같은 성격의 자료이기 때문이다 — 서명 주소로만 열린다.

alter table public.mission_answers
  add column if not exists audio_path text;

alter table public.mission_answers
  add column if not exists audio_seconds integer;

comment on column public.mission_answers.audio_path is
  '인터뷰 녹음 원본의 mission-assets 통 안 경로. 받아쓴 글을 고쳐도 이 파일은 남는다.';
