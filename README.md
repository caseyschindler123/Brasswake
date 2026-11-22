# Brasswake

Mobile SQL-learning RPG.

[Play Brasswake](https://caseyschindler123.github.io/Brasswake/) · [Deployment runs](https://github.com/caseyschindler123/Brasswake/actions/workflows/pages.yml)

- Build: `cd game && npm install sql.js && node build.js` writes `game/dist/` (index.html plus art/).
- Test: `cd game && node test/test.js` prints ALL GOOD.
- Art: `game/art/` holds fonts, music and the packed art. The packed art is rebuilt from the raw art on Casey's PC; see `REBUILD_ART.md`.
- Context docs: `game/docs/` are the master copies of the project memory. `game/STYLE.md` mirrors `game/docs/04_WRITING_STYLE.md`.

Rebuild the packed art from a read-only raw folder:

```powershell
python -m venv work/.venv
work/.venv/Scripts/python.exe -m pip install -r arttools/requirements.txt
work/.venv/Scripts/python.exe -I arttools/build_art.py "C:\Users\caseys\source\SQL Game"
work/.venv/Scripts/python.exe -I arttools/verify_art.py
```

On this PC the pinned build environment is `work/.venv-live/Scripts/python.exe`.
The build runs slice, UI, main (including the later creature extension), dojo,
body, and kit packs in order. It writes packed assets to `game/art/`, generated
coordinates to `game/src/`, and logs and sliced pieces to ignored `work/`.
Fonts and music are verified unchanged. No image generation runs.

See `arttools/rebuild_comparison.json` for the per-file comparison with live
build `1795364400-6a70`. `arttools/packed_manifest.json` records the accepted
local baseline, including dimensions; the verifier uses it by default.
`--manifest arttools/live_manifest_1795364400-6a70.json` selects the old live
reference. Decoded pixel comparisons require actual reference image bytes.

## GitHub Pages deployment

Push to `main` to deploy. `.github/workflows/pages.yml` verifies the 486-file
packed-art baseline, runs `npm ci` and `npm test`, builds with `npm run build`,
and publishes only `game/dist/` to GitHub Pages. Pull requests run the checks
without deploying. The workflow uses pinned official GitHub Actions and needs
no custom deployment secret. Raw art and sliced pieces stay on this PC.

The hosted game saves on its own browser origin. Use Hero → Save code / Load a
code to move a character from the artifact; Claude account sync is available
only in the artifact. Offline installation remains planned.
