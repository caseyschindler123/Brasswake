/* Review artifact from the actual game compositor, including appearance layers. */
module.exports=function motionSample(result){return `<!doctype html>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Brasswake rebuilt walk and run</title>
<style>body{background:#343b32;color:#f1ead7;font:17px system-ui;margin:20px}h1{font:28px Georgia}button{font:inherit;padding:9px;margin:4px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;max-width:1080px}article{background:#858c75;padding:10px;color:#152016;max-width:320px}canvas{display:block;width:100%;height:auto}canvas.small{width:128px;height:128px;margin:auto}small{display:block;max-width:60em}a{color:#ead49e}@media(max-width:410px){body{margin:12px}}</style>
<h1>Rebuilt walk and run</h1><p>Walk ${result.gaits.walk.cadence.toFixed(1)} steps/min · Run ${result.gaits.run.cadence.toFixed(1)} steps/min</p>
<button id="pause">Pause</button><button id="slow">Slow motion</button><section id="sample"></section>
<p><small>Painted game frames shown enlarged and at game scale. The fitted contact guide uses motion from the <a href="https://mocap.cs.cmu.edu/">CMU Graphics Lab / NSF EIA-0196217</a> and the <a href="https://www.makehumancommunity.org/about/license.html">MakeHuman CC0 core mesh</a>.</small></p>
<script>
const rows=${JSON.stringify(result.sample)},scale=${result.scale},gaits=${JSON.stringify(result.gaits)};
let paused=false,slow=false,time=0,last=performance.now();const scenes=[];
document.getElementById('pause').onclick=()=>{paused=!paused;document.getElementById('pause').textContent=paused?'Play':'Pause';};
document.getElementById('slow').onclick=()=>{slow=!slow;document.getElementById('slow').textContent=slow?'Normal speed':'Slow motion';};
for(const row of rows)for(const gait of ['walk','run']){
 const a=document.createElement('article');a.innerHTML='<b>'+({6:'Side',7:'Diagonal',0:'Front'}[row.direction])+' · '+gait+'</b>';
 const images=row[gait].map(frame=>{const image=new Image();image.src=frame.src;return {...frame,image};});
 for(const small of [false,true]){
  const c=document.createElement('canvas');c.width=small?128:320;c.height=small?128:260;if(small)c.className='small';a.append(c);
  const origin=small?[64,92]:[160,218];
  const enlarged=Math.min(2.5,...images.map(frame=>Math.min(
    152/Math.max(1,frame.x,frame.width-frame.x),
    210/Math.max(1,frame.y),
    34/Math.max(1,frame.height-frame.y)
  )));
  scenes.push({c,gait,images,direction:row.direction,scale:small?scale:enlarged,origin});
 }
 document.getElementById('sample').append(a);
}
function paint(now){
 if(!paused)time+=Math.max(0,now-last)*(slow?.3:1);last=Math.max(last,now);
 for(const s of scenes){
  const g=s.c.getContext('2d'),cycles=time*gaits[s.gait].cadence/120000,k=Math.floor(cycles*s.images.length)%s.images.length,frame=s.images[k],G=48*s.scale,angle=-s.direction*Math.PI/4,distance=cycles*gaits[s.gait].stride,dx=Math.sin(angle)*distance,dz=Math.cos(angle)*distance;
  g.fillStyle='#858c75';g.fillRect(0,0,s.c.width,s.c.height);g.strokeStyle='#6f7e63';g.lineWidth=.6;g.beginPath();
  for(let i=-32;i<=32;i++){const x=s.origin[0]+(i-dx)*G,y=s.origin[1]+(i-dz)*G;if(x>=0&&x<=s.c.width){g.moveTo(x,0);g.lineTo(x,s.c.height);}if(y>=0&&y<=s.c.height){g.moveTo(0,y);g.lineTo(s.c.width,y);}}g.stroke();
  g.fillStyle='rgba(28,34,24,.18)';g.beginPath();g.ellipse(...s.origin,16*s.scale,5*s.scale,0,0,Math.PI*2);g.fill();
  if(frame.image.complete)g.drawImage(frame.image,s.origin[0]-frame.x*s.scale,s.origin[1]-frame.y*s.scale,frame.width*s.scale,frame.height*s.scale);
 }
}
function draw(now){paint(now);requestAnimationFrame(draw);}
Promise.all(scenes.flatMap(s=>s.images).map(f=>f.image.decode())).then(()=>{last=performance.now();paint(last);requestAnimationFrame(draw);document.body.dataset.ready='true';});
</script>`;};
