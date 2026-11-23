# Warrior, mage and thief audit — 2026-11-23

Status: working candidate; final release verification is pending in the [plan](plans/2026-11-23-path-playthrough-and-balance.md). This records observed campaigns separately from prepared boundary regressions and source-module simulations.

## What was played

Fresh main characters used the normal starting presets, gain curve, resource costs, loot and authored shop/training prices. Each compressed campaign covered all eight regions, 82 remaining lessons after the normal guided-start skip, 96 scheduled ordinary encounters, optional locks and all eight Examiners. Thieves also attempted regional concealment/thefts and preferred Backstab when an actual rear approach succeeded. Mages crafted prepared scrolls from earned materials and used wards/recovery. No skill, stat, money, item or reward values were injected into these campaigns.

Travel, service access, encounter approach, SQL entry and animation waits were shortened through the localhost test adapter. Concealed approaches and escape/return movement used the actual joystick, detection and pursuit. Correct reference SQL represents a proficient player. Three action-roll seeds were used per path (1729, 31415, 27182); native patrol timing can still vary. Another run of each path used seed 8675309 with every seventh offensive query deliberately wrong. Utility/lesson answers remained correct in that scenario.

## Results

| Path | Correct-query campaign range | Mixed-answer run | End-of-campaign evidence |
|---|---:|---:|---|
| Warrior | 250–255 queries, 8/8 marks | 271 queries, 8/8 | Swordsmanship 85.4–86.4; Tactics 69.8–72.8; Anatomy 77.7–79.9; STR 78.4–80.2 |
| Mage | 326–337 queries, 8/8 marks | 359 queries, 8/8 | Magery 86.7–88.6; Evaluating Intelligence 69.0–73.1; Meditation 75.2–77.9; Inscription 60.8–67.5; INT 94.8–98.3 |
| Thief | 416–429 queries, 8/8 marks after the preparation replay below | 463 queries, 8/8 | Fencing 84.7–86.1; Stealth 72.5–75.8; Hiding 84.5–85.8; DEX 100 |

The selected completed runs had no deaths. One earlier thief run on seed 27182 reached the Council with a First Circle blade, insufficient supplies and a weak bandage response, then died three times. Its failure is retained. The revised replay used safer potion timing, resupply and repeated genuine concealment attempts; it earned a stronger blade along the way and completed the Council. Loot/patrol variation prevents attributing that improvement to one isolated change. Starting skills, attributes, caps and growth rates were not buffed to obtain a pass.

These counts compare different play styles, not equal-content damage benchmarks: thieves perform extra concealment/theft and movement, while mages perform Inscription and mana recovery. Warrior is the most direct route. Mage needed roughly 30% more queries in this protocol. Thief is more dependent on preparation, terrain and successful approaches, and regular Fencing remains a fallback when concealment fails or another patrol intervenes. Backstab was actually used 33–42 times in the selected thief campaigns, including wounded Examiner re-entry; the mixed-answer run used it 39 times.

Defense skills rose more slowly: Parrying needs a shield and a live counterattack, and Resisting Spells needs actual hostile magic. Many ordinary fights end before a counterattack. These runs do not establish the pace of a caster-focused dungeon training route.

## Controls and transactions

- Each campaign used visible Hero controls to lock its combat skill and related stat, then set Lower below the budget cap, and verified unchanged values through actual encounters. Small stopping targets subsequently locked on arrival. A controlled secondary-stat lock made the target test deterministic without changing the stat's earned value.
- All completed profiles exported, imported and reloaded their earned saves. Skill/stat modes, targets, values, resources, pages and query records matched. Thieves bought the first ten Stealth points for 170 earned gold through dojo quotes and a stopping target; these paid lessons gave no attribute gain.
- Prepared browser cap coverage uses real SQL gains at 700 to release only the designated donor points. Pure regressions additionally cover the 225 attribute budget, donor floors, targets, partial room and resource clamping. These are boundary fixtures, not claims that a compressed campaign naturally maxed every budget.
- A 64-seed simulation using the actual pure modules averaged 469 correct nearest-Circle queries from skill 40 to 100, versus 2,163 First Circle queries. Warrior/Mage/Thief isolated primary-stat gains averaged about 15 points per 100 correct uses, plus about five secondary points. These are action counts, not human learning times.

## Findings addressed

- Busy Flee previously kept skill/stat gains while skipping queued retaliation. A committed exchange now finishes before escape.
- One living elite could previously pay multiple theft rewards. A successful purse or prize lift now empties that creature's pockets; actual combat loot and genuine respawns remain. A caught ordinary theft now starts pursuit.
- Wrong or shown killing queries could train automatic post-victory bandaging, and shown SQL could train technique records. Healing still occurs, but those answers teach no RPG/attribute/SQL skill.
- Hide and optional locks displayed generic combat odds rather than their actual rules. The candidate displays the correct concealment/disarm chances and heavy-armor penalty, using pre-practice values for the roll. Recovery identifies its deterministic useful-query effect. Combat support prompts identify Bandage/Recover/Ward/Study/Heal and one response round instead of a weapon name/hit chance.
- Backstab adds actual rear preparation, stamina cost, reveal, retaliation, pursuit, bounded same-target wounds/Examiner phases, owner/death reset and no premature loot. Its wound timer counts active world play and pauses during questions, menus, loading and background time, preserving room to think about SQL. A novice can actually reach the rear interaction tile; the phone cue and primary action fit visibly. Guardians return around obstacles through a bounded route instead of sticking at a corner.
- The campaign driver now handles live patrol interruptions, waits for rendered joystick availability, considers armor/stamina, and verifies actual purchase debit/item ownership. Early attempted upgrade log entries with zero gold change were blocked by a full bag and are not counted as purchases. A continuation of the actual earned thief save sold unworn common gear and bought the available shield for exactly 416 gold without changing any skill or stat; its stronger existing blade was correctly kept.

## Reuse and limitations

From `game/`, `npm run test:paths` runs the three compressed campaigns. For a targeted run use `npm run test:paths -- --paths=thief --seeds=27182 --label=thief-check`; add `--mistake-every=7` for the mixed-answer scenario. `--encounters=12` is the default per region. Runs build an isolated snapshot and write source/HTML identity, action logs, checkpoints, screenshots and earned save codes under ignored `work/path-audit/<label>/`. An existing snapshot there can be selected with `--snapshot=<absolute path>`. The harness is never shipped, and hosted `__bw` remains unavailable.

This is an automated compressed Trials audit, not a manual exploration of every optional quest or all 28 dungeon floors with each earned build. Prepared browser tests separately exercise dungeon keepers and the full escape/reconceal/re-entry loop on phone Chromium/WebKit and desktop. No real iPhone or human beginner/long-session balance study was performed. Final local/CI/deployment evidence belongs in the closed plan and release history after verification.
