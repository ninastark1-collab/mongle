(function () {
  const live = PRODUCTS.filter(p => p.live && !p.soldOut);
  const supplies = PRODUCTS.filter(p => !p.live && !p.soldOut);
  const deals = supplies.slice().sort((a, b) => b.discount - a.discount).slice(0, 5);
  const best = live.slice().sort((a, b) => (b.sold || 0) * 50 + b.reviewCount - ((a.sold || 0) * 50 + a.reviewCount)).slice(0, 8);
  const easy = live.filter(p => p.pet && p.pet.care === '초보 추천').slice(0, 5);
  const fresh = PRODUCTS.filter(p => p.sellerEmail).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const recent = Recent.list().map(getProduct).filter(p => p && p.status !== 'hidden').slice(0, 5);
  const maxDeal = Math.max(0, ...supplies.map(p => p.discount));
  const countBy = c => PRODUCTS.filter(p => p.category === c && !p.soldOut).length;

  const ticker = ['💌 입양 신청서를 읽고 가족을 정해요', '✦ 모든 아이 수의사 건강검진', '✦ 분양 후 15일 건강보증', '✦ 생명은 택배 없이 직접 만나 인계', '✦ 입양 후에도 분양자와 함께 상담', `✦ 펫 용품 ${won(FREE_SHIPPING_MIN)} 이상 무료배송`];
  const tickerHtml = ticker.map(t => `<span>${t}</span>`).join('');
  const user = Auth.current();

  // 마키는 화면 전체 폭으로
  const marquee = document.createElement('div');
  marquee.className = 'marquee';
  marquee.setAttribute('aria-label', '안내');
  marquee.innerHTML = `<div class="marquee-track">${tickerHtml}${tickerHtml}</div>`;
  $('#app').before(marquee);

  const heroPics = [1, 9, 16, 22].map(getProduct).filter(Boolean);

  $('#app').innerHTML = `
    <section class="bento reveal">
      <div class="bento-main">
        <div>
          <div class="eyebrow">Responsible adoption</div>
          <h1>정성껏<br>키워주실<br>가족을<br><mark>기다려요.</mark></h1>
          <p>우리는 아이를 팔지 않고, 가족을 찾아요.<br>입양 신청서를 꼼꼼히 읽고 아이와 꼭 맞는 분께 보내드려요.</p>
        </div>
        <div class="cta">
          <a class="btn btn-sage btn-lg" href="products.html?live=1">가족을 기다리는 친구들 →</a>
          ${user ? '' : '<a class="btn btn-outline btn-lg" href="signup.html">가입하고 2,000P 받기</a>'}
        </div>
        <div class="hero-pics" aria-hidden="true">${heroPics.map(p => `<img src="${safeImage(p.image)}" alt="">`).join('')}</div>
      </div>
      <a class="bento-sale" href="products.html?cat=supplies&sort=discount">
        <span class="big-emoji" aria-hidden="true">🦴</span>
        <div><div class="eyebrow">Today only · SALE</div><h3>펫 용품 특가<br>최대 ${maxDeal}% OFF</h3></div>
        <span class="arrow">→</span>
      </a>
      <a class="bento-lilac" href="#how">
        <span class="big-emoji" aria-hidden="true">🩺</span>
        <div><div class="eyebrow">How adoption works</div><h3>입양은 이렇게<br>진행돼요</h3></div>
        <span class="arrow">→</span>
      </a>
    </section>

    <section class="section reveal">
      <div class="cat-grid cat-8">
        ${CATEGORIES.map(c => `<a class="cat-item" href="products.html?cat=${c.id}"><span class="ico">${c.icon}</span><div>${c.name}</div><small class="muted">${countBy(c.id)}${c.id === 'supplies' ? '개' : '마리'}</small></a>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="eyebrow">Waiting for family</div><h2>새 가족을 기다리는 친구들 🏡</h2></div>
        <a href="products.html?live=1">모두 만나보기</a>
      </div>
      <div class="grid">${best.map(p => productCard(p)).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><div class="eyebrow" id="how">How adoption works</div><h2>PIKK.의 책임 분양은 이렇게 진행돼요</h2></div><a href="help.html">자세히 보기</a></div>
      <div class="help-grid adopt-steps">
        <div class="card"><span class="ico">💌</span><strong>1. 입양 신청서</strong><span class="muted">가족 동의, 사는 곳, 반려 경험, 혼자 있는 시간, 입양 이유를 적어주세요.</span></div>
        <div class="card"><span class="ico">🤝</span><strong>2. 분양자 검토·상담</strong><span class="muted">아이와 잘 맞는 가족인지 신청서를 읽고, 1일 안에 연락드려요.</span></div>
        <div class="card"><span class="ico">🏡</span><strong>3. 직접 만나 인계</strong><span class="muted">건강 기록·계약서·먹던 사료와 함께 보내드리고, 15일 건강보증을 시작해요.</span></div>
      </div>
    </section>

    <section class="section">
      <div class="timedeal" role="region" aria-label="오늘의 타임세일">
        <div style="position:relative;z-index:1">
          <div class="eyebrow">⏰ Time sale · 오늘 자정까지</div>
          <h2>펫 용품 타임세일 15% 쿠폰</h2>
          <p>새 가족 맞이 준비물까지 한 번에! 5만원 이상 구매 시 최대 15,000원 할인</p>
        </div>
        <div class="td-right">
          <div class="td-clock" data-cd aria-label="타임세일 종료까지 남은 시간">--:--:--</div>
          <button class="btn btn-white btn-lg" data-coupon="SALE15">🎟️ 15% 쿠폰 받기</button>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><div class="eyebrow">Today's drop</div><h2>오늘만 이 가격, 펫 용품 🔥</h2></div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <span class="countdown" aria-label="특가 종료까지 남은 시간">⏱ <span data-cd>--:--:--</span></span>
          <a href="products.html?cat=supplies&sort=discount">전체보기</a>
        </div>
      </div>
      <div class="grid cols-5">${deals.map(p => productCard(p)).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><div class="eyebrow">First pet?</div><h2>처음 함께한다면, 이 친구들을 만나보세요 🌱</h2></div><a href="products.html?live=1&care=easy">더보기</a></div>
      <div class="grid cols-5">${easy.map(p => productCard(p)).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><div class="eyebrow">Coupon zone</div><h2>지금 받을 수 있는 쿠폰 🎟️</h2></div><a href="mypage.html?tab=coupons">내 쿠폰함</a></div>
      <div class="coupon-strip">
        ${Object.entries(COUPONS).map(([code, c]) => `
          <div class="coupon">
            <div class="c-val">${c.short}</div>
            <div class="c-body"><strong>${esc(c.label)}</strong><span class="muted">${esc(c.how)}</span>
              <button class="btn btn-sm btn-outline" data-coupon="${code}" style="align-self:flex-start;margin-top:4px">받기</button></div>
          </div>`).join('')}
      </div>
    </section>

    ${fresh.length ? `
    <section class="section">
      <div class="section-head"><div><div class="eyebrow">From caring breeders</div><h2>새로 가족을 찾는 친구들 ✨</h2></div><a href="products.html?sort=new">전체보기</a></div>
      <div class="grid cols-5">${fresh.map(p => productCard(p)).join('')}</div>
    </section>` : ''}

    <section class="section">
      <div class="cta-band">
        <div><div class="eyebrow">Responsible adoption</div><h3>귀여움은 잠깐,<br><mark>책임은 평생</mark>이에요.</h3><p>입양 전 수명·크기·비용을 꼭 확인해 주세요. 보호소의 유기동물 입양도 함께 응원해요.</p></div>
        <a class="btn btn-sage btn-lg" href="help.html">분양 전 체크리스트 →</a>
      </div>
    </section>

    ${recent.length ? `
    <section class="section">
      <div class="section-head"><div><div class="eyebrow">Recently viewed</div><h2>최근 본 친구들</h2></div><a href="mypage.html?tab=recent">전체보기</a></div>
      <div class="grid cols-5">${recent.map(p => productCard(p)).join('')}</div>
    </section>` : ''}
  `;

  // 특가 카운트다운 (자정까지)
  function tick() {
    const now = new Date();
    const end = new Date(now); end.setHours(24, 0, 0, 0);
    let s = Math.max(0, Math.floor((end - now) / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, '0'); s %= 3600;
    const text = `${h}:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    $$('[data-cd]').forEach(el => { el.textContent = text; });
  }
  tick();
  setInterval(tick, 1000);

  // 쿠폰 받기
  function paintCoupons() {
    $$('[data-coupon]').forEach(b => {
      if (Auth.current() && CouponBox.has(b.dataset.coupon)) {
        b.disabled = true;
        b.textContent = b.closest('.timedeal') ? '✓ 쿠폰 받음 · 결제 시 적용' : '✓ 받음';
      }
    });
  }
  $$('[data-coupon]').forEach(b => b.addEventListener('click', () => {
    const r = CouponBox.give(b.dataset.coupon);
    if (r === 'login') { toast('로그인하고 쿠폰을 받아보세요.', loginUrl(), '로그인'); return; }
    toast(r === 'ok' ? '쿠폰을 받았어요! 결제할 때 바로 쓸 수 있어요.' : '이미 받은 쿠폰이에요.', 'mypage.html?tab=coupons', '쿠폰함');
    paintCoupons();
  }));
  paintCoupons();
})();
