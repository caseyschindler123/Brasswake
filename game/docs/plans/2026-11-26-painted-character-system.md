# Painted character system

Status: authorized full production rollout in progress. Casey accepted the corrected v3 walk/run pilot, requested all clothing/armor, sitting and battle actions through deployment without review stops, and explicitly required every gear item. Three workers cover shared profile/bake tooling, fitted wardrobe, and held/head/accessory art; the lead owns motion, runtime integration, validation and publication.

## Production authorization — 2026-11-26

Start: 14:46 UTC. Target approximately two hours; full gear coverage is required and no old-art fallback is authorized. Existing source-generation settings and raw assets remain intact; built-in new-image creation is authorized by the full rollout go. No external paid full-run tool is authorized.

- [x] Inventory all gear and integrate the latest main release without overwriting it.
- [x] Generate six continuous profiles and 30 fitted outfit banks, true frontal dolls, cloth/material/component masks, seated and source-driven battle poses.
- [x] Cover every named physical gear archetype and all twenty weapon variants, six offhand identities, headwear, hands/feet, cloaks and wearable accessories; retain honest inventory/icon representation for non-wearable relics.
- [x] Wire complete equipment identities, authored NPC bodies, full-direction sockets/occlusion and bounded caches without save migration or environmental resizing.
- [x] Inspect native and integrated phone/desktop captures, including difficult mixed gear and robes; fix visible defects.
- [ ] Run full non-browser checks once and the session browser profile below; repair relevant failures without assertions/baseline weakening.
- [ ] Commit/push intended source, pass exact-commit CI, verify hosted commit/HTML/assets and actual play/offline reopen, record release evidence.

Production review evidence: six profiles/30 body fits, 108 equipment banks and 2,208 lossless WebPs are sealed. All 632 published assets retain their original hashes. Separate production source receipts preserve prompts, raw inputs and replay. Four initially indistinct non-average bodies were broadened and refitted. Review corrected feminine neck/waist joins, cloak/torso intersections in deep swings, crossbow/book grips and crossbow paper clipping. All six full wardrobe/action browser cases passed (43,680 composed frames). The full local non-browser verification passed with all core groups; final affected browser rerun and exact-commit CI are pending. The startup/water-rescue null-frame failures found during integration were corrected before release. The first release attempt f9738a5/run 45850921460 was cancelled before publication after review found the legacy 0.45-tile melee lunge duplicated the new captured weight shift. The correction retains creature motion, removes the extra human slide and passed an actual timed attack regression on all three browser profiles. Source art remains offline; no model is downloaded by players.

The corrected game candidate c8e6391/run 45851601718 was also cancelled before publication when the actual 2,400-path plan exceeded Linux’s single-environment-entry size limit. Lossless bounded verification-plan transport preserves the entire scope and raw JSON receipt, reducing the observed payload from 271 KB to 24 KB. Both consumers and 56 workflow/protocol/scope assertions passed; game/art bytes did not change during this repair.

### Approved one-session testing exception

Casey requested a faster checklist, specifically limited WebKit, and approved the proposed full-rollout plan. This release will use a bounded named session profile rather than the normal all-journey fallback for shared actor changes. Retain full non-browser groups, all three browser jobs, relevant Chromium integration coverage and a small WebKit critical suite covering load/create/save, touch movement, representative gear/actions and offline reopen. Defer long profession journeys and exhaustive WebKit combinations. Keep release ancestry, known failures, immutable old-reader tests, aggregate failure reporting and exact hosted identity/offline checks. Record selected coverage and limitations; restore normal selection immediately after this release, and run a non-publishing full follow-up. An expired or mismatched session profile must fail closed to normal full selection.

The single-model material below records completed pilot evidence and earlier holds; this production authorization supersedes its scope/deployment hold.

## Authorized single-model pilot

Casey agreed to the fitted-model-to-painted-sprites approach and requested one first. Build one average male anatomical source and one plate set fitted from its surface. Keep body/bone measurements shared, use a true frontal paper-doll camera and the game's elevated directional camera, and preserve material/dye masks. Render actual stills and animation, inspect phone/desktop/native output, revise visible failures and record the limits. No broad art expansion, game release or main publication is authorized by this pilot checkpoint. The earlier integrated set stays an unshipped rejected prototype.

- [x] Derive a fitted, continuous body/armor source with measurable clearances and common bones.
- [x] Inspect actual geometry and both camera projections, then add a painted finish for game-scale review.
- [x] Render and inspect all directions plus walk/run and an unarmed arm strike; revise visible registration/coverage failures.
- [x] Prepare the single-model comparison and candid findings. This checkpoint is a local candidate, not final visual acceptance. Keep the broader plan and deployment held.

Pilot evidence: `work/painted-characters/model-pilot/fitted-plate-pilot-v3.html`
contains the frontal pair and eight-direction movement comparison on unchanged
town artwork, with enlarged inspection sprites. Walk/run GIFs provide portable
alternatives. Sixteen focused model/motion tests passed: body preservation, binding
of clipped vertices, shaped arming-cloth coverage, finite fitted surfaces,
forward knee bends and valid segment lengths, continuous contact/cycle
transitions, planted sole landmarks, source neck/skull rotation, source mean
foot balance and preserved torso lean. Pinned morph/converter/mesh replay
matched in the initial pilot. Phone Chromium and WebKit
emulation at 390×720 and desktop Chromium at 1280×800 passed loading, actual
frame advance, pause, facing/motion controls and overflow checks; their captures
were opened. No physical iPhone test or game build/release gate was run.
Three rendered-color regressions also passed: face/hair and boot leather stay
unchanged while steel and arming cloth change. Cycles play in place; this is not
an actual-world movement, depth-occlusion or furniture-fit integration test.

Casey's follow-up identified reversed walking knees, a jolted gait, the flat
grey neckline and poorly wrapped shoulders. The authorized simple correction
adds an offline-only leg adapter with a stable forward bend, continuous foot
transfer and smoothed reach correction. It retains upper-body capture and
116/171 cadence. A shaped, lower collar opening replaces the flat neck cutoff;
caps extend inward onto the chest/back overlap. The revision-two inline preview
uses all 24 walk/run frames at native pixel size. Three browser profiles passed
and their revised walking/run/frontal captures were opened. The old preview and
pre-correction images are preserved. This remains local, uncommitted and
undeployed; broader expansion is still held.

Casey subsequently noticed a backward walking posture and requested original
walk/run analysis followed by a rebuild. Direct inspection of the untouched
source confirmed a nearly vertical walking torso and approximately 9.7-degree
forward running torso. Revision two retained those torso directions but added
a backward head bias and placed running feet approximately 10 cm farther ahead
of the hips than the source's average balance. Revision three applies actual
source neck/head rotation deltas to this body's neutral axes and restores each
gait's average ankle-to-hip offset. Mean revised torso lean remains about 0.1
degrees walking and 10.3 degrees running. Forward knees, valid segments,
continuous contacts and grounded sole landmarks still pass. Nineteen focused
model/motion/rendered-color tests and all three preview browser profiles passed;
native contacts and revised phone/desktop captures were opened. Original and
revised source measurements are in ignored `source-motion/`; replay and the
tested correction are tracked in the tool code. No production implementation,
commit, main push or deployment occurred.

Self-review revisions: replaced the unmorphed anatomical base with pinned male
morphs; bound cut plate vertices to actual body triangles; corrected whole-panel
paint drift (the cause of the striped edges, not the binding issue); covered
neck-weighted shoulders with arming cloth; retained the rig's loose finger curl
for more natural body/gauntlet silhouettes. Metal and arming-cloth tinting leave
face pixels unchanged. The body-only linen dye experiment showed jagged hems
and is rejected. Gauntlet texture projection, precise linen dye masks, rigid
plate articulation and held-weapon fitting remain future work. This pilot has
not established A+ acceptance or authorized expansion. Source prompts/hashes,
replay and limits are in `arttools/PAINTED_CHARACTERS.md`.

## Scope and consequential risks

Replace the human presentation with the accepted painted direction: male and female average, muscular and heavy profiles, fitted tunic/robe/leather/mail/plate, directional complete heads, seated poses, locomotion and combat, and corresponding paper dolls. Existing world dimensions and unrelated work remain intact. This is complex because appearance persistence and the shared world/paper-doll attachment contract change. Rendering must retain grounded contacts, bounded resource use, equipment identity, and legacy saves.

## Milestones

- [x] Inspect latest main and existing character, equipment, portrait and preview contracts; create an isolated worktree.
- [ ] Re-prove one continuous body and fitted plate model before expansion. The earlier pilot and full-set contact sheets did not establish visual acceptance: Casey rejected distorted body proportions and hollow-looking disconnected joints. The first silhouette-strip fitting experiment also introduced visible banding and is rejected.
- [ ] Author and pack fitted sources for six profiles and five clothing families, directional heads and equipment. Preserve raw filenames and existing art; record new-only prompts and source hashes.
- [ ] Integrate profile selection/persistence/defaults, stable NPC variation, locomotion/actions/seated poses and paper-doll attachment metadata. Preserve mounts, headgear, skin/hair/dye/material choices, physical movement and world dimensions.
- [ ] Review the complete fitting matrix: necks, shoulders, wrists, elbows, waists, knees, robe hems, footwear, grips, shields and headgear. Correct visible failures rather than masking them with tests.
- [ ] Add meaningful compatibility/contract regressions; run focused checks and open actual desktop and 390×720 captures. Check normal creation/save/reload, equipment, movement, battle and seating flows.
- [ ] Reconcile current master documentation and decisions. Review intended diff and provenance; integrate latest main without overwriting concurrent work.
- [ ] Commit/push main; monitor exact-commit Actions through publication and hosted commit/HTML/offline/player-flow verification. Record release identity, evidence and remaining limitations; close this plan only after verification.

## Acceptance and verification

All six profiles must remain visibly distinct with normal adult proportions. Clothing must follow the selected profile rather than stretching one old body. Complete heads must remain coherent across directions; facial hair and hair share the head attachment. Paper dolls must use the same selected profile and fitted outfit with measured palms/head slots. Walk/run retain the accepted restrained motion; actions need valid grips and layering. Seated people fit existing furniture; no environmental rescaling. Existing saves load with an average default and persist explicit selections. NPC builds are authored from character identity, occupation and story context, never randomly or hash-assigned. Named people receive individual documented choices; remaining residents use authored role profiles. Casey explicitly clarified this requirement during implementation on 2026-11-26. No unbounded decoded atlas cache or raw licensed motion redistribution.

Use source/packed-art replay and fit contacts, runtime regressions, affected-scene browser captures, and the repository's conservative shared-rendering/save/movement release selection. Inspect actual generated images. Required profiles are phone Chromium, phone WebKit and desktop Chromium; physical iPhone testing must not be claimed. Exact-commit CI is authoritative; do not repeat unchanged passing full suites.

## Evidence and release

Casey's correction on 2026-11-26 changes the order of work: build one model, screenshot the actual output, critically inspect it, revise and repeat until excellent; only then expand to all clothing/armor. The paper doll must be directly face-on while gameplay uses the elevated directional view. Share anatomy, fitted armor measurements and landmarks between camera treatments; do not compensate by independently stretching the torso or limbs. The previous paper-doll bake reused the world projection and attached a frontal head, compounding independent source-part scaling and exposed cap/socket artwork. Current passes establish technical contracts only; they do not approve the rejected visual set. None of this workstream has shipped.

The first focused save checks rejected a character-v9 bump because two immutable published readers discard unsupported v9 character records. Keep account v9/character v8 and add the optional normalized `app.build` field. Old readers preserve additive appearance fields. Retain the existing old-reader integrity assertions, and extend them for build preservation rather than weakening backward compatibility.

Focused checks so far: 20 actor/head/NPC/save checks passed after keeping the compatible version. Seven profile/material/action/save checks passed, including muscular/heavy appearance fields through both immutable older readers. These precede the final gait/source metadata and do not establish final rendering or release status.

Pending. Production implementation has not shipped. Earlier accepted studies remain preview evidence, not production foot-locking or equipment-fit proof.

Frontal correction studies: `arttools/painted_body_pilot.json` records a continuous frontal body, fitted plate, finish revision and alpha correction with exact prompts/hashes. These are visual targets, not proof of a shared fitted source model or animations. Both use the same source-to-paper-doll transform so independent scaling cannot hide fit changes. The finish revision with an opaque matte was rejected and corrected. An initial equipped-UI capture mistakenly stored an item object in the ID slot and showed the old tunic; the disposable fixture now asserts plate profile 5 before capturing. No production code or external release was changed by these preview-only captures.
