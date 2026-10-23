#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Kelvin e Silva Marques
"""Optional ASR. Model is downloaded once, or use --model /local/model for offline work."""
import argparse,json,subprocess,numpy as np
from faster_whisper import WhisperModel
p=argparse.ArgumentParser();p.add_argument('audio');p.add_argument('--out',required=True);p.add_argument('--model',default='small');p.add_argument('--language',default='auto');a=p.parse_args()
m=WhisperModel(a.model,device='cpu',compute_type='int8',cpu_threads=4)
audio=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',a.audio,'-vn','-ac','1','-ar','16000','-f','f32le','pipe:1']),dtype=np.float32)
segments,info=m.transcribe(audio,language=None if a.language=='auto' else a.language,word_timestamps=True,vad_filter=False,condition_on_previous_text=False,beam_size=5)
out=[]
for s in segments:
    out.append({'start':s.start,'end':s.end,'text':s.text.strip(),'words':[{'text':w.word.strip(),'start':w.start,'end':w.end,'confidence':w.probability} for w in (s.words or [])]})
    print(round(s.start,2),s.text,flush=True)
with open(a.out,'w')as f:json.dump({'language':info.language,'method':'faster-whisper-'+a.model,'reviewRequired':True,'segments':out},f,ensure_ascii=False,indent=2)
