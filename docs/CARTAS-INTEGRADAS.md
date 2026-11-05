# Cartas ilustradas, flip e demonstração — 05/11/2026

Integração realizada na pasta oficial. **Oito cartas integram a coleção PostgreSQL; Saci Pererê fica em exposição**, conforme escolha da usuária. Os 60 IDs, números, histórias e atributos oficiais foram preservados. Boitatá continua na posição 55, com espaço para sua futura imagem. Nenhum push ou deploy foi realizado.

## Funcionalidades entregues

- Os nove JPG fornecidos são exibidos inteiros, sem recorte, edição ou distorção. Os arquivos originais não foram alterados.
- O mapa `public/card-art.js` vincula oito imagens aos IDs oficiais. `kayako-saeki`, usado no protótipo da casa, é normalizado para `a-maldicao-de-kayako-saeki`.
- Saci não recebe um ID na tabela oficial, posição no álbum, sorteio ou desbloqueio. Ele aparece como exposição na galeria, em uma peça extra no corredor e por um link no Grimório.
- A casa usa os 60 registros oficiais. O adaptador reutiliza a decoração existente; registros provisórios da casa não viram cartas fictícias no banco.
- Casa e página de cartas consultam a mesma API autenticada do Grimório React. Estado da coleção fica apenas em memória e é reconsultado ao voltar à janela/aba. Não se lê nem se grava `bau-grimorio` no código ativo; valores antigos nessa chave são ignorados.
- Uma atualização limpa imediatamente a coleção anterior. Respostas atrasadas e mudança de conta durante a consulta são descartadas. Logout e troca de conta removem as cartas antigas da interface.
- Clicar numa carta lacrada não a concede. O dossiê encaminha para o baú em RA; cartas já coletadas encaminham ao Grimório oficial.
- Flip compartilhado entre galeria, dossiê da casa e inspeção no Grimório: frente → verso → frente; clique, toque, Enter e Espaço; nome acessível, estado pressionado, foco visível e movimento reduzido. Os versos SVG foram reaproveitados dos desenhos originais, com a curva de rotação, inclinação, brilho e som de virada.
- A ficha na galeria apresenta origem, ameaça, encontro e história oficiais. Os antigos XP, raridades, danos e números paralelos do protótipo não são usados como dados oficiais.
- O Grimório mantém seus controles de história e terceira face. A ilustração da primeira face recebe também o flip frente/verso.
- Imagem ausente apresenta fallback. Ampliação tem fechamento acessível, contenção de foco e limite de tamanho, inclusive em paisagem.
- Jardim, fachada, câmera, cálculos do scroll, saída pelo scroll, portas, aparições e easter eggs foram preservados. Corrigiu-se também `Bau is not defined` na inicialização de `config.js`.
- A RA mantém rastreamento, sorteio e três faces. Somente o encaixe da imagem mudou para `contain`, necessário para mostrar a nova carta inteira.

## Correspondências oficiais

| Número | ID oficial | Imagem |
| --- | --- | --- |
| 1 | `loira-do-banheiro` | `loira.jpg` |
| 2 | `a-maldicao-de-kayako-saeki` | `kayako.jpg` |
| 3 | `kiyohime` | `kiyohime.jpg` |
| 4 | `tamamo-no-mae` | `tamamo.jpg` |
| 5 | `kisaragi-station` | `kisaragi.jpg` |
| 6 | `hachishakusama` | `hachishakusama.jpg` |
| 7 | `meng-jiangnu` | `meng-jiangnu.jpg` |
| 8 | `kuldhara` | `kuldhara.jpg` |
| Exposição, sem número oficial | `saci-perere` | `saci.jpg` |

Todos os caminhos partem de `/casa/img/cartas/`. Há 52 lendas oficiais sem imagem; lista completa em [IMAGENS.md](IMAGENS.md).

## Conta de demonstração

Foi criada no PostgreSQL de desenvolvimento pela autenticação HTTP real do projeto. Cadastro e login foram executados, as oito concessões foram persistidas e a API do álbum confirmou o resultado. O script foi executado novamente e retornou **zero novas concessões**, sem duplicar cartas. Seu progresso inicial é **8/60**; Saci não aumenta esse número.

`backend/demo_account.py`:

- exige `APP_ENV=development` e `BAU_ENABLE_DEMO_ACCOUNT=1`;
- recusa `APP_ENV=production`, mesmo com a flag de demonstração ativa;
- aceita apenas o PostgreSQL local `127.0.0.1:55432/bau`, com diretório de dados exatamente igual a `backend/.pg-local`;
- exige autenticação pela origem local `localhost:5175` ou `127.0.0.1:5175`;
- cria e autentica a conta pela API existente, sem login especial ou rota de concessão;
- concede cartas somente ao usuário de demonstração identificado no arquivo local, com lock e sem duplicação;
- não modifica o algoritmo de sorteio, snapshots idempotentes, senhas ou coleções de outros usuários;
- gera senha aleatória. E-mail, senha e ID ficam em `backend/.demo-account.local.json`, ignorado pelo Git e Docker;
- o Vite bloqueia por HTTP toda a pasta `backend`, inclusive URLs diretas e `/@fs/`. O bloqueio foi testado com resposta 403, preservando `/api`. Na revisão final, a senha aleatória da demonstração foi renovada e suas sessões anteriores expiradas, sem apagar contas ou cartas;
- mostra credenciais somente quando a saída é um terminal interativo local. Saída capturada ou redirecionada não recebe a senha.

Não há senha fixa no código. As credenciais não aparecem neste relatório nem nos logs dos testes.

## Executar o projeto

Terminal 1, PowerShell:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas\backend
.venv/Scripts/python.exe local_postgres.py
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL indisponível.' }
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.services.catalog
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas
npm run dev
```

Se API e Vite já estiverem ativos nas portas 8000 e 5175, use os serviços existentes. Não é necessário iniciar uma segunda instância.

Os hooks `predev` e `prebuild` sincronizam imagens e catálogo TypeScript. Se as imagens forem alteradas futuramente, sincronize também o catálogo no banco com `python -m app.services.catalog`, pela pasta backend, antes de demonstrar.

## Preparar a conta ou mostrar o acesso

Em um **terminal local interativo**, com API/Vite/PostgreSQL ativos:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas
$env:APP_ENV = 'development'
$env:BAU_ENABLE_DEMO_ACCOUNT = '1'
backend/.venv/Scripts/python.exe backend/demo_account.py
```

Esse comando pode ser repetido e mostra o e-mail e a senha aleatória apenas no seu terminal. Para consultar novamente sem conceder cartas:

```powershell
backend/.venv/Scripts/python.exe backend/demo_account.py --show-credentials
```

Não use redirecionamento nem compartilhe o arquivo de credenciais. Ao terminar o uso dos comandos de demonstração, pode remover as flags desse terminal:

```powershell
Remove-Item Env:BAU_ENABLE_DEMO_ACCOUNT -ErrorAction SilentlyContinue
Remove-Item Env:APP_ENV -ErrorAction SilentlyContinue
```

Se o banco estiver indisponível ou apontar para outra instância, o script encerra com erro; não usa SQLite ou outro banco como alternativa.

## Apresentar as cartas

1. Acesse `http://localhost:5175/?conta=1` e entre com os dados exibidos no terminal.
2. Abra `http://localhost:5175/?album=1`. O Grimório mostra oito posições descobertas. Avance as folhas e abra uma carta. Clique na ilustração ou use Enter/Espaço para virar; os controles do Grimório continuam disponíveis para a história e a terceira face.
3. Abra `http://localhost:5175/casa/cartas.html`. As oito oficiais estão desbloqueadas e o Saci aparece identificado como exposição. Use AMPLIAR para ver uma carta maior; a ficha da lenda pode ser expandida abaixo da carta.
4. Para abrir diretamente o extra: `http://localhost:5175/casa/cartas.html?carta=saci-perere`.
5. Abra `http://localhost:5175/casa/index.html`. Role atravessando o jardim e a porta. As cartas descobertas aparecem ilustradas nas paredes; use as setas/Próxima lenda e ABRIR DOSSIÊ, ou clique na carta. No dossiê, clique/toque na ilustração para virar. O Saci é uma peça extra de exposição perto da entrada.
6. Feche o dossiê e role para trás para sair da casa. Atualize a página ou saia e entre novamente: a coleção permanece no PostgreSQL.

## Testes e resultados reais

| Estado | Verificação | Resultado |
| --- | --- | --- |
| APROVADO | Python + PostgreSQL real | **34 passaram; 2 ignorados** somente na variante SQLite dos testes de concorrência. Guardas da demonstração, concessão repetível, isolamento e sorteio após a concessão estão cobertos. |
| APROVADO | Node focado em coleção, imagens, API/RA, QR e rastreador | **14 passaram**. IDs, hashes das fontes, oito vínculos oficiais, exclusão de Saci e descarte de respostas de outra conta verificados. |
| APROVADO | `tests/cards-official-browser.mjs` | Desktop e celular emulado: login da conta real, nove imagens, oito oficiais, Saci separado, frente/verso, toque/teclado, movimento reduzido, ampliação em paisagem, reload, Grimório, dossiê, entrada/saída pelo scroll e isolamento. LocalStorage forjado não concedeu cartas. |
| APROVADO | `tests/integration-browser.mjs` | Fluxo de cadastro, sessão, QR, baú, sorteio, três faces, álbum, logout e novo login; desktop/celular emulado. API e banco reais; câmera sintética. |
| APROVADO | `tests/assets-browser.mjs` | 60 sorteios sem repetição em conta de teste separada, novas artes no catálogo/Grimório/RA, recuperação do sorteio real da Loira por sua chave, fallback de JPG ausente e link de login. |
| APROVADO | `tests/backend-http-smoke.mjs` | HTTP real, proxy, assets, health, autenticação, coleção e idempotência. |
| APROVADO | Script de demonstração repetido | Primeira execução concedeu oito; repetição concedeu zero. Execução com produção foi bloqueada antes de concessões. |
| APROVADO | `npm run build` | TypeScript e Vite concluídos. Persiste o aviso de tamanho do bundle principal. |
| APROVADO | Publicação/segredos | Arquivo de credenciais ignorado por Git/Docker e acesso HTTP bloqueado pelo Vite. Nenhuma ocorrência dos segredos locais reais nos arquivos candidatos à publicação. |
| FALHOU, preexistente | Suíte Node completa | **30 passaram e 1 falhou**: `tests/hauntings.test.mjs:15` espera a sequência antiga de demonstração das assombrações. Esse teste e os efeitos correspondentes não foram alterados para esconder a divergência. |
| PENDENTE | RA em Android/iPhone físico | Não executada. Câmera sintética e viewport emulado não validam rastreamento físico. |

Os testes de navegador criam contas/cartas reais de verificação, preservadas no banco de desenvolvimento. Eles não substituem a conta de demonstração. Erros intermediários de seletores e expectativas antigas de WebP foram corrigidos para o contrato atual e repetidos; as falhas não foram apresentadas como aprovação.

Comandos para repetir:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas
backend/.venv/Scripts/python.exe backend/run_tests.py
node --test --test-isolation=none tests/collection.test.mjs tests/images.test.mjs tests/api-ra.test.mjs tests/qr-pose.test.mjs tests/qr-tracker.test.mjs
node --test --test-isolation=none tests/*.test.mjs
node tests/cards-official-browser.mjs
node tests/integration-browser.mjs
node tests/assets-browser.mjs
node tests/backend-http-smoke.mjs
npm run build
```

Os testes de navegador exigem a conta de demonstração preparada e Chrome instalado. Capturas estão em `tests/artifacts/cards-official/`. A suíte Node completa continua terminando com falha devido ao teste de assombrações descrito acima.

## Arquivos modificados/criados nesta integração

- Backend: `backend/app/core/config.py`, `backend/demo_account.py`, `backend/tests/test_demo.py`.
- React: `src/Album.tsx`, `src/Conta.tsx`, `src/LegendImage.tsx`, `src/IllustratedCard.tsx`, `src/data/lendas.ts` gerado.
- Dados compartilhados: `public/card-art.js`, `public/lendas-ra.json` somente caminhos de imagens, `public/legend-images.js`, `public/lendas/manifest.json`.
- Casa: `public/casa/index.html`, `cartas.html`, `js/config.js`, `js/main.js`, `js/corredor.js`, `js/cartas.js`, `js/cartas-flip.js`, novos `js/colecao.js`, `js/house-catalog.js`, `js/card-view.js`, `css/cartas.css`, `css/card-view.css` e os dois versos `img/verso-{boitata,vitral}.svg` extraídos dos originais.
- RA: `public/ra.html`, somente `object-fit:contain` da imagem.
- Sincronização: `package.json`, `scripts/sincronizar-imagens.mjs`, `scripts/preparar-imagens.py` agora encaminha ao sincronizador sem recortar as cartas.
- Testes: `tests/images.test.mjs`, `tests/collection.test.mjs`, `tests/assets-browser.mjs`, `tests/cards-official-browser.mjs`.
- Documentação/exclusões: `.gitignore`, `.dockerignore`, `docs/IMAGENS.md`, este relatório e links nos relatórios anteriores/README.
- Servidor de desenvolvimento: `vite.config.ts`, bloqueio HTTP dos arquivos privados do backend, mantendo os padrões de exclusão originais do Vite e o proxy da API.

Nenhuma alteração foi feita em `public/casa/css/estilo.css`, `jardim.js`, `aparicoes.js`, `decor.js`, `som.js`, `easter-eggs.js` ou no serviço de sorteios. Os JPG fornecidos e as artes anteriores foram preservados. O catálogo local de decoração em `lendas.js` continua disponível; o adaptador aplica os 60 dados oficiais em tempo de execução.
