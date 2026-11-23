# Brasswake writing rules

Last updated 2026-11-22. Keep `game/STYLE.md` byte-for-byte identical to this file. The [story bible](STORY_BIBLE.md) owns continuity, character briefs, and what each scene can assume. The [coverage register](STORY_COVERAGE.md) records the content families reviewed in the current pass.

## Write a connected thought

Use ordinary language that a person would read or say naturally. Give a reader the person, thing, or event a sentence refers to before relying on it. A deliberate fragment can work when a speaker is interrupted, hurried, or answering a question. It still needs enough context to make sense. Read a whole passage aloud with the lines around it. If it sounds as if every sentence had to fit in one breath, give it room.

Prefer familiar words, concrete details, and active verbs. An unfamiliar word should earn its place by describing something accurately or by belonging to the speaker. Keep a surprising turn of phrase if it says something that the rest of the passage needs. Remove adjectives, invented nouns, and comparisons that only call attention to themselves. First make the meaning clear, then see what the character would do with it.

A scene needs a reason to happen. A person asks because a delivery is late, a decision is due, or someone needs help. Give the player the facts that make the task actionable. Let the result change something the speaker cares about. In a series of optional encounters, each scene supplies its own premise so it can work on its own.

## Dialogue

- Give a first encounter enough space to establish who the speaker is, why they are here, and what connects them to the player. An optional conversation can deepen that connection after the immediate situation is clear.
- Let people have different ideas about what matters. Tamsin notices who's cold and who needs a hand. Odalys wants to see how a pupil got their result. Ysolt cares what a tool could let someone do when she is gone. The difference should survive with the names removed.
- Allow kindness, impatience, pettiness, anger, hesitation, or swearing when the person and moment call for it. A kind person can lose their temper. An abrasive person can do something decent and mean it. Write humour out of what people do and say to each other. Leave room for plain replies and silence.
- Base returning lines on actual state. A note after a recorded win can mention that win. A new arrival has heard no unplayed conversation. If a branch lacks enough information for a personal callback, write an honest neutral line.
- Break longer phone dialogue at a complete thought or a shift in the conversation. Let the player read the information they need before showing the choice that depends on it. There is no fixed limit on words or sentences. Prefer a short second beat to a chopped or overstuffed first one.

## Instructions and SQL

Use the labels the player can see. If a button says **Run**, tell the player to tap **Run**. A sign, heading, or item caption can be short when the context makes its meaning clear. Feedback says what happened, where to look, or what the player can do next. Give actual numbers for rewards and healing when the game knows them.

Use the names **SQL**, **query**, **table**, **column**, **row**, and **result**. Refer to clauses by their actual names, including `SELECT`, `FROM`, `WHERE`, `ORDER BY`, and `JOIN`. Define new terms with a visible example and use the same words for the same idea afterward. Write for SQLite as used here when behavior varies between databases.

Teach in this order when a concept is new. Give the player a practical reason to use it. Explain what it does, show a small example, then let the player try it and read the result. A later exercise can assume earlier knowledge where the progression supplies it. Repeat a brief explanation or point to the relevant lesson where optional routes may have skipped it. Make a practice copy explicit before adding, changing, or deleting data. Historical restoration is a story act with its own source evidence.

Useful game terms still need a first-use explanation. A **page** is an ability you learn from one of four books. A **Circle** is one level of SQL in the eight-town course. The **Ledger** is also the name of the player's interface for looking at records. Name the company books, a practice copy, and the historical archive when a distinction matters to the player.

## Review in context

Read the scene as a player who reached it normally and as someone who arrived early or came back after it. Check the identity and relationship the first line establishes, what the speaker actually knows, what the player must decide or do, and what follows as a result. Follow a pronoun back to its subject. Compare the task to its reference query, check the numbers against a real result, and verify that combat, item, or travel claims match what the game does. A clean line in isolation can still fail when repeated in a different state.

> “A wagoner showed me his signed delivery slip. The customer says the guild never sent a bill. Compare the shipped orders with the invoices and see how often that happened.”

Bly's request identifies both records and why he is comparing them. When the result comes back, he can check the missing invoices against delivery slips. The player gets a reason to learn the join before seeing its syntax.

## Decision log

- 2026-11-22. Release candidate `story-first-day-2026-11-22`: the story and first-day revision puts natural, connected thoughts before compression. Characters can be generous, difficult, or funny in their own ways. Use coherent phone dialogue beats, grounded state and evidence, and direct SQL vocabulary. The story bible and coverage register document the continuity and editorial decisions for this release.
- 2026-11-21. Supporting characters can do company work. Story NPCs can refer them to the main character when that character is the one involved.
- 2026-11-21. Town names should sound like places people live in. The current names are in `02_GAMEPLAY.md`.
