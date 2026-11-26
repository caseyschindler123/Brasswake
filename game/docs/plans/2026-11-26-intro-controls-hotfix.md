# Visible intro controls: expedited release

Status: published at `d3b1f682d6ddac82abe9806fa5527daab8be8aff`; final hosted recheck and full non-publishing follow-up pending.

The intro layout fix is simple. Classification becomes complex solely for the consequential release-check exception: a reduced gate can miss unrelated regressions. Casey explicitly approved a targeted release now and full checks afterward before takeoff.

The fix pins intro actions outside the scrolling text. Keep existing panel prerequisites, navigation and checkpoints. Acceptance: Open Map and Continue are fully visible before scrolling and after returning, on 390×720 phones and desktop; the whole arrival and reload path still works. A 390×568 check also passed. Opened Chromium/WebKit/desktop captures.

Three pre-existing full-check failures were reproduced and repaired: safely label a lazily loading painted actor; check jewelry's shipped material icon; prepare real motion atlases sequentially, use the current cycle/body scale, and remove fitted equipment from head-only comparisons. Original pixel-size tolerances, contact/flight assertions and full inventory remain.

## Release steps

- [x] Implement the intro fix and open affected captures. All 18 intro/canary cases, the shorter-phone arrival, 13 focused core tests and the three repaired cases across all profiles passed locally. Normal exact-commit core/build passed in Actions 45905204418; its long browser run will be superseded by the authorized targeted run.
- [x] Validate a profile bound to live baseline `7954b6b5305999ef6ee5e8df400615955a3d4684`, exact file allowlist and 22:40–00:40 UTC window. Select assets/actors/world/build/protocol and nine exact browser cases in each of all three profiles. Unknown paths, dependencies, stale baseline, expiry or invalid selection fall back to full checks.
- [x] Pass affected core and all 27 exact-commit browser cases, then publish through the aggregate and ancestry guards. Actions [45908625690](https://github.com/caseyschindler123/Brasswake/actions/runs/45908625690).
- [ ] Complete all six hosted flows. Five passed; a CDN HTTP 503 interrupted offline download. The exact image now returns HTTP 200 with its committed SHA-256; rerun only the failed deploy/hosted job, retaining the existing publication guard.
- [x] Independently verify live source/HTML and open the hosted phone intro-control capture. Identity verified `2026-11-26T23:10:02.302Z`; HTML SHA-256 `02efadaf84398c82b42c676ea3cad0d62e394d458692cac1eac1cc2d43313be2`.
- [x] Remove activation and restore normal selection after confirming the published identity.
- [ ] Start and monitor full non-publishing checks after publication. Use the closure push if it selects full; otherwise dispatch explicit full validation. Repair actual failures without weakening assertions.
- [ ] Record final release and follow-up evidence in RELEASE_HISTORY.md and close this plan.

No art regeneration, save format change or paid action is involved. Browser emulation does not establish physical iPhone testing.

Candidate `0641bdd`, Actions 45906473900, passed affected core and both Chromium profiles but was correctly held by WebKit: the burst-frame arrival exceeded its existing 60-second budget after added layout probes/captures, and rapid checkpoint navigation cancelled title music. Keep the new visibility regression in ordinary arrival/checkpoint flows, retain the original stress-flow checks without duplicate instrumentation, and settle actual title requests before intentional unloads. No deadline, error assertion, case selection or retry policy is relaxed. Require a fresh exact-commit targeted gate.

Candidate `87787e6`, Actions 45907328586, passed 25/27 selected cases. General `networkidle` was not a reliable audio prerequisite: it stalled after a Chromium reload and still raced a WebKit title request. Replace that wait with a harmless native title gesture and the real Sound cached/loading state before intentional navigation. A browser that cannot initialize an AudioContext has no music request to await; strict request/error assertions remain. The checkpoint case passed on both phone engines with this correction. The original burst test also passed after duplicate instrumentation was removed.
