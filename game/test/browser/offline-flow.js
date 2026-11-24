const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const {createHash}=require('node:crypto');
const {screenshot}=require('./flow');
async function dismissCoach(page){const button=page.locator('[data-a=coachok]');if(await button.isVisible())await button.click();}
const {skipArrival}=require('./intro-helper');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function titleReady(page){await expect(page.locator('#artload')).toBeHidden({timeout:45000});await expect(page.locator('#title [data-a=offlinedownload]')).toBeEnabled({timeout:25000});}
async function hero(page){await page.locator('#nav [data-t=hero]').click();await dismissCoach(page);}
async function newHero(page){await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="4"]').click();await page.locator('[data-a=begin]').click();await skipArrival(page,'Plane Traveller');}
async function downloadFile(page){
  await page.getByRole('button',{name:'Back up save',exact:true}).click();
  const pending=page.waitForEvent('download');await page.locator('[data-a=savefile]').click();const download=await pending;
  return {name:download.suggestedFilename(),bytes:await fs.readFile(await download.path())};
}
async function offlineFlow(page,context,info,{url='/Brasswake/',live=false}={}){
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
  /* Exercise browser downloads predictably; the native share path has separate coverage. */
  await context.addInitScript(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  await page.goto(url);await titleReady(page);
  await expect(page.locator('#title .offline-card')).toContainText('MB');
  await screenshot(page,info,'offline-before-download');
  await page.locator('#title [data-a=offlinedownload]').click();
  await expect(page.locator('#title [data-offline-title]')).toHaveText('Ready for offline play',{timeout:120000});
  await expect(page.locator('#title [data-a=offlinedownload]')).toBeHidden();
  await expect(page.locator('#title [data-a=savenow]')).toBeInViewport();
  const m=await page.evaluate(async()=>await(await fetch('offline-manifest.json',{cache:'no-store'})).json());
  await screenshot(page,info,'offline-ready-title');
  await newHero(page);await hero(page);
  await page.locator('input[data-target=magery]').fill('55');await page.locator('[data-a=progresstarget][data-id=magery]').click();
  await page.locator('#view [data-a=savenow]').click();await expect(page.locator('#view [data-save-status]')).toContainText('Saved on this device');
  const backup=await downloadFile(page);expect(backup.name).toMatch(/^Brasswake-save-.+\.txt$/);
  const account=JSON.parse(Buffer.from(backup.bytes.toString().trim(),'base64').toString('utf8'));
  expect(account.worlds).toHaveLength(3);expect(account.worlds[account.world].slots[0]).toMatchObject({name:'Plane Traveller',skillTargets:{magery:55}});
  await screenshot(page,info,'offline-save-file');await page.locator('.sheet-x').click();
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);await page.close();
  const reopened=await context.newPage();reopened.on('pageerror',e=>pageErrors.push(String(e)));
  await reopened.goto(url);await expect(reopened.locator('#artload')).toBeHidden({timeout:45000});
  await expect(reopened.locator('#title [data-offline-title]')).toHaveText('Ready for offline play',{timeout:20000});
  await expect(reopened.locator('[data-a=playslot]')).toContainText('Plane Traveller');
  const assets=[m.files.find(f=>/^art\/dun\/.+\.webp$/.test(f.url)),m.files.find(f=>/^art\/mu\/m_crystal\.mp3$/.test(f.url)),m.files.find(f=>f.url==='vendor/fonts/IBMPlexMono-Regular.ttf')];
  for(const asset of assets){expect(asset).toBeTruthy();const bytes=await reopened.evaluate(async url=>[...new Uint8Array(await(await fetch(url)).arrayBuffer())],asset.url);expect(sha(Buffer.from(bytes))).toBe(asset.sha256);}
  await reopened.locator('[data-a=playslot]').click();await hero(reopened);await expect(reopened.locator('input[data-target=magery]')).toHaveValue('55');
  await reopened.locator('#nav [data-t=ledger]').click();await dismissCoach(reopened);await reopened.locator('[data-a=lsub][data-s=sandbox]').click();
  await reopened.locator('#con-sql').fill('SELECT 43 AS airplane_check');await reopened.locator('[data-a=conrun]').click();await expect(reopened.locator('#con-out td')).toHaveText('43');
  await hero(reopened);await reopened.locator('input[data-target=magery]').fill('56');await reopened.locator('[data-a=progresstarget][data-id=magery]').click();
  await reopened.locator('#view [data-a=savenow]').click();await expect(reopened.locator('#view [data-save-status]')).toContainText('Saved on this device');
  await screenshot(reopened,info,'offline-playing-and-saving');
  await reopened.locator('#view [data-a=import]').click();
  await reopened.locator('#save-file').setInputFiles({name:backup.name,mimeType:'text/plain',buffer:backup.bytes});
  await expect(reopened.locator('#save-file-status')).toContainText('Choose Load');
  await screenshot(reopened,info,'offline-load-file');
  await reopened.locator('[data-a=doimport]').click();await expect(reopened.locator('input[data-target=magery]')).toHaveValue('55');
  await reopened.waitForLoadState('networkidle');await reopened.reload();
  await expect(reopened.locator('[data-a=playslot]')).toContainText('Plane Traveller');
  if(live)expect(await reopened.evaluate(()=>typeof window.__bw)).toBe('undefined');
  expect(pageErrors).toEqual([]);await reopened.close();await context.setOffline(false);
}

module.exports={offlineFlow,hero,newHero};
