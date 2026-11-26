/* Concealment is an expedition action, never a saved immunity flag. */
const Sneaking = (() => {
  const create = () => ({hidden:false,steps:0,max:0,trained:false,x:null,y:null,sx:null,sy:null,target:null});
  const budget = skill => 3+Math.floor(Math.max(0,Math.min(120,skill))/8);
  const chance = (hiding,diff,quality,heavy=false,bonus=0) => Math.max(0,Math.min(95,35+hiding*.7-diff*.25-(heavy?20:0)+(Number.isFinite(bonus)?bonus:0)))*Math.max(0,Math.min(1,quality));
  function conceal(state,options) {
    const ok=(options.random||Math.random)()*100<chance(options.hiding,options.diff,options.quality,options.heavy,options.bonus);
    Object.assign(state,create()); if(ok)Object.assign(state,{hidden:true,steps:budget(options.stealth),max:budget(options.stealth),x:options.x,y:options.y,sx:options.x,sy:options.y});return ok;
  }
  function reveal(state) {const was=state.hidden;Object.assign(state,create());return was;}
  function move(state,x,y,run=false,meteredDistance=null) {
    if(!state.hidden)return {hidden:false,train:false};
    if(state.x==null){state.x=x;state.y=y;return {hidden:true,train:false};}
    const displacement=Math.max(Math.abs(x-state.x),Math.abs(y-state.y));state.x=x;state.y=y;
    const distance=Number.isFinite(meteredDistance)?Math.max(0,meteredDistance):displacement;
    if(run||displacement>2){reveal(state);return {hidden:false,train:false};}
    if(!distance)return {hidden:true,train:false};
    if(distance>2||distance>state.steps){reveal(state);return {hidden:false,train:false};}
    state.steps-=distance;return {hidden:true,train:false};
  }
  function approach(state,target,distance) {if(!state.hidden||state.trained||state.steps===state.max||!Number.isFinite(distance)||distance>2||!target||!Number.isFinite(target.x)||!Number.isFinite(target.y)||Math.hypot(target.x-state.sx,target.y-state.sy)<=distance+.5)return false;state.trained=true;state.target=target.id;return true;}
  const detection = (state,stealth,distance,facing,aggressive) => !state.hidden ? (distance<3.2&&facing)||(aggressive&&distance<6.5) : distance<(facing?Math.max(.65,1.7-Math.min(120,stealth)/120):Math.max(.45,.85-Math.min(120,stealth)/300));
  return {create,budget,chance,conceal,reveal,move,approach,detection};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Sneaking;
