/* Drive the actual thumb control along a prepared collision-checked fixture route. */
async function drivePath(frame, path, run = true) {
  // One clamped walking frame can travel .11 cells. Alignment is performed by
  // input, so its precision must accommodate that frame without snapping P.
  const precision = .12;
  const position = () => frame.evaluate(() => ({ at:[Scene.debug().P.fx,Scene.debug().P.fy], cell:Scene.pos() }));
  async function leg(target,dx,dy,running,tiles) {
    const from=(await position()).at;
    const base = frame.locator('.movement-joystick');
    const box = await base.boundingBox();
    if (!box) throw Error('Movement joystick is not visible');
    if (await base.getAttribute('aria-disabled') === 'true') return false;
    const page = typeof frame.page === 'function' ? frame.page() : frame;
    const mouse = page.mouse, x = box.x + box.width / 2, y = box.y + box.height / 2;
    const distance = box.width / 2 * (running ? .84 : .38);
    await base.evaluate(n=>n.addEventListener('pointerdown',e=>n.dataset.driverPointer=String(e.pointerId),{once:true}));
    await mouse.move(x, y);
    await mouse.down();
    try {
      // Stop in the rendering frame that crosses the requested coordinate.
      await frame.evaluate(({target,dx,dy,precision})=>{
        const n=document.querySelector('.movement-joystick');n.dataset.driverReached='';
        function stopAtCentre(){
          const p=Scene.debug().P;
          if(!n.hasPointerCapture(+n.dataset.driverPointer))return;
          if((dx?(p.fx-target[0])*dx>=0:Math.abs(p.fx-target[0])<=precision)&&(dy?(p.fy-target[1])*dy>=0:Math.abs(p.fy-target[1])<=precision)){
            n.dataset.driverReached='true';n.dispatchEvent(new PointerEvent('pointercancel',{pointerId:+n.dataset.driverPointer}));
          }else requestAnimationFrame(stopAtCentre);
        }requestAnimationFrame(stopAtCentre);
      },{target,dx,dy,precision});
      await mouse.move(x + dx * distance, y + dy * distance);
      const deadline = Date.now() + (tiles + 1) * (running ? 600 : 900) + 1200;
      let last = from.join(','), progressed = Date.now();
      while (Date.now() < deadline) {
        await frame.waitForTimeout(40);
        const status = await frame.evaluate(() => ({ at: [Scene.debug().P.fx,Scene.debug().P.fy], reached:document.querySelector('.movement-joystick').dataset.driverReached==='true', interrupted: !!(__bw.F || __bw.SB || __bw.Q) }));
        if (status.reached) return true;
        if (status.interrupted) return false;
        const current = status.at.join(',');
        if (current !== last) { last = current; progressed = Date.now(); }
        else if (Date.now() - progressed > 1000) return false;
      }
      return false;
    } finally { await mouse.up(); }
  }
  async function align(axis,coordinate) {
    const at=(await position()).at;
    if(Math.abs(at[axis]-coordinate)<=precision)return true;
    const target=at.slice();target[axis]=coordinate;
    return leg(target,axis===0?Math.sign(coordinate-at[0]):0,axis===1?Math.sign(coordinate-at[1]):0,false,1);
  }
  for (let i = 0; i < path.length;) {
    const from = await position(),point=path[i];
    const dx = Math.sign(point[0] - (Number.isInteger(point[0])?from.cell[0]:from.at[0]));
    const dy = Math.sign(point[1] - (Number.isInteger(point[1])?from.cell[1]:from.at[1]));
    if (!dx && !dy) {
      if(!await align(0,point[0])||!await align(1,point[1]))return;
      i++;continue;
    }
    // Tile ownership can change before the feet reach its centre. Releasing
    // for dialogue at that boundary must not carry an offset into a narrow turn.
    if((!dx&&!await align(0,point[0]))||(!dy&&!await align(1,point[1])))return;
    let end = i;
    while (end + 1 < path.length && path[end + 1][0] - path[end][0] === dx && path[end + 1][1] - path[end][1] === dy) end++;
    const target = path[end];
    const current=(await position()).at;
    if(!await leg(target,dx?Math.sign(target[0]-current[0]):0,dy?Math.sign(target[1]-current[1]):0,run,end-i+1))return;
    i = end + 1;
  }
}
module.exports = { drivePath };
