# Living landscape across the whole world

Classification: complex. Status: implemented and locally verified; waiting for the concurrent publisher before exact-commit release verification. Not published. Casey authorized the whole-world vegetation/liveliness pass and asked that concurrent work and deployments remain undisturbed.

## Scope and acceptance criteria

- Eight regional planting families, each with two recognizable species and authored young, slender, mature and old silhouettes. Stable individual height/width/foliage variation supplements distinct artwork.
- Painted bushes, regional undergrowth, reeds, grasses/flowers, fallen leaves/needles, roots, fallen timber/stumps and tended planting around appropriate settlements/homesteads.
- Natural-looking groves, woodland margins and clearings through a separate deterministic decoration stream. Retain the existing physical world, entity identities, roads, protected sites, housing clearance, saves and gameplay RNG. Additional clusters use nonblocking decoration around existing trunks; no new barrier closes a route.
- Restrained connected wind movement, occasional perched/taking-flight birds, and revealed silhouettes for the hero and nearby actors under foreground foliage. Preserve phone readability and entrance visibility.
- Source/output receipts and repeatable packing for new-only assets. Existing packed art, source prompts and image-generation settings stay untouched. Use built-in image generation; no paid API run.
- Review actual in-game screenshots for all regions at 390×720 and desktop, plus native-size assets. Browser emulation does not establish physical-iPhone testing.

## Isolation and release order

Worktree: `C:/Users/caseys/.codex/worktrees/living-landscape/Brasswake`, branch `codex/living-landscape`, starting at `a738797`. Separate available localhost ports and work/test outputs. The initial planned port 8797 was already occupied; it was left undisturbed and the landscape test server uses an available ephemeral port. Main is clean at task start. Concurrent dungeon/movement agents own release run 45632434712; observe read-only and do not cancel/replace/push while their release or closure is in progress. Integrate their final source normally before this release. No edits in their checkouts.

## Milestones

1. [x] Read instructions, inspect source and concurrent status, create isolated checkout and actionable plan.
2. [x] Generate/review regional vegetation kit, preserve raw images locally, add reproducible packer and receipts.
3. [x] Implement stable placement/variation, ground integration, wind and wildlife with bounded visible-only work and actor visibility.
4. [x] Add pure regressions for deterministic placement, protected ground, physical-world preservation and budgets; add browser checks for all eight regional families, actor reveal and navigation.
5. [x] Run local core (`npm run verify -- --defer-ui`) and focused browser suites in three profiles; open phone/desktop screenshots; review diff and master docs/Decision logs.
6. [ ] Wait for other publishers, integrate latest main, push intended source without force and monitor full exact-commit CI (shared Scene/build/art change).
7. [ ] Verify hosted source commit/HTML hash/player flow; reconcile master docs, close this plan and add tracked release evidence; commit/push docs without another deployment.

## Checks and evidence

Planned: pure landscape invariants and packer replay, existing art-manifest verification, core checks, smoke/living-world/world-buildings/world-travel during local development, full exact-commit CI and hosted UI. Record only checks actually run. New visual checks include variation within species, natural grouping, ground contact, foreground actor reveal, doors/routes unobscured and bounded decoration/wind state. Retain failures until fixed.

## Costs and limits

Task-specific AI, image-tool and CI dollar billing unavailable unless returned by existing evidence. No delegated workers at planning. Built-in image usage will be reported separately from any paid API usage; no paid API run authorized or planned. Physical iPhone and subjective performance require actual device evidence.

### Local verification checkpoint

- Eight built-in transparent sheets, 128 packed pieces, 3,751,998 bytes. Raw filenames and new-only prompts archived at `C:/Users/caseys/source/SQL Game/landscape_2026_11_25/`. Opened both complete game-size regional kit reviews. All 609 prior accepted asset records remain unchanged. Archive replay reproduced all eight atlases and generated coordinates exactly; packed baseline verifies 617 files. Existing `arttools/test_arttools.py`: 3 passed.
- Initial local core command passed, with UI deferred; final exact-commit CI remains required. Pure regressions now cover physical preservation, stable RNG-independent ecology even after wandering/respawns, biome borders, shape stages, wind/ground anchoring, late image loads, foreground reveal and suppression after housing/actor occupancy.
- Initial browser snapshot found a real occupancy-dependent decoration difference on rebuild. Placement now ignores transient occupants; render-time culling preserves actor space. Initial captures also exposed overly opaque overlapping crowns and political-region trees in snowy habitat; strengthened foreground reveal and chose wild species from ground biome. The unchanged initial snapshot run is historical; rebuilt focused coverage remains required.

### Completed local review

- Local core passed with UI deferred. Subsequent landscape changes passed all 12 focused pure tests. The broader browser run passed 98/99; the sole failure was WebKit cancelling a newly requested human C3 image during a deliberate travel/save reload. The fixture now observes a fresh quiet window over actual completed requests after drawing/pausing, retaining all strict request/error and save/landing assertions. Trace timing established that an older lifecycle networkidle event predated the new request. All 30 repaired reload/regional-landscape checks passed in three profiles (3.5 minutes). Three additional public-garden checks passed on the final snapshot (28.2 seconds). No failed required assertion was removed.
- Opened the complete regional kit, all eight phone and desktop regional captures, homestead/worn-track and wetland views in both sizes, and final capital-garden captures. Trees follow ground biome, overlapping foreground crowns reveal actors strongly, and nearby entrances/usable objects join the reveal subjects. Public shrubs sit on the soil side of planted trees; paving remains clear. Existing foreground capital roofs partly conceal rear garden beds; this pass does not alter architecture geometry or roof cutaway rules.
- Source/data and packed-art review: no save-version or physical-map change, no gameplay RNG use, stable tree/decoration profiles, bounded chunk/cache state, all prior asset records preserved, archive replay exact. `git diff --check` passed. Physical iPhone behavior/performance remains unverified.
- Eight built-in image calls; no paid API run or delegated agents. Task-specific AI, built-in image billing, fixed-subscription allocation and CI/deployment dollar billing are unavailable. No task publication has occurred yet.

### Ground-contact audit

An additional art audit found that asymmetric old crowns need explicit root anchors rather than bounding-box centres. The packer now derives base-pixel contact anchors for every piece; the renderer preserves those anchors through width/height variation, mirroring and wind. Bird perches follow the actual crown frame. All packed WebPs and prior asset records remain unchanged. Opened both complete 64-tree contact-marker reviews; updated pure tests, archive replay, existing art-tool tests and the packed baseline pass. All 30 updated landscape checks passed in three profiles (3.3 minutes), including actual metadata anchors through mirror/width variants. Opened the final eight-region phone and desktop capture reviews. The concurrent publisher's WebKit job failed in run 45632434712, so its deployment was skipped; continue holding publication while that owner repairs/verifies its release.

### Coordinated publication assignment

Casey requested review/assignment of the three concurrent agents in the coordination chat. The recovery publisher owns both failed WebKit cases, the dungeon/locomotion recovery release, live verification and closure. This landscape workstream is the next publisher after that verified release and its documentation closure. Independent landscape review is complete at `809f244`; no recovery fixes, peer checkouts or workflows are owned here.

Owned files are the new landscape packer/prompts/receipt/atlases/metadata, `landscape.js`, `scene_landscape.js`, Scene preload/draw hooks and build registration, landscape pure/browser coverage, the isolated world-travel reload fixture correction, and affected master docs/this plan. Before publication, integrate final main normally and explicitly preserve its cartography/recovery fixes, human locomotion and dungeon assets, Scene/build registrations, packed manifest entries and shared documentation. Reuse prior unchanged local evidence, run applicable post-merge checks, then the mandatory full exact-commit gate and live SHA/hash/player flows. Do not repeatedly monitor or duplicate the recovery investigation; wait for the coordinated handoff once independent work is complete.
