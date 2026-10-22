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
| DejaVu Sans Mono | Tipografia do filme | Licença própria, incluída em `fonts/LICENSE-DejaVu.txt` |

O renderizador principal usa Sharp e FFmpeg; nenhuma assinatura ou serviço pago é necessário. Remotion tem critérios próprios de uso gratuito e licenciamento empresarial. Não é apresentado aqui como uma dependência integralmente Apache nem como uma licença de código aberto sem restrições.

Gravações, letras e vídeos importados não passam a ser Apache 2.0 por serem usados no editor. O vídeo de referência foi analisado para direção; seus quadros, áudio e marcas não fazem parte dos arquivos públicos do projeto.
