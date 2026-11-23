# Brasswake: art style and art pipeline

Last updated: 2026-11-23. This covers image style, asset preparation, music sources and how they get into the game. Verified release identities and limitations are in [release history](RELEASE_HISTORY.md).

## The look in one paragraph

Bright, colourful medieval fantasy in clear daylight. Realistic proportions, nothing cartoonish, nothing grim. The world is seen top-down from a raised camera, from above and slightly in front, so roofs and front walls both show. It is not a diagonal isometric view. Characters, creatures and props are a detailed hand-painted pixel look. Portraits, story scenes and the paper-doll figure are hand-painted illustration. The reference point Casey keeps returning to is Ultima Online: humans who look like real people, gear you can see on the body, a world that feels lived in.

Every prompt starts with the global style line kept in `art_prompts.json`:

> Art for a 2D top-down fantasy role-playing game. Bright, colorful medieval fantasy in clear daylight. Realistic proportions, nothing cartoonish, nothing grim. No text, no borders, no watermarks, no drop shadows.

## Rules for every image

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

## People

- **Proportions:** adult humans about seven heads tall, with natural shoulders, hands and feet. Not chibi. Think of the hand-pixelled character sprites of late-1990s isometric RPGs.
- **Bodies (HB → HO → HN → HW/HR → HA → HK → HP):**
  - two base bodies, a man and a woman
  - five outfits each: tunic, robe, leather, mail, plate
  - turnarounds, walk and run in five directions (the rest are mirrored), attacks (swing, thrust, cast), hit and fall, and a large painted paper-doll figure
- **Layers drawn over the body:** hair (12 styles, 6 per body), beards (6), head gear (6), and weapons drawn side-on (HX). Each layer has six views: S, SE, E, NE, N, and a big S for the paper doll.
- **Townsfolk, dojo fighters, rivals:** the same pixel style and size as the hero.
- **Portraits:** head and shoulders, facing the viewer, face filling most of the cell, plain soft tan background. Painted, warm, slightly stylised, not photographic.

## Shared directional NPCs

The verified `skills-attributes-and-directional-npcs` release reuses the ten existing hero body/outfit combinations and hair/beard/head/equipment layers for human services, named teachers/rivals, Tamsin, residents, travellers and dojo fighters. `NpcAppearance` defines stable named recipes and deterministic regional/occupational extras. Clothing and skin transforms are separate; boots, leather, facial detail and alpha are preserved. Existing portraits remain authored images. Creatures retain their own sprites; Varrick and the Council use human layers.

NPCs compose visible frames lazily, sharing mirrored source directions through a 160-frame LRU; retired canvases survive the active drawing frame before release. Eight facing directions and moving strides use hero anchors; human wander steps can be diagonal when both adjacent cardinal cells are clear. Stationary staff turn toward the player. Dojo sparring uses the same layers, with flat mats sorted behind their occupants. No new image generation, packed-art edits, prompt/settings changes or baseline refresh was involved. Phone and desktop visual review passed; the closed release plan records the checks.

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
- **Player homes (Y):** walls painted pale off-white and roofs mid grey, because players repaint them.
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

## Music

- **Source:** the three existing Suno tracks and eight prepared Suno downloads (one take per new town plus the Sunken Sluice) remain in use. The other 17 themes are original locally authored Standard MIDI scores, rendered with an original deterministic additive/FM/plucked instrument synthesizer. No samples, SoundFonts, additional Suno exports or paid generation are needed. Editable scores live in `arttools/music/midi/`.
- **Sound:** restrained 1990s PC fantasy RPG ensembles: recorder/oboe/clarinet, plucked lute/harp, warm bowed strings, modest brass and acoustic percussion. Instrumental, steady dynamics and recurring A/B phrases; location themes leave room for reading and sound effects.
- **Suno prompt shape:** `1990s PC fantasy RPG <town|dungeon|battle> theme, General MIDI soundfont sound, <place and mood>, <lead and backing instruments>, <key>, <bpm>, <energy>, loopable, no fade out, instrumental`. Exclude vocals, choir, EDM, trap, electric guitar and modern drums; no artist or game names. Compare takes on Suno before any future export.
- **Complete set (28):** eight town themes, eight dungeon themes, four shared wilderness themes, two combat themes, tavern, dojo, card room, title, victory and death. The first 26 loop; victory/death are one-shot cues.
- **Rebuild and provenance:** `arttools/music/build_soundtrack.py`, its pinned local requirements, regression script and README define the pipeline. `soundtrack.json` records exact a/b timing, score or selected Suno song, source/output hashes, MIDI hash, sample rate, measured levels and seam quality. The original three MP3s remain unchanged. Raw downloads and intermediate WAVs stay local under ignored `work/`.
- **Output:** browser-compatible 44.1 kHz stereo MP3 loops and 16-bit PCM WAV one-shot cues under `game/art/mu/`, normalized around -18 LUFS with peak headroom. Loop files include a decoder safety tail copied from their start; Suno loops use a prepared crossfade. Playback metadata in `src/audio.js` must match the catalog. The accepted packed manifest includes audio files and is updated deliberately for these additions.
- **Testing:** re-decode actual output for loudness, peak, seam/tail and non-silence checks; validate MIDI determinism and note timing. Browser tests decode every shipped audio file, check loop bounds and tail length, exercise music transitions and persistent mute. Final speaker balance and real iPhone playback require device listening.

## Modular buildings, regional interiors and working harbours

Settlement buildings now assemble reusable structural pieces; distinctive palace/temple/gate/lighthouse silhouettes keep authored landmark art. Doors are actual openings and roofs are separate clipped layers. Existing small countryside landmarks, dojo halls and recolourable player houses retain painted assets.

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

## Decision log

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
