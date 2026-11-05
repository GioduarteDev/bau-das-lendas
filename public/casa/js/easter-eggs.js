/* =========================================================
   EASTER EGGS
   Para testar sem esperar (ótimo pra apresentação):
     ?lua=cheia   → força a noite de lua cheia
     ?hora=3      → força a hora morta (3h)
   ========================================================= */
window.Bau = window.Bau || {};

Bau.eggs = (function () {
  const camada = document.getElementById('camada-eggs');
  const params = new URLSearchParams(location.search);
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ultimoMovimento = performance.now();
  let hachiAtiva = null;

  function aviso(txt, ms) {
    const a = document.getElementById('aviso');
    a.textContent = txt;
    a.classList.add('ver');
    clearTimeout(aviso._t);
    aviso._t = setTimeout(() => a.classList.remove('ver'), ms || 3200);
  }

  /* ---------- 1. Chapeuzinho… e depois o lobo ---------- */
  function atravessar(simbolo, w, h, viewBox, atraso) {
    const C = Bau.corredor;
    const prof = Math.min(C.estado.camZ + 1500, C.D - 300);
    const caixa = C.adicionar('div', '', `left:0;top:${900 - h}px;width:1440px;height:${h}px;transform:translateZ(-${prof}px)`);
    const anda = C.adicionar('div', '', `left:0;bottom:0;animation:atravessar 9s linear ${atraso}s both`, caixa);
    anda.innerHTML = `<svg class="balanco" width="${w}" height="${h}" viewBox="${viewBox}"><use href="#${simbolo}"/></svg>`;
    setTimeout(() => caixa.remove(), (9 + atraso) * 1000 + 200);
  }
  function chapeuzinho() {
    if (!Bau.corredor.estado.dentro || reduzido || document.hidden) return;
    atravessar('svg-chapeuzinho', 80, 140, '0 0 30 52', 0);
    atravessar('svg-lobo', 210, 126, '0 0 100 60', 4.5);
  }

  /* ---------- 2. Lua cheia (fase real da lua) ---------- */
  function faseDaLua(data) {
    const LUA_NOVA_REF = Date.UTC(2000, 0, 6, 18, 14);
    const SINODICO = 29.530588853;
    const dias = (data - LUA_NOVA_REF) / 86400000;
    return ((dias / SINODICO) % 1 + 1) % 1; // 0 = nova, 0.5 = cheia
  }
  const luaCheia = params.get('lua') === 'cheia' || Math.abs(faseDaLua(Date.now()) - 0.5) < 0.034;
  let uivou = false;
  function garra() {
    // na lua cheia, rolar pelo corredor deixa marcas de unha nas paredes
    if (!luaCheia || reduzido || Math.random() < 0.5) return;
    Bau.aparicoes.riscos();
  }

  /* ---------- 3. Pegadas do Curupira (ala Brasil) ---------- */
  let ultX = null, ultY = null, acum = 0;
  function curupira(x, y) {
    const C = Bau.corredor.estado;
    if (!C.dentro || C.i !== 0 || reduzido) { ultX = null; return; }
    if (ultX === null) { ultX = x; ultY = y; return; }
    const dx = x - ultX, dy = y - ultY;
    acum += Math.hypot(dx, dy);
    if (acum < 70) return;
    acum = 0;
    // aponta para o lado CONTRÁRIO do movimento
    const ang = Math.atan2(dy, dx) * 180 / Math.PI - 90;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    p.setAttribute('class', 'pegada');
    p.setAttribute('viewBox', '0 0 40 70');
    p.innerHTML = '<g fill="#000"><ellipse cx="20" cy="40" rx="14" ry="26"/><circle cx="10" cy="8" r="4"/><circle cx="20" cy="5" r="4"/><circle cx="30" cy="8" r="4"/></g>';
    p.style.left = (x - 9) + 'px'; p.style.top = (y - 17) + 'px';
    p.style.transform = `rotate(${ang}deg)`;
    camada.appendChild(p);
    setTimeout(() => p.remove(), 2700);
    ultX = x; ultY = y;
  }

  /* ---------- 4. Hachishakusama (30 s parado) ---------- */
  function hachishakusama() {
    // sem monstro: só o som "po… po… po…" e pegadas ENORMES (ela tem 2,4 m) passando
    const C = Bau.corredor;
    if (!C.estado.dentro || hachiAtiva || document.hidden) return;
    if (performance.now() - ultimoMovimento < 30000) return;
    hachiAtiva = true;
    Bau.som.popopo();
    const k = C.kit, inicio = Math.min(C.estado.camZ + 1400, C.D - 300);
    for (let i = 0; i < 6; i++) {
      setTimeout(function () {
        k.criar('div', 'marca-plano surgindo', `left:${i % 2 ? 470 : 380}px;top:${k.noChao(inicio - i * 170, 190)}px;transform:rotate(180deg)`, k.chao,
          Bau.gore.pe({ esquerdo: i % 2 === 0, larg: 80, op: 0.75 }));
        if (i % 2) Bau.som.passoTeto();
      }, i * 700);
    }
    setTimeout(() => { hachiAtiva = null; }, 40000);
  }
  function espantarHachi() {}

  /* ---------- 5. Loira do Banheiro (digitar "loira" 3×) ---------- */
  let buffer = '', contagem = 0;
  function tecla(ev) {
    if (ev.key.length !== 1) return;
    buffer = (buffer + ev.key.toLowerCase()).slice(-5);
    if (buffer === 'loira') {
      contagem++;
      buffer = '';
      if (contagem === 1) aviso('…');
      if (contagem === 2) aviso('mais uma vez.');
      if (contagem >= 3) { contagem = 0; espelho(); }
    }
  }
  function espelho() {
    const r = document.createElement('div');
    r.className = 'rosto-espelho';
    r.innerHTML = '<svg viewBox="0 0 90 124" width="100%" height="100%"><ellipse cx="45" cy="60" rx="22" ry="30" fill="#c8bba2" fill-opacity=".55"/><path d="M23 50 C20 90 24 110 18 124 M67 50 C70 90 66 110 72 124" stroke="#d9c88a" stroke-width="5" fill="none"/><ellipse cx="37" cy="56" rx="3" ry="4" fill="#0b0a09"/><ellipse cx="53" cy="56" rx="3" ry="4" fill="#0b0a09"/><path d="M38 78 q7 3 14 0" stroke="#0b0a09" stroke-width="1.5" fill="none"/><path d="M40 66 v6 M50 66 v6" stroke="#fff" stroke-width="2"/></svg>';
    document.body.appendChild(r);
    Bau.som.sussurro();
    setTimeout(() => r.remove(), 1700);
  }

  /* ---------- 6. Saci (clique no gorro vermelho) ---------- */
  function saci(ev) {
    const w = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    w.setAttribute('class', 'redemoinho');
    w.setAttribute('viewBox', '0 0 70 70');
    w.innerHTML = '<path d="M35 35 m-6 0 a6 6 0 1 1 12 0 a12 12 0 1 1 -24 0 a18 18 0 1 1 36 0 a24 24 0 1 1 -48 0" stroke="#b8af9f" stroke-width="1.5" fill="none"/>';
    w.style.left = ev.clientX + 'px'; w.style.top = ev.clientY + 'px';
    camada.appendChild(w);
    setTimeout(() => w.remove(), 2100);
    Bau.som.vento();
    if (!reduzido) Bau.corredor.girar();
    setTimeout(() => aviso('O SACI PASSOU POR AQUI.'), 900);
  }

  /* ---------- 7. Hora morta (3h–3h59) ---------- */
  const horaMorta = params.get('hora') === '3' || new Date().getHours() === 3;

  /* ---------- 8. Kisaragi (rolar além da última lenda) ---------- */
  function kisaragi() {
    const C = Bau.corredor.estado;
    if (C.placaKisaragi) C.placaKisaragi.style.opacity = '1';
    Bau.som.trem();
    aviso('ESTA ESTAÇÃO NÃO CONSTA NO MAPA.', 4500);
  }

  /* ---------- extras ---------- */
  const tituloOriginal = document.title;
  document.addEventListener('visibilitychange', function () {
    document.title = document.hidden ? 'volta… a gente ainda tá aqui' : tituloOriginal;
  });

  function iniciar() {
    if (luaCheia) {
      document.body.classList.add('lua-cheia');
      document.getElementById('selo-lua').hidden = false;
    }
    if (horaMorta) document.body.classList.add('hora-morta');

    window.addEventListener('pointermove', function (ev) {
      ultimoMovimento = performance.now();
      espantarHachi();
      curupira(ev.clientX, ev.clientY);
    });
    window.addEventListener('wheel', function () { ultimoMovimento = performance.now(); espantarHachi(); }, { passive: true });
    window.addEventListener('keydown', tecla);
    window.addEventListener('pointerdown', function () {
      if (luaCheia && !uivou && Bau.som.ligado && Bau.corredor.estado.dentro) { uivou = true; setTimeout(Bau.som.uivo, 600); }
    });

    setInterval(chapeuzinho, 24000);
    setTimeout(chapeuzinho, 7000);
    setInterval(hachishakusama, 2000);

    console.log('%cBaú das Lendas', 'font: 28px Georgia; color: #d9a24a');
    console.log('%cVocê abriu o console. A casa percebeu.\nTente digitar \"loira\" três vezes fora daqui.', 'font: 12px monospace; color: #b8af9f');
  }

  return { iniciar, garra, saci, kisaragi, aviso, luaCheia };
})();
