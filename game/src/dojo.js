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
  const SPECIALIST_LINES = [
    ["I practise sorting. A list of supplies is more useful when the expensive ones, or the ones running low, are where you can find them. I'll show you how ORDER BY changes a result.", "Sometimes you only need the first few names in a list. I work on LIMIT, and how sorting helps you choose which rows come first.", "The harbor books repeat the same cities and trades all over the place. I use DISTINCT when I need one of each value, or one of each combination."],
    ["I work out which rows belong in a result. A condition can compare a price or a place, and AND or OR lets you combine those decisions.", "If the clerk gives you a list of places or a range of prices, you shouldn't have to write a separate query for each one. Come and try IN and BETWEEN.", "I look for names that follow a pattern and records with a fact still missing. LIKE and NULL checks do different jobs, so we'll try both."],
    ["I measure what a table holds. We can count its rows, add its amounts, or find an average without copying the whole list.", "One total won't tell you which trade is busiest. I practise GROUP BY so we can work out a separate result for each group.", "Once you've measured each group, you may only want the ones that meet a condition. I'll show you why HAVING comes after that work."],
    ["Orders give us customer numbers, but people ask for names. I practise joining related tables so the numbers lead us to the right records.", "A delivery can be missing even when the customer is still in our books. LEFT JOIN helps us keep the records that don't have a match.", "An employee and their manager are both in the same table. I give that table two roles so we can follow the relationship without confusing their names."],
    ["I work on labels and fallback values. CASE chooses a result from conditions, while COALESCE gives us a value when the first one is missing.", "A useful report sometimes needs a cleaned-up name, a rounded price, or a calculation that won't divide by zero. We'll practise those separately before combining them.", "I keep the dates straight. We can collect a month's records or measure the time between two dates, provided we use the right operation."],
    ["Some questions need an answer from another query first. I practise finding that value and then using it in the main question.", "I check whether a related record exists. We can ask that for each customer or supplier without turning every match into another result row.", "I break longer work into smaller steps. A derived table or a named CTE lets the next part of a query use what the first part found."],
    ["I number rows and rank results. Ties make ROW_NUMBER, RANK and DENSE_RANK behave differently, so I'll show you the same list each way.", "I keep the rows visible while calculating over a group or an ordered stretch of them. The partition and the frame decide which neighbors count.", "I compare a row with the one before it. LAG is useful when you want to see what changed rather than just read the latest number."],
    ["I practise adding, changing and removing rows in disposable copies. You'll see what your statement changes, and the company books will stay untouched.", "I set up tables, rules and reusable views. We can also give a lookup an index. Each exercise starts with a fresh copy so you can try things safely.", "I combine lists and review changes before keeping them. UNION and UNION ALL handle repeated rows differently; transactions let us check work before committing it."]
  ];
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
    { hi: '"I’m Hesper Coyle. I run this dojo, and I mop the floor, so wipe your boots before you come any farther. If you’re here to fight, you can enter at the board. Win the tournament and I’ll spar with you for my belt."',
      win: '"You kept your head when I pressed you. I’d have lost my temper once I fell behind, so I’m glad you’re the one taking the belt."',
      ilva: ['"I sparred with Ilva Thorne after Odalys brought her here in 1986. She kept asking me to read a practice question out again. By the third time I was sure she was doing it to annoy me."', '"A month later she came back and beat me with the query I’d shown her. I was furious. She offered to show me a faster way to write it, and I nearly walked out. In the end, I pulled up a chair."'] },
    { hi: '"I’m Pell Rushing. I used to run the ferry, so I know what the crossing can do to a good coat. There’s a bench by the door if you need to get dry. If you came to fight, you can enter the tournament at the board."',
      win: '"Good fight. Take the wraps. I wove them when the ferry was iced in, and somebody might as well wear them."',
      ilva: ['"Ilva came with me when I went out to survey the sluice in 1990. She asked if anyone had seen a light on the water when there was no boat around."', '"I showed her the lanterns we hang on the channel posts, since those were the only lights I knew about. She went back to the Brass Sea records after that, but she stayed to help me bring the boat in."'] },
    { hi: '"I’m Sela Marrow. The children get the hall back at supper, so you’ll need to sign up at the board soon if you want a place in the tournament. I’ll face the winner myself."',
      win: '"You can have the ring. The children will be pleased to hear I lost. They’ve been trying to work out how to get past that guard for weeks."',
      ilva: ['"Ilva spent the winter of 1992 in the counting house. She showed me that we’d entered the same departure twice on the list of lost ships. She’d been here less than a week, and I already wished she’d leave."', '"She stayed to check the rest of the book with me, even after the weather cleared. She wanted to know who’d sailed in the storms and who’d made it back."'] },
    { hi: '"I’m Gus Harrow. I’ve left my apprentice in charge of the forge this afternoon. Sign up at the board if you fancy a fight. If you win the tournament, I’ll show you why I keep a staff behind the anvil."',
      win: '"Damn, you can move. Take the sash while I work the feeling back into my hand."',
      ilva: ['"Ilva beat me here in 1993, when I was just a farm boy. My father came to watch, and after I lost I couldn’t even look at him."', '"She came by the smithy the next morning and offered to practise with me. I thought she felt sorry for me. After we’d sparred once, she asked me to show her how I moved my feet. It hadn’t occurred to me she’d come to learn something too."'] },
    { hi: '"I’m Ness Corrigan. If you pay me for a lesson, I’ll tell you where you went wrong. If you’d rather prove I’m wrong, put your name on the board. I fight whoever wins the tournament."',
      win: '"You caught me reaching. I was about to blame my hands, but we both know that’s bullshit. Take the gauntlets."',
      ilva: ['"Ilva asked me to cast a nib for her in 2002. The one I made cracked when she tried it, and she paid me anyway."', '"This spring she asked Ysolt instead. Ysolt made her explain the whole job before she agreed to try. I would’ve saved myself an evening if I’d asked her what she needed it for."'] },
    { hi: '"I’m Aurel Dunn. I heard you come in, so tell me your name when you have a moment. The tournament board is by the door. I can tell you what it costs to enter if you like."',
      win: '"You changed your pace after the second pass, and I heard it too late. Take the crystal, but come back and let me have another try sometime."',
      ilva: ['"In 2012 Ilva asked whether a clerk could strike a record from one book and leave a copy in another. I suggested looking for the clerks’ own records of the change."', '"She went quiet, so I poured her some tea and waited with her. After a bit she told me the entry she was looking for was her own."'] },
    { hi: '"I’m Signe Vale. If you came up for the tournament, put your hands by the stove first. We can wait five minutes. The board’s right there when you can feel your fingers again."',
      win: '"That was a good bout. Put the clasp on the front of your coat where you can get at it with gloves."',
      ilva: ['"When Ilva went up to the tower this spring, I lent her my coat. She came back without a word about what she’d seen, so I asked how long she’d been looking for another person who’d been pulled from the sea."', '"She said she’d been asking since the day she was pulled out. I should’ve offered her a bed for the night. By the time I thought to ask, she was on the road to Aldermoot."'] },
    { hi: '"I’m Oswin Gale. When Odalys took me on, I thought I was too old to make mistakes in front of the young ones. If you’ve been standing there wondering whether to come in, you might as well put your name on the board. There’s room."',
      win: '"You made me think through every answer. The laurel’s yours, and I hope you’ll come back for another bout once you’ve had a rest."',
      ilva: ['"When Ilva came to Aldermoot years ago, I let her use our reading room. She’d been through the charts and wanted to read what people had written about the sea in their own letters. I let her look through the correspondence we kept upstairs."', '"When she came back this spring, I asked her to look after herself. She promised to go down to the archive with enough food for a week. I should have insisted on going with her."'] }];
  // A note appears in the next dojo only after the player beats Sorrel in this one.
  const NOTES = [
    'I owe you a handshake for Tallyport. I was angry and I left before I gave it to you. If you see me here, I’d like to give you that handshake. — Sorrel',
    'Pell says I answer too early. I asked him what was wrong with my answer, and he said I’d interrupted him again. Rematch in Haverly? — Sorrel',
    'I wanted that win so badly I could hardly talk after the match. Sela let me stay and practise after everybody left. I thought about asking you to stay too. Maybe next time I’ll actually ask. — Sorrel',
    'That was a good fight at Four Fords. I’m trying to get better at saying it when I lose, so you’re getting it in writing. — Sorrel',
    'Ness made me carry the benches back after the match. I’d had the strength to kick one, so Ness reckoned I had the strength to move it. I’m ready to try again in Kell. — Sorrel',
    'Highwatch is my home. I keep thinking about the people who’ll be there if we meet in the final. If I look a bit sick before the match, try to keep the smirk to yourself. I’d appreciate it. — Sorrel',
    'My brother saw us fight in Highwatch. He said he’d never seen me try so hard. I still wish I’d won, and I want another go in Aldermoot. — Sorrel'];

  function sorrelLine({ met = false, wonHere = false, lostHere = false, wonFinal = false, wins = 0 } = {}) {
    if (!met && !wonHere && !lostHere && !wonFinal && !wins) return '"Sorrel Ashby. I’m from Highwatch. I’m entering every dojo tournament to see how far I can get on my own. It’ll be nice to fight a few bouts without my family yelling advice. I might see you in the bracket."';
    if (wonFinal) return wins === 8
      ? '"You beat me in every town. I’ve got some things to work on when I get home. If you’re ever in Highwatch, I’d like you to meet my brother. He’s going to want to hear your side of it."'
      : '"You won in Aldermoot. I had to come all the way out here to find out how I’d fight without my family watching. I’d like another bout in Highwatch, though. I think I could handle them yelling this time."';
    if (wonHere) return '"You got me here before. I’ve been thinking about our match, and I’d like another chance whenever you feel like entering."';
    if (lostHere) return '"I remember our final. Come back for another go when you’re ready. One final doesn’t tell me what’ll happen in the next one."';
    return '"I’ve put my name down here. If we both make the final, come find me after the match."';
  }
  return { MASTERS, RIVAL, TRAVEL, STUDENTS, SPECIALIST_LINES, ODALYS, TOWN, FILL, PRIZES, SAY, NOTES, sorrelLine };
})();
if (typeof module !== 'undefined') module.exports = Dojo;
