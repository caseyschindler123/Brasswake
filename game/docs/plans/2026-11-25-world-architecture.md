# World architecture and dungeon finish

Status: released and independently verified; all milestones complete. Class: complex. Source baseline: `fd1a9c7`; approved isolated pilot and released presentation fixes preserved. Released source: `639f24e897277fe776ba11efcc5f15cb6f40add6`. Implementation stayed in `codex/world-architecture` until publication, preserving the concurrent music/movement work.

## Authorization and scope

Casey approved the actual modular pilot and authorized planning, implementation, complete testing and deployment across the world and all dungeons. Remove building entrance awnings because they obscure doors; use material-rich regional framing at the existing apertures. This supersedes the pilot's local-only publication hold for this rollout. Existing raw art, master prompts and generation settings remain untouched. New component sheets use the built-in image tool under this full-world art request; inspect initial samples before extending the kit. No complete-building bitmap replaces a modular structure.

## Acceptance criteria

- All eight regional building families use the approved detailed painted finish: connected roof fields/caps/valleys, directional eaves, shared storey anchors, correct convex/recessed corners, integrated chimneys and themed door framing. Preserve regional identities, service signs and player-home recolouring. Cover countryside, public venues, upper rooms, dojo structures, civic/landmark construction and owned houses; document any authored landmark component retained.
- No entrance awning/canopy masks a door or its open/closed movement cue. Framing remains outside the real one-tile aperture. Ground-level entries have ground-level thresholds, with no invented stair approach.
- All eight dungeon themes and 28 floors gain detailed modular walls, coping, corners/returns and convincing full-scale stair/exit framing; maintain authored floors, passage widths, collision, gate controls, secrets, rewards, combat and expedition/save ownership. Furniture and details belong to surrounding construction and remain readable against an adult.
- Transparent pieces have clean alpha on light/dark/colour backgrounds. Repeat sizes and roof/corner joins come from shared contracts, never footprint-specific painted buildings. Preserve all older packed assets unless a deliberate replacement is justified; generated atlas coordinates are generated only.
- Inspect actual phone 390×720 and desktop 1280×800 captures across every region and dungeon theme, representative rectangle/L/courtyard footprints, all door facings, storeys, closed/open doors, dungeon stairs and transitions. Inspect native-resolution edges and scale, not just screenshot existence.
- Add meaningful pure/browser regressions; run local core and affected three-browser suites. Use the exact-commit full CI release gate for shared renderer/build/art rollout; no baseline refresh or narrowed assertions to hide failures. Verify exact published SHA, HTML hash and live player flow after deployment.

## Material map

| Region | Buildings | Dungeon construction |
|---|---|---|
| Tallyport | Cream plaster, oak, clay tile | Damp harbour stone, cellar timber, salt wear |
| Brackwater | Weathered marsh timber, moss, reed/thatch | Wet sluice stone, green growth, worn iron |
| Haverly | Golden sandstone and carved stone | Warm burial stone, brass and worn relief |
| Four Fords | Red brick, oak, thatch | Earth/brick, roots and old timber supports |
| Cinderwick | Black basalt and copper | Sooted furnace stone, copper and iron |
| Kell | Cave masonry, cool slate, crystal accents | Layered cave stone, amethyst/crystal fittings |
| Highwatch | Grey stone, timber, snow-edged slate | Rimed stone, cold iron and frosted coping |
| Aldermoot | Pale marble, carved stone, bronze | Archive ashlar, carved bands and bronze |

## Milestones

- [x] Inventory current renderers, integrate approved pilot without undoing released fixes, and finalize reusable source/renderer contracts.
- [x] Prepare regional building and dungeon components; inspect samples, pack deterministically, record source hashes/crops/prompts and alpha/replay checks.
- [x] Roll out regional building construction and visible door framing; remove entrance awnings everywhere and retain functional ownership.
- [x] Roll out dungeon walls/portals/stairs across every theme and floor with unchanged gameplay topology.
- [x] Complete focused regression development, local core checks, three-browser affected suites and actual multi-region visual review; reconcile master docs and dated decisions.
- [x] Commit intended files, push main, monitor full exact-commit CI, deploy and verify hosted SHA/hash/player flow. Close plan and release history with durable evidence.

## Verification and costs

### Verified release

- [Actions 45614464206](https://github.com/caseyschindler123/Brasswake/actions/runs/45614464206), source `639f24e897277fe776ba11efcc5f15cb6f40add6`, passed core/build/protocol, all 456 browser cases (152 each: phone Chromium/WebKit 390×720 and desktop Chromium 1280×800), aggregate, Pages deployment and six hosted flows. No retries or skipped required cases. Deployment/live job completed 2026-11-25 13:25:53 UTC.
- Independent source/hash verification: 2026-11-25 13:26:35.048 UTC. All six fresh-browser public-control hosted flows passed in 56.4 seconds, completed by 13:28 UTC. Real dependencies were retained and production debug handles were absent. Opened the hosted world capture, plus final native and phone/desktop regional, door-facing, courtyard/civic, indoor-stair and dungeon views.
- HTML SHA-256: `52540ac83db9106464baf8bbfa2ca249a1e60f032e4a24b3e9506313aa832ac3`. Durable release evidence is in [release history](../RELEASE_HISTORY.md#painted-modular-world-and-dungeon-architecture). The later documentation closure does not redeploy game output.
- Main AI, one delegated worker, eight built-in image calls, fixed-subscription allocation and CI/deployment dollar billing are unavailable. No CLI/API image generation or generation-setting changes occurred. Two earlier candidates were cancelled before publication; only the final source above completed the gate. No physical-iPhone test, human quality approval of every regional kit, or naturally played full expedition is claimed.

### Local evidence before release

- Eight built-in regional image calls; no CLI/API generation, master prompt/settings changes or old-art replacement. Source originals and exact prompts archived at `C:/Users/caseys/source/SQL Game/architecture_2026_11_25/`. The kit contains 128 authored components plus reproducible derivatives: 224 packed pieces, eight atlases, 10,079,394 new packed bytes. All 590 older manifest entries remain unchanged. Replay reproduced atlas bytes, generated metadata and manifest exactly; all exported PNGs passed two-pixel transparent padding checks. Four-background door/eave/cap/stair sheets were opened.
- Integrated all 172 modular world structures and the 91 remaining small countryside facades, plus owned house shapes/recolouring and dojo/upper room construction. Countryside flattened views share the 32 MiB cache; upper wall layers are budgeted and retired with their owners. House visual composition preserves existing logical collision and derives its old clearance from unchanged legacy metadata.
- Final named-material review corrected the owned-house selector to the actual three `Content.HMAT` choices: Stone → grey masonry, Timber → oak framing, Log → weathered timber. Browser regression checks those labels/material families directly rather than treating a material index as a region index. This correction is included in the verified release above.
- Final courtyard/civic/side-door/upper-room review found the legacy code-drawn indoor stair placeholder still present. Indoor ascent/descent now reuse the regional painted pieces at proportional, adult-readable sizes; interaction positions and upper-room saves remain unchanged. All seven interior unit checks and the actual painted-source/live-canvas staircase/save/return browser case in all three profiles passed. Fresh core verification passed after this correction; phone/desktop upper-room captures were opened. Runs 45610727533 (`550be8c`) and 45611393800 (`020b056`) were cancelled before publication to include these final corrections; the final source above passed the fresh full gate.
- First dungeon review identified undersized shallow descents, oversized north-wall props, detached-looking recess trim and obsolete artificial surface-pad blocks. Enlarged descents proportionally to a 50×34 bound, fitted far props within existing solid cells, added masonry shoulders within existing three-by-two recess buffers, and removed the old pad blocks. Up art remains 44×44; floor atlas pixels, 48 interior travel anchors, gates, rewards and saves stay authoritative.
- `npm run verify -- --defer-ui` passed. An initial core pass exposed a missing architecture-provider stub in the pure interior fixture; added the same null-art provider contract while preserving all door timing/sound assertions. Thirty-nine focused Node checks and three packing tests passed. Nine three-browser door/dojo/presentation checks and six new three-browser regional reuse/mask/house/recolour/ownership checks passed. Two WebKit dungeon component cases (regions 1 and 5, all their floors) passed real controls/SQL/combat/loot/return/reload and unchanged floor-pixel checks. Final native door checks passed in all three profiles after sign mounting moved clear of side apertures. The independent cache audit originally counted only the old modular layers; it now inventories every retained owner and upper canvas, and passes all three profiles with exact byte/canvas totals and the unchanged 32 MiB cap. No assertion/budget or screenshot baseline was relaxed. Full CI remains the authoritative release gate.
- Actual world captures cover all eight families at 390×720 and 1280×800, with native exports and owned-house review. Dungeon captures cover eight themes/all 28 floor records at both profiles, 52 screenshots per profile and zero page/console/HTTP errors. Regional contact sheets and native Bilge/Slagdeep ascent/descent/recess views were opened; known pre-fix defects were rechecked after correction. Chromium/WebKit emulation does not establish physical-iPhone behavior or a naturally played full expedition.
- One bounded worker investigated/implemented/reviewed the dungeon area; main owned assets, buildings, integration and release. Task-specific main/worker/image dollar billing, fixed-subscription allocation and CI/deployment billing are unavailable. Concurrent user-directed music/movement agents are separate tasks; their costs are not attributed here. The shared checkout was kept clean while the rollout used its own worktree.

Use isolated local snapshots/ports and the installed browser/Python environments. Keep raw sources and detailed reports under ignored `work/world-architecture/`, archived originals under the existing local art source tree. The authoritative released identity and available HTML hash belong in `RELEASE_HISTORY.md`. Record tests actually run, repaired failures, limits, image/agent activity and available task-specific costs. Billing unavailable stays unavailable; no billing collectors or new access requests. Physical-iPhone evidence remains unavailable unless actually supplied.
