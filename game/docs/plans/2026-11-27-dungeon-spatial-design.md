# Dungeon spatial redesign

Status: complete; integrated, published and verified at `32d5942` on 2026-11-28 UTC under the sole coordinated UI/gameplay/dungeon release. [Release history](../RELEASE_HISTORY.md#landscape-techniques-live-combat-and-dungeon-redesign) owns exact verification and limitations.

## Scope and acceptance

Replace the repeated room-chain geometry across all 28 floors with authored regional spaces: working quays, braided waterworks, ceremonial tombs, branching burrows, industrial halls, faceted caves, exposed terraces and institutional wings. Preserve dungeon/floor order, room/entity semantic IDs, rosters, named lieutenants/keepers, daily seal/vault rules, story tables, lore and guided starter guardian/chest. Reuse approved architectural art; no image generation.

Each floor must have connected dry terrain, reachable interactions with optional gates closed, an isolated secret cache until investigated, a useful return shortcut unlocked from the deeper floor, physical cover, both confined and broader spaces, readable irregular footprints and unobstructed reciprocal stairs. Encounters vary by chamber purpose and approach. Exact combat speeds/ranges remain gameplay-owner tuning.

## Early integration contract

- `Dungeons.REVISION = 2`; `Dungeons.build(r,f)` returns `revision`, existing `tiles` values (0 wall, 1 floor, 2 water, 3 hazard, 4 bridge), `rooms`, `links`, stable `entities`, `entry`, and `opaque: Uint8Array(w*h)`.
- `opaque[i]` blocks sight and line of fire. Walls/structural cover are opaque; floor/bridges/water/hazards are transparent. Movement still follows the terrain/collision mask. No low-cover, height or material-specific attack rules.
- Scene dungeon maps expose `opaque` as their mutable sight/fire mask and `solid` as the movement mask. Closed gate/secret cells set both masks; opening clears both. Occupancy is separate. Gameplay owner should use `map.opaque || map.solid` for static LOS/fire geometry, with fair corner handling, and route pursuit through movement collision. I do not edit scene_b.js or interaction_rules.js.
- Dungeon progress keeps envelope `v:1` and adds `layout:2`; active expeditions add `layout:2` through the dungeon adapter. On first entry to an older region revision: invalidate stale tile exploration throughout that dungeon, retain gate/lore/kill/seal/claim/keeper state, relocate unexpired creature corpses by stable entity anchor, and relocate a legacy active expedition to its same-floor entrance even if the old coordinate happens to remain walkable. Other dungeon regions/characters/equipment/banks/story are preserved. This is an additive dungeon-local revision, independent of gameplay's character/technique schema.
- Stable cache/gate/note/monster IDs preserve their meaning. New geometry does not add payouts. Floor order and reciprocal travel stay unchanged. Starter region 1 floor 0 retains a protected arrival room; ordinary spawn territories remain outside it.

## Milestones

- [x] Audit reused; scope, ownership and terrain/revision contract recorded.
- [x] Author all floor plans and deterministic compiler: irregular rooms, wide halls, basins, opaque cover, explicit connections/shortcuts and encounter anchors.
- [x] Integrate terrain masks, accurate room membership, safe fixture dressing and dungeon-local save revision.
- [x] Meaningful all-floor geometry/progression/migration regression checks; retain reward/story/starter contracts.
- [x] Build isolated output; actual phone 390x720, landscape 844x390 and desktop captures opened; focused browser integration/navigation checks.
- [x] Reconcile owning docs, inspect diff, commit intended files and hand off integration contract/results.
- [x] Combined full exact-commit verification/publication and release closure by coordinator.

## Validation and evidence

Develop with Node floor/compiler, dungeon progress/play and architecture checks. Add browser regression for changed geometry/terrain/restore and captures. Read and update obsolete design-specific assertions explicitly; never reduce progression, reachability, isolation or reward guarantees to obtain passes. Full selector mappings remain unchanged; coordinator runs the authoritative full integrated gate.

2026-11-27 local evidence:

- 50 focused Node cases passed: dungeon layouts/progress/play, painted architecture, interaction reach, save compatibility and respawn. New regressions cover all-floor actual return savings (20–166 cardinal steps to the deeper control), opaque cover/movement separation, real room membership, protected starter territory, once-only revision reconciliation, retained earned progress/corpse loot, safe legacy active coordinates and the coordinated removal of guaranteed legacy rare Spell pages.
- After the final room-membership guard excluded solid cover from room labels, the affected floor/architecture group passed 15/15. The final isolated build and `git diff --check` also passed. The earlier failed browser launch was a local network-isolation/origin setup issue; the completed checks used an escalated localhost fixture, with no production permission or release changes.
- Isolated build succeeds with `BW_DIST=work/spatial-dist`; no generated output or artwork was manually edited. `test/capture-dungeon-spatial.cjs` generated 24 actual scene images at 390x720, 844x390 and 1280x800 plus eight atlases containing all 28 floor plans. All atlases and the actual scene contact sheets were opened; individual phone/landscape/desktop scenes were also opened at native resolution. Existing painted wall art supplies structural cover; no replacement furnishing or asset generation.
- All-floor real Scene opaque/solid/door regression passed phone Chromium, phone WebKit and desktop Chromium (3/3).
- Existing phone Chromium flows passed legacy account migration, five-character local/cloud save capacity, dungeon death/reload recovery and the complete three-floor Bilge component scenario with real controls/SQL/seals/keeper/vault/story table/reload/return (4/4). These are explicitly prepared component positions, not a newly earned complete expedition.
- Additional real legacy-layout account reload/corpse relocation regression passed phone Chromium, phone WebKit and desktop Chromium (3/3), retaining gold, bank, opened gate, read note, seal, keeper/claim and live corpse loot while resetting stale discovery and relocating to the same-floor landing.
- Combined exact-commit full verification, publication and hosted identity/hash are complete under the coordinator. Earlier isolated captures used baseline UI; the final combined UI/camera/combat checks and opened hosted landscape captures belong to the closed coordinated plan. Prepared component checks still do not establish a newly earned complete expedition or physical iPhone validation.

Integrated contracts: build.js loads dungeon_layouts.js immediately before dungeons.js. Scene uses Dungeons.roomAt(map.layout,P.x,P.y) for irregular-room labels, map.opaque || map.solid for corner-safe sight/fire, and solid plus occupancy for routing. Gameplay and UI adapters were integrated by their respective owners. Local captures/records under ignored work/ remain supplementary.

## Release closure

All 28 floor components, geometry/migration contracts and their combined live-combat/UI integration are covered by the coordinator's verified `32d5942` release. [Release history](../RELEASE_HISTORY.md#landscape-techniques-live-combat-and-dungeon-redesign) records exact source/Actions/hash, full required checks and hosted evidence. No complete newly earned 28-floor expedition, human balance judgment or physical iPhone test is claimed.
