/* ========= BASIC CONFIG (overridden by config.js if present) ========= */
window.SITE_CONFIG = Object.assign({
  TWELVE_API_KEY: "xxxx", // overridden by config.js if present
  watchlistSymbols: ["AAPL","MSFT","TSLA","SPY","NVDA","AMZN"],
  testimonialsJsonPath: "data/json/testimonials.json",
  modulesJsonPath: "data/json/modules.json",
  glossaryJsonPath: "data/json/glossary.json",
  tradersCsvPath: "data/traders_5000.csv"
}, window.SITE_CONFIG || {});

/* ========= UTIL ========= */
function $(sel, ctx=document){ return ctx.querySelector(sel); }
function $all(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }
function escapeHtml(s){ if(!s) return ""; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ========= SIDEBAR TOGGLE ========= */
(function(){
  const burger = $('#burger'); const sidebar = $('#sidebar');
  if(burger && sidebar){
    burger.addEventListener('click', ()=> sidebar.classList.toggle('open'));
  }
})();

/* ========= TIKTOK MODAL ========= */
function openTikTokModal(){ const m = $('#tt-modal'); if(m) m.style.display = 'flex'; }
function closeTikTokModal(){ const m = $('#tt-modal'); if(m) m.style.display = 'none'; }
window.openTikTokModal = openTikTokModal;
window.closeTikTokModal = closeTikTokModal;

/* ========= STATS APPEAR/DISAPPEAR (no counting/moving) ========= */
(function(){
  const obs = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting) e.target.classList.add('visible');
      else e.target.classList.remove('visible');
    });
  }, {threshold:0.35});
  $all('.fade-stat').forEach(el=> obs.observe(el));
})();

/* ========= TRADER CSV COUNT ========= */
(async function(){
  const badge = $('#trader-count-badge');
  if(!badge) return;
  try{
    const res = await fetch(window.SITE_CONFIG.tradersCsvPath, {cache:'no-store'});
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    badge.textContent = `Traders: ${lines.length}+`;
  }catch(e){
    badge.textContent = `Traders: 5000+`;
  }
})();

/* ========= WATCHLIST (Twelve Data) with quota-friendly caching ========= */
const TD_KEY = (window.SITE_CONFIG.TWELVE_API_KEY && window.SITE_CONFIG.TWELVE_API_KEY.trim()) || "xxxx";
const CACHE_TTL_MS = 60 * 1000; // 60s
const LS_KEY = "otu_quote_cache_v1";

function getCache(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); }catch{ return {}; } }
function setCache(obj){ try{ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }catch{} }

async function fetchQuote(symbol){
  symbol = symbol.toUpperCase().trim();
  const cache = getCache();
  const now = Date.now();
  if(cache[symbol] && (now - cache[symbol].t) < CACHE_TTL_MS){
    return cache[symbol].data;
  }
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(TD_KEY)}`;
  try{
    const r = await fetch(url);
    const j = await r.json();
    if(j.status === "error" || !j.symbol){ throw new Error(j.message || "bad"); }
    cache[symbol] = {t: now, data: j};
    setCache(cache);
    return j;
  }catch(e){
    cache[symbol] = {t: now, data: {symbol, name:symbol, price: null}};
    setCache(cache);
    return cache[symbol].data;
  }
}

function renderTile(data){
  const wrap = document.createElement('div');
  wrap.className = 'tile';
  const px = parseFloat(data.price);
  const chg = parseFloat(data.percent_change);
  if(!isNaN(chg)){
    if(chg > 0) wrap.classList.add('up');
    if(chg < 0) wrap.classList.add('down');
  }
  wrap.innerHTML = `
    <div class="sym">${escapeHtml(data.symbol || '')}</div>
    <div class="px">${data.price ? '$'+Number(px).toFixed(2) : '—'}</div>
    <div class="chg">${isNaN(chg)? '' : (chg>0? '▲':'▼')} ${isNaN(chg)? '' : Math.abs(chg).toFixed(2)}%</div>
  `;
  return wrap;
}

async function initWatchlist(){
  const grid = $('#watchlist-grid');
  const add = $('#watchlist-add');
  const input = $('#watchlist-input');
  if(!grid) return;

  let symbols = (localStorage.getItem('otu_watchlist') || '').split(',').filter(Boolean);
  if(symbols.length === 0) symbols = window.SITE_CONFIG.watchlistSymbols.slice();

  async function draw(){
    grid.innerHTML = '';
    for(const s of symbols){
      const d = await fetchQuote(s);
      grid.appendChild(renderTile(d));
    }
  }

  add?.addEventListener('click', ()=>{
    const v = (input.value || '').toUpperCase().trim();
    if(!v) return;
    if(!symbols.includes(v)){
      symbols.unshift(v);
      localStorage.setItem('otu_watchlist', symbols.join(','));
      draw();
    }
    input.value = '';
  });

  draw();
  setInterval(draw, 90 * 1000);
}
initWatchlist();

/* ========= INFINITE-STYLE IMAGE LOADING ========= */
function loadSequentialImages({containerId, folder, prefix, start=1, pad=2, exts=["jpg","jpeg","png","webp"], maxMiss=12}){
  const grid = document.getElementById(containerId);
  if(!grid) return;
  let i = start, missed = 0;

  function tryNextBatch(batch=12){
    let loadedAny = false;
    const frag = document.createDocumentFragment();
    for(let k=0;k<batch;k++){
      const base = prefix + String(i).padStart(pad,'0');
      const img = new Image();
      let tried = 0;

      function tryExt(){
        if(tried >= exts.length){
          missed++; i++;
          if(missed >= maxMiss) observer && observer.disconnect();
          return;
        }
        const src = `${folder}/${base}.${exts[tried]}`;
        img.src = src;
      }
      img.loading = "lazy";
      img.alt = `${prefix} ${i}`;
      img.onerror = ()=>{ tried++; tryExt(); };
      img.onload = ()=>{
        missed = 0; loadedAny = true;
        const el = document.createElement('img');
        el.src = img.src; el.alt = img.alt;
        frag.appendChild(el);
        i++;
      };
      tryExt();
    }
    if(loadedAny) grid.appendChild(frag);
  }

  tryNextBatch(16);

  const observer = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ tryNextBatch(12); }
    });
  }, {root:null, rootMargin:"600px", threshold:0});
  observer.observe(grid.lastElementChild || grid);
}

/* ========= PROFITS & LIFESTYLE GRIDS ========= */
document.addEventListener('DOMContentLoaded', ()=>{
  loadSequentialImages({
    containerId:'profits-grid', folder:'profits', prefix:'profit', start:1, pad:2, exts:["png","jpg","jpeg","webp"], maxMiss:10
  });
  loadSequentialImages({
    containerId:'lifestyle-grid', folder:'lifestyle', prefix:'life', start:1, pad:2, exts:["jpg","jpeg","png","webp"], maxMiss:10
  });
});

/* ========= TESTIMONIALS PREVIEW ========= */
(async function(){
  const box = $('#testimonials-preview');
  if(!box) return;
  try{
    const res = await fetch(window.SITE_CONFIG.testimonialsJsonPath, {cache:'no-store'});
    const items = await res.json();
    let list = items;
    if(items.length > 6){
      list = [];
      const used = new Set();
      while(list.length < 6){
        const r = Math.floor(Math.random()*items.length);
        if(!used.has(r)){ used.add(r); list.push(items[r]); }
      }
    }
    box.innerHTML = list.map(t=>`
      <article class="testi">
        <div class="name">${escapeHtml(t.name || 'Trader')}</div>
        <div class="txt">${escapeHtml(t.text || '').replace(/\n/g,'\n')}</div>
      </article>
    `).join('');
  }catch(e){
    box.innerHTML = `<p class="fineprint">Upload <code>${window.SITE_CONFIG.testimonialsJsonPath}</code> to show testimonials.</p>`;
  }
})();

/* ========= TICKER BAR ========= */
(function(){
  const el = $('#ticker');
  if(!el) return;
  const items = [
    "Mentorship-first access • DM to begin",
    "Risk managed, process driven",
    "Modules • Glossary • Calculators • Charts",
    "Upload more images to /lifestyle & /profits — auto-detected",
    "Twelve Data watchlist — cached for API quota"
  ];
  const inner = document.createElement('div'); inner.className='ticker-inner';
  inner.innerHTML = items.concat(items).map(t=>`<span class="ticker-item">${escapeHtml(t)}</span>`).join('');
  el.appendChild(inner);
})();

/* ========= OPTIONAL: POPUPS FROM CSV (silent if missing) ========= */
/* Expect data/trades.csv with columns: time,symbol,action,pnl */
(async function(){
  try{
    const res = await fetch('data/trades.csv', {cache:'no-store'});
    if(!res.ok) return;
    const text = await res.text();
    const rows = text.trim().split(/\r?\n/).slice(1);
    if(rows.length === 0) return;
    setInterval(()=>{
      const r = rows[Math.floor(Math.random()*rows.length)].split(',');
      const div = document.createElement('div');
      div.style.position='fixed'; div.style.right='16px'; div.style.bottom='16px';
      div.style.background='#101a33'; div.style.color='#fff'; div.style.padding='10px 12px';
      div.style.border='1px solid #22305a'; div.style.borderRadius='10px';
      div.style.boxShadow='0 10px 30px rgba(0,0,0,.25)'; div.style.zIndex=80;
      div.style.fontSize='14px';
      div.textContent = `${r[1]} ${r[2]} • P&L: ${r[3]}`;
      document.body.appendChild(div);
      setTimeout(()=> div.remove(), 5000);
    }, 45000);
  }catch(e){}
})();
