const Dungeons = (() => {
  const WALL = 0, FLOOR = 1, WATER = 2, HAZARD = 3, BRIDGE = 4;
  const W = 124, H = 109;

  const themes = {
    1: { id: 'bilge', floor: '#374043', alternate: '#404845', wall: '#171f24', water: '#184850', hazard: '#6d6a38', bridge: '#675647', accent: '#dcac6c', gate: 'Iron floodgate', control: 'Pump handle', secret: 'Loose mooring ring', cache: 'Dockhand’s strongbox', hazardText: 'Brine spills over the stones.' },
    2: { id: 'sluice', floor: '#394741', alternate: '#454d38', wall: '#192622', water: '#234d42', hazard: '#697442', bridge: '#716049', accent: '#b4c273', gate: 'Sluice gate', control: 'Sluice wheel', secret: 'Hollow reed screen', cache: 'Lockkeeper’s box', hazardText: 'The green shallows burn through leather.' },
    3: { id: 'barrows', floor: '#48433f', alternate: '#514943', wall: '#241f22', water: '#40565f', hazard: '#785161', bridge: '#6e6356', accent: '#d4a779', gate: 'Burial seal', control: 'Stone clasp', secret: 'Loose offering slab', cache: 'Offering coffer', hazardText: 'Violet dust rises from the cracked tiles.' },
    4: { id: 'tangle', floor: '#484638', alternate: '#514832', wall: '#222621', water: '#3b4a48', hazard: '#76683e', bridge: '#746153', accent: '#b6a96f', gate: 'Webbed passage', control: 'Taut silk cord', secret: 'Hollow root wall', cache: 'Silk-wrapped chest', hazardText: 'The yellow mushrooms sting when crushed.' },
    5: { id: 'slag', floor: '#4c3a34', alternate: '#574239', wall: '#261c20', water: '#683a2a', hazard: '#bc5229', bridge: '#756252', accent: '#ec9d58', gate: 'Vent shutter', control: 'Forge valve', secret: 'Counterweighted plate', cache: 'Tool chest', hazardText: 'Heat shimmers over the red stone.' },
    6: { id: 'crystal', floor: '#394353', alternate: '#464969', wall: '#222136', water: '#214c66', hazard: '#775598', bridge: '#61738a', accent: '#b1b7f3', gate: 'Crystal barrier', control: 'Prism switch', secret: 'Clouded mirror', cache: 'Surveyor’s case', hazardText: 'The sharp violet crystals cut on contact.' },
    7: { id: 'ice', floor: '#425363', alternate: '#4e6372', wall: '#202e40', water: '#244b66', hazard: '#58899a', bridge: '#637688', accent: '#bde4f4', gate: 'Ice barrier', control: 'Iron wedge', secret: 'Cracked ice panel', cache: 'Climber’s chest', hazardText: 'The thin blue ice breaks underfoot.' },
    8: { id: 'archive', floor: '#4d403a', alternate: '#554844', wall: '#2b2030', water: '#453a59', hazard: '#744260', bridge: '#796457', accent: '#d5ae78', gate: 'Archive grille', control: 'Brass release', secret: 'Hinged shelf', cache: 'Records chest', hazardText: 'The spilled ink eats through cloth.' }
  };

  const species = {};
  function roster(r, entries) {
    return entries.map(([id, name, role, scale, bounty, description]) => {
      species[id] = { id, art: id, name, role, scale, tpl: `b${r}0${bounty}`, description };
      return id;
    });
  }
  const rosters = {
    1: roster(1, [
      ['d11', 'Bilge Scavenger', 'skirmisher', .63, 1, 'A long-legged rat that gnaws through tarred rope.'],
      ['d12', 'Barnacle Guard', 'armored', .95, 3, 'A drowned dock guard in a coat of barnacles.'],
      ['b101', 'Wharf Rat', 'skirmisher', .32, 1, 'A grey rat from the rope piles.'],
      ['b103', 'Shore Crab', 'armored', .34, 3, 'A slow crab with a hard red shell.'],
      ['b104', 'Violet Imp', 'caster', .5, 4, 'An imp that throws sparks from the rafters.'],
      ['l04', 'Smuggler', 'brute', .83, 2, 'A smuggler with a knife and a cellar key.']
    ]),
    2: roster(2, [
      ['d21', 'Sluice Stalker', 'skirmisher', .76, 1, 'A marsh hunter with wide feet that run over the mud.'],
      ['d22', 'Reed Hexer', 'caster', .89, 4, 'A fen witch with dried reeds tied to her staff.'],
      ['b201', 'Marsh Goblin', 'skirmisher', .62, 1, 'A goblin that digs in the mud for coins.'],
      ['b202', 'Bog Leech', 'skirmisher', .38, 2, 'A fat leech that hides under wet planks.'],
      ['l08', 'Bog Witch', 'caster', .83, 4, 'A witch who lives in the marsh.'],
      ['b205', 'Fen Toad', 'brute', .32, 5, 'A stubborn toad from the reed beds.']
    ]),
    3: roster(3, [
      ['d31', 'Barrow Soldier', 'armored', .93, 1, 'A skeleton wearing the brass plates it was buried in.'],
      ['d32', 'Grave Tender', 'caster', .85, 4, 'A robed skeleton with a lamp full of burial ash.'],
      ['l16', 'Skeleton Archer', 'skirmisher', .83, 3, 'A skeleton that shoots from between the tombs.'],
      ['l15', 'Lich', 'caster', .93, 4, 'A mage buried with its spellbook.'],
      ['b302', 'Gold Slug', 'brute', .34, 2, 'A heavy slug that eats the gold from funeral wreaths.'],
      ['b304', 'Hill Wisp', 'caster', .38, 4, 'A point of cold light above the grave earth.']
    ]),
    4: roster(4, [
      ['d41', 'Root Crawler', 'skirmisher', .78, 3, 'A pale burrowing insect with jaws that chew through roots.'],
      ['d42', 'Silk Widow', 'armored', .98, 4, 'A black spider wrapped in layers of hardened silk.'],
      ['l10', 'Giant Spider', 'skirmisher', .85, 3, 'A hunting spider that waits at tunnel mouths.'],
      ['l11', 'Spider Broodmother', 'brute', 1.18, 4, 'A large spider that guards the egg sacs.'],
      ['b403', 'Grey Wolf', 'skirmisher', .59, 3, 'A grey wolf hunting underground for prey.'],
      ['b404', 'Lantern Ghost', 'caster', .75, 4, 'A lost runner carrying a lit hand lamp.']
    ]),
    5: roster(5, [
      ['d51', 'Furnace Hound', 'skirmisher', .82, 2, 'A lean hound with furnace sparks in its teeth.'],
      ['d52', 'Slag Binder', 'caster', .93, 1, 'A furnace worker holding a ladle of liquid slag.'],
      ['b501', 'Slag Golem', 'brute', 1.12, 1, 'A heavy block of forge waste that walks.'],
      ['b502', 'Ember Moth', 'skirmisher', .42, 2, 'A moth that drops hot sparks from its wings.'],
      ['b503', 'Brass Beetle', 'armored', .42, 3, 'A beetle with a brass shell.'],
      ['b504', 'Cinder Spider', 'skirmisher', .58, 4, 'A spider that spins over warm vents.']
    ]),
    6: roster(6, [
      ['d61', 'Shardling', 'armored', .71, 4, 'A small creature with bright crystals growing through its hide.'],
      ['d62', 'Crystal Seer', 'caster', .93, 2, 'A pale cave dweller carrying a lantern made of crystal.'],
      ['b601', 'Cave Ghoul', 'skirmisher', .83, 1, 'A cave hunter with keen hearing.'],
      ['b602', 'Violet Shade', 'caster', .83, 2, 'A violet shadow in the reflected light.'],
      ['b603', 'Deep Shade', 'caster', .88, 3, 'A shadow from the lowest tunnels.'],
      ['b604', 'Barrow Golem', 'brute', 1.17, 4, 'A slow creature made of stone and cave moss.']
    ]),
    7: roster(7, [
      ['d71', 'Rime Wolf', 'skirmisher', .83, 1, 'A snow-white wolf with frost packed between its claws.'],
      ['d72', 'Icebound Guard', 'armored', 1.03, 3, 'A guard with its armor frozen shut.'],
      ['l21', 'Winter Wolf', 'skirmisher', .7, 1, 'A thick-coated wolf from the mountain pass.'],
      ['l23', 'Yeti', 'brute', 1.3, 3, 'A large cave dweller with white fur.'],
      ['b702', 'Ice Wisp', 'caster', .42, 2, 'A blue-white light that drifts above the frozen floor.'],
      ['b704', 'Snow Ghost', 'caster', .83, 4, 'A ghost in the clothes of a mountain runner.']
    ]),
    8: roster(8, [
      ['d81', 'Index Automaton', 'armored', .96, 4, 'A brass clerk with a bundle of index cards in its chest.'],
      ['d82', 'Ink Familiar', 'caster', .68, 1, 'A small creature made from a spell and a bottle of ink.'],
      ['l29', 'Ink Hound', 'skirmisher', .6, 1, 'A hound that leaves wet footprints across the shelves.'],
      ['l30', 'Cloaked Archivist', 'caster', .83, 2, 'An archivist who still guards the restricted shelves.'],
      ['l31', 'Archivist Guard', 'armored', .83, 3, 'A guard in a coat lined with plates.'],
      ['b804', 'Tome Golem', 'brute', 1.08, 4, 'A large creature built from heavy books.']
    ])
  };
  const keepers = [
    ['The Drowned Knight', 'armored', .88], ['The Reed Guardian', 'caster', 1],
    ['The Barrow King', 'armored', .92], ['The Tunnel Wyrm', 'brute', 1.5],
    ['The Slag Golem', 'brute', 1.33], ['The Crystal Sentinel', 'caster', 1.17],
    ['The Frost Warden', 'armored', 1.08], ['The Clockwork Archivist', 'armored', 1]
  ];
  keepers.forEach(([name, role, scale], i) => {
    const id = `k${i + 1}`;
    species[id] = { id, art: id, name, role, scale, tpl: `b${i + 1}03`, description: 'Guards the vault and its lost table.' };
  });

  // Uppercase rooms form the stairs route in alphabetical order. Lowercase
  // rooms have explicit links. The first w-link is the gated shortcut, z is
  // reached through a hidden door, and the optional v room extends y.
  // Room names follow route order and then w, x, y, z, v. Terrain is marked
  // with a link and a tile letter (w for water, h for hazard).
  function level(name, diagram, branches, rooms, terrain, lieutenant, note, territory) {
    return { name, diagram: diagram.split(' '), branches: branches.split(' '), names: rooms.split('|'), terrain: terrain.split(' '), lieutenant, note, territory };
  }

  const definitions = [
    ['The Bilge Vaults', [
      level('Rope Cellars', 'IJKL. HGF.. zwE.. .xDy. ABC..', 'Ew wG Bx xD Dy Hz',
        'Dock Stair|Rope Bins|Tar Bench|Salt Landing|Pump Room|Cooper’s Walk|Sodden Berths|Watch Post|Oar Shed|Crane Footing|Rope Walk|Lower Hatch|Overflow Walk|Barrel Run|Broken Winch|Corin’s Niche',
        'EFw FGw IJh', 'Bosun Marr', 'Corin Hale borrowed a lamp from the watch. His name is still on the slate beside the empty hook.', '223335510011'),
      level('Flooded Stores', '.MLKz ..wJ. BCDIH AxEFG .vy..', 'Jw wL Cx xE Ey Kz yv',
        'High Landing|Sack Store|Loading Bay|Chain Room|Lamp Store|Hoist Pit|Empty Bunks|Flood Line|Tallow Run|Pump Steps|Sluice Landing|Anchor Room|Court Hatch|Hoist Walk|Coal Store|Tackle Box|Dry Locker|Crate Well',
        'CDw GHw IJh', 'Quartermaster Crewe', 'We hung the rope above the black line on the wall because the stores flooded on the spring tide.', '2331451501131'),
      level('Drowned Court', 'HGz.. IFx.. JEDCy K.wB. LMNA.', 'Bw wD Dx xF Cy Gz',
        'Salt Stair|Chain Bay|Outer Rails|Bell Stand|Flag Walk|Empty Dais|Harbor Seats|Portcullis Foot|Blackwater Walk|Tide Gauge|Bailiff’s Room|Flood Court|Seal Walk|Knight’s Court|Grating Walk|Bell Passage|Oath Shelf|Scribe’s Bench',
        'DEw IJw MNh', 'First Mate Vale', 'Corin marked the floor by the inner court. His chalk line ends at the keeper’s door.', '23511144015511')
    ]],
    ['The Sunken Sluice', [
      level('Gatehouse', '..M.. ..LKz ABCJx .wDIH .yEFG', 'Bw wD Hx xJ Ey Kz',
        'Causeway|Gate Bench|Reed Bed|Silt Run|Wheel Room|Stone Weir|Miller’s Ramp|East Channel|Lower Walk|Chain Bridge|Lock Desk|Keeper’s Porch|Water Stair|Bywash|Reed Island|Float Shed|Flood Mark',
        'CDw FGw HIh', 'Lockmaster Fen', 'The sluice wheel opens the side gate. We kept the main weir shut while we repaired the boards.', '2232031500112'),
      level('Reed Channels', 'yHIJK vGFxL CDE.. Bwz.. A....', 'Bw wD Fx xJ Hy Ez yv',
        'Mooring Step|Wader’s Landing|Reed Cut|Long Channel|Pole Rack|Clay Bank|Toad Pool|Net Bridge|Willow Bank|Silt Trap|Lower Pier|Reservoir Stair|Catch Ditch|Dry Cut|Old Jetty|Pole Hole|Eel Rack',
        'DEw FGh IJw', 'Reedwife Sena', 'The rack held twelve poles the last time we counted them. We tied up here before going on to the next channel.', '230300500114'),
      level('Root Reservoir', 'FGHy. EDI.. xCJw. .BKLz .ANM.', 'Jw wL Cx xE Hy Lz',
        'Reservoir Rim|Outlet|Wet Steps|Barrow Bank|Stump Weir|Outer Pool|Split Ash|Chain Island|Stone Arch|Deep Channel|Leaf Bank|Root Walk|Keeper’s Landing|Root Basin|Overfall|Shallow Bend|Ash Store|Flood Bench',
        'EFw IJw KLh', 'Silt Captain Orr', 'The builders left the ash roots in place. The roots hold both banks together.', '24550301151143')
    ]],
    ['The Old Barrows', [
      level('Outer Tombs', '...y. ...GF .xIHE LKJCD .zABw', 'Bw wD Ix xK Gy Kz',
        'Mound Steps|Stone Lintel|Brass Slabs|Spearmen’s Tomb|Taper Room|Clay Passage|Mourner’s Seat|Broken Steps|Ash Floor|Family Vault|Stone Screen|Inner Stair|Burial Walk|Wreath Store|Potter’s Tomb|Offering Niche',
        'CDh HIh JKw', 'Tomb Captain Ader', 'We wrapped the bowl in linen because the black dust burned our hands.', '224050113311'),
      level('Kings’ Passage', 'ABCN. .xDMw vyELK ..F.J .zGHI', 'Kw wM Bx xD Ey Gz yv',
        'King’s Stair|Mason’s Yard|Candle Vault|Grey King|Hewn Walk|Bronze King|Bear Tomb|Stag Tomb|Well Steps|Procession Way|Red King|Queen’s Walk|Ash Stair|Court Steps|Kingmaker’s Room|Family Passage|Bronze Shelf|Seal Cupboard|Fig Tree Tomb',
        'DEh GHw JKh', 'Shieldbearer Orlen', 'The masons cut the side doors so the bearers would not have to take the long way round during a procession.', '25013033110115'),
      level('Burial Court', '.yA.O DCBMN E.zLw Fx.K. GHIJ.', 'Lw wN Fx xH Cy Lz',
        'Burial Stair|Outer Tomb|Chalk Beam|King’s Gate|Drum Room|Stone Boats|War Vault|Banner Wall|Oath Passage|Court Well|Crown Passage|Burial Pit|Censer Walk|Guardstones|King’s Seat|Seal Walk|Lamp Walk|Gravedigger’s Bench|Unmarked Tomb',
        'EFh IJw MNh', 'Marshaler Cenn', 'The king asked to be buried beside his soldiers. The crown was left on the chair above him.', '230131341034111')
    ]],
    ['The Tanglewarren', [
      level('Rootways', '..MLz xIJK. GHCBA FEDw. ..y..', 'Bw wD Gx xI Dy Lz',
        'Bank Mouth|Beetle Run|Elm Roots|Soft Earth|Spore Bed|Burrow Pool|Woodcutter’s Walk|Fox Den|Hairpin|Low Tunnel|Root Fork|Web Bed|Silk Stair|Runner’s Way|Split Burrow|Spore Cup|Spade Hollow',
        'DEh FGw IJh', 'Old Hookjaw', 'One of the woodcutters left his spade by the elm roots. He was halfway back to the surface before he noticed.', '2024405053012'),
      level('Silk Galleries', '..NMz ABCLK .wDEJ ..xFI .vyGH', 'Bw wD Dx xF Gy Mz yv',
        'Dry Mouth|Rope Gallery|White Floor|Oak Belly|Husk Run|Brood Arch|Egg Bed|Wrapped Bough|Bat Gap|Sticky Walk|Fallen Plane|Thread Bridge|Spider Vault|Hollow Stair|Silk Run|Mushroom Shelf|Dropped Lantern|Web Pocket|Quiet Den',
        'EFh HIw LMh', 'Whiteback Widow', 'We tied a thread between the lantern and the floor peg because the hanging silk hid the peg from the arch.', '23012033511131'),
      level('Wyrm Hollow', '..IJz .wHKL EFG.. Dxy.. CBA..', 'Fw wH Dx xF Gy Jz',
        'Low Stair|Split Trunk|Stone Roots|Outer Burrow|Clay Bowl|Old Nest|Limestone Walk|Shed Skins|Wyrm Track|Bone Bank|Split Jaw|Wyrm’s Bed|Skin Passage|Buried Oak|Bat Alcove|Runner’s Rest',
        'CDw FGh JKh', 'Silk Keeper Rusk', 'The young wyrm shed here every winter. The last skin was wider than the clay bowl.', '204312350111')
    ]],
    ['Slagdeep', [
      level('Cooling Works', '.yFGH .wExI .CDKJ .B.LM .A.z.', 'Cw wE Gx xI Fy Lz',
        'Works Stair|Coal Bay|Coke Bins|Pump Floor|Lime Tank|Wet Hearth|Cooling Bed|Skim Pit|Grit Hopper|Quench Bay|Drum Room|Drain Ramp|Foundry Lift|Waste Chute|Water Return|Locker Room|Foreman’s Store',
        'DEw FGh IJh', 'Pumpman Garet', 'The crew cooled castings in the lime tank before lowering them. A red-hot casting once burned straight through a lift sling.', '2344052301151'),
      level('Foundry', 'OJIH. NKxG. MLEF. z.Dw. .yCBA', 'Dw wF Gx xI Cy Mz',
        'Lift Landing|Sand Bins|Pattern Shop|Cast Floor|Mold Rack|Cinder Run|Flask Arch|Furnace Doors|Iron Trough|Pouring Crane|Sand Walk|Shakeout Floor|Coal Pocket|Hammer Steps|Vent Lift|Ladle Rail|Slag Return|Lost Wages|Pay Box',
        'EFh GHh HIw', 'Pourmaster Kett', 'The south crane brake kept sticking. We hauled on the hand chain to stop the ladle before it reached the iron trough.', '203330252215211'),
      level('Ventworks', '.wDEF ABCxG LKJIH M.z.y N....', 'Bw wD Ex xG Hy Jz',
        'Vent Stair|Fan Footing|Ash Cleanout|Draft Room|Coal Duct|Hot Damper|Rivet Walk|Steam Drum|Bellows Pit|Soot Ledge|Flue Bend|Exhaust Ramp|Pressure Landing|Crucible Lift|Bypass Duct|Cold Return|Rivet Locker|Safety Niche',
        'DEh FGh IJw', 'Damper Keeper Judd', 'The forge valve opens the vent shutter. The crew used the iron walkway when the flue grew too hot.', '24052353011121'),
      level('Crucible', '..zy. .FED. wGxC. IH.BA JKL..', 'Gw wI Cx xE Dy Ez',
        'Furnace Landing|Iron Rack|Charge Gate|Crucible Steps|Casting Dais|Ash Arch|Runner’s Trough|Melt Walk|Black Hearth|Casting Pit|Bellows Gate|Golem’s Hearth|Inspection Rail|Foundry Walk|Empty Mold|Wage Locker',
        'BCw EFh JKh', 'Furnace Captain Corve', 'There is no chain on the last gate. The keeper dragged it into the fire when the last shift left.', '213355410122')
    ]],
    ['The Crystal Vaults', [
      level('Shard Caves', '.A.Mz .BCLK .xDEJ ..wFI .vyGH', 'Dw wF Bx xD Gy Kz yv',
        'Cave Mouth|Flint Seat|Blue Shelf|Shard Bend|Drip Roof|Stone Fan|Rough Causeway|Lantern Nook|Flecked Rock|Survey Peg|North Prism|Split Chimney|Gallery Stair|Quartz Tread|Pale Passage|Miner’s Shelf|Surveyor’s Slot|Lamp Socket',
        'CDh FGw IJh', 'Surveyor Rell', 'The iron peg marks the place where we split into two survey parties. We left a lamp there so either group could find its way back.', '2200345521151'),
      level('Resonant Galleries', 'JKL.. IHGz. xEF.. yDC.. .wBA.', 'Bw wD Ex xI Dy Gz',
        'Echo Stair|Copper Post|Still Arch|Tuning Bench|Blue Pipes|Hollow Ledge|Bell Arch|Shell Basin|Eardrum Cave|Violet Chime|Long Echo|Well Stair|Quartz Throat|Silent Walk|Padded Seat|Chime Niche',
        'DEw FGh IJh', 'Bellkeeper Sorn', 'I wrapped the copper post in linen, but it still hummed whenever the bells rang.', '254123500111'),
      level('Mirror Wells', 'IHGx. J.FEw Kz.DC L..yB MN..A', 'Cw wE Ex xG Dy Kz',
        'Mirror Stair|Twin Pillars|Clear Shelf|Reflected Pool|Prism Arch|Green Well|Falling Water|Cut Quartz|Glint Run|White Mirror|Lower Well|Stone Rungs|Survey Room|Heart Stair|Silver Passage|Pool Rim|Clear Nook|Map Cleft',
        'CDw HIh KLw', 'Prism Keeper Neris', 'There’s a dry path along the edge of the lower well. The water makes the far wall look like a door.', '23034111435011'),
      level('Crystal Heart', '..FGy ..EHI .CDwJ ABxzK .ONML', 'Hw wJ Bx xD Gy Kz',
        'Crystal Stair|Glass Steps|Blue Arch|Quartz Vein|Cut Slab|Shale Walk|Amethyst Shelf|Light Shaft|Bright Ford|Prism Bend|Mirror Foot|Stone Teeth|Lantern Well|Gem Steps|Sentinel’s Stand|Lamp Run|Dark Cut|Glass Niche|Tool Cleft',
        'DEh IJw MNh', 'Lampwright Del', 'The keeper can see across the glass. The shale walk on the far side was cut for the lampwrights.', '225103334115111')
    ]],
    ['The Ice Halls', [
      level('Lower Galleries', '.z... xEDw. GFCBA HIJKL y...M', 'Bw wD Ex xG Hy Ez',
        'Peak Stair|Packed Snow|Rope Pegs|Leeward Bay|Blue Arch|Sled Bank|Stone Hearth|Thaw Run|Fur Store|Old Campsite|Drop Ledge|Narrow Shelf|Cistern Stair|Wind Cut|Sled Track|Snow Nook|Climber’s Cache',
        'CDh FGw IJh', 'Sledmaster Arn', 'The sleds jammed where the roof had fallen. We drove pegs into the wall so we could haul the loads through by hand.', '0203045521141'),
      level('Frozen Cistern', 'GHIJz F.wK. EDxL. .CBMN .yA..', 'Iw wK Bx xD Cy Jz',
        'Cistern Rim|Tin Pail|Ice Spout|Water Marks|Bucket Winch|Stove Steps|South Basin|Ice Dock|Frozen Lid|Glacier Shelf|Cold Grille|Cistern Neck|Deep Landing|Wind Stair|Drain Lip|Dry Steps|Stove Nook|Dipper’s Cupboard',
        'DEw FGh KLh', 'Cistern Watch Edda', 'We drew water from the spout while the rest of the basin was frozen. The ice in the south corner would not hold anyone carrying a full pail.', '02530415341111'),
      level('Wind Passages', '..... .vyz. .xEFw BCDGH ALKJI', 'Fw wH Cx xE Ey Fz yv',
        'Windbreak|Rime Walk|Stone Wall|Bell Rope|Sheltered Bend|Narrow Gap|Frozen Turn|Old Handrail|Drift Bank|Wind Scoop|Upper Steps|Court Stair|Outer Cut|Dead Air|Survey Flag|Ice Box|Roper’s Shelf',
        'DEh GHw IJh', 'Rope Keeper Voss', 'We used the sheltered bend to wait out the worst gusts. Someone had to fetch the bell rope after it snapped last winter.', '052340555111'),
      level('Winter Court', '..CBA y.Dw. GFE.. HIJKN z.xLM', 'Bw wD Jx xL Gy Hz',
        'Court Stair|Melt Trough|Stone Cots|Guard Arch|Folded Blankets|Ice Chisel|Light Well|Winter Porch|Warden’s Gate|Coat Rack|Glacier Walk|Frost Dais|Crown Seat|Warden’s Court|Covered Way|Drift Cut|Lantern Hook|Snow Locker',
        'DEh GHw KLh', 'Court Guard Sval', 'The warden slept with his boots facing the court. His old ice chisel is still in the wall.', '02033504511111')
    ]],
    ['The Sealed Stacks', [
      level('Closed Reading Rooms', '..AB. ..yCx ...DE LKJIF .zwHG', 'Hw wJ Cx xE Cy Kz',
        'Reading Stair|Return Desk|Lamp Tables|Reference Room|Map Racks|Green Desks|Paper Bench|Ink Store|Reader’s Walk|Folio Room|Lock Desk|Records Stair|Service Walk|Returns Passage|Copyist’s Booth|Closed Catalogue',
        'DEh GHw IJh', 'Head Clerk Pellin', 'The return slot tore the cover off a damaged book. We started carrying loose volumes straight to the paper bench.', '511325235110'),
      level('Record Stores', '.GHIJ zFwxK .EDyL ABCvM .....', 'Fw wH Ix xK Dy Fz yv',
        'Records Stair|Entry Shelf|Tall Racks|Deed Store|Tax Bench|Restoration Desk|Seal Fund|Birth Rolls|Loan Jackets|Ledger Shelves|East Locks|Record Cage|Restricted Stair|Service Gate|Press Passage|Index Desk|Sealed Drawer|Copy Stand',
        'CDh GHw KLh', 'Rollkeeper Mett', 'The bottom drawers were sealed on council orders. We had to send each deed number upstairs and wait for a clerk to bring down a copy.', '5351142131010'),
      level('Restricted Wing', '..N.. .zM.A .xLyB IJKDC HGFEw', 'Cw wE Jx xL Dy Mz',
        'Restricted Stair|Clerk’s Gate|Permit Desk|Narrow Stacks|Chains Locker|Binding Stand|Permit Shelf|Private Letters|Red Desk|Locked Folios|Records Walk|Clock Room|Keeper’s Ramp|Archive Stair|Access Gate|Binding Passage|Forgotten Request|Locked Niche',
        'DEh HIw LMh', 'Seal Clerk Vos', 'We kept the borrowed books on the red desk and left the key in the clock room when the shift ended.', '35403255110010'),
      level('Old Archive', '...HG .zwIF MLKJE NxBCD O.Ay.', 'Iw wK Lx xN Cy Lz',
        'Archive Stair|Intake Desk|Closed Register|Brass Rails|Ink Runnel|Survey Shelves|Thin Parchment|Council Orders|Locked Index|Old Dates|Iron Racks|Charter Store|Clerk’s Rail|Seal Desk|Archivist’s Hall|Index Run|Service Alley|Borrower’s Shelf|Blank Register',
        'EFw IJh MNh', 'Deputy Keeper Dehn', 'The borrower’s register was too brittle to keep by the outer desk. We moved it to the charter store, behind the index.', '303151241110000')
    ]]
  ];

  // Width and height profiles are listed in room order and repeat when needed.
  // Shorter widths keep passage mouths distinct. The cave profiles round off
  // their corners by two or three cells.
  const styles = {
    1: { rooms: [[13, 9], [17, 9], [11, 11], [15, 13]], passage: [3, 2, 3], corners: 0 },
    2: { rooms: [[11, 13], [17, 9], [13, 15], [15, 11]], passage: [3, 3, 2, 3], corners: 2 },
    3: { rooms: [[13, 11], [11, 13], [17, 11], [13, 15]], passage: [2, 3, 2], corners: 1 },
    4: { rooms: [[11, 9], [13, 15], [15, 11], [17, 13]], passage: [2, 2, 3, 2], corners: 3 },
    5: { rooms: [[15, 11], [17, 13], [13, 11], [17, 9]], passage: [3, 3, 3, 2], corners: 0 },
    6: { rooms: [[11, 15], [17, 11], [15, 13], [13, 15]], passage: [3, 2, 2], corners: 3 },
    7: { rooms: [[15, 11], [11, 15], [17, 9], [13, 13]], passage: [2, 3, 3, 2], corners: 2 },
    8: { rooms: [[17, 11], [13, 13], [15, 9], [11, 11]], passage: [3, 3, 2], corners: 0 }
  };
  const dungeons = definitions.map(([name, levels], i) => {
    const r = i + 1;
    const floors = levels.map((level, f) => ({ ...level, r, f, w: W, h: H, step: [24, 21], origin: [12, 11] }));
    return { r, name, theme: themes[r], floors, species: rosters[r], keeper: `k${r}` };
  });

  const get = r => dungeons[r - 1];
  const floor = (r, f = 0) => get(r)?.floors[f];
  const center = (spec, code) => {
    const row = spec.diagram.findIndex(line => line.includes(code));
    return [spec.origin[0] + spec.diagram[row].indexOf(code) * spec.step[0], spec.origin[1] + row * spec.step[1]];
  };
  const routeOf = spec => [...spec.diagram.join('')].filter(code => /[A-Z]/.test(code)).sort();
  const arrivalAt = (spec, code) => {
    if(code==='A'){const {up}=geometry(spec);return [up.x,up.y+2];}
    const [x, y] = center(spec, code);
    return [x + 1, y + 2];
  };
  const position = (room, dx = 0, dy = 0) => [room.cx + dx, room.cy + dy];

  function geometry(spec) {
    const {r,f,w,h}=spec,style=styles[r],tiles=new Uint8Array(w*h);
    const paint = (x, y, tile = FLOOR) => { tiles[y * w + x] = tile; };
    const route = routeOf(spec);
    const codes = route.concat([...'wxyzv'].filter(code => spec.diagram.some(line => line.includes(code))));
    const rooms = codes.map((id, i) => {
      const [cx, cy] = center(spec, id);
      const [rw, rh] = style.rooms[(i + f) % style.rooms.length];
      const x = cx - (rw >> 1), y = cy - (rh >> 1);
      for (let dy = 0; dy < rh; dy++) for (let dx = 0; dx < rw; dx++) {
        const corner = Math.min(dx, rw - 1 - dx) + Math.min(dy, rh - 1 - dy);
        if (corner >= style.corners) paint(x + dx, y + dy);
      }
      return { id, name: spec.names[i], x, y, w: rw, h: rh, cx, cy };
    });
    const byId = Object.fromEntries(rooms.map(room => [room.id, room]));
    const routeLinks = route.slice(1).map((code, i) => route[i] + code);
    const terrain = Object.fromEntries(spec.terrain.map(([a, b, type]) => [a + b, type === 'w' ? WATER : HAZARD]));
    const links = routeLinks.concat(spec.branches).map(([from, to], i) => {
      const a = byId[from], b = byId[to], type = terrain[from + to];
      const dx = Math.sign(b.cx - a.cx), dy = Math.sign(b.cy - a.cy);
      const length = Math.abs(b.cx - a.cx) + Math.abs(b.cy - a.cy);
      const width = type ? 3 : style.passage[(i + f) % style.passage.length];
      const mid = Math.floor(length / 2);
      const spine = [], cells = [];
      for (let step = 0; step <= length; step++) {
        const x = a.cx + step * dx, y = a.cy + step * dy;
        spine.push([x, y]);
        for (let side = -1; side < width - 1; side++) {
          const tx = x + side * dy, ty = y + side * dx;
          const crossing = type && Math.abs(step - mid) <= 2;
          paint(tx, ty, crossing ? side === 0 ? BRIDGE : type : FLOOR);
          if (step === mid) cells.push([tx, ty]);
        }
      }
      return { from, to, width, spine, cells, optional: i >= routeLinks.length, terrain: type || FLOOR };
    });

    // A stairwell occupies existing wall mass, clear of corridor mouths and
    // rounded corners. Its floor landing stays in the connected first room.
    const first=byId.A,y=first.y-1;
    const candidates=Array.from({length:first.w-4},(_,i)=>first.x+2+i).sort((a,b)=>Math.abs(a-first.cx)-Math.abs(b-first.cx)||a-b);
    const supported=x=>[-2,-1,0].every(dy=>[-1,0,1].every(dx=>tiles[(y+dy)*w+x+dx]===WALL));
    const landing=x=>[1,2].flatMap(dy=>[-1,0,1].map(dx=>(y+dy)*w+x+dx));
    let x=candidates.find(x=>supported(x)&&landing(x).every(i=>tiles[i]===FLOOR));
    const landingAdded=[];
    if(x===undefined){
      // A narrow rounded room with a north corridor can lack a three-cell
      // landing. Square off only its dry corner; never close an existing path.
      x=candidates.filter(supported).filter(x=>landing(x).every(i=>tiles[i]===WALL||tiles[i]===FLOOR))
        .sort((a,b)=>landing(a).filter(i=>tiles[i]===WALL).length-landing(b).filter(i=>tiles[i]===WALL).length)[0];
      if(x===undefined)throw Error(`No supported ascent in ${r}/${f}`);
      for(const i of landing(x))if(tiles[i]===WALL){tiles[i]=FLOOR;landingAdded.push([i%w,Math.floor(i/w)]);}
    }
    const up={x,y,side:'north',support:{x:x-1,y:y-2,w:3,h:3}};
    return {tiles,rooms,byId,route,routeLinks,links,up,landingAdded};
  }

  function build(r, f = 0) {
    const dungeon=get(r),spec=floor(r,f);if(!spec)return undefined;
    const {theme}=dungeon,{w,h}=spec,{tiles,rooms,byId,route,routeLinks,links,up,landingAdded}=geometry(spec),entities=[];
    const codes=route.concat([...'wxyzv'].filter(code=>byId[code]));
    const anchor=(key,kind,[x,y],name,data={})=>{entities.push({id:`r${r}f${f}-${key}`,kind,x,y,r,f,name,...data});return entities[entities.length-1];};
    const first = byId.A, end = byId[route[route.length - 1]];
    const previous = floor(r, f - 1), next = floor(r, f + 1);
    const entry = [up.x,up.y+2];
    const previousRoute = previous && routeOf(previous);
    anchor('up', 'dtravel', [up.x,up.y], previous ? `Stairs to ${previous.name}` : 'Exit to the surface', {
      to: f - 1, arrival: previous ? arrivalAt(previous, previousRoute[previousRoute.length - 1]) : null, room: first.id, support:up.support, side:up.side
    });
    if (next) {
      anchor('down', 'dtravel', position(end), `Stairs to ${next.name}`, { to: f + 1, arrival: arrivalAt(next, 'A'), room: end.id });
    } else {
      const keeper = species[dungeon.keeper];
      anchor('keeper', 'keeper', position(end), keeper.name, { species: keeper.id, tpl: keeper.tpl, role: keeper.role, room: end.id });
      anchor('vault', 'chest', position(end, 2, -3), 'Vault chest', { room: end.id });
      anchor('table', 'ltable', position(end, -2, -3), 'Sealed scroll', { room: end.id });
    }

    const gateLink = links[routeLinks.length], gateCenter = gateLink.spine[Math.floor(gateLink.spine.length / 2)];
    const gate = anchor('gate', 'dgate', gateCenter, theme.gate, { cells: gateLink.cells, type: theme.id });
    const controlRoom = byId[gateLink.from];
    anchor('lever', 'dlever', position(controlRoom, 2, -1), theme.control, { target: gate.id, type: theme.id, room: controlRoom.id });
    const secretLink = links.find(link => link.to === 'z');
    const revealAt = secretLink.spine[Math.floor(secretLink.spine.length / 2) - 2];
    anchor('secret', 'dsecret', revealAt, theme.secret, { cells: secretLink.cells, type: theme.id, room: secretLink.from });
    anchor('cache', 'dcache', position(byId.z, 2, 1), theme.cache, { room: 'z' });
    const loreRoom = byId.v || byId.y;
    anchor('lore', 'dlore', position(loreRoom, 2, -1), `Note in ${loreRoom.name}`, { text: spec.note, room: loreRoom.id });

    const mob = (key, point, room, id, data = {}) => {
      const sp = species[id];
      anchor(key, 'dmon', point, sp.name, { species: id, tpl: sp.tpl, role: sp.role, room: room.id, lieutenant: false, ...data });
    };
    const roster = dungeon.species;
    route.slice(1).forEach((code, i) => {
      const room = byId[code];
      const primary = +spec.territory[i + 1], secondary = +spec.territory[i];
      mob(`${code}-1`, position(room, -3, -2), room, roster[primary]);
      mob(`${code}-2`, position(room, 3, 2), room, roster[secondary]);
    });
    codes.slice(route.length).forEach((code, i) => {
      const room = byId[code];
      mob(`${code}-1`, position(room, -3, 2), room, roster[(i + 2 + f) % roster.length]);
    });
    if (next) {
      const leaderRoom = byId[route[route.length - 2]];
      mob('lieutenant', position(leaderRoom, -1, 2), leaderRoom, roster[f === 1 ? 0 : 1], { name: spec.lieutenant, lieutenant: true });
    }
    if (r === 1 && f === 0) {
      mob('tutorial-guard', position(first, -2, -1), first, 'b101', { name: 'Cellar Rat', tutorial: true });
      anchor('tutorial-chest', 'dcache', position(first, -3, -3), 'Starter chest', { room: first.id, tutorial: true });
    }

    return { w, h, tiles, rooms, entry, entities, links, theme, name: spec.name, dungeon: dungeon.name, route, r, f, landingAdded };
  }

  return { get, floor, build, species, themes, WALL, FLOOR, WATER, HAZARD, BRIDGE };
})();

if (typeof module !== 'undefined') module.exports = Dungeons;
