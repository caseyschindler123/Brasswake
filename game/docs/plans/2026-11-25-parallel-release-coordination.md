# Concurrent work and release ownership

Classification: complex coordination across three active tasks and one published game. Status: assignments sent on 2026-11-25; game recovery and subsequent landscape publication remain pending. This plan does not certify either release.

## Acceptance criteria

- All three tasks retain isolated worktrees, task-owned commits and separate local server/output paths. No agent edits another task's checkout or overwrites unrelated changes.
- One owner repairs both known failures from [Actions 45632434712](https://github.com/caseyschindler123/Brasswake/actions/runs/45632434712), preserving required coverage and assertions.
- Development and bounded review proceed concurrently. Main integration and publication have an explicit order; every publisher integrates its predecessor's final source and closure before its authoritative release gate.
- Each game release passes the applicable exact-commit checks, hosted source/HTML verification and relevant player flows, then records its own durable closure. A failed or pending deployment remains incomplete.

## Assignments

| Task | Worktree / branch | Ownership and next action |
|---|---|---|
| Review Building Tile Art Style | `dungeon-stair-support/Brasswake` / `codex/dungeon-stair-support` | First publisher and recovery owner for combined dungeon ascents and locomotion at `a738797`. Repair the cancelled wilderness-music request and visible-rescue timeout. Own the audio/music changes and necessary intro/prologue repairs; verify, publish and close the combined release. |
| Review Menu, Story, Art, and Run | `grounded-cadence/Brasswake` / `codex/grounded-cadence` | Locomotion owner; implementation is already included in `a738797`. Perform one bounded read-only review of recovery changes for movement, contact and intro compatibility. Route any closure changes to the first publisher; do not start a competing gate or duplicate repair. |
| Brainstorm World Liveliness Ideas | `living-landscape/Brasswake` / `codex/living-landscape` | Landscape owner and second publisher. Candidate `809f244` is locally verified according to its task plan. Continue independent work, then integrate the verified recovery release and its closure before post-merge checks and the full landscape gate. |

Worktrees are under `C:/Users/caseys/.codex/worktrees/`. Displayed task titles identify the existing chats, not new workers. Assignments were sent to all three through the app; acknowledgment and release completion are separate evidence.

## Integration and verification

1. [x] Inspect active task history where accessible, current worktrees, candidate files and workflow publication guards. The landscape chat's oversized current turn could not be read through the app; its tracked plan, branch and working tree supplied implementation/release evidence.
2. [x] Send explicit repair, review and publication assignments to all three existing tasks. No additional agents were spawned.
3. [x] Record the release order and review this documentation with `git diff --check`. Documentation only: no dependency installation, game tests, build, screenshots or deployment for this coordination change.
4. [ ] First publisher completes both repairs, relevant local verification and full exact-commit CI; verifies live commit/HTML/player flows and closes dungeon/locomotion context.
5. [ ] Second publisher integrates final main and resolves actual overlapping edits, preserving prior repairs/assets. Review shared `scene_b.js`, packaging/manifests, browser fixtures and master docs deliberately; the landscape branch currently changes `world-travel.js` reload setup. Do not replace one task's fixture repair wholesale with another's.
6. [ ] Second publisher completes its full exact-commit CI, live checks and landscape closure.

Only the designated publisher advances main or starts publication during its turn. Do not cancel another owner's runs. Fetch before integration/push, preserve remote commits, never force-push, and rerun all jobs if the verified live baseline changes. GitHub's existing concurrency grouping and baseline guard remain unchanged; they do not merge changes or assign ownership. Avoid duplicate CI polling and repeat suites only for changed code, failures or unresolved evidence.

## Current failure evidence and limits

Run 45632434712 tested `a7387974c508de1e61bd6e851dfddcf8ae382995`: core and both Chromium profiles passed; WebKit passed 151/153 cases. The crafter guided day reached its final strict error assertion with a cancelled `m_wild_coast.mp3` request. The separate visible-rescue case exceeded 60 seconds; `keyboard.up` failed during cleanup after closure. The aggregate rejected the browser result and deployment was skipped. Root causes and fixes remain owned by the recovery task; these observations are not a finding of flakiness or proof of agent contention.

This coordination task does not change game behavior or weaken gates. Main AI, existing-task AI/review and CI dollar billing are unavailable. No new delegated agents, paid generation or CI/deployment runs were initiated by this coordination task. Existing landscape image usage and earlier CI belong to their respective tasks.
