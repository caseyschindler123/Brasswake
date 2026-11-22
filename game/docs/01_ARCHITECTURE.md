# Brasswake: architecture and engineering practice

The repository is the source of truth for source code, packed art, tools and project memory. `game/docs/` holds the master context documents. Casey's local agent maintains the repo, art pipeline and docs directly. The base64 backup and Claude project copies are no longer the development source. The PC checkout is `C:\Users\caseys\source\Brasswake`; the remote is `https://github.com/caseyschindler123/Brasswake`. The hosted game is at `https://caseyschindler123.github.io/Brasswake/`.

Last updated: 2026-11-22. Pages releases are identified by the source commit and HTML hash in `release.json`. The magic and sound release adds eight spell presentations and contextual sound effects. SQL comment handling and readable combat/fishing controls shipped in the preceding playability audit. The retained artifact preview is pass 29 (walk-in rooms in Tallyport), version `1795364400-6a70`. (Two artifact publishes carry the label "Pass 26": the audio one and the keyboard one. Go by version id.)

## Starting a new session

Root `AGENTS.md` applies `05_CODING_WORKFLOW.md`: Codex classifies, plans, develops, runs relevant checks, updates docs, commits, pushes, deploys, and verifies the release. Both task classes deploy automatically. The main agent delegates only when bounded independent work justifies its cost. Game UI testing applies only when relevant; tooling-only changes skip it.

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
| Sliced pieces, extracted ZIPs, local environments and logs | ignored `work/` | Disposable build inputs and diagnostics, not project memory. |
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

The game is one self-contained HTML page, `dist/index.html`, about 0.9 MB, plus 486 asset files in `dist/art/`. Both are published together as a Claude artifact:
- slug `3c61f5cf-5c3e-4ea3-92c3-8f59472dd858`
- https://claude.ai/artifact/8TU29g27SqEknG1MYuJB3u

It is played mostly in the Claude iOS app at roughly 390×720 CSS px with a device pixel ratio of 3. Everything must work by touch on a phone.

There is no framework and no bundler. Plain ES2019 JavaScript modules are written as IIFEs (`const Name = (() => { ... return {...}; })();`) and concatenated in a fixed order. SQL runs in the browser through sql.js (the asm build, loaded from cdnjs) against a seeded in-memory SQLite database.

## Source layout (`game/` in the repo)

| Path | Role |
|---|---|
| `build.js` | Concatenates `src/*.js` in order into `shell.html` with `style.css` inlined, writes `dist/index.html` and `release.json` (source commit and HTML SHA-256), and copies `art/` to `dist/art/`. `BW_DIST` and `BW_ART_JS` build against stand-in art. |
| `src/world.js` | `World`: the Ledger database, a fictional trading company. Schema (employees, customers, vendors, items, orders, order_lines, invoices, purchase_orders, po_lines, and more) and deterministic seed data. |
| `src/quests.js` | `Content`: every piece of static content. Regions, contracts (exercises), bounties, bosses, rumors, uniques, monsters, lairs, dungeons, rivals, recipes, pages and books, food, settlers, houses, paint, fish, folk and talk lines. It also runs under Node, which the tests use. |
| `src/engine.js` | `Engine`: runs SQL on a read-only copy plus a sandbox, grades a query against the answer (correct / close / partial / wrong, with row overlap), and detects which SQL techniques a query used. |
| `src/deep.js` | `Deep`: the Lost Ledger story layer. Nine lost tables, twelve Great Truths, Ilva's letter. |
| `src/dojo.js` | `Dojo`: dojo masters, students, travellers, Sorrel Ashby, prizes, lines. |
| `src/sqled.js` | `SqlEd`: the SQL editor, syntax highlighting, and the custom phone keyboard helpers. |
| `src/artdata.js`, `artdojo.js`, `artbody.js`, `artkit.js` | Generated by the art packers: atlas coordinates and anchors. Never edit by hand. `artkit.js` (from `kit_pack.py`) holds the building-kit pieces in `art/kit/k1.webp`. |
| `src/scene_a.js` | Scene part 1: canvas setup, image loading, atlas cutting (`cut`), creature art (`artMob`, with per-creature scale `MSC`), fallback sprites. |
| `src/scene_b.js` | Scene part 2: world generation (`genWorld`), ground painting, props, mountains, towns, dojo halls (`genHall`), the hero paper doll (`dollSprite`, `recolor`, `dollFx`), movement, chase AI, respawn, corpses, the draw loop, fight effects. It exposes `Scene` and talks to the game only through the `host` (HOST) object. |
| `src/poker.js`, `casino.js` | Card room (hold'em), the Crooked Wheel and the Count (blackjack). |
| `src/effects.js` | `Effects`: presentation definitions for the eight spell Circles, rare-page emphasis, creature sound families, and bounded canvas cast/projectile/impact drawings. Loaded before the scene and audio; changes no combat rules. |
| `src/audio.js` | `Sound`: music and effects (Web Audio). `MUSIC` holds each track's loop points (`a`, `b` in seconds); `TOWN_MU`, `DUN_MU` and `COMBAT_MU` map places to tracks. A 400 ms tick asks a source callback `{ fight, dun, region }` what should play and crossfades (1.6 s). Decoded music is large (about 30 MB a minute), so only 2 tracks stay decoded (`CACHE`). Effects are synthesized; there are no effect files. Eight spell timbres each have cast/impact envelopes; weapons vary slightly between strikes. A compressor protects the shared music/effect output, finished effect voices disconnect, and repeated footsteps/doors/clicks are throttled. Sound settings are a device preference in localStorage `brasswake.sound`, outside the save. Named `Sound` because `Audio` would shadow the browser's `Audio` class. |
| `src/game.js` | Everything else, about 280 KB. `soundUp()` wires `Sound` in: the music source, query-grade cues, actual weapon/spell selection for `Scene.FX.swing`, successful currency-action cues, and clicks on `.btn`. Scene emits presentation cues through `HOST.sound`; it never reads game state. Spell and arrow hits attach to a pending projectile and present on arrival (0.26 s); scene transitions clear pending effects. Positive healing numbers never use damage flashes or repeat the healing cue.<ul><li>state `S` and the account `A`, save and cloud sync</li><li>combat, skills, items, the economy</li><li>the guided first day (`GD`), dojo tournaments and duels (`DU`), fishing</li><li>houses, banks, appearance, all sheets and menus</li><li>the action table `ACT`, interaction handlers `SH`, and `HOST` for the scene</li></ul> |
| `src/style.css`, `shell.html` | Styles (a painted-UI skin at the end) and the page shell. |
| `test/scenarios/` | Scenario scripts for `dbg.py` (guided day, dojo, death and bless, houses, account slots, sizes, looks, spawns, names). |
| `test/` | Engine/content, poker, casino, sound/magic, and workflow tests. `verify.js` is the shared release gate; `select-tests.js` selects relevant UI tests. `server.js`, `browser/`, and `playwright.config.js` provide browser coverage; `live.js` verifies a published release. |
| `STYLE.md` | Writing rules (= `docs/04_WRITING_STYLE.md`). |
| `PLAN_LIVING_WORLD.md` | Pass-by-pass engineering notes. |
| `docs/` | Master context documents and project memory, maintained in this repository. |

Art tools live in repo-root `arttools/`, including `build_art.py`, `slice.py`, the packers, `verify_art.py`, contact-sheet tools and stand-in generators. Music tools are in `arttools/music/`; the art rebuild does not run them. See 03_ART_STYLE.md for inputs and generation rules.

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

- **Account `A`** (save version 6, localStorage key `brasswake.acct.v6`, cloud doc `data/users/{id}/acct`), with these fields:
  - `v`, `rev`, `at`
  - `cur`: active slot
  - `main`: the slot whose character carries the story
  - `slots[5]`: each slot holds a character save or null
  - `homes`: shared houses and their chests
  - `codex`: named rares found, shared so only one copy exists
  - `paid`: exercises and Great Truths already paid out
  - `djp`: dojo champion and master payouts already made
  - `cmds`: learned commands, `{ lessonKey: 1 taught | 2 learned }`, keyed by the lesson ids in `CMDS` (quests.js). Added without a version bump: `freshA()` supplies it and `cmdBackfill()` fills it from each slot's `seen`/`done` on boot, after a newer cloud save replaces the local one, and after a save-code import. Any new path that replaces `A` must call it too.
- **Character `S`**: the active slot, migrated through `migrate()`. On load, `linkS` points `S.homes` and `S.codex` at the account's arrays. `slotOut` strips them before storing. Banks are per character (`S.bank`).
- `save()` bumps both revs, writes localStorage, and schedules a cloud flush through `window.claude.use('db')` when available. The newest `rev` wins.
- **Changing the save format:** bump the version, make `freshA()` and `fresh()` defaults cover the new fields, and record it in the decision log. Old save keys starting with `brasswake.save` are purged on boot. Casey doesn't need old saves kept.
- **Hot reload** (`window.claude.hot`) snapshots `{ acct: A, tab }`.

## Build, test, publish

`Engine` splits SQL statements outside quoted strings/identifiers and comments. Comments do not count as statements or hide later techniques; sandbox reads with leading comments still return rows. `SqlEd` preserves comments and quoted identifiers during formatting. Browser regressions in `test/browser/playability.js` cover commented contract/sandbox queries, repeat payouts, combat and loot, banking, death protection/recovery, fishing, dungeon keys/chests, and dojo practice using disposable local fixture accounts. Stronger skills and direct location setup make these system checks bounded; they do not measure progression balance.

1. In `game/`, install locked dependencies with `npm ci`, then run `npm run verify`. It checks packed art, engine/content (`ALL GOOD`), poker, casino, workflow tooling, and the build. It selects browser testing for relevant game changes; framework/docs-only changes skip UI. On a new machine use `npm run test:install` when UI checks are needed; CI installs browsers only when selected. Build output is `dist/index.html`, `dist/release.json`, and a copy of `game/art/` under `dist/art/`.
2. For art-tool or rebuild changes, additionally run `python -I arttools/test_arttools.py` from the repo root in the pinned art environment, then the art verifier. Check all four generated `game/src/art*.js` against the saved pre-rebuild files when rebuilding existing art.
3. When UI coverage is relevant, Playwright exercises creation, SQL, navigation, save export/import, and reload on phone Chromium/WebKit at 390×720 and desktop Chromium at 1280×800, and captures the eight visual fixtures. Open affected screenshots in ignored `game/test-results/` before reporting visual success. For manual art review, `python -I game/test/serve_art.py` still serves `http://localhost:8779/__visual?scene=title`; scenes are `title`, `tallyport`, `fight`, `bag`, `paperdoll`, `dungeon`, `dojo`, and `interior`, using disposable accounts and local sql.js. Neither fixture nor test server enters the game build. Framework/docs-only changes do not need UI review.
4. Existing `test/p8.py`, `p9.py`, `dbg.py` and scenario scripts document playthroughs and expose debug handles through localhost-only `window.__bw`. They retain older Linux path/browser assumptions; use the current local visual harness or port those paths before invoking them on Windows. `__bw` must remain unavailable on hosted production origins. Do not describe unrun legacy tests as passing.
5. Update the relevant master docs and their Decision logs, then commit source, packed art, manifests and tools. Never commit raw art, sliced pieces, environments, or build output. Push `main` to `https://github.com/caseyschindler123/Brasswake` to test and deploy automatically. See the deployment workflow below.

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
