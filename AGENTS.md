# Brasswake coding workflow

Apply this workflow automatically to every implementation task in this repository. No skill invocation is needed. Discussion and read-only questions do not trigger implementation or deployment.

## Start every implementation task

1. Read `game/docs/PROJECT_INSTRUCTIONS.md` and `game/docs/01_ARCHITECTURE.md`, then the topic documents they require. Follow `game/docs/05_CODING_WORKFLOW.md` for the complete workflow.
2. Inspect the working tree and the affected code. Preserve unrelated work.
3. Classify the task as **simple** or **complex** and state the classification and one concrete reason in the first substantive update. Casey can override it.
4. Proceed through planning, development, verification, documentation, commit, push, deployment, and live verification without routine approval stops. Casey has authorized automatic deployment for both classes. Explicit requests to discuss, plan only, hold deployment, or stop take precedence.

## Classification and planning

- **Simple:** focused, understood behavior with limited impact and little uncertainty. State a short approach and observable acceptance criteria.
- **Complex:** a new system, changes across connected systems, architecture, saves, build/deployment infrastructure, or substantial uncertainty. Save an actionable plan in `game/docs/plans/` before implementation, with acceptance criteria, milestones, tests, and release verification. Keep its status current.
- Classify by impact and uncertainty, not file count. Upgrade a simple task when wider implications emerge; explain why and expand the plan.

## Required completion gates

- Implement the requested behavior and review the diff against the acceptance criteria.
- Add meaningful regression coverage for changed behavior. Run focused checks while developing, then `cd game; npm run verify` before release. This command selects UI testing based on game impact; documentation, agent instructions, CI, and tooling-only changes do not require a game UI pass. Use `npm run verify -- --ui` when a change needs additional UI coverage. Do not skip failing required checks, weaken assertions, or refresh an art baseline just to obtain a pass.
- For player-facing or rendering changes, extend browser coverage as needed and actually open the relevant generated screenshots. Browser assertions and screenshot capture do not replace visual inspection. Check at 390×720 and desktop dimensions; WebKit emulation does not establish that a real iPhone was tested.
- Update the master docs and dated Decision logs in the same change. Mark unshipped features as planned. Never edit `game/dist/` or generated art coordinates by hand.
- Commit only intended files, push to `main` without force, monitor the GitHub Actions run for that exact commit, and verify the published commit and HTML hash. Verify the live player flow when game changes require UI testing. See the workflow document for commands and failure handling.
- Report the classification, shipped behavior, checks actually run, commit, deployment result, and any limitations. A pushed commit with pending or failed deployment is not complete.

## Boundaries

Instructions guide the agent; `npm run verify` and GitHub Actions execute release checks. Never claim a check ran when it did not. Fix failures and retry while useful progress is possible; report a concrete blocker when external access or a design decision is genuinely required. Existing approval requirements for paid image runs and changes to art-generation settings still apply. Never expose credentials, overwrite unrelated changes, force-push, or bypass sandbox/administrator controls.

## Efficient delegation and token use

The main agent chooses whether delegation earns its cost. Prefer one agent for simple tasks and tightly coupled work. Complex does not automatically mean multiple agents. Delegate only a bounded, independent investigation, implementation area, or review that materially reduces elapsed time or reasoning cost.

- Before spawning, define the deliverable, owned files, relevant context, and stopping condition. Give narrow context instead of full history when practical. Do not duplicate an investigation already completed.
- Choose among models actually available in the session. When model overrides are supported, use `gpt-6.2-sol` at low/medium effort for routine searches, straightforward scoped edits, and checklist reviews. Use a more capable model or higher effort only for demonstrated architectural uncertainty, difficult debugging, or substantial correctness risk. Do not invent pricing or claim exact savings.
- Start with one worker; add another only for independent work whose benefit exceeds coordination overhead. Avoid overlapping file ownership. Workers do not spawn further agents unless the main agent explicitly assigns that structure.
- Review and integrate worker results; the main agent owns classification, acceptance criteria, the final diff, and deployment. Reuse results, stop redundant workers, and avoid repeated full-suite runs after a passing unchanged result.
- Read and report only the context needed. Summarize routine logs, use focused tests during development, and run the required release gate once the change is ready. UI tests and screenshots are required only when they provide relevant evidence. Report delegation briefly when used; no per-task token-budget negotiation is needed unless Casey asks.
