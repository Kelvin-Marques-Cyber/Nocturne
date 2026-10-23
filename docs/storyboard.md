# Contrato do storyboard

`Project` em `src/engine/model.ts` é o contrato tipado e `validateProject` valida os limites fundamentais antes de salvar ou renderizar. Valores de tempo usam segundos absolutos. A música é o relógio; animações não dependem de eventos anteriores, frames já renderizados ou `Math.random`.

## Uma cena

Exemplo de cena para incluir em um projeto completo:

```json
{
  "id": "s4",
  "start": 20,
  "end": 26,
  "kind": "television",
  "title": "Canal interior",
  "intent": "A voz atravessa o chiado e alcança o personagem.",
  "code": "await voz.chamar(eu);",
  "wordIds": ["w19", "w20", "w21"],
  "accent": "SUA VOZ",
  "variant": 2,
  "camera": {
    "zoomFrom": 1,
    "zoomTo": 1.08,
    "panX": -15,
    "panY": 0,
    "roll": -2,
    "shake": 0.35
  },
  "motions": [{"action": "hesitate", "start": 20, "end": 26}],
  "events": [{"at": 23.1, "duration": 0.25, "type": "impact", "strength": 0.7, "wordId": "w20"}],
  "transition": "channel"
}
```

`kind` escolhe a implementação narrativa. `intent` é a intenção legível do diretor; alterá-la não gera uma nova geometria automaticamente. `accent` personaliza o objeto tipográfico principal quando a cena o utiliza. Na TV, o conteúdo é a letra sincronizada dentro da tela. `code` aparece no ambiente e no rodapé do filme.

`camera.panX` e `panY` são deslocamentos nas unidades do quadro de referência, escaladas pelo lado menor. `roll` usa graus; os fatores de zoom são multiplicadores. `shake` controla a reação a ataques musicais e eventos sem introduzir movimento independente do som.

`motions` mistura a pose anterior na entrada da próxima ação. A queda e o retorno podem ser descritos com vários clips no mesmo plano. `events` oferece impactos, glitch, pausa corporal, exposição e marcação de palavra. Quando um evento possui `wordId`, o editor move seu tempo junto com a palavra ajustada.

## Palavras

```json
{"id":"w20","text":"voz","start":23.1,"end":23.52,"line":10,"confidence":0.88,"source":"asr"}
```

`source` pode ser `asr`, `interpolated`, `estimated` ou `manual`. `line` guarda a linha original, incluindo a posição das linhas vazias, para recompor frases. A letra enviada pelo autor é preservada mesmo quando o ASR reconhece outra grafia.

## Regras de duração e reprodução

- A primeira cena começa em zero. O fim de cada cena coincide com o começo da próxima. A última termina em `duration`.
- Uma palavra possui `0 ≤ start < end ≤ duration`. Inícios são monotônicos.
- `fps` é 30 ou 60. `format` é `vertical` ou `horizontal`.
- `seed` fixa a textura e o chiado. O mesmo projeto e o mesmo frame produzem a mesma string SVG, mesmo após serialização ou renderização fora de ordem.
- O caminho de áudio usa `media/nome.mp3`, `media/nome.wav` ou `media/nome.flac`; os bytes ficam em `public/media`.
- Dados de referência opcionais descrevem dimensões, cortes prováveis e paleta. Não contêm os quadros ou o áudio do vídeo original.

Para adicionar uma metáfora, amplie `kinds`, registre sua descrição em `metaphors`, implemente sua função em `frame.ts` ou num módulo dedicado e registre-a em `worlds`. O mesmo desenho aparecerá no editor e no render. Acrescente um teste para sua propriedade narrativa ou geométrica relevante e um teste de rasterização nos limites da transição.

## Close-ups, filtros e idioma

`Project.language` é opcional e aceita `auto` ou um dos dez códigos documentados. `Scene.meaning` guarda o idioma sugerido e os conceitos/palavras usados na decisão; é evidência do vocabulário, não uma tradução gerada. O normalizador preserva Hangul e kana sonoros. Frases têm prioridade sobre substantivos isolados; limites de palavras evitam reconhecer `run` dentro de `brunch`.

Um close-up é um evento como `{ "type":"focus", "at":23.1, "duration":1.7, "strength":1, "wordId":"w20", "focusMode":"word" }`. `focusMode` também aceita `phrase`. O relógio efetivo vem do timestamp atual da palavra, mesmo se o `at` salvo estiver desatualizado. `camera.lyricFocus` varia de 0 a 1. No pico, a letra ocupa o palco e o personagem, as interfaces e a moldura não são desenhados. `camera.focusX` e `focusY` são pontos normalizados de interesse para movimentos de aproximação.

`style.filters` é uma lista ordenada com até 12 camadas. Exemplo: `[{"id":"grade","type":"duotone","amount":0.8,"enabled":true},{"id":"light","type":"bloom","amount":0.4,"enabled":true}]`. Tipos válidos estão em `filterTypes`; cores e valores são validados antes de salvar/renderizar. Filtros de ruptura e interfaces reduzem a interferência durante close-ups, mantendo a palavra legível.

O motor calcula os dois lados da transição por tempo absoluto, inclusive um pequeno trecho de continuação do plano anterior. Não depende de um framebuffer anterior. O browser converte os textos para contornos de glifos antes de rasterizar SVGs e entrega frames com timestamps explícitos ao encoder. O render local usa as mesmas curvas e o mesmo JSON com Sharp/FFmpeg. Rasterizadores podem apresentar pequenas diferenças de antialiasing e blur, mas os eventos e poses não dependem da ordem dos frames.
