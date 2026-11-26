const {test,expect}=require('@playwright/test');
const {observeErrors,screenshot}=require('./flow');
const {skipArrival}=require('./intro-helper');
const Worlds=require('../../src/character_worlds');
test.beforeEach(async({page})=>{await page.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));});

async function ready(page){await expect(page.locator('#artload')).toBeHidden({timeout:45000});}
async function returnCharacters(page){await page.locator('#nav [data-t=hero]').click();const coach=page.locator('[data-a=coachok]');if(await coach.isVisible())await coach.click();await page.locator('[data-a=reset]').click();}
async function chooseWorld(page,index){await page.locator(`[data-a=worldpick][data-i="${index}"]`).click();await expect(page.locator(`[data-a=worldpick][data-i="${index}"]`)).toHaveAttribute('aria-pressed','true');}

test('free creation controls change the real turning and walking preview and persist appearance',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/index.html?visual_test=1');await ready(page);
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="3"]').click();
  await page.getByRole('combobox',{name:'Body',exact:true}).selectOption('0');
  await page.getByRole('combobox',{name:'Build',exact:true}).selectOption('2');
  await page.getByRole('combobox',{name:'Skin tone',exact:true}).selectOption('4');
  await page.getByRole('combobox',{name:'Head style',exact:true}).selectOption('m-moustache');
  await page.getByRole('combobox',{name:'Hair colour',exact:true}).selectOption('2');
  await expect(page.getByRole('combobox',{name:'Facial hair',exact:true})).toHaveCount(0);
  await expect(page.locator('#cr-head-preview')).toBeVisible();
  const preview=page.locator('#cr-preview');
  await expect.poll(()=>preview.evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).some((n,i)=>i%4===3&&n>0))).toBe(true);
  const tones=[];
  for(let tone=0;tone<5;tone++){
    const before=await preview.evaluate(c=>c.toDataURL());await page.getByRole('combobox',{name:'Skin tone',exact:true}).selectOption(String(tone));
    await expect.poll(()=>preview.evaluate(c=>c.toDataURL())).not.toBe(before);
    tones.push(await preview.evaluate(c=>c.toDataURL()));
  }
  expect(new Set(tones).size).toBe(5);
  const gallery=await page.context().newPage();
  await gallery.setContent(`<html><body style="margin:0;background:#eee2c4;color:#33261b;font:16px Georgia;display:grid;grid-template-columns:repeat(2,1fr)">${tones.map((src,i)=>`<figure style="margin:8px"><img style="width:100%" src="${src}"><figcaption>Skin tone ${i+1}</figcaption></figure>`).join('')}</body></html>`);
  const tonesPath=info.outputPath('five-skin-tones.png');await gallery.screenshot({path:tonesPath,fullPage:true});await info.attach('five-skin-tones',{path:tonesPath,contentType:'image/png'});await gallery.close();
  const front=await preview.evaluate(c=>c.toDataURL());
  await page.getByRole('button',{name:'Turn right',exact:true}).click();
  await expect.poll(()=>preview.evaluate(c=>c.toDataURL())).not.toBe(front);
  await page.locator('[data-a=crwalk]').click();
  const walking=await preview.evaluate(c=>c.toDataURL());await page.waitForTimeout(160);
  expect(await preview.evaluate(c=>c.toDataURL())).not.toBe(walking);
  await page.locator('[data-a=crwalk]').click();await screenshot(page,info,'world-character-creation');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-a=begin]').click();
  expect(await page.evaluate(()=>({app:__bw.S.app,gold:__bw.S.gold}))).toMatchObject({gold:30,app:{body:0,build:2,skin:4,hair:3,hc:2,beard:3,headStyle:'m-moustache'}});
  await require('./intro-helper').returnToCharacters(page);await page.reload();await ready(page);await page.locator('[data-a=playslot]').click();
  expect(await page.evaluate(()=>__bw.S.app)).toMatchObject({body:0,build:2,skin:4,hair:3,hc:2,beard:3,headStyle:'m-moustache'});expect(errors).toEqual([]);
});

test('legacy five-slot migration and world changes keep households rewards banks and stories isolated across import and reload',async({page},info)=>{
  test.setTimeout(150000);const errors=observeErrors(page);
  const legacy={v:8,wv:3,rev:8,main:2,cur:0,slots:Array.from({length:5},(_,i)=>({v:7,wv:3,name:'Legacy '+i,path:'warrior',look:0,tut:3,gd:-1,g:'done',hp:80,bank:{gold:10+i,items:[]}})),homes:[],codex:{legacy:1},paid:{legacy:1},djp:{m1:1},cmds:{intro:2}};
  await page.addInitScript(value=>{if(!localStorage.getItem('worlds-seeded')){localStorage.setItem('brasswake.acct.v8',JSON.stringify(value));localStorage.setItem('worlds-seeded','yes');}},legacy);
  await page.goto('/index.html?visual_test=1');await ready(page);await expect(page.locator('[data-a=playslot]')).toHaveCount(5);
  await chooseWorld(page,1);await expect(page.locator('[data-a=newslot]')).toHaveCount(5);
  await page.locator('[data-a=newslot]').first().click();await page.locator('[data-a=pick][data-look="4"]').click();await page.locator('[data-a=begin]').click();await skipArrival(page,'World Two');
  await page.evaluate(()=>{__bw.A.homes.push({id:'world-two-home',store:[{id:'only-world-two'}]});__bw.A.codex.second=1;__bw.A.paid.second=1;__bw.A.djp.c2=1;__bw.A.cmds.second=2;__bw.S.bank.gold=777;Scene.ents()[0].__worldTestMarker=1;__bw.save();});
  await returnCharacters(page);await chooseWorld(page,0);
  expect(await page.evaluate(()=>Scene.ents().some(e=>e.__worldTestMarker))).toBe(false);
  expect(await page.evaluate(()=>({main:__bw.A.main,cur:__bw.A.cur,homes:__bw.A.homes,codex:__bw.A.codex,paid:__bw.A.paid,bank:__bw.A.slots[0].bank.gold}))).toEqual({main:2,cur:0,homes:[],codex:{legacy:1},paid:{legacy:1},bank:10});
  await chooseWorld(page,2);expect(await page.evaluate(()=>({main:__bw.A.main,homes:__bw.A.homes,paid:__bw.A.paid,cmds:__bw.A.cmds}))).toEqual({main:-1,homes:[],paid:{},cmds:{}});
  await screenshot(page,info,'three-independent-worlds');await chooseWorld(page,1);await page.locator('[data-a=playslot]').click();
  await page.evaluate(()=>__bw.ACT.export());const code=await page.locator('#savebox').inputValue();
  const exported=JSON.parse(Buffer.from(code,'base64').toString('utf8'));expect(exported.v).toBe(9);expect(exported.worlds[0].slots).toHaveLength(5);expect(exported.worlds[1].homes[0].store[0].id).toBe('only-world-two');
  await page.locator('.sheet-x').click();await page.evaluate(()=>__bw.ACT.import());await page.locator('#savebox').fill(code);await page.locator('[data-a=doimport]').click();
  await returnCharacters(page);await page.reload();await ready(page);
  expect(await page.evaluate(()=>({world:__bw.A.world,bank:__bw.A.slots[0].bank.gold,house:__bw.A.homes[0].id}))).toEqual({world:1,bank:777,house:'world-two-home'});
  await chooseWorld(page,0);expect(await page.evaluate(()=>__bw.A.slots.map(c=>c.name))).toEqual(Array.from({length:5},(_,i)=>'Legacy '+i));expect(errors).toEqual([]);
});

test('newer cloud saves normalize every world before selecting the active character',async({page})=>{
  const cloud=Worlds.fresh();cloud.rev=100;
  for(let i=0;i<3;i++){Worlds.select(cloud,i);cloud.cur=0;cloud.main=0;cloud.slots[0]={v:8,wv:3,name:'Cloud '+i,path:'warrior',look:0,tut:3,g:'done',gd:-1,hp:80,bank:{gold:30+i,items:[]}};cloud.codex['world'+i]=1;}
  Worlds.select(cloud,1);
  await page.addInitScript(remote=>{window.claude={use:async name=>name==='user'?{id:async()=> 'world-test'}:{doc:path=>({get:async()=>path.endsWith('/acct')?{exists:true,data:()=>({json:JSON.stringify(remote)})}:{exists:false},set:async()=>{}})}};},JSON.parse(JSON.stringify(cloud)));
  await page.goto('/index.html?visual_test=1');await ready(page);await expect(page.locator('[data-a=playslot]')).toContainText('Cloud 1');
  for(let i=0;i<3;i++){await chooseWorld(page,i);expect(await page.evaluate(()=>({name:__bw.A.slots[0].name,codex:__bw.A.codex,bank:__bw.A.slots[0].bank.gold}))).toEqual({name:'Cloud '+i,codex:{['world'+i]:1},bank:30+i});}
});

test('Commands and Fields keep a visible Return key that inserts a new line',async({page},info)=>{
  const errors=observeErrors(page);await page.goto('/__visual?scene=tallyport');
  await expect(page.locator('body')).toHaveAttribute('data-ready','tallyport',{timeout:45000});
  const frame=page.frames().find(f=>f.url().includes('visual_test=1'));
  await frame.evaluate(()=>{__bw.A.cmds=Object.fromEntries(Object.keys(Content.CMDS).map(k=>[k,2]));__bw.START.contract({id:'c103'});});
  if(await frame.locator('[data-a=qturn]').isVisible())await frame.locator('[data-a=qturn]').click();
  for(const mode of ['lcmd','lfld']){
    await frame.locator('#sql').fill('SELECT name');
    await frame.locator(`[data-fn=${mode}]`).click();
    await frame.locator('#klist').evaluate(el=>el.scrollTop=el.scrollHeight);
    const key=frame.locator('#kb.listing .last [data-fn=ret]');await expect(key).toBeVisible();
    await expect(frame.locator('#kb.listing .last [aria-label=Comma]')).toBeVisible();await expect(frame.locator('#kb.listing .last [aria-label=Star]')).toBeVisible();
    await frame.locator('#sql').evaluate(el=>el.setSelectionRange(el.value.length,el.value.length));
    await key.click();await expect(frame.locator('#sql')).toHaveValue('SELECT name\n');
    await expect(frame.locator('#kb')).toHaveClass('kb listing');
    await screenshot(page,info,'return-key-'+mode);
  }
  expect(errors).toEqual([]);
});
