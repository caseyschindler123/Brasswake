# Brasswake writing rules

Last updated 2026-11-25. Keep `game/STYLE.md` byte-for-byte identical to this file. The [story bible](/game/docs/STORY_BIBLE.md) owns continuity, character briefs, and what each scene can assume. The [coverage register](/game/docs/STORY_COVERAGE.md) records the content families reviewed in the current pass. Repository-root links work from both copies.

## Write a connected thought

Use ordinary language that a person would read or say naturally. Complete, connected sentences are the default for dialogue and narration. Keep the subjects, verbs, articles and connecting words that make a thought sound natural. Give a reader the person, thing or event a sentence refers to before relying on it. Write the exchange in the speaker's voice before shortening it; remove repetition and unnecessary detail while preserving its spoken rhythm.

A fragment needs a reason in the scene: a direct answer, interruption, urgent warning or familiar reaction. "Three days" can answer "How long?" and "Good fight" can acknowledge a bout. Do not use fragments as the default way of delivering new information. A blunt or impatient character can still speak in complete sentences. Read the whole passage aloud with the lines around it. Check whether the speaker would actually say the line in that moment.

Prefer familiar words, concrete details, and active verbs. An unfamiliar word should earn its place by describing something accurately or by belonging to the speaker. Keep a surprising turn of phrase if it says something that the rest of the passage needs. Remove adjectives, invented nouns, and comparisons that only call attention to themselves. First make the meaning clear, then see what the character would do with it.

A scene needs a reason to happen. A person asks because a delivery is late, a decision is due, or someone needs help. Give the player the facts that make the task actionable. Let the result change something the speaker cares about. In a series of optional encounters, each scene supplies its own premise so it can work on its own.

## Natural speech and rhythm

Use ordinary contractions when they suit the speaker: "it'll," "we're," "you've," "that's" and "don't." Restoring a missing subject or verb should preserve the character's natural register. A formal speaker may prefer "it will"; Tamsin would usually say "it'll."

Casey's correction establishes the preference:

> Compressed: "Another three days if the weather holds."
>
> Natural: "It'll be another three days if the weather holds."

Those extra words carry the rhythm of the spoken sentence. Keep them. Read the surrounding lines as an exchange, too. Two complete sentences can still sound mechanical when each delivers an isolated fact. Where thoughts belong together, connect them naturally:

> "It'll be another three days if the weather holds, so try to get some rest."

Let sentence length vary with the thought and the speaker. Use "and," "but," "because," "while" or "so" where they express a real relationship. Avoid a succession of short declarations, forced punchlines or cryptic sayings. Expanding a clipped line into stiff, formal language creates another voice problem; choose the ordinary words that person would use.

Phone presentation should wrap, scroll or divide a passage at a complete thought. Preserve the sentence's natural grammar when arranging those beats. A small screen does not require a compressed writing style.

## Dialogue

- Give a first encounter enough space to establish who the speaker is, why they are here, and what connects them to the player. An optional conversation can deepen that connection after the immediate situation is clear.
- Let people have different ideas about what matters. Tamsin notices who's cold and who needs a hand. Odalys wants to see how a pupil got their result. Ysolt cares what a tool could let someone do when she is gone. The difference should survive with the names removed.
- Allow kindness, impatience, pettiness, anger, hesitation, or swearing when the person and moment call for it. A kind person can lose their temper. An abrasive person can do something decent and mean it. Write humour out of what people do and say to each other. Leave room for plain replies and silence.
- Base returning lines on actual state. A note after a recorded win can mention that win. A new arrival has heard no unplayed conversation. If a branch lacks enough information for a personal callback, write an honest neutral line.
- Break longer phone dialogue at a complete thought or a shift in the conversation. Let the player read the information they need before showing the choice that depends on it. There is no fixed limit on words or sentences. Prefer a short second beat to a chopped or overstuffed first one.

## Instructions and SQL

Use the labels the player can see. If a button says **Run**, tell the player to tap **Run**. A sign, heading, item caption or brief status such as "Saved" can be short when the context makes its meaning clear. Dialogue, narration, quest premises, task instructions, lessons and explanatory feedback follow the natural-prose rules above. A task instruction should state the action: "Show the names and cities of [tier]-tier customers in the [region] region" gives the player more direction than "[Tier]-tier customers in the [region] region." Feedback says what happened, where to look, or what the player can do next. Give actual numbers for rewards and healing when the game knows them.

In the introduction, establish SQL as the language that powers skilled actions before teaching with records. Explain the manifest as a safe practice example and connect that practice to an ability demonstration. Keep ordinary company records and the fantasy role of skilled actions clear.

Use the names **SQL**, **query**, **table**, **column**, **row**, and **result**. Refer to clauses by their actual names, including `SELECT`, `FROM`, `WHERE`, `ORDER BY`, and `JOIN`. Define new terms with a visible example and use the same words for the same idea afterward. Write for SQLite as used here when behavior varies between databases.

Teach in this order when a concept is new. Give the player a practical reason to use it. Explain what it does, show a small example, then let the player try it and read the result. A later exercise can assume earlier knowledge where the progression supplies it. Repeat a brief explanation or point to the relevant lesson where optional routes may have skipped it. Make a practice copy explicit before adding, changing, or deleting data. Historical restoration is a story act with its own source evidence.

Useful game terms still need a first-use explanation. A **page** is an ability you learn from one of four books. A **Circle** is one level of SQL in the eight-town course. The **Ledger** is also the name of the player's interface for looking at records. Name the company books, a practice copy, and the historical archive when a distinction matters to the player.

## Review in context

Read the scene as a player who reached it normally and as someone who arrived early or came back after it. Check the identity and relationship the first line establishes, what the speaker actually knows, what the player must decide or do, and what follows as a result. Follow a pronoun back to its subject. Compare the task to its reference query, check the numbers against a real result, and verify that combat, item, or travel claims match what the game does. A clean line in isolation can still fail when repeated in a different state.

Choose executable checks using the environment-use guide in `game/docs/05_CODING_WORKFLOW.md`. Contextual reading can use source and directly prepared scenes; it does not require replaying an entire profession day for every wording edit. Use affected phone/desktop captures for presentation and the relevant normal flow when teaching branches, prerequisites, checkpoints or progression change. Dev setup can reach a scene quickly, but does not prove that the ordinary route reaches the same state. Codex performs routine review; Casey is not assigned manual QA.

During the prose pass, restore omitted grammar wherever brevity has made a line sound clipped. Read it aloud again in the full exchange, checking contractions, connections between thoughts and variation in rhythm. Keep a fragment when the scene gives it a natural purpose. Recheck meaning and voice after any shortening; do not treat a scan for fragments as a substitute for editorial review.

> “A wagoner showed me his signed delivery slip. The customer says the guild never sent a bill. Compare the shipped orders with the invoices and see how often that happened.”

Bly's request identifies both records and why he is comparing them. When the result comes back, he can check the missing invoices against delivery slips. The player gets a reason to learn the join before seeing its syntax.

## Decision log

- 2026-11-24: Casey found the boat explanation too narrowly about bookkeeping. Tamsin establishes SQL’s role in skilled actions; Odalys explains the practice records and demonstrates the connection. Preserve actual SQL terminology and the practical teaching example.

- 2026-11-23. Casey's correction from "Another three days if the weather holds" to "It'll be another three days if the weather holds" makes natural spoken grammar and rhythm explicit. Preserve ordinary subjects, verbs, contractions and connective words; use fragments for a clear conversational purpose and use layout to handle phone space. Apply this standard across player-facing prose. This documentation update does not rewrite or certify the existing script; the follow-up review is recorded in STORY_COVERAGE.md.
- 2026-11-22. Release candidate `story-first-day-2026-11-22`: the story and first-day revision puts natural, connected thoughts before compression. Characters can be generous, difficult, or funny in their own ways. Use coherent phone dialogue beats, grounded state and evidence, and direct SQL vocabulary. The story bible and coverage register document the continuity and editorial decisions for this release.
- 2026-11-21. Supporting characters can do company work. Story NPCs can refer them to the main character when that character is the one involved.
- 2026-11-21. Town names should sound like places people live in. The current names are in `02_GAMEPLAY.md`.

- 2026-11-23. The boat-intro release applies these rules to character introductions, regional/optional/generated script families and explanatory feedback. Keep every newcomer’s immediate purpose, source of knowledge and next action explicit; use phone layout and full-thought dialogue beats to preserve ordinary grammar. Scope and execution evidence are tracked in STORY_COVERAGE.md and the boat-intro plan.

- 2026-11-24. The full-script pass and playable boat introduction are released after complete guided-day, browser and hosted checks. The coverage register and completed plan distinguish source review, automated player execution and external human/real-device limitations.
