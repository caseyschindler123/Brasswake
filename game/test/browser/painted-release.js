const fs=require('node:fs/promises');
const {test,expect}=require('@playwright/test');
const {open}=require('./dev-helper');
const {observeErrors,screenshot}=require('./flow');

test('painted release · representative equipment and battle attachments survive play',async({page},info)=>{
 const errors=observeErrors(page);await open(page);
 const result=await page.evaluate(async()=>{
  await PaintedGear.preload();
  const actor=Scene.debug().P,target={fx:actor.fx+1,fy:actor.fy};Scene.FX.swing('me',target,'swords');
  await new Promise(resolve=>setTimeout(resolve,100));
  if(!(actor.atk>0)||Math.hypot(actor.ax||0,actor.ay||0)>1e-9)throw Error('Captured human attack must keep source foot placement without a second whole-body lunge');
  const base={...__bw.HOST.app(),combo:5,build:1,hat:2,wpn:27,wkind:'crossbow',style:'thrust',shield:-1,gear:null,cloth:'#4d6684'},
   gear=PaintedGear.resolve({wpn:27,hat:2,hands:{name:'Plated Gauntlets'},feet:{name:'Riding Boots'},cloak:{name:'Travelling Cloak'}}),a={...base,gear};a.key=JSON.stringify(a);
  const canvas=Object.assign(document.createElement('canvas'),{width:900,height:620}),g=canvas.getContext('2d');g.fillStyle='#eadbbd';g.fillRect(0,0,900,620);document.body.append(canvas);canvas.style.display='none';
  let ready=false;const doll=Object.assign(document.createElement('canvas'),{width:300,height:450});document.body.append(doll);doll.style.display='none';
  for(let n=0;n<200&&!ready;n++){ready=Scene.drawDoll(doll,a);if(!ready)await new Promise(r=>setTimeout(r,25));}
  if(!ready)throw Error('Equipped doll did not load');g.drawImage(doll,0,0);
  const states=[['walk',0,16],['run',5,16],['sit',23,0],['crossbow',13,6],['block',22,6],['hit',20,6]];let frames=0;
  for(let i=0;i<states.length;i++)for(const [j,source]of [0,2,4,6].entries()){
   const [state,row,frame]=states[i],pose={row,source,frame},end=performance.now()+6000;let im;
   while(((im=Scene.debug().npcFrame(a,pose))?.gait!==state||im?.pendingParts)&&performance.now()<end)await new Promise(requestAnimationFrame);
   if(!im||im.gait!==state||!im.anchor.every(Number.isFinite)||im.width>=256||im.height>=256)throw Error('Invalid fitted action '+state+'/'+source);
   g.drawImage(im,350+i*85-im.originX,115+j*125-im.originY);frames++;
  }
  const missing=Object.entries(ArtData.paintedGear.entries).filter(([id])=>!id.endsWith('-side')&&!id.endsWith('-back')).filter(([id,e])=>!PaintedGear.icon({name:e.name,slot:id.startsWith('w')?'weapon':undefined,v:/^w\d+$/.test(id)?Number(id.slice(1)):undefined})).map(([id])=>id);
  const gloves=ArtData.painted.slots[1].hands,feet=ArtData.painted.slots[1].feet;
  for(const id of ['hands-leather','hands-thief','hands-plated','hands-gilded','dojo-5'])if(!gloves[id])throw Error('Missing fitted gloves '+id);
  for(const id of ['feet-leather','feet-riding','feet-steel','feet-gilded'])if(!feet[id])throw Error('Missing fitted boots '+id);
  doll.remove();canvas.remove();return{frames,missing,gear,image:canvas.toDataURL(),directions:ArtData.painted.directions,actions:ArtData.painted.actions};
 });
 expect(result).toMatchObject({frames:24,missing:[],directions:8,actions:12,gear:{weapon:'w27',head:'head-2',hands:'hands-plated',feet:'feet-riding',cloak:'cloak-travelling'}});
 const file=info.outputPath('painted-release-fit.png');await fs.writeFile(file,Buffer.from(result.image.split(',')[1],'base64'));await info.attach('painted-release-fit',{path:file,contentType:'image/png'});
 const equipped=await page.evaluate(()=>{Dev.skills({archery:80});Dev.grant({weapon:'archery',rarity:'legendary',tier:8,variant:27});for(const slot of ['armor','head','hands','feet','cloak'])Dev.grant({slot,rarity:'epic',tier:8});return __bw.HOST.app().gear;});expect(equipped.weapon).toBe('w27');for(const slot of ['head','hands','feet','cloak'])expect(equipped[slot]).toBeTruthy();
 await page.locator('#nav [data-t=bag]').click();await page.locator('#doll').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#doll')?.getContext('2d').getImageData(150,100,1,1).data[3]>0);await screenshot(page,info,'painted-release-hero');
 await page.locator('#view .pclose').click();await screenshot(page,info,'painted-release-world');expect(errors).toEqual([]);
});

test('painted release · the approved standard figures render the six outfits and equipped actions',async({page},info)=>{
 const errors=observeErrors(page);await open(page);
 const result=await page.evaluate(async()=>{
  Scene.pause();await PaintedGear.preload();
  const view=Scene.debug(),create=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});
  const board=create(1080,980),g=board.getContext('2d');
  g.fillStyle='#e8e1d2';g.fillRect(0,0,board.width,board.height);
  const base={...__bw.HOST.app(),build:0,skin:1,hc:['#2e1c10','#8f5e34'],glow:null,hat:-1,shield:-1,fx:null};
  const item={wpn:1,hands:{name:'Leather Gloves'},feet:{name:'Riding Boots'},cloak:{name:'Travelling Cloak'}};
  const outfits=['Tunic','Dyed robe','Leather and cloak','Mail','Tempered Steel','Knight’s Plate'];
  const samples=[[-1,'idle',6,0],[23,'sit',6,0],[0,'walk',6,6],[5,'run',5,16],[10,'swing',2,6]];
  const stool=new Image();stool.src='art/kit/k1.webp';await stool.decode();
  const stoolRect=ArtData.kit.k1.f_stool;
  let checked=0;
  for(let actor=0;actor<2;actor++)for(const [col,label]of outfits.entries()){
    const appearance={...base,combo:actor*5+Math.min(col+1,5),headStyle:PaintedTwoBody.headStyle(actor),
      gear:PaintedGear.resolve(col===2?item:{wpn:1}),wpn:1,wkind:'sword',cloth:col===1?'#384369':null,
      armorMaterial:col===4?EquipmentRules.MATERIALS.tempered:null,armorGear:col===5?'armor-knights-plate':null};
    appearance.key=JSON.stringify(appearance);
    const x=col*180,y=actor*490;
    const doll=create(300,450);doll.hidden=true;document.body.append(doll);
    const deadline=performance.now()+6000;
    while(!Scene.drawDoll(doll,appearance)&&performance.now()<deadline)await new Promise(requestAnimationFrame);
    if(!view.paintedDollFitting(appearance).embeddedHead||!doll.getContext('2d').getImageData(150,110,1,1).data[3])throw Error('Missing doll for '+label);
    g.fillStyle='#332b23';g.font='14px sans-serif';g.fillText(label,x+8,y+19);g.drawImage(doll,x+81,y+30,99,149);doll.remove();checked++;
    for(const [j,[row,state,source,frame]]of samples.entries()){
      const deadline=performance.now()+6000;let image;
      do {
        image=view.npcFrame(appearance,{row,source,frame});
        if(image?.gait===state&&image.paintedTwoBody&&!image.pendingParts)break;
        await new Promise(requestAnimationFrame);
      } while(performance.now()<deadline);
      if(image?.gait!==state||!image.paintedTwoBody||image.pendingParts)throw Error('Missing '+label+' '+state);
      const anchorX=x+40+(j>2?86:0),anchorY=y+100+(j>2?190+(j-3)*96:j*96);
      if(row===23)g.drawImage(stool,...stoolRect,anchorX-17,anchorY-31,33,39);
      g.drawImage(image,anchorX-image.originX,anchorY-image.originY);checked++;
    }
  }
  const limits=view.npcCache();
  return {checked,limits,image:board.toDataURL()};
 });
 expect(result.checked).toBe(72);
 expect(result.limits.assetBytes).toBeLessThanOrEqual(result.limits.assetLimit);
 expect(result.limits.frames).toBeLessThanOrEqual(result.limits.limit);
 const path=info.outputPath('two-body-wardrobe.png');
 await fs.writeFile(path,Buffer.from(result.image.split(',')[1],'base64'));
 await info.attach('two-body-wardrobe',{path,contentType:'image/png'});
 expect(errors).toEqual([]);
});
