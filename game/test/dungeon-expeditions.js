const { spawnSync } = require('node:child_process');
const { constants } = require('node:os');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const game = path.resolve(__dirname, '..');
const work = path.resolve(game, '../work');

function freePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const { port } = socket.address();
      socket.close(error => error ? reject(error) : resolve(String(port)));
    });
  });
}

function runNode(args, env) {
  const child = spawnSync(process.execPath, args, { cwd: game, env, stdio: 'inherit' });
  if (child.error) throw child.error;
  return child.status ?? (128 + (constants.signals[child.signal] || 0));
}

async function main(args) {
  const workers = Number(process.env.BW_UI_WORKERS ?? 8);
  if (!Number.isSafeInteger(workers) || workers < 1) throw new Error('BW_UI_WORKERS must be a positive integer');
  const playwright = require.resolve('@playwright/test/cli');
  fs.mkdirSync(work, { recursive: true });
  const snapshot = fs.mkdtempSync(path.join(work, 'dungeon-expedition-'));
  const buildEnv = { ...process.env, BW_DIST: snapshot };
  delete buildEnv.BW_ART_JS;
  const buildStatus = runNode(['build.js'], buildEnv);
  if (buildStatus) return buildStatus;

  const { commit, htmlSha256 } = JSON.parse(fs.readFileSync(path.join(snapshot, 'release.json'), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(commit) || !/^[a-f0-9]{64}$/.test(htmlSha256)) throw new Error('Invalid expedition release metadata');
  const port = await freePort();
  const candidate = { snapshot, commit, htmlSha256 };
  fs.writeFileSync(path.join(work, 'dungeon-expedition-candidate.json'), JSON.stringify(candidate, null, 2) + '\n');

  return runNode([playwright, 'test', '--config', 'test/dungeon-expeditions.config.js', '--grep', 'dungeon expedition', ...args], {
    ...process.env,
    BW_LIVE: '0',
    BW_DUNGEON_EXPEDITIONS: '1',
    BW_EXPEDITION_DIST: snapshot,
    BW_EXPEDITION_PORT: port,
    BW_UI_WORKERS: String(workers)
  });
}

main(process.argv.slice(2)).then(status => { process.exitCode = status; }, error => {
  console.error('Dungeon expeditions failed:', error.message);
  process.exitCode = 1;
});
