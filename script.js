/* script.js - shared site behavior
   - Loads traders_5000.csv (names + optional profit column)
   - Randomized, non-spammy floating profit alerts
   - Floating image ticker (pop & go)
   - Carousel auto-scroll
   - Quote banner rotator
   - Simulated watchlist ticker bar
   - Sticky TikTok CTA modal
*/

// CONFIG
const IMAGES_COUNT = 57;        // Images/img1..img57.jpeg
const CHARTS_COUNT = 7;         // Charts/chart1..chart7.jpeg
const LIFESTYLE_COUNT = 9;      // Lifestyle/life1..life9.jpeg
const CSV_PATH = 'data/traders_5000.csv';
const ALERT_INTERVAL_MS = 7000; // popup cadence
const TICKER_ITEM_INTERVAL_MS = 2600;
const WATCHLIST = ['AAPL','TSLA','NVDA','SPY','QQQ','AMZN','MSFT','BTCUSD'];

/* ---------------- CSV parser ---------------- */
function splitCSVLine(line){
  const res=[]; let cur=''; let inQ=false;
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch === '"') { inQ = !inQ; continue; }
    if(ch === ',' && !inQ){ res.push(cur); cur=''; continue; }
    cur += ch;
  }
  res.push(cur);
  return res;
}
function parseCSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  if(!lines.length) return [];
  const headers = splitCSVLine(lines[0]).map(h=>h.trim().toLowerCase());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const parts = splitCSVLine(lines[i]);
    const obj = {};
    for(let j=0;j<headers.length;j++) obj[headers[j]] = (parts[j] || '').trim();
    rows.push(obj);
  }
  return rows;
}
async function loadCSV(path){
  try{
    const r = await fetch(path);
    if(!r.ok) throw new Error('CSV fetch failed');
    const txt = await r.text();
    return parseCSV(txt);
  }catch(e){
    console.warn('CSV load error:', e.message);
    return [];
  }
}

/* ---------------- popup alerts ---------------- */
const popupEl = document.getElementById('popup-container');
let namePool = [];
let popupTimerHandle = null;

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function showPopupFor(tr){
  if(!popupEl) return;
  const profitText = tr.profit || ('$' + (Math.floor(Math.random()*8000)+150).toLocaleString());
  popupEl.innerHTML = `<div class="title">${escapeHtml(tr.name)}</div><div class="meta">cashed out ${escapeHtml(profitText)} — shared in group</div>`;
  popupEl.classList.add('visible');
  setTimeout(()=> popupEl.classList.remove('visible'), 4200);
}

function schedulePopups(){
  if(popupTimerHandle) clearInterval(popupTimerHandle);
  popupTimerHandle = setInterval(()=>{
    if(!namePool.length) return;
    const t = namePool[Math.floor(Math.random()*namePool.length)];
    showPopupFor(t);
  }, ALERT_INTERVAL_MS + Math.random()*3500);
}

/* ---------------- floating image ticker (spawn) ---------------- */
function spawnTickerImage(imgSrc, label){
  const container = document.querySelector('.ticker-inner');
  if(!container) return;
  const el = document.createElement('div');
  el.style.display = 'inline-flex';
  el.style.alignItems = 'center';
  el.style.gap = '8px';
  el.className = 'ticker-item';
  el.innerHTML = `<img src="${imgSrc}" alt="" style="width:56px;height:36px;border-radius:6px;object-fit:cover;box-shadow:0 6px 18px rgba(0,0,0,0.12)"><div style="min-width:80px;font-weight:800">${escapeHtml(label)}</div>`;
  container.appendChild(el);
  setTimeout(()=> el.remove(), 28000);
}
function startFloatingImageTicker(total=IMAGES_COUNT, interval=TICKER_ITEM_INTERVAL_MS){
  let i=1;
  setInterval(()=>{
    const img = `Images/img${i}.jpeg`;
    spawnTickerImage(img, `Profit #${i}`);
    i++; if(i>total) i=1;
  }, interval);
}

/* ---------------- quote banner ---------------- */
const QUOTES = [
  "Discipline beats emotion — trade the plan.",
  "Protect capital first. The rest follows.",
  "Small edges, applied consistently, compound.",
  "Cut losers fast. Let winners run.",
  "Journal every trade — data kills ego.",
  "Plan the trade; trade the plan.",
  "Risk control > chasing returns."
];
let qIdx = 0;
function rotateQuotes(){
  const el = document.getElementById('quote-banner');
  if(!el) return;
  el.textContent = QUOTES[qIdx];
  qIdx = (qIdx+1)%QUOTES.length;
}
setInterval(rotateQuotes, 5200);

/* ---------------- watchlist (simulated) ---------------- */
function initWatchlist(){
  const el = document.getElementById('watchlistList');
  if(!el) return;
  const list = WATCHLIST.map(s=>{
    return {s, p: (100 + Math.random()*1200).toFixed(2), c: (Math.random()*2-1).toFixed(2)};
  });
  function render(){
    el.innerHTML = '';
    list.forEach(t=>{
      const row = document.createElement('div');
      row.style.display='flex'; row.style.justifyContent='space-between'; row.style.padding='8px'; row.style.borderBottom='1px solid #f1f5f9';
      row.innerHTML = `<div style="font-weight:800">${t.s}</div><div>$${t.p} <span style="color:${t.c>=0? 'green':'#ef4444'}">${t.c}%</span></div>`;
      el.appendChild(row);
    });
  }
  setInterval(()=>{
    list.forEach(t=>{ let change=(Math.random()-0.45)*(Math.random()*2); t.p = Math.max(0.5,(parseFloat(t.p)+change)).toFixed(2); t.c = (change>=0?'+':'')+change.toFixed(2); });
    render();
  },2500);
  render();
}

/* ---------------- carousel auto-scroll ---------------- */
function initCarousels(){
  document.querySelectorAll('.carousel').forEach(carousel=>{
    let scrollAmount = 0;
    setInterval(()=>{
      if(scrollAmount >= carousel.scrollWidth - carousel.clientWidth) scrollAmount = 0;
      else scrollAmount += Math.max(220, carousel.clientWidth * 0.6);
      carousel.scrollTo({ left: scrollAmount, behavior:'smooth' });
    }, 3600);
  });
}

/* ---------------- ticker bar init ---------------- */
function initTickerBar(){
  const bar = document.querySelector('.ticker-inner');
  if(!bar) return;
  function makeItem(sym){
    const change = (Math.random()*2 - 1).toFixed(2);
    const price = (100 + Math.random()*1200).toFixed(2);
    return `<div class="ticker-item">${sym} <span style="opacity:0.9"> $${price} </span> <span style="color:${change>=0? '#9ee79b':'#ff9b9b'}">${change}%</span></div>`;
  }
  const items = [];
  for(let s of WATCHLIST) items.push(makeItem(s));
  bar.innerHTML = items.concat(items).join('');
}

/* ---------------- TikTok modal ---------------- */
function openTikTokModal(){ const m=document.querySelector('.modal-backdrop'); if(m) m.style.display='flex'; }
function initModal(){
  if(document.querySelector('.modal-backdrop')) return;
  const md = document.createElement('div'); md.className='modal-backdrop';
  md.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <button class="close">✕</button>
    <h3 style="margin-top:0">Message on TikTok</h3>
    <p class="small">To join the community or request a trade review, send a private DM on TikTok. Suggested message (copy):</p>
    <div style="background:#f5f9ff;padding:12px;border-radius:8px;margin-top:8px;font-family:monospace">
      Hi — I found your Options Trading University page. I'd like a trade review and to join the waitlist. — <i>Your name</i>
    </div>
    <div style="margin-top:14px;text-align:right"><button class="btn-close">Close</button></div>
  </div>`;
  document.body.appendChild(md);
  md.querySelector('.close').addEventListener('click', ()=> md.style.display='none');
  md.querySelector('.btn-close').addEventListener('click', ()=> md.style.display='none');
}

/* ---------------- INIT ---------------- */
(async function initSite(){
  rotateQuotes(); // immediate
  initModal();
  initCarousels();
  initWatchlist();
  initTickerBar();
  startFloatingImageTicker();

  // load CSV and schedule popups
  const rows = await loadCSV(CSV_PATH);
  namePool = rows.map(r=>{
    const keys = Object.keys(r);
    // try find name-like key
    const nk = keys.find(k=>/name|full/i.test(k)) || keys[0];
    const pk = keys.find(k=>/profit|pnl|gain|amount/i.test(k));
    return { name: (r[nk] || '').trim() || 'Trader', profit: pk ? r[pk] : ''};
  }).filter(x=>x.name);
  if(!namePool.length) namePool = [{name:'Alex'},{name:'Jordan'},{name:'Taylor'},{name:'Casey'}];
  schedulePopups();

})();
