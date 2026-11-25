# Scope-based testing and development scenarios

Status: planning/documentation deliverable complete; executable implementation is not started. This documentation task is simple. Future changes to selection/publication contracts require their own concrete risk assessment; the requested full plan does not make every milestone complex.

## Objective and boundaries

Give each change the smallest set of checks that can establish its intended behavior and relevant integration safety. Make visual iteration and prepared battles/gear/buildings quick to reach. Codex runs automation and opens relevant captures; Casey is not responsible for routine QA. Keep exact-commit release evidence, unknown-risk fallback and mandatory relevant failures.

This change updates documentation and saves the implementation plan. It does not add Dev mode, implement new tiers, relax current gates, run executable tests, or deploy. The target criteria are in [05_CODING_WORKFLOW.md](../05_CODING_WORKFLOW.md#planned-scope-based-criteria-not-built). Existing commands/gates remain authoritative until their replacements pass staged validation.

## Evidence and current gaps

- `test/verify.js` runs every core group sequentially before selecting UI; `--defer-ui` defers UI only. Even an asset or narrow tooling change can inherit unnecessary core work.
- `test/select-tests.js` maps files to broad suites, requires smoke in all three profiles for focused releases, and falls back to full for unknown/shared impact. It does not understand cosmetic-only or registration-only behavior. A user-supplied scope label must never override evidence.
- Journey registration lives inside `test/browser/first-day.js`. That file imports `dungeons.js` for `walk`, and importing it registers dungeon tests. An unchanged helper dependency can silently expand a focused selection.
- The previous framework registration change passed [Actions 45702939890](https://github.com/caseyschindler123/Brasswake/actions/runs/45702939890) at `cd887b1`: 25 cases/profile, with WebKit taking 36.0 minutes and Chromium profiles 16.4/16.2 minutes. Its local 27-case smoke/scenes check took 3.6 minutes. These are historical measurements of different selections, not a promised speedup or checks rerun for this plan.
- Changes since the published baseline are unioned with the push/PR delta. This preserves failed unpublished game changes but can repeatedly select already-verified test-only edits until a later game release. Fixing this requires trustworthy verification provenance; do not simply drop historical files from the union.
- Existing localhost `__bw`, `/__visual`, prepared battle helpers and pure rules already supply much of the setup. Reuse them; there is no reason to build a second game engine or require a large control panel first.
- README and architecture contain blanket or stale verification instructions. Historical plans, audit results and decision entries describe what actually ran; retain that evidence and distinguish it from current policy.

## Acceptance criteria

1. Documentation identifies current behavior and planned behavior unambiguously. One canonical scope matrix owns the rules; entry points and topic guides link to it. No future command is presented as available.
2. A documented local cosmetic change selects build/affected asset checks and relevant phone/desktop captures, without unrelated core groups, profession days, campaign tests or new assertions that merely repeat an appearance edit. Global layout, input/collision anchors, runtime and unknown impact remain protected.
3. Rule calculations use actual pure runtime functions where available. Browser interaction tests prepare the relevant situation directly and then exercise ordinary game controls/rules. Setup does not establish that travel, progression or earning the supplied items works.
4. Registration changes are isolated from scenario bodies and shared behavioral helpers. Discovery proves full inventory/long journeys remain intact; changing registration alone does not replay complete journeys. Changing scenario actions/assertions or shared input/setup behavior runs affected scenarios, including known relevant failures.
5. The selector and CI represent selected core groups, suites, profiles, captures, hosted flows and reasons explicitly. Missing/malformed/inconsistent metadata, unknown changes and mixed-risk unions fail closed or select the conservative gate.
6. Every required result is enforced for the actual candidate/artifact. Failed/cancelled/skipped selected jobs, missing capture review for visual work and unverified publication identity cannot be called complete. No arbitrary timeout, retry or screenshot-baseline relaxation obtains a pass.
7. Dev commands/presets are test-only, deterministic where appropriate, resettable, validated and isolated from player saves. They are absent from production artifacts/origins and leave ordinary gameplay unchanged.
8. Preserve all existing scenarios/assertions. Rehome expensive journeys to their correct gates; do not delete them to improve runtime. Full nightly/manual validation still discovers and executes the complete inventory. Extended opt-in campaigns retain their distinct purpose.
9. Measure before/after latency, selected work and failures for representative tasks before making speed claims. Reuse unchanged passing evidence only when the selector can prove its provenance and compatibility.

## Delivery sequence

Milestones are local implementation checkpoints, not instructions to push and rerun a full CI suite after every edit. Develop coherent bounded slices in an isolated checkout, run focused local checks as behavior changes, review the intended selection before pushing, and reuse compatible passing results. The documentation milestone runs no game checks. The final rollout validates retained full coverage once when required; a new correctness risk or incompatible change can justify additional checks.

### M0 — Documentation audit and criteria (this task)

- [x] Save this plan and reconcile active testing documentation with current commands and planned criteria.
- [x] Review links, wording, current/planned distinctions and `git diff --check`. Commit/push this deliverable as Markdown only under the normal workflow.
- Deliverable: a fresh agent can choose a proposed target tier and can also see which current checks are still mandatory. No game/dependency installation, tests, build, screenshots or publication for this milestone.

### M1 — Separate test definitions, helpers and registration

Owned areas: `game/test/browser/first-day.js`, `dungeons.js`, helper modules, `ui.spec.js`, `ui-suites.js`, `protocol.test.js`, and documented inventory in 05. Keep actual scenario transactions/assertions unchanged during this refactor.

- Extract reusable movement/dungeon setup helpers into modules that register no tests. Importing `walk` must not discover dungeon cases.
- Give complete profession days a distinct registration boundary and an explicit dependency on the necessary helpers. Keep targeted first-day regressions independently selectable.
- Define stable case/suite identities and explicit dependencies. Report transitive selection before execution; validate one owner for each discovered test.
- First add meaningful discovery regressions: smoke discovers only its cases; focused first-day has no dungeon or profession-day side effects; journeys discover all four professions in every required profile; full has the same scenario inventory plus any intentional new regressions.
- Run protocol/discovery checks and short real browser coverage for registration behavior. Shared helper behavior changes require their relevant real flows; keep such changes separate from registration so the evidence is reviewable. If extraction cannot preserve behavior, name the changed contract and broaden accordingly.
- Exit: no silent import-driven expansion, no lost assertions, exact registration checks pass, and long scenarios are selected because their behavior is affected rather than because their old file contains a condition.

### M2 — Define scenario setup and prove one battle

Owned areas: existing `test/server.js`, prepared battle/visual fixtures, small test-only command/preset modules, affected pure rule tests, and production-exclusion checks. Inspect adapters before choosing exact new filenames.

- Start with a test command interface that resets a disposable account and prepares one battle using the actual game catalogs/rules. A visual panel is optional and must not block automation or the faster cosmetic tier.
- Support validated item IDs, equipping, skills/attributes within real bounds, health/mana/stamina, known monster IDs/counts, seed and reset. Separate scenario setup from executing the behavior under test.
- Add bounded teleport/arrival setup using valid surface/interior/dungeon destinations and normal scene transitions. Reject impossible/unsafe destinations; clear stale fights, movement, scene ownership and pending callbacks. Teleport tests do not replace route/collision/progression tests.
- Reset storage, RNG, clocks, spawned entities, audio and asynchronous work between cases; restore temporary overrides on failure too. Keep deterministic combat fixtures separate from probability/distribution and balance tests. Use observable readiness rather than broad sleeps.
- After setup, exercise normal player actions for the behavior being tested. Assert actual resulting health/resources/inventory/reward state as appropriate, not the values injected by setup.
- Compare one short prepared battle against the existing route to it. Run scenario isolation/back-to-back checks, invalid-command checks and a smoke test of normal creation without Dev setup. Prove commands/debug state are absent in the production artifact and hosted context.
- Exit: a reusable battle scenario loads directly, gives repeatable checks, resets cleanly and cannot modify player saves. No separate simulation of production combat.

### M3 — Small core groups and affected visual scenarios

Owned areas: `verify.js`, `run-ui.js`, scene fixtures, screenshot helpers, asset validation, focused tests and 05's command reference.

- Inventory measured core groups and their consumers. Split selection from execution so a cosmetic tier can build/check affected assets without executing poker, casino, progression and campaigns. Shared build/runtime changes still require the conservative groups.
- Add direct capture selection for the changed scene instead of always capturing all eight scenes. Use 390×720 phone and 1280×800 desktop evidence. Include phone WebKit for CSS, font, compositing, audio/input or other relevant engine risk; record the reason for selected profiles.
- Keep assertions for clipping, failed assets, expected scene readiness and changed interactions where they provide meaningful evidence. A pure recolor/texture change needs visual inspection and integrity checks, not a new test restating its color value.
- Give battle gear appearance presets enough directions/poses to reveal clipping/hand placement. Give buildings known regional shells and entry/roof states; walk through doors only when geometry, anchors or interaction changed.
- Codex opens relevant generated captures and records a concise visual finding. Do not call screenshot capture alone a visual pass, and do not make Casey perform routine reviews.
- Exit: an isolated cosmetic example uses affected checks/captures without long journeys or unrelated core tests; input/layout/physical changes still select their interaction checks.

### M4 — Implement selection and release criteria together

Owned areas: `select-tests.js`, `ui-suites.js`, `verify.js`, `run-ui.js`, `release-gate.js`, `live-suites.js`, `live.js`, protocol/workflow tests, and `.github/workflows/pages.yml`.

- Implement the target matrix in 05 with explicit metadata for core groups, test cases/suites, browser profiles, captures and hosted flows. The internal format is an implementation detail; avoid adding a generic workflow engine.
- Use reviewed dependency boundaries or extracted narrow modules. A change to monolithic `game.js`, global CSS, shared movement or saves remains conservative until evidence establishes a safe smaller boundary. No unrestricted `--cosmetic` or model-written label may bypass that rule.
- Separate a genuinely short boot/SQL/save canary from long creation/arrival/profession flows. Decide which deployment-sensitive assertion the release canary establishes and keep its inventory bounded; preserve deeper save/arrival checks in their affected/full tiers.
- Validate all selected jobs individually or through a complete matrix result. The aggregate must reject missing/malformed plans, unknown scope/profile names, incomplete full inventory, missing visual evidence/review status where required, and failed/cancelled/skipped required jobs. Do not accidentally require jobs that the validated plan did not select.
- Preserve current live-baseline/ancestry/commit/HTML checks and asset/offline integrity. Every asset release validates changed files against the complete build manifest. Before reducing today's complete hosted offline flow for a same-path cosmetic replacement, add a prepared changed-asset/cache-availability regression and verify its coverage; cache/runtime/packaging/inventory changes and unknown impact retain the complete offline flow. Cosmetic source changes still publish changed output after their actual required gate; documentation/tooling-only changes never publish unchanged game output. Preserve cumulative unpublished game/dependency/packaging coverage after failed rollouts.
- Investigate repeated historical test-only selection separately: reuse only verified matching test/helper/runner/dependency/artifact evidence. Failed, missing, cancelled or incompatible evidence must retain checks. Leave the existing cumulative behavior in place if provenance cannot be established simply and reliably.
- Before the first push, review the complete diff and proposed selection once. Finish selector/guard review before running costly release checks. Fix a discovered defect with affected checks; do not rerun unchanged successful browser work without a concrete compatibility reason.
- Exit: matrix examples and mixed/unknown/failed-rollout cases are correct; exact candidate CI enforces them, and publication remains independently guarded.

### M5 — Expand useful presets without blocking the fast path

- Gear: grant/equip catalog items, set relevant skills, preview required directions/poses, check actual stat effects and reset inventory.
- Buildings: select real regional components/shapes/doors/furnishings, preview phone/desktop, and enter/exit using real interaction/collision when affected. Do not maintain an alternative structural compiler.
- Travel/monsters: select valid destinations and catalog monsters with bounded counts and complete cleanup. Add scenario IDs/presets as real tasks need them; avoid an exhaustive editor up front.
- An optional developer panel calls the same validated command interface as automation. Tests call commands directly and never spend time clicking through setup menus.
- Exit: affected work can be prepared in reusable scenarios without an earned campaign. Ordinary travel/earning/ownership remain separately covered when they change.

### M6 — Measured rollout and documentation closure

- Rehearse selection without execution for a cosmetic recolor, localized layout/control change, battle rule, weapon stat, gear sprite, building decoration, physical doorway, registration condition, shared movement helper, save migration, packaging dependency, unknown path and mixed cosmetic/save change. Compare with the target matrix; use negative cases to protect the risky fallbacks.
- Use real browser discovery to prove inventories/profiles, then one representative real scenario per newly introduced tier. Use existing historical timing evidence where applicable; do not repeat a full old suite merely to create another benchmark.
- Exercise publication gating through protocol/fixture checks without publishing unchanged game output. A manual non-publishing full run proves that all retained scenarios remain wired after the refactor; run it once on the final relevant source, or reuse compatible already-required exact-commit full coverage.
- Activate reduced CI selection only after its selection/gate regressions, representative checks and required full inventory validation pass. Until then, retain the existing gates; never merge a documentation-only waiver that pretends unfinished automation is active.
- Record selected work, setup/execution/review/CI queue duration and failures using existing reports. Initial engineering targets: small pure/protocol checks in seconds, prepared feature checks roughly under a minute per scenario, affected visual feedback within a few minutes. These are diagnostic targets, not promises or timeout/coverage limits. Investigate overruns; do not truncate a necessary check.
- Update the scope matrix/status and commands in 05; reconcile every active documentation entry in the inventory below. Close this plan's implementation milestones only after their actual evidence. Record game release identity/hash only if game output is published; tooling-only completion gets its commit/run and explicit non-publication.

## Regression and gate review checklist

| Case | Required evidence |
|---|---|
| Isolated recolor or decorative atlas replacement | Affected integrity/build/captures; no unrelated journeys/core groups; offline asset coverage retained when publishing changed assets |
| CSS/font/input or sprite/door anchors | Relevant WebKit/desktop layout or native input checks; physical/shared changes promote conservatively |
| Damage/gear/skill rule | Actual pure rule tests and focused prepared interaction for integration risk; no whole-day requirement solely to equip an item |
| Registration-only change | Exact discovery/inventory/dependencies and short runner execution; scenario bodies/helpers unchanged and no known relevant failure bypassed |
| Shared scenario helper or movement/save change | Affected real flows and conservative broad coverage, including any related known failure |
| Unknown path, missing baseline, malformed selection, mixed high risk | Full/fail-closed behavior; no user label silently narrows it |
| Tooling-only, scheduled or non-publishing manual check | Required validation passes; unchanged game output is not published |
| Failed game rollout followed by a test repair | Unpublished game risk remains in coverage; stale/failed receipts cannot authorize a smaller gate |
| Clean reset and production exclusion | Repeated/interleaved scenarios remain isolated; normal saves unchanged; debug commands absent in production |

## Documentation inventory and reconciliation

| Source | Treatment |
|---|---|
| `AGENTS.md`, `game/docs/PROJECT_INSTRUCTIONS.md` | Concise entry points; current safeguards and planned rollout link; simple remains default |
| `game/docs/05_CODING_WORKFLOW.md` | Canonical current commands and planned scope matrix; activate individual criteria only with verified executable support |
| `README.md` | Correct current docs/tooling/game distinction and commands; link canonical criteria and plan |
| `game/docs/01_ARCHITECTURE.md` | Actual runner/fixture dependencies, current/planned Dev mode boundary and scope pointers; remove blanket all-tests wording |
| `game/docs/03_ART_STYLE.md`, `REBUILD_ART.md`, `arttools/music/README.md` | Asset/pipeline evidence applies to affected work; no implication that every cosmetic edit needs a whole-game campaign; current gates still apply |
| `game/docs/PATH_PLAYTHROUGH_AUDIT.md`, `game/docs/STORY_COVERAGE.md` | Preserve historical observations; clearly distinguish future targeted testing from earned campaigns and human/device studies |
| `game/docs/02_GAMEPLAY.md`, `STORY_BIBLE.md`, `04_WRITING_STYLE.md`, `game/STYLE.md`, `arttools/WHEN_ART_ARRIVES.md`, `game/PLAN_LIVING_WORLD.md` | Audit relevant references; no new executable release policy or duplicate matrices. Preserve unrelated gameplay/writing and historical project-pass instructions |
| Closed `game/docs/plans/`, `RELEASE_HISTORY.md`, dated decision logs | Preserve facts/counts/failures of actual past runs. New policy is linked from current entry points; do not rewrite history into claims of cheaper past verification |
| Scripts/workflow/command help | M1–M6 implementation must reconcile their actual behavior with the matrix. This docs task changes none of them |

Review wording/link consistency and `git diff --check` for this task only. No executable tests, build, screenshots, dependency installation or deployment are needed for the documentation changes.

Planning validation (2026-11-25 America/Los_Angeles): reviewed all tracked active Markdown testing entry points and relevant topic references; changed ten active guides plus this plan. Checked relative file links in all eleven changed/new Markdown files with code examples excluded; no missing local targets. `git diff --check` passed. Historical release receipts, closed plans, unrelated gameplay/writing rules and all executable files remain unchanged. No game tests, dependency installation, build, screenshots, CI or deployment were started for this documentation task.

## References

Design guidance: [Google: smallest effective tests](https://abseil.io/resources/swe-book/html/ch11.html), [Playwright: isolation and user-visible behavior](https://playwright.dev/docs/best-practices), [Epic: distinct smoke/feature/stress tests](https://dev.epicgames.com/documentation/en-us/unreal-engine/automation-test-framework-in-unreal-engine). The target criteria are Brasswake-specific recommendations informed by those sources; measured results determine whether each change earns its maintenance cost.
