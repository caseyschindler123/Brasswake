"""Bounded soundtrack regressions; --ffmpeg also checks every actual MP3.

  python -I arttools/music/test_soundtrack.py
  python -I arttools/music/test_soundtrack.py --ffmpeg /path/to/ffmpeg.exe

The latter decodes files afresh and measures EBU loudness/true peaks. It does
not trust the catalog's stored measurements as a substitute for verification.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('soundtrack',HERE/'build_soundtrack.py')
music=importlib.util.module_from_spec(spec); spec.loader.exec_module(music)
FFMPEG=None


class CompositionTests(unittest.TestCase):
    def test_written_phrases_have_complete_bars_and_distinct_scores(self):
        signatures=set()
        for score in music.SCORES:
            for phrase in [score['A'],score['B']]:
                self.assertEqual(len(phrase),4)
                for bar in phrase: self.assertEqual(sum(d for _,d in bar),score['meter'])
            self.assertNotEqual(score['A'],score['B'])
            notes,beats,_=music.compose(score)
            seconds=beats*60/score['bpm']
            self.assertGreaterEqual(seconds,35)
            self.assertLessEqual(seconds,75)
            signatures.add(repr((score['tonic'],score['mode'],score['A'],score['B'])))
            self.assertGreaterEqual(len(set(n[4] for n in notes)),4)
        self.assertEqual(len(signatures),15)

    def test_standard_midi_is_reproducible_and_round_trips_notes(self):
        score=music.SCORES[0]; notes,beats,_=music.compose(score)
        work=music.ROOT/'work'/'soundtrack-tests'
        work.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=work) as folder:
            a=Path(folder)/'a.mid'; b=Path(folder)/'b.mid'
            for path in [a,b]: music.write_midi(path,notes,score['bpm'],beats,score['title'])
            self.assertEqual(a.read_bytes(),b.read_bytes())
            self.assertEqual(a.read_bytes()[:4],b'MThd')
            decoded,bpm,length=music.read_midi(a)
            self.assertEqual(len(decoded),len(notes))
            self.assertEqual(length,beats)
            self.assertAlmostEqual(bpm,score['bpm'],places=4)
            self.assertEqual(sorted(n[2] for n in decoded),sorted(n[2] for n in notes))

    def test_releases_and_reflections_wrap_instead_of_being_cut(self):
        # A harp note begins shortly before the seam. Its ringing release must
        # continue at time zero and match the explicit post-loop safety tail.
        notes=[(3.75,.15,69,90,'harp',-.3)]
        rendered,period=music.render(notes,60,4,True,sr=8000)
        n=round(period*8000)
        self.assertGreater(float(np.max(np.abs(rendered[:800]))),.001)
        np.testing.assert_array_equal(rendered[n:],rendered[:len(rendered)-n])
        # At 8 kHz an ordinary 440 Hz sample step can exceed .025. Compare
        # the seam to the same ringing note's neighboring natural derivatives.
        seam=float(np.max(np.abs(rendered[n-1]-rendered[0])))
        neighbors=np.concatenate([rendered[:80],rendered[n-80:n]])
        self.assertLessEqual(seam,float(np.max(np.abs(np.diff(neighbors,axis=0))))+.0001)
        self.assertTrue(np.isfinite(rendered).all())
        self.assertLess(float(np.max(np.abs(rendered))),1)
        np.testing.assert_array_equal(rendered,music.render(notes,60,4,True,sr=8000)[0])

    def test_all_instruments_are_finite_and_release_to_silence(self):
        for name in music.INSTRUMENTS:
            y=music.voice(60,.3,name,90,sr=8000)
            self.assertTrue(np.isfinite(y).all(),name)
            self.assertLess(np.max(np.abs(y)),1,name)
            self.assertLess(np.max(np.abs(y[-8:])),.002,name)


class AssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog=json.loads((HERE/'soundtrack.json').read_text())

    def test_complete_inventory_provenance_and_hashes(self):
        tracks=self.catalog['tracks']
        self.assertEqual(len(tracks),25)
        self.assertEqual(self.catalog['retained'],['m_tallyport','m_bilge','m_combat'])
        original=0; source=0
        for ident,entry in tracks.items():
            path=music.ROOT/entry['path']
            self.assertEqual(path.name,ident+'.mp3')
            self.assertEqual(entry['sha256'],hashlib.sha256(path.read_bytes()).hexdigest())
            self.assertEqual(path.stat().st_size,entry['bytes'])
            self.assertEqual(entry['v'],1)
            self.assertEqual(entry['a'],0)
            self.assertEqual(entry['sampleRate'],44100)
            self.assertEqual(entry['channels'],2)
            self.assertEqual(entry['loop'],ident not in ('m_victory','m_death'))
            if entry['loop']:
                self.assertGreaterEqual(entry['b'],35)
                self.assertLessEqual(entry['b'],75)
                self.assertGreaterEqual(entry['duration']-entry['b'],1)
            else:
                self.assertEqual(entry['b'],entry['duration'])
                self.assertGreater(entry['duration'],3)
                self.assertLess(entry['duration'],16)
            origin=entry['origin']
            if origin['kind']=='original-midi':
                original+=1
                midi=music.ROOT/entry['midi']
                self.assertEqual(midi.read_bytes()[:4],b'MThd')
                self.assertEqual(hashlib.sha256(midi.read_bytes()).hexdigest(),origin['midiSHA256'])
                self.assertNotIn('game/art',entry['midi'])
            else:
                source+=1
                self.assertTrue(origin['songURL'].startswith('https://suno.com/song/'))
                self.assertEqual(len(origin['sourceSHA256']),64)
                self.assertEqual(len(origin['candidates']),2)
        self.assertEqual((original,source),(17,8))

    def test_actual_mp3_levels_lengths_and_loop_tails(self):
        if not FFMPEG: self.skipTest('Pass --ffmpeg for actual MP3 decode and level checks')
        for ident,entry in self.catalog['tracks'].items():
            with self.subTest(track=ident):
                path=music.ROOT/entry['path']
                y=music.decode(FFMPEG,path)
                self.assertTrue(np.isfinite(y).all())
                self.assertAlmostEqual(len(y)/music.SR,entry['duration'],places=5)
                stats=music.loudness(FFMPEG,path)
                self.assertLess(abs(float(stats['input_i'])+18),.8)
                self.assertLess(float(stats['input_tp']),-1.5)
                self.assertLess(np.max(np.abs(y)),10**(-1.5/20))
                if entry['loop']:
                    q=music.seam_stats(y,entry['b'])
                    self.assertGreaterEqual(q['tailSeconds'],1)
                    self.assertLess(q['wrapTailRMSDifference'],.006)
                    self.assertLess(q['seamJump'],max(.02,q['localDerivativeP999']*3))
                else:
                    self.assertLess(np.max(np.abs(y[-1000:])),.002)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg')
    args,rest=parser.parse_known_args()
    FFMPEG=args.ffmpeg
    unittest.main(argv=[__file__,*rest])
