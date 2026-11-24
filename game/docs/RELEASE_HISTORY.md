# Verified release history

Dates below are UTC. Earlier entries were reconciled on 2026-11-23 from existing receipts and successful Actions runs; their evidence was not rerun during that documentation cleanup. New release entries identify checks performed for that release. The latest confirmed hosted source is the SQL answer-power and battle-comparison release, `9853ea269167c6bc4fa7af44d7d09f7315fa15fd`.

Keep the released source commit distinct from any later documentation-only commit. Each entry preserves completion, verification and limitations without requiring local logs. Detailed receipts, screenshots and traces under ignored `work/` or test-results folders remain supplementary. A newer deployment supersedes the hosted version; earlier completed releases stay complete.

## SQL answer power and battle comparisons

- Plan and iterative UX notes: [SQL battle feedback](plans/2026-11-24-sql-battle-feedback.md). Status: complete, all six milestones. Classification: complex.
- Released source: `9853ea269167c6bc4fa7af44d7d09f7315fa15fd`; gameplay implementation: `8a9793452352c754792b5c3bbbe549bf2d52be0e`. The final source adds a test-only joystick event-boundary correction; game HTML is unchanged by that repair.
- Deployment: [Actions 45375146692](https://github.com/caseyschindler123/Brasswake/actions/runs/45375146692), successful core, all 324 browser cases (108 per profile), stable aggregate, Pages deployment and hosted source/hash plus all three UI flows. No retries or skipped required cases. The [superseded run](https://github.com/caseyschindler123/Brasswake/actions/runs/45369173416) failed a pre-existing joystick timing assertion in phone Chromium; its remaining WebKit job was cancelled to unblock the corrected full run. It did not deploy.
- Independent live verification completed 2026-11-24 11:25:06 UTC (America/Los_Angeles: 03:25:06 PST). Source/hash receipt timestamp: `2026-11-24T11:24:18.197Z`. Exact source/hash and all three real hosted flows passed: battle comparison through public save import/visible controls, full rescue/arrival and SQL/progression/export/import/reload. Production dependencies remained intact and hosted debug handles were absent. Opened the hosted battle comparison capture. An earlier independent navigation attempt timed out before battle interaction; the unchanged checks passed sequentially afterward.
- HTML SHA-256: `75f8609d86c130947c18a215ed34b75c9792ec23d2113b2862606694b6a1fa0c`.
- Shipped: result-based query power scales battle damage/effects separately from weapon accuracy; correct/partial/extra-row/sorting answers receive visible strength, while wrong answers have no useful attack. Immediate paired SQL, verified small corrections or labelled reference solutions, highlighted differences and short explanations teach without an acknowledgement. Free-fix snippets retain the phone keyboard; expanded results retain their action footer. Zero-power swings are skipped while retaliation remains. Hint/show learning protections, full-correct lesson/contract gates, saves, assets and runtime dependencies are preserved.
- Local evidence: `npm run verify` passed all core checks and 324 browser cases on the gameplay implementation; focused pure grading/correction checks, repeated automated battles and opened 390×720 Chromium/WebKit plus 1280×800 desktop captures informed the recorded fixes. The final test-only repair passed nine focused repetitions (27 interruption events), exact position/no-travel assertions, rebuild HTML equality and diff checks. The final CI independently reran every required check on the released source.
- Limits: prepared mistake battles and agent UX review are not a human learner study or naturally earned campaign; full guided-day cases separately cover normal progression. No physical iPhone test or general proof of SQL equivalence. Detailed ignored logs/screenshots supplement this tracked evidence.

## Marigold rescue and full-script writing review

- Plan: [boat intro and writing review](plans/2026-11-23-boat-intro-and-writing-review.md). Status: complete, M0–M7. Classification: complex. [Script coverage and limits](STORY_COVERAGE.md).
- Released source: `d516ce18daf1a4b4e9d6639e9b981f668a60451e`. [Actions 45350677507](https://github.com/caseyschindler123/Brasswake/actions/runs/45350677507) passed core, all 300 browser cases (100 per profile), the aggregate gate, Pages deployment and both hosted player flows, with zero retries.
- Independent live verification: `2026-11-24T08:33:12.742Z` (UTC). Exact published source/HTML and two explicitly enabled hosted phone-Chromium flows passed: visible-control rescue through Tallyport, plus real SQL, skills/targets/locks and export/import/reload. Debug handles were unavailable; actual hosted rescue/crossing/gangplank/world/restored captures were opened.
- HTML SHA-256: `6a6cf287a28371554e5ad3156975c7a10a3549ea6bc5d3181104d1b7f82ebbee`.
- Shipped: customized-avatar rescue and walkable Marigold with one new deck asset; saved on-boat name/homeland/reputation conversation; coherent three-day crossing and shore handoff. The full script uses connected ordinary speech and grounded character knowledge. SQL/Ledger, table/row/column/query/result, source/practice records and safe ability application precede independent work; guided encounters, utility work and all guided fishing casts retain taught SELECT/FROM forms. Weapon holding/equip/reload, supplies and readable gold-pile rewards are retained and verified. Account v8/character v7 and older progress are preserved.
- Other checks: clean local `npm run verify` passed required non-browser checks/build, 526 packed hashes and all 300 browser cases. Twelve ordinary-resource full guided days covered all four professions on 390x720 Chromium/WebKit and 1280x800 desktop; mage took actual fishing and other professions the offered optional skip. Opened affected intro/SQL/weapon/reward/fishing/cellar/farewell captures. New-art packer checks (2) and exact-source replay passed; all 525 older packed outputs stayed unchanged. Generated script review compared 5,334 combinations against baseline gameplay fields.
- Limits: no human beginner study or physical-iPhone test; source review does not claim manual play of every optional story branch. Existing saves resume their own progress. A failed standalone deck-image download needs reload to retry, with visible skip/save exits available; offline/general asset retry is outside this release. Ignored local receipts and screenshots supplement this tracked evidence.

## Backstab and path balance audit

- Plan: [warrior, mage and thief playthrough audit](plans/2026-11-23-path-playthrough-and-balance.md). Status: complete, milestones 1–5. Classification: complex. [Campaign results and limitations](PATH_PLAYTHROUGH_AUDIT.md).
- Released source: `dab3b4a5361468ab793b347c0472fcf6ddff5b23`; gameplay implementation: `ae490793c84c2de07e138450c54ca67720d46aee`. Later fixture/CI commits retain that built gameplay.
- Deployment: [Actions 45322676588](https://github.com/caseyschindler123/Brasswake/actions/runs/45322676588), successful core, all 288 browser cases (96 per profile), stable aggregate, Pages deployment and hosted commit/HTML/player-flow verification. Required browser profiles now run in parallel with zero retries and all checks retained. Earlier failed runs did not deploy; their fixture causes and focused repair evidence remain in the plan.
- Independent live verification: 2026-11-24T04:27:56.201Z (UTC). Exact source/hash and one explicitly enabled hosted phone-Chromium real-SQL flow passed, covering twenty skill controls, three stat controls, targets/locks, export/import/reload and unavailable debug handles. Hosted world/restored-character captures were opened.
- HTML SHA-256: `287172c77d4d16fb6b50b3ab590b1767d82b3893891f7e56fb7b6b5d394f0f8d`.
- Shipped: concealed rear-approach Stealth/Fencing Backstab, reveal/retaliation, pursuit/escape/reconcealment and same-living-target wounds/Examiner phase recall for 120 seconds of active world play. SQL questions/menus pause that timer. Busy Flee, repeat theft rewards, caught-theft pursuit and wrong/Shown learning defects were repaired; action odds and support feedback match their rules. No save-format, raster-art, runtime-dependency, starting-stat or gain-curve changes.
- Other checks: clean local `npm run verify -- --ui` passed all 288 browser cases, required non-browser checks and 525 packed hashes. Focused pursuit/ownership/active-clock/action and fixture regressions passed; affected 390×720 phone and 1280×800 desktop captures were opened. Parallel-core/selection/release-gate checks passed. Twelve selected compressed earned campaigns completed all eight Trials; an earlier failed thief Council attempt and preparation replay are retained.
- Limitations: compressed automated Trials audit, not a human beginner/long-session study or every optional quest/all 28 floors with each earned build; no real iPhone test. Path query counts include different optional/support content and do not establish equal-content DPS. Hosted UI covers progression/persistence; Backstab loops are verified locally and in exact-commit CI. No paid image generation or art-setting changes. Detailed ignored logs supplement this tracked record.

## Skills, attributes and directional NPCs

- Plan: [skills, attributes and directional NPCs](plans/2026-11-23-skills-attributes-and-directional-npcs.md). Status: complete, milestones 1–7. Classification: complex.
- Released commit: `aec11c0124479aee5feb0d906f871a15e2a6f1aa`.
- Deployment: [Actions 45237450851](https://github.com/caseyschindler123/Brasswake/actions/runs/45237450851), successful complete release gate, all 243 browser cases (54.3 minutes), deployment, hosted commit/HTML verification and one hosted player-flow case.
- Independent live verification: 2026-11-23 19:22:41.224 UTC. Exact source/hash and one hosted phone-Chromium player-flow case passed with UI explicitly enabled, real SQL and no debug handles. The flow covers twenty skill controls, three attribute controls, targets/locks, export/import and reload. Hosted world and restored-character captures were opened.
- HTML SHA-256: `c3096af4bde8a6c12492fd785f78415f1fc102d34255e52df60d38149c18a1e9`.
- Shipped: twenty skills with a 700-point shared budget; Raise/Lower/Lock and stop targets; independently controlled STR/DEX/INT, health/mana/stamina, warrior/mage support actions, physical concealment/Stealth and prize stealing, optional lockpicking/disarming, Inscription/Carpentry recipes and household benefits. Human NPCs share hero body layers, eight-direction walking and stable varied appearances. Account v8/character v7 migration preserves existing occupied slots and learning history.
- Other checks: local `npm run verify -- --ui` passed all 243 browser cases without retries or skips, required non-browser suites and 525 packed hashes. Twenty-three focused pure checks plus targeted combat cancellation, affordability, migration, diagonal movement and NPC material/cache regressions passed. Opened affected 390×720 phone and 1280×800 desktop captures, including skill/combat/stealth and directional NPC/dojo scenes. Development failures were corrected before the clean local and exact-commit CI gates; assertions and art baselines were retained.
- Limitations: no real iPhone test or human learning/natural-progression balance study. Further proposed professions remain planned in the gameplay docs. Existing packed art was reused without image generation or changes to art-generation settings.
- Supporting receipts/logs: `work/live-release.json`, `work/skills-release-verify.log`, `work/skills-ci-release.log` and `work/skills-independent-live.log`; ignored evidence supplements this tracked record.

## Cartography, travel, controls and towns

- Plan: [cartography, wayfinding and the Grand Atlas](plans/2026-11-23-cartography-travel-and-grand-atlas.md). Status: complete; all eleven scope requirements closed. Classification: complex.
- Released commit: `17441a11ff97e72e3381cff86f59fc2dad23f691`; implementation: `2c5478506223e119a2cbc786cdcd72334300a16c`; saved-landing repair: `87830f6bcc694072a28eb1d1c791333602ab28f1`. Outstanding workflow/context changes were included in ancestor `b401987254c834710bb234781c95842a2f129dec`.
- Full exact-commit CI: [validation 45207089335](https://github.com/caseyschindler123/Brasswake/actions/runs/45207089335), all 210 browser cases and required non-browser/asset checks passed. Branch deployment was correctly skipped. [Main deployment 45218033858](https://github.com/caseyschindler123/Brasswake/actions/runs/45218033858) passed applicable checks, deployment and hosted commit/HTML verification; its test-only diff selected no additional UI.
- Independent live verification: 2026-11-23 16:40 UTC. Exact source/hash plus one hosted phone-Chromium player-flow case passed with `BW_LIVE_UI=true`, real SQL dependency and no debug handles. Local `npm run verify -- --ui` also passed all 210 browser cases; affected phone 390×720, desktop 1280×800 and hosted captures were opened.
- HTML SHA-256: `c1634eb4096cd95e365fe20d69bb36846638fd89e18072badd02012ee4206ba7`.
- Shipped: per-character black exploration maps/minimap, eight free chart/map shops, expensive regional surveys with same-region travel, ferry-aware waypoints and physical signs, capital-only installed household Grand Atlas, joystick-only touch movement with nearby tap interaction, purposeful staffed premises across all eight regions, modular dojo/door construction and audio, 24 saved upper rooms/stairs, and deep harbour water.
- Other checks: 525 packed hashes, twelve pinned art-tool tests, exact durable-source replay of all three new atlases/generated coordinates, and focused purchase/slot/cloud/arrival/door/joystick regressions. Two earlier CI runs each stopped at 209/210 and did not deploy: an actual wandering-creature landing bug was fixed; the later WebKit test-copy readback failure was disproved against the trace's exact opaque PNG and fixed in the test without weakening colour or persistence assertions.
- Limitations: no real iPhone test or human learning/natural-progression balance study. Image generation estimate: $0.166495 new, $1.384821 cumulative of the authorized $20 art allowance; main/delegated AI and CI billing unavailable.
- Supporting metadata receipt: `work/live-release.json`; detailed failed-run traces and local screenshots remain supplementary ignored evidence.

## World and harbours

- Plan: [world map, capital and harbours](plans/2026-11-22-world-map-capital-and-harbours.md). Status: complete.
- Released commit: `fc139f2b5aa6f34c056d4361e15b3d6804f2d0a6`; implementation commit: `9d345e5fc92363e82d18ee23e71731227f9fc372`.
- Deployment: [Actions 45150959839](https://github.com/caseyschindler123/Brasswake/actions/runs/45150959839), successful build, deploy and live checks. [Repair-branch validation 45143957610](https://github.com/caseyschindler123/Brasswake/actions/runs/45143957610) passed all 165 browser cases on the released commit before main advanced.
- Independent live verification: 2026-11-23 09:59:00.437 UTC; exact commit/hash and one hosted player-flow case passed. Required local/live screenshots were reviewed.
- HTML SHA-256: `f2bc77d0e56ca18b1ec0e3b400ad6b64f9cfd19c68ff5691cb87aa3bdbdbeaf3`.
- Other recorded checks: full local verification with 165 browser cases, ten art-tool tests, 522 packed assets and exact world-art replay. The original CI attempt timed out after 160 passing cases and did not deploy; the successful repair supersedes it.
- Limitations: no real iPhone test. Earlier prepared fixtures do not establish human learning or natural progression balance.
- Supporting receipt: `work/world-rebuild-release.json`.

## Story and first day

- Plan: [story, writing and first-day audit](plans/2026-11-22-story-writing-and-first-day-audit.md). Status: complete, M0–M7.
- Released commit: `3e26592de0e2913ed71854ad27a92849f3f07c58`; implementation commit: `0ba9ab5658ae8c27758915238b4a6d721c3f8c07`.
- Deployment: [Actions 45120834691](https://github.com/caseyschindler123/Brasswake/actions/runs/45120834691), successful build, deploy and live metadata/hash checks. [Repair-branch validation 45117153195](https://github.com/caseyschindler123/Brasswake/actions/runs/45117153195) passed all 135 browser cases on the released commit; deployment was correctly skipped on that branch.
- Independent live verification: 2026-11-23 06:01:31.963 UTC; exact commit/hash and hosted phone-Chromium player flow, including the manifest query, passed.
- HTML SHA-256: `76303483b0d4ec4d7a42fe5abbc0a52264ee44aeb031f9e5e95f282e2a1ca607`.
- Other recorded checks: full local gate with 135 browser cases and review of affected phone/desktop scenes and equipment compositions. Original CI timeout after 119 passing cases was repaired before publication.
- Limitations: no human SQL beginner study and no real iPhone test.
- Supporting receipt: `work/story-first-day-release.json`.

## Dungeon rebuild

- Plan: [all eight dungeons](plans/2026-11-22-dungeon-rebuild.md). Status: complete.
- Released commit: `5f9812ba15f635442b061551a6a6cec94b2fd673`.
- Deployment: [Actions 45096790415](https://github.com/caseyschindler123/Brasswake/actions/runs/45096790415), successful complete release gate (102 browser cases), deploy and hosted player flow.
- Independent live verification: 2026-11-23 02:19:11.146 UTC; exact commit/hash, hosted player flow, published dungeon atlases and settled reload rendering passed.
- HTML SHA-256: `455a301d9f2e7b8d9c4be687e88a39173af7cb4e46ca03294d585650f7e68b2c`.
- Other recorded evidence: all eight complete UI walking expeditions across 28 floors, 25,542 steps, 137 fights and 138 queries; 22 dungeon regressions, 514 packed assets and five art-tool tests. Local checks were split across focused runs after the compact-save repair; the full final local gate was not reported as passing. Exact-commit CI supplied the complete gate.
- Limitations: prepared high-skill characters and accelerated presentation waits; no natural-progression timing or real iPhone measurement.
- Supporting receipt: `work/dungeon-release-receipt.json`.

## Soundtrack

- Plan: [complete soundtrack](plans/2026-11-22-soundtrack.md). Status: complete.
- Released commit: `ec29131e8560b286814a2e43b2e0ff723cec7095`; initial implementation `c1235ee6bf21ce1b29227332b1008ef13eda82c0` failed the cue-duration regression and was corrected before release.
- Deployment: [Actions 45085441217](https://github.com/caseyschindler123/Brasswake/actions/runs/45085441217), successful complete gate (69 browser cases), deploy, exact live metadata/hash check and hosted player flow.
- Independent live verification: 2026-11-23 00:06:41.337 UTC; exact commit/hash, hosted player flow and all 28 published music files passed. An initial page-load timeout was followed by an unchanged passing retry.
- HTML SHA-256: `df38fe30c2333e7213f9284aeccdab4c54ae86f2579088da8166dee3dc24178b`.
- Other recorded checks: full local 69-case browser gate, six audio/MIDI pipeline checks, eleven music regressions and phone/desktop visual review. The release contained 26 MP3 loops and two PCM WAV cues, totalling 29,523,464 bytes; 511 packed assets matched.
- Limitations: real iPhone playback and human speaker/listening assessment remain unverified.
- Supporting receipt: `work/soundtrack-build/work/soundtrack-release.json` (the soundtrack worktree's ignored receipt).

## Magic and sound

- Plan: [magic and sound presentation](plans/2026-11-22-magic-and-sound.md). Status: complete.
- Released commit: `7956eaa5b32b0a5cb63d15d5eed24e35b5046726`.
- Deployment: [Actions 45078384390](https://github.com/caseyschindler123/Brasswake/actions/runs/45078384390), successful build, deployment and hosted player flow.
- Recorded live commit/hash verification: 2026-11-22 22:44:45.532 UTC.
- HTML SHA-256: `870b63dc5ce3259122bbc27e73dd14c5ba565caa8d877f0d56f1332b5e48fbb3`.
- Other recorded checks: local gate with 60 browser cases, four sound/magic regressions, 21 workflow checks, engine/poker/casino suites and 486 packed assets. Affected 390×720 Chromium/WebKit and 1280×800 desktop scenes reviewed.
- Limitations: real iPhone audio, silent switch and speaker mix unverified. The additional music themes planned at this release subsequently shipped in the soundtrack release; continuous ambience remains planned.
- Supporting receipt: `work/magic-and-sound-release.json`.

## Playability audit

- Plan: [playability audit and repair](plans/2026-11-22-playability-audit.md). Status: complete.
- Final released commit: `571e888fe89819383ee66880fbf84c24fd8c27dd`.
- Deployment: [Actions 45072455926](https://github.com/caseyschindler123/Brasswake/actions/runs/45072455926), successful full gate (42 browser cases), deployment and live checks.
- Independent live verification: 2026-11-22 21:43:40.103 UTC; exact commit/hash and hosted flow covering creation, commented SQL, navigation, save export/import and reload passed; settled reload rendering was also reviewed.
- HTML SHA-256: `90465ead81a7efa42046279ddbf026c8034af709628388fb4fb2a0c447c4c0f7`.
- Other recorded checks: full local gate, engine/poker/casino suites, 21 workflow checks, 486 packed assets and affected phone/desktop screenshot review.
- Limitations: optional branches were not exhaustive; prepared later-content fixtures do not establish endgame balance. No real iPhone audio/keyboard test.
- Supporting receipt: `work/playability-audit-release.json`.

## Automatic coding workflow

- Plan: [automatic coding workflow](plans/2026-11-22-automatic-coding-workflow.md). Status: complete. Later process refinements are recorded in the current workflow and decision logs.
- Released commit: `11822f619f9ef78d0a3b4eb936865249080f242e`.
- Deployment: [Actions 45059565665](https://github.com/caseyschindler123/Brasswake/actions/runs/45059565665), successful build, deployment and exact live commit/HTML hash checks; completion recorded 2026-11-22 19:17:35.051 UTC.
- HTML SHA-256 value: unavailable in the retained completion receipt. The receipt records that the check passed; no value was reconstructed or invented during reconciliation.
- Other recorded checks: 21 workflow checks, engine/poker/casino suites, 486 packed assets and unchanged built HTML. Twenty-seven browser cases were discovered; none were run for this framework-only release.
- Limitations: this release did not establish game UI or real-device behavior.
- Supporting receipt: `work/automatic-workflow-release.json`.
