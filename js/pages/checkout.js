(function () {
  if (!Auth.require()) return;
  const user = Auth.current();
  const co = Store.get('checkout', null);
  const lines = (co && co.items || []).map(i => ({ ...i, product: getProduct(i.id) })).filter(l => l.product);

  if (!lines.length) {
    $('#app').innerHTML = `<div class="empty card"><div class="ico">🧾</div><p>주문할 상품이 없어요.</p><a class="btn btn-primary" href="cart.html">장바구니로 가기</a></div>`;
    return;
  }

  const book = AddressBook.list();
  const addr = AddressBook.getDefault() || {};
  let coupon = '';
  let points = 0;
  const myPoints = user.points || 0;

  $('#app').innerHTML = `
    <h1 class="page-title">주문/결제</h1>
    <div class="cart-layout">
      <div>
        <section class="card co-section">
          <h2>배송지</h2>
          ${book.length ? `<div class="addr-pick" role="group" aria-label="저장된 배송지">${book.map(a => `<button type="button" data-addr="${esc(a.id)}" class="${a.id === addr.id ? 'active' : ''}">${a.id === AddressBook.defaultId() ? '⭐ ' : ''}${esc(a.name)} · ${esc(a.addr1.slice(0, 14))}${a.addr1.length > 14 ? '…' : ''}</button>`).join('')}<button type="button" data-addr="">+ 새 배송지</button></div>` : ''}
          <div class="row">
            <div class="field"><label for="rName">받는 분</label><input class="input" id="rName" value="${esc(addr.name || user.name)}"></div>
            <div class="field"><label for="rPhone">연락처</label><input class="input" id="rPhone" type="tel" value="${esc(addr.phone || user.phone)}"></div>
          </div>
          <div class="field"><label for="zip">주소</label>
            <div class="row" style="margin-bottom:8px"><input class="input" id="zip" placeholder="우편번호 (5자리)" maxlength="5" inputmode="numeric" value="${esc(addr.zip || '')}" style="flex:0 0 150px"><input class="input" id="addr1" placeholder="기본 주소 (예: 서울시 강남구 테헤란로 123)" value="${esc(addr.addr1 || '')}"></div>
            <input class="input" id="addr2" placeholder="상세 주소 (동/호수)" value="${esc(addr.addr2 || '')}">
          </div>
          <div class="field"><label for="memo">배송 요청사항</label>
            <select class="select" id="memo">
              <option>문 앞에 놓아주세요</option><option>경비실에 맡겨주세요</option><option>택배함에 넣어주세요</option><option>배송 전 연락 바랍니다</option>
            </select>
          </div>
          <div style="display:flex;gap:18px;flex-wrap:wrap">
            <label class="check" style="font-size:14px"><input type="checkbox" id="saveAddr" checked> 배송지 목록에 저장</label>
            <label class="check" style="font-size:14px"><input type="checkbox" id="defAddr" ${book.length ? '' : 'checked'}> 기본 배송지로 설정</label>
          </div>
          <div class="error-text" id="addrErr"></div>
        </section>

        <section class="card co-section">
          <h2>주문 상품 (${lines.length}개)</h2>
          ${lines.map(l => `
            <div class="co-item">
              ${thumb(l.product, 'sm')}
              <div><div>${esc(l.product.name)}</div><div class="muted" style="font-size:13px">${l.option ? esc(l.option) + ' · ' : ''}${l.qty}개${l.product.fast ? ' · <span style="color:var(--accent)">🚀 내일도착</span>' : ''}</div></div>
              <strong>${won(l.product.price * l.qty)}</strong>
            </div>`).join('')}
        </section>

        <section class="card co-section">
          <h2>할인 쿠폰</h2>
          <select class="select" id="couponSel" aria-label="쿠폰 선택"></select>
          <div id="couponMsg"></div>
          <div class="coupon-row" style="margin-top:10px"><input class="input" id="couponInput" placeholder="쿠폰 코드가 있다면 입력해 등록하세요"><button class="btn" id="couponBtn">등록</button></div>
          <div class="demo-note">쿠폰은 홈 화면 쿠폰존에서 받을 수 있어요. 데모 코드: <strong>WELCOME10</strong> · <strong>PIKK5000</strong> · <strong>SALE15</strong></div>
        </section>

        <section class="card co-section">
          <h2>적립금</h2>
          <div class="point-row"><input class="input" id="pointInput" type="number" min="0" step="100" placeholder="0" ${myPoints ? '' : 'disabled'}><button class="btn" id="pointAll" ${myPoints ? '' : 'disabled'}>전액 사용</button></div>
          <div class="muted" style="font-size:13px;margin-top:6px">보유 적립금 <strong>${won(myPoints)}</strong> · 구매확정 시 결제금액의 ${POINT_RATE * 100}%가 적립돼요.</div>
        </section>

        <section class="card co-section">
          <h2>결제 수단</h2>
          <div class="pay-methods">
            <label><input type="radio" name="pay" value="신용/체크카드" checked>💳<br>신용/체크카드</label>
            <label><input type="radio" name="pay" value="간편결제">📱<br>간편결제</label>
            <label><input type="radio" name="pay" value="계좌이체">🏦<br>계좌이체</label>
            <label><input type="radio" name="pay" value="휴대폰 결제">📞<br>휴대폰 결제</label>
          </div>
          <div class="demo-note">🔒 데모 결제입니다. 카드번호 등 실제 결제 정보는 입력받지 않으며, 결제하기를 누르면 모의 승인 처리됩니다.</div>
        </section>
      </div>

      <aside class="card summary">
        <h3>결제 금액</h3>
        <div id="sum"></div>
        <label class="check" style="font-size:13px;margin-top:12px"><input type="checkbox" id="agree"> 주문 내용을 확인했으며 결제에 동의합니다 (필수)</label>
        <div class="error-text" id="agreeErr"></div>
        <button class="btn btn-primary btn-lg btn-block" id="payBtn" style="margin-top:12px"></button>
      </aside>
    </div>`;

  function renderSum() {
    const t = calcTotals(lines, coupon, points);
    $('#sum').innerHTML = `
      <div class="sum-row"><span>상품금액</span><span>${won(t.originTotal)}</span></div>
      <div class="sum-row"><span>상품할인</span><span style="color:var(--danger)">-${won(t.saved)}</span></div>
      <div class="sum-row"><span>쿠폰할인</span><span style="color:var(--danger)">-${won(t.couponDiscount)}</span></div>
      <div class="sum-row"><span>적립금 사용</span><span style="color:var(--danger)">-${won(t.pointsUsed)}</span></div>
      <div class="sum-row"><span>배송비</span><span>${t.shipping ? '+' + won(t.shipping) : '무료'}</span></div>
      <div class="sum-row total"><span>최종 결제금액</span><span>${won(t.total)}</span></div>
      <div class="muted" style="font-size:13px;text-align:right">구매확정 시 ${won(Math.floor((t.subtotal) * POINT_RATE))} 적립 예정</div>`;
    $('#payBtn').textContent = `${won(t.total)} 결제하기`;
    return t;
  }
  renderSum();

  function applyPoints(v) {
    const max = calcTotals(lines, coupon).subtotal - calcTotals(lines, coupon).couponDiscount;
    let n = Math.max(0, Math.floor(Number(v) || 0));
    if (n > myPoints) { n = myPoints; toast(`보유 적립금은 ${won(myPoints)}이에요.`); }
    if (n > max) n = max;
    points = n;
    $('#pointInput').value = n || '';
    renderSum();
  }
  $('#pointInput').addEventListener('change', e => applyPoints(e.target.value));
  $('#pointAll').addEventListener('click', () => applyPoints(myPoints));

  $('#zip').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, ''); });

  // 쿠폰: 쿠폰함의 미사용 쿠폰 중 선택 (조건 미달은 비활성)
  const sub0 = calcTotals(lines).subtotal;
  function paintCoupons(selected) {
    const mine = CouponBox.usable();
    const ok = mine.filter(c => sub0 >= COUPONS[c.code].min);
    // 가장 할인이 큰 쿠폰을 기본 선택
    if (selected === undefined) {
      selected = ok.map(c => c.code).sort((a, b) => calcTotals(lines, b).couponDiscount - calcTotals(lines, a).couponDiscount)[0] || '';
    }
    $('#couponSel').innerHTML = `<option value="">${mine.length ? '쿠폰 사용 안 함' : '사용 가능한 쿠폰이 없어요'}</option>` + mine.map(c => {
      const def = COUPONS[c.code];
      const can = sub0 >= def.min;
      return `<option value="${c.code}" ${can ? '' : 'disabled'} ${c.code === selected ? 'selected' : ''}>${esc(def.label)}${can ? ` → -${won(calcTotals(lines, c.code).couponDiscount)}` : ` (${won(def.min)} 이상 구매 시)`}</option>`;
    }).join('');
    setCoupon(selected);
  }
  function setCoupon(code) {
    coupon = code || '';
    const msg = $('#couponMsg');
    msg.className = coupon ? 'success-text' : '';
    msg.textContent = coupon ? `✓ ${COUPONS[coupon].label} 쿠폰이 적용되었어요.` : '';
    applyPoints(points);
  }
  $('#couponSel').addEventListener('change', e => setCoupon(e.target.value));
  $('#couponBtn').addEventListener('click', () => {
    const code = $('#couponInput').value.trim().toUpperCase();
    const msg = $('#couponMsg');
    const r = CouponBox.give(code);
    if (r === 'invalid') { msg.className = 'error-text'; msg.textContent = '존재하지 않는 쿠폰 코드예요.'; return; }
    if (r === 'dup' && !CouponBox.usable().some(c => c.code === code)) { msg.className = 'error-text'; msg.textContent = '이미 사용한 쿠폰이에요.'; return; }
    $('#couponInput').value = '';
    if (sub0 < COUPONS[code].min) {
      paintCoupons(coupon);
      msg.className = 'error-text';
      msg.textContent = `쿠폰함에 등록했어요. 이 쿠폰은 ${won(COUPONS[code].min)} 이상 구매 시 쓸 수 있어요.`;
      return;
    }
    paintCoupons(code);
  });
  paintCoupons();

  // 저장된 배송지 선택
  $$('[data-addr]').forEach(b => b.addEventListener('click', () => {
    const a = AddressBook.list().find(x => x.id === b.dataset.addr) || { name: '', phone: '', zip: '', addr1: '', addr2: '' };
    $('#rName').value = a.name || (b.dataset.addr ? '' : user.name);
    $('#rPhone').value = a.phone || (b.dataset.addr ? '' : user.phone);
    $('#zip').value = a.zip; $('#addr1').value = a.addr1; $('#addr2').value = a.addr2;
    $$('[data-addr]').forEach(x => x.classList.toggle('active', x === b));
    if (!b.dataset.addr) $('#zip').focus();
  }));

  $('#payBtn').addEventListener('click', () => {
    const f = {
      name: $('#rName').value.trim(), phone: $('#rPhone').value.trim(), zip: $('#zip').value.trim(),
      addr1: $('#addr1').value.trim(), addr2: $('#addr2').value.trim(),
    };
    const addrErr = $('#addrErr');
    addrErr.textContent = '';
    $('#agreeErr').textContent = '';
    if (!f.name || !f.phone || !/^\d{5}$/.test(f.zip) || !f.addr1 || !f.addr2) {
      addrErr.textContent = '받는 분, 연락처, 우편번호(5자리), 주소를 모두 입력해 주세요.';
      addrErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!$('#agree').checked) {
      $('#agreeErr').textContent = '결제 동의에 체크해 주세요.';
      return;
    }

    // 결제 직전 재검증: 이미 결제된 주문서 / 재고 / 판매상태
    const pending = Store.get('checkout', null);
    if (!pending || !pending.items || !pending.items.length) {
      toast('이미 처리된 주문서예요. 주문내역을 확인해 주세요.', 'mypage.html', '주문내역');
      return;
    }
    for (const l of lines) {
      const cur = getProduct(l.id);
      if (!cur || cur.status === 'hidden' || cur.stock < l.qty) {
        modal({
          title: '구매할 수 없는 상품이 있어요',
          body: `<p><b>${esc(l.product.name)}</b><br>${!cur || cur.status === 'hidden' ? '판매가 중지되었어요.' : `남은 재고가 ${cur.stock}개예요.`}<br>장바구니에서 수량을 조정해 주세요.</p>`,
          okText: '장바구니로', cancelText: '',
          onOk: () => { location.href = 'cart.html'; },
        });
        return;
      }
    }
    if (points > (Auth.current().points || 0)) { toast('적립금이 부족해요.'); applyPoints(0); return; }
    if (coupon && !CouponBox.usable().some(c => c.code === coupon)) { toast('이미 사용된 쿠폰이에요. 다른 쿠폰을 선택해 주세요.'); paintCoupons(''); return; }

    const t = renderSum();
    const btn = $('#payBtn');
    btn.disabled = true;
    btn.textContent = '결제 승인 중...';

    setTimeout(() => {
      if ($('#saveAddr').checked || $('#defAddr').checked) {
        if (AddressBook.save(f, $('#defAddr').checked) === null) toast('배송지는 10개까지 저장할 수 있어요.');
      }
      const now = new Date();
      const no = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` + '-' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
      Orders.create({
        no,
        userEmail: user.email,
        date: now.toISOString(),
        items: lines.map(l => ({
          id: l.id, name: l.product.name, option: l.option, qty: l.qty, price: l.product.price,
          seller: l.product.seller, sellerEmail: l.product.sellerEmail, status: '결제완료', tracking: '', reviewed: false,
        })),
        pointsUsed: t.pointsUsed,
        address: f,
        memo: $('#memo').value,
        payMethod: $('input[name=pay]:checked').value,
        coupon,
        totals: t,
      });
      if (coupon) CouponBox.use(coupon, no);
      lines.forEach(l => Catalog.adjustStock(l.id, -l.qty));
      if (t.pointsUsed) Auth.addPoints(user.email, -t.pointsUsed);
      if (co.source === 'cart') Cart.removeKeys(lines.map(l => l.key));
      Store.remove('checkout');
      location.replace('order-complete.html?new=1&no=' + encodeURIComponent(no));
    }, 1000);
  });
})();
