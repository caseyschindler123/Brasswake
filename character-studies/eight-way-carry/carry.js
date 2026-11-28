const gear=__SOCKETS__;
function png(encoded){
 const img=new Image();img.src='data:image/png;base64,'+encoded;return img;
}
const blade=png('__BLADE__'),sideFist=png('__FIST_E__'),frontFist=png('__FIST_S__');
const directions={S:0,SE:45,E:90,NE:135,N:180,NW:-135,W:-90,SW:-45};
// The side-run pitch follows the eight right-wrist poses in the accepted carry.
// The relaxed walk keeps the hand low as the forearm swings farther down.
const pitches={run:[-42,-81,-91,-68,-29,-16,-20,-27],walk:[5,-5,-14,-9,8,23,30,23]};
function paintActor(target,actor,gait,heading,phase,x,ground,scale){
 const [idx,mirror]=data.frames[actor+'/'+gait+'/'+heading][phase],c=data.cell;
 const [sourceX,py,visible]=gear.pins[idx][mirror?1:0],px=mirror?c-sourceX:sourceX;
 const yaw=directions[heading]*Math.PI/180,dx=Math.sin(yaw),dz=Math.cos(yaw);
 const pitch=pitches[gait][phase]*Math.PI/180;
 const outward=.26, forward=Math.cos(pitch),down=Math.sin(pitch);
 const norm=Math.hypot(1,outward);
 const u=(dx*forward-dz*outward)/norm;
 const v=(.574*(dz*forward+dx*outward)+.819*down)/norm;
 const projected=Math.hypot(u,v);
 const bodyHeight=actor==='man'?133:126;
 const lengthScale=gear.length*bodyHeight/(1.8*blade.height);
 const widthScale=lengthScale*(.72+.28*Math.abs(dx));
 // Front-facing hands emerge in front of the chest; the far hand on the west
 // and rear views rests behind the silhouette during the backward swing.
 const behind=!visible || heading==='W'||heading==='NW'||
              (heading==='SW'&&[0,4,5,6,7].includes(phase))||
              (heading==='N'&&[0,1,2,3,4].includes(phase));
 function body(){
   target.save();
   if(mirror){target.translate(c,0);target.scale(-1,1);}
   target.drawImage(atlas,idx%16*c,Math.floor(idx/16)*c,c,c,0,0,c,c);
   target.restore();
 }
 function sword(){
   target.save();
   target.transform(-v/projected*widthScale,u/projected*widthScale,-u*lengthScale,-v*lengthScale,px,py);
   target.drawImage(blade,-gear.pivot[0]*blade.width,-gear.pivot[1]*blade.height);
   target.restore();
 }
 target.save();target.translate(x,ground);target.scale(scale,scale);target.translate(-c/2,-data.ground);
 if(behind){sword();body();}else{body();sword();}
 if(visible){
   const fist=Math.abs(dx)<.6?frontFist:sideFist;
   target.save();target.translate(px,py);
   const width=(actor==='man'?8.6:7.9);
   if(dx<-.1 || (Math.abs(dx)<.1&&heading==='N'))target.scale(-1,1);
   target.rotate(.32*pitch);
   target.drawImage(fist,-width/2,-width*.53,width,width*1.06);
   target.restore();
 }
 target.restore();
}
function figure(actor,x,ground,scale){paintActor(ctx,actor,gait,heading,phase,x,ground,scale);}
