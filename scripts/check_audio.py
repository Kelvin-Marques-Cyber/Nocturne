#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Kelvin e Silva Marques
"""Compare decoded audio content, not just container start timestamps."""
import argparse,json,subprocess
import numpy as np
from scipy.signal import correlate
p=argparse.ArgumentParser();p.add_argument('original');p.add_argument('rendered');a=p.parse_args()
def decode(path):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',path,'-vn','-ac','1','-ar','8000','-f','f32le','pipe:1'])
    return np.frombuffer(raw,np.float32)
original,rendered=decode(a.original),decode(a.rendered)
length=min(len(original),len(rendered));window=min(24000,length);checks=[]
for fraction in [.08,.42,.85]:
    start=int((length-window)*fraction);x=original[start:start+window];y=rendered[start:start+window]
    x=x-np.mean(x);y=y-np.mean(y);norm=float(np.sqrt(np.dot(x,x)*np.dot(y,y)))
    if norm<1e-10:
        lag=0;score=1.0 if np.max(np.abs(x-y))<.001 else 0.0
    else:
        corr=correlate(y,x,mode='full',method='fft');mid=len(x)-1;search=min(160,mid);lag=int(np.argmax(corr[mid-search:mid+search+1])-search);score=float(corr[mid+lag]/norm)
    checks.append({'atSeconds':round(start/8000,3),'lagMilliseconds':lag/8,'correlation':round(score,6)})
passed=all(abs(c['lagMilliseconds'])<=20 and c['correlation']>.96 for c in checks)
print(json.dumps({'passed':passed,'sampleRate':8000,'checks':checks}))
raise SystemExit(0 if passed else 1)
