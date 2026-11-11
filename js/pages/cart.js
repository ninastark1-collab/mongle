(function () {
  // 구매 불가 사유 (품절/판매중지/삭제)
  function unavailable(p) {
    if (!p) return '판매가 종료된 상품';
    if (p.status === 'hidden') return '판매 중지된 상품';
    if (p.soldOut) return '일시품절';
    return '';
  }

  function lines() {
    // 재고보다 많이 담긴 수량은 자동 조정
    let adjusted = false;
    const items = Cart.items().map(i => {
      const p = getProduct(i.id);
      if (p && !p.soldOut && i.qty > p.stock) { adjusted = true; return { ...i, qty: p.stock }; }
      return i;
    });
    if (adjusted) { Cart.save(items); setTimeout(() => toast('재고가 부족한 상품의 수량을 조정했어요.'), 100); }
    return items.map(i => {
      const product = getProduct(i.id);
      return { ...i, product, reason: unavailable(product) };
    });
  }

  function render() {
    const all = lines();
    if (!all.length) {
      $('#app').innerHTML = `<h1 class="page-title">장바구니</h1>
        <div class="empty card"><div class="ico">🛒</div><p>장바구니에 담긴 상품이 없어요.</p><a class="btn btn-primary" href="index.html">쇼핑 계속하기</a></div>`;
      return;
    }
    const buyable = all.filter(l => !l.reason);
    const checked = buyable.filter(l => l.checked);
    const t = calcTotals(checked);
    const allChecked = buyable.length > 0 && checked.length === buyable.length;
    const remain = FREE_SHIPPING_MIN - t.subtotal;
    const bad = all.filter(l => l.reason);

    $('#app').innerHTML = `
      <h1 class="page-title">장바구니 (${all.length})</h1>
      <div class="cart-layout">
        <section class="card">
          <div class="cart-head">
            <label class="check"><input type="checkbox" id="checkAll" ${allChecked ? 'checked' : ''} ${buyable.length ? '' : 'disabled'}> 전체선택 (${checked.length}/${buyable.length})</label>
            <div style="display:flex;gap:6px">
              ${bad.length ? `<button class="btn btn-sm" id="delBad">구매불가 삭제 (${bad.length})</button>` : ''}
              <button class="btn btn-sm" id="delSelected" ${checked.length ? '' : 'disabled'}>선택삭제</button>
            </div>
          </div>
          ${all.map(l => {
            const p = l.product;
            if (!p) return `<div class="cart-item" data-key="${esc(l.key)}"><span></span><div class="thumb sm" style="background:var(--bg)"><span class="emoji">🚫</span></div>
              <div><strong class="muted">${l.reason}</strong><div class="opt">더 이상 구매할 수 없어요.</div></div><div class="right"><button class="link-btn del">삭제</button></div></div>`;
            return `
            <div class="cart-item ${l.reason ? 'is-soldout' : ''}" data-key="${esc(l.key)}">
              <input type="checkbox" class="row-check" ${l.checked && !l.reason ? 'checked' : ''} ${l.reason ? 'disabled' : ''} aria-label="선택" style="width:18px;height:18px;accent-color:var(--primary)">
              <a href="product.html?id=${p.id}">${thumb(p, 'sm')}</a>
              <div>
                <a href="product.html?id=${p.id}"><strong>${esc(p.name)}</strong></a>
                ${l.option ? `<div class="opt">옵션: ${esc(l.option)}</div>` : ''}
                ${l.reason ? `<div class="error-text">${l.reason} · 구매할 수 없어요</div>` : `<div class="tags">${p.fast ? '<span class="tag tag-fast">🚀 내일도착</span>' : ''}${p.freeShip ? '<span class="tag tag-free">무료배송</span>' : ''}${p.stock <= 5 ? `<span class="tag tag-low">${p.stock}개 남음</span>` : ''}</div>`}
                <div class="muted" style="font-size:13px">${won(p.price)} · ${esc(p.seller)}</div>
              </div>
              <div class="right">
                ${l.reason ? '' : `<div class="qty"><button class="dec" aria-label="수량 감소">−</button><input class="q" value="${l.qty}" inputmode="numeric" aria-label="수량"><button class="inc" aria-label="수량 증가">+</button></div>`}
                <strong>${won(p.price * l.qty)}</strong>
                <button class="link-btn del">삭제</button>
              </div>
            </div>`;
          }).join('')}
        </section>
        <aside class="card summary">
          <h3>결제 예정 금액</h3>
          <div class="sum-row"><span>상품금액</span><span>${won(t.originTotal)}</span></div>
          <div class="sum-row"><span>할인금액</span><span style="color:var(--danger)">-${won(t.saved)}</span></div>
          <div class="sum-row"><span>배송비</span><span>${t.shipping ? '+' + won(t.shipping) : '무료'}</span></div>
          ${t.shipping && remain > 0 ? `<div class="free-hint">${won(remain)} 더 담으면 <strong>무료배송</strong>!</div>` : ''}
          <div class="sum-row total"><span>총 결제금액</span><span>${won(t.total)}</span></div>
          <button class="btn btn-primary btn-lg btn-block" id="order" style="margin-top:14px" ${checked.length ? '' : 'disabled'}>
            ${checked.length ? `${checked.length}개 상품 주문하기` : '상품을 선택하세요'}
          </button>
          <a class="btn btn-block" href="index.html" style="margin-top:8px">쇼핑 계속하기</a>
        </aside>
      </div>`;
    bind();
  }

  function bind() {
    $('#checkAll').addEventListener('change', e => {
      Cart.save(Cart.items().map(i => ({ ...i, checked: e.target.checked })));
      render();
    });
    const delBad = $('#delBad');
    if (delBad) delBad.addEventListener('click', () => {
      Cart.removeKeys(lines().filter(l => l.reason).map(l => l.key));
      toast('구매할 수 없는 상품을 삭제했어요.');
      render();
    });
    $('#delSelected').addEventListener('click', () => {
      const keys = lines().filter(l => l.checked && !l.reason).map(l => l.key);
      if (!keys.length) return;
      modal({
        title: '선택 상품 삭제',
        body: `<p>선택한 ${keys.length}개 상품을 장바구니에서 삭제할까요?</p>`,
        okText: '삭제',
        onOk: () => { Cart.removeKeys(keys); render(); toast('삭제했어요.'); },
      });
    });
    $$('.cart-item').forEach(row => {
      const key = row.dataset.key;
      const item = Cart.items().find(i => i.key === key);
      const p = getProduct(item.id);
      const setQty = n => {
        const max = Math.min(99, p ? p.stock : 99);
        if (n > max) toast(`최대 ${max}개까지 구매할 수 있어요.`);
        Cart.update(key, { qty: Math.min(max, Math.max(1, n || 1)) });
        render();
      };
      const chk = $('.row-check', row);
      if (chk) chk.addEventListener('change', e => { Cart.update(key, { checked: e.target.checked }); render(); });
      const dec = $('.dec', row);
      if (dec) {
        dec.addEventListener('click', () => setQty(item.qty - 1));
        $('.inc', row).addEventListener('click', () => setQty(item.qty + 1));
        $('.q', row).addEventListener('change', e => setQty(parseInt(e.target.value, 10)));
      }
      $('.del', row).addEventListener('click', () => { Cart.removeKeys([key]); render(); toast('상품을 삭제했어요.'); });
    });
    $('#order').addEventListener('click', () => {
      const items = lines().filter(l => l.checked && !l.reason).map(({ key, id, option, qty }) => ({ key, id, option, qty }));
      Store.set('checkout', { source: 'cart', items });
      location.href = Auth.current() ? 'checkout.html' : 'login.html?redirect=checkout.html';
    });
  }

  render();
})();
