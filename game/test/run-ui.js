const { spawnSync } = require('node:child_process');
const { ALL_SUITES, normalizeSuites, suitesFromEnvironment } = require('./ui-suites');
const args = process.argv.slice(2), requested = args.find(a => a.startsWith('--suites='));
if (requested && args.includes('--full')) throw Error('Choose --full or --suites, not both.');
if (requested || args.includes('--full')) delete process.env.BW_UI_SESSION_PROFILE;
const suites = args.includes('--full') ? ALL_SUITES : requested
  ? normalizeSuites(['canary', ...requested.slice(9).split(',')]) : suitesFromEnvironment();
const sceneArg=args.find(a=>a.startsWith('--scenes='));
const captureArg=args.find(a=>a.startsWith('--capture-profiles='));
const {SCENES,PROFILES}=require('./scope-policy');
for(const[arg,allowed,key]of [[sceneArg,SCENES,'BW_SCENES'],[captureArg,PROFILES,'BW_SCENE_PROFILES']])if(arg){const values=arg.split('=')[1].split(',');if(!values.length||values.some(v=>!allowed.includes(v)))throw Error('Invalid '+key);process.env[key]=JSON.stringify(values);}
const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test',
  ...args.filter(a => a !== '--full' && a !== requested && a!==sceneArg && a!==captureArg)], {
  stdio: 'inherit', env: { ...process.env, BW_UI_SUITES: JSON.stringify(suites) },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
