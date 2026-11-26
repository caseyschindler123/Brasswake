/* Character ownership, stable transactions, and riding rules. */
const Mounts = (() => {
  const PRICE = 650;
  const RUN_MULTIPLIER = 1.7;

  function normalize(value) {
    const owned = value?.owned === true;
    return { owned, mounted: owned && value.mounted === true };
  }

  function canRide(context) {
    return context?.outdoors === true && !context.indoors && !context.dungeon &&
      !context.ship && !context.combat;
  }

  function buy(value, gold) {
    const state = normalize(value);
    if (state.owned) return { ok: false, reason: 'owned', state, gold };
    if (!Number.isSafeInteger(gold) || gold < PRICE)
      return { ok: false, reason: 'gold', state, gold };
    return { ok: true, state: { owned: true, mounted: false }, gold: gold - PRICE };
  }

  function dismount(value) {
    return { owned: value?.owned === true, mounted: false };
  }

  function enforceContext(value, context) {
    return canRide(context) ? normalize(value) : dismount(value);
  }

  function toggle(value, context) {
    const state = normalize(value);
    if (!state.owned) return { ok: false, reason: 'horse', state };
    if (state.mounted) return { ok: true, state: dismount(state) };
    if (!canRide(context)) return { ok: false, reason: 'place', state };
    return { ok: true, state: { owned: true, mounted: true } };
  }

  function speed(value, ordinarySpeed, runningSpeed, pace = 1, context) {
    if (value?.owned !== true || value.mounted !== true || !canRide(context)) return ordinarySpeed;
    const fraction = Number.isFinite(pace) ? Math.max(0, Math.min(1, pace)) : 0;
    return ordinarySpeed * (1 - fraction) + runningSpeed * RUN_MULTIPLIER * fraction;
  }

  return { PRICE, RUN_MULTIPLIER, normalize, canRide, buy, dismount, enforceContext, toggle, speed };
})();
if (typeof module !== 'undefined') module.exports = Mounts;
