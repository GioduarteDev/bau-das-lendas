# Auditoria técnica — Baú das Lendas

> Atualização de 05/11/2026: veja [Cartas ilustradas e conta de demonstração](CARTAS-INTEGRADAS.md). Abaixo permanece o registro histórico da auditoria anterior.

Data: 04/11/2026. Projeto: `C:\Users\User\Downloads\bau-das-lendas`.

**Entrega técnica parcial, com backend e integração comprovados. O projeto não está aprovado para entrega definitiva: faltam validação física da RA, 58 imagens e resolução da divergência de teste das assombrações pelo responsável por essa parte.**

## 1. O que já existia e foi confirmado

- FastAPI, SQLAlchemy, Alembic e migração `0001`, com cinco tabelas de domínio e `alembic_version`.
- Senhas Argon2id; JWT com expiração, issuer e audience; cookie HttpOnly, SameSite=Lax e sessões revogáveis no banco.
- Proteção CSRF por origem explícita e header; rotas privadas bloqueiam acesso sem sessão.
- Catálogo curatorial com 60 IDs únicos, posições 1–60, atributos e histórias. A API retorna o catálogo real do banco.
- Sorteios transacionais, escolha entre cartas restantes, lock por usuário no PostgreSQL e chave idempotente. Constraints impedem cartas e chaves repetidas por conta.
- Grimório consulta a API ao abrir, recuperar foco e voltar à aba. Não existe coleção fictícia usada como sucesso.
- RA usa Three.js e jsQR locais; reconhece exatamente o QR 02 da origem atual. Nenhuma biblioteca de rastreamento foi substituída.

## 2. Problemas encontrados e correções

| Problema | Resultado |
| --- | --- |
| Sem `.env`, API parada, serviço PostgreSQL 18 instalado mas parado; Docker ausente | Instância local exclusiva autorizada pela usuária, sem alterar o serviço Windows ou seus dados. Credenciais aleatórias criadas em arquivo local ignorado. |
| Dependências Python globais incompatíveis com TestClient | Ambiente `backend/.venv` com o lock existente instalado. `pip check` passou. |
| Erros de validação podiam repetir campos enviados, inclusive senha | Handler 422 retorna mensagem genérica; testes comprovam ausência de senha e campos secretos. |
| Erros de configuração podiam incluir valores de ambiente | `hide_input_in_errors=True`; teste comprova que a representação textual não contém os segredos. |
| Health usava diretamente o engine, dificultando comprovar seu comportamento nos testes | Health executa `SELECT 1` pela dependência de sessão; sucesso e indisponibilidade foram testados. |
| Link de login dentro do HUD da RA não recebia clique | `pointer-events:auto` no link; clique validado no navegador. |
| Arte da Loira estava fora de `public`, sem associação | Ilustração extraída do arquivo fornecido, vinculada somente ao ID correto. A carta legada imprime XP, ameaça e total antigos; esses textos foram excluídos do recorte e não foram importados como dados. |
| Imagens sem variantes e sem tratamento de falha de carregamento | Variantes WebP, `srcset`, `sizes`, alt, carregamento adiado no React e fallback. Arte também usada na carta HTML e textura da carta 3D da RA. |
| Inicializador do banco e log dentro do diretório de dados interferiam no encerramento/recuperação | Script corrigido para não herdar pipes e gravar `backend/.pg-local-server.log`, fora dos dados. Reinicialização e persistência confirmadas. |
| `.gitignore` e `.dockerignore` incompletos | Acrescentados ambientes, variantes de `.env`, dados PostgreSQL, temporários, bancos locais, logs e artefatos. |

Nenhum arquivo de `public/casa`, geometria, efeito, fachada, CSS do Grimório ou navegação foi editado nesta auditoria. Em `src/App.tsx`, as alterações limitam-se à integração de imagens. O catálogo original recebeu somente o caminho da imagem da Loira; IDs, nomes, histórias, origens e atributos foram preservados.

## 3. PostgreSQL real

- PostgreSQL **18.3**, escutando apenas em `127.0.0.1:55432`.
- Dados persistentes em `backend/.pg-local`; configuração em `backend/.env`. Não compartilhar esses arquivos.
- Banco de demonstração `bau`; banco separado `bau_test` para testes. Nenhuma instalação existente foi apagada ou reconfigurada.
- Migração aplicada: **0001**. Catálogo real: **60 registros**, 60 IDs distintos, números 1–60.
- Chaves estrangeiras: duas em `user_cards`, duas em `draw_requests`, uma em `auth_sessions`. Unicidade de e-mail, posição, usuário/carta e usuário/chave confirmada.
- Os testes de concorrência executaram oito solicitações simultâneas com chaves iguais e diferentes no PostgreSQL real.
- Contas e cartas criadas pelos testes HTTP/navegador foram preservadas no banco local. Suas credenciais são descartáveis e não são contas para apresentação. Crie sua própria conta pela interface.
- `backend/audit_database.py` faz consultas somente de leitura e emite apenas metadados e contagens, sem dados pessoais. Snapshot final em `docs/EVIDENCIA-BANCO.json`.
- Os schemas efêmeros criados pela suíte ficam exclusivamente em `bau_test`; o teardown remove somente o schema UUID criado por cada teste. Nenhuma conta do banco `bau` foi removida.

O reinício recuperou contas e descobertas existentes. A API retornou 503 enquanto o banco estava indisponível, sem inventar resultados, e voltou a funcionar após a recuperação.

## 4. Testes executados

| Classificação | Execução | Resultado real |
| --- | --- | --- |
| APROVADO | `backend/.venv/Scripts/python.exe backend/run_tests.py` | **29 passaram, 2 ignorados**. Somente os dois casos de concorrência na variante SQLite foram ignorados; ambos executaram no PostgreSQL. |
| APROVADO | Testes Node de API/RA, QR/pose, rastreador e imagens | **12 passaram**. Incluem retry idempotente, recuperação em 60/60, tampa, emergência da carta, três faces, rejeição de QR, contexto seguro, permissão negada, perda e reenquadramento. |
| FALHOU | Suíte Node completa: `node --test --test-isolation=none tests/*.test.mjs` | **28 passaram e 1 falhou**. `tests/hauntings.test.mjs:15`: espera `olhos, espelho, saci, lobo, boitata`; catálogo atual contém `espelho, lobo, saci, alta, boitata`. Falha já existia antes das mudanças. Não foi alterada para esconder o erro nem houve edição na experiência protegida. |
| APROVADO | `node tests/backend-http-smoke.mjs` | Assets, proxy Vite, health no PostgreSQL, cadastro, cookie, sorteio, retry, álbum, logout e recuperação após login. |
| APROVADO | `node tests/integration-browser.mjs` | Chrome desktop e viewport de celular: cadastro/login, QR incorreto/correto, perda/retorno, abertura, três faces, carta salva, Grimório, reload, logout, novo login e isolamento entre contas. API/banco reais; **somente o vídeo é sintético**. |
| APROVADO | `node tests/assets-browser.mjs` | 60 cartas reais sem repetição; duas artes no catálogo/Grimório; recuperação do sorteio verdadeiro da Loira na RA com a chave original; imagem responsiva carregada na RA; fallback por falha de transporte; três faces e link de login clicável. Vídeo sintético. |
| APROVADO | TypeScript e `npm run build` | Compilação concluída. Aviso de bundle principal maior que 500 kB permanece. |
| APROVADO | `backend/.venv/Scripts/python.exe -m pip check` | Nenhuma dependência quebrada no ambiente isolado. Aviso de depreciação do uso de httpx pelo TestClient permanece, sem falhar os testes. |
| APROVADO | Regras de publicação | Git verificou a exclusão de `.env`, variantes, venv, dados PostgreSQL, bancos locais e artefatos; exemplos continuam incluídos. Busca dos segredos locais reais nos arquivos candidatos encontrou zero ocorrências. Não é garantia contra qualquer segredo histórico desconhecido. |
| IMPLEMENTADO | Imagem no dossiê React e textura 3D da carta | Código integrado e build aprovado. O carregamento da arte HTML na RA foi comprovado; a textura da carta durante a emergência não teve inspeção visual específica. O percurso do dossiê React não foi validado nesta auditoria. |
| PENDENTE | Câmera e estabilidade em aparelhos físicos | Nenhum Android/iPhone físico disponível para esta execução. |
| PENDENTE | HTTPS público, Docker Compose e publicação | Não executados; ambiente local não tem Docker. |

Falhas intermediárias de infraestrutura: TestClient global incompatível; permissões do sandbox sobre temporários e processos; espera incorreta por botão oculto no teste recém-criado; indisponibilidade durante ajuste do inicializador PostgreSQL. Foram corrigidas/contornadas e as verificações afetadas foram repetidas. As falhas intermediárias não foram contabilizadas como aprovação.

As suítes antigas de navegador dedicadas à casa e à navegação anterior não foram executadas nesta auditoria. O catálogo atualmente encaminha à casa oficial; não se alterou esse contrato para satisfazer testes antigos. A regressão automatizada desta entrega cobre Conta, catálogo, Grimório, API e RA; a validação visual completa da casa continua sob responsabilidade da frente que a modifica separadamente.

## 5. Autenticação, Grimório e RA

Autenticação: cadastro, login, normalização de e-mail, senha incorreta, sessão preservada, expiração/revogação, logout, bloqueio de acesso anônimo e isolamento foram comprovados. Produção deve usar HTTPS e cookie seguro. Recuperação de senha, confirmação de e-mail e limitação operacional de tentativas não estão implementadas.

Grimório: 60 posições, estados bloqueados/desbloqueados, coleção persistida após reload/novo login, três faces, arte carregada e fallback comprovados sem mudar o CSS ou o motor do livro.

RA: só o botão ABRIR BAÚ chama o sorteio. Reconhecer QR não concede carta. QR 01 e URLs de outra origem são rejeitados; perda/reenquadramento e retry foram testados. A pose continua aproximada, baseada nos quatro cantos e em câmera não calibrada. Estabilidade, escala e posição no mundo físico não estão aprovadas.

## 6. Imagens

- Integradas: `loira-do-banheiro` — Loira do Banheiro; `kuldhara` — Kuldhara.
- Seis arquivos WebP responsivos, com fontes originais preservadas. Nenhuma arte foi gerada ou baixada.
- Mapa completo dos 60 IDs: `public/lendas/manifest.json`; módulo compartilhado: `public/legend-images.js`.
- **58 faltantes**, com IDs e nomes exatos em [IMAGENS.md](IMAGENS.md).
- A procedência dos arquivos existentes não veio acompanhada de documentação de licença; essa confirmação permanece necessária antes da publicação pública.

## 7. Arquivos modificados/criados

Backend: `app/main.py`, `app/core/config.py`, `tests/test_game.py`, `tests/test_config.py`, `local_postgres.py`, `run_tests.py`, `audit_database.py`, `README.md`.

Frontend e assets: `src/App.tsx`, `src/Album.tsx`, `src/LegendImage.tsx`, `src/data/lendas.ts` (gerado), `public/ra.js`, `public/ra.html`, `public/lendas-ra.json` (somente o caminho da Loira), `public/legend-images.js`, `public/lendas/manifest.json`, `public/lendas/{loira-do-banheiro,kuldhara}-{320,640,960}.webp`.

Scripts/testes: `scripts/preparar-imagens.py`, `scripts/requirements-images.txt`, `tests/api-ra.test.mjs`, `tests/images.test.mjs`, `tests/qr-tracker.test.mjs`, `tests/integration-browser.mjs`, `tests/assets-browser.mjs`.

Publicação/documentação: `.gitignore`, `.dockerignore`, `docs/AUDITORIA-FINAL.md`, `docs/IMAGENS.md`, `docs/EVIDENCIA-BANCO.json`, `docs/CHECKLIST-CELULAR.md`.

Somente locais e ignorados: `backend/.env`, `.venv`, `.pg-local`, logs, temporários e `tests/artifacts`. O build regenerou `dist` e o leitor QR local a partir da dependência instalada.

## 8. Executar e demonstrar

Terminal 1, PowerShell:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas\backend
.venv/Scripts/python.exe local_postgres.py
if ($LASTEXITCODE -ne 0) { throw 'Verifique a inicialização do PostgreSQL.' }
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.services.catalog
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Não inicie uma segunda API se a porta 8000 já estiver ocupada pela API desta sessão. O inicializador do banco pode ser repetido e não sobrescreve `.env` nem apaga dados. Se o PostgreSQL estiver em outro caminho, defina `BAU_PG_BIN` com sua pasta `bin`.

Terminal 2:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas
npm run dev
```

Se a porta 5175 já estiver ocupada pelo Vite desta pasta, use o servidor existente. Abra `http://localhost:5175/?conta=1`, crie sua conta, abra Portais e deixe QR 02 em outra tela. Abra a RA, permita a câmera, aponte ao QR 02 e toque em ABRIR BAÚ. Abra o Grimório, saia e entre novamente para demonstrar persistência. Use sempre o mesmo hostname para preservar o cookie.

Testes e diagnóstico:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas
backend/.venv/Scripts/python.exe backend/run_tests.py
node --test --test-isolation=none tests/api-ra.test.mjs tests/qr-pose.test.mjs tests/qr-tracker.test.mjs tests/images.test.mjs
node --test --test-isolation=none tests/*.test.mjs
node tests/backend-http-smoke.mjs
node tests/integration-browser.mjs
node tests/assets-browser.mjs
npm run build
Set-Location backend
.venv/Scripts/python.exe audit_database.py
```

Os testes de navegador/HTTP criam contas e cartas reais no banco local e as preservam. Os scripts de navegador usam Chrome em `C:/Program Files/Google/Chrome/Application/chrome.exe`; configure `EDITOR_TEST_BROWSER` se necessário. O teste Node completo ainda termina com falha por causa das assombrações.

Para reinstalar dependências nesta cópia, sem mudar `.env`:

```powershell
Set-Location C:\Users\User\Downloads\bau-das-lendas
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
npm ci
```

Para regenerar as variantes das imagens, opcionalmente:

```powershell
backend/.venv/Scripts/python.exe -m pip install -r scripts/requirements-images.txt
backend/.venv/Scripts/python.exe scripts/preparar-imagens.py
```

## 9. Pendências para entrega/publicação

1. Executar [CHECKLIST-CELULAR.md](CHECKLIST-CELULAR.md) em Android/iPhone físico e em HTTPS.
2. Fornecer as 58 imagens faltantes e confirmar direitos das artes existentes.
3. Resolver com o responsável pela casa a divergência entre demonstração e teste de assombrações; revisar navegação/dossiês no trabalho paralelo.
4. Conferir infraestrutura pública, domínio, proxy `/api`, origens permitidas, cookie seguro e backups. Docker ainda não foi validado aqui.
5. Informar/conferir o repositório GitHub de destino antes de qualquer envio. Esta pasta não tinha `.git` na raiz; nenhum commit ou push foi feito. O repositório vazio em `tests/artifacts/publish-check.git` existe apenas para verificar regras de exclusão e está ignorado.

Evidências de navegador em `tests/artifacts/integration/`: desktop/celular emulado, baú, carta, Grimório, arte da Loira, fallback e arte da Loira na RA. Essas imagens e o vídeo sintético não substituem validação física.
