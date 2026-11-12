// 샘플 상품 데이터 (데모용)
const CATEGORIES = [
  { id: 'fashion', name: '패션의류', icon: '👕' },
  { id: 'beauty', name: '뷰티', icon: '💄' },
  { id: 'food', name: '식품', icon: '🍎' },
  { id: 'digital', name: '가전디지털', icon: '💻' },
  { id: 'living', name: '생활/주방', icon: '🏠' },
  { id: 'books', name: '도서/취미', icon: '📚' },
];

const GRADIENTS = [
  ['#ece9e1', '#e2ded3'], ['#e6ecf5', '#d8e1ef'], ['#e9f1e3', '#dbe8d1'],
  ['#f6efdc', '#efe4c6'], ['#ebe7f7', '#ddd6f2'], ['#f5e6e6', '#eed6d6'],
  ['#e3f0f0', '#d2e6e6'], ['#efefec', '#e3e3de'],
];

// [id, category, name, price, originalPrice, rating, reviews, emoji, fast, freeShip, options]
const RAW_PRODUCTS = [
  [1, 'fashion', '남녀공용 오버핏 코튼 반팔 티셔츠', 12900, 19900, 4.6, 3421, '👕', true, true, ['화이트 / M', '화이트 / L', '블랙 / M', '블랙 / L']],
  [2, 'fashion', '데일리 와이드 데님 팬츠', 29900, 45000, 4.4, 1288, '👖', true, true, ['26', '28', '30', '32']],
  [3, 'fashion', '경량 패딩 조끼 베스트', 24900, 39900, 4.5, 902, '🧥', false, true, ['네이비 / FREE', '베이지 / FREE']],
  [4, 'fashion', '쿠션 러닝화 데일리 운동화', 49900, 79000, 4.7, 5610, '👟', true, true, ['240', '250', '260', '270', '280']],
  [5, 'fashion', '캔버스 미니 크로스백', 15900, 22000, 4.3, 412, '👜', false, false, ['아이보리', '블랙', '카키']],

  [6, 'beauty', '수분 진정 시카 토너 300ml', 13900, 22000, 4.8, 8820, '🧴', true, true, []],
  [7, 'beauty', '촉촉 글로우 립틴트 6종', 8900, 15000, 4.5, 2201, '💄', true, false, ['01 코랄', '02 로즈', '03 체리', '04 누드']],
  [8, 'beauty', '데일리 선크림 SPF50+ 50ml', 11900, 18000, 4.7, 6120, '🧴', true, true, []],
  [9, 'beauty', '약산성 저자극 클렌징폼', 7900, 12000, 4.6, 3302, '🫧', false, false, []],
  [10, 'beauty', '퍼퓸 핸드크림 3종 세트', 12900, 21000, 4.4, 980, '🌸', false, true, ['플로럴', '시트러스', '우디']],

  [11, 'food', '꿀사과 가정용 3kg', 21900, 29900, 4.5, 4120, '🍎', true, true, ['3kg (12~15과)', '5kg (18~22과)']],
  [12, 'food', '무농약 국산 바나나 1.5kg', 6900, 8900, 4.2, 1530, '🍌', true, false, []],
  [13, 'food', '원두커피 드립백 50개입', 18900, 32000, 4.7, 7240, '☕', true, true, ['산미 블렌드', '고소한 블렌드']],
  [14, 'food', '닭가슴살 스테이크 10팩', 19900, 27000, 4.6, 5410, '🍗', true, true, ['오리지널', '블랙페퍼', '갈릭']],
  [15, 'food', '프리미엄 견과 한줌 30봉', 24900, 39000, 4.8, 9012, '🥜', false, true, []],

  [16, 'digital', '무선 노이즈캔슬링 이어폰', 59000, 99000, 4.6, 3210, '🎧', true, true, ['화이트', '블랙']],
  [17, 'digital', '14인치 초경량 노트북', 899000, 1190000, 4.7, 820, '💻', true, true, ['8GB / 256GB', '16GB / 512GB']],
  [18, 'digital', '스마트워치 피트니스 밴드', 39900, 69000, 4.3, 1450, '⌚', false, true, ['블랙', '핑크', '그린']],
  [19, 'digital', '고속충전 보조배터리 10000mAh', 19900, 29900, 4.5, 4380, '🔋', true, true, []],
  [20, 'digital', '블루투스 미니 스피커', 29900, 49000, 4.4, 1120, '🔊', false, true, ['블루', '레드', '그레이']],

  [21, 'living', '논슬립 극세사 수건 10장', 16900, 25000, 4.6, 6620, '🧺', true, true, ['화이트', '그레이', '혼합']],
  [22, 'living', '스테인리스 냄비 3종 세트', 45900, 79000, 4.5, 870, '🍳', false, true, []],
  [23, 'living', '대용량 주방세제 리필 2L', 7900, 11000, 4.7, 5530, '🧽', true, false, []],
  [24, 'living', '접이식 수납 리빙박스 4개', 22900, 32000, 4.4, 1910, '📦', true, true, ['소형', '중형', '대형']],
  [25, 'living', '천연 소이 캔들 디퓨저', 13900, 19000, 4.3, 640, '🕯️', false, false, ['라벤더', '코튼', '베르가못']],

  [26, 'books', '하루 10분 영어회화 (개정판)', 15300, 17000, 4.8, 2110, '📘', true, true, []],
  [27, 'books', '초보자를 위한 웹 개발 입문', 25200, 28000, 4.7, 1340, '📗', true, true, []],
  [28, 'books', '1000피스 풍경 직소퍼즐', 14900, 19900, 4.5, 520, '🧩', false, false, ['산과 호수', '도시 야경']],
  [29, 'books', '드로잉 색연필 72색 세트', 19900, 32000, 4.6, 1820, '🖍️', true, true, []],
  [30, 'books', '보드게임 패밀리 에디션', 27900, 36000, 4.4, 760, '🎲', false, true, []],
];

const BASE_PRODUCTS = RAW_PRODUCTS.map(([id, category, name, price, originalPrice, rating, reviews, emoji, fast, freeShip, options]) => ({
  id, category, name, price, originalPrice, rating, reviews, emoji, fast, freeShip, options,
  gradient: GRADIENTS[id % GRADIENTS.length],
  seller: 'PIKK. 직영', sellerEmail: null, image: '',
  stock: id === 25 ? 0 : id === 5 ? 3 : id === 17 ? 8 : 100,
  createdAt: '2026-01-01T00:00:00.000Z',
  discount: Math.round((1 - price / originalPrice) * 100),
  description: `${name}은(는) PIKK. 에디터가 직접 써보고 고른 아이템이에요. 꼼꼼한 품질 검수를 거쳐 안전하게 포장해 보내드립니다. 받아보신 후 7일 이내 단순 변심 반품이 가능합니다.`,
}));

// 쿠폰: 회원별 쿠폰함에 받아서 1회 사용 (주문 취소 시 복구)
const COUPONS = {
  WELCOME10: { label: '신규회원 10% 할인 (최대 1만원)', short: '10%', type: 'percent', value: 10, max: 10000, min: 0, how: '가입 시 자동 지급' },
  PIKK5000: { label: '5,000원 할인 (3만원 이상 구매 시)', short: '5천원', type: 'amount', value: 5000, min: 30000, how: '홈 쿠폰존에서 받기' },
  SALE15: { label: '타임세일 15% 할인 (5만원 이상, 최대 1.5만원)', short: '15%', type: 'percent', value: 15, max: 15000, min: 50000, how: '오늘의 타임세일 배너에서 받기' },
};

const POINT_RATE = 0.01;
const FREE_SHIPPING_MIN = 30000;
const SHIPPING_FEE = 3000;

function getCategory(id) {
  return CATEGORIES.find(c => c.id === id);
}
