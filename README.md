# HAUL. — 취향을 하울하다

오늘 담고, 내일 받는 라이프스타일 마켓. 순수 HTML/CSS/JavaScript로 만든 **학습용 쇼핑몰 데모**입니다.

## 기능
- **구매자**: 상품 목록·검색(자동완성/최근 검색어)·필터·정렬, 상품 상세, 찜, 장바구니, 쿠폰·적립금 결제(모의), 주문 조회·취소, 구매확정, 리뷰, 상품 문의
- **셀러**: 셀러 등록, 사진 포함 상품 등록·수정·판매중지, 재고 관리, 주문 처리(발주확인 → 송장 입력 → 배송완료), 문의 답변, 매출 대시보드

데모 쿠폰: `WELCOME10` (10%, 최대 1만원), `HAUL5000` (3만원 이상 5천원)

## 실행
빌드 과정이 없습니다. 폴더에서 정적 서버를 띄우고 http://localhost:8080 으로 접속하세요.

```bash
python -m http.server 8080
```

## 구조
```
index.html, products.html, product.html, cart.html, checkout.html,
order-complete.html, mypage.html, seller.html, login.html, signup.html
css/style.css        디자인 시스템 (토큰, 컴포넌트, 반응형)
js/data.js           기본 상품·카테고리·쿠폰
js/store.js          localStorage 저장소 (상품, 장바구니, 주문, 리뷰, 문의)
js/auth.js           회원가입·로그인 (데모)
js/layout.js         공통 헤더/푸터, 상품 카드, 토스트, 모달
js/pages/*.js        페이지별 스크립트
```

## 주의
서버가 없는 데모라 모든 데이터는 **방문자 각자의 브라우저(localStorage)** 에만 저장되고, 결제는 실제로 이루어지지 않습니다. 실제 비밀번호를 입력하지 마세요.

개선 기록은 [IMPROVEMENTS.md](IMPROVEMENTS.md)를 참고하세요.
