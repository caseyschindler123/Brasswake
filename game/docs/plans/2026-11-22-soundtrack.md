# Complete soundtrack from existing downloads and local MIDI

Classification: complex — asset preparation, contextual playback, asynchronous audio loading, and release verification cross connected systems.

Status: implementation, full local release gate (69/69 browser checks), audio validation and visual review complete; corrected exact-commit CI deployment/live verification pending in isolated `soundtrack-local` worktree, initially based on `571e888`, then integrated with completed main release `7956eaa`. Preserve the other checkout's unfinished dungeon work.

## Authorized scope and acceptance

- Keep the three shipped tracks and use one prepared take from each of the eight downloaded Suno pairs. Do not buy or download more Suno music.
- Compose original editable Standard MIDI scores locally for the 17 missing themes: six dungeons, four shared wilderness themes, Examiner combat, tavern, dojo, card room, title, victory and death. Render original synthesized instruments locally; no paid service, third-party sample license, or runtime MIDI dependency.
- Ship 28 tracks/cues with valid loop metadata, bounded volume and decode memory. Every town and dungeon has its own theme; wilderness, venues, combat and title select appropriately. Victory/death are one-shot musical cues that respect music mute; existing effects respect effects mute.
- Maintain the Scene/host boundary, save compatibility, and user-gesture audio unlock. Rapid movement, failed loads, mute, hidden tabs and rapid context changes must not leave stale music playing or duplicate sources.
- Add meaningful routing, asset/metadata and asynchronous playback regressions, actual browser audio decoding/transition checks, and phone/desktop screenshot inspection.
- Update master docs and dated logs, run `cd game; npm run verify`, commit only soundtrack work, push to main without force, monitor the exact Actions commit and verify live commit/HTML hash and player flow.

## Milestones

1. [complete] Prepare downloaded loops, compose/render MIDI, retain editable scores and provenance, validate audio assets and metadata.
2. [complete] Integrate contextual selection and one-shot cues with robust asynchronous playback and bounded caching.
3. [complete] Add focused regressions; check actual browser decode/playback and inspect generated phone/desktop screenshots.
4. [complete] Update master docs, review final diff, pass full release gate.
5. [pending] Commit, push main, monitor deployment and verify published commit/hash and live player flow.

## Verification and release receipt

- Unit checks: every region, dungeon, venue and priority; one-shot/mute behavior; stale async requests; failed-load retry; cache bounds; loop metadata/files and local MIDI headers.
- Browser checks: decode every shipped audio file; real AudioContext playback after a gesture; transitions and resume; persistent music/effects settings; rendered phone 390×720 and desktop 1280×800 evidence. WebKit emulation is not a real iPhone test.
- Local composition/pipeline checks: reproducible MIDI and finite, non-clipping rendered samples; bounded lengths and normalized levels; seam continuity for prepared loops.
- Local gate: `npm run verify` passed, including 69/69 browser checks; six fresh audio/MIDI pipeline tests passed. Initial commit `c1235ee` was held by its CI cue-duration regression. Correction commit and deployment/live verification: pending.
- No save change. No image regeneration, art-coordinate edits, paid generation or additional Suno exports.

Focused evidence: 11 Node music regressions and four existing effect/magic regressions pass together. Six local composition/audio-pipeline checks passed with fresh FFmpeg decodes, no skips; measured new files -18.45 to -18.26 LUFS and highest true peak -5.83 dBTP. Three pinned image-tool regressions pass; packed verification reports 511 exact files, no missing/extra/changed assets. Phone Chromium context and actual transition checks pass; actual MP3 decode found sub-sample rounded cue duration rejection, fixed by validating loop bounds only for loops and checking cue metadata within one decoded frame. Full browser/release gate pending.

Integration: main advanced to `7956eaa` while the first local gate was running. Integrated its completed spell/effect implementation, limiter and tests; resolved the shared sound/source/doc hunks without publishing unfinished dungeon changes. Restarted the required full gate on the combined code. Local browser fixtures use `BW_TEST_PORT=8782` to avoid the active other checkout, with ephemeral-port server safety regression coverage.

Initial local evidence: all non-browser checks in `npm run verify` passed. The 69-check browser pass had 65 passes and four WebKit fixture-readiness timeouts (title, Tallyport, paper doll and dungeon); traces showed pending atlas/font loads and no page errors during observed 100% machine CPU. All four passed with `playwright test --last-failed --workers=1`, with original assertions/deadlines unchanged. All actual music checks passed across the three projects. Inspected 390×720 Chromium/WebKit settings, desktop 1280×800 settings/world, and the retried WebKit title/dungeon images. No real iPhone or human listening claim.

Publication must pass the full unchanged `npm run verify` gate in GitHub Actions, then its deployed commit/HTML hash and hosted player flow. Post-release completion and exact URLs/SHAs are recorded in ignored `work/soundtrack-release.json` to avoid a documentation-only deployment merely to record an already verified release.

CI correction: the first exact-commit release gate passed 68/69 browser checks but Linux WebKit decoded `m_victory` with a different MP3 padding duration. Preserve the strict one-frame assertion and ship both short one-shots as original rendered 16-bit PCM WAV instead, with runtime format selection, WAV-header/path regressions, new measured hashes and unchanged MIDI. Rerun the required gate on the correction before publication.

Correction local gate: `npm run verify` exited 0 with all 69 browser checks passing in 5.6 minutes; no assertions or deadlines relaxed. Six fresh audio/MIDI pipeline tests passed with no skips (38.438 seconds), including actual output levels/tails and PCM cue frames. Reopened updated 390×720 WebKit and 1280×800 desktop Sound screenshots: controls and text remain readable. Total audio payload is 29,523,464 bytes across 26 MP3 loops and two short WAV cues. Exact correction SHA, successful Actions run, published HTML hash and live player/audio checks remain release gates; record their completed receipt in ignored `work/soundtrack-release.json`.
