/* Sidebar toggle */
const burger=document.getElementById('burger'); const sidebar=document.getElementById('sidebar');
if(burger){ burger.addEventListener('click',()=> sidebar.classList.toggle('open')); }

/* Modal */
function openTikTokModal(){document.getElementById('tt-modal').style.display='flex';}
function closeTikTokModal(){document.getElementById('tt-modal').style.display='none';}
window.openTikTokModal=openTikTokModal; window.closeTikTokModal=closeTikTokModal;

/* Animated counters */
function animateCounter(el,target,duration=1200){
  let start=0, step=target/duration*16;
  function update(){ start+=step; if(start<target){el.textContent=Math.floor(start);} else{el.textContent=target;} if(start<target) requestAnimationFrame(update); }
  update();
}
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.stat h2').forEach(el=>{
    const val=parseInt(el.dataset.count||0); animateCounter(el,val);
  });
});

/* Pagination loader for galleries (profits, lifestyle) */
function loadGallery(containerId, folder, baseName, perPage=12, exts=["jpeg","jpg"]){
  const grid=document.getElementById(containerId); if(!grid) return;
  let page=1, images=[];
  
  async function tryLoad(idx){
    for(const ext of exts){
      const url=`${folder}/${baseName}${idx}.${ext}`;
      try{ const res=await fetch(url,{method:"HEAD"}); if(res.ok) return url; }catch{}
    }
    return null;
  }

  async function loadAll(){
    let i=1, misses=0;
    while(misses<5){
      const u=await tryLoad(i);
      if(u){ images.push(u); misses=0; } else { misses++; }
      i++;
    }
    showPage(1);
  }

  function showPage(p){
    page=p;
    grid.innerHTML="";
    const start=(page-1)*perPage, end=start+perPage;
    images.slice(start,end).forEach(src=>{
      const img=document.createElement('img'); img.src=src; img.alt=src; grid.appendChild(img);
    });
    const nav=document.createElement('div'); nav.style="margin-top:12px;text-align:center";
    if(page>1){ const prev=document.createElement('button'); prev.textContent="« Prev"; prev.className="btn ghost"; prev.onclick=()=>showPage(page-1); nav.appendChild(prev); }
    if(end<images.length){ const next=document.createElement('button'); next.textContent="Next »"; next.className="btn"; next.style="margin-left:8px"; next.onclick=()=>showPage(page+1); nav.appendChild(next); }
    grid.appendChild(nav);
  }

  loadAll();
}

/* Charts loader (stop at last available) */
async function loadCharts(containerId, folder, baseName, exts=["jpeg","jpg"]){
  const grid=document.getElementById(containerId); if(!grid) return;
  let i=1, misses=0;
  while(misses<3){
    let found=false;
    for(const ext of exts){
      const url=`${folder}/${baseName}${i}.${ext}`;
      try{ const res=await fetch(url,{method:"HEAD"}); if(res.ok){ 
        const img=document.createElement('img'); img.src=url; img.alt=`${baseName}${i}`; grid.appendChild(img); 
        found=true; break; 
      }}catch{}
    }
    if(!found) misses++; else misses=0;
    i++;
  }
}

/* ChartVideo loader (stop at last available) */
async function loadVideos(containerId, folder, baseName){
  const vg=document.getElementById(containerId); if(!vg) return;
  let i=1, misses=0;
  while(misses<3){
    const url=`${folder}/${baseName}${i}.mov`;
    try{ const res=await fetch(url,{method:"HEAD"}); if(res.ok){
      const wrap=document.createElement('div'); wrap.className='card'; wrap.innerHTML=
        `<video controls preload="metadata" style="width:100%;border-radius:10px">
           <source src="${url}" type="video/quicktime">
         </video>`;
      vg.appendChild(wrap); misses=0;
    } else { misses++; } }
    catch{ misses++; }
    i++;
  }
}

/* Init */
document.addEventListener('DOMContentLoaded',()=>{
  loadGallery("profits-grid","Images","img");          // profits → paginated
  loadGallery("lifestyle-grid","Lifestyle","life");    // lifestyle → paginated
  loadCharts("charts-grid","Charts","chart");          // charts → only available
  loadVideos("video-grid","ChartVideo","monitor");     // videos → only available
});
