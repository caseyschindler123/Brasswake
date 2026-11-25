# Proportionate planning and release verification

Classification: complex because suite registration, selection and fail-closed release validation must agree. Status: locally verified; exact-commit CI pending. This changes developer tooling, not the published game.

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

Costs: task-specific AI/CI billing unavailable; no delegated worker or paid generation used at initialization. No game deployment is intended.
