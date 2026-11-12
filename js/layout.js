// 공통 유틸 + 헤더/푸터 렌더링
const BRAND = '몽글';
const LOGO = '<span class="paw" aria-hidden="true">🐾</span>몽글<i aria-hidden="true">♥</i>';
const ICON = {
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke-linecap="round"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  basket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18l-1.6 8.4a2 2 0 0 1-2 1.6H6.6a2 2 0 0 1-2-1.6z"/><path d="M8 10l3-6M16 10l-3-6"/><path d="M12 17.2s-2.6-1.5-2.6-3.2a1.4 1.4 0 0 1 2.6-.7 1.4 1.4 0 0 1 2.6.7c0 1.7-2.6 3.2-2.6 3.2z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }
// 분양비처럼 큰 금액은 '160만원', '2만 5천원'처럼 읽기 쉽게
function feeText(n) {
  n = Math.round(Number(n || 0));
  const man = Math.floor(n / 10000), rest = n % 10000;
  if (man && !rest) return man.toLocaleString('ko-KR') + '만원';
  if (man && rest % 1000 === 0) return `${man.toLocaleString('ko-KR')}만 ${rest / 1000}천원`;
  if (!man && n && n % 1000 === 0) return (n / 1000) + '천원';
  return won(n);
}
function param(name) { return new URLSearchParams(location.search).get(name); }
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function fmtDate(iso) { return new Date(iso).toLocaleDateString('ko-KR'); }
function currentPage() { return location.pathname.split('/').pop() + location.search; }
function loginUrl() { return 'login.html?redirect=' + encodeURIComponent(currentPage() || 'index.html'); }

// 로그인 후 이동할 경로: 같은 사이트의 상대 경로만 허용
function safeRedirect(target) {
  if (!target || /^[a-z]+:|^\/\/|\\/i.test(target) || target.startsWith('/')) return 'index.html';
  return target;
}

function stars(rating) {
  const full = Math.round(rating);
  return '<span class="stars" aria-label="별점 ' + rating + '점">' + '★'.repeat(full) + '☆'.repeat(5 - full) + '</span>';
}

// 이미지: 판매자 업로드(data:image) 또는 Unsplash 무료 사진만 허용
function safeImage(src) {
  if (typeof src !== 'string') return '';
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(src)) return src;
  if (/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?[\w=&.%-]*$/.test(src)) return src;
  return '';
}

function thumb(p, size = '') {
  const img = safeImage(p.image);
  const hex = c => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
  const g = p.gradient && hex(p.gradient[0]) && hex(p.gradient[1]) ? p.gradient : ['#f1f5f9', '#e2e8f0'];
  return `<div class="thumb ${size}" style="background:linear-gradient(135deg, ${g[0]}, ${g[1]})">
    ${img ? `<img src="${img}" alt="${esc(p.name)}" loading="lazy">` : `<span class="emoji" role="img" aria-label="${esc(p.name)}">${esc(p.emoji || '📦')}</span>`}
    ${p.soldOut ? `<span class="soldout-cover">${p.live ? '💛 새 가족을 만났어요' : '일시품절'}</span>` : ''}</div>`;
}

function priceBlock(p) {
  return `${p.discount ? `<div><span class="origin">${won(p.originalPrice)}</span></div>` : '<div class="origin-space"></div>'}
    <div class="price-line">${p.discount ? `<span class="discount">${p.discount}%</span>` : ''}<span class="price">${won(p.price)}</span></div>`;
}

// 진행 단계 이름: 반려동물은 입양 절차로 표시
const ADOPT_STEPS = { 결제완료: '입양 신청 접수', 배송준비중: '분양자 검토·승인', 배송중: '인계 준비', 배송완료: '새 가족 품으로', 구매확정: '입양 완료', 주문취소: '신청 취소', 반품요청: '건강보증 접수', 반품완료: '건강보증 처리 완료' };
function statusLabel(status, live) { return live ? ADOPT_STEPS[status] || status : status; }

function petCard(p) {
  const wished = Wish.has(p.id);
  return `<div class="pcard ${p.soldOut ? 'is-soldout' : ''}">
    <button class="wish-btn" data-wish="${p.id}" aria-label="관심 친구로 저장" aria-pressed="${wished}">${wished ? '❤️' : '🤍'}</button>
    <a href="product.html?id=${p.id}">
      <div class="thumb-wrap">${thumb(p)}</div>
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        ${p.pet ? `<div class="pet-meta">${esc(p.pet.age)} · ${esc(p.pet.care)}</div>` : ''}
        ${p.pet && p.pet.note ? `<div class="pet-note">“${esc(p.pet.note)}”</div>` : ''}
        <div class="adopt-fee"><span>분양비</span> ${feeText(p.price)}</div>
        <div class="tags">
          ${p.isNew && !p.soldOut ? '<span class="tag tag-new">🍼 새로 왔어요</span>' : ''}
          ${p.pet && p.pet.adult && !p.soldOut ? '<span class="tag tag-adult">🧓 의젓한 어른 친구</span>' : ''}
          ${p.soldOut ? '<span class="tag tag-home">💛 가족을 찾았어요</span>' : '<span class="tag tag-wait">🏡 가족을 기다려요</span>'}
          <span class="tag tag-free">🩺 15일 건강보증</span>
        </div>
        ${p.sellerEmail ? `<div class="seller-name">분양자 · ${esc(p.seller)}</div>` : ''}
      </div>
    </a>
  </div>`;
}

function productCard(p, i, opts) {
  if (p.live) return petCard(p);
  const rank = opts && opts.rank ? i + 1 : 0;
  const wished = Wish.has(p.id);
  return `<div class="pcard ${p.soldOut ? 'is-soldout' : ''}">
    ${rank ? `<span class="rank ${rank <= 3 ? 'top' : ''}">${rank}</span>` : ''}
    <button class="wish-btn" data-wish="${p.id}" aria-label="찜하기" aria-pressed="${wished}">${wished ? '❤️' : '🤍'}</button>
    <a href="product.html?id=${p.id}">
      <div class="thumb-wrap">${thumb(p)}${p.discount >= 20 && !p.soldOut ? `<span class="sale-badge">-${p.discount}%</span>` : ''}</div>
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        ${priceBlock(p)}
        <div class="rating">${p.reviewCount ? `${stars(p.avgRating)} (${p.reviewCount.toLocaleString()})` : '<span class="muted">NEW</span>'}</div>
        ${p.live && p.pet ? `<div class="pet-meta">${esc(p.pet.age)} · ${esc(p.pet.care)}</div>` : ''}
        <div class="tags">
          ${p.live ? '<span class="tag tag-fast">🩺 건강보증 15일</span><span class="tag tag-free">직접 인계</span>' : ''}
          ${!p.live && p.fast ? '<span class="tag tag-fast">🚀 내일도착</span>' : ''}
          ${!p.live && p.freeShip ? '<span class="tag tag-free">무료배송</span>' : ''}
          ${!p.soldOut && p.stock <= (p.live ? 1 : 5) ? `<span class="tag tag-low">${p.live ? '마지막 1마리' : p.stock + '개 남음'}</span>` : ''}
        </div>
        ${p.sellerEmail ? `<div class="seller-name">${esc(p.seller)}</div>` : ''}
      </div>
    </a>
  </div>`;
}

// 상품 카드의 찜 버튼 (이벤트 위임)
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-wish]');
  if (!btn) return;
  e.preventDefault();
  const on = Wish.toggle(Number(btn.dataset.wish));
  if (on === null) {
    toast('로그인 후 찜할 수 있어요.', loginUrl(), '로그인');
    return;
  }
  btn.textContent = on ? '❤️' : '🤍';
  btn.setAttribute('aria-pressed', on);
  toast(on ? '관심 목록에 담았어요. 💛' : '관심 목록에서 뺐어요.', on ? 'mypage.html?tab=wish' : '', '관심 목록');
});

let toastTimer;
function toast(msg, link, linkText) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = esc(msg) + (link ? ` <a href="${esc(link)}">${esc(linkText || '보기')}</a>` : '');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// 간단한 모달 (confirm/prompt 대체)
function modal({ title, body, okText = '확인', cancelText = '취소', onOk }) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-wrap';
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <h3>${esc(title)}</h3><div class="modal-body">${body}</div>
    <div class="modal-actions">${cancelText ? `<button class="btn" data-x>${esc(cancelText)}</button>` : ''}<button class="btn btn-primary" data-ok>${esc(okText)}</button></div>
  </div>`;
  document.body.appendChild(wrap);
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  // 다른 모달이 열려 있으면 먼저 닫기
  $$('.modal-wrap').forEach(m => { if (m !== wrap) m.remove(); });
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('[data-x]')) close(); });
  let busy = false; // 중복 클릭 방지
  $('[data-ok]', wrap).addEventListener('click', async () => {
    if (busy || !wrap.isConnected) return;
    busy = true;
    let r;
    try {
      r = onOk ? onOk(wrap) : undefined;
      if (r && typeof r.then === 'function') r = await r;
    } finally {
      busy = false;
    }
    if (r === false) return;
    close();
  });
  const first = $('input, textarea, select', wrap) || $('[data-ok]', wrap);
  first.focus();
  return wrap;
}

function updateCartBadge() {
  const el = $('#cartCount');
  if (!el) return;
  const n = Cart.count();
  el.textContent = n > 99 ? '99+' : n;
  el.classList.toggle('hidden', n === 0);
}

function renderHeader() {
  const user = Auth.current();
  const page = location.pathname.split('/').pop() || 'index.html';
  const cat = param('cat');
  const q = page === 'products.html' ? param('q') || '' : '';
  const sort = param('sort');
  // 다시 그릴 수 있도록 고정 컨테이너 사용 (display:contents 로 sticky 유지)
  let host = $('#siteHeader');
  if (!host) {
    host = document.createElement('div');
    host.id = 'siteHeader';
    host.style.display = 'contents';
    $('#header').replaceWith(host);
  }
  host.innerHTML = `
  <a class="skip" href="#app">본문 바로가기</a>
  <div class="topbar"><div class="container">
    ${user
      ? `<span><strong>${esc(user.name)}</strong>님 · <strong>${Number(user.points || 0).toLocaleString()}P</strong></span><button id="logoutBtn">로그아웃</button>`
      : `<a href="${loginUrl()}">로그인</a><a href="signup.html">회원가입</a>`}
    <a href="mypage.html">주문조회</a>
    <a href="help.html">고객센터</a>
    <a href="seller.html" class="seller-link">분양자·셀러센터 ↗</a>
  </div></div>
  <header class="header">
    <div class="container header-main">
      <a href="index.html" class="logo" aria-label="몽글 홈">${LOGO}</a>
      <form class="search" action="products.html" role="search" id="searchForm" autocomplete="off">
        <input name="q" id="searchInput" type="search" placeholder="어떤 친구를 찾고 있나요? 🐾" value="${esc(q)}" aria-label="상품 검색" maxlength="50">
        <button type="submit" aria-label="검색">${ICON.search}</button>
        <div class="suggest hidden" id="suggest"></div>
      </form>
      <nav class="header-icons">
        ${user ? `<div class="noti-wrap"><button type="button" class="icon-btn" id="notiBtn" aria-label="알림" aria-expanded="false">${ICON.bell}<span class="label">알림</span><span id="notiCount" class="badge-count hidden">0</span></button><div class="noti-panel hidden" id="notiPanel"></div></div>` : ''}
        <a href="mypage.html?tab=wish" aria-label="관심 친구">${ICON.heart}<span class="label">관심</span></a>
        <a href="mypage.html" aria-label="마이페이지">${ICON.user}<span class="label">MY</span></a>
        <a href="cart.html" aria-label="입양 준비함">${ICON.basket}<span class="label">준비함</span><span id="cartCount" class="badge-count hidden">0</span></a>
      </nav>
    </div>
    <nav class="catnav"><div class="container">
      <a href="products.html" class="${page === 'products.html' && !cat && !q && sort !== 'discount' ? 'active' : ''}">전체</a>
      ${CATEGORIES.map(c => `<a href="products.html?cat=${c.id}" class="${cat === c.id ? 'active' : ''}">${c.name}</a>`).join('')}
      <a href="products.html?sort=discount" class="hot ${sort === 'discount' && !cat && !q ? 'active' : ''}">용품 SALE</a>
      <a href="products.html?sort=new" class="${sort === 'new' && !cat && !q ? 'active' : ''}">신상</a>
    </div></nav>
  </header>`;
  const logout = $('#logoutBtn');
  if (logout) logout.addEventListener('click', () => {
    Auth.logout();
    location.href = 'index.html';
  });
  setupSearch();
  setupNoti();
  updateCartBadge();
}

// 알림함 (재입고·발송·답변·반품 알림)
function setupNoti() {
  const btn = $('#notiBtn');
  if (!btn) return;
  const panel = $('#notiPanel');
  const count = $('#notiCount');
  const paint = () => {
    const n = Notify.unread();
    count.textContent = n > 99 ? '99+' : n;
    count.classList.toggle('hidden', !n);
  };
  const ago = iso => {
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    return m < 1 ? '방금 전' : m < 60 ? m + '분 전' : m < 1440 ? Math.floor(m / 60) + '시간 전' : fmtDate(iso);
  };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = panel.classList.toggle('hidden') === false;
    btn.setAttribute('aria-expanded', open);
    if (!open) return;
    const list = Notify.list();
    panel.innerHTML = `<div class="n-head"><span>알림</span>${list.length ? '<button class="link-btn" type="button" id="notiClear">모두 지우기</button>' : ''}</div>` +
      (list.length ? list.map(n => `<a class="noti-item ${n.read ? '' : 'unread'}" href="${esc(safeRedirect(n.link || 'mypage.html'))}">${esc(n.text)}<div class="muted">${ago(n.date)}</div></a>`).join('')
        : '<div class="noti-item muted">새 알림이 없어요.<br>재입고·발송·문의답변 소식을 여기서 알려드려요.</div>');
    Notify.readAll();
    paint();
    const clear = $('#notiClear');
    if (clear) clear.addEventListener('click', ev => {
      ev.stopPropagation();
      Store.set('noti_' + Auth.current().email, []);
      panel.innerHTML = '<div class="noti-item muted">새 알림이 없어요.</div>';
    });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.noti-wrap')) { panel.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); }
  });
  paint();
}

// 검색창: 최근 검색어 + 자동완성
function setupSearch() {
  const form = $('#searchForm');
  const input = $('#searchInput');
  const box = $('#suggest');
  let active = -1;

  function show() {
    const q = input.value.trim().toLowerCase();
    let html = '';
    if (!q) {
      const recent = RecentSearch.list();
      if (recent.length) {
        html = `<div class="suggest-head"><span>최근 검색어</span><button type="button" data-clear>전체삭제</button></div>` +
          recent.map(r => `<div class="suggest-item" data-q="${esc(r)}"><span>🕘 ${esc(r)}</span><button type="button" data-del="${esc(r)}" aria-label="삭제">✕</button></div>`).join('');
      }
    } else {
      const hits = PRODUCTS.filter(p => p.name.toLowerCase().includes(q)).slice(0, 7);
      html = hits.map(p => {
        const i = p.name.toLowerCase().indexOf(q);
        const name = esc(p.name.slice(0, i)) + '<b>' + esc(p.name.slice(i, i + q.length)) + '</b>' + esc(p.name.slice(i + q.length));
        return `<a class="suggest-item" href="product.html?id=${p.id}"><span>🔍 ${name}</span><span class="muted">${won(p.price)}</span></a>`;
      }).join('');
    }
    box.innerHTML = html;
    box.classList.toggle('hidden', !html);
    active = -1;
  }

  input.addEventListener('focus', show);
  input.addEventListener('input', show);
  input.addEventListener('keydown', e => {
    const items = $$('.suggest-item', box);
    if (!items.length || box.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('active', i === active));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      items[active].click();
    } else if (e.key === 'Escape') {
      box.classList.add('hidden');
    }
  });
  box.addEventListener('mousedown', e => e.preventDefault()); // 클릭 전에 blur로 닫히지 않게
  box.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) { RecentSearch.remove(del.dataset.del); show(); return; }
    if (e.target.closest('[data-clear]')) { RecentSearch.clear(); show(); return; }
    const item = e.target.closest('[data-q]');
    if (item) { input.value = item.dataset.q; form.requestSubmit(); }
  });
  input.addEventListener('blur', () => box.classList.add('hidden'));
  form.addEventListener('submit', e => {
    const v = input.value.trim();
    if (!v) { e.preventDefault(); input.focus(); toast('검색어를 입력해 주세요.'); return; }
    input.value = v;
    RecentSearch.add(v);
  });
}

function renderFooter() {
  $('#footer').outerHTML = `
  <footer class="footer" id="footer"><div class="container">
    <div class="footer-cols">
      <div><strong>${LOGO}</strong>몽글몽글, 평생 가족.<br>정성껏 키워주실 분께, 정성껏 보내드려요.</div>
      <div><strong>고객센터</strong>1588-0000<br>평일 09:00–18:00<br><a href="help.html">자주 묻는 질문 · 공지 →</a></div>
      <div><strong>책임 분양</strong>입양 신청서 검토 후 분양 · 15일 건강보증<br>생명은 택배 없이 직접 인계 · 동물판매업 등록 (데모)</div>
      <div><strong>분양자·브리더</strong><a href="seller.html">책임 분양 함께하기 →</a><br>용품 ${won(FREE_SHIPPING_MIN)} 이상 무료배송</div>
    </div>
    <div class="notice">⚠️ 학습용 데모 사이트입니다. 실제 결제·배송이 이루어지지 않으며, 회원·주문·상품 정보는 이 브라우저(localStorage)에만 저장됩니다. 실제 분양이 아니며, 상품 사진은 Unsplash 무료 라이선스 이미지입니다. 실제 사용하는 비밀번호를 입력하지 마세요.</div>
    <div class="footer-bottom"><span>© 2026 mongle. All rights reserved.</span><button class="link-btn" id="toTop" type="button">맨 위로 ↑</button></div>
    <div class="wordmark" aria-hidden="true">mongle<i>♥</i></div>
  </div></footer>`;
  $('#toTop').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
}

// ---------- 나와 꼭 맞는 친구 찾기 퀴즈 ----------
const QUIZ = [
  ['home', '어떤 집에서 살고 있나요?', ['아파트·빌라', '마당 있는 주택', '원룸·오피스텔']],
  ['alone', '아이가 하루에 혼자 있을 시간은요?', ['4시간 이하', '4~8시간', '8시간 이상']],
  ['exp', '반려동물을 키워본 적이 있나요?', ['처음이에요', '조금 키워봤어요', '경험이 많아요']],
  ['kids', '어린아이와 함께 살고 있나요?', ['네', '아니요']],
  ['shed', '털 날림이나 알레르기가 걱정되나요?', ['네, 걱정돼요', '괜찮아요']],
  ['walk', '하루에 산책·놀이에 쓸 수 있는 시간은요?', ['30분 이하', '1시간 정도', '2시간 이상']],
];
function quizMatch(a) {
  return Catalog.visible().filter(p => p.live && !p.soldOut && p.pet).map(p => {
    const t = p.pet.traits || [];
    let score = 0;
    const why = [];
    const care = p.pet.care;
    if (a.exp === '처음이에요') score += care === '초보 추천' ? 2 : care === '보통' ? -1 : -4;
    if (a.exp === '조금 키워봤어요') score += care === '경험자 추천' ? -1 : 1;
    if (care === '초보 추천' && a.exp === '처음이에요') why.push('처음 키우기 좋아요');
    if (a.home !== '마당 있는 주택') { if (t.includes('apt')) { score += 1; why.push('아파트에서도 좋아요'); } else score -= 2; }
    if (a.alone !== '4시간 이하') { if (t.includes('alone')) { score += 2; why.push('혼자서도 잘 지내요'); } else score -= a.alone === '8시간 이상' ? 4 : 2; }
    if (a.kids === '네') { if (t.includes('kids')) { score += 1; why.push('아이와 함께해도 좋아요'); } else score -= 2; }
    if (a.shed === '네, 걱정돼요') { if (t.includes('lowshed')) { score += 2; why.push('털 날림이 적어요'); } else score -= 2; }
    if (p.category === 'dog') {
      const big = /대형|중형/.test(p.pet.size);
      if (a.walk === '30분 이하') score -= big ? 4 : 2;
      if (a.walk === '2시간 이상') { score += 2; why.push('활동적인 가족과 잘 맞아요'); }
      if (a.home === '마당 있는 주택' && big) score += 1;
    }
    if (t.includes('quiet') && a.home === '원룸·오피스텔') { score += 1; why.push('조용한 편이에요'); }
    return { p, score, why: why.slice(0, 3) };
  }).sort((x, y) => y.score - x.score || x.p.price - y.p.price)
    // 같은 분류는 최대 2마리까지만 → 다양한 친구를 추천
    .filter(function (r) { this[r.p.category] = (this[r.p.category] || 0) + 1; return this[r.p.category] <= 2; }, {})
    .slice(0, 4);
}
function openQuiz() {
  let showing = false;
  const w = modal({
    title: '🧩 나와 꼭 맞는 친구 찾기',
    body: `<p class="muted" style="margin-top:0;font-size:14px">6가지 질문에 답하면 우리 집 생활에 잘 맞는 친구를 추천해 드려요.</p>
      ${QUIZ.map(([k, q, opts]) => `<div class="q quiz-q"><span class="q-title">${q}</span><div class="choice-row">${opts.map(o => `<label><input type="radio" name="qz_${k}" value="${o}"> ${o}</label>`).join('')}</div></div>`).join('')}
      <div class="error-text" id="qzErr"></div><div id="qzResult"></div>`,
    okText: '추천 받기',
    cancelText: '닫기',
    onOk: wrap => {
      if (showing) return; // 결과를 본 뒤에는 닫기
      const a = {};
      for (const [k] of QUIZ) {
        const c = $(`input[name=qz_${k}]:checked`, wrap);
        if (!c) { $('#qzErr', wrap).textContent = '모든 질문에 답해 주세요.'; return false; }
        a[k] = c.value;
      }
      const res = quizMatch(a);
      $$('.quiz-q', wrap).forEach(el => el.classList.add('hidden'));
      $('#qzErr', wrap).textContent = '';
      $('#qzResult', wrap).innerHTML = `<h4 style="margin:0 0 10px">💛 이런 친구들이 잘 맞을 것 같아요</h4>` + res.map(({ p, why }) => `
        <a class="quiz-pick" href="product.html?id=${p.id}">${thumb(p, 'sm')}<div><strong>${esc(p.name.split(' · ')[0])}</strong>
          <div class="muted" style="font-size:12px">${esc(p.pet.age)} · ${esc(p.pet.care)}</div>
          <div style="font-size:12px;color:var(--forest)">${why.map(esc).join(' · ') || '생활 패턴과 무난하게 잘 맞아요'}</div></div></a>`).join('') +
        `<p class="muted" style="font-size:12px">결과는 참고용이에요. 꼭 직접 만나보고, 분양자와 상담한 뒤 결정해 주세요.</p>
         <a class="btn btn-sm btn-outline" href="products.html?live=1">모든 친구 둘러보기</a>`;
      $('[data-ok]', wrap).textContent = '닫기';
      showing = true;
      return false;
    },
  });
  return w;
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-quiz]')) { e.preventDefault(); openQuiz(); }
});

try { CarePlan.check(); } catch (e) { /* 저장소 접근 불가 시 무시 */ }
renderHeader();
renderFooter();
