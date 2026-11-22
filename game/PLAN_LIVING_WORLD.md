# Living world pass (user request 20 Nov 13:16) — plan and status

User asked for: big real mountains (not code-painted), natural trails/beaches/grass/water, a world that feels alive (more animals, monsters,
people, wanderers), private homes and farms, things to find, random side quests, special gear/food from random people, and FISHING as a skill
where SQL answers decide the catch and higher skill unlocks better treasure. Order he set: art zip first (sent: kit pass 7, 53 images,
/home/claude/art/kit7), then code all of it.

## Art in kit pass 7 (not yet made when this was written)
T01-08 hero diagonals (hook done) | U01-10 mountain ranges 1536x1024 | V01-19 seamless ground textures (order: meadow, lush, dry gold, marsh,
forest floor, trail, cobbles, beach, desert, snow, frozen, rock, volcanic, shallow water, deep water, marble, cave stone, ploughed, planks)
| C19-22 countryside buildings (C19 farmhouse, barn, windmill, cottage; C20 fishing shack, cabin, hermit hut, waystation; C21 watchtower,
ruin, shrine, stable; C22 adobe, snow lodge, stilt hut, miner shack) | D13 farm things, D14 places to find, D15 waterside, D16 camp
| F14 cow pig hen horse, F15 sheepdog duck crow donkey | B07 16 country people | G14-15 portraits (farmer, fisherwoman, hunter, hermit;
herbalist, pilgrim, tinker, miller) | H10 fish and catches, H11 country food and goods | M02 ripples, jumping fish, butterfly, bird.

## Code stages
A (no art needed): world gen additions with their own random stream (homesteads + owners + livestock, places to find, fishing spots,
  wanderers, stray creatures, more animal groups); errands (side quests); country vendors and food; fishing skill and screen.
B (art hooks + packer): ground textures in paintChunk with blended edges; mountain ranges as large props; countryside building atlas;
  new prop atlases; livestock, country people, portraits, icons, ambient effects. Test with stand-ins like arttools/fake_new.py.

## Status
(see bottom of file; append as stages finish)
- content for the living world added to quests.js (FOOD, SETTLE, HOMES, ROAMERS, FIRST, STOCK, PLACES, FISH, CASTS, FISHNEED, ERR, LOST)
- scene_b.js: tree spacing pass (m.fo keeps the old forest mask), living-world block in genWorld (m.sites; kinds home, stock, poi, fish), FB/XP fallbacks, place() nudge, ripple(), Scene.sites(). Host callbacks needed: homeRoles(r), roamRoles(r), settler(role), settlerName(hid, role), stockName(tpl), place(pk)
- game.js: live block (errands, countryStock, fishing FI), SH.home/stock/poi/fish, ACT eroffer..fileave, HOST homeRoles.., food in grant/bag, fishing skill added to RPG. State: S.food, S.er{a,d,n}, S.poi, S.fishd, S.fishlog, S.cs, S.known
- STAGE A PUBLISHED as version 1795210573-64c8 (pass 11). Tested: all four errand types taken and paid, country trade, wanderer song, place loot, four casts, map errand list; node test/test.js, p8.py, p9.py pass; 0 previously reachable tiles lost to new solids; 60 frames/s headless at town and farm. Map tab now lists open errands and shows dots (errand targets always; all sites of a region once a watchtower view marks it S.known).
- Not done in stage A: ambient birds/butterflies (waits for M02), rod/food/fish icons use stand-ins (IFB) until H10/H11.
- STAGE B next: slicer/packer + hooks for U, V, C19-22, D13-16, F14-15, B07, G14-15, H10-11, M02 with stand-in art.
- STAGE B PUBLISHED as version 1795218484-a3be (pass 12), with the real pass 7 art (53 images, arrived as three zips; sliced to /home/claude/art/sliced7, merged into art/sliced; manifest backup sliced/manifest.before7.json).
  - Ground: paintGround() in scene_b. m.gk = soft kind per tile, m.gc = paving/planks class, gclass(m, biome, kind) -> texture + tint. Mask at 4 px per tile, kind read with a small warp, biome with a large one, then a 7x7 neighbourhood vote; soft kinds layered in rank order; pale fringe at water; hard kinds square on top. Falls back to the old painter per chunk until textures load (ch.tx, ch.gv, gVer).
  - Ranges: m.ranges (641), largest-first on mountain tiles only, footprint 85% of image height; drawn y-sorted, smoothed, flipped at random. Sets by biome: snow U04, Emberhold U07, desert U08, Goldenfell U09/U08, foothills U10/U01/U03, small ones U10/U01/U03, rest U01-03, U05, U06. U02 came with a glow to the frame; slice.py removes it (flat + glow colour + joined to the empty part).
  - T sheets: rows 1 and 4 came out straight on; rows 2/3 face different ways per hero. pack.py DFACE table (by eye) + mirroring builds dl, dr, ul, ur.
  - Art-only props via deco() (own random stream): scarecrow, coop, haystack, fence, gate, fishrack, rowboat, lantern, tent, pot, bedroll, rug, crates, stool, banner, reeds, lilies, wetrock, buoy, driftwood, traps, ruinwall, sailboat.
  - Livestock s1..s8 in mobs.webp at their own sizes; country people 7.1-7.16 in chars.webp (chars.country), faces (AD.faces), icons H10/H11, fx2.webp (ripples, jumping fish, butterfly, bird). Butterflies and birds also have code-drawn stand-ins.
  - Tests on this build: test.js, p8.py, p9.py pass; errands x4, trade, places, cast pass; 0 reachable tiles lost, 0 sites cut off; 60 frames/s headless, worst gap 50 ms while scrolling over unpainted ground. Not tested on a phone.
  - Test builds against other art: BW_DIST=dist_x BW_ART_JS=/tmp/artdata_x.js node build.js; BW_DIST=... python3 test/dbg.py script.py. Stand-ins: arttools/fake7.py.
- Open: sailboats at the dock did not show in the one screenshot taken; ranges stored 1024 px wide are drawn up to 2.7x on a 3x phone for the three largest; mill/tower pieces and wheat/cabbage props are small next to the barn; tree variety (user will handle); deliver errands could show the parcel/letter icons.
- PASS 13 PUBLISHED as 1795222913-d45d. (1) Ground layers now cut with Path2D clips traced by marching squares over a blurred mask; no offscreen canvases or composite modes (iPhone showed only the base layer per chunk; cause not confirmed, WebKit test browser download is blocked here). paintChunk wraps paintGround in try/catch and falls back. Edge wander cut to about half a tile (A .22, B .1, vote radius 2). Dark rim around blocked mountain ground (GCL.mt). (2) Keyboard: kbPick() nearest key on letter rows, chips need inside hit and upper 55% within 350 ms of a letter; keys 45 px; S.klog key log (toggle in Tables sheet). (3) Combat: ROUNDS() 3, bosses 1; one free fix (F.fixed) then counts as wrong; Flee during rounds; answer shown open. (4) Fight panel: header with odds, Tables, Hint; hint 1 = -15 points, hint 2 (shape) = right counts as close (no extra -15); bosses hint 1 only; table+column chips merged into one row; tips only in First Circle; Tables sheet shows 12 rows. Other exercise screens unchanged. (5) Ranges sit wholly on blocked ground (621 now); countryside buildings scaled to footprint +0.7 tile; roof ground blocked up to ~1 tile below the picture top; Map tab switch "Show blocked ground" (S.showb, Scene.showBlocked).
- PASS 14 PUBLISHED as 1795230084-7ac6. Less text: HELP registry + coach(id) shows a one-sentence card once (S.seen), qm(id) puts a ? on that screen afterwards; notes close with their screen (unCoach). Old saves past the tutorial start with the basics marked seen. Fight choose: name + %; unusable Steal hidden. Prompt: task tip behind a small ? by the question. Win: one gain line, heal as floating number, Leave it / Loot. Loot window (lootOpen/lootParts/lootTake): picture grid, tap to take, Take all; leftovers stay on the body. Repeat conversations (S.tk) show first line + options at once. Guided start: three approach beats (BEATS) + skip link; HOST.guide() arrow (edge arrow when off-screen); S.g steps bag -> page -> fish -> done; Bag nav pulses; Tables and Loot pulse in the first fight. Tests updated for the beats (dbg.py, p8.py, p9.py).

## Pass 15 (published 1795242357-8397)
- Banks in every town, lairs (16), housing (10 shapes x 3 materials, paint, chest, bed, trophies, teleport pads from runes).
- Lost Ledger: src/deep.js. 9 tables (towns from Ilva's letter, one per dungeon vault keeper), 12 Great Truths graded by result, each gives a permanent gift. Ilva's letter via Odalys after first vault table; Ilva found in the Scriptorium vault (table 8); ending after t12 (go home / stay).
- Story rewrite to STYLE.md: TALK, opening beats, creatures, bosses, dungeons, journal, SAY, gossip, lessons, country voices, places, errands, rares.
- Art hooks for kit pass 8b + pass 9 (W, X, Y, F16-21, N12-17, Q42-57, D17-19, H12-15, G16-19, J04-11, Z01, O01, S04) tested with arttools/fake9.py stand-ins.
- Not yet: contract asks/hints/lesson bodies only lightly touched; bounty asks untouched (instructional already).

## Pass 16 (published 1795273022-84ec): menu skin
- Fonts bundled at art/fonts (Cinzel titles, IM Fell English speech, Alegreya Sans body; OFL).
- CSS skin at end of style.css: framed parchment windows, oak/leather buttons, scroll speech box with medallion portrait, bookmark tabs, wax-seal close, diamond option rows, parchment toasts/notes.
- Pass 10 art (UI01-04, UJ01-02, UK01-02): run `python3 -I arttools/ui_pack.py <raw png folder> <dist/art>` BEFORE pack.py; pack sets ArtData.ui and body.ui switches CSS to the painted pieces. Check frame1 slice (56 of 400px) against the real frame thickness.

## Pass 18 (published 1795290995-a3b7): pass 9 + 10 art live
- All 124 pass-9 and 136 pass-10 images reviewed and packed. Every hero's 8 directions checked by eye: all face the right way.
- H13/H14 came with a faint grey backdrop; alpha remapped (a-175)*255/70 before slicing.
- Stride measured from leg spread: WALK_CYC 1.8 tiles, RUN_CYC 2.6 tiles.
- Raw art kept in /home/claude/in9/out and /home/claude/in10/out; slices merged into art/sliced (backup manifest.before9.json).

## Pass 19
- Walk 2.2 and run 4.6 tiles/s; chase speeds scaled to match (flying 4.0, others 3.6, slow 1.9).
- Guided first day with Tamsin (step table GD in game.js, S.gd): walk, run, talk, Odalys's lesson, the gull, loot, bag, stall, page, bank, harbor tower (Map), pier cast (optional), the Bilge Vaults (one guardian, chest, keeper refused), the examiner's ring. Tabs unlock as the guide reaches them. Falls cost nothing until the bank step. Tap Tamsin to skip.
- Saves are version 5; version-4 saves start over.
- Curly quotes in all displayed text except code, SQL, tables and the editor.
- Odalys born 1951; she taught Ilva.
- Held for the dojo pass: Odalys's practice-dummy intro and its later payoff.

## Pass 20: dojos (art pass 11)
- dojo_pack.py packs DS fighter sheets (dj/fs.webp, 37 rows x 8 frames), DX exteriors (dj/dx.webp), DP props (dj/dp.webp), DI halls (dj/I1-8.jpg, 11x16 tiles), DG portraits (p/DGnn_q.webp), DH prizes/tokens (i/dz1-16.webp), DJ scenes (bg/DJ01-03.jpg); writes src/artdojo.js.
- Dojo building in every town, enterable hall (genHall), sparring students, watchable bouts, practice dummies, tournament (S.djb bracket, S.dj[r] champ/master/sorrel/met), duel panel (DU), prizes, tokens on the Hero tab, Sorrel's notes, master memories of Ilva.
- Odalys intro moved into the Tallyport dojo (guide step 'odalys'); payoff when a correct answer uses a CTE, a window and a join (S.odp).

## Pass 21: bodies and the paper doll (art pass 12)
- body_pack.py: 10 body+outfit atlases hb/C1-10 (22 rows: walk x5 dirs, run x5, swing/thrust/cast x3 facings, hit/fall), head anchors per frame, hand points for attacks, paperdoll figures hb/P1-10, hair/beard/head-gear views hb/hair.webp, weapons hb/wx.webp, icons i/hq1-32 (not used yet). Front/back walks get a leg stretch in packing so the stride shows.
- scene_b: dollSprite composes body (recoloured: off-white cloth -> dye, grey metal -> armour rarity), hair (grey -> hair colour), beard, head gear, weapon on the back and swung in attacks (scripted arcs), shield on the back. Mirrors for SW/W/NW. drawDoll draws the Hero-tab figure.
- game: S.app {body, hair, hc, beard, hat, wear, dye}; outfit from the armour name, metal from its rarity, weapon from WPN by kind and grade, glow for epic/legendary. Appearance sheet in the Hero tab. Old heroes map through LOOKAPP.
- Next: new slots (head, hands, feet, cloak, amulet), thief gloves, more weapon kinds as items, barber/dyer NPCs.

## Pass 22: gear slots, weapon kinds, rare dyes
- SLOTS now weapon, shield, head, armor, hands, feet, cloak, ring, charm, relic. GEAR names by grade; head items set the head gear shown (HATK); Thief's Gloves (30% of hands drops) carry Deftness (steal and hide bonus) and glint at the hand in attacks. Shield slot can roll a Glass Orb or Spellbook (learn bonus).
- Weapons get a kind (WV: 20 kinds over the four skills) shown on the body and in icons (hq*).
- SPECIAL dyes (S.dyeU): iridescent, pearl, ember/frost/witchlight/voidblack glows, cloth of gold. Found from creatures (1.5% + luck), dungeon guards 4%, keepers 30%, examiners 35%, vault chests 12%. Glow dyes can also colour the weapon glow. Shimmer and glow drawn live over the cloth mask (dollFx).

## Pass 23 (economy and pacing)
- Skill gain × max(.015, ((100-v)/60)^2.2), fractional gains roll for +0.1. 40→100 ≈ 420 correct answers at level. Correct-answer hit floor 60 → 35.
- Per-skill caps via power scrolls (105/110/115/120, need cap-5 first). Scroll of Study: 2× gain 30 min. Feather bed: +25% for 1 h.
- Death: unblessed, uninsured worn gear drops to the body (it.was restores the slot). Bless deed 1500 at bankers or rare drop; insurance 20% of shop price per fall from bank. Uniques always blessed. Recovered gold takes no gold bonus.
- Dojo masters teach any skill to 45 (10 + 1.5v per point). Appearance changes cost gold after the guide. House: extra chests (400×n, max 4), feather bed 900, garden 700, paint 40.
- Respawn: camps 150–300 s, lair guards 480, leaders 900, nodes 240. Looted corpses stay 90 s, unlooted 300 s.
- Creature draw scale table MSC in scene_a.js (1 = a grown man).
