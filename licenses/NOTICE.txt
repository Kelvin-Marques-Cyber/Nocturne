# Dependências e conteúdos de terceiros

A licença Apache 2.0 em `LICENSE` cobre o código original do Nocturne. As dependências mantêm suas próprias licenças. Consulte os arquivos de licença distribuídos por cada pacote; este índice não substitui seus termos.

| Componente | Uso | Licença / fonte |
| --- | --- | --- |
| React / React DOM | Editor e adaptador de composição | MIT — https://github.com/facebook/react |
| TypeScript | Tipagem e verificação | Apache-2.0 — https://github.com/microsoft/TypeScript |
| Vite | Desenvolvimento e build do editor | MIT — https://github.com/vitejs/vite |
| tsx | Execução local de TypeScript | MIT — https://github.com/privatenumber/tsx |
| Sharp | Rasterização do mesmo SVG usado na prévia | Apache-2.0 — https://github.com/lovell/sharp |
| libvips e bibliotecas nativas do Sharp | Rasterização e processamento de imagem | Licenças próprias; ver distribuição e https://www.libvips.org/ |
| FFmpeg | Decodificação e exportação H.264/AAC | LGPL/GPL conforme a compilação; `ffmpeg -L` e https://ffmpeg.org/legal.html |
| NumPy | Análise numérica | BSD-3-Clause — https://numpy.org/ |
| SciPy | STFT, detecção de ataques e correlação | BSD-3-Clause — https://scipy.org/ |
| faster-whisper, opcional | Transcrição local com tempos por palavra | MIT — https://github.com/SYSTRAN/faster-whisper |
| Remotion, adaptador opcional | Composição e Studio | Licença própria — https://www.remotion.dev/docs/license |
| Noto Sans CJK JP, opcional | Japonês, coreano e chinês no filme | SIL OFL 1.1 — `fonts/LICENSE-NotoCJK.txt`; download Sans2.004 com checksum fixo |
| Mediabunny / @mediabunny/aac-encoder 1.62.1 | MP4 H.264 / AAC no navegador | MPL-2.0; fontes sem alterações nos pacotes npm https://registry.npmjs.org/mediabunny/-/mediabunny-1.62.1.tgz e https://registry.npmjs.org/@mediabunny/aac-encoder/-/aac-encoder-1.62.1.tgz; AAC inclui compilação WASM de FFmpeg/libavcodec e instruções de reconstrução no README do pacote |
| OpenType.js | Contornos tipográficos no render do navegador | MIT — https://github.com/opentypejs/opentype.js |
| DejaVu Sans Mono (regular, bold e oblíqua), Sans (regular e bold) e Serif (regular e bold) | Sete faces tipográficas e métricas do filme, distribuídas offline | Licença DejaVu/Bitstream, incluída em `fonts/LICENSE-DejaVu.txt`; https://dejavu-fonts.github.io/ |

| Latin Modern Sans, Roman, Sans Demi Cond e Mono Light (seis faces) | Tipografia offline com arquivos originais sem alterações | GUST Font License / LPPL 1.3c — `fonts/GUST-FONT-LICENSE.TXT`, `fonts/LPPL-1.3c.tex`, README e manifesto incluídos; distribuição original https://www.gust.org.pl/projects/e-foundry/latin-modern/ |

O renderizador principal usa Sharp e FFmpeg; nenhuma assinatura ou serviço pago é necessário. Remotion tem critérios próprios de uso gratuito e licenciamento empresarial. Não é apresentado aqui como uma dependência integralmente Apache nem como uma licença de código aberto sem restrições.

Gravações, letras e vídeos importados não passam a ser Apache 2.0 por serem usados no editor. O vídeo de referência foi analisado para direção; seus quadros, áudio e marcas não fazem parte dos arquivos públicos do projeto.

| Componente | Uso | Licença / fonte |
| --- | --- | --- |
| ONNX Runtime Web 1.22.0 | Inferência acústica WASM no aparelho | MIT — https://github.com/microsoft/onnxruntime/tree/v1.22.0 |
| Transformers.js 3.8.1 e Whisper Small | Conferência de palavras e transcrição multilíngue, baixadas no primeiro uso | Apache-2.0 / MIT — https://github.com/huggingface/transformers.js e https://github.com/openai/whisper |
| franc-min 6.2.0 e dependências de trigramas | Idiomas candidatos a partir da letra | MIT — https://github.com/wooorm/franc |
| MMS_FA (Meta Research) / conversão ONNX de xycld, revisão 06e6cbfa5c257d23981c922f6406f5def958eb95 | Modelo opcional de alinhamento acústico, baixado separadamente; não incluído no build | CC-BY-NC-4.0, uso não comercial — https://huggingface.co/xycld/lyric-align-mms-fa e https://github.com/facebookresearch/fairseq/tree/main/examples/mms; Pratap et al., Scaling Speech Technology to 1,000+ Languages (2023) |
