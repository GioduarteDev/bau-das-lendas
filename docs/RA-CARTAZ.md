# RA pelo cartaz da casa (MindAR)

**O que mudou.** O ritual em RA (`/ra.html`) agora reconhece uma **imagem**: o desenho da casa em traço
branco no preto (`public/alvos/casa.jpg`). O baú aparece ancorado na porta da casa desenhada.
O QR code continua existindo, mas só para **abrir** o ritual no celular.

| Peça | Arquivo |
| --- | --- |
| Imagem que a câmera reconhece | `public/alvos/casa.jpg` (mesmo desenho em `casa.svg`) |
| Dados de reconhecimento (MindAR) | `public/alvos/casa.mind` |
| Cartaz A4 para imprimir (casa + QR) | `/cartaz.html` (link no painel Portais) |
| MindAR 1.2.5 (local, licença MIT) | `public/vendor/mindar/` |
| `CSS3DRenderer` exigido pelo MindAR | `public/vendor/three-addons/` |
| Gerador de QR (licença MIT) | `public/vendor/qrcode-generator.js` |

## Como usar

1. Abra `/cartaz.html` e imprima em A4, **com cores de fundo** (o preto faz parte da imagem).
   Para gerar o QR com o endereço público: `/cartaz.html?url=https://seu-dominio`.
2. No celular: leia o QR, entre na conta, toque em **INICIAR CÂMERA** e aponte para a casa inteira.
3. Quando aparecer **ABRIR BAÚ**, toque. A carta sobe do baú, o celular vibra e as três faces aparecem.

## Contingência

`/ra.html?rastreio=qr` usa o rastreador antigo (o próprio QR 02 como alvo). Os testes de navegador
com vídeo sintético de QR usam esse modo.

## Se mudar o desenho do cartaz

Substitua `public/alvos/casa.jpg` e rode `node scripts/compilar-alvo.mjs` para gerar um novo `casa.mind`
(usa o Playwright já instalado; se pedir, rode `npx playwright install chromium`).
Imagens com muitos detalhes, contraste alto e sem padrões repetidos são reconhecidas melhor.

## Validação

- Testado em Chromium com câmera simulada (vídeo do cartaz girando e mudando de tamanho):
  a casa é encontrada em ~3 s, o baú abre e a carta é revelada.
- **Pendente:** teste em celular real (Android e iPhone) sob HTTPS. Anotar no `CHECKLIST-CELULAR.md`.
