import type { ImageSourcePropType } from 'react-native';

import type { StringKey } from '@/constants/strings';

export type WordCardTemplate = {
  id: string;
  /**
   * 화면에 뜨는 이름은 여기 적지 않고 **열쇠만** 둔다. 말을 여기 적어 두면
   * 모듈을 읽을 때 굳어, 언어를 바꿔도 처음 언어로 남는다.
   */
  nameKey: StringKey;
  /**
   * 그림 배경. 있으면 이 그림을 깔고 colors 는 안 쓴다.
   *
   * 색 그라데이션만 있던 시절에는 카드가 다 비슷했다. 말씀을 나누는 카드인데
   * 배경에 아무 이야기가 없었다. 예수님과 함께 있는 장면 넷을 기본으로 둔다.
   */
  image?: ImageSourcePropType;
  /** 그림이 없을 때 쓰는 두 색. 그림이 아직 안 떴을 때 뒤에 깔리기도 한다. */
  colors: [string, string];
  textColor: string;
};

/**
 * 말씀카드 배경 넉 장.
 *
 * 예전에는 색 그라데이션 넷(새벽·하늘·밤하늘·숲)이었다. 말씀을 나누는 카드인데
 * 배경에 아무 이야기가 없었다. 예수님과 함께 있는 장면으로 통째로 바꿨다.
 * 스마트주보의 초청장도 같은 넉 장을 쓴다 — 성도가 두 앱에서 같은 그림을 보게
 * 되어 한 교회의 것으로 읽힌다.
 *
 * **글씨는 어두운 색이 기본이다.** 넷 다 옅은 수채화라 흰 글씨를 얹으면 읽히지
 * 않는다. 사람이 「글자 색」에서 바꿀 수는 있다.
 */
export const WORD_CARD_TEMPLATES: WordCardTemplate[] = [
  {
    id: 'teaching',
    nameKey: 'wc.tpl.teaching',
    image: require('../../../assets/images/word-cards/teaching.jpg'),
    colors: ['#FBF0DC', '#F6E3C8'],
    textColor: '#4A3728',
  },
  {
    id: 'comfort',
    nameKey: 'wc.tpl.comfort',
    image: require('../../../assets/images/word-cards/comfort.jpg'),
    colors: ['#FBF2E4', '#F3E7D2'],
    textColor: '#4A3728',
  },
  {
    id: 'walking',
    nameKey: 'wc.tpl.walking',
    image: require('../../../assets/images/word-cards/walking.jpg'),
    colors: ['#FAEFE0', '#F2E2D0'],
    textColor: '#4A3728',
  },
  {
    id: 'through',
    nameKey: 'wc.tpl.through',
    image: require('../../../assets/images/word-cards/through.jpg'),
    colors: ['#FBF1E2', '#F4E5D3'],
    textColor: '#4A3728',
  },
];
