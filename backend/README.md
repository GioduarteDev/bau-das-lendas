# Backend do Baú das Lendas

> Cartas e demonstração (05/11/2026): [integração atual e comandos seguros da conta de teste](../docs/CARTAS-INTEGRADAS.md). São oito cartas oficiais e Saci em exposição, conforme decisão da usuária; o catálogo continua com 60 lendas.

> Auditoria atual de 04/11/2026: veja [relatório e comandos locais](../docs/AUDITORIA-FINAL.md). Nesta cópia, a instância local autorizada usa `127.0.0.1:55432`, pasta `backend/.pg-local`, e credenciais geradas em `backend/.env`. Execute `local_postgres.py` pela pasta backend para iniciá-la novamente. O serviço PostgreSQL do Windows e seus dados não foram alterados. Os resultados anteriores abaixo são históricos; o relatório atual separa testes executados de pendências físicas.

FastAPI, Python 3.12+, PostgreSQL, SQLAlchemy 2 e Alembic. O frontend continua em React e a RA usa Three.js com leitura do próprio QR 02 por jsQR. Há somente dois QR Codes: QR 01 abre o site/conta/álbum, QR 02 abre a RA. Nenhum QR representa uma carta. A etapa visual e suas limitações estão em [Validação visual](../docs/VALIDACAO-VISUAL.md).

## Executar no Windows PowerShell com Docker Desktop

Instale/inicie Docker Desktop com suporte a containers Linux. Os comandos partem da raiz do repositório e geram segredos locais; não sobrescreva um `.env` existente.

```powershell
Set-Location C:\Users\User\bau-das-lendas
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.lock.txt
Set-Location backend
if (Test-Path .env) { throw 'Já existe .env: preserve sua configuração.' }
$senhaBau = & .venv/Scripts/python.exe -c "import secrets; print(secrets.token_urlsafe(32))"
$segredoBau = & .venv/Scripts/python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
$configBau = (Get-Content .env.example -Raw).Replace('SUBSTITUA_PELA_SENHA_LOCAL', $senhaBau).Replace('SUBSTITUA_POR_UM_SEGREDO_ALEATORIO_DE_48_BYTES', $segredoBau)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $configBau, [System.Text.UTF8Encoding]::new($false))
docker compose up --build -d
docker compose logs api
```

O Compose espera o banco, aplica migrations e importa as 60 lendas antes de iniciar a API. Banco em `localhost:5432`, API em `localhost:8000`, Swagger em `http://localhost:8000/docs`. O volume `bau_data` persiste dados. `docker compose down` para os serviços, preservando o volume.

Em outro terminal:

```powershell
Set-Location C:\Users\User\bau-das-lendas
npm run dev
```

Abra **http://localhost:5175**, entre em **Conta**, crie sua conta e abra o Grimório ou a RA. O Vite encaminha `/api` ao FastAPI. Use o mesmo hostname: cookies de `localhost` e `127.0.0.1` são independentes. `VITE_PUBLIC_URL` configura somente o endereço dos QR Codes.

## Executar Python diretamente

Com o ambiente e o `.env` acima, suba somente o banco. Pare a API do Compose antes para liberar a porta 8000:

```powershell
Set-Location C:\Users\User\bau-das-lendas\backend
docker compose stop api
docker compose up -d db
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.services.catalog
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Sem Docker, configure `DATABASE_URL` no `.env` com banco e usuário PostgreSQL próprios e execute os três últimos comandos. A API não cria tabelas implicitamente: aplique Alembic primeiro. O seed exige exatamente 60 IDs distintos e números 1–60, preserva todos os atributos e pode ser repetido. IDs extras no banco provocam erro sem apagar cartas. Não execute seeds simultâneos com sorteios em produção.

## Autenticação e publicação

Senha com Argon2id; JWT com expiração (120 minutos por padrão), issuer e audience. O token fica exclusivamente em cookie **HttpOnly**, `SameSite=Lax`, caminho `/api`. A tabela de sessões permite revogação no logout. Nenhum token é retornado ao JavaScript ou salvo em localStorage. Sessão expirada exige novo login.

Todos os POSTs exigem `Origin` na lista `ALLOWED_ORIGINS` e `X-Bau-Request: 1`, inclusive login/cadastro, para proteção CSRF. CORS aceita origens explícitas e credenciais. O cliente `public/api.js`, compartilhado com React e RA estática, envia esses headers e `credentials: include`; falhas e timeouts não geram cartas locais.

Em produção, sirva `dist` por HTTPS e configure um reverse proxy que encaminhe **`/api/*` ao FastAPI**, preservando caminho e headers, na mesma origem do site. Defina `COOKIE_SECURE=true`, `JWT_SECRET` aleatório e `ALLOWED_ORIGINS=["https://seu-dominio"]`. Para túnel HTTPS de desenvolvimento, inclua sua origem exata. Não publique `.env`. A RA usa URLs relativas `/api` e não usa `import.meta.env`. Esta estratégia pressupõe site e API na mesma origem pública, não domínios independentes.

O Swagger não envia automaticamente `X-Bau-Request`; para POSTs use o cliente do site ou HTTPX com os dois headers exigidos. Confirmação de e-mail, recuperação de senha e limitação operacional de tentativas de login não estão incluídas. Configure infraestrutura, backups e limites de tráfego antes da publicação pública.

## Rotas e sorteios

| Rota | Contrato |
| --- | --- |
| `POST /api/auth/register` | `{username,email,password}`; senha de 10–128 caracteres; inicia sessão |
| `POST /api/auth/login` | `{email,password}`; inicia sessão |
| `POST /api/auth/logout` | Revoga sessão atual e remove cookie |
| `GET /api/auth/me` | Usuário atual, sem password_hash |
| `GET /api/legends` | Catálogo público com 60 lendas completas |
| `GET /api/album` | Autenticado; posições ordenadas, descoberta e progresso |
| `GET /api/album/progress` | Autenticado; `total`, `obtained`, `remaining`, `complete` |
| `POST /api/draws` | Autenticado; header `Idempotency-Key`; corpo vazio ou `{}` |
| `GET /api/health` | Consulta ao banco, 503 em falha |

Álbum: cada posição bloqueada contém apenas `numero`, `unlocked=false`, `legend=null` e `collected_at=null`. Descobertas incluem carta e data. Histórias permanecem públicas no catálogo curatorial. As respostas da API não são armazenadas em cache.

Sorteio: `{id, legend, progress, remaining, complete}`. O servidor bloqueia a linha do usuário com `SELECT FOR UPDATE`, verifica a chave, consulta somente lendas restantes e escolhe com `secrets.randbelow(N)`. Carta e sorteio são persistidos na mesma transação. Constraints únicas protegem usuário/carta e usuário/chave. Não há limite diário, XP ou raridade. Campos extras no corpo são rejeitados.

Repetir uma chave devolve **o snapshot original inteiro**, mesmo após outros sorteios. Consulte `/album/progress` para o estado atual. Em 60/60, uma chave nova registra resultado idempotente com `legend=null`, `remaining=0`, `complete=true`. Falhas do banco retornam 503 sem detalhes internos. Se a resposta se perder após commit, repita a mesma chave.

Na RA, somente **ABRIR BAÚ** faz POST. A entrada na página e reconhecimento do alvo não sorteiam. A chave pendente fica em sessionStorage por usuário/aba para recuperar falhas ou reload; não é coleção nem credencial. **ESCANEAR NOVAMENTE** encerra a abertura e a seguinte usa nova chave. As três faces e a animação recebem a carta do servidor. O Grimório consulta o álbum ao abrir e recuperar foco; cartas descobertas usam dados da API, e falhas bloqueiam a coleção com mensagem.

## Testes

Sem PostgreSQL, a suíte executa testes funcionais em SQLite e ignora a variante PostgreSQL. SQLite não valida locks. Com PostgreSQL, cada teste cria e remove somente seu próprio schema `test_bau_<uuid>` e aplica a migration real. Use um banco separado e nunca produção.

Com o banco Compose iniciado:

```powershell
Set-Location C:\Users\User\bau-das-lendas\backend
docker compose exec db createdb -U bau bau_test
$senhaBau = ((Get-Content .env | Where-Object { $_ -match '^POSTGRES_PASSWORD=' }) -split '=', 2)[1]
$env:TEST_DATABASE_URL = "postgresql+psycopg://bau:${senhaBau}@127.0.0.1:5432/bau_test"
.venv/Scripts/python.exe -m pytest -q
Set-Location ..
node --test tests/api-ra.test.mjs
npm run build
```

Se `bau_test` já existe, não repita o comando `createdb`. Com Vite e API ativos, na raiz, `node tests/backend-http-smoke.mjs` verifica HTTP real e cria uma conta de teste no banco configurado. Esse teste também foi executado e passou nesta entrega, usando o PostgreSQL isolado. Para testes sem PostgreSQL:

```powershell
Set-Location C:\Users\User\bau-das-lendas\backend
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
.venv/Scripts/python.exe -m pytest -q
```

Cobertura: autenticação, cookies, revogação/expiração, validação, CSRF/CORS, seed idempotente, paridade entre migration e modelos, cartas bloqueadas, 60 e 59 candidatas, isolamento por jogador, 60 cartas sem repetição, constraints, rollback, indisponibilidade e oito sorteios simultâneos reais com chaves iguais/diferentes. Os testes Node executam cliente e fluxo da RA com câmera/Three.js simulados; validam retry, nova chave e recuperação da última carta. **Não validam câmera ou rastreamento físico.**

Resultados desta entrega: Python 3.13.7, PostgreSQL 18.3 isolado na porta 55432; **24 testes Python passaram, 2 casos de concorrência foram ignorados somente na variante SQLite**. **4 testes Node passaram; `npm run build` passou**, com aviso de tamanho do bundle. PostgreSQL foi encontrado em `C:/Program Files/PostgreSQL/18/bin`, fora do PATH. Docker não está instalado aqui: Compose ainda precisa ser executado em ambiente com Docker.

## Arquivos e limites

Criados: `backend/app/{core,db,models,schemas,routers,services}`, `backend/alembic`, testes Pytest, Dockerfile/Compose, dependências, configurações e este guia; `public/api.js`, `src/api.ts`, `src/Conta.tsx`, `tests/api-ra.test.mjs`, `tests/backend-http-smoke.mjs`, `.dockerignore`.

Alterados: `src/App.tsx`, `src/Album.tsx`, `public/ra.js`, `public/ra.html`, `vite.config.ts`, `.gitignore`, `.env.example`, `LEIA-ME.txt`. O build regenera `src/data/lendas.ts` do JSON original. CSS do álbum, catálogo e imagens foram preservados. Backup dos arquivos existentes alterados: `backup/pre-backend-20261102`.

Na etapa visual seguinte, o alvo MIND provisório foi substituído por leitura dos cantos do próprio QR 02, sem imagem-alvo adicional. **A implementação foi testada com câmera sintética; a estabilidade e a ancoragem visual ainda precisam ser validadas fisicamente no celular.** Ainda falta publicar a infraestrutura. O backend não renderiza 3D nem rastreia câmera. Veja [Validação visual](../docs/VALIDACAO-VISUAL.md) para detalhes e comandos dos novos testes.
