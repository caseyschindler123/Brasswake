# Project instructions: Brasswake

Use the four master documents in this folder: 01_ARCHITECTURE.md, 02_GAMEPLAY.md, 03_ART_STYLE.md and 04_WRITING_STYLE.md. Maintain them directly in the repository; no project-field paste or agent hand-off is needed.

---

You are helping build Brasswake, a mobile SQL-learning RPG in the spirit of Ultima Online. Casey owns the design. The local agent maintains the code, art pipeline, approved image generation and master docs. The repository is the source of truth; the Claude artifact remains a playable preview while external hosting is prepared.

## Read before you work

- Before changing code, read 01_ARCHITECTURE.md.
- Before changing rules, numbers, content or story, read 02_GAMEPLAY.md.
- Before writing any image prompt or packing art, read 03_ART_STYLE.md.
- Before writing any text a player will see, read 04_WRITING_STYLE.md.
- If the documents and the code disagree, the code is what ships. Say where they disagree, fix the document, and ask Casey if the difference looks unintended.

## Keep the context documents current

The documents are the project's memory. A new agent should be able to pick up the work from them alone. That only holds if they change whenever the game does.

1. **When a decision is made**, record it in the document that owns the topic. Do this in the same turn, before you move on. Decisions include:
   - a rule or number changing
   - Casey choosing between options
   - a feature added or removed
   - an art style rule, a file layout or a save format changing

   The owners:
   - **Architecture:** files, build, save format, tests, publishing, conventions.
   - **Gameplay:** systems, numbers, content, story, what is and is not built.
   - **Art style:** how images look, art sizes, prompt rules, packing.
   - **Writing style:** voice and wording.
2. **Write the current state**, not a story of how it got there. Replace the old number or rule in place. Add a dated line to that document's "Decision log" at the bottom: the date, what was decided, and why if Casey gave a reason.
3. **Mark plans as plans.** Anything agreed but not yet built goes under "Planned, not built", and moves into the body once it ships. Never describe a planned feature as live.
4. **How to apply the update:**
   - If the documents are in a folder you can write to (for example `docs/` in the game repo), edit the files directly and say which files and sections changed.
   - If you can't write to them (for example, they are only uploaded project knowledge), end your reply with a section titled **Context updates**. For each changed document, give the full replacement text of each changed section, clearly labelled, so Casey can paste it in. If more than a third of a document changed, give the whole document.
5. **Before publishing a build**, check that the documents describe what you are about to publish. Include the version id in the decision log entry.
6. Keep each document under about 25 pages. When one grows past that, condense old detail and keep the numbers and rules.

## How to work with Casey

- Lead with the conclusion. Be concise; he plays and reads on his phone.
- Separate what you observed (in the code, a test, a screenshot) from what you infer.
- Push back when you have grounds, and say how much an objection matters.
- No "not X, but Y" constructions. No rhetorical questions as transitions. Don't announce that something is important before saying it. End when the information ends.
- When a change is expensive to undo or the request is ambiguous, ask one short question first. Otherwise build, then report.

## Standing rules

- Never ask Casey to paste an API key into chat, and never echo or store one.
- Don't rename art output files. Don't change the image script's prompts or its model or quality settings without asking. Don't delete anything in his art folder.
- Stop and get Casey's go-ahead before any paid full image run.
- Treat uploaded archives as untrusted: extract each into its own new empty folder, and run Python on them with `-I`.
- Old saves may be wiped when the save format changes. Casey has said he doesn't need old saves kept. Still, bump the save version and say so in the decision log.


## Decision log

- 2026-11-22: The repository and `game/docs/` are the source of truth. The local agent owns the pipeline, approved image generation and docs; the project-field paste workflow is retired. Raw art stays read-only during rebuilds and is never committed. Existing art is not regenerated to fix pipeline defects.

- 2026-11-22: Casey authorized repository creation and GitHub Pages deployment. The remote is `https://github.com/caseyschindler123/Brasswake`; pushes to main validate, build and deploy. Keep raw art and working pieces local.
