# Character motion, intro and world presentation

Status: implemented and locally verified; awaiting the preceding audio deployment before main publication. Not released. Class: complex (connected character/terrain/building rendering and intro navigation/continuity).

## Scope and acceptance

- Make an original UO-inspired walk/run sample using one character, with natural proportions, stable head size, readable weight transfer and a full running stride. Review enlarged side/diagonal loops and actual phone scale before extending a successful approach across the existing bodies/outfits/directions. Preserve original sources and generated coordinates. Do not copy UO assets or run paid image generation without its required approval.
- Remove the character-selection exit from ordinary intro dialogue. Offer it through deliberate character/menu controls, preserve saved intro checkpoints and name drafts, retain an understandable engine-error recovery path and explain automatic saving separately.
- Establish SQL as the world's means of performing skilled actions; connect the simple cargo lesson to abilities without presenting the story as ordinary bookkeeping alone.
- Give roofs coherent slopes/ridges/hips and restrained, correctly layered architectural details; fit believable doors to their actual apertures throughout animation. Preserve structural/collision plans and roof cutaways.
- Blend natural terrain materials across irregular boundaries, including rock/grass, path/grass and shallow/deep water. Preserve collision, natural-shore classification, deep harbour basins, paving and dock structure. Keep chunk borders continuous and browser rendering bounded.

## Isolation and release coordination

Work only in `C:/Users/caseys/.codex/worktrees/world-polish/Brasswake`, branch `codex/animation-and-world-polish`, initially based on `eb8f960`. Original main checkout, running processes and deployment are owned by the audio task. Use port 8791 and worktree-local build/test outputs. Do not push main, cancel runs, or alter the other checkout during its release. Observe completion, fetch/reconcile its final commits, and validate the combined candidate before a subsequent release.

## Milestones

- [x] Inspect source/instructions and create isolated checkout; identify other active Pages run 45526104577.
- [x] Inspect actual animation/architecture/terrain visuals and record causes; create and visually review the motion sample.
- [x] Implement intro/menu/story and successful motion/world presentation changes with meaningful regressions.
- [x] Reconcile master docs and dated decisions; review acceptance and diff.
- [x] Run local core verification and focused browser suites; inspect relevant phone (390×720) and desktop screenshots/loops.
- [ ] Reconcile finished other release; commit intended files and push main without force. Full exact-commit CI is required because shared scene/game rendering changes are involved.
- [ ] Verify deployed SHA, HTML hash and hosted player flow. Record exact evidence in RELEASE_HISTORY and close this plan in a documentation-only commit.

## Verification and limits

Use `npm run verify -- --defer-ui` and focused `npm run test:ui -- --suites=prologue,first-day,arming,npc-appearance,living-world,world-buildings,venues,scenes` (narrow development filters as appropriate; all three profiles before release). Add animation-frame, aperture/roof and material-blending regression checks where they measure the actual failure. Do not weaken existing assertions or refresh art hashes. Full CI remains the release gate; avoid duplicating an unchanged full local run. Real iPhone/subjective human animation approval remain unavailable until Casey reviews. Costs use existing evidence only; task billing unavailable unless supplied by the environment.

## Local evidence and design review

- Source review found the old run correction only stabilized attachment width. The packer also pins feet to a baseline, its front/back leg adjustment extends some boots below it, and its body-centred head estimate misses forward-leaning skulls. Runtime measures the actual skull and lowest opaque foot, uses the same facing's painted walking head during runs, and restores contact/flight without stretching the torso or limbs. Walk head layers use the same measured reference. Original poses, movement speeds and distance cadence remain.
- Opened the first enlarged side/diagonal/front frame montage, corrected a residual face edge, then checked all ten outfits/eight directions and representative hair, beard and headgear. The generated self-contained `motion-sample.html` includes enlarged and phone-scale loops, pause and slow motion; its playback and pause are tested. Local artifact: `work/review-artifacts/motion-sample.html` (supplementary, regenerable through the living-world suite).
- `npm run verify -- --defer-ui` passed all core/build/protocol checks. Subsequent focused actor/door/interior checks passed 25/25 after the final walking-head calibration; these precede the authoritative exact-commit CI.
- Three-browser targeted pass: 21/21 intro rescue/checkpoints/error recovery, door/courtyard, motion and actual material-blend/seam cases. Final follow-up covered creation, continuous roof geometry and material boundaries; a Chromium secondary-tab preview rAF suspension was repaired by exercising the actual foreground page, retaining playback/pause assertions. Final motion plus complete smoke/title/town slice passed 12/12 across phone Chromium/WebKit and desktop Chromium. Worker also passed focused roof/door/courtyard/cache coverage in all three profiles.
- Opened actual phone/desktop intro/menu, roof/door, animated sample captures and real path/rock/shore locations. Terrain assertions compare feathered versus hard material output and overlapping chunk pixels; collision, shore-depth classification, structural holes and the building-cache byte budget remain covered.
- One worker owned the building renderer/door integration and bounded tests. Root reviewed/integrated the result; no recursive delegation, paid image generation, art-coordinate edits or baseline changes. Task-specific AI/CI billing remains unavailable; no paid-tool usage.
