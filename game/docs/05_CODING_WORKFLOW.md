# Automatic coding and release workflow

Last updated: 2026-11-27. Scope-based testing and local development scenarios are implemented. The [implementation plan](plans/2026-11-25-scope-based-testing-and-dev-mode.md) records evidence and limitations. Current code owns executable behavior; historical decisions below describe earlier gates.

## Classify and scope

Default to **simple** for understood fixes, presentation, isolated features and routine tooling. Choose **complex** only for a named consequential risk or unresolved design decision, such as a save migration or release-authority change. Keep a plan for complex implementation; Casey's override takes effect immediately. Planning and verification are independent.

Before editing, inspect status and relevant instructions. Briefly state the changed behavior, risk, checks and stop condition. Preserve unrelated work. A requested plan does not itself authorize implementing it; explicit local-only/no-deploy/stop requests take precedence. No routine approval is needed for authorized reversible work or automatic game releases.

## Scope-based criteria

| Scope | Required approach |
|---|---|
| Documentation | Review wording/links and git diff --check. No game tests/build/screenshots/deployment. |
| Tooling/registration | Focused protocol/configuration tests, actual discovery and short canary/Dev scenarios. Unchanged fixture extraction must prove callback/helper bodies match verified full source. Changed assertions, scenarios or shared behavioral helpers retain affected/full checks. |
| Reviewed cosmetic atlases | Build/packed integrity, selected scene captures on phone Chromium 390×720 and desktop 1280×800, plus a short canary on all supported profiles. No unrelated profession journeys or core groups. Current automatic mappings cover landscape/architecture/cartography atlases and generated coordinate tables only. |
| Local layout/interaction | Affected interactions/captures; WebKit for CSS/font/compositing/native-input risk. Global CSS, physical anchors, camera/input or unknown impact still select full. |
| Isolated rules/features | Actual rule/boundary tests and prepared real-game scenarios for integration risk. Existing mapped audio/editor/appearance/building/effects/cards families select their core groups and browser consumers. New unknown modules default to full until a reviewed mapping exists. |
| Shared/high risk/unknown | Full core and all browser scenarios/profiles, including journeys. Saves, ActorRig physical speed, movement, world ownership, progression, runtime/offline/packaging and unknown paths retain conservative fallback. |
| Exhaustive validation | Nightly/manual full retains every existing scenario. Extended path/expedition campaigns remain opt-in for relevant balance/progression work. |

Mixed changes union their risks; labels cannot override unknown/high-risk evidence. Preserve known relevant failures until diagnosed/repaired. Never weaken assertions, raise deadlines, add broad retries or refresh art baselines to obtain a pass. Screenshots must actually be opened by Codex before visual success is claimed; Casey is not responsible for routine QA. Recognizable world objects must also pass the source/native-scale/in-scene art curation gate in 03_ART_STYLE.md: interaction assertions and captured screenshots do not approve placeholder-quality physical furnishings. Emulated WebKit is not a physical iPhone test.

## Commands and selection

The matrix describes how to develop efficiently; the selector determines the executable release gate. Current fast automatic paths are limited: tooling/equivalent fixture extraction select `canary,dev-mode`; reviewed landscape/architecture/cartography atlas changes select `canary,scenes`; other mapped feature families retain legacy `smoke` plus affected suites. Their selected core groups are still reduced. Global CSS, monolithic/shared game code and unknown files remain conservative. A Dev scenario passing does not authorize substituting it for a different selected suite.

From game/, install locked dependencies with npm ci only when needed.

- npm run verify -- --defer-ui selects and executes the relevant core groups/build. It defers browser work to exact-commit CI; it does not pretend selected UI passed.
- npm run verify runs selected UI too; --ui explicitly selects full. Combining --ui and --defer-ui is rejected.
- npm run test:protocol checks scope selection, real discovery, equivalent extraction and fail-closed release gates.
- npm run test:ui -- --suites=dev-mode runs the short canary plus direct Dev scenarios; --suites=journeys selects all four profession days and targeted first-day checks.
- npm run test:ui -- --suites=scenes --scenes=paperdoll --capture-profiles=phone-chromium,desktop-chromium captures only that scene in those profiles; the short canary still runs in all profiles. Unknown names are rejected.
- npm run test:ui -- --full runs the complete inventory. Existing test:paths/test:dungeons remain separate earned/compressed campaign tools with their own evidence limits.
- npm run dev serves the existing built game and /__dev on the loopback test server. Run npm run build first when needed. The panel and command scripts are never copied into dist.

These commands select different things: an explicit `test:ui -- --suites=...` adds the short canary; `verify` uses the automatic suite list, which can contain legacy smoke instead. `--scenes` chooses only named visual scenes, and `--capture-profiles` filters only those visual cases. It does not narrow feature tests or canaries. All three browser profiles and all four shards of each remain required when current CI selects UI. Local `--project=<name>` is useful during diagnosis; it does not establish the other required release-profile results. Running `test:ui` without suites/environment selection defaults to the full inventory, so choose a focused command deliberately during iteration.

select-tests.js records selected suites, core groups, scenes and capture profiles. ui-suites.js validates scope metadata and complete full inventory; the aggregate rejects malformed plans and failed/cancelled/skipped selected browser jobs. Current canary covers public character setup, actual SQL and device save/reload in all three profiles. Legacy smoke and every existing scenario remain in full coverage.

Actions runs four required Playwright shards per selected browser profile, using the same suites, scenes and profile selection in all twelve jobs. Each passes `--shard=1/4` through `--shard=4/4`, runs one worker (`BW_UI_WORKERS=1`) on its own runner, and retains a distinct `browser-<project>-<shard>` artifact. Heavy journeys do not compete on the same runner. The aggregate still requires the browser matrix result to succeed before publication. Discovery checks prove that all shard pairs are disjoint and their union retains the complete full inventory. The 90-minute browser-job limit and zero retries remain unchanged. This tooling candidate awaits the coordinator's exact-commit verification.

Actions passes the verification plan between jobs using lossless bounded compression from `selection-transport.js`. The raw `work/test-selection.json` receipt retains every selected path and scope field. Aggregate and hosted consumers accept both legacy JSON and the encoded form, reject malformed/oversize payloads, and apply the same scope and exact-commit validation after decoding. Transport size never justifies dropping file coverage.

Core groups are selected before execution: assets/build/protocol plus affected engine/audio/actors/world/cards/effects groups; full runs all groups, including offline/server checks. Do not repeat passing unchanged full local and CI runs or hosted flows without a concrete unresolved concern.

Coverage retains game/dependency/packaging changes since verified publication, including failed rollouts. Test-fixture history is compared with verified full source f7988d8 (Actions 45703705378); exact extraction proof checks unchanged scenario/helper text before allowing the short migration gate. Missing history, changed helper behavior, unknown fixtures or unverifiable equivalence retain full. This is bounded provenance reuse, not a blanket exemption for test changes.

The equivalence proof is specific to the recorded dungeon/first-day extraction; it does not certify every future registration edit. Changed first-day fixture code can still select journeys through the conservative existing mapping. Helpers must be imported from side-effect-free helper modules, never from a file that registers scenarios. A new smaller mapping requires reviewed consumers, regressions and an updated selector/gate contract; changing prose or using a `Dev` label cannot create it.

## Choose the development environment

Use this guide before starting a browser or a long flow. Codex owns automation and visual review. Prefer existing commands/scenarios and finish when the necessary checks pass; do not build a new panel, test framework or duplicate scenario merely to validate a small edit.

| Work being changed | Default development method | Evidence still needed |
|---|---|---|
| Context, plans or instructions | Wording/link review and `git diff --check`; no game environment | Accurate current/planned wording; Markdown-only publication behavior |
| Damage, skill, item or other isolated calculation | Existing small tests of the actual runtime rule/boundaries | A prepared integration scenario only when a changed connection needs it; shared rules still use the broader selected gate |
| Decorative texture, color, icon or equipment appearance | Load the affected visual fixture or Dev equipment preset directly and capture phone/desktop | Actually open relevant captures and check integrity; global CSS, physical anchors and unknown impact stay conservative |
| Battle mechanics or gear interaction | Direct Dev reset/skills/resources/grant/spawn setup, then ordinary battle/equip/SQL controls | Actual resulting state, costs and outcomes; avoid walking a profession day merely to obtain the starting gear/enemy |
| Building appearance/layout | `Dev.building` for real compiler/render layers, furniture and roof preview; existing scene fixtures for the in-world view | Real entry/exit/collision/ownership checks when physical geometry, placement, doors or anchors change; preview alone does not exercise those contracts |
| Creation, learning/progression, earning rewards, navigation or saves | The relevant ordinary player flow, native movement, import/export/reload or earned campaign | Exercise the behavior being claimed. Dev may prepare an initial boundary state, but teleporting/granting progress cannot prove that same travel/earning/save path |
| Music, sound, offline cache or publication | Existing real audio/offline/live suites and asset/manifest checks | Dev starts muted and bypasses normal persistence; use the actual browser/playback/cache/hosted path for these contracts |
| Test registration, Dev tools or CI | Protocol/configuration checks, real discovery, short runner/Dev checks as selected | Prove full inventory/guards remain; run affected real flows when assertions or shared helper behavior changes |

Prepare state directly, wait for actual readiness, exercise the behavior, inspect assertions/captures, and reset between independent scenarios. Do not automate clicks through the Dev panel to perform setup; use the command interface. Reuse an already-proven scenario rather than creating a fresh complete playthrough for every fix. Keep randomness/probability studies in appropriate pure/balance tests; the isolated seeded Dev stream does not make ambient browser-frame timing a physical-device or balance study.

## Local Dev scenarios

/__dev provides a disposable character and optional panel. Automation calls the same window.Dev interface in /__dev/game?visual_test=1:

- reset(seed) restores the known account, clears fight/scene state and resets the real SQL sandbox/RNG.
- skills(values), attributes(values), resources(values) validate actual caps/bounds.
- grant({slot,weapon,rarity,tier,equip,variant}) uses the actual item factory/equip action.
- spawn({monster,count}), battle(id) prepare bounded catalog monsters and enter real combat. Tests then use ordinary combat/SQL controls.
- teleport({region,x,y,dungeon,interior}) uses valid scene/dungeon transitions. It does not prove normal travel or earning access.
- building({region,shape,width,height,doors,furniture}) previews the actual building compiler/render layers; ordinary entrance/collision tests remain relevant when physical layouts change.
- catalog() and snapshot() expose setup options and observable state for repeatable checks.

Dev storage is in-memory and replaces neither player localStorage nor player saves. Audio defaults muted for repeatable scenarios; normal audio suites continue testing actual playback independently. No new commands are inserted into the production build. Dev setup does not establish progression/balance/learning, natural travel, human taste or physical-device behavior.

Call setup commands while no fight/query is active; use `reset(seed)` before preparing another scenario. Current catalogs/bounds are intentional: skills and attributes respect normal individual/total caps; resource setters expose health/mana/stamina/gold; grant creates supported generated equipment (including valid weapon variants/rarity); spawn accepts supported bounty-monster IDs with 1–12 creatures per call. Teleport supports valid region/surface coordinates, zero-based dungeon floors and existing interior IDs/slots. The panel exposes a convenient subset of the command API. It is not an unrestricted editor for every game object, boss, quest flag or consumable. Use normal or existing specialized fixtures when the API does not represent the state being tested.

## Commit, CI and publication

Finish the intended diff and scope review before pushing. Commit only intended files and push main without force unless Casey requested local-only. Concurrent tasks use isolated checkouts/ports and one game publisher. Documentation-only pushes skip Pages; tooling/test-only changes validate without publishing unchanged output.

CI verifies the live baseline, executes selected core/build and browser checks in all required profiles with zero retries, and enforces the aggregate. Nightly/manual full validation never publishes by default; explicit manual publication requires full checks on main. Preserve the fresh baseline/ancestry guard, cumulative unpublished game coverage and exact hosted commit/HTML checks. A stale/divergent candidate cannot publish.

Hosted smoke always runs for game publication, with affected audio/battle/arrival checks; current changed-asset releases retain the complete offline download/reopen/restore flow. A cheaper same-path offline check is not activated without equivalent evidence. Full/risky plans retain all hosted flows. A missing standalone hosted scope defaults to all; malformed scope fails closed. Reuse successful CI hosted evidence rather than running duplicate independent flows.

For releases, monitor the exact commit through deployment/live verification; a green build alone is insufficient. Review relevant captures. Update owning context/decisions only for changed documented behavior/lasting decisions. Record concise released commit/run/date/hash/checks/limits in RELEASE_HISTORY.md; close a plan only when one exists. Tooling-only evidence belongs in its plan/report without a game deployment or new hosted hash. Documentation closure needs no repeated game checks.

## Completion and boundaries

Report classification, outcome, actual checks, commit/local status, applicable deployment status and material limitations. No routine cost attribution. Discuss costs only when requested or needed for paid-action approval; existing paid-image/settings approval boundaries remain unchanged. Never expose credentials, overwrite unrelated work, force-push or bypass sandbox controls. Delegate only bounded independent work when the benefit warrants it; prefer one agent for coupled/simple work.

## Decision log

- 2026-11-27: The first failed combined release exceeded WebKit's unchanged 90-minute job limit. Two required shards with one worker each then completed every case, but the heavier WebKit shard took about 84 minutes. Use four deterministic required shards per browser profile for more headroom; heavy journeys run without sharing a runner. Preserve every selected case, profession journey, retry/deadline setting, fail-closed aggregate and publication guard; prove every shard pair disjoint and actual discovery equal to the unsharded inventory. The coordinated landscape/UI plan owns integration and release status.

- 2026-11-26: Casey approved expedited publication of the intro-control fix before takeoff, with full checks afterward. The [intro hotfix plan](plans/2026-11-26-intro-controls-hotfix.md) owns a short-lived baseline/path-bound profile: affected core groups, nine exact cases in all three profiles, all known relevant failures, zero retries and all hosted flows. Remove activation after verified publication and run non-publishing full coverage; normal fallback remains unchanged.

- 2026-11-26: The complete fitted-character asset set produced a 271 KB verification record, above the per-environment-entry limit on Actions Linux runners. Preserve the entire record and raw receipt, compress only inter-job transport, bound decoding and retain identical fail-closed aggregate/hosted checks. Regression coverage includes an actual deployment-sized record and malformed/expanding payload rejection.

- 2026-11-25: Reconcile active context with the implemented selector/CI and add a default environment-use guide. Distinguish direct rule tests, visual captures, Dev setup and ordinary player-flow evidence; document legacy-smoke/three-profile limits and the specific extraction proof. Completed plans retain their original proposal as historical design, with current behavior owned here. This reconciliation changes Markdown only and runs no game checks or deployment.

- 2026-11-25: Implement scope metadata/core groups, direct disposable Dev commands, selected captures, side-effect-free fixture helpers and byte-equivalent registration extraction. Reuse verified full fixture source only when equivalence is established; unknown/shared behavior remains full. No production source change or game publication is required for test-only tooling.

- 2026-11-25: Casey removed mandatory cost attribution from completed-task reports because it was not useful. Remove the active rule and its current-plan references; preserve historical release evidence and earlier decisions. Cost-conscious delegation and approval for paid actions remain unchanged.

- 2026-11-25: Casey requested a full implementation plan and consistent testing documentation after the framework change ran expensive journeys. Record target scope criteria for cosmetic/layout/rules/features/tooling/shared changes and direct resettable Dev scenarios. This is a documentation/planning change only: current executable gates remain in force; reduced selection, registration/helper isolation and unified Dev mode are planned, not built. The [scope-based testing plan](plans/2026-11-25-scope-based-testing-and-dev-mode.md) owns milestones and acceptance evidence. Codex performs routine checks and capture review; Casey is not assigned manual QA.

- 2026-11-25: Casey requested a faster routine path with simple as the default. Require a named consequential risk for complex planning; separate four profession journeys from targeted first-day tests while retaining them in nightly/manual full, risky fallbacks and owning-fixture changes. Add reviewed presentation-only landscape and architecture/cartography atlas mappings and conditional hosted checks; keep three-profile smoke, exact-commit/live-baseline guards, zero retries and mandatory relevant failures. Reuse successful CI hosted evidence and update master docs for changed behavior/lasting decisions rather than every fix. The [framework plan](plans/2026-11-25-proportionate-framework.md) owns validation and non-publication status; unrelated nightly failures remain under their existing repair task.

- 2026-11-25: Casey requested removal of the superseded art-review and building-pilot experiments and investigation of the failed scheduled check. Removed only those two exact registered worktrees after verifying all nine released architecture source-image hashes in the independent archive; other worktrees and stashes remain. The [cleanup and repair plan](plans/2026-11-25-worktree-cleanup-and-nightly-repair.md) records diagnosis, validation and completion. Test-only corrections validate without republishing unchanged game output.

- 2026-11-25: Map prepared `game/art/fx/` samples to the same smoke/scenes/sound/music coverage as music assets and their existing `Sound` loader. Dependency review confirms these are byte replacements with unchanged event routing; the sound suite decodes every one of the 64 assets in all profiles, while core checks retain hashes, metadata and offline inventory. Protocol regression covers all 64 paths and retains full coverage for shared code, fixtures, packaging or missing baseline evidence. This corrects a missing asset-family mapping after the predecessor's full release passed; no known failure, assertion or release gate is waived.

- 2026-11-25: The landscape full gate exposed ambient-dependent NPC cache saturation and long WebKit guided-day fixture traces. Fill both NPC caches explicitly with distinct source frames while retaining exact limits. Observe joystick route progress in-page rather than through thousands of repeated protocol polls; preserve real controls, physical endpoints, interruption/stall guards, existing deadlines, assertions, full coverage and zero retries. Record failed run 45663390526 in the landscape plan and require focused repairs plus a fresh full exact-commit gate. Release `3c80162` subsequently passed all 495 cases and hosted checks; its history records the two hosted-only rechecks after CDN failures on the unchanged, already-published candidate. No repeated game publication or assertion/deadline/coverage changes were needed for those availability checks.

- 2026-11-25: Casey requested explicit coordination of three concurrent agents after the combined dungeon/locomotion gate failed WebKit. Keep development parallel in isolated worktrees, assign both failures and the first recovery release to the building task, use the locomotion task for bounded compatibility review, and publish landscape after integrating verified recovery and closure. Preserve exact-commit checks and live-baseline guards; no executable workflow changes or new game deployment are needed for these assignments.

- 2026-11-24: The complete WebKit profile in the audio replacement run outgrew the 60-minute browser-job budget after reaching case 136; its four full guided-day cases alone took about 21 minutes on the two-worker runner. Raise the browser-job allowance to 90 minutes while retaining all selected cases, per-test deadlines, zero retries and fail-closed publication. The separate visible-rescue fixture overshoot is repaired with stopped short-key movement; the audio plan records the failed run and required fresh gate.

- 2026-11-24: Casey requested shorter, risk-based release checks after repeated long browser runs. Introduce conservative named-suite selection, mandatory three-browser smoke, full fallback for shared/unknown/high-risk changes, nightly non-publishing full coverage and separate publication gating. Preserve every existing case and zero retries. Use focused local work plus one authoritative CI release gate; do not narrow a known failure or duplicate another agent's owned audit. This decision supersedes earlier blanket-full-browser selection descriptions below. Verified in implementation `a48b83d`, [Actions45500355397](https://github.com/caseyschindler123/Brasswake/actions/runs/45500355397):43 protocol checks and27 selected browser cases passed in2m37s; game publication was skipped. The tiered-verification plan retains exact evidence and limits.

- 2026-11-23: The skills/NPC release's exact-commit CI used 54.3 minutes for 243 browser cases and nearly the entire 60-minute build window. Backstab, pursuit, theft integrity and character ownership add further required cases. Increase the build budget to 90 minutes to retain all coverage; deployment remains 15 minutes, with no reduced assertions or test selection.

- 2026-11-23: Cartography release 17441a1 passed all 210 UI cases on an explicitly dispatched validation branch before main advanced. Its final test-only main diff correctly selected no additional UI; independent hosted UI verification was explicitly enabled after deployment. Preserve both the full exact-commit validation and deployment run links in release history. Close plans/master summaries in a later Markdown-only commit without redeploying unchanged game output.

- 2026-11-23: Casey requested correction of stale release plans and current-state summaries. Tracked release history and closed plan milestones now preserve completion across fresh clones; ignored receipts are supporting evidence. Context closure uses document review and diff checks, with no game retesting or deployment. This update was initially held locally; Casey later explicitly authorized including all outstanding infrastructure/context changes with the cartography/game release.

- 2026-11-23: Casey classified the cost-summary rule as simple and requested proportional testing. Planning follows complexity; verification follows affected behavior. Docs/instruction changes use review and a diff check, tooling uses focused checks, and game releases retain their full verification and relevant UI gates. Each completion message reports available task costs honestly; unavailable billing remains unavailable. Casey initially requested a local hold, then explicitly authorized including all outstanding infrastructure/context updates in the now-verified cartography release.

- 2026-11-23: The world/capital release expanded browser coverage to 165 cases. Run `45136774222` passed 160 cases without failures before its 45-minute build limit cancelled the remaining captures. Increased the build budget to 60 minutes; the deployment budget remains 15 minutes and test selection/assertions remain unchanged. Validate the repair branch with a manual workflow run (no comparison SHA, so the full browser suite runs) before advancing main. Independently verify the exact hosted commit, HTML hash and player flow afterward.

- 2026-11-22: The 28-floor dungeon rebuild adds all-floor interaction coverage across phone Chromium, phone WebKit and desktop. Increased the build job limit from 15 to 30 minutes to retain that coverage alongside existing simulations and browser installation. Deployment retains its 15-minute budget; no test selection or assertion is skipped to fit the old limit.

- 2026-11-22: Casey chose automatic Codex classification and automatic deployment for both simple and complex implementation tasks. Complexity determines planning and verification depth. Root AGENTS.md makes the workflow automatic; executable local/CI checks gate release, followed by live commit and browser verification.
- 2026-11-22: Casey required deliberate, cost-effective subagent selection by the main agent and relevant UI testing only. This framework-only change needs tooling verification and live commit/HTML checks, not a game UI pass. Future game changes select browser tests automatically.

- 2026-11-22: The story/first-day release expanded coverage to 135 browser cases. The initial CI run reached 119 passing cases without failures before its 30-minute limit cancelled the job. Increased the build budget to 45 minutes; deployment retains 15 minutes and no assertions or test selection are weakened. For this repair, a manual workflow run on the repair branch has no comparison SHA and therefore forces all browser coverage. Only after that exact commit passes is main advanced; independent hosted UI verification remains required even if main’s infrastructure-only diff selects no browser suite.

- 2026-11-23: The path-audit CI reached midnight UTC during a multi-floor component run: the authored daily reset cleared earlier seals and correctly denied the vault. Give one-day dungeon fixtures an advancing noon calendar; preserve the separate daily-rollover regression and all combat/reward/reload assertions. Browser-regression edits now select full UI validation before publication.

- 2026-11-23: A prepared owner-switch return beside a Sheepdog selected the animal through the native nearest-action control. Keep the same live opponent, choose an unambiguous adjacent tile, wait for scene/UI readiness and verify the exact target before reading fight state. Preserve the ownership/wound assertions; shipped gameplay is unchanged.

- 2026-11-23: Three serial path-audit CI runs each reached 287/288 before a fixture failure; Casey asked why validation took so long. Split all existing browser projects into independent required jobs, retaining the stable aggregate `build` check and fail-closed release selection/dependencies. Local verification stays inline. The story ending fixture waits for world/input readiness and the existing touch-redraw window, uses native phone touch, and asserts the visible reopened archive. No shipped gameplay changed.

- 2026-11-23: A travel fixture’s late old-scene body-sheet request was canceled by deliberate navigation after a network-idle wait. Draw and pause that fixture scene before settling requests and reloading; preserve the strict asset-error and immediate save/landing assertions.

- 2026-11-23: Parallel path-audit release `dab3b4a` passed core, all three 96-case browser profiles, the stable aggregate, Pages deployment and hosted verification in Actions 45322676588. Independent hosted UI verification also passed. Keep all selected checks required; close tracked context with Markdown-only commits after publication. Exact UTC time and HTML hash are in release history.
