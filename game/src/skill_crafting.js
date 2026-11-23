/* Optional professional work uses existing materials and never gates the story. */
const SkillCrafting = (() => {
  const recipes = [
    {id:'chest',skill:'carpentry',name:'Storage chest',mats:6,diff:25,ic:'sunkchest',note:'Install at home for ten more storage spaces.'},
    {id:'bed',skill:'carpentry',name:'Feather bed',mats:12,diff:45,ic:'bed',note:'Install at home. Rest gives +25% skill gain for an hour.'},
    {id:'shelf',skill:'carpentry',name:'Study shelf',mats:8,diff:35,ic:'scroll',note:'Install at home. Study gives double skill gain for ten minutes.'},
    {id:'spellscroll',skill:'inscription',name:'Prepared spell scroll',mats:3,diff:30,ic:'scroll_spell',note:'One free casting of an owned spell; also usable as a ward.'}
  ];
  const find = id => recipes.find(r=>r.id===id);
  function can(s,id,tier) {const r=find(id);return !!r&&Number.isInteger(tier)&&tier>=1&&tier<=8&&(s.mats[tier]||0)>=r.mats;}
  function finish(s,id,tier,success) {const r=find(id);if(!can(s,id,tier))return false;s.mats[tier]-=success?r.mats:Math.ceil(r.mats/2);if(success){if(id==='spellscroll')s.prepared=(s.prepared||0)+1;else(s.furniture||(s.furniture={}))[id]=(s.furniture[id]||0)+1;}return true;}
  function install(s,home,id) {if(!home||!['chest','bed','shelf'].includes(id)||!(s.furniture?.[id]>0))return false;if(id==='chest'&&(home.xch||0)>=5||id==='bed'&&home.fbed||id==='shelf'&&home.shelf)return false;s.furniture[id]--;if(id==='chest')home.xch=(home.xch||0)+1;else home[id==='bed'?'fbed':id]=1;return true;}
  const lockDifficulty = (region,floor=0) => Math.min(95,12+(region-1)*10+floor*2);
  const lockChance = (skill,diff,quality,disarm=false) => Math.round(Math.max(10,Math.min(95,50+(skill-diff)*2+(disarm?15:0)))*Math.max(0,Math.min(1,quality)));
  return {recipes,find,can,finish,install,lockDifficulty,lockChance};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SkillCrafting;
