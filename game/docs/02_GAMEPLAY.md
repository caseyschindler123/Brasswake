# Brasswake: gameplay reference

Last updated: 2026-11-22. This describes the integrated soundtrack and the dungeon rebuild candidate. The retained artifact preview is `1795364400-6a70`. This is the source of truth for rules, numbers and content. Code constants are named in `code` so they can be found. If you change a number in code, change it here in the same turn.

## 1. Premise and goals

- **The game in one line:** a single-player, top-down fantasy RPG in the spirit of Ultima Online, where every skilled action is an SQL query written on a phone. It teaches SQL from zero to window functions and writes. The game is the motivation; the queries are the work.
- **Design goals Casey has set:**
  - It should feel like UO: use-based skills, a long climb to Grandmaster, real farming and grinding, gold worth earning, gear you can lose, houses.
  - Optional side content is welcome. The main story stays focused.
  - Everything works one-handed on a phone.
- **Story** (full detail in 04_WRITING_STYLE.md):
  - You wash up at Tallyport and are entered in the Trials: eight Examiners, one per Circle, then the council's Audit.
  - Ilva Thorne, who came from the same sea, left journal pages and hunted the lost tables of the Ledger.
  - Odalys Brine teaches you the First Circle.
  - Tamsin guides your first day.
  - Sorrel Ashby runs the dojo circuit one town ahead.

## 2. Accounts and characters

- **Five slots** on one account (`NSLOT`). The first character made is the **main**. Every other character is **supporting**. If the main is deleted, the next new character becomes the main and the Trials start over.
- **Main only:**
  - Examiners (bosses) and their marks
  - Ilva's journal pages, Sorrel's notes, the masters' Ilva memories
  - the keepers' Lost Ledger scrolls, the Odalys intro and guide
  - the ending
- **Supporting characters:**
  - They can do everything else, exercises included.
  - They skip the opening story and guide, and arrive in Tallyport with the guide marked done.
- **Shared across the account:**
  - houses and their chests (the way to move gold and gear between characters)
  - the codex of named rares, so only one copy of each exists
  - first-time payouts: exercise gold and drops, Great Truth rewards, dojo champion and master prizes
- **Per character:**
  - skills, gear, bag, bank, pages, gold, dailies, errands, rumors
  - Banks are separate on purpose, to give a reason to own a house.
- **Switching characters:** Hero tab → Save → Switch character, which opens the select screen.

## 3. World

- **Size:** one 576 × 1008 tile map, 16 px per tile, with 8 regions running south to north. Each region has a town with:
  - guildhall, shop and stall, tavern, healer, bank, workbench, notice board
  - dojo, card room, registrar
  - a ring of stones holding the Examiner
  - a dungeon entrance

| # | Region | Circle teaches | Examiner | Dungeon |
|---|---|---|---|---|
| 1 | Tallyport (harbour) | SELECT, ORDER BY, LIMIT, DISTINCT | Varrick Stone | The Bilge Vaults |
| 2 | Brackwater (marsh) | WHERE, AND/OR, IN, BETWEEN, LIKE, NULL | The Marsh Wraith | The Sunken Sluice |
| 3 | Haverly (hills) | COUNT, SUM, AVG, GROUP BY, HAVING | The Fell Hydra | The Old Barrows |
| 4 | Four Fords (farmland) | JOIN, LEFT JOIN, anti-joins, self-joins | The River Kraken | The Tanglewarren |
| 5 | Cinderwick (forge) | CASE, COALESCE, text, dates, safe division | The Brass Warden | Slagdeep |
| 6 | Kell (caverns) | Subqueries, EXISTS, derived tables, CTEs | The Lich of Kell | The Crystal Vaults |
| 7 | Highwatch (snow) | OVER, PARTITION BY, RANK, LAG, running totals | The Frost Sphinx | The Ice Halls |
| 8 | Aldermoot (marble city) | INSERT, UPDATE, DELETE, CREATE, UNION | The Council | The Sealed Stacks |

- **Getting around:**
  - Nothing is locked by region; you can walk anywhere.
  - Walking speed is 2.2 tiles/s and running is 4.6 tiles/s.
  - Teleport runes turn into house pads.
- **Population:**
  - About 155 creatures per region in camps of 3–5, plus strays, 16 lairs in all (marauders, smugglers, bandits, the bog witch, giant leech and spider, frost giant, wyvern, red dragon, lich, skeleton archers), and animals.
  - The countryside has homesteads with livestock and people, places to find, fishing spots and wanderers.
  - **Regional wildlife** (`WILD` in quests.js, `host.wild`): each region has four wildlife creatures tagged by habitat (coast, water, open, forest). Every other animal spawn picks from the region's list for its habitat, in place of the common animals.
  - Lairs L6b, L7b, L8a and L8b have their own creature sets: the Troll Hollow, the Winter Den, the Brass Barracks and the Archive Wardens.
- **Respawn** (`respT`):
  - camps 150–300 s
  - lair guards 480 s
  - lair leaders 900 s
  - ore and herb nodes 240 s
- **Corpses:** unlooted ones stay 300 s and looted ones 90 s. Your own body lasts 10 minutes.
- **Creature size** (`MSC` in scene_a.js, 1 = a grown man): rodents and birds about 0.3–0.45, wolves 0.6, people 0.83 (normalised), golems 1.1–1.2, frost giant 1.5, dragon 1.6 (capped).

### Dungeons

Release `dungeon-rebuild-2026-11-22` replaces the shared four-room corridor with 28 stable, authored tile floors. `src/dungeons.js` owns room diagrams, named chambers, connections, crossings, territories and entity anchors. Every floor is 124×109 tiles, with 16–19 named spaces, 2,692–3,742 connected safe tiles and 26–32 ordinary creatures. The closed-door route from the entry to the next stairs or final keeper spans 201–315 cardinal steps. These are measured geometry counts, not measured playtime.

| Dungeon | Floors |
|---|---|
| Bilge Vaults | Rope Cellars; Flooded Stores; Drowned Court |
| Sunken Sluice | Gatehouse; Reed Channels; Root Reservoir |
| Old Barrows | Outer Tombs; Kings' Passage; Burial Court |
| Tanglewarren | Rootways; Silk Galleries; Wyrm Hollow |
| Slagdeep | Cooling Works; Foundry; Ventworks; Crucible |
| Crystal Vaults | Shard Caves; Resonant Galleries; Mirror Wells; Crystal Heart |
| Ice Halls | Lower Galleries; Frozen Cistern; Wind Passages; Winter Court |
| Sealed Stacks | Closed Reading Rooms; Record Stores; Restricted Wing; Old Archive |

- **Exploration:** floors have loops, optional branches, readable discoveries, hidden caches and controls that open shortcuts. Controls and secret-door props can be investigated nearby; their gates always have dry bypasses. Water, lava and hazardous crossings are blocked except for their walkable bridges. They do not inflict unavoidable damage. New textures and props distinguish flooded cellars, sluices, barrows, root tunnels, foundries, crystal caves, ice halls and archive rooms.
- **Navigation:** stairs connect reciprocal landings. The HUD labels the floor and current chamber; the corner map reveals nearby terrain as you walk. Map opens the explored current floor, discovered destinations with directions, floor names and seal progress. Ground taps more than three tiles away run inside these large dungeons; world movement retains its five-tile threshold.
- **Inhabitants:** two new species per dungeon (16 total) join four suitable existing species and the named keeper. Creatures roam their room territory; skirmishers attack on sight, while the keeper and other inhabitants can be approached deliberately. Ordinary creatures respawn after 5 minutes and floor lieutenants/keepers after 15 minutes, away from the player and clear of occupied spawn anchors. Keepers remain repeatable after their lost table has been collected. Static creature sprites use the existing rotated-sprite fallback when no separate fallen artwork exists.
- **Combat:** dungeon species use regional bounty templates for SQL, including valid template metadata for hunt errands. Skirmishers have 1.1× normal health, armored creatures 1.35×, casters 0.95× and brutes 1.6×. Armored creatures reduce non-spell damage by 20%; casters swing three times per round. Lieutenants use 1.8× health and elite rewards; keepers use 2.4×. Difficulty adds two points per floor; lieutenants/keepers use the elite difficulty, with another six points for keepers, capped at 100.
- **Vault:** defeat the lieutenant on each earlier floor to recover its seal, then defeat the final keeper. Those seals and keeper victory unlock the final chest. Seals, keeper unlock and reward claims reset on the next local calendar day. Each cache and final vault pays once per character per day. Vault rewards retain the existing named-rare pity system. A cache gives `10 × Circle + 8` gold, two materials and an uncommon-or-better item. The lost table remains a one-time main-character story reward after defeating the keeper.
- **Persistence:** mapped passages, opened shortcuts, read notes, kill/respawn times, unexpired corpse contents, seals and reward claims save per character and dungeon. Compact discovery bits keep fully explored maps for all five character slots within device storage; older discovery arrays are read and compacted automatically. Expired corpse records are removed while live loot remains. Reload and save-code import restore the floor and a safe position; leaving returns to the surface entrance. Dungeon deaths leave belongings at that surface entrance for the existing ten-minute recovery window. Characters, equipment and banks migrate from the previous save version.
- **First day:** the Bilge entrance has a separate cellar rat and starter chest during the guided visit. One guardian unlocks this nearby chest; the other floors remain available after the guide. Leaving and returning before claiming it preserves this step.

## 4. Characters, skills and paths

- **Paths:** each path sets the starting skills, weapon and pages.

| Path | Starting skills | Weapon | Pages |
|---|---|---|---|
| Warrior | swords 40, healing 30 | sword | a1 |
| Thief | stealing 40, hiding 30 | rapier | a1, h1 |
| Crafter | smith 40, carpentry 30 | sword | a1, c1 |
| Mage | magery 40, alchemy 30 | spell | s1 |

- **Skills:** 11 use-based skills: swordsmanship, fencing, archery, magery, stealing, hiding, blacksmithing, alchemy, carpentry, healing, fishing.
- **Caps:** a total cap of 400 (`CAP`) and 100 per skill.
- **Raising the cap:** power scrolls lift a single skill's cap to 105, 110, 115 or 120. Each step needs the step below it first.
- **Titles:** Neophyte 30, Novice 40, Apprentice 50, Journeyman 60, Expert 70, Adept 80, Master 90, Grandmaster 100, then 110+, Elder 115, Legendary 120.
- **Health:** 50 + total skill ÷ 8.
- **Skill gain** (`gain()`): it happens on use, scaled by answer quality (correct 1, close 0.6, partial 0.4, wrong 0).

  > 2.4 × max(0.2, 1 − |skill − difficulty| / 45) × (1.6 if skill < 30) × max(0.015, ((100 − skill)/60)^2.2), capped at 1, and 0.01 above 100
  >
  > × (1 + learn% / 100) × 2 while a Scroll of Study is active × 1.25 while well rested

  A fractional gain rolls for an extra +0.1.

  Fighting at your level, a skill reaches each mark after this many correct answers:

  | Skill | 60 | 70 | 80 | 90 | 100 |
  |---|---|---|---|---|---|
  | Correct answers | 13 | 27 | 57 | 163 | ~420 |

  The target is UO-like: fast to 50, slow from 70 to 90, a long grind to Grandmaster.
- **SQL techniques:** 13 of them (selection through scribing) are also tracked underneath and go "rusty" after 20 hours. Daily drills bring rusty ones back.

## 5. Combat

- **Difficulty of a target** (`diffOf`): (circle − 1) × 12 + 8, with +8 for elites and +14 for bosses. Circle 1 is 8 and circle 8 is 92.
- **Hit chance per swing** (`odds`): base = clamp(10, 95, 50 + 2 × (skill − difficulty)).
  - Correct answer: max(base, 35).
  - Close: base × 0.6.
  - Partial: base × 0.3–0.5.
  - Wrong: base × 0.05.
  - Hint 1 costs 15 points. With hint 2, a correct answer counts as close.
- **Rounds:** one query covers 3 rounds against monsters and 1 against bosses. Swings per round:
  - swords: 4
  - fencing: 5
  - archery: 4, plus a free opening round
  - magery: 4
  - A rare Arms page adds a swing; a rare Spell page removes one enemy swing.
- **Your damage per hit:**

  > (weapon base + skill/8) × page power × resist × (1 + weapon damage% / 100)

  - Weapon base: swords 9–13, fencing 6–10, archery 7–11, magery 8–12.
  - Page power: 1 + 0.12 × (page circle − 1).
  - Resist: 1 if the page's circle is at least the enemy's. Otherwise it drops 0.2 per circle short, down to 0.4. Fighting above your page circle is the real gate.
- **Enemy:**
  - Health: (30 + 6 × circle) × multiplier.
  - Swings: 2 per round, 3 for bosses.
  - Hit chance: clamp(20, 85, 50 + difficulty − skill).
  - Damage: 3–6 + 2 × circle (+2 for bosses) × (1 − defence%, capped at 60%).
- **Stealing:** one try at the stealing odds + deftness bonus. If caught you drop 5 × circle gold. Rivals fine you 10–15 × circle.
- **Paths without a weapon skill:** a crafter or thief fights poorly until they raise a weapon skill. Low skills climb quickly (about 10 fights to reach 30), and dojo lessons teach any skill to 45.

## 6. Death

- **Guided first day:** falls cost nothing until the bank step.
- **What drops:** your gold and bag stay on your body, along with **any worn item that is not blessed or insured**. Uniques are always blessed.
  - You wake at the town healer and have 10 minutes to get back. Dying again before that replaces the old body.
  - Recovered gear goes back into the slot it was worn in, and recovered gold takes no gold bonus.
- **Bless deed** (`BLESS_C` 1500 at any banker): blesses one item for good. Rare drops:
  - Examiner: 30% the first time, 8% after
  - elite: 1.5%
  - vault chest: 6%
  - every dojo master win
- **Insurance:** each insured item costs 20% of its shop price per fall, taken from the bank. If the bank can't pay, that item drops.
- Bless and insure from the item sheet, or from the banker's "Protect your gear" section.

## 7. Rewards (the faucets)

- **Monster kill:**
  - Gold: (6 × circle + 4) × (2 if elite) × (1.4 in dungeons) × 0.8–1.2.
  - Item drop chance: 35% (50% in dungeons, 100% for elites).
  - Materials: 1, or 3 from elites.
- **Steal:** (12 × circle + 8) gold, 70% item chance, double materials.
- **Elites:** a sigil and a 50% rare Arms page, plus 1.5% bless deed and 6% Scroll of Study.
- **Lair leader**, once per day per character: +40 × circle gold, a rare-or-better item, a rune chance, 20% Scroll of Study, and a 5% power scroll in circles 6+.
- **Examiner:**
  - First kill: (60 × circle + 40) gold and 2 sigils.
  - Repeat kills: 40% of the gold and 1 sigil.
  - Also: the unique the first time, otherwise a rare or better; the bless chance above; power scrolls in circles 5+ (60% first, 15% repeat); 50% Scroll of Study.
- **Dungeon vault chest**, once per character per day after the floor seals and keeper: 30 × circle + 20 gold, 4–6 materials, 1–2 sigils, a rare+ item, a rare Spell page, 6% bless, 30% Study scroll, 12% special dye. Each floor also has an optional daily cache (see Dungeons).
- **Exercises (contracts):** 84 in all, 9–12 per circle.
  - First completion **per account**: (15 × circle + 10) gold × 1.2 if clean (−0.25 with hint 2, ×0.25 at hint 3), 1 material, 30% item.
  - Repeats teach but pay nothing.
- **Daily drills:** five per day at (8 × circle + 6) gold each, plus a chest for all five.
- **Bounties:** 33.
- **Errands:** hunt, find, deliver and bring, for country folk.
- **Rumors:** one per tavern after 5 exercises, leading to a named rare and a rare page.
- **Lost Ledger Great Truths:** 60 + 30 × index gold, once per account, plus a permanent gift.
- **Sell values:** items sell to vendors at sum(stats) × 3 + {4, 12, 35, 90, 250} by rarity. Shop prices are {20, 60, 160, 420, 1200} × (1 + 0.2 × tier).

Rough value per kill: about 22 gold in circle 1 and about 69 in circle 8, counting the sale value of drops.

## 8. Items

- **Slots:** weapon, shield, head, armor, hands, feet, cloak, ring, charm, relic.
- **Rarity** weights common 60 / uncommon 26 / rare 10 / epic 3.3 / legendary 0.7, with the top three scaling up with luck.
- **Weapons:** damage [6, 12, 20, 30, 42] by rarity + 2 × tier. A weapon only helps the skill it belongs to. There are 20 weapon kinds across the four combat skills.
- **Armour and other gear:**
  - Armour and shields give defence.
  - Head, hands, feet and cloak give smaller defence.
  - Cloaks and wizard hats add luck or learn.
  - Thief's Gloves (30% of hand drops) add deftness, which helps stealing and half of hiding.
  - The shield slot can roll a Glass Orb or Spellbook, which adds learn.
  - Rings, charms and relics roll gold, learn or luck.
- **Crafting** at a workbench: a query against the recipe's difficulty.
  - Failing ruins half the materials.
  - Exceptional work is +25% stats.
  - Recipes, in materials and sigils:
    - Hint Scroll 3/0
    - Healing Draught 5/0
    - uncommon gear 6/0
    - rare 12/1
    - epic 20/4
    - legendary 30/12 (circle 5+)
- **Special dyes** (iridescent, pearl, ember, frost, witchlight, voidblack, cloth of gold) unlock as rare drops and colour clothing or the weapon glow. A notification names the dye and points to Hero → Appearance; it leaves the current fight, loot or bank screen intact.

## 9. Spending (the sinks)

| Sink | Cost |
|---|---|
| Pages per book per circle | 10, 60, 100, 140, 180, 220, 260, 300 |
| Healing Draught | 7 × circle |
| Material | 6 × circle |
| Hint key | 22 × circle (one a day) |
| Rest at the tavern / healer | 4 × circle / 3 × circle |
| Shop gear | see above; a stall sells up to an epic |
| Bless deed | 1,500 |
| Insurance | 20% of shop price per fall |
| Dojo entry | 15 × circle |
| Dojo lessons (`TRAIN_CAP` 45) | 10 + 1.5 × current skill per point. Healing 30→35 is about 255; 0→45 is about 1,900 |
| Appearance (after the guide) | body 250, hair 30, hair colour 20, beard 20, head 15, clothes 10, dye 25 |
| House deeds | 300 (log cottage) to 10,500 (stone manor) |
| House upgrades | extra chest 400 × n (up to 4 more), feather bed 900, garden 700, paint 40 a coat |
| Card room and games | the stakes |

## 10. Houses

- **Buying:** deeds from any banker in 10 shapes × 3 materials (stone ×1.5, timber ×1.25, log ×1). You place one anywhere open outside town.
- **What every house has:**
  - a chest (10–40 slots, +10 per extra chest) whose contents survive death and are shared by all your characters
  - a bed for full health
  - a trophy shelf
  - paint
  - an optional teleport pad (1 rune)
- **Upgrades:**
  - The feather bed leaves you well rested for 1 hour (+25% skill gain).
  - The garden gives 2 food and 2–3 of the region's material once a day.

## 11. Dojos

- **In every town:** sparring students, practice dummies, bouts you can watch, and lessons.
- **Tournament:** 16 seats, 15 × circle gold to enter, 4 bouts, then the master spars you for the prize.
  - Opponents answer in (22,000 + 900 × answer length) ms × [1.6, 1.4, 1.25, 1.1, 0.95] by bout.
  - Their chance of a wrong query by bout: [0.4, 0.32, 0.25, 0.18, 0.12].
- **Prizes**, paid once per account:
  - champion: 120 × circle gold and a token
  - master: 60 × circle gold, the town's prize item, a bless deed, and a power scroll in towns 5–8
- **Story beats:** masters tell the main about Ilva after losing, and Sorrel leaves a note in the next dojo.

## 12. Other systems

- **SQL editing:** queries may include line (`--`) and block (`/* ... */`) comments. Format retains comments and quoted names; comment punctuation does not create extra statements. The sandbox shows SELECT results even when the query starts with a comment. Combat controls wrap below the title when needed, and feedback/fishing controls use readable colors on dark panels.

- **Walk-in rooms** (Tallyport only; `ROOMS` and `setRoom` in scene_b.js): the tavern (7×7 tiles), shop (6×5) and bank (6×6) are rooms you walk into. The outer ring of the footprint is wall and the door is the fourth tile of the front row. Stepping onto the footprint fades the painted building out over about a fifth of a second and shows the room in the same place: floor, a back wall 2.5 tiles tall with windows and decorations, thin side walls, a low front wall with the door gap, and furniture that blocks its tiles. The tavern keeper stands behind the bar, the banker behind the bank counter, and a new Shopkeeper (same stock as the stallkeeper) behind the shop counter. The plaza stall and stallkeeper are unchanged. Tallyport's other buildings and the other seven towns are not enterable yet.
- **Guided first day** (`GD`, Tamsin): walk, run, talk, Odalys's lesson, the gull, loot, bag, stall, page, bank, the harbour tower, an optional pier cast, the Bilge Vaults, the Examiner's ring. Tabs unlock as you go, and you can skip it.
- **Fishing:** a skill and a cast screen. SQL answers decide the catch, and higher skill unlocks rare fish and sunken things.
- **Card room:** Blind Tally hold'em (blinds 2 to 500 by town), the Crooked Wheel, and the Count (blackjack). The Ledger's queries can expose each game's flaw.
- **Rivals:** one per region, who duels you or steals from you.
- **Luck:** gear luck + 3 per streak step, up to 10 steps.
- **Gifts from Great Truths:** gold 10%, luck 10, damage 10%, learn 15%, defence 8%.
- **Bank:** 60 item slots per character.
- **Learned commands** (`CMDS` in quests.js, `A.cmds`, account-wide):
  - The Commands panel on the query keyboard lists only commands you have been taught. Symbols are always there: `,` `*` `'` on top, and a Symbols button for the rest (`( ) % . ; || + - /`). You can always type any command with the letter keys.
  - **Taught:** opening a lesson (a contract with a lesson, or the intro's Lesson 3 once the blanks are right) adds that lesson's commands to the panel, with a toast "New in Commands: ORDER BY". About 39 lessons add commands.
  - **Learned:** the first correct query (exercise, fight, duel or cast) that uses any command from a lesson marks it learned: toast "Learned ORDER BY! +1 Hint Key" and one Hint Key, once per lesson per account.
  - Hero tab → "Commands learned · n of 39" lists them; untaught ones show "?".
  - Supporting characters share the account's list. Existing characters were filled in from lessons already seen or done.
- **Sound** (`src/audio.js`), modelled on UO: music by place and by situation, effects by type.
  - Music: 28 tracks/cues cover all eight towns and eight dungeons, four shared wilderness themes (regions 1–2, 3–4, 5–6 and 7–8), ordinary combat, Examiner combat, taverns, dojo halls, card rooms, the title screen, victory and death. Town music covers each settlement; walking out changes to wilderness. A walked-in tavern or a conversation with its keeper plays tavern music; card-room conversations and active card games play the card-room theme. Dojos use their own theme even though their Scene map is marked as a dungeon. Fighting takes priority over location music. Title music starts after a user gesture.
  - Tracks crossfade over 1.6 s; combat/cues enter with a shorter handoff. Ambient music resumes at its previous position after a fight or cue; combat restarts. Victory and death are single-play musical cues, followed by the current location. Music mute controls those cues; effects mute separately controls synthesized feedback. With music off, short effects-only victory/death feedback remains. Hidden tabs stop music, and muting prevents new music requests. Two decoded tracks are cached, with only one new load at a time; delayed responses recheck the current location before playback.
  - Effects (synthesized): varied sword swings, fencing thrusts, bowshots, hit/hurt/miss; creature-family attack voices (small animals, beasts, birds, insects, wet creatures, constructs, spirits, dragons and ranged foes); healing, treasure/transactions, rare finds, query grades, victory, death and quiet button clicks. Crafting has smithing/alchemy success and ruined-work sounds; fishing has cast/splash, catch and empty-line sounds. Steps distinguish earth, wood and stone; walk-in room crossings have a door cue. Failed purchases and empty transactions make no coin sound. Passive walking recovery is quiet.
  - Magic images and sound follow the existing page: Spark (blue electricity), Frost Dart (cyan dart), Sunlance (gold beam), Chain Bolt (violet branching lightning), Fireball (orange flame), Crystal Shard (violet shards), Blizzard (white-blue swirling snow) and Rewrite (violet orbit/fragments). Every Circle has its own cast and impact timbre. Rare pages add a second ring, trailing sparks and a brighter sound layer; damage and existing rare bonuses are unchanged. Spells and arrows travel for 0.26 seconds before hit/miss presentation. A missed spell fizzles; healing uses green sparkles without a damage flash.
  - Levels: music 0.55, effects 0.7. Hero tab → Sound turns music and effects on or off; the setting is per device.
  - Audio starts on the first touch, as browsers require. On iOS 17+ it is set to play through the silent switch.

## 13. Planned, not built

- Mounts and boats: discussed, skipped for now.
- Cloaks, gloves and boots don't show on the body yet.
- Dialogue portraits still use the old eight hero portraits.
- Duel opponent speed needs playtest tuning.
- Carpentry crafting of furniture isn't built (the skill exists).
- Rumors are per character. Their unique can only be found once per account.
- **More audio:** the other 7 town themes and 7 dungeon themes, 4–5 shared wilderness themes (so town and countryside differ, as in UO), a second combat track, victory sting, tavern, dojo, card room, title and death tracks. Further effect work: continuous regional ambience, occasional idle creature calls, and separate creature death voices. Family attack cues, crafting, fishing and walk-in doors are built.
- Not yet checked on Casey's iPhone: that audio plays in the Claude app, and what the silent switch does.
- **Walk-in rooms everywhere:** built for Tallyport's tavern, shop and bank (see Other systems). Still to do: the other seven towns (their interior art, KI, KG and KW, is generated), Tallyport's other buildings, and specialist shop interiors using the KR shop fittings. Player houses may later use the kit inside and out. Waiting on Casey's verdict on Tallyport from his phone.
- **A real port at Tallyport:** stone quays, wooden piers on pilings, ships moored alongside (a three-master and a cog), small boats, and dock clutter (crates, barrels, sacks, rope, a cargo crane, bollards, lamp posts). Built from harbour textures and props, the same way as the building kit. Art requested; layout not designed yet.
- **A shaped world with islands and a capital:** the world generator draws a real landmass (irregular coast, bays, headlands, offshore islands) in place of the current rectangle, with a couple of towns on islands reached by ferry from a port, and one large capital port city with a big market square, many specialist shops, landmarks and city walls. Working assumptions until Casey decides: the capital is Aldermoot (it already holds the council), and the island towns are to be chosen. The landmass, coast and islands are code, drawn with existing ground textures (V) plus the new coast textures and props. Ferries reverse the earlier skip of boats only for island crossings; there is no free sailing. Art requested in the same run; nothing designed in code yet.

## Decision log

- 2026-11-22: Dungeon entrance banners, map references and named-rare source descriptions now use the same eight identities as the authored floor catalog. Added a catalog consistency regression; the rebuilt names replace Counting Crypt, Nested Vaults, Hall of Panes and Palimpsest Stacks in player-facing references.

- 2026-11-22: Release `dungeon-rebuild-2026-11-22` rebuilds all eight dungeons as 28 authored, extensible floors using UO's multilevel hunting-ground model. Added 16 species, themed terrain/props, optional shortcuts/secrets/caches, explored maps, daily vault seals and persistent expeditions. Existing characters migrate to account v7/character v6; no wipe. Dungeon hunts no longer crash on victory, and keeper/chest anchors cannot overlap. UI expedition evidence and deployment receipt are tracked in the full rebuild plan.

- 2026-11-22: Soundtrack release `soundtrack-2026-11-22`: Casey chose existing downloaded Suno music plus original locally composed MIDI for missing themes to avoid additional export fees. Completed 28 music contexts/cues; preserved saves, balance and the existing three tracks. MIDI sources remain editable; prepared MP3 loops and PCM WAV cues play in the browser.

- 2026-11-22: Release `magic-and-sound-2026-11-22` gives the eight existing spell Circles distinct images and sounds, stronger rare-page presentation, and arrival-timed projectile impacts. Added creature-family, crafting, fishing, footstep, room-door and transaction feedback. Fixed duplicate healing, weapon sound selection and chase-death cues. These are presentation changes; progression, damage, saves and music tracks are unchanged.

- 2026-11-22: The repeat audit caught a rare dye discovery replacing the bank screen 900ms after a kill. Discovery now uses a non-blocking notification naming the dye and Hero → Appearance. Unlocks still save immediately and drop odds are unchanged. Regression coverage forces the reward during banking so it cannot depend on random luck.
- 2026-11-22: The audit's card-room retest found that poker rejected a leading comment before a valid COUNT and spent the street's read. The follow-up accepts commented counts through the same SQL comment handling as other queries; the one-read-per-street rule is unchanged. Wheel count queries and blackjack actions were also exercised, and the shared painted controls were visually reviewed on phone and desktop.
- 2026-11-22: Release `playability-audit-2026-11-22` repairs valid commented queries being rejected, sandbox SELECT results disappearing after leading comments, and Format corrupting block comments/quoted names. Combat title/buttons wrap on phones; combat error guidance and fishing/card controls have light text on dark backgrounds. Rules, payouts, progression and save format are unchanged. Pages commit/hash are recorded by release.json; artifact preview unchanged.

- 2026-11-22: Pass 29 (`1795364400-6a70`): Tallyport's tavern, shop and bank are walk-in rooms. To give them usable floor space their footprints grew (tavern 6×4 → 7×7, shop 5×4 → 6×5, bank 5×4 → 6×6) and their painted art is scaled up to the new width. Keepers moved indoors; a Shopkeeper was added in the shop. Other towns keep their old layout. Save format unchanged.
- 2026-11-22: Another session published `1795356532-b223` (regional wildlife, new lair creature sets for L6b, L7b, L8a, L8b, new creature and corpse atlases) without updating these docs. Recorded here from the code; pass 29 was built on top of it.
- 2026-11-22: Casey asked for a more interesting world: a shaped landmass with islands, a couple of island towns, and a huge capital port city with a big market and many shops. Art for the capital, market, shop fittings, coast and a ferry added to the single run. Open: whether the capital is Aldermoot or a new city, and which towns sit on islands.
- 2026-11-22: Casey: Tallyport is a port town without much of a port. Harbour art (quay and pier textures, ships, dock props) added to a single art run with all interior sets.
- 2026-11-22: Walk-in buildings: painted outsides stay, and the kit is used for interiors only. A mock showed a kit-built outside looks plainer than the painted buildings, while kit interiors read well. Casey then asked for interior art for all other towns, read as agreeing.
- 2026-11-22: Casey wants to walk into buildings, UO style. Planned as a building kit rendered in the world with roof hiding and a front-wall cutaway (see Planned, not built). Ultima Online's own art was ruled out (EA's copyright, and drawn for a diagonal isometric grid). LPC Revised (free) and Daniel Thomas's 2D Hand Painted packs (paid) were compared; Casey found LPC poor next to the current art and the hand-painted packs too cartoony. The kit will be generated in the current painted style.
- 2026-11-22: Casey asked that commands not appear in the Commands panel until learned, with an achievement like "Learned SELECT!". Built as taught (lesson opened) then learned (first correct use). Casey's reward answer, read as: a Hint Key. Open question left to Casey: unlock on first correct use instead of on the lesson.
- 2026-11-21: Grandmaster should take a long time, like UO. The new curve puts 40→100 at about 420 correct answers. The correct-answer floor went from 60% to 35%, so skill matters.
- 2026-11-21: Worn gear drops on death unless blessed or insured, as Casey asked. Uniques are always blessed (Claude's default, which Casey hasn't objected to).
- 2026-11-21: Respawns moved from about 20 s to minutes. Looted corpses stay 90 s. Creatures scaled to real sizes after Casey reported giant seagulls.
- 2026-11-21: Money sinks added: lessons, power scrolls, Scrolls of Study, priced appearance, house upgrades. Mounts and boats skipped for this build.
- 2026-11-21: Five character slots with a main, as Casey asked. Supporting characters may do exercises. Payouts are once per account. Banks are separate to encourage housing. Old saves were wiped.
- 2026-11-21: Considered renaming the game "Ledger"; kept Brasswake (name collides with the in-world Ledger and a large crypto brand).
- 2026-11-21: Towns renamed, because Casey found both old sets weak (generic landscape compounds, and SQL puns). Old names → new: Reedmere/Sievemarsh → Brackwater; Goldenfell/Abacus Heights → Haverly; The Crossroads → Four Fords; Emberhold/the Assay Forge → Cinderwick; Glimmerdeep/the Underledger → Kell; Frostspire/Windowspire → Highwatch; The Scriptorium → Aldermoot. Tallyport kept. Each name has a quiet nod to its SQL topic: Brackwater (filtering), Haverly (harvest totals), Four Fords (joins), Cinderwick (reshaping), Kell (a well inside the rock: nesting), Highwatch (windows), Aldermoot (a moot is a council). Dojo student Kell Durst renamed Kett Durst.
- 2026-11-21: Audio planned, modelled on UO's per-town, per-dungeon and per-situation music. Casey chose AI-generated music (he has no recorded tracks); Suno, since it runs on his phone.
- 2026-11-21: Pass 26 (`1795324356-c3c6`): first music (Tallyport, the Bilge Vaults, combat) and synthesized effects, with music and effect toggles on the Hero tab.
- 2026-11-22: Casey: the full Symbols group made the Commands panel too large. Now three common symbols (`,` `*` `'`) sit on top of the Commands panel and in the keyboard's bottom row, with the rest behind a Symbols button (Commands panel) or the 123 key (keyboard). The quote beat `=` for the third slot because text filters use it in nearly every WHERE.
