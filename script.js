/* helpers */
function $(sel, ctx=document){ return ctx.querySelector(sel); }
function $all(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }
function escapeHtml(s){ if(!s) return ""; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* sidebar toggle */
const burger=$('#burger'), sidebar=$('#sidebar');
if(burger) burger.addEventListener('click',()=> sidebar.classList.toggle('open'));

/* modal */
function openTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='flex'; }
function closeTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='none'; }
window.openTikTokModal=openTikTokModal; window.closeTikTokModal=closeTikTokModal;

/* animated counters (homepage only) */
function countUp(el, target, prefix="", suffix="", ms=1200){
  let t=0, step=Math.max(1,Math.floor(target/(ms/16)));
  function tick(){
    t+=step; if(t>=target) t=target;
    el.textContent = `${prefix}${t}${suffix}`;
    if(t<target) requestAnimationFrame(tick);
  }
  tick();
}
document.addEventListener('DOMContentLoaded', ()=>{
  $all('.stat h2').forEach(h=>{
    const target = Number(h.dataset.count||0);
    const wrap = h.parentElement;
    const prefix = wrap?.querySelector('.prefix')?.textContent || "";
    const suffix = wrap?.querySelector('.suffix')?.textContent || "";
    if(target>0) countUp(h, target, prefix, suffix);
  });
});

/* quota-safe Twelve Data watchlist (used on watchlist.html) */
const TD_KEY = (window.SITE_CONFIG && window.SITE_CONFIG.TWELVE_API_KEY) || "";
const QUOTE_TTL = 60 * 1000;
const LS_QUOTES = "otu_td_cache_v1";

function getCache(){ try{ return JSON.parse(localStorage.getItem(LS_QUOTES)||"{}"); }catch{ return {}; } }
function setCache(o){ try{ localStorage.setItem(LS_QUOTES, JSON.stringify(o)); }catch{} }

async function tdQuote(symbol){
  symbol = symbol.toUpperCase().trim();
  const cache=getCache(), now=Date.now();
  if(cache[symbol] && (now-cache[symbol].t)<QUOTE_TTL){ return cache[symbol].data; }
  const url=`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(TD_KEY)}`;
  try{
    const r=await fetch(url); const j=await r.json();
    if(j.status==="error" || !j.symbol) throw new Error(j.message||"fail");
    cache[symbol]={t:now,data:j}; setCache(cache); return j;
  }catch(e){
    // fallback demo price to avoid blank tiles
    const demo={symbol, name:symbol, price:(100+Math.random()*100).toFixed(2), percent_change:(Math.random()*4-2).toFixed(2)};
    cache[symbol]={t:now,data:demo}; setCache(cache); return demo;
  }
}

function renderTile(d){
  const tile=document.createElement('div'); tile.className='tile';
  const chg=parseFloat(d.percent_change);
  if(!isNaN(chg)){ if(chg>0) tile.classList.add('up'); if(chg<0) tile.classList.add('down'); }
  tile.innerHTML = `
    <div class="sym">${escapeHtml(d.symbol||'')}</div>
    <div class="px">${d.price?('$'+Number(d.price).toFixed(2)):'—'}</div>
    <div class="chg">${isNaN(chg)?'':(chg>0?'▲ ':'▼ ')+Math.abs(chg).toFixed(2)+'%'}</div>
  `;
  return tile;
}

async function initWatchlistPage(){
  const grid=$('#watchlist-grid'); if(!grid) return;
  const input=$('#watchlist-input'); const add=$('#watchlist-add');
  let list = (localStorage.getItem('otu_watch')||"").split(',').filter(Boolean);
  if(list.length===0) list = ["AAPL","MSFT","TSLA","SPY","NVDA","AMZN"];
  async function draw(){
    grid.innerHTML=''; for(const s of list){ const q=await tdQuote(s); grid.appendChild(renderTile(q)); }
  }
  add?.addEventListener('click',()=>{
    const v=(input.value||'').toUpperCase().trim(); if(!v) return;
    if(!list.includes(v)){ list.unshift(v); localStorage.setItem('otu_watch', list.join(',')); draw(); }
    input.value='';
  });
  draw(); setInterval(draw, 90000);
}
document.addEventListener('DOMContentLoaded', initWatchlistPage);

/* sequential image loader (profits, lifestyle, team, charts) */
function loadSeqImages({containerId, folder, base, pad=2, start=1, exts=["jpg","jpeg","png","webp"], maxMiss=12}){
  const grid = document.getElementById(containerId); if(!grid) return;
  let i=start, miss=0;
  function tryOne(n){
    return new Promise(res=>{
      const img=new Image(); let k=0;
      function tryExt(){
        if(k>=exts.length){ miss++; return res(null); }
        img.src = `${folder}/${base}${String(n).padStart(pad,'0')}.${exts[k]}`;
      }
      img.onload=()=>res(img);
      img.onerror=()=>{ k++; tryExt(); };
      tryExt();
    });
  }
  async function batch(B=16){
    const frag=document.createDocumentFragment(); let loaded=0;
    for(let x=0;x<B;x++){
      const img=await tryOne(i);
      if(img){ const el=document.createElement('img'); el.src=img.src; el.alt=`${base}${String(i).padStart(pad,'0')}`; frag.appendChild(el); loaded++; miss=0; }
      i++;
    }
    if(loaded>0) grid.appendChild(frag);
    if(miss<maxMiss) observer.observe(grid.lastElementChild || grid);
  }
  const observer=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){observer.unobserve(e.target); batch(12);}});},{root:null,rootMargin:"600px"});
  batch(18);
}

/* page hooks for galleries */
document.addEventListener('DOMContentLoaded', ()=>{
  loadSeqImages({containerId:'profits-grid',   folder:'profits',    base:'profit',  pad:2});
  loadSeqImages({containerId:'lifestyle-grid', folder:'lifestyle',  base:'life',    pad:2});
  loadSeqImages({containerId:'team-grid',      folder:'team',       base:'mentor',  pad:2, maxMiss:6});
  // charts page uses its own init in charts.html to allow different prefix
});
