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
| DejaVu Sans Mono (regular, bold e oblíqua), Sans Bold e Serif | Cinco faces tipográficas e métricas do filme, distribuídas offline | Licença DejaVu/Bitstream, incluída em `fonts/LICENSE-DejaVu.txt`; https://dejavu-fonts.github.io/ |

O renderizador principal usa Sharp e FFmpeg; nenhuma assinatura ou serviço pago é necessário. Remotion tem critérios próprios de uso gratuito e licenciamento empresarial. Não é apresentado aqui como uma dependência integralmente Apache nem como uma licença de código aberto sem restrições.

Gravações, letras e vídeos importados não passam a ser Apache 2.0 por serem usados no editor. O vídeo de referência foi analisado para direção; seus quadros, áudio e marcas não fazem parte dos arquivos públicos do projeto.
