  const SERVICE_SIGNS=new Map();
  const SERVICE_SIGN_FLIPS=new WeakMap();
  function serviceSign(type,r){
    const key=type+':'+r,frame=architecturePiece(r,'upper_plain'),post=architecturePiece(r,'post_front'),beam=architecturePiece(r,'cornice');
    const fitting={shop:'counter',bank:'strongbox',tavern:'kegs',work:'hearth',healer:'bed',casino:'rtable',guild:'ltable',cartographer:'shelf',dojo:'bench',civic:'shelf'}[type]||'chest';
    const picture=worldPiece('f'+r+'_'+fitting),cached=SERVICE_SIGNS.get(key);
    if(cached&&cached.frameSource===frame&&cached.pictureSource===picture)return cached;
    if(frame&&post&&beam&&picture){
      const c=mk(56,72),g=c.getContext('2d');c.hr=1;c.frameSource=frame;c.pictureSource=picture;
      g.drawImage(post,46,0,7,51);g.drawImage(beam,6,6,47,5);g.drawImage(frame,1,18,49,49);
      const scale=Math.min(35/picture.width,33/picture.height),w=picture.width*scale,h=picture.height*scale;
      g.drawImage(picture,25.5-w/2,43-h/2,w,h);SERVICE_SIGNS.set(key,c);return c;
    }
    const c=mk(42,60);c.hr=1;const g=c.getContext('2d');
    c.frameSource=frame;c.pictureSource=picture;
    g.fillStyle='#392b20';g.fillRect(30,0,5,38);g.fillRect(4,5,30,4);
    g.fillStyle='#261d17';g.fillRect(1,15,37,42);g.fillStyle=r===8?'#ded0a7':'#a17843';g.fillRect(3,17,33,38);
    g.strokeStyle='#e2c181';g.lineWidth=1;g.strokeRect(5,19,29,34);g.strokeStyle='#241d16';ServicePlaces.paint(g,type,8,23,23);
    SERVICE_SIGNS.set(key,c);return c;
  }
  function serviceLayers(list){
    if(map!==world||!world.cartography)return;
    for(const p of world.cartography.destinations){
      if(p.kind!=='service')continue;const b=p.building,d=p.door;
      if(Math.abs((b.x+d.x)*T- cam.x-vw/2)>vw/2+60||Math.abs((b.y+d.y)*T-cam.y-vh/2)>vh/2+90)continue;
      let sign=serviceSign(p.type,p.r);
      if(d.side==='east'){
        if(!SERVICE_SIGN_FLIPS.has(sign)){
          const mirror=mk(sign.width,sign.height),g=mirror.getContext('2d');mirror.hr=1;
          g.translate(sign.width,0);g.scale(-1,1);g.drawImage(sign,0,0);SERVICE_SIGN_FLIPS.set(sign,mirror);
        }
        sign=SERVICE_SIGN_FLIPS.get(sign);
      }
      const x=(b.x+d.x)*T+(d.side==='west'?-lw(sign)-1:d.side==='east'?T+1:20),y=(b.y+d.y)*T+13;
      list.push([Math.max(y+1,b.by+1.8),sign,x,y-20]);
    }
  }
  function discoverServices(){
    if(map!==world||!P||!world.cartography||!host.discoverService)return;
    const saved=host.services?host.services():{};
    for(const p of world.cartography.destinations)if(p.kind==='service'&&!saved[p.id]&&buildingContains(p.building,P.x,P.y))host.discoverService(p.id);
  }
  function serviceMini(o,mx,my,sx,sy,ms,mw,mh){
    if(map!==world||!world.cartography)return;const saved=host.services?host.services():{};
    for(const p of world.cartography.destinations){
      if(p.kind!=='service'||!saved[p.id]||p.x<sx||p.y<sy||p.x>=sx+mw||p.y>=sy+mh)continue;
      const x=mx+(p.x-sx)*ms,y=my+(p.y-sy)*ms,size=10*dpr;
      o.fillStyle='#efe0b6';o.fillRect(x-size/2-1,y-size/2-1,size+2,size+2);o.strokeStyle='#27312c';ServicePlaces.paint(o,p.type,x-size/2,y-size/2,size);
    }
  }
