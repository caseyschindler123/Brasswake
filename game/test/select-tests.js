const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

function runtimePackages(lock) {
  return Object.fromEntries(Object.entries(lock.packages || {}).filter(([name, item]) => name && !item.dev)
    .sort(([a], [b]) => a.localeCompare(b)).map(([name, item]) => [name, {
      version: item.version, integrity: item.integrity, resolved: item.resolved, dependencies: item.dependencies,
    }]));
}

function chooseUI({ files, runtimeChanged = false, buildChanged = false, baselineAvailable = true }) {
  if (!baselineAvailable) return { ui: true, reason: 'No reliable comparison commit; verify the game conservatively.' };
  if (files.some(file => /^game\/(src|art)\//.test(file)))
    return { ui: true, reason: 'Game source or player assets changed.' };
  if (runtimeChanged) return { ui: true, reason: 'Runtime dependencies changed.' };
  if (buildChanged) return { ui: true, reason: 'Build changes alter the shipped HTML, or equivalence could not be established.' };
  return { ui: false, reason: 'No game source, player asset, runtime dependency, or built HTML change; validate tooling without UI testing.' };
}

function baselineHTML(base) {
  const directory = fs.mkdtempSync(path.join(root, 'work', 'verification-baseline-'));
  const files = git('ls-tree', '-r', '--name-only', base, '--', 'game/src', 'game/build.js').split('\n').filter(Boolean);
  for (const file of files) {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, execFileSync('git', ['show', base + ':' + file], { cwd: root }));
  }
  const env = { ...process.env, BW_DIST: path.join(directory, 'dist') };
  delete env.BW_ART_JS;
  const result = spawnSync(process.execPath, ['build.js'], { cwd: path.join(directory, 'game'), env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Baseline build failed: ' + result.stderr);
  return fs.readFileSync(path.join(directory, 'dist/index.html'));
}

function selection() {
  let base = process.env.BW_DIFF_BASE;
  if (!base && process.env.CI) return chooseUI({ files: [], baselineAvailable: false });
  try {
    base ||= git('rev-parse', '--verify', 'origin/main');
    if (!/^[a-f0-9]{40}$/.test(base) || /^0+$/.test(base)) throw new Error('Missing comparison SHA');
    git('cat-file', '-e', base + '^{commit}');
    const files = [...new Set([
      ...git('diff', '--name-only', base, '--').split('\n'),
      ...git('ls-files', '--others', '--exclude-standard').split('\n'),
    ].filter(Boolean))];
    const previous = JSON.parse(git('show', base + ':game/package.json'));
    const current = JSON.parse(fs.readFileSync(path.join(root, 'game/package.json'), 'utf8'));
    const previousLock = JSON.parse(git('show', base + ':game/package-lock.json'));
    const currentLock = JSON.parse(fs.readFileSync(path.join(root, 'game/package-lock.json'), 'utf8'));
    const runtimeChanged = JSON.stringify(previous.dependencies || {}) !== JSON.stringify(current.dependencies || {}) ||
      JSON.stringify(runtimePackages(previousLock)) !== JSON.stringify(runtimePackages(currentLock));
    let buildChanged = false;
    if (files.includes('game/build.js')) {
      try {
        fs.mkdirSync(path.join(root, 'work'), { recursive: true });
        buildChanged = !baselineHTML(base).equals(fs.readFileSync(path.join(root, 'game/dist/index.html')));
      } catch (error) {
        console.warn('Could not establish build equivalence:', error.message);
        buildChanged = true;
      }
    }
    return { ...chooseUI({ files, runtimeChanged, buildChanged }), base, files };
  } catch (error) {
    return { ...chooseUI({ files: [], baselineAvailable: false }), detail: error.message };
  }
}

if (require.main === module) console.log(JSON.stringify(selection(), null, 2));
module.exports = { chooseUI, selection, runtimePackages };
