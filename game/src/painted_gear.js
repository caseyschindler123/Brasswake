/* Stable equipment identities and pose attachments for the painted characters. */
const PaintedGear = (() => {
  const canonical = value => (value || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
  const assets = () => typeof ArtData !== 'undefined' && ArtData.paintedGear;
  const legacyMain = {
    swords: [0, 1, 1, 2], fencing: [14, 15, 0, 1],
    archery: [25, 26, 26, 27], magery: [9, 8, 10, 12],
  };
  const legacyNames = {
    swords: ['Iron Sword','Steel Sword','Silvered Blade','Gilded Longsword'],
    fencing: ['Iron Rapier','Steel Rapier','Silvered Rapier','Gilded Rapier'],
    archery: ['Short Bow','Long Bow','Silvered Bow','Gilded Bow'],
    magery: ['Oak Staff','Ash Staff','Silvered Staff','Gilded Staff'],
  };
  const grades = {common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 3};
  const shields = ['shield-wooden','shield-iron','shield-kite','shield-tower'];
  const oldOff = {20: shields[0], 21: shields[2], 22: shields[1], 23: 'off-orb', 24: 'off-book'};
  const aliases = {
    gildedhelm: 'head-2', gildedcirclet: 'head-5',
    helmet: 'head-2', hood: 'head-3', circlet: 'head-5',
  };
  const names = new Map();
  const byIcon = new Map();
  let searchNames = [];
  let entrySource;
  function index() {
    const source = assets()?.entries;
    if (!source || source === entrySource) return;
    entrySource = source;
    for (const [id, value] of Object.entries(source)) {
      if (!id.endsWith('-side') && !id.endsWith('-back')) names.set(canonical(value.name), id);
    }
    for (const [name, id] of Object.entries(aliases)) names.set(name, id);
    searchNames = [...names.keys()].sort((a,b) => b.length-a.length);
    for (const id of Object.keys(source).filter(id => id.startsWith('relic-'))) {
      const [group, number] = id.slice(-2).split('');
      byIcon.set('u' + ('brw'.indexOf(group) * 8 + Number(number)), id);
    }
    for (let n = 1; n <= 8; n++) byIcon.set('dz' + n, 'dojo-' + n);
  }
  function itemId(item) {
    if (!item) return null;
    index();
    if (item.slot === 'weapon' && Number.isInteger(item.v)) return 'w' + item.v;
    if (item.unique && /^u_[brw][1-8]$/.test(item.id)) return 'relic-' + item.id;
    if (byIcon.has(item.ic)) return byIcon.get(item.ic);
    const base = canonical(item.equipment?.baseName || item.name);
    if (item.slot === 'weapon' && legacyMain[item.w]) {
      const ix = legacyNames[item.w].findIndex(name => base.includes(canonical(name)));
      if (ix >= 0) return 'w' + legacyMain[item.w][ix];
    }
    if (names.has(base)) return names.get(base);
    const matchingName = searchNames.find(name => base.includes(name));
    if (matchingName) return names.get(matchingName);
    if (item.slot === 'shield' && item.off != null && oldOff[item.off]) return oldOff[item.off];
    if (item.slot === 'weapon' && legacyMain[item.w]) {
      return 'w' + legacyMain[item.w][grades[item.equipment?.baseRarity || item.rarity] ?? 0];
    }
    if (item.slot === 'shield') return shields[grades[item.equipment?.baseRarity || item.rarity] ?? 0];
    return null;
  }
  function resolve({weapon,shield,head,cloak,ring,charm,relic,hands,feet,hat,wpn,shieldIndex} = {}) {
    const held = (wpn === 24 ? 'off-book' : wpn === 23 ? 'off-orb' : wpn >= 0 ? 'w' + wpn : null) || itemId(weapon);
    const offhand = itemId(shield) || oldOff[shieldIndex] || null;
    const relicId = itemId(relic), cloakId = itemId(cloak), charmId = itemId(charm);
    return {
      weapon: held, shield: offhand, head: itemId(head) || (hat >= 0 ? 'head-' + hat : null),
      cloak: cloakId || (assets()?.entries[relicId]?.kind === 'wardrobe' ? relicId : null),
      ring: itemId(ring), charm: charmId, relic: relicId,
      hands: itemId(hands) || (charmId === 'dojo-5' ? charmId : null), feet: itemId(feet),
    };
  }
  let atlas;
  function preload() {
    if (!assets() || typeof Image === 'undefined') return Promise.resolve(false);
    if (atlas) return atlas.promise;
    const record = {image: new Image(), ready: false};
    atlas = record;
    record.promise = new Promise(done => {
      record.image.onload = () => { record.ready = true; done(true); };
      record.image.onerror = () => { atlas = null; done(false); };
    });
    record.image.src = 'art/' + assets().file;
    return record.promise;
  }
  function ready() {
    if (!atlas) preload();
    return !!atlas?.ready;
  }
  const imageCache = new Map(), iconCache = new Map();
  const rgb = color => /^#[0-9a-f]{6}$/i.test(color || '') ? color.slice(1).match(/../g).map(v => parseInt(v,16)) : null;
  function setCached(cache,key,value,limit) {
    if (cache.size >= limit) cache.delete(cache.keys().next().value);
    cache.set(key,value);
    return value;
  }
  function sample(g, id, material, cloth) {
    const sprite = assets()?.entries[id];
    if (!sprite || !ready()) return false;
    const [x,y,w,h] = sprite.rect;
    const pale = rgb(material?.palette?.light), mid = rgb(material?.palette?.mid), dark = rgb(material?.palette?.shadow);
    const dye = material?.family === 'cloth' ? rgb(cloth) : null;
    if (!mid || !dark || !pale) return {image: atlas.image, rect:[x,y,w,h], sprite};
    const key = [id,material.id,cloth].join('|');
    if (imageCache.has(key)) return imageCache.get(key);
    const image = g.canvas.ownerDocument.createElement('canvas');
    image.width = w;
    image.height = h;
    const ctx = image.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(atlas.image,x,y,w,h,0,0,w,h);
    const pixels = ctx.getImageData(0,0,w,h), data = pixels.data;
    for (let i=0; i<data.length; i+=4) {
      if (!data[i+3]) continue;
      const [r,green,b] = [data[i],data[i+1],data[i+2]];
      const warm = r-b, cool = b-r;
      const family = material.family;
      // Keep wraps, straps, strings, page stock, gemstones and bright trim clear.
      if (family === 'metal' && (warm > 31 || cool > 28) ||
          family === 'wood' && (warm < 13 || r-green < 6) ||
          family === 'bone' && (warm < 8 || green < 85) ||
          family === 'crystal' && cool < 9 ||
          family === 'leather' && (sprite.kind === 'book' && green > 148 || sprite.kind === 'head' && warm < 12) ||
          family === 'cloth' && warm > 41) continue;
      const l = r*.2126 + green*.7152 + b*.0722, weight = family === 'glass' ? .56 : .75;
      const t = Math.max(0, Math.min(1, l < 125 ? (l-22)/103 : (l-125)/108));
      const low = l < 125 ? dark : (dye || mid), high = l < 125 ? (dye || mid) : pale;
      for (let c=0; c<3; c++) data[i+c] = data[i+c]*(1-weight) + (low[c] + (high[c]-low[c])*t)*weight;
    }
    ctx.putImageData(pixels,0,0);
    return setCached(imageCache,key,{image,rect:[0,0,w,h],sprite},120);
  }
  function drawIcon(g,item,x,y,w,h) {
    const material = typeof EquipmentRules !== 'undefined' ? EquipmentRules.materialOf(item) : null;
    const part = sample(g,itemId(item),material);
    if (!part) return false;
    const sw=part.rect[2], sh=part.rect[3], s=Math.min(w/sw,h/sh);
    g.drawImage(part.image,...part.rect,x+(w-sw*s)/2,y+(h-sh*s)/2,sw*s,sh*s);
    return true;
  }
  function icon(item) {
    const id=itemId(item), key=[id,item?.equipment?.material,item?.name].join(':');
    if (!id || !ready()) return null;
    if (iconCache.has(key)) return iconCache.get(key);
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=64;
    if (!drawIcon(canvas.getContext('2d'),item,2,2,60,60)) return null;
    return setCached(iconCache,key,canvas.toDataURL(),120);
  }
  const headShape = [
    {width:1.41, y:-.22}, {width:1.59, y:-.27}, {width:1.44, y:-.22},
    {width:1.71, y:-.31}, {width:2.28, y:-1.37}, {width:1.08, y:.38},
  ];
  function appearanceGear(appearance) {
    return appearance.gear || resolve({wpn:appearance.wpn,hat:appearance.hat,shieldIndex:appearance.shield});
  }
  function withHead(g,appearance,frame,{direction=0,paper=false}={},paint) {
    const head = appearanceGear(appearance).head;
    const fit = Number(head?.slice(-1)), anchor=frame.head;
    if (!anchor || ![0,1,2,3].includes(fit)) return paint();
    const [top,x,width]=anchor, angle=frame.angle || 0;
    const side=paper||direction===0||direction===4 ? 0 : direction>4 ? .17 : -.17;
    g.save();
    g.translate(x,top);
    g.rotate(angle);
    g.beginPath();
    if (fit===0) {
      g.rect(-width*.57,width*.18,width*1.14,width*1.46);
    } else if (!paper && [3,4,5].includes(direction)) {
      g.ellipse(side*width,width*.84,width*.54,width*.60,0,0,2*Math.PI);
    } else {
      const halfWidth = fit===2 ? .54 : .49;
      g.ellipse(side*width,width*.88,width*halfWidth,width*.69,0,0,2*Math.PI);
    }
    g.clip();
    g.rotate(-angle);
    g.translate(-x,-top);
    const painted=paint();
    g.restore();
    return painted;
  }
  function drawHead(g,a,frame,direction,paper) {
    const id = a.gear.head, shape = headShape[Number(id?.slice(-1))];
    if (!shape || !frame.head) return;
    const useSide = !paper && [1,2,3,5,6,7].includes(direction);
    const view = paper || direction === 0 ? '' : direction === 4 ? '-back' : '-side';
    const material = a.headMaterial || ([3,4].includes(Number(id.slice(-1))) && a.cloth
      && typeof EquipmentRules!=='undefined' ? EquipmentRules.MATERIALS.wool : null);
    const part = sample(g,id+view,material,a.cloth);
    if (!part) return;
    const [top,x,width] = frame.head, w = width*shape.width, h=w*part.rect[3]/part.rect[2];
    const turn = frame.angle || 0, mirror = useSide && direction >= 5 ? -1 : 1;
    g.save();
    g.translate(x,top);
    g.rotate(turn);
    g.scale(mirror,1);
    g.drawImage(part.image,...part.rect,-w/2,width*shape.y,w,h);
    g.restore();
  }
  const unit = (x,y) => {const d=Math.hypot(x,y)||1;return[x/d,y/d];};
  const offset = (point,x,y) => [point[0]+x,point[1]+y];
  function socketsFor(frame,paper) {
    if (frame.sockets?.leftPalm?.p && frame.sockets?.rightPalm?.p) return frame.sockets;
    const p = frame.hands || [];
    const left = paper ? p[1] : p.slice(0,2), right = paper ? p[0] : p.slice(2,4);
    const [hy,hx,hw] = frame.head || [0,0,9];
    const socket = (point,depth=0) => ({p:point,depth});
    return {
      leftPalm:socket(left), rightPalm:socket(right), leftForearm:socket(left),
      torso:socket([hx,hy+hw*3]), collar:socket([hx,hy+hw*1.9]), waist:socket([hx,hy+hw*3.8]),
    };
  }
  const pixelsPerMetre = paper => paper ? 225 : 48;
  function foreground(socket,torso,direction) {
    if (!torso?.p || !Number.isFinite(socket?.depth) || !Number.isFinite(torso.depth)) {
      return direction<3 || direction>5;
    }
    // Undo the camera elevation so the comparison uses ground-plane depth.
    // A lower hand in front of the chest can be farther from the aerial camera.
    const ground=.7660444431, rise=.6427876097;
    const delta=(socket.depth-torso.depth)*ground+(socket.p[1]-torso.p[1])/48*rise;
    return delta>=-.065;
  }
  function drawPart(g,part,point,width,height,{angle=0,pivot=[.5,.5],glow,flip=1}={}) {
    if (!part || point?.length !== 2 || !point.every(Number.isFinite)) return;
    g.save();
    g.translate(...point);
    g.rotate(angle);
    g.scale(flip,1);
    if (glow) { g.shadowColor=glow; g.shadowBlur=height*.12; }
    g.drawImage(part.image,...part.rect,-width*pivot[0],-height*pivot[1],width,height);
    g.restore();
  }
  function bowString(g,point,width,height,pivot,angle,flip,drawHand,phase) {
    const c=Math.cos(angle),s=Math.sin(angle);
    function world(x,y) {
      const dx=(x-pivot[0])*width*flip,dy=(y-pivot[1])*height;
      return [point[0]+c*dx-s*dy,point[1]+s*dx+c*dy];
    }
    const tip=world(.87,.045), heel=world(.87,.955), center=world(.87,.5);
    const draw=drawHand?.p, extent=(phase??0)>.7 ? Math.max(0,(1-phase)*2) : .95;
    const middle=draw && draw.every(Number.isFinite) ? center.map((v,i) => v+(draw[i]-v)*extent) : center;
    g.save();
    g.beginPath();
    g.moveTo(...tip);
    g.lineTo(...middle);
    g.lineTo(...heel);
    g.strokeStyle='#b9a789';
    g.lineWidth=Math.max(.55,height*.008);
    g.stroke();
    g.restore();
  }
  function handsLayer(g,a,frame,options,sockets) {
    const {state,paper,direction,layer,phase} = options;
    const worldScale = pixelsPerMetre(paper);
    const aspect = [2,6].includes(direction) ? .47 : [1,3,5,7].includes(direction) ? .77 : 1;
    const primary = assets()?.entries[a.gear.weapon], secondary = assets()?.entries[a.gear.shield];
    const left=sockets.leftPalm, right=sockets.rightPalm;
    const twoHandAction = !paper && ['bow','crossbow','swingtwo','thrusttwo'].includes(state) &&
      primary && ['bow','crossbow','two','staff'].includes(primary.kind);
    const draw = (id,entry,off) => {
      if (!entry || !entry.length) return;
      const family=entry.kind, two=['two','staff'].includes(family);
      const stowed = off && family==='shield' && twoHandAction && sockets.torso?.p;
      const forearm=sockets.leftForearm || left;
      const reader = family==='book' && state==='book' && left?.p?.length===2 && right?.p?.length===2;
      const center = reader ? {
        p: left.p.map((n,i)=>(n+right.p[i])/2), depth: (left.depth+right.depth)/2,
      } : null;
      const anchor = stowed ? sockets.torso : family==='shield' ? forearm : center || (off || family==='bow' ? left : right);
      if (!anchor?.p || anchor.p.length!==2) return;
      const front = stowed ? [3,4,5].includes(direction) : paper || foreground(anchor,sockets.torso,direction);
      if (layer !== (front?'front':'back')) return;
      const part = sample(g,id,off ? a.shieldMaterial : a.weaponMaterial);
      if (!part) return;
      const height=entry.length*worldScale, width=height*part.rect[2]/part.rect[3];
      let angle=0, pivot=entry.pivot || [.5,.5], point=anchor.p, scaleX=1, flip=1;
      if (family==='shield') {
        scaleX=paper?1:aspect;
        if (stowed) {
          const backOffset = Math.sin(direction*Math.PI/4);
          point=offset(point,backOffset*height*.38,height*.19);
          angle=-backOffset*.12;
        } else {
          point=offset(point,0,height*(state==='block' ? -.2 : .07));
        }
      } else if (family==='orb') {
        point=offset(point,0,-height*.38);
        pivot=[.5,.62];
      } else if (family==='book') {
        point=offset(point,0,-height*(reader ? .35 : .22));
        scaleX=paper?1:Math.max(.61,aspect);
      } else if (family==='bow') {
        const aim=state==='bow' ? .14 : -.31;
        angle=direction>4 ? -aim : aim;
        flip=direction>4 ? -1 : 1;
        bowString(g,point,width,height,pivot,angle,flip,state==='bow'?right:null,phase);
      } else if (family==='crossbow') {
        const active=state==='crossbow' || state==='bow';
        const across=left.p[0]-right.p[0], vertical=left.p[1]-right.p[1], palm=right.axis;
        const support=unit(across,vertical);
        const valid=palm && Math.abs(across)>=height*.15 && support[0]*palm[0]+support[1]*palm[1]>.28;
        const aim=active ? valid ? support : unit(palm?.[0] || (direction>4?-1:1),palm?.[1] || 0) : unit(paper?-.52:.52,-1);
        angle=Math.atan2(aim[0],-aim[1]);
      } else {
        const palmAxis=right?.axis;
        const aim = two && ['swingtwo','thrusttwo'].includes(state)
          ? unit(left.p[0]-right.p[0],left.p[1]-right.p[1])
          : !paper && palmAxis && ['swing','thrust','cast'].includes(state)
          ? unit(palmAxis[0],palmAxis[1]) : family==='staff' || id==='w7' ? [.09,-1] : [(direction>4?1:-1)*.31,.95];
        angle=Math.atan2(aim[0],-aim[1]);
      }
      drawPart(g,part,point,width*scaleX,height,{angle,pivot,glow:off?null:a.glow,flip});
    };
    draw(a.gear.weapon,primary,false);
    draw(a.gear.shield,secondary,true);
  }
  function accessories(g,a,frame,{layer,direction,paper},sockets) {
    if (layer !== 'front') return;
    const skull = frame.head, width=pixelsPerMetre(paper);
    const face = paper||direction===0||direction===1||direction===7, lookRight=direction>=5;
    const seen = new Set();
    for (const id of [a.gear.ring,a.gear.charm,a.gear.relic]) {
      const entry=assets()?.entries[id], kind=entry?.kind;
      if (!entry?.length || seen.has(kind)) continue;
      seen.add(kind);
      if (kind==='ring' && (a.gear.hands || (a.combo-1)%5===4) ||
          kind==='hands' && a.gear.hands || kind==='laurel' && a.gear.head ||
          ['neck','monocle','pin'].includes(kind) && !face) continue;
      const collar=sockets.collar?.p || sockets.torso?.p, waist=sockets.waist?.p;
      const palm=sockets.leftPalm?.p, part=sample(g,id);
      if (!part) continue;
      const span=entry.length*width, h=part.rect[2]>part.rect[3] ? span*part.rect[3]/part.rect[2] : span;
      const w=h*part.rect[2]/part.rect[3];
      if (kind==='neck' && collar) drawPart(g,part,offset(collar,0,h*.16),w,h,{pivot:[.5,.15]});
      if (kind==='pin' && collar) drawPart(g,part,offset(collar,lookRight ? width*.07 : -width*.07,h*.28),w,h);
      if (kind==='waist' && waist) drawPart(g,part,waist,w,h);
      if (kind==='hip' && waist) drawPart(g,part,offset(waist,lookRight?width*.13:-width*.13,h*.36),w,h);
      if ((kind==='ring'||kind==='wrist') && palm) drawPart(g,part,offset(palm,0,kind==='ring'?h*.31:-h*.24),w,h);
      if (kind==='monocle' && skull) drawPart(g,part,[skull[1]+skull[2]*.20,skull[0]+skull[2]*.64],w,h);
      if (kind==='laurel' && skull) drawPart(g,part,[skull[1],skull[0]+skull[2]*.4],w,h);
      if (kind==='hands') {
        // The offhand and main hand are represented by separate halves of the pair.
        const r=part.rect, middle=Math.floor(r[2]/2);
        const leftPart={...part,rect:[r[0],r[1],middle,r[3]]};
        const rightPart={...part,rect:[r[0]+middle,r[1],r[2]-middle,r[3]]};
        if (palm) drawPart(g,leftPart,palm,w/2,h);
        if (sockets.rightPalm?.p) drawPart(g,rightPart,sockets.rightPalm.p,w/2,h);
      }
    }
  }
  function drawWorld(g,appearance,frame,{direction=0,state='idle',phase=0,layer='front'}={}) {
    if (!ready()) return false;
    const a = appearance.gear ? appearance : {...appearance,gear:appearanceGear(appearance)};
    const options={paper:false,direction,state,phase,layer}, sockets=socketsFor(frame,false);
    handsLayer(g,a,frame,options,sockets);
    accessories(g,a,frame,options,sockets);
    if (layer==='front') drawHead(g,a,frame,direction,false);
    return true;
  }
  function drawPaper(g,appearance,frame,{layer='front'}={}) {
    if (!ready()) return false;
    const a = appearance.gear ? appearance : {...appearance,gear:appearanceGear(appearance)};
    const options={paper:true,direction:0,state:'idle',phase:0,layer}, sockets=socketsFor(frame,true);
    handsLayer(g,a,frame,options,sockets);
    accessories(g,a,frame,options,sockets);
    if (layer==='front') drawHead(g,a,frame,0,true);
    return true;
  }
  return {resolve,itemId,preload,ready,drawWorld,drawPaper,withHead,drawIcon,icon};
})();
if (typeof module !== 'undefined') module.exports = PaintedGear;
