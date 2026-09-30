import { openAppWindow } from '@/lib/openExternal';

/**
 * 선교 카드에서 「그림·영상 만들기」로 넘길 때 들려 보내는 말.
 *
 * ── 왜 규칙을 프롬프트 안에 박아 넣는가 ─────────────────────────────
 * 화면에 안내 문구로만 적어 두면 그 말은 **AI 에게 닿지 않는다.** 사람이 옮겨
 * 적어야 하는데 대개 안 옮긴다. 그래서 지켜야 할 것은 전부 보내는 글 안에 넣는다.
 *
 * ── 왜 사람 얼굴을 만들지 말라고 하는가 ─────────────────────────────
 * 선교 카드에는 실제 선교사와 현지 성도가 나온다. AI 가 만든 얼굴을 그 자리에
 * 걸면 **없는 사람이 그 사역을 한 것처럼** 보인다. 현장 사진은 다녀온 사람이
 * 갖고 있으니 그것을 올리고, AI 로는 분위기 그림만 만든다.
 *
 * ── 왜 한글을 넣지 말라고 하는가 ────────────────────────────────────
 * 그림 생성 모델이 한글을 넣으면 거의 반드시 깨진 글자가 된다. 글씨는 앱이
 * 카드 위에 얹으면 되고, 그림에는 안 넣는 편이 늘 낫다.
 */

export type MissionSeed = {
  field: string;
  partner?: string | null;
  story?: string | null;
  prayerPoints?: string | null;
};

const SHARED_RULES = [
  '지켜 주세요:',
  '- 실제 인물의 얼굴을 지어내지 마세요. 사람은 뒷모습이나 멀리 있는 실루엣으로만.',
  '- 그림 안에 글자를 넣지 마세요(한글은 거의 깨집니다).',
  '- 특정 교단 표식이나 과장된 종교적 상징은 넣지 마세요.',
  '- 따뜻하고 차분한 분위기로. 광고처럼 번쩍이지 않게.',
].join('\n');

function seedLines(m: MissionSeed): string {
  const lines = [`선교지: ${m.field}`];
  if (m.partner?.trim()) lines.push(`함께하는 분: ${m.partner.trim()}`);
  if (m.story?.trim()) lines.push(`소식: ${m.story.trim()}`);
  if (m.prayerPoints?.trim()) lines.push(`기도 제목: ${m.prayerPoints.trim()}`);
  return lines.join('\n');
}

/** 그림 한 장을 만들어 달라는 글. */
export function missionImagePrompt(m: MissionSeed): string {
  return [
    '교회 목장에서 나눌 선교 소식 카드에 쓸 그림 한 장을 만들어 주세요.',
    '',
    seedLines(m),
    '',
    '세로 4:5 비율, 사진처럼 자연스러운 빛. 그 지역의 풍경과 일상이 드러나면 좋겠습니다.',
    '',
    SHARED_RULES,
  ].join('\n');
}

/** 짧은 영상을 만들어 달라는 글. */
export function missionVideoPrompt(m: MissionSeed): string {
  return [
    '교회 목장에서 나눌 선교 소식 영상을 만들어 주세요. 8~10초짜리 짧은 것이면 됩니다.',
    '',
    seedLines(m),
    '',
    '세로 화면, 천천히 움직이는 한 장면. 그 지역의 풍경에서 시작해 사람들의 일상으로 옮겨 가면 좋겠습니다.',
    '',
    SHARED_RULES,
  ].join('\n');
}

/**
 * 만들러 가는 곳.
 *
 * 챗지피티는 `?q=` 로 물음을 미리 적어 둘 수 있어서 누르면 바로 그 글이 들어가
 * 있다. 소라는 그런 길이 없어 주소만 열고, 글은 화면에서 복사해 두게 한다.
 */
export const AI_STUDIO = {
  image: (prompt: string) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  video: 'https://sora.chatgpt.com/',
} as const;

/** 창 이름. openAppWindow 의 설명 그대로 — 누를 때마다 탭이 늘지 않게 한다. */
export const AI_WINDOW = {
  image: 'aiimage',
  video: 'aivideo',
} as const;

export function openAiStudio(kind: 'image' | 'video', prompt: string): void {
  const url = kind === 'image' ? AI_STUDIO.image(prompt) : AI_STUDIO.video;
  openAppWindow(url, kind === 'image' ? AI_WINDOW.image : AI_WINDOW.video);
}
