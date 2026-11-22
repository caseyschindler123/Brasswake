# All eight dungeons: full rebuild

Status: implementation and art complete; browser traversal/visual verification in progress. Classification: complex (map architecture, encounter/progression rules, persistent exploration, rendering, new art and complete UI playthroughs).

## Authorized outcome

Casey requested the entire rebuild, including all required images and additional monsters, followed by playing every dungeon through the real UI. Deliver all eight together; no prototype release. Use UO's stable geography, multiple levels, memorable hunting territories, branching routes and growing danger as the model. Preserve existing unrelated sound/magic work. Existing art/prompt master and model/quality settings stay untouched; request any remaining specific art authorization required by the existing pipeline before a paid full run.

## Scope and acceptance

- Replace the shared four-room random corridor with 28 authored, editable tile floors across eight distinct dungeons. Floor dimensions and topology are data, not hard-coded scene rules. At least 12 named spaces, two loops and three optional branches per ordinary floor; at least 1,200 connected walkable tiles per floor. Main-route travel must span at least 150 tiles across meaningful destinations, with optional exploration extending it.
- Bilge Vaults, Sunken Sluice, Old Barrows and Tanglewarren: three floors each. Slagdeep, Crystal Vaults, Ice Halls and Sealed Stacks: four floors each. Each has its own room names, materials, layout, interactions and monster territories.
- 24–32 roaming creatures per floor, distributed into hunting areas; most encounters optional. Two new creature species per dungeon plus suitable existing wildlife, lair creatures and regional monsters. Distinguish skirmishers, armored enemies and casters in combat. Respawn ordinary creatures in 5 minutes, lieutenants in 15 minutes; no spawn on the player, stairs, doors or rewards.
- Each floor has a named lieutenant and an optional cache, readable discovery and useful interaction. Earlier-floor lieutenants award permanent seals for that day's vault; the final keeper protects the lost table and vault. Vault and caches pay once per character per day. Named-rare pity remains. Returning players can farm monsters, explore branches and revisit named areas.
- Include operating floodgates, burial seals, webbed/overgrown passages, forge valves, crystal switches, ice barriers and archive controls using shared interaction rules with distinct copy and art. Secret rooms reveal through nearby investigation; hazards warn visibly and have bypasses. Progression never requires guessing an invisible tile or taking unavoidable damage.
- Preserve the brief guided first-day Bilge visit using an accessible entrance-wing guardian and starter chest. The ordinary dungeon remains fully available after the guide. Preserve the eight lost tables, main/supporting-character restrictions, SQL teaching Circles, spell pages and named rares.
- Save discovered tiles, opened passages, claimed rewards, defeated important enemies and current dungeon floor/position. Re-entry keeps stable geography. Reload/export/import resumes safely. Death leaves recoverable belongings at the surface entrance, explicitly explained in UI. Save version increments with migration from the existing account.
- Clear floor/area label, explored minimap, floor travel, exit and return directions; touch controls readable at 390×720 and desktop. Use themed textured floors, walls, liquid/hazard cells, transparent props and correctly scaled creature art. No giant whole-dungeon images.
- Fix hunt-errand crashes on dungeon kills and keeper/chest occupancy overlaps. Validate all spawns, stairs, loot and objective reachability.

## Content schedule

| Dungeon | Floors | Identity and route | New inhabitants |
|---|---|---|---|
| Bilge Vaults | Rope Cellars; Flooded Stores; Drowned Court | harbour storerooms, flooded bypasses, pump controls, drowned stronghold | Bilge Scavenger; Barnacle Guard |
| Sunken Sluice | Gatehouse; Reed Channels; Root Reservoir | branching channels, bridges, sluice wheels, reed islands | Sluice Stalker; Reed Hexer |
| Old Barrows | Outer Tombs; Kings' Passage; Burial Court | connected tombs, circular galleries, burial seals, hidden offerings | Barrow Soldier; Grave Tender |
| Tanglewarren | Rootways; Silk Galleries; Wyrm Hollow | winding tunnels, loops, webs, mushroom chambers | Root Crawler; Silk Widow |
| Slagdeep | Cooling Works; Foundry; Ventworks; Crucible | industrial halls, furnace bridges, vent valves, forge waste | Furnace Hound; Slag Binder |
| Crystal Vaults | Shard Caves; Resonant Galleries; Mirror Wells; Crystal Heart | natural caverns, crystal clusters, light switches, reflected passages | Shardling; Crystal Seer |
| Ice Halls | Lower Galleries; Frozen Cistern; Wind Passages; Winter Court | frozen halls, snow caves, cracked barriers, sheltering alcoves | Rime Wolf; Icebound Guard |
| Sealed Stacks | Closed Reading Rooms; Record Stores; Restricted Wing; Old Archive | shelves, document vaults, clockwork controls, secret records | Index Automaton; Ink Familiar |

These names are authored content targets. Briefs and floor data are the editable source of truth once implemented.

## Architecture

1. `src/dungeons.js`: standalone `Dungeons` IIFE/CommonJS module. Definitions contain floor ids/names, dimensions, named room rectangles, corridor paths/graph, tile features, explicit entity anchors and species/territory metadata. Compile to terrain/collision layers with deterministic ids. Pure connectivity and occupancy validation can run under Node. No game state or canvas dependencies.
2. Scene adapter compiles data into the existing Scene map, paints themed layers using packed art, handles fog/minimap and roaming/respawn. All rules use HOST callbacks. Floor state crosses the boundary as plain data; no reads of S in Scene.
3. Game owns dungeon progress, reward gates, key/seal/interaction rules, combat profiles, save/migration, floor transitions, tutorial and story integration. Persistent ids are dungeon/floor/entity ids. No game rules in generated art data.
4. New art lives in separate dungeon atlases/textures and generated `src/artdungeon.js`; no repack of accepted existing atlases. Pack deterministically, record inputs/crops/hashes, extend asset manifest deliberately, verify pixels/dimensions and inspect contact sheets and runtime screenshots. Preserve original output names and raw sources.

## Milestones

- [x] Audit baseline, read workflows, define complete content/architecture/acceptance and verification.
- [x] Author/validate 28 floor definitions and all creature/interaction metadata.
- [x] Inventory art; produce a small representative kit, inspect, then produce all required assets within existing authorization/settings. Pack and validate separate atlases.
- [x] Implement scene construction, art, population, movement, minimap/fog and floor transitions.
- [x] Implement persistent progression, interactions, combat profiles, daily rewards, tutorial, recovery and save migration.
- [x] Add/run meaningful Node tests for graph/occupancy/progression invariants and browser regressions.
- [ ] Play through all eight dungeons in the actual rendered UI; inspect screenshots on phone and desktop and correct all defects. Record measured traversal, queries, encounters and any pacing limitations.
- [ ] Review final diff/acceptance; update master docs and dated logs; run `cd game; npm run verify -- --ui`.
- [ ] Commit intended files only, push main, monitor exact GitHub Actions SHA, verify published commit/HTML hash and hosted player flow.

## Verification matrix

- Every floor: deterministic layout, floor-size/topology targets, connected rooms, unique ids, no entity overlap, valid tiles, reciprocal stairs, reachable objectives, optional branches and bypasses, population bounds and available art references.
- Game rules: ordinary/lieutenant/keeper victory with active hunt errands; seal requirements; repeat caches/vaults; keeper and lost-table gating; supporting characters; daily reset; skill/monster profiles; respawn exclusion; missing/malformed saved floor fallback.
- Persistence: v6 migration to new version, reload mid-floor, export/import, return to cleared floor, exit/re-enter, slot switching, death and body recovery, surface coordinates preserved.
- UI: enter from surface, walk the actual route, fight with SQL through visible controls, use a route interaction, explore optional branch/cache, descend every floor, defeat lieutenants and keeper, claim vault/table, return outside, re-enter and reload. Do not count debug teleports or direct reward grants as a completed playthrough. Disposable test accounts may supply region-appropriate equipment/skills/pages to bound setup; report this separately from natural progression balance.
- Run complete expeditions through all eight in phone Chromium at 390×720 with `cd game; npm run test:dungeons`. These acceptance runs use actual canvas walking throughout each dungeon and its return route. Keep them separate from the regular release gate so CI does not repeat hours of traversal. The regular `npm run verify` still exercises every floor of every dungeon in phone Chromium/WebKit and desktop Chromium through visible controls, SQL combat, caches, keeper, vault, lost table, map, stairs, reload and surface return, using explicit prepared component positions and frozen unrelated patrols. Record component evidence separately; it never counts as an expedition. Open and inspect at least entrance, representative interaction/encounter and deepest-vault screenshots per dungeon; inspect additional floor screenshots where themes/layouts differ. Browser emulation is not real iPhone testing.
- Required release suite runs once ready, repeat affected checks after any repairs. No skipped failure, weakened assertion or hidden art baseline refresh.

## Evidence so far

- All 28 floor layouts pass Node validation: 16–19 named spaces, 26–32 ordinary creatures, 2,692–3,742 connected safe tiles, and 201–315 steps along the mandatory route with optional doors closed. Optional shortcuts save 40–48 steps to their branch.
- 17 focused dungeon layout/progression/controller tests pass. Original guided dungeon/chest/dojo flow and dungeon visual fixture pass on phone Chromium. Full expeditions are in progress.
- All 15 raw images were generated with the unchanged existing image script, model and high quality settings. Full packed contacts were opened, including both orientations of all eight gate themes. Five art-tool tests passed; deterministic replay matched all three atlas hashes and coordinate JS; exact manifest check reports 489 files, zero missing/extra/different. Final packed atlases contain 32 material textures, 48 props/barriers and 16 static creatures. New creatures use rotated living sprites for fallen bodies; no separate walk/fall sheets are claimed.
- New raw outputs are archived with original names under `SQL Game/dungeon_2026-11-22/out`, with working copies in ignored `work/dungeon-art/out`; briefs and recorded input hashes/crops are checked in under `arttools/dungeon_*`.
- The other sound/magic task committed independently as `7956eaa`; its work is preserved.

- Visual review caught the legacy floor-decoration loop repainting the generated dungeon textures. Dungeon maps now bypass that loop; browser tests compare sampled chunk pixels with the packed material atlas.
- Full expeditions use an immutable release-candidate snapshot on their own Node loopback server. A reusable `npm run test:dungeons` runner is committed; its syntax/list-only build validation lists exactly eight expeditions and verifies snapshot metadata.

## Risks and release receipt

- Other active work touches shared scene/game/build/docs. Preserve and coordinate integration; do not stage unrelated edits or publish another task's partial work.
- Large dungeons need suitable click pathing range, camera bounds, corpse/respawn persistence and bounded drawing cost.
- SQL encounter duration varies widely. Report actual tested setup and observed counts; do not claim measured natural-progression playtime from accelerated fixtures.
- Art availability, script credentials and approval constraints must be checked without exposing secrets. A blocked image step does not justify shipping placeholders or declaring completion.
- Commit: pending. Required suite: pending. All-eight UI playthrough: pending. Deployment/live hash: pending.
