export type WordCardTemplate = {
  id: string;
  name: string;
  colors: [string, string];
  textColor: string;
};

// bible-quiz-app(폐기됨)의 말씀카드 편집기에서 그대로 가져온 감성 템플릿 —
// 외부 이미지 없이 그라데이션 색상 쌍만으로 카드 배경을 구성한다.
export const WORD_CARD_TEMPLATES: WordCardTemplate[] = [
  { id: 'dawn', name: '새벽', colors: ['#ff9a8b', '#ff6a88'], textColor: '#fff' },
  { id: 'sky', name: '하늘', colors: ['#4facfe', '#00c6fb'], textColor: '#fff' },
  { id: 'night', name: '밤하늘', colors: ['#232946', '#121629'], textColor: '#fff' },
  { id: 'forest', name: '숲', colors: ['#56ab2f', '#a8e063'], textColor: '#fff' },
];
