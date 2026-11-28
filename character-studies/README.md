# Brasswake character handoff

**Open [the wardrobe](plate-set-study/wardrobe.html) in a browser after cloning Brasswake.** It is a self-contained offline file. Both characters appear enlarged and at town scale. Pause mid-stride, switch between tunic and plate, turn the sword on or off, change heading, or select Paper doll. GitHub's file page shows the HTML source. The GIFs and paper-doll still below can be viewed directly on GitHub.

[Plate walk](plate-set-study/plate-walk.gif) · [Plate run](plate-set-study/plate-run.gif) · [Plate paper dolls](plate-set-study/paper-doll-phone.png)

## Where the project stands

Casey approved the lean athletic male and female proportions, the paired tunic walk and run, all eight unarmed headings, and right-handed longsword carry. The male is taller and broader. The newest review build fits one complete steel plate set to each body and supplies two frontal inventory figures. Its check covers both outfits, both gaits, eight headings and sword on/off. The full plate set awaits Casey's visual review. The published game uses its existing character system.

For a new chat, start here and read the [directional movement and equipment guide](../game/docs/PAINTED_DIRECTIONAL_EQUIPMENT.md). The [original gait recipe](../game/docs/PAINTED_MOVEMENT_REFERENCE.md) records the first accepted motion and exact prompt. Preserve the approved silhouettes, timing, heading map and palm positions. The next decision is whether to accept the full plate fit at phone size. The saved robe, leather, seating and combat studies are references for extending this version. Special material colors and cloth dyes still need a pass on the new artwork.

| What to inspect | Starting files |
| --- | --- |
| Approved physiques and side travel | [Front pair](painted-female-fit/standard-height-front-study.png), [walk through town](paired-side-gaits/paired-walk.gif), [run through town](paired-side-gaits/paired-run.gif) |
| Eight unarmed directions | [Offline viewer](eight-way-painted/directions.html), [timing and frame map](eight-way-painted/mapping.json), [paint prompts](eight-way-painted/prompts.txt) |
| Sword placement | [Offline viewer](eight-way-carry/carry.html), [hand landmarks](eight-way-carry/sockets.py), [weapon projection and depth](eight-way-carry/carry.js) |
| Complete plate set | [Pack and register](plate-set-study/pack.py), [paint prompts](plate-set-study/prompts.txt), [male grip review](plate-set-study/man-grips.jpg), [female grip review](plate-set-study/woman-grips.jpg) |
| Earlier experiments | [Slash and thrust](earlier-studies/combat/attacks-local.html), [seating and action study](earlier-studies/seating-and-actions/full-motion.html), [older wardrobe with robe and leather](earlier-studies/wardrobe/painted-character-local.html) |

## Rebuild or extend

The ready-made viewers require only a browser. To repack after an art edit, run the following from the repository root in a Python environment. Python 3.12, NumPy 2.3.5 and Pillow 13.0.0 were used for the transfer.

```sh
python -m pip install -r character-studies/requirements.txt
python character-studies/rebuild.py
```

The rebuild reads the saved paintings, source pose guides, earlier hand cutouts, original town crop and the game's checked-in sword sprite. It packs the tunic atlas, measures both hands, builds the sword viewer, then registers the plate atlas and builds the wardrobe. The built-in image generator and a licensed motion model are unnecessary for replay. Original pose capture used a separate reference workspace. If available, its root can be passed to the optional capture script via `BRASSWAKE_MOTION_REFERENCE_ROOT`. The extracted guide images and timing clips are included in [motion-reference](motion-reference/).

For browser checks, run `npm ci` and `npm run test:install` from `game/`, then run these commands from the repository root.

```sh
node character-studies/eight-way-painted/qa.cjs
node character-studies/eight-way-carry/capture.cjs
node character-studies/plate-set-study/check.cjs
python character-studies/export-review-gifs.py
```

The checks write review screenshots and numbered frames beside the viewers. The GIF exporter checks frame count, dimensions and delays. Segoe UI supplies captions on Windows when available. Pillow supplies a fallback font on other systems. Browser rasterization and fonts can change review-image bytes across computers. The art guide records the approved atlas hashes for comparison.
