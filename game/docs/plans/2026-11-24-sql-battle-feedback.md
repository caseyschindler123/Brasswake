# SQL answer power and battle comparison

Classification: complex. Status: complete; released and independently verified at `9853ea269167c6bc4fa7af44d7d09f7315fa15fd`. [Release evidence](../RELEASE_HISTORY.md#sql-answer-power-and-battle-comparisons). Casey authorized autonomous implementation, repeated automated battles, visual review/correction and deployment. Wait dependency satisfied: Marigold release `d516ce18daf1a4b4e9d6639e9b981f668a60451e`, Actions [45350677507](https://github.com/caseyschindler123/Brasswake/actions/runs/45350677507), including required browser profiles and deploy/hosted verification. Implementation uses an isolated worktree; preserve the other task's closure edits.

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
| Result-quality/power rules and focused regression coverage | Complete; local gate and exact-commit CI verified |
| Compact battle comparison and interaction coverage | Complete |
| Automated battle UX review, notes, corrections/retest and screenshot inspection | Complete; observations below |
| Full release gate, diff and master docs | Complete locally: full npm run verify, 324 browser cases, visual review and diff check |
| Exact-commit deployment/live verification and tracked closure | Complete: source 9853ea2, Actions 45375146692, independent source/hash and three hosted flows |

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

- First exact-commit CI: source `8a9793452352c754792b5c3bbbe549bf2d52be0e`, [Actions 45369173416](https://github.com/caseyschindler123/Brasswake/actions/runs/45369173416). Core and desktop passed; phone Chromium passed 107/108, including every new feedback case, then failed the pre-existing joystick cancellation test. That fixture compared against the position before holding the direction, so a legitimate completed tile before the interruption could fail it. The game already clears unfinished movement when interruption is delivered.
- Fixture repair: deliberately establish native walking, record position at the actual cancel/capture-loss/blur event after the game handler, then require the exact same position and no travel after the existing settling interval. No tolerated extra movement, retry, skipped case or control/gameplay edit was introduced. Three repetitions in each browser profile passed (9 cases / 27 interruption modes). Rebuild confirms unchanged runtime HTML; reuse the earlier complete local 324-case/core result for unchanged gameplay. The new commit must still pass all exact-commit CI profiles, deploy and independent hosted verification; this test-only correction uses focused local automation checks rather than repeating unchanged game tests.

## Verified release closure

- Released source `9853ea269167c6bc4fa7af44d7d09f7315fa15fd`, gameplay implementation `8a9793452352c754792b5c3bbbe549bf2d52be0e`; [Actions 45375146692](https://github.com/caseyschindler123/Brasswake/actions/runs/45375146692) passed core, all 324 browser cases (108 per profile), stable aggregate, Pages and all three hosted flows. Exact-commit WebKit completed all 108 cases in 44.8 minutes; no timeout/coverage settings changed.
- Independent source/hash check at `2026-11-24T11:24:18.197Z` and all three hosted flows completed by 2026-11-24 11:25:06 UTC (03:25:06 PST). The battle used public save preparation and visible controls with real production SQL and no debug handles; its generated screenshot was opened. The first independent two-worker invocation timed out loading the battle page before interaction, while its other two flows passed. A fresh sequential invocation retained every assertion/dependency and passed all three (48.0 seconds). No game/test source changed for that transport timeout.
- Published HTML SHA-256 `75f8609d86c130947c18a215ed34b75c9792ec23d2113b2862606694b6a1fa0c`. The local test-only correction retained identical local HTML before/after rebuild; the published hash above is the independently verified CI build, not a substituted local hash.
- The superseded Actions 45369173416 passed core/desktop and 107 phone-Chromium cases, failed the old pre-hold cancellation comparison, then was cancelled while WebKit was still running to unblock the corrected commit. It did not deploy. Final exact-commit CI reran all profiles without skipped cases or retries.
- Master architecture/gameplay/world-rule descriptions now reflect the shipped behavior; all milestones are complete. Historical pending/failed checkpoints above are retained as earlier evidence. [Tracked release history](../RELEASE_HISTORY.md#sql-answer-power-and-battle-comparisons) is the concise fresh-clone record; ignored logs/captures are supplementary. No delegated agents or paid tools were used; task-specific AI and CI dollar billing is unavailable. No physical iPhone or human learner study is claimed.
