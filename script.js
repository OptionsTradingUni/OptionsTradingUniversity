/* script.js - shared functions for multi-page site
   - loads CSV to compute stats (but does NOT expose rows)
   - spawns gentle popups (pop and go)
   - spawns floating ticker items (single image slides across)
   - gallery rotator
   - watchlist (simulated unless you provide API keys)
*/

// CONFIG
const FINNHUB_API_KEY = ""; // optional
const ALPHA_VANTAGE_KEY = ""; // optional
const WATCHLIST = ['SPY','QQQ','AAPL','TSLA','AMZN','NVDA','MSFT','NFLX'];

// UTILITIES
function fetchText(url){ return fetch(url).then(r=>{ if(!r.ok) throw new Error('fetch failed'); return r.text();}); }
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = [];
  for(const line of lines){
    const row=[]; let cur='', inQ=false;
    for(let ch of line){
      if(ch === '"'){ inQ = !inQ; continue; }
      if(ch === ',' && !inQ){ row.push(cur); cur=''; continue; }
      cur += ch;
    }
    row.push(cur);
    rows.push(row);
  }
  return rows;
}
function toNumber(v){ if(!v) return NaN; v = String(v).replace(/[\$,()%\s]/g,'').replace(/,/g,''); const n = parseFloat(v); return Number.isFinite(n) ? n : NaN; }

// CSV stats (no listing)
async function loadCSVStatsAndNames(){
  try{
    const txt = await fetchText('data/traders_5000.csv');
    const rows = parseCSV(txt);
    if(!rows.length) return {};
    const header = rows[0].map(h=>h.trim());
    const dataRows = rows.slice(1);
    // find a likely profit column by header name
    const profitCols = header.map((h,i)=>({h,i})).filter(x=>/profit/i.test(x.h));
    // fallback: try column with numeric-like values
    let stats = {total: dataRows.length, winRate:0, avgProfit:0, topProfit:null, names:[]};
    let profits = [];
    dataRows.forEach(r=>{
      // collect names if available
      const name = r[ header.indexOf('name') ] || r[ header.indexOf('Name') ] || r[1] || '';
      if(name) stats.names.push(name.trim());
      // profit extraction
      let val = NaN;
      if(profitCols.length){
        val = toNumber(r[profitCols[0].i]);
      } else {
        // try a few likely columns
        for(let idx=0; idx<Math.min(r.length,6); idx++){
          const n = toNumber(r[idx]);
          if(!isNaN(n) && Math.abs(n) < 1e7){ val = n; break; }
        }
      }
      if(!isNaN(val)){ profits.push(val); }
    });
    if(profits.length){
      stats.avgProfit = (profits.reduce((a,b)=>a+b,0)/profits.length).toFixed(2);
      stats.topProfit = Math.max(...profits);
      const wins = profits.filter(p=>p>0).length;
      stats.winRate = Math.round(100 * wins / profits.length);
    }
    return stats;
  }catch(e){
    console.warn('CSV load failed', e.message);
    return {};
  }
}

/* ---------- Non-spammy single popup notifications ---------- */
let notifyQueue = [], notifyActive = false;
function pushNotify(obj){
  // obj: {title, text, img (optional)}
  notifyQueue.push(obj);
  processNotifyQueue();
}
function processNotifyQueue(){
  if(notifyActive || !notifyQueue.length) return;
  notifyActive = true;
  const n = notifyQueue.shift();
  let wrap = document.getElementById('notifySingleWrap');
  if(!wrap){ wrap = document.createElement('div'); wrap.id='notifySingleWrap'; document.body.appendChild(wrap); }
  wrap.innerHTML = `<div class="notify-card"><div style="width:48px;height:48px;border-radius:8px;background:linear-gradient(90deg,#2a5298,#1e3c72);display:flex;align-items:center;justify-content:center;color:white;font-weight:800">P</div>
    <div style="flex:1"><strong>${n.title}</strong><div style="margin-top:6px;color:#374151">${n.text}</div></div>
    <div style="color:#6b7280;font-size:0.9rem">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div></div>`;
  // show for 4.5s, then clear
  setTimeout(()=>{ wrap.innerHTML=''; notifyActive=false; setTimeout(processNotifyQueue,700); }, 4500);
}

// schedule gentle notifications using names pool
function scheduleGentleNotices(namesPool){
  if(!namesPool || !namesPool.length) return;
  setInterval(()=>{
    const name = namesPool[Math.floor(Math.random()*namesPool.length)];
    // generate realistic but modest amount
    const amount = Math.round((Math.random()*8000 + 150)* (Math.random() > 0.7 ? 5 : 1));
    const templates = [
      {t: 'Quick Cashout', txt: `${name} cashed out $${Number(amount).toLocaleString()} on a scalp.`},
      {t: 'Swing Win', txt: `${name} closed a swing and locked $${Number(amount).toLocaleString()}.`},
      {t: 'New Member Win', txt: `${name} banked a small win after joining.`},
      {t: 'Shared Setup', txt: `${name} shared a trade setup in the group.`}
    ];
    const pick = templates[Math.floor(Math.random()*templates.length)];
    pushNotify({title: pick.t, text: pick.txt});
  }, 7500 + Math.random()*6500);
}

/* ---------- Floating ticker (pop & go visual) ---------- */
function spawnTickerItem(imgSrc, textSmall){
  const container = document.querySelector('.floating-ticker .ticker-wrap');
  if(!container) return;
  const item = document.createElement('div');
  item.className = 'ticker-item';
  const img = `<img src="${imgSrc}" alt="">`;
  item.innerHTML = `${img}<div style="font-weight:800">${textSmall}</div>`;
  container.appendChild(item);
  // remove after animation ends (~9s)
  item.addEventListener('animationend', ()=> item.remove());
}

// cycle through profit images to create floating items (one-by-one)
function startFloatingTicker(total=57, interval=2200){
  let i = 1;
  setInterval(()=>{
    const img = `Images/img${i}.jpeg`;
    const profText = `Profit snapshot #${i}`;
    spawnTickerItem(img, profText);
    i++; if(i>total) i=1;
  }, interval);
}

/* ---------- gallery rotator (simple) ---------- */
function setupGalleryRotator(){
  document.querySelectorAll('.gallery').forEach(g=>{
    const imgs = Array.from(g.querySelectorAll('img'));
    if(!imgs.length) return;
    imgs.forEach((im,i)=>{ im.style.opacity = i===0?1:0; if(i===0) im.classList.add('active'); });
    let idx = 0;
    setInterval(()=>{
      imgs[idx].classList.remove('active'); imgs[idx].style.opacity = 0;
      idx = (idx+1) % imgs.length;
      imgs[idx].classList.add('active'); imgs[idx].style.opacity = 1;
    }, 4500);
  });
}

/* ---------- watchlist (simulated or real if key provided) ---------- */
async function fetchFinnhub(sym){
  if(!FINNHUB_API_KEY) throw new Error('Missing Finnhub key');
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB_API_KEY}`;
  const r = await fetch(url); if(!r.ok) throw new Error('Finnhub fail'); return r.json();
}
async function fetchAlpha(sym){
  if(!ALPHA_VANTAGE_KEY) throw new Error('Missing Alpha key');
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${ALPHA_VANTAGE_KEY}`;
  const r = await fetch(url); if(!r.ok) throw new Error('Alpha fail'); return r.json();
}
async function updateWatchlistUI(){
  const el = document.getElementById('watchlistList');
  if(!el) return;
  el.innerHTML = '';
  if(!FINNHUB_API_KEY && !ALPHA_VANTAGE_KEY){
    // simulated
    WATCHLIST.forEach(s=>{
      const price = (100 + Math.random()*900).toFixed(2);
      const ch = ((Math.random()-0.45)*(Math.random()*5)).toFixed(2);
      const row = document.createElement('div'); row.className='ticker-row';
      row.innerHTML = `<div><div style="font-weight:800">${s}</div><div class="small muted">$${price}</div></div><div style="text-align:right"><div style="font-weight:800">$${price}</div><div class="${ch<0?'change minus':'change plus'}">${ch<0?ch:'+'+ch}</div></div>`;
      el.appendChild(row);
    });
    return;
  }
  // attempt real fetch (per-symbol)
  for(const s of WATCHLIST){
    try{
      if(FINNHUB_API_KEY){
        const q = await fetchFinnhub(s);
        const price = q.c; const diff = (q.c - q.pc).toFixed(2);
        const row = document.createElement('div'); row.className='ticker-row';
        row.innerHTML = `<div><div style="font-weight:800">${s}</div><div class="small muted">${price?price.toFixed(2):'—'}</div></div><div style="text-align:right"><div style="font-weight:800">$${price?price.toFixed(2):'—'}</div><div class="${diff<0?'change minus':'change plus'}">${diff<0?diff:'+'+diff}</div></div>`;
        el.appendChild(row);
      } else {
        const q = await fetchAlpha(s);
        const price = parseFloat(q['05. price'] || q['05 price'] || q['c'] || 0);
        const prev = parseFloat(q['08. previous close'] || q['08 previous close'] || q['pc'] || 0);
        const diff = (price - prev).toFixed(2);
        const row = document.createElement('div'); row.className='ticker-row';
        row.innerHTML = `<div><div style="font-weight:800">${s}</div><div class="small muted">${price?price.toFixed(2):'—'}</div></div><div style="text-align:right"><div style="font-weight:800">$${price?price.toFixed(2):'—'}</div><div class="${diff<0?'change minus':'change plus'}">${diff<0?diff:'+'+diff}</div></div>`;
        el.appendChild(row);
      }
    }catch(e){
      // fallback simulated for symbol
      const price = (100 + Math.random()*900).toFixed(2);
      const ch = ((Math.random()-0.45)*(Math.random()*5)).toFixed(2);
      const row = document.createElement('div'); row.className='ticker-row';
      row.innerHTML = `<div><div style="font-weight:800">${s}</div><div class="small muted">$${price}</div></div><div style="text-align:right"><div style="font-weight:800">$${price}</div><div class="${ch<0?'change minus':'change plus'}">${ch<0?ch:'+'+ch}</div></div>`;
      el.appendChild(row);
    }
  }
}

/* ---------- init on DOM ready ---------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  setupGalleryRotator();
  populateProfitGridUI();
  populateLifestyleUI();

  // CSV stats & name pool
  const stats = await loadCSVStatsAndNames();
  if(stats && Object.keys(stats).length){
    if(document.getElementById('totalTrades')) document.getElementById('totalTrades').textContent = stats.total?.toLocaleString() || '—';
    if(document.getElementById('winRate')) document.getElementById('winRate').textContent = (stats.winRate || 0) + '%';
    if(document.getElementById('avgProfit')) document.getElementById('avgProfit').textContent = stats.avgProfit ? ('$' + Number(stats.avgProfit).toLocaleString()) : '—';
    if(document.getElementById('topProfit')) document.getElementById('topProfit').textContent = stats.topProfit ? ('$' + Number(stats.topProfit).toLocaleString()) : '—';
    if(stats.names && stats.names.length) scheduleGentleNotices(stats.names);
  }

  updateWatchlistUI();
  setInterval(updateWatchlistUI, 15000);
  // start floating ticker (Images count = 57 per your repo)
  startFloatingTicker(57, 2600);
});

/* ---------- small UI helpers below ---------- */
function populateProfitGridUI(){
  const wrap = document.getElementById('profitGrid');
  if(!wrap) return;
  let html='';
  for(let i=1;i<=57;i++){
    html += `<img src="Images/img${i}.jpeg" alt="profit${i}" loading="lazy">`;
  }
  wrap.innerHTML = html;
}
function populateLifestyleUI(){
  const wrap = document.getElementById('lifestyleCarousel');
  if(!wrap) return;
  let html='';
  for(let i=1;i<=9;i++){
    html += `<img src="Lifestyle/life${i}.jpeg" alt="life${i}">`;
  }
  wrap.innerHTML = html;
}
function setupGalleryRotator(){
  document.querySelectorAll('.gallery').forEach(g=>{
    const imgs = Array.from(g.querySelectorAll('img'));
    if(!imgs.length) return;
    imgs.forEach((im,i)=>{ im.style.opacity = i===0?1:0; if(i===0) im.classList.add('active'); });
    let idx = 0;
    setInterval(()=>{
      imgs[idx].classList.remove('active'); imgs[idx].style.opacity = 0;
      idx = (idx+1) % imgs.length;
      imgs[idx].classList.add('active'); imgs[idx].style.opacity = 1;
    }, 4500);
  });
}
