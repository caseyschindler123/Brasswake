/* ===== GAME: state, progression, loot, encounters, screens ===== */
(() => {
  const { CMDS, HOUSES, HMAT, PAINT, LAIRS, LAIRMON, SKILLS, REGIONS, CONTRACTS, BOUNTIES, BOSSES, RUMORS, UNIQUES, MATS, MONSTERS, WILD, DUNGEONS, RIVALS, ROLES, RECIPES, HUES, FOLK, TAVERNS, SAY, GOSSIP, CIRCLE, JOURNAL, BOOKS, PAGES, FOLKN, HAB, HUNT, TALK, FOOD, SETTLE, HOMES, ROAMERS, FIRST, STOCK, STOCKSAY, PLACES, TALES, FISH, JUNK, CASTS, FISHNEED, ERR, LOST } = Content;
  const KEY = 'brasswake.save.v4', ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => Date.now(), rnd = () => Math.random(), rid = () => Math.floor(rnd() * 2147483647) + 1;
  const pick = a => a[Math.floor(rnd() * a.length)], rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  function RNG(seed) { let a = seed >>> 0; const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; return { pick: x => x[Math.floor(f() * x.length)], int: (x, y) => x + Math.floor(f() * (y - x + 1)) }; }

  const CONCEAL = Sneaking.create();
  let WOUNDS = Backstab.memory(), AMBUSH = null;
  function resetTactics(){WOUNDS=Backstab.memory();AMBUSH=null;if(sceneUp)Scene.clearPursuits();}
  let GearScreen,deletionEpoch=0;
  let S, tab = 'world', sceneUp = false, sceneOwner = null, interiorSaveTimer = 0, sub = 'work', lsub = 'sandbox', sel = null, ready = false, engineErr = '', COLS = {}, benchSlot = 'weapon', con = { sql: '', res: null };
  // Keep the additive v8 envelope readable by older account-v9 clients.
  const fresh = () => ({ v: 8, uid:'c'+rid(), horse: {owned:false,mounted:false}, wv: WorldProgress.revision, cartography: Cartography.create(), prologue:null, interior: null, dungeon: null, dungeons: {}, deathPending: null, seen: {}, gd: -1, gn: 0, bank: { gold: 0, items: [] }, homes: [], runes: 0, tabs: {}, tw: {}, vault: {}, letter: 0, archive: 0, cache: {}, campT: 0, meat: 0, met: {}, pk: { n: 0, net: 0 }, food: {}, er: { a: {}, d: {}, n: 0 }, poi: {}, fishd: {}, fishlog: {}, cs: {}, known: {}, name: '', tut: 0, pages: {}, scr: {}, jr: {}, hints: 1, page: null, gold: 30, path: null, look: null, hp: 50, sk: {}, wsk: null, been: { 1: 1 }, skills: {}, done: {}, seen: {}, boss: {}, rum: {}, inv: [], eq: {}, codex: {}, mats: {}, tonics: 1, bandages: 4, streak: 0, best: 0, stats: { q: 0, ok: 0, kills: 0, steals: 0, dungeons: 0, falls: 0 }, region: 1, pos: null, intro: 0, mv: 0, talked: 0, rival: {}, dpity: {}, rounds: null, stall: null, won: 0, rev: 0, at: 0 });
  const migrate = o => { if (!o || ![5,6,7,8,9].includes(o.v)) return fresh(); const f = fresh(), s = Object.assign(f, o, {v:8}); if(typeof s.uid!=='string'||!s.uid)s.uid='c'+rid();if(s.app&&typeof s.app==='object'&&!Array.isArray(s.app))s.app.build=CharacterProfiles.normalize(s.app.build);equipmentTree(s);s.horse=Mounts.normalize(s.horse);if(s.dungeon||s.interior||s.prologue&&s.prologue.phase!=='done')s.horse=Mounts.dismount(s.horse);s.prologue=Prologue.normalize(s.prologue); if (!o.cartography) delete s.cartography; if (!o.seen && o.tut >= 3) s.seen = { fight: 1, fprompt: 1, bag: 1, hero: 1, map: 1, ledger: 1, shop: 1 }; if (!o.g && o.tut >= 3) s.g = 'done'; if (s.casino) { s.gold += s.casino.stack || 0; s.casino = null; } s.stats = Object.assign(fresh().stats, s.stats || {}); return Progression.normalize(s); };

  /* ---------- saving: this device first, then the player's Claude account when available ---------- */
  const Cloud = { ref: null, state: 'device', busy: false, dirty: false, timer: 0 };
  /* Three independent worlds share geography; each world has one main and four supporting characters. */
  const AKEY = 'brasswake.acct.v9', NSLOT = CharacterWorlds.slots;
  const freshA = CharacterWorlds.fresh;
  let A = null;
  const deviceSave = {ok:null, at:0};
  function saveMessage(){return deviceSave.ok===false?'Progress could not be saved. Back up your save before closing.':deviceSave.at?'Saved on this device at '+new Date(deviceSave.at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})+'.':'Progress saves automatically on this device, including offline.';}
  function drawSaveStatus(){for(const el of document.querySelectorAll('[data-save-status]')){el.textContent=saveMessage();el.classList.toggle('save-error',deviceSave.ok===false);}const warning=$('#save-warning');if(warning)warning.hidden=deviceSave.ok!==false;}
  function savePanel(){return `<section class="save-card" aria-label="Your saves"><p data-save-status role="status" class="${deviceSave.ok===false?'save-error':''}">${esc(saveMessage())}</p><div class="save-actions"><button class="btn quiet" data-a="savenow">Save now</button><button class="btn quiet" data-a="backup">Back up save</button><button class="btn quiet" data-a="import">Load save</button></div></section>`;}
  const isMain = () => !!A && A.cur >= 0 && A.cur === A.main, mainName = () => (A && A.main >= 0 && A.slots[A.main] && A.slots[A.main].name) || 'your main character';
  const linkS = s => { s.homes = A.homes; s.codex = A.codex; return s; }, slotOut = s => { const o = Object.assign({}, s); delete o.homes; delete o.codex; return o; };
  function purgeOld() { try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.indexOf('brasswake.save') === 0) localStorage.removeItem(k); } } catch (e) { } }
  function loadA() { try { const t = localStorage.getItem(AKEY) || localStorage.getItem('brasswake.acct.v8') || localStorage.getItem('brasswake.acct.v7') || localStorage.getItem('brasswake.acct.v6'); return t ? CharacterWorlds.normalize(JSON.parse(t)) : null; } catch (e) { return null; } }
  function loadCur() { resetTactics();for(const w of A.worlds){WorldProgress.migrateAccount(w);equipmentTree(w.homes);w.slots=w.slots.map(c=>c?migrate(c):null);} S = linkS(Progression.normalize(A.cur >= 0 && A.slots[A.cur] ? migrate(A.slots[A.cur]) : fresh())); Sneaking.reveal(CONCEAL); if(S.deathPending){S.region=S.deathPending.r;S.pos=S.deathPending.at;S.dungeon=null;S.interior=null;S.hp=maxHp();S.deathPending=null;} if (!(S.hp > 0)) S.hp = maxHp(); if(sceneUp){clearInterval(GSAY);Scene.guideOff();} }
  function syncA() { const draft=boatActive()&&S.prologue.phase==='name'&&$('#boat-name');if(draft&&Prologue.cleanName(draft.value))S.name=Prologue.cleanName(draft.value); if(sceneUp && sceneOwner===S && boatActive() && Scene.inShip())S.prologue=Prologue.moved(S.prologue,Scene.pos()); clearTimeout(interiorSaveTimer);interiorSaveTimer=0; if(sceneUp && sceneOwner === S)S.interior=Scene.venueState(); if(sceneUp&&sceneOwner===S&&!Scene.inDungeon()&&!Scene.inHall()&&!Scene.inInterior()&&!Scene.inShip())S.pos=Scene.pos(); CMap.snapshot(); if (A && A.cur >= 0 && S && S.path) A.slots[A.cur] = slotOut(S); if(A)for(const w of A.worlds)for(const s of w.slots)if(s){if(w.learning)s.learningSnapshot=Learning.normalize(w.learning);if(s.openLocks)s.openLocks=Object.fromEntries(Object.entries(s.openLocks).filter(([,v])=>v===dayKey()));DungeonProgress.compact(s,now());if(s.cartography)s.cartography=Cartography.normalize(s.cartography);s.interior=Interiors.normalizeProgress(s.interior);} }
  function save() { if(S?.horse&&sceneUp&&sceneOwner===S)S.horse=Mounts.enforceContext(S.horse,mountContext());if (sceneUp && DG && Scene.inDungeon()) DP.snapshot(); if (!A) A = freshA(); if (A.cur >= 0 && S && S.path) { S.rev++; S.at = now(); } syncA(); A.rev++; A.at = now(); try { localStorage.setItem(AKEY, JSON.stringify(A)); deviceSave.ok=true;deviceSave.at=A.at; } catch (e) { deviceSave.ok=false; } drawSaveStatus(); if (Cloud.ref) { Cloud.dirty = true; clearTimeout(Cloud.timer); Cloud.timer = setTimeout(flush, 2500); } return deviceSave.ok; }
  function saveCode(){save();return btoa(unescape(encodeURIComponent(JSON.stringify(A))));}
  function backupSheet(){sheet(`<h2>Back up your save</h2><p class="cap2">Progress saves automatically on this device. Keep a separate file to restore all three worlds on this or another device.</p><div class="save-backup-actions"><button class="btn solid" data-a="savefile">Save file</button><button class="btn quiet" data-a="export">Copy a save code</button></div><p class="cap2" id="backup-status" role="status">On iPhone, choose Save to Files in the share menu.</p>`);}
  async function saveFile(){
    const code=saveCode(), file=new File([code+'\n'], 'Brasswake-save-'+new Date().toISOString().replace(/[:.]/g,'-')+'.txt', {type:'text/plain'});
    const status=$('#backup-status');
    try {
      if(navigator.canShare && navigator.canShare({files:[file]})) {await navigator.share({files:[file],title:'Brasswake save'});if(status)status.textContent='Save file shared. Keep it somewhere safe.';}
      else {const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);if(status)status.textContent='Save file download started. Check your downloads.';}
    } catch(e){if(status)status.textContent=e.name==='AbortError'?'Save file cancelled. Your progress is still here.':'The file could not be saved. Copy a save code instead.';}
  }
  async function flush() {
    if (Cloud.busy) {try{await Cloud.flight;}catch(_){}return;}
    if (!Cloud.dirty || !Cloud.ref) return; Cloud.busy = true; Cloud.dirty = false;
    try { syncA(); const ref=Cloud.ref,payload={json:JSON.stringify(A),rev:A.rev,at:A.at};Cloud.flight=Promise.resolve().then(()=>ref.set(payload));await Cloud.flight;Cloud.state = 'account'; }
    catch (e) { if (e && e.code === 'unavailable') Cloud.dirty = true; else { Cloud.state = 'device'; Cloud.ref = null; } }
    Cloud.busy = false;Cloud.flight=null;if (Cloud.dirty && Cloud.ref) Cloud.timer = setTimeout(flush, 5000);
  }
  async function flushDeletion(){clearTimeout(Cloud.timer);await flush();if(Cloud.dirty&&Cloud.ref){clearTimeout(Cloud.timer);await flush();}}
  async function cloudInit() {
    const deletionAtRead=deletionEpoch;
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); if (!db || !user) return;
      const id = await user.id(); if (!id) return;
      const ref = db.doc('data/users/' + id + '/acct');
      try { const old = db.doc('data/users/' + id + '/save'), o = await old.get(); if (o.exists && old.delete) await old.delete(); } catch (e) { }   // saves from before the account existed are gone
      const snap = await Promise.race([ref.get(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
      if (snap.exists) {
        const d = snap.data(), remote = d && d.json ? JSON.parse(d.json) : null;
        if(remote&&[6,7,8,9].includes(remote.v)&&deletionEpoch!==deletionAtRead){A.rev=Math.max(A.rev,remote.rev||0);save();}
        else if (remote && [6,7,8,9].includes(remote.v) && (remote.rev || 0) > (A.rev || 0)) {
          closeSheet(); CE = null;
          discardEncounter(); A = CharacterWorlds.normalize(remote); if(sceneUp&&Scene.resetWorld)Scene.resetWorld(); loadCur(); cmdBackfill();learningBackfill();
          Q = null; F = null; DG = null;
          $('#enc').hidden = true; $('#fight').hidden = true; $('#nav').hidden = false;
          if (sceneUp) restoreAccountScene(true);
          syncA(); try { localStorage.setItem(AKEY, JSON.stringify(A)); } catch (e) { }
          toast('Loaded your saved game'); if (!$('#title').hidden) title();
        }
      }
      Cloud.ref = ref; Cloud.state = 'account'; if (A.rev > 0) { Cloud.dirty = true; flush(); }
      render();
    } catch (e) { Cloud.state = 'device'; }
  }

  /* ---------- character: twenty use-based skills and three attributes ---------- */
  const RPG = Progression.skills;
  const PATHS = [{ id: 'warrior', name: 'Warrior', sk: { swords: 40, healing: 30 } }, { id: 'thief', name: 'Thief', sk: { stealing: 40, hiding: 30 } }, { id: 'crafter', name: 'Crafter', sk: { smith: 40, carpentry: 30 } }, { id: 'mage', name: 'Mage', sk: { magery: 40, alchemy: 30 } }];
  const WEAP = BattleRules.WEAPONS;
  const CAP = Progression.CAP, skCap = id => Progression.skillCap(S,id), gainBoost = () => (S.boost || 0) > Date.now(), rv = id => S.sk[id] || 0, rpgName = id => (RPG.find(x => x[0] === id) || [id,id])[1];
  const total = () => Progression.total(S);
  const maxHp = () => Progression.maxHp(S);
  const maxStamina = () => Progression.maxStamina(S);
  const castingCost = c => EquipmentRules.castCost(Progression.castCost(c),bonus('focus'));
  function mountContext(){return {outdoors:sceneUp&&Scene.outdoors(),indoors:sceneUp&&!Scene.outdoors(),dungeon:sceneUp&&Scene.inDungeon(),ship:sceneUp&&Scene.inShip(),combat:!!F||!!Q||!!DU||!!activePursuit()};}
  function mounted(){return !!(S.horse?.mounted&&Mounts.canRide(mountContext()));}
  function mountToggle(){const result=Mounts.toggle(S.horse,mountContext());if(!result.ok)return toast(result.reason==='horse'?'Buy a horse from a stable first.':'You can mount outdoors after leaving danger.');S.horse=result.state;Sneaking.reveal(CONCEAL);if(S.horse.mounted)MountView.preload();save();render();toast(S.horse.mounted?'You mount your horse.':'You dismount.');}
  const liveService=kind=>!!CE&&CE.kind===kind&&Scene.ents().includes(CE)&&Math.abs(Scene.pos()[0]-CE.x)+Math.abs(Scene.pos()[1]-CE.y)<=1;
  function buyHorse(){if(!liveService('stablekeep'))return toast('Walk up to the stablekeeper.');const result=Mounts.buy(S.horse,S.gold);if(!result.ok)return toast(result.reason==='owned'?'You already own a horse.':'You need '+Mounts.PRICE+' gold.');S.horse=result.state;S.gold=result.gold;MountView.preload();save();renderHud();SH.stablekeep(CE);toast('Your riding horse is ready. Mount from the Hero menu.');}
  function equipmentTree(value,seen=new WeakSet()){
    if(!value||typeof value!=='object'||seen.has(value))return value;seen.add(value);
    if(value.slot&&value.stats)Object.assign(value,EquipmentRules.migrate(value));
    for(const child of Object.values(value))if(child&&typeof child==='object')equipmentTree(child,seen);
    return value;
  }
  const activePursuit=()=>sceneUp&&Scene.find(e=>e.chase>0||e.engaged);
  const heal = (n, quiet) => { const b = S.hp; S.hp = Math.max(0, Math.min(maxHp(), Math.round(S.hp + n))); if (!quiet && S.hp > b && typeof Scene !== 'undefined') Scene.FX.heal(); return S.hp - b; };
  const diffOf = (t, elite, boss) => Math.min(100, (t - 1) * 12 + 8 + (elite ? 8 : 0) + (boss ? 14 : 0));
  const bestWeapon = () => Object.keys(WEAP).reduce((a, b) => rv(b) > rv(a) ? b : a, 'swords');
  const mkFoe = (t, diff, mult, boss) => { const hp = BattleRules.health(t, mult, boss); return { hp, max: hp, diff, swings: boss ? 3 : 2 }; };
  // the roll: skill against difficulty sets the base chance, then the grade of the query scales it
  function odds(skill, diff, grade, share) {
    const base = Math.max(10, Math.min(95, 50 + 2 * (skill - diff)));
    const p = grade === 'correct' ? Math.max(base, 35) : grade === 'close' ? base * .6 : grade === 'partial' ? base * (.3 + .2 * Math.max(0, Math.min(1, ((share || .5) - .5) / .5))) : base * .05;
    return { base, p: Math.round(p) };
  }
  function gain(id, diff, quality, support = false) { return Progression.gain(S,id,diff,quality,{random:rnd,learn:learnPct(),study:gainBoost(),rest:(S.rest||0)>now(),attributes:!support}); }
  function supportGains(ids,diff,q,list) { for(const id of ids) {const g=gain(id,diff,q*.35,true);if(g)list.push(g);} }
  const rankName = () => { if(!isMain())return 'Adventurer'; const m = Object.keys(S.boss).length; return S.won ? 'Winner of the Trials' : m ? `Tallyport’s champion · ${m} mark${m > 1 ? 's' : ''}` : S.tut<3?'New arrival':'Tallyport’s candidate'; };
  // SQL techniques are still tracked underneath: they decide which query patterns come back
  const sk = id => S.skills[id] || (S.skills[id] = { v: 0, t: 0, n: 0 });
  const rusty = id => { const s = S.skills[id]; return !!s && s.v >= 10 && now() - s.t > 20 * 3600e3; };
  const skTitle = v => v >= 120 ? 'Legendary' : v >= 115 ? 'Elder' : v >= 110 ? 'Grandmaster+' : v >= 100 ? 'Grandmaster' : v >= 90 ? 'Master' : v >= 80 ? 'Adept' : v >= 70 ? 'Expert' : v >= 60 ? 'Journeyman' : v >= 50 ? 'Apprentice' : v >= 40 ? 'Novice' : v >= 30 ? 'Neophyte' : v > 0 ? 'Initiate' : 'Untrained';
  // power scrolls lift one skill's cap past 100; Scrolls of Study double skill gain for half an hour
  const pscrName = x => `Power scroll: ${rpgName(x.id)} ${x.cap}`;
  function makePscr(t) { const top = RPG.map(x => x[0]).sort((a, b) => rv(b) - rv(a)).slice(0, 3), cap = t >= 8 ? (rnd() < .15 ? 120 : 115) : t === 7 ? 110 : t === 6 ? (rnd() < .3 ? 110 : 105) : 105; return { id: pick(top), cap }; }
  // the dojo masters teach the basics of any skill, for a fee that climbs with every point
  const TRAIN_CAP = 45;
  function trainCost(id,n) {const t=Progression.training(S,id,n);return {c:t.cost,to:t.to,add:t.add};}
  function trainSheet() {
    sheet(`<p class="eyebrow">The dojo</p><h2>Lessons</h2><p class="cap2">A master can teach any skill to ${TRAIN_CAP}. Raise permits learning. Lower releases points only when another skill gains at ${CAP}; Locked preserves its value. You have ${S.gold} gold.</p><ul class="goods">${RPG.map(([id,nm])=>{const v=rv(id),one=trainCost(id,1),five=trainCost(id,5);return `<li class="good"><div><b>${nm}</b><small>${v.toFixed(1)} · ${modeName(Progression.mode(S,id))}</small></div>${v>=TRAIN_CAP?'':`<div class="row"><button class="btn sm quiet" data-a="train" data-id="${id}" data-n="1"${one.add>0&&S.gold>=one.c?'':' disabled'}>to ${one.to} · ${one.c}</button><button class="btn sm" data-a="train" data-id="${id}" data-n="5"${five.add>0&&S.gold>=five.c?'':' disabled'}>to ${five.to} · ${five.c}</button></div>`}</li>`;}).join('')}</ul><div class="row end"><button class="btn solid" data-a="closesheet">Done</button></div>`);
  }
  function scrollsHTML() { const P = S.pscr || [], st = Math.max(0, Math.ceil(((S.boost || 0) - Date.now()) / 60000)), rs = Math.max(0, Math.ceil(((S.rest || 0) - Date.now()) / 60000));
    if (!P.length && !S.gscr && !st && !rs) return '';
    return `<h3>Scrolls</h3>${st ? `<p class="cap2">Studying: double skill gain for ${st} more minute${st > 1 ? 's' : ''}.</p>` : ''}${rs ? `<p class="cap2">Well rested: skill gain +25% for ${rs} more minute${rs > 1 ? 's' : ''}.</p>` : ''}<ul class="goods">${S.gscr ? `<li class="good">${ico('scroll')}<div><b>Scroll of Study</b><small>You have ${S.gscr}. Double skill gain for 30 minutes.</small></div><button class="btn sm" data-a="reads">Read</button></li>` : ''}
      ${P.map((x, i) => { const ok = skCap(x.id) < x.cap && skCap(x.id) >= x.cap - 5; return `<li class="good">${ico('scroll')}<div><b>${esc(pscrName(x))}</b><small>${skCap(x.id) >= x.cap ? 'Your cap is already this high' : ok ? `Raises the ${rpgName(x.id)} cap from ${skCap(x.id)} to ${x.cap}` : `Needs a ${x.cap - 5} cap first`}</small></div><button class="btn sm" data-a="readp" data-i="${i}"${ok ? '' : ' disabled'}>Read</button></li>`; }).join('')}</ul>`; }
  const skName = id => SKILLS.find(s => s.id === id).name;
  const unlocked = r => !!S.been[r];
  const maxRegion = () => Math.max(1, ...Object.keys(S.been).map(Number));
  const region = r => REGIONS[r - 1];
  const itemById = id => S.inv.find(i => i.id === id);
  const GIFTB = { gold: ['gold', 10], luck: ['luck', 10], xp: ['xp', 10], learn: ['learn', 15], def: ['def', 8] };
  const gift = k => !!(S.tw && Deep.TRUTHS.some(T => T.gift === k && S.tw[T.id]));
  const bonus = k => Object.values(S.eq).reduce((a, id) => { const it = itemById(id); return a + (it && it.stats[k] || 0); }, 0) + Object.keys(GIFTB).reduce((a, g) => a + (GIFTB[g][0] === k && gift(g) ? GIFTB[g][1] : 0), 0);
  const luck = () => bonus('luck') + Math.min(S.streak, 10) * 3;
  const learnPct = () => bonus('learn');
  const doneIn = r => CONTRACTS.filter(c => c.r === r && S.done[c.id]).length, totalIn = r => CONTRACTS.filter(c => c.r === r).length;

  /* ---------- gear: weapons tied to a combat skill, armor and shields, rings and charms, and named relics ---------- */
  const SLOTS = ['weapon', 'shield', 'head', 'armor', 'hands', 'feet', 'cloak', 'ring', 'charm', 'relic'], RAR = ['common', 'uncommon', 'rare', 'epic', 'legendary'], GRADE = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 3 };
  const WN = { swords: ['Iron Sword', 'Steel Sword', 'Silvered Blade', 'Gilded Longsword'], fencing: ['Iron Rapier', 'Steel Rapier', 'Silvered Rapier', 'Gilded Rapier'], archery: ['Short Bow', 'Long Bow', 'Silvered Bow', 'Gilded Bow'], magery: ['Oak Staff', 'Ash Staff', 'Silvered Staff', 'Gilded Staff'] };
  const GN = { armor: ['Leather Jerkin', 'Chain Shirt', 'Plate Cuirass', 'Knight’s Plate'], shield: ['Wooden Shield', 'Iron Shield', 'Kite Shield', 'Tower Shield'], ring: ['Garnet Ring', 'Sapphire Ring', 'Emerald Ring', 'Moonstone Ring'], charm: ['Sun Amulet', 'Star Amulet', 'Leaf Amulet', 'Moon Amulet'] };
  const SUF = { gold: 'of the Purse', learn: 'of Study', luck: 'of Fortune' }, PRE = { common: '', uncommon: 'Fine ', rare: 'Superior ', epic: 'Exquisite ', legendary: 'Mythic ' };
  const STATN = {embers:'Fire damage',slaying:'Damage against undead',precision:'Accuracy',focus:'Mana cost reduction',warding:'Magic defence',vitality:'Maximum health',quieting:'Hiding chance',endurance:'Maximum stamina', dmg: 'Damage', def: 'Defence', xp: 'Damage', gold: 'Gold', learn: 'Skill gain', luck: 'Luck', deft: 'Deftness' };
  // weapons you can find: art index (hb/wx), the skill it counts for, how it is carried and swung, the lowest grade it turns up at, its icon
  const WV = [{ v: 0, n: 'Short Sword', w: 'swords', k: 'sword', s: 'swing', g: 0 }, { v: 1, n: 'Longsword', w: 'swords', k: 'sword', s: 'swing', g: 1 }, { v: 2, n: 'Greatsword', w: 'swords', k: 'long', s: 'swing', g: 2, ic: 'hq28' },
    { v: 3, n: 'Broad Axe', w: 'swords', k: 'sword', s: 'swing', g: 0 }, { v: 4, n: 'Battle Axe', w: 'swords', k: 'long', s: 'swing', g: 2, ic: 'hq26' }, { v: 5, n: 'Flanged Mace', w: 'swords', k: 'sword', s: 'swing', g: 1 }, { v: 6, n: 'War Hammer', w: 'swords', k: 'long', s: 'swing', g: 2, ic: 'hq25' },
    { v: 14, n: 'Dagger', w: 'fencing', k: 'dagger', s: 'thrust', g: 0 }, { v: 15, n: 'Curved Blade', w: 'fencing', k: 'sword', s: 'swing', g: 1, ic: 'hq30' }, { v: 16, n: 'Throwing Knives', w: 'fencing', k: 'dagger', s: 'thrust', g: 1, ic: 'hq29' }, { v: 7, n: 'Spear', w: 'fencing', k: 'long', s: 'thrust', g: 2, ic: 'hq27' },
    { v: 25, n: 'Short Bow', w: 'archery', k: 'bow', s: 'thrust', g: 0 }, { v: 26, n: 'Longbow', w: 'archery', k: 'bow', s: 'thrust', g: 1 }, { v: 27, n: 'Crossbow', w: 'archery', k: 'bow', s: 'thrust', g: 2 },
    { v: 9, n: 'Oak Staff', w: 'magery', k: 'staff', s: 'cast', g: 0 }, { v: 8, n: 'Quarterstaff', w: 'magery', k: 'staff', s: 'swing', g: 0 }, { v: 13, n: 'Wand', w: 'magery', k: 'dagger', s: 'cast', g: 1 }, { v: 11, n: 'Bone Staff', w: 'magery', k: 'staff', s: 'cast', g: 1, ic: 'hq22' },
    { v: 10, n: 'Crystal Staff', w: 'magery', k: 'staff', s: 'cast', g: 2, ic: 'hq23' }, { v: 12, n: 'Iron Staff', w: 'magery', k: 'staff', s: 'cast', g: 2, ic: 'hq24' }];
  const MATW = { swords: ['Iron', 'Steel', 'Silvered', 'Gilded'], fencing: ['Iron', 'Steel', 'Silvered', 'Gilded'], archery: ['Ash', 'Yew', 'Silvered', 'Gilded'], magery: ['', 'Carved', 'Runed', 'Gilded'] };
  // the new slots: names by grade, with the head gear and icon each name shows
  const GEAR = { head: [['Leather Cap', 'Cloth Hood', 'Wizard’s Hat'], ['Mail Coif', 'Cloth Hood', 'Wizard’s Hat'], ['Steel Helm', 'Silver Circlet'], ['Gilded Helm', 'Gilded Circlet']],
    hands: [['Leather Gloves'], ['Leather Gloves', 'Plated Gauntlets'], ['Plated Gauntlets'], ['Gilded Gauntlets']], feet: [['Leather Boots'], ['Riding Boots'], ['Steel Sabatons'], ['Gilded Sabatons']], cloak: [['Wool Cloak'], ['Travelling Cloak'], ['Silk Cloak'], ['Royal Cloak']] };
  const HATK = n => /Wizard/.test(n) ? 4 : /Hood/.test(n) ? 3 : /Circlet/.test(n) ? 5 : /Coif/.test(n) ? 1 : /Helm/.test(n) ? 2 : /Cap/.test(n) ? 0 : -1;
  const GEARIC = n => 'hq' + ({ 'Leather Cap': 1, 'Mail Coif': 2, 'Steel Helm': 3, 'Gilded Helm': 3, 'Cloth Hood': 4, 'Wizard’s Hat': 5, 'Silver Circlet': 6, 'Gilded Circlet': 6, 'Leather Gloves': 7, 'Thief’s Gloves': 8, 'Plated Gauntlets': 9, 'Gilded Gauntlets': 9, 'Leather Boots': 10, 'Riding Boots': 10, 'Steel Sabatons': 11, 'Gilded Sabatons': 11, 'Glass Orb': 20, 'Spellbook': 19 }[n] || 12);
  function makeItem(rarity, tier, slot, w, options={}) {
    slot = slot || pick(['weapon', 'weapon', 'armor', 'shield', 'ring', 'charm', 'head', 'hands', 'feet', 'cloak']); const ri = RAR.indexOf(rarity), g = GRADE[rarity], it = { id: 'i' + rid(), slot, rarity, tier, stats: {} };
    if (slot === 'weapon') { it.w = w || pick(Object.keys(WEAP)); it.stats.dmg = [6, 12, 20, 30, 42][ri] + tier * 2 + rint(0, 3); const V = pick(WV.filter(x => x.w === it.w && x.g <= g&&(!options.material||EquipmentRules.eligibleMaterials({...it,v:x.v,name:x.n},tier).some(m=>m.id===options.material)))); it.v = V.v; it.name = PRE[rarity] + (MATW[it.w][g] ? MATW[it.w][g] + ' ' : '') + V.n; it.ic = V.ic || `w_${it.w}_${g + 1}`; }
    else if (slot === 'head' || slot === 'hands' || slot === 'feet' || slot === 'cloak') { const thief = !options.archetype && slot === 'hands' && rnd() < .3; it.name = PRE[rarity] + (options.archetype || (thief ? 'Thief’s Gloves' : pick(GEAR[slot][g]))); it.stats.def = { head: [2, 4, 6, 9, 12], hands: [1, 3, 5, 7, 10], feet: [1, 3, 5, 7, 10], cloak: [1, 2, 4, 6, 8] }[slot][ri] + Math.ceil(tier / 3);
      if (thief) it.stats.deft = [4, 7, 10, 14, 18][ri] + Math.floor(tier / 2); else if (slot === 'cloak') it.stats[pick(['luck', 'learn'])] = rint(2, 4) + ri * 2; else if (/Wizard|Circlet/.test(it.name)) it.stats.learn = rint(2, 4) + ri * 2; it.ic = GEARIC(it.name.replace(PRE[rarity], '')); }
    else if (slot === 'shield' && !options.archetype && rnd() < .25) { const nm = pick(['Glass Orb', 'Spellbook']); it.stats.def = [2, 3, 5, 8, 11][ri] + Math.ceil(tier / 3); it.stats.learn = rint(3, 5) + ri * 2; it.name = PRE[rarity] + nm; it.ic = GEARIC(nm); it.off = nm === 'Glass Orb' ? 23 : 24; }
    else if (slot === 'armor' || slot === 'shield') { it.stats.def = (slot === 'armor' ? [4, 7, 11, 16, 22] : [3, 5, 8, 12, 16])[ri] + Math.ceil(tier / 2) + rint(0, 2); it.name = PRE[rarity] + GN[slot][g]; it.ic = `${slot}_${g + 1}`; }
    else { const n = ri >= 2 ? 2 : 1, [lo, hi] = [[2, 4], [4, 7], [4, 8], [7, 12], [9, 14]][ri], keys = ['gold', 'learn', 'luck'].sort(() => rnd() - .5).slice(0, n), v = rint(0, 3); keys.forEach(k => it.stats[k] = rint(lo, hi) + Math.floor(tier / 3)); it.name = PRE[rarity] + GN[slot][v] + ' ' + SUF[keys[0]]; it.ic = `${slot}_${v + 1}`; }
    if(options.archetype){it.name=options.archetype;if(slot==='shield'){it.off=20;it.ic='shield_1';}if(slot==='armor')it.ic=/Robe/.test(it.name)?'cloak_1':/Leather/.test(it.name)?'armor_1':/Chain/.test(it.name)?'armor_2':'armor_3';if(slot==='armor'&&/Robe/.test(it.name)){it.stats.def=Math.ceil(it.stats.def*.5);it.stats.learn=3+ri*2;}}
    const baseName=options.archetype||(slot==='weapon'?WV.find(x=>x.v===it.v)?.n:it.name.replace(PRE[rarity],''));
    return EquipmentRules.decorate(it,{random:rnd,luck:S?.inv?luck():0,baseName,...options});
  }
  const worth = it => Math.round(Object.values(it.stats).reduce((a, b) => a + b, 0) * 3 + { common: 4, uncommon: 12, rare: 35, epic: 90, legendary: 250 }[it.rarity]);
  function rollRarity(lk, min = 0) { const w = [60, 26, 10 * (1 + lk / 50), 3.3 * (1 + lk / 50), 0.7 * (1 + lk / 50)].map((x, i) => i < min ? 0 : x); let t = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < 5; i++) { t -= w[i]; if (t <= 0) return RAR[i]; } return RAR[min]; }
  const uniq = id => { const i = UNIQUES.findIndex(u => u.id === id), u = JSON.parse(JSON.stringify(UNIQUES[i])); u.slot = 'relic'; u.ic = 'u' + (i + 1); return u; };
  function give(it) {
    if (it.unique) { if (S.codex[it.id]) return null; S.codex[it.id] = now(); }
    if (it.was) { const sl = it.was; delete it.was; S.inv.push(it); if (!S.eq[sl]) S.eq[sl] = it.id; return it; }
    if (S.inv.length >= 60 && !it.unique) { S.gold += worth(it); return Object.assign({ sold: worth(it) }, it); }
    S.inv.push(it); if (!S.eq[it.slot]) S.eq[it.slot] = it.id; return it;
  }
  const attackChance=(base,skill)=>{const weapon=itemById(S.eq.weapon);return Math.max(2,Math.min(95,base+(weapon?.w===skill?weapon.stats.precision||0:0)));};
  const dmgPct = w => { const it = itemById(S.eq.weapon); return (it && it.w === w ? it.stats.dmg || 0 : 0) + bonus('xp'); };   // a weapon only helps the skill it is made for
  const statLine = it => (it.w ? rpgName(it.w) + ' · ' : '') + Object.keys(it.stats).map(k => `+${it.stats[k]}${['focus','vitality','endurance'].includes(k)?'':'%'} ${STATN[k]||k}`).join(' · ');
  const IFB = { trune: 'sigil', deed: 'scroll', fish: 'bread', bigfish: 'bread', cheese: 'bread', pie: 'bread', honey: 'draught', cider: 'draught', loaf: 'bread', eggs: 'bread', apple: 'bread', chicken: 'bread', rod: 'picks', meat: 'bread', ration: 'bread', pelt: 'hide', stew: 'bread', salve: 'bandage', hintkey: 'key', chips_gold: 'coin', wheel: 'gem', shoe: 'scroll', scroll_arms: 'scroll', scroll_spell: 'scroll', scroll_shadow: 'scroll', scroll_craft: 'scroll' };
  const ico = (name, n) => { if (ART && /^(dz|hq)\d/.test(name || '')) return `<i class="ico dz" style="background:url(art/i/${name}.webp) center/contain no-repeat">${n != null ? `<b>${n}</b>` : ''}</i>`; const I = ART && ArtData.icons, a = I && (I.at[name] || I.at[IFB[name]]); return `<i class="ico${a ? '' : ' none'}"${a ? ` style="background-position:${-a[0] * 44}px ${-a[1] * 44}px"` : ''}>${n != null ? `<b>${n}</b>` : ''}</i>`; };
  const itemIcon=it=>{const url=sceneUp&&Scene.equipmentIcon(it);return url?'<i class="ico material-icon" style="background-image:url('+url+');background-size:contain;background-position:center"></i>':ico(it.ic);};
  const lootHTML = it => `<div class="loot rar-${it.rarity}">${itemIcon(it)}<div><small>${it.rarity} ${it.slot}${it.unique ? ' · named rare' : ''}${S.eq[it.slot]===it.id?' · equipped':''}${it.unique || it.bless ? ' · blessed' : it.ins ? ' · insured' : ''}</small><b>${esc(it.name)}</b><span class="stats">${statLine(it)}</span>${it.lore ? `<span class="lore">${esc(it.lore)}</span>` : ''}${it.sold ? `<small>Bag full: sold for ${it.sold} gold.</small>` : ''}</div></div>`;

  /* ---------- repeatable tasks ---------- */
  const tplOf = id => BOUNTIES.find(b => b.id === id), tplSk = {};
  function tplSkills(id) { if (!tplSk[id]) tplSk[id] = Engine.skillsUsed(Engine.bare(tplOf(id).gen(RNG(11)).sql)); return tplSk[id]; }
  function makeTask(inst) { const tpl = tplOf(inst.tpl), t = tpl.gen(RNG(inst.seed)); return Object.assign({ kind: 'read', title: tpl.title, r: tpl.r, tpl: tpl.id }, t); }
  function seeded(tplId) { let seed = rid(); for (let i = 0; i < 8; i++) { try { if (Engine.target(makeTask({ tpl: tplId, seed })).rows.length) break; } catch (e) { } seed = rid(); } return seed; }
  function wPick(pool, w) { let t = rnd() * pool.reduce((a, x) => a + w(x), 0); for (const x of pool) { t -= w(x); if (t <= 0) return x; } return pool[0]; }
  const rustW = b => 1 + 3 * tplSkills(b.id).filter(rusty).length;

  const dayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function rounds() {
    if (!S.rounds || S.rounds.day !== dayKey()) { const top = maxRegion(), pool = BOUNTIES.filter(b => b.r <= top), tasks = []; for (let i = 0; i < 5; i++) { const left = pool.filter(b => !tasks.some(t => t.tpl === b.id)), tpl = wPick(left.length ? left : pool, b => rustW(b) + (b.r === top ? 1.5 : 0)); tasks.push({ tpl: tpl.id, seed: seeded(tpl.id), done: false }); } S.rounds = { day: dayKey(), tasks, claimed: false }; }
    return S.rounds;
  }
  function rival(r) { let v = S.rival[r]; if (!v || (v.away <= 0 && v.taken)) v = S.rival[r] = { gold: rint(20, 40) * r, item: makeItem(rollRarity(0, 2), r), away: 0, taken: false }; return v; }
  function stall() { if (!S.stall || S.stall.r !== S.region || S.stall.n >= 6) S.stall = { r: S.region, n: 0, stock: [1, 1, 2, rnd() < .35 ? 3 : 2].map(m => makeItem(RAR[m],S.region,null,null,{source:'shop'})) }; return S.stall; }
  const price = it => Math.round({ common: 20, uncommon: 60, rare: 160, epic: 420, legendary: 1200 }[it.rarity] * (1 + .2 * it.tier));

  function tick() { if (S.stall) S.stall.n++; for (const r in S.rival) if (S.rival[r].away > 0) S.rival[r].away--; }

  /* ---------- hints ---------- */
  const KW = new Set('SELECT FROM WHERE AND OR NOT IN BETWEEN LIKE IS NULL ORDER BY GROUP HAVING LIMIT DISTINCT AS JOIN LEFT ON COUNT SUM AVG MIN MAX CASE WHEN THEN ELSE END DESC ASC WITH OVER PARTITION ROW_NUMBER RANK DENSE_RANK LAG LEAD ROWS PRECEDING CURRENT ROW UNION ALL EXISTS INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE VIEW INDEX PRIMARY KEY INTEGER TEXT REAL ROUND COALESCE UPPER LOWER STRFTIME JULIANDAY'.split(' '));
  const pretty = s => s.replace(/\s+(FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|LEFT JOIN|JOIN|UNION ALL|UNION|VALUES|SET)\b/g, '\n$1').replace(/\)\s+SELECT\b/g, ')\nSELECT').replace(/,\s+(\w+) AS \(/g, ',\n$1 AS (').replace(/DELETE\nFROM/g, 'DELETE FROM');
  function skeleton(sql) { const toks = sql.match(/'(?:[^']|'')*'|[A-Za-z_][A-Za-z0-9_.]*|\d+(?:\.\d+)?|\|\||<>|<=|>=|\S/g) || []; const out = toks.map(t => /^[A-Za-z_]/.test(t) ? (KW.has(t.toUpperCase()) ? t.toUpperCase() : '___') : /^['\d]/.test(t) ? '___' : t); return pretty(out.join(' ').replace(/___( ___)+/g, '___').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ ,/g, ',')); }
  const CL = [[/^WITH\b/, 'WITH'], [/\bDISTINCT\b/, 'DISTINCT'], [/\bLEFT JOIN\b/, 'LEFT JOIN'], [/(?<!LEFT )\bJOIN\b/, 'JOIN'], [/\bWHERE\b/, 'WHERE'], [/\bIS (NOT )?NULL\b/, 'IS NULL'], [/\bLIKE\b/, 'LIKE'], [/\bBETWEEN\b/, 'BETWEEN'], [/\bEXISTS\b/, 'EXISTS'], [/\(\s*SELECT\b/, 'a subquery'], [/\bGROUP BY\b/, 'GROUP BY'], [/\bHAVING\b/, 'HAVING'], [/\bCASE\b/, 'CASE'], [/\bCOALESCE\b/, 'COALESCE'], [/STRFTIME/, 'strftime'], [/JULIANDAY/, 'julianday'], [/\bOVER\s*\(/, 'OVER'], [/PARTITION BY/, 'PARTITION BY'], [/\bUNION\b/, 'UNION'], [/\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/, 'an aggregate'], [/\bORDER BY\b/, 'ORDER BY'], [/\bLIMIT\b/, 'LIMIT']];
  function clauseHint(sql) { const b = Engine.bare(sql), parts = CL.filter(c => c[0].test(b)).map(c => c[1]), tabs = World.ORDER.filter(t => new RegExp('\\b' + t + '\\b', 'i').test(sql)); return `The reference answer uses ${parts.join(', ') || 'a plain SELECT'}. Tables: ${tabs.join(', ')}.`; }
  const hintCost = (lv, r) => [0, 0, 14, 30][lv] * r;

  /* ---------- small UI helpers ---------- */
  /* Each mechanic is explained in one sentence the first time it comes up; after that the sentence sits behind a ? on that screen. */
  const HELP = {
    fight: 'Choose an attack or a support action. Each action gives the foe a chance to respond. Watch your health and its next move. Writing SQL pauses the fight; your query sets the action’s power.',
    fprompt: 'Write a query that returns the requested result. A correct answer gives full power; a useful partial answer gives less. Tap Tables to inspect the data.',
    loot: 'Tap the body to see what it dropped. Tap one item to take it, or choose Take all.',
    bag: 'Tap food or a draught to see how much health it restores. Read a scroll to learn its page. Keep materials for crafting or sell them to a trader.',
    hero: 'Your books hold the pages you’ve learned. You have 700 points to share across your skills. Use Raise to learn through practice, Lower to make room for a skill you’re raising, or Locked to keep a skill at its current value.',
    map: 'Walking uncovers the terrain around you. Ask a cartographer to set a waypoint, or buy a survey to unlock travel within the region while you’re there.',
    ledger: 'In the Ledger’s Sandbox, you can query or change a practice copy. Your experiments there leave the company books and your exercise scores alone.',
    fish: 'Each cast starts with a query. Cast farther out for a harder query and a chance at a better catch. As your Fishing skill grows, you can catch rare fish and bring up sunken finds.',
    errand: 'You can take errands from people who live out along the roads. Open your Map to review the ones you’ve accepted.',
    place: 'Places in the wild can be searched once, or once a day, for gold, gear or a story.',
    shop: 'Choose a page from the master’s list to buy and learn it. Using it will ask you to write queries from that Circle.',
    trade: 'Country folk sell food and odds and ends. Stock changes each day.',
    poker: 'In six-seat hold’em, you can run one COUNT query about the other hands in each betting round.',
    wheel: 'Choose a slot to bet on. You can query the wheel’s weights to see which slots are more likely to come up.',
    bj: 'Blackjack against the house. A query can count the cards left in the shoe.',
    stealth: 'A page from the Book of Shadows lets you try to steal from a creature that has not spotted you.',
    lair: 'Lair leaders use queries from a Circle above the other creatures nearby. A leader can drop its best rewards once per day, sometimes including a teleport rune.',
    bank: 'Gold and things kept here are safe when you die. Every town\u2019s banker reaches the same account.'
  };
  let COACH = null; const unCoach = (...ids) => { const el = $('#coach'); if (el && !el.hidden && (!ids.length || ids.includes(COACH))) el.hidden = true; };
  function coach(id) { if (!HELP[id] || !S || (S.seen && S.seen[id])) return; COACH = id; S.seen = S.seen || {}; S.seen[id] = 1; save(); const el = $('#coach'); if (!el) return; el.innerHTML = `<p>${esc(HELP[id])}</p><button class="btn sm solid" data-a="coachok">Got it</button>`; el.hidden = false; }
  const qm = id => HELP[id] ? `<button class="qm" data-a="why" data-id="${id}" aria-label="What is this?">?</button>` : '';
  /* ---------- a body opens like a container: the things on it as pictures. Tap one to take it; Take all takes the lot. What is left stays on the body. ---------- */
  let LB = null;
  function lootParts(o) { const L = []; if (!o) return L; if (o.gold) L.push({ k: 'gold', n: Math.round(o.gold), ic: 'coin', nm: 'Gold' }); for (const t in (o.mats || {})) if (o.mats[t]) L.push({ k: 'mat', t, n: o.mats[t], ic: 'mat' + t, nm: matName(t) }); if (o.sigils) L.push({ k: 'sigils', n: o.sigils, ic: 'sigil', nm: 'Brass Sigil' }); if (o.meat) L.push({ k: 'meat', n: o.meat, ic: 'meat', nm: 'Meat' }); if (o.hide) L.push({ k: 'hide', n: o.hide, ic: 'hide', nm: 'Hide' }); if (o.runes) L.push({ k: 'runes', n: o.runes, ic: 'trune', nm: 'Teleport rune', rar: 'epic' }); if (o.bless) L.push({ k: 'bless', n: o.bless, ic: 'deed', nm: 'Bless deed', rar: 'epic' }); if (o.gscr) L.push({ k: 'gscr', n: o.gscr, ic: 'scroll', nm: 'Scroll of Study', rar: 'rare' }); (o.pscr || []).forEach(x => L.push({ k: 'pscr', x, ic: 'scroll', nm: pscrName(x), rar: x.cap >= 115 ? 'legendary' : 'epic' }));
    for (const id in (o.food || {})) L.push({ k: 'food', id, n: o.food[id], ic: FOOD[id][2], nm: FOOD[id][0] }); (o.items || []).forEach(it => L.push({ k: 'item', it, ic: it.ic, nm: it.name, rar: it.rarity })); (o.scrolls || []).forEach(id => { const p = pageById(id); if (p) L.push({ k: 'scroll', id, ic: 'scroll', nm: p.name, rar: p.rare ? 'epic' : 'uncommon' }); }); return L; }
  function lootOpen(e) { if (!e || e.kind !== 'corpse') return; const L = lootParts(e.loot); if (!L.length) { toast(e.empty ? 'Picked clean' : 'Nothing on it'); if (!e.empty) Scene.emptied(e); return; } LB = { e, L, nm: e.name.replace(', dead', '') }; coach('loot'); lootDraw(); }
  function lootDraw() { if (!LB) return; sheet(`<div class="lootbox"><div class="lb-head"><b>${esc(LB.nm)}</b>${qm('loot')}</div><div class="lb-grid">${LB.L.map((p, i) => p.taken ? '<span class="lb-cell gone"></span>' : `<button class="lb-cell${p.rar ? ' rar-' + p.rar : ''}" data-a="lootone" data-i="${i}" aria-label="${esc(p.nm)}">${ico(p.ic, p.n != null && p.k !== 'item' && p.k !== 'scroll' ? p.n : null)}<small>${esc(p.nm)}</small></button>`).join('')}</div><div class="row end"><button class="btn solid" data-a="lootall">Take all</button></div></div>`); }
  function lootTake(i, quiet) { const p = LB && LB.L[i]; if (!p || p.taken) return null; const e = LB.e, o = e.loot || {}, one = { mats: {}, items: [], scrolls: [] };
    if (p.k === 'gold') { one.gold = o.gold; one.raw = !!e.mine; o.gold = 0; } else if (p.k === 'mat') { one.mats[p.t] = o.mats[p.t]; o.mats[p.t] = 0; } else if (p.k === 'sigils') { one.sigils = o.sigils; o.sigils = 0; } else if (p.k === 'meat') { one.meat = o.meat; o.meat = 0; } else if (p.k === 'hide') { one.hide = o.hide; o.hide = 0; } else if (p.k === 'runes') { one.runes = o.runes; o.runes = 0; } else if (p.k === 'bless') { one.bless = o.bless; o.bless = 0; } else if (p.k === 'gscr') { one.gscr = o.gscr; o.gscr = 0; } else if (p.k === 'pscr') { one.pscr = [p.x]; o.pscr = o.pscr.filter(x => x !== p.x); }
    else if (p.k === 'food') { one.food = { [p.id]: o.food[p.id] }; delete o.food[p.id]; } else if (p.k === 'item') { one.items = [p.it]; o.items = o.items.filter(x => x !== p.it); } else if (p.k === 'scroll') { one.scrolls = [p.id]; o.scrolls = o.scrolls.filter(x => x !== p.id); }
    p.taken = true; const g = grant(one); if (!quiet) { const bits = bitsOf(g).concat(g.items.map(x => x.name + (x.sold ? ` (bag full: sold for ${x.sold})` : '')), g.scrolls.map(x => 'Scroll: ' + x.name)); toast(bits.join(' · ')); } return g; }
  function lootDone() { if (!LB) return; if (gid() === 'loot' && !LB.e.mine) setTimeout(() => gDone('loot'), 50); if (LB.e.mine) { if (LB.L.every(p => p.taken)) S.remains = null; save(); } if (LB.L.every(p => p.taken)) { Scene.FX.treasure(LB.e.x, LB.e.y); Scene.emptied(LB.e); LB = null; closeSheet(); } else lootDraw(); save(); renderHud(); }
  function toast(msg) { const d = document.createElement('div'), m = String(msg).match(/^(\+\d+) gold(?: · |$)/); if (m) { d.className = 'reward-gold'; d.innerHTML = ico('goldstack'); d.appendChild(document.createTextNode(String(msg))); } else d.textContent = msg; d.setAttribute('role', 'status'); $('#toast').appendChild(d); setTimeout(() => d.remove(), 3600); }
  function sheet(html) { closeSay(); $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; $('.sheet-card').scrollTop = 0; }
  const closeSheet = () => { pendingSale=null; $('#sheet').hidden = true; closeSay(); unCoach('loot', 'fish', 'place', 'shop', 'trade', 'errand'); };
  const fmt = v => v === null || v === undefined ? '<span class="nul">NULL</span>' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(+v.toFixed(4))) : esc(v);
  function tableHTML(res, max = 30) { if (!res || !res.cols.length) return ''; const rows = res.rows.slice(0, max); return `<div class="tw"><table class="res"><thead><tr>${res.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td${typeof v === 'number' ? ' class="num"' : ''}>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="cap2">${res.rows.length} row${res.rows.length === 1 ? '' : 's'}${res.rows.length > max ? `, first ${max} shown` : ''}</p>`; }
  const coin = n => `<span class="coin"></span>${n}`;
  const matName = k => k === 'sigil' ? 'Brass Sigil' : k === 'hide' ? 'Hide' : MATS[k];
  const have = k => S.mats[k] || 0;


  /* ---------- books, pages and scrolls: what you can do is what is written in your books ---------- */
  const pageById = id => PAGES.find(p => p.id === id), owned = id => !!S.pages[id];
  const myPages = book => PAGES.filter(p => p.book === book && owned(p.id)).sort((a, b) => a.c - b.c || a.rare - b.rare);
  const bestPage = book => myPages(book).pop() || null;
  const addScroll = id => { S.scr[id] = (S.scr[id] || 0) + 1; };
  function inscribe(id) { if (!S.scr[id] || owned(id)) return false; S.scr[id]--; if (!S.scr[id]) delete S.scr[id]; S.pages[id] = 1; return true; }
  const scrollHTML = p => `<div class="loot rar-${p.rare ? 'epic' : 'uncommon'}">${ico('scroll')}<div><small>scroll · ${BOOKS[p.book].name} · ${CIRCLE[p.c]} Circle${p.rare ? ' · rare' : ''}</small><b>${esc(p.name)}</b>${p.note ? `<span class="stats">${esc(p.note)}</span>` : ''}</div></div>`;
  const armsSkill = () => { const it = itemById(S.eq.weapon); if (it && it.w && it.w !== 'magery') return it.w; return ['swords', 'fencing', 'archery'].reduce((a, b) => rv(b) > rv(a) ? b : a, 'swords'); };
  const pageSkill = p => p.book === 'spell' ? 'magery' : p.book === 'arms' ? armsSkill() : p.book === 'shadow' ? 'stealing' : 'smith';
  const power = c => 1 + .12 * (c - 1), resist = (c, t) => c >= t ? 1 : Math.max(.4, 1 - .2 * (t - c));
  const fightPages = () => PAGES.filter(p => (p.book === 'arms' || p.book === 'spell') && owned(p.id)).sort((a, b) => b.c - a.c || b.rare - a.rare);
  const GRADE_N = { correct: 'Correct', close: 'Close', partial: 'Partly right', wrong: 'Wrong' };
  const FAST = () => !!window.__bwFast;

  /* ---------- the query panel: one text box, the game's own keyboard, and the phone's keyboard as a fallback ---------- */
  const KWC = { 1: ['SELECT', 'FROM', 'ORDER BY', 'DESC', 'LIMIT', 'DISTINCT', 'AS'], 2: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 'NOT', 'ORDER BY', 'DESC', 'LIMIT'] };
  const KB = { sys: false, shift: false, sym: false, tbl: null, kw: null, tables: [], run: 'Run' };
  const tablesIn = sql => World.ORDER.filter(t => new RegExp('\\b' + t + '\\b', 'i').test(sql));
  function kbHTML(task, circle, runLabel) {
    KB.task = task;KB.practiceAnswer=false; KB.tables = task.tables || tablesIn(task.sql + ' ' + (task.check || '')); KB.kw = task.kw || KWC[circle] || null; KB.tbl = KB.tables[0] || null; KB.shift = KB.sym = false; KB.run = runLabel; KB.list = null;
    return `<div class="qp"><label for="sql" class="vh">Your query</label><div class="qbox"><pre id="sqlhl" class="sqlhl" aria-hidden="true"></pre><textarea id="sql" rows="2" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" inputmode="${KB.sys ? 'text' : 'none'}" placeholder="Your query"></textarea></div><div id="kb" class="kb"></div></div>`;
  }
  function kbView(view) {
    const ta = $('#sql'); if (!ta) return;
    KB.list = KB.list === view ? null : view;
    if (KB.list) ta.blur();
    kbDraw(); fitAll();
    if (!KB.list) { if (KB.sys) ta.focus({preventScroll:true}); else kbFocus(); }
  }
  function queryReferenceHTML(view) {
    const c = ctx(), t = c?.task || KB.task; if (!t) return '<p>No question is open.</p>';
    if (view === 'tables') return (t.tables || KB.tables).map(n => {
      let data; try { data = t.practice ? manifestDb().read('SELECT * FROM manifest') : Engine.peek(n, 12); } catch (_) { data = null; }
      return `<section class="query-table"><h3>${esc(n)}</h3><div class="ret">${(COLS[n] || data?.cols || []).map(x=>`<code>${esc(x)}</code>`).join('')}</div>${data ? tableHTML(data,12) : ''}</section>`;
    }).join('') || '<p>This action has no source tables.</p>';
    if (Q?.kind === 'intro') return `<h3>Your first query</h3><p>SELECT chooses columns. FROM identifies the table.</p>${t.tip ? `<p>${esc(t.tip)}</p>` : ''}<details class="lesson"><summary>Study one answer</summary><div class="lb"><pre class="code">${codeHL(t.sql)}</pre></div></details>`;
    if (Q?.kind === 'learning') return `<h3>Practice help</h3><p>This attempt counts as assisted practice. Help costs no resources.</p>${KB.practiceAnswer?`<pre class="code">${codeHL(t.sql)}</pre>`:(t.concepts||[]).map(id=>conceptHTML(id,false)).join('')}<button class="btn sm" data-a="learnshow">Study one answer</button>`;
    if (F?.act === 'fight') return `<h3>Help with this query</h3>${F.task.tip&&!F.noHint?`<p>${esc(F.task.tip)}</p>`:''}${F.hints.join('')}${F.noHint?'<p>No hints are available for this opponent.</p>':`<div class="row wrap">${fHintBtn()}</div>`}`;
    const hint = c?.hint || 0, max = c?.noHint ? 0 : Q?.kind === 'contract' ? 3 : 1, level = hint+1, cost = hintCost(level,c?.r || here());
    let expected = ''; try { const w=Engine.target(t); expected=`<details class="lesson"><summary>Expected result</summary><div class="lb">${Q&&!Q.roll?tableHTML(w,8):`<p>${w.rows.length} rows · ${esc(w.cols.join(', '))}</p>`}</div></details>`; } catch (_) {}
    return `<h3>Help with this query</h3>${t.tip?`<p>${esc(t.tip)}</p>`:''}${c?.hints?.join('')||''}${hint<max?`<button class="btn sm" data-a="hint">${level===1?'Hint':level===2?'Answer shape':'Show answer'} · ${cost?(S.hints>0?'1 Hint Key':cost+' gold'):'free'}</button>`:''}${expected}${Q?.lesson?lessonHTML(Q.lesson,false):''}`;
  }
  function kbDraw() {
    const el = $('#kb'); if (!el) return; const key = (k, cls, lab) => `<button type="button" class="k ${cls || ''}" data-k="${esc(k)}">${lab || esc(k)}</button>`;
    // one row for tables, then the columns of the table last tapped, then * and a comma; one row for the commands
    const bar = `<div class="kbar${KB.list?' with-return':''}"><button type="button" class="k kb-b${KB.list === 'cmd' ? ' on' : ''}" data-fn="lcmd" aria-pressed="${KB.list==='cmd'}">Commands</button><button type="button" class="k kb-b${KB.list === 'fld' ? ' on' : ''}" data-fn="lfld" aria-pressed="${KB.list==='fld'}">Fields</button><button type="button" class="k kb-b" data-fn="fmt">Format</button>${KB.list?'<button type="button" class="k fn" data-fn="ldone">Keyboard ↵</button>':''}</div>`;
    if (KB.list === 'tables' || KB.list === 'help') {
      el.className='kb reference'; el.dataset.view=KB.list;
      el.innerHTML=bar+`<div class="query-reference" role="region" aria-label="${KB.list==='tables'?'Tables for this query':'Query help'}">${queryReferenceHTML(KB.list)}</div><div class="row last"><button type="button" class="k go" data-fn="run"${ready?'':' disabled'}>${esc(ready?KB.run:'Opening…')}</button></div>`; return;
    }
    el.dataset.view=KB.list || 'keyboard';
    if (KB.list) { const li = (v, cls, lab) => `<button type="button" class="li ${cls || ''}" data-ins="${esc(v)}">${lab || esc(v)}</button>`;
      const TOP = [',', '*', "'"], symAll = (SqlEd.LISTS.find(([g]) => g === 'Symbols') || ['', []])[1].filter(x => !TOP.includes(x));
      const learned = SqlEd.LISTS.filter(([g]) => g !== 'Symbols').map(([g, xs]) => [g, xs.filter(cmdHas)]).filter(([g, xs]) => xs.length);const listed=new Set(SqlEd.LISTS.flatMap(([,xs])=>xs).map(t=>t.toUpperCase())),extra=[...new Set(Learning.CONCEPTS.filter(c=>learningState().introduced[c.id]).flatMap(c=>c.commands))].filter(t=>!listed.has(t.toUpperCase()));if(extra.length)learned.push(['More from your lessons',extra]);
      const groups = KB.list === 'cmd' ? `<div class="lgrid ltop">${TOP.map(x => li(x, 'sy')).join('')}<button type="button" class="li lsym${KB.lsym ? ' on' : ''}" data-fn="lsym">Symbols ${KB.lsym ? '▴' : '▾'}</button></div>` + (KB.lsym ? `<div class="lgrid lsyms">${symAll.map(x => li(x, 'sy')).join('')}</div>` : '') + (learned.length ? learned.map(([g, xs]) => `<p class="lg">${g}</p><div class="lgrid">${xs.map(x => li(x, 'kw')).join('')}</div>`).join('') : '<p class="cap2 lnone">Commands appear here as lessons teach them. You can always type any command.</p>')
        : (() => { const mine = KB.tables, rest = World.ORDER.filter(t => !mine.includes(t)), tb = t => `<p class="lg">${li(t, 'tb', esc(t))}</p><div class="lgrid">${(COLS[t] || []).map(c => li(c, 'cl')).join('')}</div>`; return mine.map(tb).join('') + (rest.length && !TR ? `<p class="lg lg2">Other tables</p>` + rest.map(tb).join('') : ''); })();
      el.className = 'kb listing'; el.innerHTML = bar + `<div class="klist" id="klist">${groups}</div><div class="row last"><button type="button" class="k sy ksy" data-ins="," aria-label="Comma">,</button><button type="button" class="k sy ksy" data-ins="*" aria-label="Star">*</button><button type="button" class="k fn ret" data-fn="ret" aria-label="New line">Return ↵</button><button type="button" class="k fn" data-fn="del" aria-label="Delete">⌫</button><button type="button" class="k go" data-fn="run"${ready ? '' : ' disabled'}>${esc(ready ? KB.run : 'Opening…')}</button></div>`; return; }
    const chips = bar, row2 = '';
    const L = KB.sym ? [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['(', ')', "'", '=', '<', '>', ',', '.', '_', '%'], ['-', '+', '/', '*', ';', '|', '!']] : [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']];
    const up = s => KB.shift && !KB.sym ? s.toUpperCase() : s, del = '<button type="button" class="k fn" data-fn="del" aria-label="Delete">⌫</button>';
    const letters = KB.sys ? '' : `<div class="row r0">${L[0].map(k => key(up(k))).join('')}</div><div class="row r2">${L[1].map(k => key(up(k))).join('')}</div><div class="row">${KB.sym ? '' : `<button type="button" class="k fn${KB.shift ? ' on' : ''}" data-fn="shift" aria-label="Capital">⇧</button>`}${L[2].map(k => key(up(k))).join('')}${del}</div>`;
    el.className = 'kb' + (KB.sys ? ' sys' : '');
    el.innerHTML = chips + row2 + letters + `<div class="row last">${KB.sys ? '' : `<button type="button" class="k fn" data-fn="sym">${KB.sym ? 'abc' : '123'}</button>`}<button type="button" class="k fn" data-fn="sys" aria-label="Switch between the game keyboard and the phone keyboard">${KB.sys ? 'game keys' : '⌨'}</button>${KB.sys || KB.sym ? '' : [',', '*', "'"].map(k => key(k, 'ksy')).join('')}${KB.sys ? del : key(' ', 'sp', 'space')}<button type="button" class="k fn ret" data-fn="ret" aria-label="New line">⏎</button><button type="button" class="k go" data-fn="run"${ready ? '' : ' disabled'}>${esc(ready ? KB.run : 'Opening…')}</button></div>`;
  }
  const kbFocus = () => { const ta = $('#sql'); if (ta && !KB.sys) { try { ta.focus({ preventScroll: true }); } catch (e) { } } };
  const deepNames = () => Deep.TABLES.map(t => t.name);
  let HLT = null; const hlTables = () => HLT || (HLT = new Set(World.ORDER.concat(deepNames(), ['my_skills', 'bestiary', 'my_bag', 'my_materials', 'recipes']).map(t => t.toLowerCase())));
  function hlSync() { const ta = $('#sql'), pre = $('#sqlhl'); if (!ta || !pre) return; const foc = document.activeElement === ta || !KB.sys; pre.innerHTML = SqlEd.hl(ta.value, hlTables(), foc ? ta.selectionEnd : null) + '\n'; pre.scrollTop = ta.scrollTop; pre.classList.toggle('ph', !ta.value); }
  function kbGrow() { const ta = $('#sql'); if (!ta) return; const style=getComputedStyle(ta),min = parseFloat(style.minHeight) || 52, lh = 16 * 1.3, max = parseFloat(style.getPropertyValue('--query-max-height'))||Math.round(lh * 6 + 16); ta.style.height = 'auto'; const h = Math.min(max, Math.max(min, ta.scrollHeight + 2)); ta.style.height = h + 'px'; if (ta.selectionStart >= ta.value.length) ta.scrollTop = ta.scrollHeight; hlSync(); if (h !== ta._h) { ta._h = h; fitAll(); } }
  document.addEventListener('selectionchange', () => { if (document.activeElement && document.activeElement.id === 'sql') hlSync(); });
  document.addEventListener('scroll', e => { if (e.target && e.target.id === 'sql') { const pre = $('#sqlhl'); if (pre) pre.scrollTop = e.target.scrollTop; } }, true);
  function insert(text, word) {
    const ta = $('#sql') || $('#con-sql'); if (!ta) return; let s = ta.selectionStart; const e = ta.selectionEnd, before = ta.value.slice(0, s), prev = before.slice(-1); let t = text;
    if (word) { if (prev && /[A-Za-z0-9_,)'*]/.test(prev)) t = ' ' + t; if (!/\($/.test(text)) t += ' '; }
    else if (text === ',') { if (prev === ' ' && /\S $/.test(before)) s--; t = ', '; }
    else if (text === '*') { t = (prev && /[A-Za-z0-9_,]/.test(prev) ? ' ' : '') + '* '; }
    ta.setRangeText(t, s, e, 'end');
  }
  // the word just before the caret becomes capitals if it is SQL; functions only when a bracket follows. Text in quotes is left alone.
  function upWord(ta, bracket) { const s = ta.selectionStart, before = ta.value.slice(0, s); if ((before.match(/'/g) || []).length % 2) return; const m = /([A-Za-z_]+)$/.exec(before); if (!m) return; const w = m[1], lw = w.toLowerCase();
    if ((SqlEd.UPWORD.has(lw) || (bracket && SqlEd.FN.has(lw))) && w !== w.toUpperCase()) { ta.setRangeText(w.toUpperCase(), s - w.length, s, 'end'); } }
  function listIns(ta, v, cl) { const before = ta.value.slice(0, ta.selectionStart), line = before.split('\n').pop();
    if (cl.contains('sy')) { if (/^[,()]$/.test(v)) upWord(ta, v === '('); insert(v, false); return; }
    upWord(ta); if (SqlEd.STARTS_LINE.has(v) && line.trim()) { const sp = (/ +$/.exec(ta.value.slice(0, ta.selectionStart)) || [''])[0].length; if (sp) ta.setRangeText('', ta.selectionStart - sp, ta.selectionStart, 'end'); ta.setRangeText('\n' + (/^\s*/.exec(line) || [''])[0].replace(/  $/, ''), ta.selectionStart, ta.selectionEnd, 'end'); }
    insert(v, true); if (cl.contains('tb')) KB.tbl = v; }
  const fitAll = () => { fitPanel(); fitQ(); };
  function kbPress(b) {
    const ta = $('#sql'), d = b.dataset; if (!ta) return;
    if (d.fn === 'run') return ACT.run();
    if (d.fn === 'lcmd' || d.fn === 'lfld') return kbView(d.fn.slice(1));
    if (d.fn === 'ldone') { KB.list=null;kbDraw();fitAll();if(KB.sys)ta.focus({preventScroll:true});else kbFocus();return; }
    if (d.fn === 'fmt') { if (ta.value.trim()) { ta.value = SqlEd.format(ta.value); ta.setSelectionRange(ta.value.length, ta.value.length); } return kbGrow(); }
    if (d.fn === 'ret') { const b0 = ta.value.slice(0, ta.selectionStart); upWord(ta); const cur = ta.value.slice(0, ta.selectionStart).split('\n').pop(), ind = (/^\s*/.exec(cur) || [''])[0], one = /^\s*(WHERE|HAVING|ON|JOIN|LEFT JOIN)\b/i.test(cur) ? '  ' : ''; ta.setRangeText('\n' + ind + one, ta.selectionStart, ta.selectionEnd, 'end'); return kbGrow(); }
    if (d.ins != null) { listIns(ta, d.ins, b.classList); return kbGrow(); }
    if (d.fn === 'shift') { KB.shift = !KB.shift; return kbDraw(); } if (d.fn === 'sym') { KB.sym = !KB.sym; return kbDraw(); } if (d.fn === 'lsym') { KB.lsym = !KB.lsym; return kbDraw(); }
    if (d.fn === 'sys') { KB.sys = !KB.sys; ta.setAttribute('inputmode', KB.sys ? 'text' : 'none'); kbDraw(); ta.blur(); setTimeout(() => { try { ta.focus(); } catch (e) { } kbGrow(); }, 40); return; }
    if (d.fn === 'del') { const s = ta.selectionStart, e = ta.selectionEnd; if (s !== e) ta.setRangeText('', s, e, 'end'); else if (s > 0) ta.setRangeText('', s - 1, s, 'end'); return kbGrow(); }
    if (d.tb != null) { if (d.tb === '+') KB.tables = World.ORDER.slice(); else { if (!new RegExp('\\b' + d.tb + '\\s*$', 'i').test(ta.value.slice(0, ta.selectionStart))) insert(d.tb, true); KB.tbl = d.tb; } kbDraw(); return kbGrow(); }
    const word = b.classList.contains('kw') || b.classList.contains('cl'); if (/^[ ,()]$/.test(d.k)) upWord(ta, d.k === '('); insert(d.k, word); if (KB.shift && !word) { KB.shift = false; kbDraw(); } kbGrow();
  }
  // a touch that redraws the screen is followed by a click on whatever now sits under the finger: ignore that click
  let kbRep = 0, tapT = 0; const ghost = e => e.detail!==0 && !FAST() && tapT > 0 && performance.now() - tapT < 450 && e.target.tagName !== 'CANVAS' && !e.target.closest('#kb');
  document.addEventListener('pointerdown', e => {if(e.target?.tagName==='CANVAS')tapT=performance.now();else if(!e.target.closest?.('#kb'))tapT=0;}, true);
  /* Which key a touch means. On the letters, a touch goes to the nearest key, gaps included, the way the phone's own keyboard behaves. The command, table and column
     buttons above need a touch well inside them, and right after a letter only their upper part counts, so a thumb landing a little high on the top letter row types a letter, not a command. */
  let kbLetterT = 0; const KLOG = [];
  function kbPick(kb, x, y, tgt) {
    const chip = tgt && tgt.closest('.chips .k'), now = performance.now(); if (!x && !y && tgt && tgt.closest('.k')) return [tgt.closest('.k'), 'on key'];   // an event with no position (keyboard access, tests): take its target
    if (chip) { const r = chip.getBoundingClientRect(), recent = now - kbLetterT < 350; if (x < r.left + 2 || x > r.right - 2) return [null, 'chip edge']; if (y > r.bottom - (recent ? r.height * .45 : 3)) return [null, recent ? 'chip low after letter' : 'chip edge']; return [chip, 'chip']; }
    if (tgt && tgt.closest('.chips')) return [null, 'chip gap'];
    const barb = tgt && tgt.closest('.kbar .k, .row.last .k'); if (barb) return [barb, 'on key'];
    const own = tgt && tgt.closest('.row .k'); if (own) return [own, 'on key'];
    const rows = [...kb.querySelectorAll(':scope > .row')]; if (!rows.length) return [null, 'no rows']; if (y < rows[0].getBoundingClientRect().top - 12) return [null, 'above letters'];
    let best = null, bd = 1e9; for (const row of rows) for (const k of row.querySelectorAll('.k')) { const r = k.getBoundingClientRect(), dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0, dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0, d = dx * dx + dy * dy * 1.4; if (d < bd) { bd = d; best = k; } }
    return [best, bd ? 'nearest' : 'on key'];
  }
  function kbLog(k, why, dt) { const lab = k ? (k.dataset.fn || k.dataset.tb || k.dataset.k || '?') : '—'; KLOG.push(`${lab === ' ' ? '␣' : lab}${why === 'on key' || why === 'chip' ? '' : ' (' + why + ')'} +${Math.round(dt)}ms`); if (KLOG.length > 10) KLOG.shift(); const el = $('#klog'); if (el) el.textContent = KLOG.slice().reverse().join('  ·  '); }
  let LT = null;
  document.addEventListener('pointerdown', e => { const it = e.target.closest && e.target.closest('#klist .li'); if (it) { LT = { it, x: e.clientX, y: e.clientY }; e.preventDefault(); } }, true);
  document.addEventListener('pointermove', e => { if (LT && Math.hypot(e.clientX - LT.x, e.clientY - LT.y) > 9) LT = null; }, true);
  document.addEventListener('pointerup', e => { if (!LT) return; const it = LT.it; LT = null; it.classList.add('dn'); setTimeout(() => it.classList.remove('dn'), 120); kbPress(it); }, true);
  document.addEventListener('pointercancel', () => { LT = null; }, true);
  document.addEventListener('pointerdown', e => { const kb = e.target.closest && e.target.closest('#kb'); if (!kb || e.target.closest('.query-reference')) return; e.preventDefault(); if (e.target.closest('#klist')) return; const t0 = performance.now(), dt = t0 - (tapT || t0);
    const [k, why] = kbPick(kb, e.clientX, e.clientY, e.target); if (S && S.klog) kbLog(k, why, dt); if (!k || k.disabled) return; tapT = t0; if (k.closest('.row') && !k.dataset.fn) kbLetterT = t0; k.classList.add('dn'); setTimeout(() => k.classList.remove('dn'), 110); kbPress(k); if (k.dataset.fn === 'del') { clearTimeout(kbRep); const again = () => { const b = $('#kb [data-fn="del"]'); if (!b) return; kbPress(b); kbRep = setTimeout(again, 70); }; kbRep = setTimeout(again, 380); } });
  for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => clearTimeout(kbRep));
  // with the phone keyboard up, iOS shrinks only the visual viewport: lift the docked panel by the covered height while the box has focus
  function vvFit() { const vv = window.visualViewport, ta = $('#sql'), on = KB.sys && ta && document.activeElement === ta && vv, kb = on ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0; $('#app').style.setProperty('--kb', kb + 'px');$('#app').classList.toggle('native-keyboard',!!on&&kb>0); const naming=vv && document.activeElement?.id==='boat-name', boatKb=naming?Math.max(0,window.innerHeight-vv.height-vv.offsetTop):0; $('#app').style.setProperty('--boat-kb',boatKb+'px'); if (on && kb > 0) window.scrollTo(0, 0); fitPanel(); fitQ(); }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', vvFit); window.visualViewport.addEventListener('scroll', vvFit); }
  document.addEventListener('focusin', vvFit); document.addEventListener('focusout', () => setTimeout(vvFit, 60));
  document.addEventListener('input', e => { if (e.target && e.target.id === 'sql') { if (e.data && /^[ ,()\n]$/.test(e.data)) { const ta = e.target, s = ta.selectionStart; ta.setSelectionRange(s - 1, s - 1); upWord(ta, e.data === '('); const t = ta.selectionStart + 1; ta.setSelectionRange(t, t); } kbGrow(); } });

  /* ---------- rewards ---------- */

  /* ---------- learned commands (world-wide): A.cmds[lesson] is 1 once the lesson is opened (its commands join the Commands panel) and 2 once a correct query has used one of them ---------- */
  const cmdTitle = k => k === 'intro' ? 'SELECT and FROM' : ((CONTRACTS.find(c => c.id === k) || {}).lesson || {}).title || k;
  const cmdSet = () => A.cmds || (A.cmds = {});
  function cmdTeach(k) { if (!CMDS[k] || cmdSet()[k]) return; A.cmds[k] = 1; if (!CMDS.intro.every(x => CMDS[k].includes(x))) toast('New in Commands: ' + cmdTitle(k)); }
  const cmdHas = label => Object.keys(cmdSet()).some(k => CMDS[k] && CMDS[k].includes(label)) || Learning.CONCEPTS.some(c=>learningState().introduced[c.id]&&c.commands.some(t=>t.toUpperCase()===label.toUpperCase()));
  function cmdUsed(label, tk) { const core = []; for (const t of SqlEd.tokens(label)) { if (t[0] === 'w') core.push(t[1].toUpperCase()); else if (t[0] !== 'ws') break; }
    if (!core.length) return tk.some(x => x[1] === label); const br = label.includes('(');
    for (let i = 0; i + core.length <= tk.length; i++) if (core.every((w, j) => tk[i + j][0] === 'w' && tk[i + j][1].toUpperCase() === w) && (!br || (tk[i + core.length] && tk[i + core.length][1] === '('))) return true; return false; }
  function cmdLearn(sql) { if (!sql || !A) return; const tk = SqlEd.tokens(sql).filter(t => t[0] !== 'ws' && t[0] !== 'cm'); let n = 0;
    for (const k of Object.keys(CMDS)) { if (cmdSet()[k] === 2 || !CMDS[k].some(l => cmdUsed(l, tk))) continue; A.cmds[k] = 2; S.hints = (S.hints || 0) + 1; const owner=S,world=A.world;setTimeout(() => {if(S===owner&&A.world===world)toast('Learned ' + cmdTitle(k) + '! +1 Hint Key');}, 700 + 1500 * n++); } }
  function cmdBackfill() { if (!A) return; cmdSet(); for (const sl of A.slots) { if (!sl) continue; if (sl.stats && sl.stats.ok > 0 && !A.cmds.intro) A.cmds.intro = 2; for (const k of Object.keys(CMDS)) { if (k === 'intro' || A.cmds[k] === 2) continue; if (sl.done && sl.done[k]) A.cmds[k] = 2; else if (sl.seen && sl.seen[k] && !A.cmds[k]) A.cmds[k] = 1; } } }
  function trainSql(used, tier, sql, options={}) { introduceConcepts(Learning.conceptsFor(sql));cmdLearn(sql); if (!options.practice && !S.odp && used.includes('cte') && used.includes('window') && (used.includes('join') || used.includes('outer'))) { S.odp = 1; setTimeout(() => toast('Odalys Brine will want to hear about that query.'), 900); } const cap = Math.min(100, 30 + tier * 10); for (const id of used) { const s = sk(id), r = rusty(id); if (s.v < cap) s.v = Math.min(cap, Math.round((s.v + Math.max(.1, 4.5 * (1 - s.v / cap)) * (r ? 2 : 1)) * 10) / 10); s.t = now(); s.n++; } }
  /* SQL learning is shared by a household; teaching never spends RPG resources. */
  const learningState = () => A.learning || (A.learning=Learning.fresh());
  const concept = id => Learning.CONCEPTS.find(c=>c.id===id);
  function prerequisiteIds(id,seen=new Set()){for(const prior of concept(id)?.prerequisites||[]){if(seen.has(prior))continue;seen.add(prior);prerequisiteIds(prior,seen);}return [...seen];}
  function introduceConcepts(ids) {
    Learning.introduce(learningState(),ids);
    const tokens=new Set(ids.flatMap(id=>concept(id)?.commands||[]));
    for(const id of Object.keys(CMDS))if(CMDS[id].length&&CMDS[id].every(t=>tokens.has(t)))cmdTeach(id);
  }
  function conceptHTML(id, open=false) {
    const c=concept(id);if(!c)return '';
    let sample=null;if(ready&&/^\s*(SELECT|WITH)\b/i.test(c.code||'')){sample=Engine.runRead(c.code);if(sample.err)sample=null;}
    return `<details class="lesson sql-concept"${open?' open':''}><summary>${esc(c.title)}</summary><div class="lb"><p>${esc(c.body)}</p><pre class="code">${codeHL(c.code||'')}</pre>${c.example?`<p>${esc(c.example)}</p>`:''}${sample?tableHTML(sample,4):''}<button class="btn sm quiet" data-a="learnconcept" data-id="${id}">Practise this technique safely</button></div></details>`;
  }
  function prepareLearning(task) {
    if(!task||!task.sql||task.learningPrepared)return task;
    const t=Learning.annotate(task),required=[...new Set(t.concepts.flatMap(id=>[...prerequisiteIds(id),id]))],missing=Learning.missing(learningState(),required);
    introduceConcepts(required);t.learningPrepared=true;t.newTeaching=missing.length>0;
    t.teaching=missing.length?`<section class="first-technique"><h3>A new technique</h3><p>Read the example before committing an action. You can leave this question and practise safely with a dojo specialist.</p>${missing.map(id=>conceptHTML(id,true)).join('')}</section>`:'';
    if(missing.length)save();return t;
  }
  function recordLearning(task, options) {
    if(!task?.sql)return;
    const ids=Learning.record(learningState(),Learning.annotate(task),{...options,assisted:options.assisted||!!task.newTeaching})||[];
    if(ids.length)toast('Ready to practise in the world: '+ids.map(id=>concept(id)?.title||id).join(', '));
  }
  function learningSummary(r) {
    const ids=Learning.regionConcepts(r),known=ids.filter(id=>Learning.ready(learningState(),id));
    return `<p class="learning-summary">${known.length} of ${ids.length} regional techniques ready. Readiness reflects varied answers without help. Your weapon, magic and defensive skills still determine how well you fight.</p>`;
  }
  function learningHub(r=here()) {
    sheet(`<p class="eyebrow">${esc(tName(r))} dojo</p><h2>Learn and practise SQL</h2><p>Teaching bouts are free and untimed. Losing costs no gear, health, supplies or gold. The tournament is a separate competition.</p>${learningSummary(r)}${Learning.specialists(r).map((sp,i)=>`<section class="sec"><h3>${esc(Dojo.STUDENTS(r)[i].name)} · ${esc(sp.title)}</h3><p>${sp.concepts.map(id=>esc(concept(id)?.title||id)).join(' · ')}</p><button class="btn sm" data-a="learnspecialist" data-id="${sp.id}" data-r="${r}">Meet this specialist</button></section>`).join('')}${Learning.regionConcepts(r).filter(id=>!Learning.specialists(r).some(sp=>sp.concepts.includes(id))).map(id=>`<section class="sec"><h3>${esc(Dojo.MASTERS[r-1].name)} · ${esc(concept(id).title)}</h3><button class="btn sm" data-a="learnconcept" data-id="${id}" data-r="${r}">Explain and try it</button></section>`).join('')}<button class="btn" data-a="learnpractice" data-r="${r}">Mixed practice bout</button><p>When these techniques feel familiar, try the nearby wilderness or dungeon. You can explore earlier too; a correct query gives full power even while your character is still building combat skill.</p>`);
  }
  function specialistMenu(r,id) {
    const sp=Learning.specialists(r).find(s=>s.id===id);if(!sp)return;
    const index=Learning.specialists(r).findIndex(s=>s.id===sp.id),name=Dojo.STUDENTS(r)[index].name;
    sheet(`<p class="eyebrow">${esc(tName(r))} dojo · ${esc(name)}</p><h2>${esc(sp.title)}</h2><p>“${esc(Dojo.SPECIALIST_LINES[r-1][index])}”</p>${sp.concepts.map(id=>`<section class="sec"><h3>${esc(concept(id)?.title||id)}${Learning.ready(learningState(),id)?' · ready':''}</h3><button class="btn sm quiet" data-a="learnconcept" data-id="${id}" data-r="${r}" data-spec="${sp.id}">Explain and try it</button></section>`).join('')}<button class="btn solid" data-a="learnpractice" data-r="${r}" data-spec="${sp.id}">Practise ${esc(sp.title)}</button><button class="btn quiet" data-a="learninghub" data-r="${r}">All specialists</button>${Scene.inHall()&&Scene.ents().filter(e=>e.spar).length===2?'<button class="btn quiet" data-a="djwatch">Watch a competitive bout</button>':''}`);
  }
  function learningPractice(d={}) {
    if(F||DU||Q&&Q.kind!=='learning')return toast('Finish or leave the current activity before starting dojo practice.');
    const old=d.continue&&Q?.kind==='learning'?Q:null,r=+d.r||old?.r||here(),sp=d.spec||old?.specialist||null;
    if(!Scene.inHall()||Scene.region()!==r)return toast('Visit this town’s dojo to practise with its specialists. You can review explanations in Ledger → Lessons.');
    const selection=old?.practiceSelection||{circle:r,specialist:sp},task=Learning.next(learningState(),{...selection,seed:rid()});if(!task)return toast('No practice question is available for that technique.');
    openQ({kind:'learning',owner:S,world:A.world,r,specialist:sp,practiceSelection:selection,task:prepareLearning(task),title:sp?Learning.specialists(r).find(s=>s.id===sp)?.title:'Mixed dojo practice',step:'turn',practiceScore:old?.practiceScore||[0,0],assisted:false,first:true});
  }
  function learnConcept(d) {
    if(F||DU||Q&&Q.kind!=='learning')return toast('Leave the current activity first. Your lesson will remain in Ledger → Lessons.');
    const c=concept(d.id);if(!c)return;
    const ids=[...prerequisiteIds(c.id),c.id],prerequisites=Learning.missing(learningState(),ids.filter(id=>id!==c.id));introduceConcepts(ids);save();
    const nativeRegion=+d.r||Math.max(1,c.circle);
    if(!Scene.inHall()||Scene.region()!==nativeRegion)return sheet(`<h2>${esc(c.title)}</h2>${prerequisites.map(id=>conceptHTML(id,true)).join('')}<p>${esc(c.body)}</p><pre class="code">${codeHL(c.code)}</pre><p>${esc(c.example||'')}</p><p>Visit ${esc(tName(nativeRegion))}’s dojo to practise this technique with its specialists. These notes stay in Ledger → Lessons.</p>`);
    const r=+d.r||Math.max(1,c.circle),sp=d.spec||Learning.specialists(r).find(s=>s.concepts.includes(c.id))?.id||null;
    const selection={circle:c.circle===0?0:r,specialist:c.circle===0?'intro':sp,concept:c.id},task=Learning.next(learningState(),{...selection,seed:rid()});
    if(!task)return;
    openQ({kind:'learning',owner:S,world:A.world,r,specialist:sp,practiceSelection:selection,task:prepareLearning(task),title:c.title,step:'learn',lesson:{...c,skill:c.id},prerequisites,first:true,assisted:false,practiceScore:[0,0]});
  }
  function learningHelp(show=false) {
    if(!Q||Q.kind!=='learning')return;
    const draft=$('#sql');if(draft)Q.draft=draft.value;Q.assisted=true;recordLearning(Q.task,{ok:false,assisted:true,first:false});save();
    if(draft){KB.practiceAnswer=show;KB.list='help';kbDraw();fitAll();return;}
    sheet(`<h2>${show?'One answer to study':'Free practice help'}</h2><p>Help costs nothing here. This attempt will count as assisted practice; a new question lets you try independently.</p>${show?`<pre class="code">${codeHL(Q.task.sql)}</pre>`:(Q.task.concepts||[]).map(id=>conceptHTML(id,true)).join('')}<button class="btn sm" data-a="learnshow">Show this answer</button><button class="btn sm quiet" data-a="closesheet">Back to my query</button>`);
  }
  function runLearning(sql) {
    if(!Q||Q.kind!=='learning'||Q.owner!==S||Q.world!==A.world)return;
    const res=Engine.grade(Q.task,sql),o=$('#q-out');Q.draft=sql;
    if(res.err){Q.first=false;o.innerHTML=`<div class="verdict err"><h3>That query did not run</h3><p>${esc(res.err)}</p><p>Fix it and try again. Practice costs no resources.</p></div>`;return showOut();}
    const assisted=!!Q.assisted,first=Q.first;recordLearning(Q.task,{ok:res.ok,assisted,first,sql});
    if(res.ok&&!assisted)trainSql(res.used||[],Q.r,sql,{practice:true});
    if(!assisted&&first){Q.practiceScore[res.ok?0:1]++;}
    Q.first=false;
    const done=Q.practiceScore.some(n=>n>=3),message=assisted?'You worked through that with help. Try a fresh question independently.':res.ok?'Your query gives the requested result.':`The specialist takes this exchange. ${res.msg||'Compare what was requested with your result.'}`;
    Q.result=`<h2>${res.ok?'That worked':'Keep practising'}</h2><p>${esc(message)}</p>${res.got?tableHTML(res.got,6):''}${!res.ok?`<details class="lesson"><summary>Study one correct solution</summary><div class="lb"><pre class="code">${codeHL(Q.task.sql)}</pre></div></details>`:''}<p>You ${Q.practiceScore[0]} · specialist ${Q.practiceScore[1]}. ${done?'The bout is finished. You can start another whenever you like.':'First to three scored exchanges; there is no time limit.'}</p><p>No health, supplies, gold or equipment were spent. RPG skills were unchanged.</p>${learningSummary(Q.r)}<button class="btn solid" data-a="learnnext">${done?'Start another bout':'Next question'}</button>`;
    Q.boutDone=done;Q.step='result';save();drawQ();
  }

  function learningBackfill() {
    if(!A)return;const ids=new Set();
    for(const sl of A.slots){if(!sl)continue;if(sl.stats?.ok>0)ids.add('select');for(const c of CONTRACTS)if(c.lesson&&(sl.seen?.[c.id]||sl.done?.[c.id]))for(const id of Learning.conceptsFor(c.lesson.code))ids.add(id);}
    for(const c of Learning.CONCEPTS)if(c.commands?.length&&c.commands.every(token=>Object.keys(cmdSet()).some(k=>CMDS[k]?.includes(token))))ids.add(c.id);
    Learning.introduce(learningState(),[...ids]);
  }
  function grant(o) {
    const gold = Math.round((o.gold || 0) * (o.raw ? 1 : 1 + bonus('gold') / 100)); S.gold += gold;   /* o.raw: your own gold back from your body is not a find */ for (const k in (o.mats || {})) S.mats[k] = have(k) + o.mats[k]; if (o.sigils) S.mats.sigil = have('sigil') + o.sigils; if (o.meat) S.meat = (S.meat || 0) + o.meat; for (const k in (o.food || {})) addFood(k, o.food[k]); if (o.hide) S.mats.hide = have('hide') + o.hide; if (o.runes) S.runes = (S.runes || 0) + o.runes; if (o.bless) S.blessd = (S.blessd || 0) + o.bless; if (o.gscr) S.gscr = (S.gscr || 0) + o.gscr; (o.pscr || []).forEach(x => (S.pscr = S.pscr || []).push(x));
    const scr = (o.scrolls || []).filter(id => !owned(id) && !S.scr[id]); scr.forEach(addScroll);
    if (!o.raw && ((o.items || []).some(it => it.unique || it.rarity === 'epic' || it.rarity === 'legendary') || scr.some(id => pageById(id).rare))) Sound.sfx('reward');
    return { gold, mats: o.mats || {}, sigils: o.sigils || 0, meat: o.meat || 0, hide: o.hide || 0, runes: o.runes || 0, bless: o.bless || 0, gscr: o.gscr || 0, pscr: o.pscr || [], food: o.food || {}, items: (o.items || []).map(give).filter(Boolean), scrolls: scr.map(pageById) };
  }
  const capText = x => x.before>=skCap(x.id)?'Individual skill cap reached':x.before>=Progression.target(S,x.id)?'Stopping target reached':`${CAP} total cap. Set a skill to Lower.`;
  const gainEntries = g => {const grouped=new Map();for(const x of (g||[]).flatMap(x=>[x,...(x.losses||[]).map(y=>({...y,loss:true}))])){const k=x.id+':'+!!x.loss+':'+!!x.capped,old=grouped.get(k);if(old){old.before=x.loss?Math.max(old.before,x.before):Math.min(old.before,x.before);old.after=x.loss?Math.min(old.after,x.after):Math.max(old.after,x.after);}else grouped.set(k,{...x});}return [...grouped.values()];};
  const gainValue = x => `${x.before.toFixed(1)} → ${x.after.toFixed(1)} (${x.loss?'−':'+'}${Math.abs(x.after-x.before).toFixed(1)})`;
  const gainsHTML = g => gainEntries(g).length ? `<section class="practice-gains" aria-label="Practice results"><h3>Practice results</h3>${gainEntries(g).map(x=>`<div class="practice-gain"><b>${rpgName(x.id)}</b><span class="${x.capped?'cap':''}">${x.capped?capText(x):gainValue(x)}</span></div>`).join('')}</section>` : '';
  const gainLine = gainsHTML;

  const bitsOf = g => { const bits = []; if (g.gold) bits.push(`+${g.gold} gold`); for (const k in (g.food || {})) bits.push(`+${g.food[k]} ${FOOD[k][0]}`); for (const k in g.mats) if (g.mats[k]) bits.push(`+${g.mats[k]} ${matName(k)}`); if (g.sigils) bits.push(`+${g.sigils} Brass Sigil`); if (g.meat) bits.push(`+${g.meat} Meat`); if (g.hide) bits.push(`+${g.hide} Hide`); if (g.runes) bits.push(`+${g.runes} Teleport rune`); if (g.bless) bits.push(`+${g.bless} Bless deed`); if (g.gscr) bits.push(`+${g.gscr} Scroll of Study`); (g.pscr || []).forEach(x => bits.push(pscrName(x))); return bits; };
  function spoilsHTML(g) { const bits = bitsOf(Object.assign({}, g, {gold:0})); return `${g.gold ? `<p class="reward-gold">${ico('goldstack')}<strong>+${g.gold} gold</strong></p>` : ''}${bits.length ? `<p class="spoils">${bits.map(esc).join(' · ')}</p>` : ''}${g.items.map(lootHTML).join('')}${(g.scrolls || []).map(scrollHTML).join('')}`; }
  const codeHL = q => { try { return SqlEd.hl(SqlEd.format(String(q)), hlTables()); } catch (e) { return esc(String(q)); } };
  const answerHTML = t => `<details class="lesson" open><summary>What would have worked</summary><div class="lb"><pre class="code">${codeHL((t.sql))}</pre></div></details>`;
  const lessonHTML = (l, open) => `<details class="lesson"${open ? ' open' : ''}><summary>${esc(l.title)}</summary><div class="lb"><pre class="code" data-lesson-example>${codeHL(l.code)}</pre><p>${esc(l.body)}</p></div></details>`;
  const needsHTML = t => t.kind === 'dml' ? `<div class="needs"><span>This query changes a practice copy. We’ll check what the copy contains after you run it.</span></div>` : `<div class="needs"><span>The result needs the columns below in this order.</span>${t.ret.split(',').map(x => `<code>${esc(x.trim())}</code>`).join('')}<span>${t.order ? 'sorted as asked' : 'rows in any order'}</span></div>`;

  /* ---------- help: tables, expected result and hint behind one button ---------- */
  const ctx = () => Q || F || DU;
  function helpSheet(refresh=false) {
    if ($('#sql') && Q?.kind!=='learning') {if(refresh){KB.list='help';kbDraw();return fitAll();}return kbView('help');}
    if(Q&&Q.kind==='learning')return learningHelp();
    const c = ctx(), t = c && c.task; if (!t) return; if (Q && Q.kind === 'intro') return sheet(`<h2>Your first query</h2><p>SELECT chooses columns. FROM identifies the table. A comma separates column names; a star means every column.</p>${t.practice ? manifestHTML() : `<p>You are now reading the town Ledger. Open Fields to see its columns.</p>`}<p>${esc(t.tip)}</p><details class="lesson"><summary>Show a worked answer</summary><div class="lb"><pre class="code">${codeHL(t.sql)}</pre></div></details>`); const tabs = tablesIn(t.sql + ' ' + (t.check || '')), full = !!Q && !Q.roll; let w = null; try { w = Engine.target(t); } catch (e) { }
    const maxH = c.noHint ? 0 : Q && Q.kind === 'contract' ? 3 : 1, lv = c.hint + 1, cost = hintCost(lv, c.r), key = S.hints > 0 && cost > 0;
    sheet(`<h2>Help</h2><section class="sec"><h2>Tables</h2>${tabs.map(n => `<details class="lesson"><summary>${n}</summary><div class="lb"><div class="ret">${(COLS[n] || []).map(x => `<code>${x}</code>`).join('')}</div>${tableHTML(Engine.peek(n), 4)}</div></details>`).join('')}<div class="row"><button class="btn sm quiet" data-a="atlas">All tables</button></div></section>
      <section class="sec"><h2>Expected result</h2>${t.kind === 'dml' ? `<p class="cap2">Afterwards this must return:</p><pre class="code">${codeHL((t.check))}</pre>` : ''}${w ? (full ? tableHTML(w, 8) : `<p>${w.rows.length} row${w.rows.length === 1 ? '' : 's'}, with these columns:</p><div class="ret">${w.cols.map(x => `<code>${esc(x)}</code>`).join('')}</div>`) : ''}<p class="cap2">Column names can differ. Values and column order${t.order ? ', and row order,' : ''} must match.</p></section>
      <section class="sec"><h2>Hint</h2>${c.hints.join('')}${maxH === 0 ? '<p class="cap2">No hints for this one.</p>' : c.hint >= maxH ? '<p class="cap2">No more hints.</p>' : `<div class="row"><button class="btn sm" data-a="hint">${['', 'A nudge', 'The shape of the answer', 'The answer'][lv]} · ${cost ? (key ? 'uses a Hint Key' : cost + ' gold') : 'free'}</button></div>`}</section>
      ${Q && Q.lesson ? `<section class="sec"><h2>The lesson</h2>${lessonHTML(Q.lesson, false)}</section>` : ''}`);
  }
  function takeHint() {
    const c = ctx(); if (!c || c.noHint) return; const maxH = Q && Q.kind === 'contract' ? 3 : 1; if (c.hint >= maxH) return; const lv = c.hint + 1, cost = hintCost(lv, c.r), key = S.hints > 0 && cost > 0;
    if (!key && S.gold < cost) return toast(`That hint costs ${cost} gold`); if (key) S.hints--; else S.gold -= cost; c.hint = lv; const t = c.task, txt = lv === 1 ? (t.hint || clauseHint(t.sql)) : lv === 2 ? skeleton(t.sql) : pretty(t.sql);
    if(Q&&lv===3)recordLearning(Q.task,{ok:false,assisted:true,first:false});
    c.hints.push(`<div class="hintbox"><b>${['', 'Nudge', 'Shape · pay −25%', 'Answer · pay −75%'][lv]}</b>${lv === 1 ? `<span>${esc(txt)}</span>` : `<pre class="code">${codeHL(txt)}</pre>`}</div>`); renderHud(); save(); helpSheet(true);
  }

  /* ---------- full-screen exercises: learn, your turn, result. One job a screen. ---------- */
  let Q = null;
  const REPS = FirstDay.tasks;
  let practiceDb = null;
  const manifestDb = () => practiceDb || (practiceDb = Engine.scratch(FirstDay.script));
  const practiceGrade = (task, sql) => task.practice ? FirstDay.grade(manifestDb(), task, sql, Engine) : Engine.grade(task, sql);
  function tutTask() {return prepareLearning(Learning.next(learningState(),{circle:0,specialist:'intro',seed:rid()})||{kind:'read',ask:'Show the name of every item in items.',ret:'name',sql:'SELECT name FROM items',tables:['items'],kw:['SELECT','FROM']});}
  function openQ(cfg) { closeSay(); closeSheet(); Q = Object.assign({ tries: 0, hint: 0, hints: [], i: 0 }, cfg);if(Q.task)Q.task=prepareLearning(Q.task);if(Q.lesson)introduceConcepts(Learning.conceptsFor(Q.lesson.code)); if (!Q.step) Q.step = Q.lesson && Q.first ? 'learn' : 'turn'; Scene.pause(); $('#enc').hidden = false; $('#nav').hidden = true; drawQ(); }
  function closeQ() { const then = Q && Q.then; Q = null; $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; closeSheet(); Scene.refresh(); render(); if (then) then(); }
  function fitQ() { const d = $('#q-dock'), b = $('#q-body'); if (d && b) b.style.paddingBottom = getComputedStyle(d).position==='absolute'?d.offsetHeight + 14 + 'px':'8px'; }
  const showOut = () => { fitQ(); const o = $('#q-out'); if (o && o.scrollIntoView) o.scrollIntoView({ block: 'start', behavior: FAST() ? 'auto' : 'smooth' }); };
  function introTaskLesson() {
    const lessons = {2:['Choose two columns','A comma separates column names. The result keeps their written order.','SELECT name, quantity FROM manifest;'],3:['Read every column','The star (*) asks for every column. It does not change the table.','SELECT * FROM manifest;'],4:['From practice to the town records','For the rest of our lessons, we use a training copy of the company books, with larger tables of items, customers and other records. The dates in this copy have been set for the exercises, so use the dates you’re given. Tap Fields to see the columns. The SELECT and FROM pattern still works.','SELECT name FROM items;']};
    const l = lessons[Q.i]; return l ? `<details class="lesson" open><summary>${l[0]}</summary><div class="lb"><p>${l[1]}</p><pre class="code">${codeHL(l[2])}</pre></div></details>` : '';
  }
  const heavyArmor = () => {const arm=itemById(S.eq.armor);return !!arm&&EquipmentRules.materialOf(arm)?.family==='metal';};
  function queryOddsHTML() {
    if(!Q.roll)return '';
    if(Q.work==='recover')return '<p class="cap2">A useful query restores mana and up to 12 stamina. A wrong result leaves those amounts where they are.</p>';
    const chance=grade=>Q.work==='hide'?Math.round(Sneaking.chance(rv('hiding'),Q.diff,{correct:1,close:.6,wrong:0}[grade],heavyArmor(),bonus('quieting'))):Q.work==='lock'||Q.work==='force'?SkillCrafting.lockChance(rv(Q.csk),Q.diff,{correct:1,close:.6,wrong:0}[grade],Q.work==='lock'):Q.work&&grade==='wrong'?0:odds(rv(Q.csk),Q.diff,grade).p;
    return `<p class="cap2">Your chance of success is ${chance('correct')}% if the query is correct, ${chance('close')}% if it’s close, and ${chance('wrong')}% if it’s wrong.${Q.work==='hide'&&heavyArmor()?' Heavy armor lowers concealment by 20 percentage points.':''}</p>`;
  }
  function drawQ() {
    if(Q.task)Q.task=prepareLearning(Q.task);
    const el = $('#enc'), t = Q.task, hasL = !!Q.lesson || Q.kind === 'intro', names = hasL ? ['Learn', 'Your turn', 'Result'] : ['Your turn', 'Result'];
    const head = cur => `<header class="q-head"><button class="q-x" data-a="qleave">‹ Leave</button><div class="q-steps">${names.map(s => `<span class="${s === cur ? 'on' : ''}">${s}</span>`).join('<i>›</i>')}</div></header>`;
    el.className = 'q'+(Q.roll?' action-query':'');
    if (Q.step[0] === 'i') return drawIntro(el, head('Learn'));
    if (Q.step === 'practice-result') { el.innerHTML = head('Result') + `<div class="q-body">${Q.result}</div><footer class="q-foot"><button class="btn solid big" data-a="introcontinue">Continue</button></footer>`; return; }
    if (Q.step === 'learn') {
      const l = Q.lesson, parts = l.body.split(/(?<=[.!?])\s+(?=[A-Z])/), lead = parts.slice(0, 2).join(' '), rest = parts.slice(2).join(' '); let ex = null; if (ready && /^\s*(SELECT|WITH)\b/i.test(l.code)) { ex = Engine.runRead(l.code); if (ex.err) ex = null; }
      el.innerHTML = head('Learn') + `<div class="q-body">${Q.prerequisites?.length?`<section class="sec"><h3>This builds on earlier techniques</h3><p>Read these examples first, or choose one to practise it before continuing.</p>${Q.prerequisites.map(id=>conceptHTML(id,true)).join('' )}</section>`:''}<p class="eyebrow">${CIRCLE[Q.r]} Circle</p><h2>${esc(l.title)}</h2><p>${esc(lead)}</p><p class="lab">Example</p><pre class="code" data-lesson-example>${codeHL(l.code)}</pre>${ex ? `<p class="lab">What it returns</p>${tableHTML(ex, 5)}` : ''}${rest ? `<details class="lesson"><summary>More</summary><div class="lb"><p>${esc(rest)}</p></div></details>` : ''}</div><footer class="q-foot"><button class="btn solid big" data-a="qturn">Try it</button></footer>`; return;
    }
    if (Q.step === 'turn') {
      el.innerHTML = head('Your turn') + `<div class="q-body" id="q-body"><p class="eyebrow">${Q.tasks ? `${Q.i + 1} of ${Q.tasks.length}` : esc(Q.title || '')}</p>${Q.kind==='learning'?'<p class="practice-safety">Free, untimed dojo practice · no lasting resource loss or RPG rewards</p>':''}${t.teaching||''}${t.tip ? `<p class="tip">${esc(t.tip)}</p>` : ''}${Q.kind === 'intro' ? introTaskLesson() : Q.kind === 'firstpractice' ? `<p>Choose a basic attack, then write its query. You can learn special techniques at the dojo and equip them in your Technique Book.</p><div class="row">${fightPages().filter(p=>p.c===1&&!p.rare).map(p=>`<button class="btn" data-a="practicepage" data-id="${p.id}" aria-pressed="${Q.practicePage===p.id}">${p.book==='spell'?'Spark':'Attack'}${Q.practicePage===p.id?' · chosen':''}</button>`).join('')}</div>` : ''}<p class="ask">${esc(t.ask)}</p>${needsHTML(t)}${queryOddsHTML()}<div id="q-out"></div></div>
        <div class="dock" id="q-dock">${kbHTML(t, Q.r, Q.work ? ({hide:'Hide',recover:'Recover',lock:'Pick lock',force:'Force lock',craft:'Craft'}[Q.work]||'Run') : Q.roll ? 'Craft' : 'Run')}</div>`;
      $('#q-body .ask').insertAdjacentHTML('afterend','<div class="query-tools"><button class="btn sm quiet" data-a="ftables">Tables</button><button class="btn sm quiet" data-a="help">Help</button></div>');
      kbDraw();if(Q.draft!=null){$('#sql').value=Q.draft;kbGrow();} kbFocus(); fitQ(); return;
    }
    el.innerHTML = head('Result') + `<div class="q-body">${Q.result}</div><footer class="q-foot">${Q.nextId ? `<button class="btn big" data-a="qnext">Next exercise</button>` : ''}<button class="btn solid big" data-a="qleave">Continue</button></footer>`;
  }
  function manifestHTML(mode) {
    return `<div class="tw"><table class="res manifest"><caption>Marigold supplies · table: manifest · all 3 rows</caption><thead><tr>${FirstDay.columns.map(c => `<th>${mode === 'column' ? `<button class="table-pick" data-a="introcheck" data-kind="column" data-v="${c}">${c}</button>` : esc(c)}</th>`).join('')}</tr></thead><tbody>${FirstDay.rows.map((r, i) => `<tr>${r.map((v, j) => `<td>${mode === 'row' && j === 0 ? `<button class="table-pick" data-a="introcheck" data-kind="row" data-v="${i}">${esc(v)}</button>` : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function drawIntro(el, head) {
    if (!ready) { el.innerHTML = head + `<div class="q-body">${wait()}</div>`; return; }
    let title, body, next;
    const feedback = Q.bout || '';
    if (Q.step === 'i1') { title = 'Help unload the Marigold'; next = 'irow'; body = `<p>Tamsin needs to tell the porter what’s aboard and where to carry it. Odalys has made a small practice copy of the ship’s manifest, so you can learn without changing the crew’s records.</p><p><b>SQL</b> (often said “sequel”) is the language that gives skilled actions their power here. Before you try it with a weapon or a spell, we’ll practise by asking questions about these supplies. Your Ledger holds the practice records and shows the answers your queries return.</p><p>A <b>table</b> is a collection of related records arranged in rows and columns. This table is called <code>manifest</code>.</p>${manifestHTML()}<p>Each entry describes a supply. The column names tell you what each value means.</p>`; }
    else if (Q.step === 'irow') { title = 'A row describes one supply'; next = 'icol'; body = `<p>There are 12 pieces of bread for the galley. Its name, quantity and destination together make one <b>row</b>.</p><p>Tap <b>Bread</b> to identify its row.</p>${manifestHTML('row')}${feedback}`; }
    else if (Q.step === 'icol') { title = 'A column holds one kind of fact'; next = 'i2'; body = `<p>The <code>quantity</code> column holds the amount of every supply. A single cell is one value, such as the bread’s quantity of 12.</p><p>Tap the column that tells the porter where to take each supply.</p>${manifestHTML('column')}${feedback}`; }
    else if (Q.step === 'i2') { title = 'Read a table with a query'; next = 'ipredict'; body = `<p>A <b>query</b> is an instruction written in SQL. This one reads the supply names:</p><pre class="code">${codeHL('SELECT name FROM manifest;')}</pre><p class="lab">Result: one name for every supply</p>${tableHTML(manifestDb().read('SELECT name FROM manifest'))}<p><code>SELECT name</code> chooses the name column. <code>FROM manifest</code> identifies the table. The result keeps all three rows and only the column you asked for.</p><details class="lesson"><summary>Show the original manifest</summary><div class="lb">${manifestHTML()}</div></details><p>Spaces separate words. A semicolon can mark the end; it is optional here. Reading the table does not move supplies or change their records.</p>`; }
    else if (Q.step === 'ipredict') { title = 'Read the result'; next = 'i3'; body = `<pre class="code">${codeHL('SELECT name FROM manifest;')}</pre><p>What will this query return?</p><div class="intro-choices"><button class="btn" data-a="introcheck" data-kind="result" data-v="names">Bread, Healing Draught, Rope</button><button class="btn" data-a="introcheck" data-kind="result" data-v="quantities">12, 4, 6</button></div>${feedback}`; }
    else { title = 'Build the porter’s query'; const B = Q.blank || (Q.blank = [null, null]), full = B[0] && B[1]; body = `<p>The porter needs every destination. Choose the column after SELECT and the table after FROM. Tap a filled blank to change it.</p>${manifestHTML()}<div class="blanks"><b>SELECT</b><button class="blank" data-a="unblank" data-i="0" aria-label="Column blank">${B[0] || 'column'}</button><b>FROM</b><button class="blank" data-a="unblank" data-i="1" aria-label="Table blank">${B[1] || 'table'}</button></div><div class="chips big">${['manifest', 'name', 'quantity', 'destination'].map(w => `<button class="k" data-a="blank" data-w="${w}"${B.includes(w) ? ' disabled' : ''}>${w}</button>`).join('')}</div>${feedback}`;
      el.innerHTML = head + `<div class="q-body"><h2>${title}</h2>${body}</div><footer class="q-foot">${Q.bok ? '<button class="btn solid big" data-a="qstep" data-s="reps">Write a query yourself</button>' : `<button class="btn solid big" data-a="blankrun"${full ? '' : ' disabled'}>Run</button>`}</footer>`; return; }
    const needed = {irow:'row',icol:'column',ipredict:'result'}[Q.step], unlocked = !needed || !!S.seen['intro.' + needed];
    el.innerHTML = head + `<div class="q-body"><p class="eyebrow">Your first SQL lesson · Odalys Brine</p><h2>${title}</h2>${body}</div><footer class="q-foot"><button class="btn solid big" data-a="qstep" data-s="${next}"${unlocked ? '' : ' disabled'}>Continue</button></footer>`;
  }
  function introCheck(d) {
    if (!Q || Q.kind !== 'intro') return;
    const expected = {row:['irow','0'],column:['icol','destination'],result:['ipredict','names']}[d.kind];
    if (!expected || Q.step !== expected[0]) return;
    const ok = d.v === expected[1]; if (ok) S.seen['intro.' + d.kind] = 1;
    Q.bout = `<div class="verdict ${ok ? 'good' : 'bad'}"><p>${ok ? {row:'Yes. That row contains all three facts about the bread.',column:'That’s right. The destination column tells us where to take each supply.',result:'That’s right. SELECT name puts the names in the result. You can still see the quantities in the manifest.'}[d.kind] : {row:'That is another supply. Find Bread in the first column.',column:'Look for the column with Galley, Healer, and Harbour underneath.',result:'The query selects name, so its result contains names. Quantity would return the numbers.'}[d.kind]}</p></div>`; save(); drawQ();
  }
  function blankRun() {
    const B = Q && Q.blank; if (!B || !B[0] || !B[1]) return;
    const res = FirstDay.grade(manifestDb(), {sql:'SELECT destination FROM manifest'}, `SELECT ${B[0]} FROM ${B[1]}`, Engine); S.stats.q++;
    if (!res.ok) Q.bout = `<div class="verdict bad"><h3>Try another choice</h3><p>${res.err ? esc(res.err) : 'The porter needs destinations. Choose destination after SELECT and manifest after FROM.'}</p><p>You can change the blanks and try again. Practice mistakes cost nothing.</p></div>`;
    else { S.stats.ok++; Q.bok = true; S.seen['intro.assembled'] = 1; cmdTeach('intro'); cmdLearn('SELECT destination FROM manifest'); Q.bout = `<div class="verdict good"><h3>The porter has the destinations</h3><p>Each row gives the destination for one supply. The source records are unchanged.</p></div>${tableHTML(res.got)}`; }
    save(); drawQ();
  }
  function runQ() {
    if (!ready || !Q || Q.step !== 'turn') return; if(Q.kind==='firstpractice'&&!Q.practicePage)return toast('Choose a basic attack before writing its practice query.'); const sql = $('#sql').value; if (!sql.trim()) return toast('Write a query first');
    if(Q.kind==='learning')return runLearning(sql);
    const res = practiceGrade(Q.task, sql), o = $('#q-out'); S.stats.q++;
    if (res.err) { Q.syntaxError=true;o.innerHTML = `<div class="verdict err"><h3>That query didn’t run</h3><p>${esc(res.err)}</p><p class="cap2">Errors cost nothing. Fix it and run it again.</p></div>`; return showOut(); }
    recordLearning(Q.task,{ok:res.ok,assisted:Q.hint>0||!!Q.syntaxError||Q.kind==='intro'||Q.kind==='firstpractice',first:Q.tries===0,sql});
    if (res.ok) { S.stats.ok++; if (Q.tries === 0 && Q.kind!=='intro' && Q.kind!=='firstpractice') { S.streak++; S.best = Math.max(S.best, S.streak); } if(Q.hint<3){if(Q.kind==='intro'||Q.kind==='firstpractice')cmdLearn(sql);else trainSql(res.used || [], Q.r, sql);} } else { Q.tries++; if(Q.kind!=='intro'&&Q.kind!=='firstpractice')S.streak = 0; }
    if (Q.roll) return craftRoll(res);
    if (!res.ok) { const d = res.diff ? tableHTML({ cols: ['', ...res.want.cols], rows: [['yours', ...res.diff.yours], ['wanted', ...res.diff.target]] }) : ''; o.innerHTML = `<div class="verdict bad"><h3>Not yet</h3><p>${esc(res.msg)}</p>${d}</div>${res.got ? '<p class="lab">What your query returned</p>' + tableHTML(res.got, 6) : ''}`; save(); return showOut(); }
    if (Q.kind === 'intro' && Q.tasks && Q.i < Q.tasks.length - 1) { S.seen['intro.rep.' + Q.i] = 1; Q.result = `<h2>That query worked</h2><p>${Q.task.practice ? 'These are the requested facts from the practice manifest.' : 'These facts came from the town’s full records. The same query pattern works on a larger table.'}</p>${tableHTML(res.got, 8)}<p>Read the column headings and one row before continuing.</p>`; Q.step = 'practice-result'; save(); return drawQ(); }
    if (Q.tasks && Q.i < Q.tasks.length - 1) { Q.i++; Q.task = Q.tasks[Q.i]; Q.tries = 0; toast('Correct'); save(); return drawQ(); }
    finishQ(res);
  }
  function introAfter() {
    const o = Scene.find(e=>e.kind==='odalys') || Scene.find(e=>e.kind==='npc'&&e.r===1&&e.i===0);
    if (!o) return;
    CE=o; dlg(o, ['"You’ve got the first pattern. Take a look at the result each time you run it, so you can see whether it answered your question."','"Here in Brasswake, we use queries for more than looking up deliveries. The Ledger helps us work a spell or handle a weapon. Each ability is called a page, and you learn it in one of your four books. You choose an ability from a book, then answer its question. A correct query gives your ability full power. A useful partial answer makes it weaker."','"Let’s try it on the dummy. You can practise here as often as you need to, since it can’t fight back."'], [{t:'Practise on the dummy',a:'intropractice'},{t:'Review the first lesson',a:'start',d:{k:'intro'}},{t:'Meet the SQL specialists',a:'learninghub',d:{r:1}}]);
  }
  function finishQ(res) {
    const t = Q.r, lk = luck(), k = Q.kind, o = { gold: 0, mats: {}, items: [], scrolls: [] }; let head = 'Correct', note = '', mult = 1;
    if (Q.tries === 0 && Q.hint === 0) mult += .2; if (Q.hint === 2) mult -= .25; if (Q.hint >= 3) mult = .25;
    if (k === 'contract') { const again = !!S.done[Q.id], paid = !!A.paid[Q.id], cur = CONTRACTS.find(c => c.id === Q.id); o.gold = again || paid ? 0 : (15 * t + 10) * mult;
      if (!again) { S.done[Q.id] = { t: now(), tries: Q.tries, hint: Q.hint }; if (!paid) { A.paid[Q.id] = 1; o.mats[t] = 1; if (rnd() < .3) o.items.push(makeItem(rollRarity(lk), t)); } } else note = 'From memory. It pays once.';
      if (!again) note = FOLK[t - 1][giverOf(cur)][0] + ': ' + (cur.after || TALK.praise[t - 1][giverOf(cur)]); if (!again && paid) note += ' Already paid once, to another of your characters.'; head = again ? 'Still sharp' : 'Exercise done'; const nx = CONTRACTS.find(c => c.r === t && !S.done[c.id] && giverOf(c) === giverOf(cur)); Q.nextId = nx ? nx.id : null; }
    else if (k === 'rounds') { o.gold = (8 * t + 6) * mult; o.mats[t] = 1; Q.inst.done = true; head = 'Drill done'; if (S.rounds.tasks.every(x => x.done) && !S.rounds.claimed) { S.rounds.claimed = true; const top = maxRegion(); o.items.push(makeItem(rollRarity(lk, 1), top)); o.sigils = 1; o.gold += 30 * top; note = 'All five drills done. The day’s chest is yours.'; } }
    else if (k === 'rumor') { o.gold = 40 * t; S.rum[Q.id] = now(); o.items.push(uniq(Q.drop)); o.sigils = 1; o.scrolls.push('c' + t + 'r'); head = 'Rumor checked'; }
    else if (k === 'firstpractice') { S.seen['intro.practice']=1; if(gOn()&&S.gd<=gix('odalys')){S.gd=gix('fight');gEnter(true);} head='Your first ability'; note='Your query worked against the dummy. In a real fight, a correct result gives full attack power. Your weapon skill sets your chance to hit, and your equipment and chosen ability matter too. Tamsin is outside and can walk with you to the green.'; const d=Scene.find(e=>e.kind==='dummy'); if(d){Scene.FX.swing('me',d,S.path==='mage'?'spell':'hit');Scene.FX.hit(d,'✓','#ffe9a0');} }
    else if (k === 'intro') { const first = !S.met['1.0']; S.met['1.0'] = 1; S.done.c101 = S.done.c102 = { t: now(), tries: 0, hint: 0 }; o.gold = first ? 25 : 0; S.tut = Math.max(1, S.tut); S.seen['intro.rep.' + (REPS.length - 1)] = 1; if (gOn() && S.gd <= gix('odalys')) { S.gd = gix('odalys'); gEnter(true); } head = 'First lesson done'; note = 'You used SQL to read the ship’s manifest and the company books. Now the porter can see where the supplies go. You can revisit these examples whenever you want more practice.'; Q.then = introAfter; }
    const g = grant(o), clean = Q.tries === 0 && Q.hint === 0 && k !== 'intro' && k !== 'firstpractice' ? '<p><span class="pill ok">first try, no hints +20%</span></p>' : ''; tick(); save(); renderHud();
    Q.result = `<p class="eyebrow">Result</p><h2 class="good">${esc(head)}</h2>${note ? `<p class="story">${esc(note)}</p>` : ''}${clean}${spoilsHTML(g)}${res && res.got && Q.task.kind !== 'dml' ? '<p class="lab">What your query returned</p>' + tableHTML(res.got, 8) : ''}`; Q.step = 'result'; drawQ();
  }
  function craftRoll(res) {
    if(Q.work)return finishSkillWork(res);
    const t = Q.r, x = Q.recipe, pg = bestPage('craft'), o = odds(rv(Q.csk), Q.diff, res.grade, res.share), win = rnd() * 100 < o.p, gl = [], g0 = gain(Q.csk, Q.diff, { correct: 1, close: .6, partial: .4, wrong: 0 }[res.grade]); if (g0) gl.push(g0); let body;
    Sound.sfx(win ? Q.csk === 'alchemy' ? 'alchemy' : 'smith' : 'craftFail');
    if (win) { const exc = res.ok && rnd() * 100 < rv(Q.csk) + (pg && pg.rare ? 20 : 0), out = { items: [] }; let head; S.mats[t] = have(t) - x.mats; if (x.sigils) S.mats.sigil = have('sigil') - x.sigils;
      if (x.id === 'scroll') { S.hints += exc ? 2 : 1; head = exc ? 'Two Hint Keys' : 'A Hint Key'; } else if (x.id === 'tonic') { S.tonics += exc ? 2 : 1; head = exc ? 'Two Healing Draughts' : 'A Healing Draught'; }
      else { const it = makeItem(x.id,t,Q.slot,Q.slot==='weapon'?(S.path==='mage'?'magery':armsSkill()):null,{source:'craft',material:Q.material,archetype:Q.archetype,skill:rv(Q.csk),queryQuality:queryQuality(res),difficulty:Q.diff,rarePage:!!pg?.rare});if(!it.equipment&&exc){for(const key in it.stats)it.stats[key]=Math.round(it.stats[key]*1.25);it.name='Exceptional '+it.name;}out.items.push(it);head=it.equipment?EquipmentRules.QUALITY[it.equipment.quality].name+' work':exc?'Exceptional work':'Well made'; }
      body = `<h2 class="good">${head}</h2>${spoilsHTML(grant(out))}`; }
    else { const lost = Math.ceil(x.mats / 2); S.mats[t] = Math.max(0, have(t) - lost); body = `<h2 class="bad">Ruined</h2><p>The piece is ruined. You lost ${lost} ${MATS[t]}.</p>`; }
    tick(); save(); renderHud(); Q.result = `<p class="eyebrow">Result</p><p class="rollline"><b class="g-${res.grade}">${GRADE_N[res.grade]}</b> query · ${o.p}% chance</p>${body}${gainsHTML(gl)}${res.ok ? '' : answerHTML(Q.task)}`; Q.step = 'result'; drawQ();
  }

  let LOCK = null;
  let benchMaterial='',benchArchetype='plate';
  const craftShapes={plate:'Plate Cuirass',chain:'Chain Shirt',leather:'Leather Jerkin',robe:'Travelling Robe'};
  function craftTemplate(){const w=S.path==='mage'?'magery':armsSkill();return {slot:benchSlot,w,name:benchSlot==='weapon'?(w==='magery'?'Oak Staff':w==='archery'?'Short Bow':'Iron Sword'):benchSlot==='armor'?craftShapes[benchArchetype]:({shield:'Wooden Shield',head:'Steel Helm',hands:'Leather Gloves',feet:'Leather Boots',cloak:'Wool Cloak'}[benchSlot]||'Ring')};}
  function craftMaterialHTML(){const materials=EquipmentRules.eligibleMaterials(craftTemplate(),here());if(!materials.length)return '';if(!materials.some(m=>m.id===benchMaterial))benchMaterial=materials[materials.length-1].id;return `${benchSlot==='armor'?'<h3>Armour construction</h3><div class="chips">'+Object.entries(craftShapes).map(([id,name])=>'<button class="chip'+(id===benchArchetype?' on':'')+'" data-a="craftshape" data-id="'+id+'">'+name+'</button>').join('')+'</div>':''}<h3>Material</h3><div class="chips">${materials.map(m=>`<button class="chip${m.id===benchMaterial?' on':''}" data-a="craftmaterial" data-id="${m.id}"><i class="material-swatch" style="--material:${m.palette.mid}"></i>${esc(m.name)}</button>`).join('')}</div><p class="cap2">Your material sets the surface and base improvement. Skill and query quality determine Standard, Fine, Exceptional or Masterwork craftsmanship. Magic is added separately at the enchanting station.</p>`;}
  const queryQuality = res => ({correct:1,close:.6,partial:.4,wrong:0})[res.grade] || 0;
  function beginSkillWork(work,options={}) {
    if(work==='recover'&&S.mana>=Progression.maxMana(S)&&S.stamina>=maxStamina())return toast('Mana and stamina are full. Visit a dojo for safe SQL practice.');
    if(work==='recover'&&activePursuit())return toast('Lose your pursuer before recovering outside combat.');
    if(!ready||Q||F)return;
    if(work==='hide'&&mounted())return toast('Dismount before hiding.');
    if(work==='hide'&&Scene.observed())return toast('Break their line of sight or get farther away before hiding.');
    const t=Math.max(1,Math.min(8,options.r||here())),tpl=pick(BOUNTIES.filter(b=>b.r===t && !/^b80[123]/.test(b.id)));
    if(!tpl)return;
    const recipe=SkillCrafting.find(options.recipe),sid=recipe?recipe.skill:work==='hide'?'hiding':work==='recover'?'meditation':work==='force'?'tactics':'lockpicking';
    openQ({kind:'skillwork',roll:true,work,owner:S,options,csk:sid,r:t,diff:options.diff==null?recipe?Math.min(95,recipe.diff+(t-1)*5):diffOf(t):options.diff,task:gOn()&&t===1?tutTask():prepareLearning(Learning.next(learningState(),{circle:t,seed:rid(),family:Learning.annotate(makeTask({tpl:tpl.id,seed:seeded(tpl.id)})).family})||makeTask({tpl:tpl.id,seed:seeded(tpl.id)})),title:recipe?recipe.name:work==='hide'?'Find cover':work==='recover'?'Recover mana and stamina':work==='force'?'Force the optional lock':'Pick and disarm the lock'});
  }
  function finishSkillWork(res) {
    if(!Q||Q.owner!==S)return;const q=queryQuality(res),sid=Q.csk,practiced=rv(sid),g=q&&(Q.work!=='recover'||S.mana<Progression.maxMana(S)||S.stamina<maxStamina())?gain(sid,Q.diff,q):null,gl=g?[g]:[],o=Q.options;let ok=false,note='';
    if(Q.work==='hide') {
      const pos=Scene.pos(),heavy=heavyArmor();
      ok=Sneaking.conceal(CONCEAL,{hiding:practiced,bonus:bonus('quieting'),stealth:rv('stealth'),diff:Q.diff,quality:q,heavy,x:pos[0],y:pos[1],random:rnd});
      note=ok?`You are concealed. Walk up to ${CONCEAL.steps} steps. Running or an offensive action reveals you. Observers can still detect you nearby.`:'You cannot find enough cover. Move away from watching enemies and try again.';
    } else if(Q.work==='recover') {ok=q>0;if(ok){const mana=S.mana,stamina=S.stamina;Progression.recover(S);note=`Recovered ${S.mana-mana} mana and ${S.stamina-stamina} stamina.`;}else note='The query gives no useful result.';
    } else if(Q.work==='craft') {
      const recipe=SkillCrafting.find(o.recipe);if(!recipe||!SkillCrafting.can(S,o.recipe,Q.r)){note='The materials are no longer available.';}
      else {ok=q>0&&rnd()*100<odds(practiced,Q.diff,res.grade,res.share).p;SkillCrafting.finish(S,o.recipe,Q.r,ok);note=ok?recipe.name+' crafted. '+recipe.note:'The work is spoiled. Half the materials are lost.';}
    } else if(LOCK&&LOCK.owner===S&&LOCK.key===o.key) {
      const forced=Q.work==='force';ok=q>0&&rnd()*100<SkillCrafting.lockChance(practiced,Q.diff,q,!forced);
      if(ok){(S.openLocks||(S.openLocks={}))[LOCK.key]=dayKey();const cb=LOCK.open;Q.then=()=>{if(S===QOWNER)cb();};const QOWNER=S;note=forced?'The lock gives way. The contents are safe.':'The lock opens and its trap is disarmed.';}
      else {const n=forced?3:Math.max(1,Math.round(Q.r*2*(1-rv('lockpicking')/150)));S.hp=Math.max(1,S.hp-n);note=`The lock holds and you lose ${n} health. You can try the lock again when you’re ready.`;}
    }
    save();renderHud();Q.result=`<p class="eyebrow">${esc(Q.title)}</p><h2>${ok?'Success':'Try again'}</h2><p>${esc(note)}</p>${gainsHTML(gl)}${res.ok?'':answerHTML(Q.task)}`;Q.step='result';drawQ();
  }
  function lockOffer(e,open) {
    const key=e.cid?'surface:'+e.cid:'dungeon:'+(DG?DG.r+':'+DG.f+':':'')+e.id;
    if(S.openLocks&&S.openLocks[key]===dayKey())return false;
    LOCK={key,owner:S,e,open};const diff=SkillCrafting.lockDifficulty(e.r,DG?DG.f:0);
    sheet(`<p class="eyebrow">Optional treasure</p><h2>A locked container</h2><p>The lid has a small trap. Pick and disarm it, or use Tactics to force the lock. Both methods use a query; a failed attempt costs a little health. Story keys and vault seals are separate.</p><div class="row wrap"><button class="btn" data-a="lockwork" data-kind="lock">Pick and disarm · ${SkillCrafting.lockChance(rv('lockpicking'),diff,1,true)}%</button><button class="btn quiet" data-a="lockwork" data-kind="force">Force · ${SkillCrafting.lockChance(rv('tactics'),diff,1)}%</button><button class="btn quiet" data-a="closesheet">Leave</button></div>`);return true;
  }
  function professionHTML() {const t=here();return `<h3>Carpentry and Inscription</h3><ul class="goods">${SkillCrafting.recipes.map(r=>`<li class="good">${ico(r.ic)}<div><b>${r.name}</b><small>${r.note} ${r.mats} ${MATS[t]}.</small></div><button class="btn sm" data-a="profession" data-id="${r.id}"${SkillCrafting.can(S,r.id,t)?'':' disabled'}>Craft</button></li>`).join('')}</ul>`;}
  function furnitureHTML(h) {return `<section class="sec"><h2>Crafted furnishings</h2><div class="row wrap">${['chest','bed','shelf'].filter(id=>S.furniture&&S.furniture[id]>0).map(id=>`<button class="btn sm" data-a="installfurniture" data-id="${id}" data-h="${h.id}">Install ${SkillCrafting.find(id).name} ×${S.furniture[id]}</button>`).join('')||'<span class="cap2">Craft furniture at a workbench.</span>'}${h.shelf?`<button class="btn sm quiet" data-a="studyshelf" data-h="${h.id}">Study · double gains for 10 minutes</button>`:''}</div></section>`;}

  /* ---------- on the map: fights, thefts and duels. A panel along the bottom, one question at a time. ---------- */
  let F = null, CE = null, DG = null;
  function bossAccess(e){return !isMain()?'Only the main character is entered in the Trials.':e.r===8&&[1,2,3,4,5,6,7].some(r=>!S.boss[r])?'The Council requires the other seven marks.':null;}
  function backstabReason(e, captured = false) {
    if(!e||!['mon','boss','guard','keeper'].includes(e.kind)||e.dead)return 'target';
    if(e.kind==='boss'&&bossAccess(e))return 'trial';
    const at=Scene.pos(),distance=Math.hypot(e.fx-at[0],e.fy-at[1]);
    const approached=CONCEAL.steps<CONCEAL.max&&Math.hypot(at[0]-CONCEAL.sx,at[1]-CONCEAL.sy)>=.9&&Math.hypot(e.x-CONCEAL.sx,e.y-CONCEAL.sy)>distance+.5;
    const weapon=itemById(S.eq.weapon);
    return Backstab.readiness({weapon:weapon&&weapon.w,shadow:!!bestPage('shadow'),arms:!!bestPage('arms'),stealth:rv('stealth'),stamina:S.stamina,hidden:CONCEAL.hidden,approached:captured||approached,rear:captured||Scene.behind(e),distance,visible:Scene.sight(e)});
  }
  const backstabNotes={weapon:'Equip a Fencing weapon.',books:'Learn an Arms page and a Shadows page.',stealth:'Train Stealth to 10.',stamina:'Backstab needs 8 stamina.',hidden:'Hide before approaching.',approach:'Walk closer while concealed.',rear:'Approach from behind.',distance:'Move beside the target.',sight:'The target is behind an obstacle.',target:'This target cannot be backstabbed.',trial:'Earn the required marks with your main character.'};
  function pickBackstab() {
    if(!F||F.busy||F.over||F.act!=='fight')return;
    const same=F.ambush&&F.ambush.owner===S&&F.ambush.at.every((v,i)=>v===Scene.pos()[i]);
    const reason=backstabReason(F.ent,!!same);if(!same||reason)return toast(backstabNotes[reason||'approach']);
    const page=bestPage('arms');pickPage(page.id);F.backstab=true;F.verb='Backstab';drawF();
  }
  const DP = DungeonPlay.create({state:()=>S,run:()=>DG,setRun:v=>DG=v,day:dayKey,now,scene:Scene,close:closeSheet,hud:renderHud,surface:()=>{S.pos=Scene.pos();surfaceBodies();},save,guideId:()=>gid(),
    guideStart:()=>{S.gd++;save();setTimeout(()=>gSay('"Beat the cellar rat, then open the chest beside the stairs. The deeper floors can wait."'),600);},guideChest:()=>setTimeout(()=>gDone('chest'),50),
    difficulty:diffOf,foe:mkFoe,fight:openF,toast,dialog:dlg,sheet,main:isMain,haveTable:r=>haveT(r),takeTable,grant,item:makeItem,rarity:rollRarity,luck,random:rnd,int:rint,unique:uniq,spoils:spoilsHTML,escape:esc,dye:maybeDye,unlock:(e,cb)=>lockOffer(e,cb)});
  function barsF() { if (!F) return; const b = F.foe ? [{ e: 'me', pct: S.hp / maxHp() }] : []; if (F.foe && F.ent) b.push({ e: F.ent, pct: F.foe.hp / F.foe.max, name: F.title }); Scene.FX.bars(b); }
  let uiLayoutFrame=0;
  function fitPanel() { if(!uiLayoutFrame)uiLayoutFrame=requestAnimationFrame(()=>{uiLayoutFrame=0;fitGameLayout();}); }
  function fitGameLayout() {
    const app=$('#app'),ar=app.getBoundingClientRect(),hud=$('#hud'),nav=$('#nav');
    app.style.setProperty('--hud-bottom',Math.ceil(hud.getBoundingClientRect().bottom-ar.top)+'px');
    app.style.setProperty('--nav-height',(nav.hidden?0:nav.offsetHeight)+'px');
    const sr=$('#stage').getBoundingClientRect(),panel=!$('#fight').hidden?$('#fight'):$('#enc').classList.contains('action-query')?$('#enc'):$('#fight');let right=0,bottom=0;
    if(!panel.hidden){const pr=panel.getBoundingClientRect();if(pr.width<sr.width*.88&&pr.left>sr.left+20)right=Math.max(0,sr.right-pr.left);else bottom=Math.max(0,sr.bottom-pr.top);if(F||DU)Scene.FX.inset(0);}
    if(sceneUp&&Scene.FX.viewport)Scene.FX.viewport({right,bottom},F?.ent||null);
  }
  window.addEventListener('resize',fitPanel);
  function openF(cfg) {
    if(S.horse?.mounted){S.horse=Mounts.dismount(S.horse);}
    closeSay();closeSheet();
    if(cfg.act==='fight'&&cfg.foe&&gOn()&&(gid()==='fight'||cfg.ent&&cfg.ent.tutorial)){cfg.foe.hp=cfg.foe.max=18;cfg.tutorialSafe=true;}
    const ambush=AMBUSH&&AMBUSH.e===cfg.ent&&AMBUSH.owner===S?AMBUSH:backstabReason(cfg.ent)===null?{e:cfg.ent,owner:S,at:Scene.pos()}:null;AMBUSH=null;
    F=Object.assign({st:'choose',round:0,busy:false,hint:0,hints:[],tries:0,chips:'',after:'',ambush},cfg);
    if(F.act==='fight'&&F.foe){F.engaged=!!(cfg.forced||F.ent&&(F.ent.forced||F.ent.engaged||F.ent.chase>0));if(F.engaged&&F.ent)F.ent.engaged=true;const old=Backstab.recall(WOUNDS,F.ent,S,F.kind,F.foe.max,Scene.tacticalTime());if(old){F.foe.hp=old.hp;F.round=old.round;}else if(F.engaged&&Number.isInteger(F.ent.battleRound))F.round=F.ent.battleRound;F.startRound=F.round;}
    Scene.FX.lock(true);if(F.ent)Scene.FX.face(F.ent);$('#fight').hidden=false;$('#nav').hidden=true;$('#ctx').hidden=true;$('#app').classList.add('infight');Scene.resume();barsF();drawF();if(F.act==='fight'&&S.tut>=1)coach('fight');
  }
  const BODY_MS0 = 10 * 60 * 1000; let BODY_MS = BODY_MS0;
  function dropBody() {
    Sound.sfx('death');
    if (gOn() && S.gd <= gix('bank')) return;
    // worn gear falls with you unless it is blessed or insured; insurance is paid from the bank, per item, per death
    const keep = new Set(), D = S.lastDeath = { lost: [], ins: [], fee: 0, broke: [] };
    for (const sl in (S.eq || {})) { const it = itemById(S.eq[sl]); if (!it) continue; if (it.unique || it.bless) { keep.add(it.id); continue; }
      if (it.ins) { const f = insFee(it); if (S.bank && S.bank.gold >= f) { S.bank.gold -= f; D.fee += f; D.ins.push(it.name); keep.add(it.id); continue; } D.broke.push(it.name); }
      it.was = sl; delete S.eq[sl]; D.lost.push(it.name); }
    const items = S.inv.filter(it => !keep.has(it.id)), loot = { gold: S.gold, items, scrolls: Object.entries(S.scr || {}).flatMap(([id, n]) => Array(n).fill(id)), mats: {}, food: {} };
    if (!loot.gold && !items.length && !loot.scrolls.length) return; S.gold = 0; S.inv = S.inv.filter(it => keep.has(it.id)); S.scr = {};
    const indoor = Scene.inInterior() && Scene.venueState(); const at = DG && DG.back ? DG.back : indoor ? indoor.back : Scene.pos(); S.remains = { x: at[0], y: at[1], r: DG ? DG.r : Scene.region(), loot, until: Date.now() + BODY_MS }; if (!DG) placeBody();
  }
  const deathNote = () => { const D = S.lastDeath; if (!D) return; S.lastDeath = null; if (D.ins.length) toast(`Insurance paid: ${D.fee} gold from the bank`); if (D.broke.length) toast(`Not enough in the bank to cover ${D.broke.join(', ')}`); if (D.lost.length) toast(`On your body: ${D.lost.join(', ')}`); };
  const insFee = it => Math.max(5, Math.round(price(it) * .2));
  function placeBody() { const B = S.remains; if (!B) return; const left = B.until - Date.now(); if (!(left > 0)) { S.remains = null; return; } if (Scene.inDungeonMap() || Scene.inInterior() || Scene.find(e => e.mine)) return;
    const at = Scene.safePosition([B.x, B.y], B.r || Geography.region(B.x, B.y) || S.region);
    if (!at) return;
    const moved = at[0] !== B.x || at[1] !== B.y;
    [B.x, B.y] = at;
    Scene.remains(B.x, B.y, B.loot, left / 1000);
    if (moved) save(); }
  function surfaceBodies() { if(!sceneUp)return;Scene.clearRemains();placeBody(); }
  function prepareDeath() {
    if(S.deathPending)return;
    resetTactics();
    if(DG)DP.snapshot();dropBody();
    const r=S.region,t=Scene.towns()[r],at=[t[0]-13,t[1]+10];
    S.deathPending={r,at};S.pos=at;S.dungeon=null;DG=null;
  }
  function wakeFromDeath() {
    prepareDeath();const d=S.deathPending;S.hp=maxHp();S.region=d.r;S.pos=d.at;S.deathPending=null;S.dungeon=null;DG=null;
    Scene.load(S.pos,S.region);S.pos=Scene.pos();surfaceBodies();save();
  }
  function discardEncounter() {
    resetTactics();
    // Account replacement and world changes must retire every old interaction.
    pendingSale=null;$('#toast').replaceChildren();FI=null;PK=null;WH=null;BJ=null;TR=null;LB=null;STY=null;PL=null;Scene.ghost(null);const placement=$('#placebar');if(placement)placement.remove();
    if(DDB){DDB.close();DDB=null;}DDK='';felt(0);
    const old=F;F=null;Q=null;LOCK=null;if(DU){clearInterval(DU.timer);DU=null;}
    if(old&&old.ent)Scene.FX.free(old.ent);Sneaking.reveal(CONCEAL);
    $('#fight').hidden=true;$('#fight').innerHTML='';$('#enc').hidden=true;$('#enc').innerHTML='';$('#nav').hidden=false;$('#app').classList.remove('infight');Scene.FX.lock(false);Scene.FX.bars([]);Scene.FX.inset(0);
  }
  function closeF() {
    if(F&&F.act==='fight'&&F.ent){if(F.engaged)F.ent.battleRound=F.round;if(!F.over&&!F.busy&&F.foe.hp>0){if(F.round>F.startRound)Backstab.remember(WOUNDS,F.ent,S,{kind:F.kind,hp:F.foe.hp,max:F.foe.max,round:F.round},Scene.tacticalTime());}else Backstab.forget(WOUNDS,F.ent);if(F.over||F.kick)Scene.endChase(F.ent);}
    unCoach('fight', 'fprompt', 'stealth'); const f = F; if (!f) return; F = null; $('#fight').hidden = true; $('#fight').innerHTML = ''; $('#nav').hidden = false; $('#app').classList.remove('infight'); Scene.FX.lock(false); Scene.FX.bars([]); Scene.FX.inset(0); if (f.ent) { Scene.FX.free(f.ent); f.ent.calm = 12; } closeSheet();
    if (f.kick) { wakeFromDeath(); toast(S.remains ? 'You wake at the healer’s. Belongings from upper rooms wait at their stairs, and dungeon belongings at the entrance. Other belongings stay where you fell.' : 'You wake at the healer’s, patched up'); deathNote(); }
    if (f.caughtStealing) Scene.chase(f.ent);
    Scene.refresh(); render(); if (f.kind === 'boss' && f.r === 8 && S.won && !S.ended) { S.ended = 1; save(); setTimeout(ending, 500); }
  }
  function taskFor(page) {
    if (F.tasks) return F.tasks(F.round); if ((S.tut < 2 || gOn()) && F.kind === 'monster' || F.ent&&F.ent.tutorial&&gOn()) return tutTask();
    const c = page.c, tpl = c === F.r && F.sig ? F.sig : pick(BOUNTIES.filter(b => b.r === c)).id,base=makeTask({tpl,seed:seeded(tpl)}),family=Learning.annotate(base).family;return prepareLearning(Learning.next(learningState(),{circle:c,family,seed:rid()})||base);
  }
  function nextEnemyIntent() {
    return BattleRules.intent({role:F.drole||(magicFoe()?'caster':'fighter'),boss:!!F.boss,magic:magicFoe(),circle:F.r},F.round);
  }
  function combatStatus() {
    if(F.act!=='fight'||!F.foe)return '';
    const hp=Math.max(0,S.hp),enemy=Math.max(0,F.foe.hp),intent=F.busy&&F.intent?F.intent:nextEnemyIntent();
    const health=(name,value,max,cls)=>`<div class="battle-health ${cls}"><span>${esc(name)} <b>${value} / ${max}</b></span><div role="meter" aria-label="${esc(name)} health" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="${max}"><i style="width:${Math.round(100*value/max)}%"></i></div></div>`;
    return `<div class="battle-status${hp<=maxHp()*.3?' danger':''}">${health('You',hp,maxHp(),'hero-health')}${health(F.title,enemy,F.foe.max,'foe-health')}<p class="combat-resources">Mana ${Math.round(S.mana)}/${Progression.maxMana(S)} · Stamina ${Math.round(S.stamina)}/${maxStamina()} · Bandages ${S.bandages||0}${F.defense&&F.defense.left>0?' · '+F.defense.label+' active':''}${F.focus?' · Focus: your next attack gains accuracy, damage and armor penetration':''}</p>${F.over?'':`<p class="battle-intent"><b>${F.busy?'Responding':'Next'}: ${esc(intent.label)}</b> <span>${esc(intent.detail)}</span></p>`}</div>`;
  }
  function attackChoices(p) {
    const skill=pageSkill(p),hit=attackChance(odds(rv(skill),F.diff,'correct').p+(F.focus||0),skill),w=resist(p.c,F.r);
    const primary=`<button class="pg${p.rare?' rare':''}" data-a="fpage" data-id="${p.id}"><b>${esc(p.name)}</b><em>${Math.round(hit)}% to hit${w<1?' · '+Math.round(w*100)+'% damage':''}</em></button>`;
    if(p.book==='spell')return primary;
    return `<div class="attack-choice">${primary}<div class="maneuver-choices">${['feint','cleave'].map(k=>{const m=BattleRules.maneuver(k,rv('tactics'));return `<button class="btn sm quiet" data-a="fmaneuver" data-id="${p.id}" data-stance="${k}"${S.stamina<m.stamina?' disabled':''}>${k==='feint'?'Feint':'Cleave'} · ${m.stamina} stamina</button>`;}).join('')}</div><small class="maneuver-note">Feint improves accuracy and evasion. Cleave hits harder and exposes you.</small></div>`;
  }
  function stashFightDraft() {const input=$('#fight #sql');if(F?.task&&input){F.drafts=F.drafts||{};F.drafts[F.task.sql]=input.value;F.editorState={start:input.selectionStart,end:input.selectionEnd,scroll:input.scrollTop,view:KB.list,system:KB.sys};}}
  function drawF() {
    if(F.live&&!F.over&&(F.st==='choose'||F.st==='after')){$('#fight').hidden=true;$('#nav').hidden=false;$('#app').classList.remove('infight');renderCombatUI(true);fitPanel();return;}
    $('#fight').hidden=false;
    if(F.st==='prompt'&&F.task)F.task=prepareLearning(F.task);
    const el = $('#fight'), f = F.foe, t = F.r; let h;
    if (F.st === 'choose') {
      const pgs = fightPages(), sh = bestPage('shadow'), canSteal = F.kind === 'monster' && !F.engaged && !F.round && !F.animal;
      const pocketsEmpty = canSteal && sh && F.ent.pocketsEmpty;
      const stealOk = canSteal && sh && !pocketsEmpty && (F.ent.unseen || rv('hiding') > 0); if (stealOk) setTimeout(() => coach('stealth'), 0);
      h = `<div class="f-head"><div><b>${esc(F.title)}</b><small>${CIRCLE[t]} Circle · choose one action</small></div><div class="f-btns">${qm('fight')}<button class="btn sm quiet" data-a="flee">${F.engaged?'Flee':'Back away'}</button></div></div><div class="f-pages">${pgs.map(attackChoices).join('') || '<p class="cap2">No attack page. Odalys Brine in Tallyport sells Strike and Spark.</p>'}${stealOk ? `<button class="pg sh" data-a="fsteal"><b>${esc(sh.name)}</b><em>${F.ent.unseen ? 'unseen' : `Hiding ${sneakPct()}%`}</em></button>` : ''}</div>`;
      if (pocketsEmpty) h += '<p class="cap2">You’ve already picked this creature’s pockets.</p>';
    } else if (F.st === 'escape') {
      h='<div class="f-head"><b>Disengaging</b></div><p>The foe can respond while you pull away.</p>';
    } else if (F.st === 'prompt') {
      h = `<div class="f-head"><div><b>${esc(F.verb)}</b><small id="f-odds">${fOdds()}</small></div><div class="f-btns">${F.act==='fight'?'<button class="btn sm quiet" data-a="fchoose">Back</button>':''}</div></div><div class="battle-question"><div class="query-task"><p class="ask">${esc(F.task.ask)} ${needLine(F.task)}</p><div class="query-tools"><button class="btn sm quiet${S.tut===1?' pulse':''}" data-a="ftables">Tables</button><button class="btn sm quiet" data-a="queryhelp">Help</button></div></div>${F.task.teaching?`<details class="first-technique"><summary>A new SQL concept</summary>${F.task.teaching}</details>`:''}<div id="f-hint" hidden>${F.hints.join('')}</div><div id="f-out"></div></div>${kbHTML(F.task, F.kc, F.verb)}`;
    } else {
      const controls=F.after.match(/<div class="row end">[\s\S]*<\/div>$/),body=controls?F.after.slice(0,controls.index):F.after;
      h = `<div class="f-head"><div><b class="g-${F.res.grade}">${F.instant?'Action resolved':GRADE_N[F.res.grade]}</b><small>${F.pline}</small></div>${F.act === 'fight' && !F.over ? `<button class="btn sm quiet" data-a="flee"${F.busy ? ' disabled' : ''}>Flee</button>` : ''}</div><div class="f-result">${F.instant?'':QueryFeedback.html(F.comparison, {power:F.queryPower,open:F.compareOpen,hidePower:F.act!=='fight',note:F.shown?'Shown answer · no practice':F.hint>=2?'Shape hint':F.utility&&F.hint?'Hint used':''})}<div class="swings" id="e-sw">${F.chips}</div><div id="f-after">${body}</div></div><div class="f-actions">${controls?controls[0]:''}</div>`;
    }
    if(F.st==='choose'){
      if(F.act==='fight'&&bestPage('shadow')){const reason=F.ambush?backstabReason(F.ent,true):backstabReason(F.ent);const choice=`<div class="backstab-choice"><button class="btn ${F.ambush&&!reason?'solid':'quiet'}" data-a="fbackstab"${F.ambush&&!reason?'':' disabled'}>Backstab · 8 stamina</button><p class="cap2">${F.ambush&&!reason?'Rear approach ready. Two rapid Fencing strikes deal '+Backstab.factor(rv('stealth')).toFixed(2)+'× damage each, then the target responds.':esc(backstabNotes[reason||'approach'])}</p></div>`;h=h.replace('<div class="f-pages">',choice+'<div class="f-pages">');}
      h+=combatTools();
    } if(F.act==='steal'&&F.st==='prompt')h=`<div class="row"><button class="btn sm quiet" data-a="fprize" data-id="purse">Purse · easier</button><button class="btn sm quiet" data-a="fprize" data-id="prize">${esc(F.prizeItem?F.prizeItem.name:F.kind==='rival'?rival(F.r).item.name:'Selected prize')} · −15 effective skill</button><span>${F.prize==='prize'?'Selected prize':'Purse'}</span></div>`+h;
    if (F.st !== 'choose') unCoach('fight', 'stealth'); if (F.st !== 'prompt') unCoach('fprompt');
    if(F.live&&F.st==='prompt')h=h.replace('data-a="fchoose"','data-a="combatback"');
    el.innerHTML = (F.live?'':combatStatus())+h; el.className = 'st-' + F.st+(F.live?' live-query':''); if (F.st === 'prompt') { kbDraw();if(F.drafts?.[F.task.sql]!=null){$('#sql').value=F.drafts[F.task.sql];kbGrow();}const memory=F.editorState;if(memory){const input=$('#sql');input.setSelectionRange(Math.min(memory.start,input.value.length),Math.min(memory.end,input.value.length));input.scrollTop=memory.scroll||0;KB.list=memory.view||null;kbDraw();hlSync();} kbFocus(); } renderCombatUI(true);fitPanel();
  }
  // the columns the answer needs, in a few words, after the question
  const needLine = t => t.kind === 'dml' ? '<span class="need">Check the resulting records.</span>' : `<span class="need">Return: ${esc(t.ret)}${t.order ? ' · sorted as asked' : ''}</span>`;
  const ROUNDS = () => 1; let HPEN = 15;
  const fPct = grade => {if(F.act!=='fight')return odds(rv(F.act==='steal'?'stealing':bestWeapon())+(F.bonus||0),F.diff,grade).p;const sid=pageSkill(F.page),move=BattleRules.maneuver(F.stance,rv('tactics'));return attackChance(odds(rv(sid),F.diff,grade).p-(F.hint===1?HPEN:0)+(F.focus||0)+(F.page.book==='spell'?0:move.accuracy),sid);};
  const fOdds = () => F.live ? F.kc+' Circle SQL · Paused' : F.utility ? 'Query quality · 1 response round' : F.act === 'fight' ? `${Math.round(fPct('correct'))}% to hit` : `${fPct('correct')}% if right · one try`;
  const fHintBtn = () => { const max = F.noHint ? 0 : 2; if (F.noHint) return ''; if (F.shown) return ''; return (F.hint >= max ? '' : `<button class="btn sm quiet" data-a="fhint">${F.hint ? 'Shape' : F.utility ? 'Hint · reduced power' : `Hint −${HPEN}%`}</button>`) + '<button class="btn sm quiet" data-a="fshow">Show me</button>'; };
  function fHint() {
    if (!F || F.st !== 'prompt' || F.act !== 'fight' || F.noHint) return; const max = 2; if (F.hint >= max) return; F.hint++; const t = F.task;
    F.hints = F.hints.filter(h => h.includes('class="fh tip"')).concat([F.hint === 1 ? `<p class="fh"><b>${F.utility ? 'Hint, reduced power and practice:' : `Hint, −${HPEN}% to hit:`}</b> ${esc(t.hint || clauseHint(t.sql))}</p>` : `<p class="fh"><b>Shape, at most 60% power:</b> <code>${esc(skeleton(t.sql).replace(/\s+/g, ' '))}</code></p>`]);
    $('#f-hint').innerHTML = F.hints.join(''); $('#f-odds').textContent = fOdds();if(KB.list==='help')kbDraw();fitPanel();
  }
  function fShow() {if(!F||F.st!=='prompt'||F.shown||F.noHint)return;stashFightDraft();sheet(`<h2>Show this answer?</h2><p>${F.utility?'This demonstration gives no useful support effect.':'This attack will have only 5% power.'} It grants no skill or attribute practice. The penalty lasts for this exchange, including if you change actions.</p><button class="btn solid" data-a="fshowconfirm">Show answer</button><button class="btn quiet" data-a="closesheet">Keep trying</button>`);}
  function fShowConfirmed() { if (!F || F.st !== 'prompt' || F.act !== 'fight' || F.shown || F.noHint) return; F.shown = 1;recordLearning(F.task,{ok:false,assisted:true,first:false});save(); F.hints = [`<p class="fh"><b>${F.utility?'Type it in. It gives no useful effect and teaches no skill:':'Type it in. It has only 5% power and teaches no skill:'}</b> <code>${esc(F.task.sql)}</code></p>`];
    $('#f-hint').innerHTML = F.hints.join(''); $('#f-odds').textContent = fOdds();if(KB.list==='help')kbDraw();fitPanel(); }
  function tablesSheet() {
    if ($('#sql')) return kbView('tables');
    const c = ctx(), t = c && c.task; if (!t) return; const tabs = t.tables || tablesIn(t.sql + ' ' + (t.check || ''));
    sheet(`<h2>Tables</h2>${tabs.map(n => `<section class="sec"><h2>${n}</h2><div class="ret">${(COLS[n] || []).map(x => `<code>${x}</code>`).join('')}</div>${tableHTML(Engine.peek(n, 12), 12)}</section>`).join('')}<div class="row"><button class="btn sm quiet" data-a="atlas">All tables</button><button class="btn sm quiet" data-a="klog">${S.klog ? 'Hide' : 'Show'} the key log</button></div><p class="cap2">The key log shows, under your query, the last keys the game read. Use it if the keyboard types something you did not press.</p>`);
  }
  function pickPage(id, stance = 'strike') {
    if (!F || F.busy || F.over || F.act !== 'fight') return; stashFightDraft(); const p = pageById(id); if (!p || !owned(id)) return; const sk2 = pageSkill(p); const move=BattleRules.maneuver(stance,rv('tactics'));if(p.book!=='spell'&&S.stamina<move.stamina)return toast('Not enough stamina for that maneuver.');F.stance=p.book==='spell'?'strike':stance;
    F.backstab=false;F.utility=null;F.instant=false; F.page = p; S.page = id; F.verb = p.book==='spell'?'Cast':stance==='feint'?'Feint':stance==='cleave'?'Cleave':WEAP[sk2].verb; F.kc = F.tasks ? F.r : p.c; if(F.taskRound!==F.round){F.preparedTasks={};F.drafts={};F.taskRound=F.round;F.readinessHelp=false;}const taskKey=id+':'+stance;F.task = F.preparedTasks[taskKey]||(F.preparedTasks[taskKey]=taskFor(p)); F.tries=0;const sameRound=F.prepRound===F.round;F.fixed=sameRound?F.fixed:0;F.hint=sameRound?F.hint:0;F.shown=sameRound?F.shown:0;F.prepRound=F.round;F.hints=F.shown?[`<p class="fh">An answer was shown this exchange. It grants no practice. <code>${esc(F.task.sql)}</code></p>`]:F.hint?['<p class="fh">The hint penalty carries across changing actions.</p>']:[]; F.oddsLine = `${odds(rv(sk2), F.diff, 'correct').p}% a swing if correct · ${odds(rv(sk2), F.diff, 'wrong').p}% if wrong`; F.st = 'prompt'; drawF(); coach('fprompt');
  }
  function pickSteal() {
    if (!F || F.kind !== 'monster' || F.round || F.busy || F.animal) return;if(F.shown||F.hint)return toast('Finish this hinted exchange before switching to theft. The disclosed penalty stays with the exchange.'); const e = F.ent, sh = bestPage('shadow'); if (!sh || e.pocketsEmpty) return;
    if (!e.unseen && !CONCEAL.hidden) {toast('Back away and Hide before approaching, or come from behind.');return;}
    Sneaking.reveal(CONCEAL); renderHud(); const c = Math.min(sh.c, F.r), tpl = c === F.r ? F.sig : pick(BOUNTIES.filter(b => b.r === c)).id; F.act = 'steal'; F.foe = null; F.page = sh; F.verb = 'Steal'; F.kc = c; F.bonus = 10 + (sh.rare ? 15 : 0) - 12 * Math.max(0, F.r - sh.c) + bonus('deft');
    F.prize=F.prize||'purse'; F.prizeItem=F.prizeItem||makeItem(rollRarity(luck()),F.r); F.task = S.tut < 2 ? tutTask() : makeTask({ tpl, seed: seeded(tpl) }); F.fixed = 0; F.hint = 0; F.hints = []; F.oddsLine = `${odds(rv('stealing') + F.bonus, F.diff, 'correct').p}% if correct · one try`; F.st = 'prompt'; barsF(); drawF();
  }
  function drawFightRepair() {
    const output = $('#f-out');
    output.innerHTML = QueryFeedback.html(F.comparison, { free: true, open: F.compareOpen });
    output.parentElement.scrollTop = 0;
    fitPanel();
  }
  function runF() {
    if (!ready || !F || F.st !== 'prompt' || F.busy) return; const sql = $('#sql').value; if (!sql.trim()) return toast('Write a query first');
    if(F.backstab&&(!F.ambush||F.ambush.owner!==S||!F.ambush.at.every((v,i)=>v===Scene.pos()[i])||backstabReason(F.ent,true))){F.backstab=false;F.st='choose';toast('The opening is gone. Hide and approach from behind again.');drawF();return;}
    if(F.act==='fight'&&F.page.book==='spell'&&!['guard','recover','bandage','study','draught'].includes(F.utility)&&S.mana<castingCost(F.page.c)&&!(S.prepared>0)){F.st='choose';toast('Not enough mana. Meditate, use a prepared scroll, or choose another ability.');drawF();return;}
    if(F.act==='fight'&&!F.utility&&!F.backstab&&F.page.book!=='spell'&&S.stamina<BattleRules.maneuver(F.stance,rv('tactics')).stamina){toast('Not enough stamina for that maneuver.');return;}
    if(F.utility==='bandage'&&!(S.bandages>0))return toast('You need a bandage. The healer sells them.');
    let res = Engine.grade(F.task, sql); S.stats.q++; F.compareOpen=false; F.comparison=res.ok?null:QueryFeedback.prepare(F.task,sql,res,Engine);
    if (res.err) { F.syntaxError=true;if (!F.fixed) { F.fixed = 1; return drawFightRepair(); }
      res = { ok: false, grade: 'wrong', share: 0, msg: 'It did not run: ' + res.err, used: [] }; }
    recordLearning(F.task,{ok:res.ok,assisted:!!F.hint||!!F.shown||!!F.syntaxError||!!F.readinessHelp,first:true,sql});F.syntaxError=false;
    if (res.ok) { S.stats.ok++; S.streak++; S.best = Math.max(S.best, S.streak); if(!F.shown)trainSql(res.used || [], F.kc, sql); } else S.streak = 0;
    F.queryPower=F.utility?(F.shown?0:QueryFeedback.power(res,{hint:F.hint})*(F.hint===1?.6:1)):QueryFeedback.power(res,{shown:F.shown,hint:F.hint}); F.res = res; F.chips = ''; F.after = '';if(F.act==='fight'){F.intent=nextEnemyIntent();F.engaged=true;if(F.ent)F.ent.engaged=true;} F.round++; resolveF(res);
  }
  const chip = (cls, txt, actor) => { const who=actor||(cls==='ouch'?F.title:'You');const h = `<span class="sw ${cls}">${esc(who)}: ${esc(txt)}</span>`; F.chips += h; const sw = $('#e-sw'); if (sw) sw.insertAdjacentHTML('beforeend', h); };
  function play(steps,done) {const encounter=F,owner=S,current=()=>F===encounter&&S===owner;if(FAST()){for(const step of steps){if(!current())return;step();}if(current())done();return;}let i=0;const next=()=>{if(!current())return;while(i<steps.length)if(steps[i++]()!==false)return setTimeout(next,330);if(current())done();};setTimeout(next,250);}

  function magicFoe() {return F.drole==='caster'||/Imp|Wisp|Witch|Lich|Wraith|Sphinx|Council|Mage|Acolyte/i.test(F.title);}
  function combatTools() {
    if(!F||F.act!=='fight')return '';
    const magic=!!bestPage('spell');
    const button=(id,label,disabled=false)=>`<button class="btn sm quiet" data-a="futility" data-id="${id}"${disabled?' disabled':''}>${label}</button>`;
    return `<div class="combat-tools">${button('guard','Guard')}${button('bandage','Bandage ×'+(S.bandages||0),S.hp>=maxHp()||!(S.bandages>0))}${button('recover','Meditate / recover')}${button('study','Study foe')}${magic?button('ward','Ward')+button('healspell','Healing spell',S.hp>=maxHp()):''}${S.tonics>0?`<button class="btn sm quiet" data-a="tonic"${S.hp>=maxHp()?' disabled':''}>Draught ×${S.tonics} · one response</button>`:''}${S.prepared?`<button class="btn sm quiet" data-a="fscroll" aria-pressed="${!!F.scroll}">${F.scroll?'Scroll selected':'Use prepared scroll'} ×${S.prepared}</button>`:''}</div><p class="cap2 combat-help">Support actions allow one response. Guard and Ward also protect your next exchange. Food is for resting after combat.</p>`;
  }
  function combatUtility(id) {
    if(!F||F.busy||F.over||!['guard','bandage','recover','ward','healspell','study'].includes(id))return;
    if(id==='bandage'&&!(S.bandages>0))return toast('You need a bandage. The healer sells them.');
    if(['bandage','healspell'].includes(id)&&S.hp>=maxHp())return;
    const p=id==='ward'||id==='healspell'?bestPage('spell'):fightPages()[0];if(!p)return;
    pickPage(p.id);F.utility=id;F.verb={guard:'Guard',bandage:'Bandage',recover:'Recover',ward:'Ward',healspell:'Heal',study:'Study'}[id];drawF();
  }
  function combatDraught() {
    if(!F||F.act!=='fight'||F.busy||F.over||S.tonics<1||S.hp>=maxHp())return;
    if(!F.page)F.page=fightPages()[0];if(!F.page)return;
    F.utility='draught';F.backstab=false;F.instant=true;F.shown=0;F.hint=0;F.queryPower=1;F.comparison=null;
    F.res={grade:'correct',quality:0};F.chips='';F.after='';F.intent=nextEnemyIntent();F.engaged=true;if(F.ent)F.ent.engaged=true;F.round++;
    resolveF(F.res);
  }
  function spendCasting() {const cost=castingCost(F.page.c);if(S.prepared>0&&(F.scroll||S.mana<cost)){S.prepared--;F.scroll=false;return true;}if(S.mana<cost)return false;S.mana-=cost;return true;}
  function enemySteps(steps,rounds,gl,q,context={}) {
    const f=F.foe,e=F.ent,intent=F.intent||nextEnemyIntent(),magic=intent.magic,shield=!!itemById(S.eq.shield);
    const swings=f.swings===0?0:F.animal||F.tutorialSafe?1:Math.max(0,intent.swings-(context.spellRare?1:0));
    let drained=false;
    for(let r=0;r<rounds;r++)for(let i=0;i<swings;i++)steps.push(()=>{
      if(f.hp<=0||S.hp<=0)return false;
      if(!F.defenseTrained&&q>0){F.defenseTrained=true;if(magic)supportGains(['resisting'],F.diff,q,gl);else if(shield)supportGains(['parrying'],F.diff,q,gl);}
      Scene.FX.swing(e,'me',magic?'spell':'hit');
      const opening=context.opening?-15:0;
      const chance=Math.max(10,Math.min(95,BattleRules.enemyHit(rv(context.skill||bestWeapon()),f.diff,intent.accuracy)+(F.maneuverIncoming||0)+opening));
      if(rnd()*100>=chance){chip('miss','miss',F.title);return;}
      if(!magic&&shield&&rnd()<Progression.parryChance(S)){chip('hit','blocked');Scene.FX.hit('me','block','#9be0da');return;}
      const defended=F.defense&&F.defense.left>0?(magic?F.defense.magic:F.defense.physical):0;
    const protection=(1-EquipmentRules.mitigation(bonus('def'),bonus('warding'),magic)/100)*(magic?Progression.resistFactor(S):1)*(1-defended);
      const d=Math.max(1,Math.round((rint(3,6)+2*F.r+(F.boss?2:0))*intent.damage*protection));
      S.hp=Math.max(0,S.hp-d);chip('ouch','−'+d);Scene.FX.hit('me','−'+d,'#f08070');
      if(intent.manaDrain&&!drained){drained=true;const drain=Math.min(S.mana,intent.manaDrain);S.mana-=drain;chip('ouch','−'+drain+' mana');}
      barsF();renderHud();refreshCombatStatus();
    });
    if(!swings)steps.push(()=>{if(f.hp>0&&S.hp>0)chip('lab',intent.label,F.title);});
  }
  function refreshCombatStatus() {const el=$('#fight .battle-status');if(F&&el)el.outerHTML=combatStatus();}
  function finishCombatQuery(res,gl,note='') {
    if(!F)return;F.busy=false;if(F.defense&&--F.defense.left<=0)F.defense=null;F.maneuverIncoming=0;if(!F.utility){S.mana=Math.min(Progression.maxMana(S),S.mana+2);S.stamina=Math.min(maxStamina(),S.stamina+4);}
    if(F.foe.hp<=0)return winF(res,gl);if(S.hp<=0)return loseF(res,gl);
    F.after=`${note?'<p>'+esc(note)+'</p>':''}${gainLine(gl)}<div class="row end"><button class="btn solid" data-a="fchoose">Choose next action</button></div>`;save();renderHud();drawF();
  }
  function resolveF(res) {
    const q=F.act==='fight'?(res.quality??queryQuality(res)):queryQuality(res),gl=[]; F.defenseTrained=false;
    if(F.act==='steal'){Sneaking.reveal(CONCEAL);renderHud();}
    if(F.act!=='fight') {const sid=F.act==='steal'?'stealing':bestWeapon(),o=odds(rv(sid)+(F.bonus||0),F.diff,res.grade,res.share),g=gain(sid,F.diff,q);if(g)gl.push(g);F.pline=`${o.p}% chance`;F.st='after';F.busy=true;drawF();const encounter=F,owner=S,win=rnd()*100<o.p,end=()=>{if(F!==encounter||S!==owner)return;F.busy=false;chip(win?'hit':'ouch',win?'success':'failed','You');win?winF(res,gl):loseF(res,gl);};return FAST()?end():setTimeout(end,500);}
    const p=F.page,sid=pageSkill(p),spell=p.book==='spell',utility=F.utility,steps=[],f=F.foe,e=F.ent;
    if((spell&&!['guard','recover','bandage','study','draught'].includes(utility))&&!spendCasting()){F.round--;F.st='choose';toast('Not enough mana. Meditate, use a prepared scroll, or choose another ability.');return drawF();}
    const quality=F.shown?0:q*(F.hint?.6:1);Sneaking.reveal(CONCEAL);F.ambush=null;
    F.st='after';F.busy=true;F.maneuverIncoming=0;F.pline=utility?'One response round':'Attack and retaliation';drawF();
    if(utility) {
      const effect=F.queryPower;
      const id=utility==='bandage'?'healing':utility==='recover'?'meditation':utility==='study'?(spell?'eval':'anatomy'):utility==='guard'?(itemById(S.eq.shield)?'parrying':'tactics'):'magery';
      if(utility!=='draught'){const g=gain(id,F.diff,quality);if(g)gl.push(g);}
      let note='The query gives no useful result.';
      if(utility==='bandage')S.bandages--;
      if(effect>0){
        if(utility==='guard'){const g=BattleRules.guard({shield:!!itemById(S.eq.shield),parrying:rv('parrying'),tactics:rv('tactics')});F.defense={physical:g.physical*effect,magic:g.magic*effect,left:2,label:'Guard'};note='You guard this response and your next exchange.';}
        if(utility==='bandage'){const n=heal(Progression.bandage(S)*effect);supportGains(['anatomy'],F.diff,quality,gl);note=`Bandaged ${n} health. One bandage used.`;}
        if(utility==='recover'){const before=S.mana,st=S.stamina;Progression.recover(S);S.mana=before+Math.round((S.mana-before)*effect);S.stamina=st+Math.round((S.stamina-st)*effect);note=`Recovered ${S.mana-before} mana and ${S.stamina-st} stamina.`;}
        if(utility==='ward'){const ward=BattleRules.ward(rv('inscription'))*effect;F.defense={physical:ward,magic:ward,left:2,label:'Ward'};supportGains(['inscription'],F.diff,quality,gl);note=`Ward reduces this response and your next by ${Math.round(ward*100)}%.`;}
        if(utility==='healspell'){const n=heal((8+rv('magery')*.4)*effect);note=`The spell restores ${n} health.`;}
        if(utility==='study'){const focus=BattleRules.study(rv(id));F.focus=Math.round(focus.accuracy*effect);F.focusPower=1+(focus.power-1)*effect;F.pierce=effect;note=`${magicFoe()?'This foe attacks with magic.':'This foe attacks physically.'} Your next attack gains ${F.focus} accuracy, ${Math.round((F.focusPower-1)*100)}% damage and armor penetration.`;}
        if(utility==='draught'){S.tonics--;const n=heal(30);note=`Drank a Healing Draught: +${n} health.`;}
      }
      enemySteps(steps,1,gl,quality);return play(steps,()=>finishCombatQuery(res,gl,note));
    }
    const stance=F.backstab?'backstab':F.stance||'strike',move=BattleRules.maneuver(stance,rv('tactics'));
    if(!spell){const cost=F.backstab?Backstab.STAMINA:move.stamina;if(S.stamina<cost)return;S.stamina-=cost;F.maneuverIncoming=move.incomingAccuracy;}
    const attackSkill=rv(sid),attackFactor=spell?Progression.spellFactor(S):Progression.physicalFactor(S),W=WEAP[sid],o0=odds(attackSkill,F.diff,'correct'),o=Math.max(2,Math.min(95,o0.p-(F.hint===1?HPEN:0)+(F.focus||0)+(!spell?move.accuracy:0))),g=gain(sid,F.diff,quality);
    if(g)gl.push(g);supportGains(spell?['eval']:['tactics','anatomy'],F.diff,quality,gl);
    const intent=F.intent||nextEnemyIntent(),armor=F.drole==='armored'?.8:1,physicalArmor=1-(1-armor*intent.physicalArmor)*(1-(F.pierce||0));
    const strike=EquipmentRules.attack({weapon:itemById(S.eq.weapon),skillId:sid,skill:attackSkill,damageBonus:bonus('xp'),accuracy:o,range:W.dmg,swings:F.backstab?Backstab.THRUSTS:W.swings+(p.rare&&p.book==='arms'?1:0),pageCircle:p.c,targetCircle:F.r,queryPower:F.queryPower,attributeFactor:attackFactor,physicalFactor:spell?1:physicalArmor*move.power,studyFactor:F.focusPower||1,ambushFactor:F.backstab?1+(Backstab.factor(rv('stealth'))-1)*quality:1,target:EquipmentRules.creatureProfile(F.title)});
    F.focus=0;F.focusPower=1;F.pierce=0;
    const n=F.backstab?Backstab.THRUSTS:W.swings+(p.rare&&p.book==='arms'?1:0);F.pline=`${F.backstab?'Backstab · ':''}${strike.accuracy}% a swing · 1 exchange`;
    if(!F.queryPower)chip('miss','No useful effect');
    for(let i=0;i<n&&F.queryPower>0;i++)steps.push(()=>{
      if(f.hp<=0||S.hp<=0)return false;
      Scene.FX.swing('me',e,spell?'spell':sid,spell?Effects.spell(p.c,p.rare):null);
      if(rnd()*100<strike.accuracy){const d=strike.damage(rint(W.dmg[0],W.dmg[1]));f.hp-=d;chip('hit',d);Scene.FX.hit(e,d,'#ffe9a0');}
      else{chip('miss','miss');Scene.FX.hit(e,'miss','#cfd6d8');}
      barsF();refreshCombatStatus();
    });
    enemySteps(steps,1,gl,quality,{skill:sid,spellRare:!!(spell&&p.rare),opening:sid==='archery'&&F.round===1});play(steps,()=>finishCombatQuery(res,gl));
  }

  function winF(res, gl) {
    if(F.act==='fight'&&F.ent){Backstab.forget(WOUNDS,F.ent);Scene.endChase(F.ent);}
    if (F && F.act === 'fight') Sound.sfx('win');
    if (gift('mend') && F.act === 'fight') heal(maxHp() * .2);
    const t = F.r, lk = luck(), k = F.kind, o = { gold: 0, mats: {}, items: [], scrolls: [] }; let head, note = '', band = '', body = false;
    if (k === 'monster' || k === 'dungeon') { const st = F.act === 'steal', el = !!(F.inst && F.inst.elite), dn = k === 'dungeon'; if (st) S.stats.steals++; else S.stats.kills++;
      if (F.animal) { o.meat = 1 + (rnd() < .3 ? 1 : 0); o.hide = rnd() < .5 ? 1 : 0; } else {
      o.gold = (st ? 12 * t + 8 : 6 * t + 4) * (el ? 2 : 1) * (dn ? 1.4 : 1) * (.8 + rnd() * .4); o.mats[t] = (1 + (el ? 2 : 0)) * (st ? 2 : 1); if (el) { o.sigils = 1; if (rnd() < .5) o.scrolls.push('a' + t + 'r'); if (rnd() < .015) o.bless = 1; if (rnd() < .06) o.gscr = 1; }
      if ((!st && (el || rnd() < (dn ? .5 : .35))) || (st && F.prize==='prize')) o.items.push(st&&F.prizeItem?F.prizeItem:makeItem(rollRarity(lk, el ? 1 : 0), t));
      if (F.inst && F.inst.lead && !st) { S.lairday = S.lairday || {}; if (S.lairday[F.inst.lair] !== dayKey()) { S.lairday[F.inst.lair] = dayKey(); o.gold += 40 * t; o.items.push(makeItem(rollRarity(lk, 2), t)); if (rnd() < .2) o.gscr = 1; if (t >= 6 && rnd() < .05) o.pscr = [makePscr(t)]; if (rnd() < (F.inst.lk === 'l14' ? .5 : .12 + t * .02)) o.runes = 1; } }
      }
      if (gid() === 'fight' && k === 'monster' && !st) { const rw = makeItem('common', 1, 'weapon', pick(['swords', 'fencing']),{source:'starter'}); rw.name = 'Rusty ' + WEAP[rw.w].n; o.items = [rw]; }
      if (!st) maybeDye(F.kind === 'boss' ? .35 : F.keeper ? .3 : F.kind === 'dungeon' ? .04 : .015 + luck() / 4000);
      if(st&&F.prize==='prize')o.gold=Math.round(o.gold*.5); head = st ? 'Clean lift' : F.title + ' falls';
      if (st) {
        // Surface respawns create new entities even though the live creature's alert can clear.
        F.ent.pocketsEmpty = true;
        F.ent.alert = 6;
      } else { if(dn)DP.victory(F.ent); Scene.corpse(F.ent, o); body = true; for (const k in S.er.a) { const a = S.er.a[k]; if (a.type === 'hunt' && a.tpl === F.inst.tpl && a.have < a.n) { a.have++; toast(`${a.from}: ${a.have} of ${a.n} targets · ${a.x}`); } } F.body = F.ent; F.ent = null; if (dn && DG) DP.snapshot(); if (S.tut === 1) S.tut = 2; if (gid() === 'fight') { S.gd++; gEnter(true); } } }
    else if (k === 'rival') { const v = S.rival[t];
      if (F.act === 'steal') { o.gold = F.prize==='prize'?Math.round(v.gold/2):v.gold; if(F.prize==='prize')o.items.push(v.item); o.sigils = 1; o.scrolls.push('h' + t + 'r'); S.stats.steals++; head = F.prize==='prize'?'Prize lifted':'Purse lifted'; note = `${F.title} will not notice until morning.`; } else { o.gold = Math.round(v.gold / 2); head = 'Duel won'; note = `${F.title} pays the wager and leaves town for a while.`; } v.taken = true; v.away = 4; }
    else { const first = !S.boss[t], b = F.boss; S.boss[t] = S.boss[t] || now(); S.stats.kills++; o.gold = (60 * t + 40) * (first ? 1 : .4); o.sigils = first ? 2 : 1; o.items.push(first ? uniq(b.drop) : makeItem(rollRarity(lk, 2), t)); if (rnd() < (first ? .3 : .08)) o.bless = 1; if (t >= 5 && rnd() < (first ? .6 : .15)) o.pscr = [makePscr(t)]; if (rnd() < .5) o.gscr = 1; head = first ? `The mark of the ${CIRCLE[t]} Circle` : b.name + ' yields again'; note = b.win; if (t === 8 && first) S.won = now(); }
    S.hp=Math.min(S.hp,maxHp()); S.mana=Math.min(S.mana,Progression.maxMana(S)); S.stamina=Math.min(S.stamina,maxStamina()); const g = grant(body ? {} : o); F.over = true; tick(); save(); renderHud(); barsF();
    F.after = `<h3 class="won">${esc(head)}</h3>${note ? `<p class="story">${esc(note)}</p>` : ''}${body ? '' : spoilsHTML(g)}${gainLine(gl)}<div class="row end">${body ? `<button class="btn quiet" data-a="fdone">Leave it</button><button class="btn solid${S.tut <= 2 ? ' pulse' : ''}" data-a="floot">Loot</button>` : '<button class="btn solid" data-a="fdone">Continue</button>'}</div>`; F.st = 'after'; drawF();
  }
  function loseF(res, gl) {
    F.over = true; const t = F.r; let head, msg, fine = 0;
    if (F.kind === 'rival') { fine = Math.min(S.gold, (F.act === 'steal' ? 15 : 10) * t); S.gold -= fine; S.rival[t].away = 4; S.rival[t].taken = true; head = F.act === 'steal' ? 'Caught' : 'Duel lost'; msg = `${F.title} ${F.act === 'steal' ? 'catches your hand in the purse' : 'answers first'}. You pay ${fine} gold.`; }
    else if (F.act === 'steal') { fine = Math.min(S.gold, 5 * t); S.gold -= fine; F.caughtStealing = true; F.ent.alert = 8; F.ent.unseen = false; head = 'Caught'; msg = `It caught you. You drop ${fine} gold. It comes after you.`; }
    else { S.stats.falls++; F.kick = true; head = 'You fall'; const worn = new Set(Object.values(S.eq || {})), n = S.inv.filter(it => !worn.has(it.id)).length + Object.keys(S.scr || {}).length; const bare = Object.values(S.eq || {}).map(itemById).filter(it => it && !it.unique && !it.bless && !it.ins).length; msg = S.gold || n || bare ? `Your gold, your bag${bare ? ' and any gear that is not blessed or insured' : ''} stay on your body. You have ten minutes to get back to it.` : 'You had nothing on you to lose.'; }
    if(F.kick)prepareDeath();
    tick(); save(); renderHud(); barsF();
    F.after = `<h3 class="lost">${head}</h3><p>${esc(msg)}</p>${gainLine(gl)}<div class="row end"><button class="btn solid" data-a="fdone">${F.kick ? 'Wake up' : 'Continue'}</button></div>`; F.st = 'after'; drawF();
  }
  function flee() {
    if(!F||F.busy||F.over)return;
    const e=F.ent,live=F.act==='fight'&&e&&F.kind!=='rival';
    if(!live||!F.engaged){closeF();return;}
    F.engaged=true;e.engaged=true;F.intent=nextEnemyIntent();F.round++;F.busy=true;F.st='escape';F.maneuverIncoming=0;F.chips='';drawF();
    const steps=[],gl=[],hs=rv('hiding'),evaded=gift('flee')||hs>0&&rnd()*100<Math.min(70,15+hs*.55);
    if(!evaded)enemySteps(steps,1,gl,0);
    play(steps,()=>{
      F.busy=false;if(F.defense&&--F.defense.left<=0)F.defense=null;
      if(S.hp<=0){F.res={grade:'wrong',quality:0};F.queryPower=0;F.instant=true;return loseF(F.res,[]);}
      save();closeF();Scene.chase(e);toast('Run to safety, break sight or gain distance, then Hide. The foe is still pursuing.');
    });
  }
  function ending() {
    const gm = RPG.filter(s => rv(s[0]) >= 100).length, cx = Object.keys(S.codex).length, jr = Object.keys(S.jr).length;
    sheet(`${ART ? '<img class="title-art" alt="" src="art/t/J03.jpg">' : ''}<p class="eyebrow">The Trials are won</p><h2>Tallyport’s champion</h2><p class="story">The council enters your eighth mark and restores Tallyport’s seat. Odalys had worried about sending another pupil into danger. As the clerk reads out your name, she gets to her feet in the gallery and claps.</p><p class="story">${S.archive ? 'Petra presents Ilva’s independent removal log and the restored records in public. Faced with the evidence, the council orders the archive opened to inspection. Maren insists that the admission be entered in the minutes, where everyone can read it.' : 'Tallyport has a voice on the council again. If you want to follow Ilva’s investigation, you can still look for the records she left behind.'}</p><p>${jr >= 8 ? 'You have all eight pages of Ilva’s journal.' : `You have found ${jr} of the 8 pages of Ilva’s journal. The rest are still out along the road.`}</p><p>You have passed examinations in reading, filtering, grouping, joining, and changing records. You can revisit the lessons whenever you need a reminder. Learning continues after the Trials.</p><div class="kv"><span>Queries run</span><span>${S.stats.q}</span><span>Skills at Grandmaster</span><span>${gm} of ${RPG.length}</span><span>Named rares found</span><span>${cx} of ${UNIQUES.length}</span></div><p class="cap2">The world stays open.</p><div class="row end"><button class="btn solid" data-a="closesheet">Carry on</button></div>`);
  }
  function bossCard(e) {
    const t = e.r, b = BOSSES[t - 1], d = diffOf(t, false, true), lack = t === 8 ? [1, 2, 3, 4, 5, 6, 7].filter(k => !S.boss[k]).length : 0, pt = Scene.bossPortrait(t); closeSay(); Scene.pause(); $('#nav').hidden = true; const el = $('#enc'); el.hidden = false; el.className = 'bcard';
    el.innerHTML = `<div class="card-bg" style="background-image:url(${Scene.backdrop(t)})"></div><div class="card-in">${pt ? `<img class="card-port" alt="" src="${pt}">` : ''}<p class="eyebrow">${esc(b.epithet)}</p><h1>${esc(b.name)}</h1><p class="story">${esc(b.intro)}</p><p class="cap2">${(Backstab.recall(WOUNDS,e,S,'boss',mkFoe(t,d,3.5,true).max,Scene.tacticalTime())||mkFoe(t,d,3.5,true)).hp} health · difficulty ${d} · no hints · the examiner sets every question</p>${lack ? `<p class="cap2">The council will hear you once you have the other seven marks. You still need ${lack}.</p>` : ''}<div class="row end"><button class="btn quiet" data-a="cardno">Not yet</button><button class="btn solid" data-a="start" data-k="boss"${lack ? ' disabled' : ''}>${S.boss[t] ? 'Stand again' : 'Stand the examination'}</button></div></div>`;
  }
  const closeCard = () => { $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; };

  /* ---------- starting things ---------- */
  const giverOf = c => { const l = CONTRACTS.filter(x => x.r === c.r); return Math.min(2, Math.floor(l.indexOf(c) * 3 / l.length)); };
  const sneakPct = () => Math.round(Sneaking.chance(rv('hiding'),diffOf(here()),1,heavyArmor(),bonus('quieting')));
  function sneak(diff) {if(CONCEAL.hidden)return true;toast('Use Hide, then approach while concealed.');return false;}
  const START = {
    intro: () => { COLS.manifest = FirstDay.columns; openQ({ kind: 'intro', r: 1, step: S.seen['intro.assembled'] ? 'turn' : S.seen['intro.result'] ? 'i3' : S.seen['intro.column'] ? 'i2' : S.seen['intro.row'] ? 'icol' : 'i1', task: REPS[0], tasks: S.seen['intro.assembled'] ? REPS : null, title: 'Help unload the Marigold' }); if (Q.tasks) { Q.i = REPS.findIndex((_, i) => !S.seen['intro.rep.' + i]); if (Q.i < 0) Q.i = 0; Q.task = REPS[Q.i]; drawQ(); } },
    contract: d => { const c = CONTRACTS.find(x => x.id === d.id); openQ({ kind: 'contract', id: c.id, r: c.r, task: c, title: c.title, lesson: c.lesson || null, first: !!c.lesson && !S.done[c.id] && !S.seen[c.id] }); if (c.lesson) { S.seen[c.id] = 1; cmdTeach(c.id); if (c.id === 'c101') cmdTeach('intro'); } },
    round: d => { const inst = rounds().tasks[+d.i]; if (inst.done) return; const t = makeTask(inst); openQ({ kind: 'rounds', r: t.r, inst, task: t, title: 'Daily drill · ' + t.title }); },
    rumor: d => { const r = RUMORS.find(x => x.id === d.id); openQ({ kind: 'rumor', id: r.id, r: r.r, drop: r.drop, task: Object.assign({ kind: 'read' }, r), title: 'Rumor · ' + r.title, noHint: true }); },
    monster: (e, amb) => { if(e.inst && e.inst.dungeon)return DP.fight(e); const inst = e.inst, animal = inst.tpl[0] === 'a', t = animal ? 1 : (inst.c || e.r), diff = animal ? 4 : diffOf(t, inst.elite); if (inst.lair) { S.lairs = S.lairs || {}; S.lairs[inst.lair] = 1; } openF({ kind: 'monster', act: 'fight', r: t, inst, ent: e, diff, animal, sig: animal ? null : inst.tpl, title: inst.nm || ((inst.elite ? 'Gilded ' : '') + MONSTERS[inst.tpl][0]), lead: !!inst.lead, noHint: !!inst.elite, foe: animal ? { hp: 18, max: 18, diff, swings: 1 } : mkFoe(t, diff, inst.elite ? 2 : 1), coach: '' }); },
    rival: d => { const e = CE, t = e.r, R = RIVALS[t - 1], v = rival(t); if (v.away > 0) return; const diff = diffOf(t, true), st = d.m !== 'duel', sh = bestPage('shadow'); if (st && !sh) return toast('You own no page from the Book of Shadows'); if (d.m === 'sneak' && !sneak(diff)) return;
      const c = st ? Math.min(sh.c, t) : t, b = pick(BOUNTIES.filter(x => x.r === c && !/^b80[123]/.test(x.id))), bonus2 = st ? 10 + (sh.rare ? 15 : 0) - 12 * Math.max(0, t - sh.c) : 0;
      openF({ kind: 'rival', act: st ? 'steal' : 'duel', st: 'prompt', r: t, diff, ent: e, title: R.name, noHint: true, page: st ? sh : null, verb: st ? 'Steal' : 'Answer', kc: c, bonus: bonus2, task: makeTask({ tpl: b.id, seed: seeded(b.id) }), oddsLine: `${odds(rv(st ? 'stealing' : bestWeapon()) + bonus2, diff, 'correct').p}% if correct · one try` }); },
    boss: () => { const e = CE;if(!e||e.kind!=='boss')return;const denied=bossAccess(e);if(denied)return toast(denied);const t=e.r,b=BOSSES[t-1],diff=diffOf(t,false,true);closeCard();openF({kind:'boss',act:'fight',boss:b,r:t,diff,ent:e,title:b.name,noHint:true,foe:mkFoe(t,diff,3.5,true),tasks:n=>Object.assign({kind:'read',title:b.name},b.phases[n%b.phases.length](RNG(rid())))}); },
    dungeon: () => DP.enter(CE.r),
    guard: e => DP.fight(e),
    keeper: e => DP.fight(e),
    chest: e => DP.reward(e),
  };

  /* ---------- screens ---------- */
  function renderHud() {
    const meter=(id,label,value,max)=>`<div class="hud-resource" data-resource="${id}"><span>${label}</span><span class="hpbar ${id}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.max(0,Math.round(value))}"><i style="width:${Math.max(0,Math.min(100,Math.round(100*value/max)))}%"></i><b>${Math.round(value)} / ${max}</b></span></div>`;
    $('#hud').innerHTML=`<div class="hud-row"><div class="hud-id"><b>${esc(S.name||'Brasswake')}</b><div class="hud-gold">${ico('coin')}<b>${S.gold}</b></div></div><div class="hud-resources resource-line" aria-label="Resources">${meter('hp','HP',S.hp,maxHp())}${meter('mana','Mana',S.mana,Progression.maxMana(S))}${meter('stamina','Stamina',S.stamina,maxStamina())}</div></div>`;fitPanel();
  }
  let combatUiTick=0,techniqueFilter='all',techniqueSlot=0;
  function combatView(){return typeof Combat!=='undefined'&&Combat.snapshot?Combat.snapshot():null;}
  function renderCombatUI(force=false) {
    const bar=$('#combat-bar'),target=$('#combat-target'),result=$('#combat-result'),context=$('#combat-context');if(!bar)return;
    const now=performance.now();if(!force&&now-combatUiTick<80)return;combatUiTick=now;
    const view=combatView(),visible=!!view&&sceneUp&&tab==='world'&&$('#title').hidden&&!boatActive()&&!Q&&!DU&&!FI&&!WH&&!BJ&&!PK&&$('#sheet').hidden&&$('#say').hidden&&$('#coach').hidden;
    bar.hidden=!visible||F?.st==='prompt'||!!F?.over;context.hidden=bar.hidden;target.hidden=!visible||!view?.target;result.hidden=!visible||!F?.live||F.st!=='after'||F.over;
    if(!view)return;
    for(const [id,value,max] of [['hp',view.resources.hp,view.resources.maxHp],['mana',view.resources.mana,view.resources.maxMana],['stamina',view.resources.stamina,view.resources.maxStamina]]){
      const meter=$(`#hud [data-resource=${id}] .hpbar`);if(meter){const text=Math.round(value)+' / '+max;if(meter.querySelector('b').textContent!==text){meter.querySelector('b').textContent=text;meter.setAttribute('aria-valuenow',Math.max(0,Math.round(value)));meter.setAttribute('aria-valuemax',max);meter.querySelector('i').style.width=Math.max(0,Math.min(100,100*value/max))+'%';}}
    }
    const contextual=view.actions.filter(a=>['hide','steal','backstab'].includes(a.id));
    const contextHtml=contextual.map(a=>`<button class="btn sm quiet" data-a="combatbegin" data-id="${esc(a.id)}" aria-disabled="${!a.ready}" aria-label="${esc(a.name+(a.reason?' · '+a.reason:''))}">${esc(a.name)}</button>`).join('');if(context.innerHTML!==contextHtml)context.innerHTML=contextHtml;
    const actions=[...view.actions.filter(a=>!['hide','steal','backstab'].includes(a.id)).map(a=>({...a,slot:null})),...view.loadout.map((a,slot)=>a?{...a,slot}:{id:'',name:'Empty',slot})];
    const key=actions.map(a=>a.id+':'+a.name+':'+a.slot).join('|');
    if(bar.dataset.layout!==key){bar.dataset.layout=key;bar.innerHTML=`<div class="combat-basics">${actions.filter(a=>a.slot===null).map(a=>combatButton(a)).join('')}</div><div class="combat-techniques" aria-label="Four equipped techniques">${actions.filter(a=>a.slot!==null).map(a=>combatButton(a)).join('')}</div>`;}
    const buttons=[...bar.querySelectorAll('.combat-action')];
    actions.forEach((a,index)=>{const button=buttons[index];if(!button)return;const ready=!!a.ready,reason=a.id?(a.reason||(!ready?'Recovering.':'')):'Equip a technique in this slot.';button.setAttribute('aria-disabled',String(!ready));button.classList.toggle('unavailable',!a.eligible);button.classList.toggle('recovering',!!a.id&&!!a.eligible&&!ready);button.title=reason||a.description||a.name;const label=(a.slot!==null?'Slot '+(a.slot+1)+': ':'')+a.name+(reason?' · '+reason:'');if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);button.querySelector('.action-recovery i').style.width=(ready?100:a.eligible?Math.round(100*(view.recovery.fraction||0)):0)+'%';const meta=button.querySelector('.action-meta'),text=!a.id?'Slot '+(a.slot+1):a.eligible&&!ready?Math.max(.1,a.remaining||view.recovery.remaining).toFixed(1)+'s':a.sqlOffset?'+'+a.sqlOffset+' SQL':a.mana?a.mana+' mana':a.stamina?a.stamina+' stam.':'';if(meta.textContent!==text)meta.textContent=text;});
    if(!target.hidden){const t=view.target,html=`<b>${esc(t.name||'Selected opponent')}</b><span>${Math.max(0,Math.round(t.hp||0))} / ${t.max||t.maxHp||0} HP</span><small>${t.returning?'Returning home':t.distance!=null?t.distance.toFixed(1)+' tiles away':''}</small>`;if(target.innerHTML!==html)target.innerHTML=html;}
    if(!result.hidden){const html=`<div class="combat-outcome"><b>${GRADE_N[F.res?.grade]||'Action resolved'}</b><div class="swings">${F.chips||esc(F.pline||'')}</div><button class="btn sm quiet" data-a="combatdetails">Details</button></div>`;if(result.innerHTML!==html)result.innerHTML=html;}
  }
  function combatIcon(action){
    if(action.id==='recover')return 'book_spell';
    if(action.id==='supply')return action.name==='Draught'?'draught':'bandage';
    const effectIcons={defend:'shield_1',ward:'shield_4',heal:'bandage',slow:'frost',bleed:'dfang',interrupt:'warhorn',disrupt:'bell',precision:'lens',pierce:'w_fencing_3',riposte:'w_fencing_2',lunge:'boots_2',expose:'armor_2',siphon:'leechoil',displace:'boots_3',burst:action.discipline==='magery'?'sigil':'w_'+action.discipline+'_3'};
    return effectIcons[action.effect]||(ART&&ArtData.icons.at[action.icon]?action.icon:null)||({swords:'w_swords_1',fencing:'w_fencing_1',archery:'w_archery_1',magery:'scroll_spell',support:'bandage'}[action.discipline])||'book_arms';
  }
  function combatButton(action){return `<button class="combat-action${action.slot===null?' basic':''}" data-a="${action.id?'combatbegin':'combatbook'}" data-id="${esc(action.id)}"${action.slot!==null?` data-slot="${action.slot}"`:''}>${action.slot!==null?`<span class="action-slot" aria-hidden="true">${action.slot+1}</span>`:''}<span class="action-art" aria-hidden="true">${action.id?ico(combatIcon(action)):'+'}</span><span class="action-label">${esc(action.name)}</span><small class="action-meta"></small><span class="action-recovery" aria-hidden="true"><i></i></span></button>`;}
  function techniqueBookHTML(view=combatView()) {
    if(!view)return '';
    const labels={all:'All',swords:'Swords',fencing:'Fencing',archery:'Archery',magery:'Magery'},locked=view.active||!!F||!!Q||!!DU;
    const currentWeapon=itemById(S.eq.weapon)?.w||bestWeapon();
    const entries=view.techniques.filter(t=>(techniqueFilter==='all'||t.discipline===techniqueFilter)&&(!t.rare||t.learned)).map(t=>({...t,icon:combatIcon(t)}));
    return `<div class="technique-book"><div class="technique-equipped" aria-label="Equipped techniques">${view.loadout.map((t,slot)=>`<button class="technique-position${slot===techniqueSlot?' selected':''}" data-a="techniqueslot" data-slot="${slot}" aria-pressed="${slot===techniqueSlot}"><small>Slot ${slot+1}</small><b>${esc(t?.name||'Empty')}</b></button>`).join('')}</div><p class="cap2">Choose a slot, then equip a learned technique.${locked?' Find safety before changing your techniques.':''}</p><div class="technique-filters" role="group" aria-label="Combat discipline">${Object.entries(labels).map(([id,label])=>`<button class="btn sm quiet" data-a="techniquefilter" data-id="${id}" aria-pressed="${techniqueFilter===id}">${label}</button>`).join('')}</div><div class="technique-entries">${entries.map(t=>{const qualification=Techniques.eligibility(S,t.id,{weapon:currentWeapon}),status=t.learned?(qualification.ok?'Learned':qualification.reason):t.source?.dojo?'Learn at dojo '+t.source.dojo:'Not learned',cost=[t.mana?t.mana+' mana':'',t.stamina?t.stamina+' stamina':''].filter(Boolean).join(' · ');return `<article class="technique-entry${t.equipped>=0?' equipped':''}" data-technique="${esc(t.id)}"><div>${ico(t.icon||'sword')}<h3>${esc(t.name)}</h3><small>${esc(labels[t.discipline])} ${t.requirement} · +${t.sqlOffset} Circle${t.sqlOffset===1?'':'s'} SQL${t.rare?' · rare':''}</small></div><p>${esc(t.description||'')}</p><small>${esc(cost)}${t.range?' · '+t.range+' tile range':''}</small><span class="technique-status">${esc(t.equipped>=0?'Equipped in slot '+(t.equipped+1):status)}</span><button class="btn sm" data-a="combatequip" data-id="${esc(t.id)}" data-slot="${techniqueSlot}"${locked||!qualification.ok||t.equipped>=0?' disabled':''}>Equip in slot ${techniqueSlot+1}</button></article>`;}).join('')}</div><button class="btn quiet" data-a="combatequip" data-slot="${techniqueSlot}"${locked||!view.loadout[techniqueSlot]?' disabled':''}>Clear slot ${techniqueSlot+1}</button><div class="row"><span class="cap2">Combat supply</span>${['bandage','draught'].map(kind=>`<button class="btn sm quiet" data-a="combatsupply" data-id="${kind}" aria-pressed="${view.supply===kind}"${locked?' disabled':''}>${kind==='bandage'?'Bandage':'Draught'}</button>`).join('')}</div></div>`;
  }
  function openTechniqueBook(){const view=combatView();if(!view)return;if(F?.live&&F.st==='after'&&!F.over&&!view.active)Combat.cancel();sheet('<h2>Technique Book</h2>'+techniqueBookHTML());renderCombatUI(true);}

  // the bottom bar: framed slots with painted icons, the hero's own portrait in the middle
  const NAV = [['world', 'Adventure', 'sword', '⚔'], ['map', 'Map', 'map', '✥'], ['hero', 'Hero', null, '☺'], ['bag', 'Bag', 'bag', '◈'], ['ledger', 'Ledger', 'tome', '❖']];
  function renderNav() {
    const face = S.path ? LOOKS[S.path][(S.look != null ? S.look : 0) % 2] : 'G09_4', tabsOn = null, key = face + ART + S.gn + boatActive(), n = $('#nav'); if (n.dataset.k === key) return; n.dataset.k = key;
    n.innerHTML = NAV.filter(x => !tabsOn || tabsOn.includes(x[0])).map(x => `<button data-a="${x[0]==='hero'&&boatActive()?'charactermenu':'tab'}"${x[0]==='hero'&&boatActive()?' aria-label="Character menu"':''} data-t="${x[0]}" class="${x[0] === 'hero' ? 'hero' : ''}${S.gn === x[0] ? ' pulse' : ''}"><span class="slot">${ART ? `<img alt="" src="art/${x[2] ? 'i/' + x[2] : 'p/' + face}.webp">` : `<i>${x[3]}</i>`}</span><span class="lab">${x[1]}</span></button>`).join('');
  }
  function render() {
    $('#app').classList.toggle('prologue',boatActive() && $('#title').hidden);
    if(!boatActive() || !$('#title').hidden) $('#onboard').hidden=true;
    renderHud(); renderNav(); document.querySelectorAll('#nav button').forEach(b => b.dataset.t === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
    const world = tab === 'world'; $('#stage').hidden = !world; $('#view').hidden = world;renderCombatUI(true);
    if (world) { if (ready && !sceneUp) bootScene(); if(boatActive()){if($('#title').hidden)boatRender();return;} if (sceneUp) { if(!Q)Scene.resume(); gPlace(); } return; }
    Scene.pause(); const v = $('#view'), keep = v.dataset.tab === tab + lsub ? v.scrollTop : 0;
    v.innerHTML = '<button class="pclose" data-a="tab" data-t="world" aria-label="Close">✕</button>' + ({ map: vMap, ledger: vLedger, hero: vHero, bag: vBag }[tab])(); v.dataset.tab = tab + lsub; v.scrollTop = keep;
    if (tab === 'ledger' && lsub === 'sandbox') { const ta = $('#con-sql'); if (ta) ta.value = con.sql; }
    if(boatActive()){const beat=Prologue.beat({...S.prologue,phase:({map:'chart',bag:'kit',hero:'hero',ledger:'ledger'})[tab]||S.prologue.phase},S.name,S.path);v.insertAdjacentHTML('afterbegin',`<aside class="boat-tool-note"><b>Tamsin · ${esc(beat.title)}</b><p>${esc(({map:'The white boat marks our approach to Tallyport. Your explored map will fill in as you walk ashore.',bag:'Tap a supply to see what it does. Equipment and scrolls you find will be kept here too.',hero:'These are your character’s equipment and starting skills. Skills improve through use; SQL knowledge is learned separately.',ledger:'Tables hold practice records. The sandbox is safe to experiment in, and Lessons keeps explanations you have met. Odalys will teach your first query ashore.'})[tab]||beat.text)}</p><button class="btn sm" data-a="tab" data-t="world">Back to Tamsin</button></aside>`);unCoach();}else if(tab==='map'&&DG)unCoach();else coach({ map: 'map', ledger: 'ledger', hero: 'hero', bag: 'bag' }[tab]); if (S.gn && S.gn === tab) { S.gn = 0; save(); renderNav(); }
  }
  function restoreAccountScene(restoreHomes) {
    sceneOwner = null;
    if(boatActive()){Scene.enterShip(S,S.prologue.phase,S.prologue.pos);sceneOwner=S;return;}
    const homesMoved = restoreHomes && homesUp(), saved = S.pos;
    CMap.restore();
    Scene.load(saved, saved || S.tut ? S.region : 'dock');
    CMap.moved(...Scene.pos());
    const errandsMoved = WorldProgress.reconcileErrands(S, Scene.sites());
    S.region = Scene.region();
    S.been[S.region] = 1;
    if (saved) S.pos = Scene.pos();
    if (S.dungeon) { S.interior=null; DP.restore(); }
    else if(S.interior && !Scene.restoreVenue(S.interior)) S.interior=null;
    sceneOwner = S;
    surfaceBodies();
    if (S.path && (homesMoved || errandsMoved || (saved && (saved[0] !== S.pos[0] || saved[1] !== S.pos[1])))) save();
  }
  function bootScene() { if (!sceneUp) { Scene.init($('#stage'), HOST); sceneUp = true; soundUp(); Scene.showBlocked(S.showb); } $('#st-load').hidden = true; applyGifts(); restoreAccountScene(true); if (gOn()) gEnter(true, true); document.body.classList.toggle('ui', !!(ART && ArtData.ui)); if (!$('#title').hidden) Scene.pause(); }
  const ART = typeof ArtData !== 'undefined', LOOKS = { warrior: ['G10_1', 'G10_2'], thief: ['G10_3', 'G10_4'], mage: ['G11_1', 'G11_2'], crafter: ['G11_3', 'G11_4'] }, LOOK0 = { warrior: 0, thief: 2, mage: 4, crafter: 6 };
  const WSTART = { warrior: 'swords', thief: 'fencing', mage: 'magery', crafter: 'swords' }, NAMES = ['Edrik', 'Mara', 'Corin', 'Sable', 'Aldous', 'Ysanne', 'Brogan', 'Wren'];
  /* ---------- title, character creation, cold open ---------- */
  let CR = null, DELETE = null;
  const SKINN=['Fair','Light','Tan','Brown','Deep brown'];
  const tbg = n => ART ? ` style="background-image:url(art/t/${n}.jpg)"` : '';
  function showTitle(html, cls) { const t = $('#title'); t.hidden = false; t.className = cls || ''; t.innerHTML = html; if (sceneUp) Scene.pause(); }
  function hideTitle() { stopCreationPreview(); $('#title').hidden = true; $('#title').innerHTML = ''; if (sceneUp && tab === 'world' && !Q) Scene.resume(); }
  function title() {
    DELETE=null;
    stopCreationPreview(); CR=null;
    const tot = c => Math.round(Object.values(c.sk || {}).reduce((a,b)=>a+b,0)), any=A.slots.some(Boolean);
    const emptyMain=A.main<0 ? A.slots.findIndex(c=>!c) : -1;
    const row=(c,i)=>{
      const role=i===A.main||i===emptyMain?'Main character':'Supporting character';
      if(!c)return `<button class="tt-btn quiet" data-a="newslot" data-i="${i}"${A.main<0&&i!==emptyMain?' disabled':''}><span class="world-slot-label">${role}</span>New character<small>${i===emptyMain?'Follow the Trials story':A.main<0?'Create your main character first':'Explore, learn and build in this world'}</small></button>`;
      const p=PATHS.find(x=>x.id===c.path);
      return `<button class="tt-btn${i===A.cur?'':' quiet'}" data-a="playslot" data-i="${i}"><span class="world-slot-label">${role}</span>${esc(c.prologue&&!c.prologue.named&&c.prologue.phase!=='done'?'New arrival':c.name)}<small>${p?p.name:''} · skills ${tot(c)}${c.boss&&Object.keys(c.boss).length?' · '+Object.keys(c.boss).length+' of 8 marks':''}</small></button>`;
    };
    showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box tt-slots"><h1>Brasswake</h1><p class="tt-sub">Choose your world and character.</p>${Offline.html()}${savePanel()}<div class="world-tabs" role="group" aria-label="Worlds">${A.worlds.map((w,i)=>`<button class="btn${i===A.world?' solid':' quiet'}" data-a="worldpick" data-i="${i}" aria-pressed="${i===A.world}">World ${i+1}<small>${w.slots.filter(Boolean).length} / ${NSLOT}</small></button>`).join('')}</div><p class="world-summary">World ${A.world+1} · The same lands, with a separate story and saves.</p>${A.slots.map(row).join('')}${any?'<button class="tt-link" data-a="delpick">Delete a character</button>':''}<button class="tt-link" data-a="delworld">Delete this world</button><p class="tt-note">Characters in this world share houses, storage, named finds and learned commands. Each keeps their own bank. Your other worlds keep everything separate.</p></div>`);
  }
  function returnCharacters(){ save(); PL=null;Scene.ghost(null);const placement=$('#placebar');if(placement)placement.remove(); closeSheet(); closeSay(); tab='world'; title(); render(); }
  function selectWorld(index){
    DELETE=null;
    if(index===A.world || !Number.isInteger(index) || index<0 || index>=CharacterWorlds.count)return;
    save(); discardEncounter(); closeSheet(); closeSay(); CharacterWorlds.select(A,index); if(sceneUp&&Scene.resetWorld)Scene.resetWorld(); loadCur(); cmdBackfill();learningBackfill();
    Q=null; F=null; DG=null; CE=null; tab='world'; sel=S.region;
    $('#enc').hidden=true; $('#fight').hidden=true; $('#nav').hidden=false;
    if(sceneUp)restoreAccountScene(true);
    save(); title(); render();
  }
  function delPick() { showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box tt-slots"><h1>Delete who?</h1>${A.slots.map((c, i) => c ? `<button class="tt-btn quiet" data-a="delslot" data-i="${i}">${esc(c.name)}<small>${i === A.main ? 'Main: the Trials start over with your next new character' : 'Supporting'}</small></button>` : '').join('')}<button class="tt-btn" data-a="totitle">Back</button></div>`); }
  function deletionStart(kind,index){
    save();DELETE=DeletionRules.begin(A,kind,index);if(!DELETE)return;
    const name=kind==='world'?'World '+(A.world+1):DELETE.phrase;
    const detail=kind==='world'?`This deletes all ${A.slots.filter(Boolean).length} characters in this world, their banks, horses, houses, shared storage, discoveries and learned commands. Your other worlds stay safe. The empty world slot can be used again.`:`This deletes ${name}, their skills, bag, bank and horse. Shared houses and storage stay. ${A.main===index?'Your next new character becomes the main character; existing supporting characters keep their role.':''}`;
    showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box tt-slots"><h1>Delete ${esc(name)}?</h1><p class="tt-sub">${esc(detail)}</p><p>This cannot be undone. Back up your save first if you want a copy.</p><button class="tt-btn quiet" data-a="backup">Back up save</button><button class="tt-btn" data-a="deleteverify">Continue to verification</button><button class="tt-btn quiet" data-a="totitle">Cancel</button></div>`);
  }
  function deletionVerify(){
    DELETE=DeletionRules.advance(DELETE,A);if(!DELETE){title();return toast('The selection changed. Start deletion again.');}
    showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box tt-slots"><h1>Final verification</h1><p class="tt-sub">Type <b>${esc(DELETE.phrase)}</b> exactly to confirm this deletion.</p><label for="delete-phrase">Confirmation</label><input id="delete-phrase" autocomplete="off" autocapitalize="off" spellcheck="false"><p id="delete-status" role="status"></p><button class="tt-btn danger" data-a="deletecommit">Permanently delete ${DELETE.kind==='world'?'world':'character'}</button><button class="tt-btn quiet" data-a="totitle">Cancel</button></div>`);
  }
  function deletionCommit(){
    const ticket=DELETE,phrase=$('#delete-phrase')?.value;
    if(!DeletionRules.valid(ticket,A)){title();return toast('The selection changed. Nothing was deleted.');}
    if(ticket.stage!==2||String(phrase||'').trim()!==ticket.phrase){const status=$('#delete-status');if(status)status.textContent='The confirmation does not match. Nothing was deleted.';return;}
    const selected=ticket.kind==='world'||A.cur===ticket.index;
    if(selected){discardEncounter();sceneOwner=null;}
    if(!DeletionRules.commit(ticket,A,phrase,CharacterWorlds.freshWorld))return;
    deletionEpoch++;
    DELETE=null;
    // Commit the tombstone locally before any scene construction can fail.
    save();void flushDeletion();
    if(selected){if(sceneUp)Scene.resetWorld();loadCur();DG=null;Q=null;F=null;CE=null;tab='world';closeSheet();closeSay();$('#enc').hidden=true;$('#fight').hidden=true;$('#nav').hidden=false;if(sceneUp)restoreAccountScene(true);}
    save();title();render();
  }
  function playSlot(i) { if (!A.slots[i]) return; if (i !== A.cur) { save(); discardEncounter(); A.cur = i; loadCur(); DG = null; Q = null; F = null; CE = null; S.pos = S.pos || null; $('#enc').hidden = true; $('#fight').hidden = true; $('#nav').hidden = false; tab = 'world'; sel = S.region; save(); if (sceneUp) { restoreAccountScene(); Scene.refresh(); } } hideTitle(); render(); renderHud(); }
  let creationFrame=0;
  function stopCreationPreview(){cancelAnimationFrame(creationFrame);creationFrame=0;}
  function creationAppearance(){const L=normalizeHeadStyle(CR.app);return {build:L.build??0,combo:L.body*5+(CR.path==='mage'?2:1),skin:L.skin,hair:L.hair,headStyle:L.headStyle,hc:HAIRC[L.hc],beard:L.beard,hat:-1,cloth:null,metal:null,wpn:-1,wkind:'',shield:-1,style:'swing'};}
  function startCreationPreview(){
    stopCreationPreview();
    const paint=t=>{const cv=$('#cr-preview');if(!CR||!cv||$('#title').hidden)return; if(Scene.previewHuman)Scene.previewHuman(cv,creationAppearance(),CR.direction||0,CR.moving?t:null);const head=$('#cr-head-preview'),L=CR.app;if(head){const g=head.getContext('2d');g.clearRect(0,0,head.width,head.height);HeadPortraits.draw(g,{body:L.body,style:L.headStyle,skin:L.skin,hc:HAIRC[L.hc]},[20,90,65]);}creationFrame=requestAnimationFrame(paint);};
    creationFrame=requestAnimationFrame(paint);
  }
  function create() {
    CR=CR||{path:null,look:null,name:''};
    CR.app=CR.app||{body:0,build:0,skin:1,hair:0,hc:1,beard:-1,hat:-1,wear:0,dye:0};
    const firstArrival=A.main<0||!A.slots[A.main],L=normalizeHeadStyle(CR.app);HeadPortraits.preload(L.body,L.headStyle);
    const select=(key,label,choices)=>`<label><span>${label}</span><select data-create="${key}" aria-label="${label}">${choices.map(([v,n])=>`<option value="${v}"${L[key]===v?' selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
    showTitle(`<div class="cr"><p class="eyebrow">World ${A.world+1} · ${firstArrival?'Main character':'Supporting character'}</p><h2>Who were you back home?</h2><p class="cr-note">People had started to talk about you. Pick what you were known for.</p>${firstArrival?'<p class="cr-note">You’ll give your name when someone asks aboard the ship.</p>':`<label class="cr-name"><span>Name</span><input id="cr-name" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Your name" value="${esc(CR.name||'')}"></label>`}
      <div class="cr-paths">${PATHS.map(p=>`<div class="cr-path${CR.path===p.id?' on':''}"><b>${p.name}</b><small>${Object.keys(p.sk).map(k=>rpgName(k)+' '+p.sk[k]).join(' · ')}</small><div class="looks">${LOOKS[p.id].map((g,i)=>`<button data-a="pick" data-id="${p.id}" data-look="${LOOK0[p.id]+i}" aria-pressed="${CR.path===p.id&&L.body===i}" aria-label="${p.name}, look ${i+1}">${ART?`<img alt="" src="art/p/${g}.webp">`:`<span class="nolook">${i?'Woman':'Man'}</span>`}</button>`).join('')}</div></div>`).join('')}</div>
      <h3>Your appearance</h3><p class="cr-note">All creation choices are free. Turn and walk to see your character from every side.</p><div class="cr-appearance"><div class="cr-preview"><canvas id="cr-preview" width="240" height="240" aria-label="Your moving character preview"></canvas><div class="row"><button class="btn sm quiet" data-a="crturn" data-dir="-1" aria-label="Turn left">↶ Turn</button><button class="btn sm quiet" data-a="crwalk" aria-pressed="${!!CR.moving}">${CR.moving?'Stand':'Walk'}</button><button class="btn sm quiet" data-a="crturn" data-dir="1" aria-label="Turn right">Turn ↷</button></div></div><div class="cr-controls">${select('body','Body',[[0,'Man'],[1,'Woman']])}${select('build','Build',CharacterProfiles.labels.map((n,i)=>[i,n]))}${select('skin','Skin tone',SKINN.map((n,i)=>[i,n]))}${select('headStyle','Head style',HeadPortraits.styles(L.body).map(p=>[p.id,p.name]))}<canvas id="cr-head-preview" class="cr-head-preview" width="180" height="200" aria-label="Your complete head style"></canvas>${select('hc','Hair colour',HAIRCN.map((n,i)=>[i,n]))}</div></div>
      <p class="cr-note">You can learn any skill later by using it, and buy or find any page. Twenty skills share ${CAP} points. Your starting path leaves every skill available.</p><div class="row end"><button class="btn quiet" data-a="totitle">Back</button><button class="btn solid" data-a="begin"${CR.look==null?' disabled':''}>Begin</button></div></div>`,'creating');
    startCreationPreview();
  }
  function boatActive() {return !!(S && S.path && S.gd<0 && S.tut===0 && Prologue.active(S.prologue));}
  function coldOpen() {hideTitle();boatRender();}
  function boatRender(error) {
    if(!boatActive() || !$('#title').hidden)return;
    const panel=$('#onboard'),p=S.prologue,free=['walk','arrival'].includes(p.phase);
    $('#app').classList.add('prologue');panel.hidden=false;$('#nav').hidden=false;$('#nav').classList.toggle('boat-menu-only',!Prologue.toolsAvailable(p));
    if(!sceneUp){panel.innerHTML='<p>'+esc(engineErr||'The Marigold is coming into view…')+'</p><button class="btn" data-a="reset">Return to characters</button>';return;}
    Scene.enterShip(S,p.phase,p.pos);sceneOwner=S;Scene.FX.lock(!free);Scene.resume();
    const beat=Prologue.beat(p,S.name,S.path);panel.classList.toggle('boat-hint',free);panel.dataset.phase=p.phase;
    let controls='';
    if(p.phase==='rescue')controls='<button class="btn quiet" data-a="boatskiprescue">Continue after the rescue</button>';
    if(p.phase==='name')controls=`<label class="boat-name">Your name<input id="boat-name" maxlength="16" autocomplete="off" autocapitalize="words" value="${esc(S.name)}"></label>${error?'<p role="alert">'+esc(error)+'</p>':''}<button class="btn solid" data-a="boatname">Tell Tamsin</button>`;
    if(p.phase==='home')controls=`<button class="btn solid" data-a="boathome">“${esc(Prologue.home(p))}.”</button>`;
    if(p.phase==='recognition')controls='<button class="btn solid" data-a="boatnext" data-step="continue">“Yes, that’s me.”</button>';
    if(p.phase==='question')controls=`<button class="btn solid" data-a="boatnext" data-step="remember">“I was in ${esc(Prologue.home(p))} yesterday.”</button>`;
    if(p.phase==='where')controls='<button class="btn solid" data-a="boatnext" data-step="continue">Get to your feet</button>';
    if(p.phase==='decktalk')controls='<button class="btn solid" data-a="boatnext" data-step="rest">Let Tamsin show you around</button>';
    if(Prologue.toolFor[p.phase]){const tool=Prologue.toolFor[p.phase],label=NAV.find(t=>t[0]===tool)[1];controls=`<button class="btn solid" data-a="tab" data-t="${tool}">Open ${label}</button><button class="btn quiet" data-a="boatnext" data-step="continue"${p.tools.includes(tool)?'':' disabled'}>${p.phase==='ledger'?'Rest until landfall':'Continue'}</button>`;}
    panel.innerHTML=`<div class="boat-content"><p class="eyebrow">${esc(beat.title)}</p>${beat.text.split('\n\n').map(t=>'<p class="boat-paragraph">'+esc(t)+'</p>').join('')}</div><div class="boat-actions">${controls}</div><footer class="boat-menu">${!free&&p.phase!=='rescue'?'<button data-a="skipguide">I know how to play: skip the intro and guided start</button>':''}</footer>`;
    const name=$('#boat-name');if(name)name.addEventListener('keydown',e=>{if(e.key==='Enter')boatName();});
    requestAnimationFrame(()=>{if(boatActive())Scene.FX.inset(free?0:panel.offsetHeight+18);});
  }
  function characterMenu() {
    if(!boatActive())return ACT.tab({t:'hero'});
    save();
    sheet(`<h2>Character menu</h2><p class="cap2">Your arrival resumes where you leave it. Progress saves automatically on this device.</p>${savePanel()}<div class="row end">${Prologue.toolsAvailable(S.prologue)?'<button class="btn" data-a="tab" data-t="hero">Equipment and skills</button>':''}<button class="btn quiet" data-a="boatmenu">Return to characters</button><button class="btn solid" data-a="closesheet">Continue playing</button></div>`);
  }
  function boatAdvance(action,input) {if(!boatActive())return;S.prologue=Prologue.advance(S.prologue,action,input);save();boatRender();}
  function boatName(){const name=Prologue.cleanName($('#boat-name')&&$('#boat-name').value);if(!name)return boatRender('Tell Tamsin what to call you.');S.name=name;boatAdvance('named',name);renderHud();}
  function boatLand(skip) {
    if(!boatActive() || !skip&&S.prologue.phase!=='arrival')return;
    const name=$('#boat-name');if(name&&Prologue.cleanName(name.value))S.name=Prologue.cleanName(name.value);
    S.prologue=skip?Prologue.skip(S.prologue):Prologue.advance(S.prologue,'land');
    $('#onboard').hidden=true;$('#onboard').innerHTML='';$('#app').classList.remove('prologue');$('#nav').classList.remove('boat-menu-only');$('#nav').hidden=false;closeSay();Scene.FX.inset(0);Scene.FX.lock(false);
    homesUp();Scene.load(null,'dock');sceneOwner=S;S.pos=Scene.pos();S.region=1;CMap.moved(...S.pos);HOST._k=null;
    if(skip)gSkip();else{S.gd=1;save();gEnter();render();}
  }
  function boatTalk(e) {
    if(e.shipPerson==='tamsin'){
      if(S.prologue.phase==='walk'){if(S.prologue.steps<3)return dlg(e,'“Take a few steps first. I want to know you can stand without falling over.”',[bye]);return boatAdvance('spoke');}
      return dlg(e,'“The gangplank’s over there on the right. I’ll meet you on the pier.”',[bye]);
    }
    dlg(e,e.shipPerson==='captain'?'“Bram Tull. I captain the Marigold. We trade along this coast, so I can get you to Tallyport, but your home is well beyond our run. Get your strength back first. You’ve had enough trouble for one day.”':'“You gave us a fright. Tamsin spotted you just before we turned south. I’m glad she did.”',[bye]);
  }
  function boatCargo(e){const row=FirstDay.rows.find(r=>r[0]===e.cargo);sheet(`<p class="eyebrow">Cargo aboard the Marigold</p><h2>${esc(e.name)}</h2><p>The crew’s manifest lists what each crate contains, how much there is, and where it belongs.</p>${row?`<p>${esc(row[0])} · ${row[1]} · ${esc(row[2])}</p>`:''}<p>These supplies are cargo for Tallyport. Odalys will use a practice copy of this list to teach you SQL ashore.</p><button class="btn solid" data-a="closesheet">Close</button>`);}
  const wait = () => `<p class="loading">${engineErr ? esc(engineErr) : 'The Ledger is opening…'}</p>`;

  function vDungeonMap() {
    const m=Scene.debug().map,p=DP.current(),at=Scene.pos(),def=Dungeons.get(DG.r);
    const rooms=m.layout.rooms.filter(R=>m.discovered[R.cy*m.w+R.cx]);
    const places=m.ents.filter(e=>e.kind!=='corpse'&&m.discovered[e.y*m.w+e.x]&&(['dtravel','dcache','chest','ltable','keeper','dlever','dsecret'].includes(e.kind)||e.lieutenant));
    return `<section class="place"><p class="eyebrow">${esc(def.name)} · Floor ${DG.f+1} of ${def.floors.length}</p><h1>${esc(m.layout.name)}</h1></section>
      <div class="dungeon-map"><img alt="Explored passages on this dungeon floor" src="${m.mini.toDataURL()}"><i class="me" style="left:${100*at[0]/m.w}%;top:${100*at[1]/m.h}%"></i></div>
      <div class="card"><p class="eyebrow">Your expedition</p><p>${esc(objective())}</p><p class="cap2">White marks your position. Blue marks stairs; gold marks discoveries. Unexplored passages are dark.</p><div class="row"><button class="btn solid" data-a="tab" data-t="world">Return to dungeon</button></div></div>
      <div class="card"><h2>Floors</h2><ul class="tale plain">${def.floors.map((floor,i)=>`<li>${i+1}. ${esc(floor.name)} <small>${i===DG.f?'You are here':p.seen[i]?'Visited':'Unexplored'}${p.seals[i]?' · seal recovered':''}</small></li>`).join('')}</ul></div>
      <div class="card"><h2>Discovered places</h2>${places.length?`<ul class="tale plain">${places.map(e=>`<li>${esc(e.name)} <small>${Math.round(Math.hypot(e.x-at[0],e.y-at[1]))} paces ${compass({x:at[0],y:at[1]},e)}</small></li>`).join('')}</ul>`:'<p>Walk farther to map the passages.</p>'}<p class="cap2">${rooms.length} of ${m.layout.rooms.length} chambers mapped.</p></div>`;
  }
  const CMap = CartographyScreen.create({
    state: () => S, account: () => A, scene: Scene, region, esc, sheet, save:()=>{if(S?.path)save();}, toast, render,
    world: () => { tab = 'world'; render(); }, close: closeSheet, homes: () => S.homes || [],
    houseSize: h => [HOUSES[h.shape][1], HOUSES[h.shape][2]], entity: () => CE,
    blocked: () => !!(Q || F || DU || DG || gOn() || PL || (sceneUp && Scene.find(e => e.chase > 0))),
    activeMap: () => tab === 'map', sheetOpen: () => !$('#sheet').hidden, afterTravel: surfaceBodies
  });
  function vMap() {
    if (DG && Scene.debug().map.dungeonFloor) return vDungeonMap();
    const homes = (S.homes || []).length ? `<div class="card"><h2>Your homes</h2><ul class="goods">${S.homes.map(h => `<li class="good">${ico('deed')}<div><b>${esc(h.name)}</b><small>${esc(region(h.r).name)}</small></div>${h.pad ? `<button class="btn sm" data-a="tphome" data-h="${h.id}">Teleport</button>` : '<small>no pad</small>'}</li>`).join('')}</ul></div>` : '';
    const errands = Object.values(S.er.a || {});
    const jobs = errands.length ? `<div class="card"><h2>Errands</h2><ul class="tale plain">${errands.map(a => `<li>${esc(a.what)} <small>${esc(a.from)} · ${errandProg(a)} · ${a.gold} gold</small><button class="btn sm quiet" data-a="erdrop" data-id="${a.id}">Drop</button></li>`).join('')}</ul></div>` : '';
    if(boatActive())return `<section class="place"><p class="eyebrow">Tamsin's sketch</p><h1>Your map</h1></section>${boatChart()}<p>The Marigold is approaching Tallyport. This is a rough coastal sketch, not your explored land map. Once ashore, walking records nearby terrain and discovered places. Surveys add detail; travel rights are earned separately.</p><p class="cap2">Legend: brass dot · Tallyport; white boat · the Marigold; dashed line · our approach. The unmarked coast is yours to explore.</p>`;
    return CMap.map() + `<button class="btn sm quiet" data-a="sketch">Tamsin's sketch</button>` + '<p class="cap2">Legend: white dot · you; brass marks · discoveries; dark ground · not yet charted. Tap a destination in the list to set a waypoint.</p>' + jobs + homes;
  }
  let sketchCache = '';
  function boatChart() {
    if(!sketchCache){const paths=[];for(let y=720;y<=1120;y+=4){let start=-1;for(let x=120;x<=744;x+=4){const land=x<744&&Geography.land(x,y);if(land&&start<0)start=x;if(!land&&start>=0){paths.push(`M${start},${y}h${x-start}v4H${start}z`);start=-1;}}}sketchCache=paths.join('');}
    return `<figure class="boat-chart"><svg viewBox="120 720 620 400" role="img" aria-label="A rough sketch of the southern coast, the Marigold offshore, and Tallyport"><rect x="120" y="720" width="620" height="400" fill="#d9cfaa"/><path d="${sketchCache}" fill="#b4a275"/><path d="M205 1000 Q230 950 320 930" fill="none" stroke="#5c7580" stroke-width="3" stroke-dasharray="8 7"/><path d="M196 1005l9-24 9 24z" fill="#fff9df" stroke="#4b5d66" stroke-width="2"/><circle cx="320" cy="930" r="6" fill="#8f5b13"/><text x="332" y="920" fill="#352e20" font-size="20">Tallyport</text><text x="150" y="1040" fill="#354e5c" font-size="18">Marigold</text><text x="400" y="810" fill="#645c43" font-size="18">Uncharted inland</text><text x="155" y="755" fill="#4b5d66" font-size="16">N ↑</text></svg><figcaption>Tamsin's incomplete coastal chart</figcaption></figure>`;
  }

  /* ---------- speech box: along the bottom of the world, one line at a time, choices at the end ---------- */
  let SB = null;
  const optHTML = o => `<button class="opt" data-a="${o.a}"${Object.keys(o.d || {}).map(k => ` data-${k}="${esc(o.d[k])}"`).join('')}${o.off ? ' disabled' : ''}><span>${esc(o.t)}</span>${o.n ? `<small>${esc(o.n)}</small>` : ''}</button>`;
  function dlg(e, line, opts, extra) {
    const parts = FirstDay.dialogue(line);
    if (SB) clearInterval(SB.timer); $('#sheet').hidden = true;
    opts = (opts || []).filter(Boolean); if (opts.length === 1 && opts[0].a === 'closesheet') opts = [];
    // authored thoughts stay intact; choices wait until the final beat, including on return visits
    const tk = e ? (e.hid || `${e.kind}.${e.r}.${e.i != null ? e.i : e.name}`) : null; S.tk = S.tk || {}; const quick = false; if (tk) S.tk[tk] = 1;
    SB = { parts, i: 0, n: 0, opts, extra: extra || '', timer: 0, typing: false, done: false, quick };
    const img = e && (e.spr || e.obj || (ART && e.pt)) ? Scene.portrait(e) : '', pa = img.slice(0, 4) === 'art/' ? ' art' + (e.pt ? ' face' : '') : '', el = $('#say'); el.hidden = false;
    el.innerHTML = `<div class="say-wrap">${img ? `<img class="say-port${pa}" alt="" src="${img}"><i class="say-ring"></i>` : ''}<div class="say-name${img ? '' : ' noport'}"><b>${esc(e ? e.name : '')}</b>${e && e.sub ? `<small>${esc(e.sub)}</small>` : ''}</div><div class="say-box"><p class="say-text" id="say-text"></p><div id="say-extra"></div><div class="opts" id="say-opts"></div></div><span class="say-more" id="say-more">▾</span></div>`;
    if (quick) { SB.done = true; $('#say-text').textContent = parts[0]; $('#say-extra').innerHTML = SB.extra; $('#say-opts').innerHTML = opts.map(optHTML).join(''); $('#say-more').hidden = parts.length < 2; return; }
    sayType();
  }
  function sayType() {
    if (FAST()) { SB.i = SB.parts.length - 1; return sayStop(); }
    const full = SB.parts[SB.i]; SB.n = 0; SB.typing = true; $('#say-more').hidden = true; clearInterval(SB.timer);
    SB.timer = setInterval(() => { if (!SB) return; SB.n = Math.min(full.length, SB.n + 2); const t = $('#say-text'); if (t) t.textContent = full.slice(0, SB.n); if (SB.n >= full.length) sayStop(); }, 18);
  }
  function sayStop() {
    clearInterval(SB.timer); SB.typing = false; $('#say-text').textContent = SB.parts[SB.i]; const last = SB.i >= SB.parts.length - 1; $('#say-more').hidden = last && (SB.opts.length > 0 || SB.quick);
    if (last && !SB.done) { SB.done = true; $('#say-extra').innerHTML = SB.extra; $('#say-opts').innerHTML = SB.opts.map(optHTML).join(''); }
  }
  function sayTap() { if (!SB) return; if (SB.typing) return sayStop(); if (SB.i < SB.parts.length - 1) { SB.i++; sayType(); } else if (!SB.opts.length) closeSay(); }
  function closeSay() { if (SB) clearInterval(SB.timer); SB = null; if (sceneUp && S && !gOn() && Scene.guideEnt()) Scene.guideOff(); const el = $('#say'); if (el) { el.hidden = true; el.innerHTML = ''; } }
  const bye = { t: 'Goodbye', a: 'closesheet' }, back = { t: 'Back', a: 'talk' };
  let ferryTicket = 0;
  function ferryOffer(e) {
    const to = WorldServices.ferryDestination(Scene.ferries(), e, Scene.pos());
    if (!to) return;
    const name = region(to.r).name, ticket = ++ferryTicket;
    dlg(e, `I can take you to ${name} whenever you’re ready. It’s a free crossing.`,
      [{ t: 'Board for ' + name, a: 'ferryboard', d: { ticket, route: e.route, side: e.side } }, { t: 'Stay ashore', a: 'closesheet' }]);
    SB.ferryTicket = ticket;
  }
  function boardFerry(d) {
    const e = CE;
    if (!d || !sceneUp || tab !== 'world' || F || Q || DG || Scene.inDungeonMap() || !SB || !SB.done ||
        !SB.ferryTicket || String(d.ticket) !== String(SB.ferryTicket) ||
        !e || d.route !== e.route || d.side !== e.side) return;
    const pos = Scene.pos(), to = WorldServices.ferryDestination(Scene.ferries(), Scene.find(n => n === e), pos);
    if (!to) {
      closeSay();
      return toast('Step up to the ferryman to board.');
    }
    if (Scene.find(n => n.chase > 0 && Math.hypot(n.x - pos[0], n.y - pos[1]) < 16)) return toast('Shake off your pursuer before boarding.');
    const [x, y] = to.at, landing = [[x, y + 1], [x + 1, y], [x - 1, y], [x, y - 1]].find(([tx, ty]) => {
      const at = Scene.safePosition([tx, ty], to.r);
      return at && at[0] === tx && at[1] === ty;
    });
    if (!landing) return toast('The ferry can’t dock here yet.');
    closeSheet();
    CE = null;
    clearInterval(GSAY);
    Scene.guideOff();
    S.pos = landing;
    S.region = to.r;
    S.been[to.r] = 1;
    Scene.load(landing, to.r);
    S.pos = Scene.pos();
    S.region = Scene.region();
    sel = S.region;
    S.been[S.region] = 1;
    surfaceBodies();
    save();
    render();
    toast('Arrived at ' + region(S.region).name);
  }
  const jobsOf = e => CONTRACTS.filter(c => c.r === e.r && giverOf(c) === e.i);
  const here = () => (CE && CE.r) || S.region;
  function odalys(line) { const e = sceneUp && !Scene.inDungeon() && Scene.find(x => x.kind === 'npc' && x.i === 0 && x.r === 1); if (e) setTimeout(() => { if (!Q && !F && !SB) { CE = e; dlg(e, line, [bye]); } }, FAST() ? 0 : 350); }

  /* ---------- the guided first day. Tamsin, the deckhand who pulled you out, walks you round Tallyport one thing at a time. ---------- */
  const T1 = () => Scene.towns()[1], SP = k => Scene.spots()[k], entAt = f => { const e = Scene.find(f); return e && [e.x, e.y]; }, odAt = () => entAt(x => x.kind === 'npc' && x.i === 0 && x.r === 1);
  const nearest = f => { if (!sceneUp) return null; const p = Scene.pos(), m = Scene.debug().map; if (!p || !m) return null; let best = null, bd = 1e9; for (const e of m.ents) if (f(e) && !e.dying) { const d = Math.hypot(e.x - p[0], e.y - p[1]); if (d < bd) { bd = d; best = e; } } return best && [best.x, best.y]; };
  const off = (a, dx, dy) => a && [a[0] + dx, a[1] + dy];
  const GD = [
    { id: 'walk', ob: 'Push the joystick gently to walk', at: () => off(SP('dock'), 3, 0), say: '"Welcome ashore. We’ll take it easy while you get your land legs back. Give the joystick at the bottom right a little push and I’ll walk with you."' },
    { id: 'run', ob: 'Push the joystick toward its rim to run', at: () => off(SP('dock'), 11, 0), say: '"You look steadier now. Push the joystick farther out when you want to run, and let go when you want to stop."' },
    { id: 'folk', ob: 'Walk up to someone on the dock and tap to talk', at: () => off(T1(), -14, 2), arrow: () => nearest(e => e.kind === 'folk' && e.r === 1), say: '"A few people have been asking how you’re doing. Go up to someone and tap them to say hello. I’ll be here when you’re done."' },
    { id: 'odalys', ob: 'Go into the dojo, north-east of the square (!)', at: () => off(SP('dojo1'), 1, 1), arrow: () => SP('dojo1'), hall: () => entAt(x => x.kind === 'odalys'), say: ['"There’s something you should know before we see Odalys. She taught Ilva Thorne, and Ilva trained Corin Hale, our last champion. Corin died in the Bilge Vaults. Now Tallyport needs someone to take the Trials so it can get its seat on the council back."','"All I’ve asked Odalys for is a lesson, so you can see if the work suits you. She’s at the dojo northeast of the square. Go up to the door marked ! and tap it. I’ll wait outside while you talk."'] },
    { id: 'fight', ob: 'Walk to the green south of town and tap a creature', tabs: ['ledger'], at: () => off(T1(), 5, 13), arrow: () => nearest(e => e.kind === 'mon' && e.r === 1 && !e.inst.elite), say: '"You’ve practised an ability safely with Odalys. Let’s try it on the green south of town. Tap a creature, choose the ability you practised, and answer its question. Watch your health, since a creature can fight back."' },
    { id: 'loot', ob: 'Tap the body to take what it dropped', arrow: () => nearest(e => e.kind === 'corpse' && e.r === 1 && e.loot), say: '"You won. Tap the body to see what it dropped, then choose what to take. I have a spare weapon for you once you’ve finished."' },
    { id: 'bag', ob: 'Open your Bag and equip the weapon Tamsin gave you', tabs: ['bag', 'hero'], say: ['"We had a spare weapon aboard the Marigold, so I brought it for you. Open your Bag, tap the weapon, and choose Equip. The Hero screen shows what you’re wearing and holding."','"I brought two pieces of dark bread as well. Each restores 12 health. Tap the bread under Supplies and choose Eat if you’re hurt. Save the Healing Draught for when you need up to 30 health back."'] },
    { id: 'sell', ob: 'Sell the old weapon at the stall', at: () => off(entAt(x => x.kind === 'stallkeep' && x.r === 1), 1, 1), arrow: () => entAt(x => x.kind === 'stallkeep' && x.r === 1), say: '"That rusty weapon won’t fetch much, but the stallkeeper will take it. Choose Sell goods, then choose the old weapon and review the sale. You’ll keep whatever you’re wearing or holding."' },
    { id: 'page', ob: 'Visit Odalys and buy another ability from Pages for sale', at: () => off(odAt(), 1, 1), arrow: odAt, say: ['"You used your first ability in that fight. We call an ability a page because you learn it in a book. The Hero screen keeps your Book of Arms, Spellbook, Book of Shadows and Pattern Book, along with the pages you know."','"Odalys sells more abilities. Go back to her, choose Pages for sale, and buy one you’d like to try. It goes straight into its book, ready to choose when you act."'] },
    { id: 'bank', ob: 'Talk to the banker and deposit your gold', at: () => off(entAt(x => x.kind === 'banker' && x.r === 1), -1, 0), arrow: () => entAt(x => x.kind === 'banker' && x.r === 1), say: '"See the banker before we go any farther. You can leave your gold in the bank while we look around the vaults."' },
    { id: 'tower', ob: 'Climb the harbor tower by the pier', at: () => off(SP('tower'), 1, 1), arrow: () => SP('tower'), say: '"Come up the harbor tower with me. From there I can show you where the road goes when it leaves town."' },
    { id: 'fish', ob: 'Cast a line off the end of the pier, or tap Tamsin to skip', tabs: ['map'], at: () => off(SP('pierfish'), 2, 0), arrow: () => SP('pierfish'), say: '"Everyone in Tallyport fishes. Cast a line off the end of the pier if you like, or tap me and we’ll skip it."' },
    { id: 'vault', ob: 'Find the Bilge Vaults entrance · dojo practice is available first', at: () => off(SP('dun1'), 1, 0), arrow: () => entAt(x => x.kind === 'stairs' && x.r === 1), say: '"Corin died far below us in the Bilge Vaults. We’re starting near the entrance today. Defeat the entrance guardian and open the starter chest beside it. There are other creatures farther inside. If their queries feel unfamiliar, the dojo students can teach you sorting, limits and removing duplicates before you explore. I’ll wait here so you have someone to come back to."' },
    { id: 'chest', ob: 'Defeat the entrance guardian, then open the starter chest', arrow: () => nearest(e => e.tutorial && !e.dead && !e.dying) },
    { id: 'road', ob: 'Walk with Tamsin to the examiner’s ring on the road out', at: () => off(SP('boss1'), 0, 3), arrow: () => SP('boss1'), say: '"That’s enough of the cellar for now. Come back up and I’ll walk with you to the road. You can see the examiner’s ring before I head back to the ship."' }];
  const gOn = () => S.gd >= 0 && S.gd < GD.length, gid = () => gOn() ? GD[S.gd].id : null, gix = id => GD.findIndex(g => g.id === id);
  const gTabs = () => { const t = ['world']; for (let i = 0; i <= Math.min(S.gd, GD.length - 1); i++) (GD[i].tabs || []).forEach(x => t.push(x)); return t; };
  const tamsin = () => (sceneUp && (Scene.find(x => x.kind === 'guide') || Scene.guideEnt())) || { name: 'Tamsin', sub: 'Deckhand, the Marigold', pt: ART && ArtData.faces ? ArtData.faces.fisher : undefined };
  let GSAY = 0;
  function gSay(line, opts) { clearInterval(GSAY); if (!line) return; let n = 0; const character=S, step=S.gd; GSAY = setInterval(() => { if (++n > 600 || !gOn() || S!==character || S.gd!==step) return clearInterval(GSAY); if (!S || Q || F || SB || !$('#sheet').hidden || !$('#enc').hidden || !$('#coach').hidden || tab !== 'world' || !$('#title').hidden || !sceneUp || Scene.inHall() || Scene.inDungeon() || Scene.traveling()) return; const p=Scene.pos(),e=Scene.guideEnt(); if (!e || Math.hypot(e.fx-p[0],e.fy-p[1])>4) return; clearInterval(GSAY); CE = tamsin(); dlg(CE, line, opts || [bye]); }, FAST() ? 30 : 350); }
  function gPlace() { if (!sceneUp || Scene.inShip()) return; if (!gOn() || S.region !== 1) return Scene.guideOff(); if (Scene.guideEnt()) return; const p = Scene.inHall() || Scene.inDungeon() ? S.pos || SP('dock') : Scene.pos(); if (p) Scene.guidePut(p[0] + 1, p[1]); }
  function gEnter(quiet, boot) { clearInterval(GSAY); if (!gOn()) return; const g = GD[S.gd]; gPlace(); if (g.tabs && !boot) S.gn = g.tabs[0]; renderNav(); if (g.id === 'bag') gGift();if(g.id==='vault'&&!S.knownEntrances?.[1]){S.knownEntrances=S.knownEntrances||{};S.knownEntrances[1]=true;save();} if (!quiet) gSay(g.say, g.id === 'fish' ? [{ t: 'Skip it', a: 'gnext' }, { t: 'I’ll cast', a: 'closesheet' }] : null); HOST._k = null; }
  function gDone(id) { if (gid() !== id) return; S.gd++; save(); if (S.gd >= GD.length) return gEnd(); gEnter(); }
  function gGift() { if (S.gk && itemById(S.gk)) return; const it = makeItem('uncommon', 1, 'weapon', S.path === 'mage' ? 'magery' : armsSkill()); S.inv.push(it); S.gk = it.id; addFood('loaf', 2); save(); }
  function gEnd() { S.gd = GD.length; S.tut = 3; S.hints++; S.gn = 0; save(); renderNav(); CE = tamsin(); dlg(CE, `"That’s Varrick’s ring. If you want more practice before you talk to him, Odalys has work for you back in town. I’m due aboard the Marigold, so this is where I leave you. Thanks for keeping me company today, ${S.name || 'friend'}."`, [bye]);  toast('Tamsin returns to the Marigold. You received a Hint Key.'); }
  let GW = 0; function gMoved(x, y, dun, run) { if (S.region !== 1) return; const id = gid(); if (id === 'walk' && ++GW >= 2) { GW = 0; gDone('walk'); } else if (id === 'run' && run && ++GW >= 3) { GW = 0; gDone('run'); } else if (id === 'road' && !dun) { const b = SP('boss1'); if (b && Math.hypot(b[0] - x, b[1] - y) < 6) gDone('road'); } }
  function gSkip() { if (!S.met['1.0']) { S.met['1.0'] = 1; S.done.c101 = S.done.c102 = { t: now(), tries: 0, hint: 0 }; S.gold += 25; } if (!S.gk) gGift(); S.gd = GD.length; S.tut = 3; S.hints++; S.gn = 0; save(); if (sceneUp) Scene.guideOff(); closeSay(); render(); toast('Odalys Brine teaches the First Circle, by the guildhall'); }

  /* ---------- the dojos: practice dummies, students sparring, a tournament in every town ---------- */
  const DJ = r => { S.dj = S.dj || {}; return S.dj[r] || (S.dj[r] = {}); };
  const tName = r => REGIONS[r - 1].name;
  let DU = null, SPT = 0, SPN = 0, ODX = null;
  const fsEnt = (o, kind, x, y, ex) => Object.assign({ kind, x, y, fs: o.row, ff: 0, name: o.name, sub: o.sub || '', pt: o.pt }, ex || {});
  function hallFill(r) {
    const M = Dojo.MASTERS[r - 1], st = Dojo.STUDENTS(r), b = S.djb && S.djb.r === r ? S.djb : null, intro = r === 1 && gid() === 'odalys', out = [];
    out.push(fsEnt(M, 'master', 5, 4, { sub: 'Master of the dojo' }));
    if (intro) { out.push(fsEnt(st[0], 'student', 8, 9, { i: 0, ff: 0 }), fsEnt(st[1], 'student', 8, 12, { i: 1, ff: 0 }), fsEnt(Dojo.ODALYS, 'odalys', 6, 6, { sub: 'First Circle master' }), { kind: 'dummy', i: 9, x: 5, y: 8, name: 'Training dummy', sub: 'Odalys’s', ok: 'dj_dummy' }); }
    else { out.push(fsEnt(st[0], 'student', 4, 8, { i: 0, ff: 1, spar: 1 }), fsEnt(st[1], 'student', 7, 8, { i: 1, ff: 1, spar: 1, flip: 1 })); }
    out.push(fsEnt(st[2], 'student', 8, 6, { i: 2 }));
    if (b && !b.out) { out.push(fsEnt(Dojo.RIVAL, 'sorrel', 8, 13)); const tv = Dojo.TRAVEL[b.trav]; out.push(fsEnt(tv, 'traveler', 3, 11, { i: b.trav })); }
    if (r > 1 && DJ(r - 1).sorrel && Dojo.NOTES[r - 2]) out.push({ kind: 'rnote', x: 3, y: 13, name: 'A note on a post', sub: 'Pinned with a dagger', ok: 'dj_note' });
    return out;
  }
  function enterDojo(r) { closeSay(); clearInterval(SPT); Scene.enterHall(r, hallFill(r)); SPN = 0; SPT = setInterval(sparTick, 140); if (r === 1 && gid() === 'odalys') setTimeout(() => { const o = Scene.find(x => x.kind === 'odalys'); if (o && !SB) { CE = o; dlg(o, '"Over here. Let’s have a look at you."', [bye]); } }, 600); }
  function leaveDojo() { clearInterval(SPT); SPT = 0; if (DU) duClose(true); Scene.load(S.pos, S.region); placeBody(); render(); }
  // the two students in the ring trade blows when nothing else is going on
  const SEQ = [1, 2, 3, 4, 4, 5, 1, 1];
  function fighterPose(e,frame,hold){if(e.ff!==frame||!e.ffPose)e.ffPose={frame,at:performance.now(),hold};e.ff=frame;}
  function sparTick() {
    if (!sceneUp || !Scene.inHall()) { clearInterval(SPT); SPT = 0; return; }
    if (DU && DU.mode !== 'watch') return; const pr = Scene.ents().filter(e => e.spar); if (pr.length < 2 || (DU && DU.mode === 'watch')) return;
    const n = SPN++ % 40, who = (SPN / 40 | 0) % 2, a = pr[who], d = pr[1 - who];
    if (n < 16) { const frame=SEQ[Math.min(SEQ.length-1,n>>1)];fighterPose(a,frame,frame===4?560:280); d.ff = n >= 7 && n < 11 ? 6 : 1; } else { a.ff = 1; d.ff = 1; }
  }
  // a short animation of one fighter striking another (or the dummy); calls done when it lands
  function strike(att, def, done) {
    const fr = [2, 3, 4, 4, 5, 1]; let i = 0; if (!att) return done && done();
    const t = setInterval(() => { fighterPose(att,fr[i],FAST()?1:fr[i]===4?220:110); if (i === 3) { if (def && def.fs != null) def.ff = 6; if (done) done(); } if (++i >= fr.length) { clearInterval(t); setTimeout(() => { if (def && def.fs != null) def.ff = 1; }, 300); } }, FAST() ? 1 : 110);
  }
  function hurtDummy(e, broken) { if (!e) return; e.ok = broken ? 'dj_dummy2' : 'dj_dummy1'; e.obj = null; e.sv = -1; if (!broken) setTimeout(() => { e.ok = 'dj_dummy'; e.obj = null; e.sv = -1; }, 550); }
  const djTask = c => { const tpl = pick(BOUNTIES.filter(b => b.r === c)).id; return makeTask({ tpl, seed: seeded(tpl) }); };
  const djCircle = (r, bout) => bout < 2 ? pick([Math.max(1, r - 1), r]) : r;

  /* ----- the duel panel: your query against theirs ----- */
  const djTokens = () => { const won = [1, 2, 3, 4, 5, 6, 7, 8].filter(r => S.dj && S.dj[r] && S.dj[r].champ); return won.length ? `<section class="sec"><h2>Dojo tokens <small>${won.length} of 8</small></h2><div class="toks">${won.map(r => `<span title="${esc(tName(r))}">${ico('dz' + (8 + r))}</span>`).join('')}</div></section>` : ''; };
  const STUL = ["\"I put my name down for the tournament this week. I hope I get past the first round this time.\"", "\"We spar every day. I can show you how a round works if you’d like to watch.\"", "\"I keep forgetting GROUP BY, so the master made me sort the laundry by color before I could have another go.\"", "\"You’ll see a few of the same fighters in every town. I always dread drawing Granny Wick. She finishes her query while I’m still working out what the question means.\""], TRVL = ["\"I’m Brick Dorran. I’ll be at the board when the next bout goes up.\"", "\"I’ve been entering these tournaments since before your master was born. The name’s Wick. You may as well call me Granny, since everyone else does.\"", "\"I’m P-Pip Lowell. I’ve never made it past the second round, so if I get any farther today I’m buying myself supper.\""];
  const veil = html => html.replace(/>([^<]*)</g, (m, t) => '>' + t.replace(/&[a-z#0-9]+;|[A-Za-z0-9_]/g, x => x.length > 1 ? '•' : '•') + '<');
  const hlq = sql => SqlEd.hl(sql, new Set(tablesIn(sql).concat(['training_dummy', 'dummy_joints'])));
  function duOpen(cfg) {
    closeSay(); closeSheet(); DU = Object.assign({ st: 'prompt', score: [0, 0], round: 0, out: '' }, cfg); Scene.FX.lock(true);
    $('#fight').hidden = false; $('#nav').hidden = true; $('#ctx').hidden = true; $('#app').classList.add('infight'); Scene.resume();
    if (DU.mode === 'duel' || DU.mode === 'watch') duRound(); else { DU.task = djTask(DU.c); duDraw(); }
  }
  function duClose(quiet) { if (!DU) return; clearInterval(DU.timer); const d = DU; DU = null; $('#fight').hidden = true; $('#fight').innerHTML = ''; $('#nav').hidden = false; $('#app').classList.remove('infight'); Scene.FX.lock(false); Scene.FX.inset(0);
    if (d.mode === 'duel' && d.opp) { d.opp.ff = 0; } if (!quiet) render(); }
  function duRound() {
    clearInterval(DU.timer); DU.st = 'prompt'; DU.out = ''; DU.round++; DU.c = DU.mode === 'watch' ? DU.r : djCircle(DU.r, DU.bout); DU.task = djTask(DU.c);
    const L = DU.task.sql.length, mul = DU.mode === 'watch' ? .5 : [1.6, 1.4, 1.25, 1.1, .95][DU.bout];
    DU.o = { st: 'think', t0: Date.now(), think: 3000 + rnd() * 3000, T: (22000 + L * 900) * mul, wrong: rnd() < (DU.mode === 'watch' ? .3 : [.4, .32, .25, .18, .12][DU.bout]), typed: 0, tries: 0 };
    if (DU.mode === 'watch') DU.w = { who: rnd() < .5 ? 0 : 1 };
    DU.timer = setInterval(duTick, FAST() ? 5 : 120); duDraw();
  }
  function duTick() {
    if (!DU || DU.st !== 'prompt' || !DU.o) return; const o = DU.o, now2 = Date.now(), sql = DU.task.sql;
    if (o.st === 'think' && now2 - o.t0 > o.think * (FAST() ? .01 : 1)) { o.st = 'type'; o.t1 = now2; }
    else if (o.st === 'type') { o.typed = Math.min(sql.length, Math.ceil(sql.length * (now2 - o.t1) / (o.T * (FAST() ? .002 : 1)))); if (o.typed >= sql.length) { o.st = 'run'; o.t2 = now2; } }
    else if (o.st === 'run' && now2 - o.t2 > (FAST() ? 5 : 800)) {
      if (o.wrong) { o.tries++; o.wrong = rnd() < .25; o.T *= .55; o.st = 'type'; o.t1 = now2; o.typed = 0; DU.oline = 'Their query ran and came back wrong. They start again.'; }
      else return duEnd(DU.mode === 'watch' ? DU.w.who : 1);
    }
    const s = $('#du-oq'); if (s) s.innerHTML = o.st === 'think' ? '<i class="cap2">thinking…</i>' : (DU.mode === 'watch' ? hlq(sql.slice(0, o.typed)) : veil(hlq(sql.slice(0, o.typed)))) + (o.st === 'type' ? '<span class="du-caret"></span>' : '');
    const p = $('#du-op'); if (p) p.textContent = o.st === 'think' ? '' : o.st === 'run' ? 'running it…' : `${Math.round(100 * o.typed / sql.length)}%`;
    const l = $('#du-ol'); if (l) l.textContent = DU.oline || '';
  }
  // round over: w = 0 you, 1 them
  function duEnd(w, mine) {
    if (!DU || DU.st !== 'prompt') return; clearInterval(DU.timer); DU.st = 'after'; DU.score[w]++; DU.mine = mine || '';
    const me = DU.mode === 'watch' ? DU.a : 'me', them = DU.mode === 'watch' ? DU.b : DU.opp;
    if (DU.mode === 'watch') { const win = w ? DU.b : DU.a, lose = w ? DU.a : DU.b; strike(win, lose); }
    else if (w) strike(them, null, () => Scene.FX.swing(them, 'me', 'hit')); else { Scene.FX.swing('me', them, S.path === 'mage' ? 'spell' : 'hit'); them.ff = 6; setTimeout(() => { if (them) them.ff = 1; }, 600); }
    const need = 2; DU.done = DU.score[0] >= need || DU.score[1] >= need; duDraw();
  }
  function duRun() {
    if (!DU || DU.st !== 'prompt' || DU.mode === 'watch') return; const sql = $('#sql').value; if (!sql.trim()) return toast('Write a query first');
    const res = Engine.grade(DU.task, sql); S.stats.q++;
    if (res.ok) { S.stats.ok++; trainSql(res.used || [], DU.c, sql); if (DU.mode === 'practice') { const d = DU.dummy; Scene.FX.swing('me', d, S.path === 'mage' ? 'spell' : 'hit'); hurtDummy(d); Scene.FX.hit(d, '✓', '#ffe9a0'); DU.n = (DU.n || 0) + 1; DU.task = djTask(DU.c); DU.out = `<div class="verdict ok"><p>Clean hit. ${DU.n} so far. Here's another.</p></div>`; save(); return duDraw(); } save(); return duEnd(0, sql); }
    $('#f-out').innerHTML = `<div class="verdict err"><p>${esc(res.err || res.msg || 'Not the answer yet.')}</p></div>`; fitDU();
  }
  const fitDU = () => {if(DU)fitPanel();};
  const pips = n => '●'.repeat(n) + '○'.repeat(Math.max(0, 2 - n));
  function duDraw() {
    const el = $('#fight'), D = DU; let h = '';
    if (D.mode === 'practice') h = `<div class="f-head"><div><b>Training dummy</b><small>${CIRCLE[D.c]} Circle · no risk, no reward but practice</small></div><div class="f-btns"><button class="btn sm quiet" data-a="ftables">Tables</button><button class="btn sm quiet" data-a="dudone">Done</button></div></div><p class="ask">${esc(D.task.ask)} ${needLine(D.task)}</p><div id="f-out">${D.out}</div>${kbHTML(D.task, D.c, 'Strike')}`;
    else if (D.mode === 'watch') {
      const [x, y] = D.w.who ? [D.b, D.a] : [D.a, D.b];
      h = `<div class="f-head"><div><b>${esc(D.a.name)} ${pips(D.score[0])} · ${pips(D.score[1])} ${esc(D.b.name)}</b><small>Watching · round ${D.round}</small></div><div class="f-btns"><button class="btn sm quiet" data-a="dudone">Stop watching</button></div></div><p class="ask">${esc(D.task.ask)}</p>`;
      if (D.st === 'prompt') h += `<p class="cap2"><b>${esc(x.name)}</b> is writing <span id="du-op"></span></p><pre class="code du-oq" id="du-oq"></pre><p class="cap2" id="du-ol"></p>`;
      else h += `<p class="cap2"><b>${esc(x.name)}</b> wins the round with:</p><pre class="code du-oq">${hlq(SqlEd.format(D.task.sql))}</pre><div class="row end">${D.done ? '<button class="btn solid" data-a="dudone">Done</button>' : '<button class="btn solid" data-a="dunext">Next round</button>'}</div>`;
    } else {
      const o = D.opp, lab = D.bout === 4 ? 'Against the master' : ['Round of sixteen', 'Quarter-final', 'Semi-final', 'Final'][D.bout];
      h = `<div class="f-head"><div><b>You ${pips(D.score[0])} · ${pips(D.score[1])} ${esc(o.name)}</b><small>${lab} · first to two rounds</small></div><div class="f-btns"><button class="btn sm quiet" data-a="ftables">Tables</button>${D.st === 'prompt' ? '<button class="btn sm quiet" data-a="duyield">Yield round</button>' : ''}</div></div><p class="ask">${esc(D.task.ask)} ${needLine(D.task)}</p>`;
      if (D.st === 'prompt') h += `<div class="du-strip"><img alt="" src="${ART ? 'art/p/' + o.pt + '.webp' : ''}"><div><small>${esc(o.name)} <span id="du-op"></span></small><pre class="code du-oq" id="du-oq"></pre><small id="du-ol" class="cap2"></small></div></div><div id="f-out"></div>${kbHTML(D.task, D.c, 'Strike')}`;
      else { const won = D.score[0] > D.score[1] && D.done, lost = D.done && !won;
        h += `<div class="verdict ${D.mine ? 'ok' : 'err'}"><p>${D.mine ? 'You took the round.' : `${esc(o.name)} took the round.`}</p></div><p class="cap2">${esc(o.name)}’s query:</p><pre class="code du-oq">${hlq(SqlEd.format(D.task.sql))}</pre>${D.mine ? `<p class="cap2">Yours:</p><pre class="code du-oq">${hlq(SqlEd.format(D.mine))}</pre>` : ''}<div class="row end">${D.done ? `<button class="btn solid" data-a="duover">${won ? 'You win the bout' : lost ? 'You lose the bout' : 'Go on'}</button>` : '<button class="btn solid" data-a="dunext">Next round</button>'}</div>`; }
    }
    el.innerHTML = h; el.className = 'st-' + (D.st === 'prompt' && D.mode !== 'watch' ? 'prompt' : 'after') + ' duel'; if (D.st === 'prompt' && D.mode !== 'watch') { kbDraw(); kbFocus(); } duTick(); fitDU();
  }

  /* ----- the tournament: sixteen in a bracket, four bouts to win it, then the master ----- */
  // seats: 0 you, 1 a local student, 2-3 a traveller's half, 4-7 another student's quarter, 8-15 Sorrel's half. The others' bouts are settled when you sign up.
  function djSign(r) {
    const st = Dojo.STUDENTS(r), trav = (r + 1) % 3, fill = Dojo.FILL.slice().sort(() => rnd() - .5), seats = [{ n: S.name || 'You', me: 1 }, { n: st[0].name }, { n: Dojo.TRAVEL[trav].name }, { n: fill[0] }, { n: st[1].name }, { n: fill[1] }, { n: fill[2] }, { n: fill[3] }, { n: Dojo.RIVAL.name }];
    for (let i = 4; i < 11; i++) seats.push({ n: fill[i] });
    S.djb = { r, seats, trav, round: 0, out: 0, wins: [[], [], [], []] };
    // everyone else's results, with the people you meet winning their way to you
    const W = S.djb.wins, force = { 2: 2, 4: 4, 8: 8 };
    let alive = seats.map((_, i) => i);
    for (let rd = 0; rd < 4; rd++) { const nx = []; for (let k = 0; k < alive.length; k += 2) { const a = alive[k], b = alive[k + 1]; let w = a === 0 ? 0 : b === 0 ? 0 : [a, b].find(x => Object.values(force).includes(x)) ?? (rnd() < .5 ? a : b); if (a === 0 || b === 0) w = 0; nx.push(w); W[rd].push([a, b, a === 0 || b === 0 ? null : w]); } alive = nx; }
    S.gold -= 15 * r; save();
  }
  const djOpp = (b, rd) => { const r = b.r, st = Dojo.STUDENTS(r); return [st[0], Dojo.TRAVEL[b.trav], st[1], Dojo.RIVAL][rd]; };
  function bracketHTML(b) {
    const nm = i => b.seats[i].me ? '<b>You</b>' : esc(b.seats[i].n), RN = ['Round of sixteen', 'Quarter-finals', 'Semi-finals', 'Final'];
    return b.wins.map((rd, k) => `<section class="sec"><h2>${RN[k]}</h2><ul class="brk">${rd.map(([a, x, w]) => { const mine = a === 0 || x === 0, res = mine ? (k < b.round ? 'won' : k === b.round && !b.out ? 'next' : b.out && k === b.round ? 'lost' : '') : ''; return `<li class="${res}">${nm(a)} <small>vs</small> ${nm(x)}${w != null && k <= b.round ? ` <small>· ${esc(b.seats[w].n)} goes through</small>` : res ? ` <small>· ${res === 'next' ? 'your bout' : res === 'won' ? 'you won' : 'you lost'}</small>` : ''}</li>`; }).join('')}</ul></section>`).join('');
  }
  function djBoard(r) {
    const b = S.djb && S.djb.r === r ? S.djb : null, st = DJ(r), fee = 15 * r;
    const head = `<p class="eyebrow">${esc(tName(r))} dojo</p><h2>The tournament</h2>`;
    if (b && !b.out && b.round < 4) return sheet(`${head}<p class="story">You’re facing ${esc(djOpp(b, b.round).name)} in bout ${b.round + 1} of 4. You both get the same query to write each round. Answer correctly before your opponent to take the round, and win two rounds to take the bout.</p>${bracketHTML(b)}<div class="row end"><button class="btn quiet" data-a="closesheet">Later</button><button class="btn solid" data-a="djfight">Fight the next bout</button></div>`);
    sheet(`${head}<p class="story">There are sixteen fighters in the tournament. Win four bouts to face the master. You and your opponent get the same question each round, and whoever answers correctly first wins that round. Entry costs ${fee} gold.</p>${st.champ ? `<p class="cap2">You won this tournament${st.master ? ' and beat the master' : ''}.</p>` : ''}${b && b.out ? `<p class="cap2">You went out in the ${['round of sixteen', 'quarter-final', 'semi-final', 'final'][b.round]}. Pay again to have another go.</p>` : ''}<div class="row end"><button class="btn quiet" data-a="closesheet">Not now</button><button class="btn solid" data-a="djsign"${S.gold < fee ? ' disabled' : ''}>Enter, ${fee} gold</button></div>`);
  }
  function djFight() { const b = S.djb, r = b.r, o = djOpp(b, b.round), e = Scene.find(x => x.name === o.name && x.fs != null) || null; boutStart(r, b.round, o, e); }
  function boutStart(r, bout, o, e) {
    closeSheet(); closeSay(); Scene.ents().filter(x => x.spar).forEach((x, k) => { x.spar = 0; x.ff = 0; x.flip = 0; if (x !== e) Scene.hallMove(x, 9, k ? 10 : 8); });
    let opp = e;
    if (!opp) { opp = Scene.hallAdd(fsEnt(o, 'foe', 7, 8, { flip: 1, ff: 1 })); } else { Scene.hallMove(opp, 7, 8); opp.flip = 1; opp.ff = 1; }
    Scene.hop(4, 8); Scene.FX.face(opp); duOpen({ mode: 'duel', r, bout, opp, oppData: o });
  }
  function boutOver() {
    const d = DU, won = d.score[0] > d.score[1], r = d.r; duClose(true); d.opp.ff = 7;
    if (d.bout === 4) { const st = DJ(r); if (won && !st.master) { st.master = 1; const pd = !!A.djp['m' + r]; if (!pd) { A.djp['m' + r] = 1; const P2 = Object.assign({ id: 'i' + rid(), rarity: 'unique', unique: 1, tier: r }, JSON.parse(JSON.stringify(Dojo.PRIZES[r - 1]))); give(P2); S.gold += 60 * r; S.blessd = (S.blessd || 0) + 1; if (r >= 5) (S.pscr = S.pscr || []).push(makePscr(r + 1)); setTimeout(() => toast(r >= 5 ? 'Also: a bless deed and a power scroll' : 'Also: a bless deed'), 900); } save(); const M = Scene.find(x => x.kind === 'master'); CE = M; const say = pd ? '"Good bout. The prize has already been claimed, but you’ve earned that win."' : Dojo.SAY[r - 1].win + (isMain() ? '\n\n' + Dojo.SAY[r - 1].ilva.join(' ') : ''); return dlg(M || { name: Dojo.MASTERS[r - 1].name, pt: Dojo.MASTERS[r - 1].pt }, say, [pd ? { t: 'Thanks', a: 'closesheet' } : { t: 'Take the prize', n: Dojo.PRIZES[r - 1].name, a: 'closesheet' }]); }
      save(); render(); return toast(won ? 'You beat the master again.' : 'The master wins. Try again any time.'); }
    const b = S.djb; if (!won) { if(b.round===3)DJ(r).sorrelLost=1; b.out = 1; save(); render(); return toast(`${d.opp.name} advances. You can enter the tournament again at the board.`); }
    if (b.round === 3) { DJ(r).sorrel = 1; }
    b.round++; if (b.round === 4) { const st = DJ(r); st.champ = 1; let purse=0; if (!A.djp['c' + r]) { A.djp['c' + r] = 1; purse=120*r;S.gold += purse; } S.djb = null; save(); render(); const M = Scene.find(x => x.kind === 'master');
      const so = Scene.find(x => x.kind === 'sorrel'); if (so) so.ff = 7;
      setTimeout(() => { CE = M; dlg(M, `"You’ve won the ${tName(r)} tournament.${purse ? ` Here’s your purse of ${purse} gold.` : ''} When you’re ready for another bout, I’ll face you myself."`, [{ t: 'Spar the master', n: 'first to two rounds', a: 'djmaster' }, { t: 'Later', a: 'closesheet' }]); }, 500);
      return toast(purse ? `+${purse} gold · Champion of the ${tName(r)} dojo` : `Champion of the ${tName(r)} dojo. The purse was already paid.`); }
    save(); render(); toast(`Through to the ${['', 'quarter-final', 'semi-final', 'final'][b.round]}`);
  }

  /* ----- Odalys and the dummy: the first thing you see in Tallyport ----- */
  const ODQ = `WITH weak AS (\n  SELECT part, strength,\n         RANK() OVER (ORDER BY strength) AS rk\n  FROM training_dummy\n)\nSELECT w.part, j.holds\nFROM weak w\nJOIN dummy_joints j ON j.part = w.part\nWHERE w.rk <= 3;`;
  const TRY = { warrior: 'You swing with everything you’ve got. The blade stops an inch into the straw as if it hit stone, and leaves no mark.', mage: 'You call fire the way you always have. Nothing comes. Your hand is just a hand.', thief: 'You go for the straps at its back. The knot won’t give, and the strap might as well be iron.', crafter: 'You hit the joint where a dummy always splits. The hammer bounces off and stings your arm.' };
  function odx(n) {
    const o = Scene.find(x => x.kind === 'odalys'), dm = Scene.find(x => x.kind === 'dummy' && x.i === 9), me = { name: S.name || 'You', pt: LOOKS[S.path][(S.look != null ? S.look : 0) % 2] };
    closeSay();
    if (n === 1) { Scene.hop(4, 8); Scene.FX.face(dm); let k = 0; const go = () => { Scene.FX.swing('me', dm, S.path === 'mage' ? 'spell' : 'hit'); Scene.FX.hit(dm, '0', '#cfd6d8'); if (++k < 3) setTimeout(go, FAST() ? 1 : 520); else setTimeout(() => { CE = me; dlg(me, TRY[S.path] || TRY.warrior, [{ t: 'Go on', a: 'odx', d: { n: 2 } }]); }, FAST() ? 1 : 500); }; return go(); }
    if (n === 2) { CE = o; return dlg(o, '"Here, let me show you what I look for."', [{ t: 'Watch', a: 'odx', d: { n: 3 } }]); }
    if (n === 3) { const el = $('#odq'); el.hidden = false; let i = 0; const L = ODQ.length; o.ff = 2;
      const t = setInterval(() => { i = Math.min(L, i + 3); el.innerHTML = `<pre class="code">${hlq(ODQ.slice(0, i))}<span class="du-caret"></span></pre>`; o.ff = [2, 3, 4, 4][(i / 30 | 0) % 4];
        if (i >= L) { clearInterval(t); o.ff = 5; let k = 0; const hit = setInterval(() => { Scene.FX.hit(dm, ['−∞', 'crack', 'snap'][k % 3], '#ffe08a'); if (++k >= 5) { clearInterval(hit); hurtDummy(dm, true); o.ff = 0; setTimeout(() => { el.hidden = true; CE = o; dlg(o, '"Did you get a look at the query I wrote? We call that SQL."', [{ t: 'No', a: 'odx', d: { n: 4 } }]); }, FAST() ? 1 : 1400); } }, FAST() ? 1 : 160); } }, FAST() ? 1 : 45); return; }
    if (n === 4) { CE = o; return dlg(o, '"SQL stands for Structured Query Language. A query is an instruction written in SQL. I used one to find the dummy’s weakest joints before I struck them. You’ll practise with a copy of the ship’s manifest, so you can work things out without changing the crew’s records."', [{ t: 'Go on', a: 'odx', d: { n: 5 } }]); }
    if (n === 5) { CE = o; const arm = { warrior: 'Your sword arm', mage: 'Your magic', thief: 'Your quick hands', crafter: 'Your trade' }[S.path] || 'Your strength'; return dlg(o, `"${arm} will still serve you here. Learning what to look for in the Ledger will help you use it. Let’s start with something the porter needs from the ship’s manifest. We can talk about the Trials when you’ve had a chance to practise."`, [{ t: 'Begin', n: 'the first lesson', a: 'start', d: { k: 'intro' } }]); }
  }

  function objective() {
    if (!S.path) return 'Choose your path';
    if(gid()==='chest'&&DP.current()?.claimed.tutorialKey)return 'Guardian defeated · open the starter chest';
    if (gOn()) return S.met['1.0'] && !S.seen['intro.practice'] && gid()==='odalys' ? 'Practise your first ability with Odalys in the dojo' : GD[S.gd].ob;
    if(DG){const p=DP.current(),missing=DungeonProgress.missing(p,Dungeons.get(DG.r).floors.length);return 'Floor '+(DG.f+1)+' · '+(p.claimed.vault?'Vault collected · explore or leave':missing.length?missing.length+' floor seals to recover':!p.keeper?'Find and defeat the keeper':'Open the vault chest');}
    const t = S.region, left = totalIn(t) - doneIn(t);
    if (!S.boss[t] && doneIn(t) * 2 >= totalIn(t) && (t < 8 || Object.keys(S.boss).length >= 7)) return `Stand before ${BOSSES[t - 1].name}`;
    if (left) return `${region(t).name}: ${doneIn(t)} of ${totalIn(t)} exercises`;
    return S.won ? 'The world is yours' : t < 8 ? `Take the road to ${region(t + 1).name}` : 'Earn the marks you lack';
  }
  /* ---------- Blind Tally: six-seat no-limit hold'em in each town's card room. On each street you may put one COUNT query to the other hands. ---------- */
  let PK = null;
  const PKKW = ['SELECT', 'COUNT(*)', 'FROM', 'WHERE', 'AND', 'OR', 'IN (', 'JOIN', 'ON', 'MAX(', 'MIN(', 'NOT', 'BETWEEN', 'COUNT(DISTINCT', 'substr('], STN = ['Before the flop', 'The flop', 'The turn', 'The river'];
  const cardHTML = (c, cls) => c == null ? `<span class="cd bk ${cls || ''}"></span>` : `<span class="cd s${Poker.SU(c)} ${cls || ''}">${Poker.RCH[Poker.R(c)].replace('T', '10')}<i>${Poker.SYM[Poker.SU(c)]}</i></span>`;
  const pkT = () => Poker.tables(PK.h, 0, PK.room.guard, PK.names, PK.past, PK.handNo);
  const cashOut = () => { if (S.casino) { S.gold += S.casino.stack; S.casino = null; } };
  function pkRules(r) {
    const room = Poker.ROOM[r - 1], bb = room.bb, note = room.guard === 'open' ? '' : Poker.tables({ n: 2, hole: [[0, 1], [2, 3]], board: [], out: [false, false] }, 0, room.guard, ['You', 'x'], [], 1).note;
    sheet(`<p class="eyebrow">${esc(region(r).name)} · the card room</p><h2>Blind Tally</h2><ul class="pk-rules"><li>No-limit hold’em, six seats. Blinds ${bb / 2} and ${bb} gold.</li><li>Once on each street you may put one question to the other hands. It must be a <code>SELECT COUNT(*)</code>. The house tells you how many, never which.</li><li>A query with an error spends that street’s read.</li><li>The others question hands too. When one asks about yours, you see the question and what they were told.</li>${note ? `<li>${esc(note)}</li>` : ''}</ul><p class="cap2">Sit down with:</p><div class="row">${[20, 50, 100].map(n => `<button class="btn solid grow" data-a="pksit" data-r="${r}" data-n="${n * bb}"${S.gold < n * bb ? ' disabled' : ''}>${n * bb} gold</button>`).join('')}</div>`);
  }
  function pkSit(r, buy) { coach('poker');
    const room = Poker.ROOM[r - 1], bb = room.bb; if (!(buy >= 20 * bb) || S.gold < buy) return; closeSay(); closeSheet(); S.pk = S.pk || { n: 0, net: 0 };
    const regs = Poker.regulars(r); S.gold -= buy; S.casino = { r, stack: buy }; save(); renderHud();
    PK = { r, room, bb, buy, names: ['You'].concat(regs.map(o => o.name)), bots: [null].concat(regs.map(o => Poker.mkBot(o, 6))), stacks: [buy].concat(regs.map(() => rint(40, 100) * bb)), btn: rint(0, 5), n: 0, past: [], handNo: rint(40, 90), h: null };
    Scene.pause(); $('#enc').hidden = false; $('#nav').hidden = true; pkDeal();
  }
  function pkDeal() {
    if (PK.stacks[0] < PK.bb) { toast('You are out of chips'); return pkClose(); }
    const notes = []; for (let i = 1; i < 6; i++) if (PK.stacks[i] < 20 * PK.bb) { PK.stacks[i] = 60 * PK.bb; notes.push(PK.names[i] + ' buys back in.'); }
    PK.btn = (PK.btn + 1) % 6; PK.handNo++; const h = PK.h = Poker.deal(PK.bb, PK.stacks, PK.btn); PK.T = Poker.mkTable(6); for (let i = 1; i < 6; i++) Poker.botStart(PK.bots[i], h, i);
    Object.assign(PK, { log: notes, last: h.stack.map(() => ''), reads: [], theirs: [], readSt: -1, askSt: -1, reading: false, size: 0, busy: false, settled: false, result: '', draft: '' }); pkStep();
  }
  function pkPreset(L, f) { const h = PK.h; return Math.max(L.minTo, Math.min(L.maxTo, f >= 9 ? L.maxTo : Math.ceil(h.cur + (h.pot + L.call) * f))); }
  function pkStep() {
    const h = PK.h; if (h.over) return pkEnd();
    if (PK.askSt !== h.street) { PK.askSt = h.street; if (h.street) PK.last = PK.last.map((x, i) => h.out[i] ? 'folded' : '');   // once a street each player still in puts a question to one hand
      for (let i = 1; i < 6; i++) { const q = Poker.ask(PK.bots[i], h, PK.T); if (q && q.target === 0) { q.who = PK.names[i]; PK.theirs.unshift(q); } } }
    if (h.to !== 0) { PK.busy = true; pkDraw(); return setTimeout(pkBot, FAST() ? 0 : h.out[0] ? 160 : 520 + rnd() * 520); }
    PK.busy = false; PK.size = pkPreset(Poker.legal(h), h.street === 0 && h.raises === 0 ? .75 : .5); pkDraw();
  }
  const pkKind = (m, L) => m === 'raise' && L.canRaise ? 'raise' : m === 'fold' && !L.check ? 'fold' : L.check ? 'check' : 'call';
  const pkWord = (t, L, cur, to, allin, s) => (t === 'fold' ? 'fold' + s : t === 'check' ? 'check' + s : t === 'call' ? `call${s} ${L.call}` : cur === 0 ? `bet${s} ${to}` : `raise${s} to ${to}`) + (allin && t !== 'fold' ? ', all in' : '');
  function pkDo(i, type, amt) {
    const h = PK.h, L = Poker.legal(h), board = h.board.slice(), st = h.street, cur = h.cur, t = pkKind(type, L), to = Math.max(L.minTo, Math.min(L.maxTo, Math.round(amt || 0)));
    Poker.act(h, type, to); if (t !== 'fold') Poker.track(PK.T, h, i, t, board, st); const w = pkWord(t, L, cur, to, h.stack[i] === 0, i ? 's' : ''); PK.last[i] = t === 'fold' ? 'folded' : w; PK.log.unshift(`${PK.names[i]} ${w}.`);
  }
  function pkBot() { if (!PK || PK.h.over || PK.h.to === 0) return; const i = PK.h.to, m = Poker.decide(PK.bots[i], PK.h, PK.T); pkDo(i, m.type, m.amt); pkStep(); }
  function pkMe(type) {
    if (!PK || PK.busy || PK.h.over || PK.h.to !== 0 || now() < (PK.lock || 0)) return; PK.lock = FAST() ? 0 : now() + 350;   // a double tap must not act twice
    pkDo(0, type, PK.size); PK.reading = false; S.casino.stack = PK.h.stack[0]; save(); pkStep();
  }
  function pkEnd() {
    const h = PK.h; if (!PK.settled) { PK.settled = true; const d = h.stack[0] - h.start[0]; PK.stacks = h.stack.slice(); S.casino.stack = h.stack[0]; S.pk.n++; S.pk.net += d; PK.n++; for (let i = 1; i < 6; i++) Poker.botEnd(PK.bots[i], h);
      const dealt = []; h.hole.forEach((cs, i) => cs.forEach(c => dealt.push([i, c]))); PK.past.push(dealt); if (PK.past.length > 3) PK.past.shift(); save();
      const ws = []; h.won.forEach((v, i) => { if (v > 0) ws.push(`${PK.names[i]} win${i ? 's' : ''} ${v}${h.shown ? ' with ' + Poker.CAT[Poker.catOf(h.score[i])] : ''}`); });
      PK.result = `${esc(ws.join('. '))}. <b class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '+' : ''}${d} gold this hand</b>`; }
    PK.busy = false; PK.reading = false; pkDraw();
  }
  function pkClose() { felt(0); const net = S.casino ? S.casino.stack - PK.buy : -PK.buy; cashOut(); save(); PK = null; $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; closeSheet(); Scene.refresh(); render(); renderHud(); toast(`You leave the table ${net >= 0 ? 'up ' + net : 'down ' + -net} gold`); }
  function pkLeave() { if (!PK) return; if (PK.h && !PK.h.over) { if (PK.busy && !PK.h.out[0]) return toast('Wait for your turn, or fold first'); S.casino.stack = PK.h.stack[0]; } pkClose(); }
  function pkRead() { const h = PK.h; if (PK.busy || h.over || h.to !== 0 || PK.readSt === h.street) return; PK.reading = true; pkDraw(); }
  function pkAsk() {
    const h = PK.h, sql = $('#sql').value.trim(); if (!sql || !PK.reading) return; let out;
    if (!Poker.isCount(Engine.uncomment(sql))) out = { err: 'The house answers only a count: SELECT COUNT(*) FROM …' };
    else { const db = Engine.scratch(pkT().script), r = db.read(sql); db.close(); if (r.err) out = { err: r.err }; else if (r.rows.length !== 1 || r.cols.length !== 1) out = { err: 'A read must come back as one number.' }; else { const n = +r.rows[0][0]; out = { ans: n > 10 ? 'more than 10' : String(n) }; } }
    PK.readSt = h.street; PK.reads.unshift({ sql, ans: out.ans, err: out.err, st: h.street }); PK.reading = false; PK.draft = ''; pkDraw();
  }
  function pkDraw() {
    const el = $('#enc'), h = PK.h, L = !h.over && h.to === 0 ? Poker.legal(h) : null; el.className = 'q pk'; felt(1);
    const face = i => { if (!ART || !ArtData.regs) return ''; const n = (PK.r - 1) * 5 + i - 1; return `<img class="pk-av" alt="" src="art/p/P${String((n >> 2) + 1).padStart(2, '0')}_${n % 4 + 1}.webp">`; };
    const tag = i => i === h.btn ? 'D' : i === h.sbp ? 'SB' : i === h.bbp ? 'BB' : '', show = i => h.shown && !h.out[i];
    const rowOf = i => `<div class="pk-row${h.to === i && !h.over ? ' on' : ''}${h.out[i] ? ' out' : ''}"><span class="pk-pos">${tag(i)}</span><b>${face(i)}${esc(PK.names[i])}</b><small>${h.stack[i]}</small><span class="pk-act">${h.over && h.won[i] ? 'wins ' + h.won[i] : esc(PK.last[i] || (h.in[i] ? 'in ' + h.in[i] : ''))}</span><span class="pk-cards">${h.out[i] ? '' : show(i) ? h.hole[i].map(c => cardHTML(c, 'sm')).join('') : cardHTML(null, 'sm') + cardHTML(null, 'sm')}</span></div>`;
    const their = PK.theirs[0], theirHTML = their ? `<p class="pk-q"><b>${esc(their.who)} asked about your hand</b><code>${esc(their.sql)}</code><span>${their.err ? 'The query failed. No answer.' : 'Told: ' + their.ans}</span></p>` : '';
    const mine = PK.reads.map(r => `<p class="pk-q me"><b>Your read, ${STN[r.st].toLowerCase()}</b><code>${esc(r.sql)}</code><span>${r.err ? esc(r.err) + ' The read is spent.' : 'Answer: ' + r.ans}</span></p>`).join('');
    const body = `<div class="pk-body">${[1, 2, 3, 4, 5].map(rowOf).join('')}<div class="pk-board"><div class="pk-cards">${[0, 1, 2, 3, 4].map(i => i < h.board.length ? cardHTML(h.board[i]) : '<span class="cd no"></span>').join('')}</div><div class="pk-pot"><small>${STN[h.street]}</small>Pot ${h.pot}</div></div><div class="pk-seat${h.to === 0 && !h.over ? ' on' : ''}${h.out[0] ? ' out' : ''}"><div class="pk-who"><b>You <span class="pk-pos">${tag(0)}</span></b><small>${h.stack[0]} gold${h.in[0] && !h.over ? ' · in ' + h.in[0] : ''}</small></div><div class="pk-cards">${h.hole[0].map(c => cardHTML(c)).join('')}</div></div>${theirHTML}${mine}<p class="pk-log">${PK.log.slice(0, 4).map(esc).join('<br>')}</p></div>`;
    let dock;
    if (h.over) dock = `<p class="pk-res">${PK.result}</p><div class="row"><button class="btn quiet big" data-a="pkleave">Cash out</button><button class="btn solid big" data-a="pknext">Next hand</button></div>`;
    else if (PK.reading) { const T = pkT(); Object.assign(COLS, T.cols); const first = T.cols.hands ? 'hands' : 'deal_log', names = [first].concat(Object.keys(T.cols).filter(k => k !== first)), live = PK.names.filter((_, i) => i && !h.out[i]);
      dock = `<div class="pk-rd"><button class="btn sm quiet" data-a="pkback">‹ Back</button><span>One count. An error spends the read. ${esc(T.note)} J is 11, Q 12, K 13, A 14.</span></div><div class="chips pk-names">${live.map(n => `<button type="button" class="btn sm quiet" data-a="pkname" data-n="${esc(n)}">'${esc(n)}'</button>`).join('')}</div>` + kbHTML({ tables: names, kw: PKKW }, 0, 'Ask'); }
    else if (L) dock = (L.canRaise ? `<div class="pk-sizes">${[['⅓', .33], ['½', .5], ['⅔', .66], ['Pot', 1], ['All in', 9]].map(x => `<button class="btn sm quiet" data-a="pksize" data-f="${x[1]}">${x[0]}</button>`).join('')}<button class="btn sm quiet" data-a="pksize" data-d="-1" aria-label="Less">−</button><button class="btn sm quiet" data-a="pksize" data-d="1" aria-label="More">+</button></div>` : '') + `<div class="row pk-acts">${L.check ? '' : '<button class="btn wax big" data-a="pkact" data-t="fold">Fold</button>'}<button class="btn quiet big" data-a="pkact" data-t="call">${L.check ? 'Check' : 'Call ' + L.call}</button>${L.canRaise ? `<button class="btn solid big" data-a="pkact" data-t="raise">${h.cur === 0 ? 'Bet' : 'Raise to'} ${PK.size}</button>` : ''}</div><button class="btn sm pk-readb" data-a="pkread"${PK.readSt === h.street ? ' disabled' : ''}>${PK.readSt === h.street ? 'Read spent on this street' : 'Read the other hands: one count query'}</button>`;
    else dock = `<p class="pk-res">${h.out[0] ? 'You are out of this hand.' : esc(PK.names[h.to]) + ' is thinking…'}</p>`;
    el.innerHTML = `<header class="q-head"><button class="q-x" data-a="pkleave">‹ Cash out</button><div class="q-steps"><span class="on">Blind Tally</span><i>·</i><span>blinds ${h.sb}/${h.bb}</span><i>·</i><span>${h.stack[0] - PK.buy >= 0 ? '+' : ''}${h.stack[0] - PK.buy}</span></div></header>${body}<div class="dock pk-dock">${dock}</div>`;
    if (PK.reading) { kbDraw(); const ta = $('#sql'); ta.value = PK.draft || 'SELECT COUNT(*) FROM '; ta.addEventListener('input', () => { if (PK) PK.draft = ta.value; }); kbFocus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { } }
  }

  /* ---------- the house games: the Crooked Wheel and the Count ---------- */
  /* ---------- the living world: country people and their goods, errands, places to find, fishing ---------- */
  let FI = null;
  const variedTask = task => prepareLearning(Learning.next(learningState(),{circle:task.r||1,family:Learning.annotate(task).family,seed:rid()})||task);
  const hsh = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0; return h; };
  const rngOf = seed => { let x = (seed >>> 0) || 1; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };
  const foodN = k => k === 'meat' ? (S.meat || 0) : (S.food[k] || 0);
  const addFood = (k, n) => { if (k === 'meat') S.meat = Math.max(0, (S.meat || 0) + n); else { S.food[k] = Math.max(0, (S.food[k] || 0) + n); if (!S.food[k]) delete S.food[k]; } };
  const compass = (a, b) => ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(Math.atan2(b.y - a.y, b.x - a.x) / Math.PI * 4) % 8) + 8) % 8];
  const theName = n => /^(a|an|the) /i.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : 'the ' + n.toLowerCase();
  // what this person would ask of you today: the same request all day, a new one tomorrow
  function errandFor(e) {
    const g = rngOf(hsh(e.hid + dayKey())), r = e.r, pickG = a => a[Math.floor(g() * a.length)], sites = Scene.sites(), E = { id: e.hid, r, from: e.name, have: 0 }; let type = pickG(['bring', 'bring', 'hunt', 'hunt', 'deliver', 'find']);
    const homes = sites.filter(s => s.kind === 'home' && s.r === r && s.id !== e.hid), pois = sites.filter(s => s.kind === 'poi' && s.r === r);
    if ((type === 'deliver' && !homes.length) || (type === 'find' && !pois.length)) type = 'bring';
    if (type === 'bring') { const o = pickG([['meat', 2, 'cuts of meat'], ['hide', 2, 'hides'], ['fish', 2, 'fish'], ['mat', 3, 'units of ' + MATS[r]]].filter(o => (SETTLE[e.role].sells || []).indexOf(o[0]) < 0)); E.item = o[0]; E.n = o[1] + Math.floor(g() * 2); E.x = o[2]; E.what = `Bring ${E.n} ${E.x}`; }
    else if (type === 'hunt') { E.tpl = pickG(HOST.tpls(r)); E.n = 2 + Math.floor(g() * 2); E.x = MONSTERS[E.tpl][0]; E.what = `Hunt ${E.x} · ${E.n} targets`; }
    else if (type === 'deliver') { const t = pickG(homes); E.to = t.id; E.who = t.name; E.where = compass(e, t); E.what = `Carry a parcel to ${t.name}, ${E.where} of ${e.name.split(' ')[0]}’s place`; }
    else { const t = pickG(pois); E.at = t.id; E.who = theName(t.name); E.x = pickG(LOST); E.where = compass(e, t); E.what = `Find ${E.x} near ${E.who}, ${E.where} of ${e.name.split(' ')[0]}’s place`; }
    E.type = type; E.gold = (type === 'hunt' ? 26 : type === 'bring' ? 18 : 22) * r + Math.floor(g() * 6) * r; E.bonus = g() < .3 ? pickG(['food', 'food', 'key', 'gear']) : '';
    E.line = pickG(ERR[type]).replace('{n}', E.n).replace('{x}', E.x || '').replace('{who}', E.who || '').replace('{where}', E.where || ''); return E;
  }
  const errandCount = a => a.type === 'hunt' ? a.have : a.item === 'meat' ? S.meat || 0 : a.item === 'hide' ? have('hide') : a.item === 'fish' ? foodN('fish') + foodN('bigfish') : a.item === 'mat' ? have(a.r) : 0;
  const errandReady = a => a.type === 'find' ? !!a.found : a.type === 'deliver' ? false : errandCount(a) >= a.n;
  const errandProg = a => a.type === 'find' ? (a.found ? 'found: take it back' : 'not found yet') : a.type === 'deliver' ? 'to deliver' : `${Math.min(errandCount(a), a.n)} of ${a.n}`;
  function errandPay(a, e, line) {
    if (a.type === 'bring') { let n = a.n; if (a.item === 'meat') S.meat -= n; else if (a.item === 'hide') S.mats.hide = have('hide') - n; else if (a.item === 'mat') S.mats[a.r] = have(a.r) - n; else { const f = Math.min(n, foodN('fish')); addFood('fish', -f); addFood('bigfish', -(n - f)); } }
    const o = { gold: a.gold, items: [], food: {} }; if (a.bonus === 'food') o.food[pick(Object.keys(FOOD).filter(k => k !== 'meat' && k !== 'fish'))] = 2; else if (a.bonus === 'gear') o.items.push(makeItem(rollRarity(luck(), 1), a.r)); else if (a.bonus === 'key') S.hints++;
    delete S.er.a[a.id]; S.er.d[a.id] = dayKey(); S.er.n = (S.er.n || 0) + 1; const g = grant(o); save(); renderHud(); Scene.refresh();
    dlg(e, line, [bye]); if (g.items.length) sheet(`<p class="eyebrow">Errand done</p><h2>${esc(a.from)}</h2>${spoilsHTML(g)}<div class="row end"><button class="btn solid" data-a="closesheet">Take it</button></div>`); else toast(bitsOf(g).concat(a.bonus === 'key' ? ['+1 Hint Key'] : []).join(' · '));
  }
  const marketSpecialty = e => e && e.kind === 'specialist' ? WorldServices.specialists[e.specialty] : null;
  const stockId = e => e.kind === 'specialist' ? 'specialist:' + e.specialty : e.hid;
  // Country traders and Grand Market stalls share stock, prices and payments.
  function countryStock(e) {
    const specialty = marketSpecialty(e), R = specialty || SETTLE[e.role], r = e.r, id = stockId(e);
    if (!R) return;
    const day = dayKey();
    let st = S.cs[id];
    if (!st || st.day !== day) {
      const items = specialty ? (R.gear || []).map(([slot, weapon], i) => makeItem(RAR[i+1],r,slot,weapon,{source:'shop'})) :
        Array.from({ length: R.gear || 0 }, () => makeItem(rollRarity(luck(), 1),r,null,null,{source:'shop'}));
      st = S.cs[id] = { day, items, key: R.keys ? 1 : 0 };
    }
    const fp = k => Math.round(FOOD[k][3] * (1 + (r - 1) * .45)), goods = (R.sells || []).map(k => ({ ic: FOOD[k][2], name: FOOD[k][0], meta: `Restores ${FOOD[k][1]} health`, price: fp(k) + ' gold', a: 'buyfood', d: { k, c: fp(k) }, off: S.gold < fp(k) }));
    if(R.tonic)goods.push({ic:'bandage',name:'Five bandages',meta:'Supplies for the Bandage action',price:(3*r)+' gold',a:'buybandages',d:{c:3*r},off:S.gold<3*r});
    if (R.tonic) goods.push({ ic: 'draught', name: 'Healing Draught', meta: 'Restores 30 health, in or out of a fight', price: 7 * r + ' gold', a: 'buytonic', d: { c: 7 * r }, off: S.gold < 7 * r });
    if (R.mats) goods.push({ ic: 'mat' + r, name: MATS[r], meta: 'A crafting material', price: 6 * r + ' gold', a: 'buymat', d: { c: 6 * r }, off: S.gold < 6 * r });
    if (st.key) goods.push({ ic: 'hintkey', name: 'Hint Key', meta: 'Pays for one hint. One a day', price: 22 * r + ' gold', a: 'buykey', d: { c: 22 * r }, off: S.gold < 22 * r });
    st.items.forEach((it, i) => goods.push({ ic: it.ic, name: it.name, cls: 'rar-' + it.rarity, meta: `${it.slot} · ${statLine(it)}`, price: price(it) + ' gold', a: 'buygear', d: { i }, off: S.gold < price(it) }));
    if (R.pages) goods.push(...pageGoods(r));
    const hd = have('hide');
    const extra = R.materials ? '<button class="btn sm solid" data-a="deeds">Browse house deeds</button>' :
      R.hides ? `<button class="btn sm quiet" data-a="sellhides"${hd ? '' : ' disabled'}>Sell ${hd || 'no'} hide${hd === 1 ? '' : 's'} at ${R.hides * r} gold</button>` :
      specialty && R.gear && !st.items.length ? '<span class="cap2 grow">Sold out for today.</span>' : '';
    shopSheet(e, specialty ? R.line : R.say[1], goods, extra);
  }
  const fishLeft = fid => { const d = S.fishd[fid]; return d && d.day === dayKey() ? Math.max(0, 4 - d.n) : 4; };
  function fishOpen(e, i) {
    if (!fishLeft(e.fid)) return toast('The fish here have gone quiet until tomorrow'); const r = e.r, c = gOn()&&r===1?1:Math.max(1, Math.min(8, i === 0 ? r - 2 : i === 1 ? r : r + 1)), tpl = pick(BOUNTIES.filter(b => b.r === c)).id;
    Sound.sfx('fishCast'); closeSay(); closeSheet(); FI = { e, r, i, c, task: gOn()&&r===1?tutTask():variedTask(makeTask({ tpl, seed: seeded(tpl) })), res: null, out: null, err: '', draft: '' }; Scene.pause(); $('#enc').hidden = false; $('#nav').hidden = true; fiDraw();
  }
  function fiRun() {
    const sql = $('#sql').value; if (!sql.trim() || FI.res) return; FI.draft = sql; const res = Engine.grade(FI.task, sql); if (res.err) { FI.err = res.err;FI.syntaxError=true; return fiDraw(); }
    recordLearning(FI.task,{ok:res.ok,assisted:!!FI.syntaxError,first:true,sql});
    S.stats.q++; if (res.ok) { S.stats.ok++; trainSql(res.used || [], FI.c, sql); } const fid = FI.e.fid, d = S.fishd[fid] && S.fishd[fid].day === dayKey() ? S.fishd[fid] : (S.fishd[fid] = { day: dayKey(), n: 0 }); d.n++;
    const fs = rv('fishing'), r = FI.r, deep = FI.i, diff = FI.c * 10 + deep * 6, o = odds(fs + 25, diff, res.grade, res.share), F4 = FISH[r - 1], u = rnd(), G = { gold: 0, items: [], scrolls: [], food: {} }; let t, sp = '', ic = '';
    if (rnd() * 100 >= o.p) { const junk = !res.ok && rnd() < .35 ? pick(JUNK) : ''; t = res.ok ? 'Right answer, but nothing’s biting. Try another cast.' : junk ? `You pull up ${junk}.` : 'Nothing bites.'; if (junk) ic = /boot/.test(junk) ? 'boot' : /weed|reed/.test(junk) ? 'weed' : /key/.test(junk) ? 'rustkey' : ''; }
    else if (deep === 2 && fs >= FISHNEED.treasure && u < .24) { const k = pick(['chest', 'pearl', 'coin', 'bottle']); ic = { chest: 'sunkchest', pearl: 'pearl', coin: 'oldcoin', bottle: 'bottle' }[k];
      if (k === 'chest') { G.items.push(makeItem(rollRarity(luck(), 2), r)); G.gold = rint(10, 25) * r; t = 'The line snags, then gives. Up comes a small locked chest, streaming water.'; } else if (k === 'pearl') { G.gold = 40 * r; t = 'An oyster with a pearl inside. You sell it on the spot.'; } else if (k === 'coin') { G.gold = 26 * r; t = 'An old gold coin, crusted with barnacles.'; }
      else { const left = PAGES.filter(p => p.c === Math.min(8, r) && !owned(p.id) && !S.scr[p.id]); if (left.length) G.scrolls.push(pick(left).id); else S.hints++; t = 'A corked bottle with a scroll inside.'; } }
    else if (deep >= 1 && fs >= FISHNEED.rare && u < .2) { sp = F4[3]; ic = ['glowfish', 'eel', 'carp', 'crab'][r % 4]; G.gold = 34 * r; S.fishlog[sp] = (S.fishlog[sp] || 0) + 1; t = `${sp}. People fish this water all their lives and never see one. A collector pays you on the spot.`; }
    else if (deep >= 1 && fs >= FISHNEED.good && u < .62) { sp = F4[2]; ic = r % 2 ? 'bigfish' : 'pike'; G.food.bigfish = 1; S.fishlog[sp] = (S.fishlog[sp] || 0) + 1; t = `A ${sp}, and a good one.`; }
    else { sp = F4[u < .5 ? 0 : 1]; ic = u < .5 ? 'fish' : 'perch'; G.food.fish = 1; S.fishlog[sp] = (S.fishlog[sp] || 0) + 1; t = `A ${sp}.`; }
    Sound.sfx(sp || ic && !['boot', 'weed', 'rustkey'].includes(ic) ? 'fishCatch' : 'fishEmpty');
    const gn = gain('fishing', Math.min(95, diff), {correct:1,close:.6,partial:.4,wrong:0}[res.grade]), got = grant(G); FI.res = res; FI.out = { t, got, gn, ic }; if (gid() === 'fish') setTimeout(() => gDone('fish'), 1500); save(); renderHud(); fiDraw();
  }
  function fiClose() { FI = null; $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; Scene.refresh(); render(); }
  function fiDraw() {
    const el = $('#enc'), t = FI.task=prepareLearning(FI.task), res = FI.res, left = fishLeft(FI.e.fid); el.className = 'q pk fi'; felt(0);
    const verdict = res ? `<p class="pk-q ${res.ok ? 'me' : ''}"><b>${res.ok ? 'A clean cast' : res.grade === 'close' ? 'Close' : res.grade === 'partial' ? 'Part of the way' : 'Not the answer'}</b>${res.ok ? '' : `<span>${esc(res.why || res.msg || '')}</span>`}</p><p class="pk-res">${FI.out.ic && ART && ArtData.icons.at[FI.out.ic] ? ico(FI.out.ic) + ' ' : ''}${esc(FI.out.t)}</p>${spoilsHTML(FI.out.got)}${gainsHTML(FI.out.gn ? [FI.out.gn] : [])}` : '';
    const body = `<div class="pk-body"><p class="pk-log">${esc(CASTS[FI.i].n)}</p><div class="fi-ask">${t.teaching||''}<p>${esc(t.ask)}</p>${t.tip ? `<p class="cap2">${t.tip}</p>` : ''}</div>${FI.err && !res ? `<p class="pk-q"><span>${esc(FI.err)}</span></p>` : ''}${verdict}</div>`;
    let dock, after = null;
    if (res) dock = `<div class="row"><button class="btn quiet big" data-a="fileave">Leave the water</button>${left ? `<button class="btn solid big" data-a="fiagain">Cast again (${left} left)</button>` : ''}</div>`;
    else { dock = `<div class="pk-rd"><button class="btn sm quiet" data-a="fileave">‹ Leave</button><span>Fishing ${rv('fishing').toFixed(1)} · ${CIRCLE[FI.c]} Circle question</span></div>` + kbHTML(t, FI.c, 'Cast'); after = () => { kbDraw(); const ta = $('#sql'); if (FI.draft) ta.value = FI.draft; kbFocus(); }; }
    el.innerHTML = `<header class="q-head"><button class="q-x" data-a="fileave">‹ Leave</button><div class="q-steps"><span class="on">Fishing</span><i>·</i><span>${left} cast${left === 1 ? '' : 's'} left here</span></div></header>${body}<div class="dock pk-dock">${dock}</div>`; if (after) after();
  }

  let WH = null, BJ = null;
  const HKW = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'COUNT(*)', 'GROUP BY', 'ORDER BY', 'DESC', 'JOIN', 'ON', 'SUM(', 'CASE WHEN', 'THEN', 'ELSE', 'END', 'BETWEEN', 'IN (', 'MAX(', 'LIMIT', 'AS'];
  const felt = n => { $('#enc').style.backgroundImage = n && ART && ArtData.tables ? `linear-gradient(rgba(12, 34, 25, .5), rgba(12, 34, 25, .62)), url(art/bg/S0${n}.jpg)` : ''; };
  const houseOpen = () => { closeSay(); closeSheet(); Scene.pause(); $('#enc').hidden = false; $('#nav').hidden = true; };
  function houseClose(net) { felt(0); WH = BJ = null; $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; Scene.refresh(); render(); renderHud(); if (net) toast(`You leave ${net > 0 ? 'up ' + net : 'down ' + -net} gold`); }
  const resHTML = res => !res ? '' : res.err ? `<p class="pk-q"><span>${esc(res.err)}</span></p>` : `<div class="hs-res">${tableHTML(res, 8)}</div>`;
  const houseKb = (T, draft, label, first) => { Object.assign(COLS, T.cols); const html = kbHTML({ tables: Object.keys(T.cols), kw: HKW }, 0, label); return { html, after() { kbDraw(); const ta = $('#sql'); ta.value = draft || first; kbFocus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { } } }; };
  function whOpen(r) { coach('wheel');
    const bb = Poker.ROOM[r - 1].bb, day = dayKey(); if (!S.wheel || S.wheel.day !== day) S.wheel = { day, won: {} };
    if ((S.wheel.won[r] || 0) >= 40 * bb) return toast('The pit boss has closed this wheel to you until tomorrow'); if (S.gold < bb) return toast(`The smallest bet here is ${bb} gold`);
    houseOpen(); WH = { r, bb, F: House.flaw(r, day), mode: 'study', res: null, bet: null, last: null, draft: { study: '', bet: '' }, net: 0 }; whDraw();
  }
  function whRun() { const sql = $('#sql').value.trim(); if (!sql) return; WH.draft[WH.mode] = sql; const db = Engine.scratch(House.wheelTables(WH.F).script), res = db.read(sql); db.close(); if (WH.mode === 'study') { WH.res = res; WH.bet = null; } else { WH.bet = House.cover(res); WH.res = null; } WH.last = null; whDraw(); }
  function whSpin(mult) {
    if (!WH || !WH.bet || WH.bet.err) return; const stake = WH.bb * mult; if (S.gold < stake) return toast('Not enough gold'); const p = House.draw(WH.F.w), hit = WH.bet.set.indexOf(p) >= 0, net = (hit ? Math.round(stake * WH.bet.pays) : 0) - stake;
    S.gold += net; WH.net += net; S.wheel.won[WH.r] = (S.wheel.won[WH.r] || 0) + net; WH.F.spins.push(p); WH.last = { p, hit, net }; save(); renderHud();
    if (S.wheel.won[WH.r] >= 40 * WH.bb) { const n = WH.net; houseClose(n); return toast('The pit boss closes the wheel to you until tomorrow'); } whDraw();
  }
  function whDraw() {
    const el = $('#enc'), T = House.wheelTables(WH.F), L = WH.last, P = L && House.POCKETS[L.p - 1]; el.className = 'q pk'; felt(2);
    const lastHTML = L ? `<p class="pk-q ${L.hit ? 'me' : ''}"><b>The ball lands on ${L.p}: ${P.color}, ${P.book}, ring ${P.ring}</b><span>${L.hit ? 'Your bet covered it: +' + L.net + ' gold' : 'Not one of yours: ' + L.net + ' gold'}</span></p>` : '';
    const betHTML = WH.mode === 'bet' && WH.bet ? (WH.bet.err ? `<p class="pk-q"><span>${esc(WH.bet.err)}</span></p>` : `<p class="pk-q me"><b>Your query covers ${WH.bet.set.length} of 36 pockets</b><span>It pays ${WH.bet.pays.toFixed(2)} for 1 if the ball lands on one of them.</span></p><div class="row">${[1, 2, 5].map(m => `<button class="btn solid grow" data-a="whspin" data-m="${m}"${S.gold < WH.bb * m ? ' disabled' : ''}>Spin for ${WH.bb * m}</button>`).join('')}</div>`) : '';
    const kb = houseKb(T, WH.draft[WH.mode], WH.mode === 'study' ? 'Run' : 'Check bet', WH.mode === 'study' ? 'SELECT ' : 'SELECT pocket FROM wheel WHERE ');
    el.innerHTML = `<header class="q-head"><button class="q-x" data-a="houseleave">‹ Leave</button><div class="q-steps"><span class="on">The Crooked Wheel</span><i>·</i><span>${WH.net >= 0 ? '+' : ''}${WH.net}</span></div></header><div class="pk-body"><p class="pk-log">36 pockets. A bet is a query that returns pockets, and a fair wheel pays back 95 in 100. This wheel is not fair. ${esc(T.note)} The flaw changes each day.</p>${lastHTML}${WH.mode === 'study' ? resHTML(WH.res) : betHTML}</div><div class="dock pk-dock"><div class="pk-sizes"><button class="btn sm quiet${WH.mode === 'study' ? ' on' : ''}" data-a="whmode" data-m="study">Study the spins</button><button class="btn sm quiet${WH.mode === 'bet' ? ' on' : ''}" data-a="whmode" data-m="bet">Place a bet</button></div>${kb.html}</div>`; kb.after();
  }
  function bjOpen(r) { coach('bj'); const bb = Poker.ROOM[r - 1].bb; if (S.gold < 2 * bb) return toast(`You need ${2 * bb} gold to play here`); houseOpen(); BJ = { r, bb, sh: House.newShoe(), g: null, past: [], guard: House.BJGUARD[r - 1], counting: false, q: '', qres: null, net: 0, note: '' }; bjDraw(); }
  function bjBet(mult) {
    const bet = BJ.bb * mult; if (S.gold < bet * 2) return toast('Keep twice the bet in your purse, in case you double'); const before = BJ.sh.seen.slice(); BJ.g = House.bjDeal(BJ.sh, bet);
    if (BJ.sh.fresh) { BJ.past.push(before); if (BJ.past.length > 2) BJ.past.shift(); BJ.note = 'The dealer shuffled a new shoe before this hand.'; } else BJ.note = ''; BJ.qres = null; if (BJ.g.over) bjSettle(); bjDraw();
  }
  function bjSettle() { const g = BJ.g; S.gold = Math.max(0, S.gold + g.net); BJ.net += g.net; save(); renderHud(); }
  function bjMove(a) { const g = BJ && BJ.g; if (!g || g.over) return; if (a === 'double' && S.gold < g.bet * 2) return toast('Not enough gold to double'); House.bjAct(BJ.sh, g, a); if (g.over) bjSettle(); bjDraw(); }
  function bjRun(again) { const sql = again ? BJ.q : $('#sql').value.trim(); if (!sql) return; BJ.q = sql; const db = Engine.scratch(House.bjTables(BJ.sh, BJ.guard, BJ.past).script); BJ.qres = db.read(sql); db.close(); BJ.counting = false; bjDraw(); }
  function bjDraw() {
    const el = $('#enc'), g = BJ.g, T = House.bjTables(BJ.sh, BJ.guard, BJ.past), live = g && !g.over, tot = cs => { const t = House.total(cs); return (t.soft && t.t < 21 ? 'soft ' : '') + t.t; }; el.className = 'q pk'; felt(3);
    const RES = { win: 'You win', lose: 'The dealer wins', push: 'A push', bust: 'You bust', blackjack: 'Blackjack. It pays three to two', 'dealer blackjack': 'The dealer has blackjack', 'dealer busts': 'The dealer busts' };
    const hand = g ? `<div class="pk-seat"><div class="pk-who"><b>Dealer</b><small>${live ? 'showing ' + House.pts(g.dl[0]) : tot(g.dl)}</small></div><div class="pk-cards">${g.dl.map((c, i) => cardHTML(live && i === 1 ? null : c)).join('')}</div></div><div class="pk-seat on"><div class="pk-who"><b>You</b><small>${tot(g.me)} · bet ${g.bet}</small></div><div class="pk-cards">${g.me.map(c => cardHTML(c)).join('')}</div></div>${g.over ? `<p class="pk-res">${RES[g.res]}. <b class="${g.net >= 0 ? 'up' : 'dn'}">${g.net >= 0 ? '+' : ''}${g.net} gold</b></p>` : ''}` : '';
    const body = `<div class="pk-body"><p class="pk-log">Blackjack from a two-deck shoe. The dealer stands on 17, blackjack pays three to two, and you may double on your first two cards. Every card shown is logged, so between hands you can query the shoe and size your bet by what is left in it. ${esc(BJ.note)}</p>${hand}${BJ.q && !BJ.counting ? `<p class="pk-q me"><b>Your query</b><code>${esc(BJ.q)}</code></p>` : ''}${BJ.counting ? '' : resHTML(BJ.qres)}</div>`;
    let dock, kb = null;
    if (BJ.counting) { kb = houseKb(T, BJ.q, 'Run', 'SELECT '); dock = `<div class="pk-rd"><button class="btn sm quiet" data-a="bjback">‹ Back</button><span>${esc(T.note)}</span></div>${kb.html}`; }
    else if (live) dock = `<div class="row pk-acts"><button class="btn quiet big" data-a="bjmove" data-m="hit">Hit</button><button class="btn solid big" data-a="bjmove" data-m="stand">Stand</button>${g.me.length === 2 ? '<button class="btn quiet big" data-a="bjmove" data-m="double">Double</button>' : ''}</div>`;
    else dock = `<div class="pk-sizes">${[1, 2, 5, 10].map(m => `<button class="btn sm quiet" data-a="bjbet" data-m="${m}"${S.gold < 2 * BJ.bb * m ? ' disabled' : ''}>Bet ${BJ.bb * m}</button>`).join('')}</div><div class="row"><button class="btn sm pk-readb" data-a="bjcount">Query the shoe</button>${BJ.q ? '<button class="btn sm pk-readb" data-a="bjagain">Run my query again</button>' : ''}</div>`;
    el.innerHTML = `<header class="q-head"><button class="q-x" data-a="houseleave">‹ Leave</button><div class="q-steps"><span class="on">The Count</span><i>·</i><span>${BJ.sh.cards.length} cards left</span><i>·</i><span>${BJ.net >= 0 ? '+' : ''}${BJ.net}</span></div></header>${body}<div class="dock pk-dock">${dock}</div>`; if (kb) kb.after();
  }

  const goodHTML = g => `<li class="good">${g.item ? itemIcon(g.item) : ico(g.ic)}<div><b class="${g.cls || ''}">${esc(g.name)}</b><small>${g.meta || ''}</small></div>${g.pill ? `<span class="pill ok">${g.pill}</span>` : `<button class="btn sm" data-a="${g.a}"${Object.keys(g.d || {}).map(k => ` data-${k}="${esc(g.d[k])}"`).join('')}${g.off ? ' disabled' : ''}>${g.price}</button>`}</li>`;
  const pageGoods = r => PAGES.filter(p => p.c === r && !p.rare).map(p => {
    const book = BOOKS[p.book], base = { ic: 'scroll_' + p.book, name: p.name };
    return owned(p.id) ? { ...base, meta: book.name, pill: 'in your book' } :
      { ...base, meta: book.name + ' · ' + book.what, price: p.price + ' gold', a: 'buypage', d: { id: p.id }, off: S.gold < p.price };
  });
  function shopSheet(e, line, goods, extra) { setTimeout(() => e.kind==='stablekeep'?null:coach(goods&&goods.some(g=>/page/i.test(g.a||''))?'shop':'trade'), 0); CE = e; const pt = e.spr || e.pt ? Scene.portrait(e) : ''; sheet(`<div class="shop-head">${pt ? `<img alt="" src="${pt}">` : ''}<div><p class="eyebrow">${esc(e.sub || '')}</p><h2>${esc(e.name)}</h2></div></div><p class="story">${esc(line)}</p><ul class="goods">${goods.map(goodHTML).join('')}</ul><div class="row end">${extra || ''}<button class="btn sm quiet" data-a="chat">Chat</button></div>`); }
  /* ---------- the bank: one account shared by every town's banker. Gold and up to 60 things kept there are safe when you die. ---------- */
  const BANK_SLOTS = 60;
  function bankSheet(e) { if (e) CE = e; S.bank = S.bank || { gold: 0, items: [] }; coach('bank'); const B = S.bank, worn = new Set(Object.values(S.eq || {})), free = S.inv.filter(it => !worn.has(it.id)), pt = CE && (CE.spr || CE.pt) ? Scene.portrait(CE) : '';
    const row = (it, a, lab) => `<li class="good">${ico(it.ic)}<div><b class="r-${it.rarity || 'common'}">${esc(it.name)}</b><small>${esc(it.slot || '')}</small></div><button class="btn sm" data-a="${a}" data-id="${it.id}">${lab}</button></li>`;
    sheet(`<div class="shop-head">${pt ? `<img alt="" src="${pt}">` : ''}<div><p class="eyebrow">${esc(region(S.region).name)} bank</p><h2>Your account ${qm('bank')}</h2></div></div>
      <section class="sec"><h2>Gold</h2><p class="cap2">On you ${S.gold} · in the bank ${B.gold}</p><div class="row"><button class="btn sm" data-a="bdep" data-n="all"${S.gold ? '' : ' disabled'}>Deposit all</button><button class="btn sm quiet" data-a="bwd" data-n="50"${B.gold >= 50 ? '' : ' disabled'}>Take 50</button><button class="btn sm quiet" data-a="bwd" data-n="200"${B.gold >= 200 ? '' : ' disabled'}>Take 200</button><button class="btn sm quiet" data-a="bwd" data-n="all"${B.gold ? '' : ' disabled'}>Take all</button></div></section>
      <section class="sec"><h2>In the bank <small>${B.items.length} / ${BANK_SLOTS}</small></h2>${B.items.length ? `<ul class="goods">${B.items.map(it => row(it, 'btake', 'Take')).join('')}</ul>` : '<p class="cap2">Empty.</p>'}</section>
      <section class="sec"><h2>In your bag</h2>${free.length ? `<ul class="goods">${free.map(it => row(it, 'bstore', 'Store')).join('')}</ul>` : '<p class="cap2">You’re wearing everything you carry.</p>'}</section>
      ${guardHTML()}
      <div class="row end"><button class="btn sm" data-a="deeds">Homes for sale</button></div>`); }
  // bless deeds and insurance: what keeps worn gear on you when you fall
  const BLESS_C = 1500;
  function guardHTML() { const wn = Object.values(S.eq || {}).map(itemById).filter(Boolean), tot = wn.filter(it => it.ins && !it.bless && !it.unique).reduce((a, it) => a + insFee(it), 0);
    return `<section class="sec"><h2>Protect your gear</h2><p class="cap2">When you fall, anything you wear that is not blessed or insured stays on your body. Insurance is paid from this account each time you fall${tot ? `: ${tot} gold a fall right now` : ''}.</p>
      <ul class="goods"><li class="good">${ico('deed')}<div><b>Bless deed</b><small>You have ${S.blessd || 0}. Blesses one item for good.</small></div><button class="btn sm" data-a="buybless"${funds() >= BLESS_C ? '' : ' disabled'}>${BLESS_C} gold</button></li>
      ${wn.map(it => `<li class="good">${ico(it.ic)}<div><b class="r-${it.rarity || 'common'}">${esc(it.name)}</b><small>${it.unique || it.bless ? 'Blessed' : it.ins ? `Insured · ${insFee(it)} a fall` : `Not protected · insure for ${insFee(it)} a fall`}</small></div>${it.unique || it.bless ? '' : `<div class="row">${S.blessd ? `<button class="btn sm quiet" data-a="bless" data-from="bank" data-id="${it.id}">Bless</button>` : ''}<button class="btn sm${it.ins ? ' quiet' : ''}" data-a="insure" data-from="bank" data-id="${it.id}">${it.ins ? 'Drop' : 'Insure'}</button></div>`}</li>`).join('')}</ul></section>`; }

  /* ---------- the lost Ledger: tables taken from the vaults, and the Great Truths asked of them ---------- */
  let TR = null, DDB = null, DDK = '', STY = null;
  const LAIRT = ['t7', 't8', 't10'];
  const haveT = i => !!(S.tabs && S.tabs[i]);
  const lairsBeaten = () => Object.keys(S.lairday || {}).filter(k => k[0] === 'L').length;
  function tKnown(T) { if (!S.letter) return false; const f = T.from; return f === 'letter' || (f.slice(0, 4) === 'page' && !!S.jr[+f.slice(4)]) || (f === 'lair' && LAIRT.indexOf(T.id) < lairsBeaten()) || (f === 'archive' && !!S.archive); }
  const tReady = T => tKnown(T) && T.needs.every(haveT);
  function deepDb() { const have = Deep.TABLES.map((t, i) => haveT(i)), key = have.join('') + ':' + S.name; if (DDB && DDK === key) return DDB; if (DDB) DDB.close(); DDB = Engine.scratch(Deep.script(have, S.name)); DDK = key; Deep.TABLES.forEach((t, i) => { if (have[i]) COLS[t.name] = t.cols; }); return DDB; }
  function applyGifts() { HPEN = gift('hint') ? 8 : 15; BODY_MS = gift('body') ? 30 * 60 * 1000 : BODY_MS0; }
  const MEAN = Deep.INTERPRETATIONS;
  function storyCards(cards, done) { STY = { cards, i: 0, done }; storyDraw(); }
  function storyDraw() { const c = STY.cards[STY.i], last = STY.i === STY.cards.length - 1, A = ART && ArtData, bg = c.bg && A && (c.bg === 'Z01' ? A.z01 : (A.story_bg || []).indexOf(+c.bg.slice(1)) >= 0) ? ` style="background-image:url(art/${c.bg === 'Z01' ? 'bg/Z01' : 't/' + c.bg}.jpg)"` : '', pt = c.pt && A && A.story && A.story[c.pt] ? `<img class="tt-pt" alt="" src="art/p/${A.story[c.pt]}.webp">` : '';
    showTitle(`<div class="tt-art"${bg}></div><div class="tt-box">${c.who ? `<p class="tt-who">${pt}<span>${esc(c.who)}</span></p>` : ''}<p class="tt-story">${esc(c.t)}</p>${c.opts ? c.opts.map(o => `<button class="tt-btn" data-a="${o.a}">${esc(o.t)}</button>`).join('') : `<button class="tt-btn" data-a="sbeat">${last ? 'Close' : 'Continue'}</button>`}</div>`); }
  function storyNext() { if (!STY) return; if (STY.i < STY.cards.length - 1) { STY.i++; return storyDraw(); } const d = STY.done; STY = null; hideTitle(); if (d) d(); }
  function takeTable(r) { if (haveT(r)) return; S.tabs[r] = 1; const T = Deep.TABLES[r]; save();
    const cards = [{ bg: 'J09', t: `The scroll on the pedestal is warm. When you unroll it, a copy of the ${T.name} table appears in your Ledger. ${T.note}` }];
    if (r === 8) cards.push({ bg: 'J10', who: 'Ilva Thorne', pt: 'ilva', t: 'Beyond the vault, the shelves reach higher than the lamplight. A gray-haired woman looks up from the table. "I’m Ilva Thorne. I left a letter in Tallyport in case someone else came out of the sea. I’ve been hoping I’d meet you."' },
      { bg: 'J10', who: 'Ilva Thorne', pt: 'ilva', t: '"I came here to put three entries back where people could read them. Ysolt made me a pen, and I had the surviving copies and the clerks’ log to check every word. I was the one who hid the record of my own arrival. I took it out the day before the light came, forty years ago. I was afraid someone would find it and tell me I had to go."' },
      { bg: 'J10', who: 'Ilva Thorne', pt: 'ilva', t: '"I stayed because I cared about the people I’d met, and I wish I’d trusted them enough to say so. The last Great Truth uses the record I hid. If you can work out what the rescue dates have in common with the lights, you’ll have a chance to decide for yourself."' });
    storyCards(cards, () => { if (r === 8) { S.archive = 1; if (S.boss[8]) { S.seen['council.public']=1; toast('Petra brings the restored records to the council. Read her account in your Journal.'); } } save(); render(); toast(!S.letter ? 'Show it to Odalys in Tallyport' : 'New table in your Ledger: ' + T.name); }); }
  function ilvaLetter() { closeSheet(); closeSay();
    storyCards([{ bg: 'J07', who: 'Odalys Brine', t: 'Odalys unlocks the door at the top of the harbor tower. "This was Ilva’s study. She left a letter on the desk for the next person who came out of the sea. I promised to deliver it, though I never really thought the day would come."' },
      { bg: 'J08', who: 'Ilva Thorne', pt: 'ilva', t: '"If you’re reading this, someone pulled you out of the Brass Sea. It happened to me forty years ago, and I’ve been looking for another person who could tell me what it was like for them. I’m sorry I wasn’t here to meet you. I had to go north to check some records before the council sealed them away."' },
      { bg: 'J08', who: 'Ilva Thorne', pt: 'ilva', t: '"You may already have used the Ledger to read the company books. The older public records are kept separately. I found a keeper guarding a different register in each town’s vault. There’s enough left to follow the trail, if you can bring back copies."' },
      { bg: 'J08', who: 'Ilva Thorne', pt: 'ilva', t: '"When I put records from different vaults together, I could ask things that none of the registers answered on its own. I call those questions the Great Truths. I’ve written the first one below."' },
      { bg: 'Z01', who: 'Ilva Thorne', pt: 'ilva', t: '"I’ve enclosed a copy of the towns table. If you follow my trail into the vaults, the last Truth may give you a way home. Whatever you decide to do, I hope you’ll have a choice. Ilva."' }],
      () => { S.letter = 1; S.tabs[0] = 1; save(); tab = 'ledger'; lsub = 'lost'; render(); toast('Your Ledger has a new page: the lost tables'); }); }
  function lostHTML() {
    if (!S.letter && !Object.keys(S.tabs || {}).length) return '<p class="cap2">Nothing here yet.</p>';
    const card = (t, i) => haveT(i) ? `<div class="lt on"><p class="lt-n">${ico('t_open')}<b>${t.name}</b></p><p class="lt-c">${t.cols.map(c => `<code>${c}</code>`).join(' ')}</p><p class="cap2">${esc(t.note)}</p><button class="btn sm quiet" data-a="dpeek" data-i="${i}">First rows</button></div>`
      : `<div class="lt off"><p class="lt-n">${ico('t_locked')}<b>Sealed</b></p><p class="cap2">${i === 0 ? 'Comes with Ilva’s letter' : 'In the vault of ' + esc(DUNGEONS[i - 1].name) + ', ' + esc(region(i).name)}</p></div>`;
    const links = Deep.LINKS.filter(l => haveT(Deep.TABLES.findIndex(t => t.name === l[0])) && haveT(Deep.TABLES.findIndex(t => t.name === l[2])));
    const TT = Deep.TRUTHS, known = TT.filter(tKnown), hidden = TT.length - known.length;
    const tr = T => { const done = S.tw[T.id], g = Deep.GIFTS[T.gift], need = T.needs.filter(i => !haveT(i)).map(i => Deep.TABLES[i].name);
      return `<li class="gt${done ? ' done' : ''}">${done && ART && ArtData.emblems ? `<img alt="" src="art/i/gt${T.em}.webp">` : ico(done ? 't_star' : 't_q')}<div><b>${esc(T.title)}</b><small>${done ? esc(g[0] + ': ' + g[1]) : need.length ? 'Needs ' + need.join(', ') : esc(g[0])}</small></div>${done ? '<span class="pill ok">Known</span>' : need.length ? '' : `<button class="btn sm solid" data-a="truth" data-id="${T.id}">Ask</button>`}</li>`; };
    return `<div class="scroll"${ART && ArtData.z01 ? ' style="background-image:url(art/bg/Z01.jpg)"' : ''}><p class="eyebrow">The lost tables · ${Deep.TABLES.filter((t, i) => haveT(i)).length} of 9</p><div class="lts">${Deep.TABLES.map(card).join('')}</div>${links.length ? `<p class="lab">How they join</p><ul class="joins">${links.map(l => `<li><code>${l[0]}.${l[1]}</code> → <code>${l[2]}</code></li>`).join('')}</ul>` : ''}</div>
      <section class="sec"><h2>Great Truths <small>${Object.keys(S.tw).length} of ${TT.length}</small></h2>${known.length ? `<ul class="goods gts">${known.map(tr).join('')}</ul>` : ''}<p class="cap2">${hidden ? `There are ${hidden} more to find in Ilva’s journal, with lair leaders, and in the archive.` : 'You have found all of them.'}</p></section>`; }
  function trOpen(id) { const T = Deep.TRUTHS.find(x => x.id === id); if (!T || !tReady(T)) return; closeSheet(); deepDb(); TR = { T, draft: '', res: null, err: '', got: null }; if (sceneUp) Scene.pause(); $('#enc').hidden = false; $('#nav').hidden = true; trDraw(); }
  function trClose() { TR = null; $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; if (sceneUp) Scene.refresh(); render(); }
  function trRun() { const sql = $('#sql').value; if (!sql.trim() || !TR) return; TR.draft = sql; const db = deepDb(), got = db.read(sql); S.stats.q++; if (got.err) { TR.err = got.err; TR.got = null; return trDraw(); }
    const want = db.read(TR.T.sql), j = Engine.judge(got, want, /ORDER BY/i.test(TR.T.sql)); TR.got = got; TR.err = j.ok ? '' : (j.msg || 'Not this one.');
    if (j.ok) { S.stats.ok++; const T = TR.T, first = !S.tw[T.id] && !A.paid['tw' + T.id]; S.tw[T.id] = 1; A.paid['tw' + T.id] = 1; applyGifts(); TR.res = first ? grant({ gold: 60 + 30 * Deep.TRUTHS.indexOf(T), items: [makeItem(rollRarity(luck(), 2), Math.max(1, Math.min(8, S.region)))] }) : null; save(); renderHud(); }
    trDraw(); }
  function trDraw() { const el = $('#enc'), T = TR.T, ok = !!S.tw[T.id] && TR.got && !TR.err, g = Deep.GIFTS[T.gift]; el.className = 'q pk fi tr'; felt(0);
    const names = Deep.TABLES.filter((t, i) => haveT(i)).map(t => t.name), tabs = `<div class="row wrap">${names.map(n => `<button class="btn sm quiet" data-a="dpeek" data-i="${Deep.TABLES.findIndex(t => t.name === n)}">${n}</button>`).join('')}</div>`;
    const out = TR.got ? tableHTML(TR.got, 12) : '', verdict = ok ? `<p class="pk-q me"><b>That is the Truth</b></p><p class="pk-res">${esc(MEAN[T.id] || '')}</p><p class="cap2">${esc(g[0])}: ${esc(g[1])}.</p>${TR.res ? spoilsHTML(TR.res) : ''}` : TR.err ? `<p class="pk-q"><span>${esc(TR.err)}</span></p>` : '';
    const body = `<div class="pk-body"><p class="pk-log">A Great Truth · ${esc(T.title)}</p><div class="fi-ask"><p>${esc(T.ask)}</p></div>${tabs}${verdict}${out}</div>`;
    let dock, after = null;
    if (ok) dock = `<div class="row"><button class="btn solid big" data-a="trclose">${T.id === 't12' ? 'Go down to the harbor' : 'Close'}</button></div>`;
    else { dock = `<div class="pk-rd"><button class="btn sm quiet" data-a="trclose">‹ Leave</button><span>Your Ledger · ${names.length} lost tables</span></div>` + kbHTML({ tables: names, sql: T.sql }, 8, 'Ask'); after = () => { kbDraw(); const ta = $('#sql'); if (TR.draft) ta.value = TR.draft; kbFocus(); }; }
    el.innerHTML = `<header class="q-head"><button class="q-x" data-a="trclose">‹ Leave</button><div class="q-steps"><span class="on">Great Truth</span></div></header>${body}<div class="dock pk-dock">${dock}</div>`; if (after) after(); }
  function theDoor() { storyCards([{ bg: 'J11', t: 'On ' + Deep.RETURN_ON + ', forty days after the Marigold found you, the light appears beyond Tallyport’s harbour wall. Tamsin helps lower a rowboat. Odalys waits beside Ilva while you decide what to take.' },
    { bg: 'J11', who: 'Ilva Thorne', pt: 'ilva', t: '"The records give us one light for each rescue, so I don’t know if you’ll see one again after this. Sit with us if you need a moment. I stayed because I wanted a life with the people I’d met. I want you to be able to choose the life you want, too."', opts: [{ t: 'Row out to the light', a: 'gohome' }, { t: 'Stay in Brasswake', a: 'stay' }] }]); }
  /* ---------- houses: deeds from any banker, placed in the wilds, painted, with a chest, a bed and a shelf ---------- */
  let DM = 0, PL = null; const lc = t => /^[A-Z]-/.test(t) ? t : t[0].toLowerCase() + t.slice(1);
  const hPrice = (sh, mt) => Math.round(HOUSES[sh][3] * HMAT[mt][1] / 10) * 10, hName = (sh, mt) => HMAT[mt][0].toLowerCase() + ' ' + lc(HOUSES[sh][0]);
  const funds = () => S.gold + ((S.bank && S.bank.gold) || 0), pay = n => { const a = Math.min(S.gold, n); S.gold -= a; S.bank.gold -= n - a; };
  function deedsSheet() {
    const specialty = marketSpecialty(CE), materials = specialty && specialty.materials || HMAT.map((_, i) => i);
    if (!materials.includes(DM)) DM = materials[0];
    const mats = materials.map(i => `<button class="btn sm${i === DM ? ' solid' : ' quiet'}" data-a="dmat" data-i="${i}">${HMAT[i][0]}</button>`).join('');
    sheet(`<p class="eyebrow">Deeds · paid from your purse, then your account</p><h2>Homes for sale</h2><p class="cap2">You have ${funds()} gold. Buy a deed, walk somewhere open outside town, and set it down from your bag.</p><div class="row">${mats}</div>
      <ul class="goods">${HOUSES.map((h, i) => { const c = hPrice(i, DM); return `<li class="good">${ico('deed')}<div><b>${HMAT[DM][0]} ${lc(h[0])}</b><small>${h[1]} × ${h[2]} · chest holds ${h[4]}</small></div><button class="btn sm" data-a="buydeed" data-i="${i}"${funds() >= c ? '' : ' disabled'}>${c} gold</button></li>`; }).join('')}</ul>
      <div class="row end"><button class="btn sm quiet" data-a="${specialty ? 'talk' : 'bankback'}">${specialty ? 'Back to the stall' : 'Back to your account'}</button></div>`); }
  function placeBar() { let el = $('#placebar'); if (!PL) { if (el) el.remove(); return; } if (!el) { el = document.createElement('div'); el.id = 'placebar'; el.className = 'placebar'; document.body.appendChild(el); }
    const g = Scene.ghostNow(), why = g && g.why, msg = { town: 'Too close to a town.', ground: 'The ground there is not clear.', path: 'You could not reach the door.', edge: 'Too close to the edge of the map.', you: 'You are standing there.', inside: 'Houses go outdoors.' }[why] || 'Tap the map to move it. The small square is the door.';
    el.innerHTML = `<b>${esc(HMAT[PL.mat][0])} ${esc(lc(HOUSES[PL.shape][0]))}</b><span>${why ? esc(msg) : 'Clear ground. ' + esc(msg)}</span><div class="row"><button class="btn sm quiet" data-a="placecancel">Cancel</button><button class="btn sm solid" data-a="placego"${why ? ' disabled' : ''}>Build here</button></div>`; }
  function startPlace(k) { const d = S.deeds[k]; if (!d) return; if (Scene.inDungeon()) return toast('Houses go outdoors.'); PL = { k, shape: d.shape, mat: d.mat }; closeSheet(); tab = 'world'; render(); Scene.ghost({ w: HOUSES[d.shape][1], h: HOUSES[d.shape][2] }); placeBar(); }
  function homeById(id) { return (S.homes || []).find(h => h.id === id); }
  function homeSheet(h) { if (!h) return; const H = HOUSES[h.shape], wn = PAINT.wall.find(p => p[1] === h.wall), rn = PAINT.roof.find(p => p[1] === h.roof), worn = new Set(Object.values(S.eq || {})), free = S.inv.filter(it => !worn.has(it.id));
    const row = (it, a, lab) => `<li class="good">${ico(it.ic)}<div><b class="r-${it.rarity || 'common'}">${esc(it.name)}</b><small>${esc(it.slot || '')}</small></div><button class="btn sm" data-a="${a}" data-id="${it.id}" data-h="${h.id}">${lab}</button></li>`;
    const sw = (kind, list, cur) => `<div class="swatches">${list.map(p => `<button class="sw${p[1] === cur ? ' on' : ''}" style="background:${p[1]}" data-a="paint" data-h="${h.id}" data-k="${kind}" data-c="${p[1]}" aria-label="${esc(p[0])}"></button>`).join('')}</div>`;
    const troph = Object.keys(S.boss).map(r => BOSSES[r - 1].name).concat(Object.keys(S.lairday || {}).map(id => (LAIRS.find(L => L.id === id) || {}).name).filter(Boolean));
    sheet(`<p class="eyebrow">${esc(region(h.r).name)} · ${esc(hName(h.shape, h.mat))}</p><h2>${esc(h.name)}</h2>
      <div class="row"><button class="btn sm" data-a="hbed" data-h="${h.id}"${S.hp < maxHp() ? '' : ' disabled'}>Sleep in the bed</button>${h.pad ? '<span class="pill ok">Teleport pad</span>' : `<button class="btn sm" data-a="hpad" data-h="${h.id}"${S.runes > 0 ? '' : ' disabled'}>Install a teleport pad (1 rune, you have ${S.runes || 0})</button>`}</div>
      <section class="sec"><h2>Chest <small>${h.chest.length} / ${hCap(h)}</small></h2><p class="cap2">Things in here stay put when you die.</p>${h.chest.length ? `<ul class="goods">${h.chest.map(it => row(it, 'htake', 'Take')).join('')}</ul>` : ''}${free.length ? `<details class="lesson"><summary>Put something in</summary><div class="lb"><ul class="goods">${free.map(it => row(it, 'hput', 'Store')).join('')}</ul></div></details>` : ''}</section>
      <section class="sec"><h2>Trophy shelf</h2>${troph.length ? `<ul class="tale plain">${troph.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="cap2">Empty. Examiners and lair leaders you beat end up here.</p>'}</section>
      ${furnitureHTML(h)}
      ${CMap.houseHTML(h)}
      ${upHTML(h)}
      <section class="sec"><h2>Paint <small>${PAINT_C} gold a coat</small></h2><p class="lab">Walls · ${esc(wn ? wn[0] : '')}</p>${sw('wall', PAINT.wall, h.wall)}<p class="lab">Roof · ${esc(rn ? rn[0] : '')}</p>${sw('roof', PAINT.roof, h.roof)}</section>`); }
  // upgrades bought from inside the house
  const PAINT_C = 40, hCap = h => HOUSES[h.shape][4] + 10 * (h.xch || 0), xchC = h => 400 * ((h.xch || 0) + 1), BED_C = 900, GARDEN_C = 700;
  function upHTML(h) { const today = h.gday === dayKey();
    return `<section class="sec"><h2>Upgrades</h2><ul class="goods">
      ${(h.xch || 0) < 4 ? `<li class="good">${ico('chest')}<div><b>Another chest</b><small>Ten more slots that stay put when you die</small></div><button class="btn sm" data-a="hup" data-k="xch" data-h="${h.id}"${funds() >= xchC(h) ? '' : ' disabled'}>${xchC(h)} gold</button></li>` : ''}
      ${h.fbed ? '' : `<li class="good">${ico('stew')}<div><b>Feather bed</b><small>Sleeping here leaves you well rested: skill gain +25% for an hour</small></div><button class="btn sm" data-a="hup" data-k="fbed" data-h="${h.id}"${funds() >= BED_C ? '' : ' disabled'}>${BED_C} gold</button></li>`}
      ${h.garden ? `<li class="good">${ico('apple')}<div><b>Garden</b><small>${today ? 'Picked today. Come back tomorrow.' : 'Ready to pick'}</small></div><button class="btn sm" data-a="hpick" data-h="${h.id}"${today ? ' disabled' : ''}>Pick</button></li>` : `<li class="good">${ico('apple')}<div><b>Garden</b><small>Food and a few ${esc(MATS[h.r])} every day</small></div><button class="btn sm" data-a="hup" data-k="garden" data-h="${h.id}"${funds() >= GARDEN_C ? '' : ' disabled'}>${GARDEN_C} gold</button></li>`}
      </ul></section>`; }
  function homesUp() { Scene.cartographyAtlas(null); const moved = Scene.restoreHomes(S.homes || []); CMap.restore(); return moved; }
  const SH = {
    venuefolk(e){dlg(e,e.venueLine||'There is plenty of work to keep us busy here.',[bye]);},
    stablekeep(e){shopSheet(e,'Our riding horses are trained for the roads. Your horse stays yours when you dismount, and you can call it from the Hero menu.',[{ic:'deed',name:'Bay riding horse',meta:S.horse?.owned?'Your horse is ready. Mount outdoors from the Hero menu.':'Rides 70% faster than running. No feeding charges or permanent horse loss.',price:Mounts.PRICE+' gold',a:'buyhorse',off:S.horse?.owned||S.gold<Mounts.PRICE}],S.horse?.owned?'<button class="btn sm" data-a="mounttoggle">'+(mounted()?'Dismount':'Mount horse')+'</button>':'');},
    venueup(e) { if(Scene.enterVenue(e)){S.interior=Scene.venueState();save();render();} },
    venuedown(e) { if(Scene.exitVenue(e)){S.interior=null;S.pos=Scene.pos();S.region=Scene.region();surfaceBodies();save();render();} },
    cartographer: e => CMap.shop(e), regionchart: e => CMap.chart(e), homeatlas: e => CMap.atlas(e), atlasdisplay: e => dlg(e, 'The Grand Atlas is a chart table made for a house. The capital cartographer sells it for 30,000 gold once you own all eight regional maps. Install it at home to travel between regions.', [bye]),
    roadsign(e) { const arms = Scene.cartographySign(e); sheet(`<p class="eyebrow">Road sign</p><h2>${esc(e.name)}</h2><ul class="tale plain">${arms.map(a => `<li><b>${esc(a.direction)}</b> · ${esc(a.name)}</li>`).join('')}</ul><p class="cap2">Follow the indicated road. Island routes lead to a ferry.</p>`); },
    ferry: ferryOffer,
    landmark(e) {
      if (e.place === 'marigold') dlg(e, 'The Marigold is moored at Tallyport’s quay.', [bye]);
    },
    specialist(e) { if (marketSpecialty(e)) countryStock(e); },
    banker(e) { if (gid() === 'bank' && !S.gbk) { S.gbk = 1; return dlg(e, '"If you fall out there, you’ll have ten minutes to recover whatever you dropped. I can look after your gold and any gear you leave with me. Open the bank and choose Deposit all to put your gold away."', [{ t: 'Open the bank', a: 'bankopen' }, bye]); } bankSheet(e); },
    guide(e) { const g = gOn() && GD[S.gd]; dlg(e, (g && g.say) || '"Keep going. I’m right here."', [g && g.id === 'fish' && { t: 'Skip the fishing', a: 'gnext' }, { t: 'Skip the rest of the guide', n: 'you can always ask the townsfolk', a: 'gskip' }, bye]); },
    lookout(e) { if (gid() === 'tower') { gDone('tower'); return dlg({name:'The view from the harbor tower'}, ['"See the road past those roofs? It runs up to Varrick’s ring, where he examines people for the First Circle. Look out for old signposts as you travel. Ilva Thorne left pages of her journal at some of them."','"Open the Map to see where you’ve walked. The cartographer can show you where the roads go and sell you a survey if you want to see farther."'], [{ t: 'Open the Map', a: 'tab', d: { t: 'map' } }, bye]); } sheet(`<p class="eyebrow">Tallyport · the harbor</p><h2>Harbor tower</h2><p class="story">From the top you can see the coast and where the road turns north.</p><div class="row end"><button class="btn quiet" data-a="closesheet">Climb down</button><button class="btn solid" data-a="tab" data-t="map">Open the Map</button></div>`); },
    myhome(e) { homeSheet(homeById(e.hid)); },
    npc(e) {
      const t = e.r;
      if (t === 1 && e.i === 0 && S.tut === 0) { S.talked = 1; return dlg(e, TALK.m[0][0], [{ t: 'Begin', n: 'the first lesson', a: 'start', d: { k: 'intro' } }, { t: 'Not yet', a: 'closesheet' }]); }
      if (t === 1 && e.i === 0 && S.tabs && S.tabs[1] && !S.letter) return dlg(e, '"Is that the ships register? Corin went looking for it." Odalys turns the scroll over before she hands it back. "Come up to my study. Ilva Thorne left a letter I’d like you to read."', [{ t: 'Go up to her study', a: 'letter' }, bye]);
      if (t === 1 && e.i === 0 && gid() === 'odalys') return dlg(e, '"Not out here. Meet me in the dojo, north-east of the square."', [bye]);
      if (t === 1 && e.i === 0 && S.odp === 1) { S.odp = 2; save(); return dlg(e, '"I heard you used WITH, RANK and a join in the same query. That’s how I’d have done it. Bring me your next one and we’ll see what else you can do with it."', [bye]); }
      if (t === 1 && e.i === 0 && gid() === 'page') return dlg(e, '"If Tamsin sent you for another ability, have a look through these pages. You can learn a different strike or spell, or try a page for stealing or crafting if you want work outside a fight."', [{ t: 'Pages for sale', a: 'pages' }, bye]);
      const mine = jobsOf(e), next = mine.find(c => !S.done[c.id]), nd = mine.filter(c => S.done[c.id]).length, key = t + '.' + e.i, first = !S.met[key]; S.met[key] = 1;
      const line = e.i === 0 ? (!next ? TALK.m[t - 1][3] : first ? TALK.m[t - 1][0] : TALK.m[t - 1][1 + (nd % 2)]) : first ? TALK.s[t - 1][e.i - 1] : next ? TALK.again[nd % 3] : '"That’s everything I had for you. Thanks for the help."';
      dlg(e, line, [next && { t: next.title, n: `exercise · ${15 * t + 10} gold`, a: 'offer', d: { id: next.id } }, e.i === 0 && { t: 'Pages for sale', n: `${CIRCLE[t]} Circle`, a: 'pages' }, nd && { t: 'Past exercises', n: nd + ' done', a: 'jobs' }, e.i !== 1 && { t: 'Ilva Thorne', a: 'ask', d: { k: 'story' } }, { t: 'This place', a: 'ask', d: { k: 'place' } }, bye]);
    },
    shipcargo(e){boatCargo(e);},
    folk(e) { if(e.shipPerson)return boatTalk(e); if (gid() === 'folk') return dlg(e, '"Tamsin said you’d be coming ashore today. I’m glad you’re up and about. Ask around the docks if you need a hand. Half of us have been hauled out of the water at least once."', [bye]); if(e.venueLine)return dlg(e,e.venueLine,[bye]); dlg(e, pick(TALK.bark.concat(TALK.hint, Object.keys(S.boss).length ? TALK.marked : [])), [bye]); },
    corpse(e) { lootOpen(e); },
    camp() {if(activePursuit())return toast('Lose your pursuer before resting.'); if (now() - (S.campT || 0) < 120e3 || S.hp >= maxHp()) return toast(S.hp >= maxHp() ? 'The fire is warm. You are already rested.' : 'You have only just rested here.'); S.campT = now(); const n = heal(maxHp() * .5); save(); renderHud(); toast(`You rest by the fire: +${n} health`); },
    peddler(e) { const c = 8 * e.r, m = 3 * e.r; shopSheet(e, TALK.way[e.x % 3], [{ ic: 'draught', name: 'Healing Draught', meta: 'Restores 30 health, in or out of a fight', price: c + ' gold', a: 'buytonic', d: { c }, off: S.gold < c }, { ic: 'ration', name: 'Trail ration', meta: 'Eat it from your bag: +15 health', price: m + ' gold', a: 'buymeat', d: { c: m }, off: S.gold < m }], '<button class="btn sm quiet" data-a="sellcommon">Sell goods</button>'); },
    cache(e) {
      if (S.cache[e.cid] !== dayKey() && lockOffer(e,()=>SH.cache(e))) return;
      if (S.cache[e.cid] === dayKey()) return toast('Empty. Come back another day.'); const t = e.r, o = { gold: rint(10, 20) * t, mats: { [t]: rint(1, 3) }, items: rnd() < .3 ? [makeItem(rollRarity(luck()), t)] : [], scrolls: [] };
      if (rnd() < .35) { const left = PAGES.filter(p => p.c === t && !p.rare && !owned(p.id) && !S.scr[p.id]); if (left.length) o.scrolls.push(pick(left).id); }
      S.cache[e.cid] = dayKey(); Scene.FX.treasure(e.x, e.y); const g = grant(o); save(); renderHud(); Scene.refresh(); sheet(`<p class="eyebrow">${esc(region(t).name)} · in the wilds</p><h2>An old chest</h2>${spoilsHTML(g)}<div class="row end"><button class="btn solid" data-a="closesheet">Take it</button></div>`);
    },
    tavern(e) { const t = e.r, rm = RUMORS[t - 1], nd = doneIn(t), cost = 4 * t, well = S.hp >= maxHp(); shopSheet(e, TALK.tav[t - 1], [{ ic: 'stew', name: 'A meal and a bed', meta: well ? 'You are well' : 'Back to full health', price: cost + ' gold', a: 'rest', d: { c: cost }, off: well || S.gold < cost },
      S.rum[rm.id] ? { ic: 'scroll', name: rm.title, meta: 'A rumor you have run down', pill: 'solved' } : nd >= 5 ? { ic: 'scroll', name: rm.title, meta: 'Follow the rumor to find a named item and a rare page.', price: 'Hear it', a: 'start', d: { k: 'rumor', id: rm.id } } : { ic: 'scroll', name: 'A rumor', meta: `The keeper will talk after ${5 - nd} more exercise${5 - nd === 1 ? '' : 's'} here`, price: 'Later', a: 'noop', off: 1 }]); },
    healer(e) { const t = e.r, cost = 3 * t, dc = 10 * t, well = S.hp >= maxHp(); shopSheet(e, TALK.heal[t % 3], [{ ic: 'salve', name: 'Bind my wounds', meta: well ? 'You are well' : 'Back to full health', price: cost + ' gold', a: 'rest', d: { c: cost }, off: well || S.gold < cost }, {ic:'bandage',name:'Five bandages',meta:'Each Bandage action uses one. Healing skill sets recovery.',price:(3*t)+' gold',a:'buybandages',d:{c:3*t},off:S.gold<3*t}, { ic: 'draught', name: 'Healing Draught', meta: 'Restores 30 health, in or out of a fight', price: dc + ' gold', a: 'buytonic', d: { c: dc }, off: S.gold < dc }]); },
    board(e) { if (S.stats.ok < 4) return dlg(e, 'Nothing pinned for you yet.', [bye]); const R = rounds(); dlg(e, 'There are five drills each day, with extra practice for techniques you haven’t used in a while. Finish all five to earn a chest.', R.tasks.map((x, i) => ({ t: tplOf(x.tpl).title, n: x.done ? 'done' : (tplSkills(x.tpl).some(rusty) ? 'rusty · ' : '') + CIRCLE[tplOf(x.tpl).r] + ' Circle', a: 'start', d: { k: 'round', i }, off: x.done })).concat([bye])); },
    bench() {
      const t = here(), CS = ['weapon','armor','shield','head','hands','feet','cloak','ring','charm'], cp = bestPage('craft'), can = !!cp && cp.c >= t;
      sheet(`<p class="eyebrow">Workbench · ${CIRCLE[t]} Circle</p><h2>Craft</h2><div class="grid"><span class="cell">${ico('mat' + t, have(t))}</span><span class="cell">${ico('sigil', have('sigil'))}</span><span class="cell">${ico('draught', S.tonics)}</span><span class="cell">${ico('hintkey', S.hints)}</span></div>${can ? `<p class="cap2">Each piece is one query and one roll, asked at the circle of your best pattern page (${esc(cp.name)}). Blacksmithing ${rv('smith').toFixed(0)} makes gear, Alchemy ${rv('alchemy').toFixed(0)} makes draughts and keys. A spoiled piece wastes half the materials.</p>` : `<div class="verdict bad"><p>Working ${MATS[t]} needs a Pattern Book page of the ${CIRCLE[t]} Circle. ${esc(FOLK[t - 1][0][0])} sells one.</p></div>`}<div class="seg">${CS.map(c => `<button data-a="slot" data-s="${c}" aria-pressed="${benchSlot === c}">${c}</button>`).join('')}</div><ul class="inv">${RECIPES.filter(x => !x.minR || t >= x.minR).map(x => { const ok = can && have(t) >= x.mats && have('sigil') >= x.sigils, d = Math.min(100, diffOf(t) + ({ rare: 8, epic: 16, legendary: 24 }[x.id] || 0)); return `<li><span class="nm ${x.gear ? 'rar-' + x.id : ''}">${esc(x.id === 'scroll' ? 'Hint Key' : x.name)}${x.gear ? ' · ' + benchSlot : ''}</span><div class="row"><span class="meta grow">${x.mats} ${MATS[t]}${x.sigils ? ' + ' + x.sigils + ' sigil' : ''} · ${odds(rv(x.gear ? 'smith' : 'alchemy'), d, 'correct').p}% if correct</span><button class="btn sm" data-a="craft" data-id="${x.id}"${ok ? '' : ' disabled'}>Craft</button></div></li>`; }).join('')}</ul>${craftMaterialHTML()}<button class="btn quiet" data-a="enchantmenu">Enchant equipment</button>${professionHTML()}`);
    },
    casino(e) { CE=e;if(e.station==='poker'){const room=Poker.ROOM[e.r-1];return shopSheet(e,'There is an open seat at the poker table. The blinds are posted beside the dealer.',[{ic:'cards',name:'Blind Tally poker',meta:'Six seats. Blinds '+room.bb/2+' and '+room.bb+'.',price:'Join table',a:'pkrules',d:{r:e.r},off:S.gold<20*room.bb}]);}if(e.station==='blackjack')return bjOpen(e.r);if(e.station==='wheel')return whOpen(e.r);const r = e.r, room = Poker.ROOM[r - 1]; shopSheet(e, pick(['"Chips at the cage, questions at the table. Welcome."', '"The house deals straight. Query the cards all you like."', '"Find a seat. The blinds are posted on each table."']), [{ ic: 'chips_gold', name: 'Blind Tally', meta: `Hold’em, six seats. Blinds ${room.bb / 2} and ${room.bb}. Sit with ${20 * room.bb} gold or more`, price: 'Table', a: 'pkrules', d: { r }, off: S.gold < 20 * room.bb },
      { ic: 'wheel', name: 'The Crooked Wheel', meta: `Bet with a query. The wheel has a flaw, and its history is a table. Bets from ${room.bb} gold`, price: 'Wheel', a: 'whopen', d: { r } }, { ic: 'shoe', name: 'The Count', meta: `Blackjack. Every card shown is logged, so you can count the shoe with a query. Bets from ${room.bb} gold`, price: 'Deal', a: 'bjopen', d: { r } }]); },
    home(e) {
      const R = SETTLE[e.role], a = S.er.a[e.hid], opts = [], del = Object.values(S.er.a).find(x => x.type === 'deliver' && x.to === e.hid);
      if (del) return errandPay(del, e, pick(ERR.got).replace('{who}', del.from));
      let line = R.say[(hsh(e.hid) + new Date().getDate()) % 2];
      if (a) { if (errandReady(a)) { line = pick(ERR.done); return errandPay(a, e, line); } line = pick(ERR.wait) + ' ' + a.what + '.'; }
      else if (S.er.d[e.hid] !== dayKey() && Object.keys(S.er.a).length < 6) { const E = errandFor(e); opts.push({ t: 'An errand', n: `${E.what.split(',')[0]} · ${E.gold} gold`, a: 'eroffer' }); }
      if ((R.sells && R.sells.length) || R.gear || R.keys || R.tonic || R.mats || R.hides) opts.push({ t: 'Trade', n: 'see what they have', a: 'ctrade' });
      if (R.song) opts.push({ t: 'A song', n: `${3 * e.r} gold · restores 12 health`, a: 'song' });
      opts.push(bye); dlg(e, line, opts);
    },
    stock(e) { toast(STOCKSAY[e.st || e.tpl] || 'It ignores you.'); },
    poi(e) { coach('place');
      const P0 = PLACES[e.pk], r = e.r, kind = P0[3], daily = kind === 'heal', seen = daily ? S.poi[e.pid] === dayKey() : !!S.poi[e.pid]; let extra = '', G = null;if(kind==='heal'&&activePursuit())return toast('Lose your pursuer before resting.');
      const lost = Object.values(S.er.a).find(x => x.type === 'find' && x.at === e.pid && !x.found); if (lost) { lost.found = 1; extra += `<p class="spoils">You find ${esc(lost.x)}. ${esc(lost.from)} will want it back.</p>`; }
      if (kind === 'tale') extra += `<p class="story">${esc(TALES[hsh(e.pid) % TALES.length])}</p>`;
      else if (seen) extra += `<p class="cap2">${daily ? 'You have rested here today.' : 'There is nothing more here.'}</p>`;
      else { S.poi[e.pid] = daily ? dayKey() : 1;
        if (kind === 'gold') G = grant({ gold: rint(14, 30) * r }); else if (kind === 'loot') { const o = { gold: rint(12, 26) * r, items: [makeItem(rollRarity(luck(), e.pk === 'ruin' ? 2 : 1), r)], scrolls: [] }; if (rnd() < .3) { const left = PAGES.filter(p => p.c === r && !p.rare && !owned(p.id) && !S.scr[p.id]); if (left.length) o.scrolls.push(pick(left).id); } G = grant(o); }
        else if (kind === 'food') { const o = { food: {} }; o.food[pick(['cheese', 'loaf', 'apple', 'honey'])] = 2; G = grant(o); } else if (kind === 'key') { S.hints++; extra += '<p class="spoils">+1 Hint Key</p>'; }
        else if (kind === 'skill') { const id = bestWeapon(), gn = gain(id, rv(id), 2); extra += gn ? gainsHTML([gn]) : '<p class="cap2">The stones have nothing left to teach you.</p>'; }
        else if (kind === 'heal') { const n = heal(maxHp()); extra += `<p class="spoils">+${n} health</p>`; } else if (kind === 'view') { S.known[r] = 1; extra += `<p class="spoils">Your map now marks the homesteads, fishing spots, and places to explore in ${esc(region(r).name)}.</p>`; }
        if (G) { Scene.FX.treasure(e.x, e.y); extra += spoilsHTML(G); } }
      save(); renderHud(); Scene.refresh(); sheet(`<p class="eyebrow">${esc(region(r).name)} · out in the country</p><h2>${esc(P0[0])}</h2><p class="story">${esc(P0[2])}</p>${extra}<div class="row end"><button class="btn solid" data-a="closesheet">Move on</button></div>`);
    },
    fish(e) { coach('fish'); const left = fishLeft(e.fid), fs = rv('fishing'); CE = e; sheet(`<p class="eyebrow">${esc(region(e.r).name)} · the water</p><h2>Fishing ${qm('fish')}</h2><p class="cap2">Fishing ${fs.toFixed(1)} · ${left ? `${left} cast${left === 1 ? '' : 's'} left here today` : 'quiet until tomorrow'} · good fish ${FISHNEED.good}, rare ${FISHNEED.rare}, sunken ${FISHNEED.treasure}</p><ul class="goods">${CASTS.map((c, i) => goodHTML({ ic: 'rod', name: c.n, meta: gOn()&&e.r===1?['Practise the query you know with a cast near the bank.','Use the same query pattern for a more challenging cast.','Use the same query pattern farther out. Rare fish and sunken finds need more Fishing skill.'][i]:c.tip, price: 'Cast', a: 'cast', d: { i }, off: !left })).join('')}</ul>`); },
    shopkeep(e) { SH.stallkeep(e); },
    stallkeep(e) { const st = stall(); shopSheet(e, TALK.stall[e.r % 3], st.stock.map((it, i) => ({ item: it, name: it.name, cls: 'rar-' + it.rarity, meta: `${it.slot} · ${statLine(it)}`, price: price(it) + ' gold', a: 'buy', d: { i }, off: S.gold < price(it) })), `<span class="cap2 grow">${st.stock.length ? '' : 'Sold out. '}New stock in ${Math.max(0, 6 - st.n)} tasks.</span><button class="btn sm quiet" data-a="sellcommon">Sell goods</button>`); },
    registrar(e) {
      const n = Object.keys(S.boss).length;
      const line = !isMain() ? `"${mainName()} is the one on the Trials roll. Seven regional Examiners award the first seven marks, and the council at Aldermoot awards the eighth at the Grand Audit."` :
        n >= 8 ? '"You’ve earned all eight marks, and the council has restored Tallyport’s seat."' :
        `"You have ${n} of the eight marks. Seven Examiners hold their tests at stone rings outside their towns. Once you have their marks, you can sit the Grand Audit before the council in Aldermoot."`;
      dlg(e, line, [bye]);
    },
    rival(e) {
      const t = e.r, v = rival(t), d = diffOf(t, true), sh = bestPage('shadow'), pid = 'h' + t + 'r', np = !owned(pid) && !S.scr[pid]; if (v.away > 0) return dlg(e, '"Not now."', [bye], `<p class="cap2">Back after ${v.away} more task${v.away === 1 ? '' : 's'}.</p>`);
      const so = !sh ? { t: 'Steal', n: 'you own no page of Shadows', a: 'talk', off: 1 } : e.unseen ? { t: sh.name, n: `purse and prize · ${odds(rv('stealing') + 10, d, 'correct').p}% if correct`, a: 'start', d: { k: 'rival', m: 'steal' } } : rv('hiding') > 0 ? { t: 'Hide, then ' + sh.name, n: `seen you · Hiding ${sneakPct()}%`, a: 'start', d: { k: 'rival', m: 'sneak' } } : { t: sh.name, n: 'seen you. Come from behind', a: 'talk', off: 1 };
      dlg(e, TALK.rival[t - 1], [{ t: 'Duel', n: `win ${Math.round(v.gold / 2)} gold · ${odds(rv(bestWeapon()), d, 'correct').p}% if correct`, a: 'start', d: { k: 'rival', m: 'duel' } }, so, bye], lootHTML(v.item) + (np ? scrollHTML(pageById(pid)) : '') + `<p class="cap2">Carries ${v.gold} gold.</p>`);
    },
    boss(e) { if (!isMain()) return dlg(e, `"I test the one on the Trials roll. The registrar can tell you what ${mainName()} needs for the next examination."`, [bye]); bossCard(e); },
    stairs(e) { dlg(e, DUNGEONS[e.r - 1].blurb, [{ t: 'Descend', n: Dungeons.get(e.r).floors.length + ' floors · hunting grounds, secrets and a vault', a: 'start', d: { k: 'dungeon' } }, { t: 'Leave', a: 'closesheet' }]); },
    mon(e) { if (gid()==='odalys' && S.met['1.0'] && !S.seen['intro.practice']) return dlg({name:'Your next lesson'}, '"Try your first ability on Odalys’s training dummy before you face a creature. She’s in the dojo northeast of the square. Tamsin will be waiting outside."', [bye]); if (!ready) return toast(engineErr || 'The Ledger is still opening'); START.monster(e); },
    node(e) { const t = e.r; S.mats[t] = have(t) + 1; Scene.kill(e); save(); toast(`+1 ${MATS[t]}`); },
    dojo(e) { if (ready) enterDojo(e.r); }, hallexit(e) { if(e&&e.shipExit)return boatLand(false); leaveDojo(); },
    master(e) {
      const r = e.r, d = DJ(r), first = !d.met, prize = !A.djp['m' + r];
      d.met = 1; save();
      const line = first && prize ? Dojo.SAY[r - 1].hi : d.master ? '"Come back for another round whenever you like."' :
        d.champ ? '"If you’re ready to spar, I can take you now."' : '"You can enter the tournament at the board. I’m here if you want a lesson first."';
      dlg(e, line, [{t:'Learn and practise SQL',n:'free, untimed specialist lessons',a:'learninghub',d:{r}}, { t: 'The tournament', n: 'bracket and fee', a: 'djboard' }, { t: 'Train character skills', n: `any skill up to ${TRAIN_CAP}, for a fee`, a: 'djtrain' }, d.champ && { t: d.master ? 'Spar again' : prize ? 'Spar for the prize' : 'Spar with the master', n: prize ? Dojo.PRIZES[r - 1].name : 'first to two rounds', a: 'djmaster' }, d.master && isMain() && { t: 'Ask about Ilva Thorne', a: 'djilva' }, bye]);
    },
    student(e) {specialistMenu(e.r,Learning.specialists(e.r)[e.i%3].id);},
    traveler(e) { dlg(e, TRVL[e.i] || '"See you in the bracket."', [bye]); },
    sorrel(e) { if (!isMain()) return dlg(e, '"I’m Sorrel Ashby. If you’ve put your name down for the tournament, I hope I’ll see you in the final."', [bye]); const line=Dojo.sorrelLine({met:!!S.djs,wonHere:!!DJ(e.r).sorrel,lostHere:!!DJ(e.r).sorrelLost,wonFinal:!!DJ(8).sorrel,wins:Object.values(S.dj||{}).filter(d=>d.sorrel).length}); S.djs=(S.djs||0)+1;save();dlg(e,line,[bye]); },
    foe(e) { dlg(e, '"Good bout."', [bye]); },
    odalys(e) { if (gid()==='odalys' && S.met['1.0'] && !S.seen['intro.practice']) return introAfter(); if (!isMain()) return dlg(e, '"If you’re training for the tournament, take a turn at the dummy first. The people in the bracket will be quicker to answer back."', [bye]); if (gid() !== 'odalys') return dlg(e, '"Go on, Tamsin’s waiting for you."', [bye]); dlg(e, ['"I’m Odalys Brine. Tamsin tells me the porter could use some help with the cargo. I teach SQL, the language we use to give our abilities power. The first lesson’s free."','"We’ll start with a small copy of the ship’s manifest, so you can see what a query does before trying an ability. Then you can practise on that training dummy without getting hurt."'], [{t:'Learn SQL first',a:'start',d:{k:'intro'}},{t:'Watch the demonstration',a:'odx',d:{n:1}}]); },
    dummy(e) { if (e.i === 9) { const o = Scene.find(x => x.kind === 'odalys'); return gid() === 'odalys' && o ? SH.odalys(o) : null; } Scene.FX.face(e); duOpen({ mode: 'practice', r: e.r, c: e.r, dummy: e }); },
    bracket(e) { djBoard(e.r); },
    rnote(e) { if (!isMain()) return toast(`A note pinned with a dagger. It’s addressed to ${mainName()}.`); const r = e.r; S.djn = S.djn || {}; S.djn[r] = 1; save(); sheet(`<p class="eyebrow">Pinned to a post with a dagger</p><h2>A note</h2>${ART && ArtData.dojo ? '<img class="scene" alt="" src="art/bg/DJ03.jpg">' : ''}<p class="story">${esc(Dojo.NOTES[r - 2])}</p><div class="row end"><button class="btn quiet" data-a="closesheet">Leave it</button></div>`); },
    guard(e) { if (ready) START.guard(e); },
 chest(e) { START.chest(e); }, keeper(e) { if (gOn()) return dlg({name:'Beyond the starter cellar'}, 'There’s a keeper farther down, but today’s chest is in the entrance cellar. Finish there first, then you can go back to Tamsin at the surface.', [bye]); if (ready) START.keeper(e); },
    ltable: e => DP.table(e),
    dtravel: e => DP.interact(e), dcache: e => DP.interact(e), dlever: e => DP.interact(e), dgate: e => DP.interact(e), dsecret: e => DP.interact(e), dlore: e => DP.interact(e),
    exit(e) { dlg(e, 'These stairs lead back outside. The places you’ve found will still be on your map when you return.', [{ t: 'Climb out', a: 'exitdungeon' }, { t: 'Stay', a: 'closesheet' }]); },
    page(e) { if (!isMain()) return toast(`A page of Ilva Thorne’s journal. ${mainName()} is the one following her trail.`); const t = e.r, first = !S.jr[t]; S.jr[t] = 1; if (first) save(); sheet(`<p class="eyebrow">Ilva Thorne’s journal · page ${t} of 8</p><h2>${esc(region(t).name)}</h2><p class="story">${esc(JOURNAL[t - 1])}</p>${(() => { const T = Deep.TRUTHS.find(x => x.from === 'page' + t); return T && S.letter ? `<p class="cap2">In the margin, a Great Truth: <b>${esc(T.title)}</b>. It is in your Ledger.</p>` : ''; })()}<p class="cap2">${Object.keys(S.jr).length} of 8 pages found. They are kept in your Journal.</p><div class="row end"><button class="btn solid" data-a="closesheet">Keep it</button></div>`); },
    journal() {
      const t=S.region,r=region(t),all=CONTRACTS.filter(c=>c.r===t),fk=FOLK[t-1],pages=[1,2,3,4,5,6,7,8].filter(k=>S.jr[k]),marks=[1,2,3,4,5,6,7,8].filter(k=>S.boss[k]);
      const available=all.filter(c=>!S.done[c.id]),finished=all.filter(c=>S.done[c.id]);
      const goal=objective(),nextExercise=!gOn()&&!DG&&/exercises$/.test(goal)&&available[0],nextStep=nextExercise?`Speak to ${fk[giverOf(nextExercise)][0]} about ${nextExercise.title}`:goal;
      const exercise=c=>`<li><b>${esc(c.title)}</b><small>${S.done[c.id]?'Completed':'Speak to '+esc(fk[giverOf(c)][0])}</small></li>`;
      sheet(`<p class="eyebrow">Journal · ${esc(r.name)}</p><h2>Your next step</h2><section class="journal-next"><h3>${esc(nextStep)}</h3><p>${gOn()?'Tamsin is guiding your first day. Follow the gold direction marker in Adventure, and tap her if you need the instructions again.':DG?'This is your current dungeon objective. The Map shows the floors and seals you have found.':nextExercise?'This local exercise pays gold and helps you prepare for the Trials. You can choose a different lesson under Optional SQL practice.':'Continue the Trials or choose some local practice below. Optional activities can wait.'}</p><button class="btn solid" data-a="tab" data-t="world">Back to Adventure</button></section>
        <details class="lesson"><summary>Optional SQL practice · ${esc(r.name)}</summary><div class="lb"><p>The dojo students explain this town’s SQL techniques and offer free, safe practice. These lessons are separate from your character’s combat skills.</p>${learningSummary(t)}<button class="btn sm" data-a="learninghub" data-r="${t}">See the lessons</button><h3>Local exercises · ${available.length} remaining</h3><p>Speak to the person named under an exercise to begin it. These jobs pay gold and help you practise.</p>${available.length?`<ul class="tale plain">${available.map(exercise).join('')}</ul>`:'<p>You have finished this town’s exercises.</p>'}</div></details>
        <details class="lesson"><summary>The Trials · ${marks.length} of 8 marks</summary><div class="lb"><p>${isMain()?marks.length?'You represent Tallyport in the Trials.':'Tallyport needs a new champion after Corin Hale’s death in the Bilge Vaults. Odalys can prepare you for the Trials.':esc(mainName())+' is Tallyport’s candidate for the Trials.'}</p><p>The first seven marks come from Examiners at stone rings outside their towns. The council in Aldermoot awards the eighth at the Grand Audit, after you earn the other seven.</p>${marks.length?`<p>Marks held: ${marks.map(k=>CIRCLE[k]).join(', ')}.</p>`:''}${S.won?'<p>The council has entered your name on the roll of masters.</p>':''}</div></details>
        <details class="lesson"><summary>Ilva’s story · ${pages.length} of 8 journal pages</summary><div class="lb"><p>These are Ilva’s personal notes. They are separate from the ability pages in your books. Look beside old signposts away from the main paths; a gold mark appears on the corner map.</p>${pages.map(k=>`<h3>Page ${k} · ${esc(region(k).name)}</h3><p class="story">${esc(JOURNAL[k-1])}</p>`).join('')}${S.archive&&S.boss[8]?'<h3>The reopened archive</h3><p>Petra presented Ilva’s removal log and the restored records at a public council session. Maren required the admission to be entered in the minutes. The archive is now open to inspection, and Tallyport has its seat again.</p>':''}</div></details>
        <details class="lesson"><summary>Completed exercises · ${finished.length} in ${esc(r.name)}</summary><div class="lb">${finished.length?`<ul class="tale plain">${finished.map(exercise).join('')}</ul>`:'<p>You have not completed a local exercise yet.</p>'}</div></details>
        <details class="lesson"><summary>How to play</summary><div class="lb"><ul class="tale plain"><li>Use the joystick at the bottom right to move. Push gently to walk or farther to run, and release to stop. Tap a nearby person or object to interact.</li><li>A ! over a master marks an exercise that teaches SQL.</li><li>A page is an ability learned in one of your four books. The Hero screen keeps your books. Masters sell abilities under Pages for sale; rare pages are found, won or stolen.</li><li>Using an ability asks you to write a query. A correct result gives full power; character skills and equipment also affect the outcome.</li><li>A Circle is a level in the eight-town SQL course. Higher Circle abilities ask harder questions and have more power against stronger creatures.</li><li>In combat, your first query that cannot run gets one free repair. Another execution error spends the turn. A query that runs but gives the wrong result can spend resources and gives reduced or zero power.</li><li>Sell unwanted gear to a stallkeeper or travelling trader. Choose Sell goods and review the items before confirming.</li><li>The road is open the whole way north.</li></ul></div></details>`);
    }
  };
  const BRASS = '#f3c95a';
  const HOST = {
    combatUi:()=>renderCombatUI(),
    inputBlocked: () => boatActive()&&!['walk','arrival'].includes(S.prologue.phase) || !$('#sheet').hidden || !$('#say').hidden || !$('#enc').hidden || !$('#coach').hidden || !$('#title').hidden,
    moveCloser: () => toast('Move closer to interact.'),
    cartography: () => CMap.visual(), waypoint: () => CMap.guide(), revealSurface: (x,y) => CMap.moved(x,y),
    mountSafety:()=>{if(S.horse?.mounted&&!Mounts.canRide(mountContext())){S.horse=Mounts.dismount(S.horse);save();}},mounted, travelSpeed:(running,ordinary)=>Mounts.speed(S.horse,ordinary,ActorRig.speed(true)*(gift('run')?1.15:1),running?1:.58,mountContext()), inspectService:p=>sheet(`<p class="eyebrow">${esc(region(p.r).name)}</p><h2>${esc(p.name)}</h2><p>${esc(Array.isArray(p.services)?p.services.join(', '):p.services||ServicePlaces.types[p.type]?.name||'Local premises')}</p><p class="cap2">Walk inside and approach the counter or station to use its services.</p><button class="btn" data-a="closesheet">Done</button>`), ghostMoved: () => placeBar(), runMul: () => gift('run') ? 1.15 : 1, keeperName: r => LAIRMON['k' + r], haveTable: r => haveT(r),
    app: () => ART && ArtData.body ? app() : null, role: () => S.path, look: () => S.look != null ? S.look : (LOOK0[S.path] || 0), thief: () => !!bestPage('shadow'), hue: r => HUES[r], folk: r => FOLK[r - 1], tavern: r => TAVERNS[r - 1], rivalName: r => RIVALS[r - 1].name, bossName: r => BOSSES[r - 1].name, dungeonName: r => DUNGEONS[r - 1].name, matName: r => MATS[r], regionName: r => region(r).name, regionSub: r => region(r).sub,
    homeRoles: r => [0, 1, 2, 3, 4, 5, 6].map(k => HOMES[(r * 3 + k * 4) % HOMES.length]), roamRoles: r => [0, 1, 2, 3, 4, 5, 6].map(k => ROAMERS[(r + k) % ROAMERS.length]), settler: role => SETTLE[role], settlerName: (hid, role) => FIRST[hsh(hid) % FIRST.length] + ' the ' + SETTLE[role].n, stockName: t => STOCK[t] || 'Animal', place: pk => PLACES[pk],
    tpls: r => BOUNTIES.filter(b => b.r === r).map(b => b.id), habitat: t => HAB[t] || 'open', wild: (r, h) => (WILD[r] || []).filter(w => w[1] === h || (h === 'coast' && w[1] === 'water') || (h === 'water' && w[1] === 'coast')).map(w => w[0]), hunts: t => !!HUNT[t], cacheOpen: id => S.cache[id] === dayKey(),
    manualMotion:(distance,run)=>{if(run&&distance>0&&CONCEAL.hidden){Sneaking.reveal(CONCEAL);renderHud();}},
    services:()=>S.services||(S.services={}), discoverService:id=>{if(!S.services)S.services={};if(!S.services[id]){S.services[id]=1;save();}},
    relocated: () => Sneaking.reveal(CONCEAL),
    visibility: () => ({hidden:CONCEAL.hidden,stealth:rv('stealth')}),
    detects: (d,facing,agg) => Sneaking.detection(CONCEAL,rv('stealth'),d,facing,agg),
    noticed: () => {if(Sneaking.reveal(CONCEAL)){renderHud();toast('You have been spotted');}},
    safeGround: e => !Scene.inDungeonMap()&&e.kind!=='boss'&&Geography.inTown(...Scene.pos()),
    aggro: () => !document.hidden && S.tut >= 3 && !Q && !F && !SB && $('#sheet').hidden && tab === 'world' && $('#title').hidden, chasing: () => !document.hidden && !Q && !F && !SB && $('#sheet').hidden && tab==='world' && $('#title').hidden,
    ambush(e) { if (Q || F || !ready) return;if(e.kind==='boss'){const denied=bossAccess(e);if(denied){Scene.endChase(e);toast(denied);return;}}CE = e; e.unseen = false; closeSheet(); if (tab !== 'world') ACT.tab({ t: 'world' });
      e.engaged=true;e.forced=true;
      if(e.kind==='boss')START.boss();else if(e.inst&&e.inst.dungeon)DP.fight(e);else START.monster(e, ''); }, spawn: tpl => ({ tpl, elite: tpl[0] === 'b' && rnd() < 0.09 }), monName: inst => inst.nm || MONSTERS[inst.tpl][0], lairs: () => LAIRS, lairName: k => LAIRMON[k], townsfolk: r => FOLKN.slice(r % 5).concat(FOLKN.slice(0, r % 5)), folkIdx: n => Math.max(0, FOLKN.indexOf(n)), chestOpen: () => !!(DG && DG.done),
    guideActive: () => gOn() && tab === 'world' && !Q && !F && !SB && $('#sheet').hidden && $('#title').hidden,
    guide() { if (!S.path || Q || F || DU || !gOn()) return null; const g = GD[S.gd]; if (Scene.inHall()) return g.hall ? g.hall() : null; if (Scene.inDungeon() !== (g.id === 'chest')) return null; if(g.id==='chest') return nearest(e=>e.tutorial&&!e.dead&&!e.dying) || nearest(e=>e.kind==='dcache'&&e.tutorial); if(g.id==='vault'){const entrance=Scene.cartographyCatalogue().find(e=>e.kind==='stairs'&&e.r===1),leg=entrance&&Scene.cartographyGuide(entrance.id);if(leg)return leg.at;}return g.arrow ? g.arrow() : null; },
    mark(e) {
      const t = e.r; if (e.kind === 'home') { const a = S.er.a[e.hid]; if (Object.values(S.er.a).some(x => x.type === 'deliver' && x.to === e.hid) || (a && errandReady(a))) return ['!', BRASS]; return !a && S.er.d[e.hid] !== dayKey() ? ['?', '#ffffff'] : null; }
      if (e.kind === 'poi') { const kd = PLACES[e.pk][3]; if (Object.values(S.er.a).some(x => x.type === 'find' && x.at === e.pid && !x.found)) return ['!', BRASS]; return kd === 'tale' || (kd === 'heal' ? S.poi[e.pid] === dayKey() : S.poi[e.pid]) ? null : ['✦', '#ffffff']; } if (e.kind === 'npc') { if (t === 1 && e.i === 0 && (gid() === 'page' || (!gOn() && S.tut === 0))) return ['!', BRASS]; return jobsOf(e).some(x => !S.done[x.id]) ? ['!', '#ffffff'] : null; }
      if (e.kind === 'boss') return S.boss[t] ? null : ['!', '#ff6a4a']; if (e.kind === 'tavern') return !S.rum[RUMORS[t - 1].id] && doneIn(t) >= 5 ? ['?', '#d9b8ff'] : null;
      if (e.kind === 'board') return S.stats.ok >= 4 && !(S.rounds && S.rounds.day === dayKey() && S.rounds.tasks.every(x => x.done)) ? ['!', '#8fe8cf'] : null;
      if (e.kind === 'mon' && e.inst.elite) return ['★', '#f3a53f']; if (e.kind === 'chest' && DG && !DG.done && DG.left <= 0) return ['★', '#f3a53f']; if (e.kind === 'page' && !S.jr[t]) return ['★', BRASS]; if (e.kind === 'corpse') return e.empty ? null : ['✦', BRASS]; if (e.kind === 'guide') return ['…', '#ffffff']; if (e.kind === 'lookout' && gid() === 'tower') return ['!', BRASS]; if ((e.kind === 'dojo' && t === 1 || e.kind === 'odalys') && gid() === 'odalys') return ['!', BRASS]; if (e.kind === 'master') { const d = DJ(t); return d.champ && !d.master ? ['!', BRASS] : !d.met ? ['?', '#ffffff'] : null; } if (e.kind === 'rnote' && !(S.djn || {})[t]) return ['!', '#ffffff']; return null;
    },
    beforeInteract(e) {AMBUSH=backstabReason(e)===null?{e,owner:S,at:Scene.pos()}:null;},
    interact(e) { if (Q || F || DU) return; CE = e; (SH[e.kind] || (() => { }))(e); if (gid() === 'folk' && /^(folk|npc|home|tavern|healer|registrar|stallkeep|shopkeep|banker|rival|casino)$/.test(e.kind) && !(e.kind === 'npc' && e.i === 0)) { S.gd++; save(); gEnter(); } },
    entered(r) { if (S.region === r && S.been[r]) return; S.region = r; S.been[r] = 1; sel = r; save(); },
    sound: (name, detail) => Sound.sfx(name, detail),
    dungeonState: () => DG ? DP.current() : null,
    shipRescued:owner=>{if(owner===S && boatActive() && S.prologue.phase==='rescue')boatAdvance('rescued');},
    moved(x, y, dun, run) { if(S.horse?.mounted&&!Mounts.canRide(mountContext()))S.horse=Mounts.dismount(S.horse); if(Scene.inShip()){S.prologue=Prologue.moved(S.prologue,[x,y]);if(S.prologue.steps%3===0)save();return;} const was=CONCEAL.hidden;Sneaking.move(CONCEAL,x,y,run,1);if(CONCEAL.hidden){for(const e of Scene.ents()){if(e.dead||!['mon','rival','guard','keeper','boss'].includes(e.kind))continue;const d=Math.hypot(e.x-x,e.y-y);if(Sneaking.approach(CONCEAL,{id:e.id||e.name,x:e.x,y:e.y},d)){const g=gain('stealth',diffOf(e.r),.6,true);if(g&&g.after>g.before)toast('Stealth +'+(g.after-g.before).toFixed(1));break;}}}if(was)renderHud(); if(Scene.inInterior()){S.interior=Scene.venueState();if(!interiorSaveTimer){const owner=S;interiorSaveTimer=setTimeout(()=>{interiorSaveTimer=0;if(S===owner && sceneOwner===owner)save();},1500);}} if (dun && DG)DP.moved(x,y); if (gOn()) gMoved(x, y, dun, run); if (!dun && !Scene.inHall() && !Scene.inInterior()) { S.pos = [x, y]; CMap.moved(x,y); if (S.mv % 3 === 0) { S.lairs = S.lairs || {}; for (const L of Scene.sites()) if (L.kind === 'lair' && !S.lairs[L.id] && Math.hypot(L.x - x, L.y - y) < 11) { S.lairs[L.id] = 1; save(); toast(`Found: ${L.name}. It is on your map now.`); coach('lair'); } } } S.mv = (S.mv || 0) + 1; if (S.mv % 5 === 0 && S.hp < maxHp() && !activePursuit()) { heal(1 + Math.floor(rv('healing') / 40), true); renderHud(); } },
    hud(n) { if(boatActive()){const b=$('#ctx');b.hidden=!n||!['walk','arrival'].includes(S.prologue.phase);if(n){b.textContent=n.shipExit?'Step ashore':(n.shipPerson?'Talk: ':'Inspect: ')+n.name;b.setAttribute('aria-label',b.textContent);}return;} const reason=backstabReason(n),rear=n&&reason!=='target'&&CONCEAL.hidden&&Scene.behind(n)&&Scene.sight(n),ambush=reason===null,ob=objective(),k=(n?n.kind+n.name:'')+ob+(F?'f':'')+(rear?'rear':'')+(ambush?'ambush':''); if (k === HOST._k) return; HOST._k = k; const b = $('#ctx'); b.hidden = !n || !!F; if (n) b.textContent = n.kind === 'homeatlas' ? 'Use: Grand Atlas' : ({ venueup: 'Go upstairs: ', venuedown: 'Go downstairs: ', cartographer: 'Maps: ', regionchart: 'Read: ', homeatlas: 'Use: ', atlasdisplay: 'Inspect: ', roadsign: 'Read: ', banker: 'Bank: ', guide: 'Talk: ', lookout: 'Climb: ', dojo: 'Go in: ', hallexit: 'Leave: ', master: 'Talk: ', student: 'Talk: ', sorrel: 'Talk: ', traveler: 'Talk: ', odalys: 'Talk: ', foe: 'Talk: ', dummy: 'Practice: ', bracket: 'Read: ', rnote: 'Read: ', npc: 'Talk: ', folk: 'Talk: ', tavern: 'Talk: ', healer: 'Talk: ', registrar: 'Talk: ', stallkeep: 'Trade: ', shopkeep: 'Trade: ', specialist: 'Trade: ', ferry: 'Talk: ', landmark: 'Inspect: ', rival: 'Approach: ', boss: 'Face: ', mon: 'Engage: ', guard: 'Engage: ', keeper: 'Face: ', dtravel:'Use: ', dcache:'Open: ', dlever:'Use: ', dgate:'Inspect: ', dsecret:'Investigate: ', dlore:'Read: ', ltable:'Take: ', node: 'Gather: ', board: 'Read: ', bench: 'Use: ', stairs: 'Enter: ', chest: 'Open: ', exit: 'Use: ', page: 'Read: ', camp: 'Rest: ', peddler: 'Trade: ', cache: 'Open: ', corpse: 'Loot: ', casino: 'Enter: ', home: 'Talk: ', fish: 'Fish: ', stock: '', poi: (n.sub || 'Look') + ': ' }[n.kind] || '') + n.name; if(n){const label=b.textContent;if(rear)b.textContent=ambush?'Backstab ready':'Behind target';b.setAttribute('aria-label',b.textContent+(rear?' · '+label:''));b.title=label+(rear?' · '+(ambush?'Backstab ready':backstabNotes[backstabReason(n)]||'Approach from behind.'):'');}$('#obj').textContent=ob; }
  };

  function heroTables() {
    const q = s => "'" + String(s).replace(/'/g, "''") + "'"; let x = 'DROP TABLE IF EXISTS my_skills; DROP TABLE IF EXISTS my_bag; DROP TABLE IF EXISTS my_materials; DROP TABLE IF EXISTS bestiary; DROP TABLE IF EXISTS recipes;';
    x += 'CREATE TABLE my_skills (skill TEXT, value REAL, title TEXT, times_used INTEGER); CREATE TABLE my_bag (item TEXT, slot TEXT, rarity TEXT, tier INTEGER, xp_pct INTEGER, gold_pct INTEGER, skill_pct INTEGER, luck_pct INTEGER, equipped INTEGER); CREATE TABLE my_materials (material TEXT, region TEXT, qty INTEGER); CREATE TABLE bestiary (monster TEXT, region TEXT, tier INTEGER, material TEXT, pattern TEXT); CREATE TABLE recipes (recipe TEXT, materials INTEGER, sigils INTEGER, makes TEXT);';
    RPG.forEach(s => { const v = rv(s[0]); x += `INSERT INTO my_skills VALUES (${q(s[1])}, ${v}, ${q(skTitle(v))}, 0);`; });
    S.inv.forEach(i => { x += `INSERT INTO my_bag VALUES (${q(i.name)}, ${q(i.slot)}, ${q(i.rarity)}, ${i.tier || 0}, ${i.stats.xp || i.stats.dmg || 0}, ${i.stats.gold || 0}, ${i.stats.learn || 0}, ${i.stats.luck || 0}, ${S.eq[i.slot] === i.id ? 1 : 0});`; });
    for (let k = 1; k <= 8; k++) x += `INSERT INTO my_materials VALUES (${q(MATS[k])}, ${q(region(k).name)}, ${have(k)});`; x += `INSERT INTO my_materials VALUES ('Brass Sigil', NULL, ${have('sigil')});`;
    BOUNTIES.forEach(b => { x += `INSERT INTO bestiary VALUES (${q(MONSTERS[b.id][0])}, ${q(region(b.r).name)}, ${b.r}, ${q(MATS[b.r])}, ${q(b.title)});`; });
    RECIPES.forEach(r => { x += `INSERT INTO recipes VALUES (${q(r.id === 'scroll' ? 'Hint Key' : r.name)}, ${r.mats}, ${r.sigils}, ${q(r.makes)});`; });
    Engine.sandboxScript(x);
  }
  function atlasHTML(extra) {
    if (!ready) return wait();
    return `<div class="atlas">${Engine.atlas().map(t => `<details><summary>${t.name}<small>${t.count} rows</small></summary><p class="tn">${esc(t.note)}</p><div class="cl">${t.cols.map(c => `<span${c.pk ? ' class="pk"' : ''}>${c.name}${c.pk ? ' (key)' : ''}</span><span>${c.type}</span>`).join('')}</div><div class="row" style="margin-bottom:12px"><button class="btn sm quiet" data-a="peek" data-t="${t.name}">Peek at rows</button></div></details>`).join('')}</div>${extra || ''}<p class="cap2">Keys link the tables: orders.customer_id to customers, order_lines.order_id to orders, order_lines.item_id to items, items.vendor_id to vendors, invoices.order_id to orders, purchase_orders.vendor_id to vendors, po_lines.po_id to purchase_orders, orders.rep_id and customers.rep_id to employees, employees.manager_id to employees. The closing date on this teaching copy is ${World.TODAY}.</p>`;
  }
  function vLedger() {
    let h = `<section class="place"><p class="eyebrow">Free play</p><h1>The Great Ledger ${qm('ledger')}</h1></section><div class="seg">${(S.letter || Object.keys(S.tabs || {}).length ? [['lost', 'Lost tables']] : []).concat([['sandbox', 'Sandbox'], ['atlas', 'Tables'], ['grimoire', 'Lessons']]).map(x => `<button data-a="lsub" data-s="${x[0]}" aria-pressed="${lsub === x[0]}">${x[1]}</button>`).join('')}</div>`;
    if (lsub === 'sandbox') h += `<div class="editor"><label for="con-sql" class="vh">Sandbox SQL</label><textarea id="con-sql" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="SELECT * FROM bestiary"></textarea><div class="keys tabs"><span class="lab">try</span>${['SELECT * FROM my_skills ORDER BY value DESC', 'SELECT * FROM bestiary', 'SELECT * FROM my_bag', 'SELECT * FROM my_materials', 'SELECT * FROM recipes'].map(q => `<button data-a="conq" data-q="${esc(q)}">${q.split(' ')[3]}</button>`).join('')}</div><div class="runrow"><button class="btn quiet sm" data-a="conreset">Reset copy</button><button class="run" data-a="conrun"${ready ? '' : ' disabled'}>Run</button></div></div><div id="con-out" style="display:flex;flex-direction:column;gap:10px">${con.res ? conHTML(con.res) : '<p class="cap2">Besides the nine tables of the Ledger, the sandbox holds your own data as tables: my_skills, my_bag, my_materials, bestiary and recipes. Plan your farming with a query.</p>'}</div>`;
    else if (lsub === 'atlas') h += atlasHTML();
    else if (lsub === 'lost') h += lostHTML();
    else {const known=Learning.CONCEPTS.filter(c=>learningState().introduced[c.id]);
      h+='<section class="sec"><h2>Start with the basics</h2><p>Revisit the Marigold’s practice manifest: tables, rows, columns, and your first query.</p><button class="btn" data-a="reviewintro">First SQL lesson</button></section>';
      h+=`<section class="sec"><h2>Your technique notes</h2><p>Lessons you meet in the dojo, town exercises and the world are kept here. Help remains available when you return.</p>${learningSummary(here())}${known.length?known.map(c=>conceptHTML(c.id)).join(''):'<p>No techniques introduced yet. Odalys will help you get started in Tallyport.</p>'}<button class="btn" data-a="learninghub" data-r="${here()}">This town’s specialists</button></section>`;
    }
    return h;
  }
  const conHTML = r => r.err ? `<div class="verdict err"><p>${esc(r.err)}</p></div>` : (r.note ? `<div class="verdict good"><p>${esc(r.note)}</p></div>` : tableHTML(r, 60));
  const bookHTML = () => (combatView()?'<button class="btn solid" data-a="combatbook">Technique Book</button>':'')+Object.keys(BOOKS).filter(b=>!combatView()||!['arms','spell'].includes(b)).map(b => { const B = BOOKS[b], mine = PAGES.filter(p => p.book === b); return `<details class="lesson book"><summary><span>${B.name} <small>${mine.filter(p => owned(p.id)).length} / ${mine.length}</small></span></summary><div class="lb"><p class="cap2">${esc(B.what)}.</p><ul class="pglist">${mine.map(p => `<li class="${owned(p.id) ? 'has' : ''}${p.rare ? ' rare' : ''}"><b>${owned(p.id) || !p.rare ? esc(p.name) : 'Unknown page'}</b><small>${CIRCLE[p.c]} Circle${p.rare ? ' · rare' : ''}</small><span>${owned(p.id) ? (p.note || 'In your book') : S.scr[p.id] ? 'The scroll is in your bag' : esc(p.src)}</span></li>`).join('')}</ul></div></details>`; }).join('');
  /* ---------- how you look: body, hair, beard, head gear, clothes and dye; armour and weapon come from what you wear ---------- */
  const HAIRS = ['Short and neat', 'Shaggy', 'Long', 'Ponytail', 'Cropped', 'Curly', 'Long and straight', 'One braid', 'Wavy', 'Short crop', 'Bun', 'Two braids'];
  const BEARDS = ['Short beard', 'Long beard', 'Goatee', 'Moustache', 'Boxed beard', 'Stubble'], HATS = ['Leather cap', 'Mail coif', 'Helmet', 'Hood', 'Wizard’s hat', 'Circlet'];
  const HAIRC = [['#1a1412', '#5c4a3e'], ['#2e1c10', '#8f5e34'], ['#3c1608', '#c4602c'], ['#5c4418', '#ecd08a'], ['#3e3e3e', '#cfcfcf'], ['#8c8c8c', '#ffffff'], ['#4a2c14', '#bc8c56']], HAIRCN = ['Black', 'Brown', 'Auburn', 'Blond', 'Grey', 'White', 'Light brown'];
  // rare dyes: found, never bought. Iridescent ones shift colour as you move; glowing ones give off light.
  const SPECIAL = [{ id: 'iri', n: 'Iridescent', base: '#d8d4f0', k: 'iri' }, { id: 'pearl', n: 'Pearl shimmer', base: '#f2eef8', k: 'iri', soft: 1 }, { id: 'ember', n: 'Ember glow', base: '#c8501e', k: 'glow', c: '#ff7a2a' }, { id: 'frost', n: 'Frost glow', base: '#5aa8d8', k: 'glow', c: '#8fe0ff' },
    { id: 'witch', n: 'Witchlight', base: '#3e9a4a', k: 'glow', c: '#7dff8a' }, { id: 'void', n: 'Voidblack', base: '#221a2c', k: 'glow', c: '#a070ff' }, { id: 'gold', n: 'Cloth of gold', base: '#e0b84a' }];
  const spec = id => SPECIAL.find(x => x.id === id);
  function maybeDye(p) { if (rnd() >= p) return; S.dyeU = S.dyeU || []; const left = SPECIAL.filter(x => !S.dyeU.includes(x.id)); if (!left.length) return; const d = pick(left); S.dyeU.push(d.id); save();
    toast(`Found ${d.n} dye. Use it from Hero → Appearance.`); }
  const DYES = [null, '#b23a2e', '#3a5aa8', '#3e7a40', '#6a3e8a', '#3c3c40', '#7a5232', '#c89a3a', '#2a3a6a'], DYEN = ['Undyed', 'Red', 'Blue', 'Green', 'Purple', 'Black', 'Brown', 'Gold', 'Navy'];
  // where each of the eight old heroes lands: [hair, colour, beard, hat]
  const LOOKAPP = { warrior: [[0, 1, -1, -1], [7, 3, -1, -1]], thief: [[1, 0, 5, 3], [6, 0, -1, -1]], mage: [[2, 5, 1, 4], [8, 0, -1, -1]], crafter: [[-1, 1, 0, -1], [6, 2, -1, -1]] };
  function look0() { const lk = S.look != null ? S.look : 0, d = (LOOKAPP[S.path] || LOOKAPP.warrior)[lk % 2]; return { body: lk % 2, build:0,skin: 1, hair: d[0], hc: d[1], beard: d[2], hat: d[3], wear: S.path === 'mage' ? 1 : 0, dye: S.path === 'mage' ? (lk % 2 ? 4 : 2) : 0 }; }
  function normalizeHeadStyle(L){const styles=HeadPortraits.styles(L.body),style=styles.find(p=>p.id===L.headStyle)||styles.find(p=>p.id===HeadPortraits.match(L.body,L.hair,L.beard))||styles[0];L.headStyle=style.id;L.hair=style.hair;L.beard=style.beard;return L;}
  const myLook=()=>normalizeHeadStyle(S.app=ActorRig.normalizeLook(S.app,look0()));
  const WPN = { swords: [0, 1, 1, 2], fencing: [14, 15, 0, 1], archery: [25, 26, 26, 27], magery: [9, 8, 10, 12] }, SHD = [20, 22, 21, 21];
  function appNow() {
    if (!S || !S.path) return null; const L = myLook(), arm = itemById(S.eq.armor), wp = itemById(S.eq.weapon), sh = itemById(S.eq.shield), hd = itemById(S.eq.head), hn = itemById(S.eq.hands),ft=itemById(S.eq.feet),cl=itemById(S.eq.cloak),ri=itemById(S.eq.ring),ch=itemById(S.eq.charm),re=itemById(S.eq.relic);
    const armorName=arm?.equipment?.baseName||arm?.name||'',outfit = arm ? (/Robe/.test(armorName)?1:/Leather/.test(armorName) ? 2 : /Chain/.test(armorName) ? 3 : 4) : L.wear, g = it => GRADE[it.equipment?.baseRarity||it.rarity] || 0;
    const metal = arm ? [null, null, '#b8c8dc', '#d8b048', '#e0b84a'][RAR.indexOf(arm.rarity)] : null, sp = typeof L.dye === 'string' ? spec(L.dye) : null;
    let wi = -1, wk = '', st = 'swing';
    if (wp) { const V = wp.v != null && WV.find(x => x.v === wp.v); if (V) { wi = V.v; wk = V.k; st = V.s; } else { const ix = (WN[wp.w] || []).findIndex(n => wp.name.indexOf(n) >= 0); wi = (WPN[wp.w] || WPN.swords)[Math.min(3, ix < 0 ? g(wp) : ix)]; wk = wp.w === 'magery' ? 'staff' : wp.w === 'archery' ? 'bow' : wi === 2 ? 'long' : wi === 14 || wi === 15 ? 'dagger' : 'sword'; st = wp.w === 'magery' ? 'cast' : wp.w === 'swords' ? 'swing' : 'thrust'; } }
    const wg = L.wglow && spec(L.wglow), hat = hd ? HATK(hd.name) : L.hat;
    return { combo: L.body * 5 + outfit + 1, build:L.build,armorGear:/Knight/.test(armorName)?'armor-knights-plate':null,skin: L.skin ?? 1, cloth: sp ? sp.base : DYES[L.dye] || null, fx: sp && sp.k ? { k: sp.k, c: sp.c || null, soft: sp.soft || 0 } : null, metal,armorMaterial:EquipmentRules.materialOf(arm),headMaterial:EquipmentRules.materialOf(hd),handMaterial:EquipmentRules.materialOf(hn),footMaterial:EquipmentRules.materialOf(ft),cloakMaterial:EquipmentRules.materialOf(cl||re),gear:PaintedGear.resolve({weapon:wp,shield:sh,head:hd,hands:hn,feet:ft,cloak:cl,ring:ri,charm:ch,relic:re,wpn:wi,hat}),weaponMaterial:EquipmentRules.materialOf(wp),shieldMaterial:EquipmentRules.materialOf(sh),hc: HAIRC[L.hc] || HAIRC[1], hair:L.hair,beard:L.beard,headStyle:L.headStyle,hat,
      wpn: wi, wkind: wk, style: st, glow: wg ? wg.c || '#e0d8ff' : wp?.equipment?.enchantment?({embers:'#e89143',power:'#83b8dd',slaying:'#d2d8c2',focus:'#b49bd4',precision:'#a8b77c'}[wp.equipment.enchantment.id]||null):null, shield: sh ? (sh.off != null ? sh.off : SHD[Math.min(3, g(sh))]) : -1, gl: hn && /Thief/.test(hn.name) ? 1 : 0 };
  }
  let APPK = '', APPV = null; const app = () => { const a = appNow(), k = JSON.stringify(a); if (k !== APPK) { APPK = k; APPV = a; } return APPV; };
  const dollHTML = () => ART && ArtData.body ? `<section class="sec dollsec"><canvas id="doll" width="300" height="450" aria-label="Your character"></canvas><div class="row end"><button class="btn sm quiet" data-a="looks">Appearance</button></div></section>` : '';
  const paintDoll = () => setTimeout(() => ['#doll', '#doll2'].forEach(q => { const cv = $(q); if (cv && sceneUp) Scene.drawDoll(cv, app()); }), 0);
  // the barber, tailor and dyer charge once your first day is done
  const LOOKC = { body: 250, build:250,skin: 0, hair: 30, hc: 20, beard: 20, hat: 15, wear: 10, dye: 25, wglow: 0 }, lookCost = k => boatActive()||gOn() ? 0 : LOOKC[k] || 0, lc$ = k => lookCost(k) ? ` <small>${lookCost(k)} gold</small>` : '';
  function looksSheet() {
    const L = myLook(), opt = (k, v, t, on) => `<button class="chip${on ? ' on' : ''}" data-a="lookset" data-k="${k}" data-v="${v}">${esc(t)}</button>`;
    sheet(`<p class="eyebrow">The barber, the tailor and the dyer</p><h2>Appearance</h2><canvas id="doll2" class="dollbig" width="300" height="450"></canvas>
      <h3>Body${lc$('body')}</h3><div class="chips">${opt('body', 0, 'Man', L.body === 0)}${opt('body', 1, 'Woman', L.body === 1)}</div>
      <h3>Build${lc$('build')}</h3><div class="chips">${CharacterProfiles.labels.map((n,i)=>opt('build',i,n,L.build===i)).join('')}</div>
      <h3>Skin tone</h3><div class="chips">${SKINN.map((n,i)=>opt('skin',i,n,(L.skin??1)===i)).join('')}</div>
      <h3>Complete head style${lc$('hair')}</h3><div class="head-style-grid">${HeadPortraits.styles(L.body).map(p=>`<button class="head-style-choice${p.id===L.headStyle?' on':''}" data-a="headstyle" data-id="${p.id}" aria-pressed="${p.id===L.headStyle}"><canvas width="96" height="112" data-head-style="${p.id}" aria-hidden="true"></canvas><span>${esc(p.name)}</span></button>`).join('')}</div>
      <h3>Hair colour${lc$('hc')}</h3><div class="chips">${HAIRCN.map((n, i) => opt('hc', i, n, L.hc === i)).join('')}</div>

      <h3>Head${lc$('hat')}</h3><div class="chips">${opt('hat', -1, 'Nothing', L.hat < 0)}${HATS.map((n, i) => opt('hat', i, n, L.hat === i)).join('')}</div>
      <h3>Clothes without armour${lc$('wear')}</h3><div class="chips">${opt('wear', 0, 'Tunic', L.wear === 0)}${opt('wear', 1, 'Robe', L.wear === 1)}</div>
      <h3>Dye${lc$('dye')}</h3><div class="chips">${DYEN.map((n, i) => opt('dye', i, n, L.dye === i)).join('')}${(S.dyeU || []).map(id => opt('dye', id, spec(id).n + ' ✦', L.dye === id)).join('')}</div>
      ${(S.dyeU || []).some(id => spec(id).k === 'glow') ? `<h3>Weapon glow</h3><div class="chips">${opt('wglow', '', 'By rarity', !L.wglow)}${S.dyeU.filter(id => spec(id).k === 'glow').map(id => opt('wglow', id, spec(id).n, L.wglow === id)).join('')}</div>` : ''}
      ${S.dyeU && S.dyeU.length ? '' : '<p class="cap2">Rare dyes turn up now and then on creatures, in vault chests and on keepers and examiners.</p>'}
      <div class="row end"><button class="btn solid" data-a="closesheet">Done</button></div>`);
    paintDoll();const owner=S;HeadPortraits.preload(L.body,L.headStyle).then(()=>{if(owner!==S)return;for(const cv of document.querySelectorAll('canvas[data-head-style]'))HeadPortraits.draw(cv.getContext('2d'),{body:L.body,style:cv.dataset.headStyle,skin:L.skin,hc:HAIRC[L.hc]},[12,48,38]);});
  }
  const modeName = m => ({up:'↑ Raise',down:'↓ Lower',lock:'Locked'})[m];
  function progressRow(id,name,note,stat=false) {const v=stat?S.attr[id]:rv(id),cp=stat?100:skCap(id),m=Progression.mode(S,id,stat),target=(stat?S.attrTargets:S.skillTargets)[id];return `<li><span class="nm"><b>${name}</b><small>${esc(note)}</small></span><span class="val">${v.toFixed(1)}<small>${stat?'':skTitle(v)+' · cap '+cp}</small></span><div class="progress-controls"><button class="btn sm quiet" data-a="progressmode" data-id="${id}" data-stat="${stat?1:0}" aria-label="${name}: ${modeName(m)}">${modeName(m)}</button><label>Stop at <input type="number" min="${stat?10:0}" max="${cp}" step="0.1" value="${target==null?'':target}" placeholder="${cp}" aria-label="${name} stop target" data-target="${id}" data-stat="${stat?1:0}"></label><button class="btn sm quiet" data-a="progresstarget" data-id="${id}" data-stat="${stat?1:0}">Set</button></div><span class="bar"><i style="width:${Math.min(100,v/cp*100)}%"></i></span></li>`;}
  function progressPanel() {return `<section class="sec"><h2>Attributes <small>${Progression.statTotal(S).toFixed(1)} / 225</small></h2><p class="note">Strength sets health and physical power. Dexterity supplies stamina for maneuvers. Intelligence supplies mana for magic. Practice trains related attributes, including when a skill reaches its cap.</p><ul class="skills">${[['str','Strength','Health and physical power.'],['dex','Dexterity','Stamina and shield efficiency.'],['int','Intelligence','Mana and spell power.']].map(x=>progressRow(...x,true)).join('')}</ul><p>Mana ${Math.round(S.mana)} / ${Progression.maxMana(S)} · Stamina ${Math.round(S.stamina)} / ${maxStamina()}</p></section><section class="sec"><h2>Skills <small>${total().toFixed(1)} / ${CAP}</small></h2><p class="note">Raise learns through use. Lower releases points only when another skill needs room at the shared cap, starting with the highest skill set to Lower. Locked preserves its value. All three settings allow you to use the skill. Set a stopping target to lock automatically; leave it blank to clear the target. No skills decay while you are away.</p><ul class="skills">${RPG.map(x=>progressRow(...x)).join('')}</ul><p class="note">Skills improve fastest near their difficulty. The last ten points to Grandmaster take the longest. SQL techniques below have their own learning record.</p>${scrollsHTML()}</section>`;}
  function vHero() {
    if(boatActive()){paintDoll();return `<section class="place"><p class="eyebrow">${esc(PATHS.find(p=>p.id===S.path)?.name||'New arrival')} · health ${S.hp} / ${maxHp()}</p><h1>${esc(S.name)}</h1></section>${dollHTML()}<section class="sec"><h2>Your starting skills</h2><ul class="tale plain">${RPG.filter(([id])=>rv(id)>0).map(([id,name])=>`<li>${esc(name)} · ${rv(id).toFixed(1)}</li>`).join('')}</ul><p>Mana ${Math.round(S.mana)} / ${Progression.maxMana(S)} · Stamina ${Math.round(S.stamina)} / ${maxStamina()}. Skills improve through use. Detailed skill controls and your records will remain here ashore.</p></section>`;}
    const p = PATHS.find(x => x.id === S.path), acc = S.stats.q ? Math.round(100 * S.stats.ok / S.stats.q) : 0, w = armsSkill();
    paintDoll(); return `${savePanel()}${Offline.html()}<div class="character-return"><p class="eyebrow">World ${A.world+1} · ${isMain()?'Main character':'Supporting character'}</p><button class="btn solid" data-a="reset">Return to characters</button></div><section class="place"><p class="eyebrow">${p ? p.name : 'No path chosen'} · health ${S.hp} / ${maxHp()}</p><h1>${rankName()}</h1></section>${dollHTML()}
      <section class="sec"><h2>Horse</h2><p>${S.horse?.owned?'Your bay riding horse travels 70% faster than running. Mount outdoors when you are clear of danger.':'Stablekeepers sell riding horses for '+Mounts.PRICE+' gold.'}</p>${S.horse?.owned?'<button class="btn solid" data-a="mounttoggle">'+(mounted()?'Dismount':'Mount horse')+'</button>':''}</section><section class="sec"><h2>Books ${qm('hero')}</h2>${bookHTML()}</section>
      ${progressPanel()}
      <details class="lesson"><summary>SQL skills</summary><div class="lb"><ul class="skills">${SKILLS.map(s => { const v = S.skills[s.id] || { v: 0 }; return `<li><span class="nm"><b>${s.name}</b> ${rusty(s.id) ? '<span class="pill rust">rusty</span>' : ''}<small>${esc(s.what)}</small></span><span class="val">${v.v.toFixed(1)}</span><span class="bar"><i style="width:${v.v}%"></i></span></li>`; }).join('')}</ul><p class="cap2">Tracked in the background. Rusty skills come back in the daily drills.</p></div></details>
      <details class="lesson"><summary>Commands learned · ${Object.keys(CMDS).filter(k => cmdSet()[k] === 2).length} of ${Object.keys(CMDS).length}</summary><div class="lb"><ul class="skills">${Object.keys(CMDS).map(k => `<li><span class="nm"><b>${cmdSet()[k] === 2 ? esc(cmdTitle(k)) : cmdSet()[k] ? esc(cmdTitle(k)) + ' <small>taught, not used yet</small>' : '?'}</b></span><span class="val">${cmdSet()[k] === 2 ? '✓' : ''}</span></li>`).join('')}</ul><p class="cap2">A command joins the Commands panel when its lesson opens. Using it correctly once earns a Hint Key.</p></div></details>
      ${djTokens()}<section class="sec"><h2>Worn gear</h2><div class="grid doll">${SLOTS.map(s => { const it = itemById(S.eq[s]); return it ? `<button class="cell rar-${it.rarity}" data-a="item" data-id="${it.id}" aria-label="${esc(it.name)}">${itemIcon(it)}<em>${s}</em></button>` : `<span class="cell empty"><em>${s}</em></span>`; }).join('')}</div><div class="kv" style="margin-top:12px"><span>Book of Arms uses</span><span>${rpgName(w)}</span><span>Damage with it</span><span>+${dmgPct(w)}%</span><span>Defence</span><span>${Math.min(60, bonus('def'))}%</span><span>Gold bonus</span><span>+${bonus('gold')}%</span><span>Skill gain bonus</span><span>+${learnPct()}%</span><span>Luck (with streak ${S.streak})</span><span>+${luck()}%</span></div></section>
      <section class="sec"><h2>Record</h2><div class="kv" style="margin-top:10px"><span>Queries run</span><span>${S.stats.q}</span><span>Correct</span><span>${S.stats.ok} (${acc}%)</span><span>Exercises</span><span>${Object.keys(S.done).length} / ${CONTRACTS.length}</span><span>Marks</span><span>${Object.keys(S.boss).length} / 8</span><span>Journal pages</span><span>${Object.keys(S.jr).length} / 8</span><span>Creatures</span><span>${S.stats.kills}</span><span>Thefts</span><span>${S.stats.steals}</span><span>Dungeon chests</span><span>${S.stats.dungeons}</span><span>Times fallen</span><span>${S.stats.falls}</span><span>Best streak</span><span>${S.best}</span></div></section>
      <section class="sec"><h2>Sound</h2><p class="note">Music follows towns, wilderness, dungeons and fights. If you hear nothing, tap the screen once and check your device volume.</p><div class="row" style="margin-top:10px"><button class="btn sm quiet" data-a="snd" data-k="mu">Music: ${Sound.pref().mu ? 'on' : 'off'}</button><button class="btn sm quiet" data-a="snd" data-k="fx">Effects: ${Sound.pref().fx ? 'on' : 'off'}</button></div></section>
      <section class="sec"><h2>Save codes</h2><p class="note">You can also copy a code to restore all three worlds through Load save above.</p><button class="btn sm quiet" data-a="export">Save code</button></section>`;
  }
  function vBag() {
    const order = it => -RAR.indexOf(it.rarity) * 100 - Object.values(it.stats).reduce((a, b) => a + b, 0), inv = S.inv.slice().sort((a, b) => order(a) - order(b)), sc = Object.keys(S.scr);
    return `<section class="place"><p class="eyebrow">${S.inv.length} / 60 items</p><h1>Bag ${qm('bag')}</h1></section>
      ${sc.length ? `<section class="sec"><h2>Scrolls</h2>` : ''}${sc.length ? `<div class="grid">${sc.map(id => { const p = pageById(id); return `<button class="cell rar-${p.rare ? 'epic' : 'uncommon'}" data-a="scroll" data-id="${id}" aria-label="${esc(p.name)}">${ico('scroll', S.scr[id] > 1 ? S.scr[id] : null)}</button>`; }).join('')}</div>` : ''}${sc.length ? '</section>' : ''}
      <section class="sec"><h2>Supplies</h2><p>You have ${S.bandages||0} bandages for combat. Food restores health while resting; a draught costs one response during combat.</p><div class="supplies">${[{k:'tonic',n:S.tonics,name:'Healing Draught',hp:30,ic:'draught'}, ...Object.keys(FOOD).filter(k => foodN(k)>0).map(k=>({k,n:foodN(k),name:FOOD[k][0],hp:FOOD[k][1],ic:FOOD[k][2]}))].map(x=>`<button class="supply" data-a="supply" data-k="${x.k}">${ico(x.ic)}<span><b>${esc(x.name)} ×${x.n}</b><small>Restores ${x.hp} health${S.hp>=maxHp()?' · Health is full':''}</small></span></button>`).join('')}</div><div class="grid">${have('hide') ? `<span class="cell" title="Hide">${ico('pelt', have('hide'))}</span>` : ''}<button class="cell supply-counter" data-a="supplyinfo" data-k="keys">${ico('hintkey', S.hints)}<span class="supply-count-name">Hint Keys</span></button><button class="cell supply-counter" data-a="supplyinfo" data-k="sigils">${ico('sigil', have('sigil'))}<span class="supply-count-name">Brass Sigils</span></button>${[1,2,3,4,5,6,7,8].filter(k=>have(k)).map(k=>`<button class="cell supply-counter" data-a="supplyinfo" data-k="${k}">${ico('mat'+k,have(k))}<span class="supply-count-name">${esc(MATS[k])}</span></button>`).join('')}</div></section>
      ${(S.deeds || []).length ? `<section class="sec"><h2>Deeds</h2><ul class="goods">${S.deeds.map((d, k) => `<li class="good">${ico('deed')}<div><b>${esc(HMAT[d.mat][0])} ${esc(lc(HOUSES[d.shape][0]))}</b><small>${HOUSES[d.shape][1]} × ${HOUSES[d.shape][2]}</small></div><button class="btn sm" data-a="placedeed" data-k="${k}">Set it down</button></li>`).join('')}</ul></section>` : ''}
      <section class="sec"><h2>Gear <small>tap a piece</small></h2>${inv.length ? `<div class="grid">${inv.map(it => `<button class="cell rar-${it.rarity}${S.eq[it.slot] === it.id ? ' worn' : ''}" data-a="item" data-id="${it.id}" aria-label="${esc(it.name)}">${itemIcon(it)}</button>`).join('')}</div><p class="cap2">To sell gear, visit a stallkeeper or travelling trader and choose Sell goods.</p>` : '<p class="note">Nothing yet. Creatures, dungeons and the workbench are where gear comes from.</p>'}</section>
      <section class="sec"><h2>Named rares <small>${Object.keys(S.codex).length} / ${UNIQUES.length}</small></h2><div class="grid">${UNIQUES.map((u, i) => S.codex[u.id] ? `<span class="cell rar-${u.rarity}" title="${esc(u.name)}">${ico('u' + (i + 1))}</span>` : `<span class="cell unk" title="${esc(u.src)}">?</span>`).join('')}</div></section>`;
  }

  /* ---------- sound: what plays where (see src/audio.js) ---------- */
  function soundUp() {
    Sound.init(() => {
      if (!$('#title').hidden) return { title: true };
      if (!sceneUp || !S || !S.path) return null;
      const c = Scene.musicContext(); if (!c) return null;
      c.fight = !!(F && F.act === 'fight' && !F.over); c.boss = !!(F && F.boss);
      const talking = !$('#say').hidden || (!$('#sheet').hidden && !!$('#sheet .shop-head'));
      if (PK || WH || BJ || (talking && CE && CE.kind === 'casino')) c.venue = 'cards';
      else if (talking && CE && CE.kind === 'tavern') c.venue = 'tavern';
      return c;
    });
    const g = Engine.grade; Engine.grade = (t, q) => { const r = g(t, q); if (r && !r.err && r.grade) Sound.sfx(r.grade); return r; };
    const X = Scene.FX, sw = X.swing;
    X.swing = (a, b, kind, style) => {
      if (a === 'me') { if (kind === 'hit') kind = armsSkill(); if (kind === 'spell' && !style) style = Effects.spell(DU ? DU.c || DU.r : F && F.page ? F.page.c : 1, F && F.page && F.page.rare); }
      else if (kind === 'hit') { const family = Effects.creature(a && a.name); if(a && a.inst && a.inst.dungeon && a.inst.role==='caster'){kind='spell';style=Effects.spell(a.r || 6);} else if (family === 'spirit' || family === 'dragon') { kind = 'spell'; style = Effects.spell(family === 'dragon' ? 5 : a.r || 6); } else if (family === 'bow') kind = 'archery'; }
      return sw(a, b, kind, style);
    };
    for (const k of Object.keys(ACT).filter(k => /^(buy|sell)|^(bdep|bwd)$/.test(k))) { const fn = ACT[k]; ACT[k] = (...args) => { const gold = S.gold, result = fn(...args); if (S.gold !== gold) Sound.sfx('coins'); return result; }; }
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.btn')) Sound.sfx('click'); }, true);
  }


  let pendingSale=null;
  function saleVendor(vendor=CE) {
    return tab==='world'&&!Q&&!F&&!DU&&sceneUp&&vendor&&['stallkeep','peddler'].includes(vendor.kind)&&Scene.find(e=>e===vendor)&&Number.isFinite(Scene.debug().interactionDistance(vendor)) ? vendor : null;
  }
  function saleChoices() {
    pendingSale=null;
    const vendor=saleVendor();if(!vendor)return toast('Visit a stallkeeper or travelling trader to sell goods.');
    const worn=new Set(Object.values(S.eq)),items=S.inv.filter(it=>!it.unique&&!worn.has(it.id)),hides=have('hide'),scrolls=Object.keys(S.scr).filter(id=>S.scr[id]>0&&owned(id)).map(pageById);
    sheet(`<p class="eyebrow">${esc(vendor.name)}</p><h2>Choose goods to sell</h2><p>Choose a piece to review its sale. Equipped gear is kept.</p><ul class="goods">${items.map(it=>goodHTML({item:it,name:it.name,meta:it.rarity+' · '+it.slot,price:worth(it)+' gold',a:'sellpick',d:{id:it.id}})).join('')}${scrolls.map(p=>goodHTML({ic:'scroll',name:p.name+' scroll',meta:'Already learned · '+S.scr[p.id]+' spare',price:20*p.c+' gold each',a:'sellpick',d:{id:'scroll:'+p.id}})).join('')}${hides?goodHTML({ic:'pelt',name:'Hides ×'+hides,meta:'Sell your hides for 3 gold each.',price:hides*3+' gold',a:'sellpick',d:{id:'hides'}}):''}</ul>${items.some(it=>it.rarity==='common')?'<button class="btn quiet" data-a="sellallcommon">Review all unworn common gear</button>':''}${!items.length&&!hides&&!scrolls.length?'<p>There is nothing to sell. Your equipped gear stays with you.</p>':''}<button class="btn quiet" data-a="closesheet">Done</button>`);
  }
  function previewCommonSale(id) {
    const vendor=saleVendor();if(!vendor)return toast('Visit a stallkeeper or travelling trader to sell goods.');
    const worn=new Set(Object.values(S.eq)),items=S.inv.filter(it=>!it.unique&&!worn.has(it.id)&&(id?it.id===id:it.rarity==='common')),hides=id==='hides'?have('hide'):0,scroll=id?.startsWith('scroll:')?pageById(id.slice(7)):null;
    if(scroll&&(!owned(scroll.id)||!S.scr[scroll.id]))return saleChoices();
    const gold=items.reduce((n,it)=>n+worth(it),0)+hides*3+(scroll?20*scroll.c:0);
    if(!items.length&&!hides&&!scroll)return saleChoices();
    pendingSale={owner:S,world:A.world,vendor,ids:items.map(it=>it.id),hides,scroll:scroll?.id,gold};
    sheet(`<h2>Review this sale</h2><p>You are selling to ${esc(vendor.name)}. Only the goods listed below will be sold.</p><ul class="tale plain">${items.map(it=>`<li>${esc(it.name)} · ${worth(it)} gold</li>`).join('')}${hides?`<li>Hides ×${hides} · ${hides*3} gold</li>`:''}${scroll?`<li>${esc(scroll.name)} scroll ×1 · ${20*scroll.c} gold</li>`:''}</ul><p>Total: ${gold} gold.</p><button class="btn solid" data-a="sellconfirm">Sell for ${gold} gold</button><button class="btn quiet" data-a="sellcommon">Choose different goods</button><button class="btn quiet" data-a="closesheet">Keep my items</button>`);
  }
  function confirmCommonSale() {
    const sale=pendingSale;pendingSale=null;if(!sale||sale.owner!==S||sale.world!==A.world||CE!==sale.vendor||!saleVendor(sale.vendor))return;
    const worn=new Set(Object.values(S.eq)),items=S.inv.filter(it=>sale.ids.includes(it.id)&&!it.unique&&!worn.has(it.id)),scroll=sale.scroll&&pageById(sale.scroll);
    if(sale.scroll&&(!scroll||!owned(scroll.id)||!S.scr[scroll.id]))return saleChoices();
    if(items.length!==sale.ids.length||have('hide')<sale.hides||items.reduce((n,it)=>n+worth(it),0)+sale.hides*3+(scroll?20*scroll.c:0)!==sale.gold)return saleChoices();
    S.inv=S.inv.filter(it=>!sale.ids.includes(it.id));S.mats.hide=have('hide')-sale.hides;if(scroll){S.scr[scroll.id]--;if(!S.scr[scroll.id])delete S.scr[scroll.id];}S.gold+=sale.gold;save();renderHud();closeSheet();render();toast(`Sold for ${sale.gold} gold`);if(gid()==='sell'&&items.length)gDone('sell');
  }

  /* ---------- actions ---------- */
  const ACT = {
    combatbegin:d=>{if(d.id&&combatView())Combat.begin(d.id);renderCombatUI(true);},
    combatback:()=>{stashFightDraft();if(combatView())Combat.cancel();renderCombatUI(true);fitPanel();},
    combatbook:openTechniqueBook,
    techniqueslot:d=>{techniqueSlot=Math.max(0,Math.min(3,+d.slot||0));openTechniqueBook();},
    techniquefilter:d=>{if(['all','swords','fencing','archery','magery'].includes(d.id))techniqueFilter=d.id;openTechniqueBook();},
    combatequip:d=>{if(combatView()){const result=Combat.equip(d.id||null,+d.slot);if(result?.ok)openTechniqueBook();}},
    combatsupply:d=>{if(combatView()){Combat.setSupply(d.id);openTechniqueBook();}},
    combatdetails:()=>{if(F?.live&&F.res)sheet('<h2>Last action</h2><p>'+esc(F.pline||GRADE_N[F.res.grade])+'</p>'+QueryFeedback.html(F.comparison,{power:F.queryPower,open:true})+F.after.replace(/<div class="row end">[\s\S]*<\/div>$/,''));},
    queryhelp:()=>{if(F)F.readinessHelp=true;kbView('help');},
    ...CMap.actions,
    snd: d => { const p = Sound.pref(); if (d.k === 'mu') Sound.setMu(!p.mu); else Sound.setFx(!p.fx); render(); },
    tab: d => { if (F || Q || DU || !NAV.some(t=>t[0]===d.t)) return; if(tab==='ledger'&&$('#con-sql'))con.sql=$('#con-sql').value;if(boatActive()){S.prologue=Prologue.viewed(S.prologue,d.t);save();}tab = d.t;if(boatActive()&&tab==='ledger')lsub='grimoire'; if (tab === 'map') sel = S.region; closeSheet(); render(); $('#view').scrollTop = 0; },
    sketch: () => sheet(`<h2>Tamsin's sketch</h2>${boatChart()}<p>This rough chart helped you find Tallyport. Your Map records the ground and landmarks you actually discover. It does not grant a survey or fast travel.</p>`),
    learninghub: d => learningHub(+d.r||here()), learnspecialist:d=>specialistMenu(+d.r,d.id), learnconcept:d=>learnConcept(d), learnpractice:d=>learningPractice(d), learnshow:()=>learningHelp(true), learnnext:()=>{if(Q?.kind==='learning'){if(Q.boutDone)Q.practiceScore=[0,0];learningPractice({r:Q.r,spec:Q.specialist,continue:true});}},
    sub: d => { sub = d.s; render(); }, lsub: d => { lsub = d.s; render(); }, sel: d => { sel = +d.r; render(); },
    ferryboard: boardFerry,
    travel: d => CMap.actions.cmaptravel({ id: 'town' + (+d.r) }),
    journal: () => { if (!F) SH.journal(); }, act: () => Scene.act(), talk: () => CE && SH[CE.kind](CE), shop: () => CE && SH.stallkeep(CE), chat: () => { const e = CE; if (!e) return; closeSheet(); dlg(e, pick(e.kind === 'tavern' ? GOSSIP.concat(TALK.hint) : TALK.bark.concat(TALK.hint)), [{ t: 'Back to the goods', a: 'talk' }, bye]); },
    supply: d => { const tonic = d.k === 'tonic', k = tonic ? null : d.k, f = tonic ? ['Healing Draught',30,'draught'] : FOOD[k]; if (!f) return; const n = tonic ? S.tonics : foodN(k), full = S.hp >= maxHp(), busy = F && (F.busy || F.over); sheet(`<h2>${esc(f[0])}</h2><div class="supply-detail">${ico(f[2])}<p>You have ${n}. Restores up to ${f[1]} health.</p></div><p>${full ? 'Health is full. You can save this for later.' : busy ? 'Wait until the current combat action has finished.' : n<1 ? 'You have none left.' : `You are missing ${maxHp()-S.hp} health.`}</p><div class="row end"><button class="btn solid" data-a="${tonic?'tonic':'eat'}"${tonic?'':` data-k="${k}"`}${full||busy||n<1?' disabled':''}>${tonic?'Drink':'Eat'}</button></div>`); },
    eat: d => { if(F||activePursuit())return toast('Lose your pursuer before eating. Food is for resting after combat.'); const k = (d && d.k) || 'meat'; if (!(foodN(k) > 0) || S.hp >= maxHp() || (F && (F.busy || F.over))) return; addFood(k, -1); const n = heal(FOOD[k][1]); save(); renderHud(); closeSheet(); toast(`Ate ${FOOD[k][0]}: +${n} health`); if (F) { barsF(); drawF(); } else render(); },
    buymeat: d => { const c = +d.c; if (S.gold < c) return; S.gold -= c; S.meat = (S.meat || 0) + 1; save(); renderHud(); toast('Bought a trail ration'); if (CE && SH[CE.kind]) SH[CE.kind](CE); },
    offer: d => { const c = CONTRACTS.find(x => x.id === d.id); if (!c) return; dlg(CE, c.story, [{ t: 'Begin', n: c.lesson ? 'teaches ' + c.lesson.title : 'practice', a: 'contract', d: { id: c.id } }, back]); },
    jobs: () => dlg(CE, '"Do any again, from memory."', jobsOf(CE).filter(c => S.done[c.id]).map(c => ({ t: c.title, n: 'done', a: 'contract', d: { id: c.id } })).concat([back])),
    ask: d => { const t = CE.r, r = region(t), sp = Scene.spots(), tw = Scene.towns()[t], dir = p => p ? (Math.abs(p[1] - tw[1]) > Math.abs(p[0] - tw[0]) ? (p[1] < tw[1] ? 'north' : 'south') : (p[0] < tw[0] ? 'west' : 'east')) : 'out'; dlg(CE, d.k === 'place' ? `${TALK.place[t - 1].slice(0, -1)} The examiner’s ring is ${dir(sp['boss' + t])} of town, and ${DUNGEONS[t - 1].name} lies to the ${dir(sp['dun' + t])}."` : SAY[t - 1][CE.i], [back]); },
    gossip: () => dlg(CE, pick(GOSSIP), [{ t: 'More', a: 'gossip' }, back]),
    pages: () => { coach('shop'); const t = here(); sheet(`<p class="eyebrow">${CIRCLE[t]} Circle</p><h2>Pages for sale ${qm('shop')}</h2><ul class="goods">${pageGoods(t).map(goodHTML).join('')}</ul>`); },
    buypage: d => { const p = pageById(d.id); if (!p || owned(p.id) || S.gold < p.price) return; S.gold -= p.price; S.pages[p.id] = 1; if (gid() === 'page') gDone('page'); save(); renderHud(); toast(`${p.name} added to your ${BOOKS[p.book].name}`); if (marketSpecialty(CE) && marketSpecialty(CE).pages) countryStock(CE); else ACT.pages(); },
    scroll: d => { const p = pageById(d.id); if (!p || !S.scr[p.id]) return; sheet(`${scrollHTML(p)}<p class="cap2">${esc(p.src)}.</p><div class="row end">${owned(p.id) ? '<p class="cap2">You already know this ability. A stallkeeper or travelling trader will buy the spare scroll.</p>' : `<button class="btn solid" data-a="inscribe" data-id="${p.id}">Add to the ${BOOKS[p.book].name}</button>`}</div>`); },
    inscribe: d => { const p = pageById(d.id); if (p && inscribe(p.id)) { save(); toast(`${p.name} added to your ${BOOKS[p.book].name}`); } closeSheet(); render(); },
    sellscroll: d => previewCommonSale('scroll:'+d.id),
    pick: d => { const n = $('#cr-name'); if (!CR) return; if (n) CR.name = n.value; CR.path = d.id; CR.look = +d.look; if(CR.app)CR.app.body=CR.look%2; create(); },
    begin: () => {
      if (!CR || CR.look == null) return; const p = PATHS.find(x => x.id === CR.path), nm = (($('#cr-name')||{}).value || CR.name || '').trim().slice(0, 16) || NAMES[CR.look], rev = S.rev;
      const slot = CR.slot != null && !A.slots[CR.slot] ? CR.slot : A.slots.findIndex(c => !c); if (slot < 0) return toast('All five slots are taken'); syncA();
      const main = A.main < 0 || !A.slots[A.main]; A.cur = slot; if (main) A.main = slot;
      resetTactics();S = linkS(fresh()); S.rev = rev; S.name = main ? '' : nm; S.path = p.id; S.look = CR.look; S.app=Object.assign({},CR.app,{wear:p.id==='mage'?1:0}); S.sk = Object.assign({}, p.sk); Progression.normalize(S); S.hp = maxHp(); give(makeItem('common', 1, 'weapon', WSTART[p.id],{source:'starter'})); for (const id of { warrior: ['a1'], thief: ['a1', 'h1'], mage: ['s1'], crafter: ['a1', 'c1'] }[p.id]) S.pages[id] = 1; S.intro = 1; S.pos = null; S.prologue=main?Prologue.fresh():null;
      CR = null; DG = null; Q = null; F = null; if(sceneUp){clearInterval(GSAY);Scene.guideOff();} $('#enc').hidden = true; $('#fight').hidden = true; $('#nav').hidden = false; tab = 'world'; save(); if (sceneUp && !main) { Scene.load(null, 'dock'); sceneOwner=S; } hideTitle(); render();
      if (main) coldOpen(); else { hideTitle(); gSkip(); toast(`${nm} arrives in Tallyport`); }
    },
    newgame: () => { CR = null; return title(); if (S.path) return showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box"><h1>Start over?</h1><p class="tt-sub">${esc(S.name)} and everything they own will be erased when the new game begins.</p><button class="tt-btn" data-a="newgame2">Make a new character</button><button class="tt-btn quiet" data-a="totitle">Back</button></div>`); create(); },
    newgame2: () => { CR = null; create(); }, totitle: () => title(), continue: () => hideTitle(),
    worldpick: d => selectWorld(+d.i), crturn:d=>{if(CR)CR.direction=((CR.direction||0)+ +d.dir+8)%8;}, crwalk:()=>{if(!CR)return;const n=$('#cr-name');if(n)CR.name=n.value;CR.moving=!CR.moving;create();},
    playslot: d => playSlot(+d.i), newslot: d => { CR = { path: null, look: null, name: '', slot: +d.i }; create(); }, delpick: () => delPick(),
    delslot: d => deletionStart('character',+d.i), delworld:()=>deletionStart('world'), deleteverify:()=>deletionVerify(), deletecommit:()=>deletionCommit(),
    charactermenu:()=>characterMenu(), boatskiprescue:()=>boatAdvance('rescued'), boatname:()=>boatName(), boathome:d=>boatAdvance('home',d.id), boatnext:d=>boatAdvance(d.step), boatmenu:()=>returnCharacters(),
    skipguide: () => { if(boatActive())return boatLand(true); hideTitle(); gSkip(); }, gskip: () => gSkip(),
    headstyle:d=>{const L=myLook(),style=HeadPortraits.styles(L.body).find(p=>p.id===d.id);if(!style||style.id===L.headStyle)return;const cost=lookCost('hair');if(S.gold<cost)return toast('That costs '+cost+' gold.');S.gold-=cost;L.headStyle=style.id;normalizeHeadStyle(L);save();looksSheet();renderHud();},looks: () => looksSheet(), lookset: d => { const L = myLook(), k = d.k, v = (k === 'dye' || k === 'wglow') && isNaN(+d.v) || d.v === '' ? d.v : +d.v; if (L[k] === v) return; const c = lookCost(k); if (c && S.gold < c) return toast(`That costs ${c} gold`); if (c) S.gold -= c; L[k] = v; if(k==='body'){delete L.headStyle;S.look=v;}if(k==='hair'||k==='beard')delete L.headStyle;normalizeHeadStyle(L);save();looksSheet(); renderHud(); },
    djboard: () => { closeSay(); djBoard(Scene.inHall()); }, djsign: () => { const r = Scene.inHall(); if (!r || S.gold < 15 * r) return; djSign(r); closeSheet(); Scene.enterHall(r, hallFill(r)); clearInterval(SPT); SPT = setInterval(sparTick, 140); Scene.hop(5, 13); toast('You’re in the bracket'); render(); setTimeout(() => djBoard(r), 300); },
    djfight: () => { if (S.djb && S.djb.r === Scene.inHall()) djFight(); }, djmaster: () => { const r = Scene.inHall(), M = Scene.find(x => x.kind === 'master'); if (r && M && DJ(r).champ) boutStart(r, 4, Dojo.MASTERS[r - 1], M); },
    djilva: () => { const r = Scene.inHall(), M = Scene.find(x => x.kind === 'master'); CE = M; dlg(M, Dojo.SAY[r - 1].ilva.join(' '), [bye]); },
    djwatch: () => { const pr = Scene.ents().filter(x => x.spar); if (pr.length < 2) return; closeSay(); pr.forEach(x => x.ff = 1); duOpen({ mode: 'watch', r: Scene.inHall(), a: pr[0], b: pr[1] }); },
    dudone: () => { duClose(); }, dunext: () => { if (DU) duRound(); }, duyield: () => { if (DU && DU.mode === 'duel') duEnd(1); }, duover: () => { if (DU) boutOver(); },
    odx: d => odx(+d.n),
 gnext: () => { closeSay(); if (gid() === 'fish') gDone('fish'); }, bankopen: () => { closeSay(); bankSheet(CE); },
    tonic: () => { if(F)return combatDraught();if(activePursuit())return toast('Lose your pursuer or drink during combat.'); if ((F && (F.busy || F.over)) || S.tonics < 1 || S.hp >= maxHp()) return; S.tonics--; const n = heal(30); save(); renderHud(); closeSheet(); toast(`Drank a Healing Draught: +${n} health`); if (F) { barsF(); drawF(); } else render(); },
    buybandages: d => {const c=+d.c;if(!CE||!Number.isFinite(c)||c<1||S.gold<c)return;S.gold-=c;S.bandages=(S.bandages||0)+5;save();renderHud();toast('Bought five bandages');if(CE.kind==='healer')SH.healer(CE);else countryStock(CE);},
    buytonic: d => { const c = +d.c; if (S.gold < c) return; S.gold -= c; S.tonics++; save(); renderHud(); toast('Bought a Healing Draught'); if (CE && SH[CE.kind]) SH[CE.kind](CE); else closeSheet(); },
    rest: d => {if(activePursuit())return toast('Lose your pursuer before resting.'); const cost = +d.c || 4 * here(); if (S.gold < cost || S.hp >= maxHp()) return; S.gold -= cost; S.hp = maxHp(); save(); renderHud(); closeSheet(); toast('Rested. Full health'); },
    exitdungeon: () => DP.exit(), dtravel: d => DP.travel(d.id), dopen: d => DP.open(d.id),
    contract: d => { if (!ready) return toast(engineErr || 'The Ledger is still opening'); START.contract(d); },
    start: d => { if (!ready) return toast(engineErr || 'The Ledger is still opening'); START[d.k](d); },
    closesheet: closeSheet, run: () => { if (DU) return duRun(); if (TR) return trRun(); if (FI) fiRun(); else if (WH) whRun(); else if (BJ) bjRun(); else if (PK) pkAsk(); else if (Q) runQ(); else if (F) runF(); },
    eroffer: () => { coach('errand'); const e = CE; if (!e) return; const E = errandFor(e); dlg(e, E.line, [{ t: 'I will do it', n: `${E.gold} gold`, a: 'eraccept' }, { t: 'Not today', a: 'closesheet' }]); },
    eraccept: () => { const e = CE; if (!e || S.er.a[e.hid]) return; const E = errandFor(e); S.er.a[e.hid] = E; save(); closeSay(); Scene.refresh(); toast('Errand taken: ' + E.what.split(',')[0]); },
    erdrop: d => { delete S.er.a[d.id]; save(); render(); },
    ctrade: () => CE && countryStock(CE), buyfood: d => { const c = +d.c; if (S.gold < c) return; S.gold -= c; addFood(d.k, 1); save(); renderHud(); toast('Bought ' + FOOD[d.k][0]); if (CE) countryStock(CE); },
    buymat: d => { const c = +d.c, e = CE; if (!e || S.gold < c) return; S.gold -= c; S.mats[e.r] = have(e.r) + 1; save(); renderHud(); toast('Bought ' + MATS[e.r]); countryStock(e); },
    buykey: d => { const c = +d.c, e = CE; if (!e || S.gold < c || !S.cs[e.hid] || !S.cs[e.hid].key) return; S.gold -= c; S.hints++; S.cs[e.hid].key = 0; save(); renderHud(); toast('Bought a Hint Key'); countryStock(e); },
    buygear: d => { const e = CE, st = e && S.cs[stockId(e)], it = st && st.items[+d.i]; if (!it || S.gold < price(it)) return; if (S.inv.length >= 60) return toast('Your bag is full'); S.gold -= price(it); st.items.splice(+d.i, 1); give(it); save(); renderHud(); toast('Bought ' + it.name); countryStock(e); },
    sellhides: () => { const e = CE, n = have('hide'); if (!e || !n) return; const g = n * SETTLE[e.role].hides * e.r; S.mats.hide = 0; S.gold += g; save(); renderHud(); toast(`Sold ${n} hide${n === 1 ? '' : 's'} for ${g} gold`); countryStock(e); },
    song: () => { const e = CE, c = e ? 3 * e.r : 0; if (!e || S.gold < c) return toast('Not enough gold'); S.gold -= c; const n = heal(12); save(); renderHud(); dlg(e, pick(GOSSIP), [bye]); toast(`A song: +${n} health`); },
    cast: d => CE && fishOpen(CE, +d.i), fiagain: () => { const e = FI && FI.e; if (!e) return; fiClose(); CE = e; SH.fish(e); }, fileave: () => { if (FI) fiClose(); },
    whopen: d => whOpen(+d.r), whmode: d => { if (WH) { if ($('#sql')) WH.draft[WH.mode] = $('#sql').value; WH.mode = d.m; whDraw(); } }, whspin: d => whSpin(+d.m), houseleave: () => { if (BJ && BJ.g && !BJ.g.over) return toast('Finish the hand first'); houseClose((WH || BJ || {}).net); },
    bjopen: d => bjOpen(+d.r), bjbet: d => bjBet(+d.m), bjmove: d => bjMove(d.m), bjcount: () => { BJ.counting = true; bjDraw(); }, bjback: () => { BJ.counting = false; bjDraw(); }, bjagain: () => bjRun(true),
    casino: () => CE && SH.casino(CE), pkrules: d => pkRules(+d.r || here()), pksit: d => pkSit(+d.r, +d.n), pkleave: pkLeave, pknext: () => { if (PK && PK.h.over) pkDeal(); }, pkact: d => pkMe(d.t), pkread: pkRead, pkback: () => { if (PK) { PK.reading = false; pkDraw(); } },
    pkname: d => { if ($('#sql')) { insert("'" + d.n + "'", true); PK.draft = $('#sql').value; kbFocus(); } },
    pksize: d => { if (!PK || PK.busy || PK.h.over || PK.h.to !== 0) return; const L = Poker.legal(PK.h); PK.size = d.f ? pkPreset(L, +d.f) : Math.max(L.minTo, Math.min(L.maxTo, PK.size + (+d.d) * PK.bb)); pkDraw(); },
    clear: () => { const ta = $('#sql'); if (ta) { ta.value = ''; kbGrow(); kbFocus(); } },
    showblocked: () => { S.showb = !S.showb; save(); Scene.showBlocked(S.showb); toast(S.showb ? 'Blocked ground shows red' : 'Blocked ground tint off'); render(); },
    ftip: () => { if (F && !F.noHint && F.task && F.task.tip && !F.hints.some(h => h.includes('class="fh tip"'))) { F.readinessHelp=true;F.hints.unshift(`<p class="fh tip">${esc(F.task.tip)}</p>`); $('#f-hint').innerHTML = F.hints.join(''); fitPanel(); } },
    lootone: d => { lootTake(+d.i); lootDone(); }, lootall: () => { const all = { gold: 0, mats: {}, items: [], scrolls: [], food: {}, sigils: 0, meat: 0, hide: 0 }; LB.L.forEach((p, i) => { const g = lootTake(i, true); if (!g) return; all.gold += g.gold; for (const k in g.mats) all.mats[k] = (all.mats[k] || 0) + g.mats[k]; for (const k in g.food) all.food[k] = (all.food[k] || 0) + g.food[k]; all.sigils += g.sigils; all.meat += g.meat; all.hide += g.hide; all.runes = (all.runes || 0) + (g.runes || 0); all.items.push(...g.items); all.scrolls.push(...g.scrolls); }); toast(bitsOf(all).concat(all.items.map(x => x.name), all.scrolls.map(x => 'Scroll: ' + x.name)).join(' · ')); lootDone(); }, lootclose: () => { LB = null; closeSheet(); },
    coachok: () => { $('#coach').hidden = true; }, why: d => { const el = $('#coach'); el.innerHTML = `<p>${esc(HELP[d.id] || '')}</p><button class="btn sm solid" data-a="coachok">Got it</button>`; el.hidden = false; },
    sbeat: () => storyNext(), letter: () => ilvaLetter(), truth: d => trOpen(d.id), trclose: () => { const end = TR && TR.T.id === 't12' && S.tw.t12; trClose(); if (end) theDoor(); },
    dpeek: d => { const t = Deep.TABLES[+d.i]; if (!t || !haveT(+d.i)) return; const r = deepDb().read(`SELECT * FROM ${t.name} LIMIT 8`); sheet(`<h2>${t.name}</h2><p class="cap2">${esc(t.note)} First eight rows.</p>${tableHTML(r, 8)}<div class="row end"><button class="btn sm quiet" data-a="closesheet">Close</button></div>`); },
    ltable: () => {}, gohome: () => { S.ending = 'home'; save(); STY = null; storyCards([{ bg: 'J11', t: 'You row toward the light. Tamsin lifts a lantern on the harbour wall and keeps it raised until you can no longer see her. When the light clears, you recognise the shore of your homeland.' }, { t: 'You are home. Thank you for playing Brasswake. Your save is still here: you can keep playing as if you stayed.' }], () => render()); },
    stay: () => { S.ending = 'stay'; save(); STY = null; storyCards([{ bg: 'J11', t: 'You tell Ilva you’re staying. The two of you watch from the harbour wall until the light fades. Tamsin has saved you a place at breakfast aboard the Marigold. Tomorrow you can decide what you want to do next.' }], () => render()); },
    deeds: () => deedsSheet(), dmat: d => { DM = +d.i; deedsSheet(); }, bankback: () => bankSheet(),
    buydeed: d => { const i = +d.i, c = hPrice(i, DM); if (funds() < c) return; pay(c); (S.deeds = S.deeds || []).push({ shape: i, mat: DM }); save(); renderHud(); toast(`Bought: ${hName(i, DM)} deed. It is in your bag.`); deedsSheet(); },
    placedeed: d => startPlace(+d.k), placecancel: () => { PL = null; Scene.ghost(null); placeBar(); },
    placego: () => { const g = Scene.ghostNow(); if (!PL || !g) return; g.why = Scene.homeFits(g.x, g.y, g.w, g.h); if (g.why) return placeBar(); const n = (S.homes || []).length + 1, p = Scene.pos(), h = { id: 'h' + Date.now().toString(36), shape: PL.shape, mat: PL.mat, x: g.x, y: g.y, w: g.w, h: g.h, r: Scene.region(), wall: PAINT.wall[0][1], roof: PAINT.roof[0][1], pad: 0, chest: [], name: n === 1 ? 'Your home' : 'Home ' + n };
      S.deeds.splice(PL.k, 1); (S.homes = S.homes || []).push(h); Scene.addHome(h); PL = null; Scene.ghost(null); placeBar(); save(); toast('Built. Tap the door to go in.'); },
    paint: d => { const h = homeById(d.h); if (!h || h[d.k] === d.c) return; if (funds() < PAINT_C) return toast(`A coat of paint costs ${PAINT_C} gold`); pay(PAINT_C); h[d.k] = d.c; Scene.dropHome(h.id); Scene.addHome(h); CMap.restore(); save(); homeSheet(h); },
    hbed: d => {if(activePursuit())return toast('Lose your pursuer before resting.'); const h = homeById(d.h); heal(maxHp()); S.mana=Progression.maxMana(S);S.stamina=maxStamina(); if (h && h.fbed) S.rest = Date.now() + 60 * 60000; save(); renderHud(); toast(h && h.fbed ? 'You sleep well. Full health, and well rested for an hour.' : 'You sleep. Full health.'); homeSheet(h); },
    hup: d => { const h = homeById(d.h); if (!h) return; const k = d.k, c = k === 'xch' ? xchC(h) : k === 'fbed' ? BED_C : GARDEN_C; if (funds() < c || (k === 'xch' && (h.xch || 0) >= 4) || (k !== 'xch' && h[k])) return; pay(c); if (k === 'xch') h.xch = (h.xch || 0) + 1; else h[k] = 1; save(); renderHud(); toast('Done. ' + (k === 'xch' ? 'Another chest.' : k === 'fbed' ? 'A feather bed.' : 'A garden out back.')); homeSheet(h); },
    hpick: d => { const h = homeById(d.h); if (!h || !h.garden || h.gday === dayKey()) return; h.gday = dayKey(); const o = { food: {}, mats: { [h.r]: rint(2, 3) } }; o.food[pick(['apple', 'loaf', 'honey', 'cheese'])] = 2; const g = grant(o); save(); renderHud(); toast(bitsOf(g).join(' · ')); homeSheet(h); },
    hpad: d => { const h = homeById(d.h); if (!h || h.pad || !(S.runes > 0)) return; S.runes--; h.pad = 1; Scene.dropHome(h.id); Scene.addHome(h); CMap.restore(); save(); toast('The pad is set. Teleport here from the Map.'); homeSheet(h); },
    hput: d => { const h = homeById(d.h); if (!h || h.chest.length >= hCap(h)) return toast('The chest is full'); const i = S.inv.findIndex(it => it.id === d.id); if (i < 0) return; h.chest.push(S.inv.splice(i, 1)[0]); save(); homeSheet(h); },
    htake: d => { const h = homeById(d.h); if (!h) return; if (S.inv.length >= 60) return toast('Your bag is full'); const i = h.chest.findIndex(it => it.id === d.id); if (i < 0) return; S.inv.push(h.chest.splice(i, 1)[0]); save(); homeSheet(h); },
    tphome: d => { const h = homeById(d.h); if (!h || !h.pad) return; if (F || Q) return toast('Not in a fight.'); if (sceneUp && Scene.find(e => e.chase > 0)) return toast('Not while something is chasing you.'); const p = Scene.homeDoor(h.id); DG = null; S.dungeon = null; S.interior=null; tab = 'world'; Scene.load(p || [h.x, h.y + h.h + 1], h.r); S.pos = Scene.pos(); S.region = sel = Scene.region(); save(); render(); toast('You step off the pad at ' + h.name + '.'); },
    bdep: () => { if (gid() === 'bank') gDone('bank'); S.bank.gold += S.gold; toast(`Deposited ${S.gold} gold`); S.gold = 0; save(); renderHud(); bankSheet(); },
    bwd: d => { const n = d.n === 'all' ? S.bank.gold : Math.min(+d.n, S.bank.gold); S.bank.gold -= n; S.gold += n; save(); renderHud(); bankSheet(); },
    bstore: d => { if (S.bank.items.length >= BANK_SLOTS) return toast('The bank box is full'); const i = S.inv.findIndex(it => it.id === d.id); if (i < 0 || Object.values(S.eq).includes(d.id)) return; S.bank.items.push(S.inv.splice(i, 1)[0]); save(); bankSheet(); },
    btake: d => { if (S.inv.length >= 60) return toast('Your bag is full'); const i = S.bank.items.findIndex(it => it.id === d.id); if (i < 0) return; S.inv.push(S.bank.items.splice(i, 1)[0]); save(); bankSheet(); },
    help: () => helpSheet(), hint: () => takeHint(), fhint: () => fHint(), fshow: () => fShow(), fshowconfirm:()=>{closeSheet();fShowConfirmed();}, ftables: () => tablesSheet(), klog: () => { S.klog = !S.klog; save(); toast(S.klog ? 'Key log on: it shows under the query box' : 'Key log off'); const ta = $('#sql'), q = ta && ta.parentNode; if (q) { const old = $('#klog'); if (S.klog && !old) ta.insertAdjacentHTML('afterend', '<p id="klog" class="klog">Key log: tap keys and it fills in here</p>'); if (!S.klog && old) old.remove(); } closeSheet(); },
    qleave: () => closeQ(), qturn: () => { if (Q) { Q.step = 'turn'; drawQ(); } }, qnext: () => { const id = Q && Q.nextId; if (!id) return; Q = null; START.contract({ id }); },
    practicepage: d => { if(Q&&Q.kind==='firstpractice'&&fightPages().some(p=>p.id===d.id)){Q.draft=$('#sql')?.value||Q.draft||'';Q.practicePage=d.id;drawQ();} },
    reviewintro: () => {if(boatActive())return toast('Odalys will teach your first query when you reach Tallyport.'); START.intro();Q.step='i1';Q.tasks=null;Q.blank=null;Q.bok=false;Q.bout='';drawQ(); },
    intropractice: () => { closeSay(); openQ({kind:'firstpractice',r:1,step:'turn',title:'A safe first ability',task:{kind:'read',ask:'Use the pattern you practised: show the name of every item in items.',ret:'name',sql:'SELECT name FROM items',tables:['items'],kw:['SELECT','FROM'],tip:'Choose an ability by practising its query here. The dummy cannot hurt you, and mistakes cost nothing.'}}); },
    introcheck: d => introCheck(d), introcontinue: () => { if (!Q || Q.step !== 'practice-result') return; Q.i++; Q.task = REPS[Q.i]; Q.tries = 0; Q.step = 'turn'; drawQ(); },
    qstep: d => { if (!Q) return; Q.bout = ''; if (d.s === 'reps') { Q.step = 'turn'; Q.tasks = REPS; Q.i = 0; Q.task = REPS[0]; } else Q.step = d.s; drawQ(); $('#enc .q-body').scrollTop = 0; },
    blank: d => { if (!Q || !Q.blank || Q.bok) return; const i = Q.blank.indexOf(null); if (i < 0) return; Q.blank[i] = d.w; Q.bout = ''; drawQ(); }, unblank: d => { if (!Q || !Q.blank || Q.bok) return; Q.blank[+d.i] = null; Q.bout = ''; drawQ(); }, blankrun: () => blankRun(),
    fbackstab: () => pickBackstab(),
    fprize: d => {if(F&&F.act==='steal'&&!F.busy){const old=F.prize==='prize'?15:0;F.prize=d.id==='prize'?'prize':'purse';F.bonus=(F.bonus||0)+old-(F.prize==='prize'?15:0);drawF();}}, fstance: d => {if(F&&!F.busy){const p=bestPage('arms');if(p)pickPage(p.id,d.id);}}, futility: d => combatUtility(d.id), fscroll: () => {if(F&&!F.busy){F.scroll=!F.scroll;drawF();}}, fmaneuver:d=>pickPage(d.id,d.stance), fpage: d => pickPage(d.id,d.stance||'strike'), fsteal: () => pickSteal(),
    fcompare: () => { if(!F)return;F.compareOpen=!F.compareOpen;if(F.st==='prompt')drawFightRepair();else drawF(); },
    fchoose: () => { if (F && !F.busy && !F.over) { stashFightDraft();F.st = 'choose'; drawF(); } }, fdone: () => closeF(), floot: () => { const b = F && F.body; closeF(); if (b) lootOpen(b); }, flee: () => flee(),
    cardno: () => { closeCard(); render(); },
    atlas: () => sheet('<h2>Tables of the Great Ledger</h2>' + atlasHTML()),
    peek: d => { const r = Engine.peek(d.t); sheet(`<h2>${d.t}</h2><p class="cap2">First four rows.</p>${tableHTML(r)}<div class="row end"><button class="btn sm quiet" data-a="atlas">All tables</button></div>`); },
    slot: d => { benchSlot = d.s;benchMaterial='';SH.bench(); }, craftshape:d=>{if(craftShapes[d.id]){benchArchetype=d.id;benchMaterial='';SH.bench();}},craftmaterial:d=>{if(EquipmentRules.eligibleMaterials(craftTemplate(),here()).some(m=>m.id===d.id)){benchMaterial=d.id;SH.bench();}},
    craft: d => {
      const x = RECIPES.find(r => r.id === d.id), t = here(), cp = bestPage('craft'); if (!x || !cp || cp.c < t || have(t) < x.mats || have('sigil') < x.sigils) return; if (x.gear && S.inv.length >= 60) return toast('Your bag is full'); if (!ready) return toast(engineErr || 'The Ledger is still opening');
      const csk = x.gear ? 'smith' : 'alchemy', c = cp.c, b = pick(BOUNTIES.filter(q => q.r === c && !/^b80[123]/.test(q.id))), diff = Math.min(100, diffOf(t) + ({ rare: 8, epic: 16, legendary: 24 }[x.id] || 0));
      openQ({ kind: 'craft', roll: true, csk, recipe: x, slot: benchSlot, material:benchMaterial,archetype:['armor','shield','head','hands','feet','cloak'].includes(benchSlot)?craftTemplate().name:null,r: t, diff, task: makeTask({ tpl: b.id, seed: seeded(b.id) }), title: (x.id === 'scroll' ? 'Hint Key' : x.name) + (x.gear ? ' · ' + benchSlot : '') });
    },
    profession: d => {if(SkillCrafting.can(S,d.id,here()))beginSkillWork('craft',{recipe:d.id});},
    lockwork: d => {if(!LOCK||LOCK.owner!==S)return;beginSkillWork(d.kind==='force'?'force':'lock',{key:LOCK.key,r:LOCK.e.r,diff:SkillCrafting.lockDifficulty(LOCK.e.r,DG?DG.f:0)});},
    outrecover: () => beginSkillWork('recover'),
    conceal: () => {if(CONCEAL.hidden){Sneaking.reveal(CONCEAL);renderHud();return;}beginSkillWork('hide');},
    installfurniture: d => {const h=homeById(d.h);if(!h||!CE||CE.kind!=='myhome'||CE.hid!==h.id&&CE.id!==h.id)return;if(SkillCrafting.install(S,h,d.id)){save();homeSheet(h);toast('Furnishing installed');}},
    studyshelf: d => {const h=homeById(d.h);if(!h||!h.shelf||!CE||CE.kind!=='myhome')return;if((h.studyUntil||0)>now())return toast('The shelf is already helping your study.');h.studyUntil=now()+10*60000;S.boost=Math.max(S.boost||0,h.studyUntil);save();homeSheet(h);toast('Double skill gains for ten minutes');},
    bench: () => SH.bench(),
    buy: d => { const st = stall(), it = st.stock[+d.i]; if (!it || S.gold < price(it)) return; if (S.inv.length >= 60) return toast('Your bag is full'); S.gold -= price(it); st.stock.splice(+d.i, 1); give(it); save(); renderHud(); if (CE) SH.stallkeep(CE); toast('Bought ' + it.name); },
    equip: d => { const it = itemById(d.id); if (it) { S.eq[it.slot] = it.id;Progression.normalize(S);save(); closeSheet(); render(); if (gid() === 'bag' && it.id === S.gk) { ACT.tab({ t: 'world' }); gDone('bag'); } } },
    item: d => { const it = itemById(d.id); if (!it) return; const on = S.eq[it.slot] === it.id; sheet(`${lootHTML(it)}${GearScreen.details(it)}<div class="row end">${on ? `<button class="btn" data-a="unequip" data-s="${it.slot}">Take off</button>` : `<button class="btn solid" data-a="equip" data-id="${it.id}">${it.slot==='weapon'?'Equip':'Wear'}</button>`}${it.unique ? '' : '<p class="cap2">A stallkeeper or travelling trader can buy this piece after you unequip it.</p>'}</div>${it.unique || it.bless ? '' : `<div class="row end">${S.blessd ? `<button class="btn sm quiet" data-a="bless" data-id="${it.id}">Bless · ${S.blessd} deed${S.blessd > 1 ? 's' : ''}</button>` : ''}<button class="btn sm quiet" data-a="insure" data-id="${it.id}">${it.ins ? 'Stop insuring' : `Insure · ${insFee(it)} a fall`}</button></div>`}`); },
    unequip: d => { delete S.eq[d.s];Progression.normalize(S);save(); closeSheet(); render(); },
    progressmode: d => {const stat=d.stat==='1',m=Progression.mode(S,d.id,stat);Progression.setMode(S,d.id,{up:'down',down:'lock',lock:'up'}[m],stat);save();render();},
    progresstarget: d => {const stat=d.stat==='1',el=document.querySelector(`input[data-target="${d.id}"][data-stat="${stat?1:0}"]`);if(!el)return;const bag=stat?S.attrTargets:S.skillTargets;if(!el.value.trim())delete bag[d.id];else Progression.setTarget(S,d.id,Number(el.value),stat);save();render();},
    djtrain: () => trainSheet(),
    train: d => {const id=d.id,T=trainCost(id,+d.n||1);if(!T.add||S.gold<T.c)return;const g=Progression.change(S,id,T.add);if(g.after===g.before)return;S.gold-=T.c;save();renderHud();trainSheet();$('#sheet-body').insertAdjacentHTML('afterbegin',gainsHTML([g]));},
    reads: () => { if (!S.gscr) return; S.gscr--; S.boost = Math.max(Date.now(), S.boost || 0) + 30 * 60000; save(); toast('Double skill gain for 30 minutes'); render(); },
    readp: d => { const P = S.pscr || [], x = P[+d.i]; if (!x || skCap(x.id) >= x.cap || skCap(x.id) < x.cap - 5) return; (S.pcap = S.pcap || {})[x.id] = x.cap; P.splice(+d.i, 1); save(); toast(`${rpgName(x.id)} can now reach ${x.cap}`); render(); },
    buybless: () => { if (funds() < BLESS_C) return; pay(BLESS_C); S.blessd = (S.blessd || 0) + 1; save(); renderHud(); toast('Bought a bless deed'); bankSheet(); },
    bless: d => { const it = itemById(d.id); if (!it || it.bless || it.unique || !S.blessd) return; S.blessd--; it.bless = 1; delete it.ins; save(); toast(`${it.name} is blessed`); d.from === 'bank' ? bankSheet() : ACT.item({ id: it.id }); },
    insure: d => { const it = itemById(d.id); if (!it || it.bless || it.unique) return; it.ins = it.ins ? 0 : 1; save(); d.from === 'bank' ? bankSheet() : ACT.item({ id: it.id }); },
    sell: d => previewCommonSale(d.id),
    sellcommon: () => saleChoices(), sellpick:d=>previewCommonSale(d.id), sellallcommon:()=>previewCommonSale(), sellconfirm:()=>confirmCommonSale(),
    supplyinfo:d=>{const name=d.k==='keys'?'Hint Keys':d.k==='sigils'?'Brass Sigils':MATS[+d.k],text=d.k==='keys'?'A Hint Key pays for a priced exercise hint. Dojo explanations and teaching help are free.':d.k==='sigils'?'Brass Sigils are earned from regional challenges and spent on special purchases. They are separate from gold and map surveys.':'These crafting materials are used at workbenches and other professional stations. Recipes tell you what they require.';sheet(`<h2>${esc(name)}</h2><p>${esc(text)}</p>`);},
    conrun: () => { con.sql = $('#con-sql').value; heroTables(); con.res = Engine.runSandbox(con.sql); $('#con-out').innerHTML = conHTML(con.res); },
    conq: d => { $('#con-sql').value = d.q; ACT.conrun(); },
    conreset: () => { Engine.resetSandbox(); con.res = null; render(); toast('Sandbox restored to the original ledger'); },
    export: () => { const code = saveCode(); sheet(`<h2>Save code</h2><p class="cap2">Copy this somewhere safe. Loading it on any device restores all three worlds, their characters and houses.</p><label class="vh" for="savebox">Save code</label><textarea id="savebox" class="savebox" readonly>${code}</textarea><div class="row end"><button class="btn solid" data-a="copy">Copy</button></div>`); },
    copy: async () => { const b = $('#savebox'); try { await navigator.clipboard.writeText(b.value); toast('Copied'); } catch (e) { b.focus(); b.select(); toast('Select all and copy'); } },
    import: () => sheet(`<h2>Load save</h2><p class="cap2">This replaces all three worlds, their characters and houses.</p><label class="vh" for="savebox">Save code</label><div class="save-file-pick"><label for="save-file">Choose a save file</label><input id="save-file" type="file" accept=".txt,text/plain"><p id="save-file-status" class="cap2" role="status"></p></div><textarea id="savebox" class="savebox" placeholder="Or paste a save code"></textarea><div class="row end"><button class="btn solid" data-a="doimport">Load</button></div>`),
    doimport: () => {
      try {
        const o = JSON.parse(decodeURIComponent(escape(atob($('#savebox').value.trim()))));
        if (!o || ![6,7,8,9].includes(o.v)) throw 0;
        discardEncounter(); const revision=Math.max(A.rev,o.rev||0); A = CharacterWorlds.normalize(o); A.rev=revision; if(sceneUp&&Scene.resetWorld)Scene.resetWorld();
        loadCur(); cmdBackfill();learningBackfill(); DG = null; Q = null; F = null; CE = null; closeSheet();
        if (A.cur < 0) { if (sceneUp) homesUp(); save(); return title(); }
        hideTitle(); if (sceneUp) restoreAccountScene(true);
        save(); render(); toast('Game loaded');
      } catch (e) { toast('That is not a valid save code'); }
    },
    savenow:()=>{const ok=save();toast(ok?'Saved on this device':'Could not save. Back up your save before closing.');},
    enchantmenu:()=>GearScreen.openEnchant(),enchitem:d=>GearScreen.openEnchant(d.id),enchantapply:d=>GearScreen.enchant(d),comparetarget:d=>GearScreen.target(d),mounttoggle:()=>mountToggle(),buyhorse:()=>buyHorse(),backup:()=>backupSheet(),savefile:()=>saveFile(),
    offlinedownload:()=>{if(Offline.reopen()){if(save())location.assign(new URL('./',location.href));else toast('Back up your save before reopening.');}else Offline.download();},
    offlinehelp:()=>sheet(`<h2>Play offline</h2><p class="cap2">Download the game while you’re connected. Wait for “Ready for offline play” before leaving Wi-Fi. You can then close and reopen the game without a connection.</p><p class="cap2">On iPhone, use Safari’s Share menu to Add to Home Screen. Open that icon and download the offline copy there. Before flying, turn on airplane mode, turn Wi-Fi off, and reopen the game from the same icon.</p><p class="cap2">Progress saves automatically on this device. Save now keeps the latest position; Back up save makes a separate file. Clearing website data removes downloads and device saves, so keep a backup file somewhere safe.</p><button class="btn solid" data-a="closesheet">Done</button>`),
    reset: () => returnCharacters()
  };
  document.addEventListener('change',e=>{const key=e.target.dataset&&e.target.dataset.create;if(!CR||!['body','build','skin','headStyle','hc'].includes(key))return;CR.app[key]=key==='headStyle'?e.target.value:+e.target.value;if(key==='body'){delete CR.app.headStyle;if(CR.path)CR.look=LOOK0[CR.path]+CR.app.body;}normalizeHeadStyle(CR.app);HeadPortraits.preload(CR.app.body,CR.app.headStyle);if(key==='body'){const name=$('#cr-name');if(name)CR.name=name.value;create();}});
  document.addEventListener('change',async e=>{if(e.target.id!=='save-file')return;const file=e.target.files[0],box=$('#savebox'),status=$('#save-file-status');if(!file||!box||!status)return;try{if(file.size>8*1024*1024)throw 0;const code=(await file.text()).trim();const o=JSON.parse(decodeURIComponent(escape(atob(code))));if(!o||![6,7,8,9].includes(o.v))throw 0;box.value=code;status.textContent='Save file ready. Choose Load to replace your current worlds.';}catch(_){box.value='';status.textContent='That file is not a valid Brasswake save. Choose another file or paste a code.';}});
  document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || el.disabled || ghost(e)) return; const f = ACT[el.dataset.a]; if (f) f(el.dataset, el, e); });
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && $('#sheet').hidden) { if (Q || F) ACT.run(); else if ($('#con-sql')) ACT.conrun(); } if (e.key === 'Escape' && (!$('#sheet').hidden || SB)) closeSheet(); });
  document.addEventListener('click', e => { if (SB && !ghost(e) && e.target.closest('#say') && !e.target.closest('[data-a]')) sayTap(); });

  /* ---------- boot ---------- */
  function engineUp(SQL) { Engine.init(SQL, World); for (const t of Engine.atlas()) COLS[t.name] = t.cols.map(c => c.name); ready = true; render(); if (tab !== 'world' && !sceneUp) bootScene(); if ($('#kb')) kbDraw(); if (Q && Q.step[0] === 'i') drawQ(); }
  function bootEngine() {
    const go = () => window.initSqlJs().then(engineUp).catch(e => { engineErr = 'The Ledger could not open (' + (e && e.message || e) + '). Reload the page to try again.'; render(); });
    if (typeof window.initSqlJs === 'function') return go();
    const s = document.createElement('script'); s.src = 'vendor/sql-asm.js'; s.onload = go; s.onerror = () => { engineErr = 'The SQL engine could not be downloaded. Check your connection and reload.'; render(); }; document.head.appendChild(s);
  }
  function artLoad() {   // hold the title buttons until the shared art and this region's art are in, so nothing pops in during play
    if (!ART || !Scene.preload) return; const el = $('#artload'), app = $('#app'); let done = false; const fin = () => { if (done) return; done = true; app.classList.remove('artload'); el.hidden = true; };
    app.classList.add('artload'); el.hidden = false; el.textContent = 'Loading art'; Scene.preload(S.region || 1, (n, t) => { el.textContent = `Loading art ${n} of ${t}`; }).then(fin, fin); setTimeout(fin, 30000);
  }
  window.addEventListener('pagehide',()=>{if(A){if(S?.path)save();void flush();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&A){if(S?.path)save();void flush();}});
  function start(hot) { purgeOld(); const device=loadA(),snapshot=hot?.acct&&CharacterWorlds.normalize(hot.acct);A=!snapshot?device||freshA():!device?snapshot:device.rev>snapshot.rev||device.rev===snapshot.rev&&device.at>snapshot.at?device:snapshot; loadCur(); cmdBackfill();learningBackfill(); deviceSave.at=A.at||0; title(); if(!new URLSearchParams(location.search).has('visual_test'))Offline.init(); artLoad(); if (A===snapshot&&hot&&hot.tab) tab=hot.tab; sel = S.region; render(); setTimeout(bootEngine, 30); cloudInit(); }
  GearScreen=EquipmentScreen.create({state:()=>S,item:itemById,bonus,page:bestPage,defs:WEAP,skill:rv,physicalFactor:()=>Progression.physicalFactor(S),spellFactor:()=>Progression.spellFactor(S),circle:here,difficulty:()=>diffOf(here()),sheet,escape:esc,icon:ico,itemIcon,stats:statLine,save,render,toast,service:()=>({entity:CE,valid:liveService('bench')||liveService('enchanter')}),materialName:key=>MATS[key]||key,showItem:id=>ACT.item({id}),skillName:rpgName,accuracy:(skill,diff)=>odds(skill,diff,'correct').p,sync:()=>{Progression.normalize(S);if(sceneUp)Scene.refresh();}});
  if (location.protocol === 'file:' || location.hostname === 'localhost') window.__bw = { CMap, CONCEAL, beginSkillWork, combatUtility, maxHp, get A() { return A; }, makeItem, gain, odds, dropBody, insFee, trainCost, makePscr, maybeDye, homeSheet, get DU() { return DU; }, get FI() { return FI; }, errandFor, get PK() { return PK; }, get WH() { return WH; }, get BJ() { return BJ; }, get Q() { return Q; }, get F() { return F; }, KB, get S() { return S; }, get DG() { return DG; }, DP, get SB() { return SB; }, get TR() { return TR; }, setCE: e => { CE = e; }, HOST, SH, START, ACT, render, save, odds, gain, diffOf };
  // speech and story use curly quotes; SQL, code and table data keep straight ones
  const cq = t => t.replace(/"/g, (m, i) => (i === 0 || /[\s(\[\u2014\u2013-]/.test(t[i - 1])) ? '\u201c' : '\u201d'), RAW = 'pre,code,textarea,input,script,style,td,th,.qbox,.code,.sqlhl,[data-raw]';
  function curl(n) { if (n.nodeType === 3) { if (n.data.indexOf('"') < 0) return; const p = n.parentElement; if (!p || p.closest(RAW)) return; const v = cq(n.data); if (v !== n.data) n.data = v; } else if (n.nodeType === 1 && !n.matches(RAW)) for (const c of n.childNodes) curl(c); }
  try { curl(document.body); new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') curl(m.target); else m.addedNodes.forEach(curl); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) { }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => { syncA(); return { acct: A, tab }; });
  if (hot && hot.ready) hot.ready(start); else start(hot && hot.data || {});
})();
