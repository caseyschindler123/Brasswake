const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=name=>fs.readFileSync(path.join(root,name)),hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const manifest=JSON.parse(read('arttools/human_sprites_manifest.json'));
const {human}=vm.runInNewContext(read('game/src/arthuman.js').toString()+';ArtData;', {ArtData:{}});
const gaits=require('../src/human_gaits');

test('committed human sprites match their pinned source, encoder, metadata and file hashes',()=>{
  for(const input of manifest.inputs)assert.equal(hash(read(input.path).toString().replaceAll('\r\n','\n')),input.sha256,input.path+' requires a new bake');
  for(const file of manifest.files){const data=read('game/'+file.path);assert.equal(data.length,file.size,file.path);assert.equal(hash(data),file.sha256,file.path);}
  for(const item of [manifest.metadata,manifest.gaits])assert.equal(hash(read(item.path).toString().replaceAll('\r\n','\n')),item.sha256,item.path);
  assert.equal(manifest.files.filter(f=>f.dimensions).length,10);
  assert.ok(read('game/art/human/LICENSE.txt').toString().includes('NSF EIA-0196217'));
});

test('every body, outfit and facing has unclipped gait, idle and action coordinates with grounded metadata',()=>{
  assert.equal(human.frames,64);assert.equal(Object.keys(human.combos).length,10);
  assert.equal(human.gaits.walk.cadence,132);assert.equal(human.gaits.run.cadence,180);
  for(const state of ['walk','run']){
    assert.equal(human.gaits[state].stride,gaits[state].stride);
    assert.deepEqual(Array.from(human.gaits[state].contacts),gaits[state].contacts);
  }
  for(const [combo,body]of Object.entries(human.combos)){
    const file=manifest.files.find(f=>f.path==='art/'+body.file);assert.ok(file,combo);
    const rectangles=[];
    for(const state of ['walk','run','idle','swing','thrust','cast','hit','fall']){
      const rows=state==='idle'?[body[state]]:body[state];
      assert.equal(rows.length,state==='idle'?1:['walk','run'].includes(state)?5:3,state);
      for(const row of rows){assert.equal(row.length,state==='idle'?5:['walk','run'].includes(state)?64:4,state);
        for(const frame of row){const [x,y,w,h]=frame.r;
          assert.ok([x,y,w,h,...frame.offset,...frame.head,...frame.hands].every(Number.isFinite),combo+' '+state);
          assert.ok(w>0&&h>0&&x>0&&y>0&&x+w<file.dimensions[0]&&y+h<file.dimensions[1]);
          assert.ok(frame.offset[0]>0&&frame.offset[1]>0&&frame.offset[0]+w<human.width&&frame.offset[1]+h<human.height);
          if(state==='walk'){assert.ok(frame.supports.length>=1);assert.equal(frame.flight,false);}
          if(state==='run')assert.equal(frame.flight,frame.supports.length===0);
          rectangles.push(frame.r);
        }
      }
    }
    for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
      const [x,y,w,h]=rectangles[i],[X,Y,W,H]=rectangles[j];assert.ok(x+w<=X||X+W<=x||y+h<=Y||Y+H<=y,'overlapping atlas frames '+combo);
    }
  }
});
