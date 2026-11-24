# Consistent soundtrack and sound effects through Stable Audio

Classification: complex — replaces the complete music catalog, adds generated effect assets, and connects browser generation, audio preparation, contextual playback and release verification.

Status: planned, not started. Casey requested this plan on 2026-11-24. No Stable Audio account has been opened or inspected for this task, no credits have been spent, and no replacement audio has been generated or released. Planning/documentation is the only work authorized in this turn. Casey intends to purchase one month; subscription purchase and the available account balance are not yet confirmed.

## Outcome and acceptance criteria

- Replace all 28 existing music entries, including the 11 Suno imports and 17 rendered MIDI pieces, with a coherent Stable Audio soundtrack: 26 repeating themes and two one-shot musical cues. Retain existing IDs and output paths where practical; preserve historical MIDI sources and provenance without playing the old music in the completed replacement release.
- Use the browser to generate and download music and effects for Casey. The agent owns prompts, take selection, preparation and integration; routine per-track user review is not required. Casey handles sign-in or subscription/payment UI if needed. Start generation only after Casey asks to execute the plan; account access and an available credit budget are prerequisites.
- Every repeating music prompt explicitly identifies instrumental background music for a fantasy role-playing video game and requests cyclic phrases, steady tempo/dynamics, an immediate musical start and a seamless return. Local preparation must establish the actual repeat boundaries: a prompt or a vendor LOOP label does not prove a seamless asset.
- Replace audible synthesized effects with generated assets in the bounded first-pass inventory below. Keep fast, quiet teaching/UI tones where they already work; avoid unrelated changes to combat, progression, saves or visual art. Environmental assets are planned as short cues through existing hooks; continuous ambience is a separately identified optional extension.
- Use one shared production brief, controlled levels and consistent musical scale. Towns/dungeons remain distinct. New venue themes must actually play in the corresponding contexts; combat/title/dungeon priorities remain correct.
- Download originals and record prompt, visible model/settings, generation/project reference, source hash, selected take and prepared output metadata. Keep raw audio and private account/billing information outside git; commit concise source provenance and final game assets. No public sharing or standalone soundtrack publication is needed.
- All shipped files decode, have bounded durations and levels, and obey independent music/effect mute. Loading failures retain safe fallback behavior, caches/voices remain bounded, and repeated effects have no obvious leading delay or cut-off tails.
- Pass audio preparation checks, meaningful runtime/browser regressions and the required release gate, then exact-commit deployment and hosted verification. Report subjective listening and physical-device limits honestly.

## Browser execution and spending boundaries

1. At execution time, read the applicable browser/computer-use instructions and select the user-authorized browser. Use supported visible UI controls for Stable Audio; no API, hidden application endpoints or unofficial download workarounds. Local scripts are for downloaded-file preparation and tests.
2. Inspect the signed-in plan, remaining credits, current generation prices, available duration/loop controls, export formats and applicable game-use terms. The public documentation varies between Generate, Sampler and Sessions; the actual UI determines usable settings. Record the date and relevant settings. Do not assume Sessions prices also apply to Sampler or Generate.
3. Casey's stated intention to buy a month does not authorize making the purchase in this planning turn. At execution, use the purchased month's credits within an agreed ceiling. No upgrades, top-ups, additional months, renewal changes or paid API use are included. Report approaching exhaustion before spending outside that ceiling.
4. Generate a three-item pilot: Tallyport, Bilge Vaults and regular combat. Check exported files and suitability before bulk generation. Adjust this task's audio prompts if necessary; existing image-generation settings and master image prompts are untouched. No routine approval stop is needed within an authorized generation budget.
5. Use full-mix generation for music initially. Prefer stable controls over experimental multitrack arrangements. Keep the same model/version and brief across the batch when available. If the service changes model mid-run, record it and assess consistency before continuing.
6. Download each selected original promptly as lossless WAV where offered. Keep rejected alternatives without repeatedly spending credits on the same known defect. Resume by catalog ID after interruptions; do not regenerate completed entries accidentally.
7. If login, CAPTCHA or payment requires Casey, hand over that specific UI step and continue after it is complete. Do not ask for passwords or keys in chat.

## Cohesive sound and reusable loop prompt

Direction: a polished, intimate 1990s-inspired fantasy RPG score with believable acoustic instruments and detailed performances. Shared ensemble: lute, harp, recorder/oboe/clarinet, warm strings, restrained French horn and light hand percussion. Keep room for reading SQL, exploring and hearing effects. Avoid the thin synthetic timbres of the local render, modern song structures and trailer-scale production. Consistency comes from this ensemble, room sound, dynamics and mix; melody, harmony and local instrument emphasis vary by place.

For every loop, concatenate this shared prompt, the exact row brief below, and the loop ending instruction. Save that assembled text with the generation. Square-bracket labels below are placeholders to replace, never text to submit unchanged.

Shared prompt:

> TrackType: Music. Instrumental background score for Brasswake, a fantasy role-playing video game where players explore and read dialogue and SQL puzzles. A small acoustic fantasy ensemble inspired by 1990s PC RPG composition, with natural expressive instruments, warm strings, lute or harp, woodwinds and restrained hand percussion. Polished, intimate and clear, moderate room reverb, gentle transients, balanced midrange and restrained bass. A memorable understated motif, stable dynamics and enough space for reading and game sound effects. [ROW BRIEF]

Loop ending instruction:

> Compose a continuous repeatable gameplay loop at the stated fixed tempo and meter. Use balanced 8-bar phrases in a repeating A/B cycle with subtle variation. Start directly in the ongoing texture on a clear downbeat. The final phrase returns naturally to the opening harmony, rhythm, instrumentation and energy, as though the next bar is the first bar again. No introductory swell, pickup-only opening, breakdown, tempo change, final cadence, ending, fade-in or fade-out. Instrumental only: no singing, speech, choir, vocal pads, modern drum kit, EDM, trap or electric guitar. Keep water, wind, animals and other environmental sound effects out of the music.

Settings: use the visible loop option when available, and an explicit BPM/key. Aim for a prepared 32–64-second, whole-phrase loop to reduce fatigue without inflating mobile downloads. Generate 60–90 seconds when available so there is material to select clean 8/16-bar boundaries; use the shortest supported duration that fits the requested phrases. If the UI offers only a 30-second LOOP preset, test its musical/seam quality in the pilot rather than assuming the prompt can override that duration. Key, tempo and phrase requests are targets to validate, not guaranteed model output.

### Complete music generation list

Each row is one required catalog entry. Use the shared prompt + row brief + loop instruction for the first 26. The last two use the separate cue template.

| ID | Context | Row brief / target |
|---|---|---|
| `m_tallyport` | Tallyport harbour town | Welcoming working port, curious and hopeful; recorder melody, lute, warm cello and soft hand drum. D major, 80 BPM, 4/4. |
| `m_brackwater` | Brackwater marsh town | Damp timber streets and mist, patient resilient people; low clarinet, harp and muted strings. D Dorian, 72 BPM, 4/4. |
| `m_haverly` | Haverly hill town | Open hills, old stone and shepherds; oboe, fingerpicked lute and viola, gentle confidence. G major, 84 BPM, 4/4. |
| `m_four_fords` | Four Fords farmland town | River crossroads, fields and everyday trade; recorder and plucked strings with a light folk sway. C major, 88 BPM, 4/4. |
| `m_cinderwick` | Cinderwick forge town | Industrious volcanic island, determined warmth; low strings, restrained horn, dulcimer and measured hand percussion. A Dorian, 92 BPM, 4/4. |
| `m_kell` | Kell cavern town | Sheltered subterranean settlement, thoughtful and mysterious; bass clarinet, harp and warm viola, sparse high notes. E minor, 72 BPM, 4/4. |
| `m_highwatch` | Highwatch snow town | Quiet mountain refuge and winter resolve; soft recorder, harp, sustained strings and modest horn. D major, 68 BPM, 4/4. |
| `m_aldermoot` | Aldermoot capital | Marble courts, libraries and civic dignity; oboe, chamber strings, harp and restrained horn, stately rather than triumphant. F major, 80 BPM, 4/4. |
| `m_bilge` | Bilge Vaults dungeon | Cramped old vaults under a port; low clarinet, pizzicato cello and sparse muted percussion, wary curiosity. D minor, 76 BPM, 4/4. |
| `m_sunken_sluice` | Sunken Sluice dungeon | Flooded stone channels and concealed danger; low woodwinds, plucked harp and suspended strings, restrained pulse. A minor, 72 BPM, 4/4. |
| `m_barrows` | Old Barrows dungeon | Ancient burial passages, solemn exploration; low oboe, cello and sparse harp, dignified unease. D minor, 68 BPM, 4/4. |
| `m_tanglewarren` | Tanglewarren dungeon | Tangled roots and silk tunnels, watchful movement; clarinet, pizzicato strings and lute ostinato. E Dorian, 84 BPM, 4/4. |
| `m_slagdeep` | Slagdeep dungeon | Deep forge passages and controlled pressure; low strings, bassoon, restrained horn and dry frame-drum rhythm. C minor, 88 BPM, 4/4. |
| `m_crystal` | Crystal Vaults dungeon | Strange refracting chambers, wonder with tension; delicate harp harmonics, clarinet and sustained chamber strings. B minor, 72 BPM, 4/4. |
| `m_ice` | Ice Halls dungeon | Vast frozen passages and isolation; breathy recorder, low strings and widely spaced harp notes. E minor, 64 BPM, 4/4. |
| `m_stacks` | Sealed Stacks dungeon | Forbidden archives, quiet intellectual danger; bass clarinet, viola and repeating plucked figures. F-sharp minor, 76 BPM, 4/4. |
| `m_wild_coast` | Coast/marsh wilderness, regions 1–2 | Salt roads, reeds and broad horizons; recorder, lute and warm strings, spacious and exploratory. D Dorian, 80 BPM, 4/4. |
| `m_wild_fields` | Hills/fields wilderness, regions 3–4 | Long country roads and rolling green land; oboe, harp and light strings, relaxed forward motion. G major, 84 BPM, 4/4. |
| `m_wild_stone` | Forge/cavern wilderness, regions 5–6 | Rocky trails, ash and distant peaks; low woodwinds, cello and lute, sturdy and reflective. A Dorian, 78 BPM, 4/4. |
| `m_wild_north` | Snow/capital wilderness, regions 7–8 | Cold pines, old roads and mountain air; recorder, viola, harp and very restrained horn. E Dorian, 72 BPM, 4/4. |
| `m_combat` | Regular combat | Alert tactical fantasy battle, clear pulse without exhausting repetition; rhythmic low strings, horn answers and controlled hand drums. D minor, 112 BPM, 4/4. |
| `m_examiner` | Examiner/boss combat | A formidable formal trial, tense and determined; chamber strings, low brass and frame drums, more urgent than regular combat without a cinematic climax. D minor, 120 BPM, 4/4. |
| `m_tavern` | Tavern interiors | Small friendly tavern musicians; lute, recorder, fiddle and light hand drum, lively but unobtrusive, no crowd recording. G major, 96 BPM, 4/4. |
| `m_dojo` | Dojo/training | Calm focused practice; plucked strings, low woodwind and measured frame drum, disciplined rather than battle music. A Dorian, 88 BPM, 4/4. |
| `m_cards` | Card-room activity | Quiet calculation and friendly risk; pizzicato strings, clarinet and light lute, playful restraint. E minor, 92 BPM, 4/4. |
| `m_title` | Title/character selection | The game's principal theme, a ledger and a lantern; clear hopeful woodwind motif answered by warm strings and modest horn, inviting exploration. D major, 76 BPM, 4/4. |
| `m_victory` | Victory cue, one-shot | A brief earned success, rising woodwind/harp figure answered by warm strings and a modest horn; D major, approximately 4–6 seconds, natural short resolving tail. |
| `m_death` | Death cue, one-shot | A restrained melancholy loss, descending cello/clarinet phrase and a soft harp answer; D minor, approximately 6–9 seconds, gentle resolving decay, no horror sting. |

Cue template: `TrackType: Music. A short instrumental [ROW BRIEF] for a fantasy role-playing video game. Use the same intimate natural woodwind, harp, chamber-string and restrained horn palette as the gameplay score. One complete musical gesture with an immediate start and a clean natural decay. No repeating loop, long introduction, speech, singing, choir, modern drums or environmental sounds.` Use a supported short duration, or trim a longer export without clipping the decay. Victory/death intentionally resolve and do not receive loop instructions.

Example complete Tallyport prompt:

> TrackType: Music. Instrumental background music for a fantasy role-playing video game: a welcoming working harbour town where players explore, read dialogue and solve SQL puzzles. Intimate acoustic fantasy ensemble inspired by 1990s PC RPG composition, with natural expressive recorder, lute, warm cello and soft hand drum. Hopeful understated melody, D major, fixed 80 BPM, 4/4, balanced 8-bar A/B phrases with subtle variation. Polished clear mix, moderate room reverb, gentle transients and steady unobtrusive volume. Start on the downbeat already in the ongoing texture. Make a continuous repeatable gameplay loop: the final phrase leads straight back to the opening harmony, rhythm and energy. No intro, ending, final cadence, breakdown, tempo change or fades. No vocals, choir, speech, modern drum kit, electric guitar, EDM or environmental sound effects. Leave space for reading and game sounds.

## Sound effects: bounded first pass

Use a common close, clean, lightly reverberant fantasy-game sound, with a clear initial transient and a complete short decay. Keep music out of effects. Generate only sounds with a named runtime destination, except optional ambience explicitly identified below. Confirm actual UI costs before choosing Generate versus sample packs; eight variations do not imply eight useful effects or a known credit price.

- Core actions: `swing`, `thrust`, `hit`, `hurt`, `bow`, `miss`, `coins`, `door`; one initial usable take each. Prompts distinguish air swishes from impacts. Human hurt is a restrained nonverbal exertion/impact, never spoken dialogue or a long scream.
- Footsteps: one isolated footfall each on stone, wood and soil, matching existing surface detail. Cut to a responsive short asset; use subtle bounded pitch/level variation to avoid machine-gun repetition.
- Magic: distinct cast and impact assets for all eight existing spell identities (Spark, Frost Dart, Sunlance, Chain Bolt, Fireball, Crystal Shard, Blizzard, Rewrite), preserving the existing delayed projectile-impact timing and rare-spell emphasis. Sixteen initial assets. Prompts describe the physical sound separately for cast and impact; no long cinematic charge-up.
- Activities: `smith`, `alchemy`, `craftFail`, `fishCast`, `fishCatch`, `fishEmpty`; six initial assets. Fishing success is water movement rather than a musical victory.
- Creatures: eight existing voice families (`bird`, `small`, `beast`, `dragon`, `spirit`, `stone`, `insect`, `wet`); one short signature each. Creature bow/swing continue to reuse their matching action assets.
- Environment: short harbour, market, hearth, cave, drip and draft cues for existing `ambient` hooks; six initial assets. Market uses indistinct distant human bustle with no intelligible speech. Keep these subdued and separate from music.

This is 47 initial effect assets (8 core + 3 steps + 16 magic + 6 activities + 8 creatures + 6 environment). They are targets within the credit cap, not a promise that every generation succeeds. Preserve current concise `click`, query-grade, heal and reward tones; preserve effects-only victory/death feedback when music is muted. Generated samples may fall back to synthesis on decode/fetch failure rather than lose feedback entirely.

One-shot prompt template:

> TrackType: SFX. One isolated [ACTION/SOURCE] for a fantasy role-playing video game. [MATERIAL, MOTION AND CHARACTER]. Immediate clear attack, [TARGET DURATION] including the complete short natural decay. Close clean recording, restrained room reflection, audible on small speakers without excessive bass. A single event, no lead-in silence, no repeated sequence, music, speech or unrelated background sound.

Example: `TrackType: SFX. One isolated heavy wooden tavern door opening for a fantasy role-playing video game: a short iron-latch click followed by a restrained wooden hinge creak. Immediate onset, approximately one second including the full short decay, close clean recording with a little warm room reflection. No slam, repeated opening, music, voices or background ambience.`

Optional reserve work after the required music and first-pass effects: variation takes for frequent footsteps/weapon hits, then four 20–30-second seamless ambience beds (harbour, hearth/tavern, dungeon water, mountain wind). Ambience prompt: `TrackType: SFX. Seamlessly repeating environmental ambience for a fantasy role-playing video game: [PLACE/TEXTURE]. Steady subdued texture with sparse incidental detail, matching beginning and ending density, no dramatic single event, music, intelligible voices, fades or ending.` Store these locally unless the same implementation includes a bounded ambience channel with independent effects mute, fade/stop on context changes and browser coverage. Continuous ambience must not be slipped into an existing periodically triggered one-shot hook.

## Credit envelope and quality control

Public plan assumption checked 2026-11-24: Solo advertises 660 monthly credits for USD 12/month before applicable taxes. This is a vendor-price estimate for a future subscription, not a measured task charge or confirmation of Casey's balance. The Sessions guide documents four credits per full mix and six per multitrack session; the active app's displayed debit takes precedence. No API cost is included.

| Allocation | Planning ceiling | Reason |
|---|---:|---|
| Music | 272 credits | 28 first takes at 4 = 112; up to 40 further generation/edit operations at that rate = 160. Pilot is included in these 28, not an extra batch. |
| Required effects | 208 credits | 47 first takes would cost 188 if charged 4 each; limited room for retries. Recalculate from the visible effect/sample-pack price before spending. |
| Reserve | 180 credits | Failed-quality replacements, essential effect variants, then optional ambience; not an obligation to spend the balance. |
| Total ceiling | 660 credits | One assumed Solo month's allocation; actual starting balance can reduce this. |

Prioritize completion of all required music before optional effects/ambience. Reallocate within the confirmed ceiling when concrete quality needs justify it; do not silently omit required inventory. If the visible prices or acceptance rate make the full scope infeasible, report the remaining IDs and options without buying more. Check remaining credits after each small batch using existing UI/notes; no billing collector or new ledger system is needed.

The agent performs selection with available audio inspection/playback tools, measures actual files and checks repetition; Casey need not audition every take. Do not equate pressing Play, viewing a waveform or passing signal checks with having heard the sound. If the available tools cannot support subjective listening, explicitly record that limitation and use bounded technical checks/consistent first takes; never report aesthetic approval that did not occur. Reject clipping, silence, vocal contamination, broken phrases and conspicuous loop jumps when observable. A repeated failure in the pilot calls for prompt/settings adjustment before spending on the rest.

## Asset preparation and implementation

1. Save raw downloads read-only under ignored `work/music/stable-audio-2026-11-24/`. Retain the old source scores/catalog history; never delete Casey's original imported files. Do not upload old Suno audio as a style reference; the shared written brief establishes the new sound.
2. Extend the existing audio preparation tools only as needed for externally generated WAV inputs. Record `stable-audio` origin and prompt/settings/source/output hashes in the tracked catalog. Keep private URLs/account identifiers/payment receipts local. Generalize the old retained-track and original-MIDI assertions meaningfully for the new catalog rather than deleting asset/provenance checks. Retained MIDI pipeline tests may still verify historical editable sources without asserting they supply the shipped music.
3. Choose whole-bar phrase boundaries by measured audio, trim leading silence, align/adjust the seam and crossfade only as needed. Append the existing decoder safety tail and measure the actual encoded/decoded output. Check repeated joins and musical phrase continuity, not only sample-level continuity. A long crossfade must not hide incompatible chords or double percussion.
4. Preserve 44.1 kHz stereo browser-compatible MP3 loops and 16-bit PCM WAV victory/death cues; choose compact browser-decodable formats for effects based on onset/tail requirements. Maintain the current music normalization target near -18 LUFS with peak headroom; balance very short effects using peak/energy and in-game mix rather than pretending integrated LUFS is meaningful for every transient.
5. Keep existing catalog IDs and contextual priority. Add deliberate venue selection for tavern, dojo and card-room activity, with return to the correct location theme and stable settling behavior. Current code/tests explicitly retain town music indoors, so update those assertions to verify the intended new behavior. Check actual `Scene.musicContext()`/host venue facts at implementation time; do not infer a venue from an unconnected asset name.
6. Integrate samples behind existing sound events and presentation timing. Keep user-gesture unlock, persistent independent mute, shared compressor, bounded decode cache/voice count, serial/stale-safe loading, load retries and synthesis fallback. Lazy-load effects or small packs; do not eagerly decode the whole generated library on a phone. Asset loading must not turn a short sword impact into delayed feedback.
7. Update `arttools/packed_manifest.json` deliberately from verified outputs. Record compressed payload and maximum decoded cache use; compare against the existing release and avoid unexplained mobile-memory/download growth. Never hand-edit `game/dist/` or generated art coordinates.
8. Update architecture, gameplay/audio descriptions, art/music source rules and dated Decision logs to the implemented state. Until release, the current Suno/MIDI soundtrack remains the documented shipped source.

## Milestones and required verification

- [x] M0: save this plan, all 28 prompt briefs, bounded effects inventory and acceptance criteria; add a planned entry in the owning master document. Documentation review and `git diff --check` only for this turn.
- [ ] M1: Casey starts execution; inspect browser/account/UI prices and terms, establish the actual one-month ceiling, and capture/export the three-item pilot. Confirm tools' listening capability and limitations.
- [ ] M2: generate, download and catalog all 28 accepted replacement music sources. Complete every required ID before optional expansion. Check the production brief across the batch.
- [ ] M3: generate/download the bounded effects inventory, prepare loops/cues/samples and integrate contextual music, venues and sample playback. Record any budget-constrained unfinished IDs explicitly.
- [ ] M4: focused regressions and decoded-file checks pass; complete source/asset/provenance diff review and reconcile master docs. Run `cd game; npm run verify -- --ui` for the implementation release.
- [ ] M5: commit only intended implementation files, push normally to main, monitor Actions for that exact SHA and verify the published commit and HTML hash plus hosted player/audio flow. Close this plan and add durable evidence to `RELEASE_HISTORY.md`; commit documentation closure without another game deployment.

Focused verification at M4:

- Audio files: every replacement/source hash, supported format, duration, non-silence, finite samples, non-clipping peaks, normalization/mix, frame-accurate WAV cue duration, loop bounds, phrase joins and decoded safety tails. Run/extend `arttools/music/test_soundtrack.py` with its pinned local environment as appropriate.
- Routing: all eight towns, eight dungeons, four wilderness groups, three venues, title, regular/Examiner combat and both musical cues; transitions out of venues/combat, cue priority and proper resumption. No stale old track after context changes.
- Effects: every mapped event/family/surface, eight cast/impact pairs and their actual timing, successful and failed sample loads, late loads after scene/mute changes, overlapping rapid events, throttle/voice/cache limits and fallback without duplicate sound.
- Browser: decode all new shipped audio in phone Chromium, phone WebKit at 390x720 and desktop Chromium at 1280x800; unlock audio through a user gesture, exercise music/effects mute persistence, hidden/resumed tabs, rapid context changes and representative combat/venue/environment flows. Open relevant generated Sound settings and player-flow screenshots. Audio joins and mix need audio evidence in addition to screenshots; WebKit emulation is not a physical iPhone listening test.
- Release: exact-commit Actions gate/deploy and independent hosted commit/HTML verification, fresh-browser real player/audio flow, required asset retrieval, and concise tracked release evidence with actual date, source SHA, Actions link, HTML hash, checks and limitations. Do not mark a pending/failed release complete.

## References and planning evidence

Existing implementation inspected: `game/src/audio.js`, `game/test/music.test.js`, `game/test/browser/music.js`, `arttools/music/README.md`, `arttools/music/soundtrack.json`, and the completed [2026-11-22 soundtrack plan](2026-11-22-soundtrack.md). These establish 28 entries and the current deliberate town-music retention in venues. They are historical evidence, not tests run for this plan.

Vendor sources checked 2026-11-24; recheck in the actual browser before spending:

- [Stable Audio plans and free/paid allowances](https://stableaudio.com/) and [pricing](https://stableaudio.com/pricing).
- [Sessions operation prices and free editing/export](https://kb.stability.ai/knowledge-base/how-to-use-stable-audio).
- [Prompt structure, instrumental music and SFX tags](https://stability.ai/guides/stable-audio-3-prompt-guide).
- [Generate, Sampler and Sessions capabilities](https://stability.ai/guides/whats-new-in-stable-audio-november-2026-release-notes).
- [Hosted music/effects licensing for games](https://kb.stability.ai/knowledge-base/stable-audio-commerical-and-usage-licensing).

Plan-only completion: no browser generation, subscription purchase, paid music tool, delegated agent, game build/test or deployment. Task-specific AI billing is unavailable; a future subscription estimate is separate from this planning task's actual costs. No release entry is appropriate until implementation ships.
