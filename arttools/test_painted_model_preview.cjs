/* Local preview browser checks; no player save or published game is touched. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('../game/test/browser-path');const{chromium,webkit}=require('../game/node_modules/playwright');
const out=path.resolve(__dirname,'../work/painted-characters/model-pilot');
(async()=>{
 for(const[name,engine,width,height]of[['phone-chromium',chromium,390,720],['desktop-chromium',chromium,1280,800],['phone-webkit',webkit,390,720]]){
  const browser=await engine.launch({headless:true});try{
   const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file:///'+path.join(out,'preview-check-v3.html').replaceAll('\\','/'));
   const frame=page.frameLocator('iframe'),root=frame.locator('#brasswake-fitted-pilot-v3');
   await frame.locator('#brasswake-fitted-pilot-v3[data-ready="true"]').waitFor();
   assert.equal(await root.getAttribute('data-frames'),'24','full motion sampling in the preview');
   assert.equal(await root.locator('[data-inspect]').evaluate(canvas=>{const pixels=canvas.getContext('2d').getImageData(0,0,256,128).data;const counts=[0,0];for(let y=0;y<128;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]>128)counts[x<128?0:1]++;return counts.every(n=>n>500);}),true,'both character sprites actually rendered');
   await root.locator('[data-body]').evaluate(image=>image.decode());
   assert.equal(await root.locator('[data-world]').evaluate(async canvas=>{const before=canvas.toDataURL();await new Promise(resolve=>setTimeout(resolve,180));return before!==canvas.toDataURL();}),true,'actual frames advance');
   await root.locator('[data-play]').click();
   assert.equal(await root.locator('[data-play]').textContent(),'Play');
   assert.equal(await root.locator('[data-world]').evaluate(async canvas=>{const before=canvas.toDataURL();await new Promise(resolve=>setTimeout(resolve,120));return before===canvas.toDataURL();}),true,'pause freezes the rendered frame');
   const before=await root.locator('[data-world]').evaluate(c=>c.toDataURL());
   await root.locator('[data-motion]').selectOption('run');
   assert.match(await root.locator('[data-cadence]').textContent(),/171/);
   const after=await root.locator('[data-world]').evaluate(c=>c.toDataURL());assert.notEqual(before,after);
   await root.locator('[data-direction]').selectOption('7');
   const diagonal=await root.locator('[data-world]').evaluate(c=>c.toDataURL());assert.notEqual(diagonal,after);
   assert.equal(await root.locator('[data-error]').isVisible(),false);
   const overflow=await root.evaluate(r=>r.scrollWidth>r.clientWidth+1);assert.equal(overflow,false);
   await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});
   await root.locator('[data-motion]').selectOption('walk');await root.locator('[data-direction]').selectOption('0');
   assert.equal(await root.locator('[data-direction]').inputValue(),'0');
   await root.locator('[data-direction]').selectOption('6');await page.screenshot({path:path.join(out,name+'-walk.png'),fullPage:true});
   assert.deepEqual(errors,[]);console.log(name+': loaded, animated controls, direction, no overflow or runtime errors; capture saved');
  }finally{await browser.close();}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
