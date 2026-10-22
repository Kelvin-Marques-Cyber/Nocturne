# Nocturne

**Videoclipes musicais animados, renderizados localmente em MP4.**

![Cenas do motor: constelações, televisão CRT em perspectiva 3D, corredor e negação](docs/cenas.png)

Nocturne transforma áudio, letra e um storyboard JSON em cenas com personagens articulados, palavras físicas, interfaces, câmera e ambientes com perspectiva 3D. O editor usa React e TypeScript; a prévia e a exportação executam o mesmo motor SVG calculado por tempo. Sharp rasteriza os quadros e FFmpeg produz H.264 com áudio AAC.

Esta é uma primeira implementação funcional. O planejamento automático utiliza regras semânticas e metáforas editáveis; não é um modelo generativo capaz de inventar uma direção inédita para qualquer letra. A revisão artística e de sincronização continua importante.

## O que já funciona

- Importação de MP3, WAV e FLAC, edição da letra e importação/exportação de projetos JSON.
- Análise local de ataques, BPM provável, batidas, envelopes de energia, silêncios e mudanças prováveis de seção.
- Alinhamento por âncoras ASR com correspondência monotônica; trechos ausentes recebem interpolação explicitamente sinalizada.
- 17 famílias de cenas: constelação, coração, fuga, decisão, chamada, ocultação, alma, queda, negação, órbita, descanso, terminal, oceano, porta, elevação, televisão CRT e corredor 3D.
- Personagens vetoriais com IK de dois segmentos, ciclo de passada, apoio dos pés, antecipação, respiração e mistura contínua entre ações.
- Andar, correr, tropeçar, cair, ajoelhar, levantar, rastejar, hesitar, reagir, segurar, empurrar, arrastar e descansar.
- Televisão construída com vértices 3D, projeção perspectiva e palavras projetadas na superfície da tela. Chiado, varredura, antenas, botões, volume e movimento de câmera são procedurais.
- Nove transições: corte, obturador, tinta, escurecimento, troca de canal, íris, whip pan, queima e mergulho.
- Editor com monitor, linha do tempo, envelope sonoro, cenas, palavras, câmera, personagem, estilos, desfazer e exportação com progresso.
- MP4 H.264 em 1080 × 1920 ou 1920 × 1080, a 30 ou 60 FPS, com áudio sincronizado.
- Adaptador de composição para Remotion, opcional. O renderizador principal não depende do navegador nem de uma licença paga do Remotion.

## Requisitos

Node.js 22.12 ou superior, Python 3.10 ou superior, FFmpeg e FFprobe disponíveis no PATH. Use um computador para renderizar; a interface é responsiva, mas o servidor e o encoder são processos locais.

Instale FFmpeg com suporte a `libx264` no seu sistema. Em algumas distribuições essa compilação vem de um repositório multimídia. Os testes verificam a exportação real e falham se o encoder estiver ausente.

## Instalação e editor

```bash
git clone https://github.com/Kelvin-Marques-Cyber/Nocturne.git
cd Nocturne
npm ci
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
npm run dev
```

Abra `http://localhost:4173`. Em **Fonte**, importe sua música. Em **Letra**, cole o texto e gere o storyboard. Se não importar uma transcrição ASR, os tempos são estimados e precisam ser corrigidos no sequenciador.

O repositório contém a letra, o storyboard e a análise de “Deus nos vê”, usados na primeira entrega. A gravação pessoal e o vídeo de referência não são redistribuídos no código. Para reproduzir o storyboard original com a música original, copie seu MP3 para o caminho esperado:

```bash
cp "/caminho/Deus nos vê.mp3" public/media/deus-nos-ve.mp3
```

`git clone` baixa o código; `cd` entra na pasta; `npm ci` instala as versões do lockfile; `python3 -m venv` cria um ambiente isolado; `source` ativa esse ambiente; `python -m pip install -r` instala a lista indicada; `npm run dev` inicia o editor. O comando `cp` copia a gravação para o nome utilizado pelo exemplo.

No Windows, ative o ambiente com `.venv\Scripts\Activate.ps1` no PowerShell. Se o servidor usar outro Python, defina a variável `PYTHON` com o executável do ambiente virtual antes de iniciá-lo.

## Gerar um projeto com outra música

Salve a letra em UTF-8, com linhas vazias separando estrofes:

```bash
npm run project -- \
  --audio "/caminho/musica.flac" \
  --lyrics "/caminho/letra.txt" \
  --title "Minha música" \
  --artist "Meu nome" \
  --out projects/minha-musica.json
```

| Parâmetro | Significado |
| --- | --- |
| `--` depois de `npm run project` | Encaminha os argumentos seguintes ao script. |
| `--audio` | Arquivo sonoro original. É copiado para `public/media`. |
| `--lyrics` | Texto autoritativo da letra; a transcrição não o substitui. |
| `--title` / `--artist` | Título e autoria exibidos no filme. |
| `--out` | Caminho do projeto JSON gerado. |
| `--analysis` | Reutiliza uma análise JSON em vez de analisar novamente. |
| `--transcript` | Usa uma transcrição local que contenha tempos por palavra. |
| `--transcribe` | Executa o ASR opcional antes do alinhamento. |
| `--reference` | Analisa tecnicamente um vídeo de referência e anexa os dados ao projeto. |

### Transcrição local opcional

```bash
python -m pip install -r requirements-asr.txt
python scripts/transcribe.py "/caminho/musica.mp3" --out projects/asr.json --model small --language pt
npm run project -- --audio "/caminho/musica.mp3" --lyrics letra.txt --transcript projects/asr.json --out projects/novo.json
```

`--model small` usa o modelo multilíngue pequeno; o primeiro uso baixa os pesos. Depois de armazenados, o processamento é local. `--model /pasta/do/modelo` permite usar pesos já disponíveis sem download. `--language pt` indica português.

O JSON ASR segue `{ "segments": [{ "start": 1, "end": 3, "text": "...", "words": [{ "text": "palavra", "start": 1.2, "end": 1.7, "confidence": 0.9 }] }] }`. Também pode ser importado na aba Letra.

**Alinhamento não é reconhecimento infalível.** No exemplo, 238 de 248 palavras possuem âncoras reconhecidas; dez são interpoladas. Palavras parecidas podem aproveitar tempos reconhecidos com confiança reduzida. O método não é alinhamento fonético forçado. O editor mantém `source` e `confidence` por palavra e oferece ajuste de início e fim.

## Renderizar

Música inteira, vertical, 30 FPS:

```bash
npm run render -- --project projects/deus-nos-ve.json --out output/deus-nos-ve.mp4
```

Horizontal, 60 FPS:

```bash
npm run render -- --project projects/minha-musica.json --format horizontal --fps 60 --out output/minha-musica-horizontal.mp4
```

Um trecho para revisão:

```bash
npm run render -- --project projects/deus-nos-ve.json --from 14 --duration 20 --out output/revisao.mp4
```

| Parâmetro | Significado |
| --- | --- |
| `--project` | Storyboard a executar. |
| `--out` | MP4 de saída; a pasta é criada automaticamente. |
| `--format vertical` | Composição nativa de 1080 × 1920. |
| `--format horizontal` | Composição nativa de 1920 × 1080; posições são recalculadas. |
| `--fps 30` / `--fps 60` | Taxa de quadros. |
| `--from` | Início do trecho, em segundos. |
| `--duration` | Comprimento do trecho; omitido, preserva a duração restante da faixa. |
| `--width` / `--height` | Resolução de teste; números pares até 3840. O formato do projeto ainda define o enquadramento. |
| `--preset` | Preset do x264; `fast` é o padrão, `ultrafast` serve para revisões. |

O áudio é decodificado sem a capa incorporada ao MP3. A duração do exemplo é 200,875828 s de amostras de áudio; pequenas diferenças para a duração de contêiner do MP3 vêm de cabeçalhos e padding. A exportação preserva o áudio decodificado e limita o vídeo à duração correspondente, dentro da grade de frames.

## Usar o editor

1. Importe áudio e letra. O botão Gerar storyboard substitui o planejamento atual; Desfazer recupera o estado anterior da sessão.
2. Clique em uma cena ou na linha do tempo. Use Espaço para reproduzir e setas para avançar ou recuar um quadro; Shift + seta move um segundo.
3. Escolha metáfora, ação, texto visual, transição e câmera no Inspector.
4. Clique em uma palavra e ajuste `in` e `out`. Eventos que referenciam essa palavra acompanham sua alteração.
5. Salve o JSON. O navegador também guarda um rascunho local; o arquivo baixado e sua música são o conjunto portátil do projeto.
6. Exporte toda a faixa, a cena selecionada ou 15 segundos a partir do cursor. O botão Baixar MP4 aparece quando o encoder termina.

Áudios importados, rascunhos, renders e dependências estão no `.gitignore`. O servidor foi construído como ferramenta local, sem contas, autenticação, fila distribuída ou hospedagem multiusuário. Não o exponha como serviço público sem implementar essa camada.

## JSON e módulos

O projeto possui `schemaVersion`, `seed`, `duration`, `audio`, `lyrics`, `analysis`, `words`, `scenes`, `character`, `style` e `alignment`. Todos os tempos são segundos absolutos na faixa original. As cenas cobrem a música sem lacunas nem sobreposições. Referências por `wordId` unem ação e letra.

| Caminho | Responsabilidade |
| --- | --- |
| `src/engine/model.ts` | Contratos JSON, estilos e validação. |
| `src/engine/math.ts` | Interpolação, easing, amostragem, ruído com seed e IK. |
| `src/engine/rig.ts` | Corpo, poses e mistura entre movimentos. |
| `src/engine/frame.ts` | Direção por tempo, cenas SVG, palavras, câmera e efeitos. |
| `src/engine/space3d.ts` | Projeção perspectiva, TV, textos na tela e corredor profundo. |
| `src/engine/alignment.ts` | Correspondência monotônica entre letra e ASR, com interpolação declarada. |
| `src/engine/storyboard.ts` | Metáforas e montagem com planos de durações diferentes. |
| `src/editor` | Interface React. |
| `server/index.ts` | Importação, análise, salvamento e fila local de renderização. |
| `scripts/analyze.py` | Análise espectral do áudio. |
| `scripts/renderer.ts` | Rasterização e codificação por FFmpeg. |
| `src/remotion` | Adaptador opcional para Studio/Remotion. |
| `docs/reference-analysis.md` | Leitura editorial do vídeo de referência. |

Veja [o formato do storyboard](docs/storyboard.md) para criar cenas manualmente ou integrar outro planejador.

## Verificação

```bash
npm test
npm run build
npm run verify -- --project projects/deus-nos-ve.json --video output/deus-nos-ve.mp4
```

Os testes de mídia criam seu próprio som de teste; a gravação pessoal não é necessária para executar a suíte. São verificados IK, continuidade, escolha de cenas e palavras nos limites exatos, reprodução determinística do SVG, preservação da letra, âncoras ASR, rejeição de intervalos inválidos, perspectiva 3D, transições rasterizadas e exportação real H.264/AAC em 30/60 FPS. Um trem de pulsos sintético verifica ataques e BPM conhecido.

`verify` compara formato, resolução, taxa, quantidade de quadros, duração e início das trilhas de áudio/vídeo. Também registra hashes dos SVGs amostrados por cena em `output/verification.json`.

## Remotion opcional

```bash
npm run remotion:studio
```

A composição `Nocturne` lê `public/demo.json`. Ela chama o mesmo `renderFrame(project, frame)` e adiciona o áudio. Para usar outro projeto, substitua esse JSON e mantenha o caminho do áudio dentro de `public/media`.

Remotion possui termos próprios, inclusive regras para organizações maiores. Consulte sua [licença](https://www.remotion.dev/docs/license). O fluxo padrão `npm run render` usa Sharp + FFmpeg e funciona sem Remotion Studio, serviços pagos ou um navegador instalado.

## Limites desta versão

- A análise de voz sem ASR é apenas uma hipótese espectral. Coro, reverb e voz cantada podem reduzir a precisão dos tempos reconhecidos.
- BPM pode ser identificado em metade ou dobro do andamento percebido. Batidas estimadas e ataques detectados são mantidos separadamente.
- A direção automática seleciona uma gramática de cenas implementada, não desenha qualquer objeto livremente descrito em linguagem natural.
- Interações com objetos são encenadas por constraints e poses; não existe um simulador físico completo.
- O 3D é geometria procedural projetada em SVG. Não há importação de modelos GLB, luzes físicas ou um editor 3D de uso geral.
- O mesmo tempo produz a mesma geometria, câmera e ruído. Rasterizadores de navegadores e sistemas podem apresentar diferenças de antialiasing; não se promete igualdade de pixels entre renderizadores diferentes.
- Um vídeo de referência pode ter suas propriedades técnicas extraídas. A análise artística aprofundada da referência desta entrega está documentada; o programa não entende autonomamente qualquer vídeo.

## Licença e autoria

Código original: **Copyright 2026 Kelvin e Silva Marques**, sob a **Apache License, Version 2.0**. Veja [LICENSE](LICENSE), [NOTICE](NOTICE) e [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

A licença do código não transfere os direitos da música, da letra, do vídeo de referência nem das dependências.
