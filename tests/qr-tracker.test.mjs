import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import * as Three from 'three'
import { estimateQrPose, isRitualQr } from '../public/qr-pose.js'

async function trackerFixture({ secure = true, denied = false } = {}) {
  let decoded = null, stopped = 0, requests = 0
  const video = { videoWidth: 1280, videoHeight: 720, readyState: 2, setAttribute() {},
    async play() {}, pause() {} }
  class Renderer {
    setPixelRatio() {} setClearColor() {} setSize() {} setAnimationLoop() {} dispose() {}
  }
  const context = { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }) }
  const document = { hidden: false, addEventListener() {}, removeEventListener() {},
    createElement: type => type === 'video' ? video : { getContext: () => context } }
  const sandbox = vm.createContext({ THREE: { ...Three, WebGLRenderer: Renderer }, estimateQrPose, isRitualQr,
    document, devicePixelRatio: 1, requestAnimationFrame() { return 1 }, cancelAnimationFrame() {},
    window: { isSecureContext: secure, location: { origin: 'http://localhost:5175' }, addEventListener() {}, removeEventListener() {} },
    navigator: { mediaDevices: { async getUserMedia() {
      requests++
      if (denied) { const error = new Error('negada'); error.name = 'NotAllowedError'; throw error }
      return { getTracks: () => [{ stop() { stopped++ } }] }
    } } },
  })
  const source = (await readFile('public/qr-tracker.js', 'utf8')).replace(/^import .*;\r?\n/gm, '').replace('export class', 'class')
  vm.runInContext(`${source}\nglobalThis.Tracker = QRTrackerThree`, sandbox)
  const tracker = new sandbox.Tracker({ container: { append() {}, replaceChildren() {}, getBoundingClientRect: () => ({ width: 390, height: 844 }) }, decoder: () => decoded })
  return { tracker, video, document, counts: () => ({ stopped, requests }),
    qr(value) { decoded = value ? { data: value, location: {
      topLeftCorner: { x: 235, y: 95 }, topRightCorner: { x: 485, y: 95 },
      bottomRightCorner: { x: 485, y: 310 }, bottomLeftCorner: { x: 235, y: 310 },
    } } : null } }
}

test('câmera exige contexto seguro, trata negação e libera o stream', async () => {
  const insecure = await trackerFixture({ secure: false })
  await assert.rejects(insecure.tracker.start(), /HTTPS/)
  assert.equal(insecure.counts().requests, 0)
  const denied = await trackerFixture({ denied: true })
  await assert.rejects(denied.tracker.start(), { name: 'NotAllowedError' })
  assert.equal(denied.tracker.running, false)
  const allowed = await trackerFixture()
  await allowed.tracker.start()
  assert.equal(allowed.tracker.running, true)
  allowed.tracker.dispose()
  assert.equal(allowed.counts().stopped, 1)
  assert.equal(allowed.video.srcObject, null)
})

test('rastreador rejeita outro QR, tolera perda breve e exige reenquadramento', async () => {
  const f = await trackerFixture()
  let found = 0, lost = 0
  f.tracker.anchor.onTargetFound = () => found++
  f.tracker.anchor.onTargetLost = () => lost++
  f.qr('http://localhost:5175/')
  f.tracker.scanFrame(100); f.tracker.scanFrame(200)
  assert.equal(found, 0)
  f.qr('http://localhost:5175/ra.html')
  f.tracker.scanFrame(300); f.tracker.scanFrame(400)
  assert.equal(found, 1)
  assert.equal(f.tracker.anchor.group.visible, true)
  assert.ok(f.tracker.anchor.group.position.z < 0)
  assert.ok(f.tracker.anchor.group.position.toArray().every(Number.isFinite))
  f.qr(null); f.tracker.scanFrame(600)
  assert.equal(lost, 0)
  f.tracker.scanFrame(800)
  assert.equal(lost, 1)
  assert.equal(f.tracker.anchor.group.visible, false)
  f.qr('http://localhost:5175/ra.html')
  f.tracker.scanFrame(900); f.tracker.scanFrame(1000)
  assert.equal(found, 2)
  f.document.hidden = true; f.tracker.onVisibility()
  assert.equal(lost, 2)
})
