# Painted character replay

Status: the continuous fitted-model replacement is published at `0090c89`. The assembled-part implementation retained below is rejected historical tooling. Current publication and verification evidence belongs to `game/docs/plans/2026-11-26-painted-character-system.md`.

## Production fitted-model pipeline

`painted_release_profiles.py` derives six continuous male/female profiles from pinned MakeHuman source targets, keeping average anatomy and normal limb lengths. Refined shoulder/waist/depth shaping differentiates muscular and heavy builds. `painted_release_wardrobe.js` binds each clothing/armor surface to body triangles and defines complete glove, boot, cloak and Knight’s Plate identity catalogs. Registered painted projections preserve linen folds, leather seams/straps, mail and plate highlights. Source images, exact prompts, hashes and registration receipts are separate from immutable reference masks.

`painted_release_combat.cjs` samples the public KayKit Character Animations Free 1.1 GLBs (CC0); the retargeter preserves full-body performances and fits two-hand book/crossbow grips anatomically. Corrected source walk/run uses the accepted `painted_model_motion.js`. `painted_release_bake.cjs --refined --stage=refined --jobs=3 --python=<pinned Python>` generates 24-frame walk/run, 12-frame actions, static idle/seated, eight world headings, true frontal dolls and semantic material/component masks. Output stays under ignored `work/painted-release/refined/` until reviewed and copied. `painted_release_manifest.json` pins tracked inputs and all distributed images/metadata; never hand-edit generated coordinates. The new gear atlas has separate catalog/input/source receipts and a deterministic Pillow replay.

Runtime loads only baked 2D assets. Body/head/gear slots share measured root, skull, palms, forearms, collar, torso, waist and feet. Separate equipment surfaces are depth-occluded against the body before packing. Base plate and Knight’s Plate have distinct paint; fixed trim survives material coloring. Cloth remains dyeable, including cloaks and cloth headwear. Named body casting is explicit in `CharacterProfiles`, never randomized. Raw model and animation redistribution is not part of the game build.

## One fitted model pilot

`painted_model_mesh.py` derives one continuous adult male from the existing
hash-verified MakeHuman converter and three pinned CC0 morph targets. The new
`painted_model_mesh_sources.json` validates morphs, converter and mesh replay.
`painted_model_geometry.js` derives a separate plate surface with shared bones,
4–14 mm normal clearances and at most 35 mm of cuirass contour allowance. Cut
vertices bind to actual posed body triangles, avoiding interpolation drift.
This is a fitted surface pilot, not a finished rigid articulated armor asset.

`painted_model_pilot.js` uses one pose for both layers, a frontal paper-doll
camera and a 40-degree gameplay camera. `painted_model_inputs.json` preserves
two generated surface-paint atlases, prompts, references and hashes. Whole-panel
translation registers the plate painting to fixed camera landmarks; opaque
foreground texture padding avoids matte fringes. No independent anatomical or
equipment scaling is applied. Sources and references stay in the `model-pilot/`
subdirectory of the existing raw archive. The generated model and all preview
output stay in ignored `work/painted-characters/model-pilot/`.

`painted_model_motion.js` corrects the offline pilot's legs while retaining the
captured upper-body motion and cadence. A forward knee pole avoids the reversed
bend. Stance and swing meet continuously in world space; a periodic, smoothed
reach correction prevents sudden body-height changes. Sole pivots come from the
actual body/boot geometry. Published `human_locomotion.js` is unchanged. The
collar follows a lower front opening and higher shoulder/back coverage; shoulder
caps wrap inward over the chest/back overlap. Original high-precision neutral
UV registration remains independent of the corrected locomotion.

`painted_model_reference.cjs` checks the pinned Soldier GLB hash and extracts
actual animated neck/skull rotation deltas relative to the source bind pose.
The pilot applies those deltas to its own anatomical bind axes, preserving the
body's proportions and removing the previous fixed backward head bias. The
foot curves retain the source's mean ankle-to-hip balance in each gait; this
moves the running feet back by approximately 10 cm compared with revision two.
Torso lean, cadence and contact windows remain source-driven. Local source-model
stills and comparison metrics are in `source-motion/`; the supplementary raw
reference stays in ignored `source-upper-motion.js` and is never distributed.

Replay the isolated pilot with the pinned Pillow environment and game browser:

```
python -I -X utf8 arttools/painted_model_mesh.py
python -I -X utf8 arttools/painted_model_textures.py
node arttools/painted_motion.cjs "<archive>/motion-source"
node arttools/painted_model_reference.cjs
node arttools/painted_model_pilot.cjs --painted --bake
node --test arttools/test_painted_model.cjs arttools/test_painted_model_motion.cjs
python -I -X utf8 -m unittest discover -s arttools -p test_painted_model_colors.py
python -I -X utf8 arttools/painted_model_preview.py
```

The revision-three preview packer embeds all 24 walk/run poses, all eight headings,
the frontal pair and unchanged town artwork. Transparent margins are cropped
without resizing the native rendered pixels. The complete strike bake remains
available for offline fitting review. The packer also exports
24-frame GIFs whose cumulative timing preserves approximately 116/171 steps per
minute. Wrap the fragment with the visualization skill's `scripts/render.py`
as `preview-check-v3.html`, then run `node arttools/test_painted_model_preview.cjs`.
That checks real frame advance, pause, motion/direction controls, loading and
overflow at 390×720 Chromium/WebKit emulation and 1280×800 Chromium. Open its
captures; these checks do not substitute for visual acceptance or physical
iPhone testing.

The inline fragment is `fitted-plate-pilot-v3.html`. The first preview and
pre-correction output are preserved under `before-motion-collar-fix/` for review.
Revision-two motion/frontal output is also preserved in `before-source-alignment/`.
Sixteen focused model/motion checks cover body preservation, fitted attachment,
shaped collar coverage, finite full-cycle surfaces, forward knee bends, segment
lengths, continuous heel/toe transitions, grounded sole landmarks, actual source
neck/skull rotations, mean foot balance and preserved torso lean. Three
rendered-color checks cover material/dye isolation. Browser checks additionally
require 24 preview frames and visible pixels for both moving figures.

The plate shader retains semantic surface IDs; `plate-front-mask.png` records
R = material ID × 24 and G = dyeable arming cloth. A material/dye still checks
cooler steel and burgundy undercloth with unchanged face pixels. Precise linen
dye boundaries are **not production-ready**: the body-only color-mask experiment
showed jagged hems and was rejected. Gauntlet texture projection, rigid plate
articulation, held-weapon fitting and other bodies/outfits remain further work.
No production assets, build, game checks, main push or deployment are part of
this pilot. Movement cycles play in place over a background capture; actual
world travel, depth occlusion, seated furniture fit and foot locking in the game
have not been validated by this comparison.

## Earlier assembled-part prototype

Thirty separately fitted sources cover man/woman × average/muscular/heavy ×
tunic/robe/leather/mail/plate. Five source directions mirror into eight game
headings. Six head sheets supply 24 complete styles in six views. Existing art,
master prompts and generation settings remain intact.

Original PNG filenames, accepted references, correction inputs and exact prompts
are archived under `C:/Users/caseys/source/SQL Game/painted_characters_2026_11_26/`.
`painted_character_inputs.json`, `painted_head_inputs.json` and
`painted_references.json` record filenames and source hashes. Prompts are in the
corresponding prompt/correction files; each input's `promptAppend` records any
extra instruction used in that call. Raw images stay outside Git.

The local `motion-source/` archive preserves Soldier.glb and the Three.js r180
loader tree in its original relative layout. The pinned GLB hash is checked
before exporting. The generated joint file stays in ignored `work/`, because
standalone licensed motion is not a distribution asset. Replay needs the locked
game dependencies/browser and Pillow 12.0.0 from `requirements.txt`.

From the repository root:

```
node arttools/painted_motion.cjs "<archive>/motion-source"
node arttools/painted_sprites.cjs --check --python=<pinned-Python>
python -I arttools/painted_heads.py --check
python -I -m unittest discover -s arttools -p test_painted_art.py
```

Body checks may use `--id=8` for one complete wardrobe combination. Check mode
writes only to ignored replay directories, compares every generated file and
fitted coordinate, and never refreshes accepted hashes. Omit `--check` only to
produce an intentionally reviewed new bake. `painted_receipt.cjs` records source
code/input provenance after a reviewed bake; it refuses changed output bytes.
`painted_accept.cjs` adds only reviewed new files to the packed inventory and
refuses changes to any previous inventory entry.

`painted_parts.py` finds transparent row bands and column gaps so a broad piece
is retained whole. `painted_heads.py` preserves connected heads, including braid
tails that cross nominal grid gaps; source-edge clipping and touching pieces
remain errors. No packing step redraws source pixels.

The offline composer uses painted segments with explicit joint/root/sole slots.
Broad shoulders translate arms without changing their bone lengths. Robes have
an independent drape. Actions include one/two-hand swings and thrusts, bow, cast,
book, block, hit, fall and sitting. Source masks store finish ID × 24 in red and
independent hand/boot component ID × 24 in blue; alpha is coverage. Cloth dye,
leather, metal, skin and fixed trim stay separate. World atlases place masks below
their RGB frames; paper dolls place their mask below the 300×450 image. The game
recolours visible crops and can substitute fitted glove/boot pieces independently.

The legacy pilot/ref-strip/source-review tools are diagnostics, not production
bake inputs. No raw Mixamo/CMU/model download or live 3D renderer enters the build.
