import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { api, ApiError } from '../public/api.js'
import { legendImages } from '../public/legend-images.js'

test('cliente usa cookie, proteção CSRF e preserva a chave no erro de rede', async () => {
  const original = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    if (calls.length === 1) throw Error('offline')
    return new Response(JSON.stringify({ id: 'draw-1' }), { headers: { 'Content-Type': 'application/json' } })
  }
  try {
    const options = { method: 'POST', headers: { 'Idempotency-Key': 'same-opening' } }
    await assert.rejects(api('/draws', options), error => error instanceof ApiError && error.status === 0)
    assert.deepEqual(await api('/draws', options), { id: 'draw-1' })
    for (const call of calls) {
      assert.equal(call.url, '/api/draws')
      assert.equal(call.options.credentials, 'include')
      assert.equal(call.options.headers['X-Bau-Request'], '1')
      assert.equal(call.options.headers['Idempotency-Key'], 'same-opening')
    }
  } finally { globalThis.fetch = original }
})

test('cliente trata API indisponível e sessão expirada sem inventar resultado', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('<html>offline</html>', { status: 502 })
    await assert.rejects(api('/album'), error => error.status === 502)
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Entre na conta.' }), { status: 401 })
    await assert.rejects(api('/album'), error => error.status === 401 && error.message === 'Entre na conta.')
  } finally { globalThis.fetch = original }
})

async function prepareRa({ pending = false, complete = false } = {}) {
  const elements = new Map()
  function element() {
    return { handlers: {}, style: { setProperty() {} }, classList: { add() {}, remove() {} },
      addEventListener(event, handler) { this.handlers[event] = handler }, append() {}, focus() {}, querySelectorAll() { return [] },
      getContext() { return { clearRect() {}, createLinearGradient() { return { addColorStop() {} } },
        fillRect() {}, strokeRect() {}, fillText() {}, measureText() { return { width: 10 } } } } }
  }
  const document = { querySelector(selector) {
    if (!elements.has(selector)) elements.set(selector, element())
    return elements.get(selector)
  }, createElement: element }
  const objects = []
  class Object3D {
    constructor() {
      objects.push(this)
      this.position = { set(x, y, z) { this.x = x; this.y = y; this.z = z } }; this.rotation = { x: 0 }; this.scale = { setScalar() {} }
    }
    add() {}
  }
  const THREE = {
    Group: Object3D, Mesh: Object3D, AmbientLight: Object3D, DirectionalLight: Object3D,
    PointLight: Object3D, MeshStandardMaterial: Object3D, BoxGeometry: Object3D,
    CanvasTexture: Object3D, PlaneGeometry: Object3D, MeshBasicMaterial: Object3D,
    MathUtils: { lerp: (a, b, t) => a + (b - a) * t },
  }
  let mindar
  class MindARThree {
    constructor() {
      mindar = this
      this.scene = new Object3D(); this.camera = {}
      this.anchor = { group: new Object3D() }
      this.renderer = { setAnimationLoop: fn => { this.animate = fn }, render() {} }
    }
    addAnchor() { return this.anchor }
    async start() {}
  }
  const calls = []
  let fail = true, clock = 0
  const storage = new Map(pending ? [['bau-pending-draw:user-1', 'pending-opening']] : [])
  const context = vm.createContext({ document, THREE, QRTrackerThree: MindARThree, console, crypto, legendImages,
    window: { addEventListener() {}, location: { reload() {} } },
    performance: { now: () => clock }, innerWidth: 800, innerHeight: 600,
    sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    api: async (path, options) => {
      calls.push({ path, options })
      if (path === '/auth/me') return { id: 'user-1' }
      if (path === '/album/progress') return { total: 60, obtained: complete ? 60 : 0, complete }
      if (fail) { fail = false; throw new ApiError('offline', 0) }
      return { legend: { id: 'real-server-card', numero: 1, nome: 'Carta do servidor' },
        progress: { obtained: complete ? 60 : 1, complete } }
    },
  })
  const source = (await readFile(new URL('../public/ra.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '')
  vm.runInContext(source.replace('startExperience().catch', 'globalThis.ready = startExperience().catch'), context)
  await context.ready
  return { elements, calls, mindar, storage, objects, setTime: value => { clock = value } }
}

test('RA sorteia só no toque, reutiliza chave no retry e cria outra após escanear novamente', async () => {
  const { elements: e, calls, mindar, objects, setTime } = await prepareRa()
  const click = id => e.get(id).handlers.click()
  await click('#start')
  mindar.anchor.onTargetFound()
  assert.equal(calls.filter(c => c.path === '/draws').length, 0)
  await click('#openChest') // falha de rede
  await click('#openChest') // recupera a mesma abertura
  let draws = calls.filter(c => c.path === '/draws')
  const first = draws[0].options.headers['Idempotency-Key']
  assert.equal(draws[1].options.headers['Idempotency-Key'], first)
  setTime(500); mindar.animate()
  const hinge = objects.find(object => object.position.y === .16 && object.position.z === -.205)
  assert.ok(hinge.rotation.x < 0 && hinge.rotation.x > -1.65, 'Tampa abre durante a animação')
  assert.ok(objects.some(object => object.visible && object.position.y > .05 && object.position.z > .22), 'Carta emerge do baú')
  mindar.anchor.onTargetLost(); setTime(2000); mindar.animate()
  assert.match(e.get('#faceA').innerHTML, /Carta do servidor/)
  assert.equal(e.get('#rewardOverlay').hidden, false)
  await click('#flipButton')
  assert.match(e.get('#flipLabel').textContent, /FACE 2 DE 3/)
  await click('#flipButton')
  assert.match(e.get('#flipLabel').textContent, /FACE 3 DE 3/)
  await click('#rescanButton')
  mindar.anchor.onTargetFound()
  await click('#openChest')
  draws = calls.filter(c => c.path === '/draws')
  assert.notEqual(draws[2].options.headers['Idempotency-Key'], first)
})

test('RA recupera abertura pendente mesmo se a última carta já completou 60/60', async () => {
  const { elements: e, calls, mindar } = await prepareRa({ pending: true, complete: true })
  await e.get('#start').handlers.click(); mindar.anchor.onTargetFound()
  assert.equal(e.get('#openChest').hidden, false)
  await e.get('#openChest').handlers.click()
  await e.get('#openChest').handlers.click()
  assert.equal(calls.filter(c => c.path === '/draws')[1].options.headers['Idempotency-Key'], 'pending-opening')
})
