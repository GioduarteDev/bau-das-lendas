# Baú das Lendas: corredor imersivo

O site é feito só com HTML, CSS e JavaScript, sem instalar nada.

## Como abrir no VS Code
1. Abra esta pasta no VS Code (Arquivo → Abrir Pasta).
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` → **Open with Live Server**.

> Também abre com dois cliques no `index.html`, mas pelo Live Server os links `/ra.html` funcionam igual ao seu site.

## Cartas colecionáveis
- No corredor, cada lenda é uma **carta lacrada** pendurada na parede, sem a arte (`js/cartas.js`).
- A janela da carta mostra a padronagem tradicional da ala: grafismo marajoara (Brasil), asanoha (Japão) e jali (Ásia). Por cima vão o lacre com fechadura, o brilho holográfico, o scanner e o número de série.
- Quando você para diante dela, a carta **sai da parede e vira para você**.
- Depois que entra no Grimório, a carta ganha o selo "NO GRIMÓRIO".
- O campo `gravura` em `js/lendas.js` guarda a arte de cada lenda, caso queira mostrá-la depois de revelada.

## Modo projetor (claridade)
- Em `css/estilo.css`, no topo: `--brilho: 1.3;`. Aumente se a sala estiver clara.
- Também dá pra mudar pela URL: `index.html?brilho=1.6`.

## Controles
- **Mouse**: olhar em volta, até ~75° para cada lado (a câmera segue o cursor e tem uma lanterna).
- **Roda do mouse / setas**: andar uma lenda por vez.
- **Clique no quadro** ou **ABRIR DOSSIÊ**: lê a lenda completa.
- **Celular**: arrastar pra cima ou pra baixo anda, e inclinar o aparelho olha em volta.

## Arquivos
| arquivo | o que faz |
|---|---|
| `index.html` | estrutura: entrada, HUD, dossiê |
| `css/estilo.css` | todo o visual (cores no topo, em `:root`) |
| `js/lendas.js` | **as lendas**: textos e desenhos dos quadros. Para adicionar uma, copie um bloco |
| `js/texturas.js` | chão de madeira gasta, lambri e papel de parede gerados em canvas |
| `js/corredor.js` | o corredor 3D, a câmera e onde cada objeto fica |
| `js/easter-eggs.js` | os easter eggs |
| `js/som.js` | sons sintetizados (sem arquivos de áudio) |
| `js/main.js` | liga tudo: mouse, scroll, ficha, planta, dossiê |

## Alas, portas e aparições
- **Alas**: papel de parede amarelado de casa assombrada (mofo, infiltração, garras, rasgos mostrando a madeira), com o desenho de cada país por cima. Saguão: damasco europeu. Brasil: azulejo colonial. Japão: seigaiha. China: laca com nuvens e greca. Índia: estampa de bloco com buta. Filipinas: banig.
- **Referências**: fanous (Marrocos), papel picado (México), nazar (Turquia), fitas do Bonfim (Bahia), noren, chōchin, teru teru bōzu e tōrō (Japão), lanterna de palácio e portão da lua (China), lamparina de sino, jharokha e cravos (Índia), parol e capiz (Filipinas).
- **Portas** (`js/decor.js`): abrem sozinhas quando você passa perto, ou com um clique. Dentro tem olhos, um rosto ou uma mão. No shoji, primeiro passa uma sombra atrás do papel.
- **Sangue só como marca** (`js/gore.js`): pegadas descalças, mãos, arrastos e frases escritas a dedo, no chão, nas paredes e no teto. Nada espirra. As marcas viram imagem uma vez só, para ficar leve.
- **Olhos** (`js/olhos.js`): traço fino estilo gravura, pálpebra pesada, íris com fibras. A pupila segue o mouse.
- **Aparições** (`js/aparicoes.js`): sem monstros, acontecem a cada 7–12 s, na parede para onde você está olhando.
  - **Atalhos para a apresentação** (teclado):
    `1` frase se escrevendo · `2` pegadas vindo até você · `3` passos pelo teto · `4` mãos aparecendo · `5` apagão (voltam marcas)
    `6` olhos numa fresta · `7` mão escorregando · `8` rachaduras pulsando · `9` unhas arranhando · `0` gosma escura vazando
- **Planta**: mostra as alas, as cartas (clique para ir), as portas (ficam vermelhas quando abrem) e o cone de visão girando com o mouse.

## Easter eggs
| | como ativar |
|---|---|
| Chapeuzinho e o Lobo | aparecem sozinhos no fundo do corredor a cada ~24 s |
| Pegadas do Curupira | mexa o mouse na ala Brasil (1º quadro). As pegadas apontam ao contrário |
| Hachishakusama | fique 30 s sem mexer em nada: "po… po… po…" e pegadas enormes passam |
| Loira do Banheiro | digite `loira` três vezes |
| Saci | clique no gorro vermelho na parede direita, logo no começo |
| Kisaragi | role além da última lenda |
| Lua cheia | automático em noite de lua cheia real · para testar: `index.html?lua=cheia` |
| Hora morta | automático das 3h às 3h59 · para testar: `index.html?hora=3` |
| Aba | troque de aba e veja o título |
| Console | abra o DevTools (F12) |

## Ligar no seu projeto (React + Vite)
- **Grimório**: em `js/main.js`, o botão salva no `localStorage` e dispara o evento `bau:grimorio`. Troque pela chamada da sua API.
- **RA**: os botões e a porta "Sala do Baú" apontam para `/ra.html`, igual ao seu QR 02.
- **Lendas da API**: troque o array de `js/lendas.js` pela resposta do backend, com os mesmos campos.
