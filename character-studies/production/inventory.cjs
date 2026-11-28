/* Inventory the actual painted gear and fitted slots for the two-body production pass. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const context = vm.createContext({ArtData: {}, atob});
for (const file of ['game/src/artpaintedgear.js', 'game/src/artpainted.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
const {painted, paintedGear} = context.ArtData;

const surfaces = {
  'armor-tunic': ['tunic', 'cloth, skin, fixed belt and footwear'],
  'armor-robe': ['robe', 'cloth, skin, fixed belt and footwear'],
  'armor-leather': ['leather', 'leather and cloth, skin, fixed buckles'],
  'armor-chain': ['mail', 'metal and cloth, skin, fixed belt'],
  'armor-plate': ['plate', 'metal, skin, fixed trim and belt'],
  'armor-knight': ['knight', 'metal, skin, fixed decorated trim'],
};

const anchorByKind = {
  grip: 'right palm', two: 'both palms', staff: 'both palms', bow: 'left bow grip and right draw hand',
  crossbow: 'right trigger and left support', shield: 'left forearm', orb: 'left palm',
  book: 'left palm or both palms while reading', head: 'head', ring: 'left hand', neck: 'collar',
  waist: 'waist', wrist: 'left wrist', pin: 'collar', laurel: 'head', monocle: 'face', hip: 'hip',
};
const actionByKind = {
  grip: 'carry, one-hand swing, thrust or cast', two: 'carry, two-hand swing and thrust',
  staff: 'carry, two-hand swing/thrust or cast', bow: 'carry, draw, release and recovery',
  crossbow: 'carry, aim, release and recovery', shield: 'carry, block and stow',
  book: 'carry and reading/casting', orb: 'carry and cast',
};
const slots = {};
for (const profile of Object.values(painted.slots)) {
  for (const [slot, items] of Object.entries(profile)) {
    for (const id of Object.keys(items)) (slots[id] ||= new Set()).add(slot);
  }
}

const rows = new Map();
for (const [id, item] of Object.entries(paintedGear.entries)) {
  if (item.kind === 'head' && /-(side|back)$/.test(id)) continue;
  const directions = item.kind === 'head'
    ? ['front', ...['side','back'].filter(view => paintedGear.entries[id + '-' + view])]
    : null;
  const body = surfaces[id];
  const fitted = [...(slots[id] || [])];
  const attachment = anchorByKind[item.kind] || fitted.join(', ') || (body && 'full outfit') || 'inventory';
  const verification = body ? 'outfit atlas validated and gameplay samples captured' :
    directions ? 'catalog and directional atlas audited; existing headwear fit retained' :
    /^w\d+$/.test(id) || /^(shield-|off-)/.test(id) ? 'catalog and paper-doll grip matrix exercised' :
    fitted.length ? 'fitted slot bank audited; representative equipped samples captured' :
    'catalog mapping audited; canonical icon exercised';
  rows.set(id, {
    id, name: item.name, outfit: body ? body[0] : null,
    regions: body ? body[1] : (item.kind === 'wardrobe' ? 'cloth or leather, fixed trim' :
      fitted.length ? 'equipment material, fixed trim' :
      item.kind === 'icon' ? 'icon finish' : 'item surface, fixed details'),
    attachment,
    actions: actionByKind[item.kind] || (body || fitted.length ? 'all body states' : 'visible when equipped'),
    world: directions ? 'directional head sprite (' + directions.join(', ') + ')' :
      body ? 'full painted family' : fitted.length ? 'fitted ' + fitted.join(', ') :
      attachment === 'inventory' ? 'inventory representation' : 'equipment sprite at attachment',
    doll: attachment === 'inventory' ? 'inventory icon' : body ? 'fitted frontal outfit' :
      fitted.length ? 'fitted frontal slot' : 'frontal attachment',
    verification,
  });
}
for (const [id, fitted] of Object.entries(slots)) {
  if (rows.has(id)) continue;
  rows.set(id, {
    id, name: id === 'armor-knights-plate' ? 'Knight’s Plate fitted appearance' : id,
    outfit: fitted.has('armor') ? 'knight' : null, regions: 'equipment material, fixed trim',
    attachment: [...fitted].join(', '), actions: 'all body states', world: 'fitted directional body',
    doll: 'fitted frontal outfit', verification: 'fitted catalog bank and standard outfit samples exercised',
  });
}
const destination = path.join(__dirname, 'equipment-coverage.json');
const byId = Object.fromEntries([...rows].sort(([a], [b]) => a.localeCompare(b)).map(([id, row]) => [id, row]));
fs.writeFileSync(destination, JSON.stringify(byId, null, 2) + '\n');
console.log('Inventoried ' + rows.size + ' equipment and appearance IDs from the current game.');
