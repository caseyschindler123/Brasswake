require('../../game/test/browser-path');
const {chromium}=require('../../game/node_modules/playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'wardrobe.html')).href);
 await page.waitForFunction(()=>typeof previous==='number'&&phase!==0);
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 const phaseBefore=await page.evaluate(()=>phase);
 const seen=new Set();
 for(const look of ['plate','tunic']){
  await page.locator('[data-outfit="'+look+'"]').click();
  for(const k of ['walk','run']){
   await page.locator('[data-gait="'+k+'"]').click();
   for(const dir of ['E','NE','N','NW','W','SW','S','SE']){
    await page.locator('[data-dir="'+dir+'"]').click();
    for(const active of [true,false]){
     if(await page.locator('#weapon').getAttribute('aria-pressed')!==String(active))await page.locator('#weapon').click();
     await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     seen.add(await page.locator('canvas').evaluate(c=>c.toDataURL()));
    }
   }
  }
 }
 assert.equal(seen.size,64);assert.equal(await page.evaluate(()=>phase),phaseBefore);
 await page.locator('#doll').click();
 const dollShots=[];
 for(const look of ['tunic','plate']){
  await page.locator('[data-outfit="'+look+'"]').click();
  await page.locator('#inventory').evaluate(im=>im.decode());
  assert.equal(await page.locator('canvas').isVisible(),false);
  dollShots.push(await page.locator('#inventory').getAttribute('src'));
 }
 assert.notEqual(...dollShots);
 await page.locator('#inventory').screenshot({path:path.join(__dirname,'paper-doll-phone.png')});
 await page.locator('#doll').click();await page.locator('#weapon').click();
 await page.locator('[data-dir="NE"]').click();await page.locator('#pause').click();
 await page.waitForFunction(v=>phase!==v,phaseBefore);
 await page.screenshot({path:path.join(__dirname,'phone.png')});
 await page.setViewportSize({width:1040,height:760});
 await page.screenshot({path:path.join(__dirname,'desktop.png')});
 const dirs=['SE','E','NE','N','NW','W','SW','S'];
 for (const motion of ['walk','run']){
  for(const [j,dir] of dirs.entries()){
   const pictures=await page.evaluate(({motion,dir})=>{
    const c=document.createElement('canvas');c.width=390;c.height=310;
    const g=c.getContext('2d');const result=[];
    for(let i=0;i<8;i++){
     g.fillStyle='#e8e1d2';g.fillRect(0,0,390,310);g.fillStyle='#383229';
     g.font='15px Segoe UI';g.fillText('Plate · '+motion+' · '+dir,12,19);
     g.drawImage(street,0,196,390,114);
     for(const [who,x,sx,h,small] of [['man',104,162,133,43],['woman',267,247,126,41]]){
      paintActor(g,who,motion,dir,i,x,182,1.04);
      paintActor(g,who,motion,dir,i,sx,294,small/h);
     }
     result.push(c.toDataURL());
    }
    return result;
   },{motion,dir});
   pictures.forEach((p,i)=>fs.writeFileSync(path.join(__dirname,motion+'-'+(j*8+i)+'.png'),Buffer.from(p.split(',')[1],'base64')));
  }
 }
 assert.deepEqual(errors,[]);
 console.log('64 selectable movement states, both paper dolls, persistent phase, playback and 128 review frames passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
