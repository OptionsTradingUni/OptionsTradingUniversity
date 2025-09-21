/* tiny helpers */
const $=(s,ctx=document)=>ctx.querySelector(s);
const $$=(s,ctx=document)=>Array.from(ctx.querySelectorAll(s));
const esc=s=>s?String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])):"";

/* sidebar */
const burger=$('#burger'), sidebar=$('#sidebar');
if(burger){ burger.addEventListener('click',()=> sidebar.classList.toggle('open')); }

/* modal */
function openTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='flex'; }
function closeTikTokModal(){ const m=$('#tt-modal'); if(m) m.style.display='none'; }
window.openTikTokModal=openTikTokModal; window.closeTikTokModal=closeTikTokModal;

/* counters */
function countUp(el, target, duration=1100, fmt=v=>v){
  let t=0, step=Math.max(1,Math.floor(target/(duration/16)));
  (function tick(){ t+=step; if(t>=target) t=target; el.textContent=fmt(t); if(t<target) requestAnimationFrame(tick); })();
}

/* try to derive stats from CSV if present */
async function loadStatsFromCsv(){
  const h1=$$('.stat h2')[0], h2=$$('.stat h2')[1], h3=$$('.stat h2')[2];
  if(!h1||!h2||!h3) return;
  let total=0, wins=0, pnlSum=0;
  try{
    const res=await fetch((window.SITE_CONFIG&&window.SITE_CONFIG.tradersCsvPath)||'data/traders_5000.csv',{cache:'no-store'});
    if(!res.ok) throw new Error('csv missing');
    const txt=await res.text();
    const rows=txt.trim().split(/\r?\n/);
    const head=rows.shift().split(',').map(s=>s.trim().toLowerCase());
    const idxResult=head.findIndex(h=>/result|win|outcome/.test(h));
    const idxPnl=head.findIndex(h=>/pnl|profit|pl|amount/.test(h));
    rows.forEach(line=>{
      const cols=line.split(',');
      if(cols.length<2) return;
      total++;
      const rs=idxResult>=0?cols[idxResult].toLowerCase():'';
      const pnl=idxPnl>=0?parseFloat(cols[idxPnl]):NaN;
      if(rs.includes('win') || (!isNaN(pnl)&&pnl>0)) wins++;
      if(!isNaN(pnl)) pnlSum+=pnl;
    });
    if(total>0){
      const winRate=Math.round((wins/total)*100);
      const avg=Math.round(pnlSum/Math.max(1,total));
      h1.dataset.count=total; h2.dataset.count=winRate; h3.dataset.count=avg;
    }
  }catch(e){ /* fallback: use defaults */ }
  [h1,h2,h3].forEach((el,i)=>{
    const tgt=Number(el.dataset.count||el.textContent||0);
    countUp(el,tgt);
  });
}
document.addEventListener('DOMContentLoaded', loadStatsFromCsv);

/* Twelve Data watchlist with 60s cache */
const TD_KEY=(window.SITE_CONFIG&&window.SITE_CONFIG.TWELVE_API_KEY)||"";
const LS_QUOTES="otu_td_cache_v2"; const QUOTE_TTL=60*1000;
const getCache=()=>{ try{return JSON.parse(localStorage.getItem(LS_QUOTES)||"{}")}catch{return{}} };
const setCache=o=>{ try{localStorage.setItem(LS_QUOTES,JSON.stringify(o))}catch{} };

async function tdQuote(symbol){
  symbol=symbol.toUpperCase().trim(); const cache=getCache(); const now=Date.now();
  if(cache[symbol] && (now-cache[symbol].t)<QUOTE_TTL) return cache[symbol].data;
  const url=`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(TD_KEY)}`;
  try{
    const r=await fetch(url); const j=await r.json();
    if(j.status==="error" || !j.symbol) throw new Error(j.message||"bad");
    cache[symbol]={t:now,data:j}; setCache(cache); return j;
  }catch(e){
    // fallback if quota used up
    const demo={symbol,price:(100+Math.random()*100).toFixed(2),percent_change:(Math.random()*4-2).toFixed(2)};
    cache[symbol]={t:now,data:demo}; setCache(cache); return demo;
  }
}
function tile(q){
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
  async function draw(){
    grid.innerHTML=''; for(const s of list){ const q=await tdQuote(s); grid.appendChild(tile(q)); }
  }
  add?.addEventListener('click',()=>{
    const v=(input.value||'').toUpperCase().trim(); if(!v) return;
    if(!list.includes(v)){ list.unshift(v); localStorage.setItem('otu_watch',list.join(',')); draw(); }
    input.value='';
  });
  draw(); setInterval(draw, 90000);
}
document.addEventListener('DOMContentLoaded', initWatchlist);

/* Infinite loaders — corrected for your Images/img1.jpeg..img57.jpeg */
function loadSeqByIndex(containerId, folder, name, start=1, maxMiss=12, exts=["jpeg","jpg"]){
  const grid=document.getElementById(containerId); if(!grid) return;
  let i=start, miss=0;
  async function tryOne(idx){
    return new Promise(res=>{
      const img=new Image(); let k=0;
      function attempt(){
        if(k>=exts.length){ miss++; return res(null); }
        img.src=`${folder}/${name}${idx}.${exts[k]}`;
      }
      img.onload=()=>res(img);
      img.onerror=()=>{ k++; attempt(); };
      attempt();
    });
  }
  async function batch(n=18){
    const frag=document.createDocumentFragment(); let ok=0;
    for(let x=0;x<n;x++){
      const im=await tryOne(i);
      if(im){ const el=document.createElement('img'); el.src=im.src; el.alt=`${name}${i}`; frag.appendChild(el); ok++; miss=0; }
      i++;
    }
    if(ok>0) grid.appendChild(frag);
    if(miss<maxMiss){ observer.observe(grid.lastElementChild||grid); }
  }
  const observer=new IntersectionObserver(es=>{es.forEach(e=>{ if(e.isIntersecting){ observer.unobserve(e.target); batch(12); }})},{root:null,rootMargin:"600px"});
  batch(18);
}
document.addEventListener('DOMContentLoaded', ()=>{
  loadSeqByIndex('profits-grid','Images','img',1,8,["jpeg","jpg"]);     // Profit snapshots
  loadSeqByIndex('lifestyle-grid','Lifestyle','life',1,8,["jpeg","jpg"]); // Lifestyle
  loadSeqByIndex('charts-grid','Charts','chart',1,8,["jpeg","jpg"]);      // Charts
  loadSeqByIndex('team-grid','Images','mentor',1,4,["jpeg","jpg"]);       // Optional team images
});

/* ChartVideo auto-detect monitorN.mov */
function initVideos(){
  const vg=$('#video-grid'); if(!vg) return;
  const max=40;
  for(let i=1;i<=max;i++){
    const wrap=document.createElement('div'); wrap.className='card'; wrap.style.margin='0';
    wrap.innerHTML=`<video controls preload="metadata" style="width:100%;border-radius:10px">
                      <source src="ChartVideo/monitor${i}.mov" type="video/quicktime">
                    </video>`;
    const v=wrap.querySelector('video'); v.onerror=()=>wrap.remove(); vg.appendChild(wrap);
  }
}
document.addEventListener('DOMContentLoaded', initVideos);
