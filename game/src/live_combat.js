/* Live combat advances only on active world time, never on SQL/hidden time. */
const LiveCombat = (() => {
  const RULES = Object.freeze({ movingArchery: .35, noticeSeconds: 2.2, suspicionDecay: 45,
    loseDelay: 3, aggroDecay: 20, noticeRange: 6.5, trackRange: 12, leash: 24,
    meleeRange: 1.35, rangedRange: 7, enemyRecovery: 2.4, windup: .65,
    controlImmunity: 4, maxSlow: .45, staminaRecovery: 3, manaRecovery: 0 });
  const number = (v, fallback = 0) => Number.isFinite(v) ? v : fallback;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(number(a.fx, a.x) - number(b.fx, b.x), number(a.fy, a.y) - number(b.fy, b.y));
  function recovery(duration = 0, discipline = 'swords', dexterity = 0) {
    const total = Math.max(.4, number(duration, 2) * (discipline === 'magery' || discipline === 'support' ? 1 : 1 - clamp(number(dexterity), 0, 120) * .002));
    return { remaining: duration > 0 ? total : 0, total: duration > 0 ? total : 0, discipline };
  }
  function advanceRecovery(state, dt, moving, paused = false) {
    if (paused || !(dt > 0)) return state;
    const rate = !moving || state.discipline === 'magery' || state.discipline === 'support' ? 1 : state.discipline === 'archery' ? RULES.movingArchery : 0;
    state.remaining = Math.max(0, number(state.remaining) - dt * rate);
    return state;
  }
  function recoveryView(state) {
    return { ...state, ready: !(state.remaining > .00001), fraction: state.total > 0 ? clamp(1 - state.remaining / state.total, 0, 1) : 1 };
  }
  function profile({ role = '', name = '', circle = 1, boss = false } = {}) {
    const magic = role === 'caster' || /imp|wisp|witch|lich|wraith|sphinx|council|mage|acolyte/i.test(name);
    const ranged = magic || /archer|slinger|crossbow|bowman|spitter/i.test(name);
    return { magic, ranged, range: ranged ? RULES.rangedRange : RULES.meleeRange,
      recovery: role === 'brute' ? 3.4 : boss ? 2.8 : RULES.enemyRecovery,
      windup: role === 'brute' ? 1 : RULES.windup,
      speed: role === 'brute' ? 2.4 : role === 'skirmisher' ? 4.1 : ranged ? 3 : 3.4,
      noticeRange: RULES.noticeRange, leash: boss ? 18 : RULES.leash,
      circle: clamp(number(circle, 1), 1, 8) };
  }
  const enemy = () => ({ phase: 'idle', awareness: 0, lost: 0, cooldown: 1.2,
    windup: 0, slow: 0, slowTime: 0, controlImmune: 0, bleed: 0, bleedTime: 0, exposed: 0, round: 0 });
  function engage(state) { if (state.phase === 'return') return false; state.phase = 'chase'; state.awareness = 100; state.lost = 0; return true; }
  function awareness(state, dt, facts, p = profile()) {
    if (facts.paused || !(dt > 0)) return state;
    if (state.phase === 'return') {
      if (facts.homeDistance <= .6) { state.phase = 'idle'; state.awareness = 0; state.lost = 0; }
      return state;
    }
    if (facts.safe || facts.homeDistance > p.leash) {
      if (state.phase === 'chase' || state.awareness > 0) state.phase = 'return';
      state.awareness = 0; state.windup = 0; return state;
    }
    const detects = facts.visible && facts.detectable !== false && facts.distance <= p.noticeRange;
    if (state.phase !== 'chase') {
      state.awareness = clamp(state.awareness + (facts.aggressive && detects ? 100 / RULES.noticeSeconds : -RULES.suspicionDecay) * dt, 0, 100);
      state.phase = state.awareness >= 100 ? 'chase' : state.awareness > 0 ? 'alert' : 'idle';
    } else if (facts.visible && facts.detectable !== false && facts.distance <= RULES.trackRange) {
      state.lost = 0; state.awareness = 100;
    } else {
      const previous = state.lost;
      state.lost += dt;
      const decayTime = Math.max(0, state.lost - RULES.loseDelay) - Math.max(0, previous - RULES.loseDelay);
      state.awareness = Math.max(0, state.awareness - RULES.aggroDecay * decayTime);
      if (state.awareness <= 0) { state.phase = 'return'; state.windup = 0; }
    }
    return state;
  }
  function advanceEnemy(state, dt, { canAttack = false, paused = false } = {}, p = profile()) {
    if (paused || !(dt > 0)) return false;
    for (const key of ['controlImmune', 'slowTime', 'bleedTime', 'exposed']) state[key] = Math.max(0, number(state[key]) - dt);
    if (!state.slowTime) state.slow = 0;
    if (!state.bleedTime) state.bleed = 0;
    if (state.phase !== 'chase') return false;
    if (state.windup > 0) {
      state.windup = Math.max(0, state.windup - dt);
      if (!state.windup) { state.cooldown = p.recovery; state.round++; return !!canAttack; }
    } else {
      state.cooldown = Math.max(0, number(state.cooldown) - dt);
      if (state.cooldown <= 0 && canAttack) state.windup = p.windup;
    }
    return false;
  }
  function interrupt(state, seconds = 1) {
    if (state.controlImmune > 0) return false;
    state.windup = 0; state.cooldown = Math.max(state.cooldown, clamp(seconds, .3, 1.8));
    state.controlImmune = RULES.controlImmunity; return true;
  }
  /* Supercover traversal: touching a sealed corner cannot reveal or shoot through it. */
  function clearLine(ax, ay, bx, by, opaque) {
    if (![ax, ay, bx, by].every(Number.isFinite)) return false;
    let x = Math.round(ax), y = Math.round(ay);
    const ex = Math.round(bx), ey = Math.round(by), dx = bx - ax, dy = by - ay, sx = Math.sign(dx), sy = Math.sign(dy);
    let guard = 0;
    while (x !== ex || y !== ey) {
      if (++guard > 4096) return false;
      const tx = x === ex ? Infinity : (x + sx * .5 - ax) / dx;
      const ty = y === ey ? Infinity : (y + sy * .5 - ay) / dy;
      if (Math.abs(tx - ty) < 1e-9) {
        if (opaque(x + sx, y) || opaque(x, y + sy)) return false;
        x += sx; y += sy;
      } else if (tx < ty) x += sx; else y += sy;
      if (opaque(x, y)) return false;
    }
    return true;
  }
  function pathStep(from, to, blocked, { range = 1.2, maxNodes = 1400, visible = () => true } = {}) {
    const start = from.map(Math.round), end = to.map(Math.round), queue = [[...start, null]], seen = new Set([start.join(',')]);
    for (let i = 0; i < queue.length && i < maxNodes; i++) {
      const [x, y, first] = queue[i];
      if (Math.hypot(x - end[0], y - end[1]) <= range && visible(x, y)) return first;
      const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort((a,b) => Math.hypot(x+a[0]-end[0],y+a[1]-end[1])-Math.hypot(x+b[0]-end[0],y+b[1]-end[1]));
      for (const [dx,dy] of steps) {
        const nx=x+dx,ny=y+dy,key=nx+','+ny;
        if (seen.has(key) || blocked(nx,ny)) continue;
        seen.add(key);queue.push([nx,ny,first || [nx,ny]]);
      }
    }
    return null;
  }
  return { RULES, recovery, advanceRecovery, recoveryView, profile, enemy, engage, awareness, advanceEnemy, interrupt, clearLine, pathStep, distance };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = LiveCombat;
