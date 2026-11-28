# Painted movement reference — female side walk and run

On 2026-11-27 Casey approved two in-place loops of the unarmed woman in a tan tunic, facing due right. Use them to judge the relaxed upright posture, true side view and cadence of future movement studies. Each GIF shows the same eight paintings enlarged and at town scale. This is a preview recipe. The [art master](03_ART_STYLE.md#people) tracks the released character system.

## 1. Prepare the two references

For the subsequent male and female studies, including all eight headings, mirrored stride phases, sword carry and the plate set, follow the [directional movement and equipment guide](PAINTED_DIRECTIONAL_EQUIPMENT.md).

| Input to the painter, in order | What it controlled | How it was made |
| --- | --- | --- |
| `side-guide.png` | Camera, joint positions, foot contacts and which arm and leg are nearest the viewer in each phase | Take the exact side row from each of the existing Mixamo Walk and Run pose sheets. Stack walk above run. |
| `../female-side-stance/approved-woman.png` | Height proportions, face, musculature, hair, clothing and painted finish | Crop the approved front study at `work/painted-female-fit/standard-height-front-study.png` to the woman. The crop was `(375, 52, 670, 851)`, giving 295 × 799 pixels. |

The source sheets came from the `athletic-human-motion` worktree. Its `arttools/painted_locomotion_preview/guides.cjs` sampled the Soldier model's native Walk and Run clips at phases 0/8 through 7/8. The clips last 31/30 s and 21/30 s respectively. The right-facing guide uses heading π/2 and the elevated orthographic world camera. This preserves the visible tops of the shoulders while the nose, chest and belt face along the street. The earlier single-pose female side study was a separate review artifact. The two images in the table were the complete input to this paint pass.

To reconstruct the guide, use the two 1536 × 1024 sheets in `work/painted-locomotion-preview/` in the motion worktree. The crop coordinates below use Pillow's exclusive right and lower bounds.

```python
board = Image.new("RGB", (1536, 520), "#efe8d8")
for row, gait in enumerate(("walk", "run")):
    sheet = Image.open(guide_dir / f"{gait}-pose-guide.png").convert("RGB")
    for i in range(8):
        left = i * 192 + 2
        pose = sheet.crop((left, 756, (i + 1) * 192 - 2, 1003))
        board.paste(pose, (left, row * 260 + 5))
```

## 2. Paint the entire cycle together

One built-in image-generation call took the two references in that order with a transparent background requested. It returned one 2172 × 724 RGBA sheet. Each cell is a complete painting of the woman. Both gaits share the same paint pass. The saved sheet fixes the exact artwork for replay. A fresh generation with the same prompt can produce different drawings.

**Verbatim generation prompt**

> Repaint the exact 16 full-body poses in the first reference image as a classic painterly 2D game sprite sheet. Replace that mannequin with the adult female character in reference two in every single pose: her lean athletic build, low brown ponytail, fitted light tan short-sleeved tunic, narrow dark belt, brown trousers and low brown boots. Image one is an exact stencil for where every shoulder, elbow, wrist, pelvis, knee, ankle and head goes in each cell and in which cells the near and far limbs exchange. Keep its slightly elevated orthographic SIDE camera, same body height in every cell. Character travels horizontally due right. Nose and chin in a readable right profile, belt buckle on the thin far right front edge, side seam facing camera, shoulder tops visible. Head high, relaxed neck, lifted chest. Match character and brushwork of second reference instead of the green tunic or the big hands of the mannequin. Use natural relaxed fingers. Simple restrained decisive painted shapes readable at tiny game size. One wide landscape sprite sheet, EXACTLY 2 ROWS OF 8 equally spaced ISOLATED figures across, aligned in columns with generous transparent gap between silhouettes, no grid/text/shadow. Top row is a complete continuous, relaxed but purposeful WALK cycle with loose arms; bottom row is one complete athletic easy RUN cycle with close bent elbows, recovery of the trailing heel and subtle flight. At column five opposite legs take over compared with column one, and the next frame after column eight is column one. One consistent individual, camera and clothing across all sixteen paintings, registered to a common hip axis per cell and common ground height per row, preserving natural vertical motion. All heads, hair, boots entire. Clean genuine transparent background.

## 3. Extract the figures without introducing a jolt

1. On the original RGBA sheet, label four-connected components where alpha is greater than 64. Keep components with a bounding-box height greater than 180 source pixels. The exporter required exactly 16. These thresholds apply to this sheet at its native resolution.
2. Sort by bounding-box top to separate the first eight from the last eight. Within each row, sort left to right. Crop each figure with two pixels of padding. Multiply its existing alpha by its component mask dilated twice. This retains its soft painted boundary while excluding neighboring pixels.
3. Measure one nominal figure height, the tallest unpadded bounding box across **both** rows. Use one fixed scale per display size for all 16 poses. The sheet cell width is `2172 / 8`. For each gait, use the median of the eight exclusive bounding-box bottoms as its ground reference.
4. For zero-based column `i`, calculate placement from the **original sheet**. Let `x0, y0` be the padded crop's top left. Set `dx = x0 - (i + 0.5) * cell_width` and `dy = y0 - row_ground`. For an anchor `(x, y)` and desired nominal height `h`, set `s = h / nominal_height`. Resize the crop with Lanczos to its width and height times `s`, rounded, then paste at `(round(x + dx*s), round(y + dy*s))` using its alpha.

Trimming is only for extraction. Centering each trimmed image independently would move the hips as the arms and legs change the silhouette. Snapping each lowest boot pixel to the floor would remove the lift during flight. In these GIFs the original painted offsets carry both motions through the loop.

## 4. Play the authored poses at the approved timing

The exporter read the delays from the earlier `female-average-walk.gif` and `female-average-run.gif` in the motion worktree's `work/painted-locomotion-preview/` folder. Each row covers one left and one right step. Frame 5 exchanges the lead limbs relative to frame 1. Frame 8 returns directly to frame 1. Playback uses discrete painted poses with no crossfade or synthesized in-betweens.

| Gait | GIF delay for frames 1–8, in milliseconds | Full loop | Approximate steps/min |
| --- | --- | --- | --- |
| Walk | 130, 130, 130, 130, 130, 130, 120, 130 | 1.03 s | 117 |
| Run | 90, 90, 80, 90, 90, 80, 90, 90 | 0.70 s | 171 |

Each preview is a 390 × 284 RGB canvas with background `#e8e1d2`. The enlarged figure has nominal height 148 px and anchor (195, 172). The town figure has nominal height 41 px and anchor (121, 258). Take the street from `work/town-fit-preview/town-e-route.webp`, crop (135, 109, 720, 250), resize to 390 × 94 with Lanczos and paste at (0, 190). Use Segoe UI for the gait label at (12, 9), size 15, color `#383229`, and “Town scale” at (12, 171), size 12, color `#514639`.

For each gait, arrange the eight composited RGB frames in a four-column, two-row contact sheet. Quantize that sheet to 256 colors, then quantize every frame against the same palette with dithering off. This keeps the tunic and street colors stable. Save with Pillow's `loop=0`, `disposal=1` and `optimize=False`, using the per-frame delays above. The exporter reopened each GIF and checked the frame count, size, infinite-loop flag and every delay. It also saved a contact-sheet thumbnail bounded to 800 × 294 for inspection.

## 5. Apply the method to another movement

- Pick the approved character drawing and a guide that shows the intended action from the exact game heading. For another action, choose phases around its contacts, passing poses and recovery. The eight evenly spaced phases and the timings above belong to these two gaits.
- Review the enlarged frames in order. Check the character against the approved drawing, follow the near hand and foot through the cycle, and inspect the transition from the last frame to the first. In side view, the nose and belt face right throughout. The crown and shoulder tops show the camera elevation without turning the chest toward the viewer.
- Watch the loop at its intended town height. Check whether foot contact, heel recovery, posture and arm swing still read at 41 px. These approved previews hold the character in place. For a traveling game animation, also check a planted foot against a fixed mark on the street at the intended movement speed. Other headings, outfits, weapons and actions need their own visual review.

## Where to find the approved originals

The following are local art-workspace paths. They are outside the tracked documentation. In the `painted-character-release` worktree, most files are in `work/simple-female-gaits/`. Use the saved sheet for an exact re-export with `export.py` (Python, NumPy, SciPy and Pillow). The script resolves its inputs relative to itself and to the sibling `athletic-human-motion` worktree described above. The generation archive basename is `exec-eb9742f5-a06a-411e-89c0-152a0aec5226.png`.

| File relative to `work/simple-female-gaits/` | SHA-256 |
| --- | --- |
| `side-guide.png` | `ae1e90acfffe16d8590d2a21a46eea218d5ec133d7c79b31117014e767e5664f` |
| `../female-side-stance/approved-woman.png` | `7b9ec550e1466d56c7e3c89d1447741d220381d4082b2c5862b1a19f7986736f` |
| `generation.txt` | `34ad9d799afe833f92a7f6e211293337eb43b87d03b9d0813e1e9c3a8def0a36` |
| `painted-gaits.png` | `e5a88c8cf4e3390101f310947774a4d3ca1ad41edbf374b00c0a8e062649bfc4` |
| `export.py` | `a96e1323ba00469c6124178365a63fdef8fb9d137e0d9f76d7791c491d6be669` |
| `walk.gif` | `473049529387dd4c03b569c31a61777e65d43f182c2b8f5cbd4b7cf91ccf5d09` |
| `run.gif` | `6df9cd218522b2678a000da7d1b233007628b5b6d4f3050ae99952f13d9d1eec` |
