# Baú das Lendas — roteiro de apresentação

## O conceito

O Baú das Lendas é um arquivo interativo de 60 lendas e histórias folclóricas. O visitante percorre uma casa impossível, encontra os dossiês junto às portas e pode investigar cada registro. O contraste entre arquitetura reconhecível, pouca luz e manifestações associadas às narrativas cria tensão sem depender de sustos aleatórios.

## O que mostrar na demonstração

1. **Exploração:** entre na casa, avance usando o scroll e olhe ao redor com o mouse. Abra o dossiê de uma lenda.
2. **Coleção:** mostre o grimório, as posições bloqueadas e as cartas já descobertas.
3. **Realidade aumentada:** abra `/ra.html` pelo QR 02 em um celular, autorize a câmera, mantenha o QR visível e abra o baú. Vire as três faces da carta. Essa etapa depende de HTTPS, câmera e backend disponíveis.

## Arquitetura para explicar

- **Frontend:** React, TypeScript, Vite e Three.js para a experiência 3D e interface.
- **RA:** câmera do navegador, leitura do QR por jsQR e pose aproximada do baú renderizado em Three.js. Não é rastreamento espacial persistente.
- **Backend:** FastAPI com autenticação, sorteio e coleção individual.
- **Banco:** PostgreSQL para contas, cartas e progresso.

## Checklist antes de apresentar

- [ ] Executar `npm install` e `npm run build` no computador de apresentação.
- [ ] Inicializar banco e backend conforme `backend/README.md`.
- [ ] Testar login, scroll, dossiê e grimório com o backend ligado.
- [ ] Testar a câmera da RA **no celular real**, sob HTTPS. Não anunciar RA validada sem esse teste.
- [ ] Guardar gravação curta do fluxo completo como contingência caso a internet ou a câmera falhem.
- [ ] Conferir que nenhum arquivo `.env`, banco local ou `node_modules` foi enviado ao GitHub.

## Recuperação artística — 04/11/2026

Nesta revisão, o cenário foi levado para uma paleta de cinza-petróleo frio, madeira escurecida, acentos bordô e luzes âmbar localizadas. A iluminação ambiente foi reduzida e a névoa reforçada. As aparições de olhos isolados foram excluídas do catálogo de eventos; as manifestações ligadas a lendas foram preservadas.

**Validação:** as alterações são de código. Não foi possível instalar as dependências no ambiente de revisão, então a compilação final, a experiência no navegador e a RA física ainda precisam ser verificadas no computador de apresentação.
