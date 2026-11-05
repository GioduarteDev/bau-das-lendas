import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { criarAtmosfera } from '../src/experience/Atmosfera.ts'

function ambiente() {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 160)
  camera.position.set(0, 1.72, 9)
  const atmosfera = criarAtmosfera(scene, camera, 'desktop')
  return { scene, camera, atmosfera }
}

test('campo atmosférico mantém trajetória consistente a 30 e 120 fps', () => {
  const a = ambiente(), b = ambiente()
  try {
    for (let i = 0; i < 60; i++) a.atmosfera.atualizar(1 / 30, false)
    for (let i = 0; i < 240; i++) b.atmosfera.atualizar(1 / 120, false)
    const p = a.atmosfera.inspecionar().particulas, q = b.atmosfera.inspecionar().particulas
    p.forEach((valor, i) => assert.ok(Math.abs(valor - q[i]) < 0.004, `coordenada ${i}`))
  } finally { a.atmosfera.dispose(); b.atmosfera.dispose() }
})

test('perturbação localizada não altera partículas fora do raio', () => {
  const a = ambiente(), b = ambiente()
  try {
    const origem = new THREE.Vector3(...a.atmosfera.inspecionar().particulas.slice(0, 3))
    a.atmosfera.perturbar({ posicao: origem, raio: 1.5, intensidade: 1, giro: 1 })
    for (let i = 0; i < 30; i++) {
      a.atmosfera.atualizar(1 / 60, false)
      b.atmosfera.atualizar(1 / 60, false)
    }
    const p = a.atmosfera.inspecionar().particulas, q = b.atmosfera.inspecionar().particulas
    assert.notEqual(p[1], q[1], 'Corrente deve levantar partículas no centro do evento')
    assert.deepEqual(p.slice(9, 12), q.slice(9, 12), 'Partícula distante deve seguir o movimento habitual')
  } finally { a.atmosfera.dispose(); b.atmosfera.dispose() }
})

test('reciclagem suporta saltos para o registro 60 e retorno sem volumes presos à câmera', () => {
  const { camera, atmosfera } = ambiente()
  try {
    for (const z of [-415.5, -2.5, 9]) {
      camera.position.z = z
      atmosfera.atualizar(1 / 60, true)
      const { particulas, laminas } = atmosfera.inspecionar()
      particulas.forEach((valor, i) => {
        assert.ok(Number.isFinite(valor))
        if (i % 3 === 2) assert.ok(valor <= z + 6.001 && valor >= z - 12.001)
      })
      assert.ok(laminas.every(valor => valor <= z + 12 && valor >= z - 78))
    }
    assert.ok(atmosfera.stats.recicladas > 0)
  } finally { atmosfera.dispose() }
})

test('queda sustentada de fps reduz orçamento e dispose libera todos os recursos', () => {
  const { scene, atmosfera } = ambiente()
  const objetos = [...scene.children]
  let descartes = 0
  const recursos = new Set(objetos.flatMap(obj => [obj.geometry, obj.material]))
  recursos.forEach(r => r.addEventListener('dispose', () => descartes++))
  for (let i = 0; i < 250; i++) atmosfera.atualizar(0.05, false, 0.05)
  assert.ok(atmosfera.stats.densidade < 0.85)
  assert.ok(objetos[0].geometry.drawRange.count < atmosfera.stats.total)
  atmosfera.dispose()
  assert.equal(scene.children.length, 0)
  assert.equal(descartes, recursos.size)
})
