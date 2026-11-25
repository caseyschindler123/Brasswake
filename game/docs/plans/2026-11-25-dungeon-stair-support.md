# Dungeon stair support and material continuity

Status: implemented and locally verified; exact-commit CI/publication pending. Classification: complex because authored travel placement, safe arrivals, solid cells and rendering must agree across all 28 floors. Baseline: `6d066cd`; preserve the concurrent grounded-locomotion release and its verification.

## Acceptance criteria

- Every ascent/exit is recessed into a perimeter wall with an existing solid three-by-three support volume, connected masonry/coping and steps visibly climbing into it. No freestanding portal remains in a dungeon room centre.
- Stair framing matches the surrounding theme's stone, texture, lighting and wear. Retain painted detail and adult-readable scale; code-composed elements meet the same standard as generated art. Descents remain convincing floor openings.
- Move interaction/occupancy and reciprocal arrivals with ascents. Stable IDs, gates, rewards, existing routes/hazards and expedition/save formats remain. Landings are dry, unoccupied and reachable; existing saved room-centre positions remain valid. One rounded Highwatch corner cell (region 7/floor index 1, tile 56,88) becomes dry landing; no existing floor or passage is closed. Verify this is the only terrain change against the baseline.
- Open actual 390×720 and 1280×800 captures across all eight themes, including surface exits and deeper ascents; inspect structural connection, materials, perspective, size, returns and HUD readability. Assertions/capture alone do not approve visual quality.
- Update architecture/gameplay/art context and dated decisions. Local core checks plus focused three-browser travel/regression cases precede full exact-commit CI, automatic publication, hosted SHA/hash/player-flow verification and durable release closure. Do not interrupt the concurrent release's CI.

## Milestones

- [x] Implement deterministic supported ascent sites and matching reciprocal landings, with meaningful all-floor topology/occupancy regressions.
- [x] Integrate painted ascent framing with wall materials; verify descend openings and actual phone/desktop images in every theme.
- [x] Pass local core/focused three-browser checks and reconcile context docs.
- [ ] Integrate main safely, pass exact-commit full CI, deploy, independently verify hosted identity/flows, and close release history.

## Development evidence

- Compared all 28 generated floors with the baseline: rooms, links and non-ascent entities match exactly, apart from reciprocal arrivals; the only terrain change is the approved dry landing at region 7/floor index 1/tile 56,88. Old room-centre save positions remain legal. Full three-by-three solid support, dry landings, reachable controls/routes, reciprocal stairs and stable ownership pass pure checks.
- First visual review rejected a small backing panel because it still read as a separate doorway block. The implemented renderer continues a full-height far wall through existing solid mass on both sides of each recess, using the identical painted courses and coping at their normal repeat scale. A cross-chunk regression verifies the joined construction without painting over floors.
- Rounded corners exposed old torches mounted above their actual supporting face. Torch/light anchors now follow the exposed wall edge and avoid stair openings; all-floor regressions check support and landing clearance. After this final adjustment, repeat the affected local checks and captures before publication. No art regeneration or baseline refresh.
- The first local core gate and six Bilge/Highwatch component cases across all three browser profiles passed before the decorative torch correction. Final-source core, repeated focused browser cases and phone/desktop captures are tracked separately; pending checks are not passes.
- After the torch correction, a fresh local core gate and six Bilge/Highwatch three-browser component cases passed. Twenty-nine focused dungeon/progression/paint checks pass. Kell's map-edge capture then exposed HUD overlap: dungeon-only camera top margin now leaves 64 logical pixels of ceiling space, with matching ceiling fill; three Kell component cases passed the new 108-pixel HUD-clearance assertion on phone Chromium/WebKit and desktop. Final targeted phone/desktop Kell/Archive views were opened after the ceiling-fill polish. The final camera change uses these affected browser checks and the required exact-source CI gate.
- Captures cover all eight themes and all 28 floor records at 390×720 and 1280×800, 52 images per profile, with no page/console/HTTP errors. Opened each theme's ascent on phone/desktop, the narrow Highwatch second-floor landing and representative descents; inspected size, joined masonry, rounded corners, mounted torches and HUD clearance. Every captured ascent starts at least 111 screen pixels below the phone stage top (151 on desktop), clearing the fixed room label. Detailed images/metrics are supplementary ignored evidence.
- Initial pure fixtures assumed every travel entity occupied floor. Ascents now require nine solid support cells plus dry reachable landings; all other entities retain the floor assertion. Added the missing ellipse/fill/stroke-rectangle Canvas recording stubs needed to exercise a complete room, retaining exact material, clipping, source-size and cross-chunk assertions.
- Concurrent run 45624635612 (`6d066cd`) reported a desktop cartography failure: an ambient WAV request was aborted during its map/reload flow. This correction does not narrow or weaken that case. Leave the existing run undisturbed; integrate remote fixes normally and retain full coverage on the new candidate before publication.

## Costs and limits

This correction uses existing art and code composition: no delegated-agent or paid-tool/image-generation usage, and no generation-setting change. Task-specific AI and CI billing, fixed-subscription allocation and attribution across this multi-release chat are unavailable. Physical-iPhone validation and naturally played complete expeditions are not established by prepared browser captures. Record actual release evidence here before closure.
