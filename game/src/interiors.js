/* Regional public rooms. Diagrams share their tile mask with the building renderer and collision. */
const Interiors = (() => {
  const civic = [null,
    { name: 'Harbour Exchange', room: 'Pilots’ chart loft', role: 'Harbour clerk', shape: 'L', w: 12, h: 9, roof: 1, fittings: ['counter', 'kegs', 'shelf'] },
    { name: 'Reedworkers’ Hall', room: 'Weavers’ drying loft', role: 'Reedworker', shape: 'court', w: 12, h: 12, roof: 3, fittings: ['bench', 'ltable', 'cupboard'] },
    { name: 'Wool Market', room: 'Wool weighhouse', role: 'Wool factor', shape: 'gallery', w: 14, h: 8, roof: 3, fittings: ['counter', 'chest', 'stool'] },
    { name: 'Carters’ Rest', room: 'Drivers’ bunkroom', role: 'Stable steward', shape: 'L', w: 11, h: 10, roof: 1, fittings: ['kegs', 'bench', 'hearth'] },
    { name: 'Copper Assay House', room: 'Assayers’ workshop', role: 'Assayer', shape: 'gallery', w: 10, h: 12, roof: 4, fittings: ['hearth', 'strongbox', 'ltable'] },
    { name: 'Crystal Archive', room: 'Readers’ gallery', role: 'Archive keeper', shape: 'court', w: 11, h: 13, roof: 2, fittings: ['shelf', 'ltable', 'stool'] },
    { name: 'Watch Lodge', room: 'Weather observers’ loft', role: 'Watch officer', shape: 'L', w: 10, h: 12, roof: 2, fittings: ['hearth', 'bench', 'rtable'] },
    { name: 'Council Palace', room: 'Council record room', role: 'Council archivist', shape: 'court', w: 12, h: 12, roof: 4, fittings: ['shelf', 'strongbox', 'ltable'] },
  ];
  const districts = ['', 'Harbour', 'Reed', 'Wool', 'Ford', 'Copper', 'Crystal', 'Watch', 'Council'];
  const civicLines = [null,
    'The pilots read their charts upstairs before they come down to meet a ship. There’s space at the table if you want a look.',
    'We hang the cut reeds upstairs to dry. Rain can reach the courtyard, so we keep the finished baskets under the gallery.',
    'The fleeces come through the wide front bay. We weigh each lot upstairs before the factor enters it in the book.',
    'The drivers leave their carts on the apron. Their bunks are upstairs, away from the wheels.',
    'Bring a sample in from the forge and the assayers can work on it upstairs. The strongbox stays down here with me.',
    'The readers use the gallery upstairs. That leaves the courtyard free for porters carrying the archive boxes.',
    'The watch keeps the weather books upstairs. When the pass closes, we keep the hearth lit for people caught on this side.',
    'The council keeps its record room upstairs. Take the inner stair past the desks.',
  ];
  const timber = ['', '#ac7751', '#8b754b', '#ab875b', '#aa7c52', '#825242', '#766e76', '#88715c', '#a57e55'];
  const trim = ['', '#28536a', '#517353', '#976b3f', '#596f86', '#825036', '#625882', '#4f6670', '#365e82'];

  const casino = {
    w: 14, h: 10,
    stations: [
      { key: 'poker', name: 'Poker', table: [3.5, 4.8], footprint: [[2,3],[3,3],[4,3],[2,4],[3,4],[4,4]],
        dealer: [2,5], facing: 'b', seats: [[1,4,'s'],[5,3,'l']] },
      { key: 'blackjack', name: 'Blackjack', table: [10.5, 4.8], footprint: [[9,3],[10,3],[11,3],[9,4],[10,4],[11,4]],
        dealer: [11,5], facing: 'b', seats: [[8,4,'s'],[12,3,'l']] },
      { key: 'wheel', name: 'Wheel', table: [3.5, 8.15], footprint: [[2,7],[3,7],[4,7],[3,8]],
        dealer: [5,7], facing: 'l', seats: [[4,8,'b']] },
    ],
  };
  const stable = { w: 12, h: 8, stalls: [[2,2],[5,2],[8,2]] };

  const roomUses = {
    tavern: { pieces: [['!venue_meal',2.6,4.0]], resident: ['Guest', 'Waiting for supper', [1,4], 's',
      'I’ve been on the road since dawn. I could smell the supper before I saw the sign.', true] },
    bank: { pieces: [['!venue_records',2.1,2.2]], resident: ['Depositor', 'Counting a deposit', [2,3], 'b',
      'I count it here on the counter. It saves us both an argument later.'] },
    shop: { pieces: [['!venue_stock',2.0,2.1]], resident: ['Shop assistant', 'Sorting the stock', [1,2], 's',
      'Let me know if you need a hand finding something. I’m putting the deliveries away.'] },
    healer: { pieces: [['bed',1.45,2.85],['cupboard',3.85,1.75],['!venue_medicine',3.65,2.05]],
      resident: ['Patient', 'Waiting for the healer', [1,1], 'f', 'I’m resting here until the healer has a moment.', true] },
    guild: { pieces: [['shelf',1.5,2.15],['ltable',3.25,3.4],['!venue_records',3.2,2.75]],
      resident: ['Company clerk', 'Checking the rolls', [5,2], 'l', 'I’m checking the names against the company rolls. The trials clerk can help you with your marks.'] },
    work: { pieces: [['shelf',1.6,1.7],['chest',4.65,1.85],['!venue_tools',3.45,2.4]],
      resident: ['Apprentice', 'Sorting tools', [4,2], 'l', 'The small tools go back on the bench. You can use them when I’m done sorting them.'] },
    dojo: { pieces: [['bench',1.8,2.4],['!venue_training_mat',4.4,3.7]],
      resident: ['Pupil', 'Waiting to practise', [2,2], 's', 'I come early to watch the others spar. It gives me something to work on when it’s my turn.'] },
  };

  function diagram(w, h, cuts = [], partitions = []) {
    const rows = Array.from({ length: h }, () => Array(w).fill('.'));
    for (const [x, y, cw, ch] of cuts) {
      for (let yy = y; yy < y + ch; yy++) for (let xx = x; xx < x + cw; xx++) rows[yy][xx] = ' ';
    }
    for (const [x, y] of partitions) rows[y][x] = '#';
    return rows.map(row => row.join(''));
  }

  function frontage(slot, w, h, r) {
    if (slot === 'tavern') return diagram(w, h, [[r % 2 ? 0 : w - 2, 0, 2, r % 3 === 0 ? 3 : 2]]);
    if (slot === 'guild') return diagram(w, h, [[0, 0, 2, 1], [w - 2, 0, 2, 1]]);
    if (slot === 'casino') return diagram(w, h, [[r % 2 ? 0 : w - 2, h - 1, 2, 1]]);
    if (slot === 'shop') return diagram(w, h, [[0, h - 1, 2, 1]]);
    if (slot === 'bank') return diagram(w, h, [[0, 0, 2, r % 2 ? 1 : 2]]);
    if (slot === 'dojo') return diagram(w, h, [[0, 0, 1, 1], [w - 1, 0, 1, 1]]);
    if (slot === 'cottage') return diagram(w, h, [[r % 2 ? 0 : w - 1, h - 1, 1, 1]]);
    if (slot === 'house') return diagram(w, h, [[0, 0, 1, 1], [w - 1, 0, 1, 1]]);
    return undefined;
  }
  function upper(building) {
    const { w, h, plan } = building;
    const rows = [];
    for (let y = 0; y < h; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        const tile = plan.tiles[y * w + x];
        row += tile === 0 ? ' ' : tile === 4 ? 'o' : '.';
      }
      rows.push(row);
    }
    // The walls continue up from their actual foundations. Upstairs exterior
    // doors are sealed; the stairs are the sole entrance.
    return { w, h, diagram: rows, doors: [] };
  }
  function normalizeProgress(data) {
    const coord = (n, limit) => Number.isInteger(n) && n >= 0 && n < limit;
    if (!data || data.v !== 1 || data.f !== 1 || typeof data.id !== 'string'
      || !data.id.length || data.id.length > 96 || !/^[a-zA-Z]/.test(data.id) || /[^a-zA-Z0-9:_-]/.test(data.id)
      || !Number.isInteger(data.r) || data.r < 1 || data.r > 8 || !coord(data.x,128) || !coord(data.y,128)
      || !Array.isArray(data.back) || data.back.length !== 2 || !coord(data.back[0],768) || !coord(data.back[1],1152)) return null;
    return { v:1, id:data.id, r:data.r, f:1, x:data.x, y:data.y, back:data.back.slice() };
  }
  return { civic, civicLines, districts, timber, trim, casino, stable, roomUses, diagram, frontage, upper, normalizeProgress };
})();
if (typeof module !== 'undefined') module.exports = Interiors;
