# Integração visual e funcional — Baú das Lendas

Esta etapa preserva o backend, o catálogo de 60 lendas, as artes e o corredor 3D. O mockup aprovado não foi fornecido nesta conversa nem encontrado como arquivo identificado no projeto; as cores, tipografia, couro, papel e atmosfera existentes foram usados como referência. Não foi criado dashboard ou página de demonstração.

## O que mudou

- Conta: formulário no estilo existente e ações para explorar ou abrir o grimório. Se a entrada veio da RA ou do álbum, o login retoma esse destino. Retornos são caminhos fixos, sem redirecionamentos externos arbitrários.
- Grimório: capas e folhas inteiras têm identidade estável entre renders. As 60 posições permanecem montadas. Posições bloqueadas são papel, permitindo começar o gesto sobre elas; somente as descobertas são botões. As regras de CSS dos controles deixaram de sobrescrever os espaços das cartas. O motor existente mantém capa rígida, perspectiva, recorte de papel e sombras durante o arrasto. O tamanho mínimo se adapta à altura disponível, com uma folha legível no celular em retrato.
- Progresso: usa `progress` do backend. Foco e retorno à aba consultam o álbum novamente; sem resposta válida aparece uma mensagem e o progresso fica desconhecido. As cartas continuam bloqueadas até confirmação do servidor.
- Casa 3D: o corredor gótico repetitivo foi substituído por uma residência ilustrada, com piso de tábuas, tapete, paredes de reboco com vãos reais, rodapés, sancas, portas com maçanetas, retratos, fichas de arquivo, janelas frias e luminárias quentes. Duas portas revelam interiores 3D diferentes (quarto e banheiro) quando abertas. Scroll, toque, teclado, dossiês e navegação pelas 60 lendas foram preservados. Onze módulos reutilizáveis acompanham a câmera; os registros fora do trecho visível não mantêm cenários duplicados na GPU.
- Manifestações: as portas abrem ao se aproximar, podem ser clicadas e fecham ao passar; o catálogo conserva a sombra e o lobo em travessia e agora inclui um retrato que altera o olhar e a expressão. Os eventos permanecem espaçados pelo diretor e respeitam movimento reduzido. O desenho do fundo é suspenso enquanto um painel cobre a cena ou a aba fica oculta; a posição da câmera é mantida para retomar a exploração e liberar GPU para o livro.
- Portais: dois QR Codes reais, preto no branco, produzidos por `qrcode.react`, com margem de leitura e estilos de impressão. QR 01 contém a URL do site; QR 02 contém a URL `/ra.html`. A origem vem de `VITE_PUBLIC_URL` ou da origem atual. O fluxo antigo de `/marcador.html` e `qrcodes.html` agora direciona aos mesmos dois portais, sem imagem-alvo adicional.
- Ritual: leitura do próprio QR 02, com jsQR local e estimativa de pose a partir dos cantos. O mesmo baú Three.js, tampa, iluminação, emergência da carta e três faces foram mantidos. O sorteio continua sendo exclusivamente do servidor, ao toque em ABRIR BAÚ. Falhas reutilizam a chave; ESCANEAR NOVAMENTE exige afastar e reenquadrar o QR e prepara uma nova abertura. O retorno ao grimório abre o álbum diretamente. Câmera e recursos gráficos são liberados ao sair.

Backup anterior às mudanças: `backup/pre-integracao-visual-20261102/`. O hash SHA-256 do catálogo original deve continuar sendo `C3664ED33AF7D5D44826F19682C71F6670355010DA80FADA898ECC73D702D09A`.

## Investigação do QR como alvo

O fluxo anterior apontava o MindAR para `card.mind`, compilado a partir da imagem do exemplo oficial, não do QR do projeto. O MindAR exige a compilação de imagens-alvo; decodificar a URL do QR não substitui esse alvo. A documentação oficial descreve [compilação de imagens](https://hiukim.github.io/mind-ar-js-doc/quick-start/compile/) e a [API do compilador](https://hiukim.github.io/mind-ar-js-doc/core-api/). Sem um arquivo compilado e teste físico do QR final, aquele caminho não comprovava rastreamento do próprio QR 02.

A solução implementada usa [jsQR](https://github.com/cozmo/jsQR), que devolve o conteúdo e os quatro cantos do QR. Só é aceito o conteúdo exato `https://origem-atual/ra.html`; QR 01, URLs de outro site ou uma seleção de lenda por query não posicionam o baú. Não é necessário reempacotar uma imagem `.mind` a cada alteração de domínio.

`public/qr-pose.js` resolve uma homografia entre um quadrado de largura 1 e os quatro cantos detectados. Assume câmera pinhole com campo vertical de 60 graus, normaliza as colunas da homografia e ortogonaliza a rotação. O resultado é convertido ao referencial da câmera Three.js. O rastreador ajusta a projeção ao recorte central `object-fit:cover` do vídeo, exige duas leituras válidas e suaviza a pose. Sem detecção por 350 ms, esconde o baú e impede iniciar outra abertura. A câmera é solicitada apenas após um toque explícito.

**É uma pose aproximada de um alvo visual, não uma âncora espacial persistente.** Não há calibração de intrínsecos ou distorção da lente, SLAM, oclusão pelo ambiente ou profundidade real. A escala é relativa à largura do QR, não medida em metros. Câmera sintética e projeções matemáticas não provam estabilidade com papel, reflexos, movimento e lentes reais. Não foi feito teste físico; não se afirma que o baú está ancorado corretamente em um celular real.

## Verificações automáticas

Com PostgreSQL de testes, API e Vite ativos, execute no PowerShell:

```powershell
Set-Location C:\Users\User\bau-das-lendas
node --test tests/api-ra.test.mjs tests/qr-pose.test.mjs
node tests/backend-http-smoke.mjs
node tests/visual-browser.mjs
npm run build
```

`visual-browser.mjs` usa o Chrome instalado em `C:/Program Files/Google/Chrome/Application/chrome.exe`. Para outro executável, defina `$env:EDITOR_TEST_BROWSER='C:/caminho/chrome.exe'`. O script exige Playwright instalado por `npm install`. Use somente um banco de desenvolvimento/teste: ele cria contas e descobre cartas reais nesse banco.

O teste do navegador executa dois contextos independentes: desktop e celular emulado. Faz cadastro pela interface, scroll 3D, abertura da capa, arrasto por mouse no desktop e toque via Chrome DevTools no celular. Verifica `transform` durante a abertura e `clip-path:polygon` durante a dobra; captura a dobra antes de soltar o gesto. Há 60 posições, inicialmente bloqueadas.

O teste transforma o SVG do QR 02 produzido pelo próprio site em frames de uma câmera sintética. A página executa o leitor jsQR e o renderer Three.js reais. Usa autenticação, sorteios e álbum do PostgreSQL real. A primeira requisição é interrompida para verificar a reutilização da chave; depois testa reenquadramento com uma nova chave, as três faces e cartas descobertas clicáveis no álbum. Esse recurso existe apenas no teste, não no produto.

As imagens ficam em `tests/artifacts/visual/`: capas, páginas, dobras e cartas em desktop e celular. A pasta é ignorada pelo Git. O teste não usa a câmera física nem representa validação em Android/iOS reais.

Resultados executados em 02/11/2026:

| Verificação | Resultado |
| --- | --- |
| Pytest com SQLite e PostgreSQL 18.3 | 24 passaram; 2 ignorados apenas na variante SQLite |
| Node: cliente/RA e pose do QR | 9 passaram, sem falhas |
| Chrome desktop com PostgreSQL real | Fluxo completo aprovado |
| Chrome com celular emulado e toque | Fluxo completo aprovado |
| Teste HTTP pelo proxy Vite | Aprovado |
| TypeScript e `npm run build` | Aprovados; aviso de bundle acima de 500 kB |

O Pytest também mantém um aviso de depreciação do cliente HTTP. Os dois cenários de Chrome confirmaram login após logout, decodificação dos dois QRs, interrupção/retry da abertura, nova chave após reenquadrar e cartas descobertas clicáveis. Nenhum erro JavaScript não tratado foi detectado.

Arquivos principais alterados: `src/{App,Album,Conta,Portais}.tsx`, `src/{album,style}.css`, `src/experience/World3D.tsx`, `public/ra.{html,js}`, `public/marcador.html`, `qrcodes.html`, `package.json`, `package-lock.json`, `.gitignore`, `tests/api-ra.test.mjs`, `LEIA-ME.txt` e `backend/README.md`.

Criados: `public/qr-pose.js`, `public/qr-tracker.js`, bibliotecas/licenças locais em `public/vendor/`, `scripts/preparar-leitor-qr.mjs`, `tests/qr-pose.test.mjs`, `tests/visual-browser.mjs` e este documento. O build regenera `dist/` e sincroniza `src/data/lendas.ts`. Não houve alteração no código Python, migrations ou catálogo.

## Validação manual pendente

1. Publique por HTTPS com `/api` na mesma origem e configure cookie seguro e `ALLOWED_ORIGINS`, conforme `backend/README.md`.
2. Defina a URL pública estável em `VITE_PUBLIC_URL`; abra Portais e imprima os dois códigos. O endereço impresso do QR 02 deve ser o mesmo domínio efetivamente aberto no celular, sem redirecionamento para outra origem.
3. Em Android Chrome e iPhone Safari, escaneie o QR 02 pelo leitor do sistema, faça login se necessário e inicie a câmera. O mesmo QR deve ficar impresso ou exibido em outra tela. Não há segundo alvo.
4. Confira a posição e rotação do baú em diferentes ângulos e distâncias, com boa iluminação, sem cobrir o QR. Verifique jitter, perda/reentrada do alvo, orientação do aparelho e custo de bateria. A detecção pode falhar com QR pequeno, reflexo, dobra ou desfoque.
5. Abra o baú, vire as três faces, use ESCANEAR NOVAMENTE e confirme que o álbum da mesma conta recebe as cartas, inclusive depois de fechar/reabrir o navegador. Teste outra conta sem compartilhar a coleção.
6. No grimório, arraste para frente e para trás no papel e nos cantos; abra cartas descobertas, confira retrato/paisagem e teste permissão de câmera negada, sessão expirada e perda de rede.

## Compatibilidade e próximos ajustes possíveis

O leitor é JavaScript e não depende de `BarcodeDetector`, cuja disponibilidade varia entre navegadores. Ainda exige HTTPS (ou localhost), `getUserMedia`, vídeo inline, Canvas 2D e WebGL. Navegadores internos de redes sociais podem restringir câmera; abra no navegador completo. Three.js e jsQR são servidos localmente; fontes externas têm fallback local do sistema.

O livro usa Pointer Events, ResizeObserver e CSS clip-path; o motor declara suporte a Chromium/WebKit e mantém [limitações próprias de dispositivos físicos](https://github.com/gul-labs/flipbook). Preferência de movimento reduzido continua sendo respeitada: nesse modo, as viradas podem ser instantâneas por acessibilidade.

Se o teste físico reprovar a estabilidade, a próxima medida compatível é calibrar a câmera e usar um solucionador planar de pose com análise de erro de reprojeção, mantendo exatamente o mesmo QR 02 como quadrado de referência. Outra opção é compilar a arte exata desse QR no MindAR e comparar a estabilidade, sem imprimir ou mostrar um terceiro marcador. Nenhuma dessas opções deve ser declarada aprovada sem medições físicas.

## Refinamento cinematográfico e aparições

A rolagem para baixo ou o gesto de arrastar inicia a travessia sem exigir um clique; a ação **Entrar agora** permanece como alternativa discreta e **Invocar o baú em RA** continua acessível na entrada e no menu. O progresso é fracionário, arredondado apenas para selecionar o registro, e move a câmera com aceleração suave. Teclado, navegação do catálogo e limites 1–60 continuam ativos.

O corredor recebeu luz ambiente difusa, recortes frios nas janelas sem montantes repetitivos, menos partículas e menos peças decorativas. O portal mantém as duas portas deslizantes. Aparições são malhas/objetos 3D inseridos na cena, em locais pré-determinados, uma por vez e uma vez por visita:

| Registro | Aparição |
| --- | --- |
| Peter Stumpp | Silhueta quadrúpede corre ao fundo e cruza atrás das colunas laterais |
| Loira do Banheiro | Figura feminina breve no espelho lateral |
| Kisaragi Station | Trem escuro distante e placa temporária |
| Três pontos ao longo do corredor | Olhos piscam nas sombras; exigem olhar para uma lateral e somem ao mudar de registro |
| Hachishakusama | Presença imóvel, alta e distante |
| Encontro ambiental no meio do percurso | Saci de uma perna, gorro vinho sutil e fumaça escura curta |
| A Ilha das Bonecas | Boneca na janela, com um movimento curto da cabeça |

O Saci é apenas um easter egg ambiental: a busca no catálogo atual não encontrou essa lenda, e nenhuma entrada, história ou carta foi inventada. Não há áudio nem jumpscare. As aparições usam geometria local, sem imagens coladas na tela ou modelos/rigs externos. Para manter custo previsível no celular, o espelho usa uma textura procedural com a figura restrita à sua moldura — **não é um reflexo renderizado em tempo real**. A criatura e as sombras são elementos de cena; a oclusão completa e a estabilidade precisam ser confirmadas em aparelhos físicos.

### Acionamento de teste (somente desenvolvimento)

Inicie `npm run dev`, abra uma das URLs abaixo e use a rolagem para iniciar a travessia. Os parâmetros existem apenas no modo de desenvolvimento, posicionam as aparições de teste perto da câmera e não adicionam controles à interface:

```text
http://localhost:5175/?assombracao=lobo
http://localhost:5175/?assombracao=espelho
http://localhost:5175/?assombracao=olhos
http://localhost:5175/?assombracao=alta
http://localhost:5175/?assombracao=saci
http://localhost:5175/?assombracao=estacao
http://localhost:5175/?assombracao=boneca
http://localhost:5175/?assombracao=todos
```

`todos` dispara cada evento em sequência, com uma pausa curta entre eles. O modo reduzido mantém os eventos estáticos e sem corrida ou balanço.

### Verificação do refinamento

Nesta alteração, `npm run build` passou (com o aviso preexistente de bundle acima de 500 kB), os nove testes de RA/QR passaram e o navegador confirmou a entrada por scroll, a progressão de registros e a abertura/fechamento do dossiê, sem erros de console. O backend não estava disponível durante esta verificação; por isso, login, progresso autenticado e sorteio com PostgreSQL não foram revalidados aqui. O teste não usou câmera física.
