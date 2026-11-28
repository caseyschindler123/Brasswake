# Landscape controls and Bag preview

Complex because the four customizable actions must preserve existing per-character Technique loadouts. Casey reviewed the local prototype and authorized one combined release with the concurrent painted paper-doll and walking/running work. The landscape chat owns integration and the sole Pages publication.

- [x] Move actions to the right and fit the camera to the remaining world. Move the tappable minimap and icon menus, and revise the ship walkthrough.
- [x] Put the paper doll, worn gear, carried gold and inventory in Bag. Give Skills tabs for skills, techniques and stats.
- [x] Preserve the four ordered Technique IDs. Store the optional Hide shortcut additively and keep Hide usable through the Skills screen without a shortcut.
- [x] Build locally, try the menu, map, gear and shortcut controls, and open the walking and Bag captures.

Local preview complete and uncommitted. The build and 22 focused rule tests passed. Browser probes exercised assigning Hide and a Technique, opening the map, swapping worn gear, starting Hide and continuing Tamsin's chart checkpoint. Opened 844×390 walking and Bag captures, a short 740×320 WebKit Bag capture and a 1280×800 Bag capture. The 390×720 portrait prompt appeared as expected. The full browser inventory still contains scenarios that use the old toolbar or Hero routes. Updating those flows and running the full gate belong to release follow-up.

Local follow-up moved Journal to the icon bar, centered the joystick vertically and put the right-hand actions just below the HUD. Focused Chromium and WebKit checks opened Journal and moved the character using the repositioned joystick. The Bag's Appearance editor opened from its existing button.

## Combined release

- [ ] Finish verifying the browser scenarios migrated to the visible minimap, close buttons, Skills tabs, Bag paper doll and character settings. Preserve their existing movement, save, combat and progression assertions.
- [x] Take the character work from its separate checkout and review overlapping renderer, asset and documentation changes. Integrated the approved source-art dependency `46aa0f0` and runtime wardrobe candidate `8e83249`. Combined verification is tracked below.
- [ ] Push the reviewed combined commit to main and monitor the complete automatic gate through Pages. Verify the public commit, HTML hash and hosted player checks before recording release evidence.

The initial release pass exposed a resource-HUD cascade regression while the action panel was open. The layout now keeps the meters at the top right and the original checks remain in place. A new device-reload scenario covers Hide and an existing Technique together. Combined WebKit captures showed the boat's extra return button crowding the Bag, so the view keeps one close control at its top and a compact note from Tamsin. The shell credential received HTTP 403 on a push dry run. The signed-in GitHub connector has write access and can assemble the exact local tree for the authoritative main run.
