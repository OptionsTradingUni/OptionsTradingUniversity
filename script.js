/* script.js - shared behavior (CSV popups, quotes, carousels, watchlist, stats) */

/* CONFIG */
const IMAGES_COUNT = 57;          // Images/img1..img57.jpeg
const LIFESTYLE_COUNT = 9;        // Lifestyle/life1..life9.jpeg
const CSV_PATH = 'data/traders_5000.csv';
const POPUP_INTERVAL = 6500;      // ms between popups
const POPUP_DISPLAY_MS = 4200;    // ms popup visible
const QUOTE_ROTATE_MS = 5200;     // ms between quotes

/* ---- Utility: robust CSV parse ---- */
function splitCSVLine(line){
  const res = []; let cur = ''; let inQ = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { res.push(cur); cur=''; continue; }
    cur += ch;
  }
  res.push(cur);
  return res;
}
function parseCSV(text){
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]).map(h=>h.trim().toLowerCase());
  const out = [];
  for (let i=1;i<lines.length;i++){
    const parts = splitCSVLine(lines[i]);
    const obj = {};
    for (let j=0;j<headers.length;j++) obj[headers[j]] = (parts[j]||'').trim();
    out.push(obj);
  }
  return out;
}
async function loadCSV(path){
  try{
    const r = await fetch(path);
    if(!r.ok) throw new Error('CSV fetch failed: '+r.status);
    const txt = await r.text();
    return parseCSV(txt);
  }catch(e){
    console.warn('CSV load error', e.message);
    return [];
  }
}

/* ---- QUOTES (long list) ---- */
const QUOTES = [
  "Discipline beats emotion — trade the plan.",
  "Protect capital first; profits follow.",
  "Small edges, applied consistently, compound.",
  "Cut losers fast. Let winners run.",
  "Journal every trade — data kills ego.",
  "Plan the trade; trade the plan.",
  "Risk control > chasing returns.",
  "Consistency creates results over time.",
  "A good trader thinks in probabilities, not certainties.",
  "Don't chase FOMO — wait for your setup.",
  "Position size is the single biggest lever of survival.",
  "Backtest to validate, then forward test to trust.",
  "Avoid trading when emotionally compromised.",
  "Understand fees and slippage — they matter.",
  "A clear edge beats a complicated system.",
  "Edge + Discipline = Long-term results.",
  "Learn to lose small and win big.",
  "Trade what you know; expand deliberately.",
  "Keep a routine: pre-market, market, post-market review.",
  "The market will always be there tomorrow — preserve capital."
];

/* rotate quote banner */
let qIdx = 0;
function rotateQuotes(){
  const el = document.getElementById('quote-banner');
  if (!el) return;
  el.textContent = QUOTES[qIdx];
  qIdx = (qIdx + 1) % QUOTES.length;
}
setInterval(rotateQuotes, QUOTE_ROTATE_MS);
rotateQuotes(); // immediate load

/* ---- Populate profit carousel (Images/img1..img57) ---- */
function populateProfitCarousel(){
  const cont = document.getElementById('profitCarousel');
  if(!cont) return;
  cont.innerHTML = '';
  for (let i=1;i<=IMAGES_COUNT;i++){
    const img = document.createElement('img');
    img.src = `Images/img${i}.jpeg`;
    img.alt = `Profit ${i}`;
    // graceful fallback: if image 404, browser will show broken image — user ensures files exist
    cont.appendChild(img);
  }
}

/* ---- Populate lifestyle carousel ---- */
function populateLifestyle(){
  const cont = document.getElementById('lifestyleCarousel');
  if(!cont) return;
  cont.innerHTML = '';
  for (let i=1;i<=LIFESTYLE_COUNT;i++){
    const img = document.createElement('img');
    img.src = `Lifestyle/life${i}.jpeg`;
    img.alt = `Lifestyle ${i}`;
    cont.appendChild(img);
  }
}

/* ---- Chart carousel: ensure images exist in Charts/chart1..chart7.jpeg (case-sensitive) ----
   If an image fails to load on GitHub Pages because filename or case differs, fix file names in repo.
*/

/* ---- Watchlist ticker (moving) ---- */
const WATCHLIST = ['AAPL','TSLA','NVDA','SPY','QQQ','AMZN','MSFT','BTCUSD','META','AMD','INTC'];
function initWatchlistTicker(){
  const el = document.getElementById('watchlistTicker');
  if(!el) return;
  // Create repeating items to make smooth loop
  function makeItem(sym){
    const price = (100 + Math.random()*2400).toFixed(2);
    const ch = (Math.random()*3 - 1.5).toFixed(2);
    const cls = ch >= 0 ? 'pos' : 'neg';
    return `<span class="watchlist-item">${sym} <strong>$${price}</strong> <span class="${cls}">${ch}%</span></span>`;
  }
  const items = [];
  for (let i=0;i<WATCHLIST.length;i++) items.push(makeItem(WATCHLIST[i]));
  // duplicate content so CSS loop can scroll
  el.innerHTML = items.concat(items).join('');
  // periodically nudge new values (simulate live changes)
  setInterval(()=>{
    const nodes = el.querySelectorAll('.watchlist-item');
    nodes.forEach((n,i)=>{
      if (Math.random() < 0.12){
        const sym = WATCHLIST[i % WATCHLIST.length];
        const price = (100 + Math.random()*2400).toFixed(2);
        const ch = (Math.random()*3 - 1.5).toFixed(2);
        n.innerHTML = `${sym} <strong>$${price}</strong> <span class="${ch>=0? 'pos':'neg'}">${ch}%</span>`;
      }
    });
  }, 3200);
}

/* ---- Stats fade in/out (not counting) ---- */
function initStatsAnimation(){
  const nodes = document.querySelectorAll('.stat');
  if(!nodes || !nodes.length) return;
  let idx = 0;
  function showNext(){
    nodes.forEach(n => n.classList.remove('show'));
    nodes[idx].classList.add('show');
    idx = (idx + 1) % nodes.length;
  }
  // show first immediately
  showNext();
  // rotate visible stat every 3.5 seconds
  setInterval(showNext, 3500);
}

/* ---- Popup: use CSV names (and profit column if present) ---- */
let popupHandle = null;
async function initPopups(){
  const rows = await loadCSV(CSV_PATH);
  // determine name key
  let nameKey = null, profitKey = null;
  if (rows.length){
    const keys = Object.keys(rows[0]);
    nameKey = keys.find(k => /name|full|username/i.test(k)) || keys[0];
    profitKey = keys.find(k => /profit|pnl|gain|amount|cash/i.test(k));
  }
  const pool = (rows.length ? rows.map(r => ({ name: r[nameKey] || 'Trader', profit: profitKey ? r[profitKey] : '' })) : [{name:'Alex'},{name:'Jordan'},{name:'Taylor'},{name:'Casey'}]);
  // schedule popups
  const popupEl = document.getElementById('popup-container');
  if(!popupEl) return;
  function showOne(){
    const t = pool[Math.floor(Math.random()*pool.length)];
    const profitText = t.profit && t.profit.length ? t.profit : '$' + (Math.floor(Math.random()*9000)+200).toLocaleString();
    popupEl.innerHTML = `<div class="title">${escapeHtml(t.name)}</div><div class="meta">cashed out ${escapeHtml(profitText)} — shared in group</div>`;
    popupEl.classList.add('visible');
    setTimeout(()=> popupEl.classList.remove('visible'), POPUP_DISPLAY_MS);
  }
  // first show after small delay so page loads
  setTimeout(showOne, 1200);
  popupHandle = setInterval(showOne, POPUP_INTERVAL + Math.random()*2000);
}

/* ---- ticker bar bottom (market small items) ---- */
function initTickerBar(){
  const bar = document.getElementById('tickerInner');
  if(!bar) return;
  const items = ['AAPL +1.2%','TSLA +2.8%','NVDA +3.9%','SPY +0.6%','QQQ +0.9%','AMZN -0.4%','BTCUSD +1.7%'];
  bar.innerHTML = items.concat(items).map(t => `<div class="ticker-item">${t}</div>`).join('');
}

/* ---- Modal for TikTok DM ---- */
function openTikTokModal(){ const m=document.querySelector('.modal-backdrop'); if(m) m.style.display='flex'; }
function initModal(){
  if(document.querySelector('.modal-backdrop')) return;
  const md = document.createElement('div'); md.className = 'modal-backdrop';
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

/* ---- helper escapeHtml ---- */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---- Init site ---- */
(async function init(){
  // populate carousels
  populateProfitCarousel();
  populateLifestyle();

  // watchlist ticker
  initWatchlistTicker();

  // stats fade show
  initStatsAnimation();

  // quote rotation already scheduled (above)

  // ticker bar bottom
  initTickerBar();

  // modal
  initModal();

  // popups from CSV
  initPopups();

  // small: auto-scroll for carousel elements
  setTimeout(()=>{
    document.querySelectorAll('.carousel').forEach(car => {
      let x = 0;
      setInterval(()=>{
        if(!car.scrollWidth) return;
        if (x >= car.scrollWidth - car.clientWidth) x = 0;
        else x += Math.max(220, Math.round(car.clientWidth * 0.6));
        car.scrollTo({ left: x, behavior: 'smooth' });
      }, 3600);
    });
  }, 800);
})();
