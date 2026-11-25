# Retired experiment cleanup and scheduled WebKit repair

Classification at investigation start: complex because three failed guided-day/arrival cases required diagnosis across a shared movement driver, whose alignment/input contract must remain valid for every browser flow. Status: experiments removed; local checks passed and concurrent workflow changes integrated; exact-commit CI pending. No game source/assets changed and no publication is needed.

## Acceptance criteria

- Remove only the retired `art-review/Brasswake` and `building-pilot/Brasswake` worktrees Casey requested deleting. Verify their exact paths, preserve released source and any durable source-art inputs required by the current pipeline, and leave other worktrees/stashes untouched.
- Diagnose all three WebKit failures in scheduled run [45685291318](https://github.com/caseyschindler123/Brasswake/actions/runs/45685291318): mage guided day, actual-distance road farewell, and visible rescue/arrival. Preserve gameplay requirements, assertion strength, deadlines, zero retries and full required coverage.
- Add meaningful regression coverage for the diagnosed defect. Verify affected cases locally and the exact committed source in CI. Publish only if game output changes, then verify live identity/HTML and hosted flows.
- Reconcile master documentation, decisions and this plan with actual results; commit/push intended changes and retain concise tracked evidence.

## Milestones

- [x] Inspect root instructions, clean main checkout, latest remote and failed-run logs; fast-forward main to published documentation closure `c2055f6`.
- [x] Inventory retired experiments and current durable source references; safely remove the two authorized worktrees.
- [x] Inspect failed traces/screenshots and relevant movement/intro fixtures; establish causes for each failure.
- [x] Implement bounded corrections with meaningful regressions and relevant documentation/decisions.
- [x] Run focused local checks and review phone/desktop visual evidence if behavior/rendering changes.
- [ ] Commit/push; monitor exact-commit CI with full affected coverage (including all known failures). Deploy and verify only if game changes require it.
- [ ] Record final checks, CI/release identity, limitations and closure.

## Verification

Use focused existing Node/protocol checks as warranted and three-profile affected browser coverage plus smoke. Shared runtime/movement changes require local core verification and full authoritative CI. Test-only fixes do not republish unchanged game output; explicitly request full non-publishing CI if needed to cover all known failures. Do not claim an unchanged nightly passing solely from a smaller audio suite.

## Costs and limitations

Task-specific AI and CI/deployment billing unavailable. No delegated worker or paid generation used at initial investigation. Physical iPhone behavior remains unverified.

## Investigation and cleanup evidence

- Removed registered detached worktrees `C:/Users/caseys/.codex/worktrees/art-review/Brasswake` and `C:/Users/caseys/.codex/worktrees/building-pilot/Brasswake` only, after exact absolute-path checks. The approved pilot is already integrated in released architecture `639f24e`. Before deletion, all eight regional images and the retained pilot valley PNG matched `arttools/architecture_inputs.json` in `C:/Users/caseys/source/SQL Game/architecture_2026_11_25/out/`. No active processes referenced either removed worktree. Other worktrees and both audio stashes remain.
- Original nightly: all 165 cases passed on both Chromium profiles; WebKit failed mage (750-second deadline), road phase fixture (60-second deadline) and visible arrival (8-second route probe). Retrieved the three error contexts/screenshots, both smaller full traces and only the beginning of the 1.08 GB mage trace; its action records precede the large screencast payload. Opened failure screenshots. No original failure was counted as a pass.
- Mage trace recorded 4,285 browser protocol actions before the deadline during native travel, including repeated unchanged feet reads and joystick geometry/availability calls. The repair batches only redundant fixture reads, preserving actual input and re-reading feet after alignment. The original script later reached its final checks during timeout cleanup, which does not establish a passing test.
- Road trace reached all five guided-state transitions but spent approximately five seconds per phase waiting for the same typewriter text after an 18-second fixture load. Use the ordinary dialogue reveal click before retaining all existing text, hint, pointer, actual-distance and position assertions.
- Arrival trace stopped at fractional feet `8.3282,18.5334` against the solid mast while probing right. Short wall-time pulses did not guarantee sufficient animation progress; the new driver counts capped animation time, takes the clear row above the mast and realigns with the gangplank using only visible labels and real controls. In-page DOM observation releases keys/pointers through their normal event listeners, followed by native cleanup; no scene coordinates or game state are assigned. The long clear crossing uses the actual joystick run range (asserted), while vertical alignment retains keyboard input. Added a 120-ms navigation-frame regression beyond the existing 64-ms case. An initial lower-lane repair hit the stationary deckhand; later walking/protocol probes exhausted the original 8-second budget under the stronger frame delay. These candidates were corrected before committing; their failed local results remain supplementary evidence. The original 8-second probes, 60-second flow and full 120-ms perturbation remain.
- Unchanged-source local baseline reproduced neither short failure (2/2 WebKit cases passed); trace diagnosis and stronger frame perturbation remain necessary. Protocol/syntax checks passed (44 protocol cases); further local and exact-commit CI results remain pending.
- The first core invocation used isolated `BW_DIST`. All checks before the final offline test passed, but that test intentionally reads canonical `game/dist/`, which was stale. The canonical `npm run verify -- --defer-ui` invocation without the override passed all required core/build checks and 51 combined protocol/offline/server checks. A separate canonical build/offline recheck also passed all six cases. The earlier setup failure is not counted as a clean core pass.
- Final local focused coverage: all 24 cases passed (eight per phone Chromium/WebKit 390×720 and desktop Chromium 1280×800): original visible arrival, 64-ms and new 120-ms navigation-frame regressions, five-phase road farewell, fractional dojo route, player creation/SQL/navigation/export/import/reload, title and town layout. Zero retries or skips. Opened final phone/WebKit and desktop gangplank captures, original failure captures and complete farewell text. Long journeys remain mandatory in the upcoming full CI, not claimed as locally rerun.
- Concurrent remote framework commits `c3c8fec` and `cd887b1` separate long journeys and target routine checks. Integrate them without changing this repair's full coverage, including every known failed journey. Their task-owned CI remains untouched; this repair uses exact-commit full non-publishing validation.
- Integrated both framework commits, preserving both tasks' documentation entries and the journeys registration guard. All 51 merged protocol/workflow checks passed, including real full/targeted/hosted discovery and physical ActorRig full fallback. Game source, assets, runtime dependencies and build logic remain byte-identical in Git to hosted source `e6075e4`. Because the other task's push validation is running in the release queue, run this repair's complete non-publishing manual validation in the separate validation queue; cancel only this repair's own queued push run to avoid duplicate full checks.
