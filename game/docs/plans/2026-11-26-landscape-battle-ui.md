# Landscape battle UI, SQL panel and Technique Book

Date: 2026-11-26 (Casey's local date).

Status: implementation authorized and in progress on 2026-11-27. Casey explicitly assigned this chat landscape/UI implementation, coordination of the dungeon and Magery/technique chats, and deployment of the combined build after all required testing. No partial gameplay/UI publication is planned.

Implementation classification: complex because this changes the shared viewport/camera/input contract and consumes the new gameplay pause/action and persistent four-slot technique contracts. Incorrect integration could move the wrong actor, freeze or advance combat clocks incorrectly, or equip/execute a technique for the wrong character. The original planning-only task was simple and completed at b07f61f; subsequent implementation checks and release evidence belong below.

## Coordinated build: 2026-11-27

- Landscape/UI and final integration/release: Discuss iPhone landscape mode, branch `codex/landscape-battle-ui`, checkout `work/landscape-battle-ui`.
- Techniques/Magery/live-combat gameplay: Review Magery technique design, branch `codex/live-combat-techniques`, checkout `work/live-combat-techniques`.
- Dungeon floor design/terrain/progression integration: Review dungeon floor plans, branch `codex/dungeon-spatial-design`, checkout `work/dungeon-spatial`.
- All checkouts start at b07f61f. Workers commit locally and hold main/publication. Shared game/scene functions merge by ownership; the coordinator owns the sole integrated publication after focused worker checks and full required exact-commit testing.
- The integrated gameplay adapter is `Combat` backed by pure `Techniques`, `LiveCombat` and `CombatController` modules. UI consumes definitions/state, eligibility, selection, begin/cancel and equipment operations; it never maintains parallel combat/resource/cooldown rules.
- The dungeon owner provides terrain and revision/migration contracts from dungeon-owned files. Shared scene viewport/drawing changes stay with UI; live update/AI/LOS stays with gameplay.

## Outcome and ownership

Make the landscape iPhone experience easy to understand: move in the world, select a target and a ready action, write SQL only when needed, and watch the action resolve in the world. Keep four equipped technique slots recognizable and stable. Keep HP, mana and stamina at the top right throughout movement, SQL entry and action resolution.

This plan owns landscape presentation, battle controls, targeting/readiness feedback, the SQL panel and its alternate views, result presentation, and the Technique Book/equipment interface. It consumes gameplay rules; it does not independently invent those rules.

The coordinated gameplay task owns technique/spell definitions, learning and skill requirements, damage/effects/costs, live combat and enemy timing, pause semantics, recovery, targeting eligibility, pursuit, saves and migration. A separate dungeon review owns unique/diverse floor plans and may proceed independently. Dungeon redesign is not a prerequisite for designing this UI and is not included in this build's file ownership.

Proposed sequence: agree the gameplay-facing contracts, implement the responsive shell and SQL views, build the technique interface against real state, then integrate and verify actual live combat. Do not publish a UI whose new labels imply mechanics that are still supplied by the old page/exchange system.

## Settled direction, proposals and dependencies

### Requirements established in discussion

- Landscape is the primary phone play layout. The SQL editor itself and the game's keyboard remain the starting point; the main cleanup is their surrounding interface.
- Exactly four techniques may be equipped in total across disciplines, including spells. Use the names **Techniques**, **Technique Book** and **equip**. There is no separate Dojo Mastery rank.
- Dojos teach techniques across disciplines. Knowledge remains learned when switching disciplines; current relevant skill separately determines whether a technique is usable. Rare drops can teach special techniques. Cross-character knowledge sharing is unresolved.
- Normal special techniques ask SQL one Circle above the opponent's standard question; exceptionally rare techniques ask two above and require at least 95 relevant skill. These offsets are opponent-relative, not multiplied by technique tier. The proposed 50/60/70/80/90/92/95/98/100 thresholds remain provisional, and eight dojos versus nine thresholds is unresolved.
- HP, mana and **stamina**, not the Dexterity attribute, remain visible at the top right during movement, SQL and action resolution.
- Combat direction is live movement/enemy timing between actions, with the whole world paused for SQL after choosing a valid ready action. Resolution returns to live play under gameplay-owned rules. Do not retain an automatic full enemy retaliation after every query simply because the old UI used exchanges.
- Melee recovery pauses rather than resets while moving. Archery recovers slowly while moving and more quickly while stationary. Spell recovery/timing formulas remain unresolved.
- Proximity warnings/aggression, pursuit, natural running away and meaningful spatial/line-of-sight rules replace the old forced encounter/Flee framing. Exact AI/detection/projectile/escape values remain gameplay decisions.
- Tables and Help belong with the question. Commands, Fields and Format belong with SQL writing. Tables, Help, Commands and Fields replace the letter-key view in the same panel; they do not stack above a still-visible keyboard. A clear **Keyboard** control returns to typing. Format formats the draft without switching views.
- The question and SQL draft remain available while changing reference/input views. Returning to action selection preserves the unsubmitted draft without committing an action.
- Brief, useful feedback replaces repeated rules prose. Preserve necessary question requirements, specific errors, accessible instruction and truthful costs.

### Recommended presentation to implement after scope is authorized

- Joystick at the lower left; four technique slots in a single row at the lower right. Keep their positions stable when skills, equipment, readiness or target eligibility change. Reserve space for any separately agreed baseline actions; do not add an unlimited support menu.
- A right-side SQL panel opens on demand, temporarily replacing the action-strip area while the player/target remain visible to its left. Size it from available space, safe areas and usable key targets, not an unconditional percentage.
- Top-right resource display has three clearly labeled current/max values and compact meters. Reserve its region so SQL, Help, Tables, result messages and in-play menus cannot cover it. The selected target's health and appropriate intent/threat information occupy a separate region.
- A visible **Paused for SQL** cue makes the learning pause explicit. It does not introduce a typing countdown. Enemy warning/recovery displays stop progressing according to the gameplay pause contract.
- The Technique Book lives within the existing Hero entry, rather than adding another primary navigation tab. A character may know many techniques while only four are equipped.
- Portrait remains functional with a nonblocking landscape suggestion if helpful; do not rely on an orientation lock to make controls usable. Rotation never resets the query, spends a resource or completes an action.
- Use the game's current typography, theme and approved artwork. The discussion mockups are spatial references, not replacement art or production styling.

The ignored local discussion fragments `work/battle-ui/landscape-battle-concept.html` and `work/battle-ui/landscape-battle-controls.html` are supplementary references only. They predate live-world combat and the required top-right resource cluster, contain illustrative abilities/values, use a provisional basic Attack button and are not proof of an iPhone-sized layout. The specification here must be understandable without those local files.

### Decisions that must be supplied before dependent implementation

| Decision | Owner | UI consequence |
|---|---|---|
| Basic attack/basic casting, recovery, supply actions and their availability outside four slots | Gameplay with Casey | Exact action-strip control count, labels, costs and interaction model. The mockup's fifth Attack button is provisional. |
| Technique/spell catalog, skill thresholds, costs, recovery and target/opening rules | Gameplay | Render actual definitions and readiness; no hardcoded illustrative move catalog or timers. |
| SQL question availability above Circle 8 | Gameplay/learning | Display the actual required level and an honest unavailable reason. Do not clamp silently, fabricate content or offer an unsolvable question. |
| Action commitment and cancellation, paused clocks, queued input and resumption timing | Gameplay | One submission, truthful pending/resolving states and no pause/recovery exploit. |
| Target selection/range, visibility versus line of fire, ranged projectiles, pursuit/escape | Gameplay | Distinguish out of range, blocked shot and unavailable target; remove obsolete Flee only with its replacement behavior. |
| Loading/equipping during danger, gear changes and falling below a skill requirement | Gameplay | Whether the book is editable, why a slot is unavailable and when to revalidate. Fixed in-combat loadouts remain a recommendation. |
| Persistent learned/equipped state, character/world ownership and legacy-page migration | Gameplay/save owner | Exactly four ordered unique slot IDs, reload behavior and legacy conversion. UI must not write a competing save representation. |
| Knowledge sources for crafting/covert abilities after page removal | Gameplay | Accurate book filters, acquisition text, shop/loot handoffs and unaffected noncombat callers. |

These decisions can be settled incrementally. Unaffected shell/reference-view work can proceed once implementation is authorized; affected integrations wait for their actual contract. Do not expand this task to redesign progression, Magery or dungeon floors in order to fill a UI placeholder.

## Current implementation and intended changes

Inspected planning baseline: `b0a4067` on main. Reinspect current source before implementation; concurrent verified work must be retained.

| Current source | Observed responsibility | Planned work |
|---|---|---|
| `src/style.css`, `src/shell.html` | `#app` starts with a 520px width cap; HUD, scene, primary navigation, fight/query overlays and sheets share the shell. | Responsive landscape regions, safe areas, persistent resource cluster and explicit overlay layers. Audit existing later CSS overrides rather than adding contradictory overrides indefinitely. |
| `src/game.js`: `renderHud`, `drawF`, `drawQ`, `combatTools` | Resource placement, page/maneuver choice, fixed battle/results panels and full exercise/action screens. | Thin adapters for the new HUD/action strip and compact action SQL flow; retain appropriate lesson/dojo flows. Remove obsolete battle prose/controls only when replacement behavior exists. |
| `src/game.js`: `kbHTML`, `kbDraw`, `kbPress`, `kbGrow`, `vvFit` | Shared editor/keyboard, Commands/Fields lists, selection/highlighting and native-keyboard viewport fitting. | Reuse editing behavior, separate question controls from writing controls, and add reference-view state without losing drafts/caret/keyboard mode. |
| `src/query_feedback.js` | Execution repair, query comparison, result counts and power presentation. | Compact diagnosis/outcome presentation with optional detailed comparison; preserve grading and correction protections. |
| `src/scene_b.js`: `size`, `FX.inset`, tactical time and scene drawing | Canvas sizing/zoom and a single bottom inset. | Support an available scene rectangle/occlusion geometry for a right panel and top HUD, keeping draw and hit-test transforms consistent. Coordinate clock changes with the gameplay owner. |
| `src/scene_controls.js`, `src/interaction_rules.js` | Pointer/joystick and keyboard input, live-position contact and obstruction. | Recompute geometry after rotation/layout changes; stop captured/stale movement at SQL entry. Consume authoritative eligibility rather than changing reach to fit UI. |
| `src/quests.js`, `src/progression.js`, `src/learning.js`, `src/dojo.js` | Current pages/content, character skills and SQL learning. | Gameplay-owned data/contracts; UI reads definitions and learning/skill availability. Disambiguate combat Techniques from SQL concepts in labels. |
| `src/character_worlds.js`, current save adapters | Character/world state and persistence boundaries. | Integrate the gameplay-owned learned/equipped schema; discard presentation state on ownership changes. |
| `src/equipment_screen.js`, `src/equipment_view.js` | Gear/page-dependent descriptions and comparisons. | Reconcile page-based links and technique eligibility with the gameplay integration; preserve truthful comparisons. |
| `src/manifest.webmanifest`, `src/offline.js`, `src/service-worker.js`, `build.js` | Installation, offline inventory and packaged script order. | Avoid changing these unless the implementation needs a real packaging change. New modules require explicit build ordering and normal offline asset verification; do not hand-edit `dist/`. |
| `test/browser/*`, `playwright.config.js`, suite/selection registration | Existing phone/desktop profiles and behavior-specific tests. | Extend affected coverage and landscape cases while retaining existing phone, desktop and full fallback requirements. |

Prefer small focused presentation helpers (HUD/action strip, SQL panel, Technique Book) with explicit adapters if extraction improves clarity. New filenames are implementation choices, not permission to create a second application shell, grading engine or combat controller. Scene fragments share an IIFE and build order: inspect that boundary before extraction.

## Presentation and lifecycle contract

### Live world and technique slots

1. Keep resources at top right and movement clear at lower left. Four numbered technique positions remain at lower right; each has a distinct icon, short label and accessible full name. Empty slots retain their place.
2. Display recovery progress and a clear ready state from gameplay state. Do not animate a separate CSS clock that drifts during movement/pauses/backgrounding. Melee and archery display their actual different recovery behavior without listing formulas.
3. A learned but temporarily ineligible equipped move stays identifiable, with an accessible reason. Do not silently swap in another move or reorder slots. Actual removal/use rules follow the final gameplay contract.
4. Show aggro warnings and health on relevant enemies without obscuring actors, entrances or each other. Use shape/text as well as color. Reuse consistent actor/target cues; do not add a player nameplate/marker contrary to existing direction.
5. Selecting an invalid or unready action gives concise feedback and leaves live play unchanged. Validate through the authoritative gameplay transaction; UI styling is not an eligibility check. Whether a valid ready selection starts the global pause is supplied by that same contract.

### SQL panel

The panel state is explicit: closed, keyboard, commands, fields, tables or help. Submission and resolution are separate states; they cannot be entered twice by double-tapping.

- Header: selected action and actual SQL requirement, with **Back** to the prior action context. Keep the gameplay target identity accessible.
- Question: one clear task plus necessary output columns/order, with **Tables** and **Help** next to it. Explain unfamiliar SQL on first use without permanently expanding a tutorial on every encounter.
- Editor: retain syntax highlighting, existing input/selection behavior, symbols, newline, formatting and phone-keyboard fallback. Long SQL scrolls within a bounded editor; it cannot push essential controls offscreen.
- Writing row: **Commands**, **Fields**, **Format**. Commands/Fields insert at the actual caret/selection, preserve the draft and remain open until the player returns to **Keyboard**. Format preserves whichever view is currently open.
- Alternate area: Tables shows useful schema/sample records; Commands shows taught command choices under existing learning rules; Fields shows relevant tables/columns; Help exposes hints and explanations with truthful penalties before use. All occupy the keyboard's area. No stacked keyboard plus reference panel, diagnostic key log or nested all-tables screen that loses the current action.
- Submission remains visible with an action-specific label. It follows the normal gameplay validation/commit API; replacing the keyboard with reference content does not spend an action or reset hints/free-repair limits.
- Draft/caret/scroll and view state survive panel switching, safe Back/reopen, resizing, rotation and keyboard switching within the same question context. Key drafts to the actual question/action/target and owner, not solely a display name. Do not transfer a draft or callback to another character/world/target by accident.
- The existing first free syntax repair keeps SQL open under the agreed gameplay protections. A committed failed answer does not receive a new free retry because the presentation changed. The precise attempt budget belongs to gameplay.
- Close/dispose releases pointer capture and listeners and clears pending presentation callbacks. Switching characters/worlds, loading a replacement save, leaving a scene, death or invalidated targets cannot resume an obsolete action.

### Resolution and feedback

On accepted commitment, lower the input panel as the action resolves, keep resources visible and let the world show its result. Enemy attacks follow world timing rather than a fabricated exchange sequence. Follow the agreed transition timing for when movement resumes; discard stale held input rather than moving unexpectedly on panel close.

Lead with actual consequences (damage/healing, miss, blocked effect or useful restoration), and distinguish SQL success from an RPG accuracy/outcome roll. Keep a brief specific SQL diagnosis for partial/failed work; detailed query comparison, row counts and training breakdown can expand without a compulsory acknowledgement. No invented cooldowns, resource changes, damage figures, rewards or repeated system-rule paragraphs. The policy for opening detailed feedback during live combat must be resolved through the same pause contract as other menus.

### Technique Book and equipment

- Show four ordered equipped slots and a browsable collection, with discipline filtering only when useful. Spells appear naturally as spells within Magery; they consume the same four-slot budget.
- Each entry shows its actual effect, relevant skill requirement/current skill, learning source if appropriate, SQL offset, resources and equipment/target restrictions. Outside a current encounter, say **+1 Circle above the target** rather than implying a fixed question Circle.
- Distinguish learned-and-eligible, learned-but-ineligible and any discoverable unlearned entries. Do not reveal a full rare-drop catalog unless gameplay/content explicitly allows it.
- Use a clear slot-selection/equip operation with a visible result. Support replacing, clearing and duplicate prevention through the gameplay API; touch drag-and-drop is optional rather than required. No extra mastery rank or second loadout is introduced.
- Revalidate skill/equipment/ownership when applying a change. Ineligible slots retain their identity; editing restrictions during danger follow gameplay rules and explain why.
- Equipped state persists only through the owning schema/API. Test character/world isolation, reload and legacy conversion when integrated. Merely granting a technique in Dev does not prove its earned dojo/drop path.

## Landscape, rotation and native input

Use the actual available viewport and all four safe-area insets. Prevent browser chrome/notch/home-indicator overlap. Remove the phone-width shell cap for landscape deliberately, without changing actor physical size, world coordinates, interaction range or movement speed to compensate for extra screen width.

Treat the scene's usable rectangle as shared geometry for camera framing, canvas/world hit tests, labels and touch targets. Avoid a camera pan/zoom that leaves enemies behind the SQL panel or changes where a tap lands. Resizing/rotation must settle the scene and joystick geometry and cancel stale pointer state before accepting movement again.

Prove the right-side panel using the full existing keyboard, realistic question lengths and long SQL. Do not squeeze keys or essential text to preserve a diagram's percentage. Use approximately 44 CSS px touch targets where applicable. If the remaining width/height cannot support the side layout, define a deliberate compact/full-width input fallback with the same draft, resources and view semantics. Essential controls stay visible; reference content may scroll in one bounded area.

Handle the native keyboard as a real alternate layout, using visual-viewport changes, focus, offsets and return-to-game-keys behavior. Do not assume it stays inside the right-side panel. Opening/dismissing it must preserve top-right resources, input access and pause ownership. Browser/installed-app presentation and portrait-to-landscape transitions are separate scenarios. Capability-dependent orientation hints cannot become a blocking overlay or a release dependency on unavailable APIs.

## Milestones and acceptance gates

Implementation checkpoint (2026-11-27): isolated UI source now contains the landscape shell/resource cluster, side-panel camera occlusion, keyboard/reference view switching, four-slot/finite-baseline action presentation and Technique Book adapters. Chromium and WebKit local probes at 844x390 exercised Tables/Commands/Fields/Help and portrait/landscape round trips without losing the draft or producing page errors; captures were opened. These probes used the existing battle controller while the coordinated gameplay branch was still being built. They do not establish integrated live combat, earned technique learning, native iPhone keyboard behavior or release readiness. A registered `landscape-ui` suite now targets those real gameplay adapters; it remains to run on the integrated build. P1-P6 remain open until their actual combined acceptance criteria pass.

Integrated checkpoint (2026-11-27): gameplay checkpoints 7ffc2c1, 126bc9b, 8e439f2 and 7d5c967 plus dungeon checkpoint 4f5b35a are integrated locally. The real `landscape-ui` suite and player canary passed 18/18 cases across phone Chromium, phone WebKit and desktop Chromium, including reference insertion, retained selection/drafts, same-session rotation/short heights, mixed four-slot equipment, released held movement and paused camera framing. Actual combined action-bar, SQL, Tables and Technique Book screenshots were opened. Gameplay owner supplied focused live SQL/learning/save/supply/victory/death evidence; dungeon owner supplied all-floor geometry, masks, migration, normal component and opened scene evidence. Legacy consumers are being migrated without removing their meaningful assertions; this review exposed and repaired real wind-up, boss-phase, commit-validation, defensive-practice and paused-overlay regressions. Full exact-commit CI and hosted publication remain outstanding.

- [x] **P0: Record the build plan.** Capture settled requirements, provisional controls and ownership boundaries. Add a planned-state pointer and dated decision in the gameplay master doc. Documentation review and `git diff --check` only; no game release.
- [x] **P1: Freeze integration contracts and layout specification.** Receive answers for the dependent decisions above; record which are still intentionally deferred. Update the discussion layout for live-world combat, top-right resources and real available phone space. Define the action/target/pause/view state transition table and four-slot equipment semantics. Acceptance: every visible control maps to an actual gameplay operation/state, and no illustrative mock values are treated as rules.
- [ ] **P2: Build the landscape shell and camera/input adapter.** Implement resource reservation, movement/action regions, safe-area and portrait/desktop fallbacks, plus usable scene-rectangle geometry. Acceptance: native world taps/joystick agree with rendered positions before/after rotation and panel open/close; resources never overlap the active input or in-play overlays. Normal movement, arrival and navigation still work.
- [ ] **P3: Build the compact SQL/reference views.** Adapt the existing editor, keyboard, caret/highlight and native-input behavior. Separate question and writing controls and preserve context across every switch. Acceptance: Tables/Help/Commands/Fields replace letter keys, Keyboard returns, insertion/formatting work, and question/draft/submit/resources remain reachable at short heights. Existing lesson, practice, crafting, fishing, covert and casino callers retain their appropriate behavior.
- [ ] **P4: Build four-slot controls and Technique Book presentation.** Read real technique definitions/eligibility and use the shared equipped-state API. Acceptance: exactly four ordered cross-discipline slots, stable unavailable/empty states, actual readiness and costs, clear book equipment changes, and reload/character isolation through the gameplay-owned persistence contract.
- [ ] **P5: Integrate the live combat lifecycle.** Connect ready/valid selection, authoritative pause and question identity, commit/repair/cancel, resolution, recovery displays, target/aggro/LOS cues and natural escape. Remove obsolete choose-page/Feint/Cleave/Guard/Flee/exchange UI only with its actual replacement. Acceptance: wrong/rapid/repeated clicks cannot commit twice, pause or resumption cannot advance/reset the wrong clocks, and an enemy can be visible yet correctly out of range or behind blocked line of fire.
- [ ] **P6: Verify cross-flow presentation and regressions.** Exercise actual ordinary flows where travel, learning, progression, saves, audio/offline or navigation are claimed. Open all relevant captures. Reconcile old page-based shop/loot/equipment/onboarding descriptions with the gameplay change; do not repurpose unrelated noncombat screens wholesale. Acceptance: the matrix below passes and all known relevant failures are resolved without weaker assertions/baselines.
- [ ] **P7: Release the authorized integrated build.** Complete the selected authoritative gate, commit/push intended files through one coordinated game publisher, monitor the exact Actions run through publication and hosted checks, verify source/HTML identity and open hosted layout captures. Record actual evidence/limits, reconcile master docs and close this plan only when complete.

P2/P3 can be developed against an explicit adapter after P1; P4 needs technique/save state and P5 needs the approved live-combat implementation. Use isolated checkouts/ports for concurrent executable work and integrate shared `game.js`/scene/build changes sequentially. Delegation is optional and must have nonoverlapping owned areas; do not duplicate the separate gameplay or dungeon investigation.

## Verification plan for the future build

### Focused development checks

| Area | Required evidence |
|---|---|
| HUD/layout | HP/mana/stamina current/max remain top right during movement, SQL and resolution, including Tables/Help, book/in-play sheets, safe areas, danger values and long localized-sized names/text. No content clipped by browser chrome or keyboard. |
| Editor/reference | Mode round trips, query/caret/selection preservation, insertion into a selection, symbols/newline/comments/formatting, actual taught command visibility, long questions/SQL/errors, keyboard/native switching and submit visibility. |
| Input/camera | Native pointer/joystick/WASD before and after rotation and drawer changes; text-entry keys never move the player; no click-through, stuck pointer, wrong target or hidden actor; correct focus restoration. |
| Technique interface | Four slots across skills/spells, empty/duplicate/locked states, exact skill boundaries once agreed, resource/equipment eligibility, real cooldown display, book replacement/clear and reload/owner isolation. |
| Combat integration | Live travel/pursuit and target selection, whole-world SQL pause, melee moving/stationary recovery and archery's two rates, valid/invalid selection, Back/repair/commit, double-click prevention, independent enemy timing, death/world/character changes and background/resume. |
| Spatial feedback | Nearby but obstructed targets, just-in/out-of-range cases, walls/closed doors/corners, ranged enemies and visible-but-not-shootable cases supplied by gameplay. UI reasons match real results without changing collision/LOS. |
| Outcomes/accessibility | Correct query with RPG miss/failure, partial and zero useful effect, short specific repair, optional full comparison, actual gains/rewards, visible text labels, selected/unavailable states not color-only, accessible button/status names and no excessive live announcements. |
| Other callers | Boat/normal arrival, Hero/menu/map/journal, dojo/lessons, fishing/crafting/covert actions, casino editor, saves/import/reload and offline install/update under their actual affected contracts. No new action/book route bypasses paused-world or ownership rules. |

Start calculations with pure tests where new actual presentation-state/geometry rules warrant them. Prepare battle/gear states with disposable direct Dev commands, then use normal visible action/SQL controls. Use ordinary earned learning/travel/save flows to prove those behaviors. Do not drive a whole profession day merely to capture a panel; full required journeys remain in the release gate when selected.

Capture and actually open phone Chromium and WebKit landscape views at representative dimensions such as 844x390 and 812x375, plus a short available-height case such as 740x320, alongside required 390x720 portrait and 1280x800 desktop profiles. Test rotation in the same live session, not just independent screenshot sizes. Include browser/native-keyboard and installed-app emulation where supported. Safe-area emulation and WebKit are not proof of a physical iPhone test. Record physical-device behavior as unverified unless it is actually checked; do not assign routine automation/screenshot QA to Casey.

### Commands and authoritative gate

Use [05_CODING_WORKFLOW.md](../05_CODING_WORKFLOW.md) and actual selector output, not the planning classification, to choose checks. The following are future implementation commands from `game/`, not checks run for this document:

```powershell
npm run verify -- --defer-ui
npm run test:ui -- --suites=battle-risk,battle-boundaries,query-feedback,arming,joystick,scenes --scenes=fight,dojo --capture-profiles=phone-chromium,phone-webkit,desktop-chromium
```

That focused browser command is a development starting point using existing registered names; it adds the short canary and is not a substitute for the selector or exact-commit CI. Add affected `skill-system`, `backstab`, `dungeons`, `first-day`, `prologue`, `worlds`, `equipment` or other actual consumers when their executable behavior changes. Extend landscape cases within the registered suites and preserve complete discovery. Run focused protocol checks only if changing test selection/registration/configuration.

Global CSS, camera/input, monolithic `game.js`, new unknown modules and coordinated gameplay/save changes currently require conservative full fallback, including journeys and every required browser profile. Do not claim a cosmetic fast path. The exact commit's CI is authoritative; do not repeat unchanged passing full local/CI or hosted checks without a specific unresolved concern. Keep zero retries, existing assertions/deadlines, known relevant failures, art baselines and publication guards.

For the eventual game release, follow exact-commit Actions, Pages, published commit/HTML SHA-256 and actual hosted player-flow verification. Review relevant hosted landscape captures; reuse successful unchanged CI hosted evidence. Do not manually edit `game/dist/`, generated atlas coordinates, migration records or verified release receipts. Do not change release gates as part of this UI plan.

## Documentation, rollout and completion

At implementation time, update owning master descriptions for shipped UI/gameplay, the architectural module/viewport contracts and changed player-facing terminology. Update `04_WRITING_STYLE.md` and its byte-identical `game/STYLE.md` copy only when replacing the existing page terminology in their instructions. Coordinate gameplay-owned descriptions/migrations with that task; retain historical release evidence.

Before publishing, review the cumulative intended diff against this plan, not only the most recent UI commit. Publish one integrated source whose techniques, learning/questions, live-combat behavior and presentation agree. Do not deploy a partial page-removal UI that strands saves, vendors, quest rewards, basic casting or unsupported SQL levels. A shell/reference-only release is a separate scope decision requiring truthful existing behavior and its own relevant checks.

Evidence to fill during implementation/release:

- Integrated source: `codex/landscape-battle-ui` through b11dcb1, including all gameplay/dungeon checkpoints and current main creature-loot changes. Publication commit will be recorded after the authoritative gate.
- Local checks: full core/build verification passed with UI explicitly deferred; final protocol suite 58/58; additional merged creature/controller rules 17/17. Landscape/canary 18/18, arrival rendering/Hero pause/scene rechecks 9/9, fight/sound 9/9 across all three profiles; focused feedback/public import/live gains/Dev 5/5 and species/theft 4/4 phone Chromium. Worker evidence includes 36/36 risk, 21/21 boundary plus 3/3 strengthened cancellation; changed Backstab diagnoses and all retained registrations; 18 migrated player/skill/arming scenarios in focused phone runs; eight dungeon components plus death; and the complete earned warrior journey. Exact-commit full CI remains required; these are focused development results, not a substitute.
- Opened representative landscape, short-height, 390×720 portrait and desktop SQL/reference/action-bar/Technique Book/results/world captures. Inspection found and repaired frozen arrival fading, overlapping paused-activity controls and notifications, and narrow baseline labels. Final rendered arrival regression passes all three profiles.
- Exact-commit Actions link, publication and hosted flow results: pending.
- Verification date and available published HTML SHA-256: pending.
- Save/legacy conversion: gameplay focused SQL/save/controller rules and earned dojo/reload passed; dungeon all-floor masks and legacy layout/corpse reload passed all profiles. Existing account-v9/character-v8 envelope retained; dungeon layout revision 2 is local and additive.
- Limitations: Chromium/WebKit emulation and automated native-input toggling are not a physical iPhone/Home Screen keyboard test. No human balance/fun judgment or newly earned complete 28-floor expedition is claimed.

The original planning task completed wording/link/scope review and `git diff --check` with documentation-only commit/push b07f61f. That was not a game release. The 2026-11-27 authorization now activates P1-P7; keep their actual progress, verification and eventual publication evidence current.

Final integration review (2026-11-27): all three owned implementations and retained consumer migrations are committed locally. No artwork, dependency, release gate, assertion deadline or retry policy was changed. Full browser discovery contains 702 cases; the exact-commit workflow must execute its selected full inventory and hosted checks before publication is complete. P2–P6 remain open through that combined acceptance gate, and P7 remains open until live identity/hash verification.
