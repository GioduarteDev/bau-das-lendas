/* =========================================================
   PLANTA DA CASA (minimapa estilo blueprint)
   - cada ala pintada com a cor do seu país
   - cartas nas paredes (clique para ir até ela)
   - portas (acendem em vermelho quando abrem)
   - você + cone de visão que gira com o mouse
   ========================================================= */
window.Bau = window.Bau || {};

Bau.planta = (function () {
  const NS = 'http://www.w3.org/2000/svg';
  const X0 = 60, X1 = 120;                 // paredes do corredor no desenho
  const CORES = { saguao: 'rgba(166,158,144,.08)', brasil: 'rgba(47,110,96,.35)', japao: 'rgba(40,60,120,.5)',
    china: 'rgba(150,30,22,.45)', india: 'rgba(180,110,30,.4)', filipinas: 'rgba(40,120,100,.35)' };
  let svg, voce, cartas = [], portas = [], vistos = new Set();

  function y(prof) { const C = Bau.corredor; return 330 - (prof + 1000) / (C.D + 1000) * 300; }
  function el(tag, attrs, pai, texto) {
    const n = document.createElementNS(NS, tag);
    for (const a in attrs) n.setAttribute(a, attrs[a]);
    if (texto) n.textContent = texto;
    (pai || svg).appendChild(n);
    return n;
  }

  function montar() {
    svg = document.getElementById('planta-svg');
    svg.setAttribute('viewBox', '0 0 180 350');
    const C = Bau.corredor;

    // alas
    C.ZONAS.forEach(function (z) {
      el('rect', { x: X0, y: y(z.ate), width: X1 - X0, height: y(z.de) - y(z.ate), fill: CORES[z.id] });
      el('line', { x1: X0 - 4, x2: X1 + 4, y1: y(z.de), y2: y(z.de), stroke: '#5a5349', 'stroke-dasharray': '2 2' });
      el('text', { x: X0 - 8, y: (y(z.de) + y(z.ate)) / 2 + 3, 'text-anchor': 'end', 'font-size': z.id === 'saguao' ? 7 : 9, fill: '#a69e90' },
        null, z.id === 'saguao' ? 'SAGUÃO' : z.nativo);
    });
    // paredes
    el('path', { d: `M${X0} ${y(-1000)} V${y(C.D)} H${X1} V${y(-1000)}`, fill: 'none', stroke: '#d8d0bf', 'stroke-width': 1.6 });
    el('path', { d: `M${X0 - 6} ${y(-1000)} H${X0 + 14} M${X1 - 14} ${y(-1000)} H${X1 + 6}`, stroke: '#d8d0bf', 'stroke-width': 1.6 });
    el('text', { x: 90, y: y(-1000) + 14, 'text-anchor': 'middle', 'font-size': 7, fill: '#a69e90', 'letter-spacing': 1.5 }, null, 'ENTRADA');
    // grimório (sala do fundo)
    el('rect', { x: X0, y: y(C.D) - 18, width: X1 - X0, height: 18, fill: 'rgba(217,162,74,.08)', stroke: '#d8d0bf', 'stroke-width': 1.2 });
    el('text', { x: 90, y: y(C.D) - 6, 'text-anchor': 'middle', 'font-size': 6.5, fill: '#d9a24a', 'letter-spacing': 1 }, null, 'GRIMÓRIO');
    // sala do baú (RA)
    el('rect', { x: X1, y: y(4420), width: 34, height: y(4200) - y(4420), fill: 'rgba(217,162,74,.12)', stroke: '#d8d0bf', 'stroke-width': 1.2 });
    el('text', { x: X1 + 17, y: (y(4420) + y(4200)) / 2 + 3, 'text-anchor': 'middle', 'font-size': 7, fill: '#d9a24a' }, null, 'RA');

    // portas
    Bau.decor.PORTAS.forEach(function (p) {
      const xp = p.lado === 'E' ? X0 - 2 : X1 - 1;
      const r = el('rect', { x: xp, y: y(p.prof) - 5, width: 3, height: 10, fill: '#8a6a3a' });
      portas.push({ id: p.id, r });
    });

    // cartas
    Bau.lendas.forEach(function (l, i) {
      const g = el('g', { class: 'carta-ponto', role: 'button', tabindex: 0, 'aria-label': 'Ir para ' + l.nome });
      el('title', {}, g, l.nome);
      const xp = (i % 2 === 0) ? X0 + 3 : X1 - 8;
      const prof = C.PRIMEIRO + i * C.PASSO;
      const r = el('rect', { x: xp, y: y(prof) - 7, width: 5, height: 14, fill: '#4a453c' }, g);
      g.addEventListener('click', () => C.irPara(i));
      g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') C.irPara(i); });
      cartas.push(r);
    });

    // você + cone de visão
    voce = el('g', {});
    el('path', { d: 'M0 0 L-18 -44 A48 48 0 0 1 18 -44 Z', fill: 'rgba(217,162,74,.18)', stroke: 'rgba(217,162,74,.55)', 'stroke-width': 1 }, voce);
    el('circle', { r: 4.5, fill: '#d9a24a', stroke: '#0b0a09', 'stroke-width': 1.5 }, voce);

    requestAnimationFrame(atualizar);
  }

  function marcarVisto(i) { vistos.add(i); }

  function atualizar() {
    const C = Bau.corredor, e = C.estado;
    voce.setAttribute('transform', `translate(90 ${y(e.camZ).toFixed(1)}) rotate(${(e.yaw + e.giro).toFixed(1)})`);
    cartas.forEach(function (r, i) {
      r.setAttribute('fill', i === e.i && e.dentro ? '#d9a24a' : vistos.has(i) ? '#a69e90' : '#4a453c');
    });
    const abertas = Bau.decor.portas;
    let n = 0;
    portas.forEach(function (p) {
      const obj = abertas.find(o => o.cfg.id === p.id);
      const aberta = obj && obj.aberta;
      if (aberta) n++;
      p.r.setAttribute('fill', aberta ? '#e0452a' : '#8a6a3a');
    });
    const z = C.zonaEm(e.camZ + 650); // a ala da carta que você está vendo
    const ala = document.getElementById('planta-ala');
    if (ala.textContent !== z.nome) ala.textContent = z.nome;
    document.getElementById('planta-vistos').textContent = `CARTAS ${vistos.size}/${Bau.lendas.length}`;
    document.getElementById('planta-portas').textContent = n ? '● PORTA ABERTA' : 'PORTAS ' + portas.length;
    document.getElementById('planta-portas').style.color = n ? '#e0452a' : '';
    requestAnimationFrame(atualizar);
  }

  return { montar, marcarVisto };
})();
