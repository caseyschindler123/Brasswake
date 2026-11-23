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
    { hi: '"Hesper Coyle. I run the dojo and I mop the floor, so whatever else you do, wipe your boots. The tournament board lists the fee. Win the bracket and I’ll spar with you for my belt."',
      win: '"You kept your head when I pressed you. I’m glad the belt’s going to somebody who can use it."',
      ilva: ['"I sparred with Ilva Thorne after Odalys brought her here in 1986. She asked me to read the same practice question out three times. I thought she was trying to annoy me."', '"A month later she came back and beat me with the query I’d shown her. I was furious. Then she asked if I wanted to see a faster way to write it, and I did."'] },
    { hi: '"Pell Rushing. I was a ferryman before I ran this hall. If you fancy a bout, enter at the board. If you only came to get dry, there’s a bench by the door."',
      win: '"Good fight. Take the wraps. I wove them when the ferry was iced in, and somebody might as well wear them."',
      ilva: ['"Ilva came out with me to survey the sluice in 1990. She wanted to know whether anybody had ever seen a light out there with no boat under it."', '"I showed her the lanterns we hang on the channel posts. She thanked me and went back to the Brass Sea records. I was glad she stayed long enough to help land the boat."'] },
    { hi: '"Sela Marrow. The children get the hall back at supper, so if you want to enter the tournament, put your name up now. I’ll take the winner myself."',
      win: '"You can have the ring. I think the children will be pleased to hear I lost."',
      ilva: ['"Ilva spent the winter of 1992 in the counting house. She showed me that we’d entered the same departure twice on the list of lost ships. It was her first week in town and I wished she’d leave."', '"Then she helped me check the rest of the book, even after the weather cleared. She wanted to know who had sailed in the storms and how many had been seen again."'] },
    { hi: '"Gus Harrow. The forge can manage without me for an afternoon. Enter at the board and win the bracket, and I’ll show you why I keep a staff behind the anvil."',
      win: '"Damn, you can move. The sash is yours. Give me a minute to work the feeling back into this hand."',
      ilva: ['"Ilva won here in 1993. I was the farm boy she beat. My father had come to watch, and when I lost I wouldn’t even look at him."', '"She came by the smithy the next morning and offered to practise with me. I thought she felt sorry for me. After the first bout she asked me to teach her my footwork, and I finally got it."'] },
    { hi: '"Ness Corrigan. I run the bouts. If you want me to flatter you, pay for a lesson and I’ll tell you where you went wrong. Win the bracket and I’ll take you on myself."',
      win: '"You caught me reaching. I could complain about my hands, and you’d know I was full of shit. Take the gauntlets."',
      ilva: ['"Ilva asked me to cast a nib for her in 2002. I made one. She tried it, said it had cracked, and paid me for it anyway."', '"This spring she asked Ysolt instead. Ysolt made her explain the whole job before she agreed to try. I’d have saved myself an evening if I’d done that."'] },
    { hi: '"Aurel Dunn. Tell me your name so I’ll know whose step I’m hearing. If you’re here to enter, the board’s by the door. I can read the fee out if you like."',
      win: '"You changed your pace after the second pass. I heard it too late. Take the crystal and let me practise next time you’re here."',
      ilva: ['"In 2012 Ilva asked whether a clerk could strike a record from one book and leave a copy in another. I suggested looking for the clerks’ own records of the change."', '"She went quiet for a long time. I offered her tea and waited. Eventually she said she’d like to know if anything of her own entry was left."'] },
    { hi: '"Signe Vale. If you came up for the tournament, put your hands by the stove first. I can spare five minutes for that. Enter at the board when you can feel your fingers."',
      win: '"That was a good bout. Wear the clasp forward on your coat, where you can get at it with gloves."',
      ilva: ['"Ilva was here this spring. I lent her my coat while she went up to the tower to look out at sea. She came back quiet, so I asked how long she’d been looking for another wreck survivor."', '"She said she’d been asking since the day she was pulled out. I wish I’d thought to tell her she could stay the night. By the time I did, she’d set off for Aldermoot."'] },
    { hi: '"Oswin Gale. Odalys taught me years ago. I remember thinking I was too old to learn in front of the young ones, so if that’s what’s kept you at the door, come in. The board has room."',
      win: '"I can see why you came all this way. I’d like to see you back when you’ve had a proper rest. The laurel’s yours."',
      ilva: ['"When Ilva came to Aldermoot years ago, I let her use our reading room. She was looking for an account of the sea outside the map room, and she thought someone might have left a letter."', '"When she came back this spring, I asked her to look after herself. She promised to go down to the archive with enough food for a week. I should have insisted on going with her."'] }];
  // A note appears in the next dojo only after the player beats Sorrel in this one.
  const NOTES = [
    'I owe you a handshake for Tallyport. I was angry and I left before I gave it to you. We can do it here if you see me. — Sorrel',
    'Pell says I answer too early. I asked him what was wrong with my answer, and he said I’d interrupted him again. Rematch in Haverly? — Sorrel',
    'I wanted that win. Sela let me stay and practise after everybody left. I thought about asking you to stay too. Maybe next time I’ll actually ask. — Sorrel',
    'That was a good fight at Four Fords. I’m trying to get better at saying it when I lose, so you’re getting it in writing. — Sorrel',
    'Ness made me carry the benches back after the match. Said if I had the strength to kick one, I had the strength to move it. I’m ready to try again in Kell. — Sorrel',
    'Highwatch is my home. I keep thinking about the people who’ll be there if we meet in the final. If you could go easy on the smirk when you see me, I’d appreciate it. — Sorrel',
    'My brother saw us fight in Highwatch. He said he’d never seen me try so hard. I still wish I’d won, and I want another go in Aldermoot. — Sorrel'];

  function sorrelLine({ met = false, wonHere = false, lostHere = false, wonFinal = false, wins = 0 } = {}) {
    if (!met && !wonHere && !lostHere && !wonFinal && !wins) return '"Sorrel Ashby. I’m from Highwatch. I set out to enter every dojo tournament, and I’d like to see how far I get without my family there yelling advice. Maybe I’ll see you in the bracket."';
    if (wonFinal) return wins === 8
      ? '"You beat me in every town. I’m taking a long look at how I practise when I get home. If you’re ever in Highwatch, I’d like you to meet my brother. He’s going to want to hear your side of it."'
      : '"You won in Aldermoot. I came here to see how I stood against people who’d never heard of me. Now I know, and I’d like another bout when you’re back in Highwatch."';
    if (wonHere) return '"You got me here before. I’ve been thinking about our match, and I’d like another chance whenever you feel like entering."';
    if (lostHere) return '"I remember our final. I’d rather you came back for another go than went home thinking that’s how it always has to end."';
    return '"Hello again. I put my name down for this one too. We can talk after the final if we both manage to get there."';
  }
  return { MASTERS, RIVAL, TRAVEL, STUDENTS, ODALYS, TOWN, FILL, PRIZES, SAY, NOTES, sorrelLine };
})();
if (typeof module !== 'undefined') module.exports = Dojo;
