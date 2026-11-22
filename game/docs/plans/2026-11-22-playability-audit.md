# Playability audit and repair

Class: complex. Status: implementation and final local verification complete (42/42 browser tests). Release completion is recorded against the final deployed SHA in `work/playability-audit-release.json` and the GitHub Actions run; the receipt is written only after live verification. This follows the workflow's rule to keep post-release evidence in ignored `work/`.

## Acceptance criteria

- Exercise fresh-player onboarding, touch SQL editing and grading, combat and loot, inventory, bank, contracts, travel/interiors, dojo, dungeon, and save persistence in disposable Playwright accounts.
- Reproduce and repair concrete defects; retain meaningful browser regressions for changed behavior.
- Inspect relevant screenshots at 390×720 and 1280×800; verify phone WebKit as emulation only.
- Complete the release gate, commit intended files, deploy main, verify the exact published commit and HTML hash, and repeat the hosted player flow.
- End after a clean retest of repaired flows and a broad pass with no unresolved major reproducible defects. Record untested areas and external limitations honestly.

## Milestones

1. Read project context and inspect existing coverage (complete; clean initial working tree).
2. Explore major flows through Playwright (complete: walk/run, intro and touch command/field entry, fight/error fix/loot, equip/sell/page purchase, bank, fishing, guided vault chest, dojo practice and a two-round tournament bout).
3. Repair defects and add focused regression coverage; update master documents (complete).
4. Run `npm run verify -- --ui`, inspect screenshots, review final diff (complete: final 42/42 browser tests, engine/content, poker, casino, 21 workflow checks and 486 packed assets passed; combat error/Run row, fishing, vault reward, dojo, interior, poker and dye/bank screenshots reviewed, including affected 390×720 Chromium/WebKit and 1280×800 desktop views).
5. Commit, push, monitor exact Actions run, verify published metadata/hash and hosted player flow; repeat repairs if needed.

## Evidence and release

- Reproduced: `SELECT name FROM items; -- done;` was rejected as multiple statements; `/* note */ SELECT 42` discarded sandbox rows; Format changed block comments into `/ * ... * /`; keyword detection stopped at a `--` string value. Engine/content regression suite passes after repair.
- Screenshots showed combat controls squeezing the title and dim error guidance, and dark fishing button/gain labels against dark art. CSS now wraps controls and fixes text contrast. Focused phone Chromium regressions passed (3/3); the final gate also covers repeat payouts and death protection/recovery.
- Follow-up screenshot review found that the wrapped header plus error explanation could scroll the Run row out of view. Prompt panels can expand to within 24px of the viewport top, and the regression checks the Run button's bounds.
- Local artifacts belong in ignored `work/` and `game/test-results/`.
- No unhandled page errors during exploratory gameplay. Later-content checks use direct location and skill setup; this audit does not establish endgame balance, every optional branch, real iPhone behavior, or audio quality.
- Browser tests use isolated saves; no player data or art generation is involved.
- The hosted player flow also executes a commented sandbox query, then exports, imports and reloads the character. The release receipt records the published commit/hash and the live result; a failed result is not completion.
- Follow-up exploration: blackjack betting/stand, wheel queries, and poker turns were exercised; phone and desktop painted controls were inspected. A commented poker COUNT was rejected by its separate rule gate and spent a read. The gate now uses `Engine.uncomment`; the new regression passes on all three browser projects. Full release verification is repeated for this runtime correction (42 browser tests).
- The second full gate found a genuine random reward/UI race in phone WebKit: `maybeDye` replaced the bank sheet after its fixed 900ms timer. It now uses a notification and preserves the active screen. The bank regression forces this rare reward and waits past the old timer, retaining the item-transfer assertions. Required checks are repeated after this fix; the failed run is not counted as passing.
- Final gate passed after the dye fix. An intervening fixture-port collision was resolved by closing leftover test processes and running checks sequentially; it was not waived. The focused WebKit dye/bank regression and final 42-test gate both passed. Initial release `3203202` deployed and passed Actions/live verification; the final receipt identifies the follow-up deployment containing all fixes.
