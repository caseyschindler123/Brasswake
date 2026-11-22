/* The dojos: one per town, an optional tournament in each. Who's there, what they say, what you win. */
const Dojo = (() => {
  // fighter rows in dj/fs.webp: 0-7 masters, 8 Sorrel, 9-11 the travellers, 12-35 students (three per town), 36 Odalys
  const MASTERS = [
    { name: 'Hesper Coyle', row: 0, pt: 'DG01_1', style: 'fists' },
    { name: 'Pell Rushing', row: 1, pt: 'DG01_2', style: 'staff' },
    { name: 'Sela Marrow', row: 2, pt: 'DG01_3', style: 'spell' },
    { name: 'Gus Harrow', row: 3, pt: 'DG01_4', style: 'staff' },
    { name: 'Ness Corrigan', row: 4, pt: 'DG02_1', style: 'fists' },
    { name: 'Aurel Dunn', row: 5, pt: 'DG02_2', style: 'spell' },
    { name: 'Signe Vale', row: 6, pt: 'DG02_3', style: 'blade' },
    { name: 'Oswin Gale', row: 7, pt: 'DG02_4', style: 'spell' }];
  const RIVAL = { name: 'Sorrel Ashby', row: 8, pt: 'DG03_1', sub: 'Travelling duelist' };
  const TRAVEL = [
    { name: 'Brick Dorran', row: 9, pt: 'DG03_2', sub: 'Travelling fighter' },
    { name: 'Granny Wick', row: 10, pt: 'DG03_3', sub: 'Travelling fighter' },
    { name: 'Pip Lowell', row: 11, pt: 'DG03_4', sub: 'Travelling fighter' }];
  const SN = [['Davy Pruitt', 'Ines Marlowe', 'Bo Kettering'], ['Fen Abbot', 'Lew Cattail', 'Tad Mossop'], ['Clara Penn', 'Ambrose Tull', 'Polly Fairweather'], ['Hob Wheatley', 'Rosa Benn', 'Jory Long'],
    ['Cass Ferrow', 'Dunstan Cole', 'Kit Spindle'], ['Lorne Vey', 'Silla Grey', 'Ash Mott'], ['Britta Lund', 'Ivo Strand', 'Tilde Rask'], ['Edmund Sallow', 'Lavinia Stroud', 'Percy Nib']];
  const STUDENTS = r => SN[r - 1].map((name, i) => { const k = (r - 1) * 3 + i; return { name, row: 12 + k, pt: `DG${String(4 + (k >> 2)).padStart(2, '0')}_${(k & 3) + 1}`, sub: 'Student' }; });
  const ODALYS = { name: 'Odalys Brine', row: 36, pt: 'G01_1' };
  const TOWN = ['Tallyport', 'Brackwater', 'Haverly', 'Four Fords', 'Cinderwick', 'Kell', 'Highwatch', 'Aldermoot'];
  // everyone else in a bracket of sixteen: named, never met
  const FILL = ['Agnes Rook', 'Barnaby Fisk', 'Corra Vane', 'Dell Hatcher', 'Edda Moss', 'Finch Tolley', 'Garet Plume', 'Hilde Bracken', 'Ivor Stoat', 'Jessamy Cole', 'Kett Durst', 'Lark Pemberton', 'Mott Granger', 'Nell Sparrow', 'Osric Thale', 'Prue Hollis', 'Quill Barlow', 'Ros Tanner', 'Sim Abernathy', 'Tess Ingle', 'Ulf Carrow', 'Vida Moon', 'Wat Harker', 'Yara Fell'];
  const PRIZES = [
    { name: 'Coyle’s Anchor Belt', slot: 'charm', ic: 'dz1', stats: { def: 6, luck: 6 } },
    { name: 'Reed-Woven Wraps', slot: 'charm', ic: 'dz2', stats: { learn: 8, luck: 4 } },
    { name: 'The Counting Ring', slot: 'ring', ic: 'dz3', stats: { gold: 12, learn: 6 } },
    { name: 'Harrow’s Red Sash', slot: 'charm', ic: 'dz4', stats: { def: 10, luck: 6 } },
    { name: 'Corrigan’s Gauntlets', slot: 'charm', ic: 'dz5', stats: { dmg: 10, def: 6 } },
    { name: 'Dunn’s Blue Crystal', slot: 'charm', ic: 'dz6', stats: { learn: 12, luck: 8 } },
    { name: 'The Snowflake Clasp', slot: 'ring', ic: 'dz7', stats: { def: 12, gold: 10 } },
    { name: 'Gale’s Laurel', slot: 'charm', ic: 'dz8', stats: { learn: 14, luck: 10, gold: 10 } }];
  // what each master says. hi: first meeting. ilva: after you beat them, what they remember of Ilva Thorne, at a different age in each town.
  const SAY = [
    { hi: '"Hesper Coyle. Odalys trained me before she trained anyone else in this hall. The tournament runs whenever you’ve got the fee. Win it and I’ll spar you for the belt."',
      ilva: ['"I sparred Ilva Thorne the week she came out of the sea. She couldn’t write a SELECT."', '"A month later she beat me with one. Odalys said she’d never seen anyone learn that fast. Then she looked at you."'] },
    { hi: '"Pell Rushing. I learned at Odalys’s elbow in Tallyport, long before your time. Pay the fee and you’re in the bracket. Beat it and you can try me."',
      ilva: ['"Ilva came through here at twenty-eight, asking about the lights over the fen at night. Nobody had an answer for her."', '"She stayed a season, mapping every vault in the marsh. She was looking for one nobody had opened."'] },
    { hi: '"Sela Marrow. Odalys sent me up here to teach counting. The bracket’s open. Win it and I’ll give you a proper fight."',
      ilva: ['"Ilva spent a winter in our counting house when she was thirty. She counted every ship that sailed out and never came back."', '"There were more than there should have been. She wrote the number down and wouldn’t tell me what it meant to her."'] },
    { hi: '"Gus Harrow. Odalys taught me to join tables before I could shoe a horse. Fee’s on the board. Win and we’ll go a round."',
      ilva: ['"Ilva won this tournament at thirty-one. She gave the cup to the farm boy she beat in the final."', '"Said she’d no shelf to put it on. She kept moving even then."'] },
    { hi: '"Ness Corrigan. Odalys put a query in my head and a hammer in my hand. Pay in, win the bracket, then you can come at me."',
      ilva: ['"When Ilva was forty she asked me to forge a key. I asked her for the lock. She said it didn’t have a keyhole."', '"She meant the lost tables. I didn’t understand that for years."'] },
    { hi: '"Aurel Dunn. I can’t see you, but Odalys taught me to hear a query. The bracket takes anyone who pays. Win and I’ll spar."',
      ilva: ['"Ilva came down here at fifty and asked me how you’d remove a row and leave no gap behind."', '"I told her you can’t. She thanked me and said she’d find a way."'] },
    { hi: '"Signe Vale. Odalys’s student, a long time ago. Enter if you like. Beat the bracket and I’ll spar you myself."',
      ilva: ['"Ilva came through this spring, heading north. She stood up on the spire for an hour, looking at the sea."', '"She was tired. She asked if anyone else had come out of the water. I said not yet."'] },
    { hi: '"Oswin Gale. I was Odalys’s first student and I’m older than she is. The last bracket is the hardest. Win it and I’ll see what you’ve learned."',
      ilva: ['"I knew Ilva for forty years. She read every old page we have in the reading room, twice."', '"She told me someone else would come out of the sea one day, and to let them use the room. It’s yours whenever you want it."'] }];
  // Sorrel's notes, pinned in the next dojo with a dagger: she's always a town ahead. Note n is in town n + 1.
  const NOTES = [
    'To whoever keeps winning behind me: you got lucky in Tallyport. I’ll be in Brackwater. Bring a better WHERE. — S.A.',
    'Still following? Fine. The marsh lot forget NULL every time. You probably will too. On to the hill. — S.A.',
    'You beat me at the counting house. Don’t get used to it. GROUP BY whatever you GROUP BY in the SELECT. — Sorrel',
    'Four Fords final went long. You write joins like a farmer ploughs, straight and slow. It works, though. — Sorrel',
    'I nearly had you at the Forge. COALESCE saved you twice; I counted. See you underground. — Sorrel',
    'Down here every query has another query inside it. So does every person. Mine’s on the spire. — Sorrel',
    'I grew up under that spire and I still lost to you there. Last town. Last bracket. I’ll wait for you. — Sorrel'];
  const SORREL = { hi: '"Sorrel Ashby. I’m doing all eight dojos, same as you, only faster. See you in the final."', last: '"That’s the circuit. All eight, and you beat me in more of them than I beat you. Buy me a drink in Highwatch some time."' };
  return { MASTERS, RIVAL, TRAVEL, STUDENTS, ODALYS, TOWN, FILL, PRIZES, SAY, NOTES, SORREL };
})();
