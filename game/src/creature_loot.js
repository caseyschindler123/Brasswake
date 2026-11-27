/* Creature identity, rather than its SQL exercise or combat role, owns its loot. */
const CreatureLoot = (() => {
  const profiles = {};
  const assign = (kind, ids) => ids.split(' ').forEach(id => { profiles[id] = kind; });
  assign('carrier', 'b104 b201 b301 b401 b402 b803 l01 l02 l03 l04 l05 l06 l07 l08 l12 l15 l16 l17 l18 l19 l20 l30 l31 l32 d12 d22 d31 d32 d52 d62 d72 k1 k3 k7');
  assign('material', 'b304 b404 b501 b502 b503 b504 b602 b603 b604 b702 b703 b704 b801 b802 b804 l25 l26 l27 l28 d51 d61 d81 d82 k2 k5 k6 k8');
  assign('hide', 'b101 b601 l29 a4 a11 a14 a18 a20 a25 a27 a32 a33 a40 d11 l23');
  assign('meat', 'b102 b103 b205 b303 b701 a1 a5 a8 a10 a12 a13 a15 a16 a19 a21 a22 a23 a24 a26 a34 a36 a37 a38 a39');
  assign('game', 'b403 a2 a3 a6 a7 a09 a17 a28 a35 l13 l14 l21 l22 l24 d21 d71 k4');
  assign('none', 'b202 b203 b204 b302 a29 a30 a31 l09 l10 l11 d41 d42');
  // Hawks and harpies yield meat; leeches, insects and spiders have no useful
  // resource in the current inventory. New species default to no carried goods.
  function identity(enemy) {
    return enemy && (enemy.species || enemy.inst && (enemy.inst.art || enemy.inst.lk || enemy.inst.tpl) || enemy.tpl);
  }
  function profile(enemy) { return profiles[identity(enemy)] || 'none'; }
  function carries(enemy) { return profile(enemy) === 'carrier'; }
  function filter(loot, enemy, random = Math.random) {
    const kind = profile(enemy);
    if (kind === 'carrier') return loot;
    const out = { gold: 0, mats: {}, items: [], scrolls: [] };
    if (kind === 'material') { out.mats = { ...loot.mats }; return out; }
    const n = enemy && enemy.inst && enemy.inst.elite ? 3 : 1;
    if (kind === 'meat' || kind === 'game') out.meat = n + (random() < .3 ? 1 : 0);
    if (kind === 'hide' || kind === 'game') out.hide = n;
    return out;
  }
  return { profiles: Object.freeze(profiles), identity, profile, carries, filter };
})();
if (typeof module !== 'undefined') module.exports = CreatureLoot;
