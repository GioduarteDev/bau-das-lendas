/* =========================================================
   MAIN — liga tudo: limiar, mouse, scroll, ficha, planta,
   dossiê, relógio e som.
   ========================================================= */
import { api } from '../../api.js';
import { collection } from './colecao.js';
import { mountCard } from './card-view.js';
import { houseCatalog } from './house-catalog.js';
import { exhibitCards } from '../../card-art.js';

const decorations = Bau.lendas;
try {
  let catalog;
  try { catalog = await api('/legends'); }
  catch {
    // O catálogo público é curatorial. Não substitui a coleção autenticada.
    const response = await fetch('/lendas-ra.json');
    if (!response.ok) throw Error('Catálogo indisponível.');
    catalog = await response.json();
  }
  Bau.lendas = houseCatalog(catalog, decorations);
  Bau.exposicao = exhibitCards.map(extra => ({ ...decorations.find(l => l.id === extra.id), ...extra }));
} catch {
  document.getElementById('dica').textContent = 'Não foi possível carregar as lendas oficiais. Atualize a página.';
  throw Error('Catálogo oficial indisponível.');
}

(function () {
  const $ = (id) => document.getElementById(id);
  const L = Bau.lendas;
  const C = Bau.corredor;
  const body = document.body;
  const vistos = new Set();
  document.addEventListener('error', function (event) {
    if (!event.target.matches?.('.carta-arte-ilustrada')) return;
    const text = document.createElement('span'); text.className = 'abs carta-lacrada';
    text.textContent = 'IMAGEM INDISPONÍVEL'; event.target.replaceWith(text);
  }, true);

  /* ---------- ficha ---------- */
  function atualizarFicha(i) {
    const l = L[i];
    vistos.add(i);
    const ficha = $('ficha');
    ficha.classList.add('trocando');
    setTimeout(function () {
      $('ficha-num').textContent = `REGISTRO ${l.num} / ${Bau.TOTAL_REGISTROS}`;
      $('ficha-local').textContent = l.local;
      $('ficha-nome').textContent = l.nome;
      $('ficha-frase').textContent = l.frase;
      ficha.classList.remove('trocando');
    }, 350);
    $('rodape-cam').textContent = 'CAM 02 — ' + l.ala;
    Bau.planta.marcarVisto(i);
    $('btn-ant').disabled = i === 0;
  }

  /* ---------- jardim → porta → corredor ---------- */
  // O scroll anda direto: atravessa o jardim, a porta abre sozinha
  // quando você chega perto e você entra no corredor sem parar.
  function saiuDoPortao(longe) {
    body.classList.toggle('abrindo', longe);           // o texto da entrada some
    if (longe && !Bau.som.ligado) alternarSom(true);
  }
  function entrouNaCasa(dentro) {
    body.classList.toggle('dentro', dentro);           // painel da lenda, planta etc.
    $('nav-corredor').classList.toggle('ativo', dentro);
    $('dica').textContent = dentro ? 'MOVA O MOUSE PARA OLHAR · ROLE PARA CAMINHAR' : 'MOVA O MOUSE PARA OLHAR · ROLE PARA ATRAVESSAR O JARDIM';
    if (!dentro) $('rodape-cam').textContent = 'CAM 01 — JARDIM';
  }

  function seguirPegadas() {                           // anda sozinho até a 1ª lenda
    if (!Bau.som.ligado) alternarSom(true);
    C.seguir(C.alvoDe(0), 950);
  }
  function entrarDireto() {
    if (!Bau.som.ligado) alternarSom(true);
    C.entrar();
  }
  function voltarAoPortao() { C.sair(); }

  $('btn-entrar').addEventListener('click', seguirPegadas);
  $('nav-corredor').addEventListener('click', function (ev) { ev.preventDefault(); entrarDireto(); });
  $('marca').addEventListener('click', function (ev) { ev.preventDefault(); voltarAoPortao(); });

  /* ---------- mouse: olhar + lanterna ---------- */
  window.addEventListener('pointermove', function (ev) {
    const nx = (ev.clientX / window.innerWidth) * 2 - 1;
    const ny = (ev.clientY / window.innerHeight) * 2 - 1;
    C.olhar(nx, ny);
    document.documentElement.style.setProperty('--px', nx.toFixed(3));
    document.documentElement.style.setProperty('--py', ny.toFixed(3));
    body.style.setProperty('--mx', ev.clientX + 'px');
    body.style.setProperty('--my', ev.clientY + 'px');
  });
  // no celular: girar o aparelho também olha em volta
  window.addEventListener('deviceorientation', function (ev) {
    if (ev.gamma == null) return;
    C.olhar(Math.max(-1, Math.min(1, ev.gamma / 30)), Math.max(-1, Math.min(1, (ev.beta - 60) / 30)));
  });

  /* ---------- caminhar: roda do mouse, teclado, toque ---------- */
  // roda do mouse: anda direto (sem travar), mais rápido no jardim
  const RODA_FORA = 3.2, RODA_DENTRO = 2.2;
  window.addEventListener('wheel', function (ev) {
    if (!$('dossie').hidden) return;
    let d = ev.deltaY * (ev.deltaMode === 1 ? 40 : 1);  // alguns mouses mandam "linhas"
    d = Math.max(-160, Math.min(160, d));
    C.andar(d * (C.estado.dentro ? RODA_DENTRO : RODA_FORA));
  }, { passive: true });

  // setas e botões: uma lenda por vez
  function passo(dir) {
    const e = C.estado;
    if (!e.dentro) { C.andar(dir * 700); return; }
    if (dir < 0 && e.kisaragi) { C.irPara(L.length - 1); return; }
    C.irPara(e.i + dir);
    Bau.eggs.garra();
  }

  window.addEventListener('keydown', function (ev) {
    if (!$('dossie').hidden) { if (ev.key === 'Escape') fecharDossie(); return; }
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(ev.key)) { ev.preventDefault(); passo(1); }
    if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(ev.key)) { ev.preventDefault(); passo(-1); }
    // atalhos de apresentação: a s d f g h j k l ç
    if (!ev.ctrlKey && !ev.metaKey && !ev.altKey) {
      const TECLAS = { a: 1, s: 2, d: 3, f: 4, g: 5, j: 6, k: 7, l: 8, 'ç': 9 };
      const tecla = ev.key.toLowerCase();
      if (tecla === 'h') Bau.som.risada();
      else if (TECLAS[tecla]) Bau.aparicoes.forcar(TECLAS[tecla]);
      else if (/^[0-9]$/.test(ev.key)) Bau.aparicoes.forcar(Number(ev.key));
    }
    if (ev.key === 'Enter' && body.classList.contains('dentro') && document.activeElement === document.body) abrirDossie(C.estado.i);
  });

  let toqueY = null;
  window.addEventListener('touchstart', (ev) => { toqueY = ev.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', function (ev) {
    if (toqueY === null || !$('dossie').hidden) return;
    const dy = toqueY - ev.changedTouches[0].clientY;
    if (Math.abs(dy) > 30) C.andar(dy * (C.estado.dentro ? 3 : 5));
    toqueY = null;
  }, { passive: true });

  $('btn-prox').addEventListener('click', () => C.irPara(C.estado.i + 1));
  $('btn-ant').addEventListener('click', () => C.irPara(C.estado.i - 1));
  $('btn-dossie').addEventListener('click', () => abrirDossie(C.estado.i));

  /* ---------- dossiê ---------- */
  let dossieAtual = 0;
  function abrirDossie(i) {
    const l = L[i];
    dossieAtual = i;
    mostrarCarta(l);
    $('dossie-prancha-num').textContent = 'CARTA ' + l.num + ' · ' + (noGrimorio(l.id) ? 'NO GRIMÓRIO' : 'LACRADA');
    $('dossie-parede').textContent = `${l.ala} · PAREDE ${l.lado === 'E' ? 'ESQ.' : 'DIR.'}`;
    $('dossie-num').textContent = `REGISTRO ${l.num} / ${Bau.TOTAL_REGISTROS}`;
    $('dossie-ala').textContent = l.ala;
    $('dossie-nome').textContent = l.nome;
    $('dossie-original').textContent = l.original;
    $('dossie-frase').textContent = l.frase;
    const bolinhas = '●'.repeat(l.intensidade) + '○'.repeat(5 - l.intensidade);
    $('dossie-dados').innerHTML =
      `<div><dt>ORIGEM</dt><dd>${l.local}</dd></div>` +
      `<div><dt>PERÍODO</dt><dd>${l.periodo}</dd></div>` +
      `<div><dt>TIPO</dt><dd>${l.tipo}</dd></div>` +
      `<div><dt>INTENSIDADE</dt><dd class="intensidade" aria-label="${l.intensidade} de 5">${bolinhas}</dd></div>`;
    $('dossie-relato').innerHTML = l.relato.map((p) => `<p>${p}</p>`).join('');
    $('dossie-fonte').textContent = 'FONTE: ' + l.fonte;
    $('btn-grimorio').textContent = noGrimorio(l.id) ? 'ABRIR MEU GRIMÓRIO' : 'DESCOBRIR NO BAÚ EM RA';
    document.querySelector('.dossie-surpresa').textContent = collection.error || (noGrimorio(l.id) ? 'Carta salva na sua conta. Clique na ilustração para virar.' : 'Descubra esta carta no baú em RA para adicioná-la à sua conta.');
    $('dossie').hidden = false;
    $('dossie').scrollTop = 0;
    $('btn-fechar').focus();
  }
  function fecharDossie() {
    $('dossie').hidden = true;
    $('btn-dossie').focus();
  }
  Bau.abrirDossie = abrirDossie;
  $('btn-fechar').addEventListener('click', fecharDossie);

  function noGrimorio(id) { return collection.has(id); }
  function mostrarCarta(l, extra = false) {
    const slot = $('dossie-carta');
    const illustrated = Boolean(l.imagem && (extra || noGrimorio(l.id)));
    slot.classList.toggle('ilustrada', illustrated);
    if (illustrated) slot.replaceChildren(mountCard(l, { unlocked: noGrimorio(l.id), extra }));
    else slot.innerHTML = Bau.cartas.html(l, { coletada: noGrimorio(l.id) });
  }
  Bau.abrirExposicao = function (id) {
    const l = Bau.exposicao.find(c => c.id === id);
    if (!l) return;
    dossieAtual = -1;
    mostrarCarta(l, true);
    $('dossie-prancha-num').textContent = 'EXPOSIÇÃO · FORA DA COLEÇÃO';
    $('dossie-parede').textContent = 'ACERVO EXTRA';
    $('dossie-num').textContent = 'CARTA EXTRA · SEM NÚMERO OFICIAL';
    $('dossie-ala').textContent = 'EXPOSIÇÃO';
    $('dossie-nome').textContent = l.nome;
    $('dossie-original').textContent = l.original || '';
    $('dossie-frase').textContent = l.frase || '';
    $('dossie-dados').replaceChildren();
    $('dossie-relato').replaceChildren(...(l.relato || []).map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    $('dossie-fonte').textContent = l.fonte || '';
    document.querySelector('.dossie-surpresa').textContent = 'Saci Pererê é uma carta de exposição. Não integra o progresso das 60 lendas.';
    $('btn-grimorio').textContent = 'ABRIR MEU GRIMÓRIO';
    $('dossie').hidden = false; $('dossie').scrollTop = 0; $('btn-fechar').focus();
  };
  collection.addEventListener('change', function () {
    C.atualizarColecao();
    if (!$('dossie').hidden && dossieAtual >= 0) {
      const active = document.activeElement;
      abrirDossie(dossieAtual);
      if (active?.isConnected) active.focus();
    }
  });
  $('btn-grimorio').addEventListener('click', function () {
    window.location.assign(dossieAtual < 0 || noGrimorio(L[dossieAtual].id) ? '/?album=1' : collection.user ? '/ra.html' : '/?conta=1&retorno=ritual');
  });

  /* ---------- som ---------- */
  function alternarSom(forcar) {
    const ligar = typeof forcar === 'boolean' ? forcar : !Bau.som.ligado;
    if (ligar) Bau.som.ligar(); else Bau.som.desligar();
    $('btn-som').setAttribute('aria-pressed', String(ligar));
    $('btn-som').textContent = 'SOM: ' + (ligar ? 'LIGADO' : 'DESLIGADO');
  }
  $('btn-som').addEventListener('click', () => alternarSom());

  /* ---------- relógios ---------- */
  function relogios() {
    const agora = new Date();
    const h = agora.getHours(), m = agora.getMinutes();
    $('rodape-hora').textContent = agora.toTimeString().slice(0, 8);
    const rel = $('relogio-meianoite');
    if (h < 5) {
      rel.innerHTML = `Agora são <b>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</b>. Já passou da meia-noite. Elas estão acordadas.`;
    } else {
      const faltam = (24 * 60) - (h * 60 + m);
      const fh = Math.floor(faltam / 60), fm = faltam % 60;
      rel.innerHTML = `Esta casa guardou sessenta. Agora são <b>${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}</b>, e você ainda tem <b>${fh}h${String(fm).padStart(2, '0')}</b>.`;
    }
  }
  relogios();
  setInterval(relogios, 1000);

  /* ---------- modo projetor: ?brilho=1.5 na URL ajusta a claridade ---------- */
  const brilho = new URLSearchParams(location.search).get('brilho');
  if (brilho) document.documentElement.style.setProperty('--brilho', brilho);

  /* ---------- links do seu site (js/config.js) ---------- */
  document.querySelectorAll('[data-rota]').forEach(function (a) {
    const r = Bau.ROTAS && Bau.ROTAS[a.dataset.rota];
    if (r) a.setAttribute('href', r);
  });

  /* ---------- começar ---------- */
  C.iniciar(L, atualizarFicha, { dentro: entrouNaCasa, saiu: saiuDoPortao });
  entrouNaCasa(false);
  Bau.planta.montar();
  Bau.eggs.iniciar();
  Bau.aparicoes.iniciar();
})();
