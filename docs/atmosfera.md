# Atmosfera sobrenatural

Implementação em `src/experience/Atmosfera.ts`, integrada ao loop e ao ciclo de
desmontagem de `src/experience/World3D.tsx`. A arquitetura, as texturas, o catálogo,
a interface do Grimório e o código de RA foram preservados.

## Visualização

Execute `npm run dev` e abra `http://localhost:5175/`. Use a rodinha ou deslize no
celular para atravessar o portal. Role nos dois sentidos para observar o parallax
e a passagem das partículas pelas laterais. O teclado e as setas também deslocam
a câmera e produzem a mesma resposta atmosférica.

- `/?apresentacao=1`: partículas mais visíveis, exposição de 1,78 (normal: 1,62).
- `/?assombracao=saci`: aparição de teste com corrente circular localizada.
- `/?assombracao=lobo`: poeira acompanhando a corrida junto ao chão.
- `/?atmosferaDebug=1`: habilita `window.__bauAtmosfera.inspecionar()` no console.
  Retorna perfil, orçamento, velocidade, tempo médio de quadro, reciclagens,
  quantidade de eventos, amostra de posições e chamadas da cena completa.
  Essa instrumentação só é exposta quando solicitada na URL.

## Partículas e scroll

Um `THREE.Points` com `BufferGeometry` persistente contém três volumes sobrepostos:
18, 42 e 78 unidades de comprimento. Os volumes curtos concentram a camada próxima;
os maiores sustentam as regiões intermediária e distante. As posições permanecem
no mundo enquanto a câmera se move. Apenas partículas fora dos limites ativos são
recicladas, inclusive em saltos pelo índice das 60 lendas e na navegação reversa.

O shader controla tamanho por perspectiva, formatos de esporos/cinzas/fragmentos,
rotação, transparência, suavidade próxima e perda de contraste distante. Fases,
velocidades e tamanhos variam individualmente. O movimento combina correntes
senoidais de baixa frequência, queda lenta e perturbações locais. A névoa usa
ruído procedural interpolado e deformação de baixa frequência.

A velocidade vem da diferença entre as posições reais da câmera por delta time,
com amortecimento exponencial. Uma esteira pequena desloca o ar perto da câmera e
perde força suavemente quando ela para. A projeção 3D produz o deslocamento aparente
maior das partículas próximas. Não há translação de toda a nuvem junto à câmera.

A entrada tem menor opacidade, crescendo com a aproximação. Uma faixa mais densa,
centrada no portal em coordenadas do mundo, precede a densidade estável do corredor.
O modo de movimento reduzido suspende deriva, rotação e perturbações; a perspectiva
e a navegação permanecem disponíveis. Painéis e aba oculta suspendem o loop existente.

## Névoa e iluminação

Lâminas transparentes em coordenadas do cenário aproximam um volume, com maioria
rasteira e algumas passagens verticais. O ruído desliza em coordenadas do mundo,
com duas escalas no desktop e uma no mobile. Bordas, proximidade e distância têm
fade; o depth test mantém a oclusão pela arquitetura e `depthWrite: false` evita
que a atmosfera bloqueie outras superfícies transparentes. Materiais e geometria
são compartilhados. O `FogExp2` original continua fornecendo profundidade ao fundo.
É uma aproximação volumétrica, sem ray marching ou pós-processamento adicional.

Os shaders leem posição, cor e intensidade das oito luzes pontuais mais próximas
da câmera. A contribuição diminui com a distância à fonte, revelando partículas
nas passagens iluminadas e atenuando-as nas sombras. O tom de base da atmosfera
é quente; as luzes existentes e a arquitetura não foram recoloridas. A paleta
distribui probabilisticamente 60% neutros quentes, 25% cinzas, 10% âmbar e 5% bordô.

## Configuração e eventos

O objeto `ATMOSFERA` centraliza largura/altura dos volumes, tamanho, densidade,
opacidade, velocidade das correntes, intensidade da névoa e resposta ao ar.
`perfis` define contagens, número de lâminas e brilho:

| Perfil | Próxima / central / fundo | Total máximo | Lâminas |
| --- | --- | --- | --- |
| Desktop | 150 / 820 / 680 | 1.650 | 18 |
| Mobile | 70 / 330 / 260 | 660 | 9 |
| Apresentação | 180 / 940 / 760 | 1.880 | 18 |

Mobile é escolhido na montagem para viewport até 760 px ou ponteiro principal
coarse. Apresentação tem precedência quando selecionada pela URL.

Cada instância expõe `perturbar({ posicao, raio, intensidade, duracao, giro })`.
`posicao` é um `THREE.Vector3` no mundo e é copiada internamente. Há um pool de seis
eventos; chamadas adicionais reutilizam o mais antigo. Saci e lobo atualizam suas
esteiras a cada 0,3 s; espelho, olhos e outras aparições emitem uma perturbação local
discreta. Eventos também alteram sutilmente a névoa próxima, sem alterar luzes globais.

## Desempenho e validação

Partículas usam uma chamada de desenho; a névoa acrescenta no máximo 18 chamadas
no desktop/apresentação ou nove no mobile, antes do culling do Three.js. Não são
criadas geometrias, materiais ou buffers a cada quadro. O orçamento adaptativo
reduz gradualmente partículas após queda sustentada de fps; a ordenação aleatória
do buffer de índices preserva as três camadas ao reduzir o draw range. Sob carga,
o desktop também desativa a segunda escala do ruído. Há recuperação gradual do
orçamento, fades de distância e descarte explícito dos recursos na desmontagem.

Comandos de validação:

```text
npm run build
node --test tests/atmosfera.test.mjs tests/api-ra.test.mjs tests/qr-pose.test.mjs
node tests/atmosphere-browser.mjs
node tests/world-integration-browser.mjs
node tests/interface-browser.mjs 1440x900 390x844
```

O teste atmosférico gera capturas de entrada, portal, corredor e retorno nos três
perfis em `tests/artifacts/atmosfera/`, além de `resultados.json`. Ele verifica erros
de shader/JavaScript, posições persistentes, velocidade nos dois sentidos, eventos,
reciclagem e movimento reduzido. Os testes unitários verificam consistência temporal,
localidade dos eventos, saltos longos, adaptação de orçamento e descarte de recursos.

As medidas do teste de navegador usam Chrome headless com SwiftShader (renderização
por software), sendo do quadro inteiro, não do custo isolado da atmosfera. Não
representam uma medição em GPU física ou celular real. A validação de RA cobre
fluxos automatizados, QR e pose; uso de câmera física precisa de dispositivo real.

Na execução de 03/11/2026, a amostra ao inverter o scroll registrou 54,2 ms no
desktop, 18,1 ms no viewport mobile e 50,9 ms em apresentação, com 80, 72 e 80
chamadas de desenho na cena inteira, respectivamente. São amostras suavizadas,
não percentis de benchmark. Build, 13 testes unitários, os três perfis WebGL,
movimento reduzido, aparições de olhos/Saci e regressão de interface em
1440×900 e 390×844 passaram. A interface verificou contador, setas, teclado,
menu, dossiê, dois QRs e as 60 posições do Grimório com fixtures de API.
