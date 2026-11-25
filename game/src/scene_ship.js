  /* An isolated ship scene uses the normal actors, camera and manual controls. */
  let SHIP_MAP = null;
  const SHIP_WATER = new WeakMap();
  function shipWaterFrame(im) {
    if (SHIP_WATER.has(im)) return SHIP_WATER.get(im);
    const c = mk(im.width, Math.max(1, Math.round(im.originY!=null?im.originY-16:im.height*.56)));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height, 0, 0, c.width, c.height); c.hr = im.hr;
    if(im.originY!=null){c.originX=im.originX;c.originY=c.height;c.anchor=im.anchor;c.human=1;}
    SHIP_WATER.set(im, c); return c;
  }
  function genShip(owner, phase, pos) {
    const w = Prologue.width, h = Prologue.height, n = w * h, r = 1;
    const m = { r, w, h, ship: { owner, phase, time: 0, rescued: false }, dungeon: true, t: new Uint8Array(n).fill(4), b: new Uint8Array(n).fill(1), reg: new Uint8Array(n).fill(1), solid: new Uint8Array(n).fill(1), o: new Uint8Array(n), keep: new Uint8Array(n), blds: [], props: [], ents: [], lights: [], pal: [], occ: new Map(), chunks: new Map(), terr: [] };
    m.pal[1] = Object.assign({}, BIO[1], { amb: 0, fx: null, liquid: 'water' });
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Prologue.deck(x, y, phase === 'arrival')) { m.solid[y * w + x] = 0; m.t[y * w + x] = 6; }
    for(const y of [10,18,25])m.t[y*w+9]=6;
    const settled = ['walk', 'decktalk', 'arrival'].includes(phase);
    addEnt(m, { kind: 'folk', shipPerson: 'tamsin', name: 'Tamsin', sub: 'Deckhand, the Marigold', x: settled ? (pos&&pos[0]===10&&pos[1]===18?11:10) : 6, y: 18, r, pt: AD && AD.faces.fisher });
    addEnt(m, { kind: 'folk', shipPerson: 'captain', name: 'Bram Tull', sub: 'Captain of the Marigold', x: 10, y: 28, r, pt: AD && AD.story.captain });
    addEnt(m, { kind: 'folk', shipPerson: 'crew', name: 'Deckhand', sub: 'Crew of the Marigold', x: 6, y: 20, r });
    for (const [x,y,item] of [[6,14,'Bread'],[12,22,'Healing Draught'],[6,25,'Rope']]) addEnt(m, { kind: 'shipcargo', name: item, sub: 'Cargo', cargo: item, x, y, r, ok: 'pi_crates', objectScale: .7 });
    if (phase === 'arrival') addEnt(m, { kind: 'hallexit', shipExit: true, name: 'Gangplank', sub: 'Step ashore', x: 16, y: 18, r, solid: 0 });
    const mini = mk(w,h); m.mini = mini; const g = mini.getContext('2d');
    for (let y=0;y<h;y++)for(let x=0;x<w;x++){g.fillStyle=m.solid[y*w+x]?'#17657f':'#c7a774';g.fillRect(x,y,1,1);}
    m.entry = pos && Prologue.deck(...pos, phase === 'arrival') ? pos : Prologue.entry;
    return m;
  }
  function enterShip(owner, phase, pos) {
    if (map && map.ship && map.ship.owner === owner) { shipStage(phase); return; }
    SHIP_MAP = genShip(owner, phase, pos); go(SHIP_MAP, ...SHIP_MAP.entry); banner = null; shipStage(phase, true);
  }
  function shipStage(phase, initial) {
    if (!map || !map.ship) return;
    const s = map.ship, before = s.phase; s.phase = phase;
    if (phase === 'rescue') { if (initial) { P.x = 2; P.y = 18; P.fx = 2; P.fy = 18; P.dir = 's'; } }
    else if (before === 'rescue' || initial && !['walk','decktalk','arrival'].includes(phase)) { P.x = P.fx = 5; P.y = P.fy = 18; P.dir = 's'; }
    const t = map.ents.find(e => e.shipPerson === 'tamsin');
    for (const e of map.ents) if (e.npcLook) e.ff = 0;
    if (phase === 'walk' && before !== 'walk' && t) s.route = [[7,18],[8,18],[8,17],[9,17],[10,17],[10,18]];
    if(phase!=='walk')s.route=null;
    if (phase === 'arrival' && before !== 'arrival') {
      for(let x=13;x<=16;x++){map.solid[18*map.w+x]=0;map.t[18*map.w+x]=6;}
      if (!map.ents.some(e=>e.shipExit)) addEnt(map,{kind:'hallexit',shipExit:true,name:'Gangplank',sub:'Step ashore',x:16,y:18,r:1,solid:0});
      fade = 1;
    }
  }
  function shipTick(dt) {
    if (!map || !map.ship) return;
    const s = map.ship; if(!img(ShipArt.image).ok)return; s.time += dt;
    const t = map.ents.find(e => e.shipPerson === 'tamsin');
    if (s.phase === 'rescue' && !s.rescued) {
      const u = Math.min(1, s.time / 4.2), lift = Math.max(0, (u - .2) / .8), smooth = lift * lift * (3-2*lift);
      P.fx = 2 + 3 * smooth; P.fy = 18 + Math.sin(s.time*4) * .06 * (1-lift);
      if(t){t.fs=0;t.ff=2+Math.floor(s.time*4)%3;}
      if(u===1){s.rescued=true;P.x=P.fx=5;P.y=P.fy=18;if(host.shipRescued)host.shipRescued(s.owner);}
    }
    if (t && s.route && s.route.length) {
      const [x,y]=s.route[0],dx=x-t.fx,dy=y-t.fy,d=Math.hypot(dx,dy),distance=1.7*WALK_SCALE*dt;
      if(x===P.x && y===P.y)return;
      t.tx=x;t.ty=y;advanceGait(t,Math.min(d,distance),false);t.walk=(t.walk||0)+dt*7*WALK_SCALE;
      if(d<=distance){sit(map,t,x,y);t.fx=x;t.fy=y;t.tx=null;s.route.shift();}
      else{t.fx+=dx/d*distance;t.fy+=dy/d*distance;}
    }
  }
  function shipBackdrop(g,ox0,oy0,now) {
    g.fillStyle='#176482';g.fillRect(0,0,vw,vh);
    g.fillStyle='rgba(116,191,199,.15)';
    for(let row=0;row<45;row++){const y=row*13-oy0%13,x=Math.sin(row*2+now/1900)*15;g.fillRect(x, y, vw, 2);}
    if(map.ship.phase==='arrival'){
      g.fillStyle='#5f4932';g.fillRect(15*T-ox0,0,3*T,vh);g.fillStyle='#a88b5d';g.fillRect(15*T+2-ox0,0,3*T-3,vh);
      g.strokeStyle='#6e5338';g.lineWidth=1;for(let y=0;y<map.h*T;y+=8){g.beginPath();g.moveTo(15*T-ox0,y-oy0);g.lineTo(18*T-ox0,y-oy0);g.stroke();}
    }
    const source = img(ShipArt.image);
    if(source.ok)g.drawImage(source.im,4*T-ox0,2*T-oy0,ShipArt.width/K,ShipArt.height/K);
    if(map.ship.phase==='arrival'){
      g.fillStyle='#c5a16a';g.fillRect(13*T-ox0,18*T+3-oy0,3*T,10);g.strokeStyle='#785a35';for(let x=13*T;x<16*T;x+=8)g.strokeRect(x-ox0,18*T+3-oy0,8,10);
    }
    for(const y of [10,18,25]){
      const x=9*T+8-ox0,b=y*T+15-oy0;
      g.fillStyle='#65462a';g.beginPath();g.ellipse(x,b-1,7,4,0,0,Math.PI*2);g.fill();
      g.fillStyle='#a8753c';g.fillRect(x-3,b-37,6,35);g.fillStyle='#d3a460';g.fillRect(x-2,b-37,2,35);g.strokeStyle='#6c4f2d';g.lineWidth=2;g.beginPath();g.moveTo(x-7,b-6);g.lineTo(x+7,b-6);g.stroke();
    }
  }
  function shipOverlay(g,ox0,oy0) {
    if(!map.ship || map.ship.phase!=='rescue')return;
    const t=map.ents.find(e=>e.shipPerson==='tamsin');if(!t)return;
    g.strokeStyle='#d5bd86';g.lineWidth=1.5;g.beginPath();g.moveTo(t.fx*T+3-ox0,t.fy*T+5-oy0);g.lineTo(P.fx*T+9-ox0,P.fy*T+7-oy0);g.stroke();
    if(map.ship.time<3.7){g.strokeStyle='rgba(221,246,242,.8)';g.lineWidth=1;g.beginPath();g.ellipse(P.fx*T+8-ox0,P.fy*T+14-oy0,10,3,0,0,Math.PI*2);g.stroke();}
  }
