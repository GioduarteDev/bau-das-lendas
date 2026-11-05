/* =========================================================
   TEXTURAS PROCEDURAIS
   Desenhadas uma vez em <canvas> quando a página carrega.
   Nada de imagem externa: o chão de madeira gasta, o lambri
   e o papel de parede saem daqui.
   ========================================================= */
window.Bau = window.Bau || {};

Bau.texturas = (function () {
  // gerador aleatório com semente (a textura sai sempre igual)
  function rng(semente) {
    let s = semente >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function criarCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }

  // granulação geral (poeira, desgaste fino)
  function ruido(ctx, w, h, forca, r) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * forca;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  /* ---------- CHÃO: tábuas corridas, gastas ----------
     As tábuas correm no sentido do corredor (eixo y).
     A textura repete em y sem emenda visível. */
  function chao() {
    const W = 1440, H = 2048, TAB = 120;
    const [c, ctx] = criarCanvas(W, H);
    const r = rng(1313);

    // retângulo que "dá a volta" no fim da textura (repetição sem emenda)
    function retEnvolto(x, y, w, h) {
      ctx.fillRect(x, y, w, h);
      if (y + h > H) ctx.fillRect(x, y - H, w, h);
      if (y < 0) ctx.fillRect(x, y + H, w, h);
    }

    for (let x = 0; x < W; x += TAB) {
      let y = r() * H;
      let restante = H;
      while (restante > 0) {
        const comp = Math.min(restante, 420 + r() * 900);
        const hue = 24 + r() * 8, sat = 28 + r() * 14, lum = 22 + r() * 9;
        ctx.fillStyle = `hsl(${hue} ${sat}% ${lum}%)`;
        retEnvolto(x, y, TAB, comp);

        // veios da madeira
        for (let g = 0; g < 26; g++) {
          const gx = x + 4 + r() * (TAB - 8);
          const amp = 1 + r() * 4, freq = (1 + Math.floor(r() * 3)) * 2 * Math.PI / H;
          const fase = r() * 6.28;
          ctx.strokeStyle = r() < 0.5 ? `rgba(0,0,0,${0.08 + r() * 0.16})` : `rgba(255,220,170,${0.02 + r() * 0.04})`;
          ctx.lineWidth = 0.6 + r() * 1.4;
          ctx.beginPath();
          for (let yy = 0; yy <= comp; yy += 16) {
            const py = (y + yy) % H;
            const px = gx + Math.sin((y + yy) * freq + fase) * amp;
            if (yy === 0 || py < 16) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // nós da madeira
        if (r() < 0.35) {
          const kx = x + 20 + r() * (TAB - 40), ky = (y + r() * comp) % H;
          for (let k = 0; k < 5; k++) {
            ctx.strokeStyle = `rgba(0,0,0,${0.35 - k * 0.05})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.ellipse(kx, ky, 4 + k * 4, 9 + k * 9, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(10,6,3,.7)';
          ctx.beginPath(); ctx.ellipse(kx, ky, 4, 8, 0, 0, Math.PI * 2); ctx.fill();
        }

        // emenda entre tábuas + pregos
        ctx.fillStyle = '#060403';
        retEnvolto(x, (y + comp) % H - 1, TAB, 3);
        ctx.fillStyle = 'rgba(0,0,0,.8)';
        const py = (y + comp - 12 + H) % H;
        ctx.beginPath(); ctx.arc(x + 18, py, 2.4, 0, 7); ctx.arc(x + TAB - 18, py, 2.4, 0, 7); ctx.fill();

        y = (y + comp) % H;
        restante -= comp;
      }
      // fresta entre tábuas
      ctx.fillStyle = '#050302';
      ctx.fillRect(x, 0, 2, H);
      ctx.fillStyle = 'rgba(255,220,170,.05)';
      ctx.fillRect(x + 2, 0, 1, H);
    }

    // caminho gasto no meio (onde todo mundo pisa): mais claro e sem verniz
    const gasto = ctx.createLinearGradient(0, 0, W, 0);
    gasto.addColorStop(0, 'rgba(160,130,95,0)');
    gasto.addColorStop(0.33, 'rgba(160,130,95,0)');
    gasto.addColorStop(0.5, 'rgba(160,130,95,.13)');
    gasto.addColorStop(0.67, 'rgba(160,130,95,0)');
    gasto.addColorStop(1, 'rgba(160,130,95,0)');
    ctx.fillStyle = gasto;
    ctx.fillRect(0, 0, W, H);

    // arranhões
    for (let i = 0; i < 900; i++) {
      const centro = r() < 0.7;
      const sx = centro ? 480 + r() * 480 : r() * W;
      const sy = r() * H, len = 10 + r() * 110, ang = Math.PI / 2 + (r() - 0.5) * 0.9;
      ctx.strokeStyle = `rgba(220,190,150,${0.04 + r() * 0.1})`;
      ctx.lineWidth = 0.5 + r();
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len); ctx.stroke();
    }

    // manchas (água, vinho, sabe-se lá)
    for (let i = 0; i < 16; i++) {
      const mx = r() * W, my = r() * H, raio = 30 + r() * 120;
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, raio);
      g.addColorStop(0, `rgba(0,0,0,${0.18 + r() * 0.25})`);
      g.addColorStop(0.7, `rgba(0,0,0,${0.06 + r() * 0.1})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(mx, my, raio, raio * (0.5 + r()), r() * 3, 0, 7); ctx.fill();
    }

    // sujeira acumulada perto das paredes
    const bordas = ctx.createLinearGradient(0, 0, W, 0);
    bordas.addColorStop(0, 'rgba(0,0,0,.45)');
    bordas.addColorStop(0.14, 'rgba(0,0,0,0)');
    bordas.addColorStop(0.86, 'rgba(0,0,0,0)');
    bordas.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = bordas;
    ctx.fillRect(0, 0, W, H);

    ruido(ctx, W, H, 22, r);
    return c.toDataURL('image/jpeg', 0.82);
  }

  /* ---------- LAMBRI (meia parede de madeira) ---------- */
  function lambri() {
    const W = 960, H = 290;
    const [c, ctx] = criarCanvas(W, H);
    const r = rng(77);
    ctx.fillStyle = '#2a1f15';
    ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 240) {
      // moldura do painel
      ctx.fillStyle = '#22180f';
      ctx.fillRect(x, 0, 240, H);
      const lum = 19 + r() * 6;
      ctx.fillStyle = `hsl(24 30% ${lum}%)`;
      ctx.fillRect(x + 26, 34, 188, H - 70);
      // chanfro
      ctx.strokeStyle = 'rgba(255,210,160,.08)'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 26, 34, 188, H - 70);
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 22, 30, 196, H - 62);
      for (let g = 0; g < 30; g++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.08 + r() * 0.15})`;
        ctx.lineWidth = 0.6 + r();
        const gy = 40 + r() * (H - 80);
        ctx.beginPath(); ctx.moveTo(x + 28, gy);
        ctx.bezierCurveTo(x + 90, gy + (r() - .5) * 8, x + 150, gy + (r() - .5) * 8, x + 212, gy);
        ctx.stroke();
      }
    }
    // desgaste por baixo (chutes, umidade)
    const g = ctx.createLinearGradient(0, H - 70, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, H - 70, W, 70);
    ruido(ctx, W, H, 18, r);
    return c.toDataURL('image/jpeg', 0.85);
  }

  /* ---------- PAPEL DE PAREDE: damasco verde, manchado ---------- */
  function papelParede() {
    const W = 960, H = 900;
    const [c, ctx] = criarCanvas(W, H);
    const r = rng(404);
    ctx.fillStyle = '#26302a';
    ctx.fillRect(0, 0, W, H);

    // motivo de damasco
    function motivo(cx, cy) {
      ctx.save(); ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(110,135,112,.2)';
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.bezierCurveTo(22, -30, 30, -8, 0, 10);
      ctx.bezierCurveTo(-30, -8, -22, -30, 0, -48);
      ctx.moveTo(0, 10);
      ctx.bezierCurveTo(30, 18, 36, 44, 10, 52);
      ctx.bezierCurveTo(4, 40, -4, 40, -10, 52);
      ctx.bezierCurveTo(-36, 44, -30, 18, 0, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,100,82,.14)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -4, 22, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.restore();
    }
    for (let y = 60; y < H; y += 140) {
      for (let x = 60; x < W + 60; x += 120) {
        motivo(x + ((y / 140) % 2 ? 60 : 0), y);
      }
    }
    // listras finas
    for (let x = 0; x < W; x += 60) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, 0, 2, H); }

    // escorridos de umidade a partir do teto
    for (let i = 0; i < 9; i++) {
      const x = r() * W, comp = 120 + r() * 420, larg = 20 + r() * 70;
      const g = ctx.createLinearGradient(0, 100, 0, 100 + comp);
      g.addColorStop(0, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - larg, 100);
      ctx.bezierCurveTo(x - larg * 0.6, 100 + comp * 0.5, x - 4, 100 + comp, x, 100 + comp);
      ctx.bezierCurveTo(x + 4, 100 + comp, x + larg * 0.6, 100 + comp * 0.5, x + larg, 100);
      ctx.fill();
    }
    // papel descascando (manchas claras com borda escura)
    for (let i = 0; i < 4; i++) {
      const x = r() * W, y = 300 + r() * 280, rx = 18 + r() * 40, ry = 12 + r() * 30;
      ctx.fillStyle = 'rgba(70,64,52,.35)';
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, r() * 3, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ruido(ctx, W, H, 16, r);
    return c.toDataURL('image/jpeg', 0.85);
  }

  /* ---------- ESTAMPAS POR PAÍS (papel amarelado de casa assombrada) ----------
     Base: papel amarelo encardido. Por cima, o desenho de cada país.
     Depois: fuligem, umidade, mofo, garras, sangue seco e rasgos
     mostrando as ripas de madeira por baixo. */
  function papelAmarelo(ctx, W, H, r) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6e5f30'); g.addColorStop(0.35, '#8c7b42'); g.addColorStop(0.7, '#7d6c38'); g.addColorStop(1, '#4a3f20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 50; i++) { // manchas grandes de tom (papel velho nunca é uniforme)
      const x = r() * W, y = r() * H, raio = 40 + r() * 160;
      const m = ctx.createRadialGradient(x, y, 0, x, y, raio);
      const claro = r() < 0.5;
      m.addColorStop(0, claro ? 'rgba(170,150,80,.22)' : 'rgba(50,38,12,.25)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = m; ctx.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }
  }

  function envelhecerMedonho(ctx, W, H, r) {
    // fuligem perto do teto
    const f = ctx.createLinearGradient(0, 0, 0, 260);
    f.addColorStop(0, 'rgba(18,12,4,.85)'); f.addColorStop(1, 'rgba(18,12,4,0)');
    ctx.fillStyle = f; ctx.fillRect(0, 0, W, 260);
    // manchas de infiltração com "linha de maré"
    for (let i = 0; i < 4; i++) {
      const cx = r() * W, cy = 160 + r() * 380, rx = 40 + r() * 90, ry = 50 + r() * 120;
      for (let anel = 0; anel < 3; anel++) {
        ctx.beginPath();
        for (let a = 0; a <= 20; a++) {
          const ang = a / 20 * Math.PI * 2, j = 0.8 + r() * 0.35;
          const px = cx + Math.cos(ang) * rx * j * (1 - anel * 0.25), py = cy + Math.sin(ang) * ry * j * (1 - anel * 0.25);
          a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(70,50,18,${0.12 + anel * 0.06})`; ctx.fill();
        ctx.strokeStyle = 'rgba(50,32,10,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
      }
    }
    // escorridos marrons a partir do teto
    for (let i = 0; i < 9; i++) {
      const x = r() * W, comp = 120 + r() * 420, larg = 6 + r() * 30;
      const g = ctx.createLinearGradient(0, 110, 0, 110 + comp);
      g.addColorStop(0, 'rgba(40,26,8,.7)'); g.addColorStop(1, 'rgba(40,26,8,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - larg, 110);
      ctx.bezierCurveTo(x - larg * 0.4, 110 + comp * 0.6, x - 2, 110 + comp, x, 110 + comp);
      ctx.bezierCurveTo(x + 2, 110 + comp, x + larg * 0.4, 110 + comp * 0.6, x + larg, 110);
      ctx.fill();
    }
    // mofo
    for (let i = 0; i < 4; i++) {
      const cx = r() * W, cy = 150 + r() * 450;
      for (let k = 0; k < 140; k++) {
        const d = Math.pow(r(), 2) * 60, a = r() * 7;
        ctx.fillStyle = `rgba(${18 + r() * 14},${24 + r() * 14},${10},${0.3 + r() * 0.5})`;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 0.5 + r() * 2.6, 0, 7); ctx.fill();
      }
    }
    // marcas de garra
    for (let i = 0; i < 2; i++) {
      const x = 40 + r() * (W - 120), y = 220 + r() * 260, ang = 0.2 + r() * 0.5;
      for (let k = 0; k < 4; k++) {
        ctx.strokeStyle = 'rgba(25,15,5,.75)'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(x + k * 14, y); ctx.lineTo(x + k * 14 + Math.sin(ang) * 120, y + Math.cos(ang) * 150); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,180,120,.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + k * 14 + 2, y); ctx.lineTo(x + k * 14 + 2 + Math.sin(ang) * 120, y + Math.cos(ang) * 150); ctx.stroke();
      }
    }
    // sangue seco (borrão arrastado)
    if (r() < 0.8) {
      const x = r() * W, y = 250 + r() * 200;
      const g = ctx.createLinearGradient(x, y, x + 40, y + 260);
      g.addColorStop(0, 'rgba(90,14,8,.65)'); g.addColorStop(1, 'rgba(90,14,8,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y - 4); ctx.lineTo(x + 70, y + 270); ctx.lineTo(x + 20, y + 280); ctx.closePath(); ctx.fill();
    }
    // papel rasgado: aparecem as ripas de madeira por baixo
    for (let i = 0; i < (r() < 0.6 ? 1 : 0); i++) {
      const cx = 40 + r() * (W - 80), cy = 300 + r() * 260;
      const pts = [];
      for (let a = 0; a < 11; a++) { const ang = a / 11 * Math.PI * 2; pts.push([cx + Math.cos(ang) * (14 + r() * 24), cy + Math.sin(ang) * (12 + r() * 30)]); }
      ctx.save();
      ctx.beginPath(); pts.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#0d0905'; ctx.fillRect(cx - 80, cy - 80, 160, 160);
      for (let yy = cy - 80; yy < cy + 80; yy += 15) {
        ctx.fillStyle = `hsl(26 32% ${16 + r() * 8}%)`; ctx.fillRect(cx - 80, yy, 160, 11);
      }
      ctx.restore();
      ctx.beginPath(); pts.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.strokeStyle = 'rgba(150,130,80,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ruido(ctx, W, H, 22, r);
  }

  function estampa(tipo) {
    const W = 480, H = 900;
    const [c, ctx] = criarCanvas(W, H);
    const r = rng(tipo.length * 97 + 7);
    papelAmarelo(ctx, W, H, r);
    const UMBRA = 'rgba(55,38,14,.55)';

    if (tipo === 'saguao') {
      // damasco europeu
      for (let y = 60, row = 0; y < H; y += 140, row++) {
        for (let x = 60 + (row % 2) * 60; x < W + 60; x += 120) {
          ctx.save(); ctx.translate(x, y); ctx.fillStyle = UMBRA;
          ctx.beginPath();
          ctx.moveTo(0, -48); ctx.bezierCurveTo(22, -30, 30, -8, 0, 10); ctx.bezierCurveTo(-30, -8, -22, -30, 0, -48);
          ctx.moveTo(0, 10); ctx.bezierCurveTo(30, 18, 36, 44, 10, 52); ctx.bezierCurveTo(4, 40, -4, 40, -10, 52); ctx.bezierCurveTo(-36, 44, -30, 18, 0, 10);
          ctx.fill();
          ctx.strokeStyle = UMBRA; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -4, 22, 0.2, Math.PI - 0.2); ctx.stroke();
          ctx.restore();
        }
      }
      for (let x = 0; x < W; x += 60) { ctx.fillStyle = 'rgba(40,28,10,.25)'; ctx.fillRect(x, 0, 2, H); }
    }

    if (tipo === 'brasil') {
      // azulejo colonial, amarelado e encardido
      const T = 80;
      for (let y = 0; y < H; y += T) {
        for (let x = 0; x < W; x += T) {
          if (r() < 0.07) { ctx.fillStyle = '#3a2e1c'; ctx.fillRect(x + 1, y + 1, T - 2, T - 2); continue; }
          ctx.fillStyle = `rgba(190,170,110,${0.12 + r() * 0.1})`; ctx.fillRect(x + 1, y + 1, T - 2, T - 2);
          ctx.strokeStyle = 'rgba(28,50,62,.6)'; ctx.fillStyle = 'rgba(28,50,62,.6)'; ctx.lineWidth = 3;
          const cx = x + T / 2, cy = y + T / 2;
          for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11, 9, 0, 7); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 6, cy); ctx.fill();
          [[x, y, 0], [x + T, y, Math.PI / 2], [x + T, y + T, Math.PI], [x, y + T, Math.PI * 1.5]].forEach(function (q) {
            ctx.beginPath(); ctx.arc(q[0], q[1], 22, q[2], q[2] + Math.PI / 2); ctx.stroke();
          });
          ctx.strokeStyle = 'rgba(30,20,8,.55)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, T, T);
          if (r() < 0.14) { ctx.strokeStyle = 'rgba(20,12,4,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + r() * T, y); ctx.lineTo(x + r() * T, y + T * 0.5); ctx.lineTo(x + r() * T, y + T); ctx.stroke(); }
        }
      }
    }

    if (tipo === 'japao') {
      // seigaiha (ondas) impressa em sépia
      const R = 30;
      for (let row = 0, y = -R; y < H + R; y += R / 2, row++) {
        for (let x = (row % 2) * R; x < W + R * 2; x += R * 2) {
          for (let k = 0; k < 4; k++) {
            ctx.beginPath(); ctx.arc(x, y, R - k * 7, Math.PI, 0);
            ctx.fillStyle = k % 2 ? 'rgba(120,100,50,.35)' : 'rgba(140,120,60,.3)'; ctx.fill();
            ctx.strokeStyle = UMBRA; ctx.lineWidth = 1.6; ctx.stroke();
          }
        }
      }
    }

    if (tipo === 'china') {
      // nuvens auspiciosas e greca em vermelho seco
      const VERM = 'rgba(105,26,16,.6)';
      function nuvem(cx, cy) {
        ctx.strokeStyle = VERM; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(cx, cy, 10, Math.PI * 0.2, Math.PI * 1.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 18, cy - 6, 8, Math.PI * 0.9, Math.PI * 2.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx - 16, cy - 4, 7, Math.PI * 1.6, Math.PI * 3.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 30, cy + 10); ctx.quadraticCurveTo(cx, cy + 18, cx + 34, cy + 8); ctx.stroke();
      }
      for (let y = 200, row = 0; y < 600; y += 90, row++) for (let x = (row % 2) * 60 + 30; x < W; x += 120) nuvem(x, y);
      function greca(y0) {
        ctx.strokeStyle = VERM; ctx.lineWidth = 3;
        for (let x = 0; x < W; x += 40) {
          ctx.beginPath(); ctx.moveTo(x, y0 + 30); ctx.lineTo(x, y0); ctx.lineTo(x + 30, y0); ctx.lineTo(x + 30, y0 + 22);
          ctx.lineTo(x + 10, y0 + 22); ctx.lineTo(x + 10, y0 + 10); ctx.lineTo(x + 20, y0 + 10); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(0, y0 - 8); ctx.lineTo(W, y0 - 8); ctx.moveTo(0, y0 + 38); ctx.lineTo(W, y0 + 38); ctx.stroke();
      }
      greca(140); greca(560);
    }

    if (tipo === 'india') {
      // buta (paisley) em ferrugem
      function buta(cx, cy, ang) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(115,50,18,.5)';
        ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-22, 20, -22, -10, 0, -14); ctx.bezierCurveTo(14, -16, 18, -30, 10, -36); ctx.bezierCurveTo(30, -26, 24, 22, 0, 22); ctx.fill();
        ctx.strokeStyle = UMBRA; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = UMBRA; ctx.beginPath(); ctx.arc(-2, 6, 5, 0, 7); ctx.fill();
        ctx.restore();
      }
      for (let y = 160, row = 0; y < 640; y += 70, row++) for (let x = (row % 2) * 40 + 20; x < W; x += 80) buta(x, y, row % 2 ? 0.4 : -0.4);
    }

    if (tipo === 'filipinas') {
      // banig (esteira trançada) desbotado
      const S = 16;
      const cores = ['rgba(90,70,30,.35)', 'rgba(60,45,18,.35)', 'rgba(40,70,60,.35)', 'rgba(100,40,25,.35)'];
      for (let y = 0; y < H; y += S) {
        for (let x = 0; x < W; x += S) {
          ctx.fillStyle = cores[Math.floor((x + y) / (S * 6)) % cores.length]; ctx.fillRect(x, y, S, S);
          ctx.strokeStyle = 'rgba(30,20,8,.4)'; ctx.lineWidth = 1; ctx.beginPath();
          if (((x + y) / S) % 2) { for (let k = 3; k < S; k += 4) { ctx.moveTo(x + k, y); ctx.lineTo(x + k, y + S); } }
          else { for (let k = 3; k < S; k += 4) { ctx.moveTo(x, y + k); ctx.lineTo(x + S, y + k); } }
          ctx.stroke();
        }
      }
    }

    envelhecerMedonho(ctx, W, H, r);
    return c.toDataURL('image/jpeg', 0.84);
  }

  return { chao, lambri, papelParede, estampa };
})();
