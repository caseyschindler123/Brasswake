# Tiered verification and publication

Status: complete and active on main. Classification: complex; scope selection, browser execution and the publication gate must agree.

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
- [x] Commit/push intended automation/docs; observe exact-commit tooling CI and a non-publishing three-browser smoke run. Record outcomes and limitations.

## Verification

Run protocol unit/CLI/gate tests, syntax/YAML/workflow checks, and full-versus-focused Playwright discovery. Compare the full inventory before/after so no original case disappears. Execute the short smoke suite in all three profiles to verify real runner wiring, without replaying unrelated long campaigns or changing the game. This tooling task does not require a game deployment; confirm CI skips publication. Scheduled/full fallback behavior is covered by focused tests and discovery; do not claim an unrun nightly suite passed.

Task-specific AI/CI dollar billing is unavailable. One bounded read-only protocol safety reviewer was used; no paid tools.

## Implementation evidence

- All 429 original browser cases remain discoverable with identical project/file/title inventory before and after. Focused smoke discovers nine cases; music selection adds its suite without unrelated guided days. Shared/unknown source changes retain full coverage.
- Protocol/CLI/aggregate/selection/discovery checks passed 43/43 in about three seconds. An initial discovery assertion assumed absolute filenames; comparison now handles the actual relative filenames. Dry-run CLI checks preserve the real CI selection receipt.
- Real local smoke passed9/9 in52.3s across phone Chromium/WebKit390x720 and desktop1280x800. Only original committed game assets were built in this isolated checkout; no game source/art was edited or published.
- The bounded read-only safety review is complete with no remaining blocker. Exact-commit Actions and publication-skip evidence passed; final evidence follows. A future nightly full execution is not claimed as run during this task.

- Safety review additionally closed cumulative failed-rollout coverage, stale-job/rollback and moved-baseline guards, already-published retry behavior, live-only publication eligibility, quoted/renamed Git paths, PR baseline divergence and canonical build/lifecycle classification. Workflow YAML now has a pinned dev-only parser with duplicate-key and semantic wiring checks. No runtime dependency was added.
- Coverage uses both live and push changes; publishing uses only the actual live difference. If verified live metadata/content is unavailable, publishing workflows fail early. Missing Git comparison retains full fallback. Full receipts retain their verified baseline even on fallback; the late guard checks it again before Pages.

## Verified automation closure

- Implementation commit: `a48b83db4c1a33065331f3931b0a54ca2bfbecf7`. [Actions 45500355397](https://github.com/caseyschindler123/Brasswake/actions/runs/45500355397) completed successfully on 2026-11-24,22:25:18UTC (14:25:18PST), in157s (2m37s). Its43 protocol checks passed; selection was focused, game-core=false, publication=false and live-check=false. All27 selected cases passed (nine per profile): phone Chromium48.3s, WebKit1.3m and desktop1.1m. The required aggregate passed and the deployment job was correctly skipped.
- Live source/HTML independently reverified at2026-11-24T22:27:03.070Z (14:27:03PST): existing game `8b83e29242bd3535088da87bcd412d131b1ef1b7`, HTML SHA-256 `cae1bd9824ed80952643fb17288cd3c067ae6383e1ddcc3fc8557e20760a5e3d`. This protocol change did not redeploy the game. No game-release-history entry is needed for unchanged game output; this tracked plan records automation adoption.
- All429 original browser cases remain in the full inventory. The nightly full trigger and non-publication behavior were validated through selector/CLI/YAML/gate tests and full discovery; its first scheduled execution was not run during this task. No claim is made that all429 cases executed again here. Local smoke9/9 and final43 focused protocol checks passed, with no required skips/retries. The single bounded read-only reviewer reported no remaining blocker after the safeguards were fixed.
- Active audio source/assets/status work in the shared checkout was preserved. This isolated branch changes no game source, player assets or runtime dependency. Task-specific AI/reviewer and CI billing remain unavailable; no paid-tool usage. Documentation-only closure needs no additional build/browser run or game deployment.
