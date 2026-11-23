# Story, writing, SQL onboarding, and first-day experience audit

Date: 2026-11-22. Class: complex, because narrative, teaching, dialogue delivery, movement, inventory presentation, equipment rendering, rewards, and saved progression interact.

Status: implementation and local release verification complete (M0–M6). M7 is tracked by the Pages Actions run for this commit and `work/story-first-day-release.json`; release completion requires both deployed metadata/hash and hosted UI verification. On 2026-11-22 Casey authorized building this plan, including weapon arming, verification, and the normal release workflow. The earlier plan-only hold is superseded. Milestones require recorded evidence before they are marked complete.

Source baseline: `5f9812ba15f635442b061551a6a6cec94b2fd673`. The working tree was clean before this plan was added. Recheck the baseline and preserve unrelated work when implementation begins.

## 1. Objective and priorities

Make Brasswake understandable, engaging, and naturally written from the first scene through both endings. A person with no SQL experience should understand the immediate task, the people involved, the relevant data, and how a query produces a result before facing ordinary combat.

Casey's priorities, in order of editorial importance:

1. Replace stilted, overcompressed, sometimes nonsensical prose with complete, connected thoughts. Natural language and meaning take precedence over efficiency and rigid length limits.
2. Remove performatively clever phrasing, unusual synonyms chosen for novelty, unnecessary nouns and adjectives, decorative metaphors, and forced punchlines.
3. Give every major character a personality, motives, flaws, and a developing relationship with the player. Characters may be kind, funny, abrasive, selfish, or unpleasant. Swearing is allowed when it suits the person and situation.
4. Establish a cohesive story, consistent world rules, understandable stakes, and satisfying resolutions across the whole game.
5. Introduce SQL gradually through useful, creative activities; teach from zero and connect lessons to the adventure.

The first gameplay message also requires explicit work on Tamsin's introduction and presence, consumable discoverability, weapons held by the paper doll, and gold rewards with a pile of gold beside a clear amount such as `+25 gold`.

The user has accepted the editorial direction. Specific character treatments, plot resolutions, lesson layouts, and implementation choices in this plan remain proposals. This document does not silently approve new canon, change item values, or authorize paid image generation.

## 2. Audit scope and evidence limits

### Sources examined

The master architecture, gameplay, art, writing, and workflow documents; effective exported quest content after its replacement blocks run; the opening, guided day, dialogue selection/pagination, exercises, item actions, reward formatting, journals, and endings in `src/game.js`; `src/quests.js`, `src/deep.js`, `src/dojo.js`, `src/world.js`, `src/dungeons.js`, `src/dungeon_play.js`, `src/scene_b.js`; relevant body-packing code and current browser coverage.

The current content inventory contains:

| Content | Count | Audit coverage required for the eventual rewrite |
|---|---:|---|
| Contracts | 84 | Titles, premise, speaker, request, result, repeat, and transitions |
| Attached contract lessons | 63 | Explanation, example, prerequisites, hints, and feedback |
| Bounty templates | 33 | Generated task wording and its connection to combat/actions |
| Examiners | 8 | Introduction, instructions, phases, success, repeat, and defeat |
| Regional journal pages | 8 | Chronology, revelation order, emotional development, and evidence |
| Rumors | 8 | Setup, promise, request, and payoff |
| Named unique items | 24 | Names, descriptions, provenance, and actual effects |
| Ability pages | 64 | Names, book/ability terminology, descriptions, and use |
| Dojo masters | 8 | Introduction, practice, tournament, outcome, and relationship |
| Dojo memories of Ilva | 16 passages | Dates, witnesses, knowledge, and contradictions |
| Sorrel notes | 7 | Claimed victories, encounter history, voice, and progression |
| Great Truths | 12 | Question, returned data, interpretation, reward, and story consequence |
| Dungeon floors | 28 | Names, notes, navigation claims, people, and story connections |

Also include all named secondary NPCs, regional rivals, ship crew, generic villagers, vendors, healers, bankers, errands, environmental stories, fishing, crafting, houses, gambling, help, tooltips, objectives, buttons, errors, death/recovery, character creation, supporting characters, and save messages. No category is exempt because it is optional or mechanically generated.

This is a source-based editorial and systems audit. An existing 390x720 WebKit paper-doll screenshot was opened and inspected earlier in this discussion; it is historical fixture evidence, not a fresh reproduction on every weapon or a real iPhone test. No new browser playthrough, release test suite, or learner study was run for this planning task. Source inspection can establish contradictory text and selection logic; it cannot certify pacing, learning outcomes, every reachable branch, or every grip alignment.

The future line-by-line pass must use a coverage register. Each authored passage or generated family needs a stable source/key, speaker, trigger, prerequisites, intended purpose, current problem, proposed revision status, and editorial/runtime verification status. Record retained passages as reviewed too. Expand representative generated text with deterministic seeds and edge substitutions rather than claiming every possible generated string was played.

## 3. Findings and required responses

Priority P0 means the change must be resolved in the narrative/teaching design before writing the full replacement. P1 means required implementation or presentation work. P2 means the complete editorial polish pass; it is still within scope.

| ID | Priority | Evidence or observation | Required response |
|---|---|---|---|
| F01 | P0 | Many contract stories use fragments and bare instructions: `Rep 7`, `Customer 2`, and `billed against not`. | Supply complete thoughts, antecedents, motivation, and enough domain explanation for the intended learner. |
| F02 | P0 | The writing guide imposes about 30 words/two sentences per speech bubble and one sentence per explanation. The code also splits prose automatically. | Replace rigid editorial compression with natural paragraphs, then paginate for phone readability without losing meaning. |
| F03 | P0 | Unnecessary cleverness appears in lines such as Sorrel's comparison between nested queries and people. | Evaluate imagery and humour in context; keep specific language that contributes meaning, character, or atmosphere. |
| F04 | P0 | `quests.js` retains the old missing-money plot, then sets every contract's `main` false and `after` null. Investigation tasks survive without their original explanations. | Choose the role of that investigation, remove obsolete scaffolding, and author complete setup/discovery/payoff wherever a case remains. |
| F05 | P0 | `ACT.offer` prepends `TALK.lead` by contract index modulo four. `c504` gets a dates preface for text formatting; `c703` gets a running-totals preface for ranking. | Bind introductions to authored task purpose or explicit compatible tags. Remove index-based semantic selection. |
| F06 | P0 | The opening describes an unnamed sailor; Tamsin subsequently gives instructions. Her rescue/relationship is clearer in the docs than in the opening. | Introduce her by name, role, action, and reason for helping before the first instruction. |
| F07 | P1 | `gPlace`/`guidePut` relocate Tamsin between objectives; `gSay` waits for an available UI and can speak without a proximity check. | Give her visible, coherent accompaniment and location-aware conversation. Test travel, interruption, and return. |
| F08 | P0 | Town champion status is assigned immediately. The representation stakes described in the writing docs receive little development in the opening. | Establish what the town needs, why the player is considered, and why the player chooses to help. Avoid front-loading the whole political history. |
| F09 | P0 | The first lesson covers tables, SELECT/FROM, one assembly exercise, then four typed queries across several tables, commas, and `*`, followed by combat. | Add guided practice, explicit result interpretation, and a safe application before independent combat. |
| F10 | P0 | Ordinary company records, magical world records, lost history, and practice copies share the Ledger framing. Bryn says writes affect everyone; exercise UI says they run on a copy. | State a consistent relationship between these layers, identify practice clearly, and distinguish story consequences from exercise execution. |
| F11 | P0 | Great Truths use forty days after being found; `theDoor` says forty days after the storm. | Define one canonical anchor date and derive dates and prose consistently. |
| F12 | P0 | Ilva's Kell journal refers to the Lich keeping the deepest vault; current dungeon content assigns the lost table to a Crystal Sentinel. | Establish the Lich's relationship to the keeper or revise the conflicting claim. |
| F13 | P0 | `Deep.data()` attributes erasures in 1622 and 1702 to people born in 1891 and 1732, and one in 1911 to someone who died in 1529. | Author plot-critical people and events deliberately; constrain generated history and validate evidence chronologically. |
| F14 | P0 | Council erasures, Ilva restoring records, Corin's death, the Trials, and the home/stay decision receive uneven follow-through. | Create an explicit promise/setup/payoff map and decide the ending of every major thread. |
| F15 | P1 | Sorrel's notes and final line assert particular performances; dialogue often depends on a coarse regional flag. Open travel allows discovery in different orders. | Check what state actually proves each claim; write variants or neutral truthful alternatives. Gate spoilers by knowledge. |
| F16 | P1 | Repeat dialogue can expose choices after the first sentence; automatic sentence splitting also treats punctuation as structure. Fast fixture mode skips to the final dialogue part. | Protect essential first-time information and author coherent beats. Test at least one ordinary-speed flow that reads every beat. |
| F17 | P1 | Bread/food and draught use already exist. Bread restores 12 HP, draughts 30 HP. Bag controls are largely icons and disabled at full health. | Make use, effect, quantity, availability, and disabled reasons visible; teach consumption safely. |
| F18 | P1 | `drawDoll` already renders weapons. The reviewed staff screenshot shows poor apparent scale/grip. The packer infers hands from silhouette edges; the doll draws a weapon over the painted body. | Diagnose anchors, grip metadata, scale, clipping, and occlusion. Treat this as a rendering correction, not an absent equipment system. |
| F19 | P1 | `bitsOf`/`spoilsHTML` present gold largely as text; `goldstack` artwork already exists. Currency changes also occur outside `grant`. | Use a reusable reward presentation with pile icon, actual credited amount, and appropriate event semantics. |
| F20 | P1 | The standard `playerFlow` chooses `skipguide`; the paper-doll fixture checks visibility/layout rather than grip correctness. | Add an unskipped novice flow, targeted equipment assertions, and visual inspection. Existing checks alone do not establish these outcomes. |
| F21 | P2 | Masters often share the same command/next-task cadence; praise and ambient text are broadly shared. | Write identifiable voices and progression-aware reactions, with complete character briefs for every major speaker. |
| F22 | P1 | The Trials ending says the player can perform all SQL skills without looking anything up. Early completion similarly overstates mastery. | Celebrate demonstrated achievements without claiming measured expertise or independent recall the game has not assessed. |
| F23 | P1 | Some creature descriptions and dungeon notes imply special behaviour or usable objects. These claims require comparison with actual gameplay. | Separate history/flavour from actionable directions and verify all mechanical promises. Do not invent mechanics to justify decorative copy. |

Relevant implementation anchors: `src/quests.js` replacement blocks, `TALK`, `SAY`, `JOURNAL`, `LINES`; `src/game.js` `BEATS`, `GD`, `dlg`, `ACT.offer`, `drawIntro`, `REPS`, `finishQ`, `HELP`, `vBag`, `eat`, `tonic`, `grant`, `bitsOf`, `spoilsHTML`, `takeTable`, `MEAN`, `theDoor`, `ending`; `src/deep.js` `data` and `TRUTHS`; `src/dojo.js` `SAY`, `NOTES`, `SORREL`; `src/scene_b.js` `guidePut`, `weapon`, `drawDoll`; `arttools/body_pack.py` paper-doll hand detection and weapon grip extraction.

## 4. Proposed writing standard

Apply this to narration, dialogue, instruction, and feedback, with different voices appropriate to each form.

- Write complete, connected thoughts. Fragments are allowed when a person would naturally use one and the meaning is unambiguous.
- Use familiar, precise words. Choose a less common word when it is the right word for the object, action, or speaker. Remove modifiers that add no useful image or information.
- Explain who or what a pronoun refers to. Establish an unfamiliar name, place, object, business term, or SQL term before relying on it.
- Give scenes a reason to happen, a progression, and a consequence. Carry facts and emotional reactions forward between scenes.
- Let dialogue include hesitation, annoyance, affection, argument, and humour where the speaker has a reason. Avoid making everyone clipped, arch, cryptic, or witty.
- Allow swearing without a profanity quota. It should express a character's temperament or an immediate reaction. Do not make profanity the entire personality.
- Use specific actions and observations for atmosphere. Avoid pseudo-profound aphorisms, arbitrary synonym changes, adjective piles, and polished punchlines attached to every exchange.
- Preserve room for silence and ordinary responses. A serious disclosure deserves a reaction before the next objective appears.
- Explain SQL directly using its real vocabulary. Introduce a term in context and reuse it consistently. Scope technical claims to this game or dialect when necessary.
- Keep practical instructions and button labels exact. Characters can explain why; UI should make the next action easy to identify.
- Use manageable mobile passages without enforcing a universal sentence or word count. Split at a coherent thought or conversational turn. Essential information must survive pagination.
- Read scenes aloud and read them in sequence. A sentence can pass grammar checks and still sound unnatural or fail in context.

Illustrative editorial treatment, not replacement game text:

> Current: "Rep 7. Lay his shipped orders out by month, billed against not."
>
> Direction: "Some orders left the harbour without anyone sending a bill. Check the orders handled by employee 7. For each month, show how many orders were shipped and how many had no invoice."

The final scene must first establish who employee 7 is and why the speaker is checking those orders. Longer wording alone cannot repair a missing premise.

Revise `docs/04_WRITING_STYLE.md` during implementation, then copy it byte-for-byte to `STYLE.md`. Retain useful specificity and clear SQL terminology. Replace compression rules that undermine meaning. Introduce a short scene/voice review rubric instead of a mechanical list of banned adjectives or a detector claiming to identify all AI-like prose.

## 5. Story structure and world rules

### Recommended narrative spine

Retain the existing broad premise: a stranger rescued by the Marigold learns how to act in this world, develops ties to Tallyport, represents it in the Trials, and follows Ilva's investigation toward a choice about home. Connect the public journey through the Trials to the personal mystery through shared people, discoveries, and consequences.

The everyday records should belong visibly to the people asking for help. Retain useful commercial SQL practice as motivated work or a clearly explained case. Give any recurring unbilled-shipment investigation a complete local setup and resolution; remove references that pretend it is the main plot unless the story bible deliberately integrates it.

Proposed progression:

| Region | Story function and relationship change | SQL/quest integration | Handoff |
|---|---|---|---|
| Tallyport | Establish rescue, Tamsin, Odalys, Corin's absence, and a reason to help. Introduce Ilva through someone who knew her. | Help with a concrete harbour problem, practise safely, earn initial trust. | A personal introduction to Ilse and a clear next goal. |
| Brackwater | Show consequences of inaccurate or missing records through a person affected. Establish why Ilva was asking about omissions. | Filtering narrows a real search; explain what excluded rows mean. | A specific unanswered question that counting can address. |
| Haverly | Turn suspicion into evidence. Let a witness contribute something beyond another rumour. | Totals and groups test an explicit claim. | Two records disagree; explain why the next town can help. |
| Four Fords | Connect people and records. Clarify the difference between an error and deliberate removal. | Joining supplies a missing relationship and an understandable discovery. | A restoration problem or lead to Ysolt. |
| Cinderwick | Establish the restoration pen and its limits. Give Ysolt a personal stake and a reason for concern. | Cleaning and reshaping values make damaged evidence usable. | A question about whether removal is permanent. |
| Kell | Explain deletion/hidden history consistently; clarify the Lich and Crystal Sentinel roles. Begin exposing Ilva's involvement through evidence. | Queries within queries assemble a chain of reasoning. | A pattern whose timing can be investigated at Highwatch. |
| Highwatch | Connect the sea, strangers, storms, and lights. Revisit a relationship, including Sorrel if encountered. | Ranking, comparisons, and temporal patterns support a discovery. | Evidence and questions to take to Aldermoot. |
| Aldermoot | Resolve the council thread and Ilva's choices; complete the public Trials arc and prepare the personal ending. | Safe practice writes precede any explicitly authored story restoration. | A grounded home/stay choice with consequences and epilogues. |

These are scene functions, not a mandate to add eight new subplots. Use existing cast and locations where they support the story.

### Canonical rules and continuity deliverables

Before the full rewrite, prepare a compact story bible with:

1. A one-page synopsis from rescue to endings, with the player's immediate goal at each major transition.
2. A timeline: arrival, recovery aboard ship, Corin's death, Ilva's arrival/erasure/journey, council actions, discoveries, and the light. Choose the found/rescue date as the proposed forty-day anchor. State whether time is narrative progression or a simulated calendar; do not imply a real-time deadline the game does not implement.
3. A Ledger explanation distinguishing ordinary records, the magical relationship to action/history, player access, lost tables, and practice copies. Resolve the consequences of DELETE, restoration, and Ilva's erased entry without teaching that normal practice destroys people.
4. A Trials explanation: entry, representation, marks, the seven regional examinations and council Audit as the eighth mark, examiner authority, and victory consequences. Resolve the docs' potential impression of eight examinations followed by an additional ninth Audit.
5. A fact/knowledge ledger: who knows each revelation, what proves it, when the player can learn it, and which later lines require that knowledge.
6. A promise/payoff table for Corin, council erasures, Ilva's self-erasure, restoration, Sorrel, the forty-day pattern, and the player choosing a home. Resolve each thread or explicitly leave a limited question open for a stated purpose.
7. Endings for Trials victory, finding Ilva, choosing home, choosing to stay, and continued play. Address council wrongdoing in the public conclusion; explain how the same institution can examine the player and be implicated in the investigation.

Plot-critical data must be authored first. Generated filler must respect births, deaths, ship construction, voyages, losses, witness availability, and event dates. Verify claims in `MEAN` against actual query results. An observation can suggest a conclusion; dialogue must identify inference when the data does not prove motive or causation.

## 6. Character personalities and voice plan

Every major speaker needs a brief covering role, want, fear, values, flaw, relationship to the player, knowledge boundaries, speech habits, humour/profanity choices, and how they change. Write first-meeting, ordinary-return, failure, success, disagreement, and late-story examples for each major character. These examples are future editorial calibration work.

### Core cast: proposed directions

| Character | Personality and contradiction | Relationship and development | Voice constraints |
|---|---|---|---|
| Tamsin | Practical, sociable, irreverent; generous with help but impatient with being taken for granted. | Rescuer becomes a trusted local connection. Has duties aboard her own ship and a life beyond the tutorial. | Warm ordinary speech, situational humour, occasional swearing. She can admit she does not know an answer. |
| Odalys | Demanding, blunt, dryly funny; conceals worry behind high expectations. | Starts sceptical, learns the player's strengths, and shows pride through specific recognition. Corin's loss affects her judgment. | Clear instruction and direct criticism of an attempt. Give her patience where a beginner needs explanation. Avoid automatic contempt. |
| Ilva | Thoughtful and warm, persistent, protective of private choices; evasive when personally exposed. | Begins as a person described by others, becomes a complicated person the player can question. | Clear observations in the journal, concrete motives in conversation. Avoid making every entry an ominous riddle. |
| Sorrel | Competitive, funny, provocative, proud; conceals insecurity and can be a poor loser. | Rivalry can develop into respect and affection without assuming the player won every encounter. | Specific teasing grounded in an actual bout. Honest reactions to wins/losses; profanity may suit anger. |
| Corin | A person remembered through particular relationships, strengths, mistakes, and belongings. | His death shapes the living cast; discovering his story changes their treatment of the player. | Distinct witness perspectives and concrete memories. Resolve conflicting accounts deliberately. |

### Regional teachers: proposed differences

| Teacher | Direction to develop in the character brief |
|---|---|
| Odalys Brine | Demanding mentor with dry humour and responsibility for earlier pupils. |
| Ilse Fenn | Exacting, observant, impatient with assumptions; more supportive when someone admits uncertainty. |
| Maud Tallow | Patient and grounded; anger emerges when comfortable people hide suffering behind totals. |
| Tobin Ash | Sociable and talkative; initially overexplains and learns when the player needs space. |
| Brannoch Reeve | Gruff, practical, occasionally foul-mouthed; respects careful work and repairs his own mistakes. |
| Nym Sable | Quiet and methodical; private rather than habitually cryptic, with understated humour. |
| Maren Holt | Proud, intimidating, politically cautious; capable of acknowledging unwelcome evidence. |
| Bryn Okoro | Formal, conscientious, anxious about consequences; must choose between procedure and integrity. |

### Remaining major speakers

- Give Wex, Pim, Ysolt, the other named regional students/witnesses, and Petra their own stakes. Verify each character's world role against the company records; explain dual roles where retained. Ysolt and Petra require substantial story briefs because they participate in the restoration/archive thread.
- Give Hesper Coyle, Pell Rushing, Sela Marrow, Gus Harrow, Ness Corrigan, Aurel Dunn, Signe Vale, and Oswin Gale separate teaching temperaments and Ilva relationships. Shared tournament rules can use UI text; personal speech should express a person. Audit Aurel's portrayal and Oswin's stated age/history for coherence.
- Distinguish Dregan Vosk's antagonism, Sister Calloway's courtesy, Old Pell Marrow's experience, Jessamy Crane's transactional attitude, Master Ilgrave's aggression, the Archivist Under's secrecy, Lady Oriel Vant's status-consciousness, and Hale Quarto's ambition. These are starting readings of their existing lines, not complete personalities. Define what each actually wants and allow credible reactions beyond a repeated duel invitation.
- Identify and name the ship crew when they matter to a scene. Avoid introducing another supposedly important rescuer without relating that person to Tamsin.
- Review the council as people or as a deliberately characterised institution. If particular members drive the wrongdoing, establish them before the resolution.
- Generic NPCs can remain brief. Their lines still need truthful context, clean substitutions/plurals, and variety that fits the situation.

Editorial acceptance: anonymised samples should show meaningful differences in attitude and concerns across the core cast. This is a human review exercise, not a reliable automated classifier. A funny character must be able to speak sincerely; an unpleasant character must remain comprehensible; a kind character may have boundaries and anger.

## 7. Proposed first-day and SQL teaching sequence

The opening should take the time necessary for a novice to understand. Do not impose a minimum playtime or add repetitive tasks solely to lengthen it. Measure actual reading/task time during review and adjust density.

| Beat | Scene and action | Learning/clarity purpose | Completion evidence |
|---|---|---|---|
| 1 | Wake aboard the Marigold. Meet Tamsin by name and learn she helped rescue you. | Establish the player, place, relationship, and immediate need. | Player can identify Tamsin and why she is helping. |
| 2 | Arrive and walk with her toward a small harbour errand. Introduce Corin only as needed. | Teach movement and establish a practical goal. | Player reaches the goal without unexplained guide relocation. |
| 3 | Examine a short ship manifest together. | A table contains related records; names, quantities, and individual values refer to visible things. | Player identifies the table and one value. |
| 4 | Select a row, then a column, with direct visual feedback. | A row describes one entry; a column holds one kind of fact. | Correct selections with free corrective feedback. |
| 5 | Watch Tamsin or Odalys demonstrate a query for the names needed by a dock worker. | SELECT names the requested columns; FROM identifies the table. | Source columns and returned result are visibly connected. |
| 6 | Assemble a query using a small set of choices; explain Run and the result. | Recognise the structure and read what it returns. | Player predicts or identifies an output value. |
| 7 | Change one part of the demonstrated query with support. | Learn transfer through a small variation. | New query changes the expected output and preserves the other parts. |
| 8 | Write the same pattern independently for another useful request. | Establish ability to write SELECT/FROM without hidden reference answers. | A correct query and explanation/selection of its meaning. |
| 9 | Meet Odalys in a clearly motivated handoff. Give the advanced demonstration a brief, optional or well-paced role. | Establish the mentor and the connection between queries and abilities. | Player understands the immediate practice goal without understanding advanced SQL. |
| 10 | Practise a familiar query on a harmless training target. | Separate query correctness, skill/hit chance, page choice, and damage. | Player understands that a correct query can still produce a missed attack. |
| 11 | Try a bounded first encounter, loot, equip the gifted weapon, and see it held in the paper doll. | Connect abilities, rewards, inventory, and equipment. | The player performs the actions with visible feedback. |
| 12 | Learn to eat bread after losing some health; explain draughts as another supply. | Teach healing effect and full-health availability. | Food is consumed once and HP increases by the capped actual amount. |
| 13 | Sell/store items and visit the banker with a concrete reason. | Explain possession, banking, and death risk before it matters. | Player identifies carried versus protected belongings. |
| 14 | Introduce the next local goal; make fishing and a deeper exploratory tour optional. | Avoid introducing every system before the main task is understood. | A clear objective and route remain available after the guide leaves. |

Recommended teaching data: a small manifest with all introductory rows visible, familiar item names, and very few columns. Prototype its presentation before choosing an isolated teaching dataset or a carefully labelled view of existing records. Prefer reusing seeded stock and stable content IDs. Document the transition to the full Ledger explicitly; never silently change what a table contains. Resolve this bounded data choice in milestone M1 before implementation.

Introduce commas/multiple columns and `*` in separate demonstrations followed by practice. Preview the full Ledger schema only when needed. Introduce ORDER BY, LIMIT, and DISTINCT through subsequent local needs rather than adding them to the first independence check.

For each later concept, record its prerequisites, a concrete reason to use it, a worked example, a guided variation, an independent attempt, and a result interpretation. Scale scaffolding to novelty; familiar practice does not require replaying an entire lesson. Keep a replayable explanation/reference using the actual current UI labels.

Review all 63 lessons for jargon, overgeneralised rules, technical accuracy, and unnecessary cross-database detail. Move dialect comparisons into optional reference material when they interrupt the first explanation. Preserve valid equivalent SQL answers; do not reward memorising one exact reference query except where an explicit learning objective requires a technique.

### Tamsin's accompaniment

Recommended behaviour: a temporary visible companion during the essential first-day errands, with explicit waits at destinations and a clear goodbye when her ship duties resume. She does not become a permanent combat companion through this task.

- Give her a simple follow/wait/resume lifecycle. Follow through normal walkable paths, keep a useful distance, and avoid blocking doors, the player, or other NPC interactions.
- Start essential speech after arrival and within a plausible speaking distance. A queued instruction must not interrupt a fight, another conversation, an inventory action, or a SQL attempt.
- On player detours, leave a truthful objective and a way to find/rejoin her. Use a safe recovery if pathfinding fails; do not silently teleport her into view during ordinary travel.
- Define her behaviour at dojo doors, shop/bank interiors, dungeon entrance, death/recovery, save/reload, skip, and character switching. If she waits outside, say so and place her consistently.
- Her guide dialogue should express her own knowledge and personality. Odalys owns technical teaching where that fits the scene.
- Permit skipping/replaying guidance without duplicate gifts, payments, or changes to the supporting-character story rules.

## 8. Consumables, equipment, and rewards

### Consumable use and explanation

Keep current healing amounts unless a separately documented design decision changes them: dark bread 12 HP; Healing Draught 30 HP. This task does not add hunger, thirst, potion cooldowns, or a new survival system.

Proposed presentation:

- Supplies show an icon, visible name, count, and healing amount. Open a short item detail or use an explicit Eat/Drink action with an unambiguous effect.
- At full health, say `Health is full` and preserve the supply. At zero quantity or during an unavailable combat phase, show the correct reason rather than presenting an unexplained inert control.
- On use, decrease quantity once, show actual health restored and updated HP, and keep the player oriented in the current screen.
- In combat, preserve existing between-action restrictions. Make the available draught action readable and consistently named. Decide whether food is surfaced there only after checking current reachable controls; do not advertise an unavailable action.
- The teaching moment must tolerate healing from walking/resting, a flawless first fight, consuming supplies early, or having full health. Provide an explanation/skip branch instead of forcing damage or softlocking the guide.

### Paper-doll weapons held convincingly

First reproduce with actual equipment, both paper-doll surfaces (`doll` and `doll2`), asset load/retry, and representative current/legacy item records. Check `appNow` mapping before changing artwork.

Inspect hand coordinates, weapon grip coordinates, scaling by weapon dimensions, rotation, canvas bounds, draw order, and caching. The silhouette-based hand inference can identify clothing edges rather than palms; treat that as a hypothesis to measure. Weapon overlay drawn above a whole body can cover fingers instead of appearing gripped.

Use existing painted assets first. Add explicit source-owned grip/occlusion metadata or a reproducible packing correction when necessary. If generation changes, edit the generator/source metadata and regenerate through the pipeline; never hand-edit generated art-coordinate JS. Preserve raw art, prompt/model/quality settings, output names, and unrelated packed assets. New art requiring paid generation remains outside authorization until separately approved.

Verification matrix: all 20 weapon variants, both bodies, all five outfit silhouettes, empty hand, unequip/re-equip, sword/shield, staff, wand, dagger, spear/long weapon, bow/crossbow, relevant offhands, glows/dyes, and reload. Use automated composition/bounds checks across combinations and manually inspect readable contact sheets plus full phone/desktop screens for representative and worst cases. Check world sprites too if shared weapon code changes. A held bow does not require inventing a new two-handed gameplay rule.

Pass condition: the equipped weapon is recognisable, proportionate, within its intended framing, visibly located at the palm/grip, and layered plausibly with fingers, clothing, and offhand items. An assertion that a canvas exists is insufficient.

### Gold feedback

Use the existing `goldstack` icon beside a clear signed amount such as `+25 gold`. Include it in the result panel and use a compact transient notification where appropriate. Keep names and numbers readable without relying on colour alone. Honour reduced-motion preferences for optional balance highlighting/animation.

Base displayed rewards on the actual credited amount after bonuses and rounding. Inventory, HUD, result panel, and notifications must agree. Audit `grant` callers and direct currency mutations before selecting a shared presenter; attaching a toast to every `S.gold` change would mislabel deposits, purchases, refunds, and recovered belongings.

Cover intro/contract payouts, errands, drills, truth rewards, chests, fishing, loot, and applicable sales. Distinguish earned gold, sale proceeds, bank transfers, and body recovery. A repeated unpaid task must not display a new reward. Group Take all rewards once and avoid duplicate notifications/sounds or an overlay replacing the player's active conversation/sheet. This changes feedback, not the economy.

## 9. Implementation boundaries and likely files

The game/scene boundary remains intact: game state owns guide/story/progression rules; Scene owns visible movement and rendering through explicit callbacks. Avoid a broad framework rewrite while editing the story.

| Area | Expected files or supporting work |
|---|---|
| Story, voice, lessons, quests, terminology | `src/quests.js`, `src/dojo.js`, `src/game.js`; source-owned narrative content may be extracted if it materially improves maintenance |
| Historical evidence and interpretations | `src/deep.js`, `src/world.js`, `src/game.js`, related content tests |
| Dungeon narrative claims and notes | `src/dungeons.js`, `src/dungeon_play.js`, relevant controller/UI tests |
| Guide lifecycle and dialogue presentation | `src/game.js`, `src/scene_b.js`, `src/style.css`; a focused helper module only if needed, with explicit build order |
| Consumable and reward presentation | `src/game.js`, `src/style.css`, existing icon helpers |
| Equipment rendering and source anchors | `src/scene_b.js`, appearance mapping in `src/game.js`, and `arttools/body_pack.py` or source metadata if investigation requires it |
| Regression coverage | `test/test.js`, focused pure narrative/guide tests, `test/browser/` and fixture support; integrate genuinely new test entry points into `test/verify.js` |
| Project memory | `docs/01_ARCHITECTURE.md`, `02_GAMEPLAY.md`, `03_ART_STYLE.md` where relevant, `04_WRITING_STYLE.md`, matching `STYLE.md`, and this plan |

Prefer stable quest/page/character IDs. New guide steps must not reinterpret old numeric `S.gd` values accidentally. Define stable step identifiers or an explicit old-to-new migration, a valid resume point for an interrupted lesson, and safe defaults for every account slot. Assess whether added knowledge flags, companion state, or historical data corrections require a save-version change. If they do, follow the repository version/migration rules and document the result; do not promise compatibility before that analysis. Paid art, combat balance, wider economy changes, new regions, multiplayer, and release infrastructure redesign are outside this plan.

## 10. Milestones, dependencies, and exit criteria

Implementation is authorized. M0–M6 are complete with the evidence recorded below; deployment and hosted verification complete M7. The milestone table records each deliverable; the evidence below records what has actually passed.

| Milestone | Deliverables | Exit criteria |
|---|---|---|
| M0: Audit and plan | This findings register, scope, recommendations, acceptance criteria, and verification plan. | Every original concern and later editorial priority is mapped to work; evidence limits are explicit. |
| M1: Narrative and teaching design | Story bible, fact/knowledge timeline, all major character briefs, regional scene map, lesson prerequisite map, teaching-data choice, and save/state design. | No unresolved contradictory main-story rules; each major thread has setup/payoff; every novel early action has a teaching step. |
| M2: Opening editorial sample and full script pass | Complete ship-to-first-encounter script plus representative Ilva, Sorrel, abrasive/funny/kind characters, and ending scenes; then region-by-region/full-system revision in the coverage register. | Read aloud and in sequence; revise the sample's voice problems before propagating them. Every passage/family receives a recorded editorial decision. Casey's feedback is incorporated when supplied; sample review is not an authorization to deploy. |
| M3: Narrative/content integration | Consolidate effective content, remove obsolete replacement layers where practical, correct generated history, add truthful state variants and complete transitions. | No incompatible index-selected prefaces, unsupported encounter claims, dangling major references, or chronology violations. SQL/reference outputs and interpretations agree. |
| M4: First-day teaching and companion | Guided SQL sequence, result explanations, safe training, follow/wait/rejoin, dialogue pacing, skip/replay/resume. | Unskipped fresh novice flow works through visible controls with no debug answer injection; state edge cases pass. |
| M5: Item use, held equipment, gold feedback | Consumable clarity/tutorial, verified grip/scale/layering, consistent actual-amount reward displays. | Relevant matrices in section 11 pass; affected screenshots opened and reviewed. |
| M6: Integrated editorial and release verification | Fresh/resumed/supporting character review, ending/knowledge variants, required release gate, documentation and final diff. | Acceptance criteria met, meaningful tests pass, visual and prose review complete. Mark any remaining external limitations explicitly. |
| M7: Release after implementation is authorized | Intended commit, normal push to main, exact Actions run, metadata/hash and hosted flow verification. | Published source commit and HTML hash match; required live flow passes. Until then status is unreleased. |

M1 precedes the complete rewrite and state implementation. M2 calibrates the prose before broad integration. M3 and M4 must agree on knowledge/progression; M5 needs the final first-day task triggers. Ship coherent increments only when each has a complete player flow and required checks. Do not publish half of a connected story transition because a smaller diff is convenient.

## 11. Acceptance criteria and verification matrix

### Editorial and narrative acceptance

- All content categories in section 2 have a review entry; all eight regional arcs and both endings have been read in sequence.
- Natural, connected prose is the first criterion. Every task has intelligible references, a credible reason, and an actionable request. Readability is judged in context, not by a target word count.
- Every major character has a completed brief and distinguishable scene samples. Humour, kindness, hostility, and swearing follow the character and moment.
- First encounters introduce relevant identity/relationship; returning dialogue respects actual knowledge and outcomes. Optional dialogue can enrich the story without carrying information essential to understanding the mandatory path.
- Main-story promises have authored outcomes. The council/Trials resolution and home/stay choice connect to established stakes and relationships.
- All plot-critical dates, people, records, and query interpretations are internally consistent. Mechanical claims in text match actual behaviour.

### Functional tests planned

| Area | Meaningful regression scenarios |
|---|---|
| Narrative selection | Correct task-specific preface; no date/running-total mismatch for c504/c703; unseen/met/completed states; out-of-order pages and tables; neutral fallback when optional context is missing. |
| Historical data | Erasers alive at events; ships built before use; loss chronology; valid witness identity; canonical forty-day anchor; Great Truth results consistent with authored interpretation. |
| Character continuity | Sorrel win/loss/repeat history, early late-town visits, optional dojo memories, no claims that the player completed unseen events, home/stay and Trials completion in either order. |
| Dialogue delivery | First-time information remains readable, essential beats precede departure/choices, punctuation and SQL do not break pagination, rapid taps do not skip/duplicate transitions, queued speech never replaces an active surface. |
| Fresh onboarding | All four paths; main character starts normally; at least one complete unskipped visible-control flow at ordinary dialogue speed; other bounded path runs may use explicitly labelled accelerated presentation. |
| SQL understanding | Row/column identification, query assembly, independent typing, result reading, safe mistakes, equivalent correct SQL, clear transition to full records, learned-command unlocks and no premature technique exposure. |
| Companion | Walking/running, blocked paths, narrow doors, detour/rejoin, wait at interiors, dungeon boundary, safe recovery, reload, death, skip, character switch, no duplicate/remote speech. |
| Progress/save | Existing guide values mapped safely; midway lessons/companionship reload; supporting characters; account import/export; interrupted result screens; one-time gifts and account payouts remain one-time. |
| Consumables | Bread -1 and actual HP +min(12, missing); draught -1 and actual HP +min(30, missing); full health and zero stock consume nothing; valid combat phase; double tap; safe guide fallback if already healed. |
| Equipment | All mapped variants load; equip/unequip updates both doll canvases; legacy item fallback; body/outfit/offhand/glow combinations; no stale async repaint of a replaced canvas; world rendering if shared code changes. |
| Gold | Display equals actual credited delta with bonus/rounding; +25 intro fixture without a gold bonus; repeats give no false reward; Take all aggregates once; transfers/body recovery are labelled truthfully; no duplicate payout after reload. |
| Wider regression | SQL grading, equivalent answers, combat, banking/death, fishing, dungeons, dojo, account slots, and save flow retain existing checks. |

Do not write tests that simply duplicate every sentence or compare entire prose blocks. Test factual constraints, state selection, progression, accounting, and UI behaviour. Human editorial and visual review remain required for quality and believable grip.

### Visual and learner review planned

- Browser projects: phone Chromium and WebKit at 390x720; desktop Chromium at 1280x800. Inspect dialogue, manifest/source/result views, keyboard/Run placement, objectives, companion/interior transitions, supplies, reward panels, and both paper-doll surfaces.
- Open generated screenshots. Verify legibility, scrollability, touch access, coherent pagination, clipping, grip/occlusion, icon size, and balance feedback. Use contact sheets to cover equipment combinations without pretending one fixture proves all poses.
- Keep at least one ordinary-speed reading pass; fast test mode is not evidence that early dialogue is understandable.
- Ask a willing SQL beginner to try the opening when available. Observe whether they can explain who Tamsin is, why they are helping, what table/row/column/query mean, what SELECT/FROM do, and what their result shows. Record observed confusion and revise it. Automated tests cannot establish teaching effectiveness; if no learner review occurs, report that limitation.
- Real iPhone keyboard, pacing, audio/performance, and touch evidence must be labelled separately. Browser WebKit emulation is not a real-device test.

## 12. Documentation and eventual release procedure

During authorized implementation, update the master docs in the same changes and add dated Decision log entries. Mark designed but unfinished features as planned. Gameplay owns current story/teaching/item/reward rules; writing owns the prose standard and voice guidance; architecture owns content layout/state/migration/tests; art owns any source grip metadata or packing changes. Keep this plan's milestone/evidence status current.

Run focused tests while developing. When a coherent release candidate is ready, run `npm run verify` from `game/`; this runtime/UI work requires browser coverage. Use `npm run verify -- --ui` if additional UI selection is needed. Run pinned art-tool tests and art verification if packing/generation code changes. Review the intended diff and opened screenshots after the candidate stabilises. Do not weaken a required check or accept changed art merely to obtain a pass.

After implementation authorization and passing gates, commit only intended source, docs, tests, and required packed assets. Push normally to main, monitor the GitHub Actions run for the exact source SHA, and verify deployed `release.json` commit plus HTML SHA-256. Run the hosted player flow on the actual published dependencies, including the revised opening where relevant. Report the classification, behaviour, tests actually run, screenshot evidence, commit, deployment/live result, and limitations. A push with pending/failed deployment is incomplete.

Casey has now requested implementation. Normal commit, push, deployment and live verification follow the required checks; the plan-only hold recorded in the initial audit no longer applies.

## 13. Traceability to Casey's requests

| Request | Planned response | Acceptance/evidence |
|---|---|---|
| Introduce Tamsin and other characters clearly | Sections 5-7; character briefs and knowledge-aware first encounters | Editorial review plus unskipped novice flow |
| Tamsin should plausibly accompany the first tasks | Section 7 follow/wait/rejoin lifecycle | Movement/proximity/interruption/resume checks and screenshots |
| Explain and enable eating bread/drinking potions | Section 8 consumable presentation and safe demonstration | Inventory/HP accounting, full-health reason, novice use |
| Character visibly holds weapons in paper doll | Section 8 grip/scale/occlusion diagnosis and matrix | Composition/bounds checks plus opened screenshots/contact sheets |
| Teach SQL from zero with a creative path | Section 7 small manifest, practical purpose, scaffolding, safe application | Visible-control flow, independent attempt/result interpretation, learner feedback if available |
| Gold pile with +amount reward | Section 8 reusable presentation and accounting | Icon/amount UI assertion, actual delta, repeat and transfer cases |
| Full story/writing audit and cohesive script | Sections 2-6 complete inventory, findings, story bible, full editorial pass | Coverage register, regional read-throughs, timeline and payoff checks |
| Natural prose, reduced cleverness and decoration | Section 4 revised writing standard | Read-aloud/context review; removal of meaningless fragments and forced flourishes |
| Major characters with varied personalities; swearing allowed | Section 6 briefs and proposed voice differences | Character-specific scene samples and relationship progression |
| Plan only, no implementation yet | This document only | Source/assets/master docs unchanged; no commit, tests/build, push, or deployment |

## 14. Planning-task completion record

- Source audit and targeted read-only content/selection/chronology checks: completed.
- Existing phone paper-doll screenshot: inspected earlier in this conversation; no fresh rendering claim.
- Implementation plan: prepared in this file.
- Runtime, script and writing-rule changes: implemented in the candidate. Existing atlases and versioned save containers are retained; there are no new assets or save-version migration.
- Browser and release checks are tracked in the implementation evidence below. No human learner study or real iPhone test has occurred.
- Commit/push/deployment: authorized for the implemented candidate after required checks.

## Implementation evidence

- 2026-11-22: Implementation authorized. Main agent owns onboarding, dialogue delivery, companion, consumables/rewards and integration; bounded workers own narrative content and paper-doll arming. No paid art generation is planned.
- Teaching data: an isolated three-row Marigold manifest with name, quantity and destination, followed by an explicit transition to the town Ledger. Existing content IDs and guide-step indices are retained.

- Editorial/content integration: 84 contract premises, 63 lessons, eight journal pages, 24 witnesses, eight Examiner introductions/outcomes, eight dojo introductions/wins, 16 Ilva memories, seven Sorrel notes, eight rumors, 24 unique descriptions and the ambient/errand families reviewed/revised. See STORY_COVERAGE.md and STORY_BIBLE.md.
- Focused checks passed: three manifest/dialogue/routing unit tests; seven narrative/history/SQL continuity tests; full engine/content suite (`ALL GOOD`). Narrative worker also compared baseline reference SQL, rewards and generated-task behavior across deterministic seeds.
- Arming passed six focused browser tests across phone Chromium/WebKit and desktop, with 250 equipment/figure compositions per browser. All contact sheets reviewed by weapon worker; main reviewed phone staff and desktop sword/shield screenshots. No packed/generated art was edited.
- Focused phone Chromium opening passed from actual creation/walking through manifest and safe chosen-page ability practice without skipping or injecting reference answers. Supplies and gold bonus/repeat checks passed. Prepared safe-practice recovery case passed after correcting its initial surface position. Earlier exploratory failures exposed stale/moving target selection, a dialogue/ground-click race, and test-only selector/scope errors; fixes preserve the assertions.
- Installed locked dependencies with `npm ci --offline` (4 packages, zero reported vulnerabilities). Full release gate and final visual review pending.

- First release-gate pass completed all non-UI checks and the first 18 UI cases, then was deliberately stopped to correct a reviewed ending-test navigation mistake and extend the actual supporting-slot switch case. It is not recorded as a passing full run. Both ending-query/choice/Journal cases and the actual supporting-to-main switch recovery then passed in a focused three-test phone Chromium run (21.5 seconds).
- Final candidate is frozen for the full release gate. Tests cover the unskipped opening on all four paths across all three browser projects. No human learner or real iPhone evidence is claimed. A separate untracked world-map planning file belongs to another task and will remain outside this commit.

- Visual QA opened the actual supply-list screenshot and caught pale text on parchment. The candidate was unfrozen to correct the text colour and add a measured 4.5:1 minimum contrast regression. The second full run had passed all non-UI checks and the Chromium project, then was stopped during WebKit to fix this real visual defect; it is not recorded as a full pass.

- Corrected supply contrast passed the measured regression on all three browser projects. A 15-case focused run covering supplies, both endings and arming passed (44.6 seconds). Main opened the corrected phone WebKit and desktop supply-list screenshots, desktop ending, and current phone staff view. The completed phone Chromium project also passed all four unskipped class openings, reward/recovery tests, equipment tests and existing game flows before the visual correction. Final unchanged-candidate gate follows.

- The next full gate passed all non-UI suites and 134/135 browser cases. Safe-practice recovery exposed a real rendering error: a queued RAF timestamp could predate resume, produce a negative delta, and address a negative attack frame. Scene deltas now clamp to zero; the recovery regression explicitly forces the older timestamp. This failed run is not a passing release gate.

- Animation timing fix passed nine repeated browser recovery cases, including forced older RAF timestamps. The following full gate passed all non-UI suites and 134/135 UI cases; only a desktop fresh-crafter test click was blocked by legitimate guide dialogue arriving between its visibility check and canvas click. The test now reads the arriving dialogue and retries through visible controls, bounded to three attempts; gameplay assertions remain unchanged. No runtime change followed this run.

- Dialogue-aware navigation passed eight repeated desktop fresh-character openings (all four paths twice, 1.3 minutes). Final required full gate is running with no further game changes.

- The next full gate passed all non-UI suites and 134/135 UI cases. Its remaining failure was the fresh-opening test reaching the porter without first completing the run objective; explicit walking/running actions now precede the porter. An exploratory focused run also found stale coordinates after a porter wandered away. The test now reapproaches live positions, uses the visible named Talk button at close range, and reads legitimate interrupting guide dialogue. No gameplay assertions or game behavior were changed for these navigation corrections.

- Final navigation correction passed all 12 unskipped fresh-character openings (four paths across phone Chromium/WebKit and desktop) in 2.5 minutes. Walking/running, approach, named Talk or canvas interaction, full reading, six typed queries and chosen-page safe practice all use visible controls. The complete release gate follows this passing focused run.

- Final `npm run verify` passed in full: packed art (514 matches), engine/content (`ALL GOOD`), three first-day unit tests, seven narrative tests, poker/casino, effects, dungeon, music and workflow suites, build, and all 135 browser cases (11.0 minutes) across phone Chromium/WebKit at 390×720 and desktop Chromium at 1280×800. Main opened final desktop sword/shield and phone WebKit supply-list screenshots, in addition to the lesson, staff, reward and ending views already reviewed. The staged diff passes whitespace checks. No human beginner study or real iPhone run was performed.
- The normal release proceeds from this tested source. Exact commit, Actions URL, published HTML hash and hosted-flow outcome are recorded after deployment in ignored `work/story-first-day-release.json`, avoiding a second release solely to insert its own SHA. M7 is complete only when that receipt and the exact Actions run report successful deployment and hosted verification. The separate world-map plan remains untracked and excluded.

- Initial push `0ba9ab5658ae8c27758915238b4a6d721c3f8c07`: Actions run 45113709549 was cancelled by its 30-minute build limit after all non-UI checks and 119 passing browser cases; there were no browser test failures in the log. Deployment was skipped. M7 remains incomplete. A workflow-only repair raises the build deadline to 45 minutes (deploy stays 15); after local verification, manual dispatch on `codex/story-release-budget` forces all UI coverage because CI has no comparison SHA. Advance main only after that exact repair commit passes. Then monitor the main release and run independent live verification with `BW_LIVE_UI=true`. No gameplay files change for this repair.

- Workflow-only repair passed local `npm run verify`, including 21 workflow/server tests and all non-UI suites. Selector correctly found no game/asset/runtime/HTML changes, so it did not repeat local browser tests. The previous complete 135-case local browser pass remains the game evidence; the manual repair-branch run forces the entire CI suite before main advances.
