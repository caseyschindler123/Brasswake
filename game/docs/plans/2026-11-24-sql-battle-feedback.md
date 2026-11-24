# SQL answer power and battle comparison

Classification: complex. Status: local verification complete; deployment pending. Casey authorized autonomous implementation, repeated automated battles, visual review/correction and deployment. Wait dependency satisfied: Marigold release `d516ce18daf1a4b4e9d6639e9b981f668a60451e`, Actions [45350677507](https://github.com/caseyschindler123/Brasswake/actions/runs/45350677507), including required browser profiles and deploy/hosted verification. Implementation uses an isolated worktree; preserve the other task's closure edits.

## Acceptance

- Grade executed results and explicit task requirements, never character similarity. Equivalent valid SQL receives full credit. Extra/missing/duplicate records reduce credit; wrong operators and syntax errors cannot receive near-full power merely because their text is similar.
- Full correct battle answers retain existing damage and skill-based accuracy. Meaningful partial answers visibly scale attack damage; wrong answers provide no useful attack. Keep contract/lesson completion dependent on full correctness, and preserve hint/show-answer training protections.
- Immediately display the submitted and correct SQL together after a wrong/partial battle attempt, including syntax failure. Explain the principal difference in one sentence and highlight actual token differences safely. Prefer a verified small correction of the player's SQL; label fallback as one correct solution. No extra modal, forced reading time or confirmation.
- Keep battle controls reachable at 390×720 and 1280×800. Comparison must be compact, accessible without relying on color, safe for arbitrary SQL text, and expandable for long queries. Never truncate away the relevant difference without an accessible full view.
- Exercise several real UI-driven battles covering correct, sorting, extra/missing records, syntax, alternate SQL, long SQL and progression/hint edges. Record observations and corrections, inspect generated screenshots, repeat affected flows until required clarity/layout issues are resolved. Identify prepared fixture state separately from actual interactions; this is agent UX review, not a human learner study.
- Pass meaningful regression coverage and `npm run verify`; review final diff/docs. Push main normally, monitor exact-commit CI/deploy, independently verify live source/HTML and hosted player flow, then close tracked release context.

## Milestones

| Milestone | Status |
|---|---|
| Wait for prior release, inspect baseline, save plan | Complete |
| Result-quality/power rules and focused regression coverage | Complete locally; full release gate pending |
| Compact battle comparison and interaction coverage | Complete locally |
| Automated battle UX review, notes, corrections/retest and screenshot inspection | Complete for the current candidate; observations below |
| Full release gate, diff and master docs | Complete locally: full npm run verify, 324 browser cases, visual review and diff check |
| Exact-commit deployment/live verification and tracked closure | Pending |

## Verification and evidence

Use pure engine tests for result-quality boundaries, duplicates, numeric tolerance, semantic alternatives, syntax and required technique/order. Add browser regressions for actual battle damage/feedback, free correction, hint/shown protections, mobile/desktop layout, immediate controls and expand/collapse behavior. Inspect phone Chromium/WebKit and desktop captures. Keep iterative observations here; detailed logs/screenshots remain supplementary ignored artifacts. Run the full gate only after focused checks and UI iteration stabilize; rerun required checks when changes invalidate them.

No new raster art, paid tools, runtime dependencies or save-format changes are intended. AI/CI dollar billing is unavailable unless existing task-specific evidence becomes available; no agents or paid tools have been used for this task. Real iPhone and human-learning evidence remain unavailable.

## Iterative UX observations

These are browser-driven battles and agent visual review, not a human learner study. Battle fixtures begin beside real generated enemies with normal character stats, task generators, hit rolls, retaliation, victory and loot. The UI enters queries and advances/loots through visible controls. Separate damage/hint edge fixtures deliberately enlarge enemy HP, suppress retaliation and pin action rolls; they do not establish balance.

The mistake-battle fixture starts from the visual harness's fresh mage, adds the Strike page and post-tutorial access, restores normal maximum health and positions beside the target. Its untrained Arms skill intentionally retains the 35% accuracy floor; no combat skill/attribute boost is applied. The release rehearsal starts a warrior through visible creation, then imports post-tutorial access, Strike and an adjacent Examiner location while retaining starting combat stats/resources. Full guided-day cases separately cover ordinary introduction/progression for all four professions. These prepared encounters are not claims of a naturally earned campaign or human play.

| Observation | Correction and follow-up |
|---|---|
| Existing partial credit was mostly hidden in hit odds; a miss concealed useful progress. | Result quality now scales visible damage, with a labelled power bar and unchanged skill-based hit rolls. Correct/partial/sorting battles and separate damage measurements exercise this. |
| The first syntax comparison pushed the keyboard action below the 720px phone viewport. | Bound the feedback scroller while retaining the editor/keyboard. Added an actual Run-button bounds assertion. |
| The bounded syntax card could show the submitted query while clipping the correction below it. | Place the two short changed-context snippets side by side for free corrections; assert both fit inside the visible feedback area. Full SQL remains expandable. |
| Wrong attacks repeated a long sequence of useless misses. | Skip zero-power player swings, preserve the normal enemy response and show one clear no-effect message. Wrong-answer Backstab regression now asserts no damage, no kill and no gains. |
| Support actions could advertise a power different from their actual effect; their hint labels mentioned only practice. | Apply the displayed power to support effects and label reduced hint power explicitly. Preserve shown-answer and practice protections. |
| Old help/intro/ambient text described SQL as changing attack accuracy. | Updated those explanations to distinguish query power from weapon skill; retained the lesson's full-correct completion gate. |
| A later targeted pass caught a pale inherited prompt caption on the new cream card and an assertion expecting an intentionally abbreviated query to be fully displayed. | Scoped the caption color for readable contrast. Retain exact submitted SQL in the model, verify the changed visible token and the explicit full-query view. Final retest required. |

Initial focused pure tests also found the pre-write baseline check could query a view before a CREATE VIEW task created it. Treat that absent initial view as no baseline and preserve the canonical view-creation contract; focused regression passed after repair. Earlier failed attempts remain historical; only the final unchanged candidate's checks establish release readiness.

- Final visual iteration makes LIMIT corrections name LIMIT directly, labels shape/shown power, and keeps a fixed action footer outside the scrollable result. Opened phone WebKit free-fix and desktop partial-result captures, plus the expanded long-query phone capture with the next action still visible.
- Hosted battle verification is rehearsed through character creation and the public save-code controls, with read-only scene coordinates for a stationary First Circle Examiner. The battle itself uses visible controls and the real engine. The first rehearsal caught a missing appearance selection in test setup; corrected before release. Hosted checks additionally require absent localhost debug handles and the production SQL dependency.
- Grading verifies the seeded task database plus authored technique/order constraints; it is not a general proof of SQL equivalence. Small corrections are verified against that same task. Real-device behavior and human learning remain external limitations.

- Final focused candidate: 21 battle-feedback cases passed across the three profiles (including 12 complete ordinary-speed battles); all three corrected public-save release rehearsals passed separately. Earlier 36-case combined combat/support/Backstab regression pass is supplementary; the full gate rechecks the final layout. Opened final free-fix, partial, and expanded-result captures at phone and desktop sizes.

- The first full gate passed core checks, then found an older Backstab assertion expecting lucky damage from a wrong answer. Stopped that known-failing run, changed the assertion to require exactly zero damage and zero hit chips (keeping all no-gain/resource/response assertions), and reran the nine affected cases before restarting the entire gate. This is an intended behavior change, not a relaxed assertion.

- Final local release gate: `npm run verify` passed all required core/artifact/content/system/tooling checks and all 324 browser cases (108 each for 390×720 Chromium/WebKit and 1280×800 desktop Chromium), with four local workers, zero retries and no skipped cases; browser duration 36.9 minutes. Final affected screenshots were opened across all three profiles. Staged diff and `git diff --check` passed; no unrelated files, assets, dependencies or save versions changed. Exact-commit CI, hosted source/hash and three hosted UI flows remain pending.
