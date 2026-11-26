const {expect}=require('@playwright/test');
const {drivePath}=require('./movement');

async function nameAboard(page,name){
  // The repeatable controls below are the same choices exposed to players.
  const rescue=page.locator('[data-a=boatskiprescue]');
  if(await rescue.isVisible())await rescue.click();
  await expect(page.locator('#boat-name')).toBeVisible();
  await page.locator('#boat-name').fill(name);
  await page.locator('[data-a=boatname]').click();
}
async function skipArrival(page,name){await nameAboard(page,name);await page.locator('[data-a=skipguide]').click();}
async function returnToCharacters(page){
  await expect(page.locator('#onboard [data-a=boatmenu]')).toHaveCount(0);
  await page.getByRole('button',{name:'Character menu',exact:true}).click();
  await expect(page.locator('#sheet-body')).toContainText('Progress saves automatically');
  await page.locator('#sheet [data-a=boatmenu]').click();
  await expect(page.locator('#title')).toBeVisible();
}
async function shipApproach(page,property){
  for(let attempt=0;attempt<10;attempt++){
    const path=await page.evaluate(property=>{
      const {map:m,P}=Scene.debug(),e=m.ents.find(e=>e[property]);if(!e)throw Error('No ship target '+property);
      const start=P.y*m.w+P.x,q=[start],prev=new Map([[start,start]]);
      for(let i=0;i<q.length;i++){
        const k=q[i],x=k%m.w,y=Math.floor(k/m.w);
        if(Math.abs(x-e.x)+Math.abs(y-e.y)===1){const path=[];for(let n=k;n!==start;n=prev.get(n))path.push([n%m.w,Math.floor(n/m.w)]);return path.reverse();}
        for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy,n=Y*m.w+X;if(X<0||Y<0||X>=m.w||Y>=m.h||prev.has(n)||m.solid[n]||m.occ.has(n))continue;prev.set(n,k);q.push(n);}
      }throw Error('No safe deck route');
    },property);
    if(!path.length){await expect(page.locator('#ctx')).toBeVisible();await expect(page.locator('.movement-joystick')).toHaveAttribute('aria-disabled','false');await page.waitForTimeout(500);return;}
    await drivePath(page,path,false);await page.waitForTimeout(120);
  }throw Error('Could not approach ship target');
}
async function fullArrival(page,info,screenshot,{name='New Reader',origin='sunspire',rescue=true,visibleOnly=false,railApproachOffsetMs={}}={}){
  const holdInput=async({key,stickMove},{duration,label,leave=false})=>{
    const mouse=page.mouse;
    try{
      if(stickMove){
        const stick=page.locator('.movement-joystick'),box=await stick.boundingBox();
        if(!box)throw Error('Movement joystick is not visible');
        await expect(stick).toHaveAttribute('aria-disabled','false');
        await stick.evaluate(n=>n.addEventListener('pointerdown',e=>n.dataset.arrivalPointer=String(e.pointerId),{once:true}));
        const x=box.x+box.width/2,y=box.y+box.height/2;
        const radius=Math.min(box.width,box.height)/2;
        const distance=radius*(stickMove.run ? .84 : .54)/Math.hypot(stickMove.dx,stickMove.dy);
        await mouse.move(x,y);await mouse.down();await mouse.move(x+stickMove.dx*distance,y+stickMove.dy*distance);
        await expect(stick).toHaveAttribute('data-mode',stickMove.run?'run':'walk');
      }else await page.keyboard.down(key);
      // Duration holds provide broad clearance or run up to a solid rail.
      // Count rendered time because the game caps movement at 50 ms per frame.
      // For a target, release on the first frame with its visible control.
      return await page.evaluate(({key,joystick,duration,label,leave})=>new Promise(resolve=>{
        const deadline=performance.now()+8000;
        let last,elapsed=0;
        const tick=now=>{
          let reached;
          if(duration!=null){
            if(last!==undefined)elapsed+=Math.min(50,Math.max(0,now-last));
            last=now;reached=elapsed>=duration;
          }else{
            const n=document.querySelector('#ctx'),matches=!n.hidden&&n.getClientRects().length>0&&n.textContent===label;
            reached=matches!==leave;
          }
          if(reached||(duration==null&&now>=deadline)){
            if(joystick){const stick=document.querySelector('.movement-joystick');stick.dispatchEvent(new PointerEvent('pointercancel',{pointerId:+stick.dataset.arrivalPointer}));}
            else window.dispatchEvent(new KeyboardEvent('keyup',{key}));
            resolve(reached);return;
          }
          requestAnimationFrame(tick);
        };requestAnimationFrame(tick);
      }),{key,joystick:!!stickMove,duration,label,leave});
    }finally{if(stickMove)await mouse.up();else await page.keyboard.up(key);}
  };
  const pulse=(key,duration)=>holdInput({key},{duration});
  const offsetRailApproach=ms=>ms?pulse(ms<0?'ArrowUp':'ArrowDown',Math.abs(ms)):undefined;
  const runToEastRail=duration=>holdInput({stickMove:{dx:1,dy:0,run:true}},{duration});
  const walkUntil=async(input,label,leave=false)=>{
    if(await holdInput(input,{label,leave}))return;
    const ctx=page.locator('#ctx');
    // Zero is an unlimited assertion wait. Keep a failed contact bounded.
    await expect(ctx).toBeVisible({timeout:1});
    if(leave)await expect(ctx).not.toHaveText(label,{timeout:1});
    else await expect(ctx).toHaveText(label,{timeout:1});
  };
  await expect(page.locator('#onboard')).toContainText('Hold on');
  if(screenshot)await screenshot(page,info,'rescue-in-the-sea');
  if(rescue)await expect(page.locator('#boat-name')).toBeVisible({timeout:15000});
  await nameAboard(page,name);
  if(screenshot)await screenshot(page,info,'where-are-you-from');
  await expect(page.locator('[data-a=boathome]')).toHaveCount(1);
  await expect(page.locator('[data-a=boathome]')).toContainText('Sunspire');
  await page.locator('[data-a=boathome]').click();
  await expect(page.locator('#onboard')).toContainText(name);
  await page.locator('[data-a=boatnext]').click();await expect(page.locator('#onboard')).toContainText('weeks away');
  await page.locator('[data-a=boatnext]').click();await expect(page.locator('#onboard')).toContainText('another three days');
  if(screenshot)await screenshot(page,info,'bound-for-tallyport');
  await page.locator('[data-a=boatnext]').click();
  await expect(page.locator('.movement-joystick')).toHaveAttribute('aria-disabled','false');
  await page.waitForTimeout(4000); // Let Tamsin walk clear of the rescued player.
  // The deckhand's visible interaction boundary anchors a detour above the
  // mast. Cross the full blocked row before turning toward Tamsin.
  if(visibleOnly){
    await walkUntil({key:'ArrowDown'},'Talk: Deckhand');await walkUntil({key:'ArrowUp'},'Talk: Deckhand',true);
    await pulse('ArrowUp',1400);
    await offsetRailApproach(railApproachOffsetMs.tamsin);
    // Cross above the mast to the closed east rail, then turn southwest
    // toward Tamsin's visible Talk control from the far side of the mast.
    await runToEastRail(2400);
    await walkUntil({stickMove:{dx:-1,dy:1,run:true}},'Talk: Tamsin');
  }else await shipApproach(page,'shipPerson');await expect(page.locator('#ctx')).toHaveText('Talk: Tamsin');if(info.project.use.hasTouch)await page.locator('#ctx').tap();else await page.locator('#ctx').click();
  await expect(page.locator('#onboard')).toContainText('teaches SQL');
  if(screenshot)await screenshot(page,info,'meet-tamsin-on-deck');
  await page.locator('[data-a=boatnext]').click();
  await orientAboard(page,info,screenshot);
  await expect(page.locator('#onboard')).toContainText('three days later');
  if(visibleOnly){
    await expect(page.locator('#ctx')).toBeVisible();await expect(page.locator('#ctx')).toHaveText('Talk: Tamsin');
    // Re-anchor on the rail north of the plank. A southeast thumb hold
    // slides south at the rail, then east through the open gangplank.
    await pulse('ArrowUp',850);
    await offsetRailApproach(railApproachOffsetMs.gangplank);
    await runToEastRail(650);
    await walkUntil({stickMove:{dx:1,dy:1,run:true}},'Step ashore');
  }else await shipApproach(page,'shipExit');
  if(screenshot)await screenshot(page,info,'gangplank-arrival');
  await expect(page.locator('#ctx')).toHaveText('Step ashore');if(info.project.use.hasTouch)await page.locator('#ctx').tap();else await page.locator('#ctx').click();
  await expect(page.locator('#onboard')).toBeHidden();await expect(page.locator('#hud')).toContainText(name);
}
async function orientAboard(page,info,screenshot,reopen){
  for(const [phase,tab]of [['chart','map'],['kit','bag'],['hero','hero'],['ledger','ledger']]){
    await expect(page.locator('#onboard')).toHaveAttribute('data-phase',phase);
    await expect(page.locator('#nav [data-a=tab]')).toHaveCount(5);
    await page.locator(`#nav [data-t=${tab}]`).click();
    await expect(page.locator('#view')).toBeVisible();
    await expect(page.locator('.boat-tool-note')).toContainText('Tamsin');
    if(tab==='map'){await expect(page.locator('.boat-chart svg')).toBeVisible();await expect(page.locator('#view')).toContainText('not your explored land map');}
    if(screenshot)await screenshot(page,info,'boat-'+tab);
    await page.locator('#nav [data-t=world]').click();
    if(reopen)await reopen(phase);
    await page.locator('#onboard [data-a=boatnext]').click();
  }
}
module.exports={nameAboard,skipArrival,shipApproach,fullArrival,returnToCharacters,orientAboard};
