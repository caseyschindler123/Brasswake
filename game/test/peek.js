const init=require('../node_modules/sql.js/dist/sql-asm.js');const World=require('../src/world.js');
init().then(SQL=>{const db=World.build(SQL);const q=s=>{try{const r=db.exec(s)[0];console.log('\n'+s);if(!r){console.log('(none)');return}console.log(r.columns.join(' | '));r.values.slice(0,14).forEach(v=>console.log(v.join(' | ')));if(r.values.length>14)console.log('... '+r.values.length+' rows')}catch(e){console.log(s,'ERR',e.message)}};
for(const s of process.argv.slice(2))q(s);
console.log('bytes',db.export().length)});
