// localStorage 기반 데이터 저장소
const Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('moa_' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('moa_' + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false; // 용량 초과 등
    }
  },
  remove(key) {
    try { localStorage.removeItem('moa_' + key); } catch (e) { /* ignore */ }
  },
};

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- 리뷰 ----------
const Reviews = {
  all() { return Store.get('reviews', []); },
  forProduct(id) { return this.all().filter(r => r.productId === Number(id)); },
  add(review) {
    const all = this.all();
    all.unshift({ ...review, id: uid('r'), date: new Date().toISOString() });
    Store.set('reviews', all);
    Catalog.invalidate();
  },
};

// ---------- 상품 카탈로그 (기본 상품 + 판매자 등록 상품) ----------
const Catalog = {
  _cache: null,
  invalidate() { this._cache = null; },
  custom() { return Store.get('products', []); },
  overrides() { return Store.get('overrides', {}); },

  all() {
    if (this._cache) return this._cache;
    const ov = this.overrides();
    const reviews = Reviews.all();
    const list = [
      ...BASE_PRODUCTS.map(p => ({ ...p, ...(ov[p.id] || {}) })),
      ...this.custom().filter(p => !p.deleted),
    ];
    this._cache = list.map(p => {
      const mine = reviews.filter(r => r.productId === p.id);
      const baseCount = p.reviews || 0;
      const count = baseCount + mine.length;
      const sum = (p.rating || 0) * baseCount + mine.reduce((s, r) => s + r.score, 0);
      return {
        ...p,
        reviewCount: count,
        avgRating: count ? Math.round((sum / count) * 10) / 10 : 0,
        discount: p.originalPrice > p.price ? Math.round((1 - p.price / p.originalPrice) * 100) : 0,
        soldOut: p.stock <= 0,
      };
    });
    return this._cache;
  },
  // 진열 중인 상품 (판매중지 제외)
  visible() { return this.all().filter(p => p.status !== 'hidden'); },
  get(id) { return this.all().find(p => p.id === Number(id)); },
  bySeller(email) { return this.all().filter(p => p.sellerEmail === email); },

  save(product) {
    const prev = this.get(product.id);
    const list = this.custom();
    const i = list.findIndex(p => p.id === product.id);
    if (i >= 0) list[i] = { ...list[i], ...product };
    else list.push(product);
    const ok = Store.set('products', list);
    this.invalidate();
    this._checkRestock(product.id, prev);
    return ok;
  },
  _checkRestock(id, prev) {
    const now = this.get(id);
    if (prev && prev.stock <= 0 && now && now.stock > 0) Restock.fire(id);
  },
  nextId() {
    return Math.max(1000, ...this.custom().map(p => p.id)) + 1;
  },
  setFields(id, patch) {
    id = Number(id);
    if (this.custom().some(p => p.id === id)) {
      this.save({ id, ...patch });
    } else {
      const prev = this.get(id);
      const ov = this.overrides();
      ov[id] = { ...(ov[id] || {}), ...patch };
      Store.set('overrides', ov);
      this.invalidate();
      this._checkRestock(id, prev);
    }
  },
  adjustStock(id, delta) {
    const p = this.get(id);
    if (!p) return;
    this.setFields(id, { stock: Math.max(0, p.stock + delta), sold: Math.max(0, (p.sold || 0) - delta) });
  },
};

// 목록 화면에서 쓰는 진열 상품
Object.defineProperty(window, 'PRODUCTS', { get: () => Catalog.visible() });
function getProduct(id) { return Catalog.get(id); }

// ---------- 장바구니 ----------
const Cart = {
  items() { return Store.get('cart', []); },
  save(items) { Store.set('cart', items); if (window.updateCartBadge) updateCartBadge(); },
  count() { return this.items().length; },
  // 반환값: 실제로 담긴 최종 수량 (재고 한도 적용)
  add(id, option, qty) {
    const p = getProduct(id);
    if (!p || p.soldOut || p.status === 'hidden' || qty < 1) return 0; // 구매 불가 상품은 담지 않음
    const items = this.items();
    const key = id + '|' + (option || '');
    const found = items.find(i => i.key === key);
    const max = Math.min(99, p ? p.stock : 99);
    let finalQty;
    if (found) { found.qty = Math.min(max, found.qty + qty); found.checked = true; finalQty = found.qty; }
    else { finalQty = Math.min(max, qty); items.push({ key, id, option: option || '', qty: finalQty, checked: true }); }
    this.save(items);
    return finalQty;
  },
  update(key, patch) {
    this.save(this.items().map(i => (i.key === key ? { ...i, ...patch } : i)));
  },
  removeKeys(keys) {
    this.save(this.items().filter(i => !keys.includes(i.key)));
  },
};

// ---------- 최근 본 상품 / 최근 검색어 ----------
const Recent = {
  list() { return Store.get('recent', []); },
  add(id) {
    const list = this.list().filter(x => x !== id);
    list.unshift(id);
    Store.set('recent', list.slice(0, 20));
  },
  clear() { Store.set('recent', []); },
};
const RecentSearch = {
  list() { return Store.get('recentSearch', []); },
  add(q) {
    q = q.trim();
    if (!q) return;
    Store.set('recentSearch', [q, ...this.list().filter(x => x !== q)].slice(0, 8));
  },
  remove(q) { Store.set('recentSearch', this.list().filter(x => x !== q)); },
  clear() { Store.set('recentSearch', []); },
};

// ---------- 찜 (회원별) ----------
const Wish = {
  list() {
    const u = Auth.current();
    return u ? Store.get('wish_' + u.email, []) : [];
  },
  has(id) { return this.list().includes(id); },
  toggle(id) {
    const u = Auth.current();
    if (!u) return null;
    let list = this.list();
    const on = !list.includes(id);
    list = on ? [id, ...list] : list.filter(x => x !== id);
    Store.set('wish_' + u.email, list);
    return on;
  },
};

// ---------- 상품 문의 ----------
const QnA = {
  all() { return Store.get('qna', []); },
  forProduct(id) { return this.all().filter(q => q.productId === Number(id)); },
  add(q) {
    const all = this.all();
    all.unshift({ ...q, id: uid('q'), date: new Date().toISOString(), answer: '', answerDate: null });
    Store.set('qna', all);
  },
  answer(id, text) {
    const q = this.all().find(x => x.id === id);
    Store.set('qna', this.all().map(x => (x.id === id ? { ...x, answer: text, answerDate: new Date().toISOString() } : x)));
    if (q) Notify.push(q.email, '💬 문의하신 상품에 판매자 답변이 달렸어요.', 'product.html?id=' + q.productId + '&tab=qna');
  },
};

// ---------- 주문 ----------
const STATUS_FLOW = ['결제완료', '배송준비중', '배송중', '배송완료', '구매확정'];
const CANCELLABLE = ['결제완료', '배송준비중'];
const RETURN_REASONS = ['단순 변심', '상품 불량/파손', '오배송', '상품 정보와 다름', '기타'];
const RETURN_FEE = 6000; // 단순 변심 반품 왕복 배송비 (고객 부담)

const Orders = {
  // 직영 상품은 데모를 위해 시간 경과에 따라 자동 배송 처리 (20초/40초/60초)
  _autoProgress(list) {
    let changed = false;
    const now = Date.now();
    list.forEach(o => {
      const sec = (now - new Date(o.date).getTime()) / 1000;
      const auto = sec < 20 ? '결제완료' : sec < 40 ? '배송준비중' : sec < 60 ? '배송중' : '배송완료';
      o.items.forEach(it => {
        // 직영 상품 반품은 15초 뒤 자동 승인 (데모)
        if (!it.sellerEmail && it.status === '반품요청' && now - new Date(it.returnAt).getTime() > 15000) {
          this._applyReturn(o, it);
          changed = true;
          return;
        }
        if (it.sellerEmail || !STATUS_FLOW.slice(0, 3).includes(it.status)) return;
        if (STATUS_FLOW.indexOf(auto) > STATUS_FLOW.indexOf(it.status)) {
          it.status = auto;
          if (auto === '배송중' && !it.tracking) it.tracking = 'PK' + String(Math.floor(Math.random() * 1e10)).padStart(10, '0');
          changed = true;
        }
      });
    });
    return changed;
  },
  all() {
    const list = Store.get('orders', []);
    if (this._autoProgress(list)) Store.set('orders', list);
    return list;
  },
  saveAll(list) { Store.set('orders', list); },
  mine() {
    const u = Auth.current();
    return u ? this.all().filter(o => o.userEmail === u.email) : [];
  },
  find(no) { return this.all().find(o => o.no === no); },
  create(order) {
    const all = Store.get('orders', []);
    all.unshift(order);
    this.saveAll(all);
    [...new Set(order.items.map(i => i.sellerEmail).filter(Boolean))].forEach(email =>
      Notify.push(email, '🛒 새 주문이 들어왔어요! 발주확인을 해주세요.', 'seller.html?tab=orders'));
  },
  // 주문 전체 상태 요약 (가장 늦게 진행 중인 상품 기준)
  status(o) {
    const live = o.items.filter(i => STATUS_FLOW.includes(i.status));
    if (!live.length) {
      if (o.items.some(i => i.status === '반품요청')) return '반품요청';
      if (o.items.some(i => i.status === '반품완료')) return '반품완료';
      return '주문취소';
    }
    return STATUS_FLOW[Math.min(...live.map(i => STATUS_FLOW.indexOf(i.status)))];
  },
  canCancel(o) {
    const live = o.items.filter(i => i.status !== '주문취소');
    return live.length > 0 && live.every(i => CANCELLABLE.includes(i.status));
  },
  cancel(no) {
    const all = this.all();
    const o = all.find(x => x.no === no);
    if (!o || !this.canCancel(o)) return false;
    o.items.forEach(i => {
      if (i.status !== '주문취소') Catalog.adjustStock(i.id, i.qty);
      i.status = '주문취소';
    });
    o.cancelledAt = new Date().toISOString();
    if (o.pointsUsed) Auth.addPoints(o.userEmail, o.pointsUsed);
    if (o.coupon) CouponBox.restore(o.no, o.userEmail);
    o.items.forEach(i => { if (i.sellerEmail) Notify.push(i.sellerEmail, '❌ 주문이 취소되었어요: ' + i.name, 'seller.html?tab=orders'); });
    this.saveAll(all);
    return true;
  },
  setItemStatus(no, idx, status, tracking) {
    const all = this.all();
    const o = all.find(x => x.no === no);
    if (!o || !o.items[idx]) return false;
    // 상태는 한 단계씩 앞으로만 진행 (판매자 처리 범위: 배송완료까지)
    const cur = STATUS_FLOW.indexOf(o.items[idx].status);
    const nxt = STATUS_FLOW.indexOf(status);
    if (cur < 0 || nxt !== cur + 1 || nxt > STATUS_FLOW.indexOf('배송완료')) return false;
    o.items[idx].status = status;
    if (tracking !== undefined) o.items[idx].tracking = tracking;
    this.saveAll(all);
    const link = 'order-complete.html?no=' + encodeURIComponent(no);
    if (status === '배송중') Notify.push(o.userEmail, `🚚 '${o.items[idx].name}' 상품이 발송되었어요.`, link);
    if (status === '배송완료') Notify.push(o.userEmail, `📦 '${o.items[idx].name}' 배송이 완료되었어요. 구매확정하고 적립금 받으세요!`, 'mypage.html');
    return true;
  },
  // 이 상품에 실제로 결제한 금액 비율로 환불액 계산 (쿠폰·적립금 안분)
  refundFor(o, it) {
    const t = o.totals || {};
    const line = it.price * it.qty;
    const share = t.subtotal ? line / t.subtotal : 0;
    const paid = Math.floor(share * (t.subtotal - (t.couponDiscount || 0) - (t.pointsUsed || 0)));
    const points = Math.floor(share * (t.pointsUsed || 0));
    const fee = it.returnReason === '단순 변심' ? Math.min(RETURN_FEE, paid) : 0;
    return { cash: paid - fee, points, fee };
  },
  requestReturn(no, idx, reason, detail) {
    const all = this.all();
    const o = all.find(x => x.no === no);
    const it = o && o.items[idx];
    if (!it || it.status !== '배송완료' || !RETURN_REASONS.includes(reason)) return false;
    it.status = '반품요청';
    it.returnReason = reason;
    it.returnDetail = String(detail || '').slice(0, 300);
    it.returnAt = new Date().toISOString();
    this.saveAll(all);
    if (it.sellerEmail) Notify.push(it.sellerEmail, `↩️ 반품 요청이 들어왔어요: ${it.name} (${reason})`, 'seller.html?tab=orders');
    return true;
  },
  _applyReturn(o, it) {
    const r = this.refundFor(o, it);
    it.status = '반품완료';
    it.refund = r;
    it.returnDoneAt = new Date().toISOString();
    Catalog.adjustStock(it.id, it.qty);
    if (r.points) Auth.addPoints(o.userEmail, r.points);
    Notify.push(o.userEmail, `💸 반품이 완료되어 ${won(r.cash)} 환불${r.points ? ` · 적립금 ${r.points.toLocaleString()}P 반환` : ''}되었어요.`, 'order-complete.html?no=' + encodeURIComponent(o.no));
  },
  approveReturn(no, idx) {
    const all = this.all();
    const o = all.find(x => x.no === no);
    const it = o && o.items[idx];
    if (!it || it.status !== '반품요청') return false;
    this._applyReturn(o, it);
    this.saveAll(all);
    return true;
  },

  // 구매확정 → 적립금 지급
  confirm(no, idx) {
    const all = this.all();
    const o = all.find(x => x.no === no);
    const it = o && o.items[idx];
    if (!it || it.status !== '배송완료') return 0;
    it.status = '구매확정';
    const pts = Math.floor(it.price * it.qty * POINT_RATE);
    it.pointsEarned = pts;
    this.saveAll(all);
    Auth.addPoints(o.userEmail, pts);
    return pts;
  },
  markReviewed(no, idx) {
    const all = this.all();
    const o = all.find(x => x.no === no);
    if (o && o.items[idx]) { o.items[idx].reviewed = true; this.saveAll(all); }
  },
  // 판매자의 상품이 포함된 주문 항목
  forSeller(email) {
    const rows = [];
    this.all().forEach(o => o.items.forEach((it, idx) => {
      if (it.sellerEmail === email) rows.push({ order: o, item: it, idx });
    }));
    return rows;
  },
};

// ---------- 가격 계산 ----------
function calcTotals(lines, couponCode, pointsWanted) {
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const originTotal = lines.reduce((s, l) => s + Math.max(l.product.originalPrice || 0, l.product.price) * l.qty, 0);
  const allFree = lines.length > 0 && lines.every(l => l.product.freeShip);
  const shipping = lines.length === 0 || allFree || subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE;
  let couponDiscount = 0;
  const c = couponCode ? COUPONS[couponCode] : null;
  if (c && subtotal >= c.min) {
    couponDiscount = c.type === 'percent' ? Math.min(Math.floor(subtotal * c.value / 100), c.max) : c.value;
  }
  couponDiscount = Math.min(couponDiscount, subtotal);
  const pointsUsed = Math.max(0, Math.min(Math.floor(pointsWanted || 0), subtotal - couponDiscount));
  return {
    subtotal, originTotal, shipping, couponDiscount, pointsUsed,
    saved: originTotal - subtotal,
    total: subtotal - couponDiscount - pointsUsed + shipping,
  };
}


// ---------- 쿠폰함 (회원별, 1회 사용) ----------
const CouponBox = {
  key(email) { return 'coupons_' + email; },
  _email(email) { return email || (Auth.current() || {}).email; },
  list(email) {
    email = this._email(email);
    if (!email) return [];
    let l = Store.get(this.key(email), null);
    if (l === null) { // 처음 열면 신규회원 쿠폰 지급 (기존 회원 포함)
      l = [{ code: 'WELCOME10', at: new Date().toISOString(), used: null }];
      Store.set(this.key(email), l);
    }
    return l.filter(c => COUPONS[c.code]);
  },
  has(code, email) { return this.list(email).some(c => c.code === code); },
  // 반환: 'ok' | 'dup' | 'invalid' | 'login'
  give(code, email) {
    email = this._email(email);
    if (!email) return 'login';
    if (!COUPONS[code]) return 'invalid';
    const l = this.list(email);
    if (l.some(c => c.code === code)) return 'dup';
    l.push({ code, at: new Date().toISOString(), used: null });
    Store.set(this.key(email), l);
    return 'ok';
  },
  usable(email) { return this.list(email).filter(c => !c.used); },
  use(code, orderNo, email) {
    email = this._email(email);
    const l = this.list(email);
    const c = l.find(x => x.code === code && !x.used);
    if (!c) return false;
    c.used = orderNo;
    Store.set(this.key(email), l);
    return true;
  },
  restore(orderNo, email) {
    const l = this.list(email);
    let changed = false;
    l.forEach(c => { if (c.used === orderNo) { c.used = null; changed = true; } });
    if (changed) Store.set(this.key(email), l);
  },
};

// ---------- 알림함 ----------
const Notify = {
  list(email) {
    email = email || (Auth.current() || {}).email;
    return email ? Store.get('noti_' + email, []) : [];
  },
  push(email, text, link) {
    if (!email) return;
    const l = this.list(email);
    l.unshift({ id: uid('n'), text, link: link || '', date: new Date().toISOString(), read: false });
    Store.set('noti_' + email, l.slice(0, 50));
  },
  unread(email) { return this.list(email).filter(n => !n.read).length; },
  readAll(email) {
    email = email || (Auth.current() || {}).email;
    if (email) Store.set('noti_' + email, this.list(email).map(n => ({ ...n, read: true })));
  },
};

// ---------- 재입고 알림 ----------
const Restock = {
  all() { return Store.get('restock', []); },
  has(id, email) { return this.all().some(r => r.productId === Number(id) && r.email === email); },
  toggle(id, email) {
    id = Number(id);
    const on = !this.has(id, email);
    Store.set('restock', on ? [...this.all(), { productId: id, email, at: new Date().toISOString() }] : this.all().filter(r => !(r.productId === id && r.email === email)));
    return on;
  },
  count(id) { return this.all().filter(r => r.productId === Number(id)).length; },
  fire(id) {
    const p = Catalog.get(id);
    const list = this.all();
    list.filter(r => r.productId === Number(id)).forEach(r =>
      Notify.push(r.email, `🔔 재입고! '${p ? p.name : '상품'}'을(를) 다시 구매할 수 있어요.`, 'product.html?id=' + id));
    Store.set('restock', list.filter(r => r.productId !== Number(id)));
  },
};

// ---------- 배송지 목록 (회원별, 최대 10개) ----------
const AddressBook = {
  list() {
    const u = Auth.current();
    if (!u) return [];
    if (!u.addresses && u.address) { // 예전 단일 배송지 이전
      const a = { id: uid('a'), ...u.address };
      Auth.updateCurrent({ addresses: [a], defaultAddr: a.id });
      return [a];
    }
    return u.addresses || [];
  },
  defaultId() { this.list(); return (Auth.current() || {}).defaultAddr; },
  getDefault() { const l = this.list(); return l.find(a => a.id === this.defaultId()) || l[0] || null; },
  same(a, b) { return ['name', 'phone', 'zip', 'addr1', 'addr2'].every(k => (a[k] || '') === (b[k] || '')); },
  _sync(l, def) {
    const d = l.find(x => x.id === def) || null;
    Auth.updateCurrent({ addresses: l, defaultAddr: d ? def : null, address: d ? { name: d.name, phone: d.phone, zip: d.zip, addr1: d.addr1, addr2: d.addr2 } : null });
  },
  // 반환: 저장된 배송지 id (목록이 가득 차면 null)
  save(addr, makeDefault) {
    let l = this.list();
    const clean = { name: addr.name, phone: addr.phone, zip: addr.zip, addr1: addr.addr1, addr2: addr.addr2 };
    let a = addr.id ? l.find(x => x.id === addr.id) : l.find(x => this.same(x, clean));
    if (a) l = l.map(x => (x.id === a.id ? { ...x, ...clean } : x));
    else {
      if (l.length >= 10) return null;
      a = { id: uid('a'), ...clean };
      l = [...l, a];
    }
    this._sync(l, makeDefault || l.length === 1 ? a.id : this.defaultId());
    return a.id;
  },
  remove(id) {
    const l = this.list().filter(x => x.id !== id);
    let def = this.defaultId();
    if (def === id || !l.some(x => x.id === def)) def = l[0] ? l[0].id : null;
    this._sync(l, def);
  },
  setDefault(id) { this._sync(this.list(), id); },
};
