/* =========================================================
   SOM — tudo sintetizado com Web Audio (sem arquivos .mp3)
   Só liga depois de um clique (regra dos navegadores).
   ========================================================= */
window.Bau = window.Bau || {};

Bau.som = (function () {
  let ctx = null, mestre = null, ligado = false, ambiente = null;

  function ruidoBuffer(seg) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seg, ctx.sampleRate);
    const d = b.getChannelData(0);
    let ultimo = 0;
    for (let i = 0; i < d.length; i++) { // ruído marrom (grave, abafado)
      const branco = Math.random() * 2 - 1;
      ultimo = (ultimo + 0.02 * branco) / 1.02;
      d[i] = ultimo * 3.5;
    }
    return b;
  }

  function iniciar() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    mestre = ctx.createGain();
    mestre.gain.value = 0;
    mestre.connect(ctx.destination);
  }

  function ligar() {
    iniciar();
    if (ctx.state === 'suspended') ctx.resume();
    ligado = true;
    mestre.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
    if (!ambiente) tocarAmbiente();
  }
  function desligar() {
    if (!ctx) return;
    ligado = false;
    mestre.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
  }

  // zumbido da casa: vento grave + nota baixa que oscila
  function tocarAmbiente() {
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruidoBuffer(4); fonte.loop = true;
    const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 260;
    const g = ctx.createGain(); g.gain.value = 0.12;
    fonte.connect(filtro).connect(g).connect(mestre);
    fonte.start();

    const osc = ctx.createOscillator(); osc.frequency.value = 55;
    const og = ctx.createGain(); og.gain.value = 0.025;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = ctx.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg).connect(og.gain);
    osc.connect(og).connect(mestre);
    osc.start(); lfo.start();
    ambiente = { fonte, osc, lfo };
  }

  function envelope(g, t, ataque, dur, pico) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // passo na madeira (com rangido às vezes)
  function passo() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(0.3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    const g = ctx.createGain(); envelope(g, t, 0.01, 0.22, 0.5);
    f.connect(lp).connect(g).connect(mestre); f.start(t); f.stop(t + 0.3);
    if (Math.random() < 0.35) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(110 + Math.random() * 40, t + 0.05);
      o.frequency.linearRampToValueAtTime(70, t + 0.6);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6;
      const og = ctx.createGain(); envelope(og, t + 0.05, 0.08, 0.65, 0.05);
      o.connect(bp).connect(og).connect(mestre); o.start(t + 0.05); o.stop(t + 0.7);
    }
  }

  // uivo de lobo
  function uivo() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(280, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.9);
    o.frequency.linearRampToValueAtTime(560, t + 2.2);
    o.frequency.exponentialRampToValueAtTime(330, t + 3.2);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
    const vg = ctx.createGain(); vg.gain.value = 9;
    vib.connect(vg).connect(o.frequency);
    const g = ctx.createGain(); envelope(g, t, 0.5, 3.4, 0.16);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    o.connect(lp).connect(g).connect(mestre);
    o.start(t); vib.start(t); o.stop(t + 3.5); vib.stop(t + 3.5);
  }

  // "po… po… po…"
  function popopo() {
    if (!ligado) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.55;
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(95, t + 0.18);
      const g = ctx.createGain(); envelope(g, t, 0.02, 0.24, 0.22);
      o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.3);
    }
  }

  // trem chegando (Kisaragi)
  function trem() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(6);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 3.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    f.connect(bp).connect(g).connect(mestre); f.start(t); f.stop(t + 6);
    for (let i = 0; i < 18; i++) { // tec-tec dos trilhos
      const tt = t + 1 + i * 0.26 + (i % 2) * 0.08;
      const c = ctx.createBufferSource(); c.buffer = ruidoBuffer(0.08);
      const cg = ctx.createGain(); envelope(cg, tt, 0.005, 0.07, 0.25 * Math.max(0.05, Math.min(1, i / 8)));
      c.connect(cg).connect(mestre); c.start(tt);
    }
    [330, 415].forEach(function (fr) { // apito
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = fr;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const og = ctx.createGain(); envelope(og, t + 3.6, 0.05, 4.8, 0.05);
      o.connect(lp).connect(og).connect(mestre); o.start(t + 3.6); o.stop(t + 5);
    });
  }

  // sussurro (Loira)
  function sussurro() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(1.5);
    const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2600; hp.Q.value = 2;
    const g = ctx.createGain(); envelope(g, t, 0.3, 1.4, 0.5);
    f.connect(hp).connect(g).connect(mestre); f.start(t);
  }

  // redemoinho (Saci)
  function vento() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(2);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 4;
    bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(2400, t + 0.8); bp.frequency.exponentialRampToValueAtTime(300, t + 1.8);
    const g = ctx.createGain(); envelope(g, t, 0.2, 1.9, 0.6);
    f.connect(bp).connect(g).connect(mestre); f.start(t);
  }

  // rangido de porta (suave = porta de correr)
  function rangido(suave) {
    if (!ligado) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(suave ? 60 : 90, t);
    o.frequency.linearRampToValueAtTime(suave ? 50 : 140, t + 0.6);
    o.frequency.linearRampToValueAtTime(suave ? 45 : 70, t + 1.4);
    const am = ctx.createOscillator(); am.frequency.value = suave ? 0 : 22;
    const ag = ctx.createGain(); ag.gain.value = 0.5;
    am.connect(ag);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = suave ? 500 : 1100; bp.Q.value = 5;
    const g = ctx.createGain(); envelope(g, t, 0.15, 1.5, suave ? 0.05 : 0.09);
    ag.connect(g.gain);
    o.connect(bp).connect(g).connect(mestre); o.start(t); am.start(t); o.stop(t + 1.6); am.stop(t + 1.6);
  }

  // batida seca (porta fechando, apagão)
  function batida() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const g = ctx.createGain(); envelope(g, t, 0.005, 0.4, 0.5);
    o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.45);
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(0.2);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const fg = ctx.createGain(); envelope(fg, t, 0.003, 0.18, 0.4);
    f.connect(lp).connect(fg).connect(mestre); f.start(t);
  }

  // gotejar (sangue)
  function gota() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(900 + Math.random() * 400, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.08);
    const g = ctx.createGain(); envelope(g, t, 0.003, 0.12, 0.08);
    o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.15);
  }

  // zumbido grave de tensão (figura no fim do corredor)
  function tensao() {
    if (!ligado) return;
    const t = ctx.currentTime;
    [55, 58.3].forEach(function (fr) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
      const g = ctx.createGain(); envelope(g, t, 1.2, 4, 0.06);
      o.connect(lp).connect(g).connect(mestre); o.start(t); o.stop(t + 4.1);
    });
  }

  // respingo molhado
  function splat() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(0.4);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    const g = ctx.createGain(); envelope(g, t, 0.004, 0.35, 0.9);
    f.connect(lp).connect(g).connect(mestre); f.start(t);
  }

  // gosma borbulhando
  function gosma() {
    if (!ligado) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 9; i++) {
      const t = t0 + i * (0.15 + Math.random() * 0.25);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(80 + Math.random() * 60, t); o.frequency.exponentialRampToValueAtTime(260 + Math.random() * 200, t + 0.06);
      const g = ctx.createGain(); envelope(g, t, 0.005, 0.1, 0.18);
      o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.12);
    }
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(2.5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const g = ctx.createGain(); envelope(g, t0, 0.4, 2.4, 0.35);
    f.connect(lp).connect(g).connect(mestre); f.start(t0);
  }

  // coração batendo (veias)
  function coracao(vezes) {
    if (!ligado) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < (vezes || 5); i++) {
      [0, 0.22].forEach(function (d, n) {
        const t = t0 + i * 0.85 + d;
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.15);
        const g = ctx.createGain(); envelope(g, t, 0.01, 0.2, n ? 0.4 : 0.6);
        o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.22);
      });
    }
  }

  // passo pesado vindo de cima (abafado pelo forro)
  function passoTeto() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.2);
    const g = ctx.createGain(); envelope(g, t, 0.01, 0.3, 0.55);
    o.connect(g).connect(mestre); o.start(t); o.stop(t + 0.32);
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(0.3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const fg = ctx.createGain(); envelope(fg, t, 0.005, 0.25, 0.5);
    f.connect(lp).connect(fg).connect(mestre); f.start(t);
    if (Math.random() < 0.4) rangido(true);
  }

  // mão batendo espalmada na parede
  function batidaMao() {
    if (!ligado) return;
    const t = ctx.currentTime;
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(0.2);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 1.2;
    const g = ctx.createGain(); envelope(g, t, 0.003, 0.16, 0.7);
    f.connect(bp).connect(g).connect(mestre); f.start(t);
  }

  // unhas arranhando (suave = mão escorregando)
  function arranhar(suave) {
    if (!ligado) return;
    const t = ctx.currentTime;
    const dur = suave ? 1.8 : 1.1;
    const f = ctx.createBufferSource(); f.buffer = ruidoBuffer(dur + 0.2);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 9;
    bp.frequency.setValueAtTime(suave ? 900 : 2600, t); bp.frequency.linearRampToValueAtTime(suave ? 500 : 1700, t + dur);
    const am = ctx.createOscillator(); am.frequency.value = suave ? 7 : 31;
    const ag = ctx.createGain(); ag.gain.value = 0.4; am.connect(ag);
    const g = ctx.createGain(); envelope(g, t, 0.05, dur, suave ? 0.35 : 0.5);
    ag.connect(g.gain);
    f.connect(bp).connect(g).connect(mestre); f.start(t); am.start(t); am.stop(t + dur);
  }

  /* RISADA MACABRA — 3 vozes: 'grave' (homem), 'bruxa' (aguda), 'crianca' (risadinha)
     Tudo sintetizado: pulsos de voz + filtros de vogal "a" + eco de corredor. */
  let ecoCache = null;
  function eco() {
    if (ecoCache) return ecoCache;
    const seg = 2.8, len = ctx.sampleRate * seg;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    const conv = ctx.createConvolver(); conv.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.55;
    conv.connect(g).connect(mestre);
    ecoCache = conv;
    return conv;
  }
  function risada(tipo) {
    if (!ligado) return;
    const tipos = ['grave', 'bruxa', 'crianca'];
    const t = tipo || tipos[Math.floor(Math.random() * tipos.length)];
    const cfg = {
      grave:   { n: 6, base: 135, dur: 0.24, gap: 0.12, f1: 620, f2: 1050, vol: 0.5 },
      bruxa:   { n: 10, base: 480, dur: 0.1, gap: 0.045, f1: 950, f2: 1700, vol: 0.32 },
      crianca: { n: 5, base: 340, dur: 0.12, gap: 0.09, f1: 1000, f2: 2300, vol: 0.26 }
    }[t];
    const saida = ctx.createGain(); saida.gain.value = cfg.vol;
    saida.connect(mestre); saida.connect(eco());
    const t0 = ctx.currentTime + 0.05;
    let tt = t0;
    for (let i = 0; i < cfg.n; i++) {
      const dur = cfg.dur * (0.85 + Math.random() * 0.3);
      const f = cfg.base * (1 - i * 0.03) * (0.97 + Math.random() * 0.06);
      // voz (pulsos) que cai de tom em cada "ha"
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 1.18, tt);
      o.frequency.exponentialRampToValueAtTime(f * 0.86, tt + dur);
      const vib = ctx.createOscillator(); vib.frequency.value = 6 + Math.random() * 2;
      const vg = ctx.createGain(); vg.gain.value = f * 0.025;
      vib.connect(vg).connect(o.frequency);
      // filtros de vogal "a"
      const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = cfg.f1; b1.Q.value = 6;
      const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = cfg.f2; b2.Q.value = 8;
      const g = ctx.createGain(); envelope(g, tt, 0.018, dur, 1);
      o.connect(b1).connect(g); o.connect(b2).connect(g); g.connect(saida);
      o.start(tt); vib.start(tt); o.stop(tt + dur + 0.05); vib.stop(tt + dur + 0.05);
      // ar saindo (o "h" do "ha")
      const ar = ctx.createBufferSource(); ar.buffer = ruidoBuffer(dur);
      const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = cfg.f2; hp.Q.value = 1.5;
      const ag = ctx.createGain(); envelope(ag, tt, 0.01, dur * 0.6, 0.35);
      ar.connect(hp).connect(ag).connect(saida); ar.start(tt);
      tt += dur + cfg.gap * (0.8 + Math.random() * 0.5);
    }
    if (t === 'grave') { // suspiro longo no final
      const ar = ctx.createBufferSource(); ar.buffer = ruidoBuffer(1.6);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 2;
      const g = ctx.createGain(); envelope(g, tt + 0.1, 0.3, 1.4, 0.4);
      ar.connect(bp).connect(g).connect(saida); ar.start(tt + 0.1);
    }
  }

  return {
    ligar, desligar,
    get ligado() { return ligado; },
    passo, uivo, popopo, trem, sussurro, vento, rangido, batida, gota, tensao, splat, gosma, coracao, passoTeto, batidaMao, arranhar, risada
  };
})();
