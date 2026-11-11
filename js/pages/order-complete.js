(function () {
  if (!Auth.require()) return;
  const o = Orders.find(param('no'));
  if (!o || o.userEmail !== Auth.current().email) {
    $('#app').innerHTML = `<div class="empty card"><div class="ico">🧾</div><p>주문 정보를 찾을 수 없어요.</p><a class="btn btn-primary" href="mypage.html">주문내역 보기</a></div>`;
    return;
  }
  const isNew = param('new') === '1';
  const status = Orders.status(o);
  const a = o.address;
  const t = o.totals;
  const step = STATUS_FLOW.indexOf(status);
  document.title = (isNew ? '주문 완료' : '주문 상세') + ' | HAUL.';

  $('#app').innerHTML = `
    <div class="complete">
      ${isNew ? `<div class="ico">🎉</div><h1>주문이 완료되었습니다!</h1>` : `<h1 class="page-title">주문 상세</h1>`}
      <p class="muted">${fmtDate(o.date)} 주문 · 주문번호 <strong>${esc(o.no)}</strong></p>
      <div class="card">
        ${status === '주문취소'
          ? '<div class="center"><span class="status s-주문취소">주문취소</span><p class="muted">취소된 주문이에요. 사용한 적립금은 반환되었어요.</p></div>'
          : `<div class="timeline">${STATUS_FLOW.map((s, i) => `<div class="step ${i <= step ? 'done' : ''}"><div class="dot">${i <= step ? '✓' : i + 1}</div>${s}</div>`).join('')}</div>`}
      </div>
      <div class="card">
        <h3 style="margin-top:0">주문 상품</h3>
        ${o.items.map(i => {
          const p = getProduct(i.id);
          return `<div class="co-item">${p ? `<a href="product.html?id=${p.id}">${thumb(p, 'sm')}</a>` : '<div class="thumb sm" style="background:var(--bg)"><span class="emoji">📦</span></div>'}
            <div><div>${esc(i.name)}</div><div class="muted" style="font-size:13px">${i.option ? esc(i.option) + ' · ' : ''}${i.qty}개 · ${esc(i.seller || 'HAUL. 직영')}</div>
            ${i.tracking ? `<div class="muted" style="font-size:12px">송장: ${esc(i.tracking)}</div>` : ''}</div>
            <div style="text-align:right">${won(i.price * i.qty)}<br><span class="status s-${i.status}">${i.status}</span></div></div>`;
        }).join('')}
      </div>
      <div class="card">
        <table class="info-table">
          <tr><th>받는 분</th><td>${esc(a.name)} (${esc(a.phone)})</td></tr>
          <tr><th>배송지</th><td>[${esc(a.zip)}] ${esc(a.addr1)} ${esc(a.addr2)}</td></tr>
          <tr><th>요청사항</th><td>${esc(o.memo)}</td></tr>
          <tr><th>결제수단</th><td>${esc(o.payMethod)}</td></tr>
          <tr><th>상품금액</th><td>${won(t.subtotal)}</td></tr>
          ${t.couponDiscount ? `<tr><th>쿠폰할인</th><td>-${won(t.couponDiscount)} (${esc(o.coupon)})</td></tr>` : ''}
          ${t.pointsUsed ? `<tr><th>적립금 사용</th><td>-${won(t.pointsUsed)}</td></tr>` : ''}
          <tr><th>배송비</th><td>${t.shipping ? won(t.shipping) : '무료'}</td></tr>
          <tr><th>결제금액</th><td><strong style="font-size:20px;color:var(--primary)">${won(t.total)}</strong></td></tr>
        </table>
      </div>
      ${isNew ? '<p class="muted" style="font-size:13px">💡 데모: 직영 상품은 약 1분 뒤 배송완료로 바뀌어요. 그 후 마이페이지에서 구매확정·리뷰 작성을 할 수 있어요.</p>' : ''}
      <div class="row" style="margin-top:20px">
        <a class="btn btn-lg" href="mypage.html">주문내역 보기</a>
        <a class="btn btn-primary btn-lg" href="index.html">쇼핑 계속하기</a>
      </div>
    </div>`;
})();
