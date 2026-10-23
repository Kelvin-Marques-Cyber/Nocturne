# Direção de sequências do Nocturne

Kelvin aprovou a direção em 23/10/2026 depois da análise de `43217.mp4`.
A referência determina o comportamento: em 10–14 s a câmera acompanha a
tipografia e recua para revelar o conjunto; em 14–17 s uma ação de interface
tem preparação e consequência; em 21–24 s janelas se acumulam no espaço.

## Resultado

O modo reel deve construir planos por frases sincronizadas. O texto participa
da composição, a câmera conecta as frases e as ações têm começo e desfecho.
Gritos e notas sustentadas usam os dados vocais existentes; batidas pontuam
entradas e mudanças de direção. A grafia da letra não substitui a análise vocal.
O personagem usa ações expressivas e contato com objetos, sem dança automática.

## Decisões

| Decisão | Evidência | Aplicação |
| --- | --- | --- |
| Tipografia espacial com revelação final | Referência 10–14 s | Frases grandes em planos, acompanhamento e recuo por sequência |
| Interfaces como ação | Referência 14–17 s | Janela com entrada, leitura e resposta do personagem |
| Acumulação de elementos | Referência 21–24 s | Janelas em camadas e enquadramento aberto no desfecho |
| Mundos com identidade | Pedido de guitarra e cenas reais | Restaurar os renderizadores próprios, hoje desviados para codeTheatre |
| Legibilidade | Comparação com MP4 entregue | Letra maior, cor com função e menos ruído sobre as palavras |

## Arquitetura e abordagens

Aumentar receitas mantendo o palco repetido preservaria a causa do problema.
Trocar todo o motor por uma nova dependência 3D aumentaria o custo de exportação
e perderia os mundos e a sincronização existentes. A abordagem aprovada é
compor sequências no motor SVG determinístico atual: planejamento de frases,
projeção em perspectiva e famílias de composição distintas, reaproveitando os
mundos e o rig existentes.

O plano é derivado dos timestamps sem alterá-los. Uma palavra nunca aparece
antes de seu início. Buscar para trás produz o mesmo frame. O mesmo renderer
serve ao editor, ao PWA e ao MP4. Instrumentos e paisagens conservam suas ações.
Controles manuais de foco continuam disponíveis. Não haverá dependência nova,
deploy, inferência vocal completa ou outra exportação integral nesta etapa.

## Verificação e limites

Provar a restauração dos instrumentos, os limites da câmera nos dois formatos,
a edição dos tempos e a ausência de palavras futuras. Renderizar um trecho
curto da gravação definitiva em 720 × 1280 a 60 FPS e inspecionar os frames.
A aprovação visual desse trecho continua sendo de Kelvin; build ou testes não
provam equivalência artística nem sincronização perfeita da gravação inteira.
