// Appearance descriptors use the same body combinations and layer indices as the hero.
const NpcAppearance = (() => {
  const profiles=typeof CharacterProfiles!=='undefined'?CharacterProfiles:require('./character_profiles');
  const HAIR = [
    ['#1a1412', '#5c4a3e'], ['#2e1c10', '#8f5e34'], ['#3c1608', '#c4602c'],
    ['#5c4418', '#ecd08a'], ['#3e3e3e', '#cfcfcf'], ['#8c8c8c', '#ffffff'],
  ];
  const CLOTH = ['#56657b', '#6e7854', '#8c5b48', '#826d8e', '#a4894a', '#648078', '#ac9985', '#934f4d'];
  const SKIN = [
    [1.03, 1.05, 1.08], [1, 1, 1], [.84, .81, .77], [.65, .58, .51], [.49, .41, .35],
  ];
  // Body, hair, hair colour, skin, cloth, beard, hat, carried equipment.
  const NAMED = {
    'Tamsin': [6, 7, 1, 2, '#48677b'],
    'Odalys Brine': [8, 10, 4, 2, '#a69075'],
    'Pim Underhill': [3, 5, 1, 0, '#a08563', -1, 0],
    'Wex Carrow': [4, 0, 4, 2, '#405b7e', 0, 0],
    'Ilse Fenn': [6, 8, 1, 1, '#59794c'],
    'Hob Sedge': [1, 5, 1, 0, '#997655'],
    'Tam Osk': [1, 1, 4, 2, '#92804f', 1, 0, 'staff'],
    'Maud Tallow': [6, 10, 4, 1, '#80544f'],
    'Abbot Fenwright': [2, -1, 0, 2, '#b08938', -1, -1, 'book'],
    'Tessaly Roe': [6, 10, 2, 0, '#4c6587'],
    'Tobin Ash': [3, 1, 1, 2, '#8e7155', 5],
    'Corwin Dale': [1, 2, 2, 1, '#8e6254', 1],
    'Bly Hobb': [8, 8, 1, 2, '#aa6a48', -1, 0],
    'Brannoch Reeve': [3, 5, 0, 3, '#787c71', 0],
    'Ysolt Karn': [8, 10, 2, 1, '#bc824f', -1, -1, 'hammer'],
    'Sefa Lund': [6, 9, 1, 1, '#59754d'],
    'Nym Sable': [2, 2, 5, 0, '#7b6856', 1, -1, 'book'],
    'Orrin Dusk': [3, 4, 1, 1, '#807477'],
    'Marrow Pike': [2, 1, 1, 2, '#7d6553', 5, 3],
    'Maren Holt': [7, 10, 5, 0, '#895e57'],
    'Calla Vane': [7, 6, 1, 1, '#465fb1', -1, 3],
    'Hale Verity': [1, 1, 1, 1, '#577559'],
    'Bryn Okoro': [2, 5, 0, 4, '#425a85', 0, -1, 'book'],
    'Lune Farrow': [6, 8, 2, 0, '#68857d'],
    'Petra Voss': [7, 10, 4, 1, '#8c6390', -1, -1, 'book'],
    'Dregan Vosk': [3, 3, 0, 2, '#a55848', 3, 0, 'dagger'],
    'Sister Calloway': [7, 10, 1, 0, '#8c8e97', -1, 3, 'book'],
    'Old Pell Marrow': [2, -1, 5, 1, '#677752', 1, -1, 'staff'],
    'Jessamy Crane': [9, 10, 3, 0, '#516ba4', -1, 0, 'sword'],
    'Master Ilgrave': [4, 3, 3, 1, '#5a5480', 2, -1, 'sword'],
    'The Archivist Under': [7, 11, 3, 0, '#b5a788', -1, 3, 'book'],
    'Lady Oriel Vant': [7, 11, 3, 0, '#886993', -1, 5],
    'Scrivener Hale Quarto': [2, 3, 0, 1, '#814457', 3, 4, 'book'],
    'Varrick Stone': [2, 4, 4, 1, '#737b84', 0, -1, 'book'],
    'The Council': [2, 2, 5, 1, '#79504f', 1, -1, 'book'],
    'Hesper Coyle': [6, 10, 4, 2, '#455675'],
    'Pell Rushing': [1, 2, 4, 3, '#7f8a60', 2, 0, 'staff'],
    'Sela Marrow': [7, 11, 0, 2, '#b78643'],
    'Gus Harrow': [1, 4, 4, 2, '#a9584f', 0, -1, 'staff'],
    'Ness Corrigan': [8, 9, 0, 1, '#88624f'],
    'Aurel Dunn': [2, 3, 4, 0, '#74727d', -1, -1, 'staff'],
    'Signe Vale': [9, 10, 5, 0, '#c1b09d', -1, -1, 'sword'],
    'Oswin Gale': [2, 2, 5, 1, '#a28a60', 1, -1, 'staff'],
    'Sorrel Ashby': [6, 8, 2, 1, '#667753', -1, -1, 'sword'],
    'Brick Dorran': [3, -1, 0, 2, '#586786', 4],
    'Granny Wick': [7, 6, 5, 1, '#984f4b', -1, -1, 'staff'],
    'Pip Lowell': [1, 5, 1, 0, '#a4967e'],
  };
  // The portrait sequence corresponds to the 24 students, three in each town.
  const STUDENT_HAIR = [5,7,5,8,1,5,10,5,10,5,7,1,9,5,10,1,6,1,8,1,11,5,10,5];
  const STUDENT_COLOUR = [1,0,3,1,0,3,1,3,2,3,1,1,2,0,1,3,5,1,3,1,1,1,0,1];
  const UNIFORM = ['#455a83','#617a51','#a98439','#a35449','#86624e','#777982','#b2a58e','#a98b52'];
  const EQUIPMENT = {
    staff: [8, 'staff', 'thrust'], book: [24, 'book', 'cast'],
    hammer: [6, 'sword', 'swing'], sword: [1, 'sword', 'swing'], dagger: [14, 'dagger', 'thrust'],
  };
  const ROLES = {
    banker: { outfit: 2, color: '#486557', hat: 0 },
    tavern: { outfit: 3, color: '#b39a70' },
    registrar: { outfit: 2, color: '#555776', gear: 'book' },
    casino: { outfit: 2, color: '#784e83', hat: 5 },
    healer: { outfit: 2, color: '#c4b88a', gear: 'book' },
    stallkeep: { outfit: 3 }, shopkeep: { outfit: 3 }, specialist: { outfit: 3 },
    cartographer: { outfit: 2, color: '#537d81', gear: 'book' },
    ferry: { outfit: 1, color: '#596e90', hat: 0, gear: 'staff' },
    peddler: { outfit: 3, hat: 0 },
    fisher: { outfit: 1, color: '#647e88', hat: 0 },
    miner: { outfit: 3, hat: 0, gear: 'hammer' },
    woodcutter: { outfit: 3, gear: 'hammer' },
    shepherd: { outfit: 1, gear: 'staff' },
    hermit: { outfit: 2, hat: 3 },
    herbalist: { outfit: 2, color: '#71916a' },
  };
  const HUMAN = new Set([
    'npc', 'folk', 'banker', 'tavern', 'registrar', 'stallkeep', 'healer', 'shopkeep', 'casino', 'rival',
    'home', 'peddler', 'ferry', 'specialist', 'guide', 'master', 'student', 'sorrel', 'traveler', 'odalys',
    'foe', 'cartographer',
  ]);
  const isHuman = e => HUMAN.has(e.kind) || (e.kind === 'boss' && (e.r === 1 || e.r === 8));
  const named = name => Object.prototype.hasOwnProperty.call(NAMED, name) && NAMED[name];

  function stableIdentity(e) {
    if (named(e.name) || (e.fs >= 12 && e.fs <= 35)) return e.name;
    // Repeated occupation labels identify distinct extras by their original placements.
    const place = e.hid || e.venueId || e.route || (e.kind === 'folk' || e.kind === 'peddler' ? [e.x, e.y].join(',') : '');
    return [e.kind, e.r, e.name, place, e.side].join('|');
  }

  function hash(input) {
    let value = 2166136261;
    for (const letter of input) value = Math.imul(value ^ letter.codePointAt(0), 16777619);
    value = Math.imul(value ^ value >>> 16, 0x7feb352d);
    value = Math.imul(value ^ value >>> 15, 0x846ca68b);
    return (value ^ value >>> 16) >>> 0;
  }

  function describe(e) {
    if (!isHuman(e)) return null;
    const identity = stableIdentity(e);
    const seed = index => hash(identity + ':' + index);
    let parts = named(e.name);
    if (!parts && e.fs >= 12 && e.fs <= 35) {
      const index = e.fs - 12, hair = STUDENT_HAIR[index];
      parts = [hair >= 6 ? 6 : 1, hair, STUDENT_COLOUR[index], seed(3) % 3, UNIFORM[(index / 3) | 0]];
    }
    if (!parts) {
      const body = seed(0) % 2, role = ROLES[e.role] || ROLES[e.kind] || {};
      parts = [body * 5 + (role.outfit || 1 + seed(1) % 3), body * 6 + seed(2) % 6,
        seed(3) % HAIR.length, seed(4) % SKIN.length, role.color || CLOTH[seed(5) % CLOTH.length],
        body === 0 && seed(6) % 3 === 0 ? seed(7) % 6 : -1, role.hat ?? (seed(8) % 9 === 0 ? 0 : -1), role.gear];
    }
    const [combo, hair, colour, skin, cloth, beard = -1, hat = -1, carried] = parts;
    const [wpn, wkind, style] = EQUIPMENT[carried] || [-1, '', 'swing'];
    const profile=profiles.npc(e);
    return { combo, build:profile.build,height:profile.height,hair, hc: HAIR[colour], skin, cloth, beard, hat, wpn, wkind, style, shield: -1,
      keepPaintedIdentity: Boolean(named(e.name) || e.fs >= 12 && e.fs <= 35 || beard >= 0) };
  }

  // Screen coordinates, clockwise from south through west. The legacy cardinal
  // direction is still used by creature AI and unchanged fallback sprites.
  const DIRECTION = [[3, 4, 5], [2, 0, 6], [1, 0, 7]];
  function direction(dx, dy, fallback = 0) {
    if (!dx && !dy) return fallback;
    return DIRECTION[Math.sign(dy) + 1][Math.sign(dx) + 1];
  }

  // The packed body sheets have warm skin, pale cloth and brown leather.
  // Face anchors bound the head/neck. Arm colour only gets sampled at the
  // sides of unarmoured torsos, where sleeves end and hands can be visible.
  function tintBody(pixels, width, anchor, combo, cloth, tone) {
    const [top, center, head] = anchor, factors = SKIN[tone];
    const outfit = (combo - 1) % 5;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 8) continue;
      const x = (i / 4) % width, y = Math.floor(i / 4 / width);
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], red = r - g, gold = g - b;
      const offset = Math.abs(x - center), down = y - top;
      const face = down >= -1 && down <= head * 1.45 && offset <= head * .76;
      const arms = outfit !== 4 && down > head * 1.5 && down < head * 4.05 && offset > head * .78;
      const skin = (face || arms) && red >= (face ? 24 : 38) && gold >= 12 && r > 91;
      if (skin) {
        for (let c = 0; c < 3; c++) pixels[i + c] *= factors[c];
      } else if (cloth && !face && down > head * 1.16 && down < head * (outfit === 1 ? 6.6 : 4.9) &&
        (outfit < 3 || red > 9) && r > 105 && red >= -6 && red < 40 && gold >= -6 && gold < 43) {
        const light = (r + g + b) / 765, shade = .28 + light;
        const weight = .88 * Math.min(1, (r - 105) / 30, (40 - red) / 9, (43 - gold) / 12);
        for (let c = 0; c < 3; c++) pixels[i + c] = pixels[i + c] * (1 - weight) + cloth[c] * shade * weight;
      }
    }
  }

  return { describe, isHuman, direction, tintBody };
})();

if (typeof module !== 'undefined') module.exports = NpcAppearance;
