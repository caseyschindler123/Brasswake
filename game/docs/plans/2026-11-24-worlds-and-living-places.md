# Worlds, movement and living places

Status: implementation complete; combined verification/integration in progress; not released.

## Scope and acceptance

Casey authorized the full discussed scope on 2026-11-24, including autonomous testing and deployment. This is complex because world ownership/save ingress, movement and connected render/UI systems change together. Preserve existing packed artwork and generation settings; use existing art and code-native architecture/effects first. No paid full image run is authorized.

- Three independent worlds, each with one story main and four supporting slots. Houses, household storage, codex and learned commands share within that world; banks remain individual. Save/import/export and legacy ingress preserve isolation. Clear selection and save/return controls.
- Free creation appearance choices (body, skin, hair, hair colour, facial hair), actual avatar preview and persisted rendering.
- Smooth manual stopping/steering without rollback to the previous tile; safe collision/door/interactions. Stable head proportions and distance-matched walking/running; inspect existing eight-frame gait before adding art.
- Readable outlined actors, correctly anchored slightly larger names, improved essential text and installed-web-app top inset/background. Actual iPhone verification is unavailable to automation and must be reported as a limitation.
- Persistent newline in Commands/Fields. Continuous town music indoors, settled town/wilderness transitions and accurate location labels.
- Fitted doors, purposeful entrance architecture, picture shop signs and persistent visited-service map symbols.
- Terrain-specific road/path/square edging, varied business frontage, regional details, purposeful NPC activity, restrained animation/sound/lighting.
- Dungeon wall depth, room purpose, regional furnishings/landmarks and ambient effects with readable navigation and unchanged progression integrity.

## Milestones

- [x] Inspect source and define bounded ownership.
- [x] Implement world saves/selection/creation.
- [x] Implement movement, animation, actor/name/text/header visibility and keyboard.
- [x] Implement stable audio and location presentation.
- [x] Implement buildings, service discovery, terrain edging and town activity.
- [x] Implement dungeon depth and ambience.
- [x] Integrate meaningful regressions, review diff and reconcile master docs/decision logs for this workstream; combined battle integration remains pending.
- [ ] Integrate Casey's separately assigned battle-audit result (agent instructed to use a separate worktree/branch and not deploy); review its commit/tests and verify the combined release before publication.
- [ ] Run `npm run verify` with relevant browser coverage; inspect actual 390x720 and desktop screenshots. Resolve failures without weakening checks.
- [ ] Commit/push intended files; monitor exact-commit Actions; independently verify hosted commit/HTML and player flow.
- [ ] Close plan and release history with source SHA, Actions URL, verification date/hash and limitations in a documentation-only commit.

## Verification

Focused pure and browser regressions cover world isolation/migration and reload, creation persistence, mid-step movement/cancellation/steering/collision, music stability, keyboard insertion, visited-service discovery, door fitting and name geometry. Existing dungeon and ordinary-player flows remain required. Existing art manifests stay unchanged. Performance checks include bounded actor/environment caches and visible-only ambience. Inspect rendered town/building/actor/dungeon/UI phone and desktop views. Automated WebKit is browser coverage, not a claim of real-iPhone testing.

## Evidence and remaining limitations

- Focused world/creation/cloud/keyboard matrix: 12 browser cases passed across phone Chromium, phone WebKit and desktop, followed by six affected reruns after making the punctuation/Return group fixed. Five skin tones were visually opened. Pure world tests additionally cover fifteen fully explored characters within the storage envelope.
- Focused continuous motion, rig, fitted doors, NPC routines, dungeon presentation and music tests passed. Initial integrated gate found an obsolete hand-written door fixture; it now uses a compiled plan without changing timing or sound assertions.
- All core groups subsequently passed through build/tooling. That gate's browser phase was intentionally stopped after a correctness review found additional NPC-footprint, house-placement retirement and location-label issues. Those were repaired, including a dynamic-overlap movement regression, before rebuilding and launching the complete browser matrix. The final combined release gate remains pending.
- The initial 51-case feature/visual matrix passed 50; a WebKit business-save reload fixture raced the visual harness. It now navigates to the real page, retaining discovery/reload assertions. All six affected service/dungeon cases passed across the three profiles. Door/side-door/modal interaction reruns passed. Movement drivers now hold native input to actual intended positions because stopping no longer auto-finishes a tile.
- Actual 390x720 town/name and dungeon screenshots were opened. Casey requested less outlining after the first capture; the revised subpixel low-opacity edge was also opened. Phone/WebKit/desktop creation, business map and all eight dungeon themes were opened, along with all eight regional exteriors at390x844DPR3. Dungeon iteration adds near/side cutaway faces and real painted atlas props in wall recesses; navigation stays unchanged. Final combined visual review remains pending.
- Final arrival-title inspection caught stair-label overlap. A width-fitted opaque plate resolves it; the two affected phone/desktop dungeon captures passed and were opened.
- Casey's separate battle task (thread `01a20d65-aa00-73d3-b39d-068c6a402a71`) is implementing in its own worktree. Direct coordination authorization was read from Casey's message in that task; this task remains sole integrator/publisher. No deployment before combined verification.

Task-specific AI/agent billing is unavailable. Three bounded workers were used; no paid image/tool run occurred. CI/deployment has not run for this candidate. Do not store private billing or the user's device identifiers/screenshots in the repository.
