import json, numpy as np, librosa
meta = json.load(open('out/meta.json'))
src = {'tallyport':'raw/tallyport.mp3','bilge':'raw/bilge.mp3','combat':'raw/combat.mp3'}
for k,m in meta.items():
    y, sr = librosa.load(src[k], sr=22050, mono=True)
    hop=64
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    fps = sr/hop
    a=m['a']; b=m['b']
    W=int(4*fps)
    ia=int(a*fps)
    # compare envelope around a (2 s before, 2 s after) with around b+lag
    ref=env[ia-W//2:ia+W//2]
    res=[]
    for lag in range(-int(0.1*fps), int(0.1*fps)+1):
        ib=int(b*fps)+lag
        seg=env[ib-W//2:ib+W//2]
        c=np.corrcoef(ref,seg)[0,1]
        res.append((c,lag/fps))
    best=max(res)
    zero=[r for r in res if abs(r[1])<1e-9][0]
    print(k,'corr at current',round(zero[0],3),'best',round(best[0],3),'shift ms',round(best[1]*1000,1))
