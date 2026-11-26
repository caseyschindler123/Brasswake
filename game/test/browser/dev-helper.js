const {expect}=require('@playwright/test');
async function open(page){await page.goto('/__dev/game?visual_test=1');await page.waitForFunction(()=>window.Dev||document.documentElement.dataset.devError,null,{timeout:45000});expect(await page.evaluate(()=>document.documentElement.dataset.devError)).toBeUndefined();}
module.exports={open};
