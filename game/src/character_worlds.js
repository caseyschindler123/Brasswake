// Each world owns its five characters and shared household/learning rewards.
// The active-world facade is deliberately absent from serialized saves.
const CharacterWorlds = (() => {
  const version = 9, count = 3, slots = 5;
  const shared = ['cur', 'main', 'slots', 'homes', 'codex', 'paid', 'djp', 'cmds', 'atlas', 'wv'];
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const freshWorld = () => ({cur:-1, main:-1, slots:Array(slots).fill(null), homes:[], codex:{}, paid:{}, djp:{}, cmds:{}});
  function normalizeWorld(value) {
    const source = record(value) ? value : {}, world = freshWorld();
    world.slots = Array.from({length:slots}, (_, index) => record(source.slots?.[index]) ? clone(source.slots[index]) : null);
    for (const key of ['codex','paid','djp','cmds']) if (record(source[key])) world[key] = clone(source[key]);
    if (Array.isArray(source.homes)) world.homes = clone(source.homes);
    if (record(source.atlas)) world.atlas = clone(source.atlas);
    if (Number.isInteger(source.wv)) world.wv = source.wv;
    for (const key of ['cur','main']) if (Number.isInteger(source[key]) && source[key]>=0 && source[key]<slots && world.slots[source[key]]) world[key] = source[key];
    return world;
  }
  function facade(account) {
    for (const key of shared) Object.defineProperty(account,key,{configurable:true,enumerable:false,
      get(){return this.worlds[this.world][key];},set(value){this.worlds[this.world][key]=value;}});
    return account;
  }
  function fresh() {return facade({v:version,rev:0,at:0,world:0,worlds:Array.from({length:count},freshWorld)});}
  function normalize(value) {
    if (!record(value) || ![6,7,8,version].includes(value.v)) return null;
    const account = fresh();
    for (const key of ['rev','at']) if (Number.isFinite(value[key]) && value[key]>=0) account[key]=value[key];
    if (value.v === version) {
      account.worlds = Array.from({length:count},(_,index)=>normalizeWorld(value.worlds?.[index]));
      if (Number.isInteger(value.world) && value.world>=0 && value.world<count) account.world=value.world;
    } else account.worlds[0]=normalizeWorld(value);
    return account;
  }
  function select(account,index) {
    if (!Number.isInteger(index) || index<0 || index>=count) return false;
    account.world=index;
    return true;
  }
  return {version,count,slots,fresh,normalize,select};
})();
if (typeof module !== 'undefined') module.exports = CharacterWorlds;
