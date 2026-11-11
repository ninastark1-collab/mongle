(function () {
  const deals = PRODUCTS.filter(p => !p.soldOut).sort((a, b) => b.discount - a.discount).slice(0, 5);
  const best = PRODUCTS.filter(p => !p.soldOut).sort((a, b) => (b.sold || 0) * 50 + b.reviewCount - ((a.sold || 0) * 50 + a.reviewCount)).slice(0, 8);
  const fresh = PRODUCTS.filter(p => p.sellerEmail).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recent = Recent.list().map(getProduct).filter(p => p && p.status !== 'hidden').slice(0, 5);
  const maxDeal = Math.max(...PRODUCTS.map(p => p.discount));

  const ticker = ['🚀 오늘 주문하면 내일 도착', `✦ 가입하면 2,000P 바로 지급`, '✦ 첫 구매 WELCOME10 · 10% OFF', `✦ ${won(FREE_SHIPPING_MIN)} 이상 무료배송`, '✦ 셀러 수수료 0%', '✦ 구매확정 1% 적립'];
  const tickerHtml = ticker.map(t => `<span>${t}</span>`).join('');
  const user = Auth.current();

  // 마키는 화면 전체 폭으로
  const marquee = document.createElement('div');
  marquee.className = 'marquee';
  marquee.setAttribute('aria-label', '혜택 안내');
  marquee.innerHTML = `<div class="marquee-track">${tickerHtml}${tickerHtml}</div>`;
  $('#app').before(marquee);

  $('#app').innerHTML = `
    <section class="bento reveal">
      <div class="bento-main">
        <div>
          <div class="eyebrow">New season drop · 2026 F/W</div>
          <h1>내 취향만<br>골라 담는<br><mark>하울 타임.</mark></h1>
          <p>패션부터 테크, 오늘 밤 먹을 간식까지.<br>지금 담으면 내일 문 앞에 도착해요.</p>
        </div>
        <div class="cta">
          <a class="btn btn-lime btn-lg" href="products.html?sort=discount">지금 쇼핑하기 →</a>
          ${user ? '' : '<a class="btn btn-outline btn-lg" href="signup.html">가입하고 2,000P 받기</a>'}
        </div>
        <div class="floaters" aria-hidden="true"><span>🛍️</span><span>👟</span><span>🎧</span><span>✨</span></div>
      </div>
      <a class="bento-lime" href="products.html?sort=discount">
        <span class="big-emoji" aria-hidden="true">⚡</span>
        <div><div class="eyebrow">Today only</div><h3>오늘의 특가<br>최대 ${maxDeal}% OFF</h3></div>
        <span class="arrow">→</span>
      </a>
      <a class="bento-lilac" href="seller.html">
        <span class="big-emoji" aria-hidden="true">🏪</span>
        <div><div class="eyebrow">For sellers</div><h3>내 가게 열기<br>수수료 0%</h3></div>
        <span class="arrow">→</span>
      </a>
    </section>

    <section class="section reveal">
      <div class="cat-grid">
        ${CATEGORIES.map(c => `<a class="cat-item" href="products.html?cat=${c.id}"><span class="ico">${c.icon}</span><div>${c.name}</div></a>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="eyebrow">Today's drop</div><h2>오늘만 이 가격 🔥</h2></div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <span class="countdown" aria-label="특가 종료까지 남은 시간">⏱ <span id="cd">--:--:--</span></span>
          <a href="products.html?sort=discount">전체보기</a>
        </div>
      </div>
      <div class="grid cols-5">${deals.map(p => productCard(p)).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="eyebrow">Real-time ranking</div><h2>지금 제일 많이 담는 TOP 8</h2></div>
        <a href="products.html?sort=reviews">랭킹 전체</a>
      </div>
      <div class="grid">${best.map((p, i) => productCard(p, i, { rank: true })).join('')}</div>
    </section>

    ${fresh.length ? `
    <section class="section">
      <div class="section-head"><div><div class="eyebrow">Fresh from sellers</div><h2>셀러 신상 ✨</h2></div><a href="products.html?sort=new">전체보기</a></div>
      <div class="grid cols-5">${fresh.map(p => productCard(p)).join('')}</div>
    </section>` : ''}

    <section class="section">
      <div class="cta-band">
        <div><div class="eyebrow">Become a seller</div><h3>당신의 취향도<br><mark>누군가의 하울</mark>이 될 수 있어요.</h3><p>셀러 등록 3분 · 등록 즉시 판매 · 수수료 0% (데모)</p></div>
        <a class="btn btn-lime btn-lg" href="seller.html">셀러 시작하기 →</a>
      </div>
    </section>

    ${recent.length ? `
    <section class="section">
      <div class="section-head"><div><div class="eyebrow">Recently viewed</div><h2>최근 본 상품</h2></div><a href="mypage.html?tab=recent">전체보기</a></div>
      <div class="grid cols-5">${recent.map(p => productCard(p)).join('')}</div>
    </section>` : ''}
  `;

  // 특가 카운트다운 (자정까지)
  const cd = $('#cd');
  function tick() {
    const now = new Date();
    const end = new Date(now); end.setHours(24, 0, 0, 0);
    let s = Math.max(0, Math.floor((end - now) / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, '0'); s %= 3600;
    cd.textContent = `${h}:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  tick();
  setInterval(tick, 1000);
})();
