# Skills, attributes and directional NPCs

Status: complete and released at aec11c0 on 2026-11-23. Classification: complex (progression, combat, movement, saves and shared rendering).

## Scope and acceptance

Casey authorized the complete skill/attribute and modular NPC design discussed on 2026-11-23, including testing and deployment. Preserve existing story, player possessions, world exploration and service identities. Use existing packed body/hair/equipment art; no paid image generation or art setting changes.

- Twenty skills: existing eleven plus Evaluating Intelligence, Meditation, Inscription, Resisting Spells, Tactics, Anatomy, Parrying, Stealth and Lockpicking. Paths remain starting presets, not class restrictions. Shared cap 700; individual caps/power scrolls remain meaningful.
- Raise/Lower/Lock and optional stop targets for each skill; only actual gains release donor points, with highest eligible donor first. Dojo training uses the same transaction and never charges for blocked gains. No offline decay. SQL learning records remain independent.
- STR/DEX/INT have separate controls, floors 10, individual caps 100 and combined cap 225. Use-based training, health from STR, mana from INT and stamina from DEX. Attribute development remains possible at skill cap. Save normalization covers every slot, cloud, import and reload with explicit version migration.
- Warrior support skills affect maneuvers, bandaging and shield blocks. Mage support skills affect spell power, mana recovery, wards and crafted scrolls. Hostile magic is distinguishable from physical attacks. Resource recovery never requires idle waiting or fast typing.
- Hiding conceals, Stealth permits a visible budget of concealed joystick steps, Stealing selects/obtains a prize. SQL setup/steal actions pause detection. Running/offensive actions reveal; meaningful approaches train once, not per frame/tile. No compulsory new skill gates on story routes.
- Lockpicking/disarming opens optional caches, not story seals/keys. Snooping is folded into prize selection. Carpentry gains a usable furniture/storage crafting loop. Fishing wrong-answer gains and SQL-tier forwarding are repaired.
- Human NPCs reuse the hero's eight-direction walking body, varied stable skin/hair/facial hair/outfits/colors and occupational accessories. Named identities stay authored/stable; regional extras deterministic. Stationary staff turn to the player. No humanoid replacement of actual creatures. Cache/memory behavior remains bounded.
- Additional proposed gathering, cooking, scouting, poisoning, mace, wrestling, bard and animal systems remain deferred; they were explicitly proposed for later rather than included in the first expansion.

## Milestones

1. [x] Pure progression rules, caps, controls, stop targets, attributes/resources, migration and focused regressions.
2. [x] Game integration: controls/HUD, training, combat supports/resources, useful crafting and optional locks.
3. [x] Physical stealth, prize selection and meaningful gain paths; source audit fixes.
4. [x] Modular human NPC appearances/directional animation, cache bounds and visual regressions.
5. [x] Master documentation reconciliation; focused tests; full `npm run verify -- --ui`; open phone (390x720) and desktop captures.
6. [x] Intended commit/push to main, exact-commit Actions success, published commit/HTML SHA-256 and independent hosted player flow.
7. [x] Close plan and RELEASE_HISTORY with durable evidence; commit/push docs closure without redeploying unchanged game.

## Verification

Pure tests cover tenths arithmetic, donor exhaustion/partial room, locks/targets, boosted gains, blocked/no-charge training, stat floors/caps, no loss on failed gains, preserved SQL history and all-slot migration. Combat rules cover support differences, physical/magic defenses, resource costs/recovery and bounded training per query. Browser tests exercise visible controls, stop targets, at-cap replacement, actual SQL combat/recovery/crafting/lockpicking/stealth and save-code/reload. NPC tests inspect eight directions, actual motion, skin/clothing variation, stable named appearances and interaction-facing on phone Chromium/WebKit and desktop. Existing required suites remain unchanged in strength. Prepared advanced fixtures do not establish natural-progression balance or real iPhone behavior.

## Evidence and release

Initial working tree clean at a2ae774. All implementation and release milestones are complete. Twenty-three focused pure checks passed. An exploratory 18-case browser pass had three arrow-label assertion mismatches (corrected); its other fifteen passed. The updated 27-case phone Chromium/WebKit/desktop focus passed. Subsequent affordability/cancellation and Circle-eight dungeon checks passed 9/9 after honoring the existing 450ms keyboard redraw guard in the cancellation fixture. Final local/CI gates, deployment and independent live verification passed as recorded below. The main agent integrated two bounded workers covering NPC rendering and progression regressions. Cost reporting uses existing billing evidence only; private billing is never committed.

- First full gate passed the non-browser suites and progressed into WebKit. It exposed stale v7 storage reads in arrival/upstairs fixtures and a real phone chart-visibility regression from showing adventure-only controls on map/character pages. Stopped the failing run to repair these before a clean required gate; original assertions remain. Cloud replacement/cancellation and blocked-diagonal regressions are included in the final coverage.

- All eighteen targeted repair checks passed on phone Chromium/WebKit and desktop: chart visibility, arrival/upstairs save persistence, all-slot cloud replacement during combat, Hero controls/import and native diagonal collision. Source frozen for the clean 243-case required gate.

- Clean attempt two exposed a test-navigation race: a newly requested NPC body sheet was aborted by the travel test's intentional reload (the arrival/state assertions themselves passed). Test navigation now waits for network quiescence before deliberate reloads/direct game navigation, preserving every image/console-error assertion. The game source remains frozen; rerun the affected cases before the required gate.

- Navigation synchronization passed all 24 affected cases (two repetitions on each of three browser projects), with all original persistence, fog visibility and error assertions retained. Clean required gate restarted against the unchanged gameplay source and final test harness.

- 2026-11-23 local required gate: `npm run verify -- --ui` exited 0. All non-browser suites passed (including ALL GOOD and 525 packed assets), and all 243 browser cases passed with four local workers, no retries and no skipped cases. Opened final phone skill/combat/stealth/NPC and desktop skill/NPC/dojo captures. Gameplay and assets remained frozen during the clean pass.

- Released source: `aec11c0124479aee5feb0d906f871a15e2a6f1aa`, committed and pushed to main. [Actions 45237450851](https://github.com/caseyschindler123/Brasswake/actions/runs/45237450851) passed the complete gate, all 243 browser cases (54.3 minutes), deployment, exact hosted commit/HTML check and one hosted player-flow case.
- Independent live verification: 2026-11-23 19:22:41.224 UTC; `npm run test:live` with UI explicitly enabled passed the exact commit/hash and one hosted phone-Chromium flow covering real SQL, skill controls, export/import and reload. Opened hosted world and restored-character captures. HTML SHA-256: `c3096af4bde8a6c12492fd785f78415f1fc102d34255e52df60d38149c18a1e9`.
- Durable closure: [release history](../RELEASE_HISTORY.md#skills-attributes-and-directional-npcs) records the verified source and limitations; this Markdown-only closure does not redeploy the game. No real iPhone or human learning/natural-progression balance study was performed.
