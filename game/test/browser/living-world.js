const {test,expect}=require('@playwright/test');
const {observeErrors,screenshot}=require('./flow');
const fs=require('node:fs/promises');
async function scene(page,name='tallyport'){
  await page.goto('/__visual?scene='+name);await expect(page.locator('body')).toHaveAttribute('data-ready',name,{timeout:45000});
  const f=page.frames().find(f=>f.url().includes('visual_test=1'));const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();return f;
}
test('living world · cancellation freezes the actual between-tile position without rollback',async({page})=>{
  const errors=observeErrors(page),f=await scene(page);
  await f.evaluate(()=>{for(const e of Scene.ents()){e.wander=0;e.tx=null;e.fx=e.x;e.fy=e.y;}
    const {world:m}=Scene.debug(),[cx,cy]=Scene.towns()[1];
    for(let y=cy-22;y<cy+22;y++)for(let x=cx-28;x<cx+28;x++)if([0,1,2,3].every(d=>m.seen[y*m.w+x+d]&&!m.solid[y*m.w+x+d]&&!m.occ.has(y*m.w+x+d))){Scene.hop(x,y);return;}
    throw Error('No open movement lane');});
  const stick=f.locator('#movement-joystick');await expect(stick).toHaveAttribute('aria-disabled','false');const box=await stick.boundingBox();
  await stick.evaluate(n=>n.addEventListener('pointerdown',e=>n.dataset.pointer=String(e.pointerId),{once:true}));
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.74,box.y+box.height/2);
  const stop=await f.evaluate(()=>new Promise(resolve=>{function sample(){const p=Scene.debug().P;if(Math.abs(p.fx-Math.round(p.fx))>.08){const before=[p.fx,p.fy];const n=document.querySelector('#movement-joystick');n.dispatchEvent(new PointerEvent('pointercancel',{pointerId:+n.dataset.pointer}));resolve({before,after:[p.fx,p.fy],moving:Scene.traveling()});}else requestAnimationFrame(sample);}sample();}));
  await page.mouse.up();expect(stop.after).toEqual(stop.before);expect(stop.moving).toBe(false);await f.waitForTimeout(600);expect(await f.evaluate(()=>{const p=Scene.debug().P;return [p.fx,p.fy];})).toEqual(stop.before);expect(errors).toEqual([]);
});
test('living world · names follow rendered heads and town boundaries update location',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const actor=await f.evaluate(()=>{const e=Scene.find(e=>e.npcLook&&e.r===1&&e.kind==='banker');Scene.hop(...Scene.safePosition([e.x,e.y+1],1));return e.name;});
  await f.waitForFunction(name=>!!Scene.find(e=>e.name===name).rendered,actor);
  const bounds=await f.evaluate(name=>{const e=Scene.find(e=>e.name===name);return {x:e.rendered.headX,top:e.rendered.topY,footX:e.fx*16+8,footY:e.fy*16+15};},actor);
  expect(Math.abs(bounds.x-bounds.footX)).toBeLessThan(5);expect(bounds.top).toBeLessThan(bounds.footY-12);
  expect(await f.evaluate(()=>Scene.location().name)).toBe('Tallyport');await screenshot(page,info,'living-town-entrances-and-names');
  await f.evaluate(()=>{const {world:m}=Scene.debug(),[cx,cy]=Scene.towns()[1];for(let d=40;d<100;d++)for(const [x,y]of [[cx+d,cy],[cx-d,cy],[cx,cy-d],[cx,cy+d]])if(!Geography.inTown(x,y)&&m.seen[y*m.w+x]&&!m.solid[y*m.w+x]&&!m.occ.has(y*m.w+x)){Scene.hop(x,y);return;}throw Error('No wilderness landing');});
  expect(await f.evaluate(()=>Scene.location().name)).toBe('Wilderness');expect(errors).toEqual([]);
});
test('living world · entering a business records its matching map symbol across reload',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const service=await f.evaluate(()=>{const p=Scene.cartographyCatalogue().find(p=>p.kind==='service'&&p.type==='shop'&&p.r===1),b=p.building;
    if(!p)throw Error('Missing shop service');for(let i=0;i<b.plan.tiles.length;i++){if(b.plan.tiles[i]!==Buildings.FLOOR)continue;const x=b.x+i%b.w,y=b.y+Math.floor(i/b.w);if(!Scene.debug().world.solid[y*Scene.debug().world.w+x]&&!Scene.debug().world.occ.has(y*Scene.debug().world.w+x)){Scene.hop(x,y);return {id:p.id,name:p.name};}}throw Error('No shop interior');});
  await expect.poll(()=>f.evaluate(id=>!!__bw.S.services?.[id],service.id)).toBe(true);
  await f.locator('#nav [data-t=map]').click();await f.locator('[data-a=cmapview][data-mode=town]').click();const marker=f.locator('.cmap-service').filter({has:f.locator('svg')});await expect(marker).not.toHaveCount(0);await screenshot(page,info,'remembered-business-map');
  await f.evaluate(()=>__bw.save());await f.waitForLoadState('networkidle');
  // Leave the visual harness: reloading its iframe would rerun its disposable
  // character setup and race the real save-restoration screen on WebKit.
  await page.goto('/index.html?visual_test=1');await expect(page.locator('#artload')).toBeHidden({timeout:45000});await page.locator('[data-a=playslot]').click();
  expect(await page.evaluate(id=>!!__bw.S.services?.[id],service.id)).toBe(true);expect(errors).toEqual([]);
});
test('living world · enhanced dungeon depth remains readable at phone and desktop sizes',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page,'dungeon');await f.evaluate(()=>Scene.debug().draw());await screenshot(page,info,'living-dungeon-depth');
  expect(await f.evaluate(()=>Scene.debug().map.layout.rooms.length)).toBeGreaterThan(10);
  for(let r=2;r<=8;r++){
    await f.evaluate(r=>Scene.enterDungeon(r,{floor:0,progress:{seen:{},gates:{},claimed:{},kills:{}}}),r);
    await f.waitForTimeout(700);await f.evaluate(()=>Scene.debug().draw());
    await screenshot(page,info,'living-dungeon-theme-'+r);
    expect(await f.evaluate(()=>Scene.debug().map.r)).toBe(r);
  }
  expect(errors).toEqual([]);
});
test('living world · returning to characters retires house placement and dojo keeps the town location',async({page})=>{
  const errors=observeErrors(page),f=await scene(page);
  await f.evaluate(()=>{__bw.S.deeds=[{shape:0,mat:0}];__bw.ACT.placedeed({k:'0'});});
  await expect(f.locator('#placebar')).toBeVisible();expect(await f.evaluate(()=>!!Scene.ghostNow())).toBe(true);
  await f.locator('#nav [data-t=hero]').click();const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();await f.locator('[data-a=reset]').click();
  await expect(f.locator('#placebar')).toHaveCount(0);expect(await f.evaluate(()=>Scene.ghostNow())).toBeNull();
  await f.locator('[data-a=worldpick][data-i="1"]').click();await expect(f.locator('#placebar')).toHaveCount(0);expect(await f.evaluate(()=>Scene.ghostNow())).toBeNull();
  await f.locator('[data-a=worldpick][data-i="0"]').click();await f.locator('[data-a=playslot]').click();
  await f.evaluate(()=>Scene.enterHall(1,[]));expect(await f.evaluate(()=>Scene.location().name)).toBe('Tallyport');expect(errors).toEqual([]);
});

test('living world · painted walk and run keep one skull and restore flight in every outfit and direction',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  await f.waitForFunction(()=>Array.from({length:10},(_,i)=>!!Scene.debug().humanSprite({...__bw.HOST.app(),combo:i+1,hair:-1,hat:-1,beard:-1,wpn:-1,shield:-1,fx:null})).every(Boolean));
  const result=await f.evaluate(()=>{
    Scene.pause();const debug=Scene.debug(),base={...__bw.HOST.app(),hair:-1,hat:-1,beard:-1,wpn:-1,shield:-1,fx:null},failures=[],sample=[];
    const bounds=im=>{const p=im.getContext('2d').getImageData(0,0,80,80).data;let bottom=0;for(let y=0;y<80;y++)for(let x=0;x<80;x++)if(p[(y*80+x)*4+3]>160)bottom=y;return {bottom,head:ActorRig.headProfile(p,80,80)};};
    for(let combo=1;combo<=10;combo++){
      const sprite=debug.humanSprite({...base,combo});
      for(let direction=0;direction<8;direction++){
        const run=sprite.r8[direction].map(bounds),walk=sprite.w8[direction].map(bounds);
        const widths=run.map(b=>b.head.width);
        if(Math.max(...widths)-Math.min(...widths)>2)failures.push({combo,direction,issue:'changing skull width',widths});
        for(const [contact,flight]of [[0,2],[4,6]])if(run[contact].bottom-run[flight].bottom<2)failures.push({combo,direction,issue:'no flight',contact:run[contact].bottom,flight:run[flight].bottom});
        if(combo===1&&[6,7,0].includes(direction)){
          const dressed=debug.humanSprite({...base,combo,hair:0});
          sample.push({direction,walk:dressed.w8[direction].map(im=>im.toDataURL()),run:dressed.r8[direction].map(im=>im.toDataURL())});
        }
        if(walk.some(b=>b.bottom<70))failures.push({combo,direction,issue:'walking feet displaced'});
      }
    }
    for(const combo of [1,6])for(const gear of [{hair:0},{hair:5},{hat:0},{hat:3},{beard:2}]){
      const s=debug.humanSprite({...base,combo,...gear});
      for(const direction of [0,6,7]){
        const width=im=>{const h=bounds(im).head;return h.width;};
        const walk=width(s.w8[direction][2]),run=s.r8[direction].map(width);
        if(run.some(w=>Math.abs(w-walk)>2))failures.push({combo,direction,gear,issue:'head layer changes size',walk,run});
      }
    }
    return {failures,sample,scale:debug.zoom/3};
  });
  expect(result.failures).toEqual([]);expect(errors).toEqual([]);
  const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brasswake walk and run sample</title><style>body{background:#343b32;color:#f1ead7;font:17px system-ui;margin:24px}h1{font:28px Georgia}button{font:inherit;padding:8px;margin:4px}section{display:flex;flex-wrap:wrap;gap:20px}article{background:#858c75;padding:12px;color:#152016}canvas{display:block}small{display:block;max-width:34em}</style><h1>Walk and run sample</h1><p>Original Brasswake artwork with corrected head placement and running flight.</p><button id="pause">Pause</button><button id="slow">Slow motion</button><section id="sample"></section><p><small>Side, diagonal and front views. Large views are 3× the source frame; small views use the tested phone camera scale. Walking stays grounded. Running has two contact and flight phases.</small></p><script>const rows=${JSON.stringify(result.sample)},scale=${result.scale};let paused=false,slow=false,time=0,last=performance.now();document.getElementById('pause').onclick=()=>paused=!paused;document.getElementById('slow').onclick=()=>slow=!slow;const scenes=[];for(const row of rows)for(const gait of ['walk','run']){const a=document.createElement('article');a.innerHTML='<b>'+({6:'Side',7:'Diagonal',0:'Front'}[row.direction])+' · '+gait+'</b>';for(const size of [240,80*scale]){const c=document.createElement('canvas');c.width=c.height=Math.ceil(size);a.append(c);scenes.push({c,gait,images:row[gait].map(src=>{const i=new Image();i.src=src;return i;})});}document.getElementById('sample').append(a);}function draw(now){if(!paused)time+=(now-last)*(slow?.3:1);last=now;for(const s of scenes){const g=s.c.getContext('2d'),cycle=s.gait==='run'?2250/4.6:1800/2.2,k=Math.floor(time/cycle*8)%8;g.clearRect(0,0,s.c.width,s.c.height);g.fillStyle='#606e50';g.fillRect(0,s.c.height*77/80,s.c.width,1);if(s.images[k].complete)g.drawImage(s.images[k],0,0,s.c.width,s.c.height);}requestAnimationFrame(draw);}Promise.all(scenes.flatMap(s=>s.images).map(i=>i.decode())).then(()=>{last=performance.now();draw(last);document.body.dataset.ready='true';});</script>`;
  const path=info.outputPath('motion-sample.html');await fs.writeFile(path,html);await info.attach('motion-sample',{path,contentType:'text/html'});
  // Keep the animation on the foreground test page. Chromium may suspend rAF
  // in a second tab even after bringToFront on the mobile emulator.
  const gallery=page,galleryErrors=errors;await gallery.waitForLoadState('networkidle');await gallery.goto('about:blank');await gallery.setContent(html);await gallery.waitForFunction(()=>document.body.dataset.ready==='true'&&time>40);await expect(gallery.locator('canvas')).toHaveCount(12);
  const first=await gallery.locator('canvas').first().evaluate(c=>c.toDataURL());await expect.poll(()=>gallery.locator('canvas').first().evaluate(c=>c.toDataURL())).not.toBe(first);
  await gallery.getByRole('button',{name:'Pause',exact:true}).click();const stopped=await gallery.locator('canvas').first().evaluate(c=>c.toDataURL());await gallery.waitForTimeout(150);expect(await gallery.locator('canvas').first().evaluate(c=>c.toDataURL())).toBe(stopped);expect(galleryErrors).toEqual([]);
  await gallery.screenshot({path:info.outputPath('motion-sample.png'),fullPage:true});
});

test('living world · natural materials blend across shoulders and remain continuous at chunk seams',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  await f.waitForFunction(()=>['meadow','trail','rock','shallow','deep'].every(name=>!!Scene.debug().gpat(name)));
  const result=await f.evaluate(()=>{
    Scene.pause();const d=Scene.debug(),size=d.CS*d.TS,results=[],gallery=document.createElement('canvas');gallery.width=size;gallery.height=3*size/3;const gg=gallery.getContext('2d');
    for(const [index,[left,right]]of [[0,5],[0,3],[6,7]].entries()){
      const m={w:48,h:32,pal:d.world.pal,t:new Uint8Array(48*32),b:new Uint8Array(48*32).fill(1),reg:new Uint8Array(48*32).fill(1),fields:[]};d.groundKinds(m);
      for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)m.gk[y*m.w+x]=x<16?left:right;
      const render=x=>{const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');g.translate(-x*d.TS,0);if(!d.paintGround(m,g,x,0))throw Error('Missing material');return c;};
      const smooth=render(12),a=render(8),b=render(16),blend=TerrainEdges.blend;
      let hard;try{TerrainEdges.blend=(g,trace,fill)=>{g.save();g.clip(trace());fill();g.restore();};hard=render(12);}finally{TerrainEdges.blend=blend;}
      const p=smooth.getContext('2d').getImageData(0,0,size,size).data,q=hard.getContext('2d').getImageData(0,0,size,size).data;
      let mixed=0,far=0,seam=0,holes=0;
      const aa=a.getContext('2d').getImageData(size-4,0,4,size).data,bb=b.getContext('2d').getImageData(0,0,4,size).data;
      for(let y=8;y<size-8;y++)for(let x=0;x<size;x++){
        const i=(y*size+x)*4,changed=p[i]!==q[i]||p[i+1]!==q[i+1]||p[i+2]!==q[i+2];
        if(changed){if(Math.abs(x-size/2)<d.TS*1.5)mixed++;else far++;}if(p[i+3]!==255)holes++;
        if(x>=size/2-4&&x<size/2+4){const edge=x<size/2?aa:bb,j=(y*4+(x-size/2+4)%4)*4;for(let channel=0;channel<4;channel++)seam=Math.max(seam,Math.abs(p[i+channel]-edge[j+channel]));}
      }
      results.push({left,right,mixed,far,seam,holes});gg.drawImage(smooth,0,index*size/3,size,size/3);
    }
    return {results,image:gallery.toDataURL()};
  });
  for(const r of result.results){expect(r.mixed,JSON.stringify(r)).toBeGreaterThan(500);expect(r.far,JSON.stringify(r)).toBe(0);expect(r.seam,JSON.stringify(r)).toBeLessThanOrEqual(2);expect(r.holes,JSON.stringify(r)).toBe(0);}
  const path=info.outputPath('terrain-material-blends.png');await fs.writeFile(path,Buffer.from(result.image.split(',')[1],'base64'));await info.attach('terrain-material-blends',{path,contentType:'image/png'});expect(errors).toEqual([]);
});
