/* Authored spatial plans. Coordinates are floor-local tiles, never combat ranges.
   Main room IDs retain the meanings/encounters in dungeons.js. */
const DungeonLayouts = (() => {
  const REVISION = 2;
  const plan = (identity, points, edges, large, branches, basin = '') => ({
    identity, points: points.split(' ').map(p => p.split(',').map(Number)),
    edges: edges.split(' '), large, branches, basin
  });
  const plans = [
    [
      plan('Cargo bays and a broken hauling aisle',
        '16,92 40,89 67,91 96,81 96,55 68,55 39,58 32,30 61,27 86,27 104,48 104,18',
        'AB BC CD DE EF FG GH HI IJ JK JL', 'B:19,11,rect E:23,19,elbow H:19,15,rect J:21,11,rect', 'Fx xI Iy'),
      plan('Dry quays around a flooded cargo hold',
        '16,92 37,86 65,86 97,82 103,58 82,45 56,45 30,48 30,25 55,23 81,22 103,36 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM', 'C:27,13,rect F:27,19,elbow H:23,15,rect K:25,13,rect', 'Fx xI Iy', '54,58,26,13'),
      plan('Harbor court and clerk passages',
        '16,92 38,84 65,86 94,83 103,65 80,71 57,56 31,62 30,30 57,25 83,32 104,48 83,15 104,18',
        'AB BC CD DE DF FG GH HI IJ JK KL KM MN', 'G:37,27,rect J:25,19,rect K:23,15,oct', 'Fx xI Iy', '53,62,10,6')
    ],
    [
      plan('Lock chamber and paired bank walks',
        '16,92 32,84 35,60 58,81 81,86 80,61 102,74 102,45 80,32 57,44 54,21 80,18 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM', 'C:29,13,rect F:23,17,oct J:27,15,rect', 'Ex xJ Iy', '51,62,32,13'),
      plan('Braided banks and reed islands',
        '16,92 34,84 33,59 56,80 80,86 79,60 102,74 100,42 76,30 54,43 53,20 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL FI', 'C:25,15,oct F:27,19,lobe H:21,17,oct J:25,17,oct', 'Ex xJ Iy', '49,65,28,10'),
      plan('Root-bound reservoir and guardian island',
        '16,92 33,81 32,57 56,80 84,86 86,58 104,72 103,44 79,32 56,42 54,19 80,17 103,36 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM MN GI', 'C:25,13,oct F:29,21,lobe G:25,19,lobe J:29,21,oct', 'Ex xJ Iy', '46,61,35,13')
    ],
    [
      plan('Family tomb courts behind burial screens',
        '16,92 39,90 61,77 90,82 94,54 71,53 47,56 26,47 32,24 58,25 85,27 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL', 'B:19,15,rect E:23,21,oct H:21,17,oct J:27,19,cross', 'Fx xK Iy'),
      plan('Processional axis and unequal royal wings',
        '16,92 38,92 57,77 85,82 57,57 84,58 57,35 29,38 34,17 81,18 88,39 105,53 105,32 104,18',
        'AB BC CD CE EF EG GH GI IJ JK KL KM MN', 'C:27,15,cross G:37,17,rect I:21,19,oct K:21,19,oct', 'Fx xK Iy'),
      plan('Soldier vaults around a great burial court',
        '16,92 39,88 61,81 91,83 104,63 81,62 56,55 27,57 29,29 55,25 80,31 104,47 103,28 79,15 104,18',
        'AB BC CD DE DF FG GH GI IJ JK KL KM MN NO HJ', 'G:37,29,oct J:27,19,cross M:21,17,rect', 'Fx xK Iy')
    ],
    [
      plan('Elm-root fork and branching burrows',
        '16,92 39,85 58,72 87,83 104,63 79,61 49,47 25,54 38,24 65,28 90,41 78,15 104,18',
        'AB BC CD CF FE FG GH GI IJ JK KL KM', 'C:23,17,lobe F:27,21,lobe I:25,19,lobe K:21,17,lobe', 'Hx xK Iy', '65,66,10,8'),
      plan('Lobed brood chambers around fallen timber',
        '16,92 38,83 56,68 88,85 105,65 79,56 49,44 25,56 34,26 64,23 88,39 106,43 79,15 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM MN GI', 'C:25,15,lobe F:29,23,lobe G:27,19,lobe J:27,21,lobe', 'Hx xK Iy'),
      plan('A narrow throat opens into the wyrm hollow',
        '16,92 35,81 52,72 85,85 103,66 78,55 48,48 25,57 33,27 65,24 93,39 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL', 'C:21,13,lobe F:29,23,lobe J:35,25,lobe L:29,23,lobe', 'Hx xK Iy', '46,65,13,8')
    ],
    [
      plan('Cooling tanks beside a service aisle',
        '16,92 36,85 65,81 96,83 103,58 79,54 50,51 26,59 31,29 58,25 86,30 105,43 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM', 'C:27,13,rect F:27,19,rect J:29,19,rect', 'Fx xJ Iy', '48,63,33,13'),
      plan('A vast casting hall and worker circulation',
        '16,92 36,86 63,82 95,85 105,65 81,64 54,49 26,56 29,28 57,24 86,31 105,46 103,29 78,15 104,18',
        'AB BC CD DE DF FG GH HI IJ JK KL KM MN NO HJ', 'F:27,17,rect G:39,25,rect J:31,19,rect M:21,17,rect', 'Fx xJ Iy', '46,64,27,7'),
      plan('Offset ducts and bellows junctions',
        '16,92 31,79 59,83 91,85 105,62 84,48 57,54 29,51 28,26 56,22 86,31 105,43 81,14 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM MN', 'C:23,11,rect E:17,21,elbow G:27,19,cross J:29,19,rect', 'Fx xJ Iy'),
      plan('Great crucible and inspection apron',
        '16,92 36,84 61,82 94,84 104,61 78,51 48,51 25,57 31,28 62,24 91,37 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL FJ', 'D:25,17,rect F:31,23,rect J:33,23,oct L:29,23,oct', 'Fx xJ Iy', '57,57,10,8')
    ],
    [
      plan('Faceted survey caves and a stone fan',
        '16,92 31,78 57,84 88,85 104,63 81,47 58,61 33,50 42,24 69,25 94,42 105,39 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM', 'C:25,17,facet F:29,21,facet J:29,19,facet', 'Ex xJ Iy', '46,65,14,8'),
      plan('Offset apertures around a resonance chamber',
        '16,92 34,80 57,84 91,86 104,62 80,49 54,59 28,45 39,23 68,24 94,39 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL FI', 'C:23,15,facet F:29,23,facet J:35,25,facet', 'Ex xJ Iy'),
      plan('Unequal dry rims around mirror wells',
        '16,92 31,81 31,56 57,81 88,84 94,56 102,34 79,31 56,39 35,23 60,18 85,16 103,39 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM MN', 'C:25,13,facet F:25,17,facet J:29,19,facet', 'Ex xJ Iy', '43,60,39,15'),
      plan('Fractured heart and opaque shale approach',
        '16,92 31,79 58,85 90,85 104,69 83,62 55,49 27,53 38,25 68,23 93,38 106,49 103,28 79,14 104,18',
        'AB BC CD DE DF FG GH HI IJ JK KL KM MN NO GJ', 'G:37,27,facet J:31,23,facet M:23,19,facet O:29,23,facet', 'Ex xJ Iy', '48,63,14,7')
    ],
    [
      plan('Sled stores and a wide hauling gallery',
        '16,92 33,81 61,82 94,86 104,60 82,48 56,56 29,49 34,25 61,22 87,30 105,43 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM', 'C:29,13,oct F:25,19,oct J:27,17,oct', 'Fx xJ Iy', '46,65,21,8'),
      plan('A vast cistern between unequal rim routes',
        '16,92 30,81 30,54 57,83 88,85 98,57 104,35 82,28 58,40 34,23 60,18 85,15 105,40 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM MN', 'C:27,13,oct F:27,17,oct J:29,19,oct', 'Fx xJ Iy', '42,60,42,15'),
      plan('Exposed shelves and sheltered bends',
        '16,92 32,85 59,80 92,85 104,61 78,56 51,45 26,40 38,22 65,19 91,34 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL', 'C:29,11,elbow F:27,13,oct H:25,19,oct J:31,13,elbow', 'Fx xJ Iy', '43,63,35,12'),
      plan('Broad winter court and a covered way',
        '16,92 32,82 58,85 91,86 105,64 81,62 54,49 26,53 30,27 58,23 88,32 105,46 79,15 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM MN GJ', 'G:37,27,oct J:31,21,rect N:29,23,oct', 'Fx xJ Iy', '48,63,13,7')
    ],
    [
      plan('A reading hall with unequal public wings',
        '16,92 38,89 62,76 94,84 86,57 63,53 39,49 25,30 49,23 76,24 99,39 104,18',
        'AB BC CD CE EF EG GH GI IJ JK KL', 'C:29,17,cross G:35,23,rect J:29,19,rect', 'Hx xK Iy'),
      plan('Rack blocks, cross aisles and handling rooms',
        '16,92 35,83 60,84 93,86 104,61 79,53 53,51 27,57 30,29 56,24 85,28 104,44 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM FJ', 'C:27,15,rect F:27,19,rect G:27,19,rect J:29,21,rect', 'Hx xK Iy'),
      plan('Sequential access with a staff passage',
        '16,92 31,80 59,84 91,86 105,61 83,47 56,54 29,51 28,26 56,22 86,31 105,43 81,14 104,18',
        'AB BC CD DE EF FG GH HI IJ JK KL KM MN', 'C:23,13,rect E:19,21,elbow G:27,19,rect J:29,15,rect', 'Hx xK Iy'),
      plan('Charter hall, index wings and record custody',
        '16,92 35,86 61,78 92,85 85,60 62,58 39,51 25,33 49,24 76,24 99,42 105,62 105,28 80,13 104,18',
        'AB BC CD CE EF EG GH GI IJ JK KL KM MN NO HJ', 'C:27,15,cross G:37,25,rect J:31,21,rect M:21,19,rect O:27,21,rect', 'Hx xK Iy')
    ]
  ];
  function compile(spec) {
    const p=plans[spec.r-1][spec.f],{w,h}=spec;
    let tiles=new Uint8Array(w*h),roomIndex=new Int16Array(w*h).fill(-1);
    const route=[...spec.diagram.join('')].filter(c=>/[A-Z]/.test(c)).sort();
    if(route.length!==p.points.length)throw Error('Incomplete spatial plan '+spec.r+'/'+spec.f);
    const codes=route.concat([...'wxyzv'].filter(c=>spec.diagram.some(row=>row.includes(c))));
    const wide=Object.fromEntries(p.large.split(' ').filter(Boolean).map(s=>{const [id,data]=s.split(':');return [id,data.split(',')];}));
    const points=Object.fromEntries(route.map((id,i)=>[id,p.points[i]]));
    const fork=p.branches.split(' '),xEnds=fork.filter(e=>e.includes('x')).map(e=>[...e].find(c=>c!=='x'));
    const returnRoom=['GGG','JJJ','GHG','GGG','GGGG','HGIH','GJGH','GGGH'][spec.r-1][spec.f];
    points.w=[22,points[returnRoom][1]];points.z=[112,99];
    points.x=[Math.round((points[xEnds[0]][0]+points[xEnds[1]][0])/2),Math.round((points[xEnds[0]][1]+points[xEnds[1]][1])/2)];
    points.y=[15,60];points.v=[12,30];
    const paint=(x,y,t=1)=>{if(x>0&&y>0&&x<w-1&&y<h-1)tiles[y*w+x]=t;};
    const rooms=codes.map((id,i)=>{
      const [cx,cy]=points[id],custom=wide[id];
      const rw=custom?+custom[0]:id==='A'?17:id==='w'||id==='z'||id==='v'?11:[13,17,15][(i+spec.f)%3];
      const rh=custom?+custom[1]:id==='A'?13:id==='w'||id==='z'||id==='y'||id==='v'?9:[11,13,9][(i+spec.r)%3];
      const shape=custom?.[2]||(id==='A'||/[wzyv]/.test(id)?'rect':[2,4,6,7].includes(spec.r)?'oct':'rect');
      return {id,name:spec.names[i],cx,cy,w:rw,h:rh,x:cx-(rw>>1),y:cy-(rh>>1),shape,cells:[]};
    });
    const byId=Object.fromEntries(rooms.map(room=>[room.id,room]));
    const inside=(R,x,y)=>{
      const dx=Math.abs(x-R.cx)/(R.w/2),dy=Math.abs(y-R.cy)/(R.h/2);
      if(R.shape==='oct')return dx+dy<1.65;
      if(R.shape==='facet')return dx+dy<1.48 && !(x<R.cx-R.w*.25&&y>R.cy+R.h*.26);
      if(R.shape==='lobe')return dx*dx+dy*dy<1 || ((dx-.58)**2/.23+(dy-.22)**2/.5<1);
      if(R.shape==='cross')return dx<.48||dy<.48;
      if(R.shape==='elbow')return !(x>R.cx+R.w*.13&&y<R.cy-R.h*.12);
      return true;
    };
    if(p.basin){const [x,y,bw,bh]=p.basin.split(',').map(Number);for(let yy=y;yy<y+bh;yy++)for(let xx=x;xx<x+bw;xx++)paint(xx,yy,spec.r===5?3:2);}
    rooms.forEach((R,i)=>{for(let y=R.y;y<R.y+R.h;y++)for(let x=R.x;x<R.x+R.w;x++)if(inside(R,x,y)){paint(x,y);roomIndex[y*w+x]=i;}});
    // Neighboring footprints share masonry until an authored doorway/passage
    // cuts through it. Large halls must not silently join unrelated wings.
    const separation=[];
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const i=y*w+x,owner=roomIndex[i];
      if(owner>=0&&[i-1,i+1,i-w,i+w].some(n=>roomIndex[n]>=0&&roomIndex[n]!==owner))separation.push(i);
    }
    for(const i of separation)tiles[i]=0;
    const links=[];
    const passage=new Uint8Array(w*h);
    function routed(a,b,width,reuse=false){
      const start=a.cy*w+a.cx,goal=b.cy*w+b.cx,prev=new Int32Array(w*h).fill(-1),queue=[start];prev[start]=start;
      const inEnd=(x,y)=>[a,b].some(R=>x>=R.x&&y>=R.y&&x<R.x+R.w&&y<R.y+R.h);
      const clear=(x,y)=>{
        const radius=(width>>1)+1;
        if(x<radius+1||y<radius+1||x>=w-radius-1||y>=h-radius-1)return false;
        // A local connection must never become a map-perimeter expedition.
        if(x<Math.min(a.cx,b.cx)-12||x>Math.max(a.cx,b.cx)+12||y<Math.min(a.cy,b.cy)-12||y>Math.max(a.cy,b.cy)+12)return false;
        if(inEnd(x,y))return true;
        for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
          const xx=x+dx,yy=y+dy,i=yy*w+xx,owner=roomIndex[i];
          if(inEnd(xx,yy))continue;
          if(owner>=0&&owner!==rooms.indexOf(a)&&owner!==rooms.indexOf(b)||passage[i]&&!reuse)return false;
        }
        return true;
      };
      for(let i=0;i<queue.length&&prev[goal]<0;i++){
        const at=queue[i],x=at%w,y=Math.floor(at/w);
        const neighbors=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].sort((p,q)=>Math.abs(p[0]-b.cx)+Math.abs(p[1]-b.cy)-Math.abs(q[0]-b.cx)-Math.abs(q[1]-b.cy));
        for(const [xx,yy]of neighbors){const n=yy*w+xx;if(prev[n]<0&&clear(xx,yy)){prev[n]=at;queue.push(n);}}
      }
      if(prev[goal]<0){if(!reuse)return routed(a,b,width,true);return null;}
      const path=[];for(let at=goal;;at=prev[at]){path.push([at%w,Math.floor(at/w)]);if(at===start)break;}
      return path.reverse();
    }
    const connect=(edge,kind='main',via)=>{
      const [from,to]=edge,a=byId[from],b=byId[to];
      if(!a||!b)throw Error('Invalid authored link '+edge);
      const crossing=kind==='main'&&spec.terrain.find(t=>t.slice(0,2)===edge||t.slice(0,2)===to+from);
      const terrain=crossing?(crossing[2]==='w'?2:3):1;
      const width=kind==='return'||kind==='secret'?3:kind==='lore'?3:spec.r===5?5:spec.r===4?3:links.length%3===0?5:3;
      const direct=[[a.cx,a.cy],[b.cx,a.cy],[b.cx,b.cy]];
      const path=via?[[a.cx,a.cy],...via,[b.cx,b.cy]]:routed(a,b,width);
      // Interlocking wings can share an authored cross aisle. Their direct
      // connection is preferable to a perimeter detour around the whole floor.
      const points=path||direct,spine=[],cells=[];
      for(let i=1;i<points.length;i++){
        let [x,y]=points[i-1];const [tx,ty]=points[i],dx=Math.sign(tx-x),dy=Math.sign(ty-y);
        if(dx&&dy)throw Error('Non-cardinal authored passage '+edge);
        while(true){
          if(!spine.length||spine.at(-1)[0]!==x||spine.at(-1)[1]!==y)spine.push([x,y]);
          for(let oy=-(width>>1);oy<=width>>1;oy++)for(let ox=-(width>>1);ox<=width>>1;ox++){
            const at=(y+oy)*w+x+ox;paint(x+ox,y+oy,tiles[at]===2||tiles[at]===3?4:tiles[at]||1);passage[at]=1;
          }
          if(x===tx&&y===ty)break;x+=dx;y+=dy;
        }
      }
      let middle=kind==='secret'?spine.findIndex(([x,y])=>x===112&&y===93):Math.floor(spine.length/2);
      if(edge==='Aw')middle=spine.findIndex(([x,y])=>x===7&&y===byId.A.cy-9);
      if(crossing){
        const straight=spine.map((_,i)=>i).filter(i=>i>=3&&i<spine.length-3).filter(i=>{
          const part=spine.slice(i-3,i+4);return part.every(p=>p[0]===part[0][0])||part.every(p=>p[1]===part[0][1]);
        }).sort((a,b)=>Math.abs(a-middle)-Math.abs(b-middle)||a-b);
        middle=straight[0]??middle;
      }
      const [mx,my]=spine[middle],before=spine[Math.max(0,middle-1)],after=spine[Math.min(spine.length-1,middle+1)],vertical=before[1]!==after[1];
      for(let n=-(width>>1);n<=width>>1;n++)cells.push(vertical?[mx+n,my]:[mx,my+n]);
      if(crossing){
        for(const [x,y]of spine.slice(Math.max(1,middle-2),middle+3))for(let n=-(width>>1);n<=width>>1;n++){
          paint(x+(vertical?n:0),y+(vertical?0:n),Math.abs(n)<(width===5?2:1)?4:terrain);
        }
      }
      links.push({from,to,width,spine,cells,point:[mx,my],routing:via?'authored':path?'local':'cross-aisle',optional:kind!=='main',kind,terrain});
    };
    p.edges.forEach(e=>connect(e));
    fork.forEach(e=>connect(e,e.includes('y')?'lore':'bypass'));
    if(byId.v)connect('yv','lore');
    connect('Aw','return',[[7,byId.A.cy],[7,byId.w.cy]]);
    connect('w'+returnRoom,'return',[[byId[returnRoom].cx,byId.w.cy]]);
    const cacheParent=route.filter(c=>points[c][0]>70&&points[c][1]<88).sort((a,b)=>Math.abs(points[a][0]-112)+Math.abs(points[a][1]-91)-Math.abs(points[b][0]-112)-Math.abs(points[b][1]-91))[0];
    connect(cacheParent+'z','secret',[[112,byId[cacheParent].cy],[112,93]]);
    const cover=[],spines=new Set(links.flatMap(l=>l.spine.map(([x,y])=>y*w+x)));
    for(const R of rooms){
      if(R.w<23||R.h<17)continue;
      const patches=spec.r===8?[[-7,-6,3,5],[5,3,3,4],[-7,3,4,3],[4,-6,4,4]]:[[-7,-6,4,4],[5,3,4,3],[-7,3,4,3],[4,-6,4,4]];
      for(const [dx,dy,cw,ch]of patches){
        if(cover.filter(c=>c.room===R.id).length>=2)break;
        const patch={x:R.cx+dx,y:R.cy+dy,w:cw,h:ch,room:R.id};
        const cells=Array.from({length:ch},(_,y)=>Array.from({length:cw},(_,x)=>(patch.y+y)*w+patch.x+x)).flat();
        if(cells.some(i=>tiles[i]!==1||spines.has(i)))continue;
        cover.push(patch);
        for(let y=patch.y;y<patch.y+ch;y++)for(let x=patch.x;x<patch.x+cw;x++)if(tiles[y*w+x]===1)paint(x,y,0);
      }
    }
    // Authored plans have independent compass orientations. Reflect every
    // physical address together, before choosing the supported north ascent.
    const flipX=(spec.r+spec.f)%3===0,flipY=spec.f%2===1;
    const transform=([x,y])=>[flipX?w-1-x:x,flipY?h-1-y:y];
    if(flipX||flipY){
      const next=new Uint8Array(tiles.length),indices=new Int16Array(tiles.length).fill(-1);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const [tx,ty]=transform([x,y]);next[ty*w+tx]=tiles[y*w+x];indices[ty*w+tx]=roomIndex[y*w+x];}
      tiles=next;roomIndex=indices;
      for(const R of rooms){[R.cx,R.cy]=transform([R.cx,R.cy]);[R.x,R.y]=transform([flipX?R.x+R.w-1:R.x,flipY?R.y+R.h-1:R.y]);}
      for(const l of links){l.spine=l.spine.map(transform);l.cells=l.cells.map(transform);l.point=transform(l.point);}
      for(const C of cover)[C.x,C.y]=transform([flipX?C.x+C.w-1:C.x,flipY?C.y+C.h-1:C.y]);
    }
    for(const l of links)if(l.terrain!==1&&!l.cells.some(([x,y])=>tiles[y*w+x]===l.terrain))l.terrain=1;
    // These are physical supporting walls, using approved masonry art. Keep a
    // full dry arrival in the starter room and reserve all ascent support.
    const first=byId.A,up={x:first.cx,y:first.y-1,side:'north',support:{x:first.cx-1,y:first.y-3,w:3,h:3}};
    for(let y=up.support.y;y<up.support.y+3;y++)for(let x=up.x-1;x<=up.x+1;x++)paint(x,y,0);
    for(let y=up.y+1;y<=up.y+2;y++)for(let x=up.x-1;x<=up.x+1;x++)paint(x,y);
    // Intersecting irregular footprints can leave a one-cell floor sliver
    // behind a partition. It is solid masonry, never an unreachable island.
    const reached=new Uint8Array(tiles.length),queue=[byId.A.cy*w+byId.A.cx];reached[queue[0]]=1;
    for(let i=0;i<queue.length;i++)for(const n of [queue[i]-1,queue[i]+1,queue[i]-w,queue[i]+w])if(!reached[n]&&(tiles[n]===1||tiles[n]===4)){reached[n]=1;queue.push(n);}
    for(let i=0;i<tiles.length;i++)if((tiles[i]===1||tiles[i]===4)&&!reached[i]){tiles[i]=0;roomIndex[i]=-1;}
    for(let i=0;i<tiles.length;i++)if(roomIndex[i]>=0&&(tiles[i]===1||tiles[i]===4))rooms[roomIndex[i]].cells.push(i);
    return {tiles,rooms,byId,route,routeLinks:p.edges,links,up,landingAdded:[],cover,roomIndex,controlRoom:returnRoom,secretReveal:transform([112,91]),identity:p.identity,revision:REVISION,opaque:Uint8Array.from(tiles,t=>+(t===0))};
  }
  return { REVISION, get: (r, f) => plans[r - 1]?.[f], compile };
})();
if (typeof module !== 'undefined') module.exports = DungeonLayouts;
