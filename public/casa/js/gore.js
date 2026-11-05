/* =========================================================
   MARCAS DE SANGUE (sem respingos)
   Só pegadas, mãos, arrastos e escrita a dedo, impressos com
   borda irregular de carimbo (filtro #f-carimbo no index.html).
   Estão no chão, nas paredes e no TETO.
   ========================================================= */
window.Bau = window.Bau || {};

Bau.gore = (function () {
  const SANGUE = '#5e0907';
  const SANGUE_FRESCO = '#7a0c09';
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- marcas viram <img> (o navegador rasteriza uma vez só: leve no 3D) ---------- */
  const DEFS = `<defs>
    <filter id="c" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="fino"/>
      <feDisplacementMap in="SourceGraphic" in2="fino" scale="4" xChannelSelector="R" yChannelSelector="G" result="borda"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="largo"/>
      <feColorMatrix in="largo" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.4 0 0 0 -0.55" result="falhas"/>
      <feComposite in="borda" in2="falhas" operator="in"/></filter>
    <filter id="o" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="2" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
    <linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e0907" stop-opacity=".95"/><stop offset="1" stop-color="#5e0907" stop-opacity="0"/></linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050302"/><stop offset=".42" stop-color="#20140a"/><stop offset=".5" stop-color="#5a4424"/><stop offset=".58" stop-color="#1a1008"/><stop offset="1" stop-color="#050302"/></linearGradient>
  </defs>`;
  const cache = new Map();
  function img(viewBox, w, h, conteudo, classe) {
    const svgTxt = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}">${DEFS}${conteudo
      .replace(/url\(#f-carimbo\)/g, 'url(#c)').replace(/url\(#f-organico\)/g, 'url(#o)')
      .replace(/url\(#g-arrasto\)/g, 'url(#a)').replace(/url\(#g-gosma\)/g, 'url(#g)')}</svg>`;
    let src = cache.get(svgTxt);
    if (!src) { src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgTxt); cache.set(svgTxt, src); }
    return `<img class="marca ${classe || ''}" src="${src}" width="${w}" height="${h}" alt="" draggable="false">`;
  }

  /* ---------- formas ---------- */
  // mão espalmada (dedos para cima), viewBox 0 0 100 140
  function maoForma() {
    return `<path d="M24 74 C20 96 28 120 48 128 C66 134 82 124 86 104 C88 92 86 82 82 74 Z"/>
      <g stroke-linecap="round" fill="none" stroke-width="15">
        <path d="M37 74 L32 ${rnd(16, 22).toFixed(0)}"/><path d="M51 72 L51 ${rnd(8, 14).toFixed(0)}" stroke-width="15.5"/>
        <path d="M65 74 L69 ${rnd(16, 22).toFixed(0)}" stroke-width="14.5"/><path d="M77 80 L87 ${rnd(38, 44).toFixed(0)}" stroke-width="12"/>
        <path d="M27 96 L${rnd(4, 8).toFixed(0)} 64" stroke-width="16"/>
      </g>`;
  }
  // pé descalço, viewBox 0 0 50 120
  function peForma() {
    return `<path d="M24 30 C36 30 40 44 38 58 C36 70 32 78 32 92 C32 104 28 114 20 114 C11 114 7 105 8 94 C9 82 13 74 11 62 C9 48 12 30 24 30Z"/>
      <ellipse cx="17" cy="18" rx="6.5" ry="7.5"/><circle cx="28" cy="16" r="4.6"/><circle cx="35.5" cy="20" r="4"/><circle cx="41" cy="26" r="3.4"/><circle cx="44.5" cy="33" r="2.9"/>`;
  }

  function mao(opc) {
    const o = opc || {};
    const cor = o.cor || SANGUE, op = o.op || 0.85, arrasto = o.arrasto || 0;
    let rastro = '';
    if (arrasto) { // dedos escorregando para baixo
      [[32, 13], [51, 13], [69, 12], [86, 9]].forEach(function (d) {
        const fim = 110 + arrasto * rnd(0.55, 1), meio = (40 + fim) / 2;
        rastro += `<path d="M${d[0]} 40 Q${(d[0] + rnd(-6, 6)).toFixed(0)} ${meio.toFixed(0)} ${(d[0] + rnd(-5, 5)).toFixed(0)} ${fim.toFixed(0)}" stroke="url(#g-arrasto)" stroke-width="${d[1]}" stroke-linecap="round" fill="none"/>`;
      });
    }
    const alt = 140 + arrasto, larg = o.larg || 100;
    return img(`0 -10 100 ${alt + 10}`, larg, Math.round(larg * (alt + 10) / 100),
      `<g filter="url(#f-carimbo)" fill="${cor}" stroke="${cor}" opacity="${op}">${rastro}${maoForma()}</g>`);
  }

  function pe(opc) {
    const o = opc || {};
    const larg = o.larg || 46;
    return img('0 0 50 120', larg, Math.round(larg * 2.4),
      `<g filter="url(#f-carimbo)" fill="${o.cor || SANGUE}" opacity="${o.op || 0.85}" transform="${o.esquerdo ? 'translate(50 0) scale(-1 1)' : ''}">${peForma()}</g>`);
  }

  // frase escrita a dedo (com 2–3 escorridos finos)
  function escrita(texto, opc) {
    const o = opc || {};
    const tam = o.tam || 46, larg = o.larg || 420;
    let gotas = '';
    for (let i = 0; i < 3; i++) {
      const x = rnd(20, larg - 20), h = rnd(30, 90);
      gotas += `<path d="M${x.toFixed(0)} ${tam * 1.1} q1 ${h / 2} 0 ${h}" stroke="${SANGUE}" stroke-width="${rnd(1.6, 3).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
    }
    return `<svg class="marca escrita" viewBox="0 0 ${larg} ${tam * 3}" width="${larg}" height="${tam * 3}" aria-hidden="true">
      <g filter="url(#f-organico)" opacity="${o.op || 0.85}">
        <text x="10" y="${tam * 1.1}" font-family="'Homemade Apple', cursive" font-size="${tam}" fill="${SANGUE}" class="escrita-texto">${texto}</text>${gotas}
      </g></svg>`;
  }

  // trilha de pegadas no plano do chão/teto (coordenadas locais)
  function trilha(plano, k, pontos, opc) {
    const o = opc || {};
    for (let i = 0; i < pontos.length; i++) {
      const [x, prof, ang] = pontos[i];
      const esquerdo = i % 2 === 0;
      const lado = esquerdo ? -16 : 16;
      const rad = (ang || 0) * Math.PI / 180;
      const px = x + Math.cos(rad) * lado, top = o.teto ? k.noTeto(prof, 110) : k.noChao(prof, 110);
      // ang 0 = andando para o fundo do corredor; o.perto = vindo na direção da câmera
      const giro = (o.teto || o.perto ? 180 : 0) + (ang || 0);
      k.criar('div', 'marca-plano', `left:${(px - 23).toFixed(0)}px;top:${top}px;transform:rotate(${giro}deg)`, plano,
        pe({ esquerdo, op: (o.op || 0.85) * (o.desbota ? 1 - i / pontos.length * 0.6 : 1) }));
    }
  }

  // gosma escura (piche) escorrendo de uma fresta
  function gosma(larg, alt) {
    let fios = '';
    for (let i = 0; i < 6; i++) {
      const x = rnd(10, larg - 10), w = rnd(4, 14), h = alt * rnd(0.3, 1);
      fios += `<path d="M${(x - w).toFixed(1)} 8 C${(x - w * 0.7).toFixed(1)} ${(h * 0.5).toFixed(0)} ${(x - w * 0.5).toFixed(1)} ${(h - w).toFixed(0)} ${(x - w * 0.9).toFixed(1)} ${(h - 2).toFixed(0)} A${(w * 0.95).toFixed(1)} ${(w * 0.95).toFixed(1)} 0 1 0 ${(x + w * 0.9).toFixed(1)} ${(h - 2).toFixed(0)} C${(x + w * 0.5).toFixed(1)} ${(h - w).toFixed(0)} ${(x + w * 0.7).toFixed(1)} ${(h * 0.5).toFixed(0)} ${(x + w).toFixed(1)} 8Z"/>`;
    }
    return img(`0 0 ${larg} ${alt + 30}`, larg, alt + 30,
      `<path d="M0 6 C${larg * 0.2} 2 ${larg * 0.3} 12 ${larg * 0.5} 7 S${larg * 0.8} 2 ${larg} 8 L${larg} 12 C${larg * 0.7} 16 ${larg * 0.3} 14 0 12Z" fill="#070403"/>` +
      `<g filter="url(#f-organico)" fill="url(#g-gosma)">${fios}</g>`, 'gosma2');
  }

  /* ---------- marcas fixas do corredor ---------- */
  function montar(k) {
    const { criar, naEsq, naDir, esq, dir, chao, teto } = k;
    const naParede = (lado, prof, larg) => ({ p: lado === 'E' ? esq : dir, x: lado === 'E' ? naEsq(prof, larg) : naDir(prof, larg) });

    // gradientes usados pelas marcas (arrasto e gosma)
    const defs = document.querySelector('svg defs');
    if (defs && !document.getElementById('g-arrasto')) {
      defs.insertAdjacentHTML('beforeend',
        `<linearGradient id="g-arrasto" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SANGUE}" stop-opacity=".95"/><stop offset="1" stop-color="${SANGUE}" stop-opacity="0"/></linearGradient>` +
        `<linearGradient id="g-gosma" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050302"/><stop offset=".42" stop-color="#20140a"/><stop offset=".5" stop-color="#5a4424"/><stop offset=".58" stop-color="#1a1008"/><stop offset="1" stop-color="#050302"/></linearGradient>`);
    }

    /* CHÃO — trilha de pés descalços do saguão até o shoji, entrando nele */
    const t1 = [];
    for (let i = 0; i < 16; i++) {
      const prof = 150 + i * 105, desvio = Math.max(0, i - 9) * 70;
      t1.push([700 - desvio, prof, -Math.min(60, Math.max(0, i - 9) * 12)]);
    }
    trilha(chao, k, t1, { desbota: false });

    /* CHÃO — arrasto (algo foi levado até o shoji) */
    criar('div', 'marca-plano', `left:0;top:${k.noChao(1380, 900)}px`, chao, img('0 0 1440 900', 1440, 900,
      `<g filter="url(#f-organico)" opacity=".55"><path d="M760 900 C740 640 520 360 60 60" stroke="${SANGUE}" stroke-width="34" stroke-linecap="round" fill="none" stroke-dasharray="140 16 60 26 200 12"/>` +
      `<path d="M748 880 C728 640 510 380 70 80 M772 890 C752 640 534 350 50 50" stroke="#3a0504" stroke-width="4" fill="none" opacity=".8"/></g>`));

    /* CHÃO — da porta selada (ofuda) saem pegadas que sobem a parede e andam pelo TETO */
    criar('div', 'marca-plano', `left:${1440 - 300}px;top:${k.noChao(2200, 200)}px`, chao,
      img('-150 -100 300 200', 300, 200, `<g filter="url(#f-organico)"><ellipse rx="120" ry="70" fill="#3a0504" opacity=".8"/><ellipse rx="80" ry="44" fill="${SANGUE}" opacity=".7"/></g>`));
    const t2 = [];
    for (let i = 0; i < 4; i++) t2.push([1260 + i * 40, 2280 + i * 90, 25]);
    trilha(chao, k, t2, {});
    // subindo a parede direita
    for (let i = 0; i < 5; i++) {
      const { p, x } = naParede('D', 2620 + i * 50 + (i % 2) * 20, 46);
      criar('div', 'marca-plano', `left:${x}px;top:${640 - i * 120}px;transform:rotate(${i % 2 ? 8 : -8}deg)`, p, pe({ esquerdo: i % 2 === 0, op: 0.8 }));
    }
    // andando pelo teto até o fundo
    const t3 = [];
    for (let i = 0; i < 14; i++) t3.push([1300 - i * 50, 2900 + i * 95, 27]);
    trilha(teto, k, t3, { teto: true, desbota: true });

    /* PAREDES — mãos em volta das portas (alguém tentou sair) */
    [['D', 650, 3], ['E', 1820, 4], ['D', 2200, 5], ['D', 3800, 3], ['E', -380, 3]].forEach(function (c) {
      for (let i = 0; i < c[2]; i++) {
        const { p, x } = naParede(c[0], c[1] + rnd(-170, 170), 90);
        criar('div', 'marca-parede', `left:${x}px;top:${rnd(300, 640).toFixed(0)}px;transform:rotate(${rnd(-35, 35).toFixed(0)}deg)`, p,
          mao({ larg: rnd(78, 96), op: rnd(0.6, 0.9), arrasto: Math.random() < 0.4 ? rnd(80, 220) : 0 }));
      }
    });
    /* PAREDES — mãos escorregando sozinhas pelo corredor */
    [['E', 1150], ['D', 1450], ['E', 2700], ['D', 3080], ['E', 3600], ['D', 4120]].forEach(function (c) {
      const { p, x } = naParede(c[0], c[1], 90);
      criar('div', 'marca-parede', `left:${x}px;top:${rnd(260, 380).toFixed(0)}px;transform:rotate(${rnd(-15, 15).toFixed(0)}deg)`, p,
        mao({ larg: 90, op: 0.8, arrasto: rnd(160, 280) }));
    });

    /* ESCRITA A DEDO */
    [['D', -300, 260, 'bem-vindo de volta', 420],
     ['E', 900, 230, 'três vezes', 300],
     ['E', 2580, 240, 'não desça do trem', 400],
     ['D', 3640, 250, 'ninguém volta', 260]].forEach(function (w) {
      const { p, x } = naParede(w[0], w[1], w[4]);
      criar('div', 'marca-parede', `left:${x}px;top:${w[2]}px`, p, escrita(w[3], { larg: w[4], tam: w[4] < 300 ? 34 : 42 }));
    });
    // no teto, perto da Índia
    criar('div', 'marca-plano', `left:470px;top:${k.noTeto(3300, 150)}px;transform:rotate(180deg)`, teto, escrita('eu ainda estou aqui', { larg: 520, tam: 44 }));

    /* TETO — mãos perto das lâmpadas */
    [[560, 420], [820, 470], [640, 3780], [900, 3860]].forEach(function (m) {
      criar('div', 'marca-plano', `left:${m[0]}px;top:${k.noTeto(m[1], 140)}px;transform:rotate(${rnd(0, 360).toFixed(0)}deg)`, teto, mao({ larg: 96, op: 0.75 }));
    });

    /* GOSMA escura vazando de frestas */
    [['D', 1600], ['E', 2950], ['D', 4150]].forEach(function (g) {
      const { p, x } = naParede(g[0], g[1], 140);
      criar('div', 'gosma-fresta', `left:${x}px;top:118px`, p, gosma(140, 300));
    });
  }

  return { montar, mao, pe, escrita, trilha, gosma, SANGUE, SANGUE_FRESCO };
})();
