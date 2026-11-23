# World map, Aldermoot expansion, and working harbours

Date: 2026-11-22. Class: complex: geography, travel, settlement layouts, rendering, art packing, and saved positions interact.

Status: complete. Released `fc139f2b5aa6f34c056d4361e15b3d6804f2d0a6` passed full 165-case repair-branch CI, main deployment and independent hosted commit/hash/player-flow verification. [Durable release evidence](../RELEASE_HISTORY.md#world-and-harbours) records the exact runs, HTML hash, date and limitations. All six milestones below are complete. On 2026-11-22 Casey authorized autonomous completion after the story release, with up to $20 for images, superseding the earlier hold and $5 allowance. Existing Sunburst/high settings and master prompts were preserved. The original proposal and intermediate verification checkpoints below are historical; ignored receipts are supplementary.

## Intent and confirmed direction

Casey wants an interesting coastline, two island towns served by ferries, a genuinely metropolitan and regal Aldermoot, and an actual working Tallyport port with actual ships. New art may be needed. The active story/writing/onboarding rebuild must be preserved and integrated safely.

Confirmed: Aldermoot is the capital. Use the proposed Brackwater/Cinderwick islands, geography, scale and free on-demand ferry direction as the implementation starting point. Resolve routine dimensions, districts, routes and service details through measured blockouts and the acceptance criteria below, preserving the story rebuild's canon and progression.

Additional direction from discussion: build modular exterior building blocks so footprints, room layouts and front/side entrances can vary without a bespoke image per building. Prove the construction system before laying out the expanded cities. Keep distinctive art for major landmarks. User is concerned about cost; reuse existing art first and use economical bounded workers where they earn their cost. A cheaper coding worker does not change the image generator's price. The user approved the production work after reviewing the two-image sample and cost estimate, then raised the allowance to $20 for autonomous completion. Existing Sunburst/high settings remain the production choice.

## Queued start and modular-building prerequisite

Dependency: local chat `01a20625-4315-7981-b93d-1abb905637dc`, “Review Intro and Gameplay Onboarding”. Required start condition: full release verification passed, exact commit pushed, Actions deployment succeeded, published commit/HTML hash verified, and required hosted flow passed. A chat becoming idle or a commit being pushed alone does not satisfy the condition. If its release is blocked or fails, report that condition and preserve its ownership rather than starting overlapping scene/game changes.

After that condition, re-read the released master docs and inspect the working tree. Begin with an existing-art inventory and a deterministic modular-building prototype: townhouse, courtyard inn, and warehouse with a side entrance. One definition must own footprint, connected rooms, wall openings, front/side doors, roof sections, collision, and interior visibility. Test entrance reachability, room connectivity, corners/seams, roof and obstructing-wall cutaway, hero/companion movement, and phone/desktop readability. Prioritise existing materials and code-native assembly; new production art follows the separately reviewed gaps and budget.

Develop subsequent geography/city work against that released baseline. Preserve the active story rebuild's character/content identities and verify its unskipped first-day flow against changed anchors. Queue tracking is in this active chat rather than a recurring automation watching a one-off job.

## Ultima Online construction review

On 2026-11-22 Casey explicitly requested review of original UO modular architecture. Primary evidence reviewed: Origin's 2003 Age of Shadows building guide/manual and the official current housing guide, supplemented by modern ClassicUO's loaders for legacy-compatible structure and tile data. The later housing editor and current client are not evidence that every feature existed at UO's 1997 launch, nor are they Origin's proprietary engine source.

Sources:

- Origin's period building guide: https://www.mocagh.org/origin/uoshadows-map.pdf
- Origin's period manual, construction section: https://www.mocagh.org/origin/uoshadowsuk-manual.pdf
- Official current housing guide: https://uo.com/wiki/ultima-online-wiki/gameplay/houses-placing-a-house/house-owning-2-building-a-custom-house/
- Modern ClassicUO structure data loader: https://raw.githubusercontent.com/ClassicUO/ClassicUO/main/src/ClassicUO.Assets/MultiLoader.cs
- Modern ClassicUO tile properties: https://raw.githubusercontent.com/ClassicUO/ClassicUO/main/src/ClassicUO.Assets/TileDataLoader.cs
- Modern ClassicUO structure transparency eligibility: https://raw.githubusercontent.com/ClassicUO/ClassicUO/main/src/ClassicUO.Client/Game/GameObjects/Multi.cs

Observed principles: the period tools provide separate structural categories, explicit corner/post pieces, joined arches, and per-floor visibility controls. The compatible structure loader reads graphic IDs with relative X/Y/Z and visibility. Tile metadata distinguishes walls, roofs, doors, walkable surfaces, blocking and transparency. These sources support a small reusable structural vocabulary with explicit placement and behaviour.

Implementation decisions for Brasswake:

- Use individual structural parts and reusable building blueprints. A blueprint owns floor cells, wall edges, orientation, structural height/layer, doorway edges, room membership and fixtures. Appearance and collision derive from the same definition.
- Define connection geometry and anchors in code. Straight walls, outside/inside corners, end posts, junctions, door/window bays, and arches have explicit compatible ends. Do not rely on AI-generated image widths or alpha bounds alone for snap alignment.
- Separate walls from roof fields, edges, ridges, hips and junctions. Roofs follow irregular footprints and courtyards; attaching a roof lip to every wall tile is an acceptance failure. Generate missing connector pieces as part of the approved budget.
- Keep door openings structural, with door presentation/state separate. Prove front and side entrances through actual movement and companion pathfinding, not just a painted doorway.
- Keep floors in the real footprint. Hide/fade the obstructing roof and appropriate foreground wall sections when inside, while retaining enough structure to read the room. Drawing, selection and collision must remain consistent.
- Use authored blueprint variations, courtyards, setbacks, wings, porches, arcades and shared street blocks to create diversity. Material swaps alone do not satisfy the requirement.
- Retain Brasswake's established north-up raised camera. Adapt the construction principles rather than copying UO's diamond projection, assets or code. Z/height metadata is useful for roof/wall placement; this research does not silently add a full player housing editor or unrestricted multistorey gameplay.

The two cost samples remain material/quality studies. They are not the final connection specification. Before production, revise their larger facade panels into smaller separable structural elements and visually verify the townhouse, courtyard inn and side-entry warehouse assembly. The art count remains an estimate until this connection vocabulary is proven.

## Concept map

A preview-only illustration was generated with the built-in imagegen tool in this chat. Its title is “BRASSWAKE · PROPOSED WORLD”. It shows the proposed coastline, all eight towns, two inhabited offshore islands, four ferry legs, a larger Tallyport harbour, and an Aldermoot district inset.

Local original: `C:/Users/caseys/.codex/generated_images/01a2065b-8464-7c82-830a-43a0a97beda1/exec-62b00f77-6b0a-4a16-800e-737889f510e8.png`.

The image is illustrative geography, not tile geometry, gameplay footage, a navigation specification, or final game art. Apparent settlement sizes are exaggerated for legibility. Its northern Cinderwick ferry ends on the northwest mainland coast near Aldermoot; the exact landing and road connection to Kell need a deterministic blockout. Mainland towns remain joined by roads. Ferry routes must be resolved against actual water and quay tiles during implementation.

## Proposed geography

| Place | Position and role |
|---|---|
| Tallyport | Southwest mainland estuary; substantial commercial and fishing port; arrival town. |
| Brackwater | Southeast marsh island; reed channels, stilt houses, raised paths, sheltered ferry quay. |
| Haverly | Southeast/central-east mainland; golden hills and farms; nearby mainland ferry landing. |
| Four Fords | Central-west mainland river valley; bridges, farmland, road junction; west-coast ferry access. |
| Cinderwick | Western volcanic island; basalt cliffs, black sand, inland volcanic terrain, sheltered inhabited forge coast. |
| Kell | East/northeast mainland uplands; crystal caves and rocky countryside. |
| Highwatch | Northeast high mountains; snow concentrated at elevation. |
| Aldermoot | Northwest mainland headland overlooking a sheltered bay; extensive walled capital and merchant harbour. |

Use an irregular mainland silhouette with deep bays, headlands, estuaries, narrow coves, varied beaches, cliff coasts, and scattered uninhabited skerries. Island separation must be visible on both the world map and the ground. Brackwater and Cinderwick need substantial explorable countryside, dungeon entrances, and existing regional activities, not tiny platforms holding town buildings.

Retain all eight region identities, content IDs, and Circle associations. Preserve the region sequence as a teaching/content sequence; open travel remains possible. Do not geographically gate access behind combat or SQL progression. The map need not form a straight numbered corridor.

Choose final world dimensions after a measured blockout. Prefer added sea margin and useful explorable space over indiscriminately scaling all walking distances. Measure traversable land, town footprints, route lengths, terrain memory, and rendering cost before committing a size.

## Aldermoot: a metropolitan capital

Initial blockout target: roughly 160 by 130 tiles, approximately eleven times the current shared town envelope of about 53 by 36 tiles. This measures ground area, not building count. Target 60–80 building footprints, subject to phone performance and route readability. Streets should take several screens to traverse, with dense side streets and squares visible from the principal avenue.

| District | Proposed built environment and function |
|---|---|
| Council Terrace | Raised civic precinct, major council palace, ceremonial approach, council/Audit destination. Preserve the story rebuild's political framing; regal architecture does not introduce a monarch. |
| Temple & Gardens | Monumental temple, colonnades, gardens, fountains, quiet civic space. Religious lore and new mechanics require separate content decisions. |
| Grand Market | Large central square, multiple stall rows, twelve specialist shopfronts, covered arcade, clear public paths. |
| Merchants' Quarter | Guildhall, bank, warehouses, inn, existing crafting services, courtyard blocks. |
| Harbour | Stone quays, merchant ships, cargo handling, lighthouse, harbour office, ferry landing where appropriate. |
| Residential Wards | Dense townhouses, smaller courtyards, side streets, neighbourhood inns and workshops. |

Unifying materials: white marble and pale honey stone, bronze domes, blue-slate roofs, blue-and-gold cloth. Continuous walls, towers, a grand road gate and smaller service gates establish the silhouette. The palace, market, lighthouse, and gate should remain useful orientation landmarks while walking.

City size must come from connected urban space and useful destinations as well as art. Keep essential existing services easy to find from the gate and market. Specialist shops should offer clear, distinct subsets of existing goods/services; do not imply twelve new crafting or economy systems. Final shop functions and interiors are a design checkpoint. Avoid labelling decorative buildings as enterable or assigning services that are not implemented. Decorative residences may remain closed; the main public landmarks and agreed shop/inn interiors need an explicit entrance list.

## Tallyport: an actual working port

Initial blockout target: around 100 by 75 tiles including waterfront, without spreading the novice route across that entire area. Preserve the revised opening's compact safe route between arrival, Tamsin, Odalys, the first lesson, supplies, and training.

Proposed harbour features:

- A sheltered estuary basin with a navigable entrance and breakwaters.
- Stone quays and at least three substantial piers, with readable water depth and pier edges.
- The Marigold visibly moored as an identifiable ship, a second merchant vessel/cog, and smaller fishing craft. Confirm which existing large-ship silhouette suits the story before assigning it to the Marigold.
- Warehouse fronts, cargo yards, ropes, bollards, loading cranes, stacked goods, fish handling, and a harbour office.
- A lighthouse and a separate public ferry berth. Cargo operations and pedestrian paths need enough room to read clearly.
- Visible loading activity and modest ship/water animation where performance permits. Ship boarding is a separate explicit scope decision; visible moored ships and functional ferry boarding are included in this proposal.

Ships must sit alongside quays at a credible scale, with hulls meeting the water, masts extending upward, and correct collision/occlusion. Preserve the art camera and do not shrink a ship into a boat to fit the old dock. The illustrated map is not proof that the existing side-on ship sheets work in the gameplay camera.

## Proposed ferries

Four two-way legs: Tallyport–Brackwater; Brackwater–Haverly mainland landing; Four Fords west-coast landing–Cinderwick; Cinderwick–northwest mainland landing with onward road access to Kell/Aldermoot.

Recommendation: free, on-demand passenger service, avoiding a fare trap or timetable wait. A visible ferryman/boarding point offers the destination and triggers a brief crossing transition. Place the player safely on the opposite quay with a clear return service. No free sailing is proposed.

All services work before either destination is visited; existing visited-town fast travel must not bypass the first intended ferry visit. Decide explicitly how later town travel, houses, death, and saved positions interact with islands. Every island must remain escapable with zero gold. Use stable route and landing IDs, and guard repeated boarding taps and reloads.

## Preserving the story rebuild

The chat “Review Intro and Gameplay Onboarding” finished its tested and deployed release before world implementation began. Its plan is `2026-11-22-story-writing-and-first-day-audit.md`. The world rebuild starts from its verified commit `3e26592de0e2913ed71854ad27a92849f3f07c58`, retaining narrative content, the manifest-based SQL introduction, companion movement, rewards, consumables and weapon rendering.

The earlier proposal phase changed only this plan and ignored previews. Current implementation touches shared adapters after the dependency completed. It establishes Aldermoot as the capital, preserves the council's authority and leaves story content identities intact.

Recommended implementation sequence:

1. Let the story/onboarding rebuild finish and establish its tested release commit before integrating geography or editing shared scene/game files.
2. Start the geography implementation from that released baseline, using an isolated worktree and a `codex/` branch if other work remains active. Independent art inventory/blockouts may precede integration when they do not touch shared files.
3. Keep geography, settlement layouts, and ferry route data in dedicated modules where practical, with narrow scene/game adapters. Do not move unrelated story/equipment code during extraction.
4. Preserve region, NPC, quest, dungeon, and guide-step IDs. Replace coordinate assumptions with semantic anchors for arrival, ship, guildhall, training, market, ferry, and dungeon entrance. Update compass/distance guidance against the generated world.
5. Rerun the full unskipped novice flow in the finished port, including following/rejoining Tamsin, lesson access, food/potions, equipment, and rewards. Review rewritten geographical directions with the new story content.
6. Migrate changed world positions, discovery data, homes, corpses, and travel references deliberately. Determine any save-version change only after inspecting the released save schema; do not silently strand or erase characters or player houses.

Physical layout and narrative still have integration dependencies. Separate modules and sequencing reduce interference; they do not remove the need for combined testing.

## Art plan

Read-only inventory on 2026-11-22 confirmed existing raw files in `C:/Users/caseys/source/SQL Game/kit/out`: KH01–04 harbour materials; KB01–03 ships/ferry; KD01 dock props; KC01–04 capital landmarks; KS01–06 city buildings; KM01–02 markets; KR01 shop fittings; KX01–05 surfaces; KQ01 coast props. Their presence does not certify production suitability.

First open and review these sheets at intended gameplay scale and pack usable pieces into independent new atlases. Preserve all existing originals, prompts, filenames, settings, and current atlases. Assess gaps in ship orientation/scale, quay corners and transitions, gates/walls, city roof variety, ferry landing pieces, and landmark interiors. Produce a small targeted sample before any full supplemental run. Paid full runs and changes to master prompts/model/quality retain their existing explicit approval requirements. No production generation is started by this proposal.

## Completed milestones and original acceptance gates

1. **Discuss and settle geography:** island choices, ferry routes/rules, capital footprint, public interiors, and Tallyport arrival arrangement. Approve a deterministic blockout before detailed prop placement.
2. **Inventory art and prove silhouettes:** inspect available sheets, stage a small harbour and capital block, verify ship/hero scale and landmark readability at 390×720 and desktop. Establish supplemental art needs.
3. **Build geography and anchors:** deterministic coast/island generation, terrain transitions, road network, reachable existing activities, safe semantic anchors, and position/discovery/home migration.
4. **Build travel and working Tallyport:** bidirectional ferries, visible ships, actual harbour layout, safe revised first-day route, travel/save/death tests.
5. **Build capital:** six connected districts, measured target footprint/building density, landmark entrances, useful markets and shops, walls/gates, population and performance pass.
6. **Integrate and release:** review all acceptance criteria, update master docs and dated decisions, run focused regressions and `cd game; npm run verify`, inspect required screenshots, commit only intended files, push normally, monitor Actions for the exact SHA, and verify live commit plus HTML hash and hosted player flow.

Required evidence before release:

- Two towns lie on genuine separate islands; their content and dungeons remain reachable.
- Mainland road connectivity, four safe two-way ferry services, zero-gold escape, first-visit travel, repeated taps, reloads, death/recovery, and supporting-character flows work.
- Aldermoot's measured extent and building count, connected gates/districts/services, collision, occlusion, city-map labels, and useful navigation meet the agreed blockout.
- Tallyport contains credible quays, piers, multiple actual ships including the Marigold, working ferry access, and a compact safe first day.
- Existing saves and all account slots recover safely; affected house/corpse/discovery coordinates have an explicit policy and meaningful regression coverage.
- World overview, coast transitions, both islands, each harbour, capital entrance/market/palace/residential streets, building interiors, and ferry arrival scenes are opened and visually inspected at 390×720 and desktop dimensions. Browser WebKit is not a real iPhone test.
- Measure world-generation time, scene frame behaviour in dense city streets, asset memory, and map readability. Runtime limits should be based on the current release baseline and observed devices, not invented universal budgets.
- The story rebuild's teaching, dialogue, companion, equipment and reward regressions continue to pass in the new layout.
- Deployment and hosted player flow succeeded for the exact final source commit; see linked release history for closure.

## Implementation and verification status

- Dependency released and independently verified before shared source changes: `3e26592de0e2913ed71854ad27a92849f3f07c58`; published HTML SHA-256 `76303483b0d4ec4d7a42fe5abbc0a52264ee44aeb031f9e5e95f282e2a1ca607`.
- Modular compiler, renderer, shaped geography, 64-building capital, working ports, four ferries, specialist stock and world revision 3 migration are implemented. Mainland and island collision components and all ferry directions have focused browser coverage. First-key movement animation and prop loading errors found by those tests were corrected.
- Production: all20 new Sunburst/high 1024² transparent sheets generated, with existing art reused. Estimated cumulative image spend including comparison test: $1.218326 of approved $20. Source hashes, usage receipts and untouched raw outputs are local. Eight final atlases contain551 pieces from56 sheets, 4,018,958 bytes. Whole-component crop correction required no paid rerolls. Full receipt replay reproduced generated JS and eight WebPs byte-for-byte; ten art-tool tests passed.
- Opened the construction proof at390×720 and1280×800, raw/packed kit contact sheets, assembled harbour, palace and courtyard scenes. Full release screenshots and checks remain pending.
- Bounded delegation: building compiler/view and independent browser coverage; pure geography/migration and service adapters/replay tests; deterministic art packing and visual inspection. Main owns integration, documentation, review and release. Workers do not own overlapping files.
- Focused follow-up: 15 browser cases passed across phone Chromium, phone WebKit and desktop. The unchanged warrior first-day lesson passes from the widened cargo apron. Natural rock/bridge collision is cleared when roads are stamped; every dungeon entrance and the guided fishing tile have reachable cardinal approaches. A courtyard depth regression verifies furniture remains below its roof while the hero remains visible.
- Memory: an uncapped traversal retained about 205 MiB of generated building canvases. The 32 MiB LRU sweep visited all 150 modular buildings without missed views/errors, peaking at 31.994 MiB after a frame. City count is 64 inside the walls (75 region-wide including countryside), not the earlier regional count of 70. Local synthetic generation/draw measurements and complete map/phone palace/harbour previews are under ignored work/world-perf and work/world-game-prototype; no real phone was tested.
- Release gate: locked dependencies installed with npm ci after the offline cache proved incomplete. Ten art-tool tests and all 522 packed hashes/dimensions pass. The first full verification attempt passed all non-browser checks, then was stopped after finding the narrow running-lesson apron, phantom natural collision beside Slagdeep, and an unreachable wilderness music fixture; these are corrected with focused checks. Those remaining gates subsequently passed as recorded in the final local evidence and tracked release history; the interrupted attempts are retained as historical checkpoints.

- Save-compatibility follow-up: exact released/current ID audit exposed two omitted Brackwater homes, three lairs and then a shrine after occupancy changed. Required home/POI/lair placement now has a deterministic reachable fallback. All 56 home, 56 roam, 88 POI, 16 lair and 73 fish IDs pass browser inventory/approach assertions in all three projects. Saved find/delivery names and directions reconcile without changing IDs, found/progress counters or rewards; two new pure regressions pass. The Slagdeep component test and unchanged warrior first day pass after these fixes. The second full attempt was stopped to integrate this compatibility correction; final full verification is next.

- Final visual pass opened the complete map, Tallyport waterfront, Aldermoot harbour at phone/desktop size, palace approach, market, garden, residential street, grand gate and courtyard. A capital ferry overlapped the quay; corrected ship waterline anchors and added shoreline-aware ferry berth search. All ship spans now assert open sea in all three projects. The third full attempt passed all 55 phone Chromium cases and was stopped during WebKit to incorporate this visual correction. Final frozen candidate is next; do not treat the interrupted attempts as complete gates.
- Durable raw archive: C:/Users/caseys/source/SQL Game/kit/world_modular_2026_11_22 holds the twenty new PNGs, prompts and usage receipts. Replay from that archived out/ directory reproduced all eight WebPs and artworld.js byte-for-byte. Verified release closure is preserved in tracked release history; work/world-rebuild-release.json is supplementary.

- Fourth complete gate: all non-browser checks passed; browser result was 164 passed and one desktop sound-fixture timeout. Trace proved a farmer occupied the requested exterior square, causing safe placement directly in the doorway before the fixture cleared its sound log. Corrected only the test setup: retain occupancy/collision, freeze patrol movement, choose a clear compiled entrance, assert exterior state and use native one-tile input. All nine focused repetitions passed across the three projects with unchanged sound assertions. Final clean full gate uses four local browser workers; CI retains its default concurrency and identical assertions.

- 2026-11-23 local release gate complete: npm run verify passed all non-browser checks and all 165 browser cases (four local workers, no retries or skipped cases). Reviewed final phone and desktop harbour, side-entry and courtyard captures in game/test-results. The final runtime source and packed assets remained frozen during the clean gate; only status/documentation is updated afterward. Proceed to commit, push, exact-commit CI deployment and independent hosted verification.

- 2026-11-23 CI budget correction: world implementation commit `9d345e5fc92363e82d18ee23e71731227f9fc372` passed all non-browser checks and 160 of 165 browser cases without failures in run `45136774222`, then reached the existing 45-minute build limit. No deployment occurred. Increase only the build limit to 60 minutes, retain all assertions/default workers and the 15-minute deployment limit, and run the complete suite via workflow_dispatch on `codex/world-release-budget` before advancing main. The subsequent repair-branch validation, main deployment and independent hosted commit/hash/UI verification all passed; exact runs and final identity are preserved in release history.
- Repair local gate: npm run verify passed all selected checks, including 21 workflow/server tests; UI selection correctly excluded the timeout/documentation-only delta. The first sandboxed attempt could not connect to its localhost server (EACCES); the authorized rerun with localhost access passed unchanged assertions. Runtime and assets are byte-identical to the full 165-case local candidate. Manual repair-branch CI subsequently passed all 165 cases before main advanced; main deployment and independent hosted verification completed the release.
