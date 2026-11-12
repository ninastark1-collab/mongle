(function () {
  if (!Auth.require()) return;
  const EMOJIS = ['🐶', '🐱', '🐹', '🐰', '🦔', '🐦', '🦜', '🐠', '🐟', '🦐', '🦎', '🐍', '🐢', '🪲', '🦀', '🦴', '🛏️', '🥣', '🧸', '📦'];
  const TABS = [['dash', '대시보드'], ['products', '상품관리'], ['new', '+ 상품등록'], ['orders', '주문/배송'], ['qna', '상품문의'], ['store', '스토어정보']];
  let tab = TABS.some(t => t[0] === param('tab')) ? param('tab') : 'dash';
  let editId = param('edit') ? Number(param('edit')) : null;
  let orderFilter = '전체';

  const me = () => Auth.current();

  // ---------- 판매자 등록 ----------
  function renderJoin() {
    $('#app').innerHTML = `
      <div class="auth-box" style="max-width:520px">
        <div class="seller-top"><div class="eyebrow">PIKK. for sellers</div><h1>셀러 등록하기</h1><div>3분이면 내 상품을 판매할 수 있어요. 수수료 0% (데모)</div></div>
        <form class="card" id="joinForm" novalidate>
          <div class="field"><label for="storeName">스토어 이름</label><input class="input" id="storeName" maxlength="20" placeholder="예: 행복한 과일가게"><div class="error-text" data-err="storeName"></div></div>
          <div class="field"><label for="bizNo">사업자등록번호 (데모: 아무 숫자 10자리)</label><input class="input" id="bizNo" inputmode="numeric" placeholder="123-45-67890"><div class="error-text" data-err="bizNo"></div></div>
          <div class="field"><label for="csPhone">고객 문의 연락처</label><input class="input" id="csPhone" type="tel" value="${esc(me().phone || '')}"><div class="error-text" data-err="csPhone"></div></div>
          <label class="check" style="font-size:14px"><input type="checkbox" id="sAgree"> [필수] 판매자 이용약관 및 전자상거래법 준수에 동의합니다</label>
          <div class="error-text" data-err="sAgree"></div>
          <button class="btn btn-primary btn-lg btn-block" style="margin-top:16px">판매자 등록하기</button>
        </form>
      </div>`;
    $('#bizNo').addEventListener('input', e => {
      const d = e.target.value.replace(/\D/g, '').slice(0, 10);
      e.target.value = d.length < 4 ? d : d.length < 6 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    });
    $('#joinForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = { storeName: $('#storeName').value.trim(), bizNo: $('#bizNo').value.trim(), csPhone: $('#csPhone').value.trim() };
      const err = {};
      if (v.storeName.length < 2) err.storeName = '스토어 이름을 2자 이상 입력해 주세요.';
      else if (Object.values(Auth.users()).some(u => u.seller && u.seller.storeName === v.storeName)) err.storeName = '이미 사용 중인 스토어 이름이에요.';
      if (!/^\d{3}-\d{2}-\d{5}$/.test(v.bizNo)) err.bizNo = '사업자등록번호 10자리를 입력해 주세요.';
      if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.csPhone)) err.csPhone = '연락처를 정확히 입력해 주세요.';
      if (!$('#sAgree').checked) err.sAgree = '약관에 동의해 주세요.';
      $$('[data-err]').forEach(el => { el.textContent = err[el.dataset.err] || ''; });
      if (Object.keys(err).length) return;
      Auth.updateCurrent({ seller: { ...v, createdAt: new Date().toISOString() } });
      toast('판매자 등록이 완료되었어요! 첫 상품을 등록해 보세요.');
      go('new');
    });
  }

  // ---------- 공통 틀 ----------
  function render() {
    const u = me();
    if (!u.seller) return renderJoin();
    const newOrders = Orders.forSeller(u.email).filter(r => ['결제완료', '반품요청'].includes(r.item.status)).length;
    const openQna = myQna().filter(q => !q.answer).length;
    const badge = n => (n ? ` <span class="badge-count" style="position:static;display:inline-flex">${n}</span>` : '');
    const body = { dash: dashHtml, products: productsHtml, new: formHtml, orders: ordersHtml, qna: qnaHtml, store: storeHtml }[tab]();
    $('#app').innerHTML = `
      <div class="seller-top"><div class="eyebrow">Seller center</div><h1>${esc(u.seller.storeName)}</h1><div>판매자 ${esc(u.name)}님 · 등록일 ${fmtDate(u.seller.createdAt)}</div></div>
      <div class="my-layout">
        <aside class="card my-menu">
          ${TABS.map(([k, v]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${v}${k === 'orders' ? badge(newOrders) : k === 'qna' ? badge(openQna) : ''}</button>`).join('')}
          <hr style="border:0;border-top:1px solid var(--line)">
          <a class="btn btn-sm btn-block" href="index.html">쇼핑몰로 가기</a>
        </aside>
        <section class="card" style="min-width:0">${body}</section>
      </div>`;
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
    ({ products: bindProducts, new: bindForm, orders: bindOrders, qna: bindQna, store: bindStore, dash: bindDash })[tab]();
  }
  function go(t, extra = '') {
    tab = t;
    if (!extra.includes('edit=')) editId = null;
    history.replaceState(null, '', 'seller.html?tab=' + t + extra);
    render();
    scrollTo(0, 0);
  }

  const myProducts = () => Catalog.bySeller(me().email);
  const myQna = () => { const ids = myProducts().map(p => p.id); return QnA.all().filter(q => ids.includes(q.productId)); };

  // ---------- 대시보드 ----------
  function dashHtml() {
    const rows = Orders.forSeller(me().email);
    const live = rows.filter(r => !['주문취소', '반품완료'].includes(r.item.status));
    const sales = live.reduce((s, r) => s + r.item.price * r.item.qty, 0);
    const prods = myProducts();
    const low = prods.filter(p => p.stock <= 5);
    const cnt = s => rows.filter(r => r.item.status === s).length;
    return `
      <h1 class="page-title" style="margin-top:0">대시보드</h1>
      <div class="stats">
        <div class="stat"><div class="label">누적 매출</div><div class="value">${won(sales)}</div></div>
        <div class="stat"><div class="label">신규 주문 (발주 대기)</div><div class="value" style="color:var(--accent)">${cnt('결제완료')}건</div></div>
        <div class="stat"><div class="label">배송 중</div><div class="value">${cnt('배송준비중') + cnt('배송중')}건</div></div>
        <div class="stat"><div class="label">등록 상품</div><div class="value">${prods.length}개</div></div>
      </div>
      <div class="settle">
        <div><span class="muted">정산 완료 (구매확정)</span><b>${won(rows.filter(r => r.item.status === '구매확정').reduce((s, r) => s + r.item.price * r.item.qty, 0))}</b></div>
        <div><span class="muted">정산 예정 (배송~구매확정 전)</span><b>${won(rows.filter(r => ['결제완료', '배송준비중', '배송중', '배송완료'].includes(r.item.status)).reduce((s, r) => s + r.item.price * r.item.qty, 0))}</b></div>
        <div><span class="muted">반품 환불</span><b>${won(rows.filter(r => r.item.refund).reduce((s, r) => s + r.item.refund.cash, 0))}</b></div>
        <div><span class="muted">판매 수수료</span><b>0% (데모)</b></div>
      </div>
      ${cnt('반품요청') ? `<div class="free-hint" style="background:#fff4d6;color:#8a5a00">↩️ 처리할 반품 요청 ${cnt('반품요청')}건 <button class="link-btn" data-go="orders">주문/배송에서 확인 →</button></div>` : ''}
      ${low.length ? `<div class="free-hint">⚠️ 재고가 부족한 상품 ${low.length}개: ${low.map(p => `${esc(p.name)}(${p.stock}개)`).join(', ')} <button class="link-btn" data-go="products">재고 관리 →</button></div>` : ''}
      ${!prods.length ? `<div class="empty"><div class="ico">📦</div><p>아직 등록한 상품이 없어요.</p><button class="btn btn-primary" data-go="new">첫 상품 등록하기</button></div>` : `
      <h3>최근 주문</h3>
      ${rows.length ? orderTable(rows.slice(0, 5), false) : '<p class="muted">아직 주문이 없어요. 상품 페이지를 공유해 보세요!</p>'}`}`;
  }
  function bindDash() { $$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go))); }

  // ---------- 상품 관리 ----------
  function productsHtml() {
    const list = myProducts();
    if (!list.length) return `<h1 class="page-title" style="margin-top:0">상품관리</h1><div class="empty"><div class="ico">📦</div><p>등록한 상품이 없어요.</p><button class="btn btn-primary" data-go="new">상품 등록하기</button></div>`;
    return `<div class="toolbar"><h1 class="page-title" style="margin:0">상품관리 (${list.length})</h1><button class="btn btn-primary btn-sm" data-go="new">➕ 상품등록</button></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th></th><th>상품명</th><th>판매가</th><th>재고</th><th>판매량</th><th>리뷰</th><th>상태</th><th></th></tr></thead>
        <tbody>${list.map(p => `<tr data-id="${p.id}">
          <td>${thumb(p, 'sm')}</td>
          <td><a href="product.html?id=${p.id}" style="font-weight:600">${esc(p.name)}</a><div class="muted" style="font-size:12px">${getCategory(p.category).name} · No.${p.id}</div></td>
          <td>${won(p.price)}${p.discount ? `<div class="discount" style="font-size:12px">${p.discount}%</div>` : ''}</td>
          <td><input class="input stock-input" type="number" min="0" max="9999" value="${p.stock}" style="width:80px;padding:6px" aria-label="재고"></td>
          <td>${p.sold || 0}</td>
          <td>${p.reviewCount ? `★ ${p.avgRating} (${p.reviewCount})` : '-'}</td>
          <td>${p.status === 'hidden' ? '<span class="chip off">판매중지</span>' : p.soldOut ? '<span class="chip off">품절</span>' : '<span class="chip on">판매중</span>'}</td>
          <td style="white-space:nowrap"><button class="btn btn-sm" data-edit>수정</button> <button class="btn btn-sm" data-toggle>${p.status === 'hidden' ? '판매재개' : '판매중지'}</button> <button class="btn btn-sm" data-del>삭제</button></td>
        </tr>`).join('')}</tbody>
      </table></div>
      <p class="muted" style="font-size:13px">재고 수량을 바꾸면 바로 저장돼요. 재고가 0이면 고객 화면에 '일시품절'로 표시됩니다.</p>`;
  }
  function bindProducts() {
    $$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    $$('tr[data-id]').forEach(tr => {
      const id = Number(tr.dataset.id);
      $('.stock-input', tr).addEventListener('change', e => {
        const n = Math.max(0, Math.min(9999, parseInt(e.target.value, 10) || 0));
        Catalog.setFields(id, { stock: n });
        toast(`재고를 ${n}개로 변경했어요.`);
        render();
      });
      $('[data-edit]', tr).addEventListener('click', () => { editId = id; go('new', '&edit=' + id); });
      $('[data-toggle]', tr).addEventListener('click', () => {
        const hidden = getProduct(id).status === 'hidden';
        Catalog.setFields(id, { status: hidden ? 'on' : 'hidden' });
        toast(hidden ? '판매를 재개했어요.' : '판매를 중지했어요. 고객에게 노출되지 않아요.');
        render();
      });
      $('[data-del]', tr).addEventListener('click', () => modal({
        title: '상품 삭제',
        body: `<p>'${esc(getProduct(id).name)}' 상품을 삭제할까요?<br><span class="muted" style="font-size:13px">기존 주문 내역은 유지됩니다.</span></p>`,
        okText: '삭제',
        onOk: () => { Catalog.setFields(id, { deleted: true }); toast('상품을 삭제했어요.'); render(); },
      }));
    });
  }

  // ---------- 상품 등록/수정 ----------
  function formHtml() {
    const p = editId ? myProducts().find(x => x.id === editId) : null;
    if (editId && !p) { editId = null; }
    const v = p || { name: '', category: 'dog', price: '', originalPrice: '', stock: 1, options: [], emoji: '🐶', fast: false, freeShip: true, description: '', image: '', live: true, pet: {} };
    const pet = v.pet || {};
    return `<h1 class="page-title" style="margin-top:0">${p ? '상품 수정' : '상품 등록'}</h1>
      <form id="pForm" novalidate>
        <div class="form-grid">
          <div class="field full"><label class="check"><input type="checkbox" id="pLive" ${v.live ? 'checked' : ''}> 🐾 살아있는 반려동물 분양 (체크 해제 시 일반 용품)</label></div>
          <div class="field full pet-fields ${v.live ? '' : 'hidden'}">
            <div class="form-grid">
              <div class="field"><label for="pAge">나이 *</label><input class="input" id="pAge" maxlength="20" value="${esc(pet.age || '')}" placeholder="예: 3개월"><div class="error-text" data-err="age"></div></div>
              <div class="field"><label for="pHealth">건강·접종 *</label><input class="input" id="pHealth" maxlength="40" value="${esc(pet.health || '')}" placeholder="예: 종합백신 2차 · 구충 완료"><div class="error-text" data-err="health"></div></div>
              <div class="field"><label for="pLife">평균 수명</label><input class="input" id="pLife" maxlength="20" value="${esc(pet.lifespan || '')}" placeholder="예: 12~15년"></div>
              <div class="field"><label for="pSize">다 자란 크기</label><input class="input" id="pSize" maxlength="40" value="${esc(pet.size || '')}" placeholder="예: 3kg 소형견"></div>
              <div class="field"><label for="pCare">키우기 난이도</label><select class="select" id="pCare">${Object.values(CARE).map(c => `<option ${c === pet.care ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            </div>
            <p class="muted" style="font-size:12px;margin:0">강아지·고양이는 생후 2개월 이상만 분양할 수 있고, 동물판매업 등록이 필요해요. 국제 거래 규제(CITES) 종과 생태계교란종은 등록할 수 없어요.</p>
          </div>
          <div class="field full"><label for="pName">상품명 *</label><input class="input" id="pName" maxlength="60" value="${esc(v.name)}" placeholder="예: 제주 감귤 5kg 가정용"><div class="error-text" data-err="name"></div></div>
          <div class="field"><label for="pCat">카테고리 *</label><select class="select" id="pCat">${CATEGORIES.map(c => `<option value="${c.id}" ${c.id === v.category ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select></div>
          <div class="field"><label for="pStock">재고 수량 *</label><input class="input" id="pStock" type="number" min="0" max="9999" value="${v.stock}"><div class="error-text" data-err="stock"></div></div>
          <div class="field"><label for="pPrice">판매가 (원) *</label><input class="input" id="pPrice" type="number" min="100" step="10" value="${v.price}" placeholder="12900"><div class="error-text" data-err="price"></div></div>
          <div class="field"><label for="pOrigin">정가 (원, 할인 표시용)</label><input class="input" id="pOrigin" type="number" min="0" step="10" value="${v.originalPrice && v.originalPrice !== v.price ? v.originalPrice : ''}" placeholder="비우면 할인 없음"><div class="error-text" data-err="origin"></div><div class="muted" id="discPreview" style="font-size:13px"></div></div>
          <div class="field full"><label for="pOptions">옵션 (쉼표로 구분, 없으면 비워두세요)</label><input class="input" id="pOptions" value="${esc(v.options.join(', '))}" placeholder="예: 블랙 / M, 블랙 / L, 화이트 / M"></div>
          <div class="field"><label>대표 이미지</label>
            <input type="file" id="pImage" accept="image/png,image/jpeg,image/webp,image/gif">
            <div class="muted" style="font-size:12px">이미지가 없으면 아래 아이콘이 표시돼요. (자동으로 600px로 줄여 저장)</div>
            <div id="imgBox" style="margin-top:8px"></div>
          </div>
          <div class="field"><label for="pEmoji">대체 아이콘</label><select class="select" id="pEmoji">${EMOJIS.map(e => `<option ${e === v.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
          <div class="field full"><label for="pDesc">상세 설명 *</label><textarea class="input" id="pDesc" rows="5" maxlength="2000" placeholder="상품의 특징, 소재, 크기, 사용법 등을 적어주세요.">${esc(v.description)}</textarea><div class="error-text" data-err="desc"></div></div>
          <div class="field full" style="display:flex;gap:20px;flex-wrap:wrap">
            <label class="check"><input type="checkbox" id="pFast" ${v.fast ? 'checked' : ''}> 🚀 내일도착 가능</label>
            <label class="check"><input type="checkbox" id="pFree" ${v.freeShip ? 'checked' : ''}> 무료배송</label>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          ${p ? '<button type="button" class="btn" data-go="products">취소</button>' : ''}
          <button class="btn btn-primary btn-lg">${p ? '수정 저장' : '상품 등록하기'}</button>
        </div>
      </form>`;
  }

  let imageData = '';
  function bindForm() {
    $$('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
    const p = editId ? getProduct(editId) : null;
    imageData = p ? p.image || '' : '';
    const showImg = () => {
      $('#imgBox').innerHTML = imageData ? `<img class="img-preview" src="${safeImage(imageData)}" alt="미리보기"><br><button type="button" class="link-btn" id="rmImg">이미지 삭제</button>` : '';
      const rm = $('#rmImg');
      if (rm) rm.addEventListener('click', () => { imageData = ''; $('#pImage').value = ''; showImg(); });
    };
    showImg();
    const disc = () => {
      const pr = Number($('#pPrice').value), or = Number($('#pOrigin').value);
      $('#discPreview').textContent = pr > 0 && or > pr ? `할인율 ${Math.round((1 - pr / or) * 100)}% 로 표시돼요.` : '';
    };
    $('#pLive').addEventListener('change', e => $('.pet-fields').classList.toggle('hidden', !e.target.checked));
    $('#pPrice').addEventListener('input', disc);
    $('#pOrigin').addEventListener('input', disc);
    disc();

    $('#pImage').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { toast('PNG, JPG, WEBP, GIF 이미지만 올릴 수 있어요.'); e.target.value = ''; return; }
      if (file.size > 10 * 1024 * 1024) { toast('10MB 이하 이미지만 올릴 수 있어요.'); e.target.value = ''; return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        imageData = c.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(url);
        showImg();
      };
      img.onerror = () => { toast('이미지를 읽을 수 없어요.'); URL.revokeObjectURL(url); };
      img.src = url;
    });

    $('#pForm').addEventListener('submit', e => {
      e.preventDefault();
      const f = {
        name: $('#pName').value.trim().replace(/\s+/g, ' '),
        category: $('#pCat').value,
        price: Math.round(Number($('#pPrice').value)),
        originalPrice: Math.round(Number($('#pOrigin').value) || 0),
        stock: Number($('#pStock').value),
        options: [...new Set($('#pOptions').value.split(',').map(s => s.trim()).filter(Boolean))].slice(0, 30),
        emoji: $('#pEmoji').value,
        description: $('#pDesc').value.trim(),
        fast: $('#pFast').checked,
        freeShip: $('#pFree').checked,
        live: $('#pLive').checked,
      };
      if (f.live) {
        f.pet = { age: $('#pAge').value.trim(), health: $('#pHealth').value.trim(), lifespan: $('#pLife').value.trim() || '-', size: $('#pSize').value.trim() || '-', care: $('#pCare').value };
        f.freeShip = true; f.fast = false;
      }
      const err = {};
      if (f.name.length < 2) err.name = '상품명을 2자 이상 입력해 주세요.';
      if (!Number.isFinite(f.price) || f.price < 100 || f.price > 100000000) err.price = '판매가는 100원 ~ 1억원 사이로 입력해 주세요.';
      if (f.originalPrice && f.originalPrice < f.price) err.origin = '정가는 판매가보다 크거나 같아야 해요.';
      if (!Number.isInteger(f.stock) || f.stock < 0 || f.stock > 9999) err.stock = '재고는 0 ~ 9999 사이 정수로 입력해 주세요.';
      if (f.description.length < 10) err.desc = '상세 설명을 10자 이상 입력해 주세요.';
      if (f.live && !f.pet.age) err.age = '나이를 입력해 주세요.';
      if (f.live && !f.pet.health) err.health = '건강·접종 정보를 입력해 주세요.';
      if (f.live && f.category === 'supplies') err.name = '반려동물은 용품·사료가 아닌 동물 분류를 골라 주세요.';
      $$('[data-err]').forEach(el => { el.textContent = err[el.dataset.err] || ''; });
      if (Object.keys(err).length) { $('.error-text:not(:empty)').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

      const u = me();
      const isEdit = !!editId;
      const id = isEdit ? editId : Catalog.nextId();
      const ok = Catalog.save({
        ...f,
        id,
        originalPrice: f.originalPrice || f.price,
        image: imageData,
        seller: u.seller.storeName,
        sellerEmail: u.email,
        gradient: GRADIENTS[id % GRADIENTS.length],
        ...(isEdit ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString(), rating: 0, reviews: 0, sold: 0, status: 'on' }),
      });
      if (!ok) { toast('저장 공간이 부족해요. 이미지를 빼거나 다른 상품을 삭제해 주세요.'); return; }
      toast(isEdit ? '상품을 수정했어요.' : '상품을 등록했어요! 지금 바로 판매가 시작됩니다.', 'product.html?id=' + id, '상품 보기');
      go('products');
    });
  }

  // ---------- 주문/배송 ----------
  const NEXT = { 결제완료: ['배송준비중', '발주확인'], 배송준비중: ['배송중', '발송처리'], 배송중: ['배송완료', '배송완료 처리'], 반품요청: ['반품완료', '반품 승인'] };
  function orderTable(rows, withActions) {
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>주문일</th><th>주문번호</th><th>상품</th><th>금액</th><th>구매자 / 배송지</th><th>상태</th>${withActions ? '<th>처리</th>' : ''}</tr></thead>
      <tbody>${rows.map(({ order: o, item: it, idx }) => `<tr>
        <td style="white-space:nowrap">${fmtDate(o.date)}</td>
        <td style="font-size:12px">${esc(o.no)}</td>
        <td>${esc(it.name)}${it.option ? `<div class="muted" style="font-size:12px">${esc(it.option)}</div>` : ''}<div class="muted" style="font-size:12px">${it.qty}개</div></td>
        <td style="white-space:nowrap">${won(it.price * it.qty)}</td>
        <td style="font-size:13px">${o.application && it.live ? `<div style="margin-bottom:4px"><b>💌 입양 신청서</b> ${esc(o.application.home)} · ${esc(o.application.experience)} · 혼자 ${esc(o.application.alone)}<div class="muted">“${esc(o.application.why)}”</div></div>` : ''}${esc(o.address.name)} ${esc(o.address.phone)}<div class="muted">[${esc(o.address.zip)}] ${esc(o.address.addr1)} ${esc(o.address.addr2)}</div><div class="muted">요청: ${esc(o.memo)}</div></td>
        <td><span class="status s-${it.status}">${statusLabel(it.status, it.live)}</span>${it.tracking ? `<div class="muted" style="font-size:11px">송장 ${esc(it.tracking)}</div>` : ''}${it.returnReason ? `<div class="muted" style="font-size:11px">사유: ${esc(it.returnReason)}${it.returnDetail ? ' · ' + esc(it.returnDetail) : ''}</div>` : ''}</td>
        ${withActions ? `<td>${NEXT[it.status] ? `<button class="btn btn-sm btn-primary" data-next="${esc(o.no)}" data-idx="${idx}" data-from="${it.status}">${it.live ? ({ 결제완료: '신청서 검토·승인', 배송준비중: '인계 출발', 배송중: '인계 완료', 반품요청: '건강보증 승인' })[it.status] : NEXT[it.status][1]}</button>` : '<span class="muted" style="font-size:12px">-</span>'}</td>` : ''}
      </tr>`).join('')}</tbody></table></div>`;
  }
  function ordersHtml() {
    const all = Orders.forSeller(me().email);
    const filters = ['전체', '결제완료', '배송준비중', '배송중', '배송완료', '구매확정', '반품요청', '반품완료', '주문취소'];
    const rows = orderFilter === '전체' ? all : all.filter(r => r.item.status === orderFilter);
    return `<h1 class="page-title" style="margin-top:0">주문/배송 관리</h1>
      <div class="sort-tabs" style="margin-bottom:12px">${filters.map(f => `<button data-filter="${f}" class="${f === orderFilter ? 'active' : ''}">${f} (${f === '전체' ? all.length : all.filter(r => r.item.status === f).length})</button>`).join('')}</div>
      ${rows.length ? orderTable(rows, true) : '<div class="empty"><div class="ico">🚚</div><p>해당하는 주문이 없어요.</p></div>'}
      <p class="muted" style="font-size:13px">결제완료 → <b>발주확인</b> → 배송준비중 → <b>발송처리</b>(송장 입력) → 배송중 → <b>배송완료 처리</b>. 구매자가 구매확정하면 정산 대상이 됩니다.</p>`;
  }
  function bindOrders() {
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => { orderFilter = b.dataset.filter; render(); }));
    $$('[data-next]').forEach(b => b.addEventListener('click', () => {
      const no = b.dataset.next, idx = Number(b.dataset.idx);
      const o = Orders.find(no);
      const it = o.items[idx];
      if (it.status === '주문취소') { toast('구매자가 취소한 주문이에요.'); render(); return; }
      // 버튼이 표시된 뒤 상태가 바뀐 경우 (중복 클릭·다른 탭에서 처리)
      if (!NEXT[it.status] || it.status !== b.dataset.from) { toast('이미 처리된 주문이에요.'); render(); return; }
      const [next] = NEXT[it.status];
      if (next === '반품완료') {
        const r = Orders.refundFor(o, it);
        modal({
          title: '반품 승인',
          body: `<p><b>${esc(it.name)}</b> ${it.qty}개<br>사유: ${esc(it.returnReason)}${it.returnDetail ? `<br><span class="muted">${esc(it.returnDetail)}</span>` : ''}</p>
            <div class="free-hint">구매자에게 ${won(r.cash)} 환불${r.points ? ` + 적립금 ${r.points.toLocaleString()}P 반환` : ''}${r.fee ? ` (반품배송비 ${won(r.fee)} 차감)` : ''}<br>재고 ${it.qty}개가 복구돼요.</div>`,
          okText: '반품 승인',
          onOk: () => {
            toast(Orders.approveReturn(no, idx) ? '반품을 승인하고 환불 처리했어요.' : '이미 처리된 반품이에요.');
            render();
          },
        });
        return;
      }
      if (next === '배송중') {
        modal({
          title: '발송 처리',
          body: `<div class="field"><label for="trk">택배사 / 송장번호</label><input class="input" id="trk" placeholder="예: 픽택배 1234567890" maxlength="30"></div><div class="error-text" id="trkErr"></div>`,
          okText: '발송 처리',
          onOk: w => {
            const t = $('#trk', w).value.trim();
            if (t.length < 5) { $('#trkErr', w).textContent = '송장번호를 입력해 주세요.'; return false; }
            toast(Orders.setItemStatus(no, idx, '배송중', t) ? '발송 처리했어요.' : '이미 처리되었거나 취소된 주문이에요.');
            render();
          },
        });
      } else {
        toast(Orders.setItemStatus(no, idx, next) ? `'${next}' 상태로 변경했어요.` : '이미 처리되었거나 취소된 주문이에요.');
        render();
      }
    }));
  }

  // ---------- 상품 문의 ----------
  function qnaHtml() {
    const list = myQna();
    return `<h1 class="page-title" style="margin-top:0">상품문의 (${list.length})</h1>
      ${list.length ? list.map(q => `<div class="qna">
        <div><span class="chip ${q.answer ? 'on' : 'off'}">${q.answer ? '답변완료' : '답변대기'}</span> <a href="product.html?id=${q.productId}&tab=qna" class="muted" style="font-size:13px">${esc(getProduct(q.productId)?.name || '삭제된 상품')}</a></div>
        <p style="margin:6px 0"><b>Q.</b> ${esc(q.question)}</p>
        <div class="muted" style="font-size:12px">${esc(q.name)} · ${fmtDate(q.date)}</div>
        ${q.answer ? `<div class="a"><b>A.</b> ${esc(q.answer)}</div>` : `<button class="btn btn-sm btn-primary" data-answer="${q.id}" style="margin-top:8px">답변하기</button>`}
      </div>`).join('') : '<div class="empty"><div class="ico">💬</div><p>아직 받은 문의가 없어요.</p></div>'}`;
  }
  function bindQna() {
    $$('[data-answer]').forEach(b => b.addEventListener('click', () => modal({
      title: '문의 답변',
      body: `<textarea class="input" id="ans" rows="4" maxlength="1000" placeholder="고객님께 친절하게 답변해 주세요."></textarea><div class="error-text" id="ansErr"></div>`,
      okText: '답변 등록',
      onOk: w => {
        const t = $('#ans', w).value.trim();
        if (t.length < 2) { $('#ansErr', w).textContent = '답변을 입력해 주세요.'; return false; }
        QnA.answer(b.dataset.answer, t);
        toast('답변을 등록했어요.');
        render();
      },
    })));
  }

  // ---------- 스토어 정보 ----------
  function storeHtml() {
    const s = me().seller;
    return `<h1 class="page-title" style="margin-top:0">스토어 정보</h1>
      <table class="info-table">
        <tr><th>스토어 이름</th><td>${esc(s.storeName)}</td></tr>
        <tr><th>사업자등록번호</th><td>${esc(s.bizNo)}</td></tr>
        <tr><th>고객 문의 연락처</th><td><input class="input" id="csPhone2" value="${esc(s.csPhone)}" style="max-width:240px"> <button class="btn btn-sm" id="saveCs">저장</button></td></tr>
        <tr><th>판매자 등록일</th><td>${fmtDate(s.createdAt)}</td></tr>
      </table>
      <p class="muted" style="font-size:13px">스토어 이름은 기존 주문·상품과의 일관성을 위해 변경할 수 없어요.</p>`;
  }
  function bindStore() {
    $('#saveCs').addEventListener('click', () => {
      const v = $('#csPhone2').value.trim();
      if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v)) { toast('연락처를 정확히 입력해 주세요.'); return; }
      Auth.updateCurrent({ seller: { ...me().seller, csPhone: v } });
      toast('저장했어요.');
    });
  }

  render();
})();
