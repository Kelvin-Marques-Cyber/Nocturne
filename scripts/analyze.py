#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Kelvin e Silva Marques
"""Offline spectral analysis. Vocal regions here are hypotheses, replaced by ASR when available."""
import argparse,json,subprocess
import numpy as np
from scipy.signal import stft,find_peaks,correlate

def analyze(path):
    sr=22050
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vn','-ac','1','-ar',str(sr),'-f','f32le','pipe:1'])
    y=np.frombuffer(raw,dtype=np.float32)
    if not len(y):raise ValueError('Empty audio')
    duration=len(y)/sr
    _,times,z=stft(y,fs=sr,nperseg=2048,noverlap=1536,boundary='zeros')
    spec=np.abs(z);hop=512/sr
    power=np.sqrt(np.mean(spec**2,axis=0))
    norm=lambda a:np.clip(a/max(float(np.percentile(a,98)),1e-9),0,1)
    rms=norm(power)
    flux=np.maximum(np.diff(np.log1p(spec*400),axis=1),0).mean(axis=0)
    flux=np.r_[0,flux];flux=norm(flux)
    onset_ix,_=find_peaks(flux,prominence=.075,distance=int(.12/hop))
    strong=onset_ix[flux[onset_ix]>max(.25,float(np.percentile(flux,77)))]
    centered=flux-np.mean(flux)
    ac=correlate(centered,centered,mode='full',method='fft')[len(flux)-1:]
    lags=np.arange(max(1,int(60/185/hop)),int(60/58/hop))
    prior=np.exp(-.5*(np.log2((60/(lags*hop))/112)/.8)**2)
    scores=ac[lags]*prior
    lag=int(lags[np.argmax(scores)])
    left,center,right=ac[lag-1:lag+2]
    denominator=left-2*center+right
    refined=lag+float(np.clip(.5*(left-right)/denominator,-.5,.5)) if abs(denominator)>1e-10 else float(lag)
    bpm=60/(refined*hop)
    phases=np.linspace(0,60/bpm,100,endpoint=False)
    phase_scores=[float(np.interp(np.arange(x,duration,60/bpm)/hop,np.arange(len(flux)),flux).sum()) for x in phases]
    phase=float(phases[int(np.argmax(phase_scores))])
    grid=np.arange(phase,duration,60/bpm)
    onset_times=times[onset_ix]
    beats=[]
    for b in grid:
        nearby=onset_ix[np.abs(times[onset_ix]-b)<.09]
        chosen=float(times[nearby[np.argmax(flux[nearby])]]) if len(nearby) else float(b)
        if not beats or chosen-beats[-1]>.18:beats.append(round(min(chosen,duration),4))
    silence=power<max(float(np.max(power))*.003,1e-8)
    def regions(mask,min_length):
        edges=np.diff(np.r_[False,mask,False].astype(int))
        return [{'start':round(float(a*hop),3),'end':round(min(duration,float(b*hop)),3)} for a,b in zip(np.where(edges==1)[0],np.where(edges==-1)[0]) if (b-a)*hop>=min_length]
    freqs=np.fft.rfftfreq(2048,1/sr)
    low=norm(np.sqrt(np.mean(spec[(freqs>35)&(freqs<190)]**2,axis=0)))
    high=norm(np.sqrt(np.mean(spec[(freqs>2800)&(freqs<8500)]**2,axis=0)))
    mid=np.sqrt(np.mean(spec[(freqs>240)&(freqs<3300)]**2,axis=0))
    vocal=(norm(mid)>.23)&(rms>.12)
    vocal_regions=[dict(r,confidence=.35) for r in regions(vocal,.45)]
    # Low-rate envelopes keep JSON and UI light. Full resolution is used for onset detection.
    step=max(1,round(.05/hop))
    # Voice-band contour and periodicity share the exported envelope clock.
    # This is a mixed-track estimate, never source separation or a shout model.
    band=(freqs>=120)&(freqs<3500)
    band_power=np.sum(spec[band]**2,axis=0)
    presence=np.clip(band_power/np.maximum(np.sum(spec**2,axis=0),1e-12),0,1)[::step]
    voice_energy=norm(np.sqrt(band_power))[::step]
    autocorr=np.fft.irfft(spec[:,::step]**2,n=2048,axis=0)
    zero=np.maximum(autocorr[0],1e-12)
    first,last=int(np.ceil(sr/700)),min(1023,int(sr/75))
    candidates=autocorr[first:last]/zero
    local=(autocorr[first:last]>autocorr[first-1:last-1])&(autocorr[first:last]>=autocorr[first+1:last+1])&(candidates>.36)
    scores=np.where(local,candidates*(1-np.arange(first,last)[:,None]/2048*.45),0)
    lags=np.argmax(scores,axis=0)+first
    cols=np.arange(len(lags));best=scores[lags-first,cols]
    den=autocorr[lags-1,cols]-2*autocorr[lags,cols]+autocorr[lags+1,cols]
    refined=lags+np.clip(.5*(autocorr[lags-1,cols]-autocorr[lags+1,cols])/np.where(np.abs(den)>1e-12,den,1),-.5,.5)
    pitch=np.where((best>0)&(presence>.18),sr/refined,0)
    confidence=np.where(best>0,np.clip(autocorr[lags,cols]/zero,0,1)*np.clip(presence*1.5,0,1),0)
    voice=dict(source='mix',method='120–3500 Hz energy + spectral autocorrelation; mixed-track estimate',energy=np.round(voice_energy,4).tolist(),presence=np.round(presence,4).tolist(),pitch=np.round(pitch,2).tolist(),confidence=np.round(confidence,4).tolist())
    bands=np.array([np.mean(spec[(freqs>=a)&(freqs<b)],axis=0) for a,b in [(30,200),(200,600),(600,2000),(2000,6000),(6000,11000)]])
    window=max(1,round(2/hop))
    sm=np.array([np.convolve(row,np.ones(window)/window,mode='same') for row in bands])
    novelty=np.linalg.norm(np.diff(sm,axis=1),axis=0)
    sec_ix,_=find_peaks(novelty,distance=int(7/hop),prominence=max(np.std(novelty)*1.1,1e-9))
    boundaries=[0]+[round(float(times[i]),3) for i in sec_ix if 5<times[i]<duration-5]+[round(duration,6)]
    sections=[{'start':a,'end':b,'energy':round(float(np.mean(rms[int(a/hop):max(int(b/hop),int(a/hop)+1)])),3)} for a,b in zip(boundaries,boundaries[1:])]
    return dict(duration=round(duration,6),sampleRate=sr,hopSeconds=round(hop*step,8),bpm=round(bpm,2),tempoConfidence=round(float(np.clip(ac[lag]/max(ac[0],1e-8),0,1)),3),beats=beats,onsets=[round(float(times[i]),4) for i in onset_ix],impacts=[round(float(times[i]),4) for i in strong],energy=np.round(rms[::step],3).tolist(),low=np.round(low[::step],3).tolist(),high=np.round(high[::step],3).tolist(),voice=voice,silences=regions(silence,.25),vocalRegions=vocal_regions,sections=sections,method='spectral-flux + autocorrelation + spectral novelty (numpy/scipy)',warnings=['BPM may have half/double-tempo ambiguity.','Vocal regions are spectral hypotheses until an ASR transcript is imported.','Vocal delivery/pitch are mixed-track estimates; instruments can interfere.'])

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('audio');p.add_argument('--out',required=True);a=p.parse_args()
    result=analyze(a.audio)
    with open(a.out,'w')as f:json.dump(result,f,ensure_ascii=False,separators=(',',':'))
    print(json.dumps({'duration':result['duration'],'bpm':result['bpm'],'beats':len(result['beats']),'sections':len(result['sections'])}))
