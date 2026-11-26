const fs=require('node:fs/promises');
const {test,expect}=require('@playwright/test');
const {open}=require('./dev-helper');
const {observeErrors,screenshot}=require('./flow');
test('appearance · facial attachments and five visibly distinct material finishes retain real equipped figures',async({page},info)=>{
 const errors=observeErrors(page);await open(page);
 const result=await page.evaluate(async()=>{
  const create=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  const draw=async a=>{const c=create(300,450);c.style.display='none';document.body.append(c);for(let n=0;n<100;n++){if(Scene.drawDoll(c,a))return c;await new Promise(r=>setTimeout(r,40));}throw Error('Paperdoll art not ready');};
  const base={...__bw.HOST.app(),combo:1,hair:-1,hat:-1,beard:-1,wpn:-1,shield:-1,glow:null,fx:null};
  const head=create(2160,1100),g=head.getContext('2d');g.fillStyle='#eadbbd';g.fillRect(0,0,head.width,head.height);g.font='14px sans-serif';
  for(let combo=1;combo<=10;combo++)for(const [n,style]of HeadPortraits.styles(Math.floor((combo-1)/5)).entries()){const c=await draw({...base,combo,headStyle:style.id,hair:style.hair,beard:style.beard}),pd=ArtData.body.pd[combo],x=n*180,y=(combo-1)*110;g.fillStyle='#302a21';g.fillText('Figure '+combo+' · '+style.name,x+4,y+15);g.drawImage(c,pd.hx-40,0,80,90,x+42,y+18,82,90);c.remove();}
  const sheets=[['face-fitting',head.toDataURL()]],unique={};
  for(const [family,combo,wpn,wkind]of [['metal',5,1,'sword'],['wood',1,26,'bow'],['leather',3,-1,''],['cloth',2,-1,'']]){
    const materials=EquipmentRules.eligibleMaterials({slot:family==='wood'?'weapon':'armor',w:'archery',name:family==='metal'?'Plate Cuirass':family==='wood'?'Short Bow':family==='leather'?'Leather Jerkin':'Travelling Robe'},8);
    const plate=create(1500,660),q=plate.getContext('2d');q.fillStyle='#eadbbd';q.fillRect(0,0,1500,660);q.font='17px sans-serif';unique[family]=[];
    for(let n=0;n<materials.length;n++){const m=materials[n],appearance={...base,combo,wpn,wkind,armorMaterial:family==='wood'?null:m,weaponMaterial:wpn>=0?m:null},c=await draw(appearance);q.fillStyle='#302a21';q.fillText(m.name,n*300+15,24);q.drawImage(c,n*300,28);unique[family].push(c.toDataURL());c.remove();let sprite;for(let t=0;t<100;t++){sprite=Scene.debug().humanSprite(appearance);if(sprite)break;await new Promise(r=>setTimeout(r,40));}if(!sprite)throw Error('Moving equipment not ready');for(const [j,direction]of [0,6,7].entries()){const im=sprite.r8[direction][16],scale=1.8;q.drawImage(im,n*300+30+j*90-im.originX*scale,635-im.originY*scale,im.width*scale,im.height*scale);}}
    sheets.push(['material-'+family,plate.toDataURL()]);
  }
  const hair=create(1200,600),h=hair.getContext('2d');h.fillStyle='#eadbbd';h.fillRect(0,0,1200,600);h.font='13px sans-serif';let k=0;
  for(const combo of [1,6])for(let item=0;item<18;item++){const styles=HeadPortraits.styles(Math.floor((combo-1)/5)),style=styles[item<12?item:1],c=await draw({...base,combo,headStyle:style.id,hair:style.hair,beard:style.beard,hat:item>=12?item-12:-1}),pd=ArtData.body.pd[combo],x=k%12*100,y=Math.floor(k/12)*200;h.fillStyle='#302a21';h.fillText('Figure '+combo+' '+(item<12?style.name:'Hat '+(item-12)),x+2,y+15);h.drawImage(c,pd.hx-50,0,100,150,x,y+18,100,150);c.remove();k++;}
  sheets.push(['hair-headgear-fitting',hair.toDataURL()]);
  return {sheets,unique:Object.fromEntries(Object.entries(unique).map(([key,values])=>[key,new Set(values).size]))};
 });
 expect(result.unique).toEqual({metal:5,wood:5,leather:5,cloth:5});
 if(info.project.name!=='phone-webkit')for(const[name,data]of result.sheets){const path=info.outputPath(name+'.png');await fs.writeFile(path,Buffer.from(data.split(',')[1],'base64'));await info.attach(name,{path,contentType:'image/png'});}
 await page.locator('#nav [data-t=hero]').click();await screenshot(page,info,'equipped-hero-material');expect(errors).toEqual([]);
});
