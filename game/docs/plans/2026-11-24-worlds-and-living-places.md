# Worlds, movement and living places

Status: owned implementation and checks complete; automatic release gate and publication pending; not released.

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
- [x] Integrate Casey's separately assigned battle-audit result: scoped commit `1babb16` integrated as `a6fdf71`, preserving canonical worlds, fractional movement/footprint reservations, appearance, keyboard and presentation. Combined gate/publication remain below.
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

- Initial combined gate passed every core group, then an existing playability driver tried to select an attack from the result screen after a shorter exchange. It now chooses the next action before each further attack, retaining victory/loot/bank checks. All three affected profile reruns passed. The initial browser pass was stopped after 53 cases and the complete gate restarted with the repair.

- The next combined diagnostic found two real adapter issues: town safety skipped ordinary rival movement, and concealment still counted rounded coordinate changes after distance-based movement was introduced. Both are repaired with retained NPC directional/corner checks and a new pure metering regression. Sound fixtures now render all six valid ambient contexts, and test death after an actual response. Existing dungeon/first-day drivers treat draughts as a complete response; route drivers stop through the real pointer-cancel handler at the requested centre to avoid asynchronous polling overshoot. The failing broad run was stopped during first-day checks; a clean complete gate is still required.
- Focused confirmation: 15 affected NPC/sound cases passed, including two WebKit boot-timeout reruns under lower concurrency; six Backstab cases passed across all profiles with the integrated metering fix and precise route driver. Crafter first-day phone Chromium passed. Further component/arrival results are pending below; no release is claimed.

- The bounded dungeon-driver repair passed all 24 component cases (eight themes across three profiles) and all three death/reload cases. Strict texture pixels and victory/gate/table/loot/persistence assertions remain unchanged. Visible-controls arrival passed all three profiles after requiring a visible context button rather than stale hidden text. Actual revised town/NPC phone-WebKit and desktop captures were opened; final complete gate remains pending.

- The complete local sweep subsequently exposed remaining legacy fixture assumptions: SQL-download recovery selected the old boat-menu action; the cloud-ferry fixture saved a fabricated position instead of positioning the owned scene; four cartography flows released input at movement start; and long-route fallback still used an 80ms auto-tile tap. These drivers now use the visible recovery button, live quayside position and complete movement. Three recovery reruns, nine ferry/fog/chart reruns and two Atlas/ferry-waypoint reruns passed. The revised Warrior first-day route passed; Mage and the remainder of the full sweep are pending. Any initial failed local command remains recorded as failed, with affected successful reruns distinguished; exact-commit CI must independently pass before deployment.

- Updated affected rerun evidence: Warrior and Mage complete first days both passed (4.1m/4.6m). The updated full sweep subsequently passed all 134 WebKit cases, including all four professions and every new world/creation/service/keyboard/rendering check. Desktop sweep is running. Production source has not changed since `4e71ea7`; subsequent `7d216ce` is fixture/context repair. The local full command will retain its original phone-fixture failures; all affected reruns must pass and exact-commit CI must provide a clean complete gate before deployment.

## Coordination clarification — 2026-11-24

Casey clarified that coordination means avoiding overlapping ownership and edits, and that he did not request this task to test the other agent's battle changes. The battle task owns battle implementation and battle validation. This task owns its world, character, movement, environment, readability and audio changes; shared-file boundaries and commit handoffs must be coordinated before further edits. Existing local battle integrations and verification evidence are preserved as history. The overlapping broad test run was stopped and publication was temporarily held while ownership was clarified. At that checkpoint nothing had been pushed or deployed. Do not infer a request for another battle audit from the eventual release handoff.

- Coordination resumed under the clarified boundary after Casey's status question: the battle agent supplied its completed commit/validation handoff and retains battle CI failure and hosted-battle verification responsibility. This task is finishing 53 owned desktop movement/world/creation/navigation/environment checks. The automatic repository release gate remains required; no further manual battle audit is assigned to this task. Original build/deploy authorization remains the release basis.

- Owned desktop readiness: 52 of 53 scoped checks passed. The remaining Crafter route exposed a stale moving-target coordinate in the navigation fixture. It now follows that same creature by stable test identity and clicks its live position, without relocating it or changing game rules. The focused route rerun passed the previous stall and reached the cellar; completion is pending. Battle validation remains exclusively owned by the other task; its final signoff was received.

- Owned readiness complete: all 53 selected desktop checks passed across the 52-case checkpoint and corrected Crafter rerun (3.5m). Opened final desktop creation and dungeon captures. Existing phone/WebKit evidence is retained above. No production source changed after `4e71ea7`; final changes are fixture/context repairs. The battle task supplied its own final signoff and owns any battle-specific CI failure plus hosted battle verification. The normal exact-commit repository CI is the remaining required complete gate before publication.

- Release candidate `88f0003cce77ed0b89403c8f92105ee27dc74c64` is pushed. [Automatic CI 45413699533](https://github.com/caseyschindler123/Brasswake/actions/runs/45413699533) passed core; all three required browser profiles are in progress. Publication and independent hosted checks remain pending. The corrected Crafter desktop route passed in 3.5m, completing all 53 owned checks.

- CI `45413699533` did not deploy: core and desktop passed, phone Chromium passed131/134. The battle owner repaired its unreachable-first-rat fixture (`fb3eec6`, integrated as `24ffcf6`) and reported54 focused cases across all profiles passed. This task owns the separate two dojo navigation failures: deterministic native reproduction at rounded[6,9], actualfx5.64/fy9 stalls against dummy[5,8], whilefx5.7 succeeds. Production radius.16 collision is correct; shared test driver centring is being repaired without relaxing collisions/assertions/timeouts. WebKit remains in progress.

- The failed candidate's obsolete remaining WebKit job was cancelled before publication, rather than queueing a repair behind it. The battle owner confirmed six unchanged Backstab/Examiner compatibility cases across all profiles with the repaired shared movement driver, including x+1.25 endpoints and actual-distance concealment metering. The two affected phone first-day reruns passed their previously blocked dojo approach and first guided fight; final route completion and the 21-case driver matrix remain pending. All required checks will run on the repaired commit.

- Repair readiness: all21 shared-driver/joystick/door/dojo/stair cases passed across three profiles. The two formerly blocked phone Chromium first days completed (Thief4.0m, Mage4.6m). The battle owner supplied six unchanged approach/Examiner compatibility passes independently. Final phone dojo capture was opened. WebKit boat-checkpoint save assertions had passed in the cancelled CI, but immediate reload cancelled a title-music request; the fixture now awaits actual network idle before unloading, retaining strict console/save assertions. Three repeated WebKit checkpoint flows passed (1.9m). Browser-change selection requires full UI on the repaired source; publication remains pending.

- Candidate `38b435f5e397288b1b22359346639568933fa57f`, [CI 45426670144](https://github.com/caseyschindler123/Brasswake/actions/runs/45426670144): core passed; desktop passed 135/136. The sole failure was Warrior's final road approach, after cellar completion. Native diagnostic proved that stopping five cells south of the ring can leave the last distance callback at rounded radius six, outside the strict farewell trigger; phases .6/.8 failed while 0/.25 passed. Walking one cell farther produced the next callback at radius five and the actual farewell. The owned first-day fixture is being repaired with a multi-phase native regression, retaining progression/dialogue/reward assertions. Production remains unchanged; publication is blocked until repaired exact-commit CI passes.

- Farewell repair readiness: all three prepared browser profiles passed five actual-distance phases each (0, .25, .6, .8, .99), verifying real gd14-to15, tutorial2-to3 and exactly one Hint Key. Full Warrior desktop passed in 4.0m with the original earned route and final assertions. Only first-day fixture code changed. The failed candidate's remaining phone jobs will be cancelled before publication to start complete verification on the repaired source; no checks are skipped in that new run.
