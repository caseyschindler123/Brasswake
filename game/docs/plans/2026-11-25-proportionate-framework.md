# Proportionate planning and release verification

Classification: complex because suite registration, selection and fail-closed release validation must agree. Status: local checks and exact-commit CI core passed; selected browser CI pending. This changes developer tooling, not the published game.

## Acceptance criteria

- Default routine implementation to simple; require a named consequential risk or unresolved design decision for complex planning. Keep planning independent from verification.
- Keep short three-profile smoke and affected browser regressions on routine releases. Separate the four complete profession days into an explicit journeys suite, retained in nightly/manual full and all shared/save/movement/runtime/packaging/unknown fallbacks.
- Extend focused mappings only for reviewed presentation modules/assets. Preserve unknown-path fallback, coverage of unpublished changes, exact-commit gates, zero retries and mandatory relevant failures.
- Use one exact-commit CI release gate and concise affected hosted checks. Keep full hosted validation for risky changes, explicit requests and unknown selection; never duplicate an unchanged passing hosted run without a reason.
- Update existing project instructions consistently and document lasting changes without requiring master-document churn for every small fix.
- Verify selector/gate regressions, real browser discovery, short three-profile execution and exact-commit CI. Tooling-only changes must not deploy unchanged game output. Preserve the separate cleanup/nightly-repair task and its known failures.

## Milestones

- [x] Inspect instructions, current selector/runners, CI and measured historical test costs; create isolated worktree from c2055f6.
- [x] Implement journey registration, focused mappings and conditional hosted checks with regression coverage.
- [x] Reconcile root/master workflow instructions and dated decisions.
- [x] Pass focused automation checks and short three-profile browser execution; review diff and discovery evidence.
- [ ] Integrate safely, push intended changes to main, monitor exact-commit tooling CI without game deployment, and record result.

## Verification and limitations

Run `npm run test:protocol`, build only for short runner coverage, and execute selected smoke/scenes in all three profiles. Discovery must retain the exact four profession journeys in full coverage and exclude them from first-day focused coverage while keeping its targeted regressions. Validate malformed/missing scope rejection and full fallbacks. Current unrelated scheduled guided-day/arrival failures remain owned by the separate repair task; this task does not claim to repair them or establish a passing nightly. No physical-device or gameplay change is intended.

Local evidence (2026-11-25 America/Los_Angeles): all 50 protocol/workflow checks passed, including actual local/hosted browser discovery, missing-journey gate rejection, asset/offline hosted selection and risky/unknown unions. `node build.js` prepared the unchanged game for runner coverage; all 27 smoke/scenes cases passed across 390×720 phone Chromium/WebKit and 1280×800 desktop Chromium in 3.6 minutes, with zero retries. `git diff --check` passed. No game source, assets, runtime dependencies or packaging changed. Initial dependency discovery lacked installed worktree packages; locked `npm ci` resolved it. A sandbox-restricted browser attempt was stopped and rerun with authorized localhost/process access. Neither attempt changed assertions or coverage.

Initial implementation `c3c8fec7324fba4b15ea35cae2242bd1a6724fdb` was pushed to main. [Actions 45701638721](https://github.com/caseyschindler123/Brasswake/actions/runs/45701638721) passed core/build and 57 combined protocol/workflow/offline/server checks at 2026-11-25 13:13 PST. Its validated plan selected smoke, first-day and journeys because their owning registration changed, with `release=false` and `live=false`; Pages configuration/upload were skipped. Final review found the inherited ActorRig appearance mapping unsafe because it now supplies physical walking/running speeds. Restore its full fallback and cover it with selector/hosted regressions. The initial browser run is superseded, not counted as a pass; stop only that task-owned run to avoid duplicate work. The separate task's dirty main checkout was preserved; this task pushed its isolated, fast-forward descendant directly to remote main.

After the ActorRig safety correction, all 51 local protocol/workflow checks passed with zero failures or skips. Registration and browser assertions were unchanged, so the passing 27-case local runner evidence remains applicable; the corrected commit requires fresh CI.

Costs: task-specific AI/CI billing unavailable; no delegated worker or paid generation used at initialization. No game deployment is intended.
