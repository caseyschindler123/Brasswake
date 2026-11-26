"""Bounded soundtrack regressions; --ffmpeg also checks every actual audio.

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
from unittest.mock import patch

import numpy as np

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('soundtrack',HERE/'build_soundtrack.py')
music=importlib.util.module_from_spec(spec); spec.loader.exec_module(music)
FFMPEG=None
prep_spec=importlib.util.spec_from_file_location('stable_preparation',HERE/'prepare_stable_audio.py')
preparation=importlib.util.module_from_spec(prep_spec); prep_spec.loader.exec_module(preparation)


class SamplerSourceTests(unittest.TestCase):
    def source(self):
        return dict(id='s_door_open',file='pack02/raw/CONTENT_05.mp3',hook='door:open',
                    kind='stable-audio-sampler',model='Stable Audio 3',sha256='a'*64,
                    prompt='Solo wooden door opening, short hinge creak and latch release',seconds=2,
                    packArchiveSHA256='b'*64,packPrompt='Isolated foley for a fantasy role-playing video game',pad=5)

    def test_named_sampler_roles_preserve_exact_source_and_pack_provenance(self):
        source=self.source()
        rows=preparation.effect_sources(Path('sources'),dict(date='2026-11-25',effects=[source],packs=[]))
        self.assertEqual(len(rows),1)
        ident,path,hook,origin=rows[0]
        self.assertEqual((ident,path,hook),('s_door_open',Path('sources/pack02/raw/CONTENT_05.mp3'),'door:open'))
        self.assertEqual(origin['prompt'],source['prompt'])
        self.assertEqual(origin['packPrompt'],source['packPrompt'])
        self.assertEqual(origin['packArchiveSHA256'],source['packArchiveSHA256'])
        self.assertEqual(origin['sourceSHA256'],source['sha256'])
        self.assertEqual((origin['pad'],origin['sourceDate']),(5,'2026-11-25'))
        self.assertEqual(origin['kind'],'stable-audio-sampler')

    def test_incomplete_sampler_provenance_is_rejected(self):
        for key,value in [('packArchiveSHA256',''),('packPrompt',''),('pad',0),('pad',9),('pad',1.5)]:
            with self.subTest(field=key,value=value):
                source={**self.source(),key:value}
                with self.assertRaisesRegex(ValueError,'Sampler sources require'):
                    preparation.effect_sources(Path('sources'),dict(effects=[source]))

    def test_duplicate_effect_roles_are_rejected(self):
        source=self.source()
        with self.assertRaisesRegex(ValueError,'roles must be unique'):
            preparation.effect_sources(Path('sources'),dict(effects=[source,source]))


class CompositionTests(unittest.TestCase):
    def test_invalid_top_score_cannot_hide_a_qualifying_phrase(self):
        # Slagdeep's first source has a valid phrase whose blended ranking is
        # slightly below an interval that fails the unchanged recurrence bound.
        invalid=dict(phraseSimilarity=.7914687149617096,energyLogMismatch=.18433082002951867,score=.7697703242301941)
        valid=dict(phraseSimilarity=.8304840616742543,energyLogMismatch=.3889861254686435,score=.7619056)
        self.assertIs(preparation.choose_loop_candidate([invalid,valid]),valid)
        self.assertIs(preparation.choose_loop_candidate([valid,invalid]),valid)

    def test_loop_candidate_ranking_never_waives_either_join_bound(self):
        candidates=[dict(phraseSimilarity=.799,energyLogMismatch=.1,score=.99),
                    dict(phraseSimilarity=.99,energyLogMismatch=.501,score=.99)]
        self.assertIsNone(preparation.choose_loop_candidate(candidates))

    def test_triple_metre_loop_preserves_complete_sixteen_bar_phrases(self):
        sr=11025
        t=np.arange(sr*60,dtype=np.float64)/sr
        beat=t*76/60
        notes=np.array([0,4,7,2,5,9,4,7,11,0,5,9,2,7,11,0])
        frequency=220*2**(notes[(beat//3).astype(int)%16]/12)
        tone=(np.sin(np.cumsum(2*np.pi*frequency/sr))*(.3+.7*np.exp(-5*(beat%1)))).astype(np.float32)
        with patch.object(preparation.audio,'decode',return_value=np.column_stack([tone,tone])):
            result=preparation.select_loop(None,Path('triple-metre-fixture.wav'),76,3)
        self.assertEqual(result['meter'],'3/4')
        self.assertEqual(result['periodBars'],16)
        self.assertAlmostEqual((result['endSeconds']-result['startSeconds'])*result['estimatedBPM']/60,48)
        self.assertGreaterEqual(result['phraseSimilarity'],.80)

    def test_legacy_builder_cannot_overwrite_the_replacement_catalog(self):
        with self.assertRaisesRegex(ValueError,'Historical renderer cannot overwrite'):
            music.build(None)

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
        self.assertEqual(len(tracks),28)
        self.assertEqual({(music.ROOT/e['path']).name for e in tracks.values()}, {p.name for p in (music.ROOT/'game/art/mu').iterdir() if p.is_file()})
        self.assertEqual(self.catalog['retained'],[])
        for ident,entry in tracks.items():
            path=music.ROOT/entry['path']
            self.assertEqual(path.name,ident+('.mp3' if entry['loop'] else '.wav'))
            self.assertEqual(entry['sha256'],hashlib.sha256(path.read_bytes()).hexdigest())
            self.assertEqual(path.stat().st_size,entry['bytes'])
            self.assertEqual(entry['v'],1)
            self.assertEqual(entry['a'],0)
            self.assertEqual(entry['sampleRate'],44100)
            self.assertEqual(entry['channels'],2)
            self.assertEqual(entry['loop'],ident not in ('m_victory','m_death'))
            if entry['loop']:
                self.assertGreaterEqual(entry['b'],24)
                self.assertLessEqual(entry['b'],55)
                self.assertGreaterEqual(entry['duration']-entry['b'],1)
            else:
                self.assertEqual(entry['b'],entry['duration'])
                sr,pcm=music.wavfile.read(path)
                self.assertEqual(sr,music.SR)
                self.assertEqual(pcm.dtype,np.dtype('int16'))
                self.assertEqual(pcm.shape[1],2)
                self.assertLessEqual(abs(len(pcm)/sr-entry['duration']),1/sr)
                self.assertGreater(entry['duration'],3)
                self.assertLess(entry['duration'],16)
            origin=entry['origin']
            self.assertEqual(origin['kind'],'stable-audio')
            self.assertEqual(origin['model'],'Stable Audio 3 (UI default)')
            self.assertEqual(len(origin['sourceSHA256']),64)
            self.assertRegex(origin['prompt'],r'video game|fantasy role-playing game')
            self.assertEqual(origin['take'],1)
            self.assertEqual(origin['requestedSeconds'],60 if entry['loop'] else 6 if ident=='m_victory' else 9)
            if entry['loop']:
                selection=origin['selection']
                self.assertIn(selection['periodBars'],(8,16))
                self.assertAlmostEqual(entry['b'],selection['endSeconds']-selection['startSeconds'],places=4)
                self.assertGreaterEqual(selection['phraseSimilarity'],.80)
                self.assertLessEqual(selection['energyLogMismatch'],.5)
                self.assertLessEqual(abs(selection['estimatedBPM']/selection['requestedBPM']-1),.13)
        self.assertEqual(len({e['origin']['sourceSHA256'] for e in tracks.values()}),28)
        # Historical scores remain editable and auditable without supplying the
        # replacement game's soundtrack or overwriting the new catalog.
        history=json.loads((HERE/'history/soundtrack-2026-11-22.json').read_text())
        old_midis=[e for e in history['tracks'].values() if 'midi' in e]
        self.assertEqual(len(old_midis),17)
        for entry in old_midis:
            self.assertEqual(hashlib.sha256((music.ROOT/entry['midi']).read_bytes()).hexdigest(),entry['origin']['midiSHA256'])

    def test_loop_metadata_preserves_complete_phrases_in_the_requested_metre(self):
        for ident,entry in self.catalog['tracks'].items():
            if not entry['loop']: continue
            with self.subTest(track=ident):
                selection=entry['origin']['selection']
                self.assertIn(selection['meter'],('3/4','4/4'))
                beats_per_bar=int(selection['meter'].split('/')[0])
                expected=selection['periodBars']*beats_per_bar*60/selection['estimatedBPM']
                self.assertAlmostEqual(entry['b'],expected,places=4)
        tallyport=self.catalog['tracks']['m_tallyport']['origin']['selection']
        self.assertEqual((tallyport['meter'],tallyport['requestedBPM']),('3/4',76))

    def test_actual_audio_levels_lengths_and_loop_tails(self):
        if not FFMPEG: self.skipTest('Pass --ffmpeg for actual audio decode and level checks')
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


class EffectAssetTests(unittest.TestCase):
    def test_complete_effect_inventory_and_actual_pcm(self):
        catalog=json.loads((HERE/'effects.json').read_text())
        effects=catalog['effects']
        self.assertEqual(len(effects),72)
        self.assertEqual({(music.ROOT/e['path']).name for e in effects.values()}, {p.name for p in (music.ROOT/'game/art/fx').iterdir() if p.is_file()})
        self.assertEqual(len({e['sha256'] for e in effects.values()}),72)
        self.assertEqual(len({e['origin']['sourceSHA256'] for e in effects.values()}),72)
        sampler_pads=set()
        for ident,entry in effects.items():
            with self.subTest(effect=ident):
                path=music.ROOT/entry['path']
                self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),entry['sha256'])
                self.assertEqual(path.stat().st_size,entry['bytes'])
                sr,pcm=music.wavfile.read(path)
                self.assertEqual(sr,22050)
                self.assertEqual(pcm.ndim,1)
                self.assertEqual(pcm.dtype,np.dtype('int16'))
                self.assertLess(abs(len(pcm)/sr-entry['duration']),1/sr)
                self.assertGreater(entry['duration'],.03)
                self.assertLess(entry['duration'],4.1)
                y=pcm.astype(np.float64)/32768
                peak=float(np.max(np.abs(y)))
                self.assertGreater(peak,.001)
                self.assertLess(peak,10**((entry['preparation']['peakCeilingDBFS']+.02)/20))
                self.assertLess(float(np.sqrt(np.mean(y*y))),10**((entry['preparation']['peakCeilingDBFS']-6.9)/20))
                self.assertLess(np.max(np.abs(y[-round(.02*sr):])),.0001)
                activity=np.flatnonzero(np.abs(y)>peak*.01)
                self.assertLess(activity[0]/sr,.15 if ident.startswith('s_ambient_') else .06)
                self.assertEqual(len(entry['origin']['sourceSHA256']),64)
                origin=entry['origin']
                self.assertIn(origin['kind'],('stable-audio','stable-audio-sampler','cc0-foley'))
                if origin['kind']=='cc0-foley':
                    self.assertTrue(ident.startswith('s_step_'))
                    self.assertEqual(origin['license'],'CC0-1.0')
                    sand=ident.startswith('s_step_sand_')
                    self.assertEqual(origin['provider'],'Fantozzi' if sand else 'Kenney')
                    self.assertEqual(origin['sourceURL'],'https://opengameart.org/content/fantozzis-footsteps-grasssand-stone' if sand else 'https://kenney.nl/assets/impact-sounds')
                    self.assertEqual(origin['packArchiveSHA256'],'415d360e0911c1c1c5355ee94023b772e6f4044f59b9b580610e7dbffd1840fd' if sand else '029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8')
                    self.assertTrue(origin['sourceFile'].endswith('.flac' if sand else '.ogg'))
                    self.assertLess(entry['duration'],60/180 if sand else .24)
                    self.assertLess(peak,10**(-17.9/20))
                    # A footfall must finish before the next running contact;
                    # room noise or a second step cannot stretch the event.
                    frame=round((.24 if sand else .18 if ident.startswith('s_step_snow_') else .12)*sr)
                    self.assertGreater(np.sum(y[:frame]**2)/np.sum(y*y),.85)
                elif origin['kind']=='stable-audio-sampler':
                    self.assertTrue(origin['prompt'])
                    self.assertEqual(len(origin['packArchiveSHA256']),64)
                    self.assertEqual(origin['model'],'Stable Audio 3')
                    self.assertIn(origin['pad'],range(1,9))
                    pad=(origin['packArchiveSHA256'],origin['pad'])
                    self.assertNotIn(pad,sampler_pads)
                    sampler_pads.add(pad)
                    self.assertIn('fantasy role-playing video game',origin['packPrompt'])
                else:
                    self.assertIn('video game',origin['prompt'])
        self.assertEqual(sum(e['origin']['kind']=='cc0-foley' for e in effects.values()),20)
        self.assertEqual(sum(e['bytes'] for e in effects.values()) < 5*1024*1024,True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ffmpeg')
    args,rest=parser.parse_known_args()
    FFMPEG=args.ffmpeg
    unittest.main(argv=[__file__,*rest])
