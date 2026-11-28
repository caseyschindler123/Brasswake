# Brasswake: art style and art pipeline

Last updated: 2026-11-27. Painted modular world/dungeon architecture is verified at `639f24e`; see the closed [rollout plan](plans/2026-11-25-world-architecture.md) and release history. Character motion, intro/menu continuity and world presentation are verified at `d3850c3`; see the closed [polish plan](plans/2026-11-24-animation-and-world-polish.md) and release history. This covers image style, asset preparation, music sources and how they get into the game. Verified release identities and limitations are in [release history](RELEASE_HISTORY.md).

Verification scope is owned by [05_CODING_WORKFLOW.md](05_CODING_WORKFLOW.md), including its current gates and cosmetic/layout criteria. The [scope-based implementation](plans/2026-11-25-scope-based-testing-and-dev-mode.md) provides direct affected-scene checks and disposable Dev setup. Physical anchors, doorways, shared renderers and packing/cache contracts retain their relevant checks. Codex runs checks and opens captures; paid image/settings approvals remain unchanged.

Use direct affected-scene captures or Dev gear/building presets for appearance work; use normal in-world interaction when checking physical entrances, ground anchors or placement. The [environment-use guide](05_CODING_WORKFLOW.md#choose-the-development-environment) distinguishes these checks. Dev starts muted and cannot establish audio quality/playback or a complete player journey. Only reviewed atlas families currently receive automatic cosmetic selection; a visual-looking edit in global CSS/shared code can still require full coverage.

## The look in one paragraph

Bright, colourful medieval fantasy in clear daylight. Realistic proportions, nothing cartoonish, nothing grim. The world is seen top-down from a raised camera, from above and slightly in front, so roofs and front walls both show. It is not a diagonal isometric view. Characters, creatures and props are a detailed hand-painted pixel look. Portraits, story scenes and the paper-doll figure are hand-painted illustration. The reference point Casey keeps returning to is Ultima Online: humans who look like real people, gear you can see on the body, a world that feels lived in.

Every prompt starts with the global style line kept in `art_prompts.json`:

> Art for a 2D top-down fantasy role-playing game. Bright, colorful medieval fantasy in clear daylight. Realistic proportions, nothing cartoonish, nothing grim. No text, no borders, no watermarks, no drop shadows.

## Rules for every image

- **One finish standard for every visible game element:** shape, texture, lighting, perspective, scale and connection to its surroundings must meet the approved painted style. This applies to generated assets and code-drawn details alike. Jambs, lintels, corners, flashing, coping, signs, stair housings and roof junctions need the same care as characters, props, terrain and interface ornament. Inspect actual game-size and native-resolution images before accepting them; compare world objects with an adult and their supporting construction.
- **Keep entrances visible:** buildings have fitted regional door surrounds with no entrance awnings or canopies. Framing sits outside the real aperture and moving leaf. Grade-level thresholds meet the land; stairs belong to actual changes of level.
- **Every staircase shows support, direction and connection to another level.** Dungeon ascents belong in supported perimeter-wall recesses with continuous masonry/coping; a freestanding arch in a room centre fails the visual review. Descents belong in floor openings with thickness, a protective rim and steps visibly below grade. Match the surrounding material, wear, light and perspective, and compare with an adult at actual phone/desktop size. Check this spatial logic as well as alpha, joins, dimensions and visibility beneath fixed HUD labels. Move collision, interaction and reciprocal landings with relocated stairs.

- **No text** anywhere: no letters, numbers or signs with writing. A shop sign is a picture, such as crossed staves or a tankard.
- **Transparent sheets have nothing behind the subject.** Every transparent-background sheet must carry both lines below. If a prompt is missing them, ask Casey before changing the prompt master:
  - No ground, no shadow, no grass, nothing behind the character or object.
  - No glow, haze or backdrop.

  Haze and glow reaching the frame have broken slicing more than once.
- **Separate pieces on one sheet are evenly spaced, none touching**, each centred in its cell. Nothing crosses from one cell into the next.
- **Same camera in every piece:** raised, from above and slightly in front, about 35°.
- **Even daylight:** soft light from the upper left, no cast shadows on the ground.
- **Colours the game recolours stay neutral.** Dyeable cloth is plain off-white. Metal is plain steel grey. House walls are pale off-white and roofs mid grey. Grips are natural brown leather or wood, never coloured. The game tints these areas.
- **References:** a section with `need_ref` uses a reference image for style, size and camera. When a second reference only shows style, the prompt says not to copy its person or gear.

## Curating world-object artwork

Every recognizable world object must look like finished Brasswake artwork. This includes horse stalls, gates, rails, furniture, gaming tables, chairs, troughs and other building fittings. Select a suitable accepted painted asset or create a properly authored asset that matches the established raised camera, realistic proportions, materials, lighting, detail and scale. New art is not accepted merely because generation succeeded.

Do not ship flat rectangles, plain polygons, generic canvas boxes or other placeholder-quality stand-ins as finished world-object artwork. A functional horse holder is still unfinished if its timber, joinery, ironwork, perspective or relationship to the horse looks crude. Procedural collision, placement, masking, recolouring, terrain joins, effects and interface symbols remain appropriate uses of code; they do not excuse replacing a recognizable physical furnishing with an uncurated primitive.

Codex owns curation before release. Inspect the actual source cut and the assembled object at native scale, 390×720 and desktop dimensions, beside the actors and neighbouring accepted art. Check silhouette, depth, texture, grain, transparency, joins, contact with the floor and foreground/background overlap. For stalls, the horse must stand naturally inside the structure with readable body/legs and correctly overlapping rails. Reject or replace art that looks like a placeholder, even when collision and browser assertions pass. Screenshot capture alone is not visual acceptance.

Missing or loading art must not silently reveal a crude production fallback. Preload required fixture assets or keep their presentation pending. Prototype stand-ins belong only in disposable development views and must be removed before publication. Casey is not assigned routine curation or QA; a direct rejection from Casey overrides an earlier agent acceptance and holds that artwork's release until corrected.

## People

For new painted movement studies, start with the [approved female side walk and run](PAINTED_MOVEMENT_REFERENCE.md) for the original pose and timing recipe. The [directional movement and equipment guide](PAINTED_DIRECTIONAL_EQUIPMENT.md) extends it to both characters, all eight headings, right-handed sword carry and comparative armor fitting. The tunic and sword-carry studies were accepted in local preview. Casey approved the full plate fit and frontal inventory drawings in preview. The east-facing outfit proof adds leather, ivory and indigo robes, and Tempered Steel for both bodies, with matching frontal dolls. Open them from any checkout using the [character handoff](../../character-studies/README.md).

The continuous fitted-model replacement is released at `0090c89`. Its earlier assembled-part prototype remains rejected. Shared body measurements drive painted clothing/armor, frontal paper dolls and the elevated game camera. The renderer and motion inputs are offline art tooling; the game displays 2D painted sprites. Source provenance and replay are recorded in the [pipeline guide](../../arttools/PAINTED_CHARACTERS.md).

- **Proportions and finish:** adult humans about seven heads tall, with natural shoulders, hands and feet. Use subdued painted pigment, readable contours, worn cloth, stitched leather, practical straps and controlled plate reflections. Keep the world camera, door/furniture dimensions and painted environmental style.
- **Painted bodies:** man and woman, each in average, muscular and heavy profiles. Tunic, robe, leather, mail and plate have separate fitted sources for all thirty combinations. Broad shoulders retain normal arm/hand lengths; heavy armor follows a broad torso.
- **Movement and actions:** eight native body/equipment headings retain left/right hands. Bake quiet 24-frame walk/run cycles, separate robe drape, seated poses, 12-frame one/two-hand swings/thrusts, bow, crossbow, cast, book, block, hit and fall. Maintain visible support/flight and stable skull size.
- **Heads and equipment:** 24 complete hair/face/beard styles, each in five world directions and one frontal paper-doll view; mirror only the head attachment. Keep existing style IDs, skin tones, hair colors and separately fitted headwear. Use measured palms for held equipment; inspect fingers, shields, long weapons and edge clipping on every profile.
- **Color:** semantic masks separate dyeable cloth, actual leather/metal material, skin and fixed fasteners/trim. An independent component mask permits fitted gloves/boots to follow their own materials. Preserve painted shading, stitches, worn edges and metallic highlights.
- **Portraits:** existing authored head-and-shoulders portraits remain warm and slightly stylised, facing the viewer against a soft tan background.

Publication status is tracked in [the painted character plan](plans/2026-11-26-painted-character-system.md); previous accepted source art remains intact. New-only prompts/corrections, raw source hashes and deterministic replay are documented in [the pipeline guide](../../arttools/PAINTED_CHARACTERS.md). No raw motion/model file or 3D renderer enters the game.

## Shared directional NPCs

Human services, teachers, rivals, Tamsin, residents, travellers and dojo fighters use the same painted fitting system. `NpcAppearance` retains stable skin/head/outfit recipes. `CharacterProfiles` assigns named builds/heights individually and uses explicit role profiles for other residents; no random or hashed body casting. These are art-direction decisions, independent of combat ability. Dialogue portraits and creature artwork retain their existing sources.

World frames compose lazily through bounded caches and generated ground/head/hand slots. Stationary staff turn toward the player. Human wandering may use diagonals when both cardinal clearances permit. Seated residents use an authored seated pose, and dojo mats sort behind fighters. Inspect native contact sheets plus actual 390×720 and desktop scenes; captured screenshots must be opened. Browser emulation cannot establish physical-iPhone approval.

## Creatures

- **Layout:** a 2×2 grid. Full body, three-quarter side view facing left. Realistic and painted in bright daylight colours. They can look dangerous but not gory or frightening.
- **Fallen versions** (N) sit in the same grid positions as their living sheet. **Walk sheets** (Q) are optional.
- **Size:** packing makes every creature fill the same cell, so size is set in code (`MSC` in scene_a.js, where 1 = a grown man). A new creature needs a scale entry, judged against real life and kept readable on a phone:

  | Creature | Scale |
  |---|---|
  | rat, rabbit, hare | 0.3 |
  | gull, crab, moth | 0.35–0.4 |
  | fox, beetle | 0.4–0.5 |
  | wolf, boar, sheep | 0.5–0.6 |
  | deer | 0.8 |
  | people | 0.83 |
  | golems | 1.1–1.2 |
  | giants, wyvern, dragon | 1.4–1.6 (capped, to limit upscaling blur) |

  Examiners (bosses) use their own larger sheet.

## Buildings, homes, places

- **Buildings (C, X banks, DX dojos):** each building stands alone with no yard, fence or path. The roof and the front wall with its door both show. Each town has its own materials:
  - Tallyport: timber frames, cream plaster and clay tile roofs by the harbour
  - Brackwater: stilt houses
  - Haverly: golden sandstone
  - Four Fords: red brick and thatch
  - Cinderwick: black basalt and copper
  - Kell: cave stone with blue crystal lanterns
  - Highwatch: grey stone under snow
  - Aldermoot: white marble, columns and bronze domes
- **Legacy player homes (Y):** walls are pale off-white and roofs mid grey for repainting. New modular owned facades apply material-specific surface tinting to regional components, retaining grain, relief and separate door/window detail.
- **Mountain ranges (U):** a whole massif filling a wide image. Its foot thins out to nothing so it can sit on any ground. No sky, no ground.
- **Ground textures (V):** seamless and tileable, seen from directly above, no single large feature, even light. The left edge matches the right and the top matches the bottom.
- **Interiors (DI and the like):** the floor fills the picture and the back wall is a band across the top fifth, with a doorway in the middle of the bottom edge. They're empty, because the game places people and props.

## Items, icons, interface

- **Item icons (H, HI):** 4×4 grids, painted, fully transparent around each icon. Weapons and armour come in four grades: plain iron, polished steel, blue-silver, gold-trimmed.
- **Menu interface (UI, UJ, UK):** frames, buttons and panels seen straight on, flat, with no perspective or text. Clean crisp edges, in the same bright fantasy style. The skin is parchment windows, oak and leather buttons, wax-seal close buttons, and a scroll speech box with a medallion portrait. The fonts are Cinzel for titles, IM Fell English for speech, and Alegreya Sans for body text.
- **Story and title art (J, DJ, I backdrops):** wide, hand-painted, bright and inviting. Battle backdrops keep the lower third as open ground.

**Town names in prompts:** `art_prompts.json` still uses the old town names in some bank and dojo prompts. The pictures carry no text, so nothing needs redoing. Ask Casey before changing those names in the prompt master; packing does not change prompts.

## Spell effects

`src/effects.js` draws compact canvas cast rings, projectiles and impacts for the eight existing spell Circles. Their silhouettes are electricity, frost dart, sun beam, branching lightning, flame, crystal shards, swirling snow and orbiting fragments; colours follow those materials. Rare pages add an outer ring and trailing sparks. Effects stay around the caster/target and avoid full-screen flashes. Existing packed art still supplies weapon strikes and green healing sparkles. This release adds no raster assets and does not change prompts, raw art, packing coordinates or accepted asset hashes.

## Generating art

### Whole-world vegetation kit (2026-11-25)

The [living-landscape plan](plans/2026-11-25-living-landscape.md) is released and verified at `3c80162`; exact evidence is in [release history](RELEASE_HISTORY.md#whole-world-living-landscape). Eight new transparent regional sheets supply eight tree silhouettes (two species, four ages) and eight undergrowth/debris pieces each. New-only prompts live in `arttools/landscape_prompts.json`; `arttools/landscape_art.py` records source hashes/crops, removes transparent matte fringe, derives ground-contact anchors from opaque base pixels and packs independent `art/landscape/region-*.webp` atlases plus generated `src/artlandscape.js`. Existing packed artwork, master prompts and generation settings remain unchanged. Eight built-in image-generation calls supplied the kit; no CLI/API image run was used. Raw filenames remain intact in the local source archive. Managed orchard rows reuse the Four Fords apple silhouettes near suitable temperate farms; wild trees follow the ground biome.

### Cartography (2026-11-23)

Three new Sunburst/high transparent sheets keep their original CA01–03 names. CA01 contains sixteen map-shop fittings and blank direction-sign parts; CA02 contains the Grand Atlas table, case, closed table and portable furnishing icon; CA03 contains eight distinct regional wall charts and eight regional accessories. Root reviewed the raw contacts. Decorative chart artwork has no labels; the interactive map renders actual game geography and text.

`arttools/cartography_art.py` uses recorded source hashes/component crops from `arttools/cartography_art_inputs.json` and produces `game/src/artcartography.js` plus `game/art/cartography/{props,atlas,regional}.webp`. The 36 pieces total 146,968 packed bytes. Master prompts, generation script, model, quality and older sources/atlases are unchanged. The approved CA01 sample was inspected before CA02/03; no rerolls were needed.

Untouched originals, new-only prompts and usage receipts are archived under `C:/Users/caseys/source/SQL Game/kit/cartography_2026_11_23/`; `out/` is the replay input. A replay from that archive reproduced the three WebPs and generated JS exactly. New output is independently packed; the accepted manifest contains 525 files. Doors, awnings, medical fittings, stairs and storey joinery combine existing regional materials in code so their dimensions match structural tile masks.

Rebuild with pinned Pillow 12: `python -I arttools/cartography_art.py --raw-dir <archived-out-directory>`. Use `--out-dir` and `--js` for isolated replay. Never hand-edit generated atlas coordinates.

### Dungeon kit (2026-11-22)

Release `dungeon-rebuild-2026-11-22` adds an independent dungeon kit. Fifteen new raw sheets keep the original names DT01–08 (opaque 2×2 material sheets), DP01–03 (transparent 4×4 prop/barrier sheets) and DM01–04 (transparent 2×2 creature sheets). This isolated run uses `arttools/dungeon_prompts.json`, the same global style and a byte-identical copy of the existing `make_art.py`, with its model and high quality settings unchanged. Casey's full-rebuild request authorizes these new images; the master prompt file and all existing raw output remain untouched. The first terrain/prop/creature sheets were generated and visually inspected before the remaining run. All 15 succeeded.

The new packer `arttools/dungeon_art.py` reads recorded source hashes/crops from `arttools/dungeon_art_inputs.json`. It packs 32 material textures, 48 transparent props/barriers and 16 living creatures into `game/art/dun/kit.webp` (1024×1296), `game/art/dun/mobs.webp` (1024×156) and `game/art/dun/gates.webp` (1024×224), generating `game/src/artdungeon.js`. Materials use reviewed repeat crops and edge cross-fades; connected-component masks retain silhouettes crossing nominal cell boundaries. Props stay isolated, alpha is preserved, and sprite scales come from `Dungeons.species`. Existing atlases are not repacked. No additional walking/fallen sheets are claimed; creatures without fallen art use the existing rotated living-sprite fallback.

Original raw PNGs, the unchanged generation script and its new-only prompt file are archived in `C:\Users\caseys\source\SQL Game\dungeon_2026-11-22`; working copies remain in ignored `work/dungeon-art/out`. The separate directory avoids collisions with the older dojo DP sheets. Reproduce the accepted output in the pinned Pillow 12 environment:

```powershell
work/.venv-live/Scripts/python.exe -I arttools/dungeon_art.py work/dungeon-art/out
```

The dungeon release brought the accepted manifest to 514 files; the subsequent world release added eight atlases. `arttools/packed_manifest.json` is authoritative for the current asset inventory. The dungeon release's deterministic replay matched all three atlas hashes and the generated coordinates. All material, prop, barrier and creature contact sheets were opened and reviewed for that release. Dungeon materials repeat across rooms and use separate wall, liquid, bridge and decoration layers. Layout changes use tile data.

The local agent generates requested images directly with `C:\Users\caseys\source\SQL Game\kit\make_art.py`. There is no hand-off to another agent and Casey does not paste requests elsewhere. Raw output stays under `SQL Game`, with current PNGs in `kit/out/`. Running the art rebuild does not run this image script.

1. **Use the master prompt base:** `SQL Game/kit/art_prompts.json`. `art/base/art_prompts.json` is a read-only snapshot. The master currently has 74 sections; its style and first 51 sections match the snapshot. Preserve the additional sections and Casey's prompt fixes.
2. **Ask before changes:** do not change `art_prompts.json`, the image script's model or its quality settings without Casey's approval. Do not put API keys in files or chat.
3. **Test first:** make a small test kit before a full image run. Obtain Casey's explicit go-ahead before any paid full run. Fix pipeline problems in the pipeline; never regenerate existing art to hide a packing or slicing defect.
4. **Keep output names:** sections have an id, name, size, background, brief with an `{item}` slot, and items. Output names are `<ID><nn>[_q]`. Never rename output files or overwrite, move, edit or delete existing raw art during a rebuild.
5. **Legacy ZIPs:** extract each into its own new empty directory under ignored `work/`, never into SQL Game. Treat uploads as untrusted and run Python with `-I`. The current 22 ZIPs are inventoried under `work/extracted/`.

## Packing art into the game

**Where art lives:**

| Data | Location | Committed? |
|---|---|---|
| Master prompts, image script, raw PNGs | `C:\Users\caseys\source\SQL Game` (`kit/art_prompts.json`, `kit/make_art.py`, `kit/out/`) | No; read-only during rebuilds. |
| Prompt snapshot and recorded cuts | `art/base/art_prompts.json`, `art/sliced/manifest.json` | Yes; preserve both. |
| Pipeline and manifests | `arttools/` | Yes. |
| Extracted ZIPs, sliced pieces, logs and local environments | ignored `work/` | No. |
| Packed game art, fonts, music | `game/art/` | Yes. Fonts and `mu/` are left alone. |
| Built site art | `game/dist/art/`, published by GitHub Pages | No build output in git; copied by `node build.js` and deployed from `main`. |
| Playable artifact preview | Published `art/**` at live build `1795364400-6a70` | Separate from the repo; publish only when requested. |

From the repo root, run the pinned local Python environment:

```powershell
work/.venv-live/Scripts/python.exe -I arttools/build_art.py "C:\Users\caseys\source\SQL Game"
```

The entry point checks inputs and runs these stages in order:

1. **Slice:** replay all 499 recorded sheets from `art/sliced/manifest.json` into `work/sliced/`, preserving crop boxes, foot points, cells and per-piece cleanup. Backgrounds, ground textures, portraits and mountain ranges retain their existing whole-image handling. Supported new sheet IDs use detection.
2. **UI:** UI01-04, UJ01-02, UK01-02 into `game/art/ui/`.
3. **Main:** sliced sheets into characters, creatures, buildings, props, backgrounds and icons, plus `game/src/artdata.js`. The later 64-creature extension consumes 32 MW/ML/MR/MP and fallen MWD/MLD/MRD/MPD sheets and extends the creature atlases in their original decode/re-encode order.
4. **Dojo:** 61 DG/DS/DX/DP/DH/DI/DJ sheets into `game/art/dj/`, portraits, prizes, story art, and `game/src/artdojo.js`.
5. **Body:** 178 HW/HR/HA/HK/HP/HH/HF/HM/HX/HI sheets into `game/art/hb/`, equipment icons and `game/src/artbody.js`. Existing anchor, stride and hood-face processing stays in place.
6. **Kit:** KT02, KT04-06, KF01 and KW01 into `game/art/kit/k1.webp` and `game/src/artkit.js`.

Every required sheet is present. Recursive discovery prefers current `kit/out` over archived/test copies, excludes references and replaced files, and freezes the selected paths for the whole run. Current HW01 and HR01 match the full pass-12 archives; the old test ZIP has different versions. Input hashes and fonts/music hashes are checked after the build. Environment overrides remain supported; see `REBUILD_ART.md`.

**Baseline and validation:** use Pillow 12.0.0 and the versions in `arttools/requirements.txt`. `verify_art.py` lists exact matches, missing/extra files and hash differences. The accepted local output hashes and image dimensions live in `arttools/packed_manifest.json`; the old live manifest stays available for comparison. Require unchanged generated `art*.js`, dimensions consistent with original packer geometry, and a visual check of title, town, fight, bag, paper doll, dungeon, dojo and room at 390×720. There are no live reference image bytes, so do not claim measured live pixel differences. No raw image or generation setting is changed to settle an encoding difference.

**New art:** add the needed packer input and game hook, keep the new sections' numbering, and inspect contact sheets and phone screenshots before shipping. Check facing per row, scale against the hero, sprite alignment and leftover glow. Stand-in generators remain available for testing hooks before approved art arrives. Packing is local and does not require Casey to upload old raw art again.

## Music and sound effects

**Suno restoration (released `b0a4067`):** Casey prefers the original Suno music. All eight towns, Bilge Vaults, Sunken Sluice and regular battles use their previously shipped Suno sources. The other 17 Stable Audio themes/cues and all effects, including the quiet CC0 footsteps, remain in place. `restore_suno.py` recovers eight exact historical loops and prepares the three earliest songs from their original Git bytes, inside their former playback regions; no generation or service download is needed. Original model/prompt/song links for those earliest three are unavailable and are not invented. `soundtrack.json` owns the mixed-source inventory; `history/soundtrack-before-suno-2026-11-26.json` preserves the replaced catalog.

The Suno restoration is released and verified at `b0a4067`: 11 former Suno contexts retain their original music, alongside 17 Stable Audio themes/cues and the existing effects. See [release history](RELEASE_HISTORY.md#character-guidance-vendor-sales-and-restored-suno-music). The preceding complete classical music/effect batch is released and verified at `e6075e4`. The [batch plan](plans/2026-11-25-classical-audio-batch.md) and [release history](RELEASE_HISTORY.md#complete-classical-music-and-sound-effects) record exact source, Actions, hosted checks and limitations. The earlier [Stable Audio replacement](plans/2026-11-24-stable-audio-replacement.md) remains historical evidence.

- **Source:** the prepared soundtrack combines 11 restored Suno themes and 17 Stable Audio 3 themes/cues. Effect identities, origins and output hashes are authoritative in `arttools/music/effects.json`; they cover footsteps, doors, combat, eight spell cast/impact pairs, activities, creatures, environmental cues and feedback. Raw downloads, C2PA originals and private account/credit evidence stay under ignored `work/`. The classical batch retains exact generated prompts/source/archive/output hashes in its catalogs and `classical_batch_prompts.json`; earlier catalogs remain under `history/`.
- **Footstep refresh (released at `cb5546e`; [verification](RELEASE_HISTORY.md#new-player-onboarding-regional-sql-practice-and-subtle-footsteps)):** use 20 short CC0 single-contact samples: four each for stone, wood, soft soil, snow and sand. [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) supplies concrete/wood/grass/snow; [Fantozzi, sliced by qubodup](https://opengameart.org/content/fantozzis-footsteps-grasssand-stone), supplies sand. `prepare_footsteps.py` records exact original archive/source hashes, license and trims, and preserves every other sound. Samples peak at no more than -18 dBFS before playback; additional gains are grass .025, sand .07, snow .09, dirt .10, wood .18 and paving .25, followed by the existing effects bus. Grass shares the soft-ground samples at a much lower level. Snow applies to snowy ground, sand to sandy shores, and existing room, paving, quay, shingle and timber priorities remain. Most contacts last 0.09–0.21 seconds; sand retains a quiet grit release below the 1/3-second running-contact interval. Cold synthesis follows the same quiet hierarchy. Source/archive license notices are in `arttools/music/licenses/`; technical checks do not establish subjective realism.
- **Retained classical sound:** the Stable Audio tracks request lyrical violins, violas and cellos with flute, oboe, clarinet and bassoon, regional motifs and restrained phrasing beneath reading and play, without percussion, rock backbeat, voices or electronic instruments. The restored Suno recordings retain their original arrangements. Isolated effects request responsive attacks and complete short decays. These are production goals, not a claim that the agent heard or aesthetically approved the output.
- **Historical classical batch:** the released [batch plan](plans/2026-11-25-classical-audio-batch.md) expanded the Tallyport trial to every existing music/effect destination. That batch used the approved 76 BPM 3/4 Tallyport source and 26 qualifying 8/16-bar loops; the Suno restoration supersedes 11 of those entries. Victory/death remain resolving one-shot cues. Rejected music takes and a duplicate Sampler pad are retained locally, excluded from accepted sources.
- **Complete set:** eight town themes, eight dungeon themes, four shared wilderness themes, two combat themes, tavern, dojo, card room, title, victory and death. The first 26 repeat; victory/death play once. Venue themes now play in their actual contexts. With music muted, generated musical victory/death buffers can play on the effects bus; immediate synthesis remains the loading/failure fallback.
- **Preparation and provenance:** `prepare_stable_audio.py`, `restore_suno.py`, pinned requirements, `soundtrack.json`, `effects.json` and `test_soundtrack.py` define preparation and integrity. Retained Stable Audio and the three earliest Suno songs use measured 8/16-bar recurrence and a 200 ms seam blend; eight restored Suno loops preserve their historical selection and 400 ms blend. All music retains a copied decoder safety tail, constant-gain normalization near -18 LUFS and true-peak headroom. Beat/chroma recurrence is a heuristic; listening remains necessary to assess musical joins. Historical MIDI sources/tools remain editable; `history/soundtrack-2026-11-22.json` records the eight exact restored Suno selections and earlier MIDI work.
- **Output and levels:** music uses 44.1 kHz stereo 192 kb/s MP3 loops and PCM16 WAV cues under `game/art/mu/`. Effects use mono 22.05 kHz PCM16 WAV under `game/art/fx/`, with leading inactivity removed, brief onset/end fades, a short silent tail and per-role peak/RMS ceilings. Footsteps and UI remain quieter than combat; environmental cues are subdued. Downstream headroom cannot establish that saturation in a raw generated source is inaudible.
- **Browser behavior:** two music buffers plus a bounded effect LRU (24 entries/4 MiB), two effect loads, a 16-request effect queue and 12 simultaneous samples. A missed/cold sample responds immediately through synthesis, warms the cache and never replays the completed event later. Muting/hidden tabs stop effects and cancel requests; context changes stop old environmental samples. Audio settings remain device-local, independent of saves.
- **Verification:** re-decode actual files for music loudness/peak/seam/tail and effect timing/level/non-silence checks. Runtime/browser tests cover routes, sample playback, loading failures, bounded resources and independent persistent mute on phone Chromium, phone WebKit and desktop. Subjective listening, speaker balance and physical iPhone playback remain unverified.

## Modular buildings, regional interiors and working harbours

### Painted modular world architecture

Released and verified at `639f24e`; see the closed [rollout plan](plans/2026-11-25-world-architecture.md) and [release history](RELEASE_HISTORY.md#painted-modular-world-and-dungeon-architecture).

The approved modular finish now covers all eight regional families: Tallyport plaster/oak/clay, Brackwater weathered timber/reed, Haverly warm carved sandstone, Four Fords brick/oak/thatch, Cinderwick basalt/copper, Kell cave masonry/slate, Highwatch stone/timber/snow-edged slate and Aldermoot pale carved masonry/bronze. Shared geometry constructs walls, convex/recessed corners, directional eaves, roofs, fitted caps/terminals/valleys and matching upper storeys. Entrances use regional carved surrounds; no canopy covers their leaf. Picture signs combine painted regional framing with existing painted stock/furnishing images. Chimneys sample the roof height and overlap its painted lip.

Indoor storey stairs reuse the regional painted ascent/descent pieces, fitted proportionally within 32×32 and 34×24 logical bounds and anchored at their existing interaction points. Late source readiness replaces the fallback; travel, landing occupancy and saves remain unchanged.

Town/civic/dojo and landmark footprints use the shared layered renderer. Small countryside structures and owned homes flatten the same component renderer into cached facades; they do not substitute a whole-building illustration. Country facades participate in the existing 32 MiB building budget. Owned homes preserve material choice, recolouring, the L-shaped option and rounded tower silhouette; their existing logical footprint and legacy clearance policy remain authoritative. Authored civic plans and roles remain; their old fixed building illustrations are replaced by the shared regional roof construction.

All eight dungeon themes and 28 floors use painted wall faces, coping, returns, piers, joined display recesses and direction-specific stair artwork. The stair-support correction fits each painted ascent proportionally inside 44×44 logical pixels within a 48×48 supported wall recess, using the surrounding painted wall courses and coping at their existing scale. Its travel entity moves into the north perimeter wall with reciprocal dry landings; continuous backing occupies existing solid mass. Descents/surface hatches retain 50×34 proportional bounds, with at least 24 pixels of visible height in the accepted kit. One Highwatch corner cell becomes dry landing; existing routes, floor atlas pixels, gates and expedition rules remain. This correction is released at `359f497`; its stair-support plan records verification. Decorative surface-pad rock blocks were removed so the new entrance has a clear, honest apron. Wall props remain inside their supporting solid cells; near-wall recess shoulders fill their existing three-by-two-cell solid buffer.

Eight new built-in transparent component sheets supply sixteen authored pieces per region. Reproducible crops/derivatives produce the 224-piece kit in eight independent `art/architecture/region-*.webp` atlases and generated `src/artarchitecture.js`. The new-only prompts are `arttools/architecture_prompts.json`; source hashes, crop rectangles, aperture recipe and alpha cleanup are `arttools/architecture_inputs.json`. Existing master prompts, generation script/settings, raw art and older atlas coordinates are unchanged. A weathered valley strip reuses the approved pilot's preserved PNG. Original filenames and exact prompts are archived under `C:/Users/caseys/source/SQL Game/architecture_2026_11_25/`; replay with `python -I arttools/architecture_art.py --raw-dir <archive>/out` in the pinned art environment. Rebuilds validate inputs before replacing each output and never call image generation.

The accepted replay matched all eight atlases/generated metadata/manifest. All 590 older packed entries stayed unchanged. Exports have two-pixel transparent padding; alpha review uses light, dark, pink and green backgrounds. Opened phone/desktop captures cover every region and dungeon theme, plus owned house shapes, all door facings, upper-room stairs and native-resolution joins. Browser emulation does not establish physical-iPhone validation.

`arttools/world_art.py` packs 551 pieces from 56 source sheets into eight `game/art/world/*.webp` atlases (4,018,958 bytes) and generates `src/artworld.js`. Inputs: 20 new WF/WC/WR sheets plus 36 existing harbour, capital, market, coast, floor and furniture sheets. New WF01–08 are regional fronts; WC01–08 are coping, posts, corners, side-door frames and foundations; WR01–04 are clay, slate, thatch and copper roof fields, edges, ridges, hips and valleys. Each new sheet is a transparent 1024² 4×4 grid. Connected components are assigned by their nominal cell centre so shifted roof tips remain whole. Structural joins and placements come from code, independently of sprite alpha bounds.

`arttools/world_art_inputs.json` records every source hash, crop and component for replay. Rebuild with the pinned Python environment: `python -I arttools/world_art.py --new-dir <approved-new-output> --legacy-dir <original-kit-output>`. The normal command verifies the source receipt before writing; `--record` is only for accepting a reviewed new source set. Raw images remain local/read-only and no prior packed assets are replaced. Existing `kit_pack.py` remains for the original interior kit.

Casey approved up to $20 for this run. The two-image comparison and all 20 production sheets total an estimated $1.218326 from returned usage at public standard rates; this is not a settled invoice. Production retained `gpt-image-2.5-sunburst`, high quality, transparent 1024² settings. The comparison demonstrated a closed painted doorway in Mini; Sunburst produced usable transparent openings. Master prompts and original art settings were unchanged. The new raw sheets, prompts and usage receipts are also archived, without overwriting existing art, in `C:/Users/caseys/source/SQL Game/kit/world_modular_2026_11_22/` (`out/` is the replay input). Scratch reviews remain under ignored `work/building-cost-test-2026-11-22/`.

- **Packing (`arttools/kit_pack.py`):** `python3 -I arttools/kit_pack.py <raw dir> ...` writes `game/art/kit/k1.webp` (1024 wide, about 110 KB) and `src/artkit.js` (`ArtData.kit.k1`: name → hi-res rect). It holds Tallyport's textures, pre-scaled to game size (`t_floor` KT05 at 0.16, `t_flag` KT06 at 0.16, `t_wall` KT04 cropped 54–972 × 28–999 at 0.20, `t_stone` KT02 at 0.13), the KF01 furniture as `f_<name>` (0.33, hearth 0.36, rug 0.40, kegs 0.31, shelf and cupboard 0.30, bed 0.32) and the KW01 wall pieces as `w_<name>` (0.26). Pieces are cut by shape and grouped by 256 px grid cell. The names, in sheet order, are in the script. The new regional interior subset is packed into `art/world/interiors.webp` by `world_art.py`.

- **Interiors, towns 2–8 (generated 2026-11-22):** KI, 28 opaque textures, four per town in town order (inside wall, floor, second floor, wall top for low and side walls); KG, 7 furniture sheets, one per town, with the same 16 pieces in the same grid positions as KF01, restyled in the town's materials. The briefs ask for posts and beams to be cut through the middle at the image edges, to avoid the KT01 seam problem. Tallyport's interior uses KT04–06, KT02 for wall tops, and KF01.
- **Tallyport outside pieces (KT01, KT03, KP01):** kept for player houses and repairs; not needed for town buildings.
- **Interior wall pieces (KW, requested):** 8 sheets, one per town with Tallyport first, 16 pieces each in a fixed order: windows, a back-room doorway, wall lamp, banner, shelves, painting, pots, weapon rack, antlers, notice board, herbs, coat peg, curtain, candle shelf, mirror. They keep back walls from looking empty.
- **Harbour source set:** KH, 4 textures (quay paving and dock planks from above; sea wall and pier side seen straight on); KB, 2 ships at 1536×1024 (three-master, cog), side-on with the bow left, hull cut at the waterline; KD, one sheet of 16 dock props including a small fishing boat and a rowboat. The existing water, sand and pier-plank ground textures (V8, V14, V15, V19) and the D15 fishing props stay in use.
- **Capital and world source set:** KC, 4 landmarks at 1536×1024 (council palace, temple, lighthouse, city gate); KS, 6 sheets of 4 buildings (12 specialist shops, an inn, stables, warehouse, merchants' guildhall, a row of townhouses, and wall towers, a side gate and a guardhouse); KM, 2 sheets of market stalls and plaza pieces; KR, 1 sheet of shop fittings for shop interiors in any town; KX, 5 textures (city wall face, plaza paving, shingle, black volcanic sand, tidal rock); KQ, 1 sheet of coast and island props; and a ferry added to KB. Capital style: white marble and pale honey stone, bronze domes, blue-slate roofs, blue-and-gold cloth (fits Aldermoot). Existing marble paving and cobbles (V16, V7), volcanic rock (V13) and cliff ranges (U2) stay in use.
- **The run:** all of the above went out as one file (`brasswake_tileset_run.json`), 70 images: KI 28, KG 7, KW 8, KH 4, KB 3, KD 1, KC 4, KS 6, KM 2, KR 1, KX 5, KQ 1. All 70 came back on 2026-11-22. The PC agent moved the `out/KF01.png` reference from KG, KW and KR section refs to each item's refs, because the script reads section refs from the refs folder; the prompt text is unchanged.
- **Run results and how each odd one is used (no rerolls):**
  - Every transparent sheet has the right piece count, except KM02 and KQ01, which show 17: one cell on each holds a pair (potted cypresses, two palms). Cut pieces by grid cell, grouping shapes whose centres fall in the same cell. Faint haze below alpha 60 covers 1–12% of each sheet; clamp it as with KF01.
  - **Wall faces tile sideways only.** KI01 (moss low down), KI21 (panelling on the bottom third) and the other inside walls are drawn as one band, anchored to the floor line and repeated left to right, so a band low down is fine.
  - **KI04** (Brackwater wall top) came back as a plank wall face. Low and side walls show mostly their face from this camera, so it is used as is.
  - **KI28** (Aldermoot wall top) came back as walnut parquet with marble trim. Not used; Aldermoot's wall tops use the existing marble paving V16.
  - **KH01** (quay): rows 0–690 are the paving (cross-fade top to bottom like KT); rows 690–792 are a quay edge strip with mooring rings, laid along the waterline. The water below row 792 is dropped.
  - **KH03** (sea wall face): rows 0–741, anchored at the waterline, repeated sideways. The water band is dropped.
  - **KH04** (pier side): rows 0–167 are a pier edge strip, deck with pilings along it, laid along a pier's water-side edge. The rest is water and is dropped.

- **Textures (KT, opaque):** seamless and tileable, seen straight on: outside wall, wall base, roof, inside wall, two floors. The game draws walls, roofs and floors from them in code, so a building of any size needs no new image. Timber framing is asked for on a fixed grid (posts every quarter width) so it lines up when tiled.
- **Pieces (KP, transparent):** doors closed and open, windows, shop window with awning, chimney, steps, flower box, lantern, picture signs. Seen straight on, as if set in a front wall.
- **Furniture (KF, transparent):** tavern, shop, bank and home furniture, from the usual raised camera, sized against a grown man.
- **Assembly proof:** the approved modular production followed an opened phone/desktop construction proof with townhouse, side-entry warehouse and courtyard inn. Actual game verification covers phone Chromium, phone WebKit emulation and desktop; this is not a real iPhone check.
- **Style:** match the existing building art (`ref_buildings.png`). Casey rejected LPC pixel art and the cartoony hand-painted packs as off-style.
- **Tallyport source kit** (KT01–06, KP01, KF01): the interior subset is packed by `kit_pack.py`. Source-processing rules:
  - Textures don't wrap as delivered. KT01 has a timber post on both edges and KT04 wraps badly top to bottom. Fix: crop from mid-post to mid-post (KT01 x 22–1002, y 22–1005; KT04 x 54–972, y 28–999), then cross-fade 16 px (timber) or 48 px (stone, roof, floors) across each edge. After that all six tile without a visible seam.
  - KP and KF pieces don't sit on an even 4×4 grid, so cut them by connected shape (alpha ≥ 200), not by 256 px cells. Objects come back at alpha 250–254 with a faint haze below alpha 60 around them. Clamp the alpha to remove it.
  - Scales that looked right in a mock at 48 px per tile: wall texture 0.22, stone 0.13, roof 0.15, inside wall 0.20, floor 0.16, door 84 px tall, furniture about 0.3–0.36.

## Known art issues

- Pixel-art walks sometimes come back with little leg movement. The packer compensates.
- Mid-tone grips came back maroon once. The prompts now ask for natural brown.
- The largest mountain ranges are upscaled up to 2.7× on a phone.
- Cloak, glove and boot layers aren't drawn on the body yet.

## Marigold deck

The new-only `arttools/prologue_prompts.json` supplies one authorized built-in image_gen deck/hull image. People are absent from the bitmap: the game draws the customized player, Tamsin and crew using the established character layers. Sea, rescue rope, mast fittings and gangplank are runtime layers. `arttools/prologue_art_inputs.json` records source/output hashes and geometry; `arttools/prologue_art.py` crops only transparent exterior margin and packs `game/art/ship/deck.webp` plus `src/artship.js` in the pinned Pillow/WebP environment. Existing prompts, settings, raw images and older packed outputs are unchanged. Source replay and focused alpha/input checks passed. Actual 390x720 Chromium/WebKit, 1280x800 desktop and hosted rendering captures were opened and reviewed; release evidence is recorded in `RELEASE_HISTORY.md`.

## Living places and actor readability

Buildings and dungeon masonry use the regional component system above. Business picture signs retain their discovered-map symbols. Natural ground feathers through nested source-over texture masks. Constructed paving ends in fitted masonry courses with joined corners and restrained relief; dirt paths have compacted wear and irregular grassy shoulders without footprint stamps. Subdued smoke follows fitted chimneys. Dungeon props remain in supporting wall recesses, with low-contrast room-scale floor details; visible-only drips/ripples/motes preserve readability.

The earlier eight-pose painted sources remain immutable historical references. The painted candidate above supersedes the anatomical bake below; the latter remains an immutable historical source. Actor separation uses ground shadows and a very thin, low-opacity dark edge; Casey rejected the stronger early outline. Twelve-pixel overhead names follow rendered head/silhouette geometry. Real-iPhone visual approval remains external.

## Legacy anatomical human locomotion

The earlier `359f497` rebuild replaced the then-operating human walk/run poses with a new adult rig, opposing arm motion, anatomical leg recovery, a stable rigid skull and heel/sole/toe support. Each cycle has 64 poses. The ten body/outfit combinations have tailored tunic, articulated split robe, leather, mail and plate geometry, with coherent idle and action poses on the same body. Existing hair, beards, headwear, dye, skin and equipment recipes remain attached; facing-specific attachment widths stay fixed through gait changes. The large illustrated paperdoll retains its authored body/equipment art; the curated complete heads are described below. Dialogue portraits retain their existing authored art.

MakeHuman core mesh/rig assets are CC0; capture is from the CMU Graphics Lab database with NSF EIA-0196217 acknowledgment and its redistribution terms recorded in pinned source manifests and `game/art/human/LICENSE.txt`. No UO artwork, MakeHuman application code, paid generation or prompt/settings changes are included. This is a newly rendered UO-inspired character style. Original packed art remains unchanged. A CPU renderer runs offline, generating palette material/shade frames in ten new lossless WebP atlases plus source-generated coordinates/calibration. The game recolours cropped frames without rendering a 3D mesh. Replay uses locked game Playwright Chromium and Pillow 12.0.0:

```
python -I arttools/human_mesh.py --check
python -I arttools/human_motion.py --check
node arttools/human_sprites.js --check --python=<Pillow-12-python-executable>
```

The motion sample uses actual game-composed frames on moving ground at enlarged and game scale. Planted support is locked to the world, and free running soles clear the ground during flight. Assertions inspect physical support and actual visible sole pixels; a global lowest-pixel comparison across different projected foot lanes is not a valid height measurement. Publication is verified at `359f497`; physical-device and subjective human review remain external limitations in the grounded-cadence plan.

## Equipment, horses, complete heads and curated fittings

The verified `f8dc391` release retains the existing painted architecture, body/equipment sources and source-generated coordinates. Actual material selects its surface palette independently of rarity: neutral iron, cool steel, blue tempered steel, lavender Moonsteel and green Starsteel; brown/dark/grained woods; tanned, waxed, red-brown boiled, green laminated and violet riveted leather; wool, warm linen, silk, brocade and quilted silk. Source luminance, texture, highlights and alpha survive. Paperdoll masks preserve face/hands and collars; moving material-ID pixels recolour the actual clothing/armour surfaces. Weapon icons use their actual held shape, including axes rather than a generic sword. Tint caches are bounded.

`arttools/app_icon.py` deterministically authors the brass-bound ledger mark at 180, 192 and 512 pixels. Full-bleed opaque teal and inset book/emblem remain readable under phone masks. These are new assets rather than changes to an accepted art baseline.

One new built-in imagegen horse source supplies six consistent raised-camera bay-horse headings. `arttools/mount_art.py` and its input receipt derive the transparent directional/stride atlas and `src/artmount.js`; opposite headings mirror coherent source views. Actual-distance gait phases articulate hoof positions. The runtime composes the existing customized rider at the measured saddle, with foreground head overlap and a ground shadow. The original generated filename and exact prompt/hash are preserved; no existing prompts, models, quality settings or raw art are changed. WebP diagnostic viewers can expose hidden transparent RGB; actual alpha-composited PNG and browser captures are authoritative for silhouette review.

The stable and casino fittings use a new curated painted sheet, packed by `arttools/venue_fittings.py` into `art/venues/fittings.webp` and generated `src/artvenues.js`. Its source receipt and prompt record preserve the original filename, SHA-256, crops and game-size bounds. Stalls compose separate timber back/sides, horses and an open iron-hinged foreground gate in depth order; hay racks and troughs use matching materials. Painted poker, blackjack and wheel tables, stools, a runner and small service trays provide the finished venue furnishings. Other room accents reuse accepted painted regional rugs, chests, herbs and stairs. Required fittings preload with the scene; missing art stays pending rather than exposing a primitive fallback. Final in-scene replacement review and release evidence are tracked in the coordinated plan.

Casey requested complete generated paperdoll heads whose hair and beard are painted together. The final selection is a smaller curated set of complete styles for each body, with skin/hair colour choices retained and legacy appearances mapped to a close style. This replaces independent hair/beard selection in the paperdoll. Production follows a same-face proof, transparent isolated heads/neck, fixed skull landmarks, source receipts and reproducible packing. Headwear stays separately fitted. Existing tiny directional actors use matching curated hair/beard recipes and their calibrated attachments. The twenty-four selected heads are packed into two 1152×768 transparent atlases by `arttools/head_art.py`; `head_art_inputs.json` and `head_art_prompts.json` preserve exact source hashes, prompts, crops and skull landmarks, and `src/artheads.js` is generated. `HeadPortraits` uses bounded tinted complete-head canvases with one coherent face/hair/beard image; no beard or hairstyle bitmap is placed separately on the large paperdoll. The original generated horse/head filenames and receipts are archived in `C:/Users/caseys/source/SQL Game/brasswake_equipment_towns_2026_11_25/`. Replay with the pinned art environment and that directory as `--raw-dir`. Opened same-face, palette, full-body/collar, hat and material captures at 390×720 and 1280×800; source replays were byte-identical. Published source and verification evidence are in [release history](RELEASE_HISTORY.md#equipment-horses-and-lived-in-towns) and the closed coordinated plan.

## Decision log

- 2026-11-27 — Casey approved the full steel plate fit on both bodies and kept the painted characters in preview. The next proof keeps those proportions for leather, split linen and Tempered Steel. [Side proof and review assets](../../character-studies/outfit-material-study/README.md)

- 2026-11-27 — Casey accepted the two-body, eight-direction painted tunic cycles and right-handed sword carry. Reuse symmetric poses by phase and resolve the weapon hand after mirroring. The first complete outfit study uses individually painted plate poses and separate frontal paper dolls. [Method, scope and preview evidence](PAINTED_DIRECTIONAL_EQUIPMENT.md)

- 2026-11-27 — Casey approved the painted female side walk and run as a reference for future movement studies. Reuse the method of pairing a phase-by-phase motion guide with an approved character drawing, then review the loop at town scale. These two GIFs are local previews. [Production recipe](PAINTED_MOVEMENT_REFERENCE.md)

- 2026-11-26: Casey prefers the original Suno music, including battles. Restore its 11 former contexts, retaining the other 17 newer themes/cues and the existing effects/quiet footstep mix. Reuse existing source bytes and keep provenance and technical loop/level checks. Released and verified at `b0a4067`; release history owns exact evidence and limitations.

- 2026-11-26: Published the continuous fitted-body painted sprite pipeline with eight native equipment headings and true frontal paper dolls. Six profiles and every gear identity retain semantic material/dye masks; opened native and integrated phone/desktop captures after fit corrections. Release history records scope, provenance and device limits.

- 2026-11-26: Casey approved the corrected fitted-model walking/running pilot and authorized full wardrobe, combat, seating and paper-doll production through deployment. Every physical gear identity is included. Keep native eight-facing body/equipment banks, distinct fitted builds, a separately fitted frontal doll and dye/material masks. This supersedes the earlier pilot-only publication hold below.

- 2026-11-26: Casey requested one fitted body/plate model before expansion.
  Shared anatomy must survive both the face-on paper doll and elevated game
  camera. The local painted-surface pilot corrected atlas registration and
  shoulder coverage; gauntlets, rigid plate articulation and precise linen dye
  masks remain review work. The prior assembled-part set is visually rejected
  and unshipped. Keep all game publication held at this checkpoint.

- 2026-11-26: Casey selected a painted 2D finish after rejecting the earlier smooth 3D appearance, and authorized the complete wardrobe/head/action/paper-doll set through deployment. Fit all six profiles separately; retain environmental scale, restrained Mixamo-guided locomotion, independent robe drape, clothing dye and special-material surfaces. New-only built-in sources and corrections are archived with their native filenames and exact prompts; older accepted art/settings remain unchanged.

- 2026-11-26: Casey rejected the generated footsteps' texture and prominence. Use isolated CC0 footfalls and a subtle material-dependent mix: near-silent grass, soft dirt/sand/snow and slightly more audible wood/paving. Preserve contact timing and all non-footstep audio. Add dedicated sand/snow samples and terrain selection; keep original source/license provenance and archive the replaced footstep entries. Publication evidence belongs in release history.

- 2026-11-25: Released the curated complete-head/horse/venue fitting kit, material-derived finishes and Home Screen icon at `f8dc391`. Source/native and actual phone/desktop curation passed; source packing is reproducible and prior art records remain intact. [Release history](RELEASE_HISTORY.md#equipment-horses-and-lived-in-towns) records final CI/hosted evidence and physical-device limits.

- 2026-11-25: Casey rejected the candidate stable's crude horse-holder artwork. Require curated, style-matched finished art for recognizable world objects, including stable joinery and gaming furniture. Agent source/in-scene inspection at native, phone and desktop scales is a release gate; passing interaction tests cannot approve placeholder-quality visuals. Procedural logic/terrain/effects/UI remain appropriate without excusing uncurated physical-object stand-ins.

- 2026-11-25: Released the complete classical music/effect batch at `e6075e4`: all 28 music entries and 64 effects, with prior landscape/recovery preserved. Core, 63 selected CI browser cases, Pages and six hosted flows passed. Independent source/HTML and all 92 served audio hashes matched. The closed batch plan and release history retain exact evidence, prompts and subjective-listening/physical-device limits.

- 2026-11-25: Casey requested all music and SFX in one pass, expanding the unpublished single-town trial. Prepare one complete classical, percussion-free soundtrack plus isolated game effects with exact role mappings and existing credits only. Coordinate with the active scenery publisher and retain the exact-commit deployment gate; the batch plan records pending work and limits.

- 2026-11-25: Casey approved generating and deploying one Tallyport classical-music test after rejecting its rock-like drumming. Use the reviewed percussion-free strings/woodwinds prompt, one take and existing credits, prepare a metre-aware 3/4 loop, preserve the old provenance and every other asset, and verify through focused audio coverage and hosted checks. Publication status is recorded in release history after the exact-commit gate passes.

- 2026-11-25: Verified the whole-world living-landscape release at `3c80162` with core, all 495 browser cases and six CI hosted flows. Physical navigation, saves and gameplay RNG remain intact. Current descriptions now mark the vegetation kit as shipped; the plan and release history retain the exact hash, repaired fixture failures and hosted CDN availability limits.

- 2026-11-25: The living-landscape audit requires explicit ground-contact anchors derived from opaque base pixels. Preserve the visible root position through scale, mirror and wind transforms so asymmetric crowns remain aligned with existing collision. Packed images stay unchanged; the landscape plan tracks verification/publication.

- 2026-11-25: Casey authorized the entire living-landscape pass across all eight regions: diverse species/ages, undergrowth and ground integration, natural patches, signs of use, restrained movement and readable actors. Develop in an isolated worktree and wait for concurrent publishers; the living-landscape plan owns implementation and release evidence.

- 2026-11-25: Verified combined supported-stair/grounded-locomotion recovery at `359f497`: full CI, Pages and hosted checks passed. Current descriptions now reflect wall-supported ascents, relocated arrivals and the rebuilt gait. Release history records exact source/hash, prior repaired failures and the independent offline CDN 503 limitation; the landscape release is recorded separately.

- 2026-11-25: Casey rejected the freestanding dungeon ascent and authorized supported wall recesses, matching masonry and relocated interaction/arrival points. Every stair must show its support, direction and connection to another level. Inspect this spatial logic at real phone/desktop size; successful scale/alpha assertions do not approve it. The stair-support plan tracks implementation and release.

- 2026-11-25: Built the full human rig/wardrobe and captured walk/run rebuild, released at `359f497`. Keep old art immutable, add a reproducible offline bake and derive travel from the new stride at 132/180 steps/min. Physical flight and visible contact replace the timing-only head/flight patch as the operating solution.

- 2026-11-25: Casey expanded the grounded-cadence job to a full human locomotion rebuild: proportions, posture, arm/leg action, weight transfer and ground contact. Rebuilt pose motion determines stride and travel speed at target 132 walking / 180 running steps/min. The earlier timing-only prototype is locally verified but not the final visual solution. Prove one character on moving ground before broad outfit/direction integration; keep deployment isolated from the active town/dungeon rollout. See the expanded grounded-cadence plan.

- 2026-11-25: Casey wants footfalls equivalent to travel speed and permits slower movement. The preliminary cadence prototype retained painted stride lengths; Casey subsequently expanded the job to replace the entire operating gait. Original art, prompts, settings and earlier coordinates/assets remain unchanged; the released rebuild adds new generated art and calibration. Release status is in the grounded-cadence plan.

- 2026-11-25: Released painted modular architecture at `639f24e`: full 456-case CI, deployment and six CI hosted flows passed; independent source/hash and all six hosted flows passed. The closed rollout plan and release history record exact identity, visual review, repaired candidates, costs and device limits.

- 2026-11-25: Casey requires the same detailed finish standard for every visible game element, including code-drawn details and interface ornament. Check actual size, perspective, texture, lighting, connection and adult comparison before acceptance; modular construction does not justify flat filler.

- 2026-11-25: Casey approved the working modular pilot, removed entrance awnings because they block doors, and authorized the full-world/dungeon implementation through testing and deployment. Apply the same painted construction/scale standard to every regional part, use fitted visible door surrounds, and retain gameplay/save ownership. New regional components are isolated from existing raw art and generation settings; the full exact-commit release gate is required.

- 2026-11-24: Published character motion, intro/menu continuity and world presentation at `d3850c3`. Core, all 450 browser cases, deployment and six CI hosted flows passed; independent source/hash and all six public flows were verified. The closed polish plan and release history preserve the input-paced audio recheck, failed candidates and physical-device/subjective limits.

- 2026-11-24: Casey requested believable UO-inspired motion and natural transitions rather than another overlay-only size adjustment. Visually review one original character sample before broader coverage. Reuse original painted sources, calibrate their real head/foot pixels, restore flight, use connected roof volumes and blend material textures. No paid image generation, source art edits, prompt changes, generated-coordinate edits or art-baseline refresh. The completed polish plan records actual checks and verified release status.

- 2026-11-24: Published the verified Stable Audio replacement at `eb8f960`. All music/effect contexts, dedicated venue tracks, independent mute/fallbacks, cache revalidation and bounded sample playback are shipped, with the surface-respawn and complete-ring house-recovery repairs. The plan and release history preserve exact-commit CI, hosted hash/flow evidence and subjective-listening/physical-device limits.

- 2026-11-24: Casey lifted the audio implementation hold and requested thorough deployment. Replace every music entry with the captured Stable Audio sources and add all 64 prepared effect samples. Keep source originals/history, explicit prompt/hash provenance, conservative levels, contextual venue routing and immediate synthesis fallback. Technical preparation and browser checks do not establish subjective listening or real-device sound quality; release evidence is tracked in the replacement plan/history.

- 2026-11-24: Published the living-places/actor presentation in combined source `8602fa5`, verified by Actions 45434557202 and hosted checks. All 526 packed assets remain unchanged. Phone/desktop town, creation, name, building and dungeon captures were opened; physical iPhone Home Screen/audio/performance approval remains unavailable.

- 2026-11-24: Casey extended the browser source pass to game sound effects. Captured 64 raw sources: 52 individual effects and 12 footstep variations across stone, wood and soil. Separate opening/closing doors and spell cast/impact files have explicit destinations; support/UI alternatives await later selection. Local receipts retain single-effect prompts, original mapping, hashes and technical checks; exact footstep-pack prompt text was not retained. No subjective listening is claimed. Preparation, implementation and deployment remain on hold; the shipped audio is unchanged and this status update stays local.

- 2026-11-24: Casey authorized browser generation/download of the complete replacement music set using his existing credits, limited the current pass to music, and withheld implementation. Captured 28 Stable Audio WAV sources with a shared fantasy-game production brief, loop instructions for 26 themes and short one-shot victory/death prompts. Source files, exact submitted prompts, hashes and private credit evidence stay local; game assets/code and deployment are unchanged. Loop/mix preparation and subjective quality are not yet approved. Status documentation remains local under the hold.

- 2026-11-24: Casey requested a plan for browser-operated Stable Audio music and effects, replacing the existing Suno tracks as well as local MIDI for consistent production. Plan all 28 entries with explicit fantasy-game/loop prompts and a bounded one-month credit envelope. This is planned only; no purchase, generation or game deployment is authorized by the planning request.

- 2026-11-24: Casey authorized richer buildings/towns/dungeons and requested subtle actor visibility after reviewing an early outline. Reuse existing art and code-drawn architecture/effects; keep collision readable, avoid darkening dungeons to simulate depth, and preserve immutable generated assets. Full paid image runs still require separate approval. Candidate plan tracks verification/release.

- 2026-11-23: Casey authorized modular human NPCs using the hero body/animation system, varied skin/hair/facial hair/clothes/colors and occupational accessories. Release aec11c0 uses existing packed layers with bounded lazy composition; no paid art was generated. Eight directions, actual motion, skin/cloth isolation and dojo layering passed browser checks and phone/desktop visual review. Hosted captures were also opened; [release history](RELEASE_HISTORY.md#skills-attributes-and-directional-npcs) records deployment evidence.


- 2026-11-23: The three new cartography atlases shipped in verified source 17441a1. Durable-source replay, pinned art-tool checks, all packed hashes and actual phone/desktop/hosted visual inspection passed; the accepted originals, prior atlases and approved generation settings are preserved.

- 2026-11-23: Candidate `cartography-travel-and-grand-atlas` adds three approved new CA sheets and three independent atlases for map shops, regional charts, blank trail signs and the installed Grand Atlas. The existing Sunburst/high configuration, master prompts, originals and previous packed output are preserved. Raw and packed sheets were reviewed; durable-source receipt replay matches generated coordinates and all atlases exactly. Structural doors/stairs and fittings use fitted regional materials in code. No existing art was regenerated to fix layout defects.

- 2026-11-23: Context cleanup distinguishes the historical 514-file dungeon baseline from the current 522-file manifest, including eight world atlases. RELEASE_HISTORY.md preserves verified release identities; no art generation, packing or verification was rerun for this documentation correction.

- 2026-11-22: Candidate `story-first-day-2026-11-22` corrects held paper-doll equipment with renderer-owned, hand-inspected palm/grip/angle/scale metadata over existing atlases. Foreground finger curls overlap grips; shields/orbs/books use calibrated offhand poses. Both doll canvases wait for their own assets and reject stale appearance paints. All 20 weapons and five offhands across ten body/outfit figures receive composition tests and visual contact-sheet inspection. No raw/packed art, generated coordinate files, prompts or generation settings change; world-animation pivots remain unchanged.

- 2026-11-22: Release `dungeon-rebuild-2026-11-22` adds 15 approved dungeon source sheets and three separately packed atlases, with recorded input hashes/crops and generated coordinates. The existing script, model, quality, master prompts and old assets are unchanged. Full contacts were visually reviewed and replayed byte-for-byte. The dungeon atlases bring the packed baseline to 514 files.

- 2026-11-22: `soundtrack-2026-11-22`: Casey authorized using existing music and composing missing themes locally. Kept 11 Suno themes (3 existing, 8 downloaded), added 17 original editable MIDI scores and rendered all new assets locally. No additional exports or paid music generation.

- 2026-11-22: Release `magic-and-sound-2026-11-22` uses code-native canvas magic effects with distinct silhouettes for all eight spell Circles and rare variants. Existing sprite art is retained; no paid image generation, art-master change or asset-baseline update. Phone and desktop screenshots are part of release verification.

- 2026-11-22: GitHub Actions deploys only built game/dist from committed packed art. Raw images and slices remain local; CI checks the accepted packed manifest and never invokes the image script or raw-art rebuild.

- 2026-11-22: Accepted the rebuilt local packed-art baseline after all four generated coordinate JS files matched byte-for-byte and eight 390x720 views showed no missing art, obvious misalignment or wrong-facing rows. Of 486 asset files, 484 match the old live hashes; mobs.webp and icons.webp retain their original geometry and are accepted as encoding/library differences. No raw art, prompts, image script, model, quality setting, fonts or music changed.

- 2026-11-22: The local agent owns image generation with the existing script, local packing and these master docs. Raw art stays in SQL Game; packed output is committed in `game/art/`. A small test kit and Casey's approval before paid full runs remain required; prompts, model and quality settings require approval to change. Existing art is never regenerated to fix pipeline defects.

- 2026-11-22: Tallyport interior packed into `art/kit/k1.webp` by the new `kit_pack.py`; live in pass 29 (`1795364400-6a70`).
- 2026-11-22: Tile-set run (70 images) received. No rerolls: KI28 is replaced by the existing V16 marble paving, and KH01, KH03 and KH04 are cropped to the strips listed under the building kit. Wall-face textures tile sideways only and anchor to the floor or waterline.
- 2026-11-22: Capital, market, shop-fitting, coast and ferry art added to the single run (now 70 images), after Casey asked for an island world and a large capital port city.
- 2026-11-22: One art run requested for every planned tile set: interiors for towns 2–8 (KI, KG), interior wall pieces for all eight towns (KW), and the harbour (KH, KB, KD). Casey asked for a real port at Tallyport and for a single run.
- 2026-11-22: Kit used for interiors only; painted building outsides stay. Interior art requested for towns 2–8 as new sections KI (textures) and KG (furniture) so existing KT/KF numbering is untouched.
- 2026-11-22: Building kit planned (KT textures, KP pieces, KF furniture), generated in the current painted style. Casey rejected free LPC art and Daniel Thomas's hand-painted packs as off-style; Ultima Online's art is EA's and isometric. Tallyport's material line corrected to clay tile roofs, matching the shipped art and the C prompt.
- 2026-11-21: Two body types (a man and a woman) with layered hair, beards, head gear, outfits, dyes and weapons, in place of one sprite set per hero. Chosen by Casey to cut image count and look more like UO.
- 2026-11-21: Creature sizes are set in code (`MSC`), because the packed art is normalised.
- 2026-11-21: Rare dyes shimmer or glow, done in code over the cloth mask, so they need no new art.
- 2026-11-21: Towns renamed (see 02_GAMEPLAY.md). Prompts were left unchanged, per the rule against editing the prompt base without asking.
- 2026-11-21: Music comes from Suno, chosen by Casey (he has no recorded tracks, and Suno runs on his phone). First batch: Tallyport, the Bilge Vaults, combat.
- 2026-11-21: Paths are marked durable or session-only. New art goes into new atlases so the old ones never need repacking. The master prompt base is the copy on Casey's PC.
- 2026-11-22: Casey authorized modular exterior construction and up to $20 for autonomous production after the story deployment. Kept Sunburst/high settings; packed the 20-sheet run with existing regional interiors, capital and harbour art. Whole-component crop replay fixes shifted roof fragments without rerolls or changing raw art. The earlier interiors-only decision is superseded for settlement buildings.

- 2026-11-23: Boat-intro/writing candidate: Casey authorized necessary new intro graphics. Generate one empty Marigold hull/deck and integrate existing dynamic characters with reproducible new-only packing. Release status is tracked in the boat-intro plan.

- 2026-11-24: Published the verified boat-intro/writing release, source `d516ce1`. Current behavior is described above; exact commit, Actions, hosted hash and verification limits are recorded in `RELEASE_HISTORY.md` and the completed boat-intro plan.

- 2026-11-24: Final living-places visual review found arrival titles colliding with world stair labels. Use a brief opaque, width-fitted title plate below the persistent corner labels; retain the existing fade and scene interactions.

- 2026-11-25: Candidate uses material-derived painted finishes, a code-authored Home Screen ledger icon and a new-only built-in horse sheet. Casey replaced the independent large-paperdoll beard/hair approach with a smaller curated collection of complete generated heads to improve anatomical coherence and simplify selection. Preserve source identities and image-generation settings; track new sources and final release evidence in the coordinated plan.
