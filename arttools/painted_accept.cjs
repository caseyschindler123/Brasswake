/* Accept new-only reviewed character files; never refresh an older art entry. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),file=path.join(__dirname,'packed_manifest.json'),prior=JSON.parse(fs.readFileSync(file)),byPath=new Map(prior.map(f=>[f.path,f]));
for(const f of prior){const bytes=fs.readFileSync(path.join(root,'game',f.path));if(bytes.length!==f.size||hash(bytes)!==f.sha256)throw Error('Existing art differs: '+f.path);}
const added=['sprites','heads'].flatMap(kind=>JSON.parse(fs.readFileSync(path.join(__dirname,'painted_'+kind+'_manifest.json'))).files);
const license=fs.readFileSync(path.join(root,'game/art/painted/LICENSE.txt'));added.push({path:'art/painted/LICENSE.txt',size:license.length,sha256:hash(license)});
let count=0;for(const f of added){const old=byPath.get(f.path);if(old){if(old.sha256!==f.sha256||old.size!==f.size)throw Error('Previously accepted painted art differs: '+f.path);}else{prior.push(f);count++;}}
fs.writeFileSync(file,JSON.stringify(prior.sort((a,b)=>a.path.localeCompare(b.path)),null,2)+'\n');console.log('Accepted '+count+' new files; every prior entry unchanged');
