/* Offline anatomical sprite bake. Run from the repository root with the locked
 * game Playwright install. Existing packed art and coordinates are untouched. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium}=require('../game/node_modules/@playwright/test');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),check=args.includes('--check');
const python=args.find(a=>a.startsWith('--python='))?.slice(9)||'python';
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const textHash=file=>hash(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'));
const inputs=['game/src/human_mesh_data.js','game/src/human_motion_data.js','game/src/human_locomotion.js','arttools/human_costume.js'];
const source=inputs.map(n=>fs.readFileSync(path.join(root,n),'utf8')).join('\n');
const target=path.join(root,'game/art/human'),metadata=path.join(root,'game/src/arthuman.js'),gaitsFile=path.join(root,'game/src/human_gaits.js');
const manifestFile=path.join(root,'arttools/human_sprites_manifest.json');
async function main(){
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage();await page.setContent('<meta charset="utf-8">');await page.addScriptTag({content:source});
    const license=Buffer.from('Human locomotion sources\n\nMotion capture data from the CMU Graphics Lab Motion Capture Database, created with support from NSF EIA-0196217.\nhttps://mocap.cs.cmu.edu/\nhttps://mocap.cs.cmu.edu/faqs.php\nCMU permits copying, modification, redistribution and inclusion in commercial products. Do not resell the motion data directly, including converted forms.\n\nAnatomical mesh and rig weights: MakeHuman core assets, CC0-1.0. No MakeHuman program code is included.\nhttps://www.makehumancommunity.org/about/license.html\nhttps://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md\n\nBrasswake wardrobe, retargeting, foot locking and sprite renderer: repository source.\nPinned source files/hashes: arttools/human_mesh_sources.json and human_motion_sources.json.\n');
    const licensePath=path.join(target,'LICENSE.txt'),files=[{path:'art/human/LICENSE.txt',size:license.length,sha256:hash(license),dimensions:null}];
    if(check){if(!fs.existsSync(licensePath)||!fs.readFileSync(licensePath).equals(license))throw Error('Human license differs');}else{fs.mkdirSync(target,{recursive:true});fs.writeFileSync(licensePath,license);}
    await page.exposeFunction('saveHumanAtlas',(combo,data,width,height)=>{
      if(!Number.isInteger(combo)||combo<1||combo>10)throw Error('Invalid combo');
      const png=Buffer.from(data.split(',')[1],'base64'),bytes=execFileSync(python,['-I',path.join(__dirname,'human_encode.py')],{input:png,maxBuffer:20*1024*1024}),name='C'+combo+'.webp',destination=path.join(target,name);
      files.push({path:'art/human/'+name,size:bytes.length,sha256:hash(bytes),dimensions:[width,height]});
      if(check){if(!fs.existsSync(destination)||!fs.readFileSync(destination).equals(bytes))throw Error('Atlas differs: '+name);}
      else{fs.mkdirSync(target,{recursive:true});fs.writeFileSync(destination,bytes);}
    });
    await page.exposeFunction('humanProgress',message=>process.stdout.write(message+'\n'));
    const data=await page.evaluate(async()=>{
      const directions=[0,7,6,5,4],count=64,W=HumanLocomotion.width,H=HumanLocomotion.height,output={version:1,width:W,height:H,origin:HumanLocomotion.origin,frames:count,combos:{}};
      for(const [name,running]of [['walk',false],['run',true]]){const c=HumanLocomotion.setup(running);(output.gaits||={})[name]={stride:c.stride,cadence:c.cadence,contacts:[0,c.stances.r.start]};}
      const headVertices=[];
      const footVertices={L:[],R:[]};
      for(let i=0;i<HumanMeshData.vertices.length/3;i++)for(let k=0;k<4;k++)if(HumanMeshData.bones[HumanMeshData.skin[i*8+k*2]].name==='head'&&HumanMeshData.skin[i*8+k*2+1]>.8){headVertices.push(i);break;}
      for(const side of ['L','R'])for(let i=0;i<HumanMeshData.vertices.length/3;i++)for(let k=0;k<4;k++)if(HumanMeshData.bones[HumanMeshData.skin[i*8+k*2]].name==='foot'+side&&HumanMeshData.skin[i*8+k*2+1]>.98){footVertices[side].push(i);break;}
      for(let combo=1;combo<=10;combo++){
        const mesh=HumanCostume.make(HumanMeshData,combo),rig=HumanLocomotion.create(mesh),frames=[],entries={file:'human/C'+combo+'.webp'},canvas=document.createElement('canvas');
        function bake(running,phase,dir,state){
          const result=rig.render(canvas,running,phase,dir,{encode:true,state}),pixels=canvas.getContext('2d').getImageData(0,0,W,H).data;
          let left=W,right=-1,top=H,bottom=-1;
          for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(pixels[(y*W+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
          if(right<left)throw Error('Empty human frame');
          if(left===0||top===0||right===W-1||bottom===H-1)throw Error('Human frame clipped: '+[combo,state,phase,dir]);
          const crop=document.createElement('canvas');crop.width=right-left+1;crop.height=bottom-top+1;crop.getContext('2d').drawImage(canvas,left,top,crop.width,crop.height,0,0,crop.width,crop.height);
          let hx=0,headTop=128,minX=128,maxX=0;
          for(const i of headVertices){const v=result.pose.positions.slice(i*3,i*3+3),p=rig.project(v,dir);headTop=Math.min(headTop,p[1]);minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);}
          hx=(minX+maxX)/2;
          const rounded=p=>p.map(v=>Math.round(v*100)/100),hands=['l','r'].flatMap(side=>rig.project(result.pose.targets[side].wrist,dir));
          const supports=Object.values(result.pose.targets.feet).filter(f=>f.active&&f.support).map(f=>rounded(rig.project(f.support.world,dir)));
          const feet=['L','R'].map(side=>{let lowest=null;for(const i of footVertices[side]){const p=result.pose.positions.slice(i*3,i*3+3);if(!lowest||p[1]<lowest[1])lowest=p;}const point=rig.project(lowest,dir),floor=rig.project([lowest[0],0,lowest[2]],dir);return rounded([...point,floor[1],lowest[1]]);});
          const entry={r:null,offset:[left,top],head:rounded([headTop,hx,maxX-minX]),hands:rounded(hands),supports,feet,flight:!Object.values(result.pose.targets.feet).some(f=>f.active)};
          frames.push({crop,entry});return entry;
        }
        for(const [name,running]of [['walk',false],['run',true]]){
          entries[name]=[];for(const dir of directions){const row=[];for(let k=0;k<count;k++)row.push(bake(running,k/count,dir));entries[name].push(row);await new Promise(r=>setTimeout(r,0));}
        }
        entries.idle=directions.map(dir=>bake(false,0,dir,'idle'));
        for(const state of ['swing','thrust','cast','hit','fall'])entries[state]=[0,6,4].map(dir=>Array.from({length:4},(_,i)=>bake(false,i/3,dir,state)));
        const atlas=document.createElement('canvas');atlas.width=2048;let x=1,y=1,rowHeight=0;
        for(const {crop,entry}of frames){if(x+crop.width+1>atlas.width){x=1;y+=rowHeight+2;rowHeight=0;}entry.r=[x,y,crop.width,crop.height];x+=crop.width+2;rowHeight=Math.max(rowHeight,crop.height);}
        atlas.height=y+rowHeight+1;const g=atlas.getContext('2d');for(const {crop,entry}of frames)g.drawImage(crop,entry.r[0],entry.r[1]);
        await saveHumanAtlas(combo,atlas.toDataURL('image/png'),atlas.width,atlas.height);output.combos[combo]=entries;
        await humanProgress('Baked human '+combo+'/10: '+atlas.width+'×'+atlas.height);atlas.width=atlas.height=0;
      }
      return output;
    });
    const payload=Buffer.from('/* Generated by arttools/human_sprites.js. Do not edit coordinates.\nMotion: CMU Graphics Lab / NSF EIA-0196217. Mesh: MakeHuman CC0. See art/human/LICENSE.txt. */\nArtData.human = '+JSON.stringify(data)+';\n');
    const gaits=Buffer.from('/* Generated by arttools/human_sprites.js from the anatomical rig. */\nconst HumanGaits = '+JSON.stringify({frames:data.frames,...data.gaits})+';\nif(typeof module!==\'undefined\')module.exports=HumanGaits;\n');
    const manifest=Buffer.from(JSON.stringify({version:1,encoder:'Pillow 12.0.0 / lossless WebP method 6 exact',browser:browser.version(),inputTextNewlines:'LF',inputs:[...inputs,'arttools/human_encode.py','arttools/human_sprites.js'].map(n=>({path:n,sha256:textHash(path.join(root,n))})),files,metadata:{path:'game/src/arthuman.js',sha256:hash(payload)},gaits:{path:'game/src/human_gaits.js',sha256:hash(gaits)}},null,2)+'\n');
    for(const [name,bytes]of [[metadata,payload],[gaitsFile,gaits],[manifestFile,manifest]]){
      if(check){if(!fs.existsSync(name)||!fs.readFileSync(name).equals(bytes))throw Error('Generated output differs: '+name);}
      else fs.writeFileSync(name,bytes);
    }
    console.log(check?'Human atlas replay matched.':'Human atlas and coordinates generated.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
