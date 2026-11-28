# Brasswake: gameplay reference

The coordinated landscape, Techniques/Magery/live-combat and dungeon spatial build is released and verified at `32d5942`. [Release history](RELEASE_HISTORY.md#landscape-techniques-live-combat-and-dungeon-redesign) records exact source, checks and device/campaign limitations.

Last updated: 2026-11-27. The whole-world living landscape is released and verified at `3c80162`; see [release history](RELEASE_HISTORY.md#whole-world-living-landscape). Painted modular world/dungeon architecture is verified at `639f24e`; see the closed [rollout plan](plans/2026-11-25-world-architecture.md) and release history. Character motion, intro/menu continuity and world presentation are verified at `d3850c3`; see the closed [polish plan](plans/2026-11-24-animation-and-world-polish.md) and release history. The combined worlds/living-places and battle-risk implementation is verified at `8602fa5`; see [plan](plans/2026-11-24-worlds-and-living-places.md) and release history. SQL query power and battle comparisons are verified at `9853ea2`. The skill/attribute/NPC expansion is verified at aec11c0; the Backstab/pursuit audit release is verified at `dab3b4a`, with evidence and limitations in the closed [path playthrough plan](plans/2026-11-23-path-playthrough-and-balance.md). This describes world revision 3, modular buildings, the expanded capital and working ports, alongside the story/first-day revision, soundtrack and 28-floor dungeon rebuild. The retained artifact preview is `1795364400-6a70`. This is the source of truth for rules, numbers and content. Code constants are named in `code` so they can be found. If you change a number in code, change it here in the same turn. Verified release identities and limitations are in [release history](RELEASE_HISTORY.md).

The boat orientation, dojo teaching and SQL feedback updates below are released and verified at `cb5546e`. See the [closed onboarding and dojo plan](plans/2026-11-25-new-player-onboarding-and-dojo-learning.md) and [release history](RELEASE_HISTORY.md#new-player-onboarding-regional-sql-practice-and-subtle-footsteps).

The fitted painted character system is released at `0090c89`; the [painted character plan](plans/2026-11-26-painted-character-system.md) and release history record verification and device limits.

## 1. Premise and goals

- **The game in one line:** a single-player, top-down fantasy RPG in the spirit of Ultima Online, where every skilled action is an SQL query written on a phone. It teaches SQL from zero to window functions and writes. The game is the motivation; the queries are the work.
- **Design goals Casey has set:**
  - It should feel like UO: use-based skills, a long climb to Grandmaster, real farming and grinding, gold worth earning, gear you can lose, houses.
  - Optional side content is welcome. The main story stays focused.
  - Phone play uses landscape touch controls.
- **Story** (full detail in 04_WRITING_STYLE.md):
  - You are rescued by Tamsin aboard the Marigold and invited to train as Tallyport’s champion. Seven regional Examiners give the first seven marks; the council’s Audit gives the eighth and restores Tallyport’s seat.
  - Ilva Thorne, who came from the same sea, left journal pages and hunted the lost tables of the Ledger.
  - Odalys Brine teaches you the First Circle.
  - Tamsin guides your first day.
  - Sorrel Ashby runs the dojo circuit one town ahead.

## 2. Accounts and characters

- **Three independent worlds**, each with five slots (`CharacterWorlds.count=3`, `NSLOT=5`): one story main and four supporting characters, fifteen total. They use the same geography with separate stories, households and progress. The first character in each world is its main; supporting slots require an existing main. Deleting a main allows the next new character to carry that world's story; existing supporters remain supporting.
- **Main only:** Examiners/marks, Ilva's journal and the masters' memories, Sorrel's notes, Lost Ledger scrolls, the Odalys intro/guide and ending.
- **Supporting characters:** all other activities, including exercises. They arrive ashore with the story introduction and guide skipped.
- **Shared within each world:** houses, chests, household gold and gear, the named-rare codex, learned commands, the installed Grand Atlas and first-time exercise, Great Truth and dojo payouts. The teaching system also shares introduced techniques and readiness within each world.
- **Per character:** skills, gear, bag, bank, technique knowledge/four-slot loadout, crafting/covert pages, purse, dailies, errands, rumors, exploration and business discovery. Knowledge does not transfer between characters; banks remain separate.
- **Selection:** The bottom-middle Hero control is the character entry point; the top HUD has no duplicate portrait. Hero -> Return to characters opens the three-world screen. During the boat arrival, the bottom-middle portrait opens automatic-save status, backups, Continue playing and Return to characters, with Equipment and skills available once the tray is introduced. The character control remains available during the rescue; ordinary intro dialogue has no exit-to-selection action. Every occupied slot explicitly states Main or Supporting. Returning saves progress. World changes retire encounters and regenerate the live scene so monsters/corpses and pending actions cannot cross worlds.
- **Migration:** all five legacy slots and shared household data move into world one. Account v9/character v8 export/import includes all worlds. No save wipe.

### Deletion

The selection screen offers Delete a character and Delete this world. Both require an explicit warning/continue step and then typed target identification: the exact character name or `DELETE WORLD N`. Cancel/mismatch changes nothing. Verification binds account/world/character identity and survives an offered backup of the same character. Character deletion removes its personal bank, possessions, skills and horse, preserving shared homes/storage; removing the main leaves existing supporters in their roles and allows the next new character to be main. World deletion clears its complete household and retains an empty reusable slot among the three worlds. Device persistence precedes any scene rebuild. Linked-account writes are requested immediately and serialized after an older write; late startup reads cannot undo a deletion performed after the read began. Cloud availability and conflicts between independently played offline devices still follow the existing account-wide synchronization limits. An intentional older backup import can restore its saved state.

## 3. World

- **Size:** one 768 × 1152 tile map, 16 px per tile. A shaped mainland has estuaries, headlands and coves; Brackwater is a separate southeast marsh island and Cinderwick a separate western volcanic island, each with countryside and its existing dungeon. Six smaller offshore skerries complete the silhouette. Circle order remains a teaching sequence. Each region has a town with:
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
  - Nothing is locked by region. Roads connect the six mainland towns. Four free, on-demand, two-way ferry routes join Tallyport–Brackwater, Brackwater–Haverly, Four Fords–Cinderwick, and Cinderwick–Aldermoot. Approach a ferryman and choose the destination; a safe quay landing and return service are available with zero gold. World-map lines follow actual open sea around headlands. Regional maps permit travel within their own region; cross-region journeys use roads/ferries unless the household Grand Atlas is used from home.
  - Walking speed is approximately 1.22845 tiles/s and running is 3.11909 tiles/s, controlled by joystick displacement (keyboard arrows or WASD walk). Manual motion is continuous, with immediate steering and stopping at the visible position. Swept body clearance prevents corner cutting and supports sliding. Tile ownership follows position; movement rewards and resources are metered by actual travelled distance; footfalls follow actual planted-foot contacts.
  - **Painted human locomotion:** 24 poses per cycle, from the corrected restrained Mixamo motion on continuous fitted anatomy. Baked stride is 1.269399 walking / 2.183366 running tiles per two-foot cycle, at approximately 116.13 / 171.43 steps/min (1.22845 / 3.11909 tiles/s). Profile-specific stride lengths retain sole contacts on shorter bodies. Actual physical travel drives poses and contact sounds, including diagonals; pace changes preserve phase. Distance costs and relative pursuit speed ratios remain. The older 132/180 cadence release remains historical; [the painted character plan](plans/2026-11-26-painted-character-system.md) records publication evidence.
  - Nearby labels, body taps and contextual controls share an unobstructed 1.35-tile contact range. Supported stairs expose their authored landing faces. A reachable body can take a tap beneath an overlapping out-of-reach label. Ferrymen and cartographers retain direct cardinal pier/counter approaches so an offered action agrees with the boarding or purchase guard.
  - Teleport runes turn into house pads.
- **Whole-world living landscape:** eight regional families with two species and four authored growth stages each, individual proportions, bushes/ferns/reeds/grasses, fallen leaves/needles, roots, old timber/stumps, tended orchard rows/garden patches and worn homestead approaches. Subtle wind and branch wildlife, foreground actor reveal, unchanged physical navigation and saves. Released and verified at `3c80162`; [living-landscape plan](plans/2026-11-25-living-landscape.md).
- **Human residents:** named teachers, services, rivals, Tamsin, countryfolk and dojo fighters share the hero character system, with stable skin, complete heads, outfits/colors and job accessories. The painted system assigns average, muscular or heavy builds and modest authored height variation from character/occupation decisions in `CharacterProfiles`, never random appearance seeds; these choices have no combat/stat effect. They face eight directions, wander diagonally where corner clearance permits, and turn toward the player during nearby interaction. Creatures retain their own artwork.
- **Population:**
  - About 155 creatures per region in camps of 3–5, plus strays, 16 lairs in all (marauders, smugglers, bandits, the bog witch, giant leech and spider, frost giant, wyvern, red dragon, lich, skeleton archers), and animals.
  - The countryside retains all 56 homesteads, 56 roaming people, 88 points of interest, 16 lairs and 73 fishing sites (including the guided pier). Stable IDs preserve discovery, rewards and errand targets. Find/delivery directions and target names update to the actual moved sites without resetting progress.
  - **Regional wildlife** (`WILD` in quests.js, `host.wild`): each region has four wildlife creatures tagged by habitat (coast, water, open, forest). Every other animal spawn picks from the region's list for its habitat, in place of the common animals.
  - Lairs L6b, L7b, L8a and L8b have their own creature sets: the Troll Hollow, the Winter Den, the Brass Barracks and the Archive Wardens.
- **Respawn** (`respT`):
  - camps 150–300 s
  - lair guards 480 s
  - lair leaders 900 s
  - ore and herb nodes 240 s
- **Creature loot** (`creature_loot.js`): surface and dungeon drops follow the actual species, including lair leaders and dungeon creatures that share another creature’s SQL exercise. Birds and crabs yield meat; wolves, deer and similar game yield meat and hides; small furred predators yield hides. Wildlife descriptions specify meat, hide or no useful drop. Insects, leeches and spiders currently have no harvestable resource. Magical creatures and constructs yield regional material; people, armed humanoids and equipped undead can carry gold, gear and scrolls. Only these carriers offer theft and special dye drops. Gilded animals and beast leaders never acquire purses, weapons, scrolls or sigils through reward bonuses. Tamsin supplies the guided weapon upgrade; the first creature follows its ordinary loot profile. Chests, rival wagers and Examiner awards keep their separate rewards. Existing saved corpses retain their contents.
- **Corpses:** unlooted ones stay 300 s and looted ones 90 s. Your own body lasts 10 minutes.
- **Creature size** (`MSC` in scene_a.js, 1 = a grown man): rodents and birds about 0.3–0.45, wolves 0.6, people 0.83 (normalised), golems 1.1–1.2, frost giant 1.5, dragon 1.6 (capped).

### Cartography, manual movement and lived-in towns

Shipped and independently verified on 2026-11-23; the [release history](RELEASE_HISTORY.md#cartography-travel-controls-and-towns) and closed cartography plan record the source and checks. These rules replace automatic visited-town travel:

- Walking reveals a permanent 14-tile radius on the initially black world map and minimap. Exploration is per character, stored in compact four-tile cells. Bought surveys show muted geography; personally explored ground has full colour. Legacy recorded towns/discoveries remain known without inventing historical walked paths.
- Eight physical cartographers offer free local chart consultation and public destination waypoints. Regional maps cost 600, 900, 1200, 1500, 1800, 2100, 2400 and 2700 gold. A map grants repeat travel to its region's public surface destinations only while the character is physically in that region. Ferries stay free; secret sites and dungeon interiors remain discoveries.
- Waypoint arrows follow actual traversable ground and direct sea crossings through a ferryman. Physical road, ferry and capital district signs name the routes they serve.
- The Grand Atlas costs 30,000 gold and is sold only in Aldermoot after that character owns all eight regional maps. It is one shared household furnishing, installed through a house panel. Global destination travel requires interacting with it inside the installed house and owning all eight maps on the using character. It is never usable as a portable map-menu shortcut.
- A bottom-right eight-direction joystick owns touch movement. Inner displacement walks, outer displacement runs, and release/cancel stops. Empty ground taps do nothing; nearby object taps interact and distant ones ask the player to move closer. Keyboard arrows and house-plot selection remain available.
- **Movement and reach:** WASD also moves the character while the world has focus. Nearby tap labels and contextual actions use the same reach and obstruction checks, including at dungeon stairs and gates. Touch movement remains on the joystick.
- Across all eight regions, service premises receive actual purposes, staff, specialized regional interiors, varied plans/frontages and usable civic spaces. Doors visibly open and close with sound. Dojos share modular construction; public building stairs connect useful upper rooms with persistent positions and safe return. Rectangles remain common without making every building identical.
- Business picture signs use the same symbol catalogue as persistent discovered service markers. Entering a business records its symbol per character; minimap and larger map retain it. Symbols identify the business, with existing public waypoint/travel rules. The Town map zooms to local streets so recorded businesses remain distinguishable; Region and World views retain compact symbols.
- Doors use painted timber, restrained iron fittings and fill structural frames throughout their inward swing. Connected pitched roof planes share ridges, hips and valleys with the footprint; chimneys sit on those slopes. Fitted regional door surrounds replace entrance awnings and artificial approach steps, preserving clear ground-level apertures. Regional window caps, frontage stock and chimneys add depth. Structural collision remains authoritative; the verified [world architecture rollout](plans/2026-11-25-world-architecture.md) records publication.
- Natural material edges feather the actual textures across irregular boundaries, including paths/grass, rock/grass and shallow/deep water. Constructed paving has continuous fitted perimeter courses and corners with restrained edge relief. Dirt footpaths have compacted centers and irregular worn grassy shoulders. Generic town residents follow short bounded public routes and pause facing activity. Quest meeting points retain their positions. The original croupiers receive visitors at the poker tables in the relocated card rooms.
- A persistent location label distinguishes town from Wilderness; boundary announcements update independently of the music buffer.
- Piers, stone quays and paved edges do not create shallow water. Pale shallows border natural shorelines; working harbour basins retain deep-water textures.

### Dungeons

**Spatial redesign (released):** all 28 floors now have authored regional footprints and circulation: cargo bays/quays/court; lock banks/reed channels/reservoir; family tombs/procession/burial court; root forks/brood hollows/wyrm chamber; cooling works/casting hall/ducts/crucible; faceted survey caves/resonance space/well rims/heart; sled galleries/cistern/shelves/court; reading wings/record aisles/restricted passages/charter hall. Rectangular, clipped, cross-shaped, elbow and lobed spaces vary in scale. Approved masonry forms physical opaque cover, explicit local passages connect the chambers, and controls in deeper chambers open useful returns to the arrival area. Every floor's entrance-to-control route is at least 20 cardinal steps shorter after opening its return; this is geometry evidence, not combat or playtime tuning. Movement-blocking water/hazards permit sight and fire in the coordinated combat adapter. Floor order, existing encounter/reward IDs, rosters, seals, keepers, story scrolls and the starter visit remain. The [spatial build plan](plans/2026-11-27-dungeon-spatial-design.md) records migration, checks and limitations.

**Supported stairways (released `359f497`):** ascents/surface exits move from room centres into supported perimeter-wall recesses. Their interaction points and reciprocal landings move with the artwork. Descents remain floor openings. Existing room-centre saves stay valid, stable IDs/rewards/gates/save versions remain, and no existing route closes. The narrow rounded Highwatch second-floor landing gains one dry corner tile (56,88). Closed-door routes measure 200–318 cardinal steps after moving the arrivals; connected safe-tile extrema remain unchanged. See the [stair-support plan](plans/2026-11-25-dungeon-stair-support.md) for publication and verification.

Dungeons use regional painted wall coping, masonry faces/piers and joined furnishing recesses, alongside floor-edge shadows, drains, burial inlays, roots, cooling grooves, crystal seams, ice cracks and archive borders. Sparse visible-only ripples/drips/motes preserve readability. These presentation layers retain authored layouts, collision, bridges, hazards, stair travel points and progression.

The released `dungeon-rebuild-2026-11-22` baseline replaced the shared four-room corridor with 28 stable, authored tile floors. Every floor used a 124×109 canvas with 16–19 named spaces, 2,692–3,742 connected safe tiles and 26–32 ordinary creatures. Its closed-door entry-to-stairs/keeper route spanned 200–318 cardinal steps. The current spatial redesign retains the canvas, floor names and encounter roster; its geometry lives in `src/dungeon_layouts.js`, with content and stable entity anchors in `src/dungeons.js`. Historical tile/path counts do not describe the current geometry and were never measured playtime.

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
- **Navigation:** stairs connect reciprocal landings. The HUD labels the floor and current chamber; the corner map reveals nearby terrain as you walk. Map opens the explored current floor, discovered destinations with directions, floor names and seal progress. Continuous joystick or keyboard movement controls walking/running; nearby taps interact through the shared unobstructed reach check.
- **Inhabitants:** two new species per dungeon (16 total) join four suitable existing species and the named keeper. Creatures roam their room territory; ordinary hostile creatures attack on sight, while lieutenants, the keeper and the guided starter guardian can be approached deliberately. Ordinary creatures respawn after 5 minutes and floor lieutenants/keepers after 15 minutes, away from the player and clear of occupied spawn anchors. Keepers remain repeatable after their lost table has been collected. Static creature sprites use the existing rotated-sprite fallback when no separate fallen artwork exists.
- **Combat:** dungeon encounters use the shared live movement, awareness, pursuit, sight/fire, recovery and paused-SQL rules described in section 5. `LiveCombat.profile` is the authority for enemy reach, timing and ranged/magic behavior; dungeon roles do not prescribe a separate response-round cycle. Regional bounty templates still supply SQL and hunt-errand metadata. Health retains the shared 1.6 factor and role multipliers: skirmisher 1.1×, armored 1.35×, caster 0.95×, brute 1.6×, lieutenant 1.8× and keeper 2.4×. Armored creatures retain their 20% non-spell damage reduction. Lieutenants retain elite rewards. Difficulty adds two points per floor; lieutenants/keepers use elite difficulty, with another six points for keepers, capped at 100. The guided first-fight/starter guardian health exception belongs to the shared encounter adapter. Exact combat tuning remains provisional.
- **Vault:** defeat the lieutenant on each earlier floor to recover its seal, then defeat the final keeper. Those seals and keeper victory unlock the final chest. Seals, keeper unlock and reward claims reset on the next local calendar day. Each cache and final vault pays once per character per day. Vault rewards retain the existing named-rare pity system. A cache gives `10 × Circle + 8` gold, two materials and an uncommon-or-better item. The lost table remains a one-time main-character story reward after defeating the keeper.
- **Persistence:** mapped passages, opened shortcuts, read notes, kill/respawn times, unexpired corpse contents, seals and reward claims save per character and dungeon. Compact discovery bits reduce exploration storage across the fifteen character slots; older discovery arrays are read and compacted automatically. Expired corpse records are removed while live loot remains. Reload and save-code import restore the floor and a safe position; leaving returns to the surface entrance. Dungeon deaths leave belongings at that surface entrance for the existing ten-minute recovery window. Characters, equipment and banks migrate from the previous save version.
- **First day:** the Bilge entrance has a separate cellar rat and starter chest during the guided visit. One guardian unlocks this nearby chest; the other floors remain available after the guide. Leaving and returning before claiming it preserves this step.

## 4. Characters, skills and paths

Creation offers free male/female body, average/muscular/heavy build with the painted system, five skin tones, twelve complete head styles per body and seven hair colours, with a close-up head preview and a turning/walking preview of the customized avatar. The painted system uses coherent directional complete heads, fitted clothing and the same body profile in world animations and the large paperdoll; headwear remains separate. Appearance persists across world animations and the paperdoll. The in-game Appearance menu also offers free skin tones; complete style changes cost 30 gold outside the guide, and other existing barber/tailor prices remain. The painted system has 24-pose walk/run cycles paced by distance, seated poses and coordinated 12-frame one/two-hand, bow, crossbow, casting, book, block, hit and fall actions. Actor separation uses a softened subpixel dark edge and ground shadow; 12 CSS px names anchor to the rendered head/silhouette.

- **Paths:** starting skills, weapon, basic attack/Spark and legacy crafting/covert notes. New combat Techniques come from training, with no initial special equipped.

| Path | Starting skills | Weapon | Legacy notes / basic access |
|---|---|---|---|
| Warrior | swords 40, healing 30 | sword | a1 |
| Thief | stealing 40, hiding 30 | rapier | a1, h1 |
| Crafter | smith 40, carpentry 30 | sword | a1, c1 |
| Mage | magery 40, alchemy 30 | spell | s1 |

- **Skills:** twenty use-based skills, defined by `Progression.skills`: Swordsmanship, Fencing, Archery, Magery, Stealing, Hiding, Blacksmithing, Alchemy, Carpentry, Healing, Fishing, Evaluating Intelligence, Meditation, Inscription, Resisting Spells, Tactics, Anatomy, Parrying, Stealth and Lockpicking.
- **Caps:** 700 real skill points total; 100 per skill. Sequential power scrolls lift an individual cap to 105, 110, 115 or 120; those points still count toward 700.
- **Controls:** Hero offers Raise, Lower and Locked for every skill. All settings permit use. Lower only donates points when a real gain needs room at 700, highest eligible donor first (stable catalogue order breaks ties). Available room is used first, donor losses match the actual gain, and no failed/zero gain removes anything. Optional stopping targets lock automatically; clearing a target preserves the selected mode. Nothing decays offline. Dojo purchases respect modes, targets, donor capacity and the 45 training ceiling; only the quoted achievable whole-point milestones are charged.
- **Titles:** Neophyte 30, Novice 40, Apprentice 50, Journeyman 60, Expert 70, Adept 80, Master 90, Grandmaster 100, then Grandmaster+ 110, Elder 115, Legendary 120.
- **Gain curve:** primary skills retain the slow UO-like curve in `Progression.gain`: `2.4 × max(.2,1−abs(value−difficulty)/45) × (1.6 below 30) × slowFactor × quality × boosts`. Slow factor is `min(1,max(.015,((100−value)/60)^2.2))` below 100 and `.01` above. Fractional tenths roll for the next tenth; gain and donor transactions use integer tenths. Battle practice follows result quality (correct 1, sorting .85, column order .75, technique .7, partial matching share up to .9, wrong 0); other activities retain correct 1, close .6, partial .4, wrong 0; combat hints reduce training and showing an answer trains nothing. Equipment learning, Study ×2 and rest ×1.25 remain. Support skills receive .35 of the primary training quality, once per eligible query rather than once per animated swing. Scripted standing-stone rewards retain their quality-2 bonus.
- **Timing evidence:** the pre-implementation source-function simulation averaged 430 correct matched-difficulty uses from 40 to 100 in 2,000 trials, without boosts or cap pressure. This is a curve check, not elapsed playtime or natural progression balance.
- **SQL techniques:** thirteen independent learning records remain in `S.skills`, with rusty drill prioritization after 20 hours. They share no RPG budget and are preserved when changing builds. Correct fishing forwards its actual query Circle to SQL training; wrong fishing trains no Fishing.

### Attributes and resources

`Progression` owns STR, DEX and INT with independent Raise/Lower/Locked controls and targets, a floor of 10, individual cap 100 and total cap 225. Successful eligible use develops .2 × quality in a related attribute, with a 75% primary/25% secondary choice and an available secondary fallback. It can develop at a skill cap when the practiced skill remains set to Raise; support gains and paid dojo lessons grant no extra attribute gains. Attribute donations clamp existing resources to the new maxima without healing for free.

| Path | STR | DEX | INT |
|---|---|---|---|
| Warrior | 60 | 35 | 25 |
| Thief | 35 | 60 | 25 |
| Crafter | 45 | 40 | 35 |
| Mage | 25 | 35 | 60 |

- Maximum health: `50 + round(STR/2)`; maximum mana `round(INT)`; maximum stamina `round(DEX)`.
- Physical power scalar: `.9 + STR×.002 + Tactics×.002 + Anatomy×.0008`.
- Spell power scalar: `.9 + INT×.0015 + Evaluating Intelligence×.0025`.
- Spells use catalog mana costs with bounded Focus equipment savings. A prepared spell scroll funds one committed spell when selected or mana is insufficient. Opening/cancelling costs neither.
- Stamina recovers 3 per active second including movement; mana has no passive regeneration or attack rebate. Recover restores `round(8 + Meditation×.2 + INT×.08)` mana and 12 stamina within maxima. Paused SQL/menus/background time grants no resources/skill; walking spends no stamina. House sleep restores all resources.

## 5. Combat and covert work

**Live combat.** Movement and enemy attack timing run between actions. Choosing a ready valid action pauses the whole world for SQL. Query entry, menus, background and loading advance no combat clocks. A committed wrong answer spends costs and recovery; the first execution error retains its free repair. Cancel/reopen preserves the same question, draft/editor state and assistance budget until an action commits. Target toggling cannot erase that budget. No full enemy retaliation is automatically attached to a query. Existing death penalties and unlimited SQL thinking time remain.

Query power and battle comparisons shipped as `9853ea2`, independently verified on 2026-11-24 UTC. The closed [SQL battle feedback plan](plans/2026-11-24-sql-battle-feedback.md) and [release history](RELEASE_HISTORY.md#sql-answer-power-and-battle-comparisons) preserve verification and UX observations.

- **Difficulty:** `min(100,(Circle−1)×12+8+elite8+boss14)`. Dungeon role/floor additions remain as described above.
- **Attack accuracy:** `max(35,clamp(10,95,50+2×(skill−difficulty)))`, independent of grade. Hint 1 costs 15 percentage points, precision adds 20, capped at 95%. SQL quality sets power separately. Covert/crafting/fishing retain grade-scaled odds.
- **Query power:** correct results and required technique/order give 100%. Right rows with incorrect sorting give 85%; swapped columns 75%; a missing required technique 70%. Other read results earn their matching-row share over the larger result size when at least half matches, capped at 90% until fully correct; extra/missing/duplicate records count against this share. Lower overlap, wrong shape, and failed execution give 0%. Write tasks measure progress beyond the unchanged initial check state; no-op statements earn 0%. This is useful task progress, not character similarity or a claim that invalid SQL partly executed. Named rules live in `Engine.QUALITY` and `QueryFeedback.RULES`.
- **Hints and showing:** a second (shape) hint caps attack/effect power at 60%. Showing an attack answer allows only 5% demonstration power and no RPG/attribute/SQL training; shown support work has no useful effect. The first support hint scales effect to 60%; hints still reduce practice. An initial execution error gives one free correction; a second consumes the exchange at zero power.
- **Query feedback:** a free syntax repair explains the execution error and keeps the draft for another attempt. Show me explicitly states the cost before revealing an answer. Executable results explain whether the problem is column count, order or row values. Partial query power still measures complete matching rows. Reopening help or reselecting a compatible action keeps the draft.
- **Battle comparison:** accepted SQL lowers the input panel and leaves a compact actual outcome in the world. Details pauses play in the ordinary sheet and shows query power, the submitted SQL, a verified small correction or **One correct solution**, result counts and actual practice gains. Free syntax repair stays above the editor; long comparisons expand within bounded scrolling. Zero power has no useful player effect, while enemy timing resumes independently. Theft keeps its own success-chance feedback.
- There is one shared player recovery. Melee recovery pauses during movement without resetting progress; archery advances at 35% while moving; casting/support recovery advances normally. Physical recovery receives a bounded `1−min(120,DEX)×.002` factor. Basic recovery is sword 1.5 s, fencing 1.15 s, archery 1.6 s, Spark 1.3 s. Technique-specific durations/costs live in `Techniques.catalog`; these are initial balance defaults. INT retains mana capacity and modest existing spell-power scaling.

- The finite baseline provides basic attack/Spark, Recover and one prepared supply type (bandage or draught). Spark costs 3 mana before bounded Focus savings. Basics use opponent SQL Circle, without the former page-Circle power/under-tier penalty. Stamina recovers 3 points per active second; attacks give no free mana rebate. Recover restores the existing Meditation/INT amount with a 3 s recovery. A bandage/draught consumes one supply and has 2.8 s recovery; it uses SQL and useful restoration follows answer power. Food remains safe recovery after escape.

- Four shared Technique slots hold attacks, healing, protection and utility across disciplines. Dojo knowledge is permanent and per character; real skill and matching physical equipment gate equipping/use. Magic does not require a staff. Equipment, supply selection and loadout changes require safety. Falling below a requirement preserves knowledge and the slot, but disables use. The total skill cap remains 700; existing individual power-scroll caps remain.

- Magery's learning sequence is Frost Dart (50, slowing), Healing (60), Ward (70), Sunlance (80, piercing magical defenses), Fireball (90, burst), Force Wave (92, displacement), Mana Siphon (95, caster-only mana drain), Crystal Shard (98, exposure) and Rewrite (100, disruption). Unwrite is a rare stronger disruption spell at 95/+2. Ward improves with Inscription, offense with Evaluating Intelligence, recovery with Meditation, and hostile magic defense with Resisting Spells. Costs/ranges/coefficients are catalog-owned. Useful protection lasts five active seconds. Control immunity lasts four active seconds after an interruption, preventing repeated permanent locks. Healing/protection require equipped slots.

- Aggressive enemies fill awareness over 2.2 seconds within ordinary 6.5-tile sight/detection range. Direct attacks engage immediately. Engaged tracking can continue to 12 tiles; losing sight/distance for 3 seconds starts awareness loss at 20 points/s. Ordinary home leashes are 24 tiles (Examiners 18). Return restores full health and blocks attacks until home, preventing repeated free shots at a resetting enemy. Town shelter and deliberate Examiner challenge remain. Natural running away replaces Flee. Species profiles distinguish melee, ranged/casting, fast skirmishers and slow brutes; attacks have visible wind-ups and recheck range/sight at release. Existing projectile travel is presentation after release, not a separate homing/collision simulation.

- Movement, sight and fire share physical geometry but have separate masks. Combat uses dungeon `opaque` when available, otherwise solid geometry with surface water transparent. Closed solid gates/walls block shots and sight; supercover traversal seals diagonal corner gaps equally for enemies/player. Pursuers use bounded path searches around obstacles/last sightings. Lunges need a clear single-step approach and actually move the character. Dungeon floor redesign proceeds independently under its owning agent.

- **Damage and timing:** one query resolves one player action, with no attached enemy retaliation. Basic Swordsmanship/Archery/Magery use two strikes, Fencing three; Backstab uses two. Damage is `(base + skill/8) × technique power × equipment scalar × physical/spell power × query power`, rounded per successful strike. Basics have power 1, without page scaling/under-tier penalties. Base ranges remain swords 9–13, fencing 6–10, archery 7–11, magery 8–12. Zero power does no damage. Ordinary dungeon armor multiplies physical damage by .8; pierce bypasses it. Exposure lasts four active seconds, consumed by the next attack for 1.2× damage and armor bypass. Existing creature-profile equipment interactions remain. Ordinary health remains `round((30+6×Circle)×role/elite multiplier×1.6)`; Examiners retain 3.5 without extra 1.6, guided first targets 18 health.

- **Enemy damage:** live wind-ups release attacks after range/LOS checks. Damage remains 3–6 + 2×Circle (+2 for Examiners), modified by `BattleRules` intent; accuracy is `clamp(35,85,round(50+(difficulty−combat skill)×.65+intent accuracy))`. Armor reduction caps at 60%, Resisting Spells reduces magic up to 35%, shield Parrying remains skill/DEX based. Intent cycles use timed enemy attacks independently of committed player queries. Brute preparation does no damage; Siphon drains once on a real hit.

- **Support and practice:** four initial bandages, also added once for legacy characters missing the field; five cost 3×Circle gold. Bandage restoration is `round(6+Healing×.3+Anatomy×.12)×power`, draught up to `30×power`; wrong/shown consumes supply without healing. Active pursuit blocks food/walking health/out-of-combat recovery/rest, including paused menus. No automatic victory bandage; Second Wind retains 20% healing. Useful actions train their discipline plus bounded .35 support (physical Tactics/Anatomy, magic Evaluating Intelligence; Ward Inscription, Recover Meditation). Each useful committed action grants at most one defensive-practice budget for the first eligible shield/magic attack, including miss/block; wrong/shown/idle attacks grant none. Support practice grants no attributes.

### Battle interface

The compact landscape top bar has icon buttons for Bag, Skills, Ledger and Journal, plus inline HP, Mana and Stamina meters. Below the top bar on the right, basic actions sit beside four numbered slots for learned Techniques or Hide. Steal and Backstab retain their contextual openings. The upper-left minimap opens the full map, and the joystick midway down the left edge controls movement. Close a menu with × to return to the world. Bag shows worn equipment and the paper doll beside inventory and carried gold. Appearance opens cosmetic customization. Skills contains skills, Techniques, stats and character settings. Unavailable actions keep their slot and show the reason. The Techniques tab shows learned knowledge, requirements, effects, resource costs and opponent-relative SQL offsets, with four-slot equip and clear controls and safe supply selection.

Choosing a ready action opens SQL on the right while the camera frames the player and target in the remaining world area, including at short landscape heights. Arrival and conversation panels also sit beside the world. Tables and Help sit with the question. Commands, Fields, Tables and Help replace the letters in the keyboard area; Keyboard returns to typing. Draft, caret/selection, formatting and assistance remain tied to the prepared action across view changes, Back/reopen and rotation. Turning a touch device upright shows a rotate prompt and suspends world movement and live combat until landscape returns. A phone-keyboard option is retained. Notifications stay bounded and clear of SQL controls and resources.

### Hiding, Stealth and Stealing

Any character can attempt Hide after the first SQL lesson from Skills or an optional action slot. The action opens SQL and useful practice can train Hiding even when concealment fails. Hide becomes Reveal in its slot while concealed. Hiding determines concealment chance: `clamp(0,95,35+Hiding×.7−difficulty×.25−heavyArmor20)×quality`. A successful setup grants `3+floor(Stealth/8)` concealed walking steps (skill bounded at 120), consumed per tile of actual distance and displayed in the HUD, and a translucent hero. Running, teleporting, an offensive action or close detection reveals the character. Walls block sight. Higher Stealth reduces the close detection range; ordinary facing/alert behavior still applies outside concealment. SQL panels pause detection. Concealment is temporary and never restored by reloading/importing a save.

A meaningful concealed approach that gets closer to a nearby hostile target trains Stealth once per setup; stationary time, repeated tiles near an unchanged target and per-frame updates grant no training. Thieves can also approach from behind without requiring Hiding. A theft query chooses an easier purse or an identified equipment prize (−15 effective Stealing, half the purse gold). The attempt reveals the thief. Failure retains existing Circle-scaled gold fines and pursuit behavior. Rival prize pages remain part of their theft reward.

### Backstab and repeat approaches

Backstab is the thief's primary ambush attack. It requires Stealth 10, an equipped Fencing weapon, an owned Shadows page, 8 stamina, and a fresh successful concealed rear approach to an adjacent living hostile target with clear sight. Basic Fencing supplies the combat prerequisite; obsolete Arms-page ownership is removed while Shadows remains the separate covert dependency. These are skill/equipment requirements, not a class restriction. Locked skills can still use it. Dojo lessons can teach the first ten Stealth points with earned gold; they grant no attribute gains. Light Leather armor avoids the existing 20-point heavy-armor concealment penalty.

- A rear approach must actually move toward this target from the hiding origin. It is independent of whichever nearby target granted the once-per-hide Stealth practice. The rear arc is at least 120 degrees away from the target's facing; the rear check allows at most 1.6 tiles and ordinary engagement must also pass the shared unobstructed contact check. The short nearby cue says **Behind target** or **Backstab ready**, with the full target in its accessible label. Eligible Backstab is a contextual action outside the four learned slots.
- One SQL query uses Fencing at opponent Circle and delivers two thrusts, each `2.5 + min(120,Stealth)/120` times basic damage on a correct answer. Partial quality scales the extra damage. Wrong SQL deals none; shown answers have demonstration power with no ambush multiplier. Wrong/shown trains no RPG/attributes/SQL. Accuracy/armor/support rules remain.
- Commitment spends 8 stamina, reveals even on a miss and starts shared recovery. Enemies resume independent live clocks; no automatic response/resource rebate. Invalid openings reject before SQL credit/training. Opening SQL preserves target facing/position. One concealment cannot fuel another attack.
- After commitment the thief can run, break observation and Hide again. An alerted/pursuing enemy with sight within 6.5 tiles blocks Hide. Concealed rear detection stays `max(.45,.85−Stealth/300)`, frontal `max(.65,1.7−Stealth/120)`. Running reveals; short step budgets make cover/positioning important.
- Wounds and separate player-query/enemy-attack phases belong to the active character and exact entity for the live scene session. Brief retreat/re-entry retains them; full return restores a fresh enemy. Death, character/world replacement, reload or entity/floor replacement clears them. Paused queries/menus/background time cannot expire them. No persistent wounded-monster subsystem is added.
- Ambush/direct attack engages that entity. Neutral inspection can back away; engaged enemies physically pursue under awareness/leash rules. Re-entry adds no flat damage tax or fresh encounter before full return. Deliberately challenged Examiners retain pursuit at their rings including Aldermoot.
- Rewards require a real victory. Backstab/escape/re-entry grants no kill, seal, mark or corpse loot early. A successful purse or prize lift exhausts that living creature's theft rewards, while ordinary combat loot remains available; a genuine new spawn has fresh pockets. Full surface reload still regenerates the population under the existing lifecycle.

Optional surface treasure and dungeon caches offer Lockpicking with disarming or Tactics to force the lock, through SQL. Difficulty is `min(95,12+(region−1)×10+floor×2)`; odds `clamp(10,95,50+2×(skill−difficulty)+disarm15)×quality`. Failed attempts cost a little health, capped to leave one health; successful openings persist for the day. Existing story keys, lieutenant seals, keeper requirements and vault rewards remain separate.

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
- **Steal:** (12 × circle + 8) purse gold and double materials; selecting an identified prize gives that item at half gold and −15 effective skill. Rewards are limited to one successful lift per living creature.
- **Elites:** a sigil, plus 1.5% bless deed and 6% Scroll of Study. Combat page rewards are removed; rare Techniques follow the separate drop rule below.
- **Lair leader**, once per day per character: +40 × circle gold, a rare-or-better item, a rune chance, 20% Scroll of Study, and a 5% power scroll in circles 6+.
- **Examiner:**
  - First kill: (60 × circle + 40) gold and 2 sigils.
  - Repeat kills: 40% of the gold and 1 sigil.
  - Also: the unique the first time, otherwise a rare or better; the bless chance above; power scrolls in circles 5+ (60% first, 15% repeat); 50% Scroll of Study.
- **Dungeon vault chest**, once per character per day after the floor seals and keeper: 30 × circle + 20 gold, 4–6 materials, 1–2 sigils, a rare+ item, 6% bless, 30% Study scroll, 12% special dye. Each floor also has an optional daily cache (see Dungeons).
- **Exercises (contracts):** 84 in all, 9–12 per circle.
  - First completion **per account**: (15 × circle + 10) gold × 1.2 if clean (−0.25 with hint 2, ×0.25 at hint 3), 1 material, 30% item.
  - Repeats teach but pay nothing.
- **Daily drills:** five per day at (8 × circle + 6) gold each, plus a chest for all five.
- **Bounties:** 33.
- **Errands:** hunt, find, deliver and bring, for country folk.
- **Rumors:** one per tavern after 5 exercises, leading to a named rare and a rare crafting pattern.
- **Lost Ledger Great Truths:** 60 + 30 × index gold, once per account, plus a permanent gift.
- **Sell values:** items sell to vendors at sum(stats) × 3 + {4, 12, 35, 90, 250} by rarity. Shop prices are {20, 60, 160, 420, 1200} × (1 + 0.2 × tier).
- **Selling:** approach a stallkeeper or travelling trader and choose Sell goods. Select an individual unequipped piece, all unworn common gear, hides, or one spare already-learned ability scroll, then review the named goods and total before confirming. Equipped and named unique gear are kept. Bag/item screens direct players to a vendor; proximity, character/world, vendor and the quoted goods are rechecked when confirming. Hides remain 3 gold each and duplicate scrolls 20 × Circle each.

Rough value per kill: about 22 gold in circle 1 and about 69 in circle 8, counting the sale value of drops.

### Complete head styles

Creation and Appearance offer twelve complete head styles for each body. Hair and beard are painted together on the same face; the independent hair/facial-hair selectors are replaced by one named style picker, with a close-up preview and appearance thumbnails. Five skin tones and seven hair colours remain. Creation choices are free; later complete style changes cost 30 gold outside the guide. Existing appearances map to the closest style using hair/beard type, retain tone/colour and save a stable `app.headStyle` ID. The painted system extends each stable head style to five world source directions plus the frontal paperdoll view; locally mirrored heads complete eight directions while body and equipment banks use eight native headings. Headwear stays separately fitted.

## 8. Items

The coordinated equipment, horse, town-interaction, appearance and deletion release is live at `f8dc391`. [Release evidence](RELEASE_HISTORY.md#equipment-horses-and-lived-in-towns) · [Closed plan](plans/2026-11-25-equipment-mounts-and-lived-in-towns.md)

- **Slots:** weapon, shield, head, armor, hands, feet, cloak, ring, charm, relic.
- **Rarity** weights common 60 / uncommon 26 / rare 10 / epic 3.3 / legendary 0.7, with the top three scaling up with luck. Newly generated Masterwork equipment or equipment made of Circle VIII materials displays at Rare or higher. The initial roll still sets the physical base.
- **Weapons:** the base damage bonus is [6, 12, 20, 30, 42] by base rarity + 2 × tier + 0–3. Material, craftsmanship and enchantment contributions are stored independently. A weapon only improves its associated combat skill. Twenty weapon shapes remain across four combat skills. A higher displayed rarity earned through magic does not recalculate the physical base.
- **Materials:** five ranks are eligible at Circles 1, 3, 4, 6 and 8. Metal: Iron / Steel / Tempered Steel / Moonsteel / Starsteel (+0/3/5/8/11 damage or defence points). Wood: Ash / Yew / Walnut / Blackwood / Ironwood (+0/3/5/8/11). Leather: Tanned / Waxed / Boiled / Laminated / Riveted (+0/2/4/6/8). Cloth: Wool / Linen / Silk / Brocade / Quilted Silk (+0/1/3/5/7). Bone, crystal and glass retain their own appropriate shapes. Old Silvered/Gilded/Oak finishes remain recognizable on legacy equipment. Actual materials control painted icons, held equipment, paperdoll surfaces and moving outfits, preserving source shading and skin.
- **Craftsmanship:** Standard adds nothing; Fine adds 12%, Exceptional 25%, Masterwork 40% of the physical base plus material contribution, rounded up. Physical-gear workmanship never multiplies magic or economic affixes. Rings and charms retain their separate legacy Exceptional crafting rule, which increases their existing affixes by 25%. Successful crafting rolls workmanship using actual skill, query quality, difficulty and rare Pattern-page eligibility. Masterwork needs skill 70 and a fully correct answer. Material is an explicit crafting choice; armour construction includes leather, mail, plate and robes. Robes have half the generated base defence rounded up and add 3 + 2 × base-rarity rank skill-gain bonus.
- **Magic I–V:** eligibility begins at Circles 1/3/4/6/8. Compatible weapon effects are Power, Embers, Slaying (undead), Precision, and Focus on magical implements. Armour/shields/head/hands/feet/cloaks support Protection, Warding, Vitality, Focus, Quieting and Endurance. There is one main enchantment per item. The exact values and eligibility are owned by `EquipmentRules.ENCHANTMENTS`. All offensive bonuses obey attack accuracy, the matching skill and SQL power; zero useful query power cannot inflict magical damage. Embers is 1.5× against frost creatures and 0.5× against fire creatures. Precision adds chance points before the 95% cap. Warding joins equipment defence only against magic, still capped at 60%; Vitality/Endurance raise actual maximum health/stamina through normalization, recovery and reload. Focus saves mana up to half the original spell cost. Quieting adds actual hiding-chance points before SQL scaling and the normal cap.
- **Drops:** monster/region Circle limits material ranks and maximum enchantment level. Ordinary magical-item chances by Circle are 8/10/13/17/22/28/34/40%, before bounded luck (maximum 60); luck increases the chance up to 1.5× and weights higher eligible levels, never unlocking a forbidden rank. Lower magic levels remain more common within every pool. Existing item-drop rates, boss guarantees and crafting/covert-page rewards remain. Shops provide unenchanted stock; adventuring supplies naturally enchanted equipment and crafting materials.
- **Enchanting:** approach a workbench, choose an item and a compatible effect. Application is guaranteed for the shown gold/components, with no destruction. Upgrades I–V cost 35/90/180/360/700 gold, 2/4/6/8/10 materials of Circle 1/3/4/6/8 respectively, plus 0/1/2/3/4 sigils. A different effect replaces the current enchantment at I. Exact quote, item, character and live service must still match before any charge; repeat/stale taps cannot spend twice. Magic I/II/III/IV–V promotes overall rarity to at least uncommon/rare/epic/legendary without multiplying base stats.
- **Item details:** numerical base/material/workmanship/magic/legacy/total contributions. Weapon comparison uses the current character, basic attack, actual skill/accuracy/strike count and runtime rounded damage. It shows expected damage per query, recovery DPS and net change, assuming fully correct basic SQL against the selected creature profile; excludes SQL time, special techniques, movement and live pressure. Armour compares capped physical/magical mitigation.
- **Migration:** legacy item IDs, names, stats, blessing/insurance and ownership remain intact. Their effective bonuses appear under Legacy rather than being invented as new material/workmanship contributions. Stable identity, horse ownership, head style and version-1 equipment metadata are optional fields inside the compatible character-v8/account-v9 envelope. Older readers retain them. Legacy v5–v8 characters and early unpublished v9 drafts are accepted; drafts normalize to v8 without losing progress.
- **Armour and other gear:**
  - Armour and shields give defence.
  - Head, hands, feet and cloak give smaller defence.
  - Cloaks and wizard hats add luck or learn.
  - Thief's Gloves (30% of hand drops) add deftness, which helps stealing and half of hiding.
  - The shield slot can roll a Glass Orb or Spellbook, which adds learn.
  - Rings, charms and relics roll gold, learn or luck.
- **Crafting** at a workbench: a query against the recipe's difficulty.
  - Failing ruins half the materials.
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
| Five bandages | 3 × circle |
| Material | 6 × circle |
| Hint key | 22 × circle (one a day) |
| Rest at the tavern / healer | 4 × circle / 3 × circle |
| Shop gear | see above; a stall sells up to an epic |
| Bless deed | 1,500 |
| Insurance | 20% of shop price per fall |
| Dojo entry | 15 × circle |
| Dojo lessons (`TRAIN_CAP` 45) | 10 + 1.5 × current skill per point. Healing 30→35 is about 255; 0→45 is about 1,900 |
| Appearance (after the guide) | body/build 250 each, complete head style 30, hair colour 20, headwear 15, clothes 10, dye 25 |
| House deeds | 300 (log cottage) to 10,500 (stone manor) |
| House upgrades | extra chest 400 × n (up to 4 more), feather bed 900, garden 700, paint 40 a coat |
| Card room and games | the stakes |

### Riding horses

Every town has a staffed stable. A bay riding horse costs 650 gold once per character. Ownership and mounted state save with that character and stay isolated across slots/worlds. Hero offers Mount horse / Dismount; mounting requires outdoors and no active pursuit, battle or skill query. Outer joystick pace is 1.7× current running speed (about 6.09 tiles/s before the existing travel gift); inner/keyboard pace is about 4.17 tiles/s. Existing swept collision still prevents crossing walls/corners. Entering a building, dungeon, dojo, upper room, ship or combat dismounts immediately, including synchronous saves. Mounting reveals concealment; hiding requires dismounting. No permanent horse loss, feeding or upkeep charges. The customized rider sits on a directional painted horse with distance-based hoof motion.

## 10. Houses

- **Buying:** deeds from any banker in 10 shapes × 3 materials (stone ×1.5, timber ×1.25, log ×1). You place one anywhere open outside town.
- **Restoration:** a safe saved plot stays fixed. An invalid plot searches all four sides of expanding bounded rings in its saved region, retaining collision, clearance, protected-ground, reachability and occupant restrictions; house identity and stored contents persist.
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
- **Prizes**, paid once per household:
  - champion: 120 × circle gold and a token
  - master: 60 × circle gold, the town's prize item, a bless deed, and a power scroll in towns 5–8
- **Story beats:** masters tell the main about Ilva after losing, and Sorrel leaves a note in the next dojo.

**Onboarding.** Each town's three named students now explain their Circle's techniques, show a worked example and offer repeatable practice. Masters offer mixed reviews. In Tallyport, Davy teaches sorting and ties, Ines teaches top and bottom lists, and Bo teaches duplicate removal. Hesper covers calculations and output names. Ledger → Lessons keeps introduced techniques available for review, with links to practice. Town contracts also introduce the techniques they teach.

Teaching bouts are free and untimed. The first to three scored exchanges wins. Independent correct first submissions win a player's exchange, and executable wrong first submissions win the specialist's exchange. Hints, shown answers and syntax retries are available for practice and do not score. Teaching bouts preserve your gear, supplies, gold, health, mana, stamina, RPG skills and attributes, including when you lose or leave. Correct independent queries can build the existing SQL technique records and earn a first-time command reward that the household has yet to receive.

Readiness advises the player when to try the same techniques in the wilderness or dungeons. A technique becomes ready after three unassisted correct first submissions among its latest four distinct scored attempts, covering at least two structures and two datasets. Independent executable mistakes occupy the window. Exact repeats cannot earn duplicate evidence within the window, and later fresh questions can replace early mistakes. Query correctness supplies power while character skills still govern accuracy and other RPG outcomes.

- Win an untimed mixed teaching bout with three independent scored successes to learn that dojo's Techniques for swords, fencing, archery and Magery, regardless of current build. Specialist SQL practice, paid skill lessons and tournament/household prizes remain distinct. Requirements are 50/60/70/80/90/92/95/98/100; dojos 1–7 teach the first seven thresholds and dojo 8 teaches 98 and 100. New characters start with basics; the guide's old combat-page purchase is replaced by free technique training.

- Ordinary techniques ask opponent SQL Circle +1; exceptional rare techniques require skill 95 and ask +2. Increasing technique tier never increases that offset. Real Circle IX/X questions combine CTEs, joins, grouping and windows; free advanced practice is available at Aldermoot's dojo. Self support uses the highest engaged opponent's Circle or the local Circle when safe, preventing a harmless selected creature from discounting its SQL.

- Legacy owned/bag combat pages convert once to ordinary technique knowledge. They never grant the new rare techniques. Vendors/general finds retain crafting/covert notes; dangerous live victories in Circles V–VIII have a .3% chance of a rare teaching document. Guaranteed old rare spell pages are removed from new starter/vault rewards by the dungeon adapter. Named gear, gold, seals, story and household prize rules remain. Techniques and equipped order survive actual older-reader autosaves in the existing envelope.

## 12. Other systems

- **SQL editing:** queries may include line (`--`) and block (`/* ... */`) comments. Format retains comments and quoted names; comment punctuation does not create extra statements. The sandbox shows SELECT results even when the query starts with a comment. Combat controls wrap below the title when needed, and feedback/fishing controls use readable colors on dark panels.

- **Modular walk-in buildings** (`Buildings`, `BuildingView`, `scene_world.js`): all eight regional families use painted structural fronts, posts, corners, side walls, matching upper storeys and joined roof sections. Rectangles, L wings and courtyard plans share their real floor cells and north/east/south/west door openings with collision. Roofs and obstructing walls fade while inside; central courtyards remain open. Regional floors and furniture preserve each town's materials. Tavern, shop and bank keepers stand indoors in all eight towns. Public warehouses, the capital inn, palace and temple have explicit entrances. Small countryside facades, dojo halls and recolourable player houses reuse the regional component renderer; owned-house material choices, shapes, tints and logical clearance remain. Indoor and dungeon stairs use painted regional ascent/descent pieces at unchanged travel points. All 28 dungeon floors retain authored paving, passages, gates, rewards, expeditions and saves beneath painted masonry/coping/recesses; obsolete decorative surface-entrance rock posts are removed.
- **Aldermoot, the capital:** a walled 160×130-tile city envelope with a ceremonial palace, temple garden, gate, harbour, dense houses and workshops. Six districts are Council Terrace, Temple & Gardens, Grand Market, Merchants’ Quarter, Harbour and Residential Wards. Twelve Grand Market specialists sell distinct existing goods/services at existing prices: Weaponsmith, Armourer, Fletcher, Bookseller, Apothecary, Baker, Fishmonger, Clothier, Carpenter, Stonemason, Jeweller and Provisioner. Additional residents, visitors, messengers and dockworkers populate the streets. The council remains the political authority.
- **Tallyport Harbour:** a working waterfront west of the existing novice town core, with a sea-connected basin, stone quays, three substantial wooden piers, warehouses, lighthouse, cargo props and a separate ferry berth. The Marigold is the large three-masted ship beside the arrival pier; a cog and passenger ferry are also visibly moored. Inspecting the Marigold identifies it. The first-day route and guide identities remain intact.
- **Guided first day** (`GD`, Tamsin): Tamsin introduces herself aboard the Marigold, accompanies the player along walkable surface routes, and waits outside the dojo/dungeon. Her queued speech is tied to the current character/objective, waits until arrival and speaking distance, and waits for encounter/results screens and tutorial popups to close before speaking. Stable guide indices preserve existing progress; switching/loading reconciles her presence.
- **Technique teaching and feedback:** free dojo training replaces guided combat-page purchasing without changing objective indices. Basics remain available before special skill thresholds. Practice/paid lessons retain prominent before → after gains/losses. Crafting/covert notes remain separate.
- **Journal:** Your next step appears first with a return to Adventure. After the guide, an exercise-count objective becomes a suggestion naming an unfinished exercise and the person to speak to. Expandable sections separate optional local SQL practice and named exercise givers, Trials marks, Ilva’s story pages, completed exercises and basic instructions. Ilva’s notes are distinguished from combat Techniques and crafting/covert notes.
- **First SQL lesson:** Odalys uses an isolated three-row `manifest` (name, quantity, destination). Interactive row/column identification and result prediction precede query assembly, then six typed tasks introduce single columns, commas, `*`, and an explicit transition to the town Ledger. Results remain visible between tasks. A safe basic-action practice precedes the guided outdoor encounter. Hide and Recover become usable after the first SQL lesson. Guided Tallyport encounters, skill actions and all three fishing casts stay with First Circle SELECT/FROM forms until the player leaves the guide. Casting farther still increases physical difficulty. Existing `seen` markers resume completed lesson checkpoints, and replaying a completed intro gives no additional 25-gold payout. Ledger → Lessons → First SQL lesson reopens the full explanation.
- **Supplies:** Bag lists each food/draught name, quantity and healing effect. Tapping opens an Eat/Drink action and explains full health or unavailable use. Dark bread heals up to 12 HP; Healing Draught up to 30. Only missing health is restored and one item is consumed. Food guidance accepts full health without requiring damage.
- **Reward feedback:** earned gold uses the existing gold-pile icon and actual credited `+amount gold`, including bonuses/rounding, in result panels and positive-gain notifications. Transfers and body recovery retain their own descriptions. Repeated unpaid exercises show no new payout.
- **Story continuity:** `docs/STORY_BIBLE.md` records the cast, chronology, Ledger/practice rules and scene knowledge. Ilva’s archive and Trials can be completed in either order; both together record the council’s public admission and reopening of the archive in the Journal. The light appears forty narrative days after the rescue (`2026-06-14` → `2026-07-24`); there is no wall-clock deadline.
- **Recover:** outside combat, Recover starts a SQL question when mana or stamina is below its maximum. Useful restoration can train Meditation. At full resources, Recover directs you to free dojo practice.
- **Question variety:** guided Tallyport combat, skillwork and fishing choose among basic SELECT/FROM projections. Regional activities can select different authored problems within the original Circle and question family, with a preference for structures and datasets the player saw less recently. Before an unfamiliar required technique can affect a committed action, the prompt offers a short explanation and a route to safe practice.
- **Fishing:** a skill and a cast screen. SQL answers decide the catch, and higher skill unlocks rare fish and sunken things.
- **Card room:** every region has a 14×10 gaming room with five seated patrons and separate dealers for poker, blackjack and the wheel. Walk to the relevant table to join its game. A 12×8 stable adds stalls, two visible horses and a keeper. Taverns, banks, shops, infirmaries, guildhalls, workshops, dojos and civic rooms receive furnishings and residents suited to their work. Visible business signs have a minimum 44 CSS-pixel tap target and identify the premises and its services. Walk up to the staff or station to use a service. Casino discovery keeps its published ID. Stable discovery uses a region ID independent of parcel coordinates. Town maps include discovered outlying venues. Blind Tally's big blind ranges from 2 to 500 gold across the eight rooms. Players can query hand counts in Blind Tally, past spins at the Crooked Wheel, and cards already dealt from the Count's blackjack shoe.
- **Rivals:** one per region, who duels you or steals from you.
- **Luck:** gear luck + 3 per streak step, up to 10 steps.
- **Gifts from Great Truths:** gold 10%, luck 10, damage 10%, learn 15%, defence 8%.
- **Bank:** 60 item slots per character.
- **Learned commands** (`CMDS` in quests.js, `A.cmds`, shared within each world):
  - The Commands panel on the query keyboard lists only commands you have been taught. Symbols are always there: `,` `*` `'` on top, and a Symbols button for the rest (`( ) % . ; || + - /`). You can always type any command with the letter keys.
  - **Taught:** opening a lesson (a contract with a lesson, or the intro's Lesson 3 once the blanks are right) adds that lesson's commands to the panel, with a toast "New in Commands: ORDER BY". About 39 lessons add commands.
  - **Learned:** the first correct query (exercise, fight, duel or cast) that uses any command from a lesson marks it learned: toast "Learned ORDER BY! +1 Hint Key" and one Hint Key, once per lesson in each world.
  - Hero tab → "Commands learned · n of 39" lists them; untaught ones show "?".
  - Supporting characters share their world's list. Existing characters were filled in from lessons already seen or done. Lesson examples also add taught command tokens to the keyboard. Prior lesson and command progress can mark related techniques introduced.
- **Sound** (`src/audio.js`): contextual fantasy-game music and generated effects; the complete classical refresh is verified at `e6075e4`, tracked in the [batch plan](plans/2026-11-25-classical-audio-batch.md).
  - Music: acoustic classical strings and woodwinds, with no requested percussion or modern backbeat. The 28 tracks/cues cover eight towns, eight dungeons, four wilderness region pairs, regular/Examiner combat, title, tavern, dojo, card room, victory and death. Combat/dungeon/title keep priority; dedicated venue themes return to the correct location when the venue closes. Outdoor theme candidates settle for five continuous seconds; returning cancels them. Title music starts after a user gesture.
  - Tracks crossfade over 1.6 seconds; combat/cues enter with a shorter handoff. Location/venue music resumes at its saved position after combat or a cue; combat restarts. Victory/death play once before resuming the location. Music and effect mute stay independent. With music muted, generated victory/death cues can play through effects; cold/failed samples retain immediate synthesis feedback. Hidden tabs stop playback and cancel effect loads. Two decoded music tracks are cached. At most two music requests run together so combat/cues can take priority without cancelling a healthy location download; obsolete completions never interrupt the current context.
  - Effects: prepared samples cover varied sword/fencing/bow attacks, hit/hurt/miss, eight creature voice families, healing, transactions, rare rewards, query grades and quiet clicks. Crafting distinguishes smithing/alchemy/failure; fishing distinguishes casting/catch/empty line. The candidate footstep refresh adds quiet sand/snow contacts and distinguishes near-silent grass from dirt paths; four variations per sample family and production levels are recorded in 03_ART_STYLE.md. Doors distinguish opening and closing. Failed purchases and quiet passive recovery retain their current behavior.
  - Magic retains all eight spell identities and existing rare emphasis. Cast and impact samples are separate; spells/arrows still travel 0.26 seconds before hit/miss presentation. Misses fizzle; healing stays separate from damage flashes. No progression, damage or save rules change.
  - Subdued harbour/market/hearth/cave/drip/draft cues play at existing 10–17 second active-world opportunities, with the shared seven-second cooldown. They stop across context changes and obey effects mute; continuous ambience remains planned.
  - Effects use a 24-entry/4 MiB LRU, at most two downloads, 16 queued requests and 12 sample voices. Cold samples give immediate synthesis, load for a subsequent event and never produce delayed duplicate feedback. Frequent world cues remain throttled.
  - Bus levels remain music 0.55/effects 0.7. Hero → Sound persists separate music/effects settings per device. Audio unlocks on touch/keyboard; iOS 17+ playback session is requested. Subjective listening and physical iPhone/silent-switch behavior remain unverified.

### Professional work

Workbench Carpentry crafts storage chests (6 regional materials, difficulty 25), feather beds (12, difficulty 45) and study shelves (8, difficulty 35). Inscription crafts prepared spell scrolls (3, difficulty 30). Regional work adds five difficulty per later region, capped at 95. Success consumes full materials and creates the furnishing/scroll; spoiled work consumes half rounded up. Install furniture through the actual owned-house panel. Chests add ten storage slots up to five crafted expansions; beds use the existing well-rested effect; shelves grant ten minutes of doubled gains and cannot be refreshed during that period. Existing paid house upgrades remain available.

## 13. Planned, not built

- **Remaining validation:** physical iPhone/Home Screen/native-keyboard behavior and a complete newly earned dungeon expedition remain unverified; released behavior and evidence are recorded in release history.
- Boats beyond the existing ferries remain deferred.
- Cloaks, gloves and boots don't show on the body yet.
- Dialogue portraits still use the old eight hero portraits.
- Duel opponent speed needs playtest tuning.
- Further professions: mining, lumberjacking, cooking, scouting, poisoning, mace fighting, wrestling, bard disciplines and animal companions remain deferred.
- Rumors are per character. Their unique can only be found once per world household.
- **Further sound effects:** continuous regional ambience, occasional idle creature calls and separate creature death voices remain planned. Town/dungeon/wilderness, combat/title and victory/death music plus occasional contextual ambience are built as described above; dedicated venue themes now play.
- Not yet checked on Casey's iPhone: that audio plays in the Claude app, and what the silent switch does.

## Boat intro

A new main character chooses appearance and former profession, then is hauled aboard the Marigold in the playable scene. Tamsin introduces herself, asks their name and homeland, recognizes their profession-specific reputation from merchant crews, and questions a journey that ordinary sailing cannot explain. Sunspire, Sylvanreach and Dwarrowdeep are existing distant trade realms, not new playable regions. The player walks on deck, meets Tamsin, can inspect cargo, rests during the three-day crossing, and walks off the gangplank at Tallyport. Tamsin first explains SQL as the language that gives skilled actions their power, then explains Corin and the Trials ashore. Odalys explicitly uses the manifest as safe query practice before a weapon/spell demonstration. She defines SQL and the Ledger before tables, rows, columns, queries and results; the source cargo, read-only teaching copy, full company records and safe ability practice have explicit handoffs. The entrance-cellar guardian, guided utility work and all guided Tallyport fishing casts use the SELECT/FROM forms taught that day. Existing guide indices, supplies, gold awards, equipment/paper-doll arming and the later story remain in place. The verified release is recorded in `RELEASE_HISTORY.md` and the completed boat-intro plan.

**Onboarding.** A new arrival is from Sunspire. Tamsin still asks where the character was before the rescue, recognizes their reputation and puzzles over the impossible crossing. Older characters keep their established home. Before landfall, Tamsin introduces the upper-left minimap and the Bag, Skills and Ledger icons. Tap the minimap to see her coastal chart with the Marigold and Tallyport. Close each view with × to return to the deck and the current dialogue. Continue stays visible below the scrolling dialogue. Ashore, walking fills the exploration map, and paid map surveys grant their existing travel rights. The orientation resumes from its last saved checkpoint. Skipping continues directly to the dock.

## Decision log

- 2026-11-27: Casey moved Journal to the top icon row, centered the joystick down the left edge and raised the right-side actions to the top bar for thumb reach.

- 2026-11-27: Casey approved the landscape release with a tappable minimap and a combined equipment and inventory Bag. Any character can practise Hiding and assign Hide to a shortcut alongside learned Techniques. [Landscape controls and Bag plan](plans/2026-11-27-landscape-controls-and-bag.md)

- 2026-11-27: Casey chose landscape phone play. Keep the character visible beside dialogue and action SQL, and let text wrap or scroll at readable sizes.

- 2026-11-27: Published the coordinated landscape interface, four-slot Technique Book, Magery/live-combat rules and 28-floor spatial redesign after the complete required gate. Current sections describe shipped behavior; [release history](RELEASE_HISTORY.md#landscape-techniques-live-combat-and-dungeon-redesign) records exact UTC identity, automated/public checks and remaining validation.

- 2026-11-27: Implement the landscape shell, persistent top-right resources, four stable technique slots, Technique Book and on-demand SQL/reference views against the authoritative gameplay adapter. Keep portrait/short-height fallbacks, preserve actor/world geometry during rotation and prevent action controls from covering paused activities. Publication remains gated by the combined plan.

- 2026-11-27: Casey authorized globally paused SQL/live movement, discipline-sensitive recovery, LOS/aggro/natural escape and per-character dojo Techniques/Magery. Owning sections now describe candidate source instead of obsolete exchange/page rules; the gameplay plan records focused evidence and the UI coordinator owns publication.

- 2026-11-27: Casey authorized unique dungeon layouts independently of the combat prototype. Preserve story/floor/seal/keeper/starter requirements while introducing regional circulation, real cover, scale contrasts and return routes. Reuse approved art; combat dimensions remain tunable. Per the coordinated technique transition, future starter/vault rewards no longer create guaranteed legacy rare Spell pages; other loot and story rewards retain their existing rules.

- 2026-11-27: The coordinated dungeon candidate consumes shared live enemy profiles and sight/fire rules rather than the former caster response-round count. Retain dungeon health/difficulty, rewards and progression; geometry and revision-2 migration remain candidate behavior until the coordinator verifies and publishes the combined build.

- 2026-11-27: Casey requested loot that fits each enemy. Use explicit species profiles for wildlife, hostile beasts, magical creatures, constructs and carriers; bonuses and theft obey the same restrictions. Preserve chest and earned challenge rewards, and keep the guided equipment upgrade with Tamsin.

- 2026-11-26: Casey requested a full build plan for landscape battle presentation, four equipped Techniques and the Technique Book. Keep HP, mana and stamina visible at the top right; put Tables/Help with the question and use Commands/Fields/reference views in place of letter keys while preserving the SQL draft. Record live-world combat integration and unresolved baseline actions, technique/Magery rules and migration as dependencies. This records planned design only and does not authorize implementation or publication; the [build plan](plans/2026-11-26-landscape-battle-ui.md) owns execution status.

- 2026-11-26: Casey requested one character entry in the bottom-middle Hero control, clearer numerical practice gains, an explained ability-page purchase, vendor-only individual sales, and a journal led by the next action. Keep equipped/named gear protected, review exact goods before selling, and separate optional/reference records from current guidance. Character artwork and locomotion are assigned to a separate task.

- 2026-11-26: Keep boat-intro actions outside the scrolling dialogue so new players can see how to continue without discovering hidden controls below long text.

- 2026-11-26: Released six body profiles, fitted equipment/materials/dyes, matching frontal dolls, authored NPC builds and corrected source walk/run/sitting/battle actions. Preserve physical world dimensions and account-v9/character-v8 compatibility; release history owns verification scope.

- 2026-11-26: Casey chose the full painted body/clothing/action/paper-doll system, with average, muscular and heavy profiles for both sexes. NPC builds must be based on who the person is; authored choices do not change statistics. Keep cloth dye separate from actual armor, glove, boot, headgear and weapon material colors. Use the selected quieter Mixamo walk/run cadence and preserve existing doors/furniture. Release evidence is tracked in the painted character plan.

- 2026-11-25: Casey approved implementing and publishing the reviewed onboarding and dojo plan. The released implementation gives new arrivals a fixed Sunspire origin, teaches the five-tab tray aboard the Marigold, and adds free specialist practice and advisory household readiness in all eight towns. Question selection follows existing regional and encounter identities. The closed plan links verified release evidence.

- 2026-11-25: Released equipment/material/craft/magic comparison and enchanting, riding horses, lived-in premises/signs/terrain, curated heads, Home Screen icons and verified deletion at `f8dc391`. Current sections describe shipped behavior; [release history](RELEASE_HISTORY.md#equipment-horses-and-lived-in-towns) and the closed coordinated plan retain evidence and limits.

- 2026-11-25: Casey requested a full plan before development for boat-wide navigation orientation, an incomplete map, dojo SQL specialists with safe repeatable practice, question diversity at the current learning level and removal of the homeland picker. Preserve the journey's story significance and omit a player label. The initial plan held implementation and publication until Casey approved the work.

- 2026-11-25: Released the complete classical music/effect batch at `e6075e4`: all 28 music entries and 64 effects, with prior landscape/recovery preserved. Core, 63 selected CI browser cases, Pages and six hosted flows passed. Independent source/HTML and all 92 served audio hashes matched. The closed batch plan and release history retain exact evidence, prompts and subjective-listening/physical-device limits.

- 2026-11-25: Casey expanded the unpublished Tallyport trial to all 28 music entries and 64 effects. The classical batch preserves every context, event hook, sound preference, cache bound and save rule; strings and woodwinds replace the score's earlier percussion palette. Generate/download the whole batch before game integration, then publish together after technical/browser checks. The [batch plan](plans/2026-11-25-classical-audio-batch.md) records release status and listening limits.

- 2026-11-25: Casey requested a single Tallyport music test with the approved classical strings/woodwinds brief and no percussion. The candidate keeps town routing and independent music/effects preferences; other town, venue, wilderness and battle tracks stay unchanged. Published status and verification belong in release history.

- 2026-11-25: Verified the whole-world living-landscape release at `3c80162` with core, all 495 browser cases and six CI hosted flows. Physical navigation, saves and gameplay RNG remain intact. Current descriptions now mark the vegetation kit as shipped; the plan and release history retain the exact hash, repaired fixture failures and hosted CDN availability limits.

- 2026-11-25: Managed orchard rows are part of the approved whole-world living-landscape pass. They reuse existing trunks near temperate farms/beekeepers and preserve all collision, navigation and saves. They add scenery rather than a new harvesting/reward mechanic; publication remains owned by the landscape plan.

- 2026-11-25: Casey authorized the entire living-landscape pass across all eight regions: diverse species/ages, undergrowth and ground integration, natural patches, signs of use, restrained movement and readable actors. Develop in an isolated worktree and wait for concurrent publishers; the living-landscape plan owns implementation and release evidence.

- 2026-11-25: Verified combined supported-stair/grounded-locomotion recovery at `359f497`: full CI, Pages and hosted checks passed. Current descriptions now reflect wall-supported ascents, relocated arrivals and the rebuilt gait. Release history records exact source/hash, prior repaired failures and the independent offline CDN 503 limitation; the landscape release is recorded separately.

- 2026-11-25: Recovery release `359f497` removes healthy wilderness-track cancellation during combat entry. Priority music uses one bounded extra request while preserving two decoded buffers, cue behavior and resume positions; genuine failures retain timeout/backoff. No gait, combat, save or progression tuning accompanies the browser-route repair. UI-click throttling follows monotonic input time so a temporarily stalled device audio clock cannot suppress later clicks; world-event timing is retained. The combined release passed full CI/publication and hosted checks; exact evidence and CDN limits are in release history.

- 2026-11-25: Casey rejected the freestanding dungeon ascent and authorized supported wall recesses, matching masonry and relocated interaction/arrival points. Every stair must show its support, direction and connection to another level. Inspect this spatial logic at real phone/desktop size; successful scale/alpha assertions do not approve it. The stair-support plan tracks implementation and release.

- 2026-11-25: Casey expanded the grounded-cadence job to a full human locomotion rebuild: proportions, posture, arm/leg action, weight transfer and ground contact. Rebuilt pose motion determines stride and travel speed at target 132 walking / 180 running steps/min. The earlier timing-only prototype is locally verified but not the final visual solution. Prove one character on moving ground before broad outfit/direction integration; keep deployment isolated from the active town/dungeon rollout. See the expanded grounded-cadence plan.

- 2026-11-25: Casey accepts slower travel so visible footfalls match movement. Target 132 walking and 180 running steps/min, preserve stride distances, derive travel speed and emit sounds at contacts. Retain distance-based costs and relative pursuit pace. Implementation/release status is tracked in the grounded-cadence plan.

- 2026-11-25: Released painted modular architecture at `639f24e`: full 456-case CI, deployment and six CI hosted flows passed; independent source/hash and all six hosted flows passed. The closed rollout plan and release history record exact identity, visual review, repaired candidates, costs and device limits.

- 2026-11-25: Casey approved applying the modular painted finish to the whole world and all dungeons, with visible door framing instead of awnings. Preserve gameplay/layout ownership and improve stair readability; remove obsolete decorative surface-pad obstructions. Publication is authorized after full verification.

- 2026-11-24: Published character motion, intro/menu continuity and world presentation at `d3850c3`. Core, all 450 browser cases, deployment and six CI hosted flows passed; independent source/hash and all six public flows were verified. The closed polish plan and release history preserve the input-paced audio recheck, failed candidates and physical-device/subjective limits.

- 2026-11-24: Casey found the repeated intro exit misleading and the records-only SQL explanation inconsistent with skilled-action magic. Put character selection behind the portrait menu, preserve drafts/checkpoints and automatic saving, and establish the fantasy purpose before using records for practice. The presentation corrections also retain movement speeds, collision, natural-shore depths and saved progress. The completed animation/world-polish plan records verified release evidence.

- 2026-11-24: Published the verified Stable Audio replacement at `eb8f960`. All music/effect contexts, dedicated venue tracks, independent mute/fallbacks, cache revalidation and bounded sample playback are shipped, with the surface-respawn and complete-ring house-recovery repairs. The plan and release history preserve exact-commit CI, hosted hash/flow evidence and subjective-listening/physical-device limits.

- 2026-11-24: Correct saved-house recovery to search every side of its bounded relocation rings; the former search could miss a safe plot north/south of town and reject restoration. Safe existing houses stay fixed, and relocation retains region, clearance, protected terrain, reachability and occupant restrictions. IDs and stored contents are preserved. This verification repair shipped with the audio replacement; the plan and release history record the complete gate.

- 2026-11-24: Audio-release verification exposed an intermittent surface respawn timeout. Preserve failed creature/resource placement requests and retry after one second rather than discarding the slot. Normal spawn delays, placement protection and rewards remain unchanged; pure and actual-world theft regressions cover unavailable placement and later recovery. Also stop old ambience across same-region town/wilderness transitions. This audio-release verification repair is shipped; exact checks and limitations are recorded in the replacement plan and release history.

- 2026-11-24: Casey authorized implementing and deploying the complete captured soundtrack/effect replacement. Dedicated tavern/dojo/cards music and generated per-role effects preserve independent mute, immediate fallback, responsive spell timing and bounded memory/loading. Doors distinguish opening/closing; no save, combat balance or progression change. Release verification is tracked in the audio plan.

- 2026-11-24: Casey authorized the complete worlds/living-places scope and autonomous verification/deployment, with a separate battle audit to integrate before release. Three households isolate story/shared rewards, each with one main and four supporters; banks remain individual. Free creation customization, continuous movement, stable music, readable names/text, fitted buildings/signs/edging, purposeful town activity and dungeon depth are implemented as a release candidate. Existing saves migrate into world one, account v9/character v8. Casey requested a softer actor outline after an early capture. Real iPhone Home Screen verification remains external; release evidence belongs in the linked plan/history.

- 2026-11-24: Casey approved partial SQL power and immediate paired corrections, with iterative automated battles and visual review. Added result-based attack/effect strength, compact verified/reference comparisons, explicit hint/show protections and quicker zero-power exchanges; full-correct lesson/contract completion remains. See the SQL battle feedback plan for evidence and release status.

- 2026-11-23: Casey requested repeatable truncated warrior/mage/thief playthroughs, then added stealth-and-Fencing Backstab as the thief's primary attack. The release implements a real concealed rear approach, committed high-damage thrusts, escape/pursuit and bounded same-target wounds/Examiner phase recall. Reproduced busy-Flee training, repeated theft rewards and missing caught-theft pursuit were repaired. Starting skills, stat presets, caps and gain curves remain unchanged; the closed path playthrough plan and audit preserve campaign results, failures and balance limitations. Release `dab3b4a` passed all 288 local and CI browser cases plus independent hosted verification.

- 2026-11-23: Casey authorized implementation and deployment of the full agreed UO-style skill/attribute and shared directional NPC design. Release `skills-attributes-and-directional-npcs` at aec11c0 adds twenty skills with a 700-point budget, independent STR/DEX/INT and resources, controlled replacement/targets, meaningful support actions, concealed approaches, optional locks and profession recipes. Existing saves migrate without a wipe; SQL learning remains separate. Further proposed professions remain deferred. Required local/CI checks and independent hosted verification passed; the closed plan and [release history](RELEASE_HISTORY.md#skills-attributes-and-directional-npcs) preserve evidence and limitations.


- 2026-11-23: Casey approved the complete cartography/travel plan and autonomous release, then added joystick-only touch movement, nearby screen interactions, purposeful varied buildings across all eight regions, working doors/audio, shared dojo construction, usable stairs and deeper dock water. Regional surveys cost 600–2700 gold and allow same-region travel only. The 30,000-gold capital-only Grand Atlas requires all eight surveys and an installed household table for global travel. Free local consultation, discoverable landmarks, usable ferry waypoints and physical signs remain core requirements. Release `cartography-travel-and-grand-atlas` is complete at 17441a1, with exact-commit validation and independent hosted verification recorded in RELEASE_HISTORY.md.

- 2026-11-23: Context cleanup removes shipped soundtrack coverage from Planned, not built, retaining only unfinished ambience/idle/death effects. Completed release evidence is linked from RELEASE_HISTORY.md. This corrects documentation without changing game behavior.

- 2026-11-22: Candidate `story-first-day-2026-11-22` rebuilds introductory teaching, character/quest prose and state-aware rivalry, clarifies seven regional marks plus the Audit, corrects historical evidence and ending claims, and makes supplies and gold rewards readable. Tamsin follows on the surface and waits at separate-map interiors. The existing balance and guide indices remain; safe practice has no payout/streak penalty, and completed intro replay cannot pay again. The historical archive uses authored event participants and date-consistent generated records.

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
- 2026-11-22: World rebuild release candidate (world revision 3): Casey selected Aldermoot as the large capital and Brackwater/Cinderwick as ferry islands. Added the shaped coast, working ports, modular walk-in buildings, six capital districts and existing-goods specialists. This supersedes the earlier interiors-only kit decision. Existing story/content identities and progression are preserved. Release identity is the source commit and HTML hash in release.json.

- 2026-11-23: Boat-intro/writing candidate: use an on-deck rescue and identity conversation, connected speech, explicit beginner teaching and observable rewards; preserve later story/save continuity. Release status is tracked in the boat-intro plan.

- 2026-11-23: The boat-intro teaching pass keeps guided Tallyport combat, utility work and all fishing casts within First Circle SELECT/FROM. Cast depth still changes physical difficulty; normal question Circles return after the guide. Tamsin’s queued speech waits for encounter/results screens and coach panels to close, so optional fishing does not interrupt the learner or introduce untaught SQL.

- 2026-11-24: Published the verified boat-intro/writing release, source `d516ce1`. Current behavior is described above; exact commit, Actions, hosted hash and verification limits are recorded in `RELEASE_HISTORY.md` and the completed boat-intro plan.

- 2026-11-24 (battle-risk implementation decision): Casey authorized the full combat review implementation and coordination with the worlds/living-places agent. Short exchanges, real enemy responses/intent, finite recovery, direct actions and persistent escape replace low-risk first-strike farming and free panel resets. Death penalties remain unchanged; verified combined publication evidence is recorded in release history.

- 2026-11-24: Combined battle/living-places verification caught safe-town sensing skipping the entire NPC update. Restrict safety to aggression and pursuit, preserving ordinary wandering/interpolation and the deliberate Examiner exception. Existing diagonal/corner-blocking and directional-render checks remain required.

- 2026-11-24: Meter concealment from actual travel rather than rounded cell deltas. A tick within the same rounded cell still spends one step; a later two-cell ownership change does not charge twice. Running and teleport reveal safeguards remain intact.

- 2026-11-24: Published the combined worlds/living-places and battle-risk release at `8602fa5`. Three isolated households, free creation appearance, continuous movement, stable town music, service discovery and richer readable environments ship with the battle task's short exchanges, finite recovery, direct actions and persistent pursuit. Death penalties and paused SQL thinking time remain unchanged; exact verification and limits are in release history.

- 2026-11-25: Candidate implements independent materials/workmanship/magic, explicit comparison/enchants, character-owned horses, richer premises, signs/terrain and two-stage deletion as one coordinated release. Compatible character-v8 fields preserve legacy effective gear and add stable identity/horse data; initial unpublished v9 drafts remain readable and account v9 stays compatible. Casey subsequently requested complete generated heads with integrated hair/beards; final art and release evidence remain pending in the plan.
