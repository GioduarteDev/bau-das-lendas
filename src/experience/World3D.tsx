import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { lendas } from '../data/lendas'
import { criarAtmosfera } from './Atmosfera'
import { criarCatalogo, SEQUENCIA_APRESENTACAO } from './hauntings/EventCatalog'
import { criarDiretor } from './hauntings/EventDirector'
import { criarMundoAssombrado } from './hauntings/HauntingWorld'

export type FaseMundo = 'entrada' | 'travessia'

type World3DProps = {
  indiceAtivo: number
  deslocamento: number
  fase: FaseMundo
  reduzirMovimento: boolean
  pausado: boolean
  aoNavegar?: (indice:number)=>void
  aoAbrirDossie?: (indice:number)=>void
}

const ESPACO = 7 // distância entre os registros ao longo do corredor
const LARGURA = 4.6 // meia largura da nave
const Z_PORTAL = 0
const zRegistro = (i: number) => -8 - i * ESPACO
const zCamera = (i: number) => zRegistro(i) + 5.5
const Z_VESTIBULO = 9

function gerador(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function criarCanvas(largura: number, altura: number) {
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  return { canvas, ctx: canvas.getContext('2d')! }
}

function texturaPedra(semente: number, tijolos: boolean) {
  const rnd = gerador(semente)
  const { canvas, ctx } = criarCanvas(512, 512)
  ctx.fillStyle = '#827c70'
  ctx.fillRect(0, 0, 512, 512)

  for (let i = 0; i < 9000; i++) {
    const v = Math.floor(82 + rnd() * 46)
    ctx.fillStyle = `rgba(${v},${v - 3},${v - 9},${0.025 + rnd() * 0.08})`
    ctx.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3)
  }

  if (tijolos) {
    ctx.strokeStyle = 'rgba(45,39,32,.16)'
    ctx.lineWidth = 2
    for (let x = 0; x < 512; x += 128) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 512)
      ctx.stroke()
    }
  }

  for (let i = 0; i < 14; i++) {
    const x = rnd() * 512
    const g = ctx.createLinearGradient(x, 0, x, 512)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.3 + rnd() * 0.3, `rgba(31,26,21,${0.04 + rnd() * 0.07})`)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x, 0, 2 + rnd() * 5, 512)
  }
  for (let i = 0; i < 10; i++) {
    const cx = rnd() * 512
    const cy = rnd() * 512
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50 + rnd() * 70)
    g.addColorStop(0, 'rgba(45,37,29,.12)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 512)
  }

  const textura = new THREE.CanvasTexture(canvas)
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = 4
  return textura
}

function texturaPiso() {
  const rnd = gerador(77)
  const { canvas, ctx } = criarCanvas(512, 512)
  ctx.fillStyle = '#5b3e2e'
  ctx.fillRect(0, 0, 512, 512)
  const rows = 8, rowHeight = 512 / rows
  for (let row = 0; row < rows; row++) {
    const y = row * rowHeight
    const tone = 72 + Math.floor(rnd() * 34)
    ctx.fillStyle = `rgb(${tone},${tone * 0.69},${tone * 0.49})`
    ctx.fillRect(0, y, 512, rowHeight)
    ctx.strokeStyle = 'rgba(26,16,11,.72)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(512, y)
    ctx.stroke()

    const offset = row % 2 ? 110 : 0
    for (let x = offset; x < 512; x += 256) {
      ctx.strokeStyle = 'rgba(23,14,9,.68)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + rowHeight)
      ctx.stroke()
    }

    for (let i = 0; i < 45; i++) {
      const x = rnd() * 512
      const grainY = y + rnd() * rowHeight
      ctx.strokeStyle = `rgba(25,15,9,${0.08 + rnd() * 0.2})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, grainY)
      ctx.bezierCurveTo(x + 24, grainY - 5, x + 44, grainY + 5, x + 72, grainY)
      ctx.stroke()
    }

    if (rnd() > 0.64) {
      const knotX = 36 + rnd() * 440
      const knotY = y + rowHeight * (0.25 + rnd() * 0.5)
      ctx.strokeStyle = 'rgba(24,14,9,.22)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(knotX, knotY, 8 + rnd() * 8, 2.5, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  const textura = new THREE.CanvasTexture(canvas)
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = 8
  return textura
}

function texturaMadeira() {
  const rnd = gerador(311)
  const { canvas, ctx } = criarCanvas(512, 1024)
  ctx.fillStyle = '#51372a'
  ctx.fillRect(0, 0, 512, 1024)
  for (let t = 0; t < 8; t++) {
    const shade = Math.floor(73 + rnd() * 24)
    ctx.fillStyle = `rgba(${shade},${shade * .68},${shade * .48},.72)`
    ctx.fillRect(t * 64 + 2, 0, 60, 1024)
    ctx.fillStyle = 'rgba(24,15,10,.5)'
    ctx.fillRect(t * 64 - 2, 0, 2, 1024)
  }
  for (let i = 0; i < 700; i++) {
    ctx.strokeStyle = `rgba(24,14,9,${0.07 + rnd() * 0.2})`
    ctx.lineWidth = 1
    const x = rnd() * 512
    ctx.beginPath()
    ctx.moveTo(x, rnd() * 1024)
    ctx.lineTo(x + (rnd() - 0.5) * 9, rnd() * 1024)
    ctx.stroke()
  }
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

function texturaJanela() {
  const { canvas, ctx } = criarCanvas(256, 512)
  // Gradiente de ceu frio - mais luminoso no centro
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#7b9098')
  g.addColorStop(0.22, '#4a616b')
  g.addColorStop(0.55, '#1e2d35')
  g.addColorStop(1, '#0a1015')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 512)
  // Halo central difuso - simula luz vinda de fora
  const luz = ctx.createRadialGradient(128, 180, 8, 128, 180, 160)
  luz.addColorStop(0, 'rgba(200,220,228,.52)')
  luz.addColorStop(0.4, 'rgba(160,190,205,.24)')
  luz.addColorStop(1, 'rgba(100,140,160,0)')
  ctx.fillStyle = luz
  ctx.fillRect(0, 0, 256, 512)
  // Segundo halo mais amplo e suave
  const halo2 = ctx.createRadialGradient(128, 130, 4, 128, 130, 220)
  halo2.addColorStop(0, 'rgba(180,205,215,.2)')
  halo2.addColorStop(1, 'rgba(100,140,160,0)')
  ctx.fillStyle = halo2
  ctx.fillRect(0, 0, 256, 512)
  // Sombra na base
  const sombra = ctx.createLinearGradient(0, 380, 0, 512)
  sombra.addColorStop(0, 'rgba(5,8,10,0)')
  sombra.addColorStop(1, 'rgba(3,5,8,.7)')
  ctx.fillStyle = sombra
  ctx.fillRect(0, 0, 256, 512)
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  return textura
}

function texturaTapete() {
  const { canvas, ctx } = criarCanvas(256, 512)
  ctx.fillStyle = '#49312c'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#765347'
  ctx.fillRect(12, 0, 5, canvas.height)
  ctx.fillRect(canvas.width - 17, 0, 5, canvas.height)
  ctx.strokeStyle = 'rgba(190,153,119,.42)'
  ctx.lineWidth = 2
  for (let y = 16; y < canvas.height; y += 24) {
    ctx.beginPath()
    ctx.moveTo(24, y)
    ctx.lineTo(canvas.width - 24, y)
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(190,153,119,.26)'
  for (let y = 32; y < canvas.height; y += 64) {
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2, y - 10)
    ctx.lineTo(canvas.width / 2 + 8, y)
    ctx.lineTo(canvas.width / 2, y + 10)
    ctx.lineTo(canvas.width / 2 - 8, y)
    ctx.closePath()
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function desenharRegistro(canvas: HTMLCanvasElement, indice: number, ativo: boolean) {
  const ctx = canvas.getContext('2d')!
  const L = canvas.width
  const A = canvas.height
  ctx.fillStyle = ativo ? '#28241e' : '#191a18'
  ctx.fillRect(0, 0, L, A)
  ctx.strokeStyle = ativo ? '#aa8a5d' : '#655a47'
  ctx.lineWidth = ativo ? 4 : 2
  ctx.strokeRect(8, 8, L - 16, A - 16)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = ativo ? '#c8ad7b' : '#a99572'
  ctx.font = '18px Georgia, serif'
  ctx.fillText(`REGISTRO  ${String(indice + 1).padStart(2, '0')} / 60`, 24, 38)
  ctx.fillStyle = '#e3ded2'
  const quebrarLinhas = (texto: string) => {
    const linhas: string[] = []
    let atual = ''
    for (const palavra of texto.split(' ')) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra
      if (ctx.measureText(tentativa).width > L - 48 && atual) {
        linhas.push(atual)
        atual = palavra
      } else atual = tentativa
    }
    if (atual) linhas.push(atual)
    return linhas
  }
  let fonteTitulo = 27
  ctx.font = `bold ${fonteTitulo}px Georgia, serif`
  let linhas = quebrarLinhas(lendas[indice].nome)
  while (linhas.length > 2 && fonteTitulo > 15) {
    fonteTitulo -= 2
    ctx.font = `bold ${fonteTitulo}px Georgia, serif`
    linhas = quebrarLinhas(lendas[indice].nome)
  }
  linhas.slice(0, 2).forEach((linha, i) => ctx.fillText(linha, 24, 78 + i * 31))
  ctx.strokeStyle = '#51483b'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, 158)
  ctx.lineTo(L - 24, 158)
  ctx.stroke()
  ctx.fillStyle = '#c0b9a9'
  let fonteOrigem = 17
  ctx.font = `${fonteOrigem}px Georgia, serif`
  let origem = quebrarLinhas(lendas[indice].origem)
  while (origem.length > 2 && fonteOrigem > 11) {
    fonteOrigem -= 1
    ctx.font = `${fonteOrigem}px Georgia, serif`
    origem = quebrarLinhas(lendas[indice].origem)
  }
  origem.slice(0, 2).forEach((linha, i) => ctx.fillText(linha, 24, 190 + i * 25))
}

function desenharRetrato(canvas: HTMLCanvasElement, semente: number) {
  const ctx = canvas.getContext('2d')!
  const rnd = gerador(semente + 1701)
  const w = canvas.width, h = canvas.height
  ctx.fillStyle = '#382f29'
  ctx.fillRect(0, 0, w, h)
  const fundo = ctx.createRadialGradient(w * .5, h * .38, 5, w * .5, h * .42, w * .7)
  fundo.addColorStop(0, '#92836c')
  fundo.addColorStop(1, '#252321')
  ctx.fillStyle = fundo
  ctx.fillRect(8, 8, w - 16, h - 16)

  const cx = w * (.46 + rnd() * .08)
  ctx.fillStyle = '#262321'
  ctx.beginPath()
  ctx.ellipse(cx, h * .92, w * .31, h * .42, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(cx - w * .3, h * .78, w * .6, h * .22)

  ctx.fillStyle = '#c0ad8e'
  ctx.beginPath()
  ctx.ellipse(cx, h * .43, w * .16, h * .25, (rnd() - .5) * .1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3e3329'
  ctx.beginPath()
  ctx.ellipse(cx, h * .31, w * .17, h * .14, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(cx - w * .17, h * .3, w * .035, h * .13)
  ctx.fillRect(cx + w * .135, h * .3, w * .035, h * .13)

  ctx.strokeStyle = '#211c18'
  ctx.lineWidth = Math.max(2, w * .016)
  const olhar = rnd() > .5 ? 1 : -1
  for (const eye of [-1, 1]) {
    const x = cx + eye * w * .065
    ctx.beginPath()
    ctx.moveTo(x - w * .025, h * .43)
    ctx.lineTo(x + w * .025, h * .43)
    ctx.stroke()
    ctx.fillStyle = '#201b18'
    ctx.fillRect(x + olhar * w * .012, h * .421, w * .012, h * .024)
  }
  ctx.beginPath()
  ctx.moveTo(cx - w * .035, h * .59)
  ctx.quadraticCurveTo(cx, h * .57, cx + w * .03, h * .6)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(22,18,15,.36)'
  ctx.lineWidth = 1
  for (let i = 0; i < 70; i++) {
    const x = rnd() * w
    const y = rnd() * h
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rnd() - .5) * 12, y + 5 + rnd() * 18)
    ctx.stroke()
  }
}

export default function World3D({ indiceAtivo, deslocamento, fase, reduzirMovimento, pausado, aoNavegar, aoAbrirDossie }: World3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const estado = useRef({ indice: indiceAtivo, deslocamento, fase, reduzir: reduzirMovimento, pausado, aoNavegar, aoAbrirDossie })

  useEffect(() => {
    estado.current = { indice: indiceAtivo, deslocamento, fase, reduzir: reduzirMovimento, pausado, aoNavegar, aoAbrirDossie }
  }, [indiceAtivo, deslocamento, fase, reduzirMovimento, pausado, aoNavegar, aoAbrirDossie])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const descartaveis: { dispose: () => void }[] = []
    const guardar = <T extends { dispose: () => void }>(item: T) => {
      descartaveis.push(item)
      return item
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x090e12)
    scene.fog = new THREE.FogExp2(0x101b20, 0.029)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 160)
    camera.position.set(0, 1.72, Z_VESTIBULO)
    camera.rotation.order = 'YXZ'

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    const limitePixelRatio = window.matchMedia('(max-width: 760px)').matches ? 1.2 : 1.6
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, limitePixelRatio))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    container.appendChild(renderer.domElement)

    const texParede = guardar(texturaPedra(11, true))
    const texPiso = guardar(texturaPiso())
    const texMadeira = guardar(texturaMadeira())
    const texJanela = guardar(texturaJanela())
    const texTapete = guardar(texturaTapete())
    const pedra = guardar(
      new THREE.MeshStandardMaterial({ map: texMadeira, color: 0x806d65, roughness: 0.88, metalness: 0.02 }),
    )
    const paredeMat = guardar(
      new THREE.MeshStandardMaterial({ map: texParede, bumpMap: texParede, bumpScale: 0.12, color: 0x8c9b98, roughness: 0.98, metalness: 0.0 }),
    )
    const tetoMat = guardar(new THREE.MeshStandardMaterial({ color: 0x353c3a, roughness: 0.96, metalness: 0 }))
    const pisoMat = guardar(new THREE.MeshStandardMaterial({ map: texPiso, color: 0x827c78, roughness: 0.83, metalness: 0.03 }))
    const tapeteMat = guardar(new THREE.MeshStandardMaterial({ map: texTapete, color: 0x815c5b, roughness: 0.98, metalness: 0.0 }))
    const ferro = guardar(new THREE.MeshStandardMaterial({ color: 0x49392a, roughness: 0.58, metalness: 0.42 }))
    const bronze = guardar(new THREE.MeshStandardMaterial({ color: 0x9a7445, roughness: 0.48, metalness: 0.66 }))
    const moldura = guardar(new THREE.MeshStandardMaterial({ map: texMadeira, color: 0x76513a, roughness: 0.76, metalness: 0.02 }))
    const sombraPorta = guardar(new THREE.MeshBasicMaterial({ color: 0x181512 }))
    const frestaMat = guardar(new THREE.MeshBasicMaterial({ color: 0x9eaaa9, transparent: true, fog: false }))
    scene.add(new THREE.AmbientLight(0x899da4, 0.85))
    scene.add(new THREE.HemisphereLight(0x839ca9, 0x241b1b, 0.72))
    const luzVermelha = new THREE.PointLight(0x74343d, 2.2, 14, 1.8)
    scene.add(luzVermelha)
    const luzFria = new THREE.PointLight(0x8baab9, 4.5, 27, 1.8)
    scene.add(luzFria)
    const luzPortal = new THREE.PointLight(0xe0b48a, 6, 18, 1.8)
    luzPortal.position.set(0, 2.2, Z_PORTAL - 2.2)
    scene.add(luzPortal)

    const comprimento = lendas.length * ESPACO + 70
    const centroZ = Z_VESTIBULO + 10 - comprimento / 2
    texPiso.repeat.set(2, comprimento / 2.4)
    const piso = new THREE.Mesh(guardar(new THREE.PlaneGeometry(LARGURA * 2 + 1, comprimento)), pisoMat)
    piso.rotation.x = -Math.PI / 2
    piso.position.set(0, 0, centroZ)
    scene.add(piso)

    texTapete.repeat.set(1, comprimento / 5.2)
    const tapete = new THREE.Mesh(guardar(new THREE.PlaneGeometry(2.15, comprimento)), tapeteMat)
    tapete.rotation.x = -Math.PI / 2
    tapete.position.set(0, 0.012, centroZ)
    scene.add(tapete)

    const teto = new THREE.Mesh(guardar(new THREE.PlaneGeometry(LARGURA * 2, comprimento)), tetoMat)
    teto.rotation.x = Math.PI / 2
    teto.position.set(0, 5.15, centroZ)
    scene.add(teto)

    // Portal de entrada
    const aPortal = 2.35
      const paredeLateralGeo = guardar(new THREE.BoxGeometry(3, 14, 1.1))
      const paredeSuperiorGeo = guardar(new THREE.BoxGeometry(aPortal * 2, 9.5, 1.1))
      const paredeEsquerda = new THREE.Mesh(paredeLateralGeo, pedra)
      paredeEsquerda.position.set(-(LARGURA + 0.7 + aPortal) / 2, 7, Z_PORTAL)
      const paredeDireita = new THREE.Mesh(paredeLateralGeo, pedra)
      paredeDireita.position.set((LARGURA + 0.7 + aPortal) / 2, 7, Z_PORTAL)
      const paredeAcima = new THREE.Mesh(paredeSuperiorGeo, pedra)
      paredeAcima.position.set(0, 9.25, Z_PORTAL)
      scene.add(paredeEsquerda, paredeDireita, paredeAcima)

      const madeiraPortal = guardar(new THREE.MeshStandardMaterial({
        map: texMadeira,
        color: 0x77736a,
        roughness: 0.94,
        metalness: 0.04,
      }))
      const travessaGeo = guardar(new THREE.BoxGeometry(aPortal * 2 + 0.62, 0.42, 0.38))
      const pilarEsquerdoGeo = guardar(new THREE.BoxGeometry(0.34, 5.2, 0.42))
      const pilarDireitoGeo = guardar(new THREE.BoxGeometry(0.62, 5.35, 0.48))
      const travessa = new THREE.Mesh(travessaGeo, madeiraPortal)
      travessa.position.set(-0.12, 5.03, Z_PORTAL - 0.35)
      const pilarEsquerdo = new THREE.Mesh(pilarEsquerdoGeo, madeiraPortal)
      pilarEsquerdo.position.set(-aPortal + 0.05, 2.58, Z_PORTAL - 0.35)
      const pilarDireito = new THREE.Mesh(pilarDireitoGeo, madeiraPortal)
      pilarDireito.position.set(aPortal - 0.1, 2.67, Z_PORTAL - 0.35)
      scene.add(travessa, pilarEsquerdo, pilarDireito)

      // fundoPortal removido: composicao visual mais limpa

      const fresta = new THREE.Mesh(guardar(new THREE.BoxGeometry(0.025, 4.35, 0.03)), frestaMat)
      fresta.position.set(0, 2.17, Z_PORTAL - 0.24)
      scene.add(fresta)

      const folhaGeo = guardar(new THREE.BoxGeometry(aPortal, 4.55, 0.14))
      const folhaEsquerda = new THREE.Group()
      folhaEsquerda.position.set(0, 0, Z_PORTAL - 0.5)
      const painelEsquerdo = new THREE.Mesh(folhaGeo, madeiraPortal)
      painelEsquerdo.position.set(-aPortal / 2, 2.28, 0)
      folhaEsquerda.add(painelEsquerdo)
      const folhaDireita = new THREE.Group()
      folhaDireita.position.set(0, 0, Z_PORTAL - 0.5)
      const painelDireito = new THREE.Mesh(folhaGeo, madeiraPortal)
      painelDireito.position.set(aPortal / 2, 2.28, 0)
      folhaDireita.add(painelDireito)
      const ripasGeo = guardar(new THREE.BoxGeometry(0.045, 4.35, 0.035))
      for (const lado of [-1, 1]) {
        const folha = lado < 0 ? folhaEsquerda : folhaDireita
        for (let ripa = 0; ripa < 7; ripa++) {
          const friso = new THREE.Mesh(ripasGeo, ferro)
          friso.position.set(lado * (0.18 + ripa * 0.31), 2.28, 0.085)
          folha.add(friso)
        }
      }
      scene.add(folhaEsquerda, folhaDireita)

    const portaFundoGeo = guardar(new THREE.BoxGeometry(1.46, 2.58, 0.05))
    const batenteLateralGeo = guardar(new THREE.BoxGeometry(0.13, 2.7, 0.16))
    const batenteTopoGeo = guardar(new THREE.BoxGeometry(1.66, 0.16, 0.17))
    const folhaInteriorGeo = guardar(new THREE.BoxGeometry(1.28, 2.42, 0.12))
    const painelGeo = guardar(new THREE.BoxGeometry(0.98, 0.72, 0.035))
    const frisoVerticalGeo = guardar(new THREE.BoxGeometry(0.035, 2.18, 0.025))
    const macanetaGeo = guardar(new THREE.SphereGeometry(0.065, 12, 8))
    const molduraRetratoGeo = guardar(new THREE.BoxGeometry(0.9, 1.2, 0.12))
    const retratoGeo = guardar(new THREE.PlaneGeometry(0.72, 1.02))
    const registroGeo = guardar(new THREE.PlaneGeometry(2.65, 1.34))
    const janelaGeo = guardar(new THREE.PlaneGeometry(1.35, 1.82))
    const caixilhoVerticalGeo = guardar(new THREE.BoxGeometry(0.07, 1.92, 0.1))
    const caixilhoHorizontalGeo = guardar(new THREE.BoxGeometry(1.42, 0.07, 0.1))
    const plafonGeo = guardar(new THREE.SphereGeometry(0.19, 14, 10))
    const correnteLuzGeo = guardar(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8))
    const larguraParede = (ESPACO - 1.66) / 2
    const paredeAbaixoPortaGeo = guardar(new THREE.PlaneGeometry(larguraParede, 2.7))
    const paredeAcimaPortaGeo = guardar(new THREE.PlaneGeometry(ESPACO, 2.5))
    const rodapeModuloGeo = guardar(new THREE.BoxGeometry(ESPACO, 0.2, 0.12))
    const sancaModuloGeo = guardar(new THREE.BoxGeometry(ESPACO, 0.17, 0.18))
    const pisoSalaGeo = guardar(new THREE.BoxGeometry(1.55, 0.08, 3.2))
    const fundoSalaGeo = guardar(new THREE.PlaneGeometry(1.5, 2.6))
    const ladoSalaGeo = guardar(new THREE.BoxGeometry(0.07, 2.6, 3.2))
    const camaBaseGeo = guardar(new THREE.BoxGeometry(1.18, 0.32, 1.35))
    const colchaoGeo = guardar(new THREE.BoxGeometry(1.08, 0.2, 1.25))
    const cabeceiraGeo = guardar(new THREE.BoxGeometry(1.22, 0.9, 0.12))
    const travesseiroGeo = guardar(new THREE.BoxGeometry(0.72, 0.16, 0.32))
    const mesaQuartoGeo = guardar(new THREE.BoxGeometry(0.38, 0.55, 0.38))
    const banheiraGeo = guardar(new THREE.BoxGeometry(1.2, 0.54, 0.76))
    const piaGeo = guardar(new THREE.BoxGeometry(0.56, 0.68, 0.46))
    const espelhoGeo = guardar(new THREE.PlaneGeometry(0.58, 0.88))
    const registroMaterial = () => guardar(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    const retratoMaterial = () => guardar(new THREE.MeshStandardMaterial({ roughness: 0.96, side: THREE.DoubleSide }))
    const janelaFria = guardar(new THREE.MeshBasicMaterial({ map: texJanela, color: 0xb9d3dd, side: THREE.DoubleSide }))
    const quartoParedeMat = guardar(new THREE.MeshStandardMaterial({ color: 0x77705e, roughness: 0.98, side: THREE.DoubleSide }))
    const quartoPisoMat = guardar(new THREE.MeshStandardMaterial({ color: 0x513a2b, roughness: 0.92 }))
    const colchaMat = guardar(new THREE.MeshStandardMaterial({ color: 0x59645f, roughness: 0.98 }))
    const linhoMat = guardar(new THREE.MeshStandardMaterial({ color: 0xc3b69f, roughness: 1 }))
    const azulejoMat = guardar(new THREE.MeshStandardMaterial({ color: 0x687a79, roughness: 0.86, side: THREE.DoubleSide }))
    const banheiraMat = guardar(new THREE.MeshStandardMaterial({ color: 0xa59f8b, roughness: 0.52, metalness: 0.04 }))

    type Segmento = {
      grupo: THREE.Group
      paredes: THREE.Group
      indice: number
      porta: THREE.Group
      cartao: THREE.Mesh
      fundo: THREE.Mesh
      folha: THREE.Group
      retrato: THREE.Group
      janela: THREE.Group
      quarto: THREE.Group
      banheiro: THREE.Group
      retratoCanvas: HTMLCanvasElement
      retratoTextura: THREE.CanvasTexture
      registroCanvas: HTMLCanvasElement
      registroTextura: THREE.CanvasTexture
      registroAtivo: boolean
      luz: THREE.PointLight
      angulo: number
      abertoManual: boolean
      ladoPorta: number
    }

    const criarSegmento = (): Segmento => {
      const grupo = new THREE.Group()
      const paredes = new THREE.Group()
      grupo.add(paredes)
      for (const lado of [-1, 1]) {
        const parede = new THREE.Group()
        parede.position.x = lado * LARGURA
        parede.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2
        for (const deslocamento of [-1, 1]) {
          const painel = new THREE.Mesh(paredeAbaixoPortaGeo, paredeMat)
          painel.position.set(deslocamento * (0.83 + larguraParede / 2), 1.35, 0)
          parede.add(painel)
        }
        const painelSuperior = new THREE.Mesh(paredeAcimaPortaGeo, paredeMat)
        painelSuperior.position.set(0, 3.95, 0)
        parede.add(painelSuperior)
        const rodape = new THREE.Mesh(rodapeModuloGeo, moldura)
        rodape.position.set(0, 0.14, 0.04)
        const sanca = new THREE.Mesh(sancaModuloGeo, moldura)
        sanca.position.set(0, 5.02, 0.05)
        parede.add(rodape, sanca)
        paredes.add(parede)
      }

      const porta = new THREE.Group()
      grupo.add(porta)
      const fundo = new THREE.Mesh(portaFundoGeo, sombraPorta)
      fundo.position.set(0, 1.3, 0)
      porta.add(fundo)
      const batenteEsquerdo = new THREE.Mesh(batenteLateralGeo, moldura)
      batenteEsquerdo.position.set(-0.83, 1.36, 0.03)
      const batenteDireito = batenteEsquerdo.clone()
      batenteDireito.position.x = 0.83
      const batenteSuperior = new THREE.Mesh(batenteTopoGeo, moldura)
      batenteSuperior.position.set(0, 2.66, 0.03)
      porta.add(batenteEsquerdo, batenteDireito, batenteSuperior)

      const folha = new THREE.Group()
      folha.position.set(-0.64, 0.05, 0.06)
      porta.add(folha)
      const painelPorta = new THREE.Mesh(folhaInteriorGeo, pedra)
      painelPorta.position.set(0.64, 1.21, 0)
      folha.add(painelPorta)
      const painelSuperior = new THREE.Mesh(painelGeo, moldura)
      painelSuperior.position.set(0.64, 1.68, 0.077)
      const painelInferior = new THREE.Mesh(painelGeo, moldura)
      painelInferior.position.set(0.64, 0.65, 0.077)
      const friso = new THREE.Mesh(frisoVerticalGeo, ferro)
      friso.position.set(0.64, 1.21, 0.079)
      const macaneta = new THREE.Mesh(macanetaGeo, bronze)
      macaneta.position.set(1.1, 1.18, 0.12)
      folha.add(painelSuperior, painelInferior, friso, macaneta)

      const registroCanvas = criarCanvas(512, 256).canvas
      const registroTextura = guardar(new THREE.CanvasTexture(registroCanvas))
      registroTextura.colorSpace = THREE.SRGBColorSpace
      const papelMaterial = registroMaterial()
      papelMaterial.map = registroTextura
          const cartao = new THREE.Mesh(registroGeo, papelMaterial)

cartao.position.set(0, 2.2, 1.65)

grupo.add(cartao)

      const quarto = new THREE.Group()
      quarto.position.z = -0.02
      const quartoFundo = new THREE.Mesh(fundoSalaGeo, quartoParedeMat)
      quartoFundo.position.set(0, 1.32, -3.2)
      const quartoPiso = new THREE.Mesh(pisoSalaGeo, quartoPisoMat)
      quartoPiso.position.set(0, 0, -1.62)
      const quartoLadoA = new THREE.Mesh(ladoSalaGeo, quartoParedeMat)
      quartoLadoA.position.set(-0.74, 1.3, -1.62)
      const quartoLadoB = quartoLadoA.clone()
      quartoLadoB.position.x = 0.74
      const camaBase = new THREE.Mesh(camaBaseGeo, moldura)
      camaBase.position.set(0, 0.25, -1.5)
      const colchao = new THREE.Mesh(colchaoGeo, colchaMat)
      colchao.position.set(0, 0.5, -1.48)
      const cabeceira = new THREE.Mesh(cabeceiraGeo, moldura)
      cabeceira.position.set(0, 0.72, -2.13)
      const travesseiro = new THREE.Mesh(travesseiroGeo, linhoMat)
      travesseiro.position.set(0, 0.62, -1.94)
      const mesaQuarto = new THREE.Mesh(mesaQuartoGeo, moldura)
      mesaQuarto.position.set(-0.5, 0.28, -2.46)
      const luzQuarto = new THREE.PointLight(0xffc29a, 2.4, 6, 2)
      luzQuarto.position.set(0, 2.4, -1.35)
      quarto.add(quartoFundo, quartoPiso, quartoLadoA, quartoLadoB, camaBase, colchao, cabeceira, travesseiro, mesaQuarto, luzQuarto)

      const banheiro = new THREE.Group()
      banheiro.position.z = -0.02
      const banheiroFundo = new THREE.Mesh(fundoSalaGeo, azulejoMat)
      banheiroFundo.position.set(0, 1.32, -3.2)
      const banheiroPiso = new THREE.Mesh(pisoSalaGeo, azulejoMat)
      banheiroPiso.position.set(0, 0, -1.62)
      const banheiroLadoA = new THREE.Mesh(ladoSalaGeo, azulejoMat)
      banheiroLadoA.position.set(-0.74, 1.3, -1.62)
      const banheiroLadoB = banheiroLadoA.clone()
      banheiroLadoB.position.x = 0.74
      const banheira = new THREE.Mesh(banheiraGeo, banheiraMat)
      banheira.position.set(0, 0.3, -0.82)
      const pia = new THREE.Mesh(piaGeo, banheiraMat)
      pia.position.set(0.4, 0.36, -2.15)
      const espelho = new THREE.Mesh(espelhoGeo, janelaFria)
      espelho.position.set(0.4, 1.7, -3.13)
      const luzBanheiro = new THREE.PointLight(0x9acbd3, 2.6, 6, 2)
      luzBanheiro.position.set(0, 2.4, -1.35)
      banheiro.add(banheiroFundo, banheiroPiso, banheiroLadoA, banheiroLadoB, banheira, pia, espelho, luzBanheiro)
      porta.add(quarto, banheiro)
      quarto.visible = false
      banheiro.visible = false

      const retrato = new THREE.Group()
      const fundoRetrato = new THREE.Mesh(molduraRetratoGeo, moldura)
      fundoRetrato.position.z = 0
      retrato.add(fundoRetrato)
      const retratoCanvas = criarCanvas(256, 384).canvas
      const retratoTextura = guardar(new THREE.CanvasTexture(retratoCanvas))
      retratoTextura.colorSpace = THREE.SRGBColorSpace
      const imagemRetrato = new THREE.Mesh(retratoGeo, retratoMaterial())
      imagemRetrato.position.z = 0.066
      retrato.add(imagemRetrato)

      const janela = new THREE.Group()
      const vidro = new THREE.Mesh(janelaGeo, janelaFria)
      vidro.position.set(0, 2.65, 0)
      janela.add(vidro)
      const vertical = new THREE.Mesh(caixilhoVerticalGeo, moldura)
      vertical.position.set(0, 2.65, 0.04)
      const horizontal = new THREE.Mesh(caixilhoHorizontalGeo, moldura)
      horizontal.position.set(0, 2.65, 0.04)
      const topoJanela = new THREE.Mesh(caixilhoHorizontalGeo, moldura)
      topoJanela.position.set(0, 3.58, 0.04)
      const baseJanela = new THREE.Mesh(caixilhoHorizontalGeo, moldura)
      baseJanela.position.set(0, 1.72, 0.04)
      janela.add(vertical, horizontal, topoJanela, baseJanela)
      grupo.add(retrato, janela)
      janela.visible = false

      const pino = new THREE.Mesh(correnteLuzGeo, bronze)
      pino.position.set(0, 4.91, 0)
      grupo.add(pino)
      const lampada = new THREE.Mesh(plafonGeo, guardar(new THREE.MeshStandardMaterial({
        color: 0xd7b477,
        emissive: 0xc98d49,
        emissiveIntensity: 0.48,
        roughness: 0.56,
      })))
      lampada.position.set(0, 4.7, 0)
      lampada.scale.set(1.45, 0.65, 1.2)
      grupo.add(lampada)
      const luz = new THREE.PointLight(0xf4b785, 1.25, 9, 2)
      luz.position.set(0, 4.45, 0)
      grupo.add(luz)

      scene.add(grupo)
      return {
        grupo, paredes, indice: -2, porta, cartao, fundo, folha, retrato, janela, quarto, banheiro, retratoCanvas, retratoTextura,
        registroCanvas, registroTextura, registroAtivo: false, luz, angulo: 0, abertoManual: false, ladoPorta: 1,
      }
    }

    const segmentos = Array.from({ length: 11 }, criarSegmento)
    const atribuirSegmento = (segmento: Segmento, indice: number) => {
      if (segmento.indice === indice) return
      segmento.indice = indice
      segmento.abertoManual = false
      segmento.angulo = 0
      segmento.registroAtivo = false
      segmento.grupo.visible = true
      segmento.grupo.position.z = zRegistro(indice)
      const lado = indice % 2 === 0 ? 1 : -1
      segmento.ladoPorta = lado
      segmento.porta.position.set(lado * (LARGURA - 0.02), 0, 0)
      segmento.porta.rotation.y = lado === -1 ? Math.PI / 2 : -Math.PI / 2
      segmento.cartao.position.set(lado * 1.58, 2.2, 1.65)
      segmento.cartao.rotation.y = -lado * 0.08
      segmento.cartao.visible = indice >= 0 && indice < lendas.length
      const ladoOposto = -lado
      segmento.retrato.position.set(ladoOposto * (LARGURA - 0.02), 2.55, 0.2)
      segmento.retrato.rotation.y = ladoOposto === -1 ? Math.PI / 2 : -Math.PI / 2
      segmento.janela.position.set(ladoOposto * (LARGURA - 0.02), 0, -1.9)
      segmento.janela.rotation.y = ladoOposto === -1 ? Math.PI / 2 : -Math.PI / 2
      segmento.janela.visible = indice % 6 === 3
      segmento.retrato.visible = false
      if (segmento.retrato.visible) {
        desenharRetrato(segmento.retratoCanvas, indice)
        desenharRegistro(segmento.registroCanvas, indice, false)
        segmento.retratoTextura.needsUpdate = true
        segmento.registroTextura.needsUpdate = true
      }
      segmento.quarto.visible = false
      segmento.banheiro.visible = false
      segmento.luz.intensity = indice >= 0 && indice < lendas.length ? 1.25 : 0
    }

    const queryAtmosfera = new URLSearchParams(window.location.search)
    const apresentacao = queryAtmosfera.get('apresentacao') === '1'
    const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches
    const perfilAtmosfera = mobile ? 'mobile' : apresentacao ? 'apresentacao' : 'desktop'
    const atmosfera = guardar(criarAtmosfera(scene, camera, perfilAtmosfera))
    // Meios-tons para projeção; a exposição habitual permanece preservada.
    if (apresentacao) renderer.toneMappingExposure = 1.32
    const demonstracao = apresentacao && queryAtmosfera.get('demonstracao') === '1'
    const catalogo = criarCatalogo(lendas, demonstracao)
    const assombracoes = guardar(criarMundoAssombrado(scene,camera,atmosfera,perfilAtmosfera==='mobile',apresentacao))
    const diretor = guardar(criarDiretor(catalogo,assombracoes))
    const perguntaTeste = import.meta.env.DEV ? queryAtmosfera.get('assombracao') : null
    const filaTeste = perguntaTeste === 'todos' ? catalogo.map(e=>e.id) : perguntaTeste ? [perguntaTeste] : []
    let passoTeste=0, proximoTesteEm=0, congelarInspecao=false, indiceDemoAnterior=-1
    let demonstracaoCompleta=false, inspecionado:string|null=null
    const diagnostico = () => ({ ...atmosfera.stats,fase:estado.current.fase,cameraZ:camera.position.z,orientacao:{yaw:camera.rotation.y,pitch:camera.rotation.x},aparicao:diretor.ativo?.evento.entidade??null,
      tempoAparicao:diretor.ativo?.decorrido??0,...assombracoes.inspecionar(),...atmosfera.inspecionar(),chamadas:renderer.info.render.calls,
      diretor:diretor.inspecionar(),catalogo,demonstracaoCompleta,
      cenario:{modulos:segmentos.length,registrosVisiveis:segmentos.filter(s=>s.grupo.visible).map(s=>s.indice),
        portasAbertas:segmentos.filter(s=>Math.abs(s.angulo)>.25).map(s=>s.indice),
        cartoes:segmentos.filter(s=>s.grupo.visible&&s.indice>=0&&s.indice<lendas.length).map(s=>{const p=s.cartao.getWorldPosition(new THREE.Vector3()).project(camera);return {indice:s.indice,x:p.x,y:p.y,z:p.z,ativo:s.indice===estado.current.indice}}),
        salasVisiveis:segmentos.filter(s=>s.quarto.visible||s.banheiro.visible).map(s=>s.indice)} })
    const forcarEvento=(id:string,duracao?:number)=>{
      const e=catalogo.find(e=>e.id===id||e.entidade===id)
      if(!e)return false
      return diretor.forcar(e.id,duracao)
    }
    const localizarEvento=(id:string)=>{const e=catalogo.find(e=>e.id===id);if(e){diretor.cancelar();estado.current.aoNavegar?.(e.indice)}}
    const depuracao = window as Window & { __bauAtmosfera?: { inspecionar:typeof diagnostico;pausar?:(valor:boolean)=>void }; __bauAssombracoes?: { inspecionar:typeof diagnostico;disparar:typeof forcarEvento;localizar:typeof localizarEvento;pausar:(v:boolean)=>void;resetar:()=>void;inspecionarObjeto:(id:string)=>void } }
    if(queryAtmosfera.get('atmosferaDebug')==='1')depuracao.__bauAtmosfera={inspecionar:diagnostico,...(import.meta.env.DEV?{pausar:(v:boolean)=>{congelarInspecao=v}}:{})}
    if(import.meta.env.DEV)depuracao.__bauAssombracoes={inspecionar:diagnostico,disparar:forcarEvento,localizar:localizarEvento,pausar:(v:boolean)=>{congelarInspecao=v},resetar:()=>{diretor.resetar();demonstracaoCompleta=false;indiceDemoAnterior=-1},inspecionarObjeto:(id:string)=>{inspecionado=id}}
    const raycaster=new THREE.Raycaster(),pontoClique=new THREE.Vector2()
    const aoInspecionar=(e:PointerEvent)=>{
      if(e.button!==0||e.target!==renderer.domElement||estado.current.pausado||estado.current.fase!=='travessia')return
      const r=renderer.domElement.getBoundingClientRect()
      pontoClique.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1)
      raycaster.setFromCamera(pontoClique,camera)
      const cartaoClicado=raycaster.intersectObjects(segmentos.filter(s=>s.grupo.visible).map(s=>s.cartao),true)[0]?.object
      const segmentoCartao=cartaoClicado&&segmentos.find(s=>s.cartao.getObjectById(cartaoClicado.id))
      if(segmentoCartao) {
        estado.current.aoAbrirDossie?.(segmentoCartao.indice)
        return
      }
      const folhaClicada=raycaster.intersectObjects(segmentos.filter(s=>s.grupo.visible).map(s=>s.folha),true)[0]?.object
      if(folhaClicada) {
        const segmento=segmentos.find(s=>s.folha.getObjectById(folhaClicada.id))
        if(segmento) {
          segmento.abertoManual=!segmento.abertoManual
          return
        }
      }
      inspecionado=assombracoes.clicar(raycaster)
    }
    // O canvas fica sob os textos; receber o clique na janela preserva inspe??o no espa?o.
    window.addEventListener('pointerup',aoInspecionar)

    const ajustar = () => {
      const largura = container.clientWidth || 1
      const altura = container.clientHeight || 1
      camera.aspect = largura / altura
      camera.fov = largura / altura < 0.8 ? 74 : 62
      camera.updateProjectionMatrix()
      renderer.setSize(largura, altura)
      atmosfera.redimensionar(altura, renderer.getPixelRatio())
    }
    ajustar()
    window.addEventListener('resize', ajustar)

    // Olhar absoluto: o cursor controla a direção sem clique ou arrasto.
    let alvoGuinada=0, alvoInclinacao=0
    const limitar=(valor:number,minimo:number,maximo:number)=>Math.max(minimo,Math.min(maximo,valor))
    const orientacaoPonteiro=(clientX:number,clientY:number)=>{
      // Usar a janela evita travamentos quando o cursor passa pelos textos
      // e pelos cards sobrepostos ao canvas.
      const x=limitar(clientX/window.innerWidth*2-1,-1,1)
      const y=limitar(clientY/window.innerHeight*2-1,-1,1)
      return {yaw:-x*1.12,pitch:-y*.43}
    }
    const aoMover = (e: PointerEvent) => {
      if(e.pointerType!=='mouse'||estado.current.pausado||estado.current.fase!=='travessia')return
      const base=orientacaoPonteiro(e.clientX,e.clientY)
      alvoGuinada=base.yaw
      alvoInclinacao=base.pitch
    }
    window.addEventListener('pointermove', aoMover)

    const clock = new THREE.Clock()
    let tempo = 0
    let anguloPorta = 0
    let primeiroQuadro = true
    renderer.setAnimationLoop(() => {
      const tempoQuadro = clock.getDelta()
      const delta = Math.min(tempoQuadro, 0.05)
      // A coleção cobre a cena. Libere a GPU para o papel, mantendo posição e recursos.
      if ((estado.current.pausado || document.hidden || (import.meta.env.DEV && congelarInspecao)) && !primeiroQuadro) return
      primeiroQuadro = false
      const { indice, deslocamento, fase: faseAtual, reduzir } = estado.current
      tempo += delta

      const entrando = faseAtual === 'travessia'
      anguloPorta = THREE.MathUtils.damp(anguloPorta, entrando ? 1 : 0, reduzir ? 6 : 1.9, delta)
      folhaEsquerda.position.x = -anguloPorta * 2.45
      folhaDireita.position.x = anguloPorta * 2.45
      frestaMat.opacity = THREE.MathUtils.clamp(0.36 + Math.sin(tempo * 1.4) * 0.08 - anguloPorta * 0.4, 0, 0.48)

      if(!entrando) {
        if(diretor.ativo)diretor.cancelar()
      } else {
        if(demonstracao&&!demonstracaoCompleta) {
          const estados= diretor.inspecionar().estados
          const passo=SEQUENCIA_APRESENTACAO.findIndex(id=>!['concluido','erro'].includes(estados.find(e=>e.id===id)?.estado??''))
          if(passo===-1)demonstracaoCompleta=true
          else if(indiceDemoAnterior!==passo&&queryAtmosfera.get('autonomo')!=='0'){estado.current.aoNavegar?.(passo);indiceDemoAnterior=passo}
        }
        if(filaTeste[passoTeste]&&!diretor.ativo&&camera.position.z<0&&tempo>=proximoTesteEm) {
          diretor.forcar(filaTeste[passoTeste++]);proximoTesteEm=tempo+10
        }
        diretor.atualizar({delta,cameraZ:camera.position.z,indice,velocidade:atmosfera.stats.velocidade,habilitado:!filaTeste.length||!!diretor.ativo,
          atencao:assombracoes.observar,inspecionado})
        inspecionado=null
        if(filaTeste.length&&!diretor.ativo)proximoTesteEm=Math.min(proximoTesteEm,tempo+2)
      }
      assombracoes.quadro(delta,catalogo)

      // Na entrada: camera avanca levemente como se fosse puxada para o portal
      const alvoZ = entrando ? zCamera(deslocamento) : Z_VESTIBULO
      const cruzando = entrando && camera.position.z > -1.8
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        alvoZ,
        cruzando && !reduzir ? 0.68 : reduzir ? 3.2 : 2.1,
        delta,
      )

      camera.position.x = 0
      camera.position.y = 1.72
      camera.rotation.y = THREE.MathUtils.damp(camera.rotation.y, alvoGuinada, 7, delta)
      camera.rotation.x = THREE.MathUtils.damp(camera.rotation.x, alvoInclinacao, 7, delta)

      const cz = camera.position.z
      const intensidadeBase = diretor.ativo ? 3.2 : 1.4
      luzVermelha.position.set(0, 3.2, cz - 3.5)
      luzVermelha.intensity = intensidadeBase + (reduzir ? 0 : Math.max(0, Math.sin(tempo * 9.1)) * 0.7)
      luzFria.position.set(0, 4.2, cz - 12)
      luzFria.intensity = 4.2 + Math.sin(tempo * 0.23) * 0.45
      luzPortal.intensity = (1 - THREE.MathUtils.clamp((cz - 2) / -4, 0, 1)) * 8 + 4

      const registroCentral = Math.round((-cz - 2.5) / ESPACO)
      const indicePortaEvento = diretor.ativo?.evento.entidade === 'porta'
        ? diretor.ativo.forçado ? registroCentral : diretor.ativo.evento.indice
        : -1
      segmentos.forEach((segmento, posicao) => {
        const indice = registroCentral - 5 + posicao
        atribuirSegmento(segmento, indice)
        if (segmento.indice < 0 || !segmento.grupo.visible) return
        const distancia = Math.abs(zRegistro(segmento.indice) - cz)
        const eventoPorta = segmento.indice === indicePortaEvento
        const portaDeAproximacao = segmento.indice % 13 === 7 && distancia < 6.6
        const portaQueFecha = segmento.indice % 13 === 8 && cz < zRegistro(segmento.indice) - 0.8
        const abrir = segmento.abertoManual || eventoPorta || portaDeAproximacao
        const amortecimento = portaQueFecha && !abrir ? 8 : reduzir ? 5 : 1.8
        segmento.angulo = THREE.MathUtils.damp(segmento.angulo, abrir ? (segmento.ladoPorta > 0 ? -1.08 : 1.08) : 0, amortecimento, delta)
        segmento.folha.rotation.y = segmento.angulo
        const salaAberta = Math.abs(segmento.angulo) > 0.34
        segmento.quarto.visible = salaAberta && segmento.indice === 7
        segmento.banheiro.visible = salaAberta && segmento.indice === 20
        segmento.fundo.visible = !segmento.quarto.visible && !segmento.banheiro.visible
        const registroAtivo=segmento.indice===estado.current.indice
        if(segmento.registroAtivo!==registroAtivo) {
          segmento.registroAtivo=registroAtivo
          desenharRegistro(segmento.registroCanvas,segmento.indice,registroAtivo)
          segmento.registroTextura.needsUpdate=true
        }
        const acender = THREE.MathUtils.clamp(1 - distancia / 24, 0, 1)
        const vacilo = diretor.ativo?.evento.entidade === 'lampada' && segmento.indice === diretor.ativo.evento.indice && !reduzir
          ? 0.35 + Math.max(0, Math.sin(tempo * 24)) * 0.65
          : 1
        segmento.luz.intensity = acender * 1.55 * vacilo
      })

      atmosfera.atualizar(delta, reduzir, tempoQuadro)

      renderer.render(scene, camera)
    })

    return () => {
      renderer.setAnimationLoop(null)
      if (depuracao.__bauAtmosfera?.inspecionar === diagnostico) delete depuracao.__bauAtmosfera
      window.removeEventListener('pointerup',aoInspecionar)
      if(depuracao.__bauAssombracoes?.inspecionar===diagnostico)delete depuracao.__bauAssombracoes
      window.removeEventListener('resize', ajustar)
      window.removeEventListener('pointermove', aoMover)
      descartaveis.reverse().forEach(item => item.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="world3d" aria-hidden="true" />
}
