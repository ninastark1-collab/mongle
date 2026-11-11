(function () {
  if (!Auth.require()) return;
  const user = Auth.current();
  const co = Store.get('checkout', null);
  const lines = (co && co.items || []).map(i => ({ ...i, product: getProduct(i.id) })).filter(l => l.product);

  if (!lines.length) {
    $('#app').innerHTML = `<div class="empty card"><div class="ico">🧾</div><p>주문할 상품이 없어요.</p><a class="btn btn-primary" href="cart.html">장바구니로 가기</a></div>`;
    return;
  }

  const addr = user.address || {};
  let coupon = '';
  let points = 0;
  const myPoints = user.points || 0;

  $('#app').innerHTML = `
    <h1 class="page-title">주문/결제</h1>
    <div class="cart-layout">
      <div>
        <section class="card co-section">
          <h2>배송지</h2>
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
          <label class="check" style="font-size:14px"><input type="checkbox" id="saveAddr" checked> 기본 배송지로 저장</label>
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
          <div class="coupon-row"><input class="input" id="couponInput" placeholder="쿠폰 코드 입력 (예: WELCOME10)"><button class="btn" id="couponBtn">적용</button></div>
          <div id="couponMsg"></div>
          <div class="demo-note">사용 가능한 데모 쿠폰: <strong>WELCOME10</strong> (10%, 최대 1만원) · <strong>HAUL5000</strong> (3만원 이상 5,000원)</div>
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

  $('#couponBtn').addEventListener('click', () => {
    const code = $('#couponInput').value.trim().toUpperCase();
    const msg = $('#couponMsg');
    const c = COUPONS[code];
    const sub = calcTotals(lines).subtotal;
    if (!c) {
      coupon = '';
      msg.className = 'error-text';
      msg.textContent = '존재하지 않는 쿠폰 코드예요.';
    } else if (sub < c.min) {
      coupon = '';
      msg.className = 'error-text';
      msg.textContent = `${won(c.min)} 이상 구매 시 사용할 수 있어요.`;
    } else {
      coupon = code;
      msg.className = 'success-text';
      msg.textContent = `✓ ${c.label} 쿠폰이 적용되었어요.`;
    }
    applyPoints(points);
  });

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

    const t = renderSum();
    const btn = $('#payBtn');
    btn.disabled = true;
    btn.textContent = '결제 승인 중...';

    setTimeout(() => {
      if ($('#saveAddr').checked) Auth.updateCurrent({ address: f });
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
      lines.forEach(l => Catalog.adjustStock(l.id, -l.qty));
      if (t.pointsUsed) Auth.addPoints(user.email, -t.pointsUsed);
      if (co.source === 'cart') Cart.removeKeys(lines.map(l => l.key));
      Store.remove('checkout');
      location.replace('order-complete.html?new=1&no=' + encodeURIComponent(no));
    }, 1000);
  });
})();
