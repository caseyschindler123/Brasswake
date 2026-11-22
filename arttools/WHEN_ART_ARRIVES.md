# When the new images arrive (kit pass 5: 107 images)

1. Unzip the upload into its own new empty directory (untrusted archive; run Python on it with -I):
   `mkdir /home/claude/artin/zip2 && cd /home/claude/artin/zip2 && unzip <upload>`
   Ignore files in out/ whose names start with `_ref_`.
2. Put old and new PNGs side by side (the 87 originals are in /home/claude/artin/zip/out) and slice:
   `python3 -I /home/claude/arttools/slice.py <dir with all PNGs> /home/claude/art/sliced`
   Read the notes it prints: any sheet whose piece count differs from expected needs a look.
3. LOOK at these before packing (contact.py makes sheets):
   - D11, D12: pack.py's SCEN lists assume the pieces come out in prompt order. Fix the order there if not.
   - K, R, L, Q (4x4): rows must be toward, left, right, away. A sheet with rows in another order needs its own row map.
   - N: the four fallen creatures must be in the same quarters as their F sheet. N09 is the rat (piece 1 is used).
   - C17/C18: quarter n is the card room for town n (C17 towns 1-4, C18 towns 5-8).
   - B06: pieces 1-8 are used as the eight croupiers.
4. `python3 /home/claude/arttools/pack.py` (writes game/dist/art and game/src/artdata.js), then `node build.js` in game/.
5. Publish index.html AND every new or changed file under dist/art (folk.webp, atk.webp, mobwalk.webp, dead.webp, sc.webp, fx.webp,
   mobs.webp, chars.webp, icons.webp, b1..b8.webp, p/G12_*, p/G13_*, p/P*, bg/S0*.jpg, f/F11_*, f/F12_*, f/F13_*).
6. Game hooks already in place and tested with stand-in art (arttools/fake_new.py): walk sheets for folk and rivals (chars.walk),
   hero attacks (chars.atk), creature walk sheets (mobs.walk), fallen creatures (mobs.dead), card room building slot `casino`,
   croupier sprite and portrait (chars.croup, casino), regulars' faces (regs), table tops (tables), new icon names with fallbacks (IFB in game.js),
   effects (fx: row 0 slash, row 1 impact; rows 2-3 not wired yet), mountain and desert scenery (scen; placed in genWorld only when present).
   Partial deliveries are fine: each group switches on by itself.

## Pass 6 (T01-T08: heroes on the diagonals)
Slice the eight T sheets with the outline mode (third argument to slice.py, as for the second batch), merge into art/sliced and its manifest,
run pack.py (writes diag.webp, sets chars.diag), build, publish index.html + art/diag.webp. Rows must be down-left, down-right, up-left, up-right.
The game hook (heroArt in scene_b.js, P.dg) was tested with a stand-in sheet.

## Pass 7 notes (done 2026-11-20)
- Several zips are fine: extract each with `python3 -I` into one new empty folder, flat, PNGs only.
- `python3 -I slice.py <in> <out> new`, look at contact sheets of every group, then copy `<out>/*/` into `art/sliced/` and merge the manifests (keep a backup).
- U (ranges) are kept whole and trimmed; V (ground) are kept whole. A range whose glow reaches the frame is cleaned automatically; check it by eye.
- T (diagonal walks): check which way rows 2 and 3 face for each hero and update DFACE in pack.py.
- Trial pack first: `BW_OUT=/home/claude/game/dist_n/art/ BW_JS=/tmp/artdata_n.js BW_METHOD=4 python3 pack.py`, build with BW_DIST/BW_ART_JS, test, then the real `python3 pack.py` (about 5 minutes).
- Publish index.html plus only the art files whose sha256 changed (the packer is deterministic, so untouched atlases come out byte-identical).
