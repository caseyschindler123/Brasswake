/* Check committed packed art without Python, a raw-art folder, or a rebuild. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.resolve(__dirname, '..'), art = path.join(root, 'game', 'art');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'packed_manifest.json'), 'utf8'));
const expected = new Map(manifest.map(file => [file.path.slice(4), file]));
const actual = new Map();
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.isFile()) actual.set(path.relative(art, file).split(path.sep).join('/'), file);
    else throw new Error('Packed art must contain regular files: ' + file);
  }
}
visit(art);
const missing = [...expected.keys()].filter(name => !actual.has(name));
const extra = [...actual.keys()].filter(name => !expected.has(name));
const different = [...actual].filter(([name, file]) => {
  const baseline = expected.get(name);
  return baseline && (fs.statSync(file).size !== baseline.size ||
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== baseline.sha256);
}).map(([name]) => name);
if (missing.length || extra.length || different.length) {
  console.error(JSON.stringify({ missing, extra, different }, null, 2));
  process.exitCode = 1;
} else console.log('Packed art baseline: ' + expected.size + ' files match');
