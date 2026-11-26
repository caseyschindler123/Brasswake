# New-player onboarding, dojo teaching and SQL variety

Status: implementation authorized and in progress. Casey approved building the complete plan through testing and deployment on 2026-11-25 after the planning hold. Work is isolated from the equipment/towns publisher, whose verified release and closure are integrated. No game changes from this workstream are released yet.

Planning task classification: simple, documentation only. Implementation classification: complex because persistent teaching/readiness data and a shared question-requirement contract affect dojos, combat, utility actions, fishing and save restoration. Incorrect integration could erase learning records, introduce untaught SQL under combat penalties, or grant practice rewards in real progression.

Owner: main agent. Develop in an isolated checkout after go; preserve concurrent work. Prefer one agent for the coupled learning/runtime work. Any later delegation must have bounded ownership and deliverables under AGENTS.md.

## 1. Outcome and authority

Give a player with RPG familiarity and no SQL knowledge a usable interface aboard the Marigold, a clear route to safe SQL instruction in every town, and varied appropriate questions when applying that knowledge outside town. Correct SQL and a strong RPG character remain separate achievements.

Casey's explicit design decisions:

- Introduce Map and every existing bottom-tray option aboard the boat and make them available there instead of unlocking them later in the shore tutorial.
- Tamsin gives the player an incomplete map and explains how exploration fills its gaps. Preserve her informal voice, including the proposed description of a "pretty shitty" map.
- Dojo fighters specialize in SQL techniques, explain them and offer repeatable practice with no penalty for losing. Practice prepares SQL knowledge even when RPG skills remain insufficient for nearby enemies.
- Maximize meaningful question variety within the player's current SQL level.
- Remove the homeland selection. New characters have one established distant homeland; the impossible journey and its later story significance remain intact.
- Do not add a player-character nameplate, arrow or introductory "you" marker.
- Produce a complete plan first; development waits for go.

The concrete rules below were reviewed as implementation defaults, then authorized by Casey’s go. Subsequent consequential discoveries must be recorded before changing their scope.

## 2. Evidence, dependencies and limits

The supplied Claude handoff reports a two-hour first-time Thief session at 800x600. Its joystick could only make short drags; it could not sustain normal movement. The handoff contains no attached screenshots, trace or save. Treat durations as that tester's experience and suspected bugs as reproduction leads. Several reported delays overlap.

Source review supports strict tile adjacency despite continuous movement, generic misleading SQL error guidance, exercise-only lesson review, duplicate Show me insertion and a free syntax-error path that reveals the reference answer without deliberate-show protections. Released code already supports held arrow keys and supplies definitions in optional lessons. The guided dungeon guardian receives basic queries; other dungeon encounters can introduce additional forms.

The equipment/towns workstream has its own publication owner and authority. Rebase the eventual implementation on its actual verified result; do not duplicate equipment comparisons, undo material/head/mount/save work, assume a candidate is live, or alter that release's plan. Re-read current release history and worktree state after go. Do not publish a combined candidate while another publisher owns an active release.

Relevant existing systems: `prologue.js`, `first_day.js`, `dojo.js`, `quests.js`, `game.js`, `engine.js`, `query_feedback.js`, `character_worlds.js`, cartography modules, `scene_controls.js`, `movement.js`, `scene_b.js`, and `dungeon_play.js`. Content uses fixed-order concatenated browser IIFEs with CommonJS exports for pure tests. Follow existing architecture instead of introducing a framework.

## 3. Boat and bottom tray

### 3.1 Fixed homeland and continuity

- Proposed fixed homeland: **Sunspire**, an existing established realm. Keep the player's name and former-profession choices.
- Tamsin still asks where the player is from; a fixed response advances the conversation. Preserve recognition of their profession, the ordinary sailing distance, the remembered timing and the mystery. Do not add later-story explanations to the opening.
- New characters do not see an origin picker, origin-stat implications or branch promises.
- Existing saves retain their recorded homeland and later references. A save paused at the old homeland picker advances safely through the new fixed response if it has no established origin. Keep phase IDs readable; do not shift guide indices or replay earned rewards.
- Audit all origin callbacks, including later scenes, without changing their outcomes or introducing spoilers into help/UI text.

### 3.2 Stable navigation aboard the ship

- Show all five existing tabs, in their existing order and positions: Adventure, Map, Hero, Bag, Ledger. They are available when the character first has free control on deck and stay available ashore.
- Remove shore-step tab unlocking while retaining any appropriate first-use emphasis. Help introduces a feature without withholding access to it.
- Switching tabs must preserve the current boat dialogue, text drafts, teaching checkpoint and location. Returning to Adventure resumes the deck; a tab cannot accidentally advance the voyage, dismiss an unanswered required beat or strand the player.
- All tabs have useful honest states before lessons or loot exist. Opening Ledger does not mark techniques taught or expose undiscovered historical content. Feature access does not grant equipment, SQL commands, travel surveys, atlas ownership or other earned progression.
- Preserve existing encounter/modal restrictions where actions are temporarily unsafe, with clear reasons. All-tabs access does not mean taking world actions through a live combat screen.

### 3.3 Tamsin's practical orientation

- Keep the rescue and identity exchange, then spread orientation naturally across the walkable deck and three-day passage. Avoid a mandatory tour of every control inside every tab.
- Map: Tamsin hands over an incomplete chart, opens or invites opening it, explains the current-position symbol, sketch versus explored detail and how discoveries become useful landmarks. Use the user's proposed informal line as the voice reference; review the full exchange under `04_WRITING_STYLE.md`.
- The starting chart has enough broad geography and Tallyport context to orient the player. Do not reveal every dungeon, secret or venue. Separate this free sketch from paid surveys and fast travel. A meaningful ship/route/destination presentation is required; do not project ship-local coordinates onto the land map.
- Bag: give or identify an existing useful supply, show its name and purpose, and locate it in the inventory. Reuse existing rewards so moving an introduction cannot pay twice.
- Hero: show appearance, equipment and starting skills, with a brief explanation of use-based growth. Keep cap-management detail available for later consultation. Character creation previews use the same starting-stat calculation as the resulting character.
- Ledger: establish SQL's role in skilled actions and where tables, practice and explanations live. Odalys retains the actual first SQL lesson ashore. Do not spend the boat teaching all syntax.
- Adventure: show how to return to the world and continue the conversation. Maintain the existing joystick/arrow-key introduction with correct visible labels.
- Each introduction is concise, replayable and checkpointed. A returning/experienced player may skip the tour using the existing skip route; skipping does not invent readiness or award practice repeatedly.
- Make Journal discoverable by a visible label/icon and a first-use explanation. Retain objective-tap access, but do not depend on it as the only discoverable route.

Acceptance: a new character can open every tab before disembarking, understand what Map/Bag/Hero/Ledger are for, return to the right boat beat after each, reload at every orientation checkpoint and complete the normal landing without lost choices or duplicate awards.

## 4. A shared teaching and question contract

Implement a small pure `learning.js` module for concept catalog, prerequisites, readiness and scheduling rules, consumed by runtime adapters. Keep query data with existing content. Register the module in `build.js` and relevant tests only after go. New files remain conservatively covered by the current selector.

Each question declares stable concept requirements, a question-family ID, a structural-variant ID, dataset/table IDs and an exact-question fingerprint. Reference SQL, required result ordering and any exercise-specific technique requirement remain authoritative. Validate declarations against generated SQL and existing engine behavior.

- Concepts describe actual forms such as projection, sorting direction, row limits, unique combinations and calculated aliases. Circle alone is insufficient to decide whether a query is appropriate.
- Distinguish **introduced**, **practised** and **ready**. Opening an explanation can introduce a concept and its command tokens; copying a shown answer cannot establish readiness.
- Shared explanations supply a practical purpose, plain-language meaning, a small before/after result, query example and a safe attempt. Lessons encountered through either dojo, town exercise or first-use help appear in Ledger review.
- Preserve existing world-shared command knowledge and rewards. SQL learning/readiness will also be shared within that world, isolated across the three worlds; RPG skills and resources stay character-owned. Supporting characters can use the teaching route without replaying main-story scenes.
- Keep a bounded per-concept evidence window and recent-question history; do not store an unbounded transcript or player SQL text. Proposed readiness threshold: at least three unassisted first-submission successes among the latest four scored attempts, spanning at least two datasets and two structural variants. Wrong executable answers occupy the evidence window. Assisted answers and corrected retries remain useful practice but do not count as unassisted evidence. A corrected retry does not append another scored attempt.
- First instruction can use one table; broaden independent checks after explanation. Do not claim mastery from memorizing a single table/example. For a concept with only one valid dataset, author a second safe practice fixture instead of silently relaxing the rule.
- Readiness is positive guidance, never a hard lock on travel, fights, books or abilities. Explain weaker areas and offer the relevant specialist directly. Do not decay a ready state merely because time passes.
- Use the same concept requirements and lesson links in dojo, wilderness, dungeon, support/skillwork and fishing prompts. Enemy identity, regional curriculum, page Circle and encounter rules remain meaningful. Do not secretly replace every enemy with easier questions or introduce advanced SQL merely to vary wording.
- Before the first committed encounter with unfamiliar required forms, identify them and offer the lesson/example and safe practice route, with an explicit choice to continue. Keep this state-aware so it does not become a repeated modal tax. New syntax must not first appear as an unexplained, resource-consuming failure.
- New clauses used successfully outside a formal lesson gain accessible definitions/review without fabricating completed exercises or paying their rewards. Preserve semantically equivalent correct SQL unless a specific exercise explicitly teaches a required technique.

Acceptance: no ordinary route silently requires unexplained syntax; a player can find every introduced concept again; readiness cannot be earned through hints, answer disclosure, retries or duplicate questions alone; returning and supporting characters retain access without false completion.

## 5. Dojo specialists in every town

Use existing named students and masters. Give each student a contextual specialty, explanation, example and repeatable practice. Masters provide integrated regional review and explain the relationship between SQL readiness and physical/magical character strength. Existing town contracts remain an alternate teaching/practice route and share the same explanations.

| Town | Student 1 | Student 2 | Student 3 | Master's integration |
|---|---|---|---|---|
| Tallyport | Davy: ORDER BY, ASC/DESC, sorting ties | Ines: LIMIT and top/bottom lists | Bo: DISTINCT values and combinations | Hesper: mixed First Circle work; explicitly introduce arithmetic/AS before any calculated-column requirement |
| Brackwater | Comparisons, AND/OR and grouping conditions | IN and BETWEEN | LIKE and NULL | Choosing and combining appropriate filters |
| Haverly | COUNT, SUM, AVG, MIN/MAX | GROUP BY | HAVING and aggregate filters | Totals, groups and appropriate filtering order |
| Four Fords | Inner joins and multi-table relationships | LEFT JOIN and missing matches | Self-joins and relationship aliases | Correct relationships, duplicate multiplication and missing records |
| Cinderwick | CASE and COALESCE | Text, rounding and safe calculations | Date parts and date arithmetic | Useful derived reports using introduced expressions |
| Kell | Scalar/IN subqueries | EXISTS and correlated checks | Derived tables and CTEs | Breaking a multi-step question into understood parts |
| Highwatch | ROW_NUMBER, RANK and DENSE_RANK | PARTITION BY and running/window aggregates | LAG and comparisons between ordered rows | Ordering, partitions and frame behavior when required |
| Aldermoot | INSERT/UPDATE/DELETE | CREATE, constraints, views/indexes | UNION/UNION ALL and transaction review | Safe changes and checked multi-step work in disposable copies |

Reuse each town's existing names; assign meaningful dialogue rather than labelling everyone only "Student". Odalys retains the foundational manifest and chosen-ability demonstration. Each lesson states its prerequisites; specialists offer a route back to missing prerequisites. Masters and specialists retain their existing story knowledge and tournament relationships.

Teaching interaction: Explain -> inspect a small example/result -> try it safely -> repeat varied practice -> optional mixed bout. Explanations are free and replayable. The master recommends nearby wilderness/dungeon practice once the appropriate concepts are ready, while acknowledging that character skills/equipment may still need work. Objectives should clearly offer this route before directing a beginner into unfamiliar regional questions; completing every optional contract is unnecessary.

### Safe bout defaults

- Teaching bouts are untimed. Keep existing competitive tournament races, fees, brackets, prizes and story outcomes separate.
- Provide visible safety terms: no gold charge, lost gear, consumable use, lasting health/mana/stamina loss, death record or ordinary streak penalty on losing. Readiness evidence records mistakes without penalizing the character.
- Proposed repeatable-practice economy: new teaching bouts award SQL learning/readiness only, with no RPG/attribute gains, loot, gold, kill statistics or repeatable hint-key rewards. Preserve existing one-time command rewards with their existing ownership. Existing paid skill training and tournament rewards remain unchanged.
- During explanations, allow unlimited retries. In optional practice bouts, use first to three scored exchanges; an unassisted correct first submission wins the player's exchange, a wrong executable answer wins the opponent's exchange after feedback. Syntax repair is free. Assisted/shown demonstrations resolve without a scored exchange and cannot establish readiness. The player can leave or request another question at any time.
- Temporary bout effects never enter ordinary damage/death/reward resolution. Exiting, reloading, changing tabs/characters/worlds or losing cannot commit temporary costs, create free healing, leak a timer or leave the scene locked. Restoring resources means discarding temporary practice state, not refilling pre-existing world damage.
- Persist completed explanations and legitimate evidence once per attempt; resume an interrupted lesson safely. Do not treat interruption as defeat or fabricate a win. Re-entry starts a fresh temporary bout while retaining completed learning.
- Explicitly distinguish SQL correctness from hit chance and battle power. A correct answer can demonstrate readiness even if the character would miss in an actual fight.

Acceptance: each of the eight towns has all three accessible specialists and mixed review; every technique used by its ordinary question pool has an instructional owner or prerequisite link; losing/retrying cannot damage a character, farm battle rewards or alter tournament progress.

## 6. Question diversity without a difficulty jump

Expand authored structural variants, not just synonyms or random numbers. Use real compatible table/column metadata and seeded generation. Avoid runtime AI calls and changes to production company/history records merely to manufacture variety.

- Tallyport minimum: 24 validated structural variants spanning projection, sorting, limits, distinctness and explicitly taught calculations/aliases. Count changes of operation/column layout/composition as structure; replacing a table, number or prose synonym alone does not add a structural variant.
- Introductory SELECT/FROM receives at least eight substantive projection variants, including one/multiple/all columns and requested output order. Teaching examples may intentionally be simple; mixed practice need not always add another clause.
- Each later specialist has at least four structural variants and at least two compatible datasets. Add small isolated teaching copies where the main schema cannot supply meaningful examples. Preserve advanced regional progression; difficulty diversity comes from different reasoning using introduced forms.
- Vary selecting fields, output order, sort direction, single/multiple sort keys, alphabetical/numeric/date data, top/bottom lists, deduplication of single/multiple columns and combinations of already introduced techniques.
- Questions say exactly which columns and ordering matter. Explicitly handle ties, dates, case, NULLs and DISTINCT semantics whenever they affect acceptance. Expected results must be nonempty and appropriate to the lesson; duplicate-removal examples must contain meaningful duplicates.
- Avoid adjacent exact repeats when another eligible question exists. Proposed scheduler uses the last 12 exact fingerprints plus recent family/structure/dataset usage, preferring underused eligible variants. Bound history, seed selection for reproducibility and relax oldest exclusions predictably when a small eligible pool is exhausted.
- Revisit earlier techniques after new teaching. Each specialist stays recognizably focused; mixed review checks technique selection without naming the clause in advance. Creatures keep their question-family identity while receiving more variation inside that family.
- Do not count a repeated exact fingerprint twice toward the readiness diversity requirement. UI reports concepts practised and useful next steps; do not present generated-question counts as proof of human comprehension.

Acceptance: deterministic catalogs meet the structural targets; sampled multi-encounter sequences avoid immediate repeats when alternatives exist; no generated query exceeds its declared prerequisites or silently changes result semantics; basic and advanced equivalent solutions remain valid where intended.

## 7. Repair interaction and player feedback

### Required fixes and focused investigations

1. Reproduce tap/context/Engage/stair behavior with actual held joystick and held arrows at 390x720, 1280x800 and the tester's 800x600. Distinguish input delivery, focus, adjacency, scene coordinates and clipped DOM controls. An accessibility-tree entry is not proof of visible UI.
2. Centralize target eligibility using actual continuous positions, bounded reach and scene-aware obstruction checks. Taps and contextual actions agree; tapping a visible label resolves to the same entity. Support valid approaches from every reachable side without allowing interactions through walls, floors, water barriers or unintended diagonal corners. Cover multi-cell fixtures and moving entities.
3. Keep contextual actions visibly within the available stage at short heights. Verify HUD/modal transitions, long labels and native keyboard/focus states. Fix automatic enemy engagement at eligible contact; retain current aggression/pursuit design unless reproduction establishes a separate defect.
4. Fix demonstrated companion/NPC doorway traps through bounded yielding or route clearance. Preserve collision and free exploration. Investigate particular obstacle mismatches instead of globally shrinking collision.
5. Preserve held-arrow controls, diagnose focus/short-key delivery, and add WASD equivalence with correct input/contenteditable exclusions. Keep movement stopped on blur/modal/keyup transitions. Map-background taps continue their documented interaction role; no new tap-to-move system is included.
6. Split guardian/chest objective states visibly. Announce the key/guardian condition once and name the starter chest consistently across world, map, objective, reward and source descriptions. The deeper vault remains distinct. Show the relevant destination after progress; use traversable route guidance rather than an arrow that implies walking into water.
7. Introduce the dungeon entrance through Tamsin's actual directions and known map landmark. Add a map legend and keep current-position markers within map bounds. Mark meaningful lever/shortcut consequences without revealing undiscovered secrets.
8. Label combat outcomes by actor/effect, explain Focus and show unavailable-action reasons before selection. Explain the thief's Hide/Stealth/Backstab prerequisites and offer safe learning; preserve their actual combat requirements.
9. Name supply counters and offer touch descriptions. Make scrolls/supplies findable, announce actual auto-equips and show what changed. Retain the existing empty-slot equip rule unless a separate design decision changes it. Use the current equipment-comparison implementation; verify it rather than duplicate it.
10. Keep banking open after tutorial completion; prevent accidental click-through after a panel transition. Preview a bulk sale's actual items/value and allow cancellation. Do not introduce a new merchant-only selling restriction in this workstream.
11. Reconcile actionable naming and stale text: gear shop guidance, cast scope, creation stats, completed reward amounts, dojo location/dummy copy and the distinction between action/page/weapon-skill names. Retain useful variation when its relationship is explained.

### SQL errors, hints and drafts

- Replace generic "Check the filter or JOIN" with evidence appropriate to the declared question: extra/missing rows, duplicates, limit, ordering or missing columns. Avoid claiming a single cause when several are possible.
- Missing-column feedback distinguishes an unknown identifier from a text literal. Suggest spelling/schema inspection before quoting; explain a quoted column-like literal when detected. Use the visible Tables label rather than an unexplained Atlas term.
- Syntax guidance identifies likely typos/nearby tokens without listing untaught clauses as a beginner's next task. SQLite alias parsing may remain valid; pedagogical feedback should explain the ambiguity rather than assert an incorrect location.
- Preserve one free syntax repair per real combat exchange, as documented. Show the player's error and local guidance; do not automatically disclose a complete reference solution. Explicit answer disclosure uses the same protections regardless of entry path, with no RPG/attribute/SQL mastery or extra command rewards. Wrong executable results still have documented costs.
- Share explanation, table access, hint tiers and penalty presentation across activities. Safe dojo help is free; real combat retains its existing stakes. Reveal the consequence before irreversible Show me use, and render a single control per action/tier. Do not introduce a new universal hint currency or overhaul existing key/gold pricing.
- Define useful partial progress accurately: a result missing required columns may have zero useful result overlap under the current grader. Explain that distinction; do not weaken judging merely to make a promised partial reward appear.
- Preserve drafts on compatible action reselection and tab/help round trips. If changing to a genuinely different prompt would discard a draft, retain it per prompt or offer a clear discard choice.
- Expand/collapse comparisons visibly and reliably. Merge duplicate display lines for the same skill without deleting legitimate gains. Round hit chances and verify Study/other bonuses against the actual resolution inputs.
- Out-of-combat Recover investigation checks both mana and stamina. Proposed fix if a no-op grants training: grant Meditation practice only for useful actual restoration; when both resources are full, offer safe dojo practice instead. Retain region-appropriate question difficulty and the shared first-use teaching rules; no arbitrary cooldown is included.

Acceptance: a human using normal supported controls can approach, interact, engage and leave the starter dungeon reliably; a SQL beginner is never instructed to make a correct identifier into a string by generic error advice; help and syntax repair cannot bypass deliberate-answer protections; labelled feedback explains what actually changed.

## 8. Playtest finding disposition

| Finding | Planned handling |
|---|---|
| F-01 | Replace the missing preparation route with visible specialist instruction/readiness and first-use protection. Do not require all nine contracts. |
| F-02 | Boat orientation, visible Journal entry and replayable help. |
| F-03 | Reproduce eligibility versus clipping; repair confirmed Engage/automatic-contact defects. |
| F-04 | Shared continuous-position reach/targeting, touch labels and obstruction checks. |
| F-05 | Visible guardian completion, consistent starter-chest identity and updated source copy. |
| F-06 | First-use teaching/review and explicit partial-credit semantics. Definitions already exist in contracts. |
| F-07 | No character label or marker. Verify only independently reproducible occlusion defects; add no new player-identification feature. |
| F-08 | Reproduce specific bottlenecks; fix actual traps/route violations. Do not use automated drag counts as human timing. |
| F-09 | Verify existing held arrows/focus and add equivalent WASD. No tap-to-move feature. |
| F-10 | Early chart, legend, bounds, entrance directions and usable route guidance. Preserve exploration and survey economy. |
| F-11 | Reconcile misleading names and explain legitimate action/page/skill relationships. |
| F-12 | Label combat results and explain Focus. |
| F-13 | Named touch descriptions and findable supplies/scrolls. No crafting-system rebuild. |
| F-14 | Fix supported error/copy contradictions; individually verify scene/location assertions. |
| F-15 | Shared help conventions with activity-specific stakes and disclosed Show me consequences. |
| F-16 | Teach Hero access early and expose new readiness through Ledger/dojo. Defer a broad Hero-screen reorganization. |
| F-17 | Banking continuity, sale preview, equip notice and verification of integrated comparisons. Preserve selling/equip design otherwise. |
| F-18 | Resolve relevant instructional contradictions, resource previews, unavailable-action feedback and shortcut payoff. Verify named art/interaction defects individually. Defer loot-flavor, monster-HP/respawn rebalance and a cinematic tower-view feature. |
| F-19 | Reproduce using normal controls; fix shared interaction or distinct stair defect as established. |
| F-20 | Fix duplicate Show me insertion with a single rendered control group. |
| F-21 | Preserve compatible drafts; handle genuinely changed prompts explicitly. |
| F-22 | Verify both resources and useful restoration before training. Keep deliberate safe SQL practice separate. |
| F-23 | Correct gear-shop help context. |
| F-24 | Reproduce actual effect lifetime with scene/modal states; fix confirmed persistent damage floats. |
| F-25 | Aggregate repeated display gains; preserve legitimate distinct practice events. |
| F-26 | Round presentation; validate preview bonuses against actual battle calculation. |
| F-27 | Reproduce and fix confirmed comparison expansion/clipping. |
| F-28 | Verify mapping/loading versus placeholder art; fix confirmed asset mappings using accepted existing assets. New generated art/settings remain separately authorized. |
| F-29 | Include in the contextual-button eligibility/visibility investigation. |
| F-30 | Leave hidden loading-state text unless it is actually displayed or announced incorrectly. |

An unconfirmed finding closes with recorded reproduction conditions and a reason for leaving behavior unchanged. Never label it fixed or reproduced merely because a nearby test passes. The handoff's "confirmed" labels remain tester claims until supported independently.

## 9. Save compatibility and integration

- Inventory actual normalizers, account facades, cloud adoption/write ordering, export/import and older-reader fixtures before adding learning state. `CharacterWorlds.normalizeWorld` currently copies an allowlist; adding a property to a runtime object alone will not persist it reliably.
- Add bounded world-owned learning data using a documented, idempotent normalization path. Preserve account/character compatibility contracts of the final equipment/towns release. Prefer additive fields if compatible; do not bump the enclosing version casually and make older readers reject the entire account. If an actual incompatible migration is necessary, revise this plan with its exact risk before executing it.
- Existing command/lesson history can establish introduced concepts, never fabricate readiness. Characters are not forced back through boat or introductory rewards. Already learned commands cannot pay another Hint Key through the new teaching route.
- Old readers may not understand new learning fields. Explicitly test and document whether such readers retain or drop only the new advisory record while preserving all existing possessions, banks, worlds and story. Never claim new-field preservation without evidence; no account rejection or existing-data loss is acceptable.
- Normalize legacy homeland and old phase checkpoints without changing an established character's identity. Keep fixed-origin defaults for new characters separate from legacy display values.
- Keep active practice owned by its character/world/session. Stale callbacks cannot grant evidence or rewards after switching/deletion/import, and temporary practice resources never enter device/cloud saves.
- Record intended source/test files and build registration in the implementation diff. Use narrowly scoped pure rules/helpers rather than duplicating grading, combat or save machinery.

## 10. Implementation sequence and stop conditions

0. [x] Read relevant instructions/source and produce this plan, with planned-only context and no runtime changes.
1. [x] **Go received.** Casey authorized the complete build, testing and deployment. Base is `c4def1d` in isolated checkout `work/new-player-plan`; the equipment/towns release `f8dc391` and documentation closure `d66dd16` are now integrated. Run `45755977379` completed successfully; preserve its runtime and release record.
2. [x] Reproduce interaction/keyboard/stair reports in focused scenarios; record confirmed causes and tool artifacts. Establish baseline contracts for teaching, question requirements and saving. Do not run a duplicate full baseline suite without an unresolved concern.
3. [x] Implement pure concept/prerequisite/readiness/scheduling rules, bounded save normalization and regressions. Connect existing lesson/command records conservatively. Verify source question metadata before changing player progression.
4. [x] Implement fixed-origin checkpoints and complete boat-tray orientation. Verify fresh and resumed normal flows, early Map context and no duplicate rewards.
5. [x] Complete Tallyport end to end: Odalys -> specialists -> mixed readiness -> nearby creatures/starter dungeon. Implement safe practice isolation, explanations and first-use support, plus varied First Circle tasks. Validate this complete slice before extending regional content.
6. [x] Author and integrate specialists, prerequisites and variants for the remaining seven towns. Preserve tournament/rival/master story and independent paid training. Verify every specialist and generated family.
7. [x] Integrate shared question/help/review behavior across real combat, utility work, fishing and contracts. Repair error disclosure, hints, drafts, result labels and confirmed interaction/feedback defects from section 8.
8. [x] Review the complete intended diff, wording in context and all observable acceptance criteria. Reconcile owning documents as a candidate. Record remaining limitations honestly; do not silently drop required scope.
9. [ ] Pass focused development checks and the exact-commit selected CI gate, including full coverage for shared save/movement/game/build impact. Open required captures. Fix known relevant failures without weakening assertions or refreshing art baselines.
10. [ ] Publish only after the hold is lifted by go and required checks pass under the canonical workflow, unless Casey separately requests local-only/no-deploy. Coordinate one publisher, monitor the exact commit and verify hosted source/HTML and actual affected player flows.
11. [ ] Record released commit, Actions link, verification date, HTML hash and limitations in release history; reconcile current/planned descriptions and close this plan only after verified release completion. A held or failed deployment remains incomplete.

Casey’s go authorized implementation, testing and deployment under the standing automatic-release workflow. The earlier planning-only hold is superseded. A new consequential design/migration discovery requires updating the plan and resolving that specific question, not inventing routine approval stops.

## 11. Verification plan after go

### Pure/runtime-rule coverage

- Concept prerequisite closure/cycles, metadata/reference-SQL agreement, current-level eligibility and safe fallback when a pool is small or unavailable.
- Every structural variant across a deterministic seed matrix (at least 32 representative seeds per randomized family), including limits/directions/ties/NULL/duplicates and equivalent correct queries. Verify expected targets and fresh-copy writes against the actual SQL engine.
- Readiness evidence boundaries: assistance, disclosure, syntax correction, repeated exact prompts, wrong results, mixed structures/tables, bounded history, repeat scheduling and old records.
- Safe practice costs/rewards, ordinary combat syntax-repair/show protections, partial-result feedback, resource-full Recover behavior and combined gain display. Cover real runtime helpers instead of tests that only restate content constants.
- New/legacy account normalization and checkpoint restoration, all worlds/character roles, export/import/device/cloud round trips, stale callbacks and actual older-reader compatibility cases. Preserve existing equipment/mount/deletion regressions.
- Continuous reach, blocked diagonal corners, multiple approaches, moving actors and multi-cell targets; existing movement/collision and aggression/pursuit invariants stay covered.

### Browser scenarios and visual review

- Earned fresh journeys for warrior, mage, thief and crafter use native movement, actual explanations, SQL submissions and normal objective transitions. No injected mastery, teleporting or granted rewards to prove learning, navigation or progression.
- Targeted resume cases cover every new boat orientation phase, the removed-origin checkpoint, skipped orientation, premature tab visits and main/supporting characters. Verify early map position, chart/legend and returning to dialogue.
- Use direct disposable Dev setup for isolated battle/gear/help boundaries. Use normal entry/movement for reach/stairs, and ordinary saves for persistence claims. Do not expand the Dev panel merely to avoid an earned-flow check.
- Each town's specialist explanation, worked example, practice loss/retry and mixed review is exercised. Test correct SQL with weak RPG skills, loss with no lasting penalty, no free healing and no repeated command/reward farming.
- Test skipped-dojo/early-exploration paths, additional creatures in the starter dungeon, first unfamiliar forms, independent town exercises and actual dungeon exit. Cover thief prerequisites and return-to-town guidance.
- Open generated captures at 390x720 phone and 1280x800 desktop; include phone WebKit for layout/input/compositing risk. Add 800x600 checks for the reported short-height clipping. Inspect boat tabs, map, Hero/Bag/Ledger, specialist examples, hint/error/result states, labels and contextual buttons. Captures must be visually opened, not merely generated.
- Preserve all existing full-suite scenarios. Add relevant cases to owning suites (`prologue`, `first-day`, `journeys`, `query-feedback`, `battle-risk`, `battle-boundaries`, `skill-system`, `dungeons`, `cartography`, `joystick`, `worlds` and affected scene coverage) without altering selection authority to shorten this release.

### Commands and release evidence

Run from `game/` after go, using locked dependencies only if needed. Select focused commands deliberately during development, for example:

```powershell
npm run verify -- --defer-ui
npm run test:ui -- --suites=prologue,first-day,query-feedback
npm run test:ui -- --suites=battle-risk,battle-boundaries,skill-system,dungeons,joystick,cartography
```

These are development examples, not a substitute for actual selector output or the full shared-risk release gate. Run new/affected pure test files directly with their actual registered runner. The exact-commit GitHub Actions selection is authoritative; this scope is expected to retain full core and every browser suite/profile including journeys. Avoid repeating a passing unchanged full local and CI run. Protocol checks are required if registration/selection behavior changes; never modify CI gates just to accommodate this workstream.

For publication, preserve full/risky hosted flows and verify the exact published source and HTML hash. Actually exercise the changed boat/dojo/player path through hosted UI tests, reusing successful CI hosted evidence. Old cached/offline releases and save exchange must remain compatible under the recorded contract. Physical-iPhone touch/Home Screen behavior and real SQL-beginner learning remain external evidence limits; browser emulation and an AI persona cannot establish them.

## 12. Documentation and completion record

During planning, add only a planned entry and dated decision in `02_GAMEPLAY.md`; current shipped descriptions remain unchanged. During implementation, reconcile gameplay's boat/navigation, dojo, commands/help, question variety and practice rules; update architecture for module/save/build ownership and story continuity for the fixed homeland. Update the story coverage register for actual reviewed/tested scope. Do not rewrite unrelated art/workflow instructions or duplicate release narratives.

Plan-only evidence: wording, relative-link and intended-diff review plus `git diff --check`; no dependencies, game tests, build, screenshots or deployment. Commit/push only documentation under the standing workflow, which excludes Markdown-only pushes from Pages. Preserve the unrelated modified equipment/towns plan.

Implementation evidence (2026-11-26 UTC): all 225 authored exercises across 44 concepts/42 families pass actual SQLite checks, including the deterministic 32-seed family matrix, write isolation and readiness failure/recovery boundaries. Eight foundation tasks and 30 First Circle variants preserve current-level variety. Exact older-client load/save regressions preserve world learning via bounded character mirrors without an account/character version bump. Focused phone browser checks cover all 24 specialists, safe loss/help/drafts, switching ownership, all boat checkpoints, native WASD/editable focus and side-stair contact. Banking, exact bulk-sale cancellation/confirmation, paused float expiry and full-resource/stamina-only Recover checks pass. Full core ran until an outdated renamed-chest assertion failed; the intentional Starter chest assertion was corrected, all seven dungeon runtime cases passed, and all remaining 169 core/build-protocol/offline checks passed separately. Engine/content checks pass after the snippet fix. Full exact-commit CI and publication remain pending.

Confirmed repairs include the old tile/continuous-contact mismatch, clipped context controls, held WASD, stale paused floats, ghost clicks after SQL submission, syntax-answer disclosure, help/reselection bypasses, lost compatible drafts, repeated hint controls, ambiguous result actors, gain duplication, hit-preview clamping, guardian/chest naming, bank closure and Recover farming. The pending/unconfirmed portions below are not claimed fixed merely because adjacent scenarios pass.

Finding disposition: F-01/02/06/15/16 use the new boat/lesson/specialist/readiness route, preserving optional travel and tournaments. F-03/04/08/09/19/29 use shared clear continuous reach, three stair contact faces and bounded visible context controls; normal earned travel remains in the release gate. F-05/10 use known entrance directions, traversable next-segment guidance, guardian completion and Starter chest naming. F-11/12/13/14/17/20–27 have the scoped copy, help, feedback, drafts and resource repairs recorded above. Legitimate ability/page/weapon-skill names remain distinct and explained. The tester’s specific Mason/Weaver/Dregan interaction/portrait and low-contrast rat claims are not independently reproduced; no art-baseline or enemy rebalance is claimed. F-07 remains explicitly rejected (no player nameplate/marker). F-18’s broad Hero redesign, cinematic tower view, loot flavor and HP/respawn rebalance remain deferred as planned; fixed-origin, blank name draft, currency guidance and useful restoration are implemented. F-28 reproduced a CSS background shorthand replacing the icon atlas: the corrected rules preserve page artwork and reuse Bag’s material-aware gear icons. Phone/desktop loaded-pixel checks and opened shop captures pass. F-30 remains hidden loading-state text by design. Physical iPhone behavior and human beginner learning remain unverified.

Known development failures retained: browser-install path initially pointed at an absent checkout-local binary; used existing locked browser binaries. Test fixtures initially assumed one heading/exact SQL formatting, old chest name, an auto-closing bank and a randomly promoted item rarity; fixtures now match the actual UI without weakening outcome assertions. Product defects discovered by tests (swallowed Leave/Next and unnecessarily truncated short comparisons) were repaired. The earned Thief journey passed in 4.6 minutes after the explicit bank-coach dismissal, including five independently earned First Circle readiness records, native travel, guardian/chest, actual dungeon exit and farewell. Opened the readiness and Starter chest captures. No retries, widened deadlines or art-baseline refreshes were introduced.

Release commit/Actions/date/HTML hash: pending. Milestones 9–11 stay open until exact-commit checks, hosted flow/hash verification and tracked closure are complete.


Final candidate review notes: first-use explanations now include missing prerequisite definitions as well as the actual question techniques. All 26 focused learning/prologue/interaction/dungeon rules pass. Cross-browser development checks passed 33/34 initially; the remaining real 800×600 canvas-label failure exposed transparent `.stage-ui` interception beside Journal. Pointer events now pass through that empty layout area while the Journal button remains active; the unchanged native canvas-label click passes on phone and desktop. Four clean worked-example/loss/stair captures and the safe-write result were opened after waiting for real transient notifications to finish. Both phone WebKit and desktop boat checkpoints passed, and the corrected coastal chart/Hero were opened. Hosted-mode rehearsal on a loopback origin with production debug disabled passed the complete rescue/orientation, visible map-guided WASD walk to Davy, a prompt-derived SQL practice answer, accepted feedback and retained Ledger lesson in 1.2 minutes; actual published-origin verification remains due.


First CI candidate `a2e0d24` / [run 45767096686](https://github.com/caseyschindler123/Brasswake/actions/runs/45767096686) passed full core, then was deliberately cancelled during browser execution after additional local integration checks exposed three old bare-number/unnamed-mana expectations. The tests now require the actor-labelled display while retaining exact damage sums, hit counts, mana and progression assertions. All six focused Siphon/warrior/Backstab cases pass, including wrong/shown/low-stamina protections. This superseded source was not published; the final candidate must complete the full gate.


Candidate `c2264bb` / [run 45768011647](https://github.com/caseyschindler123/Brasswake/actions/runs/45768011647) also passed full core, then was superseded during browser checks by the final map correction. The additional 59-case phone integration run passed 55 cases, including all eight dungeon component expeditions, combat risks, skill actions, pursuit, migration and other cartography cases. Three failures were the actor-label fixtures already corrected and independently passed; the fourth exposed the new sketch replay button pushing the world chart’s explored position below the phone viewport. The replay control now follows map content. The unchanged fog/native walking/export/import/reload/character-isolation case passes all three profiles, and the phone WebKit and desktop fog captures were opened. No assertions, chart scale, test deadlines or exploration rights were weakened. The final source must complete the exact-commit full gate and hosted flow/hash checks.


Full gate `0097fa8` / [run 45768783173](https://github.com/caseyschindler123/Brasswake/actions/runs/45768783173) passed core and 198/203 phone Chromium cases, including all four earned profession journeys and all learning scenarios, then failed five cases. Repaired the remaining renamed Starter chest expectation and direct guided-fishing question selector (the newly added teaching paragraph had become the first nested paragraph). Product repairs remove an over-specific 215px minimum that clipped the syntax-repair keyboard, keep the repair visible above scrollable teaching, replace two stale removed `nextTo` calls on interior stairs, prefer a reachable object body beneath an unreachable overlapping label, and align ferry/cartographer offers with cardinal transaction guards. The ferry fixture had released its real arrow on rounded tile entry at 1.43936 tiles, outside the actual 1.35 contact range; it now holds through the intended center without changing the deadline or other movement callers. Direct native boarding, real upper-room entry/return, and cartographer purchase/local travel pass all nine cases across the three profiles; ten pure reach/service checks pass. Their nine arrival/ward captures were opened. The corrected chest/legacy dojo flow passes. The old candidate cannot publish; final-source full verification remains required.


Final repair checks: all eleven compact/expanded/pre-scrolled syntax and guided-fishing cases pass across standard profiles plus 800×600, with opened captures. Repair rendering resets the question body's scroll so browser anchoring cannot hide its heading after the player scrolls the new-technique example. The interior VM fixture now uses actual InteractionRules instead of its obsolete nextTo stub and explicitly denies rounded adjacency at 1.42 tiles. All 32 reach/service/interior/movement/cartography runtime checks pass. Eight current/older save/world tests pass with full introduced/evidence records mirrored across fifteen fully explored characters; that fixture uses 2,892,236 UTF-16 bytes below the existing 4 MiB bound. Master docs reconcile the direct ferry/cartographer topology and remove stale cardinal-only ordinary combat prose. The 0097fa8 run is superseded after retaining its failure evidence; the next exact source must complete all required checks.


Candidate `6de5c3f` / [run 45775227161](https://github.com/caseyschindler123/Brasswake/actions/runs/45775227161) passed full core and all 203 phone Chromium plus all 203 desktop Chromium cases. WebKit passed 202/203, including every learning and profession journey; only the public-only boat route failed. Its diagnostic feet were `(12.3318,17.6439)` while the helper held east into the one-cell row-18 gangplank. A fixed 250ms down nudge after a circular Talk boundary did not establish physical alignment. The game route remains unchanged. The fixture now follows the visible rail and uses the actual southeast joystick to enter/slide along the plank, stopping at the visible Step ashore control. All nine unchanged public-control cases (normal, 64ms and 120ms frames across all profiles) pass, as do three disposable native-input probes with an extra 170ms upward starting shift; failed/final captures were opened. No assertions, deadlines, retries, route geometry or game code were changed. The corrected exact commit still requires its full publishing gate.


Coordinated footstep addition (Casey authorized in the audio task, verified from that task’s human reply): integrated checked source `da74592` as `4eaa83b` without conflict on top of the repaired arrival helper. The audio owner retains its CC0 provenance/licenses and replaces twelve contacts plus eight sand/snow additions, with material-specific quiet playback/fallback gains. Its checks passed 32 audio/effects/material cases, 15 actual-audio/preparation cases, 52 protocol checks and 41 browser sound/music/canary/capture cases, with opened images and 612 unrelated assets verified byte-identical. Main integration additionally passes 46 audio/effects/movement/reach runtime checks, 632 packed-file hashes and build. No gait, contact timing, save or interaction behavior changes are claimed for the audio work. The active 82fddc0 validation continues; only its publication will be stopped after active validation finishes so one combined source can pass the full required gate and publish. The audio owner will verify served footstep hashes and coordinate documentation-only closure after main's release closure. Subjective listening and physical iPhone remain limitations.
