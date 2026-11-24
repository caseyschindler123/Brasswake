/* One symbol catalogue for street signs and remembered map businesses. */
const ServicePlaces=(()=>{
  const types={
    shop:{name:'Provisioner',path:'M5 8h14l-1 13H6L5 8zm3 0V5a4 4 0 018 0v3'},
    bank:{name:'Bank',path:'M3 8l9-5 9 5H3zm2 3v7m7-7v7m7-7v7M3 21h18M3 18h18'},
    tavern:{name:'Tavern',path:'M5 5h11v15H5V5zm11 3h3a3 3 0 010 6h-3M5 3h11M9 8v9m4-9v9'},
    work:{name:'Workshop',path:'M3 9h18l-5 5H9l-2 4h11v3H4v-3l3-5-4-4zm7-6h9v6h-9V3z'},
    healer:{name:'Healer',path:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z'},
    casino:{name:'Card room',path:'M5 3h14v18H5V3zm7 4l4 5-4 5-4-5 4-5z'},
    guild:{name:'Guildhall',path:'M5 3h14v9c0 5-7 9-7 9s-7-4-7-9V3zm3 6h8m-4-4v11'},
    cartographer:{name:'Map room',path:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7zm0 6v8m-4-4h8'},
    dojo:{name:'Dojo',path:'M5 3l14 18m0-18L5 21M3 15l6 5m6 0l6-5'},
    civic:{name:'Civic hall',path:'M5 3h14v18H5V3zm3 5h8m-8 4h8m-8 4h5'},
  };
  function typeFor(b){return b.cartographer?'cartographer':b.hall?'dojo':types[b.slot]?b.slot:null;}
  function html(type){const def=types[type];return def?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${def.path}"/></svg>`:'';}
  function paint(g,type,x,y,size){const def=types[type];if(!def)return;g.save();g.translate(x,y);g.scale(size/24,size/24);g.lineWidth=1.8;g.lineJoin='round';g.lineCap='round';g.stroke(new Path2D(def.path));g.restore();}
  return {types,typeFor,html,paint};
})();
if(typeof module!=='undefined')module.exports=ServicePlaces;
