# Hair and facial-hair proof

Open [the offline viewer](hair.html) directly from a clone. Swap **Swept crop** and **High knot** on both bodies. The third option shows the shared shaved base. The man can wear a short beard, a full beard, or be clean-shaven. Hair and beard have independent palettes. Choose tunic or plate, pause on a gait phase, and switch direction or open the frontal paper dolls.

[Side walk](walk.gif) · [Side run](run.gif) · [Frontal paper dolls](paper-dolls.png) · [Female face and proportion comparison](female-fit.png)

## How the layers fit

- [Approved head crops](guides/approved-head-guides.png) came from the current painted tunic atlas and the approved frontal standing pair. The clean scalp sheet is a fitted repaint of those references. The woman’s approved face is retained directly from the original paintings. Her replacement scalp and hair are fitted to the original head proportions, with the adjustable hair above the original face. The older standalone hair atlas served as a reference for layer construction and paint texture.
- Two hair styles share six original views across both bodies. Two beard styles have artwork for the visible front and side views and the direct frontal inventory view. Rear coverage follows the hidden jaw. The original eight-direction mapping supplies mirrored headings and stride timing.
- The gait bodies are prepared once per outfit. Head clearance leaves the torso and feet from the approved registered frames. Where the baked-in ponytail crosses a shoulder, the packer restores nearby paint or borrows the corresponding registered outfit and phase. One directional head anchor attaches the clean scalp, beard, and hair together. The frontal pair has its own neck fit. The packer checks the woman’s original facial features in both dolls, using each hairstyle and the shaved base.
- Hair and beard art are grayscale. The viewer maps shadows, midtones, and highlights independently using the selected palettes. The original alpha and drawn strands survive the remap. The viewer caches only a limited number of tinted parts.

[sources.json](sources.json) records the original image filenames, reference inputs and prompts. From the repository root, with the [character study requirements](../requirements.txt) installed:

```sh
python character-studies/hair-layer-study/pack.py
```

The GIFs hold the figures in place and show the nominal 43/41-pixel town scale below each enlarged pair. The offline viewer was checked at 390 × 720 and 1040 × 760 in Chromium. The check exercised 32 outfit, gait and heading states, paused frame changes, independent beard and hair changes, and the matching doll view. This is a visual fitting proof for two compact hairstyles. Longer loose hair, headwear, and gameplay integration are later work.
