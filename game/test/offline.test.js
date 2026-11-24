const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash,webcrypto}=require('node:crypto');
const hash=x=>createHash('sha256').update(x).digest('hex');
const source=fs.readFileSync(path.join(__dirname,'../src/service-worker.js'),'utf8');

function harness(){
  const root='https://example.test/Brasswake/', handlers={}, stores=new Map(),remote=new Map(), requests=[];
  let offline=false,fail='',quota=false;
  const clients=[{id:'first',url:root},{id:'second',url:root}];
  const caches={
    has:async name=>stores.has(name), keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),
    open:async name=>{
      if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name),key=r=>typeof r==='string'?r:r.url;
      return {match:async r=>store.get(key(r))?.clone(),keys:async()=>[...store.keys()].map(url=>new Request(url)),
        delete:async r=>store.delete(key(r)),put:async(r,value)=>{if(quota&&name.endsWith(current.version))throw new DOMException('Full','QuotaExceededError');store.set(key(r),value.clone());}};
    }
  };
  let current;
  function release(label){
    const files=[['index.html','<html>'+label+'</html>'],['vendor/sql-asm.js','SQL '+label],['art/later.webp','ART '+label],['art/mu/music.mp3','MUSIC '+label]];
    current={version:hash(label),files:files.map(([url,body])=>({url,sha256:hash(body),bytes:Buffer.byteLength(body)}))};
    current.bytes=current.files.reduce((n,f)=>n+f.bytes,0);
    for(const[url,body]of files)remote.set(root+url,body);
    remote.set(root+'offline-manifest.json',JSON.stringify(current));return current;
  }
  const context=vm.createContext({URL,Request,Response,Headers,Set,Map,Promise,Uint8Array,AbortController,crypto:webcrypto,setTimeout,clearTimeout,caches,
    fetch:async request=>{const url=typeof request==='string'?request:request.url;requests.push(url);if(offline||url.endsWith(fail||'__nothing__'))throw Error('network');return new Response(remote.get(url)||'Not found',{status:remote.has(url)?200:404});},
    self:{registration:{scope:root},skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>clients},addEventListener:(type,fn)=>handlers[type]=fn}});
  vm.runInContext(source,context);release('one');
  return {root,stores,remote,requests,release,get current(){return current;},set offline(v){offline=v;},set fail(v){fail=v;},set quota(v){quota=v;},
    async message(type,version=current.version,id='first'){
      const messages=[];let promise;handlers.message({data:{type,version},source:{id,url:root},ports:[{postMessage:m=>messages.push(m)}],waitUntil:p=>promise=p});await promise;return messages;
    },
    async fetch(relative,{navigation=false,id='first',result='new'}={}){
      let response;handlers.fetch({request:{url:new URL(relative,root).href,method:'GET',mode:navigation?'navigate':'cors'},clientId:id,resultingClientId:result,respondWith:p=>response=p});return response ? await response : null;
    }
  };
}

test('download verifies the complete release and cold navigation/art/music work offline in a subdirectory',async()=>{
  const h=harness();assert.equal((await h.message('status')).at(-1).ready,false);
  const messages=await h.message('download');assert.equal(messages.at(-1).type,'done');assert.equal(messages.at(-1).ready,true);
  assert.equal(messages.filter(m=>m.type==='progress').at(-1).bytes,h.current.bytes);
  h.offline=true;assert.equal(await (await h.fetch('./?commit=ignored',{navigation:true})).text(),'<html>one</html>');
  assert.equal(await (await h.fetch('art/later.webp',{id:'new'})).text(),'ART one');
  assert.equal(await (await h.fetch('art/mu/music.mp3',{id:'new'})).text(),'MUSIC one');
  assert.equal(await h.fetch('../another-project/',{navigation:true}),null);
  assert.equal(await h.fetch('release.json'),null,'Release verification must always bypass offline assets');
});
test('interruption and quota failure preserve the working copy, and retry resumes verified files',async()=>{
  const h=harness();await h.message('download');const first=h.current.version;h.release('two');h.fail='art/later.webp';
  assert.equal((await h.message('download')).at(-1).type,'error');assert.equal((await h.message('status',first)).at(-1).version,first);
  h.fail='';h.quota=true;assert.equal((await h.message('download')).at(-1).error,'quota');h.quota=false;
  assert.equal((await h.message('download')).at(-1).version,h.current.version);
  assert.equal(h.requests.filter(u=>u.endsWith('vendor/sql-asm.js')).length,2,'A verified partial file is not downloaded again');
});
test('update activation keeps older tabs on their original assets and reopens the new release',async()=>{
  const h=harness();await h.message('download');const first=h.current.version;await h.message('status',first,'second');h.release('two');
  await h.message('download',first);h.offline=true;
  assert.equal(await(await h.fetch('art/later.webp',{id:'second'})).text(),'ART one');
  assert.equal(await(await h.fetch('./',{navigation:true,result:'third'})).text(),'<html>two</html>');
  assert.equal(await(await h.fetch('vendor/sql-asm.js',{id:'third'})).text(),'SQL two');
});
test('missing cache entries remove readiness and a retry repairs them',async()=>{
  const h=harness();await h.message('download');const assetCache=[...h.stores.values()].find(c=>c.has(h.root+'art/later.webp'));
  assetCache.delete(h.root+'art/later.webp');assert.equal((await h.message('status')).at(-1).ready,false);
  await h.message('download');assert.equal((await h.message('status')).at(-1).ready,true);
  assetCache.set(h.root+'art/later.webp',new Response('damaged stored bytes'));
  await h.message('download');assert.equal(await(await h.fetch('art/later.webp')).text(),'ART one');
});
test('hash mismatch and unsafe manifests never advertise a complete download',async()=>{
  const h=harness();h.remote.set(h.root+'art/later.webp','wrong art');assert.equal((await h.message('download')).at(-1).error,'integrity');
  assert.equal((await h.message('status')).at(-1).ready,false);
  const m=h.release('two');m.files[0].url='../other/index.html';h.remote.set(h.root+'offline-manifest.json',JSON.stringify(m));
  assert.equal((await h.message('download')).at(-1).type,'error');assert.equal((await h.message('status')).at(-1).ready,false);
});
test('built offline manifest covers actual assets, SQL and fonts with correct integrity and size',()=>{
  const dist=path.resolve(__dirname,'../dist'),manifest=JSON.parse(fs.readFileSync(path.join(dist,'offline-manifest.json')));
  const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
  assert.ok(html.includes('content="'+manifest.version+'"'));
  assert.match(html,/src="vendor\/sql-asm.js"/);assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)="https?:/);
  let size=0;for(const f of manifest.files){const bytes=fs.readFileSync(path.join(dist,f.url));assert.equal(hash(bytes),f.sha256,f.url);assert.equal(bytes.length,f.bytes,f.url);size+=bytes.length;}
  assert.equal(size,manifest.bytes);assert.ok(manifest.files.some(f=>/^art\/mu\/.+\.mp3$/.test(f.url)));
  const game=path.resolve(__dirname,'..');
  const sourceArt=fs.readdirSync(path.join(game,'art'),{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>path.relative(game,path.join(e.parentPath,e.name)).split(path.sep).join('/')).sort();
  assert.deepEqual(manifest.files.filter(f=>f.url.startsWith('art/')).map(f=>f.url).sort(),sourceArt,'Every source art, font and music file is available offline');
  assert.ok(manifest.files.some(f=>f.url==='vendor/fonts/IBMPlexMono-Regular.ttf'));
  assert.ok(fs.readFileSync(path.join(dist,'vendor/sql-asm.js')).equals(fs.readFileSync(require.resolve('sql.js/dist/sql-asm.js'))));
});
