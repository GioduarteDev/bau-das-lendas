/* =========================================================
   CARTAS COLECIONÁVEIS
   A arte é surpresa: no corredor a carta aparece LACRADA.
   Só o QR code do baú revela a arte (na RA / no Grimório).
   Cada ala tem uma padronagem tradicional na janela lacrada:
     Brasil → grafismo inspirado na cerâmica marajoara
     Japão  → asanoha (folha de cânhamo)
     China  → greca (huiwen)
     Índia  → jali (treliça)
     Filipinas → banig (trançado)
   ========================================================= */
window.Bau = window.Bau || {};

Bau.cartas = (function () {
  const NATIVO = { 'BRASIL': 'BRASIL', 'JAPÃO': '日本', 'CHINA': '中国', 'ÍNDIA': 'भारत', 'FILIPINAS': 'PILIPINAS' };

  function pais(l) {
    const p = l.local.split(',').pop().trim();
    return p === 'INTERIOR DO JAPÃO' ? 'JAPÃO' : p;
  }

  // padronagens tradicionais (desenhadas como <pattern> SVG)
  function padrao(l, uid) {
    const ala = l.ala;
    if (ala.includes('BRASIL')) {
      return `<pattern id="${uid}" width="28" height="28" patternUnits="userSpaceOnUse">
        <path d="M0 14 h7 v-7 h14 v14 h-7 v-7 M14 28 v-4 h-10 v-10 M28 14 h-3 v10 h-11" fill="none" stroke="currentColor" stroke-width="1.3"/></pattern>`;
    }
    if (ala.includes('JAPÃO')) {
      return `<pattern id="${uid}" width="30" height="52" patternUnits="userSpaceOnUse">
        <path d="M15 0 L15 17 M15 17 L0 26 M15 17 L30 26 M0 0 L15 17 L30 0 M0 26 L15 35 L30 26 M15 35 L15 52 M0 52 L15 35 L30 52 M0 26 L0 0 M30 26 L30 0 M0 52 L0 26 M30 52 L30 26" fill="none" stroke="currentColor" stroke-width=".9"/></pattern>`;
    }
    if (ala.includes('CHINA')) {
      return `<pattern id="${uid}" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M2 30 V2 H30 V24 H10 V10 H22 V18 H16" fill="none" stroke="currentColor" stroke-width="1.3"/></pattern>`;
    }
    if (ala.includes('FILIPINAS')) {
      return `<pattern id="${uid}" width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M0 3 H8 M0 6 H8 M8 8 V16 M11 8 V16 M14 8 V16 M8 0 V8 M11 0 V8 M14 0 V8 M0 11 H8 M0 14 H8" fill="none" stroke="currentColor" stroke-width="1"/></pattern>`;
    }
    return `<pattern id="${uid}" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="11" cy="11" r="11" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="0" cy="0" r="11" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="22" cy="22" r="11" fill="none" stroke="currentColor" stroke-width="1"/>
      <circle cx="11" cy="11" r="2" fill="currentColor"/></pattern>`;
  }

  // número de série + "QR" de enfeite gerados a partir do id (sempre iguais)
  function hash(txt) {
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function matriz(h) {
    let rects = '';
    let bits = h;
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const canto = (x < 2 && y < 2) || (x > 4 && y < 2) || (x < 2 && y > 4);
        if (canto || (bits & 1)) rects += `<rect x="${x * 3}" y="${y * 3}" width="3" height="3"/>`;
        bits = (bits >>> 1) | ((bits & 1) << 31);
        if (x === 3) bits = Math.imul(bits ^ y, 2654435761) >>> 0;
      }
    }
    return `<svg class="matriz" width="21" height="21" viewBox="0 0 21 21" fill="currentColor" aria-hidden="true">${rects}</svg>`;
  }

  let contador = 0;
  function html(l, opcoes) {
    const o = opcoes || {};
    const uid = 'pad-' + l.id + '-' + (contador++);
    const h = hash(l.id);
    const serie = h.toString(16).toUpperCase().slice(0, 4).padStart(4, '0');
    const p = pais(l);
    const nativo = NATIVO[p] || p;
    const dots = '●'.repeat(l.intensidade) + '○'.repeat(5 - l.intensidade);
    const coletada = o.coletada ? '<div class="abs carta-coletada">NO GRIMÓRIO</div>' : '';
    const arte = l.imagem && (o.coletada || o.exposicao) ? `<img class="carta-arte-ilustrada" src="${l.imagem}" alt="Carta ilustrada de ${l.nome}" loading="lazy" decoding="async">` : '';
    return `
      <div class="abs carta-detecta">◉ REGISTRO DETECTADO · ${l.num}</div>
      <div class="abs carta-cantos"><i></i><i></i><i></i><i></i></div>
      <div class="carta-in">
        <div class="carta-topo"><span>${o.exposicao ? 'EXPOSIÇÃO · EXTRA' : `REG. ${l.num}/${Bau.TOTAL_REGISTROS}`}</span><span class="carta-nativo">${nativo}</span></div>
        <div class="carta-janela">
          <svg class="abs carta-padrao" width="100%" height="100%" aria-hidden="true"><defs>${padrao(l, uid)}</defs><rect width="100%" height="100%" fill="url(#${uid})"/></svg>
          ${arte}
          ${arte ? '' : `<div class="abs carta-vidro"></div>
          <div class="abs carta-lacre">
            <svg class="abs lacre-anel" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 5"/></svg>
            <svg class="abs lacre-chave" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="6" fill="currentColor"/><path d="M16 18 L14 32 H26 L24 18Z" fill="currentColor"/></svg>
          </div>
          <div class="abs carta-lacrada">ARTE LACRADA · USE O QR</div>
          <div class="abs carta-scan"></div>`}
        </div>
        <div class="carta-nome">${l.nome}</div>
        <div class="carta-local">${l.local}</div>
        <div class="carta-rodape">
          <span class="carta-dots" aria-label="Intensidade ${l.intensidade} de 5">${dots}</span>
          <span class="carta-serie">LOTE 001 · ${serie}</span>
          ${matriz(h)}
        </div>
      </div>
      <div class="abs carta-holo"></div>
      ${coletada}`;
  }

  return { html };
})();
