/* ---------- helpers ---------- */
const $=(s,ctx=document)=>ctx.querySelector(s);
const $$=(s,ctx=document)=>Array.from(ctx.querySelectorAll(s));
const esc=s=>s?String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])):"";

/* ---------- layout: sidebar + modal ---------- */
document.addEventListener('DOMContentLoaded',()=>{
  const burger=$('#burger'), sidebar=$('#sidebar');
  if(burger) burger.addEventListener('click',()=> sidebar.classList.toggle('open'));
});
function openTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='flex'; }
function closeTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='none'; }
window.openTikTokModal=openTikTokModal; window.closeTikTokModal=closeTikTokModal;

/* ---------- animated stats ---------- */
function countUp(el, target, duration=1100){
  let val=0, step=Math.max(1,Math.floor(target/(duration/16)));
  (function tick(){ val+=step; if(val>=target) val=target; el.textContent=val; if(val<target) requestAnimationFrame(tick); })();
}
document.addEventListener('DOMContentLoaded',()=>{
  $$('.stat h2').forEach(el=>{ const t=parseInt(el.dataset.count||0,10); if(t>0) countUp(el,t); });
});

/* ---------- Twelve Data watchlist with quota-safe caching ---------- */
const TD_KEY=(window.SITE_CONFIG&&window.SITE_CONFIG.TWELVE_API_KEY)||"";
const LS_QUOTES="otu_td_cache_v3"; const QUOTE_TTL=60*1000;
const getCache=()=>{ try{return JSON.parse(localStorage.getItem(LS_QUOTES)||"{}")}catch{return{}} };
const setCache=o=>{ try{localStorage.setItem(LS_QUOTES,JSON.stringify(o))}catch{} };

async function tdQuote(symbol){
  symbol=symbol.toUpperCase().trim(); const cache=getCache(); const now=Date.now();
  if(cache[symbol]&&(now-cache[symbol].t)<QUOTE_TTL) return cache[symbol].data;
  const url=`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(TD_KEY)}`;
  try{
    const r=await fetch(url); const j=await r.json();
    if(j.status==="error" || !j.symbol) throw new Error(j.message||"bad");
    cache[symbol]={t:now,data:j}; setCache(cache); return j;
  }catch(e){
    const demo={symbol,price:(100+Math.random()*100).toFixed(2),percent_change:(Math.random()*4-2).toFixed(2)};
    cache[symbol]={t:now,data:demo}; setCache(cache); return demo;
  }
}
function watchTile(q){
  const d=document.createElement('div'); d.className='tile';
  const chg=parseFloat(q.percent_change); if(!isNaN(chg)){ if(chg>0) d.classList.add('up'); else if(chg<0) d.classList.add('down'); }
  d.innerHTML=`<div class="sym">${esc(q.symbol||'')}</div>
               <div class="px">${q.price?('$'+Number(q.price).toFixed(2)):'—'}</div>
               <div class="chg">${isNaN(chg)?'':(chg>0?'▲ ':'▼ ')+Math.abs(chg).toFixed(2)+'%'}</div>`;
  return d;
}
async function initWatchlist(){
  const grid=$('#watchlist-grid'); if(!grid) return;
  const input=$('#watchlist-input'), add=$('#watchlist-add');
  let list=(localStorage.getItem('otu_watch')||"").split(',').filter(Boolean);
  if(list.length===0) list=["AAPL","MSFT","TSLA","SPY","NVDA","AMZN"];
  async function draw(){ grid.innerHTML=''; for(const s of list){ const q=await tdQuote(s); grid.appendChild(watchTile(q)); } }
  add?.addEventListener('click',()=>{ const v=(input.value||'').toUpperCase().trim(); if(v&&!list.includes(v)){ list.unshift(v); localStorage.setItem('otu_watch',list.join(',')); draw(); } input.value=''; });
  draw(); setInterval(draw,90000);
}
document.addEventListener('DOMContentLoaded', initWatchlist);

/* ---------- Home: live profit TICKER ---------- */
function initLiveTicker(){
  const wrap=$('#live-ticker'); if(!wrap) return;
  const track=document.createElement('div'); track.className='ticker';
  const names=["Ava","James","Sophia","Daniel","Olivia","Michael","Emma","Ethan","Mason","Chloe","Logan","Nora","Liam","Mia","Caleb","Layla","Noah","Zoe"];
  function profit(){ return Math.floor(180+Math.random()*1600); }
  function msg(){ const n=names[Math.floor(Math.random()*names.length)]; return `💰 ${n} closed +$${profit()} just now`; }
  const items=new Array(12).fill(0).map(()=>{ const span=document.createElement('span'); span.className='item'; span.textContent=msg(); return span; });
  items.concat(items.map(s=>s.cloneNode(true))).forEach(s=>track.appendChild(s));
  wrap.appendChild(track);
  setInterval(()=>{ const first=track.firstElementChild; if(!first) return; const clone=first.cloneNode(true); clone.textContent=msg(); track.appendChild(clone); track.removeChild(first); },4000);
}
document.addEventListener('DOMContentLoaded', initLiveTicker);

/* ---------- Profits page: dynamic rotating carousel ---------- */
function initProfitCarousel(){
  const stage=$('#profit-stage'); if(!stage) return;
  const caption=$('#profit-caption'); const prev=$('#profit-prev'); const next=$('#profit-next'); const playBtn=$('#profit-play');
  const exts=["jpeg","jpg","png","webp"]; const folder="Images"; const base="img";
  const names=["Ava","James","Sophia","Daniel","Olivia","Michael","Emma","Ethan","Mason","Chloe","Logan","Nora","Liam","Mia","Caleb","Layla","Noah","Zoe"];
  const reasons=["breakout","trend pullback","earnings drift","range flip","volume spike","gap continuation","VWAP reclaim","support bounce","news catalyst"];

  async function head(url){ try{ const r=await fetch(url,{method:"HEAD"}); return r.ok; }catch{ return false; } }
  async function findAll(){
    const urls=[]; let i=1, miss=0;
    while(miss<5){
      let found=null;
      for(const ext of exts){ const u=`${folder}/${base}${i}.${ext}`; if(await head(u)){ found=u; break; } }
      if(found){ urls.push(found); miss=0; } else { miss++; }
      i++;
    }
    return urls;
  }
  function makeCard(src){ const img=document.createElement('img'); img.src=src; return img; }
  function profitText(){ const n=names[Math.floor(Math.random()*names.length)]; const p=Math.floor(180+Math.random()*1600); const r=reasons[Math.floor(Math.random()*reasons.length)]; return `${n} cashed +$${p} on ${r}`; }

  (async ()=>{
    const urls=await findAll(); if(urls.length===0) return;
    const imgs=urls.map(u=>makeCard(u)); imgs.forEach((im,idx)=>{ if(idx===0) im.classList.add('active'); stage.appendChild(im); });
    let idx=0, playing=true; let timer=null;
    function show(i){ $$('.carousel-stage img',stage).forEach((im,k)=>im.classList.toggle('active',k===i)); caption.textContent=profitText(); }
    function nextSlide(){ idx=(idx+1)%imgs.length; show(idx); }
    function prevSlide(){ idx=(idx-1+imgs.length)%imgs.length; show(idx); }
    function play(){ if(timer) clearInterval(timer); timer=setInterval(nextSlide,3500); playing=true; playBtn.textContent='Pause'; }
    function pause(){ if(timer) clearInterval(timer); playing=false; playBtn.textContent='Play'; }
    next?.addEventListener('click',()=>{ pause(); nextSlide(); });
    prev?.addEventListener('click',()=>{ pause(); prevSlide(); });
    playBtn?.addEventListener('click',()=>{ if(playing) pause(); else play(); });
    caption.textContent=profitText(); play();
  })();
}
document.addEventListener('DOMContentLoaded', initProfitCarousel);

/* ---------- Lifestyle page: paginated gallery ---------- */
function initLifestyle(){
  const grid=$('#lifestyle-grid'); if(!grid) return;
  const nav=$('#lifestyle-nav'); const perPage=12; const exts=["jpeg","jpg","png","webp"]; const folder="Lifestyle"; const base="life";
  async function head(url){ try{ const r=await fetch(url,{method:"HEAD"}); return r.ok; }catch{ return false; } }
  async function collect(){
    const arr=[]; let i=1, miss=0;
    while(miss<5){
      let match=null; for(const ext of exts){ const u=`${folder}/${base}${i}.${ext}`; if(await head(u)){ match=u; break; } }
      if(match){ arr.push(match); miss=0; } else { miss++; }
      i++;
    }
    return arr;
  }
  (async()=>{
    const images=await collect(); let page=1;
    function render(){
      grid.innerHTML=''; const start=(page-1)*perPage; const end=start+perPage;
      images.slice(start,end).forEach(src=>{ const im=document.createElement('img'); im.src=src; im.alt=src; grid.appendChild(im); });
      nav.innerHTML='';
      if(page>1){ const b=document.createElement('button'); b.className='btn ghost'; b.textContent='« Prev'; b.onclick=()=>{page--; render();}; nav.appendChild(b); }
      if(end<images.length){ const b=document.createElement('button'); b.className='btn'; b.style.marginLeft='8px'; b.textContent='Next »'; b.onclick=()=>{page++; render();}; nav.appendChild(b); }
    }
    render();
  })();
}
document.addEventListener('DOMContentLoaded', initLifestyle);

/* ---------- Charts page: load available chart images ---------- */
function initCharts(){
  const grid=$('#charts-grid'); if(!grid) return;
  const exts=["jpeg","jpg","png","webp"]; const folder="Charts"; const base="chart";
  async function head(url){ try{ const r=await fetch(url,{method:"HEAD"}); return r.ok; }catch{ return false; } }
  (async()=>{
    let i=1, miss=0;
    while(miss<3){
      let ok=false;
      for(const ext of exts){ const u=`${folder}/${base}${i}.${ext}`; if(await head(u)){ const im=document.createElement('img'); im.src=u; im.alt=`${base}${i}`; grid.appendChild(im); ok=true; break; } }
      if(!ok) miss++; else miss=0; i++;
    }
  })();
}
document.addEventListener('DOMContentLoaded', initCharts);

/* ---------- ChartVideo page: load available .mov ---------- */
function initVideos(){
  const vg=$('#video-grid'); if(!vg) return;
  (async()=>{
    let i=1, miss=0;
    while(miss<3){
      const url=`ChartVideo/monitor${i}.mov`;
      try{ const r=await fetch(url,{method:"HEAD"}); if(r.ok){
        const wrap=document.createElement('div'); wrap.className='card'; wrap.innerHTML=
          `<video controls preload="metadata" style="width:100%;border-radius:10px"><source src="${url}" type="video/quicktime"></video>`;
        vg.appendChild(wrap); miss=0;
      }else{ miss++; } }catch{ miss++; }
      i++;
    }
  })();
}
document.addEventListener('DOMContentLoaded', initVideos);
