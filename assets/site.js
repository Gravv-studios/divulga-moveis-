(() => {
  'use strict';
  const $ = (q, root = document) => root.querySelector(q);
  const $$ = (q, root = document) => [...root.querySelectorAll(q)];
  const products = window.DIVULGA_PRODUCTS || [];
  const byId = new Map(products.map(p => [p.id, p]));
  const base = document.body.dataset.base || '';
  const key = 'divulga-orcamento-v1';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const tinyIcon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="${{minus:'M5 12h14',plus:'M5 12h14M12 5v14',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',bag:'M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2'}[name]}"/></svg>`;
  let cart = [];
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(stored)) cart = stored.filter(x => x && byId.has(x.id) && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 99).filter((x,i,a) => a.findIndex(y => y.id === x.id) === i).map(x => ({id:x.id,quantity:x.quantity}));
  } catch { cart = []; }
  const dialog = $('#quote-dialog');
  let returnFocus = null;
  let toastTimer;
  function toast(message) {
    const target = $('#toast');
    target.textContent = message;
    target.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => target.classList.remove('visible'), 3200);
  }
  function updateLink() {
    const lines = cart.map(item => {
      const product = byId.get(item.id);
      return `${item.quantity} × ${product.name}\nLinha: ${product.line}${product.code ? `\nCódigo: ${product.code}` : ''}\nDescrição: ${product.description}\nProduto: ${product.product_url}${product.image_url ? `\nImagem: ${product.image_url}` : ''}`;
    });
    const note = $('#quote-note').value.trim();
    const text = ['Olá! Gostaria de um orçamento com a Divulga Móveis.', ...lines, note ? 'Observações: ' + note : '', 'Por favor, informe valores, acabamentos disponíveis e condições de entrega.'].filter(Boolean).join('\n\n');
    $('#send-quote').href = 'https://wa.me/556133573561?text=' + encodeURIComponent(text);
    $('#send-email').href = 'mailto:divulgamoveis@gmail.com?subject=' + encodeURIComponent('Solicitação de orçamento — Divulga Móveis') + '&body=' + encodeURIComponent(text);
  }
  function renderCart() {
    const total = cart.reduce((n,x) => n + x.quantity, 0);
    $$('[data-cart-count]').forEach(el => { el.textContent = total; });
    $$('[data-open-quote]').forEach(el => { el.setAttribute('aria-label', `Abrir meu orçamento, ${total} ${total === 1 ? 'item' : 'itens'}`); });
    $$('[data-add]').forEach(el => {
      const selected = cart.some(x => x.id === el.dataset.add);
      el.classList.toggle('is-added', selected);
      if (el.classList.contains('add-product')) el.innerHTML = tinyIcon(selected ? 'check' : 'plus');
    });
    $('#quote-summary').hidden = !cart.length;
    $('#quote-items').innerHTML = cart.length ? cart.map(item => {
      const p = byId.get(item.id);
      return `<article class="quote-item">${p.image ? `<img src="${base}assets/img/${escape(p.image)}" alt="${escape(p.name)}">` : '<span class="no-photo">Sem foto</span>'}<div><h3><a href="${base}produto/${escape(p.slug)}/index.html">${escape(p.name)}</a></h3><p>${escape(p.line)}</p>${p.code ? `<p class="product-code">Código: ${escape(p.code)}</p>` : ''}<div class="quantity"><button data-decrease="${escape(p.id)}" aria-label="Diminuir quantidade de ${escape(p.name)}" ${item.quantity === 1 ? 'disabled' : ''}>${tinyIcon('minus')}</button><span aria-label="Quantidade">${item.quantity}</span><button data-increase="${escape(p.id)}" aria-label="Aumentar quantidade de ${escape(p.name)}" ${item.quantity === 99 ? 'disabled' : ''}>${tinyIcon('plus')}</button></div></div><button class="quote-remove" data-remove="${escape(p.id)}" aria-label="Remover ${escape(p.name)} do orçamento">${tinyIcon('close')}</button></article>`;
    }).join('') : `<div class="quote-empty">${tinyIcon('bag')}<h3>Seu espaço começa<br>com uma escolha.</h3><p>Adicione os móveis que você gostou e peça um orçamento com todos os itens.</p><a href="${base}catalogo.html" class="button primary">Explorar os móveis</a></div>`;
    updateLink();
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(cart)); } catch { /* A seleção continua válida durante esta visita. */ }
    renderCart();
  }
  document.addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    if (add && byId.has(add.dataset.add)) {
      const existing = cart.find(x => x.id === add.dataset.add);
      if (existing) {
        if (existing.quantity >= 99) return toast('Limite de 99 unidades por item. Informe quantidades maiores nas observações.');
        existing.quantity++;
      } else cart.push({id:add.dataset.add,quantity:1});
      save(); toast('Produto adicionado ao seu orçamento.');
    }
    const modifier = event.target.closest('[data-increase],[data-decrease],[data-remove]');
    if (modifier) {
      const action = modifier.hasAttribute('data-increase') ? 'increase' : modifier.hasAttribute('data-decrease') ? 'decrease' : 'remove';
      const id = modifier.dataset[action];
      const item = cart.find(x => x.id === id);
      if (!item) return;
      const previousIndex = cart.indexOf(item);
      if (action === 'remove') cart = cart.filter(x => x.id !== id);
      else item.quantity = Math.min(99, Math.max(1, item.quantity + (action === 'increase' ? 1 : -1)));
      save();
      // Restore keyboard focus after the quantity controls are redrawn.
      const matching = $$(`[data-${action}]`, dialog).find(x => x.dataset[action] === id && !x.disabled);
      const fallback = $$('.quote-remove', dialog)[Math.min(previousIndex,cart.length-1)] || $('[data-close-quote]');
      (matching || fallback).focus();
    }
    if (event.target.closest('[data-open-quote]')) {
      returnFocus = event.target.closest('[data-open-quote]');
      renderCart(); dialog.showModal(); document.body.classList.add('dialog-open');
    }
    if (event.target.closest('[data-close-quote]')) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); returnFocus?.focus(); });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right)) dialog.close();
  });
  $('#quote-note').addEventListener('input', updateLink);
  window.addEventListener('storage', event => {
    if (event.key !== key) return;
    try {
      const incoming = JSON.parse(event.newValue || '[]');
      cart = Array.isArray(incoming) ? incoming.filter(x => x && byId.has(x.id) && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 99).filter((x,i,a) => a.findIndex(y => y.id === x.id) === i).map(x => ({id:x.id,quantity:x.quantity})) : [];
      renderCart();
    } catch { /* Ignore malformed external storage writes. */ }
  });
  renderCart();
  const menu = $('.menu-toggle'), nav = $('#main-nav');
  function closeMenu() { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','Abrir menu'); }
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  const catalog = $('[data-catalog]');
  if (!catalog) return;
  const search = $('#busca'), category = $('#category-filter'), line = $('#line-filter');
  const cards = $$('[data-product-card]', catalog);
  const allLines = [...new Set(cards.map(card => card.dataset.line))].sort((a,b) => a.localeCompare(b,'pt-BR'));
  let visibleCount = 16;
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  if (!catalog.dataset.fixedCategory && [...category.options].some(x => x.value === params.get('categoria'))) category.value = params.get('categoria');
  function updateLines() {
    const previous = line.value;
    const available = category.value ? [...new Set(cards.filter(x => x.dataset.category === category.value).map(x => x.dataset.line))].sort((a,b) => a.localeCompare(b,'pt-BR')) : allLines;
    line.innerHTML = '<option value="">Todos os tipos</option>' + available.map(x => `<option>${escape(x)}</option>`).join('');
    if (available.includes(previous)) line.value = previous;
  }
  function filter(updateURL = true) {
    const query = normalize(search.value.trim());
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = cards.filter(card => (!category.value || card.dataset.category === category.value) && (!line.value || card.dataset.line === line.value) && tokens.every(token => normalize(card.dataset.search).includes(token)));
    cards.forEach(card => { card.hidden = true; });
    matches.slice(0,visibleCount).forEach(card => { card.hidden = false; });
    $('#results-count').textContent = matches.length === 1 ? '1 produto encontrado' : `${matches.length} produtos encontrados`;
    $('.empty-results').hidden = matches.length > 0;
    $('#load-more').hidden = matches.length <= visibleCount;
    if (matches.length > visibleCount) $('#load-more').firstChild.textContent = `Ver mais produtos (${matches.length - visibleCount}) `;
    $('.clear-search').hidden = !search.value;
    if (updateURL) {
      const url = new URL(location.href);
      search.value.trim() ? url.searchParams.set('q',search.value.trim()) : url.searchParams.delete('q');
      category.value && !catalog.dataset.fixedCategory ? url.searchParams.set('categoria',category.value) : url.searchParams.delete('categoria');
      line.value ? url.searchParams.set('linha',line.value) : url.searchParams.delete('linha');
      try { history.replaceState(null,'',url); } catch { /* File previews may not support history updates. */ }
    }
  }
  search.addEventListener('input', () => { visibleCount=16; filter(); });
  category.addEventListener('change', () => { visibleCount=16; updateLines(); filter(); });
  line.addEventListener('change', () => { visibleCount=16; filter(); });
  $('.clear-search').addEventListener('click', () => { search.value=''; visibleCount=16; filter(); search.focus(); });
  $('#reset-filters').addEventListener('click', () => { search.value=''; category.value=catalog.dataset.fixedCategory; line.value=''; visibleCount=16; updateLines(); filter(); search.focus(); });
  $('#load-more').addEventListener('click', () => {
    const previous = new Set(cards.filter(c => !c.hidden));
    visibleCount+=16; filter();
    const firstNew = cards.find(c => !c.hidden && !previous.has(c));
    if (firstNew) $('a',firstNew).focus({preventScroll:true});
  });
  updateLines();
  if ([...line.options].some(x => x.value === params.get('linha'))) line.value=params.get('linha');
  filter(false);
})();
