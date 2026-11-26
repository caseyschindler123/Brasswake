# Painted body facing hotfix

Status: implementation and focused release verification in progress. Classification upgraded to complex solely because Casey authorized a new temporary release-check exception; the renderer correction itself is simple.

Casey reported running backwards while heads faced correctly and requested a fix within ten minutes. Confirmed committed atlas rows use camera yaw order `[0,7,6,5,4,3,2,1]`, while runtime indexed them as clockwise world headings. Map body and every fitted layer through sourceDirections, retaining logical directions for heads and held-gear depth. No art regeneration, movement, save or timing change.

Casey explicitly approved focused all-eight walk/run/fitted-gear checks, phone/desktop/WebKit, core compatibility and hosted verification instead of full journeys. The new expiring profile is limited to this exact baseline and file allowlist; mismatches retain normal full fallback. All selected jobs and hosted flows remain required with zero test retries. Restore normal coverage after verification.

- [x] Correct shared body/layer lookup and add actual committed toe-direction regression.
- [x] Inspect rendered eight-direction walk/run and fitted gear at 390×720 and desktop; retain WebKit coverage.
- [ ] Pass focused core and exact-commit CI, publish and verify source/hash plus hosted flows.
- [ ] Remove temporary activation, record released identity/checks/limits and push closure. Existing non-publishing full follow-up remains independent.

Focused local evidence: all ten painted metadata/material/profile tests passed; actual direction browser regression passed in all three profiles. Opened rendered eight-heading plate/cloak/glove/boot walk/run captures. All 57 protocol checks passed, including strict hotfix baseline/path/expiry fallback and real test discovery.
