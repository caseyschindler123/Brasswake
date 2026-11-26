/* Internal registration/finish proof. No runtime or original art is modified. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'work/painted-characters');
require('../game/test/browser-path');const {chromium}=require('../game/node_modules/playwright');
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1536,height:1024}});
 await page.setContent('<canvas id="guide" width="1536" height="1024"></canvas>');
 for(const f of ['game/src/human_mesh_data.js','work/painted-characters/motion-data.js','game/src/human_locomotion.js','arttools/human_costume.js','arttools/painted_profiles.js','arttools/painted_rig.js'])await page.addScriptTag({path:path.join(root,f)});
 if(process.argv.includes('--painted')){
  const png=await page.evaluate(async input=>{
   const im=new Image();im.src=input.image;await im.decode();const head=new Image();head.src=input.head;await head.decode();
   const rig=HumanLocomotion.create(PaintedProfiles.make(HumanMeshData,0,1)),c=document.querySelector('canvas'),g=c.getContext('2d');g.fillStyle='#eee7d6';g.fillRect(0,0,1536,1024);
   for(let i=0;i<8;i++){const s=document.createElement('canvas'),meta=PaintedRig.render(s,rig,im,input.rows,i>3,(i%4)/4,0,i>3?'run':'walk',4),q=s.getContext('2d');q.drawImage(head,177,40,90,112,meta.neck[0]-5.2,meta.neck[1]-7.3,10.4,12.9);
    g.drawImage(s,70*4,42*4,116*4,120*4,i%4*384+18,Math.floor(i/4)*512+20,348,360);
    g.drawImage(s,70*4,42*4,116*4,120*4,i%4*384+134,Math.floor(i/4)*512+380,116,120);
   }return c.toDataURL().split(',')[1];
  },{image:'data:image/webp;base64,'+fs.readFileSync(path.join(out,'pilot.webp')).toString('base64'),rows:JSON.parse(fs.readFileSync(path.join(out,'pilot.json'))).rows,head:'data:image/png;base64,'+fs.readFileSync('C:/Users/caseys/.codex/generated_images/01a21580-820c-74f3-9632-aac7dd04aadd/exec-a3c6822c-3330-4d95-897b-09ab943ed2de.png').toString('base64')});
  fs.writeFileSync(path.join(out,'painted-pilot.png'),Buffer.from(png,'base64'));return;
 }
 const bytes=await page.evaluate(()=>{
  const mesh=HumanCostume.make(PaintedProfiles.make(HumanMeshData,0,1),3),rig=HumanLocomotion.create(mesh),c=document.querySelector('canvas'),g=c.getContext('2d');
  g.fillStyle='#f1eadb';g.fillRect(0,0,c.width,c.height);
  const dirs=[0,7,6,5,4,3,2,1];
  for(let i=0;i<8;i++){const s=document.createElement('canvas');rig.render(s,false,0,dirs[i],{state:'idle',supersample:4});
   g.drawImage(s,0,0,256,256,(i%4)*384-64,Math.floor(i/4)*512+185,512,512);
  }return c.toDataURL().split(',')[1];
 });fs.writeFileSync(path.join(out,'muscular-leather-registration.png'),Buffer.from(bytes,'base64'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
