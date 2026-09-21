/**
 * 가맹점 이름으로 씀씀이 갈래를 어림한다.
 *
 * 어림이라고 적는 이유가 있다. 「(주)케이지이니시스」처럼 결제대행사 이름만
 * 찍혀 오는 가맹점이 흔하고, 같은 「이마트」도 장을 본 것인지 밥을 먹은 것인지
 * 이름만으로는 알 수 없다. 그래서 **고친 것을 기억하는 쪽**에 무게를 뒀다 —
 * 한 번 고쳐 주면 그 가맹점은 다음부터 그 갈래로 간다(`overrides`).
 */

export const CATEGORIES = [
  '식비',
  '카페/간식',
  '마트/편의점',
  '온라인쇼핑',
  '교통',
  '주유',
  '통신',
  '구독/OTT',
  '의료/건강',
  '문화/여가',
  '교육',
  '의류/미용',
  '주거/공과금',
  '경조사/헌금',
  '기타',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** 갈래마다의 빛깔 — 화면 여기저기서 같은 갈래가 같은 색으로 읽히도록 한 곳에 둔다. */
export const CATEGORY_COLORS: Record<Category, string> = {
  '식비': '#E07A5F',
  '카페/간식': '#C08552',
  '마트/편의점': '#81B29A',
  '온라인쇼핑': '#6A8EAE',
  '교통': '#7C9EB2',
  '주유': '#B5838D',
  '통신': '#8E7DBE',
  '구독/OTT': '#9B72CF',
  '의료/건강': '#5F9EA0',
  '문화/여가': '#D9A05B',
  '교육': '#4F8A8B',
  '의류/미용': '#CE8CA8',
  '주거/공과금': '#8D99AE',
  '경조사/헌금': '#C9A227',
  '기타': '#9CA3AF',
};

/**
 * 갈래를 가리는 낱말표. **순서가 규칙의 일부다** — 위에서부터 먼저 맞는 것을
 * 쓴다. 「쿠팡이츠」가 「쿠팡」보다 위에 있어야 배달 음식이 온라인쇼핑으로
 * 가지 않는다.
 */
const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: '구독/OTT',
    keywords: ['NETFLIX', '넷플릭스', '유튜브', 'YOUTUBE', '왓챠', '웨이브', 'WAVVE', '티빙', 'TVING', '디즈니', 'DISNEY', '쿠팡플레이', '멜론', 'MELON', '스포티파이', 'SPOTIFY', '지니뮤직', '플로', 'APPLE.COM', '애플', 'GOOGLE', '구글', 'CHATGPT', 'OPENAI', 'ANTHROPIC', '밀리의서재', '리디', '윌라'],
  },
  {
    category: '카페/간식',
    keywords: ['스타벅스', 'STARBUCKS', '투썸', '이디야', '메가커피', '메가엠지씨', '빽다방', '커피', 'COFFEE', '카페', 'CAFE', '파리바게뜨', '뚜레쥬르', '베스킨', '배스킨', '던킨', '공차', '설빙', '베이커리', '제과', '탐앤탐스', '할리스', '컴포즈'],
  },
  {
    category: '식비',
    keywords: ['쿠팡이츠', '배달의민족', '배민', '요기요', '김밥', '국밥', '백반', '식당', '분식', '치킨', '피자', '버거', '맥도날드', '롯데리아', '맘스터치', '김가네', '본죽', '한솥', '삼겹', '고깃', '냉면', '칼국수', '짜장', '중화', '초밥', '스시', '돈까스', '순대', '족발', '보쌈', '곱창', '뷔페', '푸드', '한식', '일식', '양식', '주점', '포차', '횟집', '수산'],
  },
  {
    category: '마트/편의점',
    keywords: ['이마트', '홈플러스', '롯데마트', '하나로마트', '코스트코', 'GS25', 'CU ', '씨유', '세븐일레븐', '7-ELEVEN', '미니스톱', '이마트24', '마트', '슈퍼', '정육', '청과', '농협유통'],
  },
  {
    category: '온라인쇼핑',
    keywords: ['쿠팡', 'COUPANG', '11번가', '지마켓', 'GMARKET', 'G마켓', '옥션', 'AUCTION', '네이버페이', 'NAVER', '티몬', '위메프', 'SSG', '신세계몰', '알리', 'ALIEXPRESS', 'AMAZON', '아마존', '카카오페이', '토스페이', '이니시스', 'KG이니시스', '다날', '페이레터', '나이스페이'],
  },
  {
    category: '교통',
    keywords: ['지하철', '버스', '티머니', '캐시비', '택시', '카카오T', '코레일', 'KORAIL', 'SRT', '고속버스', '통행료', '하이패스', '주차', '렌터카', '쏘카', '따릉이'],
  },
  {
    category: '주유',
    keywords: ['주유', 'SK에너지', 'GS칼텍스', '칼텍스', 'S-OIL', '에스오일', '오일뱅크', '충전소', '알뜰주유'],
  },
  {
    category: '통신',
    keywords: ['SKT', 'SK텔레콤', 'KT ', '케이티', 'LGU', 'LG유플러스', '유플러스', '알뜰폰', '통신요금'],
  },
  {
    category: '의료/건강',
    keywords: ['병원', '의원', '약국', '치과', '한의원', '클리닉', '메디', '헬스', '피트니스', '요가', '필라테스', '검진'],
  },
  {
    category: '문화/여가',
    keywords: ['CGV', '롯데시네마', '메가박스', '영화', '서점', '교보문고', '예스24', 'YES24', '알라딘', '노래', 'PC방', '볼링', '골프', '캠핑', '여행', '호텔', '펜션', '야놀자', '여기어때', '숙박', '리조트'],
  },
  {
    category: '교육',
    keywords: ['학원', '교육', '학습', '과외', '대학교', '유치원', '어린이집', '등록금', '수강', '아카데미'],
  },
  {
    category: '의류/미용',
    keywords: ['유니클로', 'UNIQLO', '자라', 'ZARA', '무신사', '올리브영', '미용', '헤어', '네일', '화장품', '아모레', '이니스프리', '백화점', '스파오', '탑텐', '에이블리', '지그재그'],
  },
  {
    category: '주거/공과금',
    keywords: ['관리비', '전기', '도시가스', '가스공사', '수도', '한국전력', '한전', '아파트', '월세', '보험', '공과금'],
  },
  {
    category: '경조사/헌금',
    keywords: ['교회', '헌금', '후원', '기부', '장례', '예식', '웨딩', '화환', '성당', '선교'],
  },
];

/** 견줄 때 쓰는 꼴 — 띄어쓰기와 회사 꼬리표는 문자마다 흔들린다. */
export function normalizeMerchant(merchant: string): string {
  return merchant
    .toUpperCase()
    .replace(/\(주\)|주식회사|\(유\)|\(재\)/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * 갈래를 고른다. 고쳐 둔 것이 있으면 규칙보다 **그것이 먼저다** — 사람이 한
 * 번 말해 준 것을 기계가 다음 날 다시 뒤집으면 고칠 마음이 사라진다.
 */
export function guessCategory(merchant: string, overrides: Record<string, Category> = {}): Category {
  const normalized = normalizeMerchant(merchant);
  const saved = overrides[normalized];
  if (saved && CATEGORIES.includes(saved)) return saved;

  const haystack = ` ${merchant.toUpperCase()} `;
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      if (haystack.includes(keyword.toUpperCase())) return rule.category;
    }
  }
  return '기타';
}

/** 규칙이 아니라 사람이 정해 준 갈래인가 — 화면에서 「내가 정함」으로 보여 주려고. */
export function isLearned(merchant: string, overrides: Record<string, Category>): boolean {
  return Boolean(overrides[normalizeMerchant(merchant)]);
}
