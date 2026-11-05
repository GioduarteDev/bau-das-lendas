# Etapa 3 — Assombrações e acontecimentos

## Implementação

`src/experience/hauntings/EventCatalog.ts` descreve os eventos; `EventDirector.ts`
controla o tempo e os estados; `HauntingWorld.ts` cria, anima e limpa os efeitos.
`World3D.tsx` fornece a posição real da câmera, velocidade, índice ativo, direção
de observação e inspeção por raycast. A navegação, os modelos da etapa 2 e o sistema
de atmosfera são reutilizados. O catálogo continua com suas 60 lendas.

Cada configuração possui ID estável, nome, entidade, lenda relacionada quando
existente, posição em coordenadas do mundo, região de índices, gatilho, permanência,
limites de distância/velocidade, duração, cooldown, probabilidade, prioridade,
intensidade e estratégia de reset. O estado de execução fica separado da configuração.
Cada execução chama hooks de início, atualização e limpeza. Falhas são isoladas e
registradas; a limpeza também ocorre ao substituir, cancelar ou desmontar a cena.

O diretor usa delta time de simulação. Painéis, aba oculta e pausa de inspeção não
consomem a duração. A probabilidade é sorteada uma única vez por elegibilidade de
visita, sem uma nova tentativa a cada quadro. Saltos pelo índice aguardam a câmera
se aproximar do local, em vez de consumir a aparição durante o deslocamento distante.

## Eventos e localização normal

Os registros abaixo usam numeração a partir de 1. Os IDs e índices internos são
estáveis; uma âncora de registro fica em `z = -8 - indice * 7 + 1.6`. A instalação
ou trajetória aplica os deslocamentos locais declarados na camada visual.

| ID / evento | Registro / referência | Gatilho | Duração | Probabilidade |
| --- | --- | --- | --- | --- |
| `olhos-limiar` | 3, abertura escura | Permanência de 0,8 s | 3,8 s | 100% |
| `espelho-loira` | 1, Loira do Banheiro | Olhar + permanência de 1,1 s | 5,8 s | 100% |
| `espelho-atraso` | 1, mesmo espelho | Revisita | 3,8 s | 100% |
| `kisaragi-zero` | 5, Kisaragi Station | Permanência de 0,9 s | 5,5 s | 100% |
| `alta-colunas` | 6, Hachishakusama | Aproximação | 4,5 s | 100% |
| `porta-respira` | 8, passagem lateral | Aproximação | 3,4 s | 80% |
| `lampada-falha` | 10, lâmpada | Aproximação | 3 s | 80% |
| `lobo-stumpp` | 12, Peter Stumpp | Aproximação | 4,4 s | 100% |
| `sombra-janela` | 16, painel envidraçado | Aproximação | 3,5 s | 75% |
| `boneca-ilha` | 19, Ilha das Bonecas | Olhar; permite revisita | 4,2 s | 100% |
| `objeto-inspecao` | 23, pequeno objeto junto ao piso | Clique/toque por raycast | 5 s | 100% |
| `cortina-corrente` | 25, passagem com tecido | Aproximação | 4 s | 85% |
| `saci-redemoinho` | 32, visitante folclórico transversal | Aproximação | 5,1 s | 100% |
| `olhos-retorno` | 37, janela revisitada | Revisita | 3,6 s | 80% |
| `pegada-umida` | 41, piso | Revisita | 5 s | 100% |
| `corvo-janela` | 43, estrutura lateral | Aproximação | 3,6 s | 85% |
| `luz-distante` | 49, luz distante | Aproximação | 4 s | 70% |
| `boitata-cinzas` | 55, Boitatá | Aproximação | 5,4 s | 100% |
| `olhos-fundo` | 56, abertura pouco iluminada | Olhar | 3,2 s | 85% |

Saci não substitui uma lenda do catálogo: mantém sua aparição transversal da etapa
anterior. Olhos e microeventos também não modificam as histórias dos registros.

Como condições comuns, a câmera precisa estar a menos de 5,5 unidades da posição
de observação do registro, no índice configurado, com velocidade até 18 unidades/s.
Os eventos de entrada têm permanência mínima de 0,3 s. Observar usa a direção real
da câmera, com tolerância maior no mobile. Inspeção usa interseção com a geometria,
ignorando botões, links, formulários e diálogos da interface.

O reset padrão é uma vez por sessão, com cooldown de 65 s. A boneca permite
revisita após 25 s; o espelho com atraso exige revisita e cooldown de 45 s. Os olhos
de retorno e as pegadas exigem uma saída e nova entrada na região. O laboratório
pode repetir qualquer evento independentemente dessas restrições.

## Ritmo narrativo

Há somente uma manifestação ativa. As prioridades são 20 para ambiental, 50 para
intermediária e 80 para marcante. Após encerrar, o diretor reserva 2, 4 ou 8 segundos
de silêncio conforme a categoria. Uma manifestação marcante também exige pelo
menos 5 segundos desde o fim do acontecimento anterior. Os intervalos não são
preenchidos por microeventos: há tempo para observar a arquitetura.

Os eventos garantidos dependem das condições e da permanência na região. Não são
teletransportados para a câmera quando o jogador atravessa rapidamente um local.
Os acontecimentos ocasionais variam entre sessões por `Math.random`, com uma
decisão por elegibilidade, mantendo uma frequência controlada.

## Efeitos visuais

- **Olhos:** pares com separação anatômica, brilho âmbar moderado, pupilas, piscada
  e orientação para a câmera, dentro de estruturas escuras com apoios até o piso.
- **Espelho:** moldura física, manchas e desgaste sobre uma reflexão planar real
  com `Reflector`/render target. A entidade usa camada 1, excluída da câmera principal
  e incluída apenas na câmera refletida. Ela surge atrás da posição da câmera,
  permanece brevemente e desaparece. A alternativa de revisita mantém o último
  reflexo por aproximadamente 0,28 s entre atualizações.
- **Lobisomem:** antecipação por luz, corrida posterior com pelagem e IK da etapa 2,
  travessia à frente da placa e saída lateral com oclusão pelas estruturas.
- **Saci:** perturbação inicial do ar, papel leve deslocado, saltos, pausa de
  observação e desaparecimento com redemoinho localizado da etapa 2.
- **Hachishakusama:** figura alta profunda, cabeça/corpo discretamente inclinados,
  movimento mínimo e desaparecimento sem avançar contra o jogador.
- **Kisaragi:** placa local muda de 01 para `00 / ∞`, relógio parado e luz além da
  sinalização. A textura é atualizada apenas ao mudar o texto e restaurada na limpeza.
- **Boneca:** objeto abandonado sobre suporte, cabeça inclinada, orientação do rosto
  e pequena diferença lateral em novas execuções. O corpo não acompanha a câmera.
- **Boitatá:** pontos luminosos sobre uma superfície tubular sinuosa distante,
  âmbar controlado e luz local. Parte do fenômeno se perde atrás da arquitetura.
- **Ambiente:** porta articulada, variação lenta de luz, silhueta numa janela,
  cortina com pregas deformáveis, objeto de inspeção e pegadas úmidas temporárias.

O movimento reduzido mantém os olhos abertos, evita galope/saltos/redemoinhos e
reduz movimentos rápidos de tecido e luz. Nenhum áudio foi acrescentado: não havia
recursos sonoros apropriados no projeto e a etapa mantém o áudio como opcional.

## Apresentação em datashow

Abra `http://localhost:5175/?apresentacao=1&demonstracao=1` e clique em **Explorar**.
Depois do gesto inicial, a câmera segue automaticamente uma rota compacta de cinco
baias: **olhos → espelho → Saci → lobisomem → Boitatá**, com pausas entre eventos.
No build publicado, use os mesmos parâmetros no endereço do site.

Essa rota comprime as localizações para demonstração; a exploração normal continua
com as 60 posições originais. A legenda da lenda é ocultada durante a montagem para
não associar o visitante à placa de um registro diferente. Os controles existentes,
Grimório e portais continuam disponíveis; abrir um painel pausa a demonstração.
Ao terminar, a câmera permanece na quinta baia e os eventos da montagem não repetem.

Para conduzir o percurso manualmente, acrescente `&autonomo=0` e avance pelas cinco
primeiras posições. Para apenas melhorar contraste, mantendo a exploração normal,
use `?apresentacao=1`, sem `demonstracao=1`.

## Laboratório — apenas desenvolvimento

Execute `npm run dev`, abra `http://localhost:5175/?assombracoes=1` e entre no corredor.
O painel permite selecionar evento, ajustar duração, disparar no enquadramento
atual, ir à localização normal, pausar, repetir, resetar e inspecionar estado,
posição, tempo médio de quadro, chamadas de desenho e erros.

Atalhos de teste também continuam disponíveis: `?assombracao=olhos`, `espelho`,
`lobo`, `saci`, `alta`, `estacao`, `boneca`, `boitata`, `porta`, `lampada`, `sombra`,
`cortina`, `pegada` ou `corvo`. Use `todos` para percorrer o catálogo de testes.
Aceita-se também um ID específico, por exemplo `?assombracao=espelho-atraso`.
É necessário clicar em Explorar; os eventos de teste são posicionados perto da câmera.

Em DEV, `window.__bauAssombracoes` expõe `inspecionar()`, `disparar(id,duracao)`,
`localizar(id)`, `pausar(boolean)`, `resetar()` e `inspecionarObjeto(id)`. O painel,
essa API e os atalhos forçados são removidos/desativados no build de produção.
A galeria de criaturas da etapa 2 permanece disponível em `?criatura=lobo` etc.

## Desempenho, recursos e limites

Há um único render target de espelho, reutilizado, com 512×768 no desktop e 256×384
no mobile. A atualização é limitada a 18 Hz ou 12 Hz e ocorre só quando o espelho
está visível e próximo. O render principal continua independente dessa frequência.
O render target, materiais e geometrias são liberados ao desmontar a cena.

Instalações são criadas sob demanda e ficam ocultas a mais de 30 unidades da câmera.
O catálogo limita a quantidade de instalações; revisitas reutilizam os mesmos
recursos. O Boitatá usa buffers persistentes. Criaturas reutilizam o cache e o LOD
da etapa 2. O mobile mantém seu orçamento de partículas mesmo em apresentação.

O espelho é planar e tem resolução reduzida; não há reflexos recursivos ou SSR.
O atraso é uma retenção temporal do render target, não um histórico completo da
cena. A figura refletida, a boneca e os fenômenos têm acabamento procedural
estilizado. Sombras de contato das criaturas continuam aproximadas. Eventos de
olhar podem exigir desacelerar e ajustar a direção da câmera. Desempenho em GPU
física, celular real e datashow não foi medido por estes testes de software.

Não foram usados modelos, imagens ou sons externos nesta etapa. Os novos efeitos,
texturas de sinalização/manchas e geometrias são autorais locais. O refletor usa
o módulo já instalado do Three.js, mantendo a licença da dependência existente.

## Verificação

```text
npm run build
node --test --test-isolation=none tests/hauntings.test.mjs tests/creatures.test.mjs tests/atmosfera.test.mjs tests/api-ra.test.mjs tests/qr-pose.test.mjs
node tests/hauntings-browser.mjs
node tests/hauntings-presentation-browser.mjs
node tests/interface-browser.mjs 1440x900 390x844
node tests/hauntings-mobile-production-browser.mjs
```

Para o último comando, inicie também `npm run preview -- --host 127.0.0.1 --port 4175`.
Os testes verificam relógio/pausa, probabilidade, prioridade, silêncio, aproximação,
revisita, cooldown, reset, isolamento de erros, camada exclusiva do reflexo,
limpeza de efeitos, controles de desenvolvimento, apresentação autônoma, mobile
com movimento reduzido e ausência do laboratório em produção.

Evidências ficam em `tests/artifacts/assombracoes/`, incluindo capturas por entidade,
`apresentacao-resultados.json` e a gravação `apresentacao.webm`. A execução utiliza
Chrome headless com SwiftShader; os tempos exibidos são do quadro inteiro e não
devem ser interpretados como benchmark de hardware físico.

Na entrega de 03/11/2026, o build e os 26 testes automatizados passaram. As 14
famílias de efeitos foram exercitadas no navegador, com captura e encerramento sem
erros. A sequência autônoma completou as cinco manifestações na ordem prevista.
Também passaram a validação mobile do espelho/olhos em movimento reduzido, a
ausência do laboratório em produção e a regressão de interface em 1440×900 e
390×844, incluindo navegação, dossiê, dois QRs e as 60 posições do Grimório.

## Arquivos de entrega

- Novos módulos: `src/experience/hauntings/EventDirector.ts`, `EventCatalog.ts`,
  `HauntingWorld.ts`, `HauntingPanel.tsx` e `panel.css`.
- Integração: `src/experience/World3D.tsx`, `src/App.tsx` e `src/style.css`.
- Testes novos: `tests/hauntings.test.mjs`, `tests/hauntings-browser.mjs`,
  `tests/hauntings-presentation-browser.mjs` e
  `tests/hauntings-mobile-production-browser.mjs`.
- Regressão ajustada: `tests/creatures-production-browser.mjs` permite os novos
  eventos naturais e continua rejeitando a aparição forçada em produção.
- Documentação, build `dist/` e evidências em `tests/artifacts/assombracoes/`.
  O estado anterior de `World3D.tsx` e `App.tsx` está em `backup/etapa3-assombracoes/`.
