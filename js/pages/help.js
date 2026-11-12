(function () {
  const FAQ = [
    ['분양', '반려동물은 어떻게 받나요?', '동물보호법에 따라 택배로 보내지 않아요. 입양 신청서를 분양자가 검토한 뒤, 매장 방문 또는 전문 펫택시로 직접 만나 인계하고, 분양 계약서·건강 기록·먹던 사료 샘플을 함께 드려요.'],
    ['분양', '건강보증은 어떻게 되나요?', '인계 후 15일 이내에 질병이 생기면 판매자가 치료를 지원하고, 회복이 어렵거나 폐사하면 같은 종으로 교환 또는 환불해 드려요. 마이페이지 > 주문내역의 [건강보증 신청]에서 접수하세요.'],
    ['분양', '마음이 바뀌면 반품할 수 있나요?', '반려동물은 생명이라 단순 변심에 따른 반품·환불이 불가해요. 입양 전에 평균 수명, 다 자란 크기, 매달 드는 비용과 돌봄 시간을 꼭 확인해 주세요.'],
    ['분양', '처음 키우는데 어떤 친구가 좋을까요?', '상품 목록에서 [🌱 초보 추천만] 필터를 켜 보세요. 햄스터·사랑앵무·레오파드 게코·러시안 블루처럼 비교적 돌보기 쉬운 친구들을 모아 보여드려요.'],
    ['분양', '분양하지 않는 동물이 있나요?', '국제 거래 규제(CITES) 대상종과 생태계교란종(예: 붉은귀거북)은 분양하지 않아요. 강아지·고양이는 생후 2개월 이상만 분양해요.'],
    ['분양 전 체크리스트', '입양 전에 무엇을 준비해야 하나요?', '① 가족 모두의 동의 ② 평생(10~20년) 돌볼 수 있는지 ③ 매달 사료·모래·병원비 예산 ④ 혼자 있는 시간 ⑤ 알레르기 여부 ⑥ 이사·여행 시 돌봐줄 사람을 꼭 확인해 주세요. 유기동물 보호소 입양도 좋은 선택이에요.'],
    ['주문/결제', '주문을 취소하고 싶어요.', '결제완료·배송준비중 단계에서는 마이페이지 > 주문내역에서 바로 취소할 수 있어요. 사용한 적립금과 쿠폰은 즉시 돌려드려요.'],
    ['주문/결제', '쿠폰은 어디서 받나요?', `홈 화면의 쿠폰존과 타임세일 배너, 상품 상세페이지에서 받을 수 있어요. 받은 쿠폰은 마이페이지 > 쿠폰함에서 확인하고, 결제할 때 가장 할인이 큰 쿠폰이 자동으로 선택돼요.`],
    ['주문/결제', '적립금은 어떻게 쌓이나요?', `가입하면 2,000P를 드리고, 구매확정 시 결제금액의 ${POINT_RATE * 100}%가 적립돼요. 결제할 때 1원 단위로 사용할 수 있어요.`],
    ['배송', '배송비는 얼마인가요?', `무료배송 상품이 아니면 ${won(SHIPPING_FEE)}이고, ${won(FREE_SHIPPING_MIN)} 이상 구매하면 무료예요.`],
    ['배송', '내일도착 상품은 언제 오나요?', '🚀 내일도착 표시 상품은 밤 12시 전에 주문하면 다음 날 도착해요. (일요일 제외)'],
    ['배송', '배송지를 여러 개 저장할 수 있나요?', '마이페이지 > 배송지 관리에서 최대 10개까지 저장하고 기본 배송지를 정할 수 있어요. 주문서에서 한 번에 골라 쓸 수 있어요.'],
    ['반품/교환', '반품은 어떻게 신청하나요?', '배송완료 후 구매확정 전에 마이페이지 > 주문내역에서 [반품신청]을 누르세요. 판매자가 승인하면 결제한 금액만큼 환불되고, 사용한 적립금도 비율대로 돌려드려요.'],
    ['반품/교환', '반품 배송비가 있나요?', '단순 변심일 때만 왕복 배송비 6,000원이 환불액에서 차감돼요. 상품 불량·오배송·정보와 다른 경우는 무료예요.'],
    ['상품', '품절 상품은 언제 다시 들어오나요?', '품절 상품 페이지에서 [재입고 알림 신청]을 누르면, 재고가 들어오는 즉시 상단 🔔 알림함으로 알려드려요.'],
    ['셀러', '판매자로 입점하려면?', '회원가입 후 상단 셀러센터에서 스토어 정보를 입력하면 바로 상품을 등록할 수 있어요. 수수료는 0%예요. (데모)'],
  ];
  const NOTICES = [
    ['2026-11-12', '몽글이 책임 분양 하우스로 새롭게 태어났어요 🐾'],
    ['2026-11-12', '브랜드 이름이 PIKK.에서 몽글로 바뀌었어요'],
    ['2026-11-12', '쿠폰함·배송지 관리·반품 신청·재입고 알림 기능 오픈'],
    ['2026-11-01', '타임세일 쿠폰(SALE15) 매일 자정까지 진행'],
  ];
  const cats = ['전체', ...new Set(FAQ.map(f => f[0]))];
  let cat = '전체';
  let q = '';

  $('#app').innerHTML = `
    <h1 class="page-title">고객센터</h1>
    <div class="help-grid">
      <div class="card"><span class="ico">📞</span><strong>전화 상담</strong><span class="muted">1588-0000 · 평일 09:00–18:00</span></div>
      <a class="card" href="mypage.html"><span class="ico">📦</span><strong>주문·배송 조회</strong><span class="muted">취소·반품 신청도 여기서 →</span></a>
      <a class="card" href="mypage.html?tab=qna"><span class="ico">💬</span><strong>내 문의 내역</strong><span class="muted">상품 문의 답변 확인 →</span></a>
    </div>
    <section class="card">
      <div class="toolbar" style="flex-wrap:wrap;gap:10px"><h2 style="margin:0;font-size:20px">자주 묻는 질문</h2>
        <input class="input" id="faqQ" type="search" placeholder="궁금한 내용을 검색해 보세요" style="max-width:280px"></div>
      <div class="sort-tabs" id="faqCats" style="margin:14px 0 4px"></div>
      <div class="faq" id="faqList"></div>
    </section>
    <section class="card" style="margin-top:16px">
      <h2 style="margin:0 0 10px;font-size:20px">공지사항</h2>
      ${NOTICES.map(([d, t]) => `<div class="sum-row"><span>${esc(t)}</span><span class="muted">${d}</span></div>`).join('')}
    </section>`;

  function paint() {
    $('#faqCats').innerHTML = cats.map(c => `<button data-c="${c}" class="${c === cat ? 'active' : ''}">${c}</button>`).join('');
    const k = q.trim().toLowerCase();
    const list = FAQ.filter(f => (cat === '전체' || f[0] === cat) && (!k || (f[1] + f[2]).toLowerCase().includes(k)));
    $('#faqList').innerHTML = list.length
      ? list.map(f => `<details><summary><span><span class="muted" style="font-size:12px">[${f[0]}]</span> ${esc(f[1])}</span></summary><p>${esc(f[2])}</p></details>`).join('')
      : '<p class="muted">검색 결과가 없어요. 전화 상담을 이용해 주세요.</p>';
    $$('[data-c]').forEach(b => b.addEventListener('click', () => { cat = b.dataset.c; paint(); }));
  }
  $('#faqQ').addEventListener('input', e => { q = e.target.value; paint(); });
  paint();
})();
