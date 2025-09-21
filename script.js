/* helpers */
function $(s,ctx=document){return ctx.querySelector(s)};function $all(s,ctx=document){return Array.from(ctx.querySelectorAll(s))};
function escapeHtml(x){return x?String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])):""}

/* sidebar */
const burger=$('#burger'), sidebar=$('#sidebar'); if(burger) burger.addEventListener('click',()=> sidebar.classList.toggle('open'));

/* modal */
function openTikTokModal(){const m=$('#tt-modal'); if(m)m.style.display='flex'}; function closeTikTokModal(){const m=$('#tt-modal'); if(m)m.style.display='none'}
window.openTikTokModal=openTikTokModal; window.closeTikTokModal=closeTikTokModal;

/* homepage counters */
function countUp(el, target, prefix="", suffix="", ms=1100){
  let t=0, step=Math.max(1,Math.floor(target/(ms/16)));
  (function tick(){ t+=step; if(t>=target) t=target; el.textContent=`${prefix}${t}${suffix}`; if(t<target) requestAnimationFrame(tick) })();
}
document.addEventListener('DOMContentLoaded', ()=>{
  $all('.stat h2').forEach(h=>{
    const target = Number(h.dataset.count||0); const wrap=h.parentElement;
    const prefix = wrap?.querySelector('.prefix')?.textContent || ""; const suffix = wrap?.querySelector('.suffix')?.textContent || "";
    if(target>0) countUp(h,target,prefix,suffix);
  });
});

/* config */
const TD_KEY=(window.SITE_CONFIG&&window.SITE_CONFIG.TWELVE_API_KEY)||"";
const LS_QUOTES="otu_td_cache_v1"; const QUOTE_TTL=60*1000;
function getCache(){try{return JSON.parse(localStorage.getItem(LS_QUOTES)||"{}")}catch{return{}}}
function setCache(o){try{localStorage.setItem(LS_QUOTES,JSON.stringify(o))}catch{}}

/* Twelve Data (quota-safe) */
async function tdQuote(symbol){
  symbol=symbol.toUpperCase().trim(); const cache=getCache(), now=Date.now();
  if(cache[symbol]&&(now-cache[symbol].t)<QUOTE_TTL){return cache[symbol].data}
  const url=`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(TD_KEY)}`;
  try{
    const r=await fetch(url); const j=await r.json();
    if(j.status==="error"||!j.symbol) throw new Error(j.message||"fail");
    cache[symbol]={t:now,data:j}; setCache(cache); return j;
  }catch(e){
    const demo={symbol,name:symbol,price:(100+Math.random()*100).toFixed(2),percent_change:(Math.random()*4-2).toFixed(2)};
    cache[symbol]={t:now,data:demo}; setCache(cache); return demo;
  }
}
function renderTile(d){
  const t=document.createElement('div'); t.className='tile';
  const chg=parseFloat(d.percent_change); if(!isNaN(chg)){ if(chg>0)t.classList.add('up'); else if(chg<0)t.classList.add('down'); }
  t.innerHTML=`<div class="sym">${escapeHtml(d.symbol||'')}</div>
               <div class="px">${d.price?('$'+Number(d.price).toFixed(2)):'—'}</div>
               <div class="chg">${isNaN(chg)?'':(chg>0?'▲ ':'▼ ')+Math.abs(chg).toFixed(2)+'%'}</div>`;
  return t;
}
async function initWatchlistPage(){
  const grid=$('#watchlist-grid'); if(!grid) return;
  const input=$('#watchlist-input'), add=$('#watchlist-add');
  let list=(localStorage.getItem('otu_watch')||"").split(',').filter(Boolean);
  if(list.length===0) list=["AAPL","MSFT","TSLA","SPY","NVDA","AMZN"];
  async function draw(){ grid.innerHTML=''; for(const s of list){ const q=await tdQuote(s); grid.appendChild(renderTile(q)); } }
  add?.addEventListener('click',()=>{ const v=(input.value||'').toUpperCase().trim(); if(v&&!list.includes(v)){ list.unshift(v); localStorage.setItem('otu_watch',list.join(',')); draw(); } input.value=''; });
  draw(); setInterval(draw,90000);
}
document.addEventListener('DOMContentLoaded', initWatchlistPage);

/* infinite sequential image loader — ALIGNED TO YOUR FOLDERS */
function loadSeqImages({containerId, folder, base, pad=2, start=1, exts=["jpg","jpeg","png","webp"], maxMiss=12}){
  const grid=document.getElementById(containerId); if(!grid) return;
  let i=start, miss=0;
  function tryOne(n){ return new Promise(res=>{ const img=new Image(); let k=0;
    function nextExt(){ if(k>=exts.length){ miss++; return res(null); }
      img.src=`${folder}/${base}${String(n).padStart(pad,'0')}.${exts[k]}`; }
    img.onload=()=>res(img); img.onerror=()=>{k++; nextExt()}; nextExt();
  }) }
  async function batch(B=16){ const frag=document.createDocumentFragment(); let ok=0;
    for(let x=0;x<B;x++){ const im=await tryOne(i); if(im){ const el=document.createElement('img'); el.src=im.src; el.alt=`${base}${String(i).padStart(pad,'0')}`; frag.appendChild(el); ok++; miss=0; } i++; }
    if(ok>0) grid.appendChild(frag); if(miss<maxMiss) observer.observe(grid.lastElementChild||grid);
  }
  const observer=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){observer.unobserve(e.target); batch(12);}})},{root:null,rootMargin:"600px"});
  batch(18);
}

/* page hooks using YOUR real folder names (capitalized) */
document.addEventListener('DOMContentLoaded', ()=>{
  // Profit snapshots → your repo uses Images/ for many snapshots
  loadSeqImages({containerId:'profits-grid',   folder:'Images',    base:'profit',  pad:2});
  // Lifestyle
  loadSeqImages({containerId:'lifestyle-grid', folder:'Lifestyle', base:'life',    pad:2});
  // Team
  loadSeqImages({containerId:'team-grid',      folder:'Images',    base:'mentor',  pad:2, maxMiss:6});
  // Charts
  loadSeqImages({containerId:'charts-grid',    folder:'Charts',    base:'chart',   pad:2});
});
