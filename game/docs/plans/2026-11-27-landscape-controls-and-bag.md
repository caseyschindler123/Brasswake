# Landscape controls and Bag

Complex because the four customizable actions must preserve existing per-character Technique loadouts. Casey reviewed the local prototype and authorized one combined release with the concurrent painted paper-doll and walking/running work. The landscape chat owns integration and the sole Pages publication.

- [x] Move actions to the right and fit the camera to the remaining world. Move the tappable minimap and icon menus, and revise the ship walkthrough.
- [x] Put the paper doll, worn gear, carried gold and inventory in Bag. Give Skills tabs for skills, techniques and stats.
- [x] Preserve the four ordered Technique IDs. Store the optional Hide shortcut additively and keep Hide usable through the Skills screen without a shortcut.
- [x] Build locally, try the menu, map, gear and shortcut controls, and open the walking and Bag captures.

The initial local preview passed the build and 22 focused rule tests. Browser probes exercised assigning Hide and a Technique, opening the map, swapping worn gear, starting Hide and continuing Tamsin's chart checkpoint. Opened 844×390 walking and Bag captures, a short 740×320 WebKit Bag capture and a 1280×800 Bag capture. The 390×720 portrait prompt appeared as expected.

Local follow-up moved Journal to the icon bar, centered the joystick vertically and put the right-hand actions just below the HUD. Focused Chromium and WebKit checks opened Journal and moved the character using the repositioned joystick. The Bag's Appearance editor opened from its existing button.

## Combined release

- [x] Migrate browser scenarios to the visible minimap, close buttons, Skills tabs, Bag paper doll and character settings. Preserve their existing movement, save, combat and progression assertions. All 24 dungeon component cases and the revised phone WebKit menu, travel, concealment and story scenarios passed locally.
- [x] Integrate the character work from its separate checkout. Reviewed overlapping renderer, visual fixtures and documentation. Included source art `46aa0f0`, production wardrobe `8e83249` and visible sole registration `fd92fe8`.
- [x] Push the reviewed combined commit to main and monitor the complete automatic gate through Pages. Verified `4d5367edc990a029f55eb23f978261a1fd9c6546`, all 717 browser cases and six hosted flows on 2026-11-28. The [release history](../RELEASE_HISTORY.md#landscape-controls-bag-and-painted-characters) records the exact HTML hash and verification.

The layout keeps the top-right meters visible during an action query. A device-reload scenario covers Hide and an existing Technique together. The boat uses a compact note from Tamsin and a close button. The Bag close button also remains reachable with its first-use tip open.

The [first combined run](https://github.com/caseyschindler123/Brasswake/actions/runs/46119055440) passed core and held deployment after 38 browser failures. The retry exercises the new visible menu and Hide routes, checks dungeon stair clearance against the projected stair and actual control rectangles, and registers the new boot art to the physical gait. The WebKit thief journey reached the farewell at its time limit. Complete journey traces retain actions, DOM and checkpoint images while omitting continuous frame images. Test discovery retains all 717 cases and their deadlines.

The [second run](https://github.com/caseyschindler123/Brasswake/actions/runs/46125626811) passed 716 browser cases, including every profession journey. The remaining WebKit NPC audit race came from reading a frame before its asset was ready. The fixture now waits for each requested pose and retains the same visual, cache, movement and interaction checks. The repair passed locally in all three browser profiles.
