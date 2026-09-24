import type { MorphKind, Word } from './types.ts';

/**
 * 어근 지도(§5-5). 접사·어근 하나에서 익힌 단어 가족을 모은다.
 *
 * 가족은 **콘텐츠에 적힌 분해에서만** 만든다 — 철자가 닮았다고 묶지 않는다
 * (`return` 은 re- 가족이 아니다). 어원 이야기는 붙이지 않는다(검증되지 않은
 * 어원 이야기 금지). 두 단어 이상 모여야 가족으로 보여 준다.
 */

export interface Family {
  key: string;
  part: string;
  kind: MorphKind;
  meaning: string;
  ids: string[];
}

const KIND_ORDER: MorphKind[] = ['prefix', 'root', 'suffix', 'base'];

export function buildFamilies(words: readonly Word[], min = 2): Family[] {
  const map = new Map<string, Family>();
  for (const w of words) {
    for (const m of w.morph ?? []) {
      // 모양이 같아도 뜻이 다르면 다른 가족이다(im-「~이 아닌」 ≠ im-「안으로」).
      const key = `${m.kind}:${m.part}:${m.meaning}`;
      const f = map.get(key) ?? { key, part: m.part, kind: m.kind, meaning: m.meaning, ids: [] };
      if (!f.ids.includes(w.id)) f.ids.push(w.id);
      map.set(key, f);
    }
  }
  // 바탕 단어는 자기 자신도 가족이다(write → write, rewrite).
  for (const f of map.values()) {
    if (f.kind === 'base' && words.some((w) => w.id === f.part) && !f.ids.includes(f.part)) f.ids.unshift(f.part);
  }
  return [...map.values()]
    .filter((f) => f.ids.length >= min)
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || b.ids.length - a.ids.length || a.part.localeCompare(b.part));
}

export const KIND_LABEL: Record<MorphKind, string> = {
  prefix: '접두사',
  suffix: '접미사',
  root: '어근',
  base: '바탕 단어',
};
