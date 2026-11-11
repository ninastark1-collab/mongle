(function () {
  const p = getProduct(param('id'));
  if (!p) {
    $('#app').innerHTML = `<div class="empty card"><div class="ico">😢</div><p>상품을 찾을 수 없어요. 삭제되었거나 잘못된 주소예요.</p><a class="btn btn-primary" href="index.html">홈으로</a></div>`;
    return;
  }
  const hidden = p.status === 'hidden';
  document.title = p.name + ' | HAUL.';
  if (!hidden) Recent.add(p.id);
  const cat = getCategory(p.category);
  const maxQty = Math.max(1, Math.min(99, p.stock));

  // 도착 예정일 (일요일 배송 없음)
  const arrive = new Date();
  arrive.setDate(arrive.getDate() + (p.fast ? 1 : 3));
  if (arrive.getDay() === 0) arrive.setDate(arrive.getDate() + 1);
  const arriveText = `${arrive.getMonth() + 1}/${arrive.getDate()}(${'일월화수목금토'[arrive.getDay()]})`;

  // 리뷰: 실제 작성된 리뷰 + (직영 상품) 기본 샘플 리뷰
  const realReviews = Reviews.forProduct(p.id).map(r => ({ ...r, real: true }));
  const sampleTexts = [
    '배송이 정말 빨라요. 품질도 기대 이상입니다!', '가격 대비 만족스러워요. 재구매 의사 있습니다.',
    '포장이 꼼꼼하게 되어 왔어요.', '사진이랑 똑같아요. 추천합니다.', '생각보다 괜찮네요. 잘 쓰고 있어요.',
    '가족들도 좋아해요. 또 살게요!', '무난하게 좋아요. 할인할 때 사면 이득!',
  ];
  const sampleNames = ['김*진', '이*수', '박*영', '최*민', '정*아', '한*결', '윤*호'];
  const sampleReviews = p.sellerEmail ? [] : Array.from({ length: 5 }, (_, i) => {
    const d = new Date('2026-10-30'); d.setDate(d.getDate() - (i * 4 + (p.id % 5)));
    return { name: sampleNames[(p.id + i) % 7], score: i === 3 ? 4 : 5, text: sampleTexts[(p.id * 7 + i * 3) % 7], date: d.toISOString(), option: p.options[0] || '' };
  });
  const allReviews = [...realReviews, ...sampleReviews];
  const maskName = n => (n.length <= 1 ? n : n[0] + '*' + (n.length > 2 ? n[n.length - 1] : ''));
  const dist = p.reviewCount ? [5, 4, 3, 2, 1].map(s => {
    // 샘플 분포 + 실제 리뷰 반영
    const base = p.sellerEmail ? 0 : [0.72, 0.18, 0.06, 0.03, 0.01][5 - s] * (p.reviews || 0);
    return (base + realReviews.filter(r => r.score === s).length) / p.reviewCount;
  }) : [0, 0, 0, 0, 0];

  const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
  const qnaCount = QnA.forProduct(p.id).length;

  $('#app').innerHTML = `
    <div class="breadcrumb"><a href="index.html">홈</a> › <a href="products.html?cat=${cat.id}">${cat.name}</a></div>
    ${hidden ? '<div class="free-hint">⚠️ 현재 판매가 중지된 상품입니다.</div>' : ''}
    <div class="detail">
      <div>${thumb(p, 'lg')}</div>
      <div>
        <div class="tags">
          ${p.fast ? '<span class="tag tag-fast">🚀 내일도착</span>' : ''}
          ${p.freeShip ? '<span class="tag tag-free">무료배송</span>' : ''}
          ${p.sellerEmail ? `<span class="tag tag-seller">${esc(p.seller)}</span>` : '<span class="tag tag-seller">✔ HAUL. 직영</span>'}
        </div>
        <h1>${esc(p.name)}</h1>
        <div class="rating">${p.reviewCount ? `${stars(p.avgRating)} <strong>${p.avgRating}</strong> · <a href="#" id="toReviews">리뷰 ${p.reviewCount.toLocaleString()}개</a>` : '아직 리뷰가 없어요'}${p.sold ? ` · ${p.sold.toLocaleString()}개 구매` : ''}</div>
        <div style="margin-top:14px">${priceBlock(p)}</div>

        <dl class="ship-box">
          <dt>배송</dt><dd>${p.fast ? `<strong style="color:var(--accent)">내일 ${arriveText} 도착 보장</strong> (밤 12시 전 주문 시)` : `${arriveText} 도착 예정`}</dd>
          <dt>배송비</dt><dd>${p.freeShip ? '무료배송' : `${won(SHIPPING_FEE)} (${won(FREE_SHIPPING_MIN)} 이상 구매 시 무료)`}</dd>
          <dt>적립</dt><dd>구매확정 시 ${won(Math.floor(p.price * POINT_RATE))} 적립 (${POINT_RATE * 100}%)</dd>
          <dt>재고</dt><dd>${p.soldOut ? '<strong style="color:var(--danger)">일시품절</strong>' : p.stock <= 10 ? `<strong style="color:var(--danger)">품절임박! ${p.stock}개 남음</strong>` : '구매 가능'}</dd>
          <dt>판매자</dt><dd>${esc(p.seller)}</dd>
        </dl>

        ${p.options.length ? `
        <div class="field"><label for="opt">옵션 선택</label>
          <select class="select" id="opt"><option value="">옵션을 선택하세요</option>${p.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>
        </div>` : ''}

        <div class="field"><label>수량 ${p.stock < 99 && !p.soldOut ? `<span class="muted" style="font-weight:400">(최대 ${maxQty}개)</span>` : ''}</label>
          <div class="qty"><button id="minus" aria-label="수량 감소">−</button><input id="qty" value="1" inputmode="numeric" aria-label="수량"><button id="plus" aria-label="수량 증가">+</button></div>
        </div>

        <div class="total-line"><span>총 상품 금액</span><strong id="total">${won(p.price)}</strong></div>
        <div class="actions">
          <button class="btn" id="wish" aria-label="찜하기" aria-pressed="${Wish.has(p.id)}">${Wish.has(p.id) ? '❤️' : '🤍'}</button>
          ${p.soldOut || hidden
            ? `<button class="btn btn-lg" disabled style="grid-column:span 2">${hidden ? '판매 중지' : '일시품절'}</button>`
            : `<button class="btn btn-outline btn-lg" id="addCart">장바구니 담기</button>
               <button class="btn btn-primary btn-lg" id="buyNow">바로구매</button>`}
        </div>
        <button class="link-btn" id="share" style="margin-top:12px">🔗 상품 링크 복사</button>
      </div>
    </div>

    <div class="tabs">
      <button data-tab="desc" class="active">상품정보</button>
      <button data-tab="review">리뷰 (${p.reviewCount.toLocaleString()})</button>
      <button data-tab="qna">문의 (${qnaCount})</button>
      <button data-tab="ship">배송/교환</button>
    </div>
    <div class="tab-panel" id="tab-desc">
      <div class="card">
        <p style="white-space:pre-line">${esc(p.description)}</p>
        <div style="max-width:420px;margin:20px auto">${thumb({ ...p, soldOut: false })}</div>
        <table class="info-table">
          <tr><th>카테고리</th><td>${cat.name}</td></tr>
          <tr><th>상품번호</th><td>HL-${String(p.id).padStart(6, '0')}</td></tr>
          <tr><th>판매자</th><td>${esc(p.seller)}</td></tr>
          ${p.options.length ? `<tr><th>옵션</th><td>${p.options.map(esc).join(', ')}</td></tr>` : ''}
        </table>
      </div>
    </div>
    <div class="tab-panel hidden" id="tab-review">
      <div class="card">
        ${p.reviewCount ? `
        <div class="review-summary">
          <div class="center"><div class="big">${p.avgRating}</div><div class="rating">${stars(p.avgRating)}</div></div>
          <div>${dist.map((d, i) => `<div class="bar"><span>${5 - i}점</span><div class="track"><div class="fill" style="width:${d * 100}%"></div></div><span class="muted">${Math.round(d * 100)}%</span></div>`).join('')}</div>
        </div>` : ''}
        <p class="muted" style="font-size:13px">리뷰는 상품을 구매하고 배송이 완료된 고객만 마이페이지 &gt; 주문내역에서 작성할 수 있어요.</p>
        ${allReviews.length ? allReviews.map(r => `<div class="review"><div>${stars(r.score)} <strong>${esc(r.real ? maskName(r.name) : r.name)}</strong>${r.real ? ' <span class="tag tag-free">구매인증</span>' : ''}</div><div class="meta">${fmtDate(r.date)}${r.option ? ' · 옵션: ' + esc(r.option) : ''}</div><p style="margin:6px 0 0;white-space:pre-line">${esc(r.text)}</p></div>`).join('') : '<div class="empty"><div class="ico">✍️</div><p>첫 번째 리뷰의 주인공이 되어 주세요!</p></div>'}
      </div>
    </div>
    <div class="tab-panel hidden" id="tab-qna"><div class="card" id="qnaBox"></div></div>
    <div class="tab-panel hidden" id="tab-ship">
      <div class="card">
        <table class="info-table">
          <tr><th>배송 방법</th><td>택배 (${p.fast ? '내일도착 전용 배송' : '일반 배송'})</td></tr>
          <tr><th>배송비</th><td>${p.freeShip ? '무료' : `${won(SHIPPING_FEE)}, ${won(FREE_SHIPPING_MIN)} 이상 무료`}</td></tr>
          <tr><th>주문취소</th><td>배송준비중 단계까지 마이페이지에서 바로 취소할 수 있어요.</td></tr>
          <tr><th>교환/반품</th><td>상품 수령 후 7일 이내 신청 가능. 단순 변심 시 왕복 배송비 6,000원 고객 부담</td></tr>
          <tr><th>교환/반품 불가</th><td>사용·훼손으로 상품 가치가 떨어진 경우, 신선식품 등 재판매가 어려운 경우</td></tr>
        </table>
      </div>
    </div>

    ${related.length ? `
    <section class="section">
      <div class="section-head"><h2>함께 보면 좋은 상품</h2><a href="products.html?cat=${cat.id}">더보기 ›</a></div>
      <div class="grid">${related.map(productCard).join('')}</div>
    </section>` : ''}
  `;

  // ---------- 상품 문의 ----------
  function renderQna() {
    const u = Auth.current();
    const list = QnA.forProduct(p.id);
    $('#qnaBox').innerHTML = `
      <div class="toolbar"><strong>상품 문의 ${list.length}건</strong><button class="btn btn-sm btn-outline" id="askBtn">문의하기</button></div>
      <p class="muted" style="font-size:13px">비밀글로 작성하면 작성자와 판매자만 볼 수 있어요. 개인정보(연락처·주소)는 적지 마세요.</p>
      ${list.length ? list.map(q => {
        const canSee = !q.secret || (u && (u.email === q.email || u.email === p.sellerEmail));
        return `<div class="qna">
          <div><span class="chip ${q.answer ? 'on' : 'off'}">${q.answer ? '답변완료' : '답변대기'}</span> ${q.secret ? '🔒' : ''}</div>
          <p style="margin:6px 0"><b>Q.</b> ${canSee ? esc(q.question) : '<span class="muted">비밀글입니다.</span>'}</p>
          <div class="muted" style="font-size:12px">${esc(maskName(q.name))} · ${fmtDate(q.date)}</div>
          ${q.answer && canSee ? `<div class="a"><b>A. ${esc(p.seller)}</b><br>${esc(q.answer)}</div>` : ''}
        </div>`;
      }).join('') : '<div class="empty"><div class="ico">💬</div><p>궁금한 점을 판매자에게 물어보세요.</p></div>'}`;
    $('#askBtn').addEventListener('click', () => {
      if (!Auth.current()) { toast('로그인 후 문의할 수 있어요.', loginUrl(), '로그인'); return; }
      modal({
        title: '상품 문의하기',
        body: `<textarea class="input" id="qText" rows="4" maxlength="500" placeholder="상품에 대해 궁금한 점을 적어주세요. (5자 이상)"></textarea>
          <label class="check" style="margin-top:8px;font-size:14px"><input type="checkbox" id="qSecret"> 🔒 비밀글로 문의</label><div class="error-text" id="qErr"></div>`,
        okText: '등록',
        onOk: w => {
          const t = $('#qText', w).value.trim();
          if (t.length < 5) { $('#qErr', w).textContent = '문의 내용을 5자 이상 입력해 주세요.'; return false; }
          const me = Auth.current();
          QnA.add({ productId: p.id, email: me.email, name: me.name, question: t, secret: $('#qSecret', w).checked });
          toast('문의를 등록했어요. 답변이 달리면 이 탭에서 확인할 수 있어요.');
          renderQna();
          $('[data-tab="qna"]').textContent = `문의 (${QnA.forProduct(p.id).length})`;
        },
      });
    });
  }
  renderQna();

  // ---------- 수량 ----------
  const qtyEl = $('#qty');
  function getQty() {
    let n = parseInt(qtyEl.value, 10);
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.min(maxQty, n);
  }
  function setQty(n) {
    if (n > maxQty) toast(`최대 ${maxQty}개까지 구매할 수 있어요.`);
    qtyEl.value = Math.min(maxQty, Math.max(1, n));
    $('#total').textContent = won(p.price * getQty());
  }
  $('#minus').addEventListener('click', () => setQty(getQty() - 1));
  $('#plus').addEventListener('click', () => setQty(getQty() + 1));
  qtyEl.addEventListener('change', () => setQty(parseInt(qtyEl.value, 10) || 1));

  function selectedOption() {
    if (!p.options.length) return '';
    const v = $('#opt').value;
    if (!v) {
      toast('옵션을 선택해 주세요.');
      $('#opt').focus();
      return null;
    }
    return v;
  }

  if ($('#addCart')) {
    $('#addCart').addEventListener('click', () => {
      const opt = selectedOption();
      if (opt === null) return;
      const want = getQty();
      const key = p.id + '|' + opt;
      const before = (Cart.items().find(i => i.key === key) || {}).qty || 0;
      const after = Cart.add(p.id, opt, want);
      if (!after) toast('방금 품절되어 담을 수 없어요.');
      else if (after < before + want) toast(`재고가 부족해 ${after}개까지만 담았어요.`, 'cart.html', '장바구니 보기');
      else toast(before ? `장바구니에 있던 상품의 수량을 ${after}개로 늘렸어요.` : '장바구니에 담았어요.', 'cart.html', '장바구니 보기');
    });
    $('#buyNow').addEventListener('click', () => {
      const opt = selectedOption();
      if (opt === null) return;
      Store.set('checkout', { source: 'now', items: [{ key: p.id + '|' + opt, id: p.id, option: opt, qty: getQty() }] });
      location.href = Auth.current() ? 'checkout.html' : 'login.html?redirect=checkout.html';
    });
  }

  $('#wish').addEventListener('click', e => {
    const on = Wish.toggle(p.id);
    if (on === null) { toast('로그인 후 찜할 수 있어요.', loginUrl(), '로그인'); return; }
    e.currentTarget.textContent = on ? '❤️' : '🤍';
    e.currentTarget.setAttribute('aria-pressed', on);
    toast(on ? '찜 목록에 추가했어요.' : '찜 목록에서 삭제했어요.');
  });

  $('#share').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('상품 링크를 복사했어요.'); }
    catch (e) { toast('링크 복사를 지원하지 않는 환경이에요.'); }
  });

  // ---------- 탭 ----------
  function showTab(name) {
    $$('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab-panel').forEach(el => el.classList.toggle('hidden', el.id !== 'tab-' + name));
  }
  $$('.tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  const toReviews = $('#toReviews');
  if (toReviews) toReviews.addEventListener('click', e => {
    e.preventDefault();
    showTab('review');
    $('.tabs').scrollIntoView({ behavior: 'smooth' });
  });
  const startTab = param('tab');
  if (['review', 'qna', 'ship'].includes(startTab)) { showTab(startTab); setTimeout(() => $('.tabs').scrollIntoView(), 50); }
})();
