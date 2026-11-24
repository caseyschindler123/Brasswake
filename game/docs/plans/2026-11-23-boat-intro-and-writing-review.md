# Boat rescue, new-player introduction and full writing review

Created 2026-11-23 (America/Los_Angeles). Classification: complex; character creation, a playable ship scene, saved progression, story continuity, learning and rendering are connected. Status: implementation and local verification complete; publication pending. Casey authorized autonomous implementation, necessary new intro graphics, iterative review/testing and deployment without routine approval stops.

## Release dependency and baseline

Casey requested waiting for the other agent's deployment. That dependency is complete: released source `dab3b4a5361468ab793b347c0472fcf6ddff5b23`, [Actions 45322676588](https://github.com/caseyschindler123/Brasswake/actions/runs/45322676588), independent live verification at 2026-11-24 04:27:56.201 UTC, HTML SHA-256 `287172c77d4d16fb6b50b3ab590b1767d82b3893891f7e56fb7b6b5d394f0f8d`. The other agent finished release closure and is idle. Baseline checkout `3cb352efa6ce9e2d5a37c198ceb1151ded9d3f99` is clean and includes writing guidance `6de29a6`. Preserve the twenty-skill/attribute/Backstab, joystick, world/travel, account v8/character v7 and current regression work.

## Intended player experience

1. Choose an appearance and former profession, then see that actual character rescued from the sea onto the Marigold in the game's normal visual style.
2. Tamsin introduces herself through helping the player. Once the player can speak, she asks their name and home. The name is entered here. A known distant homeland and profession-specific reputation give her recognition a credible source through merchant crews. The extraordinary distance travelled establishes a question to investigate; the player retains their identity and memories of home.
3. Explain the immediate situation: the Marigold, Brasswake, Tallyport and the remaining three-day passage. Keep rescue/recovery dialogue natural and connected. Move the fuller Corin/Trials explanation to an appropriate shore conversation.
4. Walk on a bounded ship deck using the current joystick/keyboard controls, talk to Tamsin and notice familiar cargo. Show the actual customized player and crew; generic story photographs no longer stand in for the arrival.
5. Arrive and disembark with Tamsin. Continue the guided day with a clear objective and plausible follow/wait/rejoin behavior. Preserve existing guide-step indices and older progress.
6. Odalys explains what SQL, the Ledger, a table, a row, a column, a query and a result mean before asking for independent SQL. Tie the manifest to cargo seen aboard. Keep example, guided attempt, typed practice, visible feedback and safe ability application. Explain abilities/pages, uncertainty in ordinary combat, supplies, inventory and rewards when used.
7. Complete the remaining guided activities through the road/Examiner introduction without inventing interactions or making the player guess the next action.

Homelands will use existing foreign trading realms (Sunspire, Sylvanreach and Dwarrowdeep), with no new playable geography or changes to seeded SQL data. The old `strangers` note categorically says no rescue home can be found on a chart; broaden it to arrivals that cannot be explained by normal voyages. Individual older strangers may still have unknown homes, while Tamsin can know the player's distant realm through trade. Keep the authored rescue on June 14, three-day passage and July 24 return-light date consistent. Restoring historical records never changes past events. Preserve known character relationships, examiner/teacher/keeper roles and both ending orders.

## Writing scope and standard

Review the full effective script: opening/guide/creation, regional masters and witnesses, contract premises and lessons, generated task families, journal/history/Truth explanations, dojo/rival lines, services, item and combat explanations, feedback, endings and optional story families. Use `04_WRITING_STYLE.md` and its identical `STYLE.md`: ordinary subjects, verbs, contractions and connecting words; varied rhythm; clear references and practical purpose; distinct characters; fragments only for a natural contextual reason. Keep useful short labels/status messages. Remove unnecessary cleverness, cryptic metaphors, unsupported claims and stale state assumptions. Review whole exchanges and task/result pairs. Preserve SQL semantics, stable IDs, reference requirements, rewards and balance unless a concrete defect requires a documented fix.

## Acceptance criteria

- The opening shows the selected character being rescued and physically aboard a coherent ship, with no generic-photo replacement for those events.
- Name/home questions, reputation recognition, location/destination and the mystery follow naturally; all branches use the selected identity consistently and safely escape input.
- A new player is given enough context and explicit controls to act. The first independent SQL attempt follows visible explanations and practice; results and mistakes are understandable.
- Boat, arrival, lesson and guide progress survive reload, leaving/resuming, slot changes and import/export without double rewards, lost teachers, stale dialogue or ship coordinates being saved as surface positions.
- Existing saves are retained and resume their own progress. Supporting slots, skip controls, phone text input and deferred asset/SQL readiness work.
- The full guided introduction can finish through actual player controls. Required people/objects remain reachable; follow, indoors, loot, equipment, supplies, banking, fishing and vault transitions are coherent.
- New art matches the established raised top-down, bright hand-painted pixel style; people are dynamic layers. New assets have reviewed outputs, recorded prompts/provenance and reproducible packing. Existing raw sources, generation settings and generated coordinates are not edited by hand.
- Full-script coverage records what was reviewed/revised, continuity checks passed and any remaining external limitations honestly.

## Milestones and owned work

| Milestone | Deliverable | Status |
|---|---|---|
| M0 | Wait for prior deployment; read current instructions and inspect source; save this plan | Complete |
| M1 | Settle scene/state/art design and identity/history continuity | Complete: existing trade realms, additive optional saved prologue, isolated ship scene, dynamic people and new deck base |
| M2 | New art/provenance and ship rescue/deck rendering with actual character | Complete locally; reproducible packing and phone visuals reviewed |
| M3 | Character identity, saved prologue and shore handoff; improve teaching/guide logic | Complete locally; identity/checkpoint/shore and supporting-slot focused checks passed on all three profiles |
| M4 | Full writing/continuity pass and updated coverage/story bible | Complete source and independent integration review; no unresolved normal-flow blocker |
| M5 | Fresh-player full-intro review, focused regressions, screenshots and corrections | Complete: all twelve ordinary-resource guided days passed; actual phone/WebKit/desktop intro, SQL, equipment, fishing, rewards and farewell captures opened |
| M6 | Required complete local gate, final diff and master-document reconciliation | Complete locally: npm run verify passed required core checks and all 300 browser cases, zero retries; diff, UTF-8 and master docs reviewed |
| M7 | Intended commit/push, exact CI, published source/hash, hosted player flow and tracked release closure | Pending |

Root owns architecture, ship/prologue, game-state/teaching integration, assets, acceptance, review and release. A bounded worker may own independently scoped content files after receiving current canon and style; no overlapping source ownership or recursive delegation. Work remains on `codex/boat-intro-writing` until integration to main.

## Verification and iterative review

- Focused pure checks for valid prologue phases/transitions, identity normalization, old-save behavior, scene reachability and interrupted/resumed state. Test behavior/facts, not snapshots of every sentence.
- Real visible-control fresh runs at ordinary presentation speed: create, rescue, identity, deck controls, arrival, complete SQL lesson and safe practice, then the entire guided day to Tamsin's departure. Cover all four backgrounds where behavior differs, both appearances/appropriate identity cases, skip/resume/slot edges and actual healing/equipment/reward behavior. Read-only map coordinates may assist navigation; no teleporting, SQL-answer extraction or boosted skills/gold for the ordinary new-player run. Keep prepared-state edge tests separately identified.
- Capture/review the actual dialogue sequence and open phone 390×720 (Chromium and WebKit) and desktop 1280×800 screenshots for rescue/identity/deck/arrival, dialogue choices, source/result/keyboard, objectives and later guided interactions. Check clarity, continuity, touch targets, readable text, camera framing, asset scale/occlusion and control access.
- Review the opening from a beginner's perspective, fix concrete issues, and rerun affected flows until no unresolved required issues remain. An independent editorial/new-player review may provide a second perspective. Report that agent/automation review does not constitute a human learner study.
- If packing code changes, run its focused checks and exact source replay/hash verification in the pinned art environment. Review the packed asset manifest deliberately; do not refresh older baselines to mask errors.
- Once the candidate is stable, run `cd game; npm run verify`. Use the current required parallel CI profiles; retain every selected case and zero-retry policy. Repeat a full passing unchanged gate only if new changes or unresolved evidence justify it.
- Update current/planned master sections and dated decisions, commit only intended files and push normally. Monitor the exact source commit's Actions run, verify published `release.json`/HTML hash and actual hosted new intro/player flow without debug handles. Mark M7 complete and record full commit, Actions, verification date/timezone, hash and limitations in tracked `RELEASE_HISTORY.md`; ignored artifacts supplement it. Documentation-only closure needs no second game deployment.

## Evidence and limitations

- Prior deployment wait is satisfied as recorded above. No implementation, new art generation or new delegated work occurred before that wait completed.
- Initial inspection confirms current creation collects the name before three static opening cards; that will change. The Marigold currently exists as harbour scenery, not a walkable ship scene.
- Reuse the current female Tamsin portrait and shared directional character layers. Generate one new empty deck/hull base with built-in image_gen; keep people, mast fittings, rescue rope and sea in dynamic layers. The new-only prompt is `arttools/prologue_prompts.json`; existing prompts/settings/raw art remain unchanged.
- Delegated one bounded worker to review/revise only `quests.js` and `dojo.js` against the current style/canon. Root owns all intro/state/Deep/scene/test/art integration and will review the worker's diff.
- Current task-specific AI, delegated-agent, image-tool and CI billing must be reported from available evidence; unknown figures remain unavailable. Casey authorized needed new graphics, but existing prompt masters/settings and raw assets stay intact. No cost collector or private billing ledger is part of this task.
- Real iPhone behavior, a human SQL-beginner study and long-session enjoyment require external evidence; do not claim them from browser emulation or agent review.

## Implementation and review — 2026-11-23

- M1–M3 implemented locally: optional saved Prologue v1, the actual customized avatar rescued onto a new ship deck, name/homeland/reputation conversation, manual deck movement, cargo inspection and gangplank arrival. The prior main-character creation name field and static opening cards are replaced; supporting slots retain their direct arrival. Account v8/character v7 remain unchanged.
- M4 source review complete: quests/lessons/generated variants, dojo dialogue and memories, game dialogue/first-day/feedback, Deep table explanations/results and reward descriptions were read in context. The full generated-choice comparison covered 5,334 combinations with stable gameplay fields. Nine archive notes now use connected prose; damage/gold gift captions match the implemented effects. Known foreign trading realms establish the player's homeland without changing company datasets or claiming another universe.
- Review iteration found and fixed unreadable homeland choices, clipped boat footers, the worked SQL result below the first phone fold, missing Ledger explanation, the name input's visual-viewport offset, misleading SQL-load failure text and a missing exit during that failure. Independent agent reviewed the actual phone images and source; this is not a human novice study.
- The entrance-cellar guardian now stays with SELECT/FROM forms during the guide. The first outdoor fight already used those forms. Tests solve the rendered beginner prompts without reading reference SQL; ordinary starting state is retained.
- New empty deck asset uses one authorized built-in image_gen call. Prompt: `arttools/prologue_prompts.json`; packed output: `game/art/ship/deck.webp`; generated dimensions: `src/artship.js`. Original source and raw copy are retained outside tracked art. Exact source replay, alpha, changed-input rejection and packed-manifest checks passed; no older output changed. See the art input manifest for exact hashes and toolchain.
- M5–M7 pending: complete guided-day/browser regressions, final gate, exact-commit deployment/live flow, and tracked release closure.

- Subsequent integrated review: Hide/Recover are withheld until SQL has been introduced, and guided Tallyport skill actions/encounters retain beginner query forms. The intro explicitly explains how the Ledger guides abilities. A startup-only click-guard defect found by the SQL-failure WebKit case is fixed without changing the existing post-canvas touch guard.
- Ordinary-speed complete guided day passed on phone Chromium and desktop Chromium, including the optional fishing skip, actual fights/loot, equip/paper doll, sale, page purchase, bank, tower, cellar chest and Tamsin’s farewell. A queued speech exposed a WebKit navigation-helper race; the helper now reads that speech before interacting. Full local verification is in progress.
- Visible-control-only rescue/identity/deck/gangplank flow and intentional SQL-download-failure escape passed on all three profiles (six cases). That visible-only flow is reused for published verification; it reads no scene/state/debug handles. Saved boat checkpoints and switching already passed on all three profiles; the final gate also checks an unsubmitted name draft.

- Final source review also covered all dungeon notes/species, WorldServices market voices and Interiors civic lines. Dungeon worker notes now distinguish historical observations from live tasks, use the actual valve/wheel names, and avoid an unsupported capital callback for Corin or an unimplemented slowing attack. No geometry or combat data changed; the ongoing gate had not yet reached its dungeon checks/build when these prose corrections were applied.

- The first full local gate passed all non-browser suites, then revealed that the shared visual fixture still invoked removed static-card controls. Stopped that owned test run and updated the fixture to create its disposable character through the new name/skip controls. A focused prepared-scene case passed on WebKit afterward; the full gate will be restarted without skipping checks. Historical Linux-only `p7/p8/p9/dbg` scratch scripts are not current release evidence.
- Expanded full guided-day coverage from the warrior to all four starting professions on all three profiles. Ordinary starting resources, visible SQL instructions and actual native movement/interactions are retained. Fishing uses its explicitly offered optional skip. The final farewell is asserted and captured before closing its dialogue.

- Clarified that the company teaching copy uses dates assigned for the course and its own June 30 closing date, keeping it separate from the June 14 rescue/three-day passage without changing the dataset, SQL or narrative dates. Before the first mark, Hero/Journal say arrival/candidate rather than prematurely declaring a champion.

- Current frozen-build verification: all four complete guided days passed on phone Chromium, with actual farewell captures. The broader run exposed old wording assertions for concealment odds, Examiner phases and the home ending; the numeric/outcome/state assertions remain, and corrected focused checks passed on all three profiles (6 odds, 3 phase, 3 ending cases). The mage walkthrough additionally exposed a moving-companion test helper that returned without opening dialogue; it now confirms the conversation, and the complete mage retry passed. The full browser run continues; exact-commit CI must pass the entire fresh suite before publication.
- Final independent integration review found no high/medium blocker in normal play, saves, switching, shore handoff or story/teaching continuity. Conditional limitation: a failed standalone deck-image download requires reload to retry; visible skip/save exits remain available. Offline support and general asset retry remain outside this release.

- Optional-path review found that the offered first-day fishing choice could still use untaught Circle queries. Extended SELECT/FROM scaffolding to guided Tallyport fishing, and made queued companion speech wait for encounter/results and coach panels. The mage walkthrough now takes the actual pier-fishing option and checks that its results remain uninterrupted; other professions exercise the offered fishing skip. This targeted teaching correction requires fresh focused coverage and exact-commit CI; previous unrelated regression results are retained as such.

- Final focused checks passed on all three profiles: complete earned mage day with actual fishing (3 cases), all three prepared first-day cast choices and uninterrupted results (3 cases), and saved boat checkpoints/native shore transition (3 cases). The 300-case final local gate was restarted from the unchanged corrected candidate; its non-browser suites passed. No source/test changes will be made during that gate unless a required failure demonstrates a defect.

- The final local run passed all twelve complete guided days (warrior, thief, mage and crafter on phone Chromium, phone WebKit and desktop Chromium). Each used ordinary starting resources and actual movement/SQL interactions; mage took the fishing option, the other professions took the explicitly offered skip. Opened final 390×720 and 1280×800 captures for the rescue, homeland choices, worked query/result, held weapon, gold pile, fishing, cellar and actual farewell. No further source/test correction was needed during this final run; its remaining broad desktop regressions are still running.

- Final unchanged-candidate local gate completed successfully on 2026-11-24 UTC: `cd game; npm run verify`, exit 0, all required non-browser suites/build/526 packed-art hashes and all 300 browser cases (100 per profile), zero retries. Final diff whitespace check passed; all 38 intended text files decode as UTF-8 and both writing guides are byte-identical. The new art packer's two Python checks and exact-source replay also passed. Exact-commit CI, publication and independent hosted verification remain M7 requirements.
