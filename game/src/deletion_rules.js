/* Two-stage deletion tickets are bound to the live account and exact target. */
const DeletionRules=(()=>{
  function begin(account,kind,index){
    if(!account||!Number.isInteger(account.world))return null;
    const world=account.worlds[account.world];
    if(!world||!['character','world'].includes(kind))return null;
    const target=kind==='world'?world:world.slots[index];
    if(!target)return null;
    return {account,world,target,uid:target.uid,worldIndex:account.world,index,kind,stage:1,
      phrase:kind==='world'?'DELETE WORLD '+(account.world+1):String(target.name||'New arrival')};
  }
  function valid(ticket,account){const live=ticket?.world?.slots?.[ticket.index];return !!ticket&&ticket.account===account&&account.world===ticket.worldIndex&&account.worlds[account.world]===ticket.world&&(ticket.kind==='world'||live===ticket.target||typeof ticket.uid==='string'&&ticket.uid.length>0&&live?.uid===ticket.uid);}
  function advance(ticket,account){if(!valid(ticket,account)||ticket.stage!==1)return null;return {...ticket,stage:2};}
  function commit(ticket,account,phrase,freshWorld){
    if(!valid(ticket,account)||ticket.stage!==2||String(phrase||'').trim()!==ticket.phrase)return false;
    ticket.stage=3;
    if(ticket.kind==='world')account.worlds[ticket.worldIndex]=freshWorld();
    else {const w=ticket.world;w.slots[ticket.index]=null;if(w.main===ticket.index)w.main=-1;if(w.cur===ticket.index)w.cur=-1;}
    return true;
  }
  return {begin,valid,advance,commit};
})();
if(typeof module!=='undefined')module.exports=DeletionRules;
