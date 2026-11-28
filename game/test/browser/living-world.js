const {test,expect}=require('@playwright/test');
const {observeErrors,screenshot}=require('./flow');
const fs=require('node:fs/promises');
async function scene(page,name='tallyport'){
  await page.goto('/__visual?scene='+name);await expect(page.locator('body')).toHaveAttribute('data-ready',name,{timeout:45000});
  const f=page.frames().find(f=>f.url().includes('visual_test=1'));const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();return f;
}

for(let region=1;region<=8;region++)test('living landscape · regional woodland '+region+' keeps routes and reveals foreground actors',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const facts=await f.evaluate(r=>{
    const {world:m,landscape}=Scene.debug();
    for(const e of m.ents){e.wander=0;e.tx=null;e.fx=e.x;e.fy=e.y;}
    const [cx,cy]=Scene.towns()[r];
    const candidates=[...m.landscape.trees.values()].filter(t=>t.r===r&&m.reg[t.y*m.w+t.x]===r&&t.stage===2&&t.species===0
      &&!m.blds.some(b=>t.x>b.x-9&&t.x<b.x+b.w+9&&t.y>b.y-9&&t.y<b.y+b.h+9))
      .sort((a,b)=>Math.abs(Math.hypot(a.x-cx,a.y-cy)-65)-Math.abs(Math.hypot(b.x-cx,b.y-cy)-65));
    const found=candidates.find(t=>{const x=t.x,y=t.y-1,i=y*m.w+x;return m.seen[i]&&!m.solid[i]&&!m.occ.has(i)&&!m.keep[i];});
    if(!found)throw Error('No reachable woodland tree in region '+r);
    Scene.hop(found.x,found.y-1);
    const actors=landscape.actors(),entry=landscape.entry(found,found.y*16+15,actors,1000);
    const keys=Object.keys(LandscapeArt.at[r]);
    const details=Landscape.visible(m.landscape,found.x-9,found.y-9,found.x+9,found.y+9);
    let anchorError=0;
    for(const key of keys.filter(k=>k.startsWith('tree')))for(const flip of [false,true])for(const width of [.91,1.09]){
      const item=landscape.entry({...found,key,flip,width},found.y*16+15,[],1000),p=item[10];
      anchorError=Math.max(anchorError,Math.abs(item[2]+p.originX-(found.x*16+8)),Math.abs(item[3]+p.originY-(found.y*16+15)));
    }
    return {r,keys,stageKeys:[...new Set([...m.landscape.trees.values()].filter(t=>t.r===r).map(t=>t.key))],
      alpha:entry&&entry[7],pieces:keys.map(k=>!!landscape.piece(r,k)),details:details.length,
      anchorError,physical:m.solid[(found.y-1)*m.w+found.x],family:Landscape.families[r]};
  },region);
  expect(facts.keys).toHaveLength(16);expect(facts.stageKeys).toHaveLength(8);expect(facts.pieces.every(Boolean)).toBe(true);
  expect(facts.alpha).toBe(.16);expect(facts.physical).toBe(0);expect(facts.details).toBeGreaterThan(2);
  expect(facts.anchorError).toBeLessThan(1e-8);
  await f.waitForTimeout(3400);await f.evaluate(()=>{Scene.pause();Scene.debug().draw();});
  await screenshot(page,info,'landscape-region-'+region);expect(errors).toEqual([]);
});

test('living landscape · repeatable decoration leaves navigation, settlements and save positions intact',async({page})=>{
  const errors=observeErrors(page),f=await scene(page);
  const result=await f.evaluate(()=>{
    const m=Scene.debug().world;
    const digest=a=>{let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619);return h>>>0;};
    const physical=()=>[m.t,m.solid,m.keep,m.o,m.reg].map(digest);
    const before=physical(),original=m.landscape,rebuilt=Landscape.build(m);
    const safe=[...rebuilt.chunks.values()].every(chunk=>chunk.length<=Landscape.MAX_CHUNK&&chunk.every(o=>m.t[o.anchor]<2&&!m.solid[o.anchor]&&(o.tended||!m.keep[o.anchor])));
    return {before,after:physical(),same:JSON.stringify(rebuilt.stats)===JSON.stringify(original.stats),safe,
      trees:rebuilt.stats.trees,details:rebuilt.stats.details,regions:rebuilt.stats.regions,
      cache:Scene.debug().landscape.images.size,budget:8*16};
  });
  expect(result.after).toEqual(result.before);expect(result.same).toBe(true);expect(result.safe).toBe(true);
  expect(result.trees).toBeGreaterThan(1000);expect(result.details).toBeGreaterThan(1000);
  expect(result.regions.slice(1).every(n=>n>100)).toBe(true);expect(result.cache).toBeLessThanOrEqual(result.budget);
  expect(errors).toEqual([]);
});

test('living landscape · tended planting stays on public garden soil beside clear paths',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const facts=await f.evaluate(()=>{
    const m=Scene.debug().world,trees=m.props.filter(p=>p.kind==='tree0'&&p.r===8),t=trees[0];
    if(!t)throw Error('Missing authored capital planting');
    const beds=[...m.landscape.chunks.values()].flat().filter(o=>o.tended&&o.r===8&&trees.some(t=>Math.abs(o.x-t.x)===1&&o.y===t.y-1));
    Scene.hop(...Scene.safePosition([t.x+1,t.y+2],8));
    return {beds:beds.length,soil:beds.every(o=>m.t[o.anchor]<2&&!m.solid[o.anchor]),
      path:trees.every(t=>m.t[(t.y+1)*m.w+t.x-1]===3&&!m.solid[(t.y+1)*m.w+t.x-1]),
      trails:m.landscape.trails.length};
  });
  expect(facts.beds).toBe(12);expect(facts.soil).toBe(true);expect(facts.path).toBe(true);expect(facts.trails).toBeGreaterThan(0);
  await f.waitForTimeout(3400);await f.evaluate(()=>{Scene.pause();Scene.debug().draw();});
  await screenshot(page,info,'landscape-tended-capital-garden');expect(errors).toEqual([]);
});

test('living landscape · managed fruit rows retain existing trunks and reachable farm approaches',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const facts=await f.evaluate(()=>{
    const m=Scene.debug().world,orchards=m.landscape.orchards;
    if(!orchards.length)throw Error('No managed orchard rows beside suitable farms');
    const o=orchards.find(o=>o.rows.length===2)||orchards[0],row=o.rows[0],[x,y]=row[Math.floor(row.length/2)];
    Scene.hop(...Scene.safePosition([x,y+1],o.r));
    return {count:orchards.length,rows:o.rows.length,trees:o.rows.flat().length,
      rooted:orchards.every(o=>o.rows.every(row=>row.length>=3&&row.every(([x,y])=>{
        const i=y*m.w+x,t=m.landscape.trees.get(i);return y===row[0][1]&&m.solid[i]&&m.o[i]>0&&m.o[i]<4&&t.r===4&&t.species===1;
      }))),near:Math.hypot(Scene.pos()[0]-x,Scene.pos()[1]-(y+1))};
  });
  expect(facts.count).toBeGreaterThan(0);expect(facts.trees).toBeGreaterThanOrEqual(3);expect(facts.rooted).toBe(true);expect(facts.near).toBeLessThan(3);
  await f.waitForTimeout(3400);await f.evaluate(()=>{Scene.pause();Scene.debug().draw();});
  await screenshot(page,info,'landscape-managed-orchard');expect(errors).toEqual([]);
});
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
  await f.locator('#minimap').click();await f.locator('[data-a=cmapview][data-mode=town]').click();const marker=f.locator('.cmap-service').filter({has:f.locator('svg')});await expect(marker).not.toHaveCount(0);await screenshot(page,info,'remembered-business-map');
  await f.evaluate(()=>__bw.save());
  await expect.poll(()=>f.evaluate(()=>{const effects=Sound.status().effects;return effects.loading.length+effects.queued.length;})).toBe(0);
  await f.waitForLoadState('networkidle');
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
  await f.locator('#nav [data-t=hero]').click();const coach=f.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();await f.locator('[data-a=charactersettings]').click();await f.locator('[data-a=reset]').click();
  await expect(f.locator('#placebar')).toHaveCount(0);expect(await f.evaluate(()=>Scene.ghostNow())).toBeNull();
  await f.locator('[data-a=worldpick][data-i="1"]').click();await expect(f.locator('#placebar')).toHaveCount(0);expect(await f.evaluate(()=>Scene.ghostNow())).toBeNull();
  await f.locator('[data-a=worldpick][data-i="0"]').click();await f.locator('[data-a=playslot]').click();
  await f.evaluate(()=>Scene.enterHall(1,[]));expect(await f.evaluate(()=>Scene.location().name)).toBe('Tallyport');expect(errors).toEqual([]);
});

test('living world · rebuilt walk and run preserve adult heads, planted feet and flight in every outfit and direction',async({page},info)=>{
  const errors=observeErrors(page),f=await scene(page);
  const result=await f.evaluate(async()=>{
    // Clear fitted gear as well as legacy indices for the head-only comparison.
    Scene.pause();const debug=Scene.debug(),base={...__bw.HOST.app(),hair:-1,hat:-1,beard:-1,wpn:-1,shield:-1,gear:null,fx:null},failures=[],sample=[];
    // Warm only the fitting under review so the bounded asset cache can retire
    // prior outfits without substituting an idle frame into a motion check.
    const readySprite=async a=>{let s;while(!(s=debug.humanSprite(a))||s.w8[0][0]?.gait!=='walk'||s.r8[0][0]?.gait!=='run')await new Promise(requestAnimationFrame);return s;};
    const bounds=im=>{
      const w=im.width,h=im.height,p=im.getContext('2d').getImageData(0,0,w,h).data;let bottom=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(p[(y*w+x)*4+3]>160)bottom=y;
      const inkAt=([sx,sy])=>{for(let y=Math.max(0,Math.floor(sy)-2);y<=Math.min(h-1,Math.ceil(sy)+2);y++)for(let x=Math.max(0,Math.floor(sx)-2);x<=Math.min(w-1,Math.ceil(sx)+2);x++)if(p[(y*w+x)*4+3]>100)return true;return false;};
      return {bottom:bottom-im.originY,headWidth:im.anchor[2],supports:im.supports.length,flight:im.flight,grounded:im.supports.every(inkAt),feet:im.feet.map(p=>({height:p[3],lift:p[2]-p[1],visible:inkAt(p)}))};
    };
    const encoded=im=>({src:im.toDataURL(),x:im.originX,y:im.originY,width:im.width,height:im.height});
    for(let combo=1;combo<=10;combo++){
      const sprite=await readySprite({...base,combo});
      const profile=Math.floor((combo-1)/5)*3+(base.build||0),heightScale=ActorRig.gait(true,profile).stride/ActorRig.gait(true,0).stride;
      for(let direction=0;direction<8;direction++){
        const run=sprite.r8[direction].map(bounds),walk=sprite.w8[direction].map(bounds);
        const widths=run.map(b=>b.headWidth);
        if(Math.max(...widths)-Math.min(...widths)>2)failures.push({combo,direction,issue:'changing skull width',widths});
        if(!run.some(b=>b.flight)||run.some(b=>b.supports>1))failures.push({combo,direction,issue:'missing running flight or unexpected double support'});
        if(walk.some(b=>b.flight||b.supports<1)||!walk.some(b=>b.supports===2))failures.push({combo,direction,issue:'walking lost continuous/double support'});
        if([...run,...walk].some(b=>!b.grounded))failures.push({combo,direction,issue:'visible sole misses its planted support'});
        const flights=[0,.5].map(start=>run.findIndex((b,k)=>k>=start*run.length&&k<(start+.5)*run.length&&b.flight));
        // The source cycle and stature scale changed with painted bodies.
        // Keep the same normalized clearance and actual visible-pixel minimum.
        for(const phase of flights)if(phase<0||run[phase].feet.some(f=>f.height/heightScale<.06||f.lift<2||!f.visible))failures.push({combo,direction,issue:'no visible sole clearance during flight',phase,feet:run[phase]?.feet});
        if(combo===1&&[6,7,0].includes(direction)){
          const dressed=debug.humanSprite({...base,combo,hair:0});
          sample.push({direction,walk:dressed.w8[direction].map(encoded),run:dressed.r8[direction].map(encoded)});
        }
        const still=sprite.idle8[direction][0];if(still.gait!=='idle'||!still.width||!still.height)failures.push({combo,direction,issue:'missing coherent standing pose'});
      }
    }
    for(const combo of [1,6])for(const gear of [{hair:0},{hair:5},{hat:0},{hat:3},{beard:2}]){
      const s=await readySprite({...base,combo,...gear});
      for(const direction of [0,6,7]){
        const width=(running,k)=>{
          const dressed=(running?s.r8:s.w8)[direction][k],plain=(running?debug.humanSprite({...base,combo}).r8:debug.humanSprite({...base,combo}).w8)[direction][k];
          const canvases=[dressed,plain].map(im=>{const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(im,64-im.originX,96-im.originY);return c.getContext('2d').getImageData(0,0,128,128).data;});
          const end=Math.min(128,Math.ceil(96-dressed.originY+dressed.anchor[0]+13));let left=128,right=0;
          for(let y=0;y<end;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,a=canvases[0],b=canvases[1];if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>16){left=Math.min(left,x);right=Math.max(right,x);}}
          return right-left;
        };
        const walk=width(false,16),run=s.r8[direction].map((_,k)=>width(true,k));
        if(run.some(w=>Math.abs(w-walk)>2))failures.push({combo,direction,gear,issue:'head layer changes size',walk,run});
      }
    }
    return {failures,sample,cache:debug.npcCache(),scale:debug.zoom/3,gaits:{walk:ActorRig.gait(false),run:ActorRig.gait(true)}};
  });
  expect(result.failures).toEqual([]);expect(errors).toEqual([]);
  expect(result.cache.frames).toBeLessThanOrEqual(result.cache.limit);expect(result.cache.materials).toBeGreaterThan(0);expect(result.cache.materials).toBeLessThanOrEqual(result.cache.materialLimit);
  const html=require('../motion-sample')(result);
  const path=info.outputPath('motion-sample.html');await fs.writeFile(path,html);await info.attach('motion-sample',{path,contentType:'text/html'});
  // Load the standalone sample in place of the game harness before checking playback.
  const gallery=page,galleryErrors=errors;await gallery.waitForLoadState('networkidle');await gallery.goto('about:blank');await gallery.setContent(html);await gallery.waitForFunction(()=>document.body.dataset.ready==='true'&&time>40);await expect(gallery.locator('canvas')).toHaveCount(12);
  // rAF timestamps describe frame start and may precede initialization in that frame.
  expect(await gallery.evaluate(()=>{const before={time,last};paint(last-1);return {time:time-before.time,last:last-before.last};})).toEqual({time:0,last:0});
  const first=await gallery.locator('canvas').first().evaluate(c=>c.toDataURL());await expect.poll(()=>gallery.locator('canvas').first().evaluate(c=>c.toDataURL())).not.toBe(first);
  await gallery.getByRole('button',{name:'Slow motion',exact:true}).click();expect(await gallery.evaluate(()=>{const before=time;paint(last+100);return time-before;})).toBeCloseTo(30,5);
  await gallery.getByRole('button',{name:'Normal speed',exact:true}).click();expect(await gallery.evaluate(()=>{const before=time;paint(last+100);return time-before;})).toBeCloseTo(100,5);
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
