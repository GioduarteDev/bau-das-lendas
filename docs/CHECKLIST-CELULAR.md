# Validação física da RA — pendente

Nenhum teste abaixo foi aprovado em aparelho físico nesta auditoria. Chrome com viewport de celular e câmera sintética não comprova Android/iPhone.

Preencher modelo/aparelho, sistema, navegador, data, domínio HTTPS e resultado de cada item. Preferencialmente testar Android/Chrome e iPhone/Safari. Configurar proxy `/api`, `COOKIE_SECURE=true` e a origem HTTPS exata em `ALLOWED_ORIGINS`. Gerar o QR 02 com o mesmo domínio público; `localhost` do computador não é acessível como localhost no telefone.

| Verificação | Android físico | iPhone físico |
| --- | --- | --- |
| QR 02 abre o domínio HTTPS correto e leva ao login quando necessário | PENDENTE | PENDENTE |
| Permissão de câmera concedida e câmera traseira ativa | PENDENTE | PENDENTE |
| Permissão negada: mensagem clara, nova tentativa após liberar permissão | PENDENTE | PENDENTE |
| QR 01, QR de outro domínio ou outra imagem não invocam o baú | PENDENTE | PENDENTE |
| QR 02 reconhecido por inteiro, em papel e outra tela | PENDENTE | PENDENTE |
| Baú acompanha posição/rotação; escala coerente em distâncias e ângulos diferentes | PENDENTE | PENDENTE |
| Perda breve do marcador não causa saltos excessivos; perda prolongada oculta o baú | PENDENTE | PENDENTE |
| Reenquadramento recupera o baú sem sortear automaticamente | PENDENTE | PENDENTE |
| Retrato/paisagem, recorte do vídeo e posição dos controles corretos | PENDENTE | PENDENTE |
| ABRIR BAÚ abre tampa, revela e anima a carta | PENDENTE | PENDENTE |
| Três faces, leitura da história e arte/fallback corretos | PENDENTE | PENDENTE |
| ESCANEAR NOVAMENTE exige afastar e reenquadrar; nova carta sem repetição | PENDENTE | PENDENTE |
| Falha de rede: mensagem, retry com mesma abertura, sem carta local falsa | PENDENTE | PENDENTE |
| Carta persiste no Grimório após reload, fechar navegador, logout e novo login | PENDENTE | PENDENTE |
| Outra conta mantém coleção própria; sessão expirada solicita login | PENDENTE | PENDENTE |
| Retorno à aba e saída da RA liberam/retomam câmera corretamente | PENDENTE | PENDENTE |
| Desempenho, aquecimento, iluminação baixa, reflexo e QR pequeno aceitáveis | PENDENTE | PENDENTE |

Registrar evidências e falhas. Não trocar o rastreador antes de medir o problema no aparelho real. A estimativa atual usa câmera não calibrada; estabilidade e escala dependem dessa validação.

## Cartaz da casa (MindAR) — acrescentado em 06/11/2026

| Verificação | Android físico | iPhone físico |
| --- | --- | --- |
| Cartaz A4 impresso: casa reconhecida a 30–60 cm | PENDENTE | PENDENTE |
| Casa reconhecida em outra tela (notebook/projetor) | PENDENTE | PENDENTE |
| Baú estável sobre a porta ao mover o celular devagar | PENDENTE | PENDENTE |
| Luz baixa e reflexo no papel | PENDENTE | PENDENTE |
| Contingência `/ra.html?rastreio=qr` funciona | PENDENTE | PENDENTE |
