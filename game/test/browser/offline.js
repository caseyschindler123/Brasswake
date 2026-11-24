const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const {screenshot}=require('./flow');
const {offlineFlow,hero,newHero}=require('./offline-flow');
const http=require('node:http');
const path=require('node:path');
const {createHash}=require('node:crypto');

test('real offline updates retain the previous copy on failure and isolate already open tabs',async({page,context})=>{
  test.setTimeout(90000);
  const worker=await fs.readFile(path.join(__dirname,'../../src/service-worker.js'));
  const hash=b=>createHash('sha256').update(b).digest('hex');let label='one',broken=false;
  const versions={};
  function release(){const bodies={'index.html':'<!DOCTYPE html><h1>'+label+'</h1>','vendor/sql-asm.js':'SQL '+label,'art/later.webp':'ART '+label};const files=Object.entries(bodies).map(([url,b])=>({url,bytes:Buffer.byteLength(b),sha256:hash(b)}));const manifest={version:hash(label),bytes:files.reduce((n,f)=>n+f.bytes,0),files};versions[label]=manifest.version;return {bodies,manifest};}
  const server=http.createServer((req,res)=>{
    const file=req.url.split('?')[0].replace(/^\/Brasswake\//,''),r=release();
    if(file==='service-worker.js'){res.setHeader('Content-Type','application/javascript');return res.end(worker);}
    if(file==='offline-manifest.json'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(r.manifest));}
    if(broken&&file==='art/later.webp'){res.statusCode=503;return res.end('Interrupted');}
    res.setHeader('Content-Type',file===''||file==='index.html'?'text/html':'application/octet-stream');res.end(r.bodies[file||'index.html']);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const root='http://localhost:'+server.address().port+'/Brasswake/';
  try {
    await page.goto(root);await page.evaluate(async()=>{await navigator.serviceWorker.register('service-worker.js');await navigator.serviceWorker.ready;});
    async function message(target,type,version){return target.evaluate(({type,version})=>new Promise(async resolve=>{const r=await navigator.serviceWorker.ready,c=new MessageChannel();c.port1.onmessage=e=>{if(e.data.type!=='progress'){c.port1.close();resolve(e.data);}};r.active.postMessage({type,version},[c.port2]);}),{type,version});}
    expect((await message(page,'download',versions.one)).type).toBe('done');
    await page.reload();await expect(page.locator('h1')).toHaveText('one');await message(page,'status',versions.one);
    label='two';broken=true;expect((await message(page,'download',versions.one)).type).toBe('error');
    expect((await message(page,'status',versions.one)).version).toBe(versions.one);
    broken=false;expect((await message(page,'download',versions.one)).type).toBe('done');
    expect(await page.evaluate(async()=>await(await fetch('art/later.webp')).text())).toBe('ART one');
    await context.setOffline(true);const next=await context.newPage();await next.goto(root);await expect(next.locator('h1')).toHaveText('two');
    expect(await next.evaluate(async()=>await(await fetch('vendor/sql-asm.js')).text())).toBe('SQL two');
    expect((await message(next,'status',versions.two)).ready).toBe(true);
    await next.evaluate(async()=>{const names=await caches.keys();for(const name of names){const cache=await caches.open(name);const response=await cache.match(new URL('index.html',location.href));if(response&&(await response.text()).includes('<h1>two'))await cache.delete(new URL('art/later.webp',location.href));}});
    expect((await message(next,'status',versions.two)).ready).toBe(false);await next.close();
  }finally{await context.setOffline(false);await new Promise(resolve=>server.close(resolve));}
});
test('offline download cold reopens with SQL, all assets, saves and portable files',async({page,context},info)=>{
  test.setTimeout(240000);await offlineFlow(page,context,info);
});
test('failed device saves stay visible and file backups remain available',async({page,context},info)=>{
  await context.addInitScript(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});await newHero(page);await hero(page);
  const before=await page.evaluate(()=>{window.originalSet=Storage.prototype.setItem;const saved=localStorage.getItem('brasswake.acct.v9');Storage.prototype.setItem=function(k,v){if(k==='brasswake.acct.v9')throw new DOMException('Full','QuotaExceededError');return originalSet.call(this,k,v);};return saved;});
  await page.locator('#view [data-a=savenow]').click();await expect(page.locator('#save-warning')).toBeVisible();await expect(page.locator('#view [data-save-status]')).toContainText('could not be saved');
  expect(await page.evaluate(()=>localStorage.getItem('brasswake.acct.v9'))).toBe(before);
  await screenshot(page,info,'save-storage-warning');
  await page.locator('#save-warning [data-a=backup]').click();const pending=page.waitForEvent('download');await page.locator('[data-a=savefile]').click();
  const download=await pending,backup=await fs.readFile(await download.path());expect(JSON.parse(Buffer.from(backup.toString().trim(),'base64')).worlds[0].slots[0].name).toBe('Plane Traveller');
  await page.locator('.sheet-x').click();await page.evaluate(()=>{Storage.prototype.setItem=originalSet;});await page.locator('#view [data-a=savenow]').click();await expect(page.locator('#save-warning')).toBeHidden();
});
test('save-file import waits for confirmation and native sharing receives the full account',async({page})=>{
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});await newHero(page);await hero(page);
  await page.evaluate(()=>{Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});navigator.share=async({files})=>{window.sharedSave={name:files[0].name,code:await files[0].text()};};});
  await page.locator('#view [data-a=backup]').click();await page.locator('[data-a=savefile]').click();await expect(page.locator('#backup-status')).toContainText('shared');
  const shared=await page.evaluate(()=>sharedSave);expect(JSON.parse(Buffer.from(shared.code.trim(),'base64')).worlds).toHaveLength(3);
  await page.locator('.sheet-x').click();await page.locator('#view [data-a=import]').click();
  await page.locator('#save-file').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not a save')});await expect(page.locator('#save-file-status')).toContainText('not a valid');
  expect(await page.locator('#savebox').inputValue()).toBe('');
  await page.locator('#save-file').setInputFiles({name:shared.name,mimeType:'text/plain',buffer:Buffer.from(shared.code)});await expect(page.locator('#save-file-status')).toContainText('Choose Load');
  await expect(page.locator('#sheet')).toBeVisible();await page.locator('[data-a=doimport]').click();await expect(page.locator('#sheet')).toBeHidden();
});
