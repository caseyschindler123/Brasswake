# Music tools

Turn a Suno MP3 into a seamless game loop.

1. Put raw files in a work folder as raw/<name>.mp3 (name = town or dungeon key, e.g. tallyport, bilge, combat).
2. `python3 -I loops.py raw/a.mp3 raw/b.mp3 ...` finds a loop start and end (beat-matched, chroma + MFCC) and writes loops.json.
3. `python3 -I seam_check.py` (edit its `src` map) compares onset envelopes at the seam and prints a shift in ms. Add that shift to loop_end in loops.json. The waveform refine in make_loops.py is disabled because it pulled the seam off the beat.
4. `mkdir -p out && python3 -I make_loops.py` bakes a 0.3 s crossfade before the loop end, appends 1 s copied from the loop start, normalises to -18 LUFS and writes out/m_<name>.mp3 plus out/meta.json (a, b in seconds).
5. Copy out/m_<name>.mp3 to game/dist/art/mu/ and add { a, b } to MUSIC in src/audio.js, then map it in TOWN_MU / DUN_MU.

Needs: pip install librosa --break-system-packages, ffmpeg.
