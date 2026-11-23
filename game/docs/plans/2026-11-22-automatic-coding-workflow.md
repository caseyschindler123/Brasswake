# Automatic coding workflow

Classification: complex; project-wide instructions, browser tests, build metadata, and deployment gating change together.

Status: complete. Released `11822f619f9ef78d0a3b4eb936865249080f242e`; [durable release evidence](../RELEASE_HISTORY.md#automatic-coding-workflow). The original design/checkpoint notes below are historical; current process rules live in 05_CODING_WORKFLOW.md.

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
- [x] Commit and push; monitor deployment and verify the exact live release. See linked release evidence.

## Verification and release evidence

The original verification plan called for `npm run verify` from `game/`, no UI pass when built HTML matches, and tooling coverage for selection decisions, stale commits, incorrect HTML and missing files. Browser configuration/syntax was checked without launching a browser. Final completion is preserved in the linked release history; `work/automatic-workflow-release.json` is supplementary. No worker was needed for this tightly coupled setup.

Pre-push evidence (2026-11-22): `npm run verify` passed the 486-file art baseline, engine/content (`ALL GOOD`), poker (4,651 opponent questions checked against SQL), casino, tooling, and build. The selector returned `ui: false`; the baseline build and game HTML were identical. After adding a server integration check, the focused `node --test test/workflow.test.js test/server.test.js` passed all 21 tests with localhost access. `npx playwright test --list` discovered 27 browser cases without running UI. JavaScript syntax checks and `git diff --check` passed. Exact-commit CI, deployment and live commit/hash checks subsequently passed; the release milestone is complete.
