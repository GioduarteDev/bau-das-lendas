/* =========================================================
   DECORAÇÃO DO CORREDOR
   - Portas que abrem sozinhas (ou com clique) e têm algo dentro
   - Luzes e objetos de vários lugares do mundo
   Profundidades em px a partir da entrada do corredor.
   ========================================================= */
window.Bau = window.Bau || {};

Bau.decor = (function () {
  const portas = [];
  let k;            // kit do corredor (helpers e superfícies)
  let ultimaChecagem = 0;
  let algumaAberta = false;

  /* =====================================================
     PORTAS
     tipo: 'giro' (dobradiça) · 'corre' (desliza) · 'janela' (duas folhas)
     dentro: 'olhos' · 'rosto' · 'mao'
     ===================================================== */
  const PORTAS = [
    { id: 'saguao',   lado: 'E', prof: -380,    w: 190, h: 520, tipo: 'giro',   estilo: 'saguao',   dentro: 'olhos', nome: 'Porta do saguão' },
    { id: 'colonial', lado: 'D', prof: 650,  w: 200, h: 520, tipo: 'giro',   estilo: 'colonial', dentro: 'olhos', nome: 'Porta colonial' },
    { id: 'shoji',    lado: 'E', prof: 1820, w: 300, h: 600, tipo: 'corre',  estilo: 'shoji',    dentro: 'olhos', nome: 'Shoji' },
    { id: 'ofuda',    lado: 'D', prof: 2200, w: 200, h: 520, tipo: 'giro',   estilo: 'ofuda',    dentro: 'olhos', nome: 'Porta selada com ofuda' },
    { id: 'lua',      lado: 'D', prof: 3000, w: 300, h: 300, top: 360, tipo: 'giro', estilo: 'lua', dentro: 'gigante', nome: 'Portão da lua' },
    { id: 'jharokha', lado: 'E', prof: 3400, w: 220, h: 280, top: 230, tipo: 'janela', estilo: 'jharokha', dentro: 'olhos', nome: 'Janela jharokha' },
    { id: 'capiz',    lado: 'D', prof: 3800, w: 200, h: 520, tipo: 'giro',   estilo: 'capiz',    dentro: 'olhos', nome: 'Porta de capiz' }
  ];

  function conteudoVao(tipo) {
    const CORES = ['ambar', 'morto', 'morto', 'sangue', 'musgo'];
    const cor = () => CORES[Math.floor(Math.random() * CORES.length)];
    let html = '<div class="vao-luz"></div>';
    if (tipo === 'gigante') { // um olho só, enorme, no escuro
      html += `<div class="par" style="left:50%;top:50%;margin:-70px 0 0 -105px;transition-delay:.8s">${Bau.olho({ larg: 210, cor: 'morto' })}</div>`;
    } else {
      // 3–5 olhos em alturas diferentes, como gente de tamanhos diferentes espiando
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const larg = 56 + Math.random() * 40;
        html += `<div class="par" style="left:${(6 + Math.random() * 52).toFixed(0)}%;top:${(8 + i * (78 / n) + Math.random() * 6).toFixed(0)}%;transition-delay:${(0.6 + i * 0.3).toFixed(2)}s">${Bau.olho({ larg, cor: cor(), rot: (Math.random() - 0.5) * 16 })}</div>`;
      }
    }
    return html;
  }

  function folhaHTML(p) {
    if (p.estilo === 'ofuda') {
      return '<div class="ofuda" style="left:30px;top:120px;transform:rotate(-6deg)">封</div><div class="ofuda" style="left:84px;top:90px;transform:rotate(3deg)">鎮</div><div class="ofuda" style="left:128px;top:150px;transform:rotate(-2deg)">急</div><div class="macaneta"></div>';
    }
    if (p.estilo === 'shoji') return '<div class="sombra-shoji"></div>';
    if (p.estilo === 'lua') return '<div class="lua-ripas"></div>';
    if (p.estilo === 'saguao') return '<div class="olho-magico"></div><div class="macaneta"></div>';
    return '<div class="macaneta"></div>';
  }

  function montarPorta(p) {
    const parede = p.lado === 'E' ? k.esq : k.dir;
    const x = p.lado === 'E' ? k.naEsq(p.prof, p.w) : k.naDir(p.prof, p.w);
    const top = p.top != null ? p.top : 900 - p.h;
    const el = k.criar('div', `porta3d p3d estilo-${p.estilo} tipo-${p.tipo}`, `left:${x}px;top:${top}px;width:${p.w}px;height:${p.h}px`, parede);
    el.setAttribute('title', p.nome);
    k.criar('div', 'porta-vao', '', el, conteudoVao(p.dentro));
    if (p.tipo === 'janela') {
      k.criar('div', 'porta-folha folha-a', '', el);
      k.criar('div', 'porta-folha folha-b', '', el);
    } else {
      k.criar('div', 'porta-folha', '', el, folhaHTML(p));
    }
    // bandeira (vitral semicircular) + fitas do Bonfim na porta colonial
    if (p.estilo === 'colonial') {
      k.svg(p.w, 80, `0 0 ${p.w} 80`,
        `<path d="M0 80 A${p.w / 2} 80 0 0 1 ${p.w} 80Z" fill="#0d0b08" stroke="#3a2a1a" stroke-width="8"/>` +
        [15, 40, 65, 90, 115, 140, 165].map(a => { const r = a * Math.PI / 180; return `<path d="M${p.w / 2} 80 L${(p.w / 2 - Math.cos(r) * p.w / 2).toFixed(1)} ${(80 - Math.sin(r) * 76).toFixed(1)}" stroke="#4a3a24" stroke-width="3"/>`; }).join('') +
        `<circle cx="${p.w / 2}" cy="80" r="16" fill="#4a3a24"/>`,
        '', `left:${x}px;top:${top - 88}px`, parede);
      const cores = ['#c62a2a', '#e2b33a', '#2a7ac6', '#2aa05a', '#f2f2f2', '#d0602a', '#8a3ab0'];
      cores.forEach(function (c, n) {
        k.criar('div', 'fita', `left:${x - 4 + n * 5}px;top:${top - 4}px;height:${50 + (n * 17) % 45}px;background:${c};transform:rotate(${(n - 3) * 2}deg)`, parede);
      });
    }
    const obj = { cfg: p, el, aberta: false, ate: 0, nunca: true };
    el.addEventListener('click', function () { abrir(obj, performance.now()); });
    portas.push(obj);
  }

  function abrir(p, agora) {
    if (p.aberta) return;
    p.aberta = true; p.nunca = false; algumaAberta = true;
    if (p.cfg.estilo === 'shoji') { // antes de abrir, uma sombra passa atrás do papel
      p.el.classList.add('sombra');
      setTimeout(() => { p.el.classList.remove('sombra'); p.el.classList.add('aberta'); Bau.som.rangido(true); }, 1500);
    } else {
      p.el.classList.add('aberta');
      Bau.som.rangido();
    }
    setTimeout(function () {
      p.el.classList.remove('aberta');
      setTimeout(function () { p.aberta = false; algumaAberta = false; Bau.som.batida(); }, 900);
      p.ate = performance.now() + 14000;
    }, 4200 + Math.random() * 1800);
  }

  /* =====================================================
     OBJETOS DO MUNDO TODO
     ===================================================== */
  function pendurar(prof, x, largura, svgW, svgH, conteudo, classe) {
    const caixa = k.criar('div', 'pendurado', `left:${x - largura / 2}px;top:0;width:${largura}px;transform:translateZ(-${prof}px)`);
    const pend = k.criar('div', 'pendulo', 'position:relative', caixa);
    k.svg(svgW, svgH, `0 0 ${svgW} ${svgH}`, conteudo, classe || '', 'position:relative', pend);
    return caixa;
  }

  const SVG = {
    // Marrocos: fanous (lanterna de latão vazada)
    fanous: (() => {
      let furos = '';
      for (let y = 140; y < 210; y += 12) for (let x = 24; x < 76; x += 10) furos += `<circle cx="${x + ((y / 12) % 2) * 5}" cy="${y}" r="2.4" fill="#ffd27a"/>`;
      return `<path d="M50 0 V118" stroke="#5a4520" stroke-width="2"/><path d="M38 118 h24 l8 16 h-40z" fill="#9a7432"/><path d="M18 134 h64 l-6 84 h-52z" fill="#2a1d0e"/>${furos}<path d="M24 218 h52 l-12 16 h-28z" fill="#9a7432"/><circle cx="50" cy="242" r="4" fill="#9a7432"/>`;
    })(),
    // Japão: chōchin
    chochin: '<path d="M30 0 V110" stroke="#2a2219" stroke-width="2"/><rect x="10" y="108" width="40" height="8" fill="#16110c"/><rect x="0" y="114" width="60" height="92" rx="28" fill="#9a2e1f"/><path d="M2 128 H58 M0 144 H60 M0 160 H60 M0 176 H60 M2 192 H58" stroke="#7a2216" stroke-width="2"/><rect x="10" y="204" width="40" height="8" fill="#16110c"/>',
    // Japão: teru teru bōzu
    teru: '<path d="M15 0 V60" stroke="#3a3127" stroke-width="1.5"/><circle cx="15" cy="70" r="10" fill="#e8e0d0"/><path d="M5 76 L0 104 H30 L25 76Z" fill="#ddd4c2"/><path d="M5 78 H25" stroke="#8a2a20" stroke-width="2"/><circle cx="11" cy="69" r="1.3" fill="#0b0a09"/><circle cx="19" cy="69" r="1.3" fill="#0b0a09"/>',
    // China: lanterna de palácio
    palacio: '<path d="M45 0 V100" stroke="#5a4520" stroke-width="2"/><rect x="25" y="98" width="40" height="12" fill="#c9952e"/><ellipse cx="45" cy="160" rx="45" ry="52" fill="#a0221a"/><path d="M45 108 V212 M25 112 C14 140 14 180 25 208 M65 112 C76 140 76 180 65 208" stroke="#6e1410" stroke-width="2" fill="none"/><rect x="25" y="208" width="40" height="12" fill="#c9952e"/><path d="M35 220 V262 M40 220 V266 M45 220 V270 M50 220 V266 M55 220 V262" stroke="#b02a20" stroke-width="2"/>',
    // Índia: lamparina de sino de latão
    sino: '<path d="M20 0 L35 100 M50 0 L35 100" stroke="#6b5326" stroke-width="1.5"/><path d="M35 100 V110" stroke="#6b5326" stroke-width="2"/><path d="M10 160 C10 126 22 110 35 110 C48 110 60 126 60 160 Z" fill="#b5893a"/><path d="M4 160 H66" stroke="#8a6a2e" stroke-width="5"/><ellipse cx="35" cy="168" rx="5" ry="8" fill="#ffcf6a"/>',
    // Filipinas: parol (estrela de Natal)
    parol: '<path d="M60 0 V40" stroke="#5a4520" stroke-width="2"/><path d="M60 40 L72 78 L112 78 L80 101 L92 140 L60 116 L28 140 L40 101 L8 78 L48 78 Z" fill="#e8b450" fill-opacity=".85" stroke="#fff1c8" stroke-width="2"/><circle cx="60" cy="92" r="14" fill="#fff1c8" fill-opacity=".8"/><path d="M48 128 C44 160 40 180 34 200 M60 118 V205 M72 128 C76 160 80 180 86 200" stroke="#d23a2a" stroke-width="3" fill="none"/>',
    // Turquia/Grécia: nazar (olho grego) pendurado num prego
    nazar: '<path d="M20 0 V12" stroke="#6b5326" stroke-width="1.5"/><circle cx="20" cy="30" r="17" fill="#1f4fa0"/><circle cx="20" cy="30" r="12" fill="#ece5d6"/><circle cx="20" cy="30" r="7.5" fill="#4aa0d0"/><circle cx="20" cy="30" r="3.6" fill="#0b0a09"/>',
    // Japão: tōrō (lanterna de pedra)
    toro: '<path d="M10 230 H90 V214 H10Z M30 214 V140 H70 V214 M20 140 H80 V128 H20Z" fill="#5a5650"/><rect x="26" y="78" width="48" height="50" fill="#4a4640"/><rect x="38" y="90" width="24" height="26" fill="#ffd27a"/><path d="M8 78 L50 46 L92 78Z" fill="#5a5650"/><circle cx="50" cy="38" r="9" fill="#5a5650"/>',
    // Brasil: costela-de-adão
    monstera: '<path d="M100 340 L100 170" stroke="#1f2a1a" stroke-width="5"/><path d="M100 190 C25 180 -10 110 20 50 C50 0 130 10 160 60 C190 110 165 175 100 190Z" fill="#22331d"/><path d="M100 190 L45 80 M100 190 L80 50 M100 190 L125 60 M100 190 L155 100" stroke="#14180f" stroke-width="7"/><path d="M100 230 C175 230 215 180 205 140 C185 110 135 140 100 230Z" fill="#1d2b18"/><path d="M58 340 L66 280 L134 280 L142 340Z" fill="#3a2a1d"/>'
  };

  function papelPicado(prof) {
    const cores = ['#b0456a', '#d0803a', '#3a8a8a', '#7a4a9a', '#c9b23a'];
    let s = '<path d="M0 6 Q720 46 1440 6" stroke="#2a2219" stroke-width="1.5" fill="none"/>';
    for (let n = 0, x = 20; x < 1420; x += 40, n++) {
      const t = x / 1440, y = 6 * (1 - t) * (1 - t) + 2 * 46 * t * (1 - t) + 6 * t * t;
      s += `<g transform="translate(${x} ${y.toFixed(1)})"><path d="M0 0 H28 V32 L25 36 L22 32 L19 36 L16 32 L13 36 L10 32 L7 36 L4 32 L1 36 L0 32Z" fill="${cores[n % cores.length]}" fill-opacity=".8"/>` +
        `<circle cx="14" cy="13" r="4.5" fill="#1a1712"/><path d="M6 24 L9 21 L12 24 L9 27Z M16 24 L19 21 L22 24 L19 27Z" fill="#1a1712"/></g>`;
    }
    k.svg(1440, 90, '0 0 1440 90', s, 'papel-picado', `left:0;top:110px;transform:translateZ(-${prof}px)`);
  }

  function noren(prof) {
    const caixa = k.criar('div', 'noren', `transform:translateZ(-${prof}px)`);
    for (let n = 0; n < 4; n++) k.criar('div', 'noren-pano', `left:${380 + n * 172}px`, caixa);
    k.criar('div', 'noren-mon', '', caixa, '<span>怪</span>');
  }

  function poca(prof, cor) {
    const estilo = cor ? `background:radial-gradient(ellipse,${cor},transparent 68%);` : '';
    k.criar('div', 'poca-luz', `${estilo}left:370px;top:${k.noChao(prof, 560)}px`, k.chao);
  }

  /* ---------- montar tudo ---------- */
  function montar(kit) {
    k = kit;
    const { criar, svg, naEsq, naDir, noChao, noTeto, esq, dir, chao, teto } = k;

    /* SAGUÃO: mistura do mundo — fanous (Marrocos), papel picado (México), nazar (Turquia) */
    pendurar(-250, 720, 100, 100, 250, SVG.fanous, 'brilho-quente piscar');
    papelPicado(120);
    [[-760, 300], [-710, 360], [-660, 320]].forEach(function (n) {
      svg(40, 50, '0 0 40 50', SVG.nazar, '', `left:${naEsq(n[0], 40)}px;top:${n[1]}px`, esq);
    });
    poca(-250, 'rgba(255,190,100,.28)');

    /* BRASIL */
    criar('div', 'lampada piscar', `left:700px;top:${noTeto(420, 40)}px`, teto);
    poca(420);
    [[30, 300], [1230, 760]].forEach(function (p) {
      const v = criar('div', '', `left:${p[0]}px;top:560px;width:200px;height:340px;transform:translateZ(-${p[1]}px)`);
      svg(200, 340, '0 0 210 340', SVG.monstera, '', '', v);
    });
    const gorro = svg(90, 120, '0 0 90 120',
      '<path d="M45 0 v14" stroke="#6b5326" stroke-width="4"/><path d="M45 14 C20 40 10 80 6 110 C30 118 60 118 84 110 C78 70 66 40 45 14Z" fill="#a32424"/>',
      'gorro-saci', `left:${naDir(400, 90)}px;top:330px`, dir);
    gorro.setAttribute('role', 'button');
    gorro.setAttribute('aria-label', 'Gorro vermelho');
    gorro.addEventListener('click', function (ev) { ev.stopPropagation(); Bau.eggs && Bau.eggs.saci(ev); });
    const pe = '<ellipse cx="20" cy="40" rx="14" ry="26"/><circle cx="10" cy="8" r="4"/><circle cx="20" cy="5" r="4"/><circle cx="30" cy="8" r="4"/>';
    [[640, 300], [740, 460], [630, 620], [735, 780]].forEach(function (p) {
      svg(40, 70, '0 0 40 70', `<g fill="#070504" fill-opacity=".8" transform="rotate(180 20 35)">${pe}</g>`, '', `left:${p[0]}px;top:${noChao(p[1], 70)}px`, chao);
    });

    /* JAPÃO: noren na entrada, chōchin, teru teru bōzu, tōrō */
    [1400, 2200].forEach((p, n) => pendurar(p, 720, 60, 60, 212, SVG.chochin, 'brilho-vermelho ' + (n ? 'piscar2' : 'piscar')));
    poca(1400, 'rgba(200,80,50,.22)'); poca(2200, 'rgba(200,80,50,.22)');
    [[260, 2480], [330, 2540], [210, 2600]].forEach(function (t, n) {
      const c = pendurar(t[1], t[0], 30, 30, 104, SVG.teru, '');
      c.firstChild.style.animationDelay = (-n * 1.3) + 's';
    });
    const toro = criar('div', '', `left:1250px;top:670px;width:100px;height:230px;transform:translateZ(-1500px)`);
    svg(100, 230, '0 0 100 230', SVG.toro, 'brilho-quente', '', toro);

    /* CHINA: lanterna de palácio */
    pendurar(2980, 720, 90, 90, 270, SVG.palacio, 'brilho-vermelho piscar2');
    poca(2980, 'rgba(210,60,40,.25)');

    /* ÍNDIA: lamparina de sino, guirlanda de cravos, diyas */
    pendurar(3420, 720, 70, 70, 180, SVG.sino, 'brilho-quente piscar');
    poca(3420, 'rgba(255,180,80,.3)');
    svg(320, 60, '0 0 320 60', '<path d="M0 6 C80 60 240 60 320 6" stroke="#e0782a" stroke-width="11" stroke-linecap="round" stroke-dasharray="1 13" fill="none"/>', '', `left:${naDir(3400, 320)}px;top:150px`, dir);
    [[60, 3280], [60, 3520], [1366, 3300], [1366, 3560]].forEach(function (p, n) {
      criar('div', 'diya-chao ' + (n % 2 ? 'piscar2' : 'piscar'), `left:${p[0]}px;top:${noChao(p[1], 14)}px`, chao);
    });

    /* FILIPINAS: parol */
    pendurar(3820, 720, 120, 120, 205, SVG.parol, 'brilho-quente piscar');
    poca(3820, 'rgba(255,200,100,.3)');
    criar('div', 'lampada piscar2', `left:700px;top:${noTeto(4420, 40)}px`, teto);
    poca(4420);

    /* Sala do Baú (RA) */
    const sala = criar('div', 'porta-lateral', `left:${naDir(4310, 220)}px;top:200px;width:220px;height:700px`, dir);
    sala.title = 'Sala do Baú — Realidade Aumentada';
    sala.addEventListener('click', function () { window.location.href = (Bau.ROTAS && Bau.ROTAS.ra) || '/ra.html'; });
    criar('div', 'placa', `left:${naDir(4310, 220)}px;top:150px;width:220px`, dir, 'SALA DO BAÚ · RA');

    /* portas */
    PORTAS.forEach(montarPorta);
  }

  /* ---------- a cada quadro: decide se alguma porta abre ---------- */
  function atualizar(e, agora) {
    if (!e.dentro || agora - ultimaChecagem < 700) return;
    ultimaChecagem = agora;
    if (algumaAberta || document.getElementById('dossie').hidden === false) return;
    for (const p of portas) {
      const dist = p.cfg.prof - e.camZ;
      if (dist < 220 || dist > 1400 || agora < p.ate) continue;
      const chance = p.nunca ? 0.22 : 0.07; // a primeira vez é mais provável (bom pra apresentação)
      if (Math.random() < chance) { abrir(p, agora); break; }
    }
  }

  return { montar, atualizar, PORTAS, get portas() { return portas; } };
})();
