# Etapa 2 — Criaturas

## Inspeção do sistema anterior

O corredor em `World3D.tsx` gerava lobo e Saci com esferas, caixas, cilindros e
cones, compartilhando um material quase preto. A corrida era uma oscilação de
grupos de pernas; o Saci tinha uma capa cônica e uma perna rígida. A figura alta
era um cone com cabeça. Não havia modelos GLB/GLTF nem clips de animação locais
para reutilizar. Olhos, reflexo do espelho, boneca e trem tinham eventos próprios.

As aparições são associadas aos índices das lendas, com sorteio determinístico,
visita única por sessão e oclusão pelo depth buffer. A câmera tem perspectiva e
deslocamento amortecido, influenciando fortemente o tamanho aparente. A cena usa
luzes pontuais, luz ambiente/hemisférica e fog; não havia shadow maps habilitados.

## Modelagem e materiais

Foram criados quatro modelos autorais em `src/experience/creatures/`:

- **Lobisomem:** união suave de volumes anatômicos extraída por marching tetrahedra,
  formando uma malha contínua de tronco, peito, pescoço, crânio e focinho. Ombros
  elevados, dorso arqueado, focinho alongado, nariz, mandíbula, dentes, orelhas,
  olhos, musculatura traseira, quatro patas articuladas, garras e cauda volumosa.
  A altura até as orelhas é aproximadamente 3 m; é propositalmente maior que um
  lobo real. A referência de porta de 2,10 m na inspeção permite comparar a escala.
- **Saci:** torso modelado por perfil de revolução, pescoço, rosto, nariz, orelhas,
  olhos, sobrancelhas, braços articulados, mãos, uma única perna articulada, pé,
  calção escuro e gorro vermelho com ponta curvada. O salto é intercalado com uma
  pausa de observação e a saída tem um redemoinho local de partículas.
- **Corvo:** corpo aviário, pescoço, cabeça, bico, olhos, asas com duas articulações,
  remiges separadas em leque, cauda, patas e dedos. A passagem começa pousada,
  passa para voo com batidas de asas defasadas e termina lateralmente.
- **Figura alta:** vestido longo com perfil ondulado, ombros, mangas, mãos,
  cabelos, face pálida e chapéu de aba larga. Movimento deliberadamente lento.

A pelagem do lobisomem usa textura direcional de 256×256 gerada localmente, normal
map derivado do relevo e tufos com alpha recortado e deformação pela mesma cadeia
óssea do corpo. Há 4.200 tufos no desktop e 1.500 no mobile. O comprimento e a
direção variam, com maior volume na crina, nos ombros e no peito. Patas também têm
tufos de geometria afilada. Dentes, garras e tufos das patas usam instâncias.

O corvo tem textura procedural de plumas com relevo discreto. Os demais materiais
usam `MeshStandardMaterial`, com rugosidade alta em pele/tecido/pelo, respostas
mais lisas no nariz/bico e olhos com destaque controlado. Os materiais são
compartilhados dentro de cada modelo. Não há downloads de texturas ou modelos.

## Animação e espaço

O lobisomem usa `SkinnedMesh` e uma cadeia de ossos para lombar, peito e cabeça.
As pernas usam IK de dois segmentos, com flexão anterior/traseira distinta. A fase
do galope é calculada pela distância percorrida, com contatos plantados, retorno
elevado e defasagem das quatro patas. Dorso, cabeça, mandíbula e cauda têm movimento
secundário. Não foi usado `AnimationMixer`: não há clips GLTF apropriados; o rig é
animado proceduralmente.

Os eventos naturais aguardam a câmera se aproximar do registro antes de começar.
O lobo cruza em 3,4 s, à frente da placa suspensa do próprio registro, preservando a
leitura de cabeça e corpo; a travessia lateral encontra a oclusão das colunas e
paredes existentes. O fade nos extremos suaviza surgimento e saída. O tempo útil
de reconhecimento depende da posição e da velocidade da câmera durante o evento.

Uma área de luz pontual âmbar no percurso revela a anatomia na região central.
Ela perde intensidade ao terminar o evento, sem alterar os materiais da arquitetura.
Sombras de contato suaves são planos procedurais com depth test. As oclusões do
corpo são reais pelo depth buffer; as sombras de contato são aproximadas e não
projeções completas de shadow maps. A sombra do corvo acompanha o piso sob o voo.

O Saci aciona o sistema atmosférico existente para gerar correntes localizadas.
O lobo deixa perturbações ao longo da corrida. O modo de movimento reduzido
suspende galope, saltos e redemoinhos; a figura continua reconhecível na aparição.

## Onde aparecem

| Criatura | Evento natural |
| --- | --- |
| Lobisomem | Registro 12, Peter Stumpp |
| Saci | Registro 32, na região intermediária do percurso |
| Corvo | Registros 5, 18 e 43, próximo às estruturas/janelas |
| Figura alta | Registro de Hachishakusama |

Os eventos de espelho, olhos, estação e boneca foram preservados. A presença no
espelho continua sendo uma textura 2D; não foi substituída por personagem rigged.

## Como demonstrar — somente desenvolvimento

Execute `npm run dev` e abra:

| Demonstração | URL |
| --- | --- |
| Lobisomem parado | `http://localhost:5175/?criatura=lobo&acao=parado` |
| Lobisomem correndo | `http://localhost:5175/?criatura=lobo` |
| Saci saltando | `http://localhost:5175/?criatura=saci` |
| Saci desaparecendo | `http://localhost:5175/?criatura=saci&acao=desaparecer` |
| Corvo em voo | `http://localhost:5175/?criatura=corvo` |
| Figura alta | `http://localhost:5175/?criatura=alta` |

O painel permite trocar personagem/ação, pausar, avançar um quadro, usar velocidade
real, ¼× ou ¹⁄₁₀× e alternar projeção. Há vistas de perfil, frente e ¾, além de órbita
por arraste e zoom pela rodinha. A corrida nessa galeria é estacionária para estudo;
no corredor, a raiz se desloca e as fases das patas acompanham a distância.

`?assombracao=lobo`, `saci`, `corvo` ou `alta` demonstra cada evento no corredor
após clicar em Explorar. `?assombracao=todos` executa a sequência de eventos.
Esses atalhos e a galeria são condicionados a `import.meta.env.DEV`. No build de
produção, `?criatura=...` abre o site normal e o módulo de inspeção não é incluído.

Para automação de desenvolvimento, a galeria expõe `window.__bauCriaturas` com
inspeção, posicionamento no tempo e wireframe. No corredor, `atmosferaDebug=1`
acrescenta estado das criaturas; a pausa de captura está disponível apenas em DEV.

## Orçamento e recursos

Os modelos só são gerados quando solicitados pela primeira vez. Não há custo de
rede para assets nem animação de criaturas invisíveis. O cache guarda até três
modelos e descarta o inativo mais antigo quando necessário. O descarte libera
geometrias, materiais, texturas, skeletons, instâncias e grupos da cena.

O corpo tem resolução menor no mobile. O LOD reduz os tufos pela distância e pela
média de tempo de quadro sem retirar toda a pelagem. Dentes, garras, tufos e penas
repetidos são instanciados. Apenas uma aparição fica ativa por vez.

Na galeria desktop, incluindo piso, grade e referência de escala, as capturas
registraram 41 draw calls / 42.146 triângulos para o lobo, 30 / 10.024 para o Saci,
21 / 18.070 para o corvo e 20 / 7.080 para a figura alta. O lobo mobile registrou
18.374 triângulos. Esses números incluem a geometria visível de apoio e não são
medições de fps em GPU física.

## Origem e licença

Geometrias, anatomia, rigs, animações, texturas procedurais, mapas de relevo e
silhuetas desta etapa foram criados diretamente para este projeto. O código e os
parâmetros locais são a fonte dos assets. Não há modelos de marketplaces, recursos
extraídos de jogos, imagens externas ou novas obrigações de atribuição de assets.
Three.js, React e suas licenças permanecem as dependências já existentes.

## Validação e limites

```text
npm run build
node --test --test-isolation=none tests/creatures.test.mjs tests/atmosfera.test.mjs tests/api-ra.test.mjs tests/qr-pose.test.mjs
node tests/creatures-browser.mjs
node tests/creatures-world-browser.mjs
node tests/world-integration-browser.mjs
node tests/interface-browser.mjs 1440x900 390x844
node tests/creatures-production-browser.mjs
```

Os testes verificam comprimentos ósseos, apoio sem deslizamento no eixo da corrida,
retorno das patas, orientação das faces da malha, renderização de quatro modelos,
fases de animação, câmera lenta/velocidade real, cache, perfil mobile, eventos no
corredor e aproximação após salto pelo índice. As regressões mantêm cobertura de
atmosfera, API/RA, QR, navegação, dossiê, portais e 60 posições do Grimório.

O teste de produção usa `npm run preview -- --host 127.0.0.1 --port 4175`.
Capturas e relatórios ficam em `tests/artifacts/criaturas/`; a gravação WebM da
galeria é `criaturas-inspecao.webm`. A validação usa Chrome headless/SwiftShader e não mede
GPU física, datashow ou câmera de celular real.

Os modelos têm acabamento procedural estilizado: não substituem uma escultura
anatômica de produção com texturas escaneadas e animação capturada. A pelagem usa
cards/tufos, não fios individuais. Não há simulação física de tecido/pelo, sombras
completas de membros nas paredes, áudio novo ou expressões faciais por blendshapes.
Em telas estreitas, o lobo próximo pode ocupar grande parte do quadro; a inspeção
permite examinar o corpo inteiro. O primeiro uso gera a malha e pode causar uma
pausa breve em equipamentos lentos.
