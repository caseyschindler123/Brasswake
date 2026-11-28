require('../../game/test/browser-path');
const {chromium}=require('../../game/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const out=__dirname;
function save(name,url){fs.writeFileSync(path.join(out,name),Buffer.from(url.split(',')[1],'base64'));}
(async()=>{
 const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:390,height:720}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(out,'carry.html')).href);
 await page.waitForFunction(()=>typeof previous==='number'&&phase!==0);
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 for(const k of ['walk','run']){
  await page.locator('[data-gait="'+k+'"]').click();
  const seen=new Set();
  for(const dir of ['S','SE','E','NE','N','NW','W','SW']){
    await page.locator('[data-dir="'+dir+'"]').click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    seen.add(await page.locator('canvas').evaluate(c=>c.toDataURL()));
  }
  assert.equal(seen.size,8);
  const rendered=await page.evaluate(k=>{
    const compass=[['NW','N','NE'],['W',null,'E'],['SW','S','SE']];
    const frames=[],details=[];
    const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;
      const g=c.getContext('2d');g.fillStyle='#e8e1d2';g.fillRect(0,0,w,h);return[c,g];};
    for(let i=0;i<8;i++){
      const [c,g]=make(390,315);
      compass.forEach((row,ri)=>row.forEach((d,ci)=>{
        const x=ci*130+65,y=ri*105+79;
        g.fillStyle='#493e30';g.textAlign='center';
        if(!d){g.font='18px Segoe UI';g.fillText(k==='run'?'Run':'Walk',x,y-29);return;}
        paintActor(g,'man',k,d,i,x-27,y,.36);paintActor(g,'woman',k,d,i,x+26,y,.36);
        g.font='13px Segoe UI';g.fillText(d,x,y+17);
      }));
      frames.push(c.toDataURL());
    }
    for(const actor of ['man','woman']){
      const [c,g]=make(8*128,8*104);
      ['N','NE','E','SE','S','SW','W','NW'].forEach((d,j)=>{
        for(let i=0;i<8;i++){
          g.save();g.beginPath();g.rect(i*128,j*104,128,104);g.clip();
          paintActor(g,actor,k,d,i,i*128+63,j*104+136,.91);
          g.restore();
        }
        g.fillStyle='#392e22';g.font='12px Segoe UI';g.fillText(d,3,j*104+13);
      });
      details.push(c.toDataURL());
    }return{frames,details};
  },k);
  rendered.frames.forEach((url,i)=>save(k+'-'+i+'.png',url));
  rendered.details.forEach((url,i)=>save(k+'-'+(i?'female':'male')+'-check.png',url));
 }
 await page.locator('[data-dir="SE"]').click();
 await page.getByRole('button',{name:'Play',exact:true}).click();
 await page.waitForFunction(()=>phase===2);
 await page.screenshot({path:path.join(out,'phone.png')});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.setViewportSize({width:1040,height:760});
 await page.locator('[data-dir="NW"]').click();
 await page.screenshot({path:path.join(out,'desktop.png')});
 assert.deepEqual(errors,[]);
 console.log('All 32 character/gait/direction combinations rendered. Pause, play, direction changes and responsive layout passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
