(function () {
  const state = {
    q: (param('q') || '').trim(),
    cat: param('cat') || '',
    sort: param('sort') || 'recommend',
    fast: param('fast') === '1',
    live: param('live') === '1',
    easy: param('care') === 'easy',
    free: false,
    min: '',
    max: '',
  };
  const ANIMAL_SORTS = ['recommend', 'new', 'reviews'];
  const isAnimalView = () => state.live || (state.cat && state.cat !== 'supplies');
  const SORTS = [
    ['recommend', '추천순'], ['new', '최신순'], ['discount', '할인율순'], ['low', '낮은가격순'], ['high', '높은가격순'], ['reviews', '리뷰많은순'], ['rating', '평점높은순'],
  ];

  const score = p => p.avgRating * Math.log(p.reviewCount + 2) + (p.sold || 0) * 0.05;
  const PAGE = 12;
  let shown = PAGE;

  function filtered() {
    const q = state.q.toLowerCase();
    let list = PRODUCTS.filter(p => {
      if (state.cat && p.category !== state.cat) return false;
      if (q && !q.split(/\s+/).every(w => (p.name + ' ' + getCategory(p.category).name + ' ' + p.seller).toLowerCase().includes(w))) return false;
      if (state.fast && !p.fast) return false;
      if (state.live && !p.live) return false;
      if (state.easy && !(p.pet && p.pet.care === '초보 추천')) return false;
      if (state.free && !p.freeShip) return false;
      if (state.min !== '' && p.price < Number(state.min)) return false;
      if (state.max !== '' && p.price > Number(state.max)) return false;
      return true;
    });
    const sorters = {
      recommend: (a, b) => score(b) - score(a),
      new: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) || b.id - a.id,
      discount: (a, b) => b.discount - a.discount,
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      reviews: (a, b) => b.reviewCount - a.reviewCount,
      rating: (a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount,
    };
    // 품절 상품은 항상 뒤로
    return list.sort((a, b) => (a.soldOut - b.soldOut) || (sorters[state.sort] || sorters.recommend)(a, b));
  }

  function title() {
    if (state.q) return `'${esc(state.q)}' 검색 결과`;
    if (state.cat) return getCategory(state.cat)?.name || '전체 상품';
    if (state.easy) return '🌱 초보 추천 친구들';
    if (state.live) return '🏡 가족을 기다리는 친구들';
    if (state.sort === 'discount') return '🔥 오늘의 특가';
    return '전체 상품';
  }

  function syncUrl() {
    const sp = new URLSearchParams();
    if (state.q) sp.set('q', state.q);
    if (state.cat) sp.set('cat', state.cat);
    if (state.sort !== 'recommend') sp.set('sort', state.sort);
    if (state.fast) sp.set('fast', '1');
    if (state.live) sp.set('live', '1');
    if (state.easy) sp.set('care', 'easy');
    history.replaceState(null, '', 'products.html' + (sp.toString() ? '?' + sp : ''));
  }

  function catLink(id, name) {
    const sp = new URLSearchParams();
    if (id) sp.set('cat', id);
    if (state.q) sp.set('q', state.q);
    return `<a class="cat ${state.cat === id ? 'active' : ''}" href="products.html${sp.toString() ? '?' + sp : ''}" data-cat="${id}">${name}</a>`;
  }

  $('#app').innerHTML = `
    <div class="list-layout">
      <details class="card filters" ${matchMedia('(max-width: 860px)').matches ? '' : 'open'}>
        <summary>🔧 필터 / 카테고리</summary>
        <div class="group"><h3>카테고리</h3>
          ${catLink('', '전체')}
          ${CATEGORIES.map(c => catLink(c.id, c.icon + ' ' + c.name)).join('')}
        </div>
        <div class="group"><h3>분양</h3>
          <label class="check"><input type="checkbox" id="fLive" ${state.live ? 'checked' : ''}> 🏡 가족을 기다리는 친구만</label>
          <label class="check" style="margin-top:8px"><input type="checkbox" id="fEasy" ${state.easy ? 'checked' : ''}> 🌱 초보 추천만</label>
        </div>
        <div class="group"><h3>용품 배송</h3>
          <label class="check"><input type="checkbox" id="fFast" ${state.fast ? 'checked' : ''}> 🚀 내일도착만</label>
          <label class="check" style="margin-top:8px"><input type="checkbox" id="fFree"> 무료배송만</label>
        </div>
        <div class="group"><h3>가격대</h3>
          <div class="row"><input class="input" id="fMin" type="number" min="0" placeholder="최소"><input class="input" id="fMax" type="number" min="0" placeholder="최대"></div>
          <button class="btn btn-sm btn-block" id="fApply" style="margin-top:8px">적용</button>
        </div>
      </details>
      <section>
        <h1 class="page-title" id="title"></h1>
        <div class="toolbar">
          <div class="muted" id="count"></div>
          <div class="sort-tabs">${SORTS.map(([k, v]) => `<button data-sort="${k}">${v}</button>`).join('')}</div>
        </div>
        <div id="results"></div>
      </section>
    </div>`;

  function render() {
    const list = filtered();
    $('#title').innerHTML = title();
    $('#count').textContent = `총 ${list.length}${list.every(p => p.live) && list.length ? '마리' : '개'}`;
    // 동물 목록에서는 가격·할인 정렬 대신 추천·최신·후기순만
    if (isAnimalView() && !ANIMAL_SORTS.includes(state.sort)) state.sort = 'recommend';
    $$('[data-sort]').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === state.sort);
      b.classList.toggle('hidden', isAnimalView() && !ANIMAL_SORTS.includes(b.dataset.sort));
      if (b.dataset.sort === 'reviews') b.textContent = isAnimalView() ? '입양후기순' : '리뷰많은순';
    });
    $('#results').innerHTML = list.length
      ? `<div class="grid">${list.slice(0, shown).map(productCard).join('')}</div>
         ${list.length > shown ? `<button class="btn load-more" id="more">상품 더보기 (${shown}/${list.length})</button>` : ''}`
      : `<div class="empty card"><div class="ico">🔍</div><p>조건에 맞는 상품이 없어요.<br>다른 검색어나 필터를 사용해 보세요.</p><a class="btn btn-outline" href="products.html">전체 상품 보기</a></div>`;
    syncUrl();
    const more = $('#more');
    if (more) more.addEventListener('click', () => { shown += PAGE; render(); });
  }
  const reset = () => { shown = PAGE; };

  $$('[data-sort]').forEach(b => b.addEventListener('click', () => { state.sort = b.dataset.sort; reset(); render(); }));
  $('#fFast').addEventListener('change', e => { state.fast = e.target.checked; reset(); render(); });
  $('#fFree').addEventListener('change', e => { state.free = e.target.checked; reset(); render(); });
  $('#fLive').addEventListener('change', e => { state.live = e.target.checked; reset(); render(); });
  $('#fEasy').addEventListener('change', e => { state.easy = e.target.checked; if (e.target.checked) { state.live = true; $('#fLive').checked = true; } reset(); render(); });
  $('#fApply').addEventListener('click', () => {
    let mn = $('#fMin').value, mx = $('#fMax').value;
    if (mn !== '' && mx !== '' && Number(mn) > Number(mx)) { [mn, mx] = [mx, mn]; $('#fMin').value = mn; $('#fMax').value = mx; }
    state.min = mn; state.max = mx; reset(); render();
  });
  render();
})();
