const {test,expect}=require('@playwright/test');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const {newHero,hero}=require('./offline-flow');
const {screenshot}=require('./flow');

test('offline copy survives browser shutdown and a stopped server',async({browserName},info)=>{
  test.setTimeout(240000);
  const game=path.resolve(__dirname,'../..');
  const server=spawn(process.execPath,[path.join(game,'test/server.js')],{
    cwd:game,windowsHide:true,stdio:['ignore','pipe','pipe'],
    env:{...process.env,BW_TEST_PORT:'0',BW_DIST:path.resolve(game,process.env.BW_DIST||'dist')}
  });
  const stopServer=async()=>{if(server.exitCode===null&&!server.signalCode)await new Promise(resolve=>{server.once('exit',resolve);server.kill();});};
  let context;
  try{
    const port=await new Promise((resolve,reject)=>{
      let output='';server.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/http:\/\/localhost:(\d+)/);if(m)resolve(m[1]);});
      server.once('error',reject);server.once('exit',()=>reject(new Error('Offline restart server exited before readiness')));
    });
    const url='http://localhost:'+port+'/Brasswake/',type=require('playwright')[browserName];
    const work=path.resolve(game,'../work');fs.mkdirSync(work,{recursive:true});
    /* Keep Windows browser cache filenames below the native path-length limit. */
    const directory=fs.mkdtempSync(path.join(work,'pwa-'));
    /* WebKit's persistent Windows cache has deeper paths than Chromium's. */
    const profile=process.platform==='win32'&&browserName==='webkit'?path.toNamespacedPath(directory):directory;
    const options={headless:true,viewport:info.project.use.viewport,
      isMobile:!!info.project.use.isMobile,hasTouch:!!info.project.use.hasTouch};
    context=await type.launchPersistentContext(profile,options);
    let page=context.pages()[0]||await context.newPage();await page.goto(url);
    await expect(page.locator('#artload')).toBeHidden({timeout:45000});
    await expect(page.locator('#title [data-a=offlinedownload]')).toBeEnabled({timeout:25000});
    await page.locator('#title [data-a=offlinedownload]').click();
    await expect(page.locator('#title [data-offline-title]')).toHaveText(/^(Ready for offline play|Download incomplete)$/,{timeout:120000});
    expect(await page.locator('#title [data-offline-title]').textContent(),await page.locator('#title [data-offline-note]').textContent()).toBe('Ready for offline play');
    await newHero(page);await hero(page);
    await page.locator('input[data-target=magery]').fill('57');await page.locator('[data-a=progresstarget][data-id=magery]').click();
    await page.locator('[data-a=charactersettings]').click();await page.locator('#view [data-a=savenow]').click();await page.waitForLoadState('networkidle');
    await context.close();context=null;await stopServer();
    /* The original server is gone, in addition to the browser's offline flag. */
    await expect(async()=>{await fetch(url,{signal:AbortSignal.timeout(2000)});}).rejects.toThrow();
    context=await type.launchPersistentContext(profile,{...options,offline:true});
    page=context.pages()[0]||await context.newPage();await page.goto(url);
    await expect(page.locator('#artload')).toBeHidden({timeout:45000});
    await expect(page.locator('#title [data-offline-title]')).toHaveText('Ready for offline play',{timeout:20000});
    await expect(page.locator('[data-a=playslot]')).toContainText('Plane Traveller');
    await screenshot(page,info,'offline-restarted-browser-title');
    await page.locator('[data-a=playslot]').click();await hero(page);
    await expect(page.locator('input[data-target=magery]')).toHaveValue('57');
    await page.locator('#nav [data-t=ledger]').click();const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();
    await page.locator('[data-a=lsub][data-s=sandbox]').click();await page.locator('#con-sql').fill('SELECT 91 AS restart_check');
    await page.locator('[data-a=conrun]').click();await expect(page.locator('#con-out td')).toHaveText('91');
    await screenshot(page,info,'offline-restarted-browser-query');
  }finally{if(context)await context.close();await stopServer();}
});
