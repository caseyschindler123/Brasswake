/* ===== DEEP: the lost tables of the Ledger and the Great Truths asked of them =====
   One table comes with Ilva's letter; each dungeon's vault keeper guards one more. The data is the same for every player
   (a fixed seed) except one row: the stranger the Marigold pulled out of the sea this summer, who is the player. */
const Deep = (() => {
  const FOUND_ON = '2026-06-14';
  const daysAfter = (date, days) => {
    const day = new Date(date + 'T12:00:00Z');
    day.setUTCDate(day.getUTCDate() + days);
    return day.toISOString().slice(0, 10);
  };
  const RETURN_ON = daysAfter(FOUND_ON, 40);
  const TOWNS = [[1, 'Tallyport', 1, 1204, 'Brass Sea'], [2, 'Brackwater', 2, 1311, 'Reed Gulf'], [3, 'Haverly', 3, 1150, null], [4, 'Four Fords', 4, 1388, null], [5, 'Cinderwick', 5, 1262, null], [6, 'Kell', 6, 1440, null],
    [7, 'Highwatch', 7, 1097, 'Grey Sound'], [8, 'Aldermoot', 8, 1003, null], [9, 'Old Brass', null, 1040, 'Brass Sea'], [10, 'Saltmere', null, 1120, 'Brass Sea'], [11, 'Hollin', null, 1233, 'Reed Gulf'], [12, 'Varrow', null, 1180, 'Grey Sound']];
  const SEA = { 1: 'Brass Sea', 2: 'Reed Gulf', 7: 'Grey Sound', 9: 'Brass Sea', 10: 'Brass Sea', 11: 'Reed Gulf', 12: 'Grey Sound' }, PORTS = [1, 2, 7, 9, 10, 11, 12];
  // the tables in the order they are found: 0 with Ilva's letter, 1-8 from the vaults under each region
  const TABLES = [
    { name: 'towns', cols: ['town_id', 'name', 'region', 'founded', 'sea'], note: 'Towns recorded in the archive, including ports that no longer exist.' },
    { name: 'ships', cols: ['ship_id', 'name', 'home_town', 'built', 'tons'], note: 'Each registered ship, its home port, and the year it was built. Some ships share a name.' },
    { name: 'voyages', cols: ['voyage_id', 'ship_id', 'from_town', 'to_town', 'sailed', 'days'], note: 'Surviving records of crossings. When a ship never arrived, the days column is NULL.' },
    { name: 'people', cols: ['person_id', 'name', 'town_id', 'born', 'died', 'trade'], note: 'Names and occupations from the town rolls, with years of birth and death where recorded.' },
    { name: 'crew', cols: ['voyage_id', 'person_id', 'role'], note: 'The crew listed on each voyage, including the captain.' },
    { name: 'storms', cols: ['storm_id', 'sea', 'began', 'days', 'strength'], note: 'Storms recorded at sea. Strength is on a scale from 1 to 12.' },
    { name: 'strangers', cols: ['stranger_id', 'name', 'found_on', 'found_by', 'town_id'], note: 'People pulled from the sea who came from places the rescue crews could find on no chart.' },
    { name: 'lights', cols: ['light_id', 'sea', 'seen_on', 'hours', 'seen_by'], note: 'Reports of lights at sea, with the witness and the hours each light was visible.' },
    { name: 'erasures', cols: ['erasure_id', 'table_name', 'row_id', 'erased_on', 'erased_by', 'old_name', 'old_date'], note: 'An independent log of removals. It keeps the original name and date even when the row is hidden from its table.' }];
  const KEYS = { towns: 'town_id', ships: 'ship_id', voyages: 'voyage_id', people: 'person_id', strangers: 'stranger_id', storms: 'storm_id', lights: 'light_id', erasures: 'erasure_id' };
  // how the tables join, for the schema scroll: [table, column, table it points to]
  const LINKS = [['ships', 'home_town', 'towns'], ['voyages', 'ship_id', 'ships'], ['voyages', 'from_town', 'towns'], ['voyages', 'to_town', 'towns'], ['people', 'town_id', 'towns'], ['crew', 'voyage_id', 'voyages'], ['crew', 'person_id', 'people'],
    ['strangers', 'found_by', 'ships'], ['strangers', 'town_id', 'towns'], ['lights', 'seen_by', 'people'], ['erasures', 'erased_by', 'people'], ['storms', 'sea', 'towns'], ['lights', 'sea', 'storms']];

  let cache = null;
  function data(you) {
    if (cache && cache.you === you) return cache.rows;
    let x = 20260614; const R = () => { x = (Math.imul(x ^ (x >>> 15), 2246822507) + 0x9e3779b9) >>> 0; x ^= x >>> 13; return (x >>> 0) / 4294967296; };
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1)), pk = a => a[Math.floor(R() * a.length)];
    const D = (y, m, d) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const rows = {}; rows.towns = TOWNS.map(t => t.slice());
    // ships: three named Marigold, centuries apart, all out of Tallyport
    const A1 = ['Gull', 'Tern', 'Brass', 'Copper', 'Salt', 'Grey', 'Swift', 'Patient', 'Lucky', 'Stubborn', 'Red', 'Long', 'Quiet', 'Iron', 'Silver', 'Northern'], A2 = ['Wren', 'Heron', 'Ledger', 'Anchor', 'Tally', 'Margin', 'Reckoning', 'Lantern', 'Oar', 'Daughter', 'Widow', 'Promise', 'Hope', 'Bell', 'Tide', 'Crown'];
    rows.ships = []; const used = new Set();
    for (let i = 1; i <= 140; i++) { let nm; do nm = (R() < .5 ? 'The ' : '') + pk(A1) + ' ' + pk(A2); while (used.has(nm)); used.add(nm); const home = R() < .3 ? 1 : pk(PORTS); rows.ships.push([i, nm, home, ri(Math.max(1080, TOWNS[home - 1][3]), 2012), ri(40, 420)]); }
    const historicalShips = [
      [17, 'Marigold', 1, 1218, 120], [61, 'Marigold', 1, 1594, 160], [119, 'Marigold', 1, 1958, 180],
      [44, 'Tern Margin', 10, 1289, 223], [88, 'The Lucky Crown', 1, 1370, 233], [102, 'The Gull Tide', 1, 1728, 232],
      [37, 'The Swift Anchor', 1, 1839, 145], [45, 'The Red Oar', 1, 1664, 98]
    ];
    for (const ship of historicalShips) rows.ships[ship[0] - 1] = ship;
    const historicalIds = new Set(historicalShips.map(ship => ship[0]));
    // people across nine centuries, plus the ones the story needs
    const F = ['Ada', 'Bram', 'Cass', 'Dun', 'Edda', 'Finn', 'Greta', 'Hal', 'Isa', 'Jory', 'Kett', 'Lise', 'Mott', 'Nell', 'Orrin', 'Pell', 'Quin', 'Rhea', 'Sten', 'Tamsin', 'Ulla', 'Vane', 'Wenna', 'Yorick'],
      L = ['Brine', 'Hale', 'Tull', 'Marsh', 'Coyle', 'Penn', 'Rook', 'Sallow', 'Thatch', 'Ware', 'Ash', 'Fenn', 'Crane', 'Holt', 'Lund', 'Reeve', 'Okoro', 'Sable', 'Tallow', 'Vance'],
      TR = ['sailor', 'sailor', 'sailor', 'fisher', 'clerk', 'smith', 'farmer', 'carter', 'scholar', 'shipwright', 'merchant', 'weaver'];
    rows.people = [];
    for (let i = 1; i <= 980; i++) { const born = ri(1060, 2004), age = ri(18, 88), died = born + age > 2025 ? null : born + age; rows.people.push([i, pk(F) + ' ' + pk(L), pk([1, 1, 1, 2, 2, 7, 9, 10, 11, 12, 3, 4, 5, 6, 8]), born, died, pk(TR)]); }
    rows.people[409] = [410, 'Merrow Fane', 10, 1101, 1207, 'shipwright'];   // the longest life on record: 106 years
    rows.people[210] = [211, 'Jory Penn', 1, 1580, 1645, 'shipwright'];
    rows.people[732] = [733, 'Sten Ash', 1, 1880, 1952, 'pilot'];
    const P = (name, town, born, died, trade) => { const id = rows.people.length + 1; rows.people.push([id, name, town, born, died, trade]); return id; };
    const ILVA = P('Ilva Thorne', 1, 1962, null, 'scholar'), CORIN = P('Corin Hale', 1, 2001, 2026, 'champion'), ODALYS = P('Odalys Brine', 1, 1951, null, 'scholar'), BRAM = P('Bram Tull', 1, 1969, null, 'captain'), OLDTULL = P('Wenna Tull', 1, 1931, 2011, 'captain');
    const TAMSIN = P('Tamsin', 1, 2000, null, 'deckhand');
    const ERASERS = [P('Sabina Vale', 8, 1575, 1642, 'council clerk'), P('Jonas Rusk', 8, 1656, 1723, 'councillor'), P('Elsie Burr', 8, 1866, 1936, 'council clerk')];
    const alive = y => rows.people.filter(p => p[3] + 16 <= y && (p[4] == null || p[4] >= y));
    // Dates and witnesses for the rescue pattern are authored. The current ship has the two Tulls, a generation apart.
    const rescues = [
      ['Aldric of the Marsh', '1247-03-09', 17], ['Senna Vey', '1301-10-02', 44], ['Tomas Querrel', '1422-06-21', 88],
      ['Hild Ostrander', '1609-01-30', 61], ['Pirro Galt', '1640-08-14', 61], ['Maud Ellery', '1755-11-03', 102],
      ['Cole Wainwright', '1866-04-17', 37], ['Ilva Thorne', '1986-03-02', 119, OLDTULL], [you || 'The stranger', FOUND_ON, 119, BRAM]
    ];
    rows.voyages = []; rows.crew = [];
    for (let i = 1; i <= 1500; i++) {
      let s; do s = pk(rows.ships); while (historicalIds.has(s[0])); const f = R() < .35 ? 1 : pk(PORTS); let t; do t = R() < .3 && f !== 2 ? 2 : pk(PORTS); while (t === f);
      const firstYear = Math.max(s[3], TOWNS[f - 1][3], TOWNS[t - 1][3]);
      const lastYear = Math.min(2025, s[3] + 70);
      if (firstYear > lastYear) continue;
      const y = ri(firstYear, lastYear), sailed = D(y, ri(1, 12), ri(1, 28)), lost = R() < .022;
      rows.voyages.push([i, s[0], f, t, sailed, lost ? null : ri(2, 19)]);
      const al = alive(y); if (al.length < 4) continue; const cap = pk(al); rows.crew.push([i, cap[0], 'captain']); const n = ri(1, 3), seen = new Set([cap[0]]); for (let k = 0; k < n; k++) { const h = pk(al); if (seen.has(h[0])) continue; seen.add(h[0]); rows.crew.push([i, h[0], 'hand']); }
    }
    const restoredVoyage = [1510, 45, 1, 2, '1688-04-04', 9];
    rows.voyages.push(restoredVoyage);
    rows.crew.push([1510, pk(alive(1688))[0], 'captain']);
    rescues.forEach(([, found, ship, captain], i) => {
      const voyage = 1501 + i;
      const port = ship === 119 ? 2 : 10;
      rows.voyages.push([voyage, ship, port, 1, daysAfter(found, -4), found === FOUND_ON ? 7 : 5]);
      rows.crew.push([voyage, captain || pk(alive(+found.slice(0, 4)))[0], 'captain']);
      if (found === FOUND_ON) rows.crew.push([voyage, TAMSIN, 'deckhand']);
    });
    rows.voyages.sort((a, b) => a[4].localeCompare(b[4]) || a[0] - b[0]);
    const nextSailing = new Map(), remap = new Map();
    rows.voyages = rows.voyages.filter(v => {
      if (v[4] < (nextSailing.get(v[1]) || '')) return false;
      nextSailing.set(v[1], v[5] === null ? '9999-12-31' : daysAfter(v[4], v[5]));
      remap.set(v[0], remap.size + 1);
      v[0] = remap.size;
      return true;
    });
    rows.crew = rows.crew.filter(c => remap.has(c[0])).map(c => [remap.get(c[0]), c[1], c[2]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    // strangers: found the morning after a strength-12 storm on the Brass Sea, and a light stands on the water forty days later
    rows.strangers = rescues.map(([name, found, ship], k) => [k + 1, name, found, ship, 1]).filter(s => s[0] !== 8);   // Ilva's row was taken out
    rows.storms = []; const SEAS = ['Brass Sea', 'Reed Gulf', 'Grey Sound'];
    for (let i = 0; i < 300; i++) rows.storms.push([0, pk(SEAS), D(ri(1090, 2025), ri(1, 12), ri(1, 28)), ri(1, 5), Math.min(11, ri(1, 8) + (R() < .3 ? ri(1, 4) : 0))]);
    for (let m = 0; m < 120; m++) rows.storms.push([0, pk(SEAS), D(ri(1090, 2025), pk([10, 11, 12, 1]), ri(1, 28)), ri(1, 4), ri(6, 11)]);   // the stormy months are October to January
    rescues.forEach(s => rows.storms.push([0, 'Brass Sea', daysAfter(s[1], -2), 2, 12]));
    rows.voyages.filter(v => v[5] == null).forEach((v, k) => { if (k % 3 !== 1) rows.storms.push([0, SEA[v[2]], daysAfter(v[4], -ri(0, 2)), ri(3, 5), ri(8, 11)]); });   // some losses left port during a storm
    // The rescue questions refer to one recorded Brass Sea storm per start date.
    const rescueStorms = new Set(rescues.map(s => daysAfter(s[1], -2)));
    rows.storms = rows.storms.filter(s => s[1] !== 'Brass Sea' || s[4] === 12 || !rescueStorms.has(s[2]));
    rows.storms.sort((a, b) => a[2] < b[2] ? -1 : 1); rows.storms.forEach((s, k) => { s[0] = k + 1; });
    rows.lights = []; const seer = y => { const a = alive(y).filter(p => p[2] === 1 || p[2] === 10 || p[2] === 9); return (a.length ? pk(a) : pk(alive(y)))[0]; };
    rescues.forEach(([, found, , captain]) => {
      const before = daysAfter(found, -1), after = daysAfter(found, 40);
      rows.lights.push([0, 'Brass Sea', before, ri(1, 3), captain || seer(+before.slice(0, 4))]);
      rows.lights.push([0, 'Brass Sea', after, ri(2, 5), found === '1986-03-02' ? ILVA : captain || seer(+after.slice(0, 4))]);
    });
    for (let i = 0; i < 46; i++) { const y = ri(1090, 2025); rows.lights.push([0, pk(['Reed Gulf', 'Grey Sound']), D(y, ri(1, 12), ri(1, 28)), ri(1, 4), seer(y)]); }
    rows.lights.sort((a, b) => a[2] < b[2] ? -1 : 1); rows.lights.forEach((l, k) => { l[0] = k + 1; });
    rows.erasures = [[1, 'people', 211, '1622-05-01', ERASERS[0], 'Jory Penn', '1580-01-01'], [2, 'voyages', restoredVoyage[0], '1702-09-12', ERASERS[1], null, restoredVoyage[4]], [3, 'strangers', 8, '1986-04-10', ILVA, 'Ilva Thorne', '1986-03-02'], [4, 'people', 733, '1911-02-02', ERASERS[2], 'Sten Ash', '1880-01-01']];
    cache = { you, rows, ids: { ILVA, CORIN, ODALYS, BRAM, OLDTULL, TAMSIN } }; return rows;
  }
  const q = v => v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'";
  function script(have, you) {
    const R = data(you); let s = '';
    TABLES.forEach((t, i) => { if (!have[i]) return; s += `CREATE TABLE ${t.name} (${t.cols.map(c => c + (c === KEYS[t.name] ? ' INTEGER PRIMARY KEY' : '')).join(', ')});\n`; const rs = R[t.name]; for (let k = 0; k < rs.length; k += 200) s += `INSERT INTO ${t.name} VALUES ${rs.slice(k, k + 200).map(r => '(' + r.map(q).join(',') + ')').join(',')};\n`; });
    return s;
  }
  // [id, title, where it is found, tables needed (by index), the question, the answer query, emblem 1-12, ability]
  const TRUTHS = [
    ['t1', 'The home ports', 'letter', [0, 1], 'Which town is home to the most ships in the register? Give the town name and the number of ships.', 'SELECT t.name, COUNT(*) AS ships FROM ships s JOIN towns t ON t.town_id = s.home_town GROUP BY t.town_id ORDER BY ships DESC LIMIT 1', 4, 'gold'],
    ['t2', 'The busiest crossing', 'page2', [0, 2], 'Which crossing has been sailed most often? Give the town it left from, the town it went to, and how many voyages.', 'SELECT a.name AS from_town, b.name AS to_town, COUNT(*) AS voyages FROM voyages v JOIN towns a ON a.town_id = v.from_town JOIN towns b ON b.town_id = v.to_town GROUP BY v.from_town, v.to_town ORDER BY voyages DESC LIMIT 1', 1, 'luck'],
    ['t3', 'The longest life', 'page3', [3], 'Of everyone whose death is written down, who lived longest? Give the name and the years.', 'SELECT name, died - born AS years FROM people WHERE died IS NOT NULL ORDER BY years DESC LIMIT 1', 11, 'xp'],
    ['t4', 'Ships that never arrived', 'page4', [1, 2], 'Which ships sailed and never arrived? List each ship name and the day it sailed, earliest first.', 'SELECT s.name, v.sailed FROM voyages v JOIN ships s ON s.ship_id = v.ship_id WHERE v.days IS NULL ORDER BY v.sailed', 10, 'learn'],
    ['t5', 'A record of safe crossings', 'page5', [2, 3, 4], 'Which captain has the most recorded voyages without any failing to arrive? Give the name and the number of voyages. Break a tie by name, A to Z.', "SELECT p.name, COUNT(*) AS voyages FROM crew c JOIN people p ON p.person_id = c.person_id JOIN voyages v ON v.voyage_id = c.voyage_id WHERE c.role = 'captain' GROUP BY c.person_id HAVING SUM(v.days IS NULL) = 0 ORDER BY voyages DESC, p.name LIMIT 1", 5, 'def'],
    ['t6', 'Storm season', 'page6', [5], 'In which month of the year do the most storms of strength 9 or more begin? Give the month as two digits and the number of storms.', "SELECT strftime('%m', began) AS month, COUNT(*) AS storms FROM storms WHERE strength >= 9 GROUP BY month ORDER BY storms DESC LIMIT 1", 6, 'mend'],
    ['t7', 'Departures in storm weather', 'lair', [0, 2, 5], 'Count the voyages that never arrived and left port during a storm on the port’s sea. Count from the storm’s start date through its start date plus its duration in days. Give each sea with any matches and the count, highest first.', "SELECT t.sea, COUNT(*) AS lost FROM voyages v JOIN towns t ON t.town_id = v.from_town WHERE v.days IS NULL AND EXISTS (SELECT 1 FROM storms s WHERE s.sea = t.sea AND v.sailed BETWEEN s.began AND date(s.began, '+' || s.days || ' days')) GROUP BY t.sea ORDER BY lost DESC", 3, 'run'],
    ['t8', 'The Marigolds', 'lair', [1, 6], 'Which ship name appears on the most stranger rescues? Count all ships with the same name together. Give the name and the number of rescues.', 'SELECT s.name, COUNT(*) AS found FROM strangers g JOIN ships s ON s.ship_id = g.found_by GROUP BY s.name ORDER BY found DESC LIMIT 1', 2, 'eye'],
    ['t9', 'The storms before the rescues', 'page7', [5, 6], 'For each stranger in the table, how strong was the Brass Sea storm that began two days before they were found? Give the name and the strength, earliest rescue first.', "SELECT g.name, s.strength FROM strangers g JOIN storms s ON s.sea = 'Brass Sea' AND s.began = date(g.found_on, '-2 days') ORDER BY g.found_on", 8, 'flee'],
    ['t10', 'Forty days', 'lair', [6, 7], 'For each stranger, how many days after they were found was the next light seen on the Brass Sea? Give the name and the days, oldest first.', "SELECT g.name, CAST(julianday(MIN(l.seen_on)) - julianday(g.found_on) AS INTEGER) AS days FROM strangers g JOIN lights l ON l.sea = 'Brass Sea' AND l.seen_on > g.found_on GROUP BY g.stranger_id ORDER BY g.found_on", 9, 'body'],
    ['t11', 'The missing row', 'page8', [3, 8], 'Someone took a stranger out of the Ledger. Give the name of the person who erased the row, the table, and the name that was erased.', "SELECT p.name AS erased_by, e.table_name, e.old_name FROM erasures e JOIN people p ON p.person_id = e.erased_by WHERE e.table_name = 'strangers'", 7, 'hint'],
    ['t12', 'The way home', 'archive', [6, 7, 8], 'Put the stranger from the erasure log back into the list for this query. For every stranger, find the first night a light was seen on the Brass Sea after they were rescued. Give the name and the date of the light, earliest rescue first.', "SELECT x.name, MIN(l.seen_on) AS door FROM (SELECT name, found_on FROM strangers UNION ALL SELECT old_name, old_date FROM erasures WHERE table_name = 'strangers') x JOIN lights l ON l.sea = 'Brass Sea' AND l.seen_on > x.found_on GROUP BY x.name, x.found_on ORDER BY x.found_on", 12, 'home']].map(t => ({ id: t[0], title: t[1], from: t[2], needs: t[3], ask: t[4], sql: t[5], em: t[6], gift: t[7] }));
  const INTERPRETATIONS = {
    t1: 'Tallyport is home to more ships than any other town in this register. Ilva left a note beside her answer. “I’ll start with the captains here. Someone may remember a rescue like mine.”',
    t2: 'Tallyport to Brackwater is the most common route in the records. Ilva marked it to check whether the same crew worked both ports.',
    t3: 'Merrow Fane lived 106 years. He worked as a shipwright in Saltmere. Ilva wanted to check a remark in an old account about someone who had lived past a hundred.',
    t4: 'These are ships with a departure and no recorded arrival. Match the dates against the storm records to see which sailed in bad weather.',
    t5: 'This captain has the longest record without a missing arrival. Ilva wanted to ask what the crew did differently on those crossings.',
    t6: 'That month had the most severe storms on record across all three seas. Ilva compared storms by strength so a busy month of mild weather would have less influence.',
    t7: 'These ships left port during a storm and never arrived. The dates show the conditions at departure. They give us no account of what happened at sea afterward.',
    t8: 'Three different ships carried the name Marigold. Together they account for four of the rescues still listed here. The current Marigold found you.',
    t9: 'The storm before every rescue reached strength 12, the highest number the watch records. Every one began on the Brass Sea.',
    t10: 'In every case, a witness reported a new light forty days after the person was pulled from the sea.',
    t11: 'Ilva removed her own rescue entry on April 10, 1986. The erasure log kept her name and the day she was found.',
    t12: `The light also appeared forty days after Ilva’s rescue, even with her entry hidden. The record gives ${RETURN_ON} for the light after yours.`
  };
  // what each Truth gives, kept for good
  const GIFTS = { gold: ['A Sharper Purse', '+10% gold from everything'], luck: ['Tide Reader', '+10 luck'], xp: ['Long Memory', '+10% experience'], learn: ['Quick Study', '+15% skill gain'], def: ['Steady Hand', '+8% defence'], mend: ['Second Wind', 'Heal a fifth of your health after every fight you win'],
    run: ['Fleet Foot', 'You run 15% faster'], eye: ['Open Eye', 'Every lair and place shows on your map'], flee: ['Clean Break', 'Nothing gets a free swing when you run from it'], body: ['Long Rest', 'Your body and your things lie where you fell for 30 minutes'], hint: ['Ilva’s Margin', 'Hints cost half as much'], home: ['The Way Home', 'You know when and where the door opens'] };
  return { FOUND_ON, RETURN_ON, TABLES, LINKS, TRUTHS, INTERPRETATIONS, GIFTS, script, data, ids: () => (cache || {}).ids };
})();
if (typeof module !== 'undefined') module.exports = Deep;
