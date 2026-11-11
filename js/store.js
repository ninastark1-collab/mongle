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
    const list = this.custom();
    const i = list.findIndex(p => p.id === product.id);
    if (i >= 0) list[i] = { ...list[i], ...product };
    else list.push(product);
    const ok = Store.set('products', list);
    this.invalidate();
    return ok;
  },
  nextId() {
    return Math.max(1000, ...this.custom().map(p => p.id)) + 1;
  },
  setFields(id, patch) {
    id = Number(id);
    if (this.custom().some(p => p.id === id)) {
      this.save({ id, ...patch });
    } else {
      const ov = this.overrides();
      ov[id] = { ...(ov[id] || {}), ...patch };
      Store.set('overrides', ov);
      this.invalidate();
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
    Store.set('qna', this.all().map(q => (q.id === id ? { ...q, answer: text, answerDate: new Date().toISOString() } : q)));
  },
};

// ---------- 주문 ----------
const STATUS_FLOW = ['결제완료', '배송준비중', '배송중', '배송완료', '구매확정'];
const CANCELLABLE = ['결제완료', '배송준비중'];

const Orders = {
  // 직영 상품은 데모를 위해 시간 경과에 따라 자동 배송 처리 (20초/40초/60초)
  _autoProgress(list) {
    let changed = false;
    const now = Date.now();
    list.forEach(o => {
      const sec = (now - new Date(o.date).getTime()) / 1000;
      const auto = sec < 20 ? '결제완료' : sec < 40 ? '배송준비중' : sec < 60 ? '배송중' : '배송완료';
      o.items.forEach(it => {
        if (it.sellerEmail || !STATUS_FLOW.slice(0, 3).includes(it.status)) return;
        if (STATUS_FLOW.indexOf(auto) > STATUS_FLOW.indexOf(it.status)) {
          it.status = auto;
          if (auto === '배송중' && !it.tracking) it.tracking = 'HL' + String(Math.floor(Math.random() * 1e10)).padStart(10, '0');
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
  },
  // 주문 전체 상태 요약 (가장 늦게 진행 중인 상품 기준)
  status(o) {
    const live = o.items.filter(i => i.status !== '주문취소');
    if (!live.length) return '주문취소';
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
