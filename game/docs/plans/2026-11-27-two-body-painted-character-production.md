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
- [x] Finish focused checks through the normal player and NPC paths and review the most recent captures after the fitted-slot correction. The full focused browser rerun passed across all three profiles with painted head, planted sole, flight, gear socket, named NPC and wardrobe assertions.
- [x] Inspect phone and desktop game captures, including the 390 × 720 portrait and enlarged motion evidence. Focused checks and full exact-commit CI passed. The pack adds approximately 4.6 MB of compressed art. Physical iPhone testing remains open.
- [x] Integrate the verified character commits with the landscape changes. The combined commit `4d5367edc990a029f55eb23f978261a1fd9c6546` passed the full gate, and independent public creation loaded both default character bodies and animated their movement.
- [x] Record the final commit, Actions run, verification, HTML hash and limitations in the [release history](../RELEASE_HISTORY.md#landscape-controls-bag-and-painted-characters).

## Release coordination

The character and landscape work use isolated checkouts. The combined tree includes approved source dependency `46aa0f0`, runtime art `8e83249` and gait registration `fd92fe8`. The first combined run showed that the physical gait still reported sole positions from the predecessor artwork. The pack now records sole coordinates from the fitted silhouettes and the renderer maps the existing support and flight phases to them. The packed image bytes remain the same. Twelve focused browser cases passed, including the full motion audit and the exact directional gear and joystick samples in each profile. The landscape chat owns the sole Pages publication.

The second gate exposed a WebKit race in the static NPC audit. The fixture repair `5d383ee` waits for its exact visual samples and resumes the real scene before verifying live interaction. Its three focused browser cases passed with the original visual and cache assertions.
