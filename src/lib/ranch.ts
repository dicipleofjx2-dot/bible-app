/**
 * 방주 목장 — 목장 활동이 먹이가 되어 동물이 자란다.
 *
 * **새 표가 없다.** 모임·보고·나눔·소통창을 세어서 먹이로 바꾸고, 먹이의 합으로
 * 동물 수와 자란 정도를 매번 다시 계산한다. 저장한 값이 없으니 어긋날 수도 없다.
 * 대신 순서(ORDER)를 바꾸면 이미 있는 목장의 동물이 바뀐다 — 뒤에만 덧붙일 것.
 *
 * 줄지도 죽지도 않는다. 먹이는 늘기만 하는 합이다. 한 주 쉬었다고 동물이
 * 없어지면 모임이 벌이 된다.
 * 돌봄 기록·양육 내용은 세지 않는다 — 셀 수 있으면 읽을 수 있다.
 */

export type RanchCounts = {
  /** 마침으로 기록된 모임 */
  gatherings: number;
  /** 목장 보고 */
  reports: number;
  /** 나눔 글 */
  shares: number;
  /** 소통창 글 */
  messages: number;
};

export type Species = 'sheep' | 'goat' | 'cow' | 'dog' | 'cat';
export type Stage = 'baby' | 'young' | 'adult';

export type Breed = {
  species: Species;
  /** 렌더러(public/ranch.html)가 아는 이름과 같아야 한다 */
  key: string;
  label: string;
  /** 성경의 정결한 짐승인가. 아니면 「목장 식구」 */
  clean: boolean;
};

export const BREEDS: Breed[] = [
  { species: 'sheep', key: 'merino', label: '메리노 양', clean: true },
  { species: 'goat', key: 'saanen', label: '자넨 염소', clean: true },
  { species: 'cow', key: 'holstein', label: '홀스타인 젖소', clean: true },
  { species: 'sheep', key: 'southdown', label: '사우스다운 양', clean: true },
  { species: 'dog', key: 'jindo', label: '진돗개', clean: false },
  { species: 'goat', key: 'alpine', label: '알파인 염소', clean: true },
  { species: 'cow', key: 'hanwoo', label: '한우', clean: true },
  { species: 'cat', key: 'koshort', label: '코리안숏헤어', clean: false },
  { species: 'dog', key: 'corgi', label: '웰시코기', clean: false },
  { species: 'sheep', key: 'lamb', label: '흰 어린양', clean: true },
  { species: 'dog', key: 'golden', label: '골든리트리버', clean: false },
  { species: 'cat', key: 'russian', label: '러시안블루', clean: false },
  { species: 'cow', key: 'chikso', label: '칡소', clean: true },
  { species: 'dog', key: 'poodle', label: '푸들', clean: false },
  { species: 'cat', key: 'persian', label: '페르시안', clean: false },
  { species: 'goat', key: 'nubian', label: '누비안 염소', clean: true },
];

/** 활동 하나가 주는 먹이. 모임을 마치는 일이 가장 무겁다. 설명 글도 여기서 읽는다. */
export const FEED_WEIGHTS: Record<keyof RanchCounts, number> = {
  gatherings: 4,
  reports: 4,
  shares: 2,
  messages: 1,
};

export const FEED_LABELS: Record<keyof RanchCounts, string> = {
  gatherings: '목장모임을 마치고 기록하기',
  reports: '목장 보고 올리기',
  shares: '나눔 글 쓰기',
  messages: '소통창에 글 남기기',
};

export function feedOf(c: RanchCounts): number {
  return (Object.keys(FEED_WEIGHTS) as (keyof RanchCounts)[]).reduce(
    (sum, k) => sum + c[k] * FEED_WEIGHTS[k],
    0,
  );
}

/** k번째(0부터) 동물이 오는 데 쌓여 있어야 하는 먹이 합. 6, 18, 36, 60… */
export function arrivalFeed(k: number): number {
  return 3 * (k + 1) * (k + 2);
}

/** 온 뒤로 먹은 먹이로 자란다. */
export function stageOf(eaten: number): Stage {
  return eaten < 8 ? 'baby' : eaten < 24 ? 'young' : 'adult';
}

export const STAGE_LABEL: Record<Stage, string> = { baby: '새끼', young: '어린', adult: '다 자란' };

export type RanchAnimal = Breed & { stage: Stage; eaten: number };

export type RanchState = {
  feed: number;
  animals: RanchAnimal[];
  /** 다음 동물이 오기까지 남은 먹이. 도감을 다 채웠으면 null. */
  untilNext: number | null;
  nextBreed: Breed | null;
};

export function computeRanch(counts: RanchCounts): RanchState {
  const feed = feedOf(counts);
  const animals: RanchAnimal[] = [];
  for (let k = 0; k < BREEDS.length && arrivalFeed(k) <= feed; k++) {
    const eaten = feed - arrivalFeed(k);
    animals.push({ ...BREEDS[k], eaten, stage: stageOf(eaten) });
  }
  const k = animals.length;
  return {
    feed,
    animals,
    untilNext: k < BREEDS.length ? arrivalFeed(k) - feed : null,
    nextBreed: k < BREEDS.length ? BREEDS[k] : null,
  };
}
