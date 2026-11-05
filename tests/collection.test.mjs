import test from 'node:test'
import assert from 'node:assert/strict'
import { OfficialCollection } from '../public/casa/js/colecao.js'
import { houseCatalog } from '../public/casa/js/house-catalog.js'
import { readFile } from 'node:fs/promises'

test('trocar de conta limpa cartas imediatamente e respostas antigas não recuperam outra coleção', async () => {
  let user = 'a', delay = false, release
  const store = new OfficialCollection(async path => {
    if (path === '/auth/me') return { id: user }
    if (delay) await new Promise(resolve => { release = resolve })
    return { positions: user === 'a' ? [{ unlocked: true, legend: { id: 'loira-do-banheiro' } }] : [] }
  })
  await store.refresh(); assert.ok(store.has('loira-do-banheiro'))
  delay = true
  const stale = store.refresh()
  assert.equal(store.cards.size, 0)
  await new Promise(resolve => setImmediate(resolve))
  delay = false; user = 'b'; await store.refresh(); release(); await stale
  assert.equal(store.cards.size, 0)
  assert.equal(store.user.id, 'b')
})

test('catálogo da casa conserva os 60 IDs/números e usa somente metadados visuais legados', async () => {
  const catalog = JSON.parse(await readFile('public/lendas-ra.json', 'utf8'))
  const house = houseCatalog(catalog, [{ id: 'kayako-saeki', numero: 13, nome: 'Kayako antiga', zona: 'japao' }, { id: 'saci-perere' }])
  assert.deepEqual(house.map(l => [l.id,l.numero]), catalog.map(l => [l.id,l.numero]))
  assert.equal(house[1].num, '02')
  assert.equal(house[1].nome, catalog[1].nome)
  assert.equal(house[1].historia, catalog[1].historia)
  assert.equal(house[1].zona, 'japao')
  assert.ok(!house.some(l => l.id === 'saci-perere'))
  assert.throws(() => houseCatalog(catalog.slice(1), []), /inválido/)
})
