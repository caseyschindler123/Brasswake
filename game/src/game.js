/* ===== GAME: state, progression, loot, encounters, screens ===== */
(() => {
  const { CMDS, HOUSES, HMAT, PAINT, LAIRS, LAIRMON, SKILLS, REGIONS, CONTRACTS, BOUNTIES, BOSSES, RUMORS, UNIQUES, MATS, MONSTERS, WILD, DUNGEONS, RIVALS, ROLES, RECIPES, HUES, FOLK, TAVERNS, SAY, GOSSIP, RIVALSAY, CIRCLE, JOURNAL, BOOKS, PAGES, FOLKN, HAB, HUNT, TALK, FOOD, SETTLE, HOMES, ROAMERS, FIRST, STOCK, STOCKSAY, PLACES, TALES, FISH, JUNK, CASTS, FISHNEED, ERR, LOST } = Content;
  const KEY = 'brasswake.save.v4', ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = () => Date.now(), rnd = () => Math.random(), rid = () => Math.floor(rnd() * 2147483647) + 1;
  const pick = a => a[Math.floor(rnd() * a.length)], rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  function RNG(seed) { let a = seed >>> 0; const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; return { pick: x => x[Math.floor(f() * x.length)], int: (x, y) => x + Math.floor(f() * (y - x + 1)) }; }

  let S, tab = 'world', sceneUp = false, sub = 'work', lsub = 'sandbox', sel = null, ready = false, engineErr = '', COLS = {}, benchSlot = 'weapon', con = { sql: '', res: null };
  const fresh = () => ({ v: 6, wv: 2, dungeon: null, dungeons: {}, deathPending: null, seen: {}, gd: -1, gn: 0, bank: { gold: 0, items: [] }, homes: [], runes: 0, tabs: {}, tw: {}, vault: {}, letter: 0, archive: 0, cache: {}, campT: 0, meat: 0, met: {}, pk: { n: 0, net: 0 }, food: {}, er: { a: {}, d: {}, n: 0 }, poi: {}, fishd: {}, fishlog: {}, cs: {}, known: {}, name: '', tut: 0, pages: {}, scr: {}, jr: {}, hints: 1, page: null, gold: 30, path: null, look: null, hp: 50, sk: {}, wsk: null, been: { 1: 1 }, skills: {}, done: {}, seen: {}, boss: {}, rum: {}, inv: [], eq: {}, codex: {}, mats: {}, tonics: 1, streak: 0, best: 0, stats: { q: 0, ok: 0, kills: 0, steals: 0, dungeons: 0, falls: 0 }, region: 1, pos: null, intro: 0, mv: 0, talked: 0, rival: {}, dpity: {}, rounds: null, stall: null, won: 0, rev: 0, at: 0 });
  const migrate = o => { if (!o || ![5,6].includes(o.v)) return fresh(); const f = fresh(), s = Object.assign(f, o, {v:6}); if (!o.seen && o.tut >= 3) s.seen = { fight: 1, fprompt: 1, bag: 1, hero: 1, map: 1, ledger: 1, shop: 1 }; if (!o.g && o.tut >= 3) s.g = 'done'; if (s.casino) { s.gold += s.casino.stack || 0; s.casino = null; } if (o.wv !== 2) { s.pos = null; s.wv = 2; } s.stats = Object.assign(fresh().stats, s.stats || {}); return s; };

  /* ---------- saving: this device first, then the player's Claude account when available ---------- */
  const Cloud = { ref: null, state: 'device', busy: false, dirty: false, timer: 0 };
  /* the account: five character slots. The first character made is the main and carries the story. Houses and named rares are shared; each character keeps its own bank */
  const AKEY = 'brasswake.acct.v7', NSLOT = 5;
  const freshA = () => ({ v: 7, rev: 0, at: 0, cur: -1, main: -1, slots: Array(NSLOT).fill(null), homes: [], codex: {}, paid: {}, djp: {}, cmds: {} });
  let A = null;
  const isMain = () => !!A && A.cur >= 0 && A.cur === A.main, mainName = () => (A && A.main >= 0 && A.slots[A.main] && A.slots[A.main].name) || 'your main character';
  const linkS = s => { s.homes = A.homes; s.codex = A.codex; return s; }, slotOut = s => { const o = Object.assign({}, s); delete o.homes; delete o.codex; return o; };
  function purgeOld() { try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.indexOf('brasswake.save') === 0) localStorage.removeItem(k); } } catch (e) { } }
  function loadA() { try { const t = localStorage.getItem(AKEY) || localStorage.getItem('brasswake.acct.v6'), o = t ? JSON.parse(t) : null; return o && [6,7].includes(o.v) ? Object.assign(freshA(), o, {v:7}) : null; } catch (e) { return null; } }
  function loadCur() { S = linkS(A.cur >= 0 && A.slots[A.cur] ? migrate(A.slots[A.cur]) : fresh()); if(S.deathPending){S.region=S.deathPending.r;S.pos=S.deathPending.at;S.dungeon=null;S.hp=maxHp();S.deathPending=null;} if (!(S.hp > 0)) S.hp = maxHp(); }
  function syncA() { if (A && A.cur >= 0 && S && S.path) A.slots[A.cur] = slotOut(S); if(A)for(const s of A.slots)if(s)DungeonProgress.compact(s,now()); }
  function save() { if (sceneUp && DG && Scene.inDungeon()) DP.snapshot(); if (!A) A = freshA(); if (A.cur >= 0 && S && S.path) { S.rev++; S.at = now(); } syncA(); A.rev++; A.at = now(); try { localStorage.setItem(AKEY, JSON.stringify(A)); } catch (e) { } if (Cloud.ref) { Cloud.dirty = true; clearTimeout(Cloud.timer); Cloud.timer = setTimeout(flush, 2500); } }
  async function flush() {
    if (Cloud.busy || !Cloud.dirty || !Cloud.ref) return; Cloud.busy = true; Cloud.dirty = false;
    try { syncA(); await Cloud.ref.set({ json: JSON.stringify(A), rev: A.rev, at: A.at }); Cloud.state = 'account'; }
    catch (e) { if (e && e.code === 'unavailable') Cloud.dirty = true; else { Cloud.state = 'device'; Cloud.ref = null; } }
    Cloud.busy = false; if (Cloud.dirty && Cloud.ref) Cloud.timer = setTimeout(flush, 5000);
  }
  async function cloudInit() {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]); if (!db || !user) return;
      const id = await user.id(); if (!id) return;
      const ref = db.doc('data/users/' + id + '/acct');
      try { const old = db.doc('data/users/' + id + '/save'), o = await old.get(); if (o.exists && old.delete) await old.delete(); } catch (e) { }   // saves from before the account existed are gone
      const snap = await Promise.race([ref.get(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 10000))]);
      if (snap.exists) { const d = snap.data(); const remote = d && d.json ? JSON.parse(d.json) : null; if (remote && [6,7].includes(remote.v) && (remote.rev || 0) > (A.rev || 0)) { A = Object.assign(freshA(), remote, {v:7}); loadCur(); cmdBackfill(); syncA(); try { localStorage.setItem(AKEY, JSON.stringify(A)); } catch (e) { } Q = null; F = null; $('#enc').hidden = true; $('#fight').hidden = true; $('#nav').hidden = false; DG = null; if (sceneUp) {Scene.load(S.pos, S.pos ? S.region : 'dock');if(S.dungeon)DP.restore();surfaceBodies();} toast('Loaded your saved game'); if (!$('#title').hidden) title(); } }
      Cloud.ref = ref; Cloud.state = 'account'; if (A.rev > 0) { Cloud.dirty = true; flush(); }
      render();
    } catch (e) { Cloud.state = 'device'; }
  }

  /* ---------- character: ten skills sharing 400 points, and health ---------- */
  const RPG = [['swords', 'Swordsmanship', 'Heavy hits. Four swings a round.'], ['fencing', 'Fencing', 'Lighter hits. Five swings a round.'], ['archery', 'Archery', 'A free opening round.'], ['magery', 'Magery', 'Spells that strike from range.'], ['stealing', 'Stealing', 'Lifting gold and goods.'], ['hiding', 'Hiding', 'Sneaking close to steal. Slipping away.'], ['smith', 'Blacksmithing', 'Gear at the workbench.'], ['alchemy', 'Alchemy', 'Draughts and scrolls at the workbench.'], ['carpentry', 'Carpentry', 'Furniture for your house.'], ['healing', 'Healing', 'Binding wounds after a fight.'], ['fishing', 'Fishing', 'Better fish, then rare ones, then sunken things.']];
  const PATHS = [{ id: 'warrior', name: 'Warrior', sk: { swords: 40, healing: 30 } }, { id: 'thief', name: 'Thief', sk: { stealing: 40, hiding: 30 } }, { id: 'crafter', name: 'Crafter', sk: { smith: 40, carpentry: 30 } }, { id: 'mage', name: 'Mage', sk: { magery: 40, alchemy: 30 } }];
  const WEAP = { swords: { n: 'Sword', verb: 'Strike', swings: 4, dmg: [9, 13] }, fencing: { n: 'Rapier', verb: 'Lunge', swings: 5, dmg: [6, 10] }, archery: { n: 'Bow', verb: 'Loose', swings: 4, dmg: [7, 11], opening: 1 }, magery: { n: 'Spell', verb: 'Cast', swings: 4, dmg: [8, 12] } };
  const CAP = 400, skCap = id => (S.pcap && S.pcap[id]) || 100, gainBoost = () => (S.boost || 0) > Date.now(), rv = id => S.sk[id] || 0, rpgName = id => RPG.find(x => x[0] === id)[1];
  const total = () => Math.round(Object.values(S.sk).reduce((a, b) => a + b, 0) * 10) / 10;
  const maxHp = () => 50 + Math.round(total() / 8);
  const heal = (n, quiet) => { const b = S.hp; S.hp = Math.max(0, Math.min(maxHp(), Math.round(S.hp + n))); if (!quiet && S.hp > b && typeof Scene !== 'undefined') Scene.FX.heal(); return S.hp - b; };
  const diffOf = (t, elite, boss) => Math.min(100, (t - 1) * 12 + 8 + (elite ? 8 : 0) + (boss ? 14 : 0));
  const bestWeapon = () => Object.keys(WEAP).reduce((a, b) => rv(b) > rv(a) ? b : a, 'swords');
  const mkFoe = (t, diff, mult, boss) => { const hp = Math.round((30 + 6 * t) * mult); return { hp, max: hp, diff, swings: boss ? 3 : 2 }; };
  // the roll: skill against difficulty sets the base chance, then the grade of the query scales it
  function odds(skill, diff, grade, share) {
    const base = Math.max(10, Math.min(95, 50 + 2 * (skill - diff)));
    const p = grade === 'correct' ? Math.max(base, 35) : grade === 'close' ? base * .6 : grade === 'partial' ? base * (.3 + .2 * Math.max(0, Math.min(1, ((share || .5) - .5) / .5))) : base * .05;
    return { base, p: Math.round(p) };
  }
  // a skill rises with use, fastest when the target is near your level, and stops when the ten skills total 400
  function gain(id, diff, quality) {
    const v = rv(id), cp = skCap(id), room = CAP - total(); if (v >= cp || !(quality > 0)) return null; if (room <= 0) return { id, before: v, after: v, capped: true };
    // gains slow sharply past 40, UO style: the last ten points to Grandmaster take most of the work
    let g = 2.4 * Math.max(.2, 1 - Math.abs(v - diff) / 45) * (v < 30 ? 1.6 : 1) * (v >= 100 ? .01 : Math.min(1, Math.max(.015, Math.pow((100 - v) / 60, 2.2)))) * quality * (1 + learnPct() / 100) * (gainBoost() ? 2 : 1) * ((S.rest || 0) > Date.now() ? 1.25 : 1);
    g = Math.min(g, room, cp - v); g = Math.floor(g * 10) / 10 + (rnd() < (g * 10) % 1 ? .1 : 0); g = Math.round(Math.min(g, room, cp - v) * 10) / 10; if (g <= 0) return null; S.sk[id] = Math.round((v + g) * 10) / 10; return { id, before: v, after: S.sk[id] };
  }
  const rankName = () => { const m = Object.keys(S.boss).length; return S.won ? 'Winner of the Trials' : m ? `Tallyport’s champion · ${m} mark${m > 1 ? 's' : ''}` : 'Tallyport’s champion'; };
  // SQL techniques are still tracked underneath: they decide which query patterns come back
  const sk = id => S.skills[id] || (S.skills[id] = { v: 0, t: 0, n: 0 });
  const rusty = id => { const s = S.skills[id]; return !!s && s.v >= 10 && now() - s.t > 20 * 3600e3; };
  const skTitle = v => v >= 120 ? 'Legendary' : v >= 115 ? 'Elder' : v >= 110 ? 'Grandmaster+' : v >= 100 ? 'Grandmaster' : v >= 90 ? 'Master' : v >= 80 ? 'Adept' : v >= 70 ? 'Expert' : v >= 60 ? 'Journeyman' : v >= 50 ? 'Apprentice' : v >= 40 ? 'Novice' : v >= 30 ? 'Neophyte' : v > 0 ? 'Initiate' : 'Untrained';
  // power scrolls lift one skill's cap past 100; Scrolls of Study double skill gain for half an hour
  const pscrName = x => `Power scroll: ${rpgName(x.id)} ${x.cap}`;
  function makePscr(t) { const top = RPG.map(x => x[0]).sort((a, b) => rv(b) - rv(a)).slice(0, 3), cap = t >= 8 ? (rnd() < .15 ? 120 : 115) : t === 7 ? 110 : t === 6 ? (rnd() < .3 ? 110 : 105) : 105; return { id: pick(top), cap }; }
  // the dojo masters teach the basics of any skill, for a fee that climbs with every point
  const TRAIN_CAP = 45, tCost = v => Math.round(10 + 1.5 * Math.floor(v));
  function trainCost(id, n) { let v = rv(id), c = 0, k = 0; while (k < n && v < TRAIN_CAP) { c += tCost(v); v = Math.min(TRAIN_CAP, Math.floor(v) + 1); k++; } return { c, to: v }; }
  function trainSheet() { const room = CAP - total();
    sheet(`<p class="eyebrow">The dojo</p><h2>Lessons</h2><p class="cap2">A master will bring any skill up to ${TRAIN_CAP}. Past that you learn by doing. You have ${S.gold} gold${room < 5 ? ` and room for ${room.toFixed(1)} more skill points` : ''}.</p><ul class="goods">${RPG.map(([id, nm]) => { const v = rv(id), one = trainCost(id, 1), five = trainCost(id, 5);
      return `<li class="good"><div><b>${nm}</b><small>${v.toFixed(1)}${v >= TRAIN_CAP ? ' · nothing more to teach' : ''}</small></div>${v >= TRAIN_CAP ? '' : `<div class="row"><button class="btn sm quiet" data-a="train" data-id="${id}" data-n="1"${S.gold >= one.c && room >= 1 ? '' : ' disabled'}>+1 · ${one.c}</button><button class="btn sm" data-a="train" data-id="${id}" data-n="5"${S.gold >= five.c && room >= five.to - v ? '' : ' disabled'}>to ${five.to} · ${five.c}</button></div>`}</li>`; }).join('')}</ul><div class="row end"><button class="btn solid" data-a="closesheet">Done</button></div>`); }
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
  const STATN = { dmg: 'Damage', def: 'Defence', xp: 'Damage', gold: 'Gold', learn: 'Skill gain', luck: 'Luck', deft: 'Deftness' };
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
  function makeItem(rarity, tier, slot, w) {
    slot = slot || pick(['weapon', 'weapon', 'armor', 'shield', 'ring', 'charm', 'head', 'hands', 'feet', 'cloak']); const ri = RAR.indexOf(rarity), g = GRADE[rarity], it = { id: 'i' + rid(), slot, rarity, tier, stats: {} };
    if (slot === 'weapon') { it.w = w || pick(Object.keys(WEAP)); it.stats.dmg = [6, 12, 20, 30, 42][ri] + tier * 2 + rint(0, 3); const V = pick(WV.filter(x => x.w === it.w && x.g <= g)); it.v = V.v; it.name = PRE[rarity] + (MATW[it.w][g] ? MATW[it.w][g] + ' ' : '') + V.n; it.ic = V.ic || `w_${it.w}_${g + 1}`; }
    else if (slot === 'head' || slot === 'hands' || slot === 'feet' || slot === 'cloak') { const thief = slot === 'hands' && rnd() < .3; it.name = PRE[rarity] + (thief ? 'Thief’s Gloves' : pick(GEAR[slot][g])); it.stats.def = { head: [2, 4, 6, 9, 12], hands: [1, 3, 5, 7, 10], feet: [1, 3, 5, 7, 10], cloak: [1, 2, 4, 6, 8] }[slot][ri] + Math.ceil(tier / 3);
      if (thief) it.stats.deft = [4, 7, 10, 14, 18][ri] + Math.floor(tier / 2); else if (slot === 'cloak') it.stats[pick(['luck', 'learn'])] = rint(2, 4) + ri * 2; else if (/Wizard|Circlet/.test(it.name)) it.stats.learn = rint(2, 4) + ri * 2; it.ic = GEARIC(it.name.replace(PRE[rarity], '')); }
    else if (slot === 'shield' && rnd() < .25) { const nm = pick(['Glass Orb', 'Spellbook']); it.stats.def = [2, 3, 5, 8, 11][ri] + Math.ceil(tier / 3); it.stats.learn = rint(3, 5) + ri * 2; it.name = PRE[rarity] + nm; it.ic = GEARIC(nm); it.off = nm === 'Glass Orb' ? 23 : 24; }
    else if (slot === 'armor' || slot === 'shield') { it.stats.def = (slot === 'armor' ? [4, 7, 11, 16, 22] : [3, 5, 8, 12, 16])[ri] + Math.ceil(tier / 2) + rint(0, 2); it.name = PRE[rarity] + GN[slot][g]; it.ic = `${slot}_${g + 1}`; }
    else { const n = ri >= 2 ? 2 : 1, [lo, hi] = [[2, 4], [4, 7], [4, 8], [7, 12], [9, 14]][ri], keys = ['gold', 'learn', 'luck'].sort(() => rnd() - .5).slice(0, n), v = rint(0, 3); keys.forEach(k => it.stats[k] = rint(lo, hi) + Math.floor(tier / 3)); it.name = PRE[rarity] + GN[slot][v] + ' ' + SUF[keys[0]]; it.ic = `${slot}_${v + 1}`; }
    return it;
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
  const dmgPct = w => { const it = itemById(S.eq.weapon); return (it && it.w === w ? it.stats.dmg || 0 : 0) + bonus('xp'); };   // a weapon only helps the skill it is made for
  const statLine = it => (it.w ? rpgName(it.w) + ' · ' : '') + Object.keys(it.stats).map(k => `+${it.stats[k]}% ${STATN[k]}`).join(' · ');
  const IFB = { trune: 'sigil', deed: 'scroll', fish: 'bread', bigfish: 'bread', cheese: 'bread', pie: 'bread', honey: 'draught', cider: 'draught', loaf: 'bread', eggs: 'bread', apple: 'bread', chicken: 'bread', rod: 'picks', meat: 'bread', ration: 'bread', pelt: 'hide', stew: 'bread', salve: 'bandage', hintkey: 'key', chips_gold: 'coin', wheel: 'gem', shoe: 'scroll', scroll_arms: 'scroll', scroll_spell: 'scroll', scroll_shadow: 'scroll', scroll_craft: 'scroll' };
  const ico = (name, n) => { if (ART && /^(dz|hq)\d/.test(name || '')) return `<i class="ico dz" style="background:url(art/i/${name}.webp) center/contain no-repeat">${n != null ? `<b>${n}</b>` : ''}</i>`; const I = ART && ArtData.icons, a = I && (I.at[name] || I.at[IFB[name]]); return `<i class="ico${a ? '' : ' none'}"${a ? ` style="background-position:${-a[0] * 44}px ${-a[1] * 44}px"` : ''}>${n != null ? `<b>${n}</b>` : ''}</i>`; };
  const lootHTML = it => `<div class="loot rar-${it.rarity}">${ico(it.ic)}<div><small>${it.rarity} ${it.slot}${it.unique ? ' · named rare' : ''}${it.unique || it.bless ? ' · blessed' : it.ins ? ' · insured' : ''}</small><b>${esc(it.name)}</b><span class="stats">${statLine(it)}</span>${it.lore ? `<span class="lore">${esc(it.lore)}</span>` : ''}${it.sold ? `<small>Bag full: sold for ${it.sold} gold.</small>` : ''}</div></div>`;

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
  function stall() { if (!S.stall || S.stall.r !== S.region || S.stall.n >= 6) S.stall = { r: S.region, n: 0, stock: [1, 1, 2, rnd() < .35 ? 3 : 2].map(m => makeItem(RAR[m], S.region)) }; return S.stall; }
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
    fight: 'Pick a page to attack with. The number is your chance to hit if your query is right.',
    fprompt: 'Write the query. One query sets your odds for the next three rounds. Tables shows the data; a hint costs hit chance.',
    loot: 'Tap a body to open it, then tap what you want. Take all grabs everything.',
    bag: 'Tap a draught or food to heal. Scrolls add pages to your books. Hides and materials sell or go into crafting.',
    hero: 'Your books hold the pages you can use. Skills rise as you use them; together they cannot pass 400.',
    map: 'Pins are towns. Gold dots are errands you have taken.',
    ledger: 'A free copy of the Ledger: query or change anything, nothing is scored.',
    fish: 'Each cast is one question. Deeper water asks harder ones and holds better catches; Fishing skill unlocks rare fish and sunken things.',
    errand: 'Errands are small jobs from country folk. They show on your Map until done.',
    place: 'Places in the wild can be searched once, or once a day, for gold, gear or a story.',
    shop: 'Tap a page to buy it. Pages from a master’s circle ask questions from that circle.',
    trade: 'Country folk sell food and odds and ends. Stock changes each day.',
    poker: 'Six-seat hold’em. On each street you may write one COUNT query against the other hands to get a read.',
    wheel: 'Bet on a slot, then write a query that predicts where the wheel is weighted.',
    bj: 'Blackjack against the house. A query can count the cards left in the shoe.',
    stealth: 'Shadows pages let you steal from a creature that has not seen you.',
    lair: 'A lair holds tougher creatures and a leader one Circle harder. The leader carries its best things once a day, sometimes a teleport rune.',
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
  function toast(msg) { const d = document.createElement('div'); d.textContent = msg; $('#toast').appendChild(d); setTimeout(() => d.remove(), 2600); }
  function sheet(html) { closeSay(); $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; $('.sheet-card').scrollTop = 0; }
  const closeSheet = () => { $('#sheet').hidden = true; closeSay(); unCoach('loot', 'fish', 'place', 'shop', 'trade', 'errand'); };
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
    KB.tables = task.tables || tablesIn(task.sql + ' ' + (task.check || '')); KB.kw = task.kw || KWC[circle] || null; KB.tbl = KB.tables[0] || null; KB.shift = KB.sym = false; KB.run = runLabel; KB.list = null;
    return `<div class="qp"><label for="sql" class="vh">Your query</label><div class="qbox"><pre id="sqlhl" class="sqlhl" aria-hidden="true"></pre><textarea id="sql" rows="2" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" inputmode="${KB.sys ? 'text' : 'none'}" placeholder="Your query"></textarea></div>${S.klog ? '<p id="klog" class="klog">Key log: tap keys and it fills in here</p>' : ''}<div id="kb" class="kb"></div></div>`;
  }
  function kbDraw() {
    const el = $('#kb'); if (!el) return; const key = (k, cls, lab) => `<button type="button" class="k ${cls || ''}" data-k="${esc(k)}">${lab || esc(k)}</button>`;
    // one row for tables, then the columns of the table last tapped, then * and a comma; one row for the commands
    const bar = `<div class="kbar"><button type="button" class="k kb-b${KB.list === 'cmd' ? ' on' : ''}" data-fn="lcmd">Commands</button><button type="button" class="k kb-b${KB.list === 'fld' ? ' on' : ''}" data-fn="lfld">Fields</button><button type="button" class="k kb-b" data-fn="fmt">Format</button></div>`;
    if (KB.list) { const li = (v, cls, lab) => `<button type="button" class="li ${cls || ''}" data-ins="${esc(v)}">${lab || esc(v)}</button>`;
      const TOP = [',', '*', "'"], symAll = (SqlEd.LISTS.find(([g]) => g === 'Symbols') || ['', []])[1].filter(x => !TOP.includes(x));
      const learned = SqlEd.LISTS.filter(([g]) => g !== 'Symbols').map(([g, xs]) => [g, xs.filter(cmdHas)]).filter(([g, xs]) => xs.length);
      const groups = KB.list === 'cmd' ? `<div class="lgrid ltop">${TOP.map(x => li(x, 'sy')).join('')}<button type="button" class="li lsym${KB.lsym ? ' on' : ''}" data-fn="lsym">Symbols ${KB.lsym ? '▴' : '▾'}</button></div>` + (KB.lsym ? `<div class="lgrid lsyms">${symAll.map(x => li(x, 'sy')).join('')}</div>` : '') + (learned.length ? learned.map(([g, xs]) => `<p class="lg">${g}</p><div class="lgrid">${xs.map(x => li(x, 'kw')).join('')}</div>`).join('') : '<p class="cap2 lnone">Commands appear here as lessons teach them. You can always type any command.</p>')
        : (() => { const mine = KB.tables, rest = World.ORDER.filter(t => !mine.includes(t)), tb = t => `<p class="lg">${li(t, 'tb', esc(t))}</p><div class="lgrid">${(COLS[t] || []).map(c => li(c, 'cl')).join('')}</div>`; return mine.map(tb).join('') + (rest.length && !TR ? `<p class="lg lg2">Other tables</p>` + rest.map(tb).join('') : ''); })();
      el.className = 'kb listing'; el.innerHTML = bar + `<div class="klist" id="klist">${groups}</div><div class="row last"><button type="button" class="k fn" data-fn="ldone">Done</button>${KB.list === 'fld' ? '<button type="button" class="k sy ksy" data-ins="," aria-label="Comma">,</button><button type="button" class="k sy ksy" data-ins="*" aria-label="Star">*</button>' : ''}<button type="button" class="k fn" data-fn="del" aria-label="Delete">⌫</button><button type="button" class="k go" data-fn="run"${ready ? '' : ' disabled'}>${esc(ready ? KB.run : 'Opening…')}</button></div>`; return; }
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
  function kbGrow() { const ta = $('#sql'); if (!ta) return; const min = parseFloat(getComputedStyle(ta).minHeight) || 52, lh = 16 * 1.3, max = Math.round(lh * 6 + 16); ta.style.height = 'auto'; const h = Math.min(max, Math.max(min, ta.scrollHeight + 2)); ta.style.height = h + 'px'; if (ta.selectionStart >= ta.value.length) ta.scrollTop = ta.scrollHeight; hlSync(); if (h !== ta._h) { ta._h = h; fitAll(); } }
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
    if (d.fn === 'lcmd' || d.fn === 'lfld') { KB.list = KB.list === d.fn.slice(1) ? null : d.fn.slice(1); kbDraw(); return fitAll(); }
    if (d.fn === 'ldone') { KB.list = null; kbDraw(); return fitAll(); }
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
  let kbRep = 0, tapT = 0; const ghost = e => !FAST() && performance.now() - tapT < 450 && e.target.tagName !== 'CANVAS' && !e.target.closest('#kb');
  document.addEventListener('pointerdown', e => { if (e.target && e.target.tagName === 'CANVAS') tapT = performance.now(); }, true);
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
  document.addEventListener('pointerdown', e => { const kb = e.target.closest && e.target.closest('#kb'); if (!kb) return; e.preventDefault(); if (e.target.closest('#klist')) return; const t0 = performance.now(), dt = t0 - (tapT || t0);
    const [k, why] = kbPick(kb, e.clientX, e.clientY, e.target); if (S && S.klog) kbLog(k, why, dt); if (!k || k.disabled) return; tapT = t0; if (k.closest('.row') && !k.dataset.fn) kbLetterT = t0; k.classList.add('dn'); setTimeout(() => k.classList.remove('dn'), 110); kbPress(k); if (k.dataset.fn === 'del') { clearTimeout(kbRep); const again = () => { const b = $('#kb [data-fn="del"]'); if (!b) return; kbPress(b); kbRep = setTimeout(again, 70); }; kbRep = setTimeout(again, 380); } });
  for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => clearTimeout(kbRep));
  // with the phone keyboard up, iOS shrinks only the visual viewport: lift the docked panel by the covered height while the box has focus
  function vvFit() { const vv = window.visualViewport, ta = $('#sql'), on = KB.sys && ta && document.activeElement === ta && vv, kb = on ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0; $('#app').style.setProperty('--kb', kb + 'px'); if (on && kb > 0) window.scrollTo(0, 0); fitPanel(); fitQ(); }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', vvFit); window.visualViewport.addEventListener('scroll', vvFit); }
  document.addEventListener('focusin', vvFit); document.addEventListener('focusout', () => setTimeout(vvFit, 60));
  document.addEventListener('input', e => { if (e.target && e.target.id === 'sql') { if (e.data && /^[ ,()\n]$/.test(e.data)) { const ta = e.target, s = ta.selectionStart; ta.setSelectionRange(s - 1, s - 1); upWord(ta, e.data === '('); const t = ta.selectionStart + 1; ta.setSelectionRange(t, t); } kbGrow(); } });

  /* ---------- rewards ---------- */

  /* ---------- learned commands (account-wide): A.cmds[lesson] is 1 once the lesson is opened (its commands join the Commands panel) and 2 once a correct query has used one of them ---------- */
  const cmdTitle = k => k === 'intro' ? 'SELECT and FROM' : ((CONTRACTS.find(c => c.id === k) || {}).lesson || {}).title || k;
  const cmdSet = () => A.cmds || (A.cmds = {});
  function cmdTeach(k) { if (!CMDS[k] || cmdSet()[k]) return; A.cmds[k] = 1; if (!CMDS.intro.every(x => CMDS[k].includes(x))) toast('New in Commands: ' + cmdTitle(k)); }
  const cmdHas = label => Object.keys(cmdSet()).some(k => CMDS[k] && CMDS[k].includes(label));
  function cmdUsed(label, tk) { const core = []; for (const t of SqlEd.tokens(label)) { if (t[0] === 'w') core.push(t[1].toUpperCase()); else if (t[0] !== 'ws') break; }
    if (!core.length) return tk.some(x => x[1] === label); const br = label.includes('(');
    for (let i = 0; i + core.length <= tk.length; i++) if (core.every((w, j) => tk[i + j][0] === 'w' && tk[i + j][1].toUpperCase() === w) && (!br || (tk[i + core.length] && tk[i + core.length][1] === '('))) return true; return false; }
  function cmdLearn(sql) { if (!sql || !A) return; const tk = SqlEd.tokens(sql).filter(t => t[0] !== 'ws' && t[0] !== 'cm'); let n = 0;
    for (const k of Object.keys(CMDS)) { if (cmdSet()[k] === 2 || !CMDS[k].some(l => cmdUsed(l, tk))) continue; A.cmds[k] = 2; S.hints = (S.hints || 0) + 1; setTimeout(() => toast('Learned ' + cmdTitle(k) + '! +1 Hint Key'), 700 + 1500 * n++); } }
  function cmdBackfill() { if (!A) return; cmdSet(); for (const sl of A.slots) { if (!sl) continue; if (sl.stats && sl.stats.ok > 0 && !A.cmds.intro) A.cmds.intro = 2; for (const k of Object.keys(CMDS)) { if (k === 'intro' || A.cmds[k] === 2) continue; if (sl.done && sl.done[k]) A.cmds[k] = 2; else if (sl.seen && sl.seen[k] && !A.cmds[k]) A.cmds[k] = 1; } } }
  function trainSql(used, tier, sql) { cmdLearn(sql); if (!S.odp && used.includes('cte') && used.includes('window') && (used.includes('join') || used.includes('outer'))) { S.odp = 1; setTimeout(() => toast('Odalys Brine will want to hear about that query.'), 900); } const cap = Math.min(100, 30 + tier * 10); for (const id of used) { const s = sk(id), r = rusty(id); if (s.v < cap) s.v = Math.min(cap, Math.round((s.v + Math.max(.1, 4.5 * (1 - s.v / cap)) * (r ? 2 : 1)) * 10) / 10); s.t = now(); s.n++; } }
  function grant(o) {
    const gold = Math.round((o.gold || 0) * (o.raw ? 1 : 1 + bonus('gold') / 100)); S.gold += gold;   /* o.raw: your own gold back from your body is not a find */ for (const k in (o.mats || {})) S.mats[k] = have(k) + o.mats[k]; if (o.sigils) S.mats.sigil = have('sigil') + o.sigils; if (o.meat) S.meat = (S.meat || 0) + o.meat; for (const k in (o.food || {})) addFood(k, o.food[k]); if (o.hide) S.mats.hide = have('hide') + o.hide; if (o.runes) S.runes = (S.runes || 0) + o.runes; if (o.bless) S.blessd = (S.blessd || 0) + o.bless; if (o.gscr) S.gscr = (S.gscr || 0) + o.gscr; (o.pscr || []).forEach(x => (S.pscr = S.pscr || []).push(x));
    const scr = (o.scrolls || []).filter(id => !owned(id) && !S.scr[id]); scr.forEach(addScroll);
    if (!o.raw && ((o.items || []).some(it => it.unique || it.rarity === 'epic' || it.rarity === 'legendary') || scr.some(id => pageById(id).rare))) Sound.sfx('reward');
    return { gold, mats: o.mats || {}, sigils: o.sigils || 0, meat: o.meat || 0, hide: o.hide || 0, runes: o.runes || 0, bless: o.bless || 0, gscr: o.gscr || 0, pscr: o.pscr || [], food: o.food || {}, items: (o.items || []).map(give).filter(Boolean), scrolls: scr.map(pageById) };
  }
  const gainLine = g => g && g.length ? `<p class="gline">${g.map(x => `${rpgName(x.id)} ${x.capped ? 'at cap' : '+' + (x.after - x.before).toFixed(1)}`).join(' · ')}</p>` : '';
  const gainsHTML = g => g && g.length ? `<div class="gain">${g.map(x => `<span>${rpgName(x.id)}</span><span class="${x.capped ? 'cap' : ''}">${x.capped ? 'skill cap reached' : x.before.toFixed(1) + ' → ' + x.after.toFixed(1)}</span>`).join('')}</div>` : '';
  const bitsOf = g => { const bits = []; if (g.gold) bits.push(`+${g.gold} gold`); for (const k in (g.food || {})) bits.push(`+${g.food[k]} ${FOOD[k][0]}`); for (const k in g.mats) if (g.mats[k]) bits.push(`+${g.mats[k]} ${matName(k)}`); if (g.sigils) bits.push(`+${g.sigils} Brass Sigil`); if (g.meat) bits.push(`+${g.meat} Meat`); if (g.hide) bits.push(`+${g.hide} Hide`); if (g.runes) bits.push(`+${g.runes} Teleport rune`); if (g.bless) bits.push(`+${g.bless} Bless deed`); if (g.gscr) bits.push(`+${g.gscr} Scroll of Study`); (g.pscr || []).forEach(x => bits.push(pscrName(x))); return bits; };
  function spoilsHTML(g) { const bits = bitsOf(g); return `${bits.length ? `<p class="spoils">${bits.join(' · ')}</p>` : ''}${g.items.map(lootHTML).join('')}${(g.scrolls || []).map(scrollHTML).join('')}`; }
  const codeHL = q => { try { return SqlEd.hl(SqlEd.format(String(q)), hlTables()); } catch (e) { return esc(String(q)); } };
  const answerHTML = t => `<details class="lesson" open><summary>What would have worked</summary><div class="lb"><pre class="code">${codeHL((t.sql))}</pre></div></details>`;
  const lessonHTML = (l, open) => `<details class="lesson"${open ? ' open' : ''}><summary>${esc(l.title)}</summary><div class="lb"><pre class="code">${codeHL(l.code)}</pre><p>${esc(l.body)}</p></div></details>`;
  const needsHTML = t => t.kind === 'dml' ? `<div class="needs"><span>This one changes the Ledger. It runs on a copy and is judged by what the copy holds afterwards.</span></div>` : `<div class="needs"><span>Your answer needs these columns:</span>${t.ret.split(',').map(x => `<code>${esc(x.trim())}</code>`).join('')}<span>${t.order ? 'sorted as asked' : 'rows in any order'}</span></div>`;

  /* ---------- help: tables, expected result and hint behind one button ---------- */
  const ctx = () => Q || F || DU;
  function helpSheet() {
    const c = ctx(), t = c && c.task; if (!t) return; const tabs = tablesIn(t.sql + ' ' + (t.check || '')), full = !!Q && !Q.roll; let w = null; try { w = Engine.target(t); } catch (e) { }
    const maxH = c.noHint ? 0 : Q && Q.kind === 'contract' ? 3 : 1, lv = c.hint + 1, cost = hintCost(lv, c.r), key = S.hints > 0 && cost > 0;
    sheet(`<h2>Help</h2><section class="sec"><h2>Tables</h2>${tabs.map(n => `<details class="lesson"><summary>${n}</summary><div class="lb"><div class="ret">${(COLS[n] || []).map(x => `<code>${x}</code>`).join('')}</div>${tableHTML(Engine.peek(n), 4)}</div></details>`).join('')}<div class="row"><button class="btn sm quiet" data-a="atlas">All tables</button></div></section>
      <section class="sec"><h2>Expected result</h2>${t.kind === 'dml' ? `<p class="cap2">Afterwards this must return:</p><pre class="code">${codeHL((t.check))}</pre>` : ''}${w ? (full ? tableHTML(w, 8) : `<p>${w.rows.length} row${w.rows.length === 1 ? '' : 's'}, with these columns:</p><div class="ret">${w.cols.map(x => `<code>${esc(x)}</code>`).join('')}</div>`) : ''}<p class="cap2">Column names can differ. Values and column order${t.order ? ', and row order,' : ''} must match.</p></section>
      <section class="sec"><h2>Hint</h2>${c.hints.join('')}${maxH === 0 ? '<p class="cap2">No hints for this one.</p>' : c.hint >= maxH ? '<p class="cap2">No more hints.</p>' : `<div class="row"><button class="btn sm" data-a="hint">${['', 'A nudge', 'The shape of the answer', 'The answer'][lv]} · ${cost ? (key ? 'uses a Hint Key' : cost + ' gold') : 'free'}</button></div>`}</section>
      ${Q && Q.lesson ? `<section class="sec"><h2>The lesson</h2>${lessonHTML(Q.lesson, false)}</section>` : ''}`);
  }
  function takeHint() {
    const c = ctx(); if (!c || c.noHint) return; const maxH = Q && Q.kind === 'contract' ? 3 : 1; if (c.hint >= maxH) return; const lv = c.hint + 1, cost = hintCost(lv, c.r), key = S.hints > 0 && cost > 0;
    if (!key && S.gold < cost) return toast(`That hint costs ${cost} gold`); if (key) S.hints--; else S.gold -= cost; c.hint = lv; const t = c.task, txt = lv === 1 ? (t.hint || clauseHint(t.sql)) : lv === 2 ? skeleton(t.sql) : pretty(t.sql);
    c.hints.push(`<div class="hintbox"><b>${['', 'Nudge', 'Shape · pay −25%', 'Answer · pay −75%'][lv]}</b>${lv === 1 ? `<span>${esc(txt)}</span>` : `<pre class="code">${codeHL(txt)}</pre>`}</div>`); renderHud(); save(); helpSheet();
  }

  /* ---------- full-screen exercises: learn, your turn, result. One job a screen. ---------- */
  let Q = null;
  const REPS = [
    { ask: 'Show the name of every item.', ret: 'name', sql: 'SELECT name FROM items', tip: 'The same two words, with a different column and a different table. Tap the keys below, or type.', tables: ['items', 'vendors'] },
    { ask: 'Show the city of every customer.', ret: 'city', sql: 'SELECT city FROM customers', tip: 'Tap a table name to see its columns.', tables: ['customers', 'items'] },
    { ask: 'Show the name and the city of every customer.', ret: 'name, city', sql: 'SELECT name, city FROM customers', tip: 'Two columns: put a comma between them.', tables: ['customers', 'vendors'] },
    { ask: 'Show everything in the vendors table.', ret: 'every column', sql: 'SELECT * FROM vendors', tip: 'A star (*) means every column.', tables: ['vendors', 'items'] }
  ].map(x => Object.assign({ kind: 'read', title: 'First forms', kw: ['SELECT', 'FROM'] }, x));
  function tutTask() { const p = pick([['vendors', 'name'], ['items', 'name'], ['customers', 'city'], ['employees', 'name'], ['customers', 'name, city'], ['vendors', 'name, realm'], ['items', '*'], ['employees', '*']]); return { kind: 'read', title: 'First forms', ask: p[1] === '*' ? `Show everything in the ${p[0]} table.` : `Show the ${p[1].replace(', ', ' and the ')} of every ${p[0].slice(0, -1)}.`, ret: p[1] === '*' ? 'every column' : p[1], sql: `SELECT ${p[1]} FROM ${p[0]}`, kw: ['SELECT', 'FROM'], tables: [p[0]], tip: 'SELECT the column, then FROM the table.' }; }
  function openQ(cfg) { closeSay(); closeSheet(); Q = Object.assign({ tries: 0, hint: 0, hints: [], i: 0 }, cfg); if (!Q.step) Q.step = Q.lesson && Q.first ? 'learn' : 'turn'; Scene.pause(); $('#enc').hidden = false; $('#nav').hidden = true; drawQ(); }
  function closeQ() { const then = Q && Q.then; Q = null; $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; closeSheet(); Scene.refresh(); render(); if (then) then(); }
  function fitQ() { const d = $('#q-dock'), b = $('#q-body'); if (d && b) b.style.paddingBottom = d.offsetHeight + 14 + 'px'; }
  const showOut = () => { fitQ(); const o = $('#q-out'); if (o && o.scrollIntoView) o.scrollIntoView({ block: 'start', behavior: FAST() ? 'auto' : 'smooth' }); };
  function drawQ() {
    const el = $('#enc'), t = Q.task, hasL = !!Q.lesson || Q.kind === 'intro', names = hasL ? ['Learn', 'Your turn', 'Result'] : ['Your turn', 'Result'];
    const head = cur => `<header class="q-head"><button class="q-x" data-a="qleave">‹ Leave</button><div class="q-steps">${names.map(s => `<span class="${s === cur ? 'on' : ''}">${s}</span>`).join('<i>›</i>')}</div></header>`;
    el.className = 'q';
    if (Q.step[0] === 'i') return drawIntro(el, head('Learn'));
    if (Q.step === 'learn') {
      const l = Q.lesson, parts = l.body.split(/(?<=[.!?])\s+(?=[A-Z])/), lead = parts.slice(0, 2).join(' '), rest = parts.slice(2).join(' '); let ex = null; if (ready && /^\s*(SELECT|WITH)\b/i.test(l.code)) { ex = Engine.runRead(l.code); if (ex.err) ex = null; }
      el.innerHTML = head('Learn') + `<div class="q-body"><p class="eyebrow">${CIRCLE[Q.r]} Circle</p><h2>${esc(l.title)}</h2><p>${esc(lead)}</p><p class="lab">Example</p><pre class="code">${codeHL(l.code)}</pre>${ex ? `<p class="lab">What it returns</p>${tableHTML(ex, 5)}` : ''}${rest ? `<details class="lesson"><summary>More</summary><div class="lb"><p>${esc(rest)}</p></div></details>` : ''}</div><footer class="q-foot"><button class="btn solid big" data-a="qturn">Try it</button></footer>`; return;
    }
    if (Q.step === 'turn') {
      el.innerHTML = head('Your turn') + `<div class="q-body" id="q-body"><p class="eyebrow">${Q.tasks ? `${Q.i + 1} of ${Q.tasks.length}` : esc(Q.title || '')}</p>${t.tip ? `<p class="tip">${esc(t.tip)}</p>` : ''}<p class="ask">${esc(t.ask)}</p>${needsHTML(t)}${Q.roll ? `<p class="cap2">One query, one roll: ${odds(rv(Q.csk), Q.diff, 'correct').p}% if correct, ${odds(rv(Q.csk), Q.diff, 'close').p}% if close, ${odds(rv(Q.csk), Q.diff, 'wrong').p}% if wrong.</p>` : ''}<div id="q-out"></div></div>
        <div class="dock" id="q-dock"><div class="q-tools"><button class="btn sm quiet" data-a="help">Help</button><button class="btn sm quiet" data-a="clear">Clear</button></div>${kbHTML(t, Q.r, Q.roll ? 'Craft' : 'Run')}</div>`;
      kbDraw(); kbFocus(); fitQ(); return;
    }
    el.innerHTML = head('Result') + `<div class="q-body">${Q.result}</div><footer class="q-foot">${Q.nextId ? `<button class="btn big" data-a="qnext">Next exercise</button>` : ''}<button class="btn solid big" data-a="qleave">Continue</button></footer>`;
  }
  function drawIntro(el, head) {
    if (!ready) { el.innerHTML = head + `<div class="q-body">${wait()}</div>`; return; }
    if (Q.step === 'i1') { const v = Engine.runRead('SELECT name, realm, lead_time_days FROM vendors LIMIT 4');
      el.innerHTML = head + `<div class="q-body"><p class="eyebrow">Learn · 1 of 3</p><h2>Lesson 1: The Ledger is made of tables</h2><p>A table is a grid of facts. This one is called <b class="t-tab">vendors</b>.</p><div class="demo"><span class="tag t-tab">table: vendors</span><div class="tw"><table class="res demo-t"><thead><tr>${v.cols.map((c, i) => `<th class="${i === 1 ? 'hc' : ''}">${c}</th>`).join('')}</tr></thead><tbody>${v.rows.map((r, j) => `<tr class="${j === 1 ? 'hr' : ''}">${r.map((x, i) => `<td class="${i === 1 ? 'hc' : ''}">${fmt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div><ul class="legend"><li><b class="t-col">Column</b><span>One kind of fact, for every vendor. The shaded column is <code>realm</code>.</span></li><li><b class="t-row">Row</b><span>One vendor, with all its facts. The outlined row is one vendor.</span></li></ul></div><footer class="q-foot"><button class="btn solid big" data-a="qstep" data-s="i2">Next</button></footer>`; }
    else if (Q.step === 'i2') { const r = Engine.runRead('SELECT name FROM vendors LIMIT 4');
      el.innerHTML = head + `<div class="q-body"><p class="eyebrow">Learn · 2 of 3</p><h2>Lesson 2: A query has two parts</h2><p>SELECT says which column you want. FROM says which table it’s in.</p><div class="pattern"><span><b>SELECT</b><em>name</em><small>which column</small></span><span><b>FROM</b><em>vendors</em><small>which table</small></span></div><p class="lab">What it returns</p>${tableHTML(r, 4)}<p class="cap2">Capitals don’t matter: <code>select</code> works the same as <code>SELECT</code>.</p></div><footer class="q-foot"><button class="btn solid big" data-a="qstep" data-s="i3">Next</button></footer>`; }
    else { const B = Q.blank || (Q.blank = [null, null]), full = B[0] && B[1];
      el.innerHTML = head + `<div class="q-body"><p class="eyebrow">Learn · 3 of 3</p><h2>Lesson 3: Your first query</h2><p class="ask">Show the realm of every vendor.</p><p>Tap a word to drop it into the next blank. Tap a blank to empty it.</p><div class="blanks"><b>SELECT</b><button class="blank${B[0] ? ' full' : ''}" data-a="unblank" data-i="0" aria-label="First blank">${B[0] || '&nbsp;'}</button><b>FROM</b><button class="blank${B[1] ? ' full' : ''}" data-a="unblank" data-i="1" aria-label="Second blank">${B[1] || '&nbsp;'}</button></div><div class="chips big">${['vendors', 'name', 'items', 'realm'].map(w => `<button class="k" data-a="blank" data-w="${w}"${B.includes(w) ? ' disabled' : ''}>${w}</button>`).join('')}</div><div id="q-out">${Q.bout || ''}</div></div><footer class="q-foot">${Q.bok ? '<button class="btn solid big" data-a="qstep" data-s="reps">Now type one yourself</button>' : `<button class="btn solid big" data-a="blankrun"${full ? '' : ' disabled'}>Run</button>`}</footer>`; }
  }
  function blankRun() {
    const B = Q.blank; if (!B || !B[0] || !B[1]) return; const res = Engine.grade({ kind: 'read', sql: 'SELECT realm FROM vendors', ret: 'realm' }, `SELECT ${B[0]} FROM ${B[1]}`); S.stats.q++;
    if (res.err) Q.bout = `<div class="verdict bad"><h3>Not yet</h3><p>${esc(res.err)}</p><p>The column goes after SELECT. The table goes after FROM.</p></div>`;
    else if (!res.ok) Q.bout = `<div class="verdict bad"><h3>Not yet</h3><p>That returned ${esc(B[0])} from ${esc(B[1])}. The ask wants realm, from vendors.</p></div>`;
    else { S.stats.ok++; Q.bok = true; cmdLearn('SELECT realm FROM vendors'); Q.bout = `<div class="verdict good"><h3>Correct</h3><p>SELECT realm FROM vendors</p></div><p class="lab">What your query returned</p>${tableHTML(res.got, 4)}`; }
    drawQ();
  }
  function runQ() {
    if (!ready || !Q || Q.step !== 'turn') return; const sql = $('#sql').value; if (!sql.trim()) return toast('Write a query first');
    const res = Engine.grade(Q.task, sql), o = $('#q-out'); S.stats.q++;
    if (res.err) { o.innerHTML = `<div class="verdict err"><h3>That query didn’t run</h3><p>${esc(res.err)}</p><p class="cap2">Errors cost nothing. Fix it and run it again.</p></div>`; return showOut(); }
    if (res.ok) { S.stats.ok++; if (Q.tries === 0) { S.streak++; S.best = Math.max(S.best, S.streak); } trainSql(res.used || [], Q.r, sql); } else { Q.tries++; S.streak = 0; }
    if (Q.roll) return craftRoll(res);
    if (!res.ok) { const d = res.diff ? tableHTML({ cols: ['', ...res.want.cols], rows: [['yours', ...res.diff.yours], ['wanted', ...res.diff.target]] }) : ''; o.innerHTML = `<div class="verdict bad"><h3>Not yet</h3><p>${esc(res.msg)}</p>${d}</div>${res.got ? '<p class="lab">What your query returned</p>' + tableHTML(res.got, 6) : ''}`; save(); return showOut(); }
    if (Q.tasks && Q.i < Q.tasks.length - 1) { Q.i++; Q.task = Q.tasks[Q.i]; Q.tries = 0; toast('Correct'); save(); return drawQ(); }
    finishQ(res);
  }
  function finishQ(res) {
    const t = Q.r, lk = luck(), k = Q.kind, o = { gold: 0, mats: {}, items: [], scrolls: [] }; let head = 'Correct', note = '', mult = 1;
    if (Q.tries === 0 && Q.hint === 0) mult += .2; if (Q.hint === 2) mult -= .25; if (Q.hint >= 3) mult = .25;
    if (k === 'contract') { const again = !!S.done[Q.id], paid = !!A.paid[Q.id], cur = CONTRACTS.find(c => c.id === Q.id); o.gold = again || paid ? 0 : (15 * t + 10) * mult;
      if (!again) { S.done[Q.id] = { t: now(), tries: Q.tries, hint: Q.hint }; if (!paid) { A.paid[Q.id] = 1; o.mats[t] = 1; if (rnd() < .3) o.items.push(makeItem(rollRarity(lk), t)); } } else note = 'From memory. It pays once.';
      if (!again) note = FOLK[t - 1][giverOf(cur)][0] + ': ' + pick(TALK.praise); if (!again && paid) note += ' Already paid once, to another of your characters.'; head = again ? 'Still sharp' : 'Exercise done'; const nx = CONTRACTS.find(c => c.r === t && !S.done[c.id] && giverOf(c) === giverOf(cur)); Q.nextId = nx ? nx.id : null; }
    else if (k === 'rounds') { o.gold = (8 * t + 6) * mult; o.mats[t] = 1; Q.inst.done = true; head = 'Drill done'; if (S.rounds.tasks.every(x => x.done) && !S.rounds.claimed) { S.rounds.claimed = true; const top = maxRegion(); o.items.push(makeItem(rollRarity(lk, 1), top)); o.sigils = 1; o.gold += 30 * top; note = 'All five drills done. The day’s chest is yours.'; } }
    else if (k === 'rumor') { o.gold = 40 * t; S.rum[Q.id] = now(); o.items.push(uniq(Q.drop)); o.sigils = 1; o.scrolls.push('c' + t + 'r'); head = 'The rumor was true'; }
    else if (k === 'intro') { S.met['1.0'] = 1; S.done.c101 = S.done.c102 = { t: now(), tries: 0, hint: 0 }; o.gold = 25; S.tut = 1; if (gOn() && S.gd <= gix('odalys')) { S.gd = gix('fight'); gEnter(true); } head = 'First lesson done'; note = 'You can now SELECT any columns from any table. Everything else in SQL builds on that.'; Q.then = () => odalys('"Good. Now try it on something that fights back. There are gulls on the green south of town. Tap one, pick your page, and write the query."'); }
    const g = grant(o), clean = Q.tries === 0 && Q.hint === 0 && k !== 'intro' ? '<p><span class="pill ok">first try, no hints +20%</span></p>' : ''; tick(); save(); renderHud();
    Q.result = `<p class="eyebrow">Result</p><h2 class="good">${esc(head)}</h2>${note ? `<p class="story">${esc(note)}</p>` : ''}${clean}${spoilsHTML(g)}${res && res.got && Q.task.kind !== 'dml' ? '<p class="lab">What your query returned</p>' + tableHTML(res.got, 8) : ''}`; Q.step = 'result'; drawQ();
  }
  function craftRoll(res) {
    const t = Q.r, x = Q.recipe, pg = bestPage('craft'), o = odds(rv(Q.csk), Q.diff, res.grade, res.share), win = rnd() * 100 < o.p, gl = [], g0 = gain(Q.csk, Q.diff, { correct: 1, close: .6, partial: .4, wrong: 0 }[res.grade]); if (g0) gl.push(g0); let body;
    Sound.sfx(win ? Q.csk === 'alchemy' ? 'alchemy' : 'smith' : 'craftFail');
    if (win) { const exc = res.ok && rnd() * 100 < rv(Q.csk) + (pg && pg.rare ? 20 : 0), out = { items: [] }; let head; S.mats[t] = have(t) - x.mats; if (x.sigils) S.mats.sigil = have('sigil') - x.sigils;
      if (x.id === 'scroll') { S.hints += exc ? 2 : 1; head = exc ? 'Two Hint Keys' : 'A Hint Key'; } else if (x.id === 'tonic') { S.tonics += exc ? 2 : 1; head = exc ? 'Two Healing Draughts' : 'A Healing Draught'; }
      else { const it = makeItem(x.id, t, Q.slot, Q.slot === 'weapon' ? (S.path === 'mage' ? 'magery' : armsSkill()) : null); if (exc) { for (const q in it.stats) it.stats[q] = Math.round(it.stats[q] * 1.25); it.name = 'Exceptional ' + it.name; } out.items.push(it); head = exc ? 'Exceptional work' : 'Well made'; }
      body = `<h2 class="good">${head}</h2>${spoilsHTML(grant(out))}`; }
    else { const lost = Math.ceil(x.mats / 2); S.mats[t] = Math.max(0, have(t) - lost); body = `<h2 class="bad">Ruined</h2><p>The piece is spoiled. ${lost} ${MATS[t]} wasted.</p>`; }
    tick(); save(); renderHud(); Q.result = `<p class="eyebrow">Result</p><p class="rollline"><b class="g-${res.grade}">${GRADE_N[res.grade]}</b> query · ${o.p}% chance</p>${body}${gainsHTML(gl)}${res.ok ? '' : answerHTML(Q.task)}`; Q.step = 'result'; drawQ();
  }

  /* ---------- on the map: fights, thefts and duels. A panel along the bottom, one question at a time. ---------- */
  let F = null, CE = null, DG = null;
  const DP = DungeonPlay.create({state:()=>S,run:()=>DG,setRun:v=>DG=v,day:dayKey,now,scene:Scene,close:closeSheet,hud:renderHud,surface:surfaceBodies,save,guideId:()=>gid(),
    guideStart:()=>{S.gd++;save();setTimeout(()=>gSay('"Beat the cellar rat, then open the chest beside the stairs. The deeper floors can wait."'),600);},guideChest:()=>setTimeout(()=>gDone('chest'),50),
    difficulty:diffOf,foe:mkFoe,fight:openF,toast,dialog:dlg,sheet,main:isMain,haveTable:r=>haveT(r),takeTable,grant,item:makeItem,rarity:rollRarity,luck,random:rnd,int:rint,unique:uniq,spoils:spoilsHTML,escape:esc,dye:maybeDye});
  function barsF() { if (!F) return; const b = F.foe ? [{ e: 'me', pct: S.hp / maxHp() }] : []; if (F.foe && F.ent) b.push({ e: F.ent, pct: F.foe.hp / F.foe.max, name: F.title }); Scene.FX.bars(b); }
  function fitPanel() { if (F) requestAnimationFrame(() => { if (F) Scene.FX.inset($('#fight').offsetHeight); }); }
  function openF(cfg) { closeSay(); closeSheet(); F = Object.assign({ st: 'choose', round: 0, busy: false, hint: 0, hints: [], tries: 0, chips: '', after: '' }, cfg); Scene.FX.lock(true); if (F.ent) Scene.FX.face(F.ent); $('#fight').hidden = false; $('#nav').hidden = true; $('#ctx').hidden = true; $('#app').classList.add('infight'); Scene.resume(); barsF(); drawF(); if (F.act === 'fight' && S.tut >= 1) coach('fight'); }
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
    const at = DG && DG.back ? DG.back : Scene.pos(); S.remains = { x: at[0], y: at[1], loot, until: Date.now() + BODY_MS }; if (!DG) placeBody();
  }
  const deathNote = () => { const D = S.lastDeath; if (!D) return; S.lastDeath = null; if (D.ins.length) toast(`Insurance paid: ${D.fee} gold from the bank`); if (D.broke.length) toast(`Not enough in the bank to cover ${D.broke.join(', ')}`); if (D.lost.length) toast(`On your body: ${D.lost.join(', ')}`); };
  const insFee = it => Math.max(5, Math.round(price(it) * .2));
  function placeBody() { const B = S.remains; if (!B) return; const left = B.until - Date.now(); if (left <= 0) { S.remains = null; return; } if (Scene.inDungeonMap()) return; if (Scene.find(e => e.mine)) return; Scene.remains(B.x, B.y, B.loot, left / 1000); }
  function surfaceBodies() { if(!sceneUp)return;Scene.clearRemains();placeBody(); }
  function prepareDeath() {
    if(S.deathPending)return;
    if(DG)DP.snapshot();dropBody();
    const r=S.region,t=Scene.towns()[r],at=[t[0]-13,t[1]+10];
    S.deathPending={r,at};S.pos=at;S.dungeon=null;DG=null;
  }
  function wakeFromDeath() {
    prepareDeath();const d=S.deathPending;S.hp=maxHp();S.region=d.r;S.pos=d.at;S.deathPending=null;S.dungeon=null;DG=null;
    Scene.load(S.pos,S.region);surfaceBodies();save();
  }
  function closeF() {
    unCoach('fight', 'fprompt', 'stealth'); const f = F; if (!f) return; F = null; $('#fight').hidden = true; $('#fight').innerHTML = ''; $('#nav').hidden = false; $('#app').classList.remove('infight'); Scene.FX.lock(false); Scene.FX.bars([]); Scene.FX.inset(0); if (f.ent) { Scene.FX.free(f.ent); f.ent.calm = 12; } closeSheet();
    if (f.kick) { wakeFromDeath(); toast(S.remains ? 'You wake at the healer’s. Dungeon belongings wait at the entrance; other belongings stay where you fell.' : 'You wake at the healer’s, patched up'); deathNote(); }
    Scene.refresh(); render(); if (f.kind === 'boss' && f.r === 8 && S.won && !S.ended) { S.ended = 1; save(); setTimeout(ending, 500); }
  }
  function taskFor(page) {
    if (F.tasks) return F.tasks(F.round); if (S.tut < 2 && F.kind === 'monster') return tutTask();
    const c = page.c, tpl = c === F.r && F.sig ? F.sig : pick(BOUNTIES.filter(b => b.r === c)).id; return makeTask({ tpl, seed: seeded(tpl) });
  }
  function drawF() {
    const el = $('#fight'), f = F.foe, t = F.r; let h;
    if (F.st === 'choose') {
      const pgs = fightPages(), sh = bestPage('shadow'), canSteal = F.kind === 'monster' && !F.round && !F.animal;
      const stealOk = canSteal && sh && (F.ent.unseen || rv('hiding') > 0); if (stealOk) setTimeout(() => coach('stealth'), 0);
      h = `<div class="f-head"><div><b>${esc(F.title)}</b><small>${CIRCLE[t]} Circle${f ? ` · health ${Math.max(0, f.hp)} / ${f.max}` : ''}</small></div><div class="f-btns">${qm('fight')}<button class="btn sm quiet" data-a="flee">${F.round ? 'Flee' : 'Back away'}</button></div></div><div class="f-pages">${pgs.map(p => { const sk2 = pageSkill(p), w = resist(p.c, t); return `<button class="pg${p.rare ? ' rare' : ''}" data-a="fpage" data-id="${p.id}"><b>${esc(p.name)}</b><em>${odds(rv(sk2), F.diff, 'correct').p}%${w < 1 ? ` · ${Math.round(w * 100)}% damage` : ''}</em></button>`; }).join('') || '<p class="cap2">No page that can strike. Odalys Brine in Tallyport sells Strike and Spark.</p>'}${stealOk ? `<button class="pg sh" data-a="fsteal"><b>${esc(sh.name)}</b><em>${F.ent.unseen ? 'unseen' : `Hiding ${sneakPct()}%`}</em></button>` : ''}</div>${S.tonics > 0 && S.hp < maxHp() ? `<div class="row"><button class="btn sm quiet" data-a="tonic">Draught ×${S.tonics}</button></div>` : ''}`;
    } else if (F.st === 'prompt') {
      h = `<div class="f-head"><div><b>${esc(F.page ? F.page.name : F.verb)}</b><small id="f-odds">${fOdds()}</small></div><div class="f-btns">${qm('fprompt')}<button class="btn sm quiet${S.tut === 1 ? ' pulse' : ''}" data-a="ftables">Tables</button>${F.act === 'fight' ? fHintBtn() : ''}</div></div><p class="ask">${esc(F.task.ask)} ${needLine(F.task)}${F.task.tip ? ` <button class="qm sm" data-a="ftip" aria-label="A tip">?</button>` : ''}</p><div id="f-hint">${F.hints.join('')}</div><div id="f-out"></div>${kbHTML(F.task, F.kc, F.verb)}`;
    } else h = `<div class="f-head"><div><b class="g-${F.res.grade}">${GRADE_N[F.res.grade]}</b><small>${F.pline}</small></div>${F.act === 'fight' && !F.over ? '<button class="btn sm quiet" data-a="flee">Flee</button>' : ''}</div>${F.res.ok || !F.res.msg ? '' : `<p class="cap2">${esc(F.res.msg)}</p>`}<div class="swings" id="e-sw">${F.chips}</div><div id="f-after">${F.after}</div>`;
    if (F.st !== 'choose') unCoach('fight', 'stealth'); if (F.st !== 'prompt') unCoach('fprompt');
    el.innerHTML = h; el.className = 'st-' + F.st; if (F.st === 'prompt') { kbDraw(); kbFocus(); } fitPanel();
  }
  // the columns the answer needs, in a few words, after the question
  const needLine = t => t.kind === 'dml' ? '<span class="need">→ changes the Ledger; judged by what it holds afterwards</span>' : `<span class="need">→ ${esc(t.ret)}${t.order ? ' · sorted' : ''}</span>`;
  const ROUNDS = () => F.kind === 'boss' ? 1 : 3; let HPEN = 15;
  const fPct = grade => { if (F.act !== 'fight') return odds(rv('stealing') + (F.bonus || 0), F.diff, grade).p; const sid = pageSkill(F.page); if (F.shown) grade = 'wrong'; else if (F.hint >= 2 && grade === 'correct') grade = 'close'; return Math.max(2, odds(rv(sid), F.diff, grade).p - (F.hint === 1 ? HPEN : 0)); };
  const fOdds = () => F.act === 'fight' ? `${fPct('correct')}% if right · ${fPct('wrong')}% if wrong · ${ROUNDS() === 1 ? '1 round' : ROUNDS() + ' rounds'}` : `${fPct('correct')}% if right · one try`;
  const fHintBtn = () => { const max = F.kind === 'boss' ? 1 : 2; if (F.shown) return ''; return (F.hint >= max ? '' : `<button class="btn sm quiet" data-a="fhint">${F.hint ? 'Shape' : `Hint −${HPEN}%`}</button>`) + '<button class="btn sm quiet" data-a="fshow">Show me</button>'; };
  function fHint() {
    if (!F || F.st !== 'prompt' || F.act !== 'fight') return; const max = F.kind === 'boss' ? 1 : 2; if (F.hint >= max) return; F.hint++; const t = F.task;
    F.hints = F.hints.filter(h => h.includes('class="fh tip"')).concat([F.hint === 1 ? `<p class="fh"><b>Hint, −${HPEN}% to hit:</b> ${esc(t.hint || clauseHint(t.sql))}</p>` : `<p class="fh"><b>Shape, a right answer counts as close:</b> <code>${esc(skeleton(t.sql).replace(/\s+/g, ' '))}</code></p>`]);
    $('#f-hint').innerHTML = F.hints.join(''); $('#f-odds').textContent = fOdds(); const b = $('#fight [data-a=fhint]'); if (b) b.outerHTML = fHintBtn(); fitPanel();
  }
  function fShow() { if (!F || F.st !== 'prompt' || F.act !== 'fight' || F.shown) return; F.shown = 1; F.hints = [`<p class="fh"><b>Type it in. It hits like a wrong answer and teaches no skill:</b> <code>${esc(F.task.sql)}</code></p>`];
    $('#f-hint').innerHTML = F.hints.join(''); $('#f-odds').textContent = fOdds(); $('#fight .f-btns').querySelectorAll('[data-a=fhint],[data-a=fshow]').forEach(b => b.remove()); fitPanel(); }
  function tablesSheet() {
    const c = ctx(), t = c && c.task; if (!t) return; const tabs = t.tables || tablesIn(t.sql + ' ' + (t.check || ''));
    sheet(`<h2>Tables</h2>${tabs.map(n => `<section class="sec"><h2>${n}</h2><div class="ret">${(COLS[n] || []).map(x => `<code>${x}</code>`).join('')}</div>${tableHTML(Engine.peek(n, 12), 12)}</section>`).join('')}<div class="row"><button class="btn sm quiet" data-a="atlas">All tables</button><button class="btn sm quiet" data-a="klog">${S.klog ? 'Hide' : 'Show'} the key log</button></div><p class="cap2">The key log shows, under your query, the last keys the game read. Use it if the keyboard types something you did not press.</p>`);
  }
  function pickPage(id) {
    if (!F || F.busy || F.over || F.act !== 'fight') return; const p = pageById(id); if (!p || !owned(id)) return; const sk2 = pageSkill(p);
    F.page = p; S.page = id; F.verb = BOOKS[p.book].verb; F.kc = F.tasks ? F.r : p.c; F.task = taskFor(p); F.tries = 0; F.fixed = 0; F.hint = 0; F.shown = 0; F.hints = []; F.oddsLine = `${odds(rv(sk2), F.diff, 'correct').p}% a swing if correct · ${odds(rv(sk2), F.diff, 'wrong').p}% if wrong`; F.st = 'prompt'; drawF(); coach('fprompt');
  }
  function pickSteal() {
    if (!F || F.kind !== 'monster' || F.round || F.busy) return; const e = F.ent, sh = bestPage('shadow'); if (!sh) return;
    if (!e.unseen) { if (!(rv('hiding') > 0)) return; const p = sneakPct(); gain('hiding', F.diff, .6); save(); if (rnd() * 100 >= p) { toast('It keeps its eyes on you'); return drawF(); } toast('You slip out of sight'); e.unseen = true; }
    const c = Math.min(sh.c, F.r), tpl = c === F.r ? F.sig : pick(BOUNTIES.filter(b => b.r === c)).id; F.act = 'steal'; F.foe = null; F.page = sh; F.verb = 'Steal'; F.kc = c; F.bonus = 10 + (sh.rare ? 15 : 0) - 12 * Math.max(0, F.r - sh.c) + bonus('deft');
    F.task = S.tut < 2 ? tutTask() : makeTask({ tpl, seed: seeded(tpl) }); F.fixed = 0; F.hint = 0; F.hints = []; F.oddsLine = `${odds(rv('stealing') + F.bonus, F.diff, 'correct').p}% if correct · one try`; F.st = 'prompt'; barsF(); drawF();
  }
  function runF() {
    if (!ready || !F || F.st !== 'prompt' || F.busy) return; const sql = $('#sql').value; if (!sql.trim()) return toast('Write a query first');
    let res = Engine.grade(F.task, sql); S.stats.q++;
    if (res.err) { if (!F.fixed) { F.fixed = 1; $('#f-out').innerHTML = `<div class="verdict err"><p>${esc(res.err)}</p><p class="cap2">It did not run. One free fix: if the next one does not run either, it counts as a miss.</p></div>`; return fitPanel(); }
      res = { ok: false, grade: 'wrong', share: 0, msg: 'It did not run: ' + res.err, used: [] }; }
    if (res.ok) { S.stats.ok++; S.streak++; S.best = Math.max(S.best, S.streak); trainSql(res.used || [], F.kc, sql); } else S.streak = 0;
    F.res = res; F.chips = ''; F.after = ''; F.round++; resolveF(res);
  }
  const chip = (cls, txt) => { const h = `<span class="sw ${cls}">${txt}</span>`; F.chips += h; const sw = $('#e-sw'); if (sw) sw.insertAdjacentHTML('beforeend', h); };
  function play(steps, done) { if (FAST()) { for (const f of steps) f(); return done(); } let i = 0; const next = () => { if (!F) return; while (i < steps.length) if (steps[i++]() !== false) return setTimeout(next, 330); done(); }; setTimeout(next, 250); }
  function resolveF(res) {
    const q = { correct: 1, close: .6, partial: .4, wrong: 0 }[res.grade], gl = [];
    if (F.act !== 'fight') { const sid = F.act === 'steal' ? 'stealing' : bestWeapon(), o = odds(rv(sid) + (F.bonus || 0), F.diff, res.grade, res.share), g = gain(sid, F.diff, q); if (g) gl.push(g);
      F.pline = `${o.p}% chance`; F.st = 'after'; F.busy = true; drawF(); const win = rnd() * 100 < o.p, end = () => { if (!F) return; F.busy = false; chip(win ? 'hit' : 'ouch', win ? 'success' : 'failed'); win ? winF(res, gl) : loseF(res, gl); }; return FAST() ? end() : setTimeout(end, 500); }
    const p = F.page, sid = pageSkill(p), W = WEAP[sid], gr = F.shown ? 'wrong' : F.hint >= 2 && res.grade === 'correct' ? 'close' : res.grade, o0 = odds(rv(sid), F.diff, gr, res.share), o = { p: Math.max(2, o0.p - (F.hint === 1 ? HPEN : 0)) }, g = F.shown ? 0 : gain(sid, F.diff, q * (F.hint ? .6 : 1)), f = F.foe, e = F.ent, free = W.opening && F.round === 1, steps = [], NR = ROUNDS(); if (g) gl.push(g);
    const mult = power(p.c) * resist(p.c, F.r) * (1 + dmgPct(sid) / 100) * (F.drole === 'armored' && p.book !== 'spell' ? DungeonPlay.ARMORED_DAMAGE : 1), n = W.swings + (p.rare && p.book === 'arms' ? 1 : 0), back = Math.max(0, f.swings - (p.rare && p.book === 'spell' ? 1 : 0));
    F.pline = `${o.p}% a swing${NR > 1 ? ` · ${NR} rounds` : ''}`; F.st = 'after'; F.busy = true; drawF();
    for (let r = 0; r < NR; r++) { if (NR > 1) steps.push(() => { if (f.hp <= 0 || S.hp <= 0) return false; chip('lab rd', 'Round ' + (r + 1)); return false; });
    for (let i = 0; i < n; i++) steps.push(() => { if (f.hp <= 0) return false; Scene.FX.swing('me', e, p.book === 'spell' ? 'spell' : sid, p.book === 'spell' ? Effects.spell(p.c, p.rare) : null); if (rnd() * 100 < o.p) { const d = Math.max(1, Math.round((rint(W.dmg[0], W.dmg[1]) + rv(sid) / 8) * mult)); f.hp -= d; chip('hit', d); Scene.FX.hit(e, d, '#ffe9a0'); } else { chip('miss', 'miss'); Scene.FX.hit(e, 'miss', '#cfd6d8'); } barsF(); });
    if (!(free && r === 0)) { steps.push(() => { if (f.hp <= 0) return false; chip('lab', esc(F.title) + ':'); return false; });
      for (let i = 0; i < back; i++) steps.push(() => { if (f.hp <= 0 || S.hp <= 0) return false; Scene.FX.swing(e, 'me', 'hit'); if (rnd() * 100 < Math.max(20, Math.min(85, 50 + (f.diff - rv(sid))))) { const d = Math.max(1, Math.round((rint(3, 6) + 2 * F.r + (F.boss ? 2 : 0)) * (1 - Math.min(60, bonus('def')) / 100))); S.hp = Math.max(0, S.hp - d); chip('ouch', '−' + d); Scene.FX.hit('me', '−' + d, '#ff8a70'); } else { chip('miss', 'miss'); Scene.FX.hit('me', 'miss', '#cfd6d8'); } barsF(); renderHud(); }); } }
    play(steps, () => { if (!F) return; F.busy = false; if (f.hp <= 0) return winF(res, gl); if (S.hp <= 0) return loseF(res, gl);
      F.after = `${gainLine(gl)}${res.ok ? '' : answerHTML(F.task)}<div class="row end"><button class="btn quiet" data-a="fchoose">Change page</button><button class="btn solid" data-a="fpage" data-id="${p.id}">${esc(p.name)} again</button></div>`; save(); drawF(); });
  }
  function winF(res, gl) {
    if (F && F.act === 'fight') Sound.sfx('win');
    if (gift('mend') && F.act === 'fight') heal(maxHp() * .2);
    const t = F.r, lk = luck(), k = F.kind, o = { gold: 0, mats: {}, items: [], scrolls: [] }; let head, note = '', band = '', body = false;
    if (k === 'monster' || k === 'dungeon') { const st = F.act === 'steal', el = !!(F.inst && F.inst.elite), dn = k === 'dungeon'; if (st) S.stats.steals++; else S.stats.kills++;
      if (F.animal) { o.meat = 1 + (rnd() < .3 ? 1 : 0); o.hide = rnd() < .5 ? 1 : 0; } else {
      o.gold = (st ? 12 * t + 8 : 6 * t + 4) * (el ? 2 : 1) * (dn ? 1.4 : 1) * (.8 + rnd() * .4); o.mats[t] = (1 + (el ? 2 : 0)) * (st ? 2 : 1); if (el) { o.sigils = 1; if (rnd() < .5) o.scrolls.push('a' + t + 'r'); if (rnd() < .015) o.bless = 1; if (rnd() < .06) o.gscr = 1; }
      if (el || rnd() < (st ? .7 : dn ? .5 : .35)) o.items.push(makeItem(rollRarity(lk, el ? 1 : 0), t));
      if (F.inst && F.inst.lead && !st) { S.lairday = S.lairday || {}; if (S.lairday[F.inst.lair] !== dayKey()) { S.lairday[F.inst.lair] = dayKey(); o.gold += 40 * t; o.items.push(makeItem(rollRarity(lk, 2), t)); if (rnd() < .2) o.gscr = 1; if (t >= 6 && rnd() < .05) o.pscr = [makePscr(t)]; if (rnd() < (F.inst.lk === 'l14' ? .5 : .12 + t * .02)) o.runes = 1; } }
      }
      if (gid() === 'fight' && k === 'monster' && !st) { const rw = makeItem('common', 1, 'weapon', pick(['swords', 'fencing'])); rw.name = 'Rusty ' + WEAP[rw.w].n; o.items = [rw]; }
      if (!st) maybeDye(F.kind === 'boss' ? .35 : F.keeper ? .3 : F.kind === 'dungeon' ? .04 : .015 + luck() / 4000);
      head = st ? 'Clean lift' : F.title + ' falls'; if (st) F.ent.alert = 6; else { if(dn)DP.victory(F.ent); Scene.corpse(F.ent, o); body = true; for (const k in S.er.a) { const a = S.er.a[k]; if (a.type === 'hunt' && a.tpl === F.inst.tpl && a.have < a.n) { a.have++; toast(`${a.from}: ${a.have} of ${a.n} ${a.x}s`); } } F.body = F.ent; F.ent = null; if (dn && DG) DP.snapshot(); if (S.tut === 1) S.tut = 2; if (gid() === 'fight') { S.gd++; gEnter(true); } } }
    else if (k === 'rival') { const v = S.rival[t];
      if (F.act === 'steal') { o.gold = v.gold; o.items.push(v.item); o.sigils = 1; o.scrolls.push('h' + t + 'r'); S.stats.steals++; head = 'Purse and prize lifted'; note = `${F.title} will not notice until morning.`; } else { o.gold = Math.round(v.gold / 2); head = 'Duel won'; note = `${F.title} pays the wager and leaves town for a while.`; } v.taken = true; v.away = 4; }
    else { const first = !S.boss[t], b = F.boss; S.boss[t] = S.boss[t] || now(); S.stats.kills++; o.gold = (60 * t + 40) * (first ? 1 : .4); o.sigils = first ? 2 : 1; o.items.push(first ? uniq(b.drop) : makeItem(rollRarity(lk, 2), t)); if (rnd() < (first ? .3 : .08)) o.bless = 1; if (t >= 5 && rnd() < (first ? .6 : .15)) o.pscr = [makePscr(t)]; if (rnd() < .5) o.gscr = 1; head = first ? `The mark of the ${CIRCLE[t]} Circle` : b.name + ' yields again'; note = b.win; if (t === 8 && first) S.won = now(); }
    if (F.act === 'fight' && S.hp < maxHp()) { const hs = rv('healing'); if (rnd() * 100 < Math.max(40, Math.min(95, 40 + hs))) { const n = heal(6 + hs * .3), hg = gain('healing', F.diff, .6); if (hg) gl.push(hg); Scene.FX.hit('me', '+' + n, '#9be08a'); } }
    const g = grant(body ? {} : o); F.over = true; tick(); save(); renderHud(); barsF();
    F.after = `<h3 class="won">${esc(head)}</h3>${note ? `<p class="story">${esc(note)}</p>` : ''}${body ? '' : spoilsHTML(g)}${gainLine(gl)}${res.ok ? '' : answerHTML(F.task)}<div class="row end">${body ? `<button class="btn quiet" data-a="fdone">Leave it</button><button class="btn solid${S.tut <= 2 ? ' pulse' : ''}" data-a="floot">Loot</button>` : '<button class="btn solid" data-a="fdone">Continue</button>'}</div>`; F.st = 'after'; drawF();
  }
  function loseF(res, gl) {
    F.over = true; const t = F.r; let head, msg, fine = 0;
    if (F.kind === 'rival') { fine = Math.min(S.gold, (F.act === 'steal' ? 15 : 10) * t); S.gold -= fine; S.rival[t].away = 4; S.rival[t].taken = true; head = F.act === 'steal' ? 'Caught' : 'Duel lost'; msg = `${F.title} ${F.act === 'steal' ? 'catches your hand in the purse' : 'answers first'}. You pay ${fine} gold.`; }
    else if (F.act === 'steal') { fine = Math.min(S.gold, 5 * t); S.gold -= fine; F.ent.alert = 8; F.ent.unseen = false; head = 'Caught'; msg = `It caught you. You drop ${fine} gold.`; }
    else { S.stats.falls++; F.kick = true; head = 'You fall'; const worn = new Set(Object.values(S.eq || {})), n = S.inv.filter(it => !worn.has(it.id)).length + Object.keys(S.scr || {}).length; const bare = Object.values(S.eq || {}).map(itemById).filter(it => it && !it.unique && !it.bless && !it.ins).length; msg = S.gold || n || bare ? `Your gold, your bag${bare ? ' and any gear that is not blessed or insured' : ''} stay on your body. You have ten minutes to get back to it.` : 'You had nothing on you to lose.'; }
    if(F.kick)prepareDeath();
    tick(); save(); renderHud(); barsF();
    F.after = `<h3 class="lost">${head}</h3><p>${esc(msg)}</p>${gainLine(gl)}${res.ok ? '' : answerHTML(F.task)}<div class="row end"><button class="btn solid" data-a="fdone">${F.kick ? 'Wake up' : 'Continue'}</button></div>`; F.st = 'after'; drawF();
  }
  function flee() {
    if (!F || (F.busy && !(F.act === 'fight' && !F.over && F.st === 'after'))) return; F.busy = false;
    const e = F.ent, live = F.act === 'fight' && !F.over && e && F.kind !== 'boss' && F.kind !== 'rival';
    if (live && F.round && !gift('flee')) { const hs = rv('hiding'); gain('hiding', F.diff, .5);
      if (hs > 0 && rnd() * 100 < Math.min(70, 15 + hs * .55)) { closeF(); toast('You slip out of sight'); return; }   // Hiding: gone before it can follow
      const d = rint(3, 6) + 2 * F.r; S.hp -= d; Scene.FX.hit('me', '−' + d, '#f08070'); if (S.hp <= 0) { S.hp = 0; F.kick = true; S.stats.falls++; closeF(); return; } }
    save(); closeF(); if (live && e.kind === 'mon') { Scene.chase(e, 20); toast('It comes after you. Run: tap far away.'); }
  }
  function ending() {
    const gm = RPG.filter(s => rv(s[0]) >= 100).length, cx = Object.keys(S.codex).length, jr = Object.keys(S.jr).length;
    sheet(`${ART ? '<img class="title-art" alt="" src="art/t/J03.jpg">' : ''}<p class="eyebrow">The Trials are won</p><h2>Tallyport’s champion</h2><p class="story">The council writes Tallyport at the top of the roll. Odalys is in the gallery, and she doesn’t sit down for the rest of the session.</p><p>${jr >= 8 ? 'You have all eight pages of Ilva’s journal.' : `You have found ${jr} of the 8 pages of Ilva’s journal. The rest are still out along the road.`}</p><p>You can now filter, sort, total, join tables, find missing rows, label and date data, nest queries, rank rows and change data safely, without looking anything up.</p><div class="kv"><span>Queries run</span><span>${S.stats.q}</span><span>Skills at Grandmaster</span><span>${gm} of ${RPG.length}</span><span>Named rares found</span><span>${cx} of ${UNIQUES.length}</span></div><p class="cap2">The world stays open.</p><div class="row end"><button class="btn solid" data-a="closesheet">Carry on</button></div>`);
  }
  function bossCard(e) {
    const t = e.r, b = BOSSES[t - 1], d = diffOf(t, false, true), lack = t === 8 ? [1, 2, 3, 4, 5, 6, 7].filter(k => !S.boss[k]).length : 0, pt = Scene.bossPortrait(t); closeSay(); Scene.pause(); $('#nav').hidden = true; const el = $('#enc'); el.hidden = false; el.className = 'bcard';
    el.innerHTML = `<div class="card-bg" style="background-image:url(${Scene.backdrop(t)})"></div><div class="card-in">${pt ? `<img class="card-port" alt="" src="${pt}">` : ''}<p class="eyebrow">${esc(b.epithet)}</p><h1>${esc(b.name)}</h1><p class="story">${esc(b.intro)}</p><p class="cap2">${mkFoe(t, d, 3.5).max} health · difficulty ${d} · no hints · the examiner sets every question</p>${lack ? `<p class="cap2">The Council hears only candidates who carry the other seven marks. You lack ${lack}.</p>` : ''}<div class="row end"><button class="btn quiet" data-a="cardno">Not yet</button><button class="btn solid" data-a="start" data-k="boss"${lack ? ' disabled' : ''}>${S.boss[t] ? 'Stand again' : 'Stand the examination'}</button></div></div>`;
  }
  const closeCard = () => { $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; };

  /* ---------- starting things ---------- */
  const giverOf = c => { const l = CONTRACTS.filter(x => x.r === c.r); return Math.min(2, Math.floor(l.indexOf(c) * 3 / l.length)); };
  const sneakPct = () => Math.round(Math.max(20, Math.min(95, 25 + rv('hiding') * .7 + bonus('deft') / 2)));
  function sneak(diff) { const p = sneakPct(); gain('hiding', diff, .6); save(); if (rnd() * 100 < p) { toast('You slip out of sight'); return true; } closeSheet(); toast('They keep their eyes on you'); return false; }
  const START = {
    intro: () => openQ({ kind: 'intro', r: 1, step: 'i1', task: REPS[0], tasks: null, title: 'First forms' }),
    contract: d => { const c = CONTRACTS.find(x => x.id === d.id); openQ({ kind: 'contract', id: c.id, r: c.r, task: c, title: c.title, lesson: c.lesson || null, first: !!c.lesson && !S.done[c.id] && !S.seen[c.id] }); if (c.lesson) { S.seen[c.id] = 1; cmdTeach(c.id); if (c.id === 'c101') cmdTeach('intro'); } },
    round: d => { const inst = rounds().tasks[+d.i]; if (inst.done) return; const t = makeTask(inst); openQ({ kind: 'rounds', r: t.r, inst, task: t, title: 'Daily drill · ' + t.title }); },
    rumor: d => { const r = RUMORS.find(x => x.id === d.id); openQ({ kind: 'rumor', id: r.id, r: r.r, drop: r.drop, task: Object.assign({ kind: 'read' }, r), title: 'Rumor · ' + r.title, noHint: true }); },
    monster: (e, amb) => { if(e.inst && e.inst.dungeon)return DP.fight(e); const inst = e.inst, animal = inst.tpl[0] === 'a', t = animal ? 1 : (inst.c || e.r), diff = animal ? 4 : diffOf(t, inst.elite); if (inst.lair) { S.lairs = S.lairs || {}; S.lairs[inst.lair] = 1; } openF({ kind: 'monster', act: 'fight', r: t, inst, ent: e, diff, animal, sig: animal ? null : inst.tpl, title: inst.nm || ((inst.elite ? 'Gilded ' : '') + MONSTERS[inst.tpl][0]), lead: !!inst.lead, noHint: !!inst.elite, foe: animal ? { hp: 18, max: 18, diff, swings: 1 } : mkFoe(t, diff, inst.elite ? 2 : 1), coach: '' }); },
    rival: d => { const e = CE, t = e.r, R = RIVALS[t - 1], v = rival(t); if (v.away > 0) return; const diff = diffOf(t, true), st = d.m !== 'duel', sh = bestPage('shadow'); if (st && !sh) return toast('You own no page from the Book of Shadows'); if (d.m === 'sneak' && !sneak(diff)) return;
      const c = st ? Math.min(sh.c, t) : t, b = pick(BOUNTIES.filter(x => x.r === c && !/^b80[123]/.test(x.id))), bonus2 = st ? 10 + (sh.rare ? 15 : 0) - 12 * Math.max(0, t - sh.c) : 0;
      openF({ kind: 'rival', act: st ? 'steal' : 'duel', st: 'prompt', r: t, diff, ent: e, title: R.name, noHint: true, page: st ? sh : null, verb: st ? 'Steal' : 'Answer', kc: c, bonus: bonus2, task: makeTask({ tpl: b.id, seed: seeded(b.id) }), oddsLine: `${odds(rv(st ? 'stealing' : bestWeapon()) + bonus2, diff, 'correct').p}% if correct · one try` }); },
    boss: () => { const e = CE; if (!e || e.kind !== 'boss') return; const t = e.r, b = BOSSES[t - 1], diff = diffOf(t, false, true); closeCard(); openF({ kind: 'boss', act: 'fight', boss: b, r: t, diff, ent: e, title: b.name, noHint: true, foe: mkFoe(t, diff, 3.5, true), tasks: n => Object.assign({ kind: 'read', title: b.name }, b.phases[n % b.phases.length](RNG(rid()))) }); },
    dungeon: () => DP.enter(CE.r),
    guard: e => DP.fight(e),
    keeper: e => DP.fight(e),
    chest: e => DP.reward(e),
  };

  /* ---------- screens ---------- */
  function renderHud() { const m = maxHp(), face = S.path && ART ? `<img alt="" src="art/p/${LOOKS[S.path][(S.look || 0) % 2]}.webp">` : ''; $('#hud').innerHTML = `<div class="hud-row"><button class="hud-face" data-a="tab" data-t="hero" aria-label="Character">${face}</button><div class="hud-id"><b>${esc(S.name || 'Brasswake')}</b><span class="hpbar" title="Health"><i style="width:${Math.round(100 * S.hp / m)}%"></i><b>${S.hp} / ${m}</b></span></div><div class="hud-gold">${ico('coin')}<b>${S.gold}</b></div></div>`; }
  // the bottom bar: framed slots with painted icons, the hero's own portrait in the middle
  const NAV = [['world', 'Adventure', 'sword', '⚔'], ['map', 'Map', 'map', '✥'], ['hero', 'Hero', null, '☺'], ['bag', 'Bag', 'bag', '◈'], ['ledger', 'Ledger', 'tome', '❖']];
  function renderNav() {
    const face = S.path ? LOOKS[S.path][(S.look != null ? S.look : 0) % 2] : 'G09_4', tabsOn = gOn() ? gTabs() : null, key = face + ART + S.gn + (tabsOn ? tabsOn.join() : ''), n = $('#nav'); if (n.dataset.k === key) return; n.dataset.k = key;
    n.innerHTML = NAV.filter(x => !tabsOn || tabsOn.includes(x[0])).map(x => `<button data-a="tab" data-t="${x[0]}" class="${x[0] === 'hero' ? 'hero' : ''}${S.gn === x[0] ? ' pulse' : ''}"><span class="slot">${ART ? `<img alt="" src="art/${x[2] ? 'i/' + x[2] : 'p/' + face}.webp">` : `<i>${x[3]}</i>`}</span><span class="lab">${x[1]}</span></button>`).join('');
  }
  function render() {
    renderHud(); renderNav(); document.querySelectorAll('#nav button').forEach(b => b.dataset.t === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
    const world = tab === 'world'; $('#stage').hidden = !world; $('#view').hidden = world;
    if (world) { if (ready && !sceneUp) bootScene(); if (sceneUp && !Q) Scene.resume(); return; }
    Scene.pause(); const v = $('#view'), keep = v.dataset.tab === tab + lsub ? v.scrollTop : 0;
    v.innerHTML = '<button class="pclose" data-a="tab" data-t="world" aria-label="Close">✕</button>' + ({ map: vMap, ledger: vLedger, hero: vHero, bag: vBag }[tab])(); v.dataset.tab = tab + lsub; v.scrollTop = keep;
    if (tab === 'ledger' && lsub === 'sandbox') { const ta = $('#con-sql'); if (ta) ta.value = con.sql; }
    if(tab==='map'&&DG)unCoach();else coach({ map: 'map', ledger: 'ledger', hero: 'hero', bag: 'bag' }[tab]); if (S.gn && S.gn === tab) { S.gn = 0; save(); renderNav(); }
  }
  function bootScene() { if (!sceneUp) { Scene.init($('#stage'), HOST); sceneUp = true; soundUp(); Scene.showBlocked(S.showb); } $('#st-load').hidden = true; Scene.load(S.pos, S.pos || S.tut ? S.region : 'dock'); S.region = Scene.region(); S.been[S.region] = 1; homesUp(); applyGifts(); if(S.dungeon)DP.restore(); surfaceBodies(); if (gOn()) gEnter(true, true); document.body.classList.toggle('ui', !!(ART && ArtData.ui)); if (!$('#title').hidden) Scene.pause(); }
  const ART = typeof ArtData !== 'undefined', LOOKS = { warrior: ['G10_1', 'G10_2'], thief: ['G10_3', 'G10_4'], mage: ['G11_1', 'G11_2'], crafter: ['G11_3', 'G11_4'] }, LOOK0 = { warrior: 0, thief: 2, mage: 4, crafter: 6 };
  const WSTART = { warrior: 'swords', thief: 'fencing', mage: 'magery', crafter: 'swords' }, NAMES = ['Edrik', 'Mara', 'Corin', 'Sable', 'Aldous', 'Ysanne', 'Brogan', 'Wren'];
  /* ---------- title, character creation, cold open ---------- */
  let CR = null;
  const tbg = n => ART ? ` style="background-image:url(art/t/${n}.jpg)"` : '';
  function showTitle(html, cls) { const t = $('#title'); t.hidden = false; t.className = cls || ''; t.innerHTML = html; if (sceneUp) Scene.pause(); }
  function hideTitle() { $('#title').hidden = true; $('#title').innerHTML = ''; if (sceneUp && tab === 'world' && !Q) Scene.resume(); }
  function title() {
    const tot = c => Math.round(Object.values(c.sk || {}).reduce((a, b) => a + b, 0)), any = A.slots.some(Boolean);
    const row = (c, i) => { if (!c) return `<button class="tt-btn quiet" data-a="newslot" data-i="${i}">New character<small>${A.main < 0 || !A.slots[A.main] ? 'Your main: the one entered in the Trials' : 'Supporting: everything but the Trials story'}</small></button>`;
      const p = PATHS.find(x => x.id === c.path); return `<button class="tt-btn${i === A.cur ? '' : ' quiet'}" data-a="playslot" data-i="${i}">${esc(c.name)}<small>${i === A.main ? 'Main · ' : ''}the ${p ? p.name : ''} · skills ${tot(c)}${c.boss && Object.keys(c.boss).length ? ' · ' + Object.keys(c.boss).length + ' of 8 marks' : ''}</small></button>`; };
    showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box tt-slots"><h1>Brasswake</h1><p class="tt-sub">Pulled from the sea, entered in the Trials, and taught SQL from the first line</p>${A.slots.map(row).join('')}${any ? '<button class="tt-link" data-a="delpick">Delete a character</button>' : ''}<p class="tt-note">Your characters share your houses and what is in them. Each keeps their own bank.</p></div>`);
  }
  function delPick() { showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box tt-slots"><h1>Delete who?</h1>${A.slots.map((c, i) => c ? `<button class="tt-btn quiet" data-a="delslot" data-i="${i}">${esc(c.name)}<small>${i === A.main ? 'Main: the Trials start over with your next new character' : 'Supporting'}</small></button>` : '').join('')}<button class="tt-btn" data-a="totitle">Back</button></div>`); }
  function playSlot(i) { if (!A.slots[i]) return; if (i !== A.cur) { save(); A.cur = i; loadCur(); DG = null; Q = null; F = null; CE = null; S.pos = S.pos || null; $('#enc').hidden = true; $('#fight').hidden = true; $('#nav').hidden = false; tab = 'world'; sel = S.region; save(); if (sceneUp) { Scene.load(S.pos, S.pos || S.tut ? S.region : 'dock'); if(S.dungeon)DP.restore(); surfaceBodies(); Scene.refresh(); } } hideTitle(); render(); renderHud(); }
  function create() {
    CR = CR || { path: null, look: null, name: '' };
    showTitle(`<div class="cr"><h2>Who were you back home?</h2><p class="cr-note">A young name people had started to talk about. Pick what you were known for.</p><label class="cr-name"><span>Name</span><input id="cr-name" maxlength="16" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Your name" value="${esc(CR.name || '')}"></label>
      <div class="cr-paths">${PATHS.map(p => `<div class="cr-path${CR.path === p.id ? ' on' : ''}"><b>${p.name}</b><small>${Object.keys(p.sk).map(k => rpgName(k) + ' ' + p.sk[k]).join(' · ')}</small><div class="looks">${LOOKS[p.id].map((g, i) => { const lk = LOOK0[p.id] + i; return `<button data-a="pick" data-id="${p.id}" data-look="${lk}" aria-pressed="${CR.look === lk}" aria-label="${p.name}, look ${i + 1}">${ART ? `<img alt="" src="art/p/${g}.webp">` : `<span class="nolook">${i ? 'Her' : 'Him'}</span>`}</button>`; }).join('')}</div></div>`).join('')}</div>
      <p class="cr-note">You can learn any skill later by using it, and buy or find any page. Ten skills share ${CAP} points.</p><div class="row end"><button class="btn quiet" data-a="totitle">Back</button><button class="btn solid" data-a="begin"${CR.look == null ? ' disabled' : ''}>Begin</button></div></div>`, 'creating');
  }
  // the approach to Tallyport, three short beats, then the dock
  const tj = (n, fb) => ART && (ArtData.story_bg || []).indexOf(+n.slice(1)) >= 0 ? n : fb;
  const BEATS = [[tj('J04', 'J02'), 'A storm, then nothing. You wake on the deck of a small trading ship, the Marigold, coughing up seawater, with a sailor standing over you holding a boathook.'],
    ['J02', 'The bosun sits down next to you. "Tallyport lost its champion two weeks ago. Corin Hale, drowned in the Bilge Vaults. Now you turn up, out of nowhere, with stories like those. People are going to talk."'],
    [tj('J05', 'J01'), 'Three days later the Marigold ties up in Tallyport. Half the town is on the dock. The crew have told everyone who you are, and Tallyport has already decided you’re its new champion.']];
  function coldOpen(i) { i = i || 0; const b = BEATS[i], last = i === BEATS.length - 1; showTitle(`<div class="tt-art"${tbg(b[0])}></div><div class="tt-box"><p class="tt-story">${esc(b[1])}</p>${last ? '<button class="tt-btn" data-a="ashore">Step ashore</button><button class="tt-link" data-a="skipguide">I know how to play: skip the guided start</button>' : `<button class="tt-btn" data-a="beat" data-i="${i + 1}">Continue</button>`}</div>`); }
  const wait = () => `<p class="loading">${engineErr ? esc(engineErr) : 'The Ledger is opening…'}</p>`;

  let MAPURL = null;
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
  function vMap() {
    if(DG&&Scene.debug().map.dungeonFloor)return vDungeonMap();
    const cur = sel || S.region, [W, H] = Scene.size, mini = sceneUp && Scene.mini(); if (mini && !MAPURL) { try { MAPURL = mini.toDataURL(); } catch (e) { } }
    const TW = sceneUp ? Scene.towns() : null, pos = sceneUp && !Scene.inDungeon() ? Scene.pos() : S.pos;
    const pins = TW ? REGIONS.map(r => { const t = TW[r.id]; return `<button class="pin${unlocked(r.id) ? '' : ' locked'}${r.id === cur ? ' sel' : ''}${S.boss[r.id] ? ' beaten' : ''}" style="left:${100 * t[0] / W}%;top:${100 * t[1] / H}%" data-a="sel" data-r="${r.id}" aria-label="${esc(r.name)}"><b>${ROMAN[r.id]}</b><span>${esc(r.name)}</span></button>`; }).join('') : '';
    const me = pos ? `<i class="me" style="left:${100 * pos[0] / W}%;top:${100 * pos[1] / H}%"></i>` : '';
    const SI = sceneUp ? Scene.sites() : [], siteOf = id => SI.find(s => s.id === id), here = pos ? { x: pos[0], y: pos[1] } : null, far = s => here && s ? `${Math.round(Math.hypot(s.x - here.x, s.y - here.y))} paces ${compass(here, s)}` : '', dot = (s, c, t) => s ? `<i class="dot ${c}" title="${esc(t || s.name)}" style="left:${100 * s.x / W}%;top:${100 * s.y / H}%"></i>` : '';
    const ers = Object.values(S.er.a), erDots = ers.map(a => dot(siteOf(a.type === 'deliver' ? a.to : a.type === 'find' && !a.found ? a.at : a.id), 'er', a.what)).join(''), knownDots = (S.known[cur] || gift('eye') ? SI.filter(s => s.r === cur && s.kind !== 'roam' && s.kind !== 'lair').map(s => dot(s, s.kind)).join('') : '') + SI.filter(s => s.kind === 'lair' && s.r === cur && ((S.lairs && S.lairs[s.id]) || gift('eye'))).map(s => dot(s, 'lair', s.name)).join('') + (S.homes || []).filter(h => h.r === cur).map(h => dot({ x: h.x, y: h.y }, 'home2', 'Your home')).join('');
    const erList = ers.length ? `<div class="card"><p class="eyebrow">Errands · ${ers.length} open · ${S.er.n || 0} done</p><ul class="tale plain">${ers.map(a => { const tgt = siteOf(a.type === 'deliver' ? a.to : a.type === 'find' && !a.found ? a.at : a.id); return `<li>${esc(a.what)} <small>${esc(a.from)}, ${esc(region(a.r).name)} · ${errandProg(a)} · ${a.gold} gold${tgt ? ` · ${a.type === 'deliver' ? 'drop-off' : a.type === 'find' && !a.found ? 'the place' : 'giver'} is ${far(tgt)}` : ''}</small> <button class="btn sm quiet" data-a="erdrop" data-id="${a.id}">Drop</button></li>`; }).join('')}</ul></div>` : '';
    const r = region(cur), b = BOSSES[cur - 1], D = DUNGEONS[cur - 1], open = unlocked(cur), tw0 = TW ? TW[cur] : null, dirOf = t => { const dx = t.x - tw0[0], dy = t.y - tw0[1], a = Math.atan2(dy, dx) / Math.PI * 4; return ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][((Math.round(a) % 8) + 8) % 8]; }, grounds = sceneUp ? Scene.terr().filter(t => t.r === cur && t.hab && t.name) : [], mons = grounds.length ? '' : BOUNTIES.filter(x => x.r === cur).map(x => MONSTERS[x.id][0]).join(', ');
    return `<section class="place" style="--acc:${HUES[cur]}"><p class="eyebrow">One land, eight circles</p><h1>The Road North</h1></section>
      <div class="wmap">${MAPURL ? `<img alt="Map of the land" src="${MAPURL}">` : ''}${pins}${knownDots}${erDots}${me}</div>
      ${erList}
      ${(S.homes || []).length ? `<div class="card"><p class="eyebrow">Your homes</p><ul class="goods">${S.homes.map(h => `<li class="good">${ico('deed')}<div><b>${esc(h.name)}</b><small>${esc(region(h.r).name)}${pos ? ' · ' + Math.round(Math.hypot(h.x - pos[0], h.y - pos[1])) + ' paces ' + compass({ x: pos[0], y: pos[1] }, h) : ''}</small></div>${h.pad ? `<button class="btn sm" data-a="tphome" data-h="${h.id}">Teleport</button>` : '<small>no pad</small>'}</li>`).join('')}</ul></div>` : ''}
      <div class="row"><button class="btn sm quiet" data-a="showblocked">${S.showb ? 'Hide' : 'Show'} blocked ground</button></div>
      <div class="card" style="border-left:4px solid ${HUES[cur]}"><p class="eyebrow">${CIRCLE[cur]} Circle · ${esc(r.sub)}</p><h3>${esc(r.name)}</h3><p>${esc(r.blurb)}</p>
        <div class="kv"><span>Teaches</span><span>${esc(r.teaches)}</span><span>Exercises</span><span>${doneIn(cur)} of ${totalIn(cur)}</span>${grounds.length ? '' : `<span>Roaming</span><span>${esc(mons)}</span>`}<span>Dungeon</span><span>${esc(D.name)}</span><span>Material</span><span>${MATS[cur]}</span><span>Examiner</span><span>${esc(b.name)}${S.boss[cur] ? ' (mark held)' : ''}</span></div>
        ${grounds.length ? `<p class="lab" style="margin:4px 0 0">Creature grounds</p><ul class="tale plain">${grounds.map(t => `<li>${esc(t.name)} <small>${esc(MONSTERS[t.tpl][0])}${t.agg ? ', hunts' : ''} · ${dirOf(t)} of town</small></li>`).join('')}</ul>` : ''}
        ${open ? (cur === S.region ? `<div class="row"><span class="pill ok">You are here</span><span class="grow"></span><button class="btn solid" data-a="tab" data-t="world">Return to the world</button></div>` : `<div class="row end"><button class="btn solid" data-a="travel" data-r="${cur}">Travel to the town</button></div>`) : `<p><span class="pill rust">Not visited</span> Walk there. One road joins every town, and nothing bars it.</p>`}</div>`;
  }

  /* ---------- speech box: along the bottom of the world, one line at a time, choices at the end ---------- */
  let SB = null;
  const optHTML = o => `<button class="opt" data-a="${o.a}"${Object.keys(o.d || {}).map(k => ` data-${k}="${esc(o.d[k])}"`).join('')}${o.off ? ' disabled' : ''}><span>${esc(o.t)}</span>${o.n ? `<small>${esc(o.n)}</small>` : ''}</button>`;
  function dlg(e, line, opts, extra) {
    const raw = (String(line).match(/[^.!?]+[.!?]+["”’']*|[^.!?]+$/g) || [String(line)]).map(x => x.trim()).filter(Boolean), parts = [];
    for (const x of raw) { if (parts.length && parts[parts.length - 1].length + x.length < 72) parts[parts.length - 1] += ' ' + x; else parts.push(x); }
    if (SB) clearInterval(SB.timer); $('#sheet').hidden = true;
    opts = (opts || []).filter(Boolean); if (opts.length === 1 && opts[0].a === 'closesheet') opts = [];
    // someone you have already met says their first line and the choices come at once; the rest of what they say is a tap on the text away
    const tk = e ? (e.hid || `${e.kind}.${e.r}.${e.i != null ? e.i : e.name}`) : null; S.tk = S.tk || {}; const quick = tk && S.tk[tk] && S.tut >= 3 && opts.length > 0; if (tk) S.tk[tk] = 1;
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
  function closeSay() { if (SB) clearInterval(SB.timer); SB = null; const el = $('#say'); if (el) { el.hidden = true; el.innerHTML = ''; } }
  const bye = { t: 'Goodbye', a: 'closesheet' }, back = { t: 'Back', a: 'talk' };
  const jobsOf = e => CONTRACTS.filter(c => c.r === e.r && giverOf(c) === e.i);
  const here = () => (CE && CE.r) || S.region;
  function odalys(line) { const e = sceneUp && !Scene.inDungeon() && Scene.find(x => x.kind === 'npc' && x.i === 0 && x.r === 1); if (e) setTimeout(() => { if (!Q && !F && !SB) { CE = e; dlg(e, line, [bye]); } }, FAST() ? 0 : 350); }

  /* ---------- the guided first day. Tamsin, the deckhand who pulled you out, walks you round Tallyport one thing at a time. ---------- */
  const T1 = () => Scene.towns()[1], SP = k => Scene.spots()[k], entAt = f => { const e = Scene.find(f); return e && [e.x, e.y]; }, odAt = () => entAt(x => x.kind === 'npc' && x.i === 0 && x.r === 1);
  const nearest = f => { if (!sceneUp) return null; const p = Scene.pos(), m = Scene.debug().map; if (!p || !m) return null; let best = null, bd = 1e9; for (const e of m.ents) if (f(e) && !e.dying) { const d = Math.hypot(e.x - p[0], e.y - p[1]); if (d < bd) { bd = d; best = e; } } return best && [best.x, best.y]; };
  const off = (a, dx, dy) => a && [a[0] + dx, a[1] + dy];
  const BOAST = { warrior: 'The crew say you’ve never lost a duel back home.', mage: 'The crew say you could call fire out of the air back home.', thief: 'The crew say no lock ever kept you out back home.', crafter: 'The crew say a king paid for a blade you made back home.' };
  const GD = [
    { id: 'walk', ob: 'Tap the boards near you to walk', at: () => off(SP('dock'), 3, 0), say: '"Easy. You’ve been flat on your back for three days. Tap the boards near you and walk over to me."' },
    { id: 'run', ob: 'Tap somewhere far up the pier to run', at: () => off(SP('dock'), 11, 0), say: '"Good, the legs work. Now tap somewhere far off. You’ll run when it’s a long way."' },
    { id: 'folk', ob: 'Tap someone on the dock to talk', at: () => off(T1(), -14, 2), arrow: () => nearest(e => e.kind === 'folk' && e.r === 1), say: '"That’s half the town come to look at you. Go on, talk to someone. Tap a person."' },
    { id: 'odalys', ob: 'Go into the dojo, north-east of the square (!)', at: () => off(SP('dojo1'), 1, 1), arrow: () => SP('dojo1'), hall: () => entAt(x => x.kind === 'odalys'), say: '"Odalys Brine is waiting for you in the dojo, north-east of the square. She taught half the masters on this coast. Look for the ! over the door."' },
    { id: 'fight', ob: 'The Green, south of town: tap a gull', tabs: ['ledger'], at: () => off(T1(), 5, 13), arrow: () => nearest(e => e.kind === 'mon' && e.r === 1 && !e.inst.elite) },
    { id: 'loot', ob: 'Tap the body to take what it dropped', arrow: () => nearest(e => e.kind === 'corpse' && e.r === 1 && e.loot) },
    { id: 'bag', ob: 'Open your Bag and equip the weapon Tamsin gave you', tabs: ['bag', 'hero'], say: '"Here. This was in the Marigold’s hold and nobody’s claimed it. Bread too. Open your Bag and put it in your hand."' },
    { id: 'sell', ob: 'Sell the old weapon at the stall', at: () => off(entAt(x => x.kind === 'stallkeep' && x.r === 1), 1, 1), arrow: () => entAt(x => x.kind === 'stallkeep' && x.r === 1), say: '"That rusty thing you picked up won’t fetch much, but the stall will take it. Tap the stallkeeper and sell your common gear."' },
    { id: 'page', ob: 'Buy a second page from Odalys', at: () => off(odAt(), 1, 1), arrow: odAt, say: '"Odalys sells pages, the moves you use in a fight. Go and buy a second one from her."' },
    { id: 'bank', ob: 'Talk to the banker', at: () => off(entAt(x => x.kind === 'banker' && x.r === 1), -1, 0), arrow: () => entAt(x => x.kind === 'banker' && x.r === 1), say: '"Before you go any further out, see the banker. You’ll want to hear what she tells you."' },
    { id: 'tower', ob: 'Climb the harbor tower by the pier', at: () => off(SP('tower'), 1, 1), arrow: () => SP('tower'), say: '"From here on, a fall costs you what you’re carrying. Come up the harbor tower by the pier. You can see the whole coast from the top."' },
    { id: 'fish', ob: 'Cast a line off the end of the pier, or tap Tamsin to skip', tabs: ['map'], at: () => off(SP('pierfish'), 2, 0), arrow: () => SP('pierfish'), say: '"Everyone in Tallyport fishes. Cast a line off the end of the pier if you like, or tap me and we’ll skip it."' },
    { id: 'vault', ob: 'Go down into the Bilge Vaults', at: () => off(SP('dun1'), 1, 0), arrow: () => entAt(x => x.kind === 'stairs' && x.r === 1), say: '"The Bilge Vaults are where Corin died. You’ll have to go down there one day, so come and look while I’m with you. I’ll be at the stairs."' },
    { id: 'chest', ob: 'Beat one guardian, then open the vault chest', arrow: () => DG && DG.left <= 0 ? nearest(e => e.kind === 'chest') : nearest(e => e.kind === 'guard') },
    { id: 'road', ob: 'Walk with Tamsin to the examiner’s ring on the road out', at: () => off(SP('boss1'), 0, 3), arrow: () => SP('boss1'), say: '"That’s enough for one day. Climb out and I’ll walk you to the road. I’ll wait by the ring of stones."' }];
  const gOn = () => S.gd >= 0 && S.gd < GD.length, gid = () => gOn() ? GD[S.gd].id : null, gix = id => GD.findIndex(g => g.id === id);
  const gTabs = () => { const t = ['world']; for (let i = 0; i <= Math.min(S.gd, GD.length - 1); i++) (GD[i].tabs || []).forEach(x => t.push(x)); return t; };
  const tamsin = () => (sceneUp && (Scene.find(x => x.kind === 'guide') || Scene.guideEnt())) || { name: 'Tamsin', sub: 'Deckhand, the Marigold', pt: ART && ArtData.faces ? ArtData.faces.fisher : undefined };
  let GSAY = 0;
  function gSay(line, opts) { clearInterval(GSAY); if (!line) return; let n = 0; GSAY = setInterval(() => { if (++n > 600 || !gOn()) return clearInterval(GSAY); if (!S || Q || F || SB || LB || !$('#sheet').hidden || tab !== 'world' || !$('#title').hidden || !sceneUp) return; clearInterval(GSAY); CE = tamsin(); dlg(CE, line, opts || [bye]); }, FAST() ? 30 : 350); }
  function gPlace() { if (!sceneUp) return; if (!gOn()) return Scene.guideOff(); const g = GD[S.gd]; const at = g.at && g.at(); if (at) Scene.guidePut(at[0], at[1]); else if (!Scene.find(x => x.kind === 'guide')) { const p = S.pos || SP('dock'); if (p) Scene.guidePut(p[0] + 1, p[1]); } }
  function gEnter(quiet, boot) { if (!gOn()) return; const g = GD[S.gd]; gPlace(); if (g.tabs && !boot) S.gn = g.tabs[0]; renderNav(); if (g.id === 'bag') gGift(); if (!quiet) gSay(g.say, g.id === 'fish' ? [{ t: 'Skip it', a: 'gnext' }, { t: 'I’ll cast', a: 'closesheet' }] : null); HOST._k = null; }
  function gDone(id) { if (gid() !== id) return; S.gd++; save(); if (S.gd >= GD.length) return gEnd(); gEnter(); }
  function gGift() { if (S.gk && itemById(S.gk)) return; const it = makeItem('uncommon', 1, 'weapon', S.path === 'mage' ? 'magery' : armsSkill()); S.inv.push(it); S.gk = it.id; addFood('loaf', 2); save(); }
  function gEnd() { S.gd = GD.length; S.tut = 3; S.hints++; S.gn = 0; save(); renderNav(); CE = tamsin(); dlg(CE, `"Here’s the examiner’s ring. Don’t step inside until Odalys says you’re ready. I’m due back on the Marigold. Good luck, ${S.name || 'stranger'}."`, [bye]); setTimeout(() => { if (sceneUp) Scene.guideOff(); }, 400); toast('The guided start is done. You can go anywhere now.'); }
  let GW = 0; function gMoved(x, y, dun, run) { const id = gid(); if (id === 'walk' && ++GW >= 2) { GW = 0; gDone('walk'); } else if (id === 'run' && run && ++GW >= 3) { GW = 0; gDone('run'); } else if (id === 'road' && !dun) { const b = SP('boss1'); if (b && Math.hypot(b[0] - x, b[1] - y) < 6) gDone('road'); } }
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
  function sparTick() {
    if (!sceneUp || !Scene.inHall()) { clearInterval(SPT); SPT = 0; return; }
    if (DU && DU.mode !== 'watch') return; const pr = Scene.ents().filter(e => e.spar); if (pr.length < 2 || (DU && DU.mode === 'watch')) return;
    const n = SPN++ % 40, who = (SPN / 40 | 0) % 2, a = pr[who], d = pr[1 - who];
    if (n < 16) { a.ff = SEQ[Math.min(SEQ.length - 1, n >> 1)]; d.ff = n >= 7 && n < 11 ? 6 : 1; } else { a.ff = 1; d.ff = 1; }
  }
  // a short animation of one fighter striking another (or the dummy); calls done when it lands
  function strike(att, def, done) {
    const fr = [2, 3, 4, 4, 5, 1]; let i = 0; if (!att) return done && done();
    const t = setInterval(() => { att.ff = fr[i]; if (i === 3) { if (def && def.fs != null) def.ff = 6; if (done) done(); } if (++i >= fr.length) { clearInterval(t); setTimeout(() => { if (def && def.fs != null) def.ff = 1; }, 300); } }, FAST() ? 1 : 110);
  }
  function hurtDummy(e, broken) { if (!e) return; e.ok = broken ? 'dj_dummy2' : 'dj_dummy1'; e.obj = null; e.sv = -1; if (!broken) setTimeout(() => { e.ok = 'dj_dummy'; e.obj = null; e.sv = -1; }, 550); }
  const djTask = c => { const tpl = pick(BOUNTIES.filter(b => b.r === c)).id; return makeTask({ tpl, seed: seeded(tpl) }); };
  const djCircle = (r, bout) => bout < 2 ? pick([Math.max(1, r - 1), r]) : r;

  /* ----- the duel panel: your query against theirs ----- */
  const djTokens = () => { const won = [1, 2, 3, 4, 5, 6, 7, 8].filter(r => S.dj && S.dj[r] && S.dj[r].champ); return won.length ? `<section class="sec"><h2>Dojo tokens <small>${won.length} of 8</small></h2><div class="toks">${won.map(r => `<span title="${esc(tName(r))}">${ico('dz' + (8 + r))}</span>`).join('')}</div></section>` : ''; };
  const STUL = ["\"I’m in the bracket this week. Don’t draw me in the first round.\"", "\"We spar every day. Tap me if you want to watch a bout.\"", "\"Master says I GROUP BY like I’m sorting laundry.\"", "\"The travellers come through for every tournament. The old woman’s the worst.\""], TRVL = ["\"Brick Dorran. I don’t talk much. I write short queries.\"", "\"Granny Wick. Been fighting these brackets since before your master was born. Mind your WHERE.\"", "\"P-Pip Lowell. I’ve never got past the second round. This time, maybe.\""];
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
  const fitDU = () => requestAnimationFrame(() => { if (DU) Scene.FX.inset($('#fight').offsetHeight); });
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
    if (b && !b.out && b.round < 4) return sheet(`${head}<p class="story">Bout ${b.round + 1} of 4 is next: you against ${esc(djOpp(b, b.round).name)}. Each bout is first to two rounds. You both get the same question; a right answer first takes the round.</p>${bracketHTML(b)}<div class="row end"><button class="btn quiet" data-a="closesheet">Later</button><button class="btn solid" data-a="djfight">Fight the next bout</button></div>`);
    sheet(`${head}<p class="story">Sixteen in a bracket. Four bouts to win it, then the master spars you for the dojo’s prize. You both get the same question each round; the first right answer takes it. Entry ${fee} gold.</p>${st.champ ? `<p class="cap2">You won this tournament${st.master ? ' and beat the master' : ''}.</p>` : ''}${b && b.out ? `<p class="cap2">You went out in the ${['round of sixteen', 'quarter-final', 'semi-final', 'final'][b.round]}. Pay again to have another go.</p>` : ''}<div class="row end"><button class="btn quiet" data-a="closesheet">Not now</button><button class="btn solid" data-a="djsign"${S.gold < fee ? ' disabled' : ''}>Enter, ${fee} gold</button></div>`);
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
    if (d.bout === 4) { const st = DJ(r); if (won && !st.master) { st.master = 1; const pd = !!A.djp['m' + r]; if (!pd) { A.djp['m' + r] = 1; const P2 = Object.assign({ id: 'i' + rid(), rarity: 'unique', unique: 1, tier: r }, JSON.parse(JSON.stringify(Dojo.PRIZES[r - 1]))); give(P2); S.gold += 60 * r; S.blessd = (S.blessd || 0) + 1; if (r >= 5) (S.pscr = S.pscr || []).push(makePscr(r + 1)); setTimeout(() => toast(r >= 5 ? 'Also: a bless deed and a power scroll' : 'Also: a bless deed'), 900); } save(); const M = Scene.find(x => x.kind === 'master'); CE = M; const say = pd ? `"Good bout. The prize went to ${A.slots.find((c, i) => c && i !== A.cur) ? 'one of yours already' : 'you already'}, so this one is for the practice."` : '"You’ve earned it." ' + (isMain() ? Dojo.SAY[r - 1].ilva.join(' ') : ''); return dlg(M || { name: Dojo.MASTERS[r - 1].name, pt: Dojo.MASTERS[r - 1].pt }, say, [pd ? { t: 'Thanks', a: 'closesheet' } : { t: 'Take the prize', n: Dojo.PRIZES[r - 1].name, a: 'closesheet' }]); }
      save(); render(); return toast(won ? 'You beat the master again.' : 'The master wins. Try again any time.'); }
    const b = S.djb; if (!won) { b.out = 1; save(); render(); return toast(`Out of the tournament. ${d.opp.name} goes through.`); }
    if (b.round === 3) { DJ(r).sorrel = 1; }
    b.round++; if (b.round === 4) { const st = DJ(r), first = !st.champ; st.champ = 1; if (!A.djp['c' + r]) { A.djp['c' + r] = 1; S.gold += 120 * r; } S.djb = null; save(); render(); const M = Scene.find(x => x.kind === 'master');
      const so = Scene.find(x => x.kind === 'sorrel'); if (so) so.ff = 7;
      setTimeout(() => { CE = M; dlg(M, `"That’s the ${tName(r)} tournament won. Here’s the purse${first ? ', and the dojo’s token' : ''}. When you’re ready, I’ll spar you for the prize."`, [{ t: 'Spar the master', n: 'first to two rounds', a: 'djmaster' }, { t: 'Later', a: 'closesheet' }]); }, 500);
      return toast(`Champion of the ${tName(r)} dojo: ${120 * r} gold`); }
    save(); render(); toast(`Through to the ${['', 'quarter-final', 'semi-final', 'final'][b.round]}`);
  }

  /* ----- Odalys and the dummy: the first thing you see in Tallyport ----- */
  const ODQ = `WITH weak AS (\n  SELECT part, strength,\n         RANK() OVER (ORDER BY strength) AS rk\n  FROM training_dummy\n)\nSELECT w.part, j.holds\nFROM weak w\nJOIN dummy_joints j ON j.part = w.part\nWHERE w.rk <= 3;`;
  const TRY = { warrior: 'You swing with everything you’ve got. The blade stops an inch into the straw as if it hit stone, and leaves no mark.', mage: 'You call fire the way you always have. Nothing comes. Your hand is just a hand.', thief: 'You go for the straps at its back. The knot won’t give, and the strap might as well be iron.', crafter: 'You hit the joint where a dummy always splits. The hammer bounces off and stings your arm.' };
  function odx(n) {
    const o = Scene.find(x => x.kind === 'odalys'), dm = Scene.find(x => x.kind === 'dummy' && x.i === 9), me = { name: S.name || 'You', pt: LOOKS[S.path][(S.look != null ? S.look : 0) % 2] };
    closeSay();
    if (n === 1) { Scene.hop(4, 8); Scene.FX.face(dm); let k = 0; const go = () => { Scene.FX.swing('me', dm, S.path === 'mage' ? 'spell' : 'hit'); Scene.FX.hit(dm, '0', '#cfd6d8'); if (++k < 3) setTimeout(go, FAST() ? 1 : 520); else setTimeout(() => { CE = me; dlg(me, TRY[S.path] || TRY.warrior, [{ t: 'Go on', a: 'odx', d: { n: 2 } }]); }, FAST() ? 1 : 500); }; return go(); }
    if (n === 2) { CE = o; return dlg(o, '"Hm. Watch."', [{ t: 'Watch', a: 'odx', d: { n: 3 } }]); }
    if (n === 3) { const el = $('#odq'); el.hidden = false; let i = 0; const L = ODQ.length; o.ff = 2;
      const t = setInterval(() => { i = Math.min(L, i + 3); el.innerHTML = `<pre class="code">${hlq(ODQ.slice(0, i))}<span class="du-caret"></span></pre>`; o.ff = [2, 3, 4, 4][(i / 30 | 0) % 4];
        if (i >= L) { clearInterval(t); o.ff = 5; let k = 0; const hit = setInterval(() => { Scene.FX.hit(dm, ['−∞', 'crack', 'snap'][k % 3], '#ffe08a'); if (++k >= 5) { clearInterval(hit); hurtDummy(dm, true); o.ff = 0; setTimeout(() => { el.hidden = true; CE = o; dlg(o, '"Hmm. Never heard of SQL?"', [{ t: 'No', a: 'odx', d: { n: 4 } }]); }, FAST() ? 1 : 1400); } }, FAST() ? 1 : 160); } }, FAST() ? 1 : 45); return; }
    if (n === 4) { CE = o; return dlg(o, '"Everything in this land is written in the Ledger: every blade, every coin, every straw in that dummy. Skill here means asking the Ledger the right question. Ask it right and the Ledger makes it so. Structured Query Language, if you want the whole name. Everybody just says SQL."', [{ t: 'Go on', a: 'odx', d: { n: 5 } }]); }
    if (n === 5) { CE = o; const arm = { warrior: 'Your sword arm', mage: 'Your magic', thief: 'Your quick hands', crafter: 'Your trade' }[S.path] || 'Your strength'; return dlg(o, `"${arm} doesn’t count here until the Ledger knows about it. I’m too old to stand for the town anymore. I taught the last one who came out of that sea, Ilva Thorne, and she trained Corin. By the time you reach the Audit, you’ll write what I just wrote."`, [{ t: 'Begin', n: 'the first lesson', a: 'start', d: { k: 'intro' } }]); }
  }

  function objective() {
    if (!S.path) return 'Choose your path';
    if (gOn()) return GD[S.gd].ob;
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
    if (type === 'bring') { const o = pickG([['meat', 2, 'cuts of meat'], ['hide', 2, 'hides'], ['fish', 2, 'fish'], ['mat', 3, MATS[r]]].filter(o => (SETTLE[e.role].sells || []).indexOf(o[0]) < 0)); E.item = o[0]; E.n = o[1] + Math.floor(g() * 2); E.x = o[2]; E.what = `Bring ${E.n} ${E.x}`; }
    else if (type === 'hunt') { E.tpl = pickG(HOST.tpls(r)); E.n = 2 + Math.floor(g() * 2); E.x = MONSTERS[E.tpl][0]; E.what = `Defeat ${E.n} ${E.x}s`; }
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
  // what a country person has for sale today
  function countryStock(e) {
    const R = SETTLE[e.role], r = e.r, st = S.cs[e.hid] && S.cs[e.hid].day === dayKey() ? S.cs[e.hid] : (S.cs[e.hid] = { day: dayKey(), items: R.gear ? Array.from({ length: R.gear }, () => makeItem(rollRarity(luck(), 1), r)) : [], key: R.keys ? 1 : 0 });
    const fp = k => Math.round(FOOD[k][3] * (1 + (r - 1) * .45)), goods = (R.sells || []).map(k => ({ ic: FOOD[k][2], name: FOOD[k][0], meta: `Restores ${FOOD[k][1]} health`, price: fp(k) + ' gold', a: 'buyfood', d: { k, c: fp(k) }, off: S.gold < fp(k) }));
    if (R.tonic) goods.push({ ic: 'draught', name: 'Healing Draught', meta: 'Restores 30 health, in or out of a fight', price: 7 * r + ' gold', a: 'buytonic', d: { c: 7 * r }, off: S.gold < 7 * r });
    if (R.mats) goods.push({ ic: 'mat' + r, name: MATS[r], meta: 'A crafting material', price: 6 * r + ' gold', a: 'buymat', d: { c: 6 * r }, off: S.gold < 6 * r });
    if (st.key) goods.push({ ic: 'hintkey', name: 'Hint Key', meta: 'Pays for one hint. One a day', price: 22 * r + ' gold', a: 'buykey', d: { c: 22 * r }, off: S.gold < 22 * r });
    st.items.forEach((it, i) => goods.push({ ic: it.ic, name: it.name, cls: 'rar-' + it.rarity, meta: `${it.slot} · ${statLine(it)}`, price: price(it) + ' gold', a: 'buygear', d: { i }, off: S.gold < price(it) }));
    const hd = have('hide'); shopSheet(e, R.say[1], goods, R.hides ? `<button class="btn sm quiet" data-a="sellhides"${hd ? '' : ' disabled'}>Sell ${hd || 'no'} hide${hd === 1 ? '' : 's'} at ${R.hides * r} gold</button>` : '');
  }
  const fishLeft = fid => { const d = S.fishd[fid]; return d && d.day === dayKey() ? Math.max(0, 4 - d.n) : 4; };
  function fishOpen(e, i) {
    if (!fishLeft(e.fid)) return toast('The fish here have gone quiet until tomorrow'); const r = e.r, c = Math.max(1, Math.min(8, i === 0 ? r - 2 : i === 1 ? r : r + 1)), tpl = pick(BOUNTIES.filter(b => b.r === c)).id;
    Sound.sfx('fishCast'); closeSay(); closeSheet(); FI = { e, r, i, c, task: makeTask({ tpl, seed: seeded(tpl) }), res: null, out: null, err: '', draft: '' }; Scene.pause(); $('#enc').hidden = false; $('#nav').hidden = true; fiDraw();
  }
  function fiRun() {
    const sql = $('#sql').value; if (!sql.trim() || FI.res) return; FI.draft = sql; const res = Engine.grade(FI.task, sql); if (res.err) { FI.err = res.err; return fiDraw(); }
    S.stats.q++; if (res.ok) { S.stats.ok++; trainSql(res.used || [], FI.task.kc, sql); } const fid = FI.e.fid, d = S.fishd[fid] && S.fishd[fid].day === dayKey() ? S.fishd[fid] : (S.fishd[fid] = { day: dayKey(), n: 0 }); d.n++;
    const fs = rv('fishing'), r = FI.r, deep = FI.i, diff = FI.c * 10 + deep * 6, o = odds(fs + 25, diff, res.grade, res.share), F4 = FISH[r - 1], u = rnd(), G = { gold: 0, items: [], scrolls: [], food: {} }; let t, sp = '', ic = '';
    if (rnd() * 100 >= o.p) { const junk = !res.ok && rnd() < .35 ? pick(JUNK) : ''; t = res.ok ? 'Right answer, but nothing’s biting. Try another cast.' : junk ? `You pull up ${junk}.` : 'Nothing bites.'; if (junk) ic = /boot/.test(junk) ? 'boot' : /weed|reed/.test(junk) ? 'weed' : /key/.test(junk) ? 'rustkey' : ''; }
    else if (deep === 2 && fs >= FISHNEED.treasure && u < .24) { const k = pick(['chest', 'pearl', 'coin', 'bottle']); ic = { chest: 'sunkchest', pearl: 'pearl', coin: 'oldcoin', bottle: 'bottle' }[k];
      if (k === 'chest') { G.items.push(makeItem(rollRarity(luck(), 2), r)); G.gold = rint(10, 25) * r; t = 'The line snags, then gives. Up comes a small locked chest, streaming water.'; } else if (k === 'pearl') { G.gold = 40 * r; t = 'An oyster with a pearl inside. You sell it on the spot.'; } else if (k === 'coin') { G.gold = 26 * r; t = 'An old gold coin, crusted with barnacles.'; }
      else { const left = PAGES.filter(p => p.c === Math.min(8, r) && !owned(p.id) && !S.scr[p.id]); if (left.length) G.scrolls.push(pick(left).id); else S.hints++; t = 'A corked bottle with a scroll inside.'; } }
    else if (deep >= 1 && fs >= FISHNEED.rare && u < .2) { sp = F4[3]; ic = ['glowfish', 'eel', 'carp', 'crab'][r % 4]; G.gold = 34 * r; S.fishlog[sp] = (S.fishlog[sp] || 0) + 1; t = `${sp}. People fish this water all their lives and never see one. A collector pays you on the spot.`; }
    else if (deep >= 1 && fs >= FISHNEED.good && u < .62) { sp = F4[2]; ic = r % 2 ? 'bigfish' : 'pike'; G.food.bigfish = 1; S.fishlog[sp] = (S.fishlog[sp] || 0) + 1; t = `A ${sp}, and a good one.`; }
    else { sp = F4[u < .5 ? 0 : 1]; ic = u < .5 ? 'fish' : 'perch'; G.food.fish = 1; S.fishlog[sp] = (S.fishlog[sp] || 0) + 1; t = `A ${sp}.`; }
    Sound.sfx(sp || ic && !['boot', 'weed', 'rustkey'].includes(ic) ? 'fishCatch' : 'fishEmpty');
    const gn = gain('fishing', Math.min(95, diff), res.ok ? 1 : res.grade === 'close' ? .5 : .25), got = grant(G); FI.res = res; FI.out = { t, got, gn, ic }; if (gid() === 'fish') setTimeout(() => gDone('fish'), 1500); save(); renderHud(); fiDraw();
  }
  function fiClose() { FI = null; $('#enc').hidden = true; $('#enc').innerHTML = ''; $('#nav').hidden = false; Scene.refresh(); render(); }
  function fiDraw() {
    const el = $('#enc'), t = FI.task, res = FI.res, left = fishLeft(FI.e.fid); el.className = 'q pk fi'; felt(0);
    const verdict = res ? `<p class="pk-q ${res.ok ? 'me' : ''}"><b>${res.ok ? 'A clean cast' : res.grade === 'close' ? 'Close' : res.grade === 'partial' ? 'Part of the way' : 'Not the answer'}</b>${res.ok ? '' : `<span>${esc(res.why || res.msg || '')}</span>`}</p><p class="pk-res">${FI.out.ic && ART && ArtData.icons.at[FI.out.ic] ? ico(FI.out.ic) + ' ' : ''}${esc(FI.out.t)}</p>${spoilsHTML(FI.out.got)}${gainsHTML(FI.out.gn ? [FI.out.gn] : [])}` : '';
    const body = `<div class="pk-body"><p class="pk-log">${esc(CASTS[FI.i].n)}</p><div class="fi-ask"><p>${t.ask}</p>${t.tip ? `<p class="cap2">${t.tip}</p>` : ''}</div>${FI.err && !res ? `<p class="pk-q"><span>${esc(FI.err)}</span></p>` : ''}${verdict}</div>`;
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

  const goodHTML = g => `<li class="good">${ico(g.ic)}<div><b class="${g.cls || ''}">${esc(g.name)}</b><small>${g.meta || ''}</small></div>${g.pill ? `<span class="pill ok">${g.pill}</span>` : `<button class="btn sm" data-a="${g.a}"${Object.keys(g.d || {}).map(k => ` data-${k}="${esc(g.d[k])}"`).join('')}${g.off ? ' disabled' : ''}>${g.price}</button>`}</li>`;
  function shopSheet(e, line, goods, extra) { setTimeout(() => coach(goods && goods.some(g => g.a === 'buyfood' || g.a === 'buymat') ? 'trade' : 'shop'), 0); CE = e; const pt = e.spr || e.pt ? Scene.portrait(e) : ''; sheet(`<div class="shop-head">${pt ? `<img alt="" src="${pt}">` : ''}<div><p class="eyebrow">${esc(e.sub || '')}</p><h2>${esc(e.name)}</h2></div></div><p class="story">${esc(line)}</p><ul class="goods">${goods.map(goodHTML).join('')}</ul><div class="row end">${extra || ''}<button class="btn sm quiet" data-a="chat">Chat</button></div>`); }
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
  function deepDb() { const have = Deep.TABLES.map((t, i) => haveT(i)), key = have.join(''); if (DDB && DDK === key) return DDB; if (DDB) DDB.close(); DDB = Engine.scratch(Deep.script(have, S.name)); DDK = key; Deep.TABLES.forEach((t, i) => { if (have[i]) COLS[t.name] = t.cols; }); return DDB; }
  function applyGifts() { HPEN = gift('hint') ? 8 : 15; BODY_MS = gift('body') ? 30 * 60 * 1000 : BODY_MS0; }
  const MEAN = { t1: 'Tallyport, by a long way. Ilva wrote next to it: "Start where you are."', t2: 'Tallyport to Brackwater, more than any other crossing.',
    t3: 'Merrow Fane, a shipwright from Saltmere. Saltmere is gone now; only the Ledger still lists it.', t4: 'Every ship that sailed and never came back. Most went down in the stormy months.',
    t5: 'The careful ones made it home. Ilva underlined the name and wrote "ask why" next to it.', t6: 'November. The Brass Sea is at its worst at the turn of the year.',
    t7: 'Most of the lost ships went down in a storm on the Brass Sea. The other seas lose far fewer.', t8: 'Three different ships named Marigold, centuries apart, and they found four of the strangers between them. The one that found you is the third.',
    t9: 'Every stranger was found after a strength-12 storm on the Brass Sea. No other storm on record reaches 12.', t10: 'Forty days, every time. Forty days after each stranger was found, a light stood on the Brass Sea.',
    t11: 'Ilva took her own row out of the Ledger, a few weeks after she arrived.', t12: 'Your light comes forty days after the Marigold found you, and the Ledger already lists it.' };
  function storyCards(cards, done) { STY = { cards, i: 0, done }; storyDraw(); }
  function storyDraw() { const c = STY.cards[STY.i], last = STY.i === STY.cards.length - 1, A = ART && ArtData, bg = c.bg && A && (c.bg === 'Z01' ? A.z01 : (A.story_bg || []).indexOf(+c.bg.slice(1)) >= 0) ? ` style="background-image:url(art/${c.bg === 'Z01' ? 'bg/Z01' : 't/' + c.bg}.jpg)"` : '', pt = c.pt && A && A.story && A.story[c.pt] ? `<img class="tt-pt" alt="" src="art/p/${A.story[c.pt]}.webp">` : '';
    showTitle(`<div class="tt-art"${bg}></div><div class="tt-box">${c.who ? `<p class="tt-who">${pt}<span>${esc(c.who)}</span></p>` : ''}<p class="tt-story">${esc(c.t)}</p>${c.opts ? c.opts.map(o => `<button class="tt-btn" data-a="${o.a}">${esc(o.t)}</button>`).join('') : `<button class="tt-btn" data-a="sbeat">${last ? 'Close' : 'Continue'}</button>`}</div>`); }
  function storyNext() { if (!STY) return; if (STY.i < STY.cards.length - 1) { STY.i++; return storyDraw(); } const d = STY.done; STY = null; hideTitle(); if (d) d(); }
  function takeTable(r) { if (haveT(r)) return; S.tabs[r] = 1; const T = Deep.TABLES[r]; save();
    const cards = [{ bg: 'J09', t: `The scroll on the pedestal is warm. When you unroll it, a table you have never seen writes itself into your Ledger: ${T.name}. ${T.note}` }];
    if (r === 8) cards.push({ bg: 'J10', who: 'Ilva Thorne', pt: 'ilva', t: 'Past the vault the shelves go up into the dark. A grey-haired woman is reading at the only table. She looks up. "You found the vaults. Good. I hoped it’d be you."' },
      { bg: 'J10', who: 'Ilva Thorne', pt: 'ilva', t: '"I came here to write back the rows the council struck out. I wrote them all back except mine. I took myself out of the Ledger forty years ago, so the light wouldn’t come for me."' },
      { bg: 'J10', who: 'Ilva Thorne', pt: 'ilva', t: '"I had people here by then, and I don’t regret it. But you should get to make that choice yourself. The last Truth is in my journal. Ask it and you’ll know when."' });
    storyCards(cards, () => { if (r === 8) S.archive = 1; save(); render(); toast(!S.letter ? 'Show it to Odalys in Tallyport' : 'New table in your Ledger: ' + T.name); }); }
  function ilvaLetter() { closeSheet(); closeSay();
    storyCards([{ bg: 'J07', who: 'Odalys Brine', t: 'Odalys unlocks the door at the top of the harbor tower. "Ilva’s study. She left a letter on the desk for whoever came out of the sea next. I never thought I’d be the one handing it over."' },
      { bg: 'J08', who: 'Ilva Thorne', pt: 'ilva', t: '"If you’re reading this, you came out of the Brass Sea the way I did, forty years ago. I’m sorry I’m not there. I went north to finish something, and it couldn’t wait."' },
      { bg: 'J08', who: 'Ilva Thorne', pt: 'ilva', t: '"The Ledger they’re teaching you is a handful of tables. There used to be many more, lost so long ago that people think they’re a story. They’re real. There’s one in the vault under every town, and something guards each one."' },
      { bg: 'J08', who: 'Ilva Thorne', pt: 'ilva', t: '"Join enough of them and you can answer questions nobody else can. I call those the Great Truths. I wrote down the ones I found, and the first one is in this letter."' },
      { bg: 'Z01', who: 'Ilva Thorne', pt: 'ilva', t: '"Here’s the one table I can give you: towns. Bring the others up from the vaults. The last Truth tells you how to get home. Ilva."' }],
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
      <section class="sec"><h2>Great Truths <small>${Object.keys(S.tw).length} of ${TT.length}</small></h2>${known.length ? `<ul class="goods gts">${known.map(tr).join('')}</ul>` : ''}<p class="cap2">${hidden ? `${hidden} more to find, in Ilva’s journal and on the lair leaders.` : 'You have found all of them.'}</p></section>`; }
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
  function theDoor() { storyCards([{ bg: 'J11', t: 'Forty days after the storm that brought you, a ring of light stands on the Brass Sea, just past the harbor wall. A rowboat is waiting on the shingle.' },
    { bg: 'J11', who: 'Ilva Thorne', pt: 'ilva', t: '"It stays until dawn. After that it won’t come again in your lifetime. Whatever you choose, Tallyport won’t think any less of you."', opts: [{ t: 'Row out to the light', a: 'gohome' }, { t: 'Stay in Brasswake', a: 'stay' }] }]); }
  /* ---------- houses: deeds from any banker, placed in the wilds, painted, with a chest, a bed and a shelf ---------- */
  let DM = 0, PL = null; const lc = t => /^[A-Z]-/.test(t) ? t : t[0].toLowerCase() + t.slice(1);
  const hPrice = (sh, mt) => Math.round(HOUSES[sh][3] * HMAT[mt][1] / 10) * 10, hName = (sh, mt) => HMAT[mt][0].toLowerCase() + ' ' + lc(HOUSES[sh][0]);
  const funds = () => S.gold + ((S.bank && S.bank.gold) || 0), pay = n => { const a = Math.min(S.gold, n); S.gold -= a; S.bank.gold -= n - a; };
  function deedsSheet() { const mats = HMAT.map((m, i) => `<button class="btn sm${i === DM ? ' solid' : ' quiet'}" data-a="dmat" data-i="${i}">${m[0]}</button>`).join('');
    sheet(`<p class="eyebrow">Deeds · paid from your purse, then your account</p><h2>Homes for sale</h2><p class="cap2">You have ${funds()} gold. Buy a deed, walk somewhere open outside town, and set it down from your bag.</p><div class="row">${mats}</div>
      <ul class="goods">${HOUSES.map((h, i) => { const c = hPrice(i, DM); return `<li class="good">${ico('deed')}<div><b>${HMAT[DM][0]} ${lc(h[0])}</b><small>${h[1]} × ${h[2]} · chest holds ${h[4]}</small></div><button class="btn sm" data-a="buydeed" data-i="${i}"${funds() >= c ? '' : ' disabled'}>${c} gold</button></li>`; }).join('')}</ul>
      <div class="row end"><button class="btn sm quiet" data-a="bankback">Back to your account</button></div>`); }
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
  function homesUp() { Scene.clearHomes(); for (const h of S.homes || []) Scene.addHome(h); }
  const SH = {
    banker(e) { if (gid() === 'bank' && !S.gbk) { S.gbk = 1; return dlg(e, '"If you fall out there, everything you’re carrying stays with your body until you go back for it. Gold in here stays put, whatever happens to you. Deposit what you don’t need."', [{ t: 'Open the bank', a: 'bankopen' }, bye]); } bankSheet(e); },
    guide(e) { const g = gOn() && GD[S.gd]; dlg(e, (g && g.say) || '"Keep going. I’m right here."', [g && g.id === 'fish' && { t: 'Skip the fishing', a: 'gnext' }, { t: 'Skip the rest of the guide', n: 'you can always ask the townsfolk', a: 'gskip' }, bye]); },
    lookout(e) { if (gid() === 'tower') { gDone('tower'); return dlg(tamsin(), '"That’s the road north. Each town has a ring of stones on its way out, with an examiner inside. Signposts out there hold pages of Ilva Thorne’s journal. Where creatures crowd together, that’s a lair: stay clear for now. Open the Map to see it all."', [{ t: 'Open the Map', a: 'tab', d: { t: 'map' } }, bye]); } sheet(`<p class="eyebrow">Tallyport · the harbor</p><h2>Harbor tower</h2><p class="story">From the top you can see the whole coast and the road going north.</p><div class="row end"><button class="btn quiet" data-a="closesheet">Climb down</button><button class="btn solid" data-a="tab" data-t="map">Open the Map</button></div>`); },
    myhome(e) { homeSheet(homeById(e.hid)); },
    npc(e) {
      const t = e.r;
      if (t === 1 && e.i === 0 && S.tut === 0) { S.talked = 1; return dlg(e, TALK.m[0][0], [{ t: 'Begin', n: 'the first lesson', a: 'start', d: { k: 'intro' } }, { t: 'Not yet', a: 'closesheet' }]); }
      if (t === 1 && e.i === 0 && S.tabs && S.tabs[1] && !S.letter) return dlg(e, '"That scroll. Where did you get that?" She takes it, turns it over, gives it back. "Come up to the tower. Ilva left something for you."', [{ t: 'Go up to her study', a: 'letter' }, bye]);
      if (t === 1 && e.i === 0 && gid() === 'odalys') return dlg(e, '"Not out here. Meet me in the dojo, north-east of the square."', [bye]);
      if (t === 1 && e.i === 0 && S.odp === 1) { S.odp = 2; save(); return dlg(e, '"I heard about that query of yours. A WITH, a RANK, a join. That’s near enough what I wrote on the dummy your first day. I told you."', [bye]); }
      if (t === 1 && e.i === 0 && gid() === 'page') return dlg(e, '"Tamsin sent you for a page? Good. Each one is a move for a fight, and harder pages hit harder. Start with a cheap one."', [{ t: 'Pages for sale', a: 'pages' }, bye]);
      const mine = jobsOf(e), next = mine.find(c => !S.done[c.id]), nd = mine.filter(c => S.done[c.id]).length, key = t + '.' + e.i, first = !S.met[key]; S.met[key] = 1;
      const line = e.i === 0 ? (!next ? TALK.m[t - 1][3] : first ? TALK.m[t - 1][0] : TALK.m[t - 1][1 + (nd % 2)]) : first ? TALK.s[t - 1][e.i - 1] : next ? TALK.again[nd % 3] : '"That’s everything I had for you. Thanks for the help."';
      dlg(e, line, [next && { t: next.title, n: `exercise · ${15 * t + 10} gold`, a: 'offer', d: { id: next.id } }, e.i === 0 && { t: 'Pages for sale', n: `${CIRCLE[t]} Circle`, a: 'pages' }, nd && { t: 'Past exercises', n: nd + ' done', a: 'jobs' }, e.i !== 1 && { t: 'Ilva Thorne', a: 'ask', d: { k: 'story' } }, { t: 'This place', a: 'ask', d: { k: 'place' } }, bye]);
    },
    folk(e) { if (gid() === 'folk') return dlg(e, `"You’re the one off the Marigold? ${BOAST[S.path] || ''} Tallyport could use that."`, [bye]); dlg(e, pick(TALK.bark.concat(TALK.hint, Object.keys(S.boss).length ? TALK.marked : [])), [bye]); },
    corpse(e) { lootOpen(e); },
    camp() { if (now() - (S.campT || 0) < 120e3 || S.hp >= maxHp()) return toast(S.hp >= maxHp() ? 'The fire is warm. You are already rested.' : 'You have only just rested here.'); S.campT = now(); const n = heal(maxHp() * .5); save(); renderHud(); toast(`You rest by the fire: +${n} health`); },
    peddler(e) { const c = 8 * e.r, m = 3 * e.r; shopSheet(e, TALK.way[e.x % 3], [{ ic: 'draught', name: 'Healing Draught', meta: 'Restores 30 health, in or out of a fight', price: c + ' gold', a: 'buytonic', d: { c }, off: S.gold < c }, { ic: 'ration', name: 'Trail ration', meta: 'Eat it from your bag: +15 health', price: m + ' gold', a: 'buymeat', d: { c: m }, off: S.gold < m }], '<button class="btn sm quiet" data-a="sellcommon">Sell common gear and hides</button>'); },
    cache(e) {
      if (S.cache[e.cid] === dayKey()) return toast('Empty. Come back another day.'); const t = e.r, o = { gold: rint(10, 20) * t, mats: { [t]: rint(1, 3) }, items: rnd() < .3 ? [makeItem(rollRarity(luck()), t)] : [], scrolls: [] };
      if (rnd() < .35) { const left = PAGES.filter(p => p.c === t && !p.rare && !owned(p.id) && !S.scr[p.id]); if (left.length) o.scrolls.push(pick(left).id); }
      S.cache[e.cid] = dayKey(); Scene.FX.treasure(e.x, e.y); const g = grant(o); save(); renderHud(); Scene.refresh(); sheet(`<p class="eyebrow">${esc(region(t).name)} · in the wilds</p><h2>An old chest</h2>${spoilsHTML(g)}<div class="row end"><button class="btn solid" data-a="closesheet">Take it</button></div>`);
    },
    tavern(e) { const t = e.r, rm = RUMORS[t - 1], nd = doneIn(t), cost = 4 * t, well = S.hp >= maxHp(); shopSheet(e, TALK.tav[t - 1], [{ ic: 'stew', name: 'A meal and a bed', meta: well ? 'You are well' : 'Back to full health', price: cost + ' gold', a: 'rest', d: { c: cost }, off: well || S.gold < cost },
      S.rum[rm.id] ? { ic: 'scroll', name: rm.title, meta: 'A rumor you have run down', pill: 'solved' } : nd >= 5 ? { ic: 'scroll', name: rm.title, meta: 'A rumor. It guards a named rare and a rare page', price: 'Hear it', a: 'start', d: { k: 'rumor', id: rm.id } } : { ic: 'scroll', name: 'A rumor', meta: `The keeper will talk after ${5 - nd} more exercise${5 - nd === 1 ? '' : 's'} here`, price: 'Later', a: 'noop', off: 1 }]); },
    healer(e) { const t = e.r, cost = 3 * t, dc = 10 * t, well = S.hp >= maxHp(); shopSheet(e, TALK.heal[t % 3], [{ ic: 'salve', name: 'Bind my wounds', meta: well ? 'You are well' : 'Back to full health', price: cost + ' gold', a: 'rest', d: { c: cost }, off: well || S.gold < cost }, { ic: 'draught', name: 'Healing Draught', meta: 'Restores 30 health, in or out of a fight', price: dc + ' gold', a: 'buytonic', d: { c: dc }, off: S.gold < dc }]); },
    board(e) { if (S.stats.ok < 4) return dlg(e, 'Nothing pinned for you yet.', [bye]); const R = rounds(); dlg(e, 'Five drills a day, rusty skills first. Finish all five for a chest.', R.tasks.map((x, i) => ({ t: tplOf(x.tpl).title, n: x.done ? 'done' : (tplSkills(x.tpl).some(rusty) ? 'rusty · ' : '') + CIRCLE[tplOf(x.tpl).r] + ' Circle', a: 'start', d: { k: 'round', i }, off: x.done })).concat([bye])); },
    bench() {
      const t = here(), CS = ['weapon', 'armor', 'shield', 'ring', 'charm'], cp = bestPage('craft'), can = !!cp && cp.c >= t;
      sheet(`<p class="eyebrow">Workbench · ${CIRCLE[t]} Circle</p><h2>Craft</h2><div class="grid"><span class="cell">${ico('mat' + t, have(t))}</span><span class="cell">${ico('sigil', have('sigil'))}</span><span class="cell">${ico('draught', S.tonics)}</span><span class="cell">${ico('hintkey', S.hints)}</span></div>${can ? `<p class="cap2">Each piece is one query and one roll, asked at the circle of your best pattern page (${esc(cp.name)}). Blacksmithing ${rv('smith').toFixed(0)} makes gear, Alchemy ${rv('alchemy').toFixed(0)} makes draughts and keys. A spoiled piece wastes half the materials.</p>` : `<div class="verdict bad"><p>Working ${MATS[t]} needs a Pattern Book page of the ${CIRCLE[t]} Circle. ${esc(FOLK[t - 1][0][0])} sells one.</p></div>`}<div class="seg">${CS.map(c => `<button data-a="slot" data-s="${c}" aria-pressed="${benchSlot === c}">${c}</button>`).join('')}</div><ul class="inv">${RECIPES.filter(x => !x.minR || t >= x.minR).map(x => { const ok = can && have(t) >= x.mats && have('sigil') >= x.sigils, d = Math.min(100, diffOf(t) + ({ rare: 8, epic: 16, legendary: 24 }[x.id] || 0)); return `<li><span class="nm ${x.gear ? 'rar-' + x.id : ''}">${esc(x.id === 'scroll' ? 'Hint Key' : x.name)}${x.gear ? ' · ' + benchSlot : ''}</span><div class="row"><span class="meta grow">${x.mats} ${MATS[t]}${x.sigils ? ' + ' + x.sigils + ' sigil' : ''} · ${odds(rv(x.gear ? 'smith' : 'alchemy'), d, 'correct').p}% if correct</span><button class="btn sm" data-a="craft" data-id="${x.id}"${ok ? '' : ' disabled'}>Craft</button></div></li>`; }).join('')}</ul>`);
    },
    casino(e) { const r = e.r, room = Poker.ROOM[r - 1]; shopSheet(e, pick(['"Chips at the cage, questions at the table. Welcome."', '"The house deals straight. Query the cards all you like."', '"Find a seat. The blinds are posted on each table."']), [{ ic: 'chips_gold', name: 'Blind Tally', meta: `Hold’em, six seats. Blinds ${room.bb / 2} and ${room.bb}. Sit with ${20 * room.bb} gold or more`, price: 'Table', a: 'pkrules', d: { r }, off: S.gold < 20 * room.bb },
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
      const P0 = PLACES[e.pk], r = e.r, kind = P0[3], daily = kind === 'heal', seen = daily ? S.poi[e.pid] === dayKey() : !!S.poi[e.pid]; let extra = '', G = null;
      const lost = Object.values(S.er.a).find(x => x.type === 'find' && x.at === e.pid && !x.found); if (lost) { lost.found = 1; extra += `<p class="spoils">You find ${esc(lost.x)}. ${esc(lost.from)} will want it back.</p>`; }
      if (kind === 'tale') extra += `<p class="story">${esc(TALES[hsh(e.pid) % TALES.length])}</p>`;
      else if (seen) extra += `<p class="cap2">${daily ? 'You have rested here today.' : 'There is nothing more here.'}</p>`;
      else { S.poi[e.pid] = daily ? dayKey() : 1;
        if (kind === 'gold') G = grant({ gold: rint(14, 30) * r }); else if (kind === 'loot') { const o = { gold: rint(12, 26) * r, items: [makeItem(rollRarity(luck(), e.pk === 'ruin' ? 2 : 1), r)], scrolls: [] }; if (rnd() < .3) { const left = PAGES.filter(p => p.c === r && !p.rare && !owned(p.id) && !S.scr[p.id]); if (left.length) o.scrolls.push(pick(left).id); } G = grant(o); }
        else if (kind === 'food') { const o = { food: {} }; o.food[pick(['cheese', 'loaf', 'apple', 'honey'])] = 2; G = grant(o); } else if (kind === 'key') { S.hints++; extra += '<p class="spoils">+1 Hint Key</p>'; }
        else if (kind === 'skill') { const id = bestWeapon(), gn = gain(id, rv(id), 2); extra += gn ? gainsHTML([gn]) : '<p class="cap2">The stones have nothing left to teach you.</p>'; }
        else if (kind === 'heal') { const n = heal(maxHp()); extra += `<p class="spoils">+${n} health</p>`; } else if (kind === 'view') { S.known[r] = 1; extra += `<p class="spoils">Every homestead, water and place in ${esc(region(r).name)} is now on your map.</p>`; }
        if (G) { Scene.FX.treasure(e.x, e.y); extra += spoilsHTML(G); } }
      save(); renderHud(); Scene.refresh(); sheet(`<p class="eyebrow">${esc(region(r).name)} · out in the country</p><h2>${esc(P0[0])}</h2><p class="story">${esc(P0[2])}</p>${extra}<div class="row end"><button class="btn solid" data-a="closesheet">Move on</button></div>`);
    },
    fish(e) { coach('fish'); const left = fishLeft(e.fid), fs = rv('fishing'); CE = e; sheet(`<p class="eyebrow">${esc(region(e.r).name)} · the water</p><h2>Fishing ${qm('fish')}</h2><p class="cap2">Fishing ${fs.toFixed(1)} · ${left ? `${left} cast${left === 1 ? '' : 's'} left today` : 'quiet until tomorrow'} · good fish ${FISHNEED.good}, rare ${FISHNEED.rare}, sunken ${FISHNEED.treasure}</p><ul class="goods">${CASTS.map((c, i) => goodHTML({ ic: 'rod', name: c.n, meta: c.tip, price: 'Cast', a: 'cast', d: { i }, off: !left })).join('')}</ul>`); },
    shopkeep(e) { SH.stallkeep(e); },
    stallkeep(e) { const st = stall(); shopSheet(e, TALK.stall[e.r % 3], st.stock.map((it, i) => ({ ic: it.ic, name: it.name, cls: 'rar-' + it.rarity, meta: `${it.slot} · ${statLine(it)}`, price: price(it) + ' gold', a: 'buy', d: { i }, off: S.gold < price(it) })), `<span class="cap2 grow">${st.stock.length ? '' : 'Sold out. '}New stock in ${Math.max(0, 6 - st.n)} tasks.</span><button class="btn sm quiet" data-a="sellcommon">Sell common gear and hides</button>`); },
    registrar(e) { const n = Object.keys(S.boss).length; dlg(e, n >= 8 ? '"All eight marks. Tallyport is at the top of the roll."' : `"You have ${n} of the 8 marks. Each examiner waits in a ring of stones on the road out of their town. With seven, you can sit the council’s Audit at Aldermoot."`, [bye]); },
    rival(e) {
      const t = e.r, v = rival(t), d = diffOf(t, true), sh = bestPage('shadow'), pid = 'h' + t + 'r', np = !owned(pid) && !S.scr[pid]; if (v.away > 0) return dlg(e, '"Not now."', [bye], `<p class="cap2">Back after ${v.away} more task${v.away === 1 ? '' : 's'}.</p>`);
      const so = !sh ? { t: 'Steal', n: 'you own no page of Shadows', a: 'talk', off: 1 } : e.unseen ? { t: sh.name, n: `purse and prize · ${odds(rv('stealing') + 10, d, 'correct').p}% if correct`, a: 'start', d: { k: 'rival', m: 'steal' } } : rv('hiding') > 0 ? { t: 'Hide, then ' + sh.name, n: `seen you · Hiding ${sneakPct()}%`, a: 'start', d: { k: 'rival', m: 'sneak' } } : { t: sh.name, n: 'seen you. Come from behind', a: 'talk', off: 1 };
      dlg(e, TALK.rival[t - 1], [{ t: 'Duel', n: `win ${Math.round(v.gold / 2)} gold · ${odds(rv(bestWeapon()), d, 'correct').p}% if correct`, a: 'start', d: { k: 'rival', m: 'duel' } }, so, bye], lootHTML(v.item) + (np ? scrollHTML(pageById(pid)) : '') + `<p class="cap2">Carries ${v.gold} gold.</p>`);
    },
    boss(e) { if (!isMain()) return dlg(e, `"I test the one on the Trials roll. That’s ${mainName()}, not you."`, [bye]); bossCard(e); },
    stairs(e) { dlg(e, DUNGEONS[e.r - 1].blurb, [{ t: 'Descend', n: Dungeons.get(e.r).floors.length + ' floors · hunting grounds, secrets and a vault', a: 'start', d: { k: 'dungeon' } }, { t: 'Leave', a: 'closesheet' }]); },
    mon(e) { if (!ready) return toast(engineErr || 'The Ledger is still opening'); START.monster(e); },
    node(e) { const t = e.r; S.mats[t] = have(t) + 1; Scene.kill(e); save(); toast(`+1 ${MATS[t]}`); },
    dojo(e) { if (ready) enterDojo(e.r); }, hallexit() { leaveDojo(); },
    master(e) { const r = e.r, d = DJ(r), first = !d.met; d.met = 1; save(); dlg(e, first ? Dojo.SAY[r - 1].hi : d.master ? '"Back for another round? Any time."' : d.champ ? '"Ready to spar for the prize?"' : '"Pay the fee at the board and you’re in the bracket."', [{ t: 'The tournament', n: 'bracket and fee', a: 'djboard' }, { t: 'Lessons', n: `any skill up to ${TRAIN_CAP}, for a fee`, a: 'djtrain' }, d.champ && { t: d.master ? 'Spar again' : 'Spar for the prize', n: Dojo.PRIZES[r - 1].name, a: 'djmaster' }, d.master && isMain() && { t: 'Ask about Ilva Thorne', a: 'djilva' }, bye]); },
    student(e) { if (gid() === 'odalys') return dlg(e, '"Odalys is waiting for you. Over by the dummy."', [bye]); const ring = Scene.ents().filter(x => x.spar).length === 2 && e.spar; dlg(e, STUL[(e.r + e.i) % STUL.length], [ring && { t: 'Watch a bout', n: 'see how they write it', a: 'djwatch' }, bye]); },
    traveler(e) { dlg(e, TRVL[e.i] || '"See you in the bracket."', [bye]); },
    sorrel(e) { if (!isMain()) return dlg(e, `"You’re not the one I’m watching. Tell ${mainName()} I said hello."`, [bye]); S.djs = (S.djs || 0) + 1; save(); dlg(e, S.djs === 1 ? Dojo.SORREL.hi : DJ(8).sorrel ? Dojo.SORREL.last : '"I watched your last bout. Sloppy. You’ll still get through."', [bye]); },
    foe(e) { dlg(e, '"Good bout."', [bye]); },
    odalys(e) { if (!isMain()) return dlg(e, '"Train hard. The dummies don’t hit back, the people in the bracket do."', [bye]); if (gid() !== 'odalys') return dlg(e, '"Go on, Tamsin’s waiting for you."', [bye]); dlg(e, '"So you’re the famous one. Go on, then. Let’s see what you’ve got."', [{ t: 'Hit the dummy', a: 'odx', d: { n: 1 } }]); },
    dummy(e) { if (e.i === 9) { const o = Scene.find(x => x.kind === 'odalys'); return gid() === 'odalys' && o ? SH.odalys(o) : null; } Scene.FX.face(e); duOpen({ mode: 'practice', r: e.r, c: e.r, dummy: e }); },
    bracket(e) { djBoard(e.r); },
    rnote(e) { if (!isMain()) return toast(`A note pinned with a dagger. It’s addressed to ${mainName()}.`); const r = e.r; S.djn = S.djn || {}; S.djn[r] = 1; save(); sheet(`<p class="eyebrow">Pinned to a post with a dagger</p><h2>A note</h2>${ART && ArtData.dojo ? '<img class="scene" alt="" src="art/bg/DJ03.jpg">' : ''}<p class="story">${esc(Dojo.NOTES[r - 2])}</p><div class="row end"><button class="btn quiet" data-a="closesheet">Leave it</button></div>`); },
    guard(e) { if (ready) START.guard(e); },
 chest(e) { START.chest(e); }, keeper(e) { if (gOn()) return dlg(tamsin(), '"Not yet. That’s the keeper. Corin went at it too early."', [bye]); if (ready) START.keeper(e); },
    ltable: e => DP.table(e),
    dtravel: e => DP.interact(e), dcache: e => DP.interact(e), dlever: e => DP.interact(e), dgate: e => DP.interact(e), dsecret: e => DP.interact(e), dlore: e => DP.interact(e),
    exit(e) { dlg(e, 'Stairs up to daylight. Your discoveries are kept when you leave.', [{ t: 'Climb out', a: 'exitdungeon' }, { t: 'Stay', a: 'closesheet' }]); },
    page(e) { if (!isMain()) return toast(`A page of Ilva Thorne’s journal. ${mainName()} is the one following her trail.`); const t = e.r, first = !S.jr[t]; S.jr[t] = 1; if (first) save(); sheet(`<p class="eyebrow">Ilva Thorne’s journal · page ${t} of 8</p><h2>${esc(region(t).name)}</h2><p class="story">${esc(JOURNAL[t - 1])}</p>${(() => { const T = Deep.TRUTHS.find(x => x.from === 'page' + t); return T && S.letter ? `<p class="cap2">In the margin, a Great Truth: <b>${esc(T.title)}</b>. It is in your Ledger.</p>` : ''; })()}<p class="cap2">${Object.keys(S.jr).length} of 8 pages found. They are kept in your Journal.</p><div class="row end"><button class="btn solid" data-a="closesheet">Keep it</button></div>`); },
    journal() {
      const t = S.region, r = region(t), all = CONTRACTS.filter(c => c.r === t), fk = FOLK[t - 1], pages = [1, 2, 3, 4, 5, 6, 7, 8].filter(k => S.jr[k]), marks = [1, 2, 3, 4, 5, 6, 7, 8].filter(k => S.boss[k]);
      sheet(`<p class="eyebrow">Journal</p><h2>${esc(objective())}</h2>
        <section class="sec"><h2>The Trials <small>${marks.length} / 8 marks</small></h2><ul class="tale"><li>Tallyport entered you in the Trials after its champion, Corin Hale, died in the Bilge Vaults.</li><li>Each circle has an examiner in a ring of stones on the road out of its town. Each one gives a mark.</li>${marks.length ? `<li>Marks held: ${marks.map(k => CIRCLE[k]).join(', ')}.</li>` : ''}${S.won ? '<li>The council has entered your name on the roll of masters.</li>' : '<li>The council at Aldermoot holds the Audit for anyone with the other seven marks.</li>'}</ul></section>
        <section class="sec"><h2>Ilva’s journal <small>${pages.length} / 8 pages</small></h2>${pages.length ? `<ul class="tale">${pages.map(k => `<li>${esc(JOURNAL[k - 1])}</li>`).join('')}</ul>` : '<p class="note">She left the pages along the road north, nailed to signposts off the path. The corner map shows them in gold.</p>'}</section>
        <section class="sec"><h2>${esc(r.name)} <small>${doneIn(t)} / ${all.length} exercises</small></h2><ul class="tale plain">${all.map(c => `<li class="${S.done[c.id] ? 'ok' : ''}">${esc(c.title)} <small>${esc(fk[giverOf(c)][0])}</small></li>`).join('')}</ul></section>
        <details class="lesson"><summary>How to play</summary><div class="lb"><ul class="tale plain"><li>Tap the ground to walk. Tap a person or a creature to use it.</li><li>! over a master is an exercise. Exercises teach the SQL, one form at a time.</li><li>Everything you do is a page in one of your books. Using a page asks one question. Your answer sets the odds.</li><li>A page of a higher circle asks a harder question and does more. Low pages are weak against northern creatures.</li><li>Masters sell the plain pages of their circle. Rare pages are found, won or stolen.</li><li>Typing errors cost nothing.</li><li>The road is open the whole way north.</li></ul></div></details>`);
    }
  };
  const BRASS = '#f3c95a';
  const HOST = {
    ghostMoved: () => placeBar(), runMul: () => gift('run') ? 1.15 : 1, keeperName: r => LAIRMON['k' + r], haveTable: r => haveT(r),
    app: () => ART && ArtData.body ? app() : null, role: () => S.path, look: () => S.look != null ? S.look : (LOOK0[S.path] || 0), thief: () => !!bestPage('shadow'), hue: r => HUES[r], folk: r => FOLK[r - 1], tavern: r => TAVERNS[r - 1], rivalName: r => RIVALS[r - 1].name, bossName: r => BOSSES[r - 1].name, dungeonName: r => DUNGEONS[r - 1].name, matName: r => MATS[r], regionName: r => region(r).name, regionSub: r => region(r).sub,
    homeRoles: r => [0, 1, 2, 3, 4, 5, 6].map(k => HOMES[(r * 3 + k * 4) % HOMES.length]), roamRoles: r => [0, 1, 2, 3, 4, 5, 6].map(k => ROAMERS[(r + k) % ROAMERS.length]), settler: role => SETTLE[role], settlerName: (hid, role) => FIRST[hsh(hid) % FIRST.length] + ' the ' + SETTLE[role].n, stockName: t => STOCK[t] || 'Animal', place: pk => PLACES[pk],
    tpls: r => BOUNTIES.filter(b => b.r === r).map(b => b.id), habitat: t => HAB[t] || 'open', wild: (r, h) => (WILD[r] || []).filter(w => w[1] === h || (h === 'coast' && w[1] === 'water') || (h === 'water' && w[1] === 'coast')).map(w => w[0]), hunts: t => !!HUNT[t], cacheOpen: id => S.cache[id] === dayKey(),
    aggro: () => S.tut >= 3 && !Q && !F && !SB && $('#sheet').hidden && tab === 'world' && $('#title').hidden, chasing: () => !Q && !F && $('#title').hidden,
    ambush(e) { if (Q || F || !ready) return; CE = e; e.unseen = false; closeSheet(); if (tab !== 'world') ACT.tab({ t: 'world' });
      if (e.chase > 0) { e.chase = 0; const d = rint(3, 6) + 2 * e.r; S.hp -= d; Scene.FX.hit('me', '−' + d, '#f08070'); if (S.hp <= 0) { S.hp = 0; S.stats.falls++; wakeFromDeath(); renderHud(); toast('It caught you. You wake at the healer’s. Your things are where you fell.'); deathNote(); return; } save(); renderHud(); }
      START.monster(e, ''); }, spawn: tpl => ({ tpl, elite: tpl[0] === 'b' && rnd() < 0.09 }), monName: inst => inst.nm || MONSTERS[inst.tpl][0], lairs: () => LAIRS, lairName: k => LAIRMON[k], townsfolk: r => FOLKN.slice(r % 5).concat(FOLKN.slice(0, r % 5)), folkIdx: n => Math.max(0, FOLKN.indexOf(n)), chestOpen: () => !!(DG && DG.done),
    guide() { if (!S.path || Q || F || DU || !gOn()) return null; const g = GD[S.gd]; if (Scene.inHall()) return g.hall ? g.hall() : null; if (Scene.inDungeon() !== (g.id === 'chest')) return null; return g.arrow ? g.arrow() : null; },
    mark(e) {
      const t = e.r; if (e.kind === 'home') { const a = S.er.a[e.hid]; if (Object.values(S.er.a).some(x => x.type === 'deliver' && x.to === e.hid) || (a && errandReady(a))) return ['!', BRASS]; return !a && S.er.d[e.hid] !== dayKey() ? ['?', '#ffffff'] : null; }
      if (e.kind === 'poi') { const kd = PLACES[e.pk][3]; if (Object.values(S.er.a).some(x => x.type === 'find' && x.at === e.pid && !x.found)) return ['!', BRASS]; return kd === 'tale' || (kd === 'heal' ? S.poi[e.pid] === dayKey() : S.poi[e.pid]) ? null : ['✦', '#ffffff']; } if (e.kind === 'npc') { if (t === 1 && e.i === 0 && (gid() === 'page' || (!gOn() && S.tut === 0))) return ['!', BRASS]; return jobsOf(e).some(x => !S.done[x.id]) ? ['!', '#ffffff'] : null; }
      if (e.kind === 'boss') return S.boss[t] ? null : ['!', '#ff6a4a']; if (e.kind === 'tavern') return !S.rum[RUMORS[t - 1].id] && doneIn(t) >= 5 ? ['?', '#d9b8ff'] : null;
      if (e.kind === 'board') return S.stats.ok >= 4 && !(S.rounds && S.rounds.day === dayKey() && S.rounds.tasks.every(x => x.done)) ? ['!', '#8fe8cf'] : null;
      if (e.kind === 'mon' && e.inst.elite) return ['★', '#f3a53f']; if (e.kind === 'chest' && DG && !DG.done && DG.left <= 0) return ['★', '#f3a53f']; if (e.kind === 'page' && !S.jr[t]) return ['★', BRASS]; if (e.kind === 'corpse') return e.empty ? null : ['✦', BRASS]; if (e.kind === 'guide') return ['…', '#ffffff']; if (e.kind === 'lookout' && gid() === 'tower') return ['!', BRASS]; if ((e.kind === 'dojo' && t === 1 || e.kind === 'odalys') && gid() === 'odalys') return ['!', BRASS]; if (e.kind === 'master') { const d = DJ(t); return d.champ && !d.master ? ['!', BRASS] : !d.met ? ['?', '#ffffff'] : null; } if (e.kind === 'rnote' && !(S.djn || {})[t]) return ['!', '#ffffff']; return null;
    },
    interact(e) { if (Q || F || DU) return; CE = e; (SH[e.kind] || (() => { }))(e); if (gid() === 'folk' && /^(folk|npc|home|tavern|healer|registrar|stallkeep|shopkeep|banker|rival|casino)$/.test(e.kind) && !(e.kind === 'npc' && e.i === 0)) { S.gd++; save(); gEnter(); } },
    entered(r) { if (S.region === r && S.been[r]) return; S.region = r; S.been[r] = 1; sel = r; save(); },
    sound: (name, detail) => Sound.sfx(name, detail),
    dungeonState: () => DG ? DP.current() : null,
    moved(x, y, dun, run) { if (dun && DG)DP.moved(x,y); if (gOn()) gMoved(x, y, dun, run); if (!dun) { S.pos = [x, y]; if (S.mv % 3 === 0) { S.lairs = S.lairs || {}; for (const L of Scene.sites()) if (L.kind === 'lair' && !S.lairs[L.id] && Math.hypot(L.x - x, L.y - y) < 11) { S.lairs[L.id] = 1; save(); toast(`Found: ${L.name}. It is on your map now.`); coach('lair'); } } } S.mv = (S.mv || 0) + 1; if (S.mv % 5 === 0 && S.hp < maxHp()) { heal(1 + Math.floor(rv('healing') / 40), true); renderHud(); } },
    hud(n) { const ob = objective(), k = (n ? n.kind + n.name : '') + ob + (F ? 'f' : ''); if (k === HOST._k) return; HOST._k = k; const b = $('#ctx'); b.hidden = !n || !!F; if (n) b.textContent = ({ banker: 'Bank: ', guide: 'Talk: ', lookout: 'Climb: ', dojo: 'Go in: ', hallexit: 'Leave: ', master: 'Talk: ', student: 'Talk: ', sorrel: 'Talk: ', traveler: 'Talk: ', odalys: 'Talk: ', foe: 'Talk: ', dummy: 'Practice: ', bracket: 'Read: ', rnote: 'Read: ', npc: 'Talk: ', folk: 'Talk: ', tavern: 'Talk: ', healer: 'Talk: ', registrar: 'Talk: ', stallkeep: 'Trade: ', shopkeep: 'Trade: ', rival: 'Approach: ', boss: 'Face: ', mon: 'Engage: ', guard: 'Engage: ', keeper: 'Face: ', dtravel:'Use: ', dcache:'Open: ', dlever:'Use: ', dgate:'Inspect: ', dsecret:'Investigate: ', dlore:'Read: ', ltable:'Take: ', node: 'Gather: ', board: 'Read: ', bench: 'Use: ', stairs: 'Enter: ', chest: 'Open: ', exit: 'Use: ', page: 'Read: ', camp: 'Rest: ', peddler: 'Trade: ', cache: 'Open: ', corpse: 'Loot: ', casino: 'Enter: ', home: 'Talk: ', fish: 'Fish: ', stock: '', poi: (n.sub || 'Look') + ': ' }[n.kind] || '') + n.name; $('#obj').textContent = ob; }
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
    return `<div class="atlas">${Engine.atlas().map(t => `<details><summary>${t.name}<small>${t.count} rows</small></summary><p class="tn">${esc(t.note)}</p><div class="cl">${t.cols.map(c => `<span${c.pk ? ' class="pk"' : ''}>${c.name}${c.pk ? ' (key)' : ''}</span><span>${c.type}</span>`).join('')}</div><div class="row" style="margin-bottom:12px"><button class="btn sm quiet" data-a="peek" data-t="${t.name}">Peek at rows</button></div></details>`).join('')}</div>${extra || ''}<p class="cap2">Keys link the tables: orders.customer_id to customers, order_lines.order_id to orders, order_lines.item_id to items, items.vendor_id to vendors, invoices.order_id to orders, purchase_orders.vendor_id to vendors, po_lines.po_id to purchase_orders, orders.rep_id and customers.rep_id to employees, employees.manager_id to employees. The Ledger’s today is ${World.TODAY}.</p>`;
  }
  function vLedger() {
    let h = `<section class="place"><p class="eyebrow">Free play</p><h1>The Great Ledger ${qm('ledger')}</h1></section><div class="seg">${(S.letter || Object.keys(S.tabs || {}).length ? [['lost', 'Lost tables']] : []).concat([['sandbox', 'Sandbox'], ['atlas', 'Tables'], ['grimoire', 'Lessons']]).map(x => `<button data-a="lsub" data-s="${x[0]}" aria-pressed="${lsub === x[0]}">${x[1]}</button>`).join('')}</div>`;
    if (lsub === 'sandbox') h += `<div class="editor"><label for="con-sql" class="vh">Sandbox SQL</label><textarea id="con-sql" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="SELECT * FROM bestiary"></textarea><div class="keys tabs"><span class="lab">try</span>${['SELECT * FROM my_skills ORDER BY value DESC', 'SELECT * FROM bestiary', 'SELECT * FROM my_bag', 'SELECT * FROM my_materials', 'SELECT * FROM recipes'].map(q => `<button data-a="conq" data-q="${esc(q)}">${q.split(' ')[3]}</button>`).join('')}</div><div class="runrow"><button class="btn quiet sm" data-a="conreset">Reset copy</button><button class="run" data-a="conrun"${ready ? '' : ' disabled'}>Run</button></div></div><div id="con-out" style="display:flex;flex-direction:column;gap:10px">${con.res ? conHTML(con.res) : '<p class="cap2">Besides the nine tables of the Ledger, the sandbox holds your own data as tables: my_skills, my_bag, my_materials, bestiary and recipes. Plan your farming with a query.</p>'}</div>`;
    else if (lsub === 'atlas') h += atlasHTML();
    else if (lsub === 'lost') h += lostHTML();
    else { const seen = CONTRACTS.filter(c => c.lesson && (S.seen[c.id] || S.done[c.id])); h += seen.length ? SKILLS.map(s => { const ls = seen.filter(c => c.lesson.skill === s.id); return ls.length ? `<section class="sec"><h2>${s.name} <small>${ls.length}</small></h2>${ls.map(c => lessonHTML(c.lesson, false)).join('')}</section>` : ''; }).join('') : '<p class="cap2">Every lesson you meet in an exercise is copied here, grouped by form. Nothing yet.</p>'; }
    return h;
  }
  const conHTML = r => r.err ? `<div class="verdict err"><p>${esc(r.err)}</p></div>` : (r.note ? `<div class="verdict good"><p>${esc(r.note)}</p></div>` : tableHTML(r, 60));
  const bookHTML = () => Object.keys(BOOKS).map(b => { const B = BOOKS[b], mine = PAGES.filter(p => p.book === b); return `<details class="lesson book"><summary><span>${B.name} <small>${mine.filter(p => owned(p.id)).length} / ${mine.length}</small></span></summary><div class="lb"><p class="cap2">${esc(B.what)}.</p><ul class="pglist">${mine.map(p => `<li class="${owned(p.id) ? 'has' : ''}${p.rare ? ' rare' : ''}"><b>${owned(p.id) || !p.rare ? esc(p.name) : 'Unknown page'}</b><small>${CIRCLE[p.c]} Circle${p.rare ? ' · rare' : ''}</small><span>${owned(p.id) ? (p.note || 'In your book') : S.scr[p.id] ? 'The scroll is in your bag' : esc(p.src)}</span></li>`).join('')}</ul></div></details>`; }).join('');
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
  function look0() { const lk = S.look != null ? S.look : 0, d = (LOOKAPP[S.path] || LOOKAPP.warrior)[lk % 2]; return { body: lk % 2, hair: d[0], hc: d[1], beard: d[2], hat: d[3], wear: S.path === 'mage' ? 1 : 0, dye: S.path === 'mage' ? (lk % 2 ? 4 : 2) : 0 }; }
  const myLook = () => S.app || (S.app = look0());
  const WPN = { swords: [0, 1, 1, 2], fencing: [14, 15, 0, 1], archery: [25, 26, 26, 27], magery: [9, 8, 10, 12] }, SHD = [20, 22, 21, 21];
  function appNow() {
    if (!S || !S.path) return null; const L = myLook(), arm = itemById(S.eq.armor), wp = itemById(S.eq.weapon), sh = itemById(S.eq.shield), hd = itemById(S.eq.head), hn = itemById(S.eq.hands);
    const outfit = arm ? (/Leather/.test(arm.name) ? 2 : /Chain/.test(arm.name) ? 3 : 4) : L.wear, g = it => GRADE[it.rarity] || 0;
    const metal = arm ? [null, null, '#b8c8dc', '#d8b048', '#e0b84a'][RAR.indexOf(arm.rarity)] : null, sp = typeof L.dye === 'string' ? spec(L.dye) : null;
    let wi = -1, wk = '', st = 'swing';
    if (wp) { const V = wp.v != null && WV.find(x => x.v === wp.v); if (V) { wi = V.v; wk = V.k; st = V.s; } else { const ix = (WN[wp.w] || []).findIndex(n => wp.name.indexOf(n) >= 0); wi = (WPN[wp.w] || WPN.swords)[Math.min(3, ix < 0 ? g(wp) : ix)]; wk = wp.w === 'magery' ? 'staff' : wp.w === 'archery' ? 'bow' : wi === 2 ? 'long' : wi === 14 || wi === 15 ? 'dagger' : 'sword'; st = wp.w === 'magery' ? 'cast' : wp.w === 'swords' ? 'swing' : 'thrust'; } }
    const wg = L.wglow && spec(L.wglow), hat = hd ? HATK(hd.name) : L.hat;
    return { combo: L.body * 5 + outfit + 1, cloth: sp ? sp.base : DYES[L.dye] || null, fx: sp && sp.k ? { k: sp.k, c: sp.c || null, soft: sp.soft || 0 } : null, metal, hc: HAIRC[L.hc] || HAIRC[1], hair: L.hair, beard: L.body ? -1 : L.beard, hat,
      wpn: wi, wkind: wk, style: st, glow: wg ? wg.c || '#e0d8ff' : wp ? { epic: '#8fc0ff', legendary: '#ffd76a' }[wp.rarity] || null : null, shield: sh ? (sh.off != null ? sh.off : SHD[Math.min(3, g(sh))]) : -1, gl: hn && /Thief/.test(hn.name) ? 1 : 0 };
  }
  let APPK = '', APPV = null; const app = () => { const a = appNow(), k = JSON.stringify(a); if (k !== APPK) { APPK = k; APPV = a; } return APPV; };
  const dollHTML = () => ART && ArtData.body ? `<section class="sec dollsec"><canvas id="doll" width="300" height="450" aria-label="Your character"></canvas><div class="row end"><button class="btn sm quiet" data-a="looks">Appearance</button></div></section>` : '';
  const paintDoll = () => setTimeout(() => ['#doll', '#doll2'].forEach(q => { const cv = $(q); if (cv && sceneUp) Scene.drawDoll(cv, app()); }), 0);
  // the barber, tailor and dyer charge once your first day is done
  const LOOKC = { body: 250, hair: 30, hc: 20, beard: 20, hat: 15, wear: 10, dye: 25, wglow: 0 }, lookCost = k => gOn() ? 0 : LOOKC[k] || 0, lc$ = k => lookCost(k) ? ` <small>${lookCost(k)} gold</small>` : '';
  function looksSheet() {
    const L = myLook(), opt = (k, v, t, on) => `<button class="chip${on ? ' on' : ''}" data-a="lookset" data-k="${k}" data-v="${v}">${esc(t)}</button>`;
    sheet(`<p class="eyebrow">The barber, the tailor and the dyer</p><h2>Appearance</h2><canvas id="doll2" class="dollbig" width="300" height="450"></canvas>
      <h3>Body${lc$('body')}</h3><div class="chips">${opt('body', 0, 'Man', L.body === 0)}${opt('body', 1, 'Woman', L.body === 1)}</div>
      <h3>Hair${lc$('hair')}</h3><div class="chips">${opt('hair', -1, 'Bald', L.hair < 0)}${HAIRS.map((n, i) => opt('hair', i, n, L.hair === i)).join('')}</div>
      <h3>Hair colour${lc$('hc')}</h3><div class="chips">${HAIRCN.map((n, i) => opt('hc', i, n, L.hc === i)).join('')}</div>
      ${L.body ? '' : `<h3>Beard${lc$('beard')}</h3><div class="chips">${opt('beard', -1, 'None', L.beard < 0)}${BEARDS.map((n, i) => opt('beard', i, n, L.beard === i)).join('')}</div>`}
      <h3>Head${lc$('hat')}</h3><div class="chips">${opt('hat', -1, 'Nothing', L.hat < 0)}${HATS.map((n, i) => opt('hat', i, n, L.hat === i)).join('')}</div>
      <h3>Clothes without armour${lc$('wear')}</h3><div class="chips">${opt('wear', 0, 'Tunic', L.wear === 0)}${opt('wear', 1, 'Robe', L.wear === 1)}</div>
      <h3>Dye${lc$('dye')}</h3><div class="chips">${DYEN.map((n, i) => opt('dye', i, n, L.dye === i)).join('')}${(S.dyeU || []).map(id => opt('dye', id, spec(id).n + ' ✦', L.dye === id)).join('')}</div>
      ${(S.dyeU || []).some(id => spec(id).k === 'glow') ? `<h3>Weapon glow</h3><div class="chips">${opt('wglow', '', 'By rarity', !L.wglow)}${S.dyeU.filter(id => spec(id).k === 'glow').map(id => opt('wglow', id, spec(id).n, L.wglow === id)).join('')}</div>` : ''}
      ${S.dyeU && S.dyeU.length ? '' : '<p class="cap2">Rare dyes turn up now and then on creatures, in vault chests and on keepers and examiners.</p>'}
      <div class="row end"><button class="btn solid" data-a="closesheet">Done</button></div>`);
    paintDoll();
  }
  function vHero() {
    const p = PATHS.find(x => x.id === S.path), acc = S.stats.q ? Math.round(100 * S.stats.ok / S.stats.q) : 0, w = armsSkill();
    paintDoll(); return `<section class="place"><p class="eyebrow">${p ? p.name : 'No path chosen'} · health ${S.hp} / ${maxHp()}</p><h1>${rankName()}</h1></section>${dollHTML()}
      <section class="sec"><h2>Books ${qm('hero')}</h2>${bookHTML()}</section>
      <section class="sec"><h2>Skills <small>${total().toFixed(1)} / ${CAP}</small></h2><ul class="skills">${RPG.map(s => { const v = rv(s[0]); return `<li><span class="nm"><b>${s[1]}</b><small>${esc(s[2])}</small></span><span class="val">${v.toFixed(1)}<small>${skTitle(v)}${skCap(s[0]) > 100 ? ' · cap ' + skCap(s[0]) : ''}</small></span><span class="bar"><i style="width:${Math.min(100, v / skCap(s[0]) * 100)}%"></i></span></li>`; }).join('')}</ul><p class="note">Skills rise with use, fastest against targets near your level. Past 70 they slow down, and the last ten points to Grandmaster take the longest. Skill sets the base chance. Your answer scales it.</p>${scrollsHTML()}</section>
      <details class="lesson"><summary>SQL skills</summary><div class="lb"><ul class="skills">${SKILLS.map(s => { const v = S.skills[s.id] || { v: 0 }; return `<li><span class="nm"><b>${s.name}</b> ${rusty(s.id) ? '<span class="pill rust">rusty</span>' : ''}<small>${esc(s.what)}</small></span><span class="val">${v.v.toFixed(1)}</span><span class="bar"><i style="width:${v.v}%"></i></span></li>`; }).join('')}</ul><p class="cap2">Tracked in the background. Rusty skills come back in the daily drills.</p></div></details>
      <details class="lesson"><summary>Commands learned · ${Object.keys(CMDS).filter(k => cmdSet()[k] === 2).length} of ${Object.keys(CMDS).length}</summary><div class="lb"><ul class="skills">${Object.keys(CMDS).map(k => `<li><span class="nm"><b>${cmdSet()[k] === 2 ? esc(cmdTitle(k)) : cmdSet()[k] ? esc(cmdTitle(k)) + ' <small>taught, not used yet</small>' : '?'}</b></span><span class="val">${cmdSet()[k] === 2 ? '✓' : ''}</span></li>`).join('')}</ul><p class="cap2">A command joins the Commands panel when its lesson opens. Using it correctly once earns a Hint Key.</p></div></details>
      ${djTokens()}<section class="sec"><h2>Worn gear</h2><div class="grid doll">${SLOTS.map(s => { const it = itemById(S.eq[s]); return it ? `<button class="cell rar-${it.rarity}" data-a="item" data-id="${it.id}" aria-label="${esc(it.name)}">${ico(it.ic)}<em>${s}</em></button>` : `<span class="cell empty"><em>${s}</em></span>`; }).join('')}</div><div class="kv" style="margin-top:12px"><span>Book of Arms uses</span><span>${rpgName(w)}</span><span>Damage with it</span><span>+${dmgPct(w)}%</span><span>Defence</span><span>${Math.min(60, bonus('def'))}%</span><span>Gold bonus</span><span>+${bonus('gold')}%</span><span>Skill gain bonus</span><span>+${learnPct()}%</span><span>Luck (with streak ${S.streak})</span><span>+${luck()}%</span></div></section>
      <section class="sec"><h2>Record</h2><div class="kv" style="margin-top:10px"><span>Queries run</span><span>${S.stats.q}</span><span>Correct</span><span>${S.stats.ok} (${acc}%)</span><span>Exercises</span><span>${Object.keys(S.done).length} / ${CONTRACTS.length}</span><span>Marks</span><span>${Object.keys(S.boss).length} / 8</span><span>Journal pages</span><span>${Object.keys(S.jr).length} / 8</span><span>Creatures</span><span>${S.stats.kills}</span><span>Thefts</span><span>${S.stats.steals}</span><span>Dungeon chests</span><span>${S.stats.dungeons}</span><span>Times fallen</span><span>${S.stats.falls}</span><span>Best streak</span><span>${S.best}</span></div></section>
      <section class="sec"><h2>Sound</h2><p class="note">Music follows towns, wilderness, dungeons and fights. If you hear nothing, tap the screen once and check your device volume.</p><div class="row" style="margin-top:10px"><button class="btn sm quiet" data-a="snd" data-k="mu">Music: ${Sound.pref().mu ? 'on' : 'off'}</button><button class="btn sm quiet" data-a="snd" data-k="fx">Effects: ${Sound.pref().fx ? 'on' : 'off'}</button></div></section>
      <section class="sec"><h2>Save</h2><p class="note">${Cloud.state === 'account' ? 'Saved to your Claude account as you play, and on this device.' : 'Saved on this device. Account sync is not available in this view, so copy a save code before switching devices.'}</p><div class="row" style="margin-top:10px"><button class="btn sm quiet" data-a="export">Save code</button><button class="btn sm quiet" data-a="import">Load a code</button><button class="btn sm wax" data-a="reset">Switch character</button></div></section>`;
  }
  function vBag() {
    const order = it => -RAR.indexOf(it.rarity) * 100 - Object.values(it.stats).reduce((a, b) => a + b, 0), inv = S.inv.slice().sort((a, b) => order(a) - order(b)), sc = Object.keys(S.scr);
    return `<section class="place"><p class="eyebrow">${S.inv.length} / 60 items</p><h1>Bag ${qm('bag')}</h1></section>
      ${sc.length ? `<section class="sec"><h2>Scrolls</h2>` : ''}${sc.length ? `<div class="grid">${sc.map(id => { const p = pageById(id); return `<button class="cell rar-${p.rare ? 'epic' : 'uncommon'}" data-a="scroll" data-id="${id}" aria-label="${esc(p.name)}">${ico('scroll', S.scr[id] > 1 ? S.scr[id] : null)}</button>`; }).join('')}</div>` : ''}${sc.length ? '</section>' : ''}
      <section class="sec"><h2>Supplies</h2><div class="grid"><button class="cell" data-a="tonic" aria-label="Healing Draught: drink"${S.tonics > 0 && S.hp < maxHp() ? '' : ' disabled'}>${ico('draught', S.tonics)}</button><button class="cell" data-a="eat" aria-label="Meat: eat"${S.meat > 0 && S.hp < maxHp() ? '' : ' disabled'}>${ico('meat', S.meat || 0)}</button>${Object.keys(S.food).map(k => `<button class="cell" data-a="eat" data-k="${k}" aria-label="${FOOD[k][0]}: eat" title="${FOOD[k][0]}"${S.hp < maxHp() ? '' : ' disabled'}>${ico(FOOD[k][2], S.food[k])}</button>`).join('')}${have('hide') ? `<span class="cell" title="Hide">${ico('pelt', have('hide'))}</span>` : ''}<span class="cell">${ico('hintkey', S.hints)}</span><span class="cell">${ico('sigil', have('sigil'))}</span>${[1, 2, 3, 4, 5, 6, 7, 8].filter(k => have(k)).map(k => `<span class="cell" title="${MATS[k]}">${ico('mat' + k, have(k))}</span>`).join('')}</div></section>
      ${(S.deeds || []).length ? `<section class="sec"><h2>Deeds</h2><ul class="goods">${S.deeds.map((d, k) => `<li class="good">${ico('deed')}<div><b>${esc(HMAT[d.mat][0])} ${esc(lc(HOUSES[d.shape][0]))}</b><small>${HOUSES[d.shape][1]} × ${HOUSES[d.shape][2]}</small></div><button class="btn sm" data-a="placedeed" data-k="${k}">Set it down</button></li>`).join('')}</ul></section>` : ''}
      <section class="sec"><h2>Gear <small>tap a piece</small></h2>${inv.length ? `<div class="grid">${inv.map(it => `<button class="cell rar-${it.rarity}${S.eq[it.slot] === it.id ? ' worn' : ''}" data-a="item" data-id="${it.id}" aria-label="${esc(it.name)}">${ico(it.ic)}</button>`).join('')}</div><div class="row end" style="margin-top:10px"><button class="btn sm quiet" data-a="sellcommon">Sell all unworn common gear</button></div>` : '<p class="note">Nothing yet. Creatures, dungeons and the workbench are where gear comes from.</p>'}</section>
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

  /* ---------- actions ---------- */
  const ACT = {
    snd: d => { const p = Sound.pref(); if (d.k === 'mu') Sound.setMu(!p.mu); else Sound.setFx(!p.fx); render(); },
    tab: d => { if (F) return; tab = d.t; if (tab === 'map') sel = S.region; closeSheet(); render(); $('#view').scrollTop = 0; },
    sub: d => { sub = d.s; render(); }, lsub: d => { lsub = d.s; render(); }, sel: d => { sel = +d.r; render(); },
    travel: d => { const r = +d.r; if (!unlocked(r) || !sceneUp) return; DG = null; S.dungeon = null; const t = Scene.towns()[r]; tab = 'world'; Scene.load([t[0], t[1] + 3], r); S.region = r; sel = r; save(); render(); },
    journal: () => { if (!F) SH.journal(); }, act: () => Scene.act(), talk: () => CE && SH[CE.kind](CE), shop: () => CE && SH.stallkeep(CE), chat: () => { const e = CE; if (!e) return; closeSheet(); dlg(e, pick(e.kind === 'tavern' ? GOSSIP.concat(TALK.hint) : TALK.bark.concat(TALK.hint)), [{ t: 'Back to the goods', a: 'talk' }, bye]); },
    eat: d => { const k = (d && d.k) || 'meat'; if (!(foodN(k) > 0) || S.hp >= maxHp() || (F && (F.busy || F.over))) return; addFood(k, -1); const n = heal(FOOD[k][1]); save(); renderHud(); toast(`+${n} health`); if (F) { barsF(); drawF(); } else render(); },
    buymeat: d => { const c = +d.c; if (S.gold < c) return; S.gold -= c; S.meat = (S.meat || 0) + 1; save(); renderHud(); toast('Bought a trail ration'); if (CE && SH[CE.kind]) SH[CE.kind](CE); },
    offer: d => { const c = CONTRACTS.find(x => x.id === d.id), lead = TALK.lead[c.r - 1][CONTRACTS.filter(x => x.r === c.r).indexOf(c) % 4], line = c.story[0] === '"' ? lead.slice(0, -1) + ' ' + c.story.slice(1) : c.story; dlg(CE, line, [{ t: 'Begin', n: c.lesson ? 'teaches ' + c.lesson.title : 'practice', a: 'contract', d: { id: c.id } }, back]); },
    jobs: () => dlg(CE, '"Do any again, from memory."', jobsOf(CE).filter(c => S.done[c.id]).map(c => ({ t: c.title, n: 'done', a: 'contract', d: { id: c.id } })).concat([back])),
    ask: d => { const t = CE.r, r = region(t), sp = Scene.spots(), tw = Scene.towns()[t], dir = p => p ? (Math.abs(p[1] - tw[1]) > Math.abs(p[0] - tw[0]) ? (p[1] < tw[1] ? 'north' : 'south') : (p[0] < tw[0] ? 'west' : 'east')) : 'out'; dlg(CE, d.k === 'place' ? `${TALK.place[t - 1].slice(0, -1)} The examiner’s ring is ${dir(sp['boss' + t])} of town, and ${DUNGEONS[t - 1].name} lies to the ${dir(sp['dun' + t])}."` : SAY[t - 1][CE.i], [back]); },
    gossip: () => dlg(CE, pick(GOSSIP), [{ t: 'More', a: 'gossip' }, back]),
    pages: () => { coach('shop'); const t = here(); sheet(`<p class="eyebrow">${CIRCLE[t]} Circle</p><h2>Pages for sale ${qm('shop')}</h2><ul class="inv">${PAGES.filter(p => p.c === t && !p.rare).map(p => goodHTML(owned(p.id) ? { ic: 'scroll_' + p.book, name: p.name, meta: BOOKS[p.book].name, pill: 'in your book' } : { ic: 'scroll_' + p.book, name: p.name, meta: `${BOOKS[p.book].name} · ${BOOKS[p.book].what}`, price: p.price + ' gold', a: 'buypage', d: { id: p.id }, off: S.gold < p.price })).join('')}</ul>`.replace('<ul class="inv">', '<ul class="goods">')); },
    buypage: d => { const p = pageById(d.id); if (!p || owned(p.id) || S.gold < p.price) return; S.gold -= p.price; S.pages[p.id] = 1; if (gid() === 'page') setTimeout(() => gDone('page'), 400); save(); renderHud(); toast(`${p.name} added to your ${BOOKS[p.book].name}`); ACT.pages(); },
    scroll: d => { const p = pageById(d.id); if (!p || !S.scr[p.id]) return; sheet(`${scrollHTML(p)}<p class="cap2">${esc(p.src)}.</p><div class="row end">${owned(p.id) ? `<button class="btn" data-a="sellscroll" data-id="${p.id}">Sell · ${20 * p.c} gold</button>` : `<button class="btn solid" data-a="inscribe" data-id="${p.id}">Add to the ${BOOKS[p.book].name}</button>`}</div>`); },
    inscribe: d => { const p = pageById(d.id); if (p && inscribe(p.id)) { save(); toast(`${p.name} added to your ${BOOKS[p.book].name}`); } closeSheet(); render(); },
    sellscroll: d => { const p = pageById(d.id); if (!p || !S.scr[p.id]) return; S.scr[p.id]--; if (!S.scr[p.id]) delete S.scr[p.id]; S.gold += 20 * p.c; save(); closeSheet(); render(); },
    pick: d => { const n = $('#cr-name'); if (!CR) return; if (n) CR.name = n.value; CR.path = d.id; CR.look = +d.look; create(); },
    begin: () => {
      if (!CR || CR.look == null) return; const p = PATHS.find(x => x.id === CR.path), nm = ($('#cr-name').value || '').trim().slice(0, 16) || NAMES[CR.look], rev = S.rev;
      const slot = CR.slot != null && !A.slots[CR.slot] ? CR.slot : A.slots.findIndex(c => !c); if (slot < 0) return toast('All five slots are taken'); syncA();
      const main = A.main < 0 || !A.slots[A.main]; A.cur = slot; if (main) A.main = slot;
      S = linkS(fresh()); S.rev = rev; S.name = nm; S.path = p.id; S.look = CR.look; S.sk = Object.assign({}, p.sk); S.hp = maxHp(); give(makeItem('common', 1, 'weapon', WSTART[p.id])); for (const id of { warrior: ['a1'], thief: ['a1', 'h1'], mage: ['s1'], crafter: ['a1', 'c1'] }[p.id]) S.pages[id] = 1; S.intro = 1; S.pos = null;
      CR = null; DG = null; Q = null; F = null; $('#enc').hidden = true; $('#fight').hidden = true; $('#nav').hidden = false; tab = 'world'; save(); if (sceneUp) Scene.load(null, 'dock'); render();
      if (main) coldOpen(); else { hideTitle(); gSkip(); toast(`${nm} arrives in Tallyport`); }
    },
    newgame: () => { CR = null; return title(); if (S.path) return showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box"><h1>Start over?</h1><p class="tt-sub">${esc(S.name)} and everything they own will be erased when the new game begins.</p><button class="tt-btn" data-a="newgame2">Make a new character</button><button class="tt-btn quiet" data-a="totitle">Back</button></div>`); create(); },
    newgame2: () => { CR = null; create(); }, totitle: () => title(), continue: () => hideTitle(),
    playslot: d => playSlot(+d.i), newslot: d => { CR = { path: null, look: null, name: '', slot: +d.i }; create(); }, delpick: () => delPick(),
    delslot: d => { const i = +d.i, c = A.slots[i]; if (!c) return; showTitle(`<div class="tt-art"${tbg('J01')}></div><div class="tt-box"><h1>Delete ${esc(c.name)}?</h1><p class="tt-sub">${esc(c.name)}, their bag, their bank and their skills are gone for good. Houses stay.</p><button class="tt-btn" data-a="delyes" data-i="${i}">Delete</button><button class="tt-btn quiet" data-a="totitle">Back</button></div>`); },
    delyes: d => { const i = +d.i; if (!A.slots[i]) return; A.slots[i] = null; if (A.main === i) A.main = -1; if (A.cur === i) { A.cur = -1; S = linkS(fresh()); } save(); title(); },
    beat: d => coldOpen(+d.i),
    skipguide: () => { hideTitle(); gSkip(); }, gskip: () => gSkip(),
    looks: () => looksSheet(), lookset: d => { const L = myLook(), k = d.k, v = (k === 'dye' || k === 'wglow') && isNaN(+d.v) || d.v === '' ? d.v : +d.v; if (L[k] === v) return; const c = lookCost(k); if (c && S.gold < c) return toast(`That costs ${c} gold`); if (c) S.gold -= c; L[k] = v; if (k === 'body') { S.look = v; if (v && L.beard >= 0) L.beard = -1; if (L.hair >= 0 && (L.hair < 6) === !!v) L.hair = v ? 6 : 0; } save(); looksSheet(); renderHud(); },
    djboard: () => { closeSay(); djBoard(Scene.inHall()); }, djsign: () => { const r = Scene.inHall(); if (!r || S.gold < 15 * r) return; djSign(r); closeSheet(); Scene.enterHall(r, hallFill(r)); clearInterval(SPT); SPT = setInterval(sparTick, 140); Scene.hop(5, 13); toast('You’re in the bracket'); render(); setTimeout(() => djBoard(r), 300); },
    djfight: () => { if (S.djb && S.djb.r === Scene.inHall()) djFight(); }, djmaster: () => { const r = Scene.inHall(), M = Scene.find(x => x.kind === 'master'); if (r && M && DJ(r).champ) boutStart(r, 4, Dojo.MASTERS[r - 1], M); },
    djilva: () => { const r = Scene.inHall(), M = Scene.find(x => x.kind === 'master'); CE = M; dlg(M, Dojo.SAY[r - 1].ilva.join(' '), [bye]); },
    djwatch: () => { const pr = Scene.ents().filter(x => x.spar); if (pr.length < 2) return; closeSay(); pr.forEach(x => x.ff = 1); duOpen({ mode: 'watch', r: Scene.inHall(), a: pr[0], b: pr[1] }); },
    dudone: () => { duClose(); }, dunext: () => { if (DU) duRound(); }, duyield: () => { if (DU && DU.mode === 'duel') duEnd(1); }, duover: () => { if (DU) boutOver(); },
    odx: d => odx(+d.n),
 gnext: () => { closeSay(); if (gid() === 'fish') gDone('fish'); }, bankopen: () => { closeSay(); bankSheet(CE); },
    ashore: () => { hideTitle(); S.gd = 0; save(); gEnter(); },
    tonic: () => { if ((F && (F.busy || F.over)) || S.tonics < 1 || S.hp >= maxHp()) return; S.tonics--; const n = heal(30); save(); renderHud(); toast(`+${n} health`); if (F) { barsF(); drawF(); } else render(); },
    buytonic: d => { const c = +d.c; if (S.gold < c) return; S.gold -= c; S.tonics++; save(); renderHud(); toast('Bought a Healing Draught'); if (CE && SH[CE.kind]) SH[CE.kind](CE); else closeSheet(); },
    rest: d => { const cost = +d.c || 4 * here(); if (S.gold < cost || S.hp >= maxHp()) return; S.gold -= cost; S.hp = maxHp(); save(); renderHud(); closeSheet(); toast('Rested. Full health'); },
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
    buygear: d => { const e = CE, st = e && S.cs[e.hid], it = st && st.items[+d.i]; if (!it || S.gold < price(it)) return; if (S.inv.length >= 60) return toast('Your bag is full'); S.gold -= price(it); st.items.splice(+d.i, 1); give(it); save(); renderHud(); toast('Bought ' + it.name); countryStock(e); },
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
    ftip: () => { if (F && F.task && F.task.tip && !F.hints.some(h => h.includes('class="fh tip"'))) { F.hints.unshift(`<p class="fh tip">${esc(F.task.tip)}</p>`); $('#f-hint').innerHTML = F.hints.join(''); fitPanel(); } },
    lootone: d => { lootTake(+d.i); lootDone(); }, lootall: () => { const all = { gold: 0, mats: {}, items: [], scrolls: [], food: {}, sigils: 0, meat: 0, hide: 0 }; LB.L.forEach((p, i) => { const g = lootTake(i, true); if (!g) return; all.gold += g.gold; for (const k in g.mats) all.mats[k] = (all.mats[k] || 0) + g.mats[k]; for (const k in g.food) all.food[k] = (all.food[k] || 0) + g.food[k]; all.sigils += g.sigils; all.meat += g.meat; all.hide += g.hide; all.runes = (all.runes || 0) + (g.runes || 0); all.items.push(...g.items); all.scrolls.push(...g.scrolls); }); toast(bitsOf(all).concat(all.items.map(x => x.name), all.scrolls.map(x => 'Scroll: ' + x.name)).join(' · ')); lootDone(); }, lootclose: () => { LB = null; closeSheet(); },
    coachok: () => { $('#coach').hidden = true; }, why: d => { const el = $('#coach'); el.innerHTML = `<p>${esc(HELP[d.id] || '')}</p><button class="btn sm solid" data-a="coachok">Got it</button>`; el.hidden = false; },
    sbeat: () => storyNext(), letter: () => ilvaLetter(), truth: d => trOpen(d.id), trclose: () => { const end = TR && TR.T.id === 't12' && S.tw.t12; trClose(); if (end) theDoor(); },
    dpeek: d => { const t = Deep.TABLES[+d.i]; if (!t || !haveT(+d.i)) return; const r = deepDb().read(`SELECT * FROM ${t.name} LIMIT 8`); sheet(`<h2>${t.name}</h2><p class="cap2">${esc(t.note)} First eight rows.</p>${tableHTML(r, 8)}<div class="row end"><button class="btn sm quiet" data-a="closesheet">Close</button></div>`); },
    ltable: () => {}, gohome: () => { S.ending = 'home'; save(); STY = null; storyCards([{ bg: 'J11', t: 'You row out. The light is warm, and it smells of rain on stone. The last thing you see of Brasswake is a lantern on the harbor wall, and someone waving it.' }, { t: 'You are home. Thank you for playing Brasswake. Your save is still here: you can keep playing as if you stayed.' }], () => render()); },
    stay: () => { S.ending = 'stay'; save(); STY = null; storyCards([{ bg: 'J11', t: 'You watch from the harbor wall until the light thins and goes out. Behind you, Tallyport is waking up. It has its champion.' }], () => render()); },
    deeds: () => deedsSheet(), dmat: d => { DM = +d.i; deedsSheet(); }, bankback: () => bankSheet(),
    buydeed: d => { const i = +d.i, c = hPrice(i, DM); if (funds() < c) return; pay(c); (S.deeds = S.deeds || []).push({ shape: i, mat: DM }); save(); renderHud(); toast(`Bought: ${hName(i, DM)} deed. It is in your bag.`); deedsSheet(); },
    placedeed: d => startPlace(+d.k), placecancel: () => { PL = null; Scene.ghost(null); placeBar(); },
    placego: () => { const g = Scene.ghostNow(); if (!PL || !g) return; g.why = Scene.homeFits(g.x, g.y, g.w, g.h); if (g.why) return placeBar(); const n = (S.homes || []).length + 1, p = Scene.pos(), h = { id: 'h' + Date.now().toString(36), shape: PL.shape, mat: PL.mat, x: g.x, y: g.y, w: g.w, h: g.h, r: Scene.region(), wall: PAINT.wall[0][1], roof: PAINT.roof[0][1], pad: 0, chest: [], name: n === 1 ? 'Your home' : 'Home ' + n };
      S.deeds.splice(PL.k, 1); (S.homes = S.homes || []).push(h); Scene.addHome(h); PL = null; Scene.ghost(null); placeBar(); save(); toast('Built. Tap the door to go in.'); },
    paint: d => { const h = homeById(d.h); if (!h || h[d.k] === d.c) return; if (funds() < PAINT_C) return toast(`A coat of paint costs ${PAINT_C} gold`); pay(PAINT_C); h[d.k] = d.c; Scene.dropHome(h.id); Scene.addHome(h); save(); homeSheet(h); },
    hbed: d => { const h = homeById(d.h); heal(maxHp()); if (h && h.fbed) S.rest = Date.now() + 60 * 60000; save(); renderHud(); toast(h && h.fbed ? 'You sleep well. Full health, and well rested for an hour.' : 'You sleep. Full health.'); homeSheet(h); },
    hup: d => { const h = homeById(d.h); if (!h) return; const k = d.k, c = k === 'xch' ? xchC(h) : k === 'fbed' ? BED_C : GARDEN_C; if (funds() < c || (k === 'xch' && (h.xch || 0) >= 4) || (k !== 'xch' && h[k])) return; pay(c); if (k === 'xch') h.xch = (h.xch || 0) + 1; else h[k] = 1; save(); renderHud(); toast('Done. ' + (k === 'xch' ? 'Another chest.' : k === 'fbed' ? 'A feather bed.' : 'A garden out back.')); homeSheet(h); },
    hpick: d => { const h = homeById(d.h); if (!h || !h.garden || h.gday === dayKey()) return; h.gday = dayKey(); const o = { food: {}, mats: { [h.r]: rint(2, 3) } }; o.food[pick(['apple', 'loaf', 'honey', 'cheese'])] = 2; const g = grant(o); save(); renderHud(); toast(bitsOf(g).join(' · ')); homeSheet(h); },
    hpad: d => { const h = homeById(d.h); if (!h || h.pad || !(S.runes > 0)) return; S.runes--; h.pad = 1; Scene.dropHome(h.id); Scene.addHome(h); save(); toast('The pad is set. Teleport here from the Map.'); homeSheet(h); },
    hput: d => { const h = homeById(d.h); if (!h || h.chest.length >= hCap(h)) return toast('The chest is full'); const i = S.inv.findIndex(it => it.id === d.id); if (i < 0) return; h.chest.push(S.inv.splice(i, 1)[0]); save(); homeSheet(h); },
    htake: d => { const h = homeById(d.h); if (!h) return; if (S.inv.length >= 60) return toast('Your bag is full'); const i = h.chest.findIndex(it => it.id === d.id); if (i < 0) return; S.inv.push(h.chest.splice(i, 1)[0]); save(); homeSheet(h); },
    tphome: d => { const h = homeById(d.h); if (!h || !h.pad) return; if (F || Q) return toast('Not in a fight.'); if (sceneUp && Scene.find(e => e.chase > 0)) return toast('Not while something is chasing you.'); const p = Scene.homeDoor(h.id); DG = null; S.dungeon = null; tab = 'world'; Scene.load(p || [h.x, h.y + h.h + 1], h.r); S.region = h.r; save(); render(); toast('You step off the pad at ' + h.name + '.'); },
    bdep: () => { if (gid() === 'bank') setTimeout(() => { closeSheet(); gDone('bank'); }, 700); S.bank.gold += S.gold; toast(`Deposited ${S.gold} gold`); S.gold = 0; save(); renderHud(); bankSheet(); },
    bwd: d => { const n = d.n === 'all' ? S.bank.gold : Math.min(+d.n, S.bank.gold); S.bank.gold -= n; S.gold += n; save(); renderHud(); bankSheet(); },
    bstore: d => { if (S.bank.items.length >= BANK_SLOTS) return toast('The bank box is full'); const i = S.inv.findIndex(it => it.id === d.id); if (i < 0 || Object.values(S.eq).includes(d.id)) return; S.bank.items.push(S.inv.splice(i, 1)[0]); save(); bankSheet(); },
    btake: d => { if (S.inv.length >= 60) return toast('Your bag is full'); const i = S.bank.items.findIndex(it => it.id === d.id); if (i < 0) return; S.inv.push(S.bank.items.splice(i, 1)[0]); save(); bankSheet(); },
    help: () => helpSheet(), hint: () => takeHint(), fhint: () => fHint(), fshow: () => fShow(), ftables: () => tablesSheet(), klog: () => { S.klog = !S.klog; save(); toast(S.klog ? 'Key log on: it shows under the query box' : 'Key log off'); const ta = $('#sql'), q = ta && ta.parentNode; if (q) { const old = $('#klog'); if (S.klog && !old) ta.insertAdjacentHTML('afterend', '<p id="klog" class="klog">Key log: tap keys and it fills in here</p>'); if (!S.klog && old) old.remove(); } closeSheet(); },
    qleave: () => closeQ(), qturn: () => { if (Q) { Q.step = 'turn'; drawQ(); } }, qnext: () => { const id = Q && Q.nextId; if (!id) return; Q = null; START.contract({ id }); },
    qstep: d => { if (!Q) return; if (d.s === 'reps') { Q.step = 'turn'; Q.tasks = REPS; Q.i = 0; Q.task = REPS[0]; } else Q.step = d.s; drawQ(); $('#enc .q-body').scrollTop = 0; },
    blank: d => { if (!Q || !Q.blank || Q.bok) return; const i = Q.blank.indexOf(null); if (i < 0) return; Q.blank[i] = d.w; Q.bout = ''; drawQ(); }, unblank: d => { if (!Q || !Q.blank || Q.bok) return; Q.blank[+d.i] = null; Q.bout = ''; drawQ(); }, blankrun: () => blankRun(),
    fpage: d => pickPage(d.id), fsteal: () => pickSteal(), fchoose: () => { if (F && !F.busy && !F.over) { F.st = 'choose'; drawF(); } }, fdone: () => closeF(), floot: () => { const b = F && F.body; closeF(); if (b) lootOpen(b); }, flee: () => flee(),
    cardno: () => { closeCard(); render(); },
    atlas: () => sheet('<h2>Tables of the Great Ledger</h2>' + atlasHTML()),
    peek: d => { const r = Engine.peek(d.t); sheet(`<h2>${d.t}</h2><p class="cap2">First four rows.</p>${tableHTML(r)}<div class="row end"><button class="btn sm quiet" data-a="atlas">All tables</button></div>`); },
    slot: d => { benchSlot = d.s; SH.bench(); },
    craft: d => {
      const x = RECIPES.find(r => r.id === d.id), t = here(), cp = bestPage('craft'); if (!x || !cp || cp.c < t || have(t) < x.mats || have('sigil') < x.sigils) return; if (x.gear && S.inv.length >= 60) return toast('Your bag is full'); if (!ready) return toast(engineErr || 'The Ledger is still opening');
      const csk = x.gear ? 'smith' : 'alchemy', c = cp.c, b = pick(BOUNTIES.filter(q => q.r === c && !/^b80[123]/.test(q.id))), diff = Math.min(100, diffOf(t) + ({ rare: 8, epic: 16, legendary: 24 }[x.id] || 0));
      openQ({ kind: 'craft', roll: true, csk, recipe: x, slot: benchSlot, r: t, diff, task: makeTask({ tpl: b.id, seed: seeded(b.id) }), title: (x.id === 'scroll' ? 'Hint Key' : x.name) + (x.gear ? ' · ' + benchSlot : '') });
    },
    bench: () => SH.bench(),
    buy: d => { const st = stall(), it = st.stock[+d.i]; if (!it || S.gold < price(it)) return; if (S.inv.length >= 60) return toast('Your bag is full'); S.gold -= price(it); st.stock.splice(+d.i, 1); give(it); save(); renderHud(); if (CE) SH.stallkeep(CE); toast('Bought ' + it.name); },
    equip: d => { const it = itemById(d.id); if (it) { S.eq[it.slot] = it.id; save(); closeSheet(); render(); if (gid() === 'bag' && it.id === S.gk) { ACT.tab({ t: 'world' }); gDone('bag'); } } },
    item: d => { const it = itemById(d.id); if (!it) return; const on = S.eq[it.slot] === it.id; sheet(`${lootHTML(it)}<div class="row end">${on ? `<button class="btn" data-a="unequip" data-s="${it.slot}">Take off</button>` : `<button class="btn solid" data-a="equip" data-id="${it.id}">Wear</button>`}${it.unique ? '' : `<button class="btn quiet" data-a="sell" data-id="${it.id}">Sell · ${worth(it)}</button>`}</div>${it.unique || it.bless ? '' : `<div class="row end">${S.blessd ? `<button class="btn sm quiet" data-a="bless" data-id="${it.id}">Bless · ${S.blessd} deed${S.blessd > 1 ? 's' : ''}</button>` : ''}<button class="btn sm quiet" data-a="insure" data-id="${it.id}">${it.ins ? 'Stop insuring' : `Insure · ${insFee(it)} a fall`}</button></div>`}`); },
    unequip: d => { delete S.eq[d.s]; save(); closeSheet(); render(); },
    djtrain: () => trainSheet(),
    train: d => { const id = d.id, T = trainCost(id, +d.n || 1), v = rv(id), add = T.to - v; if (!add || S.gold < T.c || CAP - total() < add) return; S.gold -= T.c; S.sk[id] = Math.round(T.to * 10) / 10; save(); renderHud(); toast(`${rpgName(id)} ${v.toFixed(1)} → ${T.to}`); trainSheet(); },
    reads: () => { if (!S.gscr) return; S.gscr--; S.boost = Math.max(Date.now(), S.boost || 0) + 30 * 60000; save(); toast('Double skill gain for 30 minutes'); render(); },
    readp: d => { const P = S.pscr || [], x = P[+d.i]; if (!x || skCap(x.id) >= x.cap || skCap(x.id) < x.cap - 5) return; (S.pcap = S.pcap || {})[x.id] = x.cap; P.splice(+d.i, 1); save(); toast(`${rpgName(x.id)} can now reach ${x.cap}`); render(); },
    buybless: () => { if (funds() < BLESS_C) return; pay(BLESS_C); S.blessd = (S.blessd || 0) + 1; save(); renderHud(); toast('Bought a bless deed'); bankSheet(); },
    bless: d => { const it = itemById(d.id); if (!it || it.bless || it.unique || !S.blessd) return; S.blessd--; it.bless = 1; delete it.ins; save(); toast(`${it.name} is blessed`); d.from === 'bank' ? bankSheet() : ACT.item({ id: it.id }); },
    insure: d => { const it = itemById(d.id); if (!it || it.bless || it.unique) return; it.ins = it.ins ? 0 : 1; save(); d.from === 'bank' ? bankSheet() : ACT.item({ id: it.id }); },
    sell: d => { const it = itemById(d.id); if (!it || it.unique) return; S.gold += worth(it); S.inv = S.inv.filter(i => i !== it); if (S.eq[it.slot] === it.id) delete S.eq[it.slot]; save(); closeSheet(); render(); },
    sellcommon: () => { let g = 0; S.inv = S.inv.filter(it => { if (it.rarity === 'common' && S.eq[it.slot] !== it.id) { g += worth(it); return false; } return true; }); const hd = have('hide'); if (hd) { g += hd * 3; S.mats.hide = 0; } S.gold += g; save(); render(); closeSheet(); toast(g ? `Sold for ${g} gold` : 'Nothing to sell'); if (gid() === 'sell') setTimeout(() => gDone('sell'), 600); },
    conrun: () => { con.sql = $('#con-sql').value; heroTables(); con.res = Engine.runSandbox(con.sql); $('#con-out').innerHTML = conHTML(con.res); },
    conq: d => { $('#con-sql').value = d.q; ACT.conrun(); },
    conreset: () => { Engine.resetSandbox(); con.res = null; render(); toast('Sandbox restored to the original ledger'); },
    export: () => { if(DG)DP.snapshot(); syncA(); const code = btoa(unescape(encodeURIComponent(JSON.stringify(A)))); sheet(`<h2>Save code</h2><p class="cap2">Copy this somewhere safe. Loading it on any device restores all your characters and houses.</p><label class="vh" for="savebox">Save code</label><textarea id="savebox" class="savebox" readonly>${code}</textarea><div class="row end"><button class="btn solid" data-a="copy">Copy</button></div>`); },
    copy: async () => { const b = $('#savebox'); try { await navigator.clipboard.writeText(b.value); toast('Copied'); } catch (e) { b.focus(); b.select(); toast('Select all and copy'); } },
    import: () => sheet(`<h2>Load a save code</h2><p class="cap2">This replaces all your characters and houses.</p><label class="vh" for="savebox">Save code</label><textarea id="savebox" class="savebox" placeholder="Paste a save code"></textarea><div class="row end"><button class="btn solid" data-a="doimport">Load</button></div>`),
    doimport: () => { try { const o = JSON.parse(decodeURIComponent(escape(atob($('#savebox').value.trim())))); if (!o || ![6,7].includes(o.v)) throw 0; const rev = Math.max(A.rev, o.rev || 0); A = Object.assign(freshA(), o, {v:7}); A.rev = rev; loadCur(); cmdBackfill(); DG = null; Q = null; F = null; save(); closeSheet(); if (A.cur < 0) return title(); hideTitle(); if (sceneUp) {Scene.load(S.pos, S.pos ? S.region : 'dock');if(S.dungeon)DP.restore();surfaceBodies();} render(); toast('Game loaded'); } catch (e) { toast('That is not a valid save code'); } },
    reset: () => { closeSheet(); tab = 'world'; render(); title(); }
  };
  document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || el.disabled || ghost(e)) return; const f = ACT[el.dataset.a]; if (f) f(el.dataset, el, e); });
  document.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { if (Q || F) ACT.run(); else if ($('#con-sql')) ACT.conrun(); } if (e.key === 'Escape' && (!$('#sheet').hidden || SB)) closeSheet(); });
  document.addEventListener('click', e => { if (SB && !ghost(e) && e.target.closest('#say') && !e.target.closest('[data-a]')) sayTap(); });

  /* ---------- boot ---------- */
  function engineUp(SQL) { Engine.init(SQL, World); for (const t of Engine.atlas()) COLS[t.name] = t.cols.map(c => c.name); ready = true; render(); if (tab !== 'world' && !sceneUp) bootScene(); if ($('#kb')) kbDraw(); if (Q && Q.step[0] === 'i') drawQ(); }
  function bootEngine() {
    const go = () => window.initSqlJs().then(engineUp).catch(e => { engineErr = 'The Ledger could not open (' + (e && e.message || e) + '). Reload the page to try again.'; render(); });
    if (typeof window.initSqlJs === 'function') return go();
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-asm.js'; s.onload = go; s.onerror = () => { engineErr = 'The SQL engine could not be downloaded. Check your connection and reload.'; render(); }; document.head.appendChild(s);
  }
  function artLoad() {   // hold the title buttons until the shared art and this region's art are in, so nothing pops in during play
    if (!ART || !Scene.preload) return; const el = $('#artload'), app = $('#app'); let done = false; const fin = () => { if (done) return; done = true; app.classList.remove('artload'); el.hidden = true; };
    app.classList.add('artload'); el.hidden = false; el.textContent = 'Loading art'; Scene.preload(S.region || 1, (n, t) => { el.textContent = `Loading art ${n} of ${t}`; }).then(fin, fin); setTimeout(fin, 30000);
  }
  window.addEventListener('pagehide',()=>{if(S && S.path)save();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden && S && S.path)save();});
  function start(hot) { purgeOld(); A = (hot && hot.acct && [6,7].includes(hot.acct.v) && Object.assign(freshA(), hot.acct, {v:7})) || loadA() || freshA(); loadCur(); cmdBackfill(); title(); artLoad(); if (hot && hot.tab) tab = hot.tab; sel = S.region; render(); setTimeout(bootEngine, 30); cloudInit(); }
  if (location.protocol === 'file:' || location.hostname === 'localhost') window.__bw = { get A() { return A; }, makeItem, gain, odds, dropBody, insFee, trainCost, makePscr, maybeDye, homeSheet, get DU() { return DU; }, get FI() { return FI; }, errandFor, get PK() { return PK; }, get WH() { return WH; }, get BJ() { return BJ; }, get Q() { return Q; }, get F() { return F; }, KB, get S() { return S; }, get DG() { return DG; }, DP, get SB() { return SB; }, get TR() { return TR; }, setCE: e => { CE = e; }, HOST, SH, START, ACT, render, save, odds, gain, diffOf };
  // speech and story use curly quotes; SQL, code and table data keep straight ones
  const cq = t => t.replace(/"/g, (m, i) => (i === 0 || /[\s(\[\u2014\u2013-]/.test(t[i - 1])) ? '\u201c' : '\u201d'), RAW = 'pre,code,textarea,input,script,style,td,th,.qbox,.code,.sqlhl,[data-raw]';
  function curl(n) { if (n.nodeType === 3) { if (n.data.indexOf('"') < 0) return; const p = n.parentElement; if (!p || p.closest(RAW)) return; const v = cq(n.data); if (v !== n.data) n.data = v; } else if (n.nodeType === 1 && !n.matches(RAW)) for (const c of n.childNodes) curl(c); }
  try { curl(document.body); new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') curl(m.target); else m.addedNodes.forEach(curl); } }).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) { }
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(() => { syncA(); return { acct: A, tab }; });
  if (hot && hot.ready) hot.ready(start); else start(hot && hot.data || {});
})();
