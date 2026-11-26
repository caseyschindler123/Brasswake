const fs=require('node:fs/promises');
const {test,expect}=require('@playwright/test');
const {open}=require('./dev-helper');
const {observeErrors,screenshot}=require('./flow');
test('appearance · facial attachments and five visibly distinct material finishes retain real equipped figures',async({page},info)=>{
 const errors=observeErrors(page);await open(page);
 const result=await page.evaluate(async()=>{
  const create=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  const draw=async a=>{a={...a,gear:PaintedGear.resolve({wpn:a.wpn,hat:a.hat,shieldIndex:a.shield})};const c=create(300,450);c.style.display='none';document.body.append(c);for(let n=0;n<100;n++){if(Scene.drawDoll(c,a))return c;await new Promise(r=>setTimeout(r,40));}throw Error('Paperdoll art not ready');};
  const base={...__bw.HOST.app(),gear:null,combo:1,hair:-1,hat:-1,beard:-1,wpn:-1,shield:-1,glow:null,fx:null};
  const head=create(2160,1100),g=head.getContext('2d');g.fillStyle='#eadbbd';g.fillRect(0,0,head.width,head.height);g.font='14px sans-serif';
  for(let combo=1;combo<=10;combo++)for(const [n,style]of HeadPortraits.styles(Math.floor((combo-1)/5)).entries()){const c=await draw({...base,combo,headStyle:style.id,hair:style.hair,beard:style.beard}),pd={hx:ArtData.painted.combos[CharacterProfiles.index({...base,combo})].doll.head[1]},x=n*180,y=(combo-1)*110;g.fillStyle='#302a21';g.fillText('Figure '+combo+' · '+style.name,x+4,y+15);g.drawImage(c,pd.hx-40,0,80,90,x+42,y+18,82,90);c.remove();}
  const sheets=[['face-fitting',head.toDataURL()]],unique={};
  for(const [family,combo,wpn,wkind]of [['metal',5,1,'sword'],['wood',1,26,'bow'],['leather',3,-1,''],['cloth',2,-1,'']]){
    const materials=EquipmentRules.eligibleMaterials({slot:family==='wood'?'weapon':'armor',w:'archery',name:family==='metal'?'Plate Cuirass':family==='wood'?'Short Bow':family==='leather'?'Leather Jerkin':'Travelling Robe'},8);
    const plate=create(1500,660),q=plate.getContext('2d');q.fillStyle='#eadbbd';q.fillRect(0,0,1500,660);q.font='17px sans-serif';unique[family]=[];
    for(let n=0;n<materials.length;n++){const m=materials[n],appearance={...base,combo,wpn,wkind,armorMaterial:family==='wood'?null:m,weaponMaterial:wpn>=0?m:null},c=await draw(appearance);q.fillStyle='#302a21';q.fillText(m.name,n*300+15,24);q.drawImage(c,n*300,28);unique[family].push(c.toDataURL());c.remove();let sprite;for(let t=0;t<100;t++){sprite=Scene.debug().humanSprite(appearance);if(sprite)break;await new Promise(r=>setTimeout(r,40));}if(!sprite)throw Error('Moving equipment not ready');for(const [j,direction]of [0,6,7].entries()){let im;for(let t=0;t<100;t++){im=sprite.r8[direction][16];if(im?.gait==='run'&&!im.pendingParts)break;await new Promise(r=>setTimeout(r,40));}if(im?.gait!=='run'||im.pendingParts)throw Error('Material run frame did not become ready');const scale=1.8;q.drawImage(im,n*300+30+j*90-im.originX*scale,635-im.originY*scale,im.width*scale,im.height*scale);}}
    sheets.push(['material-'+family,plate.toDataURL()]);
  }
  const hair=create(1200,600),h=hair.getContext('2d');h.fillStyle='#eadbbd';h.fillRect(0,0,1200,600);h.font='13px sans-serif';let k=0;
  for(const combo of [1,6])for(let item=0;item<18;item++){const styles=HeadPortraits.styles(Math.floor((combo-1)/5)),style=styles[item<12?item:1],c=await draw({...base,combo,headStyle:style.id,hair:style.hair,beard:style.beard,hat:item>=12?item-12:-1}),pd={hx:ArtData.painted.combos[CharacterProfiles.index({...base,combo})].doll.head[1]},x=k%12*100,y=Math.floor(k/12)*200;h.fillStyle='#302a21';h.fillText('Figure '+combo+' '+(item<12?style.name:'Hat '+(item-12)),x+2,y+15);h.drawImage(c,pd.hx-50,0,100,150,x,y+18,100,150);c.remove();k++;}
  sheets.push(['hair-headgear-fitting',hair.toDataURL()]);
  return {sheets,unique:Object.fromEntries(Object.entries(unique).map(([key,values])=>[key,new Set(values).size]))};
 });
 expect(result.unique).toEqual({metal:5,wood:5,leather:5,cloth:5});
 if(info.project.name!=='phone-webkit')for(const[name,data]of result.sheets){const path=info.outputPath(name+'.png');await fs.writeFile(path,Buffer.from(data.split(',')[1],'base64'));await info.attach(name,{path,contentType:'image/png'});}
 await page.locator('#nav [data-t=hero]').click();await screenshot(page,info,'equipped-hero-material');expect(errors).toEqual([]);
});


for(let sex=0;sex<2;sex++)for(let build=0;build<3;build++)test(`painted fit · ${sex?'woman':'man'} · ${['average','muscular','heavy'][build]} · full wardrobe and actions`,async({page},info)=>{
 const errors=observeErrors(page);await open(page);
 const result=await page.evaluate(async({sex,build})=>{
  const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),plate=make(800,1800),g=plate.getContext('2d'),failures=[];
  g.fillStyle='#eadbbd';g.fillRect(0,0,plate.width,plate.height);g.font='13px sans-serif';
  const base={...__bw.HOST.app(),gear:null,build,hair:0,headStyle:HeadPortraits.styles(sex)[1].id,beard:-1,hat:-1,wpn:-1,shield:-1,glow:null,fx:null,cloth:null,metal:null,armorMaterial:null,handMaterial:null,footMaterial:null,weaponMaterial:null,shieldMaterial:null};
  const cases=[['idle',-1],['walk',0],['run',5],['sit',23],['swing',10,0,'sword'],['swingtwo',10,2,'long'],['thrust',13,14,'dagger'],['thrusttwo',13,7,'long'],['bow',13,25,'bow'],['crossbow',13,27,'crossbow'],['cast',16,9,'staff'],['book',16,24,'book'],['block',22,0,'sword',20],['hit',20,0,'sword'],['fall',19,0,'sword']];
  let checked=0;
  for(let outfit=0;outfit<5;outfit++){
   const appearance={...base,combo:sex*5+outfit+1},c=make(300,450);c.style.display='none';document.body.append(c);const end=performance.now()+5000;let ready=false;
   while(!(ready=Scene.drawDoll(c,appearance))&&performance.now()<end)await new Promise(requestAnimationFrame);
   if(!ready)throw Error('Doll failed to load');g.fillStyle='#302a21';g.fillText(['Tunic','Robe','Leather','Mail','Plate'][outfit],outfit*160+5,16);g.drawImage(c,outfit*160+5,20,150,225);c.remove();
   for(const [j,[state,row,wpn=-1,wkind='',shield=-1]]of cases.entries()){
    const a={...appearance,wpn,wkind,shield,style:row===16?'cast':row===13?'thrust':'swing',gear:PaintedGear.resolve({wpn,shieldIndex:shield})};a.key=JSON.stringify(a);
    const pose={row,source:0,frame:0},deadline=performance.now()+5000;let im;
    while(((im=Scene.debug().npcFrame(a,pose))?.gait!==state||im?.pendingParts)&&performance.now()<deadline)await new Promise(requestAnimationFrame);
    if(im?.gait!==state)throw Error('State failed to load: '+state);
    const n=['walk','run'].includes(state)?24:['idle','sit'].includes(state)?1:ArtData.painted.actions;
    for(let source=0;source<ArtData.painted.directions;source++)for(let k=0;k<n;k++){
     const image=Scene.debug().npcFrame(a,{source,row,frame:k});checked++;
     if(!image||image.gait!==state||image.gaitFrame!==k||image.width<=0||image.width>=256||image.height<=0||image.height>=256||!image.anchor.every(Number.isFinite)||(['walk','run'].includes(state)&&image.feet.length!==2))failures.push({outfit,state,source,k});
     if([0,2,4].includes(source)&&k===Math.floor((n-1)/2)){const x=outfit*160+[0,2,4].indexOf(source)*53+26,y=250+j*100+90;g.drawImage(image,x-image.originX,y-image.originY);}
    }
    g.fillStyle='#302a21';g.fillText(state,outfit*160+3,262+j*100);
   }
  }
  return{failures,checked,image:plate.toDataURL()};
 },{sex,build});
 expect(result.failures).toEqual([]);expect(result.checked).toBe(7280);
 if(info.project.name!=='phone-webkit'){const file=info.outputPath('painted-fit.png');await fs.writeFile(file,Buffer.from(result.image.split(',')[1],'base64'));await info.attach('painted-fit',{path:file,contentType:'image/png'});}
 expect(errors).toEqual([]);
});
