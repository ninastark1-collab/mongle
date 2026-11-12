(function () {
  if (!Auth.require()) return;
  const o = Orders.find(param('no'));
  if (!o || o.userEmail !== Auth.current().email) {
    $('#app').innerHTML = `<div class="empty card"><div class="ico">🧾</div><p>주문 정보를 찾을 수 없어요.</p><a class="btn btn-primary" href="mypage.html">${adopt ? "입양 신청 내역" : "주문내역 보기"}</a></div>`;
    return;
  }
  const isNew = param('new') === '1';
  const status = Orders.status(o);
  const a = o.address;
  const t = o.totals;
  // 일부만 반품된 주문은 남은 상품 기준으로 진행 단계 표시
  const step = STATUS_FLOW.indexOf(status);
  const adopt = o.items.some(i => i.live);
  document.title = (adopt ? (isNew ? '입양 신청 완료' : '입양 신청 상세') : (isNew ? '주문 완료' : '주문 상세')) + ' | PIKK.';

  $('#app').innerHTML = `
    <div class="complete">
      ${isNew
        ? (adopt ? `<div class="ico">💌</div><h1>입양 신청이 접수되었어요</h1><p>소중한 마음 고마워요. 분양자가 신청서를 정성껏 읽고 1일 안에 연락드릴게요.</p>` : `<div class="ico">🎉</div><h1>주문이 완료되었습니다!</h1>`)
        : `<h1 class="page-title">${adopt ? '입양 신청 상세' : '주문 상세'}</h1>`}
      <p class="muted">${fmtDate(o.date)} ${adopt ? "신청 · 신청번호" : "주문 · 주문번호"} <strong>${esc(o.no)}</strong></p>
      <div class="card">
        ${step < 0
          ? `<div class="center"><span class="status s-${status}">${statusLabel(status, adopt)}</span><p class="muted">${status === '주문취소' ? '취소된 주문이에요. 사용한 적립금과 쿠폰은 반환되었어요.' : status === '반품요청' ? '반품 신청이 접수되었어요. 판매자 확인 후 환불돼요.' : '반품이 완료되어 환불되었어요.'}</p></div>`
          : `<div class="timeline">${STATUS_FLOW.map((s, i) => `<div class="step ${i <= step ? 'done' : ''}"><div class="dot">${i <= step ? '✓' : i + 1}</div>${statusLabel(s, adopt)}</div>`).join('')}</div>`}
      </div>
      <div class="card">
        <h3 style="margin-top:0">${adopt ? '함께할 친구' : '주문 상품'}</h3>
        ${o.items.map(i => {
          const p = getProduct(i.id);
          return `<div class="co-item">${p ? `<a href="product.html?id=${p.id}">${thumb(p, 'sm')}</a>` : '<div class="thumb sm" style="background:var(--bg)"><span class="emoji">📦</span></div>'}
            <div><div>${esc(i.name)}</div><div class="muted" style="font-size:13px">${i.option ? esc(i.option) + ' · ' : ''}${i.qty}개 · ${esc(i.seller || 'PIKK. 직영')}</div>
            ${i.tracking ? `<div class="muted" style="font-size:12px">송장: ${esc(i.tracking)}</div>` : ''}
            ${i.returnReason ? `<div class="muted" style="font-size:12px">반품 사유: ${esc(i.returnReason)}</div>` : ''}
            ${i.refund ? `<div class="muted" style="font-size:12px">환불 ${won(i.refund.cash)}${i.refund.points ? ` + ${i.refund.points.toLocaleString()}P` : ''}${i.refund.fee ? ` (반품배송비 ${won(i.refund.fee)} 차감)` : ''}</div>` : ''}</div>
            <div style="text-align:right">${won(i.price * i.qty)}<br><span class="status s-${i.status}">${statusLabel(i.status, i.live)}</span></div></div>`;
        }).join('')}
      </div>
      <div class="card">
        <table class="info-table">
          <tr><th>${adopt ? "보호자" : "받는 분"}</th><td>${esc(a.name)} (${esc(a.phone)})</td></tr>
          <tr><th>${adopt ? "주소" : "배송지"}</th><td>[${esc(a.zip)}] ${esc(a.addr1)} ${esc(a.addr2)}</td></tr>
          ${o.handover ? `<tr><th>인계 방법</th><td>🐾 ${esc(o.handover)}</td></tr>` : ''}
          ${o.application ? `<tr><th>입양 신청서</th><td>${esc(o.application.home)} · ${esc(o.application.experience)} · 혼자 있는 시간 ${esc(o.application.alone)}<div class="muted" style="font-size:13px;margin-top:4px">“${esc(o.application.why)}”</div></td></tr>` : ''}
          <tr><th>요청사항</th><td>${esc(o.memo)}</td></tr>
          <tr><th>결제수단</th><td>${esc(o.payMethod)}</td></tr>
          <tr><th>${adopt ? "분양비·상품금액" : "상품금액"}</th><td>${won(t.subtotal)}</td></tr>
          ${t.couponDiscount ? `<tr><th>쿠폰할인</th><td>-${won(t.couponDiscount)} (${esc(o.coupon)})</td></tr>` : ''}
          ${t.pointsUsed ? `<tr><th>적립금 사용</th><td>-${won(t.pointsUsed)}</td></tr>` : ''}
          <tr><th>배송비</th><td>${t.shipping ? won(t.shipping) : '무료'}</td></tr>
          <tr><th>결제금액</th><td><strong style="font-size:20px;color:var(--primary)">${won(t.total)}</strong></td></tr>
        </table>
      </div>
      ${isNew ? '<p class="muted" style="font-size:13px">💡 데모: 직영 상품·분양은 약 1분 뒤 인계(배송) 완료로 바뀌어요. 그 후 마이페이지에서 입양 완료(구매확정)와 후기를 남길 수 있어요.</p>' : ''}
      <div class="row" style="margin-top:20px">
        <a class="btn btn-lg" href="mypage.html">${adopt ? "입양 신청 내역" : "주문내역 보기"}</a>
        <a class="btn btn-primary btn-lg" href="index.html">${adopt ? "다른 친구들도 만나보기" : "쇼핑 계속하기"}</a>
      </div>
    </div>`;
})();
