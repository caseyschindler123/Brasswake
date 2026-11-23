# Magic and sound presentation

Classification: complex — spell presentation, scene timing, and gameplay sound events cross connected systems.

## Acceptance criteria

- All eight existing spell Circles have distinct cast, flight, impact images and sounds matching their names. Rare pages have a stronger presentation without changing damage or rules.
- Spell impacts follow projectile arrival; misses fizzle. Healing never flashes as damage. Physical attacks use the weapon actually selected by the combat rules.
- Repeated attacks have controlled variation. Creature families, crafting outcomes, fishing outcomes, footsteps, room crossings, and gold transactions have appropriate cues.
- Healing emits one cue per recovery and all player death paths emit the death cue. Audio mute and unavailable Web Audio remain safe.
- Reuse the existing art and code-native canvas effects; no paid generation, prompt changes, generated-coordinate edits, new save format, or balance changes.
- Regression checks, full release verification, phone/desktop visual inspection, and exact-commit deployment/live verification pass.

## Milestones

1. [complete] Add shared presentation definitions and eight spell visuals; improve sound synthesis and event routing.
2. [complete] Spell timing, rare variants, misses, map transitions, healing, actual weapons, chase death, activities, room crossings, mute/persistence and audio overlap passed. Inspected final phone Chromium/WebKit (390×720) and desktop Chromium (1280×800) galleries and fight screenshots.
3. [complete] Master docs and Decision logs updated. `npm run verify` passed: 486 packed assets, engine/content ALL GOOD, poker, casino, four sound/magic tests, 21 workflow checks, build and all 60 browser tests. Intended diff reviewed; release commit is the commit containing this plan.
4. [complete] Exact-commit Actions, published commit/HTML hash and hosted player flow passed. See [durable release evidence](../RELEASE_HISTORY.md#magic-and-sound).

## Verification

- Pure presentation mapping tests, mocked Web Audio scheduling/lifecycle tests, and actual Chromium offline audio rendering for every spell and effect.
- Browser regressions for eight spell styles, rare variants, deferred impacts/misses, healing, weapon selection, chase death, creature families, activities, and settings. WebKit without Web Audio verifies graceful silence only; it is not real iPhone audio evidence.
- Existing game release gate and screenshots remain required. No art baseline changes.

## Release status

Complete: released `7956eaa5b32b0a5cb63d15d5eed24e35b5046726`, with successful Actions deployment, live commit/hash check and hosted player flow. [Release history](../RELEASE_HISTORY.md#magic-and-sound) preserves the exact run, hash, verification date and limitations; the ignored receipt is supplementary. Real iPhone sound, speaker balance and silent-switch behavior require Casey's device. The local evidence below describes that historical release, with no new test execution during context cleanup.

Targeted evidence: four Node regressions passed; the initial 12 cross-browser presentation/audio checks passed; crafting/fishing/room-crossing checks passed on all three browser projects after correcting the paused fixture's movement ordering. Viewed phone Chromium spell gallery and flight plus phone WebKit impact. The final full gate includes those checks and additional settings persistence and overlapping audio rendering.
