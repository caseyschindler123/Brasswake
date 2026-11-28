# Side outfit and material proof

Open the [offline wardrobe](wardrobe.html) directly from a clone. Choose an outfit and gait. Pause and use **Next frame** to compare the same phase against Tunic or Steel plate. **Paper dolls** shows the separate frontal pair for the selected outfit.

[Side walk](side-walk.gif) · [Side run](side-run.gif) · [Frontal paper dolls](paper-dolls.png)

Both bodies move east. Each gait uses the eight authored paintings and original frame delays from [the direction mapping](../eight-way-painted/mapping.json). The GIFs show a fixed enlarged pair and two strides across the town crop at nominal heights of 43 and 41 pixels. Town travel reuses the approved tunic preview's speed and phase corrections. The GIFs end with a visible reset between takes. The offline wardrobe holds both scales in place for fit comparisons.

The leather coat uses rounded shoulder caps, buckles, worn stitched seams and short linen sleeves. The robe panels hang during the walk and lift and trail during the run. Ivory and indigo use separate shade ramps on the same linen paintings. The cloth mask uses location and pigment to preserve skin, belts and boots. Tempered Steel uses the palette from [the game's equipment rules](../../game/src/equipment_rules.js) on the existing plate frames and dolls. Tinting keeps the original plate alpha and registration. The material separation is tuned to these paintings for the preview.

[sources.json](sources.json) records the saved source filenames, inputs and generation prompts. [guides/](guides/) preserves the approved tunic poses used as paint references. The packer extracts complete silhouettes, fits each new movement sheet at a common scale, and aligns each phase to the corresponding tunic crown. It removes the pale matte on the male leather sheet before extraction. Frontal pairs preserve their own common scale and floor.

From the repository root, with the [character study dependencies](../requirements.txt) installed, rebuild using:

```sh
python character-studies/outfit-material-study/pack.py
```

The rebuild verifies GIF dimensions, the 16 frames in each loop and all authored delays. The viewer was opened directly from disk in Chromium at 390 × 720 and 1040 × 760. A focused check exercised both gaits, all six outfits, six paper-doll pairs, pause, resume and frame stepping. This is an unarmed side proof. Other headings and normal gameplay remain outside this review.
