# Painted characters in eight directions

The original [side walk and run recipe](PAINTED_MOVEMENT_REFERENCE.md) establishes the elevated camera, approved proportions and timing. This guide records the subsequent local previews through 2026-11-27. Casey accepted the paired tunic gaits and the sword-carry preview. The full plate wardrobe is available for review. The [art master](03_ART_STYLE.md#people) records the published game separately.

## Start with the movement and the character

Use the approved front drawing for identity, build and clothing. Use the motion guide for direction, perspective, limb order and foot contacts. The male and female fronts share a floor in the source drawing. In the paired preview their nominal town heights are 43 and 41 pixels, respectively. Keep each character's scale fixed across the stride so flight and weight transfer survive extraction.

Sample eight phases at 0/8 through 7/8. The elevated orthographic guide headings in radians are 0 for south, 0.68 for southeast, π/2 for east, π − 0.68 for northeast and π for north. South shows the face. North shows the back. Northeast shows the back and the rightward component of travel. The northwest mirror retains that rear view. The original Mixamo guide is an offline pose reference. The preview displays painted raster frames.

| Gait | Frame delays in milliseconds | Full stride |
| --- | --- | --- |
| Walk | 130, 130, 130, 130, 130, 130, 120, 130 | 1.03 s |
| Run | 90, 90, 80, 90, 90, 80, 90, 90 | 0.70 s |

## Store 64 poses per character and outfit

Each row in the following table counts one character across **both** gaits. The engine-independent mapping stores one pair per displayed frame, consisting of an atlas index and a horizontal flip flag.

| Heading to paint | Original poses | Playback rule |
| --- | ---: | --- |
| East | 16 | Eight walk and eight run phases |
| Southeast | 16 | Eight walk and eight run phases, showing the front quarter |
| Northeast | 16 | Eight walk and eight run phases, showing the rear quarter |
| South | 8 | Paint four walk and four run phases. For phases 4–7 mirror phases 0–3 |
| North | 8 | Use the same half-stride rule on separately painted rear poses |
| West, southwest, northwest | 0 | For phase `i`, read phase `(i + 4) % 8` from east, southeast or northeast respectively, then mirror |

One outfit gives 128 original cells and 256 displayed character/gait/heading/phase combinations. For the tunics, 48 cells already existed from the east walk/run and southeast run studies of both characters. The remaining 80 cells completed the atlas. The local atlas has 16 columns and eight rows of 176 × 176 pixels. In each cell the reference ground anchor is (88, 155). Within each character's 64 cells, the banks are east walk, east run, southeast run, south walk/run halves, north walk/run halves, southeast walk, northeast walk and northeast run. The first 64 cells hold the man.

Keep the phase when changing facing or outfit. The half-cycle offset prevents a mirrored turn from silently exchanging the supporting anatomical leg. Symmetric tunics make this reuse economical. A shoulder badge, side pouch or handed weapon needs an explicit side or separate artwork.

## Travel and foot contact

The east traveling proof places both characters on the same street crop with fixed scenery. Mark a point on the supporting forefoot in two groups of three successive contact frames, one group per boot. Record its position relative to the sheet cell and the elapsed time from the true GIF delays. Within each contact group, subtract the mean time and mean position. Fit one speed per actor and gait using `speed = -sum(t*x) / sum(t*t)` on the centered samples. The remaining horizontal displacement during each contact supplies a small per-phase travel correction. Interpolate the two unsampled phases and check that travel advances in every frame. Apply the correction only to the traveling actor's position. Keep the enlarged in-place paintings intact.

This test found several pixels of running-foot drift before correction. The eight-direction and wardrobe viewers show movement in place. Turning through those viewers checks facing and continuity. Verification of world travel in the published game is a separate task.

## Attach one longsword to the anatomical right hand

1. Measure both palms on each original cell. Save x, y and whether the palm is visible. A hidden palm still needs a position to drive a partly occluded blade. The tunic measurement boards use red for anatomical right and blue for left.
2. Resolve the body frame and flip first. With the unflipped body, read its right palm. With the flipped body, read its left palm and reflect x around the cell center using `cellWidth - x` in continuous canvas coordinates. The displayed grip is now anatomical right in both cases.
3. Read the game's `w1` longsword from the painted gear atlas. Use its recorded 0.86 m length and normalized hilt pivot (0.491, 0.84). The preview scales length to the character using a 1.8 m reference height. Apply the transform around the grip each frame. The side run supplied pitch samples of −42, −81, −91, −68, −29, −16, −20 and −27 degrees. The lower walking carry uses 5, −5, −14, −9, 8, 23, 30 and 23 degrees. Project the blade into each heading using the elevated camera. These are authored values for this longsword carry.
4. Composite the blade behind the body when the palm is hidden. West and northwest use the far-hand layer. Southwest and north also use phase-dependent occlusion. For a visible tunic hand, draw the small painted finger grip over the hilt. For plate, restore the painted gauntlet at the grip. Test east-to-west turns mid-stride and inspect back-facing frames where only part of the blade should emerge.

## Fit a complete plate set

Use the corresponding tunic poses as the first painting reference and the existing frontal plate study as the second. Change the outfit around the same actor. Preserve head, shoulder joint, wrist, knee and foot locations, limb overlap and camera. Ask for bare heads, both gloves closed, a breastplate, aligned shoulder caps, tassets, greaves and sabatons. The sword is a separate item. The original side pilot needed a second hand pass because several frames had open bare fingers. That corrected eight-frame male side run was reused for the full set.

The full plate study adds 120 movement paintings and reuses those eight. Six new motion sheets group the remaining poses by character and view. A seventh sheet contains both inventory figures. For packing, take the median ratio of matching tunic and plate silhouette heights over each sheet. Use that one scale for the sheet. In each phase, align the top of the head and the mean x of opaque pixels in its first seven rows with the registered tunic head. This lets shoulder and hip armor add width without moving the character's head when the outfit changes. Carry over the two palm landmarks, bring exposed pins inside the gauntlet silhouette, then inspect both color-coded hand boards. The far-side return swing has a lower blade angle in plate to keep the tip clear of the neck.

Draw inventory figures directly from the approved **frontal standing pair** and the plate reference. Preserve the shared floor and height difference. In the wardrobe viewer, switch between tunic and plate while paused, then inspect the same characters in the frontal paper-doll view. This build covers one fixed steel appearance. Additional materials, cloth dye masks, attacks, seating and in-game equipment behavior require their own passes.

## Replay and verification

The [character handoff](../../character-studies/README.md) is tracked on main and opens directly from a clone. The preview folders contain the saved paintings, inputs, scripts and prompt records. Exact replay uses the saved paintings. Generating again from the same prompts can yield different art.

| Folder under `character-studies/` | Contents |
| --- | --- |
| `simple-female-gaits/`, `paired-side-gaits/` | Original female loops, approved male side sheet, source timing, travel and three-quarter proof |
| `painted-equipment-proof/` | Female three-quarter run, original male plate side run, corrected gauntlets and sword fit |
| `eight-way-painted/` | Pose guides, prompts, `pack.py`, `tunics.webp`, `mapping.json` and directional viewer |
| `eight-way-carry/` | Both palm coordinates in `sockets.py`, projection and layering in `carry.js`, interactive and GIF reviews |
| `plate-set-study/` | `layout.py`, `prompts.txt`, saved sheets, registration in `pack.py`, local `wardrobe.html`, and browser checks in `check.cjs` |

To rebuild both atlases and all three viewers from a clone, run `python character-studies/rebuild.py`. For the plate browser check, install the game browser-test dependencies as described in the handoff and run `node character-studies/plate-set-study/check.cjs` from the repository root. Open the screenshots and inspect the front, side and rear views with the sword raised and lowered. The browser check exercises all 64 combinations of outfit, gait, heading and sword visibility with both characters on screen. It checks that switching controls while paused preserves phase and that both paper-doll images load. Phone-size Chromium and desktop Chromium were checked. The run and walk GIFs each contain 64 frames, one stride per heading.

| Local reference | SHA-256 |
| --- | --- |
| Tunic atlas | `108f19e50cf13f7eaacd82e6e5c0bbe9d7f023ea98eaaaaef4638a001a7ddffa` |
| Direction mapping and timing (tracked LF text) | `c5fe9c49852d0d418a77bbc36456413e391a68e69259018df8a3106b3a18ec0d` |
| Plate atlas | `945a0f93b837df2e36e8b1f9f0ada5594b9e1bf65e5281c24de4c01d3e00b187` |
| Frontal plate pair | `1547bf25b1c6a3cd183763bd86a9c686a974a2edcbcd6d8d59de301606478bd4` |
