/* Continuous manual motion over the existing tile-owned collision and events. */
const Movement = (() => {
  const radius = .16;
  function clear(x, y, blocked, fromX, fromY) {
    return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]]
      .every(([dx,dy]) => {
        const bx=Math.round(x+dx),by=Math.round(y+dy);if(!blocked(bx,by))return true;
        // A dynamic occupant may have reserved an already overlapped cell.
        // Permit movement out of that overlap, never deeper into the blocker.
        return Number.isFinite(fromX)&&Math.abs(fromX-bx)<.5+radius&&Math.abs(fromY-by)<.5+radius
          && Math.hypot(x-bx,y-by)+1e-9>=Math.hypot(fromX-bx,fromY-by);
      });
  }
  function advance(actor, dx, dy, distance, blocked, entered = () => true) {
    const length = Math.hypot(dx,dy);
    if (!length || !(distance > 0) || !Number.isFinite(distance)) return 0;
    const steps = Math.ceil(distance/.06), sx = dx/length*distance/steps, sy = dy/length*distance/steps;
    let travelled = 0;
    for (let i=0;i<steps;i++) {
      const x=actor.fx, y=actor.fy;
      if (clear(x+sx,y+sy,blocked,x,y)) {actor.fx+=sx;actor.fy+=sy;}
      else if (sx && clear(x+sx,y,blocked,x,y)) actor.fx+=sx;
      else if (sy && clear(x,y+sy,blocked,x,y)) actor.fy+=sy;
      travelled+=Math.hypot(actor.fx-x,actor.fy-y);
      const nx=Math.round(actor.fx),ny=Math.round(actor.fy);
      if (nx!==actor.x||ny!==actor.y) {
        actor.x=nx;actor.y=ny;
        if (entered(nx,ny)===false) break;
      }
    }
    return travelled;
  }
  function stop(actor) { if(actor){actor.path=[];actor.run=false;actor.manual=false;actor.moving=false;} }
  return {advance,stop,clear,radius};
})();
if(typeof module!=='undefined')module.exports=Movement;
