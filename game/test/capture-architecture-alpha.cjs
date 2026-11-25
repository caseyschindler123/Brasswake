const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
require('./browser-path');const {chromium}=require('@playwright/test');
const data=vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../src/artarchitecture.js'),'utf8')+';ArchitectureArt');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1200,height:680}});await page.goto('http://localhost:8885/__health');
 for(const r of [1,3,5,8]){
  await page.setContent('<style>body{margin:0;font:14px sans-serif}main{display:grid;grid-template-columns:repeat(4,300px)}article{height:170px;position:relative;display:flex;align-items:center;justify-content:center}label{position:absolute;left:5px;top:5px;color:#777}canvas{max-width:260px;max-height:140px}</style><main></main>');
  await page.evaluate(async({r,data})=>{
   const im=new Image();im.src='/art/architecture/region-'+r+'.webp';await im.decode();
   for(const name of ['wall_door','eave_left','ridge_joint','stairs_down'])for(const colour of ['#fff','#10151d','#ce62a6','#365c33']){
    const [x,y,w,h]=data.at['architecture_'+r+'_'+name].r,c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);
    const card=document.createElement('article');card.style.background=colour;const label=document.createElement('label');label.textContent=r+' · '+name;card.append(label,c);document.querySelector('main').append(card);
   }
  },{r,data});await page.screenshot({path:path.resolve(__dirname,'../../work/world-architecture/review/alpha-region-'+r+'.png')});
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
