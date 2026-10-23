# Direção expressiva por frase

Objetivo: aproximar frases completas, girá-las suavemente em perspectiva e fazer o personagem interpretar a letra com gestos, sem danças. Um grito como “EU NÃO SEI” deve ter ataque, aproximação e sustentação próprios; a mesma frase suave pede outro tratamento.

## Referências e decisões

| Decisão | Origem | Aplicação |
| --- | --- | --- |
| Palavras e corpo conduzem a cena | `reference-analysis.md` | Gestos semânticos, preparação e recuperação contínuas. |
| Preto, branco e acento preservados | Produto existente e referência | Manter editor e identidade do filme; acento marca a palavra ativa. |
| Frase gira como um plano compartilhado | Pedido do usuário | Projeção perspectiva em SVG, igual na prévia e nos exports. |
| Movimento muda conforme a voz | Pedido do usuário | Medir faixa vocal, contorno de intensidade e altura estimada; corrigir manualmente quando necessário. |
| Variedade por composição | Pedido do usuário | Catálogos pequenos de movimentos, fontes, texturas, gestos e ritmos, combinados deterministicamente. |
| Legibilidade durante aproximação | Referências de motion e tipografia do Refero Design | Enquadrar todas as palavras e limitar rotação e efeitos. |

A pesquisa online do Refero estava indisponível (assinatura inativa). Foram usados a análise editorial da referência já presente no repositório e os guias de motion e tipografia do skill.

## Contratos

- Manter `schemaVersion: 1` e campos novos opcionais para carregar projetos antigos.
- `analysis.voice`: envelopes normalizados de energia, presença, altura e confiança, na grade `hopSeconds`. Origem declarada como mistura; estimativas espectrais não são separação de voz nem reconhecimento infalível de gritos.
- Eventos de foco continuam ligados a `wordId`; qualquer pico acompanha a nova janela após edição dos tempos.
- `scene.performance`: referências validadas dos catálogos, intensidade e ativação. Geração e novo sorteio são operações desfazíveis no editor.
- Seleção automática considera significado, expressão vocal, duração e seed. Desativação e correção manual sempre disponíveis.
- Fontes distribuídas com licença e métricas próprias, utilizáveis offline tanto em Sharp quanto em WebCodecs.
- Não prometer compreender todas as músicas. Informar contagem de combinações de presets, sem chamá-las de animações desenhadas individualmente.

## Critérios de aceitação

Mesma letra com voz suave e intensa produz direções diferentes. Bateria isolada não deve ser suficiente para marcar grito. A frase inteira cabe nos dois formatos durante a rotação, inclusive com acentos/CJK e linhas longas. Corpo mantém os pés apoiados, articulações contínuas e contatos com objetos. Projetos antigos abrem, exports funcionam e o mesmo tempo/seed produz o mesmo quadro em qualquer ordem.

## Ampliação do palco — 23/10/2026

Direção preservada: `reference-analysis.md`, corpo de poucos traços, código como acontecimento e acento vermelho. As recomendações de movimento do Refero orientam continuidade, contenção e hierarquia; efeitos de poeira e luz recuam durante a leitura ampliada. Novos cenários são geometrias SVG determinísticas no mesmo renderizador. Instrumentos recebem contatos de mão no espaço do personagem; não adicionam dança ao corpo. Fontes Latin Modern fornecem contraste entre sans humanista, romano, itálico e mono leve com métricas reais. No celular, os prints fornecidos mostram o problema de colunas e painéis de altura fixa; a correção oferece uma superfície por vez e rolagem de documento.
