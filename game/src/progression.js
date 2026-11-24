/* Pure character progression. Real values use integer tenths for cap transactions. */
const Progression = (() => {
  const CAP = 700, STAT_CAP = 225, STAT_MIN = 10, STAT_MAX = 100;
  const skills = [
    ['swords', 'Swordsmanship', 'Heavy hits. Two swings an exchange.'], ['fencing', 'Fencing', 'Lighter hits. Three swings an exchange.'],
    ['archery', 'Archery', 'A safer ranged opening exchange.'], ['magery', 'Magery', 'Cast attack, healing and protective spells.'],
    ['stealing', 'Stealing', 'Inspect a target and lift a purse or selected prize.'], ['hiding', 'Hiding', 'Become concealed before an approach.'],
    ['smith', 'Blacksmithing', 'Make equipment at the workbench.'], ['alchemy', 'Alchemy', 'Make draughts and Hint Keys.'],
    ['carpentry', 'Carpentry', 'Craft household storage, beds and shelves.'], ['healing', 'Healing', 'Bind wounds during and after combat.'],
    ['fishing', 'Fishing', 'Catch rare fish and sunken treasures.'], ['eval', 'Evaluating Intelligence', 'Strengthen attack spells and study magical defenses.'],
    ['meditation', 'Meditation', 'Recover mana by gathering your thoughts.'], ['inscription', 'Inscription', 'Craft spell scrolls and strengthen wards.'],
    ['resisting', 'Resisting Spells', 'Reduce hostile magical damage.'], ['tactics', 'Tactics', 'Strengthen physical attacks and combat maneuvers.'],
    ['anatomy', 'Anatomy', 'Study physical weaknesses and improve bandages.'], ['parrying', 'Parrying', 'Block physical attacks with an equipped shield.'],
    ['stealth', 'Stealth', 'At 10, approach from behind for a Fencing Backstab. Running reveals you.'], ['lockpicking', 'Lockpicking', 'Open and disarm optional treasure containers.']
  ];
  const ids = skills.map(s => s[0]), stats = ['str', 'dex', 'int'];
  const presets = { warrior: [60, 35, 25], thief: [35, 60, 25], crafter: [45, 40, 35], mage: [25, 35, 60] };
  const affinity = { swords: ['str','dex'], fencing: ['dex','str'], archery: ['dex','str'], magery: ['int','str'], stealing: ['dex','int'], hiding: ['dex','int'], smith: ['str','dex'], alchemy: ['int','dex'], carpentry: ['str','dex'], healing: ['int','dex'], fishing: ['dex','str'], eval: ['int','str'], meditation: ['int','dex'], inscription: ['int','dex'], resisting: ['str','int'], tactics: ['str','dex'], anatomy: ['int','str'], parrying: ['dex','str'], stealth: ['dex','int'], lockpicking: ['dex','int'] };
  const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
  const units = n => Math.round(finite(n) * 10), value = n => n / 10;
  const mode = (s, id, stat = false) => (stat ? s.attrModes : s.skillModes)?.[id] || 'up';
  const total = s => value(ids.reduce((n,id) => n + units(s.sk[id]), 0));
  const statTotal = s => value(stats.reduce((n,id) => n + units(s.attr[id]), 0));
  const skillCap = (s,id) => [105,110,115,120].includes(s.pcap?.[id]) ? s.pcap[id] : 100;
  const target = (s,id,stat=false) => finite((stat ? s.attrTargets : s.skillTargets)?.[id], stat ? STAT_MAX : skillCap(s,id));
  function normalize(s) {
    s.bandages = s.bandages == null ? 4 : Math.max(0,Math.min(999,Math.floor(Number(s.bandages)||0)));
    s.sk = s.sk && typeof s.sk === 'object' ? s.sk : {};
    s.pcap = Object.fromEntries(ids.filter(id => [105,110,115,120].includes(s.pcap?.[id])).map(id => [id,s.pcap[id]]));
    s.sk = Object.fromEntries(ids.filter(id => finite(s.sk[id]) > 0).map(id => [id,value(Math.max(0, Math.min(units(skillCap(s,id)),units(s.sk[id]))))]));
    let excess = units(total(s)) - units(CAP);
    for (const id of [...ids].sort((a,b) => (s.sk[b]||0)-(s.sk[a]||0))) { if(excess<=0)break; const n=Math.min(excess,units(s.sk[id])); s.sk[id]=value(units(s.sk[id])-n); excess-=n; }
    s.sk=Object.fromEntries(Object.entries(s.sk).filter(([,v])=>v>0));
    const base = presets[s.path] || presets.warrior;
    s.attr = Object.fromEntries(stats.map((id,i) => [id,value(Math.max(units(STAT_MIN),Math.min(units(STAT_MAX),units(finite(s.attr?.[id],base[i])))))]));
    excess=units(statTotal(s))-units(STAT_CAP);
    for(const id of [...stats].sort((a,b)=>s.attr[b]-s.attr[a])) {if(excess<=0)break;const n=Math.min(excess,units(s.attr[id]-STAT_MIN));s.attr[id]=value(units(s.attr[id])-n);excess-=n;}
    for (const [key, allowed, stat] of [['skillModes',ids,false],['attrModes',stats,true]]) {
      const old=s[key]||{}; s[key]=Object.fromEntries(allowed.filter(id=>['up','down','lock'].includes(old[id])).map(id=>[id,old[id]]));
      const tk=stat?'attrTargets':'skillTargets', ts=s[tk]||{}; s[tk]=Object.fromEntries(allowed.filter(id=>Number.isFinite(ts[id])).map(id=>[id,value(Math.max(units(stat?STAT_MIN:0),Math.min(units(stat?STAT_MAX:skillCap(s,id)),units(ts[id]))))]));
    }
    s.mana=Math.max(0,Math.min(maxMana(s),finite(s.mana,maxMana(s)))); s.stamina=Math.max(0,Math.min(maxStamina(s),finite(s.stamina,maxStamina(s))));
    s.hp=Math.max(0,Math.min(maxHp(s),finite(s.hp,maxHp(s)))); s.progression=1; return s;
  }
  const normalizeAccount = a => {if(a&&Array.isArray(a.slots))a.slots=a.slots.map(s=>s?normalize(s):null);return a;};
  const maxHp = s => 50 + Math.round(s.attr.str / 2);
  const maxMana = s => Math.round(s.attr.int);
  const maxStamina = s => Math.round(s.attr.dex);
  function setMode(s,id,next,stat=false) { if(!(stat?stats:ids).includes(id)||!['up','down','lock'].includes(next))return false; (stat?s.attrModes:s.skillModes)[id]=next; return true; }
  function setTarget(s,id,n,stat=false) { if(!(stat?stats:ids).includes(id)||!Number.isFinite(n))return false; const lo=stat?STAT_MIN:0,hi=stat?STAT_MAX:skillCap(s,id),v=value(Math.max(units(lo),Math.min(units(hi),units(n)))); (stat?s.attrTargets:s.skillTargets)[id]=v;if((stat?s.attr[id]:s.sk[id]||0)>=v)(stat?s.attrModes:s.skillModes)[id]='lock';return true; }
  function available(s,id,stat=false) {
    if(!(stat?stats:ids).includes(id)||mode(s,id,stat)!=='up')return 0;
    const bag=stat?s.attr:s.sk, keys=stat?stats:ids, floor=stat?STAT_MIN:0, cap=stat?STAT_CAP:CAP;
    const room=units(cap)-units(stat?statTotal(s):total(s));
    const donors=keys.filter(k=>k!==id&&mode(s,k,stat)==='down').reduce((n,k)=>n+Math.max(0,units(bag[k])-units(floor)),0);
    return value(Math.max(0,Math.min(units(Math.min(stat?STAT_MAX:skillCap(s,id),target(s,id,stat)))-units(bag[id]),room+donors)));
  }
  function change(s,id,amount,stat=false) {
    const bag=stat?s.attr:s.sk, before=finite(bag[id]), n=Math.min(Math.max(0,units(amount)),units(available(s,id,stat)));
    if(!n)return {id,before,after:before,capped:mode(s,id,stat)==='up',reason:mode(s,id,stat)==='up'?'cap':'mode',losses:[]};
    const keys=stat?stats:ids, floor=stat?STAT_MIN:0, room=units(stat?STAT_CAP:CAP)-units(stat?statTotal(s):total(s));let need=Math.max(0,n-room);const losses=[];
    for(const donor of keys.filter(k=>k!==id&&mode(s,k,stat)==='down').sort((a,b)=>(bag[b]||0)-(bag[a]||0)||keys.indexOf(a)-keys.indexOf(b))) {
      const take=Math.min(need,Math.max(0,units(bag[donor])-units(floor))); if(!take)continue;
      const old=bag[donor]||0;bag[donor]=value(units(old)-take);need-=take;losses.push({id:donor,before:old,after:bag[donor]}); if(!need)break;
    }
    bag[id]=value(units(before)+n);
    if(stat){s.hp=Math.min(s.hp,maxHp(s));s.mana=Math.min(s.mana,maxMana(s));s.stamina=Math.min(s.stamina,maxStamina(s));}
    if(Number.isFinite((stat?s.attrTargets:s.skillTargets)[id])&&bag[id]>=target(s,id,stat))(stat?s.attrModes:s.skillModes)[id]='lock';
    return {id,before,after:bag[id],losses};
  }
  function trainAttribute(s,id,quality,random=Math.random) {
    if(!(quality>0)||mode(s,id)!=='up'||!affinity[id])return null;
    const pair=affinity[id], first=random()<.75?pair[0]:pair[1];
    const chosen=[first,...pair.filter(k=>k!==first)].find(k=>mode(s,k,true)==='up'&&available(s,k,true)>0);
    return chosen?change(s,chosen,.2*Math.min(1,quality),true):null;
  }
  function gain(s,id,diff,quality,options={}) {
    if(!ids.includes(id)||!(quality>0)||mode(s,id)!=='up')return null;
    const random=options.random||Math.random,v=s.sk[id]||0,cp=skillCap(s,id),room=available(s,id);
    if(options.attributes!==false)trainAttribute(s,id,quality,random);
    if(v>=cp||!room)return {id,before:v,after:v,capped:true,losses:[]};
    let g=2.4*Math.max(.2,1-Math.abs(v-finite(diff,v))/45)*(v<30?1.6:1)*(v>=100?.01:Math.min(1,Math.max(.015,Math.pow((100-v)/60,2.2))))*quality*(1+Math.max(0,finite(options.learn))/100)*(options.study?2:1)*(options.rest?1.25:1);
    g=Math.min(g,room,cp-v);const tenths=Math.floor(g*10)+(random()<(g*10)%1?1:0);
    return tenths>0?change(s,id,value(tenths)):null;
  }
  function training(s,id,n) {
    let v=s.sk[id]||0,cost=0,points=0;const room=available(s,id);
    if(!ids.includes(id))return {cost:0,to:v,add:0};
    for(let k=0;k<Math.min(5,Math.max(1,Math.floor(n)||1))&&v<45;k++) {const add=Math.min(45,Math.floor(v)+1)-v;if(points+add>room+.00001)break;cost+=Math.round(10+1.5*Math.floor(v));points+=add;v+=add;}
    return {cost,to:value(units(v)),add:value(units(points))};
  }
  const physicalFactor = (s,stance='strike') => .9+s.attr.str*.002+(s.sk.tactics||0)*.002+(s.sk.anatomy||0)*.0008;
  const spellFactor = s => .9+s.attr.int*.0015+(s.sk.eval||0)*.0025;
  const resistFactor = s => 1-Math.min(.35,(s.sk.resisting||0)*.0025);
  const parryChance = s => Math.min(.35,(s.sk.parrying||0)*.0025)*( .6+Math.min(100,s.attr.dex)*.004);
  const bandage = s => Math.round(6+(s.sk.healing||0)*.3+(s.sk.anatomy||0)*.12);
  const ward = s => Math.min(.45,.15+(s.sk.inscription||0)*.0025);
  const recover = s => {const old=s.mana;s.mana=Math.min(maxMana(s),s.mana+Math.round(8+(s.sk.meditation||0)*.2+s.attr.int*.08));s.stamina=Math.min(maxStamina(s),s.stamina+12);return s.mana-old;};
  const castCost = circle => 3+Math.max(1,Math.min(8,circle))*2;
  return {CAP,STAT_CAP,STAT_MIN,STAT_MAX,skills,ids,stats,presets,affinity,normalize,normalizeAccount,mode,total,statTotal,skillCap,target,setMode,setTarget,available,change,gain,training,trainAttribute,maxHp,maxMana,maxStamina,physicalFactor,spellFactor,resistFactor,parryChance,bandage,ward,recover,castCost};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Progression;
