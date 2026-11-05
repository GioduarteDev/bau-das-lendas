/* =========================================================
   APARIÇÕES — sem monstros e sem respingos.
   O medo vem das marcas: alguém andou por aqui, alguém está
   escrevendo, alguém está no teto. Acontecem a cada 7–12 s,
   na parede para onde você está olhando.

   Atalhos para a apresentação (teclado):
   1 frase se escrevendo na parede     6 olhos na fresta do papel
   2 pegadas vindo na sua direção      7 mão escorregando
   3 passos pelo TETO                  8 rachaduras se abrindo
   4 mãos aparecendo uma a uma         9 unhas arranhando a parede
   5 apagão (quando volta, há marcas)  0 gosma escura vazando
   ========================================================= */
window.Bau = window.Bau || {};

Bau.aparicoes = (function () {
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const marcas = [];
  let ultima = '';
  const rnd = (a, b) => a + Math.random() * (b - a);

  const kit = () => Bau.corredor.kit;
  const est = () => Bau.corredor.estado;
  // aparece na parede para onde você está olhando (ou sorteia se olhar reto)
  const ladoVisto = () => { const y = est().yaw; return y < -12 ? 'E' : y > 12 ? 'D' : (Math.random() < 0.5 ? 'E' : 'D'); };
  function naParede(lado, prof, larg) {
    const k = kit();
    return { parede: lado === 'E' ? k.esq : k.dir, x: lado === 'E' ? k.naEsq(prof, larg) : k.naDir(prof, larg) };
  }
  const perto = (min, max) => Math.min(est().camZ + rnd(min, max), kit().D - 250);
  function guardar(el) { marcas.push(el); if (marcas.length > 40) marcas.shift().remove(); }
  function sumir(el, depois) { setTimeout(() => el.classList.add('some'), depois); setTimeout(() => el.remove(), depois + 2600); }

  const FRASES = ['ela está atrás de você', 'não olhe para trás', 'três vezes', 'você ouviu?', 'abra o baú',
    'eu ainda estou aqui', 'me encontre', 'ninguém volta', 'feche a porta', 'por que você veio'];

  /* 1. FRASE SE ESCREVENDO NA PAREDE */
  function escrita() {
    const k = kit();
    const texto = FRASES[Math.floor(Math.random() * FRASES.length)];
    const larg = Math.max(260, texto.length * 22);
    const { parede, x } = naParede(ladoVisto(), perto(600, 900), larg);
    const el = k.criar('div', 'marca-parede escrevendo', `left:${x}px;top:${rnd(220, 330).toFixed(0)}px`, parede,
      Bau.gore.escrita(texto, { larg, tam: 40 }));
    Bau.som.sussurro();
    guardar(el);
  }

  /* 2. PEGADAS VINDO NA SUA DIREÇÃO */
  function pegadas() {
    const k = kit();
    const e = est();
    const inicio = Math.min(e.camZ + 1500, k.D - 300);
    for (let i = 0; i < 11; i++) {
      setTimeout(function () {
        const prof = inicio - i * 115;
        if (prof < e.camZ + 220) return;
        const el = k.criar('div', 'marca-plano surgindo', `left:${(i % 2 ? 736 : 658)}px;top:${k.noChao(prof, 110)}px;transform:rotate(180deg)`, k.chao,
          Bau.gore.pe({ esquerdo: i % 2 === 0, cor: Bau.gore.SANGUE_FRESCO, op: 0.9 }));
        Bau.som.passo();
        guardar(el);
      }, 900 + i * 520);
    }
  }

  /* 3. PASSOS PELO TETO */
  function teto() {
    const k = kit();
    const e = est();
    const inicio = Math.min(e.camZ + 1300, k.D - 300);
    const x0 = rnd(520, 900);
    for (let i = 0; i < 10; i++) {
      setTimeout(function () {
        const prof = inicio - i * 120;
        if (prof < e.camZ + 150) return;
        const el = k.criar('div', 'marca-plano surgindo', `left:${(x0 + (i % 2 ? 20 : -20)).toFixed(0)}px;top:${k.noTeto(prof, 110)}px`, k.teto,
          Bau.gore.pe({ esquerdo: i % 2 === 0, cor: Bau.gore.SANGUE_FRESCO, op: 0.9 }));
        Bau.som.passoTeto();
        guardar(el);
      }, 600 + i * 600);
    }
  }

  /* 4. MÃOS APARECENDO UMA A UMA */
  function maos() {
    const k = kit();
    const lado = ladoVisto();
    const base = perto(450, 650);
    for (let i = 0; i < 7; i++) {
      setTimeout(function () {
        const { parede, x } = naParede(lado, base + i * 75, 90);
        const el = k.criar('div', 'marca-parede surgindo', `left:${x}px;top:${(300 + Math.sin(i * 1.7) * 90 + (i % 2) * 50).toFixed(0)}px;transform:rotate(${rnd(-40, 40).toFixed(0)}deg)`, parede,
          Bau.gore.mao({ larg: rnd(80, 96), cor: Bau.gore.SANGUE_FRESCO, op: 0.88 }));
        Bau.som.batidaMao();
        guardar(el);
      }, i * 420);
    }
  }

  /* 5. APAGÃO — quando a luz volta, há marcas novas em volta */
  function apagao() {
    const k = kit();
    const body = document.body;
    [[0, true], [110, false], [210, true]].forEach(([t, apaga]) => setTimeout(() => body.classList.toggle('apagao', apaga), t));
    Bau.som.batida();
    setTimeout(function () {
      ['E', 'D'].forEach(function (lado) {
        for (let i = 0; i < 4; i++) {
          const { parede, x } = naParede(lado, perto(380, 800), 90);
          guardar(k.criar('div', 'marca-parede', `left:${x}px;top:${rnd(260, 620).toFixed(0)}px;transform:rotate(${rnd(-50, 50).toFixed(0)}deg)`, parede,
            Bau.gore.mao({ larg: rnd(80, 96), cor: Bau.gore.SANGUE_FRESCO, op: 0.9, arrasto: Math.random() < 0.5 ? rnd(60, 200) : 0 })));
        }
      });
      for (let i = 0; i < 6; i++) {
        guardar(k.criar('div', 'marca-plano', `left:${(680 + (i % 2 ? 40 : -40)).toFixed(0)}px;top:${k.noTeto(est().camZ + 300 + i * 110, 110)}px`, k.teto,
          Bau.gore.pe({ esquerdo: i % 2 === 0, cor: Bau.gore.SANGUE_FRESCO })));
      }
      Bau.som.sussurro();
    }, 400);
    setTimeout(() => body.classList.remove('apagao'), 1400);
  }

  /* 6. OLHOS NUMA FRESTA DO PAPEL DE PAREDE */
  function olhos() {
    const k = kit();
    const { parede, x } = naParede(ladoVisto(), perto(600, 850), 360);
    const cores = ['ambar', 'morto', 'morto', 'sangue', 'musgo'];
    let html = '<div class="fresta"></div>';
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      html += `<div class="olho-fresta" style="left:${(40 + i * 110 + rnd(-15, 15)).toFixed(0)}px;top:${(50 + rnd(-14, 14)).toFixed(0)}px;animation-delay:${(0.6 + i * 0.35).toFixed(2)}s">${Bau.olho({ larg: rnd(90, 110), cor: cores[Math.floor(Math.random() * cores.length)], rot: rnd(-8, 8) })}</div>`;
    }
    const el = k.criar('div', 'olhos-fresta', `left:${x}px;top:${rnd(250, 380).toFixed(0)}px`, parede, html);
    Bau.som.sussurro();
    setTimeout(() => el.classList.add('fechando'), 6500);
    sumir(el, 8000);
  }

  /* 7. MÃO ESCORREGANDO PELA PAREDE */
  function escorrega() {
    const k = kit();
    const { parede, x } = naParede(ladoVisto(), perto(550, 800), 100);
    const el = k.criar('div', 'marca-parede escorregando', `left:${x}px;top:260px`, parede,
      Bau.gore.mao({ larg: 100, cor: Bau.gore.SANGUE_FRESCO, op: 0.92, arrasto: 300 }));
    Bau.som.arranhar(true);
    guardar(el);
  }

  /* 8. RACHADURAS SE ABRINDO NO PAPEL (com batida de coração) */
  function rachaduras() {
    const k = kit();
    const { parede, x } = naParede(ladoVisto(), perto(550, 850), 460);
    let caminhos = '';
    function galho(x0, y0, ang, comp, larg, nivel) {
      if (nivel > 5 || comp < 10) return;
      let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`, cx = x0, cy = y0, a = ang;
      for (let s = 0; s < 6; s++) { a += rnd(-0.55, 0.55); cx += Math.cos(a) * comp / 6; cy += Math.sin(a) * comp / 6; d += ` L${cx.toFixed(1)} ${cy.toFixed(1)}`; }
      caminhos += `<path d="${d}" stroke-width="${larg.toFixed(2)}" pathLength="1"/>`;
      const filhos = 1 + (Math.random() < 0.65 ? 1 : 0);
      for (let f = 0; f < filhos; f++) galho(cx, cy, a + rnd(-0.9, 0.9), comp * 0.7, larg * 0.66, nivel + 1);
    }
    for (let i = 0; i < 6; i++) galho(230, 250, i / 6 * Math.PI * 2 + rnd(-0.3, 0.3), rnd(110, 160), 3.2, 0);
    const el = k.criar('div', 'rachaduras', `left:${x}px;top:130px`, parede,
      `<svg viewBox="0 0 460 500" width="460" height="500" aria-hidden="true"><g class="racha-g" fill="none" stroke="#120604" stroke-linecap="round" filter="url(#f-organico)">${caminhos}</g>` +
      `<g class="racha-sangue" fill="none" stroke="${Bau.gore.SANGUE}" stroke-linecap="round" filter="url(#f-organico)">${caminhos}</g></svg>`);
    Bau.som.coracao(6);
    sumir(el, 11000);
  }

  /* 9. UNHAS ARRANHANDO A PAREDE */
  function riscos() {
    const k = kit();
    const { parede, x } = naParede(ladoVisto(), perto(550, 800), 220);
    const ang = rnd(-0.35, 0.35);
    let linhas = '';
    for (let i = 0; i < 4; i++) {
      const x0 = 40 + i * 26, x1 = x0 + Math.sin(ang) * 260 + rnd(-6, 6);
      linhas += `<path d="M${x0} 20 Q${((x0 + x1) / 2 + rnd(-10, 10)).toFixed(0)} 150 ${x1.toFixed(0)} ${(280 + rnd(-30, 20)).toFixed(0)}" pathLength="1" style="animation-delay:${(i * 0.08).toFixed(2)}s"/>`;
    }
    const el = k.criar('div', 'riscos', `left:${x}px;top:${rnd(200, 320).toFixed(0)}px`, parede,
      `<svg viewBox="0 0 220 320" width="220" height="320" aria-hidden="true">
        <g class="risco-fundo" fill="none" stroke="#0e0703" stroke-width="5" stroke-linecap="round" filter="url(#f-organico)">${linhas}</g>
        <g class="risco-luz" fill="none" stroke="#d8c690" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round" transform="translate(2 0)">${linhas}</g>
        <g class="risco-sangue" fill="none" stroke="${Bau.gore.SANGUE}" stroke-width="2" stroke-linecap="round" filter="url(#f-organico)">${linhas}</g></svg>`);
    Bau.som.arranhar();
    guardar(el);
  }

  /* 0. GOSMA ESCURA VAZANDO DE UMA FRESTA */
  function gosma() {
    const k = kit();
    const { parede, x } = naParede(ladoVisto(), perto(550, 850), 220);
    const el = k.criar('div', 'gosma-fresta viva', `left:${x}px;top:118px`, parede, Bau.gore.gosma(220, 520));
    Bau.som.gosma();
    sumir(el, 24000);
  }

  const TODAS = { escrita, pegadas, teto, maos, apagao, olhos, escorrega, rachaduras, riscos, gosma };
  const ORDEM = ['escrita', 'pegadas', 'teto', 'maos', 'apagao', 'olhos', 'escorrega', 'rachaduras', 'riscos', 'gosma'];

  function sortear() {
    const opcoes = reduzido ? ['escrita', 'maos', 'riscos'] : ORDEM;
    let nome;
    do { nome = opcoes[Math.floor(Math.random() * opcoes.length)]; } while (nome === ultima && opcoes.length > 1);
    ultima = nome;
    TODAS[nome]();
    if (Math.random() < 0.3) setTimeout(function () { Bau.som.risada(); }, 1500 + Math.random() * 2000);
  }

  function agendar(ms) {
    setTimeout(function () {
      const e = est();
      const livre = e.dentro && document.getElementById('dossie').hidden && !document.hidden;
      if (livre) sortear();
      agendar(7000 + Math.random() * 5000);
    }, ms);
  }

  function iniciar() { agendar(6000); }
  function forcar(n) {
    if (!est().dentro) return;
    const nome = ORDEM[n === 0 ? 9 : n - 1];
    if (nome) TODAS[nome]();
  }

  return { iniciar, forcar, ...TODAS };
})();
