require('../../game/test/browser-path');
const {chromium} = require('../../game/node_modules/playwright');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const assert = require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch();
  try {
    for (const viewport of [{width:390,height:720},{width:1040,height:760}]) {
      const page=await browser.newPage({viewport});
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname,'directions.html')).href);
      await page.waitForFunction(()=>typeof previous==='number' && phase!==0);
      await page.getByRole('button',{name:'Pause',exact:true}).click();
      const hold=await page.evaluate(()=>phase);
      for (const gait of ['walk','run']){
        await page.locator('[data-gait="'+gait+'"]').click();
        const samples=new Set();
        for(const heading of ['N','NE','E','SE','S','SW','W','NW']){
          await page.locator('[data-dir="'+heading+'"]').click();
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          assert.equal(await page.locator('[data-dir="'+heading+'"]').getAttribute('aria-pressed'),'true');
          samples.add(await page.locator('canvas').evaluate(c=>c.toDataURL()));
        }
        assert.equal(samples.size,8);
      }
      assert.equal(await page.evaluate(()=>phase),hold);
      await page.locator('[data-dir="NE"]').click();
      await page.getByRole('button',{name:'Play',exact:true}).click();
      await page.waitForFunction(v=>phase!==v,hold);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.deepEqual(errors,[]);
      await page.screenshot({path:path.join(__dirname,'review-'+viewport.width+'.png')});
      await page.close();
    }
    console.log('Verified all 16 gait/direction combinations, animated playback, pause and layout on phone-sized and desktop Chromium.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
