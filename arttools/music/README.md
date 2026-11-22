# Music tools

The game ships 28 tracks/cues: 11 Suno themes (three retained and eight prepared
from already-downloaded pairs), plus 17 original locally composed MIDI pieces.
Normal game builds use committed MP3s and need no Python, synthesizer, Suno login
or music-generation service.

## Editable original music

The authored melodies, harmonies, instruments and rhythm patterns are in
`build_soundtrack.py`. Editable Standard MIDI type-1 scores are retained in
`midi/`. The script renders those on-disk scores with original deterministic
additive/FM/plucked instruments, with no third-party samples or SoundFonts.

Create a Python environment inside ignored `work/` and install the pinned
`requirements-local.txt`. Supply a compatible local ffmpeg binary (the optional
pinned imageio-ffmpeg package can provide one). Run from the repository root:

```powershell
python -I arttools/music/build_soundtrack.py --ffmpeg <ffmpeg.exe> --only-originals
python -I arttools/music/test_soundtrack.py --ffmpeg <ffmpeg.exe>
```

To audition a hand-edited MIDI score as a WAV without replacing committed MP3s:

```powershell
python -I arttools/music/build_soundtrack.py --ffmpeg <ffmpeg.exe> --render-midi arttools/music/midi/m_title.mid work/title-preview.wav
```

The renderer supports the GM programs used by these scores. The local timbres are
original approximations; they do not claim an external General MIDI soundfont.

## Existing Suno sources

The eight new Suno preparations select one take per downloaded town pair and the
Sunken Sluice. No additional generation or downloads occur. Keep the raw files
read-only, outside the published asset tree. The source manifest records exact
local paths and Suno song URLs; on Casey's machine it is in ignored
`work/music/suno-2026-11-22/manifest.json`.

```powershell
python -I arttools/music/build_soundtrack.py --ffmpeg <ffmpeg.exe> --sources <source-manifest.json> --only-suno
```

The preparer compares phrase/seam metrics between the two downloaded takes,
selects a repeating passage, and bakes a 0.4-second linear crossfade plus copied
wrap tail. Original loops also wrap sustained-note/release energy. Every new
MP3 is measured and normalized near -18 LUFS using constant gain to preserve
tail amplitude, with true-peak headroom. Originals use 128 kb/s and the richer
Suno audio uses 192 kb/s, at 44.1 kHz stereo.

`soundtrack.json` records selected sources, source/output/MIDI hashes, exact
loop bounds, measured loudness/peak and decoded seam/tail quality. After any
deliberate rebuild, synchronize `MUSIC` in `game/src/audio.js` and update
only the affected audio entries in `arttools/packed_manifest.json`. Then run
the actual-output Python checks and `cd game; npm run verify`.

Outputs belong in `game/art/mu/`; the game build copies them into dist.
Never copy into or edit generated `game/dist/` by hand.

## Legacy analysis tools

`loops.py`, `make_loops.py` and `seam_check.py` retain the original
librosa-based workflow for the first three tracks. They are not run by the new
pipeline; those original MP3s and loop points remain unchanged.
