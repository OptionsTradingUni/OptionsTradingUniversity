/* =========================
   Options Trading University
   Full script.js (ALL features)
   ========================= */

/* ---------- tiny helpers ---------- */
const $  = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
const esc = s => s ? String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : "";

/* Safe config (with fallbacks if config.js is missing) */
const CFG = (() => {
  const c = (window.SITE_CONFIG||{});
  return {
    TD_KEY: (c.TWELVE_API_KEY||""),
    TRADERS_CSV: (c.tradersCsvPath||"data/traders_5000.csv"),
    PATHS: {
      modules:      c.jsonPaths?.modules      || "data/modules.json",
      glossary:     c.jsonPaths?.glossary     || "data/glossary.json",
      testimonials: c.jsonPaths?.testimonials || "data/testimonials.json",
      team:         c.jsonPaths?.team         || "data/team.json",
    }
  };
})();

/* Generic fetch helpers */
async function head(url){
  try{ const r=await fetch(url,{method:"HEAD",cache:"no-store"}); return r.ok; }catch{ return false; }
}
async function loadJSON(path){
  try{ const r=await fetch(path,{cache:"no-store"}); if(!r.ok) throw 0; return await r.json();
  }catch{ return null; }
}
async function loadText(path){
  try{ const r=await fetch(path,{cache:"no-store"}); if(!r.ok) throw 0; return await r.text();
  }catch{ return null; }
}

/* ---------- Sidebar (mobile) ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  const burger=$('#burger'), sidebar=$('#sidebar');
  if(burger && sidebar){
    burger.addEventListener('click', ()=>{
      const isShown = getComputedStyle(sidebar).display !== 'none';
      sidebar.style.display = isShown ? 'none' : 'block';
    });
  }
});

/* ---------- TikTok modal ---------- */
function openTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='flex'; }
function closeTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='none'; }
window.openTikTokModal=openTikTokModal; window.closeTikTokModal=closeTikTokModal;

/* ---------- Count-up (if you add stats somewhere) ---------- */
function countUp(el, target, duration=1000){
  let val=0; const step=Math.max(1,Math.floor(target/(duration/16)));
  (function tick(){ val+=step; if(val>=target) val=target; el.textContent=val; if(val<target) requestAnimationFrame(tick); })();
}
document.addEventListener('DOMContentLoaded', ()=> $$('.stat h2').forEach(h=>{ const t=parseInt(h.dataset.count||'0',10); if(t>0) countUp(h,t); }));

/* ---------- CSV: traders_5000.csv -> names ---------- */
let OTU_NAMES = null;
function parseCSVNames(text){
  const lines = text.split(/\r?\n/).filter(Boolean);
  const res=[];
  for(const ln of lines){
    const cells = ln.split(',').map(s=>s.trim());
    if(cells.length===0) continue;
    if(cells.length===1){ const n=cells[0]; if(n && n.length<60) res.push(n); }
    else { const n=(cells[0]+' '+cells[1]).trim(); if(n && n.length<60) res.push(n); }
    if(res.length>5000) break;
  }
  return res;
}
async function getNames(){
  if(OTU_NAMES && OTU_NAMES.length) return OTU_NAMES;
  const csv = await loadText(CFG.TRADERS_CSV);
  if(csv){ const parsed=parseCSVNames(csv); if(parsed.length>0){ OTU_NAMES=parsed; return OTU_NAMES; } }
  OTU_NAMES = [
    "Ava Thompson","Noah Carter","Mia Hernandez","Ethan Brooks","Chloe Robinson","Liam Parker","Isabella Murphy",
    "Jackson Reed","Amelia Bailey","Benjamin Hayes","Scarlett Cooper","Lucas Ward","Harper Powell","Elijah Foster",
    "Emily Jordan","Sophia Lee","Daniel Brooks","Olivia Martin","Michael Young","Emma Davis","Ethan Miller","Mason Johnson",
    "Chloe Wilson","Logan Moore","Nora Taylor","Liam Anderson","Mia Thomas","Caleb Jackson","Layla White","Noah Harris","Zoe Martin"
  ];
  return OTU_NAMES;
}
function randomNameFrom(list){ return list[Math.floor(Math.random()*list.length)]; }

/* ---------- Live Profit Ticker (liveprofits.html) ---------- */
async function initLiveTicker(){
  const wrap = $('#live-ticker'); if(!wrap) return;
  const names = await getNames();
  const track=document.createElement('div'); track.className='ticker';
  function profit(){ return Math.floor(120 + Math.random()*1300); }
  function msg(){ const n=randomNameFrom(names); return `💰 ${n} closed +$${profit()} just now`; }
  const items = new Array(10).fill(0).map(()=>{ const s=document.createElement('span'); s.className='item'; s.textContent=msg(); return s; });
  items.concat(items.map(s=>s.cloneNode(true))).forEach(s=>track.appendChild(s));
  wrap.appendChild(track);
  setInterval(()=>{ const first=track.firstElementChild; if(!first) return; const clone=first.cloneNode(true); clone.textContent=msg(); track.appendChild(clone); track.removeChild(first); }, 7000);
}
document.addEventListener('DOMContentLoaded', initLiveTicker);

/* ---------- Profit Snapshots Carousel (Images/imgN.*) ---------- */
async function initProfitCarousel(){
  const stage=$('#profit-stage'); if(!stage) return;
  const caption=$('#profit-caption'); const prev=$('#profit-prev'); const next=$('#profit-next'); const playBtn=$('#profit-play');
  const exts=["jpeg","jpg","png","webp"]; const folder="Images"; const base="img";

  const names = await getNames();
  const reasons=["breakout","trend pullback","earnings drift","range flip","volume spike","gap continuation","VWAP reclaim","support bounce","news catalyst","trend following","gap fill"];

  async function collect(){
    const urls=[]; let i=1, miss=0;
    while(miss<5){
      let found=null;
      for(const e of exts){ const u=`${folder}/${base}${i}.${e}`; if(await head(u)){ found=u; break; } }
      if(found){ urls.push(found); miss=0; } else { miss++; }
      i++; if(i>10000) break;
    }
    return urls;
  }
  function mk(src){ const im=document.createElement('img'); im.src=src; return im; }
  function profitText(){ const n=randomNameFrom(names); const p=Math.floor(200+Math.random()*1800); const r=reasons[Math.floor(Math.random()*reasons.length)]; return `${n} cashed +$${p} on ${r}`; }

  const urls = await collect(); if(urls.length===0) return;
  const imgs = urls.map(mk); imgs.forEach((im,i)=>{ if(i===0) im.classList.add('active'); stage.appendChild(im); });
  let idx=0, playing=true, timer=null;
  function show(i){ $$('#profit-stage img').forEach((im,k)=>im.classList.toggle('active',k===i)); if(caption) caption.textContent=profitText(); }
  function nextSlide(){ idx=(idx+1)%imgs.length; show(idx); }
  function prevSlide(){ idx=(idx-1+imgs.length)%imgs.length; show(idx); }
  function play(){ if(timer) clearInterval(timer); timer=setInterval(nextSlide,3800); playing=true; if(playBtn) playBtn.textContent='Pause'; }
  function pause(){ if(timer) clearInterval(timer); playing=false; if(playBtn) playBtn.textContent='Play'; }
  next?.addEventListener('click',()=>{ pause(); nextSlide(); });
  prev?.addEventListener('click',()=>{ pause(); prevSlide(); });
  playBtn?.addEventListener('click',()=>{ if(playing) pause(); else play(); });
  if(caption) caption.textContent=profitText();
  play();
}
document.addEventListener('DOMContentLoaded', initProfitCarousel);

/* ---------- Lifestyle Gallery (Lifestyle/lifeN.*) ---------- */
async function initLifestyle(){
  const grid=$('#lifestyle-grid'); if(!grid) return;
  const nav=$('#lifestyle-nav'); const perPage=12;
  const exts=["jpeg","jpg","png","webp"]; const folder="Lifestyle"; const base="life";
  async function collect(){
    const arr=[]; let i=1, miss=0;
    while(miss<5){
      let ok=null; for(const e of exts){ const u=`${folder}/${base}${i}.${e}`; if(await head(u)){ ok=u; break; } }
      if(ok){ arr.push(ok); miss=0; } else miss++;
      i++; if(i>10000) break;
    }
    return arr;
  }
  const images = await collect(); let page=1;
  function render(){
    grid.innerHTML=''; const start=(page-1)*perPage; const end=start+perPage;
    images.slice(start,end).forEach(src=>{ const im=document.createElement('img'); im.src=src; im.alt=src; grid.appendChild(im); });
    if(nav){ nav.innerHTML='';
      if(page>1){ const b=document.createElement('button'); b.className='btn ghost'; b.textContent='« Prev'; b.onclick=()=>{page--;render();}; nav.appendChild(b); }
      if(end<images.length){ const b=document.createElement('button'); b.className='btn'; b.style.marginLeft='8px'; b.textContent='Next »'; b.onclick=()=>{page++;render();}; nav.appendChild(b); }
    }
  }
  render();
}
document.addEventListener('DOMContentLoaded', initLifestyle);

/* ---------- Charts Grid (Charts/chartN.*) ---------- */
async function initCharts(){
  const grid=$('#charts-grid'); if(!grid) return;
  const exts=["jpeg","jpg","png","webp"]; const folder="Charts"; const base="chart";
  let i=1, miss=0;
  while(miss<3){
    let ok=false;
    for(const e of exts){ const u=`${folder}/${base}${i}.${e}`; if(await head(u)){ const im=document.createElement('img'); im.src=u; im.alt=`${base}${i}`; grid.appendChild(im); ok=true; break; } }
    if(!ok) miss++; else miss=0; i++; if(i>10000) break;
  }
}
document.addEventListener('DOMContentLoaded', initCharts);

/* ---------- Chart Videos (ChartVideo/monitorN.mov) ---------- */
async function initVideos(){
  const vg=$('#video-grid'); if(!vg) return;
  let i=1, miss=0;
  while(miss<3){
    const url=`ChartVideo/monitor${i}.mov`;
    try{ const r=await fetch(url,{method:"HEAD"}); if(r.ok){
      const wrap=document.createElement('div'); wrap.className='card'; wrap.style.margin='0';
      wrap.innerHTML=`<video controls preload="metadata" style="width:100%;border-radius:10px"><source src="${url}" type="video/quicktime"></video>`;
      vg.appendChild(wrap); miss=0;
    } else miss++; } catch { miss++; }
    i++; if(i>10000) break;
  }
}
document.addEventListener('DOMContentLoaded', initVideos);

/* ---------- Watchlist (Twelve Data API) ---------- */
const LS_QUOTES="otu_td_cache_v6"; const QUOTE_TTL=60*1000; // 60s cache
function cacheGet(){ try{return JSON.parse(localStorage.getItem(LS_QUOTES)||"{}")}catch{return{}} }
function cacheSet(obj){ try{localStorage.setItem(LS_QUOTES,JSON.stringify(obj))}catch{} }
async function tdQuote(symbol){
  const key = CFG.TD_KEY; symbol = (symbol||"").toUpperCase().trim(); if(!symbol) throw new Error("no symbol");
  const cache = cacheGet(); const now=Date.now();
  if(cache[symbol] && (now-cache[symbol].t)<QUOTE_TTL) return cache[symbol].data;
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  try{ const r=await fetch(url); const j=await r.json();
    if(j.status==="error" || !j.symbol) throw new Error(j.message||"bad");
    cache[symbol]={t:now,data:j}; cacheSet(cache); return j;
  }catch(e){
    const demo={symbol,price:(100+Math.random()*200).toFixed(2),percent_change:(Math.random()*4-2).toFixed(2)};
    cache[symbol]={t:now,data:demo}; cacheSet(cache); return demo;
  }
}
function watchTile(q){
  const d=document.createElement('div'); d.className='tile';
  const chg=parseFloat(q.percent_change); if(!isNaN(chg)) d.classList.add(chg>=0?'up':'down');
  d.innerHTML = `
    <div class="sym">${esc(q.symbol||'')}</div>
    <div class="px">${q.price?('$'+Number(q.price).toFixed(2)):'—'}</div>
    <div class="chg">${isNaN(chg)?'':(chg>=0?'▲ ':'▼ ')+Math.abs(chg).toFixed(2)+'%'}</div>`;
  return d;
}
function initWatchlist(){
  const grid=$('#watchlist-grid'); if(!grid) return;
  const input=$('#watchlist-input'), add=$('#watchlist-add');
  let list=(localStorage.getItem('otu_watch')||"").split(',').filter(Boolean);
  if(list.length===0) list=["AAPL","MSFT","TSLA","SPY","NVDA","AMZN"];
  async function draw(){ grid.innerHTML=''; for(const s of list){ try{ const q=await tdQuote(s); grid.appendChild(watchTile(q)); }catch{} } }
  add?.addEventListener('click',()=>{ const v=(input.value||'').toUpperCase().trim(); if(v&&!list.includes(v)){ list.unshift(v); localStorage.setItem('otu_watch',list.join(',')); draw(); } if(input) input.value=''; });
  draw(); setInterval(draw, 90*1000);
}
document.addEventListener('DOMContentLoaded', initWatchlist);

/* ---------- Modules (JSON) ---------- */
async function initModules(){
  const box=$('#modules-list'); if(!box) return;
  const data = await loadJSON(CFG.PATHS.modules) || [];
  box.innerHTML = data.map(m=>`<article class="card"><h3>${esc(m.title||'Lesson')}</h3><p>${esc(m.content||'')}</p></article>`).join('');
}
document.addEventListener('DOMContentLoaded', initModules);

/* ---------- Glossary (JSON accordion + search) ---------- */
function toggleAcc(el){ const b=el.nextElementSibling; b.style.display = (b.style.display==='block' ? 'none' : 'block'); }
window.toggleAcc=toggleAcc;
async function initGlossary(){
  const wrap=$('#glossary-acc'); if(!wrap) return;
  const q = $('#gq'); const data = await loadJSON(CFG.PATHS.glossary) || [];
  function render(list){
    wrap.innerHTML = `<div class="accordion">` + list.map(g=>`
      <div class="acc-item">
        <div class="acc-head" onclick="toggleAcc(this)">${esc(g.term||'Term')} <span>＋</span></div>
        <div class="acc-body"><p>${esc(g.definition||'')}</p></div>
      </div>`).join('') + `</div>`;
  }
  render(data);
  if(q){ q.addEventListener('input', ()=>{ const v=q.value.toLowerCase(); render(data.filter(x=> String(x.term||'').toLowerCase().includes(v))); }); }
}
document.addEventListener('DOMContentLoaded', initGlossary);

/* ---------- Testimonials (JSON) ---------- */
async function initTestimonials(){
  const box=$('#testi'); if(!box) return;
  const data = await loadJSON(CFG.PATHS.testimonials) || [];
  box.innerHTML = data.map(t=>`<article class="card"><h3>${esc(t.name||'Member')}</h3><p class="quote">“${esc(t.text||'')}”</p></article>`).join('');
}
document.addEventListener('DOMContentLoaded', initTestimonials);

/* ---------- Team (JSON) ---------- */
async function initTeam(){
  const grid=$('#team-grid'); if(!grid) return;
  const data = await loadJSON(CFG.PATHS.team) || [];
  grid.innerHTML = data.map(m=>`
    <article class="card" style="display:flex;gap:12px;align-items:flex-start">
      <img src="${esc(m.image||'team/placeholder.jpeg')}" alt="${esc(m.name||'Mentor')}"
        style="width:72px;height:72px;border-radius:12px;object-fit:cover;border:1px solid #e3e9f2">
      <div>
        <h3 style="margin:0">${esc(m.name||'')}</h3>
        <div style="color:#7986a6;font-weight:700;margin:4px 0">${esc(m.role||'')}</div>
        <p style="margin:0">${esc(m.bio||'')}</p>
      </div>
    </article>`).join('');
}
document.addEventListener('DOMContentLoaded', initTeam);

/* ---------- Debug handle ---------- */
window.OTU = { version:'2025.09.full', config:CFG };
