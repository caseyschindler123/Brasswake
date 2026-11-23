# Automatic coding and release workflow

Last updated: 2026-11-22.

Casey describes the outcome. Codex classifies the work, plans, develops, tests, reviews the UI when applicable, updates documentation, commits, pushes, deploys, and verifies the live game. Both simple and complex tasks have standing authorization to deploy after required checks pass. No skill name or routine approval is required. Questions and discussion do not initiate releases; explicit task-specific instructions override these defaults.

## Classify and plan

| Class | Choose when | Planning |
|---|---|---|
| Simple | A focused, understood change with limited impact and uncertainty | A brief approach and observable acceptance criteria in the task update |
| Complex | New systems, connected-system changes, architecture, saves, release infrastructure, or substantial uncertainty | A saved plan in `game/docs/plans/YYYY-MM-DD-topic.md` with acceptance criteria, implementation milestones, verification, and release status |

State the class and the reason early. Casey may override it. Upgrade a task if investigation reveals broader implications. Complexity changes planning and verification depth; it does not introduce a deployment approval step. Plans record actual progress and evidence, including unresolved failures.

## Develop and verify

1. Read the root `AGENTS.md`, project instructions, architecture, and relevant topic docs. Inspect git status before editing and preserve unrelated work.
2. Establish the behavior that must change and how it will be checked. Implement in manageable stages; run focused checks during development. Add regression coverage where it verifies behavior or a meaningful failure mode. Pure wording changes need no mirrored unit test.
3. Install locked dependencies with `npm ci` from `game/`. On a new machine run `npm run test:install` to install the pinned Playwright browsers (Linux also installs browser system dependencies).
4. Run `npm run verify` from `game/`. This validates committed packed art, runs the engine/content, poker, casino, and workflow-tooling suites, builds the site, and selects relevant UI tests. Local and CI use the same command. Documentation, agent instructions, CI, test tooling, and development-dependency changes do not require game UI testing. Source/art changes and runtime-dependency changes require browser tests; build changes require them when the rendered HTML differs from a baseline build. Missing comparison evidence defaults to UI coverage. Local comparison uses `origin/main` plus working changes; CI supplies the push's previous SHA or PR base. Use `npm run verify -- --ui` to request more coverage. The selection and reason are saved in ignored `work/test-selection.json`. Changes to art tools additionally require the pinned Python art-tool suite and verifier described in architecture; do not claim those ran for an unrelated change.
5. Browser tests cover phone Chromium, phone WebKit (390×720), and desktop Chromium (1280×800). They exercise character creation, navigation, SQL execution, save-code export/import, and persistence; the localhost fixture captures title, town, fight, bag, paper doll, dungeon, dojo, and interior scenes. Each test uses isolated browser storage. The fixture and debug controls are never deployed.
6. For UI, rendering, art, or layout changes, add targeted interaction assertions and open the affected screenshots in `game/test-results/`. Inspect readability, clipping, touch controls, asset placement, and the intended behavior. Captured screenshots are evidence for human/agent review, not pixel-difference approval. Never bless new screenshot baselines to conceal a defect. Real-device audio, performance, and iPhone keyboard behavior require real-device evidence when relevant.
7. Review the diff, update the relevant master docs and Decision logs, and confirm all acceptance criteria. Fix failures and rerun affected checks. Do not ship with a required check skipped or unresolved. If tools or external access prevent verification, say exactly what is blocked rather than reporting success.

## Commit and deploy automatically

- Stage only the task's intended files. Keep raw art, build output, browser binaries, reports, credentials, and temporary files out of git. Never commit another task's edits accidentally.
- Commit with a concrete description. Push the tested commit to `main` with `git push origin main`. If working on another branch, integrate normally and reverify the resulting main; do not force-push or overwrite remote work. If the remote advanced, fetch, integrate safely, and rerun checks on the result.
- GitHub Actions installs locked dependencies, runs `npm run verify` within a 45-minute build budget, and deploys only after validation succeeds. Browsers are installed only when UI tests are selected. Pull requests validate without deploying. Validation reports/screenshots are retained as workflow artifacts when generated; they are not part of the published game.
- The build writes `dist/release.json` with the source commit and built HTML SHA-256. After Pages deployment, the workflow polls for that exact commit and checks the live HTML hash. Releases requiring UI coverage additionally exercise the real hosted game in a fresh browser context, without replacing its SQL dependency or using local debug handles. Framework-only releases do not launch a browser.
- Monitor the run for the pushed SHA, for example `gh run list --workflow pages.yml --commit <sha>` and `gh run view <run-id>`. A green build alone is not a verified deployment; the deployment and live-check steps must pass too.
- For an independent live check, set `BW_BASE_URL=https://caseyschindler123.github.io/Brasswake/` and `BW_EXPECT_COMMIT=<full-sha>` in the shell, then run `npm run test:live` from `game/`. Set `BW_LIVE_UI=true` as well when game changes require browser verification. Clear task-specific environment variables afterward. The basic check needs network access; the UI check also needs Chromium.
- If validation fails, repair the change and rerun checks before pushing a correction. If deployment or live verification fails, inspect the failing step, repair and redeploy, and verify the new SHA. Do not call it done or blindly retry permanent failures. Any emergency rollback must preserve git history and be verified as a separate release.

## Completion report

Report the task class, user-visible outcome, tests actually run, visual evidence reviewed when applicable, commit SHA, deployment link/status, and material limitations. Mark a complex plan complete only after the deployed release is verified. Keep local follow-up evidence in ignored `work/` when writing it after the release commit would otherwise require another deployment.

## Delegation and cost

The main agent owns classification, acceptance criteria, task decomposition, integration, and release. Use the delegation rules in root `AGENTS.md`: default to one agent, delegate only bounded independent work with a clear expected benefit, select the least expensive suitable available model and reasoning effort, and escalate capability when the evidence warrants it. Avoid duplicate reading, overlapping edits, recursive delegation, unnecessary screenshots, and repeated unchanged test runs. Prefer narrow worker context and concise deliverables. Exact costs depend on the available product/model; do not invent a price or promised savings.

## Decision log

- 2026-11-22: The 28-floor dungeon rebuild adds all-floor interaction coverage across phone Chromium, phone WebKit and desktop. Increased the build job limit from 15 to 30 minutes to retain that coverage alongside existing simulations and browser installation. Deployment retains its 15-minute budget; no test selection or assertion is skipped to fit the old limit.

- 2026-11-22: Casey chose automatic Codex classification and automatic deployment for both simple and complex implementation tasks. Complexity determines planning and verification depth. Root AGENTS.md makes the workflow automatic; executable local/CI checks gate release, followed by live commit and browser verification.
- 2026-11-22: Casey required deliberate, cost-effective subagent selection by the main agent and relevant UI testing only. This framework-only change needs tooling verification and live commit/HTML checks, not a game UI pass. Future game changes select browser tests automatically.

- 2026-11-22: The story/first-day release expanded coverage to 135 browser cases. The initial CI run reached 119 passing cases without failures before its 30-minute limit cancelled the job. Increased the build budget to 45 minutes; deployment retains 15 minutes and no assertions or test selection are weakened. For this repair, a manual workflow run on the repair branch has no comparison SHA and therefore forces all browser coverage. Only after that exact commit passes is main advanced; independent hosted UI verification remains required even if main’s infrastructure-only diff selects no browser suite.
