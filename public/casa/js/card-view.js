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

const FACES = ['frente', 'verso', 'ficha']
const NOMES = { frente: 'ARTE', verso: 'VERSO', ficha: 'FICHA' }

function el(tag, classe, texto) {
  const node = document.createElement(tag)
  if (classe) node.className = classe
  if (texto != null) node.textContent = texto
  return node
}

// 3ª face: ficha com os dados oficiais do catálogo (origem, ameaça, encontro, história).
function fichaDe(legend) {
  const face = el('div', `face face-ficha tema-${cardBack(legend.id)}`)
  face.append(el('div', 'ficha-moldura'))
  const corpo = el('div', 'ficha-corpo')
  const topo = el('div', 'ficha-topo')
  topo.append(el('span', '', legend.numero ? `Nº ${String(legend.numero).padStart(3, '0')} / 060` : 'EXPOSIÇÃO'),
    el('span', '', cardBack(legend.id) === 'vitral' ? 'LUGAR MALDITO' : 'ENTIDADE'))
  corpo.append(topo)
  const titulo = el('div', 'ficha-titulo')
  titulo.append(el('h3', 'ficha-nome', legend.nome))
  if (legend.subtitulo) titulo.append(el('p', 'ficha-sub', legend.subtitulo))
  if (legend.origem) titulo.append(el('p', 'ficha-origem', legend.origem))
  corpo.append(titulo, el('div', 'ficha-linha'))
  if (legend.ameaca != null) {
    const v = Math.max(0, Math.min(100, Number(legend.ameaca)))
    const bloco = el('div', 'ficha-medidor')
    const rotulo = el('div', 'ficha-rotulo'); rotulo.append(el('span', '', 'AMEAÇA'), el('span', '', `${v}/100`))
    const barra = el('div', 'ficha-barra'); const cheio = el('i'); cheio.style.setProperty('--v', `${v}%`); barra.append(cheio)
    bloco.append(rotulo, barra); corpo.append(bloco)
  }
  if (legend.encontro != null) {
    const v = Math.max(0, Math.min(10, Number(legend.encontro)))
    const bloco = el('div', 'ficha-medidor')
    const rotulo = el('div', 'ficha-rotulo'); rotulo.append(el('span', '', 'CHANCE DE ENCONTRO'), el('span', '', `${v}/10`))
    const luas = el('div', 'ficha-luas'); luas.setAttribute('aria-hidden', 'true')
    for (let i = 1; i <= 10; i++) luas.append(el('i', i <= v ? 'cheia' : ''))
    bloco.append(rotulo, luas); corpo.append(bloco)
  }
  if (legend.notaEncontro) {
    const nota = el('div', 'ficha-nota'); nota.append(el('span', '', 'COMO EVITAR'), el('p', '', legend.notaEncontro)); corpo.append(nota)
  }
  const trecho = String(legend.historia || legend.frase || '').split(/\n\s*\n/).map(t => t.trim()).filter(t => t && t.length > 25)[0]
  if (trecho) corpo.append(el('p', 'ficha-historia', trecho))
  corpo.append(el('div', 'ficha-pe', 'BAÚ DAS LENDAS'))
  face.append(corpo)
  return face
}

export function mountCard(legend, { unlocked = false, extra = false, preview = false } = {}) {
  const card = document.createElement('article')
  card.className = 'carta-x'
  card.dataset.legendId = legend.id
  card.dataset.costas = cardBack(legend.id)
  card.dataset.unlocked = String(unlocked)
  card.dataset.preview = String(preview)
  const allowed = unlocked || extra || preview
  const revealed = unlocked || extra || preview
  card.innerHTML = '<div class="cx-inclina"><div class="cx-virador"><div class="cx-lado cx-frente"></div><div class="cx-lado cx-verso"></div></div></div><div class="cx-legenda"><span class="cx-nome"></span><span class="cx-face"></span></div>'
  const front = card.querySelector('.cx-frente'), back = card.querySelector('.cx-verso')
  const label = card.querySelector('.cx-face')
  card.querySelector('.cx-nome').textContent = legend.nome

  function image(path, alt, parent) {
    const img = document.createElement('img')
    img.src = path; img.alt = alt; img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false
    img.addEventListener('error', () => {
      const text = el('span', 'cx-ausente', 'Imagem indisponível')
      text.setAttribute('role', 'img'); text.setAttribute('aria-label', alt)
      img.replaceWith(text)
    }, { once: true })
    parent.append(img)
  }
  function arte() {
    const face = el('div', 'face face-arte')
    if (revealed && legend.imagem) image(legend.imagem, `Carta ilustrada de ${legend.nome}`, face)
    else face.append(el('span', 'cx-ausente', revealed ? 'Arte ainda não fornecida' : '◈ Carta lacrada'))
    const shine = el('div', 'holo'); shine.setAttribute('aria-hidden', 'true'); face.append(shine)
    return face
  }
  function costas() {
    const face = el('div', 'face face-costas')
    image(`/casa/img/verso-${cardBack(legend.id)}.svg`, `Verso de ${legend.nome}`, face)
    return face
  }
  const FAZ = { frente: arte, verso: costas, ficha: () => fichaDe(legend) }

  // Duas faces físicas, três conteúdos: o lado que vai aparecer recebe a próxima face antes de girar.
  let turns = 0, face = 0
  front.replaceChildren(FAZ.frente())
  const update = () => {
    const nome = FACES[face], rear = turns % 2 === 1
    card.dataset.face = nome
    card.querySelector('.cx-virador').style.transform = `rotateY(${turns * 180}deg)`
    front.setAttribute('aria-hidden', String(rear)); back.setAttribute('aria-hidden', String(!rear))
    label.textContent = extra
      ? `EXPOSIÇÃO · ${NOMES[nome]}`
      : unlocked
        ? `${NOMES[nome]} · ${String(legend.numero).padStart(3, '0')}/060`
        : preview
          ? `PRÉVIA PÚBLICA · ${NOMES[nome]}`
          : 'LACRADA'
    card.setAttribute('aria-label', `${legend.nome}. ${revealed ? `Mostrando ${NOMES[nome].toLowerCase()}, face ${face + 1} de 3. Ative para virar.` : 'Carta ainda não descoberta.'}`)
    if (allowed) card.setAttribute('aria-pressed', String(face !== 0))
  }
  card.virar = (silent = false) => {
    if (!allowed) return
    turns++; face = (face + 1) % 3
    ;(turns % 2 ? back : front).replaceChildren(FAZ[FACES[face]]())
    update()
    if (silent !== true) flipSound()
  }
  if (allowed) {
    card.tabIndex = 0; card.setAttribute('role', 'button')
    card.addEventListener('click', card.virar)
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); card.virar() }
    })
    card.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      card.classList.add('ativa')
      const r = card.getBoundingClientRect(), x = (event.clientX-r.left)/r.width, y = (event.clientY-r.top)/r.height
      card.style.setProperty('--rx', `${(.5-y)*10}deg`); card.style.setProperty('--ry', `${(x-.5)*12}deg`)
      card.style.setProperty('--gx', `${x*100}%`); card.style.setProperty('--gy', `${y*100}%`)
    })
    card.addEventListener('pointerleave', () => { card.classList.remove('ativa'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg') })
  }
  update()
  return card
}
