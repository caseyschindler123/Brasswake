/* Disposable actual-scene and complete-plan review. Never enters production. */
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
require('./browser-path');
const {chromium}=require('playwright');
const Dungeons=require('../src/dungeons');
const base=process.argv[2]||'http://localhost:8894';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Use the disposable local fixture');
const output=path.resolve(process.argv[3]||'../work/dungeon-spatial-captures');
const profiles={phone:{width:390,height:720},landscape:{width:844,height:390},desktop:{width:1280,height:800}};
(async()=>{
  await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true});
  const record={profiles:{},errors:[]};
  try{
    for(const [name,viewport]of Object.entries(profiles)){
      const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:name!=='desktop',hasTouch:name!=='desktop'}),page=await context.newPage();
      page.on('pageerror',e=>record.errors.push(String(e)));
      await page.goto(base+'/__visual?scene=dungeon');await page.locator('body[data-ready=dungeon]').waitFor({timeout:45000});
      const frame=page.frames().find(f=>f.url().includes('visual_test=1'));record.profiles[name]=[];
      for(let r=1;r<=8;r++){
        const facts=await frame.evaluate(r=>{
          if(__bw.DG)__bw.DP.exit();__bw.DP.enter(r);const f=Dungeons.get(r).floors.length-1;__bw.DP.floor(f);
          const m=Scene.debug().map;for(const e of m.ents)if(['mon','guard','keeper'].includes(e.kind)){e.agg=0;e.wander=0;e.chase=0;e.alert=0;}
          const R=m.layout.rooms.filter(R=>!/[wxyzvA]/.test(R.id)).sort((a,b)=>b.cells.length-a.cells.length)[0];
          const at=R.cells.map(i=>[i%m.w,Math.floor(i/m.w)]).filter(([x,y])=>!m.solid[y*m.w+x]&&!m.occ.has(y*m.w+x)).sort((a,b)=>Math.hypot(a[0]-R.cx,a[1]-R.cy)-Math.hypot(b[0]-R.cx,b[1]-R.cy))[0];
          Scene.hop(...at);return {r,f,name:m.layout.name,room:R.name,shape:R.shape,at,cover:m.layout.cover.length};
        },r);
        await frame.waitForFunction(()=>!Scene.debug().map.pending);await page.waitForTimeout(3500);
        await page.screenshot({path:path.join(output,name+'-'+r+'.png'),animations:'disabled'});record.profiles[name].push(facts);
      }
      await context.close();
    }
    const page=await browser.newPage({viewport:{width:1060,height:1100}});
    for(let r=1;r<=8;r++){
      let html='<body style="margin:0;background:#151a22;color:#eee;font:16px Arial"><h2>'+Dungeons.get(r).name+'</h2><div style="display:grid;grid-template-columns:repeat(2,500px);gap:15px">';
      for(const {f}of Dungeons.get(r).floors){
        const m=Dungeons.build(r,f);html+='<section>'+m.name+'<svg viewBox="0 0 124 109" width="496" height="436">';
        for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){const t=m.tiles[y*m.w+x];if(t)html+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${['#151a22','#a4b1b8','#255973','#b45730','#d2b775'][t]}"/>`;}
        for(const R of m.rooms)html+=`<text x="${R.cx}" y="${R.cy}" font-size="3.5" fill="#1a1b20">${R.id}</text>`;
        for(const e of m.entities.filter(e=>['dgate','dsecret','dlever','keeper','dtravel'].includes(e.kind)))html+=`<circle cx="${e.x}" cy="${e.y}" r="1.4" fill="${e.kind==='dgate'?'red':e.kind==='dlever'?'lime':'#f6df60'}"/>`;
        html+='</svg></section>';
      }
      await page.setContent(html+'</div>');await page.screenshot({path:path.join(output,'plans-'+r+'.png'),fullPage:true});
    }
    assert.deepEqual(record.errors,[]);await fs.writeFile(path.join(output,'record.json'),JSON.stringify(record,null,2));
    console.log('Captured 24 actual scenes and all 28 floor plans in '+output);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
