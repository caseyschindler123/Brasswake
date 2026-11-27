# Visible intro controls: expedited release

Status: released and verified at `d3b1f682d6ddac82abe9806fa5527daab8be8aff`; full non-publishing follow-up requires revalidation after fixture repairs. [Release evidence](../RELEASE_HISTORY.md#visible-tamsin-intro-controls).

The intro layout fix is simple. Classification becomes complex solely for the consequential release-check exception: a reduced gate can miss unrelated regressions. Casey explicitly approved a targeted release now and full checks afterward before takeoff.

The fix pins intro actions outside the scrolling text. Keep existing panel prerequisites, navigation and checkpoints. Acceptance: Open Map and Continue are fully visible before scrolling and after returning, on 390×720 phones and desktop; the whole arrival and reload path still works. A 390×568 check also passed. Opened Chromium/WebKit/desktop captures.

Three pre-existing full-check failures were reproduced and repaired: safely label a lazily loading painted actor; check jewelry's shipped material icon; prepare real motion atlases sequentially, use the current cycle/body scale, and remove fitted equipment from head-only comparisons. Original pixel-size tolerances, contact/flight assertions and full inventory remain.

## Release steps

- [x] Implement the intro fix and open affected captures. All 18 intro/canary cases, the shorter-phone arrival, 13 focused core tests and the three repaired cases across all profiles passed locally. Normal exact-commit core/build passed in Actions 45905204418; its long browser run will be superseded by the authorized targeted run.
- [x] Validate a profile bound to live baseline `7954b6b5305999ef6ee5e8df400615955a3d4684`, exact file allowlist and 22:40–00:40 UTC window. Select assets/actors/world/build/protocol and nine exact browser cases in each of all three profiles. Unknown paths, dependencies, stale baseline, expiry or invalid selection fall back to full checks.
- [x] Pass affected core and all 27 exact-commit browser cases, then publish through the aggregate and ancestry guards. Actions [45908625690](https://github.com/caseyschindler123/Brasswake/actions/runs/45908625690).
- [x] Complete all six hosted flows. Five initially passed; a CDN HTTP 503 interrupted offline download. The exact image returned HTTP 200 with its committed SHA-256. Rerunning only the failed deploy/hosted job retained the publication guard and passed all six flows at `2026-11-26T23:30:11Z`.
- [x] Independently verify live source/HTML and open the hosted phone intro-control capture. Identity verified `2026-11-26T23:10:02.302Z`; HTML SHA-256 `02efadaf84398c82b42c676ea3cad0d62e394d458692cac1eac1cc2d43313be2`.
- [x] Remove activation and restore normal selection after confirming the published identity.
- [x] Start full non-publishing checks after publication. Source `72ebc09`, [Actions 45911144303](https://github.com/caseyschindler123/Brasswake/actions/runs/45911144303), selects every core group and all 33 browser suites with publication disabled. Game source/art/build/runtime package files are unchanged from the published source.
- [x] Record verified release evidence in RELEASE_HISTORY.md.
- [ ] Monitor the full follow-up through completion, repair actual failures without weakening assertions, record its result and close this plan.

Full follow-up `72ebc09`, Actions 45911144303, passed core and 631/633 browser cases, including every intro check and all four profession journeys in each profile. Two fixture failures remained: the Atlas Cottage search exhausted its small fixed parcel window on desktop, and WebKit's business-reload fixture unloaded a queued `s_hurt.wav` fetch. Expanded only the fixture's candidate search while preserving every legality/lair/entry assertion, and drained the real queued/loading effects before intentional navigation. Both repaired cases passed all three profiles locally (6/6); opened the desktop Atlas and WebKit map captures. All 58 protocol checks passed. Keep normal full coverage, strict errors and unchanged deadlines; these test-only repairs do not republish the live game.

No art regeneration, save format change or paid action is involved. Browser emulation does not establish physical iPhone testing.

Candidate `0641bdd`, Actions 45906473900, passed affected core and both Chromium profiles but was correctly held by WebKit: the burst-frame arrival exceeded its existing 60-second budget after added layout probes/captures, and rapid checkpoint navigation cancelled title music. Keep the new visibility regression in ordinary arrival/checkpoint flows, retain the original stress-flow checks without duplicate instrumentation, and settle actual title requests before intentional unloads. No deadline, error assertion, case selection or retry policy is relaxed. Require a fresh exact-commit targeted gate.

Candidate `87787e6`, Actions 45907328586, passed 25/27 selected cases. General `networkidle` was not a reliable audio prerequisite: it stalled after a Chromium reload and still raced a WebKit title request. Replace that wait with a harmless native title gesture and the real Sound cached/loading state before intentional navigation. A browser that cannot initialize an AudioContext has no music request to await; strict request/error assertions remain. The checkpoint case passed on both phone engines with this correction. The original burst test also passed after duplicate instrumentation was removed.
