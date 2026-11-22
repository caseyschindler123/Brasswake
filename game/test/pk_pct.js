// one-off: rank the 169 starting hands by their chance against a random hand, and write each one's place (0 = best, 999 = worst) into poker.js
const fs = require('fs'); const P = require('../src/poker.js');
let s = 12345; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; P.seed(rnd);
const uni = new Float32Array(1326).fill(1), eq = new Array(169).fill(0), n = new Array(169).fill(0), rep = {};
for (let i = 0; i < 1326; i++) { const c = P.cls(P.CA[i], P.CB[i]); n[c]++; if (!rep[c]) rep[c] = [P.CA[i], P.CB[i]]; }
for (const c in rep) eq[c] = P.equity(rep[c], [], uni, 60000);
const ord = Object.keys(rep).map(Number).sort((a, b) => eq[b] - eq[a]); const pct = new Array(169).fill(0); let cum = 0;
for (const c of ord) { pct[c] = Math.round(1000 * cum / 1326); cum += n[c]; }
const src = fs.readFileSync(__dirname + '/../src/poker.js', 'utf8').replace(/\/\*PCT\*\/\[[^\]]*\]\/\*PCT\*\//, '/*PCT*/[' + pct.join(',') + ']/*PCT*/');
fs.writeFileSync(__dirname + '/../src/poker.js', src);
const nm = c => { const hi = Math.floor(c / 13), lo = c % 13, R = '23456789TJQKA'; return hi === lo ? R[hi] + R[hi] : hi > lo ? R[hi] + R[lo] + 's' : R[lo] + R[hi] + 'o'; };
console.log('best', ord.slice(0, 12).map(c => nm(c) + ' ' + eq[c].toFixed(3)).join(', ')); console.log('worst', ord.slice(-6).map(c => nm(c) + ' ' + eq[c].toFixed(3)).join(', '));
