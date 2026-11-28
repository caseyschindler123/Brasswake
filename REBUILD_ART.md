# Rebuild Brasswake art

The repository owns the game source, packed art, pipeline and master context docs in `game/docs/`. This released-game pipeline reads its raw art from an external source archive. The separately tracked [painted character studies](character-studies/README.md) include the authored sheets and offline wardrobe viewer for continuation on another computer. Existing art is never regenerated to fix a pipeline defect.

The commands below verify the art pipeline; they are not the complete release gate or a requirement for every cosmetic edit. Choose current release checks using [05_CODING_WORKFLOW.md](game/docs/05_CODING_WORKFLOW.md). Use the [scope-based implementation](game/docs/plans/2026-11-25-scope-based-testing-and-dev-mode.md) and canonical criteria. A coordinate/anchor change has broader risk than an isolated decorative recolor; retain affected integrity and opened captures.

## Run on this PC

From `C:\Users\caseys\source\Brasswake`:

```powershell
work/.venv-live/Scripts/python.exe -I arttools/build_art.py "C:\Users\caseys\source\SQL Game"
work/.venv-live/Scripts/python.exe -I arttools/test_arttools.py
work/.venv-live/Scripts/python.exe -I arttools/verify_art.py --manifest arttools/packed_manifest.json
cd game
node build.js
node test/test.js
```

The engine/content test must print `ALL GOOD`. For another PC, create a local Python 3 environment and install `arttools/requirements.txt`. Node and git are also required. Do not install tools system-wide without telling Casey first. The pinned image library is Pillow 12.0.0; Pillow 13 changes some resized image bytes.

## Inputs and outputs

| Data | Location |
|---|---|
| Raw master | `C:\Users\caseys\source\SQL Game`; current sheets in `kit/out/` |
| Master prompts and image script | `SQL Game/kit/art_prompts.json`, `SQL Game/kit/make_art.py` |
| Read-only prompt snapshot | `art/base/art_prompts.json` |
| Recorded cut metadata | `art/sliced/manifest.json` (499 sheets) |
| Working slices | ignored `work/sliced/` |
| Extracted legacy ZIPs | one new folder per ZIP under ignored `work/extracted/` |
| Packed output | committed `game/art/` |
| Generated coordinates | `game/src/artdata.js`, `artdojo.js`, `artbody.js`, `artkit.js` |
| Build logs and selected raw-input paths/hashes | ignored `work/build-art/` |
| Accepted local hashes and image dimensions | `arttools/packed_manifest.json` |
| Old live hash reference | `arttools/live_manifest_1795364400-6a70.json` |

`game/art/fonts/` and `game/art/mu/` are source assets. The pipeline does not process them and verifies their hashes after running. `node build.js` creates `game/dist/`, writes its HTML and copies all of `game/art/` into `game/dist/art/`.

## Pipeline

`build_art.py` checks all required sheets before starting. It searches recursively, prefers current `kit/out`, then `out`, and places test copies last. Reference and replaced files are excluded. The selected PNG paths are frozen in an index shared by every stage; no raw file is copied or modified.

1. `slice.py`: replay the manifest's boxes into working pieces, applying original alpha cleanup and C-sheet speck removal. Preserve recorded foot points, cell indices and other metadata. Whole backgrounds/ground, portrait quarters and mountain ranges keep their original handling. Mountain records contain final dimensions rather than crop boxes, so cleanup is repeated and its dimensions checked. Supported new IDs absent from the manifest use detection.
2. `ui_pack.py`: menu frames, buttons, ornaments and textures.
3. `pack.py`: main atlases, portraits, backdrops, ground, icons and coordinates. This includes the later 64-creature extension from `creature_manifest.json`: the original base atlases are decoded, extended and re-encoded in the original order, and the new coordinates are merged.
4. `dojo_pack.py`: dojo fighters, halls, objects, portraits, prizes and story art.
5. `body_pack.py`: bodies, hair, beards, head gear, weapons, equipment icons and paper-doll anchors. Existing stride and hood cleanup are retained.
6. `kit_pack.py`: Tallyport interior textures, furniture and wall pieces.

Required raw IDs are listed in `build_art.py` and returned by `required_inputs()`:

- Main slicing: all 499 IDs in the recorded manifest.
- UI: UI01-04, UJ01-02, UK01-02 (8).
- Dojo: DG01-09, DS01-37, DX01-02, DP01, DH01, DI01-08, DJ01-03 (61).
- Body: HW01-50, HR01-50, HA01-30, HK01-10, HP01-10, HH01-12, HF01-06, HM01-06, HX01-02, HI01-02 (178).
- Kit: KT02, KT04-06, KF01, KW01 (6); KT01/03 are present but not consumed.
- Later creatures: MW01-08, ML01-04, MR01-02, MP01-02 and fallen MWD01-08, MLD01-04, MRD01-02, MPD01-02 (32 sheets, 64 creatures). The historical manifest's fallen_sheet labels use MW01D, but the files and original extension tool use MWD01.

All required sheets are present in current `kit/out/`. HW01 and HR01 also have different older test copies; current loose sheets match the full pass-12 ZIPs.

Standalone slice usage keeps the original outline switch:

```powershell
python -I arttools/slice.py "<raw folder>" work/sliced new --manifest art/sliced/manifest.json
```

`BW_OUT`, `BW_SLICED`, `BW_JS`, `BW_DOJO_JS`, `BW_BODY_JS` and `BW_METHOD` remain supported; `BW_KIT_JS` and `BW_RAW` are available too. A standalone main pack needs `BW_RAW` pointing to the raw folder for the creature extension. Directory overrides need no trailing slash. Defaults resolve from the scripts' location, independently of the working directory. The entry point confines outputs to the repo and working slices to ignored `work/`.

## Validation and baseline

`verify_art.py` uses `packed_manifest.json` by default and lists exact, missing, extra and different files. Select the old live reference explicitly:

```powershell
python -I arttools/verify_art.py --manifest arttools/live_manifest_1795364400-6a70.json --report arttools/rebuild_comparison.json
```

For a rebuild of existing art, all four generated coordinate JS files must remain byte-identical to the pre-rebuild copies. Use saved hashes as well as `git diff -- game/src/art*.js`. Check image dimensions against the original packer geometry; a matching image hash also proves matching dimensions. Any missing art, changed coordinates or changed geometry is a pipeline defect to fix, without editing or regenerating raw images.

The old live manifest has hashes and byte sizes but no dimensions or image bytes. No direct live pixel difference can be measured from that alone. The accepted local manifest includes dimensions for future checks. `--reference-art <folder>` is supported when actual baseline images are available: reference hashes must match, then equal-size images are decoded to RGBA and the maximum channel difference (0-255), per-channel maxima and changed-pixel count are reported.

Serve and inspect the actual build at 390x720:

```powershell
python -I game/test/serve_art.py
```

Open `http://localhost:8779/__visual?scene=title`. Test scenes are `title`, `tallyport`, `fight`, `bag`, `paperdoll`, `dungeon`, `dojo`, `interior`. This test-only page uses a fresh disposable account on its dedicated localhost origin and supplies installed sql.js locally, as the legacy Playwright tests did. It is not included in `dist/`. Look at every screenshot for missing art, sprite alignment and wrong facing; inspect browser errors and `/__request_errors` too.

## Rules

- Raw art, master prompts and the image script are not changed by the rebuild. Never rename output files or commit raw art or sliced pieces.
- Keep `work/`, `node_modules/` and `game/dist/` ignored.
- New image requests use the existing image script directly. Start with a small test kit; obtain Casey's go-ahead before a paid full run. Ask before changing `art_prompts.json`, the script's model or quality settings.
- Do not start an image run to settle a packing mismatch. Never put API keys in files or chat.
- Commit intended files after affected validation and context updates. Main pushes use `.github/workflows/pages.yml`: Markdown-only changes skip it, tooling-only changes do not republish unchanged output, and changed game assets publish only after selected checks and publication guards pass. CI verifies committed art and never rebuilds it from raw inputs. See the [canonical workflow](game/docs/05_CODING_WORKFLOW.md#commit-ci-and-publication).
