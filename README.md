# Brasswake

Mobile SQL-learning RPG.

[Play Brasswake](https://caseyschindler123.github.io/Brasswake/) · [Deployment runs](https://github.com/caseyschindler123/Brasswake/actions/workflows/pages.yml)

- Build: from `game/`, `npm ci` then `npm run build` writes `game/dist/` (index.html, release.json, and art/).
- Test: `cd game && node test/test.js` prints ALL GOOD.
- Art: `game/art/` holds fonts, music and the packed art. The packed art is rebuilt from the raw art on Casey's PC; see `REBUILD_ART.md`.
- Context docs: `game/docs/` are the master copies of the project memory. `game/STYLE.md` mirrors `game/docs/04_WRITING_STYLE.md`.

## Automatic coding workflow

Codex reads root `AGENTS.md` automatically, classifies implementation tasks as
simple or complex, plans proportionally, develops, verifies, updates the docs,
commits, pushes, deploys, and checks the live release. Both classes deploy after
required checks pass without a skill invocation or routine approval. Discussion
and explicit requests to hold deployment take precedence. The main agent chooses
bounded subagent work and appropriate models only when the benefit warrants their
cost. See [`05_CODING_WORKFLOW.md`](game/docs/05_CODING_WORKFLOW.md).

From `game/`, run `npm ci`, then `npm run verify` before release. Verification
checks packed art, the engine/content, poker, casino, tooling, and the build.
Game changes select Playwright tests on phone Chromium/WebKit and desktop Chromium;
framework/documentation-only changes skip UI testing. On a new machine, use
`npm run test:install` when browser tests are needed (CI installs them automatically).
Use `npm run verify -- --ui` to request extra coverage. Review relevant generated
screenshots for player-facing changes. Reports stay in ignored folders; browser
emulation does not establish testing on a real iPhone.

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

Push to `main` to deploy. `.github/workflows/pages.yml` installs locked dependencies,
runs `npm run verify`, and publishes only `game/dist/` to GitHub Pages. The build
includes `release.json` with its source commit and HTML hash. After deployment,
CI verifies the exact live commit and HTML; game changes also get a browser check
of SQL, navigation, and saves. Pull requests validate without deploying. Reports
and any screenshots are retained as Actions artifacts for 14 days. Official
actions are pinned; no custom deployment secret is needed. Raw art and sliced
pieces stay on this PC.

The hosted game saves on its own browser origin. Use Hero → Save code / Load a
code to move a character from the artifact; Claude account sync is available
only in the artifact. Offline installation remains planned.
