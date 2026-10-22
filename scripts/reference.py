#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Kelvin e Silva Marques
"""Technical reference analysis; artistic interpretation is documented separately."""
import argparse,json,re,subprocess
import numpy as np
p=argparse.ArgumentParser();p.add_argument('video');p.add_argument('--out',required=True);a=p.parse_args()
meta=json.loads(subprocess.check_output(['ffprobe','-v','quiet','-show_streams','-show_format','-of','json',a.video]))
v=next(s for s in meta['streams']if s['codec_type']=='video')
process=subprocess.run(['ffmpeg','-hide_banner','-i',a.video,'-vf',"select='gt(scene,0.17)',showinfo",'-an','-f','null','-'],capture_output=True,text=True,check=True)
cuts=[float(t)for t in re.findall(r'pts_time:([\d.]+)',process.stderr)]
raw=subprocess.check_output(['ffmpeg','-v','error','-i',a.video,'-vf','fps=1,scale=96:96','-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
rgb=np.frombuffer(raw,np.uint8).reshape(-1,3).astype(float);r,g,b=rgb.T
duration=float(v.get('duration',meta['format']['duration']));boundaries=np.array([0]+cuts+[duration]);spans=np.diff(boundaries);spans=spans[spans>.12]
result={'duration':duration,'width':v['width'],'height':v['height'],'frameRate':v['avg_frame_rate'],'cutCandidates':cuts,'medianShotSeconds':round(float(np.median(spans)),3)if len(spans)else duration,'palette':{'darkRatio':round(float(np.mean(np.max(rgb,axis=1)<50)),4),'lightRatio':round(float(np.mean(np.min(rgb,axis=1)>160)),4),'redRatio':round(float(np.mean((r>55)&(r>g*1.45)&(r>b*1.25))),4)},'method':'FFprobe + FFmpeg scene difference > 0.17 + 1fps RGB sample','limitations':['Movement and flashes can be detected as cuts.','This describes technical properties; it does not infer narrative meaning.']}
with open(a.out,'w')as f:json.dump(result,f,ensure_ascii=False,indent=2)
print(json.dumps(result))
