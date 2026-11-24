# Tiered verification and publication

Status: implementation in progress. Classification: complex; scope selection, browser execution and the publication gate must agree.

## Acceptance

- Focused changes run core checks, a short three-browser smoke test and affected named suites. Shared gameplay/save/movement/offline/build/runtime changes and unknown game files select full coverage conservatively.
- Full coverage retains every existing case and all three browser profiles, zero retries and original assertions. Nightly and explicit full runs include long guided-day/dungeon flows without publishing automatically.
- Tooling-only changes run focused protocol checks and do not upload/deploy a game. Browser-test repairs run their affected suite plus smoke; shared fixture/config changes conservatively select full coverage.
- Missing comparisons, invalid/empty suite requests and incomplete selected browser jobs cannot permit an unsafe release. A manual smoke run cannot publish.
- Local work uses focused regressions and core checks; the exact-commit CI gate is the authoritative complete release run. A required failure must be repaired, never hidden by narrowing scope.
- Keep live commit/HTML/offline integrity and short hosted-flow verification for actual releases. Keep real-device/visual review requirements where affected. Document deterministic UI-fixture ownership separately from balance/probability testing.
- Preserve active audio edits through this isolated worktree; no gameplay/art/balance changes.

## Milestones

- [x] Inspect existing instructions, selector, runner and Actions gate; isolate checkout.
- [x] Add named suites, conservative impact mapping and strict selection validation.
- [x] Connect local/CI execution, nightly/manual coverage and release-only publication.
- [x] Add focused regression tests, compare full test inventory and execute selected smoke coverage.
- [x] Reconcile AGENTS/master workflow/architecture and dated decisions.
- [ ] Commit/push intended automation/docs; observe exact-commit tooling CI and a non-publishing three-browser smoke run. Record outcomes and limitations.

## Verification

Run protocol unit/CLI/gate tests, syntax/YAML/workflow checks, and full-versus-focused Playwright discovery. Compare the full inventory before/after so no original case disappears. Execute the short smoke suite in all three profiles to verify real runner wiring, without replaying unrelated long campaigns or changing the game. This tooling task does not require a game deployment; confirm CI skips publication. Scheduled/full fallback behavior is covered by focused tests and discovery; do not claim an unrun nightly suite passed.

Task-specific AI/CI dollar billing is unavailable. One bounded read-only protocol safety reviewer was used; no paid tools.

## Implementation evidence

- All 429 original browser cases remain discoverable with identical project/file/title inventory before and after. Focused smoke discovers nine cases; music selection adds its suite without unrelated guided days. Shared/unknown source changes retain full coverage.
- Protocol/CLI/aggregate/selection/discovery checks passed 43/43 in about three seconds. An initial discovery assertion assumed absolute filenames; comparison now handles the actual relative filenames. Dry-run CLI checks preserve the real CI selection receipt.
- Real local smoke passed9/9 in52.3s across phone Chromium/WebKit390x720 and desktop1280x800. Only original committed game assets were built in this isolated checkout; no game source/art was edited or published.
- The bounded read-only safety review is complete with no remaining blocker. Exact-commit Actions and publication-skip evidence remain pending. A future nightly full execution is not claimed as run during this task.

- Safety review additionally closed cumulative failed-rollout coverage, stale-job/rollback and moved-baseline guards, already-published retry behavior, live-only publication eligibility, quoted/renamed Git paths, PR baseline divergence and canonical build/lifecycle classification. Workflow YAML now has a pinned dev-only parser with duplicate-key and semantic wiring checks. No runtime dependency was added.
- Coverage uses both live and push changes; publishing uses only the actual live difference. If verified live metadata/content is unavailable, publishing workflows fail early. Missing Git comparison retains full fallback. Full receipts retain their verified baseline even on fallback; the late guard checks it again before Pages.
