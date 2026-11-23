# Automatic coding and release workflow

Last updated: 2026-11-23.

Casey describes the outcome. Codex classifies the work, plans proportionally, makes the requested change and performs checks suited to its impact. Both simple and complex game changes have standing authorization to deploy after required checks pass. Documentation and Codex instruction changes require no game deployment. No skill name or routine approval is required. Questions and discussion do not initiate releases; explicit requests to leave edits local, hold deployment or stop override these defaults.

## Classify and plan

| Class | Choose when | Planning |
|---|---|---|
| Simple | A focused, understood change with limited impact and uncertainty, including ordinary docs or Codex rule edits | A brief approach and observable acceptance criteria in the task update; no saved plan |
| Complex | New systems, consequential connected-system/architecture/save changes, substantial release infrastructure changes, or substantial uncertainty | A saved plan in `game/docs/plans/YYYY-MM-DD-topic.md` with acceptance criteria, implementation milestones, applicable verification, and release status |

State the class and the reason early. Casey's override takes effect immediately. Classify by actual impact and uncertainty; editing workflow prose does not itself make a task complex. Upgrade a task if investigation reveals broader implications. Complexity determines planning; affected behavior determines testing and deployment. Keep the solution within the requested scope. Plans record actual progress and evidence, including unresolved failures.

## Choose checks by impact

| Changed behavior | Required checks | Release |
|---|---|---|
| Documentation or Codex instructions | Review wording, consistency and `git diff --check` | No game build, tests, screenshots or deployment |
| Developer tooling or CI configuration | Focused tests or configuration checks for the affected automation; broaden for concrete integration risk | No manual game deployment unless published output changes; existing CI may still execute on an automation change |
| Game code, player assets, runtime dependencies or built game output | Meaningful regressions and `npm run verify`; relevant browser tests and visual inspection | Automatic deployment and exact live commit/HTML verification |

A simple gameplay fix can need browser testing. A complex documentation change can need no executable tests. Do not add tests that merely repeat prose or run unrelated suites to satisfy a task label. Stop verification when the required checks pass unless new changes or unresolved evidence justify more. Markdown-only pushes are excluded from the Pages workflow; mixed changes retain their normal checks.

## Develop and verify

1. Inspect git status before editing and preserve unrelated work. For game implementation, read root `AGENTS.md`, project instructions, architecture and required topic docs. For documentation/Codex rule edits, read the affected instructions and relevant workflow sections; reuse context already read and avoid unrelated game-system investigation.
2. Establish the behavior that must change and how it will be checked. Implement in manageable stages; run focused checks during development. Add regression coverage where it verifies behavior or a meaningful failure mode. Pure wording changes need no mirrored unit test.
3. When executable checks need dependencies, use the locked dependencies; run `npm ci` when installation is needed. On a new machine run `npm run test:install` only when UI checks are needed (Linux also installs browser system dependencies).
4. For game changes, run `npm run verify` from `game/`. Documentation/instruction changes use the review checks above; tooling/CI changes use focused checks. `verify` validates committed packed art, runs the engine/content, poker, casino, and workflow-tooling suites, builds the site, and selects relevant UI tests. Local and CI use the same command for game releases. Source/art changes and runtime-dependency changes require browser tests; build changes require them when the rendered HTML differs from a baseline build. Missing comparison evidence defaults to UI coverage when using the release gate. Local comparison uses `origin/main` plus working changes; CI supplies the push's previous SHA or PR base. Use `npm run verify -- --ui` to request more coverage. The selection and reason are saved in ignored `work/test-selection.json`. Changes to art tools additionally require the pinned Python art-tool suite and verifier described in architecture; do not claim those ran for an unrelated change.
5. Browser tests cover phone Chromium, phone WebKit (390×720), and desktop Chromium (1280×800). They exercise character creation, navigation, SQL execution, save-code export/import, and persistence; the localhost fixture captures title, town, fight, bag, paper doll, dungeon, dojo, and interior scenes. Each test uses isolated browser storage. The fixture and debug controls are never deployed.
6. For UI, rendering, art, or layout changes, add targeted interaction assertions and open the affected screenshots in `game/test-results/`. Inspect readability, clipping, touch controls, asset placement, and the intended behavior. Captured screenshots are evidence for human/agent review, not pixel-difference approval. Never bless new screenshot baselines to conceal a defect. Real-device audio, performance, and iPhone keyboard behavior require real-device evidence when relevant.
7. Review the diff, update the relevant master docs and Decision logs, reconcile affected current/planned sections and confirm all acceptance criteria. Fix failures and rerun affected checks. Do not ship with a required check skipped or unresolved. If tools or external access prevent verification, say exactly what is blocked rather than reporting success.

## Commit and deploy automatically

- Stage only the task's intended files. Keep raw art, build output, browser binaries, reports, credentials, and temporary files out of git. Never commit another task's edits accidentally.
- If Casey requests local-only work or says not to deploy, leave edits uncommitted and do not push or dispatch a workflow. A push can trigger deployment even when no manual deploy command is used.
- Otherwise commit with a concrete description. Push the checked commit to `main` with `git push origin main`. Markdown-only changes do not trigger Pages and need no live verification. For game releases, if working on another branch, integrate normally and reverify the resulting main; do not force-push or overwrite remote work. If the remote advanced, fetch, integrate safely, and rerun applicable checks on the result.
- GitHub Actions installs locked dependencies, runs `npm run verify` within a 90-minute build budget, and deploys only after validation succeeds. Browsers are installed only when UI tests are selected. Pull requests validate without deploying. Validation reports/screenshots are retained as workflow artifacts when generated; they are not part of the published game.
- The build writes `dist/release.json` with the source commit and built HTML SHA-256. After Pages deployment, the workflow polls for that exact commit and checks the live HTML hash. Releases requiring UI coverage additionally exercise the real hosted game in a fresh browser context, without replacing its SQL dependency or using local debug handles. Framework-only releases do not launch a browser.
- Monitor the run for the pushed SHA, for example `gh run list --workflow pages.yml --commit <sha>` and `gh run view <run-id>`. A green build alone is not a verified deployment; the deployment and live-check steps must pass too.
- For an independent live check, set `BW_BASE_URL=https://caseyschindler123.github.io/Brasswake/` and `BW_EXPECT_COMMIT=<full-sha>` in the shell, then run `npm run test:live` from `game/`. Set `BW_LIVE_UI=true` as well when game changes require browser verification. Clear task-specific environment variables afterward. The basic check needs network access; the UI check also needs Chromium.
- If validation fails, repair the change and rerun checks before pushing a correction. If deployment or live verification fails, inspect the failing step, repair and redeploy, and verify the new SHA. Do not call it done or blindly retry permanent failures. Any emergency rollback must preserve git history and be verified as a separate release.

## Completion report

Report the task class, outcome, checks actually run, visual evidence when applicable, commit SHA or local-only status, deployment status when applicable, a concise cost summary, and material limitations. A documentation-only task has no game-release gate.

After successful deployment/live verification, mark the plan's release milestone complete and record concise durable evidence in `game/docs/RELEASE_HISTORY.md`: full released SHA, exact Actions link, verification date/timezone, available HTML SHA-256, checks actually passed and remaining limitations. Plans link to that entry. Retain failures/retries as historical evidence and distinguish earlier checkpoints from current status. Missing evidence is unavailable; do not invent it or imply old checks ran again.

Ignored `work/` receipts, logs and screenshots are supplementary; they must never be the only record of release completion. Review affected master summaries and planned sections for contradictions before ending the task. Closure is a documentation-only change: it does not require another game test/build/deployment or rewriting the released commit. Commit/push documentation normally when authorized; under a local-only/no-deploy hold, leave it uncommitted and say so. Review enforces prose consistency; CI does not automatically verify the meaning of decisions or summaries.

Every completion message includes costs for that task/release: main AI, delegated AI, paid tools and CI/deployment. Use existing task-specific usage/billing evidence, label amounts measured or estimated, and identify the source. If unavailable, say so; never turn unknown data into $0 or present a partial subtotal as a complete total. Confirmed absence of agent/tool activity can be reported as no usage. Fixed subscription allocation is separate from incremental charges. Account-wide usage percentages and elapsed time cannot establish a per-task dollar cost.

Prefer one task per chat. For multiple releases in one chat, use task-specific usage deltas when available; otherwise say attribution is unavailable. Identify the commit/run when there is a release and say no deployment for local-only work. This is a reporting rule: do not build collectors, maintain ledgers, install plugins or request billing access unless Casey asks. Keep private billing information out of git.

## Delegation and cost

The main agent owns classification, acceptance criteria, task decomposition, integration, and release. Use the delegation rules in root `AGENTS.md`: default to one agent, delegate only bounded independent work with a clear expected benefit, select the least expensive suitable available model and reasoning effort, and escalate capability when the evidence warrants it. Avoid duplicate reading, overlapping edits, recursive delegation, unnecessary screenshots, and repeated unchanged test runs. Prefer narrow worker context and concise deliverables. Exact costs depend on the available product/model; do not invent a price or promised savings.

## Decision log

- 2026-11-23: The skills/NPC release's exact-commit CI used 54.3 minutes for 243 browser cases and nearly the entire 60-minute build window. Backstab, pursuit, theft integrity and character ownership add further required cases. Increase the build budget to 90 minutes to retain all coverage; deployment remains 15 minutes, with no reduced assertions or test selection.

- 2026-11-23: Cartography release 17441a1 passed all 210 UI cases on an explicitly dispatched validation branch before main advanced. Its final test-only main diff correctly selected no additional UI; independent hosted UI verification was explicitly enabled after deployment. Preserve both the full exact-commit validation and deployment run links in release history. Close plans/master summaries in a later Markdown-only commit without redeploying unchanged game output.

- 2026-11-23: Casey requested correction of stale release plans and current-state summaries. Tracked release history and closed plan milestones now preserve completion across fresh clones; ignored receipts are supporting evidence. Context closure uses document review and diff checks, with no game retesting or deployment. This update was initially held locally; Casey later explicitly authorized including all outstanding infrastructure/context changes with the cartography/game release.

- 2026-11-23: Casey classified the cost-summary rule as simple and requested proportional testing. Planning follows complexity; verification follows affected behavior. Docs/instruction changes use review and a diff check, tooling uses focused checks, and game releases retain their full verification and relevant UI gates. Each completion message reports available task costs honestly; unavailable billing remains unavailable. Casey initially requested a local hold, then explicitly authorized including all outstanding infrastructure/context updates in the now-verified cartography release.

- 2026-11-23: The world/capital release expanded browser coverage to 165 cases. Run `45136774222` passed 160 cases without failures before its 45-minute build limit cancelled the remaining captures. Increased the build budget to 60 minutes; the deployment budget remains 15 minutes and test selection/assertions remain unchanged. Validate the repair branch with a manual workflow run (no comparison SHA, so the full browser suite runs) before advancing main. Independently verify the exact hosted commit, HTML hash and player flow afterward.

- 2026-11-22: The 28-floor dungeon rebuild adds all-floor interaction coverage across phone Chromium, phone WebKit and desktop. Increased the build job limit from 15 to 30 minutes to retain that coverage alongside existing simulations and browser installation. Deployment retains its 15-minute budget; no test selection or assertion is skipped to fit the old limit.

- 2026-11-22: Casey chose automatic Codex classification and automatic deployment for both simple and complex implementation tasks. Complexity determines planning and verification depth. Root AGENTS.md makes the workflow automatic; executable local/CI checks gate release, followed by live commit and browser verification.
- 2026-11-22: Casey required deliberate, cost-effective subagent selection by the main agent and relevant UI testing only. This framework-only change needs tooling verification and live commit/HTML checks, not a game UI pass. Future game changes select browser tests automatically.

- 2026-11-22: The story/first-day release expanded coverage to 135 browser cases. The initial CI run reached 119 passing cases without failures before its 30-minute limit cancelled the job. Increased the build budget to 45 minutes; deployment retains 15 minutes and no assertions or test selection are weakened. For this repair, a manual workflow run on the repair branch has no comparison SHA and therefore forces all browser coverage. Only after that exact commit passes is main advanced; independent hosted UI verification remains required even if main’s infrastructure-only diff selects no browser suite.
