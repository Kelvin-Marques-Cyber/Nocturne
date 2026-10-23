#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
# Copyright 2026 Kelvin e Silva Marques
"""Cache the optional CJK font once. No network is used after setup."""
import hashlib, os, pathlib, shutil, urllib.request
ROOT=pathlib.Path(__file__).resolve().parent.parent
DEST=ROOT/'fonts/NotoSansCJKjp-Regular.otf'
URL='https://raw.githubusercontent.com/notofonts/noto-cjk/Sans2.004/Sans/OTF/Japanese/NotoSansCJKjp-Regular.otf'
SHA='68a3fc98800b2a27b371f2fb79991daf3633bd89309d4ffaa6946fd587f375b5'
def valid(path):
    return path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==SHA
if not valid(DEST):
    try:
        data=urllib.request.urlopen(URL,timeout=45).read()
        if hashlib.sha256(data).hexdigest()!=SHA: raise RuntimeError('Checksum da fonte não confere.')
        temporary=DEST.with_suffix('.download');temporary.write_bytes(data);temporary.replace(DEST)
    except Exception as error:
        raise SystemExit('Fonte CJK indisponível. Com internet, execute npm run fonts uma vez; depois o render funciona offline. '+str(error))
PUBLIC=ROOT/'public'/DEST.name
if not valid(PUBLIC):
    try: os.link(DEST,PUBLIC)
    except OSError: shutil.copyfile(DEST,PUBLIC)
print('Noto Sans CJK JP pronta: japonês, coreano e chinês; SHA-256 verificado.')
