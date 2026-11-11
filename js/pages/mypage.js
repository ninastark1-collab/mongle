(function () {
  if (!Auth.require()) return;
  const TABS = [['orders', '주문내역'], ['wish', '찜한 상품'], ['recent', '최근 본 상품'], ['qna', '내 문의'], ['profile', '회원정보']];
  let tab = TABS.some(t => t[0] === param('tab')) ? param('tab') : 'orders';
  let orderFilter = '전체';

  function ordersHtml() {
    const all = Orders.mine();
    const filters = ['전체', '배송중', '배송완료', '구매확정', '주문취소'];
    const match = (o, f) => {
      const s = Orders.status(o);
      if (f === '전체') return true;
      if (f === '배송중') return ['결제완료', '배송준비중', '배송중'].includes(s);
      return s === f;
    };
    const orders = all.filter(o => match(o, orderFilter));
    const head = `<div class="sort-tabs" style="margin-bottom:14px">${filters.map(f => `<button data-filter="${f}" class="${f === orderFilter ? 'active' : ''}">${f === '배송중' ? '진행중' : f} (${all.filter(o => match(o, f)).length})</button>`).join('')}</div>`;
    if (!all.length) return `<div class="empty"><div class="ico">📦</div><p>주문 내역이 없어요.</p><a class="btn btn-primary" href="index.html">쇼핑하러 가기</a></div>`;
    if (!orders.length) return head + `<div class="empty"><p>해당하는 주문이 없어요.</p></div>`;
    return head + orders.map(o => {
      const st = Orders.status(o);
      return `
      <div class="order">
        <div class="order-head">
          <div><strong>${fmtDate(o.date)} 주문</strong> <span class="muted" style="font-size:13px">· ${esc(o.no)}</span></div>
          <span class="status s-${st}">${st}</span>
        </div>
        ${o.items.map((i, idx) => {
          const p = getProduct(i.id);
          return `<div class="co-item">${p ? `<a href="product.html?id=${p.id}">${thumb(p, 'sm')}</a>` : '<div class="thumb sm" style="background:var(--bg)"><span class="emoji">📦</span></div>'}
            <div><div>${esc(i.name)}</div><div class="muted" style="font-size:13px">${i.option ? esc(i.option) + ' · ' : ''}${i.qty}개 · ${won(i.price * i.qty)}</div>
              ${i.tracking && i.status !== '주문취소' ? `<div class="muted" style="font-size:12px">🚚 송장 ${esc(i.tracking)}</div>` : ''}</div>
            <div style="text-align:right"><span class="status s-${i.status}">${i.status}</span>
              <div class="item-actions">
                ${i.status === '배송완료' ? `<button class="btn btn-sm btn-primary" data-confirm="${esc(o.no)}" data-idx="${idx}">구매확정</button>` : ''}
                ${['배송완료', '구매확정'].includes(i.status) && !i.reviewed && p ? `<button class="btn btn-sm btn-outline" data-review="${esc(o.no)}" data-idx="${idx}">리뷰쓰기</button>` : ''}
                ${i.reviewed ? '<span class="muted" style="font-size:12px">리뷰 작성완료</span>' : ''}
                ${['배송완료', '구매확정'].includes(i.status) && p && p.status !== 'hidden' && !p.soldOut ? `<button class="btn btn-sm" data-rebuy="${i.id}" data-opt="${esc(i.option)}">재구매</button>` : ''}
              </div>
            </div></div>`;
        }).join('')}
        <div class="order-head" style="margin:10px 0 0">
          <span>결제금액 <strong>${won(o.totals.total)}</strong> <span class="muted" style="font-size:13px">(${esc(o.payMethod)})</span></span>
          <span style="display:flex;gap:6px">
            <a class="btn btn-sm" href="order-complete.html?no=${encodeURIComponent(o.no)}">주문상세</a>
            ${Orders.canCancel(o) ? `<button class="btn btn-sm" data-cancel="${esc(o.no)}">주문취소</button>` : ''}
          </span>
        </div>
      </div>`;
    }).join('');
  }

  function gridOrEmpty(ids, emptyMsg, extra = '') {
    const list = ids.map(getProduct).filter(p => p && p.status !== 'hidden');
    return list.length ? extra + `<div class="grid">${list.map(productCard).join('')}</div>` : `<div class="empty"><div class="ico">🛍️</div><p>${emptyMsg}</p><a class="btn btn-primary" href="index.html">상품 둘러보기</a></div>`;
  }

  function qnaHtml() {
    const u = Auth.current();
    const list = QnA.all().filter(q => q.email === u.email);
    if (!list.length) return '<div class="empty"><div class="ico">💬</div><p>작성한 문의가 없어요. 상품 상세페이지의 [문의] 탭에서 질문할 수 있어요.</p></div>';
    return list.map(q => `<div class="qna">
      <div><span class="chip ${q.answer ? 'on' : 'off'}">${q.answer ? '답변완료' : '답변대기'}</span> <a href="product.html?id=${q.productId}&tab=qna" class="muted" style="font-size:13px">${esc(getProduct(q.productId)?.name || '삭제된 상품')}</a></div>
      <p style="margin:6px 0"><b>Q.</b> ${esc(q.question)}</p><div class="muted" style="font-size:12px">${fmtDate(q.date)}</div>
      ${q.answer ? `<div class="a"><b>A.</b> ${esc(q.answer)}</div>` : ''}</div>`).join('');
  }

  function profileHtml() {
    const u = Auth.current();
    const a = u.address;
    return `<table class="info-table">
      <tr><th>이름</th><td>${esc(u.name)}</td></tr>
      <tr><th>이메일</th><td>${esc(u.email)}</td></tr>
      <tr><th>휴대폰</th><td>${esc(u.phone)}</td></tr>
      <tr><th>적립금</th><td><strong style="color:var(--primary)">${won(u.points)}</strong></td></tr>
      <tr><th>기본 배송지</th><td>${a ? `[${esc(a.zip)}] ${esc(a.addr1)} ${esc(a.addr2)}` : '<span class="muted">등록된 배송지가 없어요 (첫 주문 시 저장)</span>'}</td></tr>
      <tr><th>마케팅 수신</th><td><label class="check"><input type="checkbox" id="mkt" ${u.marketing ? 'checked' : ''}> 이벤트·혜택 알림 받기</label></td></tr>
      <tr><th>판매자</th><td>${u.seller ? `${esc(u.seller.storeName)} <a class="btn btn-sm" href="seller.html">셀러센터</a>` : '<a class="btn btn-sm" href="seller.html">판매자 등록하기</a>'}</td></tr>
      <tr><th>가입일</th><td>${fmtDate(u.createdAt)}</td></tr>
    </table>
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
      <button class="btn" id="chPw">비밀번호 변경</button>
      <button class="btn" id="logout2">로그아웃</button>
    </div>`;
  }

  function render() {
    const u = Auth.current();
    const orders = Orders.mine();
    const toConfirm = orders.reduce((n, o) => n + o.items.filter(i => i.status === '배송완료').length, 0);
    const body = {
      orders: ordersHtml,
      wish: () => gridOrEmpty(Wish.list(), '찜한 상품이 없어요.'),
      recent: () => gridOrEmpty(Recent.list(), '최근 본 상품이 없어요.', Recent.list().length ? '<div style="text-align:right;margin-bottom:10px"><button class="link-btn" id="clearRecent">전체 삭제</button></div>' : ''),
      qna: qnaHtml,
      profile: profileHtml,
    }[tab]();

    $('#app').innerHTML = `
      <div class="my-layout">
        <aside class="card my-menu">
          <div class="profile"><strong>${esc(u.name)}</strong>님
            <div class="muted" style="font-size:13px">적립금 <b style="color:var(--primary)">${won(u.points)}</b></div>
            <div class="muted" style="font-size:13px">주문 ${orders.length}건 · 찜 ${Wish.list().length}개</div>
            ${toConfirm ? `<div class="free-hint" style="margin-bottom:0">구매확정 대기 ${toConfirm}건</div>` : ''}
          </div>
          ${TABS.map(([k, v]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${v}</button>`).join('')}
        </aside>
        <section class="card" style="min-width:0">
          <h1 class="page-title" style="margin-top:0">${TABS.find(t => t[0] === tab)[1]}</h1>
          ${body}
        </section>
      </div>`;
    bind();
  }

  function bind() {
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      history.replaceState(null, '', 'mypage.html?tab=' + tab);
      render();
    }));
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => { orderFilter = b.dataset.filter; render(); }));
    $$('[data-cancel]').forEach(b => b.addEventListener('click', () => modal({
      title: '주문 취소',
      body: '<p>이 주문을 취소할까요?<br><span class="muted" style="font-size:13px">결제 금액은 결제 수단으로 환불되고, 사용한 적립금은 즉시 반환돼요. (데모)</span></p>',
      okText: '주문 취소',
      onOk: () => {
        if (Orders.cancel(b.dataset.cancel)) toast('주문이 취소되었어요.');
        else toast('이미 발송되어 취소할 수 없어요. 고객센터로 문의해 주세요.');
        renderHeader(); render();
      },
    })));
    $$('[data-confirm]').forEach(b => b.addEventListener('click', () => modal({
      title: '구매확정',
      body: '<p>상품을 잘 받으셨나요?<br><span class="muted" style="font-size:13px">구매확정 후에는 교환·반품 신청이 어려워요.</span></p>',
      okText: '구매확정',
      onOk: () => {
        const pts = Orders.confirm(b.dataset.confirm, Number(b.dataset.idx));
        toast(`구매확정 완료! 적립금 ${won(pts)}이 적립되었어요.`);
        renderHeader(); render();
      },
    })));
    $$('[data-review]').forEach(b => b.addEventListener('click', () => openReview(b.dataset.review, Number(b.dataset.idx))));
    $$('[data-rebuy]').forEach(b => b.addEventListener('click', () => {
      if (Cart.add(Number(b.dataset.rebuy), b.dataset.opt, 1)) toast('장바구니에 담았어요.', 'cart.html', '장바구니 보기');
      else toast('지금은 구매할 수 없는 상품이에요.');
    }));
    const cr = $('#clearRecent');
    if (cr) cr.addEventListener('click', () => { Recent.clear(); render(); });
    const mkt = $('#mkt');
    if (mkt) mkt.addEventListener('change', e => { Auth.updateCurrent({ marketing: e.target.checked }); toast(e.target.checked ? '혜택 알림 수신에 동의했어요.' : '혜택 알림 수신을 해제했어요.'); });
    const lo = $('#logout2');
    if (lo) lo.addEventListener('click', () => { Auth.logout(); location.href = 'index.html'; });
    const ch = $('#chPw');
    if (ch) ch.addEventListener('click', () => modal({
      title: '비밀번호 변경',
      body: `<div class="field"><label for="oldPw">현재 비밀번호</label><input class="input" type="password" id="oldPw" autocomplete="current-password"></div>
        <div class="field"><label for="newPw">새 비밀번호 (영문+숫자 8~20자)</label><input class="input" type="password" id="newPw" autocomplete="new-password"></div>
        <div class="field"><label for="newPw2">새 비밀번호 확인</label><input class="input" type="password" id="newPw2" autocomplete="new-password"></div>
        <div class="error-text" id="pwErr"></div>`,
      okText: '변경',
      onOk: async w => {
        const err = $('#pwErr', w);
        const n = $('#newPw', w).value;
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,20}$/.test(n)) { err.textContent = '새 비밀번호는 영문과 숫자를 포함해 8~20자로 입력해 주세요.'; return false; }
        if (n !== $('#newPw2', w).value) { err.textContent = '새 비밀번호가 일치하지 않아요.'; return false; }
        try { await Auth.changePassword($('#oldPw', w).value, n); toast('비밀번호를 변경했어요.'); }
        catch (ex) { err.textContent = ex.message; return false; }
      },
    }));
  }

  function openReview(no, idx) {
    const o = Orders.find(no);
    const it = o.items[idx];
    let score = 5;
    const w = modal({
      title: '리뷰 쓰기',
      body: `<p style="margin-top:0"><b>${esc(it.name)}</b>${it.option ? `<br><span class="muted" style="font-size:13px">${esc(it.option)}</span>` : ''}</p>
        <div class="star-input" role="radiogroup" aria-label="별점">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-s="${n}" class="on" aria-label="${n}점">★</button>`).join('')}</div>
        <textarea class="input" id="rvText" rows="4" maxlength="1000" placeholder="상품은 어떠셨나요? 다른 고객에게 도움이 되도록 10자 이상 적어주세요." style="margin-top:10px"></textarea>
        <div class="muted" style="font-size:12px;text-align:right"><span id="rvLen">0</span>/1000</div>
        <div class="error-text" id="rvErr"></div>`,
      okText: '리뷰 등록',
      onOk: wrap => {
        const text = $('#rvText', wrap).value.trim();
        if (text.length < 10) { $('#rvErr', wrap).textContent = '리뷰를 10자 이상 작성해 주세요.'; return false; }
        const u = Auth.current();
        Reviews.add({ productId: it.id, orderNo: no, email: u.email, name: u.name, score, text, option: it.option });
        Orders.markReviewed(no, idx);
        toast('소중한 리뷰 감사합니다! ⭐', 'product.html?id=' + it.id + '&tab=review', '리뷰 보기');
        render();
      },
    });
    const btns = $$('[data-s]', w);
    btns.forEach(b => b.addEventListener('click', () => {
      score = Number(b.dataset.s);
      btns.forEach(x => x.classList.toggle('on', Number(x.dataset.s) <= score));
    }));
    $('#rvText', w).addEventListener('input', e => { $('#rvLen', w).textContent = e.target.value.length; });
  }

  // 찜 해제 시 목록 갱신
  document.addEventListener('click', e => {
    if (tab === 'wish' && e.target.closest('[data-wish]')) setTimeout(render, 0);
  });

  render();
  // 진행 중 주문이 있으면 상태 자동 갱신 (직영 상품 데모 배송)
  setInterval(() => {
    if (tab === 'orders' && !$('.modal-wrap') && Orders.mine().some(o => o.items.some(i => !i.sellerEmail && ['결제완료', '배송준비중', '배송중'].includes(i.status)))) render();
  }, 10000);
})();
