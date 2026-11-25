# Brasswake coding workflow

Apply this workflow automatically to every implementation task in this repository. No skill invocation is needed. Discussion and read-only questions do not trigger implementation or deployment.

## Start every implementation task

1. Read the relevant instructions before editing. For game implementation, read `game/docs/PROJECT_INSTRUCTIONS.md`, `game/docs/01_ARCHITECTURE.md` and required topic docs. For documentation/Codex rule edits, read the affected instructions and relevant sections of `game/docs/05_CODING_WORKFLOW.md`; do not reread unrelated game systems. Reuse context already read in this task.
2. Inspect the working tree and the affected code. Preserve unrelated work.
3. Default to **simple**. State the classification and one concrete reason in the first substantive update. Choose complex only for a named consequential risk or unresolved design decision. Casey can override it.
4. Proceed through the applicable workflow without routine approval stops. Casey has authorized automatic deployment for both classes when the published game needs to change. Documentation and Codex instruction changes do not need a game deployment. Explicit requests to discuss, plan only, leave edits local, hold deployment, or stop take precedence.

## Classification and planning

- **Simple (default):** understood fixes, presentation/content adjustments, isolated helpers/features, and ordinary docs/tooling changes. State a short approach and observable acceptance criteria in chat; no saved plan.
- **Complex:** identify the actual save/schema migration, changed shared contract, new persistent subsystem, consequential release-gate change, or unresolved design choice and its failure risk. Merely touching connected systems, adding a module, changing several files or needing browser tests does not qualify. Save an actionable plan in `game/docs/plans/` before complex implementation and keep its milestones, checks and release status current.
- Planning and verification are independent. Upgrade only when investigation establishes a concrete wider risk. Casey's override takes effect immediately. The canonical command, suite and release rules live in `game/docs/05_CODING_WORKFLOW.md`; keep this entry point concise.
- Scope-based cosmetic/rule/feature/tooling criteria and unified Dev scenarios are planned in `game/docs/plans/2026-11-25-scope-based-testing-and-dev-mode.md`. Use the current executable gates until their replacements are implemented and verified. A planning/documentation task stays simple; a requested full plan does not imply implementing it or running game tests.

## Required completion gates

- Implement the requested behavior and review the diff against the acceptance criteria. Complexity determines planning; affected behavior determines testing. A simple gameplay fix can require browser coverage, while a complex documentation reorganization can require no executable tests.
- For documentation and Codex instructions, review wording, consistency and `git diff --check`. Do not install dependencies, run game tests, build, capture screenshots, or deploy for those changes. For tooling or CI changes, run focused checks for the affected automation; broaden only when its executable behavior warrants it.
- For game changes, add meaningful regressions where behavior or a failure mode needs coverage. Develop with core and affected checks; exact-commit CI is the authoritative release gate. Routine releases require short smoke plus affected suites in all three profiles. Complete profession days belong to `journeys`: nightly/manual full and risky shared core/save/movement/offline/packaging/runtime/unknown selections retain them. Preserve full fallback for unknown impact. Never narrow a known relevant failure, weaken assertions or refresh an art baseline to obtain a pass. Do not repeat unchanged passing full local/CI or hosted checks without a specific unresolved concern.
- For player-facing or rendering changes, extend browser coverage as needed and actually open the relevant generated screenshots. Browser assertions and screenshot capture do not replace visual inspection. Check at 390×720 and desktop dimensions; WebKit emulation does not establish that a real iPhone was tested.
- Update the owning master doc and dated Decision log when documented behavior, a lasting decision or a current/planned description changes. Routine fixes that restore documented behavior need no master-doc or decision-log entry. Mark unshipped features as planned. Never edit `game/dist/` or generated art coordinates by hand.
- After game releases, keep a concise tracked record of released commit, Actions link, verification date, available HTML hash and limitations; close a plan only when one exists. Reconcile affected descriptions without duplicating the release narrative in every doc. Documentation-only closure needs no redeployment. Honor local-only requests; otherwise commit/push closure. Ignored receipts are supplementary.
- Unless Casey requests local-only work, commit only intended files and push to `main` without force. Tooling/test-only changes validate without deploying unchanged game output. Nightly full checks and manual validation do not publish by default; manual publication requires explicit full checks on main. For a game release, monitor the GitHub Actions run for that exact commit and verify the published commit and HTML hash. Verify the live player flow when game changes require UI testing. Documentation-only work is complete after its applicable checks; it does not require deployment. See the workflow document for commands and failure handling.
- Report the classification, outcome, checks actually run, commit or local-only status, deployment result when applicable, costs, and limitations. A requested game release with pending or failed deployment is not complete.

## Cost summary in each completion message

- Include the task's available AI development costs, delegated-agent costs, paid-tool costs, and CI/deployment costs. Identify the commit/run when available; for local-only work, say no deployment occurred.
- Label each monetary figure as measured or estimated and identify its source. Say unavailable when task-specific billing cannot be accessed. Unknown is never $0, and a known subtotal is never a complete total when categories are missing.
- Report confirmed absence of delegated or paid-tool activity as no usage. Keep fixed subscription allocation separate from incremental charges. Account-wide usage percentages and elapsed time do not establish this task's dollar cost.
- Prefer one task per chat. If a chat covers several releases, use task-specific usage deltas where available; otherwise report that attribution is unavailable. Include separate agents/tools when evidence exists.
- Keep the summary concise. Use existing usage/billing evidence; do not build collectors, create ledgers, install plugins, or request billing access unless Casey asks for that additional work. Do not publish private billing details in the public repository.

## Boundaries

Instructions guide the agent; `npm run verify` and GitHub Actions execute release checks. Never claim a check ran when it did not. Fix failures and retry while useful progress is possible; report a concrete blocker when external access or a design decision is genuinely required. Existing approval requirements for paid image runs and changes to art-generation settings still apply. Never expose credentials, overwrite unrelated changes, force-push, or bypass sandbox/administrator controls.

## Efficient delegation and token use

The main agent chooses whether delegation earns its cost. Prefer one agent for simple tasks and tightly coupled work. Complex does not automatically mean multiple agents. Delegate only a bounded, independent investigation, implementation area, or review that materially reduces elapsed time or reasoning cost.

- Before spawning, define the deliverable, owned files, relevant context, and stopping condition. Give narrow context instead of full history when practical. Do not duplicate an investigation already completed.
- Choose among models actually available in the session. When model overrides are supported, use `gpt-6.2-sol` at low/medium effort for routine searches, straightforward scoped edits, and checklist reviews. Use a more capable model or higher effort only for demonstrated architectural uncertainty, difficult debugging, or substantial correctness risk. Do not invent pricing or claim exact savings.
- Start with one worker; add another only for independent work whose benefit exceeds coordination overhead. Avoid overlapping file ownership. Workers do not spawn further agents unless the main agent explicitly assigns that structure.
- Review and integrate worker results; the main agent owns classification, acceptance criteria, the final diff, and deployment. Reuse results, stop redundant workers, and avoid repeated full-suite runs after a passing unchanged result.
- Read and report only the context needed. Summarize routine logs, use focused tests during development, and run the release gate only when the change requires it. UI tests and screenshots are required only when they provide relevant evidence. Report delegation briefly when used; no per-task token-budget negotiation is needed unless Casey asks.
