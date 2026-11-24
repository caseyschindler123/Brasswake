/* Download state is separate from player state; rendering never replaces a focused control. */
const Offline = (() => {
  const version=document.querySelector('meta[name="brasswake-release"]').content;
  const base=new URL('./', location.href);
  const state={supported:!!(isSecureContext && navigator.serviceWorker && window.caches), checking:true, ready:false, busy:false, bytes:0, total:0, remote:null, active:null, error:''};
  let registration, started=false;
  const mb = bytes => (bytes/1e6).toFixed(bytes < 10e6 ? 1 : 0) + ' MB';
  function presentation() {
    const reopen=state.ready && state.active!==version;
    const update=state.ready && state.remote && state.remote!==state.active;
    const label=state.busy?'Downloading…':reopen?'Open downloaded game':state.error?'Retry download':update?'Update offline copy':'Download for offline play';
    const title=state.busy?'Downloading offline copy':state.error?(state.ready?'Previous offline copy is safe':'Download incomplete'):state.ready?'Ready for offline play':state.checking?'Checking offline copy…':'Play anywhere';
    const note=state.error || (state.busy?`${mb(state.bytes)} of ${mb(state.total)}. Keep the game open.`:reopen?'Your download is ready. Open it to finish the update.':state.ready?'All artwork and music are saved on this device.':!state.supported?'Open the hosted game in Safari or Chrome to download it.':`Download the whole game${state.total?' · '+mb(state.total):''}, including artwork and music.`);
    return {title,note,label,reopen,show:!state.ready||!!state.error||reopen||update};
  }
  function html() {
    const p=presentation();
    return `<section class="offline-card" aria-label="Offline play"><div class="offline-heading"><b data-offline-title role="status" aria-live="polite">${p.title}</b><button class="offline-help" data-a="offlinehelp" aria-label="Offline play help">How it works</button></div><p data-offline-note>${p.note}</p><progress data-offline-progress aria-label="Offline download progress" max="${state.total||1}" value="${state.bytes}"${state.busy?'':' hidden'}></progress><button class="btn" data-a="offlinedownload"${p.show?'':' hidden'}${!state.supported||state.checking||state.busy?' disabled':''}>${p.label}</button></section>`;
  }
  function draw() {
    const p=presentation();
    for(const card of document.querySelectorAll('.offline-card')) {
      card.querySelector('[data-offline-title]').textContent=p.title;
      card.querySelector('[data-offline-note]').textContent=p.note;
      const progress=card.querySelector('progress'); progress.hidden=!state.busy; progress.max=state.total||1; progress.value=state.bytes;
      const button=card.querySelector('[data-a=offlinedownload]'); button.textContent=p.label; button.hidden=!p.show; button.disabled=!state.supported||state.checking||state.busy;
    }
  }
  async function worker() {
    registration ||= await navigator.serviceWorker.register(new URL('service-worker.js',base), {scope:base.pathname, updateViaCache:'none'});
    const ready=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('registration')),15000))]);
    return ready.active;
  }
  async function request(type) {
    const target=await worker();
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel(); let timer;
      const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>{channel.port1.close();reject(new Error('timeout'));},60000);};
      channel.port1.onmessage=({data})=>{
        arm();
        if(data.type==='progress'){state.bytes=data.bytes;state.total=data.total;draw();return;}
        clearTimeout(timer);channel.port1.close();data.type==='error'?reject(new Error(data.error)):resolve(data);
      };
      arm(); target.postMessage({type,version},[channel.port2]);
    });
  }
  async function refresh() {
    if(!state.supported){state.checking=false;draw();return;}
    if(state.busy)return;
    try {
      const copy=await request('status'); state.ready=copy.ready; state.active=copy.version;
      if(copy.bytes)state.total=copy.bytes;
    } catch(_){state.ready=false;}
    state.checking=false;draw();
    try {
      const r=await fetch(new URL('offline-manifest.json',base),{cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(!r.ok)throw 0;const m=await r.json();state.remote=m.version;if(!state.ready)state.total=m.bytes;
    } catch(_){}
    state.checking=false;draw();
  }
  async function download() {
    if(!state.supported||state.busy)return;
    state.busy=true;state.error='';draw();
    try {
      /* Persistence is best effort; readiness depends on verified cached files. */
      if(navigator.storage && navigator.storage.persist)navigator.storage.persist().catch(()=>{});
      const result=await request('download');state.ready=result.ready;state.active=result.version;state.total=result.bytes;
    } catch(e){
      state.error=e.message==='quota'?'There isn’t enough device storage. Free some space, then retry.':e.message==='integrity'?'The game changed during the download. Retry when you’re connected.':'The download stopped. Reconnect and retry; saved progress is safe.';
      try {const copy=await request('status');state.ready=copy.ready;state.active=copy.version;}catch(_){}
    }
    state.busy=false;state.checking=false;draw();
  }
  function init(){
    if(started)return;started=true;refresh();
    window.addEventListener('online',refresh);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  }
  return {html,draw,init,download,refresh,reopen:()=>presentation().reopen};
})();
