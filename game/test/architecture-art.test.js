const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const data=vm.runInNewContext(fs.readFileSync(path.join(root,'game/src/artarchitecture.js'),'utf8')+';ArchitectureArt');
const receipt=JSON.parse(fs.readFileSync(path.join(root,'arttools/architecture_inputs.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'arttools/packed_manifest.json'),'utf8'));

test('all regional building and dungeon kits use bounded independent component rectangles',()=>{
  assert.equal(data.files.length,8);assert.equal(Object.keys(data.at).length,224);
  for(let r=1;r<=8;r++){
    assert.equal(Object.keys(receipt.regions[r].components).length,16);
    assert.equal(data.sources[r],receipt.regions[r].sha256);
    const file='architecture/region-'+r+'.webp',entry=manifest.find(e=>e.path==='art/'+file);
    assert.ok(entry);const [width,height]=entry.dimensions;
    const rects=Object.entries(data.at).filter(([,v])=>v.f===file);
    assert.equal(rects.length,28);
    for(const [name,{r:[x,y,w,h]}]of rects)assert.ok(x>=3&&y>=3&&w>0&&h>0&&x+w<=width&&y+h<=height,name);
    for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
      const [a,{r:[x,y,w,h]}]=rects[i],[b,{r:[xx,yy,ww,hh]}]=rects[j];
      assert.ok(x+w<=xx||xx+ww<=x||y+h<=yy||yy+hh<=y,a+' overlaps '+b);
    }
    for(const name of ['roof_surface','wall_door','ridge_joint','eave_left','eave_right','upper_plain','stairs_up','stairs_down','dungeon_face','dungeon_coping'])
      assert.ok(data.at['architecture_'+r+'_'+name]);
  }
});

test('directional eaves and roof scale are independent of building footprint',()=>{
  for(let r=1;r<=8;r++){
    const key=name=>data.at['architecture_'+r+'_'+name].r;
    assert.equal(key('roof_surface')[2],96);assert.equal(key('roof_surface')[3],96);
    for(const name of ['eave_left','eave_right']){const [, ,w,h]=key(name);assert.ok(h>w*2,name);}
    assert.deepEqual(Array.from(key('eave_left').slice(2)),Array.from(key('eave_right').slice(2)));
    for(const name of ['stairs_up','stairs_down']){const [, ,w,h]=key(name);assert.ok(w>100&&h>80);}
  }
});
