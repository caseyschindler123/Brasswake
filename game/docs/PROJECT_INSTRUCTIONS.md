# Project instructions: Brasswake

Use the master documents in this folder: 01_ARCHITECTURE.md, 02_GAMEPLAY.md, 03_ART_STYLE.md, 04_WRITING_STYLE.md and 05_CODING_WORKFLOW.md. Maintain them directly in the repository; no project-field paste or agent hand-off is needed. Root AGENTS.md automatically applies the coding workflow to implementation tasks.

---

You are helping build Brasswake, a mobile SQL-learning RPG in the spirit of Ultima Online. Casey owns the design. The local agent maintains the code, art pipeline, approved image generation and master docs. The repository is the source of truth; GitHub Pages hosts the game and the Claude artifact remains a playable preview.

## Read before you work

- Before changing code, read 01_ARCHITECTURE.md.
- Follow [05_CODING_WORKFLOW.md](05_CODING_WORKFLOW.md) automatically; it owns detailed process and verification rules. Default to simple and name a concrete consequential risk or unresolved design decision before choosing complex. Planning and testing are independent. Routine releases use short three-profile smoke plus affected checks; nightly/manual full and risky/unknown changes retain complete journeys. Documentation needs review/diff checks; tooling uses affected automation checks and does not deploy unchanged game output. Reuse successful CI hosted evidence. Honor local-only requests, report available costs honestly and use subagents economically.
- The [scope-based criteria and Dev-mode plan](plans/2026-11-25-scope-based-testing-and-dev-mode.md) describes planned efficiency work. Reduced cosmetic/registration gates and unified Dev commands are not built. Keep current executable safeguards until verified replacements exist; Codex handles routine automation and capture inspection without assigning Casey manual QA.
- Before changing rules, numbers, content or story, read 02_GAMEPLAY.md.
- Before writing any image prompt or packing art, read 03_ART_STYLE.md.
- Before writing any text a player will see, read 04_WRITING_STYLE.md.
- If the documents and the code disagree, the code is what ships. Say where they disagree, fix the document, and ask Casey if the difference looks unintended.

## Keep the context documents current

The documents are the project's memory. Keep their current-state descriptions accurate when behavior or lasting decisions change. A routine fix restoring documented behavior does not require a master-doc edit, decision entry or saved plan.

1. **When a lasting decision is made**, record it once in the document that owns the topic, in the same change. Decisions include:
   - a rule or number changing
   - Casey choosing between options
   - a feature added or removed
   - an art style rule, a file layout or a save format changing

   The owners:
   - **Architecture:** files, build, save format, tests, publishing, conventions.
   - **Gameplay:** systems, numbers, content, story, what is and is not built.
   - **Art style:** how images look, art sizes, prompt rules, packing.
   - **Writing style:** voice and wording.
   - **Coding workflow:** agent process, classification, verification, delegation and cost reporting.
2. **Write the current state**, not a story of how it got there. Replace the old number or rule in place. Add a dated line to that document's "Decision log" at the bottom: the date, what was decided, and why if Casey gave a reason.
3. **Mark plans as plans.** Anything agreed but not yet built goes under "Planned, not built", and moves into the body once it ships. Never describe a planned feature as live.
4. **How to apply the update:**
   - If the documents are in a folder you can write to (for example `docs/` in the game repo), edit the files directly and say which files and sections changed.
   - If you can't write to them (for example, they are only uploaded project knowledge), end your reply with a section titled **Context updates**. For each changed document, give the full replacement text of each changed section, clearly labelled, so Casey can paste it in. If more than a third of a document changed, give the whole document.
5. **Before publishing a build**, reconcile affected current-state/planned descriptions. Add a dated entry only for a changed lasting decision; avoid repeating release narratives or volatile counts owned by source/manifest data.
6. **After a verified game release**, append concise commit/run/date/hash/check/limitation evidence to `RELEASE_HISTORY.md`; close and link a plan only when one exists. Distinguish reused evidence from checks run now. Tooling-only work records checks and non-publication in its plan or completion report. Missing evidence stays unavailable; ignored logs/screenshots supplement the tracked record. A later release supersedes the hosted version without undoing an earlier verified release.
7. **Before finishing any task**, review affected current/planned descriptions, decision logs and plan status for contradictions. State local-only or uncommitted status when applicable. Documentation-only release closure needs no new game build/test/deployment; honor any hold on committing/pushing. These are review responsibilities, not claims that CI semantically validates prose.
8. Keep each document under about 25 pages. When one grows past that, condense old detail and keep the numbers and rules.

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

- 2026-11-25: Casey requested simple by default, proportional test selection and less routine bookkeeping. Detailed commands/policy remain in 05_CODING_WORKFLOW.md; update owning context only for changed behavior or lasting decisions and retain concise release evidence without repeated narratives. The proportionate-framework plan records tooling validation and non-publication.

- 2026-11-23: Casey requested correction of the context audit findings. Keep concise release closure in tracked RELEASE_HISTORY.md and plan statuses; local receipts/logs supplement that record. Reconcile stale planned/current sections and derive volatile asset counts from the manifest. This cleanup was initially held locally; Casey later explicitly authorized including all outstanding infrastructure/context work in the cartography release, now verified at 17441a1.

- 2026-11-23: Casey requested concise per-task cost reporting and corrected the cost rule to simple. Check scope follows changed behavior; docs and Codex instructions do not need game tests or a deployment. Cost reporting uses existing evidence and never invents unavailable dollar amounts. This rule update was initially held locally and later included under Casey's explicit all-outstanding-changes release approval.

- 2026-11-22: The repository and `game/docs/` are the source of truth. The local agent owns the pipeline, approved image generation and docs; the project-field paste workflow is retired. Raw art stays read-only during rebuilds and is never committed. Existing art is not regenerated to fix pipeline defects.

- 2026-11-22: Casey authorized repository creation and GitHub Pages deployment. The remote is `https://github.com/caseyschindler123/Brasswake`; pushes to main validate, build and deploy. Keep raw art and working pieces local.
- 2026-11-22: Casey chose automatic task classification, proportionate planning/testing, automatic deployment for both classes, cost-effective main-agent delegation, and UI checks only when game behavior or presentation warrants them. Root AGENTS.md and 05_CODING_WORKFLOW.md define the defaults.
