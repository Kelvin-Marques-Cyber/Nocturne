# Montagem a partir das novas referências

Os vídeos enviados são referências de direção. Nenhum trecho, screenshot, modelo ou áudio deles entra no aplicativo publicado.

| Referência observada | Lógica de direção | Implementação original |
| --- | --- | --- |
| 43320 · quarto desenhado | Perspectiva estável; luz localizada; pequenos objetos dão escala; a segunda metade acrescenta uma exposição translúcida. | Quarto desenhado: chão com ponto de fuga, janela, abajur com luz quente, objetos vetoriais e uma segunda figura derivada do esqueleto atual. |
| 43321 · objeto e instrumentação | Alternância entre volume e malha; enquadramento do objeto; pontos e sinais organizam a leitura técnica. | Laboratório wireframe: figura com faces, juntas projetadas em 3D, triangulação, marcadores e sinais derivados da análise real do áudio. |
| 43318 · paisagem e passagem de luz | Horizonte como destino, diferentes velocidades de planos e impactos luminosos que mudam a escala. | Travessia solar: três planos de terreno, perspectiva de vale, horizonte luminoso e ondas acionadas pelos impactos identificados. |
| 43319 · montagem de interfaces | Palavras desenham o espaço; título central; passagem entre painéis em profundidade. | Arquivo tipográfico e Galeria em profundidade: arquivo das palavras já cantadas, plano frontal da frase e painéis vetoriais com projeção em perspectiva. |

As imagens fotorrealistas das referências não são reproduzidas pelo renderizador vetorial. Os estilos acima usam geometria procedural, personagens articulados e os dados da música. A linguagem do primeiro reel continua disponível em **Reel original**.

## Escolha e combinação

No inspetor, **Referências de montagem** permite selecionar a linguagem da música e uma exceção para cada cena. **Combinar referências automaticamente** escolhe por metáfora e conserva o reel original como linguagem recorrente, inclusive em televisão e instrumentos.

As escolhas ficam em `project.editProfile` e, opcionalmente, `scene.editProfile`. Valores: `auto`, `classic`, `sketch-room`, `wireframe-lab`, `solar-drift`, `type-archive` e `gallery-flight`.

Projetos existentes continuam válidos. A adoção no editor não refaz o ASR, não altera palavras, duração, áudio, deslocamento de sincronização ou intervalos de cenas. A montagem automática escolhe transições; elas continuam editáveis.

## Transições e renderização

Quatro novas transições: `exposure` (segunda exposição deslocada), `portal` (abertura elíptica de luz), `parallax` (passagem de planos em escalas diferentes) e `light-sweep` (varredura diagonal).

O mesmo SVG determinístico serve à prévia, ao exportador WebCodecs e ao FFmpeg. As novas cenas não exigem assets externos, serviço pago, fontes novas ou dependências adicionais. Grades, faces e painéis têm contagem limitada, sem árvores infinitas de partículas ou desfoques em tela inteira.
