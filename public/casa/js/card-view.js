import { cardBack } from '../../card-art.js'

let audio
function flipSound() {
  if (globalThis.Bau?.som?.ligado === false) return
  try {
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) return
    audio ||= new Audio()
    if (audio.state === 'suspended') audio.resume().catch(() => {})
    const buffer = audio.createBuffer(1, Math.floor(audio.sampleRate*.22), audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i=0; i<data.length; i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2)
    const source=audio.createBufferSource(), filter=audio.createBiquadFilter(), gain=audio.createGain()
    source.buffer=buffer; filter.type='bandpass'; filter.frequency.value=2400; gain.gain.value=.35
    source.connect(filter); filter.connect(gain); gain.connect(audio.destination); source.start()
  } catch { /* A carta continua funcionando sem áudio disponível. */ }
}

export function mountCard(legend, { unlocked = false, extra = false } = {}) {
  const el = document.createElement('article')
  el.className = 'carta-x'
  el.dataset.legendId = legend.id
  el.dataset.costas = cardBack(legend.id)
  el.dataset.unlocked = String(unlocked)
  const allowed = unlocked || extra
  el.innerHTML = '<div class="cx-inclina"><div class="cx-virador"><div class="cx-lado cx-frente"><div class="face face-arte"></div></div><div class="cx-lado cx-verso"><div class="face face-costas"></div></div></div></div><div class="cx-legenda"><span class="cx-nome"></span><span class="cx-face"></span></div>'
  const front = el.querySelector('.cx-frente'), back = el.querySelector('.cx-verso')
  const label = el.querySelector('.cx-face')
  el.querySelector('.cx-nome').textContent = legend.nome
  let turns = 0
  const update = () => {
    const rear = turns % 2 === 1
    el.dataset.face = rear ? 'verso' : 'frente'
    el.querySelector('.cx-virador').style.transform = `rotateY(${turns * 180}deg)`
    front.setAttribute('aria-hidden', String(rear)); back.setAttribute('aria-hidden', String(!rear))
    label.textContent = extra ? `EXPOSIÇÃO · ${rear ? 'VERSO' : 'FRENTE'}` : allowed ? `${rear ? 'VERSO' : 'FRENTE'} · ${String(legend.numero).padStart(3, '0')}/060` : 'LACRADA'
    el.setAttribute('aria-label', `${legend.nome}. ${allowed ? `Mostrando ${rear ? 'verso' : 'frente'}. Ative para virar.` : 'Carta ainda não descoberta.'}`)
    if (allowed) el.setAttribute('aria-pressed', String(rear))
  }
  function image(path, alt, parent) {
    const img = document.createElement('img')
    img.src = path; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false
    img.addEventListener('error', () => {
      const text = document.createElement('span'); text.className = 'cx-ausente'
      text.textContent = 'Imagem indisponível'; text.setAttribute('role', 'img'); text.setAttribute('aria-label', alt)
      img.replaceWith(text)
    }, { once: true })
    parent.append(img)
  }
  if (allowed && legend.imagem) image(legend.imagem, `Carta ilustrada de ${legend.nome}`, el.querySelector('.face-arte'))
  else {
    const text = document.createElement('span'); text.className = 'cx-ausente'
    text.textContent = allowed ? 'Arte ainda não fornecida' : '◈ Carta lacrada'
    el.querySelector('.face-arte').append(text)
  }
  image(`/casa/img/verso-${cardBack(legend.id)}.svg`, `Verso de ${legend.nome}`, el.querySelector('.face-costas'))
  const shine = document.createElement('div'); shine.className = 'holo'; shine.setAttribute('aria-hidden', 'true'); el.querySelector('.face-arte').append(shine)
  el.virar = (silent = false) => { if (allowed) { turns++; update(); if (silent !== true) flipSound() } }
  if (allowed) {
    el.tabIndex = 0; el.setAttribute('role', 'button')
    el.addEventListener('click', el.virar)
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); el.virar() }
    })
    el.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      el.classList.add('ativa')
      const r = el.getBoundingClientRect(), x = (event.clientX-r.left)/r.width, y = (event.clientY-r.top)/r.height
      el.style.setProperty('--rx', `${(.5-y)*10}deg`); el.style.setProperty('--ry', `${(x-.5)*12}deg`)
      el.style.setProperty('--gx', `${x*100}%`); el.style.setProperty('--gy', `${y*100}%`)
    })
    el.addEventListener('pointerleave', () => { el.classList.remove('ativa'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg') })
  }
  update()
  return el
}
