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
  return { civic, civicLines, districts, timber, trim, diagram, frontage, upper, normalizeProgress };
})();
if (typeof module !== 'undefined') module.exports = Interiors;
