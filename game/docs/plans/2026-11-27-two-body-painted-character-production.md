# Two-body painted character production

Started 2026-11-27. Casey authorized the remaining character art, integration, testing and publication. The approved lean builds, original heads and existing character scale are the art references. New hair and beard styles are deferred. Casey authorized one combined publication for the character and landscape passes. The landscape agent owns the combined push and Pages run.

## Scope and risks

- Fit approved tunic and plate movement to the existing renderer. Complete leather, split robes, mail, cloaks and distinct gear appearances for the same two bodies. Preserve painted stance, deliberate footfall timing, separate frontal paper dolls and authorized material colors.
- Supply standing and sitting and the action families players and NPCs use. Compare seating with a real game prop and retain right-handed weapons, the opposite shield arm, second hand support and source-specific occlusion. Reuse existing pose and item artwork when it fits.
- Keep save formats, item and appearance IDs, equipment rules, NPC identities and world geometry compatible. Verify all actual item/appearance mappings and detect gaps before release.
- Avoid broad decoded memories and first-use stalls. Size packed world frames for gameplay, reuse orientation phases and material variants, and retain bounded caches.
- Shared actor rendering and changed packed assets require the repository’s full affected checks across core, browser and hosted paths. Publication uses one agent at a time and the exact current hosted baseline.

## Milestones

- [x] Inventory the current actor and catalog paths. The production packet records 91 canonical equipment and appearance IDs.
- [x] Build and register the directional locomotion, everyday poses and frontal dolls for six outfit families. Keep the saved paintings, prompts and deterministic packing.
- [x] Fit the approved directional heads to the existing combat and reaction bodies. Retain the existing grip, bow, shield, book, cast and reaction contracts. Record source-only action studies and the current profession interaction treatment in the production packet.
- [ ] Finish focused checks through the normal player and NPC paths and review the most recent captures after the fitted-slot correction.
- [ ] Inspect 390 × 720 and desktop game captures. Run focused checks during development, then exact-commit CI and its full selected verification. Record measured budget and available device evidence.
- [ ] Send the verified character candidate to the landscape agent. Check the merged candidate and current hosted baseline, then monitor the combined exact-commit run through the hosted checks.
- [ ] Record the final commit, Actions run, verification evidence, available HTML hash and limitations in the release history. Push documentation closure.

## Release coordination

The character and landscape work use isolated checkouts. The “Fix landscape layout and text” chat will integrate the verified character commit, publish the combined candidate once and verify the hosted commit and HTML hash. Character work touches the creation defaults and shared actor renderer, so review these paths in the combined tree.
