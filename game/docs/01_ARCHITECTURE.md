# Brasswake: architecture and engineering practice

The repository is the source of truth for source code, packed art, tools and project memory. `game/docs/` holds the master context documents. Casey's local agent maintains the repo, art pipeline and docs directly. The base64 backup and Claude project copies are no longer the development source. The PC checkout is `C:\Users\caseys\source\Brasswake`; the remote is `https://github.com/caseyschindler123/Brasswake`. The hosted game is at `https://caseyschindler123.github.io/Brasswake/`.

Last updated: 2026-11-23. Pages releases are identified by the source commit and HTML hash in `release.json`; [release history](RELEASE_HISTORY.md) preserves verified release status and evidence. The verified skills/attributes/NPC release adds controlled progression, STR/DEX/INT resources, functional support skills and shared directional human rendering, with account v8/character v7 migration. The verified cartography/joystick/venues release adds exploration, map shops, conditional travel, actual indoor storeys and purposeful regional premises; its completion evidence is in the plan and release history. World revision 3 adds the shaped island world, working ports, modular construction and expanded capital. The story and first-day revision adds isolated manifest teaching, a moving guide, complete dialogue beats and calibrated paper-doll grips. The dungeon rebuild has 28 authored floors and persistent expeditions. The integrated soundtrack release adds 28 contextual tracks and cues using existing Suno music and original local MIDI. Earlier releases added eight spell presentations, contextual sound effects, SQL comment handling and readable combat and fishing controls. The retained artifact preview is pass 29 (walk-in rooms in Tallyport), version `1795364400-6a70`. (Two artifact publishes carry the label "Pass 26": the audio one and the keyboard one. Go by version id.)

## Starting a new session

Root `AGENTS.md` applies `05_CODING_WORKFLOW.md`: Codex classifies, plans proportionally, develops and checks the affected behavior. Documentation and Codex instructions need review and a diff check, with no game tests or deployment; tooling uses focused checks. Both classes of game changes deploy automatically after release verification. Local-only/no-deploy requests mean no commit or push. The main agent delegates only when bounded independent work justifies its cost. Completion messages include available task costs; unknown billing stays unavailable.

Read these master docs before changing their topic: 01 architecture, 02 gameplay, 03 art, 04 writing, 05 coding workflow. `game/STYLE.md` is a byte-for-byte copy of `game/docs/04_WRITING_STYLE.md`; update the master first and copy it when writing rules change.

On a new machine, clone the repository using the URL Casey supplies, then install, build and test:

```powershell
git clone https://github.com/caseyschindler123/Brasswake.git Brasswake
cd Brasswake/game
npm ci
npm run verify
```

The test must print `ALL GOOD`. On this PC, use the existing checkout. Edit `game/src/`, build and test, update the relevant master docs and their dated Decision log, then commit. Never hand-edit `game/dist/index.html`. Push to `main` to run validation and deploy through GitHub Actions; pull requests validate without deploying. The base64 restore and backup workflow is retired.

| What | Where | Notes |
|---|---|---|
| Game source, build, tests and context docs | `game/` in this repo | `game/docs/` is the project's memory. |
| Packed art, fonts and music | `game/art/`, committed | `node build.js` copies this whole tree to `game/dist/art/`. Fonts and `mu/` are source assets; the art pipeline leaves them alone. |
| Art pipeline and accepted output hashes/dimensions | `arttools/`, `arttools/packed_manifest.json` | The old live manifest remains a comparison reference. |
| Recorded cuts and prompt snapshot | `art/sliced/manifest.json`, `art/base/art_prompts.json` | Only the manifest is stored here; no sliced pieces or raw sheets are committed. The prompt snapshot does not override Casey's master. |
| Raw art, master prompts and image script | `C:\Users\caseys\source\SQL Game` | Read-only during rebuilds. The master prompts and `make_art.py` are in `kit/`; current PNGs are in `kit/out/`. Never commit this folder. |
| Release completion summaries | `game/docs/RELEASE_HISTORY.md` and linked plans | Tracked commit/run/hash evidence and limitations; local receipts are supplementary. |
| Sliced pieces, extracted ZIPs, local environments and logs | ignored `work/` | Disposable build inputs and diagnostics, not the sole source of release status. |
| Built site | ignored `game/dist/` | Build output, served locally for visual checks. |
| Hosted game | `https://caseyschindler123.github.io/Brasswake/` | GitHub Pages; publishes automatically after a successful push workflow on `main`. |
| Artifact preview | Claude artifact `3c61f5cf-5c3e-4ea3-92c3-8f59472dd858` | Live reference `1795364400-6a70`; publishing is separate from committing. |

### Art rebuild and baseline

Install `arttools/requirements.txt` in a local Python environment, then run from the repo root:

```powershell
work/.venv-live/Scripts/python.exe -I arttools/build_art.py "C:\Users\caseys\source\SQL Game"
work/.venv-live/Scripts/python.exe -I arttools/verify_art.py --manifest arttools/packed_manifest.json
```

The entry point runs slice, UI, main (including the later 64-creature extension), dojo, body and kit packs. Outputs go to `game/art/`; generated coordinate files go to `game/src/art*.js`. `work/sliced/` is reconstructed using the recorded boxes, foot points and cell indices. Whole-image processing is preserved. No image generation runs.

The accepted local packed files and dimensions are recorded in `arttools/packed_manifest.json`. Pin Pillow 12.0.0: Pillow 13 changed resized output hashes, while 12 reproduces the old UI and most atlases. The full result is 484 exact asset hashes and two accepted encoding/library differences, with no missing or extra files. Before accepting any encoding differences, require unchanged generated coordinate JS, dimensions consistent with the original packer geometry, and the phone-size visual checks below. Keep missing art, changed placement or changed dimensions as pipeline defects. Never regenerate or edit raw images to force a match. The old live manifest stores hashes and byte sizes but no dimensions; without its image bytes there is no direct live pixel measurement to report.

## What it is

The game is one self-contained HTML page, `dist/index.html`, plus the committed assets copied to `dist/art/`. `arttools/packed_manifest.json` is authoritative for asset paths, hashes, dimensions and count. GitHub Pages publishes them together. The separate retained Claude artifact preview is older:
- slug `3c61f5cf-5c3e-4ea3-92c3-8f59472dd858`
- https://claude.ai/artifact/8TU29g27SqEknG1MYuJB3u

It is played mostly in the Claude iOS app at roughly 390×720 CSS px with a device pixel ratio of 3. Everything must work by touch on a phone.

There is no framework and no bundler. Plain browser JavaScript modules are written as IIFEs (`const Name = (() => { ... return {...}; })();`) and concatenated in a fixed order. SQL runs in the browser through sql.js (the asm build, loaded from cdnjs) against a seeded in-memory SQLite database.

## Source layout (`game/` in the repo)

| Path | Role |
|---|---|
| `build.js` | Concatenates `src/*.js` in order into `shell.html` with `style.css` inlined, writes `dist/index.html` and `release.json` (source commit and HTML SHA-256), and copies `art/` to `dist/art/`. `BW_DIST`, `BW_ART_JS` and `BW_WORLD_ART_JS` build isolated snapshots against stand-in or prototype art. |
| `src/progression.js`, `src/sneaking.js`, `src/skill_crafting.js` | Pure twenty-skill/attribute cap transactions, resource/combat helpers, temporary concealment rules and optional profession/lock rules. Loaded before game.js; CommonJS exports support focused regression tests. |
| `src/npc_appearance.js` | Stable authored/regional human appearance recipes and material transforms; Scene lazily composes the existing body layers through a bounded frame LRU. |
| `src/geography.js` | Pure deterministic mainland/island masks, regional anchors, city envelopes, mainland road links and ferry recommendations. |
| `src/cartography.js`, `src/cartography_screen.js` | surface chart rules, compact exploration, entitlement/travel checks, map-shop/waypoint/Atlas screens and versioned save bridge. CartographyScreen receives game adapters; Scene receives plain mask/map/revision data. |
| `src/navigation.js`, `src/scene_cartography.js` | bounded actual-ground/ferry routing, masked map/minimap canvases, physical shops/signs, safe destination catalogue and installed household atlas. |
| `src/interiors.js`, `src/scene_venues.js` | regional frontages/civic premises and modular indoor floor plans, service staff placement, actual door animation, exact-footprint upper rooms and bounded indoor save references. |
| `src/scene_controls.js`, `src/water_depth.js` | Scene manual joystick/keyboard input and pure natural-shore shallow-water classification. Screen taps only interact nearby or explicitly choose a house plot. |
| `src/artcartography.js` | Generated CartographyArt rectangles for three new independently packed shop/sign/atlas/region sheets. |
| `src/world_progress.js` | In-place world revision 3 migration for all character slots, shared homes, surface corpses and dungeon return anchors. Floor-local dungeon data is unchanged. |
| `src/buildings.js`, `src/building_view.js`, `src/building_cache.js` | Pure blueprint compiler and canvas layer builder. Floor/roof masks, walls and real doors share one plan; rectangular, L and courtyard footprints are supported. Generated building layers use a 32 MiB byte-budgeted LRU; views used by the current frame survive until drawing finishes, and evicted canvases release their backing surfaces. |
| `src/scene_world.js` | Scene IIFE fragment before scene_b: stamps modular structures, capital districts, working harbours, ferry landings and sea-only map paths; uses WorldArt through Scene’s loader. |
| `src/artworld.js` | Generated WorldArt rectangles and atlas file list, packed by arttools/world_art.py from recorded source hashes. |
| `src/world_services.js` | Pure ferry terminal/proximity validation and specialist stock definitions, loaded before game.js. |
| `src/world.js` | `World`: the Ledger database, a fictional trading company. Schema (employees, customers, vendors, items, orders, order_lines, invoices, purchase_orders, po_lines, and more) and deterministic seed data. |
| `src/quests.js` | `Content`: every piece of static content. Regions, contracts (exercises), bounties, bosses, rumors, uniques, monsters, lairs, dungeons, rivals, recipes, pages and books, food, settlers, houses, paint, fish, folk and talk lines. It also runs under Node, which the tests use. |
| `src/dungeons.js` | `Dungeons`: editable diagrams, room names, tile crossings, encounter territories, species and stable entity anchors for all 28 dungeon floors. Pure deterministic compilation, also available under Node. |
| `src/dungeon_progress.js`, `src/dungeon_play.js` | `DungeonProgress` owns pure save/reward/respawn rules; `DungeonPlay` owns dungeon interactions, combat profiles and travel through an explicit game adapter. |
| `src/scene_dungeon.js` | Scene part between `scene_a.js` and `scene_b.js` inside the same IIFE: builds dungeon maps, spawns inhabitants, paints textures, opens passages and maintains the explored minimap. |
| `src/artdungeon.js` | Generated `DungeonArt` atlas rectangles. Rebuild with `arttools/dungeon_art.py`; never edit coordinates by hand. |
| `src/engine.js` | `Engine`: runs SQL on a read-only copy plus a sandbox, grades a query against the answer (correct / close / partial / wrong, with row overlap), and detects which SQL techniques a query used. |
| `src/first_day.js` | Three-row read-only teaching manifest, six scaffolded tasks and authored dialogue boundaries. Practice uses Engine.scratch; the final two tasks explicitly enter the full town records. |
| `src/companion.js` | Bounded pure cardinal routing for Tamsin. Scene owns movement; game callbacks control when following and speech are appropriate. |
| `src/deep.js` | `Deep`: the Lost Ledger story layer. Nine lost tables, twelve Great Truths, Ilva's letter. |
| `src/dojo.js` | `Dojo`: dojo masters, students, travellers, Sorrel Ashby, prizes, lines. |
| `src/sqled.js` | `SqlEd`: the SQL editor, syntax highlighting, and the custom phone keyboard helpers. |
| `src/artdata.js`, `artdojo.js`, `artbody.js`, `artkit.js` | Generated by the art packers: atlas coordinates and anchors. Never edit by hand. `artkit.js` (from `kit_pack.py`) holds the building-kit pieces in `art/kit/k1.webp`. |
| `src/scene_a.js` | Scene part 1: canvas setup, image loading, atlas cutting (`cut`), creature art (`artMob`, with per-creature scale `MSC`), fallback sprites. |
| `src/scene_b.js` | Scene part 2: world generation (`genWorld`), ground painting, props, mountains, towns, dojo halls (`genHall`), the hero paper doll (`dollSprite`, `recolor`, `dollFx`), movement, chase AI, respawn, corpses, the draw loop, fight effects. It exposes `Scene` and talks to the game only through the `host` (HOST) object. |
| `src/poker.js`, `casino.js` | Card room (hold'em), the Crooked Wheel and the Count (blackjack). |
| `src/effects.js` | `Effects`: presentation definitions for the eight spell Circles, rare-page emphasis, creature sound families, and bounded canvas cast/projectile/impact drawings. Loaded before the scene and audio; changes no combat rules. |
| `src/audio.js` | `Sound`: 28 music tracks/cues plus synthesized effects (Web Audio). `MUSIC` holds loop points and one-shot flags; `trackFor` selects title, combat, dungeon, venue, town or shared wilderness music from a source callback. `Scene.musicContext()` provides presentation-only location facts. A 400 ms tick crossfades (normally 1.6 s), keeps two decoded tracks, and serializes loads; stale requests recheck context. Victory/death musical cues obey music mute independently of effects. A shared compressor protects the mix, finished effect voices disconnect, and footsteps/doors/clicks are throttled. Sound settings stay in localStorage `brasswake.sound`, outside saves. |
| `src/game.js` | Everything else, about 280 KB. `soundUp()` wires `Sound` in: the music source, query-grade cues, actual weapon/spell selection for `Scene.FX.swing`, successful currency-action cues, and clicks on `.btn`. Scene emits presentation cues through `HOST.sound`; it never reads game state. Spell and arrow hits attach to a pending projectile and present on arrival (0.26 s); scene transitions clear pending effects. Positive healing numbers never use damage flashes or repeat the healing cue.<ul><li>state `S` and the account `A`, save and cloud sync</li><li>combat, skills, items, the economy</li><li>the guided first day (`GD`), dojo tournaments and duels (`DU`), fishing</li><li>houses, banks, appearance, all sheets and menus</li><li>the action table `ACT`, interaction handlers `SH`, and `HOST` for the scene</li></ul> |
| `src/style.css`, `shell.html` | Styles (a painted-UI skin at the end) and the page shell. |
| `test/scenarios/` | Scenario scripts for `dbg.py` (guided day, dojo, death and bless, houses, account slots, sizes, looks, spawns, names). |
| `test/` | Engine/content, poker, casino, sound/magic, and workflow tests. `verify.js` is the shared release gate; `select-tests.js` selects relevant UI tests. `server.js`, `browser/`, and `playwright.config.js` provide browser coverage; `live.js` verifies a published release. |
| `STYLE.md` | Writing rules (= `docs/04_WRITING_STYLE.md`). |
| `PLAN_LIVING_WORLD.md` | Pass-by-pass engineering notes. |
| `docs/` | Master context documents and project memory, maintained in this repository. |

Art tools live in repo-root `arttools/`, including `build_art.py`, `slice.py`, the packers, `verify_art.py`, contact-sheet tools and stand-in generators. Music tools, editable original MIDI scores and the measured soundtrack catalog are in `arttools/music/`; the art rebuild does not run them. The new pipeline locally renders original instruments and prepares existing Suno downloads into MP3 loops and PCM WAV cues; it never contacts Suno. Audio source and asset regressions run in the release gate. See 03_ART_STYLE.md for inputs and generation rules.

## Runtime structure

- **Game ↔ Scene boundary.** `Scene` (scene_a/b) draws and moves things. It never reads game state directly; it asks the `host` (HOST in game.js) for things like `app()`, `tpls(r)`, `habitat(tpl)`, `mark(e)`, `interact(e)`, and `spawn(tpl)`. The game drives the scene through `Scene.load`, `Scene.FX.*`, `Scene.corpse`, `Scene.remains`, `Scene.emptied`, `Scene.enterHall`, and so on. Keep this boundary: new world behaviour goes in the scene behind a host callback, and new rules go in the game.
- **Entities** are plain objects in `map.ents`. `kind` is one of: mon, npc, folk, banker, boss, corpse, chest, node, home, master, student, dummy, and others. Tapping calls `SH[kind](e)`.
- **UI** is HTML strings rendered into fixed containers:
  - `#sheet`: bottom sheet
  - `#say`: dialogue
  - `#fight`: fight panel
  - `#enc`: exercise
  - `#title`: title and character select
  - `#toast`, `#hud`, `#nav`

  Buttons carry `data-a="action"` plus `data-*` arguments. One delegated listener calls `ACT[a](dataset)`. Every new button is an `ACT` entry.
- **Query keyboard** (`kbDraw`/`kbPress` in game.js, helpers in sqled.js). A bar (Commands, Fields, Format); letter rows; a bottom row 123, ⌨, `,` `*` `'`, space, return, Run (the three symbol keys are hidden on the 123 layer, which has them, and on the phone keyboard); a 123 layer with the full symbol set. The Commands panel opens with a top row `,` `*` `'` and a Symbols ▾ button (`KB.lsym`) that shows the rest of the Symbols group, then only the commands the account has been taught (see 02_GAMEPLAY.md, Learned commands). The Fields panel's bottom row is Done, `,`, `*`, backspace, Run; the Commands panel's is Done, backspace, Run.
- **Curly quotes** are added to displayed text automatically by a MutationObserver. Code, SQL, tables and the editor are skipped.

## State and saves

- **Account `A`** (save version 8, localStorage key `brasswake.acct.v8`, cloud doc `data/users/{id}/acct`), with these fields:
  - `v`, `rev`, `at`
  - `cur`: active slot
  - `main`: the slot whose character carries the story
  - `slots[5]`: each slot holds a character save or null
  - `homes`: shared houses and their chests
  - `codex`: named rares found, shared so only one copy exists
  - `paid`: exercises and Great Truths already paid out
  - `djp`: dojo champion and master payouts already made
  - `cmds`: learned commands, `{ lessonKey: 1 taught | 2 learned }`, keyed by the lesson ids in `CMDS` (quests.js). Added without a version bump: `freshA()` supplies it and `cmdBackfill()` fills it from each slot's `seen`/`done` on boot, after a newer cloud save replaces the local one, and after a save-code import. Any new path that replaces `A` must call it too.
- **Character `S`** (version 7): the active slot, migrated through `migrate()`. On load, `linkS` points `S.homes` and `S.codex` at the account's arrays. `slotOut` strips them before storing. Banks are per character (`S.bank`).
- **World revision:** `WorldProgress.revision` is 3, separate from account v8 and character v7. `loadCur()` migrates all raw slots and account homes before fresh defaults merge; per-slot `wv` and account `wv` prevent repeated translation. Old town-relative surface positions, death returns, surface bodies and dungeon `.back` move to the new geography. Dungeon-local positions, explored bits, loot and progress stay intact. `Scene.restoreHomes` validates actual generated collision before loading the hero, preserving IDs/contents/footprints/paint; a safe existing plot stays fixed. `Scene.safePosition` resolves surface positions onto reachable dry cells and preserves the requested region for fallback. Import, cloud replacement and slot selection use the same restoration path. Travel records the actual snapped position before saving. Required homesteads, POIs and lairs use a deterministic reachable-plot fallback instead of disappearing when island space is tighter. Saved find/delivery errands retain their IDs, progress and rewards while their displayed target names and compass directions reconcile with the new sites.
- **Cartography state:** `S.cartography.v=1` owns compact four-tile exploration groups, eight boolean map entitlements and one stable-id waypoint. Active masks decode once; walking batches a device save within 1.5 seconds. Snapshots encode before export/cloud/slot saves; legacy saves seed known town anchors and recorded discoveries, without granting purchased maps. Unknown terrain is opaque black on map and minimap; surveyed pixels are muted. Preview and current maps have independent cached canvases. Public destination IDs resolve against the live registry, never caller-supplied coordinates. `CartographyScreen` checks live shop/house sessions, active character/account, purse and location on each action. `A.atlas={owned:true,homeId}` is a shared installed furnishing; the using character still needs all eight maps.
- **Upper-room state:** `S.interior` is a bounded version-1 `{id,r,f,x,y,back}` reference. All 24 upper floors match their supporting structure, including courtyard holes; stairs share a local tile between levels. Scene exposes `inInterior`, `venueState` and validated restoration. Physical-world position remains in `S.pos`; upstairs movement autosaves local coordinates. `sceneOwner` prevents saving an old scene into a newly selected slot. New-character arrival rebinds ownership. Death recovery places indoor belongings at the ground stair. Cartography, surface corpses, birds, outdoor lighting and music distinguish upper rooms from the world and real dungeon expeditions. World revision 3 and additive cartography/interior subsystem versions remain compatible with the account v8/character v7 progression migration.
- **Dungeon state:** `S.dungeon` is the active `{r,f,x,y,back,tutorial}` expedition; `S.dungeons[r]` stores a version, local reward day, compact explored-tile bitsets per floor, opened gates, read notes, kill timestamps, unexpired corpse contents, daily floor seals, keeper unlock and claimed container ids. `DG` is an ephemeral game adapter for the current expedition. Scene receives plain progress data through HOST and never reads S. `save()` snapshots explored terrain/corpses and current position; reload/import/cloud replacement/slot selection restore a valid floor and safe coordinate.
- **Migration:** account v8 reads v7/v6 keys and accepts v6/v7/v8 save codes/cloud/hot reload. Every occupied slot passes character v5/v6/v7 migration before activation. Character v7 adds normalized skill modes/targets, STR/DEX/INT modes/targets and bounded mana/stamina, prepared scrolls/furniture and daily optional-lock openings. Valid possessions, banks, story, SQL learning and exploration persist; malformed progression is bounded to known ids/caps. World revision remains 3. Old skill values remain; default attribute presets follow the character path. Concealment is ephemeral and clears on reload, import, slot switch and scene relocation. No wipe. New writes use account v8/character v7.

- **Death transaction:** a fatal fight drops belongings and records `S.deathPending` plus the healer surface position before saving the defeat screen. Reload resolves that pending wake before restoring any dungeon. Normal waking clears it without charging or dropping equipment twice. Surface returns materialize only the current slot's saved remains. Movement autosaves are throttled/debounced, page hide/visibility flushes the latest state, and export snapshots discoveries before serializing the account.
- `save()` bumps both revs, writes localStorage, and schedules a cloud flush through `window.claude.use('db')` when available. The newest `rev` wins.
- **Changing the save format:** bump the version, make `freshA()` and `fresh()` defaults cover the new fields, and record it in the decision log. Old save keys starting with `brasswake.save` are purged on boot. Casey doesn't need old saves kept.
- **Hot reload** (`window.claude.hot`) snapshots `{ acct: A, tab }`.

## Build, test, publish

`Engine` splits SQL statements outside quoted strings/identifiers and comments. Comments do not count as statements or hide later techniques; sandbox reads with leading comments still return rows. `SqlEd` preserves comments and quoted identifiers during formatting. Browser regressions in `test/browser/playability.js` cover commented contract/sandbox queries, repeat payouts, combat and loot, banking, death protection/recovery, fishing, dungeon keys/chests, and dojo practice using disposable local fixture accounts. Stronger skills and direct location setup make these system checks bounded; they do not measure progression balance.

1. For game changes, use locked dependencies in `game/` (run `npm ci` when installation is needed), then run `npm run verify`. It checks packed art, engine/content (`ALL GOOD`), poker, casino, workflow tooling, and the build. It selects browser testing for relevant game changes. Documentation/Codex instructions use review and `git diff --check`; developer tooling uses focused checks. Neither task class alone determines test scope. On a new machine use `npm run test:install` when UI checks are needed; CI installs browsers only when selected. Build output is `dist/index.html`, `dist/release.json`, and a copy of `game/art/` under `dist/art/`.
2. For art-tool or rebuild changes, additionally run `python -I arttools/test_arttools.py` from the repo root in the pinned art environment, then the art verifier. Check all four generated `game/src/art*.js` against the saved pre-rebuild files when rebuilding existing art.
3. When UI coverage is relevant, Playwright exercises creation, SQL, navigation, save export/import, and reload on phone Chromium/WebKit at 390×720 and desktop Chromium at 1280×800, and captures the eight visual fixtures. Open affected screenshots in ignored `game/test-results/` before reporting visual success. For manual art review, `python -I game/test/serve_art.py` still serves `http://localhost:8779/__visual?scene=title`; scenes are `title`, `tallyport`, `fight`, `bag`, `paperdoll`, `dungeon`, `dojo`, and `interior`, using disposable accounts and local sql.js. Neither fixture nor test server enters the game build. Framework/docs-only changes do not need UI review. Set `BW_TEST_PORT` for an isolated checkout when port 8781 is already in use. Server safety tests allocate an ephemeral port.
   - `npm run test:dungeons` runs all eight complete dungeon expeditions in phone Chromium, using actual canvas movement and visible controls after initial character/surface setup. The runner builds into a fresh ignored snapshot and serves it through the Node fixture on a separate loopback port, so another build cannot truncate assets being read by a browser. It records candidate commit/HTML hash and JSON expedition evidence under `work/`; screenshots go to `game/test-results-expeditions/`. `BW_UI_WORKERS` adjusts concurrency; `-- --list` validates setup without playing. Regular `npm run verify` runs all-floor component fixtures in all three browser projects, including exact packed-texture pixel checks, migration, atomic death and body recovery. Prepared component positions and frozen unrelated patrols do not count as complete expeditions.
4. Existing `test/p8.py`, `p9.py`, `dbg.py` and scenario scripts document playthroughs and expose debug handles through localhost-only `window.__bw`. They retain older Linux path/browser assumptions; use the current local visual harness or port those paths before invoking them on Windows. `__bw` must remain unavailable on hosted production origins. Do not describe unrun legacy tests as passing.
5. Update the relevant master docs and their Decision logs. Unless Casey requests local-only/no-deploy work, commit intended source, packed art, manifests, tools and docs. Never commit raw art, sliced pieces, environments, or build output. Push `main` to `https://github.com/caseyschindler123/Brasswake` to test and deploy automatically; Markdown-only pushes are excluded from Pages. See the deployment workflow below.

### Artifact publishing while the artifact remains in use

Publishing is an explicit separate action. Use `publish_files` in patch mode, with `base_version` set to the current live version. Send `dist/index.html` plus only new or changed art; patch mode preserves all other files. Never use replace mode or list files that are unavailable locally. Stay within the 512-file cap by using atlases. Record a published version in the relevant Decision log. No base64 backup refresh is needed: commit changes to the repo. The artifact remains the preview until the hosted build and phone migration are complete.

## Coding conventions (learned the hard way)

- **Edit by exact replacement.** Use a Python patch with `assert s.count(old) == 1`, or the Edit tool, so a stale anchor fails loudly instead of patching the wrong place.
- **Never put a `//` comment in the middle of a long line.** Much of game.js has many statements per line, and a mid-line `//` silently disables everything after it. In pass 23 this broke all loot granting. Put comments on their own line or use `/* */`.
- **Keep new numbers in one place**, as named constants near their system (`BLESS_C`, `TRAIN_CAP`, `LOOKC`, `respT`), and mirror them in 02_GAMEPLAY.md.
- **Keep each pass small enough to test.** Every pass ends with all tests passing and screenshots checked.
- **Don't trust the art packing for scale.** Packed art is normalised to fill its cell. Scale in code (for example `MSC` for creatures) and check against the hero, who is about 65 art px tall (≈ 21.7 world px).
- **Use the units consistently.** World units are 16 px per tile. The canvas draws art at K = 3× sprite resolution: `lw`/`lh` convert hi-res art to world px.
- **Performance target:** 60 fps headless in town. Chunks are painted lazily. Avoid offscreen-canvas composite tricks; one WebKit build showed only the base layer.
- **Scrolling screens must not shrink their children.** `.q-body > *`, `#q-out > *` and `#f-out > *` are `flex-shrink: 0`; a wrapped chip row was once squeezed over the result box. Generic class names are scoped (`li.good`, not `.good`) because `.verdict.good` and `h2.good` picked up the list-row grid.
- **Keep the debug export** (`window.__bw`) available on localhost/file only, and extend it when new systems need tests.

## Untrusted input and safety

- Art and other uploads are untrusted:
  - Extract each archive into a new empty directory.
  - Keep scripts elsewhere.
  - Run Python on the files with `-I`.
  - Pass paths as arguments.
- Never handle API keys in chat or files.

## GitHub Pages hosting and remaining offline work

The public repository is `https://github.com/caseyschindler123/Brasswake` and GitHub Pages hosts `https://caseyschindler123.github.io/Brasswake/`. The repository is the source of truth. The artifact remains available while Casey checks the hosted game on his phone and moves his characters.

### Automatic deployment

`.github/workflows/pages.yml` runs on pushes to `main`, pull requests targeting `main`, and manual dispatch. Its build job uses Node 24, installs locked dependencies, and runs `npm run verify`, the same gate used locally. It runs fixed non-UI checks, builds, and selects browser testing for game source/assets, runtime dependencies, or changed rendered HTML. Development-only dependency/tooling/docs changes skip browser testing. Metadata-only build changes skip it when a baseline build produces identical HTML; missing evidence defaults to UI coverage. CI supplies the previous push SHA or PR base and installs browsers only when needed. Required-check failures block deployment. The deploy job publishes only on `main` after validation succeeds, then verifies the exact live commit and HTML hash. Relevant game changes also run a hosted player flow. Reports and any screenshots are retained for 14 days as separate Actions artifacts. Official actions are pinned to verified commit SHAs; no personal token or custom deployment secret is stored in the repo or workflow.

GitHub Pages uses the Actions publishing source. The publication payload is built HTML, release metadata, and committed packed art, fonts and music. Raw art, slices, environments and local test screenshots are not published. To change art, rebuild locally and update the accepted manifest deliberately after validation, then commit the packed files. A missing or changed committed asset makes CI fail.

`npm run build` and `npm test` are also available in `game/`. `node arttools/check_packed_art.js` checks assets without Python or raw art. Local Git credentials use the already-authenticated GitHub CLI through a repository-local credential helper; no credential value is written to files.

### Remaining work

- **Saves:** the hosted game has its own localStorage and no `window.claude` account sync. The existing Hero → Save code / Load a code controls let Casey move characters between origins. Migration is manual; no existing artifact save is changed by deployment.
- **Offline:** bundle sql.js instead of the current cdnjs script, add a service worker and web manifest, then verify airplane-mode play on Casey's iPhone. These are planned, not shipped by the hosting setup.
- **Artifact:** retain the preview and its patch-publish steps until the hosted build and save migration have been checked on the phone. Repository commits remain the development record.
- **Multiplayer:** discussed and set aside.

## Decision log

- 2026-11-23: Released `skills-attributes-and-directional-npcs` at aec11c0 separates pure progression/concealment/professional rules from game adapters, adds account v8/character v7 migration across all ingress paths, and reuses human body art for NPCs with a 160-frame LRU (approximately 3.9 MiB decoded composites). Named appearances remain stable; human wandering supports corner-safe diagonals and stationary interaction facing. Existing creature presentation remains. Local and exact-commit CI each passed all 243 browser cases; hosted verification and visual review are recorded in [release history](RELEASE_HISTORY.md#skills-attributes-and-directional-npcs).


- 2026-11-23: Cartography/travel, manual controls and world-wide venues shipped as 17441a1 after complete local and exact-commit branch CI validation (210 cases), main deployment and independent hosted commit/HTML/player-flow verification. Tracked release history and the closed plan preserve the source identity; subsequent Markdown-only closure does not require another deployment.

- 2026-11-23: Cartography release CI found a regenerated wharf rat on a saved house-pad landing. Scene.load preserves otherwise valid preferred ground by relocating an idle wandering occupant within eight tiles, preserving the entity and occupancy index. Fixed characters, active pursuit and static terrain obstructions retain safe-position fallback. Browser coverage forces both movable and fixed blockers while retaining exact saved-arrival assertions.

- 2026-11-23: Candidate `cartography-travel-and-grand-atlas` implements compact surface exploration, validated local/regional/installed-Atlas navigation, eight physical map rooms, 24 signs, manual thumb movement and regional purposeful venues. Twenty-four saved upper floors use shared structural masks; modular doors animate with existing sound cues. Existing quests, staff identities, account/character versions and protected story anchors remain. Outstanding proportional-workflow/context updates are included in the same release line. Deployment evidence belongs in the plan and tracked release history after verification.

- 2026-11-23: Context cleanup records completed releases in tracked RELEASE_HISTORY.md, closes stale plans and makes the packed manifest authoritative for asset counts. Reused existing receipts and Actions evidence; no game tests or release were run for this documentation task. Edits remain local under Casey's no-deploy instruction.

- 2026-11-23: Casey requested task cost summaries and proportional verification. Docs/Codex instruction changes require review and a diff check; tooling requires focused checks; game changes retain release and relevant browser gates. Markdown-only pushes are excluded from Pages. Cost summaries use existing evidence and mark unavailable billing honestly; no cost collector or ledger is added. This update remains local with no deployment at Casey's request.

- 2026-11-22: Candidate `story-first-day-2026-11-22` adds an isolated read-only teaching manifest, bounded companion routing, task-specific narrative selection, historical continuity checks, and renderer-owned paper-doll grips. Guide indices, account v7 and character v6 remain stable; existing extensible `seen`/dojo state stores new teaching and encounter markers. Leaving a lesson resumes from completed checkpoints. Intro completion pays once per character. Normal dialogue preserves authored paragraph/array boundaries and all choices follow the final beat. Tests include an ordinary-speed unskipped opening and equipment composition matrices; release evidence is recorded in the implementation plan.

- 2026-11-22: Capacity review of the large dungeon maps found legacy index arrays could exceed device storage across five fully explored characters. Discovery now uses versioned `b1:` six-bit strings, reads previous arrays, compacts every account slot on save/export/cloud sync, and prunes expired corpse snapshots while retaining live loot. A five-slot browser reload regression and worst-case storage-size regression protect this format; account/character versions remain 7/6 because decoding accepts both representations.

- 2026-11-22: Release `dungeon-rebuild-2026-11-22` adds deterministic dungeon content, separate scene/rule/progress modules and three independent atlases. Account v7/character v6 preserve v6/v5 saves while adding persistent expedition state. Dungeon layout/controller tests join `npm run verify`; rendered UI expeditions walk all eight dungeons with actual movement, combat, interactions, stair travel, loot and reload, using disposable prepared characters. Deployment is tracked by the exact Pages source commit and HTML hash.

- 2026-11-22: `soundtrack-2026-11-22` adds complete 28-context/cue coverage from existing Suno tracks and locally authored MIDI. Scene exposes music location facts through `musicContext`; Sound owns priority, short one-shots, serial loading, timeout/backoff, stale-response checks and a two-track cache. No save-format or SQL/balance change. The soundtrack work was isolated from unfinished dungeon changes and integrated with the completed magic/effects release before publication.

- 2026-11-22: Release `magic-and-sound-2026-11-22` adds shared `Effects`, eight code-native spell images/timbres and rare variants, deferred projectile impact presentation, contextual creature/activity/movement/currency cues, and sound regressions in the common verification gate. Fixed actual-weapon routing, duplicate post-fight healing and missing chase-death sound. Existing music, balance, saves and packed assets are unchanged. Pages release identity is its source commit in `release.json`.

- 2026-11-22: Removed the delayed `maybeDye` sheet mutation after a repeat WebKit run reproduced it replacing an active bank sheet. Dye discovery uses the existing notification system; the localhost-only debug surface exposes `maybeDye` for deterministic reward/UI regression coverage. No save change.
- 2026-11-22: Follow-up to `playability-audit-2026-11-22`: `Engine.uncomment` supplies shared comment removal for poker's count-only gate before its scratch query runs. A valid commented count now returns an answer and consumes exactly one read, with Chromium/WebKit/desktop regression coverage. The poker rules module remains independent of the SQL engine.
- 2026-11-22: Playability audit release `playability-audit-2026-11-22` (Pages source commit in release.json): repaired comment-aware SQL splitting, sandbox read detection, technique detection around quoted text, and formatting of block comments/quoted identifiers. Added browser regressions for major gameplay flows and combat/fishing readability. Save format and packed art unchanged; the artifact preview remains pass 29.

- 2026-11-22: Casey chose automatic Codex classification and release for both task classes, deliberate cost-effective delegation, and UI testing only when relevant. Root AGENTS.md and 05_CODING_WORKFLOW.md define the defaults. npm run verify shares local/CI checks and selects UI coverage from actual game impact; release.json identifies the source commit and built HTML hash. This framework release preserves the existing game HTML/version; release success is tracked by its source commit and the post-deployment receipt.

- 2026-11-22: Casey authorized autonomous creation of the public GitHub repository and Pages hosting. Pushes to main now validate committed art, install locked dependencies, test and build before deploying game/dist through GitHub Actions. Pull requests validate without deployment; raw art remains local. Offline support remains planned.

- 2026-11-22: Accepted the rebuilt local packed-art baseline after all four generated coordinate JS files matched byte-for-byte and eight 390x720 views showed no missing art, obvious misalignment or wrong-facing rows. Of 486 asset files, 484 match the old live hashes; mobs.webp and icons.webp retain their original geometry and are accepted as encoding/library differences. No raw art, prompts, image script, model, quality setting, fonts or music changed.

- 2026-11-22: The local repository and `game/docs/` are the source of truth. Replaced cloud restore/backup instructions with clone, npm install, build and test; local packing writes committed `game/art/`. Pin Pillow 12.0.0 and accept the verified local packed baseline only after coordinate, geometry and phone-size visual checks. No existing art is regenerated.

- 2026-11-22: Pass 29 published (`1795364400-6a70`): walk-in rooms for Tallyport's tavern, shop and bank (`ROOMS`, `setRoom`, `roomArt`, `roomFade` in scene_b.js; `artkit.js` added to the build order after `artbody.js`; new atlas `art/kit/k1.webp`, 487 files now). Scenario `test/scenarios/rm1.py` checks each keeper can be reached through the door and screenshots each room outside and in. Save format unchanged.
- 2026-11-22: `1795356532-b223` was published by another session after the backup was taken; its backup refresh came later. Pass 29's session found the live version ahead of its restored backup, split the live `index.html` back into `src/` (rebuild byte-identical to live), and built on that. Always compare the live version with the backup header before publishing.
- 2026-11-21: Pass 23 published (`1795318673-4adf`): slow skill curve, gear drops on death, bless deeds and insurance, money sinks, creature scale table.
- 2026-11-21: Pass 24 published (`1795320187-13c5`). The account layer has five slots, with the first character made as the main. Houses and codex are shared; banks are separate. Save version 6, and all older saves are wiped. Casey asked for separate banks as an incentive to own a house.
- 2026-11-21: Pass 25 published (`1795321200-63af`): town names replaced across src/ and STYLE.md by an exact string map (see 02_GAMEPLAY.md). Save format unchanged.
- 2026-11-21: Pass 26 published (`1795324356-c3c6`): `src/audio.js` (Sound), music loops in `art/mu/`, sound toggles on the Hero tab. Save format unchanged; sound settings live in localStorage `brasswake.sound`. Music tools added to the backup under `arttools/music/`.
- 2026-11-22: Keyboard pass published (`1795327086-7c69`, labelled "Pass 26"): symbol strip above the letters, comma on the 123 layer, comma and star in the list panels' bottom row, lesson 3 result overlap fixed (chip row shrink plus the `.good` clash). `test/p9.py` closes the vault chest sheet before clicking the bag tab. Save format unchanged.
- 2026-11-22: Learned commands published (`1795327397-bfae`, labelled "Pass 27"): `A.cmds`, `CMDS` in quests.js, the Commands panel filter, the Hero tab list. No save version bump, since the new field is additive and backfilled; Casey's characters keep their progress.
- 2026-11-21: The workspace is not durable, and the repo, tools and tests had existed only in one session. They were packed into the project doc `dev/brasswake_dev_backup.txt` and verified: a fresh unpack rebuilds an `index.html` byte-identical to live `1795321200-63af`, and `test.js` passes. A "Starting a new session" section was added. The artifact could not hold the source because of its 512-file cap. Raised by a second agent that found no repo in a new session.
- 2026-11-22: Compact symbols published (`1795351648-e92c`, "Pass 28"). The 9-key symbol strip above the letters is gone; `,` `*` `'` sit in the bottom row. Commands panel: those three on top plus a Symbols toggle for the rest. Bug fix: `cmdBackfill()` now runs after a cloud load and a save-code import; before, a newer cloud save arrived after the boot backfill and left the Commands panel empty for existing characters. Save format unchanged.
- 2026-11-22: Planned a move to a public GitHub repo and a hosted static site that works offline (see "Planned, not built"). Casey chose public; he isn't concerned about the music being public. Multiplayer set aside for now.
- 2026-11-22: Casey chose to have his PC agent rebuild the packed art from his raw art instead of copying it out of the artifact ("start this the right way"). Repo starter zip sent: source matching live `1795364400-6a70` (built `index.html` byte-identical), fonts and music, `REBUILD_ART.md`, live hash list.
- 2026-11-22: Casey decided his local agent (which can generate images itself) takes over the repo, the packed-art rebuild and the context documents, so he doesn't have to relay between agents. The repo's `game/docs/` becomes the master copy of these documents.

- 2026-11-22: Release verification caught MP3 cue-duration differences on Linux WebKit. Victory/death now use lossless PCM WAV; loop formats and the strict one-frame cue-duration regression remain unchanged.

- 2026-11-22 (`story-first-day-2026-11-22`): Clamp resumed scene deltas to 0–50ms because a queued RAF can predate resume’s performance clock. Safe-practice recovery tests force this ordering before checking character-slot recovery.

- 2026-11-22 (`story-first-day-2026-11-22`): Expanded 135-case UI coverage reached 119 passing CI cases before the 30-minute build deadline. Raised that budget to 45 minutes. Validate the exact repair commit with forced UI coverage on a manual branch run before advancing main; verify the deployed source/hash and hosted UI independently.
- 2026-11-22: World rebuild release candidate adds geography, world-progress, building compiler/view and world-services modules plus scene_world inside Scene’s IIFE. World revision 3 retains account v7/character v6 data. Source-receipt world art packing and browser coverage check roads, all ferry directions, side-door input, courtyards, homes, market purchases and travel replay. Release identity comes from release.json; hosted verification remains the completion gate.
