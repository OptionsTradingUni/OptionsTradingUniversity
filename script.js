/* ===== Sidebar toggle + TikTok modal ===== */
function openTikTokModal(){ document.getElementById('tt-modal').style.display='flex'; }
function closeTikTokModal(){ document.getElementById('tt-modal').style.display='none'; }
document.addEventListener('DOMContentLoaded',()=>{
  const burger=document.getElementById('burger');
  const sidebar=document.getElementById('sidebar');
  if(burger){ burger.addEventListener('click',()=> {
    sidebar.style.display=(sidebar.style.display==='block'?'none':'block');
  }); }
});

/* ===== Stats counter ===== */
function countUp(el,target){
  let val=0; const step=Math.ceil(target/60);
  function tick(){ val+=step; if(val>=target) val=target;
    el.textContent=el.dataset.count.includes('%') ? val+'%' : val;
    if(val<target) requestAnimationFrame(tick);
  }
  tick();
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.stat h2').forEach(h=>{
    const t=parseInt(h.dataset.count||'0',10);
    if(t>0) countUp(h,t);
    if(!h.textContent.includes('%') && !h.textContent.includes('+')){
      h.textContent = h.textContent + '+';
    }
  });
});

/* ===== Sidebar shake animation ===== */
document.addEventListener('DOMContentLoaded',()=>{
  const sb=document.getElementById('sidebar');
  const burger=document.getElementById('burger');
  setTimeout(()=>{
    sb?.classList.add('shake'); burger?.classList.add('shake');
    setTimeout(()=>{ sb?.classList.remove('shake'); burger?.classList.remove('shake'); },1500);
  },1200);
});

/* ===== Live Profits Ticker ===== */
function initTicker(){
  const wrap=document.getElementById('live-ticker'); if(!wrap) return;
  const names=["Sarah","Daniel","Olivia","Michael","Emma","Ethan","Sophia","James"];
  function profit(){ return (Math.floor(50+Math.random()*950)); }
  function msg(){ const n=names[Math.floor(Math.random()*names.length)];
    return `💰 ${n} +$${profit()} just now`; }
  function buildTicker(){
    wrap.innerHTML=""; const track=document.createElement('div'); track.className='ticker';
    for(let i=0;i<2;i++){ const span=document.createElement('span'); span.textContent=msg(); track.appendChild(span); }
    wrap.appendChild(track);
  }
  buildTicker(); setInterval(buildTicker,10000);
}
document.addEventListener('DOMContentLoaded', initTicker);

/* ===== Helpers ===== */
async function head(url){
  try{ const r=await fetch(url,{method:'HEAD'}); return r.ok; }catch{ return false; }
}
function $$(s,el=document){ return Array.from(el.querySelectorAll(s)); }

/* ===== Profit Snapshots Loader ===== */
async function loadProfits(){
  const stage=document.getElementById('profit-stage'); if(!stage) return;
  const exts=["jpeg","jpg","png","webp"]; let i=1;
  while(true){ let found=false;
    for(const e of exts){
      const url=`Images/img${i}.${e}`;
      if(await head(url)){ const img=document.createElement('img'); img.src=url; stage.appendChild(img); found=true; break; }
    }
    if(!found) break; i++;
  }
}
document.addEventListener('DOMContentLoaded', loadProfits);

/* ===== Lifestyle Loader ===== */
async function loadLifestyle(){
  const grid=document.getElementById('lifestyle-grid'); if(!grid) return;
  const exts=["jpeg","jpg","png","webp"]; let i=1;
  while(true){ let found=false;
    for(const e of exts){
      const url=`Lifestyle/life${i}.${e}`;
      if(await head(url)){ const img=document.createElement('img'); img.src=url; grid.appendChild(img); found=true; break; }
    }
    if(!found) break; i++;
  }
}
document.addEventListener('DOMContentLoaded', loadLifestyle);

/* ===== Charts Loader ===== */
async function loadCharts(){
  const grid=document.getElementById('charts-grid'); if(!grid) return;
  const exts=["jpeg","jpg","png"]; let i=1;
  while(true){ let found=false;
    for(const e of exts){
      const url=`Charts/chart${i}.${e}`;
      if(await head(url)){ const img=document.createElement('img'); img.src=url; grid.appendChild(img); found=true; break; }
    }
    if(!found) break; i++;
  }
}
document.addEventListener('DOMContentLoaded', loadCharts);

/* ===== Chart Video Loader ===== */
async function loadVideos(){
  const grid=document.getElementById('video-grid'); if(!grid) return;
  const url="ChartVideo/monitor1.mov";
  if(await head(url)){ const vid=document.createElement('video');
    vid.src=url; vid.controls=true; vid.width=400; grid.appendChild(vid); }
}
document.addEventListener('DOMContentLoaded', loadVideos);

/* ===== Watchlist Loader ===== */
async function loadWatchlist(){
  const grid=document.getElementById('watchlist-grid'); if(!grid) return;
  const input=document.getElementById('watchlist-input');
  const add=document.getElementById('watchlist-add');
  async function fetchSymbol(sym){
    try{ const r=await fetch(`https://api.twelvedata.com/price?symbol=${sym}&apikey=${CONFIG.API_KEY}`);
      const d=await r.json(); return d.price; }catch{ return null; }
  }
  add.addEventListener('click',async()=>{
    const s=input.value.trim().toUpperCase(); if(!s) return;
    const row=document.createElement('div'); row.textContent=`${s}: ...`; grid.appendChild(row);
    const p=await fetchSymbol(s); if(p) row.textContent=`${s}: $${p}`;
  });
}
document.addEventListener('DOMContentLoaded', loadWatchlist);

/* ===== JSON Loaders ===== */
async function loadJSON(url){ try{ const r=await fetch(url); return await r.json(); }catch{ return []; } }

/* Modules */
async function loadModules(){
  const list=document.getElementById('modules-list'); if(!list) return;
  const data=await loadJSON("data/modules.json");
  data.forEach(m=>{
    const item=document.createElement('div'); item.className='accordion';
    item.innerHTML=`<div class="acc-head">${m.title}</div><div class="acc-body">${m.content}</div>`;
    item.querySelector('.acc-head').addEventListener('click',()=> item.classList.toggle('open'));
    list.appendChild(item);
  });
}
document.addEventListener('DOMContentLoaded', loadModules);

/* Glossary */
async function loadGlossary(){
  const acc=document.getElementById('glossary-acc'); if(!acc) return;
  const data=await loadJSON("data/glossary.json");
  data.forEach(g=>{
    const item=document.createElement('div'); item.className='accordion';
    item.innerHTML=`<div class="acc-head">${g.term}</div><div class="acc-body">${g.definition}</div>`;
    item.querySelector('.acc-head').addEventListener('click',()=> item.classList.toggle('open'));
    acc.appendChild(item);
  });
}
document.addEventListener('DOMContentLoaded', loadGlossary);

/* Testimonials */
async function loadTestimonials(){
  const box=document.getElementById('testi'); if(!box) return;
  const data=await loadJSON("data/testimonials.json");
  data.forEach(t=>{
    const card=document.createElement('div'); card.className='card';
    card.innerHTML=`<p>"${t.text}"</p><p><b>- ${t.name}</b></p>`;
    box.appendChild(card);
  });
}
document.addEventListener('DOMContentLoaded', loadTestimonials);

/* Team */
async function loadTeam(){
  const grid=document.getElementById('team-grid'); if(!grid) return;
  const data=await loadJSON("data/team.json");
  data.forEach(p=>{
    const card=document.createElement('div'); card.className='card';
    card.innerHTML=`<img src="team/${p.photo}" alt=""><h3>${p.name}</h3><p>${p.role}</p>`;
    grid.appendChild(card);
  });
}
document.addEventListener('DOMContentLoaded', loadTeam);
