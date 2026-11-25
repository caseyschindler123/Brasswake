# Brasswake

Mobile SQL-learning RPG.

[Play Brasswake](https://caseyschindler123.github.io/Brasswake/) · [Deployment runs](https://github.com/caseyschindler123/Brasswake/actions/workflows/pages.yml)

- Build: from `game/`, `npm ci` then `npm run build` writes `game/dist/` (index.html, release.json, and art/).
- Test: `cd game && node test/test.js` prints ALL GOOD.
- Art: `game/art/` holds fonts, music and the packed art. The packed art is rebuilt from the raw art on Casey's PC; see `REBUILD_ART.md`.
- Context docs: `game/docs/` are the master copies of the project memory. `game/STYLE.md` mirrors `game/docs/04_WRITING_STYLE.md`.

## Automatic coding workflow

Codex reads root `AGENTS.md` automatically and defaults to simple for understood
work. Planning and checks follow actual risk. Game output deploys after required
checks; documentation and tooling-only changes do not publish unchanged output.
Discussion, planning-only work and deployment holds take precedence. The main
agent uses bounded delegation only when useful. Detailed current commands and
scope criteria live in [`05_CODING_WORKFLOW.md`](game/docs/05_CODING_WORKFLOW.md).

Current commands, from `game/`:

- Documentation/instructions: review wording/links and run `git diff --check`; no game build/tests/screenshots.
- Tooling: run affected automation checks; `npm run test:protocol` checks selection, real discovery and release guards. Runner changes can also need short browser execution.
- Game development: `npm run verify -- --defer-ui` runs selected core/build groups; `npm run test:ui -- --suites=<names>` runs a short canary plus affected suites. Exact-commit CI owns the current release gate, including all three profiles and full fallback for risky/unknown changes.
- `npm run verify` includes selected local UI; `npm run verify -- --ui` explicitly requests full coverage. `--defer-ui` does not skip core checks. `--suites=journeys` selects all four profession days; nightly/full and relevant risky selections retain them.

Install locked dependencies with `npm ci` only when needed. On a new machine use
`npm run test:install` when browser checks are required. Codex opens relevant
phone/desktop captures; Casey is not assigned routine QA. Browser emulation is
not a real-iPhone test.

**Implemented:** scope-based core/scenario selection, affected capture commands,
and a disposable developer playground for battles, gear, buildings and travel.
From game/, run npm run build then npm run dev and open
[the local playground](http://localhost:8781/__dev). Automation calls the same
Dev commands directly. See the [implementation plan](game/docs/plans/2026-11-25-scope-based-testing-and-dev-mode.md) and canonical workflow for safeguards and evidence.

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

Main pushes use `.github/workflows/pages.yml` to select checks and publication
from verified live changes. Markdown-only pushes skip it. Tooling/test-only
changes validate without publishing unchanged output. Actual game changes publish
`game/dist/` only after required checks, followed by exact hosted commit/HTML and
selected player-flow verification. The build writes `release.json` with source
commit and HTML hash. Pull requests and nightly/manual validation do not publish
by default. Reports/captures remain Actions artifacts for 14 days. Raw art and
sliced pieces are not published. See 05 for baseline guards and failure handling.

The hosted game saves on its own browser origin and supports portable backups
and an explicit offline download. Artifact-origin saves must be transferred
through the existing import/export controls; see the architecture's released
offline/save behavior and tracked release history.
