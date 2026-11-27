# Painted body facing hotfix

Status: complete. Released source `7954b6b5305999ef6ee5e8df400615955a3d4684`; exact evidence and limitations are in [release history](../RELEASE_HISTORY.md#painted-body-and-equipment-facing-correction). Classification upgraded to complex solely because Casey authorized a new temporary release-check exception; the renderer correction itself is simple.

Casey reported running backwards while heads faced correctly and requested a fix within ten minutes. Confirmed committed atlas rows use camera yaw order `[0,7,6,5,4,3,2,1]`, while runtime indexed them as clockwise world headings. Map body and every fitted layer through sourceDirections, retaining logical directions for heads and held-gear depth. No art regeneration, movement, save or timing change.

Casey explicitly approved focused all-eight walk/run/fitted-gear checks, phone/desktop/WebKit, core compatibility and hosted verification instead of full journeys. The new expiring profile is limited to this exact baseline and file allowlist; mismatches retain normal full fallback. All selected jobs and hosted flows remain required with zero test retries. Restore normal coverage after verification.

- [x] Correct shared body/layer lookup and add actual committed toe-direction regression.
- [x] Inspect rendered eight-direction walk/run and fitted gear at 390×720 and desktop; retain WebKit coverage.
- [x] Pass focused core and exact-commit CI, publish and verify source/hash plus hosted flows.
- [x] Remove temporary activation, record released identity/checks/limits and push closure. Existing non-publishing full follow-up remains independent.

Focused local evidence: all ten painted metadata/material/profile tests passed; actual direction browser regression passed in all three profiles. Opened rendered eight-heading plate/cloak/glove/boot walk/run captures. All 57 protocol checks passed, including strict hotfix baseline/path/expiry fallback and real test discovery.

Release closure: Actions 45863194330 passed the approved core groups, all 52 browser cases and all six hosted flows. Independent live identity/hash verified at 17:01:50 UTC; hosted flows completed 17:03:27 UTC. Opened live world/offline-ready captures. Removed the hotfix activation and passed all 57 workflow checks with normal policy restored. No unrelated work, assets, timing or saves were changed. Subsequent full core/build and all 633 browser cases, including every profession journey/profile, passed at `ba11fb6`; see the [intro-controls release evidence](../RELEASE_HISTORY.md#visible-tamsin-intro-controls). This later follow-up does not change the original approved hotfix gate.
