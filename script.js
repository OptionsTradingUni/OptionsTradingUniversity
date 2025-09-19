/* script.js - shared behavior for multi-page site
   - Loads names from data/traders_5000.csv to create gentle popups
   - Spawns floating profit ticker items (images) one-by-one
   - Rotates gallery images
   - Simulated watchlist updates (no API needed)
   - Rotating motivational quotes
*/

// CONFIG (no API required)
const WATCHLIST = ['AAPL','TSLA','SPY','QQQ','AMZN','NVDA','BTC','ETH'];
const TOTAL_TRADES = 6500;
const WIN_RATE = 86;
const FLOATING_IMAGES_COUNT = 57; // per your repo (img1..img57)
const LIFESTYLE_COUNT = 9;

// Utilities
function fetchText(url){ return fetch(url).then(r=>{ if(!r.ok) throw new Error('fetch failed'); return r.text(); }); }
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = [];
  for(const line of lines){
    const row=[]; let cur='', inQ=false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
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

/* ---------------- CSV Stats & Names (for popups) ---------------- */
async function loadNamesFromCSV(){
  try{
    const txt = await fetchText('data/traders_5000.csv');
    const rows = parseCSV(txt);
    if(!rows.length) return [];
    const header = rows[0].map(h=>h.trim().toLowerCase());
    const nameIdx = header.indexOf('name') >= 0 ? header.indexOf('name') : (header.indexOf('full_name') >=0 ? header.indexOf('full_name') : 1);
    const profitIdx = header.findIndex(h=>/profit/i.test(h));
    const pool = [];
    for(let i=1;i<rows.length;i++){
      const r = rows[i];
      const name = (r[nameIdx] || '').trim();
      let profit = null;
      if(profitIdx >=0) profit = toNumber(r[profitIdx]);
      pool.push({name: name || `Trader${i}`, profit});
    }
    return pool.filter(x=>x.name);
  }catch(e){
    console.warn('CSV load failed:', e.message);
    return [];
  }
}

/* ---------------- Popup system (single, non-spammy) ---------------- */
let notifyQueue = [], notifyBusy=false;
function pushNotify(obj){ notifyQueue.push(obj); processNotifyQueue(); }
function processNotifyQueue(){
  if(notifyBusy || !notifyQueue.length) return;
  notifyBusy = true;
  const n = notifyQueue.shift();
  let wrap = document.getElementById('notifySingleWrap');
  if(!wrap){ wrap = document.createElement('div'); wrap.id = 'notifySingleWrap'; document.body.appendChild(wrap); }
  wrap.innerHTML = `<div class="notify-card"><div style="width:46px;height:46px;border-radius:8px;background:linear-gradient(90deg,#2a5298,#1e3c72);display:flex;align-items:center;justify-content:center;color:white;font-weight:800">P</div>
    <div style="flex:1"><strong>${n.title}</strong><div style="margin-top:6px;color:#374151">${n.text}</div></div>
    <div style="color:#6b7280;font-size:0.9rem">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div></div>`;
  setTimeout(()=>{ wrap.innerHTML=''; notifyBusy=false; setTimeout(processNotifyQueue,700); }, 4800);
}

/* schedule gentle popups using CSV names */
function scheduleCSVPopups(pool){
  if(!pool || !pool.length) return;
  setInterval(()=>{
    const p = pool[Math.floor(Math.random()*pool.length)];
    // choose message style
    const templates = [
      {t: 'Quick Cashout', txt: `${p.name} cashed out a tidy scalp — snapshot posted.`},
      {t: 'Trade Win', txt: `${p.name} locked gains on a swing — nice discipline.`},
      {t: 'New Member Win', txt: `New member ${p.name} scored an early win.`},
      {t: 'Shared Setup', txt: `${p.name} shared a high-conviction setup.`}
    ];
    const pick = templates[Math.floor(Math.random()*templates.length)];
    pushNotify({title: pick.t, text: pick.txt});
  }, 8000 + Math.random()*7000);
}

/* ---------------- Floating profit ticker (pop & go) ---------------- */
function spawnTickerItem(imgSrc, textSmall){
  const wrap = document.querySelector('.floating-ticker .ticker-wrap');
  if(!wrap) return;
  const item = document.createElement('div'); item.className='ticker-item';
  item.innerHTML = `<img src="${imgSrc}" alt=""><div style="font-weight:800">${textSmall}</div>`;
  wrap.appendChild(item);
  item.addEventListener('animationend', ()=> item.remove());
}
function startFloatingTicker(total=57, interval=2600){
  let i=1;
  setInterval(()=>{
    const img = `Images/img${i}.jpeg`;
    spawnTickerItem(img, `Profit #${i}`);
    i++; if(i>total) i=1;
  }, interval);
}

/* ---------------- Gallery rotator ---------------- */
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
    }, 4200);
  });
}

/* ---------------- Simulated watchlist ---------------- */
function updateWatchlistUI(){
  const el = document.getElementById('watchlistList'); if(!el) return;
  el.innerHTML = '';
  WATCHLIST.forEach(s=>{
    const price = (20 + Math.random()*980).toFixed(2);
    const ch = (Math.random()*2-1).toFixed(2);
    const row = document.createElement('div'); row.className='ticker-row';
    row.innerHTML = `<div><div style="font-weight:800">${s}</div><div class="small muted">$${price}</div></div><div style="text-align:right"><div style="font-weight:800">$${price}</div><div class="${ch<0?'change minus':'change plus'}">${ch<0?ch:'+'+ch}</div></div>`;
    el.appendChild(row);
  });
}

/* ---------------- Motivational quotes ---------------- */
const QUOTES = [
  "Discipline beats emotion — trade your plan.",
  "Protect capital first, profits follow.",
  "Small consistent edges compound into big results.",
  "Cut losers fast, let winners run.",
  "Learn. Journal. Repeat."
];
function startQuoteRotator(elId, interval=5000){
  const el = document.getElementById(elId); if(!el) return;
  let i=0; el.textContent = QUOTES[0];
  setInterval(()=>{ i=(i+1)%QUOTES.length; el.textContent = QUOTES[i]; }, interval);
}

/* ---------------- Populate profit & lifestyle grids ---------------- */
function populateProfitGrid(containerId='profitGrid', total=57){
  const wrap = document.getElementById(containerId); if(!wrap) return;
  let html='';
  for(let i=1;i<=total;i++){ html += `<img src="Images/img${i}.jpeg" alt="profit${i}" loading="lazy">`; }
  wrap.innerHTML = html;
}
function populateLifestyle(containerId='lifestyleCarousel', total=9){
  const wrap = document.getElementById(containerId); if(!wrap) return;
  let html='';
  for(let i=1;i<=total;i++){ html += `<img src="Lifestyle/life${i}.jpeg" alt="life${i}">`; }
  wrap.innerHTML = html;
}

/* ---------------- INIT ---------------- */
document.addEventListener('DOMContentLoaded', async ()=>{
  // set static stats
  const totalEl = document.getElementById('totalTrades'); if(totalEl) totalEl.textContent = TOTAL_TRADES.toLocaleString();
  const winEl = document.getElementById('winRate'); if(winEl) winEl.textContent = WIN_RATE + '%';
  document.getElementById && startQuoteRotator('quoteRotator', 5000);

  // populate galleries
  populateProfitGrid();
  populateLifestyle();
  setupGalleryRotator();

  // watchlist updates
  updateWatchlistUI();
  setInterval(updateWatchlistUI, 15000);

  // floating ticker
  startFloatingTicker(FLOATING_IMAGES_COUNT, 2700);

  // load CSV for popups & names
  const pool = await loadNamesFromCSV();
  if(pool && pool.length){ scheduleCSVPopups(pool); }

});
