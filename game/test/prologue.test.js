const {test}=require('node:test');
const assert=require('node:assert/strict');
const P=require('../src/prologue');
test('legacy saves opt out, checkpoints normalize, and malformed imports cannot skip identity',()=>{
  assert.equal(P.normalize(null),null);assert.equal(P.normalize({v:2}),null);
  assert.equal(P.normalize({v:1,phase:'walk'}).phase,'name');
  assert.equal(P.normalize({v:1,phase:'arrival',named:true,origin:'sunspire',pos:[99,99]}).pos.join(','),'5,18');
  assert.equal(P.cleanName('  New\u0000 Reader  '),'New Reader');
});
test('fixed new homeland, legacy origins and actual movement gate the rescue-to-land route',()=>{
  assert.equal(P.home(P.fresh()),'Sunspire');
  for(const origin of P.origins){
    let p=P.normalize({...P.fresh(),origin:origin.id});assert.equal(P.advance(p,'land').phase,'rescue');
    p=P.advance(p,'rescued');assert.equal(P.advance(p,'named',' ').phase,'name');
    p=P.advance(p,'named','Reader');assert.equal(P.advance(p,'home','invalid').phase,'home');
    p=P.advance(p,'home',origin.id);p=P.advance(p,'continue');p=P.advance(p,'remember');p=P.advance(p,'continue');
    assert.equal(p.phase,'walk');assert.equal(P.advance(p,'spoke').phase,'walk');
    for(const pos of [[5,19],[5,20],[5,21]])p=P.moved(p,pos);
    assert.equal(p.steps,3);assert.deepEqual(P.moved(p,[0,0]),p);
    p=P.advance(p,'spoke');p=P.advance(p,'rest');
    for(const phase of ['chart','kit','hero','ledger']){assert.equal(p.phase,phase);assert.equal(P.toolsAvailable(p),true);assert.equal(P.advance(p,'continue').phase,phase);p=P.viewed(p,P.toolFor[phase]);p=P.normalize(p);p=P.advance(p,'continue');}
    p=P.moved(p,[16,18]);p=P.advance(p,'land');
    assert.equal(P.active(p),false);assert.equal(P.home(p),origin.name);assert.equal(P.normalize(p).phase,'done');
  }
});
test('every walkable deck cell and the arrival gangplank are connected around the mast bases',()=>{
  for(const arrival of [false,true]){
    const seen=new Set(['5,18']),q=[[5,18]];
    for(let i=0;i<q.length;i++)for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=q[i][0]+dx,y=q[i][1]+dy,k=x+','+y;if(P.deck(x,y,arrival)&&!seen.has(k)){seen.add(k);q.push([x,y]);}}
    for(let y=0;y<P.height;y++)for(let x=0;x<P.width;x++)if(P.deck(x,y,arrival))assert.ok(seen.has(x+','+y));
    assert.equal(seen.has('16,18'),arrival);
  }
});
