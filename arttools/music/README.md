# Audio preparation

The replacement catalog contains 28 Stable Audio music tracks/cues and 64 generated effects. Normal game builds use committed audio and need no Python, generation-service login or paid tool. Raw sources stay read-only in ignored `work/`; account and credit receipts are never published.

## Prepare the downloaded sources

Use the pinned `requirements-local.txt` in a local Python environment and an existing compatible ffmpeg binary. From the repository root:

```powershell
python -I arttools/music/prepare_stable_audio.py --ffmpeg <ffmpeg.exe> --music-sources work/music/stable-audio-2026-11-24 --effect-sources work/audio/stable-sfx-2026-11-24
python -I arttools/music/test_soundtrack.py --ffmpeg <ffmpeg.exe>
```

The input folders contain the local source-capture manifests and originals. The preparer verifies original source hashes and makes no service requests. It writes browser assets, both tracked catalogs, the explicit `MUSIC`/`SAMPLES` metadata in `game/src/audio.js`, and audio entries in the packed manifest. It never changes image coordinates or writes `game/dist/`.

`soundtrack.json` records all 28 sources, exact submitted prompts, model, source/output hashes, phrase selection, loop points and measured output levels. It retains no old music entries in shipped playback. `effects.json` records the 64 effects, event destinations, source hashes, exact individual prompts, trimming, fades and levels. Sampler footstep sources retain material/variation identity and archive/source hashes; their exact pack prompt text was not retained. Private account/project URLs are omitted.

Music uses 44.1 kHz stereo 192 kb/s gapless MP3 loops and PCM16 WAV cues. An 8/16-bar onset/chroma/energy recurrence search selects a passage in each 60-second loop source; a 200 ms linear blend leads into its opening, followed by a 1.25-second copied decoder tail. Constant gain targets -18 LUFS with true-peak headroom, followed by actual encoded-output verification. Effects use mono 22.05 kHz PCM16 WAV, leading-inactivity trimming, short onset/end fades, a 25 ms silent tail and per-role peak/RMS ceilings. Short transients use peak and energy bounds rather than integrated LUFS.

Technical recurrence, waveform and browser checks do not establish subjective musical/foley quality. No subjective listening or physical iPhone listening is claimed. Headroom in prepared files does not prove that full-scale raw generated sources have no audible distortion. Originals/C2PA data are retained locally; prepared derivatives intentionally remove vendor metadata.

Use the normal sound/music and hosted audio fixtures for playback evidence. The local Dev playground defaults to muted audio for repeatable setup, so a passing Dev battle does not validate audio routing or samples. See the [environment-use guide](../../game/docs/05_CODING_WORKFLOW.md#choose-the-development-environment) for scope and stop conditions.

After preparation, run actual-output Python checks and the packed verifier. Image-packing tests apply when their pipeline is affected. Follow [05_CODING_WORKFLOW.md](../../game/docs/05_CODING_WORKFLOW.md) for current core/build and selected sound/music browser gates; a preparation-only tooling edit uses its affected automation checks and does not publish unchanged audio. Browser coverage decodes music/effect assets and checks routing, playback, persistent mute, fallback and bounded resources. See the [scope-based implementation](../../game/docs/plans/2026-11-25-scope-based-testing-and-dev-mode.md) for selected checks and direct Dev scenarios. Technical measurements remain distinct from subjective/physical-device evidence.

The runtime revalidates the ordinary HTTP cache when loading a buffer so same-name replacement files refresh after deployment. Its decoded LRU and coherent offline snapshots still provide cached playback.

## Historical authoring

`history/soundtrack-2026-11-22.json` preserves the previous 25-entry catalog and three retained Suno-track identities. The 17 editable MIDI scores remain in `midi/`; `build_soundtrack.py` retains their deterministic original composition, MIDI reader/writer and instrument renderer. Historical source tests remain active. The old builder refuses to overwrite the replacement catalog.

To audition an edited historical score without touching committed audio:

```powershell
python -I arttools/music/build_soundtrack.py --ffmpeg <ffmpeg.exe> --render-midi arttools/music/midi/m_title.mid work/title-preview.wav
```

`loops.py`, `make_loops.py` and `seam_check.py` preserve the original analysis workflow for reference. They do not supply the shipped replacement soundtrack.
