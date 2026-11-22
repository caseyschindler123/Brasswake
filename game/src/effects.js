/* Presentation only: spell Circles retain their existing combat rules. */
const Effects = (() => {
  const SPELLS = [
    { id: 'spark', color: '#8acaff', light: '#f4fbff', pitch: 740 },
    { id: 'frost', color: '#70dded', light: '#e7ffff', pitch: 1300 },
    { id: 'sun', color: '#ffc24e', light: '#fff7cf', pitch: 523 },
    { id: 'storm', color: '#b5a2ff', light: '#f5efff', pitch: 185 },
    { id: 'fire', color: '#ff7938', light: '#ffe5a0', pitch: 110 },
    { id: 'crystal', color: '#db9dff', light: '#fff0ff', pitch: 1568 },
    { id: 'blizzard', color: '#a4d5ff', light: '#ffffff', pitch: 880 },
    { id: 'rewrite', color: '#a58cff', light: '#eee1ff', pitch: 262 }
  ];
  const spell = (circle, rare) => Object.assign({}, SPELLS[Math.max(0, Math.min(7, (Number(circle) || 1) - 1)) | 0], { rare: !!rare });
  /* Names include dungeon keepers and later creature packs, not just region-one mobs. */
  function creature(name) {
    const n = String(name || '').toLowerCase();
    if (/archer|crossbow|slinger/.test(n)) return 'bow';
    if (/dragon|wyvern|wyrm|hydra/.test(n)) return 'dragon';
    if (/ghost|wraith|spect|lich|witch|shade|phantom|archivist|wisp/.test(n)) return 'spirit';
    if (/golem|sentinel|armor|armour|automaton|marshal|warden/.test(n)) return 'stone';
    if (/gull|bird|pelican|pheasant|heron|owl|raven|goose|swan|pigeon|partridge|ptarmigan|mallard|peacock|oystercatcher/.test(n)) return 'bird';
    if (/crab|spider|beetle|moth|cricket|scorpion/.test(n)) return 'insect';
    if (/leech|slug|slime|toad|frog|olm|salamander|lizard/.test(n)) return 'wet';
    if (/rat|rabbit|hare|stoat|mole|hedgehog|bat/.test(n)) return 'small';
    if (/wolf|hound|boar|fox|lynx|cat|badger|bear|yeti|terrier|seal|otter|deer|elk|goat|sheep|ram|mouflon/.test(n)) return 'beast';
    return 'swing';
  }
  function drawMagic(g, s, phase, u) {
    const rare = s.rare ? 1.2 : 1;
    g.save(); g.scale(rare, rare); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = s.color; g.fillStyle = s.color; g.lineWidth = 1.5;
    const line = points => { g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); };
    const ring = (r, sy) => { g.beginPath(); g.ellipse(0, 0, r, r * (sy || 1), 0, 0, Math.PI * 2); g.stroke(); };
    const shard = (x, y, size) => { g.beginPath(); g.moveTo(x + size, y); g.lineTo(x, y - size * .45); g.lineTo(x - size, y); g.lineTo(x, y + size * .45); g.closePath(); g.fill(); g.strokeStyle = s.light; line([[x - size * .5, y], [x + size * .65, y]]); g.strokeStyle = s.color; };
    if (phase === 'cast') {
      g.globalAlpha *= Math.sin(Math.PI * Math.min(.95, u)) * .8;
      ring(6 + u * 7, .5); if (s.rare) ring(10 + u * 7, .5);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + u; g.fillRect(Math.cos(a) * 11 - .7, Math.sin(a) * 5 - 1 - u * 6, 1.5, 2); }
      g.translate(0, -3); g.scale(.4, .4); drawMagic(g, Object.assign({}, s, { rare: false }), 'flight', u);
      g.restore(); return;
    }
    if (phase === 'impact' || phase === 'fizzle') {
      const miss = phase === 'fizzle'; g.globalAlpha *= (1 - u) * (miss ? .45 : 1);
      g.rotate(u * .4); ring(3 + u * (miss ? 9 : 17), .65);
      for (let i = 0; i < (miss ? 4 : 8); i++) { const a = i * Math.PI / (miss ? 2 : 4), r = 4 + u * 14; g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r * .7); g.rotate(a); shard(0, 0, miss ? 1 : 2.5 * (1 - u) + .5); g.restore(); }
      if (miss) { g.restore(); return; }
      g.scale(1 - u * .5, 1 - u * .5);
    }
    /* Distinct silhouettes stay readable at phone scale; no full-screen flashes. */
    switch (s.id) {
      case 'spark':
        g.strokeStyle = s.light; line([[-12, 2], [-5, -4], [-2, 2], [4, -3], [11, 0]]);
        g.strokeStyle = s.color; line([[-7, -5], [-3, -1], [-5, 5]]); break;
      case 'frost':
        shard(2, 0, 10); g.globalAlpha *= .6; line([[-15, -3], [-8, -3]]); line([[-17, 3], [-9, 3]]); break;
      case 'sun':
        g.lineWidth = 4; line([[-15, 0], [11, 0]]); g.strokeStyle = s.light; g.lineWidth = 1.5; line([[-12, 0], [13, 0]]); line([[5, -5], [5, 5]]); break;
      case 'storm':
        g.lineWidth = 2.5; line([[-15, -4], [-7, 3], [-2, -5], [4, 3], [12, 0]]);
        g.strokeStyle = s.light; g.lineWidth = 1; line([[-2, -5], [3, -9], [8, -7]]); line([[-7, 3], [-5, 9], [0, 6]]); break;
      case 'fire':
        g.beginPath(); g.moveTo(-14, -5); g.quadraticCurveTo(1, -9, 11, 0); g.quadraticCurveTo(1, 9, -14, 5); g.lineTo(-7, 0); g.closePath(); g.fill();
        g.fillStyle = s.light; shard(4, 0, 5); for (let i = 0; i < 3; i++) g.fillRect(-14 - i * 4, Math.sin(u * 12 + i) * 5, 1.5, 1.5); break;
      case 'crystal':
        shard(4, 0, 8); shard(-5, -6, 5); shard(-8, 6, 4); break;
      case 'blizzard':
        for (let i = 0; i < 5; i++) { const a = i * Math.PI * .4 + u * 5, x = Math.cos(a) * 8, y = Math.sin(a) * 6; line([[x - 2, y], [x + 2, y]]); line([[x, y - 2], [x, y + 2]]); }
        g.strokeStyle = s.light; g.beginPath(); g.ellipse(0, 0, 13, 8, 0, u * 4, u * 4 + 4); g.stroke(); break;
      case 'rewrite':
        g.rotate(-u * 3); ring(9, .75); g.strokeStyle = s.light; ring(5, .75);
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.fillRect(Math.cos(a) * 13 - 1, Math.sin(a) * 9 - 1, 3, 2); } break;
    }
    if (s.rare) { g.fillStyle = s.light; for (let i = 0; i < 3; i++) g.fillRect(-8 - i * 4, Math.sin(u * 10 + i * 2) * 9, 1.5, 1.5); }
    g.restore();
  }
  return { spell, creature, drawMagic, spells: () => SPELLS.map((_, i) => spell(i + 1)) };
})();
