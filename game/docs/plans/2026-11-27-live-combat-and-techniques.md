# Live spatial combat and learned Techniques

Status: implementation in progress; not released. Classification: complex because live action timing replaces the shared exchange contract and learned knowledge/four ordered slots require persistent migration.

Casey authorized the full build on 2026-11-27. The landscape/UI chat owns presentation, combined integration, authoritative full verification and sole publication. This branch owns gameplay and focused evidence. Dungeon floor redesign is independent and owned by the dungeon chat.

## Gameplay decisions and defaults

- Live-world movement and enemy attacks run between SQL actions. SQL entry/resolution, menus, hidden/background and loading pause all combat clocks. No mandatory retaliation after each SQL action. Natural pursuit/escape replaces Flee.
- One shared player recovery prevents switching disciplines to bypass recovery. Melee recovery pauses while moving (progress retained); archery advances at 35% while moving; magic advances normally. Action-specific duration has bounded DEX improvement for physical actions; INT remains mana capacity/potency, not another recovery multiplier.
- Basic weapon attack/basic Spark, Recover and one prepared supply type are a finite baseline outside four learned techniques. Recovery is a committed SQL action with its own recovery time. Bandage/draught supply choice and gear/loadout changes require safety. Learned healing/protection/utility occupy ordinary slots. No free spell submenu.
- Knowledge is per character and permanent; eligibility uses real skill, equipment and current resources. Lowering skill never deletes/reorders slots. Keep 700 total skill points and existing individual/power-scroll caps.
- Eight training lessons teach all four disciplines at requirements 50/60/70/80/90/92/95/98/100; final dojo teaches the last two. Completion is a free untimed teaching bout won independently, separate from household tournament prizes and paid skill training. Existing completed equivalent training can migrate idempotently.
- Ordinary techniques use opponent SQL Circle +1; rare enemy-taught techniques use +2 and require >=95. Real mixed advanced SQL pools supply IX/X, without new towns or silent clamping. RPG accuracy/difficulty remains opponent based. Self-support uses the selected engaged opponent, otherwise local Circle; it cannot seek an easier unrelated target during pursuit.
- Technique effects and named spell costs are centrally defined; no page-Circle damage bonuses or under-tier penalties in live attacks. Ordinary techniques retain efficiency/situational uses. Rare teaching drops are distinct from the old low-tier rare pages.
- Basic map geometry separates movement from sight/fire. Solid walls/closed gates block sight/fire, open water does not. Shared corner-safe traversal applies equally to enemies/player. Existing painted geometry remains authoritative; no new generated art.
- Aggression has awareness, chase/search and return states. Leaving initial detection can avoid pursuit; escape after engagement requires lost sight/separation and elapsed active-world time. Direct attacks engage immediately. Full leash reset restores a returning enemy and disallows farming it in return; temporary separation preserves wounds.
- Living wounds, recovery, preparation and effect timers remain session-only and retire when a scene is reconstructed; rewards/deaths remain durable through the existing dungeon adapter. Additive versioned technique state stays in the account-v9/character-v8 compatible envelope; old pages convert to ordinary knowledge, never grant new exceptional rare techniques. Craft/shadow pages and their rewards remain functional. Legacy readers must preserve additive fields; ingress normalizes exactly once.

## Integration contract (v1)

`Techniques` is a pure global/CommonJS module loaded before game.js. Catalog definitions contain id/name/discipline/source/requirement/effect/sqlOffset/mana/stamina/range/recovery/target/equipment/rare. `normalize(s)` owns `s.techniques={v:1,learned:{},equipped:[null,null,null,null],dojo:{},supply:'bandage'}`; `get(id)`, `learn(s,id)`, `teach(s,dojo)`, `eligibility(s,id,context)`, `equip(s,id,slot,context)` expose reason-bearing operations.

`LiveCombat` owns pure recovery, awareness, role/range and obstacle traversal helpers. Scene owns continuous positions/targets; game owns health/resources/SQL/rewards. No UI function needs to read mutable scene internals.

`Combat.snapshot()` returns `{version:1,active,target,recovery,resources,actions,techniques,loadout,supply,locked}`. Actions expose `{id,name,discipline,ready,eligible,reason,sqlCircle,sqlOffset,mana,stamina,target,range,recovery}`. `Combat.selectTarget(entityOrId)`, `begin(id)`, `cancel()`, `equip(id,slot)`, `setSupply(kind)` are gameplay commands. `begin` validates actual range/sight/readiness before pausing; normal SQL Run commits through existing grading. `cancel` resumes without advancing clocks or clearing assistance penalties/question identity. `Scene.combatFacts(entity)` and `Scene.combatTarget(entity)` bridge target geometry. Detailed names will be kept synchronized with actual code and the UI owner.

## Milestones

- [x] Pure technique catalog, per-character migration, skill/loadout gates, dojo grants and advanced SQL pools; focused rules/SQL tests.
- [x] Shared live recovery, awareness, line-of-sight/fire and enemy role rules; focused boundary tests.
- [x] Scene/game adapters for targeting, live enemy attacks, SQL pause/commit/resume, natural escape and existing death/reward paths.
- [x] Distinct Magery and physical effects/resources, finite support/supplies, dojo teaching and legacy shops/drops/onboarding transition.
- [x] Actual browser integration evidence: native movement/recovery, actual SQL/actions/HP/mana, enemy LOS/ranged/chase, learned/equipped persistence and ordinary dojo completion. Open phone/desktop captures.
- [ ] Diff/master-doc review, checks and branch commit supplied to UI/release coordinator. Combined full gate and publication remain coordinator-owned; do not call this released before exact commit/hash/hosted evidence exists.

## Acceptance and evidence

Four ordered slots remain stable across reload/skill changes; no cross-character knowledge leakage. SQL offsets remain opponent-relative at every technique tier including VIII→IX/X. Timers/aggro/projectiles do not advance during SQL or hidden time; moving melee never loses stored progress; archery is slower moving. Enemies cannot see/shoot through solid corners, can attack at range and navigate/chase appropriately, and can be escaped without Flee. Wrong SQL spends the action, free first syntax repair does not duplicate costs, no action switching clears hint penalties. Each technique effect is functional and rare control cannot permanently lock enemies. Earned rewards/death/dungeon progression and craft/covert systems remain valid.

Focused evidence: new rules/controller/advanced-SQL/save tests 30/30 passed; engine/content prints ALL GOOD. Older-reader fixture dependency was updated to load Techniques, preserving all assertions. First three real combat cases passed on phone Chromium, then earned dojo/reload and contextual Hide passed across all three profiles. A wider pass exposed probabilistic hit and tile-only movement fixture assumptions; targeted fixes retain all behavioral assertions and the final seven-case/three-profile run passed 21/21. Related protocol/geometry/skills/save/equipment checks passed 96/96. Phone and desktop captures were opened; their legacy presentation is superseded by the UI branch. Checkpoint shared for UI integration; no release claim. Final integration/full CI/publication: pending coordinator.

## Integration follow-up

Gameplay checkpoint `7ffc2c1` is supplied to the sole release coordinator. Legacy Bag draught/page/support entry points are now routed through the authoritative live action guards; safe completed after-states retire before gear edits. New prepared-supply/cooldown/SQL coverage passed 3/3 profiles, and actual live kill/loot plus enemy-caused death/corpse/revival passed 6/6 profiles. No full CI/publication claim.

The coordinator assigned migration of existing `battle-risk.js`, `battle-boundaries.js` and `backstab.js` consumers next. Retain their cases and meaningful risk/resource/hint/owner/death/escape assertions, replacing obsolete page menus, forced per-query retaliation and Flee with actual technique effects, live timing and native movement escape. Changes are tested against a frozen integrated UI/gameplay build; final full selection remains conservative and coordinator-owned.

Equivalent legacy regression review found and corrected four runtime boundary issues: commit eligibility now precedes SQL credit, shown Backstab has no ambush multiplier, committed player queries have their own counter independent of timed enemy attacks, and a brute preparation intent does no damage. The controller regression set passes 10/10. These fixes are supplied separately before running the migrated browser consumers against a refreshed integrated snapshot.

Integrated consumer review also restored one defensive-practice budget per useful committed action (including blocked/missed eligible enemy attacks, consumed once; wrong/shown/idle attacks grant none), and suppressed attribute gains from secondary support practice. Per-strike result data is exposed for honest Backstab presentation/assertions. Enemy-only deaths have explicit instant-result text instead of undefined SQL feedback. Controller regression coverage passes 11/11.
