# Automatic coding workflow

Classification: complex; project-wide instructions, browser tests, build metadata, and deployment gating change together.

## Acceptance criteria

- Codex automatically classifies coding requests, plans proportionally, and proceeds through release without a skill invocation or routine approval.
- Simple and complex paths both require passing checks and automatic deployment; explicit discussion/hold requests still take precedence.
- One local/CI verification command checks art, existing automated suites, build, workflow tooling, and selects browser flows only for relevant game changes.
- Screenshots support actual visual inspection and failures retain diagnostics.
- GitHub Pages publishes only the built game and release metadata. Live verification checks the pushed commit and HTML integrity; a real player flow runs only when game changes require UI coverage.
- Main-agent delegation follows clear task boundaries and selects models/effort economically, avoiding duplicate work.
- The framework is committed, pushed to main, and the exact release is verified live.

## Milestones

- [x] Inspect existing project instructions, test harness, build, and deployment.
- [x] Add root instructions and detailed workflow; reconcile existing docs.
- [x] Add portable browser harness, behavior/scene tests, and one verification command.
- [x] Add commit metadata, CI release gates, diagnostics, and live smoke checks.
- [x] Run relevant tooling/release checks, review the diff, and fix failures. No game UI run is needed for this framework-only change.
- [ ] Commit and push; monitor deployment and verify the exact live release.

## Verification and release evidence

Run `npm run verify` from `game/`; assert that this framework-only change selects no UI pass and that built HTML matches the previous commit. Exercise selection decisions and rejection of stale live commits, incorrect HTML, and missing files through tooling tests. Browser suite configuration and syntax are checked without launching a browser; its interaction assertions await the first relevant game change. Record commands/results here before committing. Final post-push receipt goes in ignored `work/automatic-workflow-release.json` and the task report so that recording release success does not cause a new release loop. No worker was needed for this tightly coupled setup; delegation would add coordination overhead.

Pre-push evidence (2026-11-22): `npm run verify` passed the 486-file art baseline, engine/content (`ALL GOOD`), poker (4,651 opponent questions checked against SQL), casino, tooling, and build. The selector returned `ui: false`; the baseline build and current game HTML are identical. After adding a server integration check, the focused `node --test test/workflow.test.js test/server.test.js` passed all 21 tests with localhost access. `npx playwright test --list` discovered 27 browser cases without running UI. JavaScript syntax checks and `git diff --check` passed. CI will rerun the complete final gate on the exact pushed commit. The final release checkbox is intentionally pending in this pre-push snapshot; its completed state belongs to the post-push receipt and Actions run.
