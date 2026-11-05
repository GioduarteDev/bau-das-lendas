/* =========================================================
   JARDIM 3D + FACHADA (preto com traço branco, desenho à mão)
   - A câmera nasce no portão e atravessa o jardim com o scroll.
   - Tudo aqui é desenhado por código: nada de imagem externa.
   - A fachada fica exatamente na boca do corredor (prof. -1000):
     a porta é um buraco de verdade, então você entra andando.
   ========================================================= */
window.Bau = window.Bau || {};

Bau.jardim = (function () {
  const TINTA = '#efe6d2', BREU = '#0b0a09', LUZ = '#f4ecd8', CAPUZ = '#b3261e';
  const FACHADA = -1012;           // fachada: 12px antes da boca do corredor (evita brigar com as paredes)
  const INICIO = -5600;            // onde a câmera nasce
  const PORTAO = -4500;            // profundidade do portão

  let el = {};                     // elementos que mexem

  /* ---------- sorteio com semente (o desenho sai sempre igual) ---------- */
  let semente = 11;
  function rnd() { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; }
  const r = (a, b) => a + rnd() * (b - a);
  const q = (n) => Math.round(n);
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- caminho de pedras: o x do caminho em cada profundidade ---------- */
  function caminhoX(prof) {
    const t = lim((prof - INICIO) / (-2500 - INICIO), 0, 1);
    const s = t * t * (3 - 2 * t);
    return 720 - 1100 * (1 - s);
  }

  /* ---------- traço à mão ---------- */
  // uma linha levemente torta, que passa um pouquinho do ponto (como no desenho de verdade)
  function seg(x1, y1, x2, y2, a) {
    a = a == null ? 3 : a;
    const ex = x2 - x1, ey = y2 - y1, L = Math.hypot(ex, ey) || 1;
    const o = r(1, Math.min(12, L * 0.06)) / L;
    const ax = x1 - ex * o + r(-a, a) * 0.4, ay = y1 - ey * o + r(-a, a) * 0.4;
    const bx = x2 + ex * o + r(-a, a) * 0.4, by = y2 + ey * o + r(-a, a) * 0.4;
    const nx = -ey / L, ny = ex / L, b = r(-a, a);
    return `M${q(ax)} ${q(ay)}Q${q((ax + bx) / 2 + nx * b)} ${q((ay + by) / 2 + ny * b)} ${q(bx)} ${q(by)}`;
  }
  function arcoPts(cx, cy, rx, ry, a0, a1, n) {
    const p = [];
    for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; p.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); }
    return p;
  }
  // camada de desenho: preenchimentos pretos + traço forte + traço fino (repassado) + hachura
  function Camada() {
    const c = { f: '', a: '', b: '', h: '', extra: '' };
    c.linha = function (x1, y1, x2, y2, a) { c.a += seg(x1, y1, x2, y2, a); c.b += seg(x1, y1, x2, y2, a); return c; };
    c.fina = function (x1, y1, x2, y2, a) { c.b += seg(x1, y1, x2, y2, a); return c; };
    c.hach = function (x1, y1, x2, y2, a) { c.h += seg(x1, y1, x2, y2, a == null ? 1.5 : a); return c; };
    c.poli = function (pts, fechar, a, so) {
      for (let i = 0; i < pts.length - 1; i++) (so === 'fina' ? c.fina : c.linha)(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], a);
      if (fechar) (so === 'fina' ? c.fina : c.linha)(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], a);
      return c;
    };
    c.ret = function (x, y, w, h, a) { return c.poli([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, a); };
    c.encher = function (pts) { c.f += 'M' + pts.map((p) => q(p[0]) + ' ' + q(p[1])).join('L') + 'Z'; return c; };
    c.svg = function (lw) {
      lw = lw || 5;
      return (c.f ? `<path d="${c.f}" fill="${BREU}"/>` : '') +
        `<g fill="none" stroke="${TINTA}" stroke-linecap="round" stroke-linejoin="round">` +
        (c.h ? `<path d="${c.h}" stroke-width="${lw * 0.4}" stroke-opacity=".5"/>` : '') +
        (c.b ? `<path d="${c.b}" stroke-width="${lw * 0.45}" stroke-opacity=".6"/>` : '') +
        (c.a ? `<path d="${c.a}" stroke-width="${lw}"/>` : '') +
        '</g>' + c.extra;
    };
    return c;
  }

  /* ---------- montar no mundo ---------- */
  let K;   // kit do corredor
  // Cada grupo é um "palco 3D" separado, empilhado na ordem certa.
  // Assim o navegador nunca precisa decidir o que fica na frente de quê
  // entre peças tortas (era isso que fazia pedaços da casa sumirem).
  const P = {};
  const comProf = [];  // peças com profundidade (somem quando ficam atrás da câmera)
  function svgTxt(w, h, conteudo, extra) {
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible;${extra || ''}">${conteudo}</svg>`;
  }
  // um "cartaz" em pé no chão, virado para a câmera
  function cartaz(x, prof, w, h, conteudo, opts) {
    opts = opts || {};
    const base = opts.base == null ? 900 : opts.base;
    const d = K.criar('div', 'j-cartaz ' + (opts.classe || ''),
      `left:${q(x - w / 2)}px;top:${q(base - h)}px;width:${w}px;height:${h}px;transform:translateZ(${q(-prof)}px)`, prof < PORTAO ? P.perto : P.longe);
    comProf.push({ el: d, prof: prof });
    d.innerHTML = svgTxt(w, h, conteudo, opts.svgEstilo);
    if (opts.anima) d.firstChild.setAttribute('class', opts.anima);
    if (opts.atraso) d.firstChild.style.animationDelay = opts.atraso;
    return d;
  }

  /* =========================================================
     CHÃO DO JARDIM (canvas deitado)
     ========================================================= */
  const CH = { x0: -2780, w: 7000, prof0: -1000, prof1: -7000, esc: 2.5 };
  function chao() {
    const cw = q(CH.w / CH.esc), chh = q((CH.prof0 - CH.prof1) / CH.esc);
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = chh;
    const g = cv.getContext('2d');
    const X = (x) => (x - CH.x0) / CH.esc;
    const Y = (prof) => (CH.prof0 - prof) / CH.esc;
    g.fillStyle = BREU; g.fillRect(0, 0, cw, chh);
    g.lineCap = 'round';

    // mato: risquinhos, mais densos perto do caminho
    for (let i = 0; i < 5000; i++) {
      const prof = r(CH.prof1, CH.prof0 - 60);
      const cx = caminhoX(prof);
      let dx = r(-3200, 3200);
      if (rnd() < 0.45) dx = (rnd() < 0.5 ? -1 : 1) * r(250, 700);
      const x = cx + dx;
      if (Math.abs(dx) < 240) continue;
      const px = X(x), py = Y(prof);
      g.strokeStyle = `rgba(239,230,210,${r(0.07, 0.3).toFixed(2)})`;
      g.lineWidth = r(0.8, 1.6);
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + r(-3, 3), py + r(-6, -2), px + r(-4, 4), py - r(6, 16)); g.stroke();
    }

    // bordas do caminho (tracejado à mão)
    g.strokeStyle = 'rgba(239,230,210,.5)'; g.lineWidth = 1.6;
    [-245, 245].forEach(function (lado) {
      for (let prof = CH.prof1; prof < -1180; prof += r(40, 90)) {
        const p2 = prof + r(30, 70);
        g.beginPath(); g.moveTo(X(caminhoX(prof) + lado + r(-12, 12)), Y(prof)); g.lineTo(X(caminhoX(p2) + lado + r(-12, 12)), Y(p2)); g.stroke();
      }
    });

    // pedras do caminho
    for (let prof = CH.prof1 + 60, k = 0; prof < -1220; prof += r(95, 130), k++) {
      const n = rnd() < 0.5 ? 2 : 3;
      for (let j = 0; j < n; j++) {
        const cx = caminhoX(prof) + (j - (n - 1) / 2) * r(130, 160) + r(-20, 20);
        const raio = r(45, 66), lados = 9;
        g.beginPath();
        for (let s = 0; s <= lados; s++) {
          const t = (s / lados) * Math.PI * 2 + r(-0.2, 0.2), rr = raio * (s === lados ? 1 : r(0.6, 1.1));
          const px = X(cx + Math.cos(t) * rr * 1.25), py = Y(prof + Math.sin(t) * rr * 0.8);
          if (s === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.fillStyle = '#16130f'; g.fill();
        g.strokeStyle = `rgba(239,230,210,${r(0.55, 0.85).toFixed(2)})`; g.lineWidth = r(1.4, 2.2); g.stroke();
        if (rnd() < 0.4) { // rachadura na pedra
          g.lineWidth = 1; g.beginPath(); g.moveTo(X(cx - 20), Y(prof)); g.lineTo(X(cx + r(-5, 5)), Y(prof + 10)); g.lineTo(X(cx + 18), Y(prof - 6)); g.stroke();
        }
      }
    }

    // assoalho da varanda + capacho
    g.strokeStyle = 'rgba(239,230,210,.6)'; g.lineWidth = 1.6;
    for (let prof = -1000; prof > -1230; prof -= 38) {
      g.beginPath(); g.moveTo(X(170 + r(-8, 8)), Y(prof)); g.lineTo(X(1270 + r(-8, 8)), Y(prof + r(-3, 3))); g.stroke();
    }
    g.lineWidth = 2.4; g.strokeRect(X(170), Y(-1000), (1100) / CH.esc, (230) / CH.esc);

    // pegadas do Curupira: os dedos apontam para trás (para você), mas o rastro vai para o mato
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const prof = -1500 - t * 2600, x = 260 - t * 1900 + (i % 2 ? 46 : -46);
      const px = X(x), py = Y(prof);
      g.save(); g.translate(px, py); g.rotate((i % 2 ? 0.25 : -0.25) - 0.5);
      g.strokeStyle = 'rgba(239,230,210,.6)'; g.lineWidth = 1.3;
      g.beginPath(); g.ellipse(0, 0, 9, 17, 0, 0, Math.PI * 2); g.stroke();
      for (let d = 0; d < 5; d++) { g.beginPath(); g.arc(-8 + d * 4, 21 + Math.abs(d - 2) * -1.5, 2.2 - d * 0.15, 0, Math.PI * 2); g.stroke(); }
      g.restore();
    }

    // folhas secas caídas
    for (let i = 0; i < 70; i++) {
      const prof = r(CH.prof1, -1300), x = caminhoX(prof) + r(-1600, 1600);
      g.save(); g.translate(X(x), Y(prof)); g.rotate(r(0, 6.28));
      g.strokeStyle = `rgba(239,230,210,${r(0.15, 0.4).toFixed(2)})`; g.lineWidth = 1;
      g.beginPath(); g.ellipse(0, 0, r(3, 6), r(1.5, 3), 0, 0, Math.PI * 2); g.moveTo(-6, 0); g.lineTo(6, 0); g.stroke();
      g.restore();
    }

    cv.className = 'j-chao';
    cv.setAttribute('style', `position:absolute;left:${CH.x0}px;top:${900 - (CH.prof0 - CH.prof1)}px;width:${CH.w}px;height:${CH.prof0 - CH.prof1}px;` +
      `transform-origin:50% 100%;transform:translateZ(${-CH.prof1}px) rotateX(90deg)`);
    P.chao.appendChild(cv);
  }

  /* =========================================================
     FACHADA (plano 3600 × 3300 na boca do corredor)
     coordenadas locais: x_local = x_mundo + 1080, y_local = y_mundo + 2400
     ========================================================= */
  function janela(c, x, y, w, h, o) {
    o = o || {};
    // persianas
    if (o.persianas !== false) {
      const pw = w * 0.42;
      [[x - pw - 14, 0], [x + w + 14, 1]].forEach(function (p, i) {
        if (o.semPersiana === i) return;
        const torta = o.torta === i ? 40 : 0;
        const px = p[0], pts = [[px, y + torta * 0.3], [px + pw, y], [px + pw, y + h], [px + torta * 0.5, y + h + torta]];
        c.encher(pts).poli(pts, true, 2);
        for (let k = y + 30; k < y + h - 20; k += 34) c.hach(px + 10 + torta * 0.2, k + torta * 0.2, px + pw - 10, k, 1);
      });
    }
    const caixa = o.arco
      ? [[x, y + h]].concat([[x, y + w / 2]], arcoPts(x + w / 2, y + w / 2, w / 2, w / 2, Math.PI, Math.PI * 2, 10), [[x + w, y + h]])
      : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    c.encher(caixa);
    if (o.acesa) {
      const m = 16;
      const dentro = o.arco
        ? [[x + m, y + h - m], [x + m, y + w / 2]].concat(arcoPts(x + w / 2, y + w / 2, w / 2 - m, w / 2 - m, Math.PI, Math.PI * 2, 10), [[x + w - m, y + h - m]])
        : [[x + m, y + m], [x + w - m, y + m], [x + w - m, y + h - m], [x + m, y + h - m]];
      c.extra += `<path class="j-vela" style="animation-delay:${r(-6, 0).toFixed(1)}s" d="M${dentro.map((p) => q(p[0]) + ' ' + q(p[1])).join('L')}Z" fill="${LUZ}" fill-opacity="${o.acesa}"/>`;
    }
    c.poli(caixa, true, 2.5);
    // moldura dupla, parapeito e cruz
    c.linha(x - 26, y + h + 8, x + w + 26, y + h + 8, 2).linha(x - 20, y + h + 26, x + w + 20, y + h + 26, 2);
    if (!o.arco) c.linha(x - 20, y - 18, x + w + 20, y - 18, 2);
    const cruz = new Camada();
    cruz.linha(x + w / 2, y + (o.arco ? 10 : 0), x + w / 2, y + h, 1.5).linha(x, y + h * 0.48, x + w, y + h * 0.48, 1.5);
    if (o.quebrada) { // vidro trincado
      const cx = x + w * 0.3, cy = y + h * 0.3;
      for (let k = 0; k < 6; k++) { const t = r(0, 6.28); cruz.fina(cx, cy, cx + Math.cos(t) * r(30, 80), cy + Math.sin(t) * r(30, 80), 3); }
    }
    c.extra += `<g class="${o.acesa ? '' : ''}">${cruz.svg(o.acesa ? 7 : 5).replace(TINTA, o.acesa ? BREU : TINTA)}</g>`;
  }

  function hera(c, x, y, alt, dir) {
    let px = x, py = y;
    for (let i = 0; i < alt / 50; i++) {
      const nx = px + r(-26, 26) + dir * 6, ny = py - r(40, 60);
      c.fina(px, py, nx, ny, 4);
      if (rnd() < 0.7) { // folhinha
        const lx = nx + (rnd() < 0.5 ? -1 : 1) * r(16, 30), ly = ny + r(-10, 10);
        c.poli([[nx, ny], [lx, ly - 12], [lx + (lx > nx ? 14 : -14), ly], [lx, ly + 12]], true, 1, 'fina');
      }
      px = nx; py = ny;
    }
  }

  function fachada() {
    const W = 3600, H = 3300, OX = 1080, OY = 2400;
    const ch = new Camada(), te = new Camada(), to = new Camada(), pa = new Camada(), ja = new Camada(), fr = new Camada();

    // chaminé (fica atrás do telhado)
    ch.encher([[2690, 640], [2870, 640], [2870, 1100], [2690, 1100]]).ret(2690, 640, 180, 460, 2).ret(2670, 610, 220, 40, 2);
    for (let y = 680; y < 1000; y += 44) ch.hach(2700, y, 2860, y, 1);

    // telhado
    const tl = [[130, 1380], [1800, 470], [3470, 1380]];
    te.encher(tl).poli(tl, true, 3).linha(150, 1410, 3450, 1410, 3);
    for (let y = 560; y < 1370; y += 64) { // fileiras de telha
      const t = (y - 470) / 910, x0 = 1800 - t * 1670 + 20, x1 = 1800 + t * 1670 - 20;
      te.fina(x0, y, x1, y, 2);
      for (let x = x0 + r(0, 50); x < x1 - 20; x += r(48, 70)) te.hach(x, y, x + r(-4, 4), y + 54, 1);
    }
    // janela redonda do sótão (olho da casa)
    te.encher(arcoPts(1800, 1080, 140, 140, 0, Math.PI * 2, 24));
    te.extra += `<circle class="j-vela2" cx="1800" cy="1080" r="118" fill="${LUZ}" fill-opacity=".8"/>`;
    te.poli(arcoPts(1800, 1080, 140, 140, 0, Math.PI * 2, 18), true, 2).poli(arcoPts(1800, 1080, 160, 160, 0, Math.PI * 2, 18), true, 3);
    te.extra += `<path d="M1800 962 V1198 M1682 1080 H1918" stroke="${BREU}" stroke-width="12"/>`;

    // torre (esquerda)
    const torre = [[40, 900], [540, 900], [540, 3300], [40, 3300]];
    to.encher(torre).poli(torre, true, 3);
    const cone = [[0, 930], [290, 70], [580, 930]];
    to.encher(cone).poli(cone, true, 3);
    for (let y = 160; y < 920; y += 52) { const t = (y - 70) / 860; to.hach(290 - t * 290 + 14, y, 290 + t * 290 - 14, y, 1.5); }
    to.linha(290, 70, 290, -10, 1).linha(250, 20, 330, 20, 1).poli([[290, -10], [270, 10], [310, 10]], true, 1); // cata-vento
    for (let y = 980; y < 3280; y += 62) for (let x = 60; x < 520; x += r(70, 140)) to.hach(x, y, x + r(30, 90), y, 1.5);
    janela(to, 200, 1250, 180, 380, { arco: true, acesa: 0.9, persianas: false });
    janela(to, 200, 2280, 180, 380, { arco: true, persianas: false, quebrada: true });
    hera(to, 520, 3300, 1500, -1);
    hera(to, 70, 3300, 900, 1);

    // paredes (com tábuas)
    const parede = [[300, 1380], [3300, 1380], [3300, 3300], [300, 3300]];
    pa.encher(parede).poli(parede, true, 3);
    for (let y = 1450; y < 3290; y += 64) {
      if (y > 2120 && y < 2190) continue;
      let x = 310 + r(0, 60);
      while (x < 3260) { const L = r(240, 700); pa.hach(x, y + r(-2, 2), Math.min(3290, x + L), y + r(-3, 3), 2); x += L + r(20, 120); }
    }
    for (let x = 340; x < 3280; x += r(26, 40)) pa.hach(x, 1420, x - 60, 1560, 1); // sombra do beiral
    pa.linha(300, 2140, 3300, 2140, 3).linha(300, 2172, 3300, 2172, 3);
    pa.linha(300, 3260, 3300, 3260, 2);
    // rachaduras
    [[820, 1500], [3050, 2300], [1350, 2700]].forEach(function (p) {
      let x = p[0], y = p[1];
      for (let k = 0; k < 6; k++) { const nx = x + r(-30, 30), ny = y + r(30, 60); pa.fina(x, y, nx, ny, 2); x = nx; y = ny; }
    });
    hera(pa, 330, 3300, 1300, 1);
    hera(pa, 3270, 3300, 1100, -1);

    // janelas
    janela(ja, 520, 2420, 280, 480, { acesa: 0.85, torta: 0 });
    janela(ja, 1000, 2420, 280, 480, { quebrada: true, semPersiana: 1 });
    janela(ja, 2320, 2420, 280, 480, { semPersiana: 0 });
    janela(ja, 2800, 2420, 280, 480, { acesa: 0.7, torta: 1 });
    janela(ja, 540, 1600, 220, 380, {});
    janela(ja, 1110, 1600, 220, 380, { quebrada: true });
    janela(ja, 1690, 1600, 220, 380, { acesa: 0.95, persianas: false });
    janela(ja, 2270, 1600, 220, 380, { torta: 0 });
    janela(ja, 2840, 1600, 220, 380, { acesa: 0.75 });
    // a Loira na janela do meio (silhueta que aparece e some)
    ja.extra += `<g class="j-loira"><path d="M1800 1700 C1760 1700 1748 1740 1752 1780 C1740 1830 1730 1900 1722 1965 L1878 1965 C1870 1900 1860 1830 1848 1780 C1852 1740 1840 1700 1800 1700Z" fill="${BREU}"/>` +
      `<path d="M1760 1760 C1752 1830 1740 1900 1734 1960 M1840 1760 C1848 1830 1860 1900 1866 1960" stroke="${LUZ}" stroke-width="3" stroke-opacity=".5" fill="none"/></g>`;

    // moldura da porta (o buraco da porta é um recorte de verdade)
    const portaArco = arcoPts(1800, 2740, 290, 290, Math.PI, Math.PI * 2, 14);
    fr.poli([[1510, 3300], [1510, 2740]].concat(portaArco.slice(1, -1), [[2090, 2740], [2090, 3300]]), false, 2);
    fr.poli(arcoPts(1800, 2740, 330, 330, Math.PI, Math.PI * 2, 14), false, 2);
    fr.linha(1470, 2740, 1470, 3300, 2).linha(2130, 2740, 2130, 3300, 2);
    fr.ret(1770, 2398, 60, 52, 1);                       // pedra-chave

    // o buraco da porta é recortado dentro do próprio desenho
    const recorte = `M0 0H${W}V${H}H0Z M1540 ${H}V2740A260 260 0 0 1 2060 2740V${H}Z`;
    const desenho = ch.svg(6) + te.svg(6) + pa.svg(6) + to.svg(6) + ja.svg(6) + fr.svg(6);
    // a fachada é dividida em 9 pedaços: placa de vídeo nenhuma gosta de uma textura gigante
    const CO = 3, LI = 3, tw = W / CO, th = H / LI;
    el.fachada = [];
    for (let li = 0; li < LI; li++) for (let co = 0; co < CO; co++) {
      const id = 'j-recorte-' + li + co;
      const t = K.criar('div', 'j-fachada',
        `left:${-OX + co * tw}px;top:${-OY + li * th}px;width:${tw}px;height:${th}px;overflow:hidden;transform:translateZ(${-FACHADA}px)`, P.longe);
      t.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="left:${-co * tw}px;top:${-li * th}px">` +
        `<clipPath id="${id}"><path clip-rule="evenodd" d="${recorte}"/></clipPath><g clip-path="url(#${id})">${desenho}</g></svg>`;
      el.fachada.push(t);
    }

    // folhas da porta (abrem para dentro)
    function folha(lado) {
      const c = new Camada();
      const forma = lado === 'esq'
        ? [[0, 820]].concat(arcoPts(260, 260, 260, 260, Math.PI, Math.PI * 1.5, 8), [[260, 820]])
        : [[0, 820], [0, 0]].concat(arcoPts(0, 260, 260, 260, Math.PI * 1.5, Math.PI * 2, 8), [[260, 820]]);
      c.encher(forma).poli(forma, true, 2);
      const x0 = lado === 'esq' ? 40 : 30;
      c.ret(x0, 330, 190, 220, 2).ret(x0, 600, 190, 180, 2);
      for (let y = 300; y < 800; y += 40) c.hach(x0 + 10, y, x0 + 180, y, 1);
      if (lado === 'dir') {
        c.poli(arcoPts(70, 470, 26, 26, 0, Math.PI * 2, 10), true, 1).linha(70, 430, 70, 444, 1); // aldrava
        c.extra += `<circle cx="40" cy="520" r="7" fill="${TINTA}"/>`;
      }
      const f = K.criar('div', 'j-folha j-folha-' + lado,
        `left:${lado === 'esq' ? 460 : 720}px;top:80px;width:260px;height:820px;transform-origin:${lado === 'esq' ? '0' : '100%'} 50%`, P.folhas);
      f.innerHTML = svgTxt(260, 820, c.svg(5));
      return f;
    }
    el.brilho = K.criar('div', 'j-brilho', 'left:440px;top:60px;width:560px;height:840px;transform:translateZ(990px)', P.folhas);
    el.folhaE = folha('esq');
    el.folhaD = folha('dir');

    // varanda: colunas e telhadinho (um pouco à frente da fachada: dá profundidade)
    const pv = -1190;
    [250, 1190].forEach(function (x, i) {
      const c = new Camada();
      c.encher([[30, 0], [90, 0], [90, 1150], [30, 1150]]).ret(30, 40, 60, 1060, 2).ret(10, 0, 100, 40, 2).ret(14, 1100, 92, 50, 2);
      for (let y = 80; y < 1100; y += 30) c.hach(40, y, 80, y + 6, 1);
      if (i === 0) hera(c, 40, 1150, 900, 1);
      el['coluna' + i] = cartaz(x, pv, 120, 1150, c.svg(5), { classe: 'j-varanda' });
    });
    const tv = new Camada();
    const tri = [[0, 330], [600, 20], [1200, 330]];
    tv.encher(tri.concat([[1200, 360], [0, 360]])).poli(tri, true, 2).linha(0, 360, 1200, 360, 2);
    for (let y = 80; y < 320; y += 40) { const t = (y - 20) / 310; tv.hach(600 - t * 580 + 20, y, 600 + t * 580 - 20, y, 1.5); }
    for (let x = 40; x < 1180; x += 60) tv.poli(arcoPts(x + 30, 360, 30, 22, 0, Math.PI, 5), false, 1, 'fina'); // rendinha
    [180, 1020].forEach(function (x) { // lampiões pendurados
      tv.linha(x, 360, x, 470, 1).poli([[x - 32, 470], [x + 32, 470], [x + 26, 580], [x - 26, 580]], true, 1.5).linha(x - 40, 470, x + 40, 470, 1);
      tv.extra += `<g class="j-vela" style="animation-delay:-${x / 400}s"><circle cx="${x}" cy="525" r="90" fill="${LUZ}" fill-opacity=".1"/><path d="M${x - 22} 480 H${x + 22} L${x + 18} 572 H${x - 18}Z" fill="${LUZ}" fill-opacity=".9"/></g>`;
    });
    el.telhado = cartaz(720, pv, 1200, 640, tv.svg(5), { base: 80, classe: 'j-varanda' });
  }

  /* =========================================================
     ÁRVORES E LAMPIÕES
     ========================================================= */
  function arvore(w, h, balanco) {
    const c = new Camada();
    const galho = function (x, y, ang, comp, larg, nivel) {
      const ex = x + Math.cos(ang) * comp, ey = y + Math.sin(ang) * comp;
      const nx = -Math.sin(ang) * larg / 2, ny = Math.cos(ang) * larg / 2;
      const quad = [[x + nx, y + ny], [ex + nx * 0.6, ey + ny * 0.6], [ex - nx * 0.6, ey - ny * 0.6], [x - nx, y - ny]];
      c.encher(quad);
      if (larg > 14) { c.linha(quad[0][0], quad[0][1], quad[1][0], quad[1][1], 4); c.linha(quad[3][0], quad[3][1], quad[2][0], quad[2][1], 4); }
      else c.linha(x, y, ex, ey, 4);
      if (nivel <= 0) return;
      const n = nivel > 3 ? 2 : 2 + q(r(0, 1));
      for (let k = 0; k < n; k++) galho(ex, ey, ang + r(-0.7, 0.7) + (k - (n - 1) / 2) * 0.5, comp * r(0.6, 0.78), larg * 0.62, nivel - 1);
    };
    // tronco
    const tr = [[w / 2 - 70, h], [w / 2 - 34, h * 0.55], [w / 2 + 30, h * 0.55], [w / 2 + 80, h]];
    c.encher(tr).poli(tr, false, 4);
    for (let y = h * 0.6; y < h - 10; y += 26) c.hach(w / 2 - 30 + r(-10, 10), y, w / 2 + r(0, 30), y + r(10, 30), 2);
    galho(w / 2, h * 0.56, -Math.PI / 2 - 0.35, h * 0.25, 60, 5);
    galho(w / 2, h * 0.58, -Math.PI / 2 + 0.45, h * 0.24, 54, 5);
    if (balanco) galho(w / 2 - 10, h * 0.62, Math.PI + 0.12, w * 0.4, 46, 0); // galho reto do balanço
    // corvos
    for (let k = 0; k < 3; k++) {
      const x = r(w * 0.2, w * 0.8), y = r(h * 0.15, h * 0.4);
      c.encher([[x - 20, y], [x, y - 22], [x + 24, y - 10], [x + 26, y + 8], [x - 10, y + 10]]).poli([[x - 20, y], [x, y - 22], [x + 24, y - 10], [x + 26, y + 8], [x - 10, y + 10]], true, 1);
    }
    return c.svg(5);
  }
  function lampiao() {
    const c = new Camada();
    c.linha(60, 900, 60, 140, 2).linha(50, 900, 50, 150, 1).linha(20, 900, 100, 900, 1);
    c.linha(60, 160, 110, 120, 1).poli([[28, 60], [92, 60], [84, 150], [36, 150]], true, 1.5).poli([[20, 60], [60, 22], [100, 60]], true, 1.5);
    c.extra += `<g class="j-vela"><path d="M38 66 H82 L76 144 H44Z" fill="${LUZ}" fill-opacity=".9"/></g>`;
    return c.svg(5);
  }

  function vegetacao() {
    semente = 77;
    // duas árvores secas, uma de cada lado do caminho
    cartaz(caminhoX(-3900) - 1500, -3900, 1500, 2200, arvore(1500, 2200, false));
    cartaz(caminhoX(-3000) + 1450, -3000, 1500, 2100, arvore(1500, 2100, false));
    // lampiões
    cartaz(caminhoX(-3800) + 330, -3800, 120, 900, lampiao());
    cartaz(caminhoX(-2500) - 330, -2500, 120, 900, lampiao());
    // mata escura atrás da casa (esconde o fim do chão)
    for (let k = 0; k < 4; k++) {
      cartaz(-1900 - k * 700, -900 - k * 30, 1100, 1700, arvore(1100, 1700, false));
      cartaz(3350 + k * 700, -900 - k * 30, 1100, 1700, arvore(1100, 1700, false));
    }
  }

  /* =========================================================
     CÉU: lua, estrelas e o OVNI (com abdução de vaca)
     ========================================================= */
  function ceu() {
    const lu = new Camada();
    lu.extra = `<circle cx="1300" cy="1300" r="1100" fill="${LUZ}"/>`;
    const lua = new Camada();
    lua.poli(arcoPts(1300, 1300, 1100, 1100, 0, Math.PI * 2, 30), true, 8);
    [[900, 900, 180], [1600, 1000, 120], [1200, 1700, 220], [1750, 1600, 90], [700, 1500, 110]].forEach(function (k) {
      lua.poli(arcoPts(k[0], k[1], k[2], k[2] * 0.85, 0, Math.PI * 2, 12), true, 10);
    });
    for (let k = 0; k < 40; k++) { const x = r(500, 2100), y = r(500, 2100); if (Math.hypot(x - 1300, y - 1300) < 1000) lua.hach(x, y, x + r(30, 90), y + r(-20, 20), 6); }
    const svgLua = lu.extra + lua.svg(26).replace(new RegExp(TINTA, 'g'), BREU);
    const elLua = K.criar('div', 'j-cartaz', `left:${6200 - 840}px;top:${-3900 - 840}px;width:2600px;height:2600px;transform:translateZ(-6000px) scale(.646);transform-origin:0 0`, P.longe, svgTxt(2600, 2600, svgLua));
    el.lua = elLua;

    // estrelas
    for (let k = 0; k < 6; k++) {
      let p = '';
      for (let s = 0; s < 40; s++) p += `<circle cx="${q(r(0, 4000))}" cy="${q(r(0, 2200))}" r="${q(r(5, 13))}"/>`;
      K.criar('div', 'j-cartaz', `left:${-7000 + (k % 3) * 5000}px;top:${-6500 + Math.floor(k / 3) * 2400}px;width:4000px;height:2200px;transform:translateZ(-6500px)`, P.longe,
        svgTxt(4000, 2200, `<g fill="${TINTA}" fill-opacity=".5">${p}</g>`));
    }

    // OVNI
    const o = new Camada(), w = 760, h = 300;
    const disco = arcoPts(380, 170, 370, 70, 0, Math.PI * 2, 24);
    o.encher(disco).poli(disco, true, 2);
    const cup = arcoPts(380, 150, 170, 120, Math.PI, Math.PI * 2, 12);
    o.encher(cup.concat([[550, 150]])).poli(cup, false, 2);
    o.linha(30, 170, 730, 170, 1.5);
    for (let x = 60; x < 700; x += 26) o.hach(x, 182, x + 8, 228, 1);
    o.extra += `<g class="j-luzes">` + [110, 230, 380, 530, 650].map((x) => `<circle cx="${x}" cy="200" r="11" fill="${LUZ}"/>`).join('') + '</g>';
    el.ovni = cartaz(2650, -1700, w, h, o.svg(5), { base: -1300, anima: 'j-paira' });
    // feixe + vaca subindo
    const feixe = K.criar('div', 'j-feixe', `left:${2650 - 520}px;top:-1360px;width:1040px;height:2260px;transform:translateZ(1700px)`, P.longe);
    const vc = new Camada();
    const corpo = [[30, 80], [60, 40], [240, 40], [270, 70], [300, 50], [330, 70], [320, 110], [280, 110], [260, 150], [250, 210], [230, 210], [225, 160], [90, 160], [85, 210], [65, 210], [55, 150], [30, 120]];
    vc.encher(corpo).poli(corpo, true, 2);
    vc.poli(arcoPts(120, 90, 34, 26, 0, Math.PI * 2, 10), true, 1, 'fina').poli(arcoPts(200, 120, 26, 20, 0, Math.PI * 2, 10), true, 1, 'fina');
    vc.linha(30, 80, 4, 110, 1);
    K.criar('div', 'j-vaca', 'left:350px;top:2020px;width:340px;height:220px', feixe, svgTxt(340, 220, vc.svg(5)));
  }

  /* =========================================================
     CHAPEUZINHO E O LOBO (andam pelo caminho e entram na casa)
     ========================================================= */
  function personagens() {
    const ch = new Camada();
    // de costas: capa vermelha, cesta no braço
    ch.f = '';
    ch.extra = `<path d="M70 20 C40 20 30 60 32 90 L12 280 L128 280 L108 90 C110 60 100 20 70 20Z" fill="${CAPUZ}"/>`;
    ch.poli([[70, 20], [42, 40], [32, 90], [12, 280], [128, 280], [108, 90], [98, 40]], true, 2);
    ch.hach(50, 120, 34, 270, 2).hach(70, 110, 70, 272, 2).hach(92, 120, 110, 270, 2);
    ch.linha(52, 280, 50, 330, 1).linha(88, 280, 90, 330, 1);
    ch.encher([[118, 170], [168, 176], [160, 216], [124, 214]]).poli([[118, 170], [168, 176], [160, 216], [124, 214]], true, 1).poli(arcoPts(142, 176, 22, 24, Math.PI, Math.PI * 2, 6), false, 1);
    el.chapeu = K.criar('div', 'j-ator', 'left:0;top:570px;width:180px;height:330px', P.longe, svgTxt(180, 330, `<g class="j-passo">${ch.svg(4)}</g>`));

    const lo = new Camada();
    const corpo = [[20, 170], [60, 110], [150, 90], [260, 100], [320, 70], [340, 20], [356, 64], [372, 30], [378, 80], [410, 104], [404, 130], [360, 140], [330, 170], [320, 220], [328, 300], [304, 300], [296, 220], [130, 200], [120, 300], [96, 300], [90, 200], [40, 210], [0, 250], [10, 200]];
    lo.encher(corpo).poli(corpo, true, 2);
    for (let k = 0; k < 14; k++) { const x = r(90, 300); lo.hach(x, r(110, 130), x - r(10, 30), r(150, 190), 2); }
    lo.extra += `<ellipse cx="382" cy="92" rx="8" ry="5" fill="#e8b450"/>`;
    el.lobo = K.criar('div', 'j-ator', 'left:0;top:600px;width:420px;height:300px', P.longe, svgTxt(420, 300, `<g class="j-passo">${lo.svg(5)}</g>`));
  }

  /* ---------- montar ---------- */
  function montar(kit) {
    K = kit;
    const cena = document.getElementById('cena'), mundo = document.getElementById('mundo');
    ['chao', 'folhas', 'longe', 'portao', 'perto'].forEach(function (nome) {
      const d = document.createElement('div');
      d.className = 'j-palco j-palco-' + nome;
      if (nome === 'chao') cena.insertBefore(d, mundo); else cena.appendChild(d);
      P[nome] = d;
    });
    el.mundo = mundo;
    chao();
    semente = 31; fachada();
    vegetacao();
    semente = 91; ceu();
    semente = 5; personagens();
    abrirPorta(false);
  }

  /* ---------- a porta abre sozinha quando você chega perto ---------- */
  function abrirPorta(abrir) {
    if (abrir === el.portaAberta) return;
    el.portaAberta = abrir;
    el.folhaE.classList.toggle('aberta', abrir);
    el.folhaD.classList.toggle('aberta', abrir);
    if (abrir && Bau.som && Bau.som.ligado) Bau.som.rangido();
  }

  /* ---------- a cada quadro ---------- */
  const CICLO = 46000;
  function atualizar(e, agora) {
    const fora = e.camZ < FACHADA - 30;
    if (fora !== el.fora) {
      el.fora = fora;
      Object.keys(P).forEach(function (k) { P[k].style.display = fora ? '' : 'none'; });
    }
    // o corredor só é desenhado quando você chega perto da porta (mais leve)
    const verCorredor = e.camZ > -2600;
    if (verCorredor !== el.verCorredor) { el.verCorredor = verCorredor; el.mundo.style.visibility = verCorredor ? '' : 'hidden'; el.brilho.style.display = verCorredor ? 'none' : ''; }
    abrirPorta(e.camZ > -2500);
    if (!fora) return;
    // o que ficou para trás da câmera some
    comProf.forEach(function (c) {
      const atras = c.prof < e.camZ + 80;
      if (atras !== c.atras) { c.atras = atras; c.el.style.display = atras ? 'none' : ''; }
    });
    // varanda some quando você passa por ela
    const passouVaranda = e.camZ > -1230;
    ['coluna0', 'coluna1', 'telhado'].forEach(function (k) { el[k].style.visibility = passouVaranda ? 'hidden' : ''; });

    // Chapeuzinho vai na frente, o lobo vem atrás
    [[el.chapeu, 0, 180], [el.lobo, 9000, 420]].forEach(function (a) {
      const t = ((agora + CICLO - a[1]) % CICLO) / CICLO; // 0..1
      const ida = Math.min(1, t / 0.62);
      const prof = -4300 + ida * (FACHADA - 60 + 4300);
      const x = caminhoX(prof) + (a[0] === el.lobo ? 60 : -40);
      const visivel = t < 0.62 && prof > e.camZ + 700;
      a[0].style.opacity = visivel ? (prof > -1250 ? lim((FACHADA - 60 - prof) / 190, 0, 1) : 1) : 0;
      a[0].style.transform = `translate3d(${q(x - a[2] / 2)}px,0,${q(-prof)}px)`;
    });
  }

  return {
    montar, atualizar, caminhoX, INICIO, FACHADA
  };
})();
