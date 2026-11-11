// 공통 유틸 + 헤더/푸터 렌더링
const BRAND = 'HAUL.';
const LOGO = 'HAUL<i>.</i>';
const ICON = {
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2" stroke-linecap="round"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }
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

// 판매자 업로드 이미지는 data:image 만 허용
function safeImage(src) {
  return typeof src === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(src) ? src : '';
}

function thumb(p, size = '') {
  const img = safeImage(p.image);
  const hex = c => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
  const g = p.gradient && hex(p.gradient[0]) && hex(p.gradient[1]) ? p.gradient : ['#f1f5f9', '#e2e8f0'];
  return `<div class="thumb ${size}" style="background:linear-gradient(135deg, ${g[0]}, ${g[1]})">
    ${img ? `<img src="${img}" alt="${esc(p.name)}" loading="lazy">` : `<span class="emoji" role="img" aria-label="${esc(p.name)}">${esc(p.emoji || '📦')}</span>`}
    ${p.soldOut ? '<span class="soldout-cover">일시품절</span>' : ''}</div>`;
}

function priceBlock(p) {
  return `${p.discount ? `<div><span class="origin">${won(p.originalPrice)}</span></div>` : '<div class="origin-space"></div>'}
    <div class="price-line">${p.discount ? `<span class="discount">${p.discount}%</span>` : ''}<span class="price">${won(p.price)}</span></div>`;
}

function productCard(p, i, opts) {
  const rank = opts && opts.rank ? i + 1 : 0;
  const wished = Wish.has(p.id);
  return `<div class="pcard ${p.soldOut ? 'is-soldout' : ''}">
    ${rank ? `<span class="rank ${rank <= 3 ? 'top' : ''}">${rank}</span>` : ''}
    <button class="wish-btn" data-wish="${p.id}" aria-label="찜하기" aria-pressed="${wished}">${wished ? '❤️' : '🤍'}</button>
    <a href="product.html?id=${p.id}">
      ${thumb(p)}
      <div class="info">
        <div class="name">${esc(p.name)}</div>
        ${priceBlock(p)}
        <div class="rating">${p.reviewCount ? `${stars(p.avgRating)} (${p.reviewCount.toLocaleString()})` : '<span class="muted">NEW</span>'}</div>
        <div class="tags">
          ${p.fast ? '<span class="tag tag-fast">🚀 내일도착</span>' : ''}
          ${p.freeShip ? '<span class="tag tag-free">무료배송</span>' : ''}
          ${!p.soldOut && p.stock <= 5 ? `<span class="tag tag-low">${p.stock}개 남음</span>` : ''}
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
  toast(on ? '찜 목록에 추가했어요.' : '찜 목록에서 삭제했어요.', on ? 'mypage.html?tab=wish' : '', '찜 목록');
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
    <a href="seller.html" class="seller-link">셀러센터 ↗</a>
  </div></div>
  <header class="header">
    <div class="container header-main">
      <a href="index.html" class="logo" aria-label="HAUL 홈">${LOGO}</a>
      <form class="search" action="products.html" role="search" id="searchForm" autocomplete="off">
        <input name="q" id="searchInput" type="search" placeholder="오늘은 뭘 하울해볼까?" value="${esc(q)}" aria-label="상품 검색" maxlength="50">
        <button type="submit" aria-label="검색">${ICON.search}</button>
        <div class="suggest hidden" id="suggest"></div>
      </form>
      <nav class="header-icons">
        <a href="mypage.html?tab=wish" aria-label="찜">${ICON.heart}<span class="label">찜</span></a>
        <a href="mypage.html" aria-label="마이페이지">${ICON.user}<span class="label">MY</span></a>
        <a href="cart.html" aria-label="장바구니">${ICON.bag}<span class="label">장바구니</span><span id="cartCount" class="badge-count hidden">0</span></a>
      </nav>
    </div>
    <nav class="catnav"><div class="container">
      <a href="products.html" class="${page === 'products.html' && !cat && !q && sort !== 'discount' ? 'active' : ''}">전체</a>
      ${CATEGORIES.map(c => `<a href="products.html?cat=${c.id}" class="${cat === c.id ? 'active' : ''}">${c.name}</a>`).join('')}
      <a href="products.html?sort=discount" class="hot ${sort === 'discount' && !cat && !q ? 'active' : ''}">특가 SALE</a>
      <a href="products.html?sort=new" class="${sort === 'new' && !cat && !q ? 'active' : ''}">신상</a>
    </div></nav>
  </header>`;
  const logout = $('#logoutBtn');
  if (logout) logout.addEventListener('click', () => {
    Auth.logout();
    location.href = 'index.html';
  });
  setupSearch();
  updateCartBadge();
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
      <div><strong>${LOGO}</strong>취향을 하울하다.<br>오늘 담고, 내일 받는 라이프스타일 마켓.</div>
      <div><strong>고객센터</strong>1588-0000<br>평일 09:00–18:00</div>
      <div><strong>쇼핑 혜택</strong>${won(FREE_SHIPPING_MIN)} 이상 무료배송<br>구매확정 ${POINT_RATE * 100}% 적립 · 가입 2,000P</div>
      <div><strong>셀러</strong><a href="seller.html">수수료 0%로 입점하기 →</a></div>
    </div>
    <div class="notice">⚠️ 학습용 데모 사이트입니다. 실제 결제·배송이 이루어지지 않으며, 회원·주문·상품 정보는 이 브라우저(localStorage)에만 저장됩니다. 실제 사용하는 비밀번호를 입력하지 마세요.</div>
    <div class="footer-bottom"><span>© 2026 HAUL. All rights reserved.</span><button class="link-btn" id="toTop" type="button">맨 위로 ↑</button></div>
    <div class="wordmark" aria-hidden="true">HAUL<i>.</i></div>
  </div></footer>`;
  $('#toTop').addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
}

renderHeader();
renderFooter();
