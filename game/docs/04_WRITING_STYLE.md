# Brasswake writing rules

Last updated: 2026-11-21. The game copy of this file is `STYLE.md` in the repo; keep the two identical.

Every line of text in the game is checked against these rules: dialogue, lessons, questions, item and creature descriptions, buttons, notes.

## The world and the story

**You.** A young name on the rise in your own world (warrior, mage, thief or crafter) with stories already told about you. A storm, then nothing. The crew of the Marigold pulled you out of the sea off Tallyport. You tell them who you are, and the story beats you to the dock.

**The world.** Everything here that takes skill (a sword stroke, a spell, a lock, a trade, a catch) works through SQL written against the Ledger, the record of everything in the land. Nothing you knew back home carries over. You can't write a line of SQL.

**The Trials.** Each town sends a champion to the Trials: eight Examiners, one per Circle, then the council's Audit. Tallyport's champion, Corin Hale, died in the Bilge Vaults two weeks before you washed up. With no champion the town loses its say on the council. Tallyport knows you from the stories and enters you, and the masters teach you SQL from the first line. Fame fades with distance: Tallyport and Brackwater know your name; by Highwatch people have only heard of "Tallyport's stranger".

**The lost schema.** The Ledger people use every day is a few tables. Legend says the whole Ledger had many more, lost for thousands of years, and that with all of them joined you could answer anything. Each dungeon holds one lost table; beating it adds that table to your copy of the Ledger.

**Ilva Thorne.** Tallyport's old master, who trained Corin. She came out of the same sea forty years ago and never found her way back. She has spent her life looking for the lost tables, and she went north in spring. Her journal pages, found one per region, hold the questions she could not answer yet (the Great Truths). The last one asks where people like you and her come from, and that answer is the way home. Some lines suggest she has been erasing rows of her own; nobody says why, and the story does not explain it early.

**Odalys Brine.** About 75, walks with a cane, still the First Circle master at the guildhall. Too old to stand for the town in the Trials. She taught Ilva when Ilva came out of the sea; Ilva later trained Corin.

**Tamsin.** The Marigold's deckhand who pulled you out. She walks you round Tallyport on your first day (the guided start) and goes back to her ship at the examiner's ring. Practical, kind, says what to do next.

**The dojos.** Every town has one: students sparring, practice dummies, and an optional tournament (sixteen in a bracket, four bouts, then the master spars you for the dojo's prize). Each master was once Odalys's student, and each knew Ilva at a different age; they tell you about her only after you beat them. Sorrel Ashby, a travelling duelist from Highwatch, is doing the same circuit one town ahead and leaves a short note pinned in the next dojo after each final. Masters: Hesper Coyle (Tallyport), Pell Rushing (Brackwater), Sela Marrow (Haverly), Gus Harrow (Four Fords), Ness Corrigan (Cinderwick), Aurel Dunn (Kell, blind), Signe Vale (Highwatch), Oswin Gale (Aldermoot, Odalys's first student).

**Your first day.** Odalys meets you in the Tallyport dojo, watches your old skill fail against a training dummy, then breaks it with one query (a CTE, a RANK window and a join) and explains SQL. She promises you'll write the same by the Audit; the first time you hand in a correct query with all three, she remarks on it.

People who knew Ilva notice that you came the same way she did. Nobody makes a speech about it.

## Words

- Call it **SQL**. A **query**, a **table**, a **column**, a **row**, **the Ledger**. Never "the Art", "a working", "asking the Ledger", "forms".
- Name SQL parts by their names: SELECT, WHERE, ORDER BY, JOIN, GROUP BY.
- Game words keep their names but are explained once, in plain terms: a **page** is an ability written in one of your books; a **Circle** is a level of SQL and the town that teaches it.
- No invented word unless a character explains it the first time it comes up.

## How people talk

1. Plain words, contractions, short sentences. Read the line aloud. If no person would say it that way, rewrite it.
2. Every line does one job: moves the story, tells you what to do or what's on offer, or shows who the speaker is. A line that does none of these is cut.
3. Say the thing. If a character wants something, they say what, from whom, and for how much.
4. Specifics over mood: names, places, amounts, directions, days.
5. Each person sounds like themselves through what they care about. Odalys is blunt and practical and wants you competent. The bosun is gruff and superstitious. Do not give anyone a verbal tic to stand in for character.
6. A first line says who they are to you or what they want. Lore and backstory sit behind an option ("Ask about Thorne").
7. Length: at most two sentences, about 30 words, per speech bubble.
8. People react to who you were back home where it fits: a warrior is told the sword arm won't help yet, a mage that spells here are queries.
9. Humour comes from the situation or the person. Never a quip tacked onto the end of a line.

## Instructions, buttons and notes

- Imperative and concrete: "Tap a word to fill the next blank."
- Use the label shown on screen: "Tap Tables", not "check the data".
- One sentence per explanation.
- Numbers over adjectives: "95% to hit", "4 casts left today".
- Titles say what the thing is: "Lesson 3: Your first query".

## Lessons, questions and feedback

- Teacher voice: what the clause does, then an example. "WHERE keeps only the rows that match. SELECT name FROM vendors WHERE realm = 'Tallyport'."
- Questions are plain requests: "Show the realm of every vendor."
- Feedback says what is wrong and where: "Your query returned 12 rows. The answer has 4. Check your WHERE."

## Never

- Ending a line on a twist, punchline or aphorism ("which surprises people", "That is fishing.").
- Fortune-cookie wisdom ("One number, if it is the right one, ends an argument.").
- Vague mystique standing in for a fact ("The harbor has work for a tidy question.").
- "Not X, but Y" and "It isn't X, it's Y" constructions.
- Lists of three for rhythm.
- Giving abstractions a will ("the Ledger remembers", "the water answers").
- Telling the player something is important instead of saying it.
- Descriptions that are jokes instead of information. A creature description says what it is and what it gives you.

## Before and after

| Before | After |
|---|---|
| "Sit. Everyone in this land does their work by the Art: the smith, the thief, the healer. The Art is asking the Great Ledger a question so exactly that it has to answer. I teach the first way of asking. Learn it and your sword arm gets better, which surprises people." | "So you're the one they fished out of the harbour. A fighter back home, I hear. That won't help you here. Everything that takes skill runs on SQL. Sit down and I'll teach you the first part." |
| "Back, and still asking. Good. The harbor has work for a tidy question." | "Back for more? The harbourmaster's books are a mess. Sort them and he'll pay 25 gold." |
| "Thorne would say you are ready before you are. I say do the next one." | "Not yet. Do two more exercises and then go north." |
| Lesson title: "Your first working" | "Lesson 3: Your first query" |
| Tip: "The same form as your lesson: SELECT, what you want, FROM, the table." | "SELECT the column, then FROM the table." |
| Dockhand: "Novice for the Trials? Master Brine teaches the First Circle. East along the pier, by the guildhall." | "You're the one we pulled out of the water. Odalys Brine wants to see you. Guildhall, east along the pier." |
| Fishing: "A right answer, and the line still comes back empty. That is fishing." | "Right answer, but nothing's biting. Try another cast." |
| Wild Sheep: "Somebody lost it a long time ago." | "Wild Sheep. Harmless. Drops meat and a hide." |

## How the rewrite is done

1. The opening first, as a sample: the ship, the dock, Odalys, the first lesson, the first fight.
2. After the sample is approved, every remaining line, town by town, then items, creatures, places and errands.
3. Every rewritten line is checked against the Never list before it goes in.

## Decision log

- 2026-11-21: Supporting characters (accounts with five slots) see story NPCs refuse politely and name the main character. Lines follow the rules above.
- 2026-11-21: Town names changed (see 02_GAMEPLAY.md). Town names should sound like places people live in, UO style: short, varied in shape, never puns on SQL terms and never plain landscape descriptions.
