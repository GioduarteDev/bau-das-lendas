# Como colocar a Casa no seu projeto (passo a passo)

A Casa (corredor, cartas, portas, sustos) é feita só com HTML, CSS e JavaScript.
Ela vai morar **dentro** do seu projeto, numa pasta chamada `casa`, e o Vite
serve ela sozinho. Você **não precisa mexer** no React, no backend nem na RA.

---

## 0. Antes de tudo: faça um backup
Copie a pasta inteira do seu projeto e cole em outro lugar (por exemplo na
Área de Trabalho) com o nome `projeto-backup`. Assim, se algo der errado,
é só voltar.

## 1. Extraia o zip
1. Ache o arquivo `casa.zip` nos seus Downloads.
2. Clique com o **botão direito** → **Extrair tudo…** → **Extrair**.
3. Vai aparecer uma pasta `casa`. Dentro dela tem `index.html`, `css`, `js`…

## 2. Abra seu projeto no VS Code
1. Abra o VS Code.
2. **Arquivo → Abrir Pasta…** e escolha a pasta do seu projeto (aquela que tem o
   `package.json`, o `vite.config.ts` e a pasta `src`).

## 3. Ache (ou crie) a pasta `public`
Olhe na barra lateral esquerda do VS Code (o "Explorer"):
- Se já existir uma pasta **`public`** ao lado de `src`, ótimo.
- Se **não** existir: clique com o botão direito no espaço vazio da barra
  lateral → **Nova Pasta** → digite `public` → Enter.

> Tudo que fica em `public` o Vite entrega do jeito que está, sem compilar.
> É por isso que a Casa funciona lá dentro sem mexer no React.

## 4. Coloque a pasta `casa` dentro de `public`
Arraste a pasta `casa` (do passo 1) para **cima da pasta `public`** no VS Code.
No final tem que ficar assim:

```
seu-projeto/
├─ public/
│  └─ casa/
│     ├─ index.html
│     ├─ css/
│     └─ js/
├─ src/
├─ backend/
├─ index.html
├─ package.json
└─ vite.config.ts
```

⚠️ Confira se **não** ficou `public/casa/casa/index.html` (pasta dentro de pasta).
Se ficou, arraste a `casa` de dentro um nível para cima.

## 5. Ligue o projeto como você sempre faz
1. Ligue o **backend** do jeito do seu `backend/README.md` (para a conta e o Grimório).
2. No VS Code, abra o terminal: **Terminal → Novo Terminal**.
3. Digite e aperte Enter:
   ```
   npm run dev
   ```
4. Espere aparecer `Local: http://localhost:5175/`.

## 6. Abra a Casa
No navegador, abra:

```
http://localhost:5175/casa/
```

⚠️ Com a **barra no final** (`/casa/`). Sem a barra, a página pode abrir sem estilo.

Clique em **ENTRAR MESMO ASSIM**, mexa o mouse e role a rodinha. 🎉

## 7. Ligue os links com o seu site
Abra `public/casa/js/config.js`. Ele tem 5 linhas:

```js
Bau.ROTAS = {
  inicio:   '/',
  grimorio: '/',
  conta:    '/',
  portais:  '/?portais=1',
  ra:       '/ra.html'
};
```

- `ra` e `portais` já estão certos (são os mesmos do seu projeto).
- Em `grimorio` e `conta`, coloque o endereço onde essas telas abrem no seu
  site. Exemplo: se o Grimório abre em `http://localhost:5175/?grimorio=1`,
  troque para `grimorio: '/?grimorio=1',`.
- Salve com **Ctrl + S** e atualize o navegador.

## 8. (Opcional) Um botão no seu site que leva para a Casa
No seu React, em qualquer menu ou botão, um link simples já funciona:

```tsx
<a href="/casa/">Entrar na casa</a>
```

Dica: aperte **Ctrl + Shift + F** no VS Code e pesquise `Explorar` ou
`INVOCAR` para achar onde fica o menu do seu site.

## 9. No celular / QR code
O seu QR 01 aponta para o endereço público (`VITE_PUBLIC_URL`). Para abrir a
Casa, é o mesmo endereço com `/casa/` no final:

```
https://seu-endereco-publico/casa/
```

## 10. Para a apresentação
| O que fazer | Como |
|---|---|
| Disparar um susto na hora | teclas `1` a `9` e `0` (veja o `LEIA-ME.md`) |
| Noite de lua cheia | `http://localhost:5175/casa/?lua=cheia` |
| Hora morta (3h) | `http://localhost:5175/casa/?hora=3` |
| Projetor muito claro | `http://localhost:5175/casa/?brilho=1.6` |
| Juntar tudo | `http://localhost:5175/casa/?lua=cheia&brilho=1.5` |
| Tela cheia | aperte **F11** |
| Som | clique em **ENTRAR** (o navegador só libera som depois de um clique) |

## 11. Quando for publicar (build)
```
npm run build
```
A Casa vai junto, para dentro de `dist/casa/`. Não precisa fazer mais nada.

---

## Deu problema?
| Sintoma | Solução |
|---|---|
| Página branca ou sem estilo | confira a barra no final: `/casa/` |
| "404" ou "não encontrado" | a pasta tem que estar em `public/casa/index.html` (passo 4) |
| Fontes estranhas | as fontes vêm da internet; conecte o computador |
| Sem som | clique em ENTRAR ou no botão **SOM** no canto de baixo |
| Mudei algo e não aparece | **Ctrl + F5** no navegador (limpa o cache) |
| Ficou lento no notebook | feche outras abas; em `css/estilo.css` diminua `--brilho` ou use o Chrome |
| Quer ver erros | aperte **F12** → aba **Console** |
