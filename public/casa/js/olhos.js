/* =========================================================
   OLHOS — desenho em traço fino, estilo gravura antiga.
   Pálpebra pesada, rugas, cílios, íris com fibras radiais,
   pupila humana (mais perturbador que fenda), brilho contido.
   A pupila segue o mouse (variáveis --px e --py no <html>).
   Bau.olho({ larg, cor, rot })   cor: ambar | morto | sangue | musgo
   ========================================================= */
window.Bau = window.Bau || {};

Bau.olho = (function () {
  function rnd(a, b) { return a + Math.random() * (b - a); }

  return function (o) {
    const opc = o || {};
    const larg = opc.larg || 70;
    const cor = opc.cor || 'ambar';
    const rot = opc.rot || 0;
    const atraso = rnd(0, 6).toFixed(2);

    // fibras da íris
    let fibras = '';
    for (let i = 0; i < 44; i++) {
      const a = i / 44 * Math.PI * 2 + rnd(-0.04, 0.04);
      const r0 = rnd(4.6, 6), r1 = rnd(10.5, 12.8);
      fibras += `M${(Math.cos(a) * r0).toFixed(2)} ${(Math.sin(a) * r0).toFixed(2)}L${(Math.cos(a) * r1).toFixed(2)} ${(Math.sin(a) * r1).toFixed(2)}`;
    }
    // cílios superiores (finos, irregulares)
    let cilios = '';
    for (let i = 0; i < 16; i++) {
      const t = i / 15, x = -38 + t * 76;
      const y = -Math.sin(t * Math.PI) * 15.5 - 0.5;
      const ang = -Math.PI / 2 + (t - 0.5) * 1.5 + rnd(-0.12, 0.12);
      const comp = rnd(4, 8) * (0.55 + Math.sin(t * Math.PI) * 0.6);
      cilios += `M${x.toFixed(1)} ${y.toFixed(1)}q${(Math.cos(ang) * comp * 0.5 + 1).toFixed(1)} ${(Math.sin(ang) * comp * 0.6).toFixed(1)} ${(Math.cos(ang) * comp).toFixed(1)} ${(Math.sin(ang) * comp).toFixed(1)}`;
    }
    // vasinhos (bem finos)
    let vasos = '';
    for (let i = 0; i < 9; i++) {
      const lado = i % 2 ? 1 : -1, y0 = rnd(-4, 7);
      vasos += `M${(lado * 40).toFixed(1)} ${y0.toFixed(1)}q${(-lado * rnd(6, 10)).toFixed(1)} ${rnd(-4, 4).toFixed(1)} ${(-lado * rnd(14, 20)).toFixed(1)} ${rnd(-3, 3).toFixed(1)}`;
    }
    // rugas em volta
    // rugas irregulares (nada de arcos perfeitos)
    const rugas = `M${rnd(-50, -44).toFixed(1)} ${rnd(-12, -8).toFixed(1)} C-30 ${rnd(-30, -26).toFixed(1)} ${rnd(8, 16).toFixed(1)} ${rnd(-31, -27).toFixed(1)} ${rnd(38, 46).toFixed(1)} ${rnd(-14, -9).toFixed(1)}` +
      ` M${rnd(-30, -22).toFixed(1)} ${rnd(17, 20).toFixed(1)} C-12 ${rnd(23, 26).toFixed(1)} 6 ${rnd(23, 26).toFixed(1)} ${rnd(18, 26).toFixed(1)} ${rnd(17, 20).toFixed(1)}` +
      ` M${rnd(-14, -6).toFixed(1)} ${rnd(22, 24).toFixed(1)} q8 ${rnd(4, 6).toFixed(1)} ${rnd(14, 20).toFixed(1)} ${rnd(1, 3).toFixed(1)}`;

    return `<svg class="olho olho-${cor}" viewBox="-62 -42 124 84" width="${larg}" height="${(larg * 0.68).toFixed(0)}" style="transform:rotate(${rot}deg)" aria-hidden="true">
      <ellipse rx="60" ry="38" fill="url(#g-orbita)"/>
      <path d="${rugas}" fill="none" stroke="#c8b48a" stroke-opacity=".22" stroke-width=".7"/>
      <g class="palpebra" style="animation-delay:${atraso}s">
        <path d="M-42 2 C-28 -15 24 -17 42 0 C26 15 -26 16 -42 2Z" fill="url(#g-esclera)"/>
        <path d="${vasos}" fill="none" stroke="#8a2416" stroke-opacity=".5" stroke-width=".45"/>
        <g clip-path="url(#clip-olho)">
          <g class="pupila-segue">
            <circle cy="-2" r="13" fill="url(#g-iris-${cor})"/>
            <path d="${fibras}" transform="translate(0 -2)" stroke="#1a0c04" stroke-opacity=".45" stroke-width=".35"/>
            <circle cy="-2" r="12.8" fill="none" stroke="#0a0503" stroke-width="1.6"/>
            <circle cy="-2" r="4.6" fill="#030202"/>
            <circle cx="-3.6" cy="-6.4" r="1.5" fill="#fff" fill-opacity=".85"/>
          </g>
          <path d="M-42 2 C-28 -15 24 -17 42 0 L42 -30 L-42 -30Z" fill="url(#g-sombra-palpebra)"/>
        </g>
        <path d="M-42 2 C-28 -15 24 -17 42 0" fill="none" stroke="#0a0504" stroke-width="2.2"/>
        <path d="M-44 -3 C-28 -22 24 -24 44 -5" fill="none" stroke="#0a0504" stroke-opacity=".55" stroke-width="1"/>
        <path d="M-42 2 C-26 16 26 15 42 0" fill="none" stroke="#7a2418" stroke-opacity=".8" stroke-width="1.1"/>
        <path d="${cilios}" fill="none" stroke="#0a0504" stroke-width=".55" stroke-linecap="round"/>
      </g>
    </svg>`;
  };
})();
