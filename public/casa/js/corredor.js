/* =========================================================
   CORREDOR 3D (CSS 3D, sem biblioteca)
   - O mundo é montado com <div>s: paredes, chão, teto e fundo.
   - A câmera fica parada; quem anda é o mundo (translateZ).
   - Olhar com o mouse = girar o mundo em volta da câmera.
   - O corredor cresce sozinho conforme o número de lendas (60).
   - Paredes, chão e teto são feitos em pedaços: só os pedaços
     perto da câmera são desenhados (é isso que deixa leve).
   A decoração (portas, luzes, objetos) fica em js/decor.js.
   ========================================================= */
window.Bau = window.Bau || {};

Bau.corredor = (function () {
  const W = 1440, H = 900;                // largura e altura do corredor
  const PRIMEIRO = 600, PASSO = 320;      // onde fica a 1ª carta e a distância entre elas
  const RECUO = 650;                      // a câmera para RECUO px antes da carta
  const ATRAS = 1000;                     // quanto o corredor continua atrás da entrada
  const FOCO = 760;                       // = perspective do #cena
  const OLHAR_X = 75, OLHAR_Y = 18;       // até quantos graus a cabeça vira com o mouse
  const VIES = 20;                        // a câmera "puxa" o olhar para a carta da vez
  const PEDACO = 1600;                    // tamanho de cada pedaço de parede/chão/teto
  const VER_ATRAS = 1100, VER_FRENTE = 5600; // só desenha o que está nesse intervalo
  const VELOCIDADE = 0.12;                // quanto a câmera anda por quadro (0 a 1): maior = mais rápido

  const ALAS = {
    saguao:    { nome: 'SAGUÃO',        nativo: '' },
    brasil:    { nome: 'ALA BRASIL',    nativo: 'BRASIL' },
    japao:     { nome: 'ALA JAPÃO',     nativo: '日本' },
    china:     { nome: 'ALA CHINA',     nativo: '中国' },
    india:     { nome: 'ALA ÍNDIA',     nativo: 'भारत' },
    filipinas: { nome: 'ALA FILIPINAS', nativo: 'PILIPINAS' }
  };

  let D = 4600;                           // profundidade total (recalculada pelas lendas)
  let ZONAS = [];

  const mundo = document.getElementById('mundo');
  const cena = document.getElementById('cena');
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const J = Bau.jardim;                           // jardim e fachada (js/jardim.js)
  const NASCE = J ? J.INICIO : -900;              // a câmera nasce no portão do jardim
  const e = {
    i: 0, camZ: NASCE, alvoZ: NASCE, camX: 0,     // camZ = profundidade da câmera
    yaw: 0, pitch: 0, mx: 0, my: 0,
    giro: 0, giroInicio: 0,
    dentro: false, kisaragi: false, longe: false,
    andado: 0, ultimoZ: NASCE,
    rolouEm: 0, auto: null
  };
  const cartas = [];
  const pedacos = [];                             // { el, a, b, vis } para o recorte por distância
  const neblinas = [];
  let aoMudar = function () {};
  const avisos = { dentro: function () {}, saiu: function () {} };

  /* ---------- helpers ---------- */
  function criar(tag, classe, estilo, pai, html) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (estilo) el.setAttribute('style', estilo);
    if (html) el.innerHTML = html;
    (pai || mundo).appendChild(el);
    return el;
  }
  function svg(w, h, vb, conteudo, classe, estilo, pai) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', w); s.setAttribute('height', h);
    s.setAttribute('viewBox', vb);
    if (classe) s.setAttribute('class', classe);
    if (estilo) s.setAttribute('style', estilo);
    s.innerHTML = conteudo;
    (pai || mundo).appendChild(s);
    return s;
  }
  // posição ao longo de cada superfície a partir da profundidade
  const naEsq = (prof, larg) => prof + ATRAS - larg / 2;
  const naDir = (prof, larg) => D - prof - larg / 2;
  const noChao = (prof, alt) => D - prof - alt / 2;
  const noTeto = (prof, alt) => prof + ATRAS - alt / 2;
  const recortar = (el, a, b) => { pedacos.push({ el: el, a: a, b: b, vis: true }); return el; };

  const kit = { criar, svg, naEsq, naDir, noChao, noTeto, W, H, ATRAS, estado: e };

  /* ---------- alas a partir das lendas ---------- */
  function calcularAlas(lendas) {
    D = PRIMEIRO + (lendas.length - 1) * PASSO + 900;
    ZONAS = [{ id: 'saguao', de: -ATRAS, ate: PRIMEIRO - PASSO / 2 }];
    lendas.forEach(function (l, i) {
      l.prof = PRIMEIRO + i * PASSO;
      l.lado = i % 2 === 0 ? 'E' : 'D';
      const z = l.zona || 'brasil';
      const ultima = ZONAS[ZONAS.length - 1];
      if (ultima.id !== z) {
        ultima.ate = l.prof - PASSO / 2;
        ZONAS.push({ id: z, de: l.prof - PASSO / 2, ate: D });
      }
    });
    ZONAS[ZONAS.length - 1].ate = D;
    ZONAS.forEach(function (z) { Object.assign(z, ALAS[z.id] || { nome: z.id.toUpperCase(), nativo: '' }); });
    Object.assign(kit, { D: D, ZONAS: ZONAS });
  }

  /* ---------- montagem ---------- */
  function construir(lendas) {
    calcularAlas(lendas);
    const L = D + ATRAS;                          // comprimento total das paredes
    const lambri = Bau.texturas.lambri();
    const chaoTex = Bau.texturas.chao();
    const texturas = {};
    ZONAS.forEach(function (z) { if (!texturas[z.id]) texturas[z.id] = Bau.texturas.estampa(z.id); });

    const esq = criar('div', 'parede esq', `width:${L}px`);
    const dir = criar('div', 'parede dir', `width:${L}px;left:${W - L}px`);
    const chao = criar('div', 'chao', `top:${H - L}px;height:${L}px`);
    const teto = criar('div', 'teto', `height:${L}px`);
    const fundo = criar('div', 'fundo', `transform:translateZ(-${D}px)`);
    Object.assign(kit, { esq, dir, chao, teto, fundo });
    recortar(fundo, D, D);

    // paredes: estampa de cada ala, em pedaços
    [esq, dir].forEach(function (p) {
      ZONAS.forEach(function (z) {
        for (let a = z.de; a < z.ate; a += PEDACO) {
          const b = Math.min(z.ate, a + PEDACO);
          const x = p === esq ? a + ATRAS : D - b;
          recortar(criar('div', 'estampa pedaco', `left:${x}px;width:${b - a}px;background-image:url(${texturas[z.id]});background-position:${-x}px 0`, p), a, b);
        }
      });
      for (let a = -ATRAS; a < D; a += PEDACO) {
        const b = Math.min(D, a + PEDACO);
        const x = p === esq ? a + ATRAS : D - b;
        recortar(criar('div', 'rodateto pedaco', `left:${x}px;width:${b - a}px`, p), a, b);
        recortar(criar('div', 'lambri pedaco', `left:${x}px;width:${b - a}px;background-image:url(${lambri});background-position:${-x}px 0`, p), a, b);
      }
    });
    // chão e teto em pedaços
    for (let a = -ATRAS; a < D; a += PEDACO) {
      const b = Math.min(D, a + PEDACO);
      recortar(criar('div', 'chao-pedaco pedaco', `top:${D - b}px;height:${b - a}px;background-image:url(${chaoTex});background-position:0 ${-(D - b)}px`, chao), a, b);
      recortar(criar('div', 'teto-pedaco pedaco', `top:${a + ATRAS}px;height:${b - a}px;background-position:0 ${-(a + ATRAS)}px`, teto), a, b);
    }

    // pilastras de madeira + soleira + placa pendurada na troca de ala
    ZONAS.slice(1).forEach(function (z) {
      recortar(criar('div', 'pilastra pedaco', `left:${naEsq(z.de, 46)}px`, esq), z.de, z.de);
      recortar(criar('div', 'pilastra pedaco', `left:${naDir(z.de, 46)}px`, dir), z.de, z.de);
      recortar(criar('div', 'soleira pedaco', `top:${noChao(z.de, 26)}px`, chao), z.de, z.de);
      const placa = `<span class="placa-nativo">${z.nativo}</span><span class="placa-pt">${z.nome}</span>`;
      recortar(criar('div', 'placa-ala pedaco', `left:${naEsq(z.de + 110, 160)}px`, esq, placa), z.de, z.de + 200);
      recortar(criar('div', 'placa-ala pedaco', `left:${naDir(z.de + 110, 160)}px`, dir, placa), z.de, z.de + 200);
    });

    /* --- cartas colecionáveis (lacradas) --- */
    lendas.forEach(function (l, i) {
      const parede = l.lado === 'E' ? esq : dir;
      const x = l.lado === 'E' ? naEsq(l.prof, 240) : naDir(l.prof, 240);
      const c = criar('div', 'carta pedaco ' + (l.lado === 'E' ? 'lado-esq' : 'lado-dir'), `left:${x}px`, parede,
        Bau.cartas.html(l, { coletada: Bau.colecao?.has(l.id) }));
      c.dataset.legendId = l.id;
      c.setAttribute('title', l.nome);
      c.addEventListener('click', function () {
        if (e.i !== i) irPara(i); else if (Bau.abrirDossie) Bau.abrirDossie(i);
      });
      cartas.push(c);
      recortar(c, l.prof - 200, l.prof + 200);
    });

    // Peça extra de exposição, sem posição ou desbloqueio no catálogo oficial.
    (Bau.exposicao || []).forEach(function (l) {
      const extra = criar('div', 'carta pedaco lado-dir carta-exposicao', `left:${naDir(260, 240)}px`, dir,
        Bau.cartas.html({ ...l, num: 'EXTRA', local: 'EXPOSIÇÃO', intensidade: 0, ala: 'ALA BRASIL' }, { coletada: false, exposicao: true }));
      extra.dataset.exhibitId = l.id; extra.title = l.nome + ' · Exposição';
      extra.addEventListener('click', () => Bau.abrirExposicao?.(l.id));
      recortar(extra, 60, 460);
    });

    /* --- portas, luzes e objetos do mundo todo --- */
    if (Bau.decor) Bau.decor.montar(kit);
    if (Bau.gore) Bau.gore.montar(kit);
    if (J) J.montar(kit);

    /* --- fundo: porta do Grimório + olhos + placa de Kisaragi (escondida) --- */
    criar('div', '', 'left:560px;top:250px;width:320px;height:650px;border-radius:160px 160px 0 0;background:#050404;border:14px solid #3a2a1a;box-sizing:border-box;box-shadow:inset 0 0 120px rgba(217,162,74,.18)', fundo);
    criar('div', 'placa', 'left:620px;top:190px;width:200px;font-size:16px;letter-spacing:.3em', fundo, 'GRIMÓRIO');
    criar('div', 'olhos-fundo', 'left:650px;top:560px', fundo, Bau.olho({ larg: 60, cor: 'ambar' }) + Bau.olho({ larg: 60, cor: 'ambar' }));
    const kis = criar('div', 'kisaragi', 'left:170px;top:300px;width:260px;padding:16px 0;background:#f1ece2;color:#0b0a09;text-align:center;opacity:0;transition:opacity 2s;box-shadow:0 0 80px rgba(241,236,226,.25)', fundo,
      '<div style="position:static;font:44px/1 var(--serif)">きさらぎ</div><div style="position:static;font:12px var(--mono);letter-spacing:.3em;margin-top:6px">KISARAGI</div>');
    e.placaKisaragi = kis;

    /* --- neblina: anda junto com a câmera; a última esconde o que está longe --- */
    [[2400, 0.22], [3800, 0.45], [5300, 1]].forEach(function (n) {
      neblinas.push({ dist: n[0], el: criar('div', 'neblina', `opacity:${n[1]}`) });
    });
  }

  /* ---------- palco escalado para cobrir a tela ---------- */
  function ajustar() {
    const s = Math.max(window.innerWidth / W, window.innerHeight / H);
    cena.style.transform = `translate(-50%,-50%) scale(${s})`;
  }

  /* ---------- navegação ---------- */
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  function alvoDe(i) { return PRIMEIRO + i * PASSO - RECUO; }
  function fimZ() { return D - 900; }

  // rolar: anda uma quantidade (em px do mundo), para frente ou para trás
  function andar(delta) {
    e.auto = null;
    if (delta > 0 && e.alvoZ >= fimZ() - 1 && !e.kisaragi) {      // passou do fim → Kisaragi
      e.kisaragi = true; if (Bau.eggs) Bau.eggs.kisaragi();
    }
    if (delta < 0 && e.kisaragi && e.alvoZ < fimZ() - 400) e.kisaragi = false;
    e.alvoZ = lim(e.alvoZ + delta, NASCE, fimZ());
    e.rolouEm = performance.now();
  }

  // ir direto a uma carta (setas, botões, clique na planta)
  function irPara(i) {
    const n = Bau.lendas.length;
    if (i >= n) { andar(PASSO); return; }
    i = Math.max(0, i);
    e.auto = null;
    e.rolouEm = 0;
    e.alvoZ = alvoDe(i);
    marcar(i);
  }

  function marcar(i) {
    if (i === e.i && cartas[i] && cartas[i].classList.contains('foco')) return;
    e.i = i;
    cartas.forEach((q, k) => q.classList.toggle('foco', k === i));
    aoMudar(i);
  }

  // anda sozinho até um ponto, devagar (botão "seguir as pegadas")
  function seguir(ate, velocidade) { e.auto = { ate: ate, vel: velocidade || 900 }; }

  // pula o jardim e entra na casa
  function entrar() {
    if (e.camZ < -1500) e.camZ = e.alvoZ = e.ultimoZ = -1500;
    seguir(alvoDe(0), 1200);
  }

  // volta para o portão
  function sair() {
    e.kisaragi = false; e.auto = null;
    e.camZ = e.alvoZ = e.ultimoZ = NASCE;
  }

  function zonaEm(prof) {
    for (let k = ZONAS.length - 1; k >= 0; k--) if (prof >= ZONAS[k].de) return ZONAS[k];
    return ZONAS[0];
  }

  function olhar(nx, ny) { e.mx = nx; e.my = ny; }
  function girar() { e.giroInicio = performance.now(); }

  /* ---------- loop de animação ---------- */
  let antes = performance.now();
  function quadro(agora) {
    const dt = Math.min(64, Math.max(1, agora - antes)); antes = agora;

    // andando sozinho (botão)
    if (e.auto) {
      e.alvoZ = Math.min(e.auto.ate, e.alvoZ + e.auto.vel * dt / 1000);
      if (e.alvoZ >= e.auto.ate) e.auto = null;
    }
    // depois de parar de rolar, encaixa na carta mais próxima
    if (e.dentro && e.rolouEm && agora - e.rolouEm > 380 && e.alvoZ > alvoDe(0) - 200 && e.alvoZ < fimZ() - 10) {
      e.rolouEm = 0;
      e.alvoZ = alvoDe(lim(Math.round((e.alvoZ + RECUO - PRIMEIRO) / PASSO), 0, cartas.length - 1));
    }

    // andar (suave, igual em qualquer computador)
    const k = reduzido ? 1 : 1 - Math.pow(1 - VELOCIDADE, dt / 16.7);
    e.camZ += (e.alvoZ - e.camZ) * k;
    const vel = Math.abs(e.alvoZ - e.camZ);

    // passos
    e.andado += Math.abs(e.camZ - e.ultimoZ);
    e.ultimoZ = e.camZ;
    if (e.andado > 230 && vel > 20) { e.andado = 0; Bau.som.passo(); }

    // dentro ou fora da casa?
    const dentro = e.camZ > -1000;
    if (dentro !== e.dentro) { e.dentro = dentro; avisos.dentro(dentro); }
    const longe = e.camZ > NASCE + 120;
    if (longe !== e.longe) { e.longe = longe; avisos.saiu(longe); }

    // carta da vez = a mais próxima
    if (e.dentro) marcar(lim(Math.round((e.camZ + RECUO - PRIMEIRO) / PASSO), 0, cartas.length - 1));

    // no jardim a câmera segue o caminho de pedras
    e.camX = J && e.camZ < -1000 ? J.caminhoX(e.camZ) - 720 : 0;

    // cabeça: olhar livre com o mouse (curva suave: perto da borda gira mais)
    const l = Bau.lendas[e.i];
    const forca = Math.abs(e.mx);
    const perto = 1 - Math.min(1, Math.abs(e.camZ - alvoDe(e.i)) / 220);
    const vies = e.dentro && !e.kisaragi ? (l.lado === 'E' ? -VIES : VIES) * (1 - forca) * perto : 0;
    const alvoYaw = Math.sign(e.mx) * Math.pow(forca, 1.35) * OLHAR_X + vies;
    const alvoPitch = -e.my * OLHAR_Y + (J && !e.dentro ? 5 : 0); // no jardim, olha um pouco pro céu
    const kc = reduzido ? 1 : 1 - Math.pow(0.93, dt / 16.7);
    e.yaw += (alvoYaw - e.yaw) * kc;
    e.pitch += (alvoPitch - e.pitch) * kc;

    // giro do Saci
    let giro = 0;
    if (e.giroInicio) {
      const p = Math.min(1, (agora - e.giroInicio) / 1700);
      giro = 360 * (1 - Math.pow(1 - p, 3));
      if (p >= 1) e.giroInicio = 0;
    }
    e.giro = giro;

    // balanço da cabeça ao andar
    const bob = reduzido ? 0 : Math.sin(agora * 0.009) * Math.min(vel / 300, 1) * 5;

    mundo.style.setProperty('--holo', (50 + e.yaw * 1.2).toFixed(1) + '%');
    const cam = `translateY(${bob.toFixed(2)}px) rotateX(${e.pitch.toFixed(3)}deg) rotateY(${(e.yaw + giro).toFixed(3)}deg) translateZ(${(e.camZ + FOCO).toFixed(1)}px) translateX(${(-e.camX).toFixed(1)}px)`;
    mundo.style.transform = cam;
    cena.style.setProperty('--cam', cam);   // o jardim (js/jardim.js) usa a mesma câmera

    // só desenha o que está perto
    const de = e.camZ - VER_ATRAS, ate = e.camZ + VER_FRENTE;
    for (let n = 0; n < pedacos.length; n++) {
      const p = pedacos[n], vis = p.b >= de && p.a <= ate;
      if (vis !== p.vis) { p.vis = vis; p.el.style.display = vis ? '' : 'none'; }
    }
    // neblina acompanha a câmera
    neblinas.forEach(function (n) {
      n.el.style.transform = `translateZ(${(-Math.max(n.dist - 1000, e.camZ + n.dist)).toFixed(0)}px)`;
    });

    if (Bau.decor) Bau.decor.atualizar(e, agora);
    if (J) J.atualizar(e, agora);

    requestAnimationFrame(quadro);
  }

  function iniciar(lendas, callback, ganchos) {
    aoMudar = callback || aoMudar;
    Object.assign(avisos, ganchos || {});
    construir(lendas);
    ajustar();
    window.addEventListener('resize', ajustar);
    requestAnimationFrame(quadro);
  }

  return {
    atualizarColecao() {
      cartas.forEach((card, i) => { card.innerHTML = Bau.cartas.html(Bau.lendas[i], { coletada: Bau.colecao?.has(Bau.lendas[i].id) }); });
    },
    iniciar, irPara, andar, seguir, entrar, sair, olhar, girar, ajustar, zonaEm, alvoDe,
    get estado() { return e; },
    get kit() { return kit; },
    get D() { return D; },
    get ZONAS() { return ZONAS; },
    adicionar: criar, W, H, PRIMEIRO, PASSO
  };
})();
