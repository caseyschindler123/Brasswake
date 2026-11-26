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
 await page.locator('#nav [data-t=hero]').click();await page.locator('#doll').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#doll')?.getContext('2d').getImageData(150,100,1,1).data[3]>0);await screenshot(page,info,'painted-release-hero');
 await page.locator('#nav [data-t=world]').click();await screenshot(page,info,'painted-release-world');expect(errors).toEqual([]);
});
