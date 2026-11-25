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
async function fullArrival(page,info,screenshot,{name='New Reader',origin='sunspire',rescue=true,visibleOnly=false}={}){
  const steps=async(key,n)=>{for(let i=0;i<n;i++){await page.keyboard.press(key,{delay:455});await page.waitForTimeout(200);}};
  const walkUntil=async(key,label)=>{
    // Read the visible control while stopped. Holding a key during assertion
    // polling can carry the player past a briefly reachable interaction.
    const deadline=Date.now()+8000;
    try{
      while(Date.now()<deadline){
        if(await page.locator('#ctx').evaluate((n,label)=>!n.hidden&&n.getClientRects().length>0&&n.textContent===label,label))return;
        await page.keyboard.press(key,{delay:80});
        await page.waitForTimeout(80);
      }
      await expect(page.locator('#ctx')).toBeVisible({timeout:0});
      await expect(page.locator('#ctx')).toHaveText(label,{timeout:0});
    }finally{await page.keyboard.up(key);}
  };
  await expect(page.locator('#onboard')).toContainText('Hold on');
  if(screenshot)await screenshot(page,info,'rescue-in-the-sea');
  if(rescue)await expect(page.locator('#boat-name')).toBeVisible({timeout:15000});
  await nameAboard(page,name);
  if(screenshot)await screenshot(page,info,'where-are-you-from');
  await page.locator(`[data-a=boathome][data-id=${origin}]`).click();
  await expect(page.locator('#onboard')).toContainText(name);
  await page.locator('[data-a=boatnext]').click();await expect(page.locator('#onboard')).toContainText('weeks away');
  await page.locator('[data-a=boatnext]').click();await expect(page.locator('#onboard')).toContainText('another three days');
  if(screenshot)await screenshot(page,info,'bound-for-tallyport');
  await page.locator('[data-a=boatnext]').click();
  await expect(page.locator('.movement-joystick')).toHaveAttribute('aria-disabled','false');
  await page.waitForTimeout(4000); // Let Tamsin walk clear of the rescued player.
  if(visibleOnly){await steps('ArrowDown',1);await walkUntil('ArrowRight','Talk: Tamsin');}else await shipApproach(page,'shipPerson');await expect(page.locator('#ctx')).toHaveText('Talk: Tamsin');if(info.project.use.hasTouch)await page.locator('#ctx').tap();else await page.locator('#ctx').click();
  await expect(page.locator('#onboard')).toContainText('teaches SQL');
  if(screenshot)await screenshot(page,info,'meet-tamsin-on-deck');
  await page.locator('[data-a=boatnext]').click();
  await expect(page.locator('#onboard')).toContainText('three days later');
  if(visibleOnly){await steps('ArrowRight',2);await steps('ArrowUp',1);await walkUntil('ArrowRight','Step ashore');}else await shipApproach(page,'shipExit');
  if(screenshot)await screenshot(page,info,'gangplank-arrival');
  await expect(page.locator('#ctx')).toHaveText('Step ashore');if(info.project.use.hasTouch)await page.locator('#ctx').tap();else await page.locator('#ctx').click();
  await expect(page.locator('#onboard')).toBeHidden();await expect(page.locator('#hud')).toContainText(name);
}
module.exports={nameAboard,skipArrival,shipApproach,fullArrival,returnToCharacters};
