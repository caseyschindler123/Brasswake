const fs=require('node:fs'),path=require('node:path');
process.env.PLAYWRIGHT_BROWSERS_PATH||='C:/Users/caseys/source/Brasswake/work/playwright-browsers';
const {chromium}=require('@playwright/test');
const out=path.resolve(__dirname,'../../work/world-architecture/review');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});try{
  const metadata=[];
  for(const [name,viewport]of [['phone',{width:390,height:720}],['desktop',{width:1280,height:800}]]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/index.html?*',async route=>{
      const response=await route.fetch(),html=await response.text(),marker='const ox0 = Math.round(cam.x * K) / K';
      if(!html.includes(marker))throw Error('Review camera marker missing');
      await route.fulfill({response,body:html.replace(marker,'if(window.__architectureCamera){cam.x=window.__architectureCamera.x;cam.y=window.__architectureCamera.y;} '+marker)});
    });
    await page.goto('http://localhost:8885/__visual?scene=tallyport');await page.locator('body[data-ready=tallyport]').waitFor({timeout:45000});
    const f=page.frames().find(f=>f.url().includes('visual_test=1'));
    await f.evaluate(()=>{__bw.ACT.closesheet();const coach=document.querySelector('[data-a=coachok]');if(coach)coach.click();
      for(const e of Scene.ents()){e.wander=0;e.tx=null;e.fx=e.x;e.fy=e.y;}});
    const inventory=await f.evaluate(()=>Scene.debug().world.blds.reduce((a,b)=>{const k=b.modular?'modular':b.home?'owned':'other';a[k]=(a[k]||0)+1;if(k==='other')a.otherKinds=[...(a.otherKinds||[]),b.slot];return a;},{}));
    for(let r=1;r<=8;r++){
      const facts=await f.evaluate(r=>{
        const {world}=Scene.debug(),b=world.blds.find(b=>b.r===r&&b.slot==='tavern'),d=b.plan.doors.find(d=>d.side==='south');
        if(!b)throw Error('Missing tavern '+r);
        Scene.hop(...Scene.safePosition([b.x+d.x,b.y+b.h+2],r));
        const rect=document.querySelector('#stage').getBoundingClientRect(),z=Scene.debug().zoom;
        window.__architectureCamera={x:(b.x+b.w/2)*16-rect.width/z/2,y:b.y*16+(b.h*16-78)/2-rect.height/z/2};
        return {r,id:b.plan.id,shape:b.plan.shape,dimensions:[b.w,b.h]};
      },r);
      await f.waitForTimeout(3700);await page.screenshot({path:path.join(out,`region-${r}-${name}.png`)});
      const png=await f.locator('#stage canvas.game').evaluate(n=>n.toDataURL());fs.writeFileSync(path.join(out,`region-${r}-${name}-native.png`),Buffer.from(png.split(',')[1],'base64'));
      metadata.push({viewport:name,...facts,inventory});
    }
    const homes=await f.evaluate(()=>{
      const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=760;const g=canvas.getContext('2d');g.fillStyle='#e8dfcd';g.fillRect(0,0,1200,760);
      for(let shape=0;shape<Content.HOUSES.length;shape++){
        const [,w,h]=Content.HOUSES[shape],o={w,h,r:1,home:{id:'review-'+shape,shape,mat:shape%8,wall:'#e0c9ab',roof:'#95533a'}};
        const sprite=Scene.homeSpr(o),scale=1.5,x=22+shape%5*238,y=330+Math.floor(shape/5)*370;
        g.drawImage(sprite.c,x,y-sprite.c.height/3*scale,sprite.c.width/3*scale,sprite.c.height/3*scale);
        g.fillStyle='#342c24';g.font='17px Georgia';g.fillText(Content.HOUSES[shape][0],x,y+24);
      }
      return canvas.toDataURL();
    });
    fs.writeFileSync(path.join(out,'owned-house-kit.png'),Buffer.from(homes.split(',')[1],'base64'));
    if(errors.length)throw Error(JSON.stringify(errors));await page.close();
  }
  fs.writeFileSync(path.join(out,'world-inventory.json'),JSON.stringify(metadata,null,2));console.log('Saved all eight world families at phone/desktop sizes and owned-house kit.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
