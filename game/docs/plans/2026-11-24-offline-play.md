# Offline play and easy saves

Status: implemented candidate, focused verification in progress; not released. Class: complex because an opt-in offline asset download, release-consistent updates, browser storage and player saves must work together.

## Outcome and acceptance

Casey wants seamless airplane play, an understandable main-screen download and easy saving. Add a compact title panel with download size/progress, retry and a truthful ready state; keep the same controls in Hero. All game assets, fonts, music and the SQL engine must be local/cacheable. Download is explicit and complete only after verified assets are stored. Interrupted/failed updates retain the previous playable copy. A newly opened offline page uses one complete release, and existing tabs keep their release's assets until reopened. Cache eviction must remove the ready claim.

Keep automatic device saves and existing codes; show actual save success/failure, add Save now and a portable save-file backup/load flow. Preserve all three worlds and current account v9/character v8 without migration. Save files remain private, outside the offline asset cache. A failed local save must not show success. No paid tools or generated artwork.

## Milestones

- [x] M1: inspect affected build, shell, saving and browser/server tooling; implement self-contained dependency packaging and generated hashed offline manifest.
- [x] M2: implement opt-in service worker downloads, integrity/progress/retry, complete-release activation, scoped navigation/assets and stable updates.
- [x] M3: implement main-screen/Hero offline and save controls, accessible feedback and save-file import/export.
- [x] M4: meaningful worker/build and real-browser coverage for offline cold reopen, SQL, unseen art/music, persistence/backup, failures/eviction and update consistency. Inspect phone 390×720 and desktop screenshots; automated WebKit is not a physical iPhone.
- [ ] M5: run `npm run verify`, review intended diff and master docs, commit scoped files and integrate/push normally without disturbing concurrent work. Monitor exact-commit Actions and independently verify hosted commit/hash and offline player flow.
- [ ] M6: close plan and record full source SHA, Actions link, verification date/hash and limitations in RELEASE_HISTORY; commit/push documentation closure without redeploying.

## Verification and release notes

Worktree: `C:/Users/caseys/.codex/worktrees/offline-play/Brasswake`, branch `codex/offline-play`, based on `8602fa5`. Shared main initially has unrelated audio docs edits; preserve them. Use a separate localhost port. Focused tests during implementation precede one full required gate; fix genuine failures without weakening checks. Verify a production-like subdirectory scope as used by GitHub Pages. Test download interruption, quota/storage failure, damaged/evicted cache, update rollback and old-tab asset isolation. Actual iPhone installation/storage retention requires Casey's device and remains a limitation if unavailable.

Costs: task-specific AI billing unavailable; no delegated-agent or paid-tool usage at planning. CI/deployment has not run for this task. Keep billing details out of tracked docs.

Implementation checkpoint: complete download is about 73.7 MB (533 files in this candidate), including the locked npm SQL asm engine (replacing CDN 1.13), existing local fonts and newly packaged IBM Plex Mono fonts under their OFL. No game rules, save versions, music or packed artwork changed. Seven focused worker/build/server checks passed. Initial browser attempts exposed two fixture mistakes (an unexported coach helper and duplicate Hero import controls); those were corrected. The first complete offline/save matrix passed 9/9 across phone Chromium, WebKit and desktop. Phone visual review exposed squeezed character buttons; their role captions/heights and title subtitle contrast were corrected. Final-source update/isolation browser checks and the complete release gate remain pending.

Release-gate repair: the first complete gate passed core checks but its browser stage exposed a real CSS layering regression: globally raised sheets blocked tutorial tips in combat/loot/service flows. Stopped that run, scoped the elevated sheet layer to an open title screen, and retained all assertions. The corrected combat/death plus offline/save matrix passed 15/15 across all three profiles; seven worker/build/server checks passed again, including complete source-asset coverage. A separate native-worker update matrix had passed 6/6 (update/reopen across three profiles). The full gate is being rerun on the corrected build; no deployment has occurred.

Coordination after connection recovery: Casey explicitly requested coordination with the deploying agent. Various changes confirmed the base 8602fa5 release is live, with all 411 CI browser cases and its owned independent hosted checks passed, and is finishing documentation-only closure before publisher handoff. This task will integrate that closure and preserve unrelated held audio edits. The resumed offline gate has one prepared comparison-fixture failure: the unseeded partial-answer campaign died normally before its victory/loot assertion. The existing battle owner is handling that narrow test fixture through the release owner; no runtime battle change or additional audit is assigned. All other cases continue so their evidence is retained. No offline commit has been pushed or deployed. Four local browser workers use the existing supported configuration knob; required cases/assertions are unchanged.
